import type { GridSummary } from "../../utils/scoreSummary";
import { formatScore } from "../../utils/format";

export function GridSummaryPanel({ summary }: { summary: GridSummary }) {
  const rows = [
    ["선택 구 내 격자 수", `${summary.gridCount}개`],
    ["점수 계산 가능한 격자 수", `${summary.calculableGridCount}개`],
    ["평균 점수", formatScore(summary.averageScore)],
    ["가장 낮은 카테고리", summary.lowestCategory ?? "계산 불가"],
    ["가장 높은 카테고리", summary.highestCategory ?? "계산 불가"],
    ["40점 미만 격자 비율", formatRatio(summary.under40Ratio)],
    ["80점 이상 격자 비율", formatRatio(summary.over80Ratio)],
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">구 내부 격자 요약</h2>
      <dl className="mt-3 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2 text-sm last:border-0 last:pb-0">
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-medium text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function formatRatio(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "계산 불가";
  return `${(value * 100).toFixed(1)}%`;
}
