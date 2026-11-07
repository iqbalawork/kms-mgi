'use strict';

var RPT_SECTIONS = {
  monthly: [
    { key: 'summary',    label: 'Executive Summary',                  hint: 'Headline numbers, rating distribution, and key findings', fixed: true },
    { key: 'compliance', label: 'Submission Compliance',              hint: 'Who has submitted, by division and department' },
    { key: 'divisions',  label: 'Performance by Division',            hint: 'Average score against last month and the year to date' },
    { key: 'trend',      label: 'Year to Date Trend',                 hint: 'Average score and submission rate since January, with a heatmap' },
    { key: 'people',     label: 'Top Performers and Needs Attention', hint: 'Top 10 this month and every scorecard rated Needs Attention' },
    { key: 'kpis',       label: 'KPIs Most Often Below Target',       hint: 'KPIs that most often land at tier 0.4 or 0.2' },
    { key: 'missing',    label: 'Not Submitted',                      hint: 'Everyone still missing KPIs this month, by division' },
    { key: 'appendix',   label: 'Appendix: All Scorecards',           hint: 'Every scorecard with its score, rating, and status' }
  ],
  annual: [
    { key: 'summary',   label: 'Executive Summary',              hint: 'Headline numbers, grade distribution, scoring rules, and key findings', fixed: true },
    { key: 'divisions', label: 'Grade Distribution by Division', hint: 'Grades and average components by division and department' },
    { key: 'top',       label: 'Top 10 Performers',              hint: 'The highest Performance Scores in this report' },
    { key: 'topdiv',    label: 'Top 5 Department',               hint: 'The departments with the highest average Avg KPI' },
    { key: 'discipline', label: 'Top 5 Discipline',              hint: 'The highest Discipline Scores, with no SP ranked first on a tie' },
    { key: 'watch',     label: 'Development Watchlist',          hint: 'Everyone with Grade D or E' },
    { key: 'trend',     label: 'KPI Trend Through the Year',     hint: 'Average KPI score and submission rate by month, with a heatmap' },
    { key: 'missing',   label: 'Missing Inputs',                 hint: 'Scorecards still waiting for inputs, shown only when there are any' },
    { key: 'results',   label: 'Appendix A: Individual Results', hint: 'Every scorecard with its components, score, and grade' },
    { key: 'months',    label: 'Appendix B: Monthly KPI Scores', hint: 'Every scorecard month by month' }
  ]
};

var RPT_PRIVATE = ['updatedAt', 'updatedBy'];

var RPT_ROWS = { monthly: 21, annual: 16 };

function openReportDownload(kind) {
  if (S.pdfBusy) return;
  var annual = kind === 'annual';
  if (annual && !(S.user && S.user.isAdmin)) return;
  var src = annual ? S.evaluation : S.summary;
  if (!src) {
    toast('The page is still loading. Try again in a moment.', 'warning');
    return;
  }
  var sections = {};
  RPT_SECTIONS[annual ? 'annual' : 'monthly'].forEach(function (s) { sections[s.key] = true; });
  var scope = annual ? '' : src.scope || '';
  var evalDivision = $('eval-division');
  S.rptDialog = {
    kind: annual ? 'annual' : 'monthly',
    year: src.year,
    month: annual ? 0 : src.month,
    division: scope ? '' : annual ? (evalDivision ? evalDivision.value : '') : sumDivision(),
    scope: scope,
    released: !!(annual && src.rules && src.rules.released),
    sections: sections
  };
  renderReportDialog();
}

function closeReportDownload() {
  S.rptDialog = null;
  $('modal-host').innerHTML = '';
}

function rptDialogDivisions(d) {
  if (d.kind === 'annual') return (S.evaluation && S.evaluation.divisions) || [];
  return distinct((S.summary && S.summary.rows) || [], 'Division');
}

function rptStatic(label, value) {
  return '<div><span class="form-label">' + esc(label) + '</span>' +
    '<p class="rounded-lg border border-border-light bg-surface-page px-3 py-2 text-body-md text-text-secondary">' + esc(value) + '</p></div>';
}

