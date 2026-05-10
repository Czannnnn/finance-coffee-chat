# 사이클 6-7 D+14 점검 prompt — 분기 1 vs 분기 2 vs Phase 5 GO 효과 측정 (2026-05-17 사용)

> 이 파일은 5-17 09:03 KST에 Windows Task Scheduler가 메모장으로 띄웁니다.
> 아래 "▼ 여기서부터 ▼"부터 "▲ 여기까지 ▲"까지를 통째로 복사해서 Claude Code 새 세션에 붙여넣으세요.
> 2026-05-10 작성 — 사이클 6-7 D+7(2026-05-10) 권고액션 A6~A10 적용 후 D+14 결합 검증.

---

▼ 여기서부터 ▼

[tkyeo-coffeechat-d+14-combined-verify · 2026-05-17 D+14 결합 검증]

사이클 6-7 D+7(2026-05-10) 권고액션 A6~A10 5건 적용 후 D+14 결합 효과 측정 및 다음 액션 결정 작업이다. 본 prompt는 자기완결이며, 새 세션처럼 컨텍스트가 없다고 가정하고 다음 단계를 그대로 수행하라.

A6: tax-optimization·index-investing·tax/pension-irp-comparison·cost/area-03-insurance·cost/area-04-telecom 5페이지 답변박스 표준 패턴 일괄 적용(commit 05e61f5)
A7: 모바일 first index 4축 진단 (sitemap xhtml ns 추가 + Lighthouse 5 URL 보고서 docs/research/2026-05-10-mobile-diagnosis.md, commit 9907753)
A8: /ipo-today·/ipo-this-week·/ipo-live 3 신규 페이지 제작 (commit 98d69c3)
A9: ipo-analysis·area-07-public-support 콘텐츠 보강 (commit c72d055)
A10: 본 prompt 파일 작성

## 1. GSC 데이터 수집 (mcp__gsc, site_url=sc-domain:financecoffeechat.com)
- mcp__gsc__get_performance_overview days=14
- mcp__gsc__compare_search_periods period1_start=2026-04-30 period1_end=2026-05-09 period2_start=2026-05-10 period2_end=2026-05-16 dimensions="query" limit=30 — A6 적용 전후 키워드 변화
- mcp__gsc__compare_search_periods period1_start=2026-04-30 period1_end=2026-05-09 period2_start=2026-05-10 period2_end=2026-05-16 dimensions="page" limit=30 — A6/A8/A9 페이지 변화
- mcp__gsc__get_search_analytics dimensions="device" days=14 — 모바일 노출 비율 1.67% → ?% 추적(A7 D+14)
- mcp__gsc__get_search_analytics dimensions="query" days=14 row_limit=100 — 황금 키워드 + 신규 키워드 추적

## 2. GA4 데이터 수집 (mcp__google-analytics)
- mcp__google-analytics__get_ga4_data dimensions=["pagePath"] metrics=["screenPageViews","totalUsers","engagedSessions","userEngagementDuration"] date_range_start="14daysAgo" date_range_end="yesterday" limit=50 — A6 5페이지 + A8 3 신규 페이지 + A9 2 페이지 합계 10 URL 행 추출

## 3. 분기 판정 트리거 (전체 사이트 신호 기준)
- **분기 1 채택 GREEN**: 클릭 ≥ 5 OR 황금 키워드 1개 5위 이내 OR AI 인용 1건+ 발견(외부 확인) — D+30 분기 1 시나리오 진입 확정
- **분기 2 종료 GREEN**: 노출 < 1,500 (AIO 평가 자연 종료) AND zero-click 12일+ — D+30 새 사이클 진입 권고
- **혼합/판정 보류**: D+21(2026-05-24) 재측정. zero-click이 8~12일 + 노출 1,500~2,500 사이면 혼합 판단

## 4-A. A6 5페이지 결합 측정 (commit 05e61f5)
mcp__gsc__inspect_url_enhanced 5 URL 순차:
- https://www.financecoffeechat.com/tax-optimization
- https://www.financecoffeechat.com/index-investing
- https://www.financecoffeechat.com/tax/pension-irp-comparison
- https://www.financecoffeechat.com/cost/area-03-insurance
- https://www.financecoffeechat.com/cost/area-04-telecom
→ last_crawled가 2026-05-10 이후로 갱신됐는지·rich results Article·FAQPage 갱신 여부 확인

