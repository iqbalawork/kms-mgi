'use strict';

function mapYear() {
  return S.mapYear || S.user.year;
}

function renderMapYears() {
  var sel = $('map-year');
  if (!sel) return;
  var years = ((S.overview && S.overview.years) || []).slice();
  [mapYear(), S.user.year].forEach(function (y) { if (years.indexOf(y) === -1) years.push(y); });
  years.sort(function (a, b) { return b - a; });
  sel.innerHTML = years.map(function (y) {
    return '<option value="' + y + '">FY' + y + (y === S.user.year ? ' (Active)' : y === S.user.year + 1 ? ' (Next)' : '') + '</option>';
  }).join('');
  sel.value = String(mapYear());
  renderMapYearNote();
}

function renderMapYearNote() {
  var host = $('map-year-note');
  if (!host) return;
  var year = mapYear();
  host.innerHTML = year > S.user.year
    ? '<div class="rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-2.5 text-body-sm text-blue-800 flex items-start gap-2">' +
        '<span class="material-symbols-outlined text-[18px]">event_upcoming</span>' +
        '<span>You are preparing <strong>FY' + year + '</strong>. Employees see these KPIs once FY' + year +
        ' becomes the active year in System Settings &gt; Fiscal Year.</span>' +
      '</div>'
    : '';
}

function onMapYearChange(value) {
  var year = parseInt(value, 10);
  var sel = $('map-year');
  if (!year || year === mapYear()) return;
  if (sel) sel.value = String(mapYear());
  guardUnsaved(function () {
    S.mapYear = year;
    if (sel) sel.value = String(year);
    renderMapYearNote();
    var reopen = S.mapping && !$('map-workspace').classList.contains('hidden') ? S.mapping.employee.NIK : '';
    loadOverview();
    if (reopen) onEmployeeSelect(reopen);
  });
}

function initMapping() {
  S.categories = null;
  renderMapYears();
  var reopen = S.mapping && !$('map-workspace').classList.contains('hidden')
    ? S.mapping.employee.NIK : '';
  loadOverview();
  if (reopen) onEmployeeSelect(reopen);
}

function loadOverview() {
  $('map-emp-list').innerHTML =
    '<div class="p-space-md"><div class="skeleton h-12 w-full"></div></div>';

  var year = mapYear();
  api('getMappingOverview', year)
    .then(function (data) {
      if (year !== mapYear()) return;
      S.overview = data;
      S.employees = data.rows;
      autoMapTab();
      renderMapYears();
      renderOverviewStats();
      renderEmployeeTabs();
      renderEmployeeList();
      renderSwitcher();
      if (S.bulk && !bulkGroup()) {
        var groups = data.roleGroups || [];
        var first = groups.filter(function (g) { return g.valid; })[0] || groups[0] || null;
        S.bulk.roleKey = first ? first.key : '';
        S.bulk.niks = {};
      }
      if (S.bulk && $('map-bulk') && !$('map-bulk').classList.contains('hidden')) renderBulkPage();
    })
    .catch(function (err) {
      $('map-emp-list').innerHTML =
        '<p class="p-space-lg text-center text-status-danger">' + esc(err.message) + '</p>';
      toast(err.message, 'error');
    });
}

function plural(n, one, many) {
  return n + ' ' + (n === 1 ? one : many || one + 's');
}

function renderOverviewStats() {
  var o = S.overview;
  var total = o.rows.length;

  $('map-overview-stats').innerHTML =
    statCard('Assigned', 'groups', 'text-text-primary',
      o.assignedCount, 'of ' + plural(total, 'employee'),
      o.unassignedCount ? plural(o.unassignedCount, 'employee') + ' still without KPIs' : 'Every active employee has KPIs',
      'bg-status-success', total ? o.assignedCount / total * 100 : 0) +

    statCard('Unassigned', 'person_alert', o.unassignedCount ? 'text-status-warning' : 'text-status-success',
      o.unassignedCount, o.unassignedCount === 1 ? 'Employee' : 'Employees',
      o.unassignedCount ? 'No active KPI mapping yet' : 'Nobody is waiting for KPIs',
      '', 0) +

    statCard('Weights to Fix', 'rule', o.incompleteCount ? 'text-status-danger' : 'text-status-success',
      o.incompleteCount, o.incompleteCount === 1 ? 'Employee' : 'Employees',
      o.incompleteCount ? 'Assigned, but a role is not at 100%' : 'Every role adds up to 100%',
      '', 0);
}

