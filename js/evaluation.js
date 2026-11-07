'use strict';

function perfRound(n) {
  return Math.round((n + 1e-9) * 100) / 100;
}

function perfScoreInput(value, label) {
  var text = String(value === null || value === undefined ? '' : value).replace(/\s/g, '').replace(/%$/, '');
  if (!text) return { value: null, error: '' };
  if (text.indexOf(',') > -1 && text.indexOf('.') === -1) text = text.replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(text)) return { value: null, error: label + ' must be a number from 0 to 100.' };
  var n = parseFloat(text);
  if (!isFinite(n) || n < 0 || n > 100) return { value: null, error: label + ' must be between 0 and 100.' };
  return { value: Math.round(n * 100) / 100, error: '' };
}

function perfSpLevel(value) {
  var text = String(value === null || value === undefined ? '' : value).toUpperCase().replace(/[\s_\-.]+/g, '');
  if (!text || text === 'NONE' || text === '0' || text === 'NO') return '';
  var m = /^(?:SP)?([123])$/.exec(text);
  return m ? 'SP' + m[1] : null;
}

function perfGrade(score, grades) {
  if (!isNum(score)) return null;
  for (var g = 0; g < 4; g++) {
    if (score >= Number(grades[GRADES[g]])) return GRADES[g];
  }
  return 'E';
}

function perfCompute(avgKpi, inputs, rules) {
  var values = { kpi: avgKpi, kbi: inputs.kbi, s360: inputs.s360, discipline: inputs.discipline };
  var total = 0;
  var missing = [];
  var parts = PERF_COMPONENTS.map(function (c) {
    var weight = Number(rules.weights[c.key]) || 0;
    var dec = Math.round(weight * 100) / 10000;
    var v = values[c.key];
    var has = isNum(v);
    var part = { key: c.key, label: c.label, value: has ? v : null, weight: weight, points: null, required: weight > 0 };
    if (!part.required) return part;
    if (!has) {
      missing.push(c.label);
      return part;
    }
    total += v * dec;
    part.points = perfRound(v * dec);
    return part;
  });
  var complete = !missing.length;
  var score = complete ? perfRound(total) : null;
  return { score: score, grade: complete ? perfGrade(score, rules.grades) : null, complete: complete, missing: missing, parts: parts };
}

function scoreText(v) {
  return isNum(v) ? Number(v).toFixed(2) : '-';
}

function perfComponent(key) {
  return PERF_COMPONENTS.filter(function (c) { return c.key === key; })[0];
}

function gradeBadge(grade, size) {
  if (!grade) return '<span class="grade-badge grade-none' + (size ? ' grade-' + size : '') + '" title="No grade yet">-</span>';
  return '<span class="grade-badge grade-' + grade + (size ? ' grade-' + size : '') + '" title="Grade ' + grade + '">' + grade + '</span>';
}

function gradeRanges(grades) {
  return GRADES.map(function (g, n) {
    var min = g === 'E' ? 0 : Number(grades[g]);
    var max = n === 0 ? 100 : Number(grades[GRADES[n - 1]]);
    var label = g === 'A' ? num(min, 2) + ' to 100'
              : g === 'E' ? 'Below ' + num(max, 2)
              : num(min, 2) + ' to ' + num(perfRound(max - 0.01), 2);
    return { grade: g, min: min, max: max, label: label };
  });
}

function gradeLegendHtml(grades) {
  return gradeRanges(grades).map(function (r) {
    return '<span class="inline-flex items-center gap-1.5 whitespace-nowrap">' + gradeBadge(r.grade) +
      '<span class="text-text-secondary">' + esc(r.label) + '</span></span>';
  }).join('');
}

function gradeScaleTicks(ranges) {
  var shown = [];
  ranges.slice(0, -1).forEach(function (r) {
    var prev = shown.length ? shown[shown.length - 1] : 0;
    if (r.max - prev >= 4 && 100 - r.max >= 2) shown.push(r.max);
  });
  return shown.map(function (v) {
    return '<span class="absolute top-0 text-[11px] font-medium tabular-nums text-text-muted" style="left:' + v + '%;transform:translateX(-50%)">' + num(v, 2) + '</span>';
  }).join('');
}

