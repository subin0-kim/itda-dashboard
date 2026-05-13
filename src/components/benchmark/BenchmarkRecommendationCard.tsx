import { Link } from "react-router-dom";
import type { BenchmarkRecommendation, DistrictScore } from "../../types/data";
import { BENCHMARK_CATEGORY_ORDER, getCategoryGap, getWeakCategoryLabel } from "../../utils/benchmark";
import { formatScore } from "../../utils/format";
import { getNumericScore } from "../../utils/ranking";

interface BenchmarkRecommendationCardProps {
  selectedDistrict: DistrictScore | null;
  benchmarkDistrict: DistrictScore | null;
  recommendation: BenchmarkRecommendation | null;
}

export function BenchmarkRecommendationCard({ selectedDistrict, benchmarkDistrict, recommendation }: BenchmarkRecommendationCardProps) {
  if (!selectedDistrict) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-950">추천 벤치마킹 구</h2>
        <p className="mt-4 text-sm text-slate-500">분석할 구를 선택해 주세요.</p>
      </section>
    );
  }

  if (!recommendation) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-950">추천 벤치마킹 구</h2>
        <p className="mt-4 text-sm leading-6 text-slate-500">
          이 구에 대한 벤치마킹 추천 데이터가 아직 생성되지 않았습니다. 전처리 파이프라인에서 benchmark_recommendations.json을 생성해 주세요.
        </p>
      </section>
    );
  }

  if (!benchmarkDistrict) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-950">추천 벤치마킹 구</h2>
        <p className="mt-4 text-sm text-slate-500">추천 구의 점수 데이터가 없습니다.</p>
      </section>
    );
  }

  const weakLabel = getWeakCategoryLabel(recommendation.weak_category);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">추천 벤치마킹 구</h2>
          <p className="mt-1 text-sm text-slate-500">{benchmarkDistrict.district_name || recommendation.benchmark_district_name || "데이터 없음"}</p>
        </div>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
          약점 카테고리: {weakLabel}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{recommendation.reason || "추천 이유 데이터 없음"}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {BENCHMARK_CATEGORY_ORDER.map((category) => (
          <div key={category.id} className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">{category.label}</p>
            <p className="mt-1 text-sm text-slate-700">
              선택 {formatScore(getNumericScore(selectedDistrict, category.scoreKey))} · 추천 {formatScore(getNumericScore(benchmarkDistrict, category.scoreKey))}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              차이 {formatScore(getCategoryGap(selectedDistrict, benchmarkDistrict, recommendation, category.id))}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to={`/district/${encodeURIComponent(benchmarkDistrict.district_code || benchmarkDistrict.district_name)}`}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          추천 구 상세 보기
        </Link>
        <Link
          to={`/district/${encodeURIComponent(selectedDistrict.district_code || selectedDistrict.district_name)}`}
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          선택 구 상세 보기
        </Link>
      </div>
    </section>
  );
}
