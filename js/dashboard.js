'use strict';

var DASH_COLORS = {
  maroon: '#8f2925', success: '#1e6b43', info: '#1f5c99', danger: '#b42318', notFilled: '#e2958c',
  warning: '#b07a1e', progress: '#e0b45f', muted: '#878787', slate: '#e2e2e0', grid: '#efefee', surface: '#FFFFFF', ink: '#5c5c5a'
};

function initDashboard() {
  if ($('dash-greeting')) $('dash-greeting').textContent = dayGreeting() + ', ' + displayName(S.user.Full_Name);
  var yearSel = $('dash-year');
  if (!yearSel.dataset.wired) {
    yearSel.dataset.wired = '1';
    fillDashYears([S.user.year]);
    yearSel.addEventListener('change', onDashYearChange);
    $('dash-division').addEventListener('change', onDashDivisionChange);
    $('dash-department').addEventListener('change', onDashDepartmentChange);
  }
  var year = S.dashYear || S.user.year;
  var cached = !!(S.dash && S.dash.year === year);
  if (cached) renderDashboard();
  loadDashboard(year, cached);
}

function fillDashYears(years) {
  var sel = $('dash-year');
  var set = {};
  [S.user.year, S.dashYear].concat(years || []).forEach(function (y) {
    var n = parseInt(y, 10);
    if (n) set[n] = true;
  });
  sel.innerHTML = Object.keys(set)
    .map(function (y) { return parseInt(y, 10); })
    .sort(function (a, b) { return b - a; })
    .map(function (y) {
      return '<option value="' + y + '">' + y + (y === S.user.year ? ' (Active)' : '') + '</option>';
    }).join('');
  sel.value = String(S.dashYear || S.user.year);
}

function loadDashboard(year, quiet) {
  S.dashYear = year;
  fillDashYears(S.dash ? S.dash.years : []);
  if (!quiet) {
    $('dash-stats').innerHTML = [0, 1, 2, 3].map(function () {
      return '<div class="skeleton h-40 w-full rounded-xl"></div>';
    }).join('');
  }
  $('dash-updated').textContent = 'Loading FY' + year + ' data';

  api('getDashboardData', year)
    .then(function (data) {
      if (data.year !== S.dashYear) return;
      S.dash = data;
      syncBands(data.bands);
      renderScopeBanner('dash-scope', data.scope);
      renderThemeSlot('dash-theme', data.year, data.theme);
      fillDashYears(data.years);
      fillDashDivisions();
      renderDashboard();
    })
    .catch(function (err) {
      $('dash-updated').textContent = '';
      toast(err.message, 'error');
    });
}

function onDashYearChange() {
  var year = parseInt($('dash-year').value, 10);
  if (!year || year === S.dashYear) return;
  loadDashboard(year);
}

function refreshDashboard() {
  loadDashboard(S.dashYear || S.user.year, true);
}

function fillDashDivisions() {
  var sel = $('dash-division');
  var keep = sel.value;
  var list = (S.dash && S.dash.divisions) || [];
  sel.innerHTML = '<option value="">All Divisions</option>' + list.map(function (d) {
    return '<option value="' + esc(d.name) + '">' + esc(d.name) + '</option>';
  }).join('');
  sel.value = list.some(function (d) { return d.name === keep; }) ? keep : '';
  fillDashDepartments();
}

function fillDashDepartments() {
  var sel = $('dash-department');
  var keep = sel.value;
  var division = $('dash-division').value;
  var list = (S.dash && S.dash.divisions) || [];
  var seen = {};
  list.forEach(function (d) {
    d.departments.forEach(function (dep) { seen[dep] = (seen[dep] || 0) + 1; });
  });
  var options = [];
  list.forEach(function (d) {
    if (division && d.name !== division) return;
    d.departments.forEach(function (dep) {
      options.push({ value: d.name + '||' + dep, label: dep + (!division && seen[dep] > 1 ? ' (' + d.name + ')' : '') });
    });
  });
  options.sort(function (a, b) { return a.label.localeCompare(b.label); });
  sel.innerHTML = '<option value="">All Departments</option>' + options.map(function (o) {
    return '<option value="' + esc(o.value) + '">' + esc(o.label) + '</option>';
  }).join('');
  sel.value = options.some(function (o) { return o.value === keep; }) ? keep : '';
}

function onDashDivisionChange() {
  fillDashDepartments();
  renderDashboard();
}

function onDashDepartmentChange() {
  var value = $('dash-department').value;
  var division = value ? value.split('||')[0] : '';
  if (division && $('dash-division').value !== division) {
    $('dash-division').value = division;
    fillDashDepartments();
    $('dash-department').value = value;
  }
  renderDashboard();
}

