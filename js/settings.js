'use strict';

var SETTINGS_LOADERS = {
  periods:     loadPeriodSettings,
  fiscal:      loadFiscalYear,
  categories:  loadCategories,
  bands:       loadRatingBands,
  performance: loadPerformanceSettings,
  health:      loadKpiHealthSettings,
  access:      loadReportAccess,
  theme:       loadYearThemes,
  admins:      loadAdminAccess
};

function initSettings() {
  S.settingsLoaded = {};
  setSettingsTab(S.settingsTab);
}

function loadSettingsTab(tab) {
  if (S.view !== 'settings' || S.settingsLoaded[tab] || !SETTINGS_LOADERS[tab]) return;
  if (tab === 'admins' && !(S.user && S.user.isOwner)) return;
  S.settingsLoaded[tab] = true;
  SETTINGS_LOADERS[tab]();
}

function loadAdminAccess() {
  if (!$('admins-control')) return;
  if (!S.adminAccess) $('admins-control').innerHTML = '<div class="skeleton h-56 w-full"></div>';

  api('getAdminAccess')
    .then(function (data) {
      S.adminAccess = data;
      renderAdminAccess();
    })
    .catch(function (err) {
      $('admins-control').innerHTML = loadErrorHtml(err.message, 'loadAdminAccess');
      toast(err.message, 'error');
    });
}

function adminPerson(u, side) {
  var sub = [u.Position, u.Department].filter(Boolean).join(' / ');
  return '<div class="flex flex-col sm:flex-row sm:items-center gap-space-sm px-space-md py-3">' +
    '<div class="flex items-center gap-space-sm min-w-0 flex-1">' +
      '<span class="emp-avatar">' + esc(u.Initials || initials(u.Full_Name)) + '</span>' +
      '<div class="flex flex-col min-w-0">' +
        '<span class="text-body-md font-semibold text-text-primary truncate">' + esc(u.Full_Name) + '</span>' +
        '<span class="text-label-xs text-text-muted truncate">' + esc([u.NIK, u.Email].filter(Boolean).join(' • ')) + '</span>' +
        (sub ? '<span class="text-label-xs text-text-muted truncate">' + esc(sub) + '</span>' : '') +
      '</div>' +
    '</div>' +
    '<div class="flex items-center gap-space-xs flex-wrap sm:justify-end shrink-0">' + side + '</div>' +
  '</div>';
}

function renderAdminAccess() {
  var d = S.adminAccess;
  if (!d || !$('admins-control')) return;

  var owner = adminPerson(d.owner,
    '<span class="pill pill-brand !text-[11px]"><span class="material-symbols-outlined text-[14px]">workspace_premium</span> Owner</span>' +
    '<span class="pill pill-neutral !text-[11px]" title="The owner signs in with a password, on the account whose email runs the app">Password sign-in</span>');

  var admins = d.admins.length
    ? d.admins.map(function (u) {
        return adminPerson(u,
          (u.Is_Active ? '' : '<span class="pill pill-neutral !text-[11px]">Inactive</span>') +
          accountPill(u.account) +
          '<button type="button" class="btn btn-secondary !py-1 !px-2.5 !text-label-sm" onclick="MGI.openAdminChange(\'' + esc(u.NIK) + '\', false)">' +
            '<span class="material-symbols-outlined text-[16px]">person_remove</span> Remove admin</button>');
      }).join('')
    : '<p class="px-space-md py-space-lg text-center text-body-sm text-text-muted">No other admins yet. Add one from the list.</p>';

  $('admins-control').innerHTML =
    '<div class="flex flex-col gap-space-lg">' +
      '<div>' +
        '<h2 class="text-title-lg text-text-primary">Admin Access</h2>' +
        '<p class="text-body-sm text-text-muted">Admins manage Master KPIs, KPI mapping, reports, and settings. ' +
          'Only you, as the system owner, can change this list.</p>' +
      '</div>' +
      '<div class="grid grid-cols-1 xl:grid-cols-2 gap-space-lg items-start">' +
        '<section class="rounded-xl border border-border-light overflow-hidden">' +
          '<div class="px-space-md py-space-sm bg-surface-page border-b border-border-light flex items-center justify-between gap-space-sm">' +
            '<h3 class="text-title-md text-text-primary">Current admins</h3>' +
            '<span class="pill pill-neutral !text-[11px]">' + (d.admins.length + 1) + ' with access</span>' +
          '</div>' +
          '<div class="divide-y divide-slate-100">' + owner + admins + '</div>' +
        '</section>' +
        '<section class="rounded-xl border border-border-light overflow-hidden">' +
          '<div class="px-space-md py-space-sm bg-surface-page border-b border-border-light flex flex-col gap-space-sm">' +
            '<div class="flex items-center justify-between gap-space-sm">' +
              '<h3 class="text-title-md text-text-primary">Add admin</h3>' +
              '<span class="pill pill-neutral !text-[11px]">' + d.candidates.length + ' eligible</span>' +
            '</div>' +
            '<div class="relative">' +
              '<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px] pointer-events-none">search</span>' +
              '<input type="search" class="field !pl-10" placeholder="Search name, NIK, or email" value="' + esc(S.adminQuery) +
                '" oninput="MGI.onAdminSearch(this.value)">' +
            '</div>' +
          '</div>' +
          '<div id="admin-candidates" class="divide-y divide-slate-100 max-h-[420px] overflow-y-auto"></div>' +
        '</section>' +
      '</div>' +
    '</div>';

  renderAdminCandidates();
}

