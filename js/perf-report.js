'use strict';

function openPerformanceReport(nik, roleKey, year, surface) {
  var target = {
    nik: nik || S.user.NIK,
    roleKey: roleKey || '',
    year: parseInt(year, 10) || S.user.year,
    surface: surface === 'inline' ? 'inline' : 'modal'
  };
  S.report = target;

  if (S.reports[target.nik + '|' + target.year]) {
    renderPerformanceReport();
    return;
  }

  if (target.surface === 'inline') {
    $('emp-annual-report').innerHTML =
      '<div class="bg-surface-card rounded-xl shadow-level-1 border border-border-light p-space-lg">' +
        '<div class="skeleton h-6 w-1/3 mb-3"></div><div class="skeleton h-48 w-full"></div>' +
      '</div>';
  } else {
    $('modal-host').innerHTML =
      '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closePerformanceReport()">' +
        '<div class="modal-panel !max-w-xs p-space-lg flex items-center gap-space-sm">' +
          '<span class="spinner spinner-dark"></span>' +
          '<span class="text-body-md text-text-secondary">Loading performance report</span>' +
        '</div>' +
      '</div>';
  }

  api('getPerformanceReport', target.nik, target.year)
    .then(function (data) {
      S.reports[target.nik + '|' + target.year] = data;
      if (S.report === target) renderPerformanceReport();
    })
    .catch(function (err) {
      if (S.report === target) {
        if (target.surface === 'inline') {
          $('emp-annual-report').innerHTML =
            '<div class="bg-surface-card rounded-xl border border-border-light p-space-xl text-center text-status-danger">' +
            esc(err.message) + '</div>';
        } else {
          closePerformanceReport();
        }
      }
      toast(err.message, 'error');
    });
}

function closePerformanceReport() {
  destroyDeepDiveCharts('ddm');
  if (!S.report || S.report.surface === 'modal') S.report = null;
  $('modal-host').innerHTML = '';
}

function setReportRole(key) {
  if (!S.report) return;
  S.report.roleKey = key;
  renderPerformanceReport();
}

function onReportYearChange(value) {
  if (!S.report) return;
  openPerformanceReport(S.report.nik, S.report.roleKey, value, S.report.surface);
}

