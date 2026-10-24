# ml-api

Task 1 of the take-home: a housing-price model behind an HTTP API. A Ridge regression is trained on the 50-row dataset in `data/house_prices.csv` and served with FastAPI. It predicts single or batch prices, flags inputs outside the training range, and exposes the coefficients and metrics at `/model-info`. The other two backends (`estimator-api`, `market-api`) call it; nothing else does.

System context: [../README.md](../README.md). Internals: [ARCHITECTURE.md](ARCHITECTURE.md).

## Stack

| Piece | Version / source |
|---|---|
| Python | 3.14 (`.python-version`, `requires-python >=3.14`) |
| Packaging | uv, `uv.lock` committed |
| API | FastAPI >=0.162, uvicorn[standard] >=0.54, pydantic-settings >=2.16 |
| ML | scikit-learn >=1.9.1, pandas >=3.1, joblib >=1.6 |
| Tests | pytest >=9.1, `httpx2` (TestClient) |

## Run locally

The model artifacts (`artifacts/model.joblib`, `artifacts/model_info.json`, git-ignored) must exist before the app starts, because `lifespan` loads them.

```bash
# with mise (repo root)
mise run train        # writes ml-api/artifacts/
mise run dev:ml       # http://localhost:8000

# plain
cd ml-api
uv sync
uv run python -m app.ml.train
uv run uvicorn app.main:app --port 8000
```

Swagger UI: http://localhost:8000/docs

## Run in Docker

```bash
docker build -t hpp-ml-api ml-api
docker run --rm -p 8000:8000 hpp-ml-api
```

Training runs inside `docker build` (`RUN python -m app.ml.train`), so the image ships a trained model and needs no volume. In the compose stack the service is published on `8000` and has a `/health` healthcheck; the other backends wait for it.

## Configuration

Read by `app/config.py` (pydantic-settings, env var = upper-cased field name).

| Env var | Default | Purpose |
|---|---|---|
| `ARTIFACTS_DIR` | `ml-api/artifacts` | Where the trainer writes and the API reads the model |
| `DATA_PATH` | `ml-api/data/house_prices.csv` | Training CSV (UTF-8 with BOM is handled) |

## Endpoints

| Method | Path | Purpose | Notes |
|---|---|---|---|
| GET | `/health` | Liveness | `{"status":"ok","model_loaded":true}` |
| POST | `/predict` | Price for one house | 7-feature body; 422 on invalid input |
| POST | `/predict/batch` | Prices for 1-1000 houses | Body is a JSON array; 422 if empty or over 1000 |
| GET | `/model-info` | Model card | Coefficients, metrics, feature ranges |

Feature bounds (all required): `square_footage` (0, 20000], `bedrooms` int 0-20, `bathrooms` 0-20, `year_built` int 1800-2100, `lot_size` (0, 1e6], `distance_to_city_center` 0-500, `school_rating` 0-10.

```bash
curl -s localhost:8000/predict -H 'content-type: application/json' -d '{
  "square_footage":1550,"bedrooms":3,"bathrooms":2,"year_built":1997,
  "lot_size":6800,"distance_to_city_center":4.1,"school_rating":7.6}'
# {"price":...,"warnings":[]}
```

`warnings` lists every feature outside the `[min, max]` seen in training, for example `square_footage=5000.0 is outside the training range [980, 2400]`. The prediction is still returned.

`/model-info` returns `model_type`, `alpha`, `intercept`, `coefficients` (raw units), `standardized_coefficients`, `metrics.cv_5fold` and `metrics.train` (`r2`, `rmse`, `mae`), `feature_stats` (min/max/mean), `n_samples` and `trained_at`.

## Tests

```bash
cd ml-api && uv sync && uv run python -m app.ml.train && uv run pytest -q   # 7 passed
```

`tests/test_api.py` drives the real app and the real trained model through `TestClient`: health, a plausible single price (150k-450k, no warnings), batch count, empty batch and out-of-range input rejected with 422, an extrapolation warning, and `/model-info` shape. There are no unit tests for `train.py`; CI trains first, then runs pytest.

## Layout

```
ml-api/
├── app/
│   ├── main.py            # create_app(), lifespan loads Predictor into app.state
│   ├── config.py          # Settings (artifacts_dir, data_path)
│   ├── deps.py            # get_predictor / PredictorDep
│   ├── schemas.py         # HouseFeatures, Prediction, BatchPrediction
│   ├── api/               # health.py, predictions.py, model_info.py (routers)
│   ├── services/predictor.py  # Predictor: load, predict, extrapolation warnings
│   └── ml/                # features.py (FEATURES, TARGET), train.py
├── data/                  # house_prices.csv (training), test_data.csv (sample inputs)
├── tests/                 # conftest.py, test_api.py
├── Dockerfile             # trains at build time
└── pyproject.toml, uv.lock
```
