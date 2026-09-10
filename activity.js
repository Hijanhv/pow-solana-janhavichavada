/* Live GitHub activity for the Proof of Work on Solana page.
 *
 * Two layers:
 *   1. data/activity.json, rebuilt by .github/workflows/activity.yml every few
 *      hours. Always present, so the section renders even offline.
 *   2. A live read of the public events API on page load, which surfaces a push
 *      made minutes ago. Fails silently, since it is unauthenticated and rate
 *      limited per viewer IP.
 */

(function () {
  'use strict';

  var USER = 'Hijanhv';
  var root = document.getElementById('live');
  if (!root) return;

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function pretty(iso) {
    var d = new Date(iso);
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }

  function ago(iso) {
    var seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    var steps = [[31536000, 'y'], [2592000, 'mo'], [604800, 'w'], [86400, 'd'], [3600, 'h'], [60, 'min']];
    for (var i = 0; i < steps.length; i++) {
      if (seconds >= steps[i][0]) return Math.floor(seconds / steps[i][0]) + steps[i][1] + ' ago';
    }
    return 'just now';
  }

  // Charts animate on entry rather than on load, so they are not already
  // finished by the time the reader scrolls down to them.
  function whenVisible(node) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      node.classList.add('is-in');
      return;
    }
    var io = new IntersectionObserver(function (rows) {
      rows.forEach(function (row) {
        if (!row.isIntersecting) return;
        row.target.classList.add('is-in');
        io.unobserve(row.target);
      });
    }, { threshold: 0.15 });
    io.observe(node);
  }

  function slot(name, value) {
    var node = root.querySelector('[data-slot="' + name + '"]');
    if (node) node.textContent = value;
  }

  /* ---------- contribution calendar ---------- */

  function drawHeatmap(calendar) {
    var host = document.getElementById('heat');
    var days = calendar.days;
    if (!host || !days.length) return;

    host.textContent = '';

    // Pad the first column so row 0 is always Sunday.
    var lead = new Date(days[0].date + 'T00:00:00Z').getUTCDay();
    var cells = new Array(lead).fill(null).concat(days);

    var months = el('div', 'heat__months');
    var grid = el('div', 'heat__grid');
    var seenMonth = -1;
    var column = 0;

    cells.forEach(function (day, index) {
      if (index % 7 === 0) column++;

      if (!day) {
        grid.appendChild(el('span', 'cell cell--pad'));
        return;
      }

      var date = new Date(day.date + 'T00:00:00Z');
      // One label per month, placed on the column where that month starts.
      if (index % 7 === 0 && date.getUTCMonth() !== seenMonth) {
        seenMonth = date.getUTCMonth();
        var label = el('span', 'heat__month', MONTHS[seenMonth]);
        label.style.gridColumn = String(column);
        months.appendChild(label);
      }

      var label = (day.count === 0 ? 'No contributions' : day.count + (day.count === 1 ? ' contribution' : ' contributions')) + ' on ' + pretty(day.date);

      // GitHub renders the profile graph for whatever period the query names,
      // so a click lands on the month that day belongs to, that day selected.
      var month = day.date.slice(0, 8);
      var cell = el('a', 'cell');
      cell.href = 'https://github.com/' + USER + '?tab=overview&from=' + month + '01&to=' + day.date;
      cell.target = '_blank';
      cell.rel = 'noopener';
      cell.setAttribute('data-level', String(day.level));
      cell.setAttribute('aria-label', label);
      cell.title = label + ' — open on GitHub';
      cell.style.animationDelay = (Math.min(column, 53) * 9) + 'ms';
      grid.appendChild(cell);
    });

    host.appendChild(months);
    host.appendChild(grid);
    whenVisible(host);

    var range = document.getElementById('cal-range');
    if (range) range.textContent = pretty(days[0].date) + ' → ' + pretty(days[days.length - 1].date);
  }

  /* ---------- hour of day ---------- */

  function drawClock(clock) {
    var host = document.getElementById('clock');
    if (!host || !clock || !clock.hours) return;

    host.textContent = '';
    var peak = Math.max.apply(null, clock.hours) || 1;
    var busiest = clock.hours.indexOf(peak);

    clock.hours.forEach(function (count, hour) {
      var bar = el('div', 'clock__bar');
      if (hour === busiest) bar.classList.add('is-peak');
      bar.style.setProperty('--h', Math.round((count / peak) * 100) + '%');
      bar.title = count + (count === 1 ? ' commit' : ' commits') + ' between ' +
        String(hour).padStart(2, '0') + ':00 and ' + String((hour + 1) % 24).padStart(2, '0') + ':00';

      if (hour % 6 === 0) {
        var tick = el('span', 'clock__tick', String(hour).padStart(2, '0'));
        bar.appendChild(tick);
      }
      bar.style.animationDelay = (hour * 26) + 'ms';
      host.appendChild(bar);
    });

    whenVisible(host);

    var note = document.getElementById('clock-note');
    if (note) {
      note.textContent = clock.sampled + ' COMMITS · ' + (clock.timezone || 'UTC') +
        ' · PEAK ' + String(busiest).padStart(2, '0') + ':00';
    }
  }

  /* ---------- the push feed ---------- */

  function feedItem(entry) {
    var li = el('li', 'feed__item' + (entry.live ? ' is-live' : ''));

    var head = el('p', 'feed__head');
    var repo = el('a', 'feed__repo', entry.repo);
    repo.href = entry.repoUrl || ('https://github.com/' + USER + '/' + entry.repo);
    repo.target = '_blank';
    repo.rel = 'noopener';
    head.appendChild(repo);
    head.appendChild(el('span', 'feed__when mono', ago(entry.date)));
    li.appendChild(head);

    if (entry.message) li.appendChild(el('p', 'feed__msg', entry.message));

    if (entry.sha) {
      var sha = el('a', 'feed__sha mono', entry.sha);
      if (entry.url) { sha.href = entry.url; sha.target = '_blank'; sha.rel = 'noopener'; }
      li.appendChild(sha);
    }
    return li;
  }

  function drawFeed(entries) {
    var host = document.getElementById('feed');
    if (!host) return;
    host.textContent = '';
    entries.slice(0, 12).forEach(function (entry) { host.appendChild(feedItem(entry)); });

    var note = document.getElementById('feed-note');
    if (note && entries.length) note.textContent = 'LAST PUSH ' + ago(entries[0].date).toUpperCase();
  }

  /* ---------- live overlay ---------- */

  function overlay(data) {
    var tracked = {};
    data.repos.forEach(function (repo) { tracked[repo.name.toLowerCase()] = repo; });

    var newest = data.commits.length ? new Date(data.commits[0].date).getTime() : 0;

    return fetch('https://api.github.com/users/' + USER + '/events/public?per_page=100', {
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then(function (res) {
        if (!res.ok) throw new Error('events ' + res.status);
        return res.json();
      })
      .then(function (events) {
        var fresh = events
          .filter(function (event) {
            if (event.type !== 'PushEvent') return false;
            var name = String(event.repo.name).split('/').pop().toLowerCase();
            if (!tracked[name]) return false;
            return new Date(event.created_at).getTime() > newest;
          })
          .map(function (event) {
            var name = String(event.repo.name).split('/').pop();
            return {
              repo: name,
              repoUrl: 'https://github.com/' + event.repo.name,
              sha: event.payload.head ? event.payload.head.slice(0, 7) : '',
              url: event.payload.head ? 'https://github.com/' + event.repo.name + '/commit/' + event.payload.head : '',
              message: 'Pushed to ' + String(event.payload.ref || '').replace('refs/heads/', ''),
              date: event.created_at,
              live: true,
            };
          });

        if (fresh.length) drawFeed(fresh.concat(data.commits));
      })
      .catch(function () { /* rate limited or offline; the baked feed already rendered */ });
  }

  /* ---------- go ---------- */

  fetch('data/activity.json', { cache: 'no-cache' })
    .then(function (res) {
      if (!res.ok) throw new Error('activity ' + res.status);
      return res.json();
    })
    .then(function (data) {
      slot('total', data.calendar.total.toLocaleString());
      slot('active', data.calendar.activeDays);
      slot('longest', data.calendar.longest + 'd');
      slot('busiest', data.calendar.busiest ? data.calendar.busiest.count : '—');
      slot('repos', data.repos.length);

      // Hand these to the shared count-up observer while each value is still a
      // bare number, then hang the date underneath so the animation cannot eat it.
      if (window.__countUpObserver) {
        root.querySelectorAll('.stats--live .stat dd').forEach(function (node) {
          window.__countUpObserver.observe(node);
        });
      }

      var busiestStat = root.querySelector('[data-slot="busiest"]');
      if (busiestStat && data.calendar.busiest) {
        busiestStat.title = data.calendar.busiest.count + ' contributions on ' + pretty(data.calendar.busiest.date);
        busiestStat.parentNode.appendChild(el('p', 'stat__sub mono', pretty(data.calendar.busiest.date)));
      }

      drawHeatmap(data.calendar);
      drawClock(data.clock);
      drawFeed(data.commits);

      var synced = document.getElementById('synced');
      if (synced) synced.textContent = 'synced ' + ago(data.generatedAt);

      root.setAttribute('data-state', 'ready');
      return overlay(data);
    })
    .catch(function () {
      root.setAttribute('data-state', 'error');
      var error = document.getElementById('live-error');
      if (error) error.hidden = false;
      var synced = document.getElementById('synced');
      if (synced) synced.textContent = 'offline';
    });
})();
