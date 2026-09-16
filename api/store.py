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
    created        REAL   NOT NULL
);

-- Round-robin position for which alternative route gets recommended next,
-- per origin/destination/vehicle. See api/main.py's /route handler for what
-- this is (an engineering default) and what it is not (a simulated result).
CREATE TABLE IF NOT EXISTS spread_counters (
    key     TEXT    PRIMARY KEY,
    counter INTEGER NOT NULL
);
"""


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH, check_same_thread=False)
    db.row_factory = sqlite3.Row
    db.executescript(SCHEMA)
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


def add_trip_answer(db, took_suggested: str, already_knew: str) -> int:
    cur = db.execute(
        "INSERT INTO trip_answers (took_suggested, already_knew, created) VALUES (?, ?, ?)",
        (took_suggested, already_knew, time.time()),
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


def next_spread_index(db, key: str, options: int) -> int:
    """The next index to lead the alternatives list for this key, cycling
    through `options` round-robin. Advances every call, so two travellers
    who ask a moment apart get different answers."""
    if options <= 1:
        return 0
    row = db.execute("SELECT counter FROM spread_counters WHERE key = ?", (key,)).fetchone()
    counter = row["counter"] if row else 0
    db.execute(
        "INSERT INTO spread_counters (key, counter) VALUES (?, ?)"
        " ON CONFLICT(key) DO UPDATE SET counter = excluded.counter",
        (key, counter + 1),
    )
    db.commit()
    return counter % options


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