function mapTabCounts() {
  var o = S.overview || {};
  return { unassigned: o.unassignedCount || 0, incomplete: o.incompleteCount || 0, assigned: o.assignedCount || 0 };
}

function autoMapTab() {
  var counts = mapTabCounts();
  if (counts[S.mapTab] > 0) return;
  S.mapTab = counts.unassigned ? 'unassigned' : counts.incomplete ? 'incomplete' : 'assigned';
}

function renderEmployeeTabs() {
  var counts = mapTabCounts();
  var tabs = [
    { key: 'unassigned', label: 'Unassigned',     count: counts.unassigned },
    { key: 'incomplete', label: 'Weights to Fix', count: counts.incomplete },
    { key: 'assigned',   label: 'Assigned',       count: counts.assigned }
  ].filter(function (t) { return t.key !== 'incomplete' || t.count > 0 || S.mapTab === 'incomplete'; });

  $('map-tabs').innerHTML = tabs.map(function (t) {
    return '<button type="button" onclick="MGI.setMapTab(\'' + t.key + '\')" class="seg-btn' +
           (S.mapTab === t.key ? ' is-active' : '') + '">' +
           esc(t.label) + '<span class="seg-count">' + t.count + '</span></button>';
  }).join('');
}

function setMapTab(key) {
  S.mapTab = key;
  renderEmployeeTabs();
  renderEmployeeList();
}

function renderEmployeeList() {
  if (!S.overview) return;
  var q = ($('map-emp-search').value || '').toLowerCase();

  var rows = S.overview.rows.filter(function (r) {
    if (S.mapTab === 'unassigned' && r.hasMapping) return false;
    if (S.mapTab === 'assigned' && !r.hasMapping) return false;
    if (S.mapTab === 'incomplete' && (!r.hasMapping || r.allValid)) return false;
    if (!q) return true;
    return (r.Full_Name + ' ' + r.NIK + ' ' + r.Position + ' ' + r.Department + ' ' + (r.Email || ''))
            .toLowerCase().indexOf(q) > -1;
  });

  if (!rows.length) {
    $('map-emp-list').innerHTML =
      '<div class="p-space-2xl text-center">' +
        '<span class="material-symbols-outlined text-[40px] text-text-muted">' +
          (q ? 'search_off' : 'task_alt') + '</span>' +
        '<p class="text-body-md text-text-secondary mt-2">' +
          (q ? 'No employees match your search.'
             : S.mapTab === 'unassigned'
                 ? 'Every active employee already has a KPI mapping.'
                 : S.mapTab === 'incomplete'
                   ? 'Every assigned role adds up to 100%.'
                   : 'No employees have been assigned yet.') + '</p>' +
      '</div>';
    return;
  }

  $('map-emp-list').innerHTML = rows.map(function (r) {
    var badge = !r.hasMapping
      ? '<span class="pill pill-warning">No KPIs yet</span>'
      : r.allValid
        ? '<span class="pill pill-success"><span class="material-symbols-outlined text-[14px]">check_circle</span> ' +
          plural(r.roleCount, 'role') + ', weights complete</span>'
        : '<span class="pill pill-danger"><span class="material-symbols-outlined text-[14px]">error</span> ' +
          'Weights not at 100%</span>';

    var groupChips = r.groups.map(function (g) {
      return '<span class="pill ' + (g.valid ? 'pill-neutral' : 'pill-danger') + ' !text-[11px]">' +
             esc(g.label) + ' ' + g.percent + '%</span>';
    }).join('');

    return '<div class="emp-row">' +
      '<button type="button" class="emp-row-main" onclick="MGI.openWorkspace(\'' + esc(r.NIK) + '\')">' +
        '<span class="emp-avatar">' + esc(r.Initials) + '</span>' +
        '<span class="flex flex-col min-w-0 flex-1">' +
          '<span class="text-body-md font-bold text-text-primary truncate">' + esc(r.Full_Name) + '</span>' +
          '<span class="text-label-xs text-text-muted truncate">' + esc(r.NIK) + ' • ' +
            esc(r.Position) + ' / ' + esc(r.Department) + '</span>' +
          emailLine(r.Email) +
          (groupChips ? '<span class="flex flex-wrap gap-1 mt-1">' + groupChips + '</span>' : '') +
        '</span>' +
      '</button>' +
      '<span class="flex items-center gap-space-sm shrink-0">' + (r.account ? accountPill(r.account) : '') + badge +
        (r.hasMapping ? resetButton(r, true) : '') +
        '<span class="material-symbols-outlined text-text-muted" aria-hidden="true">chevron_right</span></span>' +
    '</div>';
  }).join('');
}

