'use strict';

function openWorkspace(nik) {
  $('map-picker').classList.add('hidden');
  $('map-workspace').classList.remove('hidden');
  window.scrollTo(0, 0);
  onEmployeeSelect(nik);
}

function backToPicker() {
  guardUnsaved(function () {
    $('map-workspace').classList.add('hidden');
    $('map-picker').classList.remove('hidden');
    S.mapping = null; S.assigned = []; S.available = []; S.history = [];
    window.scrollTo(0, 0);
    loadOverview();
  });
}

function currentIds() {
  return S.assigned.map(function (k) { return k.KPI_ID; });
}

function isBasketDirty() {
  if (!S.mapping || !S.mapping.assigned) return false;
  var now = currentIds().slice().sort().join(',');
  var saved = S.mapping.assigned.map(function (k) { return k.KPI_ID; }).sort().join(',');
  return now !== saved;
}

function discardBasket() {
  if (!S.mapping) return;
  S.assigned = S.mapping.assigned.slice();
  S.history = (S.mapping.inactive || []).slice();
  var ids = currentIds().concat(S.history.map(function (k) { return k.KPI_ID; }));
  S.available = S.catalogue.filter(function (k) { return ids.indexOf(k.KPI_ID) === -1; });
}

function guardUnsaved(proceed) {
  var catDirty = isCategoryDirty();
  var kpiDirty = !catDirty && S.view === 'my-kpis' && myKpisDirty();
  if (!catDirty && !kpiDirty && !isBasketDirty()) { proceed(); return; }

  S.pendingProceed = proceed;
  var name = S.mapping && S.mapping.employee ? S.mapping.employee.Full_Name : 'this employee';
  var message = catDirty
    ? 'The <strong>Categories</strong> page has ' + categoryChangeCount() +
      ' unsaved changes. Leave and discard them?'
    : kpiDirty
    ? 'Your <strong>My KPIs</strong> entries for this month are not submitted yet. Leave and discard them?'
    : 'The KPI mapping for <strong>' + esc(name) +
      '</strong> has unsaved changes. Leave and discard them?';

  $('modal-host').innerHTML =
    '<div class="modal-backdrop">' +
      '<div class="modal-panel !max-w-md">' +
        '<div class="px-6 pt-6 pb-5 flex items-start gap-4">' +
          '<span class="w-10 h-10 rounded-full bg-status-warning-subtle text-status-warning flex items-center justify-center shrink-0">' +
            '<span class="material-symbols-outlined text-[22px]">warning</span></span>' +
          '<div class="min-w-0">' +
            '<h2 class="text-title-lg text-text-primary">Unsaved changes</h2>' +
            '<p class="text-body-sm text-text-secondary mt-1">' + message + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex items-center justify-end gap-space-sm">' +
          '<button class="btn btn-secondary" onclick="MGI.cancelLeave()">Stay</button>' +
          '<button class="btn btn-primary" onclick="MGI.confirmLeave()">Discard &amp; Continue</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function cancelLeave() {
  S.pendingProceed = null;
  $('modal-host').innerHTML = '';
  closeSwitcher();
}

function confirmLeave() {
  var proceed = S.pendingProceed;
  S.pendingProceed = null;
  $('modal-host').innerHTML = '';
  discardBasket();
  if (S.catDraft && S.categories) resetCategoryDraft();
  if (proceed) proceed();
}

function switchEmployee(nik) {
  closeSwitcher();
  if (!nik || (S.mapping && S.mapping.employee.NIK === nik)) return;
  guardUnsaved(function () { onEmployeeSelect(nik); });
}

function switcherMarkup(e) {
  var meta = ['NIK ' + e.NIK, [e.Position, e.Department].filter(Boolean).join(' / '), e.Division]
    .filter(Boolean).join(' • ');
  return '<div id="map-switcher" class="combo">' +
    '<button type="button" class="combo-trigger" onclick="MGI.openSwitcher()" title="Switch employee">' +
      '<span class="w-10 h-10 rounded-xl bg-primary-container text-white flex items-center justify-center text-label-sm font-bold shrink-0">' +
        esc(initials(e.Full_Name)) + '</span>' +
      '<span class="flex flex-col min-w-0 text-left">' +
        '<span class="text-title-md text-text-primary truncate">' + esc(e.Full_Name) + '</span>' +
        '<span class="text-xs text-slate-500 truncate">' + esc(meta) + '</span>' +
        emailLine(e.Email) +
      '</span>' +
      '<span class="material-symbols-outlined text-text-muted text-[20px]">unfold_more</span>' +
    '</button>' +
    '<div id="map-switcher-pop" class="combo-pop hidden">' +
      '<div class="relative p-2 border-b border-border-light">' +
        '<span class="material-symbols-outlined absolute left-4 top-4 text-text-muted text-[18px]">search</span>' +
        '<input id="map-switcher-q" type="search" class="field !pl-9 !py-1.5 !text-label-sm" placeholder="Search NIK, name or email"' +
          ' autocomplete="off" oninput="MGI.filterSwitcher()" onkeydown="MGI.onSwitcherKey(event)">' +
      '</div>' +
      '<div id="map-switcher-list" class="max-h-72 overflow-y-auto py-1"></div>' +
    '</div>' +
  '</div>';
}

