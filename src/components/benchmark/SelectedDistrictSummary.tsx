import type { DistrictScore } from "../../types/data";
import { CATEGORY_LABELS } from "../../utils/category";
import { formatRank, formatScore } from "../../utils/format";

interface SelectedDistrictSummaryProps {
  district: DistrictScore | null;
}

export function SelectedDistrictSummary({ district }: SelectedDistrictSummaryProps) {
  if (!district) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-950">선택 구 점수 요약</h2>
        <p className="mt-4 text-sm text-slate-500">분석할 구를 선택해 주세요.</p>
      </section>
    );
  }

  const weakLabel = district.weakest_category ? CATEGORY_LABELS[district.weakest_category] : "데이터 없음";
  const strongLabel = district.strongest_category ? CATEGORY_LABELS[district.strongest_category] : "데이터 없음";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">선택 구 점수 요약</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Metric label="구 이름" value={district.district_name || "데이터 없음"} />
        <Metric label="통합 점수" value={formatScore(district.overall_score)} />
        <Metric label="서울 내 순위" value={formatRank(district.rank)} />
        <Metric label="의료" value={formatScore(district.medical_score)} />
        <Metric label="교육" value={formatScore(district.education_score)} />
        <Metric label="행정" value={formatScore(district.admin_score)} />
        <Metric label="여가" value={formatScore(district.leisure_score)} />
        <Metric label="강점 카테고리" value={strongLabel} />
      </div>
      <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600">
        이 구는 공개데이터 기준으로 {weakLabel} 접근성에서 개선 여지가 크게 나타났습니다.
      </p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}
