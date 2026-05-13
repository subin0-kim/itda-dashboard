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


def weighted_sum(frame, weights: dict[str, float], column_map: dict[str, str]):
    values = []
    for facility_type, weight in weights.items():
        col = column_map[facility_type]
        if col not in frame.columns or frame[col].isna().all():
            raise PreprocessingError(f"카테고리 점수 계산에 필요한 점수 컬럼이 없습니다: {col}")
        values.append(frame[col].fillna(0) * weight)
    return sum(values)


def medical_score_has_family(grid) -> bool:
    col = SCORE_COLUMNS["family_medicine"]
    return col in grid.columns and not grid[col].isna().all()


def calculate_scores(config_path: str) -> None:
    config = load_config(config_path)
    grid_path = require_file(config["output_paths"]["grid_distances"], "거리 계산 중간 산출물")
    import geopandas as gpd
    import numpy as np

    grid = gpd.read_file(grid_path)

    for facility_type, limit in config["distance_limits"].items():
        dist_col = f"dist_{facility_type}"
        score_col = SCORE_COLUMNS[facility_type]
        if dist_col not in grid.columns:
            grid[score_col] = np.nan
            continue
        grid[score_col] = np.maximum(0, 100 * (1 - grid[dist_col] / float(limit)))
        grid.loc[grid[dist_col].isna(), score_col] = np.nan
        grid[score_col] = grid[score_col].clip(lower=0, upper=100).round(3)

    weights = config["category_weights"]
    has_family_medicine = medical_score_has_family(grid)
    medical_key = "medical_with_family_medicine" if has_family_medicine else "medical_without_family_medicine"
    applied_medical_formula = (
        "pediatric_family_general_hospital" if has_family_medicine else "pediatric_general_hospital_only"
    )
    grid["medical_score"] = weighted_sum(grid, weights[medical_key], SCORE_COLUMNS).clip(0, 100).round(3)
    grid["admin_score"] = weighted_sum(grid, weights["administration"], SCORE_COLUMNS).clip(0, 100).round(3)
    grid["education_score"] = weighted_sum(grid, weights["education"], SCORE_COLUMNS).clip(0, 100).round(3)

    has_large_retail = "large_retail_score" in grid.columns and not grid["large_retail_score"].isna().all()
    leisure_key = "leisure_with_large_retail" if has_large_retail else "leisure_without_large_retail"
    grid["leisure_score"] = weighted_sum(grid, weights[leisure_key], SCORE_COLUMNS).clip(0, 100).round(3)

    grid["grid_stroller_score"] = (
        grid["medical_score"] * weights["overall"]["medical_score"]
        + grid["education_score"] * weights["overall"]["education_score"]
        + grid["admin_score"] * weights["overall"]["admin_score"]
        + grid["leisure_score"] * weights["overall"]["leisure_score"]
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

    update_metadata(
        config,
        {
            "applied_leisure_formula": leisure_key,
            "applied_medical_formula": applied_medical_formula,
            "applied_medical_weights_key": medical_key,
            "family_medicine_used": bool(has_family_medicine),
            "preprocessing_scripts": ["04_calculate_scores.py"],
            "score_columns": score_cols,
            "score_null_summary": {col: int(grid[col].isna().sum()) for col in score_cols},
        },
    )
    print(
        f"[OK] grid_scores 생성: {output_path} / leisure_formula={leisure_key} / medical_formula={applied_medical_formula}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="거리 기반 시설 접근 점수와 유모차 생활보행 점수를 계산합니다.")
    parser.add_argument("--config", default="config/data_config.yaml")
    args = parser.parse_args()
    calculate_scores(args.config)


if __name__ == "__main__":
    main()
