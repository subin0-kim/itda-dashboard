from __future__ import annotations

import re
import urllib.parse
import urllib.request

QUERIES = ["서울시 동주민센터 현황", "서울시 주민센터 현황", "동주민센터 현황", "서울시 자치회관 현황", "서울시 공공청사 정보", "서울시 공공기관 위치"]


def main() -> None:
    for query in QUERIES:
        html = urllib.request.urlopen(
            urllib.request.Request(
                "https://data.seoul.go.kr/dataList/datasetList.do?searchValue=" + urllib.parse.quote(query),
                headers={"User-Agent": "Mozilla/5.0"},
            ),
            timeout=20,
        ).read().decode("utf-8", "ignore")
        print(f"\n=== {query} ===")
        for block in re.findall(r'<dl class="type-b">.*?</dl>', html, re.S)[:8]:
            title = re.search(r"<strong>(.*?)</strong>", block, re.S)
            rels = re.findall(r'data-rel="([^"]+)"', block)
            print(re.sub(r"\s+", " ", title.group(1)).strip() if title else "", rels[:3])


if __name__ == "__main__":
    main()
