# 잇다(:connect)

아이와 도시를 잇다. 서울의 미래를 잇다.

서울 25개 구의 아이동반 친화성을 250m 격자 기반 `유모차 생활보행 점수`로 시각화하는 GitHub Pages 기반 정적 웹 대시보드 프로젝트다.

이 웹페이지는 공모전 제출 파일 중 `시각화 결과물`로 제출할 독립형 인터랙티브 웹페이지다. 발표자료는 별도 제출 파일이며, 웹 결과물은 심사자가 직접 구별 지도, 카테고리, 상세 지도, 벤치마킹, 방법론을 탐색할 수 있도록 구성한다.

## 주요 페이지

- `#/`: 서울 25개 구 유모차 생활보행 점수 지도, KPI, TOP 5 / 개선 여지 큰 구
- `#/district/:districtId`: 선택 구의 250m 격자 heatmap, 시설 위치, 카테고리 점수, 벤치마킹 링크
- `#/category/:categoryId`: 의료, 행정, 교육, 여가 카테고리별 서울 전체 비교
- `#/benchmark`: 전처리로 생성된 벤치마킹 추천과 카테고리 점수 비교
- `#/methodology`: 점수 산식, 기준거리, 실제 사용 데이터 출처, 전처리 파이프라인, 한계

GitHub Pages 새로고침 안정성을 위해 프론트엔드는 `HashRouter`를 사용한다.

## 로컬 실행 방법

프론트엔드 의존성 설치:

```bash
npm install
```

개발 서버 실행:

```bash
npm run dev
```

정적 빌드:

```bash
npm run build
```

빌드 결과는 GitHub Pages 배포를 염두에 둔 정적 산출물로 생성된다.

## 배포 방법

```bash
npm install
npm run build
```

생성된 `dist/`를 GitHub Pages에 배포한다. Vite `base`는 상대 경로(`./`)이며, 라우팅은 hash 기반이므로 GitHub Pages에서 하위 route 새로고침으로 인한 404 위험을 줄인다.

## 전처리 실행 방법

의존성 설치:

```bash
pip install -r requirements-preprocess.txt
```

전체 전처리 실행:

```bash
python scripts/run_preprocessing.py
```

개별 스크립트는 `--config` 옵션을 지원한다.

```bash
python scripts/preprocess/01_generate_grid.py --config config/data_config.yaml
```

현재 실제 raw 데이터 기준 전체 전처리 결과:

- 250m 격자: 10,028개
- 시설: 12,038개
- 구별 점수: 25개 구
- 벤치마킹 추천: 24건
- validation report: `reports/data_validation_report.md`

## 행정시설 주소 좌표 변환

주민센터와 구청은 주소 원천을 먼저 확보한 뒤 행정안전부 주소정보 API로 좌표를 붙인다. 스마트서울맵 API는 사용하지 않는다.

입력 파일:

- `data/raw/administration/community_center_addresses.csv`
- `data/raw/administration/district_office_addresses.csv`

각 CSV는 최소한 `name`, `address` 컬럼을 가져야 한다. 실제 주소 원천 없이 임의 시설이나 임의 좌표를 만들지 않는다.

주소정보 API 승인키를 환경변수로 설정한 뒤 실행한다.

```bash
set JUSO_API_KEY=발급받은_승인키
python scripts/geocode_admin_facilities.py
```

출력 파일:

- `data/raw/administration/community_center.csv`
- `data/raw/administration/district_office.csv`

승인키나 입력 파일이 없으면 스크립트는 중단하고 필요한 항목을 에러 메시지로 출력한다.

## 필요한 원천 데이터 위치

원천 데이터는 `data/raw/` 아래에 배치한다.

```text
data/raw/
├─ boundary/
├─ medical/
├─ administration/
├─ education/
├─ leisure/
└─ optional/
```

기본 경로와 좌표 컬럼은 `config/data_config.yaml`에서 관리한다. 실제 파일명이나 컬럼명이 다르면 이 설정 파일을 수정한다.

현재 전처리에 연결된 실제 원천 파일:

- `data/raw/boundary/seoul_districts.geojson`
- `data/raw/medical/pediatric_clinic.csv`
- `data/raw/medical/family_medicine.csv` (optional, `scripts/extract_family_medicine.py`가 `hospital_raw.json` 보유 시 자동 생성)
- `data/raw/medical/general_hospital.csv`
- `data/raw/administration/community_center.csv`
- `data/raw/administration/district_office.csv`
- `data/raw/administration/city_hall.csv`
- `data/raw/education/childcare_center.csv`
- `data/raw/education/kindergarten.csv`
- `data/raw/leisure/park.csv`
- `data/raw/leisure/library_culture.csv`

대형상업시설은 optional 데이터이며 현재 미확보 상태다. 여가 점수는 공원 + 도서관/문화시설 기반 대체 산식을 사용한다.

