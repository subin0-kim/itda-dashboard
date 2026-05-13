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

export const SCORE_RAMP_COLORS: Record<OverviewCategoryId, string[]> = {
  overall: ["#eef2ff", "#e0e7ff", "#c7d2fe", "#a5b4fc", "#818cf8", "#6366f1", "#4f46e5", "#4338ca", "#3730a3", "#312e81"],
  medical: ["#fff1f2", "#ffe4e6", "#fecdd3", "#fda4af", "#fb7185", "#f43f5e", "#e11d48", "#be123c", "#9f1239", "#881337"],
  administration: ["#eff6ff", "#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#1e40af", "#1e3a8a"],
  education: ["#fffbeb", "#fef3c7", "#fde68a", "#fcd34d", "#fbbf24", "#f59e0b", "#d97706", "#b45309", "#92400e", "#78350f"],
  leisure: ["#ecfdf5", "#d1fae5", "#a7f3d0", "#6ee7b7", "#34d399", "#10b981", "#059669", "#047857", "#065f46", "#064e3b"],
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
  const colors = SCORE_RAMP_COLORS[categoryId];
  return [
    "case",
    ["!", ["has", "selected_score"]],
    NO_DATA_COLOR,
    ["==", ["get", "selected_score"], null],
    NO_DATA_COLOR,
    [
      "interpolate",
      ["linear"],
      ["to-number", ["get", "selected_score"]],
      0,
      colors[0],
      10,
      colors[1],
      20,
      colors[2],
      30,
      colors[3],
      40,
      colors[4],
      50,
      colors[5],
      60,
      colors[6],
      70,
      colors[7],
      80,
      colors[8],
      100,
      colors[9],
    ],
  ];
}
