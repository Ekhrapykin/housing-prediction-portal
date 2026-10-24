from fastapi import APIRouter

from app.deps import MlClientDep

router = APIRouter()


@router.get("/health")
def health(ml: MlClientDep):
    return {"status": "ok", "ml_api": "up" if ml.is_healthy() else "down"}


@router.get("/model-info")
def model_info(ml: MlClientDep):
    return ml.model_info()
