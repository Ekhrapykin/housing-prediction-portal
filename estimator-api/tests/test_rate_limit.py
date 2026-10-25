from tests.test_estimates_api import BODY

LIMIT = 20  # Settings.rate_limit_writes default


def test_21st_write_is_429_with_detail_and_retry_after(client):
    for _ in range(LIMIT):
        assert client.post("/estimates", json=BODY).status_code == 201
    r = client.post("/estimates", json=BODY)
    assert r.status_code == 429
    assert r.json().keys() == {"detail"}
    assert r.json()["detail"] == f"Too many requests. Try again in {r.headers['Retry-After']} seconds."
    assert 50 <= int(r.headers["Retry-After"]) <= 60  # the rest of the fixed 1-minute window


def test_post_and_delete_share_one_budget(client):
    for _ in range(LIMIT - 1):
        client.post("/estimates", json=BODY)
    assert client.delete("/estimates/999").status_code == 404  # counted: the 20th write
    assert client.post("/estimates", json=BODY).status_code == 429


def test_reads_are_never_limited(client):
    for _ in range(LIMIT):
        client.post("/estimates", json=BODY)
    assert client.post("/estimates", json=BODY).status_code == 429
    for _ in range(LIMIT * 2):
        assert client.get("/estimates").status_code == 200
        assert client.get("/health").status_code == 200


def test_trusted_peer_keys_on_rightmost_xff(make_client):
    c = make_client(peer=("10.0.0.1", 1234), trusted_proxies="10.0.0.1", rate_limit_writes="2/minute")
    for _ in range(2):
        assert c.post("/estimates", json=BODY, headers={"X-Forwarded-For": "1.1.1.1, 8.8.8.8"}).status_code == 201
    # same right-most entry, different forged left part: same budget
    assert c.post("/estimates", json=BODY, headers={"X-Forwarded-For": "5.5.5.5, 8.8.8.8"}).status_code == 429
    # different right-most entry: its own budget
    assert c.post("/estimates", json=BODY, headers={"X-Forwarded-For": "1.1.1.1, 9.9.9.9"}).status_code == 201


def test_untrusted_peer_cannot_pick_its_key_with_xff(make_client):
    c = make_client(trusted_proxies="10.0.0.1", rate_limit_writes="2/minute")
    for i in range(2):
        assert c.post("/estimates", json=BODY, headers={"X-Forwarded-For": f"7.7.7.{i}"}).status_code == 201
    assert c.post("/estimates", json=BODY, headers={"X-Forwarded-For": "7.7.7.99"}).status_code == 429
