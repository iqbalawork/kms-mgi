'use strict';

function perfConfig(year) {
  var d = S.perfSettings;
  var c = d && d.configs ? d.configs[year] : null;
  if (c) return c;
  var def = d ? d.defaults : { weights: { kpi: 60, kbi: 30, s360: 8, discipline: 2 }, grades: { A: 95, B: 85, C: 70, D: 20 } };
  return { year: year, weights: def.weights, grades: def.grades, saved: false, released: false, releasedAt: '', updatedAt: '' };
}

function perfDraftFrom(c) {
  var out = { weights: {}, grades: {} };
  PERF_COMPONENTS.forEach(function (p) { out.weights[p.key] = Number(c.weights[p.key]); });
  GRADES.slice(0, 4).forEach(function (g) { out.grades[g] = Number(c.grades[g]); });
  return out;
}

function perfWeightProblem(d) {
  var total = 0;
  for (var n = 0; n < PERF_COMPONENTS.length; n++) {
    var c = PERF_COMPONENTS[n];
    var v = d.weights[c.key];
    if (!isNum(v)) return 'The ' + c.label + ' weight must be a number.';
    if (v < 0 || v > 100) return 'The ' + c.label + ' weight must be between 0% and 100%.';
    total += Math.round(v * 100) / 100;
  }
  total = Math.round(total * 100) / 100;
  if (Math.abs(total - 100) > 0.0001) return 'Component weights must add up to exactly 100%. They add up to ' + num(total, 2) + '% now.';
  return '';
}

function perfGradeProblem(d) {
  for (var n = 0; n < 4; n++) {
    var g = GRADES[n];
    var v = d.grades[g];
    if (!isNum(v)) return 'Grade ' + g + ' needs a starting score.';
    if (v <= 0) return 'Grade ' + g + ' must start above 0.';
    if (v > 100) return 'Grade ' + g + ' cannot start above 100.';
    if (n && v >= d.grades[GRADES[n - 1]]) {
      return 'Grade ' + g + ' must start below Grade ' + GRADES[n - 1] + ' (' + num(d.grades[GRADES[n - 1]], 2) + '), otherwise the ranges overlap.';
    }
  }
  return '';
}

function perfCopySource(year) {
  var d = S.perfSettings;
  if (!d) return null;
  var best = null;
  Object.keys(d.configs).forEach(function (k) {
    var y = parseInt(k, 10);
    if (y < year && d.configs[k].saved && (best === null || y > best)) best = y;
  });
  return best;
}

function loadPerformanceSettings() {
  if (!$('perf-control')) return;
  if (!S.perfSettings) $('perf-control').innerHTML = '<div class="skeleton h-72 w-full"></div>';

  api('getPerformanceSettings')
    .then(function (data) {
      S.perfSettings = data;
      if (!S.perfYear) S.perfYear = data.activeYear;
      if (!S.perfDraft) S.perfDraft = perfDraftFrom(perfConfig(S.perfYear));
      renderPerfPanel();
    })
    .catch(function (err) {
      $('perf-control').innerHTML = '<p class="text-body-md text-status-danger-text text-center">' + esc(err.message) + '</p>';
      toast(err.message, 'error');
    });
}

