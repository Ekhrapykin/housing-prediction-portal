from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api import health, model_info, predictions
from app.core.config import get_settings
from app.ml.train import train
from app.core.logging import add_request_middleware, configure_logging
from app.services.predictor import Predictor


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Trains in memory at startup (about a second on 50 rows); a missing CSV fails startup loudly.
    settings = get_settings()
    app.state.predictor = Predictor(*train(settings.data_path, settings.model_alpha))
    yield


def create_app() -> FastAPI:
    configure_logging()
    app = FastAPI(
        title="Housing Price Model API",
        version="1.0.0",
        description="Ridge regression trained on the provided housing dataset.",
        lifespan=lifespan,
    )
    add_request_middleware(app)
    for module in (health, predictions, model_info):
        app.include_router(module.router)
    return app


app = create_app()
