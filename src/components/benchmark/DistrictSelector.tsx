import type { DistrictScore } from "../../types/data";
import type { BenchmarkSortKey } from "../../utils/benchmark";
import { BENCHMARK_SORT_OPTIONS, sortDistrictsForBenchmark } from "../../utils/benchmark";
import { formatRank, formatScore } from "../../utils/format";

interface DistrictSelectorProps {
  districts: DistrictScore[];
  selectedDistrictId: string;
  sortKey: BenchmarkSortKey;
  onSortChange: (sortKey: BenchmarkSortKey) => void;
  onDistrictChange: (districtId: string) => void;
}

export function DistrictSelector({ districts, selectedDistrictId, sortKey, onSortChange, onDistrictChange }: DistrictSelectorProps) {
  const sorted = sortDistrictsForBenchmark(districts, sortKey);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <div>
          <h2 className="text-base font-semibold text-slate-950">구 선택</h2>
          <p className="mt-1 text-sm text-slate-500">분석할 구를 선택하면 전처리된 추천 결과를 확인합니다.</p>
        </div>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">정렬</span>
          <select
            value={sortKey}
            onChange={(event) => onSortChange(event.target.value as BenchmarkSortKey)}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
          >
            {BENCHMARK_SORT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-4 block text-sm">
        <span className="mb-1 block font-medium text-slate-600">자치구</span>
        <select
          value={selectedDistrictId}
          onChange={(event) => onDistrictChange(event.target.value)}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
        >
          <option value="">분석할 구를 선택해 주세요.</option>
          {sorted.map((district) => {
            const id = district.district_code || district.district_name;
            return (
              <option key={id} value={id}>
                {district.district_name} · {formatRank(district.rank)} · 통합 {formatScore(district.overall_score)}
              </option>
            );
          })}
        </select>
      </label>
    </section>
  );
}
