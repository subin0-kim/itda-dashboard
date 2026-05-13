from __future__ import annotations

import argparse
import csv
import json
import os
import time
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

PROJECT_ROOT = Path(__file__).resolve().parents[1]
RAW_ADMIN_DIR = PROJECT_ROOT / "data" / "raw" / "administration"
REPORT_PATH = PROJECT_ROOT / "reports" / "admin_geocoding_report.md"

ADDRESS_API_URL = "https://business.juso.go.kr/addrlink/addrLinkApi.do"
COORD_API_URL = "https://business.juso.go.kr/addrlink/addrCoordApi.do"
KAKAO_ADDRESS_API_URL = "https://dapi.kakao.com/v2/local/search/address.json"

DEFAULT_INPUTS = {
    "community_center": RAW_ADMIN_DIR / "community_center_addresses.csv",
    "district_office": RAW_ADMIN_DIR / "district_office_addresses.csv",
}

DEFAULT_OUTPUTS = {
    "community_center": RAW_ADMIN_DIR / "community_center.csv",
    "district_office": RAW_ADMIN_DIR / "district_office.csv",
}


class GeocodingError(RuntimeError):
    pass


def main() -> None:
    parser = argparse.ArgumentParser(
        description="주민센터/구청 주소 원천을 지오코딩 API로 좌표 변환해 전처리 입력 CSV를 생성합니다."
    )
    parser.add_argument("--provider", choices=["juso", "kakao"], default="juso")
    parser.add_argument("--facility-type", choices=["community_center", "district_office", "all"], default="all")
    parser.add_argument("--community-input", default=str(DEFAULT_INPUTS["community_center"]))
    parser.add_argument("--district-office-input", default=str(DEFAULT_INPUTS["district_office"]))
    parser.add_argument("--community-output", default=str(DEFAULT_OUTPUTS["community_center"]))
    parser.add_argument("--district-office-output", default=str(DEFAULT_OUTPUTS["district_office"]))
    parser.add_argument("--sleep-seconds", type=float, default=0.2)
    args = parser.parse_args()

    api_key = get_api_key(args.provider)
    if not api_key:
        raise GeocodingError(get_missing_key_message(args.provider))

    jobs = []
    if args.facility_type in ("community_center", "all"):
        jobs.append(("community_center", Path(args.community_input), Path(args.community_output)))
    if args.facility_type in ("district_office", "all"):
        jobs.append(("district_office", Path(args.district_office_input), Path(args.district_office_output)))

    report = [
        "# Admin Facility Geocoding Report",
        "",
        f"{args.provider} 지오코딩 API를 사용해 주소를 좌표로 변환한다.",
        "입력 주소가 없거나 API가 실패하면 임의 좌표를 생성하지 않는다.",
        "",
    ]

    for facility_type, input_path, output_path in jobs:
        geocode_file(facility_type, input_path, output_path, api_key, args.sleep_seconds, report, args.provider)

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text("\n".join(report) + "\n", encoding="utf-8")
    print(f"보고서 생성: {REPORT_PATH}")


def geocode_file(
    facility_type: str,
    input_path: Path,
    output_path: Path,
    api_key: str,
    sleep_seconds: float,
    report: list[str],
    provider: str,
) -> None:
    if not input_path.exists():
        raise GeocodingError(
            f"{facility_type} 주소 원천 파일이 없습니다: {input_path}. "
            "name,address 컬럼을 가진 CSV를 먼저 배치하세요."
        )

    rows = read_address_rows(input_path)
    if not rows:
        raise GeocodingError(f"{facility_type} 주소 원천 파일이 비어 있습니다: {input_path}")

    output_rows = []
    failures = []
    for row in rows:
        name = read_first(row, ["name", "facility_name", "기관명", "시설명", "행정기관명"])
        address = read_first(row, ["address", "road_address", "도로명주소", "주소", "소재지"])
        if not name or not address:
            failures.append({"name": name, "address": address, "reason": "name/address 컬럼 누락"})
            continue

        try:
            coord = geocode_address(provider, api_key, address)
            lon, lat = normalize_coordinate(coord)
            output_rows.append(
                {
                    "name": name,
                    "longitude": lon,
                    "latitude": lat,
                    "address": address,
                    "district_code": row.get("district_code", ""),
                    "district_name": row.get("district_name", ""),
                    "source_name": row.get("source_name") or input_path.name,
                    "source_provider": row.get("source_provider", provider),
                    "source_url": row.get("source_url", ""),
                    "geocoding_provider": provider,
                }
            )
        except GeocodingError as exc:
            failures.append({"name": name, "address": address, "reason": str(exc)})
        time.sleep(sleep_seconds)

    if not output_rows:
        raise GeocodingError(f"{facility_type} 좌표 변환 결과가 없습니다. 실패 원인은 보고서를 확인하세요.")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=[
                "name",
                "longitude",
                "latitude",
                "address",
                "district_code",
                "district_name",
                "source_name",
                "source_provider",
                "source_url",
                "geocoding_provider",
            ],
        )
        writer.writeheader()
        writer.writerows(output_rows)

    report.extend(
        [
            f"## {facility_type}",
            "",
            f"- input: `{input_path.relative_to(PROJECT_ROOT)}`",
            f"- output: `{output_path.relative_to(PROJECT_ROOT)}`",
            f"- 입력 행: {len(rows)}",
            f"- 좌표 변환 성공: {len(output_rows)}",
            f"- 좌표 변환 실패: {len(failures)}",
            "",
        ]
    )
    if failures:
        report.append("| name | address | reason |")
        report.append("| --- | --- | --- |")
        for failure in failures[:50]:
            report.append(f"| {failure['name']} | {failure['address']} | {failure['reason']} |")
        if len(failures) > 50:
            report.append(f"| ... | ... | first 50 of {len(failures)} failures shown |")
        report.append("")


