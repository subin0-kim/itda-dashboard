import type { DistrictScore } from "../../types/data";
import { formatScore } from "../../utils/format";

interface RankingChartPlaceholderProps {
  title: string;
  items: DistrictScore[];
}

export function RankingChartPlaceholder({ title, items }: RankingChartPlaceholderProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={`${title}-${item.district_code}`} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
            <span className="text-sm font-medium text-slate-800">{item.district_name}</span>
            <span className="text-sm text-slate-600">{formatScore(item.overall_score)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
