# 실제 public/data 스키마 점검

이 문서는 현재 전처리 파이프라인 실행 후 생성된 `public/data/` 파일의 실제 스키마를 기록한다. 웹 대시보드는 이 파일들만 읽으며, 브라우저에서 거리 계산이나 점수 계산을 수행하지 않는다.

## 파일별 구조

| 파일 | 구조 | geometry | 주요 필드 | 비고 |
|---|---|---|---|---|
| `seoul_districts.geojson` | `FeatureCollection`, 25 features | `Polygon` | `district_code`, `district_name`, `source_code`, `source_name` | 서울 25개 구 경계 |
| `grid_scores.geojson` | `FeatureCollection`, 10,028 features | `Polygon`, 일부 `MultiPolygon` | `grid_id`, `district_code`, `district_name`, 거리 컬럼, 시설유형 점수, `medical_score`, `admin_score`, `education_score`, `leisure_score`, `grid_stroller_score`, `stroller_score` | `large_retail_optional` 관련 거리/점수는 optional 데이터 미확보로 null |
| `facilities.geojson` | `FeatureCollection`, 12,249 features | `Point` | `facility_id`, `facility_name`, `category`, `facility_type`, `source_name`, `source_provider`, `raw_file`, `address`, `district_name`, `district_code` | 주민센터 일부는 원천/좌표변환 결과상 `district_code`가 null일 수 있음 |
| `district_scores.json` | array, 25 rows | 없음 | `district_code`, `district_name`, `overall_score`, `rank`, `medical_score`, `admin_score`, `education_score`, `leisure_score`, `weakest_category`, `strongest_category`, `grid_count`, `calculable_grid_count`, `null_score_ratio` | `weakest_category`는 `administration` 등 카테고리 ID 사용 |
| `category_summary.json` | object | 없음 | `medical`, `administration`, `education`, `leisure` | 각 카테고리별 25개 구 요약 |
| `metadata.json` | object | 없음 | `source_datasets`, `unavailable_optional_datasets`, `generated_at`, `coordinate_systems`, `scoring_formula_version`, `applied_leisure_formula`, `aggregation_method`, `facility_counts`, `score_null_summary` | 실제 사용 raw data와 optional 누락 정보 기록 |

## 점수 필드 범위

현재 `grid_scores.geojson`의 주요 점수 필드는 모두 0~100 범위에 있다.

| 필드 | 최소 | 최대 | null |
|---|---:|---:|---:|
| `grid_stroller_score` / `stroller_score` | 0.0 | 80.321 | 0 |
| `medical_score` | 0.0 | 96.685 | 0 |
| `admin_score` | 0.0 | 86.743 | 0 |
| `education_score` | 0.0 | 98.857 | 0 |
| `leisure_score` | 0.0 | 97.594 | 0 |
| `large_retail_score` | null | null | 10,028 |

## 시설 유형 분포

| 카테고리 | 시설 유형 | 개수 |
|---|---|---:|
| medical | `pediatric_clinic` | 533 |
| medical | `general_hospital` | 91 |
| administration | `community_center` | 414 |
| administration | `district_office` | 25 |
| administration | `city_hall` | 1 |
| education | `childcare_center` | 8,842 |
| education | `kindergarten` | 754 |
| leisure | `park` | 132 |
| leisure | `library_culture` | 1,246 |
| leisure | `large_retail_optional` | 0 |

## 프론트엔드 매핑 원칙

- 구 매칭은 `district_code`를 우선 사용하고, 없으면 `district_name`을 사용한다.
- 통합 격자 점수는 `overall_score`, `grid_stroller_score`, `stroller_score`, `score` 순서로 읽는다.
- 행정 카테고리 점수는 실제 산출물의 `admin_score`를 사용하되, 호환을 위해 `administration_score`도 허용한다.
- 시설은 `category`와 `facility_type`을 기준으로 필터링한다.
- `large_retail_optional` 데이터가 없으면 여가 필터에서 데이터 없음으로 표시하고 임의 시설을 만들지 않는다.
