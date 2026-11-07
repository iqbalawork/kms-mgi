'use strict';

function rptAnnualBlocks(md, opts) {
  var seq = 0;
  var cid = function () { seq++; return 'rpt-chart-' + seq; };
  var on = function (key) { return !!opts.sections[key]; };
  var blocks = [rptAnnualSummary(md)];
  if (on('divisions')) blocks.push(rptGradeBlock(md));
  if (on('top')) blocks.push(rptTopBlock(md));
  if (on('topdiv')) blocks.push(rptTopDeptBlock(md));
  if (on('discipline')) blocks.push(rptDisciplineBlock(md));
  if (on('watch')) blocks.push(rptWatchBlock(md));
  if (on('trend')) {
    blocks.push(rptTrendBlock(md, cid, 'KPI Trend Through the Year',
      esc('January to ' + MONTHS[md.trend.upto - 1] + ' ' + md.year + ' • ' + md.scopeLabel)));
  }
  if (on('missing') && md.missing.length) blocks.push(rptEvalMissingBlock(md));
  if (on('results')) blocks.push(rptResultsBlock(md));
  if (on('months')) blocks.push(rptMonthsBlock(md));
  return blocks;
}

function rptAnnualSummary(md) {
  var t = md.total;
  var rules = md.rules || { weights: {}, grades: {} };
  var n = md.ranked.length;
  var pending = md.rows.length - md.complete;
  var grade = isNum(t.score) ? perfGrade(t.score, rules.grades) : null;
  var kb = isNum(t.avgKpi) ? band(t.avgKpi) : null;

  var tiles =
    statCard('People Evaluated', 'groups', 'text-text-primary', md.people.length, md.people.length === 1 ? 'Person' : 'People',
      plural(md.rows.length, 'scorecard') + ', including additional roles', '', 0) +
    statCard('Evaluation Completion', 'task_alt', pending ? 'text-status-warning-text' : 'text-status-success-text',
      md.complete, 'of ' + plural(md.rows.length, 'scorecard'),
      pending ? plural(pending, 'scorecard') + ' still missing inputs' : 'Every scorecard has all inputs',
      'bg-status-success', md.rows.length ? md.complete / md.rows.length * 100 : 0) +
    statCard('Average Performance Score', 'workspace_premium', 'text-text-primary',
      isNum(t.score) ? scoreText(t.score) : '-', grade ? 'Grade ' + grade : '',
      n ? 'Across ' + plural(n, 'person', 'people') + ' with a final score' : 'No final scores yet', '', 0) +
    statCard('Average KPI Score', 'insights', kb ? 'text-status-' + kb.key + '-text' : 'text-text-muted',
      kb ? t.avgKpi.toFixed(2) : '-', kb ? '%' : '',
      kb ? 'Rating: ' + esc(kb.label) + ' • ' + esc(rptCountedSpan(md.trialMonths)) : 'No counted months scored yet',
      kb ? 'bg-status-' + kb.key : '', t.avgKpi || 0);

  var ranges = gradeRanges(rules.grades);
  var dist = rptCard('Grade Distribution', esc(plural(n, 'person', 'people')) + ' with a final score',
    GRADES.map(function (g, i) {
      return rptBarRow(gradeBadge(g) + '<span class="ml-1">' + esc(ranges[i].label) + '</span>', md.dist[g], n, GRADE_COLORS[g]);
    }).join('') +
    (t.pending ? '<p class="text-body-sm text-text-muted">' + plural(t.pending, 'person', 'people') + ' not graded yet because inputs are missing.</p>' : ''),
    'col-span-5');

  var rulesCard = '<section class="mt-4 rounded-xl border border-border-light bg-white px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">' +
    '<span class="text-label-xs uppercase tracking-wider font-semibold text-text-muted">Scoring rules FY' + esc(md.year) + '</span>' +
    '<span class="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm">' + perfFormulaHtml(rules) + '</span>' +
    '<span class="flex flex-wrap items-center gap-x-3 gap-y-1 text-label-xs">' + gradeLegendHtml(rules.grades) + '</span>' +
  '</section>';

  var notes = [
    ['person', 'Each person is counted once in the averages, grades, and rankings, using their Home Role scorecard. Without one, the scorecard with the most KPI months is used. Additional Roles are listed in Appendix A.'],
    ['gavel', 'SP levels and Remarks SP are shown as recorded by Admin / HR. They do not change the score or grade, and on a tie a person without SP ranks first.']
  ];
  if (!md.released) notes.unshift(['edit_note', 'FY' + esc(md.year) + ' results are not released to employees yet, so scores can still change.']);

  return {
    html: rptHead('Executive Summary', esc('FY' + md.year + ' • ' + md.scopeLabel)) +
      '<div class="grid grid-cols-4 gap-4">' + tiles + '</div>' +
      '<div class="grid grid-cols-12 gap-4 mt-4">' + dist + rptCard('Key Findings', '', rptFindingsHtml(md.findings), 'col-span-7') + '</div>' +
      rulesCard + rptNotesHtml(notes),
    charts: []
  };
}

