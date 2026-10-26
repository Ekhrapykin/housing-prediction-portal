from fastapi import HTTPException

from app.clients.ml import MlClient
from app.repositories.estimates import EstimateRepository
from app.schemas import Estimate, EstimateRequest


class EstimateService:
    def __init__(self, repo: EstimateRepository, ml: MlClient):
        self._repo, self._ml = repo, ml

    def create(self, req: EstimateRequest) -> Estimate:
        features = req.model_dump(exclude={"label"})
        pred = self._ml.predict(features)
        return self._repo.add(req.label, features, pred["price"], pred["warnings"])

    def get(self, estimate_id: int) -> Estimate:
        if (est := self._repo.get(estimate_id)) is None:
            raise HTTPException(404, "Estimate not found")
        return est

    def list(self, ids: list[int] | None, limit: int) -> list[Estimate]:
        return self._repo.list_by_ids(ids) if ids is not None else self._repo.list_recent(limit)

    def delete(self, estimate_id: int) -> None:
        if not self._repo.delete(estimate_id):
            raise HTTPException(404, "Estimate not found")