function resetDashFilters() {
  $('dash-division').value = '';
  $('dash-department').value = '';
  fillDashDepartments();
  renderDashboard();
}

function dashFilter() {
  var dep = $('dash-department').value;
  var parts = dep ? dep.split('||') : [];
  return {
    division:   parts.length ? parts[0] : $('dash-division').value,
    department: parts.length ? parts[1] : ''
  };
}

function dashSlice() {
  if (!S.dash || !S.dash.slices) return null;
  var f = dashFilter();
  var key = f.department ? 'dep:' + f.division + '|' + f.department : f.division ? 'div:' + f.division : 'all';
  return S.dash.slices[key] || S.dash.slices.all;
}

function dashScopeLabel() {
  var f = dashFilter();
  return f.department ? f.department + ' (' + f.division + ')' : f.division || 'All divisions';
}

function dashMonth(m, full) {
  return full ? MONTHS[m - 1] : MONTHS[m - 1].substring(0, 3);
}

function dashPts(v) {
  return (v > 0 ? '+' : '') + Number(v).toFixed(2) + ' pts';
}

function dashStamp(iso) {
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  return fmtDate(iso) + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function tzLabel(d) {
  var off = -d.getTimezoneOffset();
  var abs = Math.abs(off);
  var mins = abs % 60;
  var local = { 420: 'WIB', 480: 'WITA', 540: 'WIT' }[off];
  if (local) return local;
  return 'GMT' + (off < 0 ? '-' : '+') + Math.floor(abs / 60) + (mins ? ':' + (mins < 10 ? '0' : '') + mins : '');
}

function fmtStamp(d) {
  var at = d || new Date();
  return dashStamp(at.toISOString()) + ' ' + tzLabel(at);
}

function fileStamp(d) {
  var at = d || new Date();
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  return at.getFullYear() + pad(at.getMonth() + 1) + pad(at.getDate()) + '-' + pad(at.getHours()) + pad(at.getMinutes());
}

function dashLegend(items) {
  return items.map(function (it) {
    return '<span class="inline-flex items-center gap-1.5"><span class="inline-block w-3.5 ' + it[0] + '"></span>' + esc(it[1]) + '</span>';
  }).join('');
}

function dashOptions(extra) {
  var base = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeOutQuart' },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(38,38,38,0.96)',
        titleColor: '#FFFFFF',
        bodyColor: '#e2e2e0',
        footerColor: '#b5b5b3',
        borderColor: 'rgba(181,181,179,0.25)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 6,
        caretSize: 6,
        boxPadding: 6,
        usePointStyle: true,
        titleMarginBottom: 6,
        footerMarginTop: 8,
        titleFont: { size: 12, weight: '600' },
        bodyFont: { size: 12 },
        footerFont: { size: 11, weight: '400' }
      }
    }
  };
  Object.keys(extra || {}).forEach(function (k) {
    if (k !== 'plugins') {
      base[k] = extra[k];
      return;
    }
    Object.keys(extra.plugins).forEach(function (p) {
      base.plugins[p] = Object.assign({}, base.plugins[p] || {}, extra.plugins[p]);
    });
  });
  return base;
}

function dashChart(key, cfg) {
  if (S.charts[key]) {
    S.charts[key].destroy();
    delete S.charts[key];
  }
  var box = $(key + '-box');
  if (!window.Chart) {
    if (box) {
      box.innerHTML = '<div class="h-full flex flex-col items-center justify-center gap-1 text-center text-text-muted">' +
        '<span class="material-symbols-outlined text-[32px]">monitoring</span>' +
        '<p class="text-body-sm">Charts could not load. Refresh the page.</p></div>';
    }
    return null;
  }
  if (!$(key + '-chart') && box) box.innerHTML = '<canvas id="' + key + '-chart"></canvas>';
  ensureChartTheme();
  S.charts[key] = new window.Chart($(key + '-chart'), cfg);
  return S.charts[key];
}

function ensureChartTheme() {
  if (S.chartTheme || !window.Chart || !window.Chart.defaults || !window.getComputedStyle) return;
  S.chartTheme = true;
  var defaults = window.Chart.defaults;
  defaults.font.family = window.getComputedStyle(document.body).fontFamily;
  defaults.font.size = 12;
  defaults.color = '#6b6b68';
  defaults.borderColor = DASH_COLORS.grid;
  if (defaults.scale) {
    if (defaults.scale.grid) defaults.scale.grid.color = DASH_COLORS.grid;
    if (defaults.scale.border) defaults.scale.border.display = false;
    if (defaults.scale.ticks) {
      defaults.scale.ticks.color = '#6b6b68';
      defaults.scale.ticks.padding = 8;
    }
  }
  if (defaults.elements && defaults.elements.bar) defaults.elements.bar.borderRadius = 4;
  if (defaults.elements && defaults.elements.line) defaults.elements.line.borderWidth = 2;
}

