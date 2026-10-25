# web

The Next.js portal that hosts both Task 2 apps under one shell:

- **Price Estimator** (`/estimator`, `/estimator/history`, `/estimator/compare`) is backed by [estimator-api](../estimator-api/README.md).
- **Market Explorer** (`/market`, `/market/properties`, `/market/what-if`) is backed by [market-api](../market-api/README.md).

The browser only talks to this app. Client code calls `/api/estimator/*` and `/api/market/*`, which `next.config.ts` rewrites to the backends. Server components call the backends directly through `lib/data/server.ts`.

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
cp .env.example .env.local   # points at localhost:8001 / localhost:8080
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
| `ESTIMATOR_API_URL` | `http://estimator-api:8001` | `http://localhost:8001` | build (rewrites) and runtime (`lib/data/server.ts`) |
| `MARKET_API_URL` | `http://market-api:8080` | `http://localhost:8080` | build (rewrites) and runtime (`lib/data/server.ts`) |

The defaults are the compose service names, so a local `npm run dev` without `.env.local` will not reach the backends.

## Routes

| Route | Rendering | Backend calls |
|---|---|---|
| `/` | static | none |
| `/estimator` | RSC prefetch of model info, client form | `GET /model-info`, `POST /estimates` |
| `/estimator/history` | RSC prefetch, client table (select 2-4, delete) | `GET /estimates`, `DELETE /estimates/{id}` |
| `/estimator/compare?ids=1,2` | RSC prefetch (2-4 ids), client view | `GET /estimates?ids=` |
| `/market?min_bedrooms=…&by=…` | server-rendered dashboard streamed in `Suspense` | `GET /summary`, `/segments`, `/properties?size=100` |
| `/market/properties?page=&sort=` | server-rendered, 15 per page | `GET /properties` |
| `/market/what-if` | RSC prefetch of model info, client tool | `POST /what-if` (debounced 300 ms) |

Proxied paths: `/api/estimator/:path*` to `${ESTIMATOR_API_URL}/:path*`, and `/api/market/:path*` to `${MARKET_API_URL}/api/market/:path*`. The CSV and PDF export links use the latter directly.

## Checks

There are no unit or e2e tests in `web/`. Quality gates are lint, typecheck and a production build, the same as CI:

```bash
npm run lint          # eslint .
npx tsc --noEmit
npm run build         # needs network for fonts
```

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
├── hooks/                  # use-estimates, use-model-info, use-what-if, use-market-filters, use-debounce (what-if)
├── lib/
│   ├── data/               # endpoints.ts, queries.ts, server.ts, query-client.ts
│   ├── api.ts              # browser apiFetch (10 s timeout, cancellation) + ApiError
│   ├── house-schema.ts     # zod schema, field metadata, bounds
│   ├── types.ts, format.ts, utils.ts
├── next.config.ts          # rewrites, standalone output
└── Dockerfile
```
