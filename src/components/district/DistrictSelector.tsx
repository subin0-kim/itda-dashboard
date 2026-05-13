import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { DistrictScore } from "../../types/data";

interface DistrictSelectorProps {
  districts: DistrictScore[];
  selected?: DistrictScore | null;
  placeholder?: string;
  helperText?: string;
}

export function DistrictSelector({
  districts,
  selected = null,
  placeholder = "구를 선택하세요",
  helperText = "전체 25개 구 중 한 곳을 선택하면 해당 구 상세로 이동합니다.",
}: DistrictSelectorProps) {
  const navigate = useNavigate();

  const options = useMemo(
    () =>
      [...districts]
        .filter((d) => d.district_name)
        .sort((a, b) => a.district_name.localeCompare(b.district_name, "ko")),
    [districts],
  );

  const currentValue = selected ? selected.district_code || selected.district_name : "";

  return (
    <section className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="district-selector" className="text-sm font-medium text-slate-700">
          분석할 구 선택
        </label>
        <select
          id="district-selector"
          value={currentValue}
          onChange={(event) => {
            const next = event.target.value;
            if (!next || next === currentValue) return;
            navigate(`/district/${encodeURIComponent(next)}`);
          }}
          className="min-w-[180px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {!selected ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((district) => {
            const value = district.district_code || district.district_name;
            return (
              <option key={value} value={value}>
                {district.district_name}
              </option>
            );
          })}
        </select>
        <span className="text-xs text-slate-500">{helperText}</span>
      </div>
    </section>
  );
}
