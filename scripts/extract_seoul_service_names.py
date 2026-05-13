from __future__ import annotations

import re
import urllib.request


IDS = ["OA-20337", "OA-394", "OA-15487", "OA-15480", "OA-20300", "OA-21701", "OA-21702", "OA-21703", "OA-22401"]


def main() -> None:
    for inf_id in IDS:
        url = f"https://data.seoul.go.kr/dataList/openApiView.do?infId={inf_id}&srvType=A"
        html = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=20).read().decode(
            "utf-8", "ignore"
        )
        services = set(re.findall(r"svcNm = '([^']+)'", html))
        services.update(re.findall(r"/xml/([^/]+)/1/5/", html))
        print(inf_id, sorted(services))


if __name__ == "__main__":
    main()