function gradeScaleHtml(grades, marker, tall) {
  var ranges = gradeRanges(grades).slice().reverse();
  var bar = ranges.map(function (r) {
    var width = Math.max(0, r.max - r.min);
    return '<div class="h-full flex items-center justify-center font-bold text-white ' + (tall ? 'text-[14px]' : 'text-[12px]') +
      '" style="width:' + width + '%;background:' + GRADE_COLORS[r.grade] + '" title="Grade ' + r.grade + ': ' + esc(r.label) + '">' +
      (width >= 3 ? r.grade : '') + '</div>';
  }).join('');
  var pos = isNum(marker) ? Math.min(100, Math.max(0, marker)) : null;
  var mark = pos === null ? ''
    : '<div class="grade-scale-mark relative h-[26px]">' +
        '<span class="absolute top-0 rounded-md bg-slate-900 text-white text-[11px] font-bold tabular-nums leading-none px-1.5 py-[3px] whitespace-nowrap" style="left:' +
          pos + '%;transform:translateX(' + (pos < 6 ? '0' : pos > 94 ? '-100%' : '-50%') + ')" title="Score ' + num(marker, 2) + '">' + scoreText(marker) + '</span>' +
        '<span class="absolute bottom-[3px] w-0 h-0 border-x-[5px] border-x-transparent border-t-[6px] border-t-slate-900" style="left:calc(' + pos + '% - 5px)"></span>' +
      '</div>';
  return '<div class="grade-scale w-full" aria-hidden="true">' + mark +
    '<div class="flex ' + (tall ? 'h-9' : 'h-6') + ' w-full rounded-lg overflow-hidden ring-1 ring-black/5">' + bar + '</div>' +
    '<div class="relative h-4 mt-1">' + gradeScaleTicks(ranges) + '</div>' +
  '</div>';
}

function perfFormulaHtml(rules) {
  return PERF_COMPONENTS.filter(function (c) { return Number(rules.weights[c.key]) > 0; }).map(function (c) {
    return '<span class="inline-flex items-center gap-1 whitespace-nowrap"><span class="text-text-secondary">' + esc(c.label) +
      '</span><strong class="text-text-primary">' + num(rules.weights[c.key], 2) + '%</strong></span>';
  }).join('<span class="text-text-muted">+</span>');
}

function perfFormulaText(rules) {
  return PERF_COMPONENTS.filter(function (c) { return Number(rules.weights[c.key]) > 0; }).map(function (c) {
    return c.label + ' ' + num(rules.weights[c.key], 2) + '%';
  }).join(' + ');
}

function spTone(level) {
  return level === 'SP3' ? 'pill-danger' : level === 'SP2' ? 'pill-maroon' : level === 'SP1' ? 'pill-warning' : 'pill-neutral';
}

function spPill(level, remarks) {
  if (!level && !remarks) return '<span class="text-text-muted">-</span>';
  return '<span class="pill ' + spTone(level) + ' !text-[11px] !px-2 max-w-[140px]" title="' + esc(remarks || 'No remarks') + '">' +
    (level ? esc(level) : 'Remarks') + (remarks ? '<span class="material-symbols-outlined text-[14px]">sticky_note_2</span>' : '') + '</span>';
}

function evalSpCell(r) {
  var level = r.spLevel || '';
  var remarks = r.remarks || '';
  if (!level && !remarks) return '<span class="text-text-muted">-</span>';
  return '<div class="flex flex-col items-start gap-1 min-w-0">' +
    '<span class="pill ' + spTone(level) + ' !text-[11px] !px-2">' +
      '<span class="material-symbols-outlined text-[14px]">' + (level ? 'warning' : 'sticky_note_2') + '</span>' +
      (level ? esc(level) : 'Note') + '</span>' +
    (remarks
      ? '<p class="sp-remarks" title="' + esc(remarks) + '">' + esc(remarks) + '</p>'
      : '<p class="text-[11px] text-text-muted">No remarks</p>') +
  '</div>';
}

function evalKey(nik, position, department) {
  var t = function (v) { return String(v === null || v === undefined ? '' : v).trim(); };
  return t(nik) + '|' + (t(position) + '|' + t(department)).toLowerCase();
}

