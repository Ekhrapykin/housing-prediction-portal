from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI

from app.api import estimates, health
from app.clients.ml import MlClient
from app.config import get_settings
from app.db import init_db
from app.errors import AppError, app_error_handler


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    init_db(settings.db_path)
    with httpx.Client(base_url=settings.ml_api_url, timeout=settings.ml_api_timeout) as http:
        app.state.ml_client = MlClient(http)
        yield


def create_app() -> FastAPI:
    app = FastAPI(title="Property Value Estimator API", version="1.0.0", lifespan=lifespan)
    app.add_exception_handler(AppError, app_error_handler)
    for module in (health, estimates):
        app.include_router(module.router)
    return app


app = create_app()