function renderReportDialog() {
  var d = S.rptDialog;
  if (!d) return;
  var annual = d.kind === 'annual';
  var divisions = rptDialogDivisions(d);

  var period = annual
    ? rptStatic('Year', 'FY' + d.year)
    : '<div><label for="rpt-month" class="form-label">Month</label>' +
        '<select id="rpt-month" class="field" onchange="MGI.onReportDialog()">' +
          MONTHS.map(function (m, i) {
            return '<option value="' + (i + 1) + '"' + (i + 1 === d.month ? ' selected' : '') + '>' + m + ' ' + d.year + '</option>';
          }).join('') +
        '</select></div>';

  var division = d.scope
    ? rptStatic('Division', d.scope)
    : '<div><label for="rpt-division" class="form-label">Division</label>' +
        '<select id="rpt-division" class="field" onchange="MGI.onReportDialog()">' +
          '<option value="">All Divisions</option>' +
          divisions.map(function (v) {
            return '<option value="' + esc(v) + '"' + (v === d.division ? ' selected' : '') + '>' + esc(v) + '</option>';
          }).join('') +
        '</select></div>';

  var list = RPT_SECTIONS[d.kind].map(function (s) {
    var on = s.fixed || d.sections[s.key];
    return '<label class="flex items-start gap-3 rounded-lg border border-border-light px-3 py-2.5' +
        (s.fixed ? ' bg-surface-page' : ' cursor-pointer transition-all duration-150 hover:bg-slate-50') + '">' +
      '<input type="checkbox" class="mt-0.5 w-4 h-4 rounded border-border-medium text-primary-container shrink-0" data-rpt-section="' + s.key + '"' +
        (on ? ' checked' : '') + (s.fixed ? ' disabled' : '') + ' onchange="MGI.onReportDialog()">' +
      '<span class="min-w-0">' +
        '<span class="block text-body-sm font-semibold text-text-primary">' + esc(s.label) +
          (s.fixed ? '<span class="ml-1.5 text-label-xs font-medium text-text-muted">Always included</span>' : '') + '</span>' +
        '<span class="block text-label-sm text-text-muted">' + esc(s.hint) + '</span>' +
      '</span>' +
    '</label>';
  }).join('');

  var draft = annual && !d.released
    ? '<div class="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-2.5 text-body-sm text-amber-800 flex items-start gap-2">' +
        '<span class="material-symbols-outlined text-[18px]">edit_note</span>' +
        '<span>FY' + d.year + ' is not released to employees yet. Every page is marked <strong>Draft, not released</strong>.</span></div>'
    : '';

  $('modal-host').innerHTML =
    '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closeReportDownload()">' +
      '<div class="modal-panel !max-w-2xl" role="dialog" aria-modal="true" aria-labelledby="rpt-title">' +
        '<div class="px-6 pt-6 pb-4 flex items-start gap-4">' +
          '<span class="w-10 h-10 rounded-full bg-brand-50 text-primary-container flex items-center justify-center shrink-0">' +
            '<span class="material-symbols-outlined text-[22px]">picture_as_pdf</span></span>' +
          '<div class="min-w-0">' +
            '<h2 id="rpt-title" class="text-title-lg text-text-primary">' + (annual ? 'Performance Evaluation Report' : 'Monthly KPI Report') + '</h2>' +
            '<p class="text-body-sm text-text-secondary mt-1">' + (annual
              ? 'A PDF of the year for directors and HR: grades, top performers, the watchlist, and every individual result.'
              : 'A PDF of one month for directors and HR: results, who has and has not submitted, and who needs attention.') + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="px-6 pb-5 flex flex-col gap-4">' +
          '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' + period + division + '</div>' +
          draft +
          '<div><p class="form-label">Sections</p><div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' + list + '</div></div>' +
          '<p class="flex items-start gap-2 text-label-sm text-text-muted">' +
            '<span class="material-symbols-outlined text-[16px]">info</span>' +
            '<span>' + (annual
              ? 'The report uses the latest scores at the moment you download it, including SP levels and Remarks SP.'
              : 'The report uses the latest data at the moment you download it, with the same numbers as the Summary Report.') + '</span></p>' +
        '</div>' +
        '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex items-center justify-end gap-space-sm">' +
          '<p id="rpt-pages" class="mr-auto text-label-sm text-text-muted">' + esc(rptEstimateText(d)) + '</p>' +
          '<button type="button" class="btn btn-secondary" onclick="MGI.closeReportDownload()">Cancel</button>' +
          '<button id="rpt-go" type="button" class="btn btn-primary" onclick="MGI.downloadOrgReport()">' +
            '<span class="material-symbols-outlined text-[18px]">download</span> Download PDF</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function onReportDialog() {
  var d = S.rptDialog;
  if (!d) return;
  var month = $('rpt-month');
  var division = $('rpt-division');
  if (!annualDialog(d) && month && parseInt(month.value, 10)) d.month = parseInt(month.value, 10);
  if (!d.scope && division) d.division = division.value || '';
  Array.prototype.forEach.call(document.querySelectorAll('[data-rpt-section]'), function (box) {
    if (!box.disabled) d.sections[box.getAttribute('data-rpt-section')] = !!box.checked;
  });
  var pages = $('rpt-pages');
  if (pages) pages.textContent = rptEstimateText(d);
}

