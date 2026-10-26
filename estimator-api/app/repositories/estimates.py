from datetime import UTC, datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.repositories.db import EstimateRow
from app.schemas import Estimate


def _to_estimate(row: EstimateRow) -> Estimate:
    return Estimate(
        id=row.id, label=row.label, features=row.features,
        price=row.price, warnings=row.warnings, created_at=row.created_at,
    )


class EstimateRepository:
    def __init__(self, session: Session):
        self._session = session

    def add(self, label: str | None, features: dict, price: float, warnings: list[str]) -> Estimate:
        row = EstimateRow(label=label, features=features, price=price, warnings=warnings,
                          created_at=datetime.now(UTC).isoformat())
        self._session.add(row)
        self._session.flush()  # assigns the id; the commit happens in the session dependency
        return _to_estimate(row)

    def get(self, estimate_id: int) -> Estimate | None:
        row = self._session.get(EstimateRow, estimate_id)
        return _to_estimate(row) if row else None

    def list_recent(self, limit: int) -> list[Estimate]:
        rows = self._session.scalars(select(EstimateRow).order_by(EstimateRow.id.desc()).limit(limit))
        return [_to_estimate(r) for r in rows]

    def list_by_ids(self, ids: list[int]) -> list[Estimate]:
        """In the requested order (the comparison view's column order); unknown ids are skipped."""
        if not ids:
            return []
        rows = self._session.scalars(select(EstimateRow).where(EstimateRow.id.in_(ids)))
        by_id = {r.id: _to_estimate(r) for r in rows}
        return [by_id[i] for i in dict.fromkeys(ids) if i in by_id]

    def delete(self, estimate_id: int) -> bool:
        return self._session.execute(delete(EstimateRow).where(EstimateRow.id == estimate_id)).rowcount > 0