function rptGradeBlock(md) {
  var byScore = function (a, b) { return rptOrder(a.score, b.score, -1) || a.name.localeCompare(b.name); };
  var cells = function (g, cls, label) {
    return '<tr' + (cls ? ' class="' + cls + '"' : '') + '>' +
      '<td>' + label + '</td>' +
      '<td class="text-right tabular-nums">' + g.people + '</td>' +
      rptNumCell(g.avgKpi, 2) + rptNumCell(g.kbi, 2) + rptNumCell(g.s360, 2) + rptNumCell(g.discipline, 2) +
      rptNumCell(g.score, 2, 'font-bold text-text-primary') +
      '<td>' + rptGradeMix(g.dist) + '</td>' +
      GRADES.map(function (gr) { return '<td class="text-center tabular-nums">' + (g.dist[gr] || '<span class="text-text-muted">0</span>') + '</td>'; }).join('') +
      '<td class="text-right tabular-nums' + (g.pending ? ' text-status-warning-text font-semibold' : '') + '">' + g.pending + '</td>' +
    '</tr>';
  };
  var rows = [];
  var groups = [];
  md.groups.slice().sort(byScore).forEach(function (g) {
    rows.push(cells(g, 'rpt-lead', esc(g.name)));
    groups.push(true);
    g.depts.slice().sort(byScore).forEach(function (dg) {
      rows.push(cells(dg, '', '<span class="block pl-4">' + esc(dg.name) + '</span>'));
      groups.push(false);
    });
  });
  rows.push(cells(md.cardTotal, 'rpt-total', 'Overall'));
  groups.push(false);
  return {
    title: 'Grade Distribution by Division',
    sub: esc('FY' + md.year + ' • ' + md.scopeLabel + ' • highest average score first'),
    cols: rptCols([null, 100, 90, 80, 80, 100, 100, 160, 44, 44, 44, 44, 44, 86]),
    head: '<tr><th>Division / Department</th><th class="text-right">Scorecards</th><th class="text-right">Avg KPI</th><th class="text-right">KBI</th>' +
      '<th class="text-right">360</th><th class="text-right">Discipline</th><th class="text-right">Avg Score</th><th>Grade Mix</th>' +
      GRADES.map(function (g) { return '<th class="text-center">' + g + '</th>'; }).join('') + '<th class="text-right">Pending</th></tr>',
    rows: rows,
    groups: groups,
    after: rptLegend(GRADES.map(function (g) { return [GRADE_COLORS[g], 'Grade ' + g]; })) +
      rptNote('Each scorecard counts in the division and department of its role in Master KPIs, so an Additional Role counts where that role sits. ' +
        'Page 1 counts each person once. Component averages include every scorecard with a value. Avg Score and grades include only scorecards with a final score.')
  };
}

function rptScoreRow(x, extra) {
  var r = x.row || x;
  var rank = x.rank || 0;
  return '<tr><td class="text-center">' + (rank ? rptRankBadge(rank) : '<span class="text-text-muted">-</span>') + '</td>' +
    '<td>' + rptPerson(r) + '</td><td>' + esc(r.Position) + '</td><td>' + esc(r.Department) + '</td>' +
    (extra || '') +
    rptNumCell(r.avgKpi, 2) + rptNumCell(r.kbi, 2) + rptNumCell(r.s360, 2) + rptNumCell(r.discipline, 2) +
    rptNumCell(r.score, 2, 'font-bold text-text-primary') +
    '<td class="text-center">' + gradeBadge(r.grade) + '</td></tr>';
}

