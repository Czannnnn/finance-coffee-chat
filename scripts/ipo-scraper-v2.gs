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
// KIND는 공식 상장공시를 제공하며, kind.krx.co.kr의 상장예정 리스트 페이지를 크롤링.
// 공식 JSON API가 없어 HTML 파싱 사용.
function fetchFromKind_() {
  const url = 'https://kind.krx.co.kr/disclosureinfo/listedcmpdisclosure.do?method=searchListedCmpDisclosureMain';
  const rows = [];
  try {
    const res = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FinanceCoffeeChat/2.0)' },
    });
    const html = res.getContentText('UTF-8');

    // KIND의 상장예정/신규상장 테이블 구조에서 종목명·시장·상장일을 추출
    // 구조 변경 대응을 위해 관대한 정규식 사용
    const tableRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let match;
    while ((match = tableRe.exec(html)) !== null) {
      const tr = match[1];
      if (!/(코스피|코스닥|KOSPI|KOSDAQ)/.test(tr)) continue;
      const cells = [];
      const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cm;
      while ((cm = cellRe.exec(tr)) !== null) {
        cells.push(cm[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim());
      }
      if (cells.length < 3) continue;
      const name = cells.find(c => c && !/(코스피|코스닥)/.test(c) && c.length >= 2 && c.length <= 30);
      const market = /(코스피|KOSPI)/.test(tr) ? 'kospi' : 'kosdaq';
      const dateMatch = tr.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
      if (name && dateMatch) {
        rows.push({
          name: name,
          market: market,
          listing_date: `${dateMatch[1]}-${String(dateMatch[2]).padStart(2, '0')}-${String(dateMatch[3]).padStart(2, '0')}`,
        });
      }
    }
  } catch (e) {
    Logger.log(`KIND fetch 실패: ${e.message}`);
  }

  writeSheet_(V2_SHEETS.rawKind,
    ['name', 'market', 'listing_date', 'fetched_at'],
    rows.map(r => [r.name, r.market, r.listing_date, new Date().toISOString()]));
  return rows.length;
}

// ─── 원천 3: 38.co.kr (DART 미제공 보조 지표) ───
// 주 목적: 기관수요예측 경쟁률 + 의무보유확약 + 유통가능물량 보조.
// 기존 ipo-scraper.gs의 parseListPage·parseDetailPage·fetchAsEucKr을 그대로 재사용.
// Apps Script는 단일 프로젝트 내 파일들이 동일 네임스페이스를 공유하므로 직접 호출 가능.
function fetchFrom38_v2_() {
  const rows = [];
  if (typeof fetchAsEucKr !== 'function' || typeof parseListPage !== 'function' || typeof parseDetailPage !== 'function') {
    Logger.log('38.co.kr 보조 파서 함수가 없음 (ipo-scraper.gs 필요)');
    return 0;
  }
  try {
    const ipos = [];
    for (let page = 1; page <= 2; page++) {
      const html = fetchAsEucKr(`http://www.38.co.kr/html/fund/index.htm?o=k&page=${page}`);
      ipos.push(...parseListPage(html));
    }
    for (const ipo of ipos) {
      let detail = { market: '', refundDate: '', listingDate: '', lockup: '', shares: '', floatRatio: '' };
      if (ipo.detailUrl) {
        try {
          const html = fetchAsEucKr(ipo.detailUrl);
          detail = parseDetailPage(html);
          Utilities.sleep(400);
        } catch (e) {
          Logger.log(`38 상세 실패 (${ipo.name}): ${e.message}`);
        }
      }
      rows.push({
        name: ipo.name,
        market: detail.market || '',
        subscribe_start: ipo.subscribeStart || '',
        subscribe_end: ipo.subscribeEnd || '',
        refund_date: detail.refundDate || '',
        listing_date: detail.listingDate || '',
        confirmed_price: ipo.confirmedPrice || '',
        expected_price: ipo.expectedPrice || '',
        lead: ipo.lead || '',
        demand_competition: ipo.competition || '',
        lockup: detail.lockup || '',
        float_ratio: detail.floatRatio || '',
        shares: detail.shares || '',
      });
    }
  } catch (e) {
    Logger.log(`38 수집 실패: ${e.message}`);
  }

  writeSheet_(V2_SHEETS.raw38,
    ['name', 'market', 'subscribe_start', 'subscribe_end', 'refund_date', 'listing_date',
     'confirmed_price', 'expected_price', 'lead', 'demand_competition', 'lockup', 'float_ratio', 'shares', 'fetched_at'],
    rows.map(r => [r.name, r.market, r.subscribe_start, r.subscribe_end, r.refund_date, r.listing_date,
                   r.confirmed_price, r.expected_price, r.lead, r.demand_competition, r.lockup, r.float_ratio, r.shares,
                   new Date().toISOString()]));
  return rows.length;
}

