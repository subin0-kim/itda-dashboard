import type { CategoryId } from "../../types/data";

const FORMULAS: Record<CategoryId, string[]> = {
  medical: ["MedicalScore = 0.7 x PediatricScore + 0.3 x GeneralHospitalScore"],
  administration: ["AdminScore = 0.6 x CommunityCenterScore + 0.3 x DistrictOfficeScore + 0.1 x CityHallScore"],
  education: ["EducationScore = 0.6 x ChildcareCenterScore + 0.4 x KindergartenScore"],
  leisure: [
    "대형상업시설 데이터가 있는 경우: LeisureScore = 0.5 x ParkScore + 0.25 x LibraryCultureScore + 0.25 x LargeRetailScore",
    "대형상업시설 데이터가 없는 경우: LeisureScore = 0.6 x ParkScore + 0.4 x LibraryCultureScore",
  ],
};

interface CategoryFormulaCardProps {
  categoryId: CategoryId;
}

export function CategoryFormulaCard({ categoryId }: CategoryFormulaCardProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">카테고리 산식</h2>
      <div className="mt-4 space-y-2">
        {FORMULAS[categoryId].map((formula) => (
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
