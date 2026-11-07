'use strict';

function rptContext(md, opts) {
  var annual = md.kind === 'annual';
  var title = annual ? 'Performance Evaluation Report' : 'Monthly KPI Report';
  var when = annual ? 'FY' + md.year : md.monthName;
  var pill = function (tone, text) { return '<span class="pill ' + tone + ' !py-0.5 !px-2 !text-[11px]">' + text + '</span>'; };
  return {
    head: {
      title: title,
      line: esc((annual ? '' : md.monthName + ' • ') + 'FY' + md.year + (md.theme ? ' • ' + md.theme : '') + ' • PT Macme Global Indonesia'),
      right: md.scopeLabel,
      rightLine: annual
        ? (md.released ? 'Released to employees on ' + fmtDate(md.rules.releasedAt) : 'Not released to employees yet')
        : rptPeriodText(md.periodState),
      badge: annual && !md.released ? pill('pill-warning', 'Draft, not released') : !annual && md.trial ? pill('pill-neutral', 'Trial month') : ''
    },
    meta: {
      title: title + ' ' + when + ' • ' + md.scopeLabel,
      subject: md.scopeLabel + ', generated on ' + fmtStamp(opts.when),
      keywords: 'KPI, report, FY' + md.year
    },
    stamp: fmtStamp(opts.when),
    by: opts.by,
    quality: 0.8
  };
}

function rptFileName(md, opts) {
  var base = md.kind === 'annual'
    ? 'FY' + md.year + '_Performance_Evaluation_Report'
    : md.year + '_' + (md.month < 10 ? '0' : '') + md.month + '_Monthly_KPI_Report';
  return base + '_' + pdfSlug(md.scopeLabel) + '_' + fileStamp(opts.when) + '.pdf';
}

function rptHead(title, sub, cont) {
  return '<div data-pdf-shead class="mb-3">' +
    '<h2 class="text-headline-md font-bold text-slate-900 tracking-tight">' + esc(title) + (cont ? ' (continued)' : '') + '</h2>' +
    (sub ? '<p class="text-sm text-slate-500 mt-0.5">' + sub + '</p>' : '') +
  '</div>';
}

function rptSub(title, sub) {
  return '<h3 class="text-title-md font-semibold text-text-primary">' + esc(title) + '</h3>' +
    (sub ? '<p class="text-body-sm text-text-muted mt-0.5 mb-3">' + sub + '</p>' : '<div class="mb-3"></div>');
}

function rptCard(title, sub, body, cls) {
  return '<section class="rounded-xl border border-border-light bg-white p-5 min-w-0' + (cls ? ' ' + cls : '') + '">' +
    '<h3 class="text-title-md font-semibold text-text-primary">' + esc(title) + '</h3>' +
    (sub ? '<p class="text-body-sm text-text-muted mt-0.5">' + sub + '</p>' : '') +
    '<div class="mt-3">' + body + '</div>' +
  '</section>';
}

function rptChartBox(id, height) {
  return '<div class="relative" style="height:' + height + 'px"><canvas id="' + id + '"></canvas></div>';
}

function rptCols(widths) {
  return '<colgroup>' + widths.map(function (w) { return w ? '<col style="width:' + w + 'px">' : '<col>'; }).join('') + '</colgroup>';
}

function rptTableHtml(b, rowsHtml) {
  return '<div class="rounded-xl border border-border-light overflow-hidden bg-white">' +
    '<table class="data-table rpt-table' + (b.cols ? ' table-fixed' : '') + (b.cls ? ' ' + b.cls : '') + '">' + (b.cols || '') +
      '<thead>' + b.head + '</thead><tbody>' + rowsHtml + '</tbody></table></div>';
}

function rptEmptyHtml(text, good) {
  return '<div class="rounded-xl border border-dashed border-border-medium p-8 text-center">' +
    '<span class="material-symbols-outlined text-[36px] ' + (good ? 'text-status-success">task_alt' : 'text-text-muted">info') + '</span>' +
    '<p class="text-body-md text-text-secondary mt-2">' + esc(text) + '</p></div>';
}

function rptGroupRow(text, span, extra) {
  return '<tr class="rpt-group"><td colspan="' + span + '">' + esc(text) +
    (extra ? '<span class="ml-2 font-medium text-text-muted">' + esc(extra) + '</span>' : '') + '</td></tr>';
}

function rptGrouped(list, span, rowFn, extraFn) {
  var out = { rows: [], groups: [] };
  rptGroupBy(list, 'Division').forEach(function (g) {
    out.rows.push(rptGroupRow(g.name, span, extraFn ? extraFn(g.rows) : ''));
    out.groups.push(true);
    g.rows.forEach(function (r) {
      out.rows.push(rowFn(r));
      out.groups.push(false);
    });
  });
  return out;
}

function rptPerson(r) {
  return '<span class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">' +
    '<span class="font-semibold text-text-primary break-words">' + esc(r.Full_Name) + '</span>' +
    '<span class="whitespace-nowrap text-[11px] text-text-muted tabular-nums">NIK ' + esc(r.NIK) + '</span>' +
    (r.isHome === false ? '<span class="pill pill-maroon whitespace-nowrap !py-0 !px-1.5 !text-[11px]">Additional Role</span>' : '') +
    (r.roleInactive ? '<span class="pill pill-neutral whitespace-nowrap !py-0 !px-1.5 !text-[11px]">Inactive Role</span>' : '') +
  '</span>';
}

