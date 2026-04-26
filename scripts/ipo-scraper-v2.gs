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
  // P1-B (2026-04-26): rcept_no는 immutable이므로 document.xml 결과를 영구 캐시.
  // 첫 실행은 신규 80건 일부만 처리(maxFetch), 다음 실행에서 나머지 누적 → 시간 초과 방지.
  dartDocCache: 'dart_doc_cache',
};
// P1-B: 1회 실행에 새로 fetch할 document.xml 최대 건수 (Apps Script 6분 한도 보호).
// 실측: 17건이 5분 (평균 17초/건, XML 4MB까지 큼) → 8건/회로 보수적 설정.
// 신규 IPO는 평일 1~5건이라 일 2회 트리거로 충분히 누적됨.
const MAX_DART_DOC_FETCH_PER_RUN = 8;
// 정규식 검색 범위 — XML 전체 4MB 대신 본문 첫 N자만 검색 (확정공모가·밴드는 본문 시작 30KB 안에 등장).
const DART_DOC_SCAN_HEAD = 200000;
// 캐시 중간 저장 주기 (timeout 발생 시 부분 결과 보존용).
const DART_CACHE_SAVE_INTERVAL = 5;

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

  // P1-B (2026-04-26): 캐시에서만 document.xml 결과 사용. fetch는 buildDartDocCache_v2()로 분리.
  // 분리 사유: doc fetch (15~60초/건) + buildNormalized + archive 합산 시 6분 한도 빈번 초과.
  // 흐름: 06:00 buildDartDocCache_v2(캐시만 채움) → 08:00/18:00 fetchIPOData_v2(캐시만 읽음).
  const cache = loadDartDocCache_();
  let docHit = 0, docMiss = 0;
  rows.forEach(r => {
    const cached = cache[r.rcept_no];
    if (cached) {
      r.confirmed_price = cached.confirmed_price;
      r.band_low = cached.band_low;
      r.band_high = cached.band_high;
      r.float_pct = cached.float_pct;
      docHit++;
    } else {
      docMiss++;
    }
  });
  Logger.log(`DART document.xml 캐시: hit=${docHit} miss=${docMiss} (미스는 buildDartDocCache_v2가 다음 실행에서 채움)`);

  writeSheet_(V2_SHEETS.rawDart,
    ['corp_code', 'corp_name', 'rcept_no', 'rcept_dt', 'report_nm', 'stock_code', 'corp_cls',
     'doc_confirmed_price', 'doc_band_low', 'doc_band_high', 'doc_float_pct', 'fetched_at'],
    rows.map(r => [r.corp_code, r.corp_name, r.rcept_no, r.rcept_dt, r.report_nm, r.stock_code, r.corp_cls,
                   r.confirmed_price || '', r.band_low || '', r.band_high || '', r.float_pct || '',
                   new Date().toISOString()]));

  return rows.length;
}