function rptSpCell(r, withRemarks) {
  if (!r.spLevel && !(withRemarks && r.remarks)) return '<td><span class="text-text-muted">-</span></td>';
  return '<td>' + (r.spLevel ? '<span class="pill ' + spTone(r.spLevel) + ' whitespace-nowrap !py-0 !px-1.5 !text-[11px]">' + esc(r.spLevel) + '</span>' : '') +
    (withRemarks && r.remarks ? '<span class="block mt-0.5 text-[11px] text-text-muted break-words">' + esc(r.remarks) + '</span>' : '') + '</td>';
}

var RPT_SCORE_HEAD = '<th class="text-right">Avg KPI</th><th class="text-right">KBI</th><th class="text-right">360</th>' +
  '<th class="text-right">Discipline</th><th class="text-right">Score</th><th class="text-center">Grade</th>';

function rptTopBlock(md) {
  var rows = md.top.shown.map(function (x) {
    return rptScoreRow(x, '<td>' + esc(x.row.Division) + '</td><td class="text-right tabular-nums">' + (x.row.kpiMonths || 0) + '</td>' + rptSpCell(x.row));
  });
  return {
    title: 'Top 10 Performers',
    sub: esc('FY' + md.year + ' • ' + md.scopeLabel),
    intro: '<p class="text-body-sm text-text-secondary mb-4 max-w-4xl">Ranked by Performance Score, then Avg KPI, then SP (no SP first, then SP1, SP2, SP3), then KPI Months. ' +
      'People with the same values share a rank. Each person is ranked once, on their Home Role scorecard.</p>',
    cols: rptCols([60, null, 150, 140, 120, 100, 60, 80, 70, 70, 90, 80, 60]),
    head: '<tr><th class="text-center">Rank</th><th>Employee</th><th>Position</th><th>Department</th><th>Division</th>' +
      '<th class="text-right">KPI Months</th><th>SP</th>' + RPT_SCORE_HEAD + '</tr>',
    rows: rows,
    groups: rows.map(function () { return false; }),
    empty: 'No one has a final Performance Score yet.',
    after: md.top.more ? rptNote('And ' + plural(md.top.more, 'more person', 'more people') + ' with the same scores as the last row.') : ''
  };
}

function rptTopDeptBlock(md) {
  var rows = md.depts.shown.map(function (x) {
    var g = x.row;
    return '<tr><td class="text-center">' + rptRankBadge(x.rank) + '</td>' +
      '<td class="font-semibold text-text-primary">' + esc(g.name) + '</td><td>' + esc(g.division) + '</td>' +
      '<td class="text-right tabular-nums">' + g.people + '</td>' +
      rptNumCell(g.avgKpi, 2, 'font-bold text-text-primary') + rptNumCell(g.kbi, 2) + rptNumCell(g.s360, 2) + rptNumCell(g.discipline, 2) +
      rptNumCell(g.score, 2) +
      '<td>' + rptGradeMix(g.dist) + '</td>' +
      '<td class="text-right tabular-nums' + (g.pending ? ' text-status-warning-text font-semibold' : '') + '">' + g.pending + '</td></tr>';
  });
  return {
    title: 'Top 5 Department',
    sub: esc('FY' + md.year + ' • ' + md.scopeLabel),
    intro: '<p class="text-body-sm text-text-secondary mb-4 max-w-4xl">Departments ranked by the average Avg KPI of their scorecards, then by average Performance Score. ' +
      'Each scorecard counts in the department of its role in Master KPIs, so an Additional Role counts where that role sits.</p>',
    cols: rptCols([60, null, 190, 110, 100, 80, 80, 100, 100, 180, 90]),
    head: '<tr><th class="text-center">Rank</th><th>Department</th><th>Division</th><th class="text-right">Scorecards</th><th class="text-right">Avg KPI</th>' +
      '<th class="text-right">KBI</th><th class="text-right">360</th><th class="text-right">Discipline</th><th class="text-right">Avg Score</th><th>Grade Mix</th>' +
      '<th class="text-right">Pending</th></tr>',
    rows: rows,
    groups: rows.map(function () { return false; }),
    empty: 'No department has a KPI score yet.',
    after: (md.depts.more ? rptNote('And ' + plural(md.depts.more, 'more department') + ' with the same values as the last row.') : '') +
      rptLegend(GRADES.map(function (g) { return [GRADE_COLORS[g], 'Grade ' + g]; }))
  };
}

