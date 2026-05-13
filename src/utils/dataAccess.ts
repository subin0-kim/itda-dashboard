import type { CategoryId, DistrictScore } from "../types/data";
import type { GeoJsonFeature, GeoJsonProperties } from "../types/geojson";
import type { OverviewCategoryId } from "./category";

export function readString(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "";
}

export function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function getDistrictCode(item: GeoJsonFeature | GeoJsonProperties | Partial<DistrictScore> | Record<string, unknown> | null | undefined): string {
  const props = readProps(item);
  return readFirstString(props, ["district_code", "DISTRICT_CODE", "sgg_cd", "SIG_CD", "SIGUNGU_CD", "adm_cd", "code"]);
}

export function getDistrictName(item: GeoJsonFeature | GeoJsonProperties | Partial<DistrictScore> | Record<string, unknown> | null | undefined): string {
  const props = readProps(item);
  return readFirstString(props, ["district_name", "DISTRICT_NAME", "sgg_nm", "SIG_KOR_NM", "name", "adm_nm"]);
}

export function getOverallScore(item: GeoJsonFeature | GeoJsonProperties | Partial<DistrictScore> | Record<string, unknown> | null | undefined): number | null {
  const props = readProps(item);
  return readNumber(props.overall_score ?? props.grid_stroller_score ?? props.stroller_score ?? props.score);
}

export function getCategoryScore(
  item: GeoJsonFeature | GeoJsonProperties | Partial<DistrictScore> | Record<string, unknown> | null | undefined,
  categoryId: OverviewCategoryId,
): number | null {
  const props = readProps(item);
  if (categoryId === "overall") return getOverallScore(props);
  if (categoryId === "medical") return readNumber(props.medical_score);
  if (categoryId === "administration") return readNumber(props.admin_score ?? props.administration_score);
  if (categoryId === "education") return readNumber(props.education_score);
  if (categoryId === "leisure") return readNumber(props.leisure_score);
  return null;
}

export function getGridScore(feature: GeoJsonFeature | GeoJsonProperties, categoryId: OverviewCategoryId): number | null {
  return getCategoryScore(feature, categoryId);
}

export function getWeightedGridScore(feature: GeoJsonFeature | GeoJsonProperties, categoryId: OverviewCategoryId): number | null {
  const props = readProps(feature);
  if (categoryId === "overall") {
    return readNumber(props.weighted_overall_score ?? props.weighted_stroller_score ?? props.weighted_grid_stroller_score);
  }
  if (categoryId === "medical") return readNumber(props.weighted_medical_score);
  if (categoryId === "administration") return readNumber(props.weighted_admin_score ?? props.weighted_administration_score);
  if (categoryId === "education") return readNumber(props.weighted_education_score);
  if (categoryId === "leisure") return readNumber(props.weighted_leisure_score);
  return null;
}

export function getFacilityName(feature: GeoJsonFeature | GeoJsonProperties | Record<string, unknown> | null | undefined): string {
  const props = readProps(feature);
  return readFirstString(props, ["facility_name", "name", "시설명", "기관명"]);
}

export function getFacilityCategory(feature: GeoJsonFeature | GeoJsonProperties | Record<string, unknown> | null | undefined): CategoryId | null {
  const props = readProps(feature);
  return normalizeCategory(props.category);
}

export function getFacilityType(feature: GeoJsonFeature | GeoJsonProperties | Record<string, unknown> | null | undefined): string {
  const props = readProps(feature);
  return readFirstString(props, ["facility_type", "type", "시설유형"]);
}

export function normalizeCategory(value: unknown): CategoryId | null {
  if (value === "admin") return "administration";
  if (value === "medical" || value === "administration" || value === "education" || value === "leisure") return value;
  return null;
}

function readProps(item: GeoJsonFeature | GeoJsonProperties | Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!item) return {};
  if ("properties" in item && item.properties && typeof item.properties === "object") return item.properties as Record<string, unknown>;
  return item as Record<string, unknown>;
}

function readFirstString(props: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = props[key];
    if (typeof value === "string" || typeof value === "number") return String(value);
  }
  return "";
}
