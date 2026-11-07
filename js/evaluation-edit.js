'use strict';

function openEvalEdit(id, focusKey) {
  var r = evalRowById(id);
  if (!r) return;
  S.evalEdit = { id: id, original: evalDraftOf(r), draft: evalDraftOf(r), confirm: '', saving: false };
  renderEvalEdit(focusKey);
}

function renderEvalEdit(focusKey) {
  var e = S.evalEdit;
  var r = e ? evalRowById(e.id) : null;
  if (!r) return;
  var d = S.evaluation;
  var rules = d.rules;
  var locked = rules.released;
  var list = evalRows();
  var at = -1;
  list.forEach(function (x, n) { if (x.Eval_ID === r.Eval_ID) at = n; });

  var field = function (c) {
    var weight = Number(rules.weights[c.key]) || 0;
    return '<div class="rounded-xl border border-border-light bg-white p-3 flex flex-col gap-2">' +
      '<div class="flex items-center justify-between gap-2">' +
        '<label for="ev-' + c.key + '" class="text-label-md font-semibold text-text-primary">' + esc(c.label) + ' Score</label>' +
        '<span class="pill pill-neutral !text-[11px] !px-2">' + (weight ? num(weight, 2) + '% weight' : 'Not counted') + '</span>' +
      '</div>' +
      '<div class="relative">' +
        '<input id="ev-' + c.key + '" type="text" inputmode="decimal" autocomplete="off" class="field !pr-14 text-right tabular-nums font-semibold"' +
          ' placeholder="0 to 100" value="' + esc(e.draft[c.key]) + '"' + (locked ? ' disabled' : '') +
          ' oninput="MGI.onEvalInput()" onkeydown="if(event.key===\'Enter\'){event.preventDefault();MGI.submitEvalEdit();}">' +
        '<span class="absolute right-3 top-1/2 -translate-y-1/2 text-label-sm text-text-muted pointer-events-none">/ 100</span>' +
      '</div>' +
      '<p id="ev-' + c.key + '-note" class="text-label-xs text-text-muted"></p>' +
    '</div>';
  };

  var avgWeight = Number(rules.weights.kpi) || 0;
  var avgBox =
    '<div class="rounded-xl border border-border-light bg-surface-page p-3 flex flex-col gap-1">' +
      '<div class="flex items-center justify-between gap-2">' +
        '<span class="text-label-md font-semibold text-text-primary">Avg KPI Score</span>' +
        '<span class="pill pill-neutral !text-[11px] !px-2">' + (avgWeight ? num(avgWeight, 2) + '% weight' : 'Not counted') + '</span>' +
      '</div>' +
      '<p class="text-headline-md font-bold tabular-nums ' + (isNum(r.avgKpi) ? 'text-status-' + band(r.avgKpi).key + '-text' : 'text-text-muted') + '">' +
        (isNum(r.avgKpi) ? num(r.avgKpi, 2) : '-') + '</p>' +
      '<p class="text-label-xs text-text-muted">' + (isNum(r.avgKpi)
        ? 'Calculated automatically from ' + r.kpiMonths + ' counted ' + (r.kpiMonths === 1 ? 'month' : 'months') + ' of KPI submissions.'
        : 'No counted month has a KPI score yet, so the result stays Pending.') + '</p>' +
    '</div>';

  var sp =
    '<div class="rounded-xl border border-border-light bg-white p-3 flex flex-col gap-3">' +
      '<div>' +
        '<p class="text-label-md font-semibold text-text-primary">Warning letter (SP)</p>' +
        '<p class="text-label-xs text-text-muted">It does not change the score or grade. The employee and report viewers see the level and Remarks SP after release.</p>' +
      '</div>' +
      '<div id="ev-sp" class="seg self-start" role="radiogroup" aria-label="SP level">' + SP_OPTIONS.map(function (lv) {
        var on = e.draft.spLevel === lv;
        return '<button type="button" class="seg-btn' + (on ? ' is-active' : '') + '" data-sp="' + lv + '" role="radio" aria-checked="' + (on ? 'true' : 'false') + '"' +
          (locked ? ' disabled' : '') + ' onclick="MGI.setEvalSp(\'' + lv + '\')">' + (lv || 'None') + '</button>';
      }).join('') + '</div>' +
      '<div>' +
        '<label for="ev-remarks" class="form-label">Remarks SP</label>' +
        '<textarea id="ev-remarks" rows="3" maxlength="' + REMARKS_MAX + '" class="field" placeholder="Letter number, date, and reason"' +
          (locked ? ' disabled' : '') + ' oninput="MGI.onEvalInput()">' + esc(e.draft.remarks) + '</textarea>' +
        '<p class="text-label-xs text-text-muted text-right mt-1"><span id="ev-remarks-count">' + e.draft.remarks.length + '</span> / ' + REMARKS_MAX + '</p>' +
      '</div>' +
    '</div>';

  $('modal-host').innerHTML =
    '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closeEvalEdit()">' +
      '<div class="modal-panel modal-panel-wide !max-w-5xl" role="dialog" aria-modal="true" aria-labelledby="ev-title">' +
        '<div class="px-6 py-5 border-b border-border-light flex items-start gap-4">' +
          '<span class="emp-avatar !w-11 !h-11 !text-[13px]">' + esc(r.Initials || initials(r.Full_Name)) + '</span>' +
          '<div class="min-w-0 flex-1">' +
            '<h2 id="ev-title" class="text-title-lg text-text-primary truncate">' + esc(r.Full_Name) + '</h2>' +
            '<p class="text-body-sm text-text-muted">NIK ' + esc(r.NIK) + ' • ' + esc(r.Position) + ' / ' + esc(r.Department) + ' • FY' + d.year + '</p>' +
            (at > -1 ? '<p class="text-label-xs text-text-muted mt-0.5">Scorecard ' + (at + 1) + ' of ' + list.length + ' in the current list</p>' : '') +
          '</div>' +
          '<button type="button" class="btn-icon" onclick="MGI.closeEvalEdit()" title="Close" aria-label="Close"><span class="material-symbols-outlined">close</span></button>' +
        '</div>' +
        (locked
          ? '<div class="mx-6 mt-5 rounded-lg bg-status-success-subtle text-status-success-text text-body-sm px-3 py-2 flex items-center gap-2">' +
              '<span class="material-symbols-outlined text-[18px]">lock</span>FY' + d.year + ' results are released, so these inputs are read-only.</div>'
          : '') +
        '<div class="p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">' +
          '<div class="lg:col-span-3 flex flex-col gap-4">' +
            '<div>' +
              '<h3 class="text-title-md text-text-primary">Component scores</h3>' +
              '<p class="text-body-sm text-text-muted">Enter each processed result from 0 to 100. Leave a field empty until its result is ready. The score stays Pending until every counted component is filled.</p>' +
            '</div>' +
            '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' + avgBox +
              PERF_COMPONENTS.filter(function (c) { return !!c.field; }).map(field).join('') + '</div>' +
            sp +
          '</div>' +
          '<div class="lg:col-span-2 flex flex-col gap-2">' +
            '<h3 class="text-title-md text-text-primary">Live result</h3>' +
            '<div id="ev-result" aria-live="polite"></div>' +
          '</div>' +
        '</div>' +
        '<div id="ev-footer" class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex flex-wrap items-center justify-end gap-2"></div>' +
      '</div>' +
    '</div>';

  renderEvalResult();
  renderEvalFooter();

  if (locked) return;
  var target = focusKey && $('ev-' + focusKey) ? focusKey
    : ['kbi', 's360', 'discipline'].filter(function (k) { return !e.draft[k] && Number(rules.weights[k]) > 0; })[0] || 'kbi';
  var input = $('ev-' + target);
  if (input && input.focus) input.focus();
}