function rptDisciplineBlock(md) {
  var rows = md.discipline.shown.map(function (x) {
    var r = x.row;
    return '<tr><td class="text-center">' + rptRankBadge(x.rank) + '</td>' +
      '<td>' + rptPerson(r) + '</td><td>' + esc(r.Position) + '</td><td>' + esc(r.Department) + '</td><td>' + esc(r.Division) + '</td>' +
      rptNumCell(r.discipline, 2, 'font-bold text-text-primary') + rptSpCell(r) +
      rptNumCell(r.avgKpi, 2) + rptNumCell(r.score, 2) +
      '<td class="text-center">' + gradeBadge(r.grade) + '</td></tr>';
  });
  return {
    title: 'Top 5 Discipline',
    sub: esc('FY' + md.year + ' • ' + md.scopeLabel),
    intro: '<p class="text-body-sm text-text-secondary mb-4 max-w-4xl">Ranked by Discipline Score, then SP (no SP first, then SP1, SP2, SP3). ' +
      'People with the same values share a rank. Each person counts once, on their Home Role.</p>',
    cols: rptCols([60, null, 190, 180, 160, 110, 80, 90, 90, 70]),
    head: '<tr><th class="text-center">Rank</th><th>Employee</th><th>Position</th><th>Department</th><th>Division</th>' +
      '<th class="text-right">Discipline</th><th>SP</th><th class="text-right">Avg KPI</th><th class="text-right">Score</th><th class="text-center">Grade</th></tr>',
    rows: rows,
    groups: rows.map(function () { return false; }),
    empty: 'No Discipline Score is filled yet.',
    after: md.discipline.more ? rptNote('And ' + plural(md.discipline.more, 'more person', 'more people') + ' with the same values as the last row.') : ''
  };
}

function rptLowest(r) {
  var parts = (r.parts || []).filter(function (p) { return p.required && isNum(p.value); });
  if (!parts.length) return '<span class="text-text-muted">-</span>';
  var low = parts.reduce(function (a, p) { return p.value < a.value ? p : a; }, parts[0]);
  return esc(low.label) + ' <span class="text-text-muted tabular-nums">' + scoreText(low.value) + '</span>';
}

function rptWatchBlock(md) {
  var rows = md.watch.map(function (r) {
    return '<tr><td>' + rptPerson(r) + '</td><td>' + esc(r.Position) + '</td><td>' + esc(r.Department) + '</td>' +
      rptNumCell(r.avgKpi, 2) + rptNumCell(r.kbi, 2) + rptNumCell(r.s360, 2) + rptNumCell(r.discipline, 2) +
      rptNumCell(r.score, 2, 'font-bold text-text-primary') +
      '<td class="text-center">' + gradeBadge(r.grade) + '</td>' +
      '<td>' + rptLowest(r) + '</td></tr>';
  });
  return {
    title: 'Development Watchlist',
    sub: esc('FY' + md.year + ' • ' + md.scopeLabel + ' • Grade D and E, lowest score first'),
    intro: '<p class="text-body-sm text-text-secondary mb-4 max-w-4xl">People who may need coaching or a performance improvement plan. ' +
      'Lowest Component shows the input with the lowest value, as a starting point for the conversation.</p>',
    cols: rptCols([null, 200, 190, 90, 80, 80, 90, 90, 70, 160]),
    head: '<tr><th>Employee</th><th>Position</th><th>Department</th>' + RPT_SCORE_HEAD + '<th>Lowest Component</th></tr>',
    rows: rows,
    groups: rows.map(function () { return false; }),
    empty: 'No one has Grade D or E in FY' + md.year + '.',
    emptyGood: true
  };
}