function renderAdminCandidates() {
  var host = $('admin-candidates');
  if (!host || !S.adminAccess) return;
  var all = S.adminAccess.candidates;
  var q = (S.adminQuery || '').trim().toLowerCase();
  var list = all.filter(function (u) {
    return !q || (u.Full_Name + ' ' + u.NIK + ' ' + u.Email).toLowerCase().indexOf(q) > -1;
  });

  host.innerHTML = !all.length
    ? '<p class="px-space-md py-space-lg text-center text-body-sm text-text-muted">Every active employee with an email already has admin access.</p>'
    : !list.length
      ? '<p class="px-space-md py-space-lg text-center text-body-sm text-text-muted">No employees match your search.</p>'
      : list.slice(0, 50).map(function (u) {
          return adminPerson(u,
            '<button type="button" class="btn btn-primary !py-1 !px-2.5 !text-label-sm" onclick="MGI.openAdminChange(\'' + esc(u.NIK) + '\', true)">' +
              '<span class="material-symbols-outlined text-[16px]">person_add</span> Make admin</button>');
        }).join('') +
        (list.length > 50
          ? '<p class="px-space-md py-2 text-label-xs text-text-muted text-center">Showing 50 of ' + list.length + '. Refine the search to see more.</p>'
          : '');
}

function onAdminSearch(value) {
  S.adminQuery = value;
  renderAdminCandidates();
}

function openAdminChange(nik, makeAdmin) {
  var d = S.adminAccess;
  if (!d) return;
  var grant = makeAdmin === true;
  var u = (grant ? d.candidates : d.admins).filter(function (x) { return x.NIK === nik; })[0];
  if (!u) return;
  S.adminChange = { nik: nik, grant: grant };

  $('modal-host').innerHTML =
    '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closeAdminChange()">' +
      '<div class="modal-panel !max-w-md">' +
        '<div class="px-6 pt-6 pb-5 flex items-start gap-4">' +
          '<span class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 ' +
            (grant ? 'bg-brand-50 text-primary-container' : 'bg-status-warning-subtle text-status-warning') + '">' +
            '<span class="material-symbols-outlined text-[22px]">' + (grant ? 'admin_panel_settings' : 'person_remove') + '</span></span>' +
          '<div class="min-w-0">' +
            '<h2 class="text-title-lg text-text-primary">' +
              (grant ? 'Make ' + esc(u.Full_Name) + ' an admin?' : 'Remove ' + esc(u.Full_Name) + ' as admin?') + '</h2>' +
            '<p class="text-body-sm text-text-secondary mt-1">' +
              (grant
                ? 'They get full access to Master KPIs, KPI mapping, reports, and settings.' +
                  (u.account === 'none' ? ' They have no login account yet, so a one-time login code will be emailed to ' + esc(u.Email) + '.' : '')
                : 'They lose the admin pages on their next action but keep their own My KPIs access.') +
            '</p>' +
          '</div>' +
        '</div>' +
        '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex items-center justify-end gap-space-sm">' +
          '<button class="btn btn-secondary" onclick="MGI.closeAdminChange()">Cancel</button>' +
          '<button id="admin-confirm" class="btn btn-primary" onclick="MGI.confirmAdminChange()">' +
            '<span class="material-symbols-outlined text-[18px]">' + (grant ? 'person_add' : 'person_remove') + '</span> ' +
            (grant ? 'Make Admin' : 'Remove Admin') + '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function closeAdminChange() {
  S.adminChange = null;
  $('modal-host').innerHTML = '';
}

