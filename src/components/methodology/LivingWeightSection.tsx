import type { Metadata } from "../../types/data";
import {
  getAggregationMethodLabel,
  getLivingWeightStatusLabel,
  isLivingWeightApplied,
} from "../../utils/metadata";

interface LivingWeightSectionProps {
  metadata: Metadata | null;
}

export function LivingWeightSection({ metadata }: LivingWeightSectionProps) {
  const aggregationMethod = metadata?.aggregation_method ?? "simple_average";
  const livingWeightStatus = metadata?.living_weight_status ?? "unavailable";
  const applied = isLivingWeightApplied(metadata);
  const note =
    typeof metadata?.origin_destination_role_note === "string" && metadata.origin_destination_role_note.trim()
      ? metadata.origin_destination_role_note
      : "공원은 여가 카테고리의 주요 목적지로 계속 사용합니다. 다만 공원 내부 격자는 실제 주거·생활 출발지로 보기 어렵기 때문에, 구별 평균 산정 시 LivingWeight를 낮게 적용하거나 제외합니다.";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">생활 출발지 가중 평균 보정</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        서울의 자치구 면적에는 공원, 녹지, 하천, 산지, 임야처럼 실제 주거·생활 출발지로 보기 어려운 공간이 포함될 수 있습니다.
        본 결과물은 용도지역 등 공간데이터가 제공되는 경우, 각 250m 격자의 생활가능면적 비율을 LivingWeight로 계산하여 구별 점수를 가중 평균합니다.
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{note}</p>

      <div className="mt-4 rounded-md bg-slate-50 p-3 font-mono text-xs leading-5 text-slate-700">
        DistrictStrollerScore(d) = Σ GridStrollerScore(g) × LivingWeight(g) / Σ LivingWeight(g)
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        생활 출발지 가중치 계산에 필요한 용도지역/토지이용 데이터가 없는 경우, 구별 점수는 기존의 단순 평균으로 계산됩니다.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div
          className={[
            "rounded-md p-3 text-sm",
            applied
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border border-slate-200 bg-slate-50 text-slate-700",
          ].join(" ")}
        >
          <div className="text-xs font-semibold uppercase tracking-wide opacity-70">현재 적용 집계 방식</div>
          <div className="mt-1 font-medium">{getAggregationMethodLabel(aggregationMethod)}</div>
        </div>
        <div
          className={[
            "rounded-md p-3 text-sm",
            applied
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border border-amber-200 bg-amber-50 text-amber-900",
          ].join(" ")}
        >
          <div className="text-xs font-semibold uppercase tracking-wide opacity-70">LivingWeight 상태</div>
          <div className="mt-1 font-medium">{getLivingWeightStatusLabel(livingWeightStatus)}</div>
        </div>
      </div>

      {Array.isArray(metadata?.living_weight_limitations) && metadata.living_weight_limitations.length > 0 ? (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-slate-500">
          {metadata.living_weight_limitations.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
