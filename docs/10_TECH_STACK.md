# 10. Tech Stack

## Frontend stack

- Vite
- React
- TypeScript
- Tailwind CSS
- React Router
- MapLibre GL JS
- ECharts
- lucide-react

역할:

- Vite: 정적 웹 애플리케이션 빌드
- React: 페이지와 컴포넌트 구성
- TypeScript: 데이터 타입과 UI 상태 안정성 확보
- Tailwind CSS: 반응형 UI 스타일링
- React Router: 페이지 라우팅
- MapLibre GL JS: 자치구 지도, 격자 heatmap, 시설 마커 표시
- ECharts: 순위와 카테고리 비교 차트 표시
- lucide-react: 버튼과 UI 아이콘

## Preprocessing stack

- Python
- pandas
- geopandas
- shapely
- pyproj
- scipy 또는 scikit-learn

역할:

- pandas: 표 형식 원천 데이터 정리
- geopandas: 공간 데이터 로딩, 변환, 공간 조인
- shapely: 격자 생성, geometry 처리
- pyproj: 좌표계 변환
- scipy 또는 scikit-learn: 최근접 시설 거리 계산

## Data format

- GeoJSON: 자치구 경계, 격자 점수, 시설 위치
- JSON: 구별 점수, 카테고리 요약, 메타데이터
- CSV: 원천 또는 중간 전처리 테이블

웹에서 읽는 최종 데이터 파일:

- `public/data/seoul_districts.geojson`
- `public/data/grid_scores.geojson`
- `public/data/district_scores.json`
- `public/data/facilities.geojson`
- `public/data/category_summary.json`
- `public/data/metadata.json`

## Deployment stack

- GitHub Pages
- GitHub Actions

배포 원칙:

- 정적 build 산출물만 배포한다.
- 백엔드 서버를 만들지 않는다.
- 데이터베이스를 사용하지 않는다.
- `public/data/`의 전처리 결과 파일을 포함한다.

## Repository structure

권장 저장소 구조:

```text
itta-connect/
├─ AGENTS.md
├─ README.md
├─ docs/
├─ config/
│  └─ data_config.yaml
├─ data/
│  └─ raw/
├─ scripts/
│  ├─ preprocess/
│  └─ validation/
├─ public/
│  └─ data/
├─ src/
│  ├─ components/
│  ├─ pages/
│  ├─ hooks/
│  ├─ config/
│  ├─ types/
│  └─ utils/
├─ package.json
├─ vite.config.ts
└─ tailwind.config.ts
```

## Non-goals

- 백엔드 서버 생성
- 데이터베이스 사용
- 브라우저에서 거리 계산
- 브라우저에서 점수 계산
- 샘플 데이터 생성
- 더미 데이터 생성
- 임의 점수 생성
- 임의 지도 마커 생성
- 실제 통행 가능 여부 확정
- 유모차/아이동반 이동성과 직접 관련 없는 다른 접근성 분석
