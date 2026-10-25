import pandas as pd

from app.ml.features import FEATURES
from app.schemas import HouseFeatures, Prediction


class Predictor:
    def __init__(self, model, info: dict):
        self._model = model
        self.info = info
        self._stats = info["feature_stats"]

    def predict(self, houses: list[HouseFeatures]) -> list[Prediction]:
        df = pd.DataFrame([h.model_dump() for h in houses])[FEATURES]
        prices = self._model.predict(df)
        return [
            Prediction(price=round(float(p), 2), warnings=self._warnings(h))
            for h, p in zip(houses, prices)
        ]

    def _warnings(self, house: HouseFeatures) -> list[str]:
        warnings = []
        for name, value in house.model_dump().items():
            lo, hi = self._stats[name]["min"], self._stats[name]["max"]
            if not lo <= value <= hi:
                warnings.append(f"{name}={value} is outside the training range [{lo:g}, {hi:g}]")
        return warnings