function annualDialog(d) {
  return d.kind === 'annual';
}

function rptEstimate(d) {
  var on = function (key) { return !!d.sections[key]; };
  var annual = annualDialog(d);
  var pages = function (n) { return Math.max(1, Math.ceil(n / RPT_ROWS[d.kind])); };
  var rows = ((annual ? S.evaluation : S.summary) || {}).rows || [];
  rows = rows.filter(function (r) { return !d.division || eqiJs(r.Division, d.division); });
  var divs = distinct(rows, 'Division').length;
  var groups = divs + distinct(rows.map(function (r) { return { k: r.Division + '|' + r.Department }; }), 'k').length + 1;
  if (annual) {
    var pending = rows.filter(function (r) { return !r.complete; }).length;
    var low = rows.filter(function (r) { return r.grade === 'D' || r.grade === 'E'; }).length;
    return 1 + (on('divisions') ? pages(groups + 8) : 0) + (on('top') ? 1 : 0) + (on('topdiv') ? pages(divs * 4) : 0) +
      (on('watch') ? pages(low) : 0) + (on('trend') ? pages(divs + 12) : 0) + (on('missing') && pending ? pages(pending + divs) : 0) +
      (on('results') ? pages(rows.length + divs) : 0) + (on('months') ? pages(rows.length + divs) : 0);
  }
  var missing = rows.filter(function (r) { return r.submitted === 0 || r.statusKey === 'partial'; }).length;
  var attention = rows.filter(function (r) { return r.submitted > 0 && band(r.index).key === 'danger'; }).length;
  return 1 + (on('compliance') ? pages(groups + 8) : 0) + (on('divisions') ? pages(groups + 8) : 0) + (on('trend') ? pages(divs + 12) : 0) +
    (on('people') ? pages(attention + 16) : 0) + (on('kpis') ? 1 : 0) + (on('missing') ? pages(missing + divs) : 0) +
    (on('appendix') ? pages(rows.length + divs) : 0);
}

function rptEstimateText(d) {
  return 'About ' + plural(rptEstimate(d), 'page');
}

function downloadOrgReport() {
  var d = S.rptDialog;
  if (!d || S.pdfBusy) return;
  onReportDialog();
  var opts = {
    kind: d.kind,
    year: d.year,
    month: d.month,
    division: d.division,
    scope: d.scope,
    sections: Object.assign({}, d.sections),
    admin: !!(S.user && S.user.isAdmin),
    when: new Date(),
    by: S.user ? S.user.Full_Name : ''
  };
  var annual = opts.kind === 'annual';
  closeReportDownload();
  S.pdfBusy = true;
  var stage = null;
  var charts = [];
  pdfBusy('Loading the latest scores', 0, 0);

  var loads = annual
    ? [api('getPerformanceEvaluation', opts.year), api('getAnnualRecap', opts.year)]
    : [api('getAdminSummary', opts.year, opts.month, {}),
       opts.month > 1 ? api('getAdminSummary', opts.year, opts.month - 1, {}) : Promise.resolve(null),
       api('getAnnualRecap', opts.year)];
  loads.push(loadPdfLibs().catch(function () {
    throw new Error('The PDF tools could not be loaded. Check your connection and try again.');
  }));

  Promise.all(loads)
    .then(function (res) {
      var libs = res[res.length - 1];
      syncBands(annual ? res[1].bands : res[0].bands);
      var model = annual ? rptAnnualModel(rptNoAudit(res[0]), res[1], opts) : rptMonthlyModel(res[0], res[1], res[2], opts);
      if (!model.rows.length) {
        throw new Error('There are no scorecards for this ' + (annual ? 'division' : 'month and division') + '. Pick another one and try again.');
      }
      var ctx = rptContext(model, opts);
      var blocks = annual ? rptAnnualBlocks(model, opts) : rptMonthlyBlocks(model, opts);
      stage = document.createElement('div');
      stage.id = 'pdf-stage';
      stage.className = 'pdf-stage';
      document.body.appendChild(stage);
      pdfBusy('Laying out the pages', 0, 0);
      return rptLayout(stage, ctx, blocks).then(function (sheets) {
        pdfFinishSheets(sheets);
        charts = rptDrawCharts(blocks);
        return pdfRender(libs, sheets, ctx, rptFileName(model, opts));
      });
    })
    .then(function () { toast('Report downloaded.', 'success'); })
    .catch(function (err) {
      toast(err && err.message ? err.message : 'The report could not be prepared. Try again.', 'error');
    })
    .then(function () {
      charts.forEach(function (c) { c.destroy(); });
      if (stage) stage.remove();
      pdfBusy(null);
      S.pdfBusy = false;
    });
}