function emailLine(email) {
  return email
    ? '<span class="flex items-center gap-1 min-w-0 text-label-xs text-text-secondary">' +
        '<span class="material-symbols-outlined text-[14px] text-text-muted" aria-hidden="true">mail</span>' +
        '<span class="truncate">' + esc(email) + '</span></span>'
    : '<span class="flex items-center gap-1 text-label-xs text-status-warning">' +
        '<span class="material-symbols-outlined text-[14px]" aria-hidden="true">unsubscribe</span>No email on file</span>';
}

function resetButton(row, compact) {
  var label = row.account === 'none' ? 'Send Login Code' : 'Reset Password';
  var tip = row.Email ? 'Email a one-time login code to ' + row.Email : 'No email address on file';
  return '<button type="button" class="btn btn-secondary' + (compact ? ' emp-row-action' : '') + ' !py-1 !px-2.5 !text-label-sm"' +
    ' onclick="MGI.openResetPassword(\'' + esc(row.NIK) + '\')" title="' + esc(tip) + '"' +
    ' aria-label="' + esc(label + ' for ' + row.Full_Name) + '"' + (row.Email ? '' : ' disabled') + '>' +
    '<span class="material-symbols-outlined text-[16px]" aria-hidden="true">lock_reset</span>' +
    (compact ? '<span class="hidden xl:inline">' + label + '</span>' : ' ' + label) + '</button>';
}

var ACCOUNT_META = {
  none:    ['pill-neutral', 'person_off', 'No account'],
  invited: ['pill-info', 'mark_email_unread', 'Invited'],
  active:  ['pill-success', 'verified_user', 'Active'],
  locked:  ['pill-danger', 'lock', 'Locked'],
  queued:  ['pill-neutral', 'schedule_send', 'Invite queued'],
  failed:  ['pill-warning', 'unsubscribe', 'Invite failed']
};

function accountPill(status) {
  var m = ACCOUNT_META[status] || ACCOUNT_META.none;
  return '<span class="pill ' + m[0] + ' !text-[11px]" title="Login account">' +
    '<span class="material-symbols-outlined text-[14px]">' + m[1] + '</span> ' + m[2] + '</span>';
}

function mapAccountRow() {
  if (!S.mapping || !S.overview) return null;
  var nik = S.mapping.employee.NIK;
  return (S.overview.rows || []).filter(function (r) { return r.NIK === nik; })[0] || null;
}

function resetRow() {
  if (!S.overview || !S.resetNik) return null;
  return (S.overview.rows || []).filter(function (r) { return r.NIK === S.resetNik; })[0] || null;
}

function openResetPassword(nik) {
  S.resetNik = nik || (S.mapping ? S.mapping.employee.NIK : '');
  var row = resetRow();
  if (!row) return;
  var fresh = row.account === 'none';

  $('modal-host').innerHTML =
    '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closeResetPassword()">' +
      '<div class="modal-panel !max-w-md">' +
        '<div class="px-6 pt-6 pb-5 flex items-start gap-4">' +
          '<span class="w-10 h-10 rounded-full bg-status-warning-subtle text-status-warning flex items-center justify-center shrink-0">' +
            '<span class="material-symbols-outlined text-[22px]">lock_reset</span></span>' +
          '<div class="min-w-0">' +
            '<h2 class="text-title-lg text-text-primary">' + (fresh ? 'Send login code' : 'Reset password') + '</h2>' +
            (row.Email
              ? '<p class="text-body-sm text-text-secondary mt-1">A one-time login code will be emailed to <strong>' +
                  esc(row.Full_Name) + '</strong> at <strong class="break-all">' + esc(row.Email) + '</strong>.' +
                  (fresh ? '' : ' Their current password and every signed-in session stop working immediately.') + '</p>'
              : '<p class="text-body-sm text-text-secondary mt-1"><strong>' + esc(row.Full_Name) + '</strong> has no email address on file.</p>' +
                '<p class="mt-3 rounded-lg bg-status-warning-subtle text-status-warning text-body-sm px-3 py-2">' +
                  'Add an email address in the employee database first, then try again.</p>') +
          '</div>' +
        '</div>' +
        '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex items-center justify-end gap-space-sm">' +
          '<button class="btn btn-secondary" onclick="MGI.closeResetPassword()">Cancel</button>' +
          '<button id="reset-confirm" class="btn btn-primary" onclick="MGI.confirmResetPassword()"' + (row.Email ? '' : ' disabled') + '>' +
            '<span class="material-symbols-outlined text-[18px]">send</span> ' + (fresh ? 'Send Code' : 'Reset &amp; Send Code') + '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function closeResetPassword() {
  $('modal-host').innerHTML = '';
}

