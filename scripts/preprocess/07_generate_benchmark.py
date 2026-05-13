from __future__ import annotations

import argparse
import math

from common import PreprocessingError, load_config, read_json, update_metadata, write_json


CATEGORY_SCORE_COLUMNS = {
    "medical": "medical_score",
    "education": "education_score",
    "administration": "admin_score",
    "leisure": "leisure_score",
}


def profile_distance(a: dict, b: dict) -> float:
    return math.sqrt(sum((a[col] - b[col]) ** 2 for col in CATEGORY_SCORE_COLUMNS.values()))


def generate_benchmark(config_path: str) -> None:
    config = load_config(config_path)
    district_scores = read_json(config["output_paths"]["district_scores"])
    if not district_scores:
        raise PreprocessingError("district_scores가 비어 있어 벤치마킹 추천을 계산할 수 없습니다.")

    recommendations = []
    for district in district_scores:
        weak = district["weakest_category"]
        higher = [candidate for candidate in district_scores if candidate["overall_score"] > district["overall_score"]]
        if not higher:
            continue
        weak_score_col = CATEGORY_SCORE_COLUMNS[weak]
        candidates = sorted(
            higher,
            key=lambda candidate: (
                -candidate[weak_score_col],
                profile_distance(district, candidate),
                candidate["rank"],
            ),
        )
        benchmark = candidates[0]
        comparison = {
            f"{cat}_gap": round(float(benchmark[col] - district[col]), 3)
            for cat, col in CATEGORY_SCORE_COLUMNS.items()
        }
        comparison["admin_gap"] = comparison["administration_gap"]
        recommendations.append(
            {
                "district_code": district["district_code"],
                "district_name": district["district_name"],
                "benchmark_district_code": benchmark["district_code"],
                "benchmark_district_name": benchmark["district_name"],
                "reason": (
                    f"{weak} 카테고리 점수가 상대적으로 낮게 나타난 구이며, "
                    "전체 점수가 더 높고 해당 카테고리 접근성이 높은 구를 벤치마킹 후보로 추천합니다."
                ),
                "weak_category": weak,
                "comparison": comparison,
            }
        )

    write_json(config["output_paths"]["benchmark_recommendations"], recommendations)
    update_metadata(
        config,
        {
            "preprocessing_scripts": ["06_generate_benchmark.py"],
            "benchmark_logic": "higher_overall_score_and_strong_weak_category_simple_v1",
            "notes": ["벤치마킹 추천은 초기 버전의 단순 비교 로직이며 실제 정책 우선순위를 확정하지 않습니다."],
        },
    )
    print(f"[OK] benchmark_recommendations 생성: {len(recommendations)} recommendations")


def main() -> None:
    parser = argparse.ArgumentParser(description="구별 점수 기반 벤치마킹 후보 구를 계산합니다.")
    parser.add_argument("--config", default="config/data_config.yaml")
    args = parser.parse_args()
    generate_benchmark(args.config)


if __name__ == "__main__":
    main()
