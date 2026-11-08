'use strict';

function trackLoad(delta) {
  S.loading = Math.max(0, (S.loading || 0) + delta);
  var bar = $('app-progress');
  if (!bar) return;
  clearTimeout(S.loadTimer);
  if (!S.loading) {
    bar.classList.remove('is-active');
    return;
  }
  S.loadTimer = setTimeout(function () {
    if (S.loading) bar.classList.add('is-active');
  }, 200);
}

function api(fn) {
  var args = Array.prototype.slice.call(arguments, 1);
  if (!READ_FNS[fn]) {
    return apiCall(fn, args, 0).then(function (res) {
      S.prefetch = {};
      return res;
    });
  }
  var key = fn + '|' + JSON.stringify(args);
  var ready = takePrefetch(key);
  if (ready) return Promise.resolve(ready.data);
  if (S.inflight[key]) return S.inflight[key];
  var call = apiCall(fn, args, 0);
  S.inflight[key] = call;
  var settle = function () { if (S.inflight[key] === call) delete S.inflight[key]; };
  call.then(settle, settle);
  return call;
}

function takePrefetch(key) {
  var hit = S.prefetch[key];
  if (!hit) return null;
  delete S.prefetch[key];
  return Date.now() - hit.at <= PREFETCH_TTL_MS ? hit : null;
}

function seedPrefetch(list) {
  S.prefetch = {};
  (list || []).forEach(function (p) {
    if (p && p.fn && READ_FNS[p.fn]) S.prefetch[p.fn + '|' + JSON.stringify(p.args || [])] = { data: p.data, at: Date.now() };
  });
}

function retryLimit(fn, message) {
  if (BUSY_LOCK.test(message)) return BUSY_RETRIES;
  if (READ_FNS[fn] && TRANSIENT.test(message) && !DAILY_QUOTA.test(message)) return READ_RETRIES;
  return 0;
}

function retryDelay(attempt) {
  return Math.round(RETRY_BASE_MS * Math.pow(2, attempt) * (0.5 + Math.random()));
}

function apiCall(fn, args, attempt) {
  trackLoad(1);
  return new Promise(function (resolve, reject) {
    gasRpc(S.token || '', fn, args, !!READ_FNS[fn])
      .then(function (res) {
        trackLoad(-1);
        resolve(res);
      }, function (err) {
        trackLoad(-1);
        var message = (err && err.message) ? err.message : String(err);
        if (fn !== 'login' && AUTH_LOST.test(message)) sessionLost(message);

        if (attempt < retryLimit(fn, message)) {
          if (!attempt && BUSY_LOCK.test(message)) toast('Everyone is saving at once. Retrying your request.', 'warning');
          setTimeout(function () {
            apiCall(fn, args, attempt + 1).then(resolve, reject);
          }, retryDelay(attempt));
          return;
        }

        reject(new Error(message));
      });
  });
}

function loadToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY) || '';
  } catch (e) {
    return '';
  }
}

