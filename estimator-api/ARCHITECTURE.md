# estimator-api architecture

## Layers

```mermaid
flowchart LR
  R[api/ routes] --> S[services/]
  S --> Repo[repositories/] --> DB[(SQLite locally<br/>Postgres schema estimator in Docker)]
  S --> C[clients/ml.py] --> ML[ml-api]
  R -.uses.-> Sch[schemas.py]
  R -.Depends.-> D[deps.py]
```

| Layer | Module | Rule |
|---|---|---|
| Routes | `app/api/` | Declare path, status code and response model, delegate to a service. No SQL, no HTTP calls. |
| Service | `app/services/estimates.py` | Use cases (`create`, `get`, `list`, `delete`). Raises domain errors. No FastAPI imports. |
| Repository | `app/repositories/estimates.py` | The only place that queries the database; maps `EstimateRow` to `Estimate`. Takes a SQLAlchemy `Session`. |
| Client | `app/clients/ml.py` | The only place that talks to ml-api; turns HTTP failures into domain errors. |
| Schemas | `app/schemas.py` | Request and response models. |
| Errors | `app/errors.py` | `AppError` hierarchy and one handler. |
| Rate limit | `app/ratelimit.py` | slowapi `Limiter`, `client_key`, trusted-proxy resolution, the 429 handler. Routes opt in with `@limiter.shared_limit`. |
| Request id | `app/request_id.py` | Pure ASGI middleware, `ContextVar`, log `Filter`, log format. `MlClient` reads the `ContextVar` and forwards the id. |
| Config / deps / db | `config.py`, `deps.py`, `db.py` | Settings, wiring, the ORM model and the `Session` dependency. `deps.py` is the composition root: it builds a service per request. |

Because the service takes plain collaborators, `test_estimate_service.py` runs it without FastAPI.

## Request flow: `POST /estimates`

```mermaid
sequenceDiagram
  participant W as Portal
  participant R as estimates.py
  participant S as EstimateService
  participant C as MlClient (pooled)
  participant ML as ml-api
  participant DB as SQLite / Postgres
  W->>R: POST /estimates {features, label}
  R->>R: validate EstimateRequest (422 on failure)
  R->>S: create(req)
  S->>C: predict(features)
  C->>ML: POST /predict
  ML-->>C: {price, warnings}
  S->>DB: INSERT estimates
  S-->>R: Estimate
  R-->>W: 201 Estimate
  Note over R,DB: get_session commits after the handler, rolls back on error, always closes
```

The validated request is checked here and again by ml-api. A 422 from ml-api is passed through as a 422 rather than a 500.

## Errors

Every failure is rendered as `{"detail": ...}`, the same contract the other services use.

| Exception | Status | When |
|---|---|---|
| `NotFoundError` | 404 | unknown estimate id |
| `UpstreamValidationError` | 422 | ml-api answered 422; its `detail` is forwarded |
| `UpstreamError` | 502 | ml-api answered any other error status |
| `UpstreamUnavailable` | 503 | connect or timeout failure (any `httpx.HTTPError`) |
| FastAPI `RequestValidationError` | 422 | our own request validation; default body, `detail` is a list |

`app_error_handler` is registered for `AppError`, so adding an error is a subclass with a `status_code`. `MlClient._request` is the single translation point.

## Data and persistence

SQLAlchemy 2.x with the typed declarative style (`DeclarativeBase`, `Mapped[...]`, `mapped_column`), one table, `EstimateRow` in `db.py`:

`estimates(id INTEGER PK, label TEXT NULL, features JSON, price FLOAT, warnings JSON, created_at TEXT)`

`features` and `warnings` use the generic `JSON` type (JSON text on SQLite, `json` on Postgres); `created_at` is an ISO-8601 UTC string. `lifespan` builds the `Engine` from `DATABASE_URL` and a `sessionmaker`, keeps the factory on `app.state`, and runs `Base.metadata.create_all`, so there are no migrations. `get_session` is the request-scoped `Session` dependency: commit after the handler succeeds, roll back on any exception, always close. The repository only calls `add`/`flush`/`select`/`delete` on that session.

**Which schema.** The model has no `schema=`. `DATABASE_URL` selects the backend: SQLite for local runs and tests, Postgres in compose. On Postgres the `estimator` role is created with `ALTER ROLE estimator SET search_path = estimator` (`data/postgres/init/01-schemas.sh`), so `create_all` and every query resolve to `estimator.estimates`, and the role has no grants on `market`. SQLite has no schemas, so the same code works unchanged.

## ml-api connection pool

`lifespan` creates one `httpx.Client(base_url, timeout)` and wraps it in `MlClient` on `app.state`. Connections are reused across requests and closed on shutdown. Per-call `is_healthy()` uses `ml_api_health_timeout` (2 s by default, in `Settings`) so `/health` never hangs for the full 5 s. Handlers are sync, so FastAPI's threadpool provides the concurrency and the sync client is fine.

## Rate limiting and request ids

`POST` and `DELETE /estimates` share one slowapi budget per client (`RATE_LIMIT_WRITES`, default `20/minute`); the 429 is `{"detail": ...}` plus `Retry-After`. The client key is the TCP peer, or the right-most `X-Forwarded-For` entry when the peer is one of `TRUSTED_PROXIES` (resolved to IPs on each write request, so a recreated `web` container is still recognised). Rationale and trust model: root [ARCHITECTURE.md](../ARCHITECTURE.md#rate-limiting). Storage is slowapi's in-memory default, so counters are per process.

`RequestIdMiddleware` stores a valid incoming `X-Request-ID` (or a new UUID4) in a `ContextVar`, sets it on the response and logs one line per request. FastAPI copies the context into its threadpool, so sync routes and `MlClient` see it. Uvicorn's access log is disabled in `configure_logging()`; the middleware line replaces it (it adds the id and the duration).

## Testing seams

`conftest.py` resets the (process-wide) limiter before every test, offers a `make_client(peer=..., **env)` factory, and overrides `get_ml_client` with `FakeMlClient` through `app.dependency_overrides` and points `DATABASE_URL` at a temp-file SQLite database (clearing the `lru_cache` on `get_settings`). The real stack runs in tests except the network call.

## Key decisions

| Decision | Why |
|---|---|
| Service owns ml-api calls, not the portal | Keeps the model private, persists every estimate with its warnings, one place for error mapping. |
| SQLAlchemy 2.x ORM, not raw SQL | One codebase runs on SQLite (tests, local) and Postgres (Docker) with no SQL dialect code; the typed model is the schema. Cost: a dependency for one table. |
| JSON text columns | Features are always read and written as a unit; no querying inside them. |
| Session per request, commit in the dependency | One transaction per request; a failed handler rolls back. Sessions are never shared across threads. |
| Feature schema duplicated from ml-api | Pinned to `contracts/house-features.schema.json` by `tests/test_contract.py`. Fails fast without a round-trip. |
| Domain error hierarchy | Services and clients stay HTTP-agnostic; one handler owns the wire format. |
| `/health` always 200 with `ml_api: up/down` | The service is alive even when its dependency is not; compose healthchecks stay stable. |

## Limitations

- Tests do not cover `MlClient`'s HTTP status mapping (only request-id forwarding is tested, over `httpx.MockTransport`), the `limit` bounds, or DELETE 204.
- The history has a `limit` (1-500) but no offset or cursor paging.

System-wide items (no auth, migrations, error-contract shape, in-memory rate limit): [Limitations and future work](../ARCHITECTURE.md#limitations-and-future-work).
