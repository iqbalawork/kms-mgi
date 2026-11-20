'use strict';

function loadDepartments() {
  var host = $('sum-departments');
  if (!host) return;
  var year = activeSumYear();
  if (S.depts && S.depts.year === year) {
    fillSumFilters();
    renderDepartments();
    return;
  }
  host.innerHTML = '<div class="skeleton h-28 w-full mb-space-md"></div><div class="skeleton h-64 w-full"></div>';
  api('getDepartmentSignals', year)
    .then(function (data) {
      if (data.year !== activeSumYear()) return;
      S.depts = data;
      syncBands(data.bands);
      fillYearOptions(data.years);
      if (S.sumView === 'departments') fillSumFilters();
      renderDepartments();
    })
    .catch(function (err) {
      host.innerHTML = '<div class="bg-surface-card rounded-xl border border-border-light p-space-xl">' + loadErrorHtml(err.message, 'reloadDepartments') + '</div>';
    });
}

function reloadDepartments() {
  S.depts = null;
  loadDepartments();
}

function deptList() {
  var d = S.depts;
  if (!d) return [];
  var origin = sumOrigin();
  var division = sumDivision();
  var list = origin && d.byOrigin && d.byOrigin[origin] ? d.byOrigin[origin] : d.all;
  return (list || []).filter(function (x) { return !division || x.Division === division; });
}

function pickDeptTag(key) {
  S.deptTag = S.deptTag === key ? '' : key;
  renderDepartments();
}

function toggleDept(key) {
  S.deptOpen = S.deptOpen === key ? '' : key;
  renderDepartments();
}

function deptTagPill(key) {
  var t = DEPT_TAGS[key];
  return '<span class="pill pill-neutral !py-0 !text-[11px] whitespace-nowrap"><span class="material-symbols-outlined text-[14px]" aria-hidden="true">' + t.icon + '</span>' + esc(t.label) + '</span>';
}

function deptTrend(slope) {
  if (!isNum(slope)) return '<span class="text-text-muted">-</span>';
  var icon = slope > 0.25 ? 'trending_up' : slope < -0.25 ? 'trending_down' : 'trending_flat';
  var tone = slope < -0.25 ? 'text-status-danger-text' : slope > 0.25 ? 'text-status-success-text' : 'text-text-secondary';
  return '<span class="inline-flex items-center gap-1 whitespace-nowrap ' + tone + '"><span class="material-symbols-outlined text-[16px]" aria-hidden="true">' + icon + '</span>' +
    (slope > 0 ? '+' : '') + esc(num(slope, 2)) + ' / mo</span>';
}

function deptAvg(avg) {
  if (!isNum(avg)) return '<span class="text-text-muted">-</span>';
  var b = band(avg);
  return '<span class="inline-flex items-center gap-1.5 whitespace-nowrap">' + bandBadge(b.key) + '<span class="text-code-num font-semibold">' + esc(num(avg, 2)) + '</span></span>';
}

function deptDetailHtml(x) {
  var tags = x.tags.map(function (t) {
    var m = DEPT_TAGS[t.key];
    return '<li class="flex items-start gap-3">' + deptTagPill(t.key) +
      '<span class="min-w-0"><span class="block text-body-sm text-text-primary">' + esc(t.evidence) + '</span>' +
        (t.note ? '<span class="block text-label-xs font-semibold text-status-warning-text">' + esc(t.note) + '</span>' : '') +
        '<span class="block text-label-xs text-text-secondary">' + esc(m.hint) + '</span></span></li>';
  }).join('');
  var facts = [
    ['Below Good', isNum(x.belowGood) ? pct(x.belowGood) + ' of ' + plural(x.scored, 'person', 'people') : '-'],
    ['Widest spread in a role', x.spread ? num(x.spread.value, 2) + ' points, ' + x.spread.role : '-'],
    ['Submitted on time', isNum(x.submission) ? pct(x.submission) + ' of due months' : '-'],
    ['Also hold another role', plural(x.secondRoles, 'person', 'people')],
    ['Roles with one holder', x.singleRoles.length ? x.singleRoles.join(', ') : 'None'],
    ['KPIs read by KPI Health', x.kpis.judged + ' (' + x.kpis.unrealistic + ' Unrealistic, ' + x.kpis.easy + ' Easy)'],
    ['KBI / 360 average', (isNum(x.kbi) ? num(x.kbi, 2) : '-') + ' / ' + (isNum(x.s360) ? num(x.s360, 2) : '-')]
  ];
  return '<div class="dept-detail">' +
    (x.tooEarly
      ? '<p class="text-body-sm text-text-secondary">Too early to read: a department needs at least ' + plural(S.depts.rules.MIN_PEOPLE, 'person', 'people') +
        ' and ' + plural(S.depts.rules.MIN_MONTHS, 'counted month') + ' before it gets signals.</p>'
      : tags ? '<ul class="flex flex-col gap-3">' + tags + '</ul>'
      : '<p class="text-body-sm text-text-secondary">No development signal. Results are spread normally across the people and KPIs of this department.</p>') +
    '<dl class="dept-facts">' + facts.map(function (f) {
      return '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>';
    }).join('') + '</dl>' +
    (x.weakKpis.length || x.unrealisticKpis.length
      ? '<p class="text-label-xs text-text-secondary">' +
          (x.weakKpis.length ? 'Most missed KPIs: ' + esc(x.weakKpis.map(function (k) { return k.KPI_Name + ' (' + k.low + '%)'; }).join(', ')) + '. ' : '') +
          (x.unrealisticKpis.length ? 'Unrealistic in KPI Health: ' + esc(x.unrealisticKpis.map(function (k) { return k.KPI_Name; }).join(', ')) + '.' : '') +
        '</p>'
      : '') +
  '</div>';
}

