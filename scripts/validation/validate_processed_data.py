from __future__ import annotations

import argparse
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
VALID_CATEGORIES = {"medical", "administration", "education", "leisure"}


def resolve(path: str | Path) -> Path:
    path = Path(path)
    return path if path.is_absolute() else PROJECT_ROOT / path


def load_config(path: str | Path) -> dict:
    try:
        import yaml
    except ModuleNotFoundError:
        return load_simple_yaml(resolve(path))
    with resolve(path).open("r", encoding="utf-8") as file:
        return yaml.safe_load(file)


def parse_scalar(value: str):
    value = value.strip()
    if value in {"true", "True"}:
        return True
    if value in {"false", "False"}:
        return False
    if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
        return value[1:-1]
    try:
        return int(value)
    except ValueError:
        pass
    try:
        return float(value)
    except ValueError:
        return value


def load_simple_yaml(path: Path) -> dict:
    lines = [line.rstrip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    root = {}
    stack = [(-1, root)]
    for index, line in enumerate(lines):
        indent = len(line) - len(line.lstrip(" "))
        text = line.strip()
        while indent <= stack[-1][0]:
            stack.pop()
        parent = stack[-1][1]
        if text.startswith("- "):
            parent.append(parse_scalar(text[2:]))
            continue
        key, _, value = text.partition(":")
        if value.strip():
            parent[key.strip()] = parse_scalar(value)
            continue
        next_text = ""
        for next_line in lines[index + 1 :]:
            next_indent = len(next_line) - len(next_line.lstrip(" "))
            if next_indent > indent:
                next_text = next_line.strip()
                break
            if next_indent <= indent:
                break
        child = [] if next_text.startswith("- ") else {}
        parent[key.strip()] = child
        stack.append((indent, child))
    return root


def validate(config_path: str) -> int:
    config = load_config(config_path)
    paths = config["output_paths"]
    required_files = {
        "seoul_districts": paths["public_seoul_districts"],
        "grid_scores": paths["public_grid_scores"],
        "district_scores": paths["public_district_scores"],
        "facilities": paths["public_facilities"],
        "category_summary": paths["public_category_summary"],
        "benchmark_recommendations": paths["public_benchmark_recommendations"],
        "metadata": paths["public_metadata"],
    }
    lines = ["# Data Validation Report", ""]
    errors = []

    for name, path in required_files.items():
        resolved = resolve(path)
        if resolved.exists():
            lines.append(f"- OK: `{path}`")
        else:
            lines.append(f"- ERROR: `{path}` 파일이 없습니다.")
            errors.append(f"missing:{path}")

    if errors:
        write_report(lines)
        print("검증 실패: 필수 public/data 파일이 없습니다. reports/data_validation_report.md를 확인하세요.")
        return 1

    import geopandas as gpd
    import pandas as pd

    grid = gpd.read_file(resolve(paths["public_grid_scores"]))
    districts = gpd.read_file(resolve(paths["public_seoul_districts"]))
    facilities = gpd.read_file(resolve(paths["public_facilities"]))

    for label, gdf in [("grid_scores", grid), ("seoul_districts", districts), ("facilities", facilities)]:
        invalid = int((~gdf.geometry.is_valid).sum())
        empty = int(gdf.geometry.is_empty.sum())
        lines.append(f"- {label} geometry invalid={invalid}, empty={empty}")
        if invalid or empty:
            errors.append(f"geometry:{label}")

    score_cols = [col for col in grid.columns if col.endswith("_score") or col == "stroller_score"]
    for col in score_cols:
        series = pd.to_numeric(grid[col], errors="coerce")
        out_of_range = int(((series < 0) | (series > 100)).sum())
        nulls = int(series.isna().sum())
        lines.append(f"- score `{col}`: null={nulls}, out_of_range={out_of_range}")
        if out_of_range:
            errors.append(f"score_range:{col}")

    for col in ["district_code", "district_name"]:
        if col not in grid.columns:
            errors.append(f"missing_grid_column:{col}")
            lines.append(f"- ERROR: grid_scores에 `{col}` 컬럼이 없습니다.")

    if "category" in facilities.columns:
        counts = facilities["category"].value_counts().to_dict()
        lines.append("")
        lines.append("## Facility Category Counts")
        for category, count in counts.items():
            lines.append(f"- {category}: {count}")
            if category not in VALID_CATEGORIES:
                errors.append(f"invalid_category:{category}")
    else:
        errors.append("missing_facility_category")
        lines.append("- ERROR: facilities에 `category` 컬럼이 없습니다.")

    with resolve(paths["public_metadata"]).open("r", encoding="utf-8") as file:
        metadata = json.load(file)
    for key in ["source_datasets", "generated_at", "coordinate_systems", "scoring_formula_version", "limitations"]:
        if key not in metadata:
            errors.append(f"missing_metadata:{key}")
            lines.append(f"- ERROR: metadata에 `{key}` 필드가 없습니다.")

    distance_cols = [col for col in grid.columns if col.startswith("dist_")]
    lines.append("")
    lines.append("## Null Distance Summary")
    for col in distance_cols:
        lines.append(f"- {col}: {int(grid[col].isna().sum())}")

    lines.append("")
    lines.append("## Living Weight Summary")
    aggregation_method = metadata.get("aggregation_method") or "simple_average"
    living_weight_status = metadata.get("living_weight_status") or "unavailable"
    lines.append(f"- aggregation_method: {aggregation_method}")
    lines.append(f"- living_weight_status: {living_weight_status}")
    if "living_weight" in grid.columns:
        lw = pd.to_numeric(grid["living_weight"], errors="coerce")
        out_of_range = int(((lw < 0) | (lw > 1)).sum())
        nulls = int(lw.isna().sum())
        zero_count = int((lw == 0).sum())
        lines.append(f"- living_weight: null={nulls}, zero={zero_count}, out_of_range={out_of_range}")
        if out_of_range:
            errors.append("living_weight_out_of_range")
        if aggregation_method == "living_weighted_average" and lw.notna().sum() == 0:
            errors.append("aggregation_method_living_weighted_but_no_weights")
            lines.append("- ERROR: aggregation_method이 living_weighted_average인데 living_weight 값이 모두 null입니다.")
    else:
        if aggregation_method == "living_weighted_average":
            errors.append("aggregation_method_living_weighted_but_column_missing")
            lines.append("- ERROR: aggregation_method이 living_weighted_average인데 grid_scores에 living_weight 컬럼이 없습니다.")
        else:
            lines.append("- living_weight 컬럼 없음 (simple_average fallback)")

    if "category" in facilities.columns and "facility_type" in facilities.columns:
        park_count = int(((facilities["category"] == "leisure") & (facilities["facility_type"] == "park")).sum())
        lines.append(f"- park facility(leisure 도착지) count: {park_count}")
        if park_count == 0:
            errors.append("park_facility_missing")
            lines.append("- ERROR: 공원이 여가 목적지(park facility)로 더 이상 표시되지 않습니다.")

    write_report(lines)
    if errors:
        print("검증 실패: reports/data_validation_report.md를 확인하세요.")
        return 1
    print("검증 성공: reports/data_validation_report.md")
    return 0


def write_report(lines: list[str]) -> None:
    report_path = PROJECT_ROOT / "reports" / "data_validation_report.md"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="public/data 최종 산출물을 검증합니다.")
    parser.add_argument("--config", default="config/data_config.yaml")
    args = parser.parse_args()
    raise SystemExit(validate(args.config))


if __name__ == "__main__":
    main()
