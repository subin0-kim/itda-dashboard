import type { Metadata } from "../../types/data";
import { getAppliedLeisureFormulaLabel, normalizeUnavailableOptionalDatasets, readMetadataValue } from "../../utils/metadata";

interface OptionalDataStatusTableProps {
  metadata: Metadata | null;
}

export function OptionalDataStatusTable({ metadata }: OptionalDataStatusTableProps) {
  const unavailable = normalizeUnavailableOptionalDatasets(metadata);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">Optional 데이터 처리 현황</h2>
      {unavailable.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">미사용 optional 데이터 정보가 없습니다.</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2">데이터명</th>
                <th className="px-3 py-2">미사용 사유</th>
                <th className="px-3 py-2">영향받는 점수</th>
                <th className="px-3 py-2">대체 산식</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {unavailable.map((item, index) => (
                <tr key={`${item.name}-${index}`}>
                  <td className="px-3 py-2 text-slate-800">{readMetadataValue(item.name)}</td>
                  <td className="px-3 py-2 text-slate-600">{readMetadataValue(item.reason)}</td>
                  <td className="px-3 py-2 text-slate-600">{readMetadataValue(item.affected_score)}</td>
                  <td className="px-3 py-2 text-slate-600">{item.fallback_formula ?? getAppliedLeisureFormulaLabel(metadata?.applied_leisure_formula)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {metadata?.applied_leisure_formula ? (
        <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600">{getAppliedLeisureFormulaLabel(metadata.applied_leisure_formula)}</p>
      ) : null}
    </section>
  );
}
