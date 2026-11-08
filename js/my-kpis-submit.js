'use strict';

function rowMyKpi(item, i) {
  var locked = !item.Editable;
  var lockReason = item.ChangeLocked
    ? 'No changes left this month. Ask HR / Admin to allow another change.'
    : item.IsActive === false
    ? 'Inactive KPI: history only'
    : !item.InCycle
      ? 'KPI ' + item.Duration + ': not in cycle this month, scored 1.0 automatically once you submit this role'
      : 'Submission period is locked';

  return '' +
    '<tr data-mapping="' + esc(item.Mapping_ID) + '">' +
      '<td class="kpi-no text-center text-code-num text-text-muted">' + (i + 1) + '</td>' +
      '<td class="kpi-name">' +
        '<div class="flex flex-col">' +
          '<div class="flex items-center gap-2 flex-wrap">' +
            '<span class="text-label-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">' +
              esc(item.KPI_ID) + '</span>' +
            '<span class="text-title-md text-text-primary">' + esc(item.KPI_Name) + '</span>' +
            (item.IsActive === false ? '<span class="pill pill-neutral !py-0 !text-[11px]">Inactive</span>' : '') +
          '</div>' +
          (item.Metrics ? '<span class="text-body-sm text-text-muted mt-1">' + esc(item.Metrics) + '</span>' : '') +
        '</div>' +
      '</td>' +
      '<td class="kpi-weight text-center" data-label="Weight"><span class="text-code-num font-bold text-text-primary">' + pct(item.WeightPercent) + '</span></td>' +
      '<td class="kpi-unit text-center" data-label="Unit">' +
        '<span class="inline-block max-w-full truncate align-middle text-label-xs px-2.5 py-1 rounded bg-surface-page text-text-secondary border border-border-light" title="' + esc(item.Unit || '-') + '">' +
          esc(item.Unit || '-') + '</span>' +
      '</td>' +
      '<td class="kpi-duration text-center" data-label="Duration">' + durationPill(item.Duration) + '</td>' +
      '<td class="kpi-target text-center" data-label="Target" title="' + esc(targetHint(item)) + '">' +
        targetCell(item) +
        '<span class="inline-flex items-center gap-0.5 text-[11px] font-semibold ' + labelMeta(item.Label).text + '">' +
          '<span class="material-symbols-outlined text-[12px]">' + labelMeta(item.Label).icon + '</span>' + labelMeta(item.Label).short + '</span>' +
      '</td>' +
      '<td class="kpi-input relative" data-label="Realization">' +
        '<div class="input-group' + (locked ? ' is-disabled' : '') + '"' + (locked ? ' title="' + esc(lockReason) + '"' : '') + '>' +
          '<input type="text" inputmode="decimal" autocomplete="off" class="input-realization text-right text-code-num text-text-primary font-bold' +
            realizationClass(formatNumValue(item.Realization)) + '"' +
            ' value="' + esc(formatNumValue(item.Realization)) + '"' +
            ' placeholder="' + (locked ? 'Locked' : 'Enter value') + '"' +
            (locked ? ' disabled' : '') +
            ' aria-label="Realization for ' + esc(item.KPI_Name) + '"' +
            ' oninput="MGI.onRealisasiInput(this, event)" data-mapping="' + esc(item.Mapping_ID) + '">' +
          (item.Unit ? '<span class="input-group-addon" title="' + esc(item.Unit) + '">' + esc(item.Unit) + '</span>' : '') +
        '</div>' +
        '<p class="absolute left-3 right-3 bottom-0.5 text-right text-[11px] font-semibold text-text-muted truncate pointer-events-none" data-hint-for="' + esc(item.Mapping_ID) + '">' +
          esc(scaleHint(item.Realization)) + '</p>' +
      '</td>' +
      '<td class="kpi-status text-right" data-label="Status"><span class="flex justify-end min-w-0" data-status-for="' + esc(item.Mapping_ID) + '">' + statusPill(item) + '</span></td>' +
    '</tr>';
}

