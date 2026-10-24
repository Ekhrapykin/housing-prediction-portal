from fastapi import Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    status_code = 500
    detail = "Internal error"

    def __init__(self, detail=None):
        if detail is not None:
            self.detail = detail


class NotFoundError(AppError):
    status_code, detail = 404, "Not found"


class UpstreamUnavailable(AppError):
    status_code, detail = 503, "Prediction service is unavailable"


class UpstreamError(AppError):
    status_code, detail = 502, "Prediction service returned an error"


class UpstreamValidationError(AppError):
    status_code = 422


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