function initEvaluation() {
  if (!S.evalYear) S.evalYear = S.user.year;
  wireFileDrop($('ei-drop'), $('ei-file'), onEvalUploadFile);
  if (S.evaluation && S.evaluation.year === S.evalYear) renderEvaluation();
  loadEvaluation();
}

function loadEvaluation() {
  var year = S.evalYear || S.user.year;
  var cached = S.evaluation && S.evaluation.year === year;
  if (!cached) {
    if (!($('eval-year').options || []).length) {
      $('eval-year').innerHTML = '<option value="' + year + '">FY' + year + '</option>';
    }
    $('eval-actions').innerHTML = '';
    $('eval-state').innerHTML = '';
    $('eval-banner').innerHTML = '';
    $('eval-rules').innerHTML = '<div class="skeleton h-6 w-2/3"></div>';
    $('eval-stats').innerHTML = [0, 1, 2, 3].map(function () { return '<div class="skeleton h-[148px] w-full"></div>'; }).join('');
    renderEvalHead();
    $('eval-tbody').innerHTML = skeletonRows(EVAL_COLS, 6);
    $('eval-pagination').innerHTML = '';
  }

  api('getPerformanceEvaluation', year)
    .then(function (data) {
      if (data.year !== (S.evalYear || S.user.year)) return;
      S.evaluation = data;
      fillEvalFilters();
      renderEvaluation();
    })
    .catch(function (err) {
      if (!cached) {
        $('eval-rules').innerHTML = '';
        $('eval-stats').innerHTML = '';
        $('eval-tbody').innerHTML =
          '<tr><td colspan="' + EVAL_COLS + '" class="text-center text-status-danger py-space-xl">' + esc(err.message) + '</td></tr>';
      }
      toast(err.message, 'error');
    });
}

function fillEvalFilters() {
  var d = S.evaluation;
  var years = (d.years && d.years.length ? d.years : [d.year]).slice();
  if (years.indexOf(d.year) === -1) years.unshift(d.year);
  years.sort(function (a, b) { return b - a; });
  $('eval-year').innerHTML = years.map(function (y) {
    return '<option value="' + y + '">FY' + y + (y === d.activeYear ? ' (Active)' : '') + '</option>';
  }).join('');
  $('eval-year').value = String(d.year);

  var div = $('eval-division');
  var keep = div.value;
  div.innerHTML = '<option value="">All Divisions</option>' + d.divisions.map(function (v) {
    return '<option value="' + esc(v) + '">' + esc(v) + '</option>';
  }).join('');
  div.value = d.divisions.indexOf(keep) > -1 ? keep : '';
  fillEvalDepartments();
}

function fillEvalDepartments() {
  var d = S.evaluation;
  if (!d) return;
  var division = $('eval-division').value;
  var list = distinct(d.rows.filter(function (r) { return !division || r.Division === division; }), 'Department');
  var sel = $('eval-department');
  var keep = sel.value;
  sel.innerHTML = '<option value="">All Departments</option>' + list.map(function (v) {
    return '<option value="' + esc(v) + '">' + esc(v) + '</option>';
  }).join('');
  sel.value = list.indexOf(keep) > -1 ? keep : '';
}

function onEvalYearChange() {
  var year = parseInt($('eval-year').value, 10);
  if (!year || year === S.evalYear) return;
  S.evalYear = year;
  S.evalPage = 1;
  S.evaluation = null;
  S.evalUpload = null;
  S.evalUploadOpen = null;
  loadEvaluation();
}

function onEvalDivisionChange() {
  fillEvalDepartments();
  onEvalFilter();
}

function onEvalFilter() {
  S.evalPage = 1;
  if (S.evaluation) renderEvalBody();
}

function onEvalSearch() {
  clearTimeout(S.evalTimer);
  S.evalTimer = setTimeout(onEvalFilter, 200);
}

function resetEvalFilters() {
  ['eval-division', 'eval-department', 'eval-status', 'eval-search'].forEach(function (id) { $(id).value = ''; });
  S.evalSort = null;
  renderEvalHead();
  fillEvalDepartments();
  onEvalFilter();
}

