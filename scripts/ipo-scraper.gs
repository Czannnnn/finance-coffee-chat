/**
 * 공모주 청약 일정 스크래퍼 (Google Apps Script)
 * 데이터 소스: 38커뮤니케이션 (38.co.kr)
 *
 * 사용법:
 * 1. Google Sheets에서 확장프로그램 > Apps Script 열기
 * 2. 이 코드를 붙여넣기
 * 3. fetchIPOData() 함수 실행
 * 4. 트리거 설정: 매일 자동 실행
 */

// ─── 설정 ───
const SHEET_NAME = 'IPO데이터';
const LOG_SHEET_NAME = '실행로그';
const LIST_URL = 'http://www.38.co.kr/html/fund/index.htm?o=k';
const DETAIL_BASE = 'http://www.38.co.kr/html/fund/index.htm';
const MAX_PAGES = 2; // 최근 2페이지만 (약 40건)
const ALERT_EMAIL = 'hello@financecoffeechat.com'; // P1-2: 실패 알림 수신 주소
const PARSE_FAILURE_THRESHOLD = 0.5; // 상세페이지 파싱 성공률이 50% 미만이면 경고

// ─── 메인 함수 ───
function fetchIPOData() {
  const start = Date.now();
  let status = 'ok';
  let errorMessage = '';
  let listCount = 0;
  let detailSuccess = 0;
  let detailAttempt = 0;

  try {
    const sheet = getOrCreateSheet();
    const ipos = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = `${LIST_URL}&page=${page}`;
      const html = fetchAsEucKr(url);
      const pageIpos = parseListPage(html);
      ipos.push(...pageIpos);
    }
    listCount = ipos.length;

    // 상세 페이지에서 환불일, 상장일, 시장구분 가져오기
    for (const ipo of ipos) {
      if (ipo.detailUrl) {
        detailAttempt++;
        try {
          const detailHtml = fetchAsEucKr(ipo.detailUrl);
          const detail = parseDetailPage(detailHtml);
          ipo.market = detail.market || '';
          ipo.refundDate = detail.refundDate || '';
          ipo.listingDate = detail.listingDate || '';
          ipo.lockup = detail.lockup || '';
          ipo.shares = detail.shares || '';
          ipo.floatRatio = detail.floatRatio || '';
          // P1-2: 최소 1개 필드라도 채워졌는지 확인 (전부 공란이면 파싱 실패로 간주)
          if (detail.refundDate || detail.listingDate || detail.shares) {
            detailSuccess++;
          }
          Utilities.sleep(500); // 서버 부하 방지
        } catch (e) {
          Logger.log(`상세 페이지 오류 (${ipo.name}): ${e.message}`);
        }
      }
    }

    // 신규상장 페이지에서 시초가 데이터 가져오기 (o=nw)
    const listingData = fetchListingData();
    for (const ipo of ipos) {
      const match = listingData[ipo.name];
      if (match) {
        ipo.openPrice = match.openPrice || '';
        ipo.openPriceRatio = match.openPriceRatio || '';
      }
    }

    writeToSheet(sheet, ipos);
    Logger.log(`${ipos.length}건의 공모주 데이터를 업데이트했습니다.`);

    // P1-2: 파싱 성공률 저조 시 경고 상태
    const successRate = detailAttempt > 0 ? detailSuccess / detailAttempt : 1;
    if (successRate < PARSE_FAILURE_THRESHOLD) {
      status = 'warn';
      errorMessage = `상세 파싱 성공률 ${Math.round(successRate * 100)}% (${detailSuccess}/${detailAttempt})`;
    }
  } catch (e) {
    status = 'error';
    errorMessage = `${e.message}\n${e.stack || ''}`;
    Logger.log(`fetchIPOData 실패: ${errorMessage}`);
  }

  const elapsedSec = Math.round((Date.now() - start) / 1000);
  writeRunLog_(status, listCount, detailSuccess, detailAttempt, elapsedSec, errorMessage);

  if (status !== 'ok') {
    notifyFailure_(status, listCount, detailSuccess, detailAttempt, elapsedSec, errorMessage);
  }
}

// ─── P1-2: 실행 로그 기록 ───
function writeRunLog_(status, listCount, detailSuccess, detailAttempt, elapsedSec, errorMessage) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName(LOG_SHEET_NAME);
    if (!logSheet) {
      logSheet = ss.insertSheet(LOG_SHEET_NAME);
      logSheet.getRange(1, 1, 1, 7).setValues([
        ['실행시각', '상태', '목록건수', '상세성공', '상세시도', '소요(초)', '오류메시지'],
      ]);
      logSheet.getRange(1, 1, 1, 7).setFontWeight('bold');
    }
    logSheet.appendRow([
      new Date().toISOString().slice(0, 19).replace('T', ' '),
      status,
      listCount,
      detailSuccess,
      detailAttempt,
      elapsedSec,
      (errorMessage || '').slice(0, 500),
    ]);
    // 로그 500행 초과 시 오래된 것 삭제
    const lastRow = logSheet.getLastRow();
    if (lastRow > 501) {
      logSheet.deleteRows(2, lastRow - 501);
    }
  } catch (e) {
    Logger.log(`writeRunLog_ 실패: ${e.message}`);
  }
}

