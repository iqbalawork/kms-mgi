'use strict';

function guideLink(tab, section, label) {
  return '<button type="button" class="cmp-guide-link no-print" onclick="MGI.openGuide(\'' + tab + '\', \'' + section + '\')">' +
    '<span class="material-symbols-outlined text-[16px]" aria-hidden="true">help</span>' + esc(label) + '</button>';
}

function agSteps(items) {
  return '<ol class="ag-steps">' + items.map(function (t, n) {
    return '<li><span class="ag-step-num" aria-hidden="true">' + (n + 1) + '</span><span>' + t + '</span></li>';
  }).join('') + '</ol>';
}

function agHealthHtml() {
  var live = !!S.kpiHealth;
  var r = kpiHealthRules(S.kpiHealth);
  var flag = function (key) { var f = HEALTH_FLAGS[key]; return '<span class="pill ' + f.pill + ' !text-[11px] whitespace-nowrap">' + esc(f.label) + '</span>'; };
  var rule = function (text, fallback) { return live ? text : fallback; };
  return '<p class="text-body-sm text-text-secondary mb-space-sm">Master KPIs > KPI Health checks whether each target is set at the right level, from every submission of the fiscal year. Trial months and the automatic 1.0 of off-cycle quarterly KPIs are not counted. The rules are set per year in System Settings > KPI Health.</p>' +
    rgTable(['Column', 'Definition'], [
      ['Holders', 'Employees mapped to the KPI that year.'],
      ['Submissions', 'Scored months across all holders.'],
      ['At 1.0 / At 0.2', 'Share of submissions on the top tier and on the lowest tier.'],
      ['Avg Tier', 'Average tier of all submissions. It shows how hard the KPI is, without its weight.'],
      ['Points lost', 'Weight × (1 − avg tier): the KPI score points a holder loses on this KPI in an average month. It ranks which reviews matter most.'],
      ['Flag', 'The verdict on the target, with the rules below.']
    ]) +
    '<div class="mt-space-md">' + rgTable(['Flag', 'Rule'], [
      [flag('hard'), rule(r.hardPct + '% or more of submissions at tier ' + healthTierText(r.hardTier, false) + '. The target may be too high.', 'Most submissions at the lowest tiers, as set in System Settings. The target may be too high.')],
      [flag('easy'), rule(r.easyPct + '% or more of submissions at tier ' + healthTierText(r.easyTier, true) + '. The target may be too low.', 'Most submissions at the top tier, as set in System Settings. The target may be too low.')],
      [flag('healthy'), 'Results spread across the tiers.'],
      [flag('thin'), rule('Fewer than ' + plural(r.minEntries, 'submission') + ', too few to judge.', 'Too few submissions to judge, as set in System Settings.')]
    ]) + '</div>' +
    '<h3 class="text-title-md text-text-primary mt-space-md mb-2">How to use it</h3>' + rgList([
      'Sort by Points lost to choose which KPIs to review first.',
      'Read the Flag for the diagnosis. Unrealistic or Easy points at the target; Healthy does not.',
      'A Healthy KPI with high Points lost is an important KPI that people are not reaching yet. Coach the work, do not lower the target.',
      'Compare uses the same definitions for its Gap from Unrealistic KPIs and Score lifted by Easy KPIs notes.'
    ]);
}

function agDepartmentsHtml() {
  var r = (S.depts && S.depts.rules) || DEPT_RULES_FALLBACK;
  var tag = function (key, extra) { return [deptTagPill(key), esc(deptRuleText(key, r) + (extra ? ' ' + extra : '')), esc(DEPT_TAGS[key].hint)]; };
  return '<p class="text-body-sm text-text-secondary mb-space-sm">Summary Report > Departments reads every department of the year and points to the kind of development it may need. ' +
      'Each person counts once, in their home department, and trial months are left out. These are signals to discuss with the department head, not a verdict and not a headcount number.</p>' +
    rgTable(['Measure', 'Definition'], [
      ['People', 'Employees whose home role is in the department.'],
      ['Avg KPI', 'Average of their annual KPI scores, with the Rating Band.'],
      ['Below Good', 'Share of people whose average is below the Good line.'],
      ['Trend', 'Slope of the department monthly average, in points a month.'],
      ['Submitted', 'Months submitted out of the months that were due, from each person\'s first submission.']
    ]) +
    '<div class="mt-space-md">' + rgTable(['Signal', 'Shows when', 'Suggested direction'], [
      tag('targets'),
      tag('capability'),
      tag('consistency'),
      tag('capacity', 'With Target calibration it asks to check the targets first.'),
      tag('stretch'),
      tag('discipline'),
      tag('behaviour', 'It needs at least ' + r.BEHAVIOUR_MIN + ' people with a score.'),
      tag('falling')
    ]) + '</div>' +
    '<p class="text-label-xs text-text-muted mt-space-sm">A department with fewer than ' + r.MIN_PEOPLE + ' people or fewer than ' + r.MIN_MONTHS + ' counted months shows Too early to read.</p>';
}

