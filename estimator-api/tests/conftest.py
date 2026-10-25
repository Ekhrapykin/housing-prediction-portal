import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.deps import get_ml_client
from app.errors import UpstreamUnavailable
from app.main import create_app
from app.ratelimit import limiter


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


@pytest.fixture(autouse=True)
def reset_limiter():
    limiter.reset()  # the in-memory counters are process-wide


@pytest.fixture
def make_client(tmp_path, monkeypatch, fake_ml):
    """Build a TestClient; `peer` is the TCP peer address the app sees, `env` overrides Settings."""
    clients = []

    def make(peer: tuple[str, int] | None = None, **env: str) -> TestClient:
        monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'test.db'}")
        for k, v in env.items():
            monkeypatch.setenv(k.upper(), v)
        get_settings.cache_clear()
        app = create_app()
        app.dependency_overrides[get_ml_client] = lambda: fake_ml
        c = TestClient(app, client=peer or ("testclient", 50000))
        c.__enter__()
        clients.append(c)
        return c

    yield make
    for c in clients:
        c.__exit__(None, None, None)
    get_settings.cache_clear()


@pytest.fixture
def client(make_client):
    return make_client()
