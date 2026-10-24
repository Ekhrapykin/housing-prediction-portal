from fastapi import APIRouter

from app.deps import PredictorDep

router = APIRouter(tags=["model"])


@router.get("/model-info")
def get_model_info(predictor: PredictorDep):
    return predictor.info