function switcherRows() {
  if (!S.overview) return [];
  var box = $('map-switcher-q');
  var q = box && box.value ? box.value.trim().toLowerCase() : '';
  return S.overview.rows.filter(function (r) {
    return !q || (r.Full_Name + ' ' + r.NIK + ' ' + (r.Email || '')).toLowerCase().indexOf(q) > -1;
  });
}

function renderSwitcher() {
  filterSwitcher();
}

function filterSwitcher() {
  var list = $('map-switcher-list');
  if (!list) return;
  var current = S.mapping ? S.mapping.employee.NIK : '';
  var rows = switcherRows();

  list.innerHTML = rows.length
    ? rows.map(function (r) {
        return '<button type="button" class="combo-option' + (r.NIK === current ? ' is-current' : '') + '"' +
          ' onclick="MGI.pickSwitcher(\'' + esc(r.NIK) + '\')">' +
          '<span class="emp-avatar !w-7 !h-7 !text-[11px]">' + esc(r.Initials) + '</span>' +
          '<span class="flex flex-col min-w-0 text-left">' +
            '<span class="text-label-md text-text-primary font-semibold truncate">' + esc(r.Full_Name) + '</span>' +
            '<span class="text-label-xs text-text-muted truncate">' + esc(r.NIK) + ' • ' + esc(r.Position) + '</span>' +
          '</span>' +
          (r.hasMapping ? '' : '<span class="pill pill-warning !py-0 !text-[11px] ml-auto">Unassigned</span>') +
        '</button>';
      }).join('')
    : '<p class="px-3 py-4 text-body-sm text-text-muted text-center">No matching employees.</p>';
}

function openSwitcher() {
  var pop = $('map-switcher-pop');
  if (!pop) return;
  var willOpen = pop.classList.contains('hidden');
  pop.classList.toggle('hidden', !willOpen);
  if (!willOpen) return;
  var q = $('map-switcher-q');
  if (q) q.value = '';
  filterSwitcher();
  if (q && q.focus) q.focus();
}

function closeSwitcher() {
  var pop = $('map-switcher-pop');
  if (pop) pop.classList.add('hidden');
}

function onSwitcherKey(e) {
  if (e.key === 'Escape') { closeSwitcher(); return; }
  if (e.key !== 'Enter') return;
  e.preventDefault();
  var rows = switcherRows();
  if (rows.length) pickSwitcher(rows[0].NIK);
}

function pickSwitcher(nik) {
  switchEmployee(nik);
}

function onEmployeeSelect(nik, keepIds) {
  nik = nik || (S.mapping ? S.mapping.employee.NIK : '');
  if (!nik) return;

  $('map-assigned').innerHTML = '<div class="skeleton h-20 w-full"></div>';
  $('map-catalogue').innerHTML = '<div class="skeleton h-24 w-full"></div>';
  if (!keepIds) {
    $('map-employee-meta').innerHTML = '<div class="skeleton h-10 w-64 max-w-full rounded-lg"></div>';
    $('map-weight-summary').innerHTML = '';
    $('map-weight-meters').innerHTML = '';
  }

  var year = mapYear();
  api('getMappingForEmployee', nik, year)
    .then(function (data) {
      if (year !== mapYear()) return;
      var keep = keepIds && S.mapping && S.mapping.employee.NIK === nik ? keepIds : null;
      var keptCollapsed = keep ? S.collapsed : {};
      var keptHistoryOpen = keep ? S.historyOpen : false;
      var prevFilters = keep
        ? [$('map-f-division').value, $('map-f-department').value, $('map-f-position').value]
        : null;

      S.mapping = data;
      S.mapping.inactive = data.inactive || [];
      S.catalogue = data.available.concat(data.assigned, S.mapping.inactive);

      if (keep) {
        var persistedIds = data.assigned.concat(S.mapping.inactive).map(function (k) { return k.KPI_ID; });
        S.assigned = S.catalogue.filter(function (k) { return keep.indexOf(k.KPI_ID) > -1; });
        S.history = S.catalogue.filter(function (k) {
          return keep.indexOf(k.KPI_ID) === -1 && persistedIds.indexOf(k.KPI_ID) > -1;
        });
        S.available = S.catalogue.filter(function (k) {
          return keep.indexOf(k.KPI_ID) === -1 && persistedIds.indexOf(k.KPI_ID) === -1;
        });
      } else {
        S.assigned = data.assigned.slice();
        S.history = S.mapping.inactive.slice();
        S.available = data.available.slice();
      }
      S.collapsed = keptCollapsed;
      if (!keep) S.catOpen = {};
      S.historyOpen = keptHistoryOpen;

      $('map-employee-meta').innerHTML = switcherMarkup(data.employee);

      renderSwitcher();
      if (!S.switcherWired) {
        S.switcherWired = true;
        document.addEventListener('click', function (ev) {
          var box = $('map-switcher');
          if (box && !box.contains(ev.target)) closeSwitcher();
        });
      }

      buildCatalogueFilters(data);
      if (prevFilters) {
        $('map-f-division').value = prevFilters[0];
        refreshFilterOptions();
        $('map-f-department').value = prevFilters[1];
        refreshFilterOptions();
        $('map-f-position').value = prevFilters[2];
      }

      renderAssigned(); renderCatalogue(); renderWeightHero(); renderSaveHint();
    })
    .catch(function (err) {
      $('map-assigned').innerHTML = '';
      $('map-catalogue').innerHTML = '';
      toast(err.message, 'error');
    });
}

