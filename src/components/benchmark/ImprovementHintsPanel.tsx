import type { BenchmarkRecommendation, DistrictScore } from "../../types/data";
import { buildImprovementHints } from "../../utils/benchmark";

interface ImprovementHintsPanelProps {
  selectedDistrict: DistrictScore | null;
  benchmarkDistrict: DistrictScore | null;
  recommendation: BenchmarkRecommendation | null;
}

export function ImprovementHintsPanel({ selectedDistrict, benchmarkDistrict, recommendation }: ImprovementHintsPanelProps) {
  const hints = buildImprovementHints(selectedDistrict, benchmarkDistrict, recommendation);
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">개선 힌트</h2>
      <div className="mt-4 space-y-2">
        {hints.map((hint) => (
          <p key={hint} className="rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600">
            {hint}
          </p>
        ))}
      </div>
    </section>
  );
}
