import { useNavigate } from "react-router-dom";
import type { DistrictScore } from "../../types/data";
import type { DistrictScoreKey } from "../../utils/category";
import { getNumericScore } from "../../utils/ranking";
import { formatScore } from "../../utils/format";

interface CategoryRankingPanelProps {
  title: string;
  items: DistrictScore[];
  scoreKey: DistrictScoreKey;
}

export function CategoryRankingPanel({ title, items, scoreKey }: CategoryRankingPanelProps) {
  const navigate = useNavigate();

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">구별 점수 데이터가 필요합니다.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {items.map((item, index) => (
            <button
              key={`${item.district_code}-${item.district_name}-${index}`}
              type="button"
              onClick={() => navigate(`/district/${encodeURIComponent(item.district_code || item.district_name)}`)}
              className="flex w-full items-center justify-between gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-left hover:bg-slate-100"
            >
              <span className="min-w-0">
                <span className="mr-2 text-xs font-semibold text-slate-500">{index + 1}</span>
                <span className="text-sm font-medium text-slate-900">{item.district_name || "구 이름 없음"}</span>
                <span className="ml-2 text-xs text-slate-500">통합 {formatScore(item.overall_score)}</span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-slate-800">{formatScore(getNumericScore(item, scoreKey))}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
