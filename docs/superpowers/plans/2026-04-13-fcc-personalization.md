# Finance Coffee Chat — 비용 최적화 개인화 & UX 리라이트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `cost-optimization.html` 허브에 URL 쿼리 기반 개인화 필터와 맞춤 요약 섹션을 추가하고, "6×8 매트릭스" 용어를 친근한 자연어로 전면 리라이트한다.

**Architecture:** 순수 정적 사이트. 상태는 URL 쿼리 파라미터에만 존재하며 localStorage/sessionStorage/쿠키를 사용하지 않는다. 신규 `js/cost-personalizer.js`가 URL 파싱, 규칙 매칭, 점수 정렬, DOM 재렌더를 담당하고, `data/cost-recommendations.json`이 규칙 테이블을 보관한다. 기존 GA 태깅 규칙(`data-ga`/`data-ga-text`/`data-ga-loc`)을 확장해 필터/추천 인터랙션을 추적한다.

**Tech Stack:** Vanilla JS (ES2017+), 정적 HTML, Google Sheets API 없음, 빌드 도구 없음. 기존 커피 테마 CSS 변수 재사용.

**Related Spec:** `docs/superpowers/specs/2026-04-13-fcc-personalization-design.md`

---

## File Structure

| 파일 | 상태 | 책임 |
|---|---|---|
| `docs/phase9-cost-catalog/README.md` | 수정 | "6×8 매트릭스" 문구 → 친근한 표현 (소스 오브 트루스) |
| `cost-simulation.html` | 수정 | subtitle 1줄 잔재 문구 정비 |
| `cost-optimization.html` | 수정 | meta/OG/JSON-LD 리라이트, 히어로/섹션 타이틀 리라이트, 필터 위젯 마크업/CSS, 맞춤 요약 섹션 placeholder, personalizer 스크립트 연결 |
| `data/cost-recommendations.json` | 신규 | 추천 규칙 테이블 (MVP 분량 16~24개 규칙) |
| `js/cost-personalizer.js` | 신규 | 상태 관리, 규칙 매칭, 점수 정렬, 렌더링, GA 발화 |
| `js/test-cost-personalizer.html` | 신규 | 브라우저 기반 테스트 하네스 (pure function 검증) |

**Decomposition 원칙:**
- 파일 4개로 관심사 분리: 데이터(JSON), 로직(JS), 프레젠테이션(HTML+CSS), 문서(spec/README)
- `js/cost-personalizer.js`는 내부적으로 3개 섹션으로 구성 — (1) 상태/URL, (2) 매칭/정렬, (3) 렌더링/GA. 파일 쪼개기 대신 섹션 주석으로 구분해 단일 파일 유지 (프로젝트가 빌드 없이 `<script>`로 로딩하므로)

---

## Testing Strategy

이 프로젝트는 빌드/테스트 프레임워크가 없다. 검증은 다음 조합으로:

1. **Pure function 단위 테스트 → `js/test-cost-personalizer.html`**
   - 브라우저에서 열면 URL 파싱·직렬화, 규칙 매칭, 점수 정렬 결과를 assertion으로 검증하고 PASS/FAIL을 화면에 출력
   - `data-cost-personalizer="test"` 조건으로 모듈 내 함수에 접근
2. **수동 UI 검증 → 스펙의 "검증 체크리스트"**
   - 각 Task 마지막에 수행할 최소 수동 검증 스텝을 명시
3. **프라이버시 검증** — DevTools Storage 비어있음 + Network 탭 GA 외 요청 없음
4. **모든 커밋 후** — `grep -rn "매트릭스\|6 세그먼트\|8 영역" --include="*.html"` 로 잔재 문구 재점검

로컬에서 사이트를 띄우려면:
```bash
cd C:/Users/USER/projects/finance-coffee-chat
python -m http.server 8080
# 브라우저에서 http://localhost:8080/cost-optimization.html
```

---

## Phase A — UX 리라이트 (안전한 점진 변경)

### Task 1: `docs/phase9-cost-catalog/README.md` 소스 오브 트루스 리라이트

**Files:**
- Modify: `docs/phase9-cost-catalog/README.md`

- [ ] **Step 1: 첫 단락 교체**

`docs/phase9-cost-catalog/README.md` 의 1~3행을 다음으로 교체.

현재:
```markdown
# Phase 9 비용 최적화 카탈로그

2026년 대한민국 가구 유형별 비용 최적화 종합 가이드. **6 세그먼트 × 8 영역** 매트릭스로 구성되어 있으며, 본인의 세그먼트를 선택하면 우선순위에 따른 빠른 가이드가 제공됩니다.
```

신규:
```markdown
# Phase 9 비용 최적화 카탈로그

2026년 대한민국 가구 유형별 비용 최적화 종합 가이드. **가구 유형 6개 × 절약 영역 8개** 가이드로 구성되어 있으며, 본인의 가구 유형을 선택하면 우선순위에 따른 빠른 가이드가 제공됩니다.
```

- [ ] **Step 2: 섹션 타이틀 교체**

`## 우선순위 매트릭스 (6×8 한눈에)` → `## 가구 유형별 우선순위 한눈에`

- [ ] **Step 3: 커밋**

```bash
cd C:/Users/USER/projects/finance-coffee-chat
git add docs/phase9-cost-catalog/README.md
git commit -m "docs: rewrite phase9 catalog intro with friendly wording"
```

---

### Task 2: `cost-simulation.html` subtitle 잔재 정비

**Files:**
- Modify: `cost-simulation.html:402`

- [ ] **Step 1: subtitle 문구 교체**

L402 한 줄만 변경.

현재:
```html
<div class="subtitle">2026년 법령 기준 · 6 세그먼트 × 8 영역 인터랙티브 계산기</div>
```

신규:
```html
<div class="subtitle">2026년 법령 기준 · 내 상황에 맞는 인터랙티브 절약 계산기</div>
```

- [ ] **Step 2: 브라우저 확인**

로컬 서버 띄우고 `http://localhost:8080/cost-simulation.html` 방문, 히어로 subtitle 확인.

- [ ] **Step 3: 커밋**

```bash
git add cost-simulation.html
git commit -m "docs: rewrite simulation subtitle without matrix jargon"
```

---

### Task 3: `cost-optimization.html` meta/OG/Twitter/JSON-LD 리라이트

**Files:**
- Modify: `cost-optimization.html` (헤드 영역 L6~20, L231~244)

- [ ] **Step 1: `<title>` 교체**

L6:
```html
<title>비용 최적화 가이드 - Finance Coffee Chat</title>
```
→
```html
<title>내 상황에 맞는 절약 가이드 - Finance Coffee Chat</title>
```

- [ ] **Step 2: meta description 교체**

L7:
```html
<meta name="description" content="2026년 기준 가구 유형별 비용 최적화 종합 가이드. 청년/신혼/유자녀/중장년 6 세그먼트 × 연말정산/카드/보험/통신 등 8 영역 매트릭스.">
```
→
```html
<meta name="description" content="2026년 기준 나에게 딱 맞는 비용 절약 전략. 가구 유형·소득·주거 상황별 추천 액션을 3분 만에 확인하세요.">
```

- [ ] **Step 3: og:title 교체**

L10:
```html
<meta property="og:title" content="비용 최적화 가이드 - Finance Coffee Chat">
```
→
```html
<meta property="og:title" content="내 상황에 맞는 절약 가이드 - Finance Coffee Chat">
```

- [ ] **Step 4: og:description 교체**

L11:
```html
<meta property="og:description" content="2026년 기준 가구 유형별 비용 최적화 종합 가이드. 6 세그먼트 × 8 영역 매트릭스.">
```
→
```html
<meta property="og:description" content="내 상황 몇 가지만 고르면 딱 맞는 절약 액션 추천. 2026 최신 제도 반영.">
```

- [ ] **Step 5: twitter:title / twitter:description 교체**

L18:
```html
<meta name="twitter:title" content="비용 최적화 가이드 - Finance Coffee Chat">
```
→
```html
<meta name="twitter:title" content="내 상황에 맞는 절약 가이드 - Finance Coffee Chat">
```

L19:
```html
<meta name="twitter:description" content="2026년 기준 가구 유형별 비용 최적화 종합 가이드. 6 세그먼트 × 8 영역 매트릭스.">
```
→
```html
<meta name="twitter:description" content="내 상황 몇 가지만 고르면 딱 맞는 절약 액션 추천. 2026 최신 제도 반영.">
```

- [ ] **Step 6: JSON-LD name/description 교체**

L235-236:
```json
"name": "비용 최적화 가이드 - Finance Coffee Chat",
"description": "2026년 기준 가구 유형별 비용 최적화 종합 가이드. 청년/신혼/유자녀/중장년 6 세그먼트 × 연말정산/카드/보험/통신 등 8 영역 매트릭스.",
```
→
```json
"name": "내 상황에 맞는 절약 가이드 - Finance Coffee Chat",
"description": "2026년 기준 나에게 딱 맞는 비용 절약 전략. 가구 유형·소득·주거 상황별 추천 액션을 3분 만에 확인하세요.",
```

- [ ] **Step 7: 잔재 문구 재점검**

```bash
grep -n "매트릭스\|6 세그먼트\|8 영역" cost-optimization.html
```
기대값: 섹션 2(히어로/섹션 타이틀) 영역에만 잔재 남아있음 — Task 4에서 처리.

- [ ] **Step 8: 커밋**

```bash
git add cost-optimization.html
git commit -m "docs: rewrite cost-optimization meta/OG/JSON-LD without matrix jargon"
```

---

### Task 4: `cost-optimization.html` 히어로 & 섹션 타이틀 리라이트