function rptNoAudit(data) {
  var out = pdfCopy(data);
  out.rows = (data.rows || []).map(function (r) {
    var row = {};
    Object.keys(r).forEach(function (k) {
      if (RPT_PRIVATE.indexOf(k) === -1) row[k] = r[k];
    });
    return row;
  });
  return out;
}

function rptTheme(year) {
  if (S.dash && S.dash.year === year && S.dash.theme) return S.dash.theme;
  if (S.dashboard && S.dashboard.year === year && S.dashboard.theme) return S.dashboard.theme;
  return '';
}

function rptRound1(v) {
  return Math.round(v * 10) / 10;
}

function rptMean(values, dp) {
  var list = (values || []).filter(isNum);
  if (!list.length) return null;
  var f = Math.pow(10, dp === undefined ? 2 : dp);
  return Math.round(list.reduce(function (s, v) { return s + v; }, 0) / list.length * f) / f;
}

function rptShare(part, whole) {
  return whole ? Math.round(part / whole * 1000) / 10 : null;
}

function rptGroupBy(rows, field) {
  var map = {};
  var order = [];
  rows.forEach(function (r) {
    var name = String(r[field] || '').trim() || '-';
    if (!map[name]) {
      map[name] = [];
      order.push(name);
    }
    map[name].push(r);
  });
  return order.sort().map(function (name) { return { name: name, rows: map[name] }; });
}

function rptSorted(list, cmp) {
  return list.slice().sort(function (a, b) {
    return String(a.Division || '').localeCompare(String(b.Division || '')) ||
      String(a.Department || '').localeCompare(String(b.Department || '')) ||
      (cmp ? cmp(a, b) : 0) ||
      String(a.Full_Name || '').localeCompare(String(b.Full_Name || ''));
  });
}

function rptOrder(a, b, dir) {
  var x = isNum(a);
  var y = isNum(b);
  if (!x || !y) return x === y ? 0 : x ? -1 : 1;
  return (a - b) * dir;
}

function rptPickPeople(rows, depth) {
  var map = {};
  var order = [];
  rows.forEach(function (r) {
    if (r.roleInactive) return;
    if (!map[r.NIK]) {
      map[r.NIK] = [];
      order.push(r.NIK);
    }
    map[r.NIK].push(r);
  });
  return order.map(function (nik) {
    var list = map[nik];
    var home = list.filter(function (r) { return r.isHome; })[0];
    if (home) return home;
    return list.reduce(function (best, r) { return depth(r) > depth(best) ? r : best; }, list[0]);
  });
}

function rptRank(list, keys) {
  var sorted = list.slice().sort(function (a, b) {
    for (var i = 0; i < keys.length; i++) {
      var x = keys[i](a);
      var y = keys[i](b);
      if (x !== y) return y - x;
    }
    return String(a.Full_Name || '').localeCompare(String(b.Full_Name || ''));
  });
  var last = null;
  return sorted.map(function (r, i) {
    var vals = keys.map(function (k) { return k(r); });
    var tied = !!last && vals.every(function (v, j) { return v === last.vals[j]; });
    last = { vals: vals, rank: tied ? last.rank : i + 1 };
    return { row: r, rank: last.rank };
  });
}

function rptTop(ranked, limit, cap) {
  var within = ranked.filter(function (x) { return x.rank <= limit; });
  return { shown: within.slice(0, cap), more: Math.max(0, within.length - cap) };
}

function rptRoleId(r) {
  return String(r.NIK) + '|' + String(r.Position || '').trim().toLowerCase() + '|' + String(r.Department || '').trim().toLowerCase();
}

function rptTier1(r) {
  return (r.items || []).filter(function (it) { return !it.AutoScore && isNum(it.Score) && it.Score >= 0.95; }).length;
}

function rptChangeText(v) {
  if (!isNum(v) || v === 0) return 'no change';
  return (v > 0 ? 'up ' : 'down ') + num(Math.abs(v), 1) + ' pts';
}

function rptPeriodText(ps) {
  if (ps && ps.isOpen) return 'Open until ' + fmtDate(ps.cutoff);
  if (ps && ps.cutoff && ps.expired) return 'Closed on ' + fmtDate(ps.cutoff);
  return 'Closed for submission';
}

function rptYtd(rows, upto, trial) {
  return rptMean(rows.map(function (r) {
    var vals = [];
    for (var i = 0; i < upto; i++) {
      var v = r.months ? r.months[i] : null;
      if (isNum(v) && trial.indexOf(i + 1) === -1) vals.push(v);
    }
    return rptMean(vals, 2);
  }), 2);
}

