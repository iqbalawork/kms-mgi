'use strict';

function healthTierText(tier, easy) {
  var t = Number(tier);
  if (easy) return t >= 1 ? '1.0' : t.toFixed(1) + ' or higher';
  return t <= 0.2 ? '0.2' : t.toFixed(1) + ' or lower';
}

function healthRuleText(t) {
  return 'Easy: ' + t.easyPct + '% or more of submissions at tier ' + healthTierText(t.easyTier, true) + '. ' +
    'Unrealistic: ' + t.hardPct + '% or more at tier ' + healthTierText(t.hardTier, false) + '. ' +
    'A flag needs at least ' + plural(t.minEntries, 'submission') + '.';
}

function healthConfig(year) {
  var d = S.healthSettings;
  if (!d) return null;
  if (d.configs[year]) return d.configs[year];
  var out = {};
  Object.keys(d.defaults).forEach(function (k) { out[k] = d.defaults[k]; });
  out.year = year;
  out.saved = false;
  out.updatedAt = '';
  return out;
}

function healthDraftFrom(c) {
  return { minEntries: c.minEntries, easyPct: c.easyPct, easyTier: c.easyTier, hardPct: c.hardPct, hardTier: c.hardTier };
}

function healthProblem(d) {
  var n = Number(d.minEntries);
  if (String(d.minEntries) === '' || !isFinite(n) || Math.floor(n) !== n || n < 1 || n > 1000) return 'Minimum submissions must be a whole number between 1 and 1000.';
  var pct = function (v) { var x = Number(v); return String(v) !== '' && isFinite(x) && x >= 1 && x <= 100; };
  if (!pct(d.hardPct)) return 'The Unrealistic share must be between 1% and 100%.';
  if (!pct(d.easyPct)) return 'The Easy share must be between 1% and 100%.';
  if ([1, 0.8].indexOf(Number(d.easyTier)) === -1) return 'The Easy tier must be 1.0 or 0.8.';
  if ([0.2, 0.4].indexOf(Number(d.hardTier)) === -1) return 'The Unrealistic tier must be 0.2 or 0.4.';
  return '';
}

function loadKpiHealthSettings() {
  if (!$('health-control')) return;
  if (!S.healthSettings) $('health-control').innerHTML = '<div class="skeleton h-72 w-full"></div>';

  api('getKpiHealthSettings')
    .then(function (data) {
      S.healthSettings = data;
      if (!S.healthYear) S.healthYear = data.activeYear;
      S.healthDraft = healthDraftFrom(healthConfig(S.healthYear));
      renderHealthPanel();
    })
    .catch(function (err) {
      $('health-control').innerHTML = loadErrorHtml(err.message, 'loadKpiHealthSettings');
      toast(err.message, 'error');
    });
}

