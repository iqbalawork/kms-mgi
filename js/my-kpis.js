'use strict';

function monthStateMap() {
  var map = {};
  (S.monthStates || []).forEach(function (m) { map[m.key] = m; });
  return map;
}

function periodOption(y, i, st, current) {
  var key = y + '-' + (i + 1);
  var meta = st ? MONTH_STATES[st.state] || null : null;
  var picked = key === current;
  var sub = st && st.open && st.cutoff ? 'Until ' + shortDate(st.cutoff) : '';
  return '<button type="button" role="option" class="period-option' + (picked ? ' is-current' : '') + '" data-period-key="' + key + '"' +
    ' aria-selected="' + (picked ? 'true' : 'false') + '" tabindex="-1" onclick="MGI.pickPeriod(\'' + key + '\')">' +
    '<span class="material-symbols-outlined period-check" aria-hidden="true">' + (picked ? 'check' : '') + '</span>' +
    '<span class="flex flex-col min-w-0 flex-1">' +
      '<span class="period-name">' + MONTHS[i] + ' ' + y + '</span>' +
      (sub ? '<span class="period-sub">' + esc(sub) + '</span>' : '') +
    '</span>' +
    (meta
      ? '<span class="pill ' + meta.pill + ' period-pill"><span class="material-symbols-outlined text-[14px]" aria-hidden="true">' + meta.icon + '</span>' + meta.label + '</span>'
      : '') +
  '</button>';
}

function myPeriodOptions() {
  var year = S.user.year;
  var trigger = $('emp-month');
  var current = trigger ? String(trigger.value || '') : '';
  var states = monthStateMap();
  var group = function (y, note) {
    var list = MONTHS.map(function (m, i) { return states[y + '-' + (i + 1)] || null; });
    var due = list.filter(function (s) { return s && MONTH_DUE[s.state]; }).length;
    var done = list.filter(function (s) { return s && s.state === 'done'; }).length;
    return '<div class="period-group" role="group" aria-label="FY' + y + note + '">' +
      '<p class="period-group-head" aria-hidden="true"><span>FY' + y + note + '</span>' +
        (due ? '<span>' + done + ' of ' + due + ' submitted</span>' : '') + '</p>' +
      list.map(function (st, i) { return periodOption(y, i, st, current); }).join('') +
    '</div>';
  };
  return group(year, ' (Active)') + (year - 1 >= (S.user.setupYear || year) ? group(year - 1, ' (Previous year)') : '');
}

function renderPeriodPicker() {
  var trigger = $('emp-month');
  if (!trigger || !S.user) return;
  var p = myPeriod();
  var st = monthStateMap()[p.year + '-' + p.month];
  var meta = st ? MONTH_STATES[st.state] || null : null;
  trigger.innerHTML =
    '<span class="w-2.5 h-2.5 rounded-full shrink-0 ' + (meta ? meta.dot : 'bg-slate-300') + '" aria-hidden="true"></span>' +
    '<span class="font-semibold text-text-primary whitespace-nowrap">' + MONTHS[p.month - 1] + ' ' + p.year + '</span>' +
    (meta ? '<span class="sr-only">, ' + meta.label + '</span>' : '') +
    '<span class="material-symbols-outlined text-[18px] text-text-muted" aria-hidden="true">expand_more</span>';
  var pop = $('emp-month-pop');
  if (pop) pop.innerHTML = myPeriodOptions();
  renderAlsoOpen();
}

function otherOpenMonths() {
  var trigger = $('emp-month');
  var current = trigger ? String(trigger.value || '') : '';
  return (S.monthStates || []).filter(function (m) {
    return m.key !== current && m.open && (m.state === 'todo' || m.state === 'progress');
  });
}

function renderAlsoOpen() {
  var host = $('emp-month-also');
  if (!host) return;
  var list = otherOpenMonths();
  host.innerHTML = !list.length ? ''
    : '<button type="button" class="period-also" title="Other open months that still need your submission" onclick="' +
        (list.length === 1 ? 'MGI.pickPeriod(\'' + list[0].key + '\')' : 'MGI.togglePeriodPicker(true)') + '">' +
        '<span class="material-symbols-outlined text-[16px]" aria-hidden="true">notification_important</span>' +
        (list.length === 1 ? 'Also open: ' + MONTHS[list[0].month - 1] + ' ' + list[0].year : list.length + ' other months are open') +
      '</button>';
}

function togglePeriodPicker(force) {
  var pop = $('emp-month-pop');
  var trigger = $('emp-month');
  if (!pop || !trigger) return;
  var open = force === undefined ? pop.classList.contains('hidden') : !!force;
  if (!open) {
    closePeriodPicker();
    return;
  }
  pop.innerHTML = myPeriodOptions();
  pop.classList.remove('hidden');
  trigger.setAttribute('aria-expanded', 'true');
  wirePeriodPicker();
  var picked = pop.querySelector ? pop.querySelector('[aria-selected="true"]') || pop.querySelector('[role="option"]') : null;
  if (!picked) return;
  if (picked.scrollIntoView) picked.scrollIntoView({ block: 'nearest' });
  if (picked.focus) picked.focus();
}

