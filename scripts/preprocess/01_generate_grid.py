from __future__ import annotations

import argparse

from common import PreprocessingError, ensure_parent, load_config, read_vector, require_file, update_metadata


def generate_grid(config_path: str) -> None:
    config = load_config(config_path)
    boundary_cfg = config["boundary_data"]
    boundary_path = require_file(boundary_cfg["path"], "서울시 자치구 경계")
    import geopandas as gpd
    from shapely.geometry import box

    districts = read_vector(boundary_path)

    code_col = boundary_cfg["district_code_column"]
    name_col = boundary_cfg["district_name_column"]
    missing = [col for col in [code_col, name_col, "geometry"] if col not in districts.columns]
    if missing:
        raise PreprocessingError(f"자치구 경계 데이터에 필요한 컬럼이 없습니다: {missing}")
    if districts.empty:
        raise PreprocessingError("자치구 경계 데이터가 비어 있습니다. 가짜 경계는 생성하지 않습니다.")

    analysis_crs = config["coordinate_systems"]["analysis"]
    web_crs = config["coordinate_systems"]["web"]
    grid_size = int(config["grid"]["size_meters"])

    districts_analysis = districts[[code_col, name_col, "geometry"]].copy()
    districts_analysis = districts_analysis.rename(columns={code_col: "district_code", name_col: "district_name"})
    if districts_analysis.crs is None:
        districts_analysis = districts_analysis.set_crs(config["coordinate_systems"]["source_default"])
    districts_analysis = districts_analysis.to_crs(analysis_crs)
    union = districts_analysis.geometry.union_all()
    minx, miny, maxx, maxy = union.bounds

    cells = []
    x = minx
    while x < maxx:
        y = miny
        while y < maxy:
            cell = box(x, y, x + grid_size, y + grid_size)
            if cell.intersects(union):
                clipped = cell.intersection(union)
                if not clipped.is_empty:
                    cells.append(clipped)
            y += grid_size
        x += grid_size

    if not cells:
        raise PreprocessingError("서울시 경계에서 250m 격자를 생성하지 못했습니다.")

    grid = gpd.GeoDataFrame({"grid_id": [f"grid_{i:06d}" for i in range(len(cells))]}, geometry=cells, crs=analysis_crs)
    centers = grid.copy()
    centers["geometry"] = centers.geometry.centroid
    joined = gpd.sjoin(
        centers,
        districts_analysis[["district_code", "district_name", "geometry"]],
        how="left",
        predicate="within",
    )
    grid["center_x"] = centers.geometry.x
    grid["center_y"] = centers.geometry.y
    grid["district_code"] = joined["district_code"].values
    grid["district_name"] = joined["district_name"].values

    if grid["district_code"].isna().any():
        raise PreprocessingError("일부 격자를 자치구에 매핑하지 못했습니다. 경계 데이터와 좌표계를 확인하세요.")

    output_path = ensure_parent(config["output_paths"]["grid_base"])
    grid.to_crs(web_crs).to_file(output_path, driver="GeoJSON")

    update_metadata(
        config,
        {
            "source_datasets": [
                {
                    "name": boundary_cfg.get("source_name", "서울시 자치구 경계"),
                    "provider": boundary_cfg.get("source_provider"),
                    "raw_file": boundary_cfg["path"],
                    "source_url": boundary_cfg.get("source_url"),
                    "category": "boundary",
                    "facility_type": None,
                    "used": True,
                }
            ],
            "preprocessing_scripts": ["01_generate_grid.py"],
            "grid": {"size_meters": grid_size, "count": int(len(grid))},
            "grid_by_district": grid["district_name"].value_counts().sort_index().to_dict(),
            "grid_missing_district_count": int(grid["district_name"].isna().sum()),
        },
    )
    print(f"[OK] grid_base 생성: {output_path} ({len(grid)} cells)")


def main() -> None:
    parser = argparse.ArgumentParser(description="서울시 자치구 경계에서 250m 격자를 생성합니다.")
    parser.add_argument("--config", default="config/data_config.yaml")
    args = parser.parse_args()
    generate_grid(args.config)


if __name__ == "__main__":
    main()
