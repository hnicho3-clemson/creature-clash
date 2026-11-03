'use strict';
/* Creature Clash — account page: sign in, sign up (with parent approval for under-13s), email codes, password reset,
   sign out and delete. The server re-checks everything; these checks are only for quick, friendly feedback. */
(function () {
  const $ = s => document.querySelector(s);
  const views = ['loading', 'signin', 'age', 'signup', 'verify', 'parent', 'forgot', 'reset', 'account', 'deleted'];
  const ROUTES = { '/signin': 'signin', '/signup': 'age', '/forgot-password': 'forgot', '/verify-email': 'verify', '/account': 'account' };
  const state = { username: '', isChild: false, birthYear: null, me: null };
  try { const s = JSON.parse(sessionStorage.getItem('cc_acct') || '{}'); if (typeof s.username === 'string') state.username = s.username.slice(0, 20); } catch { /* storage off */ }
  const remember = () => { try { sessionStorage.setItem('cc_acct', JSON.stringify({ username: state.username })); } catch { /* ignore */ } };

  async function api(path, body) {
    let r;
    try {
      r = await fetch(path, body === undefined ? { credentials: 'same-origin' } : {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CC-Request': '1' }, body: JSON.stringify(body) });
    } catch { throw Object.assign(new Error("We couldn't reach the server. Check your internet and try again."), { code: 'network' }); }
    let data = null; try { data = await r.json(); } catch { /* not JSON */ }
    if (!r.ok) throw Object.assign(new Error((data && data.error && data.error.message) || 'Something went wrong. Please try again.'), { code: data && data.error && data.error.code, data: data && data.error, status: r.status });
    return data;
  }

  function show(name, { push = true } = {}) {
    for (const v of views) { const el = $('#v-' + v); if (el) el.hidden = v !== name; }
    document.querySelectorAll('[data-username]').forEach(el => { el.textContent = state.username || 'your account'; });
    const sec = $('#v-' + name);
    sec.querySelectorAll('[data-error],[data-ok]').forEach(el => { el.textContent = ''; });
    const path = { signin: '/signin', age: '/signup', signup: '/signup', forgot: '/forgot-password', reset: '/forgot-password', verify: '/verify-email', parent: '/signup', account: '/account' }[name];
    if (push && path && location.pathname !== path) history.pushState({ v: name }, '', path);
    const h = sec.querySelector('h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    document.title = (h ? h.textContent + ' · ' : '') + 'Creature Clash';
  }
  window.addEventListener('popstate', () => route());

  const err = (form, msg) => { const el = form.closest('section').querySelector('[data-error]'); el.textContent = msg; if (msg) el.scrollIntoView({ block: 'nearest' }); };
  const ok = (sec, msg) => { const el = $('#v-' + sec + ' [data-ok]'); if (el) el.textContent = msg; };

  // Shows a loading state on the submit button while a request runs, and turns server errors into readable alerts.
  function onSubmit(form, fn) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = form.querySelector('button[type=submit]'); const label = btn.textContent;
      err(form, ''); form.querySelectorAll('[aria-invalid]').forEach(x => x.removeAttribute('aria-invalid'));
      btn.disabled = true; btn.textContent = 'Please wait…';
      try { await fn(new FormData(form)); }
      catch (x) { err(form, x.message); }
      finally { btn.disabled = false; btn.textContent = label; }
    });
  }
  function need(form, cond, field, msg) {
    if (cond) return;
    const el = form.querySelector('[name="' + field + '"]'); if (el) { el.setAttribute('aria-invalid', 'true'); el.focus(); }
    throw new Error(msg);
  }

  // Password show/hide and live rule checklist.
  document.querySelectorAll('[data-toggle]').forEach(b => b.addEventListener('click', () => {
    const i = document.getElementById(b.dataset.toggle); const showing = i.type === 'text';
    i.type = showing ? 'password' : 'text'; b.textContent = showing ? 'Show' : 'Hide'; b.setAttribute('aria-pressed', String(!showing));
  }));
  const EASY = /^(?:12345678|password|qwerty|letmein|11111111|creatureclash)/i;
  function passwordProblems(pw, user) {
    const u = (user || '').toLowerCase();
    return { len: [...pw].length >= 8 && [...pw].length <= 128, user: !u || !pw.toLowerCase().includes(u), easy: !!pw && !EASY.test(pw) && !/^(.)\1+$/.test(pw) };
  }
  function liveRules(input, list, userFn) {
    const upd = () => { const r = passwordProblems(input.value, userFn()); list.querySelectorAll('[data-rule]').forEach(li => li.classList.toggle('ok', !!r[li.dataset.rule])); };
    input.addEventListener('input', upd); upd();
  }
  liveRules($('#su-pass'), $('#su-rules'), () => $('#su-user').value);
  liveRules($('#re-pass'), $('#re-rules'), () => state.username);
  const pwOk = (pw, user) => Object.values(passwordProblems(pw, user)).every(Boolean);
  const USER_RE = /^[A-Za-z0-9_]{3,20}$/;

  // ---- sign in
  onSubmit($('#f-signin'), async fd => {
    const f = $('#f-signin'); const username = String(fd.get('username')).trim();
    need(f, username, 'username', 'Type your username.');
    need(f, fd.get('password'), 'password', 'Type your password.');
    state.username = username; remember();
    try { await api('/api/auth/login', { username, password: fd.get('password') }); }
    catch (x) {
      if (x.code === 'needs_verify') { state.username = x.data.username || username; remember(); show('verify'); ok('verify', 'Enter the code from your email to finish.'); return; }
      if (x.code === 'needs_parent') { state.username = x.data.username || username; remember(); show('parent'); return; }
      throw x;
    }
    location.href = '/';
  });

  // ---- sign up
  const yearSel = $('#su-year'); const now = new Date().getFullYear();
  for (let y = now; y >= now - 100; y--) { const o = document.createElement('option'); o.value = y; o.textContent = y; yearSel.appendChild(o); }
  onSubmit($('#f-age'), async fd => {
    const y = +fd.get('birthYear');
    need($('#f-age'), y, 'birthYear', 'Pick the year you were born.');
    state.birthYear = y; state.isChild = now - y <= 13;
    $('#su-lead').textContent = state.isChild ? 'Because you are under 13, a parent or guardian will get an email to say yes before you can sign in.' : 'You can sign in once you confirm your email.';
    $('#su-email-label').textContent = state.isChild ? "Your parent's or guardian's email" : 'Your email';
    $('#su-email-hint').textContent = state.isChild ? "We'll ask them to approve your account. We only use it for that and for password resets." : "We'll send a code to check it. We only use it for your account, never for ads.";
    $('#su-agree-text').innerHTML = state.isChild
      ? 'My grown-up and I read the <a href="/terms" target="_blank" rel="noopener">game rules</a> and <a href="/privacy" target="_blank" rel="noopener">privacy policy</a>.'
      : 'I agree to the <a href="/terms" target="_blank" rel="noopener">game rules</a> and <a href="/privacy" target="_blank" rel="noopener">privacy policy</a>.';
    show('signup', { push: false });
  });
  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => show(b.dataset.go)));
  onSubmit($('#f-signup'), async fd => {
    const f = $('#f-signup');
    const username = String(fd.get('username')).trim(), password = String(fd.get('password')), email = String(fd.get('email')).trim();
    need(f, USER_RE.test(username), 'username', 'Usernames are 3 to 20 letters, numbers or underscores.');
    need(f, pwOk(password, username), 'password', 'Your password needs to meet all three rules under it.');
    need(f, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'email', 'Please type a real email address.');
    need(f, fd.get('agree') === 'on', 'agree', state.isChild ? 'Ask your grown-up to read the rules, then tick the box.' : 'Please agree to the rules and privacy policy.');
    const r = await api('/api/auth/signup', { username, password, email, birthYear: state.birthYear, agree: true });
    state.username = r.username; remember();
    show(r.next === 'parent' ? 'parent' : 'verify');
  });

  // ---- verify email
  onSubmit($('#f-verify'), async fd => {
    const code = String(fd.get('code')).replace(/\D/g, '');
    need($('#f-verify'), code.length === 8, 'code', 'Codes are 8 digits.');
    need($('#f-verify'), state.username, 'code', 'Sign in again so we know which account this is.');
    await api('/api/auth/verify', { username: state.username, code });
    location.href = '/';
  });
  document.querySelectorAll('[data-resend]').forEach(b => b.addEventListener('click', async () => {
    const sec = b.closest('section').id.slice(2);
    b.disabled = true;
    try { const r = await api('/api/auth/resend', { username: state.username }); ok(sec, sec === 'parent' ? 'Sent again. Ask your grown-up to check their inbox and spam folder.' : 'We sent a new code. Older codes stop working.'); }
    catch (x) { const el = b.closest('section').querySelector('[data-error]'); if (el) el.textContent = x.message; }
    finally { setTimeout(() => { b.disabled = false; }, 20000); }
  }));

  // ---- forgot / reset
  onSubmit($('#f-forgot'), async fd => {
    const username = String(fd.get('username')).trim();
    need($('#f-forgot'), USER_RE.test(username), 'username', 'Type your username (3 to 20 letters, numbers or _).');
    const r = await api('/api/auth/forgot', { username });
    state.username = username; remember();
    show('reset', { push: false }); ok('reset', r.message);
  });
  onSubmit($('#f-reset'), async fd => {
    const f = $('#f-reset'); const code = String(fd.get('code')).replace(/\D/g, ''), password = String(fd.get('password'));
    need(f, code.length === 8, 'code', 'Codes are 8 digits.');
    need(f, pwOk(password, state.username), 'password', 'Your new password needs to meet all three rules under it.');
    await api('/api/auth/reset', { username: state.username, code, password });
    await loadMe(); show('account'); ok('account', 'Password changed. Other devices were signed out.');
  });

  // ---- signed in
  $('#signout').addEventListener('click', async e => {
    const b = e.currentTarget; b.disabled = true;
    try { await api('/api/auth/logout', {}); } catch { /* signed out locally anyway */ }
    state.me = null; show('signin');
  });
  onSubmit($('#f-delete'), async fd => {
    const f = $('#f-delete');
    need(f, fd.get('password'), 'password', 'Type your password.');
    need(f, String(fd.get('confirm')) === 'DELETE', 'confirm', 'Type DELETE in capital letters to confirm.');
    await api('/api/account/delete', { password: fd.get('password'), confirm: 'DELETE' });
    state.me = null; show('deleted', { push: false });
  });

  async function loadMe() {
    try { const r = await api('/api/me'); state.me = r.user; } catch { state.me = null; }
    if (state.me) {
      state.username = state.me.username;
      $('[data-initial]').textContent = state.me.username[0].toUpperCase();
      $('[data-kind]').textContent = (state.me.displayName ? state.me.displayName + ' · ' : '') + (state.me.isChild ? 'Player account · a grown-up approved it' : 'Player account');
      $('#admin-link').hidden = !state.me.isAdmin;
    }
  }
  function route() {
    const want = ROUTES[location.pathname.replace(/\/+$/, '')] || 'signin';
    if (state.me) return show('account', { push: false });
    if (want === 'account') return show('signin', { push: false });
    if (want === 'verify' && !state.username) return show('signin', { push: false });
    show(want, { push: false });
  }
  loadMe().then(route);
})();
