'use strict';

function renderSummaryTabs() {
  var rows = baseRows();
  var done = rows.filter(function (r) { return r.submitted > 0; }).length;
  var pending = rows.length - done;

  var locked = rows.filter(rowChangeLocked).length;
  var tabs = [
    { key: 'all',     label: 'All', count: rows.length },
    { key: 'done',    label: 'Submitted', count: done },
    { key: 'pending', label: 'Not Submitted', count: pending },
    { key: 'locked',  label: 'No Changes Left', count: locked }
  ].filter(function (t) { return t.key !== 'locked' || t.count > 0 || S.sumFilter === 'locked'; });

  $('sum-tabs').innerHTML = tabs.map(function (t) {
    var active = S.sumFilter === t.key;
    return '<button type="button" onclick="MGI.setSumFilter(\'' + t.key + '\')" class="seg-btn' +
           (active ? ' is-active' : '') + '">' +
           esc(t.label) + '<span class="seg-count">' + t.count + '</span></button>';
  }).join('');
}

function setSumFilter(key) {
  S.sumFilter = key;
  S.sumPage = 1;
  renderSummaryTabs();
  renderSummaryTable();
}

function renderSummaryTable() {
  var all = filteredRows();
  var size = pageSizeFor('monthly', all.length);
  var pages = Math.max(1, Math.ceil(all.length / size));
  if (S.sumPage > pages) S.sumPage = pages;
  var start = (S.sumPage - 1) * size;
  var page = all.slice(start, start + size);

  if (!all.length) {
    $('sum-tbody').innerHTML =
      '<tr><td colspan="5" class="text-center py-space-2xl">' +
        emptyState('search', 'No data matches these filters.') +
      '</td></tr>';
    $('sum-pagination').innerHTML = '';
    return;
  }

  var open = !!(S.summary.periodState && S.summary.periodState.isOpen);

  $('sum-tbody').innerHTML = page.map(function (r) {
    var unscored = r.submitted === 0;
    var b = band(r.index);
    var statusTone = unscored ? (open ? 'warning' : 'danger')
                   : r.statusKey === 'partial' ? 'warning'
                   : r.evidence || r.statusKey === 'submitted' ? 'success' : 'info';
    var statusText = unscored && open ? 'Not submitted yet' : r.status;
    var remindedAt = S.summary.reminders && S.summary.reminders[r.NIK] && reminderNeed(r) ? S.summary.reminders[r.NIK] : '';

    var chips = r.items.map(function (it, ix) {
      var title = it.KPI_Name + ', weight ' + it.WeightPercent + '%' +
                  (it.AutoScore ? ', off-cycle, scored automatically' : isNum(it.Realization) ? ', realization ' + it.Realization : ', not filled');
      var val = !isNum(it.ScoreDisplay)
        ? (it.InCycle ? '-' : '<span class="material-symbols-outlined text-[12px] align-middle">lock</span>')
        : '<strong class="text-text-primary">' + num(it.ScoreDisplay, 0) + '</strong>';
      return '<span class="px-2 py-0.5 rounded bg-surface-page border border-border-light text-label-xs text-text-secondary" title="' +
             esc(title) + '">K' + (ix + 1) + ': ' + val + '</span>';
    }).join('');

    var score = unscored
      ? '<div class="flex items-center justify-end gap-space-sm">' +
          '<span class="text-body-md font-bold text-text-muted">-' +
            '<span class="font-normal text-label-xs">/100</span></span>' +
        '</div>' +
        '<span class="pill pill-neutral mt-1">Not Scored</span>'
      : '<div class="flex items-center justify-end gap-space-sm">' +
          '<span class="text-body-md font-bold text-text-primary">' + num(r.index) +
            '<span class="text-text-muted font-normal text-label-xs">/100</span></span>' +
          '<div class="w-12 bg-surface-container h-1.5 rounded-full overflow-hidden">' +
            '<div class="h-full bg-status-' + b.key + '" style="width:' + Math.max(0, Math.min(100, r.index)) + '%"></div>' +
          '</div>' +
        '</div>' +
        '<span class="pill pill-' + b.key + ' mt-1">' + b.label + '</span>';

    return '' +
    '<tr>' +
      '<td>' +
        '<div class="flex items-center gap-space-sm min-w-0">' +
          '<div class="w-9 h-9 rounded-full bg-primary-container text-white flex items-center justify-center text-label-xs font-bold shrink-0">' +
            esc(r.Initials) + '</div>' +
          '<div class="flex flex-col min-w-0">' +
            nameLink(r.Full_Name, r.NIK, r.roleKey, S.summary.year, 'text-body-md font-bold truncate') +
            '<span class="text-label-xs text-text-secondary">' + esc(r.Position) + ' / ' + esc(r.Department) + '</span>' +
            '<span class="flex items-center gap-1 flex-wrap text-[11px] text-text-muted">NIK ' + esc(r.NIK) +
              (r.isHome ? '' : '<span class="pill pill-maroon !py-0 !px-1.5 !text-[11px]">Additional Role</span>') +
              (r.roleInactive ? '<span class="pill pill-neutral !py-0 !px-1.5 !text-[11px]">Inactive Role</span>' : '') +
            '</span>' +
          '</div>' +
        '</div>' +
      '</td>' +
      '<td><div class="flex flex-wrap gap-1.5">' + chips + '</div></td>' +
      '<td class="text-right whitespace-nowrap">' + score + '</td>' +
      '<td class="text-center"><span class="pill pill-' + statusTone + '">' +
        '<span class="material-symbols-outlined text-[14px]">' +
          (unscored ? 'schedule' : r.statusKey === 'partial' ? 'hourglass_top' : 'check_circle') +
        '</span> ' + esc(statusText) + '</span>' +
        (remindedAt ? '<span class="block mt-1 text-[11px] text-text-muted" title="' + esc(fmtDate(remindedAt)) + '">' + esc(reminderLabel(remindedAt)) + '</span>' : '') +
        changeInfo(r) +
      '</td>' +
      '<td class="text-center">' +
        (r.evidence
          ? '<a href="' + esc(r.evidence.File_URL) + '" target="_blank" rel="noopener noreferrer" ' +
            'class="btn btn-secondary !py-1.5 !px-3 !text-label-sm" title="' + esc(r.evidence.File_Name) + '" aria-label="View the evidence of ' + esc(r.Full_Name) + '">' +
              '<span class="material-symbols-outlined text-[16px] text-brand-maroon-dark">folder_open</span> View</a>' +
            (r.evidence.legacy ? '<span class="block text-[11px] text-text-muted mt-1">Combined evidence (legacy)</span>' : '')
          : '<span class="text-label-xs text-text-muted">No file</span>') +
      '</td>' +
    '</tr>';
  }).join('');

  renderPagination('sum-pagination', all.length, start, page.length, S.sumPage, size, 'monthly');
}

