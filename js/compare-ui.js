'use strict';

var CMP_COLORS = { a: '#8B1E1E', b: '#1D4ED8', band: 'rgba(148, 163, 184, .35)' };

function cmpTag(slot) {
  var s = slot === 'b' ? 'b' : 'a';
  return '<span class="cmp-tag cmp-tag-' + s + '" title="Employee ' + s.toUpperCase() + '">' + s.toUpperCase() + '</span>';
}

function cmpDiffHtml(diff, unit) {
  if (diff === null || diff === undefined) return '<span class="text-text-muted">-</span>';
  if (Math.abs(diff) < 0.005) return '<span class="text-text-secondary font-semibold">Even</span>';
  var slot = diff > 0 ? 'a' : 'b';
  return '<span class="inline-flex items-center gap-1 font-semibold tabular-nums cmp-text-' + slot + '">' + cmpTag(slot) +
    '+' + num(Math.abs(diff), 2) + (unit ? ' ' + esc(unit) : '') + '</span>';
}

function cmpAvgTierChip(score) {
  return '<span class="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ' + tierClass(score) + '" title="Average tier">' +
    Number(score).toFixed(2) + '</span>';
}

function cmpMonthsText(n) {
  return (n || 0) + (n === 1 ? ' KPI month' : ' KPI months');
}

function cmpLegendHtml(nameA, nameB, withTarget) {
  var item = function (swatch, label, title) {
    return '<span class="cmp-legend-item" title="' + esc(title) + '">' + swatch + '<span class="truncate">' + esc(label) + '</span></span>';
  };
  return '<div class="cmp-legend" aria-hidden="true">' +
    item(cmpTag('a') + '<span class="cmp-swatch cmp-swatch-a"></span>', nameA, 'A: ' + nameA + ', solid line') +
    item(cmpTag('b') + '<span class="cmp-swatch cmp-swatch-b"></span>', nameB, 'B: ' + nameB + ', dashed line') +
    (withTarget ? item('<span class="cmp-swatch cmp-swatch-target"></span>', 'Target', 'Target band') : '') +
  '</div>';
}

function cmpStickyHtml(A, B, ov, tabs) {
  var who = function (slot, side, avg) {
    return '<span class="cmp-sticky-who">' + cmpTag(slot) +
      '<span class="cmp-sticky-name" title="' + esc(side.name) + '">' + esc(side.name) + '</span>' +
      '<span class="cmp-sticky-avg">' + cmpScore(avg) + '</span></span>';
  };
  return '<div id="cmp-sticky" class="cmp-sticky">' +
    '<div class="cmp-sticky-people">' + who('a', A, ov.a.avg) + '<span class="text-label-xs text-text-muted">vs</span>' + who('b', B, ov.b.avg) +
      '<span class="cmp-sticky-diff">' + cmpDiffHtml(ov.diff) + '</span></div>' +
    '<div class="seg cmp-sticky-tabs" role="tablist" aria-label="Compare view">' + tabs + '</div>' +
  '</div>';
}

function cmpScore(v) {
  return isNum(v) ? num(v, 2) : '-';
}

function destroyCompareCharts() {
  Object.keys(S.charts || {}).forEach(function (key) {
    if (key.indexOf('cmp-') !== 0) return;
    if (S.charts[key] && S.charts[key].destroy) S.charts[key].destroy();
    delete S.charts[key];
  });
}

function wireCompareOutside() {
  if (S.cmpWired) return;
  S.cmpWired = true;
  document.addEventListener('click', function (ev) {
    var c = S.compare;
    if (!c || !c.pick || S.sumView !== 'compare') return;
    var t = ev && ev.target;
    if (t && t.closest && t.closest('.cmp-slot')) return;
    closeComparePick();
  });
}

function renderCompare() {
  var host = $('sum-compare');
  if (!host || S.sumView !== 'compare') return;
  wireCompareOutside();
  destroyCompareCharts();
  var ready = !!(S.annual && S.annual.year === activeSumYear());
  host.innerHTML = cmpPickerHtml(ready) + '<div id="cmp-body" class="mt-space-lg">' + cmpBodyHtml(ready) + '</div>';
  renderCompareCharts();
  syncCompareHead();
}

function cmpPickerHtml(ready) {
  var c = cmpState();
  var range = c.range;
  var seg = [['all', 'Full year'], ['q1', 'Q1'], ['q2', 'Q2'], ['q3', 'Q3'], ['q4', 'Q4'], ['custom', 'Custom']].map(function (r) {
    var on = range === r[0];
    return '<button type="button" class="seg-btn' + (on ? ' is-active' : '') + '" aria-pressed="' + (on ? 'true' : 'false') + '"' +
      ' onclick="MGI.setCompareRange(\'' + r[0] + '\')">' + r[1] + '</button>';
  }).join('');
  var monthOptions = function (sel) {
    return MONTHS.map(function (m, i) {
      return '<option value="' + (i + 1) + '"' + (i + 1 === sel ? ' selected' : '') + '>' + esc(m.substring(0, 3)) + '</option>';
    }).join('');
  };
  var custom = range === 'custom'
    ? '<div class="flex items-center gap-2">' +
        '<select class="field !w-auto !py-1.5 !text-label-sm" aria-label="From month" onchange="MGI.setCompareMonth(\'from\', this.value)">' + monthOptions(c.from) + '</select>' +
        '<span class="text-body-sm text-text-muted">to</span>' +
        '<select class="field !w-auto !py-1.5 !text-label-sm" aria-label="To month" onchange="MGI.setCompareMonth(\'to\', this.value)">' + monthOptions(c.to) + '</select>' +
      '</div>'
    : '';

  return '<div class="bg-surface-card rounded-xl shadow-level-1 border border-border-light p-space-lg">' +
    '<div class="flex flex-col lg:flex-row lg:items-stretch gap-space-md">' +
      cmpSlotHtml('a', ready) +
      '<div class="flex lg:flex-col items-center justify-center">' +
        '<button type="button" class="btn-icon" onclick="MGI.swapCompare()" title="Swap A and B" aria-label="Swap A and B"' + (c.a || c.b ? '' : ' disabled') + '>' +
          '<span class="material-symbols-outlined">swap_horiz</span></button>' +
      '</div>' +
      cmpSlotHtml('b', ready) +
    '</div>' +
    '<div class="mt-space-md pt-space-md border-t border-border-light flex flex-wrap items-center gap-space-sm">' +
      '<span class="form-label !mb-0">Period FY' + esc(activeSumYear()) + '</span>' +
      '<div class="seg" role="group" aria-label="Compare period">' + seg + '</div>' +
      custom +
      '<span class="text-label-xs text-text-muted">Trial months are left out, as in every report.</span>' +
    '</div>' +
  '</div>';
}