function closePeriodPicker(refocus) {
  var pop = $('emp-month-pop');
  var trigger = $('emp-month');
  if (!pop || pop.classList.contains('hidden')) return;
  pop.classList.add('hidden');
  if (!trigger) return;
  trigger.setAttribute('aria-expanded', 'false');
  if (refocus && trigger.focus) trigger.focus();
}

function pickPeriod(key) {
  var trigger = $('emp-month');
  closePeriodPicker(true);
  if (!trigger || !key || String(trigger.value) === String(key)) return;
  guardUnsaved(function () {
    trigger.value = key;
    renderPeriodPicker();
    loadMyKpis();
  });
}

function onPeriodTriggerKey(ev) {
  if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
  ev.preventDefault();
  togglePeriodPicker(true);
}

function onPeriodPickerKey(ev) {
  var pop = $('emp-month-pop');
  if (!pop) return;
  if (ev.key === 'Escape') {
    ev.preventDefault();
    closePeriodPicker(true);
    return;
  }
  if (ev.key === 'Tab') {
    closePeriodPicker();
    return;
  }
  var steps = { ArrowDown: 1, ArrowUp: -1, Home: 'first', End: 'last' };
  if (!steps.hasOwnProperty(ev.key)) return;
  ev.preventDefault();
  var options = Array.prototype.slice.call(pop.querySelectorAll('[role="option"]'));
  if (!options.length) return;
  var at = options.indexOf(document.activeElement);
  var step = steps[ev.key];
  var next = step === 'first' ? 0
           : step === 'last' ? options.length - 1
           : Math.max(0, Math.min(options.length - 1, at < 0 ? 0 : at + step));
  if (options[next].focus) options[next].focus();
}

function wirePeriodPicker() {
  if (S.periodPickWired) return;
  S.periodPickWired = true;
  document.addEventListener('click', function (ev) {
    var pop = $('emp-month-pop');
    var trigger = $('emp-month');
    var target = ev && ev.target;
    if (!pop || pop.classList.contains('hidden') || !target || target.isConnected === false) return;
    if (target.closest && target.closest('.period-also')) return;
    if ((pop.contains && pop.contains(target)) || (trigger && trigger.contains && trigger.contains(target))) return;
    closePeriodPicker();
  });
}

function myPeriod() {
  var text = String($('emp-month').value || '');
  var parts = text.indexOf('-') > -1 ? text.split('-') : [S.user.year, text];
  var year = parseInt(parts[0], 10);
  var month = parseInt(parts[1], 10);
  return {
    year:  year >= 2000 && year <= 2100 ? year : S.user.year,
    month: month >= 1 && month <= 12 ? month : 1
  };
}

function initMyKpis() {
  var trigger = $('emp-month');

  if (!trigger.dataset.wired) {
    trigger.dataset.wired = '1';
    trigger.value = S.user.year + '-' + (S.user.defaultMonth || new Date().getMonth() + 1);
  }
  renderPeriodPicker();

  renderEmpHero(!S.dashboard);
  loadMyKpis();
  setEmpView(S.empView);
}

function loadMyKpis(keep) {
  Object.keys(S.reports).forEach(function (key) {
    if (key.indexOf(S.user.NIK + '|') === 0) delete S.reports[key];
  });
  var picked = myPeriod();
  var periodKey = picked.year + '-' + picked.month;
  if (S.empMonth !== periodKey) {
    S.empMonth = periodKey;
    S.empCollapsed = {};
    S.empHistoryOpen = false;
  }
  if (!keep) {
    renderEmpHero(true);
    $('emp-roles').innerHTML =
      '<div class="bg-surface-card rounded-xl border border-border-light p-space-lg">' +
        '<div class="skeleton h-6 w-1/3 mb-3"></div><div class="skeleton h-24 w-full"></div>' +
      '</div>';
    $('emp-history').innerHTML = '';
  }

  api('getEmployeeDashboardData', S.user.NIK, picked.year, picked.month)
    .then(function (data) {
      if (S.empMonth !== periodKey) return;
      applyChangeLocks(data);
      S.dashboard = data;
      if (data.months) S.monthStates = data.months;
      S.pendingFiles = keep && keep.files ? keep.files : {};
      renderMyKpis();
      renderPeriodPicker();
      if (keep && keep.drafts) applyDrafts(keep.drafts);
      if (keep && keep.declares) applyDeclares(keep.declares);
      celebrateSubmit();
    })
    .catch(function (err) {
      $('emp-roles').innerHTML =
        '<div class="bg-surface-card rounded-xl border border-border-light p-space-xl text-center text-status-danger">' +
        esc(err.message) + '</div>';
      toast(err.message, 'error');
    });
}