function confirmAdminChange() {
  var change = S.adminChange;
  if (!change) return;
  var restore = busy($('admin-confirm'), 'Saving');

  api('setAdminRole', change.nik, change.grant)
    .then(function (res) {
      restore();
      closeAdminChange();
      toast(res.message, 'success');
      loadAdminAccess();
    })
    .catch(function (err) {
      restore();
      toast(err.message, 'error');
    });
}

function setSettingsTab(tab) {
  var adminsPanel = $('settings-admins-panel');
  S.settingsTab = tab === 'categories' ? 'categories' : tab === 'bands' ? 'bands'
                : tab === 'performance' ? 'performance' : tab === 'health' ? 'health' : tab === 'access' ? 'access' : tab === 'theme' ? 'theme'
                : tab === 'fiscal' ? 'fiscal'
                : tab === 'admins' && adminsPanel ? 'admins' : 'periods';
  $('settings-periods-panel').classList.toggle('hidden', S.settingsTab !== 'periods');
  $('settings-fiscal-panel').classList.toggle('hidden', S.settingsTab !== 'fiscal');
  $('settings-access-panel').classList.toggle('hidden', S.settingsTab !== 'access');
  $('settings-theme-panel').classList.toggle('hidden', S.settingsTab !== 'theme');
  $('settings-categories-panel').classList.toggle('hidden', S.settingsTab !== 'categories');
  $('settings-bands-panel').classList.toggle('hidden', S.settingsTab !== 'bands');
  $('settings-performance-panel').classList.toggle('hidden', S.settingsTab !== 'performance');
  $('settings-health-panel').classList.toggle('hidden', S.settingsTab !== 'health');
  if (adminsPanel) adminsPanel.classList.toggle('hidden', S.settingsTab !== 'admins');
  var nav = $('settings-tabs');
  document.querySelectorAll('#settings-tabs [data-settings-tab]').forEach(function (b) {
    var on = b.dataset.settingsTab === S.settingsTab;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
    if (on && nav && nav.scrollWidth > nav.clientWidth + 1) nav.scrollLeft = Math.max(0, b.offsetLeft - 16);
  });
  loadSettingsTab(S.settingsTab);
}

function bandDefaults() {
  return (S.bandData && S.bandData.defaults) || { good: 75, excellent: 90 };
}

function bandCheck(good, excellent) {
  if (!isNum(good) || !isNum(excellent)) return 'Enter both thresholds as numbers.';
  if (good <= 0) return 'The Good threshold must be higher than 0.';
  if (excellent > 100) return 'The Excellent threshold cannot be higher than 100.';
  if (good >= excellent) return 'The Good threshold must be lower than the Excellent threshold, otherwise the ranges overlap.';
  return '';
}

function loadRatingBands() {
  $('bands-control').innerHTML = '<div class="skeleton h-56 w-full"></div>';

  api('getRatingBands')
    .then(function (data) {
      S.bandData = data;
      S.bandDraft = { good: data.good, excellent: data.excellent };
      syncBands(data);
      renderBandPanel();
    })
    .catch(function (err) {
      $('bands-control').innerHTML = loadErrorHtml(err.message, 'loadRatingBands');
      toast(err.message, 'error');
    });
}