function renderPerfPanel() {
  var host = $('perf-control');
  if (!host || !S.perfSettings) return;
  var year = S.perfYear;
  var c = perfConfig(year);
  var locked = !!c.released;
  var d = S.perfDraft || perfDraftFrom(c);
  S.perfDraft = d;
  var years = S.perfSettings.years.slice();
  if (years.indexOf(year) === -1) years.push(year);
  years.sort(function (a, b) { return b - a; });
  var source = perfCopySource(year);
  var value = function (v) { return isNum(v) ? String(v) : ''; };

  var status = locked
    ? '<span class="pill pill-success"><span class="material-symbols-outlined text-[14px]">lock</span>Released, locked</span>'
    : c.saved
      ? '<span class="pill pill-info">Saved' + (c.updatedAt ? ' ' + esc(fmtDate(c.updatedAt)) : '') + '</span>'
      : '<span class="pill pill-neutral" title="Nothing saved for this year yet">Using defaults</span>';

  var weightRow = function (p) {
    return '<div class="flex items-center gap-3 py-2.5">' +
      '<div class="min-w-0 flex-1">' +
        '<label for="perf-w-' + p.key + '" class="block text-body-md font-semibold text-text-primary">' + esc(p.label) + '</label>' +
        '<p class="text-label-xs text-text-muted">' + esc(p.hint) + '</p>' +
      '</div>' +
      '<div class="relative w-28 shrink-0">' +
        '<input id="perf-w-' + p.key + '" type="number" inputmode="decimal" step="0.01" min="0" max="100" class="field !pr-8 text-right tabular-nums"' +
          ' value="' + value(d.weights[p.key]) + '" oninput="MGI.onPerfInput()" onwheel="this.blur()"' + (locked ? ' disabled' : '') + '>' +
        '<span class="absolute right-3 top-1/2 -translate-y-1/2 text-label-sm text-text-muted pointer-events-none">%</span>' +
      '</div>' +
    '</div>';
  };

  var gradeRow = function (g, n) {
    var hint = n === 0 ? 'Top grade, up to 100' : 'Below Grade ' + GRADES[n - 1];
    return '<div class="flex items-center gap-3 py-2.5">' +
      gradeBadge(g, 'md') +
      '<div class="min-w-0 flex-1">' +
        '<label for="perf-g-' + g + '" class="block text-body-md font-semibold text-text-primary">Grade ' + g + ' starts at</label>' +
        '<p class="text-label-xs text-text-muted">' + hint + '</p>' +
      '</div>' +
      '<input id="perf-g-' + g + '" type="number" inputmode="decimal" step="0.01" min="0.01" max="100" class="field !w-28 shrink-0 text-right tabular-nums"' +
        ' value="' + value(d.grades[g]) + '" oninput="MGI.onPerfInput()" onwheel="this.blur()"' + (locked ? ' disabled' : '') + '>' +
    '</div>';
  };

  host.innerHTML =
    '<div class="flex flex-col gap-space-lg">' +
      '<div class="flex flex-col md:flex-row md:items-start justify-between gap-space-md">' +
        '<div class="min-w-0">' +
          '<h2 class="text-title-lg text-text-primary">Performance Scoring</h2>' +
          '<p class="text-body-sm text-text-muted max-w-2xl">Choose how each fiscal year combines Avg KPI with KBI, 360, and Discipline, and where each grade starts. ' +
            'Every year keeps its own rules, so a change to one year never touches another.</p>' +
        '</div>' +
        '<div class="flex flex-wrap items-center gap-2 shrink-0">' +
          '<label for="perf-year" class="text-xs font-semibold text-slate-600">Year</label>' +
          '<select id="perf-year" class="field !w-auto !py-1.5" onchange="MGI.onPerfYearChange(this.value)">' + years.map(function (y) {
            return '<option value="' + y + '"' + (y === year ? ' selected' : '') + '>FY' + y + (y === S.perfSettings.activeYear ? ' (Active)' : '') + '</option>';
          }).join('') + '</select>' + status +
        '</div>' +
      '</div>' +
      (locked
        ? '<div class="rounded-lg bg-status-success-subtle text-status-success-text text-body-sm px-3 py-2 flex items-center gap-2">' +
            '<span class="material-symbols-outlined text-[18px]">lock</span>FY' + year + ' results are released, so these rules are locked. ' +
            'Withdraw the release on the Performance Evaluation page to change them.</div>'
        : '') +
      '<div class="grid grid-cols-1 xl:grid-cols-2 gap-space-lg items-start">' +
        '<section class="rounded-xl border border-border-light overflow-hidden">' +
          '<div class="px-space-md py-space-sm bg-surface-page border-b border-border-light flex items-center justify-between gap-2">' +
            '<h3 class="text-title-md text-text-primary">Component weights</h3>' +
            '<span id="perf-w-total" class="pill pill-neutral !text-[11px]"></span>' +
          '</div>' +
          '<div class="px-space-md divide-y divide-slate-100">' + PERF_COMPONENTS.map(weightRow).join('') + '</div>' +
          '<div class="px-space-md pb-space-md pt-1">' +
            '<div class="meter-track meter-sm"><div id="perf-w-meter" class="meter-fill" style="width:0%"></div></div>' +
            '<p class="text-label-xs text-text-muted mt-1.5">The four weights must add up to exactly 100%. A component set to 0% is not needed for the score.</p>' +
          '</div>' +
        '</section>' +
        '<section class="rounded-xl border border-border-light overflow-hidden">' +
          '<div class="px-space-md py-space-sm bg-surface-page border-b border-border-light">' +
            '<h3 class="text-title-md text-text-primary">Grade intervals</h3>' +
          '</div>' +
          '<div class="px-space-md divide-y divide-slate-100">' + GRADES.slice(0, 4).map(gradeRow).join('') +
            '<div class="flex items-center gap-3 py-2.5">' + gradeBadge('E', 'md') +
              '<div class="min-w-0 flex-1"><p class="text-body-md font-semibold text-text-primary">Grade E</p>' +
              '<p class="text-label-xs text-text-muted">Every score below Grade D</p></div>' +
              '<span id="perf-g-E" class="text-body-sm font-semibold text-text-secondary w-28 text-right">-</span>' +
            '</div>' +
          '</div>' +
          '<div class="px-space-md pb-space-md flex flex-col gap-2">' +
            '<div id="perf-g-preview"></div>' +
            '<div id="perf-g-legend" class="flex flex-wrap gap-x-3 gap-y-1.5 text-label-xs"></div>' +
          '</div>' +
        '</section>' +
      '</div>' +
      '<div id="perf-example" class="rounded-xl border border-border-light bg-surface-page px-space-md py-space-sm text-body-sm text-text-secondary"></div>' +
      '<p id="perf-error" class="hidden text-label-sm text-status-danger-text"></p>' +
      (locked ? '' :
        '<div class="flex flex-wrap items-center gap-space-sm">' +
          '<button id="perf-save" type="button" class="btn btn-primary" onclick="MGI.savePerfSettings()">' +
            '<span class="material-symbols-outlined text-[18px]">save</span> Save FY' + year + ' Rules</button>' +
          '<button type="button" class="btn btn-secondary" onclick="MGI.resetPerfDefaults()" title="Avg KPI 60%, KBI 30%, 360 8%, Discipline 2%">' +
            '<span class="material-symbols-outlined text-[18px]">restart_alt</span> Defaults</button>' +
          (source ? '<button type="button" class="btn btn-secondary" onclick="MGI.copyPerfFrom(' + source + ')">' +
            '<span class="material-symbols-outlined text-[18px]">content_copy</span> Copy FY' + source + '</button>' : '') +
        '</div>') +
    '</div>';

  renderPerfPreview();
}

