'use strict';

function deptState(state) {
  ['dpt-loading', 'dpt-error', 'dpt-main'].forEach(function (id) {
    if ($(id)) $(id).classList.toggle('hidden', id !== 'dpt-' + state);
  });
}

function loadDepartments() {
  if (!$('sum-departments')) return;
  var year = activeSumYear();
  if (S.depts && S.depts.year === year) {
    fillSumFilters();
    renderDepartments();
    return;
  }
  deptState('loading');
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
      deptState('error');
      $('dpt-error').innerHTML = '<div class="bg-surface-card rounded-xl border border-border-light p-space-xl">' + loadErrorHtml(err.message, 'reloadDepartments') + '</div>';
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

function deptItems(x, t) {
  var items = t.items || [];
  if (!items.length) return '';
  var key = x.key + ':' + t.key;
  var all = S.deptMore === key;
  var shown = all ? items : items.slice(0, DEPT_CHIP_LIMIT);
  return '<span class="dept-items">' +
    shown.map(function (k) {
      return '<span class="dept-chip">' + esc(k.KPI_Name) +
        (isNum(k.low) ? '<span class="dept-chip-count">' + k.low + '%</span>' : '') +
        (k.count > 1 ? '<span class="dept-chip-count">' + k.count + ' roles</span>' : '') + '</span>';
    }).join('') +
    (items.length > DEPT_CHIP_LIMIT
      ? '<button type="button" class="dept-chip-more" onclick="event.stopPropagation();MGI.toggleDeptMore(\'' + esc(key) + '\')">' +
          (all ? 'Show less' : '+' + (items.length - DEPT_CHIP_LIMIT) + ' more') + '</button>'
      : '') +
  '</span>';
}

function deptAlso(x) {
  var keys = x.tags.map(function (t) { return t.key; });
  var out = [];
  if (x.secondRoles && keys.indexOf('capacity') === -1) out.push(plural(x.secondRoles, 'person', 'people') + ' also ' + (x.secondRoles === 1 ? 'holds' : 'hold') + ' another role');
  if (x.singleRoles.length) out.push('One holder: ' + x.singleRoles.join(', '));
  if (x.kpis.easy && keys.indexOf('stretch') === -1) out.push(plural(x.kpis.easy, 'Easy KPI'));
  if (x.kpis.unrealistic && keys.indexOf('targets') === -1) out.push(plural(x.kpis.unrealistic, 'Unrealistic KPI'));
  if (x.spread && x.spread.value > 0 && keys.indexOf('consistency') === -1) out.push('Widest gap in a role: ' + num(x.spread.value, 2) + ' pts');
  if (isNum(x.kbi) || isNum(x.s360)) out.push('KBI ' + (isNum(x.kbi) ? num(x.kbi, 2) : '-') + ' / 360 ' + (isNum(x.s360) ? num(x.s360, 2) : '-'));
  return out;
}

function deptDetailHtml(x) {
  var rules = S.depts.rules;
  if (x.tooEarly) {
    return '<p class="dept-note">Too early to read: a department needs at least ' + plural(rules.MIN_PEOPLE, 'person', 'people') +
      ' and ' + plural(rules.MIN_MONTHS, 'counted month') + ' before it gets signals.</p>';
  }
  var also = deptAlso(x);
  var hasHard = x.kpis.unrealistic > 0;
  return (x.tags.length
      ? '<table class="dept-signals"><thead><tr><th>Signal</th><th>What we see</th><th>Suggested direction</th></tr></thead><tbody>' +
          x.tags.map(function (t) {
            return '<tr><td>' + deptTagPill(t.key) + '</td>' +
              '<td><span class="block">' + esc(t.summary || t.evidence) + '</span>' + deptItems(x, t) +
                (t.note ? '<span class="dept-signal-note"><span class="material-symbols-outlined text-[16px]" aria-hidden="true">warning</span>' + esc(t.note) + '</span>' : '') + '</td>' +
              '<td class="text-text-secondary">' + esc(DEPT_TAGS[t.key].hint) + '</td></tr>';
          }).join('') +
        '</tbody></table>'
      : '<p class="dept-note">No development signal. Results are spread normally across the people and KPIs of this department.</p>') +
    (also.length || hasHard
      ? '<div class="dept-also">' + (also.length ? '<span><strong>Also:</strong> ' + esc(also.join(' • ')) + '</span>' : '<span></span>') +
          (hasHard ? '<button type="button" class="cmp-guide-link" onclick="event.stopPropagation();MGI.openDeptHealth()">' +
            '<span class="material-symbols-outlined text-[16px]" aria-hidden="true">monitor_heart</span>Open KPI Health</button>' : '') +
        '</div>'
      : '');
}

function deptRowHtml(x) {
  var open = S.deptOpen === x.key;
  return '<tr class="acc-row dept-row' + (x.tooEarly ? ' is-early' : '') + (open ? ' is-open' : '') + '" data-dept="' + esc(x.key) + '"' +
      ' onclick="MGI.toggleDept(\'' + esc(x.key).replace(/'/g, '\\\'') + '\')" aria-expanded="' + (open ? 'true' : 'false') + '">' +
    '<td><span class="flex items-center gap-2"><span class="acc-chevron material-symbols-outlined" aria-hidden="true">' + (open ? 'expand_less' : 'expand_more') + '</span>' +
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
  (open ? '<tr class="acc-body"><td colspan="7"><div class="dept-detail">' + deptDetailHtml(x) + '</div></td></tr>' : '');
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
  var d = S.depts;
  if (!$('sum-departments') || !d) return;
  deptState('main');
  var base = deptList();
  var counts = {};
  DEPT_TAG_ORDER.forEach(function (k) { counts[k] = 0; });
  base.forEach(function (x) { x.tags.forEach(function (t) { counts[t.key]++; }); });
  if (S.deptTag && !counts[S.deptTag]) S.deptTag = '';
  var list = base.filter(function (x) { return !S.deptTag || x.tags.some(function (t) { return t.key === S.deptTag; }); });

  $('dpt-intro').innerHTML =
    '<div class="rounded-xl border border-border-light bg-surface-card shadow-level-1 px-4 py-3 mb-space-md flex flex-wrap items-center justify-between gap-2">' +
      '<p class="text-body-sm text-text-secondary"><strong class="text-text-primary">Signals to discuss with the department head.</strong> They are not a verdict and not a headcount number. ' +
        'Each person counts once, in their home department' + (d.trialMonths.length ? ', and trial months are left out' : '') + '.</p>' +
      guideLink('admin', 'ag-departments', 'How to read Departments') +
    '</div>';
  $('dpt-cards').innerHTML = DEPT_TAG_ORDER.map(function (k, n) { return deptCardHtml(k, counts[k], n, DEPT_TAG_ORDER.length); }).join('');
  $('dpt-card').classList.toggle('hidden', !list.length);
  $('dpt-empty').classList.toggle('hidden', !!list.length);
  $('dpt-tbody').innerHTML = list.map(deptRowHtml).join('');
  $('dpt-empty').innerHTML = list.length ? '' :
    '<div class="bg-surface-card rounded-xl border border-dashed border-border-medium p-space-xl text-center">' + emptyState('search', 'No departments match these filters.') + '</div>';
  schedulePins();
}
