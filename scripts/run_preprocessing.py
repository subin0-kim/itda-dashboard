from __future__ import annotations

import argparse
import subprocess
import sys
import time
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]

STEPS = [
    "scripts/extract_family_medicine.py",
    "scripts/preprocess/01_generate_grid.py",
    "scripts/preprocess/02_prepare_facilities.py",
    "scripts/preprocess/03_calculate_distances.py",
    "scripts/preprocess/03b_prepare_pedestrian_network.py",
    "scripts/preprocess/03c_calculate_network_distances_by_district.py",
    "scripts/preprocess/03d_merge_network_distances.py",
    "scripts/preprocess/04_calculate_scores.py",
    "scripts/preprocess/05_calculate_living_weight.py",
    "scripts/preprocess/06_aggregate_district_scores.py",
    "scripts/preprocess/08_export_public_data.py",
    "scripts/validation/validate_processed_data.py",
    "scripts/validation/validate_pedestrian_network.py",
]

STEPS_WITHOUT_CONFIG = {"scripts/extract_family_medicine.py"}


def run(config_path: str) -> int:
    clean_generated_outputs()
    for index, step in enumerate(STEPS, start=1):
        print(f"\n[{index}/{len(STEPS)}] 시작: {step}")
        started = time.perf_counter()
        command = [sys.executable, str(PROJECT_ROOT / step)]
        if step not in STEPS_WITHOUT_CONFIG:
            command += ["--config", config_path]
        result = subprocess.run(command, cwd=PROJECT_ROOT, text=True)
        if result.returncode != 0:
            print(f"\n[FAIL] 전처리 실패 단계: {step}")
            print("실제 원천 데이터와 config/data_config.yaml 경로 및 컬럼 설정을 확인하세요.")
            print("샘플/더미 데이터는 생성하지 않습니다.")
            return result.returncode
        elapsed = time.perf_counter() - started
        print(f"[DONE] {step} ({elapsed:.1f}s)")
    print("\n[OK] 전체 전처리 파이프라인 완료")
    return 0


def clean_generated_outputs() -> None:
    generated = [
        "data/processed/grid_base.geojson",
        "data/processed/facilities_prepared.geojson",
        "data/processed/grid_distances_euclidean.geojson",
        "data/processed/grid_distances.geojson",
        "data/processed/grid_scores.geojson",
        "data/processed/grid_living_weight.geojson",
        "data/processed/district_scores.json",
        "data/processed/category_summary.json",
        "data/processed/metadata.json",
        "data/processed/pedestrian_network/network_inventory.json",
        "data/processed/network_by_district/network_distance_summary.json",
        "public/data/seoul_districts.geojson",
        "public/data/grid_scores.geojson",
        "public/data/district_scores.json",
        "public/data/facilities.geojson",
        "public/data/category_summary.json",
        "public/data/metadata.json",
    ]
    for rel_path in generated:
        path = PROJECT_ROOT / rel_path
        if path.exists():
            path.unlink()


def main() -> None:
    parser = argparse.ArgumentParser(description="잇다(:connect) 데이터 전처리 파이프라인을 순서대로 실행합니다.")
    parser.add_argument("--config", default="config/data_config.yaml")
    args = parser.parse_args()
    raise SystemExit(run(args.config))


if __name__ == "__main__":
    main()
