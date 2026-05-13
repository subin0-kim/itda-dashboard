import type { DistrictScore } from "../../types/data";
import { CATEGORY_LABELS } from "../../utils/category";
import { formatScore } from "../../utils/format";

export function DistrictInsightPanel({
  district,
  averages,
}: {
  district: DistrictScore;
  averages: Record<"medical" | "administration" | "education" | "leisure", number | null>;
}) {
  const strongest = district.strongest_category;
  const weakest = district.weakest_category;

  if (!strongest && !weakest) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-950">강점/개선 여지</h2>
        <p className="mt-3 text-sm text-slate-600">설명을 생성하기 위한 데이터가 부족합니다.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">강점/개선 여지</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
        {strongest ? (
          <p>
            이 구는 {CATEGORY_LABELS[strongest]} 접근 점수가 상대적으로 높게 나타났습니다. 해당 생활시설 접근성이 구 내 여러 생활권에서 안정적으로 나타난 것으로 해석할 수 있습니다.
          </p>
        ) : null}
        {weakest ? (
          <p>
            {CATEGORY_LABELS[weakest]} 접근 점수가 서울 평균 대비 {formatAverageComparison(district, averages, weakest)} 나타났습니다. 관련 시설 접근성이 낮은 격자를 우선적으로 확인할 필요가 있습니다.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function formatAverageComparison(
  district: DistrictScore,
  averages: Record<"medical" | "administration" | "education" | "leisure", number | null>,
  category: "medical" | "administration" | "education" | "leisure",
) {
  const key = category === "administration" ? "admin_score" : `${category}_score`;
  const score = district[key as keyof DistrictScore];
  const average = averages[category];
  if (typeof score !== "number" || typeof average !== "number") return "비교 불가로";
  const diff = score - average;
  return diff >= 0 ? `${formatScore(diff)} 높게` : `${formatScore(Math.abs(diff))} 낮게`;
}
