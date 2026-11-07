'use strict';

function loadMasterCatalog() {
  if (!S.masterList.length) {
    $('mk-tree').innerHTML = '<div class="skeleton h-16 w-full"></div><div class="skeleton h-16 w-full"></div>';
  }
  api('getMasterCatalog')
    .then(function (data) {
      S.masterMeta = data;
      S.masterList = data.kpis || [];
      if (S.mkView !== 'health') S.kpiHealth = null;
      fillMasterFilters();
      renderMasterTree();
    })
    .catch(function (err) {
      $('mk-tree').innerHTML =
        '<div class="bg-surface-card rounded-xl border border-border-light p-space-xl text-center text-status-danger">' + esc(err.message) + '</div>';
      toast(err.message, 'error');
    });
}

function fillMasterFilters() {
  var yearSel = $('mk-f-year');
  var keepYear = yearSel.value;
  var years = (S.masterMeta.years || []).slice();
  yearSel.innerHTML = '<option value="">All years</option>' + years.map(function (y) {
    return '<option value="' + y + '">' + y + (y === S.masterMeta.activeYear ? ' (Active)' : '') + '</option>';
  }).join('');
  var pick = S.masterYearPick;
  S.masterYearPick = null;
  yearSel.value = pick && years.indexOf(pick) > -1 ? String(pick)
                : keepYear !== '' && years.indexOf(parseInt(keepYear, 10)) > -1 ? keepYear
                : keepYear === '' && yearSel.dataset.loaded ? '' : String(S.masterMeta.activeYear);
  yearSel.dataset.loaded = '1';

  var divSel = $('mk-f-division');
  var keepDiv = divSel.value;
  var seen = {};
  var divisions = [];
  S.masterList.forEach(function (k) {
    var d = k.Division || '-';
    if (!seen[d]) { seen[d] = true; divisions.push(d); }
  });
  divisions.sort();
  divSel.innerHTML = '<option value="">All divisions</option>' + divisions.map(function (d) {
    return '<option value="' + esc(d) + '">' + esc(d) + '</option>';
  }).join('');
  divSel.value = divisions.indexOf(keepDiv) > -1 ? keepDiv : '';
}

function kpiWeightPct(k) {
  return isNum(k.Weight) ? Number(k.Weight) * 100 : Number(k.WeightPercent) || 0;
}

function masterRoleKey(k) {
  return 'r:' + k.Year + '|' + (k.Division || '-') + '|' + (k.Position + '|' + k.Department).toLowerCase();
}

function masterIsOpen(key, fallback) {
  return Object.prototype.hasOwnProperty.call(S.masterOpen, key) ? S.masterOpen[key] : fallback;
}

function toggleMasterNode(key, fallback) {
  S.masterOpen[key] = !masterIsOpen(key, !!fallback);
  renderMasterTree();
}

function masterFiltered() {
  var year = $('mk-f-year').value;
  var division = $('mk-f-division').value;
  var status = $('mk-f-status').value;
  var q = ($('mk-f-search').value || '').trim().toLowerCase();
  return S.masterList.filter(function (k) {
    if (year && String(k.Year) !== year) return false;
    if (division && (k.Division || '-') !== division) return false;
    if (status === 'active' && !k.IsActive) return false;
    if (status === 'inactive' && k.IsActive) return false;
    if (q && (k.KPI_ID + ' ' + k.KPI_Name + ' ' + k.Position + ' ' + k.Department).toLowerCase().indexOf(q) === -1) return false;
    return true;
  });
}

function masterTree(list) {
  var years = {};
  var yearOrder = [];
  list.forEach(function (k) {
    var y = String(k.Year);
    if (!years[y]) {
      years[y] = { year: y, divisions: {}, order: [] };
      yearOrder.push(y);
    }
    var Y = years[y];
    var d = k.Division || '-';
    if (!Y.divisions[d]) {
      Y.divisions[d] = { name: d, roles: {}, order: [] };
      Y.order.push(d);
    }
    var D = Y.divisions[d];
    var key = masterRoleKey(k);
    if (!D.roles[key]) {
      D.roles[key] = { key: key, label: roleLabel(k), items: [] };
      D.order.push(key);
    }
    D.roles[key].items.push(k);
  });

  yearOrder.sort(function (a, b) { return Number(b) - Number(a); });
  return yearOrder.map(function (y) {
    var Y = years[y];
    Y.order.sort();
    return {
      year: y,
      divisions: Y.order.map(function (d) {
        var D = Y.divisions[d];
        D.order.sort(function (a, b) { return D.roles[a].label.localeCompare(D.roles[b].label); });
        return { name: d, roles: D.order.map(function (key) { return D.roles[key]; }) };
      })
    };
  });
}

