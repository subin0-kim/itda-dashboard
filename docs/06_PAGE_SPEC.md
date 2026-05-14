# 06. Page Spec

이 페이지 구조는 발표자료 흐름이 아니라 GitHub Pages로 제출할 독립형 시각화 결과물 탐색 구조다. 사용자는 전체 현황, 구 상세, 카테고리, 방법론을 자유롭게 이동하며 결과를 확인한다.

## 공통 지도 구조

- 모든 지도 화면은 실제 베이스맵 위에 분석 레이어를 오버레이하는 구조로 구현한다.
- 베이스맵은 MapLibre GL JS + token-free raster tile(기본 CARTO Positron, fallback OpenStreetMap)이며, Mapbox token이 필요한 스타일은 사용하지 않는다.
- 베이스맵 정의는 `src/config/mapStyle.ts`의 `BASE_MAP_STYLE`, `DEFAULT_SEOUL_CENTER`, `DEFAULT_SEOUL_ZOOM`, `DEFAULT_MAP_BOUNDS`를 공유한다.
- 250m 격자 heatmap과 구별 choropleth는 베이스맵이 비치도록 반투명 fill로 구성한다.
- 시설 포인트는 `facilities.geojson`의 실제 feature 좌표 기반이며, geometry가 없는 feature는 표시하지 않는다.
- 모든 지도에는 점수 범례(`ScoreLegend`)와 시설 범례(`FacilityLegend`)가 함께 표시된다.
- 베이스맵 타일 로딩이 반복 실패하면 지도 상단에 `지도 배경을 불러오지 못했습니다. 데이터 요약 정보는 계속 확인할 수 있습니다.` 배너가 표시되고, 카드/랭킹/표는 계속 동작한다.

## OverviewPage 명세

목적:

- 서울 25개 구의 유모차 생활보행 점수를 한눈에 비교한다.

주요 요소:

- 서울 25개 구 지도
- 구별 유모차 생활보행 점수
- 접근성이 높게 나타난 구 TOP 5
- 개선 여지가 큰 구 BOTTOM 5
- 서울 평균 점수, 최고 점수 구, 개선 여지 큰 구, 격차가 큰 카테고리 KPI
- 의료/행정/교육/여가 카테고리 필터
- 점수 범례
- 데이터 기준 카드
- 데이터 없음 상태

인터랙션:

- 구 hover 시 구명, 통합 점수, 카테고리 점수 tooltip 표시
- 구 클릭 시 `DistrictDetailPage`로 이동
- 카테고리 필터 선택 시 지도 색상 기준 변경
- 데이터 기준 카드와 점수 해석 안내에 `aggregation_method`(생활 출발지 가중 평균 / 단순 평균)를 표시한다.

데이터:

- `seoul_districts.geojson`
- `district_scores.json`
- `metadata.json`

실제 데이터 매칭:

- `district_code`를 우선 사용하고, 없으면 `district_name`으로 매칭한다.
- 점수 필드는 `overall_score`, `medical_score`, `admin_score`, `education_score`, `leisure_score`를 사용한다.

데이터 없음 처리:

- `seoul_districts.geojson`이 없으면 `서울 구 경계 데이터가 필요합니다.`를 표시한다.
- `district_scores.json`이 없으면 `구별 유모차 생활보행 점수 데이터가 필요합니다.`를 표시한다.
- 두 파일 중 하나라도 없으면 `전처리된 서울 구 경계 데이터와 구별 점수 데이터가 필요합니다.` 안내를 표시한다.
- 일부 구만 점수가 없으면 해당 구는 회색으로 표시한다.

## DistrictDetailPage 명세

목적:

- 선택한 구의 점수 구조와 격자별 편차를 상세히 확인한다.

주요 요소:

- 선택 구 하이라이트
- 선택 구의 통합 점수
- 서울 내 순위
- 의료/행정/교육/여가 점수 카드
- 250m 격자 heatmap
- 주요 시설 점 표시
- 카테고리별 시설 필터
- 강점/약점 설명
- 구 내부 격자 요약
- 데이터 기준 및 한계 안내

인터랙션:

- 격자 hover 시 통합 점수와 카테고리 점수 표시
- 시설 필터 선택 시 표시 시설 변경
- 시설 점 클릭 시 시설명, 카테고리, 시설 유형, 원본 데이터명을 표시

데이터:

- `seoul_districts.geojson`
- `grid_scores.geojson`
- `district_scores.json`
- `facilities.geojson`
- `metadata.json`

실제 데이터 매칭:

- 격자 통합 점수는 `overall_score`, `grid_stroller_score`, `stroller_score` 순서로 읽는다.
- 시설 필터는 `category`와 `facility_type`을 기준으로 동작한다.
- 시설 popup은 주소가 있으면 주소를 함께 표시한다.

데이터 없음 처리:

- `district_scores.json`이 없으면 `구별 점수 데이터가 필요합니다.`를 표시한다.
- `seoul_districts.geojson`이 없으면 `서울 구 경계 데이터가 필요합니다.`를 표시한다.
- `grid_scores.geojson`이 없으면 `250m 격자 점수 데이터가 필요합니다.`를 표시하고 베이스맵과 선택 구 경계는 그대로 유지한다.
- `facilities.geojson`이 없으면 `시설 위치 데이터가 필요합니다.`를 표시하고 베이스맵, 경계, 격자는 그대로 유지한다.
- 선택 구에 해당하는 격자가 없으면 `선택한 구의 격자 점수 데이터가 없습니다.`를 표시한다.
- 선택 구에 해당하는 시설이 없으면 `선택한 구의 시설 위치 데이터가 없습니다.`를 표시한다.
- 베이스맵 타일이 실패해도 지도 영역이 완전히 깨지지 않게 안내 배너만 표시하고 카드와 랭킹은 계속 동작한다.

