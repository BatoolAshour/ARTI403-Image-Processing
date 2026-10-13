/* Visuals for Lecture 8: noise models and restoration filters. */
(function () {
  'use strict';
  const V = (window.VIS = window.VIS || {});
  const tag = (t, stat) => h('div', { class: 'vis-tag' + (stat ? ' static' : '') }, t || (stat ? 'Figure' : 'Interactive'));
  const svg = (w, hh, inner, label) => `<svg class="svg-fig" viewBox="0 0 ${w} ${hh}" role="img" aria-label="${label || ''}">${inner}</svg>`;

  const NOISE = {
    gaussian: { name: 'Gaussian', params: { sigma: 20 } },
    exponential: { name: 'Exponential', params: { a: 0.08 } },
    uniform: { name: 'Uniform', params: { a: -30, b: 30 } },
    saltpepper: { name: 'Salt & pepper', params: { pp: 0.05, ps: 0.05 } },
  };

  V['ch8-degrade'] = function (el) {
    el.append(tag('Degradation model (noise only)', true));
    const box = (x, t, s, col) => `<g transform="translate(${x},30)"><rect width="150" height="60" rx="10" fill="var(--surface)" stroke="${col}" stroke-width="2"/><text x="75" y="27" text-anchor="middle" font-weight="700" font-size="14">${t}</text><text x="75" y="46" text-anchor="middle" font-size="12" class="muted">${s}</text></g>`;
    el.insertAdjacentHTML('beforeend', svg(720, 150, `<defs><marker id="ar8" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>` +
      box(10, 'f(x,y)', 'original image', 'var(--ink-2)') +
      `<circle cx="225" cy="60" r="18" fill="var(--surface)" stroke="var(--bad)" stroke-width="2"/><text x="225" y="66" text-anchor="middle" font-size="20" fill="var(--bad)">+</text><text x="225" y="122" text-anchor="middle" font-size="12" fill="var(--bad)">n(x,y) noise</text><path d="M225 104 V80" stroke="var(--bad)" stroke-width="2" marker-end="url(#ar8)"/>` +
      `<path d="M162 60 H205" stroke="var(--muted)" stroke-width="2" marker-end="url(#ar8)"/><path d="M245 60 H288" stroke="var(--muted)" stroke-width="2" marker-end="url(#ar8)"/>` +
      box(290, 'g(x,y)', 'degraded image', 'var(--bad)') + `<path d="M442 60 H485" stroke="var(--muted)" stroke-width="2" marker-end="url(#ar8)"/>` +
      box(488, 'Restoration filter', 'mean / order-statistics', 'var(--accent)') + `<path d="M640 60 H668" stroke="var(--muted)" stroke-width="2" marker-end="url(#ar8)"/><text x="694" y="66" text-anchor="middle" font-size="16" font-weight="700">f̂</text>`, 'g = f + n'));
  };

  V['ch8-pdfs'] = function (el) {
    el.append(tag('Noise probability density functions', true));
    const C = UI.plot.colors();
    const mk = (title, data, mode) => { const cv = h('canvas', { class: 'plot' }); UI.plot.signal(cv, [{ data, mode: mode || 'line', color: C.accent, width: 2.5 }], { xmin: 0, xmax: 255, ymin: 0, ymax: Math.max(...data.map((d) => d[1])) * 1.15, xticks: [0, 128, 255], yticks: [], W: 260, H: 150 }); return h('figure', { class: 'panel' }, h('div', { class: 'plot-box' }, cv), h('figcaption', { html: title })); };
    const xs = Array.from({ length: 256 }, (_, z) => z);
    el.append(h('div', { class: 'panels n4' },
      mk('<b>Gaussian</b>: symmetric bell around μ', xs.map((z) => [z, Math.exp(-((z - 128) ** 2) / (2 * 30 * 30))])),
      mk('<b>Exponential</b>: a·e<sup>−az</sup>, z ≥ 0 (asymmetric)', xs.map((z) => [z, z < 20 ? 0 : 0.03 * Math.exp(-0.03 * (z - 20))])),
      mk('<b>Uniform</b>: 1/(b − a) on [a, b]', xs.map((z) => [z, z >= 70 && z <= 190 ? 1 : 0])),
      mk('<b>Salt & pepper</b>: spikes at 0 and 255', [[0, 0.4], [255, 0.5], [128, 0]], 'stem')));
  };

  V['ch8-noise-models'] = function (el) {
    el.append(tag());
    let type = 'gaussian';
    const P = { sigma: 20, a: 0.08, ua: -30, ub: 30, pp: 0.05, ps: 0.05 };
    const src = IP.noiseTest(256);
    const p0 = UI.panel('<b>Test object</b>: 3 flat intensities (40, 130, 215)'), p1 = UI.panel('');
    const hcv = h('canvas', { class: 'plot' });
    const ctl = h('div', { class: 'controls' });
    const info = h('div', { class: 'readout' });
    const params = () => ({ gaussian: { sigma: P.sigma }, exponential: { a: P.a }, uniform: { a: P.ua, b: P.ub }, saltpepper: { pp: P.pp, ps: P.ps } }[type]);
    const draw = () => {
      const g = IP.addNoise(src, type, params(), 5);
      IP.show(src, p0.canvas); IP.show(g, p1.canvas);
      p1.setLabel(`<b>${NOISE[type].name} noise</b> added`);
      UI.plot.hist(hcv, IP.hist(g), { W: 520, H: 180, title: 'histogram of the noisy image: each flat level spreads into the noise PDF' });
      info.innerHTML = {
        gaussian: `Gaussian (normal) noise, μ = 0, σ = ${P.sigma}: smoothly varying values around the mean, independent at every pixel, fine-grain speckle.`,
        exponential: `Exponential noise, a = ${P.a} → mean 1/a = ${(1 / P.a).toFixed(1)}, variance 1/a² = ${(1 / P.a ** 2).toFixed(0)}: always positive, asymmetric, occasional large spikes.`,
        uniform: `Uniform noise on [${P.ua}, ${P.ub}]: every value equally likely → mean (a+b)/2 = ${((P.ua + P.ub) / 2).toFixed(1)}, variance (b−a)²/12 = ${(((P.ub - P.ua) ** 2) / 12).toFixed(1)}.`,
        saltpepper: `Salt & pepper: P_pepper = ${P.pp} (→ 0), P_salt = ${P.ps} (→ 255), the rest unchanged (probability ${(1 - P.pp - P.ps).toFixed(2)}).`,
      }[type];
    };
    const setCtl = () => {
      ctl.innerHTML = '';
      ctl.append(UI.seg('Noise', Object.entries(NOISE).map(([k, v]) => [k, v.name]), type, (v) => { type = v; setCtl(); draw(); }));
      if (type === 'gaussian') ctl.append(UI.slider('σ', 2, 60, 1, P.sigma, (v) => { P.sigma = v; draw(); }));
      if (type === 'exponential') ctl.append(UI.slider('a', 0.02, 0.5, 0.01, P.a, (v) => { P.a = v; draw(); }, (v) => v.toFixed(2)));
      if (type === 'uniform') ctl.append(UI.slider('a', -80, 0, 2, P.ua, (v) => { P.ua = v; draw(); }), UI.slider('b', 0, 80, 2, P.ub, (v) => { P.ub = v; draw(); }));
      if (type === 'saltpepper') ctl.append(UI.slider('P pepper', 0, 0.3, 0.01, P.pp, (v) => { P.pp = v; draw(); }, (v) => v.toFixed(2)), UI.slider('P salt', 0, 0.3, 0.01, P.ps, (v) => { P.ps = v; draw(); }, (v) => v.toFixed(2)));
    };
    setCtl();
    el.append(ctl, UI.panels(p0, p1), h('div', { class: 'plot-box', style: { marginTop: '10px' } }, hcv), info);
    draw();
  };

  V['ch8-sp-example'] = function (el) {
    el.append(tag('Slide 12 example — change the numbers'));
    const st = { pp: 0.2, ps: 0.3 };
    const px = [100, 120, 130, 140, 150], r = [0.10, 0.35, 0.80, 0.18, 0.60];
    const out = h('div');
    const draw = () => {
      out.innerHTML = `<div class="readout">Pepper if 0 ≤ r &lt; ${st.pp.toFixed(2)} · salt if ${st.pp.toFixed(2)} ≤ r &lt; ${(st.pp + st.ps).toFixed(2)} · keep if r ≥ ${(st.pp + st.ps).toFixed(2)}</div>
        <div class="tbl-wrap"><table class="tbl"><tr><th>Pixel</th><th>Original</th><th>r</th><th>Decision</th><th>New value</th></tr>${px.map((v, i) => { const d = r[i] < st.pp ? ['pepper', 0] : r[i] < st.pp + st.ps ? ['salt', 255] : ['keep', v]; return `<tr><td>${i + 1}</td><td>${v}</td><td>${r[i].toFixed(2)}</td><td>${d[0]}</td><td><b>${d[1]}</b></td></tr>`; }).join('')}</table></div>`;
    };
    el.append(UI.controls(UI.slider('P_p (pepper)', 0, 0.5, 0.05, st.pp, (v) => { st.pp = v; draw(); }, (v) => v.toFixed(2)), UI.slider('P_s (salt)', 0, 0.5, 0.05, st.ps, (v) => { st.ps = v; draw(); }, (v) => v.toFixed(2))), out);
    draw();
  };

  const FILTERS = [
    ['arithmetic', 'Arithmetic mean'], ['geometric', 'Geometric mean'], ['harmonic', 'Harmonic mean'], ['contra', 'Contraharmonic (Q)'],
    ['median', 'Median'], ['max', 'Max'], ['min', 'Min'], ['midpoint', 'Midpoint'], ['alpha', 'Alpha-trimmed mean (d)'],
  ];
  const fnOf = (k, Q, d) => (k === 'contra' ? IP.restore.contra(Q) : k === 'alpha' ? IP.restore.alpha(d) : IP.restore[k]);

  V['ch8-filters'] = function (el) {
    el.append(tag('Restoration lab'));
    let srcKey = 'pattern', type = 'saltpepper', amt = 0.1, filt = 'median', n = 3, Q = 1.5, d = 4;
    const p0 = UI.panel('<b>Original f</b>'), cmp = UI.compare('Noisy g', 'Restored f̂');
    const info = h('div', { class: 'readout' });
    const qCtl = UI.slider('Q', -3, 3, 0.5, Q, (v) => { Q = v; draw(); }, (v) => v.toFixed(1));
    const dCtl = UI.slider('d (trimmed)', 2, 8, 2, d, (v) => { d = v; draw(); });
    const noisy = () => {
      const f = UI.get(srcKey);
      switch (type) {
        case 'gaussian': return IP.addNoise(f, 'gaussian', { sigma: amt * 200 }, 7);
        case 'uniform': return IP.addNoise(f, 'uniform', { a: -amt * 300, b: amt * 300 }, 7);
        case 'salt': return IP.addNoise(f, 'saltpepper', { pp: 0, ps: amt }, 7);
        case 'pepper': return IP.addNoise(f, 'saltpepper', { pp: amt, ps: 0 }, 7);
        case 'mixed': { const g = IP.addNoise(f, 'uniform', { a: -40, b: 40 }, 3); return IP.addNoise(g, 'saltpepper', { pp: amt / 2, ps: amt / 2 }, 7); }
        default: return IP.addNoise(f, 'saltpepper', { pp: amt / 2, ps: amt / 2 }, 7);
      }
    };
    const draw = () => {
      qCtl.style.display = filt === 'contra' ? '' : 'none';
      dCtl.style.display = filt === 'alpha' ? '' : 'none';
      const f = UI.get(srcKey), g = noisy();
      const out = IP.neighborhood(g, n, fnOf(filt, Q, d));
      IP.show(f, p0.canvas); IP.show(g, cmp.a); IP.show(out, cmp.b);
      const a = IP.psnr(f, g), b = IP.psnr(f, out);
      info.innerHTML = `PSNR noisy = <b>${a.toFixed(1)} dB</b> → restored = <b>${b.toFixed(1)} dB</b> (${b > a ? '+' : ''}${(b - a).toFixed(1)} dB; higher is better)` + (filt === 'contra' ? `<br>Q = ${Q}: ${Q > 0 ? 'Q &gt; 0 removes <b>pepper</b> (and makes salt worse)' : Q < 0 ? (Q === -1 ? 'Q = −1 is the harmonic mean' : 'Q &lt; 0 removes <b>salt</b> (and makes pepper worse)') : 'Q = 0 is the arithmetic mean'}` : '');
    };
    el.append(UI.controls(
      UI.select('Image', [['pattern', 'Test pattern'], ['scene', 'Landscape'], ['phantom', 'Phantom']], srcKey, (v) => { srcKey = v; draw(); }),
      UI.select('Noise', [['saltpepper', 'Salt & pepper'], ['salt', 'Salt only'], ['pepper', 'Pepper only'], ['gaussian', 'Gaussian'], ['uniform', 'Uniform'], ['mixed', 'Uniform + salt & pepper']], type, (v) => { type = v; draw(); }),
      UI.slider('Noise amount', 0.02, 0.3, 0.01, amt, (v) => { amt = v; draw(); }, (v) => v.toFixed(2)),
      UI.select('Filter', FILTERS, filt, (v) => { filt = v; draw(); }),
      UI.select('Window', [['3', '3×3'], ['5', '5×5'], ['7', '7×7']], String(n), (v) => { n = +v; draw(); }), qCtl, dCtl),
      h('div', { class: 'panels n2' }, p0.el, cmp.el), info,
      h('div', { class: 'legend', html: 'Try: salt & pepper + median (excellent) vs arithmetic mean (smears dots). Pepper only + contraharmonic Q = 1.5. Salt only + Q = −1.5 or harmonic. Uniform + mixed noise + alpha-trimmed.' }));
    draw();
  };

  V['ch8-calc'] = function (el) {
    el.append(tag('Neighbourhood calculator · edit the 3×3 values'));
    let vals = [120, 125, 130, 118, 0, 122, 124, 126, 128], Q = 1;
    const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 64px)', gap: '4px' } });
    const out = h('div');
    const inputs = vals.map((v, i) => { const inp = h('input', { type: 'number', value: v, min: 0, max: 255, style: { width: '64px', height: '36px', textAlign: 'center', borderRadius: '6px', border: '1px solid var(--line-2)', background: i === 4 ? 'var(--warn-soft)' : 'var(--surface)', fontFamily: 'var(--mono)' } }); inp.addEventListener('input', () => { vals[i] = +inp.value || 0; draw(); }); grid.append(inp); return inp; });
    const presets = { contra: [120, 125, 130, 118, 0, 122, 124, 126, 128], median: [10, 12, 11, 9, 255, 13, 8, 10, 12], mid: [10, 50, 80, 20, 100, 60, 30, 40, 90] };
    const fmt = (x) => (isFinite(x) ? (+x.toFixed(2)).toString() : '—');
    const draw = () => {
      const v = Float64Array.from(vals), s = Array.from(vals).sort((a, b) => a - b);
      const sum = s.reduce((a, b) => a + b, 0);
      const sq = s.reduce((a, b) => a + b * b, 0);
      const rows = [
        ['Arithmetic mean', `(1/9)·Σg = ${sum}/9`, IP.restore.arithmetic(v)],
        ['Geometric mean', '(Πg)^{1/9}', IP.restore.geometric(v)],
        ['Harmonic mean', '9 / Σ(1/g)', IP.restore.harmonic(v)],
        [`Contraharmonic Q = ${Q}`, Q === 1 ? `Σg² / Σg = ${sq} / ${sum}` : 'Σg^{Q+1} / Σg^{Q}', (() => { let a = 0, b = 0; for (const x of v) { a += Math.pow(x, Q + 1); b += Math.pow(x, Q); } return a / b; })()],
        ['Median', `5th of sorted [${s.join(', ')}]`, IP.restore.median(v)],
        ['Max', 'brightest', IP.restore.max(v)],
        ['Min', 'darkest', IP.restore.min(v)],
        ['Midpoint', `(max + min)/2 = (${s[8]} + ${s[0]})/2`, IP.restore.midpoint(v)],
      ];
      out.innerHTML = `<div class="tbl-wrap"><table class="tbl"><tr><th>Filter</th><th>Computation</th><th>Restored centre</th></tr>${rows.map(([a, b, c]) => `<tr><td>${a}</td><td style="font-family:var(--mono);font-size:12.5px">${b}</td><td><b>${fmt(c)}</b></td></tr>`).join('')}</table></div>`;
    };
    const setVals = (p) => { vals = p.slice(); inputs.forEach((inp, i) => { inp.value = vals[i]; }); draw(); };
    el.append(UI.controls(h('button', { class: 'btn small', type: 'button', onclick: () => setVals(presets.contra) }, 'Slide 21 (pepper)'), h('button', { class: 'btn small', type: 'button', onclick: () => setVals(presets.median) }, 'Slide 28 (salt)'), h('button', { class: 'btn small', type: 'button', onclick: () => setVals(presets.mid) }, 'Slide 32 (midpoint)'), UI.slider('Q', -2, 3, 0.5, Q, (v) => { Q = v; draw(); }, (v) => v.toFixed(1))),
      h('div', { class: 'split', style: { gridTemplateColumns: 'auto minmax(0,1fr)' } }, grid, out));
    draw();
  };

  V['ch8-contra-grid'] = function (el) {
    el.append(tag('Choosing the sign of Q (like Figs. 5.8–5.9)', true));
    const f = IP.pattern(256);
    const pep = IP.addNoise(f, 'saltpepper', { pp: 0.1, ps: 0 }, 2), salt = IP.addNoise(f, 'saltpepper', { pp: 0, ps: 0.1 }, 2);
    const items = [[pep, '<b>Pepper noise</b> (P = 0.1)'], [IP.neighborhood(pep, 3, IP.restore.contra(1.5)), '<b>Q = +1.5</b> → pepper removed ✔'], [IP.neighborhood(pep, 3, IP.restore.contra(-1.5)), '<b>Q = −1.5</b> on pepper ✘ (worse)'],
      [salt, '<b>Salt noise</b> (P = 0.1)'], [IP.neighborhood(salt, 3, IP.restore.contra(-1.5)), '<b>Q = −1.5</b> → salt removed ✔'], [IP.neighborhood(salt, 3, IP.restore.contra(1.5)), '<b>Q = +1.5</b> on salt ✘ (worse)']];
    el.append(h('div', { class: 'panels n3' }, ...items.map(([im, l]) => { const p = UI.panel(l); IP.show(im, p.canvas); return p.el; })));
  };

  V['ch8-compare-sp'] = function (el) {
    el.append(tag('Salt & pepper: which filter wins?', true));
    const f = IP.pattern(256), g = IP.addNoise(f, 'saltpepper', { pp: 0.08, ps: 0.08 }, 4);
    const items = [[g, 'Noisy (P_s = P_p = 0.08)'], [IP.neighborhood(g, 3, IP.restore.arithmetic), 'Arithmetic mean'], [IP.neighborhood(g, 3, IP.restore.geometric), 'Geometric mean'], [IP.neighborhood(g, 3, IP.restore.midpoint), 'Midpoint'], [IP.neighborhood(g, 3, IP.restore.max), 'Max (removes pepper only)'], [IP.neighborhood(g, 3, IP.restore.min), 'Min (removes salt only)'], [IP.neighborhood(g, 3, IP.restore.median), 'Median ✔'], [IP.neighborhood(IP.neighborhood(g, 3, IP.restore.median), 3, IP.restore.median), 'Median, 2 passes']];
    el.append(h('div', { class: 'panels n4' }, ...items.map(([im, l]) => { const p = UI.panel(`<b>${l}</b><br>PSNR ${IP.psnr(f, im).toFixed(1)} dB`); IP.show(im, p.canvas); return p.el; })));
  };

  V['ch8-color-noise'] = function (el) {
    el.append(tag());
    const src = IP.fruitRGB(256);
    let sR = 10, sG = 10, sB = 40;
    const p0 = UI.panel('<b>Noisy RGB image</b>'), pR = UI.panel(''), pG = UI.panel(''), pB = UI.panel(''), pH = UI.panel('<b>H</b> of the noisy image'), pS = UI.panel('<b>S</b> of the noisy image'), pI = UI.panel('<b>I</b> of the noisy image (smoother)');
    const draw = () => {
      const g = IP.RGB.fromPlanes(IP.addNoise(src.plane('r'), 'gaussian', { sigma: sR }, 1), IP.addNoise(src.plane('g'), 'gaussian', { sigma: sG }, 2), IP.addNoise(src.plane('b'), 'gaussian', { sigma: sB }, 3));
      IP.show(g, p0.canvas); IP.show(g.plane('r'), pR.canvas); IP.show(g.plane('g'), pG.canvas); IP.show(g.plane('b'), pB.canvas);
      pR.setLabel(`<b>R</b> (σ = ${sR})`); pG.setLabel(`<b>G</b> (σ = ${sG})`); pB.setLabel(`<b>B</b> (σ = ${sB})`);
      const { H, S, I } = IP.toHSI(g); IP.show(H.map((v) => (v / 360) * 255), pH.canvas); IP.show(S.map((v) => v * 255), pS.canvas); IP.show(I.map((v) => v * 255), pI.canvas);
    };
    el.append(UI.controls(UI.slider('σ R', 0, 60, 2, sR, (v) => { sR = v; draw(); }), UI.slider('σ G', 0, 60, 2, sG, (v) => { sG = v; draw(); }), UI.slider('σ B', 0, 60, 2, sB, (v) => { sB = v; draw(); })),
      h('div', { class: 'panels n4' }, p0.el, pR.el, pG.el, pB.el), h('div', { style: { height: '10px' } }), UI.panels(pH, pS, pI));
    draw();
  };
})();