def read_address_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        return [dict(row) for row in csv.DictReader(file)]


def get_api_key(provider: str) -> str | None:
    if provider == "kakao":
        return os.environ.get("KAKAO_REST_API_KEY") or os.environ.get("KAKAO_API_KEY")
    return os.environ.get("JUSO_API_KEY") or os.environ.get("DATA_GO_KR_JUSO_API_KEY")


def get_missing_key_message(provider: str) -> str:
    if provider == "kakao":
        return "Kakao REST API 키가 없습니다. KAKAO_REST_API_KEY 또는 KAKAO_API_KEY 환경변수를 설정하세요."
    return "주소정보 API 승인키가 없습니다. JUSO_API_KEY 또는 DATA_GO_KR_JUSO_API_KEY 환경변수를 설정하세요."


def geocode_address(provider: str, api_key: str, address: str) -> dict[str, Any]:
    if provider == "kakao":
        return geocode_address_with_kakao(api_key, address)
    address_match = search_address(api_key, address)
    return fetch_coordinate(api_key, address_match)


def geocode_address_with_kakao(api_key: str, address: str) -> dict[str, Any]:
    payload = request_json(
        KAKAO_ADDRESS_API_URL,
        {"query": address},
        headers={"Authorization": f"KakaoAK {api_key}", "User-Agent": "Mozilla/5.0"},
    )
    documents = payload.get("documents") or []
    if not documents:
        raise GeocodingError("Kakao 주소 검색 결과 없음")
    first = documents[0]
    return {"x": first.get("x"), "y": first.get("y")}


def search_address(api_key: str, keyword: str) -> dict[str, Any]:
    params = {
        "confmKey": api_key,
        "currentPage": "1",
        "countPerPage": "5",
        "keyword": keyword,
        "resultType": "json",
        "hstryYn": "N",
        "firstSort": "road",
    }
    payload = request_json(ADDRESS_API_URL, params)
    results = payload.get("results", {})
    common = results.get("common", {})
    error_code = str(common.get("errorCode", "0"))
    if error_code not in ("0", "00"):
        raise GeocodingError(f"주소 검색 API 오류 {error_code}: {common.get('errorMessage', '')}")
    matches = results.get("juso") or []
    if not matches:
        raise GeocodingError("주소 검색 결과 없음")
    return matches[0]


def fetch_coordinate(api_key: str, address_match: dict[str, Any]) -> dict[str, Any]:
    required = {
        "admCd": address_match.get("admCd"),
        "rnMgtSn": address_match.get("rnMgtSn"),
        "udrtYn": address_match.get("udrtYn"),
        "buldMnnm": address_match.get("buldMnnm"),
        "buldSlno": address_match.get("buldSlno"),
    }
    missing = [key for key, value in required.items() if value in (None, "")]
    if missing:
        raise GeocodingError(f"좌표 조회 필수 주소 코드 누락: {', '.join(missing)}")

    params = {"confmKey": api_key, "resultType": "json", **required}
    payload = request_json(COORD_API_URL, params)
    results = payload.get("results", {})
    common = results.get("common", {})
    error_code = str(common.get("errorCode", "0"))
    if error_code not in ("0", "00"):
        raise GeocodingError(f"좌표 API 오류 {error_code}: {common.get('errorMessage', '')}")
    matches = results.get("juso") or []
    if not matches:
        raise GeocodingError("좌표 조회 결과 없음")
    return matches[0]


def normalize_coordinate(coord: dict[str, Any]) -> tuple[float, float]:
    x = read_float(coord, ["entX", "x", "X"])
    y = read_float(coord, ["entY", "y", "Y"])
    if x is None or y is None:
        raise GeocodingError("좌표 응답에 entX/entY 없음")

    if 120 <= x <= 135 and 30 <= y <= 40:
        return x, y

    try:
        from pyproj import Transformer
    except ImportError as exc:
        raise GeocodingError("EPSG:5179 좌표를 WGS84로 변환하려면 pyproj 설치가 필요합니다.") from exc

    transformer = Transformer.from_crs("EPSG:5179", "EPSG:4326", always_xy=True)
    lon, lat = transformer.transform(x, y)
    if not (120 <= lon <= 135 and 30 <= lat <= 40):
        raise GeocodingError(f"좌표 변환 결과가 한국 WGS84 범위를 벗어남: {lon}, {lat}")
    return lon, lat


def request_json(url: str, params: dict[str, Any], headers: dict[str, str] | None = None) -> dict[str, Any]:
    query = urlencode(params)
    request = Request(f"{url}?{query}", headers=headers or {"User-Agent": "Mozilla/5.0"})
    try:
        with urlopen(request, timeout=20) as response:
            raw = response.read().decode("utf-8")
    except (HTTPError, URLError, TimeoutError, OSError) as exc:
        raise GeocodingError(f"API 요청 실패: {exc}") from exc
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise GeocodingError("API 응답 JSON 파싱 실패") from exc


def read_first(row: dict[str, str], keys: list[str]) -> str:
    for key in keys:
        value = row.get(key)
        if value:
            return value.strip()
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


if __name__ == "__main__":
    main()
