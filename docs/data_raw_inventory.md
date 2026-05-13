# Data Raw Inventory

생성일: 2026-05-13

이 문서는 개발용 raw data 점검 문서다. MethodologyPage의 실제 사용 데이터 출처 표는 `metadata.json`의 `source_datasets`를 기준으로 표시한다.

## 전처리 사용 파일

| 파일 | 형식 | row 수 | 주요 컬럼 | 좌표 컬럼 | 주소 컬럼 | 시설명/명칭 컬럼 | 매핑 | 상태 |
| --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| `data/raw/boundary/seoul_districts.geojson` | GeoJSON | 25 | `district_code`, `district_name`, `geometry` | geometry | - | `district_name` | 서울 자치구 경계 | 사용 가능 |
| `data/raw/medical/pediatric_clinic.csv` | CSV | 536 | `name`, `longitude`, `latitude`, `source_name` | `longitude`, `latitude` | - | `name` | `pediatric_clinic` | 사용 가능 |
| `data/raw/medical/general_hospital.csv` | CSV | 93 | `name`, `longitude`, `latitude`, `source_name` | `longitude`, `latitude` | - | `name` | `general_hospital` | 사용 가능 |
| `data/raw/medical/family_medicine.csv` | CSV | optional | `name`, `longitude`, `latitude`, `source_name` | `longitude`, `latitude` | - | `name` | `family_medicine` | optional. `scripts/extract_family_medicine.py`가 `hospital_raw.json`의 DUTYNAME에 "가정의학" 포함 행을 facility_name_fallback으로 추출해 생성한다. 좌표 없는 행은 제외하고 excluded count 기록. |
| `data/raw/administration/community_center.csv` | CSV | 414 | `name`, `longitude`, `latitude`, `address`, `district_name`, `source_name` | `longitude`, `latitude` | `address` | `name` | `community_center` | 사용 가능 |
| `data/raw/administration/district_office.csv` | CSV | 25 | `name`, `longitude`, `latitude`, `address`, `district_code`, `district_name` | `longitude`, `latitude` | `address` | `name` | `district_office` | 사용 가능 |
| `data/raw/administration/city_hall.csv` | CSV | 1 | `name`, `longitude`, `latitude`, `source_name` | `longitude`, `latitude` | - | `name` | `city_hall` | 사용 가능 |
| `data/raw/education/childcare_center.csv` | CSV | 8850 | `name`, `longitude`, `latitude`, `source_name` | `longitude`, `latitude` | - | `name` | `childcare_center` | 사용 가능 |
| `data/raw/education/kindergarten.csv` | CSV | 754 | `name`, `longitude`, `latitude`, `address`, `district_name`, `reference_year` | `longitude`, `latitude` | `address` | `name` | `kindergarten` | 사용 가능 |
| `data/raw/leisure/park.csv` | CSV | 132 | `name`, `longitude`, `latitude`, `source_name` | `longitude`, `latitude` | - | `name` | `park` | 사용 가능 |
| `data/raw/leisure/library_culture.csv` | CSV | 1266 | `name`, `longitude`, `latitude`, `source_name` | `longitude`, `latitude` | - | `name` | `library_culture` | 사용 가능 |

## Optional 데이터

| 파일 | 매핑 | 상태 | 처리 |
| --- | --- | --- | --- |
| `data/raw/optional/large_retail.csv` | `large_retail_optional` | 없음 | optional 미확보로 기록하고 여가 대체 산식 사용 |
| `data/raw/medical/family_medicine.csv` | `family_medicine` | optional. `hospital_raw.json` 보유 시 추출 가능 | 생성 시 의료 산식 `pediatric_family_general_hospital` 적용, 없으면 `pediatric_general_hospital_only` 대체 산식 적용 |

## 보조/원천 보관 파일

| 파일 | row 수 | 용도 | 전처리 직접 사용 여부 | 이유 |
| --- | ---: | --- | --- | --- |
| `data/raw/administration/seoul_community_center_oa21246.xlsx` | 427 | 서울시 자치회관 주소 원천 | 미사용 | `community_center_addresses.csv`, `community_center.csv` 생성 후 원천 보관 |
| `data/raw/administration/community_center_addresses.csv` | 427 | 자치회관 주소 변환 입력 | 미사용 | 좌표 변환 후 `community_center.csv` 사용 |
| `data/raw/administration/district_office_addresses.csv` | 25 | 구청 주소 변환 입력 | 미사용 | 좌표 변환 후 `district_office.csv` 사용 |
| `data/raw/education/seoul_school_data_20251111.csv` | 24200 | 학교 위도/경도 원천 | 미사용 | `학교급=유치원`, 최신 연도 필터 후 `kindergarten.csv` 사용 |
| `data/raw/boundary/skorea_municipalities_geo_simple.json` | 251 | 전국 시군구 경계 원천 | 미사용 | 서울 25개 구만 필터링한 `seoul_districts.geojson` 사용 |
| `data/raw/*_raw.json` | 다수 | 서울 열린데이터 API 원본 응답 보관 | 미사용 | 표준 CSV로 변환한 파일을 전처리 입력으로 사용 |

## 인코딩 이슈

- `data/raw/education/seoul_school_data_20251111.csv`는 `cp949` 인코딩 원천이다.
- 전처리 직접 사용 파일은 모두 `utf-8-sig` CSV 또는 EPSG:4326 GeoJSON으로 정리되어 있다.

## 제외 및 누락

- `large_retail_optional`은 원천 미확보로 제외한다.
- 주민센터/자치회관 주소 427건 중 414건만 Kakao Local API로 좌표 변환에 성공했다. 실패 13건은 임의 좌표를 만들지 않고 제외했다.
