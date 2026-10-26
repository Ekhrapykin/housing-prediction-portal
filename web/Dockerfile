FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:26-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# next.config.ts rewrites are baked in at build time, so the backend URLs must be build args.
# next/font/google also downloads fonts here, so the build needs network access.
ARG ESTIMATOR_API_URL=http://estimator-api:8001
ARG MARKET_API_URL=http://market-api:8080
ENV ESTIMATOR_API_URL=$ESTIMATOR_API_URL MARKET_API_URL=$MARKET_API_URL \
    NEXT_TELEMETRY_DISABLED=1
# public/ is empty (untracked by git), so make sure it exists for the COPY below.
RUN mkdir -p public && npm run build

FROM node:26-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
# Same URLs again at runtime for the server-side fetches (lib/clients/server-transport.ts).
ARG ESTIMATOR_API_URL=http://estimator-api:8001
ARG MARKET_API_URL=http://market-api:8080
ENV ESTIMATOR_API_URL=$ESTIMATOR_API_URL MARKET_API_URL=$MARKET_API_URL
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
CMD ["node", "server.js"]
