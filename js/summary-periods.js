'use strict';

function periodName(period) {
  var parts = String(period || '').split('_');
  var m = parseInt(parts[1], 10);
  return m >= 1 && m <= 12 ? MONTHS[m - 1] + ' ' + parts[0] : String(period || '');
}

function buildPeriodJs(year, month) {
  return String(year) + '_' + (month < 10 ? '0' + month : String(month));
}

function toDateInput(iso) {
  if (!iso) return '';
  var t = new Date(iso).getTime();
  if (isNaN(t)) return '';
  return new Date(t + 7 * 3600000).toISOString().slice(0, 10);
}

function cutoffIso(dateValue) {
  return dateValue ? dateValue + 'T23:59:00+07:00' : '';
}

function plusDaysInput(days) {
  return toDateInput(new Date(Date.now() + days * 86400000).toISOString());
}

function suggestedCutoff(p) {
  if (p && p.Cutoff_Date && futureDate(toDateInput(p.Cutoff_Date))) return toDateInput(p.Cutoff_Date);
  var latest = '';
  (S.periods || []).forEach(function (x) {
    if (!x.Effective_Open || !x.Cutoff_Date) return;
    var v = toDateInput(x.Cutoff_Date);
    if (futureDate(v) && v > latest) latest = v;
  });
  return latest || plusDaysInput(7);
}

function futureDate(value) {
  return !!value && new Date(cutoffIso(value)).getTime() > Date.now();
}

function shortDate(iso) {
  return fmtDate(iso).replace(/ \d{4}$/, '');
}

function periodYear() {
  return S.periodYear || S.user.year;
}

function periodYears() {
  var years = [S.user.year];
  if (S.user.year - 1 >= (S.user.setupYear || S.user.year)) years.push(S.user.year - 1);
  return years;
}

function onPeriodYearChange(value) {
  var year = parseInt(value, 10);
  if (!year || year === periodYear()) return;
  S.periodYear = year;
  S.periods = [];
  S.periodBusy = {};
  loadPeriodSettings();
}

function loadPeriodSettings() {
  var host = $('period-control');
  var year = periodYear();
  if (host && !(S.periods && S.periods.length)) host.innerHTML = '<div class="skeleton h-40 w-full"></div>';

  api('getPeriodSettings', year)
    .then(function (list) {
      if (year !== periodYear()) return;
      S.periods = list;
      renderPeriodControl();
    })
    .catch(function (err) {
      $('period-control').innerHTML = loadErrorHtml(err.message, 'loadPeriodSettings');
    });
}

function renderPeriodControl() {
  var host = $('period-control');
  if (!host || !S.periods || !S.periods.length) return;

  var kinds = S.periods.map(periodKind);
  var count = function (k) { return kinds.filter(function (x) { return x === k; }).length; };
  var openCount = S.periods.filter(function (p) { return p.Effective_Open; }).length;
  var notes = [];
  if (count('reopened')) notes.push(count('reopened') + ' reopened');
  if (count('early')) notes.push(count('early') + ' not started yet');
  var year = periodYear();
  var years = periodYears();
  var previous = year < S.user.year;
  var busyAny = Object.keys(S.periodBusy).length > 0;

  host.innerHTML =
    '<div class="flex flex-col lg:flex-row lg:items-start justify-between gap-space-md mb-space-md">' +
      '<div>' +
        '<h2 class="text-title-lg text-text-primary flex items-center gap-space-sm">Submission Period Control' +
          '<span class="pill ' + (previous ? 'pill-neutral' : 'pill-brand') + ' !py-0.5 !text-[11px]">FY' + year + (previous ? ' • Previous year' : '') + '</span></h2>' +
        '<p class="text-body-sm text-text-muted max-w-2xl">Opening a month lets <strong class="text-text-secondary">every employee</strong> submit or change it until its cut-off. ' +
          'Uncheck it to lock it again.</p>' +
        '<p class="text-body-sm text-text-muted mt-1"><strong class="text-text-secondary">' + openCount + ' of 12</strong> periods open' +
          (notes.length ? ': ' + notes.join(', ') : '') + '.</p>' +
      '</div>' +
      '<div class="flex flex-wrap items-end gap-space-sm shrink-0">' +
        (years.length > 1
          ? '<label class="flex flex-col shrink-0">' +
              '<span class="form-label">Year</span>' +
              '<select id="period-year" class="field !py-1.5 !text-label-sm" onchange="MGI.onPeriodYearChange(this.value)">' +
                years.map(function (y) {
                  return '<option value="' + y + '"' + (y === year ? ' selected' : '') + '>FY' + y + (y === S.user.year ? ' (Active)' : ' (Previous year)') + '</option>';
                }).join('') +
              '</select>' +
            '</label>'
          : '') +
        (openCount
          ? '<button type="button" class="btn btn-secondary !py-1.5 !text-label-sm" onclick="MGI.openPeriodBulk()"' + (busyAny ? ' disabled' : '') +
              ' title="Give several open months the same cut-off">' +
              '<span class="material-symbols-outlined text-[18px]">edit_calendar</span> Change cut-off</button>'
          : '') +
      '</div>' +
    '</div>' +
    (previous
      ? '<div class="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-2.5 mb-space-md text-body-sm text-amber-800 flex items-start gap-2">' +
          '<span class="material-symbols-outlined text-[18px]">history</span>' +
          '<span>FY' + year + ' is the previous fiscal year. Reopen a month only for late submissions or corrections. ' +
            'Employees find it under FY' + year + ' in the My KPIs period list.</span>' +
        '</div>'
      : '') +
    '<div class="period-grid">' + S.periods.map(periodCell).join('') + '</div>' +
    '<p class="mt-space-md text-label-xs text-text-muted flex flex-wrap items-center gap-x-2 gap-y-1">' +
      '<span class="material-symbols-outlined text-[16px]">event_repeat</span>' +
      'Starting a new fiscal year? Switch the active year first, then its months appear here.' +
      '<button type="button" class="text-primary-container font-semibold rounded-md px-1.5 py-0.5 transition-all duration-150 hover:bg-brand-50" onclick="MGI.setSettingsTab(\'fiscal\')">Open Fiscal Year</button>' +
    '</p>';
}

