from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.clients.ml import MlClient
from app.db import get_session
from app.repositories.estimates import EstimateRepository
from app.services.estimates import EstimateService


def get_ml_client(request: Request) -> MlClient:
    return request.app.state.ml_client


MlClientDep = Annotated[MlClient, Depends(get_ml_client)]


def get_estimate_service(
    session: Annotated[Session, Depends(get_session)],
    ml: MlClientDep,
) -> EstimateService:
    return EstimateService(EstimateRepository(session), ml)


EstimateServiceDep = Annotated[EstimateService, Depends(get_estimate_service)]
