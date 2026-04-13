# Cycle 3 Research Execution Plan — fcc 수익 잠재력

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cycle 3 리서치 (finance-coffee-chat 자체 수익 잠재력 조사분석)를 4축 병렬 에이전트로 실행하고, 전문 리포트 + 노션 101 요약 2개를 산출한다.

**Architecture:** Cycle 2와 동일한 병렬 에이전트 워크플로. 4개 독립 리서치 에이전트를 단일 메시지에서 병렬로 디스패치하고, 4개 결과를 주조정자가 단일 통합 리포트로 합성한다. 산출물은 Cycle 1/2와 같은 2개(마크다운 리포트 + 노션 child page).

**Tech Stack:** Agent tool (general-purpose), WebSearch/WebFetch, mcp__notion__API-post-page, Bash(git), Write, Edit.

**Spec reference:** `docs/superpowers/specs/2026-04-14-fcc-cycle-3-revenue-potential-design.md`

**이 플랜의 특수성:** 이 플랜은 소프트웨어 구현이 아닌 리서치 사이클 실행 플랜이다. TDD 대신 "에이전트 디스패치 → 결과 수령 → 합성 → 검증" 흐름으로 구성. 각 태스크는 원자적 액션(에이전트 1회 디스패치 / 파일 1회 작성 / 커밋 1회).

---

## File Structure

| 파일 | 역할 |
|---|---|
| `docs/research/finance-coffee-chat-direction/2026-04-14-cycle-3/cycle-3-final-report.md` | 4축 통합 최종 리포트 (Create) |
| 노션 child page (parent: `341ffe0b-d4b7-8136-94c8-df7eb4404ba5`) | 📘 101 요약 (Create via API) |

중간 raw 파일은 만들지 않는다 (Cycle 2 패턴). 에이전트 결과는 주조정자 컨텍스트에 직접 수령 후 바로 통합 리포트로 합성.

---

## Task 1: 리서치 디렉터리 생성

**Files:**
- Create: `docs/research/finance-coffee-chat-direction/2026-04-14-cycle-3/` (디렉터리)

- [ ] **Step 1: 디렉터리 생성**

Run:
```bash
mkdir -p "C:/Users/USER/projects/finance-coffee-chat/docs/research/finance-coffee-chat-direction/2026-04-14-cycle-3"
```
Expected: 디렉터리가 생성되거나 이미 존재 시 무시. Exit code 0.

- [ ] **Step 2: 생성 확인**

Run:
```bash
ls "C:/Users/USER/projects/finance-coffee-chat/docs/research/finance-coffee-chat-direction/"
```
Expected: `2026-04-13-cycle-1/` (없을 수 있음) 및 `2026-04-14-cycle-3/` 목록 표시. Cycle 1 리포트가 로컬에 없어도 무시.

---

## Task 2: 4개 리서치 에이전트 병렬 디스패치

**Files:** 없음 (에이전트 결과는 주조정자 컨텍스트에 수령)

**중요:** 4개 에이전트는 반드시 **단일 메시지**에서 병렬로 Agent tool을 호출해야 한다. 순차 실행 금지.

아래 4개 프롬프트는 완성본이므로 그대로 `prompt` 파라미터에 복사한다. 각 에이전트는 `subagent_type: "general-purpose"`.

- [ ] **Step 1: 축 A 에이전트 프롬프트 확정 (복사용)**

