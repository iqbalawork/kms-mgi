'use strict';

function isReportViewer(user) {
  var u = user || S.user;
  return !!u && !u.isAdmin && u.reportScope !== null && u.reportScope !== undefined;
}

function userRoleLabel(user) {
  if (user.isAdmin) return 'Admin';
  return isReportViewer(user) ? 'Report Viewer' : (user.Role || 'Employee');
}

function renderScopeBanner(id, scope) {
  var host = $(id);
  if (!host) return;
  host.innerHTML = scope
    ? '<div class="rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-2.5 text-body-sm text-blue-800 flex items-center gap-2">' +
        '<span class="material-symbols-outlined text-[18px]">filter_alt</span>' +
        '<span>Showing <strong>' + esc(scope) + '</strong> division only. Your report access is limited to this division.</span></div>'
    : '';
}

function themeBannerHtml(year, theme) {
  if (!theme) return '';
  return '<div class="theme-banner">' +
    '<span class="theme-banner-icon"><span class="material-symbols-outlined text-[20px]">flag</span></span>' +
    '<div class="min-w-0">' +
      '<p class="theme-banner-label">FY' + esc(year) + ' Theme</p>' +
      '<p class="theme-banner-text">' + esc(theme) + '</p>' +
    '</div>' +
  '</div>';
}

function renderThemeSlot(id, year, theme) {
  var host = $(id);
  if (host) host.innerHTML = themeBannerHtml(year, theme);
}

function loadReportAccess() {
  if (!$('access-control')) return;
  if (!S.reportAccess) $('access-control').innerHTML = '<div class="skeleton h-56 w-full"></div>';
  api('getReportAccess')
    .then(function (data) {
      S.reportAccess = data;
      renderReportAccess();
    })
    .catch(function (err) {
      $('access-control').innerHTML = loadErrorHtml(err.message, 'loadReportAccess');
      toast(err.message, 'error');
    });
}

function accessState() {
  if (!S.access) S.access = { q: '', division: '', department: '', position: '', scope: '', scopeTouched: false, picked: {}, viewerQ: '' };
  return S.access;
}

function scopeOptions(selected) {
  var d = S.reportAccess;
  return '<option value=""' + (!selected ? ' selected' : '') + '>All divisions</option>' + (d ? d.divisions : []).map(function (div) {
    return '<option value="' + esc(div) + '"' + (div === selected ? ' selected' : '') + '>' + esc(div) + ' only</option>';
  }).join('');
}

function accessMatches(u, a, skip) {
  if (skip !== 'division' && a.division && u.Division !== a.division) return false;
  if (skip !== 'department' && a.department && u.Department !== a.department) return false;
  if (skip !== 'position' && a.position && u.Position !== a.position) return false;
  if (skip !== 'q' && a.q) {
    var q = a.q.trim().toLowerCase();
    if ((u.Full_Name + ' ' + u.NIK).toLowerCase().indexOf(q) === -1) return false;
  }
  return true;
}

function accessCandidates() {
  var a = accessState();
  return (S.reportAccess ? S.reportAccess.candidates : []).filter(function (u) { return accessMatches(u, a); });
}

function accessFacet(field, skip) {
  var a = accessState();
  var seen = {};
  (S.reportAccess ? S.reportAccess.candidates : []).forEach(function (u) {
    if (!accessMatches(u, a, skip) || !u[field]) return;
    seen[u[field]] = true;
  });
  return Object.keys(seen).sort();
}