function renderEvalResult() {
  var e = S.evalEdit;
  var r = e ? evalRowById(e.id) : null;
  if (!r || !$('ev-result')) return;
  var rules = S.evaluation.rules;
  var parsed = evalDraftInputs();
  var res = perfCompute(r.avgKpi, parsed.values, rules);

  PERF_COMPONENTS.forEach(function (c) {
    if (!c.field) return;
    var note = $('ev-' + c.key + '-note');
    var input = $('ev-' + c.key);
    var err = parsed.errors[c.key];
    var part = res.parts.filter(function (p) { return p.key === c.key; })[0];
    if (input && input.classList) input.classList.toggle('is-invalid', !!err);
    if (!note) return;
    note.className = 'text-label-xs ' + (err ? 'text-status-danger-text' : 'text-text-muted');
    note.textContent = err ? err
      : !part.required ? 'Weight is 0% in FY' + rules.year + ', so it is not counted.'
      : isNum(part.points) ? 'Adds ' + num(part.points, 2) + ' points to the score.'
      : 'Leave empty until the result is ready.';
  });

  var rows = res.parts.filter(function (p) { return p.required; }).map(function (p) {
    return '<tr>' +
      '<td class="py-1.5 text-text-secondary">' + esc(p.label) + '</td>' +
      '<td class="py-1.5 text-right tabular-nums">' + (isNum(p.value) ? num(p.value, 2) : '<span class="text-status-warning-text">Missing</span>') + '</td>' +
      '<td class="py-1.5 text-right tabular-nums text-text-muted">' + num(p.weight, 2) + '%</td>' +
      '<td class="py-1.5 text-right tabular-nums font-semibold">' + (isNum(p.points) ? num(p.points, 2) : '-') + '</td>' +
    '</tr>';
  }).join('');

  $('ev-result').innerHTML =
    '<div class="rounded-xl border ' + (res.complete ? GRADE_TINTS[res.grade] : 'border-dashed border-border-medium bg-surface-page') + ' p-4 flex flex-col gap-4">' +
      '<div class="flex items-center justify-between gap-3">' +
        '<div class="min-w-0">' +
          '<p class="text-label-xs uppercase tracking-wider text-text-muted">Performance Score</p>' +
          '<p class="text-[34px] leading-10 font-bold tabular-nums ' + (res.complete ? 'text-text-primary' : 'text-text-muted') + '">' +
            (res.complete ? scoreText(res.score) : 'Pending') + '</p>' +
          (res.complete ? '<p class="text-label-xs text-text-muted">out of 100</p>'
            : Object.keys(parsed.errors).length ? '<p class="text-label-xs text-status-danger-text">Fix the highlighted fields</p>'
            : '<p class="text-label-xs text-status-warning-text">Needs ' + esc(res.missing.join(', ')) + '</p>') +
        '</div>' +
        '<div class="flex flex-col items-center gap-1 shrink-0">' +
          '<span class="text-label-xs uppercase tracking-wider text-text-muted">Grade</span>' + gradeBadge(res.grade, 'lg') +
        '</div>' +
      '</div>' +
      '<table class="w-full text-body-sm">' +
        '<thead><tr class="text-[11px] uppercase tracking-wider text-text-muted">' +
          '<th class="text-left font-semibold pb-1">Component</th><th class="text-right font-semibold pb-1">Score</th>' +
          '<th class="text-right font-semibold pb-1">Weight</th><th class="text-right font-semibold pb-1">Points</th></tr></thead>' +
        '<tbody class="divide-y divide-slate-100">' + rows + '</tbody>' +
        '<tfoot><tr class="border-t-2 border-slate-200"><td class="pt-2 font-semibold text-text-primary" colspan="3">Performance Score</td>' +
          '<td class="pt-2 text-right font-bold tabular-nums text-text-primary">' + (res.complete ? scoreText(res.score) : '-') + '</td></tr></tfoot>' +
      '</table>' +
      '<div class="flex flex-col gap-2">' + gradeScaleHtml(rules.grades, res.score, false) +
        '<div class="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px]">' + gradeLegendHtml(rules.grades) + '</div></div>' +
    '</div>';

  if ($('ev-remarks-count')) $('ev-remarks-count').textContent = e.draft.remarks.length;
}

