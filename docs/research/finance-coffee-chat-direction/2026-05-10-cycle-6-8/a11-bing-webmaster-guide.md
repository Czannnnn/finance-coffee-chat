# A11-3 — 빙 웹마스터 등록 가이드 (2026-05-10)

사이클 6-8 권고 액션 A11의 마지막 항목. MCP 서버(`bing-webmaster`)가 본 세션에서 spawn 에러로 차단되어 사용자 수동 등록 가이드로 우회.

## 1. 등록 상태 확인 우선

본 사이트의 빙 웹마스터 등록 여부가 메모리에 명시되어 있지 않음. 먼저 다음 단계로 확인:

### 1-1. 빙 웹마스터 접속
- URL: https://www.bing.com/webmasters
- 로그인: Microsoft 계정 (사용자가 보유한 한 개 사용)

### 1-2. 사이트 목록 확인
- 좌측 상단 사이트 드롭다운 클릭
- `https://www.financecoffeechat.com` 또는 `financecoffeechat.com` 등록 여부 확인

## 2. 미등록인 경우 — 신규 등록 (3분)

### 2-1. 사이트 추가
- 우측 상단 "+사이트 추가" 클릭
- URL 입력: `https://www.financecoffeechat.com`

### 2-2. 소유 확인 (3가지 방법 중 택1, **방법 3 추천**)
| 방법 | 절차 | 소요 |
|------|------|------|
| 1. XML 파일 업로드 | BingSiteAuth.xml 다운로드 → 사이트 루트에 업로드 → Vercel 배포 | 10분 |
| 2. HTML 메타 태그 | `<meta name="msvalidate.01">` 추가 → 배포 | 10분 |
| **3. GSC 가져오기 (추천)** | "Google Search Console에서 가져오기" 버튼 → OAuth 동의 → 자동 검증 | **30초** |

방법 3은 본 사이트가 이미 GSC 도메인 Property 등록 완료(2026-04-19)이므로 즉시 가능.

### 2-3. 사이트맵 제출
- 좌측 메뉴 "사이트맵" → "사이트맵 제출"
- URL 입력: `https://www.financecoffeechat.com/sitemap.xml`
- "제출" 클릭

### 2-4. URL 검사·제출 (선택, 효과 큼)
- "URL 제출" 메뉴
- 5표준 페이지 + 4 답변박스 페이지 9개 일괄 제출:
  ```
  https://www.financecoffeechat.com/
  https://www.financecoffeechat.com/ipo
  https://www.financecoffeechat.com/ipo-analysis
  https://www.financecoffeechat.com/ipo-guide
  https://www.financecoffeechat.com/index-investing
  https://www.financecoffeechat.com/tax/isa-guide
  https://www.financecoffeechat.com/tax/pension-irp-comparison
  https://www.financecoffeechat.com/cost/area-02-credit-cards
  https://www.financecoffeechat.com/tax-optimization
  ```
- 일일 할당량: 10건(소형 사이트). 잔여 23건은 D+1 이후 추가

## 3. 이미 등록된 경우 — 상태 확인

### 3-1. 색인 상태
- 좌측 "색인 카운트" 확인 → 색인 페이지 수 추세 확인

### 3-2. 사이트맵 상태
- "사이트맵" 메뉴 → 제출된 sitemap의 처리 상태 확인

### 3-3. 검색 성능
- "검색 성능" → 노출/클릭/평균순위 확인 (Bing은 한국 검색 시장 약 1~2%이나 측정 가치 있음)

## 4. 자동화 (사이클 6-9 이상에서)
- `bing-webmaster` MCP 서버 정상 작동 시 본 작업을 자동화 가능
- MCP 서버 명령: `mcp__bing-webmaster__add_site`, `mcp__bing-webmaster__submit_sitemap`, `mcp__bing-webmaster__submit_url_batch`
- 향후 세션에서 MCP 정상화 후 자동 적용 권고

## 5. 검증 (D+7, 2026-05-17)
- Bing Webmaster > 검색 성능 → 노출 수 확인 (목표: 노출 10+)
- 색인 카운트: 목표 5+ 페이지

## 6. 우선순위
빙 점유율은 한국 모바일 검색 시장 1~2%로 작지만:
- ChatGPT·Copilot이 Bing 인덱스를 사용 → AI 검색 가시성 확대
- A11 ICE 540 (6-8-E팀 결론, 0.5h 작업) — quick-win

따라서 사용자 우선 작업으로 권고. 30분 이내 완료 가능.
