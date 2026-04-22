"""P0-5 spot-check: compare Google Sheet IPO data vs 38.co.kr live detail pages.

- Fetches the gviz JSON from the production Sheet.
- Picks the 3-5 most recent entries (with valid subscribe dates).
- Resolves each entry's 38.co.kr detail URL by searching the listing pages.
- Parses the detail page (EUC-KR) for 의무보유확약 / 유통가능물량 / 경쟁률 / 확정공모가.
- Prints a structured diff report to stdout AND a markdown report to
  ``C:/Users/USER/Projects/finance-coffee-chat/docs/maintenance/2026-04-22-spotcheck-report.md``.

This script uses stdlib only so it can run under any Python 3.8+ without
installing third-party packages.
"""

from __future__ import annotations

import io
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Dict, List, Optional, Tuple

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

SHEET_ID = "1_xXYdZ5d8COXBajVZ_tyd2p5JaOhQcQnNPQrS9-e-Jk"
SHEET_NAME = "IPO데이터"
GVIZ_URL = (
    f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq"
    f"?tqx=out:json&sheet={urllib.parse.quote(SHEET_NAME)}"
)
LIST_URL_BASE = "http://www.38.co.kr/html/fund/index.htm?o=k"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) spot-check/1.0"
REPORT_PATH = Path(
    r"C:/Users/USER/Projects/finance-coffee-chat/docs/maintenance/2026-04-22-spotcheck-report.md"
)


def fetch_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def fetch_euckr(url: str) -> str:
    raw = fetch_bytes(url)
    return raw.decode("euc-kr", errors="replace")


def parse_gviz(text: str) -> List[Dict]:
    match = re.search(r"google\.visualization\.Query\.setResponse\(([\s\S]*)\);?", text)
    if not match:
        raise RuntimeError("gviz response not found")
    payload = json.loads(match.group(1))
    rows: List[Dict] = []
    for row in payload["table"]["rows"]:
        cells = row.get("c", [])
        def val(i: int) -> str:
            if i >= len(cells) or cells[i] is None:
                return ""
            c = cells[i]
            if c is None:
                return ""
            if c.get("f"):
                return str(c["f"])
            if c.get("v") is not None:
                return str(c["v"])
            return ""
        def date_val(i: int) -> str:
            raw = val(i)
            m = re.match(r"Date\((\d+),(\d+),(\d+)\)", raw)
            if m:
                y, mo, d = int(m.group(1)), int(m.group(2)) + 1, int(m.group(3))
                return f"{y:04d}-{mo:02d}-{d:02d}"
            if re.match(r"^\d{4}-\d{2}-\d{2}$", raw):
                return raw
            m2 = re.match(r"(\d{4})[-.](\d{1,2})[-.](\d{1,2})", raw)
            if m2:
                return f"{int(m2.group(1)):04d}-{int(m2.group(2)):02d}-{int(m2.group(3)):02d}"
            return ""
        rows.append(
            {
                "name": val(0),
                "market": val(1),
                "status": val(2),
                "confirmed_price": val(3),
                "expected_price": val(4),
                "subscribe_start": date_val(5),
                "subscribe_end": date_val(6),
                "refund_date": date_val(7),
                "listing_date": date_val(8),
                "lead": val(9),
                "competition": val(10),
                "lockup": val(11),
                "shares": val(12),
                "float_ratio": val(13),
                "open_price": val(14),
                "open_ratio": val(15),
                "updated": val(16),
            }
        )
    return rows


def find_detail_url(name: str, max_pages: int = 3) -> Optional[str]:
    for page in range(1, max_pages + 1):
        url = f"{LIST_URL_BASE}&page={page}"
        try:
            html = fetch_euckr(url)
        except Exception as exc:
            print(f"[WARN] list page fetch failed ({url}): {exc}")
            continue
        # locate the table row containing this stock name
        pattern = re.compile(
            r"<tr[^>]*>[\s\S]*?" + re.escape(name) + r"[\s\S]*?</tr>",
            re.IGNORECASE,
        )
        m = pattern.search(html)
        if not m:
            continue
        row = m.group(0)
        link_match = re.search(r'href=["\']([^"\']*fund[^"\']*o=v[^"\']*)["\']', row, re.IGNORECASE)
        if not link_match:
            continue
        path = link_match.group(1).replace("&amp;", "&")
        if path.startswith("http"):
            return path
        return f"http://www.38.co.kr{path}"
    return None


def extract_after(html: str, label: str, max_span: int = 8000) -> str:
    idx = html.find(label)
    if idx < 0:
        return ""
    return html[idx : idx + max_span]


