from app.schemas import EXAMPLE


def test_health(client):
    assert client.get("/health").json()["status"] == "ok"


def test_predict_single_is_plausible(client):
    r = client.post("/predict", json=EXAMPLE)
    assert r.status_code == 200
    assert 150_000 < r.json()["price"] < 450_000
    assert r.json()["warnings"] == []


def test_predict_batch(client):
    r = client.post("/predict/batch", json=[EXAMPLE, EXAMPLE])
    assert len(r.json()["predictions"]) == 2


def test_empty_batch_rejected(client):
    assert client.post("/predict/batch", json=[]).status_code == 422


def test_invalid_input_rejected(client):
    assert client.post("/predict", json={**EXAMPLE, "school_rating": 11}).status_code == 422


def test_extrapolation_warning(client):
    r = client.post("/predict", json={**EXAMPLE, "square_footage": 5000})
    assert r.json()["warnings"]


def test_model_info_has_coefficients_and_metrics(client):
    body = client.get("/model-info").json()
    assert set(body["coefficients"]) == set(EXAMPLE)
    assert "cv_5fold" in body["metrics"]

def test_coefficients_positive_at_default_alpha(client):
    coef = client.get("/model-info").json()["coefficients"]
    for name in ("square_footage", "bedrooms", "year_built"):
        assert coef[name] > 0, f"{name} coefficient is {coef[name]}"
