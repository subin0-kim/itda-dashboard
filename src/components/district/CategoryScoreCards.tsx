import type { DistrictScore } from "../../types/data";
import type { OverviewCategoryId } from "../../utils/category";
import { OVERVIEW_CATEGORY_OPTIONS, getOverviewCategory } from "../../utils/category";
import { formatScore } from "../../utils/format";
import { getCategoryDifference } from "../../utils/scoreSummary";

const toneClass = {
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
};

export function CategoryScoreCards({
  district,
  averages,
  selectedCategory,
  onSelect,
}: {
  district: DistrictScore;
  averages: Record<"medical" | "administration" | "education" | "leisure", number | null>;
  selectedCategory: OverviewCategoryId;
  onSelect: (category: OverviewCategoryId) => void;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-4">
      {OVERVIEW_CATEGORY_OPTIONS.filter((option) => option.id !== "overall").map((option) => {
        const score = district[option.scoreKey];
        const average = averages[option.id as keyof typeof averages];
        const diff = getCategoryDifference(score, average);
        const selected = selectedCategory === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            className={[
              "rounded-lg border bg-white p-4 text-left transition hover:border-slate-300",
              selected ? toneClass[option.color] : "border-slate-200",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{option.label}</div>
                <div className="mt-3 text-2xl font-semibold text-slate-950">{formatScore(score)}</div>
              </div>
              <span className="rounded-md bg-white/70 px-2 py-1 text-xs">{selected ? "선택됨" : "보기"}</span>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-600">{getOverviewCategory(option.id).description}</p>
            <div className="mt-3 text-xs font-medium text-slate-600">
              서울 평균 대비 {diff === null ? "비교 불가" : `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}점`}
            </div>
          </button>
        );
      })}
    </section>
  );
}
