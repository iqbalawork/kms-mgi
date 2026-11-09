'use strict';

var CMP_RANGES = {
  all: [1, 12], q1: [1, 3], q2: [4, 6], q3: [7, 9], q4: [10, 12]
};
var CMP_TIERS = [1, 0.8, 0.6, 0.4, 0.2];
var CMP_MIN_MONTHS = 3;
var CMP_TIER_SPREAD = 0.5;

function cmpState() {
  if (!S.compare) {
    S.compare = { a: null, b: null, range: 'all', from: 1, to: 12, tab: 'overview', filter: 'all', open: {}, pick: '', q: '', token: null };
  }
  return S.compare;
}

function cmpCandidates() {
  return S.annual && S.annual.year === activeSumYear() ? S.annual.rows || [] : [];
}

function cmpFindRow(sel) {
  if (!sel) return null;
  return cmpCandidates().filter(function (r) { return String(r.NIK) === String(sel.nik) && r.roleKey === sel.roleKey; })[0] || null;
}

function cmpRoleText(r) {
  return [r.Position, r.Department].filter(Boolean).join(' / ');
}

function cmpPickList(slot) {
  var c = cmpState();
  var other = slot === 'a' ? c.b : c.a;
  var q = (c.q || '').trim().toLowerCase();
  var rows = cmpCandidates().map(function (r, i) { return { r: r, i: i }; }).filter(function (x) {
    var r = x.r;
    if (other && String(r.NIK) === String(other.nik) && r.roleKey === other.roleKey) return false;
    return !q || (r.Full_Name + ' ' + r.NIK + ' ' + cmpRoleText(r) + ' ' + (r.Division || '')).toLowerCase().indexOf(q) > -1;
  });
  var same = other ? rows.filter(function (x) { return x.r.roleKey === other.roleKey; }) : [];
  var rest = other ? rows.filter(function (x) { return x.r.roleKey !== other.roleKey; }) : rows;
  return { same: same, rest: rest };
}

function cmpRange() {
  var c = cmpState();
  if (c.range === 'custom') {
    var from = Math.min(c.from, c.to);
    var to = Math.max(c.from, c.to);
    return [from, to];
  }
  return CMP_RANGES[c.range] || CMP_RANGES.all;
}

function cmpMonths(data) {
  var r = cmpRange();
  var trial = (data && data.trialMonths) || [];
  var out = [];
  for (var m = r[0]; m <= r[1]; m++) {
    if (trial.indexOf(m) === -1) out.push(m - 1);
  }
  return out;
}

function cmpReportFor(sel) {
  return sel ? S.reports[sel.nik + '|' + activeSumYear()] || null : null;
}

function cmpSide(sel) {
  var data = cmpReportFor(sel);
  if (!data) return null;
  var roles = data.roles || [];
  var role = roles.filter(function (r) { return r.roleKey === sel.roleKey; })[0] ||
             roles.filter(function (r) { return r.isHome && !r.roleInactive; })[0] || roles[0] || null;
  if (!role) return null;
  return { sel: sel, data: data, role: role, emp: data.employee || {}, name: (data.employee && data.employee.Full_Name) || sel.nik };
}

function cmpMode(A, B) {
  return A && B && A.role.roleKey === B.role.roleKey ? 'same' : 'diff';
}

function cmpRound(v, dp) {
  var f = Math.pow(10, dp === undefined ? 2 : dp);
  return Math.round(v * f) / f;
}

function cmpMean(values) {
  var list = values.filter(isNum);
  if (!list.length) return null;
  return list.reduce(function (s, v) { return s + Number(v); }, 0) / list.length;
}

function cmpSd(values) {
  var list = values.filter(isNum).map(Number);
  if (list.length < 2) return null;
  var mean = cmpMean(list);
  return Math.sqrt(list.reduce(function (s, v) { return s + (v - mean) * (v - mean); }, 0) / list.length);
}

