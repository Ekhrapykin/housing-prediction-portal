# estimator-api

Backend of the Price Estimator app. It accepts house features, asks `ml-api` for a price, stores the result (features, price, warnings, timestamp) in a SQL database (SQLite locally, PostgreSQL in Docker) and serves the history back. It also proxies `ml-api`'s model card and reports `ml-api` reachability in its health check. The portal calls it through the Next.js rewrite `/api/estimator/*`.

System context: [../README.md](../README.md). Internals: [ARCHITECTURE.md](ARCHITECTURE.md).

## Stack

| Piece | Version / source |
|---|---|
| Python | 3.14 |
| Packaging | uv, `uv.lock` committed |
| API | FastAPI >=0.162, uvicorn[standard] >=0.54, pydantic-settings >=2.16 |
| HTTP client | httpx >=0.28 (sync `httpx.Client`, pooled) |
| Storage | SQLAlchemy 2.0 (typed ORM), `psycopg` 3 for Postgres; SQLite by default |
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

Swagger UI: http://localhost:8001/docs. The default `DATABASE_URL` is `sqlite:///estimates.db`, a file in the working directory (git-ignored).

## Run in Docker

```bash
docker build -t hpp-estimator-api estimator-api
docker run --rm -p 8001:8001 -e ML_API_URL=http://host.docker.internal:8000 hpp-estimator-api   # SQLite inside the container (lost on exit)
```

In `docker-compose.yml` it gets `ML_API_URL=http://ml-api:8000` and `DATABASE_URL=postgresql+psycopg://estimator:...@postgres:5432/housing` (data lives in the `postgres-data` volume), waits for `ml-api` and `postgres` to be healthy, and is published on `8001` for Swagger demos.

## Configuration

Read by `app/config.py` (env var = upper-cased field name).

| Env var | Default | Purpose |
|---|---|---|
| `ML_API_URL` | `http://localhost:8000` | Base URL of ml-api |
| `ML_API_TIMEOUT` | `5.0` | Seconds, for the pooled httpx client |
| `ML_API_HEALTH_TIMEOUT` | `2.0` | Seconds, for the ml-api probe in `/health` (kept short so `/health` never hangs) |
| `DATABASE_URL` | `sqlite:///estimates.db` | SQLAlchemy URL; the table is created at startup (`create_all`). In Docker the `estimator` role's `search_path` puts it in schema `estimator` |
| `RATE_LIMIT_WRITES` | `20/minute` | slowapi limit shared by `POST /estimates` and `DELETE /estimates/{id}`, per client |
| `TRUSTED_PROXIES` | `web` | Comma-separated hostnames or IPs whose `X-Forwarded-For` is believed. Resolved to IPs on each write request; a name that doesn't resolve is skipped. Compose sets it explicitly |

## Endpoints

| Method | Path | Purpose | Notes |
|---|---|---|---|
| POST | `/estimates` | Predict via ml-api and save | 201 with the stored estimate. Body is the 7 features plus optional `label` (max 80 chars). 422 invalid input (own validation, or ml-api's), 429 rate limited, 502 ml-api error, 503 ml-api unreachable |
| GET | `/estimates` | List estimates | `limit` 1-500 (default 50; `MAX_LIMIT` / `DEFAULT_LIMIT` in `api/estimates.py`), newest first. `ids=1,2,3` returns just those in the requested order (comparison view); unknown ids are skipped, a non-integer id is a 422 |
| GET | `/estimates/{id}` | One estimate | 404 `{"detail":"Estimate not found"}` |
| DELETE | `/estimates/{id}` | Remove one | 204; 404 if missing; 429 rate limited (shares the budget with POST) |
| GET | `/health` | Liveness | `{"status":"ok","ml_api":"up"\|"down"}`; always 200 |
| GET | `/model-info` | ml-api's model card, passed through | 502/503 as above |

Rate limiting: only `POST` and `DELETE /estimates` are limited (`RATE_LIMIT_WRITES`); the 429 body is `{"detail": "Too many requests. Try again in N seconds."}` with a `Retry-After` header. The client is the TCP peer, or the right-most `X-Forwarded-For` entry when the peer is in `TRUSTED_PROXIES` (details in `app/ratelimit.py` and the root [ARCHITECTURE.md](../ARCHITECTURE.md#rate-limiting)). Counters are in-memory: fine for one replica, several replicas would need a shared store (Redis). The published `:8001` is limited too, keyed by the peer.

Request ids: `X-Request-ID` is read (if it matches `^[A-Za-z0-9-]{1,64}$`) or generated, echoed in the response, put on every log line as `[req=...]` and forwarded to ml-api. The middleware logs one line per request (method, path, status, ms) and uvicorn's own access log is turned off to avoid duplicates.

All errors have the shape `{"detail": ...}`. `detail` is a string for service errors, and a list (FastAPI/pydantic format) for 422s.

## Tests

```bash
cd estimator-api && uv sync && uv run pytest -q    # 18 passed
```

- `tests/test_estimates_api.py` runs the real app against a temp-file SQLite database with a fake ML client injected through `app.dependency_overrides`. It covers create plus list, list by ids in requested order, malformed ids (422), unknown id (404), ml-api down (503), and invalid input (422 without calling ml-api).
- `tests/test_estimate_service.py` exercises `EstimateService` with a temp-file SQLite database and the fake client, with no FastAPI at all.
- `tests/test_contract.py` compares `HouseFeatures.model_json_schema()` with `contracts/house-features.schema.json` (names, types, bounds, required).
- `tests/test_rate_limit.py`: the 21st write is a 429 with `detail` and `Retry-After`, POST and DELETE share a budget, reads are never limited, a trusted peer is keyed by the right-most `X-Forwarded-For` entry, an untrusted peer can't pick its key with a forged one. The limiter is reset before every test.
- `tests/test_request_id.py`: valid id echoed, missing or invalid id replaced by a UUID, id on error responses, `MlClient` forwards the current id (`httpx.MockTransport`).
- Not covered: the real `MlClient` against HTTP (status mapping is untested), `limit` bounds, DELETE 204.

## Layout

```
estimator-api/
├── app/
│   ├── main.py            # create_app(), lifespan: engine + init_db + pooled httpx.Client
│   ├── config.py          # Settings
│   ├── db.py              # ORM model (EstimateRow), engine and sessionmaker, init_db, get_session (request-scoped Session)
│   ├── deps.py            # get_ml_client, get_estimate_service (builds the repo on the Session), *Dep aliases
│   ├── errors.py          # AppError hierarchy + {detail} handler
│   ├── ratelimit.py       # slowapi limiter, client_key (trusted-proxy XFF), 429 handler
│   ├── request_id.py      # X-Request-ID middleware, log filter and format
│   ├── schemas.py         # HouseFeatures, EstimateRequest, Estimate
│   ├── api/               # estimates.py, health.py (routers)
│   ├── services/estimates.py      # EstimateService (orchestration)
│   ├── repositories/estimates.py  # EstimateRepository (SQLAlchemy queries on a Session)
│   └── clients/ml.py      # MlClient (httpx, error translation)
├── tests/                 # conftest.py (FakeMlClient), API, service and contract tests
├── Dockerfile
└── pyproject.toml, uv.lock
```
