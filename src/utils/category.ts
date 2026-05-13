import { CATEGORY_DEFINITIONS } from "../config/categories";
import type { CategoryId, DistrictScore } from "../types/data";

export type OverviewCategoryId = "overall" | CategoryId;
export type DistrictScoreKey = "overall_score" | "medical_score" | "admin_score" | "education_score" | "leisure_score";

export const OVERVIEW_CATEGORY_OPTIONS: Array<{
  id: OverviewCategoryId;
  label: string;
  scoreKey: DistrictScoreKey;
  color: "indigo" | "rose" | "blue" | "amber" | "emerald";
  description: string;
}> = [
  {
    id: "overall",
    label: "통합",
    scoreKey: "overall_score",
    color: "indigo",
    description: "의료, 교육, 행정, 여가 접근성을 종합해 아이동반 생활시설 접근성을 비교합니다.",
  },
  {
    id: "medical",
    label: "의료",
    scoreKey: "medical_score",
    color: "rose",
    description: CATEGORY_DEFINITIONS[0].description,
  },
  {
    id: "administration",
    label: "행정",
    scoreKey: "admin_score",
    color: "blue",
    description: CATEGORY_DEFINITIONS[1].description,
  },
  {
    id: "education",
    label: "교육",
    scoreKey: "education_score",
    color: "amber",
    description: CATEGORY_DEFINITIONS[2].description,
  },
  {
    id: "leisure",
    label: "여가",
    scoreKey: "leisure_score",
    color: "emerald",
    description: CATEGORY_DEFINITIONS[3].description,
  },
];

export function getOverviewCategory(id: OverviewCategoryId) {
  return OVERVIEW_CATEGORY_OPTIONS.find((category) => category.id === id) ?? OVERVIEW_CATEGORY_OPTIONS[0];
}

export function getScoreForCategory(score: DistrictScore, categoryId: OverviewCategoryId): number | null {
  return score[getOverviewCategory(categoryId).scoreKey] ?? null;
}

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  medical: "의료",
  administration: "행정",
  education: "교육",
  leisure: "여가",
};

export const FACILITY_TYPE_OPTIONS: Record<CategoryId, Array<{ id: string; label: string }>> = {
  medical: [
    { id: "pediatric_clinic", label: "소아청소년과" },
    { id: "family_medicine", label: "가정의학과" },
    { id: "general_hospital", label: "종합병원/대학병원" },
  ],
  administration: [
    { id: "community_center", label: "주민센터" },
    { id: "district_office", label: "구청" },
    { id: "city_hall", label: "시청" },
  ],
  education: [
    { id: "childcare_center", label: "어린이집" },
    { id: "kindergarten", label: "유치원" },
  ],
  leisure: [
    { id: "park", label: "공원" },
    { id: "library_culture", label: "도서관/문화시설" },
    { id: "large_retail_optional", label: "대형상업시설" },
  ],
};

export function getFacilityTypeLabel(type: string | null | undefined): string {
  for (const options of Object.values(FACILITY_TYPE_OPTIONS)) {
    const found = options.find((option) => option.id === type);
    if (found) return found.label;
  }
  return type ?? "시설 유형 없음";
}
