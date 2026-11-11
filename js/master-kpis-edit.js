'use strict';

function openMasterModal(kpiId) {
  if (!S.categories) {
    withCategories(function () { openMasterModal(kpiId); });
    return;
  }

  var k = null;
  if (kpiId) {
    S.available.concat(S.assigned, S.masterList).forEach(function (x) { if (x.KPI_ID === kpiId) k = x; });
  }
  S.editingKpi = k ? k.KPI_ID : null;

  var emp = S.mapping ? S.mapping.employee : null;
  var v = k || {
    Division: emp ? emp.Division : '', Position: emp ? emp.Position : '',
    Department: emp ? emp.Department : '', KPI_Name: '', Metrics: '',
    Target: '', Unit: '', WeightPercent: '', Duration: 'Monthly',
    Label: 'Increase', Multiplier: '', Target_Is_B: false, Year: S.user.year
  };

  var field = function (id, label, value, type, extra) {
    return '<div>' +
      '<label class="form-label">' + esc(label) + '</label>' +
      '<input id="mk-' + id + '" type="' + (type || 'text') + '" class="field" value="' + esc(value) + '" ' + (extra || '') + '>' +
    '</div>';
  };

  var area = function (id, label, value) {
    return '<div>' +
      '<label class="form-label">' + esc(label) + '</label>' +
      '<textarea id="mk-' + id + '" rows="1" class="field field-grow"' +
        ' oninput="MGI.autoGrow(this)" onkeydown="MGI.blockEnter(event)">' + esc(value) + '</textarea>' +
    '</div>';
  };

  var select = function (id, label, value, options) {
    var list = options.slice();
    if (value && list.indexOf(value) === -1) list.unshift(value);
    return '<div>' +
      '<label class="form-label">' + esc(label) + '</label>' +
      '<select id="mk-' + id + '" class="field" onchange="MGI.renderMasterCapacity()">' +
        '<option value="">Select ' + esc(label.replace(' *', '')) + '</option>' +
        list.map(function (o) {
          return '<option value="' + esc(o) + '"' + (o === value ? ' selected' : '') + '>' + esc(o) + '</option>';
        }).join('') +
      '</select></div>';
  };

  $('modal-host').innerHTML =
    '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closeMasterModal()">' +
      '<div class="modal-panel">' +
        '<div class="px-6 py-4 border-b border-border-light flex items-start justify-between gap-4">' +
          '<div class="min-w-0">' +
            '<h2 class="text-title-lg text-text-primary">' + (k ? 'Edit Master KPI' : 'Add Master KPI') + '</h2>' +
            '<p class="text-body-sm text-text-muted mt-0.5">' +
              (k ? 'KPI_ID <strong>' + esc(k.KPI_ID) + '</strong> is permanent, even if you change its Year.'
                 : 'KPI_ID will be generated automatically in the format <strong>KPI-' +
                   String(S.user.year).slice(-2) + '-XXXX</strong>.') +
            '</p>' +
          '</div>' +
          '<button class="btn-icon -mr-2" onclick="MGI.closeMasterModal()" title="Close" aria-label="Close">' +
            '<span class="material-symbols-outlined">close</span></button>' +
        '</div>' +

        '<div class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-space-md">' +
          '<div class="sm:col-span-2">' + area('name', 'KPI Name *', v.KPI_Name) + '</div>' +
          '<div class="sm:col-span-2">' + area('metrics', 'Metrics / Measurement', v.Metrics) + '</div>' +
          '<div>' +
            '<label class="form-label">Year *</label>' +
            '<select id="mk-year" class="field" onchange="MGI.renderMasterCapacity()">' + masterYearOptions(v.Year || S.user.year) + '</select>' +
          '</div>' +
          select('division', 'Division *', v.Division, categoryValues('Division')) +
          select('position', 'Position *', v.Position, categoryValues('Position')) +
          select('department', 'Department *', v.Department, categoryValues('Department')) +
          field('unit', 'Unit (Days, %, Hours)', v.Unit) +
          field('target', 'Target *', v.Target, 'number', 'step="any"') +
          '<div>' + field('weight', 'Weight (%) *', v.WeightPercent, 'number', 'step="any" min="0" max="100" oninput="MGI.renderMasterCapacity()"') +
            '<p id="mk-capacity" class="text-label-xs text-text-muted mt-1"></p></div>' +
          select('label', 'Label *', v.Label, LABEL_OPTIONS) +
          select('duration', 'Duration *', v.Duration, DURATION_OPTIONS) +
          field('multiplier', 'Multiplier (toleransi tier) *', v.Multiplier, 'number', 'step="any" min="0"') +
          '<div class="flex items-end">' +
            '<label class="flex items-center gap-space-sm cursor-pointer pb-2">' +
              '<input id="mk-targetisb" type="checkbox" class="w-4 h-4 rounded border-border-medium text-primary-container"' +
                (v.Target_Is_B ? ' checked' : '') + '>' +
              '<span class="text-body-sm text-text-secondary">Target is B' +
                '<span class="block text-label-xs text-text-muted">Score 1.0 only when the target is exceeded</span></span>' +
            '</label>' +
          '</div>' +
        '</div>' +

        '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex items-center justify-end gap-space-sm">' +
          '<button class="btn btn-secondary" onclick="MGI.closeMasterModal()">Cancel</button>' +
          '<button id="mk-save" class="btn btn-primary" onclick="MGI.saveMasterKpi()">' +
            '<span class="material-symbols-outlined text-[18px]">save</span> Save KPI</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  autoGrow($('mk-name'));
  autoGrow($('mk-metrics'));
  renderMasterCapacity();
}

