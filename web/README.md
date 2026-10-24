# web

The Next.js portal (App Router) that hosts both apps:
- **Estimator** (`/estimator`) talks to estimator-api.
- **Market** (`/market`) talks to market-api.

The browser only calls `/api/estimator/*` and `/api/market/*`. `next.config.ts` rewrites them to the backends. Server components call market-api directly through `lib/market-server.ts`.

```bash
cp .env.example .env.local   # backend URLs for local dev
npm install
npm run dev                  # http://localhost:3000
```

From the repo root, `mise run dev:web` and `mise run lint:web` do the same.
