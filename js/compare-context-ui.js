'use strict';

function cmpGuideLink(section, label) {
  return '<button type="button" class="cmp-guide-link no-print" onclick="MGI.openReviewerGuide(\'' + section + '\')">' +
    '<span class="material-symbols-outlined text-[16px]" aria-hidden="true">help</span>' + esc(label) + '</button>';
}

function cmpEdgePill(edge) {
  var e = CMP_EDGES[edge] || CMP_EDGES.unranked;
  return '<span class="pill ' + e.pill + ' !text-[11px]">' + esc(e.label) + '</span>';
}

function cmpBandZones() {
  var b = bandValues();
  return [
    { key: 'attention', from: 0, to: Number(b.good), label: 'Needs Attention', range: 'below ' + bandNum(b.good) },
    { key: 'good', from: Number(b.good), to: Number(b.excellent), label: 'Good', range: bandNum(b.good) + ' to below ' + bandNum(b.excellent) },
    { key: 'excellent', from: Number(b.excellent), to: 100, label: 'Excellent', range: bandNum(b.excellent) + ' and above' }
  ];
}

function cmpPct(v) {
  return Math.max(0, Math.min(100, Number(v))).toFixed(2) + '%';
}

function cmpStripHtml(peer, marks) {
  var zones = cmpBandZones().map(function (z) {
    return '<span class="cmp-strip-zone cmp-zone-' + z.key + '" style="left:' + cmpPct(z.from) + ';width:' + cmpPct(z.to - z.from) + '"></span>';
  }).join('');
  var shown = marks.map(function (m) { return String(m.nik); });
  var dots = peer.scores.filter(function (s) { return shown.indexOf(String(s.nik)) === -1; }).map(function (s, n) {
    return '<span class="cmp-strip-dot" style="left:' + cmpPct(s.avg) + ';top:' + (40 + (n % 3) * 7) + '%"></span>';
  }).join('');
  var median = peer.median === null ? '' : '<span class="cmp-strip-median" style="left:' + cmpPct(peer.median) + '"></span>';
  var markers = marks.map(function (m) {
    return m.avg === null ? '' : '<span class="cmp-strip-mark cmp-strip-mark-' + m.slot + '" style="left:' + cmpPct(m.avg) + '">' + cmpTag(m.slot) + '</span>';
  }).join('');
  var label = 'Peer scores for ' + peer.roleLabel + ': ' + peer.ranked + ' ranked people, median ' + (peer.median === null ? 'none' : num(peer.median, 2)) +
    marks.map(function (m) { return ', ' + m.slot.toUpperCase() + ' at ' + (m.avg === null ? 'no score' : num(m.avg, 2)); }).join('');
  return '<div class="cmp-strip-wrap">' +
    '<div class="cmp-strip" role="img" aria-label="' + esc(label) + '">' + zones + dots + median + markers + '</div>' +
    '<div class="cmp-strip-axis" aria-hidden="true"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>' +
  '</div>';
}

function cmpPeerLegendHtml(peers, nameA, nameB) {
  var item = function (swatch, label) {
    return '<span class="cmp-legend-item">' + swatch + '<span>' + esc(label) + '</span></span>';
  };
  var medians = peers.filter(function (p) { return p.median !== null; }).map(function (p) { return num(p.median, 2); });
  return '<div class="cmp-legend" aria-hidden="true">' +
    item('<span class="cmp-strip-dot cmp-strip-dot-static"></span>', 'Other people in the same role') +
    item(cmpTag('a'), nameA) + item(cmpTag('b'), nameB) +
    item('<span class="cmp-swatch cmp-swatch-median"></span>', 'Peer median' + (medians.length ? ' (' + medians.join(' / ') + ')' : '')) +
    cmpBandZones().map(function (z) {
      return item('<span class="cmp-zone-swatch cmp-zone-' + z.key + '"></span>', z.label + ': ' + z.range);
    }).join('') +
  '</div>';
}

