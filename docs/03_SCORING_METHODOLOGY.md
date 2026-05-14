# 03. Scoring Methodology

## 점수명

유모차 생활보행 점수

## 분석 단위와 출발점

- 분석 단위는 250m x 250m 격자다.
- 출발점은 각 격자의 중심점이다.
- 거리 계산과 점수 계산은 Python 전처리에서 수행하며, 웹 브라우저에서는 수행하지 않는다.
- 웹은 `public/data/`에 저장된 전처리 결과만 읽는다.

## 거리 계산 방식

우선순위:

1. `pedestrian_network`: 서울시 자치구별 도보 네트워크 공간정보를 사용할 수 있으면 격자 중심점과 시설을 가장 가까운 도보 네트워크 노드에 스냅하고, 노드-링크 그래프의 최단거리로 접근 거리를 계산한다.
2. `euclidean_fallback`: 도보 네트워크 데이터가 없거나 특정 구 계산이 실패하면 기존 투영 좌표계 기반 직선거리 계산을 fallback으로 사용한다.
3. `unavailable`: 도보 네트워크와 직선거리 모두 계산할 수 없으면 해당 시설 유형 거리는 null로 둔다.

스냅 기준 기본값:

- 격자 중심점 → 도보 네트워크 노드: 200m
- 시설 좌표 → 도보 네트워크 노드: 200m

구별 네트워크 계산은 해당 구 경계 주변 3000m buffer와 교차하는 인접 구 네트워크까지 포함한다. 시설 후보도 구 경계 3000m buffer 안의 시설을 사용하므로, 인접 구 또는 인접 격자 쪽 시설이 더 가까운 경우에도 네트워크 최단거리 후보로 들어갈 수 있다.

스냅 거리가 기준값을 넘는 경우 임의 연결선을 만들지 않는다. 해당 격자 또는 시설은 네트워크 접근 불가 또는 fallback 대상으로 기록한다.

현재 도보 네트워크 원천 데이터가 없으면 `metadata.json`에 `pedestrian_network_status = unavailable`, `distance_method = euclidean`으로 기록하고 직선거리 fallback을 사용한다.

## 시설 유형별 점수 산식

새 점수 함수:

```text
DistanceAdjustedScore(W, D) = W × max(0, min(1, 2 - D / 800))
```

정의:

- `W`: 시설 유형별 최대 점수
- `D`: 격자에서 해당 시설 유형까지의 접근 거리
- `800m`: 만점 기준거리
- `1600m`: 점수 0 도달 거리

해석:

- `D <= 800m`: 해당 시설 유형 최대 점수 `W`
- `D = 1000m`: `W × 0.75`
- `D = 1200m`: `W × 0.50`
- `D = 1400m`: `W × 0.25`
- `D >= 1600m`: 0점

800m는 유모차를 동반한 생활권 내 15분 내외 이동을 고려한 분석 기준이다. 실제 유모차 통행 가능 여부를 확정하는 값은 아니다.

## 시설 유형별 최대 점수

| 카테고리 | 시설 유형 | 코드 | 최대 점수 |
| --- | --- | --- | ---: |
| 의료 | 소아청소년과 | `pediatric_clinic` | 80 |
| 의료 | 가정의학과 | `family_medicine` | 40 |
| 의료 | 종합병원/대학병원 | `general_hospital` | 20 |
| 행정 | 주민센터 | `community_center` | 80 |
| 행정 | 구청 | `district_office` | 20 |
| 행정 | 시청 | `city_hall` | 0 |
| 교육 | 어린이집 | `childcare_center` | 80 |
| 교육 | 유치원 | `kindergarten` | 20 |
| 여가 | 공원 | `park` | 70 |
| 여가 | 도서관/문화시설 | `library_culture` | 30 |
| 여가 | 대형상업시설 | `large_retail_optional` | 0 |

시청과 대형상업시설은 config에서 포함 가능하게 남겨두되, 현재 기본 점수에서는 0점으로 둔다. 데이터가 없거나 최대 점수가 0인 시설 유형은 카테고리 점수에 기여하지 않는다.

## 카테고리별 산식

카테고리 점수는 시설 유형별 점수의 합산이며, 최대 100점으로 cap한다.

```text
CategoryScore = min(100, Σ DistanceAdjustedScore(typeMaxScore[t], D[t]))
```

의료:

```text
MedicalScore = min(100,
  PediatricScore
  + FamilyMedicineScore
  + GeneralHospitalScore
)
```

행정:

```text
AdminScore = min(100,
  CommunityCenterScore
  + DistrictOfficeScore
)
```

교육:

```text
EducationScore = min(100,
  ChildcareCenterScore
  + KindergartenScore
)
```

여가:

```text
LeisureScore = min(100,
  ParkScore
  + LibraryCultureScore
)
```

## 격자 통합 점수 산식

```text
GridStrollerScore =
  0.30 × MedicalScore
  + 0.30 × EducationScore
  + 0.20 × AdminScore
  + 0.20 × LeisureScore
```

## 구별 점수 산식

생활 출발지 가중치가 적용 가능한 경우:

```text
DistrictStrollerScore(d) =
  Σ GridStrollerScore(g) × LivingWeight(g) / Σ LivingWeight(g)
```

생활 출발지 가중치가 없거나 모두 0/null이면 단순 평균을 사용한다.

```text
DistrictStrollerScore(d) = mean(GridStrollerScore(g) in district)
```

`LivingWeight(g)`는 해당 250m 격자가 유모차 생활보행 점수의 출발지로 적합한 정도를 나타내는 0~1 값이다. 공원은 여가 목적지로 계속 사용하지만, 공원 내부 격자는 생활 출발지 가중치에서 제외하거나 낮은 값으로 처리한다.

## 전처리 실행과 산식 적용

점수 계산은 `scripts/preprocess/04_calculate_scores.py`에서 수행한다.

전체 실행 명령:

```bash
python scripts/run_preprocessing.py
```

전처리 결과의 실제 적용 방식은 `public/data/metadata.json`에서 확인한다.

- `scoring_method`
- `full_score_distance_m`
- `zero_score_distance_m`
- `type_max_scores`
- `category_formulas`
- `distance_method`
- `pedestrian_network_status`
- `network_distance_coverage`
- `euclidean_fallback_coverage`
- `aggregation_method`

## 해석상 주의

본 점수는 공개데이터 기반 생활시설 접근성을 비교하기 위한 시각화 지표다. 점수가 높다는 것은 해당 격자 또는 구에서 분석 대상 생활시설이 상대적으로 가까운 편임을 의미한다.

도보 네트워크 기반 거리는 직선거리보다 실제 보행 경로에 가까울 수 있지만, 실제 유모차 통행 가능성을 확정하지 않는다. 보도 폭, 단차, 계단, 경사, 공사, 노면 상태, 시설 운영시간 등은 별도 데이터가 없으면 반영되지 않을 수 있다.

필수 한계 문구:

> 본 점수는 실제 유모차 통행 가능 여부를 확정하는 지표가 아니라, 공개데이터 기반 생활시설 접근성을 비교하기 위한 시각화 지표입니다. 실제 현장 여건은 보도 폭, 단차, 공사, 불법주정차, 시설 운영시간 등에 따라 달라질 수 있습니다.
