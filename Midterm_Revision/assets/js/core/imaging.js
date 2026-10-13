/* IP — a small image-processing engine used by every demo on the site.
   Gray images hold Float32 intensities (normally 0..255). RGB images hold three planes. */
(function () {
  'use strict';
  const IP = (window.IP = {});
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  IP.clamp = clamp;

  // ---------- random ----------
  IP.rng = function (seed) {
    let a = seed >>> 0 || 1;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  IP.gaussRand = function (rnd) {
    let u = 0;
    while (!u) u = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
  };

  // ---------- image classes ----------
  class Gray {
    constructor(w, h, d) { this.w = w; this.h = h; this.d = d || new Float32Array(w * h); }
    get(x, y) { return this.d[y * this.w + x]; }
    clone() { return new Gray(this.w, this.h, new Float32Array(this.d)); }
    map(fn) { const o = new Gray(this.w, this.h); for (let i = 0; i < this.d.length; i++) o.d[i] = fn(this.d[i], i); return o; }
  }
  class RGB {
    constructor(w, h) { this.w = w; this.h = h; this.r = new Float32Array(w * h); this.g = new Float32Array(w * h); this.b = new Float32Array(w * h); }
    plane(c) { return new Gray(this.w, this.h, new Float32Array(this[c])); }
    static fromPlanes(r, g, b) { const o = new RGB(r.w, r.h); o.r.set(r.d); o.g.set(g.d); o.b.set(b.d); return o; }
    toGray() { const o = new Gray(this.w, this.h); for (let i = 0; i < o.d.length; i++) o.d[i] = 0.299 * this.r[i] + 0.587 * this.g[i] + 0.114 * this.b[i]; return o; }
    clone() { const o = new RGB(this.w, this.h); o.r.set(this.r); o.g.set(this.g); o.b.set(this.b); return o; }
    mapPlanes(fn) { return RGB.fromPlanes(fn(this.plane('r'), 'r'), fn(this.plane('g'), 'g'), fn(this.plane('b'), 'b')); }
  }
  IP.Gray = Gray;
  IP.RGB = RGB;
  IP.isRGB = (im) => im instanceof RGB;

  // ---------- canvas I/O ----------
  IP.fromCanvas = function (cv) {
    const ctx = cv.getContext('2d');
    const id = ctx.getImageData(0, 0, cv.width, cv.height).data;
    const o = new RGB(cv.width, cv.height);
    for (let i = 0, p = 0; i < o.r.length; i++, p += 4) { o.r[i] = id[p]; o.g[i] = id[p + 1]; o.b[i] = id[p + 2]; }
    return o;
  };
  IP.draw = function (w, h, fn) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    fn(cv.getContext('2d'), w, h);
    return IP.fromCanvas(cv);
  };
  // mode: 'clip' (default) | 'minmax' (stretch to 0..255) | 'abs' (|v| then minmax) | 'center' (0 -> mid gray)
  IP.show = function (img, cv, mode) {
    mode = mode || 'clip';
    cv.width = img.w; cv.height = img.h;
    const ctx = cv.getContext('2d');
    const out = ctx.createImageData(img.w, img.h);
    const o = out.data;
    if (img instanceof RGB) {
      for (let i = 0, p = 0; i < img.r.length; i++, p += 4) {
        o[p] = clamp(img.r[i], 0, 255); o[p + 1] = clamp(img.g[i], 0, 255); o[p + 2] = clamp(img.b[i], 0, 255); o[p + 3] = 255;
      }
    } else {
      let d = img.d, lo = 0, hi = 255;
      if (mode === 'abs') { d = d.map(Math.abs); }
      if (mode === 'pct') { const srt = Float32Array.from(d).sort(); lo = srt[Math.floor(srt.length * 0.01)]; hi = srt[Math.floor(srt.length * 0.99)]; if (hi - lo < 1e-9) hi = lo + 1; }
      if (mode === 'minmax' || mode === 'abs') { lo = Infinity; hi = -Infinity; for (const v of d) { if (v < lo) lo = v; if (v > hi) hi = v; } if (hi - lo < 1e-9) hi = lo + 1; }
      let m = 0;
      if (mode === 'center') { for (const v of d) m = Math.max(m, Math.abs(v)); m = m || 1; }
      for (let i = 0, p = 0; i < d.length; i++, p += 4) {
        let v;
        if (mode === 'center') v = 128 + (127 * d[i]) / m;
        else if (mode === 'clip') v = d[i];
        else if (mode === 'pct') v = ((d[i] - lo) / (hi - lo)) * 255;
        else v = ((d[i] - lo) / (hi - lo)) * 255;
        v = clamp(v, 0, 255);
        o[p] = o[p + 1] = o[p + 2] = v; o[p + 3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
    return cv;
  };
  IP.toDataURL = function (img, mode) { return IP.show(img, document.createElement('canvas'), mode).toDataURL(); };

  // Load an <img>/File into an RGB image fitted to a square of size n (center crop).
  IP.fromImageElement = function (el, n) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = n;
    const ctx = cv.getContext('2d');
    const s = Math.min(el.naturalWidth, el.naturalHeight);
    ctx.drawImage(el, (el.naturalWidth - s) / 2, (el.naturalHeight - s) / 2, s, s, 0, 0, n, n);
    return IP.fromCanvas(cv);
  };

  // ---------- synthetic test images (deterministic) ----------
  const cache = {};
  IP.cache = cache;
  function memo(key, fn) { return cache[key] || (cache[key] = fn()); }

  function addTexture(img, rnd, y0, amp) {
    for (let y = y0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
      const i = y * img.w + x, n = (rnd() - 0.5) * amp;
      img.r[i] += n; img.g[i] += n; img.b[i] += n * 0.8;
    }
  }

  // A small landscape: sky, sun, mountains, lake, house, tree, fence. Rich in edges + smooth areas.
  IP.sceneRGB = (n = 256) => memo('scene' + n, () => {
    const im = IP.draw(n, n, (c, s) => {
      const k = s / 256;
      const sky = c.createLinearGradient(0, 0, 0, 150 * k);
      sky.addColorStop(0, '#3f78c4'); sky.addColorStop(1, '#bcd8f0');
      c.fillStyle = sky; c.fillRect(0, 0, s, s);
      c.fillStyle = '#ffd34d'; c.beginPath(); c.arc(200 * k, 46 * k, 20 * k, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,.85)';
      [[50, 40, 16], [66, 36, 20], [84, 42, 14], [140, 70, 10], [152, 66, 13]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x * k, y * k, r * k, 0, 7); c.fill(); });
      c.fillStyle = '#6e7f99';
      c.beginPath(); c.moveTo(0, 150 * k); c.lineTo(40 * k, 92 * k); c.lineTo(78 * k, 128 * k); c.lineTo(122 * k, 78 * k); c.lineTo(178 * k, 140 * k); c.lineTo(214 * k, 104 * k); c.lineTo(256 * k, 146 * k); c.lineTo(s, 160 * k); c.lineTo(0, 160 * k); c.fill();
      c.fillStyle = '#f2f5f8';
      c.beginPath(); c.moveTo(122 * k, 78 * k); c.lineTo(108 * k, 94 * k); c.lineTo(118 * k, 92 * k); c.lineTo(126 * k, 98 * k); c.lineTo(136 * k, 92 * k); c.fill();
      const lake = c.createLinearGradient(0, 150 * k, 0, 180 * k);
      lake.addColorStop(0, '#2d5d8f'); lake.addColorStop(1, '#5f93c4');
      c.fillStyle = lake; c.fillRect(0, 150 * k, s, 30 * k);
      const grass = c.createLinearGradient(0, 176 * k, 0, s);
      grass.addColorStop(0, '#5f9c3a'); grass.addColorStop(1, '#2f5e1f');
      c.fillStyle = grass; c.fillRect(0, 176 * k, s, s);
      // house
      c.fillStyle = '#d58a52'; c.fillRect(132 * k, 170 * k, 64 * k, 50 * k);
      c.fillStyle = '#7a2e1d'; c.beginPath(); c.moveTo(126 * k, 172 * k); c.lineTo(164 * k, 140 * k); c.lineTo(202 * k, 172 * k); c.fill();
      c.fillStyle = '#fff3a6'; c.fillRect(140 * k, 182 * k, 14 * k, 12 * k); c.fillRect(174 * k, 182 * k, 14 * k, 12 * k);
      c.fillStyle = '#4a2a16'; c.fillRect(158 * k, 196 * k, 12 * k, 24 * k);
      c.strokeStyle = '#3b2312'; c.lineWidth = 1.2 * k;
      c.strokeRect(140 * k, 182 * k, 14 * k, 12 * k); c.strokeRect(174 * k, 182 * k, 14 * k, 12 * k);
      c.beginPath(); c.moveTo(147 * k, 182 * k); c.lineTo(147 * k, 194 * k); c.moveTo(181 * k, 182 * k); c.lineTo(181 * k, 194 * k); c.stroke();
      // tree
      c.fillStyle = '#5a3a1f'; c.fillRect(54 * k, 168 * k, 10 * k, 46 * k);
      c.fillStyle = '#2f6e2a';
      [[58, 150, 26], [40, 164, 18], [78, 162, 18], [58, 128, 20]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x * k, y * k, r * k, 0, 7); c.fill(); });
      c.fillStyle = '#3f8a35';
      [[50, 140, 9], [70, 150, 8], [60, 122, 7], [44, 160, 7]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x * k, y * k, r * k, 0, 7); c.fill(); });
      // fence (high-frequency detail)
      c.fillStyle = '#efe6d2';
      for (let x = 0; x < 120; x += 7) c.fillRect(x * k, 222 * k, 3.5 * k, 20 * k);
      c.fillRect(0, 228 * k, 120 * k, 2.5 * k); c.fillRect(0, 236 * k, 120 * k, 2.5 * k);
      // path
      c.fillStyle = '#c9b18a'; c.beginPath(); c.moveTo(158 * k, 220 * k); c.lineTo(170 * k, 220 * k); c.lineTo(196 * k, s); c.lineTo(140 * k, s); c.fill();
    });
    addTexture(im, IP.rng(7), Math.round(n * 0.69), 26);
    return im;
  });
  IP.scene = (n = 256) => memo('sceneG' + n, () => IP.sceneRGB(n).toGray());

  // Test pattern in the spirit of Gonzalez & Woods Fig. 3.36 (squares, letters, bars, circles, noise).
  IP.pattern = (n = 256) => memo('pattern' + n, () => {
    const rnd = IP.rng(3);
    const im = IP.draw(n, n, (c, s) => {
      const k = s / 256;
      c.fillStyle = '#c9c9c9'; c.fillRect(0, 0, s, s);
      c.fillStyle = '#111';
      let x = 10;
      [3, 5, 9, 15, 25, 35].forEach((sz) => { c.fillRect(x * k, (12 + (35 - sz) / 2) * k, sz * k, sz * k); x += sz + 10; });
      c.font = `bold ${60 * k}px Georgia, serif`; c.fillText('a', 186 * k, 50 * k);
      [6, 9, 12, 16, 20, 26, 34].forEach((fs, i) => { c.font = `${fs * k}px Georgia, serif`; c.fillText('a', (10 + i * 24 + (i > 4 ? (i - 4) * 6 : 0)) * k, 242 * k); });
      for (let i = 0; i < 4; i++) { c.beginPath(); c.arc((22 + i * 22) * k, 80 * k, (4 + i * 2) * k, 0, 7); c.fill(); }
      for (let g = 0; g < 3; g++) for (let b = 0; b < 6; b++) c.fillRect((14 + g * 40 + b * (2 + g) * 2) * k, 104 * k, (2 + g) * k, 44 * k);
      c.lineWidth = 3 * k; c.strokeStyle = '#111';
      c.beginPath(); c.moveTo(20 * k, 200 * k); c.lineTo(70 * k, 160 * k); c.lineTo(120 * k, 200 * k); c.closePath(); c.stroke();
      c.beginPath(); c.arc(70 * k, 188 * k, 9 * k, 0, 7); c.stroke();
      c.strokeRect(140 * k, 70 * k, 40 * k, 40 * k);
      c.beginPath(); c.moveTo(140 * k, 70 * k); c.lineTo(180 * k, 110 * k); c.moveTo(180 * k, 70 * k); c.lineTo(140 * k, 110 * k); c.stroke();
      c.fillStyle = '#ffffff'; c.fillRect(196 * k, 70 * k, 46 * k, 40 * k);
      const g = c.createLinearGradient(140 * k, 0, 244 * k, 0); g.addColorStop(0, '#000'); g.addColorStop(1, '#fff');
      c.fillStyle = g; c.fillRect(140 * k, 124 * k, 104 * k, 26 * k);
    });
    // noisy rectangle
    for (let y = Math.round(160 * n / 256); y < Math.round(206 * n / 256); y++)
      for (let x = Math.round(140 * n / 256); x < Math.round(244 * n / 256); x++) {
        const i = y * n + x, v = 60 + rnd() * 160; im.r[i] = im.g[i] = im.b[i] = v;
      }
    return im.toGray();
  });

  // Fruit bowl for colour demos.
  IP.fruitRGB = (n = 256) => memo('fruit' + n, () => {
    const rnd = IP.rng(11);
    const im = IP.draw(n, n, (c, s) => {
      const k = s / 256;
      const bg = c.createLinearGradient(0, 0, 0, s); bg.addColorStop(0, '#efe4cf'); bg.addColorStop(1, '#d7c4a2');
      c.fillStyle = bg; c.fillRect(0, 0, s, s);
      c.fillStyle = '#8a6a43'; c.fillRect(0, 196 * k, s, s);
      // bowl
      c.fillStyle = '#e9eef2'; c.beginPath(); c.ellipse(128 * k, 168 * k, 104 * k, 54 * k, 0, 0, Math.PI); c.fill();
      c.fillStyle = '#9fb4c4'; c.fillRect(30 * k, 162 * k, 196 * k, 8 * k);
      const fr = [];
      for (let i = 0; i < 26; i++) fr.push([40 + rnd() * 176, 92 + rnd() * 66, 10 + rnd() * 12, Math.floor(rnd() * 5)]);
      fr.sort((a, b) => a[1] - b[1]);
      const cols = [['#d81f2a', '#7d0b12'], ['#3a3fa6', '#191c55'], ['#f2c12e', '#b8860b'], ['#58a83a', '#2a5c1c'], ['#ef7d1a', '#a04a07']];
      fr.forEach(([x, y, r, t]) => {
        const gr = c.createRadialGradient((x - r / 3) * k, (y - r / 3) * k, 1, x * k, y * k, r * k);
        gr.addColorStop(0, '#fff8'); gr.addColorStop(0.15, cols[t][0]); gr.addColorStop(1, cols[t][1]);
        c.fillStyle = gr; c.beginPath(); c.arc(x * k, y * k, r * k, 0, 7); c.fill();
        if (t === 0) { c.fillStyle = '#2f7d2a'; c.beginPath(); c.ellipse(x * k, (y - r) * k, 5 * k, 2.5 * k, 0, 0, 7); c.fill(); }
      });
      c.fillStyle = '#4f9a36';
      c.beginPath(); c.ellipse(70 * k, 90 * k, 22 * k, 8 * k, -0.6, 0, 7); c.fill();
      c.beginPath(); c.ellipse(190 * k, 88 * k, 20 * k, 7 * k, 0.5, 0, 7); c.fill();
    });
    addTexture(im, IP.rng(5), 0, 8);
    return im;
  });
  IP.fruit = (n = 256) => memo('fruitG' + n, () => IP.fruitRGB(n).toGray());

  // Smooth blobs (like a medical scan phantom) for pseudocolour.
  IP.phantom = (n = 256) => memo('phantom' + n, () => {
    const o = new Gray(n, n);
    const blobs = [[0.36, 0.5, 0.17, 150], [0.64, 0.48, 0.15, 170], [0.5, 0.52, 0.08, 70], [0.4, 0.42, 0.05, -90], [0.7, 0.55, 0.05, 50], [0.32, 0.6, 0.06, 40]];
    const rnd = IP.rng(9);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      let v = 18;
      const u = x / n, w = y / n;
      for (const [cx, cy, r, a] of blobs) { const d2 = ((u - cx) ** 2 + ((w - cy) * 1.4) ** 2) / (r * r); v += a * Math.exp(-d2 * d2 * 0.9); }
      o.d[y * n + x] = clamp(v + (rnd() - 0.5) * 6, 0, 255);
    }
    return o;
  });

  // Flat test object for noise models (square + disc on dark background, like G&W Fig. 5.3).
  IP.noiseTest = (n = 256) => memo('noiseTest' + n, () => {
    const o = new Gray(n, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      let v = 40;
      if (x > n * 0.15 && x < n * 0.85 && y > n * 0.15 && y < n * 0.85) v = 130;
      if ((x - n / 2) ** 2 + (y - n / 2) ** 2 < (n * 0.24) ** 2) v = 215;
      o.d[y * n + x] = v;
    }
    return o;
  });

  // ---------- point operations ----------
  IP.point = (img, fn) => img.map(fn);
  IP.hist = function (img, bins = 256) {
    const hgm = new Float64Array(bins);
    const L = bins - 1;
    for (const v of img.d) hgm[clamp(Math.round((v / 255) * L), 0, L)]++;
    return hgm;
  };
  IP.equalize = function (img) {
    const hgm = IP.hist(img), N = img.d.length, cdf = new Float64Array(256), map = new Float64Array(256);
    let acc = 0;
    for (let k = 0; k < 256; k++) { acc += hgm[k]; cdf[k] = acc / N; map[k] = Math.round(255 * cdf[k]); }
    return { out: img.map((v) => map[clamp(Math.round(v), 0, 255)]), map, cdf };
  };
  // Histogram matching (specification) to a target histogram.
  IP.matchHist = function (img, target) {
    const src = IP.equalize(img);
    const tc = new Float64Array(256);
    const tot = target.reduce((a, b) => a + b, 0);
    let acc = 0;
    for (let k = 0; k < 256; k++) { acc += target[k]; tc[k] = acc / tot; }
    const map = new Float64Array(256);
    for (let r = 0; r < 256; r++) {
      const s = src.cdf[r];
      let z = 0;
      while (z < 255 && tc[z] < s) z++;
      map[r] = z;
    }
    return { out: img.map((v) => map[clamp(Math.round(v), 0, 255)]), map, srcCdf: src.cdf, tgtCdf: tc };
  };
  IP.quantize = function (img, bits) {
    const L = 2 ** bits;
    const step = 256 / L;
    return img.map((v) => (L === 1 ? 0 : Math.min(L - 1, Math.floor(clamp(v, 0, 255) / step)) * (255 / (L - 1))));
  };
  // Keep the size the same but sample every `f` pixels (blocky display of a lower spatial resolution).
  IP.subsample = function (img, f) {
    const o = new Gray(img.w, img.h);
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++)
      o.d[y * img.w + x] = img.d[Math.floor(y / f) * f * img.w + Math.floor(x / f) * f];
    return o;
  };

  // ---------- spatial filtering ----------
  IP.kernel = {
    box: (n) => ({ w: n, h: n, d: new Float32Array(n * n).fill(1 / (n * n)) }),
    gaussian(n, sigma) {
      const k = new Float32Array(n * n), c = (n - 1) / 2;
      let s = 0;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = Math.exp(-((x - c) ** 2 + (y - c) ** 2) / (2 * sigma * sigma)); k[y * n + x] = v; s += v; }
      for (let i = 0; i < k.length; i++) k[i] /= s;
      return { w: n, h: n, d: k };
    },
    from: (rows) => ({ w: rows[0].length, h: rows.length, d: Float32Array.from(rows.flat()) }),
  };
  IP.K = {
    lap4: [[0, 1, 0], [1, -4, 1], [0, 1, 0]],
    lap8: [[1, 1, 1], [1, -8, 1], [1, 1, 1]],
    sobelX: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]],
    sobelY: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]],
  };
  // Correlation (flip=false) or convolution (flip=true). pad: 'zero' | 'replicate'
  IP.filter = function (img, k, opt) {
    opt = opt || {};
    if (Array.isArray(k)) k = IP.kernel.from(k);
    const { w, h } = img, o = new Gray(w, h), a = (k.h - 1) / 2, b = (k.w - 1) / 2, rep = opt.pad !== 'zero';
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0;
      for (let t = -a; t <= a; t++) for (let u = -b; u <= b; u++) {
        let yy = y + t, xx = x + u, v;
        if (yy < 0 || yy >= h || xx < 0 || xx >= w) { if (!rep) continue; yy = clamp(yy, 0, h - 1); xx = clamp(xx, 0, w - 1); }
        v = img.d[yy * w + xx];
        const kv = opt.flip ? k.d[(a - t) * k.w + (b - u)] : k.d[(t + a) * k.w + (u + b)];
        s += kv * v;
      }
      o.d[y * w + x] = s;
    }
    return o;
  };
  // Generic neighbourhood operator: fn(values Float64Array) -> number
  IP.neighborhood = function (img, n, fn) {
    const { w, h } = img, o = new Gray(w, h), r = (n - 1) / 2, buf = new Float64Array(n * n);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let c = 0;
      for (let t = -r; t <= r; t++) { const yy = clamp(y + t, 0, h - 1); for (let u = -r; u <= r; u++) buf[c++] = img.d[yy * w + clamp(x + u, 0, w - 1)]; }
      o.d[y * w + x] = fn(buf);
    }
    return o;
  };
  IP.restore = {
    arithmetic: (v) => { let s = 0; for (const x of v) s += x; return s / v.length; },
    geometric: (v) => { let s = 0; for (const x of v) { if (x <= 0) return 0; s += Math.log(x); } return Math.exp(s / v.length); },
    harmonic: (v) => { let s = 0; for (const x of v) { if (x <= 0) return 0; s += 1 / x; } return v.length / s; },
    contra: (Q) => (v) => { let a = 0, b = 0; for (let x of v) { x = Math.max(x, 0.5); a += x ** (Q + 1); b += x ** Q; } return a / b; },
    median: (v) => { const s = Array.from(v).sort((p, q) => p - q), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; },
    max: (v) => Math.max(...v),
    min: (v) => Math.min(...v),
    midpoint: (v) => (Math.max(...v) + Math.min(...v)) / 2,
    alpha: (d) => (v) => { const s = Array.from(v).sort((p, q) => p - q); const k = Math.floor(d / 2); const t = s.slice(k, s.length - k); return t.reduce((a, b) => a + b, 0) / t.length; },
  };
  IP.combine = function (a, b, fn) { const o = new Gray(a.w, a.h); for (let i = 0; i < o.d.length; i++) o.d[i] = fn(a.d[i], b.d[i]); return o; };

  // ---------- noise ----------
  IP.addNoise = function (img, type, p, seed) {
    const rnd = IP.rng(seed || 42);
    return img.map((v) => {
      switch (type) {
        case 'gaussian': return v + (p.mean || 0) + p.sigma * IP.gaussRand(rnd);
        case 'uniform': return v + p.a + (p.b - p.a) * rnd();
        case 'exponential': return v - Math.log(1 - rnd()) / p.a;
        case 'saltpepper': { const r = rnd(); return r < p.pp ? 0 : r < p.pp + p.ps ? 255 : v; }
        default: return v;
      }
    }).map((v) => clamp(v, 0, 255));
  };
  IP.mse = (a, b) => { let s = 0; for (let i = 0; i < a.d.length; i++) s += (a.d[i] - clamp(b.d[i], 0, 255)) ** 2; return s / a.d.length; };
  IP.psnr = (a, b) => { const m = IP.mse(a, b); return m === 0 ? Infinity : 10 * Math.log10((255 * 255) / m); };

  // ---------- resampling and geometry ----------
  function sampleNearest(img, x, y) { const xi = Math.round(x), yi = Math.round(y); if (xi < 0 || yi < 0 || xi >= img.w || yi >= img.h) return null; return img.d[yi * img.w + xi]; }
  function sampleBilinear(img, x, y) {
    if (x < -0.5 || y < -0.5 || x > img.w - 0.5 || y > img.h - 0.5) return null;
    x = clamp(x, 0, img.w - 1); y = clamp(y, 0, img.h - 1);
    const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(x0 + 1, img.w - 1), y1 = Math.min(y0 + 1, img.h - 1), fx = x - x0, fy = y - y0;
    const g = (xx, yy) => img.d[yy * img.w + xx];
    return g(x0, y0) * (1 - fx) * (1 - fy) + g(x1, y0) * fx * (1 - fy) + g(x0, y1) * (1 - fx) * fy + g(x1, y1) * fx * fy;
  }
  function cubic(t) { const a = -0.5; t = Math.abs(t); return t <= 1 ? (a + 2) * t ** 3 - (a + 3) * t ** 2 + 1 : t < 2 ? a * t ** 3 - 5 * a * t ** 2 + 8 * a * t - 4 * a : 0; }
  function sampleBicubic(img, x, y) {
    if (x < -0.5 || y < -0.5 || x > img.w - 0.5 || y > img.h - 0.5) return null;
    const x0 = Math.floor(x), y0 = Math.floor(y);
    let s = 0;
    for (let m = -1; m <= 2; m++) for (let n = -1; n <= 2; n++) {
      const xx = clamp(x0 + n, 0, img.w - 1), yy = clamp(y0 + m, 0, img.h - 1);
      s += img.d[yy * img.w + xx] * cubic(x - (x0 + n)) * cubic(y - (y0 + m));
    }
    return s;
  }
  IP.samplers = { nearest: sampleNearest, bilinear: sampleBilinear, bicubic: sampleBicubic };
  IP.resize = function (img, W, H, method) {
    const f = IP.samplers[method || 'bilinear'], o = new Gray(W, H), sx = img.w / W, sy = img.h / H;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = f(img, (x + 0.5) * sx - 0.5, (y + 0.5) * sy - 0.5);
      o.d[y * W + x] = v == null ? 0 : v;
    }
    return o;
  };
  // Affine transform with inverse mapping. M maps input (x,y,1) -> output, in pixel coords relative to centre.
  IP.affine = function (img, M, method, bg) {
    const inv = invert3(M), f = IP.samplers[method || 'bilinear'], o = new Gray(img.w, img.h), cx = img.w / 2, cy = img.h / 2;
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
      const X = x - cx, Y = cy - y; // math-style axes (y up) for intuitive rotation
      const u = inv[0] * X + inv[1] * Y + inv[2], v = inv[3] * X + inv[4] * Y + inv[5];
      const val = f(img, u + cx, cy - v);
      o.d[y * img.w + x] = val == null ? (bg == null ? 30 : bg) : val;
    }
    return o;
  };
  function invert3(m) {
    const [a, b, c, d, e, f, g, hh, i] = m;
    const A = e * i - f * hh, B = -(d * i - f * g), C = d * hh - e * g;
    const det = a * A + b * B + c * C;
    return [A / det, -(b * i - c * hh) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * hh - b * g) / det, (a * e - b * d) / det];
  }
  IP.mul3 = function (A, B) { const o = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { let s = 0; for (let k = 0; k < 3; k++) s += A[r * 3 + k] * B[k * 3 + c]; o.push(s); } return o; };

  // ---------- FFT ----------
  function fft1(re, im, inv) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = ((inv ? 2 : -2) * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang), half = len >> 1;
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let j = 0; j < half; j++) {
          const a = i + j, b = a + half;
          const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
          const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
    if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }
  // In-place 2D FFT on Float64Arrays (w and h must be powers of two).
  IP.fft2 = function (re, im, w, h, inv) {
    const rr = new Float64Array(w), ri = new Float64Array(w);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) { rr[x] = re[y * w + x]; ri[x] = im[y * w + x]; }
      fft1(rr, ri, inv);
      for (let x = 0; x < w; x++) { re[y * w + x] = rr[x]; im[y * w + x] = ri[x]; }
    }
    const cr = new Float64Array(h), ci = new Float64Array(h);
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) { cr[y] = re[y * w + x]; ci[y] = im[y * w + x]; }
      fft1(cr, ci, inv);
      for (let y = 0; y < h; y++) { re[y * w + x] = cr[y]; im[y * w + x] = ci[y]; }
    }
  };
  IP.dft = function (img) {
    const re = Float64Array.from(img.d), im = new Float64Array(img.d.length);
    IP.fft2(re, im, img.w, img.h, false);
    return { re, im, w: img.w, h: img.h };
  };
  IP.idft = function (F) {
    const re = Float64Array.from(F.re), im = Float64Array.from(F.im);
    IP.fft2(re, im, F.w, F.h, true);
    return new Gray(F.w, F.h, Float32Array.from(re));
  };
  IP.shift = function (img) { // fftshift for a Gray
    const o = new Gray(img.w, img.h), hw = img.w >> 1, hh = img.h >> 1;
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) o.d[((y + hh) % img.h) * img.w + ((x + hw) % img.w)] = img.d[y * img.w + x];
    return o;
  };
  IP.magnitude = (F) => new Gray(F.w, F.h, Float32Array.from(F.re, (r, i) => Math.hypot(r, F.im[i])));
  IP.phase = (F) => new Gray(F.w, F.h, Float32Array.from(F.re, (r, i) => Math.atan2(F.im[i], r)));
  IP.logSpec = (mag) => mag.map((v) => Math.log(1 + v));
  // Frequency-domain transfer function H(u,v) evaluated with centred distance D(u,v).
  IP.freqFilter = function (img, Hfn) {
    const F = IP.dft(img), { w, h } = F;
    for (let v = 0; v < h; v++) for (let u = 0; u < w; u++) {
      const du = u < w / 2 ? u : u - w, dv = v < h / 2 ? v : v - h;
      const H = Hfn(Math.hypot(du, dv), du, dv);
      F.re[v * w + u] *= H; F.im[v * w + u] *= H;
    }
    return IP.idft(F);
  };

  // ---------- colour models ----------
  // r,g,b in [0,1] -> {h (deg), s, i} using the Gonzalez & Woods formulas.
  IP.rgb2hsi = function (r, g, b) {
    const i = (r + g + b) / 3, mn = Math.min(r, g, b);
    const s = r + g + b === 0 ? 0 : 1 - (3 * mn) / (r + g + b);
    const num = 0.5 * (r - g + (r - b)), den = Math.sqrt((r - g) ** 2 + (r - b) * (g - b));
    let hh = 0;
    if (den > 1e-10) { const th = (Math.acos(clamp(num / den, -1, 1)) * 180) / Math.PI; hh = b <= g ? th : 360 - th; }
    return { h: hh, s, i };
  };
  IP.hsi2rgb = function (H, S, I) {
    H = ((H % 360) + 360) % 360;
    const rad = (d) => (d * Math.PI) / 180;
    let r, g, b;
    if (H < 120) { b = I * (1 - S); r = I * (1 + (S * Math.cos(rad(H))) / Math.cos(rad(60 - H))); g = 3 * I - (r + b); }
    else if (H < 240) { H -= 120; r = I * (1 - S); g = I * (1 + (S * Math.cos(rad(H))) / Math.cos(rad(60 - H))); b = 3 * I - (r + g); }
    else { H -= 240; g = I * (1 - S); b = I * (1 + (S * Math.cos(rad(H))) / Math.cos(rad(60 - H))); r = 3 * I - (g + b); }
    return { r: clamp(r, 0, 1), g: clamp(g, 0, 1), b: clamp(b, 0, 1) };
  };
  IP.toHSI = function (img) {
    const H = new Gray(img.w, img.h), S = new Gray(img.w, img.h), I = new Gray(img.w, img.h);
    for (let k = 0; k < img.r.length; k++) { const c = IP.rgb2hsi(img.r[k] / 255, img.g[k] / 255, img.b[k] / 255); H.d[k] = c.h; S.d[k] = c.s; I.d[k] = c.i; }
    return { H, S, I };
  };
  IP.fromHSI = function (H, S, I) {
    const o = new RGB(H.w, H.h);
    for (let k = 0; k < o.r.length; k++) { const c = IP.hsi2rgb(H.d[k], clamp(S.d[k], 0, 1), clamp(I.d[k], 0, 1)); o.r[k] = c.r * 255; o.g[k] = c.g * 255; o.b[k] = c.b * 255; }
    return o;
  };
})();
