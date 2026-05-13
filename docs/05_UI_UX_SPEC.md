# 05. UI/UX Spec

## 디자인 목표

- 서울 25개 구의 아이동반 친화성을 빠르게 비교할 수 있게 한다.
- 지도, 순위, 카테고리 점수를 함께 배치해 해석 흐름을 단순하게 만든다.
- 사용자가 데이터 활용, 산식, 시각화 결과, 한계를 직접 확인할 수 있게 한다.
- 발표자료가 아니라 독립형 데이터 시각화 웹페이지로 동작해야 한다.
- 데이터가 준비되지 않은 상태에서도 앱이 깨지지 않고 필요한 파일을 알려준다.

## 시각 스타일

- 공공데이터 기반 분석 대시보드에 맞는 차분하고 신뢰감 있는 스타일을 사용한다.
- 지도와 차트가 주인공이 되도록 장식적 요소를 최소화한다.
- 페이지 전체는 명확한 섹션, 고정된 정보 위계, 읽기 쉬운 표와 카드 중심으로 구성한다.
- 과도한 마케팅형 hero 구성보다 실제 분석 화면을 첫 화면에서 보여준다.
- 모바일에서도 지도, 순위, 점수 카드가 겹치지 않도록 반응형 레이아웃을 적용한다.

## 색상 규칙

- 통합 점수 heatmap은 낮음에서 높음으로 이어지는 연속 색상 팔레트를 사용한다.
- 낮은 점수는 개선 여지를 의미하되 위험 또는 부정 낙인으로 보이지 않게 표현한다.
- 카테고리별 색상은 의료, 행정, 교육, 여가를 명확히 구분한다.
- 지도 위 시설 마커 색상은 카테고리와 일관되게 유지한다.
- 색상만으로 정보를 전달하지 않고 범례, 레이블, tooltip을 함께 제공한다.

권장 색상 역할:

- 통합 점수: 연속형 sequential palette
- 의료: red 계열을 절제해 사용
- 행정: blue 계열
- 교육: amber/orange 계열
- 여가: emerald/green 계열
- 데이터 없음: neutral gray 계열

## 지도 베이스맵과 레이어 구조

- 모든 주요 지도 화면은 실제 베이스맵 위에 분석 레이어를 오버레이하는 구조로 구성한다.
- 베이스맵은 MapLibre GL JS와 token-free raster tile(CARTO Positron, OpenStreetMap fallback)로 구성한다.
- Mapbox token이 필요한 스타일은 사용하지 않는다.
- 베이스맵 정의는 `src/config/mapStyle.ts`의 공통 상수를 사용해 모든 지도 컴포넌트가 같은 스타일을 공유한다.
- 베이스맵이 너무 강해 분석 레이어가 묻히지 않도록 raster opacity와 choropleth/heatmap fill opacity를 함께 조정한다.

레이어 순서:

1. 베이스맵 raster
2. 서울시 또는 선택 구 경계 fill
3. 250m 격자 heatmap fill (반투명 분석 레이어)
4. 격자 outline
5. 주요 시설 포인트
6. 구 경계 line (선택 구 강조)
7. hover / selected highlight
8. popup / tooltip

- 격자 heatmap은 단독 지도가 아니라 베이스맵 위에 올라가는 분석 레이어다.
- 시설 포인트는 카테고리별 색상(의료, 행정, 교육, 여가)과 흰색 outline으로 베이스맵과 heatmap 위에서도 잘 보이도록 표시한다.
- 점수 범례와 시설 범례는 지도 위 모서리에 겹쳐 표시하되 본문 지도 영역을 가리지 않게 위치를 잡는다.
- 베이스맵 타일 로딩이 실패해도 앱은 깨지지 않고 안내 배너만 보이며, 데이터 카드와 랭킹은 계속 확인할 수 있다.

## 주요 인터랙션

- 구 지도 hover 시 구명과 점수 tooltip 표시
- 구 클릭 시 `DistrictDetailPage`로 이동
- 카테고리 필터 선택 시 지도 색상 기준 변경
- 점수 범례 표시
- 시설 유형 필터 선택 시 해당 시설 마커만 표시
- 의료 카테고리는 소아청소년과, 가정의학과(optional), 종합병원/대학병원 시설 유형으로 구성한다. 가정의학과 데이터가 미확보 상태이면 필터에서 비활성 + `데이터 없음`으로 표기하고, 카테고리 헤더에는 대체 산식이 적용되었음을 안내한다.
- 250m 격자 hover 시 격자 점수와 카테고리 점수 표시
- 벤치마킹 페이지에서 구 선택 시 추천 구와 비교 차트 갱신
- 데이터 파일 누락 시 누락 파일 목록 표시

## OverviewPage 구현 기준

- OverviewPage는 `/data/seoul_districts.geojson`, `/data/district_scores.json`, `/data/metadata.json`만 사용한다.
- 서울 구 경계와 구별 점수는 `district_code`를 우선 사용해 매칭하고, 코드가 없으면 `district_name`으로 매칭한다.
- 점수가 없는 구는 회색으로 표시하고 tooltip에는 `점수 없음`을 표시한다.
- 카테고리 필터는 통합, 의료, 행정, 교육, 여가를 제공하며 지도 색상, 랭킹, 설명 카드, 범례 제목을 함께 변경한다.
- 지도는 MapLibre GL JS 컴포넌트로 mount/unmount를 관리한다.
- 데이터가 없으면 빈 지도나 임의 수치를 만들지 않고 `데이터 준비 필요` 상태와 누락 파일명을 표시한다.
- 지도 색상은 공통 색상 스케일을 사용하며 0~100 절대 점수 구간을 유지한다.

