from __future__ import annotations

import argparse
from pathlib import Path

from common import ensure_parent, load_config, resolve_path, update_metadata, write_json


VECTOR_SUFFIXES = {".geojson", ".gpkg", ".shp"}
API_JSON_SUFFIXES = {".json"}


def prepare_pedestrian_network(config_path: str) -> None:
    config = load_config(config_path)
    network_cfg = config.get("pedestrian_network") or {}
    output_path = ensure_parent(config["output_paths"]["network_inventory"])
    raw_dir = resolve_path((network_cfg.get("source") or {}).get("raw_dir", "data/raw/pedestrian_network"))
    api_cache_dir = resolve_path((network_cfg.get("source") or {}).get("api_cache_dir", "data/raw_api/pedestrian_network"))
    enabled = bool(network_cfg.get("enabled", False))

    inventory = {
        "enabled": enabled,
        "status": "unavailable",
        "raw_dir": str(raw_dir.relative_to(resolve_path("."))) if raw_dir.exists() else str(raw_dir),
        "api_cache_dir": str(api_cache_dir.relative_to(resolve_path("."))) if api_cache_dir.exists() else str(api_cache_dir),
        "districts": {},
        "files": [],
        "message": None,
    }

    if not enabled:
        inventory["message"] = "pedestrian_network.enabled=false"
        write_json(output_path, inventory)
        update_metadata(config, _metadata_unavailable("disabled"))
        print("[OK] pedestrian network 준비 건너뜀: disabled")
        return

    supplemental_raw_files = {
        resolve_path(service.get("raw_file"))
        for service in (network_cfg.get("supplemental_services") or {}).values()
        if service.get("raw_file")
    }
    files = [
        p
        for base in [raw_dir, api_cache_dir]
        if base.exists()
        for p in base.rglob("*")
        if p.suffix.lower() in VECTOR_SUFFIXES | API_JSON_SUFFIXES
        and p.name != "manifest.json"
        and (p.parent.name != "supplemental" or p in supplemental_raw_files)
    ]
    inventory["files"] = [str(path.relative_to(resolve_path("."))) for path in files]
    if not files:
        inventory["message"] = "data/raw/pedestrian_network 또는 data/raw_api/pedestrian_network에 노드/링크 공간 파일이 없습니다."
        write_json(output_path, inventory)
        update_metadata(config, _metadata_unavailable("raw data not found"))
        print("[OK] pedestrian network 데이터 없음: euclidean fallback 사용")
        return

    import geopandas as gpd

    analysis_crs = (network_cfg.get("crs") or {}).get("calculation", config["coordinate_systems"]["analysis"])
    intermediate_dir = ensure_parent(Path((network_cfg.get("output") or {}).get("intermediate_dir", "data/processed/pedestrian_network")) / ".keep").parent
    codebook = load_type_codebook(network_cfg)

    prepared_any = False
    for file_path in files:
        try:
            if is_supplemental_crosswalk(file_path, network_cfg):
                outputs_by_district = prepare_crosswalk_json(file_path, network_cfg, codebook, analysis_crs, intermediate_dir)
                for output in outputs_by_district:
                    district_code = output["district_code"]
                    district_entry = inventory["districts"].setdefault(district_code, {})
                    district_entry.setdefault("supplemental_crosswalk", output["inventory"])
                prepared_any = prepared_any or bool(outputs_by_district)
                continue
            if file_path.suffix.lower() == ".json":
                outputs = prepare_openapi_json(file_path, network_cfg, codebook, analysis_crs, intermediate_dir)
                if not outputs:
                    continue
                district_code = outputs["district_code"]
                inventory["districts"].setdefault(district_code, {}).update(outputs["inventory"])
            else:
                role = infer_network_role(file_path)
                if role is None:
                    continue
                gdf = gpd.read_file(file_path)
                if gdf.empty or "geometry" not in gdf:
                    continue
                if gdf.crs is None:
                    gdf = gdf.set_crs((network_cfg.get("crs") or {}).get("source", "EPSG:4326"))
                gdf = gdf.to_crs(analysis_crs)
                district_code = infer_district_code(file_path)
                district_dir = intermediate_dir / district_code
                district_dir.mkdir(parents=True, exist_ok=True)
                output_file = district_dir / f"{role}.geojson"
                if role == "links":
                    gdf = standardize_links(gdf, network_cfg, codebook.get("links", {}))
                else:
                    gdf = standardize_nodes(gdf, codebook.get("nodes", {}))
                gdf.to_file(output_file, driver="GeoJSON")
                inventory["districts"].setdefault(district_code, {})[role] = {
                    "path": str(output_file.relative_to(resolve_path("."))),
                    "feature_count": int(len(gdf)),
                    "source_file": str(file_path.relative_to(resolve_path("."))),
                }
            prepared_any = True
        except Exception as exc:  # noqa: BLE001 - record and keep processing other districts
            if file_path.parent.name == "supplemental":
                continue
            inventory["districts"].setdefault(infer_district_code(file_path), {}).setdefault("errors", []).append(
                f"{file_path.name}: {exc}"
            )

    inventory["status"] = "prepared" if prepared_any else "unavailable"
    if not prepared_any:
        inventory["message"] = "도보 네트워크 파일은 찾았지만 표준화 가능한 노드/링크 파일을 확인하지 못했습니다."
        update_metadata(config, _metadata_unavailable("standardizable node/link data not found"))
    else:
        update_metadata(
            config,
            {
                "preprocessing_scripts": ["03b_prepare_pedestrian_network.py"],
                "pedestrian_network_status": "prepared",
                "pedestrian_network_inventory": inventory,
                "pedestrian_network_source_datasets": pedestrian_network_source_datasets(network_cfg, api_cache_dir),
            },
        )
    write_json(output_path, inventory)
    print(f"[OK] pedestrian network inventory 생성: {output_path} / status={inventory['status']}")