function renderEvalFooter() {
  var e = S.evalEdit;
  var r = e ? evalRowById(e.id) : null;
  var host = $('ev-footer');
  if (!r || !host) return;
  var locked = S.evaluation.rules.released;
  var parsed = evalDraftInputs();
  var hasErrors = Object.keys(parsed.errors).length > 0;
  var dirty = evalDirty();
  var next = evalNextId();
  var meta = '<p class="text-label-xs text-text-muted">' + (r.updatedAt
    ? 'Last updated ' + esc(fmtDate(r.updatedAt)) + (r.updatedBy ? ' by ' + esc(r.updatedBy) : '')
    : 'No inputs saved yet') + '</p>';

  if (locked) {
    host.innerHTML = '<div class="mr-auto">' + meta + '</div>' +
      '<button type="button" class="btn btn-secondary" onclick="MGI.closeEvalEdit(true)">Close</button>';
    return;
  }
  if (e.confirm === 'discard') {
    host.innerHTML =
      '<p class="mr-auto text-body-sm font-medium text-status-warning-text flex items-center gap-1.5"><span class="material-symbols-outlined text-[18px]">warning</span>Discard the changes you typed?</p>' +
      '<button type="button" class="btn btn-secondary" onclick="MGI.cancelEvalConfirm()">Keep Editing</button>' +
      '<button type="button" class="btn btn-danger" onclick="MGI.closeEvalEdit(true)">Discard</button>';
    return;
  }
  if (e.confirm === 'clear') {
    host.innerHTML =
      '<p class="mr-auto text-body-sm font-medium text-status-danger-text flex items-center gap-1.5"><span class="material-symbols-outlined text-[18px]">delete</span>Clear KBI, 360, Discipline, and SP for this scorecard?</p>' +
      '<button type="button" class="btn btn-secondary" onclick="MGI.cancelEvalConfirm()">Cancel</button>' +
      '<button id="ev-clear-confirm" type="button" class="btn btn-danger" onclick="MGI.confirmEvalClear()">Clear Inputs</button>';
    return;
  }

  host.innerHTML =
    '<div class="mr-auto flex flex-wrap items-center gap-3">' + meta +
      (r.updatedAt ? '<button type="button" class="text-label-sm font-semibold text-status-danger-text rounded-md px-1.5 py-0.5 transition-all duration-150 hover:bg-status-danger-subtle" onclick="MGI.askEvalClear()">Clear inputs</button>' : '') +
    '</div>' +
    '<button type="button" class="btn btn-secondary" onclick="MGI.closeEvalEdit()">Cancel</button>' +
    '<button id="ev-save" type="button" class="btn ' + (next ? 'btn-secondary' : 'btn-primary') + '" onclick="MGI.saveEvalEdit(false)"' +
      (e.saving || hasErrors || !dirty ? ' disabled' : '') + '><span class="material-symbols-outlined text-[18px]">save</span> Save</button>' +
    (next
      ? '<button id="ev-save-next" type="button" class="btn btn-primary" onclick="MGI.saveEvalEdit(true)"' + (e.saving || hasErrors ? ' disabled' : '') +
          ' title="' + (dirty ? 'Save and open the next scorecard' : 'Open the next scorecard') + '">' + (dirty ? 'Save &amp; Next' : 'Next') +
          ' <span class="material-symbols-outlined text-[18px]">arrow_forward</span></button>'
      : '');
}