function regularCutoff(period) {
  var parts = String(period || '').split('_');
  return new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10), CUTOFF_DAY, 16, 59, 0));
}

function periodStarted(period, now) {
  var parts = String(period || '').split('_');
  return (now || Date.now()) >= Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1, -7, 0, 0);
}

function periodKind(p) {
  if (!p.Effective_Open) return p.Is_Open && p.Expired ? 'expired' : 'locked';
  if (!periodStarted(p.Period)) return 'early';
  return Date.now() > regularCutoff(p.Period).getTime() ? 'reopened' : 'open';
}

function periodRow(period) {
  return (S.periods || []).filter(function (x) { return x.Period === period; })[0] || null;
}

function periodCell(p) {
  var m = parseInt(p.Period.split('_')[1], 10);
  var busyCell = !!S.periodBusy[p.Period];
  var kind = periodKind(p);
  var badge = kind === 'reopened'
    ? '<span class="period-badge" title="Its regular cut-off was ' + esc(fmtDate(regularCutoff(p.Period).toISOString())) + '">Reopened</span>'
    : kind === 'early' ? '<span class="period-badge" title="This month has not started yet">Early</span>' : '';
  var status = p.Effective_Open ? 'Open until ' + shortDate(p.Cutoff_Date)
             : kind === 'expired' ? 'Closed ' + shortDate(p.Cutoff_Date)
             : 'Locked';
  var tone = p.Effective_Open ? ' is-open' : kind === 'expired' ? ' is-expired' : '';
  var change = p.Effective_Open && !busyCell
    ? '<button type="button" class="period-change" onclick="MGI.openPeriodDate(\'' + esc(p.Period) + '\')" title="Change the cut-off of ' + esc(periodName(p.Period)) + '">' +
        '<span class="material-symbols-outlined text-[14px]" aria-hidden="true">edit_calendar</span>Change date</button>'
    : '';

  return '<div class="period-cell' + tone + (busyCell ? ' is-busy' : '') + '">' +
    '<label class="flex items-center gap-2 cursor-pointer min-w-0">' +
      '<input type="checkbox" class="w-4 h-4 rounded border-border-medium text-primary-container focus:ring-primary-container"' +
        (p.Effective_Open ? ' checked' : '') + (busyCell ? ' disabled' : '') +
        ' data-period="' + esc(p.Period) + '" onchange="MGI.onPeriodToggle(this)">' +
      '<span class="text-label-md text-text-primary font-semibold">' + esc(MONTHS[m - 1]) + '</span>' +
      badge +
      (busyCell ? '<span class="spinner spinner-dark !w-3 !h-3"></span>' : '') +
    '</label>' +
    '<span class="text-[11px] leading-tight ' + (p.Effective_Open ? 'text-status-success-text font-semibold' : 'text-text-muted') + '">' + esc(status) + '</span>' +
    change +
  '</div>';
}

function onPeriodToggle(el) {
  var period = el.dataset.period;
  var p = periodRow(period);
  if (!p) return;

  if (!el.checked) {
    applyPeriod(period, false, '');
    return;
  }

  el.checked = false;
  openPeriodConfirm('open', [period]);
}

function openPeriodDate(period) {
  openPeriodConfirm('move', [period]);
}