def pedestrian_network_source_datasets(network_cfg: dict, api_cache_dir: Path) -> list[dict]:
    datasets = [
        {
            "name": "서울시 자치구별 도보 네트워크 공간정보",
            "provider": "서울 열린데이터광장",
            "raw_file": str(api_cache_dir.relative_to(resolve_path("."))) if api_cache_dir.exists() else str(api_cache_dir),
            "source_url": network_cfg.get("source_url"),
            "service_name": network_cfg.get("service_name", "TbTraficWlkNet"),
            "used": True,
        },
        {
            "name": "도보네트워크 링크노드유형코드",
            "provider": "서울 열린데이터광장",
            "raw_file": str(resolve_path((network_cfg.get("type_codebook") or {}).get("path", "")).relative_to(resolve_path(".")))
            if (network_cfg.get("type_codebook") or {}).get("path")
            and resolve_path((network_cfg.get("type_codebook") or {}).get("path")).exists()
            else (network_cfg.get("type_codebook") or {}).get("path"),
            "source_url": None,
            "used": True,
        },
    ]
    crosswalk = ((network_cfg.get("supplemental_services") or {}).get("crosswalk") or {})
    if crosswalk.get("include_in_graph") and crosswalk.get("raw_file") and resolve_path(crosswalk["raw_file"]).exists():
        datasets.append(
            {
                "name": "서울시 횡단보도 위치정보",
                "provider": "서울 열린데이터광장",
                "raw_file": crosswalk.get("raw_file"),
                "source_url": crosswalk.get("source_url"),
                "service_name": crosswalk.get("service_name", "tbTraficCrsng"),
                "used": True,
                "usage_note": "도보 네트워크 보조 연결 링크로 사용",
            }
        )
    return datasets


def infer_network_role(path: Path) -> str | None:
    name = path.stem.lower()
    if any(token in name for token in ["node", "nodes", "노드"]):
        return "nodes"
    if any(token in name for token in ["link", "links", "링크", "walk", "pedestrian"]):
        return "links"
    return None


