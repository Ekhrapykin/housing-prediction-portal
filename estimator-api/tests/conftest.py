import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.deps import get_ml_client
from app.errors import UpstreamUnavailable
from app.main import create_app


class FakeMlClient:
    def __init__(self, fail: bool = False):
        self.fail = fail
        self.calls = 0

    def predict(self, features: dict) -> dict:
        self.calls += 1
        if self.fail:
            raise UpstreamUnavailable()
        return {"price": 250_000.0, "warnings": []}

    def model_info(self) -> dict:
        return {"coefficients": {}}

    def is_healthy(self) -> bool:
        return not self.fail


@pytest.fixture
def fake_ml():
    return FakeMlClient()


@pytest.fixture
def client(tmp_path, monkeypatch, fake_ml):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "test.db"))
    get_settings.cache_clear()
    app = create_app()
    app.dependency_overrides[get_ml_client] = lambda: fake_ml
    with TestClient(app) as c:
        yield c
    get_settings.cache_clear()