function onEvalInput() {
  var e = S.evalEdit;
  if (!e) return;
  PERF_COMPONENTS.forEach(function (c) {
    if (c.field && $('ev-' + c.key)) e.draft[c.key] = $('ev-' + c.key).value;
  });
  if ($('ev-remarks')) e.draft.remarks = $('ev-remarks').value;
  e.confirm = '';
  renderEvalResult();
  renderEvalFooter();
}

function setEvalSp(level) {
  var e = S.evalEdit;
  if (!e || S.evaluation.rules.released) return;
  e.draft.spLevel = level;
  e.confirm = '';
  document.querySelectorAll('#ev-sp [data-sp]').forEach(function (b) {
    var on = b.dataset.sp === level;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  renderEvalFooter();
}

function submitEvalEdit() {
  saveEvalEdit(!!evalNextId());
}

function saveEvalEdit(goNext) {
  var e = S.evalEdit;
  var r = e ? evalRowById(e.id) : null;
  if (!r || e.saving || S.evaluation.rules.released) return;
  var next = goNext ? evalNextId() : null;
  var parsed = evalDraftInputs();
  var firstError = Object.keys(parsed.errors)[0];
  if (firstError) {
    toast(parsed.errors[firstError], 'error');
    var bad = $('ev-' + firstError);
    if (bad && bad.focus) bad.focus();
    return;
  }
  if (!evalDirty()) {
    if (next) openEvalEdit(next);
    else closeEvalEdit(true);
    return;
  }

  var year = S.evaluation.year;
  var entry = {
    NIK: r.NIK, Position: r.Position, Department: r.Department,
    KBI_Score: e.draft.kbi, Score_360: e.draft.s360, Discipline_Score: e.draft.discipline,
    SP_Level: e.draft.spLevel, Remarks_SP: e.draft.remarks
  };
  e.saving = true;
  renderEvalFooter();
  var btn = $(next ? 'ev-save-next' : 'ev-save');
  var restore = btn ? busy(btn, 'Saving') : function () {};

  api('savePerformanceInput', year, entry)
    .then(function (res) {
      var rec = res.record || null;
      var updated = evalWithInputs(r, { kbi: rec ? rec.kbi : null, s360: rec ? rec.s360 : null, discipline: rec ? rec.discipline : null });
      updated.spLevel = rec ? rec.spLevel : '';
      updated.remarks = rec ? rec.remarks : '';
      updated.updatedAt = rec ? rec.updatedAt : '';
      updated.updatedBy = rec ? rec.updatedBy : '';
      mergeEvalRow(updated);
      delete S.reports[r.NIK + '|' + year];
      toast(res.message + (res.changed && updated.complete
        ? ' Performance Score ' + scoreText(updated.score) + ', Grade ' + updated.grade + '.'
        : res.changed ? ' Still needs ' + updated.missing.join(', ') + '.' : ''), 'success');
      if (S.evaluation && S.evaluation.year === year) renderEvalBody();
      if (S.evalEdit !== e) return;
      if (next && evalRowById(next)) openEvalEdit(next);
      else closeEvalEdit(true);
    })
    .catch(function (err) {
      e.saving = false;
      restore();
      renderEvalFooter();
      toast(err.message, 'error');
    });
}

function askEvalClear() {
  if (!S.evalEdit) return;
  S.evalEdit.confirm = 'clear';
  renderEvalFooter();
}

function cancelEvalConfirm() {
  if (!S.evalEdit) return;
  S.evalEdit.confirm = '';
  renderEvalFooter();
}

function confirmEvalClear() {
  var e = S.evalEdit;
  var r = e ? evalRowById(e.id) : null;
  if (!r) return;
  var year = S.evaluation.year;
  var restore = busy($('ev-clear-confirm'), 'Clearing');

  api('clearPerformanceInput', year, r.NIK, r.Position, r.Department)
    .then(function (res) {
      var cleared = evalWithInputs(r, { kbi: null, s360: null, discipline: null });
      cleared.spLevel = '';
      cleared.remarks = '';
      cleared.updatedAt = '';
      cleared.updatedBy = '';
      mergeEvalRow(cleared);
      delete S.reports[r.NIK + '|' + year];
      toast(res.message, 'success');
      closeEvalEdit(true);
      if (S.evaluation && S.evaluation.year === year) renderEvalBody();
    })
    .catch(function (err) {
      restore();
      toast(err.message, 'error');
    });
}

function closeEvalEdit(force) {
  var e = S.evalEdit;
  if (e && force !== true && !S.evaluation.rules.released && evalDirty()) {
    e.confirm = 'discard';
    renderEvalFooter();
    return;
  }
  S.evalEdit = null;
  $('modal-host').innerHTML = '';
}

function exportEvalCsv() {
  var d = S.evaluation;
  var rows = evalRows();
  if (!d || !rows.length) {
    toast('No data to export.', 'warning');
    return;
  }
  var fixed = function (v) { return isNum(v) ? Number(v).toFixed(2) : ''; };
  var lines = [csvLine(['Year', 'NIK', 'Full Name', 'Division', 'Department', 'Position', 'KPI Months', 'Avg KPI',
    'KBI Score', '360 Score', 'Discipline Score', 'Performance Score', 'Performance Grade', 'Status', 'SP Level', 'Remarks SP'])];
  rows.forEach(function (r) {
    lines.push(csvLine([
      d.year, r.NIK, r.Full_Name, r.Division, r.Department, r.Position, r.kpiMonths, fixed(r.avgKpi),
      fixed(r.kbi), fixed(r.s360), fixed(r.discipline), fixed(r.score), r.grade || '',
      r.complete ? 'Complete' : 'Pending: ' + r.missing.join(', '), r.spLevel || '', r.remarks || ''
    ]));
  });
  downloadCsv(lines, 'Performance_Evaluation_FY' + d.year + '_' + fileStamp() + '.csv');
  toast('CSV exported (' + rows.length + ' scorecards).', 'success');
}

function evalHasInputs() {
  return !!(S.evaluation && S.evaluation.rows.some(function (r) { return !!r.updatedAt; }));
}

function renderEvalUploadCard() {
  var d = S.evaluation;
  if (!d || !$('eval-upload')) return;
  var released = d.rules.released;
  var open = S.evalUploadOpen === null || S.evalUploadOpen === undefined ? !evalHasInputs() && !released : !!S.evalUploadOpen;
  var count = evalRows().length;

  $('eval-upload-body').classList.toggle('hidden', !open);
  $('eval-upload-chevron').textContent = open ? 'expand_less' : 'expand_more';
  $('eval-upload-toggle').setAttribute('aria-expanded', open ? 'true' : 'false');
  $('eval-upload-sub').textContent = released
    ? 'FY' + d.year + ' is released, so uploads are locked until the release is withdrawn.'
    : 'Download the FY' + d.year + ' template, fill KBI, 360, Discipline, and SP, then upload it back.';
  $('ei-template-note').textContent = count
    ? 'Pre-filled with the ' + count + (count === 1 ? ' scorecard' : ' scorecards') + ' in your current filter and their current values.'
    : 'No scorecards match the current filter. Reset the filters to include everyone.';
  $('ei-xlsx').disabled = !count;
  $('ei-csv').disabled = !count;
  $('ei-drop').classList.toggle('pointer-events-none', released);
  $('ei-drop').classList.toggle('opacity-50', released);
  $('eval-upload-locked').classList.toggle('hidden', !released);
  renderEvalUpload();
}

function toggleEvalUpload(force) {
  var body = $('eval-upload-body');
  if (!body) return;
  S.evalUploadOpen = force === undefined ? body.classList.contains('hidden') : !!force;
  renderEvalUploadCard();
}

function openEvalUpload() {
  toggleEvalUpload(true);
  var card = $('eval-upload');
  if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearEvalUpload() {
  S.evalUpload = null;
  renderEvalUpload();
}

function evalTemplateRows() {
  var d = S.evaluation;
  return evalRows().map(function (r) {
    return [d.year, String(r.NIK), r.Full_Name, r.Position, r.Department,
      isNum(r.avgKpi) ? Number(Number(r.avgKpi).toFixed(2)) : '',
      isNum(r.kbi) ? r.kbi : '', isNum(r.s360) ? r.s360 : '', isNum(r.discipline) ? r.discipline : '',
      r.spLevel || '', r.remarks || ''];
  });
}

function evalGuideRows() {
  var d = S.evaluation;
  var rules = d.rules;
  return [
    ['How to fill the FY' + d.year + ' score template'],
    ['Generated on', fmtStamp() + (S.user && S.user.Full_Name ? ' by ' + S.user.Full_Name : '')],
    [],
    ['Column', 'What to enter'],
    ['Year', 'Keep as is. Rows from another year are rejected.'],
    ['NIK, Position, Department', 'Keep as is. Together they identify the scorecard.'],
    ['Full Name, Avg KPI', 'Reference only. Changes in these columns are ignored.'],
    ['KBI Score, 360 Score, Discipline Score', 'A number from 0 to 100. Decimals are fine. Leave the cell blank to keep the current value.'],
    ['SP Level', 'None, SP1, SP2, or SP3. Leave blank to keep the current value. Write None to remove an SP.'],
    ['Remarks SP', 'Free text up to ' + REMARKS_MAX + ' characters. The employee and report viewers see it after release.'],
    [],
    ['FY' + d.year + ' rules'],
    ['Performance Score', perfFormulaText(rules)]
  ].concat(gradeRanges(rules.grades).map(function (r) { return ['Grade ' + r.grade, r.label]; }));
}

function downloadXlsx(fileName, sheets, fallback) {
  return loadSheetJs()
    .then(function (XLSX) {
      var book = XLSX.utils.book_new();
      sheets.forEach(function (sh) {
        var ws = XLSX.utils.aoa_to_sheet(sh.rows);
        if (sh.cols) ws['!cols'] = sh.cols.map(function (w) { return { wch: w }; });
        XLSX.utils.book_append_sheet(book, ws, sh.name);
      });
      XLSX.writeFile(book, fileName);
      return true;
    })
    .catch(function () {
      toast('The Excel file could not be prepared. The CSV template was downloaded instead.', 'warning');
      if (fallback) fallback();
      return false;
    });
}

function downloadEvalTemplate(kind) {
  var d = S.evaluation;
  var rows = d ? evalTemplateRows() : [];
  if (!d || !rows.length) {
    toast('No scorecards in the current filter.', 'warning');
    return;
  }
  var base = 'Performance_Scores_FY' + d.year + '_' + fileStamp();
  var csv = function () {
    downloadCsv([csvLine(EVAL_TEMPLATE_HEADERS)].concat(rows.map(csvLine)), base + '.csv');
  };
  if (kind === 'csv') {
    csv();
    toast('CSV template downloaded with ' + rows.length + ' scorecards.', 'success');
    return;
  }
  downloadXlsx(base + '.xlsx', [
    { name: 'Scores', rows: [EVAL_TEMPLATE_HEADERS].concat(rows), cols: [8, 14, 28, 22, 24, 10, 11, 11, 16, 10, 40] },
    { name: 'How to fill', rows: evalGuideRows(), cols: [38, 90] }
  ], csv).then(function (ok) {
    if (ok) toast('Excel template downloaded with ' + rows.length + ' scorecards.', 'success');
  });
}

function onEvalUploadFile(file) {
  if (!S.evaluation || S.evaluation.rules.released) {
    toast('This year is released. Withdraw the release to upload new scores.', 'warning');
    return;
  }
  var problem = uploadFileProblem(file);
  if (problem) {
    toast(problem, 'warning');
    return;
  }
  var name = String(file.name || '');
  S.evalUpload = { fileName: name, status: 'reading', rows: [], errors: [], preview: null, result: null };
  renderEvalUpload();

  readUploadFile(file, function (matrix) {
    var mapped = mapUploadRows(matrix, EVAL_UPLOAD_HEADERS, EVAL_UPLOAD_KEYS);
    var errors = mapped.errors;
    var preview = null;
    if (!errors.length) {
      var check = previewEvalUpload(mapped.rows);
      errors = check.errors;
      preview = check.preview;
    }
    S.evalUpload = { fileName: name, status: errors.length ? 'invalid' : 'ready', rows: mapped.rows, errors: errors, preview: preview, result: null };
    renderEvalUpload();
  }, function (message) {
    S.evalUpload = { fileName: name, status: 'invalid', rows: [], errors: [{ row: 0, column: '', value: '', message: message }], preview: null, result: null };
    renderEvalUpload();
  });
}

function previewEvalUpload(rows) {
  var d = S.evaluation;
  var index = {};
  d.rows.forEach(function (r) { index[evalKey(r.NIK, r.Position, r.Department)] = r; });
  var errors = [];
  var seen = {};
  var change = 0;
  var same = 0;
  var blank = 0;
  var diffs = [];

  rows.forEach(function (u) {
    var fail = function (column, value, message) {
      errors.push({ row: u._row, column: column, value: value, message: message });
    };
    if (u.Year && parseInt(u.Year, 10) !== d.year) {
      fail('Year', u.Year, 'This upload is for FY' + d.year + '. Remove rows from other years or switch the year first.');
      return;
    }
    if (!u.NIK) {
      fail('NIK', '', 'NIK is required.');
      return;
    }
    var card = index[evalKey(u.NIK, u.Position, u.Department)];
    if (!card) {
      fail('NIK', u.NIK, 'No FY' + d.year + ' scorecard matches NIK ' + u.NIK + ' as ' + u.Position + ' / ' + u.Department + '.');
      return;
    }
    if (seen[card.Eval_ID]) {
      fail('NIK', u.NIK, 'This scorecard is already listed on row ' + seen[card.Eval_ID] + '.');
      return;
    }
    seen[card.Eval_ID] = u._row;

    var changes = [];
    var filled = false;
    var bad = false;
    PERF_COMPONENTS.forEach(function (c) {
      if (!c.field || u[c.field] === '') return;
      filled = true;
      var res = perfScoreInput(u[c.field], c.label + ' Score');
      if (res.error) {
        fail(c.label + ' Score', u[c.field], res.error);
        bad = true;
      } else if (res.value !== card[c.key]) {
        changes.push(c.label + ' from ' + (isNum(card[c.key]) ? num(card[c.key], 2) : 'empty') + ' to ' + num(res.value, 2));
      }
    });
    if (u.SP_Level !== '') {
      filled = true;
      var level = perfSpLevel(u.SP_Level);
      if (level === null) {
        fail('SP Level', u.SP_Level, 'SP Level must be None, SP1, SP2, or SP3.');
        bad = true;
      } else if (level !== (card.spLevel || '')) {
        changes.push('SP from ' + (card.spLevel || 'None') + ' to ' + (level || 'None'));
      }
    }
    if (u.Remarks_SP !== '') {
      filled = true;
      if (u.Remarks_SP.length > REMARKS_MAX) {
        fail('Remarks SP', u.Remarks_SP.substring(0, 40), 'Remarks SP can hold at most ' + REMARKS_MAX + ' characters.');
        bad = true;
      } else if (u.Remarks_SP !== (card.remarks || '')) {
        changes.push(card.remarks ? 'Remarks updated' : 'Remarks added');
      }
    }
    if (bad) return;
    if (changes.length) {
      change++;
      diffs.push({ name: card.Full_Name, role: card.Position + ' / ' + card.Department, changes: changes });
    } else if (filled) {
      same++;
    } else {
      blank++;
    }
  });

  return { errors: errors, preview: { total: rows.length, change: change, same: same, blank: blank, diffs: diffs } };
}

function evalDiffHtml(p) {
  var shown = p.diffs.slice(0, 8);
  return '<div class="rounded-xl border border-border-light overflow-hidden bg-white">' +
    '<div class="px-3 py-2 bg-surface-page border-b border-border-light flex flex-wrap items-center justify-between gap-1">' +
      '<span class="text-label-sm font-semibold text-text-primary">Review before upload</span>' +
      '<span class="text-label-xs text-text-muted">Only these ' + p.change + (p.change === 1 ? ' scorecard changes' : ' scorecards change') + '. Every other row stays as it is.</span>' +
    '</div>' +
    '<ul class="divide-y divide-slate-100">' + shown.map(function (d) {
      return '<li class="px-3 py-2 flex flex-col gap-1 min-w-0">' +
        '<span class="text-body-sm font-semibold text-text-primary truncate">' + esc(d.name) +
          ' <span class="font-normal text-text-muted">' + esc(d.role) + '</span></span>' +
        '<span class="flex flex-wrap gap-1">' + d.changes.map(function (c) {
          return '<span class="pill pill-neutral !text-[11px] !px-2 !py-0.5">' + esc(c) + '</span>';
        }).join('') + '</span>' +
      '</li>';
    }).join('') + '</ul>' +
    (p.diffs.length > shown.length
      ? '<p class="px-3 py-2 text-label-xs text-text-muted border-t border-border-light">And ' + (p.diffs.length - shown.length) + ' more.</p>'
      : '') +
  '</div>';
}

function renderEvalUpload() {
  var summary = $('ei-summary');
  var result = $('ei-result');
  var submit = $('ei-submit');
  if (!summary || !result || !submit) return;

  var up = S.evalUpload;
  if (!up) {
    summary.innerHTML = '<p class="text-sm text-slate-500 flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px] text-slate-400">draft</span>No file selected.</p>';
    result.innerHTML = '';
    submit.disabled = true;
    submit.classList.remove('hidden');
    if ($('ei-clear')) $('ei-clear').classList.add('hidden');
    return;
  }

  var pills = '<span class="pill pill-neutral"><span class="material-symbols-outlined text-[14px]">description</span>' + esc(up.fileName) + '</span>';
  if (up.status === 'reading') {
    pills += '<span class="text-body-sm text-text-muted">Reading file</span>';
  } else if (up.preview && !up.errors.length) {
    pills += '<span class="pill pill-info">' + up.preview.total + ' rows</span>' +
             '<span class="pill ' + (up.preview.change ? 'pill-warning' : 'pill-neutral') + '">' + up.preview.change + ' will change</span>' +
             '<span class="pill pill-neutral" title="Rows whose values match the current ones">' + up.preview.same + ' unchanged</span>' +
             (up.preview.blank ? '<span class="pill pill-neutral" title="Rows with every score and SP cell empty">' + up.preview.blank + ' left blank</span>' : '');
  } else if (up.rows.length) {
    pills += '<span class="pill pill-info">' + up.rows.length + ' rows</span>';
  }
  summary.innerHTML = '<div class="flex items-center gap-space-sm flex-wrap">' + pills + '</div>';

  submit.disabled = up.status !== 'ready' || !up.preview || !up.preview.change;
  submit.classList.toggle('hidden', up.status === 'uploaded');
  if ($('ei-clear')) $('ei-clear').classList.remove('hidden');

  if (up.status === 'uploaded' && up.result) {
    result.innerHTML =
      '<div class="rounded-xl border border-border-light bg-status-success-subtle p-space-md">' +
        '<p class="text-body-sm font-semibold text-status-success-text flex items-center gap-1.5">' +
          '<span class="material-symbols-outlined text-[18px]">task_alt</span>' + esc(up.result.message) + '</p>' +
      '</div>';
    return;
  }
  if (up.errors.length) {
    result.innerHTML = uploadErrorsHtml(up.errors);
    return;
  }
  result.innerHTML = up.status === 'ready' && up.preview
    ? (up.preview.change
        ? evalDiffHtml(up.preview)
        : '<p class="text-body-sm text-text-muted flex items-center gap-1.5"><span class="material-symbols-outlined text-[18px]">info</span>Every row matches the current values, so there is nothing to import.</p>')
    : '';
}

function submitEvalUpload() {
  var up = S.evalUpload;
  var d = S.evaluation;
  if (!up || up.status !== 'ready' || !d) return;

  up.status = 'uploading';
  var year = d.year;
  var restore = busy($('ei-submit'), 'Importing');

  api('uploadPerformanceInputs', year, up.rows)
    .then(function (res) {
      restore();
      if (!res || !res.ok) {
        up.status = 'invalid';
        up.errors = (res && res.errors) || [];
        renderEvalUpload();
        toast('Import rejected. Fix the listed rows and try again.', 'error');
        return;
      }
      up.status = 'uploaded';
      up.errors = [];
      up.result = res;
      renderEvalUpload();
      toast(res.message, 'success');
      S.reports = {};
      if (S.evaluation && S.evaluation.year === year) loadEvaluation();
    })
    .catch(function (err) {
      restore();
      up.status = 'ready';
      renderEvalUpload();
      toast(err.message, 'error');
    });
}

function openEvalRelease() {
  var d = S.evaluation;
  if (!d) return;
  var rules = d.rules;
  var releasing = !rules.released;
  var st = evalStats(d.rows);
  var pending = st.pending - st.noKpi;
  var tile = function (label, value, tone) {
    return '<div class="rounded-lg border border-border-light bg-surface-page px-3 py-2">' +
      '<p class="text-label-xs text-text-muted">' + label + '</p>' +
      '<p class="text-title-lg font-bold tabular-nums ' + tone + '">' + value + '</p></div>';
  };

  $('modal-host').innerHTML =
    '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closeEvalRelease()">' +
      '<div class="modal-panel !max-w-lg" role="dialog" aria-modal="true" aria-labelledby="er-title">' +
        '<div class="px-6 pt-6 pb-5 flex items-start gap-4">' +
          '<span class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 ' +
            (releasing ? 'bg-brand-50 text-primary-container' : 'bg-status-warning-subtle text-status-warning') + '">' +
            '<span class="material-symbols-outlined text-[22px]">' + (releasing ? 'send' : 'undo') + '</span></span>' +
          '<div class="min-w-0">' +
            '<h2 id="er-title" class="text-title-lg text-text-primary">' +
              (releasing ? 'Release FY' + d.year + ' results to employees?' : 'Withdraw the FY' + d.year + ' release?') + '</h2>' +
            '<p class="text-body-sm text-text-secondary mt-1">' + (releasing
              ? 'Each employee will see their Performance Score and Grade in the Annual Performance tab of My KPIs. Their SP level and Remarks SP are shown there too. FY' + d.year + ' inputs and rules are locked while released.'
              : 'Employees stop seeing their FY' + d.year + ' Performance Score and Grade, and you can edit inputs and rules again.') + '</p>' +
          '</div>' +
        '</div>' +
        (releasing
          ? '<div class="px-6 pb-5 flex flex-col gap-3">' +
              '<div class="grid grid-cols-3 gap-2">' +
                tile('Complete', st.complete, 'text-status-success-text') +
                tile('Pending', pending, pending ? 'text-status-warning-text' : 'text-text-primary') +
                tile('No KPI score', st.noKpi, 'text-text-primary') +
              '</div>' +
              (st.pending
                ? '<p class="text-body-sm text-status-warning-text bg-status-warning-subtle rounded-lg px-3 py-2">' + st.pending +
                    (st.pending === 1 ? ' scorecard is' : ' scorecards are') + ' not complete. Those employees will see Pending until you withdraw, fill the missing inputs, and release again.</p>'
                : '') +
              '<div class="rounded-lg border border-border-light px-3 py-2.5">' +
                '<p class="text-label-xs uppercase tracking-wider text-text-muted mb-1.5">Rules that will be locked</p>' +
                '<div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm">' + perfFormulaHtml(rules) + '</div>' +
                '<div class="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 text-label-xs">' + gradeLegendHtml(rules.grades) + '</div>' +
              '</div>' +
            '</div>'
          : '') +
        '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex items-center justify-end gap-space-sm">' +
          '<button type="button" class="btn btn-secondary" onclick="MGI.closeEvalRelease()">Cancel</button>' +
          '<button id="er-confirm" type="button" class="btn btn-primary" onclick="MGI.confirmEvalRelease()">' +
            '<span class="material-symbols-outlined text-[18px]">' + (releasing ? 'send' : 'undo') + '</span> ' +
            (releasing ? 'Release to Employees' : 'Withdraw Release') + '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function closeEvalRelease() {
  $('modal-host').innerHTML = '';
}

function confirmEvalRelease() {
  var d = S.evaluation;
  if (!d) return;
  var year = d.year;
  var releasing = !d.rules.released;
  var restore = busy($('er-confirm'), releasing ? 'Releasing' : 'Withdrawing');

  api('setPerformanceRelease', year, releasing)
    .then(function (res) {
      restore();
      if (S.evaluation && S.evaluation.year === year) S.evaluation.rules = res.rules;
      S.reports = {};
      S.perfSettings = null;
      if (S.perfRules && S.perfRules.year === year) S.perfRules = null;
      closeEvalRelease();
      toast(res.message, 'success');
      renderEvaluation();
    })
    .catch(function (err) {
      restore();
      toast(err.message, 'error');
    });
}