function cmpSideStats(side, months) {
  var totals = months.map(function (i) { var v = side.role.totals ? side.role.totals[i] : null; return isNum(v) ? Number(v) : null; });
  var scored = [];
  totals.forEach(function (v, n) { if (v !== null) scored.push({ i: months[n], v: v }); });
  var states = side.data.monthStates || [];
  var due = months.filter(function (i) { return states[i] !== 'upcoming'; });
  var missing = due.filter(function (i) { return !isNum(side.role.totals ? side.role.totals[i] : null); });
  var half = Math.floor(scored.length / 2);
  var trend = null;
  if (scored.length >= 2) {
    var first = cmpMean(scored.slice(0, half || 1).map(function (x) { return x.v; }));
    var second = cmpMean(scored.slice(half || 1).map(function (x) { return x.v; }));
    trend = cmpRound(second - first);
  }
  var values = scored.map(function (x) { return x.v; });
  var lowest = scored.length ? scored.reduce(function (lo, x) { return x.v < lo.v ? x : lo; }) : null;
  return {
    totals: totals,
    scored: scored.length,
    due: due.length,
    missing: missing,
    avg: scored.length ? cmpRound(cmpMean(values)) : null,
    trend: trend,
    spread: scored.length ? cmpRound(Math.max.apply(null, values) - Math.min.apply(null, values)) : null,
    sd: cmpSd(values) === null ? null : cmpRound(cmpSd(values)),
    lowest: lowest
  };
}

function cmpOverview(A, B) {
  var months = cmpMonths(A.data);
  var a = cmpSideStats(A, months);
  var b = cmpSideStats(B, months);
  var wins = { a: 0, b: 0, tie: 0, both: 0 };
  months.forEach(function (i, n) {
    var va = a.totals[n];
    var vb = b.totals[n];
    if (va === null || vb === null) return;
    wins.both++;
    if (Math.abs(va - vb) < 0.005) wins.tie++;
    else if (va > vb) wins.a++;
    else wins.b++;
  });
  return {
    months: months,
    a: a,
    b: b,
    wins: wins,
    diff: a.avg !== null && b.avg !== null ? cmpRound(a.avg - b.avg) : null
  };
}

function cmpTierMix(side, months) {
  var mix = { 1: 0, 0.8: 0, 0.6: 0, 0.4: 0, 0.2: 0 };
  var total = 0;
  var auto = 0;
  (side.role.kpis || []).forEach(function (k) {
    months.forEach(function (i) {
      var c = k.months ? k.months[i] : null;
      if (!c || !isNum(c.score)) return;
      if (c.auto) { auto++; return; }
      var key = CMP_TIERS.filter(function (t) { return Math.abs(Number(c.score) - t) < 0.05; })[0];
      if (key === undefined) return;
      mix[key]++;
      total++;
    });
  });
  return { mix: mix, total: total, auto: auto, onTarget: total ? cmpRound(mix[1] / total * 100, 0) : null };
}

function cmpPointsLost(side, months) {
  var scoredMonths = months.filter(function (i) { return isNum(side.role.totals ? side.role.totals[i] : null); });
  if (!scoredMonths.length) return [];
  return (side.role.kpis || []).map(function (k) {
    var lost = 0;
    scoredMonths.forEach(function (i) {
      var c = k.months ? k.months[i] : null;
      if (!c || c.auto || !isNum(c.score)) return;
      lost += Number(k.WeightPercent) * (1 - Number(c.score));
    });
    return { k: k, lost: cmpRound(lost / scoredMonths.length) };
  }).filter(function (x) { return x.lost > 0; }).sort(function (x, y) { return y.lost - x.lost; });
}

function cmpLabelMix(side, months) {
  var out = {};
  (side.role.kpis || []).forEach(function (k) {
    var key = k.Label || 'Increase';
    if (!out[key]) out[key] = { label: key, kpis: 0, weight: 0, hit: 0, cells: 0 };
    var g = out[key];
    g.kpis++;
    g.weight = cmpRound(g.weight + Number(k.WeightPercent || 0), 1);
    months.forEach(function (i) {
      var c = k.months ? k.months[i] : null;
      if (!c || c.auto || !isNum(c.score)) return;
      g.cells++;
      if (Number(c.score) >= 0.95) g.hit++;
    });
  });
  return out;
}

var CMP_BOUNDS = {
  plain:  { 1: [-Infinity, 0], 0.8: [0, 1], 0.6: [1, 2], 0.4: [2, 3], 0.2: [3, Infinity] },
  strict: { 1: [-Infinity, 0], 0.8: [0, 0], 0.6: [0, 1], 0.4: [1, 2], 0.2: [2, Infinity] }
};

