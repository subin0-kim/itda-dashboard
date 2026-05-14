from __future__ import annotations

import argparse
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def resolve(path: str | Path) -> Path:
    path = Path(path)
    return path if path.is_absolute() else PROJECT_ROOT / path


def load_config(path: str | Path) -> dict:
    try:
        import yaml
    except ModuleNotFoundError:
        raise SystemExit("pyyaml이 필요합니다. requirements-preprocess.txt를 설치하세요.")
    with resolve(path).open("r", encoding="utf-8") as file:
        return yaml.safe_load(file)


def validate(config_path: str) -> int:
    config = load_config(config_path)
    paths = config["output_paths"]
    network_cfg = config.get("pedestrian_network") or {}
    lines = ["# Pedestrian Network Validation Report", ""]
    errors = []

    inventory_path = resolve(paths.get("network_inventory", "data/processed/pedestrian_network/network_inventory.json"))
    summary_path = resolve(paths.get("network_distance_summary", "data/processed/network_by_district/network_distance_summary.json"))

    inventory = read_optional_json(inventory_path)
    summary = read_optional_json(summary_path)
    lines.append(f"- inventory_exists: {inventory_path.exists()}")
    lines.append(f"- summary_exists: {summary_path.exists()}")
    lines.append(f"- inventory_status: {inventory.get('status') if inventory else 'missing'}")
    lines.append(f"- network_distance_status: {summary.get('status') if summary else 'missing'}")
    lines.append(f"- network_distance_coverage: {(summary or {}).get('network_distance_coverage', 0)}")
    lines.append(f"- euclidean_fallback_coverage: {(summary or {}).get('euclidean_fallback_coverage', 1)}")

    overlay_dir = resolve((network_cfg.get("output") or {}).get("public_network_overlay_dir", "public/data/network"))
    overlay_files = list(overlay_dir.glob("*.geojson")) if overlay_dir.exists() else []
    lines.append("")
    lines.append("## Public Overlay")
    lines.append(f"- overlay_dir: {overlay_dir.relative_to(PROJECT_ROOT) if overlay_dir.exists() else overlay_dir}")
    lines.append(f"- overlay_geojson_count: {len(overlay_files)}")
    for path in overlay_files[:50]:
        lines.append(f"- {path.name}: {path.stat().st_size} bytes")
        if path.stat().st_size > 10_000_000:
            errors.append(f"overlay_too_large:{path.name}")

    if inventory and inventory.get("status") == "prepared":
        lines.append("")
        lines.append("## District Network Files")
        for district_code, entry in (inventory.get("districts") or {}).items():
            nodes = entry.get("nodes", {})
            links = entry.get("links", {})
            lines.append(
                f"- {district_code}: nodes={nodes.get('feature_count', 0)}, links={links.get('feature_count', 0)}, "
                f"errors={len(entry.get('errors', []))}"
            )
            if not nodes or not links:
                errors.append(f"missing_nodes_or_links:{district_code}")
    else:
        lines.append("")
        lines.append("도보 네트워크 원천 데이터가 없어 직선거리 fallback 상태입니다. 가짜 노드/링크는 생성하지 않았습니다.")

    report_path = PROJECT_ROOT / "reports" / "pedestrian_network_validation_report.md"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    if errors:
        print("도보 네트워크 검증 실패: reports/pedestrian_network_validation_report.md")
        return 1
    print("도보 네트워크 검증 완료: reports/pedestrian_network_validation_report.md")
    return 0


def read_optional_json(path: Path) -> dict | None:
    if not path.exists():
        return None
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def main() -> None:
    parser = argparse.ArgumentParser(description="도보 네트워크 전처리 산출물을 검증합니다.")
    parser.add_argument("--config", default="config/data_config.yaml")
    args = parser.parse_args()
    raise SystemExit(validate(args.config))


if __name__ == "__main__":
    main()
