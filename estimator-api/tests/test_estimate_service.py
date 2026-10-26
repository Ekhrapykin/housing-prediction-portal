import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.db import init_db, make_engine
from app.repositories.estimates import EstimateRepository
from app.schemas import EstimateRequest
from app.services.estimates import EstimateService
from tests.conftest import FakeMlClient
from tests.test_estimates_api import BODY


def test_service_create_get_delete_without_fastapi(tmp_path):
    engine = make_engine(f"sqlite:///{tmp_path / 'service.db'}")
    init_db(engine)
    session = Session(engine)
    service = EstimateService(EstimateRepository(session), FakeMlClient())
    est = service.create(EstimateRequest(**BODY))
    assert service.get(est.id).price == 250_000.0
    service.delete(est.id)
    with pytest.raises(HTTPException) as exc:
        service.get(est.id)
    assert exc.value.status_code == 404
    session.close()
