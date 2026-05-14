from __future__ import annotations

import argparse

from common import PreprocessingError, ensure_parent, load_config, require_file, update_metadata


SCORE_COLUMNS = {
    "pediatric_clinic": "pediatric_score",
    "family_medicine": "family_medicine_score",
    "general_hospital": "general_hospital_score",
    "community_center": "community_center_score",
    "district_office": "district_office_score",
    "city_hall": "city_hall_score",
    "childcare_center": "childcare_center_score",
    "kindergarten": "kindergarten_score",
    "park": "park_score",
    "library_culture": "library_culture_score",
    "large_retail_optional": "large_retail_score",
}


def distance_adjusted_score(distance_series, max_score: float, full_score_distance_m: float):
    """DistanceAdjustedScore(W, D) = W × max(0, min(1, 2 − D / 800))."""
    import numpy as np

    factor = 2.0 - (distance_series / float(full_score_distance_m))
    factor = np.clip(factor, 0.0, 1.0)
    return float(max_score) * factor


def additive_capped_sum(frame, type_scores: dict[str, float], column_map: dict[str, str], cap: float):
    """Additive aggregation: min(cap, Σ facility_type_score).

    Missing/empty facility types contribute 0 instead of raising.
    """
    import numpy as np
    import pandas as pd

    used_types: list[str] = []
    total = pd.Series(np.zeros(len(frame)), index=frame.index)
    for facility_type, _max_score in type_scores.items():
        col = column_map.get(facility_type)
        if not col or col not in frame.columns:
            continue
        series = pd.to_numeric(frame[col], errors="coerce")
        if series.notna().sum() == 0:
            continue
        total = total + series.fillna(0)
        used_types.append(facility_type)
    return total.clip(lower=0, upper=float(cap)), used_types