function rptTrend(rows, upto, trial) {
  var months = [];
  for (var i = 0; i < 12; i++) {
    var vals = rows.map(function (r) { return r.months ? r.months[i] : null; }).filter(isNum);
    var shown = i < upto;
    months.push({
      month: i + 1,
      trial: trial.indexOf(i + 1) > -1,
      avg: shown ? rptMean(vals, 2) : null,
      completed: vals.length,
      total: rows.length,
      rate: shown ? rptShare(vals.length, rows.length) : null
    });
  }
  var due = months.slice(0, upto).filter(function (m) { return !m.trial; });
  var best = null;
  var lowest = null;
  due.forEach(function (m) {
    if (!isNum(m.avg)) return;
    if (!best || m.avg > best.avg) best = m;
    if (!lowest || m.avg < lowest.avg) lowest = m;
  });
  var done = due.reduce(function (s, m) { return s + m.completed; }, 0);
  return {
    months: months,
    upto: upto,
    scorecards: rows.length,
    ytdAvg: rptYtd(rows, upto, trial),
    rate: rptShare(done, due.length * rows.length),
    best: best,
    lowest: lowest && (!best || lowest.month !== best.month) ? lowest : null
  };
}

function rptHeat(rows, field, upto, trial) {
  return rptGroupBy(rows, field).map(function (g) {
    return { name: g.name, trend: rptTrend(g.rows, upto, trial) };
  }).sort(function (a, b) { return rptOrder(a.trend.ytdAvg, b.trend.ytdAvg, -1) || a.name.localeCompare(b.name); });
}

function rptMonthGroup(name, rows, prevRows, recapRows, upto, trial) {
  var st = summaryStats(rows);
  var pst = prevRows ? summaryStats(prevRows) : null;
  var partial = rows.filter(function (r) { return r.statusKey === 'partial'; }).length;
  var bands = { success: 0, info: 0, danger: 0 };
  rows.forEach(function (r) { if (r.submitted > 0) bands[band(r.index).key]++; });
  var avg = st.dist.total ? st.avg : null;
  var prevAvg = pst && pst.dist.total ? pst.avg : null;
  var rate = st.roles ? st.submittedPercent : null;
  var prevRate = pst && pst.roles ? pst.submittedPercent : null;
  return {
    name: name,
    scorecards: st.roles,
    employees: st.employees,
    complete: st.roles - st.pending - partial,
    partial: partial,
    pending: st.pending,
    evidence: st.evidence,
    rate: rate,
    rateChange: isNum(rate) && isNum(prevRate) ? rptRound1(rate - prevRate) : null,
    avg: avg,
    prevAvg: prevAvg,
    change: isNum(avg) && isNum(prevAvg) ? rptRound1(avg - prevAvg) : null,
    dist: st.dist,
    bands: bands,
    ytd: rptYtd(recapRows, upto, trial)
  };
}

