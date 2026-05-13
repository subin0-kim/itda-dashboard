import type { DistrictScore } from "../types/data";
import type { DistrictScoreKey } from "./category";
import { getNumericScore } from "./ranking";

export interface ScoreStatistics {
  average: number | null;
  max: number | null;
  min: number | null;
  gap: number | null;
  standardDeviation: number | null;
  availableCount: number;
  missingCount: number;
}

export function calculateScoreStatistics(scores: DistrictScore[], scoreKey: DistrictScoreKey): ScoreStatistics {
  const values = scores.map((score) => getNumericScore(score, scoreKey)).filter((value): value is number => value !== null);
  const missingCount = scores.length - values.length;
  if (values.length === 0) {
    return {
      average: null,
      max: null,
      min: null,
      gap: null,
      standardDeviation: null,
      availableCount: 0,
      missingCount,
    };
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;

  return {
    average,
    max,
    min,
    gap: max - min,
    standardDeviation: Math.sqrt(variance),
    availableCount: values.length,
    missingCount,
  };
}
