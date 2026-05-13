"""Compute LivingWeight per 250m grid using available land-use polygon data.

Origin/destination role:
- Parks remain leisure destinations (kept in facilities.geojson and leisure scoring).
- Park / green / river / forest / mountain interior grids are downweighted as
  starting points for stroller accessibility aggregation.

If no land-use polygon data is configured or present under data/raw/land_use/,
this script records ``living_weight_status = "unavailable"`` in metadata and
leaves all grid ``living_weight`` values as null. Downstream aggregation then
falls back to simple mean. Never generates synthetic land-use polygons.
"""

from __future__ import annotations

import argparse

from common import (
    PreprocessingError,
    ensure_parent,
    load_config,
    require_file,
    resolve_path,
    update_metadata,
)


LAND_USE_ROLES = ["zoning", "parks", "rivers", "forest_mountain"]
LIVING_WEIGHT_METHOD_APPLIED = "urban_living_area_ratio_v1"
LIVING_WEIGHT_METHOD_UNAVAILABLE = "no_land_use_data_simple_average_fallback"


def calculate_living_weight(config_path: str) -> None:
    config = load_config(config_path)
    paths = config["output_paths"]
    analysis_crs = config["coordinate_systems"]["analysis"]
    web_crs = config["coordinate_systems"]["web"]

    grid_scores_path = require_file(paths["grid_scores"], "격자 점수 산출물")
    output_path = ensure_parent(paths["grid_living_weight"])

    import geopandas as gpd
    import numpy as np

    grid = gpd.read_file(grid_scores_path)
    if grid.empty:
        raise PreprocessingError("grid_scores가 비어 있어 living_weight를 계산할 수 없습니다.")

    grid_analysis = grid.to_crs(analysis_crs) if grid.crs and str(grid.crs).upper() != analysis_crs.upper() else grid.copy()
    grid_analysis["grid_area"] = grid_analysis.geometry.area

    land_use_cfg = config.get("land_use") or {}
    living_cfg = config.get("living_weight") or {}
    weights_cfg = (living_cfg.get("weights") or {})
    included_keywords = list(living_cfg.get("included_zoning_keywords") or [])
    excluded_keywords = list(living_cfg.get("low_or_zero_weight_keywords") or [])

    loaded_sources: dict[str, dict] = {}
    skipped_sources: list[str] = []
    source_datasets: list[dict] = []

    for role in LAND_USE_ROLES:
        src = land_use_cfg.get(role) if isinstance(land_use_cfg, dict) else None
        if not isinstance(src, dict):
            continue
        raw_path = src.get("path")
        if not raw_path:
            continue
        resolved = resolve_path(raw_path)
        if not resolved.exists():
            skipped_sources.append(role)
            continue
        try:
            gdf = gpd.read_file(resolved)
            if gdf.empty:
                skipped_sources.append(role)
                continue
            if gdf.crs is None:
                gdf = gdf.set_crs(src.get("source_crs", config["coordinate_systems"]["source_default"]))
            gdf = gdf.to_crs(analysis_crs)
            loaded_sources[role] = {"gdf": gdf, "config": src}
            source_datasets.append(
                {
                    "name": src.get("source_name", role),
                    "provider": src.get("source_provider"),
                    "raw_file": str(raw_path),
                    "source_url": src.get("source_url"),
                    "role": role,
                    "used": True,
                }
            )
        except Exception as exc:  # noqa: BLE001 - log and skip optional source
            print(f"[warn] {role} land-use 데이터를 읽지 못해 제외합니다: {exc}")
            skipped_sources.append(role)

    # Initialize all extension columns as null so downstream consumers see a stable schema.
    extension_columns = [
        "living_weight",
        "urban_living_area",
        "residential_area_ratio",
        "commercial_area_ratio",
        "industrial_area_ratio",
        "green_area_ratio",
        "park_area_ratio",
        "river_area_ratio",
        "forest_mountain_area_ratio",
        "unknown_area_ratio",
    ]
    for col in extension_columns:
        grid_analysis[col] = None
    grid_analysis["living_weight_method"] = LIVING_WEIGHT_METHOD_UNAVAILABLE

    metadata_updates: dict = {
        "preprocessing_scripts": ["05_calculate_living_weight.py"],
        "origin_destination_role_note": (
            "공원은 여가 카테고리의 도착지로 계속 사용합니다. 공원 내부 격자는 생활 출발지로 보기 어려워 "
            "구별 평균 산정 시 LivingWeight를 낮게 적용하거나 제외합니다."
        ),
    }

    if not loaded_sources:
        metadata_updates.update(
            {
                "aggregation_method": "simple_average",
                "living_weight_status": "unavailable",
                "living_weight_method": LIVING_WEIGHT_METHOD_UNAVAILABLE,
                "living_weight_source_datasets": [],
                "living_weight_skipped_sources": skipped_sources,
                "living_weight_limitations": [
                    "용도지역, 공원 폴리곤, 하천, 산지/임야 등 토지이용 공간데이터가 data/raw/land_use/ 아래에 없어 LivingWeight를 계산하지 않았습니다.",
                    "구별 점수는 simple_average로 계산되며 공원·녹지·하천·산지가 많은 자치구의 점수가 부당하게 낮아질 가능성이 있습니다.",
                ],
            }
        )
        grid_analysis.to_crs(web_crs).to_file(output_path, driver="GeoJSON")
        update_metadata(config, metadata_updates)
        print(
            f"[OK] grid_living_weight 생성: {output_path} / status=unavailable (simple_average fallback)"
        )
        return

    # --- Compute living_weight using available land-use polygons. ---
    role_to_ratio_column = {
        "parks": "park_area_ratio",
        "rivers": "river_area_ratio",
        "forest_mountain": "forest_mountain_area_ratio",
    }

    grid_geom = grid_analysis.set_geometry("geometry")
    for role, payload in loaded_sources.items():
        gdf = payload["gdf"]
        if role == "zoning":
            category_col = payload["config"].get("category_column", "zoning_category")
            if category_col not in gdf.columns:
                print(
                    f"[warn] zoning 데이터에 카테고리 컬럼 '{category_col}'이 없어 zoning 분류를 건너뜁니다."
                )
                continue
            categorized = _classify_zoning(gdf, category_col, included_keywords, excluded_keywords)
            for class_name, subset in categorized.items():
                if subset.empty:
                    continue
                area_col = {
                    "residential": "residential_area_ratio",
                    "commercial": "commercial_area_ratio",
                    "industrial": "industrial_area_ratio",
                    "green": "green_area_ratio",
                    "park": "park_area_ratio",
                }.get(class_name, "unknown_area_ratio")
                area_series = _per_grid_area_ratio(grid_geom, subset)
                grid_analysis[area_col] = _coalesce_sum(grid_analysis[area_col], area_series)
        else:
            ratio_col = role_to_ratio_column.get(role)
            if not ratio_col:
                continue
            area_series = _per_grid_area_ratio(grid_geom, gdf)
            grid_analysis[ratio_col] = _coalesce_sum(grid_analysis[ratio_col], area_series)

    # Default living-area class weights from config; missing classes contribute 0.
    weight_map = {
        "residential": float(weights_cfg.get("residential", 1.0)),
        "commercial": float(weights_cfg.get("commercial", 0.9)),
        "industrial": float(weights_cfg.get("industrial", 0.7)),
    }
    living_area_ratio = (
        _ratio_or_zero(grid_analysis["residential_area_ratio"]) * weight_map["residential"]
        + _ratio_or_zero(grid_analysis["commercial_area_ratio"]) * weight_map["commercial"]
        + _ratio_or_zero(grid_analysis["industrial_area_ratio"]) * weight_map["industrial"]
    ).clip(0.0, 1.0)

    grid_analysis["urban_living_area"] = (living_area_ratio * grid_analysis["grid_area"]).round(3)
    threshold = float(living_cfg.get("min_weight_threshold", 0.05) or 0)
    living_weight = living_area_ratio.where(living_area_ratio >= threshold, 0.0)
    grid_analysis["living_weight"] = living_weight.round(4)

    # Compute unknown ratio per grid as the remainder not classified by any source.
    classified_ratio = (
        _ratio_or_zero(grid_analysis["residential_area_ratio"])
        + _ratio_or_zero(grid_analysis["commercial_area_ratio"])
        + _ratio_or_zero(grid_analysis["industrial_area_ratio"])
        + _ratio_or_zero(grid_analysis["green_area_ratio"])
        + _ratio_or_zero(grid_analysis["park_area_ratio"])
        + _ratio_or_zero(grid_analysis["river_area_ratio"])
        + _ratio_or_zero(grid_analysis["forest_mountain_area_ratio"])
    ).clip(0.0, 1.0)
    grid_analysis["unknown_area_ratio"] = (1.0 - classified_ratio).round(4)
    grid_analysis["living_weight_method"] = LIVING_WEIGHT_METHOD_APPLIED

    unknown_ratio_mean = float(grid_analysis["unknown_area_ratio"].mean())
    zero_weight_count = int((grid_analysis["living_weight"].fillna(0) <= 0).sum())

    metadata_updates.update(
        {
            "aggregation_method": "living_weighted_average",
            "living_weight_status": "applied",
            "living_weight_method": LIVING_WEIGHT_METHOD_APPLIED,
            "living_weight_source_datasets": source_datasets,
            "living_weight_skipped_sources": skipped_sources,
            "unknown_living_weight_ratio": round(unknown_ratio_mean, 4),
            "zero_living_weight_grid_count": zero_weight_count,
            "living_weight_limitations": [
                "LivingWeight는 250m 격자 내 용도지역·공원·하천·산지 폴리곤 면적 비율로 산출한 1차 근사 지표입니다.",
                "데이터 누락 면적은 unknown_area_ratio로 기록되며 LivingWeight 산정에서는 제외됩니다.",
            ],
        }
    )

    grid_analysis.to_crs(web_crs).to_file(output_path, driver="GeoJSON")
    update_metadata(config, metadata_updates)
    print(
        f"[OK] grid_living_weight 생성: {output_path} / status=applied / "
        f"zero_weight_grid={zero_weight_count} / unknown_ratio_mean={unknown_ratio_mean:.3f}"
    )