function rptRankBadge(rank) {
  return '<span class="inline-flex w-6 h-6 items-center justify-center rounded-full text-[12px] font-bold tabular-nums ' +
    (rank <= 3 ? 'bg-brand-50 text-primary-container' : 'bg-slate-100 text-text-secondary') + '">' + rank + '</span>';
}

function rptNumCell(v, dp, tone) {
  if (!isNum(v)) return '<td class="text-right"><span class="text-text-muted">-</span></td>';
  return '<td class="text-right tabular-nums' + (tone ? ' ' + tone : '') + '">' + (dp === 2 ? Number(v).toFixed(2) : num(v)) + '</td>';
}

function rptBandCell(v) {
  if (!isNum(v)) return '<td class="text-right"><span class="text-text-muted">-</span></td>';
  return '<td class="text-right font-semibold tabular-nums text-status-' + band(v).key + '-text">' + num(v) + '</td>';
}

function rptBandPill(r) {
  if (r.submitted === 0) return '<span class="pill pill-neutral !py-0.5 !px-2 !text-[11px]">Not Scored</span>';
  var b = band(r.index);
  return '<span class="pill pill-' + b.key + ' !py-0.5 !px-2 !text-[11px]">' + b.label + '</span>';
}

function rptStatusPill(r, open) {
  var unscored = r.submitted === 0;
  var tone = unscored ? (open ? 'warning' : 'danger')
           : r.statusKey === 'partial' ? 'warning'
           : r.evidence || r.statusKey === 'submitted' ? 'success' : 'info';
  return '<span class="pill pill-' + tone + ' !py-0.5 !px-2 !text-[11px]">' + esc(unscored && open ? 'Not submitted yet' : r.status) + '</span>';
}

function rptDelta(v) {
  if (!isNum(v)) return '<span class="text-text-muted">-</span>';
  var tone = v > 0 ? 'text-status-success-text' : v < 0 ? 'text-status-danger-text' : 'text-text-secondary';
  return '<span class="font-semibold tabular-nums ' + tone + '">' + (v > 0 ? '+' : '') + num(v, 1) + '</span>';
}

function rptRateCell(rate, fixedTone) {
  if (!isNum(rate)) return '<span class="text-text-muted">-</span>';
  var tone = fixedTone || (rate >= 80 ? 'bg-status-success' : rate >= 50 ? 'bg-status-warning' : 'bg-status-danger');
  return '<span class="flex items-center gap-2">' +
    '<span class="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden"><span class="block h-full rounded-full ' + tone + '" style="width:' +
      Math.max(0, Math.min(100, rate)) + '%"></span></span>' +
    '<span class="w-12 text-right font-semibold tabular-nums text-text-secondary">' + num(rate, 1) + '%</span>' +
  '</span>';
}

function rptBarRow(label, count, total, color) {
  var p = rptShare(count, total) || 0;
  return '<div class="mb-3">' +
    '<div class="flex items-center justify-between gap-3 mb-1.5">' +
      '<span class="text-body-sm text-text-secondary flex items-center gap-1.5 min-w-0">' + label + '</span>' +
      '<span class="text-body-sm font-semibold text-text-primary tabular-nums whitespace-nowrap">' + count + ' (' + pct(p, 1) + ')</span>' +
    '</div>' +
    '<div class="w-full bg-surface-container h-2 rounded-full overflow-hidden">' +
      '<div class="h-full rounded-full" style="width:' + p + '%;background:' + color + '"></div></div>' +
  '</div>';
}

function rptDot(color) {
  return '<span class="w-2 h-2 rounded-full shrink-0" style="background:' + color + '"></span>';
}

function rptFindingsHtml(items) {
  if (!items.length) return '<p class="text-body-sm text-text-muted">No findings for this selection.</p>';
  return '<ul class="flex flex-col gap-2">' + items.map(function (it) {
    return '<li class="flex items-start gap-3 p-3 rounded-lg bg-slate-50/60 border border-slate-200/80">' +
      '<span class="material-symbols-outlined text-[20px] shrink-0 ' + it.tone + '">' + it.icon + '</span>' +
      '<span class="min-w-0 text-body-sm text-text-secondary leading-relaxed">' + it.html + '</span></li>';
  }).join('') + '</ul>';
}

function rptNotesHtml(notes) {
  return '<div class="mt-4 rounded-xl border border-border-light bg-surface-page px-4 py-3 flex flex-col gap-1.5">' + notes.map(function (n) {
    return '<p class="flex items-start gap-2 text-body-sm text-text-secondary">' +
      '<span class="material-symbols-outlined text-[18px] text-text-muted shrink-0">' + n[0] + '</span><span>' + n[1] + '</span></p>';
  }).join('') + '</div>';
}

function rptCountedSpan(trial) {
  var counted = MONTHS.filter(function (m, i) { return trial.indexOf(i + 1) === -1; });
  return counted.length ? counted[0].substring(0, 3) + ' to ' + counted[counted.length - 1].substring(0, 3) : 'no counted months';
}