function distinct(list, field) {
  var seen = {};
  var out = [];
  list.forEach(function (k) {
    var v = String(k[field] || '').trim();
    if (!v || seen[v.toLowerCase()]) return;
    seen[v.toLowerCase()] = true;
    out.push(v);
  });
  return out.sort();
}

function catalogueScope(level) {
  var div = $('map-f-division').value;
  var dep = $('map-f-department').value;
  return S.catalogue.filter(function (k) {
    if (div && !eqiJs(k.Division, div)) return false;
    if (level === 'position' && dep && !eqiJs(k.Department, dep)) return false;
    return true;
  });
}

function buildCatalogueFilters(data) {
  var home = data.home;
  var divisions = distinct(S.catalogue, 'Division');

  var homeDivHasDept = home.Department && S.catalogue.some(function (k) {
    return eqiJs(k.Division, home.Division) && eqiJs(k.Department, home.Department);
  });

  $('map-f-division').innerHTML = '<option value="">All</option>' +
    divisions.map(function (v) { return '<option value="' + esc(v) + '">' + esc(v) + '</option>'; }).join('');
  $('map-f-division').value = homeDivHasDept ? (home.Division || '') : '';

  refreshFilterOptions();

  var depOk = home.Department && Array.prototype.some.call($('map-f-department').options,
    function (o) { return eqiJs(o.value, home.Department); });
  $('map-f-department').value = depOk ? home.Department : '';

  refreshFilterOptions();

  var posOk = home.Position && Array.prototype.some.call($('map-f-position').options,
    function (o) { return eqiJs(o.value, home.Position); });
  $('map-f-position').value = posOk ? home.Position : '';
}

function refreshFilterOptions() {
  var depSel = $('map-f-department');
  var posSel = $('map-f-position');
  var keepDep = depSel.value;
  var keepPos = posSel.value;

  var departments = distinct(catalogueScope('department'), 'Department');
  depSel.innerHTML = '<option value="">All</option>' +
    departments.map(function (v) { return '<option value="' + esc(v) + '">' + esc(v) + '</option>'; }).join('');
  depSel.value = departments.indexOf(keepDep) > -1 ? keepDep : '';

  var positions = distinct(catalogueScope('position'), 'Position');
  posSel.innerHTML = '<option value="">All</option>' +
    positions.map(function (v) { return '<option value="' + esc(v) + '">' + esc(v) + '</option>'; }).join('');
  posSel.value = positions.indexOf(keepPos) > -1 ? keepPos : '';
}

function onFilterChange() {
  refreshFilterOptions();
  renderCatalogue();
}

function resetCatalogueFilter() {
  if (!S.mapping) return;
  $('map-f-division').value = '';
  $('map-f-department').value = '';
  $('map-f-position').value = '';
  refreshFilterOptions();
  renderCatalogue();
}

function groupAssigned() {
  var buckets = {};
  var order = [];
  S.assigned.forEach(function (k) {
    var key = roleKey(k);
    if (!buckets[key]) {
      buckets[key] = { key: key, label: roleLabel(k), items: [], weight: 0 };
      order.push(key);
    }
    buckets[key].items.push(k);
    buckets[key].weight += Number(k.Weight);
  });
  return order.map(function (key) {
    var g = buckets[key];
    g.count = g.items.length;
    g.percent = Math.round(g.weight * 1000) / 10;
    g.weightValid = Math.abs(g.weight - 1) < 0.0001;
    g.quotaValid = g.count <= (S.user.maxKpi || 10);
    g.valid = g.weightValid && g.quotaValid;
    return g;
  });
}

function totalWeight() {
  return S.assigned.reduce(function (s, k) { return s + Number(k.Weight); }, 0);
}