function evalRows() {
  if (!S.evaluation) return [];
  var division = $('eval-division').value;
  var dept = $('eval-department').value;
  var status = $('eval-status').value;
  var q = ($('eval-search').value || '').trim().toLowerCase();

  var rows = S.evaluation.rows.filter(function (r) {
    if (division && r.Division !== division) return false;
    if (dept && r.Department !== dept) return false;
    if (status === 'complete' && !r.complete) return false;
    if (status === 'pending' && (r.complete || !isNum(r.avgKpi))) return false;
    if (status === 'nokpi' && isNum(r.avgKpi)) return false;
    if (status === 'sp' && !r.spLevel) return false;
    if (q && (r.Full_Name + ' ' + r.NIK).toLowerCase().indexOf(q) === -1) return false;
    return true;
  });

  return sortedBy(rows, S.evalSort, evalSortValue);
}

function evalStats(rows) {
  var niks = {};
  var dist = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  var complete = 0;
  var sum = 0;
  var noKpi = 0;
  var sp = 0;
  rows.forEach(function (r) {
    niks[r.NIK] = true;
    if (r.complete) {
      complete++;
      sum += r.score;
      dist[r.grade]++;
    }
    if (!isNum(r.avgKpi)) noKpi++;
    if (r.spLevel) sp++;
  });
  return {
    total: rows.length,
    employees: Object.keys(niks).length,
    complete: complete,
    pending: rows.length - complete,
    noKpi: noKpi,
    sp: sp,
    avg: complete ? perfRound(sum / complete) : null,
    dist: dist
  };
}

function renderEvaluation() {
  if (!S.evaluation) return;
  renderEvalActions();
  renderEvalBanner();
  renderEvalRules();
  renderEvalHead();
  renderEvalBody();
}

function renderEvalBody() {
  var rows = evalRows();
  renderEvalStats(rows);
  renderEvalTable(rows);
  renderEvalUploadCard();
}

function renderEvalActions() {
  var rules = S.evaluation.rules;
  var released = rules.released;
  $('eval-state').innerHTML = released
    ? '<span class="pill pill-success"><span class="material-symbols-outlined text-[16px]">verified</span>FY' + rules.year + ' released</span>'
    : '<span class="pill pill-neutral" title="Employees cannot see Performance Scores for this year yet"><span class="material-symbols-outlined text-[16px]">edit_note</span>FY' + rules.year + ' draft</span>';
  $('eval-actions').innerHTML =
    '<button type="button" class="btn btn-secondary" onclick="MGI.loadEvaluation()" title="Reload data" aria-label="Reload data">' +
      '<span class="material-symbols-outlined text-[18px]">refresh</span></button>' +
    '<button type="button" class="btn btn-secondary" onclick="MGI.openEvalUpload()"' +
      (released ? ' disabled title="Released years are locked. Withdraw the release to upload."' : ' title="Upload scores for many scorecards from an Excel or CSV file"') + '>' +
      '<span class="material-symbols-outlined text-[18px]">upload_file</span> Upload Scores</button>' +
    '<button type="button" class="btn btn-secondary" onclick="MGI.openReportDownload(\'annual\')" title="Download a PDF report of this year to share with directors and HR">' +
      '<span class="material-symbols-outlined text-[18px]">picture_as_pdf</span> Download Report</button>' +
    '<button type="button" class="btn btn-secondary" onclick="MGI.exportEvalCsv()">' +
      '<span class="material-symbols-outlined text-[18px]">download</span> Export CSV</button>' +
    (released ? '' :
      '<button type="button" class="btn btn-primary" onclick="MGI.openEvalRelease()" title="Show the results to employees">' +
        '<span class="material-symbols-outlined text-[18px]">send</span> Release to Employees</button>');
}

