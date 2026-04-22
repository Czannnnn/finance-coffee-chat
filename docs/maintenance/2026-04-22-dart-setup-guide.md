---
date: 2026-04-22
type: runbook
scope: ipo-scraper-v2
related: 2026-04-22-ipo-data-redesign.md
---

# DART v2 스크래퍼 가동 가이드 (사용자 작업)

> Apps Script 에디터에서 직접 수행해야 하는 단계. Claude Code는 Apps Script 런타임에 접근할 수 없음.

## 사전 조건

- ✅ DART OpenAPI 키 이미 발급됨 (2026-04-22 수령)
- ✅ `scripts/ipo-scraper-v2.gs` 구현 완료 (본 커밋)
- ⚠️ 키를 채팅에 노출한 이력이 있으므로, **운용 키는 별도 재발급 권장** (https://opendart.fss.or.kr → 인증키 관리 → 재발급)

## 단계

### 1. Apps Script 프로젝트 열기
현재 `ipo-scraper.gs`가 돌고 있는 Google Sheets의 확장 프로그램 → Apps Script 열기. 주소는 대략 `https://script.google.com/home/projects/<프로젝트ID>/edit`.

### 2. `ipo-scraper-v2.gs` 추가
- 왼쪽 파일 트리에서 **파일 추가 → 스크립트** → 이름 `ipo-scraper-v2`
- 본 레포의 `scripts/ipo-scraper-v2.gs` 전체 내용 붙여넣기 + 저장

### 3. Script Properties에 API 키 등록
- 왼쪽 톱니바퀴 아이콘 → **프로젝트 설정** (Project Settings)
- 하단 **스크립트 속성** → **스크립트 속성 추가** 클릭
- **속성 이름**: `DART_API_KEY`
- **값**: 발급받은 40자 키 (또는 로테이션한 새 키)
- **저장**

> ⚠️ 이 방식은 키가 프로젝트 소유자에게만 보이고 git에 커밋되지 않는 안전한 보관 방식이다.

### 4. 최초 수동 실행 (dry-run)
- 상단 함수 선택 드롭다운에서 `fetchIPOData_v2` 선택
- **실행** 버튼 클릭
- 권한 요청 대화상자 3종 허용:
  - `UrlFetchApp` (DART/KIND/38 HTTP 호출)
  - `SpreadsheetApp` (시트 읽기/쓰기)
  - `MailApp` (실패 알림 Gmail)
- 실행 로그(보기 → 실행) 확인 — 에러 없이 완료되어야 함

### 5. 결과 검증
Google Sheets에서 다음 시트들이 생성되었는지 확인:
- `raw_dart` — DART list.json에서 받아온 IPO 공시 목록 (증권신고서 C001)
- `raw_kind` — KIND 상장공시 HTML에서 파싱한 상장예정 종목
- `raw_38` — 38.co.kr 보조 필드 (현재 주 파서 그대로 재사용)
- `normalized` — 3원천 교차 검증 결과 (프론트 소비 대상)
- `실행로그_v2` — 매 실행마다 상태·건수·소요시간·오류

`normalized` 시트의 컬럼이 설계 문서(`2026-04-22-ipo-data-redesign.md` §4)와 일치하는지 확인.

### 6. 트리거 설정 (일 2회 자동)
- 함수 선택 `setupDailyTriggerV2` → 실행
- 트리거 메뉴에서 08:00·18:00 두 개가 보이면 성공

### 7. 1주 병행 운영 (프론트 전환 보류)
- 기존 `fetchIPOData` 트리거도 유지 (IPO데이터 시트 계속 갱신)
- `normalized` 시트 품질을 매일 확인:
  - 유효 종목 수가 현재 10건 → 25~40건 범위로 증가하는지
  - `confidence=high` 비율 50%+인지
  - `lockup_pct`·`float_pct` 공란이 대폭 감소하는지
- 미달 항목 발생 시 본 세션 후속 개선 요청

### 8. 프론트 전환 (1주 후)
문제 없으면 `ipo.html`의 한 줄 수정:
```diff
- const SHEET_NAME = 'IPO데이터';
+ const SHEET_NAME = 'normalized';
```
- 이후 `loadFromSheets()`의 `val(i)` 인덱스를 `normalized` 시트 컬럼 순서에 맞게 재매핑 (설계 문서 §4 참조)
- 커밋·배포 (Claude Code에 요청)

### 9. 레거시 정리 (3개월 후)
- 기존 `ipo-scraper.gs` 트리거 중단
- `IPO데이터` 시트는 3개월 보관 후 삭제

## 예상 문제와 대응

| 증상 | 원인 후보 | 대응 |
|---|---|---|
| `DART_API_KEY 미설정` 오류 | Script Properties 등록 실패 | 3단계 재수행, 속성명 정확히 `DART_API_KEY`인지 확인 |
| DART `status=010` (사용할 수 없는 키) | 키 오타 또는 만료 | 포털에서 키 재확인 |
| DART `status=020` (요청 제한 초과) | 하루 20,000건 초과 (드문 경우) | 다음 날 재시도, 검색 기간 V2_LOOKBACK_DAYS 축소 |
| KIND 수집 0건 | HTML 구조 변경 | `fetchFromKind_` 정규식 점검 — 본 함수는 best-effort라 실패해도 전체 중단 없음 |
| 38.co.kr 보조 함수 `fetchAsEucKr is not defined` | 기존 ipo-scraper.gs가 프로젝트에 없음 | 기존 파일도 함께 유지 (둘은 공존) |
| `normalized`가 비어있음 | 종목명 매칭 실패 (DART corp_name vs 38 name 표기 차이) | `normalizeName_` 규칙 보강 후 재실행 |

## 체크리스트

- [ ] DART API 키 재발급 (보안)
- [ ] Script Properties `DART_API_KEY` 등록
- [ ] `ipo-scraper-v2.gs` Apps Script에 추가
- [ ] `fetchIPOData_v2` 수동 실행 성공
- [ ] 5개 시트(raw_dart/raw_kind/raw_38/normalized/실행로그_v2) 생성 확인
- [ ] `normalized` 유효 종목 수 >= 20건
- [ ] `setupDailyTriggerV2` 실행 후 트리거 2개 확인
- [ ] 1주 병행 운영 후 Claude Code에 프론트 전환 요청
