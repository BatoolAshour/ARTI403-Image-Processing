/* Visuals for Lectures 1–3: pixels, formats, colour depth, maths, signals, sampling, geometry. */
(function () {
  'use strict';
  const V = (window.VIS = window.VIS || {});
  const tag = (t, stat) => h('div', { class: 'vis-tag' + (stat ? ' static' : '') }, t || (stat ? 'Figure' : 'Interactive'));
  const svg = (w, hh, inner, label) => `<svg class="svg-fig" viewBox="0 0 ${w} ${hh}" role="img" aria-label="${label || ''}">${inner}</svg>`;

  // ================= Lecture 1 =================
  V['ch1-pixels'] = function (el) {
    el.append(tag('Interactive · hover or tap the image'));
    const img = IP.scene(256);
    const p = UI.panel('<b>What we see</b> — move over the image');
    IP.show(img, p.canvas);
    const ov = h('canvas', { class: 'img', style: { position: 'absolute', inset: 0, background: 'transparent' }, width: 256, height: 256 });
    const box = h('div', { style: { position: 'relative' } }, p.canvas, ov);
    p.el.insertBefore(box, p.el.firstChild);
    const gridBox = h('div', { class: 'panel' });
    const read = h('div', { class: 'readout' });
    const N = 8;
    const draw = (cx, cy) => {
      cx = IP.clamp(cx, 0, 256 - N); cy = IP.clamp(cy, 0, 256 - N);
      const c = ov.getContext('2d'); c.clearRect(0, 0, 256, 256);
      c.strokeStyle = '#ff3b30'; c.lineWidth = 2; c.strokeRect(cx - 1, cy - 1, N + 2, N + 2);
      const rows = [];
      for (let y = 0; y < N; y++) { const r = []; for (let x = 0; x < N; x++) r.push(Math.round(img.d[(cy + y) * 256 + cx + x])); rows.push(r); }
      gridBox.innerHTML = mat(rows, { shade: true, max: 255, cls: 'small' }) + '<figcaption><b>What a computer sees</b> — the 8×8 block in the red box (0 = black, 255 = white)</figcaption>';
      read.innerHTML = `Block origin: row x = <b>${cy}</b>, column y = <b>${cx}</b> · image size 256 × 256 · 8 bits/pixel`;
    };
    const mv = (e) => { const r = ov.getBoundingClientRect(); draw(Math.round(((e.clientX - r.left) / r.width) * 256) - 4, Math.round(((e.clientY - r.top) / r.height) * 256) - 4); };
    ov.addEventListener('pointermove', mv); ov.addEventListener('pointerdown', mv);
    el.append(h('div', { class: 'split' }, p.el, gridBox), read);
    draw(150, 180);
  };

  V['ch1-raster-vector'] = function (el) {
    el.append(tag());
    const small = document.createElement('canvas'); small.width = small.height = 40;
    const sc = small.getContext('2d');
    sc.fillStyle = '#ececec'; sc.fillRect(0, 0, 40, 40);
    sc.fillStyle = '#e59a5b'; sc.beginPath(); sc.arc(20, 20, 13, 0, 7); sc.fill();
    sc.fillStyle = '#1f1f1f'; sc.font = 'bold 11px sans-serif'; sc.fillText('A', 16, 24);
    const rast = h('canvas', { class: 'img pixel', width: 320, height: 320 });
    const vec = h('div', { style: { aspectRatio: '1', borderRadius: '6px', overflow: 'hidden', background: '#ececec' } });
    const info = h('div', { class: 'readout' });
    const draw = (z) => {
      const c = rast.getContext('2d'); c.imageSmoothingEnabled = false;
      const w = 40 / z, o = (40 - w) / 2;
      c.clearRect(0, 0, 320, 320); c.drawImage(small, o, o, w, w, 0, 0, 320, 320);
      vec.innerHTML = `<svg viewBox="${o} ${o} ${w} ${w}" width="100%" height="100%"><rect x="0" y="0" width="40" height="40" fill="#ececec"/><circle cx="20" cy="20" r="13" fill="#e59a5b"/><text x="16" y="24" font-family="sans-serif" font-weight="bold" font-size="11" fill="#1f1f1f">A</text></svg>`;
      info.innerHTML = `Zoom <b>${z}×</b> · raster stores 40×40 = 1600 pixel values · vector stores a few shape descriptions (circle: centre, radius r, fill colour; text: glyph, position)`;
    };
    el.append(UI.controls(UI.slider('Zoom', 1, 10, 1, 2, draw, (v) => v + '×')),
      h('div', { class: 'panels n2' }, h('figure', { class: 'panel' }, rast, h('figcaption', { html: '<b>Bitmap (raster)</b> — pixels get stretched → pixelated' })), h('figure', { class: 'panel' }, vec, h('figcaption', { html: '<b>Vector</b> — redrawn from equations, e.g. $x^2+y^2=r^2$ → always sharp' }))), info);
    draw(2);
  };

  V['ch1-depth'] = function (el) {
    el.append(tag());
    let bits = 3, mode = 'gray';
    const p1 = UI.panel('Original (8 bits/pixel, 256 levels)'), p2 = UI.panel('');
    const info = h('div', { class: 'readout' });
    const draw = () => {
      if (mode === 'gray') {
        const g = IP.scene(256);
        IP.show(g, p1.canvas); IP.show(IP.quantize(g, bits), p2.canvas);
        p1.setLabel('<b>Original</b> 8-bit grayscale (256 levels)');
        p2.setLabel(`<b>${bits}-bit</b> grayscale → 2<sup>${bits}</sup> = ${2 ** bits} levels`);
        info.innerHTML = `n = <b>${bits}</b> bits per pixel → 2<sup>n</sup> = <b>${(2 ** bits).toLocaleString()}</b> possible values. Binary codes such as ${Array.from({ length: Math.min(4, 2 ** bits) }, (_, i) => i.toString(2).padStart(bits, '0')).join(', ')}…`;
      } else {
        const c = IP.fruitRGB(256);
        IP.show(c, p1.canvas);
        IP.show(c.mapPlanes((pl) => IP.quantize(pl, bits)), p2.canvas);
        p1.setLabel('<b>Original</b> 24-bit colour (8 bits × 3 channels)');
        p2.setLabel(`<b>${bits} bits per channel</b> = ${3 * bits} bits per pixel`);
        info.innerHTML = `Colour depth = 3 × ${bits} = <b>${3 * bits}</b> bits → 2<sup>${3 * bits}</sup> = <b>${(2 ** (3 * bits)).toLocaleString()}</b> colours. With 8 bits per channel: 2<sup>24</sup> = 16,777,216.`;
      }
    };
    el.append(UI.controls(UI.seg('Mode', [['gray', 'Grayscale'], ['color', 'Colour (RGB)']], mode, (v) => { mode = v; draw(); }), UI.slider('Bits', 1, 8, 1, bits, (v) => { bits = v; draw(); })), UI.panels(p1, p2), info);
    draw();
  };

  V['ch1-metadata'] = function (el) {
    el.append(tag('Interactive · same bits, different metadata'));
    // 16 wide × 24 tall 1-bit picture (a little rocket)
    const art = [
      '0000000110000000', '0000001111000000', '0000011111100000', '0000011001100000', '0000111001110000', '0000111111110000',
      '0000111111110000', '0000110000110000', '0000110110110000', '0000110110110000', '0000110000110000', '0000111111110000',
      '0001111111111000', '0011111111111100', '0111101111011110', '0111001111001110', '0110001111000110', '0100000110000010',
      '0000000110000000', '0000001001000000', '0000010000100000', '0000100110010000', '0000000110000000', '0000000000000000'];
    const bitsArr = art.join('').split('').map(Number);
    const mk = (w) => {
      const hh = bitsArr.length / w, cv = h('canvas', { class: 'img pixel', width: w, height: hh, style: { aspectRatio: w + '/' + hh, background: '#fff' } });
      const c = cv.getContext('2d'), id = c.createImageData(w, hh);
      bitsArr.forEach((b, i) => { const v = b ? 20 : 240; id.data.set([v, v, v, 255], i * 4); });
      c.putImageData(id, 0, 0);
      return cv;
    };
    const stream = h('div', { class: 'readout', style: { wordBreak: 'break-all', fontSize: '11px' } }, 'Stored bitstream (384 bits): ' + bitsArr.join('').slice(0, 96) + '…');
    el.append(stream, h('div', { class: 'panels n2', style: { maxWidth: '520px', margin: '0 auto' } },
      h('figure', { class: 'panel' }, mk(16), h('figcaption', { html: '<b style="color:var(--good)">Correct</b> metadata: width 16 × height 24' })),
      h('figure', { class: 'panel' }, mk(24), h('figcaption', { html: '<b style="color:var(--bad)">Wrong</b> metadata: width 24 × height 16' }))));
  };

  V['ch1-levels'] = function (el) {
    el.append(tag('Diagram', true));
    const box = (x, col, title, inp, out, ex) => `
      <g transform="translate(${x},20)"><rect width="200" height="150" rx="10" fill="var(--surface)" stroke="${col}" stroke-width="2"/>
      <rect width="200" height="30" rx="10" fill="${col}"/><rect y="20" width="200" height="10" fill="${col}"/>
      <text x="12" y="20" font-weight="700" font-size="14" fill="#fff">${title}</text>
      <text x="12" y="54" font-size="13"><tspan font-weight="600">Input:</tspan> ${inp}</text>
      <text x="12" y="74" font-size="13"><tspan font-weight="600">Output:</tspan> ${out}</text>
      <text x="12" y="102" font-size="12.5" class="muted">e.g. ${ex[0]}</text><text x="12" y="120" font-size="12.5" class="muted">${ex[1] || ''}</text><text x="12" y="138" font-size="12.5" class="muted">${ex[2] || ''}</text></g>`;
    el.insertAdjacentHTML('beforeend', svg(700, 230,
      box(10, '#d4a017', 'Low-level process', 'Image', 'Image', ['noise removal,', 'image sharpening']) +
      box(240, '#e07b1a', 'Mid-level process', 'Image', 'Attributes', ['object recognition,', 'segmentation']) +
      box(490, '#c0392b', 'High-level process', 'Attributes', 'Understanding', ['scene understanding,', 'autonomous navigation']) +
      `<path d="M212 95 h24 M452 95 h34" stroke="var(--muted)" stroke-width="2" marker-end="url(#ar1)"/>
       <defs><marker id="ar1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>
       <line x1="466" y1="10" x2="466" y2="200" stroke="var(--bad)" stroke-width="2" stroke-dasharray="5 4"/>
       <text x="466" y="222" text-anchor="middle" font-size="13" font-weight="600" fill="var(--bad)">This course stops here (no high-level processing)</text>`, 'Low, mid and high-level processes'));
  };

  V['ch1-steps'] = function (el) {
    el.append(tag('Diagram', true));
    const b = (x, y, t1, t2, col) => `<g transform="translate(${x},${y})"><rect width="150" height="46" rx="8" fill="var(--surface)" stroke="${col || 'var(--ink-2)'}" stroke-width="1.6"/><text x="75" y="${t2 ? 20 : 28}" text-anchor="middle" font-size="13" font-weight="600">${t1}</text>${t2 ? `<text x="75" y="36" text-anchor="middle" font-size="13" font-weight="600">${t2}</text>` : ''}</g>`;
    const a = (d) => `<path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#ar2)"/>`;
    el.insertAdjacentHTML('beforeend', svg(700, 330,
      `<defs><marker id="ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>` +
      b(20, 262, 'Problem domain', '', 'var(--muted)') + b(20, 182, 'Image', 'acquisition') + b(20, 102, 'Image', 'enhancement') + b(20, 22, 'Image', 'restoration') +
      b(275, 22, 'Morphological', 'processing') + b(530, 22, 'Segmentation') + b(530, 102, 'Feature', 'extraction') + b(530, 182, 'Image', 'classification') +
      b(275, 150, 'Colour image', 'processing', 'var(--warn)') + b(275, 230, 'Image', 'compression', 'var(--warn)') +
      a('M95 262 V230') + a('M95 182 V150') + a('M95 102 V70') + a('M170 45 H273') + a('M425 45 H528') + a('M605 68 V100') + a('M605 148 V180') +
      `<text x="350" y="316" text-anchor="middle" font-size="12.5" class="muted">Orange boxes (colour, compression) support any stage. Arrows show the typical flow from the problem domain to a result.</text>`, 'Fundamental steps in digital image processing'));
  };

  V['ch1-apps'] = function (el) {
    el.append(tag('Generated live', true));
    const ph = IP.phantom(256), sc = IP.scene(256), pat = IP.pattern(256);
    const p1 = UI.panel('<b>Medical</b>: pseudo-colour of a scan'), p2 = UI.panel('<b>Surveillance</b>: change detection |frame₂ − frame₁|'), p3 = UI.panel('<b>Automotive</b>: edge map (Sobel)'), p4 = UI.panel('<b>OCR</b>: thresholding text to binary');
    const lut = (v) => { const t = v / 255; return [255 * Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 3))), 255 * Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 2))), 255 * Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 1)))]; };
    const pc = new IP.RGB(256, 256); ph.d.forEach((v, i) => { const [r, g, b] = lut(v); pc.r[i] = r; pc.g[i] = g; pc.b[i] = b; });
    IP.show(pc, p1.canvas);
    const moved = sc.clone(); for (let y = 196; y < 236; y++) for (let x = 200; x < 230; x++) moved.d[y * 256 + x] = 20;
    IP.show(IP.combine(moved, sc, (a, b) => Math.abs(a - b) * 3), p2.canvas);
    const gx = IP.filter(sc, IP.K.sobelX), gy = IP.filter(sc, IP.K.sobelY);
    IP.show(IP.combine(gx, gy, (a, b) => Math.hypot(a, b)), p3.canvas, 'minmax');
    IP.show(pat.map((v) => (v > 100 ? 255 : 0)), p4.canvas);
    el.append(UI.panels(p1, p2, p3, p4));
  };

  // ================= Lecture 2 =================
  V['ch2-profile'] = function (el) {
    el.append(tag());
    const img = IP.scene(256);
    const p = UI.panel('Image with the selected row');
    const plot = h('canvas', { class: 'plot' });
    let row = 200;
    const draw = () => {
      const cv = p.canvas; IP.show(img, cv);
      const c = cv.getContext('2d'); c.strokeStyle = '#ff3b30'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, row); c.lineTo(256, row); c.stroke();
      const v = Array.from(img.d.slice(row * 256, row * 256 + 256));
      UI.plot.signal(plot, [{ data: v, mode: 'line', label: `x = [x₀ … x₂₅₅], row ${row}` }], { ymin: 0, ymax: 255, yticks: [0, 128, 255], xticks: [0, 64, 128, 192, 255], xlabel: 'column index n', ylabel: 'intensity' });
    };
    el.append(UI.controls(UI.slider('Row', 0, 255, 1, row, (v) => { row = v; draw(); })), h('div', { class: 'split wide-left' }, h('div', { class: 'plot-box' }, plot), p.el));
    draw();
  };

  V['ch2-vecops'] = function (el) {
    el.append(tag());
    const base = IP.scene(256);
    let alpha = 1.4, noise = 0;
    const p1 = UI.panel('<b>x</b> (original)'), p2 = UI.panel('');
    const plot = h('canvas', { class: 'plot' });
    const draw = () => {
      const n = noise ? IP.addNoise(new IP.Gray(256, 256), 'gaussian', { sigma: noise }, 4).map((v) => v) : null;
      const rnd = IP.rng(4);
      const y = base.map((v) => alpha * v + (noise ? noise * IP.gaussRand(rnd) : 0));
      IP.show(base, p1.canvas); IP.show(y, p2.canvas);
      p2.setLabel(`<b>y = ${alpha.toFixed(1)}·x${noise ? ' + noise' : ''}</b> (clipped to 0–255)`);
      const row = 120;
      UI.plot.signal(plot, [
        { data: Array.from(base.d.slice(row * 256, row * 256 + 256)), label: 'x (row 120)' },
        { data: Array.from(y.d.slice(row * 256, row * 256 + 256), (v) => Math.min(255, Math.max(0, v))), label: 'y', color: cssVar('--warn') }],
        { ymin: 0, ymax: 255, yticks: [0, 128, 255], xticks: [0, 128, 255], xlabel: 'n', H: 180 });
      void n;
    };
    el.append(UI.controls(UI.slider('α (scalar)', 0.2, 2.5, 0.1, alpha, (v) => { alpha = v; draw(); }, (v) => v.toFixed(1)), UI.slider('Added noise σ', 0, 60, 2, noise, (v) => { noise = v; draw(); })),
      UI.panels(p1, p2), h('div', { class: 'plot-box', style: { marginTop: '10px' } }, plot));
    draw();
  };

  V['ch2-arith'] = function (el) {
    el.append(tag());
    const A = IP.scene(256);
    const grad = new IP.Gray(256, 256); for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) grad.d[y * 256 + x] = x;
    const mask = new IP.Gray(256, 256); for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) mask.d[y * 256 + x] = (x - 128) ** 2 + (y - 128) ** 2 < 90 ** 2 ? 1 : 0;
    const B2 = A.clone(); for (let y = 196; y < 236; y++) for (let x = 200; x < 232; x++) B2.d[y * 256 + x] = 25; // scene with an extra object
    let op = 'add', C = 80, over = 'clip';
    const pA = UI.panel('<b>P₁</b>'), pB = UI.panel('<b>P₂</b>'), pQ = UI.panel('<b>Q</b>');
    const info = h('div', { class: 'readout' });
    const draw = () => {
      let B, Q, f;
      switch (op) {
        case 'add': B = grad; f = (a, b) => a + b; break;
        case 'addc': B = null; f = (a) => a + C; break;
        case 'sub': B = B2; f = (a, b) => a - b; break;
        case 'abs': B = B2; f = (a, b) => Math.abs(a - b); break;
        case 'mul': B = mask; f = (a, b) => a * b; break;
        case 'mulc': B = null; f = (a) => a * (C / 50); break;
        case 'div': B = grad.map((v) => 0.25 + v / 255); f = (a, b) => a / b; break;
        default: B = null; f = (a) => a / Math.max(0.1, C / 50);
      }
      Q = B ? IP.combine(A, B, f) : A.map((a) => f(a));
      IP.show(A, pA.canvas);
      if (B) { IP.show(B, pB.canvas, op === 'mul' || op === 'div' ? 'minmax' : 'clip'); pB.el.style.display = ''; } else pB.el.style.display = 'none';
      let lo = Infinity, hi = -Infinity; Q.d.forEach((v) => { lo = Math.min(lo, v); hi = Math.max(hi, v); });
      IP.show(Q, pQ.canvas, over === 'clip' ? 'clip' : 'minmax');
      const names = { add: 'Q(i,j) = P₁(i,j) + P₂(i,j)', addc: `Q(i,j) = P₁(i,j) + C   (C = ${C})`, sub: 'Q(i,j) = P₁(i,j) − P₂(i,j)', abs: 'Q = |P₁(i,j) − P₂(i,j)|', mul: 'Q(i,j) = P₁(i,j) × P₂(i,j)   (P₂ = binary mask)', mulc: `Q(i,j) = P₁(i,j) × C   (C = ${(C / 50).toFixed(2)})`, div: 'Q(i,j) = P₁(i,j) ÷ P₂(i,j)', divc: `Q(i,j) = P₁(i,j) ÷ C   (C = ${Math.max(0.1, C / 50).toFixed(2)})` };
      pB.setLabel({ add: '<b>P₂</b>: horizontal ramp 0→255', sub: '<b>P₂</b>: same scene + a new dark object', abs: '<b>P₂</b>: same scene + a new dark object', mul: '<b>P₂</b>: binary mask (0/1)', div: '<b>P₂</b>: shading pattern 0.25→1.25' }[op] || '');
      pQ.setLabel(`<b>Q</b> — ${over === 'clip' ? 'clipped to [0,255]' : 'rescaled min→0, max→255'}`);
      info.innerHTML = `<b>${names[op]}</b><br>Raw result range: [${lo.toFixed(0)}, ${hi.toFixed(0)}] ${hi > 255 || lo < 0 ? '→ outside 0–255, so it must be clipped or rescaled for an 8-bit display' : '→ fits in 8 bits'}`;
    };
    el.append(UI.controls(
      UI.select('Operation', [['add', 'Add two images'], ['addc', 'Add a constant C'], ['sub', 'Subtract (P₁ − P₂)'], ['abs', 'Absolute difference'], ['mul', 'Multiply by a mask'], ['mulc', 'Multiply by constant'], ['div', 'Divide two images'], ['divc', 'Divide by constant']], op, (v) => { op = v; draw(); }),
      UI.slider('C', -100, 150, 5, C, (v) => { C = v; draw(); }),
      UI.seg('Overflow', [['clip', 'Clip'], ['scale', 'Rescale']], over, (v) => { over = v; draw(); })), h('div', { class: 'panels n3' }, pA.el, pB.el, pQ.el), info);
    draw();
  };

  V['ch2-signal'] = function (el) {
    el.append(tag());
    let fs = 16, bits = 3, freq = 2;
    const plot = h('canvas', { class: 'plot' });
    const info = h('div', { class: 'readout' });
    const x = (t) => 0.5 + 0.42 * Math.sin(2 * Math.PI * freq * t) * Math.cos(2 * Math.PI * 0.35 * t);
    const draw = () => {
      const cont = Array.from({ length: 400 }, (_, i) => [i / 399, x(i / 399)]);
      const L = 2 ** bits;
      const samples = Array.from({ length: fs + 1 }, (_, n) => [n / fs, x(n / fs)]);
      const quant = samples.map(([t, v]) => [t, Math.round(v * (L - 1)) / (L - 1)]);
      let err = 0; samples.forEach(([, v], i) => { err = Math.max(err, Math.abs(v - quant[i][1])); });
      UI.plot.signal(plot, [
        { data: cont, mode: 'line', color: cssVar('--line-2'), width: 2, label: 'x(t) continuous' },
        { data: samples, mode: 'stem', color: cssVar('--accent'), label: 'x[n] samples' },
        { data: quant, mode: 'dots', color: cssVar('--warn'), r: 3.6, label: `quantized (${L} levels)` },
        { data: quant, mode: 'line', color: cssVar('--warn'), width: 1, dash: [3, 3] },
      ], { xmin: 0, xmax: 1, ymin: 0, ymax: 1, xticks: [0, 0.25, 0.5, 0.75, 1], yticks: Array.from({ length: Math.min(L, 9) }, (_, i) => +(i / (Math.min(L, 9) - 1)).toFixed(2)), xlabel: 'time / position t', W: 620, H: 260 });
      const nyq = 2 * (freq + 0.35);
      info.innerHTML = `Sampling interval Δt = 1/${fs} · ${fs + 1} samples · ${bits}-bit quantization → ${L} levels, max quantization error ≈ <b>${err.toFixed(3)}</b> (≤ half a step = ${(0.5 / (L - 1)).toFixed(3)})<br>${fs < nyq ? '<b style="color:var(--bad)">Undersampling:</b> the samples are too sparse to follow the fast oscillations — high-frequency detail is lost.' : 'Sampling is dense enough to follow the signal.'}`;
    };
    el.append(UI.controls(UI.slider('Samples per unit', 4, 60, 1, fs, (v) => { fs = v; draw(); }), UI.slider('Bits', 1, 6, 1, bits, (v) => { bits = v; draw(); }), UI.slider('Signal frequency', 1, 6, 1, freq, (v) => { freq = v; draw(); })), h('div', { class: 'plot-box' }, plot), info);
    draw();
  };

  V['ch2-quantramp'] = function (el) {
    el.append(tag());
    const cv = h('canvas', { class: 'plot', style: { borderRadius: '6px', imageRendering: 'pixelated' } });
    const info = h('div', { class: 'readout' });
    const draw = (bits) => {
      cv.width = 512; cv.height = 60; cv.style.aspectRatio = '512/60';
      const c = cv.getContext('2d'), L = 2 ** bits;
      for (let x = 0; x < 512; x++) { const v = (x / 511) * 255; const q = L === 1 ? 0 : Math.min(L - 1, Math.floor(v / (256 / L))) * (255 / (L - 1)); c.fillStyle = `rgb(${q},${q},${q})`; c.fillRect(x, 0, 1, 60); }
      info.innerHTML = `${bits}-bit quantization → <b>${L}</b> discrete levels (0 … ${L - 1}). Fewer bits = smaller data but a larger quantization error and visible “false contours”.`;
    };
    el.append(UI.controls(UI.slider('Bits', 1, 8, 1, 2, draw)), cv, info);
    draw(2);
  };

  V['ch2-pipeline'] = function (el) {
    el.append(tag('Diagram', true));
    const b = (x, t, s, col) => `<g transform="translate(${x},40)"><rect width="140" height="64" rx="10" fill="var(--surface)" stroke="${col}" stroke-width="2"/><text x="70" y="28" text-anchor="middle" font-weight="700" font-size="14">${t}</text><text x="70" y="48" text-anchor="middle" font-size="12" class="muted">${s}</text></g>`;
    const ar = (x) => `<path d="M${x} 72h30" stroke="var(--muted)" stroke-width="2" marker-end="url(#ar3)"/>`;
    el.insertAdjacentHTML('beforeend', svg(720, 150, `<defs><marker id="ar3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>` +
      b(10, 'Analog signal', 'x(t) — light, sound', 'var(--line-2)') + ar(152) + b(190, 'Sensor', 'camera / microphone', 'var(--ink-2)') + ar(332) + b(370, 'Sampling', 'digitize the coordinates', 'var(--accent)') + ar(512) + b(550, 'Quantization', 'digitize the amplitude', 'var(--warn)') +
      `<text x="360" y="136" text-anchor="middle" font-size="13" class="muted">Result: a digital signal x[n] / digital image f(x, y) — finite samples, finite levels</text>`, 'Digitization pipeline'));
  };

  // ================= Lecture 3 =================
  V['ch3-acq'] = function (el) {
    el.append(tag('Diagram', true));
    el.insertAdjacentHTML('beforeend', svg(720, 220, `
      <defs><marker id="ar4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--warn)"/></marker></defs>
      <circle cx="70" cy="60" r="26" fill="#ffd34d" stroke="#d4a017" stroke-width="2"/><text x="70" y="112" text-anchor="middle" font-size="13" font-weight="600">1. Illumination</text><text x="70" y="128" text-anchor="middle" font-size="12" class="muted">energy source</text>
      <path d="M100 70 L250 130" stroke="var(--warn)" stroke-width="2" stroke-dasharray="6 4" marker-end="url(#ar4)"/>
      <rect x="250" y="110" width="90" height="70" rx="6" fill="#7a9b5c"/><circle cx="295" cy="100" r="22" fill="#d58a52"/><text x="295" y="200" text-anchor="middle" font-size="13" font-weight="600">Scene</text><text x="295" y="215" text-anchor="middle" font-size="12" class="muted">reflects / absorbs</text>
      <path d="M342 130 L452 110" stroke="var(--warn)" stroke-width="2" stroke-dasharray="6 4" marker-end="url(#ar4)"/>
      <ellipse cx="470" cy="108" rx="12" ry="44" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/><text x="470" y="176" text-anchor="middle" font-size="13" font-weight="600">2. Optical system</text><text x="470" y="192" text-anchor="middle" font-size="12" class="muted">lens</text>
      <path d="M484 108 L572 108" stroke="var(--warn)" stroke-width="2" stroke-dasharray="6 4" marker-end="url(#ar4)"/>
      <g transform="translate(578,68)">${Array.from({ length: 25 }, (_, i) => `<rect x="${(i % 5) * 16}" y="${Math.floor(i / 5) * 16}" width="15" height="15" fill="rgb(${60 + ((i * 37) % 160)},${60 + ((i * 37) % 160)},${60 + ((i * 37) % 160)})"/>`).join('')}</g>
      <text x="618" y="176" text-anchor="middle" font-size="13" font-weight="600">3. Sensor system</text><text x="618" y="192" text-anchor="middle" font-size="12" class="muted">optical → electrical → digital</text>`, 'Image acquisition components'));
  };

  V['ch3-eye'] = function (el) {
    el.append(tag());
    let ho = 15, d0 = 100, di = 17;
    const fig = h('div');
    const info = h('div', { class: 'readout' });
    const draw = () => {
      const hi = (ho * di) / (d0 * 1000) * 1000; // mm (ho in m, d0 in m, di in mm)
      const W = 700, cy = 120, lensX = 520, scaleH = 70 / 30;
      const objH = Math.min(100, ho * scaleH), imgH = Math.min(80, hi * 8);
      const objX = 40;
      fig.innerHTML = svg(W, 250, `
        <line x1="20" y1="${cy}" x2="690" y2="${cy}" stroke="var(--line-2)" stroke-dasharray="4 4"/>
        <line x1="${objX}" y1="${cy}" x2="${objX}" y2="${cy - objH}" stroke="var(--good)" stroke-width="5" stroke-linecap="round"/>
        <text x="${objX + 10}" y="${cy - objH / 2}" font-size="13" fill="var(--good)">h₀ = ${ho} m</text>
        <ellipse cx="${lensX}" cy="${cy}" rx="10" ry="60" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/>
        <path d="M${lensX + 50} ${cy - 90} A 110 110 0 0 1 ${lensX + 50} ${cy + 90}" fill="none" stroke="var(--muted)" stroke-width="2"/>
        <line x1="${lensX + 120}" y1="${cy}" x2="${lensX + 120}" y2="${cy + imgH}" stroke="var(--bad)" stroke-width="5" stroke-linecap="round"/>
        <text x="${lensX + 128}" y="${cy + imgH / 2 + 4}" font-size="13" fill="var(--bad)">hᵢ</text>
        <line x1="${objX}" y1="${cy - objH}" x2="${lensX + 120}" y2="${cy + imgH}" stroke="var(--warn)" stroke-width="1.5"/>
        <line x1="${objX}" y1="${cy}" x2="${lensX + 120}" y2="${cy}" stroke="var(--warn)" stroke-width="1.5"/>
        <text x="${lensX}" y="${cy - 68}" text-anchor="middle" font-size="12" class="muted">lens centre C</text>
        <text x="${(objX + lensX) / 2}" y="${cy + 40}" text-anchor="middle" font-size="13">d₀ = ${d0} m</text>
        <text x="${lensX + 60}" y="${cy + 110}" text-anchor="middle" font-size="13">dᵢ = ${di} mm</text>
        <text x="${lensX + 60}" y="${cy - 100}" text-anchor="middle" font-size="12" class="muted">retina</text>`, 'Similar triangles in the eye');
      info.innerHTML = `Similar triangles: hᵢ / h₀ = dᵢ / d₀ → hᵢ = h₀·dᵢ / d₀ = ${ho} m × ${di} mm / ${d0} m = <b>${hi.toFixed(3)} mm</b> · magnification m = ${(hi / (ho * 1000)).toExponential(2)}`;
    };
    el.append(UI.controls(UI.slider('Object height h₀ (m)', 1, 30, 1, ho, (v) => { ho = v; draw(); }), UI.slider('Distance d₀ (m)', 10, 300, 5, d0, (v) => { d0 = v; draw(); }), UI.slider('Lens–retina dᵢ (mm)', 14, 20, 1, di, (v) => { di = v; draw(); })), fig, info);
    draw();
  };

  V['ch3-aperture'] = function (el) {
    el.append(tag('Conceptual simulation'));
    const img = IP.pattern(256);
    let ap = 4;
    const p = UI.panel(''), plot = h('canvas', { class: 'plot' });
    const draw = () => {
      const geo = ap * 0.55, diff = 9 / ap, sigma = Math.hypot(geo, diff), light = Math.min(1, (ap / 6) ** 2);
      const n = Math.min(31, 2 * Math.ceil(2.5 * sigma) + 1);
      const out = IP.filter(img, IP.kernel.gaussian(n, sigma)).map((v) => v * (0.25 + 0.75 * light));
      IP.show(out, p.canvas);
      p.setLabel(`Aperture ${ap} · blur = <b>${sigma.toFixed(1)} px</b> · light ${(light * 100).toFixed(0)}%`);
      const xs = Array.from({ length: 40 }, (_, i) => 0.5 + i * 0.3);
      UI.plot.signal(plot, [
        { data: xs.map((a) => [a, a * 0.55]), label: 'blur from large aperture', color: cssVar('--warn') },
        { data: xs.map((a) => [a, 9 / a]), label: 'blur from diffraction', color: cssVar('--violet') },
        { data: xs.map((a) => [a, Math.hypot(a * 0.55, 9 / a)]), label: 'total blur', color: cssVar('--accent'), width: 3 },
        { data: [[ap, sigma]], mode: 'dots', color: cssVar('--bad'), r: 5 }],
        { xmin: 0.5, xmax: 12.2, ymin: 0, ymax: 12, xticks: [1, 3, 6, 9, 12], yticks: [0, 4, 8, 12], xlabel: 'aperture size', ylabel: 'blur', W: 360, H: 260 });
    };
    el.append(UI.controls(UI.slider('Aperture size', 1, 12, 0.5, ap, (v) => { ap = v; draw(); })), h('div', { class: 'split' }, p.el, h('div', { class: 'plot-box' }, plot)));
    draw();
  };

  V['ch3-illum'] = function (el) {
    el.append(tag());
    const r = IP.scene(256).map((v) => v / 255); // reflectance 0..1
    let mode = 'spot', strength = 255;
    const p1 = UI.panel('<b>i(x,y)</b> illumination'), p2 = UI.panel('<b>r(x,y)</b> reflectance (0…1)'), p3 = UI.panel('<b>f(x,y) = i·r</b>');
    const draw = () => {
      const I = new IP.Gray(256, 256);
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
        let v = 1;
        if (mode === 'spot') v = Math.exp(-(((x - 80) ** 2 + (y - 90) ** 2) / (2 * 95 * 95)));
        if (mode === 'side') v = 0.15 + 0.85 * (x / 255);
        I.d[y * 256 + x] = strength * v;
      }
      IP.show(I, p1.canvas); IP.show(r.map((v) => v * 255), p2.canvas); IP.show(IP.combine(I, r, (a, b) => a * b), p3.canvas);
    };
    el.append(UI.controls(UI.seg('Light', [['uniform', 'Uniform'], ['spot', 'Spotlight'], ['side', 'From the right']], mode, (v) => { mode = v; draw(); }), UI.slider('Source strength', 40, 255, 5, strength, (v) => { strength = v; draw(); })), UI.panels(p1, p2, p3));
    draw();
  };

  V['ch3-scanline'] = function (el) {
    el.append(tag());
    const img = IP.phantom(256);
    const row = 120, line = Array.from(img.d.slice(row * 256, row * 256 + 256));
    let ns = 32, bits = 3;
    const p = UI.panel('Continuous image with scan line A–B');
    IP.show(img, p.canvas);
    const c = p.canvas.getContext('2d'); c.strokeStyle = '#ff3b30'; c.setLineDash([5, 4]); c.lineWidth = 2; c.beginPath(); c.moveTo(0, row); c.lineTo(256, row); c.stroke();
    c.fillStyle = '#ff3b30'; c.font = 'bold 14px sans-serif'; c.fillText('A', 4, row - 6); c.fillText('B', 240, row - 6);
    const plot = h('canvas', { class: 'plot' }), plot2 = h('canvas', { class: 'plot' });
    const draw = () => {
      const L = 2 ** bits, step = 255 / (L - 1);
      const samp = Array.from({ length: ns }, (_, k) => { const x = Math.round((k * 255) / (ns - 1)); return [x, line[x]]; });
      const q = samp.map(([x, v]) => [x, Math.round(v / step) * step]);
      UI.plot.signal(plot, [{ data: line.map((v, i) => [i, v]), color: cssVar('--line-2'), label: '(b) continuous scan line' }, { data: samp, mode: 'stem', label: `(c) ${ns} samples` }, { data: q, mode: 'dots', color: cssVar('--warn'), label: `quantized to ${L} levels` }],
        { xmin: 0, xmax: 255, ymin: 0, ymax: 260, yticks: Array.from({ length: L }, (_, i) => Math.round(i * step)).filter((_, i, a) => a.length <= 9 || i % Math.ceil(a.length / 8) === 0), xticks: [0, 128, 255], xlabel: 'position along A → B', W: 560, H: 220 });
      UI.plot.signal(plot2, [{ data: q, mode: 'dots', color: cssVar('--ink'), r: 3.4, label: '(d) digital scan line' }], { xmin: 0, xmax: 255, ymin: 0, ymax: 260, yticks: [0, 128, 255], xticks: [0, 128, 255], W: 560, H: 150 });
    };
    el.append(UI.controls(UI.slider('Samples (sampling)', 8, 96, 4, ns, (v) => { ns = v; draw(); }), UI.slider('Bits (quantization)', 1, 5, 1, bits, (v) => { bits = v; draw(); })),
      h('div', { class: 'split', style: { gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr)' } }, p.el, h('div', {}, h('div', { class: 'plot-box' }, plot), h('div', { class: 'plot-box', style: { marginTop: '8px' } }, plot2))));
    draw();
  };

  V['ch3-sampquant'] = function (el) {
    el.append(tag());
    let src = IP.scene(256), f = 4, bits = 8;
    const p1 = UI.panel('<b>Original</b> 256×256, 8-bit'), p2 = UI.panel('');
    p2.canvas.classList.add('pixel');
    const info = h('div', { class: 'readout' });
    const draw = () => {
      IP.show(src, p1.canvas);
      IP.show(IP.quantize(IP.subsample(src, f), bits), p2.canvas);
      const n = 256 / f;
      p2.setLabel(`<b>${n}×${n}</b> samples, <b>${bits}-bit</b> (${2 ** bits} levels)`);
      info.innerHTML = `Spatial resolution: ${n}×${n} = ${(n * n).toLocaleString()} pixels (each shown as a ${f}×${f} block). Intensity resolution: k = ${bits} bits → L = 2<sup>k</sup> = ${2 ** bits}. Storage b = M·N·k = ${n}×${n}×${bits} = <b>${(n * n * bits).toLocaleString()} bits</b> = ${((n * n * bits) / 8 / 1024).toFixed(2)} KB.`;
    };
    el.append(UI.controls(UI.imagePicker(['scene', 'pattern', 'fruit', 'phantom'], 'scene', (im) => { src = im; draw(); }),
      UI.select('Sampling', [[1, '256×256'], [2, '128×128'], [4, '64×64'], [8, '32×32'], [16, '16×16']].map(([a, b]) => [String(a), b]), String(f), (v) => { f = +v; draw(); }),
      UI.slider('Bits k', 1, 8, 1, bits, (v) => { bits = v; draw(); })), UI.panels(p1, p2), info);
    draw();
  };

  V['ch3-represent'] = function (el) {
    el.append(tag('Interactive · three views of the same image'));
    // small "D" image with values 0, .5, 1 like Fig. 2.18
    const N = 24, im = new IP.Gray(N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let v = 0;
      if (x >= 3 && x < 21 && y >= 3 && y < 21) v = 0.5;
      const inD = (x >= 7 && x < 16 && y >= 6 && y < 18) || ((x - 13) ** 2 / 25 + (y - 12) ** 2 / 36 < 1 && x >= 13);
      const hole = (x >= 9 && x < 13 && y >= 8 && y < 16) || ((x - 13) ** 2 / 9 + (y - 12) ** 2 / 16 < 1 && x >= 13);
      if (inD && !hole) v = 1;
      im.d[y * N + x] = v;
    }
    const surf = h('canvas', { class: 'plot' });
    const W = 360, H = 260;
    const c = UI.plot.setup(surf, W, H), C = UI.plot.colors();
    const P = (x, y, z) => [W / 2 + (y - x) * 6.2, 70 + (x + y) * 3.1 - z * 60];
    c.strokeStyle = C.accent; c.lineWidth = 1;
    for (let x = 0; x < N; x++) { c.beginPath(); for (let y = 0; y < N; y++) { const [a, b] = P(x, y, im.d[x * N + y]); y ? c.lineTo(a, b) : c.moveTo(a, b); } c.stroke(); }
    for (let y = 0; y < N; y++) { c.beginPath(); for (let x = 0; x < N; x++) { const [a, b] = P(x, y, im.d[x * N + y]); x ? c.lineTo(a, b) : c.moveTo(a, b); } c.stroke(); }
    c.fillStyle = C.muted; c.fillText('f(x, y)', W / 2 - 20, 14); c.fillText('x', 20, 160); c.fillText('y', W - 30, 160);
    const p2 = UI.panel('<b>(b)</b> visual intensity array'); p2.canvas.classList.add('pixel'); IP.show(im.map((v) => v * 255), p2.canvas);
    const rows = []; for (let y = 4; y < 12; y++) { const r = []; for (let x = 4; x < 14; x++) r.push(im.d[y * N + x] === 0.5 ? '.5' : im.d[y * N + x]); rows.push(r); }
    el.append(h('div', { class: 'panels n3' },
      h('figure', { class: 'panel' }, h('div', { class: 'plot-box' }, surf), h('figcaption', { html: '<b>(a)</b> image plotted as a surface' })), p2.el,
      h('figure', { class: 'panel', html: mat(rows, { cls: 'small' }) + '<figcaption><b>(c)</b> 2-D numerical array (part): 0 = black, .5 = gray, 1 = white</figcaption>' })));
  };

  V['ch3-coords'] = function (el) {
    el.append(tag('Diagram', true));
    let cells = '';
    for (let i = 0; i < 6; i++) for (let j = 0; j < 8; j++) cells += `<rect x="${90 + j * 46}" y="${50 + i * 34}" width="44" height="32" rx="3" fill="${i === 3 && j === 4 ? 'var(--accent)' : 'var(--surface-2)'}" stroke="var(--line)"/><text x="${112 + j * 46}" y="${71 + i * 34}" text-anchor="middle" font-size="10.5" class="${i === 3 && j === 4 ? '' : 'muted'}" ${i === 3 && j === 4 ? 'fill="#fff"' : ''}>${i},${j}</text>`;
    el.insertAdjacentHTML('beforeend', svg(560, 300, `
      <defs><marker id="ar5" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--ink)"/></marker></defs>
      ${cells}
      <circle cx="90" cy="50" r="5" fill="var(--bad)"/><text x="60" y="40" font-size="12" fill="var(--bad)">origin (0,0)</text>
      <path d="M90 34 H470" stroke="var(--ink)" stroke-width="2" marker-end="url(#ar5)"/><text x="480" y="38" font-size="14" font-weight="700">y</text><text x="290" y="26" text-anchor="middle" font-size="12" class="muted">columns (c): y = 0 … N−1</text>
      <path d="M76 50 V268" stroke="var(--ink)" stroke-width="2" marker-end="url(#ar5)"/><text x="66" y="286" font-size="14" font-weight="700">x</text>
      <text x="40" y="160" font-size="12" class="muted" transform="rotate(-90 40 160)" text-anchor="middle">rows (r): x = 0 … M−1</text>
      <text x="290" y="276" text-anchor="middle" font-size="12.5">Highlighted pixel f(3, 4): row x = 3, column y = 4 · centre of an M×N image = (⌊M/2⌋, ⌊N/2⌋) = (3, 4)</text>`, 'Coordinate convention'));
  };

  V['ch3-interp'] = function (el) {
    el.append(tag());
    let src = IP.pattern(256), z = 8;
    const ps = ['nearest', 'bilinear', 'bicubic'].map((m) => UI.panel(`<b>${m}</b>`));
    ps.forEach((p) => p.canvas.classList.add('pixel'));
    const info = h('div', { class: 'readout' });
    const crop0 = (im, x0, y0, n) => { const o = new IP.Gray(n, n); for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) o.d[y * n + x] = im.d[(y0 + y) * im.w + x0 + x]; return o; };
    const draw = () => {
      const n = Math.round(256 / z), cr = crop0(src, 176, 6, Math.min(n, 80));
      ['nearest', 'bilinear', 'bicubic'].forEach((m, i) => IP.show(IP.resize(cr, 256, 256, m), ps[i].canvas));
      ps[0].setLabel('<b>Nearest neighbour</b> — copies the closest pixel (blocky)');
      ps[1].setLabel('<b>Bilinear</b> — weighted average of 4 neighbours (smoother)');
      ps[2].setLabel('<b>Bicubic</b> — uses 16 neighbours (sharpest, smooth)');
      info.innerHTML = `A ${cr.w}×${cr.w} crop (the letter “a”) enlarged ${(256 / cr.w).toFixed(1)}× to 256×256 — every new pixel value is <b>estimated</b> from known pixels.`;
    };
    el.append(UI.controls(UI.slider('Zoom factor', 3, 16, 1, z, (v) => { z = v; draw(); }, (v) => '≈' + v + '×')), UI.panels(...ps), info);
    draw();
  };

  V['ch3-storage'] = function (el) {
    el.append(tag('Calculator'));
    const inp = (v) => h('input', { type: 'number', value: v, min: 1, style: { width: '90px', height: '32px', borderRadius: '8px', border: '1px solid var(--line-2)', padding: '0 8px', background: 'var(--surface)' } });
    const M = inp(1024), N = inp(768), k = inp(8), ch = UI.select('Channels', [['1', 'Grayscale (1)'], ['3', 'RGB (3)']], '1', () => calc());
    const out = h('div', { class: 'readout' });
    const calc = () => {
      const bpp = +k.value * +ch.select.value, bits = +M.value * +N.value * bpp, B = bits / 8;
      out.innerHTML = `Size = rows × cols × bpp = ${(+M.value).toLocaleString()} × ${(+N.value).toLocaleString()} × ${bpp} = <b>${bits.toLocaleString()} bits</b><br>÷ 8 = <b>${B.toLocaleString()} bytes</b> · ÷ 1024 = <b>${(B / 1024).toLocaleString(undefined, { maximumFractionDigits: 3 })} KB</b> · ÷ 1024 = <b>${(B / 1048576).toLocaleString(undefined, { maximumFractionDigits: 4 })} MB</b><br>Gray levels L = 2<sup>${k.value}</sup> = ${(2 ** +k.value).toLocaleString()} per channel`;
    };
    [M, N, k].forEach((i) => i.addEventListener('input', calc));
    el.append(UI.controls(h('label', { class: 'ctl' }, h('span', { class: 'ctl-label' }, 'Rows M'), M), h('label', { class: 'ctl' }, h('span', { class: 'ctl-label' }, 'Cols N'), N), h('label', { class: 'ctl' }, h('span', { class: 'ctl-label' }, 'Bits/channel k'), k), ch), out);
    calc();
  };

  V['ch3-venn'] = function (el) {
    el.append(tag('Diagram', true));
    const cell = (x, y, label, body) => `<g transform="translate(${x},${y})"><rect width="150" height="110" rx="6" fill="var(--surface)" stroke="var(--line-2)"/>${body}<text x="75" y="128" text-anchor="middle" font-size="13" font-weight="600">${label}</text></g>`;
    const A = 'M40 55 m-30 0 a30 30 0 1 0 60 0 a30 30 0 1 0 -60 0', B = 'M85 60 m-30 0 a30 30 0 1 0 60 0 a30 30 0 1 0 -60 0';
    const sh = 'var(--accent)';
    const defs = `<defs><clipPath id="cA"><path d="${A}"/></clipPath><clipPath id="cB"><path d="${B}"/></clipPath>
      <mask id="mNotB"><rect width="150" height="110" fill="#fff"/><path d="${B}" fill="#000"/></mask><mask id="mNotA"><rect width="150" height="110" fill="#fff"/><path d="${A}" fill="#000"/></mask></defs>`;
    const outline = `<path d="${A}" fill="none" stroke="var(--ink-2)"/><path d="${B}" fill="none" stroke="var(--ink-2)"/><text x="26" y="30" font-size="11">A</text><text x="118" y="30" font-size="11">B</text>`;
    el.insertAdjacentHTML('beforeend', svg(690, 300, defs +
      cell(10, 10, 'A ∪ B (union)', `<path d="${A}" fill="${sh}" opacity=".55"/><path d="${B}" fill="${sh}" opacity=".55"/>${outline}`) +
      cell(180, 10, 'A ∩ B (intersection)', `<path d="${B}" fill="${sh}" opacity=".7" clip-path="url(#cA)"/>${outline}`) +
      cell(350, 10, 'Aᶜ (complement)', `<rect width="150" height="110" rx="6" fill="${sh}" opacity=".55" mask="url(#mNotA)"/>${outline}`) +
      cell(520, 10, 'A − B = A ∩ Bᶜ', `<path d="${A}" fill="${sh}" opacity=".7" mask="url(#mNotB)"/>${outline}`) +
      cell(95, 160, 'Bᶜ', `<rect width="150" height="110" rx="6" fill="${sh}" opacity=".55" mask="url(#mNotB)"/>${outline}`) +
      cell(265, 160, 'B − A', `<path d="${B}" fill="${sh}" opacity=".7" mask="url(#mNotA)"/>${outline}`) +
      cell(435, 160, 'A ⊕ B (XOR, extra)', `<path d="${A}" fill="${sh}" opacity=".7" mask="url(#mNotB)"/><path d="${B}" fill="${sh}" opacity=".7" mask="url(#mNotA)"/>${outline}`), 'Venn diagrams of set operations'));
  };

  V['ch3-setops'] = function (el) {
    el.append(tag());
    const A = IP.phantom(256);
    let K = 3;
    const p1 = UI.panel('<b>(a)</b> original image A'), p2 = UI.panel('<b>(b)</b> complement Aᶜ = 255 − z (negative)'), p3 = UI.panel('');
    const draw = () => {
      let m = 0; A.d.forEach((v) => (m += v)); m /= A.d.length;
      const cst = K * m;
      IP.show(A, p1.canvas); IP.show(A.map((v) => 255 - v), p2.canvas); IP.show(A.map((v) => Math.max(v, cst)), p3.canvas);
      p3.setLabel(`<b>(c)</b> union A ∪ B with constant B = ${K}×mean = ${cst.toFixed(0)} → max(a, b)`);
    };
    el.append(UI.controls(UI.slider('Constant = k × mean', 1, 5, 0.5, K, (v) => { K = v; draw(); })), UI.panels(p1, p2, p3));
    draw();
  };

  V['ch3-affine'] = function (el) {
    el.append(tag());
    const T = IP.draw(256, 256, (c) => { c.fillStyle = '#1a1a1a'; c.fillRect(0, 0, 256, 256); c.fillStyle = '#e8e8e8'; c.font = 'bold 150px Georgia, serif'; c.textAlign = 'center'; c.fillText('T', 128, 182); c.strokeStyle = '#3a7bd5'; c.lineWidth = 2; c.beginPath(); c.moveTo(128, 0); c.lineTo(128, 256); c.moveTo(0, 128); c.lineTo(256, 128); c.stroke(); }).toGray();
    let type = 'rotation', a = 30, b = 0.5, interp = 'bilinear', order = 'ST';
    const p1 = UI.panel('<b>Input</b> (axes through the centre)'), p2 = UI.panel('<b>Output</b>');
    const matBox = h('div', { class: 'readout' });
    const ctlBox = h('div', { class: 'controls' });
    const fmt = (v) => (Math.abs(v) < 1e-9 ? '0' : (+v.toFixed(2)).toString());
    const build = () => {
      const r = (a * Math.PI) / 180;
      switch (type) {
        case 'identity': return { M: [1, 0, 0, 0, 1, 0, 0, 0, 1], eq: "x' = x, y' = y" };
        case 'scaling': return { M: [a / 50, 0, 0, 0, b, 0, 0, 0, 1], eq: `x' = cₓx = ${fmt(a / 50)}x, y' = c_y y = ${fmt(b)}y` };
        case 'reflection': return { M: [-1, 0, 0, 0, 1, 0, 0, 0, 1], eq: "x' = −x, y' = y  (scaling with cₓ = −1)" };
        case 'rotation': return { M: [Math.cos(r), -Math.sin(r), 0, Math.sin(r), Math.cos(r), 0, 0, 0, 1], eq: `x' = x cosθ − y sinθ, y' = x sinθ + y cosθ   (θ = ${a}°)` };
        case 'translation': return { M: [1, 0, a, 0, 1, b * 100, 0, 0, 1], eq: `x' = x + tₓ (${a}), y' = y + t_y (${fmt(b * 100)})` };
        case 'shearV': return { M: [1, b, 0, 0, 1, 0, 0, 0, 1], eq: `x' = x + s_v y  (s_v = ${fmt(b)}), y' = y` };
        case 'shearH': return { M: [1, 0, 0, b, 1, 0, 0, 0, 1], eq: `x' = x, y' = s_h x + y  (s_h = ${fmt(b)})` };
        case 'combo': {
          const S = [1.5, 0, 0, 0, 0.6, 0, 0, 0, 1], Tm = [1, 0, 40, 0, 1, 30, 0, 0, 1];
          return order === 'ST' ? { M: IP.mul3(Tm, S), eq: 'A = T·S: scale first, then translate (tₓ=40, t_y=30)' } : { M: IP.mul3(S, Tm), eq: 'A = S·T: translate first, then scale → the translation is scaled too' };
        }
      }
    };
    const draw = () => {
      const { M, eq } = build();
      IP.show(T, p1.canvas); IP.show(IP.affine(T, M, interp, 60), p2.canvas);
      const m3 = [[M[0], M[1], M[2]], [M[3], M[4], M[5]], [M[6], M[7], M[8]]].map((rw) => rw.map(fmt));
      matBox.innerHTML = `<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">${matRow([mat([["x'"], ["y'"], ['1']]), '=', mat(m3), mat([['x'], ['y'], ['1']])])}<span>${eq}<br><span class="muted">Coordinates here use x → right, y → up from the image centre so rotation looks counter-clockwise. Output pixels are filled by inverse mapping + ${interp} interpolation.</span></span></div>`;
    };
    const setCtl = () => {
      ctlBox.innerHTML = '';
      ctlBox.append(UI.select('Transformation', [['identity', 'Identity'], ['scaling', 'Scaling'], ['reflection', 'Reflection'], ['rotation', 'Rotation'], ['translation', 'Translation'], ['shearV', 'Shear (vertical)'], ['shearH', 'Shear (horizontal)'], ['combo', 'Scale + translate (order)']], type, (v) => { type = v; a = { rotation: 30, scaling: 75, translation: 40 }[v] || 0; b = { scaling: 0.6, translation: 0.3, shearV: 0.5, shearH: 0.5 }[v] || 0; setCtl(); draw(); }));
      if (type === 'rotation') ctlBox.append(UI.slider('θ (deg)', -180, 180, 5, a, (v) => { a = v; draw(); }));
      if (type === 'scaling') ctlBox.append(UI.slider('cₓ', 0.3, 2, 0.05, a / 50, (v) => { a = v * 50; draw(); }, (v) => v.toFixed(2)), UI.slider('c_y', 0.3, 2, 0.05, b, (v) => { b = v; draw(); }, (v) => v.toFixed(2)));
      if (type === 'translation') ctlBox.append(UI.slider('tₓ', -100, 100, 5, a, (v) => { a = v; draw(); }), UI.slider('t_y', -100, 100, 5, b * 100, (v) => { b = v / 100; draw(); }));
      if (type === 'shearV' || type === 'shearH') ctlBox.append(UI.slider('s', -1, 1, 0.05, b, (v) => { b = v; draw(); }, (v) => v.toFixed(2)));
      if (type === 'combo') ctlBox.append(UI.seg('Order', [['ST', 'Scale → Translate'], ['TS', 'Translate → Scale']], order, (v) => { order = v; draw(); }));
      ctlBox.append(UI.seg('Interpolation', [['nearest', 'Nearest'], ['bilinear', 'Bilinear']], interp, (v) => { interp = v; draw(); }));
    };
    setCtl();
    el.append(ctlBox, UI.panels(p1, p2), matBox);
    draw();
  };
})();