## DistrictDetailPage 구현 기준

- DistrictDetailPage는 `/data/seoul_districts.geojson`, `/data/grid_scores.geojson`, `/data/district_scores.json`, `/data/facilities.geojson`, `/data/benchmark_recommendations.json`, `/data/metadata.json`만 사용한다.
- `districtId`는 `district_code`를 우선 사용하고, 없으면 `district_name`으로 매칭한다.
- 선택 구 경계, 선택 구 내부 250m 격자, 선택 구 시설 위치를 MapLibre GL JS 지도에 표시한다.
- 카테고리 선택 시 격자 heatmap 기준과 시설 표시 기준을 함께 변경한다.
- 시설 유형 필터는 선택 카테고리에 맞춰 표시하고, 데이터가 없는 유형은 비활성 상태로 둔다.
- 지도만으로 해석하지 않도록 점수 카드, 격자 요약, 강점/개선 여지 패널을 함께 제공한다.
- 데이터가 없으면 임의 격자나 임의 시설점을 만들지 않고 누락 파일명을 표시한다.
- 시설 popup에는 시설명, 카테고리, 시설 유형, 원본 데이터명과 주소가 있는 경우 주소를 표시한다.

## CategoryDetailPage 구현 기준

- CategoryDetailPage는 `/data/seoul_districts.geojson`, `/data/grid_scores.geojson`, `/data/district_scores.json`, `/data/facilities.geojson`, `/data/category_summary.json`, `/data/metadata.json`만 사용한다.
- 지원 route는 `/category/medical`, `/category/administration`, `/category/education`, `/category/leisure`다.
- 카테고리 탭, 시설 유형 필터, 구별 보기/격자 보기 지도, 구 순위, 통계, 산식을 한 흐름으로 배치한다.
- 구별 보기는 자치구 경계와 구별 점수를 매칭해 choropleth로 표시한다.
- 격자 보기는 `grid_scores.geojson`에 포함된 250m 격자 feature만 표시한다.
- 시설 포인트는 `facilities.geojson`의 실제 feature 중 선택 카테고리와 시설 유형에 해당하는 항목만 표시한다.
- 데이터가 없는 시설 유형은 비활성 상태로 두고 `데이터 없음`을 표시한다.
- 데이터가 없으면 임의 카테고리 점수, 임의 격자, 임의 시설점을 만들지 않고 누락 파일명을 표시한다.
- 기본은 구별 보기이며, 격자 데이터는 사용자가 격자 보기를 선택했을 때 지도 source에 반영한다.

## BenchmarkPage 구현 기준

- BenchmarkPage는 `/data/district_scores.json`, `/data/benchmark_recommendations.json`, `/data/category_summary.json`, `/data/metadata.json`만 사용한다.
- `/benchmark?district=:districtId` query가 있으면 해당 구를 기본 선택한다.
- 구 선택 UI는 구 이름, 전체 순위, 통합 점수를 함께 보여준다.
- 선택 구와 추천 구의 의료/교육/행정/여가 점수를 ECharts grouped bar chart로 비교한다.
- 추천은 `benchmark_recommendations.json`에 있는 항목만 표시하며, 브라우저에서 임의 추천을 만들지 않는다.
- 추천 데이터가 없으면 전처리 파이프라인에서 추천 파일을 생성해야 한다는 안내를 표시한다.
- 개선 힌트는 점수 차이를 바탕으로 `확인할 수 있습니다`, `검토할 수 있습니다`처럼 참고형 문장으로 제공한다.
- 비교 결과는 지역 비판이 아니라 개선 여지 탐색으로 보이도록 구성한다.

## UX 원칙

- 첫 화면에서 서울 25개 구 점수 지도를 바로 보여준다.
- 빈 상태는 문제를 숨기지 않고 어떤 데이터가 필요한지 알려준다.
- 사용자가 데이터 산식을 확인할 수 있도록 방법론 페이지로 연결한다.
- 점수 순위는 비교를 돕기 위한 정보로 표현하며 지역을 단정적으로 평가하지 않는다.
- `접근성이 낮게 나타남`, `개선 여지가 있음`처럼 분석 결과에 맞는 표현을 사용한다.
- 샘플 데이터나 더미 데이터로 화면을 채우지 않는다.

## 필요한 컴포넌트

- `Layout`
- `TopNavigation`
- `MapContainer`
- `DistrictChoroplethLayer`
- `GridHeatmapLayer`
- `FacilityMarkerLayer`
- `ScoreLegend`
- `CategoryFilter`
- `FacilityTypeFilter`
- `ScoreCard`
- `RankList`
- `TopBottomDistrictPanel`
- `DistrictSummaryPanel`
- `CategoryScoreChart`
- `BenchmarkSelector`
- `BenchmarkComparisonChart`
- `MethodologyFormulaBlock`
- `DataSourceTable`
- `DataStatusPanel`
- `MissingDataNotice`