function openPeriodBulk() {
  openPeriodConfirm('bulk', (S.periods || []).filter(function (p) { return p.Effective_Open; }).map(function (p) { return p.Period; }));
}

function openPeriodConfirm(kind, periods) {
  var list = (periods || []).map(periodRow).filter(function (p) { return !!p; });
  if (!list.length) return;
  var first = list[0];
  var date = kind === 'move' ? toDateInput(first.Cutoff_Date) : suggestedCutoff(kind === 'open' ? first : null);
  if (!futureDate(date)) date = plusDaysInput(7);
  var picked = {};
  list.forEach(function (p) { picked[p.Period] = true; });
  S.periodConfirm = { kind: kind, periods: list.map(function (p) { return p.Period; }), picked: picked, date: date };

  var name = periodName(first.Period);
  var early = kind === 'open' && !periodStarted(first.Period);
  var reopen = kind === 'open' && !early && Date.now() > regularCutoff(first.Period).getTime();
  var title = kind === 'bulk' ? 'Change the cut-off of open months'
            : kind === 'move' ? 'Change the cut-off of ' + name + '?'
            : (reopen ? 'Reopen ' : 'Open ') + name + (early ? ' early' : '') + '?';
  var today = toDateInput(new Date().toISOString());

  $('modal-host').innerHTML =
    '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closePeriodConfirm()">' +
      '<div class="modal-panel !max-w-md" role="dialog" aria-modal="true" aria-labelledby="period-confirm-title">' +
        '<div class="px-6 pt-6 pb-5 flex items-start gap-4">' +
          '<span class="w-10 h-10 rounded-full ' + (early ? 'bg-status-warning-subtle text-status-warning' : 'bg-brand-50 text-primary-container') + ' flex items-center justify-center shrink-0">' +
            '<span class="material-symbols-outlined text-[22px]">' + (early ? 'warning' : kind === 'open' ? 'event_available' : 'edit_calendar') + '</span></span>' +
          '<div class="min-w-0 flex-1">' +
            '<h2 id="period-confirm-title" class="text-title-lg text-text-primary">' + esc(title) + '</h2>' +
            '<label class="flex flex-col mt-space-md">' +
              '<span class="form-label">' + (kind === 'open' ? 'Open until' : 'New cut-off') + '</span>' +
              '<input id="period-date" type="date" class="field !py-1.5" min="' + esc(today) + '" value="' + esc(date) + '"' +
                ' oninput="MGI.onPeriodDateInput(this.value)" onchange="MGI.onPeriodDateInput(this.value)">' +
            '</label>' +
            (kind === 'bulk'
              ? '<div class="period-bulk-list mt-space-md" role="group" aria-label="Open months">' + list.map(function (p) {
                  return '<label class="period-bulk-row">' +
                    '<input type="checkbox" class="w-4 h-4 rounded border-border-medium text-primary-container" checked' +
                      ' data-bulk-period="' + esc(p.Period) + '" onchange="MGI.togglePeriodBulkPick(\'' + esc(p.Period) + '\')">' +
                    '<span class="flex-1 min-w-0 text-body-sm font-semibold text-text-primary">' + esc(periodName(p.Period)) + '</span>' +
                    '<span class="text-label-xs text-text-muted">until ' + esc(shortDate(p.Cutoff_Date)) + '</span>' +
                  '</label>';
                }).join('') + '</div>'
              : '') +
            '<p id="period-confirm-text" class="text-body-sm text-text-secondary mt-space-md"></p>' +
            '<p id="period-confirm-note" class="text-body-sm text-text-secondary mt-2"></p>' +
            (reopen
              ? '<p class="text-body-sm text-text-secondary mt-2">Its regular cut-off was ' + esc(fmtDate(regularCutoff(first.Period).toISOString())) +
                  '. Lock it again once the late submissions are in.</p>'
              : '') +
            (early
              ? '<div class="mt-space-md rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-body-sm text-amber-900">' + esc(name) +
                  ' has not started yet. Employees could fill it in before the month is over.</div>'
              : '') +
          '</div>' +
        '</div>' +
        '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex items-center justify-end gap-space-sm">' +
          '<button type="button" class="btn btn-secondary" onclick="MGI.closePeriodConfirm()">Cancel</button>' +
          '<button id="period-confirm" type="button" class="btn btn-primary" onclick="MGI.confirmPeriodChange()"></button>' +
        '</div>' +
      '</div>' +
    '</div>';
  syncPeriodConfirm();
}

function periodConfirmTargets(c) {
  return c.kind === 'bulk' ? c.periods.filter(function (p) { return c.picked[p]; }) : c.periods.slice();
}

