import { DISTANCE_LIMITS } from "../../utils/methodology";

export function DistanceLimitTable() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">기준거리 표</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        기준거리는 시설 유형별로 아이동반 생활에서 기대되는 접근 가능 범위를 분석 가정으로 설정한 값입니다.
      </p>
      <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2">시설 유형</th>
              <th className="px-4 py-2 text-right">기준거리</th>
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
