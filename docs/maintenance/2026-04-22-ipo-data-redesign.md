---
date: 2026-04-22
type: design-doc
scope: ipo-data-pipeline
status: in-progress
related_plan: 2026-04-22-ipo-calendar-fix.md
---

# 공모주 데이터 소스 재설계 (P2) — 설계 문서

> **목표**: 38.co.kr 스크래핑 단일 의존 구조를 폐기하고, DART 전자공시를 1차 공식 원천으로 삼는 다층 파이프라인으로 전환. 스팟체크에서 확인된 파싱 실패(`의무보유확약=0.00%` 고착, 유통가능물량·경쟁률·확정공모가 공란)를 근본 해소.

## 1. 현재 파이프라인 (Before)

```
38.co.kr (EUC-KR, HTML) ─→ Apps Script regex ─→ Google Sheets (IPO데이터 60행) ─→ gviz ─→ ipo.html
```

**문제점**:
- 38.co.kr 페이지 구조 변경에 취약 (현재 발생한 증상의 직접 원인)
- EUC-KR 디코딩·정규식 브리틀
- 60행 중 10행만 유효 (상장 완료건 누적 + 청약시작일 공란 다수)
- 4대 팩터 중 3개(확약·유통·경쟁률)가 시트 저장 단계에서 이미 손실
- 파싱 실패를 감지할 수 없음 (조용히 빈 값 저장)

## 2. 새 파이프라인 (After)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1차 원천 (공식·안정)                                             │
│   DART OpenAPI list.json (C001 증권신고)  ─┐                     │
│   DART OpenAPI document.xml (투자설명서) ──┤                     │
│   KIND 한국거래소 상장공시 (HTML)         ──┤                     │
│                                             │                    │
│ 2차 원천 (보조)                             │                    │
│   38.co.kr (기관수요예측 경쟁률 등)       ──┤                    │
└─────────────────────────────────────────────┼────────────────────┘
                                              ↓
                       ┌─────────────────────────────┐
                       │   raw_dart  | raw_kind | raw_38    │
                       │   (개별 시트 - 원천별 무결성 보존) │
                       └─────────────────────────────┘
                                              ↓
                       ┌─────────────────────────────┐
                       │   normalized (통합 + 정규화) │
                       │   · 종목 ID (DART corp_code) │
                       │   · 4대 팩터 표준화         │
                       │   · 상태(today 기준 재계산) │
                       │   · 신뢰도 플래그           │
                       └─────────────────────────────┘
                                              ↓
                       ┌─────────────────────────────┐
                       │   archive (상장 완료 6개월) │
                       └─────────────────────────────┘
                                              ↓
                          gviz → ipo.html (loadFromNormalizedSheet)
```

## 3. DART OpenAPI 사용 요약

**엔드포인트**: `https://opendart.fss.or.kr/api/list.json`

**IPO 관련 호출 파라미터**:
```
crtfc_key={발급받은_API_키}
bgn_de=YYYYMMDD     // 조회 시작일
end_de=YYYYMMDD     // 조회 종료일
pblntf_ty=C         // 발행공시
pblntf_detail_ty=C001  // 증권신고(지분증권) = IPO 증권신고서
page_no=1
page_count=100
```

**반환 예시 구조**:
```json
{
  "status": "000",
  "message": "정상",
  "page_no": 1, "page_count": 100, "total_count": ..., "total_page": ...,
  "list": [
    {
      "corp_code": "00126380",
      "corp_name": "매드업",
      "stock_code": "",
      "report_nm": "[증권신고서(지분증권)]",
      "rcept_no": "20260321000123",
      "rcept_dt": "20260321",
      ...
    }
  ]
}
```

**이어지는 세부 조회**:
- `document.xml?crtfc_key=...&rcept_no=...` → 투자설명서 본문 ZIP(XML)에서 다음 파싱:
  - 공모가(확정·희망 밴드)
  - 총 공모주식수
  - 기관별 의무보유확약 내역 (3M/6M/1Y 구분)
  - 유통가능 주식수 및 비율
  - 청약기일·환불일·상장예정일 (기재 시점에 따라 정정 공시에 반영됨)
  - 주관회사 (대표/공동)

**인증키 발급 절차** (사용자 작업):
1. https://opendart.fss.or.kr 접속 → "인증키 신청/관리"
2. 이메일·이름·전화번호·사용목적(개인) 입력 → 이메일 인증 → 40자 key 발급
3. key를 Apps Script Properties Service에 저장:
   ```js
   PropertiesService.getScriptProperties().setProperty('DART_API_KEY', '...');
   ```
4. 일일 한도: 20,000건 (IPO 용도 하루 10~20회 호출 수준이면 여유)

## 4. 새 Google Sheets 스키마

