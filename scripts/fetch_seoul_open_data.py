from __future__ import annotations

import csv
import json
import os
import time
from pathlib import Path
from typing import Any
from urllib.parse import quote
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


PROJECT_ROOT = Path(__file__).resolve().parents[1]
API_KEY = os.environ.get("SEOUL_OPEN_API_KEY")
BASE_URL = "http://openapi.seoul.go.kr:8088"
PORTAL_PROXY_URL = "https://data.seoul.go.kr/dataList/getOpenApiSample.do?url="
RAW_ROOT = PROJECT_ROOT / "data" / "raw"
REPORT_PATH = PROJECT_ROOT / "reports" / "seoul_open_data_fetch_report.md"


SERVICES = {
    "hospital": "TbHospitalInfo",
    "park": "SearchParkInfoService",
    "culture": "culturalSpaceInfo",
    "library": "SeoulPublicLibraryInfo",
    "childcare": "ChildCareInfo",
}


OUTPUTS = {
    "pediatric_clinic": RAW_ROOT / "medical" / "pediatric_clinic.csv",
    "general_hospital": RAW_ROOT / "medical" / "general_hospital.csv",
    "family_medicine": RAW_ROOT / "medical" / "family_medicine.csv",
    "park": RAW_ROOT / "leisure" / "park.csv",
    "library_culture": RAW_ROOT / "leisure" / "library_culture.csv",
    "childcare_center": RAW_ROOT / "education" / "childcare_center.csv",
    "kindergarten": RAW_ROOT / "education" / "kindergarten.csv",
    "community_center": RAW_ROOT / "administration" / "community_center.csv",
    "district_office": RAW_ROOT / "administration" / "district_office.csv",
    "city_hall": RAW_ROOT / "administration" / "city_hall.csv",
}


def main() -> None:
    if not API_KEY:
        raise SystemExit("SEOUL_OPEN_API_KEY 환경변수를 설정하세요. 샘플/더미 데이터는 생성하지 않습니다.")

    report: list[str] = ["# Seoul Open Data Fetch Report", ""]
    for directory in ["boundary", "medical", "administration", "education", "leisure", "optional"]:
        (RAW_ROOT / directory).mkdir(parents=True, exist_ok=True)

    report.append("## API service collection")
    report.append("- 서울 열린데이터 직접 OpenAPI를 우선 사용하고, 실패 시 포털 프록시를 보조로 시도합니다.")

    if "hospital" in SERVICES:
        rows = fetch_all(SERVICES["hospital"], report, max_pages=30)
        write_json_raw("hospital", rows)
        write_hospital_outputs(rows, report)

    if "park" in SERVICES:
        rows = fetch_all(SERVICES["park"], report, max_pages=10)
        write_json_raw("park", rows)
        write_simple_point_output(rows, OUTPUTS["park"], report, "park")

    library_culture_rows: list[dict[str, Any]] = []
    for label in ["culture", "library"]:
        if label in SERVICES:
            rows = fetch_all(SERVICES[label], report, max_pages=20)
            write_json_raw(label, rows)
            library_culture_rows.extend(rows)
    write_simple_point_output(library_culture_rows, OUTPUTS["library_culture"], report, "library_culture")

    if "childcare" in SERVICES:
        rows = fetch_all(SERVICES["childcare"], report, max_pages=20)
        write_json_raw("childcare", rows)
        write_simple_point_output(rows, OUTPUTS["childcare_center"], report, "childcare_center")

    write_manual_city_hall(report)
    report.append("")
    report.append("## Not collected")
    report.append("- kindergarten.csv: 서울 열린데이터 포털에서 좌표 포함 유치원 위치 API를 확인하지 못했습니다.")
    report.append("- community_center.csv: 서울 열린데이터 포털에서 좌표 포함 주민센터 위치 API를 확인하지 못했습니다.")
    report.append("- district_office.csv: 서울 열린데이터 포털에서 좌표 포함 구청 위치 API를 확인하지 못했습니다.")
    report.append("- large_retail.csv: optional 데이터이며 이번 수집에서 확보하지 못했습니다.")
    write_report(report)
    print(f"보고서 생성: {REPORT_PATH}")


def fetch_all(service: str, report: list[str], page_size: int = 1000, max_pages: int = 100) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    start = 1
    total_count: int | None = None
    pages = 0
    while pages < max_pages:
        end = start + page_size - 1
        payload = fetch_page(service, start, end)
        root = next(iter(payload.values()))
        total_count = root.get("list_total_count", total_count)
        batch = root.get("row", [])
        if not batch:
            break
        rows.extend(batch)
        report.append(f"- {service}: {start}-{end} 수집 ({len(batch)} rows)")
        if total_count and end >= total_count:
            break
        start += page_size
        pages += 1
        time.sleep(0.25)
    report.append(f"- {service}: 총 {len(rows)} rows 저장")
    return rows


def fetch_page(service: str, start: int, end: int) -> dict[str, Any]:
    last_error: Exception | None = None
    for attempt in range(4):
        api_url = f"{BASE_URL}/{API_KEY}/json/{service}/{start}/{end}/"
        for url in (api_url, PORTAL_PROXY_URL + quote(api_url, safe="")):
            try:
                request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urlopen(request, timeout=25) as response:
                    raw = response.read().decode("utf-8")
                    if not raw.strip():
                        raise RuntimeError("빈 응답")
                    return json.loads(raw)
            except (HTTPError, URLError, TimeoutError, OSError, RuntimeError, json.JSONDecodeError) as exc:
                last_error = exc
        time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"{service} {start}-{end} 요청 실패: {last_error}")


