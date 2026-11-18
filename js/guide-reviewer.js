'use strict';

function canReview() {
  return !!(S.user && (S.user.isAdmin || isReportViewer(S.user)));
}

function setGuideTab(tab) {
  S.guideTab = tab === 'reviewer' && canReview() ? 'reviewer' : 'everyone';
  syncGuideTabs();
}

function syncGuideTabs() {
  var reviewer = S.guideTab === 'reviewer' && canReview();
  if ($('guide-tabs')) $('guide-tabs').classList.toggle('hidden', !canReview());
  document.querySelectorAll('[data-guide-tab]').forEach(function (b) {
    var on = (b.dataset.guideTab === 'reviewer') === reviewer;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  if ($('guide-everyone')) $('guide-everyone').classList.toggle('hidden', reviewer);
  if ($('guide-reviewer')) {
    $('guide-reviewer').classList.toggle('hidden', !reviewer);
    if (reviewer) $('guide-reviewer').innerHTML = reviewerGuideHtml();
  }
}

function openReviewerGuide(section) {
  S.guideTab = 'reviewer';
  if (S.view === 'guide') syncGuideTabs();
  else go('guide');
  setTimeout(function () { guideJump(section); }, 60);
}

function rgSection(id, title, body) {
  return '<section id="' + id + '" class="scroll-mt-32 bg-surface-card rounded-xl shadow-level-1 border border-border-light p-space-lg mb-space-lg">' +
    '<h2 class="text-title-lg text-text-primary mb-space-sm">' + title + '</h2>' + body + '</section>';
}

function rgTable(head, rows) {
  return '<div class="table-scroll"><table class="data-table text-body-sm">' +
    '<thead><tr>' + head.map(function (h) { return '<th scope="col">' + h + '</th>'; }).join('') + '</tr></thead>' +
    '<tbody>' + rows.map(function (r) { return '<tr>' + r.map(function (c, n) { return '<td' + (n ? '' : ' class="font-semibold text-text-primary whitespace-nowrap"') + '>' + c + '</td>'; }).join('') + '</tr>'; }).join('') +
    '</tbody></table></div>';
}

function rgList(items) {
  return '<ul class="rg-list">' + items.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>';
}

function rgHealthHtml() {
  var live = !!S.kpiHealth;
  var r = kpiHealthRules(S.kpiHealth);
  var flag = function (key) { var f = HEALTH_FLAGS[key]; return '<span class="pill ' + f.pill + ' !text-[11px] whitespace-nowrap">' + esc(f.label) + '</span>'; };
  var rule = function (text, fallback) { return live ? text : fallback; };
  return '<p class="text-body-sm text-text-secondary mb-space-sm">Master KPIs > KPI Health checks whether each target is set at the right level, from every submission of the fiscal year. Trial months and the automatic 1.0 of off-cycle quarterly KPIs are not counted. Admin only.</p>' +
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

function reviewerGuideHtml() {
  var b = bandValues();
  var lv = CMP_FLAG_LEVELS;
  var pill = function (key) { return '<span class="pill ' + lv[key].pill + ' !text-[11px] whitespace-nowrap">' + lv[key].label + '</span>'; };
  var pills = function () { return '<span class="rg-pills">' + Array.prototype.slice.call(arguments).map(pill).join('') + '</span>'; };
  var nav = [['rg-compare', 'How Compare works'], ['rg-reading', 'Reading the numbers'], ['rg-peers', 'Standing among peers'],
    ['rg-history', 'Track record'], ['rg-flags', 'Before you decide'], ['rg-health', 'KPI Health'], ['rg-use', 'Promotion and efficiency']];
  return '<nav class="guide-nav no-print" aria-label="Reviewer guide sections"><span class="guide-nav-title">On this page</span>' +
      nav.map(function (n) { return '<button type="button" class="guide-nav-link" onclick="MGI.guideJump(\'' + n[0] + '\')">' + n[1] + '</button>'; }).join('') +
    '</nav>' +
    '<p class="text-body-sm text-text-muted mb-space-lg max-w-3xl">For Admin and Report Viewers. It explains the reports that compare people, so a decision rests on the same reading for everyone. Thresholds on this page follow the live settings.</p>' +

    rgSection('rg-compare', 'How Compare works', rgList([
      '<strong>Head-to-head.</strong> Every number that compares A and B uses only the months both submitted. A month only one of them submitted is listed as "Left out" and does not count, so one extra month cannot flip the result.',
      '<strong>Own months.</strong> Each person\'s average over their own submitted months is still shown as a note. It is the official figure behind the grade, so it can differ from the head-to-head number on purpose.',
      '<strong>Period.</strong> Full year, a quarter, or a custom range. Trial months never count. Performance Evaluation always covers the whole fiscal year.',
      '<strong>Same role or different roles.</strong> With the same role every analysis is available, including KPI Deep Dive. With different roles targets differ, so compare patterns and standing, not scores.'
    ])) +

    rgSection('rg-reading', 'Reading the numbers', rgTable(['Item', 'What it means', 'How it is calculated'], [
      ['Trend', 'Whether results are rising or falling.', 'Slope of a straight line through the monthly scores of the months both submitted, in points a month. Needs at least ' + CMP_MIN_MONTHS + ' months. Within ±' + CMP_FLAT_SLOPE + ' a month it reads as flat.'],
      ['Tier mix', 'How often KPIs land on each tier.', 'One block per KPI per month. Counts are not weighted. Off-cycle quarterly KPIs are left out.'],
      ['Where points are lost', 'Which KPIs cost the most points.', 'Weight × (1 − tier), averaged per month. Together they add up to 100 minus the average KPI score.'],
      ['Same tier, different realization', 'Two people on the same tier, one closer to the next tier.', 'Distance to the next tier in steps of the KPI multiplier and in KPI units. "Lowest tier" means tier 0.2; its bar shows how far the result is toward the 0.4 line.'],
      ['What the numbers say', 'One KPI in a few words for each person.', 'Average gap to the target, how much the result usually moves (the standard deviation of the monthly results, in KPI units), and the trend.'],
      ['Rating Bands', 'How an average reads.', 'Excellent from ' + bandNum(b.excellent) + ', Good from ' + bandNum(b.good) + ', Needs Attention below ' + bandNum(b.good) + '.']
    ])) +

    rgSection('rg-peers', 'Standing among peers', rgTable(['Term', 'Definition'], [
      ['Peer group', 'Everyone with a scorecard in the same role (Position and Department) in the same fiscal year.'],
      ['Score used', 'Each person\'s average monthly KPI score over the months they submitted in the chosen period, trial months left out. It cannot be head-to-head, because each peer submitted different months.'],
      ['Who is ranked', 'People with at least ' + CMP_MIN_MONTHS + ' scored months in the period. When the period has fewer counted months, every one of them must be scored.'],
      ['Rank', 'Position from the highest score. Equal scores share a rank (1, 2, 2, 4).'],
      ['Top 20%', 'Rank within the best ' + CMP_EDGE_PCT + '% of ranked people, rounded up.'],
      ['Bottom 20%', 'Rank within the lowest ' + CMP_EDGE_PCT + '% of ranked people, rounded up.'],
      ['Above / Below median', 'Everyone else, compared with the middle score of the ranked people.'],
      ['Too few peers', 'Fewer than ' + CMP_MIN_PEERS + ' ranked people. The rank is shown without a label, because a label on a small group is not fair.'],
      ['Privacy', 'The chart shows other people as dots only. Names are never shown.']
    ])) +

    rgSection('rg-history', 'Track record', rgTable(['Column', 'Definition'], [
      ['FY', 'The selected fiscal year and up to two years before it.'],
      ['Role', 'The home role of that year. An arrow icon marks a role that differs from the year before.'],
      ['Avg KPI (months)', 'Average monthly KPI score over the months submitted that year. The same figure feeds the Performance Evaluation.'],
      ['Standing', 'Rank in the same role over that whole year, with the rules above.'],
      ['Grade', 'Final Performance Evaluation grade. A dash means the year is not released or there is no scorecard. Pending means it is not complete.'],
      ['SP', 'Warning letter recorded in that year\'s Performance Evaluation.'],
      ['Outside your report access', 'That year the role sat in a Division you cannot see.']
    ])) +

    rgSection('rg-flags', 'Before you decide',
      '<p class="text-body-sm text-text-secondary mb-space-sm">The panel under the Summary lists what could change or weaken a decision. Its verdict reads <strong>Not ready for a decision</strong> when any High flag exists, <strong>Ready, read the notes</strong> when only Watch or Info flags exist, and <strong>No red flags</strong> otherwise. When the same flag fits both people, it shows once with both tags. Info notes stay folded under the list.</p>' +
      rgTable(['Severity', 'Meaning'], [[pill('high'), esc(lv.high.text)], [pill('watch'), esc(lv.watch.text)], [pill('info'), esc(lv.info.text)]]) +
      '<div class="mt-space-md">' + rgTable(['Flag', 'Severity', 'Rule'], [
        ['Too little data', pill('high'), 'Fewer than ' + CMP_MIN_MONTHS + ' scored months in the period.'],
        ['Missed submissions', pills('high', 'watch'), 'High from ' + CMP_MISS_N + ' missed months or ' + CMP_MISS_PCT + '% of due months, Watch for fewer. A due month has passed and is not a trial month; the current month never counts as missed. When both missed the same months, it shows once.'],
        ['Few shared months', pill('watch'), 'Fewer than ' + CMP_MIN_MONTHS + ' months submitted by both.'],
        ['Evaluation not complete', pill('high'), 'A Performance Evaluation scorecard is missing KBI, 360, or Discipline, or there is no scorecard.'],
        ['SP on record', pills('high', 'watch'), 'High for the selected year, Watch for an earlier year.'],
        ['Slipping trend', pill('watch'), 'Trend of ' + CMP_SLIP + ' point a month or lower.'],
        ['Bottom 20% of peers', pill('watch'), 'See Standing among peers.'],
        ['Gap from Unrealistic KPIs', pill('watch'), 'Points lost on KPIs flagged Unrealistic in KPI Health make up ' + CMP_KPI_SHARE + '% or more of all points the person loses. When the same KPIs do this for both people in one role, it shows once as a note about the role\'s targets.'],
        ['Score lifted by Easy KPIs', pill('watch'), 'Points earned on KPIs flagged Easy in KPI Health make up ' + CMP_KPI_SHARE + '% or more of the person\'s score. When the same KPIs do this for both people in one role, it shows once as a note about the role\'s targets.'],
        ['Evidence coverage', pills('watch', 'info'), 'Watch when evidence is required and fewer than ' + CMP_EVIDENCE_PCT + '% of scored months have a file. Info in years where evidence is optional.'],
        ['No longer holds the role', pill('info'), 'The scorecard belongs to a role the person has left.'],
        ['Different roles', pill('info'), 'A and B hold different roles.']
      ]) + '</div>' +
      '<p class="flex flex-wrap items-center gap-2 text-label-xs text-text-muted mt-space-sm">Unrealistic and Easy follow the KPI Health definitions of that year in System Settings.' +
        '<button type="button" class="cmp-guide-link no-print" onclick="MGI.guideJump(\'rg-health\')">See KPI Health</button></p>') +

    rgSection('rg-health', 'KPI Health', rgHealthHtml()) +

    rgSection('rg-use', 'Using Compare for promotion and for efficiency',
      '<div class="grid grid-cols-1 lg:grid-cols-2 gap-space-md">' +
        '<div class="rounded-xl border border-border-light p-space-md"><h3 class="text-title-md text-text-primary mb-2">Promotion</h3>' + rgList([
          'Read Before you decide first. Decide only when it shows no High flag.',
          'Look at standing among peers, not only A against B. Two strong people can both sit in the middle of their role.',
          'Use the track record. One strong year can be luck; two or three are a pattern.',
          'Weigh KBI and 360 in the Performance Evaluation. KPIs measure results, not leadership.',
          'Check for scores lifted by Easy KPIs.'
        ]) + '</div>' +
        '<div class="rounded-xl border border-border-light p-space-md"><h3 class="text-title-md text-text-primary mb-2">Efficiency</h3>' + rgList([
          'Read Before you decide first. Missing data and incomplete evaluations make a decision hard to defend.',
          'Check gaps from Unrealistic KPIs. A low score may come from the target, not the person.',
          'Look for a pattern across years, not one weak period.',
          'Check SP history and documented coaching. The numbers are one piece of evidence, not the whole process.',
          'Write down the reasons, so the decision can be explained later.'
        ]) + '</div>' +
      '</div>');
}
