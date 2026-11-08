'use strict';

function boot() {
  restorePageSizes();
  wirePinnedHeads();
  document.addEventListener('wheel', onNumberWheel, { passive: false });
  wireModalHost();
  window.addEventListener('beforeunload', onBeforeUnload);
  window.addEventListener('hashchange', onHashChange);
  document.querySelectorAll('[data-mgi-logo]').forEach(function (img) {
    img.src = MGI_LOGO_B64;
  });

  S.token = loadToken();
  resolveSession();
}

function showScreen(id) {
  AUTH_SCREENS.forEach(function (name) {
    $(name).classList.toggle('hidden', name !== id);
  });
  if (id !== 'app-shell') document.body.classList.remove('has-help');
}

function identityOf(user) {
  if (!user) return '';
  return [user.NIK, !!user.isAdmin, !!user.isOwner, JSON.stringify(user.reportScope === undefined ? null : user.reportScope), user.year].join('|');
}

function watchBootTouch(on) {
  var mark = function () { S.bootTouched = true; };
  if (on) {
    S.bootTouched = false;
    S.bootTouchMark = mark;
    ['input', 'pointerdown', 'keydown'].forEach(function (t) { document.addEventListener(t, mark, true); });
    return;
  }
  if (!S.bootTouchMark) return;
  var prev = S.bootTouchMark;
  ['input', 'pointerdown', 'keydown'].forEach(function (t) { document.removeEventListener(t, prev, true); });
  S.bootTouchMark = null;
}

function applyFreshBoot(shown, res) {
  watchBootTouch(false);
  if (identityOf(shown.user) !== identityOf(res.user)) {
    window.location.reload();
    return;
  }
  if (JSON.stringify(shown) === JSON.stringify(res)) return;
  enterApp(res.user);
  if (S.bootTouched) {
    toast('Newer data is available. Reload the page to see it.', 'info');
    return;
  }
  seedPrefetch(res.prefetch);
  if (S.view) go(S.view);
}

function resolveSession() {
  var hadToken = !!S.token;
  var cached = readBootCache();
  var shown = cached ? cached.res : null;
  if (shown) {
    watchBootTouch(true);
    seedPrefetch(shown.prefetch);
    enterApp(shown.user);
  }
  return api('bootstrap')
    .then(function (res) {
      var user = res && res.user;
      if (user && user.authorized) writeBootCache(res);
      else clearBootCache();
      if (shown && user && user.authorized) {
        applyFreshBoot(shown, res);
        return;
      }
      watchBootTouch(false);
      seedPrefetch(res && res.prefetch);
      if (user && user.authorized) {
        enterApp(user);
      } else if (user && user.mustChange) {
        openPasswordScreen(true, user);
      } else if (user && user.needsLogin) {
        saveToken('');
        showLogin(hadToken ? user.reason : '');
      } else {
        showDenied((user && user.reason) || 'Access could not be verified.', (user && user.email) || 'not detected');
      }
    })
    .catch(function (err) {
      if (shown && S.user) {
        watchBootTouch(false);
        toast('Showing your last loaded data. ' + err.message, 'warning');
        return;
      }
      showDenied(err.message, 'not detected');
    });
}

function enterApp(user) {
  var first = !S.user;
  S.user = user;
  S.bands = user.bands || null;
  document.title = 'MGI KPIs Management System' + (user.year ? ' ' + user.year : '');
  renderBandLegends();
  if (first) applyRole(user);
  showScreen('app-shell');
  renderHelpFab();
}

function showDenied(reason, email) {
  $('denied-reason').textContent = reason;
  $('denied-email').textContent = email;
  showScreen('app-denied');
}

function sessionLost(message) {
  if (S.user && S.user.authVia === 'google') return;
  saveToken('');
  showLogin(message.replace(/^Access denied:\s*/, ''));
}

function showLogin(message) {
  var locked = !!(S.user && S.user.authVia === 'password');
  $('login-id').readOnly = locked;
  if (locked) $('login-id').value = S.user.NIK;
  $('login-switch').classList.toggle('hidden', !locked);
  $('login-secret').value = '';
  loginError(message || '');
  showScreen('app-login');
  setTimeout(function () {
    var field = locked ? $('login-secret') : $('login-id');
    if (field && field.focus) field.focus();
  }, 60);
}

function loginError(message) {
  $('login-error').textContent = message;
  $('login-error').classList.toggle('hidden', !message);
}

