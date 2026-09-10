/* Proof of Work on Solana — interactions */

(function () {
  'use strict';

  var entries = Array.prototype.slice.call(document.querySelectorAll('.entry'));
  var sections = Array.prototype.slice.call(document.querySelectorAll('.sect'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- scroll reveal ---------- */
  if (!reduce && 'IntersectionObserver' in window) {
    var targets = entries.concat(
      Array.prototype.slice.call(document.querySelectorAll('.sect__head, .ledger li, .stat'))
    );
    targets.forEach(function (el) { el.classList.add('reveal'); });

    var io = new IntersectionObserver(function (rows) {
      rows.forEach(function (row) {
        if (!row.isIntersecting) return;
        row.target.classList.add('is-in');
        io.unobserve(row.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------- top bar + scroll progress ---------- */
  var topbar = document.getElementById('topbar');
  var progress = document.getElementById('progress');
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;
    topbar.classList.toggle('is-up', y > 420);

    if (progress) {
      var span = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (span > 0 ? Math.min(1, y / span) : 0) + ')';
    }
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(onScroll);
  }, { passive: true });
  onScroll();

  /* ---------- numbers count up when they scroll into view ---------- */
  function countUp(node) {
    var raw = node.textContent.trim();
    var match = /^([\d,]+)(.*)$/.exec(raw);
    if (!match) return;

    var target = Number(match[1].replace(/,/g, ''));
    var suffix = match[2] || '';
    if (!target || target < 2) return;

    var started = null;
    var span = 950;

    function step(now) {
      if (started === null) started = now;
      var t = Math.min(1, (now - started) / span);
      var eased = 1 - Math.pow(1 - t, 3);
      node.textContent = Math.round(target * eased).toLocaleString() + suffix;
      if (t < 1) requestAnimationFrame(step);
    }

    node.textContent = '0' + suffix;
    requestAnimationFrame(step);
  }

  if (!reduce && 'IntersectionObserver' in window) {
    var numbers = new IntersectionObserver(function (rows) {
      rows.forEach(function (row) {
        if (!row.isIntersecting) return;
        countUp(row.target);
        numbers.unobserve(row.target);
      });
    }, { threshold: 0.6 });

    // hero stats now; the live ones are rendered later by activity.js
    document.querySelectorAll('.hero .stat dd').forEach(function (node) { numbers.observe(node); });
    window.__countUpObserver = numbers;
  }

  /* ---------- filters ---------- */
  var buttons = Array.prototype.slice.call(document.querySelectorAll('.chip--filter'));
  var count = document.getElementById('count');

  function apply(filter) {
    var shown = 0;

    entries.forEach(function (entry) {
      var tags = (entry.getAttribute('data-tags') || '').split(/\s+/);
      var match = filter === 'all' || tags.indexOf(filter) !== -1;
      entry.classList.toggle('is-hidden', !match);
      if (match) shown++;
    });

    // hide a section header when nothing in it survives the filter
    sections.forEach(function (section) {
      var visible = section.querySelectorAll('.entry:not(.is-hidden)').length;
      var hasEntries = section.querySelectorAll('.entry').length > 0;
      section.classList.toggle('is-hidden', hasEntries && visible === 0);
    });

    count.textContent = shown + ' shown';
  }

  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      buttons.forEach(function (b) {
        b.classList.toggle('is-on', b === button);
        b.setAttribute('aria-pressed', b === button ? 'true' : 'false');
      });
      apply(button.getAttribute('data-filter'));
    });
  });

  apply('all');

  /* ---------- click to copy an address ---------- */
  var toast = document.getElementById('toast');
  var toastTimer;

  function flash(message) {
    toast.textContent = message;
    toast.classList.add('is-up');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-up'); }, 1600);
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest ? event.target.closest('.copy') : null;
    if (!button) return;
    var value = button.getAttribute('data-copy');
    if (!value) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(
        function () { flash('Address copied'); },
        function () { flash('Copy failed'); }
      );
    } else {
      var field = document.createElement('textarea');
      field.value = value;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      try { document.execCommand('copy'); flash('Address copied'); }
      catch (err) { flash('Copy failed'); }
      document.body.removeChild(field);
    }
  });
})();
