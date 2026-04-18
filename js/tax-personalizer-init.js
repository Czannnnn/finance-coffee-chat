// Finance Coffee Chat — tax-optimization 초기화 스크립트

(function () {
  'use strict';

  var P = window.TaxPersonalizer;
  if (!P) {
    console.error('[tax-personalizer-init] TaxPersonalizer가 로드되지 않았습니다.');
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
    if (doneSet[id]) delete doneSet[id];
    else doneSet[id] = true;
    updateUrl();
    renderAll();
    if (window.gtag) {
      window.gtag('event', 'click_action_toggle', {
        click_text: (doneSet[id] ? 'done:' : 'undo:') + id,
        click_location: 'tax_hub_recommend'
      });
    }
  }

  function renderChipSelection() {
    $$('.filter-chips').forEach(function (group) {
      var field = group.getAttribute('data-field');
      $$('.chip', group).forEach(function (chip) {
        var value = chip.getAttribute('data-value');
        if (state[field] === value) chip.classList.add('selected');
        else chip.classList.remove('selected');
      });
    });
  }

  function updateMoreToggle() {
    var hasOptional = state.tenure || state.dep;
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

    if (state[field] === value) delete state[field];
    else state[field] = value;

    updateUrl();
    renderChipSelection();
    renderAll();

    if (window.gtag) {
      window.gtag('event', 'click_filter_chip', {
        click_text: field + ':' + value,
        click_location: 'tax_hub_filter'
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
      window.gtag('event', 'expand_filter_more', { click_location: 'tax_hub_filter' });
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
        click_location: 'tax_hub_filter'
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
    recommendationsPromise = fetch('data/tax-recommendations.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load recommendations');
        return res.json();
      })
      .then(function (data) { return data.rules || []; })
      .catch(function (err) {
        console.error('[tax-personalizer] 규칙 로딩 실패', err);
        return [];
      });
    return recommendationsPromise;
  }

  var AREA_LABELS = {
    accounts: '절세계좌',
    'year-end': '연말정산',
    retirement: '퇴직연금',
    'isa-bonus': 'ISA 전환',
    furusato: '고향사랑기부',
    'loss-harvest': '손실상계'
  };

  function getAreaLabel(areaRef) {
    var s = String(areaRef || '');
    if (s.indexOf('year-end') === 0) return AREA_LABELS['year-end'];
    if (s.indexOf('isa-bonus') === 0) return AREA_LABELS['isa-bonus'];
    if (s.indexOf('loss-harvest') === 0) return AREA_LABELS['loss-harvest'];
    var match = s.match(/^([a-z-]+?)(-|$)/);
    var key = match ? match[1] : '';
    return AREA_LABELS[key] || areaRef;
  }

  function filterSignature() {
    return ['ts', 'salary', 'hasDC', 'tenure', 'dep']
      .map(function (f) { return state[f] || '_'; })
      .join('_');
  }

  var TS_LABELS = {
    ts1: '저소득', ts2: '중소득', ts3: '고소득',
    ts4: '퇴직 근접', ts5: '개인사업자', ts6: '맞벌이'
  };
  var SALARY_LABELS = {
    '0-55': '~5500만', '55-70': '5500~7000', '70-100': '7000~1억',
    '100-150': '1억~1.5억', '150+': '1.5억+'
  };

  function stateSummaryText() {
    var parts = [];
    if (state.ts) parts.push(TS_LABELS[state.ts]);
    if (state.salary) parts.push(SALARY_LABELS[state.salary]);
    if (state.hasDC) parts.push(state.hasDC === 'yes' ? 'DC 가입' : 'DC 미가입');
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
        '<div class="recommend-title">내 맞춤 절세 요약</div>' +
        '<div class="recommend-subtitle">👉 위 3가지(유형·연봉·DC)만 골라주시면 맞춤 추천이 여기에 나타나요</div>';
      lastRenderedSignature = null;
      return;
    }

    loadRecommendations().then(function (rules) {
      if (!P.hasRequiredFields(state)) return;
      var classified = P.classifyRules(rules, state);
      section.className = 'recommend-section';

      if (classified.top3.length === 0) {
        section.innerHTML =
          '<div class="recommend-title">내 맞춤 절세 요약</div>' +
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
          'data-ga="click_recommendation" data-ga-text="' + escapeHtml(rule.id) + '" data-ga-loc="tax_hub_recommend">' +
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
          '<div class="recommend-extended-title">💡 추가로 챙길 것 ' + classified.extended.length + '개</div>' +
          '<div class="recommend-extended-list">' +
          classified.extended.map(function (rule) {
            var doneClass = doneSet[rule.id] ? ' done' : '';
            return (
              '<a class="recommend-extended-item' + doneClass + '" href="' + escapeHtml(rule.linkHref) + '" ' +
              'data-ga="click_recommendation" data-ga-text="' + escapeHtml(rule.id) + '" data-ga-loc="tax_hub_recommend">' +
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
        '<div class="recommend-subtitle">필터 조건에 맞춰 우선순위로 정렬했어요. (제도는 개별 적용 여부 확인 필수)</div>' +
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
        window.gtag('event', 'view_tax_recommendation', {
          click_text: sig,
          click_location: 'tax_hub_recommend'
        });
        lastRenderedSignature = sig;
      }
    });
  }

  function renderSegmentCards() {
    $$('.segment-card').forEach(function (card) {
      card.classList.remove('my-segment');
      var seg = card.getAttribute('data-segment');
      if (seg && seg === state.ts) {
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

  window.TaxPersonalizerInit = {
    getState: function () { return state; },
    rerender: renderAll
  };
})();
