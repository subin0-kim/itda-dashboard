import { Link } from "react-router-dom";
import type { DistrictScore } from "../../types/data";
import type { OverviewCategoryId } from "../../utils/category";
import { getScoreForCategory } from "../../utils/category";
import { formatScore } from "../../utils/format";

export function DistrictRankingPanel({
  title,
  items,
  categoryId,
  mode,
}: {
  title: string;
  items: DistrictScore[];
  categoryId: OverviewCategoryId;
  mode: "top" | "bottom";
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 space-y-2">
        {items.map((item, index) => {
          const target = item.district_code || item.district_name;
          return (
            <Link
              key={`${title}-${target}`}
              to={`/district/${encodeURIComponent(target)}`}
              className="block rounded-md border border-slate-100 bg-slate-50 px-3 py-3 hover:border-slate-300 hover:bg-white"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {index + 1}. {item.district_name || "구 이름 없음"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {mode === "top" ? "강점" : "약점"} 카테고리:{" "}
                    {mode === "top" ? item.strongest_category ?? "계산 불가" : item.weakest_category ?? "계산 불가"}
                  </div>
                </div>
                <div className="shrink-0 text-sm font-semibold text-slate-700">{formatScore(getScoreForCategory(item, categoryId))}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
