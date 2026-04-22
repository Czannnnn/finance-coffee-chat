/**
 * IPO 데이터 수집기 v2 (P2 재설계)
 *
 * 1차 원천: DART OpenAPI (공식)
 * 2차 원천: KIND 한국거래소 상장공시
 * 3차 원천: 38.co.kr (기관수요예측 경쟁률 등 보조 필드)
 *
 * 시트 구조:
 *   raw_dart / raw_kind / raw_38 / normalized / archive
 *
 * 가동 전 필수 조건:
 *   1) DART OpenAPI 키 발급 (https://opendart.fss.or.kr)
 *   2) Apps Script 에디터 → Project Settings → Script Properties 에
 *      DART_API_KEY = <발급받은_40자_키>  추가
 *
 * 실행:
 *   fetchIPOData_v2()             // 수동 실행
 *   setupDailyTriggerV2()         // 일 2회 트리거 설정 (08:00 / 18:00)
 *
 * 참고 설계 문서:
 *   docs/maintenance/2026-04-22-ipo-data-redesign.md
 */

// ─── 상수 ───
const V2_SHEETS = {
  rawDart: 'raw_dart',
  rawKind: 'raw_kind',
  raw38: 'raw_38',
  normalized: 'normalized',
  archive: 'archive',
  log: '실행로그_v2',
};

const DART_BASE = 'https://opendart.fss.or.kr/api';
const DART_IPO_TYPE = 'C';        // 발행공시
const DART_IPO_DETAIL = 'C001';   // 증권신고(지분증권) = IPO

const V2_ALERT_EMAIL = 'hello@financecoffeechat.com';
const V2_LOOKBACK_DAYS = 90;      // 공시 검색 기간 (오늘 기준 과거 N일)
const V2_ARCHIVE_KEEP_DAYS = 180; // 상장 완료 후 유지 기간

// ─── 메인 Orchestration ───
function fetchIPOData_v2() {
  const start = Date.now();
  const stats = { dart: 0, kind: 0, s38: 0, normalized: 0, archived: 0 };
  let status = 'ok';
  let errorMessage = '';

  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty('DART_API_KEY');
    if (!apiKey) {
      throw new Error('DART_API_KEY 미설정: Script Properties에 추가 필요');
    }

    // 1차 원천: DART
    stats.dart = fetchFromDart_(apiKey);

    // 2차 원천: KIND
    try { stats.kind = fetchFromKind_(); } catch (e) {
      Logger.log(`KIND 수집 실패 (무시하고 진행): ${e.message}`);
    }

    // 3차 원천: 38.co.kr (DART 미제공 필드 보조)
    try { stats.s38 = fetchFrom38_v2_(); } catch (e) {
      Logger.log(`38.co.kr 수집 실패 (무시하고 진행): ${e.message}`);
    }

    // 통합·정규화
    stats.normalized = buildNormalized_();

    // 아카이브 이관
    stats.archived = rollToArchive_();
  } catch (e) {
    status = 'error';
    errorMessage = `${e.message}\n${e.stack || ''}`;
    Logger.log(`fetchIPOData_v2 실패: ${errorMessage}`);
  }

  const elapsedSec = Math.round((Date.now() - start) / 1000);
  writeV2Log_(status, stats, elapsedSec, errorMessage);
  if (status !== 'ok') notifyV2Failure_(status, stats, elapsedSec, errorMessage);
}

// ─── 원천 1: DART OpenAPI ───
function fetchFromDart_(apiKey) {
  const today = new Date();
  const bgn = new Date(today.getTime() - V2_LOOKBACK_DAYS * 86400000);
  const bgnStr = Utilities.formatDate(bgn, 'Asia/Seoul', 'yyyyMMdd');
  const endStr = Utilities.formatDate(today, 'Asia/Seoul', 'yyyyMMdd');

  const rows = [];
  let page = 1;
  while (page <= 20) {
    const url = `${DART_BASE}/list.json`
      + `?crtfc_key=${apiKey}`
      + `&bgn_de=${bgnStr}&end_de=${endStr}`
      + `&pblntf_ty=${DART_IPO_TYPE}&pblntf_detail_ty=${DART_IPO_DETAIL}`
      + `&page_no=${page}&page_count=100`;

    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const json = JSON.parse(res.getContentText());
    if (json.status !== '000') {
      Logger.log(`DART list.json status=${json.status} message=${json.message}`);
      break;
    }

    (json.list || []).forEach(item => {
      rows.push({
        corp_code: item.corp_code || '',
        corp_name: item.corp_name || '',
        rcept_no: item.rcept_no || '',
        rcept_dt: item.rcept_dt || '',
        report_nm: item.report_nm || '',
        stock_code: item.stock_code || '',
      });
    });

    if (!json.total_page || page >= json.total_page) break;
    page++;
    Utilities.sleep(200);
  }

  // TODO: 각 rcept_no에 대해 document.xml 세부 조회 → 공모가·청약일·확약·유통비율 추출
  // MVP 단계에서는 list.json 기본 필드만 저장. Full 구현은 사용자 결정 후 추가.

  writeSheet_(V2_SHEETS.rawDart,
    ['corp_code', 'corp_name', 'rcept_no', 'rcept_dt', 'report_nm', 'stock_code', 'fetched_at'],
    rows.map(r => [r.corp_code, r.corp_name, r.rcept_no, r.rcept_dt, r.report_nm, r.stock_code, new Date().toISOString()]));

  return rows.length;
}