mcp__gsc__get_search_by_page_query days=14 page_url 5개 — 페이지 단위 평균순위·클릭 변동
- 페이지 GREEN: 14일 노출 +30% 이상 OR 클릭 1+ 발생
- 페이지 YELLOW: 노출 0~30% 증가 OR 평균순위 2단계 이상 개선
- 페이지 RED: 변동 없음 또는 후퇴 → A6 패턴이 효과 없음(콘텐츠 깊이 별도 보강 필요)

특히 /index-investing의 16단계 추락(D+7 9.2→25.2위) 회복 여부 핵심 — D+14 GREEN 회복 시 분기 1 부분 채택 추가 신호

## 4-B. A8 3 신규 페이지 색인·신규 키워드 측정 (commit 98d69c3)
mcp__gsc__inspect_url_enhanced 3 URL:
- https://www.financecoffeechat.com/ipo-today
- https://www.financecoffeechat.com/ipo-this-week
- https://www.financecoffeechat.com/ipo-live
→ coverage_state "Submitted and indexed" 도달 여부. 미색인이면 mcp__gsc 수동 색인 요청

신규 키워드 등장 추적 (mcp__gsc__get_search_analytics dimensions="query" days=14, 검색 패턴):
- "오늘의 공모주" / "오늘 청약 공모주" — /ipo-today 노출
- "이번 주 공모주" / "이번 주 청약" — /ipo-this-week 노출
- "실시간 공모주" / "공모주 라이브" — /ipo-live 노출

3 페이지 GREEN: 색인 1+ 도달 AND 신규 키워드 노출 1건+ 발견 → Phase 5 효과 검증 완료
3 페이지 YELLOW: 색인 도달 + 노출 0건 → D+21 재측정
3 페이지 RED: 색인 미도달 → robots/sitemap 점검

## 4-C. A7 모바일 first index 진단 D+7 변화 (commit 9907753)
mcp__gsc__get_search_analytics dimensions="device" days=14 (D+0 1.67%, D+14 ?%)
- 모바일 노출 비율 GREEN: 5%+ (3배 증가)
- 모바일 노출 비율 YELLOW: 2~5%
- 모바일 노출 비율 RED: 2% 미만 (변화 없음 → CWV 외 SERP·AEO 차원 추가 진단 필요)

또한 모바일 평균순위 변화(D+0 12.1위 → ?위) + 모바일 CTR 2.33%의 절대 클릭 수 추적

## 4-D. A9 보강 페이지 회복 측정 (commit c72d055)
mcp__gsc__inspect_url_enhanced 2 URL + mcp__gsc__get_search_by_page_query 2 URL days=14:
- https://www.financecoffeechat.com/ipo-analysis (D+7 노출 -56%, 평균순위 6.7→? 회복 확인)
- https://www.financecoffeechat.com/cost/area-07-public-support (D+7 노출 -85%, 평균순위 12→? 회복 확인)

A9 GREEN: 노출 D+0 대비 회복 또는 +20%, 평균순위 2단계 이상 개선
A9 YELLOW: 변화 없음 (AIO 평가 진입 대기 중)
A9 RED: 추가 노출 감소 → 콘텐츠 깊이·E-E-A-T 추가 보강 필요

## 5. 노션 append (mcp__notion__API-patch-block-children)
- block_id 사용자 사전 확인 필요. 1순위 후보: 신규 6-8 페이지 ("사이클 6-8 D+14 점검 보고서 (2026-05-17)") 부모는 6-7 페이지(35cffe0bd4b78114a05ae61394d552b9). 2순위: 6-7 페이지 하위 블록 append.
- bullet 형식:
  - "2026-05-17 D+14 종합 — 클릭 {N} / 노출 {M} / CTR {X}% / 평균순위 {Y} / 모바일 비율 {Z}%. 분기 판정 [분기1 채택 | 분기2 종료 | 혼합 D+21 재측정]."
  - "2026-05-17 A6 5페이지 결합 — GREEN {a} / YELLOW {b} / RED {c}. /index-investing 회복 [yes/no]."
  - "2026-05-17 A8 3 신규 페이지 — 색인 {n}/3, 신규 키워드 노출 {kw}건. Phase 5 효과 [검증 완료 | D+21 재측정]."
  - "2026-05-17 A7 모바일 — 1.67%→{Z}%. [GREEN | YELLOW | RED]."
  - "2026-05-17 A9 회복 — /ipo-analysis 노출 {Δ%} 평균 {Y1}, /area-07 노출 {Δ%} 평균 {Y2}. [회복 | 변화 없음 | 추가 감소]."