```
You are researching the revenue potential of a Korean finance website called "finance-coffee-chat" (fcc). Cycle 1 and Cycle 2 of this project focused on the personal brand of the operator (여태경, 40대 직장인, 2029 FIRE 목표). Cycle 3 deliberately removes that personal brand halo and evaluates fcc as an independent product.

**현 자산 (평가 대상)**:
- 공모주 DB: IPO 4기준(청약경쟁률·의무보유확약·공모가밴드·유통물량) 스코어링, 종목 상세, 캘린더 연동
- 비용 최적화: Phase 9의 6 가구 유형 × 8 절약 영역 카탈로그 + 2026-04-13 개인화 필터 + 48 세그먼트 계산기
- 투자 캘린더: IPO 일정, 배당락, 이벤트 페이지

**전제**:
- 여태경 개인 브랜드 후광 = 0 (Cycle 1/2 결론은 참고만)
- 현재 fcc 트래픽 = 0 출발 (업계 평균 성장률 가정)
- 법적 가드레일: 2024 개정 자본시장법상 유료 리딩방·개별 종목 추천 금지, 무료+교육+불특정다수는 안전

**너의 임무 — 축 A: 한국 유사 사이트 수익 모델 인벤토리**

한국어 WebSearch를 적극 활용해 아래 타겟들의 수익 모델을 조사하라.

**타겟 10곳**:
1. 토스피드 / 토스증권
2. 뱅크샐러드 블로그
3. 어피티 UPPITY
4. 38커뮤니케이션 (공모주 직접 경쟁)
5. 아이투자 itooza
6. 네이버 프리미엄 콘텐츠 (스노볼 등)
7. 한경 멤버스
8. 슈카월드
9. 김단테 이루다투자
10. 신사임당 오너클랜 (참고)

**각 사이트에 대해 조사**:
- 수익 모델 구성 (광고/구독/어필리엇/강의/데이터/B2B 등)과 비중
- 공개된 월/연 매출·구독자/MAU (없으면 업계 추정)
- 결정적 수익 엔진 1~2개
- fcc 3자산(공모주/비용/캘린더)과의 직접 연결성 점수 (0~5)

**심층 분해 3곳**: 공모주 / 비용 최적화 / 투자 캘린더 각 니치와 가장 직접 연결되는 사이트 1곳씩 선정해 비즈니스 모델 캔버스 수준으로 상세 분해 (고객 세그먼트·가치 제안·채널·수익원·비용 구조).

**마지막 섹션 — 한국 TAM 간이 추정**:
- 공모주 검색/관심 유저: 월간 활성 유저 추정 (네이버 검색량·38커뮤니케이션 MAU 등 단서 활용)
- 비용 최적화 검색/관심 유저: "절세", "카드 혜택", "통신비 절약" 등 대표 키워드 월 검색량
- 투자 캘린더 검색/관심 유저: "배당락일", "IPO 일정" 월 검색량
- 각 수치에 "공개치 / 업계 추정 / 가설" 라벨 강제

**출력 형식**:
- 마크다운, 한국어, ≤800 단어
- 구조: (1) TL;DR 3문장, (2) 10곳 비교표, (3) 심층 분해 3곳, (4) 한국 TAM 간이 추정 섹션, (5) fcc 이식 가능성 Top 3 + 근거, (6) 사용한 출처 링크
- 모든 수치에 라벨 강제
```

- [ ] **Step 2: 축 B 에이전트 프롬프트 확정**

