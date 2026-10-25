"""X-Request-ID: read or generate per request, expose to logs, echo in the response.

Kept identical in ml-api and estimator-api (no shared package between deployables).
"""

import logging
import re
import time
import uuid
from contextvars import ContextVar

from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

HEADER = "X-Request-ID"
# Only this shape is accepted from clients; anything else is replaced. Stops log injection.
VALID_ID = re.compile(r"[A-Za-z0-9-]{1,64}")

request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)
access_log = logging.getLogger("app.access")
# Compose probes these every 10-15 s; logging them would bury the real traffic.
QUIET_PATHS = frozenset({"/health"})


def current_request_id() -> str | None:
    return request_id_var.get()


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get() or "-"
        return True


def configure_logging() -> None:
    handler = logging.StreamHandler()
    handler.addFilter(RequestIdFilter())
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s [req=%(request_id)s] %(name)s: %(message)s"))
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)
    # The middleware logs one line per request (with the id); uvicorn's own access line would duplicate it.
    logging.getLogger("uvicorn.access").disabled = True


class RequestIdMiddleware:
    """Pure ASGI, so the ContextVar set here is visible to sync routes (the threadpool copies the context)."""

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        incoming = Headers(scope=scope).get(HEADER)
        rid = incoming if incoming and VALID_ID.fullmatch(incoming) else str(uuid.uuid4())
        token = request_id_var.set(rid)
        started, status = time.perf_counter(), 500

        async def send_with_id(message: Message) -> None:
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
                MutableHeaders(scope=message)[HEADER] = rid
            await send(message)

        try:
            await self.app(scope, receive, send_with_id)
        finally:
            if scope["path"] not in QUIET_PATHS:
                access_log.info(
                    "%s %s -> %d (%.1f ms)", scope["method"], scope["path"], status, (time.perf_counter() - started) * 1000
                )
            request_id_var.reset(token)
