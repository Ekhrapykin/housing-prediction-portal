# Contracts

The single source of truth for the schemas that are mirrored across services. No code generation: each service keeps its own native schema, and a **contract test in each service** compares it with the files here, so drift fails CI.

## Files

| File | Describes | Mirrored in |
|---|---|---|
| `house-features.schema.json` | The 7 house features: names, integer vs number, bounds, all required, no extra properties (JSON Schema 2020-12) | ml-api `HouseFeatures`, estimator-api `HouseFeatures`, market-api `HouseFeatures` record, web `houseSchema` (zod) |
| `market.json` | Segment keys, sortable property keys, filter parameter names and types, what-if `steps` bounds | market-api (`Segment`, `PropertyService` sort allow-list, `MarketFilter`, `WhatIfRequest`), web (`SEGMENT_KEYS`, `SORT_KEYS`, `filterParsers` in `lib/data/search-params.ts`; `WHAT_IF_STEPS`) |

## Rule

Each service mirrors the contract natively; a contract test enforces equality. To change a value: **change the contract first, then every mirror**, then run the tests.

- Feature bounds stay in the native schemas; they are not read from here at runtime. Contracts are only used by tests, so no Docker image needs this directory.
- Python tests compare names, types, bounds and required fields; pydantic does not emit `additionalProperties: false` by default, so that keyword is not compared there.
- Web may narrow a filter from `number` to `integer` (the price inputs are whole dollars); it may not widen `integer` to `number`.

## Contract tests

| Service | Contract test |
|---|---|
| ml-api | `tests/test_contract.py` (`uv run pytest`) |
| estimator-api | `tests/test_contract.py` (`uv run pytest`) |
| market-api | `ContractTest` (`./gradlew test`; the contracts dir is passed in by `build.gradle.kts`) |
| web | `web/test/lib/contracts.test.ts` (vitest; runs in `npm test`, part of `mise run lint:web` and the `test-web` CI job) |

## Further reading

The cross-service behaviour contracts are in the root [ARCHITECTURE.md](../ARCHITECTURE.md#cross-cutting-contracts): [errors](../ARCHITECTURE.md#errors), [request id](../ARCHITECTURE.md#request-correlation), [rate limiting](../ARCHITECTURE.md#rate-limiting) and [health endpoints](../ARCHITECTURE.md#health-endpoints). See also the [7-feature schema rationale](../ARCHITECTURE.md#the-7-feature-schema-mirrored-four-times-pinned-by-contracts) and the root [README](../README.md).
