import type { ExpressionSpecification } from "maplibre-gl";
import type { OverviewCategoryId } from "./category";

export const SCORE_BUCKETS = [
  { min: 80, max: 100, label: "매우 높음" },
  { min: 60, max: 80, label: "높음" },
  { min: 40, max: 60, label: "보통" },
  { min: 20, max: 40, label: "낮음" },
  { min: 0, max: 20, label: "매우 낮음" },
] as const;

export const NO_DATA_COLOR = "#cbd5e1";

// 카테고리별 브랜드 hue에서 lightness/saturation을 단계적으로 낮춰 만든 10단계 sequential 램프.
// 상위 점수는 카테고리 hue가 분명히 살아있는 vivid한 톤으로 끝나며 검정 근처로 가지 않는다.
// 인접 stop 간 lightness 차이를 6~10%로 유지해 채도/명도 차이가 명확히 보이도록 한다.
export const SCORE_RAMP_COLORS: Record<OverviewCategoryId, string[]> = {
  // 보라 (Tailwind purple 50→900)
  overall: [
    "#faf5ff",
    "#f3e8ff",
    "#e9d5ff",
    "#d8b4fe",
    "#c084fc",
    "#a855f7",
    "#9333ea",
    "#7e22ce",
    "#6b21a8",
    "#581c87",
  ],
  // 빨강 (Tailwind red 50→900)
  medical: [
    "#fef2f2",
    "#fee2e2",
    "#fecaca",
    "#fca5a5",
    "#f87171",
    "#ef4444",
    "#dc2626",
    "#b91c1c",
    "#991b1b",
    "#7f1d1d",
  ],
  // 파랑 (Tailwind blue 50→900)
  administration: [
    "#eff6ff",
    "#dbeafe",
    "#bfdbfe",
    "#93c5fd",
    "#60a5fa",
    "#3b82f6",
    "#2563eb",
    "#1d4ed8",
    "#1e40af",
    "#1e3a8a",
  ],
  // 노랑 → 황금색 (Tailwind 기반 + 갈색으로 가지 않게 골드로 마감)
  education: [
    "#fefce8",
    "#fef9c3",
    "#fef08a",
    "#fde047",
    "#facc15",
    "#eab308",
    "#ca8a04",
    "#a78201",
    "#8f6f00",
    "#785a00",
  ],
  // 초록 (Tailwind green 50→900)
  leisure: [
    "#f0fdf4",
    "#dcfce7",
    "#bbf7d0",
    "#86efac",
    "#4ade80",
    "#22c55e",
    "#16a34a",
    "#15803d",
    "#166534",
    "#14532d",
  ],
};

// 도보 네트워크 우회 fallback 보정 후 격자/구 점수 분포는 75~95 구간에 몰려 있다.
// 해당 구간에 컬러 stop을 더 촘촘히 배치해 5점 단위 색 차이가 시각적으로 분명히 보이게 한다.
const RAMP_STOP_SCORES = [0, 30, 50, 65, 75, 82, 87, 91, 94, 100];

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const num = parseInt(value, 16);
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
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
      return rgbToHex([
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
      ]);
    }
  }
  return colors[colors.length - 1];
}

// 20점 단위 범례 밴드의 대표색은 각 밴드 중앙 점수의 컬러를 사용해 지도와 일치시킨다.
const LEGEND_BAND_MIDPOINTS = [10, 30, 50, 70, 90];

export const SCORE_COLORS: Record<OverviewCategoryId, string[]> = (() => {
  const result = {} as Record<OverviewCategoryId, string[]>;
  (Object.keys(SCORE_RAMP_COLORS) as OverviewCategoryId[]).forEach((category) => {
    const ramp = SCORE_RAMP_COLORS[category];
    result[category] = LEGEND_BAND_MIDPOINTS.map((score) => colorAtScore(score, ramp));
  });
  return result;
})();

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