var PAGE_SIZES = [25, 50, 100, 0];

function pageSizeKey(view) {
  return view === 'eval' ? 'EVAL_PAGE_SIZE' : view === 'annual' ? 'ANN_PAGE_SIZE' : 'PAGE_SIZE';
}

function pageSizeFor(view, total) {
  var n = S[pageSizeKey(view)];
  return n > 0 ? n : Math.max(1, total);
}

function restorePageSizes() {
  ['monthly', 'annual', 'eval'].forEach(function (view) {
    try {
      var n = parseInt(localStorage.getItem('mgi.pageSize.' + view), 10);
      if (PAGE_SIZES.indexOf(n) > -1) S[pageSizeKey(view)] = n;
    } catch (e) {}
  });
}

function setPageSize(view, value) {
  var n = parseInt(value, 10);
  if (PAGE_SIZES.indexOf(n) === -1) n = 25;
  S[pageSizeKey(view)] = n;
  try { localStorage.setItem('mgi.pageSize.' + view, String(n)); } catch (e) {}
  if (view === 'eval') {
    S.evalPage = 1;
    renderEvalBody();
  } else if (view === 'annual') {
    S.annPage = 1;
    renderAnnualTable();
  } else {
    S.sumPage = 1;
    renderSummaryTable();
  }
}

function scrollTableTop(bodyId) {
  var body = $(bodyId);
  var wrap = body && body.closest ? body.closest('.pin-wrap') : null;
  if (!wrap || !wrap.getBoundingClientRect) return;
  var host = wrap.querySelector('.pin-head');
  var offset = (host && parseFloat(host.style.top)) || 64;
  var top = wrap.getBoundingClientRect().top + window.pageYOffset - offset;
  if (window.pageYOffset > top) window.scrollTo({ top: top, behavior: 'smooth' });
}

