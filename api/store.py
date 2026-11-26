"""Everything the API has to remember: closures, reports, trip answers.

SQLite, because none of this is large and a file needs no service. Probe
traces in Phase 3 are a different shape and will want Postgres; this is not
that yet.
"""

import json
import os
import sqlite3
import time
from pathlib import Path

DB_PATH = Path(os.environ.get("MOD_DB", Path(__file__).parent.parent / "data" / "mod.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS closures (
    id      INTEGER PRIMARY KEY,
    edges   TEXT    NOT NULL,          -- json array of edge ids
    reason  TEXT    NOT NULL,
    kind    TEXT    NOT NULL,          -- closure | accident | weather | event
    starts  REAL    NOT NULL,
    ends    REAL    NOT NULL,
    created REAL    NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
    id      INTEGER PRIMARY KEY,
    kind    TEXT    NOT NULL,          -- jam | flood | closed | accident
    lon     REAL    NOT NULL,
    lat     REAL    NOT NULL,
    created REAL    NOT NULL
);

-- Speed observations. Deliberately has no traveller column: the matcher
-- discards the trace inside the request and only these survive.
CREATE TABLE IF NOT EXISTS edge_speeds (
    id     INTEGER PRIMARY KEY,
    edge   TEXT    NOT NULL,
    speed  REAL    NOT NULL,
    at     REAL    NOT NULL
);

CREATE INDEX IF NOT EXISTS edge_speeds_recent ON edge_speeds (at);

-- Answers to the two after-trip questions. No traveller identity is stored:
-- the questions are about the guidance, not about the person.
CREATE TABLE IF NOT EXISTS trip_answers (
    id            INTEGER PRIMARY KEY,
    took_suggested TEXT   NOT NULL,     -- yes | no | partly
    already_knew   TEXT   NOT NULL,     -- yes | no
    created        REAL   NOT NULL,
    -- The diverted trip this answers, when it was one: origin/destination
    -- node ids and vehicle, plus which alternative was taken. Nothing about
    -- the person.
    spread_key     TEXT,
    alt_index      INTEGER
);

-- One row per affected traveller who accepted an assigned alternative.
-- Append-only so the operator console can show a real, decaying-by-window
-- split instead of "trust us, it's balanced" -- see docs/phases.md,
-- Phase 6: "Done when ... the operator console shows the split."
CREATE TABLE IF NOT EXISTS spread_selections (
    id        INTEGER PRIMARY KEY,
    key       TEXT    NOT NULL,
    alt_index INTEGER NOT NULL,
    at        REAL    NOT NULL
);

CREATE INDEX IF NOT EXISTS spread_selections_recent ON spread_selections (at);
"""


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH, check_same_thread=False)
    db.row_factory = sqlite3.Row
    db.executescript(SCHEMA)
    # Databases made before answers were tied to a trip lack the two columns.
    have = {r["name"] for r in db.execute("PRAGMA table_info(trip_answers)")}
    for column, kind in (("spread_key", "TEXT"), ("alt_index", "INTEGER")):
        if column not in have:
            db.execute(f"ALTER TABLE trip_answers ADD COLUMN {column} {kind}")
    return db


def add_closure(db, edges: list[str], reason: str, kind: str, minutes: int) -> int:
    now = time.time()
    cur = db.execute(
        "INSERT INTO closures (edges, reason, kind, starts, ends, created)"
        " VALUES (?, ?, ?, ?, ?, ?)",
        (json.dumps(edges), reason, kind, now, now + minutes * 60, now),
    )
    db.commit()
    return cur.lastrowid


def active_closures(db, at: float | None = None) -> list[dict]:
    now = at if at is not None else time.time()
    rows = db.execute(
        "SELECT * FROM closures WHERE starts <= ? AND ends > ? ORDER BY created DESC",
        (now, now),
    ).fetchall()
    return [dict(r, edges=json.loads(r["edges"])) for r in rows]


def clear_closure(db, closure_id: int) -> bool:
    """End a closure now rather than deleting it. The operator view is a
    record of what was done, and a deleted row cannot be reviewed."""
    cur = db.execute("UPDATE closures SET ends = ? WHERE id = ?", (time.time(), closure_id))
    db.commit()
    return cur.rowcount > 0


def add_report(db, kind: str, lon: float, lat: float) -> int:
    cur = db.execute(
        "INSERT INTO reports (kind, lon, lat, created) VALUES (?, ?, ?, ?)",
        (kind, lon, lat, time.time()),
    )
    db.commit()
    return cur.lastrowid


def recent_reports(db, within_minutes: int = 120) -> list[dict]:
    since = time.time() - within_minutes * 60
    rows = db.execute(
        "SELECT * FROM reports WHERE created >= ? ORDER BY created DESC LIMIT 200", (since,)
    ).fetchall()
    return [dict(r) for r in rows]


def add_trip_answer(
    db,
    took_suggested: str,
    already_knew: str,
    spread_key: str | None = None,
    alt_index: int | None = None,
) -> int:
    cur = db.execute(
        "INSERT INTO trip_answers"
        " (took_suggested, already_knew, created, spread_key, alt_index)"
        " VALUES (?, ?, ?, ?, ?)",
        (took_suggested, already_knew, time.time(), spread_key, alt_index),
    )
    db.commit()
    return cur.lastrowid


def answer_summary(db) -> dict:
    """What the two after-trip questions have established so far.

    The second question is the one that says whether guidance is worth
    anything on this corridor, so it is worth being able to read the answer
    without opening the database.
    """
    rows = db.execute("SELECT took_suggested, already_knew FROM trip_answers").fetchall()
    total = len(rows)
    return {
        "answers": total,
        "took_suggested": sum(1 for r in rows if r["took_suggested"] == "yes"),
        "already_knew": sum(1 for r in rows if r["already_knew"] == "yes"),
    }


def add_speeds(db, observations) -> int:
    db.executemany(
        "INSERT INTO edge_speeds (edge, speed, at) VALUES (?, ?, ?)",
        [(o.edge, o.speed, o.at) for o in observations],
    )
    db.commit()
    return len(observations)


def edge_speed_coverage(db, within_minutes: int = 15) -> dict:
    """How much of the network currently has measured speed.

    This is the number Phase 3 exists to produce. Until it is high enough,
    routing on measured speed is not possible and the product says so.
    """
    since = time.time() - within_minutes * 60
    row = db.execute(
        "SELECT COUNT(*) AS observations, COUNT(DISTINCT edge) AS edges"
        " FROM edge_speeds WHERE at >= ?",
        (since,),
    ).fetchone()
    return {
        "window_minutes": within_minutes,
        "observations": row["observations"],
        "edges_with_data": row["edges"],
    }


def recent_assignments(db, key: str, options: int, within_minutes: int = 120) -> list[int]:
    """How many travellers accepted each of `options` alternatives for this
    origin/destination/vehicle over the window."""
    since = time.time() - within_minutes * 60
    counts = [0] * options
    for r in db.execute(
        "SELECT alt_index, COUNT(*) AS n FROM spread_selections"
        " WHERE key = ? AND at >= ? GROUP BY alt_index",
        (key, since),
    ):
        if r["alt_index"] < options:
            counts[r["alt_index"]] = r["n"]
    return counts


def record_spread_selection(db, key: str, alt_index: int) -> None:
    db.execute(
        "INSERT INTO spread_selections (key, alt_index, at) VALUES (?, ?, ?)",
        (key, alt_index, time.time()),
    )
    db.commit()


def spread_split(db, within_minutes: int = 120) -> list[dict]:
    """Per origin/destination/vehicle over the window: how many affected
    travellers accepted each alternative, and of those who answered the
    after-trip question, how many say they took it. Real counts, not a claim
    that the assignment must be even -- an operator can see if it is."""
    since = time.time() - within_minutes * 60
    by_key: dict[str, dict[int, list[int]]] = {}

    def cell(key: str, i: int) -> list[int]:
        return by_key.setdefault(key, {}).setdefault(i, [0, 0, 0])

    for r in db.execute(
        "SELECT key, alt_index, COUNT(*) AS n FROM spread_selections"
        " WHERE at >= ? GROUP BY key, alt_index",
        (since,),
    ):
        cell(r["key"], r["alt_index"])[0] = r["n"]
    for r in db.execute(
        "SELECT spread_key, alt_index, COUNT(*) AS n,"
        " SUM(took_suggested = 'yes') AS took FROM trip_answers"
        " WHERE created >= ? AND spread_key IS NOT NULL GROUP BY spread_key, alt_index",
        (since,),
    ):
        c = cell(r["spread_key"], r["alt_index"])
        c[1], c[2] = r["n"], r["took"]
    out = []
    for key, cells in sorted(by_key.items()):
        width = range(max(cells) + 1)
        out.append(
            {
                "key": key,
                "counts": [cells.get(i, [0, 0, 0])[0] for i in width],
                "answered": [cells.get(i, [0, 0, 0])[1] for i in width],
                "took": [cells.get(i, [0, 0, 0])[2] for i in width],
            }
        )
    return out


def median_speeds(db, within_minutes: int = 15) -> dict[str, float]:
    """Median observed speed per edge, for the edges that have any."""
    since = time.time() - within_minutes * 60
    rows = db.execute(
        "SELECT edge, speed FROM edge_speeds WHERE at >= ? ORDER BY edge", (since,)
    ).fetchall()
    by_edge: dict[str, list[float]] = {}
    for r in rows:
        by_edge.setdefault(r["edge"], []).append(r["speed"])
    out = {}
    for edge, speeds in by_edge.items():
        speeds.sort()
        mid = len(speeds) // 2
        out[edge] = (
            speeds[mid] if len(speeds) % 2 else (speeds[mid - 1] + speeds[mid]) / 2
        )
    return out
