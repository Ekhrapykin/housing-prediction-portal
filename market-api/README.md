# market-api

Backend of the Market Explorer app. It loads the 50-row housing dataset into an in-memory H2 database at startup and serves filtered aggregates (summary, segment averages), a sortable/paged property list, CSV and PDF exports, and a what-if endpoint that asks `ml-api` for a price curve. The portal calls it through the Next.js rewrite `/api/market/*` (and directly from server components).

System context: [../README.md](../README.md). Internals: [ARCHITECTURE.md](ARCHITECTURE.md).

## Stack

| Piece | Version / source |
|---|---|
| Java | 21 (Gradle toolchain; `temurin-21` in `mise.toml`, `eclipse-temurin:21` images) |
| Build | Gradle 8.14.6 wrapper, Kotlin DSL, version catalog `gradle/libs.versions.toml` |
| Framework | Spring Boot 3.4.4 (web, validation, data-jpa, cache, actuator), virtual threads on |
| Persistence | Hibernate/JPA on H2 in-memory (`ddl-auto: create-drop`) |
| Cache | Caffeine via Spring Cache |
| Docs | springdoc-openapi 2.8.6 |
| PDF | OpenPDF 2.4.0 |
| Tests | JUnit 5, Spring Test (MockMvc, MockRestServiceServer), Mockito |

## Run locally

Needs `ml-api` only for `/what-if`; everything else works standalone.

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
docker run --rm -p 8080:8080 -e ML_API_URL=http://host.docker.internal:8000 hpp-market-api
```

Multi-stage build: JDK image runs `./gradlew bootJar`, the runtime is `eclipse-temurin:21-jre` as a non-root user with `JAVA_TOOL_OPTIONS=-Xmx256m -XX:+UseSerialGC`. Compose healthcheck: `curl -fsS http://localhost:8080/actuator/health` (40 s start period).

## Configuration

| Setting | Env var | Default | Purpose |
|---|---|---|---|
| `ml.api.url` | `ML_API_URL` | `http://localhost:8000` | ml-api base URL (blank falls back to the default) |
| `server.port` | | `8080` | |
| `spring.cache.caffeine.spec` | | `maximumSize=500,expireAfterWrite=10m` | Applies to every cache |
| `spring.data.web.pageable.max-page-size` | | `200` | Upper bound for `size` |

Hard-coded in `AppConfig`: ml-api connect timeout 2 s, read timeout 5 s. Spring's relaxed binding lets any `application.yml` key be overridden by env var.

## Endpoints

Base path `/api/market`. JSON uses snake_case (`spring.jackson.property-naming-strategy: SNAKE_CASE`). Every filter below is an optional query parameter on the first five rows.

Filters: `min_bedrooms`, `max_bedrooms`, `min_price`, `max_price`, `min_school_rating`, `max_distance`, `min_year_built`, `max_year_built`.

| Method | Path | Purpose | Notes |
|---|---|---|---|
| GET | `/summary` | count, avg/median/min/max price, avg price per sq ft | Cached. Zeros when nothing matches |
| GET | `/segments?by=` | Averages per band | `by` is `BEDROOMS`, `SCHOOL_RATING`, `DISTANCE` or `DECADE`; else 400. Cached |
| GET | `/properties` | Page of properties `{items,total,page,size}` | `page` (0-based), `size` (max 200), `sort=price,desc` (snake_case or camelCase names); unknown sort property is 400 |
| GET | `/export.csv` | Filtered rows as CSV | `Content-Disposition: attachment` (`market-export.csv`) |
| GET | `/export.pdf` | Summary line plus table, A4 landscape | `market-report.pdf` |
| POST | `/what-if` | Price curve for one varied feature | Body below; cached; 400 on bad input or ml-api 400/422, 502 ml-api error, 503 unreachable |
| GET | `/actuator/health` | Health | Only `health` is exposed |

What-if body: `{"base": <7 features>, "feature": "square_footage", "from": 1000, "to": 2500, "steps": 25}`. `steps` is 2-50, `feature` must be one of the 7 names. The service builds one variant per step (integer features are rounded) and sends them to ml-api `/predict/batch` in one call. The response is `[{"value":..., "price":...}, ...]`.

Errors are Spring `ProblemDetail` (`application/problem+json`) with a `detail` string; see [ARCHITECTURE.md](ARCHITECTURE.md#errors).

## Tests

```bash
cd market-api && ./gradlew test        # or: mise exec -- ./gradlew test -q
```

| Test | Covers |
|---|---|
| `PropertyRepositoryTest` (`@DataJpaTest`) | CSV seed loads 50 rows; a Specification narrows results |
| `MarketControllerTest` (`@WebMvcTest`, services mocked) | summary happy path, bad `by` is 400, unknown what-if feature is 400 with `detail`, `steps` out of range is 400 |
| `MlClientTest` (`MockRestServiceServer`) | prices returned in order; 5xx becomes `UpstreamErrorException` |
| `MarketApplicationTests` (full context, MockMvc) | `/summary` over the real seed |

Not covered: exports, caching behaviour, the HTTP/1.1 client against a live uvicorn.

## Layout

```
market-api/
├── build.gradle.kts, settings.gradle.kts, gradle.properties
├── gradle/                # libs.versions.toml, wrapper
├── Dockerfile
└── src/
    ├── main/java/com/hpp/market/
    │   ├── MarketApplication.java
    │   ├── web/           # MarketController
    │   ├── service/       # MarketService, PropertyService, WhatIfService, ExportService, Segment
    │   ├── repository/    # PropertyRepository, PropertySpecifications
    │   ├── client/        # MlClient
    │   ├── domain/        # Property (JPA entity)
    │   ├── dto/           # records: HouseFeatures, MarketFilter, WhatIfRequest, ...
    │   ├── config/        # AppConfig, MlProperties, DataSeeder
    │   └── exception/     # ApiException hierarchy, ApiExceptionHandler
    ├── main/resources/    # application.yml, data/house_prices.csv
    └── test/java/...      # see Tests
```