def prepare_crosswalk_json(file_path: Path, network_cfg: dict, codebook: dict, analysis_crs: str, intermediate_dir: Path):
    import json
    import geopandas as gpd
    import pandas as pd
    from shapely import wkt
    from shapely.geometry import Point

    payload = json.loads(file_path.read_text(encoding="utf-8"))
    file_path = resolve_path(file_path)
    rows = payload.get("rows")
    if rows is None and "tbTraficCrsng" in payload:
        rows = payload["tbTraficCrsng"].get("row")
    if not rows:
        return []
    columns = network_cfg.get("columns") or {}
    df = pd.DataFrame(rows)
    link_wkt_col = columns.get("link_wkt", "LNKG_WKT")
    district_col = columns.get("district_code", "SGG_CD")
    district_name_col = columns.get("district_name", "SGG_NM")
    district_name_to_code = load_project_district_code_by_name()
    outputs = []
    group_key = (
        df[district_name_col].fillna("").astype(str)
        if district_name_col in df.columns
        else df[district_col].astype(str).str.slice(0, 5)
    )
    for raw_group_key, district_df in df.groupby(group_key):
        district_name = str(raw_group_key).strip() if district_name_col in df.columns else ""
        api_district_code = str(first_nonempty(district_df, district_col) or raw_group_key)[:5]
        district_code = district_name_to_code.get(district_name) or API_DISTRICT_CODE_TO_PROJECT_CODE.get(api_district_code) or api_district_code
        link_df = district_df[district_df.get(link_wkt_col, "").fillna("").astype(str).str.startswith("LINESTRING")].copy()
        if link_df.empty:
            continue
        link_df["CRSWK"] = "1"
        link_df["geometry"] = link_df[link_wkt_col].apply(wkt.loads)
        links = gpd.GeoDataFrame(link_df, geometry="geometry", crs=(network_cfg.get("crs") or {}).get("source", "EPSG:4326"))
        links = standardize_links(links.to_crs(analysis_crs), network_cfg, codebook.get("links", {}))
        if links.empty:
            continue
        links["district_code"] = district_code
        links["district_name"] = district_name or first_nonempty(district_df, district_name_col) or ""
        links["source_service"] = "tbTraficCrsng"
        if not intermediate_dir.is_absolute():
            intermediate_dir = resolve_path(intermediate_dir)
        district_dir = intermediate_dir / district_code
        district_dir.mkdir(parents=True, exist_ok=True)
        links_file = district_dir / "crosswalk_links.geojson"
        links.to_file(links_file, driver="GeoJSON")

        node_rows = []
        for row in links.itertuples(index=False):
            coords = list(row.geometry.coords)
            if not coords:
                continue
            node_rows.append({"node_id": str(row.from_node), "geometry": Point(coords[0])})
            node_rows.append({"node_id": str(row.to_node), "geometry": Point(coords[-1])})
        nodes = gpd.GeoDataFrame(node_rows, geometry="geometry", crs=analysis_crs).drop_duplicates(subset=["node_id"])
        nodes["district_code"] = district_code
        nodes["district_name"] = links["district_name"].iloc[0] if "district_name" in links.columns and not links.empty else ""
        nodes_file = district_dir / "crosswalk_nodes.geojson"
        nodes.to_file(nodes_file, driver="GeoJSON")
        outputs.append(
            {
                "district_code": district_code,
                "inventory": {
                    "nodes_path": str(nodes_file.relative_to(resolve_path("."))),
                    "links_path": str(links_file.relative_to(resolve_path("."))),
                    "node_count": int(len(nodes)),
                    "link_count": int(len(links)),
                    "source_file": str(file_path.relative_to(resolve_path("."))),
                    "service": "tbTraficCrsng",
                },
            }
        )
    return outputs


API_DISTRICT_CODE_TO_PROJECT_CODE = {
    "11110": "11010",
    "11140": "11020",
    "11170": "11030",
    "11200": "11040",
    "11215": "11050",
    "11230": "11060",
    "11260": "11070",
    "11290": "11080",
    "11305": "11090",
    "11320": "11100",
    "11350": "11110",
    "11380": "11120",
    "11410": "11130",
    "11440": "11140",
    "11470": "11150",
    "11500": "11160",
    "11530": "11170",
    "11545": "11180",
    "11560": "11190",
    "11590": "11200",
    "11620": "11210",
    "11650": "11220",
    "11680": "11230",
    "11710": "11240",
    "11740": "11250",
}


def load_project_district_code_by_name() -> dict[str, str]:
    boundary_path = resolve_path("data/raw/boundary/seoul_districts.geojson")
    if not boundary_path.exists():
        return {}
    try:
        import geopandas as gpd

        districts = gpd.read_file(boundary_path)
    except Exception:  # noqa: BLE001 - fallback mapping still covers Seoul district codes
        return {}
    if "district_name" not in districts.columns or "district_code" not in districts.columns:
        return {}
    return {
        str(row.district_name).strip(): str(row.district_code).strip()
        for row in districts[["district_name", "district_code"]].itertuples(index=False)
        if str(row.district_name).strip() and str(row.district_code).strip()
    }


