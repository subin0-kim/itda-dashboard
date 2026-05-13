# 04. Preprocessing Pipeline

## 전처리 원칙

- 모든 거리 계산과 점수 계산은 Python 전처리에서 수행한다.
- 웹 브라우저는 전처리 결과 파일을 로딩하고 시각화만 수행한다.
- 샘플 데이터, 더미 데이터, 임의 점수, 임의 시설 마커를 생성하지 않는다.
- 필수 원천 데이터가 없으면 중단하고 명확한 에러를 출력한다.
- optional 원천 데이터가 없으면 해당 사실을 기록하고, 정의된 대체 산식을 적용한다.
- 누락 데이터와 적용 제외 데이터는 `metadata.json`에 명시한다.

## 입력 폴더

```text
data/raw/
```

권장 하위 구조:

```text
data/raw/
├─ boundary/
├─ medical/
├─ administration/
├─ education/
├─ leisure/
└─ optional/
```

기본 설정 파일은 `config/data_config.yaml`이다. 원천 파일명이나 컬럼명이 실제 데이터와 다르면 이 파일의 경로와 컬럼 설정을 먼저 수정한다.

## 출력 폴더

```text
public/data/
```

출력 파일:

- `seoul_districts.geojson`
- `grid_scores.geojson`
- `district_scores.json`
- `facilities.geojson`
- `category_summary.json`
- `metadata.json`

## 전처리 단계

1. 원천 데이터 수집
2. 원천 데이터 스키마 확인
3. 좌표 컬럼, 주소 컬럼, 시설명 컬럼 정규화
4. 좌표 누락 또는 이상치 검증
5. 서울시 경계 데이터 로딩
6. 좌표계를 거리 계산용 투영 좌표계로 변환
7. 서울 경계 기준 250m 격자 생성
8. 격자 중심점 생성
9. 시설 유형별 데이터 필터링
10. 중복 시설 제거
11. 격자 중심점에서 시설 유형별 최근접 시설 거리 계산
12. 시설 접근 점수 계산
13. 의료/행정/교육/여가 카테고리 점수 계산
14. 격자 통합 점수 계산
15. 격자를 자치구에 매핑
16. 구별 점수와 순위 계산
17. 카테고리별 요약 계산
18. GeoJSON, JSON 산출물 저장
19. 산출물 스키마 및 값 범위 검증

## 필요한 Python 스크립트 목록

현재 생성된 스크립트 구조:

```text
scripts/preprocess/
├─ 01_generate_grid.py
├─ 02_prepare_facilities.py
├─ 03_calculate_distances.py
├─ 04_calculate_scores.py
├─ 05_calculate_living_weight.py
├─ 06_aggregate_district_scores.py
└─ 08_export_public_data.py

scripts/validation/
└─ validate_processed_data.py

scripts/
├─ fetch_seoul_open_data.py
├─ geocode_admin_facilities.py
└─ run_preprocessing.py
```

## config/data_config.yaml

`config/data_config.yaml`에는 다음 설정을 둔다.

- `raw_data_paths`: 원천 데이터 폴더
- `boundary_data`: 자치구 경계 파일 경로와 구 코드/구명 컬럼
- `facility_sources`: 시설 유형별 파일 경로, 카테고리, 좌표 컬럼, 필수 여부
- `required_facility_types`: 필수 시설 유형
- `optional_facility_types`: optional 시설 유형
- `distance_limits`: 시설 유형별 기준거리
- `category_weights`: 카테고리별 및 통합 점수 가중치
- `output_paths`: 중간 산출물과 `public/data/` 최종 산출물 경로
- `coordinate_systems`: 원천 기본 좌표계, 분석 좌표계, 웹 출력 좌표계
- `geocoding`: 행정시설 주소 원천 파일, 주소정보 API 키 환경변수, 좌표 변환 출력 경로

대형상업시설은 `large_retail_optional`로 정의하며 optional 데이터로 처리한다.

