import json
import sqlite3
from datetime import UTC, datetime

from app.schemas import Estimate


def _to_estimate(row: sqlite3.Row) -> Estimate:
    return Estimate(
        id=row["id"], label=row["label"], features=json.loads(row["features"]),
        price=row["price"], warnings=json.loads(row["warnings"]), created_at=row["created_at"],
    )


class EstimateRepository:
    def __init__(self, conn: sqlite3.Connection):
        self._conn = conn

    def add(self, label: str | None, features: dict, price: float, warnings: list[str]) -> Estimate:
        now = datetime.now(UTC).isoformat()
        cur = self._conn.execute(
            "INSERT INTO estimates (label, features, price, warnings, created_at) VALUES (?, ?, ?, ?, ?)",
            (label, json.dumps(features), price, json.dumps(warnings), now),
        )
        return Estimate(id=cur.lastrowid, label=label, features=features,
                        price=price, warnings=warnings, created_at=now)

    def get(self, estimate_id: int) -> Estimate | None:
        row = self._conn.execute("SELECT * FROM estimates WHERE id = ?", (estimate_id,)).fetchone()
        return _to_estimate(row) if row else None

    def list_recent(self, limit: int) -> list[Estimate]:
        rows = self._conn.execute("SELECT * FROM estimates ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
        return [_to_estimate(r) for r in rows]

    def list_by_ids(self, ids: list[int]) -> list[Estimate]:
        marks = ",".join("?" * len(ids))
        rows = self._conn.execute(f"SELECT * FROM estimates WHERE id IN ({marks})", ids).fetchall()
        return [_to_estimate(r) for r in rows]

    def delete(self, estimate_id: int) -> bool:
        return self._conn.execute("DELETE FROM estimates WHERE id = ?", (estimate_id,)).rowcount > 0
