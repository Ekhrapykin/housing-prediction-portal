# market-api

Backend of the Market Explorer app. On every start it syncs the 50-row housing dataset from `DATA_PATH` (the repo's `data/house_prices.csv`, the source of truth) into its database (H2 in-memory locally, Postgres schema `market` in Docker) and serves filtered aggregates (summary, segment averages), a sortable/paged property list, CSV and PDF exports, and a what-if endpoint that asks `ml-api` for a price curve. The portal calls it through the Next.js rewrite `/api/market/*` (and directly from server components).

## Stack

| Piece | Version / source |
|---|---|
| Java | 21 (Gradle toolchain; `temurin-21` in `mise.toml`, `eclipse-temurin:21` images) |
| Build | Gradle 8.14.6 wrapper, Kotlin DSL, version catalog `gradle/libs.versions.toml` |
| Framework | Spring Boot 3.4.4 (web, validation, data-jpa, cache, actuator), virtual threads on |
| Persistence | Hibernate/JPA. Default: H2 in-memory (`create-drop`). `docker` profile: PostgreSQL via the `market` role and `default_schema=market` (`ddl-auto: create`) |
| Cache | Caffeine via Spring Cache |
| Docs | springdoc-openapi 2.8.6 |
| PDF | OpenPDF 2.4.0 |
| Tests | JUnit 5, Spring Test (MockMvc, MockRestServiceServer), Mockito |

## Run locally

Needs `ml-api` only for `/what-if`; everything else works standalone (H2 in memory, CSV read from `../data/house_prices.csv`, relative to `market-api/`).

```bash
# with mise (repo root)
mise run dev:market       # http://localhost:8080

# plain
cd market-api
./gradlew bootRun
```

Swagger UI: http://localhost:8080/swagger-ui.html (OpenAPI JSON at `/v3/api-docs`).

## Run in Docker

```bash
docker build -t hpp-market-api market-api
docker run --rm -p 8080:8080 -e ML_API_URL=http://host.docker.internal:8000 -v "$PWD/data/house_prices.csv:/data/house_prices.csv:ro" -e DATA_PATH=/data/house_prices.csv hpp-market-api
```

That runs on H2 like local dev. In compose the `docker` profile is active (`SPRING_PROFILES_ACTIVE=docker`), the CSV is bind-mounted read-only at `/data/house_prices.csv`, and the datasource is Postgres (`DATABASE_URL`, `MARKET_DB_PASSWORD`; user `market`, schema `market`). Hibernate creates the table (`ddl-auto: create`, no migrations) and `CsvPropertySync` reloads it from the CSV on every start.

Multi-stage build: JDK image runs `./gradlew bootJar`, the runtime is `eclipse-temurin:21-jre` as a non-root user with `JAVA_TOOL_OPTIONS=-Xmx256m -XX:+UseSerialGC`. The compose healthcheck (defined in `docker-compose.yml`) is `curl -fsS http://localhost:8080/actuator/health` with a 40 s start period.

## Configuration

| Setting | Env var | Default | Purpose |
|---|---|---|---|
| `ml.api.url` | `ML_API_URL` | `http://localhost:8000` | ml-api base URL |
| `data.path` | `DATA_PATH` | `../data/house_prices.csv` | Dataset CSV (`/data/house_prices.csv` in Docker); UTF-8 BOM handled |
| `market.sync-on-startup` | `MARKET_SYNC_ON_STARTUP` | `true` | Reload the market table from the CSV on start; turn off once migrations own the data |
| `spring.datasource.*` | `DATABASE_URL`, `MARKET_DB_PASSWORD` | H2 in-memory | `docker` profile only (`application-docker.yml`) |
| `server.port` | `PORT` | `8080` | Listen port; the image sets `PORT=8080`, compose sets it from `MARKET_API_PORT` |
| `ml.api.connect-timeout` | | `2s` | ml-api connect timeout (`MlProperties`) |
| `ml.api.read-timeout` | | `5s` | ml-api read timeout (`MlProperties`) |
| `logging.pattern.level` | | `%5p [req=%X{requestId:--}]` | Adds the request id (from `RequestIdFilter`) to every log line |
| `spring.cache.caffeine.spec` | | `maximumSize=500,expireAfterWrite=10m` | Applies to every cache |
| `spring.data.web.pageable.max-page-size` | | `200` | Upper bound for `size` |

Spring's relaxed binding lets any `application.yml` key be overridden by env var (for example `ML_API_READ_TIMEOUT=10s`).

## API

Base path `/api/market`. JSON uses snake_case (`spring.jackson.property-naming-strategy: SNAKE_CASE`). Every filter below is an optional query parameter on the first five rows.

Filters: `bedrooms` (any of, `bedrooms=2,4`), `min_price`, `max_price`, `min_school_rating`, `max_distance`, `min_year_built`, `max_year_built`.

| Method | Path | Purpose | Notes |
|---|---|---|---|
| GET | `/summary` | count, avg/median/min/max price, avg price per sq ft | Cached. Zeros when nothing matches |
| GET | `/segments?by=` | Averages per band | `by` is `BEDROOMS`, `SCHOOL_RATING`, `DISTANCE` or `DECADE`; else 400. Cached |
| GET | `/properties` | Page of properties `{items,total,page,size}` | `page` (0-based), `size` (max 200), `sort=price,desc` (snake_case or camelCase names); unknown sort property is 400 |
| GET | `/export.csv` | Filtered rows as CSV | `Content-Disposition: attachment` (`market-export.csv`) |
| GET | `/export.pdf` | Summary line plus table, A4 landscape | `market-report.pdf` |
| POST | `/what-if` | Price curve for one varied feature | Body below; cached; 400 on bad input (incl. `from >= to`) or ml-api 400/422 (its `detail` is passed through, e.g. `year_built: Input should be ...`), 502 ml-api error, 503 unreachable |
| GET | `/actuator/health` | Health | Only `health` is exposed |

What-if body: `{"base": <7 features>, "feature": "square_footage", "from": 1000, "to": 2500, "steps": 25}`. `steps` is 2-50, `feature` must be one of the 7 names. The service builds one variant per step (integer features are rounded, and duplicate values after rounding are dropped, so you may get fewer than `steps` points) and sends them to ml-api `/predict/batch` in one call. The response is `[{"value":..., "price":...}, ...]`.

Errors are Spring `ProblemDetail` (`application/problem+json`) with a `detail` string; see [ARCHITECTURE.md](ARCHITECTURE.md#errors) and the cross-service [error contract](../ARCHITECTURE.md#errors).

## Tests

```bash
cd market-api && ./gradlew test        # or: mise exec -- ./gradlew test -q
```

| Test | Covers |
|---|---|
| `PropertyRepositoryTest` (`@DataJpaTest`) | the CSV seed loads every row of the dataset; a Specification narrows results |
| `MarketControllerTest` (`@WebMvcTest`, services mocked) | summary happy path, bad `by` is 400, `from >= to` is 400 with `detail`, `steps` out of range is 400, an invalid nested field is reported with a snake_case path (`base.square_footage`) |
| `WhatIfServiceTest` (plain JUnit, mocked `MlClient`) | even spacing incl. endpoints, integer rounding, dedup after rounding, base features preserved, unknown feature is 400, prices map to values in order |
| `MlClientTest` (`MockRestServiceServer`) | prices in order; 422 list becomes a 400 `field: msg`; 400 string detail passes through; unparsable 422 falls back to the generic message; connection failure is 503; 5xx is 502; request id forwarded |
| `ContractTest` | `HouseFeatures` annotations vs `contracts/house-features.schema.json`; `Segment`, sort allow-list, `MarketFilter` params and `WhatIfRequest.steps` vs `contracts/market.json`. Gradle passes the `../contracts` path as `contracts.dir` and tracks it as a test input |
| `MarketApplicationTests` (full context, MockMvc) | `/summary` over the real seed |

## Project layout

```
market-api/
├── build.gradle.kts, settings.gradle.kts, gradle.properties
├── gradle/                # libs.versions.toml, wrapper
├── Dockerfile
└── src/
    ├── main/java/com/hpp/market/
    │   ├── MarketApplication.java
    │   ├── api/           # MarketController
    │   ├── service/       # MarketService, PropertyService, WhatIfService, ExportService, Segment
    │   ├── repository/    # PropertyRepository, PropertySpecifications
    │   ├── client/        # MlClient
    │   ├── domain/        # Property (JPA entity)
    │   ├── dto/           # records: HouseFeatures, MarketFilter, WhatIfRequest, ...
    │   ├── config/        # AppConfig, MlProperties, RequestIdFilter, RequestIdInterceptor
    │   ├── ingest/        # CsvPropertySync (CSV → market table on start)
    │   └── exception/     # ApiExceptionHandler (validation errors as ProblemDetail)
    ├── main/resources/    # application.yml, application-docker.yml
    └── test/java/...      # see Tests
```

## Further reading

- [ARCHITECTURE.md](ARCHITECTURE.md): layers, errors, request id, persistence, caching, decisions.
- Root docs: [README](../README.md), [ARCHITECTURE](../ARCHITECTURE.md) (cross-cutting contracts, [limitations and future work](../ARCHITECTURE.md#limitations-and-future-work)).