function rptChartOptions(extra) {
  var o = dashOptions(extra);
  o.animation = false;
  o.devicePixelRatio = 2;
  o.events = [];
  o.plugins.tooltip = { enabled: false };
  return o;
}

function rptRateColor(rate) {
  return !isNum(rate) ? DASH_COLORS.slate : rate >= 80 ? DASH_COLORS.success : rate >= 50 ? DASH_COLORS.warning : DASH_COLORS.danger;
}

function rptPctAxis() {
  return { min: 0, max: 100, ticks: { stepSize: 25, callback: function (v) { return v + '%'; } }, grid: { color: DASH_COLORS.grid } };
}

function rptTrendChart(tr) {
  var ytd = isNum(tr.ytdAvg) ? tr.ytdAvg : null;
  var shown = tr.months.slice(0, tr.upto);
  return {
    type: 'line',
    data: {
      labels: shown.map(function (m) { return m.trial ? [dashMonth(m.month), 'Trial'] : dashMonth(m.month); }),
      datasets: [
        {
          label: 'Average',
          data: shown.map(function (m) { return isNum(m.avg) ? m.avg : null; }),
          borderColor: DASH_COLORS.ink,
          backgroundColor: dashGradient,
          fill: true,
          clip: false,
          tension: 0.35,
          spanGaps: false,
          borderWidth: 2,
          pointRadius: shown.map(function (m) { return isNum(m.avg) ? 4.5 : 0; }),
          pointBorderWidth: 2,
          pointBackgroundColor: shown.map(function (m) { return trendPointColor(m, ytd); }),
          pointBorderColor: shown.map(function (m) { return trendPointColor(m, ytd); })
        },
        {
          label: 'Year to date',
          data: shown.map(function () { return ytd; }),
          borderColor: DASH_COLORS.muted,
          borderDash: [4, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
          clip: false
        }
      ]
    },
    options: rptChartOptions({
      layout: { padding: { top: 24, right: TREND_LABEL_ROOM } },
      scales: { y: rptPctAxis(), x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: false } } }
    }),
    plugins: [trendMarksPlugin(tr)]
  };
}

function rptRateChart(tr) {
  var shown = tr.months.slice(0, tr.upto);
  return {
    type: 'bar',
    data: {
      labels: shown.map(function (m) { return m.trial ? [dashMonth(m.month), 'Trial'] : dashMonth(m.month); }),
      datasets: [{
        label: 'Submitted',
        data: shown.map(function (m) { return isNum(m.rate) ? m.rate : 0; }),
        backgroundColor: shown.map(function (m) { return m.trial ? DASH_COLORS.muted : rptRateColor(m.rate); }),
        borderRadius: 6,
        borderSkipped: 'start',
        maxBarThickness: 28
      }]
    },
    options: rptChartOptions({
      layout: { padding: { top: 18 } },
      scales: { y: rptPctAxis(), x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: false } } }
    }),
    plugins: [stackTopLabelsPlugin(
      shown.map(function (m) { return isNum(m.rate) ? Math.round(m.rate) + '%' : ''; }),
      shown.map(function (m) { return isNum(m.rate) ? m.rate : 0; })
    )]
  };
}

function rptGradeMix(dist) {
  var n = GRADES.reduce(function (s, g) { return s + dist[g]; }, 0);
  if (!n) return '<span class="text-text-muted">-</span>';
  return '<span class="flex h-2.5 w-full rounded-full overflow-hidden bg-slate-100">' + GRADES.map(function (g) {
    return dist[g] ? '<span class="h-full" style="width:' + rptShare(dist[g], n) + '%;background:' + GRADE_COLORS[g] + '"></span>' : '';
  }).join('') + '</span>';
}

function rptScoreBar(v) {
  if (!isNum(v)) return '<span class="text-text-muted">-</span>';
  var key = band(v).key;
  return '<span class="flex items-center gap-2">' +
    '<span class="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden"><span class="block h-full rounded-full bg-status-' + key + '" style="width:' +
      Math.max(0, Math.min(100, v)) + '%"></span></span>' +
    '<span class="w-10 text-right font-semibold tabular-nums text-status-' + key + '-text">' + num(v) + '</span>' +
  '</span>';
}

function rptLegend(items) {
  return '<div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-label-xs text-text-secondary">' + items.map(function (it) {
    return '<span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm" style="background:' + it[0] + '"></span>' + esc(it[1]) + '</span>';
  }).join('') + '</div>';
}

function rptBandLegend() {
  return '<div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-label-xs text-text-secondary">' +
    ['success', 'info', 'danger'].map(function (key) {
      return '<span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-status-' + key + '-subtle border border-status-' + key + '"></span>' +
        esc(bandRange(key)) + '</span>';
    }).join('') +
    '<span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-surface-page border border-border-light"></span>Trial month, not counted</span>' +
  '</div>';
}

