import type { OverviewCategoryId } from "../../utils/category";
import { getOverviewCategory } from "../../utils/category";

export function CategoryDescriptionCard({ categoryId }: { categoryId: OverviewCategoryId }) {
  const category = getOverviewCategory(categoryId);
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">{category.label} 기준</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{category.description}</p>
    </section>
  );
}
