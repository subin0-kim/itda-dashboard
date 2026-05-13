import type { BenchmarkRecommendation, CategoryId, DistrictScore } from "../types/data";
import { CATEGORY_LABELS, type DistrictScoreKey } from "./category";
import { getNumericScore } from "./ranking";

export type BenchmarkSortKey =
  | "rank"
  | "overall_asc"
  | "overall_desc"
  | "medical_asc"
  | "education_asc"
  | "admin_asc"
  | "leisure_asc";

export const BENCHMARK_CATEGORY_ORDER: Array<{ id: CategoryId; label: string; scoreKey: DistrictScoreKey; gapKey: string; alternateGapKey?: string }> = [
  { id: "medical", label: "의료", scoreKey: "medical_score", gapKey: "medical_gap" },
  { id: "education", label: "교육", scoreKey: "education_score", gapKey: "education_gap" },
  { id: "administration", label: "행정", scoreKey: "admin_score", gapKey: "administration_gap", alternateGapKey: "admin_gap" },
  { id: "leisure", label: "여가", scoreKey: "leisure_score", gapKey: "leisure_gap" },
];

const SORT_CONFIG: Record<BenchmarkSortKey, { label: string; scoreKey?: DistrictScoreKey; direction: "asc" | "desc"; rank?: boolean }> = {
  rank: { label: "전체 순위", direction: "asc", rank: true },
  overall_asc: { label: "점수 낮은 순", scoreKey: "overall_score", direction: "asc" },
  overall_desc: { label: "점수 높은 순", scoreKey: "overall_score", direction: "desc" },
  medical_asc: { label: "의료 점수 낮은 순", scoreKey: "medical_score", direction: "asc" },
  education_asc: { label: "교육 점수 낮은 순", scoreKey: "education_score", direction: "asc" },
  admin_asc: { label: "행정 점수 낮은 순", scoreKey: "admin_score", direction: "asc" },
  leisure_asc: { label: "여가 점수 낮은 순", scoreKey: "leisure_score", direction: "asc" },
};

export const BENCHMARK_SORT_OPTIONS = Object.entries(SORT_CONFIG).map(([id, config]) => ({
  id: id as BenchmarkSortKey,
  label: config.label,
}));

export function findDistrictById(scores: DistrictScore[], districtId: string | null | undefined): DistrictScore | null {
  if (!districtId) return null;
  const decoded = decodeURIComponent(districtId);
  return (
    scores.find((district) => district.district_code === districtId) ??
    scores.find((district) => district.district_name === districtId) ??
    scores.find((district) => district.district_name === decoded) ??
    null
  );
}

export function sortDistrictsForBenchmark(scores: DistrictScore[], sortKey: BenchmarkSortKey): DistrictScore[] {
  const config = SORT_CONFIG[sortKey];
  return [...scores].sort((a, b) => {
    if (config.rank) return comparableRank(a.rank) - comparableRank(b.rank);
    const scoreKey = config.scoreKey ?? "overall_score";
    const aScore = getNumericScore(a, scoreKey);
    const bScore = getNumericScore(b, scoreKey);
    const aValue = aScore ?? (config.direction === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
    const bValue = bScore ?? (config.direction === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
    return config.direction === "asc" ? aValue - bValue : bValue - aValue;
  });
}

export function findRecommendationForDistrict(recommendations: BenchmarkRecommendation[], district: DistrictScore | null) {
  if (!district) return null;
  return (
    recommendations.find((item) => item.district_code === district.district_code && district.district_code) ??
    recommendations.find((item) => item.district_name === district.district_name && district.district_name) ??
    null
  );
}

export function findBenchmarkDistrict(scores: DistrictScore[], recommendation: BenchmarkRecommendation | null) {
  if (!recommendation) return null;
  return (
    scores.find((district) => district.district_code === recommendation.benchmark_district_code && recommendation.benchmark_district_code) ??
    scores.find((district) => district.district_name === recommendation.benchmark_district_name && recommendation.benchmark_district_name) ??
    null
  );
}

export function getWeakCategoryLabel(category: CategoryId | null | undefined) {
  return category ? CATEGORY_LABELS[category] : "데이터 없음";
}

export function getCategoryGap(
  selected: DistrictScore | null,
  benchmark: DistrictScore | null,
  recommendation: BenchmarkRecommendation | null,
  categoryId: CategoryId,
): number | null {
  const category = BENCHMARK_CATEGORY_ORDER.find((item) => item.id === categoryId);
  const comparison = recommendation?.comparison as Record<string, unknown> | undefined;
  const fromRecommendation = category ? comparison?.[category.gapKey] ?? comparison?.[category.alternateGapKey ?? ""] : null;
  if (typeof fromRecommendation === "number" && Number.isFinite(fromRecommendation)) return fromRecommendation;
  const scoreKey = category?.scoreKey;
  if (!scoreKey || !selected || !benchmark) return null;
  const selectedScore = getNumericScore(selected, scoreKey);
  const benchmarkScore = getNumericScore(benchmark, scoreKey);
  if (selectedScore === null || benchmarkScore === null) return null;
  return benchmarkScore - selectedScore;
}

export function buildImprovementHints(selected: DistrictScore | null, benchmark: DistrictScore | null, recommendation: BenchmarkRecommendation | null) {
  if (!selected || !benchmark) return ["개선 힌트를 생성하기 위한 데이터가 부족합니다."];
  const weakCategory = recommendation?.weak_category ?? selected.weakest_category ?? null;
  const weakLabel = getWeakCategoryLabel(weakCategory);
  const gaps = BENCHMARK_CATEGORY_ORDER.map((category) => ({
    ...category,
    gap: getCategoryGap(selected, benchmark, recommendation, category.id),
  })).filter((item) => typeof item.gap === "number") as Array<(typeof BENCHMARK_CATEGORY_ORDER)[number] & { gap: number }>;
  const largest = gaps.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))[0];

  const hints = [
    `선택한 구는 공개데이터 기준으로 ${weakLabel} 접근성에서 개선 여지가 크게 나타났습니다.`,
  ];
  if (largest && largest.gap > 0) {
    hints.push(`${largest.label} 접근 점수가 추천 구보다 ${largest.gap.toFixed(1)}점 낮게 나타났습니다. 관련 생활시설 접근성이 낮은 생활권을 우선적으로 확인할 수 있습니다.`);
  } else if (largest) {
    hints.push(`${largest.label} 접근 점수 차이는 크지 않게 나타났습니다. 다른 카테고리의 격자별 편차를 함께 검토할 수 있습니다.`);
  } else {
    hints.push("추천 구와의 카테고리 점수 차이를 계산할 데이터가 부족합니다.");
  }
  hints.push("이 제안은 공개데이터 기반 비교 결과이며, 실제 개선 방안은 현장 여건과 세부 사업 조건을 함께 검토해야 합니다.");
  return hints;
}

function comparableRank(rank: number | null | undefined) {
  return typeof rank === "number" && Number.isFinite(rank) ? rank : Number.POSITIVE_INFINITY;
}