function submitLogin() {
  var id = $('login-id').value.trim();
  var secret = $('login-secret').value;
  if (!id || !secret) {
    loginError('Enter your NIK or email and your password.');
    return;
  }

  var btn = $('login-submit');
  var restore = busy(btn, 'Signing in');
  api('login', id, secret)
    .then(function (res) {
      saveToken(res.token);
      loginError('');
      btn.innerHTML = '<span class="spinner"></span> Opening your workspace';
      var done = function () {
        restore();
        $('login-secret').value = '';
      };
      return resolveSession().then(done, done);
    })
    .catch(function (err) {
      restore();
      loginError(err.message);
    });
}

function setPasswordShown(field, btn, show) {
  field.type = show ? 'text' : 'password';
  if (!btn) return;
  btn.title = show ? 'Hide password' : 'Show password';
  btn.setAttribute('aria-label', btn.title);
  btn.innerHTML = '<span class="material-symbols-outlined text-[20px]">' + (show ? 'visibility_off' : 'visibility') + '</span>';
}

function togglePasswordField(id, btn) {
  var field = $(id);
  setPasswordShown(field, btn, field.type === 'password');
}

function onCapsCheck(ev, id) {
  var note = $(id);
  if (!note || !ev || !ev.getModifierState) return;
  note.classList.toggle('hidden', !ev.getModifierState('CapsLock'));
}

function openPasswordScreen(forced, user) {
  S.pwForced = forced === true;
  var who = S.pwForced ? user : S.user;
  S.pwNik = (who && who.NIK) || '';

  $('password-title').textContent = S.pwForced ? 'Set your own password' : 'Change password';
  $('password-note').textContent = S.pwForced
    ? 'Welcome' + (who && who.Full_Name ? ', ' + who.Full_Name : '') +
      '. Your login code works only once, so choose the password you will use from now on.'
    : 'Enter your current password, then choose a new one. Other devices will be signed out.';
  $('password-current-wrap').classList.toggle('hidden', S.pwForced);
  $('password-cancel').classList.toggle('hidden', S.pwForced);
  ['password-current', 'password-new', 'password-confirm'].forEach(function (id) {
    $(id).value = '';
    setPasswordShown($(id), $(id + '-toggle'), false);
  });
  passwordError('');
  onPasswordInput();

  if (S.pwForced) showScreen('app-password');
  else $('app-password').classList.remove('hidden');
}

function closePasswordScreen() {
  $('app-password').classList.add('hidden');
}

function passwordError(message) {
  $('password-error').textContent = message;
  $('password-error').classList.toggle('hidden', !message);
}

function passwordChecks(pw, confirm) {
  return [
    [pw.length >= 8, 'At least 8 characters'],
    [/[A-Za-z]/.test(pw) && /[0-9]/.test(pw), 'Contains letters and numbers'],
    [!!pw && pw !== String(S.pwNik || ''), 'Different from your NIK'],
    [!!pw && pw === confirm, 'Both entries match']
  ];
}

function onPasswordInput() {
  var checks = passwordChecks($('password-new').value, $('password-confirm').value);
  $('password-rules').innerHTML = checks.map(function (c) {
    return '<li class="flex items-center gap-2 ' + (c[0] ? 'text-status-success-text' : 'text-text-muted') + '">' +
      '<span class="material-symbols-outlined text-[16px]">' + (c[0] ? 'check_circle' : 'radio_button_unchecked') + '</span>' +
      c[1] + '</li>';
  }).join('');
  $('password-submit').disabled = !checks.every(function (c) { return c[0]; }) ||
    (!S.pwForced && !$('password-current').value);
}

function submitPassword() {
  if ($('password-submit').disabled) return;
  var restore = busy($('password-submit'), 'Saving');

  api('changePassword', $('password-new').value, S.pwForced ? '' : $('password-current').value)
    .then(function (res) {
      restore();
      saveToken(res.token);
      if (S.pwForced) {
        resolveSession();
        return;
      }
      closePasswordScreen();
      toast(res.message, 'success');
    })
    .catch(function (err) {
      restore();
      onPasswordInput();
      passwordError(err.message);
    });
}

function signOut() {
  var url = S.user && S.user.appUrl;
  saveToken('');
  if (url) {
    window.open(url, '_top');
    return;
  }
  showLogin('You have been signed out.');
}
