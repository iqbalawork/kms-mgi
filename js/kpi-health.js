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

  var originSel = $('mkh-origin');
  var keepOrigin = originSel.value;
  var origins = d.origins || [];
  originSel.innerHTML = '<option value="">All Origins</option>' + origins.map(function (o) {
    return '<option value="' + esc(o) + '">' + esc(o) + '</option>';
  }).join('');
  originSel.value = origins.indexOf(keepOrigin) > -1 ? keepOrigin : '';
  fillKpiHealthDivisions();
}

function kpiHealthKpis() {
  var d = S.kpiHealth;
  if (!d) return [];
  var sel = $('mkh-origin');
  var origin = sel ? sel.value : '';
  if (!origin) return d.kpis || [];
  return (d.kpis || []).filter(function (k) {
    var o = k.byOrigin && k.byOrigin[origin];
    return o && o.holders > 0;
  }).map(function (k) { return Object.assign({}, k, k.byOrigin[origin]); });
}

function onKpiHealthOrigin() {
  fillKpiHealthDivisions();
  renderKpiHealth();
}

function fillKpiHealthDivisions() {
  var divSel = $('mkh-division');
  var keep = divSel.value;
  var seen = {};
  var divisions = [];
  kpiHealthKpis().forEach(function (k) {
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
  kpiHealthKpis().forEach(function (k) {
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
  $('mkh-tbody').innerHTML = '<tr><td colspan="11">' + html + '</td></tr>';
}

function kpiHealthHead(sort) {
  var rules = kpiHealthRules(S.kpiHealth);
  return '<tr>' +
    '<th>KPI ID</th>' +
    sortHead('KPI Name', 'name', sort, 'sortKpiHealth', 'min-w-[220px]') +
    sortHead('Role', 'role', sort, 'sortKpiHealth', 'min-w-[180px]') +
    '<th>Target</th>' +
    sortHead('Holders', 'holders', sort, 'sortKpiHealth', 'text-right whitespace-nowrap', '', 'holders') +
    sortHead('Submissions', 'entries', sort, 'sortKpiHealth', 'text-right') +
    sortHead('At ' + (rules.easyTier >= 1 ? '1.0' : '≥' + Number(rules.easyTier).toFixed(1)), 'top', sort, 'sortKpiHealth', 'text-right whitespace-nowrap', '', 'tier-share') +
    sortHead('At ' + (rules.hardTier <= 0.2 ? '0.2' : '≤' + Number(rules.hardTier).toFixed(1)), 'bottom', sort, 'sortKpiHealth', 'text-right') +
    sortHead('Avg Tier', 'tier', sort, 'sortKpiHealth', 'text-right whitespace-nowrap', '', 'avg-tier') +
    sortHead('Points lost', 'lost', sort, 'sortKpiHealth', 'text-right whitespace-nowrap') +
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
    tier:    function (k) { return k.avgTier; },
    lost:    function (k) { return k.ptsLost; }
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

function kpiHealthCaption(key) {
  var rules = kpiHealthRules(S.kpiHealth);
  if (key === 'easy') return 'Most results land at tier ' + healthTierText(rules.easyTier, true);
  if (key === 'hard') return 'Most results land at tier ' + healthTierText(rules.hardTier, false);
  return HEALTH_FLAGS[key].caption;
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
    '<span class="block text-body-sm text-text-muted">' + esc(kpiHealthCaption(key)) + '</span>' +
  '</button>';
}

function kpiHealthRules(d) {
  var t = (d && d.thresholds) || {};
  return {
    minEntries: t.minEntries, easyPct: t.easyPct, hardPct: t.hardPct,
    easyTier: isNum(t.easyTier) ? t.easyTier : 1, hardTier: isNum(t.hardTier) ? t.hardTier : 0.2
  };
}

function kpiHealthDef(label, value, flag) {
  var f = flag ? HEALTH_FLAGS[flag] : null;
  return '<div class="mkh-def">' +
    (f
      ? '<span class="pill ' + f.pill + ' !py-0 !text-[11px] self-start"><span class="material-symbols-outlined text-[14px]" aria-hidden="true">' + f.icon + '</span>' + esc(label) + '</span>'
      : '<span class="mkh-def-label">' + esc(label) + '</span>') +
    '<span class="mkh-def-value">' + esc(value) + '</span>' +
  '</div>';
}

function kpiHealthLegend(d) {
  var r = kpiHealthRules(d);
  var trial = (d.trialMonths || []).map(function (m) { return MONTHS[m - 1]; }).filter(Boolean);
  return '<div class="mkh-defs">' +
      kpiHealthDef('Easy', r.easyPct + '%+ at tier ' + healthTierText(r.easyTier, true), 'easy') +
      kpiHealthDef('Unrealistic', r.hardPct + '%+ at tier ' + healthTierText(r.hardTier, false), 'hard') +
      kpiHealthDef('Flag needs', r.minEntries + '+ submissions') +
      kpiHealthDef('Points lost', 'weight × (1 − avg tier)') +
    '</div>' +
    '<p class="mkh-note">' +
      '<span>Not counted: ' + (trial.length ? esc(trial.join(' and ')) + ' (trial) and ' : '') + 'the automatic 1.0 of off-cycle quarters. ' +
      'Points lost is per holder a month: it ranks reviews, the Flag says whether the target is the problem.</span>' +
    '</p>';
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
    '<td class="text-right whitespace-nowrap" title="Average points a month this KPI costs each holder: weight × (1 − avg tier)">' +
      (!isNum(k.ptsLost) ? '<span class="text-text-muted">-</span>'
        : k.ptsLost > 0 ? '<span class="text-code-num font-semibold text-status-danger-text">-' + esc(num(k.ptsLost, 2)) + '</span>'
        : '<span class="text-code-num text-text-muted">0</span>') +
      '<span class="block text-[11px] text-text-muted">weight ' + esc(num(k.WeightPercent, 1)) + '%</span>' +
    '</td>' +
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
  var base = kpiHealthKpis().filter(function (k) {
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
  $('mkh-legend').innerHTML = kpiHealthLegend(d);

  var list = kpiHealthSorted(base.filter(function (k) { return !flag || k.flag === flag; }));
  var empty = !list.length;
  $('mkh-card').classList.toggle('hidden', empty);
  $('mkh-empty').classList.toggle('hidden', !empty);
  $('mkh-thead').innerHTML = kpiHealthHead(S.healthSort || { key: 'flag', dir: 1 });
  $('mkh-tbody').innerHTML = list.map(kpiHealthRowHtml).join('');
  $('mkh-empty').innerHTML = !empty ? '' :
    '<div class="bg-surface-card rounded-xl border border-dashed border-border-medium p-space-xl text-center">' +
      ((d.kpis || []).length ? emptyState('search', $('mkh-origin') && $('mkh-origin').value && !kpiHealthKpis().length ? 'No employee from ' + esc($('mkh-origin').value) + ' holds a KPI in FY' + esc(d.year) + ' yet.' : 'No KPIs match these filters.') : emptyState('empty', 'FY' + esc(d.year) + ' has no Master KPIs yet.')) +
    '</div>';
  schedulePins();
}