function bandBadge(key, size) {
  var m = BAND_META[key];
  return '<span class="grade-badge band-' + key + (size ? ' grade-' + size : '') + '" title="' + m.label + '">' +
    '<span class="material-symbols-outlined ' + (size === 'md' ? 'text-[20px]' : 'text-[15px]') + '">' + m.icon + '</span></span>';
}

function bandSegments(d) {
  return [
    { key: 'danger',  min: 0,           max: d.good,      label: 'Below ' + bandNum(d.good) },
    { key: 'info',    min: d.good,      max: d.excellent, label: bandNum(d.good) + ' to ' + bandNum(d.excellent - 0.1) },
    { key: 'success', min: d.excellent, max: 100,         label: bandNum(d.excellent) + ' to 100' }
  ];
}

function bandScaleHtml(d) {
  var segs = bandSegments(d);
  var bar = segs.map(function (seg) {
    var m = BAND_META[seg.key];
    var width = Math.max(0, Math.round((seg.max - seg.min) * 100) / 100);
    return '<div class="h-full flex items-center justify-center overflow-hidden whitespace-nowrap font-bold text-white text-[12px]" style="width:' + width + '%;background:' + m.hex + '"' +
      ' title="' + m.label + ': ' + seg.label + '">' +
      (width >= Math.max(8, m.label.length * 1.4) ? m.label : width >= 4 ? '<span class="material-symbols-outlined text-[16px]">' + m.icon + '</span>' : '') + '</div>';
  }).join('');
  return '<div class="grade-scale w-full" aria-hidden="true">' +
    '<div class="flex h-9 w-full rounded-lg overflow-hidden ring-1 ring-black/5">' + bar + '</div>' +
    '<div class="relative h-4 mt-1">' + gradeScaleTicks(segs) + '</div>' +
  '</div>';
}

function bandLegendHtml(d) {
  return bandSegments(d).slice().reverse().map(function (seg) {
    return '<span class="inline-flex items-center gap-1.5 whitespace-nowrap">' + bandBadge(seg.key) +
      '<span class="font-semibold text-text-primary">' + esc(BAND_META[seg.key].label) + '</span>' +
      '<span class="text-text-secondary">' + esc(seg.label) + '</span></span>';
  }).join('');
}