function scaleHint(v) {
  var n = typeof v === 'number' ? v : parseNumText(v);
  if (n === null || n === undefined || isNaN(n) || Math.abs(n) < 1000000) return '';
  return '≈ ' + compactNum(n);
}

function statusPill(item, liveRealization) {
  if (!item.InCycle) {
    var auto = !!item.AutoScore && isNum(item.Score);
    var offTitle = auto ? 'Quarterly KPI outside its quarter month, scored ' + Number(item.Score).toFixed(1) + ' automatically'
                 : item.IsActive === false ? '' : 'Scored 1.0 automatically after you submit this role';
    var offPill = '<span class="pill pill-neutral"' + (offTitle ? ' title="' + esc(offTitle) + '"' : '') + '>' +
      '<span class="material-symbols-outlined text-[14px]">lock</span> Off-Cycle</span>';
    return auto
      ? '<span class="inline-flex items-center justify-end gap-1.5 max-w-full min-w-0">' + offPill + tierChip(item.Score) + '</span>'
      : offPill;
  }

  var saved = isNum(item.Realization) ? item.Realization : null;
  var typed = liveRealization === undefined ? null : String(liveRealization);
  var value = typed === null ? saved : parseNumText(typed);

  if (value === null || value === undefined || value === '') {
    return '<span class="pill pill-warning"><span class="material-symbols-outlined text-[14px]">pending</span> Not Filled</span>';
  }
  if (isNaN(value)) {
    return '<span class="pill pill-danger"><span class="material-symbols-outlined text-[14px]">error</span> Not a number</span>';
  }
  if (tooLarge(value)) {
    return '<span class="pill pill-danger" title="Realization must stay between -' + esc(num(maxRealization(), 0)) + ' and ' + esc(num(maxRealization(), 0)) + '">' +
      '<span class="material-symbols-outlined text-[14px]">error</span> Too large</span>';
  }
  if (saved === null) {
    return '<span class="pill pill-info" title="Your score appears after you submit"><span class="material-symbols-outlined text-[14px]">edit_note</span> Ready to submit</span>';
  }
  if (typed !== null && Math.abs(value - saved) > 1e-9) {
    return '<span class="pill pill-info" title="Submit to update your score"><span class="material-symbols-outlined text-[14px]">edit</span> Changed, not submitted</span>';
  }

  var score = isNum(item.Score) ? item.Score : null;
  if (score === null) {
    return '<span class="pill pill-success"><span class="material-symbols-outlined text-[14px]">check_circle</span> Submitted</span>';
  }
  var ach = isNum(item.Achievement) ? item.Achievement : null;
  var tone = score >= 0.8 ? 'success' : score >= 0.6 ? 'info' : score >= 0.4 ? 'warning' : 'danger';
  var icon = score >= 0.8 ? 'trending_up' : score >= 0.4 ? 'trending_flat' : 'trending_down';
  var word = score >= 0.8 ? 'Achieved' : score >= 0.6 ? 'Close' : score >= 0.4 ? 'Below' : 'Critical';
  var achText = ach === null ? '-' : ach > 999 ? '>999%' : ach < -999 ? '<-999%' : pct(ach, 0);
  var title = 'Submitted realization ' + num(saved, 2) + (item.Unit ? ' ' + item.Unit : '') +
              ', achievement ' + (ach === null ? '-' : num(ach, 1) + '%') + ', tier score ' + score.toFixed(1);

  return '<span class="inline-flex items-center justify-end gap-1.5 max-w-full min-w-0" title="' + esc(title) + '">' +
           '<span class="pill pill-' + tone + ' min-w-0">' +
             '<span class="material-symbols-outlined text-[14px]">' + icon + '</span>' +
             '<span class="truncate">' + word + ' • ' + esc(achText) + '</span>' +
           '</span>' +
           tierChip(score) +
         '</span>';
}

function inputFor(item) {
  return document.querySelector('input[data-mapping="' + attr(item.Mapping_ID) + '"]');
}