function renderWeightHero() {
  var summary = $('map-weight-summary');
  var metersHost = $('map-weight-meters');
  if (!S.mapping) { summary.innerHTML = ''; metersHost.innerHTML = ''; return; }

  var groups = groupAssigned();
  var maxKpi = S.user.maxKpi || 10;
  var bad = groups.filter(function (g) { return !g.valid; }).length;
  var rule = esc('Each role must reach exactly 100% on its own and hold at most ' + maxKpi + ' KPIs');

  var acct = mapAccountRow();
  summary.innerHTML =
    '<span class="pill pill-brand" title="Fiscal year of this mapping"><span class="material-symbols-outlined text-[14px]">calendar_month</span>FY' +
      esc(S.mapping.year || mapYear()) + '</span>' +
    (acct ? accountPill(acct.account) + resetButton(acct, false) : '') +
    (!groups.length
      ? '<span class="pill pill-neutral" title="' + rule + '"><span class="material-symbols-outlined text-[14px]">pending</span> No KPIs selected</span>'
      : !bad
        ? '<span class="pill pill-success" title="' + rule + '"><span class="material-symbols-outlined text-[14px]">check_circle</span> All roles at 100%</span>'
        : '<span class="pill pill-danger" title="' + rule + '"><span class="material-symbols-outlined text-[14px]">error</span> ' +
          bad + (bad === 1 ? ' role needs' : ' roles need') + ' attention</span>') +
    '<span class="pill pill-neutral"><span class="material-symbols-outlined text-[14px]">fact_check</span> ' +
      S.assigned.length + ' KPIs • ' + groups.length + (groups.length === 1 ? ' role' : ' roles') + '</span>';

  metersHost.innerHTML = groups.length
    ? groups.map(function (g) {
        return '<div class="flex-1 min-w-[220px]">' +
          '<div class="flex items-center justify-between gap-space-sm mb-1">' +
            '<span class="text-label-md text-text-primary font-semibold truncate">' + esc(g.label) + '</span>' +
            '<span class="pill ' + (g.valid ? 'pill-success' : 'pill-danger') + '">' +
              '<span class="material-symbols-outlined text-[14px]">' +
                (g.valid ? 'check_circle' : 'error') + '</span> ' + g.percent + '%</span>' +
          '</div>' +
          '<div class="meter-track meter-sm"><div class="meter-fill ' + (g.weightValid ? 'is-valid' : '') +
            '" style="width:' + Math.max(0, Math.min(100, g.percent)) + '%"></div></div>' +
          '<p class="text-label-xs text-text-muted mt-1">' + g.count + ' of ' + maxKpi + ' KPIs' +
            (g.quotaValid ? '' : ', over quota') +
            (g.weightValid ? '' : (g.percent < 100 ? ', short by ' + (Math.round((100 - g.percent) * 10) / 10) + '%'
                                                   : ', over by ' + (Math.round((g.percent - 100) * 10) / 10) + '%')) +
          '</p>' +
        '</div>';
      }).join('')
    : '<p class="text-body-sm text-text-muted">No KPIs selected yet. Add roles from the KPI Catalogue.</p>';
}

function isPersisted(kpiId) {
  if (!S.mapping) return false;
  var hit = function (list) {
    return (list || []).some(function (k) { return k.KPI_ID === kpiId; });
  };
  return hit(S.mapping.assigned) || hit(S.mapping.inactive);
}

function renderAssigned() {
  $('map-assigned-count').textContent = S.assigned.length + ' Active' +
    (S.history.length ? ', ' + S.history.length + ' Inactive' : '');

  if (!S.mapping) {
    $('map-assigned').innerHTML =
      '<div class="bg-surface-card rounded-xl p-space-xl text-center border border-dashed border-border-medium">' +
        '<span class="material-symbols-outlined text-[36px] text-text-muted">person_search</span>' +
        '<p class="text-body-md text-text-secondary mt-2">Select an employee to start mapping KPIs.</p>' +
      '</div>';
    return;
  }

  var home = S.mapping.home;

  var active = !S.assigned.length
    ? '<div class="bg-surface-card rounded-xl p-space-xl text-center border border-dashed border-border-medium">' +
        '<span class="material-symbols-outlined text-[36px] text-text-muted">playlist_add</span>' +
        '<p class="text-body-md text-text-secondary mt-2">No active KPIs yet.</p>' +
        '<p class="text-body-sm text-text-muted">Pick a role in the catalogue, then click <strong>Add Role</strong>. Every active role must be exactly 100%.</p>' +
      '</div>'
    : groupAssigned().map(function (g) {
        var isHome = eqiJs(g.items[0].Department, home.Department) &&
                     eqiJs(g.items[0].Position, home.Position);
        var collapsed = !!S.collapsed[g.key];
        var hasSaved = g.items.some(function (k) { return isPersisted(k.KPI_ID); });

        return '<div class="role-group shrink-0 !mt-0 shadow-level-1' + (collapsed ? ' is-collapsed' : '') + '">' +
          '<div class="role-group-head !p-4' + (g.valid ? '' : ' is-invalid') +
            '" onclick="MGI.toggleRoleGroup(\'' + esc(g.key) + '\')"' +
            ' title="Click to ' + (collapsed ? 'expand' : 'collapse') + ' this role">' +
            '<span class="material-symbols-outlined text-[20px] text-text-secondary">' +
              (collapsed ? 'expand_more' : 'expand_less') + '</span>' +
            '<span class="material-symbols-outlined text-[18px] ' +
              (g.valid ? 'text-status-success' : 'text-status-danger') + '">' +
              (g.valid ? 'check_circle' : 'error') + '</span>' +
            '<span class="text-title-md text-text-primary">' + esc(g.label) + '</span>' +
            (isHome
              ? '<span class="pill pill-neutral !text-[11px]">Home</span>'
              : '<span class="pill pill-maroon !text-[11px]">Additional Role</span>') +
            '<span class="ml-auto flex items-center justify-end gap-space-sm flex-wrap">' +
              '<span class="text-label-xs text-text-muted">' + g.count + ' / ' + (S.user.maxKpi || 10) + ' KPI</span>' +
              '<span class="pill ' + (g.valid ? 'pill-success' : 'pill-danger') + '">' + g.percent + '%</span>' +
              '<button class="btn btn-secondary !py-1 !px-2.5 !text-label-sm"' +
                ' onclick="event.stopPropagation();MGI.deactivateRoleGroup(\'' + esc(g.key) + '\')"' +
                ' title="' + (hasSaved
                  ? 'Deactivate every KPI in this role. Score history is kept.'
                  : 'Return every KPI in this role to the catalogue') + '">' +
                '<span class="material-symbols-outlined text-[16px]">' + (hasSaved ? 'toggle_off' : 'undo') + '</span>' +
                (hasSaved ? 'Deactivate Role' : 'Undo Role') +
              '</button>' +
            '</span>' +
          '</div>' +
          '<div class="role-group-body">' +
            g.items.map(function (k) { return cardAssigned(k, false); }).join('') +
          '</div>' +
        '</div>';
      }).join('');

  $('map-assigned').innerHTML = active + renderHistoryBasket();
}

