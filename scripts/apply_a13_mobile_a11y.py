"""A13: 모바일 가독성 + 터치 타겟 + 가독성 표준화 (사이클 6-8 권고).

근거: 사이클 6-8 6-8-A·G·H팀 교집합 권고. final-report 5섹션 A13.
적용 항목:
  1. 본문 16px + line-height 1.7 (모바일)
  2. nav 44px 터치 타겟 (Apple HIG, KWCAG 2.2)
  3. .subnav, FAQ summary 터치 타겟
  4. .compare-table 모바일 14px+ 가독성
삽입 방식: 각 페이지 첫 번째 </style> 태그 직전에 사이클 6-8 모바일 a11y 블록 추가.
멱등성: 'A13 mobile a11y' 마커 있으면 skip.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

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

MARKER = "A13 mobile a11y"

BLOCK = """
    /* === A13 mobile a11y (사이클 6-8) === */
    /* 본문 16px·행간 1.7, 터치 타겟 44px(Apple HIG·KWCAG 2.2), compare-table 14px */
    @media (max-width: 768px) {
      body { font-size: 16px !important; line-height: 1.7 !important; }
      nav a { min-height: 44px; padding: 11px 12px !important; display: inline-flex; align-items: center; box-sizing: border-box; }
      .subnav a { min-height: 40px; padding: 9px 10px !important; display: inline-flex; align-items: center; box-sizing: border-box; }
      .faq-item summary { min-height: 44px; padding-top: 6px; padding-bottom: 6px; display: flex; align-items: center; }
      .compare-table { font-size: 14px !important; }
      .compare-table th, .compare-table td { font-size: 14px !important; padding: 14px 12px !important; }
      details summary { min-height: 44px; padding-top: 6px; padding-bottom: 6px; }
      a, button { min-height: 44px; }
      a.tag, span.tag, .badge { min-height: auto; }
    }
    /* === /A13 === */
"""

def process(path: Path) -> tuple[bool, str]:
    text = path.read_text(encoding="utf-8")
    if MARKER in text:
        return False, "skip (already applied)"
    # 첫 번째 </style> 태그 위치
    idx = text.find("</style>")
    if idx == -1:
        return False, "skip (no </style>)"
    new_text = text[:idx] + BLOCK + "  " + text[idx:]
    path.write_text(new_text, encoding="utf-8")
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
    print(f"=== A13 mobile a11y 적용 완료: {ok_count}/{len(results)} ===")
    for rel, ok, msg in results:
        flag = "OK" if ok else "..."
        print(f"  [{flag}] {rel} - {msg}")

if __name__ == "__main__":
    main()
