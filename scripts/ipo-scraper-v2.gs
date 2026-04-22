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

  const rawRows = [];
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
      rawRows.push({
        corp_code: item.corp_code || '',
        corp_name: item.corp_name || '',
        rcept_no: item.rcept_no || '',
        rcept_dt: item.rcept_dt || '',
        report_nm: item.report_nm || '',
        stock_code: item.stock_code || '',
        corp_cls: item.corp_cls || '',
      });
    });

    if (!json.total_page || page >= json.total_page) break;
    page++;
    Utilities.sleep(200);
  }

  // IPO 전용 필터 v2 — 1차 실행에서 "투자설명서(일괄신고)" 계열이 통과해
  // BNK투자증권·하나증권·하나카드 등 채권/MTN 공시가 대거 섞인 문제 대응.
  //
  // 관찰: DART 공시 체계상
  //   · 순수 IPO → [증권신고서(지분증권)] + [투자설명서] (단독, 괄호 없음)
  //   · 상장사 채권/MTN → [투자설명서(일괄신고)] — 제외해야 함
  //   · 유상증자 → [증권신고서(지분증권)] + stock_code 존재 — 제외해야 함
  //
  // 필터 규칙:
  //   INCLUDE = report_nm이 "(지분증권" 포함  OR  "[투자설명서]" 정확히 일치
  //   EXCLUDE = report_nm에 "일괄" 포함 (채권/MTN 일괄신고)
  //   EXCLUDE = corp_name에 증권·은행·카드·캐피탈 등 하드 블랙리스트 (안전망)
  //   stock_code·corp_cls 필터는 증권사가 E로 분류되는 경우가 있어 역효과 — 제거
  const INCLUDE_RE = /(지분증권)|(^\[투자설명서\]\s*$)/;
  const EXCLUDE_BULK_RE = /일괄/;
  const EXCLUDE_ISSUER_RE = /(증권|은행|카드|캐피탈|저축은행|생명|화재|손보|보험|자산운용|투자신탁|리츠|인프라펀드)$/;

  // corp_cls 필터 재도입: Y(코스피)·K(코스닥)·N(코넥스) = 기존 상장사 제외.
  // SKC·한화솔루션·금호건설 등 기존 상장사의 유상증자 공시를 차단.
  // E(기타)·공란 = IPO 이전 법인은 유지.
  const ALLOWED_CORP_CLS = { 'E': true, '': true };

  const rows = rawRows.filter(r => {
    const rn = r.report_nm || '';
    // 시장 접미를 제거한 corp_name으로 블랙리스트 매칭: "(주)BNK투자증권(유가)" → "BNK투자증권"
    const cn = (r.corp_name || '').replace(/\(\s*(유가|코스닥|코스피|코넥스)\s*\)/g, '').trim();
    if (!INCLUDE_RE.test(rn)) return false;
    if (EXCLUDE_BULK_RE.test(rn)) return false;
    if (EXCLUDE_ISSUER_RE.test(cn)) return false;
    if (!ALLOWED_CORP_CLS[r.corp_cls || '']) return false;
    return true;
  });

  Logger.log(`DART: 원시 ${rawRows.length}건 → IPO 필터 후 ${rows.length}건`);

  // TODO(Phase 2): 각 rcept_no에 대해 document.xml 세부 조회 → 공모가·청약일·확약·유통비율 추출
  writeSheet_(V2_SHEETS.rawDart,
    ['corp_code', 'corp_name', 'rcept_no', 'rcept_dt', 'report_nm', 'stock_code', 'corp_cls', 'fetched_at'],
    rows.map(r => [r.corp_code, r.corp_name, r.rcept_no, r.rcept_dt, r.report_nm, r.stock_code, r.corp_cls, new Date().toISOString()]));

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
// 전략: 3원천 union (종목명 정규화 키). 각 원천 내 최신 1건 유지.
// 최종 출처 우선순위: DART (corp_code/corp_name) > KIND (상장일·시장 확정) > 38 (공모가·경쟁률·확약·유통).
function buildNormalized_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dartRows = readSheet_(ss.getSheetByName(V2_SHEETS.rawDart));
  const kindRows = readSheet_(ss.getSheetByName(V2_SHEETS.rawKind));
  const s38Rows  = readSheet_(ss.getSheetByName(V2_SHEETS.raw38));

  const merged = {};
  const upsert = (nk, src, row) => {
    if (!nk) return;
    if (!merged[nk]) merged[nk] = { sources: [] };
    if (!merged[nk][src]) merged[nk].sources.push(src);
    merged[nk][src] = row;
  };
  // DART: rcept_dt 최신 우선
  dartRows.forEach(r => {
    const nk = normalizeName_(r.corp_name);
    if (!nk) return;
    if (!merged[nk] || !merged[nk].dart || String(r.rcept_dt || '') > String(merged[nk].dart.rcept_dt || '')) {
      upsert(nk, 'dart', r);
    }
  });
  kindRows.forEach(r => upsert(normalizeName_(r.name), 'kind', r));
  s38Rows.forEach(r => upsert(normalizeName_(r.name), 's38', r));

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

  // 38.co.kr PRIMARY 전환 (2026-04-22 4차 실행 후):
  // DART corp_cls 필드가 일부 기존 상장사(SKC·한화솔루션·루닛 등)에 공란으로
  // 반환되어 corp_cls 필터를 우회. 38.co.kr은 IPO 전용 DB라 커버리지 신뢰도 최고.
  // → normalized = 38 rows만. DART·KIND는 매칭되는 경우에만 corp_code·상장일 attach.
  const rows = s38Rows.map(s => {
    const nk = normalizeName_(s.name);
    const bucket = merged[nk] || {};
    const d = bucket.dart || {};
    const k = bucket.kind || {};
    const sources = ['38'];
    if (d.corp_name) sources.push('dart');
    if (k.name) sources.push('kind');

    const name = s.name || d.corp_name || k.name || '';
    const market = k.market || s.market || '';
    // Google Sheets가 날짜 셀을 JS Date 객체로 반환하는 경우 대비: 모두 ISO 문자열로 정규화
    const subStart = toIsoDate_(s.subscribe_start);
    const subEnd = toIsoDate_(s.subscribe_end);
    const listing = toIsoDate_(k.listing_date || s.listing_date);
    const refund = toIsoDate_(s.refund_date);

    const status = computeStatusV2_(todayStr, subStart, subEnd, listing);

    const bandLow = extractBandLow_(s.expected_price);
    const bandHigh = extractBandHigh_(s.expected_price);
    const confirmedNum = parsePrice_(s.confirmed_price);
    const bandPos = computeBandPosition_(confirmedNum, bandLow, bandHigh);

    const lockupPct = parsePercent_(s.lockup);
    const floatPct = parsePercent_(s.float_ratio);

    // 38 primary confidence (KIND 수집이 best-effort로 0건인 현 상황 반영):
    //   38 + DART = high (corp_code로 공식 소스 교차 확인됨)
    //   38 only   = medium
    //   DART only = low (이론상 발생 불가 — 38 primary이므로 38이 항상 있음)
    let confidence = 'medium';
    if (sources.indexOf('dart') >= 0) confidence = 'high';

    return [
      d.corp_code || '',
      name,
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
      '',
      floatPct != null ? `${floatPct}%` : '',
      s.shares || '',
      '',
      confidence,
      sources.join(','),
      Utilities.formatDate(today, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss'),
    ];
  }).filter(row => row[1]); // name이 있는 것만

  // 청약 시작일 역순 정렬 (upcoming/active 상단)
  rows.sort((a, b) => String(b[8] || '').localeCompare(String(a[8] || '')));

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
    // 시장 접미 표기 제거: "티엠씨(유가)" → "티엠씨"
    .replace(/\(\s*(유가|코스닥|코스피|kospi|kosdaq|코넥스|konex)\s*\)/gi, '')
    // 구 사명 표기 제거: "더핑크퐁컴퍼니(구.스마트스터디)" → "더핑크퐁컴퍼니"
    .replace(/\(\s*구\.[^)]*\)/g, '')
    .replace(/[\s\(\)\[\]㈜(주)]/g, '')
    .replace(/주식회사/g, '')
    .toLowerCase();
}

// Google Sheets가 날짜 셀을 Date 객체로 반환하는 경우를 모두 ISO 문자열로 정규화.
// 문자열로 이미 저장된 경우에도 YYYY.MM.DD·YYYY/MM/DD 등을 YYYY-MM-DD로 통일.
function toIsoDate_(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, 'Asia/Seoul', 'yyyy-MM-dd');
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  return '';
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
