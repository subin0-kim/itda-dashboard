# 03. Scoring Methodology

## 점수명

유모차 생활보행 점수

## 분석 단위

- 250m x 250m 격자
- 서울시 경계 내부에 포함되는 격자를 대상으로 한다.
- 구별 점수는 해당 구에 포함된 격자 점수를 집계해 산출한다.

## 출발점

각 격자의 중심점을 출발점으로 사용한다.

각 격자 중심점에서 의료, 행정, 교육, 여가 시설 중 시설 유형별 가장 가까운 시설까지의 거리를 계산한다. 거리 계산은 Python 전처리에서 수행하며, 웹 브라우저에서는 수행하지 않는다.

## 시설 접근 점수 산식

```text
FacilityScore(g, t) = max(0, 100 x (1 - D(g, t) / D_limit(t)))
```

정의:

- `g`: 250m 격자
- `t`: 시설 유형
- `D(g, t)`: 격자 중심점에서 가장 가까운 시설 `t`까지의 거리
- `D_limit(t)`: 시설 유형별 기준거리

해석:

- 가장 가까운 시설이 격자 중심점에 가까울수록 100점에 가까워진다.
- 기준거리 이상이면 0점으로 처리한다.
- 음수 점수는 허용하지 않는다.

## 기준거리 표

| 시설 유형 | 기준거리 |
| --- | ---: |
| 소아청소년과 | 1000m |
| 가정의학과 | 1000m |
| 종합병원/대학병원 | 2500m |
| 주민센터 | 1000m |
| 구청 | 2000m |
| 시청 | 5000m |
| 어린이집 | 750m |
| 유치원 | 1000m |
| 공원 | 1000m |
| 도서관/문화시설 | 1500m |
| 대형상업시설 | 2500m |

코드 설정의 시설 유형명:

| 시설 유형명 | 코드 |
| --- | --- |
| 소아청소년과 | `pediatric_clinic` |
| 가정의학과 | `family_medicine` |
| 종합병원/대학병원 | `general_hospital` |
| 주민센터 | `community_center` |
| 구청 | `district_office` |
| 시청 | `city_hall` |
| 어린이집 | `childcare_center` |
| 유치원 | `kindergarten` |
| 공원 | `park` |
| 도서관/문화시설 | `library_culture` |
| 대형상업시설 | `large_retail_optional` |

## 의료/행정/교육/여가 산식

### 의료 점수

가정의학과 원천 데이터를 사용한 경우(`applied_medical_formula = pediatric_family_general_hospital`):

```text
MedicalScore = 0.60 x PediatricScore
             + 0.20 x FamilyMedicineScore
             + 0.20 x GeneralHospitalScore
```

가정의학과 원천 데이터가 없는 경우(`applied_medical_formula = pediatric_general_hospital_only`):

```text
MedicalScore = 0.70 x PediatricScore + 0.30 x GeneralHospitalScore
```

가정의학과는 가족 단위 1차 진료 접근성을 보완하기 위해 추가된 optional 시설 유형이다. 소아청소년과보다 아이 진료에 특화된 정도는 낮으므로 더 낮은 가중치를 부여한다. 실제 적용 산식은 전처리 결과 `metadata.json`의 `applied_medical_formula`와 `family_medicine_used`에 기록한다.

### 행정 점수

```text
AdminScore = 0.6 x CommunityCenterScore
           + 0.3 x DistrictOfficeScore
           + 0.1 x CityHallScore
```

### 교육 점수

```text
EducationScore = 0.6 x ChildcareCenterScore + 0.4 x KindergartenScore
```

### 여가 점수

대형상업시설 데이터가 있는 경우:

```text
LeisureScore = 0.5 x ParkScore
             + 0.25 x LibraryCultureScore
             + 0.25 x LargeRetailScore
```

대형상업시설 데이터가 없는 경우:

```text
LeisureScore = 0.6 x ParkScore + 0.4 x LibraryCultureScore
```

적용된 여가 산식은 전처리 결과 `metadata.json`의 `applied_leisure_formula`에 기록한다.

현재 실제 전처리 결과는 대형상업시설 optional 데이터가 미확보되어 `leisure_without_large_retail` 산식을 적용한다.