function closeMasterModal() {
  $('modal-host').innerHTML = '';
  S.editingKpi = null;
}

function saveMasterKpi() {
  var payload = {
    KPI_Name:    $('mk-name').value,
    Metrics:     $('mk-metrics').value,
    Year:        $('mk-year').value,
    Division:    $('mk-division').value,
    Position:    $('mk-position').value,
    Department:  $('mk-department').value,
    Unit:        $('mk-unit').value,
    Target:      $('mk-target').value,
    Weight:      $('mk-weight').value,
    Label:       $('mk-label').value,
    Duration:    $('mk-duration').value,
    Multiplier:  $('mk-multiplier').value,
    Target_Is_B: $('mk-targetisb').checked
  };

  var restore = busy($('mk-save'), 'Saving');
  var call = S.editingKpi
    ? api('updateMasterKPI', S.editingKpi, payload)
    : api('createMasterKPI', payload);

  call.then(function (res) {
      restore();
      closeMasterModal();
      toast('Master KPI ' + res.KPI_ID + ' saved.', 'success');
      if (S.view === 'master-kpis') loadMasterCatalog();
      if (S.view === 'mapping' && S.mapping) onEmployeeSelect(null, currentIds());
    })
    .catch(function (err) {
      restore();
      toast(err.message, 'error');
    });
}

function masterGroupUsage(year, position, department, skipId) {
  var used = 0;
  var count = 0;
  (S.masterList || []).forEach(function (k) {
    if (!k.IsActive || String(k.Year) !== String(year)) return;
    if (!eqiJs(k.Position, position) || !eqiJs(k.Department, department)) return;
    if (skipId && k.KPI_ID === skipId) return;
    count++;
    used += kpiWeightPct(k);
  });
  return { count: count, used: Math.round(used * 10) / 10 };
}

