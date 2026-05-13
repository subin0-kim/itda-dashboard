import type { CategoryId } from "../types/data";

export const LIMITATION_TEXT =
  "본 점수는 실제 유모차 통행 가능 여부를 확정하는 지표가 아니라, 공개데이터 기반 생활시설 접근성을 비교하기 위한 시각화 지표입니다. 실제 현장 여건은 보도 폭, 단차, 공사, 불법주정차, 시설 운영시간 등에 따라 달라질 수 있습니다.";

export const PROCESS_STEPS = [
  "서울시 경계 데이터를 기준으로 250m 격자를 생성합니다.",
  "각 격자 중심점에서 의료, 행정, 교육, 여가 시설까지의 가장 가까운 거리를 계산합니다.",
  "시설 유형별 기준거리와 비교해 0~100점 접근성 점수로 변환합니다.",
  "의료, 행정, 교육, 여가 카테고리 점수를 계산합니다. 의료는 가정의학과 데이터 유무에 따라 산식을 자동 전환합니다.",
  "카테고리 점수를 가중합하여 격자별 유모차 생활보행 점수를 계산합니다.",
  "각 격자의 생활 출발지 가중치(LivingWeight)를 계산합니다. 주거·준주거·상업·공업·준공업 면적 비율을 기반으로 0~1 값을 부여하며, 공원·녹지·하천·산지·임야 면적은 출발지 가중치에서 제외하거나 낮은 값으로 처리합니다. 용도지역·공원·하천·산지 폴리곤이 없으면 LivingWeight 계산을 건너뜁니다.",
  "격자 점수를 자치구 단위로 집계합니다. LivingWeight가 계산되어 있으면 가중 평균(living_weighted_average), 없으면 단순 평균(simple_average)으로 fallback합니다.",
];

export const DISTANCE_LIMITS = [
  ["소아청소년과", "1000m"],
  ["가정의학과", "1000m"],
  ["종합병원/대학병원", "2500m"],
  ["주민센터", "1000m"],
  ["구청", "2000m"],
  ["시청", "5000m"],
  ["어린이집", "750m"],
  ["유치원", "1000m"],
  ["공원", "1000m"],
  ["도서관/문화시설", "1500m"],
  ["대형상업시설", "2500m"],
];

export const CATEGORY_FORMULAS: Array<{ id: CategoryId; label: string; formulas: string[] }> = [
  {
    id: "medical",
    label: "의료",
    formulas: [
      "가정의학과 데이터가 있는 경우: MedicalScore = 0.60 x PediatricScore + 0.20 x FamilyMedicineScore + 0.20 x GeneralHospitalScore",
      "가정의학과 데이터가 없는 경우: MedicalScore = 0.70 x PediatricScore + 0.30 x GeneralHospitalScore",
    ],
  },
  {
    id: "administration",
    label: "행정",
    formulas: ["AdminScore = 0.6 x CommunityCenterScore + 0.3 x DistrictOfficeScore + 0.1 x CityHallScore"],
  },
  { id: "education", label: "교육", formulas: ["EducationScore = 0.6 x ChildcareCenterScore + 0.4 x KindergartenScore"] },
  {
    id: "leisure",
    label: "여가",
    formulas: [
      "대형상업시설 데이터가 있는 경우: LeisureScore = 0.5 x ParkScore + 0.25 x LibraryCultureScore + 0.25 x LargeRetailScore",
      "대형상업시설 데이터가 없는 경우: LeisureScore = 0.6 x ParkScore + 0.4 x LibraryCultureScore",
    ],
  },
];

export const DEFAULT_PREPROCESSING_SCRIPTS = [
  "scripts/preprocess/01_generate_grid.py",
  "scripts/preprocess/02_prepare_facilities.py",
  "scripts/preprocess/03_calculate_distances.py",
  "scripts/preprocess/04_calculate_scores.py",
  "scripts/preprocess/05_calculate_living_weight.py",
  "scripts/preprocess/06_aggregate_district_scores.py",
  "scripts/preprocess/07_generate_benchmark.py",
  "scripts/preprocess/08_export_public_data.py",
  "scripts/validation/validate_processed_data.py",
];