function cmpPeerHtml(A, B, peers, mode, months) {
  var row = function (slot, side, p) {
    return '<div class="flex flex-wrap items-center gap-x-space-md gap-y-1 py-2">' +
      '<span class="flex items-center gap-2 min-w-[12rem] font-semibold text-text-primary">' + cmpTag(slot) + '<span class="truncate">' + esc(side.name) + '</span></span>' +
      '<span class="text-body-md font-bold tabular-nums text-text-primary">' + (p.rank === null ? 'Not ranked' : 'Rank ' + p.rank + ' of ' + p.ranked) + '</span>' +
      cmpEdgePill(p.edge) +
      '<span class="text-body-sm text-text-secondary tabular-nums">' + (p.avg === null ? 'No score in this period' : 'Average ' + num(p.avg, 2) + ' (' + p.scored + (p.scored === 1 ? ' month)' : ' months)')) + '</span>' +
      (mode === 'diff' ? '<span class="text-label-xs text-text-muted">' + esc(p.roleLabel) + '</span>' : '') +
    '</div>';
  };
  var strips = mode === 'same'
    ? cmpStripHtml(peers[0], [{ slot: 'a', nik: A.sel.nik, avg: peers[0].avg }, { slot: 'b', nik: B.sel.nik, avg: peers[1].avg }])
    : '<p class="text-label-xs font-semibold text-text-secondary mt-2">' + cmpTag('a') + ' ' + esc(peers[0].roleLabel) + '</p>' +
      cmpStripHtml(peers[0], [{ slot: 'a', nik: A.sel.nik, avg: peers[0].avg }]) +
      '<p class="text-label-xs font-semibold text-text-secondary mt-3">' + cmpTag('b') + ' ' + esc(peers[1].roleLabel) + '</p>' +
      cmpStripHtml(peers[1], [{ slot: 'b', nik: B.sel.nik, avg: peers[1].avg }]);
  var unranked = peers.map(function (p, n) {
    if (!p.unranked || (mode === 'same' && n === 1)) return '';
    return p.unranked + (p.unranked === 1 ? ' person' : ' people') + (mode === 'diff' ? ' in ' + p.roleLabel : ' in this role') +
      ' had fewer than ' + p.need + ' scored months and ' + (p.unranked === 1 ? 'is' : 'are') + ' not ranked. ';
  }).join('');
  return '<div id="cmp-peers" class="bg-surface-card rounded-xl shadow-level-1 border border-border-light p-space-lg mb-space-lg scroll-mt-40">' +
    '<div class="flex flex-wrap items-start justify-between gap-space-sm">' +
      '<div class="min-w-0 flex-1"><h3 class="text-title-md text-text-primary">Standing among peers</h3>' +
      '<p class="text-body-sm text-text-muted">' + esc(mode === 'same' ? peers[0].roleLabel + ', ' : '') + esc(cmpPeriodLabel(months)) +
        '. Ranked by each person\'s own average KPI score over the months they submitted.</p></div>' +
      cmpGuideLink('rg-peers', 'How this is ranked') +
    '</div>' +
    '<div class="mt-space-sm divide-y divide-border-light">' + row('a', A, peers[0]) + row('b', B, peers[1]) + '</div>' +
    strips +
    cmpPeerLegendHtml(peers, A.name, B.name) +
    '<p class="mt-space-sm text-label-xs text-text-muted">' + unranked +
      'Equal scores share a rank. Top 20% and Bottom 20% need at least ' + CMP_MIN_PEERS + ' ranked people. Names of other people are not shown.</p>' +
  '</div>';
}

function cmpFlagCounts(flags) {
  return ['high', 'watch', 'info'].map(function (l) {
    var n = flags.filter(function (f) { return f.level === l; }).length;
    return n ? n + ' ' + CMP_FLAG_LEVELS[l].label : '';
  }).filter(Boolean).join(' · ');
}

