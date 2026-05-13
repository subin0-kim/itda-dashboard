"""Extract family_medicine.csv from hospital_raw.json using facility_name_fallback.

서울 열린데이터광장 TbHospitalInfo API 원천에는 별도 진료과목 컬럼이 없어
DUTYNAME(기관명)에 '가정의학' 포함 여부로 가정의학과 의원을 필터링합니다.
좌표가 없는 행과 WGS84 범위를 벗어난 행은 제외합니다.
"""

from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
HOSPITAL_RAW = PROJECT_ROOT / "data" / "raw" / "hospital_raw.json"
OUTPUT_PATH = PROJECT_ROOT / "data" / "raw" / "medical" / "family_medicine.csv"
NAME_KEYWORD = "가정의학"


def main() -> int:
    if not HOSPITAL_RAW.exists():
        print(
            f"[skip] {HOSPITAL_RAW.relative_to(PROJECT_ROOT)} 가 없어 family_medicine.csv를 생성하지 않습니다. "
            "scripts/fetch_seoul_open_data.py를 먼저 실행하세요.",
            file=sys.stderr,
        )
        return 0

    try:
        with HOSPITAL_RAW.open("r", encoding="utf-8") as file:
            rows = json.load(file)
    except (OSError, json.JSONDecodeError) as exc:
        print(f"[error] hospital_raw.json을 읽지 못했습니다: {exc}", file=sys.stderr)
        return 1

    output_rows: list[dict[str, object]] = []
    excluded_no_coord = 0
    excluded_out_of_range = 0
    matched = 0

    for row in rows:
        name = str(row.get("DUTYNAME") or "")
        if NAME_KEYWORD not in name:
            continue
        matched += 1
        lon_raw = row.get("WGS84LON")
        lat_raw = row.get("WGS84LAT")
        try:
            lon = float(lon_raw)
            lat = float(lat_raw)
        except (TypeError, ValueError):
            excluded_no_coord += 1
            continue
        if not (120 <= lon <= 135 and 30 <= lat <= 40):
            excluded_out_of_range += 1
            continue
        output_rows.append(
            {
                "name": name,
                "longitude": lon,
                "latitude": lat,
                "source_name": "TbHospitalInfo",
            }
        )

    if not output_rows:
        print(
            "[info] DUTYNAME에 '가정의학'을 포함한 유효 시설이 없어 family_medicine.csv를 생성하지 않습니다.",
            file=sys.stderr,
        )
        return 0

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=["name", "longitude", "latitude", "source_name"])
        writer.writeheader()
        writer.writerows(output_rows)

    print(
        f"[OK] {OUTPUT_PATH.relative_to(PROJECT_ROOT)}: {len(output_rows)} rows "
        f"(matched={matched}, excluded_no_coord={excluded_no_coord}, "
        f"excluded_out_of_range={excluded_out_of_range}, method=facility_name_fallback)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
