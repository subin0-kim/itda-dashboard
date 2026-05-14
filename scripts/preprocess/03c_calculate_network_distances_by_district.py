from __future__ import annotations

import argparse
from pathlib import Path

from common import ensure_parent, load_config, read_json, resolve_path, update_metadata, write_json


def calculate_network_distances_by_district(config_path: str) -> None:
    config = load_config(config_path)
    paths = config["output_paths"]
    network_cfg = config.get("pedestrian_network") or {}
    summary_path = ensure_parent(paths["network_distance_summary"])
    inventory_path = resolve_path(paths["network_inventory"])

    if not inventory_path.exists():
        summary = unavailable_summary("network inventory not found")
        write_json(summary_path, summary)
        update_metadata(config, metadata_unavailable(summary))
        print("[OK] network distance 계산 건너뜀: inventory 없음")
        return

    inventory = read_json(inventory_path)
    if inventory.get("status") != "prepared":
        summary = unavailable_summary(inventory.get("message") or "network inventory unavailable")
        write_json(summary_path, summary)
        update_metadata(config, metadata_unavailable(summary))
        print("[OK] network distance 계산 건너뜀: network unavailable")
        return

    # 실제 네트워크 원천이 있는 경우를 위한 최소 구조. 현재 raw 데이터가 없으면 이 분기는 실행되지 않는다.
    import geopandas as gpd
    import networkx as nx
    import numpy as np
    from scipy.spatial import cKDTree

    grid = gpd.read_file(resolve_path(paths["grid_base"])).to_crs(config["coordinate_systems"]["analysis"])
    facilities = gpd.read_file(resolve_path(paths["prepared_facilities"])).to_crs(config["coordinate_systems"]["analysis"])
    boundary = gpd.read_file(resolve_path(config["boundary_data"]["path"])).to_crs(config["coordinate_systems"]["analysis"])
    if "district_code" not in boundary.columns:
        boundary = boundary.rename(columns={config["boundary_data"]["district_code_column"]: "district_code"})

    distance_dir = ensure_parent(Path((network_cfg.get("output") or {}).get("distance_dir", "data/processed/network_by_district")) / ".keep").parent
    snap_cfg = network_cfg.get("snap") or {}
    buffer_cfg = network_cfg.get("buffer") or {}
    grid_snap_max = float(snap_cfg.get("grid_snap_max_distance_m", 150))
    facility_snap_max = float(snap_cfg.get("facility_snap_max_distance_m", 150))
    facility_buffer = float(buffer_cfg.get("facility_search_buffer_m", 3000))
    network_buffer = float(buffer_cfg.get("network_buffer_m", 500))
    facility_types = list((config.get("scoring") or {}).get("type_max_scores") or config.get("distance_limits", {}))
    network_cache = load_network_cache(inventory, config)

    district_status = {}
    total_grid_count = 0
    total_network_count = 0
    for district_code, entry in inventory.get("districts", {}).items():
        district_grid = grid[grid["district_code"].astype(str) == str(district_code)].copy()
        if district_grid.empty:
            district_status[district_code] = {"status": "unavailable", "reason": "district grid missing"}
            continue
        district_geom = boundary[boundary["district_code"].astype(str) == str(district_code)].geometry.union_all()
        facility_subset = facilities[facilities.geometry.within(district_geom.buffer(facility_buffer))].copy()
        nodes, links, included_network_districts = select_buffered_network(network_cache, district_geom, network_buffer)
        if nodes.empty or links.empty:
            district_status[district_code] = {"status": "unavailable", "reason": "buffered nodes/links missing"}
            continue

        graph = nx.Graph()
        for row in links.itertuples(index=False):
            graph.add_edge(str(row.from_node), str(row.to_node), weight=float(row.length_m))

        node_coords = np.column_stack([nodes.geometry.x, nodes.geometry.y])
        tree = cKDTree(node_coords)
        centers = district_grid.geometry.centroid
        grid_dist, grid_idx = tree.query(np.column_stack([centers.x, centers.y]), k=1)
        district_grid["grid_snap_distance_m"] = grid_dist
        district_grid["grid_network_node"] = nodes.iloc[grid_idx]["node_id"].astype(str).to_numpy()
        district_grid["network_distance_available"] = grid_dist <= grid_snap_max

        for facility_type in facility_types:
            subset = facility_subset[facility_subset["facility_type"] == facility_type].copy()
            dist_col = f"dist_{facility_type}_network"
            district_grid[dist_col] = np.nan
            if subset.empty:
                continue
            fac_dist, fac_idx = tree.query(np.column_stack([subset.geometry.x, subset.geometry.y]), k=1)
            subset["facility_snap_distance_m"] = fac_dist
            subset["facility_network_node"] = nodes.iloc[fac_idx]["node_id"].astype(str).to_numpy()
            snapped = subset[subset["facility_snap_distance_m"] <= facility_snap_max]
            target_nodes = {node for node in snapped["facility_network_node"].astype(str) if node in graph}
            if not target_nodes:
                continue
            lengths = nx.multi_source_dijkstra_path_length(graph, target_nodes, weight="weight")
            district_grid.loc[district_grid["network_distance_available"], dist_col] = (
                district_grid.loc[district_grid["network_distance_available"], "grid_network_node"].map(lengths)
            )
        output_file = distance_dir / f"{district_code}_network_distances.geojson"
        district_grid.to_file(output_file, driver="GeoJSON")
        usable = int(district_grid["network_distance_available"].sum())
        type_network_counts = {
            facility_type: int(district_grid[f"dist_{facility_type}_network"].notna().sum())
            for facility_type in facility_types
            if f"dist_{facility_type}_network" in district_grid.columns
        }
        total_grid_count += int(len(district_grid))
        total_network_count += usable
        district_status[district_code] = {
            "status": "applied",
            "grid_count": int(len(district_grid)),
            "network_snap_grid_count": usable,
            "included_network_districts": included_network_districts,
            "facility_type_network_distance_counts": type_network_counts,
            "output": str(output_file.relative_to(resolve_path("."))),
        }

    coverage = round(total_network_count / total_grid_count, 6) if total_grid_count else 0
    status = "applied" if coverage == 1 else "partial" if coverage > 0 else "unavailable"
    summary = {
        "status": status,
        "network_distance_coverage": coverage,
        "grid_count": total_grid_count,
        "network_grid_count": total_network_count,
        "district_network_status": district_status,
    }
    write_json(summary_path, summary)
    update_metadata(config, {"preprocessing_scripts": ["03c_calculate_network_distances_by_district.py"], **summary})
    print(f"[OK] network distance summary 생성: {summary_path} / status={status}")