function renderMasterCapacity() {
  var host = $('mk-capacity');
  var save = $('mk-save');
  if (!host) return;

  var year = $('mk-year').value;
  var position = $('mk-position').value;
  var department = $('mk-department').value;
  var weight = parseFloat($('mk-weight').value);

  if (!(S.masterList || []).length || !year || !position || !department) {
    host.textContent = '';
    host.className = 'text-label-xs text-text-muted mt-1';
    if (save) save.disabled = false;
    return;
  }

  var usage = masterGroupUsage(year, position, department, S.editingKpi);
  var original = S.editingKpi
    ? (S.masterList.filter(function (k) { return k.KPI_ID === S.editingKpi; })[0] || null)
    : null;
  var sameGroup = !!original && original.IsActive && String(original.Year) === String(year) &&
    eqiJs(original.Position, position) && eqiJs(original.Department, department);

  var label = position + ' / ' + department + ' (' + year + ')';
  var previous = Math.round((usage.used + (sameGroup ? Number(original.WeightPercent) || 0 : 0)) * 10) / 10;
  var next = Math.round((usage.used + (isNum(weight) ? weight : 0)) * 10) / 10;
  var over = next > 100.05 && next > previous + 0.05;

  host.textContent = over
    ? label + ': this weight would make the group ' + next + '%, above the 100% limit.'
    : label + ': ' + usage.used + '% used in ' + usage.count + ' KPIs, ' + (Math.round((100 - usage.used) * 10) / 10) + '% left.';
  host.className = 'text-label-xs mt-1 ' + (over ? 'text-status-danger-text font-semibold' : 'text-text-muted');
  if (save) save.disabled = over;
}

function categoryValues(type) {
  var list = S.categories && S.categories.categories ? S.categories.categories[type] : null;
  return (list || []).filter(function (c) { return c.active; }).map(function (c) { return c.value; });
}

function withCategories(next) {
  $('modal-host').innerHTML =
    '<div class="modal-backdrop">' +
      '<div class="modal-panel !max-w-xs p-space-lg flex items-center gap-space-sm">' +
        '<span class="spinner spinner-dark"></span>' +
        '<span class="text-body-md text-text-secondary">Loading categories</span>' +
      '</div>' +
    '</div>';

  api('getCategories')
    .then(function (data) {
      S.categories = data;
      next();
    })
    .catch(function (err) {
      $('modal-host').innerHTML = '';
      toast(err.message, 'error');
    });
}

function autoGrow(el) {
  if (!el || el.tagName !== 'TEXTAREA') return;
  if (/[\r\n]/.test(el.value)) el.value = el.value.replace(/\s*[\r\n]+\s*/g, ' ');
  el.style.height = 'auto';
  el.style.height = (el.scrollHeight + 2) + 'px';
}

function blockEnter(ev) {
  if (ev.key === 'Enter') ev.preventDefault();
}

function masterYearOptions(selected) {
  var picked = parseInt(selected, 10);
  var set = {};
  [S.user.year, S.user.year + 1, picked].concat((S.masterMeta && S.masterMeta.years) || []).forEach(function (y) {
    var n = parseInt(y, 10);
    if (n) set[n] = true;
  });
  return Object.keys(set)
    .map(function (y) { return parseInt(y, 10); })
    .sort(function (a, b) { return b - a; })
    .map(function (y) {
      return '<option value="' + y + '"' + (y === picked ? ' selected' : '') + '>' + y + (y === S.user.year ? ' (Active)' : '') + '</option>';
    }).join('');
}

function optionList(options, value, placeholder) {
  var list = options.slice();
  if (value && list.indexOf(value) === -1) list.unshift(value);
  return '<option value="">' + esc(placeholder) + '</option>' +
    list.map(function (o) {
      return '<option value="' + esc(o) + '"' + (o === value ? ' selected' : '') + '>' + esc(o) + '</option>';
    }).join('');
}

