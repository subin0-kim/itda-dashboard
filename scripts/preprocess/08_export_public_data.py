from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from common import LIMITATION_TEXT, ensure_parent, load_config, now_iso, read_json, require_file, update_metadata, write_json


def copy_json(source: str, target: str) -> None:
    source_path = require_file(source, "전처리 JSON 산출물")
    target_path = ensure_parent(target)
    shutil.copyfile(source_path, target_path)


def export_public_data(config_path: str) -> None:
    config = load_config(config_path)
    web_crs = config["coordinate_systems"]["web"]
    paths = config["output_paths"]

    boundary_path = require_file(config["boundary_data"]["path"], "서울시 자치구 경계")
    require_file(paths["grid_scores"], "격자 점수 산출물")
    require_file(paths["prepared_facilities"], "시설 산출물")
    require_file(paths["district_scores"], "구별 점수 산출물")
    require_file(paths["category_summary"], "카테고리 요약 산출물")
    import geopandas as gpd

    districts = gpd.read_file(boundary_path)
    if districts.crs is None:
        districts = districts.set_crs(config["coordinate_systems"]["source_default"])
    districts.to_crs(web_crs).to_file(ensure_parent(paths["public_seoul_districts"]), driver="GeoJSON")

    grid_scores = gpd.read_file(require_file(paths["grid_scores"], "격자 점수 산출물"))
    if grid_scores.crs is None:
        grid_scores = grid_scores.set_crs(web_crs)
    grid_scores = _attach_living_weight_columns(grid_scores, paths.get("grid_living_weight"))
    grid_scores = _attach_living_weighted_score_columns(grid_scores)
    grid_scores.to_crs(web_crs).to_file(ensure_parent(paths["public_grid_scores"]), driver="GeoJSON")

    facilities = gpd.read_file(require_file(paths["prepared_facilities"], "시설 산출물"))
    if facilities.crs is None:
        facilities = facilities.set_crs(web_crs)
    facilities.to_crs(web_crs).to_file(ensure_parent(paths["public_facilities"]), driver="GeoJSON")

    copy_json(paths["district_scores"], paths["public_district_scores"])
    copy_json(paths["category_summary"], paths["public_category_summary"])
    export_network_overlay(config)

    fallback_formula_map = {
        "large_retail_optional": "park_other_leisure_additive",
        "family_medicine": "pediatric_general_hospital_additive",
    }
    unavailable_optional = []
    for facility_type, source in config["facility_sources"].items():
        if not source.get("required", False) and not Path(source["path"]).exists():
            unavailable_optional.append(
                {
                    "name": source.get("source_name", facility_type),
                    "reason": "원천 데이터 미확보",
                    "affected_score": source.get("category"),
                    "fallback_formula": fallback_formula_map.get(facility_type),
                }
            )

    raw_inventory_summary = {
        facility_type: {
            "raw_file": source["path"],
            "required": bool(source.get("required", False)),
            "exists": Path(source["path"]).exists(),
        }
        for facility_type, source in config["facility_sources"].items()
    }

    metadata = update_metadata(
        config,
        {
            "generated_at": now_iso(),
            "coordinate_systems": {
                "calculation": config["coordinate_systems"].get("calculation", config["coordinate_systems"].get("analysis")),
                "web_output": config["coordinate_systems"].get("web_output", config["coordinate_systems"].get("web")),
                "source_default": config["coordinate_systems"].get("source_default"),
            },
            "unavailable_optional_datasets": unavailable_optional,
            "limitations": [LIMITATION_TEXT],
            "preprocessing_scripts": ["08_export_public_data.py"],
            "raw_inventory_summary": raw_inventory_summary,
            "public_outputs": {
                "seoul_districts": paths["public_seoul_districts"],
                "grid_scores": paths["public_grid_scores"],
                "district_scores": paths["public_district_scores"],
                "facilities": paths["public_facilities"],
                "category_summary": paths["public_category_summary"],
                "metadata": paths["public_metadata"],
            },
            "grid_color_score_basis": "weighted_score_when_living_weight_available",
            "pedestrian_network": config.get("pedestrian_network"),
            "origin_destination_role_note": (
                "공원은 여가 목적지로 사용하지만, 공원 내부 격자는 생활 출발지 가중치에서 제외 또는 낮은 가중치로 처리합니다."
            ),
        },
    )
    metadata["unavailable_optional_datasets"] = unavailable_optional
    write_json(paths["public_metadata"], metadata)
    write_json(paths["metadata"], metadata)
    print(f"[OK] public/data 최종 산출물 생성: {paths['public_dir']}")