function renderBandPanel() {
  var host = $('bands-control');
  if (!host) return;
  var d = S.bandDraft || bandValues();
  var def = bandDefaults();
  var saved = S.bandData || bandValues();
  var custom = saved.good !== def.good || saved.excellent !== def.excellent;
  var defaultsText = 'Excellent from ' + bandNum(def.excellent) + ', Good from ' + bandNum(def.good);
  var value = function (v) { return isNum(v) ? String(v) : ''; };
  var row = function (key, id, label, hint, v) {
    return '<div class="flex items-center gap-3 py-2.5">' + bandBadge(key, 'md') +
      '<div class="min-w-0 flex-1">' +
        '<label for="' + id + '" class="block text-body-md font-semibold text-text-primary">' + label + '</label>' +
        '<p class="text-label-xs text-text-muted">' + hint + '</p>' +
      '</div>' +
      '<input id="' + id + '" type="number" inputmode="decimal" step="0.1" min="0.1" max="100" class="field !w-28 shrink-0 text-right tabular-nums"' +
        ' value="' + value(v) + '" oninput="MGI.onBandInput()" onwheel="this.blur()">' +
    '</div>';
  };

  host.innerHTML =
    '<div class="flex flex-col gap-space-lg">' +
      '<div class="flex flex-col md:flex-row md:items-start justify-between gap-space-md">' +
        '<div class="min-w-0">' +
          '<h2 class="text-title-lg text-text-primary">Rating Bands</h2>' +
          '<p class="text-body-sm text-text-muted max-w-2xl">Set where each rating starts for the monthly KPI index. The three ranges always connect, so a score can never fall between two bands. ' +
            'Bands apply to every year. Performance Score grades are set in Performance Scoring.</p>' +
        '</div>' +
        '<div class="flex flex-wrap items-center gap-2 shrink-0">' +
          (custom
            ? '<span class="pill pill-info">Custom bands</span>'
            : '<span class="pill pill-neutral" title="' + defaultsText + '">Using defaults</span>') +
        '</div>' +
      '</div>' +
      '<div class="grid grid-cols-1 xl:grid-cols-2 gap-space-lg items-start">' +
        '<section class="rounded-xl border border-border-light overflow-hidden">' +
          '<div class="px-space-md py-space-sm bg-surface-page border-b border-border-light flex items-center justify-between gap-2">' +
            '<h3 class="text-title-md text-text-primary">Band thresholds</h3>' +
            '<span class="pill pill-neutral !text-[11px]">KPI index, 0 to 100</span>' +
          '</div>' +
          '<div class="px-space-md divide-y divide-slate-100">' +
            row('success', 'band-excellent', 'Excellent starts at', 'Top band, up to 100', d.excellent) +
            row('info', 'band-good', 'Good starts at', 'Below Excellent', d.good) +
            '<div class="flex items-center gap-3 py-2.5">' + bandBadge('danger', 'md') +
              '<div class="min-w-0 flex-1"><p class="text-body-md font-semibold text-text-primary">Needs Attention</p>' +
              '<p class="text-label-xs text-text-muted">Every score below Good</p></div>' +
              '<span id="band-na" class="text-body-sm font-semibold text-text-secondary w-28 text-right">-</span>' +
            '</div>' +
          '</div>' +
        '</section>' +
        '<section class="rounded-xl border border-border-light overflow-hidden">' +
          '<div class="px-space-md py-space-sm bg-surface-page border-b border-border-light">' +
            '<h3 class="text-title-md text-text-primary">Band scale</h3>' +
          '</div>' +
          '<div class="px-space-md py-space-md flex flex-col gap-2">' +
            '<div id="band-preview"></div>' +
            '<div id="band-legend" class="flex flex-wrap gap-x-4 gap-y-1.5 text-label-xs"></div>' +
          '</div>' +
        '</section>' +
      '</div>' +
      '<div id="band-samples" class="rounded-xl border border-border-light bg-surface-page px-space-md py-space-sm text-body-sm text-text-secondary"></div>' +
      '<p id="band-error" class="hidden text-label-sm text-status-danger-text"></p>' +
      '<div class="flex flex-wrap items-center gap-space-sm">' +
        '<button id="band-save" type="button" class="btn btn-primary" onclick="MGI.saveRatingBands()">' +
          '<span class="material-symbols-outlined text-[18px]">save</span> Save Bands</button>' +
        '<button type="button" class="btn btn-secondary" onclick="MGI.resetRatingBands()" title="' + defaultsText + '">' +
          '<span class="material-symbols-outlined text-[18px]">restart_alt</span> Defaults</button>' +
      '</div>' +
    '</div>';

  renderBandPreview();
}

function onBandInput() {
  S.bandDraft = {
    good: parseFloat($('band-good').value),
    excellent: parseFloat($('band-excellent').value)
  };
  renderBandPreview();
}

function renderBandPreview() {
  var d = S.bandDraft || bandValues();
  var saved = S.bandData || bandValues();
  var error = bandCheck(d.good, d.excellent);
  var dirty = d.good !== saved.good || d.excellent !== saved.excellent;

  $('band-error').textContent = error;
  $('band-error').classList.toggle('hidden', !error);
  $('band-save').disabled = !!error || !dirty;
  $('band-na').textContent = isNum(d.good) ? 'Below ' + bandNum(d.good) : '-';
  if (error) {
    $('band-preview').innerHTML = '';
    $('band-legend').innerHTML = '';
    $('band-samples').innerHTML = '<span class="text-text-muted">Fix the thresholds above to see the scale.</span>';
    return;
  }

  $('band-preview').innerHTML = bandScaleHtml(d);
  $('band-legend').innerHTML = bandLegendHtml(d);
  $('band-samples').innerHTML =
    '<div class="flex flex-wrap items-center gap-x-2 gap-y-1.5">' +
      '<span class="material-symbols-outlined text-[18px] text-text-muted">lightbulb</span>' +
      '<span>Sample scores</span>' +
      [100, 95, 90, 85, 80, 75, 70, 60].map(function (v) {
        var key = v >= d.excellent ? 'success' : v >= d.good ? 'info' : 'danger';
        return '<span class="pill pill-' + key + ' !text-[11px]">' + v + ' ' + BAND_META[key].label + '</span>';
      }).join('') +
    '</div>';
}

