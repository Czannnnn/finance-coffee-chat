# IPO Calendar Page Design

## Overview
공모주 청약 캘린더 페이지. 월간 캘린더 + 카드 리스트 듀얼 뷰.

## Architecture
- 순수 정적 HTML/CSS/JS (서버 없음)
- Phase 1: 샘플 데이터 하드코딩
- Phase 2: Google Sheets API 연동 (별도 작업)

## Page Structure

### Layout
1. **Nav** - 기존 사이트 공통 네비게이션 (공모주 캘린더 링크 추가)
2. **Header** - 커피 테마 badge + 제목 + divider
3. **필터 바** - 상태(전체/청약예정/청약중/상장완료) + 시장(전체/코스피/코스닥)
4. **월간 캘린더** - 이전/다음 월 이동, 날짜 칸에 이벤트 도트 표시
   - 청약일: caramel 색상
   - 환불일: medium-roast 색상  
   - 상장일: 녹색 계열
   - 날짜 클릭 시 해당일 관련 카드만 필터링
5. **카드 리스트** - 각 공모주의 상세 정보 카드
   - D-day 카운트다운 배지
   - 상태 배지 (청약예정/청약중/상장완료)
   - 종목명, 시장구분, 공모가, 청약일~환불일~상장일 타임라인
   - 주관사, 경쟁률

### Design System
기존 사이트 커피 테마 그대로 사용:
- Colors: espresso, dark-roast, medium-roast, caramel, cream, oat-milk, white
- Fonts: Noto Sans KR + Playfair Display
- Cards: white bg, 16px border-radius, subtle shadow
- Badge, divider 등 공통 컴포넌트 패턴 유지

### Sample Data
2026년 4월 기준 가상 공모주 6~8개:
- 다양한 상태 (예정/진행중/완료) 혼합
- 코스피/코스닥 혼합
- 현실적인 공모가, 주관사, 경쟁률 데이터

### Responsive
- 모바일: 캘린더 축소, 카드 1열
- 데스크톱: 캘린더 + 카드 풀 너비

## Files
- `ipo.html` - 새 페이지
- `index.html` - nav + 홈 카드 추가
- `portfolio.html` - nav 링크 추가
- `asset.html` - nav 링크 추가
