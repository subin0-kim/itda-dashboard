import type { CategoryId, DistrictScore } from "../types/data";
import type { OverviewCategoryId } from "./category";
import { getScoreForCategory } from "./category";
import { getDistrictCode, getDistrictName, getOverallScore, normalizeCategory, readNumber } from "./dataAccess";

const CATEGORY_SCORE_KEYS = [
  { id: "medical" as CategoryId, label: "의료", key: "medical_score" as const },
  { id: "administration" as CategoryId, label: "행정", key: "admin_score" as const },
  { id: "education" as CategoryId, label: "교육", key: "education_score" as const },
  { id: "leisure" as CategoryId, label: "여가", key: "leisure_score" as const },
];

export function normalizeDistrictScore(input: Partial<DistrictScore> & Record<string, unknown>): DistrictScore {
  return {
    district_code: getDistrictCode(input),
    district_name: getDistrictName(input),
    overall_score: getOverallScore(input),
    rank: readNumber(input.rank),
    medical_score: readNumber(input.medical_score),
    admin_score: readNumber(input.admin_score ?? input.administration_score),
    education_score: readNumber(input.education_score),
    leisure_score: readNumber(input.leisure_score),
    weakest_category: normalizeCategory(input.weakest_category),
    strongest_category: normalizeCategory(input.strongest_category),
  };
}

export function getRankedDistricts(scores: DistrictScore[], categoryId: OverviewCategoryId): DistrictScore[] {
  return [...scores]
    .filter((score) => typeof getScoreForCategory(score, categoryId) === "number")
    .sort((a, b) => (getScoreForCategory(b, categoryId) ?? -1) - (getScoreForCategory(a, categoryId) ?? -1));
}

export function getAverageScore(scores: DistrictScore[]): number | null {
  const values = scores.map((score) => score.overall_score).filter(isNumber);
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function getHighestDistrict(scores: DistrictScore[]): DistrictScore | null {
  return getRankedDistricts(scores, "overall")[0] ?? null;
}

export function getLowestDistrict(scores: DistrictScore[]): DistrictScore | null {
  const ranked = getRankedDistricts(scores, "overall");
  return ranked[ranked.length - 1] ?? null;
}

export function getLargestGapCategory(scores: DistrictScore[]): string | null {
  const deviations = CATEGORY_SCORE_KEYS.map((category) => {
    const values = scores.map((score) => score[category.key]).filter(isNumber);
    return { label: category.label, deviation: standardDeviation(values) };
  }).filter((item) => item.deviation !== null);

  if (deviations.length === 0) return null;
  deviations.sort((a, b) => (b.deviation ?? 0) - (a.deviation ?? 0));
  return deviations[0].label;
}

function standardDeviation(values: number[]): number | null {
  if (values.length === 0) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function isNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
