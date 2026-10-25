# Housing Prediction Portal

An interview take-home in one monorepo:

- **Task 1:** a scikit-learn housing-price model behind a FastAPI service (`ml-api`).
- **Task 2:** a Next.js portal (`web`) with two apps: a Price Estimator backed by a Python service (`estimator-api`) and a Market Explorer backed by a Java service (`market-api`).

Design and trade-offs: [ARCHITECTURE.md](ARCHITECTURE.md).

```mermaid
flowchart LR
  B[Browser] --> W[web :3000<br/>Next.js 16]
  W --> E[estimator-api :8001<br/>FastAPI + SQLAlchemy]
  W --> M[market-api :8080<br/>Spring Boot + Hibernate]
  E --> ML[ml-api :8000<br/>FastAPI + Ridge]
  M --> ML
  E --> PG[(PostgreSQL<br/>schemas estimator, market)]
  M --> PG
  CSV[(data/house_prices.csv)] -.mounted.-> ML
  CSV -.mounted.-> M
```

## Requirements map

Against the task PDF ("Interview Tasks Fullstack"), paraphrased. "Partial" rows say what is missing.

### Task 1: prediction API (`ml-api`)

| Requirement | Where it lives | Status |
|---|---|---|
| Regression model on the provided dataset | `ml-api/app/ml/train.py` (scikit-learn Ridge, 5-fold CV), trained at startup from `data/house_prices.csv` | Done |
| `predict`, single and batch | `POST /predict`, `POST /predict/batch` in `ml-api/app/api/predictions.py` | Done |
| `model-info`: coefficients and performance metrics | `GET /model-info` in `ml-api/app/api/model_info.py` (also feature ranges) | Done |
| `health` | `GET /health` in `ml-api/app/api/health.py` | Done |
| Python 3.12+, FastAPI, scikit-learn | `ml-api/pyproject.toml` (Python 3.14) | Done |
| Input validation and out-of-range handling (own addition) | Pydantic bounds (422) + extrapolation `warnings` in `ml-api/app/services/predictor.py` | Done |
| Source on GitHub | This repository; not pushed yet | Partial |
| Dockerfile | `ml-api/Dockerfile` | Done |
| Live demo via Swagger/OpenAPI | `/docs` of each service (see Quick start) | Done locally; not yet running on the Pi |

### Task 2: portal