의료 카테고리 구성:

- 소아청소년과
- 가정의학과 (optional)
- 종합병원/대학병원

가정의학과는 `data/raw/medical/family_medicine.csv`가 있으면 의료 산식 `MedicalScore = 0.60 × PediatricScore + 0.20 × FamilyMedicineScore + 0.20 × GeneralHospitalScore`를 적용하고, 파일이 없으면 기존 대체 산식 `MedicalScore = 0.70 × PediatricScore + 0.30 × GeneralHospitalScore`를 사용한다. 실제 적용 산식은 `public/data/metadata.json`의 `applied_medical_formula`와 `family_medicine_used`에서 확인한다.

TbHospitalInfo 원천에 별도 진료과목 컬럼이 없어 `scripts/extract_family_medicine.py`는 DUTYNAME(기관명)에 "가정의학"이 포함된 행을 `facility_name_fallback` 방식으로 추출한다.

## public/data 출력 파일

전처리가 완료되면 웹에서 읽을 최종 파일은 `public/data/` 아래에 생성된다. Vite public 폴더 기준으로 브라우저에서는 `/data/foo.json` 형태로 접근한다.

- `public/data/seoul_districts.geojson`
- `public/data/grid_scores.geojson`
- `public/data/district_scores.json`
- `public/data/facilities.geojson`
- `public/data/category_summary.json`
- `public/data/benchmark_recommendations.json`
- `public/data/metadata.json`

출력 확인:

```bash
python scripts/validation/validate_processed_data.py
```

## OverviewPage

OverviewPage는 공모전 시각화 결과물의 메인 화면으로, 아래 세 파일만 사용한다.

- `/data/seoul_districts.geojson`
- `/data/district_scores.json`
- `/data/metadata.json`

주요 기능:

- 서울 25개 구 choropleth 지도
- 통합/의료/행정/교육/여가 카테고리 필터
- 선택 카테고리 기준 TOP 5 / BOTTOM 5 랭킹
- 서울 평균 점수, 최고 점수 구, 개선 여지 큰 구, 격차가 큰 카테고리 KPI
- 점수 범례와 데이터 기준 안내
- 구 클릭 시 `/district/:districtId` 상세 페이지 이동

데이터가 없으면 빈 지도나 임의 점수를 만들지 않고 `데이터 준비 필요` 상태와 누락 파일명을 표시한다. 점수는 공개데이터 기반 생활시설 접근성 비교 지표이며, 실제 현장 이동 가능 여부를 확정하지 않는다.

## DistrictDetailPage

Route:

- `/district/:districtId`

`districtId`는 `district_code` 또는 `district_name`으로 매칭한다.

DistrictDetailPage는 아래 전처리 결과 파일만 사용한다.

- `/data/seoul_districts.geojson`
- `/data/grid_scores.geojson`
- `/data/district_scores.json`
- `/data/facilities.geojson`
- `/data/benchmark_recommendations.json`
- `/data/metadata.json`

주요 기능:

- 선택 구 요약 헤더와 서울 내 순위
- 의료/행정/교육/여가 점수 카드
- 선택 구 경계, 250m 격자 heatmap, 시설 위치 지도
- 통합/의료/행정/교육/여가 카테고리 필터
- 카테고리별 시설 유형 체크 필터
- 구 내부 격자 요약과 강점/개선 여지 해석
- 벤치마킹 추천 CTA
- 데이터 기준과 한계 안내

데이터가 없으면 가짜 구 상세, 임의 격자, 임의 시설점을 만들지 않고 `데이터 준비 필요` 상태와 누락 파일명을 표시한다. 구 상세 지도는 `grid_scores.geojson`과 `facilities.geojson`에 포함된 feature만 표시한다.

## CategoryDetailPage

Route:

- `/category/:categoryId`

지원 카테고리:

- `medical`
- `administration`
- `education`
- `leisure`

CategoryDetailPage는 아래 전처리 결과 파일만 사용한다.

- `/data/seoul_districts.geojson`
- `/data/grid_scores.geojson`
- `/data/district_scores.json`
- `/data/facilities.geojson`
- `/data/category_summary.json`
- `/data/metadata.json`

주요 기능:

- 의료/행정/교육/여가 카테고리 탭
- 카테고리별 서울 25개 구 점수 지도
- 구별 보기와 250m 격자 보기 전환
- 선택 카테고리 시설 유형 필터와 시설 point layer
- 접근성이 높게 나타난 구 / 개선 여지가 큰 구 순위
- 카테고리별 점수 분포 통계
- 카테고리 산식과 데이터 기준 안내

데이터가 없으면 가짜 구 점수, 임의 격자, 임의 시설점을 만들지 않고 `데이터 준비 필요` 상태와 누락 파일명을 표시한다. 점수는 공개데이터 기반 생활시설 접근성 비교 지표이며, 실제 현장 이동 가능 여부를 확정하지 않는다.