def infer_district_code(path: Path) -> str:
    import re

    text = " ".join(path.parts)
    match = re.search(r"11\d{3}", text)
    return match.group(0) if match else "unknown"


def prepare_openapi_json(file_path: Path, network_cfg: dict, codebook: dict, analysis_crs: str, intermediate_dir: Path):
    import json
    import geopandas as gpd
    import pandas as pd
    from shapely import wkt
    from shapely.geometry import Point

    payload = json.loads(file_path.read_text(encoding="utf-8"))
    rows = payload.get("rows")
    if rows is None and "TbTraficWlkNet" in payload:
        rows = payload["TbTraficWlkNet"].get("row")
    if not rows:
        return None
    columns = network_cfg.get("columns") or {}
    df = pd.DataFrame(rows)
    district_code = str(payload.get("district_code") or first_nonempty(df, columns.get("district_code", "SGG_CD")) or infer_district_code(file_path))
    district_code = district_code[:5] if len(district_code) >= 5 and district_code.startswith("11") else district_code
    district_name = str(payload.get("district_name") or first_nonempty(df, columns.get("district_name", "SGG_NM")) or "")
    district_dir = intermediate_dir / district_code
    district_dir.mkdir(parents=True, exist_ok=True)

    link_wkt_col = columns.get("link_wkt", "LNKG_WKT")
    link_df = df[df.get(link_wkt_col, "").fillna("").astype(str).str.startswith("LINESTRING")].copy()
    if link_df.empty:
        return None
    link_df["geometry"] = link_df[link_wkt_col].apply(wkt.loads)
    links = gpd.GeoDataFrame(link_df, geometry="geometry", crs=(network_cfg.get("crs") or {}).get("source", "EPSG:4326"))
    links = standardize_links(links.to_crs(analysis_crs), network_cfg, codebook.get("links", {}))
    links["district_code"] = district_code
    links["district_name"] = district_name
    links_file = district_dir / "links.geojson"
    links.to_file(links_file, driver="GeoJSON")

    node_rows = []
    for row in links.itertuples(index=False):
        geom = row.geometry
        coords = list(geom.coords)
        if not coords:
            continue
        node_rows.append({"node_id": str(row.from_node), "geometry": Point(coords[0])})
        node_rows.append({"node_id": str(row.to_node), "geometry": Point(coords[-1])})
    nodes = gpd.GeoDataFrame(node_rows, geometry="geometry", crs=analysis_crs).drop_duplicates(subset=["node_id"])

    node_wkt_col = columns.get("node_wkt", "NODE_WKT")
    if node_wkt_col in df.columns:
        node_df = df[df[node_wkt_col].fillna("").astype(str).str.startswith("POINT")].copy()
        if not node_df.empty:
            node_df["geometry"] = node_df[node_wkt_col].apply(wkt.loads)
            explicit_nodes = gpd.GeoDataFrame(
                node_df,
                geometry="geometry",
                crs=(network_cfg.get("crs") or {}).get("source", "EPSG:4326"),
            ).to_crs(analysis_crs)
            explicit_nodes = standardize_nodes(explicit_nodes, codebook.get("nodes", {}))
            nodes = pd.concat([nodes, explicit_nodes], ignore_index=True).drop_duplicates(subset=["node_id"])
            nodes = gpd.GeoDataFrame(nodes, geometry="geometry", crs=analysis_crs)
    nodes["district_code"] = district_code
    nodes["district_name"] = district_name
    nodes_file = district_dir / "nodes.geojson"
    nodes.to_file(nodes_file, driver="GeoJSON")

    return {
        "district_code": district_code,
        "inventory": {
            "nodes": {
                "path": str(nodes_file.relative_to(resolve_path("."))),
                "feature_count": int(len(nodes)),
                "source_file": str(file_path.relative_to(resolve_path("."))),
                "derivation": "link_endpoint_and_optional_node_wkt",
            },
            "links": {
                "path": str(links_file.relative_to(resolve_path("."))),
                "feature_count": int(len(links)),
                "source_file": str(file_path.relative_to(resolve_path("."))),
            },
        },
    }