function renderEvalBanner() {
  var d = S.evaluation;
  var rules = d.rules;
  if (!rules.released) {
    $('eval-banner').innerHTML = '';
    return;
  }
  $('eval-banner').innerHTML =
    '<div class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">' +
      '<span class="material-symbols-outlined text-status-success">lock</span>' +
      '<p class="text-body-sm text-status-success-text flex-1"><strong>FY' + d.year + ' results were released on ' + esc(fmtDate(rules.releasedAt)) +
        (rules.releasedBy ? ' by ' + esc(rules.releasedBy) : '') + '.</strong> Employees can see their Performance Score and Grade. ' +
        'Inputs and scoring rules stay locked until you withdraw the release.</p>' +
      '<button type="button" class="btn btn-secondary !py-1.5 shrink-0" onclick="MGI.openEvalRelease()">' +
        '<span class="material-symbols-outlined text-[18px]">undo</span> Withdraw Release</button>' +
    '</div>';
}

function renderEvalRules() {
  var rules = S.evaluation.rules;
  $('eval-rules').innerHTML =
    '<div class="flex flex-col xl:flex-row xl:items-center gap-3">' +
      '<div class="flex items-center gap-2 shrink-0">' +
        '<span class="material-symbols-outlined text-primary-container text-[20px]">calculate</span>' +
        '<span class="text-label-md font-semibold text-text-primary">FY' + rules.year + ' rules</span>' +
        (rules.saved ? '' : '<span class="pill pill-neutral !text-[11px] !px-2" title="No rules were saved for this year, so the defaults apply">Defaults</span>') +
      '</div>' +
      '<div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm">' + perfFormulaHtml(rules) + '</div>' +
      '<span class="hidden xl:block w-px h-6 bg-slate-200"></span>' +
      '<div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-label-xs">' + gradeLegendHtml(rules.grades) + '</div>' +
      '<button type="button" class="btn btn-secondary !py-1.5 !px-3 !text-label-sm xl:ml-auto shrink-0 self-start xl:self-auto" onclick="MGI.openPerformanceRules(' + rules.year + ')">' +
        '<span class="material-symbols-outlined text-[16px]">tune</span> ' + (rules.released ? 'View Rules' : 'Edit Rules') + '</button>' +
    '</div>';
}

function renderEvalHead() {
  var rules = S.evaluation ? S.evaluation.rules : null;
  var w = function (key) {
    if (!rules) return '';
    var weight = Number(rules.weights[key]) || 0;
    return '<span class="block text-[11px] font-medium normal-case tracking-normal text-text-muted">' +
      (weight ? num(weight, 2) + '% weight' : 'not counted') + '</span>';
  };
  var sort = S.evalSort;
  $('eval-thead').innerHTML = '<tr>' +
    sortHead('Employee', 'name', sort, 'sortEvaluation', 'min-w-[280px]') +
    sortHead('Avg KPI', 'avg', sort, 'sortEvaluation', 'text-right !px-3', w('kpi')) +
    sortHead('KBI', 'kbi', sort, 'sortEvaluation', 'text-right', w('kbi')) +
    sortHead('360', 's360', sort, 'sortEvaluation', 'text-right', w('s360')) +
    sortHead('Discipline', 'discipline', sort, 'sortEvaluation', 'text-right !px-3', w('discipline')) +
    sortHead('Performance Score', 'score', sort, 'sortEvaluation', 'text-right !px-3 !whitespace-normal leading-tight min-w-[104px]') +
    sortHead('Grade', 'grade', sort, 'sortEvaluation', 'text-center !px-3') +
    sortHead('SP Warning', 'sp', sort, 'sortEvaluation', 'min-w-[140px]') +
    '<th class="text-right">Actions</th>' +
  '</tr>';
}

var EVAL_SORT_FIELDS = { avg: 'avgKpi', kbi: 'kbi', s360: 's360', discipline: 'discipline', score: 'score' };

function evalSortValue(r, key) {
  if (key === 'name') return r.Full_Name;
  if (key === 'grade') return GRADES.indexOf(r.grade) > -1 ? GRADES.indexOf(r.grade) : null;
  if (key === 'sp') return SP_OPTIONS.indexOf(r.spLevel) > 0 ? SP_OPTIONS.indexOf(r.spLevel) : null;
  var v = r[EVAL_SORT_FIELDS[key]];
  return isNum(v) ? v : null;
}

function sortEvaluation(key) {
  S.evalSort = nextSort(S.evalSort, key, key === 'name' || key === 'grade' ? 1 : -1);
  S.evalPage = 1;
  renderEvalHead();
  if (S.evaluation) renderEvalBody();
}