function masterNode(cls, key, fallback, head, body) {
  var open = masterIsOpen(key, fallback);
  return '<div class="role-group ' + cls + ' shrink-0 !mt-0 shadow-level-1' + (open ? '' : ' is-collapsed') + '">' +
    '<div class="role-group-head !p-4" onclick="MGI.toggleMasterNode(\'' + esc(key) + '\', ' + (fallback ? 'true' : 'false') + ')">' +
      '<span class="material-symbols-outlined text-[20px] text-text-secondary">' + (open ? 'expand_less' : 'expand_more') + '</span>' +
      head +
    '</div>' +
    '<div class="role-group-body' + (cls.indexOf('mk-role') === 0 ? '' : ' !gap-3') + '">' + body + '</div>' +
  '</div>';
}

function masterRoleHtml(role, fallback) {
  var full = S.masterList.filter(function (k) { return masterRoleKey(k) === role.key; });
  var active = full.filter(function (k) { return k.IsActive; });
  var anyActive = active.length > 0;
  var mixed = anyActive && active.length < full.length;
  var weight = Math.round(active.reduce(function (sum, k) { return sum + kpiWeightPct(k); }, 0) * 10) / 10;
  var mapped = full.reduce(function (sum, k) { return sum + (k.mappedCount || 0); }, 0);
  var busyRole = !!S.masterBusy[role.key];

  var head =
    '<div class="flex flex-col gap-1 min-w-0 flex-1">' +
      '<div class="flex items-center gap-space-xs flex-wrap">' +
        '<span class="text-title-md ' + (anyActive ? 'text-text-primary' : 'text-text-secondary') + '">' + esc(role.label) + '</span>' +
        '<span class="pill pill-neutral !py-0 !text-[11px]">' + full.length + ' KPIs</span>' +
        (anyActive
          ? '<span class="pill ' + (Math.abs(weight - 100) < 0.05 ? 'pill-success' : 'pill-warning') + ' !py-0 !text-[11px]">Active weight ' + weight + '%</span>'
          : '') +
        (mixed ? '<span class="pill pill-warning !py-0 !text-[11px]">Partly active</span>' : '') +
        (mapped ? '<span class="pill pill-info !py-0 !text-[11px]">Used by ' + mapped + ' mappings</span>' : '') +
      '</div>' +
    '</div>' +
    '<label class="switch shrink-0" onclick="event.stopPropagation()" title="' +
      (anyActive ? 'Deactivate this role group: it disappears from the Mapping KPI catalogue' : 'Activate this role group for Mapping KPI') + '">' +
      '<input type="checkbox"' + (anyActive ? ' checked' : '') + (busyRole ? ' disabled' : '') +
        ' onchange="MGI.toggleMasterRole(\'' + esc(role.key) + '\', this.checked)">' +
      '<span class="switch-track"><span class="switch-thumb"></span></span>' +
      '<span class="switch-label">' + (busyRole ? 'Saving' : anyActive ? 'Active' : 'Inactive') + '</span>' +
    '</label>';

  var rows = role.items.map(function (k) {
    return '<tr class="' + (k.IsActive ? '' : 'mk-row-inactive') + '">' +
      '<td class="text-label-xs font-bold text-text-secondary whitespace-nowrap">' + esc(k.KPI_ID) + '</td>' +
      '<td class="text-label-md font-semibold text-text-primary">' + esc(k.KPI_Name) + '</td>' +
      '<td class="text-label-sm text-text-secondary">' + esc(k.Metrics || '-') + '</td>' +
      '<td class="text-right text-code-num">' + esc(num(k.Target, 2)) + '</td>' +
      '<td class="text-label-sm whitespace-nowrap">' + esc(k.Unit || '-') + '</td>' +
      '<td class="text-right text-code-num font-semibold">' + pct(k.WeightPercent) + '</td>' +
      '<td class="text-label-sm">' + esc(k.Label) + '</td>' +
      '<td>' + durationPill(k.Duration, true) + '</td>' +
      '<td class="text-right text-code-num">' + esc(num(k.Multiplier, 2)) + '</td>' +
      '<td class="text-center text-label-sm">' + (k.Target_Is_B ? 'Yes' : 'No') + '</td>' +
      '<td class="text-center">' +
        (k.IsActive ? '<span class="pill pill-success !py-0 !text-[11px]">Active</span>' : '<span class="pill pill-neutral !py-0 !text-[11px]">Inactive</span>') +
        (k.mappedCount ? '<span class="block text-[11px] text-text-muted mt-0.5">' + k.mappedCount + ' mapped</span>' : '') +
      '</td>' +
      '<td class="text-right">' +
        '<button class="btn btn-secondary !py-1 !px-2.5 !text-label-xs" onclick="MGI.openMasterModal(\'' + esc(k.KPI_ID) + '\')">' +
          '<span class="material-symbols-outlined text-[16px]">edit</span>Edit</button>' +
      '</td>' +
    '</tr>';
  }).join('');

  var body =
    '<div class="table-scroll">' +
      '<table class="data-table mk-table">' +
        '<thead><tr>' +
          '<th>KPI ID</th><th class="min-w-[220px]">KPI Name</th><th class="min-w-[200px]">Metrics</th>' +
          '<th class="text-right">Target</th><th>Unit</th><th class="text-right">Weight</th><th>Label</th><th>Duration</th>' +
          '<th class="text-right">Multiplier</th><th class="text-center">Target is B</th><th class="text-center">Status</th><th class="text-right">Action</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</div>';

  return masterNode('mk-role' + (anyActive ? '' : ' is-inactive'), role.key, fallback, head, body);
}