function itemChanged(item) {
  var input = inputFor(item);
  if (!input) return false;
  var value = parseNumText(input.value);
  var saved = isNum(item.Realization) ? item.Realization : null;
  if (value === null) return saved !== null;
  if (isNaN(value)) return true;
  return saved === null || Math.abs(value - saved) > 1e-9;
}

function roleChanges(role) {
  return role && role.changes ? role.changes : { submitted: false, used: 0, allowed: 2, left: 2 };
}

function roleChangeLocked(role) {
  var c = roleChanges(role);
  return !!c.submitted && c.left <= 0;
}

function roleDirty(role) {
  if (S.pendingFiles[role.key]) return true;
  return (role.items || []).some(function (item) { return item.Editable && itemChanged(item); });
}

function myKpisDirty() {
  return ((S.dashboard && S.dashboard.roles) || []).some(function (r) { return roleDirty(r); });
}

function changesWord(n) {
  return n === 1 ? 'once' : n === 2 ? 'twice' : n + ' times';
}

function applyChangeLocks(d) {
  var locked = {};
  (d.roles || []).forEach(function (r) {
    if (!roleChangeLocked(r)) return;
    r.items.forEach(function (it) { locked[it.Mapping_ID] = true; });
  });
  var mark = function (it) {
    if (locked[it.Mapping_ID] && it.Editable) {
      it.Editable = false;
      it.ChangeLocked = true;
    }
  };
  (d.items || []).forEach(mark);
  (d.roles || []).forEach(function (r) { (r.items || []).forEach(mark); });
}

function onRealisasiInput(input, ev) {
  liveFormatInput(input, ev);
  if (input.classList) input.classList.toggle('is-long', !!realizationClass(input.value));
  var mappingId = input.dataset.mapping;
  var item = S.dashboard.items.filter(function (x) { return x.Mapping_ID === mappingId; })[0];
  if (!item) return;

  var holder = document.querySelector('[data-status-for="' + attr(mappingId) + '"]');
  if (holder) holder.innerHTML = statusPill(item, input.value);
  var hint = document.querySelector('[data-hint-for="' + attr(mappingId) + '"]');
  if (hint) hint.textContent = scaleHint(input.value);

  renderTableFooter(item.RoleKey);
  renderRoleSubmit(item.RoleKey);
}

function renderTableFooter(roleKey) {
  var role = findRole(roleKey);
  var foot = roleEl('data-role-footer', roleKey);
  if (!role || !foot) return;

  var c = roleChanges(role);
  var scored = role.items.some(function (it) { return isNum(it.Score); });
  if (!c.submitted && !scored) {
    foot.innerHTML =
      '<p class="text-body-sm text-text-muted flex items-center gap-1.5">' +
        '<span class="material-symbols-outlined text-[16px]">info</span> Your score and index appear after you submit.' +
      '</p>';
    return;
  }

  var dirty = role.items.some(function (it) { return it.Editable && itemChanged(it); });
  foot.innerHTML =
    '<p class="text-body-sm text-text-muted flex items-center gap-1.5">' +
      (dirty
        ? '<span class="material-symbols-outlined text-[16px] text-status-info">edit_note</span> Your changes count after you submit. The index shows your last submission.'
        : '<span class="material-symbols-outlined text-[16px]">info</span> Role index = Σ (Weight × Tier Score) × 100, calculated when you submit.') +
    '</p>';
}

