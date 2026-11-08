'use strict';

function initSummary() {
  if (!S.sumYear) S.sumYear = S.user.year;

  if (!$('sum-month').dataset.wired) {
    $('sum-month').dataset.wired = '1';
    fillYearOptions([S.user.year]);
    fillMonthOptions();
    $('sum-month').value = String(S.user.defaultMonth || new Date().getMonth() + 1);

    $('sum-year').addEventListener('change', onYearChange);
    $('sum-month').addEventListener('change', function () { loadSummary(); });
    $('sum-division').addEventListener('change', function () {
      S.sumPage = 1;
      S.annPage = 1;
      fillDeptOptions();
      renderActiveSummary();
    });
    $('sum-dept').addEventListener('change', function () {
      S.sumPage = 1;
      S.annPage = 1;
      renderActiveSummary();
    });
    $('sum-search').addEventListener('input', function () {
      clearTimeout(S.searchTimer);
      S.searchTimer = setTimeout(function () {
        S.sumPage = 1;
        S.annPage = 1;
        renderActiveSummary();
      }, 200);
    });
  }

  var jump = S.sumJump;
  S.sumJump = null;
  if (jump) {
    S.sumYear = jump.year;
    S.sumView = 'monthly';
    S.sumFilter = jump.filter || 'all';
    S.sumPage = 1;
    fillYearOptions([jump.year]);
    fillMonthOptions();
    $('sum-month').value = String(jump.month);
    $('sum-search').value = '';
    S.sumPick = { division: jump.division || '', department: jump.department || '' };
  }

  S.summary = null;
  S.annual = null;
  S.reports = {};
  applySumView();
  loadActiveSummary();
}

function openSummaryFor(year, month, filter, division, department) {
  S.sumJump = { year: parseInt(year, 10) || S.user.year, month: parseInt(month, 10) || 1, filter: filter || 'all',
                division: division || '', department: department || '' };
  go('summary');
}

function activeSumYear() {
  return S.sumYear || S.user.year;
}

function loadActiveSummary() {
  if (S.sumView === 'annual') {
    loadAnnualRecap();
  } else {
    loadSummary();
  }
}

function renderActiveSummary() {
  if (S.sumView === 'annual') renderAnnual();
  else applySummaryFilters();
}