function openBatchModal() {
  if (!S.categories) {
    withCategories(openBatchModal);
    return;
  }

  var emp = S.mapping ? S.mapping.employee : null;
  var filterYear = $('mk-f-year') ? parseInt($('mk-f-year').value, 10) : 0;
  var defaultYear = filterYear || S.user.year;

  var globalSelect = function (key, label, value) {
    return '<div>' +
      '<label class="form-label">' + esc(label) + ' *</label>' +
      '<select id="bk-' + key.toLowerCase() + '" class="field" onchange="MGI.recalcBatch()">' +
        optionList(categoryValues(key), value || '', 'Select ' + label) +
      '</select></div>';
  };

  $('modal-host').innerHTML =
    '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closeBatchModal()">' +
      '<div class="modal-panel modal-panel-wide">' +

        '<div class="px-6 py-4 border-b border-border-light flex items-start justify-between gap-4">' +
          '<div class="min-w-0">' +
            '<h2 class="text-title-lg text-text-primary">Add Master KPIs (Batch)</h2>' +
            '<p class="text-body-sm text-text-muted mt-0.5">' +
              'Enter every indicator for one Year, Position, and Department combination at once. KPI_IDs are generated automatically.' +
            '</p>' +
          '</div>' +
          '<button class="btn-icon -mr-2" onclick="MGI.closeBatchModal()" title="Close" aria-label="Close">' +
            '<span class="material-symbols-outlined">close</span></button>' +
        '</div>' +

        '<div class="sticky top-0 z-20 bg-white px-6 pt-5 pb-4 border-b border-border-light">' +
          '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">' +
            '<div>' +
              '<label class="form-label">Year *</label>' +
              '<select id="bk-year" class="field" onchange="MGI.recalcBatch()">' + masterYearOptions(defaultYear) + '</select>' +
            '</div>' +
            globalSelect('Division', 'Division', emp ? emp.Division : '') +
            globalSelect('Department', 'Department', emp ? emp.Department : '') +
            globalSelect('Position', 'Position', emp ? emp.Position : '') +
          '</div>' +
          '<p class="text-body-sm text-text-muted mt-space-sm">' +
            'These four values apply to every row in this batch. New KPI_IDs use the selected year, for example ' +
            '<strong id="bk-id-hint">KPI-' + String(defaultYear).slice(-2) + '-XXXX</strong>.' +
          '</p>' +
          '<p id="bk-group" class="text-body-sm text-text-muted mt-1"></p>' +
        '</div>' +

        '<div class="p-space-lg">' +
          '<div class="flex items-center justify-between gap-space-md mb-space-sm">' +
            '<h3 class="text-title-md text-text-primary">Indicator List</h3>' +
            '<button id="bk-add" class="btn btn-secondary !py-1.5 !px-3 !text-label-sm" onclick="MGI.addBatchRow()">' +
              '<span class="material-symbols-outlined text-[16px]">add</span> Add Row</button>' +
          '</div>' +
          '<div id="batch-rows"></div>' +
          '<p id="bk-quota" class="text-body-sm text-text-muted mt-space-sm"></p>' +
        '</div>' +

        '<div class="px-6 py-4 border-t border-border-light bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-space-md sticky bottom-0">' +
          '<div id="bk-total" class="flex items-center gap-space-sm"></div>' +
          '<div class="flex items-center gap-space-sm">' +
            '<button class="btn btn-secondary" onclick="MGI.closeBatchModal()">Cancel</button>' +
            '<button id="bk-save" class="btn btn-primary" onclick="MGI.saveBatch()" disabled>' +
              '<span class="material-symbols-outlined text-[18px]">save</span> ' +
              '<span id="bk-save-label">Save</span></button>' +
          '</div>' +
        '</div>' +

      '</div>' +
    '</div>';

  $('batch-rows').addEventListener('input', function (ev) {
    autoGrow(ev.target);
    recalcBatch();
  });
  $('batch-rows').addEventListener('change', recalcBatch);

  S.batchSeq = 0;
  addBatchRow();
}

function closeBatchModal() {
  $('modal-host').innerHTML = '';
}