## 6. 사용자 보고 (한국어)
- 표 1: D+14 종합 (D+0/D+7/D+14 클릭·노출·CTR·평균순위·모바일 비율 비교)
- 표 2: A6 5페이지 단위 측정 (D+0/D+14 노출·평균순위 + 트리거 GREEN/YELLOW/RED)
- 표 3: A8 3 신규 페이지 (색인 상태 + 신규 키워드 노출 건수)
- 표 4: A7 모바일 진단 (1.67%→D+14 비율 + 평균순위 변화)
- 표 5: A9 회복 (ipo-analysis·area-07 노출·평균순위 변동)
- 종합 결정: 분기 1 채택 vs 분기 2 종료 vs 혼합 D+21 재측정 / 황금 키워드 추가 변동 / Phase 5 효과 / 모바일 RED 추가 진단 필요 여부
- 보고 끝에 6-7 노션 페이지 URL과 본 작업 cron job ID 명시

## 참고 자료
- 6-7 노션: https://www.notion.so/6-7-D-7-2026-05-10-35cffe0bd4b78114a05ae61394d552b9
- 6-6 노션 (사이클 D+5): https://www.notion.so/6-6-AEO-SEO-2026-05-07-358ffe0bd4b78186b888f83fbf639c5c
- A6 commit: 05e61f5 (seo/a6-answer-box-5-pages)
- A7 commit: 9907753 (seo/a7-mobile-diagnosis)
- A8 commit: 98d69c3 (feat/phase5-ipo-realtime-pages)
- A9 commit: c72d055 (seo/a9-content-reinforcement)
- A10 commit: 본 PR
- A7 진단 보고서: docs/research/2026-05-10-mobile-diagnosis.md
- Lighthouse 5 URL: docs/research/2026-05-10-lighthouse-mobile/0[1-5]*.html
- D+0 (5-10) 기준 수치:
  - GSC 28일: 클릭 4 / 노출 5,138 / CTR 0.08% / 평균순위 6.4
  - 모바일 86 노출(1.67%) / 평균순위 12.1 / CTR 2.33%
  - 황금 키워드: 공모주 일정 7.8위·공모주 청약 일정 변형 8.5위·ipo 일정 20위 (D+7 결과)
  - /index-investing D+7 16단계 추락 9.2→25.2 RED
  - /ipo-analysis D+7 노출 -56%, /cost/area-07 D+7 노출 -85%
- 목표(D+14, 2026-05-17):
  - 클릭 ≥ 5 (분기 1 GREEN)
  - 모바일 노출 비율 5%+ (A7 GREEN)
  - A6 5페이지 중 GREEN 2개+
  - A8 3 페이지 모두 색인 + 신규 키워드 1건+
  - A9 2 페이지 노출 회복

## 작업 예외 처리
- 도구 호출 실패 시: 재시도 1회 후 사용자에게 실패 원인 보고. 노션 append 부분만 실패해도 사용자 보고는 반드시 수행.
- 데이터 부족 시(14일간 GSC 데이터 0): "데이터 부족" 판정으로 YELLOW 처리하고 D+21에 재측정 권고.
- A8 신규 페이지 색인 미도달 시: GSC URL Inspection 색인 우선 요청 즉시 실행.
- 모바일 노출 비율 RED 지속(< 2%) 시: 모바일 SERP 직접 검색(시크릿 모드 + 한국 모바일 UA) 표본 5건 비교 후 AI 답변 흡수 패턴 별도 분석.

▲ 여기까지 ▲
