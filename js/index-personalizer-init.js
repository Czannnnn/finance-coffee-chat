// Finance Coffee Chat — index-investing 초기화 스크립트
// index-personalizer.js 의 API를 사용해 DOM과 URL 상태를 연결한다.

(function () {
  'use strict';

  var P = window.IndexPersonalizer;
  if (!P) {
    console.error('[index-personalizer-init] IndexPersonalizer가 로드되지 않았습니다.');
    return;
  }

  var state = P.parseFilterState(window.location.search);
  var recommendationsPromise = null;

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

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

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
        click_location: 'index_hub_recommend'
      });
    }
  }

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

  function updateMoreToggle() {
    var hasOptional = state.fireProgress || state.riskTol;
    var moreEl = $('#filterMore');
    var toggleEl = $('#filterMoreToggle');
    if (!moreEl || !toggleEl) return;
    if (hasOptional) {
      moreEl.classList.add('expanded');
      toggleEl.setAttribute('aria-expanded', 'true');
      toggleEl.textContent = '접기 ▲';
    }
  }

  function onChipClick(e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    var group = chip.closest('.filter-chips');
    if (!group) return;
    var field = group.getAttribute('data-field');
    var value = chip.getAttribute('data-value');

    if (state[field] === value) {
      delete state[field];
    } else {
      state[field] = value;
    }

    updateUrl();
    renderChipSelection();
    renderAll();

    if (window.gtag) {
      window.gtag('event', 'click_index_segment', {
        click_text: field + ':' + value,
        click_location: 'index_hub_filter'
      });
    }
  }

  function onMoreToggleClick() {
    var moreEl = $('#filterMore');
    var toggleEl = $('#filterMoreToggle');
    var expanded = moreEl.classList.toggle('expanded');
    toggleEl.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    toggleEl.textContent = expanded ? '접기 ▲' : '더 정확히 보려면 2문항 더 ▼';

    if (expanded && window.gtag) {
      window.gtag('event', 'expand_filter_more', {
        click_location: 'index_hub_filter'
      });
    }
  }

  function onResetClick() {
    state = {};
    doneSet = {};
    updateUrl();
    renderChipSelection();
    renderAll();
  }

  function onShareClick() {
    var maskEl = $('#filterShareMask');
    var mask = maskEl ? maskEl.checked : false;
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
        click_location: 'index_hub_filter'
      });
    }
  }

  function showToast() {
    var toast = $('#toast');
    if (!toast) return;
    toast.classList.add('visible');
    setTimeout(function () { toast.classList.remove('visible'); }, 1800);
  }

  function loadRecommendations() {
    if (recommendationsPromise) return recommendationsPromise;
    recommendationsPromise = fetch('data/index-recommendations.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load recommendations');
        return res.json();
      })
      .then(function (data) { return data.rules || []; })
      .catch(function (err) {
        console.error('[index-personalizer] 규칙 로딩 실패', err);
        return [];
      });
    return recommendationsPromise;
  }

  var CLASS_LABELS = {
    nasdaq100: '나스닥100',
    sp500: 'S&P500',
    dividend: '배당다우존스',
    bond: '채권/안전',
    gold: '금 헤지',
    value: '밸류업',
    drawdown: '급락대응'
  };

  function getClassLabel(areaRef) {
    var match = (areaRef || '').match(/([a-z][a-z0-9]+)$/i);
    var key = match ? match[1] : '';
    return CLASS_LABELS[key] || areaRef;
  }

  function filterSignature() {
    return ['is', 'age', 'dc', 'fireProgress', 'riskTol']
      .map(function (f) { return state[f] || '_'; })
      .join('_');
  }

  var IS_LABELS = {
    is1: '초기 축적', is2: '공격 성장', is3: '가족 균형',
    is4: 'FIRE 근접', is5: '보존·인출', is6: 'DC 중심'
  };
  var AGE_LABELS = { '20s': '20대', '30s': '30대', '40s': '40대', '50s': '50대', '60+': '60대+' };
  var DC_LABELS = { yes: 'DC 가입', no: 'DC 미가입' };

  function stateSummaryText() {
    var parts = [];
    if (state.is) parts.push(IS_LABELS[state.is]);
    if (state.age) parts.push(AGE_LABELS[state.age]);
    if (state.dc) parts.push(DC_LABELS[state.dc]);
    return parts.join(' · ') + ' 독자에게';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  var lastRenderedSignature = null;

  function renderRecommendSection() {
    var section = $('#recommendSection');
    if (!section) return;

    if (!P.hasRequiredFields(state)) {
      section.className = 'recommend-section empty';
      section.innerHTML =
        '<div class="recommend-title">내 맞춤 포폴 요약</div>' +
        '<div class="recommend-subtitle">👉 위 3가지(유형·연령·DC)만 골라주시면 맞춤 추천이 여기에 나타나요</div>';
      lastRenderedSignature = null;
      return;
    }

    loadRecommendations().then(function (rules) {
      if (!P.hasRequiredFields(state)) return;
      var classified = P.classifyRules(rules, state);
      section.className = 'recommend-section';

      if (classified.top3.length === 0) {
        section.innerHTML =
          '<div class="recommend-title">내 맞춤 포폴 요약</div>' +
          '<div class="recommend-subtitle">🤔 아직 이 조합에 맞는 규칙이 준비되지 않았어요. 아래 카탈로그를 참고해 주세요.</div>';
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
          'data-ga="click_recommendation" data-ga-text="' + escapeHtml(rule.id) + '" data-ga-loc="index_hub_recommend">' +
          '<span class="recommend-card-area">' + escapeHtml(getClassLabel(rule.areaRef)) + '</span>' +
          '<div class="recommend-card-title">' + escapeHtml(rule.title) + '</div>' +
          '<div class="recommend-card-saving">📈 ' + escapeHtml(rule.savingHint) + '</div>' +
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
          '<div class="recommend-extended-title">💡 추가로 고려할 것 ' + classified.extended.length + '개</div>' +
          '<div class="recommend-extended-list">' +
          classified.extended.map(function (rule) {
            var doneClass = doneSet[rule.id] ? ' done' : '';
            return (
              '<a class="recommend-extended-item' + doneClass + '" href="' + escapeHtml(rule.linkHref) + '" ' +
              'data-ga="click_recommendation" data-ga-text="' + escapeHtml(rule.id) + '" data-ga-loc="index_hub_recommend">' +
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
        '<div class="recommend-subtitle">필터 조건에 맞춰 우선순위로 정렬했어요. (참고 예시 · 투자 권유 아님)</div>' +
        '<div class="recommend-top-label">📌 지금 바로 챙길 액션 TOP ' + classified.top3.length + '</div>' +
        '<div class="recommend-cards">' + topCardsHtml + '</div>' +
        extendedHtml +
        notApplicableHtml;

      var notApplicableEl = $('#recommendNotApplicable');
      if (notApplicableEl) {
        notApplicableEl.querySelector('.recommend-notapplicable-toggle').addEventListener('click', function () {
          notApplicableEl.classList.toggle('expanded');
        });
      }

      var sig = filterSignature();
      if (sig !== lastRenderedSignature && window.gtag) {
        window.gtag('event', 'view_index_recommendation', {
          click_text: sig,
          click_location: 'index_hub_recommend'
        });
        lastRenderedSignature = sig;
      }
    });
  }

  function renderSegmentCards() {
    $$('.segment-card').forEach(function (card) {
      card.classList.remove('my-segment');
      var seg = card.getAttribute('data-segment');
      if (seg && seg === state.is) {
        card.classList.add('my-segment');
      }
    });
  }

  function renderAll() {
    renderRecommendSection();
    renderSegmentCards();
  }

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

  renderChipSelection();
  updateMoreToggle();
  renderAll();

  window.IndexPersonalizerInit = {
    getState: function () { return state; },
    rerender: renderAll
  };
})();