function confirmResetPassword() {
  var row = resetRow();
  if (!row || !row.Email) return;
  var restore = busy($('reset-confirm'), 'Sending');

  api('resetUserPassword', row.NIK)
    .then(function (res) {
      restore();
      closeResetPassword();
      row.account = res.account;
      if (S.mapping && S.mapping.employee.NIK === row.NIK) renderWeightHero();
      renderEmployeeList();
      toast(res.message, res.account === 'queued' ? 'warning' : res.success ? 'success' : 'error');
    })
    .catch(function (err) {
      restore();
      toast(err.message, 'error');
    });
}

function openBulkAssign() {
  if (!S.overview) return;
  var groups = S.overview.roleGroups || [];
  var first = groups.filter(function (g) { return g.valid; })[0] || groups[0] || null;
  S.bulk = { roleKey: first ? first.key : '', search: '', groupSearch: '', division: '', matchOnly: true, niks: {} };
  $('map-picker').classList.add('hidden');
  $('map-bulk').classList.remove('hidden');
  window.scrollTo(0, 0);
  renderBulkPage();
}

function closeBulkAssign() {
  S.bulk = null;
  $('map-bulk').classList.add('hidden');
  $('map-bulk').innerHTML = '';
  $('map-picker').classList.remove('hidden');
  window.scrollTo(0, 0);
}

function bulkGroup() {
  if (!S.bulk || !S.overview) return null;
  return (S.overview.roleGroups || []).filter(function (g) { return g.key === S.bulk.roleKey; })[0] || null;
}

function bulkSame(a, b) {
  return String(a || '').toLowerCase() === String(b || '').toLowerCase();
}

function bulkMatches(row, group) {
  return bulkSame(row.Position, group.position) && bulkSame(row.Department, group.department);
}

function bulkState(row, group) {
  var mine = (row.groups || []).filter(function (g) { return g.key === group.key; })[0];
  if (!mine) return { key: 'new', label: 'Not assigned', pill: 'pill-neutral' };
  if (mine.count >= group.count) return { key: 'complete', label: 'Already assigned', pill: 'pill-success' };
  return { key: 'topup', label: 'Has ' + mine.count + ' of ' + group.count, pill: 'pill-warning' };
}

function bulkRows() {
  var group = bulkGroup();
  if (!group) return [];
  var q = (S.bulk.search || '').toLowerCase();

  return (S.overview.rows || []).filter(function (r) {
    if (S.bulk.matchOnly && !bulkMatches(r, group)) return false;
    if (!q) return true;
    return (r.Full_Name + ' ' + r.NIK + ' ' + r.Position + ' ' + r.Department).toLowerCase().indexOf(q) > -1;
  });
}

function bulkGroupStats(group) {
  var rows = (S.overview.rows || []).filter(function (r) { return bulkMatches(r, group); });
  return {
    matching: rows.length,
    holders: rows.filter(function (r) { return bulkState(r, group).key === 'complete'; }).length
  };
}

function bulkGroupList() {
  var q = (S.bulk.groupSearch || '').toLowerCase();
  return ((S.overview && S.overview.roleGroups) || []).filter(function (g) {
    if (S.bulk.division && g.division !== S.bulk.division) return false;
    if (!q) return true;
    var text = g.label + ' ' + (g.division || '') + ' ' + (g.kpis || []).map(function (k) { return k.KPI_Name; }).join(' ');
    return text.toLowerCase().indexOf(q) > -1;
  });
}

function bulkStepHead(n, title, note) {
  return '<div class="px-4 py-3 border-b border-border-light bg-surface-page flex items-center gap-2 min-w-0">' +
    '<span class="w-6 h-6 rounded-full bg-primary-container text-white text-[12px] font-bold flex items-center justify-center shrink-0">' + n + '</span>' +
    '<span class="text-body-md font-semibold text-text-primary shrink-0">' + esc(title) + '</span>' +
    (note ? '<span class="ml-auto text-label-xs text-text-muted truncate">' + note + '</span>' : '') +
  '</div>';
}

