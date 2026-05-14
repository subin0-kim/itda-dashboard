import { DISTANCE_LIMITS } from "../../utils/methodology";

export function DistanceLimitTable() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">거리 기준 표</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        800m는 유모차를 동반한 생활권 내 15분 내외 이동을 고려한 만점 기준거리입니다. 이 값은 실제 통행 가능성을 확정하는
        값이 아니라 공개데이터 기반 접근성 점수 산정을 위한 분석 기준입니다.
      </p>
      <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2">항목</th>
              <th className="px-4 py-2 text-right">값</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DISTANCE_LIMITS.map(([label, value]) => (
              <tr key={label}>
                <td className="px-4 py-2 text-slate-800">{label}</td>
                <td className="px-4 py-2 text-right text-slate-600">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