def standardize_nodes(gdf, node_codebook: dict | None = None):
    gdf = gdf.copy()
    id_col = next((col for col in ["node_id", "NODE_ID", "노드ID", "노드아이디", "id", "ID"] if col in gdf.columns), None)
    type_col = next((col for col in ["node_type_code", "NODE_TYPE_CD", "NODE_CODE"] if col in gdf.columns), None)
    gdf["node_id"] = normalize_numeric_id(gdf[id_col]) if id_col else [f"node_{idx}" for idx in range(len(gdf))]
    if type_col:
        gdf["node_type_code"] = gdf[type_col].astype(str)
        gdf["node_type_label"] = gdf["node_type_code"].map(node_codebook or {})
    select = ["node_id", "node_type_code", "node_type_label", "district_code", "district_name", "geometry"]
    return gdf[[col for col in select if col in gdf.columns]]


def standardize_links(gdf, network_cfg: dict, link_codebook: dict | None = None):
    gdf = gdf.copy()
    columns = network_cfg.get("columns") or {}
    from_col = next((col for col in [columns.get("from_node"), "from_node", "BGNG_LNKG_ID", "FROM_NODE", "F_NODE", "시작노드", "시점노드"] if col and col in gdf.columns), None)
    to_col = next((col for col in [columns.get("to_node"), "to_node", "END_LNKG_ID", "TO_NODE", "T_NODE", "종료노드", "종점노드"] if col and col in gdf.columns), None)
    if from_col and to_col:
        gdf["from_node"] = normalize_numeric_id(gdf[from_col])
        gdf["to_node"] = normalize_numeric_id(gdf[to_col])
    else:
        # LineString endpoint에서 식별 가능한 노드를 파생한다. 원천 geometry에서 얻은 값이며 임의 노드가 아니다.
        endpoints = gdf.geometry.apply(lambda geom: endpoint_node_ids(geom))
        gdf["from_node"] = endpoints.apply(lambda item: item[0])
        gdf["to_node"] = endpoints.apply(lambda item: item[1])

    length_col = next(
        (col for col in ((network_cfg.get("distance") or {}).get("length_column_candidates") or []) if col in gdf.columns),
        None,
    )
    if length_col:
        import pandas as pd

        gdf["length_m"] = pd.to_numeric(gdf[length_col], errors="coerce")
    else:
        gdf["length_m"] = gdf.geometry.length
    gdf = gdf.dropna(subset=["from_node", "to_node", "length_m"]).copy()
    gdf = gdf[gdf["length_m"] > 0].copy()
    id_col = next((col for col in [columns.get("link_id"), "link_id", "LNKG_ID", "LINK_ID", "id", "ID"] if col and col in gdf.columns), None)
    type_col = next((col for col in [columns.get("link_type_code"), "link_type_code", "LNKG_TYPE_CD", "LINK_CODE"] if col and col in gdf.columns), None)
    if id_col:
        gdf["link_id"] = normalize_numeric_id(gdf[id_col])
    if type_col:
        gdf["link_type_code"] = gdf[type_col].astype(str).str.zfill(4)
        gdf["link_type_label"] = gdf["link_type_code"].map(link_codebook or {})
        if link_codebook:
            pedestrian_type = gdf["link_type_label"].fillna("").str.contains("보행자", regex=False)
            crosswalk = flag_is_true(gdf.get("CRSWK"))
            park = flag_is_true(gdf.get("PARK"))
            building = flag_is_true(gdf.get("BLDG"))
            bridge = flag_is_true(gdf.get("BRG"))
            for mask in [crosswalk, park, building, bridge]:
                if len(mask) == 0:
                    mask[:] = False
            crosswalk = crosswalk.reindex(gdf.index, fill_value=False)
            park = park.reindex(gdf.index, fill_value=False)
            building = building.reindex(gdf.index, fill_value=False)
            bridge = bridge.reindex(gdf.index, fill_value=False)
            gdf = gdf[pedestrian_type | crosswalk | park | building | bridge].copy()
            crosswalk = crosswalk.reindex(gdf.index, fill_value=False)
            park = park.reindex(gdf.index, fill_value=False)
            building = building.reindex(gdf.index, fill_value=False)
            bridge = bridge.reindex(gdf.index, fill_value=False)
            gdf["network_include_reason"] = "pedestrian_type"
            gdf.loc[crosswalk, "network_include_reason"] = "crosswalk"
            gdf.loc[park, "network_include_reason"] = "park"
            gdf.loc[building, "network_include_reason"] = "building_inside"
            gdf.loc[bridge, "network_include_reason"] = "bridge"
    for col in ["EXPN_CAR_RD", "SBWY_NTW", "BRG", "TNL", "OVRP", "CRSWK", "PARK", "BLDG"]:
        if col in gdf.columns:
            gdf[col.lower()] = gdf[col].astype(str)
    select = [
        "link_id",
        "from_node",
        "to_node",
        "length_m",
        "link_type_code",
        "link_type_label",
        "district_code",
        "district_name",
        "source_service",
        "network_include_reason",
        "expn_car_rd",
        "sbwy_ntw",
        "brg",
        "tnl",
        "ovrp",
        "crswk",
        "park",
        "bldg",
        "geometry",
    ]
    return gdf[[col for col in select if col in gdf.columns]]