function bulkGroupPill(g) {
  return g.valid
    ? '<span class="pill pill-success !text-[11px] !px-2 shrink-0">' + g.count + ' KPIs • ' + num(g.percent, 1) + '%</span>'
    : '<span class="pill pill-danger !text-[11px] !px-2 shrink-0" title="' + g.count + ' KPIs, total weight ' + num(g.percent, 1) + '%">Not ready</span>';
}

function bulkTriggerHtml() {
  var g = bulkGroup();
  if (!g) {
    return '<span class="flex flex-col min-w-0 text-left">' +
        '<span class="text-label-xs uppercase tracking-wider text-text-muted">Bulk assign • Role group</span>' +
        '<span class="text-title-md text-text-secondary">Choose a role group</span>' +
      '</span>' +
      '<span class="material-symbols-outlined text-text-muted text-[20px] ml-auto">unfold_more</span>';
  }
  var st = bulkGroupStats(g);
  return '<span class="w-10 h-10 rounded-xl bg-primary-container text-white flex items-center justify-center shrink-0">' +
      '<span class="material-symbols-outlined text-[22px]">groups</span></span>' +
    '<span class="flex flex-col min-w-0 text-left">' +
      '<span class="text-label-xs uppercase tracking-wider text-text-muted">Bulk assign • Role group FY' + mapYear() + '</span>' +
      '<span class="flex items-center gap-2 min-w-0"><span class="text-title-md text-text-primary truncate">' + esc(g.position) + ' / ' + esc(g.department) + '</span>' +
        bulkGroupPill(g) + '</span>' +
      '<span class="text-xs text-slate-500 truncate">' + esc(g.division || 'No division') + ' • ' + st.matching +
        (st.matching === 1 ? ' employee' : ' employees') + ' in this role' + (st.holders ? ' • ' + st.holders + ' already assigned' : '') + '</span>' +
    '</span>' +
    '<span class="material-symbols-outlined text-text-muted text-[20px] ml-auto">unfold_more</span>';
}