**Files:**
- Modify: `cost-optimization.html:283~293, 297~298, 340~341, 395~410`

- [ ] **Step 1: 히어로 subtitle 교체 (L285)**

현재:
```html
<div class="subtitle">2026년 기준 · 6 세그먼트 × 8 영역 매트릭스</div>
```
→
```html
<div class="subtitle">2026년 기준 · 내 상황부터 고르고 시작하세요</div>
```

- [ ] **Step 2: 히어로 intro 교체 (L287~293)**

현재:
```html
<p class="intro">
  월급은 그대로인데 지출만 늘어나는 시대, 새는 돈부터 막는 것이 가장 빠른 재테크입니다.
  가구 유형에 따라 공략해야 할 비용 항목과 우선순위는 완전히 다릅니다.
  본 가이드는 2026년 최신 제도와 세법을 반영해 <strong>청년 단독/신혼/유자녀/중장년 6 세그먼트</strong>별로
  연말정산·카드·보험·통신·금융수수료·공과금·지원금·교통비 <strong>8개 영역</strong>의 절약 전략을 매트릭스로 정리했습니다.
  본인 상황에 맞는 세그먼트를 먼저 선택한 뒤, 필요한 영역별 심층 자료를 확인해 보세요.
</p>
```
→
```html
<p class="intro">
  월급은 그대로인데 지출만 늘어나는 시대, 새는 돈부터 막는 게 가장 빠른 재테크입니다.
  <strong>가구 유형마다 챙겨야 할 것이 다릅니다.</strong>
  아래 필터에서 내 상황 몇 가지만 골라주시면, 나한테 해당되는 제도와 액션만 추려서 보여드려요.
  2026년 최신 제도와 세법을 반영했습니다.
</p>
```

- [ ] **Step 3: Section 1 타이틀 교체 (L297~298)**

현재:
```html
<h2 class="section-title">1. 내 가구 유형 선택하기</h2>
<p class="section-desc">세그먼트별 빠른 가이드 — 본인 상황에 맞는 카드를 선택하세요.</p>
```
→
```html
<h2 class="section-title">가구 유형별 빠른 가이드</h2>
<p class="section-desc">본인 상황과 가장 가까운 카드를 선택하세요. 필터를 적용하면 내 유형이 강조됩니다.</p>
```

(Note: Section 1 은 유지. 필터 위젯은 Phase C에서 히어로 바로 아래에 신규 섹션으로 추가한다)

- [ ] **Step 4: Section 2 타이틀 교체 (L340~341)**

현재:
```html
<h2 class="section-title">2. 영역별 상세 가이드</h2>
<p class="section-desc">8개 영역의 심층 자료 — 각 영역별 제도, 수치, 체크리스트를 제공합니다.</p>
```
→
```html
<h2 class="section-title">나에게 맞는 절약 카드</h2>
<p class="section-desc">각 절약 영역의 심층 자료 — 필터를 적용하면 내 우선순위 순으로 재정렬됩니다.</p>
```

- [ ] **Step 5: Section 3 타이틀·설명 교체 (L395~396)**

현재:
```html
<h2 class="section-title">3. 우선순위 매트릭스</h2>
<p class="section-desc">세그먼트 × 영역 별 공략 순위. ★★★ 최우선 · ★★ 권장 · ★ 보조.</p>
```
→
```html
<h2 class="section-title">전체 우선순위 한눈에</h2>
<p class="section-desc">가구 유형마다 어떤 영역을 먼저 챙겨야 하는지 한눈에 비교해볼 수 있어요. ★★★ 최우선 · ★★ 권장 · ★ 보조.</p>
```

- [ ] **Step 6: 매트릭스 테이블 aria-label & 헤더 교체 (L398, L401)**

현재 L398:
```html
<table class="matrix-table" aria-label="세그먼트별 영역 우선순위 매트릭스">
```
→
```html
<table class="matrix-table" aria-label="가구 유형별 우선순위 비교표">
```

현재 L401:
```html
<th scope="col">세그먼트 \ 영역</th>
```
→
```html
<th scope="col">가구 유형 \ 절약 영역</th>
```

- [ ] **Step 7: 잔재 문구 최종 점검**

```bash
grep -n "매트릭스\|6 세그먼트\|8 영역" cost-optimization.html
```
기대값: 0건.

```bash
grep -rn "매트릭스\|6 세그먼트\|8 영역" . --include="*.html" --include="*.md"
```
기대값: 본 스펙/플랜 문서와 미리 허용된 docs 내 테이블 주석 외엔 0건.

- [ ] **Step 8: 브라우저 확인**

`http://localhost:8080/cost-optimization.html` — 히어로/섹션 타이틀/매트릭스 테이블 헤더 모두 새 문구로 보임.

- [ ] **Step 9: 커밋**

```bash
git add cost-optimization.html
git commit -m "docs: rewrite cost-optimization hero and section titles"
```

---

## Phase B — 데이터 & 순수 로직

### Task 5: `data/cost-recommendations.json` MVP 규칙 테이블 생성

**Files:**
- Create: `data/cost-recommendations.json`

- [ ] **Step 1: data/ 디렉터리 생성**

```bash
mkdir -p C:/Users/USER/projects/finance-coffee-chat/data
```

- [ ] **Step 2: MVP 규칙 파일 작성**

Create `data/cost-recommendations.json` with:

```json
{
  "version": "2026-04",
  "rules": [
    {
      "id": "rent-tax-credit",
      "title": "월세세액공제 신청",
      "savingHint": "연 최대 75만원 환급",
      "areaRef": "01-year-end-tax",
      "priority": 3,
      "conditions": {
        "home": ["rent"],
        "income": ["0-30", "30-50", "50-70"]
      },
      "linkHref": "cost/area-01-year-end-tax.html",
      "linkLabel": "자세히 →"
    },
    {
      "id": "youth-rent-support",
      "title": "청년월세 지원금",
      "savingHint": "월 최대 20만원 · 12개월",
      "areaRef": "07-public-support",
      "priority": 3,
      "conditions": {
        "s": ["s1"],
        "home": ["rent"],
        "income": ["0-30", "30-50"]
      },
      "linkHref": "cost/area-07-public-support.html",
      "linkLabel": "신청 경로 →"
    },
    {
      "id": "k-pass-transit",
      "title": "K-패스 교통카드 전환",
      "savingHint": "월 1~2만원 환급",
      "areaRef": "08-transport",
      "priority": 2,
      "conditions": {
        "region": ["metro"]
      },
      "linkHref": "cost/area-08-transport.html",
      "linkLabel": "가이드 →"
    },
    {
      "id": "climate-card-metro",
      "title": "기후동행카드 (수도권 정액권)",
      "savingHint": "월 1~3만원 절감",
      "areaRef": "08-transport",
      "priority": 2,
      "conditions": {
        "region": ["metro"]
      },
      "linkHref": "cost/area-08-transport.html",
      "linkLabel": "비교 →"
    },
    {
      "id": "mvno-telecom",
      "title": "알뜰폰(MVNO) 전환",
      "savingHint": "월 3~5만원 절감",
      "areaRef": "04-telecom",
      "priority": 3,
      "conditions": {},
      "linkHref": "cost/area-04-telecom.html",
      "linkLabel": "요금제 비교 →"
    },
    {
      "id": "insurance-rebalance",
      "title": "중복·과잉 보험 정리",
      "savingHint": "월 5~15만원 절감",
      "areaRef": "03-insurance",
      "priority": 3,
      "conditions": {},
      "linkHref": "cost/area-03-insurance.html",
      "linkLabel": "리밸런싱 가이드 →"
    },
    {
      "id": "child-tax-credit",
      "title": "자녀 세액공제 최대화",
      "savingHint": "자녀당 연 15~30만원",
      "areaRef": "01-year-end-tax",
      "priority": 3,
      "conditions": {
        "dep": ["1", "2", "3"]
      },
      "linkHref": "cost/area-01-year-end-tax.html",
      "linkLabel": "자세히 →"
    },
    {
      "id": "multichild-utility-discount",
      "title": "다자녀 공공요금 감면",
      "savingHint": "전기·가스·수도 연 10~30만원",
      "areaRef": "06-utilities-subscriptions",
      "priority": 3,
      "conditions": {
        "s": ["s5"],
        "dep": ["2", "3"]
      },
      "linkHref": "cost/area-06-utilities-subscriptions.html",
      "linkLabel": "신청 방법 →"
    },
    {
      "id": "credit-card-income-deduction",
      "title": "신용카드 소득공제 한도 채우기",
      "savingHint": "연 최대 30만원 환급",
      "areaRef": "02-credit-cards",
      "priority": 3,
      "conditions": {
        "income": ["30-50", "50-70", "70-100"]
      },
      "linkHref": "cost/area-02-credit-cards.html",
      "linkLabel": "전략 →"
    },
    {
      "id": "etf-fee-optimization",
      "title": "ETF 총보수 최적화",
      "savingHint": "장기 연 0.3~0.7% 수익률 개선",
      "areaRef": "05-financial-fees",
      "priority": 2,
      "conditions": {
        "income": ["50-70", "70-100", "100+"]
      },
      "linkHref": "cost/area-05-financial-fees.html",
      "linkLabel": "비교 →"
    },
    {
      "id": "newlywed-housing-loan",
      "title": "신혼부부 디딤돌·버팀목 대출",
      "savingHint": "금리 1~2% 우대",
      "areaRef": "07-public-support",
      "priority": 3,
      "conditions": {
        "s": ["s2", "s3"],
        "home": ["jeonse", "rent"]
      },
      "linkHref": "cost/area-07-public-support.html",
      "linkLabel": "조건 확인 →"
    },
    {
      "id": "midlife-pension-deduction",
      "title": "연금저축·IRP 세액공제 극대화",
      "savingHint": "연 최대 148만원 환급",
      "areaRef": "01-year-end-tax",
      "priority": 3,
      "conditions": {
        "s": ["s6"],
        "income": ["50-70", "70-100", "100+"]
      },
      "linkHref": "cost/area-01-year-end-tax.html",
      "linkLabel": "가이드 →"
    },
    {
      "id": "ott-subscription-audit",
      "title": "OTT 중복 구독 정리",
      "savingHint": "월 2~4만원 절감",
      "areaRef": "06-utilities-subscriptions",
      "priority": 2,
      "conditions": {},
      "linkHref": "cost/area-06-utilities-subscriptions.html",
      "linkLabel": "체크리스트 →"
    },
    {
      "id": "utility-discount-low-income",
      "title": "저소득층 공과금 감면",
      "savingHint": "연 10~40만원 절감",
      "areaRef": "06-utilities-subscriptions",
      "priority": 3,
      "conditions": {
        "income": ["0-30"]
      },
      "linkHref": "cost/area-06-utilities-subscriptions.html",
      "linkLabel": "자격 확인 →"
    },
    {
      "id": "high-income-isa",
      "title": "ISA 계좌 절세 활용",
      "savingHint": "연 200만원 비과세",
      "areaRef": "05-financial-fees",
      "priority": 2,
      "conditions": {
        "income": ["70-100", "100+"]
      },
      "linkHref": "cost/area-05-financial-fees.html",
      "linkLabel": "시작 가이드 →"
    },
    {
      "id": "homeowner-property-tax",
      "title": "1주택자 재산세 감면 신청",
      "savingHint": "연 10~30만원 절감",
      "areaRef": "07-public-support",
      "priority": 2,
      "conditions": {
        "home": ["own"]
      },
      "linkHref": "cost/area-07-public-support.html",
      "linkLabel": "자세히 →"
    }
  ]
}
```

