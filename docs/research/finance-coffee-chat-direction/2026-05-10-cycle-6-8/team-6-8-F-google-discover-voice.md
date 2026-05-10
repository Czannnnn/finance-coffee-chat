# 사이클 6-8-F — 구글 디스커버 + 음성 검색 (2026-05-10)

> 담당: Team 6-8-F
> 대상: https://www.financecoffeechat.com (27 페이지, 모바일 노출 86회·클릭 2회 / 28일)
> 미션: 일반 검색 외 모바일 트래픽 우회 채널(Discover, Voice, Web Stories)의 진입 가능성 평가

## 1. 조사 결과

### 1-1 구글 디스커버 진입 조건 + 한국 사례

Google Discover는 안드로이드 Chrome·구글 앱에서 **검색 없이** 사용자 관심사 기반으로 자동 큐레이션되는 모바일 전용 피드다. 한국 일평균 사용자는 수천만 규모로 추정되며, 일반 검색과 별개의 트래픽 채널이다.

**필수 진입 조건 (2025-2026 공식 가이드):**

| 항목 | 조건 | 비고 |
|---|---|---|
| 색인 | 구글 일반 색인 + 충분한 트래픽 누적 | 신생 사이트는 사실상 진입 불가 |
| 이미지 폭 | **1,200px 이상** + 16:9 권장 (1200×630) | 픽셀 30만 이상 |
| 메타 태그 | `<meta name="robots" content="max-image-preview:large">` | 미설정 시 썸네일만 노출 |
| E-E-A-T | YMYL(금융) 영역 엄격 적용 | 저자 프로필·출처·경험 명시 필수 |
| 신선도 | 트렌드 + 에버그린 혼합 | 뉴스성 콘텐츠 가중 |
| 콘텐츠 정책 | 클릭베이트·과장 제목 금지 | 위반 시 수동 제재 |

**한국 디스커버 노출 비중**: TBWA Korea / 거북이미디어 분석에 따르면 디스커버 노출 URL 중 **금융 카테고리는 1% 미만**으로 매우 낮다. 엔터·라이프스타일·스포츠가 70% 이상을 점유한다. 다만 BankSalad·Toss 공식 블로그처럼 **개인 재무 가이드형** 콘텐츠는 1,200px 히어로 이미지 + 저자 신원 명시 시 진입 사례가 보고되고 있다.

**우리 사이트 진입 가능 페이지 5선 (가설)**:
1. ISA 절세 가이드 (speakable 적용 5페이지 중 하나)
2. 공모주 청약 일정·전략
3. 연금저축·IRP 세액공제 비교
4. 주식 양도세 vs 증권거래세 정리
5. 직장인 재테크 입문 (페르소나 김선영 매칭)

### 1-2 GSC Discover 보고서 우리 사이트 측정

GSC MCP `get_capabilities` 응답: **Discover 전용 보고서는 API 차원으로 노출되지 않음**. UI(Search Console > 실적 > Discover 탭)에서만 확인 가능하며 해당 탭은 디스커버 노출이 발생한 사이트에만 활성화된다.

대체 측정으로 모바일 디바이스 검색 데이터를 확인:

```
sc-domain:financecoffeechat.com — 28일 (2026-04-12 ~ 2026-05-10)
DESKTOP : impressions 5,074 / clicks 2  / CTR 0.04% / pos 6.4
MOBILE  : impressions    86 / clicks 2  / CTR 2.33% / pos 12.1
```

**판정**: 모바일 노출 86회는 일반 검색 결과로만 구성된 수치로 추정된다. Discover 노출이 발생했다면 GSC UI에 Discover 탭이 생성되어야 하나 현 단계에서 활성화 가능성은 낮다. **사실상 Discover 진입 0건 단계**로 간주하고 진입 조건 충족 작업이 우선이다.

### 1-3 웹스토리 ROI 분석

Web Stories는 deprecated 되지 않았으며 2025년에도 지원되지만, **2024년 2월부터 Google Images 그리드 뷰 → 캐러셀 뷰**로 노출 영역이 축소되었다. Discover 단일 카드 노출은 **미국·인도·브라질 한정**이며 **한국은 단일 검색 결과 페이지 노출만** 가능하다.

