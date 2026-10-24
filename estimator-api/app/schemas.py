from pydantic import BaseModel, Field


class HouseFeatures(BaseModel):
    # ponytail: duplicated from ml-api on purpose; extract a shared package if a third consumer appears
    square_footage: float = Field(gt=0, le=20_000)
    bedrooms: int = Field(ge=0, le=20)
    bathrooms: float = Field(ge=0, le=20)
    year_built: int = Field(ge=1800, le=2100)
    lot_size: float = Field(gt=0, le=1_000_000)
    distance_to_city_center: float = Field(ge=0, le=500)
    school_rating: float = Field(ge=0, le=10)


class EstimateRequest(HouseFeatures):
    label: str | None = Field(default=None, max_length=80)


class Estimate(BaseModel):
    id: int
    label: str | None
    features: HouseFeatures
    price: float
    warnings: list[str]
    created_at: str