function syncPeriodConfirm() {
  var c = S.periodConfirm;
  if (!c) return;
  var targets = periodConfirmTargets(c);
  var valid = futureDate(c.date);
  var until = valid ? fmtDate(cutoffIso(c.date)) : '';
  var first = periodRow(c.periods[0]);
  var oldDate = first ? toDateInput(first.Cutoff_Date) : '';
  var name = c.kind === 'bulk' ? (targets.length === 1 ? periodName(targets[0]) : 'the ' + targets.length + ' selected months') : periodName(c.periods[0]);
  var same = c.kind === 'move' && c.date === oldDate;
  var label = !valid ? 'Pick a date from today'
            : c.kind === 'bulk' ? 'Apply to ' + plural(targets.length, 'month')
            : c.kind === 'move' ? (same ? 'Pick a new date' : (c.date > oldDate ? 'Extend' : 'Shorten') + ' to ' + shortDate(cutoffIso(c.date)))
            : (Date.now() > regularCutoff(c.periods[0]).getTime() && periodStarted(c.periods[0]) ? 'Reopen' : 'Open') + ' until ' + shortDate(cutoffIso(c.date));
  var text = $('period-confirm-text');
  if (text) {
    text.innerHTML = !valid ? '<span class="text-status-danger-text">Choose a cut-off date from today onward.</span>'
      : !targets.length ? 'Select at least one month.'
      : 'Every employee can submit or change ' + esc(name) + ' until <strong>' + esc(until) + ', 23:59 WIB</strong>.';
  }
  var note = $('period-confirm-note');
  if (note) {
    note.textContent = c.kind === 'move' && valid && !same && first ? 'The cut-off moves from ' + fmtDate(first.Cutoff_Date) + ' to ' + until + '.' : '';
    note.classList.toggle('hidden', !note.textContent);
  }
  var btn = $('period-confirm');
  if (btn) {
    btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">' + (c.kind === 'open' ? 'lock_open' : 'edit_calendar') + '</span> ' + esc(label);
    btn.disabled = !valid || !targets.length || same;
  }
}

function onPeriodDateInput(value) {
  if (!S.periodConfirm) return;
  S.periodConfirm.date = String(value || '');
  syncPeriodConfirm();
}

function togglePeriodBulkPick(period) {
  var c = S.periodConfirm;
  if (!c) return;
  c.picked[period] = !c.picked[period];
  syncPeriodConfirm();
}

function closePeriodConfirm() {
  S.periodConfirm = null;
  $('modal-host').innerHTML = '';
}

function confirmPeriodChange() {
  var c = S.periodConfirm;
  if (!c || !futureDate(c.date)) return;
  var targets = periodConfirmTargets(c);
  if (!targets.length) return;
  var first = periodRow(c.periods[0]);
  if (c.kind === 'move' && first && toDateInput(first.Cutoff_Date) === c.date) return;
  var cutoff = cutoffIso(c.date);
  closePeriodConfirm();
  if (c.kind !== 'bulk') {
    applyPeriod(targets[0], true, cutoff);
    return;
  }
  applyPeriodBulk(targets, cutoff);
}

function savePeriodState(period, state) {
  S.periods = S.periods.map(function (p) {
    if (p.Period !== period) return p;
    return {
      Period: p.Period, Is_Open: state.rawOpen, Expired: state.expired,
      Effective_Open: state.isOpen, Cutoff_Date: state.cutoff, Notes: p.Notes, Exists: true
    };
  });
}

function applyPeriod(period, open, cutoff) {
  S.periodBusy[period] = true;
  renderPeriodControl();

  return api('setPeriodLock', period, open, cutoff)
    .then(function (state) {
      delete S.periodBusy[period];
      savePeriodState(period, state);
      renderPeriodControl();
      toast(periodName(period) + (open ? ' is open for every employee until ' + fmtDate(state.cutoff) : ' is locked') + '.', 'success');
    })
    .catch(function (err) {
      delete S.periodBusy[period];
      renderPeriodControl();
      toast(err.message, 'error');
    });
}

function applyPeriodBulk(periods, cutoff) {
  periods.forEach(function (p) { S.periodBusy[p] = true; });
  renderPeriodControl();
  var done = 0;
  var last = null;
  var chain = null;
  periods.forEach(function (period) {
    var step = function () {
      return api('setPeriodLock', period, true, cutoff).then(function (state) {
        delete S.periodBusy[period];
        savePeriodState(period, state);
        last = state;
        done++;
        renderPeriodControl();
      });
    };
    chain = chain ? chain.then(step) : step();
  });
  return chain
    .then(function () {
      toast(plural(done, 'month') + ' open for every employee until ' + fmtDate(last ? last.cutoff : cutoff) + '.', 'success');
    })
    .catch(function (err) {
      S.periodBusy = {};
      renderPeriodControl();
      toast((done ? plural(done, 'month') + ' saved before the error. ' : '') + err.message, 'error');
    });
}
