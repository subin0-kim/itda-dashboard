import type { DistrictScore } from "../../types/data";
import { CATEGORY_LABELS } from "../../utils/category";
import { formatRank, formatScore } from "../../utils/format";

export function DistrictSummaryHeader({ district }: { district: DistrictScore }) {
  const strongest = district.strongest_category ? CATEGORY_LABELS[district.strongest_category] : null;
  const weakest = district.weakest_category ? CATEGORY_LABELS[district.weakest_category] : null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">{district.district_name || "구 이름 없음"}</h1>
          <p className="mt-2 text-sm text-slate-600">유모차 생활보행 점수 상세 분석</p>
          <div className="mt-4 grid gap-2 text-sm leading-6 text-slate-700">
            <p>강점: {strongest ? `${strongest} 접근성이 상대적으로 높게 나타났습니다.` : "계산 불가"}</p>
            <p>개선 여지: {weakest ? `${weakest} 접근성이 상대적으로 낮게 나타났습니다.` : "계산 불가"}</p>
          </div>
        </div>
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
          <div className="text-sm font-medium text-indigo-700">통합 유모차 생활보행 점수</div>
          <div className="mt-3 text-3xl font-semibold text-indigo-950">{formatScore(district.overall_score)}</div>
          <div className="mt-2 text-sm text-indigo-700">서울 25개 구 중 {formatRank(district.rank)}</div>
        </div>
      </div>
    </section>
  );
}