```
You are researching Korean market unit economics for finance website monetization models. Context: a project named finance-coffee-chat is evaluating whether it can stand as an independent business. This axis (B) must produce numbers — CPM, conversion rates, ARPU, retention — for every realistic monetization model in the Korean market.

**전제**:
- 여태경 개인 브랜드 후광 = 0
- 한국 시장 데이터만 (해외는 참고용)
- Cycle 2에서 이미 확인한 숫자:
  - 뉴스레터 유료 전환 의향 35~47% (미디어오늘)
  - 한국 유료 구독 벤치: 롱블랙 4,900 / 조선멤버십 5,900 / 한경멤버스 1~3만
  - 40대 뉴스레터 만족도 80.6%, 이용률 6.4%

**너의 임무 — 축 B: 수익 모델별 한국 KPI 벤치마크**

**조사 대상 모델 9개와 핵심 KPI**:

1. **디스플레이 광고 (구글 애드센스 등)**: 한국 CPM·CPC, 금융 니치 프리미엄, Taboola/Outbrain 단가
2. **네이버 프리미엄 콘텐츠**: 입점 수수료·ARPU·월 구독료·정산 비율
3. **뉴스레터 유료 전환 (스티비/메일리)**: 평균 유료 전환율, 월 구독료 분포, retention
4. **온라인 강의 플랫폼**: 클래스101·인프런·패스트캠퍼스 수수료 구조, 강사 평균 매출
5. **어필리엇**: 쿠팡파트너스(기본 단가), 핀크·카드고릴라 등 금융 어필리엇 단가
6. **데이터 API·B2B**: 한국 금융 데이터 서비스 단가 (에프앤가이드·크래프트테크·데이터브로커 등 공개 가격)
7. **유료 PDF·템플릿**: 크몽·탈잉 재테크 카테고리 가격대
8. **커뮤니티·멤버십**: 한국 유료 커뮤니티 벤치 (트레바리·퍼블리·롱블랙 등 구독형 월 가격)
9. **스폰서십·PPL (뉴스레터·블로그)**: 한국 1회 단가 범위

**각 모델에 대해 채울 KPI**:
- 단가 (CPM, 월 구독료, 수수료율, 건당 등 모델별)
- 전환율 (방문 → 이메일 / 이메일 → 유료)
- Retention (월간 이탈률)
- CAC 대리지표 (업계 유통 광고비 or 채널당 획득 비용)
- LTV 대리지표 (월 구독료 × 평균 수명)
- 법적 리스크 신호 (유사투자자문업 등)

**라벨 강제**: 모든 수치에 "공개치 / 업계 추정 / 가설" 라벨.

**출력 형식**:
- 마크다운, 한국어, ≤800 단어
- 구조: (1) TL;DR 3문장, (2) 모델 × KPI 매트릭스 (9행 × KPI 컬럼), (3) "보수/현실/낙관" 3구간 단가 범위, (4) 데이터 공백이 큰 항목 Top 3 + 추정 방법, (5) 사용한 출처 링크
- 대체 자료 우선: 정부 통계, 학계 리포트, 업계 보고서, 공식 공시, 뉴스 기사 순
```

- [ ] **Step 3: 축 C 에이전트 프롬프트 확정**

