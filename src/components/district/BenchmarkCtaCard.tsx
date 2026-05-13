import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { BenchmarkRecommendation, DistrictScore } from "../../types/data";
import { CATEGORY_LABELS } from "../../utils/category";

export function BenchmarkCtaCard({
  district,
  recommendation,
}: {
  district: DistrictScore;
  recommendation: BenchmarkRecommendation | null;
}) {
  if (!recommendation) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-950">벤치마킹 추천</h2>
        <p className="mt-3 text-sm text-slate-600">이 구에 대한 벤치마킹 추천 데이터가 아직 생성되지 않았습니다.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
      <h2 className="text-base font-semibold text-indigo-950">벤치마킹 추천</h2>
      <p className="mt-3 text-sm leading-6 text-indigo-900">
        추천 구: <strong>{recommendation.benchmark_district_name}</strong>
        <br />
        약점 카테고리: {CATEGORY_LABELS[recommendation.weak_category]}
        <br />
        {recommendation.reason}
      </p>
      <div className="mt-3 grid gap-1 text-xs text-indigo-800">
        {Object.entries(recommendation.comparison ?? {}).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span>{key}</span>
            <span>{typeof value === "number" ? `${value.toFixed(1)}점` : "계산 불가"}</span>
          </div>
        ))}
      </div>
      <Link
        to={`/benchmark?district=${encodeURIComponent(district.district_code || district.district_name)}`}
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-indigo-900 px-3 py-2 text-sm font-medium text-white"
      >
        벤치마킹 자세히 보기
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </section>
  );
}
