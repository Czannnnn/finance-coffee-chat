# Finance Coffee Chat

## 프로젝트 개요
투자 정보 플랫폼 — 공모주 청약 캘린더/분석, 포트폴리오 자산배분, 자산관리 교육 콘텐츠.
URL: https://www.financecoffeechat.com

## 기술 스택
- **프론트엔드:** Static HTML + vanilla JS + CSS (빌드 도구 없음, 프레임워크 없음)
- **차트:** Chart.js 4.4.1 (CDN)
- **데이터:** Google Sheets (gviz/tq API, CORS 프리)
- **공시 동기화:** Google Apps Script (DART OpenDart API document.xml → Google Sheets, 일 4회 자동. 보조 공시 출처는 백엔드 fetch에 한정해 사용하며, 공개 페이지·메타·schema에는 노출하지 않음)
- **배포:** Vercel (정적 사이트, git push → 자동 배포)
- **분석:** Google Analytics 4 (G-ZZEG7YQ80S)

## 프로젝트 구조
```
index.html          → 홈페이지 (4개 기능 카드 + 네비게이션)
portfolio.html      → 포트폴리오 자산배분 차트 (Chart.js 도넛)
asset.html          → 자산관리 101 (교육 콘텐츠)
ipo.html            → 공모주 청약 캘린더 (월간 그리드 + 카드 리스트)
ipo-analysis.html   → 공모주 분석 (4대 조건 등급 S/A/B/C/D)
ipo-guide.html      → 공모주 청약 가이드 (단계별 튜토리얼)
scripts/ipo-scraper-v2.gs → DART OpenDart API document.xml 동기화 + 보조 공시 보강 Google Apps Script (백엔드 전용)
robots.txt, sitemap.xml, favicon.svg, og-image.png → SEO 자산
```

## 데이터 소스
- **Google Sheets ID:** 1_xXYdZ5d8COXBajVZ_tyd2p5JaOhQcQnNPQrS9-e-Jk
- **시트명(현행):** normalized (P2 이후 운용. 레거시 IPO데이터 시트 1주 병행 후 중단)
- **공개 출처(사용자 노출):** DART OpenDart API document.xml 정정신고서 본문 — 모든 공개 페이지(HTML body·meta·JSON-LD·llms.txt·byline·footnote)에서 DART 단일 출처로만 표기
- **백엔드 보조 공시 fetch:** 공개 공시 페이지의 청약 캘린더·시초가 데이터를 일부 보조 fetch하여 결측치 채움 용도로만 사용. 공개 페이지에는 명시하지 않음(법적 보호 차원 — 사용자 정책 2026-05-10 결정)
- **갱신 주기:** 일 4회(06:00·08:00·16:00·18:00 KST, Apps Script 트리거)
- **폴백:** SHEET_ID 미설정 시 하드코딩된 샘플 데이터 사용

## 디자인 시스템 (커피 테마)
- CSS 변수: --espresso, --dark-roast, --medium-roast, --caramel, --cream, --oat-milk
- 시맨틱 색상: --green (수익), --blue (정보), --red-soft (경고)
- 폰트: Noto Sans KR + Playfair Display
- 반응형: 600px 브레이크포인트

## SEO (2026-04-19 Cycle 5 Q2 최신)
- 전 페이지: meta description, OG tags, Twitter Card, canonical, JSON-LD, keywords
- robots.txt + sitemap.xml + favicon.svg + og-image.png (새 브랜드 로고 반영) + logo.svg
- Organization JSON-LD logo 필드 적용 (Knowledge Panel·AEO용)
- Google Search Console 등록 완료 (도메인 Property: financecoffeechat.com, DNS TXT 검증)
- Naver Search Advisor 등록 완료 (https://www.financecoffeechat.com, HTML 메타 태그 검증)
- 도메인: https://www.financecoffeechat.com (Primary) · apex·vercel.app 301/308 리다이렉트
- 푸터 contact: hello@financecoffeechat.com (Cloudflare Email Routing, click_contact_email GA 이벤트)

## IPO 분석 4대 조건
1. 기관 경쟁률 (높을수록 유리)
2. 확정 공모가 위치 (밴드 상단 = 수요 강함)
3. 의무보유확약 비율 (높을수록 매도 압력 적음)
4. 유통가능물량 비율 (낮을수록 수급 유리)

## 노션 연동
- AI프로젝트 > finance-coffee-chat 관련 노션 페이지에 기록
- `/notion-sync` 스킬로 수동 동기화

## 주의사항
- HTML 파일 직접 수정 (빌드 과정 없음)
- 한글 경로 bash에서 작은따옴표 사용: `'G:\내 드라이브\...'`
- IPO 분석 내용에 투자 추천 표현 절대 금지 (면책 고지 필수)
- 보조 공시 fetch는 EUC-KR 인코딩 — Apps Script의 fetchAsEucKr() 사용 (백엔드 전용, 공개 페이지 노출 금지)
- **출처 표기 규칙(중요)**: 모든 공개 페이지·메타·JSON-LD·llms.txt에서는 **DART OpenDart 단일 출처**로만 명시. 보조 공시 fetch 명시는 절대 금지(법적 보호 차원, 사용자 정책 2026-05-10 결정)