function rptTrendTiles(md) {
  var tr = md.trend;
  var counted = tr.months.slice(0, tr.upto).filter(function (m) { return !m.trial; });
  var span = counted.length ? dashMonth(counted[0].month) + ' to ' + dashMonth(counted[counted.length - 1].month) : 'No counted months yet';
  var tile = function (label, value, tone, caption) {
    return '<div class="rounded-lg border border-border-light bg-white px-4 py-2 min-w-0">' +
      '<p class="text-label-xs uppercase tracking-wider text-text-muted">' + esc(label) + '</p>' +
      '<p class="text-title-lg font-bold tabular-nums leading-tight ' + tone + '">' + value + '</p>' +
      '<p class="mt-0.5 text-[11px] text-text-muted">' + esc(caption) + '</p></div>';
  };
  var monthTile = function (label, m) {
    return m ? tile(label, m.avg.toFixed(2) + '%', 'text-status-' + band(m.avg).key + '-text', MONTHS[m.month - 1])
             : tile(label, '-', 'text-text-muted', 'No counted month yet');
  };
  var ytd = isNum(tr.ytdAvg) ? tr.ytdAvg : null;
  return '<div class="grid grid-cols-4 gap-4 mb-2">' +
      tile('Avg KPI Score', ytd === null ? '-' : ytd.toFixed(2) + '%', ytd === null ? 'text-text-muted' : 'text-status-' + band(ytd).key + '-text',
        ytd === null ? span : band(ytd).label + ' • ' + span) +
      monthTile('Best Month', tr.best) +
      monthTile('Lowest Month', tr.lowest || tr.best) +
      tile('Submission Rate', isNum(tr.rate) ? num(tr.rate, 1) + '%' : '-', 'text-text-primary', 'Average of ' + span) +
    '</div>' +
    '<p class="mb-2 text-[11px] text-text-muted">These numbers count every scorecard, the same as the Dashboard' +
      (md.kind === 'annual' ? '. Page 1 counts each person once, so its averages can differ slightly.' : '.') + '</p>';
}

function rptChartLegend(items) {
  var mark = function (kind, color) {
    if (kind === 'dot') return '<span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:' + color + '"></span>';
    if (kind === 'box') return '<span class="w-3 h-3 rounded-sm shrink-0" style="background:' + color + '"></span>';
    return '<span class="w-4 shrink-0" style="border-top:2px ' + (kind === 'dash' ? 'dashed' : 'dotted') + ' ' + color + '"></span>';
  };
  return '<div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-label-xs text-text-secondary">' + items.map(function (it) {
    return '<span class="inline-flex items-center gap-1.5">' + mark(it[0], it[1]) + esc(it[2]) + '</span>';
  }).join('') + '</div>';
}

function rptTrialMark(on) {
  return on ? '<span class="block text-[11px] font-normal normal-case tracking-normal">Trial</span>' : '';
}

function rptNote(text) {
  return '<p class="mt-2 text-label-sm text-text-muted">' + text + '</p>';
}

function rptTrendBlock(md, cid, title, sub) {
  var tr = md.trend;
  var line = cid();
  var bars = cid();
  var shown = tr.months.slice(0, tr.upto);
  var monthCells = function (months) {
    return months.slice(0, tr.upto).map(function (m) {
      return '<td class="!px-1 text-center' + (m.trial ? ' recap-trial' : '') + '">' + dashCell(m.avg, m.trial) + '</td>';
    }).join('');
  };
  var row = function (name, sub2, t, total) {
    return '<tr' + (total ? ' class="rpt-total"' : '') + '>' +
      '<td><span class="font-semibold text-text-primary">' + esc(name) + '</span>' +
        (sub2 ? '<span class="ml-1.5 text-[11px] text-text-muted whitespace-nowrap">' + esc(sub2) + '</span>' : '') + '</td>' +
      '<td>' + rptRateCell(t.rate) + '</td>' +
      '<td class="!px-1 text-center">' + dashCell(t.ytdAvg) + '</td>' +
      monthCells(t.months) +
    '</tr>';
  };
  var rows = md.heat.map(function (h) { return row(h.name, plural(h.trend.scorecards, 'scorecard'), h.trend, false); });
  rows.push(row('Overall', plural(tr.scorecards, 'scorecard'), tr, true));
  return {
    title: title,
    sub: sub,
    cls: 'rpt-heat',
    intro: rptTrendTiles(md) + '<div class="grid grid-cols-2 gap-4 mb-4">' +
        rptCard('Average score by month', 'Average Role Index of the scored scorecards in each month',
          rptChartBox(line, 195) + rptChartLegend([
            ['dot', DASH_COLORS.success, 'At or above year to date'],
            ['dot', DASH_COLORS.danger, 'Below year to date'],
            ['dash', DASH_COLORS.muted, 'Year to date average'],
            ['dots', DASH_COLORS.info, 'Rating thresholds'],
            ['dot', DASH_COLORS.muted, 'Trial month']
          ])) +
        rptCard('Submission rate by month', 'Share of scorecards with a score in each month',
          rptChartBox(bars, 195) + rptChartLegend([
            ['box', DASH_COLORS.success, '80% or more'],
            ['box', DASH_COLORS.warning, '50% to 79.9%'],
            ['box', DASH_COLORS.danger, 'Below 50%'],
            ['box', DASH_COLORS.muted, 'Trial month']
          ])) +
      '</div>' +
      rptSub('Monthly heatmap by ' + md.heatField.toLowerCase(), 'Average score per month, colored by rating band. Year to date leaves out the trial month.'),
    cols: rptCols([230, 150, 96].concat(shown.map(function () { return null; }))),
    head: '<tr><th>' + esc(md.heatField) + '</th><th>Submitted</th><th class="!px-1 text-center">Year to date</th>' +
      shown.map(function (m) {
        return '<th class="!px-1 text-center' + (m.trial ? ' recap-trial' : '') + '">' + dashMonth(m.month) + rptTrialMark(m.trial) + '</th>';
      }).join('') + '</tr>',
    rows: rows,
    groups: rows.map(function () { return false; }),
    after: rptBandLegend(),
    charts: [{ id: line, cfg: rptTrendChart(tr) }, { id: bars, cfg: rptRateChart(tr) }]
  };
}