function cmpSlotHtml(slot, ready) {
  var c = cmpState();
  var r = cmpFindRow(c[slot]);
  var open = c.pick === slot;
  var label = 'Employee ' + slot.toUpperCase();
  var body;
  if (r) {
    body =
      '<div class="flex flex-wrap items-start gap-space-sm min-w-0">' +
        '<span class="emp-avatar shrink-0 hidden sm:flex">' + esc(r.Initials || initials(r.Full_Name)) + '</span>' +
        '<div class="flex flex-col min-w-[12rem] flex-1">' +
          '<span class="flex items-center gap-2 min-w-0">' + cmpTag(slot) + '<span class="text-title-md text-text-primary truncate">' + esc(r.Full_Name) + '</span></span>' +
          '<span class="text-body-sm text-text-secondary truncate">' + esc(cmpRoleText(r)) + '</span>' +
          '<span class="text-label-xs text-text-muted truncate">NIK ' + esc(r.NIK) + (r.Division ? ' • ' + esc(r.Division) : '') + ' • ' + cmpMonthsText(r.kpiMonths) + ' • Avg KPI ' + cmpScore(r.kpiMonths > 0 ? r.avgScore : null) + '</span>' +
        '</div>' +
        '<div class="flex items-center gap-1 shrink-0">' +
          '<button type="button" class="btn btn-secondary !py-1 !px-2.5 !text-label-sm" onclick="MGI.openComparePick(\'' + slot + '\')" aria-expanded="' + (open ? 'true' : 'false') + '">Change</button>' +
          '<button type="button" class="btn-icon" onclick="MGI.clearCompare(\'' + slot + '\')" title="Remove ' + label + '" aria-label="Remove ' + label + '">' +
            '<span class="material-symbols-outlined text-[20px]">close</span></button>' +
        '</div>' +
      '</div>';
  } else {
    body =
      '<button type="button" class="w-full flex items-center gap-space-sm rounded-lg border border-dashed border-border-medium px-3 py-3 text-left transition-all duration-150 hover:bg-surface-page"' +
        ' onclick="MGI.openComparePick(\'' + slot + '\')" aria-expanded="' + (open ? 'true' : 'false') + '"' + (ready ? '' : ' disabled') + '>' +
        cmpTag(slot) +
        '<span class="flex flex-col min-w-0"><span class="text-body-md font-semibold text-text-primary">Pick ' + label + '</span>' +
        '<span class="text-label-xs text-text-muted">' + (ready ? 'Search by name, NIK, role, or division' : 'Loading employees') + '</span></span>' +
        '<span class="material-symbols-outlined text-text-muted ml-auto">' + (ready ? 'person_search' : 'hourglass_empty') + '</span>' +
      '</button>';
  }
  var pop = open && ready
    ? '<div class="combo-pop cmp-pop">' +
        '<div class="relative p-2 border-b border-border-light">' +
          '<span class="material-symbols-outlined absolute left-4 top-4 text-text-muted text-[18px]">search</span>' +
          '<input id="cmp-q" type="search" class="field !pl-9 !py-1.5 !text-label-sm" aria-label="Search employees for ' + label + '"' +
            ' placeholder="Search name, NIK, role, or division" autocomplete="off" value="' + esc(c.q) + '"' +
            ' oninput="MGI.filterComparePick(this.value)" onkeydown="MGI.onComparePickKey(event)">' +
        '</div>' +
        '<div id="cmp-pick-list" class="max-h-80 overflow-y-auto py-1">' + cmpPickListHtml(slot) + '</div>' +
      '</div>'
    : '';
  return '<div class="cmp-slot cmp-slot-' + slot + ' relative flex-1 min-w-0 rounded-xl border border-border-light bg-white p-space-md">' + body + pop + '</div>';
}

function cmpPickListHtml(slot) {
  var lists = cmpPickList(slot);
  var option = function (x) {
    var r = x.r;
    var scored = r.kpiMonths > 0;
    return '<button type="button" class="combo-option' + (scored ? '' : ' cmp-option-empty') + '" onclick="MGI.chooseCompare(\'' + slot + '\', ' + x.i + ')">' +
      '<span class="emp-avatar !w-8 !h-8 !text-[11px] shrink-0">' + esc(r.Initials || initials(r.Full_Name)) + '</span>' +
      '<span class="flex flex-col min-w-0 flex-1">' +
        '<span class="text-body-sm font-semibold text-text-primary truncate">' + esc(r.Full_Name) + '</span>' +
        '<span class="text-label-xs text-text-muted truncate">' + esc(cmpRoleText(r)) + (r.Division ? ' • ' + esc(r.Division) : '') + ' • ' + esc(r.NIK) + '</span>' +
      '</span>' +
      (scored
        ? '<span class="cmp-option-stat"><span class="cmp-option-label">KPI months</span><span class="cmp-option-value">' + r.kpiMonths + '</span></span>' +
          '<span class="cmp-option-stat"><span class="cmp-option-label">Avg</span><span class="cmp-option-value">' + cmpScore(r.avgScore) + '</span></span>'
        : '<span class="cmp-option-stat"><span class="cmp-option-label">No scored month</span></span>') +
    '</button>';
  };
  var head = function (text) {
    return '<p class="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">' + text + '</p>';
  };
  var cap = 80;
  var html = '';
  if (lists.same.length) html += head('Same role') + lists.same.slice(0, cap).map(option).join('');
  if (lists.rest.length) html += head(lists.same.length ? 'Other roles' : 'Employees') + lists.rest.slice(0, cap).map(option).join('');
  if (lists.rest.length > cap || lists.same.length > cap) html += '<p class="px-3 py-2 text-label-xs text-text-muted">Keep typing to narrow the list.</p>';
  return html || '<p class="px-3 py-4 text-center text-body-sm text-text-muted">No employee matches your search.</p>';
}

