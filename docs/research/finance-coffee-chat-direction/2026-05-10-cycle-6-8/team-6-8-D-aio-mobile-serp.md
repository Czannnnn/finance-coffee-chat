# 사이클 6-8-D — AIO·모바일 SERP 차이 분석 (2026-05-10)

> **미션**: 같은 콘텐츠인데 데스크톱 6.4위 vs 모바일 12.1위 — 5.7단계 갭의 원인을 SERP 구조 측면에서 규명
> **작성**: 6-8-D팀
> **GSC 실측 기간**: 2026-04-12 ~ 2026-05-10 (28일)

---

## 1. 조사 결과

### 1-1 모바일 vs 데스크톱 AIO 노출 비율

2026-03 기준 Google AI Overview는 전체 쿼리의 **48% 이상**에 표시됨 — 1년 전 6.49% 대비 Y-o-Y 약 7.4배 증가 (almcorp/Searchlab 2026). 2025년 7월 24.61% 피크 이후 15~16%로 안정화 → 2026-Q1 재가속 (Search Engine Land, 2026).

**디바이스별 핵심 차이**:

| 항목 | 데스크톱 | 모바일 | 출처 |
|---|---|---|---|
| AIO + Featured Snippet 화면 점유율 | 67.1% | **75.7%** | almcorp 2026 |
| AIO 자체 화면 점유율 (px 환산) | 1,200 px+ (전체 fold) | 약 48% | mobileproxy / SE Land |
| AIO 트리거 시 모바일 비중 | 19% | **81%** | position.digital 2026 |
| AIO 노출로 인한 top-1 CTR 감소 | -56.1% | -48.2% | almcorp / Ahrefs 2026 |
| AIO 노출 후 일반결과 도달률 | 기준 | **-34% (스크롤 적게)** | SemRush AI Overviews Study |

**핵심 함의**: AIO를 트리거하는 쿼리의 81%가 모바일에서 발생하는데, 모바일 화면의 75.7%를 AIO+Featured Snippet이 차지 → 일반 organic 결과는 화면 하단으로 밀려난다. **모바일은 AIO가 가장 강력하게 작동하는 환경**이다.

### 1-2 모바일 SERP 슬롯 구조 (한국 Google)