function renderHistoryBasket() {
  if (!S.history.length) return '';

  var open = !!S.historyOpen;
  var maxKpi = S.user.maxKpi || 10;
  var buckets = {};
  var order = [];
  S.history.forEach(function (k) {
    var key = roleKey(k);
    if (!buckets[key]) {
      buckets[key] = { label: roleLabel(k), items: [] };
      order.push(key);
    }
    buckets[key].items.push(k);
  });

  return '<div class="role-group role-history shrink-0 !mt-0 shadow-level-1' + (open ? '' : ' is-collapsed') + '">' +
    '<div class="role-group-head !p-4" onclick="MGI.toggleHistoryBasket()"' +
      ' title="Click to ' + (open ? 'collapse' : 'expand') + ' history">' +
      '<span class="material-symbols-outlined text-[20px] text-text-secondary">' +
        (open ? 'expand_less' : 'expand_more') + '</span>' +
      '<span class="material-symbols-outlined text-[18px] text-text-muted">history</span>' +
      '<span class="text-title-md text-text-secondary">History (Inactive)</span>' +
      '<span class="pill pill-neutral !text-[11px]">' + S.history.length + ' KPI</span>' +
      '<span class="ml-auto text-label-xs text-text-muted">Not counted in weight validation</span>' +
    '</div>' +
    '<div class="role-group-body">' +
      order.map(function (key) {
        var b = buckets[key];
        var full = roleCount(key) + b.items.length > maxKpi;
        return '<div class="flex items-center justify-between gap-space-sm flex-wrap mt-1">' +
            '<p class="text-label-xs uppercase tracking-wider text-text-muted">' + esc(b.label) + ' • ' + b.items.length + ' KPI</p>' +
            '<button class="btn btn-secondary !py-1 !px-2.5 !text-label-sm" onclick="MGI.activateRoleGroup(\'' + esc(key) + '\')"' +
              (full ? ' disabled title="This role would exceed the quota of ' + maxKpi + ' active KPIs"'
                    : ' title="Reactivate every KPI in this role"') + '>' +
              '<span class="material-symbols-outlined text-[16px]">' + (full ? 'block' : 'toggle_on') + '</span>' +
              (full ? 'Quota Full' : 'Activate Role') +
            '</button>' +
          '</div>' +
          b.items.map(function (k) { return cardAssigned(k, true); }).join('');
      }).join('') +
    '</div>' +
  '</div>';
}

function toggleRoleGroup(key) {
  S.collapsed[key] = !S.collapsed[key];
  renderAssigned();
}

function toggleHistoryBasket() {
  S.historyOpen = !S.historyOpen;
  renderAssigned();
}

function cardAssigned(k, inactive) {
  var persisted = isPersisted(k.KPI_ID);
  return '' +
  '<div class="bg-surface-card rounded-lg p-space-sm border border-border-light hover:shadow-level-1 transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm' +
    (inactive ? ' kpi-inactive' : '') + '">' +
    '<div class="flex flex-col min-w-0 flex-1">' +
      '<div class="flex items-center gap-space-xs mb-0.5 flex-wrap">' +
        '<span class="text-code-num px-2 py-0.5 bg-surface-container-high rounded text-text-primary font-bold">' + esc(k.KPI_ID) + '</span>' +
        (persisted ? '' : '<span class="pill pill-warning !py-0 !text-[11px]">Unsaved</span>') +
        durationPill(k.Duration, true) +
        '<span class="text-label-xs text-text-muted">' + esc(k.Label) + '</span>' +
      '</div>' +
      '<h3 class="text-label-md text-text-primary font-semibold">' + esc(k.KPI_Name) + '</h3>' +
      '<p class="text-label-xs text-text-muted">' + esc(k.Metrics || '-') + '</p>' +
    '</div>' +
    '<div class="flex items-center gap-1.5 bg-surface-page px-2.5 py-1 rounded-lg shrink-0 self-start sm:self-center"' +
      ' title="Weight comes from the Master KPI. Use the edit icon in the catalogue to change it.">' +
      '<span class="text-label-xs uppercase tracking-wider text-text-secondary">Weight</span>' +
      '<span class="text-label-md text-text-primary font-bold tnum whitespace-nowrap">' + pct(k.WeightPercent) + '</span>' +
    '</div>' +
  '</div>';
}