function cmpSkeleton() {
  return '<div class="grid grid-cols-1 md:grid-cols-4 gap-space-md mb-space-lg">' +
    [1, 2, 3, 4].map(function () { return '<div class="skeleton h-28 w-full"></div>'; }).join('') + '</div>' +
    '<div class="skeleton h-72 w-full"></div>';
}

function cmpBodyHtml(ready) {
  var c = cmpState();
  var card = function (inner) {
    return '<div class="bg-surface-card rounded-xl border border-dashed border-border-medium p-space-xl">' + inner + '</div>';
  };
  if (!ready) return cmpSkeleton();
  if (!c.a || !c.b) {
    return card(emptyState('search', 'Pick two scorecards to compare. You can also start from the compare icon in Annual Recap or the Compare button in a performance report.'));
  }
  if (c.error) return '<div class="bg-surface-card rounded-xl border border-border-light p-space-xl">' + loadErrorHtml(c.error, 'loadCompare') + '</div>';
  if (c.loading) return cmpSkeleton();
  var A = cmpSide(c.a);
  var B = cmpSide(c.b);
  if (!A || !B) return card(emptyState('empty', 'One of these employees has no KPI scorecard in FY' + esc(activeSumYear()) + '.'));

  var mode = cmpMode(A, B);
  var ov = cmpOverview(A, B);
  var kpis = mode === 'same' ? cmpAlignKpis(A, B) : null;
  var ev = cmpEvalGap(A, B);
  if (mode !== 'same' && c.tab === 'kpis') c.tab = 'overview';

  var tabs = [
    ['overview', 'insights', 'Overview', ''],
    ['kpis', 'query_stats', 'KPI Deep Dive', mode === 'same' ? '' : 'Needs two scorecards of the same role'],
    ['evaluation', 'workspace_premium', 'Performance Evaluation', '']
  ].map(function (t) {
    var on = c.tab === t[0];
    return '<button type="button" class="seg-btn' + (on ? ' is-active' : '') + '" role="tab" aria-selected="' + (on ? 'true' : 'false') + '"' +
      (t[3] ? ' disabled title="' + t[3] + '"' : '') + ' onclick="MGI.setCompareTab(\'' + t[0] + '\')">' +
      '<span class="material-symbols-outlined text-[18px]">' + t[1] + '</span> ' + t[2] + '</button>';
  }).join('');

  var warnings = cmpWarnings(A, B, ov, mode);
  var narrative = cmpNarrative(A, B, ov, kpis, ev);
  var panel = c.tab === 'kpis' && kpis ? cmpKpiPanelHtml(A, B, kpis)
            : c.tab === 'evaluation' ? cmpEvalPanelHtml(A, B, ev)
            : cmpOverviewPanelHtml(A, B, ov, mode);

  return '<div class="flex flex-wrap items-center gap-space-sm mb-space-md">' +
      (mode === 'same'
        ? '<span class="pill pill-success"><span class="material-symbols-outlined text-[14px]">join_inner</span> Same role: ' + esc(A.role.roleLabel) + '</span>'
        : '<span class="pill pill-warning"><span class="material-symbols-outlined text-[14px]">compare_arrows</span> Different roles</span>') +
      '<span class="text-label-xs text-text-muted">' + esc(cmpPeriodLabel(ov.months)) + '</span>' +
    '</div>' +
    (warnings.length
      ? '<div class="mb-space-md rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 flex items-start gap-space-sm" role="note">' +
          '<span class="material-symbols-outlined text-status-warning text-[20px]">info</span>' +
          '<ul class="text-body-sm text-text-secondary flex flex-col gap-1">' + warnings.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' +
        '</div>'
      : '') +
    '<div class="mb-space-lg bg-surface-card rounded-xl shadow-level-1 border border-border-light p-space-lg">' +
      '<p class="text-label-xs uppercase tracking-wider text-text-muted mb-2">Summary</p>' +
      '<ul class="cmp-summary">' +
        narrative.map(function (s) {
          return '<li><span class="material-symbols-outlined cmp-summary-icon" aria-hidden="true">' + s.icon + '</span><span>' + esc(s.text) + '</span></li>';
        }).join('') +
      '</ul>' +
    '</div>' +
    cmpStickyHtml(A, B, ov, tabs) +
    panel +
    '<p class="mt-space-lg text-label-xs text-text-muted">Use this for coaching and calibration, together with context the numbers do not show.</p>';
}

function cmpPeriodLabel(months) {
  if (!months.length) return 'No counted months in this period';
  return MONTHS[months[0]].substring(0, 3) + ' to ' + MONTHS[months[months.length - 1]].substring(0, 3) + ' ' + activeSumYear() +
    ' • ' + months.length + (months.length === 1 ? ' counted month' : ' counted months');
}

function cmpDuoCard(title, icon, a, b, foot) {
  return '<div class="bg-surface-card rounded-xl p-5 shadow-level-1 border border-border-light flex flex-col gap-3">' +
    '<div class="flex items-center justify-between gap-3">' +
      '<span class="text-sm font-medium text-slate-500">' + esc(title) + '</span>' +
      '<span class="w-9 h-9 rounded-lg bg-slate-50 ring-1 ring-slate-200/70 flex items-center justify-center text-slate-600"><span class="material-symbols-outlined text-[20px]">' + icon + '</span></span>' +
    '</div>' +
    '<div class="flex flex-col gap-1.5">' +
      '<div class="flex items-center justify-between gap-2">' + cmpTag('a') + '<span class="text-title-lg font-bold tabular-nums text-text-primary">' + a + '</span></div>' +
      '<div class="flex items-center justify-between gap-2">' + cmpTag('b') + '<span class="text-title-lg font-bold tabular-nums text-text-primary">' + b + '</span></div>' +
    '</div>' +
    (foot ? '<div class="text-label-xs text-text-muted border-t border-border-light pt-2">' + foot + '</div>' : '') +
  '</div>';
}