function cmpTierPosition(k, r) {
  if (!isNum(r) || k.Label === 'Binary' || (k.Label !== 'Increase' && k.Label !== 'Decrease')) return null;
  var t = Number(k.Target);
  var m = Number(k.Multiplier) || 0;
  if (!(m > 0) || !isNum(t)) return null;
  var value = Number(r);
  var strict = k.Target_Is_B === true;
  var steps = k.Label === 'Decrease' ? (value - t) / m : (t - value) / m;
  var score = calcScore(value, t, k.Label, m, strict);
  var b = (strict ? CMP_BOUNDS.strict : CMP_BOUNDS.plain)[score];
  if (!b) return null;
  var toNext = score >= 1 ? null : Math.max(0, steps - b[0]);
  var cushion = score <= 0.2 ? null : Math.max(0, b[1] - steps);
  return {
    score: score,
    steps: cmpRound(steps, 2),
    toNext: toNext === null ? null : cmpRound(toNext, 2),
    toNextUnits: toNext === null ? null : cmpRound(toNext * m, 4),
    cushion: cushion === null ? null : cmpRound(cushion, 2),
    cushionUnits: cushion === null ? null : cmpRound(cushion * m, 4),
    nextScore: score >= 1 ? null : CMP_TIERS[CMP_TIERS.indexOf(score) - 1]
  };
}

function cmpKpiMonths(data, k, months) {
  return deepDiveKpiMonths(data, k).filter(function (i) { return months.indexOf(i) !== -1; });
}

function cmpKpiSide(data, k, months) {
  if (!k) return null;
  var idx = cmpKpiMonths(data, k, months);
  var cells = idx.map(function (i) { return { i: i, c: k.months ? k.months[i] : null }; })
    .filter(function (x) { return x.c && !x.c.auto && isNum(x.c.score); });
  var reals = cells.filter(function (x) { return isNum(x.c.realization); }).map(function (x) { return Number(x.c.realization); });
  var better = k.Label === 'Decrease' ? -1 : 1;
  var avgReal = cmpMean(reals);
  var sd = cmpSd(reals);
  var trend = null;
  if (reals.length >= 2 && k.Label !== 'Binary') {
    var half = Math.floor(reals.length / 2);
    var d = (cmpMean(reals.slice(half)) - cmpMean(reals.slice(0, half))) * better;
    trend = Math.abs(d) < 1e-9 ? 'flat' : d > 0 ? 'up' : 'down';
  }
  return {
    k: k,
    n: cells.length,
    avgScore: cells.length ? cmpRound(cmpMean(cells.map(function (x) { return Number(x.c.score); }))) : null,
    meanScore: cells.length ? cmpMean(cells.map(function (x) { return Number(x.c.score); })) : null,
    avgReal: avgReal === null ? null : cmpRound(avgReal, 4),
    gap: avgReal === null || k.Label === 'Binary' ? null : cmpRound((avgReal - Number(k.Target)) * better, 4),
    onTarget: cells.filter(function (x) { return isNum(x.c.realization) && meetsTarget(k, Number(x.c.realization)); }).length,
    cv: sd === null || !avgReal ? null : cmpRound(sd / Math.abs(avgReal) * 100, 1),
    trend: trend,
    byMonth: cells.reduce(function (acc, x) { acc[x.i] = x.c; return acc; }, {})
  };
}

