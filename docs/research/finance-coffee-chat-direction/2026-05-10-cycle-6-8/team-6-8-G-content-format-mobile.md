# 사이클 6-8-G — 콘텐츠 포맷 모바일 적합화 (2026-05-10)

> 모바일 노출 1.67% · 평균순위 12.1위 환경에서, 27 페이지가 모바일에서 **읽히는 구조**인지 정량 평가하고 카드뉴스·인포그래픽·웹스토리·쇼츠 도입 ROI를 도출.
> 페르소나: 김선영 43세 IT 팀장(모바일 60%, 출퇴근·점심 활용).
> 분석 표본: `tax/isa-guide.html`, `ipo.html`, `index-investing.html`, `cost/area-07-public-support.html`, `tax-optimization.html`.

---

## 1. 조사 결과

### 1-1. 모바일 readable 구조 정량 기준 (2025-2026 베스트 프랙티스)

| 항목 | 기준 | 출처 |
|---|---|---|
| 본문 폰트 | 모바일 16px 이상(최저 14~15px) | UXPin / USWDS |
| 행간(line-height) | 영문 1.5 / 한·중·일 1.6~1.8 (CJK는 자모 밀도 高) | Material Design |
| 단락 길이 | 모바일 50~80자(2~4 문장), 데스크톱 100~150자 | Vayce / Letter Counter |
| 한 줄 글자수 | 모바일 세로 30~50자(영문 기준), 한국어는 25~35자 | UXPin |
| 단락당 문장 | 평균 2~3 문장(20단어 이하) | Wellows / Readable |
| Subheading 빈도 | **200~300단어(한국어 약 400~600자)마다 1개** | Upward Engine |
| TOC(목차) | 1,000자 이상 페이지 권장, 모바일은 sticky·접이식 | Wellows |
| 한글 자형 | 너비↑·자간↑·획대비↓·open counter↑ — 모바일 최적 | KCI 한글폰트 가독성 연구 |
| 페이지 로딩 | 3초 초과 시 53% 이탈 | Google 2025 |

핵심 시사점: **한국어는 영문 대비 행간 0.1~0.2 더 필요**, 단락 길이는 **문장 수가 아닌 문자 수**로 관리해야 한다(한국어 1문장이 영문 대비 더 짧음).

### 1-2. 우리 5개 샘플 페이지 모바일 가독성 점수 (100점 만점)

`<p>` · `<h1~6>` 빈도(Grep)와 본문 텍스트 크기(awk·sed) 측정 결과.
체본 폰트는 전 페이지 공통: `body line-height: 1.6` ([isa-guide.html:40](C:/Users/USER/Projects/finance-coffee-chat/tax/isa-guide.html), [index-investing.html:48-55](C:/Users/USER/Projects/finance-coffee-chat/index-investing.html)). 본문 단위 폰트는 13.5~15px가 다수, 16px 미만이 대다수.

| 페이지 | 본문 글자수* | h 갯수 | p 갯수 | 표 | h 빈도(자/h) | TOC | 본문 폰트(주요) | 점수 |
|---|---|---|---|---|---|---|---|---|
| tax/isa-guide.html | 10,831 | 19 | 30 | 1 | 570 ✅ | ✗ | 13.5~15px | **74** |
| index-investing.html | 9,887 | 28 | 32 | 2 | 353 ✅ | ✗ | 13.5~15px | **70** |
| cost/area-07-public-support.html | 28,284 | 76 | 9 | 16 | 372 ✅ | ✗ | 13.5~15px | **66** |
| tax-optimization.html | 9,936 | 17 | 27 | 1 | 584 ✅ | ✗ | 13.5~15px | **70** |
| ipo.html | 25,620 | 1 | 3 | 0 | 25,620 ✗ | ✗ | 카드 그리드형 | **48** |

\* `body` 영역 sed 추출 후 공백 정규화한 문자수(스크립트·CSS 제외).

채점 항목(각 20점): 폰트 크기·행간 / 단락 길이 / subheading 빈도 / 표·이미지 비율 / TOC·요약 박스.