function cmpTrendHtml(v) {
  if (v === null) return '<span class="text-text-muted text-body-md">-</span>';
  var icon = Math.abs(v) < 0.005 ? 'trending_flat' : v > 0 ? 'trending_up' : 'trending_down';
  var tone = Math.abs(v) < 0.005 ? 'text-text-secondary' : v > 0 ? 'text-status-success-text' : 'text-status-danger-text';
  return '<span class="inline-flex items-center gap-1 ' + tone + '"><span class="material-symbols-outlined text-[20px]">' + icon + '</span>' +
    (v > 0 ? '+' : '') + num(v, 2) + '</span>';
}

function cmpOverviewPanelHtml(A, B, ov, mode) {
  var months = ov.months;
  var monthNames = function (list) { return list.map(function (i) { return MONTHS[i].substring(0, 3); }).join(', '); };
  var cards = '<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md mb-space-lg">' +
    cmpDuoCard('Average KPI Score', 'leaderboard', cmpScore(ov.a.avg), cmpScore(ov.b.avg), 'Difference ' + cmpDiffHtml(ov.diff)) +
    cmpDuoCard('Months Ahead', 'emoji_events', String(ov.wins.a), String(ov.wins.b),
      ov.wins.both ? ov.wins.tie + ' even of ' + ov.wins.both + ' months scored by both' : 'No month scored by both yet') +
    cmpDuoCard('Trend', 'insights', cmpTrendHtml(ov.a.trend), cmpTrendHtml(ov.b.trend), 'Second half of the period against the first half') +
    cmpDuoCard('Submitted Months', 'fact_check', ov.a.scored + ' / ' + ov.a.due, ov.b.scored + ' / ' + ov.b.due,
      (ov.a.missing.length || ov.b.missing.length)
        ? 'Missing: ' + (ov.a.missing.length ? 'A ' + esc(monthNames(ov.a.missing)) : '') + (ov.a.missing.length && ov.b.missing.length ? '; ' : '') +
          (ov.b.missing.length ? 'B ' + esc(monthNames(ov.b.missing)) : '')
        : 'Every due month is submitted') +
  '</div>';

  var empty = months.filter(function (i, n) { return ov.a.totals[n] === null && ov.b.totals[n] === null; });
  var rows = months.map(function (i, n) {
    var va = ov.a.totals[n];
    var vb = ov.b.totals[n];
    if (va === null && vb === null) return '';
    var lead = va !== null && vb !== null && Math.abs(va - vb) >= 0.005 ? (va > vb ? 'a' : 'b') : '';
    return '<tr>' +
      '<td class="font-semibold text-text-primary">' + esc(MONTHS[i].substring(0, 3)) + '</td>' +
      '<td class="text-right tabular-nums' + (lead === 'a' ? ' font-bold cmp-text-a' : '') + '">' + cmpScore(va) + '</td>' +
      '<td class="text-right tabular-nums' + (lead === 'b' ? ' font-bold cmp-text-b' : '') + '">' + cmpScore(vb) + '</td>' +
      '<td class="text-right">' + (va !== null && vb !== null ? cmpDiffHtml(cmpRound(va - vb)) : '<span class="text-text-muted">-</span>') + '</td>' +
    '</tr>';
  }).join('');

  var trend =
    '<div class="grid grid-cols-1 xl:grid-cols-5 gap-space-md mb-space-lg">' +
      '<div class="xl:col-span-3 bg-surface-card rounded-xl shadow-level-1 border border-border-light p-space-lg flex flex-col">' +
        '<h3 class="text-title-md text-text-primary">Monthly KPI score</h3>' +
        cmpLegendHtml(A.name, B.name, false) +
        '<div id="cmp-trend-box" class="cmp-chart-fill"><canvas id="cmp-trend-chart" role="img" aria-label="Monthly KPI score of A and B"></canvas></div>' +
      '</div>' +
      '<div class="xl:col-span-2 bg-surface-card rounded-xl shadow-level-1 border border-border-light overflow-hidden">' +
        '<div class="table-scroll"><table class="data-table text-body-sm">' +
          '<thead><tr><th scope="col">Month</th><th scope="col" class="text-right">' + cmpTag('a') + '</th><th scope="col" class="text-right">' + cmpTag('b') + '</th><th scope="col" class="text-right">Difference</th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table></div>' +
        (empty.length ? '<p class="px-4 py-2 border-t border-border-light text-label-xs text-text-muted">' + esc(monthNames(empty)) + (empty.length === 1 ? ' has' : ' have') + ' no submissions yet.</p>' : '') +
      '</div>' +
    '</div>';

  var mixA = cmpTierMix(A, months);
  var mixB = cmpTierMix(B, months);
  var bar = function (slot, m) {
    var segs = CMP_TIERS.map(function (t) {
      var n = m.mix[t];
      if (!n) return '';
      var pct = n / m.total * 100;
      return '<span class="' + tierClass(t) + '" style="width:' + pct.toFixed(2) + '%" title="Tier ' + t.toFixed(1) + ': ' + n + '">' + (pct >= 8 ? n : '') + '</span>';
    }).join('');
    return '<div class="flex flex-col gap-1.5">' +
      '<div class="flex items-center justify-between gap-2 text-body-sm">' +
        '<span class="flex items-center gap-2">' + cmpTag(slot) + '<span class="font-semibold text-text-primary">' + (m.onTarget === null ? '-' : m.onTarget + '% at tier 1.0') + '</span></span>' +
        '<span class="text-label-xs text-text-muted">' + m.total + ' KPI months' + (m.auto ? ', ' + m.auto + ' off-cycle left out' : '') + '</span>' +
      '</div>' +
      '<div class="cmp-bar" role="img" aria-label="Tier mix for ' + slot.toUpperCase() + '">' + (segs || '') + '</div>' +
    '</div>';
  };
  var legend = '<div class="flex flex-wrap gap-space-sm mt-space-md">' + CMP_TIERS.map(function (t) {
    return '<span class="inline-flex items-center gap-1 text-label-xs text-text-secondary"><span class="w-3 h-3 rounded-sm ' + tierClass(t) + '"></span>' + t.toFixed(1) + '</span>';
  }).join('') + '</div>';

  var lostList = function (slot, side) {
    var list = cmpPointsLost(side, months).slice(0, 3);
    return '<div class="flex flex-col gap-2">' +
      '<p class="flex items-center gap-2 text-body-sm font-semibold text-text-primary">' + cmpTag(slot) + esc(side.name) + '</p>' +
      (list.length ? list.map(function (x) {
        return '<div class="flex items-start justify-between gap-2 rounded-lg bg-surface-page px-3 py-2">' +
          '<span class="min-w-0"><span class="block text-body-sm font-semibold text-text-primary truncate">' + esc(x.k.KPI_Name) + '</span>' +
          '<span class="block text-label-xs text-text-muted">' + esc(x.k.KPI_ID) + ' • weight ' + num(x.k.WeightPercent, 1) + '%</span></span>' +
          '<span class="text-body-sm font-bold tabular-nums text-status-danger-text whitespace-nowrap">-' + num(x.lost, 2) + '</span>' +
        '</div>';
      }).join('') : '<p class="text-body-sm text-text-muted">No points lost in this period.</p>') +
    '</div>';
  };

  var quality =
    '<div class="grid grid-cols-1 xl:grid-cols-2 gap-space-md' + (mode === 'diff' ? ' mb-space-lg' : '') + '">' +
      '<div class="bg-surface-card rounded-xl shadow-level-1 border border-border-light p-space-lg">' +
        '<h3 class="text-title-md text-text-primary">Tier mix</h3>' +
        '<p class="text-body-sm text-text-muted mb-space-md">How often each KPI landed on each tier, one block per KPI per month.</p>' +
        '<div class="flex flex-col gap-space-md">' + bar('a', mixA) + bar('b', mixB) + '</div>' + legend +
      '</div>' +
      '<div class="bg-surface-card rounded-xl shadow-level-1 border border-border-light p-space-lg">' +
        '<h3 class="text-title-md text-text-primary">Where points are lost</h3>' +
        '<p class="text-body-sm text-text-muted mb-space-md">Average points a month each KPI misses against a perfect 1.0.</p>' +
        '<div class="grid grid-cols-1 md:grid-cols-2 gap-space-md">' + lostList('a', A) + lostList('b', B) + '</div>' +
      '</div>' +
    '</div>';

  return cards + trend + quality + (mode === 'diff' ? cmpLabelMixHtml(A, B, months) : '');
}