function rptEvalMissingBlock(md) {
  var built = rptGrouped(md.missing, 6, function (r) {
    return '<tr><td>' + rptPerson(r) + '</td><td>' + esc(r.Position) + '</td><td>' + esc(r.Department) + '</td>' +
      '<td class="text-right tabular-nums">' + (r.kpiMonths || 0) + '</td>' +
      rptNumCell(r.avgKpi, 2) +
      '<td class="font-semibold text-status-warning-text">' + esc((r.missing || []).join(', ') || '-') + '</td></tr>';
  }, function (rows) { return plural(rows.length, 'scorecard'); });
  return {
    title: 'Missing Inputs',
    sub: esc('FY' + md.year + ' • ' + md.scopeLabel + ' • ' + plural(md.missing.length, 'scorecard')),
    intro: '<p class="text-body-sm text-text-secondary mb-4 max-w-4xl">These scorecards have no final score yet. Fill the missing inputs in Performance Evaluation, ' +
      'then download the report again.</p>',
    cols: rptCols([null, 250, 250, 110, 110, 220]),
    head: '<tr><th>Employee</th><th>Position</th><th>Department</th><th class="text-right">KPI Months</th><th class="text-right">Avg KPI</th><th>Missing</th></tr>',
    rows: built.rows,
    groups: built.groups
  };
}

function rptResultsBlock(md) {
  var list = rptSorted(md.rows, function (a, b) { return rptOrder(a.score, b.score, -1); });
  var built = rptGrouped(list, 12, function (r) {
    return rptScoreRow({ row: r, rank: md.rankOf[r.Eval_ID] || 0 },
      '<td class="text-right tabular-nums">' + (r.kpiMonths || 0) + '</td>' + rptSpCell(r, true));
  }, function (rows) { return plural(rows.length, 'scorecard'); });
  return {
    title: 'Appendix A: Individual Results',
    sub: esc('FY' + md.year + ' • ' + md.scopeLabel + ' • ' + plural(md.rows.length, 'scorecard')),
    cols: rptCols([60, null, 160, 150, 100, 170, 80, 70, 70, 90, 80, 60]),
    head: '<tr><th class="text-center">Rank</th><th>Employee</th><th>Position</th><th>Department</th><th class="text-right">KPI Months</th><th>SP and Remarks</th>' + RPT_SCORE_HEAD + '</tr>',
    rows: built.rows,
    groups: built.groups,
    after: rptNote('Rank is the company rank from the Top 10 rules. Additional Roles, inactive roles, and scorecards without a final score show a dash.')
  };
}

function rptMonthsBlock(md) {
  var trial = md.trialMonths;
  var built = rptGrouped(rptSorted(md.rows), 15, function (r) {
    var months = r.months || [];
    var cells = MONTHS.map(function (m, i) {
      var isTrial = trial.indexOf(i + 1) > -1;
      var v = months[i];
      return '<td class="!px-0.5 text-center' + (isTrial ? ' recap-trial' : '') + '">' + dashCell(isNum(v) ? v : null, isTrial) + '</td>';
    }).join('');
    return '<tr><td>' + rptPerson(r) + '<span class="block text-[11px] text-text-muted truncate">' + esc(r.Position + ' • ' + r.Department) + '</span></td>' +
      cells + '<td class="text-right tabular-nums">' + (r.kpiMonths || 0) + '</td>' +
      '<td class="!px-1 text-center">' + dashCell(isNum(r.avgKpi) ? r.avgKpi : null) + '</td></tr>';
  }, function (rows) { return plural(rows.length, 'scorecard'); });
  return {
    title: 'Appendix B: Monthly KPI Scores',
    cls: 'rpt-heat',
    sub: esc('FY' + md.year + ' • ' + md.scopeLabel + ' • Role Index by month'),
    cols: rptCols([null].concat(MONTHS.map(function () { return 66; })).concat([70, 86])),
    head: '<tr><th>Employee</th>' + MONTHS.map(function (m, i) {
      return '<th class="!px-0.5 text-center' + (trial.indexOf(i + 1) > -1 ? ' recap-trial' : '') + '">' + m.substring(0, 3) + rptTrialMark(trial.indexOf(i + 1) > -1) + '</th>';
    }).join('') + '<th class="text-right">Months</th><th class="!px-1 text-center">Avg KPI</th></tr>',
    rows: built.rows,
    groups: built.groups,
    after: rptBandLegend()
  };
}