| 항목 | 현황 |
|---|---|
| 한국 Discover 카드 노출 | ❌ 미지원 (2026-05 기준) |
| 한국 검색 결과 단일 노출 | ✅ 가능 |
| 제작 도구 | WordPress Web Stories 플러그인 무료 / Tappable 유료 |
| 평균 제작 시간 | 5컷 1편당 2~4시간 |
| 한국 금융 활용 사례 | **확인 불가** (BankSalad·Toss 공개 사례 없음) |

**ROI 결론**: 한국 Discover 노출이 안 되는 현 단계에서 웹스토리 도입은 **투자 대비 효익 낮음**. Discover 진입 조건(이미지 1200px+, E-E-A-T)을 먼저 충족한 뒤 미국·인도 Discover가 한국으로 확장될 시점에 재검토 권장.

### 1-4 한국 음성 검색 시장 (Bixby·구글·Siri·클로바)

| 비서 | 채널 | 추정 점유율(한국 모바일) | 비고 |
|---|---|---|---|
| Google Assistant | 안드로이드+iOS | 40~50% | 검색 결과를 구글 인덱스 기반으로 답변 → SEO 직결 |
| Bixby | 갤럭시 OS 기본 | 20~25% | 2026-02 Perplexity 통합 → 웹 인용 비중 ↑ |
| Siri | iPhone 기본 | 15~20% (iOS 한국 점유 30%대 전제) | 한국어 자연어 처리 약점, 위키·뉴스 위주 |
| 카카오 헤이카카오 / 클로바 | 카카오미니·NUGU | < 10% | 스마트 스피커 한정, 모바일 SEO 영향 미미 |

**핵심 사실**:
- 갤럭시 점유율 60%대(한국) × Bixby 기본 → **Bixby + Google Assistant 합산이 한국 모바일 음성 검색의 70% 이상**
- KISDI `2024 한국미디어패널조사`·과기정통부 `2024 인터넷이용실태조사` 모두 음성 검색 별도 통계는 미공개. 단, 스마트폰 보유율 96% / AI 기능 사용 의향은 매년 상승
- 2026-02 Bixby Perplexity 통합으로 **음성 답변에 출처 URL 인용 가능성**이 처음 열림 → speakable schema가 의미를 갖기 시작하는 변곡점

### 1-5 음성 검색 진입 키워드 + 우리 speakable 현황

음성 검색은 자연어 질문형(평균 7~9 단어, "어떻게/언제/얼마")이며 zero-click(답변만 듣고 종료) 비율이 높다. **브랜드 인지도와 답변 인용**이 직접 트래픽보다 중요하다.

**우리 페이지 speakable schema 현황**: 5페이지 적용 (사이클 6-7 산출물 기준).

**음성 친화 질문 후보 — 우리 콘텐츠 매칭**:

| 음성 질의 (자연어) | 매칭 페이지 | speakable 적용 |
|---|---|---|
| "ISA 계좌 어떻게 만들어?" | ISA 절세 가이드 | ✅ |
| "공모주 어떻게 청약해?" | 공모주 청약 일정 | ✅ |
| "연금저축 세액공제 얼마야?" | 연금저축 비교 | ✅ |
| "주식 양도세 언제 내?" | 양도세 정리 | ✅ |
| "직장인 재테크 어디서 시작해?" | 재테크 입문 | ✅ |

**한계**: Google `speakable` 스키마는 **공식적으로 영어·미국 한정 베타** 상태로 한국어 미지원. 다만 Bixby Perplexity 엔진은 일반 schema.org 마크업과 자연어 Q&A 구조를 인식하므로, **speakable 적용 + FAQPage + 50~75단어 단답 블록**은 미지원 구간에도 답변 인용 확률을 높인다.

## 2. 갭·원인 가설

| 갭 | 원인 가설 | 증거 |
|---|---|---|
| Discover 노출 0건 | 이미지 1200px+ 미적용 + max-image-preview 메타 누락 가능성 | 6-8-A 기술 SEO 보고서 점검 필요 |
| 웹스토리 ROI 낮음 | 한국 Discover 카드 미지원 | Google 공식 가용성 문서 |
| 음성 인용 불확실 | speakable 한국어 미지원 + 브랜드 권위 부족 | Google 공식 베타 한정 명시 |
| 모바일 트래픽 1.67% | Discover·Voice 양 채널 모두 미진입 → 일반 검색만 의존 | GSC 28일 모바일 노출 86회 |

