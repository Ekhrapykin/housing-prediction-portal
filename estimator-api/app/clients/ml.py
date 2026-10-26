import httpx
from asgi_correlation_id import correlation_id
from fastapi import HTTPException

from app.core.logging import HEADER


def _trace_headers() -> dict[str, str]:
    """Forward the current request's id so ml-api logs the same one."""
    rid = correlation_id.get()
    return {HEADER: rid} if rid else {}


class MlClient:
    def __init__(self, http: httpx.Client, health_timeout: float):
        self._http = http
        self._health_timeout = health_timeout

    def predict(self, features: dict) -> dict:
        return self._request("POST", "/predict", json=features)

    def model_info(self) -> dict:
        return self._request("GET", "/model-info")

    def is_healthy(self) -> bool:
        try:
            return self._http.get("/health", headers=_trace_headers(), timeout=self._health_timeout).is_success
        except httpx.HTTPError:
            return False

    def _request(self, method: str, path: str, **kwargs) -> dict:
        try:
            r = self._http.request(method, path, headers=_trace_headers(), **kwargs)
        except httpx.HTTPError as e:
            raise HTTPException(503, "Prediction service is unavailable") from e
        if r.status_code == 422:
            raise HTTPException(422, r.json()["detail"])
        if r.is_error:
            raise HTTPException(502, "Prediction service returned an error")
        return r.json()