// ─── P1-2: 이메일 알림 ───
function notifyFailure_(status, listCount, detailSuccess, detailAttempt, elapsedSec, errorMessage) {
  try {
    const subject = `[Finance Coffee Chat] IPO 스크래퍼 ${status === 'error' ? '실패' : '경고'} (${new Date().toISOString().slice(0, 10)})`;
    const body = [
      `상태: ${status}`,
      `소요: ${elapsedSec}초`,
      `목록 수집: ${listCount}건`,
      `상세 파싱 성공: ${detailSuccess}/${detailAttempt}`,
      ``,
      `오류:`,
      errorMessage || '(없음)',
      ``,
      `시트: https://docs.google.com/spreadsheets/d/${SpreadsheetApp.getActiveSpreadsheet().getId()}/edit`,
    ].join('\n');
    MailApp.sendEmail(ALERT_EMAIL, subject, body);
  } catch (e) {
    Logger.log(`notifyFailure_ 실패: ${e.message}`);
  }
}

// ─── 신규상장 페이지에서 시초가 데이터 수집 ───
function fetchListingData() {
  const result = {};
  const NW_URL = 'http://www.38.co.kr/html/fund/index.htm?o=nw';

  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const url = `${NW_URL}&page=${page}`;
      const html = fetchAsEucKr(url);

      // 테이블에서 데이터 행 추출
      const rows = html.match(/<tr[^>]*bgColor[^>]*>([\s\S]*?)<\/tr>/gi);
      if (!rows) continue;

      for (const row of rows) {
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
        if (!cells || cells.length < 9) continue;

        const cleanCell = (i) => cells[i].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim();

        const name = cleanCell(0);
        if (!name) continue;

        // 컬럼: 0기업명, 1상장일, 2현재가, 3전일비, 4공모가, 5공모가대비%, 6시초가, 7시초/공모%, 8첫날종가
        const openPrice = cleanCell(6).replace(/,/g, '');
        const openRatio = cleanCell(7);

        if (openPrice && openPrice !== '-') {
          result[name] = {
            openPrice: openPrice,
            openPriceRatio: openRatio,
          };
        }
      }
      Utilities.sleep(300);
    } catch (e) {
      Logger.log(`신규상장 페이지 오류 (page ${page}): ${e.message}`);
    }
  }

  return result;
}

// ─── EUC-KR 페이지 가져오기 ───
function fetchAsEucKr(url) {
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const bytes = response.getContent();
  return Utilities.newBlob(bytes).getDataAsString('EUC-KR');
}