| 페이지 | 강점 | 개선 필요 |
|---|---|---|
| isa-guide | h 빈도 양호, answer-box·lede·체크리스트 다채로움 ([isa-guide.html:248-257](C:/Users/USER/Projects/finance-coffee-chat/tax/isa-guide.html), [402-405](C:/Users/USER/Projects/finance-coffee-chat/tax/isa-guide.html)) | TOC 부재, 16px 본문 부재(answer-box만 16px), 읽기 시간 표시 없음 |
| index-investing | h28개로 분절 우수 | 문단 32개로 굵직, sticky TOC 부재, FAQ 9개 — speakable 미적용 |
| area-07-public-support | 표 16개로 데이터 밀도 高, FAQ 11개 | `<p>` 9개 — **표·li 위주**라 모바일 단락 흐름이 끊김. 본문 문맥 부족 |
| tax-optimization | 허브 페이지 답게 균형 | 17개 h에 27 p — h당 단락이 1.5개로 얇음 |
| ipo.html | — | **본문 거의 없음(h 1개·p 3개)**. 캘린더·카드 위주라 텍스트 SEO 거의 0 — 가독성 점수가 아닌 **콘텐츠 부재** 문제 |

> 평균 70점, 최저 48점. 표준 패턴의 `tax/isa-guide.html`도 **TOC·읽기시간·16px 본문**이 빠진 74점.

### 1-3. 카드뉴스·인포그래픽·쇼츠가 모바일 SEO에 미치는 영향

| 포맷 | 인덱싱 채널 | 모바일 SERP 진입 | 우리 사이트 적용성 |
|---|---|---|---|
| **카드뉴스** (이미지 시리즈) | 인스타그램·네이버 블로그 본문 첨부, Google은 alt만 인덱싱 | 직접 영향 弱(이미지 검색 슬롯) — 다만 **네이버 블로그 인플로우 大** | 시그널 채널 분리(SNS) |
| **인포그래픽** (단일 이미지) | Pinterest·이미지 검색 | 모바일 이미지 검색·Discover 진입 가능 | 비용 효율 高 |
| **Google Web Stories** | AMP 기반 구조화 콘텐츠 | 인도·미국·브라질만 캐러셀 노출, 한국은 미공식 — Discover만 가능 | **우선순위 낮음** |
| **YouTube Shorts + VideoObject schema** | YouTube + Google SERP 동영상 슬롯 | 9:16 비디오 슬롯·핵심 모먼트 인덱싱 가능 | 제작 부담 高 |

근거: 네이버는 시각 콘텐츠(이미지·영상·인포그래픽) 가중치 상승, 모바일 91% 의존. Web Stories 캐러셀은 한국 미지원, Top Stories·Discover만 노출 가능. YouTube Shorts는 **모바일 전용 9:16**에 schema timestamp로 SERP 모먼트 진입.

### 1-4. 카드뉴스·웹스토리 도입 ROI (5건 파일럿 기준)

| 항목 | 추정치 | 비고 |
|---|---|---|
| 카드뉴스 1세트(8장) 제작 시간 | 90~120분(템플릿 재사용 시 60분) | 디자인 60 + 카피 30 |
| 인스타그램·네이버 블로그 동시 배포 | 추가 15~20분 | 블로그 본문에 alt+주제어 삽입 |
| 도달 폭(가설) | 인스타 200~500 노출 / 블로그 10~30 일 노출 | 김선영 페르소나 점심·출퇴근 |
| 사이트 모바일 트래픽 환산 CTR | **2~5%** (블로그 → 사이트 링크) | 네이버 블로그 SEO 가이드 평균 |
| 5건 파일럿 총 비용 | 600분(10시간) | 외주 시 50~80만원 |
| 5건 파일럿 추정 모바일 유입 | **주 30~80 추가 클릭** | 평균 12.1위 → 카드뉴스 직접 클릭으로 우회 |

**적합 후보 5선 (제작 즉시 → 모바일 도달 효과 大)**:

