"""Request correlation (asgi-correlation-id) and one access-log line per request.

Kept identical in ml-api and estimator-api (no shared package between deployables).
"""

import logging
import re
import time
from uuid import uuid4

from asgi_correlation_id import CorrelationIdFilter, CorrelationIdMiddleware
from fastapi import FastAPI
from starlette.types import ASGIApp, Message, Receive, Scope, Send

HEADER = "X-Request-ID"
# Only this shape is accepted from clients; anything else is replaced. Stops log injection.
VALID_ID = re.compile(r"[A-Za-z0-9-]{1,64}")
# Compose probes these every 10-15 s; logging them would bury the real traffic.
QUIET_PATHS = frozenset({"/health"})
access_log = logging.getLogger("app.access")


class AccessLogMiddleware:
    """Pure ASGI. Runs inside the correlation middleware, so the id is on the log line."""

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope["path"] in QUIET_PATHS:
            await self.app(scope, receive, send)
            return
        started, status = time.perf_counter(), 500

        async def capture(message: Message) -> None:
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
            await send(message)

        try:
            await self.app(scope, receive, capture)
        finally:
            access_log.info("%s %s -> %d (%.1f ms)", scope["method"], scope["path"], status, (time.perf_counter() - started) * 1000)


def configure_logging() -> None:
    handler = logging.StreamHandler()
    handler.addFilter(CorrelationIdFilter(default_value="-"))
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s [req=%(correlation_id)s] %(name)s: %(message)s"))
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)
    # AccessLogMiddleware logs one line per request (with the id); uvicorn's own access line would duplicate it.
    logging.getLogger("uvicorn.access").disabled = True


def add_request_middleware(app: FastAPI) -> None:
    # add_middleware makes the last one added the outermost: correlation wraps the access log, so the log sees the id.
    app.add_middleware(AccessLogMiddleware)
    app.add_middleware(
        CorrelationIdMiddleware, header_name=HEADER, validator=VALID_ID.fullmatch, generator=lambda: str(uuid4())
    )