function wirePinnedHeads() {
  PIN_TABLES.forEach(function (p) {
    var scroller = $(p.key + '-scroll');
    var host = $(p.key + '-pin');
    if (!scroller || !scroller.querySelector || scroller.dataset.pinned) return;
    scroller.dataset.pinned = '1';
    scroller.addEventListener('scroll', function () { alignPinnedHead(p.key); }, { passive: true });
    if (host && host.addEventListener) {
      host.addEventListener('wheel', function (e) {
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        scroller.scrollLeft += e.deltaX;
        e.preventDefault();
      }, { passive: false });
    }
    var table = scroller.querySelector('table');
    if (table && window.MutationObserver) new MutationObserver(schedulePins).observe(table, { childList: true, subtree: true });
    if (window.ResizeObserver) {
      var watch = new ResizeObserver(schedulePins);
      watch.observe(scroller);
      if ($(p.bar)) watch.observe($(p.bar));
    }
  });
  if (window.addEventListener) window.addEventListener('resize', schedulePins);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedulePins);
}

function schedulePins() {
  if (S.pinFrame) return;
  var run = function () {
    S.pinFrame = 0;
    PIN_TABLES.forEach(function (p) { pinTableHead(p.key, p.bar); });
  };
  S.pinFrame = window.requestAnimationFrame ? window.requestAnimationFrame(run) : setTimeout(run, 16);
}

function pinTop(barId) {
  var topbar = $('topbar');
  var top = (topbar && topbar.offsetHeight) || 64;
  var bar = $(barId);
  if (bar && window.getComputedStyle && window.getComputedStyle(bar).position === 'sticky') top += bar.offsetHeight || 0;
  return top;
}

function pinTableHead(key, barId) {
  var scroller = $(key + '-scroll');
  var host = $(key + '-pin');
  if (!scroller || !host || !scroller.querySelector) return;
  var table = scroller.querySelector('table');
  var head = table && table.tHead;
  var row = head && head.rows && head.rows[0];
  if (!row || !scroller.offsetWidth) {
    host.innerHTML = '';
    return;
  }
  var cols = Array.prototype.map.call(row.cells, function (cell) {
    return '<col style="width:' + cell.getBoundingClientRect().width + 'px">';
  }).join('');
  host.style.top = pinTop(barId) + 'px';
  host.innerHTML = '<div class="pin-head-scroll"><table class="' + esc(table.className) + '" style="table-layout:fixed;width:' +
    table.getBoundingClientRect().width + 'px"><colgroup>' + cols + '</colgroup><thead>' + head.innerHTML.replace(/<button /g, '<button tabindex="-1" ') + '</thead></table></div>';
  alignPinnedHead(key);
}

function alignPinnedHead(key) {
  var scroller = $(key + '-scroll');
  var host = $(key + '-pin');
  var inner = host && host.firstElementChild;
  if (inner && scroller) inner.scrollLeft = scroller.scrollLeft;
}

function renderPagination(hostId, total, start, shown, current, size, view) {
  var pages = Math.ceil(total / size);
  var buttons = '';
  var gapOpen = false;
  var chosen = S[pageSizeKey(view)];
  var noun = view === 'eval' ? (total === 1 ? 'scorecard' : 'scorecards') : (total === 1 ? 'role row' : 'role rows');

  for (var p = 1; p <= pages; p++) {
    var nearEdge = (p <= 2 || p >= pages - 1);
    var nearCurrent = Math.abs(p - current) <= 1;

    if (pages > 7 && !nearEdge && !nearCurrent) {
      if (!gapOpen) {
        buttons += '<span class="px-1.5 text-xs text-slate-500">...</span>';
        gapOpen = true;
      }
      continue;
    }
    gapOpen = false;

    buttons += '<button type="button" onclick="MGI.gotoPage(' + p + ', \'' + view + '\')" class="page-btn' +
               (p === current ? ' is-active" aria-current="page' : '') + '">' + p + '</button>';
  }

  $(hostId).innerHTML =
    '<div class="flex flex-wrap items-center gap-x-4 gap-y-2">' +
      '<label class="inline-flex items-center gap-2 text-body-sm text-text-secondary">Rows per page' +
        '<select class="field !w-auto !py-1 !pl-2.5 !pr-8 !text-label-sm" aria-label="Rows per page" onchange="MGI.setPageSize(\'' + view + '\', this.value)">' +
          PAGE_SIZES.map(function (n) {
            return '<option value="' + n + '"' + (n === chosen ? ' selected' : '') + '>' + (n ? n : 'All') + '</option>';
          }).join('') +
        '</select></label>' +
      '<p class="text-body-sm text-text-secondary">Showing <strong>' + (start + 1) + '-' +
        (start + shown) + '</strong> of <strong>' + total + '</strong> ' + noun + '</p>' +
    '</div>' +
    (pages > 1 ? '<div class="flex flex-wrap items-center gap-1.5">' + buttons + '</div>' : '');
}