def load_network_cache(inventory: dict, config: dict) -> dict:
    import geopandas as gpd

    cache = {}
    for district_code, entry in inventory.get("districts", {}).items():
        nodes_path = entry.get("nodes", {}).get("path")
        links_path = entry.get("links", {}).get("path")
        if not nodes_path or not links_path:
            continue
        nodes = gpd.read_file(resolve_path(nodes_path)).to_crs(config["coordinate_systems"]["analysis"])
        links = gpd.read_file(resolve_path(links_path)).to_crs(config["coordinate_systems"]["analysis"])
        crosswalk = entry.get("supplemental_crosswalk") or {}
        if crosswalk.get("nodes_path") and crosswalk.get("links_path"):
            try:
                crosswalk_nodes = gpd.read_file(resolve_path(crosswalk["nodes_path"])).to_crs(config["coordinate_systems"]["analysis"])
                crosswalk_links = gpd.read_file(resolve_path(crosswalk["links_path"])).to_crs(config["coordinate_systems"]["analysis"])
                import pandas as pd

                nodes = gpd.GeoDataFrame(pd.concat([nodes, crosswalk_nodes], ignore_index=True), geometry="geometry", crs=nodes.crs)
                links = gpd.GeoDataFrame(pd.concat([links, crosswalk_links], ignore_index=True), geometry="geometry", crs=links.crs)
                nodes = nodes.drop_duplicates(subset=["node_id"])
                links = links.drop_duplicates(subset=["from_node", "to_node", "length_m"])
            except Exception as exc:  # noqa: BLE001
                entry.setdefault("errors", []).append(f"crosswalk merge failed: {exc}")
        if nodes.empty or links.empty:
            continue
        cache[str(district_code)] = {"nodes": nodes, "links": links}
    return cache


def select_buffered_network(network_cache: dict, district_geom, network_buffer: float):
    import geopandas as gpd
    import pandas as pd

    search_geom = district_geom.buffer(network_buffer)
    selected_nodes = []
    selected_links = []
    included = []
    for district_code, data in network_cache.items():
        links = data["links"]
        candidate_links = links[links.geometry.intersects(search_geom)].copy()
        if candidate_links.empty:
            continue
        node_ids = set(candidate_links["from_node"].astype(str)) | set(candidate_links["to_node"].astype(str))
        nodes = data["nodes"][data["nodes"]["node_id"].astype(str).isin(node_ids)].copy()
        if nodes.empty:
            continue
        selected_links.append(candidate_links)
        selected_nodes.append(nodes)
        included.append(district_code)
    if not selected_links:
        return gpd.GeoDataFrame(geometry=[]), gpd.GeoDataFrame(geometry=[]), included
    links_merged = gpd.GeoDataFrame(pd.concat(selected_links, ignore_index=True), geometry="geometry", crs=selected_links[0].crs)
    nodes_merged = gpd.GeoDataFrame(pd.concat(selected_nodes, ignore_index=True), geometry="geometry", crs=selected_nodes[0].crs)
    nodes_merged = nodes_merged.drop_duplicates(subset=["node_id"]).copy()
    links_merged = links_merged.drop_duplicates(subset=["from_node", "to_node", "length_m"]).copy()
    return nodes_merged, links_merged, sorted(included)


def unavailable_summary(reason: str) -> dict:
    return {
        "status": "unavailable",
        "reason": reason,
        "network_distance_coverage": 0,
        "euclidean_fallback_coverage": 1,
        "district_network_status": {},
    }


def metadata_unavailable(summary: dict) -> dict:
    return {
        "preprocessing_scripts": ["03c_calculate_network_distances_by_district.py"],
        "distance_method": "euclidean",
        "pedestrian_network_status": "unavailable",
        "network_distance_coverage": 0,
        "euclidean_fallback_coverage": 1,
        "district_network_status": summary.get("district_network_status", {}),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="자치구별 도보 네트워크 최단거리를 계산합니다.")
    parser.add_argument("--config", default="config/data_config.yaml")
    args = parser.parse_args()
    calculate_network_distances_by_district(args.config)


if __name__ == "__main__":
    main()
