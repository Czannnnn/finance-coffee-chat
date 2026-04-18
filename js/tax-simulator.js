// Finance Coffee Chat — 절세 시뮬레이터 (3탭: 절세계좌 환급 / 연말정산 종합 / DC vs DB)
// 모든 계산은 100% 브라우저 로컬. URL 쿼리로만 상태 공유.

(function (global) {
  'use strict';

  // ────────── 1. 계산 엔진 ──────────

  /**
   * 절세계좌 세액공제 환급액 계산.
   * @param {Object} i
   * @param {number} i.salary       총급여 (만원)
   * @param {number} i.yeoJeoPen    연저펀 연 납입액 (만원)
   * @param {number} i.irp          IRP 연 납입액 (만원)
   * @param {number} i.isaConv      ISA 만기 연금전환액 (만원, 0~300)
   */
  function calcPensionCredit(i) {
    var salary = Math.max(0, Number(i.salary) || 0);
    var yeoJeoPen = Math.max(0, Math.min(600, Number(i.yeoJeoPen) || 0));
    var irp = Math.max(0, Math.min(300, Number(i.irp) || 0));
    var isaConv = Math.max(0, Math.min(300, Number(i.isaConv) || 0));

    var totalPen = yeoJeoPen + irp;
    var rate = salary <= 5500 ? 0.165 : 0.132;
    var thisYear = totalPen * rate;
    var isaBonus = isaConv * rate;

    return {
      rate: rate,
      ratePct: Math.round(rate * 1000) / 10,
      totalPension: totalPen,
      thisYear: thisYear,
      isaBonus: isaBonus,
      cum3: (thisYear + isaBonus / 3) * 3,
      cum5: (thisYear + isaBonus / 5) * 5,
      cum10: (thisYear + isaBonus / 10) * 10,
      total: thisYear + isaBonus
    };
  }

  /**
   * 연말정산 종합 — 월세·의료비·기부금·고향사랑·연금 합계.
   * @param {Object} i
   */
  function calcYearEndSummary(i) {
    var salary = Math.max(0, Number(i.salary) || 0);
    var rent = Math.max(0, Number(i.rent) || 0);          // 연 월세 총액 (만원)
    var medical = Math.max(0, Number(i.medical) || 0);     // 연 의료비 (만원)
    var donation = Math.max(0, Number(i.donation) || 0);   // 일반 기부금 (만원)
    var furusato = Math.max(0, Math.min(11, Number(i.furusato) || 0)); // 고향사랑 (만원, 최대 11)
    var yeoJeoPen = Math.max(0, Math.min(600, Number(i.yeoJeoPen) || 0));
    var irp = Math.max(0, Math.min(300, Number(i.irp) || 0));

    // 1) 연금 세액공제 (5500↓ 16.5%, 5500↑ 13.2%)
    var penRate = salary <= 5500 ? 0.165 : 0.132;
    var pension = (yeoJeoPen + irp) * penRate;

    // 2) 월세 공제 (총급여 8000↓, 연 750만 한도, 15%)
    var rentCredit = 0;
    if (salary <= 8000 && rent > 0) {
      rentCredit = Math.min(rent, 750) * 0.15;
    }

    // 3) 의료비 세액공제 (총급여 3% 초과분 × 15%)
    var medicalThreshold = salary * 0.03;
    var medicalCredit = 0;
    if (medical > medicalThreshold) {
      medicalCredit = (medical - medicalThreshold) * 0.15;
    }

    // 4) 기부금 세액공제 (1000만↓ 15%, 초과분 30% — 단순화: 15%)
    var donationCredit = donation * 0.15;

    // 5) 고향사랑기부 — 10만까지 100%, 10~11만 구간은 30% (단순화)
    var furusatoCredit = 0;
    if (furusato <= 10) {
      furusatoCredit = furusato;
    } else {
      furusatoCredit = 10 + (furusato - 10) * 0.3;
    }
    var furusatoGift = furusato * 0.3; // 답례품 가치

    var total = pension + rentCredit + medicalCredit + donationCredit + furusatoCredit;

    return {
      pension: pension,
      rentCredit: rentCredit,
      medicalCredit: medicalCredit,
      medicalThreshold: medicalThreshold,
      donationCredit: donationCredit,
      furusatoCredit: furusatoCredit,
      furusatoGift: furusatoGift,
      total: total,
      penRate: penRate
    };
  }

  /**
   * DC vs DB 비교 — 단순 모형.
   * DB: 예상 최종 임금 × 예상 최종 근속
   * DC: 매년 (임금/12) 적립 × 운용수익률 복리
   */
  function calcDcVsDb(i) {
    var currentSalary = Math.max(0, Number(i.currentSalary) || 0);  // 만원
    var currentTenure = Math.max(0, Number(i.currentTenure) || 0);
    var retireTenure = Math.max(currentTenure, Number(i.retireTenure) || currentTenure);
    var wageGrowth = Math.max(-0.1, Math.min(0.2, Number(i.wageGrowth) || 0));
    var dcReturn = Math.max(-0.1, Math.min(0.3, Number(i.dcReturn) || 0));

    var yearsToGo = retireTenure - currentTenure;

    // DB: 퇴직 직전 임금 × 총 근속
    var finalSalary = currentSalary * Math.pow(1 + wageGrowth, yearsToGo);
    var dbPayout = finalSalary * retireTenure;

    // DC: 매년 (그해 임금 / 12) 적립, 운용수익률 복리
    // 현 시점까지는 이미 적립된 잔고 가정 = 현재 임금 × 현재 근속 × 0.08 (단순 추정)
    var dcBalance = currentSalary * currentTenure * 0.08;
    for (var y = 0; y < yearsToGo; y++) {
      var yearlyWage = currentSalary * Math.pow(1 + wageGrowth, y);
      var contribution = yearlyWage / 12; // 월 급여 1개월분/년 = 연 적립
      dcBalance = (dcBalance + contribution) * (1 + dcReturn);
    }

    var diff = dcBalance - dbPayout;
    var winner = diff > 0 ? 'DC' : (diff < 0 ? 'DB' : '동일');

    return {
      dbPayout: dbPayout,
      dcPayout: dcBalance,
      finalSalary: finalSalary,
      diff: diff,
      winner: winner,
      yearsToGo: yearsToGo
    };
  }

  // ────────── 2. URL 상태 ──────────

  var TAB_KEYS = {
    accounts: ['a_salary', 'a_yeoJeoPen', 'a_irp', 'a_isaConv'],
    yearEnd: ['y_salary', 'y_rent', 'y_medical', 'y_donation', 'y_furusato', 'y_pen', 'y_irp'],
    retire: ['r_curSalary', 'r_curTen', 'r_retTen', 'r_wageG', 'r_dcR']
  };
  var ALL_KEYS = [].concat(TAB_KEYS.accounts, TAB_KEYS.yearEnd, TAB_KEYS.retire, ['tab']);

  function parseUrlState() {
    var params = new URLSearchParams(window.location.search);
    var state = {};
    ALL_KEYS.forEach(function (k) {
      var v = params.get(k);
      if (v != null && v !== '') state[k] = v;
    });
    return state;
  }

  function serializeUrlState(state) {
    var params = new URLSearchParams();
    ALL_KEYS.forEach(function (k) {
      if (state[k] != null && state[k] !== '') params.set(k, String(state[k]));
    });
    var str = params.toString();
    return str ? '?' + str : '';
  }

  function updateUrl(state) {
    var q = serializeUrlState(state);
    var hash = document.querySelector('.tab-btn.active');
    var h = hash ? '#' + hash.dataset.tab : '';
    window.history.replaceState(null, '', window.location.pathname + q + h);
  }

  function getNumInput(id, fallback) {
    var el = document.getElementById(id);
    if (!el) return fallback;
    var v = Number(el.value);
    return isFinite(v) ? v : fallback;
  }

  function setInputFromUrl(urlKey, elId) {
    var params = new URLSearchParams(window.location.search);
    var v = params.get(urlKey);
    if (v != null && v !== '') {
      var el = document.getElementById(elId);
      if (el) el.value = v;
    }
  }

  // ────────── 3. 차트 ──────────

  var accountsChart = null;
  var yearEndChart = null;
  var dcDbChart = null;

  function renderAccountsChart(result) {
    var canvas = document.getElementById('accountsChart');
    if (!canvas || typeof Chart === 'undefined') return;
    if (accountsChart) accountsChart.destroy();
    accountsChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['당해', '3년 누적', '5년 누적', '10년 누적'],
        datasets: [{
          label: '총 환급액 (만원)',
          data: [
            Math.round(result.total),
            Math.round(result.cum3),
            Math.round(result.cum5),
            Math.round(result.cum10)
          ],
          backgroundColor: ['#C4853C', '#C4853C', '#3F8A5C', '#3A6EA5']
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: function (c) { return c.parsed.y.toLocaleString() + '만원'; } } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#6B3A2A', callback: function (v) { return v.toLocaleString() + '만'; } } },
          x: { ticks: { color: '#6B3A2A' } }
        }
      }
    });
  }

  function renderYearEndChart(result) {
    var canvas = document.getElementById('yearEndChart');
    if (!canvas || typeof Chart === 'undefined') return;
    if (yearEndChart) yearEndChart.destroy();
    yearEndChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['연금 세액공제', '월세', '의료비', '기부금', '고향사랑'],
        datasets: [{
          data: [
            Math.round(result.pension),
            Math.round(result.rentCredit),
            Math.round(result.medicalCredit),
            Math.round(result.donationCredit),
            Math.round(result.furusatoCredit)
          ],
          backgroundColor: ['#C4853C', '#3A6EA5', '#3F8A5C', '#6B3A2A', '#B8473D'],
          borderColor: '#FFFDF9', borderWidth: 2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#3D2317', font: { size: 12 }, padding: 10 } },
          tooltip: { callbacks: { label: function (c) { return c.label + ': ' + c.parsed.toLocaleString() + '만'; } } }
        },
        cutout: '55%'
      }
    });
  }

  function renderDcDbChart(result) {
    var canvas = document.getElementById('dcDbChart');
    if (!canvas || typeof Chart === 'undefined') return;
    if (dcDbChart) dcDbChart.destroy();
    dcDbChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['DB (확정급여)', 'DC (확정기여)'],
        datasets: [{
          label: '예상 퇴직급여 (만원)',
          data: [Math.round(result.dbPayout), Math.round(result.dcPayout)],
          backgroundColor: ['#3A6EA5', '#C4853C']
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: function (c) { return c.parsed.y.toLocaleString() + '만원'; } } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#6B3A2A', callback: function (v) { return (v / 10000).toFixed(1) + '억'; } } },
          x: { ticks: { color: '#6B3A2A' } }
        }
      }
    });
  }

  // ────────── 4. 결과 렌더 ──────────

  function fmt(n) {
    if (!isFinite(n)) return '0';
    return Math.round(n).toLocaleString();
  }

  function runAccounts() {
    var input = {
      salary: getNumInput('a_salary', 5000),
      yeoJeoPen: getNumInput('a_yeoJeoPen', 600),
      irp: getNumInput('a_irp', 300),
      isaConv: getNumInput('a_isaConv', 0)
    };
    var result = calcPensionCredit(input);

    document.getElementById('accResultRate').textContent = result.ratePct + '%';
    document.getElementById('accResultThisYear').textContent = fmt(result.thisYear);
    document.getElementById('accResultIsaBonus').textContent = fmt(result.isaBonus);
    document.getElementById('accResultTotal').textContent = fmt(result.total);
    document.getElementById('accResultCum10').textContent = fmt(result.cum10);
    renderAccountsChart(result);

    persistUrl();
  }

  function runYearEnd() {
    var input = {
      salary: getNumInput('y_salary', 5000),
      rent: getNumInput('y_rent', 0),
      medical: getNumInput('y_medical', 200),
      donation: getNumInput('y_donation', 0),
      furusato: getNumInput('y_furusato', 10),
      yeoJeoPen: getNumInput('y_pen', 600),
      irp: getNumInput('y_irp', 300)
    };
    var result = calcYearEndSummary(input);

    document.getElementById('yePension').textContent = fmt(result.pension);
    document.getElementById('yeRent').textContent = fmt(result.rentCredit);
    document.getElementById('yeMedical').textContent = fmt(result.medicalCredit);
    document.getElementById('yeMedicalThreshold').textContent = fmt(result.medicalThreshold);
    document.getElementById('yeDonation').textContent = fmt(result.donationCredit);
    document.getElementById('yeFurusato').textContent = fmt(result.furusatoCredit);
    document.getElementById('yeFurusatoGift').textContent = fmt(result.furusatoGift);
    document.getElementById('yeTotal').textContent = fmt(result.total);
    renderYearEndChart(result);

    persistUrl();
  }

  function runRetire() {
    var input = {
      currentSalary: getNumInput('r_curSalary', 5000),
      currentTenure: getNumInput('r_curTen', 10),
      retireTenure: getNumInput('r_retTen', 30),
      wageGrowth: getNumInput('r_wageG', 3) / 100,
      dcReturn: getNumInput('r_dcR', 7) / 100
    };
    var result = calcDcVsDb(input);

    document.getElementById('rDbPayout').textContent = fmt(result.dbPayout);
    document.getElementById('rDcPayout').textContent = fmt(result.dcPayout);
    document.getElementById('rDiff').textContent = (result.diff >= 0 ? '+' : '') + fmt(result.diff);
    var winEl = document.getElementById('rWinner');
    winEl.textContent = result.winner + ' 유리';
    winEl.style.color = result.winner === 'DC' ? '#C4853C' : (result.winner === 'DB' ? '#3A6EA5' : '#6B3A2A');
    document.getElementById('rFinalSalary').textContent = fmt(result.finalSalary);
    renderDcDbChart(result);

    if (window.gtag) {
      window.gtag('event', 'click_dc_db_toggle', {
        click_text: result.winner,
        click_location: 'tax_sim_retirement'
      });
    }

    persistUrl();
  }

  // ────────── 5. 탭 전환 ──────────

  function switchTab(tabName) {
    var tabs = document.querySelectorAll('.tab-btn');
    Array.prototype.forEach.call(tabs, function (t) {
      t.classList.toggle('active', t.dataset.tab === tabName);
      t.setAttribute('aria-selected', t.dataset.tab === tabName ? 'true' : 'false');
    });
    var panels = document.querySelectorAll('.tab-panel');
    Array.prototype.forEach.call(panels, function (p) {
      p.classList.toggle('active', p.id === 'tab-' + tabName);
    });
    if (tabName === 'accounts') runAccounts();
    else if (tabName === 'year-end') runYearEnd();
    else if (tabName === 'retirement') runRetire();

    if (window.gtag) {
      window.gtag('event', 'click_tax_tab', {
        click_text: tabName,
        click_location: 'tax_sim'
      });
    }

    persistUrl();
  }

  function persistUrl() {
    var state = {};
    ALL_KEYS.forEach(function (k) {
      if (k === 'tab') return;
      var el = document.getElementById(k);
      if (el && el.value !== '') state[k] = el.value;
    });
    var activeTab = document.querySelector('.tab-btn.active');
    if (activeTab) state.tab = activeTab.dataset.tab;
    var q = serializeUrlState(state);
    window.history.replaceState(null, '', window.location.pathname + q);
  }

  // ────────── 6. 메인 ──────────

  function init() {
    // URL 파라미터 적용
    ALL_KEYS.forEach(function (k) {
      if (k === 'tab') return;
      setInputFromUrl(k, k);
    });

    // 탭 버튼 핸들러
    var tabs = document.querySelectorAll('.tab-btn');
    Array.prototype.forEach.call(tabs, function (t) {
      t.addEventListener('click', function () {
        switchTab(t.dataset.tab);
      });
    });

    // 각 탭 input 이벤트
    document.querySelectorAll('#tab-accounts input').forEach(function (el) {
      el.addEventListener('input', function (e) {
        if (window.gtag) {
          window.gtag('event', 'click_tax_calc', {
            click_text: 'accounts_' + e.target.id,
            click_location: 'tax_sim_accounts'
          });
        }
        runAccounts();
      });
    });
    document.querySelectorAll('#tab-year-end input').forEach(function (el) {
      el.addEventListener('input', function (e) {
        if (window.gtag) {
          window.gtag('event', 'click_tax_calc', {
            click_text: 'year_end_' + e.target.id,
            click_location: 'tax_sim_year_end'
          });
        }
        runYearEnd();
      });
    });
    document.querySelectorAll('#tab-retirement input').forEach(function (el) {
      el.addEventListener('input', function (e) {
        if (window.gtag) {
          window.gtag('event', 'click_tax_calc', {
            click_text: 'retire_' + e.target.id,
            click_location: 'tax_sim_retirement'
          });
        }
        runRetire();
      });
    });

    // 초기 탭 (URL or 기본)
    var params = new URLSearchParams(window.location.search);
    var hashTab = window.location.hash.replace('#tab-', '');
    var initialTab = params.get('tab') || hashTab || 'accounts';
    if (['accounts', 'year-end', 'retirement'].indexOf(initialTab) === -1) initialTab = 'accounts';
    switchTab(initialTab);

    // 초기 렌더 (모든 탭)
    runAccounts();
    runYearEnd();
    runRetire();

    // 공유 버튼
    var shareBtn = document.getElementById('btnShareSim');
    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        var url = window.location.origin + window.location.pathname + window.location.search;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(showToast).catch(showToast);
        } else {
          showToast();
        }
        if (window.gtag) {
          window.gtag('event', 'click_filter_share', {
            click_text: 'tax_sim',
            click_location: 'tax_sim'
          });
        }
      });
    }
  }

  function showToast() {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.classList.add('visible');
    setTimeout(function () { toast.classList.remove('visible'); }, 1800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.TaxSimulator = {
    calcPensionCredit: calcPensionCredit,
    calcYearEndSummary: calcYearEndSummary,
    calcDcVsDb: calcDcVsDb
  };
})(window);
