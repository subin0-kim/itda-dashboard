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

const RAMP_STOP_SCORES = [0, 10, 20, 30, 40, 50, 60, 70, 80, 100];

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const num = parseInt(value, 16);
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function colorAtScore(score: number, colors: string[]): string {
  if (score <= RAMP_STOP_SCORES[0]) return colors[0];
  if (score >= RAMP_STOP_SCORES[RAMP_STOP_SCORES.length - 1]) return colors[colors.length - 1];
  for (let i = 1; i < RAMP_STOP_SCORES.length; i += 1) {
    if (score <= RAMP_STOP_SCORES[i]) {
      const lo = RAMP_STOP_SCORES[i - 1];
      const hi = RAMP_STOP_SCORES[i];
      const t = (score - lo) / (hi - lo);
      const a = hexToRgb(colors[i - 1]);
      const b = hexToRgb(colors[i]);
      return rgbToHex([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
    }
  }
  return colors[colors.length - 1];
}

export const SCORE_STEP_SIZE = 5;

export function getMapLibreScoreExpression(categoryId: OverviewCategoryId): ExpressionSpecification {
  const colors = SCORE_RAMP_COLORS[categoryId];
  const stepStops: (string | number)[] = [];
  for (let score = SCORE_STEP_SIZE; score <= 100; score += SCORE_STEP_SIZE) {
    stepStops.push(score, colorAtScore(score, colors));
  }
  return [
    "case",
    ["!", ["has", "selected_score"]],
    NO_DATA_COLOR,
    ["==", ["get", "selected_score"], null],
    NO_DATA_COLOR,
    [
      "step",
      ["to-number", ["get", "selected_score"]],
      colorAtScore(0, colors),
      ...stepStops,
    ],
  ] as ExpressionSpecification;
}
