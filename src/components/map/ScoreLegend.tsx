import type { OverviewCategoryId } from "../../utils/category";
import { getOverviewCategory } from "../../utils/category";
import { SCORE_COLORS } from "../../utils/colorScales";

const bands = [
  { label: "80~100: 매우 높음", short: "매우 높음", index: 4 },
  { label: "60~80: 높음", short: "높음", index: 3 },
  { label: "40~60: 보통", short: "보통", index: 2 },
  { label: "20~40: 낮음", short: "낮음", index: 1 },
  { label: "0~20: 매우 낮음", short: "매우 낮음", index: 0 },
];

interface ScoreLegendProps {
  categoryId?: OverviewCategoryId;
  layout?: "card" | "compact";
}

export function ScoreLegend({ categoryId = "overall", layout = "card" }: ScoreLegendProps) {
  const category = getOverviewCategory(categoryId);
  const colors = SCORE_COLORS[categoryId];

  if (layout === "compact") {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
        <span className="font-semibold text-slate-900">{category.label} 점수 범례</span>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {bands.map((band) => (
            <span key={band.label} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-5 rounded-sm" style={{ backgroundColor: colors[band.index] }} />
              {band.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-5 rounded-sm bg-slate-300" />
            데이터 없음
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold text-slate-900">{category.label} 점수 범례</div>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        구 지도는 구별 집계 점수, 격자 지도는 생활 출발지 가중치를 반영한 격자 점수를 색상으로 표시합니다.
      </p>
      <div className="mt-3 grid gap-2">
        {bands.map((band) => (
          <div key={band.label} className="flex items-center gap-2 text-xs text-slate-500">
            <span className="h-3 w-8 rounded-sm" style={{ backgroundColor: colors[band.index] }} />
            {band.label}
          </div>
        ))}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="h-3 w-8 rounded-sm bg-slate-300" />
          데이터 없음
        </div>
      </div>
    </div>
  );
}