function renderMasterTree() {
  var host = $('mk-tree');
  if (!host || !S.masterMeta) return;

  var list = masterFiltered();
  if (!list.length) {
    host.innerHTML =
      '<div class="bg-surface-card rounded-xl border border-dashed border-border-medium p-space-xl text-center">' +
        '<span class="material-symbols-outlined text-[40px] text-text-muted">library_books</span>' +
        '<p class="text-body-md text-text-secondary mt-2">' +
          (S.masterList.length ? 'No KPIs match these filters.' : 'No Master KPIs yet. Use Add KPIs or Bulk Upload.') + '</p>' +
      '</div>';
    return;
  }

  var searching = !!($('mk-f-search').value || '').trim();
  var tree = masterTree(list);

  host.innerHTML = tree.map(function (Y) {
    var yearKpis = list.filter(function (k) { return String(k.Year) === Y.year; });
    var activeCount = yearKpis.filter(function (k) { return k.IsActive; }).length;
    var roleCount = Y.divisions.reduce(function (sum, D) { return sum + D.roles.length; }, 0);

    var divisions = Y.divisions.map(function (D) {
      var roles = D.roles.map(function (R) {
        return masterRoleHtml(R, D.roles.length === 1 || searching);
      }).join('');
      var dHead =
        '<span class="material-symbols-outlined text-[18px] text-text-muted">account_tree</span>' +
        '<span class="text-title-md text-text-primary">' + esc(D.name) + '</span>' +
        '<span class="pill pill-neutral !py-0 !text-[11px]">' + plural(D.roles.length, 'role group') + '</span>';
      return masterNode('mk-division', 'd:' + Y.year + '|' + D.name, true, dHead, roles);
    }).join('');

    var year = masterYearStats(Y.year);
    var busyYear = !!S.masterBusy['year:' + Y.year];
    var yearLabel = busyYear ? 'Saving' : year.state === 'on' ? 'All active' : year.state === 'partial' ? 'Partly active' : 'Inactive';
    var yHead =
      '<span class="text-lg font-bold text-slate-900 tracking-tight">FY' + esc(Y.year) + '</span>' +
      (Number(Y.year) === S.masterMeta.activeYear ? '<span class="pill pill-brand !py-0 !text-[11px]">Active year</span>' : '') +
      '<span class="ml-auto flex items-center gap-space-xs flex-wrap">' +
        '<span class="pill pill-neutral !py-0 !text-[11px]">' + yearKpis.length + ' KPIs</span>' +
        '<span class="pill pill-success !py-0 !text-[11px]">' + activeCount + ' active</span>' +
        '<span class="pill pill-neutral !py-0 !text-[11px]">' + plural(roleCount, 'role group') + '</span>' +
      '</span>' +
      '<label class="switch shrink-0 pl-2 ml-1 border-l border-slate-200" data-master-year="' + esc(Y.year) + '" onclick="event.stopPropagation()" title="' +
        (year.state === 'off' ? 'Activate every KPI of FY' + esc(Y.year) : 'Activate or deactivate every KPI of FY' + esc(Y.year)) + '">' +
        '<input type="checkbox"' + (year.state !== 'off' ? ' checked' : '') + (busyYear ? ' disabled' : '') +
          ' onchange="MGI.confirmMasterYear(' + Number(Y.year) + ')">' +
        '<span class="switch-track' + (year.state === 'partial' ? ' is-partial' : '') + '"><span class="switch-thumb"></span></span>' +
        '<span class="switch-label">' + yearLabel + '</span>' +
      '</label>';
    return masterNode('mk-year', 'y:' + Y.year, tree.length === 1 || Number(Y.year) === S.masterMeta.activeYear || searching, yHead, divisions);
  }).join('');
}