function gotoPage(p, view) {
  if (view === 'eval') {
    S.evalPage = p;
    renderEvalBody();
    scrollTableTop('eval-tbody');
    return;
  }
  if (view === 'annual') {
    S.annPage = p;
    renderAnnualTable();
    scrollTableTop('ann-tbody');
    return;
  }
  S.sumPage = p;
  renderSummaryTable();
  scrollTableTop('sum-tbody');
}

function nameLink(name, nik, roleKey, year, extra) {
  return '<button type="button" class="name-link' + (extra ? ' ' + extra : '') + '" title="Open performance report"' +
    ' aria-label="Open the performance report for ' + esc(name) + '"' +
    ' onclick="MGI.openPerformanceReport(\'' + esc(nik) + '\', \'' + esc(roleKey) + '\', ' + year + ', \'modal\')">' +
    esc(name) + '</button>';
}

function renderDistribution() {
  var d = summaryStats(baseRows()).dist;
  var total = d.total || 1;

  var bar = function (label, count, colour) {
    var p = Math.round(count / total * 1000) / 10;
    return '<div class="mb-space-md">' +
      '<div class="flex items-center justify-between mb-1.5">' +
        '<span class="text-body-sm text-text-secondary flex items-center gap-1.5">' +
          '<span class="w-2 h-2 rounded-full ' + colour + '"></span> ' + esc(label) + '</span>' +
        '<span class="text-body-sm font-semibold text-text-primary">' + count + ' roles (' + pct(p) + ')</span>' +
      '</div>' +
      '<div class="w-full bg-surface-container h-2 rounded-full overflow-hidden">' +
        '<div class="' + colour + ' h-full rounded-full transition-all duration-500" style="width:' + p + '%"></div>' +
      '</div></div>';
  };

  $('sum-distribution').innerHTML =
    '<h2 class="text-title-lg text-text-primary mb-1">Rating Distribution</h2>' +
    '<p class="text-body-sm text-text-muted mb-space-lg">' +
      (d.total ? 'How the ' + plural(d.total, 'submitted role') + ' for ' + esc(sumMonthName()) + (d.total === 1 ? ' is rated.' : ' are rated.')
               : 'Ratings appear here once roles submit for ' + esc(sumMonthName()) + '.') + '</p>' +
    bar(bandRange('success'), d.sangatBaik, 'bg-status-success') +
    bar(bandRange('info'), d.baik, 'bg-status-info') +
    bar(bandRange('danger'), d.perluPerhatian, 'bg-status-danger') +
    (d.total === 0
      ? '<p class="text-body-sm text-text-muted text-center py-space-md">No roles have submitted for ' + esc(sumMonthName()) + ' yet.</p>'
      : '');
}

function exportCsv() {
  if (S.sumView === 'annual') {
    exportAnnualCsv();
    return;
  }

  var rows = filteredRows();
  if (!S.summary || !rows.length) {
    toast('No data to export.', 'warning');
    return;
  }

  var maxKpi = rows.reduce(function (m, r) { return Math.max(m, r.items.length); }, 0);

  var header = ['NIK', 'Full Name', 'Position (Role)', 'Department (Role)', 'Period'];
  for (var k = 1; k <= maxKpi; k++) header.push('K' + k + ' Score', 'K' + k + ' Realization');
  header.push('Total Score', 'Rating', 'Submission Status', 'Evidence Link', 'Evidence Type');

  var lines = [csvLine(header)];

  rows.forEach(function (r) {
    var line = [r.NIK, r.Full_Name, r.Position, r.Department, S.summary.period];
    for (var i = 0; i < maxKpi; i++) {
      var it = r.items[i];
      line.push(it && isNum(it.ScoreDisplay) ? it.ScoreDisplay : '');
      line.push(it && isNum(it.Realization) ? it.Realization : '');
    }
    line.push(
      r.submitted === 0 ? '' : r.index,
      r.predikat,
      r.status,
      r.evidence ? r.evidence.File_URL : '',
      r.evidence ? (r.evidence.legacy ? 'Combined (legacy)' : 'Per role') : ''
    );
    lines.push(csvLine(line));
  });

  downloadCsv(lines, 'KPI_Summary_' + S.summary.period + '_' + fileStamp() + '.csv');
  toast('CSV exported (' + rows.length + ' role rows).', 'success');
}

function csvLine(values) {
  return values.map(function (v) {
    var text = (v === null || v === undefined) ? '' : String(v);
    return '"' + text.replace(/"/g, '""') + '"';
  }).join(',');
}

function downloadCsv(lines, fileName) {
  var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