function cmpLabelMixHtml(A, B, months) {
  var ma = cmpLabelMix(A, months);
  var mb = cmpLabelMix(B, months);
  var rows = ['Increase', 'Decrease', 'Binary'].filter(function (l) { return ma[l] || mb[l]; }).map(function (l) {
    var cell = function (g) {
      if (!g) return '<td class="text-text-muted">-</td><td class="text-text-muted">-</td>';
      return '<td class="tabular-nums">' + g.kpis + ' KPIs • ' + num(g.weight, 1) + '%</td>' +
        '<td class="tabular-nums font-semibold">' + (g.cells ? Math.round(g.hit / g.cells * 100) + '%' : '-') + '</td>';
    };
    return '<tr><td class="font-semibold text-text-primary">' + esc(labelMeta(l).short || l) + '</td>' + cell(ma[l]) + cell(mb[l]) + '</tr>';
  }).join('');
  return '<div class="bg-surface-card rounded-xl shadow-level-1 border border-border-light overflow-hidden">' +
    '<div class="p-space-lg pb-space-sm"><h3 class="text-title-md text-text-primary">By KPI type</h3>' +
    '<p class="text-body-sm text-text-muted">Different roles have different KPIs, so this compares how each kind of KPI is handled.</p></div>' +
    '<div class="table-scroll"><table class="data-table text-body-sm">' +
      '<thead><tr><th scope="col">KPI type</th><th scope="col">' + cmpTag('a') + ' KPIs and weight</th><th scope="col">' + cmpTag('a') + ' At tier 1.0</th>' +
      '<th scope="col">' + cmpTag('b') + ' KPIs and weight</th><th scope="col">' + cmpTag('b') + ' At tier 1.0</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>' +
  '</div>';
}

function cmpRealText(k, v) {
  return isNum(v) ? esc(fmtKpiValue(v, k.Unit)) : '-';
}