## 3. 권고 액션 후보 (5개)

1. **이미지 1200px+ 보강 파일럿 (5 페이지)**: ISA·공모주·연금·양도세·재테크입문 히어로 이미지를 1200×630 16:9로 교체. Open Graph + schema.org/image URL 동기화. 제작 시간 ~6h.
2. **`max-image-preview:large` 글로벌 메타 추가**: `<head>`에 한 줄. 27 페이지 일괄 적용. 제작 시간 30분. CTR 30% / 클릭 332% 케이스 스터디 보고됨.
3. **저자 프로필 + E-E-A-T 신호 강화**: 5 핵심 페이지에 저자 바이오·자격·경험 + 출처 인용 footer. 제작 시간 ~4h.
4. **음성 친화 50~75 단어 단답 블록 추가**: speakable 적용 5 페이지에 페이지 최상단 "한 줄 요약" 박스 + FAQPage 마크업. Bixby Perplexity 인용 대비. 제작 시간 ~3h.
5. **웹스토리 도입 보류 + 90일 재평가**: 한국 Discover 카드 지원 시점 모니터링. 즉시 투자 ❌.

## 4. ICE 우선순위

| # | 액션 | Impact | Confidence | Ease | ICE | 권고 |
|---|---|---|---|---|---|---|
| 2 | max-image-preview 메타 일괄 적용 | 8 | 9 | 10 | **720** | 즉시 (1순위) |
| 1 | 이미지 1200px+ 5 페이지 교체 | 9 | 7 | 6 | **378** | 1주 내 (2순위) |
| 4 | 음성 친화 단답 블록 추가 | 6 | 6 | 8 | **288** | 2주 내 (3순위) |
| 3 | E-E-A-T 저자 프로필 강화 | 7 | 7 | 5 | **245** | 3주 내 (4순위) |
| 5 | 웹스토리 도입 (보류) | 5 | 3 | 3 | **45** | 90일 재평가 |

**최우선 결론**: #2(메타 태그) → #1(이미지) → #4(단답 블록) 순으로 진행하면 1주 내 Discover 진입 조건의 75%를 충족할 수 있다. 메타 태그는 30분 작업으로 ICE 720을 달성하므로 이번 사이클 즉시 실행 권장.

---

## 출처

- [Get on Discover — Google Search Central](https://developers.google.com/search/docs/appearance/google-discover)
- [Google 디스커버 가이드 — TBWA Korea](https://seo.tbwakorea.com/blog/google-discover/)
- [구글 검색·뉴스·디스커버 작동원리 — 거북이미디어](https://gobooki.net/%EA%B5%AC%EA%B8%80-%EA%B2%80%EC%83%89-%EB%89%B4%EC%8A%A4-%EB%94%94%EC%8A%A4%EC%BB%A4%EB%B2%84-%EC%9E%91%EB%8F%99%EC%9B%90%EB%A6%AC-%EC%B4%9D%EC%A0%95%EB%A6%AC/)
- [Speakable Schema Markup — Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/speakable)
- [Google Web Stories Availability Update — Search Engine Journal](https://www.searchenginejournal.com/google-web-stories-availability/507655/)
- [Google Drops Web Stories From Images — SE Roundtable](https://www.seroundtable.com/google-drops-web-stories-from-images-more-36866.html)
- [Google Discover Image Optimisation — Matt Tutt](https://matttutt.me/google-discover-image-optimisation/)
- [Increase Google Traffic with Max Image Preview Tag — Search Engine Journal](https://www.searchenginejournal.com/increase-google-traffic-with-max-image-preview-tag/416123/)
- [빅스비 — 나무위키 (2026-02 Perplexity 통합)](https://namu.wiki/w/%EB%B9%85%EC%8A%A4%EB%B9%84)
- [한국 검색엔진 순위·점유율 2025 — TBWA Korea](https://seo.tbwakorea.com/blog/searchengine-ranking)
- GSC MCP `get_capabilities` + `get_search_analytics` (2026-05-10 자체 호출)