def endpoint_node_ids(geom):
    if geom is None or geom.is_empty:
        return (None, None)
    if geom.geom_type == "MultiLineString":
        geom = list(geom.geoms)[0]
    coords = list(geom.coords)
    if len(coords) < 2:
        return (None, None)
    start = coords[0]
    end = coords[-1]
    return (f"endpoint_{round(start[0], 3)}_{round(start[1], 3)}", f"endpoint_{round(end[0], 3)}_{round(end[1], 3)}")


def _metadata_unavailable(reason: str) -> dict:
    return {
        "preprocessing_scripts": ["03b_prepare_pedestrian_network.py"],
        "distance_method": "euclidean",
        "pedestrian_network_status": "unavailable",
        "pedestrian_network_limitations": [
            "도보 네트워크 원천 데이터가 없거나 표준화되지 않아 이번 산출물은 직선거리 fallback을 사용합니다."
        ],
        "district_network_status": {},
        "pedestrian_network_unavailable_reason": reason,
    }


def is_supplemental_crosswalk(file_path: Path, network_cfg: dict) -> bool:
    crosswalk = ((network_cfg.get("supplemental_services") or {}).get("crosswalk") or {})
    raw_file = crosswalk.get("raw_file")
    if raw_file and resolve_path(raw_file) == file_path:
        return True
    return file_path.name.lower() in {"crosswalk.json", "tbtraficcrsng.json"}


def flag_is_true(series):
    if series is None:
        import pandas as pd

        return pd.Series(False, index=[])
    return series.fillna("0").astype(str).str.strip().isin({"1", "Y", "y", "true", "True"})


def load_type_codebook(network_cfg: dict) -> dict[str, dict[str, str]]:
    codebook_cfg = network_cfg.get("type_codebook") or {}
    path = codebook_cfg.get("path")
    if not path:
        return {"links": {}, "nodes": {}}
    resolved = resolve_path(path)
    if not resolved.exists():
        return {"links": {}, "nodes": {}}
    import pandas as pd

    return {
        "links": parse_code_sheet(pd.read_excel(resolved, sheet_name=codebook_cfg.get("link_sheet", "링크유형코드"), header=None), code_width=4),
        "nodes": parse_code_sheet(pd.read_excel(resolved, sheet_name=codebook_cfg.get("node_sheet", "노드유형코드"), header=None), code_width=1),
    }


def parse_code_sheet(df, code_width: int) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for row in df.itertuples(index=False):
        values = ["" if value != value else str(value).strip() for value in row]
        code = next((value for value in values if value.isdigit() and len(value) <= max(4, code_width)), None)
        if not code:
            continue
        label = values[3] if len(values) > 3 and values[3] and not values[3].isdigit() else ""
        if label:
            mapping[code.zfill(code_width)] = label
    return mapping


def normalize_numeric_id(series):
    import pandas as pd

    numeric = pd.to_numeric(series, errors="coerce")
    return numeric.astype("Int64").astype(str).where(numeric.notna(), series.astype(str))


def first_nonempty(df, column: str):
    if column not in df.columns:
        return None
    series = df[column].dropna().astype(str)
    series = series[series.str.strip() != ""]
    return series.iloc[0] if not series.empty else None


def main() -> None:
    parser = argparse.ArgumentParser(description="자치구별 도보 네트워크 노드/링크 데이터를 표준화합니다.")
    parser.add_argument("--config", default="config/data_config.yaml")
    args = parser.parse_args()
    prepare_pedestrian_network(args.config)


if __name__ == "__main__":
    main()