function applySumView() {
  var annual = S.sumView === 'annual';
  $('sum-monthly-panel').classList.toggle('hidden', annual);
  $('sum-annual-panel').classList.toggle('hidden', !annual);
  $('sum-month-field').classList.toggle('hidden', annual);
  $('sum-report-btn').classList.toggle('hidden', annual);
  document.querySelectorAll('#sum-view-tabs [data-sum-view]').forEach(function (b) {
    var on = b.dataset.sumView === S.sumView;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
}

function setSumView(view) {
  S.sumView = view === 'annual' ? 'annual' : 'monthly';
  applySumView();

  if (S.sumView === 'annual') {
    if (S.annual && S.annual.year === activeSumYear()) {
      fillSumFilters();
      renderAnnual();
    } else {
      loadAnnualRecap();
    }
    return;
  }

  if (S.summary && S.summary.year === activeSumYear()) {
    fillSumFilters();
    applySummaryFilters();
  } else {
    loadSummary();
  }
}

function onYearChange() {
  var year = parseInt($('sum-year').value, 10);
  if (!year || year === activeSumYear()) return;
  S.sumYear = year;
  S.summary = null;
  S.annual = null;
  S.sumPage = 1;
  S.annPage = 1;
  fillMonthOptions();
  loadActiveSummary();
}

function fillYearOptions(years) {
  var sel = $('sum-year');
  var set = {};
  var add = function (y) {
    var n = parseInt(y, 10);
    if (n) set[n] = true;
  };
  [S.user.year, S.sumYear].concat(years || []).forEach(add);
  Array.prototype.forEach.call(sel.options || [], function (o) { add(o.value); });

  sel.innerHTML = Object.keys(set)
    .map(function (y) { return parseInt(y, 10); })
    .sort(function (a, b) { return b - a; })
    .map(function (y) {
      return '<option value="' + y + '">' + y + (y === S.user.year ? ' (Active)' : '') + '</option>';
    }).join('');
  sel.value = String(activeSumYear());
}

function fillMonthOptions() {
  var sel = $('sum-month');
  var keep = sel.value;
  var year = activeSumYear();
  sel.innerHTML = MONTHS.map(function (m, i) {
    return '<option value="' + (i + 1) + '">' + m + ' ' + year + '</option>';
  }).join('');
  if (keep) sel.value = keep;
}

function sumData() {
  return S.sumView === 'annual' ? S.annual : S.summary;
}

function sumDivision() {
  var sel = $('sum-division');
  return sel ? sel.value : '';
}

function fillSumFilters() {
  fillSumDivisions();
  fillDeptOptions();
}

function fillSumDivisions() {
  var sel = $('sum-division');
  var data = sumData();
  if (!sel || !data) return;
  var keep = S.sumPick ? S.sumPick.division : sel.value;
  var list = distinct(data.rows || [], 'Division');
  sel.innerHTML = '<option value="">All Divisions</option>' +
    list.map(function (d) {
      return '<option value="' + esc(d) + '">' + esc(d) + '</option>';
    }).join('');
  sel.value = list.indexOf(keep) > -1 ? keep : '';
}

function fillDeptOptions() {
  var dept = $('sum-dept');
  var data = sumData();
  if (!data) return;
  var division = sumDivision();
  var list = division
    ? distinct((data.rows || []).filter(function (r) { return eqiJs(r.Division, division); }), 'Department')
    : (data.departments || []);
  var keep = S.sumPick ? S.sumPick.department : dept.value;
  S.sumPick = null;
  dept.innerHTML = '<option value="">All Departments</option>' +
    list.map(function (d) {
      return '<option value="' + esc(d) + '">' + esc(d) + '</option>';
    }).join('');
  dept.value = list.indexOf(keep) > -1 ? keep : '';
}

function loadSummary() {
  $('sum-tbody').innerHTML = skeletonRows(5, 6);
  S.sumPage = 1;
  var year = activeSumYear();

  api('getAdminSummary', year, parseInt($('sum-month').value, 10), {})
    .then(function (data) {
      if (data.year !== activeSumYear()) return;
      S.summary = data;
      syncBands(data.bands);
      renderScopeBanner('sum-scope', data.scope);
      fillYearOptions(data.years);
      if (S.sumView === 'monthly') fillSumFilters();
      applySummaryFilters();
    })
    .catch(function (err) {
      $('sum-tbody').innerHTML =
        '<tr><td colspan="5" class="text-center text-status-danger py-space-xl">' + esc(err.message) + '</td></tr>';
      toast(err.message, 'error');
    });
}

function baseRows() {
  if (!S.summary) return [];
  var division = sumDivision();
  var dept = $('sum-dept').value;
  var q = ($('sum-search').value || '').trim().toLowerCase();
  return S.summary.rows.filter(function (r) {
    if (division && !eqiJs(r.Division, division)) return false;
    if (dept && !eqiJs(r.Department, dept)) return false;
    if (q && (r.Full_Name + ' ' + r.NIK).toLowerCase().indexOf(q) === -1) return false;
    return true;
  });
}

function filteredRows() {
  return sortedBy(baseRows().filter(function (r) {
    if (S.sumFilter === 'done')    return r.submitted > 0;
    if (S.sumFilter === 'pending') return r.submitted === 0;
    if (S.sumFilter === 'locked')  return rowChangeLocked(r);
    return true;
  }), S.sumSort, sumSortValue);
}

function sumMonthOpen() {
  return !!(S.summary && S.summary.periodState && S.summary.periodState.isOpen);
}

function rowChangeLocked(r) {
  return sumMonthOpen() && !!(r.changes && r.changes.submitted && r.changes.left <= 0);
}

function changeInfo(r) {
  var c = r.changes;
  if (!c || !c.submitted || !sumMonthOpen()) return '';
  if (c.left > 0) {
    return '<span class="block mt-1 text-[11px] text-text-muted" title="Changes left after the first submission">' + plural(c.left, 'change') + ' left</span>';
  }
  return '<span class="block mt-1 text-[11px] font-semibold text-status-warning-text">No changes left</span>' +
    (S.user && S.user.isAdmin
      ? '<button type="button" class="mt-1 text-[11px] font-semibold text-primary-container rounded-md px-1.5 py-0.5 transition-all duration-150 hover:bg-brand-50"' +
          ' onclick="MGI.openAllowChange(\'' + esc(r.NIK) + '\', \'' + esc(r.roleKey) + '\')">Allow 1 more change</button>'
      : '');
}

function allowTarget() {
  var t = S.allowChange;
  if (!t || !S.summary) return null;
  return S.summary.rows.filter(function (r) { return r.NIK === t.nik && r.roleKey === t.roleKey; })[0] || null;
}

function openAllowChange(nik, roleKey) {
  S.allowChange = { nik: nik, roleKey: roleKey };
  var r = allowTarget();
  if (!r) return;
  var c = r.changes || { allowed: 2 };
  $('modal-host').innerHTML =
    '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closeAllowChange()">' +
      '<div class="modal-panel !max-w-md">' +
        '<div class="px-6 pt-6 pb-5 flex items-start gap-4">' +
          '<span class="w-10 h-10 rounded-full bg-brand-50 text-primary-container flex items-center justify-center shrink-0">' +
            '<span class="material-symbols-outlined text-[22px]">lock_open</span></span>' +
          '<div class="min-w-0">' +
            '<h2 class="text-title-lg text-text-primary">Allow one more change?</h2>' +
            '<p class="text-body-sm text-text-secondary mt-1"><strong>' + esc(r.Full_Name) + '</strong> has used ' +
              (c.allowed === 2 ? 'both changes' : 'all ' + c.allowed + ' changes') + ' for <strong>' + esc(r.Position + ' / ' + r.Department) + '</strong> in ' +
              esc(sumMonthName()) + '. Allowing one more lets them submit once more. Your name is recorded with it.</p>' +
          '</div>' +
        '</div>' +
        '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex items-center justify-end gap-space-sm">' +
          '<button class="btn btn-secondary" onclick="MGI.closeAllowChange()">Cancel</button>' +
          '<button id="allow-confirm" class="btn btn-primary" onclick="MGI.confirmAllowChange()">' +
            '<span class="material-symbols-outlined text-[18px]">lock_open</span> Allow 1 more change</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function closeAllowChange() {
  S.allowChange = null;
  $('modal-host').innerHTML = '';
}

function confirmAllowChange() {
  var d = S.summary;
  var t = S.allowChange;
  if (!d || !t) return;
  var restore = busy($('allow-confirm'), 'Saving');
  api('allowSubmissionChange', d.period, t.nik, t.roleKey)
    .then(function (res) {
      restore();
      closeAllowChange();
      if (S.summary !== d) return;
      d.rows.forEach(function (r) { if (r.NIK === t.nik && r.roleKey === t.roleKey) r.changes = res.changes; });
      toast(res.message + ' Let them know.', 'success');
      applySummaryFilters();
    })
    .catch(function (err) {
      restore();
      toast(err.message, 'error');
    });
}

var SUM_STATUS_ORDER = { 'pending': 0, 'partial': 1, 'no-evidence': 2, 'submitted': 3, 'verified': 3 };

function sumSortValue(r, key) {
  if (key === 'name') return r.Full_Name;
  if (key === 'score') return r.submitted === 0 ? null : r.index;
  if (key === 'status') return SUM_STATUS_ORDER[r.statusKey];
  return null;
}

function sortedBy(rows, sort, value) {
  if (!sort) return rows;
  return rows.slice().sort(function (a, b) {
    var x = value(a, sort.key);
    var y = value(b, sort.key);
    var xEmpty = x === null || x === undefined;
    var yEmpty = y === null || y === undefined;
    if (xEmpty || yEmpty) return xEmpty === yEmpty ? 0 : xEmpty ? 1 : -1;
    if (typeof x === 'string') return x.localeCompare(y) * sort.dir;
    return x === y ? 0 : (x < y ? -1 : 1) * sort.dir;
  });
}

function nextSort(current, key, first) {
  return current && current.key === key ? { key: key, dir: -current.dir } : { key: key, dir: first };
}

function sortHead(label, key, sort, fn, cls, extra) {
  var on = !!(sort && sort.key === key);
  return '<th scope="col" class="' + (cls || '') + '" aria-sort="' + (!on ? 'none' : sort.dir > 0 ? 'ascending' : 'descending') + '">' +
    '<button type="button" class="th-sort' + (on ? ' is-sorted' : '') + '" onclick="MGI.' + fn + '(\'' + key + '\')" title="Sort by ' + esc(label) + '">' +
      esc(label) + '<span class="material-symbols-outlined" aria-hidden="true">' + (!on ? 'unfold_more' : sort.dir > 0 ? 'arrow_upward' : 'arrow_downward') + '</span>' +
    '</button>' + (extra || '') + '</th>';
}

function renderSummaryHead() {
  var host = $('sum-thead');
  if (!host) return;
  host.innerHTML = '<tr>' +
    sortHead('Employee', 'name', S.sumSort, 'sortSummary', 'min-w-[260px]') +
    '<th class="min-w-[240px]">Score per KPI</th>' +
    sortHead('Total Score', 'score', S.sumSort, 'sortSummary', 'text-right') +
    sortHead('Status', 'status', S.sumSort, 'sortSummary', 'text-center') +
    '<th class="text-center">Evidence</th>' +
  '</tr>';
}

function sortSummary(key) {
  S.sumSort = nextSort(S.sumSort, key, key === 'score' ? -1 : 1);
  S.sumPage = 1;
  renderSummaryHead();
  renderSummaryTable();
}

function reminderNeed(row) {
  if (!row || row.roleInactive) return null;
  var due = (row.items || []).filter(function (it) { return it.InCycle && it.IsActive !== false; });
  if (!due.length) return null;
  var missing = due.filter(function (it) { return !isNum(it.Realization); }).length;
  var needsEvidence = !row.evidence && !row.evidenceOptional;
  if (!missing && !needsEvidence) return null;
  return { missingKpis: missing, needsEvidence: needsEvidence };
}

function sameDay(iso, now) {
  var d = new Date(iso);
  return !isNaN(d.getTime()) && d.toDateString() === (now || new Date()).toDateString();
}

function reminderLabel(iso) {
  return sameDay(iso) ? 'Reminded today' : 'Reminded ' + shortDate(iso);
}

function reminderTargets() {
  var d = S.summary;
  if (!d || !d.reminders || !d.periodState || !d.periodState.isOpen) return [];
  var seen = {};
  var out = [];
  baseRows().forEach(function (r) {
    if (seen[r.NIK] || !reminderNeed(r)) return;
    seen[r.NIK] = true;
    out.push({ NIK: r.NIK, Full_Name: r.Full_Name, remindedAt: d.reminders[r.NIK] || '' });
  });
  return out;
}

function renderSumRemind() {
  var host = $('sum-remind');
  if (!host) return;
  var list = reminderTargets();
  var waiting = list.filter(function (t) { return !(t.remindedAt && sameDay(t.remindedAt)); }).length;
  host.innerHTML = waiting
    ? '<button type="button" class="btn btn-secondary !py-1.5 !px-3 !text-label-sm" onclick="MGI.openReminders()" title="Email everyone in this view who still has KPIs or the evidence file missing">' +
        '<span class="material-symbols-outlined text-[18px]">notifications_active</span> Send Reminder' +
        '<span class="pill pill-maroon !py-0 !px-1.5 !text-[11px]">' + waiting + '</span></button>'
    : list.length
      ? '<span class="pill pill-neutral !text-[11px]" title="Everyone in this view who still has something missing already had a reminder today">' +
          '<span class="material-symbols-outlined text-[14px]">notifications_paused</span> Everyone reminded today</span>'
      : '';
}

function openReminders() {
  var list = reminderTargets();
  if (!list.length) return;
  var d = S.summary;
  var today = list.filter(function (t) { return t.remindedAt && sameDay(t.remindedAt); });
  var waiting = list.filter(function (t) { return !(t.remindedAt && sameDay(t.remindedAt)); });
  var room = Math.max(0, d.mailRoom || 0);
  var willSend = Math.min(waiting.length, room);
  var month = sumMonthName();
  var shown = waiting.slice(0, 6).map(function (t) { return esc(displayName(t.Full_Name)); });
  S.reminderNiks = list.map(function (t) { return t.NIK; });

  var notes = [];
  if (d.periodState.cutoff) notes.push(['event', 'The email says ' + esc(MONTHS[d.month - 1]) + ' is open until ' + esc(fmtDate(d.periodState.cutoff)) + '.']);
  if (today.length) notes.push(['history', plural(today.length, 'person', 'people') + ' already had a reminder today and will be skipped.']);
  if (room < waiting.length) notes.push(['mark_email_unread', 'The daily email limit leaves room for ' + plural(room, 'email') + ' today. Send again tomorrow for the rest.']);

  $('modal-host').innerHTML =
    '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closeReminders()">' +
      '<div class="modal-panel !max-w-md">' +
        '<div class="px-6 pt-6 pb-5 flex items-start gap-4">' +
          '<span class="w-10 h-10 rounded-full bg-brand-50 text-primary-container flex items-center justify-center shrink-0">' +
            '<span class="material-symbols-outlined text-[22px]">notifications_active</span></span>' +
          '<div class="min-w-0">' +
            '<h2 class="text-title-lg text-text-primary">Send a reminder for ' + esc(month) + '?</h2>' +
            '<p class="text-body-sm text-text-secondary mt-1">' +
              (waiting.length
                ? '<strong>' + plural(waiting.length, 'person', 'people') + '</strong> in this view still ' + (waiting.length === 1 ? 'has' : 'have') +
                  ' KPIs or the evidence file missing. Each gets one email that lists what is left, with a link to My KPIs.'
                : 'Everyone in this view who still has something missing already had a reminder today.') + '</p>' +
            (shown.length
              ? '<p class="text-label-sm text-text-muted mt-2">' + shown.join(', ') + (waiting.length > shown.length ? ' and ' + (waiting.length - shown.length) + ' more' : '') + '</p>'
              : '') +
            (notes.length
              ? '<ul class="mt-space-md flex flex-col gap-1.5">' + notes.map(function (n) {
                  return '<li class="flex items-start gap-2 text-body-sm text-text-secondary"><span class="material-symbols-outlined text-[18px] text-text-muted shrink-0">' + n[0] + '</span><span>' + n[1] + '</span></li>';
                }).join('') + '</ul>'
              : '') +
          '</div>' +
        '</div>' +
        '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex items-center justify-end gap-space-sm">' +
          '<button class="btn btn-secondary" onclick="MGI.closeReminders()">' + (willSend ? 'Cancel' : 'Close') + '</button>' +
          (willSend
            ? '<button id="reminder-send" class="btn btn-primary" onclick="MGI.confirmReminders()">' +
                '<span class="material-symbols-outlined text-[18px]">send</span> Send ' + plural(willSend, 'Reminder') + '</button>'
            : '') +
        '</div>' +
      '</div>' +
    '</div>';
}

function closeReminders() {
  $('modal-host').innerHTML = '';
}

function confirmReminders() {
  var d = S.summary;
  if (!d || !S.reminderNiks.length) return;
  var restore = busy($('reminder-send'), 'Sending');
  api('sendSubmissionReminders', d.period, S.reminderNiks)
    .then(function (res) {
      restore();
      closeReminders();
      if (S.summary !== d) return;
      (res.sentNiks || []).forEach(function (nik) { d.reminders[nik] = res.remindedAt; });
      d.mailRoom = res.mailRoom;
      toast(res.message, res.sent ? 'success' : 'warning');
      renderSumRemind();
      renderSummaryTable();
    })
    .catch(function (err) {
      restore();
      toast(err.message, 'error');
    });
}

function applySummaryFilters() {
  if (!S.summary) return;
  renderSummaryStats();
  renderSummaryTabs();
  renderSumRemind();
  renderSummaryHead();
  renderSummaryTable();
  renderDistribution();
}

function summaryStats(rows) {
  var niks = {};
  var dist = { sangatBaik: 0, baik: 0, perluPerhatian: 0, total: 0 };
  var sum = 0;
  var pending = 0;
  var evidence = 0;

  rows.forEach(function (r) {
    niks[r.NIK] = true;
    if (r.evidence) evidence++;
    if (r.submitted === 0) { pending++; return; }
    dist.total++;
    sum += r.index;
    var key = band(r.index).key;
    if (key === 'success') dist.sangatBaik++;
    else if (key === 'info') dist.baik++;
    else dist.perluPerhatian++;
  });

  return {
    employees: Object.keys(niks).length,
    roles: rows.length,
    avg: dist.total ? Math.round(sum / dist.total * 10) / 10 : 0,
    pending: pending,
    evidence: evidence,
    dist: dist,
    submittedPercent: rows.length ? Math.round((rows.length - pending) / rows.length * 1000) / 10 : 0
  };
}

function sumMonthName() {
  return S.summary ? MONTHS[S.summary.month - 1] + ' ' + S.summary.year : '';
}

function sumPeriodNote(pending) {
  var ps = S.summary.periodState || {};
  var month = MONTHS[S.summary.month - 1];
  if (!pending) return 'Everyone in this view has submitted for ' + month + '.';
  if (ps.isOpen) return month + ' is open until ' + fmtDate(ps.cutoff) + '.';
  if (ps.rawOpen && ps.expired) return month + ' closed on ' + fmtDate(ps.cutoff) + '.';
  return month + ' is not open for submission.';
}

function renderSummaryStats() {
  var st = summaryStats(baseRows());
  var done = st.roles - st.pending;
  var open = !!(S.summary.periodState && S.summary.periodState.isOpen);
  var avgBand = st.dist.total ? band(st.avg) : null;

  $('sum-stats').innerHTML =
    statCard('Submitted', 'task_alt', 'text-text-primary',
      done, 'of ' + plural(st.roles, 'role'),
      st.roles ? pct(st.submittedPercent) + ' of scorecards for ' + esc(sumMonthName()) +
                 (st.employees !== st.roles ? ' • ' + plural(st.employees, 'employee') : '')
               : 'No scorecards in this view',
      'bg-status-success', st.submittedPercent) +

    statCard(open ? 'Not Submitted Yet' : 'Not Submitted', 'pending_actions', st.pending ? 'text-status-warning' : 'text-status-success',
      st.pending, st.pending === 1 ? 'Role' : 'Roles',
      esc(sumPeriodNote(st.pending)),
      '', 0) +

    statCard('Average Score', 'trending_up', avgBand ? 'text-status-' + avgBand.key + '-text' : 'text-text-muted',
      avgBand ? num(st.avg) : '-', avgBand ? '/ 100' : '',
      avgBand ? 'Rating: ' + esc(avgBand.label) + ', average of ' + plural(st.dist.total, 'submitted role') : 'No roles scored yet',
      avgBand ? 'bg-status-' + avgBand.key : '', st.avg) +

    statCard('Evidence on File', 'folder_open', 'text-text-primary',
      st.evidence, done ? 'of ' + plural(done, 'submitted role') : 'Roles',
      'Stored in the MGI Google Drive',
      'bg-status-info', done ? Math.min(100, st.evidence / done * 100) : 0);
}
