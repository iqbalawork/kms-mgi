'use strict';

function openForgot() {
  var panel = $('forgot-panel');
  var open = panel.classList.contains('hidden');
  panel.classList.toggle('hidden', !open);
  $('forgot-open').setAttribute('aria-expanded', open ? 'true' : 'false');
  if (!open) return;
  if (!$('forgot-id').value) $('forgot-id').value = $('login-id').value.trim();
  forgotMessage('', '');
  $('forgot-use').classList.add('hidden');
  $('forgot-id').focus();
}

function forgotMessage(text, tone) {
  var m = $('forgot-msg');
  m.textContent = text;
  m.className = 'text-body-sm rounded-lg px-3 py-2 ' +
    (tone === 'error' ? 'text-status-danger-text bg-status-danger-subtle' : 'text-status-success-text bg-status-success-subtle');
  m.classList.toggle('hidden', !text);
}

function onForgotKey(ev) {
  if (ev.key !== 'Enter') return;
  ev.preventDefault();
  sendForgot();
}

function sendForgot() {
  var id = $('forgot-id').value.trim();
  if (!id) {
    forgotMessage('Enter your NIK or email.', 'error');
    return;
  }
  var btn = $('forgot-send');
  if (btn.disabled) return;
  var restore = busy(btn, 'Sending');
  api('requestPasswordReset', id)
    .then(function (res) {
      restore();
      forgotMessage(res.message, 'ok');
      $('forgot-use').classList.remove('hidden');
      btn.disabled = true;
      setTimeout(function () { btn.disabled = false; }, FORGOT_COOLDOWN_MS);
    })
    .catch(function (err) {
      restore();
      forgotMessage(err.message, 'error');
    });
}

function useForgotCode() {
  var id = $('forgot-id').value.trim();
  if (id && !$('login-id').readOnly) $('login-id').value = id;
  $('forgot-panel').classList.add('hidden');
  $('forgot-open').setAttribute('aria-expanded', 'false');
  $('login-secret').value = '';
  $('login-secret').focus();
}
