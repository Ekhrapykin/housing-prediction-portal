from pydantic import BaseModel, ConfigDict, Field

EXAMPLE = {
    "square_footage": 1550, "bedrooms": 3, "bathrooms": 2, "year_built": 1997,
    "lot_size": 6800, "distance_to_city_center": 4.1, "school_rating": 7.6,
}


class HouseFeatures(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [EXAMPLE]})

    square_footage: float = Field(gt=0, le=20_000)
    bedrooms: int = Field(ge=0, le=20)
    bathrooms: float = Field(ge=0, le=20)
    year_built: int = Field(ge=1800, le=2100)
    lot_size: float = Field(gt=0, le=1_000_000)
    distance_to_city_center: float = Field(ge=0, le=500)
    school_rating: float = Field(ge=0, le=10)


class Prediction(BaseModel):
    price: float
    warnings: list[str]


class BatchPrediction(BaseModel):
    predictions: list[Prediction]