function cmpFlagsHtml(flags, ctxState) {
  var c = cmpState();
  var verdict = cmpVerdict(flags);
  var open = c.flagsOpen === undefined ? flags.some(function (f) { return f.level !== 'info'; }) || ctxState === 'loading' || ctxState === 'error' : c.flagsOpen;
  c.flagsShown = open;
  var levels = ['high', 'watch', 'info'].map(function (l) {
    var lv = CMP_FLAG_LEVELS[l];
    return '<span class="pill ' + lv.pill + ' !text-[11px]" title="' + esc(lv.text) + '">' + lv.label + '</span>';
  }).join('');
  var items = flags.map(function (f) {
    var lv = CMP_FLAG_LEVELS[f.level];
    return '<li class="cmp-flag">' +
      '<span class="pill ' + lv.pill + ' !text-[11px] shrink-0 mt-0.5" title="' + esc(lv.text) + '">' +
        '<span class="material-symbols-outlined text-[14px]" aria-hidden="true">' + lv.icon + '</span>' + lv.label + '</span>' +
      '<div class="min-w-0 flex-1">' +
        '<p class="text-body-sm text-text-primary">' + f.who.map(cmpTag).join('') + (f.who.length ? ' ' : '') + esc(f.text) + '</p>' +
        '<p class="text-label-xs text-text-muted mt-0.5">Why it matters: ' + esc(f.why) + '</p>' +
      '</div>' +
      (f.target ? '<button type="button" class="btn btn-secondary !py-1 !px-2.5 !text-label-sm shrink-0" onclick="MGI.showCompareFlag(\'' + esc(f.target) + '\')">Show me</button>' : '') +
    '</li>';
  }).join('');
  var pending = ctxState === 'loading'
    ? '<li class="cmp-flag"><span class="skeleton h-5 w-16"></span><span class="text-body-sm text-text-muted">Checking KPI Health, evidence, and earlier years...</span></li>'
    : ctxState === 'error'
      ? '<li class="cmp-flag"><span class="pill pill-neutral !text-[11px]">Info</span><span class="text-body-sm text-text-secondary flex-1">' +
          'KPI Health, evidence, and earlier years could not be checked: ' + esc(cmpState().ctxError || '') + '</span>' +
          '<button type="button" class="btn btn-secondary !py-1 !px-2.5 !text-label-sm" onclick="MGI.retryCompareContext()">Try again</button></li>'
      : '';
  return '<section id="cmp-flags" class="cmp-flags cmp-flags-' + verdict.key + ' mb-space-lg" aria-labelledby="cmp-flags-title">' +
    '<div class="flex flex-wrap items-center gap-space-sm">' +
      '<span class="material-symbols-outlined text-[22px] ' + verdict.tone + '" aria-hidden="true">' + verdict.icon + '</span>' +
      '<h3 id="cmp-flags-title" class="text-title-md text-text-primary">Before you decide</h3>' +
      '<span class="font-semibold ' + verdict.tone + '">' + verdict.label + '</span>' +
      (flags.length ? '<span class="text-label-xs text-text-muted">' + cmpFlagCounts(flags) + '</span>' : '') +
      '<span class="ml-auto flex flex-wrap items-center gap-1.5"><span class="text-label-xs text-text-muted">Severity:</span>' + levels + '</span>' +
      cmpGuideLink('rg-flags', 'What the flags mean') +
      (flags.length || pending
        ? '<button type="button" class="btn-icon" onclick="MGI.toggleCompareFlags()" aria-expanded="' + (open ? 'true' : 'false') + '" aria-controls="cmp-flag-list" title="' + (open ? 'Hide' : 'Show') + ' the list">' +
            '<span class="material-symbols-outlined">' + (open ? 'expand_less' : 'expand_more') + '</span></button>'
        : '') +
    '</div>' +
    (open && (items || pending) ? '<ul id="cmp-flag-list" class="mt-space-sm flex flex-col gap-2">' + items + pending + '</ul>' : '') +
  '</section>';
}