function rptMonthlyModel(cur, prev, recap, opts) {
  var m = opts.month;
  var trial = (recap && recap.trialMonths) || [];
  var inDiv = function (r) { return !opts.division || eqiJs(r.Division, opts.division); };
  var rows = (cur.rows || []).filter(inDiv);
  var comparable = !!prev && m > 1 && trial.indexOf(m) === -1 && trial.indexOf(m - 1) === -1;
  var prevRows = comparable ? (prev.rows || []).filter(inDiv) : null;
  var recapRows = ((recap && recap.rows) || []).filter(inDiv);
  var same = function (field, value) { return function (r) { return eqiJs(r[field], value); }; };
  var within = function (list, test) { return list ? list.filter(test) : null; };
  var monthsOf = {};
  ((recap && recap.rows) || []).forEach(function (r) {
    var count = 0;
    for (var i = 0; i < m; i++) {
      if (isNum(r.months ? r.months[i] : null) && trial.indexOf(i + 1) === -1) count++;
    }
    monthsOf[rptRoleId(r)] = count;
  });
  var kpiMonths = function (r) { return monthsOf[rptRoleId(r)] || 0; };

  var groups = rptGroupBy(rows, 'Division').map(function (g) {
    var inG = same('Division', g.name);
    var lead = rptMonthGroup(g.name, g.rows, within(prevRows, inG), recapRows.filter(inG), m, trial);
    lead.depts = rptGroupBy(g.rows, 'Department').map(function (dg) {
      var inD = function (r) { return inG(r) && eqiJs(r.Department, dg.name); };
      return rptMonthGroup(dg.name, dg.rows, within(prevRows, inD), recapRows.filter(inD), m, trial);
    });
    return lead;
  });

  var people = rptPickPeople(rows, function (r) { return r.submitted || 0; }).filter(function (r) { return r.submitted > 0; });
  var ranked = rptRank(people, [function (r) { return r.index; }, rptTier1, kpiMonths]);

  var attention = rows.filter(function (r) { return r.submitted > 0 && !r.roleInactive && band(r.index).key === 'danger'; })
    .map(function (r) {
      var due = (r.items || []).filter(function (it) { return it.InCycle && !it.AutoScore && it.IsActive !== false; });
      var weakest = due.slice().sort(function (a, b) {
        var x = isNum(a.Score) ? a.Score : 0;
        var y = isNum(b.Score) ? b.Score : 0;
        return x - y || (b.Weight || 0) - (a.Weight || 0);
      })[0] || null;
      return {
        row: r,
        weakest: weakest,
        low: due.filter(function (it) { return !isNum(it.Score) || it.Score < 0.5; }).length,
        due: due.length
      };
    })
    .sort(function (a, b) { return a.row.index - b.row.index || String(a.row.Full_Name).localeCompare(String(b.row.Full_Name)); });

  var kpiMap = {};
  var kpiList = [];
  rows.forEach(function (r) {
    (r.items || []).forEach(function (it) {
      if (it.AutoScore || !isNum(it.Score) || it.IsActive === false) return;
      var k = kpiMap[it.KPI_ID];
      if (!k) {
        k = kpiMap[it.KPI_ID] = { name: it.KPI_Name, metrics: it.Metrics || '', label: it.Label || '', multiplier: it.Multiplier, targetIsB: it.Target_Is_B === true,
          position: it.Position, department: it.Department, scored: 0, t04: 0, t02: 0 };
        kpiList.push(k);
      }
      k.scored++;
      if (it.Score < 0.3) k.t02++;
      else if (it.Score < 0.5) k.t04++;
    });
  });
  var kpis = kpiList.filter(function (k) { return k.scored >= 3 && k.t04 + k.t02 > 0; })
    .map(function (k) {
      k.low = k.t04 + k.t02;
      k.share = rptShare(k.low, k.scored);
      return k;
    })
    .sort(function (a, b) { return b.share - a.share || b.low - a.low || String(a.name).localeCompare(String(b.name)); })
    .slice(0, 10);

  var md = {
    kind: 'monthly',
    year: opts.year,
    month: m,
    monthName: MONTHS[m - 1] + ' ' + opts.year,
    prevName: comparable ? MONTHS[m - 2] : '',
    trial: trial.indexOf(m) > -1,
    comparable: comparable,
    kpiMonths: kpiMonths,
    open: !!(cur.periodState && cur.periodState.isOpen),
    periodState: cur.periodState || null,
    evidenceOptional: rows.some(function (r) { return r.evidenceOptional; }),
    theme: rptTheme(opts.year),
    scopeLabel: opts.division || opts.scope || 'All divisions',
    rows: rows,
    total: rptMonthGroup('Overall', rows, prevRows, recapRows, m, trial),
    groups: groups,
    lead: groups.length === 1 ? groups[0].depts : groups,
    leadField: groups.length === 1 ? 'Department' : 'Division',
    trend: rptTrend(recapRows, m, trial),
    heat: rptHeat(recapRows, distinct(recapRows, 'Division').length > 1 ? 'Division' : 'Department', m, trial),
    heatField: distinct(recapRows, 'Division').length > 1 ? 'Division' : 'Department',
    top: rptTop(ranked, 10, 15),
    attention: attention,
    kpis: kpis,
    missing: rptSorted(rows.filter(function (r) { return !r.roleInactive && (r.statusKey === 'pending' || r.statusKey === 'partial'); })),
    reminders: opts.admin ? cur.reminders || {} : null
  };
  md.findings = rptMonthlyFindings(md);
  return md;
}

