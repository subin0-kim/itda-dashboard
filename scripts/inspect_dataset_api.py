"""Fetch each OA-XXXXX dataset's API tab page and extract the OpenAPI service name.

용도지역, 공원, 녹지, 하천 등 후보 데이터셋의 OpenAPI service 식별자를 찾는다.
"""

from __future__ import annotations

import re
import sys
import urllib.request


CANDIDATES = [
    ("OA-21136", "용도지역(도시지역) 공간정보"),
    ("OA-21127", "용도지구(경관지구) 공간정보"),
    ("OA-21135", "용도구역(도시자연공원구역) 공간정보"),
    ("OA-15528", "생활권계획 시설(공원제외) 공간정보"),
    ("OA-15529", "생활권계획 시설(공원) 공간정보"),
    ("OA-1167", "하천 수위 현황"),
    ("OA-15784", "하천기본계획정보"),
    ("OA-15790", "하천개수 정보"),
    ("OA-15785", "하천개황 정보"),
    ("OA-15793", "지하하천 및 방수로 정보"),
]


def get(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=25) as response:
        return response.read().decode("utf-8", "ignore")


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    for oa, label in CANDIDATES:
        url = f"https://data.seoul.go.kr/dataList/{oa}/S/1/datasetView.do?tab=A"
        try:
            html = get(url)
        except Exception as exc:  # noqa: BLE001
            print(f"\n=== {oa} {label} === [error] {exc}")
            continue

        # The API tab embeds sample URL like:
        # http://openapi.seoul.go.kr:8088/sample/json/{API_NAME}/1/5/
        sample = re.search(r"openapi\.seoul\.go\.kr[^\"'<>\s]*?/(?:sample|[0-9A-Fa-f]+)/(?:json|xml)/([A-Za-z0-9_]+)/", html)
        # Also catch sample-data-block hints
        block_service = re.findall(r"인증키[^\n<]*<[^>]+>([A-Za-z][A-Za-z0-9_]+)<", html)
        # File download links
        files = re.findall(r'(?:href|data-url|fileLink)="([^"]+\.(?:csv|geojson|json|zip|shp|xlsx))"', html, flags=re.IGNORECASE)
        print(f"\n=== {oa} ===  {label}")
        if sample:
            print(f"  service: {sample.group(1)}")
        elif block_service:
            print(f"  service (guess): {block_service[0]}")
        else:
            # fallback: scan for "/json/<NAME>/" anywhere
            any_match = re.search(r"/json/([A-Za-z][A-Za-z0-9_]+)/", html)
            if any_match:
                print(f"  service (any json): {any_match.group(1)}")
        for f in files[:3]:
            print(f"  file: {f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