def _classify_zoning(gdf, category_col, included_keywords, excluded_keywords):
    """Bucket zoning polygons into living-area classes by keyword in the category column."""
    values = gdf[category_col].astype(str)
    class_keywords = {
        "residential": [kw for kw in ["주거", "준주거"] if kw in included_keywords or kw == "주거" or kw == "준주거"],
        "commercial": [kw for kw in ["상업"] if kw in included_keywords or kw == "상업"],
        "industrial": [kw for kw in ["공업", "준공업"] if kw in included_keywords or kw == "공업" or kw == "준공업"],
        "green": [kw for kw in excluded_keywords if "녹지" in kw],
        "park": [kw for kw in excluded_keywords if "공원" in kw],
    }
    classes: dict[str, object] = {}
    for class_name, keywords in class_keywords.items():
        if not keywords:
            continue
        mask = values.apply(lambda value, kws=keywords: any(kw in value for kw in kws))
        if mask.any():
            classes[class_name] = gdf.loc[mask].copy()
    return classes


def _per_grid_area_ratio(grid_geom, polygons):
    import geopandas as gpd  # noqa: F401

    grid_local = grid_geom[["grid_id", "geometry", "grid_area"]].copy()
    overlay = gpd.overlay(grid_local, polygons[["geometry"]], how="intersection", keep_geom_type=False)
    if overlay.empty:
        return _empty_series(grid_local["grid_id"])
    overlay["area"] = overlay.geometry.area
    summed = overlay.groupby("grid_id")["area"].sum()
    grid_area = grid_local.set_index("grid_id")["grid_area"]
    ratio = (summed / grid_area).fillna(0.0).clip(0.0, 1.0)
    return ratio.reindex(grid_local["grid_id"]).fillna(0.0)


def _empty_series(index_values):
    import pandas as pd

    return pd.Series([0.0] * len(index_values), index=index_values)


def _coalesce_sum(existing_column, new_series):
    import pandas as pd

    if existing_column is None:
        return new_series
    existing = pd.to_numeric(existing_column, errors="coerce").fillna(0.0)
    new_values = new_series.reindex(existing.index).fillna(0.0) if hasattr(new_series, "reindex") else pd.Series(new_series, index=existing.index).fillna(0.0)
    return (existing + new_values).clip(0.0, 1.0)


def _ratio_or_zero(series):
    import pandas as pd

    return pd.to_numeric(series, errors="coerce").fillna(0.0)


def main() -> None:
    parser = argparse.ArgumentParser(description="격자별 생활 출발지 가중치(LivingWeight)를 계산합니다.")
    parser.add_argument("--config", default="config/data_config.yaml")
    args = parser.parse_args()
    calculate_living_weight(args.config)


if __name__ == "__main__":
    main()