function receiptHtml(r) {
  var d = S.dashboard;
  var ps = d.periodState || {};
  var c = roleChanges(r);
  var b = band(r.index);
  var tone = b.key === 'success' ? 'text-status-success-text' : b.key === 'info' ? 'text-status-info-text' : 'text-status-danger-text';
  var sent = c.lastAt || (r.evidence && r.evidence.Uploaded_At) || '';
  var stamp = sent ? dashStamp(sent) : '';
  var note = !ps.isOpen
    ? (ps.rawOpen && ps.expired ? 'Closed on ' + longDate(ps.cutoff) + '.' : 'This period is locked.') + ' Ask HR / Admin if something needs to change.'
    : c.left <= 0
      ? 'No changes left for ' + MONTHS[d.month - 1] + '. Ask HR / Admin if something still needs to change.'
      : 'Need to fix something? Edit a value or replace the file, then submit again. You can change it ' +
        changesWord(c.left) + ' until ' + longDate(ps.cutoff) + '.';
  return '<div class="submit-receipt" role="status">' +
    '<span class="submit-receipt-icon" aria-hidden="true"><span class="material-symbols-outlined">check_circle</span></span>' +
    '<div class="min-w-0 flex-1">' +
      '<p class="submit-receipt-title">Submitted for ' + esc(MONTHS[d.month - 1] + ' ' + d.year) + '</p>' +
      '<p class="submit-receipt-meta">' + (stamp ? 'Last sent ' + esc(stamp) + ' • ' : '') + 'Declaration confirmed</p>' +
      '<p class="submit-receipt-note">' + esc(note) + '</p>' +
    '</div>' +
    '<div class="submit-receipt-score">' +
      '<span class="submit-receipt-label">Submitted Index</span>' +
      '<span class="submit-receipt-value ' + tone + '">' + num(r.index) + '</span>' +
      '<span class="pill pill-' + b.key + '">' + b.label + '</span>' +
    '</div>' +
  '</div>';
}

function discardRoleChanges(roleKey) {
  var role = findRole(roleKey);
  if (!role) return;
  delete S.pendingFiles[roleKey];
  var file = roleEl('data-role-file', roleKey);
  if (file) file.value = '';
  role.items.forEach(function (item) {
    if (!item.Editable) return;
    var input = inputFor(item);
    if (!input) return;
    input.value = formatNumValue(item.Realization);
    if (input.classList) input.classList.toggle('is-long', !!realizationClass(input.value));
    var holder = document.querySelector('[data-status-for="' + attr(item.Mapping_ID) + '"]');
    if (holder) holder.innerHTML = statusPill(item);
    var hint = document.querySelector('[data-hint-for="' + attr(item.Mapping_ID) + '"]');
    if (hint) hint.textContent = scaleHint(item.Realization);
  });
  var declare = roleEl('data-role-declare', roleKey);
  if (declare) declare.checked = false;
  renderEvidence(roleKey);
  renderTableFooter(roleKey);
  renderRoleSubmit(roleKey);
}

function celebrateSubmit() {
  var key = S.justSubmitted;
  S.justSubmitted = '';
  if (!key) return;
  var box = roleEl('data-role-receipt', key);
  var shown = !!box && !box.classList.contains('hidden');
  var target = shown ? box : roleEl('data-role-section', key);
  if (!target) return;
  var calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (target.scrollIntoView) target.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
  if (!shown) return;
  box.classList.add('is-fresh');
  setTimeout(function () { box.classList.remove('is-fresh'); }, 1800);
}

function wireDropzone(roleKey) {
  var zone = roleEl('data-role-dropzone', roleKey);
  var input = roleEl('data-role-file', roleKey);
  if (!zone || !input) return;

  zone.onclick = function () { input.click(); };
  input.onclick = function (e) { e.stopPropagation(); };
  input.onchange = function () { if (input.files[0]) acceptFile(roleKey, input.files[0]); };

  ['dragenter', 'dragover'].forEach(function (ev) {
    zone.addEventListener(ev, function (e) {
      e.preventDefault(); zone.classList.add('is-dragging');
    });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    zone.addEventListener(ev, function (e) {
      e.preventDefault(); zone.classList.remove('is-dragging');
    });
  });
  zone.addEventListener('drop', function (e) {
    if (e.dataTransfer.files[0]) acceptFile(roleKey, e.dataTransfer.files[0]);
  });
}

