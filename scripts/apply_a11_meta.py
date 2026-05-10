"""A11: 모든 SEO 대상 HTML 페이지에 hreflang(ko-KR, x-default) + robots(max-image-preview:large) 메타 일괄 추가.

근거: 사이클 6-8 권고 액션 A11. 6-8-A·F·E팀 교집합 권고. 사이클 6-8 final-report 5섹션.
대상: sitemap.xml 등재 32개 페이지 + canonical 보유 페이지.
삽입 위치: <link rel="canonical" ...> 다음 줄.
멱등성: 이미 hreflang 또는 robots max-image-preview 있으면 skip.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent

# SEO 대상 페이지 (sitemap 기준 + research 제외)
TARGETS = [
    "index.html", "asset.html", "portfolio.html",
    "index-investing.html", "index-simulation.html",
    "tax-optimization.html", "tax-simulation.html",
    "cost-optimization.html", "cost-simulation.html",
    "ipo.html", "ipo-today.html", "ipo-this-week.html",
    "ipo-live.html", "ipo-analysis.html", "ipo-guide.html",
    "tax/isa-guide.html", "tax/irp-refund-guide.html",
    "tax/pension-irp-comparison.html",
    "cost/s1-youth-single.html", "cost/s2-newlywed-dual.html",
    "cost/s3-newlywed-single-income.html", "cost/s4-parent-1child.html",
    "cost/s5-parent-multichild.html", "cost/s6-mid-single.html",
    "cost/area-01-year-end-tax.html", "cost/area-02-credit-cards.html",
    "cost/area-03-insurance.html", "cost/area-04-telecom.html",
    "cost/area-05-financial-fees.html",
    "cost/area-06-utilities-subscriptions.html",
    "cost/area-07-public-support.html", "cost/area-08-transport.html",
]

CANONICAL_RE = re.compile(
    r'^(\s*)<link rel="canonical" href="([^"]+)"\s*/?>\s*$'
)
ROBOTS_META = (
    '<meta name="robots" '
    'content="index, follow, max-image-preview:large, '
    'max-snippet:-1, max-video-preview:-1">'
)

def process(path: Path) -> tuple[bool, str]:
    text = path.read_text(encoding="utf-8")
    if 'hreflang="ko-KR"' in text and 'max-image-preview:large' in text:
        return False, "skip (already applied)"
    lines = text.splitlines(keepends=True)
    new_lines = []
    inserted = False
    for line in lines:
        new_lines.append(line)
        m = CANONICAL_RE.match(line)
        if m and not inserted:
            indent = m.group(1)
            href = m.group(2)
            additions = []
            if 'hreflang="ko-KR"' not in text:
                additions.append(
                    f'{indent}<link rel="alternate" hreflang="ko-KR" '
                    f'href="{href}">\n'
                )
                additions.append(
                    f'{indent}<link rel="alternate" hreflang="x-default" '
                    f'href="{href}">\n'
                )
            if 'max-image-preview:large' not in text:
                additions.append(f'{indent}{ROBOTS_META}\n')
            new_lines.extend(additions)
            inserted = True
    if not inserted:
        return False, "skip (no canonical)"
    path.write_text("".join(new_lines), encoding="utf-8")
    return True, "ok"

def main() -> None:
    results = []
    for rel in TARGETS:
        p = ROOT / rel
        if not p.exists():
            results.append((rel, False, "missing"))
            continue
        ok, msg = process(p)
        results.append((rel, ok, msg))
    ok_count = sum(1 for _, ok, _ in results if ok)
    print(f"=== A11 메타 적용 완료: {ok_count}/{len(results)} ===")
    for rel, ok, msg in results:
        flag = "OK" if ok else "..."
        print(f"  [{flag}] {rel} - {msg}")

if __name__ == "__main__":
    main()
