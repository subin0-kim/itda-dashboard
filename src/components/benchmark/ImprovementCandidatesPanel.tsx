import { Link } from "react-router-dom";
import type { DistrictScore } from "../../types/data";
import { CATEGORY_LABELS } from "../../utils/category";
import { formatScore } from "../../utils/format";
import { getSortedDistrictsByScore } from "../../utils/ranking";

interface ImprovementCandidatesPanelProps {
  districts: DistrictScore[];
}

export function ImprovementCandidatesPanel({ districts }: ImprovementCandidatesPanelProps) {
  const items = getSortedDistrictsByScore(districts, "overall_score", "asc").slice(0, 5);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">개선 여지가 큰 구 빠른 탐색</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">구별 점수 데이터가 필요합니다.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {items.map((district) => (
            <div key={district.district_code || district.district_name} className="rounded-md border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{district.district_name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    통합 {formatScore(district.overall_score)} · 개선 여지 {district.weakest_category ? CATEGORY_LABELS[district.weakest_category] : "데이터 없음"}
                  </p>
                </div>
                <Link
                  to={`/benchmark?district=${encodeURIComponent(district.district_code || district.district_name)}`}
                  className="shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  벤치마킹 보기
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
