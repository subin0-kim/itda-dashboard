# AGENTS.md

이 저장소는 서울시 빅데이터 활용 경진대회 시각화 부문 제출용 정적 웹 대시보드 `잇다(:connect)`를 개발하기 위한 프로젝트다.

## 프로젝트 정체성

- 프로젝트명: 잇다(:connect)
- 캐치프레이즈: 아이와 도시를 잇다. 서울의 미래를 잇다.
- 목적: 서울 25개 구의 아이동반 친화성을 250m 격자 기반 `유모차 생활보행 점수`로 시각화한다.
- 핵심 질문: 서울의 각 구는 아이와 함께 유모차로 의료, 행정, 교육, 여가 시설에 접근하기 쉬운가?

## 반드시 지킬 범위

이 프로젝트는 오직 `유모차/아이동반 이동성`만 다룬다.

유모차/아이동반 이동성과 직접 관련 없는 다른 접근성 주제로 확장하지 않는다.

## 아키텍처 원칙

이 프로젝트는 GitHub Pages 기반 정적 웹 대시보드다.

금지 사항:

- 백엔드 서버 생성 금지
- 데이터베이스 사용 금지
- 브라우저에서 거리 계산 금지
- 브라우저에서 점수 계산 금지
- 샘플 데이터 생성 금지
- 더미 데이터 생성 금지
- 임의 점수 생성 금지
- 임의 지도 마커 생성 금지

필수 사항:

- 모든 거리 계산과 점수 계산은 Python 전처리에서 수행한다.
- 웹은 `public/data/` 아래의 전처리 결과 파일만 로딩한다.
- 데이터 파일이 없으면 앱은 깨지지 않고 `데이터 준비 필요` 또는 `데이터를 불러올 수 없음` 상태를 보여준다.
- 데이터가 없다는 이유로 가짜 데이터를 만들지 않는다.

## 웹에서 읽을 수 있는 데이터 파일

웹 애플리케이션은 아래 파일만 읽는다.

- `public/data/seoul_districts.geojson`
- `public/data/grid_scores.geojson`
- `public/data/district_scores.json`
- `public/data/facilities.geojson`
- `public/data/category_summary.json`
- `public/data/metadata.json`

## 기술 스택

Frontend:

- Vite
- React
- TypeScript
- Tailwind CSS
- React Router
- MapLibre GL JS
- ECharts
- lucide-react

Preprocessing:

- Python
- pandas
- geopandas
- shapely
- pyproj
- scipy 또는 scikit-learn

Data Format:

- GeoJSON
- JSON
- CSV

Deployment:

- GitHub Pages
- GitHub Actions

품질 도구:

- 가능하면 ESLint, Prettier를 설정한다.
- Python은 가능하면 ruff, black을 사용한다.
- 품질 도구 설정 때문에 전체 작업이 막히면 빌드 성공을 우선한다.

## 점수 계산 원칙

- 분석 단위는 250m x 250m 격자다.
- 출발점은 각 격자의 중심점이다.
- 격자 중심점에서 시설 유형별 가장 가까운 시설까지의 거리를 Python 전처리에서 계산한다.
- 시설 접근 점수, 카테고리 점수, 격자 통합 점수, 구별 점수는 `docs/03_SCORING_METHODOLOGY.md`를 따른다.

## 표현 원칙

사용 가능한 표현:

- 유모차 생활보행 점수
- 아이동반 친화점수
- 공개데이터 기반 생활시설 접근성
- 아이와 함께 이동하기 좋은 생활권
- 접근성이 낮게 나타남
- 개선 여지가 있음

사용 금지 표현:

- 통행 가능 확정
- 통행 불가 확정
- 아이 키우기 나쁜 구
- 위험한 구
- 프로젝트 범위를 벗어난 다른 접근성 주제명

반드시 포함해야 하는 한계 문구:

> 본 점수는 실제 유모차 통행 가능 여부를 확정하는 지표가 아니라, 공개데이터 기반 생활시설 접근성을 비교하기 위한 시각화 지표입니다. 실제 현장 여건은 보도 폭, 단차, 공사, 불법주정차, 시설 운영시간 등에 따라 달라질 수 있습니다.

## 개발 시 참고 문서

- `docs/00_PROJECT_BRIEF.md`
- `docs/01_PRODUCT_REQUIREMENTS.md`
- `docs/02_DATA_CATALOG.md`
- `docs/03_SCORING_METHODOLOGY.md`
- `docs/04_PREPROCESSING_PIPELINE.md`
- `docs/05_UI_UX_SPEC.md`
- `docs/06_PAGE_SPEC.md`
- `docs/07_DEPLOYMENT_GUIDE.md`
- `docs/08_LIMITATIONS_AND_ETHICS.md`
- `docs/09_CONTEST_SUBMISSION_CHECKLIST.md`
- `docs/10_TECH_STACK.md`

## 저장소 구조 제안

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
