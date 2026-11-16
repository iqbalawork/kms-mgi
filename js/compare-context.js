'use strict';

var CMP_MIN_PEERS = 5;
var CMP_EDGE_PCT = 20;
var CMP_SLIP = -1;
var CMP_MISS_N = 3;
var CMP_MISS_PCT = 30;
var CMP_KPI_SHARE = 25;
var CMP_EVIDENCE_PCT = 80;

var CMP_FLAG_LEVELS = {
  high:  { label: 'High',  pill: 'pill-danger',  icon: 'error',      order: 0, text: 'Could change the decision or make it hard to defend. Resolve it before you decide.' },
  watch: { label: 'Watch', pill: 'pill-warning', icon: 'visibility', order: 1, text: 'Read the numbers with this in mind.' },
  info:  { label: 'Info',  pill: 'pill-neutral', icon: 'info',       order: 2, text: 'Context, not a problem.' }
};

var CMP_EDGES = {
  top:      { label: 'Top 20%',       pill: 'pill-success' },
  bottom:   { label: 'Bottom 20%',    pill: 'pill-danger' },
  above:    { label: 'Above median',  pill: 'pill-info' },
  below:    { label: 'Below median',  pill: 'pill-warning' },
  middle:   { label: 'Middle',        pill: 'pill-neutral' },
  few:      { label: 'Too few peers', pill: 'pill-neutral' },
  unranked: { label: 'Not ranked',    pill: 'pill-neutral' }
};

function cmpPeerScore(row, months) {
  var values = months.map(function (i) { return row.months ? row.months[i] : null; }).filter(isNum).map(Number);
  return { avg: values.length ? cmpMean(values) : null, scored: values.length };
}

function cmpRankOf(list, score) {
  var key = Math.round(score * 100);
  return 1 + list.filter(function (x) { return Math.round(x.avg * 100) > key; }).length;
}

function cmpEdge(rank, ranked) {
  if (rank === null) return 'unranked';
  if (ranked < CMP_MIN_PEERS) return 'few';
  var edge = Math.ceil(ranked * CMP_EDGE_PCT / 100);
  return rank <= edge ? 'top' : rank > ranked - edge ? 'bottom' : 'middle';
}

function cmpMedian(values) {
  var list = values.slice().sort(function (x, y) { return x - y; });
  if (!list.length) return null;
  var mid = Math.floor(list.length / 2);
  return list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2;
}

function cmpPeerStanding(side, months) {
  var nik = String(side.sel.nik);
  var need = Math.min(CMP_MIN_MONTHS, months.length) || 1;
  var all = cmpCandidates().filter(function (r) { return r.roleKey === side.role.roleKey; }).map(function (r) {
    var s = cmpPeerScore(r, months);
    return { nik: String(r.NIK), avg: s.avg, scored: s.scored };
  });
  var ranked = all.filter(function (x) { return x.avg !== null && x.scored >= need; });
  var self = all.filter(function (x) { return x.nik === nik; })[0] || null;
  var me = ranked.filter(function (x) { return x.nik === nik; })[0] || null;
  var rank = me ? cmpRankOf(ranked, me.avg) : null;
  var median = cmpMedian(ranked.map(function (x) { return x.avg; }));
  var edge = cmpEdge(rank, ranked.length);
  if (edge === 'middle') edge = me.avg >= median ? 'above' : 'below';
  return {
    roleKey:   side.role.roleKey,
    roleLabel: side.role.roleLabel,
    need:      need,
    ranked:    ranked.length,
    unranked:  all.length - ranked.length,
    rank:      rank,
    edge:      edge,
    avg:       self && self.avg !== null ? cmpRound(self.avg) : null,
    scored:    self ? self.scored : 0,
    median:    median === null ? null : cmpRound(median),
    scores:    ranked.map(function (x) { return { avg: cmpRound(x.avg), nik: x.nik }; })
  };
}

function cmpPeerText(name, p, withRole) {
  var where = withRole ? ' in ' + p.roleLabel : '';
  if (p.rank === null) return name + ' is not ranked' + where + ' (fewer than ' + p.need + ' scored months).';
  var tail = p.edge === 'few' ? 'too few peers to label' : CMP_EDGES[p.edge].label.toLowerCase();
  return name + ' ranks ' + p.rank + ' of ' + p.ranked + where + ' (' + tail + ').';
}

function cmpContextKey(A, B) {
  return [A.sel.nik + '|' + A.role.roleKey, B.sel.nik + '|' + B.role.roleKey].sort().join('~') + '~' + activeSumYear();
}

function cmpContextState(A, B) {
  var c = cmpState();
  return (c.ctxState || {})[cmpContextKey(A, B)] || '';
}