function rptMonthlyBlocks(md, opts) {
  var seq = 0;
  var cid = function () { seq++; return 'rpt-chart-' + seq; };
  var on = function (key) { return !!opts.sections[key]; };
  var blocks = [rptMonthlySummary(md)];
  if (on('compliance')) blocks.push(rptComplianceBlock(md));
  if (on('divisions')) blocks.push(rptMonthDivisionBlock(md));
  if (on('trend')) {
    blocks.push(rptTrendBlock(md, cid, 'Year to Date Trend',
      esc('January to ' + md.monthName + ' • ' + md.scopeLabel)));
  }
  if (on('people')) blocks.push(rptPeopleBlock(md));
  if (on('kpis')) blocks.push(rptKpiBlock(md));
  if (on('missing')) blocks.push(rptMissingBlock(md));
  if (on('appendix')) blocks.push(rptAppendixBlock(md));
  return blocks;
}

function rptMonthlySummary(md) {
  var t = md.total;
  var b = isNum(t.avg) ? band(t.avg) : null;
  var scored = t.dist.total;
  var needs = t.bands.danger;
  var vs = function (v) { return md.comparable && isNum(v) ? ' • ' + rptChangeText(v) + ' from ' + md.prevName : ''; };
  var rateTone = !isNum(t.rate) ? 'bg-status-info' : t.rate >= 80 ? 'bg-status-success' : t.rate >= 50 ? 'bg-status-warning' : 'bg-status-danger';

  var tiles =
    statCard('Average Score', 'trending_up', b ? 'text-status-' + b.key + '-text' : 'text-text-muted',
      b ? num(t.avg) : '-', b ? '/ 100' : '',
      b ? 'Rating: ' + esc(b.label) + esc(vs(t.change)) : 'No scorecards scored yet',
      b ? 'bg-status-' + b.key : '', t.avg || 0) +
    statCard('Submission Rate', 'task_alt', 'text-text-primary',
      isNum(t.rate) ? num(t.rate, 1) : '-', '%',
      (t.scorecards - t.pending) + ' of ' + plural(t.scorecards, 'scorecard') + ' submitted' + esc(vs(t.rateChange)),
      rateTone, t.rate || 0) +
    statCard('Scorecards', 'badge', 'text-text-primary', t.scorecards, 'Scorecards',
      plural(t.employees, 'employee') + ' • ' + t.complete + ' complete, ' + t.partial + ' partial', '', 0) +
    statCard('Needs Attention', 'flag', needs ? 'text-status-danger-text' : 'text-status-success-text',
      needs, scored ? 'of ' + scored + ' scored' : '',
      scored ? pct(rptShare(needs, scored), 1) + ' of scored scorecards are below ' + bandNum(bandValues().good) : 'No scorecards scored yet',
      'bg-status-danger', scored ? needs / scored * 100 : 0);

  var dist = rptCard('Rating Distribution', esc(plural(scored, 'scored scorecard')) + ' in ' + esc(md.monthName),
    rptBarRow(rptDot(BAND_META.success.hex) + esc(bandRange('success')), t.bands.success, scored, BAND_META.success.hex) +
    rptBarRow(rptDot(BAND_META.info.hex) + esc(bandRange('info')), t.bands.info, scored, BAND_META.info.hex) +
    rptBarRow(rptDot(BAND_META.danger.hex) + esc(bandRange('danger')), t.bands.danger, scored, BAND_META.danger.hex) +
    (t.pending ? '<p class="text-body-sm text-text-muted">' + plural(t.pending, 'scorecard') + ' not scored yet.</p>' : ''), 'col-span-5');

  var notes = [];
  if (md.trial) notes.push(['science', esc(MONTHS[md.month - 1]) + ' is a trial month. Its scores are shown for reference and do not count toward the year to date average.']);
  if (md.open && md.periodState) notes.push(['schedule', 'The period is open until ' + esc(fmtDate(md.periodState.cutoff)) + ', so these numbers can still change.']);
  if (!md.comparable && !md.trial) notes.push(['history', 'No comparison with the previous month, because it is a trial month or outside this fiscal year.']);
  notes.push(['info', 'Scores are Role Index values from 0 to 100. Submission Rate counts every scorecard with at least one KPI submitted, the same as the Summary Report.']);

  return {
    html: rptHead('Executive Summary', esc(md.monthName + ' • ' + md.scopeLabel + ' • ' + rptPeriodText(md.periodState))) +
      '<div class="grid grid-cols-4 gap-4">' + tiles + '</div>' +
      '<div class="grid grid-cols-12 gap-4 mt-4">' + dist + rptCard('Key Findings', '', rptFindingsHtml(md.findings), 'col-span-7') + '</div>' +
      rptNotesHtml(notes),
    charts: []
  };
}

