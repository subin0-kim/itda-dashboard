import type { Metadata } from "../../types/data";
import { normalizeSourceDatasets, readMetadataValue } from "../../utils/metadata";

interface ActualDataSourceTableProps {
  metadata: Metadata | null;
}

export function ActualDataSourceTable({ metadata }: ActualDataSourceTableProps) {
  const sources = normalizeSourceDatasets(metadata);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">실제 사용 데이터 출처 목록</h2>
      {!metadata ? (
        <p className="mt-4 text-sm text-slate-500">metadata.json이 없어 실제 데이터 출처와 전처리 기준 정보를 표시할 수 없습니다.</p>
      ) : sources.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          metadata.json에 실제 사용 데이터 목록이 기록되어 있지 않습니다. 전처리 파이프라인에서 source_datasets 정보를 생성하면 이 표에 표시됩니다.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-[920px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2">데이터명</th>
                <th className="px-3 py-2">제공처</th>
                <th className="px-3 py-2">원본 파일명</th>
                <th className="px-3 py-2">카테고리</th>
                <th className="px-3 py-2">시설 유형</th>
                <th className="px-3 py-2">기준시점</th>
                <th className="px-3 py-2">사용 여부</th>
                <th className="px-3 py-2">원본 URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sources.map((source, index) => (
                <tr key={`${source.name}-${source.raw_file}-${index}`}>
                  <td className="px-3 py-2 text-slate-800">{readMetadataValue(source.name)}</td>
                  <td className="px-3 py-2 text-slate-600">{readMetadataValue(source.provider)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-600">{readMetadataValue(source.raw_file)}</td>
                  <td className="px-3 py-2 text-slate-600">{readMetadataValue(source.category)}</td>
                  <td className="px-3 py-2 text-slate-600">{readMetadataValue(source.facility_type)}</td>
                  <td className="px-3 py-2 text-slate-600">{readMetadataValue(source.기준시점 ?? source.reference_date ?? source.collected_at)}</td>
                  <td className="px-3 py-2 text-slate-600">{source.used === false ? "미사용" : "사용"}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {source.source_url ? (
                      <a href={source.source_url} target="_blank" rel="noreferrer" className="text-indigo-700 underline">
                        링크
                      </a>
                    ) : (
                      "정보 없음"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