function addBatchRow() {
  var host = $('batch-rows');
  if (!host) return;
  if (host.children.length >= (S.user.maxKpi || 10)) return;

  var id = 'r' + (S.batchSeq++);
  var cell = function (label, inner) {
    return '<div><span class="batch-row-label">' + esc(label) + '</span>' + inner + '</div>';
  };
  var grow = function (f, placeholder) {
    return '<textarea data-f="' + f + '" rows="1" class="field field-grow" placeholder="' + esc(placeholder) + '"' +
      ' onkeydown="MGI.blockEnter(event)"></textarea>';
  };

  var row = document.createElement('div');
  row.className = 'batch-row';
  row.dataset.row = id;
  row.innerHTML =
    '<div class="batch-row-top">' +
      '<span class="batch-row-no" data-row-no>' + (host.children.length + 1) + '</span>' +
      cell('KPI Name', grow('KPI_Name', 'Indicator name')) +
      cell('Metrics', grow('Metrics', 'Measurement tool or calculation method')) +
      '<div><span class="batch-row-label">&nbsp;</span>' +
        '<button class="btn-trash" title="Remove row" onclick="MGI.removeBatchRow(\'' + id + '\')">' +
        '<span class="material-symbols-outlined text-[20px]">delete</span></button></div>' +
    '</div>' +
    '<div class="batch-row-bottom">' +
      cell('Target', '<input data-f="Target" class="field" type="number" step="any" placeholder="0">') +
      cell('Unit', '<input data-f="Unit" class="field" type="text" placeholder="%, Days">') +
      cell('Weight %', '<input data-f="Weight" class="field" type="number" step="any" min="0" max="100" placeholder="0">') +
      cell('Label', '<select data-f="Label" class="field">' + optionList(LABEL_OPTIONS, 'Increase', 'Select') + '</select>') +
      cell('Duration', '<select data-f="Duration" class="field">' + optionList(DURATION_OPTIONS, 'Monthly', 'Select') + '</select>') +
      cell('Multiplier', '<input data-f="Multiplier" class="field" type="number" step="any" min="0" placeholder="0">') +
      cell('Target is B', '<label class="flex items-center gap-1.5 h-[34px]">' +
        '<input data-f="Target_Is_B" type="checkbox" class="w-4 h-4 rounded border-border-medium text-primary-container">' +
        '<span class="text-label-xs text-text-secondary">Yes</span></label>') +
    '</div>';

  host.appendChild(row);
  recalcBatch();
}

function removeBatchRow(id) {
  var row = document.querySelector('#batch-rows [data-row="' + attr(id) + '"]');
  if (row) row.remove();
  recalcBatch();
}

