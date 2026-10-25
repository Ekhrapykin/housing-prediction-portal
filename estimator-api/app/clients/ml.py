import httpx

from app.errors import UpstreamError, UpstreamUnavailable, UpstreamValidationError


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
            return self._http.get("/health", timeout=self._health_timeout).is_success
        except httpx.HTTPError:
            return False

    def _request(self, method: str, path: str, **kwargs) -> dict:
        try:
            r = self._http.request(method, path, **kwargs)
        except httpx.HTTPError as e:
            raise UpstreamUnavailable() from e
        if r.status_code == 422:
            raise UpstreamValidationError(r.json()["detail"])
        if r.is_error:
            raise UpstreamError()
        return r.json()
