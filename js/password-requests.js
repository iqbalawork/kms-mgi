'use strict';

function openForgot() {
  var panel = $('forgot-panel');
  var open = panel.classList.contains('hidden');
  panel.classList.toggle('hidden', !open);
  $('forgot-open').setAttribute('aria-expanded', open ? 'true' : 'false');
  if (!open) return;
  if (!$('forgot-id').value) $('forgot-id').value = $('login-id').value.trim();
  forgotMessage('', '');
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
      btn.disabled = true;
      setTimeout(function () { btn.disabled = false; }, FORGOT_COOLDOWN_MS);
    })
    .catch(function (err) {
      restore();
      forgotMessage(err.message, 'error');
    });
}

function refreshPasswordRequests() {
  if (!S.user || !S.user.isAdmin) return Promise.resolve();
  return api('getPasswordRequests')
    .then(function (res) {
      S.pwRequests = (res && res.requests) || [];
      renderPasswordBadge();
      renderPasswordRequests();
    })
    .catch(function () {});
}

function renderPasswordBadge() {
  var link = document.querySelector('#sidebar-nav [data-view="mapping"]');
  if (!link) return;
  var n = (S.pwRequests || []).length;
  var badge = link.querySelector('.nav-badge');
  if (!n) {
    if (badge) badge.remove();
    link.title = 'Mapping KPI';
    return;
  }
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'nav-badge';
    link.appendChild(badge);
  }
  badge.textContent = n;
  link.title = 'Mapping KPI, ' + plural(n, 'password request') + ' waiting';
}

function pwRequestRowHtml(r) {
  var role = [r.Position, r.Department].filter(Boolean).join(' / ');
  return '<li class="pw-req-row" data-pw-nik="' + esc(r.NIK) + '">' +
    '<div class="min-w-0 flex-1">' +
      '<p class="text-body-sm font-semibold text-text-primary">' + esc(r.Full_Name) +
        '<span class="font-normal text-text-secondary"> • NIK ' + esc(r.NIK) + (role ? ' • ' + esc(role) : '') + '</span></p>' +
      '<p class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-label-xs text-text-secondary">' +
        '<span class="inline-flex items-center gap-1"><span class="material-symbols-outlined text-[14px]" aria-hidden="true">mail</span>' + esc(r.Email) + '</span>' +
        (r.personalEmail ? '<span class="pill pill-warning !py-0 !text-[11px]">Personal email</span>' : '') +
        '<span>Asked ' + esc(fmtDate(r.Requested_At)) + (r.Count > 1 ? ', ' + plural(r.Count, 'time') : '') + '</span>' +
      '</p>' +
      (r.personalEmail
        ? '<p class="mt-1 text-label-xs text-status-warning-text">Confirm with the person by WhatsApp or chat before you approve.</p>'
        : '') +
    '</div>' +
    '<div class="flex items-center gap-2 shrink-0">' +
      '<button type="button" class="btn btn-secondary !py-1.5 !px-3 !text-label-sm" onclick="MGI.answerPasswordRequest(\'' + esc(r.NIK) + '\', \'dismiss\')">Dismiss</button>' +
      '<button type="button" class="btn btn-primary !py-1.5 !px-3 !text-label-sm" onclick="MGI.openPasswordApprove(\'' + esc(r.NIK) + '\')">' +
        '<span class="material-symbols-outlined text-[16px]">send</span> Approve and send code</button>' +
    '</div>' +
  '</li>';
}

function renderPasswordRequests() {
  var host = $('pw-requests');
  if (!host) return;
  var list = S.pwRequests || [];
  host.classList.toggle('hidden', !list.length);
  host.innerHTML = !list.length ? '' :
    '<section class="bg-surface-card rounded-xl shadow-level-1 border border-border-light overflow-hidden" aria-labelledby="pw-req-title">' +
      '<div class="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-border-light">' +
        '<h2 id="pw-req-title" class="flex items-center gap-2 text-[14px] font-semibold text-text-primary">' +
          '<span class="material-symbols-outlined text-[18px] text-primary-container" aria-hidden="true">lock_reset</span>Password requests' +
          '<span class="pill pill-maroon !py-0 !text-[11px]">' + list.length + '</span></h2>' +
        '<p class="text-label-xs text-text-secondary">Approving emails a new one-time login code to the registered address and signs the person out everywhere.</p>' +
      '</div>' +
      '<ul class="divide-y divide-slate-100">' + list.map(pwRequestRowHtml).join('') + '</ul>' +
    '</section>';
}

function pwRequestOf(nik) {
  return (S.pwRequests || []).filter(function (r) { return r.NIK === nik; })[0] || null;
}

function openPasswordApprove(nik) {
  var r = pwRequestOf(nik);
  if (!r) return;
  $('modal-host').innerHTML =
    '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closePasswordApprove()">' +
      '<div class="modal-panel !max-w-md" role="dialog" aria-modal="true" aria-labelledby="pw-approve-title">' +
        '<div class="px-6 pt-6 pb-5 flex items-start gap-4">' +
          '<span class="w-10 h-10 rounded-full bg-status-warning-subtle text-status-warning flex items-center justify-center shrink-0">' +
            '<span class="material-symbols-outlined text-[22px]">lock_reset</span></span>' +
          '<div class="min-w-0">' +
            '<h2 id="pw-approve-title" class="text-title-lg text-text-primary">Approve password request</h2>' +
            '<p class="text-body-sm text-text-secondary mt-1">A one-time login code will be emailed to <strong>' + esc(r.Full_Name) + '</strong> at <strong class="break-all">' +
              esc(r.Email) + '</strong>. Their current password and every signed-in session stop working immediately.</p>' +
            (r.personalEmail
              ? '<p class="mt-3 rounded-lg bg-status-warning-subtle text-status-warning-text text-body-sm px-3 py-2">This is a personal email. Approve only after you confirmed with the person that they asked for it.</p>'
              : '') +
          '</div>' +
        '</div>' +
        '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex items-center justify-end gap-space-sm">' +
          '<button class="btn btn-secondary" onclick="MGI.closePasswordApprove()">Cancel</button>' +
          '<button id="pw-approve-confirm" class="btn btn-primary" onclick="MGI.answerPasswordRequest(\'' + esc(r.NIK) + '\', \'approve\')">' +
            '<span class="material-symbols-outlined text-[18px]">send</span> Approve and send code</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function closePasswordApprove() {
  $('modal-host').innerHTML = '';
}

function answerPasswordRequest(nik, action) {
  var row = document.querySelector('[data-pw-nik="' + nik + '"]');
  var btn = action === 'approve' ? $('pw-approve-confirm') : null;
  var restore = btn ? busy(btn, 'Sending') : null;
  if (row) row.classList.add('opacity-60');
  api('resolvePasswordRequest', nik, action)
    .then(function (res) {
      if (restore) restore();
      closePasswordApprove();
      S.pwRequests = res.requests || [];
      renderPasswordBadge();
      renderPasswordRequests();
      toast(res.message, res.account === 'queued' ? 'warning' : res.success ? 'success' : 'error');
    })
    .catch(function (err) {
      if (restore) restore();
      if (row) row.classList.remove('opacity-60');
      toast(err.message, 'error');
      refreshPasswordRequests();
    });
}