function resetRatingBands() {
  var def = bandDefaults();
  S.bandDraft = { good: def.good, excellent: def.excellent };
  renderBandPanel();
}

function saveRatingBands() {
  var d = S.bandDraft || bandValues();
  var error = bandCheck(d.good, d.excellent);
  if (error) {
    toast(error, 'error');
    return;
  }

  $('band-save').disabled = true;
  api('saveRatingBands', { good: d.good, excellent: d.excellent })
    .then(function (data) {
      S.bandData = data;
      S.bandDraft = { good: data.good, excellent: data.excellent };
      syncBands(data);
      renderBandPanel();
      toast(data.message, 'success');
    })
    .catch(function (err) {
      $('band-save').disabled = false;
      toast(err.message, 'error');
    });
}

function loadCategories() {
  S.catDraft = null;
  $('cat-notice').innerHTML = '';
  $('cat-grid').innerHTML = CATEGORY_META.map(function () {
    return '<div class="skeleton h-72 w-full"></div>';
  }).join('');
  renderCategorySaveBar();

  api('getCategories')
    .then(function (data) {
      S.categories = data;
      resetCategoryDraft();
      renderCategories();
    })
    .catch(function (err) {
      $('cat-grid').innerHTML =
        '<div class="lg:col-span-3 bg-surface-card rounded-xl p-space-lg text-center border border-dashed border-border-medium">' +
          '<p class="text-body-md text-status-danger-text">' + esc(err.message) + '</p>' +
        '</div>';
      toast(err.message, 'error');
    });
}

function reloadCategories() {
  guardUnsaved(loadCategories);
}

function resetCategoryDraft() {
  var saved = S.categories.categories || {};
  S.catDraft = {};
  CATEGORY_META.forEach(function (t) {
    S.catDraft[t.key] = (saved[t.key] || []).map(function (c) {
      return { value: c.value, active: c.active, used: c.used || 0, isNew: false };
    });
  });
}

function categoryChangeCount() {
  if (!S.catDraft || !S.categories || !S.categories.categories) return 0;
  var n = 0;
  CATEGORY_META.forEach(function (t) {
    var saved = {};
    (S.categories.categories[t.key] || []).forEach(function (c) { saved[c.value.toLowerCase()] = c; });
    var seen = {};
    (S.catDraft[t.key] || []).forEach(function (c) {
      var key = c.value.toLowerCase();
      seen[key] = true;
      if (!saved[key] || saved[key].active !== c.active) n++;
    });
    Object.keys(saved).forEach(function (key) { if (!seen[key]) n++; });
  });
  return n;
}

function isCategoryDirty() {
  return categoryChangeCount() > 0;
}

function renderCategories() {
  if (!S.catDraft) return;
  var pending = !!S.categories.setupPending;

  $('cat-notice').innerHTML =
    '<div class="flex items-start gap-space-sm rounded-xl p-space-md border ' + (pending ? 'pill-warning' : 'pill-info') + '">' +
      '<span class="material-symbols-outlined text-[22px]">' + (pending ? 'cloud_off' : 'info') + '</span>' +
      '<div class="text-body-sm leading-relaxed">' +
        (pending
          ? '<p class="font-semibold">The Categories sheet has not been created yet.</p>' +
            '<p>The list below combines the default options with values already used by Master KPIs. Click <strong>Save</strong> to create the sheet.</p>'
          : '') +
        '<p>Values used by Master KPIs cannot be deleted, only deactivated. Inactive values disappear from form dropdowns while existing KPI data stays intact.</p>' +
      '</div>' +
    '</div>';

  $('cat-grid').innerHTML = CATEGORY_META.map(categoryCard).join('');
  renderCategorySaveBar();
}

