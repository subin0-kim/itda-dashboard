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
| `data/raw/medical/family_medicine.csv` | `family_medicine` | optional. `hospital_raw.json` 보유 시 추출 가능 | 의료 가산식에 포함. 없으면 해당 항목은 0으로 기여하고 `medical_facility_types_used`에 기록되지 않음 |

## 생활 출발지 가중치 후보 데이터

현재 토지이용 후보 데이터는 `data/raw/land_use/` 하위 원천 폴더에 배치되어 있다. 실제 shapefile을 `config/data_config.yaml`에 연결해 LivingWeight를 적용했다.

## 도보 네트워크 후보 데이터

현재 `data/raw_api/pedestrian_network/`에는 서울 열린데이터광장 OA-21208 `TbTraficWlkNet` OpenAPI로 수집한 자치구별 JSON 캐시가 있다. 횡단보도 보조 연결은 OA-21209 `tbTraficCrsng` 응답을 `data/raw_api/pedestrian_network/supplemental/crosswalk.json`에 캐시해 사용한다. `data/도보네트워크_링크노드유형코드.xlsx`는 링크/노드 유형코드 해석에 사용한다.

도보 네트워크 데이터가 추가되면 다음 정보를 기록해야 한다.

- 파일명: `data/raw_api/pedestrian_network/{district_code}_{district_name}.json`
- 노드/링크 구분: `NODE_TYPE`, `NODE_WKT`, `LNKG_WKT`
- 자치구 코드/명: `SGG_CD`, `SGG_NM`
- 좌표계: WGS84
- 길이 컬럼: `LNKG_LEN`
- from_node / to_node 컬럼: `BGNG_LNKG_ID`, `END_LNKG_ID`
- LineString endpoint 기반 노드 파생: 사용
- 유형코드 파일: `data/도보네트워크_링크노드유형코드.xlsx`
- 횡단보도 보조 링크: `data/raw_api/pedestrian_network/supplemental/crosswalk.json`, `LNKG_WKT`가 있는 실제 횡단보도 선형 geometry만 사용

| 후보 데이터 | 예상 경로 | 좌표계 후보 | 인코딩 후보 | 분류 컬럼 | geometry 타입 | LivingWeight 사용 여부 | 미사용 사유 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 서울시 용도지역(도시지역) 공간정보 | `data/raw/land_use/UQ111_용도지역(도시지역)_202602/shp파일/UPIS_C_UQ111.shp` | EPSG:5174 | cp949 | `DGM_NM` | Polygon/MultiPolygon | 사용 | - |
| 서울시 생활권계획 시설(공원) 공간정보 | `data/raw/land_use/UPIS_SHP_ZON216_서울시 생활권 계획(공원) 공간정보/UPIS_SHP_ZON216.shp` | EPSG:5174 | cp949 | - | Polygon/MultiPolygon | 사용 | 공원은 기존 `data/raw/leisure/park.csv`에서 여가 도착지로도 계속 사용 |
| 환경공간정보서비스 토지피복지도 | `data/raw/land_use/seoul_land_cover.geojson` | EPSG:5174 | windows-949 가능 | `land_cover_category` | Polygon/MultiPolygon | 미사용 | optional raw 파일 없음 |
| 하천/수계 공간데이터 | `data/raw/land_use/seoul_rivers.geojson` | EPSG:5174 | windows-949 가능 | - | Polygon/MultiPolygon | 미사용 | optional raw 파일 없음 |
| 임야/산지 공간데이터 | `data/raw/land_use/seoul_forest_mountain.geojson` | EPSG:5174 | windows-949 가능 | - | Polygon/MultiPolygon | 미사용 | optional raw 파일 없음 |

토지피복도/하천/임야 데이터가 추가로 준비되면 `config/data_config.yaml`의 `land_use` 항목에 실제 파일명, 좌표계, 분류 컬럼을 맞춘 뒤 `python scripts/run_preprocessing.py`를 다시 실행한다. 실제 파일이 없을 때 임의 토지이용 폴리곤이나 임의 가중치는 생성하지 않는다.

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
