import { DATA_SOURCES } from "../../config/dataSources";
import type { Metadata } from "../../types/data";
import { getAggregationMethodLabel } from "../../utils/metadata";

export function DataBasisCard({ metadata }: { metadata: Metadata | null }) {
  if (!metadata) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-950">데이터 기준</h2>
        <p className="mt-3 text-sm text-slate-500">데이터 기준 정보가 없습니다. metadata.json을 확인해 주세요.</p>
      </section>
    );
  }

  const sourceCount = Array.isArray(metadata.source_datasets)
    ? metadata.source_datasets.length
    : metadata.source_datasets
      ? Object.keys(metadata.source_datasets).length
      : 0;
  const unavailable = metadata.unavailable_optional_datasets ?? [];
  const unavailableLabel =
    unavailable.length > 0
      ? unavailable
          .map((item) => (typeof item === "string" ? item : [item.name, item.reason].filter(Boolean).join(": ")))
          .filter(Boolean)
          .join(", ")
      : "없음";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">데이터 기준</h2>
      <dl className="mt-3 grid gap-3 text-sm">
        <InfoRow label="생성 시각" value={metadata.generated_at ?? "계산 불가"} />
        <InfoRow label="산식 버전" value={metadata.scoring_formula_version ?? "계산 불가"} />
        <InfoRow label="원천 데이터 수" value={`${sourceCount}개`} />
        <InfoRow label="미확보 optional 데이터" value={unavailableLabel} />
        <InfoRow label="여가 산식" value={metadata.applied_leisure_formula ?? "계산 불가"} />
        <InfoRow label="구별 점수 집계 방식" value={getAggregationMethodLabel(metadata.aggregation_method)} />
      </dl>
      <div className="mt-4 text-xs text-slate-500">
        기준 파일: <code>{DATA_SOURCES.metadata.path}</code>
      </div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}
