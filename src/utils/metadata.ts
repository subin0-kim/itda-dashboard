import type { Metadata, MetadataSourceDataset, MetadataUnavailableDataset } from "../types/data";

export function normalizeSourceDatasets(metadata: Metadata | null): MetadataSourceDataset[] {
  const source = metadata?.source_datasets;
  if (!source) return [];
  if (Array.isArray(source)) return source.map((item) => ({ ...item }));
  return Object.entries(source).map(([name, rawFile]) => ({
    name,
    raw_file: String(rawFile),
  }));
}

export function normalizeUnavailableOptionalDatasets(metadata: Metadata | null): MetadataUnavailableDataset[] {
  const source = metadata?.unavailable_optional_datasets;
  if (!source) return [];
  if (Array.isArray(source)) {
    return source.map((item) => (typeof item === "string" ? { name: item } : { ...item }));
  }
  return [];
}

export function getAppliedLeisureFormulaLabel(value: string | null | undefined) {
  if (!value) return "정보 없음";
  if (value === "park_other_leisure_with_large_retail_additive" || value.includes("large_retail")) {
    return "현재 적용 산식: min(100, 공원 70 + 도서관/문화시설 30 + optional 대형상업시설)";
  }
  if (value === "park_other_leisure_additive" || value.includes("without_large_retail")) {
    return "현재 적용 산식: min(100, 공원 70 + 도서관/문화시설 30) (대형상업시설 데이터 미확보)";
  }
  return value;
}

export function getAppliedMedicalFormulaLabel(value: string | null | undefined) {
  if (!value) return "정보 없음";
  if (value === "pediatric_family_general_hospital_additive" || value === "pediatric_family_general_hospital") {
    return "현재 적용 산식: min(100, 소아청소년과 80 + 가정의학과 40 + 종합병원 20)";
  }
  if (value === "pediatric_general_hospital_additive" || value === "pediatric_general_hospital_only") {
    return "현재 적용 산식: min(100, 소아청소년과 80 + 종합병원 20) (가정의학과 데이터 미확보)";
  }
  return value;
}

export function isFamilyMedicineUsed(metadata: Metadata | null) {
  if (!metadata) return false;
  if (typeof metadata.family_medicine_used === "boolean") return metadata.family_medicine_used;
  return (
    metadata.applied_medical_formula === "pediatric_family_general_hospital" ||
    metadata.applied_medical_formula === "pediatric_family_general_hospital_additive"
  );
}

export function getAggregationMethodLabel(value: string | null | undefined) {
  if (!value || value === "simple_average") return "단순 평균";
  if (value === "living_weighted_average") return "생활 출발지 가중 평균";
  return value;
}

export function getLivingWeightStatusLabel(value: string | null | undefined) {
  if (!value || value === "unavailable") {
    return "생활 출발지 가중치 데이터 미확보 (단순 평균 fallback)";
  }
  if (value === "applied") {
    return "생활 출발지 가중치 적용";
  }
  return value;
}

export function isLivingWeightApplied(metadata: Metadata | null) {
  if (!metadata) return false;
  return metadata.living_weight_status === "applied" || metadata.aggregation_method === "living_weighted_average";
}

export function readMetadataValue(value: unknown) {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "정보 없음";
}
