import type { OverviewCategoryId } from "../../utils/category";
import { FACILITY_TYPE_OPTIONS, getOverviewCategory } from "../../utils/category";

export function DistrictFacilityFilters({
  categoryId,
  selectedTypes,
  counts,
  onChange,
}: {
  categoryId: OverviewCategoryId;
  selectedTypes: string[];
  counts: Record<string, number>;
  onChange: (types: string[]) => void;
}) {
  if (categoryId === "overall") {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-950">시설 유형 필터</h2>
        <p className="mt-3 text-sm text-slate-500">의료, 행정, 교육, 여가 카테고리 시설 위치가 모두 표시됩니다. 카테고리를 선택하면 시설 유형 단위로 필터링할 수 있습니다.</p>
      </section>
    );
  }

  const options = FACILITY_TYPE_OPTIONS[categoryId];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">{getOverviewCategory(categoryId).label} 시설 유형</h2>
      <div className="mt-3 space-y-2">
        {options.map((option) => {
          const count = counts[option.id] ?? 0;
          const disabled = count === 0;
          return (
            <label key={option.id} className={["flex items-center justify-between rounded-md border px-3 py-2 text-sm", disabled ? "border-slate-100 bg-slate-50 text-slate-400" : "border-slate-200 text-slate-700"].join(" ")}>
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={!disabled && selectedTypes.includes(option.id)}
                  onChange={(event) => {
                    if (event.target.checked) onChange([...selectedTypes, option.id]);
                    else onChange(selectedTypes.filter((type) => type !== option.id));
                  }}
                />
                {option.label}
              </span>
              <span className="text-xs">{disabled ? "데이터 없음" : `${count}개`}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
