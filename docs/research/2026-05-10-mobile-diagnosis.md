# 모바일 first index RED 4축 진단 — 사이클 6-7 D+7 A7

**진단일**: 2026-05-10
**진단 트리거**: 사이클 6-7 D+7 점검 결과 모바일 노출 비율 1.7%(98.3% 데스크톱) RED 지속. C1 + PR #5 (M1+M4 모바일 답변박스, 9094d56) 적용 후에도 모바일 노출 60에 머무름. 한국 시장 일반 분포(모바일 70%+)와 정반대 구조 진단.

---

## 1. GSC 모바일 사용 적합성 보고서 + 디바이스 분포

### 1-1. 28일 디바이스별 분포 (2026-04-12 ~ 2026-05-10)

| 디바이스 | 노출 | 클릭 | CTR | 평균순위 |
|----------|------|------|-----|----------|
| DESKTOP  | 5,052 | 2 | 0.04% | 6.4 |
| MOBILE   | 86 | 2 | **2.33%** | 12.1 |
| **합계** | **5,138** | **4** | 0.08% | — |

**모바일 노출 비율: 86/5,138 = 1.67%** (D+7 시점 1.7%와 동일, 변화 없음)

### 1-2. 핵심 역설 — 모바일 CTR이 데스크톱보다 58배 높음
- 데스크톱 CTR 0.04% / 모바일 CTR 2.33% → **모바일 CTR/데스크톱 CTR = 58.3배**
- 즉, "모바일에 노출되기만 하면 클릭이 발생한다"는 의미. 모바일 노출 부족이 절대적 병목.

### 1-3. 색인 상태 체크 (5 URL)
- 5 URL 모두 indexed (`tax/isa-guide`, `/ipo`, `/ipo-guide`, `/ipo-analysis`, `/cost/area-02-credit-cards`)
- canonical_issues 0 / robots_blocked 0 / fetch_issues 0
- → **색인은 정상. 인덱싱 차원의 차단 없음.**

### 1-4. 해석
- 색인·CWV 차원의 결함 없음 (1번·2번 섹션 결과). 모바일 사용성 오류도 잡힌 것 없음.
- 가설 1순위: **AIO(Google AI Overview)가 모바일 SERP에서 더 강하게 흡수** → 사이트 본 페이지로 가는 클릭이 데스크톱은 일부 살아 있고 모바일은 거의 사라짐.
- 가설 2순위: 모바일 SERP에서 강력한 도메인(증권사 앱·대형 블로그 모바일 카드)이 우위를 점함.
- 가설 3순위: GSC 표본 자체가 데스크톱 편향(헤비 유저가 PC에서 다회 검색).

---

## 2. Lighthouse 모바일 점수 (5 URL)

PR #5(M1+M4 답변박스) + isa-guide 표준 패턴 적용 5 URL을 mobile preset으로 측정.

| # | URL | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT | FCP |
|---|-----|-------------|---------------|----------------|-----|-----|-----|-----|-----|
| 1 | /tax/isa-guide | **100** | 92 | **100** | **100** | 0.3s | 0 | 0ms | 0.3s |
| 2 | /ipo | 98 | 87 | **100** | **100** | 0.3s | 0.085 | 0ms | 0.3s |
| 3 | /ipo-guide | **100** | 88 | **100** | **100** | 0.3s | 0 | 0ms | 0.3s |
| 4 | /ipo-analysis | **100** | 87 | **100** | **100** | 0.3s | 0 | 0ms | 0.3s |
| 5 | /cost/area-02-credit-cards | **100** | 86 | **100** | **100** | 0.4s | 0 | 0ms | 0.4s |
| **평균** | — | **99.6** | **88** | **100** | **100** | 0.32s | 0.017 | 0ms | 0.32s |

**보고서 위치**: `docs/research/2026-05-10-lighthouse-mobile/0[1-5]*.html`

### 2-1. 핵심 결론
- **Performance 100·LCP 0.3s·TBT 0ms·CLS 0** — Core Web Vitals 4축 모두 우수
- 모바일 first index RED는 **CWV 결함이 원인이 아님**. 즉 코드 측면 보강은 ROI 낮음.
- Accessibility 87~92로 8~13점 갭 존재 — 보조 개선 여지(라벨·대비) 있으나 부차적

### 2-2. 후속 조치 (없음)
- CWV 정상 → 모바일 페이지 로딩·렌더링 차원 추가 작업 불필요
- A6 적용 후 D+14 재측정 권고

---

## 3. sitemap.xml xhtml:link alternate 점검