```
You are synthesizing Korean finance website monetization data into concrete revenue scenarios for a specific site: finance-coffee-chat (fcc). Axes A and B are running in parallel and may not be available yet — you must make your own benchmark assumptions from public sources and flag any assumption that later conflicts with A/B findings.

**fcc의 현 3자산**:
1. **공모주 DB**: IPO 4기준 (청약경쟁률·의무보유확약·공모가밴드·유통물량) 정량 스코어링, 종목 상세, 캘린더 연동. 정적 JSON + Google Apps Script 스크래핑. 2026-04 현재 정적 사이트, 로그인·유저 관리 없음.
2. **비용 최적화**: Phase 9의 6 가구 유형 × 8 절약 영역 카탈로그 + 2026-04-13 추가된 개인화 필터 (연봉·주택 유무·부양가족·지역) + 48 세그먼트 계산기.
3. **투자 캘린더**: IPO 일정, 배당락, 이벤트 캘린더 페이지. GAS 기반 실시간 업데이트.

**전제**:
- 여태경 개인 브랜드 후광 = 0
- fcc 트래픽 = 0 출발 (업계 평균 성장률 가정)
- 시간 지평: 1년 보수 / 3년 현실 / 3년 낙관
- 운영 역량: 10h/week 1인 vs 2~3인 확장 두 시나리오 세트
- "2~3인 확장" 인력 구성 가정: 여태경 풀타임 + 개발 파트 1 + 마케팅/커뮤니티 파트 1, 월 고정비 800~1,500만원
- 법적 가드레일: 무료+교육+불특정다수는 안전, 유료 양방향·개별 추천은 유사투자자문업 등록 대상

**너의 임무 — 축 C: fcc 3자산 × 수익 모델 매핑 + 시나리오 추정**

**작업 1 — 매핑 적합도 히트맵 (3자산 × 9모델)**
- 수익 모델: 광고 / 유료 구독 / 어필리엇 / 유료 PDF·템플릿 / SaaS 툴 / 데이터 API / 강의 / 커뮤니티 / 스폰서십
- 각 셀에 적합도 0~5점 + 한 줄 근거
- 법적 리스크가 있는 셀은 ⚠️ 표시

**작업 2 — 시나리오 매트릭스 (6셀)**
행: 10h/week 1인 / 2~3인 확장
열: 1년 보수 / 3년 현실 / 3년 낙관

각 셀에 4개 항목:
1. 월매출 추정 범위 (원)
2. 주 수익원 2~3개
3. 필요 구독자·월간 유저 수 (DAU/MAU)
4. 주요 가정 2~3개 (CPM·전환율·retention 등)

2~3인 확장 시나리오는 월 고정비 800~1,500만원 차감 후 순매출도 병기.

**작업 3 — 상위 3모델 Unit Economics 테이블**
매핑 히트맵에서 점수가 가장 높은 모델 3개에 대해:
- CAC 추정 (획득 비용 원·광고 의존 시 CPM 기반)
- LTV 추정 (평균 수명 × 월 ARPU)
- 회수 기간 (월)
- 손익분기점 유저 수 (고정비 포함 시)

**작업 4 — 첫 수익 엔진 추천**
위 데이터를 바탕으로 "fcc가 지금 당장 시작해야 할 첫 수익 엔진" 1개를 추천. 근거 3문장, 예상 도달 시점, 주의점 포함.

**라벨 강제**: 모든 수치에 "공개치 / 업계 추정 / 가설" 라벨.

**출력 형식**:
- 마크다운, 한국어, ≤1000 단어 (가장 긴 축)
- 구조: (1) TL;DR 4문장, (2) 3×9 매핑 히트맵, (3) 6셀 시나리오 매트릭스, (4) 상위 3모델 unit economics, (5) 첫 수익 엔진 추천, (6) 주요 가정·공백, (7) 출처
```

- [ ] **Step 4: 축 D 에이전트 프롬프트 확정**

```
You are evaluating pivot options for a Korean finance website called finance-coffee-chat (fcc). The other three research axes (A/B/C) focus on "what can fcc earn as-is?" — your job is opposite: "what would fcc have to become to earn meaningfully more?"

**fcc의 현 3자산**: 공모주 DB (IPO 4기준 스코어링), 비용 최적화 (6 가구 × 8 영역 + 개인화 필터), 투자 캘린더. 정적 사이트, Vercel 배포, GA4 태깅. 트래픽 0 출발.

**전제**:
- 여태경 개인 브랜드 후광 = 0
- 법적 가드레일: 2024 개정 자본시장법상 유료 리딩방·개별 추천 금지
- 10h/week 1인 vs 2~3인 확장 시나리오 분리 평가
- Cycle 1이 확인한 한국 빈자리: 40대 1인 가구 싱글 FIRE·재무 콘텐츠

**너의 임무 — 축 D: 피벗 옵션 조사**

**핵심 질문**: fcc가 현 3자산 중 어느 걸 버리고·키우고·신규 추가해야 진짜 독립 사업이 되는가?

**검토 대상 피벗 후보 (최소 5개)**:

1. **공모주 DB → 유료 API·B2B 금융 데이터 서비스**
2. **비용 최적화 → 월 구독형 "개인 재무 코치" SaaS**
3. **투자 캘린더 → 기관·증권사 화이트라벨 납품**
4. **브랜드·도메인·GA4만 남기고 "한국 40대 1인 가구 재무 포털"로 완전 재정의**
5. **3자산 묶어서 B2B2C 기업 복지 제휴** (기업 내 1인 가구 직원용 재무 포털)

추가 피벗 아이디어가 있으면 1~2개 더 발굴해도 좋다.

**각 후보에 대해 조사·평가**:
- 한국 시장 내 유사 사례 1~2곳 + 수익·실패 여부
- 실현 난이도 (상/중/하) + 필요 시간·인력
- 예상 월매출 천장 (원, 3년 후 기준)
- 법적 리스크 (유사투자자문업 등록·개인정보·금융 규제)
- 10h/week 1인으로 가능 여부 (O/X)
- 2~3인 확장 시 가능 여부 (O/X)
- **피벗 권장 여부** (강력 추천 / 조건부 / 비추천) + 한 줄 이유

**출력 형식**:
- 마크다운, 한국어, ≤700 단어
- 구조: (1) TL;DR 3문장, (2) 피벗 후보별 카드 (5~7개, 각 카드에 위 7개 항목), (3) 종합 권장 순위 Top 3 + 근거, (4) 피벗하지 말아야 할 방향 1~2개 + 이유, (5) 출처
- 법적 리스크 셀에는 반드시 "금감원 유권해석 선행 필요" 여부 명시
```

