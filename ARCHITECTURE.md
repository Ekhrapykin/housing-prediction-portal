# Architecture

System view of the Housing Prediction Portal. Each service has its own deep dive: [ml-api](ml-api/ARCHITECTURE.md), [estimator-api](estimator-api/ARCHITECTURE.md), [market-api](market-api/ARCHITECTURE.md), [web](web/ARCHITECTURE.md).

## System context and containers

```mermaid
flowchart TB
  U[User browser] -->|HTTPS via tunnel| W
  subgraph Host["Docker host (laptop or Raspberry Pi)"]
    W[web<br/>Next.js 16 :3000]
    E[estimator-api<br/>FastAPI :8001]
    M[market-api<br/>Spring Boot :8080]
    ML[ml-api<br/>FastAPI + scikit-learn :8000]
    PG[(PostgreSQL 17<br/>db housing, postgres-data volume<br/>schema estimator, schema market)]
    CSV[(data/house_prices.csv<br/>bind mount, read-only)]
    W -->|/api/estimator rewrite + RSC fetch| E
    W -->|/api/market rewrite + RSC fetch| M
    E -->|POST /predict, GET /model-info| ML
    M -->|POST /predict/batch| ML
    E -->|role estimator| PG
    M -->|role market| PG
    CSV -.->|trains at startup| ML
    CSV -.->|synced on every start| M
  end
  GH[GitHub Actions] -->|arm64 images| GHCR[(GHCR)]
  GHCR -->|docker compose pull| Host
```

## Responsibilities and boundaries

| Service | Owns | Calls | Called by |
|---|---|---|---|
| ml-api | The model, trained at startup, and its card (`/model-info`) | nobody | estimator-api, market-api |
| estimator-api | Estimate history (Postgres schema `estimator`) | ml-api | web |
| market-api | Market dataset view (Postgres schema `market`, H2 locally), aggregates, exports, what-if | ml-api | web |
| web | UI, URL state, browser cache | estimator-api, market-api | browser |
| postgres | One database `housing`, schemas `estimator` and `market`, one role each | nobody | estimator-api, market-api |

Rules:

- The browser never talks to a backend directly. It calls `/api/*` on the portal's own origin, and the portal proxies.
- Only the two app backends call ml-api; the portal reaches the model card through `estimator-api /model-info`.
- No service reads another's storage. Each backend has its own Postgres role that can only touch its own schema, and there are no cross-schema joins. The 50-row dataset is one file, `data/house_prices.csv`, mounted read-only into ml-api (training) and market-api (synced into its schema on every start, so the market table is a read model of the file); it is reference data nobody writes.

## Cross-cutting contracts

| Contract | Detail |
|---|---|
| JSON naming | snake_case everywhere. Python models use snake_case fields; market-api sets `spring.jackson.property-naming-strategy: SNAKE_CASE` and binds snake_case query params with `@BindParam`. |
| Errors | Non-2xx responses carry `{"detail": ...}`. estimator-api uses an `AppError` handler; market-api returns `ProblemDetail` (which has `detail`); ml-api uses FastAPI defaults. `detail` is a string, except FastAPI validation 422s, where it is a list of issues; the portal's `apiFetch` turns that list into a readable `field: message` string. Validation status differs: 422 in Python, 400 in Java. |
| Health | ml-api and estimator-api `GET /health`, market-api `GET /actuator/health`, web `GET /`, postgres `pg_isready`. Compose healthchecks and `depends_on: service_healthy` order startup: postgres and ml-api, then the two app backends, then web. |
| Feature schema | The 7 features with identical bounds are defined in four places, pinned to [`contracts/`](contracts/README.md) by contract tests (below). |

### The 7-feature schema, mirrored four times, pinned by `contracts/`

| Copy | File | Role |
|---|---|---|
| Contract | `contracts/house-features.schema.json` (+ `contracts/market.json` for market query keys) | The agreed names, types and bounds |
| Native: ml-api | `ml-api/app/schemas.py` | What the model accepts |
| estimator-api | `estimator-api/app/schemas.py` | Validate before calling ml-api |
| market-api | `market-api/.../dto/HouseFeatures.java` | Validate the what-if base house |
| web | `web/lib/house-schema.ts` (zod), `web/lib/types.ts` | Instant form errors, typed UI |

