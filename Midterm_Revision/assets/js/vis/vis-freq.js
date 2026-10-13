/* Visuals for Lecture 7: filtering in the frequency domain. */
(function () {
  'use strict';
  const V = (window.VIS = window.VIS || {});
  const tag = (t, stat) => h('div', { class: 'vis-tag' + (stat ? ' static' : '') }, t || (stat ? 'Figure' : 'Interactive'));
  const svg = (w, hh, inner, label) => `<svg class="svg-fig" viewBox="0 0 ${w} ${hh}" role="img" aria-label="${label || ''}">${inner}</svg>`;
  const N = 256;

  // synthetic test images
  function shape(kind, p) {
    p = p || {};
    const o = new IP.Gray(N, N), c = N / 2;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let v = 0;
      const dx = x - c, dy = y - c;
      switch (kind) {
        case 'square': v = Math.abs(dx) < 24 && Math.abs(dy) < 24 ? 200 : 0; break;
        case 'bar': v = Math.abs(dx) < (p.w || 40) && Math.abs(dy) < (p.hgt || 4) ? 255 : 0; break;
        case 'vbar': v = Math.abs(dx) < 5 && Math.abs(dy) < 32 ? 255 : 0; break;
        case 'dot': v = Math.abs(dx) < 3 && Math.abs(dy) < 3 ? 255 : 0; break;
        case 'disc': v = dx * dx + dy * dy < 9 ? 255 : 0; break;
        case 'line': v = Math.abs(dy) < 1 ? 255 : 0; break;
        case 'grating': v = 128 + 120 * Math.cos(2 * Math.PI * ((p.u || 8) * x / N + (p.v || 4) * y / N)); break;
        case 'rect': v = Math.abs(dx) < (p.w || 30) && Math.abs(dy) < (p.hgt || 12) ? 220 : 0; break;
        default: v = 0;
      }
      o.d[y * N + x] = v;
    }
    return o;
  }
  V.shape = shape;
  const specLog = (img) => IP.shift(IP.logSpec(IP.magnitude(IP.dft(img))));

  V['ch7-basis'] = function (el) {
    el.append(tag());
    const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: '6px' } });
    const M = 64;
    for (let v = 2; v >= -2; v--) for (let u = -2; u <= 2; u++) {
      const im = new IP.Gray(M, M);
      for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) im.d[y * M + x] = 128 + 127 * Math.cos(2 * Math.PI * ((u * x) / M + (v * y) / M));
      const cv = h('canvas', { class: 'img' }); IP.show(im, cv);
      grid.append(h('figure', { class: 'panel' }, cv, h('figcaption', { style: { fontSize: '11px' } }, `u=${u}, v=${v}`)));
    }
    let u = 3, v = 1;
    const p1 = UI.panel(''), p2 = UI.panel('<b>|F(u,v)|</b> (centred): two symmetric dots at (u,v) and (−u,−v)');
    const draw = () => {
      const im = new IP.Gray(N, N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) im.d[y * N + x] = 128 + 127 * Math.cos(2 * Math.PI * ((u * x) / N + (v * y) / N));
      IP.show(im, p1.canvas); p1.setLabel(`<b>cos 2π(ux/M + vy/N)</b>, u = ${u}, v = ${v}`);
      const s = IP.shift(IP.magnitude(IP.dft(im)));
      const vis = s.map((x) => (x > 1e3 ? 255 : 0));
      const big = new IP.Gray(N, N); // dilate dots for visibility
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (vis.d[y * N + x]) for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) { const yy = y + a, xx = x + b; if (yy >= 0 && yy < N && xx >= 0 && xx < N) big.d[yy * N + xx] = 255; }
      for (let i = 0; i < N; i++) { if (!big.d[128 * N + i]) big.d[128 * N + i] = 50; if (!big.d[i * N + 128]) big.d[i * N + 128] = 50; }
      IP.show(big, p2.canvas);
    };
    el.append(h('div', { class: 'split' }, h('div', {}, grid, h('p', { class: 'vis-cap', html: 'Basis images $b_{uv}$ for u, v = −2…2 (U horizontal, V vertical). (0,0) is flat: the DC / average term.' })),
      h('div', {}, UI.controls(UI.slider('u', -12, 12, 1, u, (x) => { u = x; draw(); }), UI.slider('v', -12, 12, 1, v, (x) => { v = x; draw(); })), UI.panels(p1, p2))));
    draw();
  };

  V['ch7-spectrum'] = function (el) {
    el.append(tag());
    let kind = 'square';
    const ps = [UI.panel('<b>Original</b> f(x,y)'), UI.panel('<b>|F(u,v)|</b> raw (linear)'), UI.panel('<b>log(1 + |F|)</b> not shifted'), UI.panel('<b>fftshift(log(1 + |F|))</b>')];
    const info = h('div', { class: 'readout' });
    const draw = () => {
      const img = kind === 'scene' ? IP.scene(N) : kind === 'pattern' ? IP.pattern(N) : shape(kind);
      const F = IP.dft(img), mag = IP.magnitude(F);
      IP.show(img, ps[0].canvas); IP.show(mag, ps[1].canvas, 'minmax'); IP.show(IP.logSpec(mag), ps[2].canvas, 'minmax'); IP.show(IP.shift(IP.logSpec(mag)), ps[3].canvas, 'minmax');
      let err = 0; for (let v = 0; v < N; v++) for (let u = 0; u < N; u++) { const i = v * N + u, j = ((N - v) % N) * N + ((N - u) % N); err = Math.max(err, Math.hypot(F.re[i] - F.re[j], F.im[i] + F.im[j])); }
      let sum = 0; img.d.forEach((x) => (sum += x));
      info.innerHTML = `F(0,0) = Σ f(x,y) = <b>${Math.round(F.re[0]).toLocaleString()}</b> = MN × mean (${(sum / (N * N)).toFixed(1)}) — the DC term, the brightest point. Conjugate symmetry check: max |F(u,v) − F*(−u,−v)| = ${err.toExponential(1)} ≈ 0 for this real image.`;
    };
    el.append(UI.controls(UI.select('Image', [['square', 'Square'], ['bar', 'Horizontal bar'], ['vbar', 'Vertical bar'], ['dot', 'Small square (dot)'], ['disc', 'Small disc'], ['line', 'Thin line'], ['grating', 'Sinusoidal grating'], ['scene', 'Landscape photo'], ['pattern', 'Test pattern']], kind, (v) => { kind = v; draw(); })), UI.panels(...ps), info);
    draw();
  };

  V['ch7-complex'] = function (el) {
    el.append(tag('Calculator'));
    const st = { R: 3, I: 4 };
    const plane = h('div'), out = h('div', { class: 'readout' });
    const draw = () => {
      const m = Math.hypot(st.R, st.I), ph = Math.atan2(st.I, st.R);
      const s = 18, cx = 150, cy = 130, x = cx + st.R * s, y = cy - st.I * s;
      plane.innerHTML = svg(300, 260, `<line x1="20" y1="${cy}" x2="280" y2="${cy}" stroke="var(--line-2)"/><line x1="${cx}" y1="10" x2="${cx}" y2="250" stroke="var(--line-2)"/>
        <text x="272" y="${cy - 6}" font-size="11" class="muted">Re</text><text x="${cx + 6}" y="20" font-size="11" class="muted">Im</text>
        <line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--accent)" stroke-width="3"/><circle cx="${x}" cy="${y}" r="5" fill="var(--accent)"/>
        <line x1="${x}" y1="${y}" x2="${x}" y2="${cy}" stroke="var(--muted)" stroke-dasharray="3 3"/><line x1="${cx}" y1="${y}" x2="${x}" y2="${y}" stroke="var(--muted)" stroke-dasharray="3 3"/>
        <path d="M${cx + 30} ${cy} A30 30 0 ${Math.abs(ph) > Math.PI ? 1 : 0} ${ph > 0 ? 0 : 1} ${cx + 30 * Math.cos(ph)} ${cy - 30 * Math.sin(ph)}" fill="none" stroke="var(--warn)" stroke-width="2"/>
        <text x="${cx + 36}" y="${cy - 8 * Math.sign(ph || 1)}" font-size="12" fill="var(--warn)">φ</text><text x="${(cx + x) / 2 - 18}" y="${(cy + y) / 2 - 6}" font-size="12" fill="var(--accent)">|F|</text>`, 'Complex plane');
      out.innerHTML = `F(u,v) = ${st.R} + j${st.I}<br>|F| = √(R² + I²) = √(${st.R ** 2} + ${st.I ** 2}) = <b>${m.toFixed(3)}</b><br>φ = arctan(I/R) = <b>${((ph * 180) / Math.PI).toFixed(2)}°</b> = ${ph.toFixed(4)} rad`;
    };
    el.append(UI.controls(UI.slider('R (real)', -6, 6, 0.5, st.R, (v) => { st.R = v; draw(); }), UI.slider('I (imag.)', -6, 6, 0.5, st.I, (v) => { st.I = v; draw(); })), h('div', { class: 'split' }, plane, out));
    draw();
  };

  V['ch7-phase-mag'] = function (el) {
    el.append(tag('Computed live with the FFT'));
    const A = IP.scene(N), B = IP.pattern(N);
    const FA = IP.dft(A), FB = IP.dft(B);
    const recon = (mag, ph) => { const F = { re: new Float64Array(N * N), im: new Float64Array(N * N), w: N, h: N }; for (let i = 0; i < N * N; i++) { F.re[i] = mag(i) * Math.cos(ph(i)); F.im[i] = mag(i) * Math.sin(ph(i)); } return IP.idft(F); };
    const mA = (i) => Math.hypot(FA.re[i], FA.im[i]), pA = (i) => Math.atan2(FA.im[i], FA.re[i]);
    const mB = (i) => Math.hypot(FB.re[i], FB.im[i]), pB = (i) => Math.atan2(FB.im[i], FB.re[i]);
    const items = [
      [A, '<b>Image A</b>', 'clip'], [B, '<b>Image B</b>', 'clip'],
      [recon(mA, () => 0), '<b>A: magnitude only</b> (phase = 0) — energy, no structure', 'pct'],
      [recon(() => 1, pA), '<b>A: phase only</b> (|F| = constant) — edges and geometry survive', 'pct'],
      [recon(mA, pB), '<b>|F_A| with phase of B</b> → looks like B', 'minmax'],
      [recon(mB, pA), '<b>|F_B| with phase of A</b> → looks like A', 'minmax'],
    ];
    const ps = items.map(([im, lab, mode]) => { const p = UI.panel(lab); IP.show(im, p.canvas, mode); return p; });
    el.append(h('div', { class: 'panels n3' }, ...ps.map((p) => p.el)));
  };

  V['ch7-separability'] = function (el) {
    el.append(tag('2-D DFT = 1-D DFTs on rows, then columns', true));
    const img = IP.scene(N);
    const re = Float64Array.from(img.d), im = new Float64Array(N * N);
    // rows only: transform each row by doing a 2-D FFT on a 1-row image
    const rowRe = new Float64Array(N), rowIm = new Float64Array(N);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) { rowRe[x] = re[y * N + x]; rowIm[x] = 0; }
      IP.fft2(rowRe, rowIm, N, 1, false);
      for (let x = 0; x < N; x++) { re[y * N + x] = rowRe[x]; im[y * N + x] = rowIm[x]; }
    }
    const mid = new IP.Gray(N, N, Float32Array.from(re, (r, i) => Math.log(1 + Math.hypot(r, im[i]))));
    const full = IP.logSpec(IP.magnitude(IP.dft(img)));
    const p1 = UI.panel('<b>f(x,y)</b>'), p2 = UI.panel('<b>After 1-D DFT of every row</b>'), p3 = UI.panel('<b>…then every column</b> = F(u,v)');
    IP.show(img, p1.canvas); IP.show(mid, p2.canvas, 'minmax'); IP.show(full, p3.canvas, 'minmax');
    el.append(UI.panels(p1, p2, p3));
  };

  V['ch7-props'] = function (el) {
    el.append(tag());
    let mode = 'translate', val = 40;
    const p1 = UI.panel(''), p2 = UI.panel('');
    const ctlBox = h('div', { class: 'controls' });
    const info = h('div', { class: 'readout' });
    const base = shape('rect', { w: 34, hgt: 10 });
    const baseMag = IP.magnitude(IP.dft(base));
    const draw = () => {
      let img;
      if (mode === 'translate') {
        img = new IP.Gray(N, N);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) img.d[((y + Math.round(val / 2)) % N) * N + ((x + val + N) % N)] = base.d[y * N + x];
      } else if (mode === 'rotate') {
        const r = (val * Math.PI) / 180; img = IP.affine(base, [Math.cos(r), -Math.sin(r), 0, Math.sin(r), Math.cos(r), 0, 0, 0, 1], 'bilinear', 0);
      } else img = shape('bar', { w: 60, hgt: Math.max(1, val / 2) });
      const mag = IP.magnitude(IP.dft(img));
      IP.show(img, p1.canvas); IP.show(IP.shift(IP.logSpec(mag)), p2.canvas, 'minmax');
      p1.setLabel('<b>Spatial domain</b>'); p2.setLabel('<b>Spectrum</b> log(1+|F|), centred');
      if (mode === 'translate') { let d = 0; for (let i = 0; i < mag.d.length; i++) d = Math.max(d, Math.abs(mag.d[i] - baseMag.d[i])); info.innerHTML = `Shifted by (${val}, ${Math.round(val / 2)}) pixels. Max change in |F(u,v)| = <b>${d.toExponential(1)}</b> → the spectrum is unchanged; only the phase changes by $e^{-j2\\pi(ux_0/M + vy_0/N)}$.`; }
      else if (mode === 'rotate') info.innerHTML = `Rotating f(x,y) by θ = ${val}° rotates F(u,v) by the same angle θ.`;
      else info.innerHTML = `Bar height ${Math.max(1, val / 2) * 2} px. Narrow in space → wide in frequency (and vice versa): the sinc pattern spreads as the bar gets thinner.`;
      if (window.App) App.renderMath(info);
    };
    const setCtl = () => {
      ctlBox.innerHTML = '';
      ctlBox.append(UI.seg('Property', [['translate', 'Translation'], ['rotate', 'Rotation'], ['scale', 'Scaling / width']], mode, (v) => { mode = v; val = { translate: 40, rotate: 30, scale: 16 }[v]; setCtl(); draw(); }));
      if (mode === 'translate') ctlBox.append(UI.slider('Shift x₀', -100, 100, 4, val, (v) => { val = v; draw(); }));
      if (mode === 'rotate') ctlBox.append(UI.slider('θ (deg)', -90, 90, 5, val, (v) => { val = v; draw(); }));
      if (mode === 'scale') ctlBox.append(UI.slider('Bar height', 2, 60, 2, val, (v) => { val = v; draw(); }));
    };
    setCtl();
    el.append(ctlBox, UI.panels(p1, p2), info);
    draw();
  };

  V['ch7-examples'] = function (el) {
    el.append(tag('Like slides 25 and 27', true));
    const items = [['line', 'Thin line'], ['bar', 'Wide bar'], ['rect', 'Smaller rectangle'], ['dot', 'Small square'], ['disc', 'Small disc'], ['vbar', 'Vertical bar']];
    const cols = items.map(([k, l]) => {
      const img = k === 'bar' ? shape('bar', { w: 50, hgt: 5 }) : k === 'rect' ? shape('rect', { w: 14, hgt: 5 }) : shape(k);
      const a = UI.panel(`<b>${l}</b>`), b = UI.panel('spectrum');
      IP.show(img, a.canvas); IP.show(specLog(img), b.canvas, 'minmax');
      return h('div', {}, a.el, b.el);
    });
    el.append(h('div', { class: 'panels n6', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' } }, ...cols));
  };

  V['ch7-convthm'] = function (el) {
    el.append(tag('Convolution theorem — verified numerically'));
    const f = shape('vbar');
    const sig = 5, gk = IP.kernel.gaussian(31, sig);
    const gC = new IP.Gray(N, N), gW = new IP.Gray(N, N); // centred (display) and wrapped (for FFT)
    for (let y = -15; y <= 15; y++) for (let x = -15; x <= 15; x++) { const v = gk.d[(y + 15) * 31 + x + 15]; gC.d[(y + 128) * N + x + 128] = v; gW.d[((y + N) % N) * N + ((x + N) % N)] = v; }
    const spatial = IP.filter(f, gk, { pad: 'zero', flip: true });
    const F = IP.dft(f), G = IP.dft(gW);
    const P = { re: new Float64Array(N * N), im: new Float64Array(N * N), w: N, h: N };
    for (let i = 0; i < N * N; i++) { P.re[i] = F.re[i] * G.re[i] - F.im[i] * G.im[i]; P.im[i] = F.re[i] * G.im[i] + F.im[i] * G.re[i]; }
    const viaFreq = IP.idft(P);
    let err = 0, mx = 0; for (let i = 0; i < N * N; i++) { err = Math.max(err, Math.abs(viaFreq.d[i] - spatial.d[i])); mx = Math.max(mx, spatial.d[i]); }
    const m = (Fx) => IP.shift(IP.logSpec(IP.magnitude(Fx)));
    const items = [[f, '<b>f(x,y)</b>', 'clip'], [gC, '<b>g(x,y)</b> Gaussian', 'minmax'], [spatial, '<b>f * g</b> computed in space', 'minmax'], [m(F), '<b>F(u,v)</b>', 'minmax'], [m(G), '<b>G(u,v)</b>', 'minmax'], [m(P), '<b>F(u,v)·G(u,v)</b>', 'minmax'], [viaFreq, '<b>𝔉⁻¹[F·G]</b>', 'minmax']];
    const ps = items.map(([im, lab, mode]) => { const p = UI.panel(lab); IP.show(im, p.canvas, mode); return p; });
    el.append(h('div', { class: 'panels n4' }, ...ps.map((p) => p.el)), h('div', { class: 'readout', html: `Max difference between f*g (spatial) and 𝔉⁻¹[F·G] (frequency): <b>${err.toExponential(2)}</b> (peak value ${mx.toFixed(1)}) — the two routes give the same image.` }));
  };

  V['ch7-filtering'] = function (el) {
    el.append(tag('Additional — filtering by multiplying H(u,v)'));
    let src = IP.scene(N), type = 'glp', D0 = 30;
    const pH = UI.panel(''), cmp = UI.compare('Original', 'Filtered'), pS = UI.panel('');
    const Hf = (D) => ({ ilp: D <= D0 ? 1 : 0, ihp: D <= D0 ? 0 : 1, glp: Math.exp(-(D * D) / (2 * D0 * D0)), ghp: 1 - Math.exp(-(D * D) / (2 * D0 * D0)), lap: -(D * D) / (N * N / 16) }[type]);
    const draw = () => {
      const Hm = new IP.Gray(N, N);
      for (let v = 0; v < N; v++) for (let u = 0; u < N; u++) Hm.d[v * N + u] = Hf(Math.hypot(u - N / 2, v - N / 2));
      const out = IP.freqFilter(src, (D) => Hf(D));
      IP.show(Hm, pH.canvas, 'minmax'); IP.show(src, cmp.a); IP.show(out, cmp.b, type === 'ihp' || type === 'ghp' || type === 'lap' ? 'minmax' : 'clip');
      IP.show(specLog(out), pS.canvas, 'minmax');
      pH.setLabel(`<b>H(u,v)</b> (centred) · D₀ = ${D0}`); pS.setLabel('<b>Spectrum of the result</b>');
    };
    el.append(UI.controls(UI.imagePicker(['scene', 'pattern'], 'scene', (im) => { src = im; draw(); }), UI.select('H(u,v)', [['ilp', 'Ideal low-pass'], ['glp', 'Gaussian low-pass'], ['ihp', 'Ideal high-pass'], ['ghp', 'Gaussian high-pass'], ['lap', 'Laplacian (−D²)']], type, (v) => { type = v; draw(); }), UI.slider('Cut-off D₀', 5, 100, 1, D0, (v) => { D0 = v; draw(); })),
      UI.panels(pH, cmp, pS), h('div', { class: 'readout', html: 'Filtering in frequency = multiply F(u,v) by H(u,v), then inverse DFT. Low-pass keeps the centre (smooth); high-pass removes it (edges). Notice the <b>ringing</b> of the ideal filter — its sharp cut-off corresponds to a sinc in space.' }));
    draw();
  };

  V['ch7-why'] = function (el) {
    el.append(tag('Diagram', true));
    const b = (x, y, t, s, col) => `<g transform="translate(${x},${y})"><rect width="200" height="58" rx="10" fill="var(--surface)" stroke="${col}" stroke-width="2"/><text x="100" y="26" text-anchor="middle" font-weight="700" font-size="14">${t}</text><text x="100" y="45" text-anchor="middle" font-size="12" class="muted">${s}</text></g>`;
    el.insertAdjacentHTML('beforeend', svg(640, 250, `<defs><marker id="ar7" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>` +
      b(20, 20, 'Original problem', 'spatial domain', 'var(--ink-2)') + b(420, 20, 'Problem in frequency space', 'F(u,v)', 'var(--accent)') +
      b(420, 170, 'Solution in frequency space', 'relatively easy', 'var(--accent)') + b(20, 170, 'Solution of original problem', 'spatial domain', 'var(--ink-2)') +
      `<path d="M222 49 H416" stroke="var(--muted)" stroke-width="2" marker-end="url(#ar7)"/><text x="320" y="40" text-anchor="middle" font-size="12.5">Fourier transform</text>
       <path d="M520 80 V166" stroke="var(--muted)" stroke-width="2" marker-end="url(#ar7)"/><text x="530" y="128" font-size="12.5">solve</text>
       <path d="M418 199 H224" stroke="var(--muted)" stroke-width="2" marker-end="url(#ar7)"/><text x="320" y="190" text-anchor="middle" font-size="12.5">inverse Fourier transform</text>
       <path d="M120 80 V166" stroke="var(--bad)" stroke-width="2" stroke-dasharray="6 5" marker-end="url(#ar7)"/><text x="130" y="128" font-size="12.5" fill="var(--bad)">difficult directly</text>`, 'Why use the frequency domain'));
  };
})();
