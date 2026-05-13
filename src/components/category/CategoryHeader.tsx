import type { CategoryDefinition } from "../../types/scoring";
import { formatScore } from "../../utils/format";
import type { ScoreStatistics } from "../../utils/statistics";

interface CategoryHeaderProps {
  category: CategoryDefinition;
  statistics: ScoreStatistics | null;
  topDistrictName: string | null;
  bottomDistrictName: string | null;
  facilityLabels: string[];
}

export function CategoryHeader({ category, statistics, topDistrictName, bottomDistrictName, facilityLabels }: CategoryHeaderProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
        <div>
          <p className="text-sm font-medium text-slate-500">카테고리 상세</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">{category.label} 접근성</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{category.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {facilityLabels.map((label) => (
              <span key={label} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Metric label="서울 평균" value={formatScore(statistics?.average)} />
          <Metric label="TOP 구" value={topDistrictName ?? "데이터 준비 필요"} />
          <Metric label="개선 여지 큰 구" value={bottomDistrictName ?? "데이터 준비 필요"} />
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-slate-950">{value}</p>
    </div>
  );
}
