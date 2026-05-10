# A12 — 네이버 색인 부진 진단 + 카톡 OG 검증 + GA4 메신저 referrer 가이드 (2026-05-10)

사이클 6-8 권고 액션 A12의 코드 외 진단·가이드 통합 문서.

## A12-1 — 네이버 서치어드바이저 색인 부진 진단

### 1. 등록 타임라인 (스크린샷 기준)
- **사이트 등록**: 2026-04-19 (소유 확인 완료, `https://www.financecoffeechat.com`)
- **사이트맵 제출**: 2026-04-19 14:32:02 (`sitemap.xml`)
- **수동 URL 수집 요청 9건**: 2026-04-19 14:33~14:34
  - `/`, `/ipo`, `/ipo-analysis`, `/ipo-guide`, `/portfolio`, `/asset`, `/index-investing`, `/tax-optimization`, `/cost-optimization`
- **robots.txt 인식**: 2026-05-09 21:10 (네이버 Yeti 크롤러 Allow 정상 확인)

### 2. 현재 상태 (2026-05-10 기준 약 D+21)
| 항목 | 값 | 상태 |
|------|-----|------|
| 색인된 페이지 | **1건** (홈만 추정) | RED |
| 수집제한 | **1건** | YELLOW (원인 미확정) |
| 색인제외 | 0건 | GREEN |
| SEO 진단 | 0건 | GREEN |
| 콘텐츠 노출/클릭 | 정보 없음 | RED (노출 0) |
| 콘텐츠 확산(백링크) | 정보 없음 | RED (백링크 0) |

### 3. 원인 가설 (3가지)
1. **수동 등록 URL 9건만 — sitemap의 31건 중 22건은 네이버 크롤이 미발견** (sitemap을 제출했음에도 자동 크롤 진행 매우 느림 — 신생 도메인 + 네이버 크롤 우선순위 정책)
2. **수집제한 1건의 정체 불명** — 사이트 진단 페이지에서 어떤 URL인지 식별 필요. canonical 또는 robots 정책으로 차단된 페이지일 가능성
3. **신생 도메인 권위 갭** (사이클 6-8-C 결론: DA 8~12) — 네이버 자체 검증 기간 통상 4~12주, 본 사이트는 D+21이므로 정상 범위 내. 추가 액션 없으면 D+60(2026-06-19)까지 색인 진행 지연 예상

### 4. 즉시 권고 액션 (사용자 수동 작업)
1. **남은 22개 URL 수동 등록** (네이버 서치어드바이저 → 요청 → 웹 페이지 수집)
   - `/index-simulation`, `/tax-simulation`, `/cost-simulation`
   - `/ipo-today`, `/ipo-this-week`, `/ipo-live`
   - `/tax/isa-guide`, `/tax/irp-refund-guide`, `/tax/pension-irp-comparison`
   - `/cost/s1-youth-single`~`/cost/s6-mid-single` (6건)
   - `/cost/area-01-year-end-tax`~`/cost/area-08-transport` (8건)
2. **수집제한 1건 원인 확인**: 사이트 진단 → 유형별 진단 정보 → "수집제한" 클릭하여 URL 식별 → 원인 파악(robots, canonical, 4xx/5xx 등)
3. **RSS 제출** (요청 → RSS 제출 메뉴): 현재 사이트는 RSS feed 없음 — 향후 사이클에서 RSS 발행 시 추가 등록 가치 있음 (보류)
4. **간단체크** 메뉴: 주요 URL 입력 후 빠른 진단 실행 (1주 1회)

### 5. D+30 (2026-06-09) 재점검 트리거
- 색인 페이지 수: 1 → 15+ 도달 시 GREEN
- 콘텐츠 노출/클릭 데이터 발생 여부 확인
- 미달 시 사이클 6-9에서 네이버 블로그 1건 신규 운영(BL-NBL-1) 부분 승격 검토

---

## A12-2 — 카카오톡 OG 27페이지 일관성 검증 (코드 레벨)

### 1. Grep 검증 결과 (2026-05-10)
| 태그 | 보유 페이지 수 | 누락 |
|------|--------------|------|
| `og:title` | **32/32** | 0 |
| `og:description` | **32/32** | 0 |
| `og:image` | **32/32** | 0 |
| `og:type` | **32/32** | 0 |
| `og:locale` (ko_KR) | **32/32** | 0 |
| `og:site_name` | **32/32** | 0 |

**결론**: 32개 SEO 대상 페이지 모두 OG 6태그 일관 보유 — **코드 레벨 100% 양호**.

