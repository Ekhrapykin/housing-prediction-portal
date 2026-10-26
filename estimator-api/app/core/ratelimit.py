"""Write rate limit (POST and DELETE /estimates share one budget per client).

Storage is slowapi's default, in-memory and per process: right for one replica. With several replicas each
would keep its own counters; use a shared store (Redis) then.
"""

import math
import socket
import time

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded

from app.core.config import get_settings

def write_limit() -> str:
    return get_settings().rate_limit_writes


def resolve_trusted_proxies(names: str) -> frozenset[str]:
    """Hostnames or IPs to IPs. A name that doesn't resolve (local dev, tests) is skipped."""
    ips: set[str] = set()
    for name in filter(None, (n.strip() for n in names.split(","))):
        try:
            ips.update(info[4][0] for info in socket.getaddrinfo(name, None))
        except socket.gaierror:
            pass
    return frozenset(ips)


def client_key(request: Request) -> str:
    """The client the budget belongs to.

    X-Forwarded-For is client-controlled, so it is believed only when the TCP peer is a trusted proxy (the
    portal). Even then only the right-most entry counts: Next doesn't append to an existing XFF, and the
    tunnel in front of it appends the real client IP last, so anything to its left may be forged. A client
    hitting the published :8001 directly is an untrusted peer and can't choose its own key.
    """
    peer = request.client.host if request.client else "unknown"
    xff = request.headers.get("x-forwarded-for")
    # Resolved per write request, not once at startup: if only the web container is recreated it gets a new
    # IP, and a stale set would silently put every portal user on one budget. Docker DNS makes this cheap.
    if xff and peer in resolve_trusted_proxies(get_settings().trusted_proxies):
        return xff.split(",")[-1].strip()
    return peer


limiter = Limiter(key_func=client_key)


async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    # Our own body: slowapi's default is {"error": ...}, not the {"detail": ...} contract.
    item, key_args = request.state.view_rate_limit  # set by slowapi when a limit is hit
    reset_at = limiter.limiter.get_window_stats(item, *key_args)[0]
    retry_after = max(1, math.ceil(reset_at - time.time()))
    return JSONResponse(
        status_code=429,
        content={"detail": f"Too many requests. Try again in {retry_after} second{'' if retry_after == 1 else 's'}."},
        headers={"Retry-After": str(retry_after)},
    )