function dashGradient() {
  return 'rgba(61,81,102,0.08)';
}

function renderDashboard() {
  var slice = dashSlice();
  if (!slice) return;
  var d = S.dash;
  var empty = !slice.scorecards;

  $('dash-updated').textContent = 'FY' + d.year + ' • ' + dashScopeLabel() + ' • Updated ' + dashStamp(d.generatedAt);
  renderDashStats(slice);
  $('dash-empty').classList.toggle('hidden', !empty);
  $('dash-content').classList.toggle('hidden', empty);

  if (empty) {
    Object.keys(S.charts).forEach(function (k) {
      S.charts[k].destroy();
      delete S.charts[k];
    });
    $('dash-empty').innerHTML =
      '<span class="material-symbols-outlined text-[40px] text-text-muted">monitoring</span>' +
      '<p class="text-body-md text-text-secondary mt-2">No KPI mappings found for ' + esc(dashScopeLabel()) + ' in ' + d.year + '.</p>' +
      '<p class="text-body-sm text-text-muted">Choose another year or reset the filters.</p>';
    return;
  }

  renderDashTrend(slice);
  renderDashBreakdown(slice);
  renderDashCompletion(slice);
  renderDashInsights(slice);
  renderDashHeatmap(slice);
}

function renderDashStats(s) {
  var c = s.completion;
  var latest = s.latest && isNum(s.latest.avg) ? s.latest : null;
  var ytdBand = isNum(s.ytdAvg) ? band(s.ytdAvg) : null;
  var rateBar = !isNum(c.rate) ? 'bg-status-info' : c.rate >= 80 ? 'bg-status-success' : c.rate >= 50 ? 'bg-status-warning' : 'bg-status-danger';

  $('dash-stats').innerHTML =
    statCard('YTD Company Average', 'insights', ytdBand ? 'text-status-' + ytdBand.key + '-text' : 'text-text-muted',
      ytdBand ? s.ytdAvg.toFixed(2) : '-', '%',
      ytdBand ? 'Rating: ' + esc(ytdBand.label) + ' • Feb to Dec, ' + s.scoredScorecards + ' scored scorecards'
              : 'No counted months scored yet',
      ytdBand ? 'bg-status-' + ytdBand.key : 'bg-surface-container', s.ytdAvg || 0) +

    statCard('Scorecards Monitored', 'badge', 'text-text-primary',
      s.scorecards, 'Scorecards',
      s.employees + ' employees • ' + s.activeKpis + ' active KPIs',
      '', 0) +

    statCard('Completion Rate', 'task_alt', 'text-text-primary',
      isNum(c.rate) ? c.rate.toFixed(1) : '-', '%',
      !isNum(c.rate) ? 'No completed months yet (January is a trial month)'
                      : c.completed + ' of ' + c.expected + ' submitted, Feb to ' + dashMonth(c.throughMonth),
      rateBar, c.rate || 0) +

    statCard('Latest Month', 'calendar_month', 'text-text-primary',
      latest ? latest.avg.toFixed(2) : '-', latest ? '% in ' + dashMonth(latest.month, true) : '',
      latest ? 'Gap to YTD ' + (isNum(latest.gap) ? dashPts(latest.gap) : '-') + ' • ' + latest.completed + ' of ' + latest.total + ' submitted'
             : 'No completed month with scores yet',
      'bg-status-info', latest && latest.total ? latest.completed / latest.total * 100 : 0);
}

function chartFont(weight, size) {
  var family = window.Chart && window.Chart.defaults && window.Chart.defaults.font ? window.Chart.defaults.font.family : 'sans-serif';
  return weight + ' ' + size + 'px ' + family;
}

function haloText(ctx, text, x, y) {
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#FFFFFF';
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
}

function trendPointColor(m, ytd) {
  if (m.trial || !isNum(m.avg)) return DASH_COLORS.muted;
  if (!isNum(ytd)) return DASH_COLORS.ink;
  return m.avg >= ytd ? DASH_COLORS.success : DASH_COLORS.danger;
}

var TREND_LABEL_ROOM = 78;