## CategoryDetailPage 명세

목적:

- 의료, 행정, 교육, 여가 중 선택 카테고리의 공간적 분포와 구별 순위를 확인한다.

주요 요소:

- 의료/행정/교육/여가 탭
- 선택 카테고리 기준 서울 25개 구 점수 지도
- 선택 카테고리의 250m 격자 점수 지도
- 해당 시설 점 표시
- 시설 유형 필터
- 카테고리별 구 순위
- 카테고리 설명
- 카테고리별 통계 인사이트
- 카테고리 산식
- 데이터 기준 및 한계 안내

인터랙션:

- 카테고리 탭 변경 시 지도, 마커, 순위 갱신
- 시설 유형 필터 변경 시 마커 갱신
- 구별 보기와 격자 보기 토글
- 구 hover 시 구명과 카테고리 점수 표시
- 격자 hover 시 격자 ID, 구명, 카테고리 점수 표시
- 구 순위 항목 클릭 시 `DistrictDetailPage`로 이동

데이터:

- `seoul_districts.geojson`
- `grid_scores.geojson`
- `district_scores.json`
- `facilities.geojson`
- `category_summary.json`
- `metadata.json`

실제 데이터 매칭:

- 기본 지도 모드는 구별 보기이며, 격자 보기는 선택 시 렌더링해 초기 지도 표시 비용을 줄인다.
- `large_retail_optional` 데이터가 없으면 여가 시설 필터에서 데이터 없음으로 표시한다.
- `family_medicine` 데이터가 없으면 의료 시설 필터에서 데이터 없음으로 표시하고, 카테고리 헤더에 "현재 데이터에서는 가정의학과가 별도 반영되지 않아 소아청소년과와 종합병원 기준으로 의료 접근성을 계산했습니다." 안내를 노출한다. 의료 산식 적용 결과는 `metadata.applied_medical_formula`로 판별한다.

데이터 없음 처리:

- `district_scores.json`이 없으면 `구별 점수 데이터가 필요합니다.`를 표시한다.
- `seoul_districts.geojson`이 없으면 `서울 구 경계 데이터가 필요합니다.`를 표시한다.
- `grid_scores.geojson`이 없으면 `250m 격자 점수 데이터가 필요합니다.`를 표시한다.
- `facilities.geojson`이 없으면 `시설 위치 데이터가 필요합니다.`를 표시한다.
- 선택 카테고리 점수 필드가 없으면 `선택 카테고리 점수 데이터가 없습니다.`를 표시한다.
- 선택 카테고리 시설이 없으면 `선택 카테고리 시설 데이터가 없습니다.`를 표시한다.

## MethodologyPage 명세

목적:

- 프로젝트 설명, 산식, 데이터 출처, 전처리 파이프라인, 한계를 명확히 설명한다.

주요 요소:

- 프로젝트 설명
- 점수 산식
- 250m 격자 설명
- 카테고리별 시설 정의
- 만점 기준거리와 점수 0 도달 거리 표
- 구별 점수 집계 방식
- 데이터 출처 표
- 전처리 파이프라인 설명
- 한계와 주의사항
- Optional 데이터 처리 현황
- 좌표계와 거리 계산
- 서울 데이터 허브 활용 안내
- 심사 기준 대응 요약

필수 한계 문구:

> 본 점수는 실제 유모차 통행 가능 여부를 확정하는 지표가 아니라, 공개데이터 기반 생활시설 접근성을 비교하기 위한 시각화 지표입니다. 실제 현장 여건은 보도 폭, 단차, 공사, 불법주정차, 시설 운영시간 등에 따라 달라질 수 있습니다.

데이터:

- `metadata.json`
- `category_summary.json`
- `district_scores.json`

데이터 출처 파일 목록은 실제 전처리에서 사용된 raw data와 `metadata.json`의 `source_datasets`를 기준으로 표시한다. `source_datasets`가 없으면 실제 사용 데이터 목록을 임의로 만들지 않고 안내 문구를 표시한다.

생활 출발지 가중치 섹션은 `metadata.aggregation_method`, `living_weight_status`, `living_weight_limitations`, `origin_destination_role_note`를 기준으로 현재 적용 방식을 표시한다. 토지이용 데이터가 없어 fallback인 경우에도 산식과 설명은 정적으로 표시하되 현재 적용 방식은 `단순 평균`으로 명확히 표기한다. 구 상세 지도 tooltip은 `grid_scores.geojson`에 `living_weight` 값이 있을 때만 생활 출발지 가중치를 표시한다.
## 보행 네트워크 표시

DistrictDetailPage는 보행 네트워크 overlay 파일이 있는 경우 "보행 네트워크 보기" 토글을 제공한다. 노드/링크는 계산에 사용된 원천 기반 네트워크를 시각화하기 위한 레이어이며, 웹에서는 최단거리 계산을 수행하지 않는다.

MethodologyPage는 `metadata.distance_method`, `pedestrian_network_status`, `network_distance_coverage`, `euclidean_fallback_coverage`, `scoring_method`, `full_score_distance_m`, `zero_score_distance_m`를 표시한다. 실제 도보 네트워크 데이터가 없으면 네트워크 기반 계산을 적용했다고 표시하지 않고 직선거리 fallback 상태를 명확히 안내한다.
