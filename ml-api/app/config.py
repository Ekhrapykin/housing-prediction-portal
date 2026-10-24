from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings

ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    artifacts_dir: Path = ROOT / "artifacts"
    data_path: Path = ROOT / "data" / "house_prices.csv"


@lru_cache
def get_settings() -> Settings:
    return Settings()