function renderPerfPreview() {
  var d = S.perfDraft;
  if (!d || !$('perf-w-total')) return;
  var c = perfConfig(S.perfYear);
  var total = 0;
  PERF_COMPONENTS.forEach(function (p) { if (isNum(d.weights[p.key])) total += d.weights[p.key]; });
  total = Math.round(total * 100) / 100;
  var weightOk = Math.abs(total - 100) < 0.0001;

  $('perf-w-total').className = 'pill ' + (weightOk ? 'pill-success' : 'pill-danger') + ' !text-[11px]';
  $('perf-w-total').textContent = 'Total ' + num(total, 2) + '%';
  $('perf-w-meter').className = 'meter-fill' + (weightOk ? ' is-valid' : '');
  $('perf-w-meter').style.width = Math.min(100, Math.max(0, total)) + '%';

  var weightError = perfWeightProblem(d);
  var gradeError = perfGradeProblem(d);
  var error = weightError || gradeError;
  $('perf-error').textContent = error;
  $('perf-error').classList.toggle('hidden', !error);

  var saved = perfDraftFrom(c);
  var dirty = JSON.stringify(d) !== JSON.stringify(saved) || !c.saved;
  if ($('perf-save')) $('perf-save').disabled = !!error || !dirty;

  $('perf-g-E').textContent = isNum(d.grades.D) ? 'Below ' + num(d.grades.D, 2) : '-';
  $('perf-g-preview').innerHTML = gradeError ? '' : gradeScaleHtml(d.grades, null, true);
  $('perf-g-legend').innerHTML = gradeError ? '' : gradeLegendHtml(d.grades);

  if (error) {
    $('perf-example').innerHTML = '<span class="text-text-muted">Fix the rules above to see an example.</span>';
    return;
  }
  var ex = perfCompute(85.75, { kbi: 80, s360: 90, discipline: 100 }, d);
  $('perf-example').innerHTML =
    '<div class="flex flex-wrap items-center gap-x-2 gap-y-1">' +
      '<span class="material-symbols-outlined text-[18px] text-text-muted">lightbulb</span>' +
      '<span>Example: Avg KPI 85.75, KBI 80, 360 90, and Discipline 100 give a Performance Score of</span>' +
      '<strong class="text-text-primary tabular-nums">' + scoreText(ex.score) + '</strong><span>and</span>' + gradeBadge(ex.grade) +
    '</div>';
}

