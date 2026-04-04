# 공모주 캘린더 - Google Sheets 연동 셋업 가이드

## 1단계: Google Sheets 생성

1. [Google Sheets](https://sheets.google.com) 에서 새 스프레드시트 생성
2. 스프레드시트 이름: `공모주 캘린더 데이터` (자유)
3. URL에서 스프레드시트 ID를 복사해두기
   - 예: `https://docs.google.com/spreadsheets/d/`**`1AbCdEfGhIjKlMnOpQrStUvWxYz`**`/edit`
   - 볼드 부분이 SHEET_ID

## 2단계: Apps Script 설정

1. 스프레드시트에서 **확장프로그램 > Apps Script** 클릭
2. 기본 코드(`function myFunction()...`)를 모두 삭제
3. `scripts/ipo-scraper.gs` 파일의 내용을 전부 붙여넣기
4. **저장** (Ctrl+S)

## 3단계: 최초 실행

1. 함수 선택 드롭다운에서 `fetchIPOData` 선택
2. **실행** 버튼 클릭
3. 권한 승인 팝업이 뜨면 → **고급** → **안전하지 않은 페이지로 이동** → **허용**
4. 실행 완료 후 스프레드시트에 `IPO데이터` 시트가 생기고 데이터가 채워짐

## 4단계: 자동 실행 트리거 설정

1. Apps Script에서 함수 선택 드롭다운을 `setupDailyTrigger`로 변경
2. **실행** 클릭
3. 이후 매일 오전 8시에 자동으로 데이터가 업데이트됨

## 5단계: 스프레드시트 웹 공개

1. 스프레드시트에서 **파일 > 공유 > 웹에 게시** 클릭
2. 시트: `IPO데이터`, 형식: `웹페이지` 선택
3. **게시** 클릭
4. (이렇게 하면 Google Visualization API로 JSON 조회 가능)

또는 간단하게:
1. **공유** 버튼 클릭
2. **링크가 있는 모든 사용자** → **뷰어** 로 설정
3. 이것만으로도 gviz JSON 엔드포인트 접근 가능

## 6단계: ipo.html에 SHEET_ID 입력

`ipo.html` 파일을 열고 상단의 `SHEET_ID` 값을 입력:

```javascript
const SHEET_ID = '여기에_스프레드시트_ID_붙여넣기';
```

## 7단계: 배포

```bash
git add -A && git commit -m "feat: 공모주 캘린더 Google Sheets 연동"
git push
```

Vercel에서 자동 배포됩니다.

---

## 데이터 흐름

```
38커뮤니케이션 (38.co.kr)
    ↓ (매일 오전 8시, Apps Script 자동 스크래핑)
Google Sheets (IPO데이터 시트)
    ↓ (gviz JSON API, CORS 제한 없음)
ipo.html (클라이언트에서 직접 fetch)
    ↓
사용자 브라우저에 캘린더 렌더링
```

## 문제 해결

### 데이터가 안 나와요
- Google Sheets가 **웹에 공개** 또는 **링크 공유(뷰어)** 설정인지 확인
- `SHEET_ID`가 정확한지 확인
- 브라우저 콘솔(F12)에서 에러 메시지 확인

### Apps Script 실행 오류
- 38.co.kr 사이트가 일시적으로 접속 불가능할 수 있음 → 다음날 자동 재실행됨
- 실행 로그에서 에러 확인: Apps Script > 실행 > 실행 로그

### 데이터가 오래됨
- Apps Script > 트리거 메뉴에서 트리거가 활성화되어 있는지 확인
- 수동 실행: `fetchIPOData` 함수 직접 실행