function cmpContext(A, B) {
  var c = cmpState();
  return (c.context || {})[cmpContextKey(A, B)] || null;
}

function cmpLoadContext(A, B) {
  var c = cmpState();
  var key = cmpContextKey(A, B);
  c.context = c.context || {};
  c.ctxState = c.ctxState || {};
  if (c.ctxState[key]) return;
  c.ctxState[key] = 'loading';
  api('getCompareContext', { nik: A.sel.nik, roleKey: A.role.roleKey }, { nik: B.sel.nik, roleKey: B.role.roleKey }, activeSumYear())
    .then(function (data) {
      c.context[key] = data;
      c.ctxState[key] = 'ready';
      if (S.sumView === 'compare') renderCompare();
    })
    .catch(function (err) {
      c.ctxState[key] = 'error';
      c.ctxError = err.message;
      if (S.sumView === 'compare') renderCompare();
    });
}

function retryCompareContext() {
  var c = cmpState();
  c.ctxState = {};
  renderCompare();
}

function cmpMonthList(list) {
  return list.map(function (i) { return MONTHS[i].substring(0, 3); }).join(', ');
}

function cmpPointsByFlag(side, months, flags, flag) {
  var scored = months.filter(function (i) { return cmpTotal(side, i) !== null; });
  if (!scored.length) return { lost: 0, gained: 0, kpis: [] };
  var lost = 0;
  var gained = 0;
  var hit = [];
  (side.role.kpis || []).forEach(function (k) {
    if ((flags || {})[k.KPI_ID] !== flag) return;
    var l = 0;
    var g = 0;
    scored.forEach(function (i) {
      var c = k.months ? k.months[i] : null;
      if (!c || c.auto || !isNum(c.score)) return;
      l += Number(k.WeightPercent) * (1 - Number(c.score));
      g += Number(k.WeightPercent) * Number(c.score);
    });
    lost += l / scored.length;
    gained += g / scored.length;
    hit.push({ k: k, lost: l / scored.length });
  });
  hit.sort(function (x, y) { return y.lost - x.lost; });
  return { lost: cmpRound(lost), gained: cmpRound(gained), kpis: hit };
}

function cmpNameList(kpis) {
  var names = kpis.map(function (x) { return x.k.KPI_Name; });
  return names.length > 3 ? names.slice(0, 3).join(', ') + ' and ' + (names.length - 3) + ' more' : names.join(', ');
}

function cmpEvidenceMonths(ctx, side) {
  var byNik = ctx && ctx.evidence ? ctx.evidence[side.sel.nik] : null;
  return byNik && byNik[side.role.roleKey] ? byNik[side.role.roleKey] : [];
}

