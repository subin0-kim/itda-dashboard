import type { OverviewCategoryId } from "../../utils/category";
import { OVERVIEW_CATEGORY_OPTIONS } from "../../utils/category";

const activeClass = {
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export function CategoryFilter({
  value,
  onChange,
}: {
  value: OverviewCategoryId;
  onChange: (value: OverviewCategoryId) => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        {OVERVIEW_CATEGORY_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={[
              "rounded-md border px-3 py-2 text-sm font-medium transition",
              value === option.id ? activeClass[option.color] : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            ].join(" ")}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