function cmpKpiPanelHtml(A, B, kpis) {
  var c = cmpState();
  var counts = {
    all: kpis.length,
    diff: kpis.filter(function (x) { return x.differs; }).length,
    tier: kpis.filter(function (x) { return x.focus !== null; }).length
  };
  var rows = kpis.filter(function (x) {
    return c.filter === 'diff' ? x.differs : c.filter === 'tier' ? x.focus !== null : true;
  });
  c.rows = rows;
  var seg = [['all', 'All'], ['diff', 'Only differences'], ['tier', 'Same tier, different realization']].map(function (f) {
    var on = c.filter === f[0];
    return '<button type="button" class="seg-btn' + (on ? ' is-active' : '') + '" aria-pressed="' + (on ? 'true' : 'false') + '" onclick="MGI.setCompareFilter(\'' + f[0] + '\')">' +
      f[1] + '<span class="seg-count">' + counts[f[0]] + '</span></button>';
  }).join('');

  var body = rows.length ? rows.map(function (x, n) {
    var open = !!c.open[x.id];
    var k = x.k;
    var tierCell = function (s) {
      return s ? (s.avgScore === null ? '<span class="text-text-muted">-</span>' : cmpAvgTierChip(s.avgScore)) : '<span class="pill pill-neutral !text-[11px]">Not mapped</span>';
    };
    var main = '<tr class="' + (open ? 'bg-surface-page cmp-kpi-open' : '') + '">' +
      '<td><button type="button" class="flex items-start gap-2 text-left w-full" onclick="MGI.toggleCompareKpi(' + n + ')" aria-expanded="' + (open ? 'true' : 'false') + '">' +
        '<span class="material-symbols-outlined text-[20px] text-text-muted">' + (open ? 'expand_less' : 'expand_more') + '</span>' +
        '<span class="min-w-0"><span class="block font-semibold text-text-primary">' + esc(k.KPI_Name) + '</span>' +
        '<span class="block text-label-xs text-text-muted">' + esc(k.KPI_ID) + ' • ' + esc(k.Label) + ' • target ' + esc(targetLabel(k)) + (k.Unit ? ' ' + esc(k.Unit) : '') + '</span>' +
        (x.focus !== null ? '<span class="pill pill-info !text-[11px] mt-1">Same tier, different realization</span>' : '') +
        '</span></button></td>' +
      '<td class="text-right tabular-nums">' + num(x.weight, 1) + '%</td>' +
      '<td class="text-center">' + tierCell(x.a) + '</td>' +
      '<td class="text-center">' + tierCell(x.b) + '</td>' +
      '<td class="text-right tabular-nums">' + (x.a ? cmpRealText(k, x.a.avgReal) : '-') + '</td>' +
      '<td class="text-right tabular-nums">' + (x.b ? cmpRealText(k, x.b.avgReal) : '-') + '</td>' +
      '<td class="text-center tabular-nums whitespace-nowrap">' + (x.a ? x.a.onTarget + '/' + x.a.n : '-') + ' <span class="text-text-muted">vs</span> ' + (x.b ? x.b.onTarget + '/' + x.b.n : '-') + '</td>' +
      '<td class="text-right">' + cmpDiffHtml(x.pointGap) + '</td>' +
    '</tr>';
    return main + (open ? '<tr><td colspan="8" class="!p-0">' + cmpKpiDetailHtml(A, B, x, n) + '</td></tr>' : '');
  }).join('') : '<tr><td colspan="8" class="py-space-xl">' + emptyState('done', 'No KPI matches this filter.') + '</td></tr>';

  return '<div class="bg-surface-card rounded-xl shadow-level-1 border border-border-light overflow-hidden xl:overflow-visible">' +
    '<div class="px-4 py-3 border-b border-border-light flex flex-wrap items-center gap-space-md">' +
      '<div class="seg" role="group" aria-label="KPI filter">' + seg + '</div>' +
      '<span class="text-label-xs text-text-muted ml-auto">Sorted by the biggest gap in points a month (weight times average tier).</span>' +
    '</div>' +
    '<div class="cmp-kpi-scroll"><table class="data-table cmp-kpi-table text-body-sm min-w-[980px]">' +
      '<thead><tr>' +
        '<th scope="col" class="min-w-[300px]">KPI</th><th scope="col" class="text-right">Weight</th>' +
        '<th scope="col" class="text-center">' + cmpTag('a') + ' Avg tier</th><th scope="col" class="text-center">' + cmpTag('b') + ' Avg tier</th>' +
        '<th scope="col" class="text-right">' + cmpTag('a') + ' Avg realization</th><th scope="col" class="text-right">' + cmpTag('b') + ' Avg realization</th>' +
        '<th scope="col" class="text-center">On target</th><th scope="col" class="text-right">Gap</th>' +
      '</tr></thead>' +
      '<tbody>' + body + '</tbody>' +
    '</table></div>' +
  '</div>';
}

function cmpPositionHtml(slot, name, k, pos, month) {
  if (!pos) return '';
  var unit = k.Unit ? ' ' + esc(k.Unit) : '';
  var fill = pos.toNext === null ? 100 : pos.cushion === null ? 0
    : (pos.cushion + pos.toNext) > 0 ? Math.round(pos.cushion / (pos.cushion + pos.toNext) * 100) : 50;
  var tag = pos.toNext === null ? 'Top tier' : fill >= 66 ? 'Near next tier' : fill <= 33 ? 'Barely holding' : 'Mid tier';
  return '<div class="flex flex-col gap-1.5">' +
    '<div class="flex items-center justify-between gap-2">' +
      '<span class="flex items-center gap-2 text-body-sm font-semibold text-text-primary min-w-0">' + cmpTag(slot) + '<span class="truncate">' + esc(name) + '</span></span>' +
      '<span class="pill pill-neutral !text-[11px]">' + tag + '</span>' +
    '</div>' +
    '<div class="cmp-meter cmp-meter-' + slot + '" role="img" aria-label="' + tag + '"><span style="width:' + fill + '%"></span></div>' +
    '<p class="text-label-xs text-text-secondary">' + 'Tier ' + Number(pos.score).toFixed(1) + ' in ' + esc(MONTHS[month].substring(0, 3)) + '. ' +
      (pos.toNext === null ? '' : num(pos.toNextUnits, 2) + unit + ' (' + num(pos.toNext, 2) + ' steps) to reach ' + Number(pos.nextScore).toFixed(1) + '. ') +
      (pos.cushion === null ? '' : num(pos.cushionUnits, 2) + unit + ' clear of dropping a tier.') +
    '</p>' +
  '</div>';
}