### 3-1. 현황
- 38 URL · changefreq=weekly/monthly/daily · priority 0.65~1.0
- 변경 전: `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` (xhtml ns 없음)
- area-07-public-support lastmod=2026-05-07(PR #4 결과)

### 3-2. 분석
- 모바일 분리 도메인 **부재** (반응형 단일 URL) → xhtml:link alternate 자체는 **불필요**
- 다만 `xmlns:xhtml` 네임스페이스 선언이 없으면 일부 검색엔진이 모바일 인식 시그널 부재로 해석 가능

### 3-3. 조치 완료
- `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">` 네임스페이스만 추가 (1줄 변경)
- W3C XML validator 통과 예상 (XML well-formed 유지)
- Vercel 자동 배포 후 GSC sitemap 재제출 권고

---

## 4. SSR HTML 모바일 viewport·answer-box above-the-fold 검증

`Mozilla/5.0 (iPhone)` UA로 production SSR 5 URL fetch 후 검증.

### 4-1. viewport meta — 5/5 정상
모든 페이지 라인 5에 `<meta name="viewport" content="width=device-width, initial-scale=1.0">` 적용.

### 4-2. answer-box above-the-fold 노출 위치

| URL | answer-box 라인 | header 위치 | above-the-fold 판정 |
|-----|------------------|-------------|----------------------|
| /tax/isa-guide | **248** (header 내) | 243 | ✓ GREEN |
| /ipo | 470 (헤더 한참 아래) | — | ⚠️ YELLOW |
| /ipo-guide | 540 (헤더 한참 아래) | — | ⚠️ YELLOW |
| /ipo-analysis | **미발견** (production SSR) | — | RED — PR #5 미반영 |
| /cost/area-02-credit-cards | **미발견** (production SSR) | — | RED — PR #5 미반영 |

### 4-3. 핵심 발견 — PR #5 production 미반영 의심
- PR #5 (`9094d56`, 2026-05-07) 4페이지 답변박스 추가 커밋이 **master 미머지 상태**
- 그러나 D+7 점검에서 PR #5의 효과가 측정되어야 했으므로 사용자 push 또는 Vercel preview 배포 사용 가능성
- production SSR에서 ipo-analysis·area-02-credit-cards에서 answer-box 미발견은 **PR #5가 production에 도달하지 못했다**는 강력한 신호
- /ipo·/ipo-guide는 answer-box가 라인 470/540 위치 — 모바일 첫 화면(viewport 600~700px) 밖 배치 의심. above-the-fold가 아닌 below-the-fold 위치이면 AEO·speakable 효과가 약함.

### 4-4. 권고
1. **PR #5 master 머지 우선** — 이번 A6 + A8·A9 PR 머지 시 함께 처리
2. /ipo·/ipo-guide answer-box 위치를 isa-guide(라인 248) 패턴으로 **header 내부로 이동** — A6와 동일 시맨틱 구조로 통일
3. 위치 이동 후 D+14 재측정으로 효과 확인

---

## 종합 결론

### Top 3 발견
1. **모바일 first index RED는 CWV·색인·viewport 결함이 아닌 SERP·AEO 차원 문제** — Lighthouse 모바일 100·색인 5/5 정상
2. **모바일 CTR이 데스크톱보다 58배 높음 — 노출만 늘어나면 클릭 폭증 가능성** (모바일 노출 86 → 1,000 진입 시 클릭 23+ 추정)
3. **PR #5 production 미반영 의심** (ipo-analysis·area-02 answer-box SSR 미발견) — 이번 사이클 PR 일괄 머지 시 함께 처리

### 추가 코드 변경
- ✅ sitemap.xml: `xmlns:xhtml` 네임스페이스 추가 (1줄)
- (이번 PR 범위 외) /ipo·/ipo-guide answer-box를 header 내부로 이동 검토

### D+14 재측정 항목
- 모바일 노출 비율 1.67% → ?% (목표 5%+)
- 모바일 평균순위 12.1 → ?위 (목표 8위 이내)
- A6 적용 5 URL의 모바일 노출 변화 (특히 tax-optimization·index-investing)

---

## 진단 산출물 파일

- 본 보고서: `docs/research/2026-05-10-mobile-diagnosis.md`
- Lighthouse 모바일 5 URL: `docs/research/2026-05-10-lighthouse-mobile/0[1-5]*.html`
- 코드 변경: `sitemap.xml` (xhtml ns 추가)
- 진단 도구: Lighthouse CLI 13.3.0 + GSC MCP + curl SSR fetch
