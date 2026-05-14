# 02. Data Catalog

## 전처리 후 웹이 읽을 파일 목록

웹 애플리케이션은 `public/data/` 아래의 전처리 결과 파일만 읽는다.

| 파일 | 형식 | 용도 |
| --- | --- | --- |
| `public/data/seoul_districts.geojson` | GeoJSON | 서울 25개 자치구 경계 표시 및 구 선택 |
| `public/data/grid_scores.geojson` | GeoJSON | 250m 격자별 유모차 생활보행 점수와 카테고리별 점수 표시 |
| `public/data/district_scores.json` | JSON | 구별 통합 점수, 순위, 카테고리 점수 |
| `public/data/facilities.geojson` | GeoJSON | 의료, 행정, 교육, 여가 시설 위치 표시 |
| `public/data/category_summary.json` | JSON | 카테고리별 전체 요약, 구별 순위, 시설 유형별 요약 |
| `public/data/metadata.json` | JSON | 데이터 생성일, 원천 데이터 목록, 전처리 버전, 한계 문구 |

파일이 없거나 로딩에 실패하면 앱은 깨지지 않아야 한다. 이 경우 가짜 데이터를 생성하지 않고 `데이터 준비 필요` 또는 `데이터를 불러올 수 없음` 상태와 누락 파일명을 표시한다.

## 입력/출력 파일 구조

원천 데이터 입력 위치:

```text
data/raw/
├─ boundary/
├─ medical/
├─ administration/
│  ├─ community_center_addresses.csv
│  ├─ district_office_addresses.csv
│  ├─ community_center.csv
│  ├─ district_office.csv
│  └─ city_hall.csv
├─ education/
├─ leisure/
└─ optional/
```

중간 산출물 위치:

```text
data/processed/
├─ grid_base.geojson
├─ facilities_prepared.geojson
├─ grid_distances.geojson
├─ grid_scores.geojson
├─ district_scores.json
├─ category_summary.json
└─ metadata.json
```

최종 웹 산출물 위치:

```text
public/data/
├─ seoul_districts.geojson
├─ grid_scores.geojson
├─ district_scores.json
├─ facilities.geojson
├─ category_summary.json
└─ metadata.json
```

## config/data_config.yaml 설명

`config/data_config.yaml`은 원천 데이터 경로, 시설 유형, 필수/optional 여부, 기준거리, 가중치, 좌표계, 출력 파일명, 행정시설 주소 좌표 변환 설정을 관리한다.

기본 시설 원천 파일은 CSV 기준으로 설정되어 있으며, 실제 데이터 형식이 GeoJSON, SHP, GPKG, XLSX인 경우 해당 경로와 컬럼 설정을 수정한다.

대형상업시설은 `large_retail_optional`로 정의한다. 파일이 없으면 `metadata.json`에 unavailable로 기록하고, 여가 점수는 대체 산식을 적용한다.

가정의학과는 `family_medicine`으로 정의하며 `required: false`인 optional 시설 유형이다. 의료 점수는 시설 유형별 최대 점수(소아청소년과 80, 가정의학과 40, 종합병원 20)를 더하는 가산식으로 계산하며, optional 데이터가 없으면 해당 항목은 0으로 기여한다. 실제 적용 결과는 `metadata.json`의 `applied_medical_formula`, `family_medicine_used`, `medical_facility_types_used`에 기록한다.

## 원천 데이터 후보

## 실제 전처리 연결 데이터

| 시설 유형 | 실제 raw 파일 | 상태 |
| --- | --- | --- |
| 자치구 경계 | `data/raw/boundary/seoul_districts.geojson` | 사용 |
| 소아청소년과 | `data/raw/medical/pediatric_clinic.csv` | 사용 |
| 가정의학과 | `data/raw/medical/family_medicine.csv` | optional, TbHospitalInfo DUTYNAME에 "가정의학" 포함 행을 facility_name_fallback으로 추출 |
| 종합병원/대학병원 | `data/raw/medical/general_hospital.csv` | 사용 |
| 주민센터/자치회관 | `data/raw/administration/community_center.csv` | 사용 |
| 구청 | `data/raw/administration/district_office.csv` | 사용 |
| 시청 | `data/raw/administration/city_hall.csv` | 사용 |
| 어린이집 | `data/raw/education/childcare_center.csv` | 사용 |
| 유치원 | `data/raw/education/kindergarten.csv` | 사용 |
| 공원 | `data/raw/leisure/park.csv` | 사용 |
| 도서관/문화시설 | `data/raw/leisure/library_culture.csv` | 사용 |
| 대형상업시설 | `data/raw/optional/large_retail.csv` | optional 미확보 |

raw 파일 상세 점검 결과는 `docs/data_raw_inventory.md`에 기록한다. 최종 웹 출력 파일의 실제 필드명, null 현황, 값 범위는 `docs/data_schema_actual.md`에 기록한다.

### Boundary

- 서울시 자치구 경계 공간데이터
- 서울시 행정동 경계 공간데이터

### Grid

- 250m 격자는 원천 데이터가 아니다.
- Python 전처리에서 서울 경계 데이터를 기준으로 생성한다.

### Medical

- 소아청소년과: 서울시 병의원 위치 정보(TbHospitalInfo)에서 시설명 기반 필터링
- 가정의학과: optional. 서울 열린데이터 TbHospitalInfo는 별도 진료과목 컬럼을 제공하지 않으므로, DUTYNAME(기관명)에 "가정의학"이 포함된 의원을 `facility_name_fallback` 방식으로 추출한다. 추출 스크립트는 `scripts/extract_family_medicine.py`이며 결과는 `data/raw/medical/family_medicine.csv`에 저장한다. 좌표가 없거나 WGS84 범위를 벗어난 행은 제외하고 excluded count를 기록한다.
- 종합병원/대학병원: 의료기관 위치 데이터에서 병원종별 필터링