// ─── DART document.xml 캐시 빌더 (P1-B 2026-04-26) ───
// 별도 트리거(매일 06:00)로 실행. fetchIPOData_v2와 분리된 책임:
//   - 이 함수: rcept_no 캐시 채우기 (느림, 1회 실행 8건 한도, 최대 5분)
//   - fetchIPOData_v2: 캐시에서 읽어 normalized 시트 빌드 (빠름, 6분 한도 안전)
// 신규 IPO는 보통 청약 7일+ 전에 공시 → 1일 지연 OK.
function buildDartDocCache_v2() {
  const start = Date.now();
  const apiKey = PropertiesService.getScriptProperties().getProperty('DART_API_KEY');
  if (!apiKey) {
    Logger.log('DART_API_KEY 미설정');
    return;
  }
  // raw_dart 시트에서 현재 IPO 필터 통과한 rcept_no 목록 읽기.
  // (fetchIPOData_v2가 먼저 한 번이라도 실행됐다는 전제. raw_dart 시트가 없으면 list.json 직접 호출)
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rawDartSheet = ss.getSheetByName(V2_SHEETS.rawDart);
  let rceptList = [];
  if (rawDartSheet && rawDartSheet.getLastRow() >= 2) {
    const values = rawDartSheet.getDataRange().getValues();
    const headers = values[0].map(String);
    const iRcept = headers.indexOf('rcept_no');
    const iName = headers.indexOf('corp_name');
    if (iRcept >= 0) {
      for (let i = 1; i < values.length; i++) {
        const r = String(values[i][iRcept] || '');
        if (r) rceptList.push({ rcept_no: r, corp_name: String(values[i][iName] || '') });
      }
    }
  }
  Logger.log(`buildDartDocCache_v2: raw_dart에서 ${rceptList.length}건 rcept_no 로드`);

  const cache = loadDartDocCache_();
  let hit = 0, ok = 0, empty = 0, fail = 0, fetched = 0, skip = 0;
  for (const r of rceptList) {
    if (cache[r.rcept_no]) { hit++; continue; }
    if (fetched >= MAX_DART_DOC_FETCH_PER_RUN) { skip++; continue; }
    const t0 = Date.now();
    const detail = fetchDartDocDetail_(apiKey, r.rcept_no);
    const elapsed = Date.now() - t0;
    Logger.log(`doc[${fetched + 1}] ${r.rcept_no} ${r.corp_name}: ${detail.status} ${elapsed}ms`);
    fetched++;
    if (detail.status === 'ok') ok++;
    else if (detail.status === 'empty') empty++;
    else fail++;
    if (detail.status !== 'fail') {
      cache[r.rcept_no] = {
        confirmed_price: detail.confirmed_price,
        band_low: detail.band_low,
        band_high: detail.band_high,
        float_pct: detail.float_pct,
        status: detail.status,
        fetched_at: new Date().toISOString(),
      };
    }
    if (fetched % DART_CACHE_SAVE_INTERVAL === 0) {
      saveDartDocCache_(cache);
      Logger.log(`  ↳ 캐시 중간 저장 (${fetched}건)`);
    }
    Utilities.sleep(150);
  }
  saveDartDocCache_(cache);
  const elapsedSec = Math.round((Date.now() - start) / 1000);
  Logger.log(`buildDartDocCache_v2 완료: hit=${hit} ok=${ok} empty=${empty} fail=${fail} skip(다음실행대기)=${skip} (${elapsedSec}초)`);
}