function cmpAlignKpis(A, B) {
  var months = cmpMonths(A.data);
  var ids = [];
  var byA = {};
  var byB = {};
  (A.role.kpis || []).forEach(function (k) { byA[k.KPI_ID] = k; if (ids.indexOf(k.KPI_ID) === -1) ids.push(k.KPI_ID); });
  (B.role.kpis || []).forEach(function (k) { byB[k.KPI_ID] = k; if (ids.indexOf(k.KPI_ID) === -1) ids.push(k.KPI_ID); });
  return ids.sort().map(function (id) {
    var ka = byA[id] || null;
    var kb = byB[id] || null;
    var k = ka || kb;
    var sa = cmpKpiSide(A.data, ka, months);
    var sb = cmpKpiSide(B.data, kb, months);
    var weight = Number(k.WeightPercent || 0);
    var pointGap = sa && sb && sa.meanScore !== null && sb.meanScore !== null ? cmpRound(weight * (sa.meanScore - sb.meanScore)) : null;
    var common = sa && sb ? Object.keys(sa.byMonth).filter(function (i) { return sb.byMonth[i]; }).map(Number).sort(function (x, y) { return x - y; }) : [];
    var sameTier = common.filter(function (i) {
      var ca = sa.byMonth[i];
      var cb = sb.byMonth[i];
      if (Math.abs(Number(ca.score) - Number(cb.score)) >= 0.05 || Number(ca.score) >= 0.95) return false;
      if (!isNum(ca.realization) || !isNum(cb.realization)) return false;
      var pa = cmpTierPosition(k, ca.realization);
      var pb = cmpTierPosition(k, cb.realization);
      return !!pa && !!pb && Math.abs(pa.steps - pb.steps) >= CMP_TIER_SPREAD;
    });
    var focus = sameTier.length ? sameTier[sameTier.length - 1] : null;
    var posA = focus !== null ? cmpTierPosition(k, sa.byMonth[focus].realization) : null;
    var posB = focus !== null ? cmpTierPosition(k, sb.byMonth[focus].realization) : null;
    var meaningful = focus !== null;
    return {
      id: id,
      k: k,
      a: sa,
      b: sb,
      weight: weight,
      pointGap: pointGap,
      differs: pointGap !== null ? Math.abs(pointGap) >= 0.005 || meaningful : !!(sa || sb) && !(sa && sb),
      sameTierMonths: sameTier.length,
      focus: meaningful ? focus : null,
      posA: meaningful ? posA : null,
      posB: meaningful ? posB : null
    };
  }).sort(function (x, y) {
    var gx = x.pointGap === null ? -1 : Math.abs(x.pointGap);
    var gy = y.pointGap === null ? -1 : Math.abs(y.pointGap);
    return gy - gx || (x.id < y.id ? -1 : 1);
  });
}

function cmpEvalGap(A, B) {
  var visible = !!(A.data.performance && A.data.performance.visible) && !!(B.data.performance && B.data.performance.visible);
  var ea = A.role.evaluation || null;
  var eb = B.role.evaluation || null;
  if (!visible) return { state: 'hidden' };
  if (!ea || !eb) return { state: 'missing', a: ea, b: eb };
  var parts = (ea.parts || []).map(function (pa) {
    var pb = (eb.parts || []).filter(function (p) { return p.key === pa.key; })[0] || {};
    var diff = isNum(pa.points) && isNum(pb.points) ? cmpRound(pa.points - pb.points) : null;
    return { key: pa.key, label: pa.label, weight: pa.weight, required: pa.required, a: pa, b: pb, diff: diff };
  });
  var complete = !!ea.complete && !!eb.complete;
  var gap = complete ? cmpRound(ea.score - eb.score) : null;
  var driver = null;
  if (complete) {
    parts.forEach(function (p) {
      if (p.diff === null || Math.abs(p.diff) < 0.005) return;
      if (!driver || Math.abs(p.diff) > Math.abs(driver.diff)) driver = p;
    });
  }
  return { state: 'ready', a: ea, b: eb, parts: parts, complete: complete, gap: gap, driver: driver };
}

