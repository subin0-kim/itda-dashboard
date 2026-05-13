import type { CategoryId, DistrictScore } from "../types/data";
import type { GeoJsonFeatureCollection } from "../types/geojson";
import type { OverviewCategoryId } from "./category";
import { CATEGORY_LABELS, getOverviewCategory } from "./category";
import { readGridScores } from "./district";

export interface GridSummary {
  gridCount: number;
  calculableGridCount: number;
  averageScore: number | null;
  lowestCategory: string | null;
  highestCategory: string | null;
  under40Ratio: number | null;
  over80Ratio: number | null;
}

export function getCategoryAverages(scores: DistrictScore[]) {
  return {
    medical: average(scores.map((score) => score.medical_score)),
    administration: average(scores.map((score) => score.admin_score)),
    education: average(scores.map((score) => score.education_score)),
    leisure: average(scores.map((score) => score.leisure_score)),
  };
}

export function getGridSummary(grids: GeoJsonFeatureCollection, categoryId: OverviewCategoryId): GridSummary {
  const key = getOverviewCategory(categoryId).scoreKey;
  const values = grids.features.map((feature) => readGridScores(feature.properties ?? {})[key]).filter(isNumber);
  const categoryAverages = [
    { label: CATEGORY_LABELS.medical, value: average(grids.features.map((feature) => readGridScores(feature.properties ?? {}).medical_score)) },
    { label: CATEGORY_LABELS.administration, value: average(grids.features.map((feature) => readGridScores(feature.properties ?? {}).admin_score)) },
    { label: CATEGORY_LABELS.education, value: average(grids.features.map((feature) => readGridScores(feature.properties ?? {}).education_score)) },
    { label: CATEGORY_LABELS.leisure, value: average(grids.features.map((feature) => readGridScores(feature.properties ?? {}).leisure_score)) },
  ].filter((item): item is { label: string; value: number } => isNumber(item.value));

  return {
    gridCount: grids.features.length,
    calculableGridCount: values.length,
    averageScore: average(values),
    lowestCategory: categoryAverages.length ? [...categoryAverages].sort((a, b) => a.value - b.value)[0].label : null,
    highestCategory: categoryAverages.length ? [...categoryAverages].sort((a, b) => b.value - a.value)[0].label : null,
    under40Ratio: values.length ? values.filter((value) => value < 40).length / values.length : null,
    over80Ratio: values.length ? values.filter((value) => value >= 80).length / values.length : null,
  };
}

export function getCategoryDifference(score: number | null, averageScore: number | null): number | null {
  if (!isNumber(score) || !isNumber(averageScore)) return null;
  return score - averageScore;
}

function average(values: Array<number | null>): number | null {
  const numeric = values.filter(isNumber);
  if (!numeric.length) return null;
  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
}

function isNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