function acceptFile(roleKey, file) {
  var ext = file.name.split('.').pop().toLowerCase();
  if (S.user.allowedExt.indexOf(ext) === -1) {
    toast('File type .' + ext + ' is not allowed. Use: ' +
          S.user.allowedExt.join(', ').toUpperCase() + '.', 'error');
    return;
  }
  if (file.size > S.user.maxFileMb * 1024 * 1024) {
    toast('File size ' + (file.size / 1048576).toFixed(1) + ' MB exceeds the limit of ' +
          S.user.maxFileMb + ' MB.', 'error');
    return;
  }

  var reader = new FileReader();
  reader.onload = function () {
    S.pendingFiles[roleKey] = {
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      bytes:    reader.result.split(',')[1],
      sizeMb:   Math.round(file.size / 1048576 * 100) / 100
    };
    renderEvidence(roleKey); renderRoleSubmit(roleKey);
    var role = findRole(roleKey);
    toast('File ready to upload for ' + (role ? role.label : 'this role') + ': ' + file.name, 'success');
  };
  reader.onerror = function () { toast('Could not read the file. Please try again.', 'error'); };
  reader.readAsDataURL(file);
}

function clearFile(roleKey) {
  delete S.pendingFiles[roleKey];
  var input = roleEl('data-role-file', roleKey);
  if (input) input.value = '';
  renderEvidence(roleKey); renderRoleSubmit(roleKey);
}

function renderEvidence(roleKey) {
  var role = findRole(roleKey);
  var statusEl = roleEl('data-role-evstatus', roleKey);
  var box = roleEl('data-role-preview', roleKey);
  if (!role || !statusEl || !box) return;

  var pending = S.pendingFiles[roleKey];
  var saved = role.evidence;

  statusEl.innerHTML = !saved
    ? (evidenceOptional()
        ? '<span class="pill pill-neutral" title="Evidence is optional in FY' + esc(S.dashboard.year) + '"><span class="material-symbols-outlined text-[14px]">cloud_off</span> Optional</span>'
        : '<span class="pill pill-neutral"><span class="material-symbols-outlined text-[14px]">cloud_off</span> No Evidence Yet</span>')
    : saved.legacy
      ? '<span class="pill pill-neutral"><span class="material-symbols-outlined text-[14px]">inventory_2</span> Combined evidence (legacy)</span>'
      : '<span class="pill pill-' + (saved.Status === 'Revised' ? 'warning' : 'success') + '">' +
          '<span class="material-symbols-outlined text-[14px]">cloud_done</span> ' + esc(saved.Status) + '</span>';

  if (!pending && !saved) { box.classList.add('hidden'); box.innerHTML = ''; return; }
  box.classList.remove('hidden');

  var name = pending ? pending.fileName : saved.File_Name;
  var meta = pending
    ? pending.sizeMb + ' MB • Ready to submit'
    : saved.legacy
      ? 'Uploaded ' + fmtDate(saved.Uploaded_At) + '. Legacy combined evidence, valid until replaced per role.'
      : 'Uploaded ' + fmtDate(saved.Uploaded_At) + ' • Status: ' + saved.Status;

  box.innerHTML =
    '<div class="flex items-center justify-between gap-space-md p-space-md bg-surface-page rounded-lg border border-border-light">' +
      '<div class="flex items-center gap-space-sm min-w-0">' +
        '<span class="material-symbols-outlined text-primary-container">description</span>' +
        '<div class="flex flex-col min-w-0">' +
          '<span class="text-body-md font-semibold text-text-primary truncate">' + esc(name) + '</span>' +
          '<span class="text-body-sm text-text-muted">' + esc(meta) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="flex items-center gap-space-xs shrink-0">' +
        (saved && !pending
          ? '<a href="' + esc(saved.File_URL) + '" target="_blank" rel="noopener" class="btn btn-secondary !py-1.5 !px-3 !text-label-sm">' +
            '<span class="material-symbols-outlined text-[16px]">visibility</span> View</a>'
          : '') +
        (pending
          ? '<button class="btn-trash" onclick="MGI.clearFile(\'' + esc(roleKey) + '\')" title="Remove file">' +
            '<span class="material-symbols-outlined text-[20px]">close</span></button>'
          : '') +
      '</div>' +
    '</div>' +
    (pending && saved
      ? '<p class="text-body-sm text-status-warning-text mt-2 flex items-center gap-1.5">' +
        '<span class="material-symbols-outlined text-[15px]">warning</span> ' +
        (saved.legacy
          ? 'This file becomes the evidence for this role only. The legacy combined evidence stays valid for other roles.'
          : 'The previous file for this role will be moved to Trash and replaced by this new file.') +
        '</p>'
      : '');
}