// ─── 통합·정규화 ───
// 전략: 종목명 기반 매칭 후 DART 우선, KIND로 listing_date 오버라이드, 38로 경쟁률·확약·유통 보조.
function buildNormalized_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dartRows = readSheet_(ss.getSheetByName(V2_SHEETS.rawDart));
  const kindRows = readSheet_(ss.getSheetByName(V2_SHEETS.rawKind));
  const s38Rows  = readSheet_(ss.getSheetByName(V2_SHEETS.raw38));

  const kindByName = {};
  kindRows.forEach(r => { if (r.name) kindByName[normalizeName_(r.name)] = r; });
  const s38ByName = {};
  s38Rows.forEach(r => { if (r.name) s38ByName[normalizeName_(r.name)] = r; });

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
  const todayStr = Utilities.formatDate(today, 'Asia/Seoul', 'yyyy-MM-dd');

  // DART 공시에서 "증권신고서" 계열만 선별하고 종목명 기준으로 중복 제거 (최신 rcept_dt 우선)
  const byName = {};
  dartRows.forEach(r => {
    const nk = normalizeName_(r.corp_name);
    if (!nk) return;
    if (!byName[nk] || (r.rcept_dt > byName[nk].rcept_dt)) byName[nk] = r;
  });

  const rows = [];
  Object.keys(byName).forEach(nk => {
    const d = byName[nk];
    const k = kindByName[nk] || {};
    const s = s38ByName[nk] || {};

    const market = k.market || s.market || '';
    const subStart = s.subscribe_start || '';
    const subEnd = s.subscribe_end || '';
    const listing = k.listing_date || s.listing_date || '';
    const refund = s.refund_date || '';

    const status = computeStatusV2_(todayStr, subStart, subEnd, listing);

    const bandLow = extractBandLow_(s.expected_price);
    const bandHigh = extractBandHigh_(s.expected_price);
    const confirmedNum = parsePrice_(s.confirmed_price);
    const bandPos = computeBandPosition_(confirmedNum, bandLow, bandHigh);

    const lockupPct = parsePercent_(s.lockup);
    const floatPct = parsePercent_(s.float_ratio);

    const sources = ['dart'];
    if (k.name) sources.push('kind');
    if (s.name) sources.push('38');
    const confidence = sources.length >= 3 ? 'high' : (sources.length === 2 ? 'medium' : 'low');

    rows.push([
      d.corp_code || '',
      d.corp_name || s.name || k.name || '',
      market,
      status,
      s.confirmed_price || '',
      bandLow || '',
      bandHigh || '',
      bandPos,
      subStart,
      subEnd,
      refund,
      listing,
      s.lead || '',
      s.demand_competition || '',
      s.demand_competition ? '기관 수요예측' : '',
      lockupPct != null ? `${lockupPct}%` : '',
      '', // lockup_breakdown: document.xml 파싱 Phase 2에서 채움
      floatPct != null ? `${floatPct}%` : '',
      s.shares || '',
      '', // shares_float: Phase 2
      confidence,
      sources.join(','),
      Utilities.formatDate(today, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss'),
    ]);
  });

  writeSheet_(V2_SHEETS.normalized, headers, rows);
  return rows.length;
}

