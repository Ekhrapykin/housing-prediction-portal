import sqlite3
from typing import Annotated

from fastapi import Depends, Request

from app.clients.ml import MlClient
from app.db import get_db
from app.repositories.estimates import EstimateRepository
from app.services.estimates import EstimateService


def get_ml_client(request: Request) -> MlClient:
    return request.app.state.ml_client


MlClientDep = Annotated[MlClient, Depends(get_ml_client)]


def get_estimate_service(
    conn: Annotated[sqlite3.Connection, Depends(get_db)],
    ml: MlClientDep,
) -> EstimateService:
    return EstimateService(EstimateRepository(conn), ml)


EstimateServiceDep = Annotated[EstimateService, Depends(get_estimate_service)]