// ─── DART document.xml 파서 (P1-B 2026-04-26) ───
// 확정공모가·밴드(공모희망가 low/high) 추출. ZIP 응답 → XML 본문 → 정규식 파싱.
// status: 'ok' (1개 이상 추출), 'empty' (status=014 데이터 없음, SPAC 등), 'fail' (예외)
// 사양: docs/maintenance/2026-04-26-dart-document-xml-spec.md
function fetchDartDocDetail_(apiKey, rcept_no) {
  const result = { confirmed_price: null, band_low: null, band_high: null, float_pct: null, status: 'fail' };
  if (!rcept_no) return result;
  try {
    const url = `${DART_BASE}/document.xml?crtfc_key=${apiKey}&rcept_no=${rcept_no}`;
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const code = res.getResponseCode();
    if (code !== 200) {
      Logger.log(`document.xml ${rcept_no}: HTTP ${code}`);
      return result;
    }
    const rawBlob = res.getBlob();
    const bytes = rawBlob.getBytes();
    // 첫 2바이트가 PK가 아니면 ZIP 아님 (status 014 등 짧은 XML) → empty 처리
    if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4B) {
      result.status = 'empty';
      return result;
    }
    // DART 응답은 Content-Type이 octet-stream이라 Utilities.unzip이 거부 → 명시적으로 application/zip 지정
    const zipBlob = Utilities.newBlob(bytes, 'application/zip', `${rcept_no}.zip`);
    const unzipped = Utilities.unzip(zipBlob);
    if (!unzipped || unzipped.length === 0) return result;
    const fullXml = unzipped[0].getDataAsString('UTF-8');
    // 정규식 검색은 본문 첫 N자만 — XML 4MB 전체 스캔 시 17초/건이 0.5초/건으로 단축.
    // 확정공모가·밴드는 본문 시작 30KB 이내, 유통가능물량 표는 ~430KB 부근 → 600KB까지 스캔.
    const SCAN_LEN = Math.max(DART_DOC_SCAN_HEAD, 600000);
    const xml = fullXml.length > SCAN_LEN ? fullXml.substring(0, SCAN_LEN) : fullXml;

    // ─── 확정공모가 (3가지 표기 패턴) ───
    // 발행조건확정 공시에서만 출현. 정정신고서는 미정(null).
    //   1) "확정공모가액을 6,000원으로 최종 결정" (코스모로보틱스)
    //   2) "1주당 확정공모가액 6,000원"
    //   3) "확정공모가액은 12,300원" (채비 — 2026-04-26 회귀 케이스로 추가)
    let m = xml.match(/확정\s*공모\s*가액[을이]?\s*([\d,]+)\s*원\s*으로\s*(?:최종\s*)?결정/);
    if (!m) m = xml.match(/1\s*주당\s*확정\s*공모\s*가액[을이]?\s*([\d,]+)\s*원/);
    if (!m) m = xml.match(/확정\s*공모\s*가액?\s*[은인이]\s*([\d,]+)\s*원/);
    if (m) result.confirmed_price = parsePrice_(m[1]);

    // ─── 밴드: "공모희망가액인 5,300원 ~ 6,000원" 패턴 ───
    // 모든 정정/확정 신고서에 일관 등장.
    const bm = xml.match(/(?:공모\s*희망\s*가액?|희망\s*공모\s*가액?|공모\s*희망\s*가)\s*인?\s*([\d,]+)\s*원\s*~\s*([\d,]+)\s*원/);
    if (bm) {
      const low = parsePrice_(bm[1]);
      const high = parsePrice_(bm[2]);
      // 단위 sanity: 표 셀 합쳐짐으로 인한 오타 방어 (예: "5,3000원" → 53000)
      if (low > 0 && high > 0 && low < high && high < low * 10) {
        result.band_low = low;
        result.band_high = high;
      }
    }

    // ─── 상장일 유통가능 비율 (제미나이 21.8% 검증 시 발견 — 코스모 실측 32.43%) ───
    // [발행조건확정] 본문 후반부의 "상장일 유통가능</TD><TD>N,NNN</TD><TD>N.NN%</TD>" 표.
    // 셀이 HTML 태그로 분리되어 있어 [\s\S]{1,1500}? 비탐욕 매치로 키워드 후 첫 % 추출.
    // (그 다음 행은 "상장후 1개월뒤 유통가능"이라 "상장일 유통가능" 정확 매칭으로 회피)
    const fm = xml.match(/상장일\s+유통가능[\s\S]{1,1500}?(\d+(?:\.\d+)?)\s*%/);
    if (fm) {
      const pct = parseFloat(fm[1]);
      if (!isNaN(pct) && pct > 0 && pct <= 100) result.float_pct = pct;
    }

    if (result.confirmed_price || result.band_low || result.float_pct) result.status = 'ok';
    else result.status = 'empty';
  } catch (e) {
    Logger.log(`fetchDartDocDetail_ ${rcept_no} 실패: ${e.message}`);
  }
  return result;
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
// 2026-04-26 개편: detail 페이지에서 4대 팩터 모두 직접 정규식 추출 + 종목 ID 영구 캐시.
// 청약완료 종목도 detail 페이지를 통해 4대 팩터 영구 보존.
//
// 데이터 흐름:
//   1) `?o=k` 목록 페이지 → 청약 진행/예정 종목 + 종목 ID(no=) 추출 → s38_id_cache 갱신
//   2) s38_id_cache의 모든 종목(청약완료 포함) → detail 페이지 fetch → 4대 팩터 정밀 추출
//   3) raw_38 시트에 통합 저장
//
// v1 parseDetailPage는 확정공모가·기관경쟁률 추출 누락 → v2 자체 parseDetail38V2_() 사용.
function fetchFrom38_v2_() {
  if (typeof fetchAsEucKr !== 'function') {
    Logger.log('38.co.kr fetchAsEucKr 미정의 (ipo-scraper.gs 필요)');
    return 0;
  }

  // Step 1: 목록 페이지 → 종목 ID 추출 + 캐시 갱신
  const idCache = loadS38IdCache_();  // { normalized_name: { no, name, last_seen_subscribe_end } }
  const listIpos = [];
  try {
    for (let page = 1; page <= 2; page++) {
      const html = fetchAsEucKr(`http://www.38.co.kr/html/fund/index.htm?o=k&page=${page}`);
      const items = (typeof parseListPage === 'function') ? parseListPage(html) : [];
      for (const it of items) {
        listIpos.push(it);
        const noMatch = (it.detailUrl || '').match(/[?&]no=(\d+)/);
        if (noMatch) {
          const nk = normalizeName_(it.name);
          idCache[nk] = {
            no: noMatch[1],
            name: it.name,
            last_seen: new Date().toISOString().slice(0, 10),
          };
        }
      }
      Utilities.sleep(300);
    }
  } catch (e) {
    Logger.log(`38 목록 fetch 실패: ${e.message}`);
  }
  saveS38IdCache_(idCache);
  Logger.log(`38 목록: ${listIpos.length}건 노출 / 종목 ID 캐시 ${Object.keys(idCache).length}건`);

  // Step 2: 캐시된 모든 종목(청약 진행+완료) detail fetch
  const rows = [];
  const listMap = {};  // 목록에서 가져온 데이터 fallback (청약일 등)
  listIpos.forEach(it => { listMap[normalizeName_(it.name)] = it; });

  let detailOk = 0, detailFail = 0;
  for (const nk of Object.keys(idCache)) {
    const cached = idCache[nk];
    const listItem = listMap[nk] || {};
    let d = {};
    try {
      const url = `https://www.38.co.kr/html/fund/?o=v&no=${cached.no}&l=&page=1`;
      const html = fetchAsEucKr(url);
      d = parseDetail38V2_(html);
      detailOk++;
      Utilities.sleep(300);
    } catch (e) {
      detailFail++;
      Logger.log(`38 detail 실패 (${cached.name} no=${cached.no}): ${e.message}`);
    }
    rows.push({
      name: cached.name,
      market: d.market || listItem.market || '',
      subscribe_start: listItem.subscribeStart || '',
      subscribe_end: listItem.subscribeEnd || '',
      refund_date: d.refund_date || '',
      listing_date: d.listing_date || '',
      // detail 우선 (확정가는 detail이 더 정확) → 목록 fallback
      confirmed_price: d.confirmed_price || listItem.confirmedPrice || '',
      expected_price: d.expected_price || listItem.expectedPrice || '',
      lead: d.lead || listItem.lead || '',
      demand_competition: d.demand_competition || listItem.competition || '',
      lockup: d.lockup || '',
      float_ratio: d.float_ratio || '',
      shares: d.shares || '',
    });
  }
  Logger.log(`38 detail: ok=${detailOk} fail=${detailFail} (총 ${rows.length}건)`);

  writeSheet_(V2_SHEETS.raw38,
    ['name', 'market', 'subscribe_start', 'subscribe_end', 'refund_date', 'listing_date',
     'confirmed_price', 'expected_price', 'lead', 'demand_competition', 'lockup', 'float_ratio', 'shares', 'fetched_at'],
    rows.map(r => [r.name, r.market, r.subscribe_start, r.subscribe_end, r.refund_date, r.listing_date,
                   r.confirmed_price, r.expected_price, r.lead, r.demand_competition, r.lockup, r.float_ratio, r.shares,
                   new Date().toISOString()]));
  return rows.length;
}

