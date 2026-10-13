/* Shared helpers used by the data files, demos and app.
   Everything is attached to window so the site works from file:// without a build step. */
(function () {
  'use strict';

  // String.raw alias: lets data files write LaTeX with single backslashes.
  window.R = String.raw;

  // Registry that chapter data files push into.
  window.CHAPTERS = [];

  // ---------- tiny DOM helper ----------
  window.h = function (tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid);
    }
    return el;
  };

  // ---------- matrix / pixel-grid HTML used inside content ----------
  // mat([[1,2],[3,4]], {hl:[[0,1]], cls:'', shade:true, max:255})
  window.mat = function (rows, opt) {
    opt = opt || {};
    const hl = new Set((opt.hl || []).map((p) => p.join(',')));
    const max = opt.max != null ? opt.max : Math.max(...rows.flat().map((v) => (typeof v === 'number' ? v : 0)), 1);
    let s = '<table class="mat' + (opt.shade ? ' shaded' : '') + (opt.cls ? ' ' + opt.cls : '') + '">';
    rows.forEach((r, i) => {
      s += '<tr>';
      r.forEach((v, j) => {
        let st = '';
        if (opt.shade && typeof v === 'number') {
          const g = Math.round(255 * Math.max(0, Math.min(1, v / max)));
          st = ' style="--px:rgb(' + g + ',' + g + ',' + g + ');--pxc:' + (g > 140 ? '#111' : '#f5f5f5') + '"';
        }
        s += '<td' + (hl.has(i + ',' + j) ? ' class="hl"' : '') + st + '>' + v + '</td>';
      });
      s += '</tr>';
    });
    s += '</table>';
    if (opt.label) s = '<figure class="mat-fig">' + s + '<figcaption>' + opt.label + '</figcaption></figure>';
    return s;
  };
  // Several matrices side by side with operators between them: matRow([m1,'*',m2,'=',m3])
  window.matRow = function (items) {
    return '<div class="mat-row">' + items.map((it) => (typeof it === 'string' && it.length < 4 ? '<span class="op">' + it + '</span>' : it)).join('') + '</div>';
  };

  // ---------- storage ----------
  const KEY = 'arti403-midterm-v1';
  const defaults = () => ({
    done: {},          // chapterId -> true
    mcq: {},           // chapterId -> {qIndex: chosenOption}
    essays: {},        // chapterId -> {qIndex: true}
    read: {},          // chapterId -> {sectionId:true}
    mock: [],          // [{date, score, total}]
    ar: false,
    theme: null,
    last: null,
  });
  let state;
  try { state = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch (e) { state = defaults(); }
  window.Store = {
    get: () => state,
    save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ } },
    reset() { state = defaults(); this.save(); },
  };

  // ---------- misc ----------
  window.debounce = function (fn, ms) {
    let t;
    return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); };
  };
  window.cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  window.stripHtml = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  window.escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
})();