// ─── 아카이브 ───
// normalized에서 status='completed' + listing이 7일 이전인 행을 archive로 이관.
// archive에 V2_ARCHIVE_KEEP_DAYS(180일) 경과 행은 삭제.
function rollToArchive_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const normSheet = ss.getSheetByName(V2_SHEETS.normalized);
  if (!normSheet || normSheet.getLastRow() < 2) return 0;

  const values = normSheet.getDataRange().getValues();
  const headers = values[0];
  const listingIdx = headers.indexOf('listing');
  const statusIdx = headers.indexOf('status');
  if (listingIdx < 0 || statusIdx < 0) return 0;

  const now = new Date();
  const cutoffMove = new Date(now.getTime() - 7 * 86400000);
  const cutoffDelete = new Date(now.getTime() - V2_ARCHIVE_KEEP_DAYS * 86400000);
  const moveRows = [];
  const keepRows = [values[0]]; // 헤더

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const listing = String(row[listingIdx] || '');
    if (row[statusIdx] === 'completed' && /^\d{4}-\d{2}-\d{2}$/.test(listing)) {
      if (new Date(listing) < cutoffMove) {
        moveRows.push(row);
        continue;
      }
    }
    keepRows.push(row);
  }

  if (moveRows.length > 0) {
    let archSheet = ss.getSheetByName(V2_SHEETS.archive);
    if (!archSheet) {
      archSheet = ss.insertSheet(V2_SHEETS.archive);
      archSheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    }
    const lastRow = archSheet.getLastRow();
    archSheet.getRange(lastRow + 1, 1, moveRows.length, headers.length).setValues(moveRows);

    // normalized 재구성
    normSheet.clearContents();
    normSheet.getRange(1, 1, keepRows.length, headers.length).setValues(keepRows);

    // archive에서 180일 이전 행 삭제
    const archValues = archSheet.getDataRange().getValues();
    const archListingIdx = archValues[0].indexOf('listing');
    const archKeep = [archValues[0]];
    for (let i = 1; i < archValues.length; i++) {
      const listing = String(archValues[i][archListingIdx] || '');
      if (/^\d{4}-\d{2}-\d{2}$/.test(listing) && new Date(listing) < cutoffDelete) continue;
      archKeep.push(archValues[i]);
    }
    if (archKeep.length !== archValues.length) {
      archSheet.clearContents();
      archSheet.getRange(1, 1, archKeep.length, headers.length).setValues(archKeep);
    }
  }
  return moveRows.length;
}

// ─── 정규화 유틸 ───
function normalizeName_(name) {
  if (!name) return '';
  return String(name)
    .replace(/[\s\(\)\[\]㈜(주)]/g, '')
    .replace(/주식회사/g, '')
    .toLowerCase();
}

function computeStatusV2_(todayStr, subStart, subEnd, listing) {
  if (!subStart) return 'upcoming';
  if (todayStr < subStart) return 'upcoming';
  if (subEnd && todayStr >= subStart && todayStr <= subEnd) return 'active';
  if (listing && todayStr < listing) return 'pending_listing';
  if (listing && todayStr >= listing) return 'completed';
  return 'completed';
}

function parsePrice_(str) {
  if (!str) return 0;
  const m = String(str).replace(/,/g, '').match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function extractBandLow_(str) {
  if (!str) return 0;
  const m = String(str).replace(/,/g, '').match(/(\d+)\s*~/);
  return m ? parseInt(m[1], 10) : 0;
}

function extractBandHigh_(str) {
  if (!str) return 0;
  const m = String(str).replace(/,/g, '').match(/~\s*(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

// 5단계 밴드 위치 산출: 초과/상단/중간/하단/하회
function computeBandPosition_(fixed, low, high) {
  if (!fixed || !low || !high || high <= low) return '';
  if (fixed > high) return '초과';
  if (fixed === high) return '상단';
  if (fixed === low) return '하단';
  if (fixed < low) return '하회';
  const mid = (low + high) / 2;
  if (Math.abs(fixed - mid) / mid <= 0.05) return '중간';
  return fixed > mid ? '상단' : '하단';
}

function parsePercent_(str) {
  if (!str) return null;
  const m = String(str).match(/([\d.]+)\s*%/);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (n > 0 && n < 1) n = Math.round(n * 10000) / 100; // 0.15 → 15.0
  return n;
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
