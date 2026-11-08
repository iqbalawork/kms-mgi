'use strict';

function exportAnnualCsv() {
  var rows = annualRows();
  if (!S.annual || !rows.length) {
    toast('No data to export.', 'warning');
    return;
  }

  var header = ['NIK', 'Full Name', 'Division', 'Department', 'Position', 'KPI Months', 'Avg KPI Score']
    .concat(MONTHS.map(function (m) { return m.substring(0, 3); }));
  var lines = [csvLine(header)];

  rows.forEach(function (r) {
    lines.push(csvLine([
      r.NIK, r.Full_Name, r.Division, r.Department, r.Position, r.kpiMonths,
      isNum(r.avgScore) ? Number(r.avgScore).toFixed(2) : ''
    ].concat(r.months.map(function (v) {
      return isNum(v) ? Number(v).toFixed(2) : '';
    }))));
  });

  downloadCsv(lines, 'KPI_Annual_Recap_' + S.annual.year + '_' + fileStamp() + '.csv');
  toast('CSV exported (' + rows.length + ' role rows).', 'success');
}

function loadAnnualRecap() {
  var year = activeSumYear();
  S.annPage = 1;
  renderAnnualHead();
  $('ann-tbody').innerHTML = skeletonRows(15, 6);

  api('getAnnualRecap', year)
    .then(function (data) {
      if (data.year !== activeSumYear()) return;
      S.annual = data;
      syncBands(data.bands);
      renderScopeBanner('sum-scope', data.scope);
      fillYearOptions(data.years);
      if (S.sumView === 'annual') fillSumFilters();
      renderAnnual();
    })
    .catch(function (err) {
      $('ann-tbody').innerHTML =
        '<tr><td colspan="15" class="text-center text-status-danger py-space-xl">' + esc(err.message) + '</td></tr>';
      toast(err.message, 'error');
    });
}

function trialMonths() {
  return S.annual && S.annual.trialMonths ? S.annual.trialMonths : [1];
}

function annSortValue(r, key) {
  if (key === 'name') return r.Full_Name;
  if (key === 'months') return r.kpiMonths;
  if (key === 'avg') return r.kpiMonths > 0 && isNum(r.avgScore) ? r.avgScore : null;
  return null;
}

function sortAnnual(key) {
  S.annSort = nextSort(S.annSort, key, key === 'name' ? 1 : -1);
  S.annPage = 1;
  renderAnnualHead();
  renderAnnualTable();
}

function annualRows() {
  if (!S.annual) return [];
  var division = sumDivision();
  var dept = $('sum-dept').value;
  var q = ($('sum-search').value || '').trim().toLowerCase();
  return sortedBy(S.annual.rows.filter(function (r) {
    if (division && !eqiJs(r.Division, division)) return false;
    if (dept && !eqiJs(r.Department, dept)) return false;
    if (q && (r.Full_Name + ' ' + r.NIK).toLowerCase().indexOf(q) === -1) return false;
    return true;
  }), S.annSort, annSortValue);
}

function renderAnnual() {
  if (!S.annual) return;
  renderAnnualHead();
  renderAnnualStats();
  renderAnnualTable();
}

function renderAnnualHead() {
  var trial = trialMonths();
  var names = trial.map(function (m) { return MONTHS[m - 1]; });

  $('ann-note').innerHTML = names.length
    ? '<strong>' + esc(names.join(', ')) + (names.length > 1 ? ' are trial months' : ' is a trial month') +
      ':</strong> shown for reference, but excluded from KPI Months and Avg KPI Score.'
    : 'KPI Months and Avg KPI Score include every month.';

  $('ann-thead').innerHTML = '<tr>' +
    sortHead('Employee', 'name', S.annSort, 'sortAnnual', 'w-[220px] min-[1700px]:w-[280px] !px-3 !py-2') +
    sortHead('KPI Months', 'months', S.annSort, 'sortAnnual', 'w-[72px] !px-1 !py-2 text-center !whitespace-normal !tracking-normal leading-tight') +
    sortHead('Avg KPI Score', 'avg', S.annSort, 'sortAnnual', 'w-[80px] !px-1 !py-2 text-center !whitespace-normal !tracking-normal leading-tight border-r border-slate-200') +
    MONTHS.map(function (m, i) {
      var isTrial = trial.indexOf(i + 1) !== -1;
      return '<th class="!px-0.5 !py-2 text-center !whitespace-normal !tracking-normal leading-tight' + (isTrial ? ' recap-trial' : '') + '"' +
        (isTrial ? ' title="Trial month, excluded from the annual score"' : '') + '>' + esc(m.substring(0, 3)) +
        (isTrial ? '<span class="block text-[9px] font-normal normal-case">Trial</span>' : '') + '</th>';
    }).join('') +
  '</tr>';
}