function rptMonthlyFindings(md) {
  var out = [];
  var t = md.total;
  var field = md.leadField.toLowerCase();
  if (isNum(t.avg)) {
    var b = band(t.avg);
    out.push({ icon: 'insights', tone: 'text-status-' + b.key,
      html: 'Average score is <strong>' + num(t.avg) + '</strong>, rated ' + esc(b.label) +
        (md.comparable && isNum(t.change) ? ', ' + rptChangeText(t.change) + ' from ' + esc(md.prevName) : '') + '.' });
  }
  out.push(t.pending
    ? { icon: 'pending_actions', tone: 'text-status-warning',
        html: '<strong>' + plural(t.pending, 'scorecard') + '</strong> ' + (t.pending === 1 ? 'has' : 'have') + ' not been submitted' +
          (md.open && md.periodState ? ' yet. The period is open until ' + esc(fmtDate(md.periodState.cutoff)) + '.' : '.') }
    : { icon: 'task_alt', tone: 'text-status-success', html: 'Every scorecard in this report is submitted.' });
  var rated = md.lead.filter(function (g) { return isNum(g.rate); }).sort(function (a, b) { return a.rate - b.rate; });
  if (rated.length > 1 && rated[0].rate < 100) {
    out.push({ icon: 'assignment_late', tone: 'text-status-danger',
      html: 'Lowest submission rate: <strong>' + esc(rated[0].name) + '</strong> at ' + pct(rated[0].rate, 1) + ', with ' +
        rated[0].pending + ' of ' + plural(rated[0].scorecards, 'scorecard') + ' not submitted.' });
  }
  var scored = md.lead.filter(function (g) { return isNum(g.avg); }).sort(function (a, b) { return b.avg - a.avg; });
  if (scored.length > 1) {
    out.push({ icon: 'emoji_events', tone: 'text-status-warning',
      html: 'Highest ' + field + ' average: <strong>' + esc(scored[0].name) + '</strong> at ' + num(scored[0].avg) +
        '. Lowest: <strong>' + esc(scored[scored.length - 1].name) + '</strong> at ' + num(scored[scored.length - 1].avg) + '.' });
  }
  var moved = md.lead.filter(function (g) { return isNum(g.change) && g.change !== 0; })
    .sort(function (a, b) { return Math.abs(b.change) - Math.abs(a.change); })[0];
  if (md.comparable && moved) {
    out.push({ icon: moved.change > 0 ? 'trending_up' : 'trending_down', tone: moved.change > 0 ? 'text-status-success' : 'text-status-danger',
      html: 'Biggest change from ' + esc(md.prevName) + ': <strong>' + esc(moved.name) + '</strong>, ' + rptChangeText(moved.change) + '.' });
  }
  var k = md.kpis[0];
  if (k) {
    out.push({ icon: 'flag', tone: 'text-status-danger',
      html: '<strong>' + esc(k.name) + '</strong> (' + esc(k.position) + ') landed at tier 0.4 or 0.2 on ' + k.low + ' of ' + plural(k.scored, 'scorecard') + '.' });
  }
  return out.slice(0, 5);
}

function rptDeptGroups(cards) {
  var map = {};
  var order = [];
  cards.forEach(function (r) {
    var key = String(r.Division || '-') + '|' + String(r.Department || '-');
    if (!map[key]) {
      map[key] = [];
      order.push(key);
    }
    map[key].push(r);
  });
  return order.map(function (key) {
    var g = rptEvalGroup(map[key][0].Department || '-', map[key]);
    g.division = map[key][0].Division || '-';
    g.Full_Name = g.name + ' ' + g.division;
    return g;
  });
}

function rptEvalGroup(name, list) {
  var done = list.filter(function (r) { return r.complete && isNum(r.score); });
  var avg = function (key) { return rptMean(list.map(function (r) { return r[key]; }), 2); };
  return {
    name: name,
    people: list.length,
    avgKpi: avg('avgKpi'),
    kbi: avg('kbi'),
    s360: avg('s360'),
    discipline: avg('discipline'),
    score: rptMean(done.map(function (r) { return r.score; }), 2),
    dist: rptGrades(done),
    pending: list.length - done.length
  };
}

function rptGrades(list) {
  var dist = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  list.forEach(function (r) { if (dist[r.grade] !== undefined) dist[r.grade]++; });
  return dist;
}

function rptSpKey(r) {
  return -Math.max(0, SP_OPTIONS.indexOf(r.spLevel || ''));
}

function rptKpiKey(r) {
  return isNum(r.avgKpi) ? r.avgKpi : -1;
}

function rptEvalKeys() {
  return [function (r) { return r.score; }, rptKpiKey, rptSpKey, function (r) { return r.kpiMonths || 0; }];
}

function rptKpiFirstKeys() {
  return [rptKpiKey, function (r) { return isNum(r.score) ? r.score : -1; }];
}