function masterYearStats(year) {
  var kpis = S.masterList.filter(function (k) { return String(k.Year) === String(year); });
  var active = kpis.filter(function (k) { return k.IsActive; }).length;
  var groups = {};
  kpis.forEach(function (k) { groups[masterRoleKey(k)] = true; });
  return {
    year: Number(year),
    total: kpis.length,
    active: active,
    groups: Object.keys(groups).length,
    mapped: kpis.reduce(function (sum, k) { return sum + (k.mappedCount || 0); }, 0),
    state: !kpis.length || !active ? 'off' : active === kpis.length ? 'on' : 'partial'
  };
}

function confirmMasterYear(year) {
  var st = masterYearStats(year);
  renderMasterTree();
  if (!st.total) return;
  var button = function (on, primary) {
    return '<button type="button" class="btn ' + (primary ? (on ? 'btn-primary' : 'btn-danger') : 'btn-secondary') + '" data-year-action="' + (on ? 'on' : 'off') + '"' +
      ' onclick="MGI.applyMasterYear(' + st.year + ', ' + (on ? 'true' : 'false') + ')">' +
      '<span class="material-symbols-outlined text-[18px]">' + (on ? 'toggle_on' : 'toggle_off') + '</span> ' +
      (on ? 'Activate all FY' + st.year + ' KPIs' : 'Deactivate all FY' + st.year + ' KPIs') + '</button>';
  };
  var actions = st.state === 'on' ? button(false, true)
    : st.state === 'off' ? button(true, true)
    : button(false, false) + button(true, true);

  $('modal-host').innerHTML =
    '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closeMasterYear()">' +
      '<div class="modal-panel !max-w-lg">' +
        '<div class="px-6 pt-6 pb-4 flex items-start gap-4">' +
          '<span class="w-10 h-10 rounded-full bg-status-warning-subtle text-status-warning flex items-center justify-center shrink-0">' +
            '<span class="material-symbols-outlined text-[22px]">event_repeat</span></span>' +
          '<div class="min-w-0">' +
            '<h2 class="text-title-lg text-text-primary">FY' + st.year + ' KPI status</h2>' +
            '<p class="text-body-sm text-text-secondary mt-1">' + st.active + ' of ' + st.total + ' KPIs are active across ' + st.groups +
              (st.groups === 1 ? ' role group' : ' role groups') + (st.mapped ? ', used by ' + st.mapped + ' mappings' : '') + '.</p>' +
          '</div>' +
        '</div>' +
        '<ul class="mx-6 mb-5 rounded-lg bg-surface-page border border-border-light px-4 py-3 text-body-sm text-text-secondary list-disc pl-8 flex flex-col gap-1">' +
          '<li><strong>Deactivate</strong> hides every FY' + st.year + ' KPI from Mapping KPI and Bulk Assign. Existing mappings, submissions, and scores are kept.</li>' +
          '<li><strong>Activate</strong> turns on each role group whose weights total exactly 100%. Groups that are not ready stay inactive and are listed after saving.</li>' +
        '</ul>' +
        '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex flex-wrap items-center justify-end gap-space-sm">' +
          '<button type="button" class="btn btn-secondary" onclick="MGI.closeMasterYear()">Cancel</button>' + actions +
        '</div>' +
      '</div>' +
    '</div>';
}

function closeMasterYear() {
  $('modal-host').innerHTML = '';
}

