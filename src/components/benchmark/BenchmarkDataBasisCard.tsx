import type { Metadata } from "../../types/data";

interface BenchmarkDataBasisCardProps {
  metadata: Metadata | null;
}

export function BenchmarkDataBasisCard({ metadata }: BenchmarkDataBasisCardProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">데이터 기준 및 한계</h2>
      {metadata ? (
        <dl className="mt-4 grid gap-2 text-sm">
          <Row label="생성일" value={metadata.generated_at ?? "정보 없음"} />
          <Row label="산식 버전" value={metadata.scoring_formula_version ?? "정보 없음"} />
          <Row label="여가 산식" value={metadata.applied_leisure_formula ?? "정보 없음"} />
          <Row label="미확보 optional" value={(metadata.unavailable_optional_datasets ?? []).join(", ") || "없음"} />
        </dl>
      ) : (
        <p className="mt-4 text-sm text-slate-500">데이터 기준 정보가 없습니다.</p>
      )}
      <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600">
        본 점수는 실제 유모차 통행 가능 여부를 확정하는 지표가 아니라, 공개데이터 기반 생활시설 접근성을 비교하기 위한 시각화 지표입니다. 실제 현장 여건은 보도 폭, 단차, 공사, 불법주정차, 시설 운영시간 등에 따라 달라질 수 있습니다.
      </p>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md bg-slate-50 px-3 py-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}
