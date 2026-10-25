import re

import httpx

from app.clients.ml import MlClient
from app.request_id import request_id_var
from tests.test_estimates_api import BODY

UUID4 = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}")


def test_valid_incoming_id_is_echoed(client):
    r = client.get("/health", headers={"X-Request-ID": "test-123"})
    assert r.headers["X-Request-ID"] == "test-123"


def test_missing_id_is_generated(client):
    assert UUID4.fullmatch(client.get("/health").headers["X-Request-ID"])


def test_invalid_ids_are_replaced(client):
    for bad in ("bad id", "a" * 65, "x;y"):
        rid = client.get("/health", headers={"X-Request-ID": bad}).headers["X-Request-ID"]
        assert UUID4.fullmatch(rid), bad


def test_id_is_on_error_responses(client):
    r = client.post("/estimates", json={**BODY, "school_rating": 11}, headers={"X-Request-ID": "e-1"})
    assert (r.status_code, r.headers["X-Request-ID"]) == (422, "e-1")


def test_ml_client_forwards_current_id():
    seen = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request.headers.get("X-Request-ID"))
        return httpx.Response(200, json={"price": 1.0, "warnings": []})

    ml = MlClient(httpx.Client(base_url="http://ml", transport=httpx.MockTransport(handler)), 1.0)
    token = request_id_var.set("fwd-1")
    try:
        ml.predict({})
    finally:
        request_id_var.reset(token)
    ml.predict({})  # no current request: nothing to forward
    assert seen == ["fwd-1", None]
