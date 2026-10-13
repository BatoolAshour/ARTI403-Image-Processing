/* UI kit for demos: controls, image panels, before/after compare, plots. */
(function () {
  'use strict';
  const UI = (window.UI = {});

  let uid = 0;
  UI.slider = function (label, min, max, step, value, onInput, fmt) {
    const id = 'sl' + ++uid;
    fmt = fmt || ((v) => v);
    const out = h('output', { for: id }, fmt(value));
    const inp = h('input', { type: 'range', id, min, max, step, value });
    inp.addEventListener('input', () => { out.textContent = fmt(+inp.value); onInput(+inp.value); });
    const wrap = h('label', { class: 'ctl ctl-slider', for: id }, h('span', { class: 'ctl-label' }, label), inp, out);
    wrap.input = inp;
    wrap.set = (v) => { inp.value = v; out.textContent = fmt(+v); };
    return wrap;
  };
  // Segmented buttons. options: [[value,label],...]
  UI.seg = function (label, options, value, onChange) {
    const wrap = h('div', { class: 'ctl ctl-seg', role: 'group' });
    if (label) wrap.appendChild(h('span', { class: 'ctl-label' }, label));
    const box = h('div', { class: 'seg' });
    options.forEach(([v, l]) => {
      const b = h('button', { type: 'button', class: v === value ? 'on' : '', 'aria-pressed': v === value ? 'true' : 'false' }, l);
      b.addEventListener('click', () => {
        box.querySelectorAll('button').forEach((x) => { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); });
        b.classList.add('on'); b.setAttribute('aria-pressed', 'true');
        onChange(v);
      });
      box.appendChild(b);
    });
    wrap.appendChild(box);
    return wrap;
  };
  UI.select = function (label, options, value, onChange) {
    const sel = h('select', {}, options.map(([v, l]) => h('option', { value: v, selected: v === value ? true : null }, l)));
    sel.addEventListener('change', () => onChange(sel.value));
    const wrap = h('label', { class: 'ctl ctl-select' }, h('span', { class: 'ctl-label' }, label), sel);
    wrap.select = sel;
    return wrap;
  };
  UI.check = function (label, value, onChange) {
    const inp = h('input', { type: 'checkbox', checked: value ? true : null });
    inp.addEventListener('change', () => onChange(inp.checked));
    return h('label', { class: 'ctl ctl-check' }, inp, h('span', {}, label));
  };
  UI.controls = (...kids) => h('div', { class: 'controls' }, ...kids);

  // A labelled image panel: returns {el, canvas, setLabel}
  UI.panel = function (label, opt) {
    opt = opt || {};
    const cv = h('canvas', { class: 'img' + (opt.pixel ? ' pixel' : ''), width: 256, height: 256, 'aria-label': label });
    const lab = h('figcaption', { html: label });
    const el = h('figure', { class: 'panel' + (opt.cls ? ' ' + opt.cls : '') }, cv, lab);
    return { el, canvas: cv, setLabel: (t) => { lab.innerHTML = t; } };
  };
  UI.panels = (...p) => h('div', { class: 'panels n' + p.length }, ...p.map((x) => x.el || x));

  // Before/after compare with a draggable divider.
  UI.compare = function (labelA, labelB) {
    const a = h('canvas', { class: 'img' }), b = h('canvas', { class: 'img' });
    const handle = h('div', { class: 'cmp-handle', role: 'slider', tabindex: 0, 'aria-label': 'Drag to compare', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 50 });
    const top = h('div', { class: 'cmp-top' }, b);
    const tagA = h('span', { class: 'cmp-tag l' }, labelA), tagB = h('span', { class: 'cmp-tag r' }, labelB);
    const box = h('div', { class: 'cmp' }, a, top, handle, tagA, tagB);
    let pos = 0.5;
    const set = (p) => {
      pos = Math.max(0, Math.min(1, p));
      top.style.clipPath = `inset(0 0 0 ${pos * 100}%)`;
      handle.style.left = pos * 100 + '%';
      handle.setAttribute('aria-valuenow', Math.round(pos * 100));
    };
    set(0.5);
    const move = (e) => { const r = box.getBoundingClientRect(); const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left; set(x / r.width); };
    let drag = false;
    box.addEventListener('pointerdown', (e) => { drag = true; box.setPointerCapture(e.pointerId); move(e); });
    box.addEventListener('pointermove', (e) => drag && move(e));
    box.addEventListener('pointerup', () => { drag = false; });
    handle.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') set(pos - 0.05); if (e.key === 'ArrowRight') set(pos + 0.05); });
    return { el: h('figure', { class: 'panel cmp-wrap' }, box, h('figcaption', { html: `Drag the handle: <b>${labelA}</b> (left) vs <b>${labelB}</b> (right)` })), a, b, setLabels(x, y) { tagA.textContent = x; tagB.textContent = y; } };
  };

  // Image source picker (built-in test images + the student's own photo, processed locally).
  UI.sources = {
    scene: ['Landscape', () => IP.scene(256)],
    pattern: ['Test pattern', () => IP.pattern(256)],
    fruit: ['Fruit bowl', () => IP.fruit(256)],
    phantom: ['Scan phantom', () => IP.phantom(256)],
    dark: ['Dark landscape', () => IP.cache.dark || (IP.cache.dark = IP.scene(256).map((v) => v * 0.28))],
    low: ['Low-contrast', () => IP.cache.low || (IP.cache.low = IP.scene(256).map((v) => 95 + v * 0.3))],
    bright: ['Washed-out', () => IP.cache.bright || (IP.cache.bright = IP.scene(256).map((v) => 150 + v * 0.42))],
  };
  UI.imagePicker = function (keys, value, onChange, opt) {
    opt = opt || {};
    const opts = keys.map((k) => [k, UI.sources[k][0]]);
    if (!opt.noUpload) opts.push(['user', 'Your image…']);
    const file = h('input', { type: 'file', accept: 'image/*', class: 'visually-hidden' });
    const ctl = UI.select('Image', opts, value, (v) => {
      if (v === 'user') { if (IP.cache.userRGB) onChange(UI.get('user', opt.color)); file.click(); }
      else onChange(UI.get(v, opt.color));
    });
    file.addEventListener('change', () => {
      const f = file.files[0];
      if (!f) return;
      const img = new Image();
      img.onload = () => {
        IP.cache.userRGB = IP.fromImageElement(img, 256);
        IP.cache.user = IP.cache.userRGB.toGray();
        URL.revokeObjectURL(img.src);
        onChange(UI.get('user', opt.color));
      };
      img.src = URL.createObjectURL(f);
    });
    ctl.appendChild(file);
    ctl.title = 'Your own image never leaves your browser.';
    return ctl;
  };
  UI.get = function (key, color) {
    if (key === 'user' && IP.cache.userRGB) return color ? IP.cache.userRGB : IP.cache.user;
    if (color) { if (key === 'fruit') return IP.fruitRGB(256); return IP.sceneRGB(256); }
    return (UI.sources[key] || UI.sources.scene)[1]();
  };

  // ---------- plotting on canvas ----------
  const P = (UI.plot = {});
  function setup(cv, W, H) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.aspectRatio = W + ' / ' + H;
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    c.font = '11px "IBM Plex Mono", ui-monospace, monospace';
    return c;
  }
  const col = () => ({ ink: cssVar('--ink') || '#111', muted: cssVar('--muted') || '#666', line: cssVar('--line') || '#ddd', accent: cssVar('--accent') || '#0e7490', warn: cssVar('--warn') || '#b45309', bad: cssVar('--bad') || '#b91c1c', good: cssVar('--good') || '#15803d', surface: cssVar('--surface') || '#fff' });
  P.colors = col;

  // Generic XY frame. opt: {xmin,xmax,ymin,ymax,xlabel,ylabel,xticks,yticks}
  function frame(c, W, H, o) {
    const C = col(), m = { l: 40, r: 12, t: 12, b: 32 };
    const X = (x) => m.l + ((x - o.xmin) / (o.xmax - o.xmin)) * (W - m.l - m.r);
    const Y = (y) => H - m.b - ((y - o.ymin) / (o.ymax - o.ymin)) * (H - m.t - m.b);
    c.strokeStyle = C.line; c.lineWidth = 1; c.fillStyle = C.muted;
    (o.xticks || []).forEach((t) => { c.beginPath(); c.moveTo(X(t), m.t); c.lineTo(X(t), H - m.b); c.stroke(); c.textAlign = 'center'; c.fillText(t, X(t), H - m.b + 14); });
    (o.yticks || []).forEach((t) => { c.beginPath(); c.moveTo(m.l, Y(t)); c.lineTo(W - m.r, Y(t)); c.stroke(); c.textAlign = 'right'; c.fillText(t, m.l - 5, Y(t) + 4); });
    c.strokeStyle = C.muted; c.beginPath(); c.moveTo(m.l, m.t); c.lineTo(m.l, H - m.b); c.lineTo(W - m.r, H - m.b); c.stroke();
    c.textAlign = 'center'; c.fillStyle = C.muted;
    if (o.xlabel) c.fillText(o.xlabel, (m.l + W - m.r) / 2, H - 4);
    if (o.ylabel) { c.save(); c.translate(11, (m.t + H - m.b) / 2); c.rotate(-Math.PI / 2); c.fillText(o.ylabel, 0, 0); c.restore(); }
    return { X, Y, m, C };
  }
  P.frame = frame;
  P.setup = setup;

  // Transformation curve(s) s = T(r). fns: [{f, color, label, dash}]
  P.curve = function (cv, fns, o) {
    o = Object.assign({ W: 300, H: 260, xmin: 0, xmax: 255, ymin: 0, ymax: 255, xticks: [0, 64, 128, 192, 255], yticks: [0, 64, 128, 192, 255], xlabel: 'input r', ylabel: 'output s' }, o);
    const c = setup(cv, o.W, o.H), F = frame(c, o.W, o.H, o);
    fns.forEach((fn, k) => {
      c.strokeStyle = fn.color || (k ? F.C.muted : F.C.accent); c.lineWidth = fn.width || 2.2; c.setLineDash(fn.dash || []);
      c.beginPath();
      for (let i = 0; i <= 256; i++) { const r = o.xmin + ((o.xmax - o.xmin) * i) / 256; const s = Math.max(o.ymin, Math.min(o.ymax, fn.f(r))); i ? c.lineTo(F.X(r), F.Y(s)) : c.moveTo(F.X(r), F.Y(s)); }
      c.stroke(); c.setLineDash([]);
      if (fn.label) { c.fillStyle = fn.color || F.C.accent; c.textAlign = 'left'; c.fillText(fn.label, F.X(fn.lx != null ? fn.lx : o.xmax * 0.62), F.Y(fn.ly != null ? fn.ly : fn.f(o.xmax * 0.62)) - 6); }
    });
    (o.points || []).forEach(([x, y, t]) => { c.fillStyle = F.C.warn; c.beginPath(); c.arc(F.X(x), F.Y(y), 4, 0, 7); c.fill(); if (t) { c.textAlign = 'left'; c.fillText(t, F.X(x) + 6, F.Y(y) + 12); } });
  };

  // Histogram bars (+ optional CDF line). hist: array of counts.
  P.hist = function (cv, hist, o) {
    o = Object.assign({ W: 300, H: 170, normalized: true, cdf: false, color: null, title: '' }, o);
    const N = hist.reduce((a, b) => a + b, 0) || 1, L = hist.length;
    const vals = Array.from(hist, (v) => (o.normalized ? v / N : v));
    const ymax = o.ymax || Math.max(...vals) * 1.08 || 1;
    const c = setup(cv, o.W, o.H);
    const F = frame(c, o.W, o.H, { xmin: 0, xmax: L, ymin: 0, ymax, xticks: L > 16 ? [0, 64, 128, 192, 255] : [], yticks: [], xlabel: o.xlabel || 'intensity rₖ', ylabel: o.normalized ? 'p(rₖ)' : 'h(rₖ)' });
    c.fillStyle = o.color || F.C.ink;
    const bw = (F.X(1) - F.X(0));
    vals.forEach((v, k) => { const x = F.X(k), y = F.Y(v); c.fillRect(x, y, Math.max(bw - (L <= 16 ? 4 : 0), 1), F.Y(0) - y); });
    if (L <= 16) { c.fillStyle = F.C.muted; c.textAlign = 'center'; vals.forEach((v, k) => c.fillText(k, F.X(k) + bw / 2 - 2, o.H - 18)); }
    if (o.cdf) {
      c.strokeStyle = F.C.accent; c.lineWidth = 2; c.beginPath();
      let acc = 0;
      vals.forEach((v, k) => { acc += o.normalized ? v : v / N; const y = o.H - F.m.b - acc * (o.H - F.m.t - F.m.b); k ? c.lineTo(F.X(k), y) : c.moveTo(F.X(k), y); });
      c.stroke();
      c.fillStyle = F.C.accent; c.textAlign = 'right'; c.fillText('CDF', o.W - 14, F.m.t + 10);
    }
    if (o.title) { c.fillStyle = F.C.muted; c.textAlign = 'left'; c.fillText(o.title, F.m.l + 6, F.m.t + 10); }
  };

  // 1-D signal plot: series [{data:[...], color, mode:'line'|'stem'|'step'|'dots', label}]
  P.signal = function (cv, series, o) {
    const all = series.flatMap((s) => s.data.map((d) => (Array.isArray(d) ? d[1] : d)));
    const n = Math.max(...series.map((s) => s.data.length));
    o = Object.assign({ W: 520, H: 200, xmin: 0, xmax: n - 1, ymin: Math.min(0, ...all), ymax: Math.max(...all) * 1.1 || 1, xticks: [], yticks: [] }, o);
    const c = setup(cv, o.W, o.H), F = frame(c, o.W, o.H, o);
    if (o.ymin < 0) { c.strokeStyle = F.C.muted; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(F.X(o.xmin), F.Y(0)); c.lineTo(F.X(o.xmax), F.Y(0)); c.stroke(); c.setLineDash([]); }
    series.forEach((s, k) => {
      const color = s.color || (k ? F.C.warn : F.C.accent);
      c.strokeStyle = color; c.fillStyle = color; c.lineWidth = s.width || 2;
      const pts = s.data.map((d, i) => (Array.isArray(d) ? d : [i, d]));
      if (s.mode === 'stem' || s.mode === 'dots') {
        pts.forEach(([x, y]) => { if (s.mode === 'stem') { c.beginPath(); c.moveTo(F.X(x), F.Y(0)); c.lineTo(F.X(x), F.Y(y)); c.stroke(); } c.beginPath(); c.arc(F.X(x), F.Y(y), s.r || 3.2, 0, 7); c.fill(); });
      } else {
        c.beginPath();
        pts.forEach(([x, y], i) => {
          if (s.mode === 'step' && i) c.lineTo(F.X(x), F.Y(pts[i - 1][1]));
          i ? c.lineTo(F.X(x), F.Y(y)) : c.moveTo(F.X(x), F.Y(y));
        });
        c.setLineDash(s.dash || []); c.stroke(); c.setLineDash([]);
      }
    });
    let ly = F.m.t + 12;
    series.forEach((s, k) => { if (!s.label) return; c.fillStyle = s.color || (k ? F.C.warn : F.C.accent); c.textAlign = 'right'; c.fillText(s.label, o.W - 14, ly); ly += 14; });
    return F;
  };

  // Lazy-mount demos when they scroll into view.
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((ents) => {
    ents.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); mountNow(e.target); } });
  }, { rootMargin: '300px' }) : null;
  function mountNow(el) {
    const fn = window.VIS && window.VIS[el.dataset.vis];
    if (!fn) { el.innerHTML = '<p class="muted">Visual not found: ' + el.dataset.vis + '</p>'; return; }
    el.innerHTML = '';
    try { fn(el); if (window.App) App.renderMath(el); } catch (err) { console.error(err); el.innerHTML = '<p class="muted">This visual failed to load.</p>'; }
  }
  UI.mountAll = function (root) {
    root.querySelectorAll('[data-vis]:not([data-mounted])').forEach((el) => {
      el.dataset.mounted = '1';
      if (io) io.observe(el); else mountNow(el);
    });
  };
})();
