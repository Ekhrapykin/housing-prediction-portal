from fastapi import APIRouter

from app.deps import PredictorDep

router = APIRouter(tags=["ops"])


@router.get("/health")
def health(predictor: PredictorDep):
    return {"status": "ok", "model_loaded": predictor is not None}