function cmpNarrative(A, B, ov, kpis, ev) {
  var na = A.name;
  var nb = B.name;
  var out = [];
  if (ov.diff === null) {
    out.push({ icon: 'info', text: 'There are not enough scored months in this period to compare the average KPI score.' });
  } else if (Math.abs(ov.diff) < 0.005) {
    out.push({ icon: 'balance', text: na + ' and ' + nb + ' share the same average KPI score of ' + num(ov.a.avg, 2) + '.' });
  } else {
    var lead = ov.diff > 0 ? na : nb;
    var ahead = ov.diff > 0 ? ov.wins.a : ov.wins.b;
    out.push({ icon: 'leaderboard', text: lead + ' leads by ' + num(Math.abs(ov.diff), 2) + ' points on average KPI score (' + num(ov.a.avg, 2) + ' vs ' + num(ov.b.avg, 2) + ')' +
      (ov.wins.both ? ' and is ahead in ' + ahead + ' of ' + ov.wins.both + ' months scored by both.' : '.') });
  }
  [[na, ov.a], [nb, ov.b]].forEach(function (p) {
    if (p[1].trend !== null && Math.abs(p[1].trend) >= 1) {
      out.push({ icon: p[1].trend > 0 ? 'trending_up' : 'trending_down', text: p[0] + (p[1].trend > 0 ? ' is improving' : ' is slipping') + ' (' + (p[1].trend > 0 ? '+' : '') + num(p[1].trend, 2) +
        ' from the first to the second half of the period).' });
    }
  });
  if (kpis) {
    var top = kpis.filter(function (x) { return x.pointGap !== null && Math.abs(x.pointGap) >= 0.005; })[0];
    if (top) {
      out.push({ icon: 'flag', text: 'The largest KPI gap is ' + top.k.KPI_Name + ' (' + top.id + '), worth ' + num(Math.abs(top.pointGap), 2) + ' points a month in favour of ' +
        (top.pointGap > 0 ? na : nb) + '.' });
    }
    var tie = kpis.filter(function (x) { return x.focus !== null && x.posA && x.posB; })[0];
    if (tie) {
      var unit = tie.k.Unit ? ' ' + tie.k.Unit : '';
      var reach = function (who, pos) {
        return pos.nextScore === null
          ? who + ' is ' + num(pos.cushionUnits, 2) + unit + ' clear of dropping'
          : who + ' needs ' + num(pos.toNextUnits, 2) + unit + ' more to reach ' + Number(pos.nextScore).toFixed(1);
      };
      out.push({ icon: 'stairs', text: 'On ' + tie.k.KPI_Name + ' both scored ' + Number(tie.posA.score).toFixed(1) + ' in ' + MONTHS[tie.focus] + ', but ' +
        reach(na, tie.posA) + ' while ' + reach(nb, tie.posB) + '.' });
    }
  }
  if (ev && ev.state === 'ready' && ev.complete) {
    out.push({ icon: 'workspace_premium', text: 'Performance Score: ' + na + ' ' + scoreText(ev.a.score) + ' (grade ' + ev.a.grade + '), ' + nb + ' ' + scoreText(ev.b.score) +
      ' (grade ' + ev.b.grade + ')' + (ev.driver ? '. ' + ev.driver.label + ' explains most of the difference.' : '.') });
  }
  return out;
}

function cmpWarnings(A, B, ov, mode) {
  var out = [];
  [[A, ov.a], [B, ov.b]].forEach(function (p) {
    if (p[1].scored < CMP_MIN_MONTHS) {
      out.push(p[0].name + ' has only ' + p[1].scored + ' scored ' + (p[1].scored === 1 ? 'month' : 'months') + ' in this period, so read the gap with care.');
    }
    if (p[0].role.roleInactive) out.push(p[0].name + ' no longer holds ' + p[0].role.roleLabel + '.');
  });
  if (mode === 'diff') out.push('Different roles: targets and KPIs differ, so compare patterns, not ranks.');
  return out;
}

function loadCompare() {
  var c = cmpState();
  var year = activeSumYear();
  if (!S.annual || S.annual.year !== year) {
    renderCompare();
    api('getAnnualRecap', year)
      .then(function (data) {
        if (data.year !== activeSumYear()) return;
        S.annual = data;
        syncBands(data.bands);
        renderScopeBanner('sum-scope', data.scope);
        fillYearOptions(data.years);
        cmpDropMissing();
        cmpFetch();
      })
      .catch(function (err) {
        if (S.sumView !== 'compare') return;
        $('sum-compare').innerHTML = '<div class="bg-surface-card rounded-xl border border-border-light p-space-xl">' + loadErrorHtml(err.message, 'loadCompare') + '</div>';
      });
    return;
  }
  cmpDropMissing();
  cmpFetch();
  return c;
}

function cmpDropMissing() {
  var c = cmpState();
  if (c.a && !cmpFindRow(c.a)) c.a = null;
  if (c.b && !cmpFindRow(c.b)) c.b = null;
}

function cmpReport(nik, year) {
  var key = nik + '|' + year;
  if (S.reports[key]) return Promise.resolve(S.reports[key]);
  return api('getPerformanceReport', nik, year).then(function (data) {
    S.reports[key] = data;
    return data;
  });
}

