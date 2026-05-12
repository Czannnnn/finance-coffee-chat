// engagement-events.js — A20 KPI 분리 (사이클 6-11)
// 진성 클릭/체류 측정을 위한 GA4 사용자 정의 이벤트
// - scroll_depth : 25/50/75/100% 도달 시 1회 전송
// - page_engagement_time : 페이지 이탈 시 체류 시간(초) 전송
// 사이트는 정적 HTML + GA4(G-ZZEG7YQ80S). gtag 전역 함수 존재 가정.

(function () {
  if (typeof window === 'undefined' || typeof gtag !== 'function') return;

  var pageStart = Date.now();
  var maxDepthPct = 0;
  var sentMilestones = {};
  var milestones = [25, 50, 75, 100];

  function computeScrollPct() {
    var scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight <= 0) return 0;
    return Math.min(100, Math.round((window.scrollY / scrollHeight) * 100));
  }

  function onScroll() {
    var pct = computeScrollPct();
    if (pct > maxDepthPct) maxDepthPct = pct;
    for (var i = 0; i < milestones.length; i++) {
      var m = milestones[i];
      if (maxDepthPct >= m && !sentMilestones[m]) {
        sentMilestones[m] = true;
        try {
          gtag('event', 'scroll_depth', {
            depth_pct: m,
            page_path: location.pathname
          });
        } catch (e) { /* swallow */ }
      }
    }
  }

  function sendEngagement() {
    var seconds = Math.round((Date.now() - pageStart) / 1000);
    if (seconds < 2) return; // 노이즈 제거
    try {
      gtag('event', 'page_engagement_time', {
        time_seconds: seconds,
        max_scroll_pct: maxDepthPct,
        page_path: location.pathname
      });
    } catch (e) { /* swallow */ }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // pagehide(권장) + visibilitychange + beforeunload(폴백)
  window.addEventListener('pagehide', sendEngagement);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') sendEngagement();
  });
  // beforeunload는 모바일 미발화 가능, pagehide와 중복 발화 방지용 sent 플래그
  var sentBeforeUnload = false;
  window.addEventListener('beforeunload', function () {
    if (!sentBeforeUnload) {
      sentBeforeUnload = true;
      sendEngagement();
    }
  });

  // 초기 1회 측정 (긴 페이지 스크롤 없이 짧게 머무는 사용자 포함)
  setTimeout(onScroll, 100);
})();