function cmpFlags(A, B, ov, kpis, ev, peers, ctx, ctxState, mode) {
  var out = [];
  var add = function (level, who, text, why, target) { out.push({ level: level, who: who, text: text, why: why, target: target || '' }); };
  var sides = [['a', A, ov.a], ['b', B, ov.b]];
  var states = (A.data && A.data.monthStates) || [];

  var due = ov.months.filter(function (i) { return states[i] === 'due'; }).length;
  var misses = sides.map(function (p) {
    var slot = p[0], side = p[1], st = p[2];
    if (st.scored < CMP_MIN_MONTHS) {
      add('high', [slot], side.name + ' has only ' + st.scored + ' scored ' + (st.scored === 1 ? 'month' : 'months') + ' in this period.',
        'An average of so few months does not show how the person usually performs.', 'overview');
    }
    var missed = st.missing.filter(function (i) { return states[i] === 'due'; });
    var heavy = missed.length >= CMP_MISS_N || (due && missed.length * 100 >= CMP_MISS_PCT * due);
    return { slot: slot, name: side.name, missed: missed, level: heavy ? 'high' : 'watch' };
  }).filter(function (m) { return m.missed.length; });
  var missWhy = 'Missed months are a discipline issue, and the average rests on fewer months.';
  if (misses.length === 2 && misses[0].missed.join(',') === misses[1].missed.join(',')) {
    add(misses[0].level === 'high' || misses[1].level === 'high' ? 'high' : 'watch', ['a', 'b'],
      'Both missed ' + misses[0].missed.length + ' of ' + due + ' due months (' + cmpMonthList(misses[0].missed) + ').', missWhy, 'months');
  } else {
    misses.forEach(function (m) {
      add(m.level, [m.slot], m.name + ' missed ' + m.missed.length + ' of ' + due + ' due months (' + cmpMonthList(m.missed) + ').', missWhy, 'months');
    });
  }

  if (ov.a.scored >= CMP_MIN_MONTHS && ov.b.scored >= CMP_MIN_MONTHS && ov.shared.length < CMP_MIN_MONTHS) {
    add('watch', ['a', 'b'], 'Only ' + ov.shared.length + (ov.shared.length === 1 ? ' month was' : ' months were') + ' submitted by both.',
      'The gap between A and B rests on very few months.', 'overview');
  }

  var year = activeSumYear();
  if (ev.state === 'hidden') {
    add('info', [], 'Performance Evaluation for FY' + year + ' is not released yet, so grades and SP are not part of this comparison.',
      'Use Compare for KPI results only until the evaluation is released.', '');
  } else if (ev.state === 'missing') {
    sides.filter(function (p) { return !ev[p[0]]; }).forEach(function (p) {
      add('high', [p[0]], p[1].name + ' has no Performance Evaluation for this role in FY' + year + '.',
        'Without the evaluation there is no final score or grade to compare.', 'evaluation');
    });
  } else if (ev.state === 'ready') {
    var open = sides.filter(function (p) { return !ev[p[0]].complete; });
    if (open.length) {
      add('high', open.map(function (p) { return p[0]; }), 'Performance Evaluation is not complete for ' + open.map(function (p) {
        return p[1].name + ' (needs ' + (ev[p[0]].missing || []).join(', ') + ')';
      }).join(' and ') + '.', 'Grades and the final score can still change.', 'evaluation');
    }
    sides.forEach(function (p) {
      var sp = ev[p[0]].spLevel;
      if (sp) add('high', [p[0]], p[1].name + ' has ' + sp + ' on record in FY' + year + '.', 'A warning letter weighs on both promotion and efficiency decisions.', 'evaluation');
    });
  }

  if (ctx && ctx.history) {
    sides.forEach(function (p) {
      var earlier = (ctx.history[p[1].sel.nik] || []).filter(function (h) { return h.year < year; });
      earlier.forEach(function (h) {
        h.roles.forEach(function (r) {
          if (r.evaluation && r.evaluation.spLevel) {
            add('watch', [p[0]], p[1].name + ' had ' + r.evaluation.spLevel + ' in FY' + h.year + ' (' + r.roleLabel + ').',
              'Earlier warning letters are part of the track record.', 'history');
          }
        });
      });
    });
  }

  sides.forEach(function (p) {
    var st = p[2];
    if (st.trend !== null && st.trend <= CMP_SLIP) {
      add('watch', [p[0]], p[1].name + ' is slipping by ' + num(Math.abs(st.trend), 2) + ' points a month.',
        'Results are falling even if the average still looks fine.', 'trend');
    }
  });

  sides.forEach(function (p, n) {
    var peer = peers[n];
    if (peer && peer.edge === 'bottom') {
      add('watch', [p[0]], p[1].name + ' is in the bottom 20% of ' + peer.ranked + ' people in ' + peer.roleLabel + '.',
        'Standing among peers matters more than the gap between two people.', 'peers');
    }
  });

  if (ctx && ctx.kpiFlags) {
    var hits = { hard: [], easy: [] };
    sides.forEach(function (p) {
      var side = p[1];
      var lostAll = cmpPointsLost(side, ov.shared).reduce(function (s, x) { return s + x.lost; }, 0);
      var hard = cmpPointsByFlag(side, ov.shared, ctx.kpiFlags, 'hard');
      if (hard.lost > 0 && lostAll > 0 && hard.lost * 100 >= CMP_KPI_SHARE * lostAll) {
        hits.hard.push({ p: p, part: hard.lost, whole: cmpRound(lostAll), kpis: hard.kpis });
      }
      var easy = cmpPointsByFlag(side, ov.shared, ctx.kpiFlags, 'easy');
      var total = p[2].h2hMean;
      if (easy.gained > 0 && total > 0 && easy.gained * 100 >= CMP_KPI_SHARE * total) {
        hits.easy.push({ p: p, part: easy.gained, whole: cmpRound(total), kpis: easy.kpis });
      }
    });
    var ids = function (h) { return h.kpis.map(function (x) { return x.k.KPI_ID; }).sort().join(','); };
    var texts = {
      hard: { label: 'Unrealistic', role: 'part of both low scores may come from the targets, not the people',
              one: function (h) { return num(h.part, 2) + ' of the ' + num(h.whole, 2) + ' points a month that ' + h.p[1].name + ' loses come from KPIs flagged Unrealistic (' + cmpNameList(h.kpis) + ').'; },
              why: 'Part of the low score may come from the target, not the person.' },
      easy: { label: 'Easy', role: 'scores near the top say little about who is stronger',
              one: function (h) { return num(h.part, 2) + ' of the ' + num(h.whole, 2) + ' points ' + h.p[1].name + ' scores come from KPIs flagged Easy (' + cmpNameList(h.kpis) + ').'; },
              why: 'Part of the high score may come from targets that are too easy.' }
    };
    ['hard', 'easy'].forEach(function (key) {
      var list = hits[key];
      var t = texts[key];
      var target = function (h) { return mode === 'same' ? 'kpi:' + h.kpis[0].k.KPI_ID : 'overview'; };
      if (mode === 'same' && list.length === 2 && ids(list[0]) === ids(list[1])) {
        var total = (A.role.kpis || []).length;
        add('watch', ['a', 'b'], list[0].kpis.length + ' of ' + total + ' KPIs in ' + A.role.roleLabel + ' are flagged ' + t.label + ' in KPI Health (' +
          cmpNameList(list[0].kpis) + '), so ' + t.role + '.', 'This is about the targets of the role. Review them in Master KPIs.', target(list[0]));
        return;
      }
      list.forEach(function (h) { add('watch', [h.p[0]], t.one(h), t.why, target(h)); });
    });
  }

  if (ctx && ctx.evidence) {
    var cover = sides.map(function (p) {
      var have = cmpEvidenceMonths(ctx, p[1]);
      var scored = ov.months.filter(function (i) { return cmpTotal(p[1], i) !== null; });
      var without = scored.filter(function (i) { return have.indexOf(i + 1) === -1; });
      return { slot: p[0], name: p[1].name, scored: scored.length, files: scored.length - without.length, without: without };
    });
    if (ctx.evidenceOptional) {
      add('info', [], 'Evidence was optional in FY' + year + '. ' + cover.map(function (x) {
        return x.slot.toUpperCase() + ' has files for ' + x.files + ' of ' + x.scored + ' scored months';
      }).join(', ') + '.', 'Results without a file rest on the person\'s own report.', 'months');
    } else {
      cover.forEach(function (x) {
        if (x.scored && x.files * 100 < CMP_EVIDENCE_PCT * x.scored) {
          add('watch', [x.slot], x.name + ' has evidence for ' + x.files + ' of ' + x.scored + ' scored months (missing: ' + cmpMonthList(x.without) + ').',
            'Results without a file are weak ground for a decision.', 'months');
        }
      });
    }
  }

  sides.forEach(function (p) {
    if (p[1].role.roleInactive) add('info', [p[0]], p[1].name + ' no longer holds ' + p[1].role.roleLabel + '.', 'The results belong to a role the person has left.', '');
  });
  if (mode === 'diff') add('info', ['a', 'b'], 'Different roles: targets and KPIs differ.', 'Compare patterns and standing, not scores.', '');

  return out.sort(function (x, y) { return CMP_FLAG_LEVELS[x.level].order - CMP_FLAG_LEVELS[y.level].order; });
}

