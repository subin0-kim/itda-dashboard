from __future__ import annotations

import argparse

from common import PreprocessingError, load_config, require_file, resolve_path, update_metadata, write_json


CATEGORY_COLUMNS = {
    "medical": "medical_score",
    "administration": "admin_score",
    "education": "education_score",
    "leisure": "leisure_score",
}


def aggregate_district_scores(config_path: str) -> None:
    config = load_config(config_path)
    grid_path = require_file(config["output_paths"]["grid_scores"], "격자 점수 중간 산출물")
    import geopandas as gpd
    import pandas as pd

    grid = gpd.read_file(grid_path)

    required_cols = ["district_code", "district_name", "stroller_score", *CATEGORY_COLUMNS.values()]
    missing = [col for col in required_cols if col not in grid.columns]
    if missing:
        raise PreprocessingError(f"grid_scores에 필요한 컬럼이 없습니다: {missing}")
    if grid.empty:
        raise PreprocessingError("grid_scores가 비어 있습니다. 임의 구별 점수는 생성하지 않습니다.")

    has_family_medicine = "family_medicine_score" in grid.columns and not grid["family_medicine_score"].isna().all()

    living_weight_series = _load_living_weight(config, grid)
    living_weight_status = "unavailable"
    aggregation_method = "simple_average"
    living_weighted_flag = False
    if living_weight_series is not None:
        valid_weights = living_weight_series.fillna(0)
        if (valid_weights > 0).any():
            grid = grid.copy()
            grid["__living_weight"] = valid_weights.to_numpy()
            living_weight_status = "applied"
            aggregation_method = "living_weighted_average"
            living_weighted_flag = True

    score_columns = ["stroller_score", "medical_score", "admin_score", "education_score", "leisure_score"]
    if has_family_medicine:
        score_columns.append("family_medicine_score")

    rows_records = []
    for (district_code, district_name), group in grid.groupby(["district_code", "district_name"], dropna=False):
        grid_count = int(len(group))
        stroller = group["stroller_score"]
        calculable_count = int(stroller.notna().sum())
        if living_weighted_flag:
            weights_full = group["__living_weight"].astype(float)
            weights = weights_full.where(stroller.notna(), 0.0)
            weight_sum = float(weights.sum())
            effective_grid_count = int((weights > 0).sum())
            low_or_zero_grid_count = int((weights <= 0).sum())
            living_weight_coverage = round(float((weights_full > 0).sum()) / grid_count, 6) if grid_count else 0.0
            if weight_sum <= 0:
                summary = {col: _safe_mean(group[col]) for col in score_columns}
            else:
                summary = {col: _weighted_mean(group[col], weights, weight_sum) for col in score_columns}
        else:
            weight_sum = float(calculable_count)
            effective_grid_count = calculable_count
            low_or_zero_grid_count = 0
            living_weight_coverage = None
            summary = {col: _safe_mean(group[col]) for col in score_columns}

        category_values = {key: float(summary[col]) if summary[col] is not None else 0.0 for key, col in CATEGORY_COLUMNS.items()}
        weakest = min(category_values, key=category_values.get)
        strongest = max(category_values, key=category_values.get)

        rows_records.append(
            {
                "district_code": str(district_code),
                "district_name": str(district_name),
                "overall_score": _round_or_none(summary["stroller_score"]),
                "medical_score": _round_or_none(summary["medical_score"]),
                "admin_score": _round_or_none(summary["admin_score"]),
                "education_score": _round_or_none(summary["education_score"]),
                "leisure_score": _round_or_none(summary["leisure_score"]),
                "family_medicine_score": _round_or_none(summary["family_medicine_score"]) if has_family_medicine else None,
                "weakest_category": weakest,
                "strongest_category": strongest,
                "grid_count": grid_count,
                "calculable_grid_count": calculable_count,
                "effective_grid_count": effective_grid_count,
                "low_or_zero_weight_grid_count": low_or_zero_grid_count,
                "living_weight_coverage": living_weight_coverage,
                "aggregation_method": aggregation_method,
                "living_weighted": living_weighted_flag,
                "null_score_ratio": round(1 - calculable_count / grid_count, 6) if grid_count else None,
            }
        )

    rows_df = pd.DataFrame(rows_records).sort_values("overall_score", ascending=False, na_position="last").reset_index(drop=True)
    rows_df["rank"] = rows_df["overall_score"].rank(method="min", ascending=False).astype("Int64")
    rows = []
    for _, row in rows_df.iterrows():
        record = row.to_dict()
        record["rank"] = int(record["rank"]) if pd.notna(record["rank"]) else None
        rows.append(record)

    output_path = config["output_paths"]["district_scores"]
    write_json(output_path, rows)

    category_summary = {}
    for category, col in CATEGORY_COLUMNS.items():
        category_summary[category] = sorted(
            [
                {
                    "district_code": item["district_code"],
                    "district_name": item["district_name"],
                    "score": item[col],
                    "rank": None,
                }
                for item in rows
            ],
            key=lambda item: (item["score"] if item["score"] is not None else -1),
            reverse=True,
        )
    for items in category_summary.values():
        for index, item in enumerate(items, start=1):
            item["rank"] = index
    write_json(config["output_paths"]["category_summary"], category_summary)

    metadata_updates = {
        "preprocessing_scripts": ["06_aggregate_district_scores.py"],
        "district_count": len(rows),
        "aggregation_method": aggregation_method,
        "district_score_aggregation": (
            "living_weighted_mean_of_grid_scores" if living_weighted_flag else "simple_mean_of_grid_scores"
        ),
        "living_weight_status": living_weight_status,
    }
    update_metadata(config, metadata_updates)
    print(
        f"[OK] district_scores 생성: {output_path} ({len(rows)} districts) / aggregation={aggregation_method}"
    )


def _load_living_weight(config, grid):
    path = config["output_paths"].get("grid_living_weight")
    if not path:
        return None
    resolved = resolve_path(path)
    if not resolved.exists():
        return None
    import geopandas as gpd
    import pandas as pd

    try:
        lw = gpd.read_file(resolved)
    except Exception as exc:  # noqa: BLE001
        print(f"[warn] grid_living_weight 로딩 실패: {exc}")
        return None
    if "grid_id" not in lw.columns or "living_weight" not in lw.columns:
        return None
    lw_series = pd.to_numeric(lw.set_index("grid_id")["living_weight"], errors="coerce")
    aligned = lw_series.reindex(grid["grid_id"])
    if aligned.notna().sum() == 0:
        return None
    return aligned.reset_index(drop=True)


def _weighted_mean(values, weights, weight_sum):
    import pandas as pd

    numeric_values = pd.to_numeric(values, errors="coerce").fillna(0)
    return float((numeric_values * weights).sum() / weight_sum)


def _safe_mean(values):
    import pandas as pd

    numeric_values = pd.to_numeric(values, errors="coerce")
    if numeric_values.notna().sum() == 0:
        return None
    return float(numeric_values.mean())


def _round_or_none(value):
    if value is None:
        return None
    return round(float(value), 3)


def main() -> None:
    parser = argparse.ArgumentParser(description="격자 점수를 자치구별 점수와 순위로 집계합니다.")
    parser.add_argument("--config", default="config/data_config.yaml")
    args = parser.parse_args()
    aggregate_district_scores(args.config)


if __name__ == "__main__":
    main()
