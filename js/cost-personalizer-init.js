// Finance Coffee Chat — cost-optimization 페이지 초기화 스크립트
// cost-personalizer.js 의 API를 사용해 DOM과 URL 상태를 연결한다.

(function () {
  'use strict';

  var P = window.CostPersonalizer;
  if (!P) {
    console.error('[cost-personalizer-init] CostPersonalizer가 로드되지 않았습니다.');
    return;
  }

  var state = P.parseFilterState(window.location.search);
  var recommendationsPromise = null;

  // ── DOM 헬퍼 ──
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // ── URL 갱신 ──
  function updateUrl() {
    var query = P.serializeFilterState(state);
    var newUrl = window.location.pathname + query + window.location.hash;
    window.history.replaceState(null, '', newUrl);
  }

  // ── 필터 칩 렌더 ──
  function renderChipSelection() {
    $$('.filter-chips').forEach(function (group) {
      var field = group.getAttribute('data-field');
      $$('.chip', group).forEach(function (chip) {
        var value = chip.getAttribute('data-value');
        if (state[field] === value) {
          chip.classList.add('selected');
        } else {
          chip.classList.remove('selected');
        }
      });
    });
  }

  // ── "더 정확히 보려면" 초기 펼침 처리 ──
  function updateMoreToggle() {
    var hasOptional = state.dep || state.region;
    var moreEl = $('#filterMore');
    var toggleEl = $('#filterMoreToggle');
    if (hasOptional) {
      moreEl.classList.add('expanded');
      toggleEl.setAttribute('aria-expanded', 'true');
      toggleEl.textContent = '접기 ▲';
    }
  }

  // ── 필터 칩 클릭 핸들러 ──
  function onChipClick(e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    var group = chip.closest('.filter-chips');
    if (!group) return;
    var field = group.getAttribute('data-field');
    var value = chip.getAttribute('data-value');

    // 토글 동작
    if (state[field] === value) {
      delete state[field];
    } else {
      state[field] = value;
    }

    updateUrl();
    renderChipSelection();
    renderAll();

    // GA 이벤트
    if (window.gtag) {
      window.gtag('event', 'click_filter_chip', {
        click_text: field + ':' + value,
        click_location: 'cost_hub_filter'
      });
    }
  }

  // ── "더 정확히 보려면" 버튼 클릭 ──
  function onMoreToggleClick() {
    var moreEl = $('#filterMore');
    var toggleEl = $('#filterMoreToggle');
    var expanded = moreEl.classList.toggle('expanded');
    toggleEl.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    toggleEl.textContent = expanded ? '접기 ▲' : '더 정확히 보려면 2문항 더 ▼';

    if (expanded && window.gtag) {
      window.gtag('event', 'expand_filter_more', {
        click_location: 'cost_hub_filter'
      });
    }
  }

  // ── 초기화 버튼 ──
  function onResetClick() {
    state = {};
    updateUrl();
    renderChipSelection();
    renderAll();
  }

  // ── 공유 버튼 ──
  function onShareClick() {
    var mask = $('#filterShareMask').checked;
    var query = P.serializeFilterState(state, { excludeSensitive: mask });
    var url = window.location.origin + window.location.pathname + query;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(showToast).catch(function () { showToast(); });
    } else {
      showToast();
    }
    if (window.gtag) {
      window.gtag('event', 'click_filter_share', {
        click_text: mask ? 'masked' : 'full',
        click_location: 'cost_hub_filter'
      });
    }
  }

  function showToast() {
    var toast = $('#toast');
    if (!toast) return;
    toast.classList.add('visible');
    setTimeout(function () { toast.classList.remove('visible'); }, 1800);
  }

  // ── 전체 렌더 (Task 12/13에서 확장) ──
  function renderAll() {
    // 맞춤 요약 섹션 렌더는 Task 12, 기존 섹션 재정렬은 Task 13
  }

  // ── 이벤트 바인딩 ──
  document.addEventListener('click', function (e) {
    if (e.target.closest('.filter-chips .chip')) {
      onChipClick(e);
    }
  });

  var moreToggleEl = $('#filterMoreToggle');
  if (moreToggleEl) moreToggleEl.addEventListener('click', onMoreToggleClick);

  var resetEl = $('#filterReset');
  if (resetEl) resetEl.addEventListener('click', onResetClick);

  var shareEl = $('#filterShare');
  if (shareEl) shareEl.addEventListener('click', onShareClick);

  // ── 초기 렌더 ──
  renderChipSelection();
  updateMoreToggle();
  renderAll();

  // state를 외부에서 접근할 수 있게 노출 (렌더러 Task 12/13용)
  window.CostPersonalizerInit = {
    getState: function () { return state; },
    rerender: renderAll
  };
})();
