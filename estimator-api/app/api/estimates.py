from fastapi import APIRouter, HTTPException, Query, Response

from app.deps import EstimateServiceDep
from app.schemas import Estimate, EstimateRequest

DEFAULT_LIMIT = 50  # the history view shows recent estimates, not everything
MAX_LIMIT = 500  # caps one response; the table is demo-sized

router = APIRouter(prefix="/estimates", tags=["estimates"])


@router.post("", response_model=Estimate, status_code=201)
def create_estimate(req: EstimateRequest, service: EstimateServiceDep):
    return service.create(req)


@router.get("", response_model=list[Estimate])
def list_estimates(
    service: EstimateServiceDep,
    ids: str | None = Query(default=None, description="Comma-separated ids, for the comparison view"),
    limit: int = Query(default=DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
):
    id_list = None
    if ids is not None:
        try:
            id_list = [int(i) for i in ids.split(",") if i.strip()]
        except ValueError:
            raise HTTPException(422, "ids must be comma-separated integers")
    return service.list(id_list, limit)


@router.get("/{estimate_id}", response_model=Estimate)
def get_estimate(estimate_id: int, service: EstimateServiceDep):
    return service.get(estimate_id)


@router.delete("/{estimate_id}", status_code=204)
def delete_estimate(estimate_id: int, service: EstimateServiceDep):
    service.delete(estimate_id)