| Requirement | Where it lives | Status |
|---|---|---|
| Shared layout and navigation between the apps | `web/app/layout.tsx`, `web/components/nav.tsx`, `sub-nav.tsx` | Done |
| App Router routing between and within apps | `web/app/estimator/*`, `web/app/market/*` | Done |
| Consistent design system | shadcn components on Tailwind in `web/components/ui/` | Done |
| Loading and error states at layout level | `loading.tsx`, `error.tsx`, `global-error.tsx`, `not-found.tsx` per layout | Done |
| **App 1 frontend:** form with all model fields | `web/components/estimator/estimate-form.tsx`, `web/components/house-fields.tsx` | Done |
| Client-side validation with messages | zod + react-hook-form (`web/lib/house-schema.ts`) | Done |
| Result as table and as chart | `estimate-result.tsx` (table) + `contribution-chart.tsx` (per-feature breakdown) | Done |
| History of previous estimates | `/estimator/history`, `history-table.tsx` | Done |
| Side-by-side comparison | `/estimator/compare`, `compare-view.tsx` | Done |
| **App 1 backend (Python):** form submissions, ml-api integration, validation and errors | `estimator-api` (`POST /estimates`, SQLAlchemy on Postgres, calls ml-api) | Done |
| **App 2 frontend:** interactive dashboard with charts | `web/app/market`, `segment-chart.tsx`, `price-scatter.tsx` | Done |
| Filters for segments | `filters.tsx`, URL-driven (`use-market-filters.ts`) | Done |
| What-if tool using the model | `/market/what-if`, `what-if-tool.tsx`, `POST /api/market/what-if` | Done |
| CSV and PDF export | `export-buttons.tsx`, `GET /api/market/export.csv`, `/export.pdf` | Done |
| Responsive tables with sorting and filtering | `properties-table.tsx` (TanStack Table; sorting, filtering and paging are server-side in market-api) | Done |
| **App 2 backend (Java):** REST endpoints, aggregate stats, ml-api integration | `market-api` `/api/market/summary`, `/segments`, `/properties`, `/what-if` (JPA Specifications; what-if calls ml-api batch) | Done |
| Caching for performance | Caffeine cache on summary, segments and what-if in market-api; Next.js data cache (5 min) for market reads in the portal | Done |
| App Router; server and client components used appropriately | RSC pages and loaders; client components only for forms, charts, tables, filters | Done |
| RSC for initial data loading | `web/lib/data/server.ts` loaders and TanStack Query prefetch/hydration | Done |
| Data fetching strategy | server loaders (market), TanStack Query (estimator, what-if), rewrites as same-origin proxy | Done |
| Custom hooks for shared functionality | `web/hooks/` (`use-estimates`, `use-model-info`, `use-what-if`, `use-market-filters`, `use-debounce`) | Done |
| Responsive layouts with Tailwind | Tailwind 4 utility classes throughout | Done, checked by eye, no device matrix |
| Accessible components following WCAG | Skip link, landmarks, labelled fields and sliders, `aria-live` errors, `sr-only` chart tables, reduced-motion support (see [web/ARCHITECTURE.md](web/ARCHITECTURE.md#accessibility)) | Partial: basic measures, no formal audit |
| Loading states and error boundaries | skeletons, `loading.tsx`, route and global error boundaries, inline `ErrorState` | Done |
| Smooth transitions between pages and states | `web/app/template.tsx` fade-in, pending-state dimming on filter changes | Done |
| Cohesive modern UI | shadcn/Tailwind theme | Done (subjective) |
| Client-side state management | URL state (nuqs), TanStack Query cache, local component state; no global store | Done |
| Form state with validation | react-hook-form + zod | Done |
| Efficient data fetching and API error handling | query caching and stale times, abort/timeouts, `{detail}` normalised in `web/lib/api.ts` | Done |
| Next.js code organisation | `app/`, `components/`, `hooks/`, `lib/` | Done |
| Python 3.12+, FastAPI, Java 21, Spring Boot 3.4.4 | `pyproject.toml` (3.14), `market-api` (Java 21, Boot 3.4.4) | Done |
| Source on GitHub | This repository; not pushed yet | Partial |
| Live demo | `docker compose up --build`; the Pi deployment (CI/CD, arm64 images, runner) is prepared but not yet pushed or run | Partial |

### Extras beyond the PDF

Write rate limiting on estimator-api (slowapi) and an `X-Request-ID` that follows a request through the portal, every backend and the logs (see [ARCHITECTURE.md](ARCHITECTURE.md#rate-limiting)). Tests (pytest in both Python services, JUnit in market-api; web has lint, `tsc`, a contract check and a build but no unit tests), shared contracts with a contract test per service, Docker Compose with Postgres, and the CI/CD workflow.

## Quick start

```bash
docker compose up --build
```

| What | URL |
|---|---|
| Portal | http://localhost:3000 |
| ml-api Swagger | http://localhost:8000/docs |
| estimator-api Swagger | http://localhost:8001/docs |
| market-api Swagger | http://localhost:8080/swagger-ui.html |

The web image needs network at build time (`next/font/google`). Stop with `docker compose down`. Compose starts five services: `postgres` (one database, schemas `estimator` and `market`, one role each, no published port), `ml-api`, `estimator-api`, `market-api` and `web`. Estimates live in the `postgres-data` volume; add `-v` to wipe them. The dataset is the single file `data/house_prices.csv`, bind-mounted read-only into ml-api and market-api, so a data change needs only a restart. Optional: copy `.env.example` to `.env` to change the database passwords (they are read when the volume is first created).

## Local development

Tool versions are pinned in `mise.toml`: Python 3.14, uv, Java temurin-21, Node 26.

```bash
mise install
mise tasks
```

| Task | Does |
|---|---|
| `mise run train` | Optional: train the model and print metrics (ml-api itself trains at startup from `data/house_prices.csv`) |
| `mise run dev:ml` | ml-api on :8000 |
| `mise run dev:estimator` | estimator-api on :8001 |
| `mise run dev:market` | market-api on :8080 (`./gradlew bootRun`) |
| `mise run dev:web` | portal on :3000 |
| `mise run lint:web` | eslint + `tsc --noEmit` |
| `mise run test` | pytest in both Python services + `./gradlew test` |
| `mise run up` / `down` | docker compose up --build / down |

`dev:web` defaults to `localhost:8001` and `localhost:8080` for the backends (set `ESTIMATOR_API_URL` / `MARKET_API_URL`, or copy `web/.env.example` to `web/.env.local`, to change that).

## Repository layout

| Path | What | Docs |
|---|---|---|
| `ml-api/` | Task 1 model API (Python) | [README](ml-api/README.md), [ARCHITECTURE](ml-api/ARCHITECTURE.md) |
| `estimator-api/` | Estimator backend (Python, SQLAlchemy) | [README](estimator-api/README.md), [ARCHITECTURE](estimator-api/ARCHITECTURE.md) |
| `market-api/` | Market backend (Java, Spring Boot) | [README](market-api/README.md), [ARCHITECTURE](market-api/ARCHITECTURE.md) |
| `web/` | Next.js portal | [README](web/README.md), [ARCHITECTURE](web/ARCHITECTURE.md) |
| `contracts/` | Shared contracts (house-feature JSON Schema, market query keys) and the error contract; each service has a test that compares its native schema with them | [README](contracts/README.md) |
| `data/` | The dataset (`house_prices.csv`, single copy) and sample inputs (`test_data.csv`) | |
| `postgres/init/` | Init script: roles and schemas, run on first start of the Postgres volume | |
| `.env.example` | Optional database password overrides | |
| `docker-compose.yml` | Full stack, images `ghcr.io/ekhrapykin/hpp-<service>:${TAG:-latest}` | |
| `.github/workflows/ci-cd.yml` | Test, build arm64 images, deploy to the Pi | |
| `mise.toml` | Toolchain and tasks | |

## Testing

```bash
mise run test                 # or per service:
cd ml-api && uv run pytest -q                                    # 12 tests (trains in lifespan)
cd estimator-api && uv run pytest -q                             # 18 tests
cd market-api && ./gradlew test                                  # JUnit 5 + Spring Test
cd web && npm run lint && npx tsc --noEmit                       # no unit tests in web
```

What each suite covers is listed in the service READMEs.

## Deployment (Raspberry Pi)

Target: Raspberry Pi OS 64-bit (arm64), 4 GB RAM. Images are built natively on GitHub's arm64 runners and pulled from GHCR.

1. **Docker** on the Pi: `curl -fsSL https://get.docker.com | sh`, then `sudo usermod -aG docker $USER && newgrp docker`. Check `uname -m` is `aarch64`.
2. **Self-hosted runner:** repo Settings -> Actions -> Runners -> New self-hosted runner -> Linux -> ARM64. Run the shown commands on the Pi, add the label `pi`, then `sudo ./svc.sh install && sudo ./svc.sh start`.
3. **Fork PR guard:** Settings -> Actions -> General -> enable "Require approval for outside collaborators". A self-hosted runner on a public repo must not run strangers' code (deploy only runs on `main` pushes; this is a second guard).
4. **GHCR visibility:** after the first push, make each `hpp-*` package public so the Pi can pull without a login.
5. **Expose the portal** (only port 3000): `tailscale funnel 3000`, or a Cloudflare Tunnel to `http://localhost:3000`.

Manual deploy, from a checkout of the repo (compose bind-mounts `./data` and `./postgres/init`): `docker compose pull && docker compose up -d --no-build`.

### CI/CD

`.github/workflows/ci-cd.yml`:

1. **Test** (every push and PR): pytest for ml-api (it trains in `lifespan` from the repo's CSV) and estimator-api (SQLite), `./gradlew test` for market-api (H2), lint + `tsc` + `next build` for web.
2. **Build** (not on PRs): each service built for `linux/arm64` on `ubuntu-24.04-arm`, pushed to GHCR as `latest` and the commit SHA.
3. **Deploy** (`main` only, `pi` runner): with `TAG` set to the commit SHA, `docker compose pull`, `up -d --no-build --remove-orphans`, wait until every container is healthy, prune old images. Roll back by running compose with `TAG=<older sha>`.

## Model notes

Ridge regression on standardised features (`Ridge`, alpha 10), 5-fold CV R2 about 0.97. Inputs outside the training range return warnings. The features are strongly collinear (pairwise correlation 0.91-0.99); see [ml-api/ARCHITECTURE.md](ml-api/ARCHITECTURE.md#data-notes). Model quality was deliberately not optimised; the task is architectural. α=10 is fixed so coefficients stay interpretable on collinear features; model selection is a future improvement.