function rptAnnualModel(ev, recap, opts) {
  var trial = ev.trialMonths || [];
  var rows = (ev.rows || []).filter(function (r) { return !opts.division || r.Division === opts.division; });
  var monthsOf = {};
  ((recap && recap.rows) || []).forEach(function (r) { monthsOf[r.NIK + '|' + r.roleKey] = r.months; });
  var upto = 0;
  rows.forEach(function (r) {
    r.months = monthsOf[r.NIK + '|' + r.roleKey] || null;
    (r.months || []).forEach(function (v, i) { if (isNum(v) && i + 1 > upto) upto = i + 1; });
  });
  upto = upto || 12;

  var people = rptPickPeople(rows, function (r) { return r.kpiMonths || 0; });
  var scored = people.filter(function (r) { return r.complete && isNum(r.score); });
  var ranked = rptRank(scored, rptEvalKeys());
  var rankOf = {};
  ranked.forEach(function (x) { rankOf[x.row.Eval_ID] = x.rank; });

  var cards = rows.filter(function (r) { return !r.roleInactive; });
  var groups = rptGroupBy(cards, 'Division').map(function (g) {
    var lead = rptEvalGroup(g.name, g.rows);
    lead.depts = rptGroupBy(g.rows, 'Department').map(function (dg) { return rptEvalGroup(dg.name, dg.rows); });
    return lead;
  });

  var md = {
    kind: 'annual',
    year: opts.year,
    rules: ev.rules,
    released: !!(ev.rules && ev.rules.released),
    trialMonths: trial,
    theme: rptTheme(opts.year),
    scopeLabel: opts.division || 'All divisions',
    rows: rows,
    people: people,
    ranked: ranked,
    rankOf: rankOf,
    dist: rptGrades(scored),
    complete: rows.filter(function (r) { return r.complete; }).length,
    total: rptEvalGroup('Overall', people),
    cardTotal: rptEvalGroup('Overall', cards),
    groups: groups,
    lead: groups.length === 1 ? groups[0].depts : groups,
    leadField: groups.length === 1 ? 'Department' : 'Division',
    top: rptTop(ranked, 10, 15),
    depts: rptTop(rptRank(rptDeptGroups(cards).filter(function (d) { return isNum(d.avgKpi); }), rptKpiFirstKeys()), 5, 8),
    discipline: rptTop(rptRank(people.filter(function (r) { return isNum(r.discipline); }),
      [function (r) { return r.discipline; }, rptSpKey]), 5, 8),
    watch: scored.filter(function (r) { return r.grade === 'D' || r.grade === 'E'; })
      .sort(function (a, b) { return a.score - b.score || String(a.Full_Name).localeCompare(String(b.Full_Name)); }),
    missing: rptSorted(rows.filter(function (r) { return !r.complete && !r.roleInactive; })),
    trend: rptTrend(rows, upto, trial),
    heat: rptHeat(rows, distinct(rows, 'Division').length > 1 ? 'Division' : 'Department', upto, trial),
    heatField: distinct(rows, 'Division').length > 1 ? 'Division' : 'Department'
  };
  md.findings = rptAnnualFindings(md);
  return md;
}

function rptAnnualFindings(md) {
  var out = [];
  var n = md.ranked.length;
  var field = md.leadField.toLowerCase();
  var scored = md.lead.filter(function (g) { return isNum(g.score); }).sort(function (a, b) { return b.score - a.score; });
  if (scored.length > 1) {
    var low = scored[scored.length - 1];
    out.push({ icon: 'emoji_events', tone: 'text-status-warning',
      html: 'Highest ' + field + ' average: <strong>' + esc(scored[0].name) + '</strong> at ' + scoreText(scored[0].score) +
        '. Lowest: <strong>' + esc(low.name) + '</strong> at ' + scoreText(low.score) + '.' });
  }
  if (n) {
    var ab = md.dist.A + md.dist.B;
    out.push({ icon: 'workspace_premium', tone: 'text-status-success',
      html: '<strong>' + ab + ' of ' + plural(n, 'person', 'people') + '</strong> (' + pct(rptShare(ab, n), 1) + ') reach Grade A or B.' });
    var de = md.dist.D + md.dist.E;
    out.push(de
      ? { icon: 'support', tone: 'text-status-danger',
          html: '<strong>' + plural(de, 'person', 'people') + '</strong> ' + (de === 1 ? 'has' : 'have') + ' Grade D or E and ' +
            (de === 1 ? 'is' : 'are') + ' listed in the Development Watchlist.' }
      : { icon: 'verified', tone: 'text-status-success', html: 'No one has Grade D or E.' });
  }
  var pending = md.rows.length - md.complete;
  out.push(pending
    ? { icon: 'pending_actions', tone: 'text-status-warning',
        html: '<strong>' + plural(pending, 'scorecard') + '</strong> still ' + (pending === 1 ? 'misses' : 'miss') + ' inputs. Their grade appears once every input is filled.' }
    : { icon: 'task_alt', tone: 'text-status-success', html: 'Every scorecard has all inputs.' });
  if (isNum(md.total.avgKpi)) {
    var b = band(md.total.avgKpi);
    out.push({ icon: 'insights', tone: 'text-status-' + b.key,
      html: 'Average KPI Score is <strong>' + md.total.avgKpi.toFixed(2) + '%</strong>, rated ' + esc(b.label) + '.' });
  }
  return out.slice(0, 5);
}
