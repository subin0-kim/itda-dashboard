import type { DistrictScore } from "../types/data";
import type { GeoJsonFeature, GeoJsonFeatureCollection, GeoJsonProperties } from "../types/geojson";
import type { OverviewCategoryId } from "./category";
import { getScoreForCategory } from "./category";
import { getDistrictCode, getDistrictName } from "./dataAccess";

export function buildDistrictScoreLookup(scores: DistrictScore[]) {
  const byCode = new Map<string, DistrictScore>();
  const byName = new Map<string, DistrictScore>();
  for (const score of scores) {
    if (score.district_code) byCode.set(score.district_code, score);
    if (score.district_name) byName.set(score.district_name, score);
  }
  return { byCode, byName };
}

export function mergeDistrictScores(
  districts: GeoJsonFeatureCollection,
  scores: DistrictScore[],
  categoryId: OverviewCategoryId,
): GeoJsonFeatureCollection {
  const lookup = buildDistrictScoreLookup(scores);
  return {
    ...districts,
    features: districts.features.map((feature, index) => {
      const districtCode = readDistrictCode(feature.properties);
      const districtName = readDistrictName(feature.properties);
      const score = (districtCode ? lookup.byCode.get(districtCode) : undefined) ?? (districtName ? lookup.byName.get(districtName) : undefined);
      const selectedScore = score ? getScoreForCategory(score, categoryId) : null;
      return {
        ...feature,
        id: districtCode || districtName || index,
        properties: {
          ...feature.properties,
          district_code: districtCode,
          district_name: districtName,
          selected_score: selectedScore,
          selected_score_label: typeof selectedScore === "number" ? selectedScore.toFixed(1) : "점수 없음",
          rank: score?.rank ?? null,
          strongest_category: score?.strongest_category ?? null,
          weakest_category: score?.weakest_category ?? null,
        },
      };
    }),
  };
}

export function readDistrictCode(properties: GeoJsonProperties | undefined): string {
  return getDistrictCode(properties);
}

export function readDistrictName(properties: GeoJsonProperties | undefined): string {
  return getDistrictName(properties);
}

export function getGeoJsonBounds(collection: GeoJsonFeatureCollection): [[number, number], [number, number]] | null {
  const coords: Array<[number, number]> = [];
  for (const feature of collection.features) collectCoordinates(feature.geometry, coords);
  if (coords.length === 0) return null;
  const lngs = coords.map((coord) => coord[0]);
  const lats = coords.map((coord) => coord[1]);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

function collectCoordinates(geometry: GeoJsonFeature["geometry"], output: Array<[number, number]>) {
  if (!geometry || typeof geometry !== "object") return;
  const maybeGeometry = geometry as { type?: string; coordinates?: unknown; geometries?: unknown[] };
  if (maybeGeometry.type === "GeometryCollection" && Array.isArray(maybeGeometry.geometries)) {
    for (const child of maybeGeometry.geometries) collectCoordinates(child, output);
    return;
  }
  collectNestedCoordinates(maybeGeometry.coordinates, output);
}

function collectNestedCoordinates(value: unknown, output: Array<[number, number]>) {
  if (!Array.isArray(value)) return;
  if (typeof value[0] === "number" && typeof value[1] === "number") {
    output.push([value[0], value[1]]);
    return;
  }
  for (const item of value) collectNestedCoordinates(item, output);
}
