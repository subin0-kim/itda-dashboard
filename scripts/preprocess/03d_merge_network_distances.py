from __future__ import annotations

import argparse
from pathlib import Path

from common import ensure_parent, load_config, read_json, require_file, resolve_path, update_metadata


def merge_network_distances(config_path: str) -> None:
    config = load_config(config_path)
    paths = config["output_paths"]
    import geopandas as gpd

    grid_path = require_file(paths.get("euclidean_grid_distances", paths["grid_distances"]), "직선거리 산출물")
    grid = gpd.read_file(grid_path)
    facility_types = list((config.get("scoring") or {}).get("type_max_scores") or config.get("distance_limits", {}))
    summary_path = resolve_path(paths["network_distance_summary"])
    summary = read_json(summary_path) if summary_path.exists() else {"status": "unavailable"}

    network_dir = resolve_path((config.get("pedestrian_network") or {}).get("output", {}).get("distance_dir", "data/processed/network_by_district"))
    network_files = list(network_dir.glob("*_network_distances.geojson")) if network_dir.exists() else []

    if summary.get("status") in {"applied", "partial"} and network_files:
        grid = apply_network_distances(grid, network_files, facility_types)
        fallback_series = grid["euclidean_fallback_used"] if "euclidean_fallback_used" in grid.columns else None
        distance_method = "mixed" if fallback_series is not None and bool(fallback_series.any()) else "pedestrian_network"
    else:
        for facility_type in facility_types:
            method_col = f"dist_{facility_type}_method"
            dist_col = f"dist_{facility_type}"
            if method_col not in grid.columns:
                grid[method_col] = "euclidean_fallback"
            if dist_col in grid.columns:
                grid.loc[grid[dist_col].isna(), method_col] = "unavailable"
        grid["network_distance_available"] = False
        grid["euclidean_fallback_used"] = True
        distance_method = "euclidean"

    output_path = ensure_parent(paths["grid_distances"])
    grid.to_file(output_path, driver="GeoJSON")
    method_counts = summarize_methods(grid, facility_types)
    network_count = method_counts.get("pedestrian_network", 0)
    fallback_count = method_counts.get("euclidean_fallback", 0)
    available_total = network_count + fallback_count or 1
    update_metadata(
        config,
        {
            "preprocessing_scripts": ["03d_merge_network_distances.py"],
            "distance_method": distance_method,
            "pedestrian_network_status": summary.get("status", "unavailable"),
            "network_distance_coverage": round(network_count / available_total, 6),
            "euclidean_fallback_coverage": round(fallback_count / available_total, 6),
            "distance_method_summary": method_counts,
            "grid_snap_max_distance_m": (config.get("pedestrian_network") or {}).get("snap", {}).get("grid_snap_max_distance_m"),
            "facility_snap_max_distance_m": (config.get("pedestrian_network") or {}).get("snap", {}).get("facility_snap_max_distance_m"),
        },
    )
    print(f"[OK] network/euclidean distance 병합: {output_path} / method={distance_method}")


def apply_network_distances(grid, network_files: list[Path], facility_types: list[str]):
    import geopandas as gpd
    import pandas as pd

    frames = []
    for path in network_files:
        frame = gpd.read_file(path).drop(columns="geometry", errors="ignore")
        frame = frame.dropna(axis=1, how="all")
        if not frame.empty:
            frames.append(frame)
    if not frames:
        return grid
    network = pd.concat(frames, ignore_index=True)
    keep_cols = ["grid_id", "grid_snap_distance_m", "network_distance_available"]
    for facility_type in facility_types:
        keep_cols.append(f"dist_{facility_type}_network")
    keep_cols = [col for col in keep_cols if col in network.columns]
    merged = grid.merge(network[keep_cols], on="grid_id", how="left")
    merged["network_distance_available"] = merged.get("network_distance_available", False).fillna(False).astype(bool)
    merged["euclidean_fallback_used"] = False
    for facility_type in facility_types:
        final_col = f"dist_{facility_type}"
        network_col = f"dist_{facility_type}_network"
        method_col = f"{final_col}_method"
        if network_col in merged.columns:
            use_network = merged[network_col].notna()
            merged[final_col] = pd.to_numeric(merged[final_col], errors="coerce")
            merged[network_col] = pd.to_numeric(merged[network_col], errors="coerce")
            merged.loc[use_network, final_col] = merged.loc[use_network, network_col]
            merged[method_col] = "euclidean_fallback"
            merged.loc[use_network, method_col] = "pedestrian_network"
            merged.loc[merged[final_col].isna(), method_col] = "unavailable"
            merged.loc[~use_network & merged[final_col].notna(), "euclidean_fallback_used"] = True
    return merged


def summarize_methods(grid, facility_types: list[str]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for facility_type in facility_types:
        col = f"dist_{facility_type}_method"
        if col not in grid.columns:
            continue
        for method, count in grid[col].fillna("unavailable").value_counts().to_dict().items():
            counts[str(method)] = counts.get(str(method), 0) + int(count)
    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description="도보 네트워크 거리와 직선거리 fallback을 병합합니다.")
    parser.add_argument("--config", default="config/data_config.yaml")
    args = parser.parse_args()
    merge_network_distances(args.config)


if __name__ == "__main__":
    main()
