/*
 * last-updated.js — populate ".updated" byline spans + JSON-LD dateModified
 *
 * Behavior:
 *  1. On load, fills every <span class="updated"> whose textContent is empty (or has
 *     data-fallback) with the page's last-modified date in YYYY-MM-DD format.
 *     Default source: document.lastModified (HTTP Last-Modified, set by Vercel on each deploy).
 *  2. Static suffix " 갱신" appended; pages can override via data-suffix.
 *  3. Pages with live sheet data call window.cfcSetLastUpdated(value) after fetch
 *     to override with the actual data freshness timestamp.
 *  4. JSON-LD <script type="application/ld+json"> blocks containing "dateModified"
 *     are rewritten with the same date (SEO freshness for crawlers that execute JS).
 *
 * No dependencies, ~60 lines, idempotent.
 */
(function () {
  function pad(n) { return String(n).padStart(2, '0'); }

  function formatYMD(value) {
    if (!value) return '';
    var d = (value instanceof Date) ? value : new Date(value);
    if (isNaN(d.getTime())) {
      // accept "YYYY-MM-DD HH:MM:SS" by replacing first space with T
      if (typeof value === 'string') {
        d = new Date(value.replace(' ', 'T'));
      }
      if (isNaN(d.getTime())) return '';
    }
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function applyToSpans(ymd) {
    if (!ymd) return;
    var spans = document.querySelectorAll('span.updated');
    for (var i = 0; i < spans.length; i++) {
      var el = spans[i];
      if (el.dataset.locked === 'true') continue;
      var suffix = el.dataset.suffix != null ? el.dataset.suffix : '갱신';
      el.textContent = (ymd + ' ' + suffix).trim();
    }
  }

  function applyToJsonLd(ymd) {
    if (!ymd) return;
    var scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (var i = 0; i < scripts.length; i++) {
      var s = scripts[i];
      var txt = s.textContent;
      if (!txt || txt.indexOf('dateModified') === -1) continue;
      var patched = txt.replace(/"dateModified"\s*:\s*"\d{4}-\d{2}-\d{2}"/g, '"dateModified": "' + ymd + '"');
      if (patched !== txt) s.textContent = patched;
    }
  }

  function applyAll(value, opts) {
    var ymd = formatYMD(value);
    if (!ymd) return;
    var lock = !!(opts && opts.lock);
    applyToSpans(ymd);
    applyToJsonLd(ymd);
    if (lock) {
      var spans = document.querySelectorAll('span.updated');
      for (var i = 0; i < spans.length; i++) spans[i].dataset.locked = 'true';
    }
  }

  // Public override for live-data pages (sheet timestamp). Locks spans against re-write.
  window.cfcSetLastUpdated = function (value) {
    applyAll(value, { lock: true });
  };

  function init() {
    // Default: HTTP Last-Modified (Vercel deploy time for static files).
    applyAll(document.lastModified, { lock: false });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
