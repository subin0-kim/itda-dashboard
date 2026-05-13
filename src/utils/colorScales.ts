import type { ExpressionSpecification } from "maplibre-gl";
import type { OverviewCategoryId } from "./category";

export const SCORE_BUCKETS = [
  { min: 80, max: 100, label: "매우 높음" },
  { min: 60, max: 80, label: "높음" },
  { min: 40, max: 60, label: "보통" },
  { min: 20, max: 40, label: "낮음" },
  { min: 0, max: 20, label: "매우 낮음" },
] as const;

export const SCORE_COLORS: Record<OverviewCategoryId, string[]> = {
  overall: ["#eef2ff", "#c7d2fe", "#818cf8", "#4f46e5", "#312e81"],
  medical: ["#fff1f2", "#fecdd3", "#fb7185", "#e11d48", "#881337"],
  administration: ["#eff6ff", "#bfdbfe", "#60a5fa", "#2563eb", "#1e3a8a"],
  education: ["#fffbeb", "#fde68a", "#fbbf24", "#d97706", "#78350f"],
  leisure: ["#ecfdf5", "#a7f3d0", "#34d399", "#059669", "#064e3b"],
};

export const NO_DATA_COLOR = "#cbd5e1";

export function getScoreBucket(score: number | null | undefined): number | null {
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  if (score >= 80) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  if (score >= 20) return 1;
  return 0;
}

export function getScoreLabel(score: number | null | undefined): string {
  const bucket = getScoreBucket(score);
  if (bucket === null) return "데이터 없음";
  return SCORE_BUCKETS[4 - bucket].label;
}

export function getScoreColor(score: number | null | undefined, categoryId: OverviewCategoryId): string {
  const bucket = getScoreBucket(score);
  return bucket === null ? NO_DATA_COLOR : SCORE_COLORS[categoryId][bucket];
}

export function getMapLibreScoreExpression(categoryId: OverviewCategoryId): ExpressionSpecification {
  const colors = SCORE_COLORS[categoryId];
  return [
    "case",
    ["!", ["has", "selected_score"]],
    NO_DATA_COLOR,
    ["==", ["get", "selected_score"], null],
    NO_DATA_COLOR,
    ["step", ["to-number", ["get", "selected_score"]], colors[0], 20, colors[1], 40, colors[2], 60, colors[3], 80, colors[4]],
  ];
}