function renderEvalStats(rows) {
  var st = evalStats(rows);
  var d = S.evaluation;
  var avgGrade = perfGrade(st.avg, d.rules.grades);

  var dist = GRADES.map(function (g) {
    return '<div class="flex flex-col items-center gap-1 min-w-0">' + gradeBadge(g) +
      '<span class="text-body-md font-bold tabular-nums ' + (st.dist[g] ? 'text-text-primary' : 'text-text-muted') + '">' + st.dist[g] + '</span></div>';
  }).join('');
  var distBar = GRADES.map(function (g) {
    return st.dist[g] ? '<div class="h-full" style="width:' + (st.dist[g] / st.complete * 100) + '%;background:' + GRADE_COLORS[g] + '" title="Grade ' + g + ': ' + st.dist[g] + '"></div>' : '';
  }).join('');

  $('eval-stats').innerHTML =
    statCard('Scorecards', 'badge', 'text-text-primary', st.total, st.total === 1 ? 'Scorecard' : 'Scorecards',
      plural(st.employees, 'employee') + ' in this view, FY' + d.year,
      '', 0) +

    statCard('Inputs Complete', 'task_alt', st.pending ? 'text-status-warning' : 'text-status-success',
      st.complete, 'of ' + st.total,
      !st.total ? 'No scorecards in this view'
        : st.pending ? st.pending + ' pending' + (st.noKpi ? ', ' + st.noKpi + ' still without a KPI score' : '')
        : 'Every scorecard has a Performance Score',
      'bg-status-success', st.total ? st.complete / st.total * 100 : 0) +

    statCard('Average Performance Score', 'monitoring', 'text-text-primary',
      st.avg === null ? '-' : scoreText(st.avg), st.avg === null ? '' : 'of 100',
      st.avg === null ? 'No complete scorecard yet' : 'Grade ' + avgGrade + ' on average across ' + st.complete + ' complete scorecards',
      'bg-status-info', st.avg || 0) +

    '<div class="bg-surface-card rounded-xl p-5 shadow-level-1 border border-border-light flex flex-col justify-between transition-all duration-150 hover:shadow-level-2">' +
      '<div class="flex items-center justify-between gap-3 mb-3">' +
        '<span class="text-sm font-medium text-slate-500">Grade Distribution</span>' +
        '<div class="w-9 h-9 rounded-lg bg-slate-50 ring-1 ring-slate-200/70 flex items-center justify-center text-slate-600">' +
          '<span class="material-symbols-outlined text-[20px]">leaderboard</span></div>' +
      '</div>' +
      '<div class="grid grid-cols-5 gap-1.5">' + dist + '</div>' +
      '<div class="flex w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">' + distBar + '</div>' +
    '</div>';
}

function evalInputCell(r, key, released) {
  var rules = S.evaluation.rules;
  var weight = Number(rules.weights[key]) || 0;
  var v = r[key];
  if (isNum(v)) return '<span class="font-semibold text-text-primary tabular-nums">' + num(v, 2) + '</span>';
  if (!weight) return '<span class="text-text-muted" title="Weight is 0% in FY' + rules.year + '">n/a</span>';
  if (released) return '<span class="text-text-muted">-</span>';
  var c = perfComponent(key);
  return '<button type="button" class="eval-add" onclick="MGI.openEvalEdit(\'' + esc(r.Eval_ID) + '\', \'' + key + '\')" title="Add the ' + esc(c.label) + ' score">' +
    '<span class="material-symbols-outlined text-[14px]">add</span>Add</button>';
}