Why mirror instead of share: three languages and four deployables; a shared package or codegen would be more machinery than a 7-field schema that hasn't changed. Each copy fails fast at its own boundary, and ml-api still validates last. Drift is caught by one contract test per service (`ml-api` and `estimator-api` `tests/test_contract.py`, market-api `ContractTest`, web `npm run check:contracts`), all comparing the native schema with the files in `contracts/`. To change a bound: edit the contract first, then every mirror. Contracts are only read by tests, so no Docker image needs them. The trigger to go further is a fifth consumer: generate clients from ml-api's OpenAPI.

## Flow: create an estimate

```mermaid
sequenceDiagram
  participant B as Browser
  participant W as web (Next)
  participant E as estimator-api
  participant ML as ml-api
  participant DB as Postgres (schema estimator)
  B->>B: zod validation (react-hook-form)
  B->>W: POST /api/estimator/estimates
  W->>E: rewrite to POST /estimates
  E->>E: Pydantic validation (422)
  E->>ML: POST /predict (pooled httpx.Client)
  ML-->>E: {price, warnings}
  E->>DB: INSERT
  E-->>W: 201 Estimate
  W-->>B: 201 Estimate
  B->>B: invalidate ["estimates"], toast, show breakdown
```

If ml-api is unreachable, estimator-api returns 503 `{detail}` and the form shows it as a toast.

## Flow: market what-if

```mermaid
sequenceDiagram
  participant B as Browser
  participant W as web (Next)
  participant M as market-api
  participant C as Caffeine
  participant ML as ml-api
  B->>B: change slider, debounce 300 ms
  B->>W: POST /api/market/what-if {base, feature, from, to, steps}
  W->>M: rewrite to /api/market/what-if
  M->>C: lookup WhatIfRequest
  alt cache miss
    M->>ML: POST /predict/batch (steps variants, HTTP/1.1)
    ML-->>M: prices
    M->>C: store
  end
  M-->>W: [{value, price}]
  W-->>B: chart (previous curve kept while loading)
```

## Rate limiting

estimator-api limits writes: `POST /estimates` and `DELETE /estimates/{id}` share one budget per client (`RATE_LIMIT_WRITES`, default `20/minute`, slowapi). Reads are not limited. Over the limit: 429, `{"detail": "Too many requests. Try again in N seconds."}` and `Retry-After`. market-api's what-if has no limit of its own: the Caffeine cache and the `steps` cap (at most 50) bound its cost.

**Who is "a client".** The key is the TCP peer address, except when the peer is a *trusted proxy* (`TRUSTED_PROXIES`, default `web`, resolved to IPs at startup): then it is the **right-most** `X-Forwarded-For` entry.

- Why only from trusted peers: `X-Forwarded-For` is just a header. `:8001` is published for Swagger, so anyone who can reach it could send a new value per request and never be limited. A peer that isn't the portal gets keyed by its own address.
- Why right-most: Next 16 doesn't append its own address to an existing `X-Forwarded-For`, and the tunnel (Tailscale Funnel or Cloudflare) appends the real client IP last. Everything to its left is client-supplied and can be forged; the last entry was written by infrastructure we trust.
- The trusted set is resolved on every write request (Docker DNS, cheap at this rate), so recreating `web` with a new IP does not silently merge every portal user into one budget. Behind a different proxy chain the "right-most" rule has to be revisited.

**Limitation.** Counters are in-memory per process: correct for the single replica we run. Several replicas would each keep their own counters; they need a shared store (Redis).

## Request correlation

