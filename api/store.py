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

-- Answers to the two after-trip questions. No traveller identity is stored:
-- the questions are about the guidance, not about the person.
CREATE TABLE IF NOT EXISTS trip_answers (
    id            INTEGER PRIMARY KEY,
    took_suggested TEXT   NOT NULL,     -- yes | no | partly
    already_knew   TEXT   NOT NULL,     -- yes | no
    created        REAL   NOT NULL
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