function applyMasterYear(year, on) {
  var key = 'year:' + year;
  if (S.masterBusy[key]) return;
  S.masterBusy[key] = true;
  closeMasterYear();
  renderMasterTree();

  api('setMasterYearStatus', year, !!on)
    .then(function (res) {
      delete S.masterBusy[key];
      toast(res.message, res.skipped && res.skipped.length ? 'warning' : 'success');
      if (res.skipped && res.skipped.length) {
        toast('Not ready: ' + res.skipped.slice(0, 3).map(function (x) { return x.label; }).join(', ') +
          (res.skipped.length > 3 ? ', and ' + (res.skipped.length - 3) + ' more' : '') + '. Fix their weights, then activate them again.', 'warning');
      }
      loadMasterCatalog();
    })
    .catch(function (err) {
      delete S.masterBusy[key];
      renderMasterTree();
      toast(err.message, 'error');
    });
}

function toggleMasterRole(key, on) {
  var ids = S.masterList.filter(function (k) { return masterRoleKey(k) === key; }).map(function (k) { return k.KPI_ID; });
  if (!ids.length) return;

  S.masterBusy[key] = true;
  renderMasterTree();

  api('setMasterKpiStatus', ids, !!on)
    .then(function (res) {
      delete S.masterBusy[key];
      S.masterList.forEach(function (k) { if (ids.indexOf(k.KPI_ID) > -1) k.IsActive = !!on; });
      renderMasterTree();
      toast(res.message + (on ? ' They are available in Mapping KPI again.' : ' They are hidden from Mapping KPI. Existing mappings keep working.'), 'success');
    })
    .catch(function (err) {
      delete S.masterBusy[key];
      renderMasterTree();
      toast(err.message, 'error');
    });
}

function downloadMasterTemplate() {
  downloadCsv([UPLOAD_HEADERS.join(',')], 'Master_KPI_Upload_Template.csv');
  toast('Template downloaded. Add one row per KPI. Weight is a percent.', 'success');
}

function wireFileDrop(zone, input, onFile) {
  if (!zone || !input || zone.dataset.wired) return;
  zone.dataset.wired = '1';

  zone.onclick = function () { input.click(); };
  input.onclick = function (e) { e.stopPropagation(); };
  input.onchange = function () {
    if (input.files[0]) onFile(input.files[0]);
    input.value = '';
  };
  ['dragenter', 'dragover'].forEach(function (ev) {
    zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('is-dragging'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('is-dragging'); });
  });
  zone.addEventListener('drop', function (e) {
    if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
  });
}

function wireMasterUpload() {
  wireFileDrop($('mku-drop'), $('mku-file'), onMasterUploadFile);
  renderUploadState();
}

function uploadFileProblem(file) {
  var ext = String(file.name || '').split('.').pop().toLowerCase();
  if (ext !== 'csv' && ext !== 'xlsx') return 'Upload a .csv or .xlsx file.';
  if (file.size > 5 * 1048576) return 'The file is larger than 5 MB.';
  return '';
}

function onMasterUploadFile(file) {
  var problem = uploadFileProblem(file);
  if (problem) {
    toast(problem, 'warning');
    return;
  }
  var name = String(file.name || '');

  S.upload = { fileName: name, status: 'reading', rows: [], errors: [], result: null };
  renderUploadState();

  readUploadFile(file, function (matrix) {
    var mapped = mapUploadRows(matrix);
    S.upload = { fileName: name, status: mapped.errors.length ? 'invalid' : 'ready', rows: mapped.rows, errors: mapped.errors, result: null };
    renderUploadState();
  }, function (message) {
    S.upload = { fileName: name, status: 'invalid', rows: [], errors: [{ row: 0, column: '', value: '', message: message }], result: null };
    renderUploadState();
  });
}

function readUploadFile(file, done, fail) {
  var ext = String(file.name || '').split('.').pop().toLowerCase();
  var reader = new FileReader();
  reader.onerror = function () { fail('The file could not be read.'); };

  if (ext === 'csv') {
    reader.onload = function () { done(parseCsv(String(reader.result || ''))); };
    reader.readAsText(file);
    return;
  }

  loadSheetJs()
    .then(function (XLSX) {
      reader.onload = function () {
        try {
          var book = XLSX.read(new Uint8Array(reader.result), { type: 'array' });
          var sheet = book.Sheets[book.SheetNames[0]];
          done(XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }));
        } catch (e) {
          fail('The Excel file could not be parsed: ' + e.message);
        }
      };
      reader.readAsArrayBuffer(file);
    })
    .catch(function () {
      fail('The Excel reader could not be loaded. Save the file as CSV and upload it again.');
    });
}