- [ ] **Step 5: 4개 에이전트 단일 메시지로 병렬 디스패치**

Action: 단일 Assistant 응답에서 4개 Agent tool 호출을 동시에 포함. 각 호출:
- `subagent_type`: `"general-purpose"`
- `description`: 축별 짧은 한국어 설명 (예: "축 A 한국 유사 사이트 수익 모델")
- `prompt`: Step 1~4에서 확정한 프롬프트 전문

Expected: 4개 에이전트가 병렬로 실행되어 한 번의 도구 호출 응답에서 4개 결과가 모두 돌아옴. 각 결과는 마크다운 리포트 전문.

- [ ] **Step 6: 4개 결과 요약 확인**

에이전트 결과가 모두 도착하면 육안으로 다음을 점검:
- [x] 축 A: 10곳 비교표 + TAM 간이 추정 섹션 포함?
- [x] 축 B: 9모델 × KPI 매트릭스 + "보수/현실/낙관" 3구간 포함?
- [x] 축 C: 3×9 히트맵 + 6셀 시나리오 + Unit Economics + 첫 엔진 추천?
- [x] 축 D: 최소 5개 피벗 후보 + 권장 순위 Top 3?

하나라도 누락이면 **해당 축만 다시 디스패치** (나머지는 재사용).

---

## Task 3: 통합 리포트 작성

**Files:**
- Create: `docs/research/finance-coffee-chat-direction/2026-04-14-cycle-3/cycle-3-final-report.md`

**템플릿 구조** (Cycle 2 동일):
1. 메타 (작성일·작성자·입력·스코프)
2. 30초 결론 (TL;DR)
3. 조사 배경
4. 축 A 결과 — 한국 유사 사이트 + TAM
5. 축 B 결과 — KPI 벤치마크
6. 축 C 결과 — 매핑 + 시나리오
7. 축 D 결과 — 피벗 옵션
8. 통합 — 수익 잠재력 판단 6원칙
9. 다음 사이클 질문
10. 함의·액션 (Cycle 1/2 대비 업데이트 표)
11. 출처
12. 리서치 공백

- [ ] **Step 1: 리포트 파일 생성 (메타 + TL;DR + 배경)**

Write tool로 `docs/research/finance-coffee-chat-direction/2026-04-14-cycle-3/cycle-3-final-report.md` 생성. 초기에는 다음 3개 섹션만:

```markdown
# Cycle 3 — finance-coffee-chat 자체 수익 잠재력 리서치

**작성일**: 2026-04-14
**작성자**: finance-coffee-chat 리서치 에이전트 4기 (병렬)
**입력**: Cycle 1 (포지셔닝), Cycle 2 (콘텐츠 방향성)
**스코프**: 여태경 개인 브랜드 후광을 제거한 fcc 자체 수익 잠재력 평가. A(할지 말지) + B(얼마나) + C(어떻게) 통합.

---

## 0. 30초 결론 (TL;DR)

[주조정자가 4축 결과를 수령한 후 여기 채움]
- **독립 사업 성립 여부**: ...
- **1년 보수·3년 현실·3년 낙관 월매출**: ...
- **첫 수익 엔진**: ...
- **피벗 권장**: ...
- **가장 큰 리스크**: ...

---

## 1. 조사 배경

Cycle 1은 포지셔닝("한국판 FIRE 블로거 필명 3년, 2029 FIRE 후 실명 전환")을, Cycle 2는 콘텐츠 제작 방향성(3기둥 + 블로그 허브 퍼널 + 6항목 편집 룰)을 확정했다. 두 사이클 모두 여태경 개인 브랜드를 전제로 했다.

Cycle 3은 이 전제를 의도적으로 제거한다. 여태경 브랜드 후광을 0으로 두고, fcc 사이트가 독립 제품으로서 얼마나·어떻게 돈을 벌 수 있는지 평가한다. 현 자산 3개(공모주 DB·비용 최적화·투자 캘린더)는 점진 확장까지 허용, 조사 결과에 따라 피벗도 옵션.
```

Expected: 파일 생성 성공.

- [ ] **Step 2: 축 A~D 결과 섹션을 순서대로 추가**

Edit tool로 `cycle-3-final-report.md`에 4개 축 결과를 차례로 붙여 넣는다. 각 축은:
- 섹션 제목 (예: `## 2. 축 A — 한국 유사 사이트 수익 모델 인벤토리`)
- 에이전트가 반환한 마크다운 전문 복사 (서식 보존)
- 필요 시 제목 레벨만 조정 (`#` → `##`, `##` → `###`)

Expected: 리포트에 4개 축 결과가 모두 포함됨.

- [ ] **Step 3: 통합 원칙 6개 섹션 작성**

Edit tool로 `## 6. 통합 — 수익 잠재력 판단 6원칙` 섹션을 추가. 주조정자가 4축 데이터를 바탕으로 직접 작성. 각 원칙은:
- 원칙 한 줄
- 근거 (어느 축 데이터에서 나왔는지 명시)
- 여태경이 취할 액션 1개

**원칙 슬롯** (내용은 결과 의존):
1. 독립 사업 성립 여부 판단
2. 첫 수익 엔진 선택
3. 1년 보수 시나리오 목표값
4. 3년 현실 시나리오 목표값
5. 피벗 임계점 (언제·어느 방향)
6. 10h/week vs 확장 전환 기준

Expected: 통합 섹션 추가. 축 간 불일치가 있으면 이 섹션에서 명시적으로 조정.

- [ ] **Step 4: 다음 사이클 질문 + 함의 업데이트 + 출처 + 공백 섹션**

Edit tool로 아래 섹션들을 추가:
- `## 7. 다음 사이클 질문 (Cycle 4 후보)` — 이번 조사에서 남은 빈칸
- `## 8. 함의·액션 (Cycle 1/2 대비 업데이트)` — 표 형태 (Cycle 2 §8 템플릿)
- `## 9. 출처` — 4개 에이전트가 사용한 모든 링크 통합
- `## 10. 리서치 공백` — 공개 데이터 부족 항목

Expected: 리포트 완성.

- [ ] **Step 5: TL;DR 채우기**

Edit tool로 §0 TL;DR 플레이스홀더를 실제 결론으로 교체. 5개 불릿 모두 채움.

Expected: `[주조정자가...]` 텍스트가 모두 사라짐.

---

## Task 4: 리포트 셀프 리뷰

**Files:**
- Modify: `docs/research/finance-coffee-chat-direction/2026-04-14-cycle-3/cycle-3-final-report.md` (필요 시)

- [ ] **Step 1: 스펙 커버리지 체크**

Read tool로 스펙 파일 `docs/superpowers/specs/2026-04-14-fcc-cycle-3-revenue-potential-design.md`을 다시 읽고, 아래 4개 성공 기준이 리포트에서 답변되는지 확인:
1. fcc를 독립 사업으로 본격 투자할 가치가 있는가?
2. 투자한다면 어느 수익 모델부터?
3. 10h/week 제약을 풀고 확장할 가치가 있는가?
4. 피벗이 필요하다면 어느 방향인가?

