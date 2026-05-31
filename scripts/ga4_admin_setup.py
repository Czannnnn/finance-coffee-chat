"""
GA4 Custom Dimensions / Custom Metrics 일괄 등록 스크립트.

사이클 7-2 계산기 9건 풀 위젯 적용에 따른 Custom dimensions 23개 + Custom metrics 6개
자동 생성. Idempotent: 이미 존재하는 항목은 skip.

실행 방법:
    python scripts/ga4_admin_setup.py

요구사항:
    pip install google-analytics-admin
    Service Account JSON 키 (C:\\Users\\USER\\.config\\ga4-mcp-key.json)
    해당 SA에 GA4 Property 531235095 Editor 권한 부여 필요.

작성일: 2026-06-01 (사이클 7-2 머지 후 후속 작업)
"""

import os
import sys
from google.analytics.admin import AnalyticsAdminServiceClient
from google.analytics.admin_v1beta import CustomDimension, CustomMetric
from google.oauth2 import service_account

PROPERTY_ID = "531235095"
SA_KEY = r"C:\Users\USER\.config\ga4-mcp-key.json"

# Custom Dimensions (Event scope) — 23개
CUSTOM_DIMENSIONS = [
    ("calc_id", "Calculator ID", "사이클 7-2 계산기 식별자 (dc_db, fx_capgain, account4, isa_combo, year_end, card_reverse, fin_income, severance, etf_us_kr)"),
    ("result_segment", "Result Segment", "계산 결과 분류 (refund, owe, breakeven, DB, DC, tie, safe, warn, over, reachable, impossible 등)"),
    ("result_band", "Result Band", "결과 금액·비율 구간"),
    ("winner", "Winner Account", "DC·DB·tie 또는 KR_listed·US_direct 우위 식별"),
    ("diff_band", "Diff Band", "DC·DB 차이 금액 구간 (<-50M, -50to0, 0to50M, 50M+)"),
    ("dc_return_band", "DC Return Band", "DC 운용 수익률 구간 (<5, 5-7, 7-10, 10+%)"),
    ("top_account", "Top Account", "세후 우위 계좌 (ISA, IRP, pension, general)"),
    ("horizon_years", "Horizon Years", "투자 기간 구간"),
    ("tax_bracket", "Tax Bracket", "한계세율 구간 (6.6, 16.5, 26.4, 38.5, 46.2+)"),
    ("risk_segment", "Risk Segment", "금융소득 임계 리스크 (safe, warn, over)"),
    ("recommendation_id", "Recommendation ID", "회피 시나리오 추천 (isa_shift, pension_shift, none)"),
    ("feasibility", "Feasibility", "카드 공제 역산 달성 가능성 (reachable, over, impossible)"),
    ("target_refund_band", "Target Refund Band", "목표 환급액 구간"),
    ("required_spend_band", "Required Spend Band", "필요 카드 사용액 구간"),
    ("salary_band", "Salary Band", "연봉 구간 (<3000, 3000-5500, 5500-8000, 8000+)"),
    ("refund_band", "Refund Band", "환급액 구간 (<0, 0-50, 50-150, 150-300, 300+)"),
    ("share_method", "Share Method", "결과 공유 방식 (clipboard, webshare, kakao)"),
    ("article_slug", "Article Slug", "계산기 → 가이드 글 back link slug"),
    ("position", "Position", "back link 위치 (top, bottom, inline)"),
    ("referrer_type", "Referrer Type", "유입 경로 분류 (direct, search, internal, external)"),
    ("field", "Field Name", "calc_input_filled 이벤트 입력 필드명"),
    ("current_income_band", "Current Income Band", "금융소득 현재 합산 구간 (<1000, 1000-1800, 1800-2000, 2000+)"),
    ("gap_to_2000_band", "Gap to 2000 Band", "2,000만 임계까지 격차 구간"),
]