function renderHealthPanel() {
  var host = $('health-control');
  if (!host || !S.healthSettings) return;
  var year = S.healthYear;
  var c = healthConfig(year);
  var d = S.healthDraft || healthDraftFrom(c);
  S.healthDraft = d;
  var years = S.healthSettings.years.slice();
  if (years.indexOf(year) === -1) years.push(year);
  years.sort(function (a, b) { return b - a; });

  var status = c.saved
    ? '<span class="pill pill-info">Saved' + (c.updatedAt ? ' ' + esc(fmtDate(c.updatedAt)) : '') + '</span>'
    : '<span class="pill pill-neutral" title="Nothing saved for this year yet">Using defaults</span>';

  var number = function (id, value, step, min, max, suffix) {
    return '<span class="relative inline-block w-28 shrink-0">' +
      '<input id="' + id + '" type="number" inputmode="decimal" step="' + step + '" min="' + min + '" max="' + max + '"' +
        ' class="field !py-1.5 text-right tabular-nums' + (suffix ? ' !pr-7' : '') + '" value="' + esc(value) + '" oninput="MGI.onHealthInput()" onwheel="this.blur()">' +
      (suffix ? '<span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-label-sm text-text-muted pointer-events-none">' + suffix + '</span>' : '') +
    '</span>';
  };
  var tierSelect = function (id, value, options, easy) {
    return '<select id="' + id + '" class="field !w-36 !py-1.5 shrink-0" onchange="MGI.onHealthInput()">' + options.map(function (t) {
      return '<option value="' + t + '"' + (Number(value) === t ? ' selected' : '') + '>' + healthTierText(t, easy) + '</option>';
    }).join('') + '</select>';
  };
  var row = function (id, label, control) {
    return '<div class="flex items-center justify-between gap-3"><label for="' + id + '">' + label + '</label>' + control + '</div>';
  };
  var card = function (key, body) {
    var f = HEALTH_FLAGS[key];
    return '<div class="rounded-xl border border-border-light p-space-md flex items-start gap-space-sm">' +
      '<span class="material-symbols-outlined text-[22px] ' + f.text + '">' + f.icon + '</span>' +
      '<div class="min-w-0 flex-1"><p class="text-body-md font-semibold text-text-primary">' + esc(f.label) + '</p>' +
      '<div class="mt-2 flex flex-col gap-2 text-body-sm text-text-secondary">' + body + '</div></div>' +
    '</div>';
  };

  host.innerHTML =
    '<div class="flex flex-col gap-space-lg">' +
      '<div class="flex flex-col md:flex-row md:items-start justify-between gap-space-md">' +
        '<div class="min-w-0">' +
          '<h2 class="text-title-lg text-text-primary">KPI Health</h2>' +
          '<p class="text-body-sm text-text-muted max-w-2xl">Decide what each KPI Health flag means in a fiscal year. ' +
            'The four flags stay the same, and every year keeps its own definitions, so a change to one year never touches another.</p>' +
        '</div>' +
        '<div class="flex flex-wrap items-center gap-2 shrink-0">' +
          '<label for="health-year" class="text-xs font-semibold text-slate-600">Year</label>' +
          '<select id="health-year" class="field !w-auto !py-1.5" onchange="MGI.onHealthYearChange(this.value)">' + years.map(function (y) {
            return '<option value="' + y + '"' + (y === year ? ' selected' : '') + '>FY' + y + (y === S.healthSettings.activeYear ? ' (Active)' : '') + '</option>';
          }).join('') + '</select>' + status +
        '</div>' +
      '</div>' +
      '<div class="grid grid-cols-1 lg:grid-cols-2 gap-space-md">' +
        card('thin', row('health-min', 'Minimum submissions in the year', number('health-min', d.minEntries, 1, 1, 1000, '')) +
          '<p class="text-label-xs text-text-muted">Below this, a KPI gets no other flag.</p>') +
        card('hard', row('health-hard-pct', 'Share of submissions, at least', number('health-hard-pct', d.hardPct, 0.1, 1, 100, '%')) +
          row('health-hard-tier', 'At tier', tierSelect('health-hard-tier', d.hardTier, [0.2, 0.4], false))) +
        card('easy', row('health-easy-pct', 'Share of submissions, at least', number('health-easy-pct', d.easyPct, 0.1, 1, 100, '%')) +
          row('health-easy-tier', 'At tier', tierSelect('health-easy-tier', d.easyTier, [1, 0.8], true))) +
        card('healthy', '<p>Everything else: enough submissions, and neither Unrealistic nor Easy.</p>' +
          '<p class="text-label-xs text-text-muted">Unrealistic is checked before Easy, so a KPI never gets both.</p>') +
      '</div>' +
      '<div class="rounded-lg bg-surface-page border border-border-light px-4 py-3">' +
        '<p class="text-label-xs uppercase tracking-wider text-text-muted mb-1">How KPI Health will read FY' + year + '</p>' +
        '<p id="health-preview" class="text-body-sm text-text-primary"></p>' +
        '<p id="health-error" class="hidden mt-1 text-body-sm text-status-danger-text" role="alert"></p>' +
      '</div>' +
      '<div class="flex flex-wrap items-center justify-end gap-space-sm">' +
        '<button type="button" class="btn btn-secondary" onclick="MGI.resetHealthDefaults()">' +
          '<span class="material-symbols-outlined text-[18px]">restart_alt</span> Reset to defaults</button>' +
        '<button id="health-save" type="button" class="btn btn-primary" onclick="MGI.saveHealthSettings()">' +
          '<span class="material-symbols-outlined text-[18px]">save</span> Save FY' + year + '</button>' +
      '</div>' +
    '</div>';
  syncHealthPreview();
}

function readHealthDraft() {
  var v = function (id) { return $(id) ? $(id).value : ''; };
  return {
    minEntries: v('health-min'), easyPct: v('health-easy-pct'), easyTier: Number(v('health-easy-tier')),
    hardPct: v('health-hard-pct'), hardTier: Number(v('health-hard-tier'))
  };
}

function syncHealthPreview() {
  var d = S.healthDraft;
  var problem = healthProblem(d);
  if ($('health-preview')) $('health-preview').textContent = problem ? '' : healthRuleText(d);
  if ($('health-error')) {
    $('health-error').textContent = problem;
    $('health-error').classList.toggle('hidden', !problem);
  }
  if ($('health-save')) $('health-save').disabled = !!problem;
}

function onHealthInput() {
  S.healthDraft = readHealthDraft();
  syncHealthPreview();
}

function onHealthYearChange(value) {
  var year = parseInt(value, 10);
  if (!year) return;
  S.healthYear = year;
  S.healthDraft = healthDraftFrom(healthConfig(year));
  renderHealthPanel();
}

function resetHealthDefaults() {
  if (!S.healthSettings) return;
  S.healthDraft = healthDraftFrom(S.healthSettings.defaults);
  renderHealthPanel();
}

function saveHealthSettings() {
  var d = S.healthDraft;
  var problem = healthProblem(d);
  if (problem) {
    toast(problem, 'warning');
    return;
  }
  var year = S.healthYear;
  var restore = $('health-save') ? busy($('health-save'), 'Saving') : function () {};
  return api('saveKpiHealthSettings', {
    year: year, minEntries: Number(d.minEntries), easyPct: Number(d.easyPct), easyTier: Number(d.easyTier),
    hardPct: Number(d.hardPct), hardTier: Number(d.hardTier)
  })
    .then(function (res) {
      S.healthSettings = res;
      S.healthDraft = healthDraftFrom(healthConfig(year));
      if (S.kpiHealth && S.kpiHealth.year === year) S.kpiHealth = null;
      toast(res.message, 'success');
      renderHealthPanel();
    })
    .catch(function (err) {
      restore();
      toast(err.message, 'error');
    });
}

function editKpiHealthDefinitions() {
  S.healthYear = S.kpiHealthYear || (S.kpiHealth && S.kpiHealth.year) || S.user.year;
  S.healthDraft = null;
  S.settingsTab = 'health';
  if (S.view === 'settings') {
    S.settingsLoaded.health = false;
    setSettingsTab('health');
    return;
  }
  go('settings');
}
