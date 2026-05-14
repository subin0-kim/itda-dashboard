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

// 색 램프는 ColorBrewer 9-class sequential 팔레트를 10단계로 확장한 형태.
// 다중 hue 변화를 사용해 점수 간 차이가 시각적으로 분명해지도록 하고,
// 상위 점수도 채도 높은 vivid 색으로 표현하여 거의 검정색이 되지 않게 한다.
export const SCORE_RAMP_COLORS: Record<OverviewCategoryId, string[]> = {
  // YlGnBu-inspired (light yellow → teal → indigo)
  overall: [
    "#fff7bc",
    "#feeaa1",
    "#fed976",
    "#ffd166",
    "#f7b801",
    "#f18701",
    "#f35b04",
    "#d62828",
    "#9d0208",
    "#6a040f",
  ],
  // YlOrRd-style warm health palette
  medical: [
    "#fff5eb",
    "#fee6ce",
    "#fdd0a2",
    "#fdae6b",
    "#fd8d3c",
    "#f16913",
    "#d94801",
    "#a63603",
    "#7f2704",
    "#5a1c03",
  ],
  // Blues (light cyan → mid blue → deep navy, but not black)
  administration: [
    "#f0f9ff",
    "#cfe8ff",
    "#a6d4ff",
    "#7ab8ff",
    "#4f9bff",
    "#2563eb",
    "#1d4ed8",
    "#1e40af",
    "#1e3a8a",
    "#172554",
  ],
  // YlOrBr-style warm amber → brown
  education: [
    "#fffbe6",
    "#fff1a8",
    "#fde047",
    "#facc15",
    "#eab308",
    "#ca8a04",
    "#a16207",
    "#854d0e",
    "#713f12",
    "#582f0a",
  ],
  // YlGn-style yellow-green → deep teal
  leisure: [
    "#f7fcb9",
    "#d9f0a3",
    "#addd8e",
    "#78c679",
    "#41ab5d",
    "#238443",
    "#1d6b3a",
    "#155d3a",
    "#0f4b34",
    "#0a3b29",
  ],
};

// 격자/구 점수 분포가 60~90 구간에 몰려 있어, 그 구간에 더 많은 컬러 스텝을
// 할당한다. 0~50 구간은 데이터가 적으므로 색 변화를 좁히고, 60~90 구간을 더 펼친다.
const RAMP_STOP_SCORES = [0, 30, 45, 55, 62, 68, 74, 80, 87, 100];

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
