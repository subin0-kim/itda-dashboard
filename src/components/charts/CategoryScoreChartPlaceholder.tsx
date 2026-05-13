export function CategoryScoreChartPlaceholder({ title = "카테고리 점수 비교" }: { title?: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 flex h-64 items-center justify-center rounded-md bg-slate-50 text-sm text-slate-500">
        ECharts 비교 차트를 연결할 영역입니다.
      </div>
    </section>
  );
}