`X-Request-ID` ties one user action to the log lines of every service it touches (header contract: [contracts/README.md](contracts/README.md#request-id)). It is born at the first backend, not at the browser.

```mermaid
sequenceDiagram
  participant W as web
  participant B as backend (estimator-api / market-api)
  participant ML as ml-api
  W->>B: request (server-side estimator reads send a fresh UUID; rewrites send none)
  B->>B: valid incoming id or generate UUID4, put in ContextVar / MDC
  B->>ML: same header on the outgoing call
  ML->>ML: same rule, logs [req=id]
  ML-->>B: response with X-Request-ID
  B-->>W: response with X-Request-ID (also on errors)
  W->>W: toast: "<detail> · ref <first 8 chars>"
```

- An incoming id is accepted only if it matches `^[A-Za-z0-9-]{1,64}$`, otherwise replaced by a UUID4. This prevents log injection.
- Each service logs `[req=<id>]` on every line (`-` outside a request). The Python services log one line per request (method, path, status, ms) from the middleware and **disable uvicorn's access log** to avoid duplicates; market-api uses Spring's logging with an MDC pattern.
- The id is carried by a `ContextVar` (Python; FastAPI copies the context into its threadpool) or the MDC (Java; a request runs on one thread, virtual or not, and the ml-api call is synchronous on it). The ml-api clients add it to every outgoing call.
- Debugging recipe: copy the `ref` from a toast, then `docker compose logs estimator-api ml-api market-api | grep <ref>` (the first 8 characters are enough for a UUID).
- The portal's cached market reads send no id: Next puts request headers in the fetch cache key, so a fresh id per request would disable the cache. market-api generates one for them.

## Caching across layers

| Layer | What | Policy |
|---|---|---|
| market-api, Caffeine | `summary`, `segments`, `whatIf` | Record keys; `maximumSize=500`, `expireAfterWrite=10m` |
| web, Next fetch cache | Server-side market reads | `revalidate: 300`, tag `market` |
| web, no cache | Server-side estimator reads | `cache: "no-store"` (user data) |
| web, TanStack Query | Browser queries | `staleTime` 30 s (model info 10 min); mutations invalidate `["estimates"]` |
| ml-api | none | Model in memory (trained at startup); predictions are cheap |

The market data never changes while the app runs, so time-based expiry is enough. Estimates are never cached on the server because every write must be visible on the next read.

## Deployment

```mermaid
flowchart LR
  P[push to main] --> T[test jobs<br/>pytest, gradle, lint/tsc/build]
  T --> BLD[build matrix<br/>ubuntu-24.04-arm, linux/arm64]
  BLD -->|:latest and :SHA| G[(ghcr.io/ekhrapykin/hpp-*)]
  BLD --> D[deploy job<br/>self-hosted runner label pi]
  D -->|TAG = SHA, compose pull and up| PI[Raspberry Pi<br/>docker compose]
```

- **Compose:** one file for laptop (`up --build`) and Pi (`pull` + `up -d --no-build`). Images are named `ghcr.io/ekhrapykin/hpp-<service>:${TAG:-latest}`. Memory limits: postgres 384m (`shared_buffers=64MB`, `max_connections=30`), ml-api 512m, estimator-api 256m, market-api 640m (JVM `-Xmx256m`, SerialGC), web 384m. `./data` and `./postgres/init` are bind-mounted from the checkout, which the deploy job has; Postgres data is the named volume `postgres-data`. Postgres has no published port. Passwords come from `.env` or demo defaults in compose (`.env.example`).
- **Images:** ml-api and market-api images contain no data (the CSV is mounted) and ml-api no model (it trains at startup); market-api is a multi-stage JDK-to-JRE build; web is a multi-stage Next `standalone` build with backend URLs as build args. All four app images run as a non-root user; Postgres is the official `postgres:17-alpine` image.
- **CI:** tests run on every push and PR. Images are built natively for arm64 on `ubuntu-24.04-arm` (no QEMU), with a GitHub Actions layer cache per service.
- **CD:** the deploy job runs on the Pi's self-hosted runner with `TAG=${{ github.sha }}`, so it deploys exactly the images built in that run rather than whatever `latest` is. It waits up to 150 s for all containers to be healthy and fails the job otherwise. Rollback is `TAG=<older sha> docker compose up -d`.
- **Exposure:** only port 3000 needs to be public (Tailscale Funnel or Cloudflare Tunnel). Backend ports are published for Swagger demos only.

## Tech choices

| Area | Choice | Rationale |
|---|---|---|
| Model API | Python 3.14, FastAPI >=0.162, scikit-learn >=1.9 | The standard ML stack; Pydantic validation and OpenAPI for free |
| Estimator backend | FastAPI, SQLAlchemy 2.0 (typed ORM), psycopg 3, httpx | Same stack as ml-api; the ORM runs on SQLite (tests, local) and Postgres (Docker) unchanged |
| Market backend | Java 21, Spring Boot 3.4.4, Gradle 8.14 (Kotlin DSL, version catalog) | Task asks for Java; Boot gives JPA, cache, validation, ProblemDetail, actuator |
| Market storage | Hibernate on Postgres in Docker, H2 locally and in tests, JPA Specifications | Read-only 50-row dataset; composable filters; one JPA codebase on both |
| Database | PostgreSQL 17 (alpine), one instance, one DB, schema and role per service | A real database on the Pi without a container per service; `postgres:17` is a mature supported major with a stable volume path |
| Market cache | Caffeine | In-process, no extra container |
| Exports | OpenPDF 2.4.0, hand-written CSV | Small, permissive PDF library |
| Portal | Next.js 16.4.3 App Router, React 19.3 | RSC for server-rendered market views, one origin for both apps |
| Client data | TanStack Query 5, TanStack Table 9 | Cache, invalidation, hydration from RSC |
| Forms/UI | react-hook-form, zod 4, Tailwind 4, shadcn, Recharts 3 | Typed validation, accessible primitives |
| Toolchain | mise, uv, Gradle wrapper, npm | One `mise install` pins everything |
| Runtime | Docker Compose on a Raspberry Pi (arm64), GHCR, GitHub Actions | Cheap, real deployment target |

## Decisions and trade-offs

**Three backends.** The task asks for a model API, a Python-backed app and a Java-backed app. Each backend owns one concern (model, estimates, market), and the model is a shared dependency behind HTTP instead of being loaded twice. Cost: more containers and duplicated contracts.

**One PostgreSQL with a schema and a role per service.** Both backends store data through an ORM, so one `postgres:17-alpine` container (about 64 MB shared buffers) serves them without a database per service. Database `housing` has schemas `estimator` and `market`. Each is owned by its own role, nobody else has grants on it, and `search_path` is set per role, so unqualified table names land in the right schema and one service cannot read the other's tables. The init script (`postgres/init/01-schemas.sh`) creates them on first start, tables come from the ORMs (`create_all`, Hibernate `ddl-auto: create`), and there is no Flyway or Alembic. Hibernate's `create` is safe because market data is re-synced from the CSV on every start (`CsvPropertySync`; a deliberate sync of a read model, not a one-off seed, switchable with `market.sync-on-startup` once Flyway owns the data); estimates are never dropped because SQLAlchemy only creates missing tables. Local runs and tests stay on SQLite (estimator) and in-memory H2 (market), so no database is needed to develop; the same ORM code runs on both. Cost: one more container and a single shared failure point (one instance, no replication), and the portability is only as good as the tests, which do not run against Postgres (see future improvements).

**Training at startup from a mounted CSV.** `data/house_prices.csv` exists once in the repo and is bind-mounted read-only into ml-api (training) and market-api (synced on start), instead of being copied into two images. ml-api trains in `lifespan` (about a second, deterministic because the CV split has a fixed seed), so changing the data needs a restart, not a rebuild, and CI tests the same code path the service runs. A bind mount, not a named volume, so the file comes from the checkout that the Pi deploy job already has. Cost: the image alone is not a model, startup is slightly slower (compose `start_period` is 30 s), and there is still no model registry.

**Ridge over OLS or boosting.** With 50 rows and features correlated at 0.91-0.99, OLS coefficients are unstable, and boosting would overfit and lose the linear explanation the portal shows (contribution = coefficient x distance from mean). Ridge regularises and stays explainable. Alpha is fixed at 10 (`MODEL_ALPHA`) rather than cross-validated: the CV-picked alpha was tiny and left some coefficients with implausible signs. Cost: about 0.01 of CV R2 (0.973). Model quality was deliberately not optimised; the task is architectural. α=10 is fixed so coefficients stay interpretable on collinear features; model selection is a future improvement.

**Rewrites instead of route handlers.** `next.config.ts` rewrites proxy `/api/*` with no code, keep one origin (no CORS), and keep backends private. Cost: destinations are fixed at build time, so the URLs are build args, and the proxy can't reshape errors.

**TanStack Query + RSC prefetch instead of Server Actions.** The estimator needs a client cache, invalidation after create/delete, and debounced what-if queries with previous data kept on screen. Server Actions would cover the mutations but not the cache. RSC prefetch into `HydrationBoundary` keeps the first paint server-rendered.

**Java 21, not 25.** Spring Boot 3.4 supports Java up to 24 and Gradle up to 8.x; running on JDK 25 needs Gradle 9. Java 21 is an LTS that fits Boot 3.4.4 and Gradle 8.14 without a toolchain jump.

## Known limitations and next steps

- **Collinear features.** The features correlate 0.91-0.99, so single-feature coefficients are not individually identifiable even though all are positive at alpha 10. Model quality was deliberately not optimised; the task is architectural. α=10 is fixed so coefficients stay interpretable on collinear features; model selection is a future improvement. See the data notes in [ml-api/ARCHITECTURE.md](ml-api/ARCHITECTURE.md#data-notes).
- **Schema duplicated four times**, with drift caught by the contract tests in `contracts/`; generate clients from ml-api's OpenAPI if it changes.
- **Error contract is not uniform:** 400 vs 422 for validation, and FastAPI 422 `detail` is a list (the portal normalises it, other clients must handle both).
- **No auth;** the estimate history is shared by everyone. The write rate limit is per client address, not per user.
- **No e2e tests,** and the portal has only the contract check, no unit tests.
- **Single host, no TLS termination of its own;** relies on the tunnel.

## Future improvements

- **Model selection.** Alpha is fixed at 10 and model quality was not optimised. Compare alphas, feature subsets and other models with nested CV, and add VIF to `/model-info`.
- **Vitest for the web.** Move the contract check (`web/scripts/check-contracts.ts`) into a vitest suite and add unit tests for the zod schema, `apiFetch` and the URL parsers.
- **Generated web types.** Generate the web's response types from the backends' OpenAPI (`openapi-typescript`) instead of the hand-written `lib/types.ts`.
- **On-the-fly retraining.** `POST /admin/retrain` in ml-api reads the (new) CSV, validates it (columns, ranges, row count), trains, and swaps the in-memory model only if the CV metrics pass a threshold (for example R2 not below the current model's minus a tolerance). A `model_runs` table would log every attempt with metrics, data hash and outcome, which also gives the model versioning ml-api lacks today.
- **Migrations.** Alembic for estimator-api and Flyway for market-api once a column has to change on live data; `create_all` and `ddl-auto: create` only handle the first creation.
- **Testcontainers for Postgres.** Run the repository and JPA tests against a real Postgres, so SQLite/H2 portability is checked, including the per-role schemas.
- **Authentication and per-user history.** The estimate history is shared by everyone. A user id column on `estimates`, with auth at the portal, makes the isolation per user and not just per service.
- **Backups.** The `postgres-data` volume is the only copy of the estimates. A scheduled `pg_dump` of the `estimator` schema to the host or object storage would protect it from a bad SD card.
- **Web framework options left off on purpose.** Cache Components (`"use cache"`) and the React Compiler; `typedRoutes`; `@tailwindcss/postcss` instead of the Turbopack loader rule; `next/dynamic` for the charts.
- **Back/Forward through filter changes.** Not supported: filter changes use `replace` deliberately, so history is not flooded with one entry per keystroke.
- **Retry with backoff.** One retry on connect error for the idempotent `/predict`, if redeploys start producing errors. *Why not now:* compose `depends_on: service_healthy` already covers first start and ml-api restarts in about 1-2 s, so it isn't needed at the current startup time.
- **Circuit breaker.** *Why not now:* two callers and one dependency; overkill at this scale.
- **Prometheus and Grafana.** *Why not now:* too heavy for the Pi's memory budget (the compose limits are already tight), and `/metrics` with no consumer shows nothing; request-id logs cover debugging for now.
- **Authentication.** Already recorded under limitations. *Why not now:* not part of the task.
- **Distributed rate limiting with Redis.** *Why not now:* needed only with several replicas; one replica's in-memory counters are exact.
- **Structured JSON logs with central log collection.** *Why not now:* `docker compose logs | grep <request id>` is enough for one host and three services.
- **Input sanitization.** *Why not now:* already enforced at every boundary by Pydantic, zod and Jakarta Validation, with the contracts checked by tests.
