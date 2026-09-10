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

  /* ---------- top bar reveal ---------- */
  var topbar = document.getElementById('topbar');
  var lastY = 0;
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    if (y > 420) topbar.classList.add('is-up');
    else topbar.classList.remove('is-up');
    lastY = y;
  }, { passive: true });

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