function rptComplianceBlock(md) {
  var byRate = function (a, b) { return rptOrder(a.rate, b.rate, 1) || a.name.localeCompare(b.name); };
  var cells = function (g, cls, label) {
    return '<tr' + (cls ? ' class="' + cls + '"' : '') + '>' +
      '<td>' + label + '</td>' +
      '<td class="text-right tabular-nums">' + g.scorecards + '</td>' +
      '<td class="text-right tabular-nums">' + (g.scorecards - g.pending) + '</td>' +
      '<td class="text-right tabular-nums' + (g.pending ? ' font-semibold text-status-danger-text' : '') + '">' + g.pending + '</td>' +
      '<td>' + rptRateCell(g.rate) + '</td>' +
      (md.comparable ? '<td class="text-right">' + rptDelta(g.rateChange) + '</td>' : '') +
      '<td class="text-right tabular-nums">' + g.evidence + '</td>' +
    '</tr>';
  };
  var rows = [];
  var groups = [];
  md.groups.slice().sort(byRate).forEach(function (g) {
    rows.push(cells(g, 'rpt-lead', esc(g.name)));
    groups.push(true);
    g.depts.slice().sort(byRate).forEach(function (dg) {
      rows.push(cells(dg, '', '<span class="block pl-4">' + esc(dg.name) + '</span>'));
      groups.push(false);
    });
  });
  rows.push(cells(md.total, 'rpt-total', 'Overall'));
  groups.push(false);
  return {
    title: 'Submission Compliance',
    sub: esc(md.monthName + ' • ' + md.scopeLabel + ' • lowest submission rate first'),
    cols: rptCols([null, 120, 120, 140, 260].concat(md.comparable ? [130] : []).concat([140])),
    head: '<tr><th>Division / Department</th><th class="text-right">Scorecards</th><th class="text-right">Submitted</th>' +
      '<th class="text-right">Not Submitted</th><th>Submission Rate</th>' +
      (md.comparable ? '<th class="text-right">vs ' + esc(md.prevName.substring(0, 3)) + ' (pts)</th>' : '') +
      '<th class="text-right">Evidence on File</th></tr>',
    rows: rows,
    groups: groups,
    after: rptNote('Submitted counts every scorecard with at least one KPI filled, the same as the Summary Report. Submission Rate is Submitted out of Scorecards, ' +
      'green from 80%, amber from 50%' + (md.evidenceOptional ? '. Evidence is optional this year.' : '.'))
  };
}

function rptMonthDivisionBlock(md) {
  var byAvg = function (a, b) { return rptOrder(a.avg, b.avg, -1) || a.name.localeCompare(b.name); };
  var monthShort = MONTHS[md.month - 1].substring(0, 3);
  var prevShort = md.comparable ? md.prevName.substring(0, 3) : '';
  var cells = function (g, cls, label) {
    return '<tr' + (cls ? ' class="' + cls + '"' : '') + '>' +
      '<td>' + label + '</td>' +
      '<td class="text-right tabular-nums">' + g.dist.total + ' of ' + g.scorecards + '</td>' +
      '<td>' + rptScoreBar(g.avg) + '</td>' +
      (md.comparable ? rptNumCell(g.prevAvg) + '<td class="text-right">' + rptDelta(g.change) + '</td>' : '') +
      rptNumCell(g.ytd, 2) +
      '<td class="text-right tabular-nums">' + g.bands.success + '</td>' +
      '<td class="text-right tabular-nums">' + g.bands.info + '</td>' +
      '<td class="text-right tabular-nums' + (g.bands.danger ? ' font-semibold text-status-danger-text' : '') + '">' + g.bands.danger + '</td>' +
      '<td class="text-right tabular-nums">' + g.pending + '</td>' +
    '</tr>';
  };
  var rows = [];
  var groups = [];
  md.groups.slice().sort(byAvg).forEach(function (g) {
    rows.push(cells(g, 'rpt-lead', esc(g.name)));
    groups.push(true);
    g.depts.slice().sort(byAvg).forEach(function (dg) {
      rows.push(cells(dg, '', '<span class="block pl-4">' + esc(dg.name) + '</span>'));
      groups.push(false);
    });
  });
  rows.push(cells(md.total, 'rpt-total', 'Overall'));
  groups.push(false);
  return {
    title: 'Performance by Division',
    sub: esc(md.monthName + ' • ' + md.scopeLabel + ' • highest average first'),
    cols: rptCols([null, 100, 220].concat(md.comparable ? [90, 90] : []).concat([110, 90, 70, 130, 100])),
    head: '<tr><th>Division / Department</th><th class="text-right">Scored</th><th>' + esc(monthShort) + ' Average</th>' +
      (md.comparable ? '<th class="text-right">' + esc(prevShort) + '</th><th class="text-right">Change</th>' : '') +
      '<th class="text-right">Year to date</th><th class="text-right">Excellent</th><th class="text-right">Good</th>' +
      '<th class="text-right">Needs Attention</th><th class="text-right">Not Scored</th></tr>',
    rows: rows,
    groups: groups,
    after: rptNote('Averages are Role Index values of scored scorecards, colored by rating band. Year to date averages each scorecard over the counted months up to ' +
      esc(MONTHS[md.month - 1]) + ' and leaves out the trial month.')
  };
}