한국 모바일 Google SERP 첫 화면(스마트폰 6.1" 기준) 평균 슬롯 구성 (2026 기준, growbydata/digitalmaze 종합):

1. **Sponsored / Google Ads** (1~3개, 평균 1.4개 표시)
2. **AI Overview / SGE** (해당 시 — 한국어 AI Mode는 2025-09 정식 출시)
3. **Featured Snippet / Answer Box**
4. **People Also Ask** (PAA, 평균 4개 펼침)
5. 뉴스 / 동영상 / 이미지 캐러셀
6. **일반 organic 결과 (1위~3위가 첫 화면 노출 한계)**

**한국 시장 특수성**:
- 한국 모바일 검색 점유율: **Naver 62.86%, Google 29.55%, Bing 3.12%, Daum 2.94%** (Korea Times, 2026-01)
- 모바일 검색 비중: 한국 전체 1.2조 쿼리 중 **약 950억 = 79.2%가 모바일** (StateGlobe 2026)
- 한국에서 Google에 도달하는 모바일 사용자는 **이미 Naver의 AI Briefing을 거치고 온 보충적 검색**일 가능성 높음 → 사용자 의도가 더 "보충/정밀" 지향

**파급 효과**: 1위라도 모바일 화면에서 8~10번째 슬롯이 되면 fold-below — finance-coffee-chat의 평균 모바일 12.1위는 **사실상 첫 화면 진입 불가**.

### 1-3 모바일 사용자 의도 + zero-click

| 지표 | 데스크톱 | 모바일 | 출처 |
|---|---|---|---|
| Zero-click 검색 비율 | 46.5% | **77.0%** | SEO Bazooka 2025 → click-vision 2026 |
| AIO 트리거 쿼리 zero-click | ~74% | **83%** | SemRush 2025 |
| 평균 검색당 페이지 체류 | 길다 | 짧다 (즉답 의도) | Searchlab 2026 |

**의미**: 모바일 사용자는 데스크톱 대비 **66% 더 자주 zero-click**으로 끝낸다. ISA·IRP·공모주 일정 등 finance-coffee-chat의 핵심 토픽은 **수치형·즉답형 쿼리** — 정확히 AIO/답변박스가 가로채기 가장 쉬운 의도.

GSC 실측에서도 이 패턴 확인:
- 데스크톱 노출 5,074 vs 클릭 2 → CTR **0.04%**
- 모바일 노출 86 vs 클릭 2 → CTR **2.33%** (비율은 높지만 노출 자체가 1.7%에 불과)

→ **모바일은 노출이 거의 발생하지 않는 것이 1차 문제**, 발생해도 zero-click으로 흡수되는 것이 2차 문제.

### 1-4 PR #5 4페이지 모바일 답변박스 효과 측정 (GSC 실측)

PR #5 (9094d56) 적용 4페이지 28일 디바이스별 노출 분리:

| 페이지 | 데스크톱 노출 | 데스크톱 평균순위 | 모바일 노출 | 모바일 평균순위 | 모바일/데스크톱 노출비 |
|---|---|---|---|---|---|
| /ipo | 45 | 22.6 | **11** | **10.3** | **24.4%** |
| /ipo-guide | 18 | 12.7 | 0 | — | 0% |
| /ipo-analysis | 0 | — | 0 | — | — |
| /cost/area-02-credit-cards | 8 | 11.4 | 0 | — | 0% |
| **합계** | **71** | — | **11** | — | **15.5%** |

**중요 관찰**:
1. **/ipo만 모바일 노출 발생** (11회) — 흥미롭게도 모바일 평균순위 **10.3위가 데스크톱 22.6위보다 12.3단계 더 좋음**. 가설: 모바일에서 "공모주 일정" 의도 강함 + 답변박스 후보로 평가받는 중.
2. **/ipo-guide·/ipo-analysis·/credit-cards는 모바일 노출 0** — PR #5 답변박스 마크업이 데스크톱 풀에는 진입했으나 **모바일 풀에는 아직 진입 못함**. 적용 후 약 18일 경과 시점이라 데이터 부족 가능성 + 모바일 답변박스 인용은 더 까다롭다는 가설 부분 확인.
3. /tax/isa-guide는 같은 사이트 내에서 데스크톱 367 노출(6.7위) vs 모바일 3 노출(8.7위) — 데스크톱이 이미 답변박스 후보에 들어가 있는데도 모바일 비중 0.81%에 그침. **모바일 SERP에서 이 사이트 자체가 후보 풀에 진입 못함**이 구조적 문제.
4. URL inspection 결과: /ipo, /ipo-guide, /credit-cards 모두 `crawled_as: MOBILE` + `verdict: PASS` — **인덱싱 자체는 정상**. 문제는 색인이 아니라 SERP 노출 확률.

### 1-5 모바일 SERP 진입 조건 가이드라인 (Google Search Central, 2026)

- **Mobile-first indexing**: 2024년 완료. Google은 모바일 버전을 단일 인덱스 source로 사용 → 모바일에서 보이지 않는 콘텐츠/CSS는 데스크톱에서도 안 보이는 것으로 간주 (developers.google.com/search/docs/crawling-indexing/mobile).
- **Speakable schema**: 7년째 BETA. **미국 영어 Google News 등록 매체 한정** → 한국 finance 사이트는 음성결과 진입 불가 (skill 적용 ROI 낮음).
- **Core Web Vitals 2025-09 업데이트**: INP가 FID를 대체. 모바일 INP < 200ms이 SERP 부스팅에 영향 큼.
- **AI Overview 인용 후보 조건** (SemRush 2026, ALM Corp): 11~20위 콘텐츠의 40%가 AIO에 인용됨 — 즉, **1~10위가 아니라 11~20위가 오히려 AIO에 잡힐 확률 높다**. /ipo의 모바일 10위는 AIO 후보 zone 진입 직전.

---

## 2. 갭·원인 가설 (왜 모바일 12.1위 vs 데스크톱 6.4위인가)

5가지 원인이 **누적 작용**한다는 가설:

| # | 원인 | 추정 기여도 | 근거 |
|---|---|---|---|
| H1 | **AIO/답변박스가 모바일 화면 75.7% 점유** → organic 결과가 fold 아래로 밀려 사용자가 우리 페이지까지 도달 못함 → CTR↓ → Google이 "낮은 인게이지먼트 신호"로 해석해 모바일 랭크 자체를 강등 | **40%** | almcorp 2026, SemRush 2026 |
| H2 | **한국 모바일 검색은 Naver 우선** — Google 모바일 사용자는 이미 Naver에서 1차 검색을 마치고 보충검색하는 long-tail 사용자 | 20% | digitimes 2026, sedaily 2026 |
| H3 | **모바일 사용자 의도 = 즉답** → ISA·IRP·공모주 같은 수치형 질의는 AIO/PAA로 흡수되어 **모바일 노출 자체가 발생 안 함** (28일 86 노출 vs 데스크톱 5,074 = 1.7%) | 20% | SemRush, Searchlab 2026 + 자체 GSC 실측 |
| H4 | **답변박스 마크업의 모바일 인용 지연** — PR #5 적용 4페이지 중 /ipo만 모바일 노출 발생, 나머지 3개는 0. 데스크톱 풀 진입 후 모바일 풀까지 평균 4~6주 걸린다는 SemRush 보고와 일치 | 10% | SemRush AI Overviews Study + 자체 GSC |
| H5 | **모바일 첫 화면 슬롯 부족** — 한국 모바일 SERP 첫 화면에 organic 결과는 사실상 1~3위만 표시 → 우리 사이트가 평균 12.1위면 화면 진입 0% | 10% | growbydata, digitalmaze 2026 |

**결론**: 5.7단계 갭은 **단일 원인이 아니라 H1·H2·H3가 누적된 구조적 갭**. 콘텐츠 품질이 아니라 SERP 환경 자체의 디바이스 격차 문제. **데스크톱 6.4위로 이미 입증된 적합성을 모바일에서 인식시키려면 별도의 모바일-우선 신호가 필요**.

---

## 3. 권고 액션 후보 (3~5개)

| ID | 액션 | 기대 효과 | 비용 | 위험 |
|---|---|---|---|---|
| **A1** | **답변박스 마크업을 27페이지 전체로 확대** + 각 페이지에 "한 문장 답변(40~60자)" 명시. 모바일 AIO 인용 후보 풀(11~20위)에 노출 빈도 증가 | 모바일 AIO 인용 +30%, 평균순위 1.5~2단계 상승 | 중 (27p × 30분) | 낮음 |
| **A2** | **Mobile-first 콘텐츠 리팩토링** — 첫 화면(약 600px) 안에 핵심 답변·표·요약을 압축. INP < 200ms 보장. 모바일 사용자가 도달했을 때 즉시 답변 제공 → 인게이지먼트↑ → 모바일 랭크↑ | 모바일 평균순위 -3~5단계 | 중상 (27p × 1h + INP 측정) | 낮음 |
| **A3** | **PAA 타겟팅 — "관련 질문 5개" 섹션을 각 페이지에 추가**. PAA 슬롯이 모바일 첫 화면을 차지하므로 PAA 노출이 organic 노출을 대체 | 모바일 PAA 인용 +50%, zero-click이지만 브랜드 노출 발생 | 낮 (27p × 15분) | 낮음 |
| **A4** | **Naver 검색 등록 + 블로그/카페 backlink 캠페인** — 한국 모바일 사용자의 62.86%는 Naver에 있음. Google에서만 잡히면 모바일 트래픽의 70% 이상을 놓침 | Naver 모바일 노출 신규 발생 (현재 0) | 중 (Webmaster Tools + 컨텐츠 적응) | 중 (Naver는 별도 SEO) |
| **A5** | **PR #5 4페이지 28일 후 효과 재측정 + /ipo 1페이지를 모바일 답변박스 정복 1차 타겟으로 집중** — 모바일 10.3위는 AIO 인용 zone 직전. FAQ schema·HowTo schema 추가, 첫 80자 압축 | /ipo 모바일 답변박스 인용 성공 시 0클릭이지만 브랜드 노출 발생 | 낮 (1p × 1h) | 낮음 |

---

## 4. ICE 우선순위

ICE = Impact (1~10) × Confidence (1~10) × Ease (1~10) ÷ 10

| ID | Impact | Confidence | Ease | ICE | 우선순위 |
|---|---|---|---|---|---|
| **A5** /ipo 모바일 답변박스 집중 | 7 | 8 | 9 | **50.4** | **1** |
| **A1** 답변박스 마크업 27p 확대 | 8 | 7 | 7 | **39.2** | **2** |
| **A3** PAA 타겟팅 27p 추가 | 6 | 7 | 8 | **33.6** | **3** |
| **A2** Mobile-first 리팩토링 | 9 | 6 | 5 | **27.0** | **4** |
| **A4** Naver 등록 + backlink | 8 | 5 | 4 | **16.0** | **5** |

**6-8 사이클 권고 시퀀스**:
1. **이번 주(6-8 마감)**: A5 — /ipo에 FAQ schema + 첫 80자 압축 (1시간)
2. **6-9 사이클**: A1 + A3 병행 (답변박스 + PAA 27페이지 확대, 약 13시간)
3. **6-10~6-11 사이클**: A2 (Mobile-first 리팩토링, 27 × 1h)
4. **6-12 이후**: A4 (Naver 진출은 별도 워크스트림으로 분리)

**KPI**: 모바일 평균순위 12.1위 → 8.0위 (4단계 단축, 6-11 사이클 종료 시점). 모바일 노출량 86 → 500+ (5.8배), 모바일 CTR은 zero-click 환경상 의미 약함.

---

## 출처

1. [Searchlab — AI Overviews Statistics 2026](https://searchlab.nl/en/statistics/ai-overviews-sge-statistics-2026)
2. [almcorp — Google AI Overviews Surge 58%, 9 Industries](https://almcorp.com/blog/google-ai-overviews-surge-9-industries/)
3. [almcorp — Google AI Overviews & Organic CTR 2026](https://almcorp.com/blog/google-ai-overviews-organic-ctr-2026/)
4. [SemRush — AI Overviews Study (200K AIOs)](https://www.semrush.com/blog/ai-overviews-study/)
5. [Search Engine Land — AI Overviews Surge then Pullback](https://searchengineland.com/google-ai-overviews-surge-pullback-data-466314)
6. [position.digital — 150+ AI SEO Statistics 2026](https://www.position.digital/blog/ai-seo-statistics/)
7. [click-vision — Zero Click Search Statistics 2026](https://click-vision.com/zero-click-search-statistics)
8. [growbydata — Google SERP Features 2026](https://growbydata.com/google-serp-features/)
9. [digitalmaze — SERP Landscape for 2026](https://thedigitalmaze.com/blog/the-evolving-serp-landscape-how-search-results-have-changed-and-what-to-expect-in-2026/)
10. [TechCrunch — Google AI Mode adds Korean (2025-09)](https://techcrunch.com/2025/09/08/googles-ai-mode-adds-5-new-languages-including-hindi-japanese-and-korean/)
11. [Korea Times — Naver Tops 60% Search Share 2026](https://www.koreatimes.co.kr/business/companies/20260104/naver-tops-60-in-koreas-search-market-data)
12. [Google Search Central — Mobile-first Indexing](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing)
13. [Google Search Central — Speakable BETA Schema](https://developers.google.com/search/docs/appearance/structured-data/speakable)

---

**작성 완료**: 2026-05-10 / 6-8-D팀 / 약 1,250 단어
**다음 액션**: 6-8 통합 보고서에 A1·A3·A5 추천 반영 검토