function renderSubmitState() {
  var d = S.dashboard;
  if (!d) return;
  var ps = d.periodState;
  var open = ps.isOpen;

  var status = $('emp-period-status');
  if (status) {
    var countdown = open ? cutoffCountdown(ps.cutoff, Date.now()) : null;
    status.innerHTML = '<span class="flex flex-wrap items-center gap-2">' +
      (open
        ? '<span class="pill pill-success"><span class="w-2 h-2 rounded-full bg-status-success"></span> ' +
          esc(periodStatusText(ps)) + '</span>'
        : '<span class="pill pill-neutral"><span class="material-symbols-outlined text-[14px]">lock</span> ' +
          esc(periodStatusText(ps)) + '</span>') +
      (countdown
        ? '<span class="pill pill-' + countdown.tone + '"><span class="material-symbols-outlined text-[14px]">' + countdown.icon + '</span> ' +
          countdown.label + '</span>'
        : '') +
    '</span>';
  }

  (d.roles || []).forEach(function (r) { renderRoleSubmit(r.key); });
}

function roleSubmitReadiness(role) {
  var missing = [];
  var required = 0;
  (role.items || []).forEach(function (item) {
    if (item.IsActive === false || item.Duration !== 'Monthly') return;
    required++;
    var input = document.querySelector('input[data-mapping="' + attr(item.Mapping_ID) + '"]');
    var raw = input ? parseNumText(input.value) : item.Realization;
    if (raw === '' || raw === null || raw === undefined || isNaN(raw)) missing.push(item);
  });
  var hasEvidence = !!S.pendingFiles[role.key] || !!role.evidence;
  var optional = evidenceOptional();
  return { ok: !missing.length && (hasEvidence || optional), missing: missing, hasEvidence: hasEvidence, evidenceOptional: optional, required: required };
}

function readinessMessage(ready) {
  var parts = [];
  if (ready.missing.length) {
    parts.push('fill ' + ready.missing.length + (ready.missing.length === 1 ? ' monthly KPI' : ' monthly KPIs'));
  }
  if (!ready.hasEvidence && !ready.evidenceOptional) parts.push('attach the evidence file');
  return parts.join(' and ');
}

