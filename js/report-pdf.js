'use strict';

function pdfCopy(o) {
  var out = {};
  Object.keys(o || {}).forEach(function (key) { out[key] = o[key]; });
  return out;
}

function pdfSafeData(data, role) {
  var ev = role.evaluation ? pdfCopy(role.evaluation) : null;
  var updatedAt = ev ? ev.updatedAt || '' : '';
  if (ev) {
    delete ev.updatedBy;
    delete ev.updatedAt;
  }
  var safeRole = pdfCopy(role);
  safeRole.evaluation = ev;
  var safe = pdfCopy(data);
  safe.roles = [safeRole];
  safe.performance = data.performance ? pdfCopy(data.performance) : null;
  if (safe.performance) safe.performance.adminView = false;
  return {
    data: safe,
    role: safeRole,
    updatedAt: updatedAt,
    adminView: !!(data.performance && data.performance.adminView)
  };
}

function pdfSlug(text) {
  return String(text === null || text === undefined ? '' : text).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function pdfFileName(data, role, when) {
  var emp = data.employee || {};
  var parts = ['Annual_Performance_FY' + data.year, pdfSlug(emp.NIK), pdfSlug(emp.Full_Name)];
  if ((data.roles || []).length > 1 && role) parts.push(pdfSlug(role.Position));
  parts.push(fileStamp(when));
  return parts.filter(function (p) { return !!p; }).join('_') + '.pdf';
}

function pdfHead(ctx) {
  if (ctx.head) return ctx.head;
  var emp = ctx.data.employee || {};
  return {
    title: 'Annual Performance Report',
    line: 'FY' + esc(ctx.data.year) + (ctx.data.theme ? ' • ' + esc(ctx.data.theme) : '') + ' • PT Macme Global Indonesia',
    right: emp.Full_Name || '-',
    rightLine: 'NIK ' + (emp.NIK || '-') + ' • ' + ctx.role.roleLabel,
    badge: ''
  };
}

function pdfSheetHtml(ctx, body) {
  var h = pdfHead(ctx);
  var title = '<p class="text-[16px] font-bold text-slate-900 leading-tight">' + esc(h.title) + '</p>';
  return '<div class="pdf-sheet">' +
    '<div class="pdf-head">' +
      '<div class="flex items-center gap-3 min-w-0">' +
        '<img src="' + MGI_LOGO_B64 + '" alt="MGI" class="h-10 w-auto">' +
        '<div class="min-w-0">' +
          (h.badge ? '<div class="flex items-center gap-2">' + title + h.badge + '</div>' : title) +
          '<p class="text-[11px] text-text-muted">' + h.line + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="text-right min-w-0">' +
        '<p class="text-[14px] font-bold text-slate-900 truncate">' + esc(h.right) + '</p>' +
        '<p class="text-[11px] text-text-muted truncate">' + esc(h.rightLine) + '</p>' +
      '</div>' +
    '</div>' +
    '<div class="pdf-body"><div class="pdf-fit">' + body + '</div></div>' +
    '<div class="pdf-foot">' +
      '<span class="flex-1 min-w-0">Generated on ' + esc(ctx.stamp) + (ctx.by ? ' by ' + esc(ctx.by) : '') + ' • Confidential</span>' +
      '<span class="shrink-0 text-center">MGI KPI Portal • Supported by IT Department</span>' +
      '<span data-pdf-page class="flex-1 min-w-0 text-right font-semibold text-text-secondary">Page 1 of 1</span>' +
    '</div>' +
  '</div>';
}

function pdfCoverHtml(ctx) {
  var emp = ctx.data.employee || {};
  var role = ctx.role;
  var rules = ctx.data.performance ? ctx.data.performance.rules : null;
  var released = !!(rules && rules.released);
  var item = function (icon, label, value) {
    return '<span class="inline-flex items-center gap-1.5 whitespace-nowrap">' +
      '<span class="material-symbols-outlined text-[16px] text-text-muted">' + icon + '</span>' +
      '<span class="text-text-muted">' + esc(label) + '</span>' +
      '<strong class="font-semibold text-text-primary">' + esc(value) + '</strong></span>';
  };
  return '<div class="min-w-0 mb-space-sm">' +
      '<h2 class="text-headline-md font-bold text-slate-900 tracking-tight">' + esc(role.roleLabel) + '</h2>' +
      '<p class="text-sm text-slate-500 mt-0.5">Performance evaluation report • FY' + esc(ctx.data.year) + '</p>' +
      reportThemeLine(ctx.data) +
    '</div>' +
    '<div class="grid grid-cols-4 gap-space-sm">' +
      reportChipHtml('Full Name', emp.Full_Name) +
      reportChipHtml('NIK', emp.NIK) +
      reportChipHtml('Position', role.Position) +
      reportChipHtml('Department', role.Department) +
    '</div>' +
    '<div class="mt-space-sm flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border border-border-light bg-surface-page px-3 py-2 text-[12px]">' +
      item('schedule', 'Generated on', ctx.stamp + (ctx.by ? ' by ' + ctx.by : '')) +
      item(released ? 'verified' : 'pending', 'Results',
        released ? 'Released on ' + fmtDate(rules.releasedAt) : ctx.adminView ? 'Draft, not released' : 'Not released yet') +
      (ctx.adminView && ctx.updatedAt ? item('edit_calendar', 'Scores last updated', fmtStamp(new Date(ctx.updatedAt))) : '') +
    '</div>' +
    '<div class="mt-space-md">' + executiveSummaryHtml(ctx.data, role, true, summaryNote(ctx.data)) + '</div>';
}

function pdfMatrixHtml(ctx, rows, start, last) {
  var body = rows.map(function (k, n) { return matrixRowHtml(k, start + n); }).join('');
  return matrixCardHtml(ctx.data, ctx.role, body, last, start > 0 ? 'KPI Details (continued)' : 'KPI Details', false) +
    (last ? matrixLegendHtml() : '');
}

function pdfDeepDiveHtml(ctx, k, i) {
  return '<div class="flex items-center justify-between gap-space-sm mb-2">' +
      '<p class="text-label-xs uppercase tracking-wider font-semibold text-text-secondary">Deep-Dive Analytics</p>' +
      '<p class="text-label-xs text-text-muted">KPI ' + (i + 1) + ' of ' + ctx.role.kpis.length + '</p>' +
    '</div>' +
    '<section class="role-group shrink-0">' +
      '<div class="role-group-head !p-4 !cursor-default">' + deepDiveHeadInfoHtml(k, deepDiveStats(ctx.data, k)) + '</div>' +
      '<div class="role-group-body !gap-space-md">' + deepDiveBodyHtml(ctx.data, k, 'pdf-dd-' + i) + '</div>' +
    '</section>';
}

function pdfChunkRows(heights, firstRoom, nextRoom, tail) {
  var total = heights.reduce(function (a, h) { return a + h; }, 0) + tail;
  if (heights.length && total > firstRoom && total <= nextRoom) return [0, heights.length];
  var chunks = [];
  var room = firstRoom;
  var used = 0;
  var count = 0;
  heights.forEach(function (h) {
    if (used + h > room && (count > 0 || !chunks.length)) {
      chunks.push(count);
      room = nextRoom;
      used = 0;
      count = 0;
    }
    used += h;
    count++;
  });
  var limit = chunks.length ? count - 1 : count;
  var moved = 0;
  while (moved < limit && used + tail > room) {
    moved++;
    used -= heights[heights.length - moved];
  }
  chunks.push(count - moved);
  if (moved) chunks.push(moved);
  return chunks;
}

function pdfSheet(stage, ctx, body) {
  var holder = document.createElement('div');
  holder.innerHTML = pdfSheetHtml(ctx, body);
  var sheet = holder.firstChild;
  stage.appendChild(sheet);
  return sheet;
}

function pdfMeasure(probe) {
  var body = probe.querySelector('.pdf-body');
  var wrap = probe.querySelector('[data-pdf-matrix]');
  var rows = wrap ? Array.prototype.slice.call(wrap.querySelectorAll('tbody tr')) : [];
  var room = body ? body.clientHeight : 0;
  var rect = function (el) { return el.getBoundingClientRect(); };
  if (!rows.length) return { heights: [], firstRoom: room, nextRoom: room, tail: 0 };
  return {
    heights: rows.map(function (r) { return rect(r).height; }),
    firstRoom: room - (rect(rows[0]).top - rect(body).top) - 4,
    nextRoom: room - (rect(rows[0]).top - rect(wrap).top) - 4,
    tail: rect(wrap).bottom - rect(rows[rows.length - 1]).bottom
  };
}

function pdfBuildSheets(stage, ctx, layout) {
  var kpis = ctx.role.kpis || [];
  var chunks = pdfChunkRows(layout.heights, layout.firstRoom, layout.nextRoom, layout.tail);
  var sheets = [];
  var start = 0;
  chunks.forEach(function (count, n) {
    var last = n === chunks.length - 1;
    var part = count || last ? pdfMatrixHtml(ctx, kpis.slice(start, start + count), start, last) : '';
    sheets.push(pdfSheet(stage, ctx, n === 0
      ? pdfCoverHtml(ctx) + (part ? '<div class="mt-space-md">' + part + '</div>' : '')
      : part));
    start += count;
  });
  kpis.forEach(function (k, i) { sheets.push(pdfSheet(stage, ctx, pdfDeepDiveHtml(ctx, k, i))); });
  return sheets;
}

function pdfFitBody(sheet) {
  var body = sheet.querySelector('.pdf-body');
  var fit = sheet.querySelector('.pdf-fit');
  var room = body ? body.clientHeight : 0;
  if (!room || !fit || fit.scrollHeight <= room) return 1;
  var scale = 1;
  for (var n = 0; n < 3; n++) {
    var next = Math.max(0.6, Math.min(1, room / fit.scrollHeight));
    if (Math.abs(next - scale) < 0.005) break;
    scale = next;
    fit.style.width = (100 / scale) + '%';
  }
  scale = Math.max(0.6, Math.min(scale, room / fit.scrollHeight));
  fit.style.transformOrigin = 'top left';
  fit.style.transform = 'scale(' + scale + ')';
  return scale;
}

function pdfFinishSheets(sheets) {
  sheets.forEach(function (sheet, n) {
    pdfFitBody(sheet);
    var label = sheet.querySelector('[data-pdf-page]');
    if (label) label.textContent = 'Page ' + (n + 1) + ' of ' + sheets.length;
  });
}

function pdfDrawCharts(ctx) {
  if (!window.Chart) return [];
  ensureChartTheme();
  return (ctx.role.kpis || []).map(function (k, i) {
    var canvas = $('pdf-dd-' + i + '-chart');
    if (!canvas) return null;
    var cfg = deepDiveChartConfig(ctx.data, k);
    cfg.options.animation = false;
    cfg.options.devicePixelRatio = 2;
    return new window.Chart(canvas, cfg);
  }).filter(function (c) { return !!c; });
}

function pdfSettle() {
  return new Promise(function (resolve) { setTimeout(resolve, 120); }).then(function () {
    return document.fonts && document.fonts.ready ? document.fonts.ready : null;
  });
}

function pdfBusy(text, done, total) {
  var host = $('pdf-busy');
  if (text === null) {
    if (host) host.remove();
    return;
  }
  if (!host) {
    host = document.createElement('div');
    host.id = 'pdf-busy';
    document.body.appendChild(host);
  }
  var width = total ? Math.round(done / total * 100) : 4;
  host.innerHTML = '<div class="pdf-busy-card" role="status" aria-live="polite">' +
    '<span class="spinner spinner-dark shrink-0"></span>' +
    '<div class="min-w-0 flex-1">' +
      '<p class="text-body-md font-semibold text-text-primary">Preparing your PDF</p>' +
      '<p class="text-label-xs text-text-muted">' + esc(text) + '</p>' +
      '<div class="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">' +
        '<div class="h-full rounded-full bg-brand-maroon-dark" style="width:' + width + '%"></div></div>' +
    '</div>' +
  '</div>';
}

function pdfRender(libs, sheets, ctx, fileName) {
  var doc = new libs.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  var emp = ctx.meta ? {} : ctx.data.employee || {};
  var meta = ctx.meta || {
    title: 'Annual Performance Report FY' + ctx.data.year + ' • ' + (emp.Full_Name || emp.NIK || ''),
    subject: ctx.role.roleLabel + ', generated on ' + ctx.stamp,
    keywords: 'KPI, performance, FY' + ctx.data.year
  };
  doc.setProperties({
    title: meta.title,
    subject: meta.subject,
    author: 'MGI KPI Portal',
    creator: 'MGI KPI Portal',
    keywords: meta.keywords
  });
  var chain = Promise.resolve();
  sheets.forEach(function (sheet, n) {
    chain = chain.then(function () {
      pdfBusy('Page ' + (n + 1) + ' of ' + sheets.length, n, sheets.length);
      return libs.html2canvas(sheet, {
        scale: 2,
        backgroundColor: '#FFFFFF',
        logging: false,
        useCORS: true,
        onclone: function (clone) {
          var st = clone.getElementById('pdf-stage');
          if (st) st.style.left = '0px';
        }
      });
    }).then(function (canvas) {
      if (n > 0) doc.addPage('a4', 'landscape');
      doc.addImage(canvas.toDataURL('image/jpeg', ctx.quality || 0.92), 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
    });
  });
  return chain
    .then(function () {
      pdfBusy('Saving ' + fileName, sheets.length, sheets.length);
      doc.save(fileName);
    })
    .catch(function () {
      throw new Error('The PDF could not be prepared. Try again.');
    });
}

function downloadPerformancePdf() {
  var t = S.report;
  if (!t || S.pdfBusy) return;
  S.pdfBusy = true;
  var when = new Date();
  var stage = null;
  var charts = [];
  pdfBusy('Loading the latest scores', 0, 0);

  Promise.all([
    api('getPerformanceReport', t.nik, t.year),
    loadPdfLibs().catch(function () {
      throw new Error('The PDF tools could not be loaded. Check your connection and try again.');
    })
  ])
    .then(function (res) {
      var data = res[0];
      S.reports[t.nik + '|' + t.year] = data;
      var role = (data.roles || []).filter(function (r) { return r.roleKey === t.roleKey; })[0];
      if (!role) throw new Error('This role is no longer in the report. Reopen the report and try again.');
      var safe = pdfSafeData(data, role);
      var ctx = {
        data: safe.data,
        role: safe.role,
        updatedAt: safe.updatedAt,
        adminView: safe.adminView,
        stamp: fmtStamp(when),
        by: S.user ? S.user.Full_Name : ''
      };
      stage = document.createElement('div');
      stage.id = 'pdf-stage';
      stage.className = 'pdf-stage';
      document.body.appendChild(stage);
      var probe = pdfSheet(stage, ctx, pdfCoverHtml(ctx) +
        '<div class="mt-space-md" data-pdf-matrix>' + pdfMatrixHtml(ctx, ctx.role.kpis || [], 0, true) + '</div>');
      pdfBusy('Laying out the pages', 0, 0);
      return pdfSettle()
        .then(function () {
          var layout = pdfMeasure(probe);
          probe.remove();
          var sheets = pdfBuildSheets(stage, ctx, layout);
          return pdfSettle().then(function () {
            pdfFinishSheets(sheets);
            charts = pdfDrawCharts(ctx);
            return pdfRender(res[1], sheets, ctx, pdfFileName(data, role, when));
          });
        })
        .then(function () { toast('PDF downloaded.', 'success'); });
    })
    .catch(function (err) {
      toast(err && err.message ? err.message : 'The PDF could not be prepared. Try again.', 'error');
    })
    .then(function () {
      charts.forEach(function (c) { c.destroy(); });
      if (stage) stage.remove();
      pdfBusy(null);
      S.pdfBusy = false;
    });
}