function adminGuideHtml() {
  var nav = [['ag-year', 'The fiscal year'], ['ag-month', 'Every month'], ['ag-health', 'KPI Health'], ['ag-departments', 'Departments'],
    ['ag-release', 'Evaluation and Release'], ['ag-access', 'Who can see what'], ['ag-fix', 'Common requests']];
  var yes = '<span class="material-symbols-outlined text-[18px] text-status-success" aria-label="Yes">check</span>';
  var no = '<span class="text-text-muted" aria-label="No">-</span>';
  return '<nav class="guide-nav no-print" aria-label="Admin guide sections"><span class="guide-nav-title">On this page</span>' +
      nav.map(function (n) { return '<button type="button" class="guide-nav-link" onclick="MGI.guideJump(\'' + n[0] + '\')">' + n[1] + '</button>'; }).join('') +
    '</nav>' +
    '<p class="text-body-sm text-text-muted mb-space-lg max-w-3xl">For Admin / HR only. The work of running the system through a fiscal year, in the order it happens. Rules on this page follow the live settings.</p>' +

    rgSection('ag-year', 'The fiscal year, step by step', agSteps([
      '<strong>Master KPIs.</strong> Add the KPIs of each role for the year. Weights of a role total exactly 100%, with at most 10 KPIs per role. Check that every role group is active.',
      '<strong>Mapping KPI.</strong> Give each employee their role group. An employee without a mapping has nothing to fill.',
      '<strong>System Settings > Submission Periods.</strong> Open the months and check the cut-off. The regular cut-off is day ' + CUTOFF_DAY + ' of the next month at 23:59.',
      '<strong>Every month.</strong> Follow the monthly routine below until December is closed.',
      '<strong>Performance Evaluation.</strong> Enter KBI, 360, Discipline, and SP for every scorecard, by hand or by upload. A Pending row still misses a score.',
      '<strong>Release.</strong> When no row is Pending, release the year so employees see their Performance Score and Grade.',
      '<strong>System Settings > Fiscal Year.</strong> Switch the active year once next year\'s Master KPIs and mappings are ready. Employees cannot open a year that is not active yet.'
    ])) +

    rgSection('ag-month', 'Every month', rgList([
      '<strong>Open the period</strong> in System Settings > Submission Periods, if it is not open yet.',
      '<strong>Send Reminder</strong> from Summary Report > Monthly before the cut-off. It emails everyone in view who still misses KPIs or the evidence file, once a day.',
      '<strong>Allow 1 more change</strong> from Summary Report > Monthly when someone already used their change and asks for another.',
      '<strong>After the cut-off,</strong> read the Dashboard and the Monthly view, and download the company report PDF if it is shared.',
      '<strong>Check KPI Health</strong> once a few months are in, and review the KPIs with the most Points lost first.'
    ])) +

    rgSection('ag-health', 'KPI Health', agHealthHtml()) +

    rgSection('ag-departments', 'Departments', agDepartmentsHtml()) +

    rgSection('ag-release', 'Performance Evaluation and Release', rgList([
      '<strong>Final score.</strong> Avg KPI comes from the monthly submissions; KBI, 360, and Discipline come from HR. The weights and grade lines are set per year in System Settings > Performance Scoring.',
      '<strong>Pending</strong> means the scorecard still misses KBI, 360, or Discipline. Compare shows it as Evaluation not complete.',
      '<strong>Release</strong> shows each employee their Performance Score, Grade, SP level, and Remarks SP in My KPIs. Inputs and rules are locked while released.',
      '<strong>To correct a released year,</strong> withdraw the release, edit, then release again.',
      '<strong>PDF reports</strong> carry a Draft mark until the year is released.'
    ])) +

    rgSection('ag-access', 'Who can see what',
      rgTable(['Page', 'Employee', 'Report Viewer', 'Admin'], [
        ['My KPIs', yes, yes, yes],
        ['Guide > Scoring', yes, yes, yes],
        ['Guide > Reviewer Guide', no, yes, yes],
        ['Guide > Admin', no, no, yes],
        ['Dashboard', no, yes, yes],
        ['Summary Report (Monthly, Annual, Compare, PDF)', no, yes, yes],
        ['Performance Evaluation', no, no, yes],
        ['Master KPIs and KPI Health', no, no, yes],
        ['Mapping KPI', no, no, yes],
        ['System Settings', no, no, yes]
      ]) +
      '<div class="mt-space-md">' + rgList([
        '<strong>Employees</strong> see only their own KPIs, and their grade only after Release.',
        '<strong>Report Viewers</strong> are read only. System Settings > Report Access gives them all divisions or one division; with one division they see only that division, with a banner.',
        '<strong>Admin Access</strong> is managed by the system owner only.',
        '<strong>On a phone,</strong> only My KPIs, Guide, and System Settings open. Other pages ask for a computer.'
      ]) + '</div>') +

    rgSection('ag-fix', 'Common requests', rgTable(['Request', 'What to do'], [
      ['Forgot password', 'Mapping KPI > Password requests: check the person, then Approve and send code. Confirm by WhatsApp or chat first when it is a personal email. You can still reset any account from its employee row.'],
      ['Change after submitting', 'Summary Report > Monthly, Allow 1 more change on that role, while the period is open.'],
      ['Missed the cut-off', 'Open the period again in Submission Periods with a new cut-off date, then close it after.'],
      ['A KPI is wrong', 'Master KPIs, edit it, or deactivate it. Submitted months keep their history.'],
      ['A new employee is missing', 'The employee list syncs from the HR database every day. Ask the system owner to run the sync for an urgent case.'],
      ['Someone sees an empty new year', 'The year is not active yet. Switch it in Fiscal Year when it is ready.']
    ]));
}
