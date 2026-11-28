'use strict';

function guideJump(id) {
  var el = $(id);
  if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function guideOptionalNote(years, active) {
  var list = (years || []).filter(function (y) { return y === active || y === active - 1; });
  if (!list.length) return '';
  if (list.indexOf(active) !== -1) return '. Optional in FY' + active;
  return '. Optional for FY' + list[0] + ' months';
}

function initGuide() {
  if ($('guide-maxkpi')) $('guide-maxkpi').textContent = S.user.maxKpi || 10;
  if ($('guide-evidence')) {
    $('guide-evidence').textContent = (S.user.allowedExt || []).map(function (e) { return e.toUpperCase(); }).join(', ') +
      ', up to ' + (S.user.maxFileMb || 5) + ' MB' +
      guideOptionalNote(S.user.evidenceOptionalYears, S.user.year);
  }
  renderGuideBands();
  renderGuideCalc();
  renderGuidePerformance();
  syncGuideTabs();
}

function renderGuideBands() {
  var host = $('guide-bands');
  if (!host) return;
  var b = bandValues();

  var card = function (key, icon, text, note) {
    return '<div class="rounded-xl border border-border-light bg-surface-page p-space-md flex items-start gap-space-sm">' +
      '<span class="w-9 h-9 rounded-lg bg-status-' + key + '-subtle text-status-' + key + '-text flex items-center justify-center shrink-0">' +
        '<span class="material-symbols-outlined text-[20px]">' + icon + '</span></span>' +
      '<div class="min-w-0"><p class="text-title-md text-text-primary">' + esc(text) + '</p>' +
        '<p class="text-body-sm text-text-muted">' + note + '</p></div>' +
    '</div>';
  };

  host.innerHTML =
    '<div class="mb-space-md">' + bandScaleHtml(b) + '</div>' +
    '<div class="grid grid-cols-1 md:grid-cols-3 gap-space-sm">' +
      card('danger', 'flag', bandRange('danger'), 'Below expectations and worth a closer look.') +
      card('info', 'thumb_up', bandRange('info'), 'Solid performance within the expected range.') +
      card('success', 'workspace_premium', bandRange('success'), 'Outstanding results. Keep it up.') +
    '</div>';
}

var SIM_EXAMPLE = [
  { name: 'Sales revenue', label: 'Increase', target: '100', step: '10', weight: '40', strict: false, real: '92', unit: '' },
  { name: 'Document turnaround', label: 'Decrease', target: '30', step: '5', weight: '30', strict: false, real: '35', unit: 'days' },
  { name: 'Monthly report on time', label: 'Binary', target: '1', step: '', weight: '30', strict: false, real: '1', unit: '' }
];

function simCopy(rows) {
  return rows.map(function (r) { return Object.assign({}, r); });
}

function simState() {
  if (!S.sim) S.sim = { rows: simCopy(SIM_EXAMPLE), experiment: false, source: '' };
  return S.sim;
}

function simRoles() {
  return ((S.dashboard && S.dashboard.roles) || []).filter(function (r) {
    return (r.items || []).some(function (it) { return it.IsActive !== false; });
  });
}

function simRowsFromRole(role) {
  return role.items.filter(function (it) { return it.IsActive !== false; }).map(function (it) {
    return {
      name: (it.KPI_ID ? it.KPI_ID + ' ' : '') + (it.KPI_Name || ''),
      label: it.Label || 'Increase',
      target: formatNumValue(it.Target),
      step: formatNumValue(it.Multiplier),
      weight: formatNumValue(it.WeightPercent),
      strict: it.Target_Is_B === true,
      real: it.InCycle === false ? '' : formatNumValue(it.Realization),
      unit: it.Unit || '',
      offCycle: it.InCycle === false
    };
  });
}

function simScore(r) {
  if (r.offCycle) return 1.0;
  var real = parseNumText(r.real);
  var target = parseNumText(r.target);
  var step = parseNumText(r.step);
  if (!isNum(real) || !isNum(target)) return null;
  var label = r.label;
  if (label !== 'Binary' && !isNum(step)) return null;
  return calcScore(real, target, label, isNum(step) ? step : 0, !!r.strict);
}

function simWeight(r) {
  var w = parseNumText(r.weight);
  return isNum(w) && w > 0 ? w : 0;
}

function simPoints(r) {
  var score = simScore(r);
  return score === null ? null : Math.round(simWeight(r) * score * 100) / 100;
}

function simTotals(rows) {
  var weight = 0;
  var points = 0;
  var empty = 0;
  rows.forEach(function (r) {
    weight += simWeight(r);
    var p = simPoints(r);
    if (p === null) empty++;
    else points += p;
  });
  weight = Math.round(weight * 100) / 100;
  var index = weight > 0 ? Math.round(points / weight * 100 * 10) / 10 : 0;
  return { weight: weight, points: Math.round(points * 100) / 100, index: index, empty: empty };
}

function simToolsHtml(st) {
  var roles = simRoles();
  var maxKpi = (S.user && S.user.maxKpi) || 10;
  var source = roles.length
    ? '<label class="flex items-center gap-2 text-body-sm text-text-secondary"><span class="whitespace-nowrap">Start from</span>' +
        '<select id="gc-source" class="field !py-1.5" onchange="MGI.simSource(this.value)">' +
          '<option value=""' + (st.source ? '' : ' selected') + '>Example KPIs</option>' +
          roles.map(function (r) {
            return '<option value="' + attr(r.key) + '"' + (st.source === r.key ? ' selected' : '') + '>My KPIs: ' + esc(r.label || r.key) + '</option>';
          }).join('') +
        '</select></label>'
    : '';
  return source +
    '<button type="button" class="btn btn-secondary" aria-pressed="' + (st.experiment ? 'true' : 'false') + '" onclick="MGI.simExperiment()">' +
      '<span class="material-symbols-outlined text-[18px]">' + (st.experiment ? 'lock' : 'science') + '</span>' +
      (st.experiment ? 'Lock Admin values' : 'Experiment') + '</button>' +
    (st.experiment && st.rows.length < maxKpi
      ? '<button type="button" class="btn btn-secondary" onclick="MGI.simAdd()"><span class="material-symbols-outlined text-[18px]">add</span>Add KPI</button>'
      : '') +
    '<button type="button" class="btn btn-secondary" onclick="MGI.simReset()"><span class="material-symbols-outlined text-[18px]">restart_alt</span>Reset</button>';
}

function simCellInput(i, field, value, locked, extra) {
  return '<input type="text" inputmode="decimal" autocomplete="off" class="field !py-1.5 text-right tabular-nums w-full' + (locked ? ' bg-surface-page' : '') + '"' +
    ' value="' + esc(value) + '"' + (locked ? ' disabled title="Set by Admin / HR"' : '') + (extra || '') +
    ' aria-label="' + esc(field) + ' for KPI ' + (i + 1) + '"' +
    ' oninput="MGI.simSet(' + i + ', \'' + field + '\', this.value)">';
}

function simTierHtml(r) {
  var score = simScore(r);
  return score === null ? '<span class="text-text-muted">-</span>' : tierChip(score);
}

function simPointsHtml(r) {
  var p = simPoints(r);
  return '<span class="text-code-num font-bold ' + (p === null ? 'text-text-muted' : 'text-text-primary') + '">' + (p === null ? '-' : num(p, 2)) + '</span>' +
    '<span class="block text-[11px] text-text-muted">of ' + esc(num(simWeight(r), 2)) + '</span>';
}

function simTableHtml(st) {
  var locked = !st.experiment;
  var lockIcon = locked ? '<span class="material-symbols-outlined text-[14px] text-text-muted" aria-hidden="true">lock</span>' : '';
  var head = function (text, cls) {
    return '<th class="' + (cls || '') + '"><span class="inline-flex items-center gap-1">' + text + lockIcon + '</span></th>';
  };
  var rows = st.rows.map(function (r, i) {
    var binary = r.label === 'Binary';
    return '<tr>' +
      '<td class="text-text-muted text-code-num">K' + (i + 1) + '</td>' +
      '<td>' + (locked
        ? '<span class="text-body-sm font-semibold text-text-primary">' + esc(r.name || 'KPI ' + (i + 1)) + '</span>'
        : '<input type="text" class="field !py-1.5 w-full" value="' + esc(r.name) + '" aria-label="Name of KPI ' + (i + 1) + '" oninput="MGI.simSet(' + i + ', \'name\', this.value)">') + '</td>' +
      '<td><select class="field !py-1.5 w-full' + (locked ? ' bg-surface-page' : '') + '"' + (locked ? ' disabled title="Set by Admin / HR"' : '') +
          ' aria-label="Target direction for KPI ' + (i + 1) + '" onchange="MGI.simSet(' + i + ', \'label\', this.value)">' +
          ['Increase', 'Decrease', 'Binary'].map(function (l) {
            return '<option value="' + l + '"' + (r.label === l ? ' selected' : '') + '>' + esc(labelMeta(l).short) + '</option>';
          }).join('') + '</select></td>' +
      '<td>' + simCellInput(i, 'target', r.target, locked) + '</td>' +
      '<td>' + (binary ? '<span class="block text-center text-text-muted" title="Must match target KPIs do not use a tier step">-</span>' : simCellInput(i, 'step', r.step, locked)) + '</td>' +
      '<td>' + simCellInput(i, 'weight', r.weight, locked) + '</td>' +
      '<td class="text-center"><input type="checkbox" class="w-4 h-4 rounded border-border-medium text-primary-container"' + (r.strict ? ' checked' : '') +
          (locked || binary ? ' disabled' : '') + ' aria-label="Strict target for KPI ' + (i + 1) + '" onchange="MGI.simSet(' + i + ', \'strict\', this.checked)"></td>' +
      '<td class="bg-brand-50/40">' + (r.offCycle
        ? '<span class="pill pill-neutral !text-[11px]" title="A quarterly KPI outside its quarter month scores tier 1.0 once you submit the role"><span class="material-symbols-outlined text-[14px]">lock</span> Off-cycle</span>'
        : simCellInput(i, 'real', r.real, false, ' placeholder="Enter value"')) + '</td>' +
      '<td class="text-center" id="gc-tier-' + i + '">' + simTierHtml(r) + '</td>' +
      '<td class="text-center leading-tight" id="gc-pts-' + i + '">' + simPointsHtml(r) + '</td>' +
      (locked ? '' : '<td class="text-center">' + (st.rows.length > 1
        ? '<button type="button" class="p-1 rounded-md text-text-muted hover:text-status-danger hover:bg-red-50" aria-label="Remove KPI ' + (i + 1) + '" onclick="MGI.simRemove(' + i + ')"><span class="material-symbols-outlined text-[18px]">delete</span></button>'
        : '') + '</td>') +
    '</tr>';
  }).join('');
  return '<p class="flex items-center gap-1.5 text-label-xs text-text-muted mb-2">' +
      (locked
        ? '<span class="material-symbols-outlined text-[16px]">lock</span>Columns with a lock are set by Admin / HR. Type your realization, or press Experiment to try other values.'
        : '<span class="material-symbols-outlined text-[16px]">science</span>Every column is open. Press Lock Admin values to keep only the realization editable.') +
    '</p>' +
    '<div class="table-scroll rounded-xl border border-border-light">' +
      '<table class="data-table sim-table w-full min-w-[1000px]">' +
        '<thead><tr>' +
          '<th class="w-12">No</th>' +
          '<th class="min-w-[200px]">KPI</th>' +
          head('Target direction', 'w-52') +
          head('Target', 'w-28') +
          head('Tier step', 'w-24') +
          head('Weight (%)', 'w-24') +
          head('Strict', 'w-20 text-center') +
          '<th class="w-40 bg-brand-50/40"><span class="inline-flex items-center gap-1 text-primary-container"><span class="material-symbols-outlined text-[16px]">edit</span>Realization</span></th>' +
          '<th class="w-16 text-center">Tier</th>' +
          '<th class="w-20 text-center">Points</th>' +
          (locked ? '' : '<th class="w-12"><span class="sr-only">Remove</span></th>') +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</div>';
}

function simResultHtml(st) {
  var t = simTotals(st.rows);
  var b = band(t.index);
  var w = t.weight > 0 ? t.weight : 100;
  var segs = st.rows.map(function (r, i) {
    var p = simPoints(r);
    if (!p) return '';
    var width = Math.round(p / w * 100 * 100) / 100;
    var score = simScore(r);
    return '<div class="h-full flex items-center justify-center overflow-hidden whitespace-nowrap text-[12px] font-bold border-r border-white/70 ' + tierClass(score) + '"' +
      ' style="width:' + width + '%" title="' + esc('K' + (i + 1) + ' ' + (r.name || '') + ': ' + num(simWeight(r), 2) + ' x ' + score.toFixed(1) + ' = ' + num(p, 2) + ' points') + '">' +
      (width >= 9 ? 'K' + (i + 1) + ' ' + num(p, 2) : width >= 4 ? 'K' + (i + 1) : '') + '</div>';
  }).join('');
  var lost = Math.max(0, Math.round((100 - t.index) * 100) / 100);
  var lostSeg = lost > 0
    ? '<div class="h-full flex items-center justify-center overflow-hidden whitespace-nowrap text-[12px] font-semibold text-text-muted sim-lost" style="width:' + lost + '%" title="' + esc(num(lost, 2) + ' points not earned') + '">' +
        (lost >= 12 ? num(lost, 2) + ' not earned' : lost >= 5 ? num(lost, 2) : '') + '</div>'
    : '';
  var marker = Math.max(0, Math.min(100, t.index));
  return '<div class="rounded-xl border border-border-light bg-surface-page p-space-lg flex flex-col gap-space-md">' +
    '<div class="flex flex-wrap items-end justify-between gap-space-md">' +
      '<div>' +
        '<span class="text-label-xs uppercase tracking-wider text-text-muted">Role index</span>' +
        '<p class="flex items-baseline gap-2"><span class="text-[40px] leading-none font-bold tabular-nums text-status-' + b.key + '-text" title="' + esc(b.label) + '">' + num(t.index) + '</span>' +
          '<span class="text-body-md text-text-muted">of 100</span></p>' +
      '</div>' +
      '<p class="text-body-sm text-text-secondary max-w-md">Each block is the points one KPI adds: Weight (%) x Tier score. The blocks add up to the role index, and the grey part is what is not earned yet.</p>' +
    '</div>' +
    '<div class="flex h-10 w-full rounded-lg overflow-hidden ring-1 ring-black/5 bg-white" role="img" aria-label="' + esc('Role index ' + num(t.index) + ' of 100') + '">' + segs + lostSeg + '</div>' +
    '<div>' +
      '<div class="relative h-4" aria-hidden="true"><span class="material-symbols-outlined absolute -top-1.5 text-[22px] text-text-primary" style="left:' + marker + '%;transform:translateX(-50%)">arrow_drop_down</span></div>' +
      bandScaleHtml(bandValues()) +
      '<p class="mt-1 text-label-xs text-text-muted">The index color follows these bands, set by Admin / HR.</p>' +
    '</div>' +
    (t.empty
      ? '<p class="flex items-center gap-1.5 text-body-sm text-text-secondary"><span class="material-symbols-outlined text-[18px] text-status-warning">info</span>' +
          plural(t.empty, 'KPI') + ' without a value add 0 points, the same as an empty KPI after you submit.</p>'
      : '') +
    (Math.abs(t.weight - 100) > 0.01
      ? '<p class="flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-body-sm text-amber-900"><span class="material-symbols-outlined text-[18px]">balance</span>' +
          'Weights add up to ' + esc(num(t.weight, 2)) + '%. In the app every role adds up to exactly 100%, so the index here is scaled to 100.</p>'
      : '') +
  '</div>';
}

function renderSimResult() {
  var host = $('gc-result');
  if (host) host.innerHTML = simResultHtml(simState());
}

function renderGuideCalc() {
  var st = simState();
  if ($('gc-tools')) $('gc-tools').innerHTML = simToolsHtml(st);
  if ($('gc-banner')) {
    $('gc-banner').innerHTML = st.experiment
      ? '<div class="mb-space-md flex items-start gap-space-sm rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-body-sm text-amber-900">' +
          '<span class="material-symbols-outlined text-[20px] shrink-0">science</span>' +
          '<span><strong>Simulation only.</strong> Changing the target, tier step, or weight here does not change your real KPIs. Only Admin / HR can do that, and nothing here is saved.</span></div>'
      : '';
  }
  if ($('gc-table')) $('gc-table').innerHTML = simTableHtml(st);
  renderSimResult();
}

function simSet(i, field, value) {
  var st = simState();
  var r = st.rows[i];
  if (!r) return;
  r[field] = field === 'strict' ? !!value : value;
  if (field === 'label' || field === 'strict') {
    renderGuideCalc();
    return;
  }
  if ($('gc-tier-' + i)) $('gc-tier-' + i).innerHTML = simTierHtml(r);
  if ($('gc-pts-' + i)) $('gc-pts-' + i).innerHTML = simPointsHtml(r);
  renderSimResult();
}

function simSource(key) {
  var st = simState();
  var role = simRoles().filter(function (r) { return r.key === key; })[0];
  st.source = role ? role.key : '';
  st.experiment = false;
  st.rows = role ? simRowsFromRole(role) : simCopy(SIM_EXAMPLE);
  renderGuideCalc();
}

function simReset() {
  simSource(simState().source);
}

function simExperiment() {
  var st = simState();
  st.experiment = !st.experiment;
  renderGuideCalc();
}

function simAdd() {
  var st = simState();
  if (st.rows.length >= ((S.user && S.user.maxKpi) || 10)) return;
  st.rows.push({ name: 'New KPI', label: 'Increase', target: '100', step: '10', weight: '0', strict: false, real: '', unit: '' });
  renderGuideCalc();
}

function simRemove(i) {
  var st = simState();
  if (st.rows.length <= 1) return;
  st.rows.splice(i, 1);
  renderGuideCalc();
}

function cutoffCountdown(iso, now) {
  var end = iso ? new Date(iso).getTime() : NaN;
  if (isNaN(end)) return null;
  var hours = (end - now) / 3600000;
  if (hours <= 0) return null;
  if (hours < 24) {
    var h = Math.ceil(hours);
    return { tone: 'danger', icon: 'alarm', label: 'Closes in ' + h + (h === 1 ? ' hour' : ' hours') };
  }
  var days = Math.ceil(hours / 24);
  if (days <= 3) return { tone: 'warning', icon: 'hourglass_bottom', label: 'Closes in ' + days + (days === 1 ? ' day' : ' days') };
  return { tone: 'neutral', icon: 'event_available', label: days + ' days left' };
}

function roleStepsHtml(ready, declared, open) {
  var filled = ready.required - ready.missing.length;
  var step = function (done, title, detail) {
    var icon = !open ? 'lock' : done ? 'check_circle' : 'radio_button_unchecked';
    return '<span class="inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ' +
        (open && done ? 'border-emerald-200 bg-emerald-50' : 'border-border-light bg-white') + '">' +
      '<span class="material-symbols-outlined text-[18px] ' + (open && done ? 'text-status-success' : 'text-text-muted') + '">' + icon + '</span>' +
      '<span class="flex flex-col leading-tight">' +
        '<span class="text-label-sm font-semibold ' + (open && done ? 'text-status-success-text' : 'text-text-primary') + '">' + title + '</span>' +
        '<span class="text-[11px] text-text-muted">' + detail + '</span>' +
      '</span></span>';
  };
  var arrow = '<span class="material-symbols-outlined text-[18px] text-text-muted hidden sm:inline">chevron_right</span>';

  return step(!ready.missing.length, 'Realization',
           ready.required ? filled + ' of ' + ready.required + ' monthly KPIs' : 'No monthly KPI due') + arrow +
         step(ready.hasEvidence || ready.evidenceOptional, 'Evidence',
           ready.hasEvidence ? 'File attached' : ready.evidenceOptional ? 'Optional in FY' + S.dashboard.year : 'Attach 1 file') + arrow +
         step(declared, 'Declaration', declared ? 'Confirmed' : 'Tick the declaration');
}

function onDeclareChange(key) {
  renderRoleSubmit(key);
}

function navGroup(title, links) {
  var wrap = document.createElement('div');
  var head = document.createElement('div');
  head.className = 'nav-group-title px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500';
  head.textContent = title;
  wrap.appendChild(head);

  var list = document.createElement('div');
  list.className = 'flex flex-col gap-1';
  links.forEach(function (l) {
    var a = document.createElement('button');
    a.type = 'button';
    a.className = 'nav-link';
    a.dataset.view = l.id;
    a.title = l.label;
    a.innerHTML = '<span class="material-symbols-outlined text-[20px]">' + l.icon + '</span>' +
                  '<span class="nav-label">' + esc(l.label) + '</span>';
    a.dataset.phone = PHONE_VIEWS[l.id] ? 'yes' : 'no';
    a.onclick = function () { go(l.id); };
    list.appendChild(a);
  });
  wrap.dataset.phone = links.some(function (l) { return PHONE_VIEWS[l.id]; }) ? 'yes' : 'no';
  wrap.appendChild(list);
  return wrap;
}

function dayGreeting(date) {
  var h = (date || new Date()).getHours();
  if (h >= 4 && h < 12) return 'Good morning';
  if (h >= 12 && h < 18) return 'Good afternoon';
  return 'Good evening';
}

function displayName(full) {
  return String(full || '').trim().split(/\s+/).filter(Boolean).join(' ');
}

function heroNameHtml(full) {
  var name = displayName(full);
  var cut = name.lastIndexOf(' ');
  return esc(name.slice(0, cut + 1)) +
    '<span class="whitespace-nowrap">' + esc(name.slice(cut + 1)) +
      '<span class="material-symbols-outlined hero-heart" title="Thank you for your work" aria-hidden="true">favorite</span></span>';
}

function initials(name) {
  var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '??';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function skipToContent() {
  var main = $('app-main');
  if (main) main.focus();
}

function viewFromHash() {
  var m = /^#\/([a-z-]+)$/.exec((window.location && window.location.hash) || '');
  var view = m ? m[1] : '';
  return view && VIEW_TITLES[view] && $('view-' + view) ? view : '';
}

function syncHash(view, replace) {
  var want = '#/' + view;
  if (!window.location || window.location.hash === want) return;
  if ((replace || !viewFromHash()) && window.history && window.history.replaceState) window.history.replaceState(null, '', want);
  else window.location.hash = want;
}

function onHashChange() {
  if (!S.user) return;
  var view = viewFromHash();
  if (view && view !== S.view) go(view);
  else if (!view && S.view) syncHash(S.view, true);
}

function go(view) {
  if ((S.view === 'mapping' && isBasketDirty()) || (S.view === 'settings' && isCategoryDirty()) || (S.view === 'my-kpis' && myKpisDirty())) {
    if (S.view) syncHash(S.view, true);
    guardUnsaved(function () { go(view); });
    return;
  }

  S.view = view;
  var blocked = isPhone() && !PHONE_VIEWS[view];
  closeHelp(true);
  syncHelpFab();
  syncHash(view);
  ['dashboard', 'my-kpis', 'guide', 'master-kpis', 'mapping', 'summary', 'evaluation', 'settings'].forEach(function (v) {
    var el = $('view-' + v);
    if (el) el.classList.toggle('hidden', blocked || v !== view);
  });
  renderDesktopOnly(blocked ? view : '');
  renderPhoneBar();
  document.querySelectorAll('#sidebar-nav .nav-link').forEach(function (a) {
    a.classList.toggle('is-active', a.dataset.view === view);
    if (a.dataset.view === view) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  $('topbar-crumb').textContent = VIEW_TITLES[view] || '';
  toggleSidebar(false);
  window.scrollTo(0, 0);

  if (blocked) return;
  if (view === 'dashboard') initDashboard();
  if (view === 'my-kpis') initMyKpis();
  if (view === 'master-kpis') initMasterKpis();
  if (view === 'mapping') initMapping();
  if (view === 'summary') initSummary();
  if (view === 'evaluation') initEvaluation();
  if (view === 'settings') initSettings();
  if (view === 'guide') initGuide();
}

function isPhone() {
  return !!(window.matchMedia && window.matchMedia(PHONE_QUERY).matches);
}

function syncPhoneMode() {
  var phone = isPhone();
  var changed = S.phone !== phone;
  S.phone = phone;
  if (document.body) document.body.classList.toggle('is-phone', phone);
  if (changed && !phone) toggleSettingsPicker(false);
  if (changed && S.view === 'settings' && S.settingsTab === 'fiscal' && S.fiscal) renderFiscalPanel();
  if (changed && S.user && S.view && !PHONE_VIEWS[S.view]) go(S.view);
  else renderPhoneBar();
}

function watchPhoneMode() {
  var mq = window.matchMedia ? window.matchMedia(PHONE_QUERY) : null;
  if (mq && mq.addEventListener) mq.addEventListener('change', syncPhoneMode);
  else if (mq && mq.addListener) mq.addListener(syncPhoneMode);
  syncPhoneMode();
}

function renderDesktopOnly(view) {
  var host = $('view-desktop-only');
  if (!host) return;
  host.classList.toggle('hidden', !view);
  var body = $('desktop-only-body');
  if (!view || !body) return;
  body.innerHTML = emptyState('chart',
    '<strong>' + esc(VIEW_TITLES[view] || 'This page') + '</strong> is made for a larger screen. Open it on a computer or tablet. ' +
    'On your phone you can fill in My KPIs, read the Guide' + (S.user && S.user.isAdmin ?', and manage System Settings.' : '.'),
    { fn: 'goMyKpis', icon: 'fact_check', label: 'Go to My KPIs' });
}

function goMyKpis() {
  go('my-kpis');
}

function toggleSidebar(force) {
  var desktop = window.matchMedia && window.matchMedia('(min-width: 1024px)').matches;
  if (force === undefined && desktop) {
    var collapsed = !document.body.classList.contains('sidebar-collapsed');
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    syncSidebarToggle(collapsed);
    try { localStorage.setItem('mgi.sidebarCollapsed', collapsed ? '1' : '0'); } catch (e) {}
    return;
  }
  var open = (force === undefined) ? !$('sidebar').classList.contains('is-open') : force;
  $('sidebar').classList.toggle('is-open', open);
  $('sidebar-scrim').classList.toggle('is-open', open);
}

function restoreSidebar() {
  var collapsed = false;
  try { collapsed = localStorage.getItem('mgi.sidebarCollapsed') === '1'; } catch (e) {}
  document.body.classList.toggle('sidebar-collapsed', collapsed);
  syncSidebarToggle(collapsed);
}

function syncSidebarToggle(collapsed) {
  var btn = $('sidebar-toggle');
  if (!btn) return;
  var label = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
  btn.title = label;
  btn.setAttribute('aria-label', label);
  btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
}