function cmpFetch() {
  var c = cmpState();
  var year = activeSumYear();
  if (!c.a || !c.b) { renderCompare(); return; }
  var token = {};
  c.token = token;
  c.loading = !S.reports[c.a.nik + '|' + year] || !S.reports[c.b.nik + '|' + year];
  c.error = '';
  renderCompare();
  if (!c.loading) return;
  Promise.all([cmpReport(c.a.nik, year), cmpReport(c.b.nik, year)])
    .then(function () {
      if (c.token !== token) return;
      c.loading = false;
      renderCompare();
    })
    .catch(function (err) {
      if (c.token !== token) return;
      c.loading = false;
      c.error = err.message;
      renderCompare();
    });
}

function openComparePick(slot) {
  var c = cmpState();
  c.pick = c.pick === slot ? '' : slot;
  c.q = '';
  renderCompare();
  var box = $('cmp-q');
  if (box && box.focus) box.focus();
}

function closeComparePick() {
  var c = cmpState();
  if (!c.pick) return;
  c.pick = '';
  renderCompare();
}

function filterComparePick(value) {
  var c = cmpState();
  c.q = value || '';
  var list = $('cmp-pick-list');
  if (list) list.innerHTML = cmpPickListHtml(c.pick);
}

function onComparePickKey(ev) {
  if (ev.key === 'Escape') {
    ev.preventDefault();
    closeComparePick();
  }
}

function chooseCompare(slot, index) {
  var c = cmpState();
  var r = cmpCandidates()[index];
  if (!r) return;
  c[slot === 'b' ? 'b' : 'a'] = { nik: String(r.NIK), roleKey: r.roleKey };
  c.pick = '';
  c.q = '';
  c.open = {};
  if (c.a && !c.b) c.pick = 'b';
  cmpFetch();
}

function clearCompare(slot) {
  var c = cmpState();
  c[slot === 'b' ? 'b' : 'a'] = null;
  c.pick = slot === 'b' ? 'b' : 'a';
  renderCompare();
}

function swapCompare() {
  var c = cmpState();
  var t = c.a;
  c.a = c.b;
  c.b = t;
  renderCompare();
}

function setCompareRange(range) {
  var c = cmpState();
  c.range = range === 'custom' || CMP_RANGES[range] ? range : 'all';
  renderCompare();
}

function setCompareMonth(which, value) {
  var c = cmpState();
  var m = parseInt(value, 10);
  if (!(m >= 1 && m <= 12)) return;
  if (which === 'to') c.to = m; else c.from = m;
  c.range = 'custom';
  renderCompare();
}

function setCompareTab(tab) {
  var c = cmpState();
  c.tab = tab === 'kpis' || tab === 'evaluation' ? tab : 'overview';
  renderCompare();
}

function setCompareFilter(filter) {
  var c = cmpState();
  c.filter = filter === 'diff' || filter === 'tier' ? filter : 'all';
  renderCompare();
}

function toggleCompareKpi(index) {
  var c = cmpState();
  var row = (c.rows || [])[index];
  if (!row) return;
  c.open[row.id] = !c.open[row.id];
  renderCompare();
}

function compareWith(nik, roleKey, year) {
  var c = cmpState();
  var sel = { nik: String(nik), roleKey: roleKey };
  if (!c.a || (c.a.nik === sel.nik && c.a.roleKey === sel.roleKey)) {
    c.a = sel;
    if (c.b && c.b.nik === sel.nik && c.b.roleKey === sel.roleKey) c.b = null;
  } else {
    c.b = sel;
  }
  c.pick = c.b ? '' : 'b';
  c.q = '';
  c.open = {};
  var y = parseInt(year, 10) || activeSumYear();
  if ($('modal-host')) $('modal-host').innerHTML = '';
  S.report = null;
  if (S.view !== 'summary') {
    S.sumYear = y;
    S.sumView = 'compare';
    go('summary');
    return;
  }
  if (y !== activeSumYear()) {
    S.sumYear = y;
    S.summary = null;
    S.annual = null;
    fillYearOptions([y]);
    $('sum-year').value = String(y);
  }
  setSumView('compare');
}

function compareFromReport() {
  var t = S.report;
  if (!t) return;
  compareWith(t.nik, t.roleKey, t.year);
}