function rptMeasure(probe) {
  var body = probe.querySelector('.pdf-body');
  var wrap = probe.querySelector('[data-pdf-table]');
  var head = probe.querySelector('[data-pdf-shead]');
  var rows = wrap ? Array.prototype.slice.call(wrap.querySelectorAll('tbody tr')) : [];
  var room = body ? body.clientHeight : 0;
  var rect = function (el) { return el.getBoundingClientRect(); };
  if (!rows.length) return { heights: [], firstRoom: room, nextRoom: room, tail: 0 };
  return {
    heights: rows.map(function (r) { return rect(r).height; }),
    firstRoom: room - (rect(rows[0]).top - rect(body).top) - 4,
    nextRoom: room - (head ? rect(head).height + 12 : 0) - (rect(rows[0]).top - rect(wrap).top) - 4,
    tail: rect(wrap).bottom - rect(rows[rows.length - 1]).bottom
  };
}

function rptChunks(layout, groups) {
  var h = layout.heights;
  var chunks = [];
  var room = layout.firstRoom;
  var used = 0;
  var count = 0;
  h.forEach(function (x) {
    if (used + x > room && (count > 0 || !chunks.length)) {
      chunks.push(count);
      room = layout.nextRoom;
      used = 0;
      count = 0;
    }
    used += x;
    count++;
  });
  var moved = 0;
  while (count - moved > 1 && used + layout.tail > room) {
    moved++;
    used -= h[h.length - moved];
  }
  chunks.push(count - moved);
  if (moved) chunks.push(moved);
  var start = 0;
  for (var n = 0; n < chunks.length - 1; n++) {
    while (chunks[n] > 1 && groups[start + chunks[n] - 1]) {
      chunks[n]--;
      chunks[n + 1]++;
    }
    start += chunks[n];
  }
  return chunks;
}

function rptTableBlockHtml(b, part, cont, last) {
  return '<div data-pdf-table>' + (cont === null ? '' : rptHead(b.contTitle || b.title, '', cont)) +
    rptTableHtml(b, part) + (last ? b.after || '' : '') + '</div>';
}

function rptLayout(stage, ctx, blocks) {
  var probes = blocks.map(function (b) {
    if (!b.rows) return pdfSheet(stage, ctx, b.html);
    var top = rptHead(b.title, b.sub) + (b.intro || '');
    if (!b.rows.length) return pdfSheet(stage, ctx, top + (b.empty ? rptEmptyHtml(b.empty, b.emptyGood) : ''));
    return pdfSheet(stage, ctx, top + rptTableBlockHtml(b, b.rows.join(''), null, true));
  });
  return pdfSettle().then(function () {
    var sheets = [];
    blocks.forEach(function (b, n) {
      var probe = probes[n];
      var body = probe.querySelector('.pdf-body');
      var fit = probe.querySelector('.pdf-fit');
      if (!b.rows || !b.rows.length || (body && fit && fit.scrollHeight <= body.clientHeight * 1.1)) {
        sheets.push(probe);
        return;
      }
      var chunks = rptChunks(rptMeasure(probe), b.groups || []);
      probe.remove();
      var start = 0;
      chunks.forEach(function (count, i) {
        var first = i === 0;
        var last = i === chunks.length - 1;
        var html = first ? rptHead(b.title, b.sub) + (b.intro || '') : '';
        if (count || last) html += rptTableBlockHtml(b, b.rows.slice(start, start + count).join(''), first ? null : start > 0, last);
        sheets.push(pdfSheet(stage, ctx, html));
        start += count;
      });
    });
    return pdfSettle().then(function () { return sheets; });
  });
}

function rptDrawCharts(blocks) {
  if (!window.Chart) return [];
  ensureChartTheme();
  var out = [];
  blocks.forEach(function (b) {
    (b.charts || []).forEach(function (c) {
      var canvas = $(c.id);
      if (canvas) out.push(new window.Chart(canvas, c.cfg));
    });
  });
  return out;
}