def export_network_overlay(config) -> None:
    """Export district network overlay files only when real processed network data exists."""
    network_cfg = config.get("pedestrian_network") or {}
    overlay_dir = ensure_parent(Path((network_cfg.get("output") or {}).get("public_network_overlay_dir", "public/data/network")) / ".gitkeep").parent
    intermediate_dir = Path((network_cfg.get("output") or {}).get("intermediate_dir", "data/processed/pedestrian_network"))
    if not intermediate_dir.is_absolute():
        intermediate_dir = Path(__file__).resolve().parents[2] / intermediate_dir

    for path in overlay_dir.glob("*.geojson"):
        path.unlink()
    if not intermediate_dir.exists():
        return

    import geopandas as gpd

    web_crs = config["coordinate_systems"]["web"]
    for district_dir in intermediate_dir.iterdir():
        if not district_dir.is_dir():
            continue
        for role in ["nodes", "links"]:
            source_files = [district_dir / f"{role}.geojson", district_dir / f"crosswalk_{role}.geojson"]
            frames = []
            for source_file in source_files:
                if not source_file.exists():
                    continue
                frame = gpd.read_file(source_file)
                if frame.crs is None:
                    frame = frame.set_crs(config["coordinate_systems"]["analysis"])
                frames.append(frame)
            if not frames:
                continue
            if len(frames) == 1:
                gdf = frames[0]
            else:
                import pandas as pd

                gdf = gpd.GeoDataFrame(pd.concat(frames, ignore_index=True), geometry="geometry", crs=frames[0].crs)
            if role == "links":
                keep_columns = [
                    "link_id",
                    "link_type_label",
                    "source_service",
                    "network_include_reason",
                    "geometry",
                ]
            else:
                keep_columns = [
                    "node_id",
                    "node_type_label",
                    "source_service",
                    "geometry",
                ]
            gdf = gdf[[col for col in keep_columns if col in gdf.columns]]
            output_file = overlay_dir / f"{district_dir.name}_{role}.geojson"
            gdf.to_crs(web_crs).to_file(output_file, driver="GeoJSON")


LIVING_WEIGHT_COLUMNS = [
    "living_weight",
    "urban_living_area",
    "grid_area",
    "residential_area_ratio",
    "commercial_area_ratio",
    "industrial_area_ratio",
    "green_area_ratio",
    "park_area_ratio",
    "river_area_ratio",
    "forest_mountain_area_ratio",
    "unknown_area_ratio",
    "living_weight_method",
]


def _attach_living_weight_columns(grid_scores, living_path):
    if not living_path:
        return grid_scores
    resolved = Path(living_path)
    if not resolved.is_absolute():
        resolved = Path(__file__).resolve().parents[2] / resolved
    if not resolved.exists():
        return grid_scores
    import geopandas as gpd

    try:
        lw = gpd.read_file(resolved)
    except Exception as exc:  # noqa: BLE001
        print(f"[warn] grid_living_weight 로딩 실패, public 출력에서 LivingWeight 컬럼을 생략합니다: {exc}")
        return grid_scores
    if "grid_id" not in lw.columns:
        return grid_scores
    select_columns = ["grid_id"] + [col for col in LIVING_WEIGHT_COLUMNS if col in lw.columns]
    merged = grid_scores.merge(lw[select_columns].drop_duplicates(subset=["grid_id"]), on="grid_id", how="left")
    return merged


def _attach_living_weighted_score_columns(grid_scores):
    """Precompute score x LivingWeight columns for map coloring.

    The browser reads these fields directly and does not calculate distance or
    score values. If LivingWeight is unavailable, weighted columns remain null.
    """
    if "living_weight" not in grid_scores.columns:
        return grid_scores
    import pandas as pd

    weight = pd.to_numeric(grid_scores["living_weight"], errors="coerce")
    score_columns = {
        "stroller_score": "weighted_stroller_score",
        "grid_stroller_score": "weighted_grid_stroller_score",
        "medical_score": "weighted_medical_score",
        "admin_score": "weighted_admin_score",
        "education_score": "weighted_education_score",
        "leisure_score": "weighted_leisure_score",
    }
    for source_col, target_col in score_columns.items():
        if source_col not in grid_scores.columns:
            continue
        values = pd.to_numeric(grid_scores[source_col], errors="coerce")
        grid_scores[target_col] = (values * weight).clip(0, 100).round(3)
    if "weighted_stroller_score" in grid_scores.columns:
        grid_scores["weighted_overall_score"] = grid_scores["weighted_stroller_score"]
    elif "weighted_grid_stroller_score" in grid_scores.columns:
        grid_scores["weighted_overall_score"] = grid_scores["weighted_grid_stroller_score"]
    return grid_scores


def main() -> None:
    parser = argparse.ArgumentParser(description="전처리 산출물을 public/data 최종 파일로 내보냅니다.")
    parser.add_argument("--config", default="config/data_config.yaml")
    args = parser.parse_args()
    export_public_data(args.config)


if __name__ == "__main__":
    main()
