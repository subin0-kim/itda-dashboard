import type { CategoryId } from "../../types/data";
import { CATEGORY_FORMULAS } from "../../utils/methodology";

interface CategoryFormulaCardProps {
  categoryId: CategoryId;
}

export function CategoryFormulaCard({ categoryId }: CategoryFormulaCardProps) {
  const formulas = CATEGORY_FORMULAS.find((item) => item.id === categoryId)?.formulas ?? [];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">카테고리 산식</h2>
      <div className="mt-4 space-y-2">
        {formulas.map((formula) => (
          <p key={formula} className="rounded-md bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
            {formula}
          </p>
        ))}
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        각 시설 유형 점수는 250m 격자 중심점에서 가장 가까운 시설까지의 거리로 계산됩니다.
      </p>
    </section>
  );
}
