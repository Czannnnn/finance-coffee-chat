// site-search.js — GNB 사이트 내부 검색 위젯 (2026-05-25)
// 정적 JSON 인덱스 + 클라이언트 substring 매칭 + GA4 이벤트 3종
// GA4 이벤트: open_search / search_query (debounce) / click_search_result

(function () {
  if (typeof window === 'undefined') return;
  if (window.__siteSearchInit) return;
  window.__siteSearchInit = true;

  var INDEX_URL = '/data/search-index.json';
  var indexCache = null;
  var indexLoading = false;
  var indexLoadCallbacks = [];

  // CSS 인라인 주입 (38+개 HTML에 별도 CSS 추가 없이)
  function injectStyles() {
    if (document.getElementById('site-search-styles')) return;
    var css = ''
      + '.search-trigger{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;background:transparent;border:none;color:#F5EDE0;cursor:pointer;margin-left:8px;transition:background 0.15s;font-size:16px;}'
      + '.search-trigger:hover{background:rgba(196,133,60,0.18);color:#C4853C;}'
      + '.search-trigger:focus{outline:2px solid #C4853C;outline-offset:1px;}'
      + '.search-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(44,24,16,0.5);z-index:9998;display:none;opacity:0;transition:opacity 0.18s;}'
      + '.search-overlay.open{display:block;opacity:1;}'
      + '.search-panel{position:fixed;top:60px;left:50%;transform:translateX(-50%) translateY(-10px);width:90%;max-width:560px;background:#FFFDF9;border:1px solid #C4853C;border-radius:14px;box-shadow:0 12px 40px rgba(44,24,16,0.25);z-index:9999;display:none;opacity:0;transition:all 0.2s;font-family:"Noto Sans KR",sans-serif;}'
      + '.search-panel.open{display:block;opacity:1;transform:translateX(-50%) translateY(0);}'
      + '.search-input-row{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(196,133,60,0.18);}'
      + '.search-input-row .icon{font-size:18px;color:#C4853C;flex-shrink:0;}'
      + '.search-input-row input{flex:1;border:none;outline:none;font-size:15px;font-family:inherit;color:#2C1810;background:transparent;min-height:32px;}'
      + '.search-input-row input::placeholder{color:rgba(107,58,42,0.4);}'
      + '.search-close{background:none;border:none;cursor:pointer;color:#6B3A2A;font-size:18px;width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}'
      + '.search-close:hover{background:rgba(196,133,60,0.10);color:#C4853C;}'
      + '.search-results{max-height:60vh;overflow-y:auto;padding:6px 0;}'
      + '.search-result-item{display:block;padding:12px 18px;text-decoration:none;color:#2C1810;border-bottom:1px solid rgba(44,24,16,0.04);transition:background 0.12s;cursor:pointer;}'
      + '.search-result-item:last-child{border-bottom:none;}'
      + '.search-result-item:hover,.search-result-item.active{background:#FAF6F0;}'
      + '.search-result-top{display:flex;align-items:center;gap:8px;margin-bottom:4px;}'
      + '.search-result-icon{font-size:14px;flex-shrink:0;}'
      + '.search-result-title{font-size:14px;font-weight:700;color:#2C1810;flex:1;line-height:1.4;}'
      + '.search-result-cat{font-size:10px;font-weight:700;letter-spacing:0.5px;color:#C4853C;background:rgba(196,133,60,0.12);padding:2px 8px;border-radius:10px;flex-shrink:0;}'
      + '.search-result-desc{font-size:12px;color:#6B3A2A;line-height:1.55;padding-left:22px;}'
      + '.search-result-item mark{background:rgba(196,133,60,0.30);color:inherit;font-weight:700;padding:0 2px;border-radius:2px;}'
      + '.search-empty{padding:24px 18px;text-align:center;color:#6B3A2A;font-size:13.5px;line-height:1.7;}'
      + '.search-empty strong{color:#2C1810;}'
      + '.search-hint{padding:10px 18px;font-size:11.5px;color:#6B3A2A;border-top:1px solid rgba(44,24,16,0.06);background:#FAF6F0;border-radius:0 0 14px 14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;}'
      + '.search-hint kbd{display:inline-block;padding:1px 6px;background:#FFFDF9;border:1px solid rgba(44,24,16,0.15);border-radius:4px;font-size:10.5px;font-family:inherit;color:#3D2317;}'
      + '@media (max-width:600px){.search-panel{top:8px;width:96%;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;}.search-panel.open{display:flex;}.search-results{flex:1;max-height:none;}.search-input-row input{font-size:16px;}.search-trigger{width:40px;height:40px;font-size:18px;}}';
    var style = document.createElement('style');
    style.id = 'site-search-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function loadIndex(callback) {
    if (indexCache) { callback(indexCache); return; }
    indexLoadCallbacks.push(callback);
    if (indexLoading) return;
    indexLoading = true;
    fetch(INDEX_URL, { cache: 'force-cache' })
      .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('HTTP ' + res.status)); })
      .then(function (data) {
        indexCache = (data && Array.isArray(data.pages)) ? data.pages : [];
        indexLoading = false;
        indexLoadCallbacks.forEach(function (cb) { try { cb(indexCache); } catch (e) {} });
        indexLoadCallbacks = [];
      })
      .catch(function () {
        indexCache = [];
        indexLoading = false;
        indexLoadCallbacks.forEach(function (cb) { try { cb([]); } catch (e) {} });
        indexLoadCallbacks = [];
      });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function highlight(text, query) {
    if (!query) return escapeHtml(text);
    var safeText = escapeHtml(text);
    var safeQ = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!safeQ) return safeText;
    return safeText.replace(new RegExp('(' + safeQ + ')', 'gi'), '<mark>$1</mark>');
  }

  function scorePage(page, query) {
    var q = query.toLowerCase();
    var score = 0;
    if (!page) return 0;
    var title = (page.title || '').toLowerCase();
    var desc = (page.desc || '').toLowerCase();
    var keywords = (page.keywords || []).map(function (k) { return String(k).toLowerCase(); });
    if (title.indexOf(q) === 0) score += 100;
    else if (title.indexOf(q) >= 0) score += 60;
    keywords.forEach(function (k) {
      if (k === q) score += 80;
      else if (k.indexOf(q) === 0) score += 40;
      else if (k.indexOf(q) >= 0) score += 20;
    });
    if (desc.indexOf(q) >= 0) score += 10;
    return score;
  }

  function searchPages(query, pages) {
    if (!query || query.length < 1) return [];
    var q = query.trim();
    if (q.length < 1) return [];
    var scored = pages.map(function (p) { return { page: p, score: scorePage(p, q) }; })
      .filter(function (x) { return x.score > 0; });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, 8).map(function (x) { return x.page; });
  }

  function renderResults(query, results, listEl) {
    if (!results.length) {
      listEl.innerHTML = '<div class="search-empty">' +
        '검색 결과 없음 <strong>"' + escapeHtml(query) + '"</strong><br>' +
        '<span style="font-size:12px;color:rgba(107,58,42,0.7)">예: <em>공모주, 자산관리, ISA, IRP, 양도세, 생활비</em></span>' +
        '</div>';
      return;
    }
    var html = results.map(function (p, i) {
      return '<a class="search-result-item" data-idx="' + i + '" data-url="' + escapeHtml(p.url) + '" data-cat="' + escapeHtml(p.category || '') + '" data-pos="' + (i + 1) + '" href="' + escapeHtml(p.url) + '">' +
        '<div class="search-result-top">' +
          '<span class="search-result-icon">' + escapeHtml(p.icon || '📄') + '</span>' +
          '<span class="search-result-title">' + highlight(p.title || '', query) + '</span>' +
          '<span class="search-result-cat">' + escapeHtml(p.category || '') + '</span>' +
        '</div>' +
        '<div class="search-result-desc">' + highlight(p.desc || '', query) + '</div>' +
      '</a>';
    }).join('');
    listEl.innerHTML = html;
  }

  function buildPanel() {
    if (document.getElementById('siteSearchPanel')) return;

    var overlay = document.createElement('div');
    overlay.className = 'search-overlay';
    overlay.id = 'siteSearchOverlay';

    var panel = document.createElement('div');
    panel.className = 'search-panel';
    panel.id = 'siteSearchPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '사이트 내부 검색');

    panel.innerHTML = ''
      + '<div class="search-input-row">'
      + '  <span class="icon" aria-hidden="true">🔍</span>'
      + '  <input id="siteSearchInput" type="text" placeholder="검색어를 입력하세요 (예: ISA, 공모주, 양도세)" autocomplete="off" aria-label="사이트 내부 검색">'
      + '  <button class="search-close" id="siteSearchClose" aria-label="검색 닫기">✕</button>'
      + '</div>'
      + '<div class="search-results" id="siteSearchResults"></div>'
      + '<div class="search-hint">'
      + '  <span><kbd>↑↓</kbd> 이동 <kbd>Enter</kbd> 이동 <kbd>Esc</kbd> 닫기</span>'
      + '  <span style="color:#C4853C;font-weight:600;">사이트 내부 검색</span>'
      + '</div>';

    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    var input = panel.querySelector('#siteSearchInput');
    var resultsEl = panel.querySelector('#siteSearchResults');
    var closeBtn = panel.querySelector('#siteSearchClose');

    var debounceTimer = null;
    var lastQuerySent = '';

    function performSearch() {
      var q = (input.value || '').trim();
      loadIndex(function (pages) {
        var results = searchPages(q, pages);
        if (q.length === 0) {
          resultsEl.innerHTML = '<div class="search-empty">' +
            '검색어를 입력해 주세요<br>' +
            '<span style="font-size:12px;color:rgba(107,58,42,0.7)">예: <em>공모주, 자산관리, ISA, IRP, 양도세, 생활비</em></span>' +
            '</div>';
          return;
        }
        renderResults(q, results, resultsEl);
        // GA4: search_query (debounced, 같은 query 중복 전송 방지)
        // + GA4 표준 view_search_results (site search 표준 보고서용)
        if (q && q !== lastQuerySent && typeof gtag === 'function') {
          lastQuerySent = q;
          try {
            gtag('event', 'search_query', {
              click_text: q.substring(0, 80),
              click_location: 'gnb_search',
              result_count: results.length
            });
            gtag('event', 'view_search_results', {
              search_term: q.substring(0, 80),
              result_count: results.length
            });
          } catch (e) { /* swallow */ }
        }
      });
    }

    input.addEventListener('input', function () {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(performSearch, 350);
    });

    // 키보드 네비 (↑↓ Enter)
    var activeIdx = -1;
    function updateActive(items) {
      items.forEach(function (it, i) { it.classList.toggle('active', i === activeIdx); });
      if (activeIdx >= 0 && items[activeIdx]) {
        items[activeIdx].scrollIntoView({ block: 'nearest' });
      }
    }
    input.addEventListener('keydown', function (e) {
      var items = resultsEl.querySelectorAll('.search-result-item');
      if (e.key === 'ArrowDown' && items.length) {
        e.preventDefault();
        activeIdx = (activeIdx + 1) % items.length;
        updateActive(items);
      } else if (e.key === 'ArrowUp' && items.length) {
        e.preventDefault();
        activeIdx = activeIdx <= 0 ? items.length - 1 : activeIdx - 1;
        updateActive(items);
      } else if (e.key === 'Enter') {
        if (activeIdx >= 0 && items[activeIdx]) {
          e.preventDefault();
          items[activeIdx].click();
        } else if (items.length) {
          e.preventDefault();
          items[0].click();
        }
      } else if (e.key === 'Escape') {
        closePanel();
      }
    });

    // 결과 클릭 → GA4 click_search_result + 이동 (기본 a href로 자연 이동)
    resultsEl.addEventListener('click', function (e) {
      var item = e.target.closest('.search-result-item');
      if (!item) return;
      var q = (input.value || '').trim();
      if (typeof gtag === 'function') {
        try {
          gtag('event', 'click_search_result', {
            click_text: 'q:' + q.substring(0, 50) + '|target:' + item.dataset.url,
            click_location: 'gnb_search',
            result_position: parseInt(item.dataset.pos, 10) || 0
          });
        } catch (e2) { /* swallow */ }
      }
      // 기본 동작(이동)은 그대로
    }, true);

    closeBtn.addEventListener('click', closePanel);
    overlay.addEventListener('click', closePanel);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) closePanel();
    });

    window.__siteSearchOpen = openPanel;
    window.__siteSearchClose = closePanel;

    function openPanel() {
      panel.classList.add('open');
      overlay.classList.add('open');
      activeIdx = -1;
      lastQuerySent = '';
      setTimeout(function () { input.focus(); }, 50);
      // 초기 빈 상태
      performSearch();
      if (typeof gtag === 'function') {
        try {
          gtag('event', 'open_search', {
            click_text: 'gnb_trigger',
            click_location: 'gnb_search'
          });
        } catch (e) { /* swallow */ }
      }
    }
    function closePanel() {
      panel.classList.remove('open');
      overlay.classList.remove('open');
      input.value = '';
      activeIdx = -1;
      lastQuerySent = '';
    }
  }

  function attachTriggers() {
    document.querySelectorAll('.search-trigger').forEach(function (btn) {
      if (btn.__siteSearchBound) return;
      btn.__siteSearchBound = true;
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof window.__siteSearchOpen === 'function') {
          window.__siteSearchOpen();
        }
      });
    });
  }

  function init() {
    injectStyles();
    buildPanel();
    attachTriggers();
    // 색인 prefetch (검색 박스 처음 열 때 지연 감소)
    setTimeout(function () { loadIndex(function () {}); }, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
