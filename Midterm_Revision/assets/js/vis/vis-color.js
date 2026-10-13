/* Visuals for Lecture 6: colour image processing. */
(function () {
  'use strict';
  const V = (window.VIS = window.VIS || {});
  const tag = (t, stat) => h('div', { class: 'vis-tag' + (stat ? ' static' : '') }, t || (stat ? 'Figure' : 'Interactive'));
  const svg = (w, hh, inner, label) => `<svg class="svg-fig" viewBox="0 0 ${w} ${hh}" role="img" aria-label="${label || ''}">${inner}</svg>`;
  const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');

  function wl2rgb(w) {
    let r = 0, g = 0, b = 0;
    if (w >= 380 && w < 440) { r = -(w - 440) / 60; b = 1; } else if (w < 490) { g = (w - 440) / 50; b = 1; } else if (w < 510) { g = 1; b = -(w - 510) / 20; } else if (w < 580) { r = (w - 510) / 70; g = 1; } else if (w < 645) { r = 1; g = -(w - 645) / 65; } else if (w <= 780) { r = 1; }
    const f = w < 420 ? 0.3 + (0.7 * (w - 380)) / 40 : w > 700 ? 0.3 + (0.7 * (780 - w)) / 80 : 1;
    return [r * f, g * f, b * f];
  }

  V['ch6-spectrum'] = function (el) {
    el.append(tag('Electromagnetic spectrum', true));
    const cv = h('canvas', { class: 'plot', style: { borderRadius: '6px' } });
    const W = 720, H = 120;
    const c = UI.plot.setup(cv, W, H), C = UI.plot.colors();
    const x0 = 60, x1 = 660, wl = (x) => 300 + ((x - x0) / (x1 - x0)) * 500; // 300..800 nm
    for (let x = x0; x < x1; x++) { const w = wl(x); const [r, g, b] = w >= 380 && w <= 780 ? wl2rgb(w) : [0.5, 0.5, 0.5]; c.fillStyle = w >= 380 && w <= 780 ? hex(r, g, b) : C.line; c.fillRect(x, 20, 1, 50); }
    c.fillStyle = C.ink; c.font = '12px "IBM Plex Sans", sans-serif'; c.textAlign = 'center';
    [300, 400, 500, 600, 700, 800].forEach((w) => { const x = x0 + ((w - 300) / 500) * (x1 - x0); c.fillRect(x, 70, 1, 6); c.fillText(w + ' nm', x, 90); });
    c.fillStyle = C.muted; c.fillText('ultraviolet', x0 + 40, 14); c.fillText('infrared', x1 - 40, 14);
    const a = x0 + ((400 - 300) / 500) * (x1 - x0), b = x0 + ((700 - 300) / 500) * (x1 - x0);
    c.strokeStyle = C.ink; c.lineWidth = 1.5; c.beginPath(); c.moveTo(a, 104); c.lineTo(b, 104); c.stroke();
    c.fillStyle = C.ink; c.fillText('visible spectrum ≈ 400 – 700 nm', (a + b) / 2, 117);
    el.append(cv);
  };

  V['ch6-rgb-planes'] = function (el) {
    el.append(tag());
    let src = IP.fruitRGB(256), mode = 'rgb';
    const p0 = UI.panel('<b>Full-colour image</b>'), p = [UI.panel(''), UI.panel(''), UI.panel(''), UI.panel('')];
    const draw = () => {
      IP.show(src, p0.canvas);
      if (mode === 'rgb') {
        ['r', 'g', 'b'].forEach((c, i) => { IP.show(src.plane(c), p[i].canvas); p[i].setLabel(`<b>${'RGB'[i]}</b> component (gray = amount of ${['red', 'green', 'blue'][i]})`); });
        p[3].el.style.display = 'none';
      } else {
        const C = src.plane('r').map((v) => 255 - v), M = src.plane('g').map((v) => 255 - v), Y = src.plane('b').map((v) => 255 - v);
        const K = IP.combine(IP.combine(C, M, Math.min), Y, Math.min);
        const tint = (pl, rr, gg, bb) => { const o = new IP.RGB(256, 256); pl.d.forEach((v, i) => { const t = v / 255; o.r[i] = 255 - t * (255 - rr); o.g[i] = 255 - t * (255 - gg); o.b[i] = 255 - t * (255 - bb); }); return o; };
        IP.show(tint(C, 0, 255, 255), p[0].canvas); p[0].setLabel('<b>C</b> = 1 − R (cyan ink)');
        IP.show(tint(M, 255, 0, 255), p[1].canvas); p[1].setLabel('<b>M</b> = 1 − G (magenta ink)');
        IP.show(tint(Y, 255, 255, 0), p[2].canvas); p[2].setLabel('<b>Y</b> = 1 − B (yellow ink)');
        IP.show(K.map((v) => 255 - v), p[3].canvas); p[3].setLabel('<b>K</b> = min(C, M, Y) (black ink)');
        p[3].el.style.display = '';
      }
    };
    el.append(UI.controls(UI.imagePicker(['fruit', 'scene'], 'fruit', (im) => { src = im; draw(); }, { color: true }), UI.seg('Planes', [['rgb', 'R, G, B'], ['cmyk', 'C, M, Y, K']], mode, (v) => { mode = v; draw(); })),
      h('div', { class: 'panels n5', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' } }, p0.el, ...p.map((x) => x.el)));
    draw();
  };

  V['ch6-additive'] = function (el) {
    el.append(tag('Primary and secondary colours', true));
    const circ = (cx, cy, col, blend) => `<circle cx="${cx}" cy="${cy}" r="62" fill="${col}" style="mix-blend-mode:${blend}"/>`;
    el.insertAdjacentHTML('beforeend', `<div class="panels n2">
      <figure class="panel"><div style="background:#000;border-radius:8px;isolation:isolate">${svg(300, 260, circ(115, 100, '#ff0000', 'screen') + circ(185, 100, '#00ff00', 'screen') + circ(150, 160, '#0000ff', 'screen'), 'Additive mixing')}</div><figcaption><b>Additive</b> (light, monitors): R + G + B = <b>white</b>; R+G = yellow, G+B = cyan, R+B = magenta</figcaption></figure>
      <figure class="panel"><div style="background:#fff;border-radius:8px;isolation:isolate;border:1px solid var(--line)">${svg(300, 260, circ(115, 100, '#00ffff', 'multiply') + circ(185, 100, '#ff00ff', 'multiply') + circ(150, 160, '#ffff00', 'multiply'), 'Subtractive mixing')}</div><figcaption><b>Subtractive</b> (pigments, printers): C + M + Y = <b>black</b>; white light minus each ink</figcaption></figure></div>`);
  };

  // RGB cube + converter
  V['ch6-converter'] = function (el) {
    el.append(tag('RGB ↔ CMY ↔ HSI converter'));
    const st = { r: 0.86, g: 0.33, b: 0.2 };
    const cube = h('div'), out = h('div', { class: 'readout' }), sw = h('div', { style: { height: '64px', borderRadius: '8px', border: '1px solid var(--line)' } });
    const O = [175, 190], vR = [-70, 45], vG = [150, 0], vB = [0, -150];
    const P = (r, g, b) => [O[0] + r * vR[0] + g * vG[0] + b * vB[0], O[1] + r * vR[1] + g * vG[1] + b * vB[1]];
    const sliders = ['r', 'g', 'b'].map((k) => UI.slider(k.toUpperCase(), 0, 1, 0.01, st[k], (v) => { st[k] = v; draw(); }, (v) => v.toFixed(2)));
    const draw = () => {
      const { r, g, b } = st;
      const corners = [[0, 0, 0, 'Black'], [1, 0, 0, 'Red'], [0, 1, 0, 'Green'], [0, 0, 1, 'Blue'], [1, 1, 0, 'Yellow'], [0, 1, 1, 'Cyan'], [1, 0, 1, 'Magenta'], [1, 1, 1, 'White']];
      const edges = [[0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 1, 0], [0, 0, 0, 0, 0, 1], [1, 0, 0, 1, 1, 0], [1, 0, 0, 1, 0, 1], [0, 1, 0, 1, 1, 0], [0, 1, 0, 0, 1, 1], [0, 0, 1, 1, 0, 1], [0, 0, 1, 0, 1, 1], [1, 1, 0, 1, 1, 1], [1, 0, 1, 1, 1, 1], [0, 1, 1, 1, 1, 1]];
      const pt = P(r, g, b), k0 = P(0, 0, 0), k1 = P(1, 1, 1);
      cube.innerHTML = svg(430, 265, edges.map((e) => { const a = P(e[0], e[1], e[2]), q = P(e[3], e[4], e[5]); return `<line x1="${a[0]}" y1="${a[1]}" x2="${q[0]}" y2="${q[1]}" stroke="var(--line-2)" stroke-width="1.5"/>`; }).join('') +
        `<line x1="${k0[0]}" y1="${k0[1]}" x2="${k1[0]}" y2="${k1[1]}" stroke="var(--muted)" stroke-dasharray="4 4"/><text x="${(k0[0] + k1[0]) / 2 + 8}" y="${(k0[1] + k1[1]) / 2 + 14}" font-size="11" class="muted">gray scale</text>` +
        corners.map(([x, y, z, n]) => { const q = P(x, y, z); return `<circle cx="${q[0]}" cy="${q[1]}" r="7" fill="${hex(x, y, z)}" stroke="var(--ink-2)"/><text x="${q[0] + (x && !y ? -10 : 10)}" y="${q[1] + (z ? -10 : 18)}" font-size="11.5" text-anchor="${x && !y ? 'end' : 'start'}">${n} (${x},${y},${z})</text>`; }).join('') +
        `<line x1="${k0[0]}" y1="${k0[1]}" x2="${pt[0]}" y2="${pt[1]}" stroke="var(--ink)" stroke-width="2"/><circle cx="${pt[0]}" cy="${pt[1]}" r="9" fill="${hex(r, g, b)}" stroke="var(--ink)" stroke-width="2"/>`, 'RGB colour cube');
      sw.style.background = hex(r, g, b);
      const hsi = IP.rgb2hsi(r, g, b);
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), hsvS = mx ? (mx - mn) / mx : 0;
      const C = 1 - r, M = 1 - g, Y = 1 - b, K = Math.min(C, M, Y);
      const ck = K >= 1 ? [0, 0, 0] : [(C - K) / (1 - K), (M - K) / (1 - K), (Y - K) / (1 - K)];
      out.innerHTML = `RGB = (<b>${r.toFixed(2)}, ${g.toFixed(2)}, ${b.toFixed(2)}</b>) · 8-bit (${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})<br>
        CMY = 1 − RGB = (<b>${C.toFixed(2)}, ${M.toFixed(2)}, ${Y.toFixed(2)}</b>)<br>
        CMYK: K = min(C,M,Y) = ${K.toFixed(2)}, C′M′Y′ = (${ck.map((v) => v.toFixed(2)).join(', ')}) <span class="muted">(common printing formula)</span><br>
        HSI: H = <b>${hsi.h.toFixed(1)}°</b>, S = <b>${hsi.s.toFixed(3)}</b>, I = <b>${hsi.i.toFixed(3)}</b> (I×255 = ${Math.round(hsi.i * 255)})<br>
        <span class="muted">HSV for comparison: V = max = ${mx.toFixed(2)}, S = ${hsvS.toFixed(3)} (H is the same)</span>`;
    };
    const presets = [['Red', 1, 0, 0], ['Magenta', 1, 0, 1], ['Cyan', 0, 1, 1], ['Gray', 0.5, 0.5, 0.5], ['Cornflower', 0.39, 0.58, 0.93]];
    el.append(UI.controls(...sliders, ...presets.map(([n, r, g, b]) => h('button', { class: 'btn small', type: 'button', onclick: () => { Object.assign(st, { r, g, b }); sliders.forEach((s, i) => s.set([r, g, b][i])); draw(); } }, n))),
      h('div', { class: 'split' }, cube, h('div', {}, sw, out)));
    draw();
  };

  V['ch6-hsi'] = function (el) {
    el.append(tag());
    let src = IP.fruitRGB(256);
    const wheel = h('canvas', { class: 'img', width: 220, height: 220, style: { background: 'transparent', aspectRatio: '1' } });
    const c = wheel.getContext('2d'), id = c.createImageData(220, 220);
    for (let y = 0; y < 220; y++) for (let x = 0; x < 220; x++) {
      const dx = x - 110, dy = 110 - y, rr = Math.hypot(dx, dy) / 100;
      const i = (y * 220 + x) * 4;
      if (rr > 1) { id.data[i + 3] = 0; continue; }
      const H = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
      const col = IP.hsi2rgb(H, rr, 0.5);
      id.data[i] = col.r * 255; id.data[i + 1] = col.g * 255; id.data[i + 2] = col.b * 255; id.data[i + 3] = 255;
    }
    c.putImageData(id, 0, 0);
    c.fillStyle = '#111'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center';
    [[0, 'R 0°'], [120, 'G 120°'], [240, 'B 240°']].forEach(([a, t]) => { const r = (a * Math.PI) / 180; c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(110 + 70 * Math.cos(r) - 24, 110 - 70 * Math.sin(r) - 9, 48, 16); c.fillStyle = '#111'; c.fillText(t, 110 + 70 * Math.cos(r), 110 - 70 * Math.sin(r) + 4); });
    const p0 = UI.panel('<b>Image</b>'), pH = UI.panel('<b>H</b> hue (angle 0–360° shown as gray)'), pS = UI.panel('<b>S</b> saturation (0 gray → 1 pure)'), pI = UI.panel('<b>I</b> intensity = (R+G+B)/3');
    const draw = () => { const { H, S, I } = IP.toHSI(src); IP.show(src, p0.canvas); IP.show(H.map((v) => (v / 360) * 255), pH.canvas); IP.show(S.map((v) => v * 255), pS.canvas); IP.show(I.map((v) => v * 255), pI.canvas); };
    el.append(UI.controls(UI.imagePicker(['fruit', 'scene'], 'fruit', (im) => { src = im; draw(); }, { color: true })),
      h('div', { class: 'split', style: { gridTemplateColumns: 'minmax(0,220px) minmax(0,1fr)' } }, h('figure', { class: 'panel' }, wheel, h('figcaption', { html: 'Hue = angle on the colour wheel, saturation = distance from the centre (I fixed at 0.5)' })), UI.panels(p0, pH, pS, pI)));
    draw();
  };

  V['ch6-pseudo'] = function (el) {
    el.append(tag());
    const src = IP.phantom(256);
    let n = 8, map = 'rainbow';
    const p0 = UI.panel('<b>Grayscale</b> (like the thyroid phantom, Fig. 6.18a)'), p1 = UI.panel('');
    const legend = h('div', { class: 'legend' });
    const cmap = (t) => {
      if (map === 'rainbow') { const c = IP.hsi2rgb(240 - 240 * t, 1, 0.5); return [c.r, c.g, c.b]; }
      if (map === 'heat') return [Math.min(1, t * 2), Math.max(0, Math.min(1, t * 2 - 0.5)), Math.max(0, t * 2 - 1)];
      return t < 0.5 ? [0.1, 0.3, 0.9] : [1, 0.85, 0.1];
    };
    const draw = () => {
      const k = map === 'two' ? 2 : n;
      const out = new IP.RGB(256, 256);
      src.d.forEach((v, i) => { const s = Math.min(k - 1, Math.floor((v / 256) * k)); const [r, g, b] = cmap(k === 1 ? 0 : s / (k - 1)); out.r[i] = r * 255; out.g[i] = g * 255; out.b[i] = b * 255; });
      IP.show(src, p0.canvas); IP.show(out, p1.canvas);
      p1.setLabel(`<b>Intensity slicing</b> into ${k} intervals`);
      legend.innerHTML = Array.from({ length: k }, (_, s) => { const [r, g, b] = cmap(k === 1 ? 0 : s / (k - 1)); return `<span><i style="background:${hex(r, g, b)}"></i>${Math.round((s * 256) / k)}–${Math.round(((s + 1) * 256) / k) - 1}</span>`; }).join('');
    };
    el.append(UI.controls(UI.slider('Number of slices', 2, 16, 1, n, (v) => { n = v; draw(); }), UI.seg('Colour map', [['rainbow', 'Rainbow'], ['heat', 'Heat'], ['two', 'Single threshold (2 colours)']], map, (v) => { map = v; draw(); })), UI.panels(p0, p1), legend);
    draw();
  };

  V['ch6-intensity-scale'] = function (el) {
    el.append(tag());
    const src = IP.fruitRGB(256);
    let k = 0.6;
    const p0 = UI.panel('<b>Original</b> f'), p1 = UI.panel(''), p2 = UI.panel(''), p3 = UI.panel('');
    const draw = () => {
      IP.show(src, p0.canvas);
      IP.show(src.mapPlanes((pl) => pl.map((v) => k * v)), p1.canvas); p1.setLabel(`<b>RGB</b>: sᵢ = k·rᵢ (all 3 channels)`);
      const { H, S, I } = IP.toHSI(src); IP.show(IP.fromHSI(H, S, I.map((v) => k * v)), p2.canvas); p2.setLabel('<b>HSI</b>: s₃ = k·r₃ (only I)');
      IP.show(src.mapPlanes((pl) => pl.map((v) => 255 - (k * ((255 - v) / 255) + (1 - k)) * 255)), p3.canvas); p3.setLabel('<b>CMY</b>: sᵢ = k·rᵢ + (1 − k)');
    };
    el.append(UI.controls(UI.slider('k', 0.1, 1, 0.05, k, (v) => { k = v; draw(); }, (v) => v.toFixed(2))), UI.panels(p0, p1, p2, p3),
      h('div', { class: 'readout', html: 'All three give the same darker image g(x,y) = k·f(x,y): only the formula differs because each model stores colour differently. In HSI one component changes; in RGB all three; in CMY (subtractive) scaling needs an offset.' }));
    draw();
  };

  V['ch6-complement'] = function (el) {
    el.append(tag());
    let src = IP.fruitRGB(256);
    const p0 = UI.panel('<b>Original</b>'), p1 = UI.panel('<b>Complement</b> s = 1 − r on R, G, B');
    const wheel = h('div');
    const pairs = [['Red', '#ff0000', 'Cyan', '#00ffff'], ['Green', '#00ff00', 'Magenta', '#ff00ff'], ['Blue', '#0000ff', 'Yellow', '#ffff00']];
    wheel.innerHTML = `<div class="tbl-wrap"><table class="tbl"><tr><th>Colour</th><th></th><th>Complement (opposite on the colour circle)</th></tr>${pairs.map(([a, ca, b, cb]) => `<tr><td><i style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${ca};vertical-align:-2px"></i> ${a}</td><td>↔</td><td><i style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${cb};vertical-align:-2px"></i> ${b}</td></tr>`).join('')}</table></div>`;
    const draw = () => { IP.show(src, p0.canvas); IP.show(src.mapPlanes((pl) => pl.map((v) => 255 - v)), p1.canvas); };
    el.append(UI.controls(UI.imagePicker(['fruit', 'scene'], 'fruit', (im) => { src = im; draw(); }, { color: true })), UI.panels(p0, p1), wheel);
    draw();
  };

  V['ch6-slicing'] = function (el) {
    el.append(tag('Interactive · click a colour in the image'));
    let src = IP.fruitRGB(256), shape = 'cube', W = 0.35, a = [0.75, 0.12, 0.13];
    const p0 = UI.panel('<b>Original</b> — click to choose the colour of interest a'), p1 = UI.panel('');
    const info = h('div', { class: 'readout' });
    const draw = () => {
      const out = new IP.RGB(256, 256);
      let kept = 0;
      for (let i = 0; i < out.r.length; i++) {
        const r = [src.r[i] / 255, src.g[i] / 255, src.b[i] / 255];
        const far = shape === 'cube' ? r.some((v, j) => Math.abs(v - a[j]) > W / 2) : r.reduce((s, v, j) => s + (v - a[j]) ** 2, 0) > W * W;
        if (far) { out.r[i] = out.g[i] = out.b[i] = 127.5; } else { out.r[i] = src.r[i]; out.g[i] = src.g[i]; out.b[i] = src.b[i]; kept++; }
      }
      IP.show(src, p0.canvas); IP.show(out, p1.canvas);
      p1.setLabel(`<b>Sliced</b>: colours outside the ${shape} → gray (0.5, 0.5, 0.5)`);
      info.innerHTML = `a = (${a.map((v) => v.toFixed(3)).join(', ')}) <span style="display:inline-block;width:14px;height:14px;border-radius:3px;vertical-align:-2px;background:${hex(...a)}"></span> · ${shape === 'cube' ? `cube of width W = ${W.toFixed(2)}: keep if |rⱼ − aⱼ| ≤ W/2 for every j` : `sphere of radius R₀ = ${W.toFixed(2)}: keep if Σ(rⱼ − aⱼ)² ≤ R₀²`} · kept ${((100 * kept) / out.r.length).toFixed(1)}% of pixels`;
    };
    p0.canvas.style.cursor = 'crosshair';
    p0.canvas.addEventListener('click', (e) => { const r = p0.canvas.getBoundingClientRect(); const x = Math.floor(((e.clientX - r.left) / r.width) * 256), y = Math.floor(((e.clientY - r.top) / r.height) * 256); const i = y * 256 + x; a = [src.r[i] / 255, src.g[i] / 255, src.b[i] / 255]; draw(); });
    el.append(UI.controls(UI.imagePicker(['fruit', 'scene'], 'fruit', (im) => { src = im; draw(); }, { color: true }), UI.seg('Region', [['cube', 'Cube (width W)'], ['sphere', 'Sphere (radius R₀)']], shape, (v) => { shape = v; draw(); }), UI.slider('W or R₀', 0.05, 0.8, 0.01, W, (v) => { W = v; draw(); }, (v) => v.toFixed(2))), UI.panels(p0, p1), info);
    draw();
  };

  V['ch6-tone'] = function (el) {
    el.append(tag());
    let src = IP.fruitRGB(256).mapPlanes((p) => p.map((v) => 40 + v * 0.55)), g = 1.6, mode = 'gamma';
    const cmp = UI.compare('Original', 'Corrected');
    const draw = () => {
      const f = mode === 'gamma' ? (v) => 255 * Math.pow(v / 255, g) : (v) => { let lo = 40, hi = 40 + 255 * 0.55; return ((v - lo) / (hi - lo)) * 255; };
      IP.show(src, cmp.a); IP.show(src.mapPlanes((p) => p.map(f)), cmp.b);
    };
    el.append(UI.controls(UI.seg('Correction', [['gamma', 'Power law'], ['stretch', 'Contrast stretch']], mode, (v) => { mode = v; draw(); }), UI.slider('γ', 0.3, 3, 0.05, g, (v) => { g = v; draw(); }, (v) => v.toFixed(2))),
      h('div', { style: { maxWidth: '420px' } }, cmp.el), h('div', { class: 'readout', html: 'The <b>same</b> transformation is applied to R, G and B, so brightness and contrast change while the hues stay the same.' }));
    draw();
  };

  V['ch6-histeq'] = function (el) {
    el.append(tag());
    const src = IP.fruitRGB(256).mapPlanes((p, c) => p.map((v) => (c === 'b' ? 20 + v * 0.35 : 10 + v * 0.45)));
    const p0 = UI.panel('<b>Original</b> (dark)'), p1 = UI.panel('<b>Each RGB channel equalized separately</b> → colour distortion'), p2 = UI.panel('<b>Only I equalized (HSI)</b> → hues preserved');
    IP.show(src, p0.canvas);
    IP.show(src.mapPlanes((p) => IP.equalize(p).out), p1.canvas);
    const { H, S, I } = IP.toHSI(src);
    IP.show(IP.fromHSI(H, S, IP.equalize(I.map((v) => v * 255)).out.map((v) => v / 255)), p2.canvas);
    el.append(UI.panels(p0, p1, p2));
  };

  V['ch6-smooth'] = function (el) {
    el.append(tag());
    let mode = 'smooth', n = 5;
    const src = IP.fruitRGB(256);
    const p1 = UI.panel(''), p2 = UI.panel(''), p3 = UI.panel('<b>Difference</b> between the two (amplified ×8)');
    const draw = () => {
      let a, b;
      if (mode === 'smooth') {
        const k = IP.kernel.box(n);
        a = src.mapPlanes((p) => IP.filter(p, k));
        const { H, S, I } = IP.toHSI(src); b = IP.fromHSI(H, S, IP.filter(I, k));
        p1.setLabel(`<b>(a)</b> ${n}×${n} average on each of R, G, B`); p2.setLabel(`<b>(b)</b> ${n}×${n} average on I only (HSI) → RGB`);
      } else {
        a = src.mapPlanes((p) => IP.combine(p, IP.filter(p, IP.K.lap4), (x, y) => x - y));
        const { H, S, I } = IP.toHSI(src); b = IP.fromHSI(H, S, IP.combine(I, IP.filter(I, IP.K.lap4), (x, y) => x - y));
        p1.setLabel('<b>(a)</b> Laplacian sharpening of each RGB channel'); p2.setLabel('<b>(b)</b> Laplacian sharpening of I only → RGB');
      }
      IP.show(a, p1.canvas); IP.show(b, p2.canvas);
      const d = new IP.Gray(256, 256); for (let i = 0; i < d.d.length; i++) d.d[i] = 128 + 8 * ((a.r[i] - b.r[i]) + (a.g[i] - b.g[i]) + (a.b[i] - b.b[i])) / 3;
      IP.show(d, p3.canvas);
    };
    el.append(UI.controls(UI.seg('Operation', [['smooth', 'Smoothing (Fig. 6.38)'], ['sharp', 'Sharpening (Fig. 6.39)']], mode, (v) => { mode = v; draw(); }), UI.select('Kernel', [['3', '3×3'], ['5', '5×5'], ['9', '9×9']], String(n), (v) => { n = +v; draw(); })), UI.panels(p1, p2, p3));
    draw();
  };
})();