// ─── 목록 페이지 파싱 ───
function parseListPage(html) {
  const ipos = [];

  // fund 상세 링크가 포함된 테이블 찾기
  const tables = html.match(/<table[^>]*>([\s\S]*?)<\/table>/gi);
  if (!tables) return ipos;

  let tableHtml = '';
  for (const table of tables) {
    if (table.includes('/html/fund/') && table.includes('o=v')) {
      tableHtml = table;
      break;
    }
  }
  if (!tableHtml) return ipos;

  // fund 링크가 포함된 행 추출
  const rows = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  if (!rows) return ipos;

  for (const row of rows) {
    // fund 상세 링크가 없는 행 건너뛰기
    if (!row.includes('/html/fund/') || !row.includes('o=v')) continue;

    const cells = [];
    const cellMatches = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
    if (!cellMatches || cellMatches.length < 6) continue;

    for (const cell of cellMatches) {
      const text = cell.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim();
      cells.push(text);
    }

    // 종목명 링크에서 상세 URL 추출 (&amp; 디코딩 포함)
    const linkMatch = row.match(/href=["']([^"']*fund[^"']*o=v[^"']*)["']/i);
    let detailUrl = '';
    if (linkMatch) {
      const path = linkMatch[1].replace(/&amp;/g, '&');
      detailUrl = path.startsWith('http') ? path : `http://www.38.co.kr${path}`;
    }

    // 청약 상태 판별 (font color)
    const isUpcoming = row.includes('#0066CC') || row.includes('#0066cc');

    // 청약일정 파싱 (예: "2026.05.11~05.12")
    const schedule = cells[1] || '';
    const { startDate, endDate } = parseSchedule(schedule);

    const ipo = {
      name: cells[0] || '',
      subscribeStart: startDate,
      subscribeEnd: endDate,
      confirmedPrice: cleanPrice(cells[2]),
      expectedPrice: cells[3] || '',
      competition: cells[4] || '',
      lead: cells[5] || '',
      isUpcoming: isUpcoming,
      detailUrl: detailUrl,
      // 상세 페이지에서 채워질 필드
      market: '',
      refundDate: '',
      listingDate: '',
      lockup: '',
      shares: '',
      floatRatio: '',
      openPrice: '',
      openPriceRatio: '',
    };

    if (ipo.name) {
      ipos.push(ipo);
    }
  }

  return ipos;
}

// ─── 상세 페이지 파싱 ───
function parseDetailPage(html) {
  const detail = {
    market: '',
    refundDate: '',
    listingDate: '',
    lockup: '',
    shares: '',
    floatRatio: '',
  };

  // 시장구분
  const marketMatch = html.match(/시장구분[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
  if (marketMatch) {
    const val = marketMatch[1].replace(/<[^>]+>/g, '').trim();
    if (val.includes('코스피') || val.includes('유가증권')) {
      detail.market = 'kospi';
    } else if (val.includes('코스닥')) {
      detail.market = 'kosdaq';
    } else if (val.includes('코넥스')) {
      detail.market = 'konex';
    }
  }

  // 환불일
  const refundMatch = html.match(/환불일[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
  if (refundMatch) {
    detail.refundDate = extractDate(refundMatch[1]);
  }

  // 상장일
  const listingMatch = html.match(/상장일[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
  if (listingMatch) {
    detail.listingDate = extractDate(listingMatch[1]);
  }

  // 의무보유확약
  const lockupMatch = html.match(/의무보유확약[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
  if (lockupMatch) {
    const val = lockupMatch[1].replace(/<[^>]+>/g, '').trim();
    const pctMatch = val.match(/([\d.]+)\s*%/);
    detail.lockup = pctMatch ? `${pctMatch[1]}%` : val;
  }

  // 총공모주식수
  const sharesMatch = html.match(/총공모주식수[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
  if (sharesMatch) {
    detail.shares = sharesMatch[1].replace(/<[^>]+>/g, '').trim();
  }

  // 유통가능물량 비율
  // "유통가능물량" 컬럼 헤더 이후 첫 번째 퍼센트 값 추출
  // ("유통가능"은 섹션 제목에도 등장하므로 "유통가능물량"으로 정확히 매칭)
  const floatIdx = html.indexOf('유통가능물량');
  if (floatIdx >= 0) {
    const afterFloat = html.substring(floatIdx, floatIdx + 10000);
    const floatPctMatch = afterFloat.match(/([\d,.]+)\s*%/);
    if (floatPctMatch) {
      const num = parseFloat(floatPctMatch[1].replace(/,/g, ''));
      if (num > 0 && num < 100) {
        detail.floatRatio = `${num}%`;
      }
    }
  }

  return detail;
}

// ─── 유틸리티 ───
function parseSchedule(str) {
  // 형식: "2026.05.11~05.12" 또는 "2026.05.11~2026.05.12"
  const match = str.match(/(\d{4})\.(\d{2})\.(\d{2})~(?:(\d{4})\.)?(\d{2})\.(\d{2})/);
  if (!match) return { startDate: '', endDate: '' };

  const startYear = match[1];
  const startMonth = match[2];
  const startDay = match[3];
  const endYear = match[4] || startYear;
  const endMonth = match[5];
  const endDay = match[6];

  return {
    startDate: `${startYear}-${startMonth}-${startDay}`,
    endDate: `${endYear}-${endMonth}-${endDay}`,
  };
}

function extractDate(htmlStr) {
  const text = htmlStr.replace(/<[^>]+>/g, '').trim();
  const match = text.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}

function cleanPrice(str) {
  if (!str || str === '-' || str.trim() === '') return '';
  return str.replace(/[^0-9,]/g, '').trim();
}

function getStatus(ipo) {
  if (!ipo.subscribeStart) return 'upcoming';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(ipo.subscribeStart);
  const end = new Date(ipo.subscribeEnd);

  if (today < start) return 'upcoming';
  if (today >= start && today <= end) return 'active';

  if (ipo.listingDate) {
    const listing = new Date(ipo.listingDate);
    if (today >= listing) return 'completed';
  }

  return 'completed';
}

// ─── 시트 작업 ───
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  // 헤더 설정
  const headers = [
    '종목명', '시장구분', '상태', '확정공모가', '희망공모가',
    '청약시작일', '청약종료일', '환불일', '상장일',
    '주관사', '경쟁률', '확약비율', '공모주식수', '유통비율', '시초가', '시초가수익률', '업데이트'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');

  return sheet;
}

function writeToSheet(sheet, ipos) {
  // 기존 데이터 삭제 (헤더 제외)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 17).clear();
  }

  if (ipos.length === 0) return;

  const now = new Date().toISOString().slice(0, 19);
  const data = ipos.map(ipo => [
    ipo.name,
    ipo.market,
    getStatus(ipo),
    ipo.confirmedPrice,
    ipo.expectedPrice,
    ipo.subscribeStart,
    ipo.subscribeEnd,
    ipo.refundDate,
    ipo.listingDate,
    ipo.lead,
    ipo.competition,
    ipo.lockup,
    ipo.shares,
    ipo.floatRatio,
    ipo.openPrice || '',
    ipo.openPriceRatio || '',
    now,
  ]);

  sheet.getRange(2, 1, data.length, 17).setValues(data);
}

// ─── 트리거 설정 (최초 1회 실행) ───
function setupDailyTrigger() {
  // 기존 트리거 삭제
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'fetchIPOData') {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  // 매일 오전 8시에 실행
  ScriptApp.newTrigger('fetchIPOData')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();

  Logger.log('매일 오전 8시 자동 실행 트리거가 설정되었습니다.');
}
