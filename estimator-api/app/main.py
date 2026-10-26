from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from slowapi.errors import RateLimitExceeded

from app.api import estimates, health
from app.clients.ml import MlClient
from app.core.config import get_settings
from app.repositories.db import init_db, make_engine, make_session_factory
from app.core.errors import AppError, app_error_handler
from app.core.ratelimit import limiter, rate_limit_handler
from app.core.logging import add_request_middleware, configure_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    engine = make_engine(settings.database_url)
    init_db(engine)
    app.state.session_factory = make_session_factory(engine)
    with httpx.Client(base_url=settings.ml_api_url, timeout=settings.ml_api_timeout) as http:
        app.state.ml_client = MlClient(http, settings.ml_api_health_timeout)
        yield
    engine.dispose()


def create_app() -> FastAPI:
    configure_logging()
    app = FastAPI(title="Property Value Estimator API", version="1.0.0", lifespan=lifespan)
    app.state.limiter = limiter
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RateLimitExceeded, rate_limit_handler)
    add_request_middleware(app)
    for module in (health, estimates):
        app.include_router(module.router)
    return app


app = create_app()
