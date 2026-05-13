# Data Source Recheck

## 결론

받기 실패했던 서울 열린데이터 API 중 핵심 5개는 실제 포털에 존재하며, 현재 직접 OpenAPI 호출로 수집 완료했다.

이전 실패 원인은 데이터셋 부재가 아니라 호출 시점의 API 또는 포털 프록시 응답 불안정으로 판단한다. 수집 스크립트는 직접 OpenAPI를 우선 호출하고 실패 시 포털 프록시를 보조로 시도하도록 정비했다.

샘플/더미/임의 데이터는 생성하지 않는다.

## 수집 완료 데이터

| 시설 유형 | 현재 산식 코드 | 확인한 원천 | 확보 방식 | 현재 상태 |
| --- | --- | --- | --- | --- |
| 소아청소년과 | `pediatric_clinic` | 서울 열린데이터광장 `서울시 병의원 위치 정보`, 서비스명 `TbHospitalInfo` | API 수집 후 기관명에 소아청소년과/소아과가 포함된 시설만 보수적으로 필터링 | `data/raw/medical/pediatric_clinic.csv` 생성 |
| 종합병원/대학병원 | `general_hospital` | 서울 열린데이터광장 `서울시 병의원 위치 정보`, 서비스명 `TbHospitalInfo` | API 수집 후 병원종별/기관명/설명 기반 필터링 | `data/raw/medical/general_hospital.csv` 생성 |
| 어린이집 | `childcare_center` | 서울 열린데이터광장 `서울시 어린이집 정보(표준 데이터)`, 서비스명 `ChildCareInfo` | API 수집 후 좌표가 있는 행만 사용 | `data/raw/education/childcare_center.csv` 생성 |
| 공원 | `park` | 서울 열린데이터광장 `서울시 주요 공원현황`, 서비스명 `SearchParkInfoService` | API 수집 후 WGS84 좌표 사용 | `data/raw/leisure/park.csv` 생성 |
| 도서관/문화시설 | `library_culture` | 서울 열린데이터광장 `서울시 문화공간 정보` 서비스명 `culturalSpaceInfo`, `서울시 공공도서관 현황정보` 서비스명 `SeoulPublicLibraryInfo` | 두 API 수집 후 통합 | `data/raw/leisure/library_culture.csv` 생성 |
| 시청 | `city_hall` | 서울특별시청 공식 위치 | 단일 공공시설 좌표 원천으로 기록 | `data/raw/administration/city_hall.csv` 생성 |

## 아직 필요한 데이터

| 시설 유형 | 현재 산식 코드 | 확인 결과 | 확보 방식 | 현재 상태 |
| --- | --- | --- | --- | --- |
| 주민센터 | `community_center` | 서울 열린데이터광장 `서울시 자치회관 현황` 파일 또는 행정안전부 읍면동 하부행정기관 현황처럼 주소 기반 원천 사용 가능 | 주소 원천 CSV를 `data/raw/administration/community_center_addresses.csv`에 배치한 뒤 행정안전부 주소정보 API로 좌표 변환 | 좌표 변환 스크립트 생성 완료 |
| 구청 | `district_office` | 서울 열린데이터광장에서 좌표 포함 통합 API 확인 못함 | 서울 25개 구청 공식 주소 목록을 `data/raw/administration/district_office_addresses.csv`에 배치한 뒤 행정안전부 주소정보 API로 좌표 변환 | 좌표 변환 스크립트 생성 완료 |
| 유치원 | `kindergarten` | 서울 열린데이터광장에서 통합 유치원 좌표 API 확인 못함 | 공공데이터포털 `서울특별시교육청_연도별 학교 위도 경도 데이터`에서 학교급=유치원 필터링 | 대체 원천 필요 |
| 대형상업시설 | `large_retail_optional` | 현재 서울 열린데이터광장에서 안정적 좌표 원천 확인 못함 | optional. 확보 전까지 여가 대체 산식 사용 | optional 미확보 |

## 좌표 확보 전략

### 1. 좌표가 API에 포함된 데이터

그대로 수집한다.

- `TbHospitalInfo`: `WGS84LON`, `WGS84LAT`
- `SearchParkInfoService`: `XCRD`, `YCRD`
- `culturalSpaceInfo`: `Y_COORD`, `X_COORD`
- `SeoulPublicLibraryInfo`: `YDNTS`, `XCNTS`
- `ChildCareInfo`: `LO`, `LA`

### 2. 주소만 있는 데이터

주소를 공식 좌표 변환 API로 변환한다.

우선 후보:

- 행정안전부 실시간 주소정보 조회 API: 주소 검색 결과에서 행정구역코드, 도로명코드, 건물본번, 건물부번 등 좌표 조회에 필요한 주소 식별자를 확보
- 행정안전부 실시간 주소별 좌표정보 조회 API: 주소 식별자를 기준으로 X/Y 좌표 확보

적용 대상:

- 서울시 자치회관 현황
- 구청 주소 목록
- 구별 주민센터 또는 행정복지센터 주소 목록

### 3. 서울 열린데이터에 통합 원천이 없는 데이터

공공데이터포털 또는 기관 공식 원천을 사용한다.

- 유치원: `서울특별시교육청_연도별 학교 위도 경도 데이터`에서 학교급이 유치원인 행만 사용
- 주민센터: 구별 공공데이터포털 데이터가 있으면 사용하되, 25개 구 전체 통합이 되지 않으면 서울시 자치회관 현황 + 주소 좌표 변환을 우선 검토

## 현재 추가로 필요한 키/자료

- 행정안전부 주소정보 API 승인키. 스크립트는 `JUSO_API_KEY` 또는 `DATA_GO_KR_JUSO_API_KEY` 환경변수를 사용한다.
- 유치원 좌표 파일: 공공데이터포털 `서울특별시교육청_연도별 학교 위도 경도 데이터`
- 주민센터/자치회관 주소 파일: `data/raw/administration/community_center_addresses.csv`
- 구청 공식 주소 목록: `data/raw/administration/district_office_addresses.csv`

서울 교통 빅데이터 플랫폼 데이터는 현재 산식에는 필요하지 않다.

## 생성한 좌표 변환 도구

- `scripts/geocode_admin_facilities.py`

실행 예시:

```bash
set JUSO_API_KEY=발급받은_승인키
python scripts/geocode_admin_facilities.py
```

검증 결과:

- `python scripts/geocode_admin_facilities.py --help` 정상 동작
- 승인키가 없으면 `주소정보 API 승인키가 없습니다` 메시지로 중단
- 입력 주소 파일이 없으면 해당 파일 경로를 포함해 중단