function rptPeopleBlock(md) {
  var topRows = md.top.shown.map(function (x) {
    var r = x.row;
    return '<tr><td class="text-center">' + rptRankBadge(x.rank) + '</td>' +
      '<td>' + rptPerson(r) + '</td><td>' + esc(r.Position) + '</td><td>' + esc(r.Department) + '</td>' +
      '<td class="text-right tabular-nums">' + rptTier1(r) + '</td>' +
      '<td class="text-right tabular-nums">' + md.kpiMonths(r) + '</td>' +
      rptBandCell(r.index) +
      '<td>' + rptBandPill(r) + '</td></tr>';
  }).join('');
  var topTable = topRows
    ? rptTableHtml({
        cols: rptCols([60, null, 220, 220, 100, 100, 100, 140]),
        head: '<tr><th class="text-center">Rank</th><th>Employee</th><th>Position</th><th>Department</th>' +
          '<th class="text-right">KPIs at 1.0</th><th class="text-right">KPI Months</th><th class="text-right">Role Index</th><th>Rating</th></tr>'
      }, topRows) +
      (md.top.more ? rptNote('And ' + plural(md.top.more, 'more person', 'more people') + ' with the same score as the last row.') : '')
    : rptEmptyHtml('No scorecard is scored yet this month.');

  var rows = md.attention.map(function (a) {
    var r = a.row;
    return '<tr><td>' + rptPerson(r) + '</td><td>' + esc(r.Position) + '</td><td>' + esc(r.Department) + '</td>' +
      '<td class="text-right tabular-nums">' + md.kpiMonths(r) + '</td>' +
      rptBandCell(r.index) +
      '<td>' + (a.weakest
        ? '<span class="flex items-center gap-2 min-w-0">' + (isNum(a.weakest.Score)
            ? '<span class="' + tierClass(a.weakest.Score) + ' rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums shrink-0">' + Number(a.weakest.Score).toFixed(1) + '</span>'
            : '<span class="pill pill-neutral shrink-0 !py-0 !px-1.5 !text-[11px]">Not filled</span>') +
            '<span class="truncate">' + esc(a.weakest.KPI_Name) + '</span></span>'
        : '<span class="text-text-muted">-</span>') + '</td>' +
      '<td class="text-right tabular-nums">' + a.low + ' of ' + a.due + '</td></tr>';
  });
  return {
    title: 'Top Performers and Needs Attention',
    contTitle: 'Needs Attention',
    sub: esc(md.monthName + ' • ' + md.scopeLabel),
    intro: rptSub('Top 10 this month', 'Ranked by Role Index, then by the number of KPIs at tier 1.0, then by KPI Months. Each person counts once, on their Home Role.') +
      topTable +
      '<div class="mt-6">' + rptSub('Needs Attention', 'Every scorecard below ' + esc(bandNum(bandValues().good)) + ', lowest first, with the KPI that pulled it down the most.') + '</div>',
    cols: rptCols([null, 200, 200, 90, 100, 300, 120]),
    head: '<tr><th>Employee</th><th>Position</th><th>Department</th><th class="text-right">KPI Months</th><th class="text-right">Role Index</th><th>Weakest KPI</th>' +
      '<th class="text-right">Below target</th></tr>',
    rows: rows,
    groups: rows.map(function () { return false; }),
    empty: 'No scorecard is rated Needs Attention this month.',
    emptyGood: true,
    after: rows.length ? rptNote('Weakest KPI is the KPI due this month with the lowest tier, and a KPI that is not filled counts as zero. ' +
      'Below target counts the KPIs due this month at tier 0.4 or 0.2, or not filled. KPI Months counts the scored months up to ' +
      esc(MONTHS[md.month - 1]) + ', without the trial month.') : ''
  };
}

function rptLabelPill(label) {
  if (!label) return '<span class="text-text-muted">-</span>';
  var meta = labelMeta(label);
  return '<span class="inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ' + meta.tone + '">' +
    '<span class="material-symbols-outlined text-[14px]">' + meta.icon + '</span>' + esc(label) + '</span>';
}