function eqiJs(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

function renderCatalogue() {
  if (!S.mapping) {
    $('map-catalogue').innerHTML =
      '<p class="text-body-sm text-text-muted text-center py-space-lg">Select an employee first.</p>';
    return;
  }

  var q = ($('map-search').value || '').toLowerCase();
  var fDiv = $('map-f-division').value;
  var fDep = $('map-f-department').value;
  var fPos = $('map-f-position').value;
  var home = S.mapping.home;

  if (q !== S.catQuery) {
    S.catQuery = q;
    S.catOpen = {};
  }

  var list = S.available.filter(function (k) {
    if (fDiv && !eqiJs(k.Division, fDiv)) return false;
    if (fDep && !eqiJs(k.Department, fDep)) return false;
    if (fPos && !eqiJs(k.Position, fPos)) return false;
    if (!q) return true;
    return (k.KPI_Name + ' ' + k.Metrics + ' ' + k.KPI_ID).toLowerCase().indexOf(q) > -1;
  });
  var groups = catalogueGroups(list);

  var isHomeFilter = eqiJs(fDep, home.Department) && eqiJs(fPos, home.Position);
  $('map-filter-note').innerHTML =
    (!fDiv && !fDep && !fPos)
      ? 'Showing every role: ' + groups.length + ' roles, ' + list.length + ' indicators.'
      : isHomeFilter
        ? 'Showing the home role: ' + esc(home.Position) + ' / ' + esc(home.Department) + '.'
        : '<span class="text-status-warning-text font-semibold">Showing KPIs outside the employee home role.</span> ' +
          'Every additional role must be exactly 100%.';

  if (!list.length) {
    var inFilter = S.catalogue.filter(function (k) {
      return (!fDiv || eqiJs(k.Division, fDiv)) && (!fDep || eqiJs(k.Department, fDep)) && (!fPos || eqiJs(k.Position, fPos));
    }).length;
    $('map-catalogue').innerHTML =
      '<div class="bg-surface-card rounded-xl p-space-lg text-center border border-dashed border-border-medium">' +
        '<p class="text-body-md text-text-secondary">' +
          (q ? 'No KPIs match your search.'
             : inFilter ? 'Every KPI in this filter is already selected or in the history.'
             : 'This filter has no KPIs in FY' + esc(S.mapping.year || mapYear()) + ' yet.') + '</p>' +
        '<p class="text-body-sm text-text-muted mt-1">' +
          (q ? 'Try another name or clear the search.'
             : inFilter ? 'Change the filters above to add KPIs from another role.'
             : 'Create them in Master KPIs, then come back to map them.') + '</p>' +
        (!q && !inFilter
          ? '<button type="button" class="btn btn-secondary !py-1.5 !px-3 !text-label-sm mt-space-md" onclick="MGI.go(\'master-kpis\')">' +
              '<span class="material-symbols-outlined text-[16px]">library_books</span> Open Master KPIs</button>'
          : '') +
      '</div>';
    return;
  }

  var maxKpi = S.user.maxKpi || 10;
  S.catAuto = groups.length === 1 || !!q;

  $('map-catalogue').innerHTML = groups.map(function (g) {
    var all = S.available.filter(function (k) { return roleKey(k) === g.key; });
    var inBasket = roleCount(g.key);
    var weight = S.assigned.concat(all).reduce(function (sum, k) {
      return roleKey(k) === g.key ? sum + (Number(k.Weight) || 0) : sum;
    }, 0);
    var percent = Math.round(weight * 1000) / 10;
    var totalOk = Math.abs(weight - 1) < 0.0001;
    var full = inBasket + all.length > maxKpi;
    var open = catIsOpen(g.key);
    var isHome = eqiJs(g.department, home.Department) && eqiJs(g.position, home.Position);
    var key = esc(g.key);

    return '<div class="role-group cat-group shrink-0 !mt-0 shadow-level-1' + (open ? '' : ' is-collapsed') + '">' +
      '<div class="role-group-head !p-4" onclick="MGI.toggleCatGroup(\'' + key + '\')"' +
        ' title="Click to ' + (open ? 'collapse' : 'expand') + ' the KPI list for this role">' +
        '<span class="material-symbols-outlined text-[20px] text-text-secondary">' +
          (open ? 'expand_less' : 'expand_more') + '</span>' +
        '<div class="flex flex-col gap-1 min-w-0 flex-1">' +
          '<div class="flex items-center gap-space-xs flex-wrap">' +
            '<span class="text-title-md text-text-primary">' + esc(g.label) + '</span>' +
            (isHome
              ? '<span class="pill pill-neutral !py-0 !text-[11px]">Home</span>'
              : '<span class="pill pill-maroon !py-0 !text-[11px]">Cross-Role</span>') +
          '</div>' +
          '<div class="flex items-center gap-space-xs flex-wrap">' +
            (g.division ? '<span class="text-label-xs text-text-muted">' + esc(g.division) + '</span>' : '') +
            '<span class="pill pill-neutral !py-0 !text-[11px]">' + all.length + ' KPI</span>' +
            '<span class="pill ' + (totalOk ? 'pill-success' : 'pill-warning') + ' !py-0 !text-[11px]"' +
              (totalOk ? '' : ' title="Role total weight must be exactly 100%. Fix it with the Master KPI edit icon."') + '>' +
              (totalOk ? '' : '<span class="material-symbols-outlined text-[12px]">warning</span>') +
              'Total ' + percent + '%</span>' +
            (inBasket ? '<span class="pill pill-info !py-0 !text-[11px]">' + inBasket + ' already in basket</span>' : '') +
            (q && g.items.length < all.length
              ? '<span class="text-label-xs text-text-muted">' + g.items.length + ' match search</span>' : '') +
          '</div>' +
        '</div>' +
        '<button class="btn btn-secondary !py-1.5 !px-3 !text-label-sm shrink-0"' +
          ' onclick="event.stopPropagation();MGI.addRoleGroup(\'' + key + '\')"' +
          (full ? ' disabled title="This role would exceed the quota of ' + maxKpi + ' KPIs"'
                : ' title="Add every KPI in this role to the basket"') + '>' +
          '<span class="material-symbols-outlined text-[16px] ' + (full ? 'text-slate-400' : 'text-primary-container') + '">' + (full ? 'block' : 'add') + '</span>' +
          (full ? 'Quota Full' : 'Add Role (' + all.length + ')') +
        '</button>' +
      '</div>' +
      '<div class="role-group-body">' + g.items.map(catalogueCard).join('') + '</div>' +
    '</div>';
  }).join('');
}

function catalogueGroups(list) {
  var home = S.mapping.home;
  var buckets = {};
  var order = [];
  list.forEach(function (k) {
    var key = roleKey(k);
    if (!buckets[key]) {
      buckets[key] = { key: key, label: roleLabel(k), position: k.Position,
                       department: k.Department, division: k.Division, items: [] };
      order.push(key);
    }
    buckets[key].items.push(k);
  });
  var rank = function (g) {
    return eqiJs(g.department, home.Department) && eqiJs(g.position, home.Position) ? 0 : 1;
  };
  return order.map(function (key) { return buckets[key]; }).sort(function (a, b) {
    return rank(a) - rank(b) || a.label.localeCompare(b.label);
  });
}

function catalogueCard(k) {
  return '' +
  '<div class="rounded-lg p-space-sm border border-border-light bg-surface-card hover:shadow-level-1 transition-shadow">' +
    '<div class="flex items-start justify-between gap-space-sm">' +
      '<div class="min-w-0 flex-1">' +
        '<div class="flex items-center gap-space-xs flex-wrap mb-0.5">' +
          '<span class="text-code-num px-2 py-0.5 bg-surface-container-high rounded text-text-primary font-bold">' + esc(k.KPI_ID) + '</span>' +
          durationPill(k.Duration, true) +
          '<span class="text-label-xs text-text-muted">' + esc(k.Label) + ' • Target ' +
            esc(num(k.Target, 2)) + ' ' + esc(k.Unit || '') + '</span>' +
        '</div>' +
        '<h3 class="text-label-md text-text-primary font-semibold">' + esc(k.KPI_Name) + '</h3>' +
        '<p class="text-label-xs text-text-muted">' + esc(k.Metrics || '-') + '</p>' +
      '</div>' +
      '<div class="flex items-center gap-space-xs shrink-0">' +
        '<span class="text-label-sm text-text-primary font-bold tnum whitespace-nowrap">Weight: ' + pct(k.WeightPercent) + '</span>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function catIsOpen(key) {
  return Object.prototype.hasOwnProperty.call(S.catOpen, key) ? S.catOpen[key] : S.catAuto;
}

function toggleCatGroup(key) {
  S.catOpen[key] = !catIsOpen(key);
  renderCatalogue();
}

function roleKey(k) {
  var base = (k.Position + '|' + k.Department).toLowerCase();
  return k.Year ? base + '|' + k.Year : base;
}

function roleLabel(k) {
  return k.Position + ' / ' + k.Department + (k.Year ? ' (' + k.Year + ')' : '');
}

function roleCount(key) {
  return S.assigned.filter(function (k) { return roleKey(k) === key; }).length;
}

function addRoleGroup(key) {
  var incoming = S.available.filter(function (k) { return roleKey(k) === key; });
  if (!incoming.length) return;

  var maxKpi = S.user.maxKpi || 10;
  var label = roleLabel(incoming[0]);
  var total = roleCount(key) + incoming.length;

  if (total > maxKpi) {
    toast('Role ' + label + ' would hold ' + total + ' KPIs, above the quota of ' + maxKpi + '.', 'warning');
    return;
  }

  S.available = S.available.filter(function (k) { return roleKey(k) !== key; });
  S.assigned = S.assigned.concat(incoming);
  S.collapsed[key] = false;
  renderAssigned(); renderCatalogue(); renderWeightHero(); renderSaveHint();
  toast(incoming.length + ' KPIs from ' + label + ' added to the basket. Save to publish.', 'success');
}

function deactivateRoleGroup(key) {
  var members = S.assigned.filter(function (k) { return roleKey(k) === key; });
  if (!members.length) return;

  var saved = members.filter(function (k) { return isPersisted(k.KPI_ID); });
  var fresh = members.filter(function (k) { return !isPersisted(k.KPI_ID); });

  S.assigned = S.assigned.filter(function (k) { return roleKey(k) !== key; });
  S.history = S.history.concat(saved);
  S.available = S.available.concat(fresh).sort(function (a, b) { return a.KPI_ID < b.KPI_ID ? -1 : 1; });
  if (saved.length) S.historyOpen = true;

  renderAssigned(); renderCatalogue(); renderWeightHero(); renderSaveHint();
}

function activateRoleGroup(key) {
  var members = S.history.filter(function (k) { return roleKey(k) === key; });
  if (!members.length) return;

  var maxKpi = S.user.maxKpi || 10;
  var total = roleCount(key) + members.length;
  if (total > maxKpi) {
    toast('Role ' + roleLabel(members[0]) + ' would hold ' + total +
          ' active KPIs, above the quota of ' + maxKpi + '.', 'warning');
    return;
  }

  S.history = S.history.filter(function (k) { return roleKey(k) !== key; });
  S.assigned = S.assigned.concat(members);
  S.collapsed[key] = false;

  renderAssigned(); renderCatalogue(); renderWeightHero(); renderSaveHint();
}

function renderSaveHint() {
  var btn = $('btn-save-mapping');
  var hint = $('map-save-hint');

  if (!S.mapping) {
    btn.disabled = true;
    hint.innerHTML = '<span class="material-symbols-outlined text-text-muted">info</span>' +
                     '<p class="text-body-sm text-text-muted">Select an employee to begin.</p>';
    return;
  }

  var groups = groupAssigned();
  var bad = groups.filter(function (g) { return !g.valid; });
  var retireAll = groups.length === 0 && S.mapping.assigned.length > 0;
  var valid = bad.length === 0 && (groups.length > 0 || retireAll);
  var dirty = isBasketDirty();

  btn.disabled = !valid || !dirty;

  if (valid && !dirty) {
    hint.innerHTML = '<span class="material-symbols-outlined text-text-muted">verified</span>' +
      '<div><p class="text-title-md text-text-primary">Published</p>' +
      '<p class="text-body-sm text-text-secondary">' + esc(S.mapping.employee.Full_Name) + ' has ' +
        plural(S.assigned.length, 'KPI') + ' in ' + plural(groups.length, 'role') + ', every weight at 100%. ' +
        'Add or remove KPIs to make a change.</p></div>';
    return;
  }

  hint.innerHTML = valid
    ? '<span class="material-symbols-outlined text-status-success">task_alt</span>' +
      '<div><p class="text-title-md text-text-primary">Ready to Publish</p>' +
      '<p class="text-body-sm text-text-secondary">' +
      (retireAll
        ? plural(S.mapping.assigned.length, 'KPI') + ' will be deactivated for ' + esc(S.mapping.employee.Full_Name) + '. Their history is kept.'
        : esc(S.mapping.employee.Full_Name) + ' will have ' + plural(S.assigned.length, 'KPI') + ' in ' + plural(groups.length, 'role') + ', every weight at 100%.') +
      '</p></div>'
    : '<span class="material-symbols-outlined text-status-danger">block</span>' +
      '<div><p class="text-title-md text-status-danger-text">Publishing Blocked</p>' +
      '<p class="text-body-sm text-text-secondary">' +
        (groups.length === 0
          ? 'No KPIs selected yet.'
          : bad.map(function (g) {
              return esc(g.label) + ': ' +
                (!g.quotaValid ? g.count + ' KPIs exceed the quota of ' + (S.user.maxKpi || 10)
                               : 'weight ' + g.percent + '% must be exactly 100%');
            }).join('. ') + '.') +
      '</p></div>';
}

function saveMapping() {
  if (!S.mapping) return;
  var restore = busy($('btn-save-mapping'), 'Saving');
  var ids = S.assigned.map(function (k) { return k.KPI_ID; });

  api('saveMapping', S.mapping.employee.NIK, S.mapping.year || mapYear(), ids)
    .then(function (res) {
      restore();
      toast(res.message, 'success');
      S.mapping.assigned = S.assigned.slice();
      backToPicker();
    })
    .catch(function (err) {
      restore();
      toast(err.message, 'error');
    });
}
