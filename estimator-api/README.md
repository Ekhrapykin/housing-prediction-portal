# estimator-api

Backend of the Price Estimator app. It accepts house features, asks `ml-api` for a price, stores the result (features, price, warnings, timestamp) in SQLite and serves the history back. It also proxies `ml-api`'s model card and reports `ml-api` reachability in its health check. The portal calls it through the Next.js rewrite `/api/estimator/*`.

System context: [../README.md](../README.md). Internals: [ARCHITECTURE.md](ARCHITECTURE.md).

## Stack

| Piece | Version / source |
|---|---|
| Python | 3.14 |
| Packaging | uv, `uv.lock` committed |
| API | FastAPI >=0.162, uvicorn[standard] >=0.54, pydantic-settings >=2.16 |
| HTTP client | httpx >=0.28 (sync `httpx.Client`, pooled) |
| Storage | stdlib `sqlite3` (no ORM) |
| Tests | pytest >=9.1, `httpx2` (TestClient) |

## Run locally

Needs `ml-api` on `ML_API_URL` for creating estimates (the service itself starts without it).

```bash
# with mise (repo root)
mise run dev:ml          # terminal 1, after `mise run train`
mise run dev:estimator   # terminal 2, http://localhost:8001

# plain
cd estimator-api
uv sync
uv run uvicorn app.main:app --port 8001
```

Swagger UI: http://localhost:8001/docs. The default DB file is `estimates.db` in the working directory (git-ignored).

## Run in Docker

```bash
docker build -t hpp-estimator-api estimator-api
docker run --rm -p 8001:8001 -e ML_API_URL=http://host.docker.internal:8000 -v estimates:/data -e DB_PATH=/data/estimates.db hpp-estimator-api
```

In `docker-compose.yml` it gets `ML_API_URL=http://ml-api:8000`, `DB_PATH=/data/estimates.db` on the `estimator-data` named volume, waits for `ml-api` to be healthy, and is published on `8001` for Swagger demos.

## Configuration

Read by `app/config.py` (env var = upper-cased field name).

| Env var | Default | Purpose |
|---|---|---|
| `ML_API_URL` | `http://localhost:8000` | Base URL of ml-api |
| `ML_API_TIMEOUT` | `5.0` | Seconds, for the pooled httpx client |
| `DB_PATH` | `estimates.db` | SQLite file; the table is created at startup |

## Endpoints

| Method | Path | Purpose | Notes |
|---|---|---|---|
| POST | `/estimates` | Predict via ml-api and save | 201 with the stored estimate. Body is the 7 features plus optional `label` (max 80 chars). 422 invalid input (own validation, or ml-api's), 502 ml-api error, 503 ml-api unreachable |
| GET | `/estimates` | List estimates | `limit` 1-500 (default 50), newest first. `ids=1,2,3` returns just those (comparison view); non-numeric ids are ignored, order is not guaranteed |
| GET | `/estimates/{id}` | One estimate | 404 `{"detail":"Estimate not found"}` |
| DELETE | `/estimates/{id}` | Remove one | 204; 404 if missing |
| GET | `/health` | Liveness | `{"status":"ok","ml_api":"up"\|"down"}`; always 200 |
| GET | `/model-info` | ml-api's model card, passed through | 502/503 as above |

All errors have the shape `{"detail": ...}`. `detail` is a string for service errors, and a list (FastAPI/pydantic format) for 422s.

## Tests

```bash
cd estimator-api && uv sync && uv run pytest -q    # 6 passed
```

- `tests/test_estimates_api.py` runs the real app against a temp SQLite file with a fake ML client injected through `app.dependency_overrides`. It covers create plus list, list by ids, unknown id (404), ml-api down (503), and invalid input (422 without calling ml-api).
- `tests/test_estimate_service.py` exercises `EstimateService` with an in-memory SQLite and the fake client, with no FastAPI at all.
- Not covered: the real `MlClient` against HTTP (status mapping is untested), `limit` bounds, DELETE 204.

## Layout

```
estimator-api/
├── app/
│   ├── main.py            # create_app(), lifespan: init_db + pooled httpx.Client
│   ├── config.py          # Settings
│   ├── db.py              # SCHEMA, init_db, get_db (per-request connection)
│   ├── deps.py            # get_ml_client, get_estimate_service, *Dep aliases
│   ├── errors.py          # AppError hierarchy + {detail} handler
│   ├── schemas.py         # HouseFeatures, EstimateRequest, Estimate
│   ├── api/               # estimates.py, health.py (routers)
│   ├── services/estimates.py      # EstimateService (orchestration)
│   ├── repositories/estimates.py  # EstimateRepository (SQL)
│   └── clients/ml.py      # MlClient (httpx, error translation)
├── tests/                 # conftest.py (FakeMlClient), API and service tests
├── Dockerfile
└── pyproject.toml, uv.lock
```