def parse_detail(html: str) -> Dict[str, str]:
    out = {"lockup_raw": "", "float_raw": "", "competition_raw": "", "price_fixed_raw": "", "band_raw": ""}
    # 의무보유확약
    lockup_span = extract_after(html, "의무보유확약")
    if lockup_span:
        td_match = re.search(r"<td[^>]*>([\s\S]*?)</td>", lockup_span, re.IGNORECASE)
        if td_match:
            out["lockup_raw"] = re.sub(r"<[^>]+>", "", td_match.group(1)).strip()[:80]
    # 유통가능물량
    float_span = extract_after(html, "유통가능물량")
    if float_span:
        pct_match = re.search(r"([\d,.]+)\s*%", float_span)
        if pct_match:
            out["float_raw"] = pct_match.group(0)
    # 수요예측 경쟁률
    comp_span = extract_after(html, "수요예측")
    if comp_span:
        comp_match = re.search(r"([\d,.]+)\s*[:]\s*1", comp_span)
        if comp_match:
            out["competition_raw"] = comp_match.group(0)
    # 확정공모가
    price_fixed_span = extract_after(html, "확정공모가")
    if price_fixed_span:
        td_match = re.search(r"<td[^>]*>([\s\S]*?)</td>", price_fixed_span, re.IGNORECASE)
        if td_match:
            out["price_fixed_raw"] = re.sub(r"<[^>]+>", "", td_match.group(1)).strip()[:80]
    # 희망공모가 / 공모희망가
    band_span = extract_after(html, "희망공모가") or extract_after(html, "공모희망가")
    if band_span:
        td_match = re.search(r"<td[^>]*>([\s\S]*?)</td>", band_span, re.IGNORECASE)
        if td_match:
            out["band_raw"] = re.sub(r"<[^>]+>", "", td_match.group(1)).strip()[:80]
    return out


def main() -> None:
    print(f"Fetching Sheet: {GVIZ_URL}")
    raw = fetch_bytes(GVIZ_URL).decode("utf-8")
    sheet_rows = parse_gviz(raw)
    valid = [r for r in sheet_rows if r["subscribe_start"]]
    valid.sort(key=lambda r: r["subscribe_start"], reverse=True)
    targets = valid[:5]
    print(f"Total rows: {len(sheet_rows)} | With subscribe_start: {len(valid)} | Spot-check targets: {len(targets)}\n")

    report: List[str] = []
    report.append("# P0-5 4대 팩터 스팟체크 리포트 (2026-04-22)\n")
    report.append("| # | 종목 | 필드 | 시트 | 38.co.kr 실측 | 일치 |")
    report.append("|---|------|------|------|---------------|------|")
    for i, row in enumerate(targets, 1):
        name = row["name"]
        print(f"[{i}/{len(targets)}] {name}")
        detail_url = find_detail_url(name)
        if not detail_url:
            print(f"  ✖ detail URL not found for {name}")
            report.append(f"| {i} | {name} | - | - | **URL 탐색 실패** | ✖ |")
            continue
        print(f"  URL: {detail_url}")
        try:
            detail_html = fetch_euckr(detail_url)
        except Exception as exc:
            print(f"  ✖ fetch failed: {exc}")
            report.append(f"| {i} | {name} | - | - | **페이지 오류: {exc}** | ✖ |")
            continue
        parsed = parse_detail(detail_html)
        rows_for_report = [
            ("의무보유확약", row["lockup"], parsed["lockup_raw"]),
            ("유통가능물량", row["float_ratio"], parsed["float_raw"]),
            ("경쟁률", row["competition"], parsed["competition_raw"]),
            ("확정공모가", row["confirmed_price"], parsed["price_fixed_raw"]),
            ("희망공모가", row["expected_price"], parsed["band_raw"]),
        ]
        for field, sheet_val, actual_val in rows_for_report:
            sv = (sheet_val or "").strip()
            av = (actual_val or "").strip()
            match = "✅" if sv and av and sv.replace(" ", "") in av.replace(" ", "") else ("△" if sv and av else "✖")
            report.append(f"| {i} | {name} | {field} | `{sv or '—'}` | `{av or '—'}` | {match} |")
            print(f"  · {field}: sheet=`{sv}`, 실측=`{av}` → {match}")
        print()

    REPORT_PATH.write_text("\n".join(report), encoding="utf-8")
    print(f"Report saved to: {REPORT_PATH}")


if __name__ == "__main__":
    main()
