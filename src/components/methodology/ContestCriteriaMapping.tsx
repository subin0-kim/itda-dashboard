const CRITERIA = [
  ["서울 데이터 허브 및 데이터 활용도", "실제 사용 데이터 목록과 전처리 과정을 공개"],
  ["문제인식 및 주제 적절성", "아이동반 이동성과 생활시설 접근성 문제를 다룸"],
  ["데이터 표현의 정확성", "산식, 기준거리, 한계를 명시"],
  ["시각화 전달력 및 창의성", "250m 격자, 구별 지도, 카테고리별 탐색 제공"],
  ["서울시 정책 기여도", "구별 개선 여지와 벤치마킹 힌트 제공"],
];

export function ContestCriteriaMapping() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">심사 기준 대응 요약</h2>
      <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2">심사 기준</th>
              <th className="px-4 py-2">본 결과물의 대응</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {CRITERIA.map(([criterion, response]) => (
              <tr key={criterion}>
                <td className="px-4 py-2 font-medium text-slate-800">{criterion}</td>
                <td className="px-4 py-2 text-slate-600">{response}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