function rptKpiBlock(md) {
  var rows = md.kpis.map(function (k, i) {
    return '<tr><td class="text-center tabular-nums text-text-muted">' + (i + 1) + '</td>' +
      '<td><span class="block font-semibold text-text-primary">' + esc(k.name) + '</span>' +
        (k.metrics ? '<span class="block text-[11px] text-text-muted">' + esc(k.metrics) + '</span>' : '') + '</td>' +
      '<td>' + esc(k.position) + '<span class="block text-[11px] text-text-muted">' + esc(k.department) + '</span></td>' +
      '<td>' + rptLabelPill(k.label) + (k.targetIsB && k.label !== 'Binary' ? '<span class="block mt-1 text-[11px] text-text-muted">Target is B</span>' : '') + '</td>' +
      '<td class="text-right tabular-nums">' + (k.label === 'Binary' || !isNum(k.multiplier) ? '<span class="text-text-muted">-</span>' : num(k.multiplier, 2)) + '</td>' +
      '<td class="text-right tabular-nums">' + k.scored + '</td>' +
      '<td class="text-right"><span class="mx-t04 rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums">' + k.t04 + '</span></td>' +
      '<td class="text-right"><span class="mx-t02 rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums">' + k.t02 + '</span></td>' +
      '<td>' + rptRateCell(k.share, 'bg-status-danger') + '</td></tr>';
  });
  return {
    title: 'KPIs Most Often Below Target',
    sub: esc(md.monthName + ' • ' + md.scopeLabel),
    intro: '<p class="text-body-sm text-text-secondary mb-4 max-w-4xl">These KPIs landed at tier 0.4 (Below) or 0.2 (Critical) for the largest share of scorecards. ' +
      'Only KPIs scored on at least 3 scorecards are listed. A high share can point to a target that needs review, or to a problem the whole team shares.</p>',
    cols: rptCols([50, null, 230, 140, 100, 90, 80, 80, 200]),
    head: '<tr><th class="text-center">#</th><th>KPI and Metrics</th><th>Role</th><th>Label</th><th class="text-right">Multiplier</th><th class="text-right">Scored</th>' +
      '<th class="text-right">At 0.4</th><th class="text-right">At 0.2</th><th>Below or Critical</th></tr>',
    rows: rows,
    groups: rows.map(function () { return false; }),
    empty: 'No KPI scored on 3 or more scorecards landed at tier 0.4 or 0.2.',
    emptyGood: true
  };
}

function rptMissingBlock(md) {
  var admin = !!md.reminders;
  var span = admin ? 6 : 5;
  var list = md.missing;
  var people = distinct(list, 'NIK').length;
  var built = rptGrouped(list, span, function (r) {
    var remindedAt = admin ? md.reminders[r.NIK] : '';
    return '<tr><td>' + rptPerson(r) + '</td><td>' + esc(r.Position) + '</td><td>' + esc(r.Department) + '</td>' +
      '<td>' + rptStatusPill(r, md.open) + '</td>' +
      '<td class="text-right tabular-nums">' + (r.inCycle ? r.submitted + ' of ' + r.inCycle : '-') + '</td>' +
      (admin ? '<td>' + (remindedAt ? esc(fmtDate(remindedAt)) : '<span class="text-text-muted">Not reminded</span>') + '</td>' : '') +
    '</tr>';
  }, function (rows) { return plural(rows.length, 'scorecard'); });
  return {
    title: 'Not Submitted',
    sub: esc(md.monthName + ' • ' + md.scopeLabel),
    intro: list.length
      ? '<p class="text-body-sm text-text-secondary mb-4"><strong class="text-text-primary">' + plural(list.length, 'scorecard') + '</strong> from ' +
          plural(people, 'employee') + ' ' + (list.length === 1 ? 'is' : 'are') + ' not complete for ' + esc(md.monthName) + '. ' +
          esc(md.open && md.periodState ? 'The period is open until ' + fmtDate(md.periodState.cutoff) + '.' : rptPeriodText(md.periodState) + '.') + '</p>'
      : '',
    cols: rptCols(admin ? [null, 240, 240, 190, 110, 150] : [null, 260, 260, 200, 120]),
    head: '<tr><th>Employee</th><th>Position</th><th>Department</th><th>Status</th><th class="text-right">KPIs filled</th>' +
      (admin ? '<th>Last reminder</th>' : '') + '</tr>',
    rows: built.rows,
    groups: built.groups,
    empty: 'Every scorecard is submitted for ' + md.monthName + '.',
    emptyGood: true,
    after: list.length ? rptNote('KPIs filled counts the KPIs due this month that already have a value.') : ''
  };
}

function rptAppendixBlock(md) {
  var built = rptGrouped(rptSorted(md.rows), 8, function (r) {
    return '<tr><td>' + rptPerson(r) + '</td><td>' + esc(r.Position) + '</td><td>' + esc(r.Department) + '</td>' +
      '<td class="text-right tabular-nums">' + (r.inCycle ? r.submitted + ' of ' + r.inCycle : '-') + '</td>' +
      (r.submitted ? rptBandCell(r.index) : '<td class="text-right"><span class="text-text-muted">-</span></td>') +
      '<td>' + rptBandPill(r) + '</td>' +
      '<td>' + rptStatusPill(r, md.open) + '</td>' +
      '<td>' + (r.evidence ? 'On file' : '<span class="text-text-muted">No file</span>') + '</td></tr>';
  }, function (rows) { return plural(rows.length, 'scorecard'); });
  return {
    title: 'Appendix: All Scorecards',
    sub: esc(md.monthName + ' • ' + md.scopeLabel + ' • ' + plural(md.rows.length, 'scorecard')),
    cols: rptCols([null, 210, 200, 90, 100, 150, 190, 90]),
    head: '<tr><th>Employee</th><th>Position</th><th>Department</th><th class="text-right">KPIs</th><th class="text-right">Role Index</th>' +
      '<th>Rating</th><th>Status</th><th>Evidence</th></tr>',
    rows: built.rows,
    groups: built.groups,
    after: rptNote('KPIs counts the KPIs due this month that have a value.')
  };
}
