# 07. Deployment Guide

## GitHub Pages 배포

이 프로젝트는 GitHub Pages에 정적 웹 대시보드로 배포한다. 제출물의 GitHub Pages URL은 발표자료가 아니라 심사자가 직접 탐색하는 `시각화 결과물` URL이다.

배포 결과물은 Vite build 산출물이며, 백엔드 서버와 데이터베이스를 사용하지 않는다.

라우팅은 GitHub Pages 새로고침 안정성을 위해 `HashRouter`를 사용한다. 제출 URL은 저장소 Pages 주소이며, 내부 페이지는 `#/category/medical`, `#/district/11110`처럼 hash route로 접근한다.

## GitHub Actions

권장 배포 흐름:

1. `main` 브랜치에 push
2. GitHub Actions 실행
3. Node.js 설치
4. 의존성 설치
5. TypeScript 검사 및 build 실행
6. Vite build 산출물을 GitHub Pages에 배포

데이터 전처리는 배포 워크플로에서 자동으로 수행하지 않는 것을 기본 원칙으로 한다. 전처리 결과 파일은 검증 후 `public/data/`에 배치한다.

## build 방법

권장 명령:

```bash
npm install
npm run build
```

품질 도구가 설정된 경우:

```bash
npm run lint
npm run build
```

품질 도구 설정 문제가 전체 작업을 막는 경우, 우선순위는 build 성공이다.

## public/data 파일 설명

웹은 아래 파일만 읽는다.

- `public/data/seoul_districts.geojson`
- `public/data/grid_scores.geojson`
- `public/data/district_scores.json`
- `public/data/facilities.geojson`
- `public/data/category_summary.json`
- `public/data/metadata.json`

이 파일들은 Python 전처리 결과물이다. 웹에서 거리 계산이나 점수 계산을 수행하지 않는다.

## 데이터 없음 처리

앱은 데이터 파일이 없어도 깨지지 않아야 한다.

필수 동작:

- 누락 파일명을 사용자에게 표시한다.
- `데이터 준비 필요` 또는 `데이터를 불러올 수 없음` 상태를 표시한다.
- 샘플 데이터, 더미 데이터, 임의 점수, 임의 시설 마커를 생성하지 않는다.
- 부분 데이터만 있는 경우, 가능한 화면만 표시하고 불가능한 화면에는 명확한 빈 상태를 표시한다.

배포 전 확인:

- `public/data/` 파일명이 문서와 코드에서 일치하는지 확인한다.
- GitHub Pages base path가 Vite 설정과 맞는지 확인한다.
- Vite `base`는 상대 경로인 `./`로 둔다.
- 지도 스타일은 토큰이 필요 없는 코드 내 기본 style object를 사용한다.
- 빌드 산출물에서 데이터 파일이 포함되는지 확인한다.