function categoryCard(t) {
  var lower = t.key.toLowerCase();
  return '<div class="bg-surface-card rounded-xl shadow-level-1 border border-border-light overflow-hidden">' +
    '<div class="p-space-md border-b border-border-light flex items-center gap-space-sm">' +
      '<span class="w-10 h-10 rounded-lg bg-slate-50 ring-1 ring-slate-200/70 text-slate-600 flex items-center justify-center shrink-0">' +
        '<span class="material-symbols-outlined text-[22px]">' + t.icon + '</span></span>' +
      '<div class="min-w-0 flex-1">' +
        '<h2 class="text-title-lg text-text-primary">' + esc(t.key) + '</h2>' +
        '<p class="text-label-xs text-text-muted">' + esc(t.hint) + '</p>' +
      '</div>' +
      '<span class="pill pill-neutral !text-[11px]" data-cat-count="' + t.key + '">' + categoryCountLabel(t.key) + '</span>' +
    '</div>' +
    '<div class="p-space-md border-b border-border-light bg-surface-page">' +
      '<div class="flex items-center gap-space-xs">' +
        '<input id="cat-new-' + lower + '" type="text" maxlength="80" class="field" placeholder="Add a new ' + esc(t.key) + '"' +
          ' oninput="MGI.onCategoryInput(\'' + t.key + '\')" onkeydown="MGI.onCategoryKey(event, \'' + t.key + '\')">' +
        '<button class="btn btn-secondary !px-3 shrink-0" onclick="MGI.addCategory(\'' + t.key + '\')">' +
          '<span class="material-symbols-outlined text-[18px]">add</span>Add</button>' +
      '</div>' +
      '<p id="cat-err-' + lower + '" class="text-label-xs text-status-danger-text mt-1.5 hidden"></p>' +
    '</div>' +
    '<div id="cat-list-' + lower + '" class="cat-list">' + categoryListHtml(t.key) + '</div>' +
  '</div>';
}

function categoryCountLabel(type) {
  var list = S.catDraft[type] || [];
  return list.filter(function (c) { return c.active; }).length + ' / ' + list.length + ' active';
}

function categoryListHtml(type) {
  var list = S.catDraft[type] || [];
  if (!list.length) {
    return '<p class="text-body-sm text-text-muted text-center py-space-lg">No values yet.</p>';
  }
  return list.map(function (c, i) {
    return '<div class="cat-row' + (c.active ? '' : ' is-inactive') + '">' +
      '<div class="min-w-0 flex-1">' +
        '<p class="cat-value text-label-md text-text-primary font-semibold break-words">' + esc(c.value) + '</p>' +
        '<div class="flex items-center gap-space-xs flex-wrap mt-0.5">' +
          (c.isNew ? '<span class="pill pill-warning !py-0 !px-2 !text-[11px]">New</span>' : '') +
          (c.used
            ? '<span class="pill pill-info !py-0 !px-2 !text-[11px]">Used by ' + plural(c.used, 'KPI') + '</span>'
            : '<span class="text-label-xs text-text-muted">Not used yet</span>') +
        '</div>' +
      '</div>' +
      '<label class="switch" title="' + (c.active ? 'Deactivate: hide from form dropdowns' : 'Reactivate') + '">' +
        '<input type="checkbox"' + (c.active ? ' checked' : '') +
          ' onchange="MGI.toggleCategory(\'' + type + '\', ' + i + ')">' +
        '<span class="switch-track"><span class="switch-thumb"></span></span>' +
        '<span class="switch-label">' + (c.active ? 'Active' : 'Inactive') + '</span>' +
      '</label>' +
      (c.used
        ? '<span class="cat-lock" title="Used by ' + c.used + ' Master KPIs, can only be deactivated">' +
            '<span class="material-symbols-outlined text-[18px]">lock</span></span>'
        : '<button class="btn-trash" title="Delete ' + esc(c.value) + '" onclick="MGI.removeCategory(\'' + type + '\', ' + i + ')">' +
            '<span class="material-symbols-outlined text-[20px]">delete</span></button>') +
    '</div>';
  }).join('');
}

function renderCategoryList(type) {
  var host = $('cat-list-' + type.toLowerCase());
  if (host) host.innerHTML = categoryListHtml(type);
  var badge = document.querySelector('[data-cat-count="' + type + '"]');
  if (badge) badge.textContent = categoryCountLabel(type);
  renderCategorySaveBar();
}