def write_json_raw(label: str, rows: list[dict[str, Any]]) -> None:
    path = RAW_ROOT / f"{label}_raw.json"
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")


def write_hospital_outputs(rows: list[dict[str, Any]], report: list[str]) -> None:
    pediatric = []
    general = []
    family_medicine = []
    for row in rows:
        lon, lat = pick_lon_lat(row)
        if lon is None or lat is None:
            continue
        name = read_any(row, ["DUTYNAME", "name"])
        duty_div = read_any(row, ["DUTYDIVNAM"])
        info = " ".join(str(row.get(key, "")) for key in ["DUTYINF", "DUTYETC", "DUTYNAME"])
        record = {"name": name, "longitude": lon, "latitude": lat, "source_name": "TbHospitalInfo"}
        if is_pediatric_clinic_name(name, duty_div):
            pediatric.append(record)
        if "종합병원" in duty_div or "상급종합" in duty_div:
            general.append(record)
        if "가정의학" in name:
            family_medicine.append(record)
    write_csv(OUTPUTS["pediatric_clinic"], pediatric)
    write_csv(OUTPUTS["general_hospital"], general)
    if family_medicine:
        write_csv(OUTPUTS["family_medicine"], family_medicine)
    report.append(f"- pediatric_clinic.csv: {len(pediatric)} rows")
    report.append(f"- general_hospital.csv: {len(general)} rows")
    report.append(
        f"- family_medicine.csv: {len(family_medicine)} rows (facility_name_fallback: DUTYNAME에 '가정의학' 포함)"
    )


def is_pediatric_clinic_name(name: str, duty_div: str) -> bool:
    """Classify pediatric clinic names from TbHospitalInfo facility names.

    The source does not expose department-level fields in this pipeline, so
    pediatric clinics are identified by explicit pediatric terms in DUTYNAME.
    Includes names containing "소아청소년", "소아과", and "소아과의원".
    Oriental medicine clinics with "한의원" are excluded from this medical
    facility type because the score definition targets pediatric clinics.
    """
    normalized_name = str(name or "")
    normalized_div = str(duty_div or "")
    if "한의원" in normalized_div or "한의원" in normalized_name:
        return False
    return any(keyword in normalized_name for keyword in ["소아청소년", "소아과의원", "소아과"])


def write_simple_point_output(rows: list[dict[str, Any]], path: Path, report: list[str], label: str) -> None:
    output = []
    for row in rows:
        lon, lat = pick_lon_lat(row)
        if lon is None or lat is None:
            continue
        output.append(
            {
                "name": read_any(row, ["name", "NAME", "CRNAME", "PARK_NM", "FAC_NAME", "FCLT_NM", "COT_CONTS_NAME", "P_PARK", "LBRRY_NAME", "DUTYNAME", "BPLCNM"]),
                "longitude": lon,
                "latitude": lat,
                "source_name": label,
            }
        )
    write_csv(path, output)
    report.append(f"- {path.relative_to(PROJECT_ROOT)}: {len(output)} rows")


def write_manual_city_hall(report: list[str]) -> None:
    # 서울시청은 공개 좌표가 안정적인 단일 공공시설이다. 임의 시설이 아니라 실제 서울시청 위치를 별도 원천으로 기록한다.
    rows = [{"name": "서울특별시청", "longitude": 126.9784147, "latitude": 37.5666805, "source_name": "Seoul City Hall official location"}]
    write_csv(OUTPUTS["city_hall"], rows)
    report.append("- city_hall.csv: 서울특별시청 1 rows")


def pick_lon_lat(row: dict[str, Any]) -> tuple[float | None, float | None]:
    lon_keys = ["longitude", "WGS84LON", "LO", "LNG", "LON", "Y_COORD", "YDNTS", "XCRD", "X", "REFINE_WGS84_LOGT", "G_LONGITUDE", "LOT"]
    lat_keys = ["latitude", "WGS84LAT", "LA", "LAT", "X_COORD", "XCNTS", "YCRD", "Y", "REFINE_WGS84_LAT", "G_LATITUDE", "LATITUDE"]
    lon = read_float(row, lon_keys)
    lat = read_float(row, lat_keys)
    if lon is not None and lat is not None:
        if 120 <= lon <= 135 and 30 <= lat <= 40:
            return lon, lat
        if 120 <= lat <= 135 and 30 <= lon <= 40:
            return lat, lon
    return None, None


def read_any(row: dict[str, Any], keys: list[str]) -> str:
    for key in keys:
        value = row.get(key)
        if value not in (None, ""):
            return str(value)
    return ""


def read_float(row: dict[str, Any], keys: list[str]) -> float | None:
    for key in keys:
        value = row.get(key)
        if value in (None, ""):
            continue
        try:
            return float(value)
        except (TypeError, ValueError):
            continue
    return None


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fields = ["name", "longitude", "latitude", "source_name"]
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def write_report(lines: list[str]) -> None:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
