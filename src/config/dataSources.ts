import type { DataSourceConfig } from "../types/data";

const dataPath = (fileName: string) => `${import.meta.env.BASE_URL}data/${fileName}`.replace(/\/{2,}/g, "/");

export const DATA_SOURCES = {
  seoulDistricts: {
    key: "seoulDistricts",
    path: dataPath("seoul_districts.geojson"),
    label: "서울시 자치구 경계",
    type: "geojson",
  },
  gridScores: {
    key: "gridScores",
    path: dataPath("grid_scores.geojson"),
    label: "250m 격자 점수",
    type: "geojson",
  },
  districtScores: {
    key: "districtScores",
    path: dataPath("district_scores.json"),
    label: "구별 점수",
    type: "json",
  },
  facilities: {
    key: "facilities",
    path: dataPath("facilities.geojson"),
    label: "시설 위치",
    type: "geojson",
  },
  categorySummary: {
    key: "categorySummary",
    path: dataPath("category_summary.json"),
    label: "카테고리 요약",
    type: "json",
  },
  metadata: {
    key: "metadata",
    path: dataPath("metadata.json"),
    label: "메타데이터",
    type: "json",
  },
} as const satisfies Record<string, DataSourceConfig>;

export const PUBLIC_DATA_FILES = Object.values(DATA_SOURCES);
