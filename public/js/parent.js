'use strict';
/* Creature Clash — parent approval page. The emailed link carries a one-time token; it is removed from the
   address bar right away so it doesn't linger in history, and the page sends no referrer. */
(function () {
  const $ = s => document.querySelector(s);
  const token = new URLSearchParams(location.search).get('t') || '';
  if (token) history.replaceState(null, '', '/parent');
  const show = id => ['p-loading', 'p-ask', 'p-done', 'p-gone'].forEach(x => { $('#' + x).hidden = x !== id; });

  async function post(path) {
    const r = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CC-Request': '1' }, body: JSON.stringify({ token }) });
    let d = null; try { d = await r.json(); } catch { /* ignore */ }
    if (!r.ok) throw Object.assign(new Error((d && d.error && d.error.message) || 'Something went wrong. Please try again.'), { status: r.status });
    return d;
  }
  const gone = msg => { $('#p-gone-text').textContent = msg; show('p-gone'); };

  async function act(path, title, text) {
    const yes = $('#p-yes'), no = $('#p-no'); yes.disabled = no.disabled = true; $('#p-err').textContent = '';
    try { await post(path); $('#h-done').textContent = title; $('#p-done-text').textContent = text; show('p-done'); $('#h-done').focus(); }
    catch (e) { if (e.status === 410 || e.status === 400) gone(e.message); else { $('#p-err').textContent = e.message; yes.disabled = no.disabled = false; } }
  }
  $('#p-yes').addEventListener('click', () => act('/api/account/parent-approve', 'Account approved', 'Thanks! Your child can sign in now. We sent you a confirmation email.'));
  $('#p-no').addEventListener('click', () => act('/api/account/parent-decline', 'Request declined', 'We deleted the request, including your email address. Your child can still play as a guest without an account.'));

  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) { gone('Open the link straight from the email. If it still fails, your child can sign up again to send a new one.'); return; }
  post('/api/account/parent-info')
    .then(d => { $('#p-user').textContent = d.username; show('p-ask'); })
    .catch(e => gone(e.message));
})();