function cmpKpiDetailHtml(A, B, x, n) {
  var k = x.k;
  var months = cmpMonths(A.data).filter(function (i) {
    return (x.a && x.a.byMonth[i]) || (x.b && x.b.byMonth[i]);
  });
  var cell = function (s, i) {
    var c = s ? s.byMonth[i] : null;
    if (!c) return '<td class="text-text-muted">-</td>';
    return '<td><span class="inline-flex items-center gap-2 tabular-nums">' + cmpRealText(k, c.realization) + tierChip(c.score) + '</span></td>';
  };
  var table = '<table class="data-table text-body-sm">' +
    '<thead><tr><th scope="col">Month</th><th scope="col">' + cmpTag('a') + ' Realization</th><th scope="col">' + cmpTag('b') + ' Realization</th></tr></thead>' +
    '<tbody>' + (months.length ? months.map(function (i) {
      return '<tr><td class="font-semibold">' + esc(MONTHS[i].substring(0, 3)) + '</td>' + cell(x.a, i) + cell(x.b, i) + '</tr>';
    }).join('') : '<tr><td colspan="3" class="text-center text-text-muted">No submitted month in this period.</td></tr>') + '</tbody></table>';

  var unitText = k.Unit ? ' ' + k.Unit : '';
  var facts = function (slot, s) {
    if (!s) return '';
    var trend = s.trend === 'up' ? 'improving' : s.trend === 'down' ? 'slipping' : s.trend === 'flat' ? 'steady' : 'not enough months';
    return '<li class="flex items-start gap-2">' + cmpTag(slot) + '<span>' +
      (s.gap === null ? '' : Math.abs(s.gap) < 1e-9 ? 'On target on average. '
        : 'Average ' + esc((s.gap > 0 ? num(s.gap, 2) : num(-s.gap, 2)) + unitText) + (s.gap > 0 ? ' better than' : ' short of') + ' target. ') +
      (s.cv === null ? '' : s.cv < 0.05 ? 'Same result every month. ' : 'Swings ' + num(s.cv, 1) + '% around its average. ') +
      'Trend ' + trend + '.</span></li>';
  };

  var ladder = tierLadder(k).map(function (t) {
    return '<li class="flex items-center gap-2">' + tierChip(t.score) + '<span class="tabular-nums">' + esc(t.rule) + (k.Unit ? ' ' + esc(k.Unit) : '') + '</span></li>';
  }).join('');

  var tie = x.focus !== null
    ? '<div class="rounded-xl border border-blue-200 bg-blue-50/60 p-space-md flex flex-col gap-space-sm">' +
        '<p class="text-body-sm font-semibold text-text-primary">Same tier, different realization</p>' +
        cmpPositionHtml('a', A.name, k, x.posA, x.focus) + cmpPositionHtml('b', B.name, k, x.posB, x.focus) +
        (!x.posA || !x.posB ? '<p class="text-label-xs text-text-secondary">This KPI has no tier steps, so only the realizations are shown.</p>' : '') +
      '</div>'
    : '';

  return '<div class="px-4 py-space-md bg-surface-page border-t border-border-light grid grid-cols-1 xl:grid-cols-5 gap-space-md">' +
    '<div class="xl:col-span-3 flex flex-col gap-space-md">' +
      '<div class="bg-white rounded-xl border border-border-light p-space-md">' +
        cmpLegendHtml(A.name, B.name, k.Label !== 'Binary' && isNum(Number(k.Target))) +
        '<div id="cmp-kpi-' + n + '-box" class="h-64"><canvas id="cmp-kpi-' + n + '-chart" role="img" aria-label="Realization of A and B for ' + esc(k.KPI_Name) + '"></canvas></div>' +
      '</div>' +
      '<div class="bg-white rounded-xl border border-border-light overflow-hidden"><div class="table-scroll">' + table + '</div></div>' +
    '</div>' +
    '<div class="xl:col-span-2 flex flex-col gap-space-md">' +
      tie +
      '<div class="bg-white rounded-xl border border-border-light p-space-md">' +
        '<p class="text-body-sm font-semibold text-text-primary mb-2">What the numbers say</p>' +
        '<ul class="flex flex-col gap-2 text-body-sm text-text-secondary">' + facts('a', x.a) + facts('b', x.b) + '</ul>' +
      '</div>' +
      '<div class="bg-white rounded-xl border border-border-light p-space-md">' +
        '<p class="text-body-sm font-semibold text-text-primary mb-2">Tier ladder</p>' +
        '<ul class="flex flex-col gap-1.5 text-body-sm text-text-secondary">' + ladder + '</ul>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function cmpEvalPanelHtml(A, B, ev) {
  var card = function (inner) {
    return '<div class="bg-surface-card rounded-xl border border-dashed border-border-medium p-space-xl">' + inner + '</div>';
  };
  if (ev.state === 'hidden') return card(emptyState('empty', 'Performance Evaluation for FY' + esc(activeSumYear()) + ' has not been released yet.'));
  if (ev.state === 'missing') return card(emptyState('empty', (ev.a ? B.name : A.name) + ' has no Performance Evaluation for this role in FY' + esc(activeSumYear()) + '.'));

  var result = function (slot, side, e) {
    return '<div class="flex-1 min-w-0 rounded-xl border border-border-light bg-white p-space-md flex items-center justify-between gap-space-md cmp-slot cmp-slot-' + slot + '">' +
      '<div class="min-w-0"><p class="flex items-center gap-2 text-body-sm font-semibold text-text-primary">' + cmpTag(slot) + '<span class="truncate">' + esc(side.name) + '</span></p>' +
      '<p class="mt-1 text-[28px] leading-9 font-bold tabular-nums text-slate-900">' + (e.complete ? scoreText(e.score) : 'Pending') +
        (e.complete ? '<span class="text-body-md font-semibold text-text-muted"> / 100</span>' : '') + '</p>' +
      (e.complete ? '' : '<p class="text-label-xs text-text-muted">Needs ' + esc((e.missing || []).join(', ')) + '</p>') +
      '</div>' + gradeBadge(e.complete ? e.grade : null, 'hero') +
    '</div>';
  };

  var rows = ev.parts.filter(function (p) { return p.required; }).map(function (p) {
    var v = function (x) { return isNum(x.value) ? num(x.value, 2) : '-'; };
    var pts = function (x) { return isNum(x.points) ? num(x.points, 2) : '-'; };
    return '<tr><td class="font-semibold text-text-primary">' + esc(p.label) + '</td>' +
      '<td class="text-right tabular-nums">' + num(p.weight, 0) + '%</td>' +
      '<td class="text-right tabular-nums">' + v(p.a) + '</td><td class="text-right tabular-nums">' + pts(p.a) + '</td>' +
      '<td class="text-right tabular-nums">' + v(p.b) + '</td><td class="text-right tabular-nums">' + pts(p.b) + '</td>' +
      '<td class="text-right">' + cmpDiffHtml(p.diff, 'pts') + '</td></tr>';
  }).join('');

  var total = ev.complete
    ? '<tr class="bg-surface-page"><td class="font-bold text-text-primary">Performance Score</td><td></td>' +
        '<td></td><td class="text-right tabular-nums font-bold">' + scoreText(ev.a.score) + '</td>' +
        '<td></td><td class="text-right tabular-nums font-bold">' + scoreText(ev.b.score) + '</td>' +
        '<td class="text-right">' + cmpDiffHtml(ev.gap, 'pts') + '</td></tr>'
    : '';

  var shares = ev.complete && ev.gap !== null && Math.abs(ev.gap) >= 0.005
    ? '<div class="mt-space-md flex flex-col gap-1.5">' + ev.parts.filter(function (p) { return p.diff !== null && Math.abs(p.diff) >= 0.005; }).map(function (p) {
        return '<p class="flex items-center gap-2 text-body-sm text-text-secondary">' + cmpTag(p.diff > 0 ? 'a' : 'b') +
          '<span><span class="font-semibold text-text-primary">' + esc(p.label) + '</span> favours ' + (p.diff > 0 ? 'A' : 'B') + ' by ' + num(Math.abs(p.diff), 2) + ' pts' +
          (ev.driver && ev.driver.key === p.key ? ', the biggest driver' : '') + '</span></p>';
      }).join('') + '</div>'
    : (!ev.complete ? '<p class="mt-space-md text-body-sm text-text-muted">The grades are not compared until both scorecards are complete.</p>' : '');

  var sp = ev.a.spLevel || ev.b.spLevel || ev.a.remarks || ev.b.remarks
    ? '<div class="mt-space-lg grid grid-cols-1 md:grid-cols-2 gap-space-md">' + [['a', A, ev.a], ['b', B, ev.b]].map(function (p) {
        return '<div class="rounded-xl border border-border-light p-space-md">' +
          '<p class="flex items-center gap-2 text-body-sm font-semibold text-text-primary mb-1">' + cmpTag(p[0]) + 'SP and remarks</p>' +
          '<p class="text-body-sm text-text-secondary">' + (p[2].spLevel ? 'SP ' + esc(p[2].spLevel) : 'No SP') + (p[2].remarks ? '. ' + esc(p[2].remarks) : '') + '</p>' +
        '</div>';
      }).join('') + '</div>'
    : '';

  return '<div class="flex flex-col md:flex-row gap-space-md mb-space-lg">' + result('a', A, ev.a) + result('b', B, ev.b) + '</div>' +
    '<div class="bg-surface-card rounded-xl shadow-level-1 border border-border-light p-space-lg">' +
      '<h3 class="text-title-md text-text-primary">Where the difference comes from</h3>' +
      '<p class="text-body-sm text-text-muted mb-space-md">Points are each component times its weight, as in Performance Evaluation.</p>' +
      '<div class="table-scroll"><table class="data-table text-body-sm min-w-[720px]">' +
        '<thead><tr><th scope="col">Component</th><th scope="col" class="text-right">Weight</th>' +
        '<th scope="col" class="text-right">' + cmpTag('a') + ' Value</th><th scope="col" class="text-right">' + cmpTag('a') + ' Points</th>' +
        '<th scope="col" class="text-right">' + cmpTag('b') + ' Value</th><th scope="col" class="text-right">' + cmpTag('b') + ' Points</th>' +
        '<th scope="col" class="text-right">Difference</th></tr></thead>' +
        '<tbody>' + rows + total + '</tbody>' +
      '</table></div>' +
      shares + sp +
    '</div>';
}