// ─── 38 상세 페이지 파서 v2 (2026-04-26 P1-B 후속) ───
// v1 parseDetailPage(ipo-scraper.gs)는 확정공모가·기관경쟁률 추출 누락 → v2 자체 구현.
// 정규식은 38 코스모로보틱스(no=2278) 실측 기반.
function parseDetail38V2_(html) {
  const out = {
    market: '', refund_date: '', listing_date: '',
    confirmed_price: '', expected_price: '',
    demand_competition: '', lockup: '', float_ratio: '', shares: '', lead: '',
  };
  if (!html) return out;
  const pick = (re, idx) => { const m = html.match(re); return m ? m[idx || 1] : ''; };
  const dateFmt = (s) => s ? s.replace(/\./g, '-') : '';

  out.confirmed_price = pick(/확정공모가[\s\S]{1,300}?<td[^>]*>[\s\S]{1,100}?<b>\s*([\d,]+)\s*<\/b>\s*원/);
  const bm = html.match(/희망공모가액[\s\S]{1,300}?([\d,]+)\s*~\s*([\d,]+)\s*원/);
  if (bm) out.expected_price = `${bm[1]}~${bm[2]}`;
  out.demand_competition = pick(/기관경쟁률[\s\S]{1,300}?<td[^>]*>\s*([\d,.]+)\s*<\/td>/);
  if (out.demand_competition) out.demand_competition = `${out.demand_competition}:1`;
  // P1-B fix (2026-04-26): "의무보유확약" 키워드 직후 0.00%는 청약일정 표 빈자리.
  // 진짜 확약비율은 "확약비율" 섹션의 "총 수량 대비 비율(%)" 후 값. (코스모로보틱스 73.03% 케이스)
  out.lockup = pick(/총\s*수량\s*대비\s*비율\s*\(\s*%\s*\)[\s\S]{1,500}?([\d.]+)\s*%/);
  if (out.lockup) out.lockup = `${out.lockup}%`;
  out.shares = pick(/총공모주식수\s*<\/td>[\s\S]{1,200}?<td[^>]*>[\s\S]{1,30}?([\d,]+)\s*주/);
  out.lead = pick(/주\s*간\s*사\s*<\/td>[\s\S]{1,300}?<b>\s*([^<]+?)\s*<\/b>/);
  out.market = pick(/시장구분[\s\S]{1,300}?<td[^>]*>[\s\S]{1,100}?(코스닥|코스피|코넥스)/).toLowerCase();
  out.refund_date = dateFmt(pick(/환불일\s*<\/td>[\s\S]{1,300}?<td[^>]*>[\s\S]{1,100}?(\d{4}\.\d{2}\.\d{2})/));
  out.listing_date = dateFmt(pick(/상장일\s*<\/td>[\s\S]{1,300}?<td[^>]*>[\s\S]{1,100}?(\d{4}\.\d{2}\.\d{2})/));
  // 유통가능물량 — "유통가능물량" 키워드 이후 최초 % 값 (단 1~99 범위만)
  const fIdx = html.indexOf('유통가능물량');
  if (fIdx >= 0) {
    const after = html.substring(fIdx, fIdx + 5000);
    const fm = after.match(/(\d+(?:\.\d+)?)\s*%/);
    if (fm) {
      const n = parseFloat(fm[1]);
      if (n > 0 && n < 100) out.float_ratio = `${n}%`;
    }
  }
  return out;
}

