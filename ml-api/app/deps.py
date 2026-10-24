from typing import Annotated

from fastapi import Depends, Request

from app.services.predictor import Predictor


def get_predictor(request: Request) -> Predictor:
    return request.app.state.predictor


PredictorDep = Annotated[Predictor, Depends(get_predictor)]