function renderRoleSubmit(roleKey) {
  var d = S.dashboard;
  var r = findRole(roleKey);
  if (!d || !r || r.inactiveRole) return;

  var ps = d.periodState;
  var open = ps.isOpen;
  var ready = roleSubmitReadiness(r);
  var btn = roleEl('data-role-submit', r.key);
  var hint = roleEl('data-role-hint', r.key);
  var declare = roleEl('data-role-declare', r.key);

  var changes = roleChanges(r);
  var dirty = roleDirty(r);
  var unchanged = changes.submitted && !dirty;
  var settled = unchanged && ready.ok;
  var receipt = roleEl('data-role-receipt', r.key);
  var form = roleEl('data-role-form', r.key);
  if (receipt) {
    receipt.innerHTML = settled ? receiptHtml(r) : '';
    receipt.classList.toggle('hidden', !settled);
  }
  if (form) form.classList.toggle('hidden', settled);
  var discard = roleEl('data-role-discard', r.key);
  if (discard) discard.classList.toggle('hidden', !(open && changes.submitted && dirty));
  var label = roleEl('data-role-submit-label', r.key);
  if (label) label.textContent = changes.submitted ? 'Submit changes' : 'Submit ' + r.label;
  if (btn) btn.disabled = !open || !ready.ok || unchanged;
  if (declare) declare.disabled = !open;
  var steps = roleEl('data-role-steps', r.key);
  if (steps) steps.innerHTML = roleStepsHtml(ready, !!(declare && declare.checked), open);
  renderTableFooter(r.key);
  if (!hint) return;

  hint.innerHTML = !open
    ? '<span class="material-symbols-outlined text-[16px] text-text-muted">lock</span> ' + esc(periodStatusText(ps)) + '.'
    : !ready.ok
      ? '<span class="material-symbols-outlined text-[16px] text-status-warning">pending_actions</span> ' +
        'Almost there: ' + esc(readinessMessage(ready)) + '.'
      : unchanged
        ? '<span class="material-symbols-outlined text-[16px] text-status-success">task_alt</span> ' +
          'Submitted. Nothing has changed since your last submission.'
        : changes.submitted
          ? '<span class="material-symbols-outlined text-[16px] text-status-info">history</span> ' +
            (changes.left === 1
              ? 'Ready to submit. This is your last change for ' + esc(MONTHS[d.month - 1]) + '.'
              : 'Ready to submit. This uses 1 of your ' + changes.left + ' changes left.')
          : '<span class="material-symbols-outlined text-[16px] text-status-success">task_alt</span> ' +
            'Ready to submit. ' + esc(periodStatusText(ps)) + '. After that you can still change it ' + changesWord(changes.left) + '.';
}

function collectDrafts(exceptKey) {
  var drafts = {};
  ((S.dashboard && S.dashboard.items) || []).forEach(function (item) {
    if (item.RoleKey === exceptKey || !item.Editable) return;
    var input = document.querySelector('input[data-mapping="' + attr(item.Mapping_ID) + '"]');
    if (!input) return;
    var serverValue = item.Realization === null || item.Realization === undefined || item.Realization === '' ? null : Number(item.Realization);
    if (String(parseNumText(input.value)) !== String(serverValue)) drafts[item.Mapping_ID] = input.value;
  });
  return drafts;
}

function applyDrafts(drafts) {
  Object.keys(drafts).forEach(function (mappingId) {
    var input = document.querySelector('input[data-mapping="' + attr(mappingId) + '"]');
    if (!input || input.disabled) return;
    input.value = drafts[mappingId];
    onRealisasiInput(input);
  });
}

function collectDeclares(exceptKey) {
  var out = {};
  ((S.dashboard && S.dashboard.roles) || []).forEach(function (r) {
    if (r.key === exceptKey) return;
    var box = roleEl('data-role-declare', r.key);
    if (box && box.checked) out[r.key] = true;
  });
  return out;
}

function applyDeclares(map) {
  Object.keys(map).forEach(function (key) {
    var box = roleEl('data-role-declare', key);
    if (box && !box.disabled) box.checked = true;
  });
}