function cmpHistoryCells(entry) {
  var r = cmpHistoryRole(entry);
  if (!r) return { label: '', cells: '<td colspan="5" class="text-text-muted">No scorecard this year</td>' };
  if (r.outOfScope) return { label: r.roleLabel, cells: '<td>' + esc(r.roleLabel) + '</td><td colspan="4" class="text-text-muted">Outside your report access</td>' };
  var ev = r.evaluation;
  var grade = !entry.released ? '<span class="text-text-muted" title="Not released for this year">-</span>'
    : !ev ? '<span class="text-text-muted">-</span>'
    : ev.complete ? scoreText(ev.score) + ' <span class="pill pill-neutral !text-[11px]">' + esc(ev.grade) + '</span>'
    : '<span class="text-text-muted">Pending</span>';
  return {
    label: r.roleLabel,
    cells: '<td>' + esc(r.roleLabel) + '</td>' +
      '<td class="tabular-nums">' + (r.avgScore === null ? '-' : num(r.avgScore, 2) + ' <span class="text-text-muted">(' + r.kpiMonths + ')</span>') + '</td>' +
      '<td class="whitespace-nowrap">' + (r.rank === null ? '<span class="text-text-muted">Not ranked</span>' : r.rank + ' of ' + r.ranked + ' ' + cmpEdgePill(r.edge)) + '</td>' +
      '<td class="whitespace-nowrap">' + grade + '</td>' +
      '<td>' + (entry.released && ev && ev.spLevel ? '<span class="pill pill-danger !text-[11px]">' + esc(ev.spLevel) + '</span>' : '<span class="text-text-muted">-</span>') + '</td>'
  };
}

