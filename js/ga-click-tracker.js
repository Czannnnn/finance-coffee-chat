// ga-click-tracker.js — data-ga 속성 기반 click 이벤트 전역 핸들러
// 모든 페이지에서 1회만 실행되도록 idempotent guard 포함
// GA4 전송 매개변수: click_text, click_location

(function () {
  if (typeof window === 'undefined' || typeof gtag !== 'function') return;
  if (window.__gaClickTrackerInit) return;
  window.__gaClickTrackerInit = true;

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-ga]');
    if (!el) return;
    try {
      gtag('event', el.dataset.ga, {
        click_text: el.dataset.gaText || el.textContent.trim().substring(0, 50),
        click_location: el.dataset.gaLoc || 'unknown'
      });
    } catch (err) { /* swallow */ }
  }, { passive: true });
})();