누락된 항목이 있으면 통합 섹션(§6)에 추가.

- [ ] **Step 2: 플레이스홀더 스캔**

Grep tool로 리포트 내 금지 패턴 검색:

Run:
```
pattern: TBD|TODO|\[주조정자|채움|fill in|placeholder|...
path: docs/research/finance-coffee-chat-direction/2026-04-14-cycle-3/cycle-3-final-report.md
```
Expected: 매치 0건. 있으면 Edit tool로 실제 내용으로 교체.

- [ ] **Step 3: 라벨 강제 체크**

Grep tool로 리포트 내 수치 관련 섹션에 "공개치 / 업계 추정 / 가설" 라벨이 충분히 붙어있는지 확인:

Run:
```
pattern: 공개치|업계 추정|가설
path: docs/research/finance-coffee-chat-direction/2026-04-14-cycle-3/cycle-3-final-report.md
output_mode: count
```
Expected: 최소 10건 이상 (라벨이 너무 적으면 추정치 라벨이 누락되었을 가능성). 부족하면 수치 옆에 라벨 추가.

- [ ] **Step 4: 법적 가드레일 체크**

Grep tool로 유료화/피벗 제안 섹션에 법적 경고가 붙어있는지 확인:

Run:
```
pattern: 금감원|유권해석|유사투자자문
path: docs/research/finance-coffee-chat-direction/2026-04-14-cycle-3/cycle-3-final-report.md
```
Expected: 축 D 피벗 섹션과 통합 §6에서 최소 1회씩 등장.

---

## Task 5: 리포트 커밋

**Files:** 없음 (git만)

- [ ] **Step 1: git add + commit**

Run:
```bash
cd C:/Users/USER/projects/finance-coffee-chat && git add docs/research/finance-coffee-chat-direction/2026-04-14-cycle-3/ && git commit -m "docs: add cycle 3 research report on fcc revenue potential"
```
Expected: 1 file changed, insertions 보고, commit hash 출력.

- [ ] **Step 2: 커밋 확인**

Run:
```bash
cd C:/Users/USER/projects/finance-coffee-chat && git log --oneline -1
```
Expected: 방금 만든 커밋이 최상단에 표시.

---

## Task 6: 노션 101 요약 페이지 생성

**Files:** 없음 (Notion API)

- [ ] **Step 1: 101 요약 블록 구조 작성**

주조정자가 리포트를 기반으로 아래 구조의 Notion child page 콘텐츠를 준비한다 (Cycle 2 `101 요약` 패턴과 동일):

- paragraph: "사이클 3 전문 리포트의 5분 요약판. fcc 자체 수익 잠재력 편."
- paragraph: "🎯 한 줄로 말하면" (헤더 역할)
- paragraph: [TL;DR 한 문장]
- paragraph: "💡 우리가 발견한 것 3가지"
- bullet × 3: [축 A/B/C/D에서 가장 결정적인 발견 3개]
- paragraph: "💰 3년 수익 시나리오"
- bullet × 6: [6셀 시나리오 매트릭스를 불릿으로]
- paragraph: "🚀 첫 수익 엔진"
- paragraph: [축 C가 추천한 첫 엔진 요약]
- paragraph: "🔀 피벗 결정"
- bullet × 3: [축 D의 Top 3 피벗 후보 한 줄씩]
- paragraph: "⚠️ 가장 큰 리스크 3개"
- bullet × 3: [법적·데이터·운영]
- paragraph: "🔭 Cycle 4 후보 질문"
- bullet × 3~5: [남은 빈칸]
- paragraph: "📚 전체 리포트: docs/research/finance-coffee-chat-direction/2026-04-14-cycle-3/cycle-3-final-report.md"

Expected: 블록 배열 준비 완료.

