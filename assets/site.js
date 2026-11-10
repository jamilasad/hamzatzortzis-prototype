/* Hamza Andreas Tzortzis — prototype behaviour (no dependencies) */
(function () {
  var root = document.documentElement;
  root.classList.remove('no-js');
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var BASE = root.getAttribute('data-base') || './';

  /* ---- theme: follows the device, with a remembered manual switch ---- */
  var saved = store.get('hat-theme');
  if (saved) root.setAttribute('data-theme', saved);
  function isDark() {
    var t = root.getAttribute('data-theme');
    return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
    function label() { b.setAttribute('aria-label', isDark() ? 'Switch to light mode' : 'Switch to dark mode'); }
    label();
    b.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next); store.set('hat-theme', next); label();
    });
  });

  /* ---- mobile menu ---- */
  var sheet = document.querySelector('.sheet');
  document.querySelectorAll('[data-menu-open]').forEach(function (b) {
    b.addEventListener('click', function () { sheet.classList.add('open'); document.body.style.overflow = 'hidden'; sheet.querySelector('a, button').focus(); });
  });
  document.querySelectorAll('[data-menu-close]').forEach(function (b) {
    b.addEventListener('click', function () { sheet.classList.remove('open'); document.body.style.overflow = ''; });
  });

  /* ---- site search (prototype: essays, lectures and key pages) ---- */
  var panel = document.querySelector('.search-panel');
  var input = panel && panel.querySelector('.search-input');
  var results = panel && panel.querySelector('.search-results');
  function norm(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[ʿʾ’'`]/g, '').replace(/qur ?an/g, 'quran').replace(/hadith/g, 'hadith');
  }
  function openSearch() {
    if (!panel) return;
    panel.classList.add('open'); input.value = ''; render(''); setTimeout(function () { input.focus(); }, 30);
  }
  function closeSearch() { panel && panel.classList.remove('open'); }
  function render(q) {
    var idx = window.HAT_INDEX || [];
    var nq = norm(q).trim();
    var hits = idx.filter(function (d) { return !nq || norm(d.t + ' ' + d.k + ' ' + d.x).indexOf(nq) > -1; }).slice(0, 12);
    results.innerHTML = hits.map(function (d) {
      return '<li><a href="' + (d.u.indexOf('http') === 0 ? d.u : BASE + d.u) + '"><span class="t">' + d.t + '</span><span class="meta">' + d.k + '</span></a></li>';
    }).join('') || '<li class="meta" style="padding:14px 10px">No matches yet. In the full site, search will also cover videos, podcasts and transcripts.</li>';
  }
  document.querySelectorAll('[data-search-open]').forEach(function (b) { b.addEventListener('click', function () { if (sheet) sheet.classList.remove('open'); openSearch(); }); });
  if (panel) {
    input.addEventListener('input', function () { render(input.value); });
    panel.addEventListener('click', function (e) { if (e.target === panel) closeSearch(); });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeSearch(); if (sheet) { sheet.classList.remove('open'); document.body.style.overflow = ''; } closeBuy(); }
    if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
  });

  /* ---- reveal on scroll (once) ---- */
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- buy menu (book page) ---- */
  var buyBtn = document.querySelector('[data-buy]');
  var buyMenu = document.querySelector('.buy-menu');
  function closeBuy() { if (buyMenu) { buyMenu.classList.remove('open'); buyBtn.setAttribute('aria-expanded', 'false'); } }
  if (buyBtn) {
    buyBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !buyMenu.classList.contains('open');
      buyMenu.classList.toggle('open', open); buyBtn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', closeBuy);
  }

  /* ---- prototype forms ---- */
  document.querySelectorAll('form[data-proto]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = f.querySelector('.form-note');
      if (note) note.textContent = 'Prototype only: nothing was sent. In the live site this joins the mailing list (double opt-in).';
    });
  });

  /* ---- article: reading progress, contents highlight, footnote previews, citation copy ---- */
  var prose = document.querySelector('.prose');
  var bar = document.querySelector('.progress');
  if (prose && bar) {
    var prog = function () {
      var r = prose.getBoundingClientRect();
      var total = r.height - window.innerHeight * .6;
      var p = Math.min(1, Math.max(0, -r.top / (total || 1)));
      bar.style.width = (p * 100).toFixed(1) + '%';
    };
    window.addEventListener('scroll', prog, { passive: true }); prog();
  }
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.toc a'));
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var heads = tocLinks.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
    var tio = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) {
          tocLinks.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id); });
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    heads.forEach(function (h) { tio.observe(h); });
  }
  var pop;
  document.querySelectorAll('a.fn').forEach(function (a) {
    function show() {
      var note = document.getElementById(a.getAttribute('href').slice(1));
      if (!note) return;
      hide();
      pop = document.createElement('div'); pop.className = 'fn-pop'; pop.setAttribute('role', 'tooltip');
      pop.textContent = note.textContent.replace(/↩\s*$/, '').trim();
      document.body.appendChild(pop);
      var r = a.getBoundingClientRect();
      var left = Math.min(window.scrollX + r.left - 20, window.scrollX + document.documentElement.clientWidth - pop.offsetWidth - 16);
      pop.style.left = Math.max(12, left) + 'px';
      pop.style.top = (window.scrollY + r.bottom + 10) + 'px';
    }
    function hide() { if (pop) { pop.remove(); pop = null; } }
    a.addEventListener('mouseenter', show); a.addEventListener('focus', show);
    a.addEventListener('mouseleave', hide); a.addEventListener('blur', hide);
  });
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var src = document.querySelector(b.getAttribute('data-copy'));
      var text = src ? src.textContent.trim() : location.href;
      if (b.getAttribute('data-copy') === 'url') text = location.href;
      var done = function () { var o = b.textContent; b.textContent = 'Copied'; setTimeout(function () { b.textContent = o; }, 1400); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, done); else done();
    });
  });

  /* ---- essays library: search, topic and format filters, sort ---- */
  var lib = document.querySelector('[data-library]');
  if (lib) {
    var items = window.HAT_ESSAYS || [];
    var list = lib.querySelector('.lib-list');
    var count = lib.querySelector('.lib-count');
    var q = lib.querySelector('.lib-q');
    var sort = lib.querySelector('.lib-sort');
    var state = { topic: 'all', kind: 'all' };
    var params = new URLSearchParams(location.search);
    if (params.get('topic')) state.topic = params.get('topic');
    function pressed(group, val) {
      lib.querySelectorAll('[data-' + group + ']').forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-' + group) === val)); });
    }
    function draw() {
      var nq = norm(q.value).trim();
      var rows = items.filter(function (e) {
        if (state.kind !== 'all' && e.kind !== state.kind) return false;
        if (state.topic !== 'all' && e.topics.indexOf(state.topic) < 0) return false;
        return !nq || norm(e.title + ' ' + e.excerpt + ' ' + e.topics.join(' ')).indexOf(nq) > -1;
      });
      var s = sort.value;
      rows.sort(function (a, b) {
        if (s === 'old') return a.date < b.date ? -1 : 1;
        if (s === 'long') return b.minutes - a.minutes;
        if (s === 'short') return a.minutes - b.minutes;
        return a.date < b.date ? 1 : -1;
      });
      count.textContent = rows.length + (rows.length === 1 ? ' piece' : ' pieces');
      list.innerHTML = rows.map(function (e) {
        var thumb = e.image ? '<a class="thumb duo" href="' + e.href + '" tabindex="-1" aria-hidden="true"><img src="' + BASE + e.image + '" alt="" loading="lazy"></a>' : '<span></span>';
        var badge = e.built ? '' : '<span class="badge archive" title="Opens the archived copy of the old site">Archive</span>';
        return '<li class="lib-item"><div><span class="kicker">' + (e.kind === 'lecture' ? 'Lecture' : (e.topics[0] || 'Essay')) + '</span>' +
          '<h3><a href="' + e.href + '">' + e.title + '</a>' + badge + '</h3><p>' + e.excerpt + '</p>' +
          '<div class="meta">' + e.dateLabel + '<span class="dot">·</span>' + e.minutes + ' min ' + (e.kind === 'lecture' ? 'summary + video' : 'read') +
          (e.book ? '<span class="dot">·</span>From <i>The Divine Reality</i>' : '') + '</div></div>' + thumb + '</li>';
      }).join('') || '<li class="empty">Nothing matches that yet. Try another word or clear the filters.</li>';
    }
    lib.querySelectorAll('[data-topic]').forEach(function (c) { c.addEventListener('click', function () { state.topic = c.getAttribute('data-topic'); pressed('topic', state.topic); draw(); }); });
    lib.querySelectorAll('[data-kind]').forEach(function (c) { c.addEventListener('click', function () { state.kind = c.getAttribute('data-kind'); pressed('kind', state.kind); draw(); }); });
    q.addEventListener('input', draw); sort.addEventListener('change', draw);
    pressed('topic', state.topic); pressed('kind', state.kind); draw();
  }
})();
