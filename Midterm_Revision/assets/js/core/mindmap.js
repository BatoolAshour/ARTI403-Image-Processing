/* Interactive mind map: collapsible tree (horizontal layout) with zoom & pan.
   Node format: { t: 'English label', a: 'Arabic label', c: [children] } */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const S = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const BR = ['--accent', '--violet', '--warn', '--good', '--bad', '--ink-2'];

  window.MindMap = function (container, data) {
    const showAr = () => document.documentElement.classList.contains('ar-on');
    let id = 0;
    (function prep(n, depth, branch) {
      n._id = id++; n._d = depth; n._b = depth === 1 ? (n._br = branch) : branch;
      n._open = depth < 2;
      (n.c || []).forEach((k, i) => prep(k, depth + 1, depth === 0 ? i % BR.length : branch));
    })(data, 0, 0);

    const wrap = h('div', { class: 'mm-wrap' });
    const svg = S('svg', { role: 'img', 'aria-label': 'Mind map: ' + data.t });
    const g = S('g', {});
    svg.appendChild(g);
    const tools = h('div', { class: 'mm-tools' },
      h('button', { type: 'button', onclick: () => zoomBy(1.2), 'aria-label': 'Zoom in' }, '+'),
      h('button', { type: 'button', onclick: () => zoomBy(1 / 1.2), 'aria-label': 'Zoom out' }, '−'),
      h('button', { type: 'button', onclick: () => fit() }, 'Fit'),
      h('button', { type: 'button', onclick: () => setAll(true) }, 'Expand all'),
      h('button', { type: 'button', onclick: () => setAll(false) }, 'Collapse'));
    wrap.append(tools, svg, h('div', { class: 'mm-hint' }, 'Click a node to expand / collapse · drag to pan · scroll or pinch to zoom'));
    container.appendChild(wrap);

    let tx = 20, ty = 20, sc = 1;
    const apply = () => g.setAttribute('transform', `translate(${tx},${ty}) scale(${sc})`);

    function setAll(open) {
      (function walk(n) { if (n._d > 0) n._open = open; (n.c || []).forEach(walk); })(data);
      data._open = true;
      render(); fit();
    }

    function measure(n) {
      const ar = showAr() && n.a;
      const len = Math.max((n.t || '').length * 7.1, ar ? n.a.length * 6.6 : 0);
      n._w = Math.min(Math.max(len + 28, 60), 300);
      n._lines = wrapText(n.t, 38);
      n._h = 14 + n._lines.length * 17 + (ar ? 17 : 0);
      if (n._d === 0) { n._w += 16; n._h += 8; }
    }
    function wrapText(t, max) {
      const words = String(t).split(' '), lines = [];
      let cur = '';
      words.forEach((w) => { if ((cur + ' ' + w).trim().length > max) { if (cur) lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
      if (cur) lines.push(cur);
      return lines;
    }

    function layout() {
      const colW = [];
      (function m(n) { measure(n); colW[n._d] = Math.max(colW[n._d] || 0, n._w); if (n._open) (n.c || []).forEach(m); })(data);
      const colX = [0];
      for (let i = 1; i < colW.length; i++) colX[i] = colX[i - 1] + colW[i - 1] + 56;
      let y = 0;
      (function place(n) {
        n._x = colX[n._d];
        const kids = n._open ? n.c || [] : [];
        if (!kids.length) { n._y = y + n._h / 2; y += n._h + 12; return; }
        kids.forEach(place);
        n._y = (kids[0]._y + kids[kids.length - 1]._y) / 2;
      })(data);
    }

    function render() {
      layout();
      while (g.firstChild) g.removeChild(g.firstChild);
      const links = S('g', {}), nodes = S('g', {});
      g.append(links, nodes);
      (function draw(n) {
        const col = cssVar(BR[n._b] || '--accent');
        const kids = n._open ? n.c || [] : [];
        kids.forEach((k) => {
          const x1 = n._x + n._w, y1 = n._y, x2 = k._x, y2 = k._y, mx = (x1 + x2) / 2;
          const p = S('path', { d: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`, class: 'mm-link' });
          p.style.stroke = cssVar(BR[k._b]);
          p.style.strokeOpacity = '.55';
          links.appendChild(p);
          draw(k);
        });
        const has = (n.c || []).length > 0;
        const node = S('g', { class: 'mm-node' + (has ? ' clickable' : ''), transform: `translate(${n._x},${n._y - n._h / 2})`, tabindex: has ? 0 : -1 });
        const rect = S('rect', { width: n._w, height: n._h, rx: n._d === 0 ? 12 : 9 });
        if (n._d === 0) { rect.style.fill = cssVar('--ink'); rect.style.stroke = cssVar('--ink'); }
        else { rect.style.fill = n._d === 1 ? `color-mix(in srgb, ${col} 16%, ${cssVar('--surface')})` : cssVar('--surface'); rect.style.stroke = col; }
        node.appendChild(rect);
        n._lines.forEach((ln, i) => {
          const t = S('text', { x: 12, y: 21 + i * 17 + (n._d === 0 ? 3 : 0) });
          t.textContent = ln;
          if (n._d === 0) { t.style.fill = cssVar('--surface'); t.style.fontWeight = '700'; t.style.fontSize = '14.5px'; }
          else if (n._d === 1) t.style.fontWeight = '600';
          node.appendChild(t);
        });
        if (showAr() && n.a) {
          const t = S('text', { x: n._w - 12, y: 21 + n._lines.length * 17 + (n._d === 0 ? 3 : 0), class: 'mm-ar', 'text-anchor': 'end', direction: 'rtl' });
          t.textContent = n.a;
          if (n._d === 0) t.style.fill = cssVar('--surface');
          node.appendChild(t);
        }
        if (has) {
          const c = S('circle', { cx: n._w, cy: n._h / 2, r: 8 });
          c.style.fill = cssVar('--surface'); c.style.stroke = col;
          const t = S('text', { x: n._w, y: n._h / 2 + 4, 'text-anchor': 'middle', class: 'mm-tog' });
          t.textContent = n._open ? '−' : '+';
          node.append(c, t);
          const toggle = (e) => { e.stopPropagation(); n._open = !n._open; render(); };
          node.addEventListener('click', toggle);
          node.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e); } });
        }
        nodes.appendChild(node);
      })(data);
      apply();
    }

    function fit() {
      const bb = g.getBBox(), W = svg.clientWidth || 800, H = svg.clientHeight || 500;
      sc = Math.min(1.2, Math.max(0.6, Math.min((W - 40) / (bb.width || 1), (H - 60) / (bb.height || 1))));
      tx = bb.width * sc < W ? (W - bb.width * sc) / 2 - bb.x * sc : 20 - bb.x * sc;
      ty = bb.height * sc < H - 40 ? (H - bb.height * sc) / 2 - bb.y * sc : 50 - bb.y * sc;
      apply();
    }
    function zoomBy(f, cx, cy) {
      const W = svg.clientWidth, H = svg.clientHeight;
      cx = cx == null ? W / 2 : cx; cy = cy == null ? H / 2 : cy;
      const ns = Math.min(3, Math.max(0.2, sc * f));
      tx = cx - ((cx - tx) * ns) / sc; ty = cy - ((cy - ty) * ns) / sc; sc = ns;
      apply();
    }
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    const ptrs = new Map();
    let last = null, pinch = null;
    svg.addEventListener('pointerdown', (e) => {
      if (e.target.closest && e.target.closest('.mm-node.clickable')) return;
      svg.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      last = [e.clientX, e.clientY];
      svg.classList.add('grabbing');
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); }
    });
    svg.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptrs.size === 2 && pinch) {
        const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), r = svg.getBoundingClientRect();
        zoomBy(d / pinch, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top);
        pinch = d;
        return;
      }
      tx += e.clientX - last[0]; ty += e.clientY - last[1]; last = [e.clientX, e.clientY];
      apply();
    });
    const up = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) svg.classList.remove('grabbing'); else last = [...ptrs.values()][0]; };
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', up);

    render();
    requestAnimationFrame(fit);
    return { render, fit };
  };
})();