function annualSummaryStats(rows) {
  var niks = {};
  var scored = 0;
  var sum = 0;
  rows.forEach(function (r) {
    niks[r.NIK] = true;
    if (r.kpiMonths > 0) {
      scored++;
      sum += Number(r.avgScore) || 0;
    }
  });
  return {
    employees: Object.keys(niks).length,
    roles: rows.length,
    scored: scored,
    unscored: rows.length - scored,
    avg: scored ? Math.round(sum / scored * 100) / 100 : null
  };
}

function countedMonthsLabel() {
  var trial = trialMonths();
  var counted = MONTHS.filter(function (m, i) { return trial.indexOf(i + 1) === -1; });
  if (!counted.length) return 'no counted months';
  return counted[0].substring(0, 3) + ' to ' + counted[counted.length - 1].substring(0, 3);
}

function renderAnnualStats() {
  var st = annualSummaryStats(annualRows());
  var avgBand = st.avg === null ? null : band(st.avg);

  $('ann-stats').innerHTML =
    statCard('Employees Tracked', 'groups', 'text-text-primary',
      st.employees, st.employees === 1 ? 'Employee' : 'Employees',
      plural(st.roles, 'scorecard') + ' in ' + S.annual.year,
      '', 0) +

    statCard('Company Average', 'trending_up', avgBand ? 'text-status-' + avgBand.key + '-text' : 'text-text-muted',
      avgBand ? st.avg.toFixed(2) : '-', avgBand ? '%' : '',
      avgBand ? 'Rating: ' + esc(avgBand.label) + ' (' + esc(countedMonthsLabel()) + ')' : 'No counted months scored yet',
      avgBand ? 'bg-status-' + avgBand.key : '', st.avg || 0) +

    statCard('Roles With Scores', 'task_alt', 'text-text-primary',
      st.scored, st.scored === 1 ? 'Role' : 'Roles',
      'At least one counted month scored',
      'bg-status-success', st.roles ? st.scored / st.roles * 100 : 0) +

    statCard('Roles Without Scores', 'pending_actions', st.unscored ? 'text-status-warning' : 'text-status-success',
      st.unscored, st.unscored === 1 ? 'Role' : 'Roles',
      st.unscored ? 'No counted month submitted yet' : 'Every scorecard has a counted month',
      '', 0);
}

function renderAnnualTable() {
  var all = annualRows();
  var size = pageSizeFor('annual', all.length);
  var pages = Math.max(1, Math.ceil(all.length / size));
  if (S.annPage > pages) S.annPage = pages;
  var start = (S.annPage - 1) * size;
  var page = all.slice(start, start + size);
  var trial = trialMonths();

  if (!all.length) {
    $('ann-tbody').innerHTML =
      '<tr><td colspan="15" class="text-center py-space-2xl">' +
        (S.annual && S.annual.rows.length ? emptyState('search', 'No data matches these filters.')
                                          : emptyState('empty', 'No KPI mappings found for ' + activeSumYear() + '.')) +
      '</td></tr>';
    $('ann-pagination').innerHTML = '';
    return;
  }

  $('ann-tbody').innerHTML = page.map(function (r) {
    return '<tr>' +
      '<td class="!px-3 !py-2.5">' +
        '<div class="flex flex-col items-start min-w-0">' +
          nameLink(r.Full_Name, r.NIK, r.roleKey, activeSumYear(), 'text-[12px] font-semibold leading-snug') +
          '<span class="text-text-secondary leading-snug">' + esc(r.Position) + ' / ' + esc(r.Department) + '</span>' +
          '<span class="text-text-muted leading-snug">' + esc(r.NIK) + (r.Division ? ' • ' + esc(r.Division) : '') + '</span>' +
          (!r.isHome || r.roleInactive
            ? '<span class="flex items-center gap-1 flex-wrap mt-0.5">' +
                (r.isHome ? '' : '<span class="pill pill-maroon !py-0 !px-1 !text-[9px]" title="Additional role">Additional</span>') +
                (r.roleInactive ? '<span class="pill pill-neutral !py-0 !px-1 !text-[9px]" title="Inactive role">Inactive</span>' : '') +
              '</span>'
            : '') +
        '</div>' +
      '</td>' +
      '<td class="!px-1 !py-2.5 text-center tabular-nums font-semibold text-text-primary">' + r.kpiMonths + '</td>' +
      '<td class="!px-1 !py-2.5 text-center border-r border-slate-200">' + dashCell(r.avgScore) + '</td>' +
      r.months.map(function (v, i) {
        var isTrial = trial.indexOf(i + 1) !== -1;
        return '<td class="!px-0.5 !py-2.5 text-center' + (isTrial ? ' recap-trial' : '') + '">' + dashCell(v, isTrial) + '</td>';
      }).join('') +
    '</tr>';
  }).join('');

  renderPagination('ann-pagination', all.length, start, page.length, S.annPage, size, 'annual');
}
