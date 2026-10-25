from fastapi import APIRouter

router = APIRouter(tags=["ops"])


@router.get("/health")
def health():
    return {"status": "ok"}