가정의학과는 `family_medicine`으로 정의하며 optional 데이터로 처리한다. TbHospitalInfo 원천에 진료과목 컬럼이 없어 `scripts/extract_family_medicine.py`가 `hospital_raw.json`의 DUTYNAME 필드에서 "가정의학"이 포함된 의원을 facility_name_fallback 방식으로 필터링해 `data/raw/medical/family_medicine.csv`를 생성한다. 좌표 누락 또는 WGS84 범위 밖 행은 제외하고 excluded count를 기록한다. 의료 점수 가중치는 `category_weights.medical_with_family_medicine`(가정의학과 데이터 사용)과 `category_weights.medical_without_family_medicine`(데이터 없음 대체) 두 가지를 정의한다.

## 실행 방법

전처리 의존성 설치:

```bash
pip install -r requirements-preprocess.txt
```

전체 파이프라인 실행:

```bash
python scripts/run_preprocessing.py
```

현재 실제 raw 데이터 기준 실행 결과:

- `grid_base.geojson`: 10,028개 250m 격자
- `facilities_prepared.geojson`: 12,249개 시설
- `district_scores.json`: 서울 25개 구 점수
- 최종 파일은 `public/data/`에 생성
- 검증 리포트는 `reports/data_validation_report.md`에 생성

개별 단계 실행:

```bash
python scripts/preprocess/01_generate_grid.py --config config/data_config.yaml
python scripts/preprocess/02_prepare_facilities.py --config config/data_config.yaml
python scripts/preprocess/03_calculate_distances.py --config config/data_config.yaml
python scripts/preprocess/04_calculate_scores.py --config config/data_config.yaml
python scripts/preprocess/05_calculate_living_weight.py --config config/data_config.yaml
python scripts/preprocess/06_aggregate_district_scores.py --config config/data_config.yaml
python scripts/preprocess/08_export_public_data.py --config config/data_config.yaml
python scripts/validation/validate_processed_data.py --config config/data_config.yaml
```

원천 데이터가 없으면 스크립트는 가짜 데이터를 만들지 않고 명확한 에러를 출력한다.

행정시설 주소 좌표 변환:

```bash
set JUSO_API_KEY=발급받은_승인키
python scripts/geocode_admin_facilities.py
```

입력 주소 파일:

- `data/raw/administration/community_center_addresses.csv`
- `data/raw/administration/district_office_addresses.csv`

각 파일은 최소 `name`, `address` 컬럼을 가진다. 스크립트는 행정안전부 실시간 주소정보 조회 API로 주소 식별자를 찾고, 실시간 주소별 좌표정보 조회 API로 좌표를 조회한다. 승인키나 입력 주소가 없으면 중단하며 임의 좌표를 만들지 않는다.

## 좌표계 원칙

- 원천 데이터 좌표계는 수집 시점에 확인한다.
- 웹 표시용 산출물은 WGS84 좌표계인 EPSG:4326 GeoJSON으로 저장한다.
- 거리 계산은 미터 단위 계산에 적합한 투영 좌표계에서 수행한다.
- 좌표계 변환 내역은 `metadata.json`에 기록한다.
- 좌표계가 불명확한 데이터는 임의로 사용하지 않고 검증 대상으로 분리한다.
- 실제 사용 원천 데이터 목록은 `metadata.json`의 `source_datasets`에 기록한다. MethodologyPage의 실제 데이터 출처 표는 이 필드만 사용한다.

## 검증 항목

- 필수 원천 파일 존재 여부
- 좌표 컬럼 존재 여부
- 좌표값 범위가 서울 주변 범위에 들어오는지 여부
- 시설 유형별 레코드 수
- 중복 시설 제거 결과
- 250m 격자 생성 개수
- 격자와 자치구 매핑 누락 여부
- 점수 값 범위가 0 이상 100 이하인지 여부
- 구별 점수와 순위의 누락 여부
- Optional 데이터 적용 여부
- `public/data/` 출력 파일 존재 여부
- 웹에서 읽는 파일명과 출력 파일명의 일치 여부