### 2. 사용자 수동 검증 권고 (카카오 디버거)
카카오톡 미리보기는 코드만으로 판정 불가 — 카카오 자체 OG 캐시 정책 영향.

| 단계 | 작업 |
|------|------|
| 1 | 카카오 디벨로퍼 OG 디버거 접속: https://developers.kakao.com/tool/clear/og |
| 2 | 5표준 페이지 우선 입력 후 미리보기 확인 (홈, isa-guide, ipo, index-investing, area-02) |
| 3 | "캐시 초기화" 클릭하여 최신 OG 정보 강제 갱신 |
| 4 | 미리보기 이미지 1200×630 권장 비율 만족 여부 확인 |
| 5 | 32페이지 전체는 D+14에 batch 검증 |

### 3. og:image 사이즈 권장 검증
- 사이트 표준: `og-isa-guide.png?v=2026-04-30` 등 페이지별 OG 이미지
- 카카오 권장: 1200×630 (또는 800×400 이상)
- **확인 필요**: 각 og:image 실측 사이즈 — 향후 사이클에서 자동화 스크립트(Python + Pillow) 추가 권고

---

## A12-3 — GA4 메신저 referrer 분류 가이드

### 1. 문제 정의
- 카카오톡·라인·페이스북 메신저로 공유된 링크 클릭은 **GA4에서 (direct) 또는 (other)로 분류**
- 한국 모바일 트래픽의 핵심 채널인 메신저 트래픽이 측정에서 누락
- 사이클 6-8 페르소나 김선영의 1차 검색 동선이 이 채널이라 추정됨

### 2. GA4 커스텀 채널 그룹 생성 (사용자 admin 작업)
**경로**: GA4 > Admin > Property settings > Data display > **Channel groups** > Create channel group

#### 채널 그룹 이름
"FCC Mobile Channels" (Property 531235095 전용)

#### 신규 채널 정의 5개

| # | 채널명 | 조건 (OR) | 우선순위 |
|---|--------|---------|---------|
| 1 | **KakaoTalk** | `Source` matches regex `^(kakao\|kakaotalk\|talk\.kakao\|m\.kakao)` | 1 |
| 2 | **LINE** | `Source` matches regex `^(line\|line\.me)` | 2 |
| 3 | **Messenger** | `Source` matches regex `^(m\.facebook\|l\.facebook\|fb\.me\|messenger\.com)` | 3 |
| 4 | **Naver Blog** | `Source` matches regex `^(blog\.naver\|m\.blog\.naver\|naver\.me)` | 4 |
| 5 | **Naver Cafe** | `Source` matches regex `^(cafe\.naver\|m\.cafe\.naver)` | 5 |

기존 표준 채널(Organic Search, Direct, Referral 등)을 신규 채널 다음 우선순위로 유지.

### 3. 추가 측정 도구 (선택)
- **GA4 커스텀 측정기준 `messenger_share`**: 페이지 footer의 share 버튼 클릭 이벤트에 `share_method` 파라미터 추가
- **UTM 표준화**: 메신저 공유 시 자동 UTM 추가 — 본 사이트는 share 버튼 미보유, 향후 사이클에서 도입 검토

### 4. 검증 방법
- D+7 (2026-05-17) GA4 보고서: Acquisition → Channel groups에서 **KakaoTalk** 채널 노출 여부 확인
- D+30 (2026-06-09) 분석: 메신저 채널 합산 트래픽이 전체 모바일 세션의 몇 %인지 측정

### 5. 한계
- **카카오톡 인앱 브라우저 referrer 누락 가능성**: 일부 카카오톡 인앱 브라우저는 referrer 헤더를 제거하므로 GA4가 (direct)로 분류
- 보완: 카카오톡 인앱 클라이언트 식별(`User-Agent` 'KAKAOTALK' 포함)을 GA4 커스텀 측정기준으로 캡처 → 별도 가이드 필요(다음 세션)

---

## 종합 결론

| 항목 | 상태 | 다음 액션 |
|------|------|----------|
| A12-1 네이버 색인 | RED (1/32) | 사용자 22개 URL 수동 등록, 수집제한 1건 원인 확인 |
| A12-2 카톡 OG (코드) | GREEN (32/32) | 카카오 디버거 캐시 초기화 (5페이지 우선) |
| A12-3 GA4 referrer | YELLOW (미설정) | GA4 admin 커스텀 채널 그룹 생성 |

본 진단 결과는 사이클 6-8 노션 페이지(`35cffe0bd4b781c88637c6330c7c7874`) 7섹션과 final-report 5섹션 권고 A12에 매핑됨. 다음 점검: D+7(2026-05-17), D+14(2026-05-24), D+30(2026-06-09).
