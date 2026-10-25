# Contracts

The single source of truth for what is mirrored across services. No code generation: each service keeps its own native schema, and a **contract test in each service** compares it with the files here, so drift fails CI.

| File | Describes | Mirrored in |
|---|---|---|
| `house-features.schema.json` | The 7 house features: names, integer vs number, bounds, all required, no extra properties (JSON Schema 2020-12) | ml-api `HouseFeatures`, estimator-api `HouseFeatures`, market-api `HouseFeatures` record, web `houseSchema` (zod) |
| `market.json` | Segment keys, sortable property keys, filter parameter names and types, what-if `steps` bounds | market-api (`Segment`, `PropertyService` sort allow-list, `MarketFilter`, `WhatIfRequest`), web (`SEGMENT_KEYS`, `SORT_KEYS`, `filterParsers`, `WHAT_IF_STEPS`) |

## The rule

Each service mirrors the contract natively; a contract test enforces equality. To change a value: **change the contract first, then every mirror**, then run the tests.

| Service | Contract test |
|---|---|
| ml-api | `tests/test_contract.py` (`uv run pytest`) |
| estimator-api | `tests/test_contract.py` (`uv run pytest`) |
| market-api | `ContractTest` (`./gradlew test`; the contracts dir is passed in by `build.gradle.kts`) |
| web | `scripts/check-contracts.ts` (`npm run check:contracts`, part of `mise run lint:web` and the `test-web` CI job) |

Notes:

- Feature bounds stay in the native schemas; they are not read from here at runtime. Contracts are only used by tests, so no Docker image needs this directory.
- Python tests compare names, types, bounds and required fields; pydantic does not emit `additionalProperties: false` by default, so that keyword is not compared there.
- Web may narrow a filter from `number` to `integer` (the price inputs are whole dollars); it may not widen `integer` to `number`.

## Error contract

Every non-2xx response carries a JSON body with `detail`:

- `detail` is a **string** everywhere, except FastAPI validation errors (422), where it is a **list of `{loc, msg, type}`**.
- Python services (ml-api, estimator-api) answer validation failures with **422**; the Java service (market-api) answers with **400** (`ProblemDetail`, which has `detail`).
- market-api validation messages name fields by their snake_case JSON path (`base.square_footage`), like the Python services' `loc`.
- Clients must accept both shapes; the portal's `apiFetch` turns the list into a readable `field: message` string.

## Health endpoints

| Service | Endpoint |
|---|---|
| ml-api | `GET /health` |
| estimator-api | `GET /health` (also reports `ml_api: up/down`) |
| market-api | `GET /actuator/health` |
| web | `GET /` |
| postgres | `pg_isready` |
