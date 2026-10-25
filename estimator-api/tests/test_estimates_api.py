BODY = {
    "square_footage": 1550, "bedrooms": 3, "bathrooms": 2, "year_built": 1997,
    "lot_size": 6800, "distance_to_city_center": 4.1, "school_rating": 7.6,
}


def test_create_estimate_and_list(client):
    r = client.post("/estimates", json={**BODY, "label": "home"})
    assert r.status_code == 201
    assert r.json()["price"] == 250_000.0
    assert [e["id"] for e in client.get("/estimates").json()] == [r.json()["id"]]


def test_list_by_ids(client):
    ids = [client.post("/estimates", json=BODY).json()["id"] for _ in range(3)]
    r = client.get("/estimates", params={"ids": f"{ids[2]},{ids[0]},999"})
    assert [e["id"] for e in r.json()] == [ids[2], ids[0]]  # requested order, unknown id skipped


def test_malformed_ids_is_422(client):
    r = client.get("/estimates", params={"ids": "1,abc"})
    assert r.status_code == 422
    assert r.json()["detail"] == "ids must be comma-separated integers"


def test_unknown_id_is_404(client):
    assert client.get("/estimates/999").status_code == 404
    assert client.delete("/estimates/999").status_code == 404


def test_upstream_down_is_503(client, fake_ml):
    fake_ml.fail = True
    r = client.post("/estimates", json=BODY)
    assert r.status_code == 503
    assert r.json()["detail"] == "Prediction service is unavailable"


def test_invalid_input_is_422_and_ml_not_called(client, fake_ml):
    assert client.post("/estimates", json={**BODY, "school_rating": 11}).status_code == 422
    assert fake_ml.calls == 0
