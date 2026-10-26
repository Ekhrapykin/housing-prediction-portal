# web

The Next.js portal that hosts both Task 2 apps under one shell:

- **Price Estimator** (`/estimator`, `/estimator/history`, `/estimator/compare`) is backed by [estimator-api](../estimator-api/README.md).
- **Market Explorer** (`/market`, `/market/properties`, `/market/what-if`) is backed by [market-api](../market-api/README.md).

The browser only talks to this app. Client code calls `/api/estimator/*` and `/api/market/*`, which `next.config.ts` rewrites to the backends. Server components call the backends directly through `lib/clients/server.ts` (the same clients over the server transport).

Internals: [ARCHITECTURE.md](ARCHITECTURE.md). System context: [../README.md](../README.md).

## Stack

| Piece | Version |
|---|---|
| Node | 26 (`mise.toml`, `node:26-alpine` images) |
| Next.js | 16.4.3, App Router, `output: "standalone"`, Turbopack |
| React | 19.3.0 |
| Data | TanStack Query ^5.104, TanStack Table ^9.3 |
| Forms | react-hook-form ^7.91, zod ^4.6, @hookform/resolvers |
| UI | Tailwind CSS 4, shadcn (on `@base-ui/react`), lucide-react, sonner, Recharts ^3.10 |
| Lint | ESLint 9 with `eslint-config-next` 16.4.3, TypeScript 5 |

## Run locally

Start the backends first (see the root [README](../README.md#local-development)).

```bash
# with mise (repo root)
mise run dev:web          # http://localhost:3000
mise run lint:web         # eslint + tsc --noEmit

# plain
cd web
cp .env.example .env.local   # optional: `next dev` already defaults to localhost:8001 / localhost:8080
npm install
npm run dev
```

## Run in Docker

```bash
docker build -t hpp-web \
  --build-arg ESTIMATOR_API_URL=http://estimator-api:8001 \
  --build-arg MARKET_API_URL=http://market-api:8080 web
```

The backend URLs are build args because rewrites are fixed at `next build`; the same values are set again as runtime env for the server-side fetches. The build needs network access (`next/font/google` downloads Geist). The runtime image runs `node server.js` as a non-root user on port 3000.

## Configuration

| Env var | Default (code) | `.env.example` | Read at |
|---|---|---|---|
| `ESTIMATOR_API_URL` | `http://estimator-api:8001` | `http://localhost:8001` | build (rewrites) and runtime (`lib/clients/server-transport.ts`) |
| `MARKET_API_URL` | `http://market-api:8080` | `http://localhost:8080` | build (rewrites) and runtime (`lib/clients/server-transport.ts`) |

Request ids: server-side estimator reads send a fresh `crypto.randomUUID()` as `X-Request-ID`; the browser transport stores the id of an error response on `ApiError.requestId` and `errorMessage()` appends ` · ref <first 8 chars>` to toasts. No configuration.

The defaults live in `lib/backends.ts`, imported by both `next.config.ts` and `lib/clients/server-transport.ts`. In production (and so in the Docker build) they are the compose service names; when `NODE_ENV` is `development` (`npm run dev`) they are `http://localhost:8001` and `http://localhost:8080`, so the portal works without `.env.local`.

## Routes

| Route | Rendering | Backend calls |
|---|---|---|
| `/` | static | none |
| `/estimator` | RSC prefetch of model info, client form | `GET /model-info`, `POST /estimates` |
| `/estimator/history` | RSC prefetch, client table (select 2-4, delete) | `GET /estimates`, `DELETE /estimates/{id}` |
| `/estimator/compare?ids=1,2` | RSC prefetch (2-4 ids), client view | `GET /estimates?ids=` |
| `/market?min_bedrooms=…&by=…` | server-rendered dashboard streamed in `Suspense` | `GET /summary`, `/segments`, `/properties?size=100` |
| `/market/properties?page=&sort=` | server-rendered, 15 per page | `GET /properties` |
| `/market/what-if` | RSC prefetch of model info, client tool | `POST /what-if` (debounced, `WHAT_IF_DEBOUNCE_MS`) |

Proxied paths (an allow-list built from `lib/clients/estimator-paths.ts` and `market-paths.ts`): `/api/estimator/{estimates,estimates/:id,model-info}` to `${ESTIMATOR_API_URL}/...`, and `/api/market/{summary,segments,properties,what-if,export.csv,export.pdf}` to `${MARKET_API_URL}/api/market/...`. The CSV and PDF export links use the latter directly. Anything else, such as the backends' `/docs` and `/openapi.json`, is a 404 through the portal.

Every response carries `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'` (frame-ancestors only, no full CSP) and a `Permissions-Policy` disabling camera, microphone and geolocation (`headers()` in `next.config.ts`). `X-Powered-By` is off. The tab icon is `app/icon.svg`, a house glyph in the primary colour.

## Checks

Quality gates are lint, typecheck, unit tests (which include the contract check) and a production build, the same as CI:

```bash
npm run lint          # eslint .
npx tsc --noEmit
npm test              # vitest (node): clients/transports, search params, format, house schema, contracts vs ../contracts
npm run build         # needs network for fonts
```

### E2E (Playwright)

Browser checks of the market filters, properties, what-if and estimator pages. They are not in CI; they run against an already-running stack:

```bash
docker compose up -d --build     # from the repo root; wait until all 5 services are healthy
npm run e2e                      # or: mise run e2e
```

- `E2E_BASE_URL` sets the target (default `http://localhost:3000`).
- The browser is the locally installed Google Chrome (`channel: "chrome"`), so nothing is downloaded. `E2E_BROWSER=chromium` uses Playwright's bundled Chromium instead (`npx playwright install chromium` first).
- Estimator writes are rate-limited to 20 per minute per client IP. The suite makes one write per run, so it can be re-run freely; if the limiter was exhausted by something else, a fresh `docker compose up` or a one-minute wait resets it.
- Reports and traces go to `playwright-report/` and `test-results/` (git-ignored).

## Layout

```
web/
├── app/                    # routes: layout, providers, template, error/loading/not-found
│   ├── estimator/          # page, history/, compare/, layout (sub-nav), error, loading
│   └── market/             # page, properties/, what-if/, layout, error, loading
├── components/
│   ├── estimator/          # estimate-form, estimate-result, contribution-chart, history-table, compare-view
│   ├── market/             # dashboard, filters, segment-chart, price-scatter, properties-table, what-if-*, export-buttons
│   ├── ui/                 # shadcn primitives
│   └── *.tsx               # nav, sub-nav, house-fields, error-state, route-error, skeletons
├── hooks/                  # use-estimates, use-what-if, use-market-filters, use-debounce (what-if)
├── lib/
│   ├── clients/            # estimator.ts, market.ts (per-backend clients), *-paths.ts, transport.ts (browser), server-transport.ts, browser.ts, server.ts, errors.ts
│   ├── data/               # query-client.ts, search-params.ts
│   ├── config.ts           # timings and tuning: stale times, revalidate, debounces, request timeout, what-if steps
│   ├── house-schema.ts     # zod schema, field metadata, bounds
│   ├── types.ts, format.ts, utils.ts
├── e2e/                        # Playwright specs (npm run e2e), fixtures.ts
├── playwright.config.ts
├── vitest.config.mts           # npm test; specs sit next to the code (lib/**/*.test.ts), e2e/ excluded
├── next.config.ts          # rewrites, standalone output
└── Dockerfile
```
