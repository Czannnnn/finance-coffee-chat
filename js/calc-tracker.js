// calc-tracker.js — 사이클 7-2 계산기 9건 공통 GA4 funnel 헬퍼
// 신설일: 2026-06-01
// 노출: window.fccCalc.{trackView, trackInput, trackResult, trackShare, trackBack}
// 디바운스: input 600ms, result 1200ms, view IntersectionObserver 30%
// 의존: gtag (G-ZZEG7YQ80S). DOMContentLoaded 시점에 .calc-widget[data-calc-id] 자동 관측.

(function () {
  if (typeof window === 'undefined' || typeof gtag !== 'function') return;
  if (window.fccCalc) return;

  var inputGuard = {};     // calc_id+field -> true (최초 유효 입력 1회 가드)
  var firstInputTs = {};   // calc_id -> Date.now() (time_to_first_input_ms 계산용)
  var resultGuard = {};    // calc_id -> last result_sig (동일 결과 중복 발화 차단)
  var viewGuard = {};      // calc_id -> true (페이지당 calc_view 1회)

  function send(eventName, params) {
    try { gtag('event', eventName, params || {}); } catch (err) { /* swallow */ }
  }

  function refererType() {
    var r = document.referrer || '';
    if (!r) return 'direct';
    try {
      var host = new URL(r).hostname;
      if (host === location.hostname) return 'internal';
      if (/google|naver|bing|daum|yahoo|kakao/i.test(host)) return 'search';
      return 'external';
    } catch (e) { return 'direct'; }
  }

  function bindViewObserver() {
    if (!('IntersectionObserver' in window)) return;
    var widgets = document.querySelectorAll('.calc-widget[data-calc-id]');
    if (!widgets.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var calcId = el.dataset.calcId;
        if (!calcId || viewGuard[calcId]) return;
        viewGuard[calcId] = true;
        send('calc_view', {
          calc_id: calcId,
          click_location: el.dataset.calcLoc || calcId,
          referrer_type: refererType()
        });
        io.unobserve(el);
      });
    }, { threshold: 0.3 });
    widgets.forEach(function (el) { io.observe(el); });
  }

  // 디바운스 wrapper (입력·결과용)
  function debounce(fn, wait) {
    var timers = {};
    return function (args) {
      var key = (args && args.calcId) || '_default';
      clearTimeout(timers[key]);
      var ctx = this; var a = arguments;
      timers[key] = setTimeout(function () { fn.apply(ctx, a); }, wait);
    };
  }

  function _trackInput(args) {
    if (!args || !args.calcId || !args.field) return;
    var key = args.calcId + '|' + args.field;
    if (inputGuard[key]) return;
    inputGuard[key] = true;
    var now = Date.now();
    var first = firstInputTs[args.calcId] || (firstInputTs[args.calcId] = now);
    var ttfi = now - first;
    var filled = 0;
    for (var k in inputGuard) {
      if (Object.prototype.hasOwnProperty.call(inputGuard, k) &&
          k.indexOf(args.calcId + '|') === 0) filled++;
    }
    send('calc_input_filled', {
      calc_id: args.calcId,
      field: args.field,
      click_location: args.location || args.calcId,
      filled_count: filled,
      time_to_first_input_ms: ttfi
    });
  }

  function _trackResult(args) {
    if (!args || !args.calcId || !args.resultSig) return;
    if (resultGuard[args.calcId] === args.resultSig) return;
    var prev = resultGuard[args.calcId];
    resultGuard[args.calcId] = args.resultSig;
    var inputsChanged = prev ? 1 : 0;
    var params = {
      calc_id: args.calcId,
      result_segment: args.segment || 'unknown',
      result_band: args.band || '',
      inputs_changed_count: inputsChanged,
      trigger_source: args.trigger || 'auto'
    };
    if (args.extra && typeof args.extra === 'object') {
      for (var k in args.extra) {
        if (Object.prototype.hasOwnProperty.call(args.extra, k)) params[k] = args.extra[k];
      }
    }
    send('calc_result_view', params);
  }

  function trackShare(args) {
    if (!args || !args.calcId) return;
    send('calc_share_click', {
      calc_id: args.calcId,
      click_location: args.location || args.calcId,
      share_method: args.method || 'clipboard',
      has_result: args.hasResult ? 1 : 0
    });
  }

  function trackBack(args) {
    if (!args || !args.calcId) return;
    send('calc_back_to_article', {
      calc_id: args.calcId,
      article_slug: args.articleSlug || '',
      click_location: args.location || args.calcId,
      position: args.position || 'inline'
    });
  }

  // 글로벌 노출
  window.fccCalc = {
    trackInput: debounce(_trackInput, 600),
    trackResult: debounce(_trackResult, 1200),
    trackInputImmediate: _trackInput,
    trackResultImmediate: _trackResult,
    trackShare: trackShare,
    trackBack: trackBack
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindViewObserver);
  } else {
    bindViewObserver();
  }
})();