# Custom Metrics — 6개
# Type은 모두 IntegerOrFloat. measurement_unit만 다름.
CUSTOM_METRICS = [
    ("diff_amount", "Diff Amount", "DC·DB 만기 차이 금액 (원)", "CURRENCY"),
    ("refund_amount", "Refund Amount", "연말정산 환급|추납 금액 (원)", "CURRENCY"),
    ("after_tax_gap_pct", "After Tax Gap %", "절세계좌 vs 일반 세후 격차 (%)", "STANDARD"),
    ("required_spend_amount", "Required Spend Amount", "카드 공제 역산 필요 사용액 (원)", "CURRENCY"),
    ("gap_to_2000_amount", "Gap to 2000 Amount", "2,000만 임계 격차 절대값 (원)", "CURRENCY"),
    ("time_to_first_input_ms", "Time to First Input", "최초 입력 도달 시간 (ms)", "MILLISECONDS"),
]


def main():
    if not os.path.exists(SA_KEY):
        print(f"[ERROR] Service Account key not found: {SA_KEY}", file=sys.stderr)
        sys.exit(1)

    creds = service_account.Credentials.from_service_account_file(
        SA_KEY,
        scopes=["https://www.googleapis.com/auth/analytics.edit"],
    )
    client = AnalyticsAdminServiceClient(credentials=creds)
    parent = f"properties/{PROPERTY_ID}"

    # 기존 항목 조회 (idempotent)
    print(f"[INFO] 기존 Custom Dimensions / Metrics 조회 중...")
    existing_dims = {d.parameter_name: d.name for d in client.list_custom_dimensions(parent=parent)}
    existing_mets = {m.parameter_name: m.name for m in client.list_custom_metrics(parent=parent)}
    print(f"[INFO] 기존 Custom Dimensions: {len(existing_dims)}개")
    print(f"[INFO] 기존 Custom Metrics: {len(existing_mets)}개")

    # Custom Dimensions 생성
    created_dims = 0
    skipped_dims = 0
    for param_name, display_name, description in CUSTOM_DIMENSIONS:
        if param_name in existing_dims:
            print(f"  [SKIP] CD '{param_name}' 이미 존재")
            skipped_dims += 1
            continue
        try:
            cd = CustomDimension(
                parameter_name=param_name,
                display_name=display_name,
                description=description,
                scope=CustomDimension.DimensionScope.EVENT,
            )
            result = client.create_custom_dimension(parent=parent, custom_dimension=cd)
            print(f"  [CREATE] CD '{param_name}' -> {result.name}")
            created_dims += 1
        except Exception as e:
            print(f"  [ERROR] CD '{param_name}' 생성 실패: {e}", file=sys.stderr)

    # Custom Metrics 생성
    created_mets = 0
    skipped_mets = 0
    for param_name, display_name, description, unit in CUSTOM_METRICS:
        if param_name in existing_mets:
            print(f"  [SKIP] CM '{param_name}' 이미 존재")
            skipped_mets += 1
            continue
        try:
            measurement_unit = getattr(CustomMetric.MeasurementUnit, unit)
            cm = CustomMetric(
                parameter_name=param_name,
                display_name=display_name,
                description=description,
                measurement_unit=measurement_unit,
                scope=CustomMetric.MetricScope.EVENT,
            )
            result = client.create_custom_metric(parent=parent, custom_metric=cm)
            print(f"  [CREATE] CM '{param_name}' -> {result.name}")
            created_mets += 1
        except Exception as e:
            print(f"  [ERROR] CM '{param_name}' 생성 실패: {e}", file=sys.stderr)

    print()
    print(f"=== 결과 ===")
    print(f"Custom Dimensions: created {created_dims} / skipped {skipped_dims} / total {len(CUSTOM_DIMENSIONS)}")
    print(f"Custom Metrics:    created {created_mets} / skipped {skipped_mets} / total {len(CUSTOM_METRICS)}")
    print(f"GA4 Property:      {PROPERTY_ID}")


if __name__ == "__main__":
    main()