- [ ] **Step 3: JSON 유효성 검증**

```bash
cd C:/Users/USER/projects/finance-coffee-chat
python -c "import json; json.load(open('data/cost-recommendations.json', encoding='utf-8')); print('valid')"
```
기대값: `valid`

- [ ] **Step 4: 커밋**

```bash
git add data/cost-recommendations.json
git commit -m "feat: add cost recommendations rule table MVP (16 rules)"
```

---

### Task 6: `js/cost-personalizer.js` URL 파싱/직렬화 모듈

**Files:**
- Create: `js/cost-personalizer.js`

- [ ] **Step 1: js/ 디렉터리 생성**

```bash
mkdir -p C:/Users/USER/projects/finance-coffee-chat/js
```

- [ ] **Step 2: 파일 초기 스켈레톤 작성**

Create `js/cost-personalizer.js`:

```javascript
// Finance Coffee Chat — cost-optimization 개인화 모듈
// 상태는 URL 쿼리 파라미터에만 존재. localStorage/sessionStorage/쿠키 사용 안 함.

(function (global) {
  'use strict';

  // ───────────────────────── 1. 필드 정의 & URL 파싱 ─────────────────────────

  var FIELD_VALUES = {
    s: ['s1', 's2', 's3', 's4', 's5', 's6'],
    income: ['0-30', '30-50', '50-70', '70-100', '100+'],
    home: ['own', 'jeonse', 'rent'],
    dep: ['0', '1', '2', '3'],
    region: ['metro', 'nonmetro']
  };

  var REQUIRED_FIELDS = ['s', 'income', 'home'];
  var OPTIONAL_FIELDS = ['dep', 'region'];

  function parseFilterState(queryString) {
    var params = new URLSearchParams(queryString || '');
    var state = {};
    Object.keys(FIELD_VALUES).forEach(function (field) {
      var value = params.get(field);
      if (value && FIELD_VALUES[field].indexOf(value) !== -1) {
        state[field] = value;
      }
    });
    return state;
  }

  function serializeFilterState(state, options) {
    options = options || {};
    var params = new URLSearchParams();
    Object.keys(FIELD_VALUES).forEach(function (field) {
      if (options.excludeSensitive && (field === 'income' || field === 'dep')) {
        return;
      }
      if (state[field]) {
        params.set(field, state[field]);
      }
    });
    var str = params.toString();
    return str ? '?' + str : '';
  }

  function hasRequiredFields(state) {
    return REQUIRED_FIELDS.every(function (field) {
      return Boolean(state[field]);
    });
  }

  // ───────────────────────── 내보내기 (테스트용) ─────────────────────────

  var api = {
    FIELD_VALUES: FIELD_VALUES,
    REQUIRED_FIELDS: REQUIRED_FIELDS,
    OPTIONAL_FIELDS: OPTIONAL_FIELDS,
    parseFilterState: parseFilterState,
    serializeFilterState: serializeFilterState,
    hasRequiredFields: hasRequiredFields
  };

  global.CostPersonalizer = api;
})(window);
```

- [ ] **Step 3: 커밋**

```bash
git add js/cost-personalizer.js
git commit -m "feat: add cost-personalizer URL parse/serialize module"
```

---

### Task 7: 규칙 매칭 & 점수 정렬 로직 추가

**Files:**
- Modify: `js/cost-personalizer.js`

- [ ] **Step 1: 매칭/정렬 섹션 추가**

`js/cost-personalizer.js` 의 "내보내기 (테스트용)" 섹션 **바로 위**에 다음을 추가:

```javascript
  // ───────────────────────── 2. 규칙 매칭 & 점수 정렬 ─────────────────────────

  // 세그먼트 × 영역 가중치 (cost-optimization.html 매트릭스 테이블 기반)
  // ★★★=3, ★★=2, ★=1
  var SEGMENT_AREA_WEIGHTS = {
    s1: { '01': 3, '02': 2, '03': 2, '04': 3, '05': 2, '06': 1, '07': 3, '08': 3 },
    s2: { '01': 3, '02': 3, '03': 2, '04': 2, '05': 3, '06': 2, '07': 3, '08': 2 },
    s3: { '01': 3, '02': 2, '03': 3, '04': 2, '05': 2, '06': 2, '07': 3, '08': 2 },
    s4: { '01': 3, '02': 3, '03': 3, '04': 2, '05': 2, '06': 2, '07': 3, '08': 2 },
    s5: { '01': 3, '02': 3, '03': 3, '04': 2, '05': 2, '06': 3, '07': 3, '08': 2 },
    s6: { '01': 3, '02': 3, '03': 3, '04': 3, '05': 3, '06': 2, '07': 1, '08': 1 }
  };

  function getAreaNumFromRef(areaRef) {
    // "01-year-end-tax" → "01"
    var match = (areaRef || '').match(/^(\d{2})/);
    return match ? match[1] : null;
  }

  function getSegmentAreaWeight(segmentKey, areaRef) {
    if (!segmentKey || !SEGMENT_AREA_WEIGHTS[segmentKey]) return 0;
    var areaNum = getAreaNumFromRef(areaRef);
    if (!areaNum) return 0;
    return SEGMENT_AREA_WEIGHTS[segmentKey][areaNum] || 0;
  }

  function ruleMatches(rule, state) {
    var conditions = rule.conditions || {};
    var fields = Object.keys(conditions);
    if (fields.length === 0) return true; // 조건 없음 = 모두 매칭
    return fields.every(function (field) {
      var allowedValues = conditions[field];
      if (!Array.isArray(allowedValues) || allowedValues.length === 0) return true;
      // 사용자가 해당 필드를 선택하지 않았다면, 옵션 필드는 매칭 스킵
      if (!state[field]) {
        return OPTIONAL_FIELDS.indexOf(field) !== -1;
      }
      return allowedValues.indexOf(state[field]) !== -1;
    });
  }

  function countMismatchedFields(rule, state) {
    var conditions = rule.conditions || {};
    var mismatched = 0;
    Object.keys(conditions).forEach(function (field) {
      if (!state[field]) return;
      var allowedValues = conditions[field];
      if (Array.isArray(allowedValues) && allowedValues.indexOf(state[field]) === -1) {
        mismatched++;
      }
    });
    return mismatched;
  }

  function scoreRule(rule, state) {
    var base = (rule.priority || 1) * 10;
    var optionalMatchBonus = 0;
    OPTIONAL_FIELDS.forEach(function (field) {
      var conditions = rule.conditions || {};
      if (state[field] && conditions[field] && conditions[field].indexOf(state[field]) !== -1) {
        optionalMatchBonus += 3;
      }
    });
    var segmentWeight = getSegmentAreaWeight(state.s, rule.areaRef);
    return base + optionalMatchBonus + segmentWeight;
  }

  function classifyRules(rules, state) {
    var matched = [];
    var notApplicable = [];
    rules.forEach(function (rule) {
      if (ruleMatches(rule, state)) {
        matched.push({ rule: rule, score: scoreRule(rule, state) });
        return;
      }
      var mismatches = countMismatchedFields(rule, state);
      if (mismatches === 1) {
        notApplicable.push(rule);
      }
      // mismatches >= 2 는 아예 제외
    });
    matched.sort(function (a, b) { return b.score - a.score; });
    return {
      top3: matched.slice(0, 3).map(function (x) { return x.rule; }),
      extended: matched.slice(3, 8).map(function (x) { return x.rule; }),
      notApplicable: notApplicable
    };
  }
```

