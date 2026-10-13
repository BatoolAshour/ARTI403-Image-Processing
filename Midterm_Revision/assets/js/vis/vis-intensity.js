/* Visuals for Lecture 4: intensity transformations & histogram processing. */
(function () {
  'use strict';
  const V = (window.VIS = window.VIS || {});
  const tag = (t, stat) => h('div', { class: 'vis-tag' + (stat ? ' static' : '') }, t || (stat ? 'Figure' : 'Interactive'));
  const plotBox = (cv, cap) => h('figure', { class: 'panel' }, h('div', { class: 'plot-box' }, cv), cap ? h('figcaption', { html: cap }) : null);

  // Transformation functions on [0,255]
  const T = {
    identity: () => (r) => r,
    negative: () => (r) => 255 - r,
    log: (p) => (r) => p.lc * Math.log(1 + r),
    invlog: () => (r) => 255 * (Math.pow(10, (r / 255) * Math.log10(256)) - 1) / 255,
    gamma: (p) => (r) => 255 * Math.pow(r / 255, p.g),
    stretch: (p) => (r) => {
      const { r1, s1, r2, s2 } = p;
      if (r <= r1) return r1 === 0 ? s1 : (s1 / r1) * r;
      if (r <= r2) return r2 === r1 ? s2 : s1 + ((s2 - s1) / (r2 - r1)) * (r - r1);
      return r2 === 255 ? s2 : s2 + ((255 - s2) / (255 - r2)) * (r - r2);
    },
    threshold: (p) => (r) => (r > p.t ? 255 : 0),
  };
  V.T = T;

  V['ch4-curves'] = function (el) {
    el.append(tag('Figure 3.3 · basic transformation functions', true));
    const cv = h('canvas', { class: 'plot' });
    const C = UI.plot.colors();
    UI.plot.curve(cv, [
      { f: T.negative(), color: C.bad, label: 'Negative', lx: 40, ly: 205 },
      { f: T.identity(), color: C.muted, label: 'Identity', dash: [5, 4], lx: 168, ly: 182 },
      { f: (r) => 255 * Math.log(1 + r) / Math.log(256), color: C.accent, label: 'Log', lx: 40, ly: 175 },
      { f: (r) => 255 * Math.pow(r / 255, 1 / 3), color: C.good, label: 'nth root', lx: 60, ly: 140 },
      { f: (r) => 255 * Math.pow(r / 255, 3), color: C.warn, label: 'nth power', lx: 200, ly: 80 },
      { f: T.invlog(), color: C.violet || '#7c3aed', label: 'Inverse log', lx: 205, ly: 30 },
    ], { W: 520, H: 360, xlabel: 'Input intensity r', ylabel: 'Output intensity s' });
    el.append(h('div', { class: 'plot-box', style: { maxWidth: '560px', margin: '0 auto' } }, cv));
  };

  // Main explorer: curve + before/after + histograms
  V['ch4-explorer'] = function (el, opt) {
    opt = opt || {};
    el.append(tag());
    let src = UI.get(opt.src || 'dark'), kind = opt.kind || 'gamma';
    const p = { lc: 46, g: 0.5, r1: 80, s1: 30, r2: 170, s2: 225, t: 128 };
    const cmp = UI.compare('Original', 'Transformed');
    const curve = h('canvas', { class: 'plot' }), h1 = h('canvas', { class: 'plot' }), h2 = h('canvas', { class: 'plot' });
    const ctl = h('div', { class: 'controls' });
    const info = h('div', { class: 'readout' });
    const fn = () => T[kind](p);
    const draw = () => {
      const f = fn();
      const lut = new Float32Array(256); for (let r = 0; r < 256; r++) lut[r] = Math.max(0, Math.min(255, f(r)));
      const out = src.map((v) => lut[Math.round(Math.max(0, Math.min(255, v)))]);
      IP.show(src, cmp.a); IP.show(out, cmp.b);
      const pts = kind === 'stretch' ? [[p.r1, p.s1, '(r₁,s₁)'], [p.r2, p.s2, '(r₂,s₂)']] : [];
      UI.plot.curve(curve, [{ f: (r) => lut[Math.round(r)] }, { f: (r) => r, dash: [4, 4], width: 1 }], { points: pts, W: 300, H: 250 });
      UI.plot.hist(h1, IP.hist(src), { title: 'before', H: 140 });
      UI.plot.hist(h2, IP.hist(out), { title: 'after', H: 140, color: cssVar('--accent') });
      const eq = {
        negative: 's = L − 1 − r = 255 − r',
        log: `s = c·ln(1 + r), c = ${p.lc}${p.lc === 46 ? ' ≈ 255 / ln 256, so r = 255 maps to 255' : ''}`,
        gamma: `s = 255·(r/255)^γ (c = 1): γ = ${p.g} ${p.g < 1 ? '→ brightens (stretches dark levels)' : p.g > 1 ? '→ darkens (compresses dark levels)' : '→ identity'}`,
        stretch: `3 segments through (0,0), (${p.r1},${p.s1}), (${p.r2},${p.s2}), (255,255) — slopes ${(p.s1 / Math.max(1, p.r1)).toFixed(2)}, ${((p.s2 - p.s1) / Math.max(1, p.r2 - p.r1)).toFixed(2)}, ${((255 - p.s2) / Math.max(1, 255 - p.r2)).toFixed(2)}`,
        threshold: `s = 1 (white) if r > ${p.t}, else 0 (black)`,
      }[kind];
      info.innerHTML = `<b>${eq}</b>`;
    };
    const setCtl = () => {
      ctl.innerHTML = '';
      ctl.append(UI.imagePicker(['dark', 'low', 'bright', 'scene', 'pattern', 'phantom'], opt.src || 'dark', (im) => { src = im; draw(); }),
        UI.select('Transformation', [['negative', 'Image negative'], ['log', 'Log transform'], ['gamma', 'Power-law (gamma)'], ['stretch', 'Contrast stretching'], ['threshold', 'Thresholding']], kind, (v) => { kind = v; setCtl(); draw(); }));
      if (kind === 'log') ctl.append(UI.slider('c', 10, 80, 1, p.lc, (v) => { p.lc = v; draw(); }));
      if (kind === 'gamma') ctl.append(UI.slider('γ', 0.1, 5, 0.05, p.g, (v) => { p.g = v; draw(); }, (v) => v.toFixed(2)));
      if (kind === 'stretch') ctl.append(UI.slider('r₁', 0, 254, 1, p.r1, (v) => { p.r1 = Math.min(v, p.r2); draw(); }), UI.slider('s₁', 0, 255, 1, p.s1, (v) => { p.s1 = v; draw(); }), UI.slider('r₂', 1, 255, 1, p.r2, (v) => { p.r2 = Math.max(v, p.r1); draw(); }), UI.slider('s₂', 0, 255, 1, p.s2, (v) => { p.s2 = v; draw(); }));
      if (kind === 'threshold') ctl.append(UI.slider('Threshold', 0, 255, 1, p.t, (v) => { p.t = v; draw(); }));
    };
    setCtl();
    el.append(ctl, h('div', { class: 'split' }, cmp.el, h('div', {}, plotBox(curve, 'Transformation s = T(r) (dashed: identity)'), h('div', { class: 'panels n2', style: { marginTop: '8px' } }, plotBox(h1), plotBox(h2)))), info);
    draw();
  };
  V['ch4-negative'] = (el) => V['ch4-explorer'](el, { kind: 'negative', src: 'phantom' });
  V['ch4-log'] = (el) => V['ch4-explorer'](el, { kind: 'log', src: 'dark' });
  V['ch4-gamma'] = (el) => V['ch4-explorer'](el, { kind: 'gamma', src: 'dark' });
  V['ch4-stretch'] = (el) => V['ch4-explorer'](el, { kind: 'stretch', src: 'low' });
  V['ch4-threshold'] = (el) => V['ch4-explorer'](el, { kind: 'threshold', src: 'pattern' });

  V['ch4-log-fourier'] = function (el) {
    el.append(tag('Why log? A Fourier spectrum', true));
    const F = IP.dft(IP.scene(256));
    const mag = IP.shift(IP.magnitude(F));
    const p1 = UI.panel('<b>|F(u,v)|</b> scaled linearly — only the centre is visible'), p2 = UI.panel('<b>c·log(1 + |F(u,v)|)</b> — hidden detail appears');
    IP.show(mag, p1.canvas, 'minmax'); IP.show(IP.logSpec(mag), p2.canvas, 'minmax');
    let mx = 0; mag.d.forEach((v) => { mx = Math.max(mx, v); });
    el.append(UI.panels(p1, p2), h('div', { class: 'readout', html: `Values range from ≈0 to ${mx.toExponential(2)} — far more than 256 display levels. The log compresses the huge values and stretches the small ones.` }));
  };

  V['ch4-gamma-strip'] = function (el) {
    el.append(tag('Like slide 16', true));
    const dark = UI.get('dark'), bright = UI.get('bright');
    const row1 = [['Original (dark)', 1], ['γ = 0.6', 0.6], ['γ = 0.4', 0.4], ['γ = 0.3', 0.3]].map(([l, g]) => { const p = UI.panel(`<b>${l}</b>`); IP.show(dark.map((v) => 255 * Math.pow(v / 255, g)), p.canvas); return p; });
    const row2 = [['Original (washed-out)', 1], ['γ = 3', 3], ['γ = 4', 4], ['γ = 5', 5]].map(([l, g]) => { const p = UI.panel(`<b>${l}</b>`); IP.show(bright.map((v) => 255 * Math.pow(v / 255, g)), p.canvas); return p; });
    el.append(UI.panels(...row1), h('div', { style: { height: '10px' } }), UI.panels(...row2));
  };

  // Gamma family of curves
  V['ch4-gamma-family'] = function (el) {
    el.append(tag('Curves s = c·r^γ (c = 1)', true));
    const cv = h('canvas', { class: 'plot' });
    const gs = [0.04, 0.1, 0.2, 0.4, 0.67, 1, 1.5, 2.5, 5, 10, 25];
    const C = UI.plot.colors();
    UI.plot.curve(cv, gs.map((g) => ({ f: (r) => 255 * Math.pow(r / 255, g), color: g < 1 ? C.accent : g > 1 ? C.warn : C.muted, width: g === 1 ? 2.5 : 1.6, label: 'γ=' + g, lx: g < 1 ? 20 + g * 60 : 200, ly: g < 1 ? 255 * Math.pow((20 + g * 60) / 255, g) + 4 : 255 * Math.pow(200 / 255, g) })), { W: 520, H: 380 });
    el.append(h('div', { class: 'plot-box', style: { maxWidth: '560px', margin: '0 auto' } }, cv), h('div', { class: 'legend', html: '<span><i style="background:var(--accent)"></i>γ &lt; 1: brightens (expands dark values)</span><span><i style="background:var(--warn)"></i>γ &gt; 1: darkens (compresses dark values)</span>' }));
  };

  // Interactive worked example: contrast stretching on a 0..7 image
  V['ch4-stretch-example'] = function (el) {
    el.append(tag('Interactive worked example'));
    const img = [[4, 3, 5, 2], [3, 6, 4, 6], [2, 2, 6, 5], [7, 6, 4, 1]];
    const p = { r1: 3, s1: 2, r2: 5, s2: 6 };
    const out = h('div');
    const cv = h('canvas', { class: 'plot' });
    const draw = () => {
      const L = 7;
      const f = (r) => r <= p.r1 ? (p.r1 ? (p.s1 / p.r1) * r : p.s1) : r <= p.r2 ? p.s1 + ((p.s2 - p.s1) / Math.max(1e-9, p.r2 - p.r1)) * (r - p.r1) : p.s2 + ((L - p.s2) / Math.max(1e-9, L - p.r2)) * (r - p.r2);
      const map = Array.from({ length: 8 }, (_, r) => Math.min(7, Math.floor(f(r) + 0.5)));
      const a = p.r1 ? p.s1 / p.r1 : 0, b = (p.s2 - p.s1) / Math.max(1e-9, p.r2 - p.r1), g = (L - p.s2) / Math.max(1e-9, L - p.r2);
      UI.plot.curve(cv, [{ f }, { f: (r) => r, dash: [4, 4], width: 1 }], { xmin: 0, xmax: 7, ymin: 0, ymax: 7, xticks: [0, 1, 2, 3, 4, 5, 6, 7], yticks: [0, 1, 2, 3, 4, 5, 6, 7], points: [[p.r1, p.s1, `(${p.r1},${p.s1})`], [p.r2, p.s2, `(${p.r2},${p.s2})`]], W: 300, H: 260 });
      out.innerHTML = `<div class="readout">Slopes: α = s₁/r₁ = ${p.s1}/${p.r1} = <b>${a.toFixed(2)}</b> · β = (s₂−s₁)/(r₂−r₁) = <b>${b.toFixed(2)}</b> · γ = (7−s₂)/(7−r₂) = <b>${g.toFixed(2)}</b><br>
        S(r) = ${a.toFixed(2)}·r for 0 ≤ r ≤ ${p.r1}; &nbsp; ${b.toFixed(2)}(r − ${p.r1}) + ${p.s1} for ${p.r1} &lt; r ≤ ${p.r2}; &nbsp; ${g.toFixed(2)}(r − ${p.r2}) + ${p.s2} for ${p.r2} &lt; r ≤ 7</div>
        <div class="tbl-wrap"><table class="tbl"><tr><th>r</th>${map.map((_, r) => `<td>${r}</td>`).join('')}</tr><tr><th>S(r) exact</th>${map.map((_, r) => `<td>${f(r).toFixed(2)}</td>`).join('')}</tr><tr><th>rounded s</th>${map.map((v) => `<td><b>${v}</b></td>`).join('')}</tr></table></div>
        ${matRow([mat(img, { shade: true, max: 7, label: 'Input image' }), '→', mat(img.map((r) => r.map((v) => map[v])), { shade: true, max: 7, label: 'Output image' })])}`;
    };
    el.append(UI.controls(UI.slider('r₁', 0, 7, 1, p.r1, (v) => { p.r1 = v; draw(); }), UI.slider('s₁', 0, 7, 1, p.s1, (v) => { p.s1 = v; draw(); }), UI.slider('r₂', 0, 7, 1, p.r2, (v) => { p.r2 = v; draw(); }), UI.slider('s₂', 0, 7, 1, p.s2, (v) => { p.s2 = v; draw(); })),
      h('div', { class: 'split' }, h('div', { class: 'plot-box' }, cv), out));
    draw();
  };

  V['ch4-threshold-example'] = function (el) {
    el.append(tag('Interactive worked example'));
    const f = [[45, 120, 200], [30, 150, 90], [210, 60, 180]];
    const out = h('div');
    const draw = (T0) => { out.innerHTML = matRow([mat(f, { shade: true, max: 255, label: 'f(x,y)' }), '→', mat(f.map((r) => r.map((v) => (v > T0 ? 1 : 0))), { shade: true, max: 1, label: `g(x,y), T = ${T0}` })]) + `<div class="readout">g = 1 if f &gt; ${T0}, otherwise 0 — note that a pixel <b>equal</b> to T goes to 0.</div>`; };
    el.append(UI.controls(UI.slider('T', 0, 255, 5, 100, draw)), out);
    draw(100);
  };

  V['ch4-power-example'] = function (el) {
    el.append(tag('Slide 17–18 example'));
    const img = [[16, 16, 64, 64], [4, 16, 16, 4], [4, 16, 16, 4], [100, 81, 81, 100]];
    const outI = img.map((r) => r.map((v) => Math.sqrt(v)));
    const cv = h('canvas', { class: 'plot' });
    const hist = new Array(11).fill(0); outI.flat().forEach((v) => hist[v]++);
    UI.plot.hist(cv, hist, { normalized: false, xlabel: 'output intensity s', W: 420, H: 200 });
    el.append(h('div', { html: matRow([mat(img, { label: 'Input image r' }), '→ s = 1·r^{1/2} →', mat(outI, { label: 'Output image s' })]) }),
      h('div', { class: 'plot-box', style: { maxWidth: '460px' } }, cv),
      h('div', { class: 'readout', html: 'Histogram of the output: h(2) = 4, h(4) = 6, h(8) = 2, h(9) = 2, h(10) = 2 (total 16 pixels). All other bins are 0.' }));
  };

  V['ch4-hist-types'] = function (el) {
    el.append(tag('Like Figure 3.16', true));
    const im = { dark: UI.get('dark'), light: UI.get('bright'), low: UI.get('low'), high: IP.equalize(IP.scene(256)).out };
    const cols = [['dark', 'Dark image'], ['light', 'Light image'], ['low', 'Low-contrast image'], ['high', 'High-contrast image']].map(([k, l]) => {
      const p = UI.panel(`<b>${l}</b>`); IP.show(im[k], p.canvas);
      const cv = h('canvas', { class: 'plot' }); UI.plot.hist(cv, IP.hist(im[k]), { W: 260, H: 150, xlabel: 'r_k' });
      return h('div', {}, p.el, h('div', { class: 'plot-box', style: { marginTop: '6px' } }, cv));
    });
    el.append(h('div', { class: 'panels n4' }, ...cols));
  };

  V['ch4-hist-example'] = function (el) {
    el.append(tag('Slides 32–33 example — counted live'));
    const img = [[0, 1, 2, 1], [2, 3, 0, 2], [1, 2, 3, 3], [0, 1, 2, 3]];
    const counts = [0, 0, 0, 0]; img.flat().forEach((v) => counts[v]++);
    const cv1 = h('canvas', { class: 'plot' }), cv2 = h('canvas', { class: 'plot' });
    UI.plot.hist(cv1, counts, { normalized: false, W: 300, H: 180, xlabel: 'r_k' });
    UI.plot.hist(cv2, counts, { normalized: true, W: 300, H: 180, xlabel: 'r_k', color: cssVar('--accent') });
    el.append(h('div', { class: 'split' },
      h('div', { html: mat(img, { shade: true, max: 3, label: '4×4 image, L = 4' }) + `<div class="tbl-wrap"><table class="tbl"><tr><th>r_k</th><th>h(r_k) = n_k</th><th>p(r_k) = n_k / 16</th></tr>${counts.map((c, k) => `<tr><td>${k}</td><td>${c}</td><td>${c}/16 = ${(c / 16).toFixed(4)}</td></tr>`).join('')}<tr><td><b>Σ</b></td><td><b>16</b></td><td><b>1.0000</b></td></tr></table></div>` }),
      h('div', {}, plotBox(cv1, 'Unnormalized histogram h(r<sub>k</sub>)'), plotBox(cv2, 'Normalized histogram p(r<sub>k</sub>)'))));
  };

  V['ch4-equalize'] = function (el) {
    el.append(tag());
    let src = UI.get('dark');
    const cmp = UI.compare('Original', 'Equalized');
    const h1 = h('canvas', { class: 'plot' }), h2 = h('canvas', { class: 'plot' }), tf = h('canvas', { class: 'plot' });
    const draw = () => {
      const { out, map } = IP.equalize(src);
      IP.show(src, cmp.a); IP.show(out, cmp.b);
      UI.plot.hist(h1, IP.hist(src), { title: 'original + CDF', cdf: true, H: 150 });
      UI.plot.hist(h2, IP.hist(out), { title: 'equalized + CDF', cdf: true, H: 150, color: cssVar('--accent') });
      UI.plot.curve(tf, [{ f: (r) => map[Math.round(r)] }, { f: (r) => r, dash: [4, 4], width: 1 }], { W: 300, H: 230, xlabel: 'r', ylabel: 's = T(r)' });
    };
    el.append(UI.controls(UI.imagePicker(['dark', 'low', 'bright', 'scene', 'phantom'], 'dark', (im) => { src = im; draw(); })),
      h('div', { class: 'split' }, cmp.el, h('div', {}, plotBox(tf, 'Mapping s<sub>k</sub> = (L−1)·CDF(r<sub>k</sub>) — it <i>is</i> the scaled CDF'), h('div', { class: 'panels n2', style: { marginTop: '8px' } }, plotBox(h1), plotBox(h2)))));
    draw();
  };

  V['ch4-matching'] = function (el) {
    el.append(tag());
    let src = UI.get('dark'), shape = 'template', mu = 150;
    const pIn = UI.panel('<b>Input</b>'), pT = UI.panel('<b>Template</b>'), pOut = UI.panel('<b>Output (matched)</b>');
    const cdfCv = h('canvas', { class: 'plot' });
    const draw = () => {
      let target, tmpl = null;
      if (shape === 'template') { tmpl = IP.scene(256); target = IP.hist(tmpl); }
      else {
        target = new Float64Array(256);
        for (let k = 0; k < 256; k++) target[k] = shape === 'gauss' ? Math.exp(-((k - mu) ** 2) / (2 * 30 * 30)) : shape === 'bimodal' ? Math.exp(-((k - 60) ** 2) / 400) + Math.exp(-((k - 200) ** 2) / 400) : 1;
      }
      const { out, srcCdf, tgtCdf } = IP.matchHist(src, target);
      IP.show(src, pIn.canvas); IP.show(out, pOut.canvas);
      if (tmpl) { IP.show(tmpl, pT.canvas); pT.el.style.display = ''; } else pT.el.style.display = 'none';
      const oc = IP.equalize(out).cdf;
      UI.plot.signal(cdfCv, [{ data: Array.from(srcCdf), label: 'input CDF', color: cssVar('--bad') }, { data: Array.from(tgtCdf), label: 'template CDF', color: cssVar('--accent') }, { data: Array.from(oc), label: 'output CDF', color: cssVar('--good'), dash: [5, 3] }],
        { ymin: 0, ymax: 1.02, xticks: [0, 64, 128, 192, 255], yticks: [0, 0.5, 1], xlabel: 'intensity', W: 520, H: 220 });
    };
    el.append(UI.controls(UI.imagePicker(['dark', 'low', 'bright', 'phantom'], 'dark', (im) => { src = im; draw(); }),
      UI.select('Target histogram', [['template', 'Template image (landscape)'], ['gauss', 'Gaussian peak'], ['bimodal', 'Bimodal'], ['flat', 'Flat (= equalization)']], shape, (v) => { shape = v; draw(); }),
      UI.slider('Gaussian centre', 30, 230, 5, mu, (v) => { mu = v; if (shape === 'gauss') draw(); })),
      h('div', { class: 'panels n3' }, pIn.el, pT.el, pOut.el), h('div', { class: 'plot-box', style: { marginTop: '10px' } }, cdfCv));
    draw();
  };
})();