function renderBulkPage() {
  var host = $('map-bulk');
  if (!host || !S.bulk) return;
  var groups = (S.overview && S.overview.roleGroups) || [];
  var divisions = [];
  groups.forEach(function (g) { if (g.division && divisions.indexOf(g.division) === -1) divisions.push(g.division); });
  divisions.sort();

  host.innerHTML =
    '<div class="sticky top-16 z-20 bg-white/95 backdrop-blur-md shadow-level-1 border border-border-light rounded-xl px-4 py-3 mb-space-md">' +
      '<div class="flex flex-wrap items-center gap-3">' +
        '<button type="button" class="btn-icon shrink-0" onclick="MGI.closeBulkAssign()" title="Back to employee list" aria-label="Back to employee list">' +
          '<span class="material-symbols-outlined">arrow_back</span></button>' +
        '<div id="bulk-combo" class="combo flex-1 min-w-[260px] max-w-[640px]">' +
          '<button id="bulk-group-trigger" type="button" class="combo-trigger w-full !border-border-light !bg-white" onclick="MGI.toggleBulkGroups()"' +
            ' title="Choose the role group to assign" aria-haspopup="listbox">' + bulkTriggerHtml() + '</button>' +
          '<div id="bulk-group-pop" class="combo-pop !w-[560px] hidden">' +
            '<div class="p-2 border-b border-border-light flex flex-col gap-2">' +
              '<div class="relative">' +
                '<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px] pointer-events-none">search</span>' +
                '<input id="bulk-group-search" type="search" class="field !pl-9 !py-1.5 !text-label-sm" placeholder="Search role, department or KPI" autocomplete="off" value="' +
                  esc(S.bulk.groupSearch) + '" oninput="MGI.onBulkGroupSearch(this.value)" onkeydown="MGI.onBulkGroupKey(event)">' +
              '</div>' +
              (divisions.length > 1
                ? '<div id="bulk-division" class="flex flex-wrap gap-1.5">' + [''].concat(divisions).map(function (d) {
                    return '<button type="button" class="bulk-chip' + (d === (S.bulk.division || '') ? ' is-active' : '') + '" data-division="' + esc(d) + '"' +
                      ' onclick="MGI.setBulkDivision(\'' + esc(d) + '\')">' + esc(d || 'All Divisions') + '</button>';
                  }).join('') + '</div>'
                : '') +
            '</div>' +
            '<div id="bulk-groups" class="max-h-[420px] overflow-y-auto divide-y divide-slate-100"></div>' +
          '</div>' +
        '</div>' +
        '<div class="flex flex-wrap items-center gap-space-sm ml-auto shrink-0">' +
          '<p id="bulk-summary" class="text-body-sm text-text-secondary"></p>' +
          '<button id="bulk-apply" class="btn btn-primary" onclick="MGI.applyBulkAssign()">' +
            '<span class="material-symbols-outlined text-[18px]">group_add</span> Assign</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="grid grid-cols-1 xl:grid-cols-2 gap-space-md items-start">' +
      '<div id="bulk-kpis" class="bulk-panel bg-surface-card rounded-xl shadow-level-1 border border-border-light"></div>' +
      '<div class="bulk-panel bg-surface-card rounded-xl shadow-level-1 border border-border-light">' +
        '<div class="bulk-panel-head">' +
          bulkStepHead(2, 'Choose employees', 'Only the selected employees receive the group') +
          '<div class="px-4 py-3 border-b border-border-light flex flex-wrap items-center gap-space-sm bg-white">' +
            '<div class="relative flex-1 min-w-[180px]">' +
              '<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px] pointer-events-none">search</span>' +
              '<input id="bulk-search" type="search" class="field !pl-10 !py-1.5" placeholder="Search NIK or name" value="' +
                esc(S.bulk.search) + '" oninput="MGI.onBulkSearch(this.value)">' +
            '</div>' +
            '<label class="flex items-center gap-2 text-body-sm text-text-secondary shrink-0 cursor-pointer">' +
              '<input type="checkbox" class="rounded border-border-medium"' + (S.bulk.matchOnly ? ' checked' : '') +
                ' onchange="MGI.toggleBulkMatch()"> Matching role only</label>' +
            '<button class="btn btn-secondary !py-1.5 shrink-0" onclick="MGI.selectAllBulk()" title="Select every employee listed below">Select listed</button>' +
            '<button class="btn btn-secondary !py-1.5 shrink-0" onclick="MGI.clearBulkSelection()" title="Unselect everyone">Clear</button>' +
          '</div>' +
        '</div>' +
        '<div id="bulk-list" class="bulk-panel-body divide-y divide-slate-100"></div>' +
      '</div>' +
    '</div>';

  if (!S.bulkWired) {
    S.bulkWired = true;
    document.addEventListener('click', function (ev) {
      var box = $('bulk-combo');
      if (box && box.contains && !box.contains(ev.target)) closeBulkGroups();
    });
  }

  renderBulkGroups();
  renderBulkKpis();
  renderBulkList();
}

function toggleBulkGroups() {
  var pop = $('bulk-group-pop');
  if (!pop) return;
  var willOpen = pop.classList.contains('hidden');
  pop.classList.toggle('hidden', !willOpen);
  if (!willOpen) return;
  renderBulkGroups();
  var q = $('bulk-group-search');
  if (q && q.focus) q.focus();
}

function closeBulkGroups() {
  var pop = $('bulk-group-pop');
  if (pop) pop.classList.add('hidden');
}

function onBulkGroupKey(e) {
  if (e.key === 'Escape') { closeBulkGroups(); return; }
  if (e.key !== 'Enter') return;
  e.preventDefault();
  var list = bulkGroupList();
  if (list.length) setBulkGroup(list[0].key);
}

function renderBulkGroups() {
  var host = $('bulk-groups');
  if (!host || !S.bulk) return;
  var list = bulkGroupList();

  host.innerHTML = !list.length
    ? '<p class="p-space-lg text-center text-body-sm text-text-muted">No role group matches this search.</p>'
    : list.map(function (g) {
        var on = g.key === S.bulk.roleKey;
        var st = bulkGroupStats(g);
        return '<button type="button" class="bulk-group' + (on ? ' is-active' : '') + '" role="option" aria-selected="' + (on ? 'true' : 'false') + '"' +
          ' onclick="MGI.setBulkGroup(\'' + esc(g.key) + '\')">' +
          '<span class="flex flex-col min-w-0 flex-1 text-left">' +
            '<span class="text-body-sm font-semibold text-text-primary truncate">' + esc(g.position) + ' / ' + esc(g.department) + '</span>' +
            '<span class="text-label-xs text-text-muted truncate">' + esc(g.division || 'No division') + '</span>' +
            '<span class="text-label-xs text-text-secondary truncate">' + st.matching + (st.matching === 1 ? ' employee' : ' employees') + ' in this role' +
              (st.holders ? ' • ' + st.holders + ' already assigned' : '') + '</span>' +
          '</span>' +
          bulkGroupPill(g) +
        '</button>';
      }).join('');

  document.querySelectorAll('#bulk-division [data-division]').forEach(function (b) {
    b.classList.toggle('is-active', b.getAttribute('data-division') === (S.bulk.division || ''));
  });
}

