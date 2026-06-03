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
from google.analytics.admin_v1beta import (
    AnalyticsAdminServiceClient,
    CustomDimension,
    CustomMetric,
)
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
    # --- 사이클 6-20 ROI TOP5 계산기 6건 추가 (2026-06-03) ---
    ("trigger_source", "Trigger Source", "이벤트 트리거 방식 (button, enter, auto)"),
    ("asset_type", "Asset Type", "양도세 자산유형 (domestic_stock, real_estate, overseas_stock)"),
    ("business_type", "Business Type", "부가세 과세유형 (general, simplified)"),
    ("credit_rate", "Credit Rate", "연금 세액공제율 (16.5, 13.2)"),
    ("bracket", "Income Tax Bracket", "종합소득 한계세율 라벨 (6%~45%)"),
    ("tenure_band", "Tenure Band", "퇴직 근속연수 구간 (<5, 5-10, 10-20, 20+)"),
    ("contribution_band", "Contribution Band", "연금저축+IRP 납입 구간 (<300, 300-600, 600-900, 900+)"),
    ("credit_band", "Credit Band", "세액공제액 구간 (<30, 30-60, 60-100, 100-148, 148+ 만원)"),
    ("taxbase_band", "Tax Base Band", "종합소득 과세표준 구간 (<1400, 1400-5000, 5000-8800, 8800-15000, 15000+)"),
    ("tax_band", "Tax Amount Band", "산출 세액 구간 (양도세·종합소득세 등)"),
    ("severance_band", "Severance Band", "세전 퇴직금 구간 (<1000, 1000-5000, 5000-10000, 10000+ 만원)"),
    ("gain_band", "Capital Gain Band", "양도차익 구간 (loss, under_250, lt_3000, lt_10000, ge_10000)"),
    ("supply_band", "Supply Band", "부가세 매출(공급가액) 구간 (<2000, 2000-8000, 8000-20000, 20000+)"),
    ("vat_band", "VAT Band", "부가세 납부세액 구간 (<50, 50-200, 200-500, 500-2000, 2000+)"),
    ("dividend_band", "Dividend Band", "배당소득 구간 (<500, 500-2000, 2000-5000, 5000+ 만원)"),
    ("threshold_gap_band", "Threshold Gap Band", "금융소득종합과세 2,000만 임계 격차 구간"),
]

# Custom Metrics — 6개
# Type은 모두 IntegerOrFloat. measurement_unit만 다름.
CUSTOM_METRICS = [
    ("diff_amount", "Diff Amount", "DC·DB 만기 차이 금액 (원)", "STANDARD"),
    ("refund_amount", "Refund Amount", "연말정산 환급|추납 금액 (원)", "STANDARD"),
    ("after_tax_gap_pct", "After Tax Gap Pct", "절세계좌 vs 일반 세후 격차 (퍼센트)", "STANDARD"),
    ("required_spend_amount", "Required Spend Amount", "카드 공제 역산 필요 사용액 (원)", "STANDARD"),
    ("gap_to_2000_amount", "Gap to 2000 Amount", "2,000만 임계 격차 절대값 (원)", "STANDARD"),
    ("time_to_first_input_ms", "Time to First Input", "최초 입력 도달 시간 (ms)", "MILLISECONDS"),
    # --- 사이클 6-20 ROI TOP5 계산기 6건 추가 (2026-06-03) ---
    ("credit_amount", "Credit Amount", "연금저축·IRP 세액공제액 (원)", "STANDARD"),
    ("tax_amount", "Tax Amount", "산출 세액 — 종합소득세·양도세·배당세·퇴직소득세 (원)", "STANDARD"),
    ("vat_amount", "VAT Amount", "부가세 납부세액 (원)", "STANDARD"),
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
