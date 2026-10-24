import json
from datetime import UTC, datetime

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import RidgeCV
from sklearn.metrics import mean_absolute_error, r2_score, root_mean_squared_error
from sklearn.model_selection import KFold, cross_validate
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from app.config import get_settings
from app.ml.features import FEATURES, TARGET


def main() -> None:
    settings = get_settings()
    artifacts = settings.artifacts_dir
    df = pd.read_csv(settings.data_path, encoding="utf-8-sig")
    X, y = df[FEATURES], df[TARGET]

    pipe = make_pipeline(StandardScaler(), RidgeCV(alphas=np.logspace(-3, 3, 25)))

    cv = cross_validate(
        pipe, X, y,
        cv=KFold(n_splits=5, shuffle=True, random_state=42),
        scoring={"r2": "r2", "rmse": "neg_root_mean_squared_error", "mae": "neg_mean_absolute_error"},
    )
    pipe.fit(X, y)
    y_pred = pipe.predict(X)

    scaler, ridge = pipe[0], pipe[-1]
    raw_coef = ridge.coef_ / scaler.scale_
    raw_intercept = ridge.intercept_ - float((raw_coef * scaler.mean_).sum())

    info = {
        "model_type": "Ridge regression (StandardScaler + RidgeCV)",
        "alpha": float(ridge.alpha_),
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

    artifacts.mkdir(exist_ok=True)
    joblib.dump(pipe, artifacts / "model.joblib")
    (artifacts / "model_info.json").write_text(json.dumps(info, indent=2))
    print(json.dumps(info["metrics"], indent=2))


if __name__ == "__main__":
    main()