function trendMarksPlugin(s) {
  var b = bandValues();
  var marks = [];
  if (s.best && isNum(s.best.avg)) {
    marks.push({ month: s.best.month, text: 'Best ' + s.best.avg.toFixed(2) + '%', color: DASH_COLORS.success, above: true });
  }
  if (s.lowest && isNum(s.lowest.avg) && (!s.best || s.lowest.month !== s.best.month)) {
    marks.push({ month: s.lowest.month, text: 'Low ' + s.lowest.avg.toFixed(2) + '%', color: DASH_COLORS.danger, above: false });
  }
  return {
    id: 'mgiTrendMarks',
    beforeDatasetsDraw: function (chart) {
      var y = chart.scales ? chart.scales.y : null;
      var area = chart.chartArea;
      if (!y || !area || !chart.ctx) return;
      var ctx = chart.ctx;
      ctx.save();
      var lines = [[b.excellent, 'Excellent ' + bandNum(b.excellent), DASH_COLORS.success], [b.good, 'Good ' + bandNum(b.good), DASH_COLORS.info]];
      var spots = lines.map(function (t) { return y.getPixelForValue(t[0]); });
      if (Math.abs(spots[0] - spots[1]) < 12) {
        var mid = (spots[0] + spots[1]) / 2;
        spots = [mid - 6, mid + 6];
      }
      lines.forEach(function (t, n) {
        var py = y.getPixelForValue(t[0]);
        if (!(py >= area.top && py <= area.bottom)) return;
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = t[2];
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(area.left, py);
        ctx.lineTo(area.right, py);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.fillStyle = t[2];
        ctx.font = chartFont(600, 10);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(t[1], area.right + 6, spots[n]);
      });
      ctx.restore();
    },
    afterDatasetsDraw: function (chart) {
      var meta = chart.getDatasetMeta ? chart.getDatasetMeta(0) : null;
      var area = chart.chartArea;
      if (!meta || !meta.data || !area || !chart.ctx) return;
      var ctx = chart.ctx;
      ctx.save();
      ctx.font = chartFont(700, 11);
      ctx.textAlign = 'center';
      marks.forEach(function (mk) {
        var pt = meta.data[mk.month - 1];
        if (!pt) return;
        var half = ctx.measureText(mk.text).width / 2;
        var above = mk.above ? pt.y - 22 >= 0 : pt.y + 22 > area.bottom;
        ctx.fillStyle = mk.color;
        ctx.textBaseline = above ? 'bottom' : 'top';
        haloText(ctx, mk.text, Math.max(area.left + half, Math.min(pt.x, area.right - half)), above ? pt.y - 9 : pt.y + 9);
      });
      ctx.restore();
    }
  };
}

function barEndLabelsPlugin(texts) {
  return {
    id: 'mgiBarEndLabels',
    afterDatasetsDraw: function (chart) {
      var meta = chart.getDatasetMeta ? chart.getDatasetMeta(0) : null;
      var area = chart.chartArea;
      if (!meta || !meta.data || !area || !chart.ctx) return;
      var ctx = chart.ctx;
      ctx.save();
      ctx.font = chartFont(700, 11);
      ctx.textBaseline = 'middle';
      meta.data.forEach(function (bar, i) {
        var text = texts[i];
        if (!text) return;
        var width = ctx.measureText(text).width;
        var inside = bar.x + 6 + width > area.right;
        ctx.textAlign = inside ? 'right' : 'left';
        ctx.fillStyle = inside ? '#FFFFFF' : DASH_COLORS.ink;
        ctx.fillText(text, inside ? bar.x - 6 : bar.x + 6, bar.y);
      });
      ctx.restore();
    }
  };
}

function stackTopLabelsPlugin(labels, totals) {
  return {
    id: 'mgiStackTopLabels',
    afterDatasetsDraw: function (chart) {
      var y = chart.scales ? chart.scales.y : null;
      var meta = chart.getDatasetMeta ? chart.getDatasetMeta(0) : null;
      if (!y || !meta || !meta.data || !chart.ctx) return;
      var ctx = chart.ctx;
      ctx.save();
      ctx.font = chartFont(700, 10);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = DASH_COLORS.ink;
      meta.data.forEach(function (bar, i) {
        if (!labels[i] || !totals[i]) return;
        ctx.fillText(labels[i], bar.x, y.getPixelForValue(totals[i]) - 4);
      });
      ctx.restore();
    }
  };
}

