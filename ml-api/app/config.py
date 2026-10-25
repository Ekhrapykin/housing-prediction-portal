from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings

ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    artifacts_dir: Path = ROOT / "artifacts"
    model_alpha: float = 10.0  # Ridge strength; fixed (not cross-validated) so coefficients stay interpretable on collinear features
    data_path: Path = ROOT.parent / "data" / "house_prices.csv"  # DATA_PATH=/data/house_prices.csv in Docker


@lru_cache
def get_settings() -> Settings:
    return Settings()
