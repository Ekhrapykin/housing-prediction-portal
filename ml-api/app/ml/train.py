from datetime import UTC, datetime
from pathlib import Path

import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, r2_score, root_mean_squared_error
from sklearn.model_selection import KFold, cross_validate
from sklearn.pipeline import Pipeline, make_pipeline
from sklearn.preprocessing import StandardScaler

from app.schemas import HouseFeatures


FEATURES = list(HouseFeatures.model_fields)
TARGET = "price"

# Fixed modelling decisions (alpha is config: Settings.model_alpha). See the Ridge decision in ARCHITECTURE.md.
CV_FOLDS = 5  # 50 rows: 5 folds leave 10 rows per test fold
CV_RANDOM_STATE = 42  # fixed so training (and the model card) is deterministic


def train(data_path: Path, alpha: float) -> tuple[Pipeline, dict]:
    """Fit the model on the CSV; returns the pipeline and its model card. Deterministic (fixed CV seed)."""
    df = pd.read_csv(data_path, encoding="utf-8-sig")
    X, y = df[FEATURES], df[TARGET]

    pipe = make_pipeline(StandardScaler(), Ridge(alpha=alpha))

    cv = cross_validate(
        pipe, X, y,
        cv=KFold(n_splits=CV_FOLDS, shuffle=True, random_state=CV_RANDOM_STATE),
        scoring={"r2": "r2", "rmse": "neg_root_mean_squared_error", "mae": "neg_mean_absolute_error"},
    )
    pipe.fit(X, y)
    y_pred = pipe.predict(X)

    scaler, ridge = pipe[0], pipe[-1]
    raw_coef = ridge.coef_ / scaler.scale_
    raw_intercept = ridge.intercept_ - float((raw_coef * scaler.mean_).sum())

    info = {
        "model_type": "Ridge regression (StandardScaler + Ridge)",
        "alpha": float(ridge.alpha),
        "intercept": raw_intercept,
        "coefficients": dict(zip(FEATURES, raw_coef.round(4).tolist())),
        "standardized_coefficients": dict(zip(FEATURES, ridge.coef_.round(2).tolist())),
        "metrics": {
            "cv_5fold": {
                "r2": float(cv["test_r2"].mean()),
                "rmse": float(-cv["test_rmse"].mean()),
                "mae": float(-cv["test_mae"].mean()),
            },
            "train": {
                "r2": float(r2_score(y, y_pred)),
                "rmse": float(root_mean_squared_error(y, y_pred)),
                "mae": float(mean_absolute_error(y, y_pred)),
            },
        },
        "feature_stats": {
            f: {"min": float(X[f].min()), "max": float(X[f].max()), "mean": float(X[f].mean())}
            for f in FEATURES
        },
        "n_samples": len(df),
        "trained_at": datetime.now(UTC).isoformat(),
    }

    return pipe, info
