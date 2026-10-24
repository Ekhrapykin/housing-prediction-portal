from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api import health, model_info, predictions
from app.config import get_settings
from app.services.predictor import Predictor


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.predictor = Predictor.load(get_settings().artifacts_dir)
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Housing Price Model API",
        version="1.0.0",
        description="Ridge regression trained on the provided housing dataset.",
        lifespan=lifespan,
    )
    for module in (health, predictions, model_info):
        app.include_router(module.router)
    return app


app = create_app()