function renderDashTrend(s) {
  var ytd = isNum(s.ytdAvg) ? s.ytdAvg : null;
  $('dash-trend-legend').innerHTML = dashLegend([
    ['h-3.5 rounded-full bg-status-success', 'At or above YTD average'],
    ['h-3.5 rounded-full bg-status-danger', 'Below YTD average'],
    ['border-t-2 border-dashed border-text-muted', 'YTD Average (Feb to Dec)'],
    ['border-t-2 border-dotted border-status-info', 'Rating thresholds'],
    ['h-3.5 rounded-full bg-text-muted', 'Trial month']
  ]);

  dashChart('dash-trend', {
    type: 'line',
    data: {
      labels: s.months.map(function (m) { return dashMonth(m.month) + (m.trial ? ' (Trial)' : ''); }),
      datasets: [
        {
          label: 'Average KPI',
          data: s.months.map(function (m) { return m.state === 'upcoming' || !isNum(m.avg) ? null : m.avg; }),
          borderColor: DASH_COLORS.ink,
          backgroundColor: dashGradient,
          fill: true,
          clip: false,
          tension: 0.35,
          spanGaps: false,
          borderWidth: 2,
          pointRadius: s.months.map(function (m) { return isNum(m.avg) ? 4.5 : 0; }),
          pointHoverRadius: 6.5,
          pointBorderWidth: 2,
          pointHoverBorderWidth: 2,
          pointHoverBackgroundColor: '#FFFFFF',
          pointHitRadius: 12,
          pointBackgroundColor: s.months.map(function (m) { return m.state === 'current' ? '#FFFFFF' : trendPointColor(m, ytd); }),
          pointBorderColor: s.months.map(function (m) { return trendPointColor(m, ytd); })
        },
        {
          label: 'YTD Average (Feb to Dec)',
          data: s.months.map(function () { return ytd; }),
          borderColor: DASH_COLORS.muted,
          borderDash: [4, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
          clip: false
        }
      ]
    },
    options: dashOptions({
      layout: { padding: { top: 24, right: TREND_LABEL_ROOM } },
      scales: {
        y: { min: 0, max: 100, ticks: { stepSize: 25, callback: function (v) { return v + '%'; } }, grid: { color: DASH_COLORS.grid } },
        x: { grid: { display: false } }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (ctx) {
              return !isNum(ctx.parsed.y) ? '' : ' ' + ctx.dataset.label + ': ' + ctx.parsed.y.toFixed(2) + '%';
            },
            footer: function (list) {
              var m = s.months[list[0].dataIndex];
              var lines = [];
              if (m.trial) lines.push('Trial month, excluded from YTD');
              else if (isNum(m.gap)) lines.push('Gap to YTD: ' + dashPts(m.gap));
              if (m.state !== 'upcoming') lines.push(m.completed + ' of ' + m.total + ' scorecards submitted');
              return lines;
            }
          }
        }
      }
    }),
    plugins: [trendMarksPlugin(s)]
  });
}

function renderDashBreakdown(s) {
  var field = s.breakdown.field;
  var items = s.breakdown.items;
  $('dash-breakdown-title').textContent = 'Average KPI by ' + field;
  $('dash-breakdown-note').textContent = items.length + ' ' + field.toLowerCase() + (items.length === 1 ? '' : 's') + ' • YTD average, Feb to Dec';
  var box = $('dash-breakdown-box');
  if (box && box.style) box.style.height = Math.max(320, items.length * 42 + 48) + 'px';
  $('dash-breakdown-legend').innerHTML = dashLegend([
    ['h-3 rounded-sm bg-status-success', bandRange('success')],
    ['h-3 rounded-sm bg-status-info', bandRange('info')],
    ['h-3 rounded-sm bg-status-danger', bandRange('danger')],
    ['h-3 rounded-sm bg-slate-200', 'No scores yet']
  ]);

  dashChart('dash-breakdown', {
    type: 'bar',
    data: {
      labels: items.map(function (it) { return it.name; }),
      datasets: [{
        label: 'YTD Average',
        data: items.map(function (it) { return isNum(it.ytdAvg) ? it.ytdAvg : 0; }),
        backgroundColor: items.map(function (it) { return isNum(it.ytdAvg) ? DASH_COLORS[band(it.ytdAvg).key] : DASH_COLORS.slate; }),
        borderRadius: 6,
        borderSkipped: 'start',
        maxBarThickness: 22
      }]
    },
    options: dashOptions({
      indexAxis: 'y',
      layout: { padding: { right: 8 } },
      interaction: { mode: 'nearest', axis: 'y', intersect: false },
      scales: {
        x: { min: 0, max: 100, ticks: { stepSize: 25, callback: function (v) { return v + '%'; } }, grid: { color: DASH_COLORS.grid } },
        y: { grid: { display: false } }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (ctx) {
              var it = items[ctx.dataIndex];
              return !isNum(it.ytdAvg) ? ' No scores yet' : ' YTD Average: ' + it.ytdAvg.toFixed(2) + '% (' + band(it.ytdAvg).label + ')';
            },
            footer: function (list) {
              var it = items[list[0].dataIndex];
              return [it.scorecards + ' scorecards', 'Completion: ' + (isNum(it.completionRate) ? it.completionRate.toFixed(1) + '%' : '-')];
            }
          }
        }
      }
    }),
    plugins: [barEndLabelsPlugin(items.map(function (it) { return isNum(it.ytdAvg) ? it.ytdAvg.toFixed(2) + '%' : 'No scores yet'; }))]
  });
}

