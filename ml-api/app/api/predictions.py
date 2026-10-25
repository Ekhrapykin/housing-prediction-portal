from typing import Annotated

from fastapi import APIRouter, Body

from app.deps import PredictorDep
from app.schemas import BatchPrediction, HouseFeatures, Prediction

MAX_BATCH_SIZE = 1000  # market-api sends at most 50 variants per what-if; this only bounds request size

router = APIRouter(prefix="/predict", tags=["prediction"])


@router.post("", response_model=Prediction)
def predict(house: HouseFeatures, predictor: PredictorDep):
    return predictor.predict([house])[0]


@router.post("/batch", response_model=BatchPrediction)
def predict_batch(
    houses: Annotated[list[HouseFeatures], Body(min_length=1, max_length=MAX_BATCH_SIZE)],
    predictor: PredictorDep,
):
    predictions = predictor.predict(houses)
    return BatchPrediction(count=len(predictions), predictions=predictions)