// ─── 38 종목 ID 영구 캐시 (s38_id_cache) ───
// 청약완료 후 38 목록에서 사라진 종목도 detail 페이지를 fetch할 수 있도록 ID 영구 보존.
function loadS38IdCache_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('s38_id_cache');
  if (!sheet || sheet.getLastRow() < 2) return {};
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const iN = headers.indexOf('normalized_name');
  const iNo = headers.indexOf('no');
  const iName = headers.indexOf('name');
  const iLs = headers.indexOf('last_seen');
  const out = {};
  for (let i = 1; i < values.length; i++) {
    const nk = String(values[i][iN] || '');
    if (!nk) continue;
    out[nk] = {
      no: String(values[i][iNo] || ''),
      name: String(values[i][iName] || ''),
      last_seen: String(values[i][iLs] || ''),
    };
  }
  return out;
}

function saveS38IdCache_(cache) {
  const headers = ['normalized_name', 'no', 'name', 'last_seen'];
  const rows = Object.keys(cache).sort().map(nk => {
    const c = cache[nk];
    return [nk, c.no, c.name, c.last_seen];
  });
  writeSheet_('s38_id_cache', headers, rows);
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
    // P1-B 후속 (2026-04-26): DART [발행조건확정]의 "상장일 유통가능 N.NN%" (코스모 32.43%) 우선 사용.
    // 38이 표시하는 21.04%는 최대주주 1인 지분율로 잘못된 값. 38 fallback은 경고용으로만 유지.
    const dartFloatPct = (d.doc_float_pct === '' || d.doc_float_pct == null) ? null : Number(d.doc_float_pct);
    const floatPct = (dartFloatPct != null && dartFloatPct > 0) ? dartFloatPct : parsePercent_(s.float_ratio);

    // P1-B (2026-04-26) confidence 재산정:
    //   38 + DART corp_code 매칭 + DART doc 값(확정가/밴드)과 38 값이 모두 일치 → high ("✓ 공식 교차확인")
    //   38 + DART corp_code 매칭 + DART doc 값과 38 값이 1개 이상 불일치(≥10원/≥10%) → flag ("⚠ DART 불일치")
    //   38 + DART corp_code 매칭 + DART doc 값 추출 안 됨 (정정신고서 미확정 등) → high (corp_code 매칭만으로 신뢰)
    //   38 only → medium
    let confidence = 'medium';
    let mismatchNote = '';
    if (sources.indexOf('dart') >= 0) {
      confidence = 'high';
      // 가격 교차검증 (DART doc 값이 있는 항목만)
      const cmp = compareDartVs38_(d, {
        confirmed: confirmedNum,
        band_low: bandLow,
        band_high: bandHigh,
      });
      if (cmp.flag) {
        confidence = 'flag';
        mismatchNote = cmp.note;
      }
    }

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
      // P1-B: 불일치 노트(mismatchNote)를 앞에, 기존 라벨을 뒤에 결합 (둘 다 있으면 ' · '로 연결)
      [mismatchNote, s.demand_competition ? '기관 수요예측' : ''].filter(Boolean).join(' · '),
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

// P1-B (2026-04-26): DART document.xml 추출치(d.doc_*) vs 38.co.kr 파싱치 비교.
// 일치 허용오차: ±10원 (가격 표기 반올림 차이 흡수).
// flag=true 반환 시 buildNormalized_가 confidence를 'flag'로 설정 + competition_note에 노트 prepend.
function compareDartVs38_(dartRow, vals38) {
  const diffs = [];
  const cmpPrice = (label, dartVal, val38) => {
    const d = dartVal == null || dartVal === '' ? null : parseInt(dartVal, 10);
    const s = val38 == null || val38 === '' ? null : parseInt(val38, 10);
    if (!d || !s) return; // 한쪽이라도 비어있으면 비교 불가 (불일치 아님)
    if (Math.abs(d - s) > 10) {
      diffs.push(`${label}:DART${d.toLocaleString()}vs38${s.toLocaleString()}`);
    }
  };
  cmpPrice('확정가', dartRow.doc_confirmed_price, vals38.confirmed);
  cmpPrice('밴드하', dartRow.doc_band_low, vals38.band_low);
  cmpPrice('밴드상', dartRow.doc_band_high, vals38.band_high);
  return { flag: diffs.length > 0, note: diffs.length ? `⚠ ${diffs.join(' / ')}` : '' };
}

// 2026-04-26 fix: number 형식 직접 입력 지원.
// Sheets가 "21.04%"를 percentage cell로 저장하면 read 시 0.2104 (number)로 반환됨 → 기존 정규식 매치 실패 → null.
function parsePercent_(str) {
  if (str == null || str === '') return null;
  if (typeof str === 'number') {
    if (str > 0 && str < 1) return Math.round(str * 10000) / 100;  // 0.2104 → 21.04
    return str;
  }
  const m = String(str).match(/([\d.]+)\s*%?/);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (isNaN(n)) return null;
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

// P1-B (2026-04-26): DART document.xml 영구 캐시. rcept_no는 immutable이므로 한 번 추출한 결과는
// 변하지 않음. 첫 실행에서 일부만 fetch하고 캐시 적재 → 이후 실행은 hit만 사용 + 신규만 fetch.
function loadDartDocCache_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(V2_SHEETS.dartDocCache);
  if (!sheet || sheet.getLastRow() < 2) return {};
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const idx = (h) => headers.indexOf(h);
  const iRcept = idx('rcept_no'), iCp = idx('confirmed_price'),
        iBl = idx('band_low'), iBh = idx('band_high'),
        iFp = idx('float_pct'),
        iSt = idx('status'), iFa = idx('fetched_at');
  const out = {};
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rcept = String(row[iRcept] || '');
    if (!rcept) continue;
    out[rcept] = {
      confirmed_price: row[iCp] === '' ? null : Number(row[iCp]),
      band_low: row[iBl] === '' ? null : Number(row[iBl]),
      band_high: row[iBh] === '' ? null : Number(row[iBh]),
      float_pct: (iFp < 0 || row[iFp] === '' || row[iFp] == null) ? null : Number(row[iFp]),
      status: row[iSt] || '',
      fetched_at: row[iFa] || '',
    };
    // P1-B fix (2026-04-26): float_pct가 null인 ok 캐시는 구 schema 또는 정규식 미스 → 무효 처리.
    // (band_low/band_high 추출 가능했던 종목은 유통가능 표도 있을 가능성 높음 → 다시 fetch)
    if (out[rcept].status === 'ok' && out[rcept].float_pct == null && out[rcept].band_low != null) {
      delete out[rcept];
    }
  }
  return out;
}

