from __future__ import annotations

import argparse

from common import PreprocessingError, ensure_parent, load_config, read_tabular_facility, source_dataset_entry, update_metadata


def prepare_facilities(config_path: str) -> None:
    config = load_config(config_path)
    web_crs = config["coordinate_systems"]["web"]
    frames = []
    source_datasets = []
    unavailable_optional = []
    excluded_records_summary = {}

    for facility_type, source in config["facility_sources"].items():
        required = bool(source.get("required", False))
        try:
            gdf = read_tabular_facility(source, facility_type)
        except PreprocessingError:
            if required:
                raise
            unavailable_optional.append(facility_type)
            continue

        if gdf.empty:
            if required:
                raise PreprocessingError(f"{facility_type} 필수 시설 데이터가 비어 있습니다.")
            unavailable_optional.append(facility_type)
            continue

        name_col = source.get("name_column")
        address_col = source.get("address_column")
        prepared = gdf.copy()
        original_count = len(prepared)
        if prepared.crs is None:
            prepared = prepared.set_crs(source.get("source_crs", web_crs))
        prepared = prepared.to_crs(web_crs)
        prepared["facility_type"] = facility_type
        prepared["category"] = source["category"]
        prepared["facility_name"] = prepared[name_col].astype(str) if name_col in prepared.columns else facility_type
        prepared["source_name"] = prepared["source_name"] if "source_name" in prepared.columns else source.get("source_name", facility_type)
        prepared["source_provider"] = (
            prepared["source_provider"] if "source_provider" in prepared.columns else source.get("source_provider", "")
        )
        prepared["source_url"] = prepared["source_url"] if "source_url" in prepared.columns else source.get("source_url", "")
        prepared["raw_file"] = source["path"]
        prepared["address"] = prepared[address_col].astype(str) if address_col and address_col in prepared.columns else ""
        if "district_name" not in prepared.columns:
            prepared["district_name"] = ""
        if "district_code" not in prepared.columns:
            prepared["district_code"] = ""
        if "reference_year" not in prepared.columns:
            prepared["reference_year"] = ""
        keep_cols = [
            "facility_type",
            "category",
            "facility_name",
            "source_name",
            "source_provider",
            "source_url",
            "raw_file",
            "address",
            "district_name",
            "district_code",
            "reference_year",
            "geometry",
        ]
        prepared = prepared[keep_cols].dropna(subset=["geometry"])
        frames.append(prepared)
        source_datasets.append(source_dataset_entry(facility_type, source))
        excluded_records_summary[facility_type] = {
            "input_records": int(original_count),
            "used_records": int(len(prepared)),
            "excluded_records": int(original_count - len(prepared)),
        }

    if not frames:
        raise PreprocessingError("유효한 시설 데이터가 없습니다. 임의 시설은 생성하지 않습니다.")

    import geopandas as gpd
    import pandas as pd

    facilities = gpd.GeoDataFrame(pd.concat(frames, ignore_index=True), geometry="geometry", crs=web_crs)
    before_dedup = len(facilities)
    facilities = facilities.drop_duplicates(subset=["facility_type", "facility_name", "geometry"]).reset_index(drop=True)
    facilities["facility_id"] = [f"facility_{i:06d}" for i in range(len(facilities))]

    output_path = ensure_parent(config["output_paths"]["prepared_facilities"])
    facilities.to_file(output_path, driver="GeoJSON")

    update_metadata(
        config,
        {
            "source_datasets": source_datasets,
            "unavailable_optional_datasets": unavailable_optional,
            "preprocessing_scripts": ["02_prepare_facilities.py"],
            "facility_counts": {
                f"{category}.{facility_type}": int(count)
                for (category, facility_type), count in facilities.groupby(["category", "facility_type"]).size().items()
            },
            "excluded_records_summary": {
                **excluded_records_summary,
                "facility_duplicates_removed": int(before_dedup - len(facilities)),
            },
        },
    )
    print(f"[OK] facilities_prepared 생성: {output_path} ({len(facilities)} facilities)")


def main() -> None:
    parser = argparse.ArgumentParser(description="원천 시설 데이터를 표준 시설 GeoJSON으로 통합합니다.")
    parser.add_argument("--config", default="config/data_config.yaml")
    args = parser.parse_args()
    prepare_facilities(args.config)


if __name__ == "__main__":
    main()