## BenchmarkPage

Route:

- `/benchmark`
- `/benchmark?district=:districtId`

BenchmarkPage는 아래 전처리 결과 파일만 사용한다.

- `/data/district_scores.json`
- `/data/benchmark_recommendations.json`
- `/data/category_summary.json`
- `/data/metadata.json`

주요 기능:

- 구 선택과 점수 기준 정렬
- 선택 구 점수 요약
- 전처리된 벤치마킹 추천 구 표시
- 선택 구, 추천 구, 서울 평균 카테고리 점수 비교 차트
- 약점 카테고리 중심 개선 힌트
- 개선 여지가 큰 구 빠른 탐색
- 추천 방식과 데이터 한계 안내

벤치마킹 추천은 `benchmark_recommendations.json`에 생성된 실제 추천 항목만 표시한다. 추천 데이터가 없으면 임의 추천을 만들지 않고 `이 구에 대한 벤치마킹 추천 데이터가 아직 생성되지 않았습니다.` 상태를 표시한다.

개선 힌트는 정책 결정을 확정하는 문장이 아니라 공개데이터 기반 생활시설 접근성 차이를 확인하기 위한 참고 문장으로 해석한다.

## MethodologyPage

Route:

- `/methodology`

MethodologyPage는 아래 전처리 결과 파일을 확인한다.

- `/data/metadata.json`
- `/data/category_summary.json`
- `/data/district_scores.json`

기본 산식, 기준거리, 전처리 흐름, 한계 설명은 데이터 파일이 없어도 표시한다. 다만 실제 사용 데이터 출처 목록은 `metadata.json`의 `source_datasets`에 기록된 정보만 표시한다.

`metadata.json`이 없거나 `source_datasets`가 없으면 실제 사용 데이터 목록을 임의로 만들지 않고 `metadata.json에 실제 사용 데이터 목록이 기록되어 있지 않습니다.` 안내를 표시한다.

방법론 페이지에는 시설 접근 점수, 카테고리별 산식, 구별 집계 방식, optional 데이터 처리, 좌표계, 전처리 스크립트, 서울 데이터 허브 활용 안내, 심사 기준 대응 요약과 한계 문구가 포함된다.

## 데이터가 없을 때 동작 방식

필수 원천 데이터가 없으면 전처리 스크립트는 중단하고 누락 파일 경로를 출력한다.

샘플 데이터, 더미 데이터, 임의 점수, 임의 시설 마커는 생성하지 않는다.

대형상업시설 데이터는 optional이다. 해당 파일이 없으면 `metadata.json`에 unavailable로 기록하고, 여가 점수는 대체 산식을 사용한다.

웹 앱은 `public/data/` 최종 산출물이 없더라도 깨지지 않고 `데이터 준비 필요` 상태를 표시한다. 이때 화면을 채우기 위한 임의 데이터는 만들지 않는다.

공통 안내 문구:

> 전처리된 데이터 파일이 필요합니다. data/raw에 원천 데이터를 배치한 뒤 Python 전처리 파이프라인을 실행해 public/data 파일을 생성해 주세요.

## 전처리 후 웹 확인 방법

1. `data/raw/` 아래에 실제 원천 데이터를 배치한다.
2. `config/data_config.yaml`의 파일 경로와 컬럼명을 실제 데이터에 맞춘다.
3. `pip install -r requirements-preprocess.txt`를 실행한다.
4. `python scripts/run_preprocessing.py`로 `public/data/` 산출물을 생성한다.
5. `npm run dev`로 웹에서 결과를 확인한다.

## GitHub Pages 배포 예정 구조

- Vite 정적 빌드 산출물을 GitHub Pages에 배포한다.
- 웹은 백엔드 서버나 데이터베이스 없이 `public/data/` 파일만 읽는다.
- 거리 계산과 점수 계산은 Python 전처리에서 끝난 결과만 사용한다.

## 전처리 원칙

- 모든 거리 계산과 점수 계산은 Python 전처리에서 수행한다.
- 웹 브라우저에서는 거리 계산이나 점수 계산을 수행하지 않는다.
- 실제 원천 데이터 없이 결과 파일을 만들지 않는다.
- 최종 검증은 `scripts/validation/validate_processed_data.py`에서 수행한다.

## 지도 베이스맵과 레이어 구조

모든 주요 지도 화면은 단독 격자/구별 시각화가 아니라 실제 베이스맵 위에 분석 레이어가 오버레이되는 구조다.

베이스맵:

- MapLibre GL JS 기반.
- 기본 타일은 CARTO Positron(light_all) raster tile.
- 외부 접근이 불안정한 경우 OpenStreetMap raster tile fallback.
- Mapbox token 등 별도 인증이 필요한 스타일은 사용하지 않는다.
- 베이스맵 정의는 `src/config/mapStyle.ts`의 `BASE_MAP_STYLE`, `BASE_MAP_ATTRIBUTION`, `DEFAULT_SEOUL_CENTER`, `DEFAULT_SEOUL_ZOOM`, `DEFAULT_MAP_BOUNDS`를 사용한다.
- attribution은 MapLibre `AttributionControl`을 통해 지도 우하단에 자동 표시된다.

레이어 순서:

1. 베이스맵 raster
2. 서울시 또는 선택 구 경계 fill (낮은 opacity hit-detection 용)
3. 250m 격자 heatmap fill (`fill-opacity` 0.55~0.7로 베이스맵이 비치도록)
4. 격자 outline
5. 주요 시설 포인트 (`facilities.geojson`의 실제 좌표 기반)
6. 구 경계 line (선택 구 강조)
7. hover / selected highlight
8. popup / tooltip

격자 heatmap은 단독 지도가 아니라 베이스맵 위에 반투명하게 올라가는 분석 레이어다. 시설 포인트는 카테고리별 색상(의료 rose, 행정 blue, 교육 amber, 여가 emerald)을 사용하며, 흰색 outline으로 베이스맵 위에서도 잘 보이도록 처리한다.

지도 페이지에는 점수 범례(`ScoreLegend`)와 시설 범례(`FacilityLegend`)가 함께 표시된다.

베이스맵 타일 로딩이 반복적으로 실패하면 `BasemapErrorBanner`가 지도 상단에 오버레이로 표시되고, 카드/랭킹/표 등 데이터 요약은 계속 확인할 수 있다.

데이터 부재 시 동작:

- 베이스맵은 로딩되었지만 `grid_scores.geojson`이 없으면 베이스맵과 선택 구 경계만 표시하고 `250m 격자 점수 데이터가 필요합니다.` 안내를 보여준다.
- `facilities.geojson`이 없으면 베이스맵, 경계, 격자만 표시하고 `시설 위치 데이터가 필요합니다.` 안내를 보여준다.
- geometry가 비어있는 시설 feature는 표시하지 않는다.

## 생활 출발지 가중치 (LivingWeight)

서울 자치구는 공원, 녹지, 하천, 산지, 임야 면적 비중이 구마다 크게 다르다. 비생활 출발지 격자까지 단순 평균하면 면적이 큰 자치구의 점수가 왜곡될 수 있어, 가능한 경우 생활 출발지 가중 평균을 적용한다.

```text
DistrictStrollerScore(d) = Σ GridStrollerScore(g) × LivingWeight(g) / Σ LivingWeight(g)
```

원칙:

- 공원은 여가 카테고리의 도착지로 계속 사용한다 (`facility_type = park`, `LeisureScore` 산식의 `ParkScore` 유지).
- 공원 내부 격자, 녹지지역 내부 격자는 출발지 가중치를 낮은 값 또는 0으로 둔다.
- 하천, 산지, 임야 내부 격자는 출발지 가중치를 0으로 둔다.
- 주거/준주거/상업/공업/준공업 면적 비율이 높을수록 LivingWeight가 1에 가까워진다.

데이터 의존성:

- 용도지역, 공원 폴리곤, 하천, 산지/임야 폴리곤 등 토지이용 공간데이터를 `data/raw/land_use/` 아래에 배치한다.
- 모든 토지이용 데이터가 없으면 LivingWeight를 계산하지 않고 구별 점수는 `simple_average` fallback을 사용한다.
- 실제 적용 결과는 `public/data/metadata.json`의 `aggregation_method`(`living_weighted_average` / `simple_average`)와 `living_weight_status`(`applied` / `unavailable`)로 확인한다.

## 실제 public/data 스키마와 웹 표시

현재 웹은 전처리로 생성된 실제 `public/data` 파일만 읽는다. 실제 스키마 요약은 `docs/data_schema_actual.md`에 기록되어 있다.

- 구 매칭: `district_code` 우선, 없으면 `district_name`
- 통합 격자 점수: `overall_score`, `grid_stroller_score`, `stroller_score` 순서로 안전하게 읽음
- 행정 점수: 실제 산출물의 `admin_score`를 사용하며 `administration_score`도 호환
- optional 대형상업시설 데이터가 없으면 여가 화면에서 `데이터 없음`으로 표시
- Category 페이지의 격자 지도는 기본 구별 보기에서 전체 격자 렌더링을 지연하고, 사용자가 격자 보기를 선택할 때 표시한다.

데이터가 부분적으로 누락된 경우 앱은 임의 점수나 임의 시설을 생성하지 않고 `데이터 준비 필요`, `계산 불가`, `데이터 없음` 상태를 표시한다. 검증 결과는 `reports/data_validation_report.md`에서 확인한다.