function renderBulkKpis() {
  var host = $('bulk-kpis');
  if (!host || !S.bulk) return;
  var g = bulkGroup();
  if (!g) {
    host.innerHTML = '<div class="bulk-panel-head">' + bulkStepHead(1, 'Review the KPIs', '') + '</div>' +
      '<p class="p-space-lg text-center text-body-sm text-text-muted">' +
        ((S.overview.roleGroups || []).length ? 'Choose a role group above to see its KPIs.' : 'No active Master KPIs for FY' + mapYear() + ' yet.') + '</p>';
    return;
  }

  var rows = (g.kpis || []).map(function (k, n) {
    var meta = labelMeta(k.Label);
    return '<tr>' +
      '<td class="!px-2 !py-2 text-center tabular-nums text-text-muted align-top">' + (n + 1) + '</td>' +
      '<td class="!px-2 !py-2 !whitespace-normal break-words leading-snug">' +
        '<span class="block font-semibold text-text-primary">' + esc(k.KPI_Name) + '</span>' +
        (k.Metrics ? '<span class="block text-text-muted">' + esc(k.Metrics) + '</span>' : '') +
        '<span class="mt-1 flex flex-wrap items-center gap-1.5"><span class="text-[11px] font-bold text-text-secondary">' + esc(k.KPI_ID) + '</span>' +
          durationPill(k.Duration, true) + '</span>' +
      '</td>' +
      '<td class="!px-2 !py-2 whitespace-nowrap"><span class="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ' + meta.tone + '"' +
        ' title="' + esc(targetHint(k)) + '"><span class="material-symbols-outlined text-[14px]">' + meta.icon + '</span>' + esc(meta.short) + '</span></td>' +
      '<td class="!px-2 !py-2 text-right tabular-nums whitespace-nowrap">' + esc(deepDiveTarget(k)) + '</td>' +
      '<td class="!px-2 !py-2 text-right tabular-nums whitespace-nowrap font-semibold">' + pct(k.WeightPercent) + '</td>' +
    '</tr>';
  }).join('');

  host.innerHTML =
    '<div class="bulk-panel-head">' +
      bulkStepHead(1, 'Review the KPIs', g.count + (g.count === 1 ? ' KPI' : ' KPIs') + ' • total weight ' + pct(g.percent)) +
      (g.valid ? ''
        : '<div class="px-4 py-2 bg-status-danger-subtle text-status-danger-text text-body-sm flex items-start gap-2 border-b border-red-100">' +
            '<span class="material-symbols-outlined text-[18px]">error</span>' +
            '<span>This group is not ready: ' + g.count + ' KPIs, total weight ' + num(g.percent, 1) + '%. Fix it in Master KPIs before assigning.</span></div>') +
    '</div>' +
    '<div class="bulk-panel-body">' +
      '<table class="data-table w-full text-[12px]">' +
        '<thead><tr>' +
          '<th class="w-8 !px-2 !py-2 text-center">No</th>' +
          '<th class="!px-2 !py-2">KPI Name</th>' +
          '<th class="!px-2 !py-2">Direction</th>' +
          '<th class="!px-2 !py-2 text-right">Target</th>' +
          '<th class="!px-2 !py-2 text-right">Weight</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
        '<tfoot><tr>' +
          '<td colspan="4" class="!px-2 !py-2 text-right font-semibold text-text-secondary">Total weight</td>' +
          '<td class="!px-2 !py-2 text-right tabular-nums font-bold ' + (g.valid ? 'text-status-success-text' : 'text-status-danger-text') + '">' + pct(g.percent) + '</td>' +
        '</tr></tfoot>' +
      '</table>' +
    '</div>';
}