function cmpVerdict(flags) {
  if (flags.some(function (f) { return f.level === 'high'; })) return { key: 'stop', label: 'Not ready for a decision', icon: 'block', tone: 'text-status-danger-text' };
  if (flags.length) return { key: 'notes', label: 'Ready, read the notes', icon: 'rule', tone: 'text-status-warning-text' };
  return { key: 'clear', label: 'No red flags', icon: 'verified', tone: 'text-status-success-text' };
}

function cmpHistoryRole(entry) {
  var roles = (entry && entry.roles) || [];
  return roles.filter(function (r) { return r.isHome; })[0] || roles[0] || null;
}

function showCompareFlag(target) {
  var c = cmpState();
  var t = String(target || '');
  var anchor = '';
  if (t.indexOf('kpi:') === 0) {
    var id = t.slice(4);
    c.tab = 'kpis';
    c.filter = 'all';
    c.open = {};
    c.open[id] = true;
    anchor = '[data-kpi-row="' + attr(id) + '"]';
  } else if (t === 'flags') {
    anchor = '#cmp-flags';
  } else if (t === 'evaluation' || t === 'history') {
    c.tab = t;
    anchor = '#cmp-sticky';
  } else {
    c.tab = 'overview';
    anchor = t === 'months' ? '#cmp-month-table' : t === 'trend' ? '#cmp-card-trend' : t === 'peers' ? '#cmp-peers' : '#cmp-sticky';
  }
  renderCompare();
  var el = document.querySelector(anchor);
  if (!el) return;
  if (el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (el.classList && anchor !== '#cmp-sticky') {
    el.classList.add('cmp-flash');
    setTimeout(function () { el.classList.remove('cmp-flash'); }, 1600);
  }
}

function toggleCompareFlags() {
  var c = cmpState();
  c.flagsOpen = !c.flagsShown;
  renderCompare();
}
