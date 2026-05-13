import type { DistrictScore } from "../types/data";
import type { DistrictScoreKey } from "./category";

export function getNumericScore(score: DistrictScore, scoreKey: DistrictScoreKey): number | null {
  const value = score[scoreKey];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function getSortedDistrictsByScore(scores: DistrictScore[], scoreKey: DistrictScoreKey, direction: "desc" | "asc" = "desc") {
  return [...scores]
    .filter((score) => getNumericScore(score, scoreKey) !== null)
    .sort((a, b) => {
      const aScore = getNumericScore(a, scoreKey) ?? 0;
      const bScore = getNumericScore(b, scoreKey) ?? 0;
      return direction === "desc" ? bScore - aScore : aScore - bScore;
    });
}

export function getTopAndBottomDistricts(scores: DistrictScore[], scoreKey: DistrictScoreKey, count = 5) {
  return {
    top: getSortedDistrictsByScore(scores, scoreKey, "desc").slice(0, count),
    bottom: getSortedDistrictsByScore(scores, scoreKey, "asc").slice(0, count),
  };
}