1. **ISA 비과세 한도 비교** — 일반 200·서민 400·농어민 400 ([isa-guide.html:301-305](C:/Users/USER/Projects/finance-coffee-chat/tax/isa-guide.html))
2. **IRP 환급 시뮬레이션 표** — 총급여별 16.5% / 13.2% (`tax/irp-refund-guide.html`)
3. **4대 지수 ETF 보수 비교** — KODEX·TIGER 보수·추적오차 ([index-investing.html](C:/Users/USER/Projects/finance-coffee-chat/index-investing.html))
4. **6 가구 시나리오 지원금 매트릭스** — 청년·신혼·유자녀 ([area-07-public-support.html](C:/Users/USER/Projects/finance-coffee-chat/cost/area-07-public-support.html))
5. **공모주 4대 조건 등급 S~D** — 기관경쟁률·확약·유통물량 ([ipo.html](C:/Users/USER/Projects/finance-coffee-chat/ipo.html))

### 1-5. 표준 페이지 isa-guide.html 모바일 가독성 평가

**보유 모바일 강점**:
- Article + FAQPage(11개 문답) + speakable cssSelector ([isa-guide.html:198-219](C:/Users/USER/Projects/finance-coffee-chat/tax/isa-guide.html))
- 답변 박스(answer-box) 16px·강조 ([isa-guide.html:106](C:/Users/USER/Projects/finance-coffee-chat/tax/isa-guide.html), [248-251](C:/Users/USER/Projects/finance-coffee-chat/tax/isa-guide.html))
- 600px 미디어쿼리로 컨테이너 패딩 32→16px 축소 ([isa-guide.html:113](C:/Users/USER/Projects/finance-coffee-chat/tax/isa-guide.html))
- 시나리오 카드 그리드 모바일 1열 전환 ([isa-guide.html:71](C:/Users/USER/Projects/finance-coffee-chat/tax/isa-guide.html))

**부족한 모바일 요소**:
- TOC(목차) 부재 — 본문 10,800자로 권장선 1,000자 10배 초과인데도 항목 점프 동선 없음
- **본문 기본 폰트가 13.5~15px**로 16px 권장에 미달(answer-box·lede만 15~16px) ([isa-guide.html:75](C:/Users/USER/Projects/finance-coffee-chat/tax/isa-guide.html), [80](C:/Users/USER/Projects/finance-coffee-chat/tax/isa-guide.html), [100](C:/Users/USER/Projects/finance-coffee-chat/tax/isa-guide.html))
- 읽기 시간 표시(`timeRequired` schema·UI 배지) 부재 — 김선영 페르소나(점심 4분)에 최적화 미흡
- 모바일 sticky CTA(시뮬레이션 이동) 부재 — 페이지 끝 related 카드만 의존
- "한 줄 답변"이 모바일에서도 똑같은 길이(answer-text 1문장 90자) — 80자 권장 초과

---

## 2. 갭·원인 가설

| 갭 | 근거 | 가설 |
|---|---|---|
| 본문 폰트 13.5~15px | CSS 측정 (5개 페이지 공통) | "데스크톱 가독성 우선" 정책 → 모바일에서 한국어 자모가 뭉침 |
| TOC 0/27 페이지 | grep 결과 | 정적 HTML이라 JS 자동 TOC 미구현 |
| 카드뉴스·인포그래픽 0건 | 디렉터리 listing 확인 | 정적 사이트 + 1인 운영 → 시각자산 제작 부담 |
| 쇼츠/비디오 0건 | VideoObject 0 hits | 정책상 진입 안 함, 영상 schema 미적용 |
| `ipo.html` 본문 텍스트 결손 | h1·p3 | 도구형 페이지(캘린더) 콘셉트 → SEO 보강 텍스트 부족 |
| 읽기 시간 표시 0건 | grep `timeRequired` 0 | 페르소나 인지 후 미반영 |

---

## 3. 권고 액션 후보 (5개)