function readBatchRows() {
  return Array.prototype.map.call($('batch-rows').children, function (row) {
    var o = { _el: row };
    Array.prototype.forEach.call(row.querySelectorAll('[data-f]'), function (el) {
      o[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value.trim();
    });
    return o;
  });
}

function recalcBatch() {
  if (!$('batch-rows')) return;

  var maxRows = S.user.maxKpi || 10;
  var rows = readBatchRows();
  var year = $('bk-year') ? $('bk-year').value : '';
  var division = $('bk-division').value;
  var department = $('bk-department').value;
  var position = $('bk-position').value;
  if (year && $('bk-id-hint')) $('bk-id-hint').textContent = 'KPI-' + String(year).slice(-2) + '-XXXX';

  var total = 0;
  var complete = rows.length > 0;

  rows.forEach(function (r, i) {
    var no = r._el.querySelector('[data-row-no]');
    if (no) no.textContent = i + 1;
    total += Number(r.Weight) || 0;

    var missing = !r.KPI_Name || !r.Metrics || !r.Unit ||
                  r.Target === '' || r.Weight === '' ||
                  !(Number(r.Weight) > 0);

    if (r.Label !== 'Binary' && !(Number(r.Multiplier) > 0)) missing = true;
    if (!r.Label || !r.Duration) missing = true;
    if (missing) complete = false;

    Array.prototype.forEach.call(r._el.querySelectorAll('[data-f]'), function (el) {
      var f = el.dataset.f;
      var bad =
        (f === 'KPI_Name' && !r.KPI_Name) ||
        (f === 'Metrics' && !r.Metrics) ||
        (f === 'Unit' && !r.Unit) ||
        (f === 'Target' && r.Target === '') ||
        (f === 'Weight' && !(Number(r.Weight) > 0)) ||
        (f === 'Multiplier' && r.Label !== 'Binary' && !(Number(r.Multiplier) > 0));
      el.classList.toggle('is-invalid', !!bad);
    });
  });

  total = Math.round(total * 100) / 100;

  var weightOk = Math.abs(total - 100) < 0.01;
  var globalsOk = !!(year && division && department && position);
  var countOk = rows.length >= 1 && rows.length <= maxRows;
  var groupHost = $('bk-group');
  var groupBlocked = false;

  if (groupHost) {
    if (!(S.masterList || []).length || !globalsOk) {
      groupHost.textContent = '';
      groupHost.className = 'text-body-sm text-text-muted mt-1';
    } else {
      var usage = masterGroupUsage(year, position, department, '');
      var label = position + ' / ' + department + ' (' + year + ')';
      groupBlocked = usage.used > 0.05;
      groupHost.textContent = groupBlocked
        ? label + ' already has ' + usage.used + '% active in ' + usage.count + ' KPIs. A new batch would make it ' +
          (Math.round((usage.used + total) * 10) / 10) + '%. Deactivate that role group first.'
        : label + ' has no active KPIs yet, so this batch will complete it.';
      groupHost.className = 'text-body-sm mt-1 ' + (groupBlocked ? 'text-status-danger-text font-semibold' : 'text-text-muted');
    }
  }

  var valid = weightOk && globalsOk && countOk && complete && !groupBlocked;

  $('bk-add').disabled = rows.length >= maxRows;

  $('bk-quota').textContent = rows.length + ' of ' + maxRows + ' rows used' +
    (rows.length >= maxRows ? ' (maximum reached)' : '');

  var delta = Math.round(Math.abs(100 - total) * 100) / 100;
  $('bk-total').innerHTML =
    '<span class="text-label-xs uppercase tracking-wider text-text-muted">Total Weight</span>' +
    '<span class="text-headline-md font-bold ' +
      (weightOk ? 'text-status-success' : 'text-status-danger') + '">' + total + '%</span>' +
    '<span class="pill ' + (weightOk ? 'pill-success' : 'pill-danger') + '">' +
      '<span class="material-symbols-outlined text-[14px]">' +
        (weightOk ? 'check_circle' : 'error') + '</span> ' +
      (weightOk ? 'Exactly 100%' : (total < 100 ? 'Short by ' + delta + '%' : 'Over by ' + delta + '%')) +
    '</span>' +
    (!globalsOk
      ? '<span class="text-body-sm text-status-danger-text">Complete Year, Division, Department, and Position.</span>'
      : (!complete && rows.length
          ? '<span class="text-body-sm text-status-danger-text">Some fields are still empty.</span>'
          : ''));

  $('bk-save').disabled = !valid;
  $('bk-save-label').textContent = 'Save ' + rows.length + ' KPIs';
}

function saveBatch() {
  var division = $('bk-division').value;
  var department = $('bk-department').value;
  var position = $('bk-position').value;

  var payload = readBatchRows().map(function (r) {
    return {
      KPI_Name:    r.KPI_Name,
      Metrics:     r.Metrics,
      Year:        $('bk-year').value,
      Division:    division,
      Department:  department,
      Position:    position,
      Target:      r.Target,
      Unit:        r.Unit,
      Weight:      r.Weight,
      Label:       r.Label,
      Duration:    r.Duration,
      Multiplier:  r.Label === 'Binary' ? (r.Multiplier || 1) : r.Multiplier,
      Target_Is_B: r.Target_Is_B
    };
  });

  var restore = busy($('bk-save'), 'Saving');

  api('createMasterKPIBatch', payload)
    .then(function (res) {
      restore();
      closeBatchModal();
      toast(res.message, 'success');
      if (S.view === 'master-kpis') loadMasterCatalog();
      if (S.view === 'mapping' && S.mapping) onEmployeeSelect(null, currentIds());
    })
    .catch(function (err) {
      restore();
      toast(err.message, 'error');
    });
}