function setEmpView(view) {
  S.empView = view === 'annual' ? 'annual' : 'monthly';
  $('emp-monthly-panel').classList.toggle('hidden', S.empView !== 'monthly');
  $('emp-annual-panel').classList.toggle('hidden', S.empView !== 'annual');
  document.querySelectorAll('#emp-view-tabs [data-emp-view]').forEach(function (b) {
    var on = b.dataset.empView === S.empView;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  if (S.empView !== 'annual') return;

  var inline = S.report && S.report.surface === 'inline' ? S.report : null;
  openPerformanceReport(S.user.NIK, inline ? inline.roleKey : '', inline ? inline.year : S.user.year, 'inline');
}

function tierClass(score) {
  var sc = Number(score);
  return sc >= 0.95 ? 'mx-t10' : sc >= 0.75 ? 'mx-t08' : sc >= 0.55 ? 'mx-t06' : sc >= 0.35 ? 'mx-t04' : 'mx-t02';
}

function renderPerformanceReport() {
  var t = S.report;
  var data = t ? S.reports[t.nik + '|' + t.year] : null;
  if (!data) return;

  var roles = data.roles || [];
  var role = roles.filter(function (r) { return r.roleKey === t.roleKey; })[0] ||
             roles.filter(function (r) { return r.isHome && !r.roleInactive; })[0] ||
             roles.filter(function (r) { return !r.roleInactive; })[0] || roles[0] || null;
  if (role) t.roleKey = role.roleKey;

  var html = reportHtml(data, role, t.surface);
  if (t.surface === 'inline') {
    var host = $('emp-annual-report');
    if (host) host.innerHTML = html;
    renderDeepDiveCharts(data, role);
    return;
  }

  $('modal-host').innerHTML =
    '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closePerformanceReport()">' +
      '<div class="modal-panel !max-w-[95vw]">' + html + '</div>' +
    '</div>';
  renderDeepDiveCharts(data, role);
}

function setReportTab(tab) {
  S.reportTab = tab === 'analytics' ? 'analytics' : 'matrix';
  renderPerformanceReport();
}

function toggleDeepDive(index) {
  var t = S.report;
  var data = t ? S.reports[t.nik + '|' + t.year] : null;
  if (!data) return;
  var role = (data.roles || []).filter(function (r) { return r.roleKey === t.roleKey; })[0];
  var k = role && role.kpis ? role.kpis[index] : null;
  if (!k) return;
  S.deepOpen[role.roleKey + '|' + k.KPI_ID] = !deepDiveIsOpen(role, k, index);
  renderPerformanceReport();
}

function reportThemeLine(data) {
  if (!data || !data.theme) return '';
  return '<p class="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-brand-50 border border-brand-100 px-2.5 py-0.5 text-label-sm font-semibold text-brand-maroon-dark">' +
    '<span class="material-symbols-outlined text-[16px]">flag</span>FY' + esc(data.year) + ' theme: ' + esc(data.theme) + '</p>';
}

function reportChipHtml(label, value) {
  return '<div class="report-chip">' +
    '<span class="text-label-xs uppercase tracking-wider text-text-muted">' + esc(label) + '</span>' +
    '<span class="text-label-md font-semibold text-text-primary truncate">' + esc(value || '-') + '</span>' +
  '</div>';
}

function summaryNote(data) {
  var trial = data.trialMonths || [];
  var counted = MONTHS.filter(function (m, i) { return trial.indexOf(i + 1) === -1; });
  var countedLabel = counted.length ? counted[0].substring(0, 3) + ' to ' + counted[counted.length - 1].substring(0, 3) : 'no months';
  var trialNames = trial.map(function (m) { return MONTHS[m - 1]; }).join(', ');
  return '*Avg KPI Score calculated for ' + esc(countedLabel) + ' ' + data.year + '.' +
    (trialNames ? ' ' + esc(trialNames) + (trial.length > 1 ? ' are trial months.' : ' is a trial month.') : '');
}

function reportHtml(data, role, surface) {
  var modal = surface !== 'inline';
  var emp = data.employee || {};
  var roles = data.roles || [];

  var years = (data.years && data.years.length ? data.years : [data.year]).map(function (y) {
    return '<option value="' + y + '"' + (y === data.year ? ' selected' : '') + '>' + y + '</option>';
  }).join('');

  var chip = reportChipHtml;
  var pdfButton = role
    ? '<button type="button" id="report-pdf-' + (modal ? 'modal' : 'inline') + '" class="btn btn-secondary !py-1.5 whitespace-nowrap"' +
      ' onclick="MGI.downloadPerformancePdf()" title="Download the full report with every KPI as a PDF">' +
      '<span class="material-symbols-outlined text-[18px]">picture_as_pdf</span> Download PDF</button>'
    : '';

  var tabs = roles.length > 1
    ? '<div class="seg flex-wrap mt-space-md">' + roles.map(function (r) {
        return '<button type="button" class="seg-btn' + (role && r.roleKey === role.roleKey ? ' is-active' : '') + '"' +
          ' onclick="MGI.setReportRole(\'' + esc(r.roleKey) + '\')">' + esc(r.roleLabel) +
          (r.roleInactive ? '<span class="pill pill-neutral !py-0 !px-1.5 !text-[11px]">Inactive</span>' : '') + '</button>';
      }).join('') + '</div>'
    : '';

  var header =
    '<div class="' + (modal ? 'px-6 py-5 border-b border-border-light' : 'bg-surface-card rounded-xl shadow-level-1 border border-border-light p-space-lg mb-space-lg') + '">' +
      '<div class="flex flex-col md:flex-row md:items-center justify-between gap-space-md">' +
        '<div class="min-w-0">' +
          '<h2 class="text-headline-md font-bold text-slate-900 tracking-tight">' + (role ? esc(role.roleLabel) : 'No KPI mapping') + '</h2>' +
          '<p class="text-sm text-slate-500 mt-0.5">Performance evaluation report • FY' + esc(data.year) + '</p>' +
          reportThemeLine(data) +
        '</div>' +
        '<div class="flex items-center gap-space-sm shrink-0">' +
          '<label for="report-year-' + (modal ? 'modal' : 'inline') + '" class="text-xs font-semibold text-slate-600">Year</label>' +
          '<select id="report-year-' + (modal ? 'modal' : 'inline') + '" class="field !w-auto !py-1.5" onchange="MGI.onReportYearChange(this.value)">' + years + '</select>' +
          pdfButton +
          (modal && role && $('view-summary')
            ? '<button type="button" class="btn btn-secondary !py-1.5 whitespace-nowrap" onclick="MGI.compareFromReport()" title="Compare this scorecard with another employee">' +
              '<span class="material-symbols-outlined text-[18px]">compare_arrows</span> Compare with...</button>'
            : '') +
          (modal ? '<button class="btn-icon" onclick="MGI.closePerformanceReport()" title="Close" aria-label="Close"><span class="material-symbols-outlined">close</span></button>' : '') +
        '</div>' +
      '</div>' +
      '<div class="grid grid-cols-2 lg:grid-cols-4 gap-space-sm mt-space-md">' +
        chip('Full Name', emp.Full_Name) +
        chip('NIK', emp.NIK) +
        chip('Position', role ? role.Position : emp.Position) +
        chip('Department', role ? role.Department : emp.Department) +
      '</div>' +
      tabs +
    '</div>';

  if (!role) {
    return header +
      '<div class="' + (modal ? 'p-space-lg' : '') + '">' +
        '<div class="bg-surface-card rounded-xl border border-dashed border-border-medium p-space-xl text-center">' +
          '<span class="material-symbols-outlined text-[40px] text-text-muted">table_chart</span>' +
          '<p class="text-body-md text-text-secondary mt-2">No KPI mapping found for ' + data.year + '.</p>' +
        '</div>' +
      '</div>';
  }

  var summary = executiveSummaryHtml(data, role, modal, summaryNote(data));

  var viewTabs =
    '<div class="seg mt-space-md" role="tablist">' +
      '<button type="button" class="seg-btn' + (S.reportTab === 'analytics' ? '' : ' is-active') + '"' +
        ' onclick="MGI.setReportTab(\'matrix\')">' +
        '<span class="material-symbols-outlined text-[18px]">table_chart</span> Matrix Overview</button>' +
      '<button type="button" class="seg-btn' + (S.reportTab === 'analytics' ? ' is-active' : '') + '"' +
        ' onclick="MGI.setReportTab(\'analytics\')">' +
        '<span class="material-symbols-outlined text-[18px]">query_stats</span> Deep-Dive Analytics</button>' +
    '</div>';

  var panel = S.reportTab === 'analytics' ? deepDivePanelHtml(data, role, surface) : matrixPanelHtml(data, role, modal);

  return header + '<div class="' + (modal ? 'p-space-lg' : '') + '">' + summary + viewTabs +
    '<div class="mt-space-md">' + panel + '</div>' +
  '</div>';
}

function executiveSummaryHtml(data, role, modal, note) {
  var perf = data.performance || null;
  var rules = perf ? perf.rules : null;
  var ev = role.evaluation || null;
  var avgRaw = role.avgKpi !== undefined ? role.avgKpi : role.avgScore;
  var avg = isNum(avgRaw) ? Number(avgRaw) : null;
  var weight = function (key) { return rules ? num(rules.weights[key], 2) + '% weight' : ''; };
  var trial = data.trialMonths || [];
  var counted = MONTHS.filter(function (m, i) { return trial.indexOf(i + 1) === -1; });
  var span = counted.length ? counted[0].substring(0, 3) + ' to ' + counted[counted.length - 1].substring(0, 3) : 'No counted months';

  var tile = function (label, value, caption) {
    return '<div class="rounded-lg border border-border-light bg-white px-3 py-2.5 min-w-0 flex flex-col">' +
      '<span class="text-label-xs uppercase tracking-wider text-text-muted truncate" title="' + esc(label) + '">' + esc(label) + '</span>' +
      '<span class="mt-1 text-headline-md font-bold tabular-nums leading-tight">' + value + '</span>' +
      '<span class="mt-auto pt-0.5 text-[11px] text-text-muted truncate">' + (caption || '&nbsp;') + '</span>' +
    '</div>';
  };

  var tiles = [
    tile('KPI Months', '<span class="text-text-primary">' + role.kpiMonths + '</span>', esc(span)),
    tile('Avg KPI Score', avg === null ? '<span class="text-text-muted">-</span>'
      : '<span class="text-status-' + band(avg).key + '-text">' + avg.toFixed(2) + '%</span>', weight('kpi'))
  ];
  var result = '';
  var calc = '';
  var pills = '';
  var extra = '';

  if (perf && perf.visible && ev) {
    ['kbi', 's360', 'discipline'].forEach(function (key) {
      if (!(Number(rules.weights[key]) > 0)) return;
      var label = key === 'discipline' ? 'Discipline' : perfComponent(key).label + ' Score';
      tiles.push(tile(label, isNum(ev[key]) ? '<span class="text-text-primary">' + num(ev[key], 2) + '</span>'
        : '<span class="text-text-muted text-title-md">Pending</span>', weight(key)));
    });
    result = finalResultHtml(ev, rules);
    calc = scoreCalcHtml(ev);

    pills = rules.released
      ? '<span class="pill pill-success !text-[11px]"><span class="material-symbols-outlined text-[14px]">verified</span>Released ' + esc(fmtDate(rules.releasedAt)) + '</span>'
      : '<span class="pill pill-neutral !text-[11px]" title="Employees cannot see these results yet">Draft, not released</span>';
    if (ev.spLevel || ev.remarks) {
      pills += spPill(ev.spLevel, ev.remarks);
      extra = '<p class="mt-space-sm text-label-xs text-text-muted"><strong class="text-text-secondary">Remarks SP:</strong> ' +
        esc(ev.remarks || 'No remarks') + '</p>';
    }
    note += ' Performance Score = ' + esc(perfFormulaText(rules)) + '.';
  } else if (perf && !perf.visible) {
    result = '<div class="h-full rounded-xl border border-dashed border-border-medium bg-white p-4 flex items-center gap-3">' +
      '<span class="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">' +
        '<span class="material-symbols-outlined text-[22px]">lock_clock</span></span>' +
      '<div class="min-w-0"><p class="text-label-xs uppercase tracking-wider text-text-muted">Final Result</p>' +
        '<p class="text-body-sm text-text-secondary">Your Performance Score and Grade for FY' + data.year + ' will appear here after HR releases the results.</p></div>' +
    '</div>';
  }

  return '<div class="rounded-xl border border-border-light p-space-md mb-space-lg ' + (modal ? 'bg-surface-page' : 'bg-surface-card shadow-level-1') + '">' +
    '<div class="flex flex-col sm:flex-row sm:items-start justify-between gap-space-sm">' +
      '<div class="min-w-0">' +
        '<h3 class="text-title-md text-text-primary">Executive Summary</h3>' +
        '<p class="text-label-xs text-text-muted mt-1">' + note + '</p>' +
      '</div>' +
      (pills ? '<div class="flex flex-wrap items-center gap-1.5 shrink-0">' + pills + '</div>' : '') +
    '</div>' +
    '<div class="grid grid-cols-1 xl:grid-cols-12 items-stretch gap-3 mt-space-md">' +
      '<div class="' + (result ? 'xl:col-span-8' : 'xl:col-span-12') + ' h-full flex flex-col gap-2 min-w-0">' +
        '<div class="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">' + tiles.join('') + '</div>' +
        calc +
      '</div>' +
      (result ? '<div class="xl:col-span-4">' + result + '</div>' : '') +
    '</div>' +
    extra +
  '</div>';
}

function scoreCalcHtml(ev) {
  var parts = (ev.parts || []).filter(function (p) { return p.required; });
  if (!parts.length) return '';
  var terms = parts.map(function (p) {
    return '<span class="inline-flex items-baseline gap-1 whitespace-nowrap" title="' + esc(p.label) + '">' +
      '<span class="text-label-xs text-text-muted">' + esc(p.label) + '</span>' +
      '<span class="font-semibold tabular-nums ' + (isNum(p.value) ? 'text-text-primary' : 'text-status-warning-text') + '">' +
        (isNum(p.value) ? num(p.value, 2) : '?') + '</span>' +
      '<span class="text-text-muted tabular-nums">x ' + num(p.weight, 2) + '%</span></span>';
  }).join('<span class="text-text-muted">+</span>');
  return '<div class="rounded-lg border border-dashed border-border-medium bg-white/70 px-3 py-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm">' +
    '<span class="material-symbols-outlined text-[18px] text-text-muted">calculate</span>' + terms +
    '<span class="text-text-muted">=</span>' +
    (ev.complete ? '<strong class="tabular-nums text-text-primary">' + scoreText(ev.score) + '</strong>'
                 : '<span class="font-semibold text-status-warning-text">Pending</span>') +
  '</div>';
}

function finalResultHtml(ev, rules) {
  if (!ev.complete) {
    return '<div class="h-full rounded-xl border border-dashed border-border-medium bg-white p-4 flex flex-col justify-center gap-1">' +
      '<p class="text-label-xs uppercase tracking-wider text-text-muted">Final Result</p>' +
      '<p class="text-headline-md font-bold text-text-secondary">Pending</p>' +
      '<p class="text-body-sm text-text-muted">Needs ' + esc(ev.missing.join(', ')) + ' before the Performance Score and Grade can be calculated.</p>' +
    '</div>';
  }
  var range = gradeRanges(rules.grades).filter(function (r) { return r.grade === ev.grade; })[0];
  return '<div class="h-full rounded-xl border px-4 py-3 flex flex-col justify-between gap-2 ' + GRADE_TINTS[ev.grade] + '">' +
    '<div class="flex items-start justify-between gap-4">' +
      '<div class="min-w-0">' +
        '<p class="text-label-xs uppercase tracking-wider text-text-secondary">Performance Score</p>' +
        '<p class="mt-1 text-[32px] leading-10 font-bold tabular-nums text-slate-900">' + scoreText(ev.score) +
          '<span class="text-body-md font-semibold text-text-muted"> / 100</span></p>' +
      '</div>' +
      '<div class="flex flex-col items-end shrink-0">' +
        '<p class="text-label-xs uppercase tracking-wider text-text-secondary">Performance Grade</p>' +
        '<div class="mt-1 flex items-center gap-2">' +
          '<span class="text-label-xs text-text-secondary text-right leading-tight">Grade ' + ev.grade + ' covers<br>' + esc(range ? range.label : '-') + '</span>' +
          gradeBadge(ev.grade, 'hero') +
        '</div>' +
      '</div>' +
    '</div>' +
    gradeScaleHtml(rules.grades, ev.score, false) +
  '</div>';
}

function matrixRowHtml(k, i) {
  return '<tr class="' + (k.IsActive ? '' : 'mx-inactive') + '">' +
    '<td class="!px-1 !py-2 text-center tabular-nums text-text-muted">' + (i + 1) + '</td>' +
    '<td class="!px-2 !py-2 truncate font-bold text-text-secondary" title="' + esc(k.KPI_ID) + '">' + esc(k.KPI_ID) + '</td>' +
    '<td class="!px-2 !py-2 !whitespace-normal break-words leading-snug">' +
      '<span class="font-semibold text-text-primary">' + esc(k.KPI_Name) + '</span>' +
      (k.IsActive ? '' : ' <span class="pill pill-neutral !py-0 !px-1 !text-[9px] align-middle">Inactive</span>') +
      (k.Metrics ? '<span class="block mt-0.5 text-text-muted font-normal">' + esc(k.Metrics) + '</span>' : '') +
    '</td>' +
    '<td class="!px-1 !py-2 text-right tabular-nums whitespace-nowrap truncate">' + fitNum(k.Target) + '</td>' +
    '<td class="!pl-2 !pr-1 !py-2 truncate text-text-secondary" title="' + esc(k.Unit || '-') + '">' + esc(k.Unit || '-') + '</td>' +
    '<td class="!px-1 !py-2 text-right tabular-nums whitespace-nowrap font-semibold">' + pct(k.WeightPercent) + '</td>' +
    k.months.map(function (c, mi) {
      if (!c) return '<td class="!px-0.5 !py-2 text-center tabular-nums text-text-muted">-</td>';
      return '<td class="!px-0.5 !py-2 text-center tabular-nums whitespace-nowrap font-semibold ' + tierClass(c.score) + '"' +
        ' title="' + esc(MONTHS[mi] + ': tier score ' + num(c.score, 2) +
          (c.auto ? ', off-cycle, scored automatically' : c.realization !== null && c.realization !== undefined ? ', realization ' + c.realization : '')) + '">' +
        num(c.weighted, 2) + '%</td>';
    }).join('') +
  '</tr>';
}

function matrixHeadHtml(data) {
  var trial = data.trialMonths || [];
  var isTrial = function (i) { return trial.indexOf(i + 1) !== -1; };
  return '<thead><tr>' +
    '<th class="w-8 !px-1 !py-2 text-center">No</th>' +
    '<th class="w-[96px] !px-2 !py-2">KPI ID</th>' +
    '<th class="!px-2 !py-2">KPI Name</th>' +
    '<th class="w-[72px] !px-1 !py-2 text-right !tracking-normal">Target</th>' +
    '<th class="w-[64px] !pl-2 !pr-1 !py-2 !tracking-normal">Unit</th>' +
    '<th class="w-[60px] !px-1 !py-2 text-right !tracking-normal">Weight</th>' +
    MONTHS.map(function (m, i) {
      return '<th class="w-[60px] !px-0.5 !py-2 text-center !whitespace-normal !tracking-normal leading-tight"' +
        (isTrial(i) ? ' title="Trial month, excluded from KPI Months and Avg KPI Score"' : '') + '>' + esc(m.substring(0, 3)) +
        (isTrial(i) ? '<span class="block text-[9px] font-normal normal-case text-text-muted">Trial</span>' : '') + '</th>';
    }).join('') +
  '</tr></thead>';
}

function matrixFootHtml(role) {
  var avg = isNum(role.avgScore) ? Number(role.avgScore) : null;
  return '<tfoot><tr>' +
    '<td class="!px-1 !py-2"></td>' +
    '<td class="!px-2 !py-2"></td>' +
    '<td class="!px-2 !py-2">Sum KPI Score per Month</td>' +
    '<td class="!px-1 !py-2"></td>' +
    '<td class="!px-1 !py-2"></td>' +
    '<td class="!px-1 !py-2 text-right tabular-nums whitespace-nowrap">' + pct(role.totalWeight) + '</td>' +
    role.totals.map(function (v) {
      if (v === null || v === undefined) return '<td class="!px-0.5 !py-2 text-center text-text-muted">-</td>';
      return '<td class="!px-0.5 !py-2 text-center tabular-nums whitespace-nowrap"><span class="mx-sum ' + (avg !== null && Number(v) >= avg ? 'mx-up' : 'mx-down') + '"' +
        ' title="' + Number(v).toFixed(2) + '%' + (avg !== null ? (Number(v) >= avg ? ', at or above' : ', below') + ' the Avg KPI Score of ' + avg.toFixed(2) + '%' : '') + '">' + num(v, 2) + '%</span></td>';
    }).join('') +
  '</tr></tfoot>';
}

function matrixLegendHtml() {
  return '<div class="flex flex-wrap items-center gap-space-md mt-space-md text-label-xs text-text-secondary">' +
    '<span class="font-semibold">Cell = Weight × Tier Score</span>' +
    [['mx-t10', '1.0'], ['mx-t08', '0.8'], ['mx-t06', '0.6'], ['mx-t04', '0.4'], ['mx-t02', '0.2']].map(function (x) {
      return '<span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded ' + x[0] + '"></span>Tier ' + x[1] + '</span>';
    }).join('') +
    '<span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-status-success"></span>*Green: Monthly KPI Score ≥ Avg KPI Score</span>' +
  '</div>';
}

function matrixCardHtml(data, role, rowsHtml, foot, title, shadow) {
  return '<div class="rounded-xl border border-border-light overflow-hidden bg-surface-card' + (shadow ? ' shadow-level-1' : '') + '">' +
    '<div class="px-space-md py-space-sm bg-surface-page border-b border-border-light flex items-center justify-between gap-space-sm">' +
      '<h3 class="text-title-md text-text-primary">' + esc(title) + '</h3>' +
      '<span class="text-label-xs text-text-muted">' + role.kpis.length + ' KPIs' + (role.roleInactive ? ' • inactive role, scored KPIs only' : '') + '</span>' +
    '</div>' +
    '<div class="table-scroll">' +
      '<table class="data-table matrix-table w-full table-fixed text-[11px]">' +
        matrixHeadHtml(data) +
        '<tbody>' + rowsHtml + '</tbody>' +
        (foot ? matrixFootHtml(role) : '') +
      '</table>' +
    '</div>' +
  '</div>';
}

function matrixPanelHtml(data, role, modal) {
  return matrixCardHtml(data, role, role.kpis.map(matrixRowHtml).join(''), true, 'KPI Details', !modal) + matrixLegendHtml();
}

function deepDiveMonths(data) {
  var trial = data.trialMonths || [];
  var out = [];
  for (var i = 0; i < 12; i++) {
    if (trial.indexOf(i + 1) === -1) out.push(i);
  }
  return out;
}

function deepDiveIsOpen(role, k, i) {
  var key = role.roleKey + '|' + k.KPI_ID;
  return Object.prototype.hasOwnProperty.call(S.deepOpen, key) ? S.deepOpen[key] : i === 0;
}

function deepDiveState(data, k, i) {
  if (k.cycleMonths && k.cycleMonths.indexOf(i + 1) === -1) return 'off';
  return (data.monthStates || [])[i] === 'upcoming' ? 'upcoming' : 'due';
}

function isQuarterlyKpi(k) {
  return String((k && k.Duration) || '').toLowerCase() === 'quarterly';
}

function deepDiveKpiMonths(data, k) {
  return deepDiveMonths(data).filter(function (i) {
    var c = k.months ? k.months[i] : null;
    return !k.cycleMonths || k.cycleMonths.indexOf(i + 1) !== -1 || (!!c && !c.auto);
  });
}

function deepDiveStats(data, k) {
  var idx = deepDiveKpiMonths(data, k);
  var scores = [];
  idx.forEach(function (i) {
    var c = k.months[i];
    if (c && !c.auto && isNum(c.score)) scores.push(c.score);
  });
  var sum = scores.reduce(function (a, b) { return a + b; }, 0);
  return {
    months: idx.length,
    scored: scores.length,
    avg:    scores.length ? Math.round(sum / scores.length * 10000) / 100 : null
  };
}

function deepDiveGap(k, realization) {
  var target = Number(k.Target);
  if (!isNum(realization) || !isNum(target)) return null;
  return Math.round((k.Label === 'Decrease' ? target - realization : realization - target) * 100) / 100;
}

function deepDiveTarget(k) {
  var prefix = k.Label === 'Decrease' ? '≤ ' : k.Label === 'Increase' ? '≥ ' : '= ';
  return prefix + fmtKpiValue(k.Target, k.Unit || '');
}

function ddChip(label, value, raw) {
  return '<div class="report-chip">' +
    '<span class="text-label-xs uppercase tracking-wider text-text-muted">' + esc(label) + '</span>' +
    (raw ? '<span class="mt-0.5">' + value + '</span>'
         : '<span class="text-label-md font-semibold text-text-primary truncate">' + esc(value) + '</span>') +
  '</div>';
}

function deepDiveRibbonHtml(k) {
  var meta = labelMeta(k.Label);
  var direction = '<span class="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-label-sm font-semibold ' + meta.tone + '"' +
    ' title="' + esc(targetHint(k)) + '"><span class="material-symbols-outlined text-[16px]">' + meta.icon + '</span>' + esc(meta.short) + '</span>';
  var target = '<span class="flex items-center gap-1.5 min-w-0">' +
    '<span class="text-label-md font-semibold text-text-primary truncate">' + esc(deepDiveTarget(k)) + '</span>' +
    (k.Target_Is_B ? '<span class="pill pill-warning !py-0 !px-1.5 !text-[11px] shrink-0" title="Tier 1.0 only when the target is beaten. Hitting it exactly scores 0.8.">Strict</span>' : '') +
  '</span>';
  return '<div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-space-sm">' +
    ddChip('Direction', direction, true) +
    ddChip('Target', target, true) +
    ddChip('Tier Step', k.Label === 'Binary' ? 'Not used' : num(k.Multiplier, 2) + (k.Unit ? ' ' + k.Unit : '') + ' per tier') +
    ddChip('Duration', durationPill(k.Duration, true), true) +
    ddChip('Weight', pct(k.WeightPercent)) +
    ddChip('Unit', k.Unit || '-') +
  '</div>';
}

function compactShort(v) {
  try {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(v);
  } catch (e) {
    return num(v, 0);
  }
}

function fitNum(v) {
  var n = Number(v);
  if (v === null || v === '' || !isNum(n)) return '-';
  if (Math.abs(n) < 1000000) return esc(num(n, 2));
  return '<span title="' + esc(num(n, 2)) + '">' + esc(compactShort(n)) + '</span>';
}

function fmtKpiValue(v, unit) {
  if (!isNum(Number(v)) || v === null || v === '') return '-';
  var n = Number(v);
  return (Math.abs(n) >= 1000000 ? compactShort(n) : num(n, 2)) + (unit ? ' ' + unit : '');
}

function meetsTarget(k, r) {
  var t = Number(k.Target);
  if (k.Label === 'Decrease') return r <= t;
  if (k.Label === 'Binary') return r === t;
  return r >= t;
}

function deepDiveInsights(data, k) {
  var better = k.Label === 'Decrease' ? -1 : 1;
  var points = deepDiveKpiMonths(data, k).map(function (i) {
    var c = k.months[i];
    return c && isNum(c.realization) ? { i: i, r: Number(c.realization), score: isNum(c.score) ? Number(c.score) : 0 } : null;
  }).filter(function (x) { return !!x; });
  if (!points.length) return null;

  var quality = function (a, b) {
    if (a.score !== b.score) return a.score - b.score;
    if (k.Label !== 'Binary' && a.r !== b.r) return (a.r - b.r) * better;
    return 0;
  };
  var best = points[0];
  var weakest = points[0];
  points.forEach(function (pt) {
    if (quality(pt, best) >= 0) best = pt;
    if (quality(pt, weakest) <= 0) weakest = pt;
  });
  if (quality(best, weakest) === 0) weakest = null;

  var last = points[points.length - 1];
  var prev = points.length > 1 ? points[points.length - 2] : null;
  var trend = null;
  if (prev) {
    var delta = k.Label === 'Binary'
      ? (meetsTarget(k, last.r) ? 1 : 0) - (meetsTarget(k, prev.r) ? 1 : 0)
      : (last.r - prev.r) * better;
    trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  }

  return {
    best: best,
    weakest: weakest,
    onTarget: points.filter(function (pt) { return meetsTarget(k, pt.r); }).length,
    total: points.length,
    last: last,
    prev: prev,
    trend: trend
  };
}

function deepDiveInsightsHtml(data, k) {
  var ins = deepDiveInsights(data, k);
  var unit = k.Unit || '';
  var card = function (accent, icon, iconTone, label, value, caption, title) {
    return '<div class="rounded-lg border border-border-light bg-white px-3 py-2.5 min-w-0 flex items-start gap-2.5 border-l-4 ' + accent + '"' +
      (title ? ' title="' + esc(title) + '"' : '') + '>' +
      '<span class="material-symbols-outlined text-[20px] mt-0.5 ' + iconTone + '">' + icon + '</span>' +
      '<div class="min-w-0">' +
        '<p class="text-label-xs uppercase tracking-wider text-text-muted">' + label + '</p>' +
        '<p class="text-title-md font-bold text-text-primary truncate">' + value + '</p>' +
        '<p class="text-[11px] text-text-muted truncate">' + caption + '</p>' +
      '</div>' +
    '</div>';
  };
  if (!ins) {
    return '<div class="rounded-lg border border-dashed border-border-medium bg-white px-3 py-2.5 text-body-sm text-text-muted">' +
      'No counted month has a realization yet, so there is nothing to compare.</div>';
  }
  var month = function (pt) { return MONTHS[pt.i].substring(0, 3); };
  var full = function (pt) { return month(pt) + ': ' + num(pt.r, 2) + (unit ? ' ' + unit : '') + ', tier ' + pt.score.toFixed(1); };
  var trendMeta = {
    up:   ['trending_up', 'text-status-success', 'Improving', 'border-l-emerald-400'],
    down: ['trending_down', 'text-status-danger', 'Declining', 'border-l-red-400'],
    flat: ['trending_flat', 'text-text-muted', 'Steady', 'border-l-slate-300']
  }[ins.trend || 'flat'];

  return '<div class="grid grid-cols-2 lg:grid-cols-4 gap-space-sm">' +
    card('border-l-emerald-400', 'emoji_events', 'text-status-success', 'Best month',
      esc(month(ins.best)) + ' <span class="font-semibold text-text-secondary">' + esc(fmtKpiValue(ins.best.r, unit)) + '</span>',
      'Tier ' + ins.best.score.toFixed(1) + ' • ' + (k.Label === 'Decrease' ? 'lowest value' : k.Label === 'Binary' ? 'target matched' : 'highest value'), full(ins.best)) +
    (ins.weakest
      ? card('border-l-red-400', 'south', 'text-status-danger', 'Weakest month',
          esc(month(ins.weakest)) + ' <span class="font-semibold text-text-secondary">' + esc(fmtKpiValue(ins.weakest.r, unit)) + '</span>',
          'Tier ' + ins.weakest.score.toFixed(1) + ' • the month to review first', full(ins.weakest))
      : card('border-l-slate-300', 'balance', 'text-text-muted', 'Weakest month', 'None', 'Every scored month performed the same', '')) +
    card(ins.onTarget === ins.total ? 'border-l-emerald-400' : 'border-l-amber-400', 'flag',
      ins.onTarget === ins.total ? 'text-status-success' : 'text-status-warning', 'On target',
      ins.onTarget + ' of ' + ins.total + (ins.total === 1 ? ' month' : ' months'),
      'Target ' + esc(deepDiveTarget(k)), '') +
    card(trendMeta[3], trendMeta[0], trendMeta[1], 'Latest trend',
      ins.prev ? trendMeta[2] : 'Not enough months',
      ins.prev ? esc(month(ins.prev) + ' ' + fmtKpiValue(ins.prev.r, unit) + ' to ' + month(ins.last) + ' ' + fmtKpiValue(ins.last.r, unit)) : 'Needs two scored months',
      ins.prev ? full(ins.prev) + ' to ' + full(ins.last) : '') +
  '</div>';
}

function barFlagPlugin(marks) {
  return {
    id: 'mgiBarFlags',
    afterDatasetsDraw: function (chart) {
      var bars = chart && chart.getDatasetMeta ? chart.getDatasetMeta(0) : null;
      if (!bars || !bars.data || !chart.ctx) return;
      var ctx = chart.ctx;
      var family = window.Chart && window.Chart.defaults ? window.Chart.defaults.font.family : 'sans-serif';
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      (marks.bars || []).forEach(function (f) {
        var bar = bars.data[f.index];
        if (!bar) return;
        ctx.font = (f.strong ? '700 11px ' : '600 10px ') + family;
        ctx.fillStyle = f.color;
        haloText(ctx, f.text, bar.x, bar.y - 4);
      });
      var points = chart.getDatasetMeta(2);
      if (points && points.data) {
        ctx.font = '700 10px ' + family;
        ctx.fillStyle = DD_INDEX_COLOR;
        (marks.index || []).forEach(function (f) {
          var pt = points.data[f.index];
          if (!pt || !isNum(pt.y)) return;
          haloText(ctx, f.text, pt.x, pt.y - 7);
        });
      }
      var y = chart.scales ? chart.scales.y : null;
      if (y && isNum(marks.target) && chart.chartArea) {
        var ty = y.getPixelForValue(marks.target);
        if (ty >= y.top && ty <= y.bottom) {
          ctx.font = '700 10px ' + family;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = DASH_COLORS.warning;
          haloText(ctx, 'Target', chart.chartArea.right + 6, ty - 6);
          haloText(ctx, marks.targetText, chart.chartArea.right + 6, ty + 6);
        }
      }
      ctx.restore();
    }
  };
}

function deepDiveLegendHtml(k) {
  var box = function (color) { return '<span class="w-2.5 h-2.5 rounded-sm" style="background:' + color + '"></span>'; };
  return '<span class="flex flex-wrap items-center gap-x-3 gap-y-1 text-label-xs text-text-muted">' +
    '<span class="inline-flex items-center gap-1">' + box(FLAG_COLORS.normal) + 'Realization</span>' +
    '<span class="inline-flex items-center gap-1">' + box(FLAG_COLORS.best) + 'Best month</span>' +
    '<span class="inline-flex items-center gap-1">' + box(FLAG_COLORS.weakest) + 'Weakest month</span>' +
    '<span class="inline-flex items-center gap-1"><span class="w-3 border-t-2 border-dashed" style="border-color:' + DASH_COLORS.warning + '"></span>Target</span>' +
    '<span class="inline-flex items-center gap-1"><span class="relative w-4 h-2.5 flex items-center"><span class="w-4 h-0.5 rounded-full" style="background:' + DD_INDEX_COLOR + '"></span>' +
      '<span class="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white border-2" style="border-color:' + DD_INDEX_COLOR + '"></span></span>' +
      'Index Score, lower lane (max ' + pct(k.WeightPercent) + ')</span>' +
  '</span>';
}

function deepDiveLadderHtml(k) {
  var steps = tierLadder(k);
  var unit = k.Unit ? ' ' + k.Unit : '';
  return '<div class="rounded-lg border border-border-light bg-surface-card px-space-md py-space-sm">' +
    '<div class="flex flex-wrap items-center justify-between gap-2 mb-2">' +
      '<h4 class="text-title-md text-text-primary">How this KPI is scored</h4>' +
      '<span class="text-label-xs text-text-muted">Each month the realization lands in one tier. Index Score = Weight x Tier.</span>' +
    '</div>' +
    '<div class="grid gap-1.5 ' + (steps.length > 2 ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2') + '">' +
      steps.map(function (st) {
        return '<div class="rounded-md px-2.5 py-1.5 min-w-0 ' + tierClass(st.score) + '" title="Tier ' + st.score.toFixed(1) + ' when realization is ' + esc(st.rule + unit) + '">' +
          '<p class="text-[11px] font-bold">Tier ' + st.score.toFixed(1) + ' • ' + num(st.score * (Number(k.WeightPercent) || 0), 2) + '%</p>' +
          '<p class="text-label-sm font-semibold tabular-nums truncate">' + esc(st.rule) + '</p>' +
        '</div>';
      }).join('') +
    '</div>' +
  '</div>';
}

function deepDiveChartConfig(data, k) {
  var idx = deepDiveKpiMonths(data, k);
  var target = isNum(Number(k.Target)) ? Number(k.Target) : null;
  var unitText = k.Unit ? ' ' + k.Unit : '';
  var unit = k.Unit ? ' (' + k.Unit + ')' : '';
  var weight = isNum(Number(k.WeightPercent)) && Number(k.WeightPercent) > 0 ? Number(k.WeightPercent) : 100;
  var cell = function (i) { var c = k.months[i]; return c && !c.auto ? c : null; };
  var ins = deepDiveInsights(data, k);
  var flagOf = function (i) {
    if (ins && ins.best && ins.best.i === i) return 'best';
    if (ins && ins.weakest && ins.weakest.i === i) return 'weakest';
    return 'normal';
  };
  var marks = { bars: [], index: [], target: target, targetText: target === null ? '' : fmtKpiValue(target) };
  idx.forEach(function (i, n) {
    var c = cell(i);
    if (c && isNum(c.realization)) {
      var f = flagOf(i);
      var value = fmtKpiValue(c.realization);
      marks.bars.push(f === 'best' ? { index: n, text: 'Best • ' + value, color: FLAG_COLORS.best, strong: true }
        : f === 'weakest' ? { index: n, text: 'Weakest • ' + value, color: FLAG_COLORS.weakest, strong: true }
        : { index: n, text: value, color: '#475569', strong: false });
    }
    if (c && isNum(c.weighted)) marks.index.push({ index: n, text: num(c.weighted, 2) + '%' });
  });

  return {
    type: 'bar',
    data: {
      labels: idx.map(function (i) { return MONTHS[i].substring(0, 3); }),
      datasets: [
        {
          type: 'bar',
          label: 'Realization' + unit,
          data: idx.map(function (i) { var c = cell(i); return c && isNum(c.realization) ? c.realization : null; }),
          yAxisID: 'y',
          backgroundColor: idx.map(function (i) { return FLAG_COLORS[flagOf(i)]; }),
          hoverBackgroundColor: idx.map(function (i) { var f = flagOf(i); return f === 'normal' ? FLAG_COLORS.hover : FLAG_COLORS[f]; }),
          borderRadius: 6,
          borderSkipped: false,
          minBarLength: 4,
          maxBarThickness: 34,
          order: 3
        },
        {
          type: 'line',
          label: 'Target',
          data: idx.map(function () { return target; }),
          yAxisID: 'y',
          borderColor: DASH_COLORS.warning,
          borderDash: [6, 6],
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          order: 2
        },
        {
          type: 'line',
          label: 'Index Score',
          data: idx.map(function (i) { var c = cell(i); return c && isNum(c.weighted) ? c.weighted : null; }),
          yAxisID: 'y1',
          borderColor: DD_INDEX_COLOR,
          backgroundColor: 'rgba(79,70,229,0.12)',
          pointBackgroundColor: '#FFFFFF',
          pointBorderColor: DD_INDEX_COLOR,
          pointBorderWidth: 2,
          borderWidth: 2.5,
          tension: 0.3,
          spanGaps: false,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: 'origin',
          clip: false,
          order: 1
        }
      ]
    },
    options: dashOptions({
      layout: { padding: { top: 18, right: 52 } },
      scales: {
        x: { grid: { display: false } },
        y1: {
          stack: 'dd',
          stackWeight: 1,
          offset: true,
          min: 0,
          max: Math.round(weight * 1.45 * 100) / 100,
          position: 'left',
          grid: { color: DASH_COLORS.grid },
          title: { display: true, text: 'Index %', color: DD_INDEX_COLOR },
          afterBuildTicks: function (axis) { axis.ticks = [{ value: 0 }, { value: weight }]; },
          ticks: { color: DD_INDEX_COLOR, callback: function (v) { return num(v, 2) + '%'; } }
        },
        y: {
          stack: 'dd',
          stackWeight: 3,
          beginAtZero: true,
          grace: '14%',
          position: 'left',
          grid: { color: DASH_COLORS.grid },
          ticks: { callback: function (v) { return fmtKpiValue(v); } },
          title: { display: true, text: 'Realization' + unit, color: DASH_COLORS.muted }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              if (!isNum(ctx.parsed.y)) return '';
              var c = cell(idx[ctx.dataIndex]);
              if (ctx.datasetIndex === 1) return ' Target: ' + fmtKpiValue(ctx.parsed.y, k.Unit || '');
              if (ctx.datasetIndex === 2) {
                return ' Index Score: ' + num(ctx.parsed.y, 2) + '%' + (c && isNum(c.score) ? ' (Tier ' + Number(c.score).toFixed(1) + ')' : '');
              }
              var f = flagOf(idx[ctx.dataIndex]);
              return ' Realization: ' + num(ctx.parsed.y, 2) + unitText +
                (f === 'best' ? ' • Best month' : f === 'weakest' ? ' • Weakest month' : '');
            }
          }
        }
      }
    }),
    plugins: [barFlagPlugin(marks)]
  };
}

function deepDiveTableHtml(data, k) {
  var target = isNum(Number(k.Target)) ? Number(k.Target) : null;
  var ins = deepDiveInsights(data, k);
  var badge = function (i) {
    if (ins && ins.best && ins.best.i === i) {
      return '<span class="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-1.5 text-[9px] font-bold uppercase text-emerald-700">Best</span>';
    }
    if (ins && ins.weakest && ins.weakest.i === i) {
      return '<span class="inline-flex rounded-full border border-red-200 bg-red-50 px-1.5 text-[9px] font-bold uppercase text-red-700">Weakest</span>';
    }
    return '';
  };

  var autoTip = 'Off-cycle quarter month, scored 1.0 automatically after the role was submitted';
  var rows = deepDiveMonths(data).map(function (i) {
    var c = k.months[i];
    var state = deepDiveState(data, k, i);
    var auto = !!c && !!c.auto;
    var offTarget = state === 'off' && !(c && isNum(c.realization));
    var blank = state === 'due' ? '<span class="text-text-muted">-</span>'
      : '<span class="inline-flex rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-[11px] font-semibold">' +
        (state === 'off' ? 'Off-cycle' : state === 'upcoming' ? 'Upcoming' : '-') + '</span>';
    var dash = '<span class="text-text-muted">-</span>';
    var hasReal = !!c && isNum(c.realization);
    var gap = hasReal ? deepDiveGap(k, c.realization) : null;
    var gapCell = !hasReal ? dash
      : k.Label === 'Binary'
        ? '<span class="font-semibold ' + (Number(c.realization) === target ? 'text-status-success-text' : 'text-status-danger-text') + '">' +
          (Number(c.realization) === target ? 'Met' : 'Missed') + '</span>'
        : !isNum(gap) ? dash
          : '<span class="font-semibold ' + (gap >= 0 ? 'text-status-success-text' : 'text-status-danger-text') + '" title="' + esc((gap > 0 ? '+' : '') + num(gap, 2)) + '">' +
            (gap > 0 ? '+' : '') + esc(fmtKpiValue(gap)) + '</span>';

    return '<tr' + (state === 'due' ? '' : ' class="bg-surface-page"') + '>' +
      '<td class="!px-2 !py-2 font-semibold text-text-primary"><span class="flex items-center justify-between gap-1.5 whitespace-nowrap">' +
        '<span>' + esc(MONTHS[i].substring(0, 3)) + '</span>' + badge(i) + '</span></td>' +
      '<td class="!px-2 !py-2 text-right tabular-nums text-text-secondary truncate">' + (target === null || offTarget ? dash : fitNum(target)) + '</td>' +
      '<td class="!px-2 !py-2 text-right tabular-nums font-semibold text-text-primary truncate">' + (hasReal ? fitNum(c.realization) : blank) + '</td>' +
      '<td class="!px-2 !py-2 text-right tabular-nums">' + gapCell + '</td>' +
      '<td class="!px-2 !py-2 text-center">' + (auto
        ? '<span class="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-slate-500 whitespace-nowrap" title="' + esc(autoTip) + '">Auto ' +
          Number(c.score).toFixed(1) + '</span>'
        : c && isNum(c.score) ? tierChip(c.score) : dash) + '</td>' +
      '<td class="!px-2 !py-2 text-right tabular-nums ' + (auto ? 'text-text-muted' : 'font-semibold') + '"' + (auto ? ' title="' + esc(autoTip) + '"' : '') + '>' +
        (c && isNum(c.weighted) ? esc(num(c.weighted, 2)) + '%' : dash) + '</td>' +
    '</tr>';
  }).join('');

  return '<div class="rounded-lg border border-border-light bg-surface-card flex flex-col min-w-0 overflow-hidden">' +
    '<div class="flex flex-wrap items-center justify-between gap-space-sm px-space-md py-space-sm border-b border-border-light">' +
      '<h4 class="text-title-md text-text-primary">Monthly Detail</h4>' +
      '<span class="text-label-xs text-text-muted">' + (isQuarterlyKpi(k)
        ? 'Off-cycle months count as tier 1.0 once the role is submitted'
        : 'January is a trial month and stays out of scoring') + '</span>' +
    '</div>' +
    '<div class="flex-1">' +
      '<table class="data-table w-full table-fixed text-[11px]">' +
        '<thead><tr>' +
          '<th class="w-[124px] !px-2 !py-2">Month</th>' +
          '<th class="!px-2 !py-2 text-right !tracking-normal">Target</th>' +
          '<th class="!px-2 !py-2 text-right !tracking-normal">Realization</th>' +
          '<th class="!px-2 !py-2 text-right !tracking-normal">Gap to Target</th>' +
          '<th class="w-[56px] !px-2 !py-2 text-center !tracking-normal">Tier</th>' +
          '<th class="!px-2 !py-2 text-right !tracking-normal">Index Score</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</div>' +
  '</div>';
}

function deepDiveHeadInfoHtml(k, st) {
  var b = isNum(st.avg) ? band(st.avg) : null;
  return '<div class="flex flex-col gap-1 min-w-0 flex-1">' +
      '<div class="flex items-center gap-space-xs flex-wrap">' +
        '<span class="text-code-num px-2 py-0.5 bg-surface-container-high rounded text-text-primary font-bold">' + esc(k.KPI_ID) + '</span>' +
        '<span class="text-title-md text-text-primary">' + esc(k.KPI_Name) + '</span>' +
        (k.IsActive ? '' : '<span class="pill pill-neutral !py-0 !text-[11px]">Inactive</span>') +
      '</div>' +
      (k.Metrics ? '<span class="text-label-xs text-text-muted">' + esc(k.Metrics) + '</span>' : '') +
    '</div>' +
    '<span class="flex items-center justify-end gap-space-xs flex-wrap shrink-0">' +
      '<span class="text-label-xs text-text-muted">' + st.scored + ' of ' + st.months + (isQuarterlyKpi(k) ? ' quarter months' : ' months') + ' scored</span>' +
      '<span class="pill pill-neutral !text-[11px]">Weight ' + pct(k.WeightPercent) + '</span>' +
      (b ? '<span class="pill pill-' + b.key + ' !text-[11px]">YTD ' + st.avg.toFixed(2) + '% • ' + esc(b.label) + '</span>'
         : '<span class="pill pill-neutral !text-[11px]">Not scored yet</span>') +
    '</span>';
}

function deepDiveBodyHtml(data, k, boxId) {
  return deepDiveRibbonHtml(k) +
    deepDiveLadderHtml(k) +
    deepDiveInsightsHtml(data, k) +
    '<div class="grid grid-cols-1 xl:grid-cols-2 gap-space-md">' +
      '<div class="rounded-lg border border-border-light bg-surface-card p-space-md flex flex-col min-w-0">' +
        '<div class="flex flex-wrap items-center justify-between gap-space-sm mb-space-sm">' +
          '<h4 class="text-title-md text-text-primary">Trend Analysis</h4>' +
          deepDiveLegendHtml(k) +
        '</div>' +
        '<div id="' + boxId + '-box" class="relative flex-1 min-h-[360px]"><canvas id="' + boxId + '-chart"></canvas></div>' +
      '</div>' +
      deepDiveTableHtml(data, k) +
    '</div>';
}

function deepDiveCardHtml(data, role, k, i, prefix) {
  var open = deepDiveIsOpen(role, k, i);
  var head =
    '<div class="role-group-head !p-4" onclick="MGI.toggleDeepDive(' + i + ')"' +
      ' title="Click to ' + (open ? 'collapse' : 'expand') + ' this KPI">' +
      '<span class="material-symbols-outlined text-[20px] text-text-secondary">' + (open ? 'expand_less' : 'expand_more') + '</span>' +
      deepDiveHeadInfoHtml(k, deepDiveStats(data, k)) +
    '</div>';
  var body = '<div class="role-group-body !gap-space-md">' + deepDiveBodyHtml(data, k, prefix + '-' + i) + '</div>';
  return '<section class="role-group shadow-level-1 shrink-0 !mt-0' + (open ? '' : ' is-collapsed') + '">' + head + body + '</section>';
}

function deepDivePanelHtml(data, role, surface) {
  if (!role.kpis.length) {
    return '<div class="bg-surface-card rounded-xl border border-dashed border-border-medium p-space-xl text-center">' +
      emptyState('chart', 'No KPIs to analyse for this role.') +
    '</div>';
  }

  var prefix = deepDivePrefix(surface);

  return '<div class="flex items-center gap-2 rounded-lg bg-blue-50/50 px-4 py-3 text-sm text-blue-700 mb-space-md">' +
      '<span class="material-symbols-outlined text-[20px] shrink-0">insights</span>' +
      '<span>Every KPI of <strong>' + esc(role.roleLabel) + '</strong> across ' + deepDiveMonths(data).length +
        ' counted months. January is a trial month and stays out of the analysis.</span>' +
    '</div>' +
    '<div class="flex flex-col gap-space-md">' +
      role.kpis.map(function (k, i) { return deepDiveCardHtml(data, role, k, i, prefix); }).join('') +
    '</div>';
}

function deepDivePrefix(surface) {
  return surface === 'inline' ? 'ddi' : 'ddm';
}

function destroyDeepDiveCharts(prefix) {
  Object.keys(S.charts).forEach(function (key) {
    if (key.indexOf(prefix + '-') !== 0) return;
    S.charts[key].destroy();
    delete S.charts[key];
  });
}

function renderDeepDiveCharts(data, role) {
  var prefix = deepDivePrefix(S.report ? S.report.surface : 'modal');
  destroyDeepDiveCharts(prefix);
  if (!role || !role.kpis || S.reportTab !== 'analytics') return;
  role.kpis.forEach(function (k, i) {
    if (!deepDiveIsOpen(role, k, i)) return;
    dashChart(prefix + '-' + i, deepDiveChartConfig(data, k));
  });
}