| # | 액션 | 효과(모바일 노출) | 비용 | 비고 |
|---|---|---|---|---|
| **A** | **본문 기본 폰트 16px·line-height 1.7로 글로벌 상향** (5개 표준 페이지 우선, 27 페이지 점진 적용) | 中 (이탈률↓·체류↑) | 低(CSS 1-2시간) | KCI·Material Design 근거 |
| **B** | **sticky 접이식 TOC 컴포넌트** 추가 (1,000자+ 페이지 18개) | 中-高 (스크롤 깊이↑) | 中(JS 80줄, 4-6시간) | wellows 권고 |
| **C** | **카드뉴스 5건 파일럿** (위 1-4 적합 후보) + 인스타·네이버 블로그 배포 | 高 (외부 인플로우, 주 30-80 클릭) | 中(10시간/외주 50-80만) | naver SEO 가중치 |
| **D** | **읽기 시간 배지 + `timeRequired` schema** (전 페이지 자동 계산 JS) | 中 (CTR·체류) | 低(2-3시간) | 김선영 점심 4분 페르소나 |
| **E** | **YouTube Shorts 5편 + VideoObject schema** (ISA·IRP·4대 지수·공모주 4대 조건·지원금 매트릭스) | 高 (모바일 동영상 슬롯) | 高(편당 3-5시간, 25시간) | 중장기, 6-8 사이클 외 검토 |

---

## 4. ICE 우선순위

| 액션 | Impact | Confidence | Ease | 점수(I·C·E) | 권고 |
|---|---|---|---|---|---|
| A 폰트 16px·행간 1.7 | 7 | 9 | 9 | **567** | 즉시 (이번 사이클) |
| D 읽기시간 배지+schema | 6 | 8 | 9 | **432** | 즉시 (이번 사이클) |
| B sticky TOC | 8 | 7 | 6 | **336** | 다음 사이클 |
| C 카드뉴스 5건 파일럿 | 9 | 6 | 5 | **270** | 6-9 사이클 — 외주 견적 후 |
| E YouTube Shorts 5편 | 9 | 6 | 3 | **162** | 6-12 사이클 (장기) |

**즉시 착수**: A + D 묶음 — CSS 글로벌 상향 + 읽기 시간 배지(JS 자동 계산). 표준 패턴 `isa-guide.html` 1차 적용 → 가독성 점수 74→90 목표.
**다음 사이클**: B(TOC 18개 페이지) — 0/27 갭 메우는 효과 大.
**파일럿(6-9)**: C 카드뉴스 5건 — 외주 견적 후 ROI 재산정. ISA 비과세 한도·6 가구 매트릭스부터.
**보류·재검토**: E 쇼츠 — 1인 운영 부담. AI 생성(예: 텍스트→영상 도구) 가능성 검토 후 6-12 사이클 재진입.

---

## 출처

- [Wellows — Content Readability in SEO 2026](https://wellows.com/blog/content-readability-in-seo/)
- [Vayce — Ideal Paragraph Length for Web Writing](https://vayce.app/blog/ideal-paragraph-length-for-web-writing/)
- [UXPin — Optimal Line Length for Readability 2026](https://www.uxpin.com/studio/blog/optimal-line-length-for-readability/)
- [USWDS Typography](https://designsystem.digital.gov/components/typography/)
- [Material Design — Typography](https://m1.material.io/style/typography.html)
- [KCI — 모바일 텍스트 한글 폰트 가독성 향상 연구(Noto Sans KR)](https://journal.kci.go.kr/jksci/archive/articleView?artiId=ART002987878)
- [Upward Engine — Ultimate Guide to Content Readability for SEO](https://upwardengine.com/blog/content-readability-guide-seo/)
- [InterAd — Naver SEO Complete Guide 2025](https://www.interad.com/en/insights/naver-seo-guide)
- [Brodie Clark — Google Web Stories Mobile Carousel Availability](https://brodieclark.com/visual-stories-unit-web-stories/)
- [Aiimstorms — SEO for Web Stories: Worth It in 2025?](https://aimstorms.com/seo-for-web-stories/)
- [VdoCipher — Video SEO Best Practices 2026](https://www.vdocipher.com/blog/video-seo-best-practices/)
- [Advanced Web Ranking — Google CTR Stats Q3 2025](https://www.advancedwebranking.com/blog/ctr-google-2025-q3)
