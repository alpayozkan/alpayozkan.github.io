(function () {
  // ---- theme toggle ----
  var root = document.documentElement;
  var btn = document.getElementById('theme-toggle');
  function prefersDark() { return window.matchMedia('(prefers-color-scheme: dark)').matches; }
  var forced = /[?&]theme=(light|dark)/.exec(location.search);
  if (forced) root.setAttribute('data-theme', forced[1]);
  if (!root.getAttribute('data-theme')) root.setAttribute('data-theme', prefersDark() ? 'dark' : 'light');
  if (btn) btn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  // ---- bibtex toggles ----
  document.querySelectorAll('.bib-toggle').forEach(function (b) {
    b.setAttribute('aria-expanded', 'false');
    var target = document.getElementById(b.dataset.target);
    if (target && !target.querySelector('.bib-copy')) {
      var copy = document.createElement('button');
      copy.className = 'bib-copy'; copy.type = 'button'; copy.textContent = 'copy';
      copy.addEventListener('click', function () {
        var text = target.textContent.replace(/copy|copied/g, '').trim();
        navigator.clipboard.writeText(text).then(function () { copy.textContent = 'copied'; },
          function () { copy.textContent = 'select & copy'; });
        setTimeout(function () { copy.textContent = 'copy'; }, 1600);
      });
      target.appendChild(copy);
    }
    b.addEventListener('click', function () {
      var pre = document.getElementById(b.dataset.target);
      if (!pre) return;
      var open = pre.hidden;
      pre.hidden = !open;
      b.setAttribute('aria-expanded', String(open));
    });
  });

  // ---- header border once scrolled ----
  var header = document.querySelector('.site-header');
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 8); }
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

  // ---- scroll spy for nav ----
  var links = Array.prototype.slice.call(document.querySelectorAll('.site-nav a'));
  var targets = links.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
  if ('IntersectionObserver' in window && targets.length) {
    var current = null;
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) current = e.target.id; });
      links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + current); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    targets.forEach(function (t) { spy.observe(t); });
  }

  // ---- reveal on scroll ----
  var items = document.querySelectorAll('.pub, .tl-item, .card, .news li, .skills > div, .plain li');
  items.forEach(function (el) { el.classList.add('reveal'); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  // ---- cycling eyebrow line ----
  var eb = document.getElementById('eyebrow');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (eb && eb.dataset.phrases && !reduceMotion) {
    var phrases = eb.dataset.phrases.split('|'), idx = 0;
    setInterval(function () {
      idx = (idx + 1) % phrases.length;
      eb.classList.add('fade');
      setTimeout(function () { eb.textContent = phrases[idx]; eb.classList.remove('fade'); }, 350);
    }, 4200);
  }

  // ---- bio length switch (brief / concise / detailed) ----
  var bioBtns = document.querySelectorAll('.bio-switch [data-bio]');
  var bioPanels = document.querySelectorAll('.bio-panel');
  function showBio(key) {
    bioPanels.forEach(function (p) { p.hidden = p.dataset.bio !== key; });
    bioBtns.forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.bio === key)); });
    try { localStorage.setItem('bio', key); } catch (e) {}
  }
  bioBtns.forEach(function (b) { b.addEventListener('click', function () { showBio(b.dataset.bio); }); });
  try { var savedBio = localStorage.getItem('bio'); if (savedBio) showBio(savedBio); } catch (e) {}
})();
