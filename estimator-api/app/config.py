from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ml_api_url: str = "http://localhost:8000"
    ml_api_timeout: float = 5.0
    ml_api_health_timeout: float = 2.0  # shorter than ml_api_timeout so /health never hangs
    database_url: str = "sqlite:///estimates.db"


@lru_cache
def get_settings() -> Settings:
    return Settings()