function findRole(key) {
  var roles = (S.dashboard && S.dashboard.roles) || [];
  return roles.filter(function (r) { return r.key === key; })[0] || null;
}

function roleEl(name, key) {
  return document.querySelector('[' + name + '="' + attr(key) + '"]');
}

function roleSlugJs(position, department) {
  return (String(position || '') + ' ' + String(department || ''))
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function longDate(iso) {
  if (!iso) return '-';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.getDate() + ' ' + MONTHS[d.getMonth()];
}

function periodStatusText(ps) {
  if (!ps) return '';
  if (ps.isOpen) return 'Open until ' + fmtDate(ps.cutoff);
  if (ps.rawOpen && ps.expired) return 'Closed on ' + fmtDate(ps.cutoff);
  return 'Not open for submission';
}

function evidenceOptional() {
  return !!(S.dashboard && S.dashboard.evidenceOptional);
}

function roleProgress(role) {
  var due = (role.items || []).filter(function (it) { return it.IsActive !== false && it.InCycle; });
  var filled = due.filter(function (it) { return it.Realization !== null && it.Realization !== undefined && it.Realization !== ''; });
  return { required: due.length, filled: filled.length, evidence: !!role.evidence, evidenceOk: !!role.evidence || evidenceOptional() };
}

function heroState(d) {
  var ps = d.periodState || {};
  var roles = (d.roles || []).filter(function (r) { return !r.inactiveRole; });
  var st = { roles: roles.length, required: 0, filled: 0, evidence: 0 };
  roles.forEach(function (r) {
    var p = roleProgress(r);
    st.required += p.required;
    st.filled += p.filled;
    if (p.evidenceOk) st.evidence++;
  });
  st.missingKpis = st.required - st.filled;
  st.missingFiles = st.roles - st.evidence;
  st.complete = st.roles > 0 && !st.missingKpis && !st.missingFiles;
  st.key = !st.roles ? 'none'
         : ps.isOpen ? (st.complete ? 'done' : 'todo')
         : ps.rawOpen && ps.expired ? 'closed' : 'locked';
  return st;
}

function heroSentence(st, d) {
  var month = MONTHS[d.month - 1];
  var ps = d.periodState || {};
  if (st.key === 'none') return 'Your KPIs for ' + d.year + " aren't set up yet. Please contact HR / Admin.";
  if (st.key === 'done') {
    var lefts = (d.roles || []).filter(function (r) { return !r.inactiveRole; }).map(function (r) { return roleChanges(r).left; });
    var same = lefts.length && lefts.every(function (n) { return n === lefts[0]; });
    var note = same && lefts[0] > 0
      ? ' You can still change ' + (lefts.length > 1 ? 'each role ' : 'it ') + changesWord(lefts[0]) + ' before ' + longDate(ps.cutoff) + '.'
      : '';
    return 'Everything for ' + month + ' is in. Thank you for keeping it on time.' + note;
  }
  if (st.key === 'closed') {
    return month + ' closed on ' + longDate(ps.cutoff) + '. ' +
      (st.complete ? 'Your results are in.' : 'Ask HR / Admin if something needs to change.');
  }
  if (st.key === 'locked') return month + " isn't open for submission right now. You can still review your targets below.";
  var parts = [];
  if (st.missingKpis) parts.push(st.missingKpis + (st.missingKpis === 1 ? ' KPI' : ' KPIs'));
  if (st.missingFiles) parts.push(st.missingFiles + (st.missingFiles === 1 ? ' evidence file' : ' evidence files'));
  var single = parts.length === 1 && (st.missingKpis + st.missingFiles) === 1;
  return month + ' is open until ' + longDate(ps.cutoff) + '. ' + parts.join(' and ') + ' still ' + (single ? 'needs' : 'need') + ' you.';
}

function heroBar(label, done, total) {
  var share = total ? Math.max(0, Math.min(100, done / total * 100)) : 0;
  return '<div>' +
    '<div class="flex items-center justify-between gap-2 text-label-sm">' +
      '<span class="text-text-secondary">' + label + '</span>' +
      '<span class="font-semibold text-text-primary tabular-nums">' + done + ' of ' + total + '</span>' +
    '</div>' +
    '<div class="mt-1.5 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">' +
      '<div class="h-full rounded-full transition-all duration-500 ' + (total && done >= total ? 'bg-status-success' : 'bg-status-info') + '" style="width:' + share + '%"></div>' +
    '</div>' +
  '</div>';
}

function heroCardHtml(st, d) {
  var ps = d.periodState || {};
  var head = HERO_HEADS[st.key];
  var title = st.key === 'todo' ? 'Open until ' + shortDate(ps.cutoff)
            : st.key === 'done' ? 'All submitted'
            : st.key === 'closed' ? 'Closed on ' + shortDate(ps.cutoff)
            : st.key === 'locked' ? 'Not open yet' : 'No KPIs yet';
  var countdown = st.key === 'todo' || st.key === 'done' ? cutoffCountdown(ps.cutoff, Date.now()) : null;
  return '<p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">' + esc(MONTHS[d.month - 1] + ' ' + d.year) + '</p>' +
    '<div class="flex flex-wrap items-center justify-between gap-2">' +
      '<p class="flex items-center gap-2 text-title-lg text-text-primary"><span class="material-symbols-outlined text-[22px] ' + head.tone + '">' + head.icon + '</span>' + esc(title) + '</p>' +
      (countdown ? '<span class="pill pill-' + countdown.tone + ' !text-[11px]"><span class="material-symbols-outlined text-[14px]">' + countdown.icon + '</span>' + countdown.label + '</span>' : '') +
    '</div>' +
    (st.roles
      ? '<div class="flex flex-col gap-3">' +
          heroBar('KPIs filled', st.filled, st.required) +
          (d.evidenceOptional ? '' : heroBar('Evidence', st.evidence, st.roles)) +
        '</div>'
      : '') +
    (st.key === 'todo'
      ? '<button type="button" class="btn btn-primary w-full" onclick="MGI.continueFilling()">Continue filling' +
          '<span class="material-symbols-outlined text-[18px]">arrow_forward</span></button>'
      : st.key === 'done'
        ? '<button type="button" class="btn btn-secondary w-full" onclick="MGI.continueFilling()">' +
            '<span class="material-symbols-outlined text-[18px]">visibility</span> Review my submission</button>'
        : '');
}

function renderEmpHero(loading) {
  var host = $('emp-hero');
  if (!host || !S.user) return;
  var d = loading ? null : S.dashboard;
  var emp = (d && d.employee) || S.user;
  var meta = [emp.Position, emp.Department].filter(Boolean).join(' • ');
  var st = d ? heroState(d) : null;

  host.innerHTML =
    '<section class="emp-hero">' +
      '<div class="emp-hero-main">' +
        '<p class="emp-hero-eyebrow">' + esc(dayGreeting()) + '</p>' +
        '<h1 class="emp-hero-name">' + heroNameHtml(emp.Full_Name) + '</h1>' +
        '<p class="emp-hero-meta">' + esc(meta) + (emp.NIK ? (meta ? ' • ' : '') + 'NIK ' + esc(emp.NIK) : '') + '</p>' +
        '<p class="emp-hero-line">' + (st ? esc(heroSentence(st, d)) : '<span class="skeleton inline-block h-4 w-full max-w-md align-middle"></span>') + '</p>' +
        (d && d.theme
          ? '<p class="emp-hero-theme"><span class="material-symbols-outlined text-[16px]">flag</span>FY' + esc(d.year) + ' • ' + esc(d.theme) + '</p>'
          : '') +
      '</div>' +
      '<aside class="emp-hero-card" aria-live="polite">' +
        (st ? heroCardHtml(st, d)
            : '<div class="skeleton h-3 w-28"></div><div class="skeleton h-6 w-40"></div><div class="skeleton h-12 w-full"></div><div class="skeleton h-10 w-full"></div>') +
      '</aside>' +
    '</section>';
}

function continueFilling() {
  var d = S.dashboard;
  if (!d) return;
  setEmpView('monthly');
  var roles = (d.roles || []).filter(function (r) { return !r.inactiveRole; });
  var target = roles.filter(function (r) {
    var p = roleProgress(r);
    return p.filled < p.required || !p.evidenceOk;
  })[0] || roles[0];
  if (!target) return;
  if (S.empCollapsed[target.key]) toggleEmpRole(target.key);
  var section = roleEl('data-role-section', target.key);
  if (section && section.scrollIntoView) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  var empty = target.items.filter(function (it) {
    return it.Editable && (it.Realization === null || it.Realization === undefined || it.Realization === '');
  })[0];
  var input = empty ? document.querySelector('input[data-mapping="' + attr(empty.Mapping_ID) + '"]') : null;
  if (input && input.focus) setTimeout(function () { input.focus({ preventScroll: true }); }, 400);
}

function renderMyKpis() {
  var d = S.dashboard;
  var s = d.summary;

  renderEmpHero();

  var groups = s.roleGroups || [];
  var bad = groups.filter(function (g) { return !g.valid; });

  var strip = $('emp-weight-strip');

  if (!bad.length) {
    strip.classList.add('hidden');
    strip.innerHTML = '';
  } else {
    strip.classList.remove('hidden');
    strip.innerHTML =
      '<div class="rounded-xl border border-red-200 bg-status-danger-subtle p-space-md flex items-start gap-space-sm">' +
        '<span class="material-symbols-outlined text-status-danger text-[22px] shrink-0">error</span>' +
        '<div class="min-w-0">' +
          '<p class="text-title-md text-status-danger-text">Some role weights don\'t add up to 100%</p>' +
          '<p class="text-body-sm text-text-secondary">Please let HR / Admin know, so your index is calculated correctly.</p>' +
          '<div class="flex flex-wrap gap-2 mt-space-sm">' +
            bad.map(function (g) {
              return '<span class="pill pill-danger !text-[11px]">' + esc(g.label) + ' ' + g.percent + '%</span>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>';
  }

  var roles = d.roles || [];

  if (!roles.length) {
    var hasHistory = (d.history || []).length > 0;
    $('emp-roles').innerHTML =
      '<div class="bg-surface-card rounded-xl shadow-level-1 border border-border-light p-space-2xl text-center">' +
        '<span class="material-symbols-outlined text-[40px] text-text-muted">inbox</span>' +
        '<p class="text-body-md text-text-secondary mt-2">' +
          (hasHistory
            ? 'No active KPIs this month.'
            : 'Your KPIs for ' + d.year + " aren't set up yet.") + '</p>' +
        '<p class="text-body-sm text-text-muted">' +
          (hasHistory ? 'Your earlier KPIs are in History below.' : 'Please contact HR / Admin, and they will map them for you.') +
        '</p>' +
      '</div>';
  } else {
    $('emp-roles').innerHTML = roles.map(roleSection).join('');
    roles.forEach(function (r) {
      wireDropzone(r.key);
      renderTableFooter(r.key);
      renderEvidence(r.key);
    });
  }

  renderEmpHistory();
  renderSubmitState();
}

function roleSection(r) {
  var d = S.dashboard;
  var key = esc(r.key);
  var multi = (d.roles || []).length > 1;
  var collapsed = !!S.empCollapsed[r.key];
  var readOnly = !!r.inactiveRole;
  var scored = r.items.some(function (it) { return isNum(it.Score); });
  var progress = roleProgress(r);
  var changes = roleChanges(r);
  var open = !!(d.periodState && d.periodState.isOpen);
  var changeLocked = !readOnly && open && roleChangeLocked(r);
  var support = helpSupport();
  var changeChip = readOnly || !open || !changes.submitted ? ''
    : changeLocked
      ? '<span class="pill pill-neutral !text-[11px]" title="Only HR / Admin can allow another change this month"><span class="material-symbols-outlined text-[14px]">lock</span>No changes left</span>'
      : '<span class="pill ' + (changes.left === 1 ? 'pill-warning' : 'pill-neutral') + ' !text-[11px]" title="Every new submission after the first uses one change">' +
          '<span class="material-symbols-outlined text-[14px]">history</span>' + plural(changes.left, 'change') + ' left</span>';
  var stage = !progress.required && !progress.evidence ? null
            : progress.filled >= progress.required && progress.evidenceOk ? ['pill-success', 'check_circle', 'Submitted']
            : progress.filled || progress.evidence ? ['pill-info', 'pending', 'In progress']
            : ['pill-neutral', 'radio_button_unchecked', 'Not started'];
  var fileBase = d.period + '_' + d.employee.NIK + '_' + roleSlugJs(r.position, r.department);
  var accept = S.user.allowedExt.map(function (e) { return '.' + e; }).join(',');
  var tags = S.user.allowedExt.map(function (e) {
    return '<span class="pill pill-neutral !text-[11px]">' + e.toUpperCase() + '</span>';
  }).join('') + '<span class="pill pill-neutral !text-[11px]">Max ' + S.user.maxFileMb + ' MB</span>';

  var head =
    '<div class="role-group-head !px-space-lg !py-space-md" onclick="MGI.toggleEmpRole(\'' + key + '\')"' +
      ' title="Click to expand or collapse this role">' +
      '<span class="material-symbols-outlined text-[22px] text-text-secondary" data-chevron>' +
        (collapsed ? 'expand_more' : 'expand_less') + '</span>' +
      '<span class="material-symbols-outlined text-[22px] ' + (readOnly ? 'text-text-muted' : 'text-primary-container') + '">work</span>' +
      '<h2 class="text-title-lg ' + (readOnly ? 'text-text-secondary' : 'text-text-primary') + '">' + esc(r.label) + '</h2>' +
      (readOnly
        ? '<span class="pill pill-neutral !text-[11px]">Inactive Role</span>'
        : multi
          ? (r.isHome
              ? '<span class="pill pill-neutral !text-[11px]">Home Role</span>'
              : '<span class="pill pill-maroon !text-[11px]">Additional Role</span>')
          : '') +
      (readOnly || r.valid ? '' : '<span class="pill pill-danger" title="The KPI weights of this role do not add up to 100%">Weight ' + r.percent + '%</span>') +
      '<span class="ml-auto flex flex-wrap items-center gap-space-sm">' +
        '<span class="text-label-xs text-text-muted">' + (readOnly
          ? r.count + (r.count === 1 ? ' KPI' : ' KPIs')
          : progress.required ? progress.filled + ' of ' + progress.required + ' filled' : 'No KPI due this month') + '</span>' +
        (!readOnly && stage ? '<span class="pill ' + stage[0] + ' !text-[11px]"><span class="material-symbols-outlined text-[14px]">' + stage[1] + '</span>' + stage[2] + '</span>' : '') +
        changeChip +
        (scored ? '<span class="pill pill-' + band(r.index).key + '">Index ' + num(r.index) + '</span>' : '') +
      '</span>' +
    '</div>';

  var table =
    (readOnly
      ? '<div class="mx-space-lg mt-space-md mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm bg-slate-50 text-slate-600">' +
          '<span class="material-symbols-outlined text-[20px] shrink-0">lock</span>' +
          '<span>This role is inactive. Data for this period is shown as history and cannot be changed.</span>' +
        '</div>'
      : '') +
    (changeLocked
      ? '<div class="mx-space-lg mt-space-md mb-4 flex flex-wrap items-center gap-x-2 gap-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">' +
          '<span class="material-symbols-outlined text-[20px] shrink-0">lock</span>' +
          '<span class="min-w-0 flex-1">You have used ' + (changes.allowed === 2 ? 'both changes' : 'all ' + changes.allowed + ' changes') + ' for ' + esc(MONTHS[d.month - 1]) +
            '. If something still needs to change, ask HR / Admin.</span>' +
          (support
            ? '<button type="button" data-help-open class="help-ask" onclick="MGI.openHelp(\'change\', \'' + key + '\')">' +
                waIcon('w-4 h-4 text-[#128C7E]') + 'Ask ' + esc(support.name) + '</button>'
            : '') +
        '</div>'
      : '') +
    '<div class="table-scroll">' +
      '<table class="data-table kpi-input-table table-fixed w-full min-w-[1044px]">' +
        '<thead><tr>' +
          '<th class="w-12 text-center">No</th>' +
          '<th>KPI Code &amp; Name</th>' +
          '<th class="w-[72px] text-center">Weight</th>' +
          '<th class="kpi-unit w-[100px] text-center">Unit</th>' +
          '<th class="w-28 text-center">Duration</th>' +
          '<th class="w-[116px] 2xl:w-[176px] text-center">Target</th>' +
          '<th class="w-[212px] 2xl:w-[288px]"><span class="inline-flex items-center gap-1 text-primary-container">' +
            '<span class="material-symbols-outlined text-[16px]">edit</span> Realization (Input)</span></th>' +
          '<th class="w-[208px] text-right">Status / Achievement</th>' +
        '</tr></thead>' +
        '<tbody>' + r.items.map(rowMyKpi).join('') + '</tbody>' +
      '</table>' +
    '</div>' +
    '<div class="p-space-md bg-surface-page border-t border-border-light flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm" data-role-footer="' + key + '"></div>';

  var dropzone = readOnly || changeLocked ? '' :
    '<div class="dropzone flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-5 text-left" data-role-dropzone="' + key + '">' +
      '<span class="w-10 h-10 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0">' +
        '<span class="material-symbols-outlined text-primary-container text-[22px]">cloud_upload</span>' +
      '</span>' +
      '<div class="min-w-0 flex-1">' +
        '<p class="text-sm font-medium text-slate-900">Drag &amp; drop a file here, or ' +
          '<span class="text-primary-container font-semibold underline underline-offset-2">click to browse</span></p>' +
        '<p class="text-xs text-slate-500 mt-0.5">Upload 1 file with all KPI evidence for this role for ' +
          esc(MONTHS[d.month - 1]) + ' ' + d.year + '.' + (d.evidenceOptional ? ' Optional for FY' + d.year + '.' : '') + '</p>' +
      '</div>' +
      '<div class="flex flex-wrap gap-1.5 shrink-0">' + tags + '</div>' +
      '<input type="file" class="hidden" data-role-file="' + key + '" accept="' + esc(accept) + '">' +
    '</div>';

  var evidence =
    '<div class="p-space-lg border-t border-border-light no-print">' +
      '<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm' + (readOnly ? '' : ' mb-space-md') + '">' +
        '<div class="min-w-0">' +
          '<h3 class="text-title-md text-text-primary">Evidence Document: ' + esc(r.label) + '</h3>' +
          (readOnly ? '' :
            '<p class="text-body-sm text-text-muted mt-0.5">One combined file per month for this role. Automatic file name: ' +
            '<span class="font-semibold text-text-secondary break-all">' + esc(fileBase) + '</span></p>') +
        '</div>' +
        '<span data-role-evstatus="' + key + '"></span>' +
      '</div>' +
      dropzone +
      '<div class="hidden mt-space-md" data-role-preview="' + key + '"></div>' +
    '</div>';

  var receipt = readOnly ? '' :
    '<div class="hidden p-space-lg border-t border-border-light no-print" data-role-receipt="' + key + '"></div>';

  var submit = readOnly || changeLocked ? '' :
    '<div class="p-space-lg border-t border-border-light bg-surface-page flex flex-col lg:flex-row lg:items-center justify-between gap-space-md no-print" data-role-form="' + key + '">' +
      '<div class="flex flex-col gap-space-xs min-w-0">' +
        '<div class="flex flex-wrap items-center gap-1.5 mb-1" data-role-steps="' + key + '"></div>' +
        '<label class="flex items-start gap-space-sm cursor-pointer">' +
          '<input type="checkbox" class="mt-0.5 w-4 h-4 rounded border-border-medium text-primary-container focus:ring-primary-container" data-role-declare="' + key + '"' +
            ' onchange="MGI.onDeclareChange(\'' + key + '\')">' +
          '<span class="text-body-sm text-text-secondary leading-relaxed">I declare that the realization data and supporting documents for the <strong>' +
            esc(r.label) + '</strong> role are valid, match the field operational records, and can be accounted for to the Management of PT Macme Global Indonesia.</span>' +
        '</label>' +
        '<p class="text-body-sm text-text-muted flex items-center gap-1.5 pl-6" data-role-hint="' + key + '"></p>' +
      '</div>' +
      '<div class="flex flex-col-reverse sm:flex-row sm:items-center gap-space-sm shrink-0 w-full lg:w-auto">' +
        '<button type="button" class="btn btn-secondary hidden" data-role-discard="' + key + '"' +
          ' onclick="MGI.discardRoleChanges(\'' + key + '\')" title="Go back to the values and file you last submitted">' +
          '<span class="material-symbols-outlined text-[18px]">undo</span> Discard changes</button>' +
        '<button class="btn btn-primary px-space-lg py-3 w-full lg:w-auto" data-role-submit="' + key + '"' +
          ' onclick="MGI.submitRole(\'' + key + '\')">' +
          '<span class="material-symbols-outlined text-[18px]">send</span> <span data-role-submit-label="' + key + '">Submit ' + esc(r.label) + '</span>' +
        '</button>' +
      '</div>' +
    '</div>';

  return '<section class="role-group shadow-level-1 shrink-0 !mt-0 scroll-mt-36' + (collapsed ? ' is-collapsed' : '') + '" data-role-section="' + key + '">' +
    head +
    '<div class="role-group-body !p-0 !gap-0">' + table + evidence + receipt + submit + '</div>' +
  '</section>';
}

function renderEmpHistory() {
  var host = $('emp-history');
  var list = (S.dashboard && S.dashboard.history) || [];
  if (!list.length) { host.innerHTML = ''; return; }

  var open = !!S.empHistoryOpen;

  host.innerHTML =
    '<section class="role-group role-history shadow-level-1 shrink-0 !mt-0' + (open ? '' : ' is-collapsed') + '" data-emp-history>' +
      '<div class="role-group-head !px-space-lg !py-space-md" onclick="MGI.toggleEmpHistory()" title="Click to expand or collapse history">' +
        '<span class="material-symbols-outlined text-[22px] text-text-secondary" data-chevron>' +
          (open ? 'expand_less' : 'expand_more') + '</span>' +
        '<span class="material-symbols-outlined text-[22px] text-text-muted">history</span>' +
        '<h2 class="text-title-lg text-text-secondary">KPI History (Inactive)</h2>' +
        '<span class="pill pill-neutral !text-[11px]">' + list.length + ' KPI</span>' +
        '<span class="ml-auto text-label-xs text-text-muted">Read only</span>' +
      '</div>' +
      '<div class="role-group-body !p-0 !gap-0">' +
        '<div class="mx-space-lg mt-space-md mb-4 flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">' +
          '<span class="material-symbols-outlined text-[20px] shrink-0">history</span>' +
          '<span>KPIs from previous roles that Admin / HR deactivated and that have no data for this period.</span>' +
        '</div>' +
        '<div class="table-scroll">' +
          '<table class="data-table min-w-[860px]">' +
            '<thead><tr>' +
              '<th class="min-w-[260px]">KPI Code &amp; Name</th>' +
              '<th>Role</th>' +
              '<th class="text-center">Weight</th>' +
              '<th class="text-center">Target</th>' +
              '<th class="text-center">Unit</th>' +
              '<th class="text-center">Duration</th>' +
              '<th class="text-right">Last Submitted</th>' +
            '</tr></thead>' +
            '<tbody>' +
              list.map(function (h) {
                var last = 'Never';
                if (h.lastPeriod) {
                  var pp = h.lastPeriod.split('_');
                  var mm = MONTHS[parseInt(pp[1], 10) - 1];
                  last = mm ? mm + ' ' + pp[0] : h.lastPeriod;
                }
                return '<tr class="kpi-inactive">' +
                  '<td><div class="flex flex-col">' +
                    '<div class="flex items-center gap-2 flex-wrap">' +
                      '<span class="text-label-xs font-bold text-text-secondary bg-surface-page px-2 py-0.5 rounded border border-border-light">' +
                        esc(h.KPI_ID) + '</span>' +
                      '<span class="text-label-md text-text-primary font-semibold">' + esc(h.KPI_Name) + '</span>' +
                    '</div>' +
                    (h.Metrics ? '<span class="text-body-sm text-text-muted mt-1">' + esc(h.Metrics) + '</span>' : '') +
                  '</div></td>' +
                  '<td><span class="whitespace-nowrap text-label-sm text-text-secondary">' + esc(h.RoleLabel) + '</span></td>' +
                  '<td class="text-center text-code-num">' + pct(h.WeightPercent) + '</td>' +
                  '<td class="text-center text-code-num">' + esc(targetLabel(h)) + '</td>' +
                  '<td class="text-center text-label-xs">' + esc(h.Unit || '-') + '</td>' +
                  '<td class="text-center">' + durationPill(h.Duration) + '</td>' +
                  '<td class="text-right text-label-sm text-text-secondary whitespace-nowrap">' + esc(last) + '</td>' +
                '</tr>';
              }).join('') +
            '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
    '</section>';
}

function toggleEmpRole(key) {
  S.empCollapsed[key] = !S.empCollapsed[key];
  var sec = roleEl('data-role-section', key);
  if (!sec) return;
  sec.classList.toggle('is-collapsed', !!S.empCollapsed[key]);
  var chev = sec.querySelector('[data-chevron]');
  if (chev) chev.textContent = S.empCollapsed[key] ? 'expand_more' : 'expand_less';
}

function toggleEmpHistory() {
  S.empHistoryOpen = !S.empHistoryOpen;
  var sec = document.querySelector('[data-emp-history]');
  if (!sec) return;
  sec.classList.toggle('is-collapsed', !S.empHistoryOpen);
  var chev = sec.querySelector('[data-chevron]');
  if (chev) chev.textContent = S.empHistoryOpen ? 'expand_less' : 'expand_more';
}

function statCard(label, icon, valueClass, value, valueSuffix, caption, barClass, barPct) {
  return '' +
    '<div class="bg-surface-card rounded-xl p-5 shadow-level-1 border border-border-light flex flex-col justify-between transition-all duration-150 hover:shadow-level-2">' +
      '<div class="flex items-center justify-between gap-3 mb-3">' +
        '<span class="text-sm font-medium text-slate-500">' + esc(label) + '</span>' +
        '<div class="w-9 h-9 rounded-lg bg-slate-50 ring-1 ring-slate-200/70 flex items-center justify-center text-slate-600">' +
          '<span class="material-symbols-outlined text-[20px]">' + icon + '</span>' +
        '</div>' +
      '</div>' +
      '<div>' +
        '<div class="flex items-baseline gap-2 flex-wrap">' +
          '<span class="text-[28px] leading-9 font-bold tracking-tight ' + valueClass + '">' + value + '</span>' +
          (valueSuffix ? '<span class="text-sm font-medium text-slate-500">' + esc(valueSuffix) + '</span>' : '') +
        '</div>' +
        '<p class="text-body-sm text-text-muted mt-1">' + caption + '</p>' +
      '</div>' +
      (barClass
        ? '<div class="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">' +
            '<div class="' + barClass + ' h-full rounded-full transition-all duration-500" style="width:' +
              Math.max(0, Math.min(100, barPct)) + '%"></div>' +
          '</div>'
        : '<div class="h-1.5 mt-4" aria-hidden="true"></div>') +
    '</div>';
}

function durationPill(duration, compact) {
  var quarterly = String(duration || '').toLowerCase() === 'quarterly';
  return '<span class="pill ' + (quarterly ? 'pill-info' : 'pill-neutral') +
    (compact ? ' !py-0 !px-2 !text-[11px]' : ' !text-[11px]') + '"' +
    ' title="' + (quarterly ? 'Filled at the end of each quarter' : 'Filled every month') + '">' +
    '<span class="material-symbols-outlined ' + (compact ? 'text-[12px]' : 'text-[14px]') + '">' +
      (quarterly ? 'date_range' : 'event_repeat') + '</span>' +
    esc(duration || 'Monthly') + '</span>';
}
