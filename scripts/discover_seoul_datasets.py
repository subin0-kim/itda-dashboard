from __future__ import annotations

import re
import urllib.parse
import urllib.request


QUERIES = [
    "서울시 병의원 위치 정보",
    "서울시 주요 공원현황",
    "서울시 어린이집유치원좌표정보",
    "어린이집 위치",
    "어린이집 정보",
    "서울시 어린이집 정보",
    "어린이집유치원좌표",
    "유치원 좌표",
    "서울시 유치원 정보",
    "서울시 유치원 위치",
    "서울시 문화공간 정보",
    "서울시 공공도서관 정보",
    "서울시 주민센터 위치",
    "서울시 구청 위치",
    "서울시 자치구 경계 공간정보",
    "서울시 자치구 경계",
    "자치구 경계 공간정보",
    "서울시 행정구역 경계",
]


def get(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=20).read().decode("utf-8", "ignore")


def main() -> None:
    for query in QUERIES:
        url = "https://data.seoul.go.kr/dataList/datasetList.do?searchValue=" + urllib.parse.quote(query)
        html = get(url)
        print(f"\n=== {query} ===")
        blocks = re.findall(r"<dl class=\"type-b\">.*?</dl>", html, flags=re.S)
        for block in blocks[:8]:
            title = re.search(r"<strong>(.*?)</strong>", block, flags=re.S)
            rels = re.findall(r'data-rel="([^"]+)"', block)
            if title:
                clean_title = re.sub(r"\s+", " ", title.group(1)).strip()
                print(clean_title, rels[:4])


if __name__ == "__main__":
    main()