### Administration

- 주민센터: 주소 원천 파일을 확보한 뒤 행정안전부 실시간 주소정보 조회 API와 실시간 주소별 좌표정보 조회 API로 좌표 변환
- 구청: 25개 구청 공식 주소 목록을 확보한 뒤 행정안전부 실시간 주소정보 조회 API와 실시간 주소별 좌표정보 조회 API로 좌표 변환
- 서울시청 위치 좌표 또는 공공시설 데이터

### Education

- 서울시 어린이집 정보
- 어린이집유치원좌표정보
- 유치원 위치 데이터

### Leisure

- 서울시 주요 공원현황
- 도서관 위치 데이터
- 문화시설 위치 데이터
- 대형상업시설 데이터는 optional이며, 확보가 어렵다면 1차 버전에서는 제외 가능

## Optional 데이터

- 경사 보정: 서울시 표고점, 등고선 또는 DEM
- 영유아 수요 가중치: 서울시 연령별 주민등록인구
- 생활 출발지 가중치(LivingWeight) 계산용 토지이용 공간데이터:
  - 서울시 용도지역(도시지역) 공간정보 (`land_use.zoning`)
  - 서울시 생활권계획 시설(공원) 공간정보 (`land_use.parks_origin_mask`) — 여가 도착지로는 계속 사용하고, 공원 내부 격자에 한해 출발지 가중치만 낮춤
  - 환경공간정보서비스 토지피복지도 (`land_use.land_cover_optional`)
  - 하천/수계 공간데이터 (`land_use.rivers_optional`)
  - 임야/산지 공간데이터 (`land_use.forest_mountain_optional`)
  - 모두 `data/raw/land_use/` 아래에 배치한다. 폴리곤 GeoJSON 형식을 기본으로 한다.

Optional 데이터가 없더라도 기본 점수 산출은 가능해야 한다. Optional 데이터를 사용하는 경우 `metadata.json`에 적용 여부와 산식 변경 내용을 명시한다. 토지이용 폴리곤이 모두 없으면 `aggregation_method = simple_average`, `living_weight_status = unavailable`로 기록하고 구별 점수는 단순 평균을 사용한다.

## 도보 네트워크 데이터

도보 네트워크 공간정보는 optional 고도화 데이터다.

- 로컬 raw 위치: `data/raw/pedestrian_network/`
- OpenAPI cache 위치: `data/raw_api/pedestrian_network/`
- 전처리 중간 산출물: `data/processed/pedestrian_network/`, `data/processed/network_by_district/`
- public overlay: `public/data/network/{district_code}_nodes.geojson`, `public/data/network/{district_code}_links.geojson`

현재 도보 네트워크는 서울 열린데이터광장 `서울시 자치구별 도보 네트워크 공간정보` OpenAPI를 사용한다.

- 데이터셋: OA-21208
- 서비스명: `TbTraficWlkNet`
- 요청 필터: `SGG_NM`, `WORK_DTTM`
- 주요 컬럼: `NODE_WKT`, `NODE_ID`, `NODE_TYPE_CD`, `LNKG_WKT`, `LNKG_ID`, `LNKG_TYPE_CD`, `BGNG_LNKG_ID`, `END_LNKG_ID`, `LNKG_LEN`, `SGG_CD`, `SGG_NM`
- 유형코드 참조 파일: `data/도보네트워크_링크노드유형코드.xlsx`

전처리에서는 `LNKG_WKT`와 시작/종료 노드 ID를 기준으로 링크를 만들고, 링크 endpoint에서 노드 좌표를 파생한다. 이는 API geometry에서 얻은 값이며 임의 노드 생성이 아니다. 링크 유형코드 엑셀을 참조해 `보행자`가 포함된 링크만 계산용 네트워크에 사용한다. 데이터가 없거나 특정 구 계산이 실패하면 `pedestrian_network_status`와 `distance_method`에 기록하고 직선거리 fallback을 사용한다.

참조 가능한 연관 OpenAPI:

- OA-21209: `tbTraficCrsng`
- OA-21211: `tbTraficEntrcLft`
- OA-21212: `tbTraficElvtr`
- OA-21213: `tbTraficUndpass`

위 연관 데이터는 향후 도보 경로 해석 보조 데이터로 검토할 수 있으나, 현재 유모차 생활보행 점수의 최단거리 그래프는 OA-21208의 노드/링크를 기준으로 계산한다.

## 데이터 원칙

- 모든 거리 계산과 점수 계산은 Python 전처리에서 수행한다.
- 웹은 전처리 결과 파일만 읽는다.
- 샘플 데이터, 더미 데이터, 임의 점수, 임의 시설 마커를 만들지 않는다.
- 출처, 수집일, 필터링 기준, 좌표계 변환 과정을 기록한다.
- 원천 데이터의 누락, 좌표 오류, 중복 시설은 전처리 검증 단계에서 별도 로그로 남긴다.
- 대형상업시설 데이터가 없으면 여가 점수 산식에서 제외하고 대체 산식을 적용한다.
- 실제 원천 데이터 없이 샘플 산출물을 만들지 않는다.
- `scripts/run_preprocessing.py`는 각 단계 실패 위치를 출력하고 즉시 중단한다.
