'use strict';
/* Creature Clash — Admin Analytics page (/admin). Reads /api/admin/stats, which only answers for admins
   (usernames in the ADMIN_USERNAMES environment variable). Shows anonymous daily totals only. */
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n, d = 0) => Number(n).toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: 0 });
  const METRICS = {
    games: { title: 'Games played per day', label: 'Games', d: 0 },
    hours: { title: 'Hours played per day', label: 'Hours', d: 1 },
    pageViews: { title: 'Page views per day', label: 'Page views', d: 0 },
    players: { title: 'Active players per day', label: 'Active players', d: 0 },
  };
  let days = 30, metric = 'games', data = null;

  function show(id) { for (const s of ['a-loading', 'a-denied', 'a-dash']) $('#' + s).hidden = s !== id; }

  async function load() {
    $('#a-error').textContent = '';
    $('#main').setAttribute('aria-busy', 'true');
    let r, d = null;
    try { r = await fetch('/api/admin/stats?days=' + days, { credentials: 'same-origin' }); d = await r.json().catch(() => null); }
    catch { if (data) { $('#a-error').textContent = "Couldn't reach the server. Check your connection and try again."; } else { denied('Offline', "Couldn't reach the server. Check your connection and reload."); } $('#main').removeAttribute('aria-busy'); return; }
    $('#main').removeAttribute('aria-busy');
    if (r.status === 401) return denied('Admins only', 'Sign in with an admin account to see the analytics.', true);
    if (r.status === 403) return denied('Admins only', 'This account is not an admin. Admins are the usernames listed in the ADMIN_USERNAMES setting.');
    if (!r.ok) { const m = (d && d.error && d.error.message) || 'Something went wrong.'; if (data) { $('#a-error').textContent = m; return; } return denied('Something went wrong', m); }
    data = d; show('a-dash'); render();
  }
  function denied(title, text, signin) {
    $('#a-denied-title').textContent = title; $('#a-denied-text').textContent = text;
    $('#a-denied-btn').hidden = !signin; show('a-denied');
  }

  function tile(label, value, sub) {
    return '<div class="tile"><span class="tl">' + esc(label) + '</span><b>' + esc(value) + '</b>' + (sub ? '<span class="ts">' + esc(sub) + '</span>' : '') + '</div>';
  }
  function render() {
    const t = data.totals, a = data.allTime, ac = data.accounts, range = 'last ' + data.days + ' days';
    $('#a-tiles').innerHTML =
      tile('Games played', fmt(t.games), range + ' · ' + fmt(a.games) + ' all time') +
      tile('Hours played', fmt(t.hours, 1), range + ' · ' + fmt(a.hours, 1) + ' all time') +
      tile('Page views', fmt(t.pageViews), range + ' · ' + fmt(a.pageViews) + ' all time') +
      tile('Active players', fmt(t.playersToday), 'today · ' + fmt(t.avgDailyPlayers, 1) + ' a day on average');
    $('#a-accounts').innerHTML =
      tile('Accounts', fmt(ac.total), fmt(ac.new) + ' new in the ' + range) +
      tile('Signed in today', fmt(ac.signedInToday), 'players with an account') +
      tile('Signed in this week', fmt(ac.signedInWeek), fmt(ac.signedInRange) + ' in the ' + range);
    renderErrors();
    renderChart();
  }
  function renderErrors() {
    const e = data.errors;
    if (!e.length) { $('#a-errors').innerHTML = '<p class="empty">No errors reported. Nice!</p>'; return; }
    $('#a-errors').innerHTML = '<div class="tablewrap"><table class="errs"><thead><tr><th scope="col">Last seen (UTC)</th><th scope="col">Where</th><th scope="col">Message</th><th scope="col" class="num">Times</th></tr></thead><tbody>' +
      e.map(x => '<tr><td>' + esc(x.lastSeen) + '</td><td><span class="src">' + esc(x.source) + '</span> ' + esc(x.location || '') + (x.requestId ? '<br><small>request ' + esc(x.requestId) + '</small>' : '') + '</td><td>' + esc(x.message) + '</td><td class="num">' + fmt(x.count) + '</td></tr>').join('') +
      '</tbody></table></div>';
  }

  // Single-series bar chart: one value per day, the newest day on the right.
  function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p; return 10 * p; }
  function shortDay(s) { const d = new Date(s + 'T00:00:00Z'); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }); }
  function renderChart() {
    const M = METRICS[metric], S = data.series, box = $('#c-chart');
    $('#c-title').textContent = M.title;
    const W = Math.max(300, box.clientWidth || 700), H = 220, L = 44, R = 8, T = 10, B = 28;
    const max = niceMax(Math.max(...S.map(r => r[metric])));
    const n = S.length, slot = (W - L - R) / n, gap = n > 45 ? 1 : 2, bw = Math.max(1, slot - gap);
    const y = v => T + (H - T - B) * (1 - v / max);
    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" role="img" aria-label="' + esc(M.title + ', last ' + n + ' days') + '">';
    for (let i = 0; i <= 4; i++) {
      const v = max * i / 4, yy = y(v);
      svg += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '"/><text class="ax" x="' + (L - 6) + '" y="' + (yy + 4) + '" text-anchor="end">' + esc(fmt(v, M.d)) + '</text>';
    }
    const every = Math.ceil(n / 7);
    S.forEach((r, i) => {
      const x = L + i * slot + gap / 2, v = r[metric], top = y(v), h = (H - B) - top;
      if (h > 0) {
        const rr = Math.min(4, bw / 2, h);
        svg += '<path class="bar" d="M' + x + ',' + (H - B) + 'V' + (top + rr) + 'Q' + x + ',' + top + ' ' + (x + rr) + ',' + top + 'H' + (x + bw - rr) + 'Q' + (x + bw) + ',' + top + ' ' + (x + bw) + ',' + (top + rr) + 'V' + (H - B) + 'Z"/>';
      }
      svg += '<rect class="hit" data-i="' + i + '" x="' + (L + i * slot) + '" y="' + T + '" width="' + slot + '" height="' + (H - T - B) + '"/>';
      if ((n - 1 - i) % every === 0) svg += '<text class="ax" x="' + (x + bw / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(shortDay(r.day)) + '</text>';
    });
    svg += '<line class="base" x1="' + L + '" x2="' + (W - R) + '" y1="' + (H - B) + '" y2="' + (H - B) + '"/></svg>';
    box.innerHTML = svg;
    const tip = $('#c-tip');
    box.querySelectorAll('.hit').forEach(h => {
      const on = () => {
        const r = S[+h.dataset.i]; box.querySelectorAll('.hit.on').forEach(o => o.classList.remove('on')); h.classList.add('on');
        tip.innerHTML = '<b>' + esc(fmt(r[metric], M.d)) + '</b> ' + esc(M.label.toLowerCase()) + '<br><span>' + esc(shortDay(r.day)) + '</span>';
        tip.hidden = false;
        const br = box.getBoundingClientRect(), hr = h.getBoundingClientRect(), card = box.parentElement.getBoundingClientRect();
        const left = Math.min(Math.max(hr.left + hr.width / 2 - card.left, 50), card.width - 50);
        tip.style.left = left + 'px'; tip.style.top = (br.top - card.top + y(r[metric]) - 12) + 'px';
      };
      h.addEventListener('mouseenter', on); h.addEventListener('click', on);
    });
    box.onmouseleave = () => { tip.hidden = true; box.querySelectorAll('.hit.on').forEach(o => o.classList.remove('on')); };
    $('#c-table').innerHTML = '<thead><tr><th scope="col">Day (UTC)</th>' + Object.values(METRICS).map(m => '<th scope="col" class="num">' + esc(m.label) + '</th>').join('') + '</tr></thead><tbody>' +
      S.slice().reverse().map(r => '<tr><td>' + esc(r.day) + '</td>' + Object.keys(METRICS).map(k => '<td class="num">' + esc(fmt(r[k], METRICS[k].d)) + '</td>').join('') + '</tr>').join('') + '</tbody>';
  }

  document.querySelectorAll('[data-days]').forEach(b => b.addEventListener('click', () => {
    days = +b.dataset.days; document.querySelectorAll('[data-days]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); load();
  }));
  document.querySelectorAll('[data-metric]').forEach(b => b.addEventListener('click', () => {
    metric = b.dataset.metric; document.querySelectorAll('[data-metric]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); if (data) renderChart();
  }));
  let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (data) renderChart(); }, 150); });
  load();
})();
