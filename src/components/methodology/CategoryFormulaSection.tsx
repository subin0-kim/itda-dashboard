import type { Metadata } from "../../types/data";
import { CATEGORY_FORMULAS } from "../../utils/methodology";
import { getAppliedLeisureFormulaLabel, getAppliedMedicalFormulaLabel } from "../../utils/metadata";

interface CategoryFormulaSectionProps {
  metadata: Metadata | null;
}

export function CategoryFormulaSection({ metadata }: CategoryFormulaSectionProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">카테고리별 산식</h2>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {CATEGORY_FORMULAS.map((category) => (
          <div key={category.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">{category.label}</h3>
            <div className="mt-3 space-y-2">
              {category.formulas.map((formula) => (
                <p key={formula} className="font-mono text-xs leading-5 text-slate-700">
                  {formula}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-md bg-rose-50 p-3 text-sm font-medium text-rose-950">
        {getAppliedMedicalFormulaLabel(metadata?.applied_medical_formula)}
      </p>
      <p className="mt-2 rounded-md bg-indigo-50 p-3 text-sm font-medium text-indigo-950">
        {getAppliedLeisureFormulaLabel(metadata?.applied_leisure_formula)}
      </p>
    </section>
  );
}
