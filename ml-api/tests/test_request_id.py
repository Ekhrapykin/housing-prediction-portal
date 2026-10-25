import re

UUID4 = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}")


def test_valid_incoming_id_is_echoed(client):
    assert client.get("/health", headers={"X-Request-ID": "test-123"}).headers["X-Request-ID"] == "test-123"


def test_missing_id_is_generated(client):
    assert UUID4.fullmatch(client.get("/health").headers["X-Request-ID"])


def test_invalid_ids_are_replaced(client):
    for bad in ("bad id", "a" * 65, "x;y"):
        assert UUID4.fullmatch(client.get("/health", headers={"X-Request-ID": bad}).headers["X-Request-ID"]), bad
