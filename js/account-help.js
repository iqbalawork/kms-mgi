'use strict';

function restrictOwnerViews(user) {
  if (user.isOwner) return;
  ['settings-tab-admins', 'settings-admins-panel'].forEach(function (id) {
    var el = $(id);
    if (el) el.remove();
  });
}

function applyRole(user) {
  restrictOwnerViews(user);
  renderAccountMenu();
  $('topbar-title').textContent     = 'KPIs Management System';
  $('topbar-fy').innerHTML          = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>FY' + esc(user.year);
  $('topbar-fy').title              = 'Active fiscal year';
  $('sidebar-subtitle').textContent = 'Performance System ' + user.year;
  $('app-footer-year').textContent  = new Date().getFullYear();
  $('sidebar-name').textContent     = user.Full_Name;
  $('sidebar-role').textContent     = user.Position || '-';
  $('sidebar-avatar').textContent   = initials(user.Full_Name);
  $('sidebar-avatar').title         = user.Full_Name;

  var sysRole = userRoleLabel(user);
  $('topbar-role').innerHTML =
    '<span class="material-symbols-outlined text-[14px] text-slate-400">' + (user.isAdmin ? 'admin_panel_settings' : isReportViewer(user) ? 'monitoring' : 'badge') + '</span>' +
    '<span><span class="hidden sm:inline">Role: </span>' + esc(sysRole) + '</span>';
  restoreSidebar();

  var nav = $('sidebar-nav');

  if (user.isAdmin) {
    nav.appendChild(navGroup('My Workspace', WORKSPACE_NAV));
    nav.appendChild(navGroup('Reports', [
      { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
      { id: 'summary',  icon: 'bar_chart', label: 'Summary Report' },
      { id: 'evaluation', icon: 'workspace_premium', label: 'Performance Evaluation' }
    ]));
    nav.appendChild(navGroup('Setup', [
      { id: 'master-kpis', icon: 'library_books', label: 'Master KPIs' },
      { id: 'mapping',  icon: 'tune',      label: 'Mapping KPI' },
      { id: 'settings', icon: 'settings',  label: 'System Settings' }
    ]));
    go(viewFromHash() || (isPhone() ? 'my-kpis' : 'dashboard'));
  } else {
    var viewer = isReportViewer(user);
    var drop = ['view-mapping', 'view-settings', 'view-master-kpis', 'view-evaluation'];
    if (!viewer) drop.push('view-summary', 'view-dashboard');
    drop.forEach(function (id) {
      var view = $(id);
      if (view) view.remove();
    });

    nav.appendChild(navGroup('My Workspace', WORKSPACE_NAV));
    if (viewer) {
      nav.appendChild(navGroup('Reports', [
        { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
        { id: 'summary',  icon: 'bar_chart', label: 'Summary Report' }
      ]));
    }
    go(viewFromHash() || 'my-kpis');
  }
}

function accountItem(icon, label, action, danger) {
  return '<button type="button" class="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg text-body-sm font-medium transition-all duration-150 ' +
    (danger ? 'text-status-danger-text hover:bg-status-danger-subtle' : 'text-text-primary hover:bg-slate-100') + '" onclick="' + action + '">' +
    '<span class="material-symbols-outlined text-[18px]">' + icon + '</span>' + label + '</button>';
}

function renderAccountMenu() {
  var u = S.user;
  if (!u) return;
  if ($('account-trigger-avatar')) $('account-trigger-avatar').textContent = initials(u.Full_Name);
  if (!$('account-menu')) return;

  var passwordAuth = u.authVia === 'password';
  var role = u.isOwner ? 'Owner' : userRoleLabel(u);

  $('account-menu').innerHTML =
    '<div class="p-4 border-b border-slate-100">' +
      '<div class="flex items-center gap-3">' +
        '<span class="w-11 h-11 rounded-full bg-primary-container text-white flex items-center justify-center text-label-sm font-bold shrink-0">' +
          esc(initials(u.Full_Name)) + '</span>' +
        '<div class="min-w-0">' +
          '<p class="text-body-md font-semibold text-text-primary truncate">' + esc(u.Full_Name) + '</p>' +
          '<p class="text-label-xs text-text-muted truncate">' + esc(u.Email || '-') + '</p>' +
          '<p class="text-label-xs text-text-muted truncate">NIK ' + esc(u.NIK) + (u.Position ? ' • ' + esc(u.Position) : '') + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="flex flex-wrap gap-1.5 mt-3">' +
        '<span class="pill ' + (u.isOwner ? 'pill-brand' : u.isAdmin ? 'pill-maroon' : 'pill-neutral') + ' !text-[11px]">' + esc(role) + '</span>' +
        '<span class="pill pill-neutral !text-[11px]"><span class="material-symbols-outlined text-[14px]">' +
          (passwordAuth ? 'password' : 'account_circle') + '</span> ' + (passwordAuth ? 'Password sign-in' : 'Google sign-in') + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="p-1.5 flex flex-col">' +
      accountItem('menu_book', 'Scoring Guide', "MGI.accountAction('guide')") +
      (passwordAuth
        ? accountItem('key', 'Change password', "MGI.accountAction('password')") +
          accountItem('logout', 'Sign out', "MGI.accountAction('signout')", true)
        : '<p class="px-3 py-2 text-label-xs text-text-muted flex items-center gap-1.5">' +
            '<span class="material-symbols-outlined text-[16px]">verified_user</span> Signed in with your Google account</p>') +
    '</div>';
}

function toggleAccountMenu(force) {
  var menu = $('account-menu');
  if (!menu) return;
  var open = force === undefined ? menu.classList.contains('hidden') : !!force;
  if (open) renderAccountMenu();
  menu.classList.toggle('hidden', !open);
  if ($('account-trigger')) $('account-trigger').setAttribute('aria-expanded', open ? 'true' : 'false');

  if (open && !S.accountWired) {
    S.accountWired = true;
    document.addEventListener('click', function (ev) {
      var wrap = $('account-wrap');
      if (wrap && wrap.contains && !wrap.contains(ev.target)) toggleAccountMenu(false);
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') toggleAccountMenu(false);
    });
  }
}

function waIcon(cls) {
  return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="' + WA_PATH + '"/></svg>';
}

function helpSupport() {
  var s = S.user && S.user.support;
  return s && s.whatsapp ? s : null;
}

function fillCopy(tpl, map) {
  return String(tpl).replace(/\{(\w+)\}/g, function (m, key) { return map[key] === undefined ? '' : String(map[key]); });
}

function helpContext() {
  var ctx = { page: VIEW_TITLES[S.view] || '', month: 0, year: 0, role: '' };
  var d = S.view === 'my-kpis' ? S.dashboard : S.view === 'summary' ? S.summary : null;
  if (d && d.month) {
    ctx.month = d.month;
    ctx.year = d.year;
  }
  if (S.help.roleKey && S.view === 'my-kpis') {
    var r = findRole(S.help.roleKey);
    if (r) ctx.role = r.label;
  }
  return ctx;
}

function helpNoteText(raw) {
  return String(raw || '').replace(/\r\n?/g, '\n').split('\n')
    .map(function (line) { return line.replace(/\s+$/, ''); }).join('\n')
    .replace(/\n{3,}/g, '\n\n').replace(/^\s+|\s+$/g, '').slice(0, HELP_NOTE_MAX);
}

function helpMessage(user, support, help, ctx) {
  var C = HELP_CHAT_ID;
  var topic = C.topics[help.topic] || null;
  var month = ctx.month ? C.months[ctx.month - 1] + ' ' + ctx.year : '';
  var role = ctx.role || [user.Position, user.Department].filter(Boolean).join(' / ');
  var place = [ctx.page, month].filter(Boolean).join(', ');
  var line = !topic ? C.general
           : help.topic === 'change' && ctx.role && month ? fillCopy(C.changeFor, { role: ctx.role, month: month })
           : topic[1];
  var blocks = [
    [fillCopy(C.hello, { name: support.name })],
    [topic ? '*' + topic[0] + '*' : '', line, helpNoteText(help.note)],
    [fillCopy(C.who, { who: displayName(user.Full_Name), nik: user.NIK }),
     role ? fillCopy(C.role, { role: role }) : '',
     place ? fillCopy(C.place, { place: place }) : ''],
    [C.thanks]
  ];
  return blocks.map(function (b) { return b.filter(Boolean).join('\n'); }).filter(Boolean).join('\n\n');
}

function helpTopic(key) {
  return HELP_TOPICS.filter(function (x) { return x.key === key; })[0] || null;
}

function helpBlocker(help) {
  var topic = helpTopic(help.topic);
  if (!topic) return 'Pick a topic first.';
  if (topic.need && helpNoteText(help.note).replace(/\s/g, '').length < HELP_NOTE_MIN) return topic.need;
  return '';
}

function helpSendHtml(support, ctx) {
  var blocker = helpBlocker(S.help);
  var label = waIcon('w-5 h-5') + 'Open WhatsApp';
  return blocker
    ? '<a id="help-send" class="help-send is-disabled" role="link" aria-disabled="true" aria-describedby="help-send-hint">' + label + '</a>'
    : '<a id="help-send" class="help-send" href="' + esc(helpLink(support, helpMessage(S.user, support, S.help, ctx))) + '" target="_blank" rel="noopener noreferrer" onclick="MGI.helpSent()">' + label + '</a>';
}

function syncHelpSend() {
  var support = helpSupport();
  var slot = $('help-send-slot');
  if (!support || !slot) return;
  slot.innerHTML = helpSendHtml(support, helpContext());
  var hint = $('help-send-hint');
  if (hint) hint.textContent = helpBlocker(S.help) || 'You can review the message in WhatsApp before sending.';
  var count = $('help-count');
  if (count) count.textContent = String(S.help.note || '').length + ' / ' + HELP_NOTE_MAX;
}


function helpLink(support, text) {
  return 'https://wa.me/' + String(support.whatsapp).replace(/\D/g, '') + '?text=' + encodeURIComponent(text);
}

function helpIncluded(ctx) {
  var u = S.user;
  return [displayName(u.Full_Name), 'NIK ' + u.NIK, ctx.role, ctx.page, ctx.month ? MONTHS[ctx.month - 1] + ' ' + ctx.year : '']
    .filter(Boolean).join(' • ');
}

function helpTuck(prevY, y, viewH, docH, open, tucked) {
  if (open || y < 80 || y + viewH >= docH - 24) return false;
  if (y > prevY + 4) return true;
  if (y < prevY - 4) return false;
  return !!tucked;
}

function syncHelpFab() {
  var show = !!helpSupport() && !!HELP_VIEWS[S.view];
  document.body.classList.toggle('has-help', show);
  if ($('help-fab')) $('help-fab').classList.toggle('hidden', !show);
  if (!show) closeHelp(true);
}

function renderHelpFab() {
  var host = $('help-fab');
  var support = helpSupport();
  syncHelpFab();
  if (!host) return;
  if (!support) {
    host.innerHTML = '';
    S.help.open = false;
    return;
  }
  if (!$('help-fab-btn')) {
    host.innerHTML =
      '<div id="help-panel" class="help-panel hidden" role="dialog" aria-modal="false" aria-labelledby="help-title"></div>' +
      '<button id="help-fab-btn" type="button" class="help-fab-btn" onclick="MGI.toggleHelp()" aria-expanded="false" aria-controls="help-panel"' +
        ' aria-label="Chat with ' + esc(support.name) + ' on WhatsApp">' + waIcon('help-fab-icon') +
        '<span class="help-fab-label" aria-hidden="true">Chat Admin</span>' +
      '</button>';
  }
  wireHelpScroll();
}

function helpChip(topic, on) {
  return '<button type="button" class="help-chip" data-help-topic="' + topic.key + '" aria-pressed="' + (on ? 'true' : 'false') + '"' +
    ' onclick="MGI.setHelpTopic(\'' + topic.key + '\')">' +
    '<span class="material-symbols-outlined">' + topic.icon + '</span><span class="min-w-0 leading-tight">' + esc(topic.label) + '</span></button>';
}

function renderHelpPanel() {
  var panel = $('help-panel');
  var support = helpSupport();
  if (!panel || !support) return;
  var h = S.help;
  var ctx = helpContext();
  var picked = helpTopic(h.topic);

  panel.innerHTML =
    '<div class="flex items-start gap-3 px-4 pt-4 pb-3 border-b border-slate-100">' +
      '<span class="help-avatar">' + waIcon('w-[22px] h-[22px]') + '</span>' +
      '<div class="min-w-0 flex-1">' +
        '<h2 id="help-title" class="text-[15px] font-bold leading-tight text-text-primary">Chat with ' + esc(support.name) + '</h2>' +
        '<p class="mt-0.5 text-[12px] text-text-muted">' + esc((support.title ? support.title + ' • ' : '') + 'replies on WhatsApp') + '</p>' +
      '</div>' +
      '<button type="button" class="btn-icon -mr-1.5 -mt-1" onclick="MGI.closeHelp()" aria-label="Close" title="Close">' +
        '<span class="material-symbols-outlined text-[20px]">close</span></button>' +
    '</div>' +
    '<div class="flex flex-col gap-3 px-4 pt-3 pb-4">' +
      '<p class="help-bubble">Hi ' + esc(displayName(S.user.Full_Name)) + '! ^-^ What do you need help with?</p>' +
      '<div class="grid grid-cols-3 gap-1.5" role="group" aria-label="Topic">' +
        HELP_TOPICS.map(function (x) { return helpChip(x, x.key === h.topic); }).join('') +
      '</div>' +
      (picked
        ? '<div>' +
            '<div class="flex items-baseline justify-between gap-2 mb-1.5">' +
              '<label for="help-note" class="form-label !mb-0">' + esc(picked.field) + '</label>' +
              '<span class="text-[11px] ' + (picked.need ? 'font-semibold text-status-danger-text' : 'text-text-muted') + '">' + (picked.need ? 'Required' : 'Optional') + '</span>' +
            '</div>' +
            '<textarea id="help-note" class="field help-note" rows="4" maxlength="' + HELP_NOTE_MAX + '" placeholder="' + esc(picked.hint) + '"' +
              (picked.need ? ' aria-required="true"' : '') + ' oninput="MGI.onHelpNote(this)" onkeydown="MGI.onHelpKey(event)">' + esc(h.note) + '</textarea>' +
            '<p class="mt-1 flex justify-between gap-2 text-[11px] text-text-muted"><span>Press Enter for a new line.</span><span id="help-count" class="tabular-nums">' +
              String(h.note || '').length + ' / ' + HELP_NOTE_MAX + '</span></p>' +
          '</div>' +
          '<p class="text-[11px] leading-relaxed text-text-muted"><span class="font-semibold text-text-secondary">Added for you:</span> ' + esc(helpIncluded(ctx)) + '</p>'
        : '') +
      '<div id="help-send-slot">' + helpSendHtml(support, ctx) + '</div>' +
      '<p id="help-send-hint" class="-mt-1 text-center text-[11px] text-text-muted" aria-live="polite">' +
        esc(helpBlocker(h) || 'You can review the message in WhatsApp before sending.') + '</p>' +
    '</div>';
}

function toggleHelp(force) {
  var open = force === undefined ? !S.help.open : !!force;
  if (open) openHelp();
  else closeHelp();
}

function openHelp(topic, roleKey) {
  var panel = $('help-panel');
  if (!panel || !helpSupport()) return;
  if (topic !== undefined) {
    S.help.topic = topic || '';
    S.help.roleKey = roleKey || '';
  }
  S.help.open = true;
  renderHelpPanel();
  panel.classList.remove('hidden');
  if ($('help-fab')) $('help-fab').classList.remove('is-tucked');
  if ($('help-fab-btn')) $('help-fab-btn').setAttribute('aria-expanded', 'true');
  wireHelpDismiss();
  var first = panel.querySelector ? $('help-note') || panel.querySelector('[data-help-topic]') : null;
  if (first && first.focus) first.focus();
}

function closeHelp(silent) {
  if (!S.help.open) return;
  S.help.open = false;
  if ($('help-panel')) $('help-panel').classList.add('hidden');
  var btn = $('help-fab-btn');
  if (!btn) return;
  btn.setAttribute('aria-expanded', 'false');
  if (!silent && btn.focus) btn.focus();
}

function setHelpTopic(key) {
  S.help.topic = S.help.topic === key ? '' : key;
  renderHelpPanel();
  var panel = $('help-panel');
  var target = S.help.topic ? $('help-note') : panel && panel.querySelector ? panel.querySelector('[data-help-topic="' + key + '"]') : null;
  if (target && target.focus) target.focus();
}

function onHelpNote(el) {
  S.help.note = String(el.value || '').slice(0, HELP_NOTE_MAX);
  syncHelpSend();
}

function onHelpKey(ev) {
  if (ev.key !== 'Enter' || !(ev.ctrlKey || ev.metaKey)) return;
  ev.preventDefault();
  var link = $('help-send');
  if (!helpBlocker(S.help) && link && link.click) link.click();
}

function helpSent() {
  setTimeout(function () {
    S.help.topic = '';
    S.help.note = '';
    S.help.roleKey = '';
    closeHelp(true);
  }, 200);
}

function wireHelpDismiss() {
  if (S.helpWired) return;
  S.helpWired = true;
  document.addEventListener('click', function (ev) {
    if (!S.help.open) return;
    var host = $('help-fab');
    var target = ev && ev.target;
    if (!target || target.isConnected === false) return;
    if (target.closest && target.closest('[data-help-open]')) return;
    if (host && host.contains && !host.contains(target)) closeHelp(true);
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && S.help.open) closeHelp();
  });
}

function wireHelpScroll() {
  if (S.helpScrollWired || !window.addEventListener) return;
  S.helpScrollWired = true;
  var last = window.scrollY || 0;
  var queued = false;
  var frame = window.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); };
  window.addEventListener('scroll', function () {
    if (queued) return;
    queued = true;
    frame(function () {
      queued = false;
      var fab = $('help-fab');
      var y = window.scrollY || 0;
      if (fab) {
        var tucked = fab.classList.contains('is-tucked');
        var next = helpTuck(last, y, window.innerHeight, document.documentElement.scrollHeight, S.help.open, tucked);
        if (next !== tucked) fab.classList.toggle('is-tucked', next);
      }
      last = y;
    });
  }, { passive: true });
}

function accountAction(action) {
  toggleAccountMenu(false);
  if (action === 'guide') go('guide');
  if (action === 'password') openPasswordScreen();
  if (action === 'signout') signOut();
}
