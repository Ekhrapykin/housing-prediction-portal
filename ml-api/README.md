# ml-api

A housing-price model behind an HTTP API. A Ridge regression (fixed alpha 10, env `MODEL_ALPHA`) is trained at startup on the 50-row dataset (`../data/house_prices.csv` in the repo root, shared with market-api) and served with FastAPI. It predicts single or batch prices, flags inputs outside the training range, and exposes the coefficients and metrics at `/model-info`. The other two backends (`estimator-api`, `market-api`) call it; nothing else does.

## Stack

| Piece | Version / source |
|---|---|
| Python | 3.14 (`.python-version`, `requires-python >=3.14`) |
| Packaging | uv, `uv.lock` committed |
| API | FastAPI >=0.162, uvicorn[standard] >=0.54, pydantic-settings >=2.16 |
| ML | scikit-learn >=1.9.1, pandas >=3.1 |
| Tests | pytest >=9.1, `httpx2` (TestClient) |

## Run locally

The app trains the model in memory in `lifespan` (about a second), so there is nothing to build first.

```bash
# with mise (repo root)
mise run dev:ml       # http://localhost:8000

# plain
cd ml-api
uv sync
uv run uvicorn app.main:app --port 8000
```

Swagger UI: http://localhost:8000/docs

## Run in Docker

```bash
docker build -t hpp-ml-api ml-api
docker run --rm -p 8000:8000 -v "$PWD/data/house_prices.csv:/data/house_prices.csv:ro" hpp-ml-api
```

The image holds no data and no model: the CSV comes from a read-only file mount at `/data/house_prices.csv` (`DATA_PATH=/data/house_prices.csv` is baked in as the default) and the model is trained when the container starts. In compose, `./data/house_prices.csv` is bind-mounted, the service is published on `8000`, and its `/health` healthcheck (defined in `docker-compose.yml`) has a 30 s start period; the other backends wait for it.

## Configuration

Read by `app/core/config.py` (pydantic-settings, env var = upper-cased field name).

| Env var | Default | Purpose |
|---|---|---|
| `PORT` | `8000` (set in the image) | Listen port of the Docker image (`CMD` runs `uvicorn --port ${PORT}`); not read by `app/core/config.py`. Compose sets it from `ML_API_PORT` |
| `DATA_PATH` | `../data/house_prices.csv` (repo root; `/data/house_prices.csv` in Docker) | Training CSV, read at startup (UTF-8 with BOM is handled) |
| `MODEL_ALPHA` | `10.0` | Ridge strength. Fixed, not cross-validated, so coefficients stay interpretable on collinear features (see [limitations](../ARCHITECTURE.md#limitations-and-future-work)) |

Every request gets an `X-Request-ID` (a valid incoming one, matching `^[A-Za-z0-9-]{1,64}$`, or a generated UUID4), echoed in the response and shown on each log line as `[req=...]`. `asgi-correlation-id` does the echo; an access-log middleware logs one line per request (not `/health`) and uvicorn's access log is disabled to avoid duplicates. No configuration.

## API

| Method | Path | Purpose | Notes |
|---|---|---|---|
| GET | `/health` | Liveness | `{"status":"ok"}` |
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
cd ml-api && uv sync && uv run pytest -q
```

`tests/test_api.py` drives the real app, which trains on the repo's CSV in `lifespan`, through `TestClient`: health, a plausible single price (150k-450k, no warnings), batch count, empty batch and out-of-range input rejected with 422, an extrapolation warning, and `/model-info` shape. `test_api.py` also asserts the `square_footage`, `bedrooms` and `year_built` coefficients are positive at the default alpha. `tests/test_request_id.py` covers the request id (echo, generate, replace invalid). `tests/test_contract.py` compares `HouseFeatures.model_json_schema()` with `contracts/house-features.schema.json`.

## Project layout

```
ml-api/
├── app/
│   ├── main.py            # create_app(), lifespan trains the Predictor into app.state
│   ├── core/              # config.py (Settings: data_path, model_alpha), logging.py (asgi-correlation-id setup, access log)
│   ├── schemas.py         # HouseFeatures, Prediction, BatchPrediction
│   ├── api/               # health.py, predictions.py, model_info.py (routers), deps.py (get_predictor / PredictorDep)
│   ├── services/predictor.py  # Predictor: predict, extrapolation warnings
│   └── ml/                # train.py (train(); FEATURES, TARGET, CV_FOLDS, CV_RANDOM_STATE constants)
├── tests/                 # conftest.py, test_api.py, test_request_id.py, test_contract.py
├── Dockerfile             # no training, no data: both arrive at runtime
└── pyproject.toml, uv.lock
```

## Further reading

- [ARCHITECTURE.md](ARCHITECTURE.md): layers, training, errors, request id, decisions.
- Root docs: [README](../README.md), [ARCHITECTURE](../ARCHITECTURE.md) (cross-cutting contracts, [limitations and future work](../ARCHITECTURE.md#limitations-and-future-work)).
