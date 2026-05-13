import type { CategoryDefinition } from "../types/scoring";

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    id: "medical",
    label: "의료",
    shortLabel: "의료",
    description: "소아청소년과, 가정의학과, 종합병원 접근성을 중심으로 아이동반 의료 접근성을 살펴봅니다.",
    colorClass: "text-rose-700 bg-rose-50 border-rose-200",
    scoreKey: "medical_score",
  },
  {
    id: "administration",
    label: "행정",
    shortLabel: "행정",
    description: "주민센터, 구청, 시청 접근성을 중심으로 가족 행정서비스 접근성을 살펴봅니다.",
    colorClass: "text-blue-700 bg-blue-50 border-blue-200",
    scoreKey: "admin_score",
  },
  {
    id: "education",
    label: "교육",
    shortLabel: "교육",
    description: "어린이집과 유치원 접근성을 중심으로 영유아 교육·돌봄 접근성을 살펴봅니다.",
    colorClass: "text-amber-700 bg-amber-50 border-amber-200",
    scoreKey: "education_score",
  },
  {
    id: "leisure",
    label: "여가",
    shortLabel: "여가",
    description: "공원, 도서관/문화시설, 대형상업시설 접근성을 중심으로 아이와 함께하는 여가 접근성을 살펴봅니다.",
    colorClass: "text-emerald-700 bg-emerald-50 border-emerald-200",
    scoreKey: "leisure_score",
  },
];

export const OVERALL_CATEGORY = {
  id: "overall",
  label: "통합",
  colorClass: "text-indigo-700 bg-indigo-50 border-indigo-200",
} as const;

export function getCategoryDefinition(id: string | undefined) {
  return CATEGORY_DEFINITIONS.find((category) => category.id === id);
}
