import type { FacilityType } from "../../types/data";

interface FacilityFilterOption {
  id: FacilityType;
  label: string;
  count: number;
}

interface FacilityTypeFilterProps {
  options: FacilityFilterOption[];
  selectedTypes: string[];
  onChange: (types: string[]) => void;
}

export function FacilityTypeFilter({ options, selectedTypes, onChange }: FacilityTypeFilterProps) {
  const selectable = options.filter((option) => option.count > 0).map((option) => option.id);
  const allSelected = selectable.length > 0 && selectable.every((id) => selectedTypes.includes(id));

  const toggleAll = () => {
    onChange(allSelected ? [] : selectable);
  };

  const toggleType = (id: string) => {
    if (selectedTypes.includes(id)) onChange(selectedTypes.filter((type) => type !== id));
    else onChange([...selectedTypes, id]);
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">시설 유형 필터</h2>
          <p className="mt-1 text-sm text-slate-500">선택한 시설 유형만 지도에 표시합니다.</p>
        </div>
        <button
          type="button"
          onClick={toggleAll}
          disabled={selectable.length === 0}
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {allSelected ? "전체 해제" : "전체 선택"}
        </button>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => {
          const disabled = option.count === 0;
          return (
            <label
              key={option.id}
              className={[
                "flex items-center justify-between rounded-md border px-3 py-2 text-sm",
                disabled ? "border-slate-100 bg-slate-50 text-slate-400" : "border-slate-200 bg-white text-slate-700",
              ].join(" ")}
              title={disabled ? "해당 시설 유형 데이터가 없습니다." : undefined}
            >
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(option.id)}
                  disabled={disabled}
                  onChange={() => toggleType(option.id)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                {option.label}
              </span>
              <span className="text-xs font-medium">{disabled ? "데이터 없음" : `${option.count}개`}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