function evalScoreCell(r) {
  if (r.complete) {
    return '<div class="flex flex-col items-end gap-1">' +
      '<span class="text-body-md font-bold text-text-primary tabular-nums">' + scoreText(r.score) + '</span>' +
      '<span class="block w-16 h-1 rounded-full bg-slate-100 overflow-hidden"><span class="block h-full rounded-full" style="width:' +
        Math.min(100, Math.max(0, r.score)) + '%;background:' + GRADE_COLORS[r.grade] + '"></span></span>' +
    '</div>';
  }
  if (!isNum(r.avgKpi)) {
    return '<div class="flex flex-col items-end gap-0.5"><span class="pill pill-neutral !text-[11px] !px-2">No KPI score</span>' +
      '<span class="text-[11px] text-text-muted">No counted month yet</span></div>';
  }
  return '<div class="flex flex-col items-end gap-0.5"><span class="pill pill-warning !text-[11px] !px-2">' +
    '<span class="material-symbols-outlined text-[14px]">hourglass_top</span>Pending</span>' +
    '<span class="block max-w-[128px] text-[11px] leading-tight text-text-muted">Needs ' + esc(r.missing.join(', ')) + '</span></div>';
}

function evalRowHtml(r, released, year) {
  var tags = (r.isHome ? '' : '<span class="pill pill-maroon !py-0 !px-1.5 !text-[11px]" title="Additional role">Additional</span>') +
             (r.roleInactive ? '<span class="pill pill-neutral !py-0 !px-1.5 !text-[11px]" title="Inactive role">Inactive</span>' : '');
  return '<tr>' +
    '<td class="!py-3">' +
      '<div class="flex items-center gap-3 min-w-0">' +
        '<span class="emp-avatar">' + esc(r.Initials || initials(r.Full_Name)) + '</span>' +
        '<div class="flex flex-col min-w-0">' +
          nameLink(r.Full_Name, r.NIK, r.roleKey, year, 'text-body-md font-semibold truncate') +
          '<span class="text-label-xs text-text-secondary">' + esc(r.Position) + ' / ' + esc(r.Department) + '</span>' +
          '<span class="text-[11px] text-text-muted whitespace-nowrap">NIK ' + esc(r.NIK) + (r.Division ? ' • ' + esc(r.Division) : '') + '</span>' +
          (tags ? '<span class="flex items-center gap-1 flex-wrap mt-0.5">' + tags + '</span>' : '') +
        '</div>' +
      '</div>' +
    '</td>' +
    '<td class="!py-3 text-right whitespace-nowrap">' +
      (isNum(r.avgKpi)
        ? '<span class="font-semibold tabular-nums text-status-' + band(r.avgKpi).key + '-text">' + num(r.avgKpi, 2) + '%</span>' +
          '<span class="block text-[11px] text-text-muted">' + r.kpiMonths + (r.kpiMonths === 1 ? ' month' : ' months') + '</span>'
        : '<span class="text-text-muted">-</span>') +
    '</td>' +
    '<td class="!py-3 text-right whitespace-nowrap">' + evalInputCell(r, 'kbi', released) + '</td>' +
    '<td class="!py-3 text-right whitespace-nowrap">' + evalInputCell(r, 's360', released) + '</td>' +
    '<td class="!py-3 text-right whitespace-nowrap">' + evalInputCell(r, 'discipline', released) + '</td>' +
    '<td class="!py-3 text-right">' + evalScoreCell(r) + '</td>' +
    '<td class="!py-3 text-center">' + gradeBadge(r.grade) + '</td>' +
    '<td class="!py-3">' + evalSpCell(r) + '</td>' +
    '<td class="!py-3 text-right whitespace-nowrap">' +
      '<button type="button" class="btn-icon" onclick="MGI.openEvalEdit(\'' + esc(r.Eval_ID) + '\')" title="' + (released ? 'View inputs' : 'Edit inputs') +
        '" aria-label="' + (released ? 'View inputs for ' : 'Edit inputs for ') + esc(r.Full_Name) + '">' +
        '<span class="material-symbols-outlined text-[20px]">' + (released ? 'visibility' : 'edit_square') + '</span></button>' +
      '<button type="button" class="btn-icon" onclick="MGI.openPerformanceReport(\'' + esc(r.NIK) + '\', \'' + esc(r.roleKey) + '\', ' + year + ', \'modal\')"' +
        ' title="Open performance report" aria-label="Open performance report for ' + esc(r.Full_Name) + '">' +
        '<span class="material-symbols-outlined text-[20px]">description</span></button>' +
    '</td>' +
  '</tr>';
}