function loadScriptOnce(key, src, pick) {
  if (pick()) return Promise.resolve(pick());
  if (S.scripts[key]) return S.scripts[key];
  S.scripts[key] = new Promise(function (resolve, reject) {
    var tag = document.createElement('script');
    tag.src = src;
    tag.onload = function () {
      if (pick()) resolve(pick());
      else {
        S.scripts[key] = null;
        reject(new Error(key + ' is unavailable.'));
      }
    };
    tag.onerror = function () {
      S.scripts[key] = null;
      reject(new Error(key + ' failed to load.'));
    };
    document.head.appendChild(tag);
  });
  return S.scripts[key];
}

function loadSheetJs() {
  return loadScriptOnce('SheetJS', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    function () { return window.XLSX; });
}

function loadPdfLibs() {
  return Promise.all([
    loadScriptOnce('html2canvas', 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
      function () { return window.html2canvas; }),
    loadScriptOnce('jsPDF', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
      function () { return window.jspdf && window.jspdf.jsPDF; })
  ]).then(function (libs) {
    return { html2canvas: libs[0], jsPDF: libs[1] };
  });
}

function parseCsv(text) {
  var src = String(text || '').replace(/^﻿/, '');
  var firstLine = src.split(/\r?\n/)[0] || '';
  var delim = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
  var rows = [];
  var row = [];
  var field = '';
  var quoted = false;

  for (var p = 0; p < src.length; p++) {
    var ch = src.charAt(p);
    if (quoted) {
      if (ch === '"') {
        if (src.charAt(p + 1) === '"') { field += '"'; p++; }
        else quoted = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === delim) { row.push(field); field = ''; continue; }
    if (ch === '\r') continue;
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function uploadLineHasData(line) {
  return !!line && line.some(function (c) {
    return String(c === null || c === undefined ? '' : c).trim() !== '';
  });
}

function mapUploadRows(matrix, headers, keys) {
  var labels = headers || UPLOAD_HEADERS;
  var fields = keys || UPLOAD_KEYS;
  var grid = matrix || [];
  var norm = function (h) { return String(h === null || h === undefined ? '' : h).toLowerCase().replace(/[\s_]+/g, ''); };
  var fail = function (row, column, message) {
    return { rows: [], errors: [{ row: row, column: column, value: '', message: message }] };
  };

  var headerAt = -1;
  for (var h = 0; h < grid.length; h++) {
    if (uploadLineHasData(grid[h])) { headerAt = h; break; }
  }
  if (headerAt === -1) return fail(0, '', 'The file is empty.');

  var header = grid[headerAt].map(norm);
  var positions = {};
  var missing = [];
  labels.forEach(function (label, n) {
    var at = header.indexOf(norm(label));
    if (at === -1) missing.push(label);
    else positions[fields[n]] = at;
  });
  if (missing.length) {
    return fail(headerAt + 1, missing.join(', '), 'Missing required columns: ' + missing.join(', ') + '. Download the template to see the exact headers.');
  }

  var rows = [];
  for (var r = headerAt + 1; r < grid.length; r++) {
    var line = grid[r];
    if (!uploadLineHasData(line)) continue;
    var item = { _row: r + 1 };
    for (var k = 0; k < fields.length; k++) {
      var cell = line[positions[fields[k]]];
      item[fields[k]] = String(cell === null || cell === undefined ? '' : cell).trim();
    }
    rows.push(item);
  }

  if (!rows.length) return fail(0, '', 'The file has headers but no data rows.');
  if (rows.length > 500) return fail(0, '', 'The file has ' + rows.length + ' rows. Upload at most 500 rows at a time.');
  return { rows: rows, errors: [] };
}

function uploadErrorsHtml(errors) {
  var shown = errors.slice(0, 100);
  return '<div class="upload-errors">' +
    '<div class="px-space-md py-space-sm bg-status-danger-subtle flex items-center gap-space-sm">' +
      '<span class="material-symbols-outlined text-status-danger">error</span>' +
      '<p class="text-body-sm font-semibold text-status-danger-text">Upload rejected: ' + errors.length +
        (errors.length === 1 ? ' problem' : ' problems') + ' found. Nothing was saved.</p>' +
    '</div>' +
    '<div class="table-scroll max-h-[360px] overflow-y-auto">' +
      '<table class="data-table">' +
        '<thead><tr><th>Row</th><th>Column</th><th>Value</th><th>Problem</th></tr></thead>' +
        '<tbody>' + shown.map(function (e) {
          return '<tr>' +
            '<td class="text-code-num">' + (e.row || '-') + '</td>' +
            '<td class="text-label-sm font-semibold whitespace-nowrap">' + esc(e.column || '-') + '</td>' +
            '<td class="text-label-sm text-text-secondary">' + esc(e.value || '-') + '</td>' +
            '<td class="text-label-sm">' + esc(e.message) + '</td>' +
          '</tr>';
        }).join('') + '</tbody>' +
      '</table>' +
    '</div>' +
    (errors.length > shown.length
      ? '<p class="px-space-md py-space-sm text-label-xs text-text-muted">Showing the first 100 of ' + errors.length + ' problems.</p>'
      : '') +
  '</div>';
}

function renderUploadState() {
  var summary = $('mku-summary');
  var result = $('mku-result');
  var submit = $('mku-submit');
  if (!summary || !result || !submit) return;

  var up = S.upload;
  if (!up) {
    summary.innerHTML = '<p class="text-sm text-slate-500 flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px] text-slate-400">draft</span>No file selected.</p>';
    result.innerHTML = '';
    submit.disabled = true;
    return;
  }

  var years = {};
  var groups = {};
  up.rows.forEach(function (r) {
    if (r.Year) years[r.Year] = true;
    groups[r.Year + '|' + (r.Position + '|' + r.Department).toLowerCase()] = true;
  });

  summary.innerHTML =
    '<div class="flex items-center gap-space-sm flex-wrap">' +
      '<span class="pill pill-neutral"><span class="material-symbols-outlined text-[14px]">description</span>' + esc(up.fileName) + '</span>' +
      (up.status === 'reading'
        ? '<span class="text-body-sm text-text-muted">Reading file</span>'
        : '<span class="pill pill-info">' + up.rows.length + ' rows</span>' +
          '<span class="pill pill-neutral">' + Object.keys(years).length + ' years</span>' +
          '<span class="pill pill-neutral">' + Object.keys(groups).length + ' role groups</span>') +
    '</div>';

  submit.disabled = up.status !== 'ready';

  if (up.status === 'uploaded' && up.result) {
    var byGroup = {};
    (up.result.created || []).forEach(function (c) {
      var key = c.Year + ' • ' + c.Position + ' / ' + c.Department;
      byGroup[key] = (byGroup[key] || 0) + 1;
    });
    result.innerHTML =
      '<div class="rounded-xl border border-border-light bg-status-success-subtle p-space-md">' +
        '<p class="text-body-sm font-semibold text-status-success-text flex items-center gap-1.5">' +
          '<span class="material-symbols-outlined text-[18px]">task_alt</span>' + esc(up.result.message) + '</p>' +
        '<ul class="mt-space-sm text-label-sm text-text-secondary flex flex-col gap-0.5">' +
          Object.keys(byGroup).map(function (key) { return '<li>' + esc(key) + ': ' + byGroup[key] + ' KPIs</li>'; }).join('') +
        '</ul>' +
      '</div>';
    return;
  }

  result.innerHTML = up.errors.length ? uploadErrorsHtml(up.errors) : '';
}

function submitMasterUpload() {
  var up = S.upload;
  if (!up || up.status !== 'ready') return;

  up.status = 'uploading';
  var restore = busy($('mku-submit'), 'Uploading');

  api('uploadMasterKPIs', up.rows)
    .then(function (res) {
      restore();
      if (!res || !res.ok) {
        up.status = 'invalid';
        up.errors = (res && res.errors) || [];
        renderUploadState();
        toast('Upload rejected. Fix the listed rows and try again.', 'error');
        return;
      }
      up.status = 'uploaded';
      up.errors = [];
      up.result = res;
      renderUploadState();
      toast(res.message, 'success');
      loadMasterCatalog();
    })
    .catch(function (err) {
      restore();
      up.status = 'ready';
      renderUploadState();
      toast(err.message, 'error');
    });
}

function clearMasterUpload() {
  S.upload = null;
  renderUploadState();
}
