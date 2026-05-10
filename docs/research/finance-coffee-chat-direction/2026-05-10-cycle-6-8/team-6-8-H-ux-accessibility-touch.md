# 사이클 6-8-H — UX·접근성·터치 실측 감사 (2026-05-10)

**팀 미션**: 5개 표준 페이지(`index.html`, `tax/isa-guide.html`, `ipo.html`, `index-investing.html`, `cost/area-02-credit-cards.html`)의 모바일 UX를 viewport 360/390/414px 기준으로 line-by-line 실측해, **모바일 노출 1.67%** 병목의 UX·접근성 기여분을 정량화한다. 6-8-A팀이 다룬 터치 타겟 통계와 중복을 피하고 **한손 영역, 한국어 가독성, KWCAG 2.2, GA4 행동지표** 4개 보강 영역에 집중한다.

**기준 표준**: [WCAG 2.2 SC 2.5.8 (AA, 24px)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [WCAG 2.5.5 (AAA, 44px)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced), [Apple HIG 44pt](https://developer.apple.com/design/human-interface-guidelines/), [Material Design 48dp](https://m3.material.io/), [KWCAG 2.2 (한국, 44×44 CSS px 권고)](https://a11ykr.github.io/kwcag22/), [Steven Hoober "Designing Mobile Interfaces"](https://designingmobileinterfaces.com/) thumb zone.

---

## 1. 조사 결과

### 1-1. 5개 표준 페이지 viewport 360 / 390 / 414px 실측

미디어 쿼리는 **600px**(태블릿 경계)와 **480px**(소형 폰)에 집중. iPhone Pro Max·삼성 Ultra의 414~430px 영역에서는 **추가 분기 없음**. 즉 414px 사용자는 480~600px 사이의 "기본 데스크톱 레이아웃 축소판"을 받는다.

| 페이지 | 360px | 390px | 414px | 정의된 분기점 (라인) |
|---|---|---|---|---|
| `index.html` | 480px 분기 적용(좁은 폰) | 480px 분기 적용 | 600px 미만 — 분기 없음, 480px 분기도 미적용 | `index.html:67`, `index.html:117` (480px만) |
| `tax/isa-guide.html` | 600·480 모두 적용 | 600·480 모두 적용 | 600·480 모두 적용 | `tax/isa-guide.html:49`, `:71`, `:87`, `:88`, `:113` (600·768·480 3중) |
| `ipo.html` | 600px 분기 + 캘린더 모바일 모드(라인 342-353) | 동일 | 동일 | `ipo.html:337` (600px) |
| `index-investing.html` | 600·768 분기, 480px 미정의 | 동일 | 동일 | `index-investing.html:78`, `:125`, `:139`, `:378`, `:429`, `:455` |
| `cost/area-02-credit-cards.html` | 600px 분기 적용 | 동일 | 동일 | `cost/area-02-credit-cards.html:184`, `:208` |

**RED 발견**:
- `index.html`은 414px 폰(iPhone 15·16 Pro Max)에서 **480~600px 사이의 buggy 영역에 머무름**: `.btn-card padding 24px 28px`이 그대로 유지되어 카드 폭 320px 미만 영역에서 터치 카드 텍스트가 줄바꿈됨.
- `index-investing.html`은 480px 분기가 아예 없어 360px 환경에서 `.recommend-card-title 16px / padding-right 42px` 등 데스크톱 값 그대로 노출. D+7 RED 16단계 추락의 "small-screen broken layout" 가설을 뒷받침한다.
- 5개 페이지 모두 **414~430px 영역 분기 부재** → 한국 시장에서 점유율 높은 갤럭시 S Ultra·아이폰 Pro Max 사용자에게 데스크톱 축소형이 그대로 전달됨.

### 1-2. 터치 타겟 44px 감사 (Apple HIG·Material 48dp·KWCAG 2.2·WCAG 2.5.5 AAA)

> 6-8-A팀이 9개 핵심 nav/CTA 중 7개 미달을 보고함. 본 H팀은 **WCAG 2.5.8 AA(24px) 추가 검증 + FAQ details + 인접 간격(spacing exception)** 누락 항목을 보강.

| 페이지 | 메뉴 (`nav a`) | CTA 카드 | 내부 링크 | FAQ 토글 (`summary`) | 24px AA | 44px AAA/KWCAG |
|---|---|---|---|---|---|---|
| `index.html` | 38px (라인 52-58) | btn-card 70px (라인 84-91) ✅ | 카드 내부만 | (없음) | 통과 | 메뉴만 미달 |
| `tax/isa-guide.html` | 38px (글로벌) | (`.related a` 라인 89, padding 16+18 ≈ 50px ✅) | 13.5px li (라인 80) | summary 14.5px + padding 14+14 = 약 40-42px (라인 95-99) | 통과 | summary·메뉴 미달 |
| `ipo.html` | 38px | `.detail-btn` ~31px (라인 258-264) | 캘린더 셀 mobile 44px ✅ | (없음) | filter-btn·subnav 미달 | 다수 미달 |
| `index-investing.html` | 38px | `.recommend-card` 60px+ ✅ | 13px chip 36px (라인 207-213) | (없음) | chip 36px 통과 | chip·메뉴 미달 |
| `cost/area-02-credit-cards.html` | 38px | (글로벌만) | 13.5px li | (없음) | 통과 | 메뉴 미달 |

**핵심 발견**:
1. `tax/isa-guide.html`의 **FAQ `summary` 토글 영역 ~40px**(`tax/isa-guide.html:95-99`)은 KWCAG 2.2 권고 44px에 4px 부족. 노안 사용자(40대+)에서 미스탭 빈도 증가 [가설]. WCAG 2.5.8 AA 24px은 통과.
2. `nav a` 38px (전 페이지 공통)은 **KWCAG 2.2 모바일 44×44 CSS px 권고에 정면 위반**. WCAG 2.5.8 AA 24px은 통과하나 한국 공공·금융 표준의 "준수" 라벨을 받기 어렵다.
3. 모바일 분기에서 `nav a { margin: 0 6px; font-size: 12px }` (`index.html:121`)로 **오히려 더 작아짐** → spacing exception(인접 24px+)으로도 보상 안 됨.

### 1-3. 본문 폰트 + 한국어 가독성

한국어 본문 권장값(국립국어원 권고 + Naver 디자인 가이드): **본문 16px+, line-height 1.6+, Noto Sans KR family**. 한자어 비중이 높은 한국어는 영문 대비 글자 밀도가 높아 14px 이하에서 가독성이 급격히 떨어진다.

| 페이지 | 본문 기본 | 표·카드 텍스트 | 주석/캡션 | 결론 |
|---|---|---|---|---|
| `index.html` | body 폰트 미명시 → 브라우저 기본 16px (`index.html:44-51`) | `.btn-desc 12.5px` (라인 110-112) ❌ | footer 12px | 카드 설명 RED |
| `tax/isa-guide.html` | `.lede 15px` (라인 61) ⚠️ / answer-box 16px (라인 106) ✅ | compare-table 13px → 모바일 12.5px (라인 113) ❌ | byline 12px | 표 RED |
| `ipo.html` | header 14px (라인 94) | `.ipo-name 16px ✅` / `.ipo-meta 13px` | tooltip 11px ❌ | 비-FAQ 정보 캡션 미달 |
| `index-investing.html` | `.intro 15px` ⚠️ | recommend-card 13px / 16px 혼용 | drawdown-strip 13px | 13px 설명문 다수 RED |
| `cost/area-02-credit-cards.html` | `p, li 15px` (라인 157) ⚠️ / table 14px | 모바일 분기 미적용 라인 184-192 | 12px footer | 본문 15px 일관 |

**핵심 발견**:
- 5개 중 **0개 페이지가 본문 16px 일관 적용 미흡**. 답변박스(answer-box)만 모바일 15~16px 보장.
- `compare-table` 모바일 12.5px (`tax/isa-guide.html:113`)는 ISA 한도 비교표의 핵심 정보 — 노안·다초점 안경 사용자에게 줌 강제(WCAG 2.5.5 AAA 위반 우려).
- line-height는 1.6~1.85로 양호. font-family는 Noto Sans KR + Playfair Display 일관 ✅.

### 1-4. 한손 사용성 (Thumb Zone — Steven Hoober)

Hoober의 한손 모바일 사용 통계: 사용자의 **49%가 한손 잡기, 36%가 받침-한손, 15%가 양손**. 화면 상단 1/3은 "uncomfortable"/"hard-to-reach", 하단 2/3가 "natural" zone ([Designing Mobile Interfaces](https://designingmobileinterfaces.com/)).

| 페이지 | 주 메뉴 위치 | 핵심 CTA 위치 | 한손 도달성 |
|---|---|---|---|
| `index.html` | 상단 nav (`index.html:52`) | 카드 그룹 — 화면 80vh 영역 | ⚠️ 메뉴 상단 (uncomfortable) |
| `tax/isa-guide.html` | 상단 nav + sticky subnav (라인 44, `position: sticky; top:0`) | 답변박스(상단), FAQ(하단) | ✅ subnav sticky 유리 |
| `ipo.html` | 상단 nav | 캘린더(중단), CTA(`.detail-btn` 카드 내부) | ⚠️ 캘린더 nav 버튼 36px 상단 |
| `index-investing.html` | 상단 nav + chip filter | recommend-card 중단, CTA 하단 | ⚠️ chip 36px·터치 미세 |
| `cost/area-02-credit-cards.html` | 상단 nav + sticky subnav 없음 (라인 193 정의되어 있으나 sticky 미적용) | 본문 텍스트 위주 | ⚠️ 메뉴 도달성↓ |

**핵심 발견**:
- 5개 페이지 중 **`tax/isa-guide.html`만 `subnav` sticky** 적용 → 스크롤 중 가독성·도달성 best.
- 하단 floating CTA·bottom-nav 패턴은 **0개 페이지 적용**. 한국 모바일 UX 표준(쿠팡·토스·당근)에서 보편적인 하단 CTA 부재 → "한손 결제·구독 흐름"의 기본 기대치 미충족.
- **scroll_depth GA4 이벤트 트래킹 미설정** (`js/` 디렉터리 grep 0건) → 한손 도달 한계 지점 데이터 부재.

GA4 보강 데이터 (28일, 디바이스별):

| 디바이스 | 평균 세션 | bounce | engagement | pages/session |
|---|---|---|---|---|
| desktop | 268.5초 | 60.3% | 39.7% | 4.21 |
| mobile | 226.1초 | **36.0%** ✅ | **64.0%** ✅ | **5.40** ✅ |
| tablet | 0 | 100% | 0% | 1.00 |

**역설 발견**: 모바일 사용자는 일단 진입하면 **데스크톱보다 더 깊게 본다(engagement 64% vs 40%, pages 5.4 vs 4.2)**. 즉 **UX 자체는 모바일에서도 작동 중**. 1.67% 노출 부족은 UX보다 **모바일 SERP 진입 자체의 문제**로 좁혀진다 — H팀의 UX 결함은 "추가 손실"이지 "주 원인"이 아님. 다만 모바일 평균 세션이 데스크톱보다 42초 짧다는 점 + `/index-investing` 모바일 데이터가 GA4 상위 20에 부재(7일 D+7 추락 일치)는 추가 조사 필요.

### 1-5. WCAG AA 모바일 + KWCAG 2.2 준수 점검

[KWCAG 2.2](https://a11ykr.github.io/kwcag22/) 33개 검사항목 중 모바일 영향 핵심:

| 항목 | 상태 | 증거 (파일:라인) |
|---|---|---|
| 5.4.1 색 대비 4.5:1 | ⚠️ 일부 위반 | `medium-roast #6B3A2A on oat-milk #FAF6F0` 약 6.8:1 ✅ / `caramel #C4853C on white` 3.2:1 ❌ (`index.html:104` btn-icon CTA arrow) |
| 1.1.1 alt 텍스트 | ✅ 부분 통과 | `index.html:193` logo alt만 1건 — 다른 페이지 `<img>` 부재로 N/A |
| 2.5.5/2.5.8 터치 타겟 | ❌ 7개 미달 | 1-2 표 참조 |
| 3.3.2 폼 레이블 | N/A | 정적 사이트, 폼 부재 |
| 2.1.1 키보드 접근 | ⚠️ details/summary 자체 통과, but `.chip` (라인 207) `cursor: pointer`만 부여 — `<button>` 또는 `role="button"` 부재 → 키보드 Tab 시 포커스링 없음 (`index-investing.html`) |
| 4.1.2 ARIA 레이블 | ❌ `aria-*` 전 페이지 5건 이내, 동적 캘린더(`ipo.html`) `aria-live` 부재 → 스크린리더 사용자 미인지 |
| 1.4.4 텍스트 200% 확대 | ⚠️ 모바일 답변박스 16px 줌은 가능하나 compare-table 12.5px 줌 시 가로 스크롤 발생 |
| 1.3.4 화면 방향 | ✅ landscape/portrait 모두 작동 |

**핵심**: 한국 정보접근성 인증(KWCAG 2.2 마크) 기준에서 **현재 점수 약 25/33** 추정. 공공·금융 키워드 모바일 SERP에서 접근성 신호 미흡.

---

## 2. 갭·원인 가설

| # | 갭 | 1.67% 노출 부족 직접 기여 | 간접 기여 (체류·재방문) |
|---|---|---|---|
| H1 | 414~430px 분기 부재 → 갤럭시 S Ultra·아이폰 Pro Max에서 데스크톱 축소형 | 저 (5%) | 중 (CTR 손실) |
| H2 | nav a 38px / chip 36px / detail-btn 31px (KWCAG 44px 권고 미달) | 저 (5~10%) | 중 (체류 단축) |
| H3 | compare-table 모바일 12.5px·tooltip 11px (한국어 가독성 RED) | 저 | 중 (page depth 저하) |
| H4 | 하단 sticky CTA·bottom-nav 부재 (한국 모바일 UX 기대치 미충족) | 저 | 중 (재방문↓) |
| H5 | scroll_depth GA4 이벤트 미설정 → UX 진단 데이터 부재 | 0 (직접) | 고 (블라인드) |
| H6 | 색 대비 caramel arrow 3.2:1 + ARIA 미흡 → KWCAG 인증 미획득 | 저 | 저 (브랜드 신뢰) |

**결론**: GA4 모바일 engagement 64%·5.4 pages/session이 **이미 양호**. 1.67% 병목의 UX 직접 기여는 **10~15% 정도**로 추정(6-8-A의 25% 추정보다 보수적). UX는 "쾌적한 진입을 망치지 않는" 정도로는 작동 중이나, **KWCAG 인증 미획득과 414px 분기 부재**가 한국 모바일 SERP 신뢰 신호의 약한 고리.

---

## 3. 권고 액션 후보

| ID | 액션 | 효과 가설 | 비용 |
|---|---|---|---|
| H-A1 | 글로벌 `nav a`를 padding 12px → 14px, font-size 14px → 15px로 상향(`index.html:52`, `tax/isa-guide.html:42`, `ipo.html:60`, `index-investing.html:59`, `cost/area-02-credit-cards.html`) → 세로 ~46px 확보 | KWCAG 44px 통과 + 미스탭 감소 | S (1시간, 5파일 일괄) |
| H-A2 | 414~480px 추가 미디어 쿼리 도입(`index.html`, `index-investing.html`) — `.btn-card` padding 모바일 16px·`.recommend-card` font-size 모바일 인치 그래픽 보장 | Pro Max 사용자 RED 16단계 회복 가설 검증 | S (2시간) |
| H-A3 | `compare-table` 모바일 13.5px+ 상향 + `tooltip` 디스플레이 모드 재설계(`tax/isa-guide.html:113`, `ipo.html:201`) | 한국어 가독성 + KWCAG 1.4.4 통과 | S (2시간) |
| H-A4 | scroll_depth GA4 이벤트 도입(`gtag('event','scroll',{percent_scrolled:25/50/75/100})`) — 5개 페이지 `<script>` 블록 | UX 데이터 시작 → H5 블라인드 해소 | S (1시간) |
| H-A5 | `.chip`을 `<button>`으로 변환 + 포커스링 + `aria-pressed` 추가(`index-investing.html:207`) | KWCAG 2.1.1·4.1.2 통과 | M (반나절) |
| H-A6 | 모바일 하단 sticky 핵심 CTA(예: ipo·index-investing의 "내 청약 알림"·"내 자산 시뮬") 추가 | 한국 모바일 기대치 충족, 재방문 가설 | M (1일) |

## 4. ICE 우선순위

| ID | Impact | Confidence | Ease | Score |
|---|---|---|---|---|
| H-A1 | 6 (KWCAG 인증 + 미스탭 감소) | 8 | 9 | **23** |
| H-A4 | 7 (다음 사이클 데이터 확보) | 9 | 9 | **25** ⭐ |
| H-A2 | 5 (Pro Max 분기) | 6 | 8 | 19 |
| H-A3 | 5 (가독성 RED) | 7 | 8 | 20 |
| H-A5 | 4 (KWCAG 부분) | 6 | 5 | 15 |
| H-A6 | 6 (재방문) | 4 | 4 | 14 |

**권고 순위**: H-A4 (scroll_depth) → H-A1 (nav 44px) → H-A3 (compare-table 모바일 가독성) → H-A2 (414px 분기) → H-A5 → H-A6.

---

## 5. 출처

- [WCAG 2.2 SC 2.5.8 Target Size Minimum (W3C)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [KWCAG 2.2 한국 표준 (a11ykr)](https://a11ykr.github.io/kwcag22/)
- [pxd KWCAG 2.2 가이드](https://tech.pxd.co.kr/post/%ED%95%9C%EA%B5%AD%ED%98%95-%EC%9B%B9-%EC%BD%98%ED%85%90%EC%B8%A0-%EC%A0%91%EA%B7%BC%EC%84%B1-%EC%A7%80%EC%B9%A8-2-2-228)
- [Apple HIG — Layout 44pt](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design 3 — 48dp](https://m3.material.io/)
- [한국디지털접근성진흥원 인증](http://www.kwacc.or.kr/Accessibility/Certification)
- [Steven Hoober Designing Mobile Interfaces — thumb zone](https://designingmobileinterfaces.com/)
- GA4 Property G-ZZEG7YQ80S (28일, 2026-04-12 ~ 2026-05-09 deviceCategory · pagePath 행동지표)