function onPerfInput() {
  var d = S.perfDraft;
  if (!d) return;
  var read = function (id) {
    var el = $(id);
    var v = el ? parseFloat(el.value) : NaN;
    return isFinite(v) ? v : NaN;
  };
  PERF_COMPONENTS.forEach(function (p) { d.weights[p.key] = read('perf-w-' + p.key); });
  GRADES.slice(0, 4).forEach(function (g) { d.grades[g] = read('perf-g-' + g); });
  renderPerfPreview();
}

function onPerfYearChange(value) {
  var year = parseInt(value, 10);
  if (!year) return;
  S.perfYear = year;
  S.perfDraft = perfDraftFrom(perfConfig(year));
  renderPerfPanel();
}

function resetPerfDefaults() {
  if (!S.perfSettings) return;
  S.perfDraft = perfDraftFrom(S.perfSettings.defaults);
  renderPerfPanel();
}

function copyPerfFrom(year) {
  if (!S.perfSettings) return;
  S.perfDraft = perfDraftFrom(perfConfig(parseInt(year, 10)));
  renderPerfPanel();
  toast('FY' + year + ' rules copied. Save to apply them to FY' + S.perfYear + '.', 'info');
}

function savePerfSettings() {
  var d = S.perfDraft;
  if (!d) return;
  var error = perfWeightProblem(d) || perfGradeProblem(d);
  if (error) {
    toast(error, 'error');
    return;
  }
  var year = S.perfYear;
  var restore = busy($('perf-save'), 'Saving');

  api('savePerformanceSettings', { year: year, weights: d.weights, grades: d.grades })
    .then(function (res) {
      S.perfSettings = res;
      S.perfDraft = perfDraftFrom(perfConfig(year));
      if (S.evaluation && S.evaluation.year === year) S.evaluation = null;
      if (S.perfRules && S.perfRules.year === year) S.perfRules = null;
      S.reports = {};
      renderPerfPanel();
      toast(res.message, 'success');
    })
    .catch(function (err) {
      restore();
      toast(err.message, 'error');
    });
}