function cmpHistoryPanelHtml(A, B, ctx, state) {
  var card = function (inner) {
    return '<div class="bg-surface-card rounded-xl shadow-level-1 border border-border-light p-space-lg">' + inner + '</div>';
  };
  if (state === 'error') return card(loadErrorHtml(cmpState().ctxError || 'The track record could not be loaded.', 'retryCompareContext'));
  if (!ctx) return card('<div class="skeleton h-64 w-full"></div>');
  var years = ctx.years.slice();
  var hist = function (side) {
    var map = {};
    (ctx.history[side.sel.nik] || []).forEach(function (h) { map[h.year] = h; });
    return map;
  };
  var ha = hist(A);
  var hb = hist(B);
  var line = function (slot, side, map, y, older, first) {
    var now = cmpHistoryCells(map[y] || { roles: [], released: false });
    var before = older ? cmpHistoryCells(map[older] || { roles: [] }) : null;
    var changed = before && before.label && now.label && before.label !== now.label;
    return '<tr' + (first ? ' class="cmp-fy-start"' : '') + '>' +
      (first ? '<td rowspan="2" class="font-semibold text-text-primary align-top">FY' + y + '</td>' : '') +
      '<td class="whitespace-nowrap"><span class="inline-flex items-center gap-2">' + cmpTag(slot) + '<span class="font-semibold text-text-primary">' + esc(side.name) + '</span>' +
        (changed ? '<span class="material-symbols-outlined text-[16px] text-status-info" title="Role changed from FY' + older + ' (' + esc(before.label) + ')">swap_vert</span>' : '') +
      '</span></td>' + now.cells + '</tr>';
  };
  var rows = years.map(function (y, n) {
    var older = years[n + 1];
    return line('a', A, ha, y, older, true) + line('b', B, hb, y, older, false);
  }).join('');
  var scored = years.filter(function (y) {
    return [ha, hb].some(function (m) { var r = cmpHistoryRole(m[y]); return r && !r.outOfScope && r.avgScore !== null; });
  });
  var chart = scored.length >= 2
    ? cmpLegendHtml(A.name, B.name, false).replace('</div>', cmpBandZones().slice(1).map(function (z) {
        return '<span class="cmp-legend-item"><span class="cmp-swatch cmp-swatch-band-' + z.key + '"></span><span>' + esc(z.label) + ' from ' + bandNum(z.from) + '</span></span>';
      }).join('') + '</div>') +
      '<div id="cmp-history-box" class="h-64"><canvas id="cmp-history-chart" role="img" aria-label="Annual average KPI score of A and B per fiscal year"></canvas></div>'
    : '<div class="rounded-lg bg-surface-page border border-border-light px-4 py-3 text-body-sm text-text-secondary flex items-start gap-2">' +
        '<span class="material-symbols-outlined text-[18px] text-text-muted" aria-hidden="true">history</span>' +
        '<span>Track record starts with FY' + years[years.length - 1] + ', the first year in this system for these two people. Earlier years appear here once they exist.</span></div>';
  return card(
    '<div class="flex flex-wrap items-start justify-between gap-space-sm mb-space-md">' +
      '<div class="min-w-0 flex-1"><h3 class="text-title-md text-text-primary">Track record</h3>' +
      '<p class="text-body-sm text-text-muted">Annual average KPI score per fiscal year, with standing among peers and the final grade. Each year uses the home role of that year.</p></div>' +
      cmpGuideLink('rg-history', 'How to read the track record') +
    '</div>' +
    chart +
    '<div class="table-scroll mt-space-md"><table class="data-table cmp-history-table text-body-sm min-w-[860px]">' +
      '<thead><tr><th scope="col">FY</th><th scope="col">Person</th><th scope="col">Home role</th><th scope="col">Avg KPI (months)</th>' +
      '<th scope="col">Standing</th><th scope="col">Grade</th><th scope="col">SP</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<dl class="cmp-defs mt-space-md">' +
      '<div><dt>Avg KPI</dt><dd>Average monthly KPI score over the months submitted that year, trial months left out. The same figure feeds the Performance Evaluation.</dd></div>' +
      '<div><dt>Standing</dt><dd>Rank in the same role that year over the whole year. People with fewer than ' + CMP_MIN_MONTHS + ' scored months are not ranked; labels need at least ' + CMP_MIN_PEERS + ' ranked people.</dd></div>' +
      '<div><dt>Grade</dt><dd>Final Performance Evaluation grade. A dash means the year is not released or the scorecard is missing; Pending means it is not complete.</dd></div>' +
      '<div><dt>SP</dt><dd>Warning letter recorded in that year\'s Performance Evaluation.</dd></div>' +
      '<div><dt><span class="material-symbols-outlined text-[16px] align-middle text-status-info" aria-hidden="true">swap_vert</span> Role changed</dt><dd>The home role differs from the year before.</dd></div>' +
    '</dl>'
  );
}

function cmpHistoryChartConfig(A, B, ctx) {
  var years = ctx.years.slice().sort(function (x, y) { return x - y; });
  var value = function (side, y) {
    var entry = (ctx.history[side.sel.nik] || []).filter(function (h) { return h.year === y; })[0];
    var r = cmpHistoryRole(entry);
    return r && !r.outOfScope && isNum(r.avgScore) ? Number(r.avgScore) : null;
  };
  var config = cmpLineConfig(years.map(function (y) { return 'FY' + y; }),
    years.map(function (y) { return value(A, y); }), years.map(function (y) { return value(B, y); }), A.name, B.name, null);
  cmpBandZones().slice(1).forEach(function (z) {
    config.data.datasets.push({ label: z.label + ' from ' + bandNum(z.from), data: years.map(function () { return z.from; }),
      borderColor: 'rgba(100, 116, 139, .55)', borderWidth: 1, borderDash: [2, 4], pointRadius: 0, order: 3 });
  });
  config.options.scales = { y: { min: 0, max: 100, title: { display: true, text: 'Average KPI score' } } };
  return config;
}
