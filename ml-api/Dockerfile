FROM python:3.14-slim
COPY --from=ghcr.io/astral-sh/uv:0.8 /uv /bin/uv
WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
ENV PATH="/app/.venv/bin:$PATH"

COPY app ./app

# The CSV is mounted at /data (see docker-compose.yml); the model trains at startup.
ENV DATA_PATH=/data/house_prices.csv
RUN useradd --system --uid 10001 app
USER app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]