function cleanCategoryValue(v) {
  return String(v || '').replace(/\s+/g, ' ').trim();
}

function categoryError(type, value) {
  if (!value) return 'Enter a ' + type + ' name first.';
  if (value.length > 80) return 'Maximum 80 characters.';
  var dup = (S.catDraft[type] || []).filter(function (c) {
    return c.value.toLowerCase() === value.toLowerCase();
  })[0];
  if (!dup) return '';
  return type + " '" + dup.value + "' already exists" + (dup.active ? '.' : ' and is inactive. Reactivate it from the list.');
}

function showCategoryError(type, message) {
  var el = $('cat-err-' + type.toLowerCase());
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('hidden', !message);
}

function onCategoryInput(type) {
  var value = cleanCategoryValue($('cat-new-' + type.toLowerCase()).value);
  showCategoryError(type, value ? categoryError(type, value) : '');
}

function onCategoryKey(ev, type) {
  if (ev.key !== 'Enter') return;
  ev.preventDefault();
  addCategory(type);
}

function addCategory(type) {
  if (!S.catDraft) return;
  var input = $('cat-new-' + type.toLowerCase());
  var value = cleanCategoryValue(input.value);
  var err = categoryError(type, value);
  if (err) { showCategoryError(type, err); return; }

  var wasSaved = ((S.categories.categories || {})[type] || []).some(function (c) {
    return c.value.toLowerCase() === value.toLowerCase();
  });
  S.catDraft[type].push({ value: value, active: true, used: 0, isNew: !wasSaved });
  input.value = '';
  showCategoryError(type, '');
  renderCategoryList(type);
}

function toggleCategory(type, index) {
  var c = S.catDraft && S.catDraft[type] ? S.catDraft[type][index] : null;
  if (!c) return;
  c.active = !c.active;
  renderCategoryList(type);
}

function removeCategory(type, index) {
  var c = S.catDraft && S.catDraft[type] ? S.catDraft[type][index] : null;
  if (!c) return;
  if (c.used) {
    toast(type + " '" + c.value + "' is used by " + c.used + ' KPIs and can only be deactivated.', 'warning');
    return;
  }
  S.catDraft[type].splice(index, 1);
  renderCategoryList(type);
}

function renderCategorySaveBar() {
  var bar = $('cat-savebar');
  if (!bar) return;
  var n = categoryChangeCount();
  var pending = !!(S.catDraft && S.categories && S.categories.setupPending);
  var show = n > 0 || pending;

  bar.classList.toggle('hidden', !show);
  bar.innerHTML = !show ? '' :
    '<div class="cat-savebar-inner">' +
      '<span class="material-symbols-outlined text-status-warning">' + (n ? 'edit_note' : 'cloud_upload') + '</span>' +
      '<p class="text-body-sm text-text-secondary flex-1 min-w-0">' +
        '<strong class="text-text-primary">' + (n ? n + ' unsaved changes' : 'Initial list not saved yet') + '.</strong> ' +
        (n ? 'Inactive values are hidden from Master KPI forms.' : 'Save to create the Categories sheet.') +
      '</p>' +
      (n ? '<button class="btn btn-secondary" onclick="MGI.discardCategories()">Discard</button>' : '') +
      '<button id="cat-save" class="btn btn-primary" onclick="MGI.saveCategories()">' +
        '<span class="material-symbols-outlined text-[18px]">save</span>Save</button>' +
    '</div>';
}

function discardCategories() {
  if (!S.catDraft || !S.categories) return;
  resetCategoryDraft();
  renderCategories();
}

function saveCategories() {
  if (!S.catDraft) return;
  var payload = {};
  CATEGORY_META.forEach(function (t) {
    payload[t.key] = S.catDraft[t.key].map(function (c) { return { value: c.value, active: c.active }; });
  });

  var restore = busy($('cat-save'), 'Saving');
  api('saveCategories', payload)
    .then(function (data) {
      S.categories = data;
      resetCategoryDraft();
      renderCategories();
      toast(data.message, 'success');
    })
    .catch(function (err) {
      restore();
      toast(err.message, 'error');
    });
}
