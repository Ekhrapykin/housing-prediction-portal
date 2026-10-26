FROM python:3.14-slim
COPY --from=ghcr.io/astral-sh/uv:0.8 /uv /bin/uv
WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
ENV PATH="/app/.venv/bin:$PATH"

COPY app ./app
RUN useradd --system --uid 10001 app
USER app

# Listen port; override with PORT. EXPOSE is documentation only, so it keeps the default.
ENV PORT=8001
EXPOSE 8001
# sh -c + exec: expands $PORT, and uvicorn still ends up as PID 1.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