### 시트 1: `raw_dart` (DART 원시 데이터)
| 컬럼 | 설명 |
|------|------|
| corp_code | DART 고유번호 (PK) |
| corp_name | 공시상 회사명 |
| rcept_no | 접수번호 |
| rcept_dt | 접수일 (YYYYMMDD) |
| report_nm | 보고서명 |
| report_type | C001 증권신고 / C002 정정 / etc |
| confirmed_price | 확정 공모가 (정정 반영 최신) |
| band_low | 희망가 하단 |
| band_high | 희망가 상단 |
| band_position | 5단계 (초과/상단/중간/하단/하회) — P2-3 신규 |
| lockup_3m_pct | 3개월 확약 비율 |
| lockup_6m_pct | 6개월 확약 비율 |
| lockup_1y_pct | 1년+ 확약 비율 |
| lockup_total_pct | 합산 |
| shares_total | 총 상장주식수 |
| shares_float | 유통가능 주식수 |
| float_pct | 유통가능 비율 (P2-3 명시적 산출) |
| subscribe_start / end | 청약일 |
| refund_date | 환불일 |
| listing_date | 상장예정일 |
| lead_mgr / co_mgr | 주관사 |
| fetched_at | 수집 타임스탬프 |

### 시트 2: `raw_kind` (한국거래소 상장공시)
| 컬럼 | 설명 |
|------|------|
| corp_name / stock_code | 회사명·종목코드 |
| listing_date_confirmed | 실제 상장일 (KIND는 최종 확정치 제공) |
| market | kospi / kosdaq 최종 확정 |
| fetched_at | 수집 타임스탬프 |

### 시트 3: `raw_38` (38.co.kr 보조)
현재 구조 유지하되 DART 미제공 필드만 활용:
- 기관 수요예측 경쟁률 (DART는 결과 공시 시점에만 기록, 38은 속보성 높음)
- 일반청약 경쟁률·배정 결과

### 시트 4: `normalized` (통합 · ipo.html 소비 대상)
| 컬럼 | 출처 우선순위 | 설명 |
|------|--------------|------|
| name | DART > 38 | 종목명 |
| market | KIND > DART > 38 | kospi/kosdaq |
| status | 계산 | upcoming/active/pending_listing/completed |
| confirmed_price | DART | 원 |
| band | DART | "X,XXX~Y,YYY원" |
| band_position | DART (5단계) | 초과/상단/중간/하단/하회 |
| subscribe / refund / listing | DART > KIND | YYYY-MM-DD |
| lead | DART | 주관사 |
| demand_competition | 38 | "X,XXX:1" (기관 수요예측) |
| competition_note | - | "수요예측" 또는 "일반청약" 레이블 |
| lockup_pct | DART | 합산 % |
| lockup_breakdown | DART | "3M:X%, 6M:Y%, 1Y:Z%" |
| float_pct | DART | % |
| shares_total / shares_float | DART | 주 |
| confidence | 계산 | high/medium/low (DART 확보 여부 기준) |
| sources | 계산 | "dart,kind,38" comma-joined |
| updated | 계산 | 마지막 통합 시각 |

### 시트 5: `archive` (상장 완료 후 6개월치)
`normalized`에서 `status == 'completed'` + `listing_date < today - 7일`인 항목을 매일 이관. 6개월 이전 항목은 삭제.

## 5. 4대 팩터 재정의

| # | 팩터 | 기존 | 신규 정의 |
|---|------|------|----------|
| 1 | 기관 경쟁률 | `"1247:1"` 문자열 | **기관 수요예측 경쟁률** (38.co.kr), 단위 명시 `1,247:1`. DART의 정정 공시 반영 |
| 2 | 공모가 위치 | `priceFixed >= priceBandTop` 이진 | **5단계**: 초과(>밴드상단), 상단(=밴드상단), 중간(밴드중앙±5%), 하단(=밴드하단), 하회(<밴드하단) |
| 3 | 의무보유확약 | 단일 % | **기관 총 확약 + 기간별 세분** (3M/6M/1Y) · DART 투자설명서 기반 |
| 4 | 유통가능물량 | 첫 % 매칭 | **유통가능 주식수 / 총 상장주식수** 명시 산출 (DART) |

`calcGrade(ipo)` 재설계:
- `band_position == '상단' || '초과'` → +1
- `demand_competition >= 500:1` → +1 (기존 800은 너무 보수적, 현실 반영)
- `lockup_pct >= 30` → +1 (15는 너무 낮음)
- `float_pct <= 30` → +1
- 합산 4=S · 3=A · 2=B · 1=C · 0=D
- 신뢰도 `confidence='low'`(DART 미확보)인 경우 "등급 미확정" 고정

## 6. 새 Apps Script 스켈레톤

**파일명**: `scripts/ipo-scraper-v2.gs` (기존 `ipo-scraper.gs`와 병존, 점진 전환)

주요 함수:
```
fetchFromDart_()       — list.json + document.xml 수집 → raw_dart 시트
fetchFromKind_()       — KIND 상장공시 HTML 크롤링 → raw_kind 시트
fetchFrom38_()         — 기존 로직 유지, 필드 축소 → raw_38 시트
buildNormalized_()     — 3원천 교차 검증 → normalized 시트
rollToArchive_()       — 상장 완료 6개월치 archive 이관
fetchIPOData_v2()      — 전체 orchestration + writeRunLog_
setupDailyTriggerV2()  — 아침 8시 + 저녁 6시 2회
```