## 격자 통합 점수 산식

```text
GridStrollerScore = 0.30 x MedicalScore
                  + 0.30 x EducationScore
                  + 0.20 x AdminScore
                  + 0.20 x LeisureScore
```

## 구별 점수 산식

기본 산식:

```text
DistrictStrollerScore = mean(GridStrollerScore in district)
```

생활 출발지 가중치 보정 산식 (`aggregation_method = living_weighted_average`):

```text
DistrictStrollerScore(d) =
  sum(GridStrollerScore(g) x LivingWeight(g)) / sum(LivingWeight(g))
```

`LivingWeight(g)`는 해당 250m 격자가 유모차 생활보행 점수의 출발지로 적합한 정도를 나타내는 0~1 사이 값이다.

```text
LivingWeight(g) = UrbanLivingArea(g) / GridArea(g)
```

`UrbanLivingArea`는 격자 안에서 주거·준주거·상업·공업·준공업 등 생활가능 용도지역 면적의 가중합이며, 공원/녹지/하천/산지/임야 면적은 포함하지 않는다. 분류되지 않은 면적은 `unknown_area_ratio`로 별도 기록하며 LivingWeight 산정에서는 제외한다.

출발지와 도착지 분리 원칙:

- 공원(park)은 여가 카테고리의 도착지로 계속 사용한다. `LeisureScore` 산식의 `ParkScore`는 그대로 유지한다.
- 공원 내부 250m 격자는 실제 거주/생활 출발지로 보기 어려우므로 구별 평균 산정 시 LivingWeight를 0 또는 낮은 값으로 처리한다.
- 녹지지역, 하천 내부, 산지/임야 내부 격자는 LivingWeight = 0으로 처리한다.

용도지역/공원/하천/산지/임야 폴리곤 공간데이터가 없으면 LivingWeight를 계산하지 않고 단순 평균(`aggregation_method = simple_average`)을 사용한다. 실제 적용 결과는 `metadata.json`의 `aggregation_method`, `living_weight_status`, `living_weight_source_datasets`에 기록한다.

영유아 수요 가중치 데이터(추가 옵션)가 없으면 위 LivingWeight 기반 가중 평균 또는 단순 평균을 사용한다.

## 전처리 실행과 산식 적용

점수 계산은 `scripts/preprocess/04_calculate_scores.py`에서 수행한다.

전체 실행 명령:

```bash
python scripts/run_preprocessing.py
```

필수 시설 유형의 원천 데이터가 없으면 점수를 계산하지 않고 중단한다. optional인 `large_retail_optional`이 없으면 해당 시설 유형 점수는 제외하고 여가 대체 산식을 사용한다. optional인 `family_medicine`이 없으면 의료 점수는 기존 소아청소년과·종합병원 2종 대체 산식을 사용한다.

## MethodologyPage 표시 원칙

- 기본 산식, 기준거리, 점수 해석은 정적 방법론으로 표시한다.
- 실제 사용 데이터 출처 목록은 `metadata.json`의 `source_datasets`에 기록된 항목만 표시한다.
- 원천 데이터 후보나 문서상 후보 목록을 실제 사용 데이터처럼 표시하지 않는다.
- `source_datasets`가 없으면 실제 사용 데이터 정보가 없다는 안내를 표시한다.

## 해석상 주의

본 점수는 공개데이터 기반 생활시설 접근성을 비교하기 위한 시각화 지표다. 점수가 높다는 것은 해당 격자 또는 구에서 분석 대상 생활시설이 상대적으로 가까운 편임을 의미한다.

점수가 낮게 나타나는 구나 격자는 개선 여지가 있는 생활권으로 해석할 수 있으나, 특정 지역을 부정적으로 단정하는 표현은 사용하지 않는다.

필수 한계 문구:

> 본 점수는 실제 유모차 통행 가능 여부를 확정하는 지표가 아니라, 공개데이터 기반 생활시설 접근성을 비교하기 위한 시각화 지표입니다. 실제 현장 여건은 보도 폭, 단차, 공사, 불법주정차, 시설 운영시간 등에 따라 달라질 수 있습니다.
