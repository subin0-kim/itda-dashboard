"""Discover Seoul Open Data Plaza datasets relevant to land-use polygons.

서울 열린데이터광장 검색 페이지를 query별로 scrape해 용도지역/공원/하천/임야/녹지 후보 서비스 목록을 출력한다.
실제 API 호출은 하지 않는다.
"""

from __future__ import annotations

import re
import urllib.parse
import urllib.request


QUERIES = [
    "용도지역",
    "용도지역 공간정보",
    "도시계획",
    "지목",
    "토지이용",
    "토지피복",
    "공원",
    "도시공원",
    "공원 공간정보",
    "공원 면적",
    "공원 위치",
    "근린공원",
    "하천",
    "서울시 하천",
    "임야",
    "산림",
    "산지",
    "녹지",
    "녹지대",
]


def get(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(request, timeout=25).read().decode("utf-8", "ignore")


def main() -> None:
    for query in QUERIES:
        url = "https://data.seoul.go.kr/dataList/datasetList.do?searchValue=" + urllib.parse.quote(query)
        try:
            html = get(url)
        except Exception as exc:  # noqa: BLE001
            print(f"\n=== {query} === [error] {exc}")
            continue
        print(f"\n=== {query} ===")
        blocks = re.findall(r"<dl class=\"type-b\">.*?</dl>", html, flags=re.S)
        for block in blocks[:6]:
            title_match = re.search(r"<strong>(.*?)</strong>", block, flags=re.S)
            rels = re.findall(r'data-rel="([^"]+)"', block)
            if title_match:
                title = re.sub(r"\s+", " ", title_match.group(1)).strip()
                print(f"  {title} :: {rels[:4]}")
        if not blocks:
            print("  (검색 결과 없음 또는 검색 페이지 변경)")


if __name__ == "__main__":
    main()
