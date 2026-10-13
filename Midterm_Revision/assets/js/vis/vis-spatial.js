/* Visuals for Lecture 5: spatial filtering. */
(function () {
  'use strict';
  const V = (window.VIS = window.VIS || {});
  const tag = (t, stat) => h('div', { class: 'vis-tag' + (stat ? ' static' : '') }, t || (stat ? 'Figure' : 'Interactive'));
  const plotBox = (cv, cap) => h('figure', { class: 'panel' }, h('div', { class: 'plot-box' }, cv), cap ? h('figcaption', { html: cap }) : null);
  const kernelHtml = (k, dec) => {
    const n = k.length;
    return `<div class="kgrid" style="grid-template-columns:repeat(${k[0].length},auto)">${k.flat().map((v) => `<span>${typeof v === 'number' ? +v.toFixed(dec == null ? 3 : dec) : v}</span>`).join('')}</div>` + (n ? '' : '');
  };

  V['ch5-freq-patterns'] = function (el) {
    el.append(tag('Low vs high frequency', true));
    const n = 256;
    const low = new IP.Gray(n, n), high = new IP.Gray(n, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      low.d[y * n + x] = 128 + 100 * Math.sin((x / n) * Math.PI * 1.5) * Math.cos((y / n) * Math.PI);
      high.d[y * n + x] = ((Math.floor(x / 6) + Math.floor(y / 6)) % 2) * 200 + 25;
    }
    const p1 = UI.panel('<b>Low frequency</b>: brightness changes slowly'), p2 = UI.panel('<b>High frequency</b>: brightness changes quickly');
    IP.show(low, p1.canvas); IP.show(high, p2.canvas);
    const c1 = h('canvas', { class: 'plot' }), c2 = h('canvas', { class: 'plot' });
    UI.plot.signal(c1, [{ data: Array.from(low.d.slice(128 * n, 129 * n)) }], { ymin: 0, ymax: 255, yticks: [0, 255], W: 300, H: 110 });
    UI.plot.signal(c2, [{ data: Array.from(high.d.slice(128 * n, 129 * n)), mode: 'step' }], { ymin: 0, ymax: 255, yticks: [0, 255], W: 300, H: 110 });
    el.append(h('div', { class: 'panels n2' }, h('div', {}, p1.el, h('div', { class: 'plot-box' }, c1)), h('div', {}, p2.el, h('div', { class: 'plot-box' }, c2))));
  };

  // The star demo: step a kernel over the padded 6×6 example from slide 16.
  V['ch5-conv-stepper'] = function (el) {
    el.append(tag('Interactive · click any output cell'));
    const IMG = [[3, 3, 4, 4, 7, 0], [9, 7, 6, 5, 8, 2], [6, 5, 5, 6, 9, 2], [7, 1, 3, 2, 7, 8], [0, 3, 7, 1, 8, 3], [4, 0, 4, 3, 2, 2]];
    const KS = {
      slide: { name: 'Slide kernel [1 0 −1]', k: [[1, 0, -1], [1, 0, -1], [1, 0, -1]] },
      box: { name: 'Box (sum of 1s)', k: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] },
      lap: { name: 'Laplacian', k: IP.K.lap4 },
      sobel: { name: 'Sobel Gx', k: IP.K.sobelX },
      ramp: { name: 'Asymmetric 1…9', k: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] },
    };
    let key = 'slide', mode = 'corr', cur = [0, 0];
    const inBox = h('div'), kBox = h('div'), outBox = h('div'), calc = h('div', { class: 'readout' });
    const N = 6;
    const pad = (i, j) => (i < 0 || j < 0 || i >= N || j >= N ? 0 : IMG[i][j]);
    const kEff = () => { const k = KS[key].k; return mode === 'corr' ? k : k.slice().reverse().map((r) => r.slice().reverse()); };
    const valAt = (i, j) => { const k = kEff(); let s = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) s += k[a + 1][b + 1] * pad(i + a, j + b); return s; };
    const draw = () => {
      const [ci, cj] = cur, k = kEff();
      let s = '<div class="grid-in" style="grid-template-columns:repeat(8,auto)">';
      for (let i = -1; i <= N; i++) for (let j = -1; j <= N; j++) {
        const inWin = Math.abs(i - ci) <= 1 && Math.abs(j - cj) <= 1;
        const isPad = i < 0 || j < 0 || i >= N || j >= N;
        s += `<span class="${isPad ? 'pad' : ''} ${inWin ? (i === ci && j === cj ? 'ctr' : 'win') : ''}">${pad(i, j)}</span>`;
      }
      inBox.innerHTML = '<div class="ctl-label" style="margin-bottom:6px">Input 6×6 + zero padding → 8×8</div>' + s + '</div>';
      kBox.innerHTML = `<div class="ctl-label" style="margin-bottom:6px">${mode === 'corr' ? 'Kernel w (as given)' : 'Kernel rotated 180°'}</div>` + kernelHtml(k, 0);
      let o = '<div class="grid-in" style="grid-template-columns:repeat(6,auto)">';
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) o += `<span class="out ${i === ci && j === cj ? 'cur' : 'done'}" data-i="${i}" data-j="${j}">${valAt(i, j)}</span>`;
      outBox.innerHTML = `<div class="ctl-label" style="margin-bottom:6px">Output 6×6 (${mode === 'corr' ? 'correlation' : 'convolution'})</div>` + o + '</div>';
      outBox.querySelectorAll('.out').forEach((sp) => sp.addEventListener('click', () => { cur = [+sp.dataset.i, +sp.dataset.j]; draw(); }));
      const terms = [];
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const kv = k[a + 1][b + 1]; if (kv !== 0) terms.push(`(${kv})(${pad(ci + a, cj + b)})`); }
      calc.innerHTML = `g(${ci},${cj}) = Σ w·f = ${terms.join(' + ')} = <b>${valAt(ci, cj)}</b>`;
    };
    const next = () => { let [i, j] = cur; j++; if (j >= N) { j = 0; i = (i + 1) % N; } cur = [i, j]; draw(); };
    let timer = null;
    const play = h('button', { class: 'btn small', type: 'button' }, '▶ Play');
    play.onclick = () => { if (timer) { clearInterval(timer); timer = null; play.textContent = '▶ Play'; } else { timer = setInterval(() => { if (!el.isConnected) { clearInterval(timer); return; } next(); }, 700); play.textContent = '❚❚ Pause'; } };
    el.append(UI.controls(UI.select('Kernel', Object.entries(KS).map(([k, v]) => [k, v.name]), key, (v) => { key = v; draw(); }), UI.seg('Operation', [['corr', 'Correlation'], ['conv', 'Convolution']], mode, (v) => { mode = v; draw(); }),
      h('button', { class: 'btn small', type: 'button', onclick: next }, 'Next position →'), play),
      h('div', { class: 'stepper' }, inBox, h('div', {}, kBox, h('div', { style: { height: '14px' } }), outBox)), calc);
    draw();
  };

  V['ch5-corr-conv'] = function (el) {
    el.append(tag('Slide 11 — computed live'));
    const P = [[244, 255, 246], [255, 240, 183], [255, 250, 12]], W = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    const Wr = W.slice().reverse().map((r) => r.slice().reverse());
    const prod = (A, B) => A.map((r, i) => r.map((v, j) => v * B[i][j]));
    const sum = (A) => A.flat().reduce((a, b) => a + b, 0);
    el.insertAdjacentHTML('beforeend', `<h3 style="margin:4px 0 6px">Correlation</h3>${matRow([mat(P, { label: 'image patch' }), '×', mat(W, { label: 'filter w' }), '=', mat(prod(P, W), { label: 'products' }), '→', `<b style="font-size:20px">Σ = ${sum(prod(P, W))}</b>`])}
      <h3 style="margin:14px 0 6px">Convolution</h3>${matRow([mat(P, { label: 'image patch' }), '×', mat(Wr, { label: 'w rotated 180°' }), '=', mat(prod(P, Wr), { label: 'products' }), '→', `<b style="font-size:20px">Σ = ${sum(prod(P, Wr))}</b>`])}`);
  };

  V['ch5-smooth'] = function (el) {
    el.append(tag());
    let src = UI.get('pattern'), type = 'box', n = 5, sigma = 1.5, noisy = false;
    const cmp = UI.compare('Original', 'Smoothed');
    const kb = h('div', { class: 'readout' });
    const draw = () => {
      let base = src;
      if (noisy) base = IP.addNoise(src, 'gaussian', { sigma: 25 }, 3);
      const k = type === 'box' ? IP.kernel.box(n) : IP.kernel.gaussian(n, sigma);
      const out = IP.filter(base, k);
      IP.show(base, cmp.a); IP.show(out, cmp.b);
      const rows = []; for (let i = 0; i < Math.min(n, 7); i++) { const r = []; for (let j = 0; j < Math.min(n, 7); j++) r.push(k.d[i * n + j]); rows.push(r); }
      kb.innerHTML = `${type === 'box' ? `Box kernel = (1/${n * n}) × ${n}×${n} array of 1s` : `Gaussian kernel ${n}×${n}, σ = ${sigma} (normalised to sum 1)`} — ${n > 7 ? 'top-left 7×7 shown' : 'all weights shown'}:<div style="margin-top:6px;overflow-x:auto">${kernelHtml(rows, 3)}</div>`;
    };
    el.append(UI.controls(UI.imagePicker(['pattern', 'scene', 'fruit'], 'pattern', (im) => { src = im; draw(); }),
      UI.seg('Kernel', [['box', 'Box'], ['gauss', 'Gaussian']], type, (v) => { type = v; draw(); }),
      UI.select('Size', [3, 5, 9, 15, 21].map((v) => [String(v), v + '×' + v]), String(n), (v) => { n = +v; sigma = Math.max(sigma, 0.5); draw(); }),
      UI.slider('σ (Gaussian)', 0.5, 7, 0.5, sigma, (v) => { sigma = v; draw(); }),
      UI.check('Add noise first', noisy, (v) => { noisy = v; draw(); })),
      h('div', { class: 'split wide-left' }, cmp.el, kb));
    draw();
  };

  V['ch5-box-vs-gauss'] = function (el) {
    el.append(tag('Same size, different weights', true));
    const src = IP.pattern(256);
    const p0 = UI.panel('<b>Original</b>'), p1 = UI.panel('<b>Box 11×11</b> — squarish, directional blur'), p2 = UI.panel('<b>Gaussian 21×21, σ = 3.5</b> — smooth, isotropic');
    IP.show(src, p0.canvas); IP.show(IP.filter(src, IP.kernel.box(11)), p1.canvas); IP.show(IP.filter(src, IP.kernel.gaussian(21, 3.5)), p2.canvas);
    el.append(UI.panels(p0, p1, p2));
  };

  V['ch5-derivatives'] = function (el) {
    el.append(tag());
    const presets = {
      slide: [6, 6, 6, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 6, 6, 6, 6, 6],
      point: [5, 5, 5, 5, 5, 5, 5, 5, 0, 5, 5, 5, 5, 5, 5, 5],
      line: [5, 5, 5, 5, 5, 1, 1, 5, 5, 5, 5, 5, 5],
      ramp: [0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 7, 7, 7],
    };
    let f = presets.slide.slice();
    const inp = h('input', { type: 'text', value: f.join(', '), style: { flex: 1, minWidth: '220px', height: '32px', borderRadius: '8px', border: '1px solid var(--line-2)', padding: '0 8px', background: 'var(--surface)', fontFamily: 'var(--mono)' } });
    const cv = h('canvas', { class: 'plot' }), tbl = h('div');
    const draw = () => {
      const n = f.length;
      const d1 = f.map((v, x) => (x < n - 1 ? f[x + 1] - v : null));
      const d2 = f.map((v, x) => (x > 0 && x < n - 1 ? f[x + 1] + f[x - 1] - 2 * v : null));
      const all = f.concat(d1.filter((v) => v != null), d2.filter((v) => v != null));
      UI.plot.signal(cv, [
        { data: f.map((v, i) => [i, v]), color: cssVar('--line-2'), label: 'f(x)', width: 3 },
        { data: f.map((v, i) => [i, v]), mode: 'dots', color: cssVar('--ink'), r: 3 },
        { data: d1.map((v, i) => [i, v]).filter((p) => p[1] != null), mode: 'dots', color: cssVar('--accent'), r: 4, label: '1st derivative ∂f/∂x' },
        { data: d2.map((v, i) => [i, v]).filter((p) => p[1] != null), mode: 'stem', color: cssVar('--warn'), label: '2nd derivative ∂²f/∂x²' },
      ], { ymin: Math.min(...all) - 1, ymax: Math.max(...all) + 1, xmin: 0, xmax: n - 1, xticks: Array.from({ length: n }, (_, i) => i).filter((i) => n < 22 || i % 2 === 0), yticks: [Math.min(...all), 0, Math.max(...all)], xlabel: 'x', W: 640, H: 280 });
      const cell = (v) => `<td style="text-align:center">${v == null ? '·' : v}</td>`;
      tbl.innerHTML = `<div class="tbl-wrap"><table class="tbl" style="font-family:var(--mono);font-size:13px"><tr><th>x</th>${f.map((_, i) => cell(i)).join('')}</tr><tr><th>f(x)</th>${f.map(cell).join('')}</tr><tr><th style="color:var(--accent)">1st: f(x+1)−f(x)</th>${d1.map(cell).join('')}</tr><tr><th style="color:var(--warn)">2nd: f(x+1)+f(x−1)−2f(x)</th>${d2.map(cell).join('')}</tr></table></div>`;
    };
    inp.addEventListener('change', () => { const v = inp.value.split(/[ ,;]+/).map(Number).filter((x) => !isNaN(x)); if (v.length > 2) { f = v.slice(0, 40); draw(); } });
    el.append(UI.controls(UI.select('Profile', [['slide', 'Fig. 3.44 scan line'], ['point', 'Isolated point'], ['line', 'Thin line'], ['ramp', 'Ramp']], 'slide', (v) => { f = presets[v].slice(); inp.value = f.join(', '); draw(); }), h('label', { class: 'ctl', style: { flex: 1 } }, h('span', { class: 'ctl-label' }, 'Values'), inp)),
      h('div', { class: 'plot-box' }, cv), tbl);
    draw();
  };

  V['ch5-laplacian'] = function (el) {
    el.append(tag());
    let src = UI.get('scene'), kk = 'lap4', c = 1;
    const p0 = UI.panel('<b>Original</b> f'), p1 = UI.panel('<b>∇²f</b> scaled for display (0 → mid-gray)'), cmp = UI.compare('Original', 'Sharpened');
    const info = h('div', { class: 'readout' });
    const draw = () => {
      const K = IP.K[kk];
      const lap = IP.filter(src, K);
      const sharp = IP.combine(src, lap, (a, b) => a - c * b);
      IP.show(src, p0.canvas); IP.show(lap, p1.canvas, 'center'); IP.show(src, cmp.a); IP.show(sharp, cmp.b);
      info.innerHTML = `Kernel ${kk === 'lap4' ? '(4-neighbour, isotropic for 90° rotations)' : '(8-neighbour, includes diagonals → isotropic for 45° rotations)'}: ${kernelHtml(K, 0)}<br>Centre coefficient is <b>negative</b>, so the sharpened image is g = f − ${c === 1 ? '' : c + '·'}∇²f.`;
    };
    el.append(UI.controls(UI.imagePicker(['scene', 'pattern', 'phantom', 'fruit'], 'scene', (im) => { src = im; draw(); }), UI.seg('Kernel', [['lap4', '4-neighbour (−4)'], ['lap8', '8-neighbour (−8)']], kk, (v) => { kk = v; draw(); }), UI.slider('Strength c', 0.2, 2, 0.1, c, (v) => { c = v; draw(); }, (v) => v.toFixed(1))),
      h('div', { class: 'panels n3' }, p0.el, p1.el, cmp.el), info);
    draw();
  };

  V['ch5-unsharp'] = function (el) {
    el.append(tag());
    let src = UI.get('scene'), sigma = 2, k = 1.5;
    const p1 = UI.panel('<b>Blurred</b> (Gaussian)'), p2 = UI.panel('<b>Mask</b> = original − blurred'), cmp = UI.compare('Original', 'Sharpened');
    const cv = h('canvas', { class: 'plot' });
    const draw = () => {
      const n = 2 * Math.ceil(3 * sigma) + 1;
      const blur = IP.filter(src, IP.kernel.gaussian(n, sigma));
      const mask = IP.combine(src, blur, (a, b) => a - b);
      const out = IP.combine(src, mask, (a, m) => a + k * m);
      IP.show(blur, p1.canvas); IP.show(mask, p2.canvas, 'center'); IP.show(src, cmp.a); IP.show(out, cmp.b);
      // 1-D illustration of a step edge
      const f = Array.from({ length: 60 }, (_, x) => (x < 30 ? 60 : 180));
      const g = (s) => { const r = Math.ceil(3 * s), w = []; let t = 0; for (let i = -r; i <= r; i++) { const v = Math.exp(-(i * i) / (2 * s * s)); w.push(v); t += v; } return w.map((v) => v / t); };
      const w = g(Math.max(1, sigma * 1.5)), R = (w.length - 1) / 2;
      const b = f.map((_, x) => w.reduce((acc, wv, i) => acc + wv * f[Math.min(59, Math.max(0, x + i - R))], 0));
      const m = f.map((v, x) => v - b[x]);
      UI.plot.signal(cv, [{ data: f, label: 'original', color: cssVar('--ink'), width: 2 }, { data: b, label: 'blurred', color: cssVar('--muted'), dash: [4, 3] }, { data: m.map((v) => v + 120), label: 'mask (offset +120)', color: cssVar('--violet') }, { data: f.map((v, x) => v + k * m[x]), label: 'sharpened', color: cssVar('--accent'), width: 2.5 }],
        { ymin: 0, ymax: 260, yticks: [0, 120, 255], W: 560, H: 220, xlabel: 'position across an edge' });
    };
    el.append(UI.controls(UI.imagePicker(['scene', 'pattern', 'fruit', 'phantom'], 'scene', (im) => { src = im; draw(); }), UI.slider('Blur σ', 0.5, 5, 0.5, sigma, (v) => { sigma = v; draw(); }), UI.slider('Amount k', 0, 4, 0.1, k, (v) => { k = v; draw(); }, (v) => v.toFixed(1))),
      h('div', { class: 'panels n3' }, p1.el, p2.el, cmp.el), h('div', { class: 'plot-box', style: { marginTop: '10px' } }, cv),
      h('div', { class: 'legend', html: 'The overshoot/undershoot on both sides of the edge is what makes it look sharper. k = 1: unsharp masking; k &gt; 1: high-boost filtering.' }));
    draw();
  };

  V['ch5-sobel'] = function (el) {
    el.append(tag());
    let src = UI.get('scene'), mag = 'l2', th = 0;
    const p0 = UI.panel('<b>Original</b>'), p1 = UI.panel('<b>Gx</b> (kernel [−1 −2 −1; 0 0 0; 1 2 1])'), p2 = UI.panel('<b>Gy</b> (kernel [−1 0 1; −2 0 2; −1 0 1])'), p3 = UI.panel('');
    const draw = () => {
      const gx = IP.filter(src, IP.K.sobelX), gy = IP.filter(src, IP.K.sobelY);
      let M = IP.combine(gx, gy, (a, b) => (mag === 'l2' ? Math.hypot(a, b) : Math.abs(a) + Math.abs(b)));
      if (th) { let mx = 0; M.d.forEach((v) => (mx = Math.max(mx, v))); M = M.map((v) => (v > (th / 100) * mx ? 255 : 0)); }
      IP.show(src, p0.canvas); IP.show(gx, p1.canvas, 'center'); IP.show(gy, p2.canvas, 'center'); IP.show(M, p3.canvas, th ? 'clip' : 'minmax');
      p3.setLabel(`<b>Gradient magnitude</b> ${mag === 'l2' ? '√(Gx² + Gy²)' : '|Gx| + |Gy|'}${th ? ` · thresholded at ${th}% of max` : ''}`);
    };
    el.append(UI.controls(UI.imagePicker(['scene', 'pattern', 'fruit', 'phantom'], 'scene', (im) => { src = im; draw(); }), UI.seg('Magnitude', [['l2', '√(Gx²+Gy²)'], ['l1', '|Gx|+|Gy|']], mag, (v) => { mag = v; draw(); }), UI.slider('Threshold %', 0, 60, 2, th, (v) => { th = v; draw(); })),
      UI.panels(p0, p1, p2, p3));
    draw();
  };

  V['ch5-combined'] = function (el) {
    el.append(tag('Fig. 3.57 pipeline — computed live on a dark scan-like image', true));
    const a = IP.phantom(256).map((v) => v * 0.7);
    const b = IP.filter(a, IP.K.lap8);
    const c = IP.combine(a, b, (x, y) => x - y);
    const gx = IP.filter(a, IP.K.sobelX), gy = IP.filter(a, IP.K.sobelY);
    const d = IP.combine(gx, gy, (x, y) => Math.abs(x) + Math.abs(y));
    const e = IP.filter(d, IP.kernel.box(5));
    let em = 0; e.d.forEach((v) => (em = Math.max(em, v)));
    const f = IP.combine(c, e, (x, y) => Math.max(0, x) * (y / em));
    const g0 = IP.combine(a, f, (x, y) => x + y);
    let gm = 0; g0.d.forEach((v) => (gm = Math.max(gm, v)));
    const g = g0.map((v) => (255 * v) / gm);
    const hh = g.map((v) => 255 * Math.pow(Math.max(0, v) / 255, 0.5));
    const items = [[a, '(a) original', 'clip'], [b, '(b) Laplacian of (a)', 'center'], [c, '(c) sharpened: (a) − (b)', 'clip'], [d, '(d) Sobel gradient of (a)', 'minmax'], [e, '(e) (d) smoothed with 5×5 box', 'minmax'], [f, '(f) mask = product of (c) and normalised (e)', 'minmax'], [g, '(g) sharpened: (a) + (f), rescaled', 'clip'], [hh, '(h) power-law (γ = 0.5) of (g)', 'clip']];
    const ps = items.map(([im, lab, mode]) => { const p = UI.panel(`<b>${lab}</b>`); IP.show(im, p.canvas, mode); return p; });
    el.append(UI.panels(...ps));
  };
})();