function submitRole(roleKey) {
  var d = S.dashboard;
  var role = findRole(roleKey);
  if (!role || role.inactiveRole) return;

  var ready = roleSubmitReadiness(role);
  if (!ready.ok) {
    toast('Before submitting ' + role.label + ', ' + readinessMessage(ready) + '.', 'warning');
    renderRoleSubmit(roleKey);
    return;
  }

  var declare = roleEl('data-role-declare', roleKey);
  if (!declare || !declare.checked) {
    toast('Please tick the declaration for ' + role.label + ' before submitting.', 'warning');
    if (declare && declare.focus) declare.focus();
    return;
  }

  var changes = roleChanges(role);
  if (changes.submitted && !roleDirty(role)) {
    toast('Nothing has changed since your last submission for ' + role.label + '.', 'info');
    return;
  }

  var records = [];
  var invalid = [];
  var huge = [];
  role.items.forEach(function (item) {
    if (!item.Editable) return;
    var input = document.querySelector('input[data-mapping="' + attr(item.Mapping_ID) + '"]');
    var value = input ? parseNumText(input.value) : null;
    if (value === null) return;
    if (isNaN(value)) {
      invalid.push(item.KPI_Name || item.KPI_ID);
      return;
    }
    if (tooLarge(value)) {
      huge.push(item.KPI_Name || item.KPI_ID);
      return;
    }
    records.push({ Mapping_ID: item.Mapping_ID, Realization: value });
  });

  if (invalid.length) {
    toast('Realization is not a valid number for: ' + invalid.join(', ') + '.', 'error');
    return;
  }
  if (huge.length) {
    toast('Realization is too large for: ' + huge.join(', ') + '. The limit is ' + num(maxRealization(), 0) + '.', 'error');
    return;
  }

  var pending = S.pendingFiles[roleKey] || null;

  if (!records.length && !pending) {
    toast('Enter at least one realization or upload an evidence document for ' + role.label + '.', 'warning');
    return;
  }

  var fileData = pending ? {
    fileName:   pending.fileName,
    mimeType:   pending.mimeType,
    bytes:      pending.bytes,
    position:   role.position,
    department: role.department
  } : null;

  var keepFiles = {};
  Object.keys(S.pendingFiles).forEach(function (k) {
    if (k !== roleKey) keepFiles[k] = S.pendingFiles[k];
  });
  var keep = { drafts: collectDrafts(roleKey), files: keepFiles, declares: collectDeclares(roleKey) };
  var job = { roleKey: roleKey, period: d.period, records: records, fileData: fileData, keep: keep };

  if (changes.submitted && changes.left === 1) {
    S.submitConfirm = job;
    $('modal-host').innerHTML =
      '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closeLastChange()">' +
        '<div class="modal-panel !max-w-md">' +
          '<div class="px-6 pt-6 pb-5 flex items-start gap-4">' +
            '<span class="w-10 h-10 rounded-full bg-status-warning-subtle text-status-warning flex items-center justify-center shrink-0">' +
              '<span class="material-symbols-outlined text-[22px]">history</span></span>' +
            '<div class="min-w-0">' +
              '<h2 class="text-title-lg text-text-primary">Use your last change for ' + esc(role.label) + '?</h2>' +
              '<p class="text-body-sm text-text-secondary mt-1">After this, only HR / Admin can allow another change for ' +
                esc(MONTHS[d.month - 1] + ' ' + d.year) + '. Check your values and file once more before you send them.</p>' +
            '</div>' +
          '</div>' +
          '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex items-center justify-end gap-space-sm">' +
            '<button class="btn btn-secondary" onclick="MGI.closeLastChange()">Keep editing</button>' +
            '<button id="last-change-confirm" class="btn btn-primary" onclick="MGI.confirmLastChange()">' +
              '<span class="material-symbols-outlined text-[18px]">send</span> Submit changes</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    return;
  }

  sendRoleJob(job);
}

function closeLastChange() {
  S.submitConfirm = null;
  $('modal-host').innerHTML = '';
}

function confirmLastChange() {
  var job = S.submitConfirm;
  closeLastChange();
  if (job) sendRoleJob(job);
}

function sendRoleJob(job) {
  var role = findRole(job.roleKey);
  if (!role) return;
  var button = roleEl('data-role-submit', job.roleKey);
  var restore = busy(button, 'Submitting');
  var slow = setTimeout(function () {
    if (button && button.disabled) button.innerHTML = '<span class="spinner"></span> Still saving, please wait';
  }, SLOW_SUBMIT_MS);

  api('submitMonthlyKPI', S.user.NIK, job.period, job.records, job.fileData)
    .then(function (res) {
      clearTimeout(slow);
      restore();
      toast('Thank you, ' + displayName(S.user.Full_Name) + '. ' + role.label + ': ' + res.message, 'success');
      S.justSubmitted = job.roleKey;
      loadMyKpis(job.keep);
    })
    .catch(function (err) {
      clearTimeout(slow);
      restore();
      toast(err.message, 'error');
    });
}
