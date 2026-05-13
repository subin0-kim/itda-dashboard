import { formatScore } from "../../utils/format";
import type { ScoreStatistics } from "../../utils/statistics";

interface CategoryInsightPanelProps {
  statistics: ScoreStatistics | null;
}

export function CategoryInsightPanel({ statistics }: CategoryInsightPanelProps) {
  if (!statistics || statistics.availableCount === 0) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-950">카테고리 인사이트</h2>
        <p className="mt-4 text-sm text-slate-500">카테고리 인사이트를 계산할 데이터가 없습니다.</p>
      </section>
    );
  }

  const metrics = [
    { label: "서울 평균", value: formatScore(statistics.average) },
    { label: "최고 점수", value: formatScore(statistics.max) },
    { label: "최저 점수", value: formatScore(statistics.min) },
    { label: "점수 격차", value: formatScore(statistics.gap) },
    { label: "표준편차", value: formatScore(statistics.standardDeviation) },
    { label: "점수 있는 구", value: `${statistics.availableCount}개` },
    { label: "점수 없는 구", value: `${statistics.missingCount}개` },
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">카테고리 인사이트</h2>
      <p className="mt-1 text-sm text-slate-500">전처리된 구별 점수를 요약한 통계입니다.</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">{metric.label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">{metric.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