그리고 `api` 객체에 다음 함수들을 추가:
```javascript
  var api = {
    FIELD_VALUES: FIELD_VALUES,
    REQUIRED_FIELDS: REQUIRED_FIELDS,
    OPTIONAL_FIELDS: OPTIONAL_FIELDS,
    parseFilterState: parseFilterState,
    serializeFilterState: serializeFilterState,
    hasRequiredFields: hasRequiredFields,
    // 규칙 매칭
    SEGMENT_AREA_WEIGHTS: SEGMENT_AREA_WEIGHTS,
    ruleMatches: ruleMatches,
    scoreRule: scoreRule,
    classifyRules: classifyRules
  };
```

- [ ] **Step 2: 커밋**

```bash
git add js/cost-personalizer.js
git commit -m "feat: add rule matching, scoring, and classification logic"
```

---

### Task 8: `js/test-cost-personalizer.html` 브라우저 테스트 하네스

**Files:**
- Create: `js/test-cost-personalizer.html`

- [ ] **Step 1: 테스트 하네스 작성**

Create `js/test-cost-personalizer.html`:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>cost-personalizer tests</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 20px; background: #fafafa; }
    h1 { font-size: 20px; }
    .test { padding: 6px 10px; margin: 4px 0; border-left: 4px solid #ccc; }
    .pass { border-left-color: #3F8A5C; background: #f0f7f3; }
    .fail { border-left-color: #B8473D; background: #fbf0ee; }
    .summary { margin-top: 20px; padding: 10px; font-weight: bold; }
  </style>
</head>
<body>
  <h1>cost-personalizer.js — 단위 테스트</h1>
  <div id="results"></div>
  <div class="summary" id="summary"></div>

  <script src="cost-personalizer.js"></script>
  <script>
    var results = document.getElementById('results');
    var summary = document.getElementById('summary');
    var passed = 0, failed = 0;

    function assert(name, actual, expected) {
      var ok;
      if (typeof expected === 'object') {
        ok = JSON.stringify(actual) === JSON.stringify(expected);
      } else {
        ok = actual === expected;
      }
      var div = document.createElement('div');
      div.className = 'test ' + (ok ? 'pass' : 'fail');
      div.textContent = (ok ? '✓ ' : '✗ ') + name +
        (ok ? '' : ' | expected: ' + JSON.stringify(expected) + ' | got: ' + JSON.stringify(actual));
      results.appendChild(div);
      if (ok) passed++; else failed++;
    }

    var P = window.CostPersonalizer;

    // parseFilterState
    assert('parseFilterState: 빈 쿼리 → 빈 상태',
      P.parseFilterState(''),
      {});
    assert('parseFilterState: 전체 필드',
      P.parseFilterState('?s=s4&income=50-70&home=rent&dep=1&region=metro'),
      { s: 's4', income: '50-70', home: 'rent', dep: '1', region: 'metro' });
    assert('parseFilterState: 잘못된 값 무시',
      P.parseFilterState('?s=s9&income=banana&home=rent'),
      { home: 'rent' });
    assert('parseFilterState: 일부 필드만',
      P.parseFilterState('?s=s1&home=rent'),
      { s: 's1', home: 'rent' });

    // serializeFilterState
    assert('serializeFilterState: 전체',
      P.serializeFilterState({ s: 's4', income: '50-70', home: 'rent', dep: '1', region: 'metro' }),
      '?s=s4&income=50-70&home=rent&dep=1&region=metro');
    assert('serializeFilterState: 민감정보 제외',
      P.serializeFilterState({ s: 's4', income: '50-70', home: 'rent', dep: '1', region: 'metro' }, { excludeSensitive: true }),
      '?s=s4&home=rent&region=metro');
    assert('serializeFilterState: 빈 상태',
      P.serializeFilterState({}),
      '');

    // hasRequiredFields
    assert('hasRequiredFields: 충족',
      P.hasRequiredFields({ s: 's1', income: '0-30', home: 'rent' }),
      true);
    assert('hasRequiredFields: 하나 부족',
      P.hasRequiredFields({ s: 's1', home: 'rent' }),
      false);
    assert('hasRequiredFields: 빈 상태',
      P.hasRequiredFields({}),
      false);

    // ruleMatches
    var sampleRule = {
      id: 'test-rule',
      conditions: { home: ['rent'], income: ['0-30', '30-50'] }
    };
    assert('ruleMatches: 모든 조건 충족',
      P.ruleMatches(sampleRule, { home: 'rent', income: '30-50' }),
      true);
    assert('ruleMatches: 한 조건 불일치',
      P.ruleMatches(sampleRule, { home: 'own', income: '30-50' }),
      false);
    assert('ruleMatches: 조건 없는 규칙은 항상 매칭',
      P.ruleMatches({ conditions: {} }, { s: 's1' }),
      true);
    assert('ruleMatches: 옵션 필드는 사용자 미선택 시 스킵',
      P.ruleMatches({ conditions: { region: ['metro'] } }, { s: 's1' }),
      true);

    // scoreRule
    var ruleA = { priority: 3, areaRef: '01-year-end-tax', conditions: { home: ['rent'] } };
    var scoreA = P.scoreRule(ruleA, { s: 's4', home: 'rent' });
    // priority 3 * 10 + segment weight (s4, area 01 = ★★★ = 3) = 33
    assert('scoreRule: priority 3 + s4/01 가중치',
      scoreA,
      33);

    var ruleB = { priority: 2, areaRef: '08-transport', conditions: { region: ['metro'] } };
    var scoreB = P.scoreRule(ruleB, { s: 's1', region: 'metro' });
    // priority 2 * 10 + optional match bonus 3 + s1/08 weight 3 = 26
    assert('scoreRule: 옵션 매칭 보너스',
      scoreB,
      26);

    // classifyRules
    var rules = [
      { id: 'r1', priority: 3, areaRef: '01-year-end-tax', conditions: { home: ['rent'] } },
      { id: 'r2', priority: 3, areaRef: '07-public-support', conditions: { home: ['own'] } },
      { id: 'r3', priority: 2, areaRef: '04-telecom', conditions: {} }
    ];
    var classified = P.classifyRules(rules, { s: 's4', income: '50-70', home: 'rent' });
    assert('classifyRules: top3 개수',
      classified.top3.length,
      2); // r1 매칭, r3 매칭
    assert('classifyRules: notApplicable 개수',
      classified.notApplicable.length,
      1); // r2 (home 정반대)
    assert('classifyRules: top3 첫 규칙은 r1 (가중치 가장 높음)',
      classified.top3[0].id,
      'r1');

    summary.textContent = '총 ' + (passed + failed) + '개 중 ' + passed + '개 통과, ' + failed + '개 실패';
    summary.style.color = failed === 0 ? '#3F8A5C' : '#B8473D';
  </script>
</body>
</html>
```

- [ ] **Step 2: 테스트 실행**

```bash
cd C:/Users/USER/projects/finance-coffee-chat
python -m http.server 8080
```

브라우저에서 `http://localhost:8080/js/test-cost-personalizer.html` 방문. 모든 테스트 PASS 확인 (녹색).

- [ ] **Step 3: 커밋**

```bash
git add js/test-cost-personalizer.html
git commit -m "test: add browser test harness for cost-personalizer pure functions"
```

---

## Phase C — 필터 위젯 (UI + 상호작용)

### Task 9: 필터 위젯 CSS 추가

**Files:**
- Modify: `cost-optimization.html` (기존 `<style>` 블록 하단 `@media` 블록 직전)

- [ ] **Step 1: CSS 블록 삽입**

`cost-optimization.html` 의 `<style>` 블록 내부, `.subnav` 관련 규칙 **바로 다음**에 다음 CSS를 추가:

```css
    /* ── 개인화 필터 위젯 ── */
    .personalizer {
      background: var(--white);
      border: 1px solid rgba(196,133,60,0.2);
      border-radius: 14px;
      padding: 24px 28px;
      margin-bottom: 32px;
      box-shadow: 0 4px 14px rgba(44,24,16,0.04);
    }
    .personalizer-title {
      font-family: 'Playfair Display', serif;
      font-size: 22px;
      color: var(--espresso);
      margin-bottom: 6px;
    }
    .personalizer-desc {
      font-size: 14px;
      color: var(--medium-roast);
      margin-bottom: 18px;
    }
    .filter-row {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .filter-label {
      min-width: 88px;
      font-size: 14px;
      font-weight: 600;
      color: var(--dark-roast);
      padding-top: 6px;
    }
    .filter-chips {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      flex: 1;
    }
    .chip {
      padding: 8px 14px;
      border-radius: 999px;
      border: 1px solid rgba(44,24,16,0.15);
      background: var(--oat-milk);
      color: var(--dark-roast);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s ease;
      min-height: 36px;
      user-select: none;
    }
    .chip:hover { border-color: var(--caramel); }
    .chip.selected {
      background: var(--caramel);
      color: var(--white);
      border-color: var(--caramel);
      font-weight: 600;
    }
    .filter-more-toggle {
      margin: 10px 0;
      padding: 6px 12px;
      background: none;
      border: 1px dashed rgba(196,133,60,0.4);
      border-radius: 8px;
      color: var(--medium-roast);
      font-size: 13px;
      cursor: pointer;
    }
    .filter-more-toggle:hover { color: var(--caramel); border-color: var(--caramel); }
    .filter-more { display: none; }
    .filter-more.expanded { display: block; }
    .filter-actions {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px dashed rgba(44,24,16,0.1);
      flex-wrap: wrap;
    }
    .filter-btn {
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid rgba(44,24,16,0.15);
      background: var(--white);
      color: var(--dark-roast);
      font-size: 13px;
      cursor: pointer;
    }
    .filter-btn:hover { border-color: var(--caramel); color: var(--caramel); }
    .filter-mask-checkbox {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--medium-roast);
    }
    .privacy-notice {
      margin-top: 12px;
      padding: 10px 14px;
      background: rgba(63,138,92,0.06);
      border-radius: 8px;
      font-size: 12px;
      color: var(--medium-roast);
      line-height: 1.5;
    }
    .toast {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--espresso);
      color: var(--white);
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 13px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
      z-index: 1000;
    }
    .toast.visible { opacity: 1; }

    /* ── 맞춤 요약 섹션 ── */
    .recommend-section {
      background: linear-gradient(180deg, rgba(196,133,60,0.08) 0%, var(--white) 100%);
      border: 1px solid rgba(196,133,60,0.25);
      border-radius: 14px;
      padding: 24px 28px;
      margin-bottom: 32px;
    }
    .recommend-section.empty {
      background: var(--oat-milk);
      border-style: dashed;
      text-align: center;
      color: var(--medium-roast);
    }
    .recommend-title {
      font-family: 'Playfair Display', serif;
      font-size: 22px;
      color: var(--espresso);
      margin-bottom: 6px;
    }
    .recommend-subtitle {
      font-size: 13px;
      color: var(--medium-roast);
      margin-bottom: 20px;
    }
    .recommend-top-label {
      font-size: 14px;
      font-weight: 700;
      color: var(--dark-roast);
      margin-bottom: 10px;
    }
    .recommend-cards {
      display: grid;
      gap: 12px;
      margin-bottom: 20px;
    }
    .recommend-card {
      display: block;
      padding: 16px 18px;
      border-radius: 10px;
      background: var(--white);
      border: 1px solid rgba(44,24,16,0.1);
      color: var(--espresso);
      text-decoration: none;
      transition: border-color 0.15s ease, transform 0.15s ease;
    }
    .recommend-card:hover {
      border-color: var(--caramel);
      transform: translateX(2px);
    }
    .recommend-card-area {
      display: inline-block;
      font-size: 11px;
      padding: 2px 8px;
      background: var(--caramel-light);
      color: var(--caramel);
      border-radius: 999px;
      margin-bottom: 6px;
    }
    .recommend-card-title {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .recommend-card-saving {
      font-size: 13px;
      color: var(--green);
      margin-bottom: 4px;
    }
    .recommend-card-link {
      font-size: 12px;
      color: var(--caramel);
    }
    .recommend-extended {
      margin-top: 10px;
    }
    .recommend-extended-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--dark-roast);
      margin-bottom: 8px;
    }
    .recommend-extended-list {
      display: grid;
      gap: 8px;
    }
    .recommend-extended-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      background: var(--white);
      border: 1px solid rgba(44,24,16,0.08);
      border-radius: 8px;
      font-size: 13px;
      color: var(--dark-roast);
      text-decoration: none;
    }
    .recommend-extended-item:hover { border-color: var(--caramel); }
    .recommend-notapplicable {
      margin-top: 16px;
    }
    .recommend-notapplicable-toggle {
      font-size: 12px;
      color: var(--medium-roast);
      cursor: pointer;
      background: none;
      border: none;
      padding: 4px 0;
      text-decoration: underline;
    }
    .recommend-notapplicable-list {
      display: none;
      margin-top: 8px;
      padding: 10px 14px;
      background: rgba(44,24,16,0.04);
      border-radius: 8px;
      font-size: 12px;
      color: var(--medium-roast);
      line-height: 1.8;
    }
    .recommend-notapplicable.expanded .recommend-notapplicable-list { display: block; }

    /* ── 세그먼트/영역 카드 필터 적용 상태 ── */
    .segment-card.my-segment {
      border-color: var(--caramel);
      box-shadow: 0 0 0 2px var(--caramel-light);
    }
    .segment-card.my-segment::before {
      content: '내 유형';
      position: absolute;
      top: -10px;
      right: 14px;
      background: var(--caramel);
      color: var(--white);
      font-size: 11px;
      padding: 3px 10px;
      border-radius: 999px;
      font-weight: 600;
    }
    .matrix-table tr.my-row td,
    .matrix-table tr.my-row th {
      background: var(--caramel-light);
    }

    @media (max-width: 600px) {
      .personalizer { padding: 16px; }
      .filter-row { flex-direction: column; gap: 8px; }
      .filter-label { min-width: auto; padding-top: 0; }
      .chip { min-height: 44px; padding: 10px 14px; }
      .filter-actions { flex-direction: column; align-items: stretch; }
      .filter-btn { width: 100%; text-align: center; }
    }
```

- [ ] **Step 2: 브라우저에서 CSS 로딩 확인**

`http://localhost:8080/cost-optimization.html` 방문, DevTools Elements에서 `.personalizer` 관련 규칙이 적용 준비되어 있는지만 확인 (아직 마크업 없음, 에러만 없으면 OK).

- [ ] **Step 3: 커밋**

```bash
git add cost-optimization.html
git commit -m "feat: add CSS for personalizer filter widget and recommend section"
```

---

### Task 10: 필터 위젯 HTML 마크업 추가 + personalizer 스크립트 연결

**Files:**
- Modify: `cost-optimization.html` (히어로 바로 아래 섹션 삽입, `<body>` 닫기 직전 스크립트 추가)

- [ ] **Step 1: 필터 위젯 섹션 마크업 삽입**

`cost-optimization.html` 의 히어로 `</header>` (L294 근처) 바로 **다음**, 기존 Section 1 `<section class="section">` **바로 앞**에 다음을 삽입:

```html
    <section class="section" id="personalizerSection" aria-label="내 상황 필터">
      <div class="personalizer">
        <div class="personalizer-title">내 상황 알려주기</div>
        <div class="personalizer-desc">아래 3~5개 질문이면 딱 맞는 가이드를 뽑아드려요.</div>

        <div class="filter-row">
          <div class="filter-label">가구 유형</div>
          <div class="filter-chips" data-field="s">
            <button type="button" class="chip" data-value="s1">청년 단독</button>
            <button type="button" class="chip" data-value="s2">신혼 맞벌이</button>
            <button type="button" class="chip" data-value="s3">신혼 외벌이</button>
            <button type="button" class="chip" data-value="s4">유자녀 1자녀</button>
            <button type="button" class="chip" data-value="s5">유자녀 다자녀</button>
            <button type="button" class="chip" data-value="s6">중장년 단독</button>
          </div>
        </div>

        <div class="filter-row">
          <div class="filter-label">연봉 구간</div>
          <div class="filter-chips" data-field="income">
            <button type="button" class="chip" data-value="0-30">~3천만</button>
            <button type="button" class="chip" data-value="30-50">3천~5천</button>
            <button type="button" class="chip" data-value="50-70">5천~7천</button>
            <button type="button" class="chip" data-value="70-100">7천~1억</button>
            <button type="button" class="chip" data-value="100+">1억+</button>
          </div>
        </div>

        <div class="filter-row">
          <div class="filter-label">주거</div>
          <div class="filter-chips" data-field="home">
            <button type="button" class="chip" data-value="own">자가</button>
            <button type="button" class="chip" data-value="jeonse">전세</button>
            <button type="button" class="chip" data-value="rent">월세</button>
          </div>
        </div>

        <button type="button" class="filter-more-toggle" id="filterMoreToggle" aria-expanded="false">
          더 정확히 보려면 2문항 더 ▼
        </button>

        <div class="filter-more" id="filterMore">
          <div class="filter-row">
            <div class="filter-label">부양가족</div>
            <div class="filter-chips" data-field="dep">
              <button type="button" class="chip" data-value="0">0명</button>
              <button type="button" class="chip" data-value="1">1명</button>
              <button type="button" class="chip" data-value="2">2명</button>
              <button type="button" class="chip" data-value="3">3명 이상</button>
            </div>
          </div>
          <div class="filter-row">
            <div class="filter-label">거주권역</div>
            <div class="filter-chips" data-field="region">
              <button type="button" class="chip" data-value="metro">수도권</button>
              <button type="button" class="chip" data-value="nonmetro">비수도권</button>
            </div>
          </div>
        </div>

        <div class="filter-actions">
          <button type="button" class="filter-btn" id="filterReset" data-ga="click_filter_reset" data-ga-loc="cost_hub_filter">🔄 초기화</button>
          <button type="button" class="filter-btn" id="filterShare" data-ga="click_filter_share" data-ga-loc="cost_hub_filter">🔗 이 결과 공유</button>
          <label class="filter-mask-checkbox">
            <input type="checkbox" id="filterShareMask" checked>
            민감정보(연봉·부양가족) 제외
          </label>
        </div>

        <div class="privacy-notice">
          🔒 이 정보는 URL에만 담깁니다. 사이트나 브라우저 저장소에 저장되지 않으며, 탭을 닫는 순간 우리 쪽에는 어떤 흔적도 남지 않습니다.
        </div>
      </div>

      <div class="recommend-section empty" id="recommendSection">
        <div class="recommend-title">내 맞춤 요약</div>
        <div class="recommend-subtitle">👉 내 상황 3가지만 골라주시면 맞춤 추천이 여기에 나타나요</div>
      </div>
    </section>

    <div class="toast" id="toast">링크가 복사되었어요</div>
```

- [ ] **Step 2: personalizer 스크립트 태그 추가**

`cost-optimization.html` 의 `</body>` **바로 앞**에 다음 추가:

```html
  <script src="js/cost-personalizer.js"></script>
  <script src="js/cost-personalizer-init.js"></script>
```

(Note: 초기화 스크립트는 Task 11에서 생성)

- [ ] **Step 3: 브라우저 확인**

`http://localhost:8080/cost-optimization.html` 방문. 히어로 아래에 필터 위젯 UI가 보이고, 빈 "내 맞춤 요약" 카드가 그 아래에 노출됨. 칩 클릭은 아직 반응 없음 (다음 태스크에서 연결).

- [ ] **Step 4: 커밋**

```bash
git add cost-optimization.html
git commit -m "feat: add personalizer filter widget markup"
```

---

### Task 11: `js/cost-personalizer-init.js` — 필터 위젯 동작 연결

**Files:**
- Create: `js/cost-personalizer-init.js`

- [ ] **Step 1: 초기화 스크립트 작성**

Create `js/cost-personalizer-init.js`:

```javascript
// Finance Coffee Chat — cost-optimization 페이지 초기화 스크립트
// cost-personalizer.js 의 API를 사용해 DOM과 URL 상태를 연결한다.

(function () {
  'use strict';

  var P = window.CostPersonalizer;
  if (!P) {
    console.error('[cost-personalizer-init] CostPersonalizer가 로드되지 않았습니다.');
    return;
  }

  var state = P.parseFilterState(window.location.search);
  var recommendationsPromise = null;

  // ── DOM 헬퍼 ──
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // ── URL 갱신 ──
  function updateUrl() {
    var query = P.serializeFilterState(state);
    var newUrl = window.location.pathname + query + window.location.hash;
    window.history.replaceState(null, '', newUrl);
  }

  // ── 필터 칩 렌더 ──
  function renderChipSelection() {
    $$('.filter-chips').forEach(function (group) {
      var field = group.getAttribute('data-field');
      $$('.chip', group).forEach(function (chip) {
        var value = chip.getAttribute('data-value');
        if (state[field] === value) {
          chip.classList.add('selected');
        } else {
          chip.classList.remove('selected');
        }
      });
    });
  }

  // ── "더 정확히 보려면" 토글 ──
  function updateMoreToggle() {
    var hasOptional = state.dep || state.region;
    var moreEl = $('#filterMore');
    var toggleEl = $('#filterMoreToggle');
    if (hasOptional) {
      moreEl.classList.add('expanded');
      toggleEl.setAttribute('aria-expanded', 'true');
      toggleEl.textContent = '접기 ▲';
    }
  }

  // ── 필터 칩 클릭 핸들러 ──
  function onChipClick(e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    var group = chip.closest('.filter-chips');
    var field = group.getAttribute('data-field');
    var value = chip.getAttribute('data-value');

    // 토글 동작
    if (state[field] === value) {
      delete state[field];
    } else {
      state[field] = value;
    }

    updateUrl();
    renderChipSelection();
    renderAll();

    // GA 이벤트
    if (window.gtag) {
      window.gtag('event', 'click_filter_chip', {
        click_text: field + ':' + value,
        click_location: 'cost_hub_filter'
      });
    }
  }

  // ── "더 정확히 보려면" 버튼 클릭 ──
  function onMoreToggleClick() {
    var moreEl = $('#filterMore');
    var toggleEl = $('#filterMoreToggle');
    var expanded = moreEl.classList.toggle('expanded');
    toggleEl.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    toggleEl.textContent = expanded ? '접기 ▲' : '더 정확히 보려면 2문항 더 ▼';

    if (expanded && window.gtag) {
      window.gtag('event', 'expand_filter_more', {
        click_location: 'cost_hub_filter'
      });
    }
  }

  // ── 초기화 버튼 ──
  function onResetClick() {
    state = {};
    updateUrl();
    renderChipSelection();
    renderAll();
  }

  // ── 공유 버튼 ──
  function onShareClick() {
    var mask = $('#filterShareMask').checked;
    var query = P.serializeFilterState(state, { excludeSensitive: mask });
    var url = window.location.origin + window.location.pathname + query;
    navigator.clipboard.writeText(url).then(function () {
      showToast();
      if (window.gtag) {
        window.gtag('event', 'click_filter_share', {
          click_text: mask ? 'masked' : 'full',
          click_location: 'cost_hub_filter'
        });
      }
    });
  }

  function showToast() {
    var toast = $('#toast');
    toast.classList.add('visible');
    setTimeout(function () { toast.classList.remove('visible'); }, 1800);
  }

  // ── 전체 렌더 (Task 13에서 확장) ──
  function renderAll() {
    // 빈 placeholder — Task 13/14에서 채움
  }

  // ── 이벤트 바인딩 ──
  document.addEventListener('click', function (e) {
    if (e.target.closest('.filter-chips .chip')) {
      onChipClick(e);
    }
  });
  $('#filterMoreToggle').addEventListener('click', onMoreToggleClick);
  $('#filterReset').addEventListener('click', onResetClick);
  $('#filterShare').addEventListener('click', onShareClick);

  // ── 초기 렌더 ──
  renderChipSelection();
  updateMoreToggle();
  renderAll();

  // state를 외부에서 접근할 수 있게 노출 (렌더러 Task 13/14용)
  window.CostPersonalizerInit = {
    getState: function () { return state; },
    rerender: renderAll
  };
})();
```

- [ ] **Step 2: 브라우저 수동 검증**

`http://localhost:8080/cost-optimization.html` 방문.

- 가구 유형 "S4" 칩 클릭 → URL이 `?s=s4` 로 변경되고 칩이 하이라이트됨
- 같은 칩 다시 클릭 → URL에서 `s` 제거, 하이라이트 해제
- "더 정확히 보려면 2문항 더 ▼" 클릭 → 부양가족·권역 필드 노출, 버튼 텍스트 "접기 ▲"
- 초기화 버튼 클릭 → 모든 선택 제거, URL 파라미터 비워짐
- 공유 버튼 클릭 → 클립보드에 URL 복사되고 "링크가 복사되었어요" 토스트 노출
- "민감정보 제외" 체크 해제 후 공유 → 전체 URL이 복사됨
- URL에 `?s=s4&dep=1` 직접 입력 후 새로고침 → 옵션 영역 자동 펼침 + dep 칩 하이라이트

- [ ] **Step 3: DevTools 프라이버시 검증**

DevTools > Application > Storage 에서 Local / Session / Cookies 모두 빈 상태 확인. Network 탭에서 필터 조작 시 GA 외 요청 없음 확인.

- [ ] **Step 4: 커밋**

```bash
git add js/cost-personalizer-init.js cost-optimization.html
git commit -m "feat: wire up filter widget click handlers and URL sync"
```

---

## Phase D — 렌더링

### Task 12: 맞춤 요약 섹션 렌더러

**Files:**
- Modify: `js/cost-personalizer-init.js`

- [ ] **Step 1: 규칙 로딩 함수 추가**

`js/cost-personalizer-init.js` 의 "state를 외부에서 접근할 수 있게 노출" **바로 앞**에 다음 함수들을 추가:

```javascript
  // ── 규칙 로딩 (한 번만 fetch, 캐시) ──
  function loadRecommendations() {
    if (recommendationsPromise) return recommendationsPromise;
    recommendationsPromise = fetch('data/cost-recommendations.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load recommendations');
        return res.json();
      })
      .then(function (data) { return data.rules || []; })
      .catch(function (err) {
        console.error('[cost-personalizer] 규칙 로딩 실패', err);
        return [];
      });
    return recommendationsPromise;
  }

  // ── 영역 번호 → 라벨 매핑 ──
  var AREA_LABELS = {
    '01': '01 연말정산',
    '02': '02 카드',
    '03': '03 보험',
    '04': '04 통신',
    '05': '05 금융수수료',
    '06': '06 공과금·구독',
    '07': '07 지원금',
    '08': '08 교통'
  };

  function getAreaLabel(areaRef) {
    var num = (areaRef || '').substring(0, 2);
    return AREA_LABELS[num] || areaRef;
  }

  // ── 필터 조합 시그니처 (GA용) ──
  function filterSignature() {
    return ['s', 'income', 'home', 'dep', 'region']
      .map(function (f) { return state[f] || '_'; })
      .join('_');
  }

  // ── 상태 요약 문구 ──
  var INCOME_LABELS = {
    '0-30': '3천만원 이하', '30-50': '3천~5천', '50-70': '5천~7천',
    '70-100': '7천~1억', '100+': '1억 초과'
  };
  var HOME_LABELS = { own: '자가', jeonse: '전세', rent: '월세' };
  var REGION_LABELS = { metro: '수도권', nonmetro: '비수도권' };

  function stateSummaryText() {
    var parts = [];
    if (state.income) parts.push(INCOME_LABELS[state.income]);
    if (state.home) parts.push(HOME_LABELS[state.home]);
    if (state.region) parts.push(REGION_LABELS[state.region]);
    return parts.join(' · ') + ' 독자에게';
  }

  // ── 맞춤 요약 섹션 렌더 ──
  var lastRenderedSignature = null;

  function renderRecommendSection() {
    var section = $('#recommendSection');
    if (!P.hasRequiredFields(state)) {
      section.className = 'recommend-section empty';
      section.innerHTML =
        '<div class="recommend-title">내 맞춤 요약</div>' +
        '<div class="recommend-subtitle">👉 내 상황 3가지만 골라주시면 맞춤 추천이 여기에 나타나요</div>';
      return;
    }

    loadRecommendations().then(function (rules) {
      var classified = P.classifyRules(rules, state);
      section.className = 'recommend-section';

      if (classified.top3.length === 0) {
        section.innerHTML =
          '<div class="recommend-title">내 맞춤 요약</div>' +
          '<div class="recommend-subtitle">🤔 아직 이 조합에 맞는 규칙이 준비되지 않았어요. 아래 전체 카탈로그를 참고해 주세요.</div>';
        return;
      }

      var topCardsHtml = classified.top3.map(function (rule) {
        return (
          '<a class="recommend-card" href="' + rule.linkHref + '" ' +
          'data-ga="click_recommendation" data-ga-text="' + rule.id + '" data-ga-loc="cost_hub_recommend">' +
          '<span class="recommend-card-area">' + getAreaLabel(rule.areaRef) + '</span>' +
          '<div class="recommend-card-title">' + rule.title + '</div>' +
          '<div class="recommend-card-saving">💰 ' + rule.savingHint + '</div>' +
          '<div class="recommend-card-link">' + (rule.linkLabel || '자세히 →') + '</div>' +
          '</a>'
        );
      }).join('');

      var extendedHtml = '';
      if (classified.extended.length > 0) {
        extendedHtml =
          '<div class="recommend-extended">' +
          '<div class="recommend-extended-title">💡 챙길 만한 것 ' + classified.extended.length + '개</div>' +
          '<div class="recommend-extended-list">' +
          classified.extended.map(function (rule) {
            return (
              '<a class="recommend-extended-item" href="' + rule.linkHref + '" ' +
              'data-ga="click_recommendation" data-ga-text="' + rule.id + '" data-ga-loc="cost_hub_recommend">' +
              '<span>' + rule.title + '</span>' +
              '<span style="color: var(--green); font-size: 12px;">' + rule.savingHint + '</span>' +
              '</a>'
            );
          }).join('') +
          '</div></div>';
      }

      var notApplicableHtml = '';
      if (classified.notApplicable.length > 0) {
        notApplicableHtml =
          '<div class="recommend-notapplicable" id="recommendNotApplicable">' +
          '<button class="recommend-notapplicable-toggle" type="button">' +
          '🚫 이번엔 해당 없음 ' + classified.notApplicable.length + '개 보기' +
          '</button>' +
          '<div class="recommend-notapplicable-list">' +
          classified.notApplicable.map(function (rule) {
            return '▸ ' + rule.title + ' — <em>' + rule.savingHint + '</em>';
          }).join('<br>') +
          '</div></div>';
      }

      section.innerHTML =
        '<div class="recommend-title">' + stateSummaryText() + '</div>' +
        '<div class="recommend-subtitle">필터 조건에 맞춰 우선순위로 정렬했어요.</div>' +
        '<div class="recommend-top-label">📌 지금 바로 챙길 액션 TOP ' + classified.top3.length + '</div>' +
        '<div class="recommend-cards">' + topCardsHtml + '</div>' +
        extendedHtml +
        notApplicableHtml;

      // 해당없음 토글 바인딩
      var notApplicableEl = $('#recommendNotApplicable');
      if (notApplicableEl) {
        notApplicableEl.querySelector('.recommend-notapplicable-toggle').addEventListener('click', function () {
          notApplicableEl.classList.toggle('expanded');
        });
      }

      // view_recommendation_rendered (필터 조합이 바뀔 때마다 발화)
      var sig = filterSignature();
      if (sig !== lastRenderedSignature && window.gtag) {
        window.gtag('event', 'view_recommendation_rendered', {
          click_text: sig,
          click_location: 'cost_hub_recommend'
        });
        lastRenderedSignature = sig;
      }
    });
  }
```

- [ ] **Step 2: `renderAll` 함수에 호출 추가**

`js/cost-personalizer-init.js` 의 기존 `renderAll` 을 다음으로 교체:

```javascript
  function renderAll() {
    renderRecommendSection();
    // Task 14에서 renderExistingSections() 추가
  }
```

- [ ] **Step 3: 브라우저 수동 검증**

`http://localhost:8080/cost-optimization.html` 방문.

1. 필터 없음 → "내 맞춤 요약" 빈 상태 카드 노출
2. S1 + 3천~5천 + 월세 선택 → TOP 3 카드 렌더, `청년월세 지원금` / `월세세액공제 신청` / `알뜰폰 전환` 등 노출
3. "🚫 이번엔 해당 없음" 버튼 클릭 → 해당없음 리스트 토글
4. 필터 초기화 → 빈 상태 카드로 복귀
5. S4 + 5천~7천 + 자가 + 부양가족 2명 → 자녀 세액공제, 재산세 감면 등이 상위에 노출되는지 확인

- [ ] **Step 4: 커밋**

```bash
git add js/cost-personalizer-init.js
git commit -m "feat: render recommend section with top3/extended/not-applicable"
```

---

### Task 13: 세그먼트 카드 / 영역 카드 / 매트릭스 행 하이라이트 & 재정렬

**Files:**
- Modify: `js/cost-personalizer-init.js`, `cost-optimization.html`

- [ ] **Step 1: 기존 섹션 렌더 함수 추가**

`js/cost-personalizer-init.js` 의 `renderRecommendSection` 함수 **바로 아래**에 다음을 추가:

```javascript
  // ── 기존 섹션 렌더 (세그먼트 카드, 영역 카드, 매트릭스 행) ──
  function renderExistingSections() {
    renderSegmentCards();
    renderAreaCards();
    renderMatrixRow();
    updateGaLocForCardsAndAreas();
  }

  function renderSegmentCards() {
    $$('.segment-card').forEach(function (card) {
      card.classList.remove('my-segment');
      var href = card.getAttribute('href') || '';
      // href 예: "cost/s4-parent-1child.html"
      var match = href.match(/\/(s\d)-/);
      var seg = match ? match[1] : null;
      if (seg && seg === state.s) {
        card.classList.add('my-segment');
      }
    });
  }

  function renderAreaCards() {
    var grid = $('.area-grid');
    if (!grid) return;
    var cards = $$('.area-card', grid);
    if (!state.s || !P.SEGMENT_AREA_WEIGHTS[state.s]) {
      // 원래 순서로 복구
      cards.sort(function (a, b) {
        return a.dataset.originalOrder - b.dataset.originalOrder;
      });
      cards.forEach(function (card) { grid.appendChild(card); });
      return;
    }
    var weights = P.SEGMENT_AREA_WEIGHTS[state.s];
    cards.sort(function (a, b) {
      var areaA = (a.getAttribute('href') || '').match(/area-(\d{2})/);
      var areaB = (b.getAttribute('href') || '').match(/area-(\d{2})/);
      var wA = areaA ? (weights[areaA[1]] || 0) : 0;
      var wB = areaB ? (weights[areaB[1]] || 0) : 0;
      return wB - wA;
    });
    cards.forEach(function (card) { grid.appendChild(card); });
  }

  function renderMatrixRow() {
    $$('.matrix-table tbody tr').forEach(function (row) {
      row.classList.remove('my-row');
    });
    if (!state.s) return;
    var segIndex = { s1: 0, s2: 1, s3: 2, s4: 3, s5: 4, s6: 5 }[state.s];
    if (segIndex == null) return;
    var row = $$('.matrix-table tbody tr')[segIndex];
    if (row) row.classList.add('my-row');
  }

  function updateGaLocForCardsAndAreas() {
    var loc = P.hasRequiredFields(state) ? 'cost_hub_filtered' : 'cost_hub';
    $$('.segment-card, .area-card').forEach(function (el) {
      el.setAttribute('data-ga-loc', loc);
    });
  }

  // 초기 영역 카드 순서 기록 (첫 렌더 전에 한 번만)
  (function captureOriginalOrder() {
    $$('.area-grid .area-card').forEach(function (card, i) {
      card.dataset.originalOrder = i;
    });
  })();
```

- [ ] **Step 2: `renderAll` 업데이트**

기존 `renderAll` 을:
```javascript
  function renderAll() {
    renderRecommendSection();
    // Task 14에서 renderExistingSections() 추가
  }
```
→
```javascript
  function renderAll() {
    renderRecommendSection();
    renderExistingSections();
  }
```

- [ ] **Step 3: 브라우저 수동 검증**

`http://localhost:8080/cost-optimization.html` 방문.

1. 필터 없음 → 세그먼트 카드 하이라이트 없음, 영역 카드 원래 순서, 매트릭스 행 하이라이트 없음
2. S1 선택 → S1 카드에 "내 유형" 배지 + 강조 테두리, 매트릭스 첫 행 배경 하이라이트, 영역 카드가 S1 가중치 순(01연말정산·04통신·07지원금·08교통 = ★★★ 상단, 나머지 하단)으로 재정렬
3. 필수 3필드 충족 시 세그먼트/영역 카드 `data-ga-loc="cost_hub_filtered"` (DevTools로 확인)
4. 미충족 시 `cost_hub` 유지
5. 필터 초기화 → 원래 순서로 복원

- [ ] **Step 4: 커밋**

```bash
git add js/cost-personalizer-init.js
git commit -m "feat: highlight my segment/row and re-sort area cards by priority"
```

---

### Task 14: 전역 GA 클릭 위임 스크립트 `cost-optimization.html`에 추가

**Files:**
- Modify: `cost-optimization.html`

- [ ] **Step 1: 전역 GA 위임 스크립트 추가**

`cost-optimization.html` 의 `<script src="js/cost-personalizer.js"></script>` **바로 앞**에 다음 추가:

```html
  <script>
  // 전역 GA 클릭 위임 — 다른 페이지와 동일 패턴
  document.addEventListener('click', function(e) {
    var el = e.target.closest('[data-ga]');
    if (!el) return;
    if (typeof gtag !== 'function') return;
    gtag('event', el.dataset.ga, {
      click_text: el.dataset.gaText || el.textContent.trim().substring(0, 50),
      click_location: el.dataset.gaLoc || 'unknown'
    });
  });
  </script>
```

(Note: `cost-personalizer-init.js` 는 일부 이벤트(`click_filter_chip`, `view_recommendation_rendered` 등)를 직접 `gtag()` 호출로 발화한다. 마크업에 `data-ga`가 있는 버튼들(`#filterReset`, `#filterShare`)은 전역 위임이 처리한다.)

- [ ] **Step 2: GA 발화 검증**

DevTools Network 탭을 열고 `g/collect` 또는 `analytics.google.com` 필터.
1. 필터 칩 클릭 → `click_filter_chip` 이벤트 요청 확인
2. 추천 카드 클릭 → `click_recommendation` 이벤트 확인
3. 공유 버튼 → `click_filter_share` 확인
4. "더 정확히 보려면" → `expand_filter_more` 확인
5. 초기화 → `click_filter_reset` 확인
6. 필수 3필드 충족 시 첫 렌더 → `view_recommendation_rendered` 확인

- [ ] **Step 3: 커밋**

```bash
git add cost-optimization.html
git commit -m "feat: add global GA click delegation to cost-optimization"
```

---

## Phase E — 검증 & 마무리

### Task 15: 스펙의 전체 검증 체크리스트 수행

**Files:** (변경 없음, 검증만)

- [ ] **Step 1: URL 쿼리 왕복**
  - [ ] `?s=s4&income=50-70&home=rent&dep=1&region=metro` 붙여넣기 → 모든 칩 하이라이트 복원, 옵션 영역 자동 펼침
  - [ ] 칩 클릭 → URL 즉시 반영, back 버튼 1회로 이전 페이지 복귀
  - [ ] `?income=banana` → 필터 상태 비움, 에러 콘솔 없음
  - [ ] `?s=s3` 단독 → 세그먼트 카드 하이라이트 + 매트릭스 행 하이라이트, 영역 재정렬, 맞춤 요약은 빈 상태 (income/home 미충족)
  - [ ] URL 인코딩 확인 (한글 파라미터 들어가도 깨지지 않음 — 다만 우리 필드는 ASCII라 실제 영향 없음)

- [ ] **Step 2: 필터 위젯 20개 칩**
  - [ ] 6 + 5 + 3 + 4 + 2 = 20개 칩 전부 클릭 가능
  - [ ] 토글 해제 동작
  - [ ] "더 정확히 보려면" 버튼 동작
  - [ ] 초기화 버튼 동작

- [ ] **Step 3: 맞춤 요약 섹션**
  - [ ] 필수 미충족 → 빈 상태
  - [ ] 충족 → TOP 3 + 확장 + 해당없음
  - [ ] 추천 카드 클릭 시 하위 페이지로 이동
  - [ ] 여러 필터 조합 시도 (S1/청년월세, S4/자녀공제, S5/다자녀감면, S6/연금공제) — 각 조합에서 예상 규칙이 상위에 노출되는지

- [ ] **Step 4: 기존 요소 재정렬**
  - [ ] 세그먼트 카드 하이라이트 ("내 유형" 배지)
  - [ ] 영역 카드 가중치 순 재정렬
  - [ ] 매트릭스 내 행 배경 하이라이트

- [ ] **Step 5: 공유 버튼**
  - [ ] 기본 (마스킹 ON) → `income`/`dep` 제거된 URL 복사
  - [ ] 마스킹 OFF → 전체 URL
  - [ ] 토스트 노출

- [ ] **Step 6: GA 이벤트 6개 + 기존 loc 전환**
  - [ ] 6개 신규 이벤트 모두 발화
  - [ ] `click_segment`/`click_area` loc 필터 상태 반영

- [ ] **Step 7: UX 라이팅 잔재 점검**
  ```bash
  grep -rn "매트릭스\|6 세그먼트\|8 영역" C:/Users/USER/projects/finance-coffee-chat/ --include="*.html" --include="*.md"
  ```
  허용 잔재(본 plan/spec 파일, catalog README 표 설명 등) 외 0건.

- [ ] **Step 8: 반응형**
  - [ ] DevTools 모바일 뷰(375px) → 필터 칩 세로 stack, 터치 타겟 44px 이상, 맞춤 요약 카드 세로 stack

- [ ] **Step 9: 프라이버시**
  - [ ] DevTools > Application > Storage 비어있음
  - [ ] Network 탭 — 필터 조작 중 외부 요청은 GA + `data/cost-recommendations.json` 초기 fetch만

- [ ] **Step 10: 브라우저 호환성**
  - [ ] Chrome / Edge (최소)
  - [ ] 가능하면 Safari / 삼성 브라우저 (모바일 뷰)

- [ ] **Step 11: test harness 최종 실행**

`http://localhost:8080/js/test-cost-personalizer.html` — 모든 테스트 PASS (녹색).

- [ ] **Step 12: 테스트 하네스 PASS & 검증 체크 완료 커밋**

검증 중 수정이 발생하면 그 커밋에 포함. 수정 없이 모두 통과했다면 검증용 커밋은 생략.

---

### Task 16: PR 및 배포 준비

**Files:** (변경 없음)

- [ ] **Step 1: 커밋 히스토리 리뷰**

```bash
cd C:/Users/USER/projects/finance-coffee-chat
git log --oneline main..HEAD
```

최소 13개 커밋 예상:
- docs: phase9 catalog intro
- docs: simulation subtitle
- docs: cost-optimization meta
- docs: cost-optimization hero
- feat: recommendations rule table
- feat: personalizer URL parse
- feat: personalizer matching
- test: test harness
- feat: filter widget CSS
- feat: filter widget markup
- feat: filter widget handlers
- feat: recommend section renderer
- feat: segment/area/matrix highlight
- feat: global GA delegation

- [ ] **Step 2: PR 본문 작성 & 생성**

```bash
gh pr create --title "feat: 비용 최적화 허브 개인화 & UX 리라이트" --body "$(cat <<'EOF'
## Summary
- URL 쿼리 기반 개인화 필터 위젯 추가 (세그먼트 + 연봉 + 주거 + 옵션 2필드)
- "내 맞춤 요약" 섹션 — TOP 3 액션 카드 + 확장 리스트 + 해당없음 명시
- `cost-optimization.html`의 "6×8 매트릭스" 용어 전면 리라이트
- localStorage/쿠키 미사용 — 기존 프라이버시 약속 유지

## Related
- Spec: `docs/superpowers/specs/2026-04-13-fcc-personalization-design.md`
- Plan: `docs/superpowers/plans/2026-04-13-fcc-personalization.md`

## Test plan
- [ ] `?s=s4&income=50-70&home=rent&dep=1&region=metro` URL 상태 복원
- [ ] 필터 칩 토글, 초기화, 공유(마스킹 ON/OFF)
- [ ] 맞춤 요약 TOP 3 + 확장 + 해당없음 렌더
- [ ] 세그먼트/영역 카드 하이라이트 & 재정렬
- [ ] 매트릭스 행 하이라이트
- [ ] GA 신규 이벤트 6개 발화 (DevTools Network)
- [ ] `grep "매트릭스\|6 세그먼트\|8 영역"` 잔재 0건
- [ ] `js/test-cost-personalizer.html` 전체 PASS
- [ ] DevTools Storage 비어있음 (프라이버시 검증)
- [ ] 모바일 375px 반응형
EOF
)"
```

- [ ] **Step 3: Vercel Preview 배포 확인**

PR 생성 직후 Vercel Preview URL이 댓글로 달림. 해당 URL에서 검증 체크리스트 재수행.

- [ ] **Step 4: (승인 후) main에 머지 & 프로덕션 배포 확인**

- 프로덕션 URL에서 GA 이벤트 발화 최종 확인
- Google Analytics Realtime 리포트에서 신규 이벤트 6개 노출 확인

---

## Self-Review

**Spec coverage check:**
- Section 1 (배경): Task 1~4 UX 리라이트가 커버 ✓
- Section 2 (목표/비목표): 전체 Task 범위 ✓
- Section 3 (프라이버시): Task 11 privacy-notice + Task 15 Step 9 ✓
- Section 4 (URL 스키마): Task 6 parseFilterState + Task 11 updateUrl ✓
- Section 5 (파일 구조): File Structure 표 + Task 5~8 생성 ✓
- Section 6 (UX 라이팅): Task 1~4 ✓
- Section 7 (필터 위젯): Task 9 CSS + Task 10 마크업 + Task 11 핸들러 ✓
- Section 8 (맞춤 요약): Task 12 렌더러 ✓
- Section 9 (기존 요소 재정렬): Task 13 ✓
- Section 10 (GA): Task 11/12/13 GA 발화 + Task 14 위임 ✓
- Section 11 (검증 체크리스트): Task 15 전부 매핑 ✓
- Section 12 (배포/롤백): Task 16 ✓

**Placeholder scan:** 모든 Task에 실제 코드 포함 완료. "TBD/구현 필요" 없음.

**Type consistency:**
- `parseFilterState` / `serializeFilterState` / `hasRequiredFields` / `classifyRules` / `ruleMatches` / `scoreRule` — Task 6, 7, 8, 11, 12, 13 에 걸쳐 일관된 시그니처
- `state` 객체 shape (`{s, income, home, dep, region}`) — 전 Task 일관
- `rule` 객체 shape — JSON (Task 5) ↔ 매칭 로직 (Task 7) ↔ 렌더러 (Task 12) 일관
- GA 이벤트명 6개 (`click_filter_chip`, `expand_filter_more`, `click_filter_reset`, `click_filter_share`, `click_recommendation`, `view_recommendation_rendered`) — Task 10/11/12/13/14 에 걸쳐 일관

**Scope:** 단일 페이지(`cost-optimization.html`) + 소스 오브 트루스 1개(`docs/phase9-cost-catalog/README.md`) + 시뮬레이션 subtitle 1줄. 집중된 범위 유지.