function cmpLineConfig(labels, a, b, nameA, nameB, target) {
  var sets = [
    { label: 'A: ' + nameA, data: a, borderColor: CMP_COLORS.a, backgroundColor: CMP_COLORS.a, borderWidth: 2.5, pointRadius: 3, cubicInterpolationMode: 'monotone', spanGaps: true },
    { label: 'B: ' + nameB, data: b, borderColor: CMP_COLORS.b, backgroundColor: CMP_COLORS.b, borderWidth: 2.5, pointRadius: 3, borderDash: [6, 4], cubicInterpolationMode: 'monotone', spanGaps: true }
  ];
  sets[0].order = 1;
  sets[1].order = 0;
  if (isNum(target)) {
    sets.push({ label: 'Target', data: labels.map(function () { return Number(target); }), borderColor: CMP_COLORS.band, borderWidth: 8, pointRadius: 0, order: 2 });
  }
  return {
    type: 'line',
    data: { labels: labels, datasets: sets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false } }
    }
  };
}

function renderCompareCharts() {
  var c = S.compare;
  if (!c || !c.a || !c.b || c.loading || c.error) return;
  var A = cmpSide(c.a);
  var B = cmpSide(c.b);
  if (!A || !B) return;
  var all = cmpMonths(A.data);
  var label = function (list) { return list.map(function (i) { return MONTHS[i].substring(0, 3); }); };
  if (c.tab === 'overview' && $('cmp-trend-box')) {
    var total = function (side, i) { var v = side.role.totals ? side.role.totals[i] : null; return isNum(v) ? Number(v) : null; };
    var used = all.filter(function (i) { return total(A, i) !== null || total(B, i) !== null; });
    dashChart('cmp-trend', cmpLineConfig(label(used),
      used.map(function (i) { return total(A, i); }), used.map(function (i) { return total(B, i); }), A.name, B.name, null));
  }
  if (c.tab === 'kpis') {
    (c.rows || []).forEach(function (x, n) {
      if (!c.open[x.id] || !$('cmp-kpi-' + n + '-box')) return;
      var real = function (s, i) { var cell = s ? s.byMonth[i] : null; return cell && isNum(cell.realization) ? Number(cell.realization) : null; };
      var used = all.filter(function (i) { return real(x.a, i) !== null || real(x.b, i) !== null; });
      dashChart('cmp-kpi-' + n, cmpLineConfig(label(used),
        used.map(function (i) { return real(x.a, i); }), used.map(function (i) { return real(x.b, i); }), A.name, B.name, x.k.Label === 'Binary' ? null : x.k.Target));
    });
  }
}

function syncCompareHead() {
  var host = $('sum-compare');
  var bar = $('cmp-sticky');
  if (!host || !host.style || !host.style.setProperty || !bar || !bar.offsetHeight) return;
  host.style.setProperty('--cmp-head', (64 + bar.offsetHeight) + 'px');
}