def calculate_scores(config_path: str) -> None:
    config = load_config(config_path)
    grid_path = require_file(config["output_paths"]["grid_distances"], "거리 계산 중간 산출물")
    import geopandas as gpd
    import numpy as np

    grid = gpd.read_file(grid_path)

    scoring_cfg = config.get("scoring") or {}
    type_max_scores = scoring_cfg.get("type_max_scores") or config.get("distance_limits", {})
    full_score_distance = float(scoring_cfg.get("full_score_distance_m", 800))
    zero_score_distance = float(scoring_cfg.get("zero_score_distance_m", full_score_distance * 2))
    category_formulas = scoring_cfg.get("category_formulas") or {}
    category_cap_default = float(scoring_cfg.get("category_score_cap", 100))
    overall_weights = (scoring_cfg.get("grid_weights") or {}).copy()
    if not overall_weights:
        overall_weights = {
            "medical": config["category_weights"]["overall"]["medical_score"],
            "education": config["category_weights"]["overall"]["education_score"],
            "administration": config["category_weights"]["overall"]["admin_score"],
            "leisure": config["category_weights"]["overall"]["leisure_score"],
        }

    for facility_type, max_score in type_max_scores.items():
        dist_col = f"dist_{facility_type}"
        score_col = SCORE_COLUMNS[facility_type]
        if dist_col not in grid.columns:
            grid[score_col] = np.nan
            continue
        scored = distance_adjusted_score(grid[dist_col].astype(float), float(max_score), full_score_distance)
        scored = np.where(grid[dist_col].isna(), np.nan, scored)
        grid[score_col] = np.round(np.clip(scored, 0, 100), 3)

    medical_formula = category_formulas.get("medical", {"types": config["category_weights"]["medical"], "cap": 100})
    admin_formula = category_formulas.get("administration", {"types": config["category_weights"]["administration"], "cap": 100})
    education_formula = category_formulas.get("education", {"types": config["category_weights"]["education"], "cap": 100})
    leisure_formula = category_formulas.get("leisure", {"types": config["category_weights"]["leisure"], "cap": 100})

    grid["medical_score"], medical_types = additive_capped_sum(
        grid, medical_formula.get("types", {}), SCORE_COLUMNS, medical_formula.get("cap", category_cap_default)
    )
    grid["medical_score"] = grid["medical_score"].round(3)
    grid["admin_score"], admin_types = additive_capped_sum(
        grid, admin_formula.get("types", {}), SCORE_COLUMNS, admin_formula.get("cap", category_cap_default)
    )
    grid["admin_score"] = grid["admin_score"].round(3)
    grid["education_score"], education_types = additive_capped_sum(
        grid, education_formula.get("types", {}), SCORE_COLUMNS, education_formula.get("cap", category_cap_default)
    )
    grid["education_score"] = grid["education_score"].round(3)
    grid["leisure_score"], leisure_types = additive_capped_sum(
        grid, leisure_formula.get("types", {}), SCORE_COLUMNS, leisure_formula.get("cap", category_cap_default)
    )
    grid["leisure_score"] = grid["leisure_score"].round(3)

    has_family_medicine = "family_medicine" in medical_types
    has_large_retail = "large_retail_optional" in leisure_types
    applied_medical_formula = (
        "pediatric_family_general_hospital_additive"
        if has_family_medicine
        else "pediatric_general_hospital_additive"
    )
    applied_leisure_formula = (
        "park_other_leisure_with_large_retail_additive"
        if has_large_retail
        else "park_other_leisure_additive"
    )

    grid["grid_stroller_score"] = (
        grid["medical_score"] * float(overall_weights["medical"])
        + grid["education_score"] * float(overall_weights["education"])
        + grid["admin_score"] * float(overall_weights["administration"])
        + grid["leisure_score"] * float(overall_weights["leisure"])
    ).clip(0, 100).round(3)
    grid["stroller_score"] = grid["grid_stroller_score"]

    for required_col in ["medical_score", "admin_score", "education_score", "leisure_score", "grid_stroller_score"]:
        if required_col not in grid.columns or grid[required_col].isna().all():
            raise PreprocessingError(f"필수 점수 컬럼을 계산할 수 없습니다: {required_col}")

    score_cols = [col for col in grid.columns if col.endswith("_score") or col == "stroller_score"]
    invalid = {col: int(((grid[col] < 0) | (grid[col] > 100)).sum()) for col in score_cols if col in grid}
    invalid = {col: count for col, count in invalid.items() if count > 0}
    if invalid:
        raise PreprocessingError(f"0~100 범위를 벗어난 점수가 있습니다: {invalid}")

    output_path = ensure_parent(config["output_paths"]["grid_scores"])
    grid.to_file(output_path, driver="GeoJSON")

    method_summary = summarize_distance_methods(grid, list(type_max_scores.keys()))
    update_metadata(
        config,
        {
            "preprocessing_scripts": ["04_calculate_scores.py"],
            "scoring_method": scoring_cfg.get("scoring_method", "full_score_with_decay_after_800m"),
            "distance_score_method": scoring_cfg.get("distance_score_method", "full_score_with_decay_after_800m"),
            "full_score_distance_m": full_score_distance,
            "zero_score_distance_m": zero_score_distance,
            "type_max_scores": type_max_scores,
            "category_score_cap": category_cap_default,
            "category_formulas": category_formulas,
            "grid_score_weights": overall_weights,
            "facility_score_formula": scoring_cfg.get("facility_score_formula"),
            "facility_score_description": scoring_cfg.get("facility_score_description"),
            "category_aggregation": scoring_cfg.get("category_aggregation", "additive_capped_type_max_scores_v1"),
            "category_aggregation_description": scoring_cfg.get("category_aggregation_description"),
            "applied_medical_formula": applied_medical_formula,
            "applied_leisure_formula": applied_leisure_formula,
            "family_medicine_used": bool(has_family_medicine),
            "large_retail_used": bool(has_large_retail),
            "medical_facility_types_used": medical_types,
            "leisure_facility_types_used": leisure_types,
            "score_columns": score_cols,
            "score_null_summary": {col: int(grid[col].isna().sum()) for col in score_cols},
            "score_distance_method_summary": method_summary,
        },
    )
    print(
        f"[OK] grid_scores 생성: {output_path} / medical={applied_medical_formula} / leisure={applied_leisure_formula}"
    )


def summarize_distance_methods(grid, facility_types: list[str]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for facility_type in facility_types:
        col = f"dist_{facility_type}_method"
        if col not in grid.columns:
            continue
        for method, count in grid[col].fillna("unavailable").value_counts().to_dict().items():
            counts[str(method)] = counts.get(str(method), 0) + int(count)
    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description="거리 기반 시설 접근 점수와 유모차 생활보행 점수를 계산합니다.")
    parser.add_argument("--config", default="config/data_config.yaml")
    args = parser.parse_args()
    calculate_scores(args.config)


if __name__ == "__main__":
    main()
