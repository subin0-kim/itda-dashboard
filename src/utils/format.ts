export function formatScore(score: number | null | undefined): string {
  if (typeof score !== "number" || Number.isNaN(score)) {
    return "계산 불가";
  }
  return `${score.toFixed(1)}점`;
}

export function formatRank(rank: number | null | undefined): string {
  if (typeof rank !== "number" || Number.isNaN(rank)) {
    return "계산 불가";
  }
  return `${rank}위`;
}
