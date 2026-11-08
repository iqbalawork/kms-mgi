'use strict';

function initMasterKpis() {
  wireMasterUpload();
  applyMasterView();
  loadMasterCatalog();
  if (S.mkView === 'health') loadKpiHealth(S.kpiHealthYear);
}

function applyMasterView() {
  var health = S.mkView === 'health';
  $('mk-library').classList.toggle('hidden', health);
  $('mk-health').classList.toggle('hidden', !health);
  document.querySelectorAll('#mk-view-tabs [data-mk-view]').forEach(function (b) {
    var on = b.dataset.mkView === S.mkView;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
}

function setMasterView(view) {
  S.mkView = view === 'health' ? 'health' : 'library';
  applyMasterView();
  if (S.mkView !== 'health') return;
  if (S.kpiHealth) renderKpiHealth();
  else loadKpiHealth(S.kpiHealthYear);
}

function reloadMaster() {
  if (S.mkView === 'health') loadKpiHealth(S.kpiHealthYear);
  else loadMasterCatalog();
}

function onKpiHealthYear(value) {
  var year = parseInt(value, 10);
  if (!year || year === S.kpiHealthYear) return;
  loadKpiHealth(year);
}

function loadKpiHealth(year) {
  var want = parseInt(year, 10) || null;
  if (!S.kpiHealth || (want && S.kpiHealth.year !== want)) {
    showKpiHealthRow('<div class="flex flex-col gap-2"><div class="skeleton h-10 w-full"></div><div class="skeleton h-10 w-full"></div></div>');
  }
  S.kpiHealthYear = want;
  return (want ? api('getKpiHealth', want) : api('getKpiHealth'))
    .then(function (data) {
      if (S.kpiHealthYear !== want) return;
      S.kpiHealth = data;
      S.kpiHealthYear = data.year;
      fillKpiHealthFilters();
      renderKpiHealth();
    })
    .catch(function (err) {
      if (S.kpiHealthYear !== want) return;
      showKpiHealthRow('<p class="p-space-lg text-center text-status-danger">' + esc(err.message) + '</p>');
      toast(err.message, 'error');
    });
}

function fillKpiHealthFilters() {
  var d = S.kpiHealth;
  var years = (d.years || []).slice();
  if (years.indexOf(d.year) === -1) years.push(d.year);
  years.sort(function (a, b) { return b - a; });
  var yearSel = $('mkh-year');
  yearSel.innerHTML = years.map(function (y) {
    return '<option value="' + y + '">' + y + (y === d.activeYear ? ' (Active)' : '') + '</option>';
  }).join('');
  yearSel.value = String(d.year);

  var divSel = $('mkh-division');
  var keep = divSel.value;
  var seen = {};
  var divisions = [];
  (d.kpis || []).forEach(function (k) {
    var name = k.Division || '-';
    if (!seen[name]) { seen[name] = true; divisions.push(name); }
  });
  divisions.sort();
  divSel.innerHTML = '<option value="">All divisions</option>' + divisions.map(function (name) {
    return '<option value="' + esc(name) + '">' + esc(name) + '</option>';
  }).join('');
  divSel.value = divisions.indexOf(keep) > -1 ? keep : '';
  fillKpiHealthRoles();
}

function kpiHealthRole(k) {
  return k.Position + ' / ' + k.Department;
}

function fillKpiHealthRoles() {
  var d = S.kpiHealth;
  var roleSel = $('mkh-role');
  if (!d || !roleSel) return;
  var division = $('mkh-division').value;
  var keep = roleSel.value;
  var seen = {};
  var roles = [];
  (d.kpis || []).forEach(function (k) {
    if (division && (k.Division || '-') !== division) return;
    var name = kpiHealthRole(k);
    if (!seen[name]) { seen[name] = true; roles.push(name); }
  });
  roles.sort(function (a, b) { return a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0; });
  roleSel.innerHTML = '<option value="">All roles</option>' + roles.map(function (name) {
    return '<option value="' + esc(name) + '">' + esc(name) + '</option>';
  }).join('');
  roleSel.value = roles.indexOf(keep) > -1 ? keep : '';
}

function onKpiHealthDivision() {
  fillKpiHealthRoles();
  renderKpiHealth();
}

function showKpiHealthRow(html) {
  $('mkh-card').classList.remove('hidden');
  $('mkh-empty').classList.add('hidden');
  if (!$('mkh-thead').innerHTML) $('mkh-thead').innerHTML = kpiHealthHead(S.healthSort || { key: 'flag', dir: 1 });
  $('mkh-tbody').innerHTML = '<tr><td colspan="10">' + html + '</td></tr>';
}

function kpiHealthHead(sort) {
  return '<tr>' +
    '<th>KPI ID</th>' +
    sortHead('KPI Name', 'name', sort, 'sortKpiHealth', 'min-w-[220px]') +
    sortHead('Role', 'role', sort, 'sortKpiHealth', 'min-w-[180px]') +
    '<th>Target</th>' +
    sortHead('Holders', 'holders', sort, 'sortKpiHealth', 'text-right') +
    sortHead('Submissions', 'entries', sort, 'sortKpiHealth', 'text-right') +
    sortHead('At 1.0', 'top', sort, 'sortKpiHealth', 'text-right') +
    sortHead('At 0.2', 'bottom', sort, 'sortKpiHealth', 'text-right') +
    sortHead('Avg Tier', 'tier', sort, 'sortKpiHealth', 'text-right') +
    sortHead('Flag', 'flag', sort, 'sortKpiHealth', 'text-center') +
  '</tr>';
}

function pickKpiHealthFlag(key) {
  var sel = $('mkh-flag');
  sel.value = sel.value === key ? '' : key;
  renderKpiHealth();
}

function sortKpiHealth(key) {
  S.healthSort = nextSort(S.healthSort, key, key === 'name' || key === 'role' || key === 'flag' ? 1 : -1);
  renderKpiHealth();
}

function kpiHealthSorted(list) {
  var sort = S.healthSort || { key: 'flag', dir: 1 };
  var byName = function (a, b) {
    var x = String(a.KPI_Name || '').toLowerCase();
    var y = String(b.KPI_Name || '').toLowerCase();
    if (x !== y) return x < y ? -1 : 1;
    return a.KPI_ID < b.KPI_ID ? -1 : a.KPI_ID > b.KPI_ID ? 1 : 0;
  };
  var pick = {
    flag:    function (k) { return HEALTH_FLAGS[k.flag] ? HEALTH_FLAGS[k.flag].order : HEALTH_ORDER.length; },
    holders: function (k) { return k.holders; },
    entries: function (k) { return k.entries; },
    top:     function (k) { return k.pctTop; },
    bottom:  function (k) { return k.pctBottom; },
    tier:    function (k) { return k.avgTier; }
  }[sort.key];
  var byRole = function (a, b) {
    var x = kpiHealthRole(a).toLowerCase();
    var y = kpiHealthRole(b).toLowerCase();
    return x === y ? 0 : x < y ? -1 : 1;
  };
  return list.slice().sort(function (a, b) {
    if (sort.key === 'role') return byRole(a, b) * sort.dir || byName(a, b);
    if (!pick) return byName(a, b) * sort.dir;
    var x = pick(a);
    var y = pick(b);
    var xe = !isNum(x);
    var ye = !isNum(y);
    if (xe !== ye) return xe ? 1 : -1;
    if (!xe && x !== y) return (x < y ? -1 : 1) * sort.dir;
    return byName(a, b);
  });
}

function kpiHealthCard(key, count, active) {
  var f = HEALTH_FLAGS[key];
  return '<button type="button" class="text-left bg-surface-card rounded-xl px-4 py-3 shadow-level-1 border transition-all duration-150 hover:shadow-level-2 ' +
      (active ? 'border-primary-container ring-1 ring-primary-container' : 'border-border-light') + '"' +
      ' aria-pressed="' + (active ? 'true' : 'false') + '" data-health-card="' + key + '" onclick="MGI.pickKpiHealthFlag(\'' + key + '\')"' +
      ' title="' + (active ? 'Show every flag' : 'Show only ' + esc(f.label)) + '">' +
    '<span class="flex items-center gap-1.5 text-sm font-medium text-slate-500">' +
      '<span class="material-symbols-outlined text-[18px] ' + f.text + '">' + f.icon + '</span>' + esc(f.label) +
    '</span>' +
    '<span class="block text-[24px] leading-8 font-bold tracking-tight mt-1 ' + (count ? f.text : 'text-text-muted') + '">' + count + '</span>' +
    '<span class="block text-body-sm text-text-muted">' + esc(f.caption) + '</span>' +
  '</button>';
}

function kpiHealthLegend(d) {
  var t = d.thresholds || {};
  var trial = (d.trialMonths || []).map(function (m) { return MONTHS[m - 1]; }).filter(Boolean);
  return 'Too easy: ' + t.easyPct + '% or more of submissions at tier 1.0. ' +
    'Unrealistic: ' + t.hardPct + '% or more at tier 0.2. ' +
    'A flag needs at least ' + plural(t.minEntries, 'submission') + '. ' +
    (trial.length
      ? trial.join(' and ') + (trial.length === 1 ? ' is a trial month and is' : ' are trial months and are') + ' left out. '
      : '') +
    'Automatic tier 1.0 for off-cycle quarterly KPIs is not a submission and is not counted.';
}

function kpiHealthRowHtml(k) {
  var f = HEALTH_FLAGS[k.flag] || HEALTH_FLAGS.thin;
  var meta = labelMeta(k.Label);
  var quarterly = String(k.Duration || '').toLowerCase() === 'quarterly';
  return '<tr class="' + (k.IsActive ? '' : 'mk-row-inactive') + '" data-health-kpi="' + esc(k.KPI_ID) + '">' +
    '<td class="text-label-xs font-bold text-text-secondary whitespace-nowrap">' + esc(k.KPI_ID) + '</td>' +
    '<td class="text-label-md font-semibold text-text-primary">' + esc(k.KPI_Name) +
      (k.Metrics ? '<span class="block text-body-sm text-text-muted mt-1 font-normal">' + esc(k.Metrics) + '</span>' : '') +
      (quarterly || !k.IsActive
        ? '<span class="flex flex-wrap gap-1 mt-1">' +
            (quarterly ? durationPill(k.Duration, true) : '') +
            (k.IsActive ? '' : '<span class="pill pill-neutral !py-0 !text-[11px]">Inactive</span>') +
          '</span>'
        : '') +
    '</td>' +
    '<td class="text-label-sm text-text-secondary">' + esc(k.Position + ' / ' + k.Department) + '</td>' +
    '<td class="whitespace-nowrap">' +
      '<span class="text-code-num">' + esc(num(k.Target, 2)) + '</span>' +
      (k.Unit ? ' <span class="text-label-sm text-text-secondary">' + esc(k.Unit) + '</span>' : '') +
      '<span class="block text-[11px] font-semibold ' + meta.text + '">' + esc(meta.short) + '</span>' +
    '</td>' +
    '<td class="text-right text-code-num">' + esc(num(k.holders, 0)) + '</td>' +
    '<td class="text-right text-code-num">' + esc(num(k.entries, 0)) + '</td>' +
    '<td class="text-right text-code-num">' + esc(pct(k.pctTop)) + '</td>' +
    '<td class="text-right text-code-num">' + esc(pct(k.pctBottom)) + '</td>' +
    '<td class="text-right text-code-num font-semibold">' + (isNum(k.avgTier) ? k.avgTier.toFixed(2) : '-') + '</td>' +
    '<td class="text-center"><span class="pill ' + f.pill + ' !py-0 !text-[11px] whitespace-nowrap">' + esc(f.label) + '</span></td>' +
  '</tr>';
}

function renderKpiHealth() {
  var d = S.kpiHealth;
  if (!d || !$('mkh-tbody')) return;

  var division = $('mkh-division').value;
  var role = $('mkh-role').value;
  var flag = $('mkh-flag').value;
  var q = ($('mkh-search').value || '').trim().toLowerCase();
  var base = (d.kpis || []).filter(function (k) {
    if (division && (k.Division || '-') !== division) return false;
    if (role && kpiHealthRole(k) !== role) return false;
    if (q && (k.KPI_ID + ' ' + k.KPI_Name + ' ' + (k.Metrics || '') + ' ' + k.Position + ' ' + k.Department).toLowerCase().indexOf(q) === -1) return false;
    return true;
  });
  var counts = {};
  base.forEach(function (k) { counts[k.flag] = (counts[k.flag] || 0) + 1; });
  $('mkh-summary').innerHTML = HEALTH_ORDER.map(function (key) {
    return kpiHealthCard(key, counts[key] || 0, flag === key);
  }).join('');
  $('mkh-legend').textContent = kpiHealthLegend(d);

  var list = kpiHealthSorted(base.filter(function (k) { return !flag || k.flag === flag; }));
  var empty = !list.length;
  $('mkh-card').classList.toggle('hidden', empty);
  $('mkh-empty').classList.toggle('hidden', !empty);
  $('mkh-thead').innerHTML = kpiHealthHead(S.healthSort || { key: 'flag', dir: 1 });
  $('mkh-tbody').innerHTML = list.map(kpiHealthRowHtml).join('');
  $('mkh-empty').innerHTML = !empty ? '' :
    '<div class="bg-surface-card rounded-xl border border-dashed border-border-medium p-space-xl text-center">' +
      ((d.kpis || []).length ? emptyState('search', 'No KPIs match these filters.') : emptyState('empty', 'FY' + esc(d.year) + ' has no Master KPIs yet.')) +
    '</div>';
  schedulePins();
}