// ─── 원천 2: KIND 한국거래소 ───
function fetchFromKind_() {
  // TODO: KIND 상장공시 API 또는 HTML 크롤링 구현
  // 당장은 스켈레톤만 유지하고 DART의 listing_date를 사용
  return 0;
}

// ─── 원천 3: 38.co.kr (기존 로직 축소 버전) ───
function fetchFrom38_v2_() {
  // 기존 parseListPage·parseDetailPage (ipo-scraper.gs) 재사용
  // 단 raw_38 시트에 '경쟁률' 필드 위주로 저장
  // TODO: 기존 함수를 include 또는 복사해서 붙여넣기
  return 0;
}

// ─── 통합·정규화 ───
function buildNormalized_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dartRows = readSheet_(ss.getSheetByName(V2_SHEETS.rawDart));
  const kindRows = readSheet_(ss.getSheetByName(V2_SHEETS.rawKind));
  const s38Rows  = readSheet_(ss.getSheetByName(V2_SHEETS.raw38));

  // TODO: 교차 검증 로직 — DART 우선, KIND로 상장일 확정, 38로 경쟁률 보조
  // 현재 MVP: DART 행을 그대로 normalized로 넘김 (공모가·확약·유통 컬럼은 placeholder)

  const headers = [
    'corp_code', 'name', 'market', 'status',
    'confirmed_price', 'band_low', 'band_high', 'band_position',
    'subscribe_start', 'subscribe_end', 'refund', 'listing',
    'lead', 'demand_competition', 'competition_note',
    'lockup_pct', 'lockup_breakdown', 'float_pct',
    'shares_total', 'shares_float',
    'confidence', 'sources', 'updated',
  ];
  const today = new Date();
  const rows = dartRows.map(r => [
    r.corp_code || '', r.corp_name || '', '', 'upcoming',
    '', '', '', '',
    '', '', '', '',
    '', '', '',
    '', '', '',
    '', '',
    'low', 'dart', Utilities.formatDate(today, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss'),
  ]);
  writeSheet_(V2_SHEETS.normalized, headers, rows);
  return rows.length;
}

// ─── 아카이브 ───
function rollToArchive_() {
  // TODO: normalized에서 status='completed' + listing_date가 7일 이전인 행을 archive로 이관
  // archive에 V2_ARCHIVE_KEEP_DAYS 경과 행은 삭제
  return 0;
}

// ─── 시트 유틸 ───
function writeSheet_(sheetName, headers, rows) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function readSheet_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

// ─── 로그 + 알림 ───
function writeV2Log_(status, stats, elapsedSec, errorMessage) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName(V2_SHEETS.log);
    if (!logSheet) {
      logSheet = ss.insertSheet(V2_SHEETS.log);
      logSheet.getRange(1, 1, 1, 8).setValues([
        ['실행시각', '상태', 'DART건수', 'KIND건수', '38건수', 'normalized건수', '소요(초)', '오류메시지'],
      ]);
      logSheet.getRange(1, 1, 1, 8).setFontWeight('bold');
    }
    logSheet.appendRow([
      new Date().toISOString().slice(0, 19).replace('T', ' '),
      status,
      stats.dart, stats.kind, stats.s38, stats.normalized,
      elapsedSec,
      (errorMessage || '').slice(0, 500),
    ]);
    const lastRow = logSheet.getLastRow();
    if (lastRow > 501) logSheet.deleteRows(2, lastRow - 501);
  } catch (e) {
    Logger.log(`writeV2Log_ 실패: ${e.message}`);
  }
}

function notifyV2Failure_(status, stats, elapsedSec, errorMessage) {
  try {
    const subject = `[Finance Coffee Chat] IPO 스크래퍼 v2 ${status} (${new Date().toISOString().slice(0, 10)})`;
    const body = [
      `상태: ${status}`,
      `소요: ${elapsedSec}초`,
      `DART=${stats.dart} · KIND=${stats.kind} · 38=${stats.s38} · normalized=${stats.normalized}`,
      ``,
      errorMessage || '',
    ].join('\n');
    MailApp.sendEmail(V2_ALERT_EMAIL, subject, body);
  } catch (e) {
    Logger.log(`notifyV2Failure_ 실패: ${e.message}`);
  }
}

// ─── 트리거 ───
function setupDailyTriggerV2() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const t of triggers) {
    if (t.getHandlerFunction() === 'fetchIPOData_v2') ScriptApp.deleteTrigger(t);
  }
  ScriptApp.newTrigger('fetchIPOData_v2').timeBased().everyDays(1).atHour(8).create();
  ScriptApp.newTrigger('fetchIPOData_v2').timeBased().everyDays(1).atHour(18).create();
  Logger.log('v2 트리거 설정 완료: 매일 08:00 / 18:00');
}
