from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ml_api_url: str = "http://localhost:8000"
    ml_api_timeout: float = 5.0
    ml_api_health_timeout: float = 2.0  # shorter than ml_api_timeout so /health never hangs
    database_url: str = "sqlite:///estimates.db"
    rate_limit_writes: str = "20/minute"  # POST and DELETE /estimates share this budget per client
    trusted_proxies: str = "web"  # comma-separated hostnames/IPs whose X-Forwarded-For is believed (see ratelimit.py)


@lru_cache
def get_settings() -> Settings:
    return Settings()
