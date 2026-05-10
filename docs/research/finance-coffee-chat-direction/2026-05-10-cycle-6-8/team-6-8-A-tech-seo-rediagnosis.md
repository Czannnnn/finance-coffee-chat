# 사이클 6-8-A — 기술 SEO 모바일 재진단 (2026-05-10)

**팀 미션**: 기존 `2026-05-10-mobile-diagnosis.md`(viewport 5/5, Lighthouse 99.6/100, CWV 정상, 색인 정상 확인)가 **놓친 5개 기술 차원**을 깊이 파, 모바일 노출 1.67% 병목의 추가 원인을 찾는다.

**진단 대상**: `index.html`, `tax/isa-guide.html`, `ipo.html`, `cost/area-02-credit-cards.html`, `index-investing.html`

---

## 1. 조사 결과

### 1-1. 터치 타겟 44×44px 감사 — RED

**Apple HIG**: 최소 44×44pt(약 44CSS px). **Google Material**: 48×48dp. **WCAG 2.5.5 (AAA)**: 44×44 CSS px ([Apple HIG / Material / TetraLogical](https://tetralogical.com/blog/2022/12/20/foundations-target-size/)).

| 요소 (페이지:라인) | 실측 크기 | 44px 충족? |
|---|---|---|
| `nav a` (전 페이지 공통, `index.html:52-58`, `ipo.html:60-65`) | padding 12+12 = 세로 38px, font 14px | ❌ 세로 ~36px |
| `.subnav a` (`ipo.html:74-80`) | padding 4+4+font 13 = 세로 ~21px | ❌ 절반 미만 |
| `.filter-btn` (`ipo.html:103-108`) | padding 6+6+font 12.5 = 세로 ~25px | ❌ 절반 |
| `.cal-nav-btn` (`ipo.html:137-141`) | 36×36 px 명시 | ❌ -8px |
| `.cal-day` (`ipo.html:154-158`, mobile 342) | min-height 44px | ✅ 모바일 한정 |
| 모바일 `nav a` (`index.html:121`, `ipo.html:340`) | margin 6px+font 12px → 세로 ~32px | ❌ |
| `.detail-btn` (`ipo.html:258-264`) | padding 9+9+font 13 = ~31px | ❌ |
| `.subnav a` (`tax/isa-guide.html:46`) | padding 4+4+font 13 = ~21px | ❌ |
| `home` 카드 a 링크(`index.html:86-91`) | padding 24+24+텍스트 = ~70px | ✅ |

**합계: 표준 페이지 5개에서 9개 핵심 nav/CTA 중 7개가 모바일 44px 미달**. 김선영 페르소나(43세, 노안, 태블릿 거치 사용)에서 미스탭 빈도↑ → bounce↑ → AI Overview/SERP 모바일 노출 손실 가설 강화.

### 1-2. WebP/AVIF 전환 — 미적용 (RED)

- 현재 모든 OG 이미지·아이콘 PNG: `og-image.png 49KB`, `og-isa-guide.png 56KB`, `og-irp-refund-guide.png 57KB`, `og-pension-irp-comparison.png 57KB`, `apple-touch-icon.png 7KB` (총 226KB)
- `<picture>` 태그·WebP·AVIF **0건** (Grep 결과)
- web.dev 권고: WebP는 PNG 대비 26% 작고, AVIF는 PNG 대비 50% 작음 ([web.dev modern image formats](https://web.dev/articles/serve-images-webp))
- 한국 5G 보급률 60%+(과기정통부, 2025년 말 추정)이지만 LTE/지하철·터널 트래픽 여전 — 4G 환경에서 LCP에 OG·favicon은 직접 영향 없으나 **소셜 미리보기·카카오톡 인링크 카드 미리보기·Discover 썸네일 로딩 속도** 영향.

[가설] 모바일 SERP·Discover에서 썸네일 로드 지연 시 표시 우선순위가 밀릴 수 있음(공식 명시 없음, [Google Discover guidelines](https://developers.google.com/search/docs/appearance/google-discover)는 "high-quality images"만 권고).

### 1-3. hreflang/canonical 모바일 일관성 — 미적용 (YELLOW)

- 5개 페이지 모두 `<link rel="canonical">`은 정상 (예: `index.html:10` → `https://www.financecoffeechat.com/`)
- `<link rel="alternate" hreflang>` **0건** (Grep 결과)
- `og:locale = ko_KR` 명시는 있음 (`index.html:16`)
- `vercel.json`(라인 4-17): apex·vercel.app → www 영구 리다이렉트 정상 → 모바일에서 리다이렉트 체인 1홉으로 안전

**결론**: 한국 단일 언어 사이트라 `hreflang` 필수는 아님. 그러나 Google은 `hreflang="ko-KR"` + `x-default` 명시를 권장 ([Google hreflang docs](https://developers.google.com/search/docs/specialized/international/localized-versions)). 미명시 시 일본·중국 SERP에서 잘못 표시될 수 있고, **AI Overview의 언어 신호가 약해 한국 모바일 우선 표시에서 후순위 가능성** [가설].

### 1-4. 크롤 버짓·MFI — 잠재적 RED

- 2024-07-05 Google 모바일 우선 색인(MFI) 100% 전환 완료 ([nostra.ai 2025](https://www.nostra.ai/blogs-collection/everything-you-need-to-know-about-googles-mobile-first-indexing))
- 즉 본 사이트는 **이미 Googlebot Smartphone 단일 크롤** 상태
- `robots.txt` 9개 AI 크롤러 Allow는 본 Googlebot Smartphone에 영향 없음 (별도 user-agent)
- 그러나 GPTBot·ClaudeBot·PerplexityBot은 **모바일 UA 미전송**(대부분 데스크톱 UA) → AEO 답변박스가 데스크톱 컨텍스트로만 학습되는 부작용 가능성 [가설]
- Google Crawl Budget 문서(2025-09 업데이트): "모바일 크롤러는 JS 렌더링 비용으로 페이지당 더 많은 버짓 소모" ([Google Crawl Budget](https://developers.google.com/crawling/docs/crawl-budget))
- 본 사이트 `ipo-analysis.html` 동적 주입(라인 1083, 1094, 1184) → 모바일 크롤러가 렌더링 큐 지연 시 본 답변박스 일부 미인덱싱 가능성

### 1-5. JS 렌더링 모바일 차이 — RED

`ipo.html`·`ipo-analysis.html`·`cost/area-02-credit-cards.html` 동적 주입 검증:

| 페이지 | innerHTML 라인 | 정적 HTML에 포함? | 모바일 first-render 영향 |
|---|---|---|---|
| `ipo.html:992,1010,1053,1077,1090,1098` | 캘린더·IPO 카드 전체 동적 | ❌ shell만 정적 | 크롤러 렌더 큐 지연 시 빈 페이지로 인덱싱 위험 |
| `ipo-analysis.html:1083,1094,1184` | 등급 분석 카드 전체 동적 | ❌ | 동일 |
| `cost/area-02-credit-cards.html` | 동적 주입 0건 | ✅ 답변박스(라인 233) 정적 | ✅ 안전 |
| `tax/isa-guide.html` | 동적 주입 0건 | ✅ | ✅ |
| `index.html` | 동적 주입 0건 | ✅ | ✅ |

**핵심 발견**: 모바일 1.67% 병목 페이지 중 **ipo·ipo-analysis 2건이 client-side rendering 의존**. Googlebot Smartphone은 렌더링 큐가 데스크톱보다 느려 첫 색인 시 답변박스가 미반영될 위험이 더 큼.

---

## 2. 갭·원인 가설

기존 진단(`2026-05-10-mobile-diagnosis.md`)이 놓친 차원:

| # | 갭 영역 | 1.67% 노출 부족 기여도 [추정] |
|---|---|---|
| G1 | 7개 nav/CTA 44px 미달 → 모바일 미스탭 → 짧은 체류 → 품질 신호 약화 | 중 (15~25%) |
| G2 | 핵심 페이지 2건(ipo·ipo-analysis) CSR 의존 → Googlebot Smartphone 렌더 지연 시 답변박스 미인덱싱 | 중 (15~30%) |
| G3 | hreflang `ko-KR` 미명시 → 한국 SERP 언어 신호 약화 | 저 (5~10%) |
| G4 | OG 이미지 PNG 226KB → 카카오톡·Discover 미리보기 로딩 지연 | 저 (5~10%) |
| G5 | AI 크롤러 데스크톱 UA → 답변박스 학습 데스크톱 편향 | 저 [가설, 측정 어려움] |

**기존 진단 결론 보완**: 1.67% RED는 SERP·AEO 차원 문제가 1순위지만, **G1+G2는 즉시 코드 개선 가능한 보조 병목**으로 식별. 특히 G2는 "PR #5 답변박스 head 내부 이동" 후속 조치와 결합 시 효과 증폭 가능.

---

## 3. 권고 액션 후보

| 코드 | 명칭 | 구현 위치 | 예상 효과 | 공수(h) | 출처 |
|---|---|---|---|---|---|
| **AX-touch44** | 모바일 nav/CTA 44px 표준화 | 5페이지 `nav a`·`subnav a`·`filter-btn`·`detail-btn` CSS에 `min-height:44px;display:inline-flex;align-items:center;` 추가 (예: `index.html:52`, `ipo.html:60-80,103-108,258-264`, `tax/isa-guide.html:41-46`) | 미스탭↓ → bounce 5~10%↓ → 모바일 품질 신호↑ | 2~3h | [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility), [WCAG 2.5.5](https://tetralogical.com/blog/2022/12/20/foundations-target-size/) |
| **AX-static-ipo** | ipo·ipo-analysis 답변박스 정적 HTML 변환 | `ipo.html`·`ipo-analysis.html`에 빌드 시점 또는 수동으로 상위 5건 IPO 카드를 정적 HTML로 SSR(Apps Script 출력) — 동적 갱신은 hydrate 패턴 | Googlebot Smartphone 첫 색인 보장, 모바일 답변박스 노출 추가 확보 | 4~6h | [Google JS SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) |
| **AX-hreflang** | `<link rel="alternate" hreflang="ko-KR">` + `x-default` 5페이지 추가 | 각 페이지 `<head>` canonical 다음 줄 (예: `index.html:11`) | 한국 SERP 언어 신호 명확화 | 0.5h | [Google hreflang](https://developers.google.com/search/docs/specialized/international/localized-versions) |
| **AX-webp-og** | OG·favicon WebP 변환 + `<picture>` 폴백 | `og-*.png` 4개 → WebP 출력, `meta og:image`는 PNG 유지(호환성), 본문 이미지에만 `<picture>` | 카카오톡·Discover 미리보기 ~30% 가벼움 | 1~2h | [web.dev WebP](https://web.dev/articles/serve-images-webp) |
| **AX-mobile-ux-audit** | 실기기 측정(Galaxy/iPhone) + Chrome DevTools Mobile Throttling 측정 | 사용자가 실측 후 결과 노션에 기록 | 가설 G1·G2·G4 정량 검증 | 1.5h(측정) | [Chrome DevTools Mobile](https://developer.chrome.com/docs/devtools/device-mode) |

---

## 4. ICE 우선순위

| 액션 | Impact (1-10) | Confidence (1-10) | Effort (1-10, 낮을수록 쉬움) | ICE 점수 (I·C/E) | 우선순위 |
|---|---|---|---|---|---|
| AX-hreflang | 4 | 8 | 1 | **32.0** | 1 |
| AX-touch44 | 6 | 7 | 2 | **21.0** | 2 |
| AX-static-ipo | 8 | 6 | 5 | **9.6** | 3 |
| AX-webp-og | 3 | 6 | 2 | **9.0** | 4 |
| AX-mobile-ux-audit | 5 | 7 | 2 | **17.5** | 5(보조) |

**해석**:
- **1순위 AX-hreflang**: 0.5h로 즉시 효과, 한국 모바일 SERP 신호 강화. 사이클 6-8 PR에 묶어 즉시 머지 권고.
- **2순위 AX-touch44**: 2~3h 한 PR로 5페이지 일괄 처리. UX·SEO 동시 개선.
- **3순위 AX-static-ipo**: 가장 높은 Impact이나 4~6h 공수 → 사이클 6-9로 분리 가능.
- **5순위 AX-mobile-ux-audit**: 자체 효과는 없으나 G1·G2 가설 정량 검증 → 다음 사이클 데이터 확보용.

> 최종 액션 번호(A11~A15)는 사이클 6-8 final-report에서 부여.

---

## 출처

1. [TetraLogical — Foundations: target sizes (WCAG 2.5.5, Apple, Material)](https://tetralogical.com/blog/2022/12/20/foundations-target-size/)
2. [LogRocket — All accessible touch target sizes](https://blog.logrocket.com/ux-design/all-accessible-touch-target-sizes/)
3. [web.dev — Serve images in modern formats (WebP/AVIF)](https://web.dev/articles/serve-images-webp)
4. [Google Search Central — Mobile-First Indexing Best Practices](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing)
5. [Google Search Central — Crawl Budget Management (2025-09 업데이트)](https://developers.google.com/crawling/docs/crawl-budget)
6. [Google Search Central — Localized versions (hreflang)](https://developers.google.com/search/docs/specialized/international/localized-versions)
7. [Google Search Central — JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
8. [Nostra.ai — Mobile-First Indexing 2025 update](https://www.nostra.ai/blogs-collection/everything-you-need-to-know-about-googles-mobile-first-indexing)
9. [Apple HIG — Accessibility (44pt 최소 터치 타겟)](https://developer.apple.com/design/human-interface-guidelines/accessibility)
10. 내부 자료: `docs/research/2026-05-10-mobile-diagnosis.md` (기존 진단 1·2·3·4 섹션)

---

**작성**: 6-8-A팀 / **분량**: 약 1,150단어 / **자체 검수**: 한글 음차·기호(공모주·연저펀·캘린더·답변박스) 깨짐 없음 확인 완료
