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

function toggleDeptMore(key) {
  S.deptMore = S.deptMore === key ? '' : key;
  renderDepartments();
}

function openDeptHealth() {
  S.mkView = 'health';
  if (S.depts) S.kpiHealthYear = S.depts.year;
  if ($('mkh-flag')) $('mkh-flag').value = 'hard';
  go('master-kpis');
}

function deptRuleText(key, r) {
  r = r || DEPT_RULES_FALLBACK;
  return {
    targets:     r.TARGET_SHARE + '% or more of the department KPIs are Unrealistic in KPI Health.',
    capability:  'A KPI that is not Unrealistic has ' + r.WEAK_SHARE + '% or more of its submissions at tier ' + Number(r.WEAK_TIER).toFixed(1) + ' or lower.',
    consistency: 'People in one role (at least ' + r.SPREAD_MIN + ') are ' + r.SPREAD + ' points or more apart.',
    capacity:    r.BELOW_GOOD + '% or more are below Good, and ' + r.SECOND_ROLES + ' or more also hold another role, or most KPIs are missed.',
    stretch:     r.EASY_SHARE + '% or more of the KPIs are Easy and the average is Excellent.',
    discipline:  'Less than ' + r.SUBMIT_PCT + '% of due months were submitted while the average is Good or better.',
    behaviour:   'KBI or 360 is ' + r.BEHAVIOUR_GAP + ' points or more below the company while KPI results are Good or better.',
    falling:     'The monthly average drops ' + Math.abs(r.FALL_SLOPE) + ' point a month or more over at least ' + r.FALL_MONTHS + ' months.'
  }[key] || '';
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

function deptChips(x, list, kind) {
  if (!list.length) return '';
  var key = x.key + ':' + kind;
  var all = S.deptMore === key;
  var shown = all ? list : list.slice(0, DEPT_CHIP_LIMIT);
  var label = kind === 'weak' ? 'Most missed KPIs' : 'Unrealistic in KPI Health';
  return '<div class="dept-chips"><span class="dept-chips-title">' + label + '</span>' +
    shown.map(function (k) {
      return '<span class="dept-chip">' + esc(k.KPI_Name) +
        (k.count > 1 ? '<span class="dept-chip-count">' + k.count + ' roles</span>' : '') +
        (kind === 'weak' ? '<span class="dept-chip-count">' + k.low + '%</span>' : '') + '</span>';
    }).join('') +
    (list.length > DEPT_CHIP_LIMIT
      ? '<button type="button" class="dept-chip-more" onclick="event.stopPropagation();MGI.toggleDeptMore(\'' + esc(key) + '\')">' +
          (all ? 'Show less' : '+' + (list.length - DEPT_CHIP_LIMIT) + ' more') + '</button>'
      : '') +
  '</div>';
}

function deptDetailHtml(x) {
  var rules = S.depts.rules;
  var signals = x.tooEarly
    ? '<p class="dept-empty">Too early to read: a department needs at least ' + plural(rules.MIN_PEOPLE, 'person', 'people') +
        ' and ' + plural(rules.MIN_MONTHS, 'counted month') + ' before it gets signals.</p>'
    : x.tags.length
      ? x.tags.map(function (t) {
          var m = DEPT_TAGS[t.key];
          var lines = t.lines && t.lines.length ? t.lines : [t.evidence];
          return '<div class="dept-signal">' +
            '<p class="dept-signal-title"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">' + m.icon + '</span>' + esc(m.label) + '</p>' +
            '<ul class="dept-signal-lines">' + lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' +
            (t.note ? '<p class="dept-signal-note"><span class="material-symbols-outlined text-[16px]" aria-hidden="true">warning</span>' + esc(t.note) + '</p>' : '') +
            '<p class="dept-signal-hint">' + esc(m.hint) + '</p>' +
          '</div>';
        }).join('')
      : '<p class="dept-empty">No development signal. Results are spread normally across the people and KPIs of this department.</p>';

  var facts = [
    ['Below Good', isNum(x.belowGood) ? pct(x.belowGood) + ' of ' + plural(x.scored, 'person', 'people') : '-'],
    ['Widest spread in a role', x.spread ? num(x.spread.value, 2) + ' pts, ' + x.spread.role : '-'],
    ['Submitted', isNum(x.submission) ? pct(x.submission) + ' of due months' : '-'],
    ['Also hold another role', plural(x.secondRoles, 'person', 'people')],
    ['Roles with one holder', x.singleRoles.length ? x.singleRoles.join(', ') : 'None'],
    ['KPI Health', plural(x.kpis.judged, 'KPI') + ': ' + x.kpis.unrealistic + ' Unrealistic, ' + x.kpis.easy + ' Easy']
  ];
  if (isNum(x.kbi) || isNum(x.s360)) facts.push(['KBI / 360', (isNum(x.kbi) ? num(x.kbi, 2) : '-') + ' / ' + (isNum(x.s360) ? num(x.s360, 2) : '-')]);

  return '<div class="dept-detail">' +
    '<div class="dept-detail-grid">' +
      '<section><h3 class="dept-detail-head">Signals</h3><div class="flex flex-col gap-2">' + signals + '</div></section>' +
      '<section><h3 class="dept-detail-head">At a glance</h3><dl class="dept-facts">' + facts.map(function (f) {
        return '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>';
      }).join('') + '</dl></section>' +
    '</div>' +
    deptChips(x, x.weakKpis || [], 'weak') +
    deptChips(x, x.unrealisticKpis || [], 'hard') +
    ((x.unrealisticKpis || []).length
      ? '<button type="button" class="cmp-guide-link self-start" onclick="event.stopPropagation();MGI.openDeptHealth()">' +
          '<span class="material-symbols-outlined text-[16px]" aria-hidden="true">monitor_heart</span>Open KPI Health</button>'
      : '') +
  '</div>';
}

function deptRowHtml(x) {
  var open = S.deptOpen === x.key;
  return '<tr class="dept-row' + (x.tooEarly ? ' is-early' : '') + (open ? ' is-open' : '') + '" data-dept="' + esc(x.key) + '"' +
      ' onclick="MGI.toggleDept(\'' + esc(x.key).replace(/'/g, '\\\'') + '\')" aria-expanded="' + (open ? 'true' : 'false') + '">' +
    '<td><span class="flex items-center gap-2"><span class="dept-chevron material-symbols-outlined text-[20px]" aria-hidden="true">expand_more</span>' +
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

function deptCardHtml(k, count, n, total) {
  var t = DEPT_TAGS[k];
  var on = S.deptTag === k;
  var tip = 'dept-tip-' + k;
  return '<div class="dept-card-wrap' + (n >= total - 2 ? ' tip-end' : '') + '">' +
    '<button type="button" class="dept-card' + (on ? ' is-active' : '') + (count ? '' : ' is-zero') + '" data-dept-tag="' + k + '" aria-pressed="' + (on ? 'true' : 'false') + '"' +
      ' aria-describedby="' + tip + '" onclick="MGI.pickDeptTag(\'' + k + '\')"' + (count ? '' : ' aria-disabled="true"') + '>' +
      '<span class="flex items-center gap-1.5 text-label-sm font-semibold text-text-primary"><span class="material-symbols-outlined text-[18px] text-primary-container" aria-hidden="true">' + t.icon + '</span>' + esc(t.label) + '</span>' +
      '<span class="text-[22px] leading-7 font-bold tabular-nums ' + (count ? 'text-text-primary' : 'text-text-muted') + '">' + count + '</span>' +
    '</button>' +
    '<div id="' + tip + '" role="tooltip" class="dept-tip">' +
      '<p class="dept-tip-label">What it means</p><p>' + esc(deptRuleText(k, S.depts.rules)) + '</p>' +
      '<p class="dept-tip-label">What to do</p><p>' + esc(t.hint) + '</p>' +
      '<p class="dept-tip-now">' + (count ? plural(count, 'department') + ' now. ' + (on ? 'Click to show every department.' : 'Click to show only them.') : 'No department right now.') + '</p>' +
    '</div>' +
  '</div>';
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

  host.innerHTML =
    '<div class="rounded-xl border border-border-light bg-surface-card shadow-level-1 px-4 py-3 mb-space-md flex flex-wrap items-center justify-between gap-2">' +
      '<p class="text-body-sm text-text-secondary"><strong class="text-text-primary">Signals to discuss with the department head.</strong> They are not a verdict and not a headcount number. ' +
        'Each person counts once, in their home department' + (d.trialMonths.length ? ', and trial months are left out' : '') + '.</p>' +
      guideLink('admin', 'ag-departments', 'How to read Departments') +
    '</div>' +
    '<div class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2 mb-space-md">' +
      DEPT_TAG_ORDER.map(function (k, n) { return deptCardHtml(k, counts[k], n, DEPT_TAG_ORDER.length); }).join('') +
    '</div>' +
    (list.length
      ? '<div class="bg-surface-card rounded-xl shadow-level-1 border border-border-light overflow-hidden"><div class="table-scroll"><table class="data-table dept-table">' +
          '<colgroup><col style="width:23%"><col style="width:7%"><col style="width:11%"><col style="width:11%"><col style="width:11%"><col style="width:10%"><col style="width:27%"></colgroup>' +
          '<thead><tr><th>Department</th><th class="text-right">People</th><th>Avg KPI</th><th class="text-right">Below Good</th><th>Trend</th><th class="text-right">Submitted</th><th>Signals</th></tr></thead>' +
          '<tbody>' + list.map(deptRowHtml).join('') + '</tbody></table></div></div>'
      : '<div class="bg-surface-card rounded-xl border border-dashed border-border-medium p-space-xl text-center">' + emptyState('search', 'No departments match these filters.') + '</div>');
}
