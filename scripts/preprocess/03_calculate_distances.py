from __future__ import annotations

import argparse

from common import ensure_parent, load_config, require_file, update_metadata


def calculate_distances(config_path: str) -> None:
    config = load_config(config_path)
    analysis_crs = config["coordinate_systems"]["analysis"]
    web_crs = config["coordinate_systems"]["web"]

    grid_path = require_file(config["output_paths"]["grid_base"], "격자 중간 산출물")
    facilities_path = require_file(config["output_paths"]["prepared_facilities"], "시설 중간 산출물")
    import geopandas as gpd
    import numpy as np
    from scipy.spatial import cKDTree

    grid = gpd.read_file(grid_path).to_crs(analysis_crs)
    facilities = gpd.read_file(facilities_path).to_crs(analysis_crs)

    centers = grid.geometry.centroid
    grid_coords = np.column_stack([centers.x, centers.y])
    unavailable_types = []

    for facility_type in config["distance_limits"].keys():
        subset = facilities[facilities["facility_type"] == facility_type]
        col = f"dist_{facility_type}"
        if subset.empty:
            grid[col] = np.nan
            grid[f"nearest_{facility_type}_name"] = None
            grid[f"nearest_{facility_type}_id"] = None
            unavailable_types.append(facility_type)
            continue
        coords = np.column_stack([subset.geometry.x, subset.geometry.y])
        tree = cKDTree(coords)
        distances, indexes = tree.query(grid_coords, k=1)
        nearest = subset.iloc[indexes].reset_index(drop=True)
        grid[col] = distances.round(3)
        grid[f"nearest_{facility_type}_name"] = nearest["facility_name"].values
        grid[f"nearest_{facility_type}_id"] = nearest["facility_id"].values

    output_path = ensure_parent(config["output_paths"]["grid_distances"])
    grid.to_crs(web_crs).to_file(output_path, driver="GeoJSON")

    update_metadata(
        config,
        {
            "facility_types_without_distance": unavailable_types,
            "preprocessing_scripts": ["03_calculate_distances.py"],
            "distance_method": "projected_planar_nearest_distance_meters",
            "distance_null_summary": {
                f"dist_{facility_type}": int(grid[f"dist_{facility_type}"].isna().sum())
                for facility_type in config["distance_limits"].keys()
                if f"dist_{facility_type}" in grid.columns
            },
            "future_enhancements": ["도보 네트워크 거리", "경사 보정"],
        },
    )
    print(f"[OK] grid_distances 생성: {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="격자 중심점에서 시설 유형별 최근접 거리를 계산합니다.")
    parser.add_argument("--config", default="config/data_config.yaml")
    args = parser.parse_args()
    calculate_distances(args.config)


if __name__ == "__main__":
    main()
