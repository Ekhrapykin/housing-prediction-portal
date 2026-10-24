import sqlite3

import pytest

from app.db import SCHEMA
from app.errors import NotFoundError
from app.repositories.estimates import EstimateRepository
from app.schemas import EstimateRequest
from app.services.estimates import EstimateService
from tests.conftest import FakeMlClient
from tests.test_estimates_api import BODY


def test_service_create_get_delete_without_fastapi():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.execute(SCHEMA)
    service = EstimateService(EstimateRepository(conn), FakeMlClient())
    est = service.create(EstimateRequest(**BODY))
    assert service.get(est.id).price == 250_000.0
    service.delete(est.id)
    with pytest.raises(NotFoundError):
        service.get(est.id)
