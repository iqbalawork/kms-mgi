'use strict';

function pointsGoNext(avg) {
  var b = bandValues();
  if (avg < b.good) return { label: 'Good', at: b.good };
  if (avg < b.excellent) return { label: 'Excellent', at: b.excellent };
  return null;
}

function pointsGoHtml(data, role, surface) {
  var avgRaw = role.avgKpi !== undefined ? role.avgKpi : role.avgScore;
  var avg = isNum(avgRaw) ? Number(avgRaw) : null;
  if (avg === null) return '';
  var pdf = surface === 'pdf';
  var list = pointsLost(role, deepDiveMonths(data));
  var total = Math.max(0, Math.round((100 - avg) * 100) / 100);
  var shown = list.slice(0, pdf ? 3 : 5);
  var rest = list.slice(shown.length);
  var restLost = Math.round(rest.reduce(function (s, x) { return s + x.lost; }, 0) * 100) / 100;
  var max = list.length ? list[0].lost : 0;
  var next = pointsGoNext(avg);
  var need = next ? Math.round((next.at - avg) * 100) / 100 : 0;
  var levers = [];
  var held = 0;
  list.forEach(function (x) {
    if (held >= need || levers.length >= 3) return;
    levers.push(x);
    held = Math.round((held + x.lost) * 100) / 100;
  });
  var names = levers.map(function (x) { return x.k.KPI_Name; });
  var nameText = names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];

  var row = function (x) {
    var name = pdf
      ? '<span class="block text-body-sm font-semibold text-text-primary truncate">' + esc(x.k.KPI_Name) + '</span>'
      : '<button type="button" class="pg-name" onclick="MGI.openPointsKpi(' + x.index + ')" title="Open ' + esc(x.k.KPI_Name) + ' in Deep-Dive Analytics">' + esc(x.k.KPI_Name) + '</button>';
    return '<li class="pg-row">' +
      '<span class="min-w-0">' + name +
        '<span class="block text-label-xs text-text-muted">' + esc(x.k.KPI_ID) + ' • weight ' + num(x.k.WeightPercent, 1) + '% • below tier 1.0 in ' + x.below + ' of ' + plural(x.counted, 'month') + '</span></span>' +
      '<span class="pg-bar" aria-hidden="true"><span style="width:' + (max ? Math.max(4, Math.round(x.lost / max * 100)) : 0) + '%"></span></span>' +
      '<span class="pg-lost">−' + x.lost.toFixed(2) + '</span>' +
    '</li>';
  };

  var unscored = Math.round((total - list.reduce(function (s, x) { return s + x.lost; }, 0)) * 100) / 100;
  var plain = function (text, value) {
    return '<li class="pg-row pg-rest"><span class="text-body-sm text-text-secondary">' + text + '</span><span class="pg-bar" style="visibility:hidden"></span>' +
      '<span class="pg-lost">−' + value.toFixed(2) + '</span></li>';
  };

  var body = !list.length && unscored < 0.05
    ? '<p class="text-body-sm text-text-secondary">Every counted month earned every point.</p>'
    : '<ul class="pg-list">' + shown.map(row).join('') +
        (rest.length ? plain('+ ' + plural(rest.length, 'other KPI'), restLost) : '') +
        (unscored >= 0.05 ? plain('KPIs with no score in some counted months', unscored) : '') +
      '</ul>' +
      (next
        ? '<p class="pg-next"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">flag</span><span>To reach ' + next.label + ' (' + num(next.at, 2) +
            '), the average needs <strong>+' + need.toFixed(2) + '</strong> points a month. ' +
            esc(nameText) + (levers.length === 1 ? ' alone holds ' : (held >= need ? ' together hold ' : ' hold ')) + '<strong>' + held.toFixed(2) + '</strong>.</span></p>'
        : '<p class="pg-next is-top"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">workspace_premium</span><span>Already Excellent. The list shows where the last points went.</span></p>');

  return '<div class="rounded-xl border border-border-light p-space-md ' + (pdf ? 'mt-space-md bg-white' : 'mb-space-lg ' + (surface === 'modal' ? 'bg-surface-page' : 'bg-surface-card shadow-level-1')) + '">' +
    '<div class="flex flex-col sm:flex-row sm:items-start justify-between gap-1 mb-space-sm">' +
      '<div class="min-w-0">' +
        '<h3 class="flex items-center gap-1 text-title-md text-text-primary">Where the points go' + tipBtn('points-lost') + '</h3>' +
        '<p class="text-label-xs text-text-muted mt-1">Avg KPI Score ' + avg.toFixed(2) + ': <strong class="text-text-secondary">' + total.toFixed(2) + ' points a month</strong> were not earned. ' +
          'Points lost per KPI, averaged over the counted months.</p>' +
      '</div>' +
    '</div>' +
    body +
  '</div>';
}

function openPointsKpi(index) {
  var t = S.report;
  var data = t ? S.reports[t.nik + '|' + t.year] : null;
  if (!data) return;
  var role = (data.roles || []).filter(function (r) { return r.roleKey === t.roleKey; })[0];
  var k = role && role.kpis ? role.kpis[index] : null;
  if (!k) return;
  S.deepOpen[role.roleKey + '|' + k.KPI_ID] = true;
  S.reportTab = 'analytics';
  renderPerformanceReport();
  setTimeout(function () {
    var el = document.querySelector('[data-dd-kpi="' + attr(k.KPI_ID) + '"]');
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 60);
}
