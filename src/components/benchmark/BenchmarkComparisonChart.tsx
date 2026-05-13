import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts";
import type { DistrictScore } from "../../types/data";
import { BENCHMARK_CATEGORY_ORDER } from "../../utils/benchmark";
import { formatScore } from "../../utils/format";
import { getNumericScore } from "../../utils/ranking";
import { calculateScoreStatistics } from "../../utils/statistics";

interface BenchmarkComparisonChartProps {
  selectedDistrict: DistrictScore | null;
  benchmarkDistrict: DistrictScore | null;
  allDistricts: DistrictScore[];
}

export function BenchmarkComparisonChart({ selectedDistrict, benchmarkDistrict, allDistricts }: BenchmarkComparisonChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const averages = useMemo(
    () => BENCHMARK_CATEGORY_ORDER.map((category) => calculateScoreStatistics(allDistricts, category.scoreKey).average),
    [allDistricts],
  );

  useEffect(() => {
    if (!chartRef.current || !selectedDistrict || !benchmarkDistrict) return;
    const chart = echarts.init(chartRef.current);
    chart.setOption({
      color: ["#4f46e5", "#0f766e", "#94a3b8"],
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { top: 0 },
      grid: { left: 40, right: 16, top: 48, bottom: 32 },
      xAxis: {
        type: "category",
        data: BENCHMARK_CATEGORY_ORDER.map((category) => category.label),
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        axisLabel: { formatter: "{value}" },
      },
      series: [
        {
          name: selectedDistrict.district_name || "선택 구",
          type: "bar",
          data: BENCHMARK_CATEGORY_ORDER.map((category) => getNumericScore(selectedDistrict, category.scoreKey)),
        },
        {
          name: benchmarkDistrict.district_name || "추천 구",
          type: "bar",
          data: BENCHMARK_CATEGORY_ORDER.map((category) => getNumericScore(benchmarkDistrict, category.scoreKey)),
        },
        {
          name: "서울 평균",
          type: "bar",
          data: averages,
        },
      ],
    });
    const resize = () => chart.resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.dispose();
    };
  }, [averages, benchmarkDistrict, selectedDistrict]);

  if (!selectedDistrict) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-950">카테고리 점수 비교</h2>
        <p className="mt-4 text-sm text-slate-500">분석할 구를 선택해 주세요.</p>
      </section>
    );
  }

  if (!benchmarkDistrict) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-950">카테고리 점수 비교</h2>
        <p className="mt-4 text-sm text-slate-500">추천 구의 점수 데이터가 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">카테고리 점수 비교</h2>
      <p className="mt-1 text-sm text-slate-500">선택 구, 추천 구, 서울 평균의 카테고리 점수를 비교합니다.</p>
      <div ref={chartRef} className="mt-4 h-[360px] w-full" />
      <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
        {BENCHMARK_CATEGORY_ORDER.map((category, index) => (
          <p key={category.id}>
            {category.label} 서울 평균: {formatScore(averages[index])}
          </p>
        ))}
      </div>
    </section>
  );
}
