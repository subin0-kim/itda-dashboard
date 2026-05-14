from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path
from urllib.parse import quote
from urllib.request import urlopen


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SERVICE_NAME = "TbTraficWlkNet"
API_BASE = "http://openapi.seoul.go.kr:8088"


def main() -> None:
    parser = argparse.ArgumentParser(description="서울시 자치구별 도보 네트워크 OpenAPI 데이터를 자치구 단위로 수집합니다.")
    parser.add_argument("--output-dir", default="data/raw_api/pedestrian_network")
    parser.add_argument("--boundary", default="data/raw/boundary/seoul_districts.geojson")
    parser.add_argument("--district", help="특정 자치구명 또는 district_code만 수집합니다.")
    parser.add_argument("--page-size", type=int, default=1000)
    parser.add_argument("--sleep", type=float, default=0.05)
    parser.add_argument("--limit", type=int, default=None, help="테스트용 최대 수집 건수. 지정하지 않으면 전체 수집.")
    parser.add_argument("--include-crosswalk", action="store_true", help="OA-21209 tbTraficCrsng 횡단보도 링크/노드도 수집합니다.")
    args = parser.parse_args()

    api_key = os.environ.get("SEOUL_OPENAPI_KEY")
    if not api_key:
        raise SystemExit("SEOUL_OPENAPI_KEY 환경변수가 없습니다. API 키를 코드에 저장하지 말고 환경변수로 설정하세요.")

    districts = load_districts(args.boundary)
    if args.district:
        districts = [
            item
            for item in districts
            if args.district in {item["district_code"], item["district_name"], str(item["district_code"])}
        ]
        if not districts:
            raise SystemExit(f"수집 대상 자치구를 찾을 수 없습니다: {args.district}")

    output_dir = resolve(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest = {
        "service": SERVICE_NAME,
        "source_url": "https://data.seoul.go.kr/dataList/OA-21208/A/1/datasetView.do",
        "rows": [],
    }

    for district in districts:
        district_code = district["district_code"]
        district_name = district["district_name"]
        print(f"[fetch] {district_name} ({district_code})")
        rows, total_count = fetch_district(api_key, district_name, args.page_size, args.sleep, args.limit)
        output_file = output_dir / f"{district_code}_{district_name}.json"
        payload = {
            "service": SERVICE_NAME,
            "district_code": district_code,
            "district_name": district_name,
            "total_count": total_count,
            "fetched_count": len(rows),
            "rows": rows,
        }
        output_file.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        manifest["rows"].append(
            {
                "district_code": district_code,
                "district_name": district_name,
                "total_count": total_count,
                "fetched_count": len(rows),
                "path": str(output_file.relative_to(PROJECT_ROOT)),
            }
        )

    (output_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    if args.include_crosswalk:
        fetch_supplemental_crosswalk(api_key, output_dir, args.page_size, args.sleep)
    print(f"[OK] pedestrian network API cache: {output_dir}")


def fetch_district(api_key: str, district_name: str, page_size: int, sleep_sec: float, limit: int | None):
    first = request(api_key, 1, 1, district_name)
    data = first.get(SERVICE_NAME)
    if not data:
        raise RuntimeError(f"{district_name} 응답에 {SERVICE_NAME} 키가 없습니다: {first}")
    result = data.get("RESULT", {})
    if result.get("CODE") not in {None, "INFO-000"}:
        raise RuntimeError(f"{district_name} API 오류: {result}")
    total_count = int(data.get("list_total_count") or 0)
    if limit is not None:
        total_to_fetch = min(total_count, limit)
    else:
        total_to_fetch = total_count

    rows: list[dict] = []
    start = 1
    while start <= total_to_fetch:
        end = min(start + page_size - 1, total_to_fetch)
        payload = request(api_key, start, end, district_name)
        table = payload.get(SERVICE_NAME) or {}
        result = table.get("RESULT", {})
        if result.get("CODE") not in {None, "INFO-000"}:
            raise RuntimeError(f"{district_name} API 오류 {start}-{end}: {result}")
        rows.extend(table.get("row") or [])
        start = end + 1
        if sleep_sec > 0:
            time.sleep(sleep_sec)
    return rows, total_count


def request(api_key: str, start: int, end: int, district_name: str) -> dict:
    encoded_district = quote(district_name)
    url = f"{API_BASE}/{api_key}/json/{SERVICE_NAME}/{start}/{end}/{encoded_district}/"
    with urlopen(url, timeout=60) as response:
        raw = response.read().decode("utf-8")
    return json.loads(raw)


def fetch_supplemental_crosswalk(api_key: str, output_dir: Path, page_size: int, sleep_sec: float) -> None:
    service = "tbTraficCrsng"
    first = request_service(api_key, service, 1, 1)
    data = first.get(service)
    if not data:
        raise RuntimeError(f"횡단보도 응답에 {service} 키가 없습니다: {first}")
    total_count = int(data.get("list_total_count") or 0)
    rows = []
    start = 1
    while start <= total_count:
        end = min(start + page_size - 1, total_count)
        payload = request_service(api_key, service, start, end)
        table = payload.get(service) or {}
        result = table.get("RESULT", {})
        if result.get("CODE") not in {None, "INFO-000"}:
            raise RuntimeError(f"횡단보도 API 오류 {start}-{end}: {result}")
        rows.extend(table.get("row") or [])
        start = end + 1
        if sleep_sec > 0:
            time.sleep(sleep_sec)
    supplemental_dir = output_dir / "supplemental"
    supplemental_dir.mkdir(parents=True, exist_ok=True)
    output_file = supplemental_dir / "crosswalk.json"
    output_file.write_text(
        json.dumps(
            {
                "service": service,
                "source_url": "https://data.seoul.go.kr/dataList/OA-21209/A/1/datasetView.do",
                "total_count": total_count,
                "fetched_count": len(rows),
                "rows": rows,
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    print(f"[fetch] crosswalk {len(rows)} rows -> {output_file}")


def request_service(api_key: str, service: str, start: int, end: int) -> dict:
    url = f"{API_BASE}/{api_key}/json/{service}/{start}/{end}/"
    with urlopen(url, timeout=60) as response:
        raw = response.read().decode("utf-8")
    return json.loads(raw)


def load_districts(boundary_path: str) -> list[dict[str, str]]:
    import geopandas as gpd

    gdf = gpd.read_file(resolve(boundary_path))
    required = {"district_code", "district_name"}
    if not required.issubset(gdf.columns):
        raise SystemExit(f"자치구 경계에 필요한 컬럼이 없습니다: {required}")
    districts = (
        gdf[["district_code", "district_name"]]
        .drop_duplicates()
        .sort_values("district_code")
        .astype(str)
        .to_dict("records")
    )
    return districts


def resolve(path: str | Path) -> Path:
    path = Path(path)
    return path if path.is_absolute() else PROJECT_ROOT / path


if __name__ == "__main__":
    main()