function renderDashCompletion(s) {
  $('dash-completion-legend').innerHTML = dashLegend([
    ['h-3 rounded-sm bg-status-success', 'Submitted'],
    ['h-3 rounded-sm bg-red-400', 'Not Filled'],
    ['h-3 rounded-sm bg-amber-400', 'In Progress'],
    ['h-3 rounded-sm bg-slate-200', 'Upcoming']
  ]);

  var stackTop = function (ctx) {
    var sets = ctx.chart.data.datasets;
    for (var i = sets.length - 1; i > ctx.datasetIndex; i--) {
      if (ctx.chart.isDatasetVisible(i) && sets[i].data[ctx.dataIndex] > 0) return 0;
    }
    return { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 };
  };

  var set = function (label, color, pick) {
    return {
      label: label, data: s.months.map(pick), backgroundColor: color, stack: 'status',
      borderRadius: stackTop, borderSkipped: 'start',
      borderColor: DASH_COLORS.surface, borderWidth: { top: 2, right: 0, bottom: 0, left: 0 },
      maxBarThickness: 28
    };
  };

  dashChart('dash-completion', {
    type: 'bar',
    data: {
      labels: s.months.map(function (m) { return dashMonth(m.month) + (m.trial ? ' (Trial)' : ''); }),
      datasets: [
        set('Submitted', DASH_COLORS.success, function (m) { return m.state === 'upcoming' ? 0 : m.completed; }),
        set('Not Filled', DASH_COLORS.notFilled, function (m) { return m.state === 'due' ? m.blank : 0; }),
        set('In Progress', DASH_COLORS.progress, function (m) { return m.state === 'current' ? m.blank : 0; }),
        set('Upcoming', DASH_COLORS.slate, function (m) { return m.state === 'upcoming' ? m.total : 0; })
      ]
    },
    options: dashOptions({
      layout: { padding: { top: 16 } },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, grid: { color: DASH_COLORS.grid } }
      },
      plugins: {
        tooltip: {
          filter: function (item) { return item.parsed.y > 0; },
          callbacks: {
            label: function (ctx) {
              var m = s.months[ctx.dataIndex];
              return ' ' + ctx.dataset.label + ': ' + ctx.parsed.y + ' (' + (m.total ? (ctx.parsed.y / m.total * 100).toFixed(1) : '0.0') + '%)';
            },
            footer: function (list) {
              return s.months[list[0].dataIndex].total + ' scorecards';
            }
          }
        }
      }
    }),
    plugins: [stackTopLabelsPlugin(
      s.months.map(function (m) { return m.state === 'upcoming' || !isNum(m.rate) ? '' : Math.round(m.rate) + '%'; }),
      s.months.map(function (m) { return m.total; })
    )]
  });
}

