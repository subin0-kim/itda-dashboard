export function BenchmarkIntro() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      <p className="text-sm font-medium text-slate-500">Benchmark</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-950">구별 벤치마킹 제안</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        아이동반 친화점수가 낮게 나타난 구가 참고할 수 있는 유사 상위 구와 개선 힌트를 살펴봅니다.
      </p>
      <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600">
        벤치마킹 제안은 전처리 단계에서 생성된 구별 점수와 카테고리별 점수 차이를 바탕으로 제공됩니다. 본 제안은 정책 결정을 확정하는 결과가 아니라, 공개데이터 기반으로 개선 여지를 탐색하기 위한 참고 정보입니다.
      </p>
    </section>
  );
}