function accessSelect(id, label, field, key) {
  var a = accessState();
  var list = accessFacet(field, key);
  if (a[key] && list.indexOf(a[key]) === -1) list.unshift(a[key]);
  return '<div class="min-w-0"><label class="form-label" for="' + id + '">' + label + '</label>' +
    '<select id="' + id + '" class="field" onchange="MGI.onAccessFilter(\'' + key + '\', this.value)">' +
      '<option value="">All ' + label.toLowerCase() + 's</option>' +
      list.map(function (v) { return '<option value="' + esc(v) + '"' + (v === a[key] ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join('') +
    '</select></div>';
}

function renderReportAccess() {
  var d = S.reportAccess;
  if (!d || !$('access-control')) return;
  var a = accessState();
  var wide = d.viewers.filter(function (u) { return !u.scope; }).length;

  $('access-control').innerHTML =
    '<div class="flex flex-col gap-space-lg">' +
      '<div class="flex flex-col lg:flex-row lg:items-end justify-between gap-space-sm">' +
        '<div class="min-w-0">' +
          '<h2 class="text-title-lg text-text-primary">Report Access</h2>' +
          '<p class="text-body-sm text-text-muted max-w-4xl">Give selected employees read-only access to the Dashboard and Summary Report, for every division or one division. ' +
            'They can open each employee report and export CSV, see Performance Scores and SP only after release, and never change any data.</p>' +
        '</div>' +
        '<div class="flex flex-wrap items-center gap-1.5 shrink-0">' +
          '<span class="pill pill-neutral !text-[11px]">' + d.viewers.length + (d.viewers.length === 1 ? ' viewer' : ' viewers') + '</span>' +
          '<span class="pill pill-info !text-[11px]">Every division: ' + wide + '</span>' +
          '<span class="pill pill-neutral !text-[11px]">One division: ' + (d.viewers.length - wide) + '</span>' +
        '</div>' +
      '</div>' +

      '<section class="rounded-xl border border-border-light overflow-hidden">' +
        '<div class="px-space-md py-space-sm bg-surface-page border-b border-border-light flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">' +
          '<h3 class="text-title-md text-text-primary">Report viewers</h3>' +
          '<div class="relative sm:w-72">' +
            '<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px] pointer-events-none">search</span>' +
            '<input type="search" class="field !pl-10 !py-1.5" aria-label="Search viewers" placeholder="Search viewers" value="' + esc(a.viewerQ) + '" oninput="MGI.onViewerSearch(this.value)">' +
          '</div>' +
        '</div>' +
        '<div id="access-viewers" class="table-scroll"></div>' +
      '</section>' +

      '<section class="rounded-xl border border-border-light overflow-hidden">' +
        '<div class="px-space-md py-space-sm bg-surface-page border-b border-border-light flex items-center justify-between gap-space-sm">' +
          '<h3 class="text-title-md text-text-primary">Grant access</h3>' +
          '<span class="pill pill-neutral !text-[11px]">' + d.candidates.length + ' eligible</span>' +
        '</div>' +
        '<div id="access-filters" class="px-space-md py-space-sm border-b border-border-light"></div>' +
        '<div id="access-actions" class="px-space-md py-2.5 border-b border-border-light bg-white flex flex-wrap items-center gap-x-space-md gap-y-2"></div>' +
        '<div id="access-candidates" class="access-list"></div>' +
        '<p id="access-count" class="px-space-md py-2 text-label-xs text-text-muted bg-surface-page border-t border-border-light"></p>' +
      '</section>' +
    '</div>';

  renderAccessViewers();
  renderAccessFilters();
  renderAccessCandidates();
}

function renderAccessViewers() {
  var host = $('access-viewers');
  var d = S.reportAccess;
  if (!host || !d) return;
  var q = (accessState().viewerQ || '').trim().toLowerCase();
  var list = d.viewers.filter(function (u) {
    return !q || (u.Full_Name + ' ' + u.NIK + ' ' + (u.Position || '') + ' ' + (u.Department || '') + ' ' + (u.Division || '')).toLowerCase().indexOf(q) > -1;
  });
  if (!d.viewers.length) {
    host.innerHTML = '<p class="px-space-md py-space-lg text-center text-body-sm text-text-muted">Nobody outside Admin / HR can open the reports yet. Grant access below.</p>';
    return;
  }
  host.innerHTML =
    '<table class="data-table text-body-sm min-w-[640px]">' +
      '<thead><tr><th class="min-w-[240px]">Employee</th><th class="w-52">Access scope</th><th>Granted</th><th class="text-right">Action</th></tr></thead>' +
      '<tbody>' + (list.length ? list.map(function (u) {
        return '<tr>' +
          '<td><div class="flex items-center gap-space-sm min-w-0"><span class="emp-avatar">' + esc(u.Initials || initials(u.Full_Name)) + '</span>' +
            '<div class="flex flex-col min-w-0"><span class="font-semibold text-text-primary truncate">' + esc(u.Full_Name) + '</span>' +
            '<span class="text-label-xs text-text-secondary">' + esc([u.Position, u.Department].filter(Boolean).join(' / ') || '-') + '</span>' +
            '<span class="text-[11px] text-text-muted">' + esc(u.NIK) + (u.Division ? ' • ' + esc(u.Division) : '') + (u.Is_Active ? '' : ' • Inactive') + '</span></div></div></td>' +
          '<td><select class="field !py-1 !text-label-sm" aria-label="Report scope for ' + esc(u.Full_Name) + '"' +
            ' onchange="MGI.setViewerScope(\'' + esc(u.NIK) + '\', this.value)">' + scopeOptions(u.scope) + '</select></td>' +
          '<td class="text-label-xs text-text-muted"><span class="whitespace-nowrap">' + esc(fmtDate(u.grantedAt)) + '</span>' + (u.grantedBy ? '<span class="block">by ' + esc(u.grantedBy) + '</span>' : '') + '</td>' +
          '<td class="text-right"><button type="button" class="btn btn-secondary !py-1 !px-2.5 !text-label-sm" onclick="MGI.removeViewer(\'' + esc(u.NIK) + '\')">' +
            '<span class="material-symbols-outlined text-[16px]">person_remove</span> Remove</button></td>' +
        '</tr>';
      }).join('') : '<tr><td colspan="4" class="text-center text-text-muted py-space-lg">No viewer matches your search.</td></tr>') + '</tbody>' +
    '</table>';
}

function renderAccessFilters() {
  var host = $('access-filters');
  if (!host) return;
  var a = accessState();
  host.innerHTML =
    '<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))_auto] gap-space-sm items-end">' +
      '<div class="min-w-0"><label class="form-label" for="access-q">Search</label>' +
        '<div class="relative"><span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px] pointer-events-none">search</span>' +
        '<input id="access-q" type="search" class="field !pl-10" placeholder="Name or NIK" value="' + esc(a.q) + '" oninput="MGI.onAccessFilter(\'q\', this.value)"></div></div>' +
      accessSelect('access-division', 'Division', 'Division', 'division') +
      accessSelect('access-department', 'Department', 'Department', 'department') +
      accessSelect('access-position', 'Position', 'Position', 'position') +
      '<button type="button" class="btn btn-secondary" onclick="MGI.resetAccessFilters()" title="Clear every filter">' +
        '<span class="material-symbols-outlined text-[18px]">filter_alt_off</span> Reset</button>' +
    '</div>';
}

function renderAccessCandidates() {
  var host = $('access-candidates');
  var d = S.reportAccess;
  if (!host || !d) return;
  var a = accessState();
  var list = accessCandidates();
  var shownPicked = list.filter(function (u) { return a.picked[u.NIK]; }).length;
  var allPicked = list.length > 0 && shownPicked === list.length;
  var picked = Object.keys(a.picked).length;

  host.innerHTML = !d.candidates.length
    ? '<p class="px-space-md py-space-lg text-center text-body-sm text-text-muted">Every active employee already has report access.</p>'
    : !list.length
      ? '<p class="px-space-md py-space-lg text-center text-body-sm text-text-muted">No employees match these filters.</p>'
      : '<table class="data-table text-body-sm min-w-[760px]">' +
          '<thead><tr>' +
            '<th class="w-10"><input type="checkbox" class="rounded border-border-medium" aria-label="Select every employee shown"' + (allPicked ? ' checked' : '') +
              ' onchange="MGI.toggleAccessAll()"></th>' +
            '<th>Employee</th><th>Position</th><th>Department</th><th>Division</th>' +
          '</tr></thead>' +
          '<tbody>' + list.map(function (u) {
            var on = !!a.picked[u.NIK];
            return '<tr class="cursor-pointer' + (on ? ' access-picked' : '') + '" onclick="MGI.toggleAccessPick(\'' + esc(u.NIK) + '\')">' +
              '<td><input type="checkbox" class="rounded border-border-medium" aria-label="Select ' + esc(u.Full_Name) + '"' + (on ? ' checked' : '') +
                ' onclick="event.stopPropagation()" onchange="MGI.toggleAccessPick(\'' + esc(u.NIK) + '\')"></td>' +
              '<td><div class="flex items-center gap-space-sm min-w-0"><span class="emp-avatar">' + esc(u.Initials || initials(u.Full_Name)) + '</span>' +
                '<div class="flex flex-col min-w-0"><span class="font-semibold text-text-primary truncate">' + esc(u.Full_Name) + '</span>' +
                '<span class="text-label-xs text-text-muted">' + esc(u.NIK) + '</span></div></div></td>' +
              '<td class="text-text-secondary">' + esc(u.Position || '-') + '</td>' +
              '<td class="text-text-secondary">' + esc(u.Department || '-') + '</td>' +
              '<td class="text-text-secondary">' + esc(u.Division || '-') + '</td>' +
            '</tr>';
          }).join('') + '</tbody>' +
        '</table>';

  $('access-count').textContent = 'Showing ' + list.length + ' of ' + d.candidates.length + ' eligible employees' +
    (picked ? ' • ' + picked + ' selected' + (picked > shownPicked ? ' (' + (picked - shownPicked) + ' outside these filters)' : '') : '');
  $('access-actions').innerHTML =
    '<span class="text-body-sm font-semibold text-text-primary">' + picked + ' selected</span>' +
    (picked ? '<button type="button" class="text-label-sm font-semibold text-primary-container hover:underline" onclick="MGI.clearAccessPicks()">Clear selection</button>' : '') +
    '<label class="ml-auto flex items-center gap-2 text-body-sm text-text-secondary">Access to' +
      '<select id="access-scope" class="field !w-auto !py-1.5 !text-label-sm" onchange="MGI.setAccessScope(this.value)">' + scopeOptions(a.scope) + '</select></label>' +
    '<button id="access-grant" type="button" class="btn btn-primary !py-1.5"' + (picked ? '' : ' disabled') + ' onclick="MGI.grantSelectedAccess()">' +
      '<span class="material-symbols-outlined text-[18px]">visibility</span> Grant access' + (picked ? ' (' + picked + ')' : '') + '</button>';
}

function onAccessFilter(key, value) {
  var a = accessState();
  a[key] = value || '';
  if (key === 'division') {
    a.department = '';
    a.position = '';
    if (!a.scopeTouched) a.scope = a.division;
  }
  if (key === 'department') a.position = '';
  if (key !== 'q') renderAccessFilters();
  renderAccessCandidates();
}

function resetAccessFilters() {
  var a = accessState();
  a.q = '';
  a.division = '';
  a.department = '';
  a.position = '';
  if (!a.scopeTouched) a.scope = '';
  renderAccessFilters();
  renderAccessCandidates();
}

function toggleAccessPick(nik) {
  var a = accessState();
  if (a.picked[nik]) delete a.picked[nik];
  else a.picked[nik] = true;
  renderAccessCandidates();
}

function toggleAccessAll() {
  var a = accessState();
  var list = accessCandidates();
  var all = list.length > 0 && list.every(function (u) { return a.picked[u.NIK]; });
  list.forEach(function (u) {
    if (all) delete a.picked[u.NIK];
    else a.picked[u.NIK] = true;
  });
  renderAccessCandidates();
}

function clearAccessPicks() {
  accessState().picked = {};
  renderAccessCandidates();
}

function setAccessScope(value) {
  var a = accessState();
  a.scope = value || '';
  a.scopeTouched = true;
}

function onViewerSearch(value) {
  accessState().viewerQ = value;
  renderAccessViewers();
}

function saveReportAccess(call, args) {
  return api.apply(null, [call].concat(args))
    .then(function (res) {
      toast(res.message, res.success === false ? 'warning' : 'success');
      loadReportAccess();
      return res;
    })
    .catch(function (err) {
      toast(err.message, 'error');
      loadReportAccess();
    });
}

function grantSelectedAccess() {
  var a = accessState();
  var niks = Object.keys(a.picked);
  if (!niks.length) return;
  var button = $('access-grant');
  if (button) button.disabled = true;
  return api('grantReportAccess', niks, a.scope || 'All')
    .then(function (res) {
      a.picked = {};
      toast(res.message, res.success === false || (res.skipped && res.skipped.length) ? 'warning' : 'success');
      loadReportAccess();
    })
    .catch(function (err) {
      if (button) button.disabled = false;
      toast(err.message, 'error');
    });
}

function setViewerScope(nik, scope) {
  return saveReportAccess('setReportAccess', [nik, scope || 'All']);
}

function removeViewer(nik) {
  var d = S.reportAccess;
  var u = d ? d.viewers.filter(function (v) { return String(v.NIK) === String(nik); })[0] : null;
  if (!u) return;
  S.removeViewerNik = String(nik);
  $('modal-host').innerHTML =
    '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closeRemoveViewer()">' +
      '<div class="modal-panel !max-w-md" role="dialog" aria-modal="true" aria-labelledby="remove-viewer-title">' +
        '<div class="px-6 pt-6 pb-5 flex items-start gap-4">' +
          '<span class="w-10 h-10 rounded-full bg-status-danger-subtle text-status-danger flex items-center justify-center shrink-0">' +
            '<span class="material-symbols-outlined text-[22px]">person_remove</span></span>' +
          '<div class="min-w-0">' +
            '<h2 id="remove-viewer-title" class="text-title-lg text-text-primary">Remove report access?</h2>' +
            '<p class="text-body-sm text-text-secondary mt-1"><strong>' + esc(u.Full_Name) + '</strong> (' + esc(u.NIK) + ') will no longer be able to open the company reports. You can grant access again at any time.</p>' +
          '</div>' +
        '</div>' +
        '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex items-center justify-end gap-space-sm">' +
          '<button type="button" class="btn btn-secondary" onclick="MGI.closeRemoveViewer()">Cancel</button>' +
          '<button id="remove-viewer-confirm" type="button" class="btn btn-danger" onclick="MGI.confirmRemoveViewer()">' +
            '<span class="material-symbols-outlined text-[18px]">person_remove</span> Remove access</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function closeRemoveViewer() {
  S.removeViewerNik = null;
  $('modal-host').innerHTML = '';
}

function confirmRemoveViewer() {
  var nik = S.removeViewerNik;
  closeRemoveViewer();
  if (!nik) return;
  return saveReportAccess('removeReportAccess', [nik]);
}

function loadFiscalYear() {
  if (!$('fiscal-control')) return;
  if (!S.fiscal) $('fiscal-control').innerHTML = '<div class="skeleton h-72 w-full"></div>';
  api('getFiscalYear')
    .then(function (data) {
      S.fiscal = data;
      renderFiscalPanel();
    })
    .catch(function (err) {
      $('fiscal-control').innerHTML = loadErrorHtml(err.message, 'loadFiscalYear');
      toast(err.message, 'error');
    });
}

function fiscalChecks(d) {
  var n = d.next;
  var c = d.current;
  var y = n.year;
  var plural = function (count, one, many) { return num(count, 0) + ' ' + (count === 1 ? one : many); };
  var checks = [
    {
      state: !n.kpis ? 'todo' : n.readyGroups < n.roleGroups ? 'warn' : 'ok',
      title: 'Master KPIs',
      text: !n.kpis ? 'No active Master KPIs for FY' + y + ' yet.'
          : n.readyGroups < n.roleGroups
            ? plural(n.roleGroups - n.readyGroups, 'role group is', 'role groups are') + ' not at 100% yet (' + n.readyGroups + ' of ' + n.roleGroups + ' ready).'
            : plural(n.kpis, 'active KPI', 'active KPIs') + ' in ' + plural(n.roleGroups, 'role group', 'role groups') + ', all at 100%.',
      action: 'master', label: 'Master KPIs'
    },
    {
      state: !n.mappedEmployees ? 'todo' : n.mappedEmployees < n.activeEmployees ? 'warn' : 'ok',
      title: 'KPI mapping',
      text: !n.mappedEmployees ? 'No employee has FY' + y + ' KPIs yet.'
          : n.mappedEmployees < n.activeEmployees
            ? num(n.mappedEmployees, 0) + ' of ' + num(n.activeEmployees, 0) + ' active employees have FY' + y + ' KPIs.'
            : 'All ' + num(n.activeEmployees, 0) + ' active employees have FY' + y + ' KPIs.',
      action: 'mapping', label: 'Mapping'
    },
    {
      state: n.rulesSaved ? 'ok' : 'info',
      title: 'Performance Scoring rules',
      text: n.rulesSaved ? 'FY' + y + ' rules are saved.' : 'FY' + y + ' uses the default rules until you save its own.',
      action: 'performance', label: 'Performance Scoring'
    },
    {
      state: n.theme ? 'ok' : 'info',
      title: 'Yearly theme',
      text: n.theme ? '"' + n.theme + '"' : 'Optional. FY' + y + ' has no theme yet.',
      action: 'theme', label: 'Yearly Theme'
    },
    {
      state: 'info',
      title: 'Submission periods',
      text: n.periodsCreated >= 12
        ? 'The 12 months of FY' + y + ' are ready and stay locked until you open them.'
        : 'The 12 months of FY' + y + ' are created, all locked, when you switch.',
      action: '', label: ''
    }
  ];
  if (c.periodsOpen) {
    checks.push({
      state: 'info',
      title: 'FY' + c.year + ' months still open',
      text: plural(c.periodsOpen, 'month is', 'months are') + ' still open. After the switch you can keep managing FY' + c.year + ' in Submission Periods.',
      action: 'periods', label: 'Submission Periods'
    });
  }
  return checks;
}

function renderFiscalPanel() {
  var d = S.fiscal;
  var host = $('fiscal-control');
  if (!d || !host) return;
  var c = d.current;
  var n = d.next;
  var checks = fiscalChecks(d);
  var blocked = !n.kpis;
  var todo = checks.some(function (ch) { return ch.state === 'todo'; });
  var warn = checks.some(function (ch) { return ch.state === 'warn'; });
  var since = d.changedAt
    ? 'Active since ' + esc(fmtDate(d.changedAt)) + (d.changedBy ? ', set by ' + esc(d.changedBy) : '')
    : 'Active since setup';

  var fact = function (icon, label, value) {
    return '<div class="flex items-center gap-3 py-2.5">' +
      '<span class="w-9 h-9 rounded-lg bg-slate-50 ring-1 ring-slate-200/70 text-slate-600 flex items-center justify-center shrink-0">' +
        '<span class="material-symbols-outlined text-[20px]">' + icon + '</span></span>' +
      '<span class="min-w-0 flex-1 text-body-sm text-text-secondary">' + label + '</span>' +
      '<span class="text-body-sm font-semibold text-text-primary text-right">' + value + '</span>' +
    '</div>';
  };

  var checkRow = function (ch) {
    var st = FISCAL_STATES[ch.state];
    return '<div class="flex items-start gap-3 py-3">' +
      '<span class="material-symbols-outlined text-[22px] shrink-0 ' + st.tone + '">' + st.icon + '</span>' +
      '<div class="min-w-0 flex-1">' +
        '<p class="text-body-md font-semibold text-text-primary">' + esc(ch.title) + '</p>' +
        '<p class="text-body-sm text-text-muted">' + esc(ch.text) + '</p>' +
      '</div>' +
      (ch.action
        ? '<button type="button" class="btn btn-secondary !py-1 !px-2.5 !text-label-sm shrink-0" onclick="MGI.openFiscalTarget(\'' + ch.action + '\', ' +
            (ch.action === 'periods' ? c.year : n.year) + ')">' + esc(ch.label) + '</button>'
        : '') +
    '</div>';
  };

  host.innerHTML =
    '<div class="flex flex-col gap-space-lg">' +
      '<div class="flex flex-col md:flex-row md:items-start justify-between gap-space-md">' +
        '<div class="min-w-0">' +
          '<h2 class="text-title-lg text-text-primary">Fiscal Year</h2>' +
          '<p class="text-body-sm text-text-muted max-w-3xl">The active fiscal year decides which year employees submit in My KPIs, which months Submission Periods controls, ' +
            'and the year every page opens on. Prepare the next year at any time, then switch when it starts.</p>' +
        '</div>' +
        '<div class="flex flex-col items-start md:items-end gap-1 shrink-0">' +
          '<span class="pill pill-brand"><span class="material-symbols-outlined text-[14px]">event_available</span>FY' + d.activeYear + ' active</span>' +
          '<span class="text-label-xs text-text-muted">' + since + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="grid grid-cols-1 xl:grid-cols-2 gap-space-lg items-start">' +
        '<section class="rounded-xl border border-border-light overflow-hidden">' +
          '<div class="px-space-md py-space-sm bg-surface-page border-b border-border-light flex items-center justify-between gap-2">' +
            '<h3 class="text-title-md text-text-primary">FY' + c.year + ' now</h3>' +
            '<span class="pill pill-brand !text-[11px]">Active</span>' +
          '</div>' +
          '<div class="px-space-md divide-y divide-slate-100">' +
            fact('library_books', 'Active Master KPIs', num(c.kpis, 0) + ' in ' + num(c.roleGroups, 0) + (c.roleGroups === 1 ? ' role group' : ' role groups')) +
            fact('groups', 'Employees with KPIs', num(c.mappedEmployees, 0) + ' of ' + num(c.activeEmployees, 0)) +
            fact('event_available', 'Open months', num(c.periodsOpen, 0) + ' of 12') +
            fact('workspace_premium', 'Scoring rules', c.rulesSaved ? 'Saved' : 'Defaults') +
            fact('verified', 'Results', c.released ? 'Released to employees' : 'Not released yet') +
          '</div>' +
        '</section>' +
        '<section class="rounded-xl border border-border-light overflow-hidden">' +
          '<div class="px-space-md py-space-sm bg-surface-page border-b border-border-light flex items-center justify-between gap-2">' +
            '<h3 class="text-title-md text-text-primary">Ready for FY' + n.year + '?</h3>' +
            '<span class="pill ' + (todo ? 'pill-danger' : warn ? 'pill-warning' : 'pill-success') + ' !text-[11px]">' +
              (todo ? 'Not ready' : warn ? 'Almost ready' : 'Ready') + '</span>' +
          '</div>' +
          '<div class="px-space-md divide-y divide-slate-100">' + checks.map(checkRow).join('') + '</div>' +
          '<div class="px-space-md py-space-md border-t border-border-light bg-surface-page flex flex-col items-start gap-2">' +
            '<button id="fiscal-switch" type="button" class="btn btn-primary" onclick="MGI.openYearSwitch(' + n.year + ')"' + (blocked ? ' disabled' : '') + '>' +
              '<span class="material-symbols-outlined text-[18px]">event_repeat</span> Switch to FY' + n.year + '</button>' +
            '<p class="text-label-xs text-text-muted">' + (blocked
              ? 'Add active Master KPIs for FY' + n.year + ' first.'
              : 'Best time: right after the last FY' + c.year + ' month closes. FY' + c.year + ' data stays as it is, and its months can still be reopened.') + '</p>' +
          '</div>' +
        '</section>' +
      '</div>' +
      (d.canMoveBack
        ? '<p class="text-body-sm text-text-muted flex flex-wrap items-center gap-x-2 gap-y-1">Switched too early?' +
            '<button type="button" class="text-primary-container font-semibold rounded-md px-1.5 py-0.5 transition-all duration-150 hover:bg-brand-50" onclick="MGI.openYearSwitch(' +
              (d.activeYear - 1) + ')">Move back to FY' + (d.activeYear - 1) + '</button></p>'
        : '') +
    '</div>';
}

function openYearSwitch(year) {
  var d = S.fiscal;
  year = parseInt(year, 10);
  if (!d || !year) return;
  var forward = year > d.activeYear;
  var warnings = forward ? fiscalChecks(d).filter(function (ch) { return ch.state === 'warn' || ch.state === 'todo'; }) : [];
  var verb = forward ? 'Switch to FY' : 'Move back to FY';
  S.fiscalSwitch = year;

  $('modal-host').innerHTML =
    '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closeYearSwitch()">' +
      '<div class="modal-panel !max-w-lg">' +
        '<div class="px-6 pt-6 pb-5 flex items-start gap-4">' +
          '<span class="w-10 h-10 rounded-full bg-brand-50 text-primary-container flex items-center justify-center shrink-0">' +
            '<span class="material-symbols-outlined text-[22px]">event_repeat</span></span>' +
          '<div class="min-w-0">' +
            '<h2 class="text-title-lg text-text-primary">' + verb + year + '?</h2>' +
            '<p class="text-body-sm text-text-secondary mt-1">' + (forward
              ? 'My KPIs will open on FY' + year + ', Submission Periods will manage FY' + year + ' and FY' + d.activeYear +
                ', and every report will open on FY' + year + '. FY' + d.activeYear + ' data is not changed.'
              : 'FY' + year + ' becomes the active year again. FY' + d.activeYear + ' mappings and data stay as they are.') + '</p>' +
            (warnings.length
              ? '<ul class="mt-3 flex flex-col gap-1.5">' + warnings.map(function (w) {
                  return '<li class="flex items-start gap-2 text-body-sm text-amber-800"><span class="material-symbols-outlined text-[18px]">warning</span>' +
                    '<span>' + esc(w.text) + '</span></li>';
                }).join('') + '</ul>'
              : '') +
            '<p class="text-body-sm text-text-secondary mt-3">Everyone who has the app open should reload it afterwards.</p>' +
          '</div>' +
        '</div>' +
        '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex items-center justify-end gap-space-sm">' +
          '<button type="button" class="btn btn-secondary" onclick="MGI.closeYearSwitch()">Cancel</button>' +
          '<button id="year-confirm" type="button" class="btn btn-primary" onclick="MGI.confirmYearSwitch()">' + verb + year + '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function closeYearSwitch() {
  S.fiscalSwitch = null;
  $('modal-host').innerHTML = '';
}

function confirmYearSwitch() {
  var year = S.fiscalSwitch;
  if (!year) return;
  var restore = busy($('year-confirm'), 'Switching');

  api('setActiveYear', year)
    .then(function (res) {
      S.fiscal = res;
      S.fiscalSwitch = null;
      renderFiscalPanel();
      if (!res.changed) {
        $('modal-host').innerHTML = '';
        toast(res.message, 'info');
        return;
      }
      $('modal-host').innerHTML =
        '<div class="modal-backdrop">' +
          '<div class="modal-panel !max-w-md">' +
            '<div class="px-6 pt-6 pb-5 flex items-start gap-4">' +
              '<span class="w-10 h-10 rounded-full bg-status-success-subtle text-status-success flex items-center justify-center shrink-0">' +
                '<span class="material-symbols-outlined text-[22px]">check_circle</span></span>' +
              '<div class="min-w-0">' +
                '<h2 class="text-title-lg text-text-primary">FY' + res.activeYear + ' is now active</h2>' +
                '<p class="text-body-sm text-text-secondary mt-1">' + esc(res.message) + '</p>' +
              '</div>' +
            '</div>' +
            '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex items-center justify-end gap-space-sm">' +
              '<button type="button" class="btn btn-primary" onclick="MGI.reloadApp()">' +
                '<span class="material-symbols-outlined text-[18px]">refresh</span> Reload app</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    })
    .catch(function (err) {
      restore();
      toast(err.message, 'error');
    });
}

function reloadApp() {
  var url = S.user && S.user.appUrl;
  if (url) {
    window.open(url, '_top');
    return;
  }
  $('modal-host').innerHTML = '';
  toast('Reload this page in your browser to continue.', 'info');
}

function openFiscalTarget(target, year) {
  year = parseInt(year, 10);
  if (target === 'master') {
    S.masterYearPick = year;
    go('master-kpis');
    return;
  }
  if (target === 'mapping') {
    S.mapYear = year;
    go('mapping');
    return;
  }
  if (target === 'performance') {
    S.perfYear = year;
    S.perfDraft = null;
    setSettingsTab('performance');
    if (S.perfSettings) renderPerfPanel();
    return;
  }
  if (target === 'theme') {
    S.themeYear = year;
    setSettingsTab('theme');
    if (S.themes) renderThemePanel();
    return;
  }
  if (target === 'periods') {
    S.periodYear = year;
    S.periods = [];
    setSettingsTab('periods');
    loadPeriodSettings();
  }
}

function loadYearThemes() {
  if (!$('theme-control')) return;
  if (!S.themes) $('theme-control').innerHTML = '<div class="skeleton h-40 w-full"></div>';
  api('getYearThemes')
    .then(function (data) {
      S.themes = data;
      if (!S.themeYear) S.themeYear = data.activeYear;
      renderThemePanel();
    })
    .catch(function (err) {
      $('theme-control').innerHTML = loadErrorHtml(err.message, 'loadYearThemes');
      toast(err.message, 'error');
    });
}

function themeFor(year) {
  var hit = S.themes ? S.themes.themes.filter(function (t) { return t.year === Number(year); })[0] : null;
  return hit ? hit.theme : '';
}

function renderThemePanel() {
  var d = S.themes;
  if (!d || !$('theme-control')) return;
  var years = [d.activeYear - 1, d.activeYear, d.activeYear + 1];
  d.themes.forEach(function (t) { if (years.indexOf(t.year) === -1) years.push(t.year); });
  years.sort(function (a, b) { return b - a; });
  var current = themeFor(S.themeYear);

  var history = d.themes.length
    ? '<table class="data-table text-body-sm"><thead><tr><th class="w-24">Year</th><th>Theme</th><th class="w-56">Last updated</th></tr></thead><tbody>' +
        d.themes.map(function (t) {
          return '<tr><td class="font-semibold">FY' + t.year + (t.year === d.activeYear ? ' <span class="pill pill-brand !py-0 !text-[11px]">Active</span>' : '') + '</td>' +
            '<td class="text-text-primary">' + esc(t.theme) + '</td>' +
            '<td class="text-label-xs text-text-muted">' + esc(fmtDate(t.updatedAt)) + (t.updatedBy ? ' by ' + esc(t.updatedBy) : '') + '</td></tr>';
        }).join('') + '</tbody></table>'
    : '<p class="px-space-md py-space-lg text-center text-body-sm text-text-muted">No theme has been set yet.</p>';

  $('theme-control').innerHTML =
    '<div class="flex flex-col gap-space-lg">' +
      '<div>' +
        '<h2 class="text-title-lg text-text-primary">Yearly Theme</h2>' +
        '<p class="text-body-sm text-text-muted">One short theme per fiscal year. It appears on My KPIs, on the Annual Performance report and its PDF, and on the Dashboard. ' +
          'Leave it empty to hide it.</p>' +
      '</div>' +
      '<div class="grid grid-cols-1 lg:grid-cols-[160px_minmax(0,1fr)_auto] gap-space-sm items-end">' +
        '<div><label class="form-label" for="theme-year">Year</label>' +
          '<select id="theme-year" class="field" onchange="MGI.onThemeYear(this.value)">' + years.map(function (y) {
            return '<option value="' + y + '"' + (y === Number(S.themeYear) ? ' selected' : '') + '>FY' + y + (y === d.activeYear ? ' (Active)' : '') + '</option>';
          }).join('') + '</select></div>' +
        '<div><label class="form-label flex items-center justify-between" for="theme-text">Theme <span id="theme-count" class="text-label-xs font-normal text-text-muted"></span></label>' +
          '<input id="theme-text" type="text" class="field" maxlength="' + d.maxLength + '" placeholder="Think Precise, Result Excellence" value="' + esc(current) + '"' +
            ' oninput="MGI.onThemeInput()"></div>' +
        '<button id="theme-save" type="button" class="btn btn-primary" onclick="MGI.saveTheme()">' +
          '<span class="material-symbols-outlined text-[18px]">save</span> Save Theme</button>' +
      '</div>' +
      '<div><p class="form-label">Preview</p><div id="theme-preview"></div></div>' +
      '<section class="rounded-xl border border-border-light overflow-hidden">' +
        '<div class="px-space-md py-space-sm bg-surface-page border-b border-border-light"><h3 class="text-title-md text-text-primary">Themes by year</h3></div>' +
        '<div class="table-scroll">' + history + '</div>' +
      '</section>' +
    '</div>';
  onThemeInput();
}

function onThemeYear(year) {
  S.themeYear = parseInt(year, 10) || S.themeYear;
  renderThemePanel();
}

function onThemeInput() {
  var box = $('theme-text');
  if (!box || !S.themes) return;
  var text = String(box.value || '').replace(/\s+/g, ' ').trim();
  $('theme-count').textContent = text.length + ' / ' + S.themes.maxLength;
  $('theme-preview').innerHTML = text
    ? themeBannerHtml(S.themeYear, text)
    : '<p class="rounded-xl border border-dashed border-border-medium px-4 py-3 text-body-sm text-text-muted">No theme. Nothing is shown for FY' + esc(S.themeYear) + '.</p>';
  $('theme-save').disabled = text === themeFor(S.themeYear);
}

function saveTheme() {
  var box = $('theme-text');
  if (!box) return;
  var restore = busy($('theme-save'), 'Saving');
  api('saveYearTheme', S.themeYear, box.value)
    .then(function (res) {
      restore();
      toast(res.message, 'success');
      if (S.dashboard && S.dashboard.year === res.year) S.dashboard.theme = res.theme;
      if (S.dash && S.dash.year === res.year) S.dash.theme = res.theme;
      Object.keys(S.reports || {}).forEach(function (key) {
        if (S.reports[key].year === res.year) S.reports[key].theme = res.theme;
      });
      loadYearThemes();
    })
    .catch(function (err) {
      restore();
      toast(err.message, 'error');
    });
}