function renderGuidePerformance() {
  var host = $('guide-performance-body');
  if (!host) return;
  if (!S.perfRules) {
    host.innerHTML = '<div class="skeleton h-40 w-full"></div>';
    api('getPerformanceRules', S.user.year)
      .then(function (rules) {
        S.perfRules = rules;
        renderGuidePerformance();
      })
      .catch(function (err) {
        host.innerHTML = '<p class="text-body-sm text-status-danger-text">' + esc(err.message) + '</p>';
      });
    return;
  }

  var rules = S.perfRules;
  var ex = perfCompute(85.75, { kbi: 80, s360: 90, discipline: 100 }, rules);
  if ($('guide-perf-year')) $('guide-perf-year').textContent = 'FY' + rules.year;
  var source = function (icon, title, text) {
    return '<li class="flex items-start gap-space-sm">' +
      '<span class="w-9 h-9 rounded-lg bg-slate-50 ring-1 ring-slate-200/70 text-slate-600 flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-[20px]">' + icon + '</span></span>' +
      '<span class="text-body-sm text-text-secondary"><strong class="block text-text-primary">' + title + '</strong>' + text + '</span></li>';
  };
  var rows = ex.parts.filter(function (p) { return p.required; }).map(function (p) {
    return '<tr><td class="py-1.5 text-text-secondary">' + esc(p.label) + '</td>' +
      '<td class="py-1.5 text-right tabular-nums">' + num(p.value, 2) + '</td>' +
      '<td class="py-1.5 text-right tabular-nums text-text-muted">x ' + num(p.weight, 2) + '%</td>' +
      '<td class="py-1.5 text-right tabular-nums font-semibold">' + num(p.points, 2) + '</td></tr>';
  }).join('');

  host.innerHTML =
    '<div class="grid grid-cols-1 xl:grid-cols-2 gap-space-lg">' +
      '<div class="flex flex-col gap-space-md">' +
        '<div class="rounded-xl border border-border-light bg-surface-page p-space-md">' +
          '<p class="text-label-xs uppercase tracking-wider text-text-muted mb-2">Formula</p>' +
          '<p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-md"><strong class="text-text-primary">Performance Score</strong>' +
            '<span class="text-text-muted">=</span>' + perfFormulaHtml(rules) + '</p>' +
        '</div>' +
        '<ul class="flex flex-col gap-space-md">' +
          source('monitoring', 'Avg KPI Score', 'Calculated automatically from your monthly KPI submissions, using the counted months only.') +
          source('assignment_turned_in', 'KBI, 360, and Discipline', 'Processed by HR and entered as scores from 0 to 100.') +
          source('lock_clock', 'When you see it', 'Your Performance Score and Grade appear in the Annual Performance tab of My KPIs after HR releases the year\'s results. Until every counted component is in, it shows Pending.') +
        '</ul>' +
      '</div>' +
      '<div class="flex flex-col gap-space-md">' +
        '<div class="rounded-xl border border-border-light p-space-md">' +
          '<p class="text-label-xs uppercase tracking-wider text-text-muted mb-2">Worked example</p>' +
          '<table class="w-full text-body-sm"><tbody class="divide-y divide-slate-100">' + rows + '</tbody>' +
            '<tfoot><tr class="border-t-2 border-slate-200"><td class="pt-2 font-semibold text-text-primary" colspan="3">Performance Score</td>' +
            '<td class="pt-2 text-right font-bold tabular-nums text-text-primary">' + scoreText(ex.score) + ' ' + gradeBadge(ex.grade) + '</td></tr></tfoot>' +
          '</table>' +
        '</div>' +
        '<div class="flex flex-col gap-2">' + gradeScaleHtml(rules.grades, ex.score, true) +
          '<div class="flex flex-wrap gap-x-3 gap-y-1.5 text-label-xs">' + gradeLegendHtml(rules.grades) + '</div></div>' +
      '</div>' +
    '</div>';
}