function renderBulkList() {
  if (!S.bulk || !$('bulk-list')) return;
  var group = bulkGroup();
  var rows = bulkRows();

  $('bulk-list').innerHTML = !group
    ? '<p class="p-space-lg text-center text-body-sm text-text-muted">Select a role group first.</p>'
    : !rows.length
      ? '<p class="p-space-lg text-center text-body-sm text-text-muted">No employees match this filter.</p>'
      : rows.map(function (r) {
          var st = bulkState(r, group);
          var off = st.key === 'complete';
          return '<label class="flex items-center gap-space-sm px-space-md py-2.5' +
            (off ? ' opacity-60' : ' cursor-pointer hover:bg-slate-50') + '">' +
            '<input type="checkbox" class="rounded border-border-medium shrink-0"' + (off ? ' disabled' : '') +
              (S.bulk.niks[r.NIK] ? ' checked' : '') + ' onchange="MGI.toggleBulkNik(\'' + esc(r.NIK) + '\')">' +
            '<span class="emp-avatar shrink-0">' + esc(r.Initials || initials(r.Full_Name)) + '</span>' +
            '<span class="flex flex-col min-w-0 flex-1">' +
              '<span class="text-body-sm font-semibold text-text-primary truncate">' + esc(r.Full_Name) + '</span>' +
              '<span class="text-label-xs text-text-muted truncate">' + esc(r.NIK) + ' • ' +
                esc(r.Position) + ' / ' + esc(r.Department) + '</span>' +
            '</span>' +
            (bulkMatches(r, group) ? '' : '<span class="pill pill-warning !text-[11px] shrink-0">Different role</span>') +
            '<span class="pill ' + st.pill + ' !text-[11px] shrink-0">' + st.label + '</span>' +
          '</label>';
        }).join('');

  var picked = group ? (S.overview.rows || []).filter(function (r) { return S.bulk.niks[r.NIK]; }) : [];
  var fresh = picked.filter(function (r) { return bulkState(r, group).key === 'new'; }).length;
  var topup = picked.filter(function (r) { return bulkState(r, group).key === 'topup'; }).length;

  $('bulk-summary').textContent = !group
    ? 'Select a role group first.'
    : picked.length + ' selected, ' + fresh + ' new, ' + topup + ' to complete';
  $('bulk-apply').disabled = !group || !group.valid || !picked.length;
}

function setBulkGroup(key) {
  if (!S.bulk) return;
  S.bulk.roleKey = key;
  S.bulk.niks = {};
  closeBulkGroups();
  if ($('bulk-group-trigger')) $('bulk-group-trigger').innerHTML = bulkTriggerHtml();
  renderBulkGroups();
  renderBulkKpis();
  renderBulkList();
}

function onBulkGroupSearch(value) {
  if (!S.bulk) return;
  S.bulk.groupSearch = value;
  renderBulkGroups();
}

function setBulkDivision(value) {
  if (!S.bulk) return;
  S.bulk.division = value;
  renderBulkGroups();
}

function onBulkSearch(value) {
  if (!S.bulk) return;
  S.bulk.search = value;
  renderBulkList();
}

function toggleBulkMatch() {
  if (!S.bulk) return;
  S.bulk.matchOnly = !S.bulk.matchOnly;
  renderBulkList();
}

function toggleBulkNik(nik) {
  if (!S.bulk) return;
  if (S.bulk.niks[nik]) delete S.bulk.niks[nik];
  else S.bulk.niks[nik] = true;
  renderBulkList();
}

function selectAllBulk() {
  var group = bulkGroup();
  if (!group) return;
  bulkRows().forEach(function (r) {
    if (bulkState(r, group).key !== 'complete') S.bulk.niks[r.NIK] = true;
  });
  renderBulkList();
}

function clearBulkSelection() {
  if (!S.bulk) return;
  S.bulk.niks = {};
  renderBulkList();
}

function applyBulkAssign() {
  var group = bulkGroup();
  var niks = S.bulk ? Object.keys(S.bulk.niks) : [];
  if (!group || !niks.length) return;

  $('bulk-apply').disabled = true;
  api('assignRoleGroup', mapYear(), group.position, group.department, niks)
    .then(function (res) {
      closeBulkAssign();
      toast(res.message, 'success');
      loadOverview();
    })
    .catch(function (err) {
      if ($('bulk-apply')) $('bulk-apply').disabled = false;
      toast(err.message, 'error');
    });
}
