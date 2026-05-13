import type { BenchmarkRecommendation, CategoryId, DistrictScore } from "../types/data";
import type { GeoJsonFeature, GeoJsonFeatureCollection, GeoJsonProperties } from "../types/geojson";
import type { OverviewCategoryId } from "./category";
import {
  getCategoryScore,
  getFacilityCategory,
  getFacilityName,
  getFacilityType,
  getGridScore,
  normalizeCategory,
  readNumber,
  readString,
} from "./dataAccess";
import { readDistrictCode, readDistrictName } from "./geojson";
import { normalizeDistrictScore } from "./scoring";
import { buildBoundaryMask, isPointInsideMask } from "./spatial";

export function findDistrictByRoute(scores: DistrictScore[], districtId: string | undefined): DistrictScore | null {
  if (!districtId) return null;
  const decoded = decodeURIComponent(districtId);
  return (
    scores.find((district) => district.district_code === districtId) ??
    scores.find((district) => district.district_name === districtId) ??
    scores.find((district) => district.district_name === decoded) ??
    null
  );
}

export function normalizeDistrictScores(input: Array<Partial<DistrictScore> & Record<string, unknown>>): DistrictScore[] {
  return input.map((item) => normalizeDistrictScore(item));
}

export function filterDistrictBoundary(districts: GeoJsonFeatureCollection, district: DistrictScore): GeoJsonFeatureCollection {
  return {
    ...districts,
    features: districts.features.filter((feature) => featureMatchesDistrict(feature, district)),
  };
}

export function filterDistrictFeatures(collection: GeoJsonFeatureCollection, district: DistrictScore): GeoJsonFeatureCollection {
  return {
    ...collection,
    features: collection.features.filter((feature) => featureMatchesDistrict(feature, district)),
  };
}

export function filterDistrictFacilities(
  facilities: GeoJsonFeatureCollection,
  boundary: GeoJsonFeatureCollection,
  district: DistrictScore,
): GeoJsonFeatureCollection {
  const mask = buildBoundaryMask(boundary);
  const districtCode = district.district_code ?? "";
  const districtName = district.district_name ?? "";
  return {
    ...facilities,
    features: facilities.features.filter((feature) => {
      const featureCode = readDistrictCode(feature.properties);
      const featureName = readDistrictName(feature.properties);
      const hasCode = districtCode && featureCode;
      const hasName = districtName && featureName;
      if (hasCode || hasName) {
        if (hasCode && districtCode === featureCode) return true;
        if (hasName && districtName === featureName) return true;
        return false;
      }
      if (!mask) return false;
      const geom = feature.geometry as { type?: string; coordinates?: unknown } | null | undefined;
      if (!geom || geom.type !== "Point" || !Array.isArray(geom.coordinates)) return false;
      const [lng, lat] = geom.coordinates as number[];
      if (typeof lng !== "number" || typeof lat !== "number") return false;
      return isPointInsideMask(lng, lat, mask);
    }),
  };
}

export function enrichGridScores(collection: GeoJsonFeatureCollection, categoryId: OverviewCategoryId): GeoJsonFeatureCollection {
  return {
    ...collection,
    features: collection.features.map((feature, index) => {
      const props = feature.properties ?? {};
      const gridId = readString(props.grid_id ?? props.GRID_ID) || `grid-${index}`;
      const scores = readGridScores(props);
      const selected = getGridScore(props, categoryId);
      return {
        ...feature,
        id: gridId,
        properties: {
          ...props,
          grid_id: gridId,
          selected_score: selected,
          overall_score: scores.overall_score,
          medical_score: scores.medical_score,
          admin_score: scores.admin_score,
          education_score: scores.education_score,
          leisure_score: scores.leisure_score,
        },
      };
    }),
  };
}

export function filterFacilities(
  facilities: GeoJsonFeatureCollection,
  categoryId: OverviewCategoryId,
  selectedTypes: string[],
): GeoJsonFeatureCollection {
  if (categoryId === "overall") {
    return {
      ...facilities,
      features: facilities.features.filter((feature) => getFacilityCategory(feature.properties ?? {}) !== null),
    };
  }
  const selected = new Set(selectedTypes);
  return {
    ...facilities,
    features: facilities.features
      .filter((feature) => {
        const props = feature.properties ?? {};
        const category = getFacilityCategory(props);
        const type = getFacilityType(props);
        return category === categoryId && selected.has(type);
      })
      .map((feature, index) => ({
        ...feature,
        id: readString(feature.properties?.facility_id) || readString(feature.properties?.facility_name) || `facility-${index}`,
      })),
  };
}

export function getFacilityTypeCounts(facilities: GeoJsonFeatureCollection): Record<string, number> {
  return facilities.features.reduce<Record<string, number>>((acc, feature) => {
    const type = getFacilityType(feature.properties);
    if (type) acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {});
}

export function findBenchmarkForDistrict(recommendations: BenchmarkRecommendation[], district: DistrictScore) {
  return (
    recommendations.find((item) => item.district_code === district.district_code && district.district_code) ??
    recommendations.find((item) => item.district_name === district.district_name && district.district_name) ??
    null
  );
}

export function featureMatchesDistrict(feature: GeoJsonFeature, district: DistrictScore): boolean {
  const code = readDistrictCode(feature.properties);
  const name = readDistrictName(feature.properties);
  if (district.district_code && code) return district.district_code === code;
  if (district.district_name && name) return district.district_name === name;
  return false;
}

export function readGridScores(props: GeoJsonProperties): Pick<
  DistrictScore,
  "overall_score" | "medical_score" | "admin_score" | "education_score" | "leisure_score"
> {
  return {
    overall_score: readNumber(props.overall_score ?? props.grid_stroller_score ?? props.stroller_score),
    medical_score: getCategoryScore(props, "medical"),
    admin_score: getCategoryScore(props, "administration"),
    education_score: getCategoryScore(props, "education"),
    leisure_score: getCategoryScore(props, "leisure"),
  };
}

export { getFacilityName, normalizeCategory, readNumber, readString };