function saveToken(token) {
  S.token = token || '';
  S.prefetch = {};
  clearBootCache();
  try {
    if (S.token) window.localStorage.setItem(TOKEN_KEY, S.token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    return;
  }
}

function readBootCache() {
  if (!S.token) return null;
  try {
    var c = JSON.parse(window.localStorage.getItem(BOOT_CACHE_KEY) || 'null');
    if (!c || c.token !== S.token || !c.res || !c.res.user || !c.res.user.authorized) return null;
    return Date.now() - c.at >= 0 && Date.now() - c.at < BOOT_CACHE_TTL_MS ? c : null;
  } catch (e) {
    return null;
  }
}

function writeBootCache(res) {
  if (!S.token || !res || !res.user || !res.user.authorized) {
    clearBootCache();
    return;
  }
  try {
    window.localStorage.setItem(BOOT_CACHE_KEY, JSON.stringify({ token: S.token, at: Date.now(), res: res }));
  } catch (e) {
    clearBootCache();
  }
}

function clearBootCache() {
  try {
    window.localStorage.removeItem(BOOT_CACHE_KEY);
  } catch (e) {
    return;
  }
}

function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function $(id) { return document.getElementById(id); }

function attr(v) {
  return String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function groupDigits(text) {
  var s = String(text);
  var neg = s.charAt(0) === '-';
  var body = neg ? s.slice(1) : s;
  var dot = body.indexOf('.');
  var whole = dot === -1 ? body : body.slice(0, dot);
  if (!/^\d+$/.test(whole)) return s;
  return (neg ? '-' : '') + whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (dot === -1 ? '' : body.slice(dot));
}

function num(v, dp) {
  if (v === null || v === undefined || v === '') return '-';
  var n = Number(v);
  if (isNaN(n)) return '-';
  return groupDigits(String(parseFloat(n.toFixed(dp === undefined ? 1 : dp))));
}

function parseNumText(text) {
  if (typeof text === 'number') return isFinite(text) ? text : NaN;
  var s = String(text === null || text === undefined ? '' : text).replace(/[\s,]/g, '');
  if (s === '' || s === '-' || s === '.' || s === '-.') return null;
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
  return parseFloat(s);
}

function cleanNumText(text, pasted) {
  var raw = String(text === null || text === undefined ? '' : text);
  var neg = /^\s*-/.test(raw);
  var s = raw.replace(/[^\d.,]/g, '');
  var dots = (s.match(/\./g) || []).length;
  var commas = (s.match(/,/g) || []).length;

  if (pasted) {
    if (dots > 1 || (dots === 1 && commas === 1 && s.lastIndexOf(',') > s.lastIndexOf('.'))) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (commas === 1 && !dots && /,\d{1,2}$/.test(s)) {
      s = s.replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else {
    s = s.replace(/,/g, '');
    if (dots > 1) s = s.replace(/\./g, '');
  }

  var dot = s.indexOf('.');
  var whole = (dot === -1 ? s : s.slice(0, dot)).replace(/^0+(?=\d)/, '');
  var frac = dot === -1 ? null : s.slice(dot + 1).replace(/\./g, '');
  if (frac !== null && whole === '') whole = '0';
  return { neg: neg, whole: whole, frac: frac };
}

function formatNumText(text, pasted) {
  var c = cleanNumText(text, pasted);
  if (!c.whole && c.frac === null) return c.neg ? '-' : '';
  return (c.neg ? '-' : '') + groupDigits(c.whole) + (c.frac === null ? '' : '.' + c.frac);
}

function formatNumValue(v) {
  if (v === null || v === undefined || v === '' || !isFinite(Number(v))) return '';
  var fixed = String(parseFloat(Number(v).toFixed(6)));
  return /e/i.test(fixed) ? fixed : groupDigits(fixed);
}

function compactNum(v) {
  try {
    return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'long', maximumFractionDigits: 2 }).format(v);
  } catch (e) {
    return num(v, 0);
  }
}

function liveFormatInput(input, ev) {
  var value = String(input.value || '');
  var caret = typeof input.selectionStart === 'number' ? input.selectionStart : value.length;
  var pasted = !!(ev && ev.inputType === 'insertFromPaste');

  if (ev && ev.inputType === 'insertText' && ev.data === ',' && value.charAt(caret - 1) === ',') {
    var hasDot = value.indexOf('.') > -1;
    value = value.slice(0, caret - 1) + (hasDot ? '' : '.') + value.slice(caret);
    if (hasDot) caret--;
  }

  var dropDots = !pasted && (value.match(/\./g) || []).length > 1;
  var significant = function (ch) { return /\d/.test(ch) || (ch === '.' && !dropDots); };
  var before = 0;
  for (var i = 0; i < caret && i < value.length; i++) {
    if (significant(value.charAt(i))) before++;
  }

  var next = formatNumText(value, pasted);
  if (next === input.value) return next;
  input.value = next;

  var pos = pasted ? next.length : 0;
  if (!pasted) {
    var seen = 0;
    while (pos < next.length && seen < before) {
      if (/[\d.]/.test(next.charAt(pos))) seen++;
      pos++;
    }
    if (!before && next.charAt(0) === '-') pos = 1;
  }
  if (input.setSelectionRange && document.activeElement === input) {
    try { input.setSelectionRange(pos, pos); } catch (e) {}
  }
  return next;
}

function pct(v, dp) {
  if (v === null || v === undefined || v === '') return '-';
  return num(v, dp) + '%';
}

function isNum(v) {
  return typeof v === 'number' && isFinite(v);
}

function bandValues() {
  return S.bands && isNum(S.bands.good) && isNum(S.bands.excellent) ? S.bands : { good: 75, excellent: 90 };
}

function bandNum(v) {
  return String(Math.round(Number(v) * 10) / 10);
}

function bandRange(key) {
  var b = bandValues();
  if (key === 'success') return 'Excellent (≥ ' + bandNum(b.excellent) + ')';
  if (key === 'info') return 'Good (' + bandNum(b.good) + ' to ' + bandNum(b.excellent - 0.1) + ')';
  return 'Needs Attention (< ' + bandNum(b.good) + ')';
}

function syncBands(bands) {
  if (bands && isNum(bands.good) && isNum(bands.excellent)) {
    S.bands = { good: bands.good, excellent: bands.excellent };
    if (S.user) S.user.bands = S.bands;
  }
  renderBandLegends();
}

function renderBandLegends() {
  var html = ['success', 'info', 'danger'].map(function (key) {
    return '<span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-status-' + key + '"></span> ' + esc(bandRange(key)) + '</span>';
  }).join('');
  ['sum-band-legend', 'ann-band-legend'].forEach(function (id) {
    var el = $(id);
    if (el) el.innerHTML = html;
  });
}

function band(index) {
  var b = bandValues();
  if (index >= b.excellent) return { key: 'success', label: 'Excellent' };
  if (index >= b.good)      return { key: 'info',    label: 'Good' };
  return { key: 'danger', label: 'Needs Attention' };
}

function fmtDate(iso) {
  if (!iso) return '-';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.getDate() + ' ' + MONTHS[d.getMonth()].substring(0, 3) + ' ' + d.getFullYear();
}

function toast(message, type) {
  var host = $('toast-host');
  var el = document.createElement('div');
  el.className = 'toast toast-' + (type || 'info');
  if (type === 'error') el.setAttribute('role', 'alert');
  var icon = type === 'success' ? 'check_circle'
           : type === 'error'   ? 'error'
           : type === 'warning' ? 'warning' : 'info';
  el.innerHTML =
    '<span class="material-symbols-outlined text-[20px]">' + icon + '</span>' +
    '<span class="flex-1">' + esc(message) + '</span>' +
    '<button type="button" data-toast-close class="shrink-0 -mr-1 -mt-0.5 p-0.5 rounded-md opacity-70 transition-all duration-150 hover:opacity-100 hover:bg-white/15"' +
      ' aria-label="Dismiss notification" title="Dismiss"><span class="material-symbols-outlined text-[18px]">close</span></button>';
  var dismiss = function () {
    if (el.dataset.gone) return;
    el.dataset.gone = '1';
    el.classList.add('is-out');
    setTimeout(function () { el.remove(); }, 200);
  };
  el.onclick = function (ev) {
    var target = ev && ev.target;
    if (target && target.closest && target.closest('[data-toast-close]')) dismiss();
  };
  host.appendChild(el);
  setTimeout(dismiss, type === 'error' ? 7000 : 4000);
}

function emptyState(art, message, action) {
  return '<div class="empty-state">' +
    '<svg class="empty-art" width="120" height="96" viewBox="0 0 120 96" aria-hidden="true" focusable="false"><use href="#art-' + art + '"></use></svg>' +
    '<p class="empty-state-text">' + message + '</p>' +
    (action ? '<button type="button" class="btn btn-secondary !py-1.5 mt-1" onclick="MGI.' + action.fn + '()">' +
      '<span class="material-symbols-outlined text-[18px]">' + action.icon + '</span> ' + esc(action.label) + '</button>' : '') +
  '</div>';
}

function loadErrorHtml(message, retry) {
  return '<div class="flex flex-col items-center gap-space-sm text-center" role="alert">' +
    '<svg class="empty-art" width="120" height="96" viewBox="0 0 120 96" aria-hidden="true" focusable="false"><use href="#art-offline"></use></svg>' +
    '<p class="text-body-md text-status-danger-text">' + esc(message) + '</p>' +
    '<button type="button" class="btn btn-secondary !py-1.5" onclick="MGI.' + retry + '()">' +
      '<span class="material-symbols-outlined text-[18px]">refresh</span> Try again</button>' +
  '</div>';
}

function busy(btn, label) {
  var original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> ' + esc(label || 'Processing');
  return function restore() {
    btn.disabled = false;
    btn.innerHTML = original;
  };
}

function skeletonRows(cols, rows) {
  var out = '';
  for (var r = 0; r < (rows || 4); r++) {
    out += '<tr>';
    for (var c = 0; c < cols; c++) out += '<td><div class="skeleton h-4 w-full"></div></td>';
    out += '</tr>';
  }
  return out;
}

function calcScore(realization, target, label, multiplier, targetIsB) {
  if (label === 'Binary') return (realization === target) ? 1.0 : 0.2;

  if (label === 'Increase') {
    if (targetIsB === true) {
      if (realization > target) return 1.0;
      if (realization >= target) return 0.8;
      if (realization >= target - multiplier) return 0.6;
      if (realization >= target - 2 * multiplier) return 0.4;
      return 0.2;
    }
    if (realization >= target) return 1.0;
    if (realization >= target - multiplier) return 0.8;
    if (realization >= target - 2 * multiplier) return 0.6;
    if (realization >= target - 3 * multiplier) return 0.4;
    return 0.2;
  }

  if (label === 'Decrease') {
    if (targetIsB === true) {
      if (realization < target) return 1.0;
      if (realization <= target) return 0.8;
      if (realization <= target + multiplier) return 0.6;
      if (realization <= target + 2 * multiplier) return 0.4;
      return 0.2;
    }
    if (realization <= target) return 1.0;
    if (realization <= target + multiplier) return 0.8;
    if (realization <= target + 2 * multiplier) return 0.6;
    if (realization <= target + 3 * multiplier) return 0.4;
    return 0.2;
  }
  return 0;
}

function calcAchievement(realization, item) {
  var t = Number(item.Target);
  var r = Number(realization);
  if (item.Label === 'Decrease') {
    if (r === 0) return t === 0 ? 100 : null;
    return (t / r) * 100;
  }
  if (t === 0) return r === 0 ? 100 : null;
  return (r / t) * 100;
}

function targetPrefix(item) {
  return item.Label === 'Decrease' ? '≤ ' : item.Label === 'Increase' ? '≥ ' : '= ';
}

function targetLabel(item) {
  return targetPrefix(item) + num(item.Target, 2);
}

function targetShort(item) {
  var t = Number(item.Target);
  return isNum(t) && Math.abs(t) >= 1000000 ? targetPrefix(item) + compactShort(t) : '';
}

function targetCell(item) {
  var full = esc(targetLabel(item));
  var short = targetShort(item);
  var base = 'text-code-num font-bold text-text-primary truncate';
  return short
    ? '<span class="block md:hidden 2xl:block ' + base + '">' + full + '</span>' +
      '<span class="hidden md:block 2xl:hidden ' + base + '">' + esc(short) + '</span>'
    : '<span class="block ' + base + '">' + full + '</span>';
}

function maxRealization() {
  var cfg = S.dashboard && S.dashboard.config;
  return cfg && isNum(cfg.maxRealization) ? cfg.maxRealization : 1e15;
}

function tooLarge(value) {
  return isNum(value) && Math.abs(value) > maxRealization();
}

function realizationClass(value) {
  return String(value || '').length > LONG_REALIZATION ? ' is-long' : '';
}

function labelMeta(label) {
  return LABEL_META[label] || LABEL_META.Increase;
}

function targetHint(item) {
  var meta = labelMeta(item.Label);
  var target = num(item.Target, 2) + (item.Unit ? ' ' + item.Unit : '');
  var rule = item.Label === 'Decrease' ? 'at most ' + target
           : item.Label === 'Binary' ? 'exactly ' + target
           : 'at least ' + target;
  return meta.short + ': ' + rule + (item.Target_Is_B ? '. Strict target: 1.0 only when the target is beaten.' : '.');
}

function tierLadder(k) {
  var t = Number(k.Target);
  var m = Number(k.Multiplier) || 0;
  var b = k.Target_Is_B === true;
  var f = function (v) { return num(v, 2); };
  if (k.Label === 'Binary') {
    return [
      { score: 1, rule: '= ' + f(t) },
      { score: 0.2, rule: 'any other value' }
    ];
  }
  if (k.Label === 'Decrease') {
    return b ? [
      { score: 1, rule: '< ' + f(t) },
      { score: 0.8, rule: '= ' + f(t) },
      { score: 0.6, rule: '≤ ' + f(t + m) },
      { score: 0.4, rule: '≤ ' + f(t + 2 * m) },
      { score: 0.2, rule: '> ' + f(t + 2 * m) }
    ] : [
      { score: 1, rule: '≤ ' + f(t) },
      { score: 0.8, rule: '≤ ' + f(t + m) },
      { score: 0.6, rule: '≤ ' + f(t + 2 * m) },
      { score: 0.4, rule: '≤ ' + f(t + 3 * m) },
      { score: 0.2, rule: '> ' + f(t + 3 * m) }
    ];
  }
  return b ? [
    { score: 1, rule: '> ' + f(t) },
    { score: 0.8, rule: '= ' + f(t) },
    { score: 0.6, rule: '≥ ' + f(t - m) },
    { score: 0.4, rule: '≥ ' + f(t - 2 * m) },
    { score: 0.2, rule: '< ' + f(t - 2 * m) }
  ] : [
    { score: 1, rule: '≥ ' + f(t) },
    { score: 0.8, rule: '≥ ' + f(t - m) },
    { score: 0.6, rule: '≥ ' + f(t - 2 * m) },
    { score: 0.4, rule: '≥ ' + f(t - 3 * m) },
    { score: 0.2, rule: '< ' + f(t - 3 * m) }
  ];
}

function tierChip(score) {
  return '<span class="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ' + tierClass(score) + '">' +
    Number(score).toFixed(1) + '</span>';
}

function onNumberWheel(e) {
  var t = e && e.target;
  if (!t || t.tagName !== 'INPUT' || t.type !== 'number') return;
  if (document.activeElement !== t) return;
  e.preventDefault();
  t.blur();
}

var MODAL_FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function modalPanel() {
  var host = $('modal-host');
  return host && host.querySelector ? host.querySelector('.modal-panel') : null;
}

function labelModal(panel) {
  if (!panel.getAttribute('role')) panel.setAttribute('role', 'dialog');
  if (!panel.getAttribute('aria-modal')) panel.setAttribute('aria-modal', 'true');
  if (panel.getAttribute('aria-labelledby') || panel.getAttribute('aria-label')) return;
  var title = panel.querySelector('h1, h2, h3');
  if (title) {
    if (!title.id) title.id = 'modal-title';
    panel.setAttribute('aria-labelledby', title.id);
  } else {
    panel.setAttribute('aria-label', (panel.textContent || '').trim() || 'Dialog');
  }
}

function focusModal(panel) {
  var field = panel.querySelector('input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])');
  var target = field || panel.querySelector(MODAL_FOCUSABLE);
  if (!target) {
    panel.setAttribute('tabindex', '-1');
    target = panel;
  }
  target.focus();
}

function wireModalHost() {
  var host = $('modal-host');
  if (!host || typeof MutationObserver === 'undefined') return;
  var opener = null;
  new MutationObserver(function () {
    var panel = modalPanel();
    if (panel) {
      labelModal(panel);
      if (!opener) opener = document.activeElement;
      if (!panel.contains(document.activeElement)) focusModal(panel);
    } else if (opener) {
      var back = opener;
      opener = null;
      if (back.focus && document.body.contains(back)) back.focus();
    }
  }).observe(host, { childList: true });
  document.addEventListener('keydown', onModalKey);
}

function onModalKey(ev) {
  var panel = modalPanel();
  if (!panel) return;
  if (ev.key === 'Escape') {
    var backdrop = panel.parentNode;
    if (backdrop && backdrop.getAttribute && backdrop.getAttribute('onclick')) {
      ev.preventDefault();
      backdrop.click();
    }
    return;
  }
  if (ev.key !== 'Tab') return;
  var items = Array.prototype.filter.call(panel.querySelectorAll(MODAL_FOCUSABLE), function (el) { return el.offsetParent !== null; });
  if (!items.length) { ev.preventDefault(); return; }
  var first = items[0];
  var last = items[items.length - 1];
  if (ev.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
    ev.preventDefault();
    last.focus();
  } else if (!ev.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
    ev.preventDefault();
    first.focus();
  }
}

function hasUnsavedWork() {
  return (S.view === 'my-kpis' && myKpisDirty()) || evalDirty() || isBasketDirty() || isCategoryDirty();
}

function onBeforeUnload(ev) {
  if (!hasUnsavedWork()) return;
  ev.preventDefault();
  ev.returnValue = '';
}
