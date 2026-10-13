/* App: routing, rendering, progress, quizzes, search, mock exam. */
(function () {
  'use strict';
  const view = document.getElementById('view');
  const nav = document.getElementById('nav');
  const st = () => Store.get();
  const CH = window.CHAPTERS.sort((a, b) => a.n - b.n);
  // Shuffle MCQ options once, deterministically per question, so answer letters are evenly spread.
  CH.forEach((c) => c.mcq.forEach((q, i) => {
    const rnd = IP.rng(c.n * 1000 + i * 7 + 13), idx = [0, 1, 2, 3];
    for (let k = 3; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [idx[k], idx[j]] = [idx[j], idx[k]]; }
    q.o = idx.map((k) => q.o[k]); q.a = idx.indexOf(q.a);
  }));
  const byId = (id) => CH.find((c) => c.id === id);
  const App = (window.App = {});

  // ---------- math ----------
  App.renderMath = function (root) {
    root = root || view;
    if (!window.renderMathInElement) return;
    try {
      window.renderMathInElement(root, {
        delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
        throwOnError: false, ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option', 'canvas'],
      });
    } catch (e) { console.warn(e); }
  };

  // ---------- content rendering ----------
  const NOTE_LABEL = { exam: 'Exam note', tip: 'Tip', mistake: 'Common mistake', warn: 'Careful', slide: 'Slide check', extra: 'Additional example', diff: 'Key difference', formula: 'Formula' };
  const arDiv = (s) => (s ? `<div class="ar" lang="ar" dir="rtl">${s}</div>` : '');
  const list = (items, tag) => `<${tag}>${items.map((i) => `<li>${i}</li>`).join('')}</${tag}>`;
  const arList = (ar, tag) => (!ar ? '' : Array.isArray(ar) ? arDiv(list(ar, tag || 'ul')) : arDiv(ar));

  function block(b) {
    switch (b.t) {
      case 'p': return `<p>${b.en}</p>${arDiv(b.ar)}`;
      case 'ul': case 'ol': return list(b.en, b.t) + arList(b.ar, b.t);
      case 'def': return `<div class="def"><span class="def-term">${b.term}</span>${b.en}${arDiv(b.ar)}</div>`;
      case 'f': return `<div class="formula">${b.name ? `<div class="fname">${b.name}</div>` : ''}$$${b.tex}$$${b.cap ? `<div class="fcap">${b.cap}</div>` : ''}${arDiv(b.capAr)}</div>`;
      case 'vis': return `<div class="vis-block"><div class="vis" data-vis="${b.id}"><p class="muted">Loading visual…</p></div>${b.cap ? `<p class="vis-cap">${b.cap}</p>` : ''}${arDiv(b.capAr)}</div>`;
      case 'ex': return `<div class="example"><div class="example-head"><span class="tag">${b.tag || 'Slide example'}</span>${b.title || ''}</div><div class="example-body">${b.q}<details${b.open ? ' open' : ''}><summary>Show solution</summary><div class="solution">${b.sol}${arDiv(b.ar)}</div></details></div></div>`;
      case 'note': return `<div class="note ${b.k}"><span class="nk">${b.label || NOTE_LABEL[b.k] || 'Note'}</span>${b.en}${arDiv(b.ar)}</div>`;
      case 'table': return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${b.head.map((x) => `<th>${x}</th>`).join('')}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((x) => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${arDiv(b.ar)}`;
      case 'more': return `<details class="more"><summary>${b.title}</summary>${b.en}${arDiv(b.ar)}</details>`;
      case 'h3': return `<h3>${b.en}${b.ar ? `<span class="ar-i" lang="ar">${b.ar}</span>` : ''}</h3>`;
      case 'html': return (b.en || '') + arDiv(b.ar);
      default: return '';
    }
  }
  App.block = block;

  // ---------- progress ----------
  function chStats(c) {
    const s = st();
    const ans = s.mcq[c.id] || {};
    const answered = Object.keys(ans).length;
    const correct = Object.entries(ans).filter(([i, v]) => c.mcq[i] && c.mcq[i].a === v).length;
    const ess = Object.keys(s.essays[c.id] || {}).length;
    const read = Object.keys(s.read[c.id] || {}).filter((k) => c.sections.some((x) => x.id === k)).length;
    const done = !!s.done[c.id];
    const pct = done ? 1 : 0.45 * (read / c.sections.length) + 0.4 * (answered / c.mcq.length) + 0.15 * (ess / Math.max(1, c.essays.length));
    return { answered, correct, ess, read, done, pct: Math.min(1, pct) };
  }
  App.chStats = chStats;

  // ---------- sidebar ----------
  function renderNav(active) {
    if (active == null) active = App._active; else App._active = active;
    const items = CH.map((c) => {
      const s = chStats(c);
      return `<a class="nav-link${active === c.id ? ' on' : ''}${s.done ? ' done' : ''}" href="#/ch/${c.n}">
        <span class="nav-num">${s.done ? '✓' : String(c.n).padStart(2, '0')}</span>
        <span>${c.title}<span class="nav-sub">${c.short || ''}</span></span>
        <span class="nav-meter" title="${Math.round(s.pct * 100)}% studied"><i style="width:${Math.round(s.pct * 100)}%"></i></span></a>`;
    }).join('');
    const tool = (href, icon, label, key) => `<a class="nav-link${active === key ? ' on' : ''}" href="${href}"><span class="nav-icon">${icon}</span><span>${label}</span><span></span></a>`;
    nav.innerHTML = `
      <div class="nav-group">${tool('#/', '⌂', 'Dashboard', 'home')}</div>
      <div class="nav-group"><div class="nav-title">Lectures</div>${items}</div>
      <div class="nav-group"><div class="nav-title">Study tools</div>
        ${tool('#/formulas', 'Σ', 'Formula sheet', 'formulas')}
        ${tool('#/revision', '✦', 'Quick revision', 'revision')}
        ${tool('#/mock', '⏱', 'Mock midterm', 'mock')}
      </div>
      <div class="side-foot">Progress is saved in this browser only.<br><button type="button" id="resetBtn">Reset all progress</button></div>`;
    nav.querySelector('#resetBtn').onclick = () => {
      if (confirm('Reset all progress (completed chapters, answers, mock results)? Your language and theme settings are kept.')) {
        const { ar, theme } = st();
        Store.reset(); Object.assign(st(), { ar, theme }); Store.save(); route();
      }
    };
  }

  // ---------- thumbnails ----------
  const thumbCache = {};
  function thumb(c) {
    if (thumbCache[c.id]) return thumbCache[c.id];
    try {
      const r = c.thumb ? c.thumb() : IP.scene(256);
      const im = r.img || r;
      const cv = document.createElement('canvas');
      IP.show(im, cv, r.mode || 'clip');
      thumbCache[c.id] = cv.toDataURL('image/jpeg', 0.85);
    } catch (e) { console.warn(e); thumbCache[c.id] = ''; }
    return thumbCache[c.id];
  }

  // ---------- views ----------
  function viewHome() {
    renderNav('home');
    const s = st();
    const stats = CH.map(chStats);
    const doneN = stats.filter((x) => x.done).length;
    const totalQ = CH.reduce((a, c) => a + c.mcq.length, 0);
    const ans = stats.reduce((a, x) => a + x.answered, 0), cor = stats.reduce((a, x) => a + x.correct, 0);
    const ess = stats.reduce((a, x) => a + x.ess, 0), totalE = CH.reduce((a, c) => a + c.essays.length, 0);
    const studied = stats.reduce((a, x) => a + x.pct, 0) / CH.length;
    const best = s.mock.length ? Math.max(...s.mock.map((m) => Math.round((100 * m.score) / m.total))) : null;
    const R = 50, C = 2 * Math.PI * R;
    const last = s.last && byId(s.last);
    const ramp = Array.from({ length: 16 }, (_, i) => `<i style="background:rgb(${i * 17},${i * 17},${i * 17})"></i>`).join('');
    view.innerHTML = `<div class="home">
      <div class="hero">
        <div class="card hero-main">
          <div class="eyebrow">ARTI 403 · Midterm revision · Lectures 1–8</div>
          <h1>Image Processing, one pixel at a time.</h1>
          <p>Everything from your eight lecture decks, rebuilt as interactive study pages: live demos you can tweak, worked examples, mind maps, MCQs, essay questions and a full mock midterm. Every image below is processed live in your browser.</p>
          <p class="ar" lang="ar" dir="rtl">مراجعة تفاعلية لمقرر معالجة الصور مبنية على محاضراتك الثماني: شروحات بالإنجليزية والعربية، عروض بصرية تفاعلية، خرائط ذهنية، أسئلة اختيار من متعدد، أسئلة مقالية مع إجابات نموذجية، واختبار تجريبي شامل.</p>
          <div class="hero-actions">
            ${last ? `<a class="btn primary" href="#/ch/${last.n}">Continue: Lecture ${last.n} →</a>` : `<a class="btn primary" href="#/ch/1">Start with Lecture 1 →</a>`}
            <a class="btn" href="#/mock">Take the mock midterm</a>
            <a class="btn" href="#/formulas">Formula sheet</a>
          </div>
          <div class="hero-ramp" aria-hidden="true">${ramp}</div>
        </div>
        <div class="card hero-stats">
          <div class="ring" role="img" aria-label="${Math.round(studied * 100)} percent studied">
            <svg width="118" height="118" viewBox="0 0 118 118"><circle cx="59" cy="59" r="${R}" fill="none" stroke="var(--line)" stroke-width="10"/>
            <circle cx="59" cy="59" r="${R}" fill="none" stroke="var(--accent)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - studied)}"/></svg>
            <b>${Math.round(studied * 100)}%</b><small>studied</small>
          </div>
          <div class="stat-list">
            <div><span>Chapters completed</span><b>${doneN} / ${CH.length}</b></div>
            <div><span>MCQs answered</span><b>${ans} / ${totalQ}</b></div>
            <div><span>MCQ accuracy</span><b>${ans ? Math.round((100 * cor) / ans) + '%' : '—'}</b></div>
            <div><span>Essay answers reviewed</span><b>${ess} / ${totalE}</b></div>
            <div><span>Best mock score</span><b>${best == null ? '—' : best + '%'}</b></div>
          </div>
        </div>
      </div>
      <div class="section-head"><h2>Lectures</h2><span class="muted">${CH.length} chapters</span></div>
      <div class="ch-grid">${CH.map((c, i) => {
        const x = stats[i];
        return `<a class="card ch-card" href="#/ch/${c.n}">
          <div class="ch-thumb"><img alt="" data-thumb="${c.id}"><span class="num">L${String(c.n).padStart(2, '0')}</span>${x.done ? '<span class="done-badge">✓ Completed</span>' : ''}</div>
          <div class="ch-body"><h3>${c.title}</h3><div class="ar-title ar-i" lang="ar" style="margin:0">${c.ar}</div><p>${c.blurb}</p>
            <div class="ch-meta"><div class="bar"><i style="width:${Math.round(x.pct * 100)}%"></i></div>
            <span>${Math.round(x.pct * 100)}% studied · MCQ ${x.correct}/${x.answered} correct · ${c.mcq.length} questions</span></div>
          </div></a>`;
      }).join('')}</div>
      <div class="section-head"><h2>Study tools</h2></div>
      <div class="tool-grid">
        <a class="card tool" href="#/formulas"><span class="ti">Σ</span><span><b>Formula sheet</b><p>Every formula from the eight lectures, grouped by chapter.</p></span></a>
        <a class="card tool" href="#/revision"><span class="ti">✦</span><span><b>Quick revision</b><p>The must-know points per chapter for the night before.</p></span></a>
        <a class="card tool" href="#/mock"><span class="ti">⏱</span><span><b>Mock midterm</b><p>32 mixed MCQs across all lectures, timed, with full review.</p></span></a>
      </div></div>`;
    // thumbnails after paint
    setTimeout(() => view.querySelectorAll('img[data-thumb]').forEach((img) => { img.src = thumb(byId(img.dataset.thumb)); }), 30);
  }

  const TABS = [['learn', 'Learn'], ['map', 'Mind map'], ['notes', 'Exam notes'], ['mcq', 'MCQs'], ['essay', 'Essay questions']];
  function viewChapter(c, tab, sec) {
    renderNav(c.id);
    const s = st();
    s.last = c.id; Store.save();
    const x = chStats(c);
    const idx = CH.indexOf(c), prev = CH[idx - 1], next = CH[idx + 1];
    const tabHtml = TABS.map(([k, l]) => {
      const count = k === 'mcq' ? `<span class="count">${x.answered}/${c.mcq.length}</span>` : k === 'essay' ? `<span class="count">${c.essays.length}</span>` : k === 'learn' ? `<span class="count">${c.sections.length}</span>` : '';
      return `<a class="tab${tab === k ? ' on' : ''}" href="#/ch/${c.n}/${k}">${l}${count}</a>`;
    }).join('');
    view.innerHTML = `<div class="chapter">
      <header class="ch-head">
        <div class="eyebrow">${c.lecture} · Reading: ${c.reading}</div>
        <h1>${c.title}</h1>
        <p class="ar-title ar" lang="ar" dir="rtl" style="background:none;border:0;padding:0;margin:2px 0 0;font-size:19px">${c.ar}</p>
        <p class="lead">${c.lead}</p>${arDiv(c.leadAr)}
        <div class="ch-head-meta">
          <label class="complete-box${x.done ? ' on' : ''}"><input type="checkbox" id="doneBox"${x.done ? ' checked' : ''}> Mark chapter as completed</label>
          <span class="pill">${Math.round(x.pct * 100)}% studied</span>
          <span class="pill">${x.read}/${c.sections.length} sections read</span>
          <span id="mcqPill" class="pill ${x.answered ? (x.correct / x.answered >= 0.7 ? 'good' : 'warn') : ''}">MCQ ${x.correct}/${x.answered} correct</span>
        </div>
      </header>
      <nav class="tabs" aria-label="Chapter sections">${tabHtml}</nav>
      <div id="tabBody"></div>
      <nav class="pager">
        ${prev ? `<a class="card" href="#/ch/${prev.n}"><small>← Previous</small>L${prev.n} · ${prev.title}</a>` : '<span></span>'}
        ${next ? `<a class="card next" href="#/ch/${next.n}"><small>Next →</small>L${next.n} · ${next.title}</a>` : `<a class="card next" href="#/mock"><small>Finished all lectures?</small>Take the mock midterm →</a>`}
      </nav></div>`;
    view.querySelector('#doneBox').addEventListener('change', (e) => {
      if (e.target.checked) s.done[c.id] = true; else delete s.done[c.id];
      Store.save(); viewChapter(c, tab);
    });
    const body = view.querySelector('#tabBody');
    ({ learn: tabLearn, map: tabMap, notes: tabNotes, mcq: tabMcq, essay: tabEssay }[tab] || tabLearn)(c, body, sec);
    App.renderMath(view);
    UI.mountAll(view);
  }

  function tabLearn(c, body, sec) {
    const s = st();
    s.read[c.id] = s.read[c.id] || {};
    body.innerHTML = `<div class="learn-grid"><article class="learn-col">${c.sections.map((x, i) => `
      <section class="sec" id="${x.id}">
        <h2><span class="sn">${c.n}.${i + 1}</span>${x.title}</h2>
        ${x.ar ? `<div class="ar-title" lang="ar">${x.ar}</div>` : ''}
        ${x.blocks.map(block).join('')}
        <div class="sec-end" data-sec="${x.id}"></div>
      </section>`).join('')}</article>
      <aside class="toc" aria-label="On this page"><b>On this page</b>${c.sections.map((x) => `<a href="#/ch/${c.n}/learn/${x.id}" data-toc="${x.id}" class="${s.read[c.id][x.id] ? 'read' : ''}">${x.title}</a>`).join('')}</aside></div>`;
    // mark sections read when their end scrolls into view
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((ents) => {
        ents.forEach((e) => {
          if (!e.isIntersecting) return;
          const id = e.target.dataset.sec;
          if (!s.read[c.id][id]) { s.read[c.id][id] = true; Store.save(); renderNav(c.id); }
          io.unobserve(e.target);
        });
      });
      body.querySelectorAll('.sec-end').forEach((el) => io.observe(el));
      const tocs = body.querySelectorAll('.toc a');
      const io2 = new IntersectionObserver((ents) => {
        ents.forEach((e) => { if (e.isIntersecting) tocs.forEach((a) => a.classList.toggle('on', a.dataset.toc === e.target.id)); });
      }, { rootMargin: '-30% 0px -60% 0px' });
      body.querySelectorAll('.sec').forEach((el) => io2.observe(el));
    }
    if (sec) setTimeout(() => { const el = document.getElementById(sec); if (el) el.scrollIntoView(); }, 60);
    else window.scrollTo(0, 0);
  }

  function tabMap(c, body) {
    body.innerHTML = `<p class="muted" style="max-width:var(--read);margin:0 auto 12px">The whole lecture on one page. Branches start collapsed below the second level — click any node with a <b>+</b> to open it. Turn on Arabic to see Arabic labels.</p><div id="mm"></div>`;
    MindMap(body.querySelector('#mm'), JSON.parse(JSON.stringify(c.mindmap)));
    window.scrollTo(0, 0);
  }

  function tabNotes(c, body) {
    const kinds = [...new Set(c.notes.map((n) => n.k))];
    body.innerHTML = `<div class="notes-grid">
      <div class="note tip"><span class="nk">How to use</span>Definitions, formulas, differences and traps the exam is likely to test. The <b>Key formulas</b> are also in the <a href="#/formulas">formula sheet</a>.</div>
      <h2>Key formulas</h2>
      <div class="fs-grid">${c.formulas.map((f) => `<div class="card fs-card"><div class="fname">${f.name}</div>$$${f.tex}$$${f.cap ? `<div class="fcap">${f.cap}</div>` : ''}</div>`).join('')}</div>
      <h2 style="margin-top:14px">Exam notes</h2>
      <div class="notes-filter"><button class="btn small primary" data-k="all">All (${c.notes.length})</button>${kinds.map((k) => `<button class="btn small" data-k="${k}">${NOTE_LABEL[k] || k} (${c.notes.filter((n) => n.k === k).length})</button>`).join('')}</div>
      <div id="noteList">${c.notes.map((n) => `<div class="note ${n.k}" data-k="${n.k}"><span class="nk">${NOTE_LABEL[n.k] || 'Note'}</span>${n.en}${arDiv(n.ar)}</div>`).join('')}</div>
    </div>`;
    body.querySelectorAll('.notes-filter button').forEach((b) => b.addEventListener('click', () => {
      body.querySelectorAll('.notes-filter button').forEach((x) => x.classList.toggle('primary', x === b));
      body.querySelectorAll('#noteList .note').forEach((n) => { n.style.display = b.dataset.k === 'all' || n.dataset.k === b.dataset.k ? '' : 'none'; });
    }));
    window.scrollTo(0, 0);
  }

  // A single MCQ card. onPick(choice) is called once. state: chosen index or undefined.
  function mcqCard(q, num, chosen, onPick, opt) {
    opt = opt || {};
    const card = h('div', { class: 'card mcq' });
    const L = 'ABCD';
    card.innerHTML = `<div class="mcq-q"><span class="mcq-n">Q${num}</span><div>${q.q}${opt.src ? `<div class="mcq-src">${opt.src}</div>` : ''}</div></div>`;
    const opts = h('div', { class: 'opts', role: 'group' });
    const fb = h('div', { class: 'feedback', style: { display: 'none' } });
    const show = (ch) => {
      [...opts.children].forEach((b, i) => {
        b.disabled = true;
        if (opt.hideAnswer) { if (i === ch) b.classList.add('correct'); else b.classList.add('dim'); return; }
        if (i === q.a) b.classList.add('correct');
        else if (i === ch) b.classList.add('wrong');
        else b.classList.add('dim');
      });
      if (opt.hideAnswer) return;
      const ok = ch === q.a;
      fb.className = 'feedback ' + (ok ? 'ok' : 'no');
      fb.innerHTML = `<span class="fb-h">${ok ? 'Correct.' : 'Not quite — the answer is ' + L[q.a] + '.'}</span> ${q.ex}${arDiv(q.exAr)}`;
      fb.style.display = '';
      App.renderMath(fb);
    };
    q.o.forEach((o, i) => {
      const b = h('button', { type: 'button', class: 'opt', html: `<span class="ol">${L[i]}</span><span>${o}</span>` });
      b.addEventListener('click', () => { if (b.disabled) return; onPick(i); show(i); });
      opts.appendChild(b);
    });
    card.append(opts, fb);
    if (chosen != null) show(chosen);
    card.reveal = show;
    return card;
  }
  App.mcqCard = mcqCard;

  function tabMcq(c, body) {
    const s = st();
    s.mcq[c.id] = s.mcq[c.id] || {};
    const ans = s.mcq[c.id];
    body.innerHTML = '';
    const wrap = h('div', { class: 'quiz' });
    const bar = h('div', { class: 'card quiz-bar' });
    const list_ = h('div', {});
    let filter = 'all';
    const upd = () => {
      const a = Object.keys(ans).length, k = Object.entries(ans).filter(([i, v]) => c.mcq[i] && c.mcq[i].a === v).length;
      const pill = document.getElementById('mcqPill');
      if (pill) { pill.textContent = `MCQ ${k}/${a} correct`; pill.className = 'pill ' + (a ? (k / a >= 0.7 ? 'good' : 'warn') : ''); }
      bar.innerHTML = `<span class="score">Score <b>${k}</b> / ${a} answered · ${c.mcq.length} total</span><div class="bar"><i style="width:${(100 * a) / c.mcq.length}%"></i></div>`;
      const f = UI.seg(null, [['all', 'All'], ['todo', 'Unanswered'], ['wrong', 'Wrong']], filter, (v) => { filter = v; draw(); });
      const reset = h('button', { class: 'btn small', type: 'button', onclick: () => { if (!Object.keys(ans).length || confirm('Clear your answers for this chapter?')) { s.mcq[c.id] = {}; Store.save(); tabMcq(c, body); renderNav(c.id); } } }, 'Reset');
      bar.append(f, reset);
    };
    const draw = () => {
      list_.innerHTML = '';
      c.mcq.forEach((q, i) => {
        if (filter === 'todo' && ans[i] != null) return;
        if (filter === 'wrong' && !(ans[i] != null && ans[i] !== q.a)) return;
        list_.appendChild(mcqCard(q, i + 1, ans[i], (ch) => { ans[i] = ch; Store.save(); upd(); renderNav(c.id); }));
      });
      if (!list_.children.length) list_.innerHTML = '<p class="muted" style="text-align:center">Nothing here — nice work.</p>';
      App.renderMath(list_);
    };
    upd(); draw();
    wrap.append(bar, list_);
    body.appendChild(wrap);
    window.scrollTo(0, 0);
  }

  function essayCard(c, e, i, opt) {
    const s = st();
    opt = opt || {};
    const seen = !!(s.essays[c.id] || {})[i];
    const card = h('div', { class: 'card essay' });
    card.innerHTML = `<div class="essay-q"><span class="mcq-n">${opt.num || 'E' + (i + 1)}</span><div>${e.q}${e.qAr ? `<div class="ar" lang="ar" dir="rtl">${e.qAr}</div>` : ''}<div class="essay-type"><span class="pill ${e.type === 'long' ? 'violet' : ''}">${e.type === 'long' ? 'Long answer' : 'Short answer'}</span>${seen ? ' <span class="pill good">Reviewed</span>' : ''}${opt.src ? ` <span class="pill">${opt.src}</span>` : ''}</div></div></div>`;
    const ansBox = h('div', { class: 'essay-ans', style: { display: 'none' }, html: e.a + arDiv(e.aAr) });
    const btn = h('button', { type: 'button', class: 'btn small' }, 'Show model answer');
    btn.addEventListener('click', () => {
      const open = ansBox.style.display === 'none';
      ansBox.style.display = open ? '' : 'none';
      btn.textContent = open ? 'Hide model answer' : 'Show model answer';
      if (open) {
        App.renderMath(ansBox);
        s.essays[c.id] = s.essays[c.id] || {};
        if (!s.essays[c.id][i]) { s.essays[c.id][i] = true; Store.save(); renderNav(); }
      }
    });
    card.append(h('div', { class: 'essay-actions' }, btn), ansBox);
    return card;
  }

  function tabEssay(c, body) {
    const wrap = h('div', { class: 'quiz' });
    wrap.appendChild(h('div', { class: 'note tip', html: '<span class="nk">Method</span>Try answering in your own words first (out loud or on paper), then open the model answer and compare. Model answers are written to be memorised: definition → key points → formula/example.' }));
    let filter = 'all';
    const listEl = h('div');
    const draw = () => {
      listEl.innerHTML = '';
      c.essays.forEach((e, i) => { if (filter === 'all' || e.type === filter) listEl.appendChild(essayCard(c, e, i)); });
      App.renderMath(listEl);
    };
    wrap.appendChild(h('div', { style: { marginBottom: '14px' } }, UI.seg('Show', [['all', 'All'], ['short', 'Short answer'], ['long', 'Long answer']], 'all', (v) => { filter = v; draw(); })));
    wrap.appendChild(listEl);
    draw();
    body.appendChild(wrap);
    window.scrollTo(0, 0);
  }

  function viewFormulas() {
    renderNav('formulas');
    view.innerHTML = `<div class="page"><div class="page-head"><div class="eyebrow">Reference</div><h1>Formula sheet</h1>
      <p>All formulas from Lectures 1–8 in one place. Click a chapter title to jump to its full explanation.</p>
      ${arDiv('جميع القوانين من المحاضرات ١–٨ في مكان واحد، مرتبة حسب الفصل.')}</div>
      ${CH.map((c) => `<section class="fs-group"><h2><span class="eyebrow">L${String(c.n).padStart(2, '0')}</span><a href="#/ch/${c.n}" style="color:inherit">${c.title}</a></h2>
      <div class="fs-grid">${c.formulas.map((f) => `<div class="card fs-card"><div class="fname">${f.name}</div>$$${f.tex}$$${f.cap ? `<div class="fcap">${f.cap}</div>` : ''}</div>`).join('')}</div></section>`).join('')}</div>`;
    App.renderMath(view);
    window.scrollTo(0, 0);
  }

  function viewRevision() {
    renderNav('revision');
    view.innerHTML = `<div class="page"><div class="page-head"><div class="eyebrow">Night-before checklist</div><h1>Quick revision</h1>
      <p>The points most likely to be examined, chapter by chapter. If any line feels unfamiliar, open that chapter.</p>
      ${arDiv('أهم النقاط المتوقعة في الاختبار لكل فصل. إذا شعرت أن نقطة غير واضحة، افتح الفصل الخاص بها.')}</div>
      ${CH.map((c) => `<div class="card rev-card"><h2><span class="eyebrow">L${String(c.n).padStart(2, '0')}</span>${c.title}</h2>
        <ul>${c.revision.map((r) => `<li>${r.en}${r.ar ? `<div class="ar" lang="ar" dir="rtl">${r.ar}</div>` : ''}</li>`).join('')}</ul>
        <a class="btn small" href="#/ch/${c.n}/notes">Exam notes →</a> <a class="btn small" href="#/ch/${c.n}/mcq">Practice MCQs →</a></div>`).join('')}</div>`;
    App.renderMath(view);
    window.scrollTo(0, 0);
  }

  // ---------- search ----------
  let INDEX = null;
  function buildIndex() {
    INDEX = [];
    const add = (c, title, text, href, type) => INDEX.push({ c, title, text: stripHtml(text), href, type, low: stripHtml(title + ' ' + text).toLowerCase() });
    CH.forEach((c) => {
      c.sections.forEach((s) => {
        const txt = s.blocks.map((b) => [b.en, b.ar, b.term, b.q, b.sol, b.cap, b.capAr, b.title, b.name, b.tex, (b.rows || []).flat().join(' '), (b.head || []).join(' ')].flat().filter(Boolean).join(' ')).join(' ');
        add(c, s.title + (s.ar ? ' — ' + s.ar : ''), txt, `#/ch/${c.n}/learn/${s.id}`, 'Section');
      });
      c.notes.forEach((n) => add(c, NOTE_LABEL[n.k] || 'Note', n.en + ' ' + (n.ar || ''), `#/ch/${c.n}/notes`, 'Exam note'));
      c.formulas.forEach((f) => add(c, f.name, f.tex + ' ' + (f.cap || ''), `#/ch/${c.n}/notes`, 'Formula'));
      c.mcq.forEach((q, i) => add(c, 'MCQ ' + (i + 1), q.q + ' ' + q.o.join(' ') + ' ' + q.ex, `#/ch/${c.n}/mcq`, 'MCQ'));
      c.essays.forEach((e, i) => add(c, 'Essay ' + (i + 1) + ': ' + stripHtml(e.q).slice(0, 80), e.q + ' ' + e.a + ' ' + (e.aAr || ''), `#/ch/${c.n}/essay`, 'Essay'));
    });
  }
  function viewSearch(q) {
    renderNav('');
    if (!INDEX) buildIndex();
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const res = terms.length ? INDEX.filter((it) => terms.every((t) => it.low.includes(t)))
      .map((it) => ({ it, score: terms.reduce((a, t) => a + (it.title.toLowerCase().includes(t) ? 5 : 0) + (it.type === 'Section' ? 2 : 0), 0) }))
      .sort((a, b) => b.score - a.score).slice(0, 60) : [];
    const snip = (text) => {
      const low = text.toLowerCase(), i = Math.max(0, low.indexOf(terms[0]));
      let s = (i > 60 ? '…' : '') + text.slice(Math.max(0, i - 60), i + 160) + '…';
      s = escapeHtml(s);
      terms.forEach((t) => { s = s.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>'); });
      return s;
    };
    view.innerHTML = `<div class="page"><div class="page-head"><div class="eyebrow">Search</div><h1>${res.length} result${res.length === 1 ? '' : 's'} for “${escapeHtml(q)}”</h1>
      <p class="muted">Searches lecture text, Arabic explanations, notes, formulas, MCQs and essay answers.</p></div>
      <div class="search-res">${res.map(({ it }) => `<a class="card sr" href="${it.href}"><div class="sr-meta">L${it.c.n} · ${it.c.title} · ${it.type}</div><div class="sr-title">${escapeHtml(it.title)}</div><div class="sr-snip">${snip(it.text)}</div></a>`).join('') || '<p class="muted">No matches. Try a shorter or different term (e.g. “median”, “gamma”, “Laplacian”, “HSI”).</p>'}</div></div>`;
    window.scrollTo(0, 0);
  }

  // ---------- mock exam ----------
  let mock = null;
  function shuffle(a, rnd) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function viewMock() {
    renderNav('mock');
    const s = st();
    if (!mock || mock.finished === 'left') {
      view.innerHTML = `<div class="page"><div class="page-head"><div class="eyebrow">Exam simulation</div><h1>Mock midterm</h1>${arDiv('اختبار تجريبي يغطي جميع المحاضرات.')}</div>
        <div class="card mock-intro">
          <ul><li><b>32 MCQs</b> — 4 random questions from each of the 8 lectures, in shuffled order.</li>
          <li><b>3 essay questions</b> to answer on paper; model answers unlock after you submit.</li>
          <li>Suggested time: <b>60 minutes</b>. The timer counts down but never locks you out.</li>
          <li>No feedback until you submit — just like the real exam.</li></ul>
          <button class="btn accent" id="startMock" type="button">Start mock midterm</button>
          ${s.mock.length ? `<h3 style="margin-top:22px">Previous attempts</h3><div class="breakdown">${s.mock.slice(-8).reverse().map((m) => `<div><b>${Math.round((100 * m.score) / m.total)}%</b> · ${m.score}/${m.total}<br><span class="muted">${new Date(m.date).toLocaleString()}</span></div>`).join('')}</div>` : ''}
        </div></div>`;
      view.querySelector('#startMock').onclick = () => { startMock(); };
      return;
    }
    drawMock();
  }
  function startMock() {
    const rnd = IP.rng((Date.now() % 1e9) | 0);
    const qs = [];
    CH.forEach((c) => shuffle(c.mcq.map((q, i) => ({ c, q, i })), rnd).slice(0, 4).forEach((x) => qs.push(x)));
    const ess = shuffle(CH.flatMap((c) => c.essays.map((e, i) => ({ c, e, i })).filter((x) => x.e.type === 'long')), rnd).slice(0, 3);
    mock = { qs: shuffle(qs, rnd), ess, ans: {}, start: Date.now(), finished: false };
    drawMock();
  }
  function drawMock() {
    clearInterval(App._timer);
    view.innerHTML = '';
    const page = h('div', { class: 'page quiz' });
    const bar = h('div', { class: 'card quiz-bar' });
    const listEl = h('div');
    page.append(h('div', { class: 'page-head' }, h('div', { class: 'eyebrow' }, 'Mock midterm'), h('h1', {}, mock.finished ? 'Your results' : 'Answer all questions, then submit')), bar, listEl);
    view.appendChild(page);
    const tick = () => {
      const left = Math.max(0, 3600 - Math.floor((Date.now() - mock.start) / 1000));
      const t = bar.querySelector('.timer');
      if (t) t.textContent = `⏱ ${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}${left === 0 ? ' — time is up' : ''}`;
    };
    if (!mock.finished) {
      bar.innerHTML = `<span class="timer"></span><span class="score" id="mockCount"></span>`;
      const submit = h('button', { class: 'btn accent small', type: 'button' }, 'Submit exam');
      submit.onclick = () => {
        const n = Object.keys(mock.ans).length;
        if (n < mock.qs.length && !confirm(`You answered ${n} of ${mock.qs.length}. Submit anyway?`)) return;
        finishMock();
      };
      bar.appendChild(submit);
      const cnt = () => { bar.querySelector('#mockCount').textContent = `${Object.keys(mock.ans).length} / ${mock.qs.length} answered`; };
      cnt(); tick();
      App._timer = setInterval(tick, 1000);
      mock.qs.forEach((x, k) => {
        const card = mcqCard(x.q, k + 1, mock.ans[k], (ch) => {
          mock.ans[k] = ch; cnt();
          // allow changing the answer before submission
          setTimeout(() => { const nc = mcqCardRe(x, k); card.replaceWith(nc); App.renderMath(nc); }, 0);
        }, { hideAnswer: true, src: `Lecture ${x.c.n}` });
        listEl.appendChild(card);
      });
      mock.ess.forEach((x, k) => listEl.appendChild(essayCard(x.c, x.e, x.i, { num: 'E' + (k + 1), src: 'Lecture ' + x.c.n })));
      listEl.querySelectorAll('.essay-actions').forEach((el) => { el.innerHTML = '<span class="muted">Model answer unlocks after you submit.</span>'; });
      function mcqCardRe(x, k) {
        const card = mcqCard(x.q, k + 1, undefined, (ch) => { mock.ans[k] = ch; cnt(); setTimeout(() => { const nc = mcqCardRe(x, k); card.replaceWith(nc); App.renderMath(nc); }, 0); }, { src: `Lecture ${x.c.n}` });
        [...card.querySelectorAll('.opt')].forEach((b, i) => { if (i === mock.ans[k]) { b.style.borderColor = 'var(--accent)'; b.style.background = 'var(--accent-soft)'; } });
        return card;
      }
    } else {
      const score = mock.qs.filter((x, k) => mock.ans[k] === x.q.a).length;
      const per = {};
      mock.qs.forEach((x, k) => { const p = (per[x.c.n] = per[x.c.n] || { ok: 0, n: 0, t: x.c.title }); p.n++; if (mock.ans[k] === x.q.a) p.ok++; });
      const mins = Math.round((mock.end - mock.start) / 60000);
      bar.innerHTML = `<div><div class="result-big">${Math.round((100 * score) / mock.qs.length)}%</div><span class="muted">${score} / ${mock.qs.length} correct · ${mins} min</span></div>`;
      bar.append(h('button', { class: 'btn small', type: 'button', onclick: () => { mock = null; viewMock(); } }, 'New attempt'));
      listEl.appendChild(h('div', { class: 'breakdown', html: Object.entries(per).map(([n, p]) => `<div><b>L${n}</b> ${p.t}<br><span class="${p.ok / p.n >= 0.75 ? 'pill good' : p.ok / p.n >= 0.5 ? 'pill warn' : 'pill bad'}">${p.ok}/${p.n}</span> <a href="#/ch/${n}">review</a></div>`).join('') }));
      mock.qs.forEach((x, k) => listEl.appendChild(mcqCard(x.q, k + 1, mock.ans[k] == null ? -1 : mock.ans[k], () => {}, { src: `Lecture ${x.c.n}${mock.ans[k] == null ? ' · not answered' : ''}` })));
      mock.ess.forEach((x, k) => listEl.appendChild(essayCard(x.c, x.e, x.i, { num: 'E' + (k + 1), src: 'Lecture ' + x.c.n })));
    }
    App.renderMath(page);
    window.scrollTo(0, 0);
  }
  function finishMock() {
    clearInterval(App._timer);
    mock.finished = true; mock.end = Date.now();
    const score = mock.qs.filter((x, k) => mock.ans[k] === x.q.a).length;
    st().mock.push({ date: mock.end, score, total: mock.qs.length });
    Store.save();
    drawMock();
  }

  // ---------- router ----------
  function route() {
    clearInterval(App._timer);
    if (mock && !mock.finished && !location.hash.startsWith('#/mock')) mock.finished = 'left';
    closeMenu();
    const parts = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
    const [a, b, c2, d] = parts;
    if (a === 'ch') {
      const ch = CH.find((x) => String(x.n) === b);
      if (ch) return viewChapter(ch, c2 || 'learn', d);
    }
    if (a === 'formulas') return viewFormulas();
    if (a === 'revision') return viewRevision();
    if (a === 'mock') return viewMock();
    if (a === 'search') return viewSearch(parts.slice(1).join('/'));
    if (a === 'vis' && b) { // single-visual view (handy for checking one demo)
      renderNav('');
      view.innerHTML = `<div class="learn-col">${block({ t: 'vis', id: b, cap: 'Visual: <code>' + escapeHtml(b) + '</code>' })}</div>`;
      UI.mountAll(view); window.scrollTo(0, 0); return;
    }
    viewHome();
    window.scrollTo(0, 0);
  }
  App.route = route;

  // ---------- chrome ----------
  const arBtn = document.getElementById('arToggle');
  const setAr = (on) => {
    document.documentElement.classList.toggle('ar-on', on);
    arBtn.setAttribute('aria-checked', String(on));
    st().ar = on; Store.save();
    document.querySelectorAll('.mm-wrap').forEach(() => { /* re-render map labels */ });
    if (location.hash.includes('/map')) route();
  };
  arBtn.addEventListener('click', () => setAr(!st().ar));
  arBtn.setAttribute('aria-checked', String(!!st().ar));

  document.getElementById('themeBtn').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const nxt = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nxt);
    st().theme = nxt; Store.save();
    route(); // re-draw canvases/plots with the new palette
  });

  const sb = document.getElementById('sidebar'), scrim = document.getElementById('scrim'), menuBtn = document.getElementById('menuBtn');
  function closeMenu() { sb.classList.remove('open'); scrim.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }
  menuBtn.addEventListener('click', () => { const o = !sb.classList.contains('open'); sb.classList.toggle('open', o); scrim.classList.toggle('open', o); menuBtn.setAttribute('aria-expanded', String(o)); });
  scrim.addEventListener('click', closeMenu);

  const sInput = document.getElementById('searchInput');
  document.getElementById('searchForm').addEventListener('submit', (e) => { e.preventDefault(); if (sInput.value.trim()) location.hash = '#/search/' + encodeURIComponent(sInput.value.trim()); });
  sInput.addEventListener('input', debounce(() => { const v = sInput.value.trim(); if (v.length >= 2) location.hash = '#/search/' + encodeURIComponent(v); }, 350));
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') { e.preventDefault(); sInput.focus(); }
    if (e.key === 'Escape') closeMenu();
  });

  window.addEventListener('hashchange', route);
  route();
})();
