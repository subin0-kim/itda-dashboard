from __future__ import annotations

import json
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG_PATH = PROJECT_ROOT / "config" / "data_config.yaml"
LIMITATION_TEXT = (
    "본 점수는 실제 유모차 통행 가능 여부를 확정하는 지표가 아니라, "
    "공개데이터 기반 생활시설 접근성을 비교하기 위한 시각화 지표입니다. "
    "실제 현장 여건은 보도 폭, 단차, 공사, 불법주정차, 시설 운영시간 등에 따라 달라질 수 있습니다."
)


class PreprocessingError(RuntimeError):
    """Raised when preprocessing cannot continue with the provided real data."""


def _handle_exception(exc_type, exc, tb) -> None:
    if issubclass(exc_type, PreprocessingError):
        print(f"[ERROR] {exc}", file=sys.stderr)
        return
    traceback.print_exception(exc_type, exc, tb)


sys.excepthook = _handle_exception


def resolve_path(path: str | Path) -> Path:
    path = Path(path)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def load_config(config_path: str | Path = DEFAULT_CONFIG_PATH) -> dict[str, Any]:
    config_file = resolve_path(config_path)
    if not config_file.exists():
        raise PreprocessingError(f"설정 파일을 찾을 수 없습니다: {config_file}")
    try:
        import yaml
    except ModuleNotFoundError:
        return _load_simple_yaml(config_file)
    with config_file.open("r", encoding="utf-8") as file:
        return yaml.safe_load(file)


def _parse_scalar(value: str) -> Any:
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


def _load_simple_yaml(path: Path) -> dict[str, Any]:
    raw_lines = path.read_text(encoding="utf-8").splitlines()
    lines = []
    for raw in raw_lines:
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        lines.append(raw.rstrip())

    root: dict[str, Any] = {}
    stack: list[tuple[int, Any]] = [(-1, root)]

    for index, line in enumerate(lines):
        indent = len(line) - len(line.lstrip(" "))
        text = line.strip()
        while indent <= stack[-1][0]:
            stack.pop()
        parent = stack[-1][1]

        if text.startswith("- "):
            if not isinstance(parent, list):
                raise PreprocessingError(f"YAML fallback 파서가 목록 구조를 해석할 수 없습니다: {line}")
            parent.append(_parse_scalar(text[2:]))
            continue

        key, sep, value = text.partition(":")
        if not sep:
            raise PreprocessingError(f"YAML fallback 파서가 해석할 수 없는 줄입니다: {line}")

        key = key.strip()
        value = value.strip()
        if value:
            parent[key] = _parse_scalar(value)
            continue

        next_text = ""
        for next_line in lines[index + 1 :]:
            next_indent = len(next_line) - len(next_line.lstrip(" "))
            if next_indent > indent:
                next_text = next_line.strip()
                break
            if next_indent <= indent:
                break
        child: Any = [] if next_text.startswith("- ") else {}
        parent[key] = child
        stack.append((indent, child))

    return root


def ensure_parent(path: str | Path) -> Path:
    resolved = resolve_path(path)
    resolved.parent.mkdir(parents=True, exist_ok=True)
    return resolved


def require_file(path: str | Path, label: str) -> Path:
    resolved = resolve_path(path)
    if not resolved.exists():
        raise PreprocessingError(
            f"{label} 파일을 찾을 수 없습니다: {resolved}\n"
            "실제 원천 데이터를 data/raw/ 아래에 배치하고 config/data_config.yaml의 경로를 확인하세요. "
            "샘플/더미 데이터는 생성하지 않습니다."
        )
    return resolved


def read_vector(path: str | Path):
    import geopandas as gpd

    resolved = resolve_path(path)
    suffix = resolved.suffix.lower()
    if suffix in {".geojson", ".json", ".gpkg", ".shp"}:
        return gpd.read_file(resolved)
    raise PreprocessingError(f"지원하지 않는 공간 데이터 형식입니다: {resolved}")


def read_tabular_facility(source: dict[str, Any], facility_type: str):
    path = require_file(source["path"], f"{facility_type} 원천 데이터")
    suffix = path.suffix.lower()
    if suffix == ".csv":
        import pandas as pd

        try:
            df = pd.read_csv(path, encoding="utf-8-sig")
        except UnicodeDecodeError:
            df = pd.read_csv(path, encoding="cp949")
    elif suffix in {".xlsx", ".xls"}:
        import pandas as pd

        df = pd.read_excel(path)
    elif suffix in {".geojson", ".json", ".gpkg", ".shp"}:
        import geopandas as gpd

        gdf = gpd.read_file(path)
        if gdf.crs is None:
            gdf = gdf.set_crs(source.get("source_crs", "EPSG:4326"))
        return gdf
    else:
        raise PreprocessingError(f"{facility_type} 데이터 형식을 지원하지 않습니다: {path}")

    import geopandas as gpd
    from shapely.geometry import Point

    x_col = source.get("x_column")
    y_col = source.get("y_column")
    name_col = source.get("name_column")
    missing_columns = [col for col in [x_col, y_col, name_col] if col and col not in df.columns]
    if missing_columns:
        raise PreprocessingError(
            f"{facility_type} 데이터에 필요한 컬럼이 없습니다: {missing_columns} / file={path}"
        )

    before_count = len(df)
    df[x_col] = pd.to_numeric(df[x_col], errors="coerce")
    df[y_col] = pd.to_numeric(df[y_col], errors="coerce")
    df = df.dropna(subset=[x_col, y_col]).copy()
    if df.empty:
        raise PreprocessingError(f"{facility_type} 데이터에 유효한 좌표가 없습니다: {path}")

    geometry = [Point(xy) for xy in zip(df[x_col], df[y_col])]
    return gpd.GeoDataFrame(df, geometry=geometry, crs=source.get("source_crs", "EPSG:4326"))


def source_dataset_entry(facility_type: str, source: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": source.get("source_name") or facility_type,
        "provider": source.get("source_provider"),
        "raw_file": source.get("path"),
        "source_url": source.get("source_url"),
        "category": source.get("category"),
        "facility_type": facility_type,
        "used": True,
    }


def write_json(path: str | Path, data: Any) -> None:
    output_path = ensure_parent(path)
    with output_path.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)


def read_json(path: str | Path) -> Any:
    input_path = require_file(path, "JSON")
    with input_path.open("r", encoding="utf-8") as file:
        return json.load(file)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def update_metadata(config: dict[str, Any], updates: dict[str, Any]) -> dict[str, Any]:
    metadata_path = config["output_paths"]["metadata"]
    metadata_file = resolve_path(metadata_path)
    if metadata_file.exists():
        with metadata_file.open("r", encoding="utf-8") as file:
            metadata = json.load(file)
    else:
        metadata = {
            "project": config.get("project", {}),
            "source_datasets": {},
            "unavailable_optional_datasets": [],
            "generated_at": None,
            "coordinate_systems": config.get("coordinate_systems", {}),
            "scoring_formula_version": config.get("project", {}).get("scoring_formula_version"),
            "limitations": [LIMITATION_TEXT],
            "applied_leisure_formula": None,
            "preprocessing_scripts": [],
            "notes": [],
        }

    for key, value in updates.items():
        if isinstance(value, list) and isinstance(metadata.get(key), list):
            merged = metadata[key] + [item for item in value if item not in metadata[key]]
            metadata[key] = merged
        elif isinstance(value, dict) and isinstance(metadata.get(key), dict):
            metadata[key].update(value)
        else:
            metadata[key] = value
    write_json(metadata_path, metadata)
    return metadata
