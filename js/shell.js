'use strict';

function guideJump(id) {
  var el = $(id);
  if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function guideOptionalNote(years, active) {
  var list = (years || []).filter(function (y) { return y === active || y === active - 1; });
  if (!list.length) return '';
  if (list.indexOf(active) !== -1) return '. Optional in FY' + active;
  return '. Optional for FY' + list[0] + ' months';
}

function initGuide() {
  if ($('guide-maxkpi')) $('guide-maxkpi').textContent = S.user.maxKpi || 10;
  if ($('guide-evidence')) {
    $('guide-evidence').textContent = (S.user.allowedExt || []).map(function (e) { return e.toUpperCase(); }).join(', ') +
      ', up to ' + (S.user.maxFileMb || 5) + ' MB' +
      guideOptionalNote(S.user.evidenceOptionalYears, S.user.year);
  }
  renderGuideBands();
  if ($('gc-pick')) $('gc-pick').innerHTML = guideCalcPickHtml();
  renderGuideCalc();
  renderGuidePerformance();
  syncGuideTabs();
}

function renderGuideBands() {
  var host = $('guide-bands');
  if (!host) return;
  var b = bandValues();

  var card = function (key, icon, text, note) {
    return '<div class="rounded-xl border border-border-light bg-surface-page p-space-md flex items-start gap-space-sm">' +
      '<span class="w-9 h-9 rounded-lg bg-status-' + key + '-subtle text-status-' + key + '-text flex items-center justify-center shrink-0">' +
        '<span class="material-symbols-outlined text-[20px]">' + icon + '</span></span>' +
      '<div class="min-w-0"><p class="text-title-md text-text-primary">' + esc(text) + '</p>' +
        '<p class="text-body-sm text-text-muted">' + note + '</p></div>' +
    '</div>';
  };

  host.innerHTML =
    '<div class="mb-space-md">' + bandScaleHtml(b) + '</div>' +
    '<div class="grid grid-cols-1 md:grid-cols-3 gap-space-sm">' +
      card('danger', 'flag', bandRange('danger'), 'Below expectations and worth a closer look.') +
      card('info', 'thumb_up', bandRange('info'), 'Solid performance within the expected range.') +
      card('success', 'workspace_premium', bandRange('success'), 'Outstanding results. Keep it up.') +
    '</div>';
}

function guideCalcItems() {
  var out = [];
  ((S.dashboard && S.dashboard.roles) || []).forEach(function (r) {
    (r.items || []).forEach(function (it) { if (it.IsActive !== false) out.push(it); });
  });
  return out;
}

function guideCalcPickHtml() {
  var items = guideCalcItems();
  if (!items.length) return '';
  return '<label class="flex items-center gap-2 text-body-sm text-text-secondary"><span class="whitespace-nowrap">Use one of my KPIs</span>' +
    '<select id="gc-pick-select" class="field !py-1.5 max-w-[260px]" onchange="MGI.pickGuideKpi(this.value)">' +
      '<option value="">Pick a KPI</option>' +
      items.map(function (it) {
        return '<option value="' + attr(it.Mapping_ID) + '">' + esc((it.KPI_ID ? it.KPI_ID + ' ' : '') + (it.KPI_Name || '')) + '</option>';
      }).join('') +
    '</select></label>';
}

function pickGuideKpi(id) {
  var it = guideCalcItems().filter(function (x) { return x.Mapping_ID === id; })[0];
  if (!it) return;
  var val = function (x) { return x === null || x === undefined || x === '' || !isFinite(Number(x)) ? '' : Number(x); };
  $('gc-label').value = it.Label || 'Increase';
  $('gc-target').value = val(it.Target);
  $('gc-multiplier').value = val(it.Multiplier);
  $('gc-weight').value = val(it.WeightPercent);
  $('gc-real').value = val(it.Realization);
  $('gc-b').checked = it.Target_Is_B === true;
  renderGuideCalc();
}

function renderGuideCalc() {
  var host = $('gc-result');
  if (!host) return;
  var label = $('gc-label').value;
  var target = parseFloat($('gc-target').value);
  var mult = parseFloat($('gc-multiplier').value);
  var weight = parseFloat($('gc-weight').value);
  var real = parseFloat($('gc-real').value);
  var strict = !!$('gc-b').checked;
  var binary = label === 'Binary';
  if ($('gc-multiplier-wrap')) $('gc-multiplier-wrap').classList.toggle('opacity-50', binary);

  if (!isNum(target) || !isNum(real) || (!binary && !isNum(mult))) {
    host.innerHTML =
      '<div class="rounded-xl border border-dashed border-border-medium bg-surface-page p-space-lg h-full flex flex-col items-center justify-center text-center gap-2">' +
        '<span class="material-symbols-outlined text-[32px] text-text-muted">calculate</span>' +
        '<p class="text-body-sm text-text-secondary">Fill in Target, Tier step, and Realization to see the result.</p>' +
      '</div>';
    return;
  }

  var step = isNum(mult) ? mult : 0;
  var score = calcScore(real, target, label, step, strict);
  var w = isNum(weight) && weight > 0 ? weight : null;
  var pts = w === null ? null : Math.round(w * score * 100) / 100;
  var ladder = tierLadder({ Label: label, Target: target, Multiplier: step, Target_Is_B: strict });

  host.innerHTML =
    '<div class="rounded-xl border border-border-light bg-surface-page p-space-md h-full flex flex-col gap-space-sm">' +
      '<div class="flex items-center gap-space-md">' +
        '<span class="inline-flex items-center justify-center w-16 h-16 shrink-0 rounded-2xl text-2xl font-bold tabular-nums ' + tierClass(score) + '">' + score.toFixed(1) + '</span>' +
        '<div class="min-w-0">' +
          '<p class="text-body-md text-text-primary">' + (pts === null
            ? 'Tier score <strong>' + score.toFixed(1) + '</strong>. Add a weight to see the points.'
            : 'This KPI adds <strong>' + esc(num(pts, 2)) + '</strong> of ' + esc(num(w, 2)) + ' points to your role index.') + '</p>' +
          '<p class="text-body-sm text-text-muted">Realization ' + esc(num(real, 2)) + ' against target ' + esc(targetLabel({ Label: label, Target: target, Target_Is_B: strict })) +
            (binary ? '' : ', tier step ' + esc(num(step, 2))) + '.</p>' +
        '</div>' +
      '</div>' +
      (pts === null ? '' :
        '<div class="h-2 w-full rounded-full bg-white ring-1 ring-border-light overflow-hidden" aria-hidden="true">' +
          '<div class="h-full rounded-full ' + tierClass(score) + '" style="width:' + Math.round(score * 100) + '%"></div></div>') +
      '<div>' +
        '<p class="text-label-xs uppercase tracking-wider text-text-muted mb-1">Where each tier starts</p>' +
        '<div class="grid gap-1 ' + (ladder.length > 2 ? 'grid-cols-5' : 'grid-cols-2') + '">' +
          ladder.map(function (st) {
            var hit = Math.abs(st.score - score) < 1e-9;
            return '<div class="rounded-md px-1.5 py-1 min-w-0 ' + tierClass(st.score) + (hit ? ' ring-2 ring-slate-700' : ' opacity-60') + '"' +
              (hit ? ' aria-current="true"' : '') + ' title="' + esc('Tier ' + st.score.toFixed(1) + ' when realization is ' + st.rule) + '">' +
              '<p class="text-[11px] font-bold tabular-nums">' + st.score.toFixed(1) + (w === null ? '' : ' • ' + num(w * st.score, 2) + ' pts') + '</p>' +
              '<p class="text-[11px] font-semibold tabular-nums truncate">' + esc(st.rule) + '</p>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +
    '</div>';
}

function cutoffCountdown(iso, now) {
  var end = iso ? new Date(iso).getTime() : NaN;
  if (isNaN(end)) return null;
  var hours = (end - now) / 3600000;
  if (hours <= 0) return null;
  if (hours < 24) {
    var h = Math.ceil(hours);
    return { tone: 'danger', icon: 'alarm', label: 'Closes in ' + h + (h === 1 ? ' hour' : ' hours') };
  }
  var days = Math.ceil(hours / 24);
  if (days <= 3) return { tone: 'warning', icon: 'hourglass_bottom', label: 'Closes in ' + days + (days === 1 ? ' day' : ' days') };
  return { tone: 'neutral', icon: 'event_available', label: days + ' days left' };
}

function roleStepsHtml(ready, declared, open) {
  var filled = ready.required - ready.missing.length;
  var step = function (done, title, detail) {
    var icon = !open ? 'lock' : done ? 'check_circle' : 'radio_button_unchecked';
    return '<span class="inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ' +
        (open && done ? 'border-emerald-200 bg-emerald-50' : 'border-border-light bg-white') + '">' +
      '<span class="material-symbols-outlined text-[18px] ' + (open && done ? 'text-status-success' : 'text-text-muted') + '">' + icon + '</span>' +
      '<span class="flex flex-col leading-tight">' +
        '<span class="text-label-sm font-semibold ' + (open && done ? 'text-status-success-text' : 'text-text-primary') + '">' + title + '</span>' +
        '<span class="text-[11px] text-text-muted">' + detail + '</span>' +
      '</span></span>';
  };
  var arrow = '<span class="material-symbols-outlined text-[18px] text-text-muted hidden sm:inline">chevron_right</span>';

  return step(!ready.missing.length, 'Realization',
           ready.required ? filled + ' of ' + ready.required + ' monthly KPIs' : 'No monthly KPI due') + arrow +
         step(ready.hasEvidence || ready.evidenceOptional, 'Evidence',
           ready.hasEvidence ? 'File attached' : ready.evidenceOptional ? 'Optional in FY' + S.dashboard.year : 'Attach 1 file') + arrow +
         step(declared, 'Declaration', declared ? 'Confirmed' : 'Tick the declaration');
}

function onDeclareChange(key) {
  renderRoleSubmit(key);
}

function navGroup(title, links) {
  var wrap = document.createElement('div');
  var head = document.createElement('div');
  head.className = 'nav-group-title px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500';
  head.textContent = title;
  wrap.appendChild(head);

  var list = document.createElement('div');
  list.className = 'flex flex-col gap-1';
  links.forEach(function (l) {
    var a = document.createElement('button');
    a.type = 'button';
    a.className = 'nav-link';
    a.dataset.view = l.id;
    a.title = l.label;
    a.innerHTML = '<span class="material-symbols-outlined text-[20px]">' + l.icon + '</span>' +
                  '<span class="nav-label">' + esc(l.label) + '</span>';
    a.dataset.phone = PHONE_VIEWS[l.id] ? 'yes' : 'no';
    a.onclick = function () { go(l.id); };
    list.appendChild(a);
  });
  wrap.dataset.phone = links.some(function (l) { return PHONE_VIEWS[l.id]; }) ? 'yes' : 'no';
  wrap.appendChild(list);
  return wrap;
}

function dayGreeting(date) {
  var h = (date || new Date()).getHours();
  if (h >= 4 && h < 12) return 'Good morning';
  if (h >= 12 && h < 18) return 'Good afternoon';
  return 'Good evening';
}

function displayName(full) {
  return String(full || '').trim().split(/\s+/).filter(Boolean).join(' ');
}

function heroNameHtml(full) {
  var name = displayName(full);
  var cut = name.lastIndexOf(' ');
  return esc(name.slice(0, cut + 1)) +
    '<span class="whitespace-nowrap">' + esc(name.slice(cut + 1)) +
      '<span class="material-symbols-outlined hero-heart" title="Thank you for your work" aria-hidden="true">favorite</span></span>';
}

function initials(name) {
  var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '??';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function skipToContent() {
  var main = $('app-main');
  if (main) main.focus();
}

function viewFromHash() {
  var m = /^#\/([a-z-]+)$/.exec((window.location && window.location.hash) || '');
  var view = m ? m[1] : '';
  return view && VIEW_TITLES[view] && $('view-' + view) ? view : '';
}

function syncHash(view, replace) {
  var want = '#/' + view;
  if (!window.location || window.location.hash === want) return;
  if ((replace || !viewFromHash()) && window.history && window.history.replaceState) window.history.replaceState(null, '', want);
  else window.location.hash = want;
}

function onHashChange() {
  if (!S.user) return;
  var view = viewFromHash();
  if (view && view !== S.view) go(view);
  else if (!view && S.view) syncHash(S.view, true);
}

function go(view) {
  if ((S.view === 'mapping' && isBasketDirty()) || (S.view === 'settings' && isCategoryDirty()) || (S.view === 'my-kpis' && myKpisDirty())) {
    if (S.view) syncHash(S.view, true);
    guardUnsaved(function () { go(view); });
    return;
  }

  S.view = view;
  var blocked = isPhone() && !PHONE_VIEWS[view];
  closeHelp(true);
  syncHelpFab();
  syncHash(view);
  ['dashboard', 'my-kpis', 'guide', 'master-kpis', 'mapping', 'summary', 'evaluation', 'settings'].forEach(function (v) {
    var el = $('view-' + v);
    if (el) el.classList.toggle('hidden', blocked || v !== view);
  });
  renderDesktopOnly(blocked ? view : '');
  renderPhoneBar();
  document.querySelectorAll('#sidebar-nav .nav-link').forEach(function (a) {
    a.classList.toggle('is-active', a.dataset.view === view);
    if (a.dataset.view === view) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  $('topbar-crumb').textContent = VIEW_TITLES[view] || '';
  toggleSidebar(false);
  window.scrollTo(0, 0);

  if (blocked) return;
  if (view === 'dashboard') initDashboard();
  if (view === 'my-kpis') initMyKpis();
  if (view === 'master-kpis') initMasterKpis();
  if (view === 'mapping') initMapping();
  if (view === 'summary') initSummary();
  if (view === 'evaluation') initEvaluation();
  if (view === 'settings') initSettings();
  if (view === 'guide') initGuide();
}

function isPhone() {
  return !!(window.matchMedia && window.matchMedia(PHONE_QUERY).matches);
}

function syncPhoneMode() {
  var phone = isPhone();
  var changed = S.phone !== phone;
  S.phone = phone;
  if (document.body) document.body.classList.toggle('is-phone', phone);
  if (changed && !phone) toggleSettingsPicker(false);
  if (changed && S.view === 'settings' && S.settingsTab === 'fiscal' && S.fiscal) renderFiscalPanel();
  if (changed && S.user && S.view && !PHONE_VIEWS[S.view]) go(S.view);
  else renderPhoneBar();
}

function watchPhoneMode() {
  var mq = window.matchMedia ? window.matchMedia(PHONE_QUERY) : null;
  if (mq && mq.addEventListener) mq.addEventListener('change', syncPhoneMode);
  else if (mq && mq.addListener) mq.addListener(syncPhoneMode);
  syncPhoneMode();
}

function renderDesktopOnly(view) {
  var host = $('view-desktop-only');
  if (!host) return;
  host.classList.toggle('hidden', !view);
  var body = $('desktop-only-body');
  if (!view || !body) return;
  body.innerHTML = emptyState('chart',
    '<strong>' + esc(VIEW_TITLES[view] || 'This page') + '</strong> is made for a larger screen. Open it on a computer or tablet. ' +
    'On your phone you can fill in My KPIs, read the Guide' + (S.user && S.user.isAdmin ?', and manage System Settings.' : '.'),
    { fn: 'goMyKpis', icon: 'fact_check', label: 'Go to My KPIs' });
}

function goMyKpis() {
  go('my-kpis');
}

function toggleSidebar(force) {
  var desktop = window.matchMedia && window.matchMedia('(min-width: 1024px)').matches;
  if (force === undefined && desktop) {
    var collapsed = !document.body.classList.contains('sidebar-collapsed');
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    syncSidebarToggle(collapsed);
    try { localStorage.setItem('mgi.sidebarCollapsed', collapsed ? '1' : '0'); } catch (e) {}
    return;
  }
  var open = (force === undefined) ? !$('sidebar').classList.contains('is-open') : force;
  $('sidebar').classList.toggle('is-open', open);
  $('sidebar-scrim').classList.toggle('is-open', open);
}

function restoreSidebar() {
  var collapsed = false;
  try { collapsed = localStorage.getItem('mgi.sidebarCollapsed') === '1'; } catch (e) {}
  document.body.classList.toggle('sidebar-collapsed', collapsed);
  syncSidebarToggle(collapsed);
}

function syncSidebarToggle(collapsed) {
  var btn = $('sidebar-toggle');
  if (!btn) return;
  var label = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
  btn.title = label;
  btn.setAttribute('aria-label', label);
  btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
}