- [ ] **Step 2: mcp__notion__API-post-page 호출**

Parameters:
- `parent`: `{"type": "page_id", "page_id": "341ffe0b-d4b7-8136-94c8-df7eb4404ba5"}`
- `icon`: `{"type": "emoji", "emoji": "📘"}`
- `properties`: `{"title": [{"type": "text", "text": {"content": "📘 101 요약 — 쉽게 읽는 사이클 3 결과 (fcc 수익 잠재력)"}}]}`
- `children`: Step 1에서 준비한 블록 배열 (paragraph + bulleted_list_item 타입만 사용, Cycle 2 포맷과 동일)

Expected: 응답에 새 페이지 id와 url 반환. 에러 시 children 블록 검증 (bulleted_list_item는 `{"type": "bulleted_list_item", "bulleted_list_item": {"rich_text": [...]}}` 형태).

- [ ] **Step 3: 생성 확인**

응답의 `url` 필드를 확인하고 페이지 id를 기록. 이후 사용자 요청 시 링크 제공.

---

## Task 7: 완료 보고

**Files:** 없음

- [ ] **Step 1: 사용자에게 산출물 요약 전달**

최종 메시지 내용:
1. 전문 리포트 경로 + 커밋 hash
2. 노션 101 요약 링크
3. 첫 수익 엔진 요약 2~3 문장
4. 6셀 시나리오 중 핵심 숫자 3개
5. Cycle 4 후보 질문 리스트

Expected: 사용자가 이어서 작업할지 여부 결정.

---

## Self-Review (플랜 작성자 — Opus 4.6)

**1. 스펙 커버리지**
- §1 배경 → Task 3 Step 1 배경 섹션 ✅
- §2 핵심 질문 → Task 3 Step 1 TL;DR + Step 5 작성 ✅
- §3 조사 전제 → Task 2 4개 프롬프트에 모두 포함 ✅
- §4 성공 기준 4개 → Task 4 Step 1 명시적 체크 ✅
- §5 조사 접근법 (4축 병렬) → Task 2 Step 5 병렬 디스패치 ✅
- §6 축 A/B/C/D → Task 2 Step 1~4 프롬프트 + Task 3 Step 2 통합 ✅
- §7 통합 섹션 → Task 3 Step 3 ✅
- §8 산출물 2개 → Task 5 커밋 + Task 6 노션 ✅
- §9 리스크 완화 (라벨 강제·법적 플래그) → Task 4 Step 3, 4 ✅
- §10 명시 가정 → Task 2 프롬프트에 모두 포함 ✅
- §11 비스코프 → 프롬프트에서 명시적으로 기술 구현·개인 세금 등 제외 ✅

**2. 플레이스홀더 스캔**
- Task 3 Step 1 초기 리포트에 `[주조정자가...]` 임시 텍스트 있음 → Step 5에서 명시적으로 교체 + Task 4 Step 2에서 Grep 검증. 의도적 플레이스홀더이고 교체 단계가 있으므로 OK.
- "fill in details" / "TBD" / "similar to" 등 없음 ✅

**3. 타입·이름 일관성**
- 파일 경로 `docs/research/finance-coffee-chat-direction/2026-04-14-cycle-3/cycle-3-final-report.md` — 모든 Task에서 일관 ✅
- 노션 부모 페이지 id `341ffe0b-d4b7-8136-94c8-df7eb4404ba5` — Task 6에서 사용, Cycle 2 실제 id와 일치 ✅
- 축 명칭 A/B/C/D — 스펙과 플랜에서 일관 ✅
- "101 요약" 포맷 — Cycle 2 실제 구조와 일치 (paragraph + bulleted_list_item만) ✅

**빠진 것 없음. 플랜 완료.**

---

## 실행 옵션

이 플랜은 대부분 에이전트 디스패치 + 단일 조정자 합성이라 **Inline Execution**(executing-plans)이 자연스럽다. Subagent-Driven은 "에이전트 안에 에이전트"라 과잉.
