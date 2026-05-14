import type { CategoryId } from "../types/data";

export const LIMITATION_TEXT =
  "본 점수는 실제 유모차 통행 가능 여부를 확정하는 지표가 아니라, 공개데이터 기반 생활시설 접근성을 비교하기 위한 시각화 지표입니다. 실제 현장 여건은 보도 폭, 단차, 공사, 불법주정차, 시설 운영시간 등에 따라 달라질 수 있습니다.";

export const PROCESS_STEPS = [
  "서울시 경계 데이터를 기준으로 250m 격자를 생성합니다.",
  "도보 네트워크 데이터가 있으면 격자 중심점과 시설을 가장 가까운 도보 네트워크 노드에 스냅하고, 노드-링크 최단거리로 접근 거리를 계산합니다.",
  "도보 네트워크 데이터가 없거나 일부 구에서 계산이 어려우면 metadata에 기록하고 직선거리 fallback을 사용합니다.",
  "각 시설 유형은 800m 이내에 있으면 최대 점수를 부여하고, 800m 초과 후 거리 비례 감점으로 1600m 이상에서 0점 처리합니다.",
  "의료, 행정, 교육, 여가 카테고리 점수를 계산합니다. 의료는 가정의학과 데이터 유무에 따라 산식을 자동 전환합니다.",
  "카테고리 점수를 가중합하여 격자별 유모차 생활보행 점수를 계산합니다.",
  "각 격자의 생활 출발지 가중치(LivingWeight)를 계산합니다. 주거·준주거·상업·공업·준공업 면적 비율을 기반으로 0~1 값을 부여하며, 공원·녹지·하천·산지·임야 면적은 출발지 가중치에서 제외하거나 낮은 값으로 처리합니다. 용도지역·공원·하천·산지 폴리곤이 없으면 LivingWeight 계산을 건너뜁니다.",
  "격자 점수를 자치구 단위로 집계합니다. LivingWeight가 계산되어 있으면 가중 평균(living_weighted_average), 없으면 단순 평균(simple_average)으로 fallback합니다.",
];

export const DISTANCE_LIMITS = [
  ["만점 기준거리", "800m"],
  ["점수 0 도달 거리", "1600m"],
  ["격자 네트워크 스냅 기준", "200m"],
  ["시설 네트워크 스냅 기준", "200m"],
];

export const FACILITY_SCORE_FORMULA =
  "DistanceAdjustedScore(W, D) = W × max(0, min(1, 2 − D / 800))";

export const FACILITY_SCORE_DESCRIPTION =
  "D는 전처리에서 계산된 접근 거리입니다. 도보 네트워크 최단거리가 있으면 이를 우선 사용하고, 없으면 직선거리 fallback을 metadata에 기록합니다. 800m 이내는 시설 유형별 최대 점수 W, 1000m는 W × 0.75, 1200m는 W × 0.5, 1600m 이상은 0점입니다.";

export const CATEGORY_FORMULAS: Array<{ id: CategoryId; label: string; formulas: string[] }> = [
  {
    id: "medical",
    label: "의료",
    formulas: [
      "MedicalScore = min(100, PediatricScore + FamilyMedicineScore + GeneralHospitalScore)",
      "최대 점수: 소아청소년과 80, 가정의학과 40, 종합병원/대학병원 20",
    ],
  },
  {
    id: "administration",
    label: "행정",
    formulas: [
      "AdminScore = min(100, CommunityCenterScore + DistrictOfficeScore)",
      "최대 점수: 주민센터 80, 구청 20. 시청은 기본 산식에서 제외합니다.",
    ],
  },
  {
    id: "education",
    label: "교육",
    formulas: ["EducationScore = min(100, ChildcareCenterScore + KindergartenScore)", "최대 점수: 어린이집 80, 유치원 20"],
  },
  {
    id: "leisure",
    label: "여가",
    formulas: [
      "LeisureScore = min(100, ParkScore + LibraryCultureScore)",
      "최대 점수: 공원 70, 도서관/문화시설 30. 대형상업시설은 optional이며 기본값은 0입니다.",
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
  "scripts/preprocess/08_export_public_data.py",
  "scripts/validation/validate_processed_data.py",
];