## 7. 프론트 교체 포인트 (`ipo.html`)

```diff
- const SHEET_NAME = 'IPO데이터';
+ const SHEET_NAME = 'normalized';  // 새 통합 시트

- // val(0)=종목명, val(1)=시장, ... (기존 17컬럼)
+ // 새 컬럼 구조: name,market,status,confirmed_price,band,band_position,
+ //   subscribe_start,subscribe_end,refund,listing,lead,
+ //   demand_competition,competition_note,
+ //   lockup_pct,lockup_breakdown,float_pct,shares_total,shares_float,
+ //   confidence,sources,updated
```

UI 변경:
- `경쟁률: 1,247:1` → `기관 수요예측 경쟁률: 1,247:1`
- `확약비율: 62.3%` → `의무보유확약: 62.3% (3M 45%, 6M 15%, 1Y+ 2%)`
- 공모가 카드에 `[상단]` 배지 추가 (5단계 색상 코딩)
- 카드 하단 `데이터 출처: DART·KIND·38` 표기 (투명성)
- `confidence == 'low'` 시 연한 회색 카드 + "공시 정보 확인 필요" 문구

## 8. 마이그레이션 절차

1. **사용자 작업 (선행)**:
   - DART OpenAPI 키 발급 (https://opendart.fss.or.kr)
   - 발급 후 Apps Script 에디터 → Project Settings → Script Properties에 `DART_API_KEY` 추가
2. **병행 운영 (1주)**:
   - `ipo-scraper-v2.gs` 배포 후 `normalized` 시트 채우되 프론트는 기존 `IPO데이터` 사용
   - 하루 2회 실행하며 일일 diff 모니터링
3. **전환 (W+1)**:
   - `ipo.html`의 `SHEET_NAME`을 `normalized`로 교체
   - `loadFromSheets` → `loadFromNormalizedSheet` 리팩토링
4. **레거시 정리 (W+2)**:
   - 기존 `ipo-scraper.gs`·`IPO데이터` 시트 보관 후 scrapper 트리거만 중단
   - 3개월 후 완전 삭제

## 9. 수용 기준 체크리스트

- [ ] DART API 키 발급 및 Script Properties 등록
- [ ] `scripts/ipo-scraper-v2.gs` 초안 작성 (본 설계 기반)
- [ ] `raw_dart`·`raw_kind`·`raw_38`·`normalized`·`archive` 시트 5개 생성
- [ ] 일일 트리거 2회 (08:00, 18:00) 설정
- [ ] 1주 병행 운영 — 일일 diff 로그 `normalized`와 `IPO데이터` 비교
- [ ] 4대 팩터 신규 산정식 문서 + 기존 대비 변화율 측정 리포트
- [ ] `ipo.html` 전환 완료 후 유효 종목 수 25~40건 확인 (기존 10건 대비)
- [ ] 종목별 독립 URL `/ipo/[corp_code]` 최소 1건 테스트 배포
- [ ] 면책 고지 (P0-1 JSON-LD 동적 주입과 연계) 스키마 검증

## 10. 리스크·완화

| 리스크 | 완화 |
|--------|------|
| DART API 응답 지연·쿼터 초과 | 캐시 시트(`raw_dart`)에 24h TTL · 초과 시 이전 스냅샷 사용 |
| 투자설명서 XML 파싱 복잡도 | 첫 MVP는 `확정공모가·밴드·주관사·청약일정·상장일`만 추출, 확약/유통은 2차 |
| corp_code ↔ 종목명 매핑 갱신 | DART의 `corpCode.xml` ZIP을 주 1회 다운로드하여 캐시 |
| Apps Script 20분/일 쿼터 | DART 수집은 08:00·KIND/38은 18:00으로 분리 |
| 기존 레거시 시트 의존 페이지 (ipo-analysis 등) | 레거시 `IPO데이터` 시트 3개월 유지 후 정리 |

## 11. 사용자 확인 필요 사항

1. **DART API 키 발급 착수 시점** — 본 세션 범위 밖 (이메일 인증 필요)
2. **투자설명서 XML 파싱 범위** — MVP(청약일정+공모가만) vs Full(확약·유통 포함)
3. **ipo-analysis.html·ipo-guide.html 영향 범위** — 현재는 `IPO데이터` 시트 별도 의존 여부 미검증, 전환 전 점검 필요
4. **archive 6개월 vs 영구 보존** — 콘텐츠 SEO 자산화 측면에서 영구 보존이 유리할 수 있음 (사이클 6 연계)

## 12. 다음 단계

- P2 스켈레톤 코드 `ipo-scraper-v2.gs` 작성 (본 설계 기반) — Phase D 내 후속 작업
- P2 실제 가동은 사용자 DART API 키 발급 후 별도 세션
