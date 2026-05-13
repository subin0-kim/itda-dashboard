import { Activity, BarChart3, TrendingDown, Trophy } from "lucide-react";
import type { DistrictScore } from "../../types/data";
import { formatScore } from "../../utils/format";
import { getAverageScore, getHighestDistrict, getLargestGapCategory, getLowestDistrict } from "../../utils/scoring";

export function KpiCards({ scores }: { scores: DistrictScore[] | null }) {
  const average = scores ? getAverageScore(scores) : null;
  const highest = scores ? getHighestDistrict(scores) : null;
  const lowest = scores ? getLowestDistrict(scores) : null;
  const largestGap = scores ? getLargestGapCategory(scores) : null;

  const cards = [
    {
      title: "서울 평균 점수",
      value: formatScore(average),
      subtext: "구별 통합 점수 평균",
      icon: Activity,
    },
    {
      title: "최고 점수 구",
      value: highest?.district_name ?? "계산 불가",
      subtext: formatScore(highest?.overall_score),
      icon: Trophy,
    },
    {
      title: "개선 여지 큰 구",
      value: lowest?.district_name ?? "계산 불가",
      subtext: formatScore(lowest?.overall_score),
      icon: TrendingDown,
    },
    {
      title: "가장 격차가 큰 카테고리",
      value: largestGap ?? "계산 불가",
      subtext: "구별 점수 표준편차 기준",
      icon: BarChart3,
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.title} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-slate-500">{card.title}</div>
                <div className="mt-3 text-xl font-semibold text-slate-950">{card.value}</div>
                <div className="mt-1 text-xs text-slate-500">{card.subtext}</div>
              </div>
              <div className="rounded-md bg-slate-100 p-2 text-slate-500">
                <Icon size={18} aria-hidden="true" />
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