function renderEvalTable(all) {
  var d = S.evaluation;
  var size = pageSizeFor('eval', all.length);
  var pages = Math.max(1, Math.ceil(all.length / size));
  if (S.evalPage > pages) S.evalPage = pages;
  var start = (S.evalPage - 1) * size;
  var page = all.slice(start, start + size);
  var released = d.rules.released;

  $('eval-table-note').textContent = released
    ? 'FY' + d.year + ' is released, so inputs are read-only.'
    : 'Select Add or the edit icon to enter KBI, 360, Discipline, and SP. Scores update as soon as you save.';

  if (!all.length) {
    $('eval-tbody').innerHTML =
      '<tr><td colspan="' + EVAL_COLS + '" class="text-center py-space-2xl">' +
        '<span class="material-symbols-outlined text-[40px] text-text-muted">' + (d.rows.length ? 'search_off' : 'assignment_ind') + '</span>' +
        '<p class="text-body-md text-text-secondary mt-2">' +
          (d.rows.length ? 'No scorecards match these filters.'
                         : 'No scorecards for FY' + d.year + ' yet. They appear once employees are mapped to KPIs for this year.') + '</p>' +
        (d.rows.length ? '<button type="button" class="btn btn-secondary !py-1.5 mt-space-md" onclick="MGI.resetEvalFilters()">' +
          '<span class="material-symbols-outlined text-[18px]">filter_alt_off</span> Reset Filters</button>' : '') +
      '</td></tr>';
    $('eval-pagination').innerHTML = '';
    return;
  }

  $('eval-tbody').innerHTML = page.map(function (r) { return evalRowHtml(r, released, d.year); }).join('');
  renderPagination('eval-pagination', all.length, start, page.length, S.evalPage, size, 'eval');
}

function openPerformanceRules(year) {
  S.perfYear = parseInt(year, 10) || S.user.year;
  S.perfDraft = null;
  S.settingsTab = 'performance';
  go('settings');
}

function evalRowById(id) {
  if (!S.evaluation) return null;
  return S.evaluation.rows.filter(function (r) { return r.Eval_ID === id; })[0] || null;
}

function mergeEvalRow(row) {
  if (!S.evaluation || !row) return;
  S.evaluation.rows = S.evaluation.rows.map(function (r) { return r.Eval_ID === row.Eval_ID ? row : r; });
}

function evalWithInputs(r, inputs) {
  var res = perfCompute(r.avgKpi, inputs, S.evaluation.rules);
  var out = {};
  Object.keys(r).forEach(function (k) { out[k] = r[k]; });
  out.kbi = inputs.kbi;
  out.s360 = inputs.s360;
  out.discipline = inputs.discipline;
  out.score = res.score;
  out.grade = res.grade;
  out.complete = res.complete;
  out.missing = res.missing;
  out.parts = res.parts;
  return out;
}

function evalDraftOf(r) {
  var text = function (v) { return isNum(v) ? String(v) : ''; };
  return { kbi: text(r.kbi), s360: text(r.s360), discipline: text(r.discipline), spLevel: r.spLevel || '', remarks: r.remarks || '' };
}

function evalDirty() {
  var e = S.evalEdit;
  if (!e) return false;
  return ['kbi', 's360', 'discipline', 'spLevel', 'remarks'].some(function (k) {
    return String(e.draft[k]).trim() !== String(e.original[k]).trim();
  });
}

function evalDraftInputs() {
  var d = S.evalEdit.draft;
  var out = { values: {}, errors: {} };
  PERF_COMPONENTS.forEach(function (c) {
    if (!c.field) return;
    var res = perfScoreInput(d[c.key], c.label + ' Score');
    out.values[c.key] = res.value;
    if (res.error) out.errors[c.key] = res.error;
  });
  if (d.remarks.length > REMARKS_MAX) out.errors.remarks = 'Remarks SP can hold at most ' + REMARKS_MAX + ' characters.';
  return out;
}

function evalNextId() {
  var e = S.evalEdit;
  if (!e) return null;
  var list = evalRows();
  for (var n = 0; n < list.length; n++) {
    if (list[n].Eval_ID === e.id) return list[n + 1] ? list[n + 1].Eval_ID : null;
  }
  return null;
}
