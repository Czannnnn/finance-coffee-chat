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

  // ── 완료 체크 상태 (URL 쿼리 done=id1,id2 기반, localStorage 사용 안 함) ──
  function parseDoneSet() {
    var params = new URLSearchParams(window.location.search);
    var raw = params.get('done');
    var set = {};
    if (!raw) return set;
    raw.split(',').forEach(function (id) {
      var trimmed = id.trim();
      if (trimmed) set[trimmed] = true;
    });
    return set;
  }
  var doneSet = parseDoneSet();

  // ── DOM 헬퍼 ──
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // ── URL 갱신 (필터 상태 + done 상태) ──
  function updateUrl() {
    var query = P.serializeFilterState(state);
    var doneIds = Object.keys(doneSet);
    if (doneIds.length > 0) {
      query = query ? query + '&done=' + doneIds.join(',') : '?done=' + doneIds.join(',');
    }
    var newUrl = window.location.pathname + query + window.location.hash;
    window.history.replaceState(null, '', newUrl);
  }

  function toggleDone(id) {
    if (doneSet[id]) {
      delete doneSet[id];
    } else {
      doneSet[id] = true;
    }
    updateUrl();
    renderAll();
    if (window.gtag) {
      window.gtag('event', 'click_action_toggle', {
        click_text: (doneSet[id] ? 'done:' : 'undo:') + id,
        click_location: 'cost_hub_recommend'
      });
    }
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
    doneSet = {};
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

  // ── 규칙 로딩 (한 번만 fetch, 캐시) ──
  function loadRecommendations() {
    if (recommendationsPromise) return recommendationsPromise;
    recommendationsPromise = fetch('data/cost-recommendations.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load recommendations');
        return res.json();
      })
      .then(function (data) { return data.rules || []; })
      .catch(function (err) {
        console.error('[cost-personalizer] 규칙 로딩 실패', err);
        return [];
      });
    return recommendationsPromise;
  }

  // ── 영역 번호 → 라벨 매핑 ──
  var AREA_LABELS = {
    '01': '01 연말정산',
    '02': '02 카드',
    '03': '03 보험',
    '04': '04 통신',
    '05': '05 금융수수료',
    '06': '06 공과금·구독',
    '07': '07 지원금',
    '08': '08 교통'
  };

  function getAreaLabel(areaRef) {
    var num = (areaRef || '').substring(0, 2);
    return AREA_LABELS[num] || areaRef;
  }

  // ── 필터 조합 시그니처 (GA용) ──
  function filterSignature() {
    return ['s', 'income', 'home', 'dep', 'region']
      .map(function (f) { return state[f] || '_'; })
      .join('_');
  }

  // ── 상태 요약 문구 ──
  var INCOME_LABELS = {
    '0-30': '3천만원 이하', '30-50': '3천~5천', '50-70': '5천~7천',
    '70-100': '7천~1억', '100+': '1억 초과'
  };
  var HOME_LABELS = { own: '자가', jeonse: '전세', rent: '월세', family: '부모님 집' };
  var REGION_LABELS = { metro: '수도권', nonmetro: '비수도권' };

  function stateSummaryText() {
    var parts = [];
    if (state.income) parts.push(INCOME_LABELS[state.income]);
    if (state.home) parts.push(HOME_LABELS[state.home]);
    if (state.region) parts.push(REGION_LABELS[state.region]);
    return parts.join(' · ') + ' 독자에게';
  }

  // ── HTML 이스케이프 (XSS 방지) ──
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── 맞춤 요약 섹션 렌더 ──
  var lastRenderedSignature = null;

  function renderRecommendSection() {
    var section = $('#recommendSection');
    if (!section) return;

    if (!P.hasRequiredFields(state)) {
      section.className = 'recommend-section empty';
      section.innerHTML =
        '<div class="recommend-title">내 맞춤 요약</div>' +
        '<div class="recommend-subtitle">👉 내 상황 3가지만 골라주시면 맞춤 추천이 여기에 나타나요</div>';
      lastRenderedSignature = null;
      return;
    }

    loadRecommendations().then(function (rules) {
      // 상태가 렌더 도중 바뀌었을 수 있으니 재확인
      if (!P.hasRequiredFields(state)) return;
      var classified = P.classifyRules(rules, state);
      section.className = 'recommend-section';

      if (classified.top3.length === 0) {
        section.innerHTML =
          '<div class="recommend-title">내 맞춤 요약</div>' +
          '<div class="recommend-subtitle">🤔 아직 이 조합에 맞는 규칙이 준비되지 않았어요. 아래 전체 카탈로그를 참고해 주세요.</div>';
        return;
      }

      var topCardsHtml = classified.top3.map(function (rule) {
        var isDone = !!doneSet[rule.id];
        var doneClass = isDone ? ' done' : '';
        var checkClass = isDone ? ' checked' : '';
        var checkLabel = isDone ? '완료 취소' : '완료 표시';
        var checkGlyph = isDone ? '✓' : '◯';
        return (
          '<div class="recommend-card-wrap" style="position:relative;">' +
          '<a class="recommend-card' + doneClass + '" href="' + escapeHtml(rule.linkHref) + '" ' +
          'data-ga="click_recommendation" data-ga-text="' + escapeHtml(rule.id) + '" data-ga-loc="cost_hub_recommend">' +
          '<span class="recommend-card-area">' + escapeHtml(getAreaLabel(rule.areaRef)) + '</span>' +
          '<div class="recommend-card-title">' + escapeHtml(rule.title) + '</div>' +
          '<div class="recommend-card-saving">💰 ' + escapeHtml(rule.savingHint) + '</div>' +
          '<div class="recommend-card-link">' + escapeHtml(rule.linkLabel || '자세히 →') + '</div>' +
          '</a>' +
          '<button type="button" class="action-check' + checkClass + '" ' +
          'data-action-done="' + escapeHtml(rule.id) + '" ' +
          'title="' + checkLabel + '" aria-label="' + checkLabel + '" aria-pressed="' + (isDone ? 'true' : 'false') + '">' +
          checkGlyph + '</button>' +
          '</div>'
        );
      }).join('');

      var extendedHtml = '';
      if (classified.extended.length > 0) {
        extendedHtml =
          '<div class="recommend-extended">' +
          '<div class="recommend-extended-title">💡 챙길 만한 것 ' + classified.extended.length + '개</div>' +
          '<div class="recommend-extended-list">' +
          classified.extended.map(function (rule) {
            var doneClass = doneSet[rule.id] ? ' done' : '';
            return (
              '<a class="recommend-extended-item' + doneClass + '" href="' + escapeHtml(rule.linkHref) + '" ' +
              'data-ga="click_recommendation" data-ga-text="' + escapeHtml(rule.id) + '" data-ga-loc="cost_hub_recommend">' +
              '<span>' + escapeHtml(rule.title) + '</span>' +
              '<span style="color: var(--green); font-size: 12px;">' + escapeHtml(rule.savingHint) + '</span>' +
              '</a>'
            );
          }).join('') +
          '</div></div>';
      }

      var notApplicableHtml = '';
      if (classified.notApplicable.length > 0) {
        notApplicableHtml =
          '<div class="recommend-notapplicable" id="recommendNotApplicable">' +
          '<button class="recommend-notapplicable-toggle" type="button">' +
          '🚫 이번엔 해당 없음 ' + classified.notApplicable.length + '개 보기' +
          '</button>' +
          '<div class="recommend-notapplicable-list">' +
          classified.notApplicable.map(function (rule) {
            return '▸ ' + escapeHtml(rule.title) + ' — <em>' + escapeHtml(rule.savingHint) + '</em>';
          }).join('<br>') +
          '</div></div>';
      }

      section.innerHTML =
        '<div class="recommend-title">' + escapeHtml(stateSummaryText()) + '</div>' +
        '<div class="recommend-subtitle">필터 조건에 맞춰 우선순위로 정렬했어요.</div>' +
        '<div class="recommend-top-label">📌 지금 바로 챙길 액션 TOP ' + classified.top3.length + '</div>' +
        '<div class="recommend-cards">' + topCardsHtml + '</div>' +
        extendedHtml +
        notApplicableHtml;

      // 해당없음 토글 바인딩
      var notApplicableEl = $('#recommendNotApplicable');
      if (notApplicableEl) {
        notApplicableEl.querySelector('.recommend-notapplicable-toggle').addEventListener('click', function () {
          notApplicableEl.classList.toggle('expanded');
        });
      }

      // view_recommendation_rendered (필터 조합이 바뀔 때마다 발화)
      var sig = filterSignature();
      if (sig !== lastRenderedSignature && window.gtag) {
        window.gtag('event', 'view_recommendation_rendered', {
          click_text: sig,
          click_location: 'cost_hub_recommend'
        });
        lastRenderedSignature = sig;
      }
    });
  }

  // ── 기존 섹션 렌더 (세그먼트 카드, 영역 카드, 매트릭스 행) ──
  function renderExistingSections() {
    renderSegmentCards();
    renderAreaCards();
    renderMatrixRow();
    updateGaLocForCardsAndAreas();
  }

  function renderSegmentCards() {
    $$('.segment-card').forEach(function (card) {
      card.classList.remove('my-segment');
      var href = card.getAttribute('href') || '';
      // href 예: "cost/s4-parent-1child.html"
      var match = href.match(/\/(s\d)-/);
      var seg = match ? match[1] : null;
      if (seg && seg === state.s) {
        card.classList.add('my-segment');
      }
    });
  }

  function renderAreaCards() {
    var grid = $('.area-grid');
    if (!grid) return;
    var cards = $$('.area-card', grid);
    if (!state.s || !P.SEGMENT_AREA_WEIGHTS[state.s]) {
      // 원래 순서로 복구
      cards.sort(function (a, b) {
        return Number(a.dataset.originalOrder) - Number(b.dataset.originalOrder);
      });
      cards.forEach(function (card) { grid.appendChild(card); });
      return;
    }
    var weights = P.SEGMENT_AREA_WEIGHTS[state.s];
    cards.sort(function (a, b) {
      var areaA = (a.getAttribute('href') || '').match(/area-(\d{2})/);
      var areaB = (b.getAttribute('href') || '').match(/area-(\d{2})/);
      var wA = areaA ? (weights[areaA[1]] || 0) : 0;
      var wB = areaB ? (weights[areaB[1]] || 0) : 0;
      if (wA !== wB) return wB - wA;
      // 동점이면 원래 순서 유지 (안정 정렬)
      return Number(a.dataset.originalOrder) - Number(b.dataset.originalOrder);
    });
    cards.forEach(function (card) { grid.appendChild(card); });
  }

  function renderMatrixRow() {
    $$('.matrix-table tbody tr').forEach(function (row) {
      row.classList.remove('my-row');
    });
    if (!state.s) return;
    var segIndex = { s1: 0, s2: 1, s3: 2, s4: 3, s5: 4, s6: 5 }[state.s];
    if (segIndex == null) return;
    var rows = $$('.matrix-table tbody tr');
    if (rows[segIndex]) rows[segIndex].classList.add('my-row');
  }

  function updateGaLocForCardsAndAreas() {
    var loc = P.hasRequiredFields(state) ? 'cost_hub_filtered' : 'cost_hub';
    $$('.segment-card, .area-card').forEach(function (el) {
      el.setAttribute('data-ga-loc', loc);
    });
  }

  // 초기 영역 카드 순서 기록 (첫 렌더 전에 한 번만)
  (function captureOriginalOrder() {
    $$('.area-grid .area-card').forEach(function (card, i) {
      card.dataset.originalOrder = String(i);
    });
  })();

  // ── 전체 렌더 ──
  function renderAll() {
    renderRecommendSection();
    renderExistingSections();
  }

  // ── 이벤트 바인딩 ──
  document.addEventListener('click', function (e) {
    var doneBtn = e.target.closest('[data-action-done]');
    if (doneBtn) {
      e.preventDefault();
      e.stopPropagation();
      toggleDone(doneBtn.getAttribute('data-action-done'));
      return;
    }
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