function renderDashInsights(s) {
  var items = [];
  var field = s.breakdown.field.toLowerCase();
  var ranked = s.breakdown.items.filter(function (it) { return isNum(it.ytdAvg); });
  var year = S.dash ? S.dash.year : S.user.year;
  var f = dashFilter();
  S.dashJumps = [];
  var jump = function (month, label) {
    S.dashJumps.push({ year: year, month: month, filter: 'pending', division: f.division, department: f.department });
    return { label: label, js: 'MGI.openDashJump(' + (S.dashJumps.length - 1) + ')' };
  };

  var cur = (s.months || []).filter(function (m) { return m.state === 'current' && m.total; })[0];
  if (cur) {
    var left = cur.total - (cur.completed || 0);
    items.push({
      icon: left ? 'pending_actions' : 'task_alt',
      tone: left ? 'text-status-warning' : 'text-status-success',
      html: left
        ? '<strong>' + dashMonth(cur.month, true) + ' so far:</strong> ' + (cur.completed || 0) + ' of ' + cur.total +
          ' scorecards submitted, ' + left + ' still to come.'
        : '<strong>' + dashMonth(cur.month, true) + ':</strong> all ' + cur.total + ' scorecards are in.',
      action: left ? jump(cur.month, 'See who has not submitted') : null
    });
  }

  if (s.latest && isNum(s.latest.avg)) {
    var lm = s.months[s.latest.month - 1];
    var prev = s.months.filter(function (m) { return m.state === 'due' && !m.trial && m.month < s.latest.month; }).pop();
    var delta = prev && isNum(prev.rate) && isNum(lm.rate) ? lm.rate - prev.rate : null;
    var missed = s.latest.total - s.latest.completed;
    items.push({
      icon: 'fact_check', tone: 'text-status-info',
      html: 'Latest month <strong>' + dashMonth(s.latest.month, true) + '</strong>: ' + s.latest.completed + ' of ' + s.latest.total +
        ' scorecards submitted (' + (isNum(lm.rate) ? lm.rate.toFixed(1) + '%' : '-') + ')' +
        (!isNum(delta) ? '.' : ', ' + (delta >= 0 ? 'up ' : 'down ') + Math.abs(delta).toFixed(1) + ' pts from ' + dashMonth(prev.month, true) + '.'),
      action: missed > 0 ? jump(s.latest.month, 'See who missed ' + dashMonth(s.latest.month, true)) : null
    });
  }

  if (s.best && s.lowest && isNum(s.best.avg) && isNum(s.lowest.avg)) {
    items.push({
      icon: 'trending_up', tone: 'text-status-success',
      html: 'Best month: <strong>' + dashMonth(s.best.month, true) + '</strong> at ' + s.best.avg.toFixed(2) + '%' +
        (isNum(s.best.gap) ? ' (' + dashPts(s.best.gap) + ' vs YTD)' : '') +
        '. Lowest: <strong>' + dashMonth(s.lowest.month, true) + '</strong> at ' + s.lowest.avg.toFixed(2) + '%.'
    });
  }

  if (ranked.length) {
    var top = ranked[0];
    var low = ranked[ranked.length - 1];
    items.push({
      icon: 'emoji_events', tone: 'text-status-warning',
      html: 'Top ' + field + ': <strong>' + esc(top.name) + '</strong> at ' + top.ytdAvg.toFixed(2) + '%' +
        (ranked.length > 1 ? '. Needs the most support: <strong>' + esc(low.name) + '</strong> at ' + low.ytdAvg.toFixed(2) + '%.' : '.')
    });
  }

  var unscored = (s.scorecards || 0) - (s.scoredScorecards || 0);
  items.push(unscored
    ? { icon: 'person_alert', tone: 'text-status-danger', html: '<strong>' + unscored + '</strong> of ' + s.scorecards + ' scorecards have no counted month scored yet.' }
    : { icon: 'verified', tone: 'text-status-success', html: 'Every scorecard has at least one counted month scored.' });

  $('dash-insights').innerHTML = items.map(function (it) {
    return '<li class="flex items-start gap-space-sm p-3 rounded-lg bg-slate-50/60 border border-slate-200/80 transition-all duration-150 hover:bg-slate-50">' +
      '<span class="material-symbols-outlined text-[20px] shrink-0 ' + it.tone + '">' + it.icon + '</span>' +
      '<span class="min-w-0 text-body-sm text-text-secondary leading-relaxed">' + it.html +
        (it.action
          ? '<button type="button" class="mt-1 -ml-1.5 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-label-sm font-semibold text-primary-container transition-all duration-150 hover:bg-brand-50" onclick="' + it.action.js + '">' +
              esc(it.action.label) + '<span class="material-symbols-outlined text-[16px]">arrow_forward</span></button>'
          : '') +
      '</span></li>';
  }).join('');
}

function openDashJump(index) {
  var j = (S.dashJumps || [])[index];
  if (j) openSummaryFor(j.year, j.month, j.filter, j.division, j.department);
}

function dashCell(v, muted) {
  if (!isNum(v)) return '<span class="text-text-muted">-</span>';
  var b = band(v);
  return '<span class="block rounded-md px-1 py-1.5 font-semibold tabular-nums ' +
    (muted ? 'bg-surface-page text-text-muted' : 'bg-status-' + b.key + '-subtle text-status-' + b.key + '-text') + '">' +
    Number(v).toFixed(2) + '%</span>';
}

function dashGroups(s) {
  return s.breakdowns && s.breakdowns.length ? s.breakdowns : [s.breakdown];
}

function dashGroupOf(s) {
  var list = dashGroups(s);
  var picked = list.filter(function (b) { return b.field === S.dashGroup; })[0];
  return picked || list[0];
}

