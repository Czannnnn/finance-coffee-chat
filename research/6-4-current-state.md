# 사이클 6-4 — 현재 상태 스냅샷 (2026-04-30)

## 1. 핵심 한 줄 요약

> 6-3 진단 직후(4-26) 사이트맵 재제출로 **노출이 5일 만에 71→711(10배)** 폭증, 평균순위 **15→7.6**로 회복. 그러나 클릭은 단 **1건(4-27)**, CTR ≈ 0.14%. **노출은 살아났으나 CTR 회복이 6-4 최우선 과제**.

## 2. GSC 28일 / 90일 (4-2~4-30, sc-domain:financecoffeechat.com)

| 지표 | 6-3 시점(4-25 기준) | 4-30 기준 | 델타 |
|------|--------------------|-------------|------|
| 노출 | 71 (90일 누적) | **711 (28일)** | +10배 |
| 클릭 | 0 | 1 | +1 |
| CTR | 0% | 0.14% | +0.14%p |
| 평균 순위 | ~15 | **7.6** | -7.4↑ |
| 색인 URL | 29 | 29 | 동일 (sitemap 0 errors) |

### 일자별 트렌드 (4-26 sitemap 재제출 후)

| 날짜 | 노출 | 평균순위 |
|------|------|----------|
| 4-25 | 25 | 8.6 |
| 4-26 | 60 | 7.7 |
| 4-27 | **160 (+1 클릭)** | 6.4 |
| 4-28 | 190 | 6.6 |
| 4-29 | 128 | 6.8 |
| 4-30 | 3 (집계 지연) | 5.7 |

## 3. GA4 28일 채널·페이지

### 채널 비중

| 채널 | 세션 | 비중 |
|------|------|------|
| Direct | 318 | 88.6% |
| Organic Search | 30 | 8.4% (+0.1%p) |
| Referral | 8 | 2.2% |
| Unassigned | 1 | 0.3% |

### Top 페이지 (페이지뷰)

| 순위 | 페이지 | PV | 사용자 | 참여 세션 |
|------|--------|----|----|-----------|
| 1 | / | 363 | 161 | 122 |
| 2 | /ipo | 301 | 72 | 104 |
| 3 | /cost-optimization | 234 | 40 | 49 |
| 4 | /ipo-analysis | 172 | 53 | 75 |
| 5 | /index-investing | 117 | 16 | 23 |
| 6 | /ipo-guide | 98 | 44 | 46 |
| 7 | /asset | 92 | 46 | 56 |
| 8 | /portfolio | 90 | 44 | 54 |
| 9 | /tax-optimization | 77 | 12 | 17 |
| 10 | /index-simulation | 43 | 6 | 6 |

> 검색 유입 Top1인 `/tax/isa-guide`는 GA4 페이지뷰 3회로 **노출 292 vs PV 3 (CTR 거의 0)**. 메타·rich snippet의 매력도 부족이 가장 강한 신호.

## 4. GSC 노출 Top11 (90일, 페이지 단위)

| 순위 | 페이지 | 노출 | 평균순위 | 6-3 분류 | Phase |
|------|--------|------|----------|----------|-------|
| 1 | /tax/isa-guide | **292** | **5.9** | Boost | Phase 1 quick win |
| 2 | /ipo | 148 | 10.0 | Boost | Phase 2 |
| 3 | /ipo-analysis | 70 | 6.4 | Boost | Phase 2 |
| 4 | /cost/area-07-public-support | 33 | 8.4 | Boost | Phase 2 |
| 5 | /cost/area-02-credit-cards | 30 | 8.1 | Boost | Phase 2 |
| 6 | /cost/area-06-utilities-subscriptions | 24 | 5.7 | Boost | Phase 2 |
| 7 | /ipo-guide | 22 | 9.4 | Boost | Phase 2 |
| 8 | /cost/area-01-year-end-tax | 20 | 8.2 | Boost | Phase 2 |
| 9 | /tax/pension-irp-comparison | 18 | 8.1 | Boost | Phase 2 |
| 10 | /tax/irp-refund-guide | 16 | 8.9 | Boost | Phase 2 |
| 11 | /cost/area-08-transport | 16 | 5.2 | Boost | Phase 2 |

→ **Top11이 6-3 Boost 분류와 거의 일치**. 6-3 우선순위가 GSC 데이터로 검증됨.

## 5. 주요 검색 쿼리 (90일)

- ISA 클러스터: "isa 서민형 요건 총급여 5000만원 종합소득금액 3800만원" 등 ISA 한도·요건 롱테일이 노출 다수.
- IPO 클러스터: "공모주 일정", "공모주 청약 일정", "ipo 캘린더", "2026 5월 공모주 일정" 등 일정·캘린더 키워드 강세.
- 자산관리: "자산 관리", "자산관리" — 평균순위 ~70위로 약함 (개선 우선순위 낮음).

## 6. AEO/GEO 결손 현황 (6-3 진단 재확인)

| 항목 | 적용 | 미적용 | 비율 |
|------|------|--------|------|
| 메타 (title/desc/OG) | 29/29 | 0 | 100% |
| Organization JSON-LD | 29/29 | 0 | 100% |
| FAQPage Schema | 10 (/cost/area-*) | 19 | **34%** |
| HowTo Schema | 3 (/tax/*) | 26 | **10%** |
| Article Schema | 3 (/tax/*) | 26 | **10%** |
| 50자 직접 답변 lead | 0 | 29 | **0%** |
| Author byline / E-E-A-T | 0 | 29 | **0%** |

→ Phase 2 자동화 스크립트가 가장 큰 효과를 낼 영역. 50자 직답·byline은 6-3에서 0점이었던 항목.

## 7. 6-4 D+30 KPI (2026-05-30 게이트)

| KPI | 현재 | 목표 |
|-----|------|------|
| GSC 클릭 (28일) | 1 | **≥ 30** |
| CTR (28일) | 0.14% | **≥ 4%** |
| 평균 순위 | 7.6 | **≤ 6.5** |
| GA4 Organic 비중 | 8.4% | **≥ 15%** |

게이트 충족 항목 ≥ 2 시 Phase 5 신규 집필 정상 진행, 미달 시 6-5 사이클로 백로그 이연.

## 8. 다음 액션 (D+0~D+2)

1. /tax/isa-guide 단독 보강 (title 60자·description 160자 CTA·50자 lead·FAQPage·Article·byline) → GSC URL Inspection 즉시 색인 요청.
2. D+7에 단독 결과 검증 → `inject_aeo_schema.py` 보정 → Phase 2 일괄 적용.

(원본 데이터: GSC API `sc-domain:financecoffeechat.com`, GA4 Property 531235095. 자동 수집 기준일 2026-04-30.)
