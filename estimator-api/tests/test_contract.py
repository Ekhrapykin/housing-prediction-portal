"""The native pydantic schema must match contracts/house-features.schema.json (names, types, bounds, required)."""
import json
from pathlib import Path

from app.schemas import HouseFeatures

CONTRACT = Path(__file__).resolve().parents[2] / "contracts" / "house-features.schema.json"
KEEP = {"type", "minimum", "exclusiveMinimum", "maximum", "exclusiveMaximum"}


def normalise(schema: dict) -> dict:
    """Only what the contract speaks about; drops pydantic's titles, examples and defaults."""
    return {
        "required": sorted(schema.get("required", [])),
        "properties": {n: {k: v for k, v in p.items() if k in KEEP} for n, p in schema["properties"].items()},
    }


def test_house_features_match_contract():
    actual = normalise(HouseFeatures.model_json_schema())
    expected = normalise(json.loads(CONTRACT.read_text()))
    assert actual["required"] == expected["required"], "required fields differ from the contract"
    assert sorted(actual["properties"]) == sorted(expected["properties"]), "feature names differ from the contract"
    for name, spec in expected["properties"].items():
        assert actual["properties"][name] == spec, f"{name}: model has {actual['properties'][name]}, contract has {spec}"