function setDashGroup(field) {
  S.dashGroup = field;
  var slice = dashSlice();
  if (slice && slice.scorecards) renderDashHeatmap(slice);
}

function renderDashHeatmap(s) {
  var list = dashGroups(s);
  var group = dashGroupOf(s);
  var field = group.field;
  $('dash-heatmap-title').textContent = 'Monthly Heatmap by ' + field;
  $('dash-heatmap-group').innerHTML = list.length < 2 ? '' : list.map(function (b) {
    return '<button type="button" class="seg-btn' + (b.field === field ? ' is-active' : '') +
      '" onclick="MGI.setDashGroup(\'' + esc(b.field) + '\')" title="Group the heatmap by ' + esc(b.field) + '">' +
      esc(b.field) + '<span class="seg-count">' + b.items.length + '</span></button>';
  }).join('');

  $('dash-heatmap-legend').innerHTML = ['success', 'info', 'danger'].map(function (key) {
    return '<span class="inline-flex items-center gap-1.5">' +
      '<span class="w-3 h-3 rounded-sm bg-status-' + key + '-subtle border border-status-' + key + '"></span>' +
      bandRange(key) + '</span>';
  }).join('');

  var rateCell = function (rate) {
    if (!isNum(rate)) return '<span class="text-text-muted">-</span>';
    var tone = rate >= 80 ? 'bg-status-success' : rate >= 50 ? 'bg-status-warning' : 'bg-status-danger';
    return '<span class="flex items-center gap-2" title="' + num(rate, 1) + '% of due monthly scorecards submitted">' +
      '<span class="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden"><span class="block h-full rounded-full ' + tone + '" style="width:' +
        Math.max(0, Math.min(100, rate)) + '%"></span></span>' +
      '<span class="w-9 text-right font-semibold tabular-nums text-text-secondary">' + Math.round(rate) + '%</span>' +
    '</span>';
  };

  var monthCells = function (values) {
    return values.map(function (v, i) {
      var m = s.months[i];
      return '<td class="!px-1 !py-2.5 text-center' + (m.trial ? ' recap-trial' : '') + '">' +
        (m.state === 'upcoming' ? '<span class="text-text-muted">-</span>' : dashCell(v, m.trial)) + '</td>';
    }).join('');
  };

  var head = '<tr>' +
    '<th class="w-[200px] !px-4 !py-3">' + esc(field) + '</th>' +
    '<th class="w-[136px] !px-3 !py-3 !tracking-normal" title="Share of due monthly scorecards submitted, trial month excluded">Submitted</th>' +
    '<th class="w-[88px] !px-1 !py-3 text-center !whitespace-normal !tracking-normal leading-tight border-l border-slate-200">YTD Feb to Dec</th>' +
    s.months.map(function (m) {
      return '<th class="!px-1 !py-3 text-center !whitespace-normal !tracking-normal leading-tight' + (m.trial ? ' recap-trial' : '') + '">' +
        dashMonth(m.month) + (m.trial ? '<span class="block text-[9px] font-normal normal-case">Trial</span>' : '') + '</th>';
    }).join('') +
  '</tr>';

  var body = group.items.map(function (it) {
    return '<tr>' +
      '<td class="!px-4 !py-3"><span class="block text-[12px] font-semibold text-text-primary break-words leading-snug">' + esc(it.name) + '</span>' +
        '<span class="text-text-muted">' + it.scorecards + ' scorecards</span></td>' +
      '<td class="!px-3 !py-2.5">' + rateCell(it.completionRate) + '</td>' +
      '<td class="!px-1 !py-2.5 text-center border-l border-slate-200">' + dashCell(it.ytdAvg) + '</td>' +
      monthCells(it.months) +
    '</tr>';
  }).join('');

  var overall = '<tr class="bg-slate-50/60 border-t border-slate-200">' +
    '<td class="!px-4 !py-3 text-[12px] font-bold text-text-primary">Overall</td>' +
    '<td class="!px-3 !py-2.5">' + rateCell(s.completion.rate) + '</td>' +
    '<td class="!px-1 !py-2.5 text-center border-l border-slate-200">' + dashCell(s.ytdAvg) + '</td>' +
    monthCells(s.months.map(function (m) { return m.avg; })) +
  '</tr>';

  $('dash-heatmap').innerHTML =
    '<table class="data-table w-full table-fixed text-[11px] min-w-[1100px]">' +
      '<thead>' + head + '</thead><tbody>' + body + overall + '</tbody>' +
    '</table>';
}