## optional 데이터 처리 방식

- `large_retail_optional`, `family_medicine`, 그리고 토지이용 폴리곤(`zoning`, `parks_origin_mask`, `land_cover_optional`, `rivers_optional`, `forest_mountain_optional`)이 optional이다.
- 파일이 없으면 전처리를 중단하지 않고 `metadata.json`의 `unavailable_optional_datasets`에 기록한다.
- 대형상업시설 데이터가 없으면 여가 점수는 `0.6 x ParkScore + 0.4 x LibraryCultureScore` 산식을 사용한다.
- 가정의학과 데이터가 없으면 의료 점수는 `0.70 x PediatricScore + 0.30 x GeneralHospitalScore` 대체 산식을 사용한다.
- 토지이용 폴리곤이 모두 없으면 LivingWeight를 계산하지 않고 구별 점수는 `simple_average` fallback을 사용한다.
- 어떤 여가 산식이 적용되었는지는 `metadata.json`의 `applied_leisure_formula`에 기록한다.
- 어떤 의료 산식이 적용되었는지는 `metadata.json`의 `applied_medical_formula`와 `family_medicine_used`에 기록한다.
- 어떤 구별 집계 방식이 적용되었는지는 `metadata.json`의 `aggregation_method`와 `living_weight_status`에 기록한다.

실제 적용된 의료 산식과 가정의학과 데이터 사용 여부는 전처리 실행 후 `metadata.json`의 `applied_medical_formula`, `family_medicine_used`에서 확인한다. 적용된 여가 산식은 `applied_leisure_formula`에서 확인한다. 적용된 구별 집계 방식은 `aggregation_method`에서 확인한다.

## 생활 출발지 가중치 (LivingWeight)

`scripts/preprocess/05_calculate_living_weight.py`는 다음을 수행한다.

`scripts/preprocess/04_calculate_living_weight.py`는 직접 실행 호환용 wrapper이며, 실제 파이프라인에서는 점수 계산 후 `05_calculate_living_weight.py`를 실행한다.

1. `grid_scores.geojson`을 읽어 250m 격자 폴리곤을 분석 좌표계(EPSG:5179)로 투영한다.
2. `config.land_use.zoning/parks_origin_mask/land_cover_optional/rivers_optional/forest_mountain_optional` 항목 중 실제로 존재하는 폴리곤 데이터를 읽는다.
3. 각 격자와 폴리곤의 교차 면적을 계산해 격자별 토지이용 면적 비율을 만든다.
4. 주거/준주거/상업/공업/준공업 면적 비율의 가중합으로 `living_weight`를 계산한다(0~1).
5. 공원/녹지/하천/산지/임야 면적은 LivingWeight 가중치에서 0으로 처리한다.
6. 분류되지 않은 면적은 `unknown_area_ratio`로 기록한다.
7. 토지이용 폴리곤이 하나도 없으면 living_weight를 null로 두고 `living_weight_status = unavailable`로 기록한다.

결과는 `data/processed/grid_living_weight.geojson`에 저장하고, `08_export_public_data.py`가 `public/data/grid_scores.geojson`에 living_weight 관련 컬럼을 합쳐서 내보낸다.

`06_aggregate_district_scores.py`는 living_weight가 적용 가능한 상태(0 초과 값이 하나라도 존재)이면 `Σ score × weight / Σ weight`로 구별 점수를 계산하고, 그렇지 않으면 simple_average로 fallback한다. 결과는 district_scores.json의 `aggregation_method`, `living_weighted`, `living_weight_coverage`, `effective_grid_count`, `low_or_zero_weight_grid_count` 필드에 기록된다.

## 실제 산출물 스키마

전처리 후 생성된 `public/data/` 파일의 실제 필드명, null 현황, 점수 범위는 `docs/data_schema_actual.md`에 기록한다. 프론트엔드는 해당 스키마를 기준으로 `district_code`, `district_name`, `grid_stroller_score`, `admin_score`, `category`, `facility_type` 등을 안전하게 매핑한다.
