import sqlite3
from contextlib import closing
from typing import Annotated

from fastapi import Depends

from app.config import Settings, get_settings

SCHEMA = """
    CREATE TABLE IF NOT EXISTS estimates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT,
        features TEXT NOT NULL,
        price REAL NOT NULL,
        warnings TEXT NOT NULL,
        created_at TEXT NOT NULL
    )"""


def init_db(path: str) -> None:
    with closing(sqlite3.connect(path)) as conn, conn:
        conn.execute(SCHEMA)


def get_db(settings: Annotated[Settings, Depends(get_settings)]):
    # check_same_thread=False: FastAPI may run a sync dependency and the sync handler on different
    # threadpool threads. Safe here because the connection is never shared between requests.
    conn = sqlite3.connect(settings.db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