function deptRowHtml(x) {
  var open = S.deptOpen === x.key;
  return '<tr class="dept-row' + (x.tooEarly ? ' is-early' : '') + (open ? ' is-open' : '') + '" data-dept="' + esc(x.key) + '" onclick="MGI.toggleDept(\'' + esc(x.key).replace(/'/g, '\\\'') + '\')">' +
    '<td><span class="flex items-center gap-2"><span class="material-symbols-outlined text-[18px] text-text-muted" aria-hidden="true">' + (open ? 'expand_less' : 'expand_more') + '</span>' +
      '<span class="min-w-0"><span class="block text-label-md font-semibold text-text-primary">' + esc(x.Department) + '</span>' +
      '<span class="block text-label-xs text-text-secondary">' + esc(x.Division || '-') + '</span></span></span></td>' +
    '<td class="text-right text-code-num">' + esc(num(x.people, 0)) + '</td>' +
    '<td>' + deptAvg(x.avg) + '</td>' +
    '<td class="text-right text-code-num">' + (isNum(x.belowGood) ? esc(pct(x.belowGood)) : '-') + '</td>' +
    '<td>' + deptTrend(x.slope) + '</td>' +
    '<td class="text-right text-code-num">' + (isNum(x.submission) ? esc(pct(x.submission)) : '-') + '</td>' +
    '<td><span class="flex flex-wrap gap-1">' +
      (x.tooEarly ? '<span class="pill pill-neutral !py-0 !text-[11px]">Too early to read</span>'
        : x.tags.length ? x.tags.map(function (t) { return deptTagPill(t.key); }).join('')
        : '<span class="text-label-xs text-text-muted">No signal</span>') +
    '</span></td>' +
  '</tr>' +
  (open ? '<tr class="dept-detail-row"><td colspan="7">' + deptDetailHtml(x) + '</td></tr>' : '');
}

function renderDepartments() {
  var host = $('sum-departments');
  var d = S.depts;
  if (!host || !d) return;
  var base = deptList();
  var counts = {};
  DEPT_TAG_ORDER.forEach(function (k) { counts[k] = 0; });
  base.forEach(function (x) { x.tags.forEach(function (t) { counts[t.key]++; }); });
  if (S.deptTag && !counts[S.deptTag]) S.deptTag = '';
  var list = base.filter(function (x) { return !S.deptTag || x.tags.some(function (t) { return t.key === S.deptTag; }); });

  var cards = DEPT_TAG_ORDER.map(function (k) {
    var t = DEPT_TAGS[k];
    var on = S.deptTag === k;
    return '<button type="button" class="dept-card' + (on ? ' is-active' : '') + '" data-dept-tag="' + k + '" aria-pressed="' + (on ? 'true' : 'false') + '"' +
      ' onclick="MGI.pickDeptTag(\'' + k + '\')"' + (counts[k] ? '' : ' disabled') + ' title="' + esc(t.hint) + '">' +
      '<span class="flex items-center gap-1.5 text-label-sm font-semibold text-text-primary"><span class="material-symbols-outlined text-[18px] text-primary-container" aria-hidden="true">' + t.icon + '</span>' + esc(t.label) + '</span>' +
      '<span class="text-[22px] leading-7 font-bold tabular-nums ' + (counts[k] ? 'text-text-primary' : 'text-text-muted') + '">' + counts[k] + '</span>' +
    '</button>';
  }).join('');

  host.innerHTML =
    '<div class="rounded-xl border border-border-light bg-surface-card shadow-level-1 px-4 py-3 mb-space-md flex flex-wrap items-center justify-between gap-2">' +
      '<p class="text-body-sm text-text-secondary"><strong class="text-text-primary">Signals to discuss with the department head.</strong> They are not a verdict and not a headcount number. ' +
        'Each person counts once, in their home department' + (d.trialMonths.length ? ', and trial months are left out' : '') + '.</p>' +
      guideLink('admin', 'ag-departments', 'How to read Departments') +
    '</div>' +
    '<div class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2 mb-space-md">' + cards + '</div>' +
    (list.length
      ? '<div class="bg-surface-card rounded-xl shadow-level-1 border border-border-light overflow-hidden"><div class="table-scroll"><table class="data-table dept-table">' +
          '<thead><tr><th>Department</th><th class="text-right">People</th><th>Avg KPI</th><th class="text-right">Below Good</th><th>Trend</th><th class="text-right">Submitted</th><th>Signals</th></tr></thead>' +
          '<tbody>' + list.map(deptRowHtml).join('') + '</tbody></table></div></div>'
      : '<div class="bg-surface-card rounded-xl border border-dashed border-border-medium p-space-xl text-center">' + emptyState('search', 'No departments match these filters.') + '</div>');
}
