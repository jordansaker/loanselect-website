(function () {
  /* ---- mobile menu (header is persistent across SPA navigation) ---- */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');
  var scrim = document.getElementById('scrim');
  function openMenu() {
    if (!menu || !scrim || !burger) return;
    menu.classList.add('open');
    scrim.classList.add('show');
    burger.setAttribute('aria-expanded', 'true');
  }
  function closeMenu() {
    if (!menu || !scrim || !burger) return;
    menu.classList.remove('open');
    scrim.classList.remove('show');
    burger.setAttribute('aria-expanded', 'false');
  }
  if (burger && menu && scrim) {
    burger.addEventListener('click', function () {
      menu.classList.contains('open') ? closeMenu() : openMenu();
    });
    scrim.addEventListener('click', closeMenu);
  }

  /* ---- per-page initialisers (idempotent; safe to re-run after each navigation) ---- */
  function initCalculator() {
    var amt = document.getElementById('amt');
    var rate = document.getElementById('rate');
    var term = document.getElementById('term');
    if (!amt || !rate || !term) return;
    var amtOut = document.getElementById('amtOut');
    var rateOut = document.getElementById('rateOut');
    var termOut = document.getElementById('termOut');
    var result = document.getElementById('result');
    var totint = document.getElementById('totint');
    var aud = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
    function calc() {
      var P = +amt.value, annual = +rate.value, years = +term.value;
      var r = annual / 100 / 12, n = years * 12;
      var m = r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      amtOut.textContent = aud.format(P);
      rateOut.textContent = annual.toFixed(2) + '%';
      termOut.textContent = years + ' years';
      result.textContent = aud.format(Math.round(m));
      totint.textContent = 'Total interest ≈ ' + aud.format(Math.round(m * n - P));
    }
    [amt, rate, term].forEach(function (el) { el.addEventListener('input', calc); });
    calc();
  }

  function initContactForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type=submit]');
      var status = document.getElementById('form-status');
      var originalLabel = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      if (status) { status.style.color = 'var(--ink-soft)'; status.textContent = ''; }
      try {
        var data = Object.fromEntries(new FormData(form).entries());
        var res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        var payload = await res.json().catch(function () { return {}; });
        if (!res.ok || !payload.ok) throw new Error(payload.error || 'Sorry, something went wrong.');
        form.reset();
        if (btn) btn.textContent = "Thanks — we'll be in touch";
        if (status) { status.style.color = 'var(--gold-deep)'; status.textContent = 'Your message has been sent.'; }
      } catch (err) {
        if (btn) { btn.disabled = false; btn.textContent = originalLabel || 'Request a free chat →'; }
        if (status) { status.style.color = '#a3392a'; status.textContent = err.message || 'Sorry, something went wrong.'; }
      }
    });
  }

  function updateActiveNav() {
    var here = location.pathname || '/';
    if (here === '/') here = '/index.html';
    var menu = document.getElementById('menu');
    if (!menu) return;
    var links = menu.querySelectorAll('a');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var href = a.getAttribute('href') || '';
      var url;
      try { url = new URL(href, location.href).pathname; } catch (e) { continue; }
      var active = url === here;
      // Calculators tab stays active on any /calculators/* subpage
      if (!active && url === '/calculators.html' && here.indexOf('/calculators/') === 0) active = true;
      a.classList.toggle('active', active);
    }
  }

  function initTestimonials() {
    var root = document.querySelector('.testimonials');
    if (!root) return;
    var slides = Array.from(root.querySelectorAll('.quote'));
    var total = slides.length;
    if (!total) return;
    var prevBtn = root.querySelector('.t-prev');
    var nextBtn = root.querySelector('.t-next');
    var nowEl = root.querySelector('.t-now');
    var totalEl = root.querySelector('.t-total');
    var fillEl = root.querySelector('.testimonials-bar-fill');
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var index = 0;
    if (totalEl) totalEl.textContent = String(total).padStart(2, '0');

    function show(i) {
      index = ((i % total) + total) % total;
      slides.forEach(function (s, n) { s.classList.toggle('is-active', n === index); });
      if (nowEl) nowEl.textContent = String(index + 1).padStart(2, '0');
      if (reduced) return;
      // restart the progress animation by removing the playing class, forcing a reflow, then re-adding it
      root.classList.remove('is-playing');
      void root.offsetWidth;
      root.classList.add('is-playing');
    }

    if (fillEl) {
      fillEl.addEventListener('animationend', function (e) {
        if (e.animationName === 't-progress') show(index + 1);
      });
    }
    if (prevBtn) prevBtn.addEventListener('click', function () { show(index - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { show(index + 1); });

    var pause = function () { root.classList.add('is-paused'); };
    var resume = function () { root.classList.remove('is-paused'); };
    root.addEventListener('mouseenter', pause);
    root.addEventListener('mouseleave', resume);
    root.addEventListener('focusin', pause);
    root.addEventListener('focusout', resume);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) pause(); else resume();
    });

    show(0);
  }

  function initPage() {
    initCalculator();
    initContactForm();
    initTestimonials();
    updateActiveNav();
  }

  /* ---- SPA router ---- */
  function shouldIntercept(a, e) {
    if (!a) return false;
    if (e.defaultPrevented) return false;
    if (e.button !== 0) return false;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    if (a.target && a.target !== '' && a.target !== '_self') return false;
    if (a.hasAttribute('download')) return false;
    var href = a.getAttribute('href');
    if (!href) return false;
    if (href[0] === '#') return false;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return false;
    var url;
    try { url = new URL(href, location.href); } catch (err) { return false; }
    if (url.origin !== location.origin) return false;
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return false;
    if (/\.pdf($|\?)/i.test(url.pathname)) return false;
    return true;
  }

  var inFlight = null;
  async function navigate(targetUrl, push) {
    closeMenu();
    var path = targetUrl.pathname + targetUrl.search;
    if (inFlight && inFlight.path === path) return;
    var token = { path: path };
    inFlight = token;
    try {
      var res = await fetch(path, { headers: { Accept: 'text/html' }, credentials: 'same-origin' });
      if (inFlight !== token) return;
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var html = await res.text();
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var newMain = doc.querySelector('main');
      var oldMain = document.querySelector('main');
      if (!newMain || !oldMain) { location.href = path; return; }

      var apply = function () {
        document.title = doc.title;
        var metaDesc = document.querySelector('meta[name="description"]');
        var newDesc = doc.querySelector('meta[name="description"]');
        if (metaDesc && newDesc) metaDesc.setAttribute('content', newDesc.getAttribute('content') || '');
        oldMain.replaceWith(newMain);
        if (push !== false) history.pushState({}, '', targetUrl.pathname + targetUrl.search + targetUrl.hash);
        if (targetUrl.hash) {
          var el = document.querySelector(targetUrl.hash);
          if (el) el.scrollIntoView({ behavior: 'instant' in window ? 'instant' : 'auto' });
          else window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
        } else {
          window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
        }
        initPage();
      };

      if (document.startViewTransition) {
        document.startViewTransition(apply);
      } else {
        apply();
      }
    } catch (err) {
      console.error('SPA navigation failed; falling back to full load:', err);
      location.href = path;
    } finally {
      if (inFlight === token) inFlight = null;
    }
  }

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!shouldIntercept(a, e)) return;
    var url = new URL(a.getAttribute('href'), location.href);
    e.preventDefault();
    navigate(url, true);
  });

  window.addEventListener('popstate', function () {
    navigate(new URL(location.href), false);
  });

  initPage();
})();
