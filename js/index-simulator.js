// Finance Coffee Chat — FIRE 시뮬레이터
// 입력 → 월복리 projection → Chart.js 라인/도넛 렌더
// 상태는 URL 쿼리 + DOM에서만 존재. localStorage/세션스토리지 사용 안 함.

(function (global) {
  'use strict';

  // ────────── 1. 계산 엔진 ──────────

  /**
   * FIRE 달성까지의 자산 변화를 월복리로 시뮬레이션.
   * @param {Object} input
   * @param {number} input.startKRW       현재 순자산 (억원)
   * @param {number} input.monthlyKRW     월 적립 (만원)
   * @param {number} input.annualReturn   연 기대수익률 (0.07 = 7%)
   * @param {number} input.targetKRW      목표 순자산 (억원)
   * @param {number} input.startAge       현재 나이
   * @returns {Object}
   */
  function projectFire(input) {
    var startKRW = Math.max(0, Number(input.startKRW) || 0);        // 억
    var monthlyKRW = Math.max(0, Number(input.monthlyKRW) || 0);    // 만원
    var annualReturn = Math.max(-0.5, Math.min(0.5, Number(input.annualReturn) || 0));
    var targetKRW = Math.max(0.1, Number(input.targetKRW) || 10);
    var startAge = Math.max(10, Math.min(90, Number(input.startAge) || 30));

    var MAX_MONTHS = 50 * 12;
    var monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;

    // 전부 '억' 단위로 환산 (monthly는 만원 → 0.0001억)
    var balance = startKRW;
    var monthlyInEok = monthlyKRW / 10000;

    var series = [{ age: startAge, monthOffset: 0, balance: balance }];
    var months = 0;

    while (balance < targetKRW && months < MAX_MONTHS) {
      balance = balance * (1 + monthlyReturn) + monthlyInEok;
      months++;
      if (months % 12 === 0) {
        series.push({
          age: startAge + months / 12,
          monthOffset: months,
          balance: balance
        });
      }
    }

    // 목표 도달 시점이 연도 경계가 아닐 수 있으므로 마지막 포인트 추가
    if (months > 0 && months % 12 !== 0) {
      series.push({
        age: startAge + months / 12,
        monthOffset: months,
        balance: balance
      });
    }

    var achieved = balance >= targetKRW;
    var progress = Math.min(1, startKRW / targetKRW);

    return {
      achieved: achieved,
      monthsToGoal: months,
      yearsToGoal: Math.round((months / 12) * 10) / 10,
      targetAge: Math.round((startAge + months / 12) * 10) / 10,
      finalBalance: Math.round(balance * 100) / 100,
      series: series,
      startProgress: progress,
      suggestedAllocation: suggestAllocation(progress)
    };
  }

  /**
   * FIRE 진척도에 따른 권장 자산배분 (%).
   * @param {number} progress 0 ~ 1
   */
  function suggestAllocation(progress) {
    if (progress < 0.3) {
      return { nasdaq: 50, sp500: 30, dividend: 10, bond: 5, gold: 5 };
    }
    if (progress < 0.6) {
      return { nasdaq: 40, sp500: 30, dividend: 20, bond: 5, gold: 5 };
    }
    if (progress < 0.85) {
      return { nasdaq: 30, sp500: 25, dividend: 30, bond: 10, gold: 5 };
    }
    return { nasdaq: 15, sp500: 20, dividend: 35, bond: 20, gold: 10 };
  }

  function formatEok(value) {
    if (!isFinite(value)) return '0.0';
    return (Math.round(value * 100) / 100).toFixed(2);
  }

  // ────────── 2. URL 상태 ──────────

  var PARAM_KEYS = ['start', 'monthly', 'return', 'target', 'age'];

  function parseUrlState() {
    var params = new URLSearchParams(window.location.search);
    var state = {};
    PARAM_KEYS.forEach(function (k) {
      var v = params.get(k);
      if (v != null && v !== '') {
        var n = Number(v);
        if (isFinite(n)) state[k] = n;
      }
    });
    return state;
  }

  function serializeUrlState(state) {
    var params = new URLSearchParams();
    PARAM_KEYS.forEach(function (k) {
      if (state[k] != null && isFinite(state[k])) {
        params.set(k, String(state[k]));
      }
    });
    var str = params.toString();
    return str ? '?' + str : '';
  }

  function updateUrl(state) {
    var q = serializeUrlState(state);
    window.history.replaceState(null, '', window.location.pathname + q + window.location.hash);
  }

  // ────────── 3. 차트 ──────────

  var lineChart = null;
  var donutChart = null;

  function renderLineChart(series, targetKRW, canvasId) {
    var canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;
    var labels = series.map(function (p) {
      return p.age.toFixed(1) + '세';
    });
    var data = series.map(function (p) { return Math.round(p.balance * 100) / 100; });
    var targetLine = series.map(function () { return targetKRW; });

    if (lineChart) lineChart.destroy();
    lineChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: '예상 자산 (억원)',
            data: data,
            borderColor: '#C4853C',
            backgroundColor: 'rgba(196,133,60,0.1)',
            fill: true,
            tension: 0.2,
            pointRadius: 2,
            pointHoverRadius: 5
          },
          {
            label: '목표 (억원)',
            data: targetLine,
            borderColor: '#3F8A5C',
            borderDash: [6, 4],
            borderWidth: 2,
            fill: false,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { color: '#3D2317', font: { size: 12 } } },
          tooltip: {
            callbacks: {
              label: function (ctx) { return ctx.dataset.label + ': ' + ctx.parsed.y.toFixed(2) + '억'; }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#6B3A2A', maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
            grid: { color: 'rgba(44,24,16,0.05)' }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: '#6B3A2A',
              callback: function (v) { return v.toFixed(1) + '억'; }
            },
            grid: { color: 'rgba(44,24,16,0.05)' }
          }
        }
      }
    });
  }

  function renderDonut(allocation, canvasId) {
    var canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;
    var labels = ['나스닥100', 'S&P500', '배당다우존스', '채권·안전', '금 헤지'];
    var values = [allocation.nasdaq, allocation.sp500, allocation.dividend, allocation.bond, allocation.gold];
    var colors = ['#C4853C', '#3A6EA5', '#3F8A5C', '#6B3A2A', '#B8473D'];

    if (donutChart) donutChart.destroy();
    donutChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{ data: values, backgroundColor: colors, borderColor: '#FFFDF9', borderWidth: 2 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#3D2317', font: { size: 12 }, padding: 10 } },
          tooltip: {
            callbacks: { label: function (ctx) { return ctx.label + ': ' + ctx.parsed + '%'; } }
          }
        },
        cutout: '55%'
      }
    });
  }

  // ────────── 4. 결과 렌더 ──────────

  function renderResult(result, input) {
    var elYears = document.getElementById('resultYears');
    var elAge = document.getElementById('resultAge');
    var elFinal = document.getElementById('resultFinal');
    var elGap = document.getElementById('resultGap');
    var elStatus = document.getElementById('resultStatus');
    var elMsg = document.getElementById('resultMessage');

    if (elYears) elYears.textContent = result.yearsToGoal.toFixed(1);
    if (elAge) elAge.textContent = result.targetAge.toFixed(1);
    if (elFinal) elFinal.textContent = formatEok(result.finalBalance);

    var gap = Math.max(0, input.targetKRW - result.finalBalance);
    if (elGap) elGap.textContent = formatEok(gap);

    if (elStatus && elMsg) {
      if (result.achieved) {
        elStatus.textContent = '🎉 FIRE 달성 가능';
        elStatus.style.color = '#3F8A5C';
        elMsg.textContent = '현재 가정대로면 ' + result.yearsToGoal.toFixed(1) +
          '년 뒤, ' + result.targetAge.toFixed(1) + '세에 목표에 도달해요.';
      } else {
        elStatus.textContent = '⚠️ 50년 내 미달성';
        elStatus.style.color = '#B8473D';
        elMsg.textContent = '월 적립액을 늘리거나 기대수익률/목표를 조정해 보세요. 50년 뒤 예상 자산 ' +
          formatEok(result.finalBalance) + '억.';
      }
    }
  }

  // ────────── 5. 메인 ──────────

  function getInput() {
    function num(id) {
      var el = document.getElementById(id);
      return el ? Number(el.value) : NaN;
    }
    return {
      startKRW: num('inpStart'),
      monthlyKRW: num('inpMonthly'),
      annualReturn: num('inpReturn') / 100,
      targetKRW: num('inpTarget'),
      startAge: num('inpAge')
    };
  }

  function applyInputFromUrl(urlState) {
    if ('start' in urlState) document.getElementById('inpStart').value = urlState.start;
    if ('monthly' in urlState) document.getElementById('inpMonthly').value = urlState.monthly;
    if ('return' in urlState) document.getElementById('inpReturn').value = urlState.return;
    if ('target' in urlState) document.getElementById('inpTarget').value = urlState.target;
    if ('age' in urlState) document.getElementById('inpAge').value = urlState.age;
  }

  function runSimulation() {
    var input = getInput();
    if (!isFinite(input.startKRW) || !isFinite(input.monthlyKRW) ||
        !isFinite(input.annualReturn) || !isFinite(input.targetKRW) ||
        !isFinite(input.startAge)) {
      return;
    }
    var result = projectFire(input);
    renderResult(result, input);
    renderLineChart(result.series, input.targetKRW, 'lineChart');
    renderDonut(result.suggestedAllocation, 'donutChart');

    updateUrl({
      start: input.startKRW,
      monthly: input.monthlyKRW,
      return: Math.round(input.annualReturn * 10000) / 100,
      target: input.targetKRW,
      age: input.startAge
    });

    if (window.gtag) {
      window.gtag('event', 'click_index_calc', {
        click_text: 'run',
        click_location: 'fire_sim'
      });
    }
  }

  function onInputChange(e) {
    if (e && e.target && e.target.tagName === 'INPUT') {
      if (window.gtag) {
        window.gtag('event', 'click_index_calc', {
          click_text: e.target.id,
          click_location: 'fire_sim'
        });
      }
    }
    runSimulation();
  }

  function init() {
    if (typeof Chart === 'undefined') {
      console.warn('[index-simulator] Chart.js 미로드');
    }
    var urlState = parseUrlState();
    applyInputFromUrl(urlState);

    var inputs = document.querySelectorAll('.sim-form input');
    Array.prototype.forEach.call(inputs, function (inp) {
      inp.addEventListener('input', onInputChange);
    });

    var shareBtn = document.getElementById('btnShare');
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
            click_text: 'fire_sim',
            click_location: 'fire_sim'
          });
        }
      });
    }

    runSimulation();
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

  global.IndexSimulator = {
    projectFire: projectFire,
    suggestAllocation: suggestAllocation
  };
})(window);