function saveDartDocCache_(cache) {
  const headers = ['rcept_no', 'confirmed_price', 'band_low', 'band_high', 'float_pct', 'status', 'fetched_at'];
  const rows = Object.keys(cache).sort().map(rcept => {
    const c = cache[rcept];
    return [rcept, c.confirmed_price ?? '', c.band_low ?? '', c.band_high ?? '', c.float_pct ?? '', c.status || '', c.fetched_at || ''];
  });
  writeSheet_(V2_SHEETS.dartDocCache, headers, rows);
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
    const fn = t.getHandlerFunction();
    if (fn === 'fetchIPOData_v2' || fn === 'buildDartDocCache_v2') ScriptApp.deleteTrigger(t);
  }
  // P1-B: doc 캐시 빌더를 fetchIPOData_v2 보다 먼저 실행 (06:00 / 16:00)
  // → fetchIPOData_v2 (08:00 / 18:00)에서 캐시 hit 최대화
  ScriptApp.newTrigger('buildDartDocCache_v2').timeBased().everyDays(1).atHour(6).create();
  ScriptApp.newTrigger('buildDartDocCache_v2').timeBased().everyDays(1).atHour(16).create();
  ScriptApp.newTrigger('fetchIPOData_v2').timeBased().everyDays(1).atHour(8).create();
  ScriptApp.newTrigger('fetchIPOData_v2').timeBased().everyDays(1).atHour(18).create();
  Logger.log('v2 트리거 설정 완료: doc 캐시 06:00/16:00, normalize 08:00/18:00');
}
