var MGI = (function () {
  'use strict';

  var S = {
    user:        null,
    view:        null,
    token:       '',
    pwForced:    false,
    pwNik:       '',
    loading:     0,
    loadTimer:   null,
    accountWired: false,

    dashboard:   null,
    pendingFiles: {},
    empCollapsed: {},
    empHistoryOpen: false,
    empMonth:    null,
    monthStates: null,
    periodPickWired: false,
    justSubmitted: '',

    employees:   [],
    overview:    null,
    mapTab:      'unassigned',
    bulk:        null,
    mapping:     null,
    assigned:    [],
    available:   [],
    catalogue:   [],
    collapsed:   {},
    editingKpi:  null,
    batchSeq:    0,
    pendingProceed: null,
    history:     [],
    historyOpen: false,
    switcherWired: false,
    catOpen:     {},
    catQuery:    '',
    catAuto:     false,
    categories:  null,
    catDraft:    null,

    summary:     null,
    sumFilter:   'all',
    sumPage:     1,
    PAGE_SIZE:   25,
    periods:     [],
    periodBusy:  {},
    searchTimer: null,
    sumView:     'monthly',
    sumYear:     null,
    sumJump:     null,
    sumPick:     null,
    sumSort:     null,
    annSort:     null,
    evalSort:    null,
    reminderNiks: [],
    allowChange: null,
    submitConfirm: null,
    help:        { open: false, topic: '', note: '', roleKey: '' },
    helpWired:   false,
    helpScrollWired: false,
    dashJumps:   [],
    annual:      null,
    annPage:     1,
    ANN_PAGE_SIZE: 25,
    settingsTab: 'periods',
    settingsLoaded: {},
    inflight:    {},
    prefetch:    {},
    bands:       null,
    bandData:    null,
    bandDraft:   null,
    adminAccess: null,
    adminQuery:  '',
    adminChange: null,
    empView:     'monthly',
    masterList:  [],
    masterMeta:  null,
    masterOpen:  {},
    masterBusy:  {},
    mkView:      'library',
    kpiHealth:   null,
    kpiHealthYear: null,
    healthSort:  null,
    upload:      null,
    scripts:     {},
    reports:     {},
    report:      null,
    reportTab:   'matrix',
    deepOpen:    {},
    dash:        null,
    dashYear:    null,
    dashGroup:   null,
    charts:      {},
    chartTheme:  false,
    evaluation:  null,
    evalYear:    null,
    evalPage:    1,
    EVAL_PAGE_SIZE: 25,
    evalTimer:   null,
    evalEdit:    null,
    evalUpload:  null,
    evalUploadOpen: null,
    perfSettings: null,
    perfYear:    null,
    perfDraft:   null,
    perfRules:   null,
    pdfBusy:     false,
    reportAccess: null,
    access:      null,
    themes:      null,
    themeYear:   null,
    mapYear:     null,
    periodYear:  null,
    periodConfirm: null,
    fiscal:      null,
    fiscalSwitch: null,
    masterYearPick: null,
    pinFrame:    0
  };

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

  var VIEW_TITLES = {
    'dashboard':   'Dashboard',
    'my-kpis':     'My KPIs',
    'master-kpis': 'Master KPIs',
    'mapping':     'Mapping KPI',
    'summary':     'Summary Report',
    'evaluation':  'Performance Evaluation',
    'settings':    'System Settings',
    'guide':       'Scoring Guide'
  };

  var WORKSPACE_NAV = [
    { id: 'my-kpis', icon: 'fact_check', label: 'My KPIs' },
    { id: 'guide',   icon: 'menu_book',  label: 'Scoring Guide' }
  ];

  var CATEGORY_META = [
    { key: 'Division',   icon: 'account_tree', hint: 'Top-level group' },
    { key: 'Department', icon: 'apartment',    hint: 'Unit within a division' },
    { key: 'Position',   icon: 'badge',        hint: 'Job title that owns KPIs' }
  ];

  var LABEL_OPTIONS = ['Increase', 'Decrease', 'Binary'];
  var DURATION_OPTIONS = ['Monthly', 'Quarterly'];

  var LONG_REALIZATION = 13;

  var SLOW_SUBMIT_MS = 8000;

  var PERF_COMPONENTS = [
    { key: 'kpi',        label: 'Avg KPI',    field: '',                 hint: 'Automatic, from monthly KPI submissions' },
    { key: 'kbi',        label: 'KBI',        field: 'KBI_Score',        hint: 'Entered by Admin / HR' },
    { key: 's360',       label: '360',        field: 'Score_360',        hint: 'Entered by Admin / HR' },
    { key: 'discipline', label: 'Discipline', field: 'Discipline_Score', hint: 'Entered by Admin / HR' }
  ];

  var GRADES = ['A', 'B', 'C', 'D', 'E'];

  var LABEL_META = {
    Increase: { short: 'Higher is better',  icon: 'trending_up',   text: 'text-emerald-700', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    Decrease: { short: 'Lower is better',   icon: 'trending_down', text: 'text-sky-700',     tone: 'bg-sky-50 text-sky-700 border-sky-200' },
    Binary:   { short: 'Must match target', icon: 'task_alt',      text: 'text-violet-700',  tone: 'bg-violet-50 text-violet-700 border-violet-200' }
  };

  var HEALTH_FLAGS = {
    hard:    { label: 'Unrealistic',     pill: 'pill-danger',  text: 'text-status-danger',  icon: 'trending_down',   order: 0, caption: 'Most results land at tier 0.2' },
    easy:    { label: 'Too easy',        pill: 'pill-warning', text: 'text-status-warning', icon: 'trending_up',     order: 1, caption: 'Most results land at tier 1.0' },
    healthy: { label: 'Healthy',         pill: 'pill-success', text: 'text-status-success', icon: 'check_circle',    order: 2, caption: 'Results spread across the tiers' },
    thin:    { label: 'Not enough data', pill: 'pill-neutral', text: 'text-text-muted',     icon: 'hourglass_empty', order: 3, caption: 'Too few submissions to judge' }
  };

  var HEALTH_ORDER = ['hard', 'easy', 'healthy', 'thin'];

  var FLAG_COLORS = { best: '#10B981', weakest: '#EF4444', normal: '#94A3B8', hover: '#64748B' };

  var DD_INDEX_COLOR = '#4F46E5';

  var GRADE_TINTS = {
    A: 'border-emerald-200 bg-emerald-50/70',
    B: 'border-blue-200 bg-blue-50/70',
    C: 'border-amber-200 bg-amber-50/70',
    D: 'border-orange-200 bg-orange-50/70',
    E: 'border-red-200 bg-red-50/70'
  };

  var GRADE_COLORS = { A: '#10B981', B: '#3B82F6', C: '#F59E0B', D: '#F97316', E: '#EF4444' };

  var BAND_META = {
    success: { label: 'Excellent',       icon: 'workspace_premium', hex: '#10B981' },
    info:    { label: 'Good',            icon: 'thumb_up',          hex: '#3B82F6' },
    danger:  { label: 'Needs Attention', icon: 'flag',              hex: '#EF4444' }
  };

  var FISCAL_STATES = {
    ok:   { icon: 'check_circle', tone: 'text-status-success' },
    warn: { icon: 'error',        tone: 'text-status-warning' },
    todo: { icon: 'cancel',       tone: 'text-status-danger' },
    info: { icon: 'info',         tone: 'text-text-muted' }
  };


  var WA_PATH = 'M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.2 8.2 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.32a8.19 8.19 0 0 1-1.26-4.38c.01-4.54 3.7-8.24 8.25-8.24zM8.53 7.33c-.16 0-.43.06-.66.31-.22.25-.87.86-.87 2.07 0 1.22.89 2.39 1 2.56.14.17 1.76 2.67 4.25 3.73.59.27 1.05.42 1.41.53.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.16-.48-.27-.25-.14-1.47-.74-1.69-.82-.23-.08-.37-.12-.56.12-.16.25-.64.81-.78.97-.15.17-.29.19-.53.07-.26-.13-1.06-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.12-.24-.01-.39.11-.5.11-.11.27-.29.37-.44.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.11-.56-1.35-.77-1.84-.2-.48-.4-.42-.56-.43-.14 0-.3-.01-.47-.01z';

  var HELP_VIEWS = { 'my-kpis': true, 'guide': true };

  var HELP_TOPICS = [
    { key: 'question', icon: 'help',      label: 'Ask a question',      field: 'Your question',    hint: 'e.g. How is the Achievement % calculated?',                need: 'Write your question first.' },
    { key: 'bug',      icon: 'report',    label: 'Report a problem',    field: 'What went wrong?', hint: 'e.g. My target looks wrong, or the upload stops halfway.', need: 'Describe the problem first.' },
    { key: 'change',   icon: 'lock_open', label: 'Need another change', field: 'Anything to add?', hint: 'e.g. I need to fix the value of one KPI.',                  need: '' }
  ];

  var HELP_NOTE_MIN = 5;

  var HELP_NOTE_MAX = 600;

  var HELP_CHAT_ID = {
    months: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
    hello: 'Halo {name}! ^_^',
    who: 'Nama: {who} (NIK {nik})',
    role: 'Jabatan: {role}',
    place: 'Halaman: {place}',
    thanks: 'Makasih ya!',
    general: 'Ada yang mau aku tanyain nih :)',
    changeFor: 'Jatah ubah aku buat {role} di {month} udah habis nih. Boleh minta 1 kesempatan lagi? ^^',
    topics: {
      question: ['Pertanyaan', ''],
      bug: ['Laporan masalah', ''],
      change: ['Minta tambahan perubahan', 'Aku butuh kesempatan ubah lagi atau periodenya dibuka ulang. Boleh dibantu? ^^']
    }
  };


  var MONTH_STATES = {
    done:       { label: 'Submitted',     icon: 'check_circle',           pill: 'pill-success', dot: 'bg-status-success' },
    progress:   { label: 'In progress',   icon: 'pending',                pill: 'pill-info',    dot: 'bg-status-info' },
    todo:       { label: 'To do',         icon: 'radio_button_unchecked', pill: 'pill-warning', dot: 'bg-status-warning' },
    incomplete: { label: 'Incomplete',    icon: 'error',                  pill: 'pill-danger',  dot: 'bg-status-danger' },
    missed:     { label: 'Not submitted', icon: 'cancel',                 pill: 'pill-danger',  dot: 'bg-status-danger' },
    locked:     { label: 'Not open yet',  icon: 'lock',                   pill: 'pill-neutral', dot: 'bg-slate-300' },
    none:       { label: 'No KPIs due',   icon: 'remove',                 pill: 'pill-neutral', dot: 'bg-slate-300' }
  };

  var MONTH_DUE = { done: true, progress: true, todo: true, incomplete: true, missed: true };

  var HERO_HEADS = {
    todo:   { icon: 'schedule',   tone: 'text-slate-500' },
    done:   { icon: 'task_alt',   tone: 'text-status-success' },
    locked: { icon: 'lock',       tone: 'text-slate-400' },
    closed: { icon: 'event_busy', tone: 'text-slate-400' },
    none:   { icon: 'inbox',      tone: 'text-slate-400' }
  };

  var PIN_TABLES = [
    { key: 'sum',  bar: 'sum-filter-bar' },
    { key: 'ann',  bar: 'sum-filter-bar' },
    { key: 'eval', bar: 'eval-filter-bar' },
    { key: 'mkh',  bar: 'mkh-filter-bar' }
  ];

  var SP_OPTIONS = ['', 'SP1', 'SP2', 'SP3'];

  var REMARKS_MAX = 500;

  var EVAL_COLS = 9;

  var EVAL_TEMPLATE_HEADERS = ['Year', 'NIK', 'Full Name', 'Position', 'Department', 'Avg KPI', 'KBI Score', '360 Score', 'Discipline Score', 'SP Level', 'Remarks SP'];
  var EVAL_UPLOAD_HEADERS = ['Year', 'NIK', 'Position', 'Department', 'KBI Score', '360 Score', 'Discipline Score', 'SP Level', 'Remarks SP'];
  var EVAL_UPLOAD_KEYS = ['Year', 'NIK', 'Position', 'Department', 'KBI_Score', 'Score_360', 'Discipline_Score', 'SP_Level', 'Remarks_SP'];

  var UPLOAD_HEADERS = ['Year', 'Division', 'Department', 'Position', 'KPI Name', 'Metrics', 'Target', 'Unit', 'Weight', 'Label', 'Duration', 'Multiplier', 'Target_is_B'];
  var UPLOAD_KEYS = ['Year', 'Division', 'Department', 'Position', 'KPI_Name', 'Metrics', 'Target', 'Unit', 'Weight', 'Label', 'Duration', 'Multiplier', 'Target_Is_B'];

  var TOKEN_KEY = 'mgi_kpi_session';

  var AUTH_LOST = /Please sign in to continue|session has expired/;

  var BUSY_LOCK = /system is busy/i;

  var TRANSIENT = /too many simultaneous|invoked too many times in a short time|timed out|server error occurred|service error|backend error|internal error|networkerror|connection failure/i;

  var DAILY_QUOTA = /for one day/i;

  var BUSY_RETRIES = 2;

  var READ_RETRIES = 3;

  var RETRY_BASE_MS = 1500;

  var PREFETCH_TTL_MS = 60000;

  var READ_FNS = {
    bootstrap: 1, getCurrentUser: 1, getDashboardData: 1, getEmployeeDashboardData: 1, getPerformanceReport: 1,
    getAdminSummary: 1, getAnnualRecap: 1, getPeriodSettings: 1, getMasterCatalog: 1, getMappingOverview: 1,
    getMappingForEmployee: 1, getCategories: 1, getRatingBands: 1, getAdminAccess: 1, getPerformanceEvaluation: 1,
    getPerformanceSettings: 1, getPerformanceRules: 1, getReportAccess: 1, getYearThemes: 1, getFiscalYear: 1,
    getKpiHealth: 1
  };

  var AUTH_SCREENS = ['app-loading', 'app-denied', 'app-login', 'app-password', 'app-shell'];

  function trackLoad(delta) {
    S.loading = Math.max(0, (S.loading || 0) + delta);
    var bar = $('app-progress');
    if (!bar) return;
    clearTimeout(S.loadTimer);
    if (!S.loading) {
      bar.classList.remove('is-active');
      return;
    }
    S.loadTimer = setTimeout(function () {
      if (S.loading) bar.classList.add('is-active');
    }, 200);
  }

  function api(fn) {
    var args = Array.prototype.slice.call(arguments, 1);
    if (!READ_FNS[fn]) {
      return apiCall(fn, args, 0).then(function (res) {
        S.prefetch = {};
        return res;
      });
    }
    var key = fn + '|' + JSON.stringify(args);
    var ready = takePrefetch(key);
    if (ready) return Promise.resolve(ready.data);
    if (S.inflight[key]) return S.inflight[key];
    var call = apiCall(fn, args, 0);
    S.inflight[key] = call;
    var settle = function () { if (S.inflight[key] === call) delete S.inflight[key]; };
    call.then(settle, settle);
    return call;
  }

  function takePrefetch(key) {
    var hit = S.prefetch[key];
    if (!hit) return null;
    delete S.prefetch[key];
    return Date.now() - hit.at <= PREFETCH_TTL_MS ? hit : null;
  }

  function seedPrefetch(list) {
    S.prefetch = {};
    (list || []).forEach(function (p) {
      if (p && p.fn && READ_FNS[p.fn]) S.prefetch[p.fn + '|' + JSON.stringify(p.args || [])] = { data: p.data, at: Date.now() };
    });
  }

  function retryLimit(fn, message) {
    if (BUSY_LOCK.test(message)) return BUSY_RETRIES;
    if (READ_FNS[fn] && TRANSIENT.test(message) && !DAILY_QUOTA.test(message)) return READ_RETRIES;
    return 0;
  }

  function retryDelay(attempt) {
    return Math.round(RETRY_BASE_MS * Math.pow(2, attempt) * (0.5 + Math.random()));
  }

  function apiCall(fn, args, attempt) {
    trackLoad(1);
    return new Promise(function (resolve, reject) {
      gasRpc(S.token || '', fn, args, !!READ_FNS[fn])
        .then(function (res) {
          trackLoad(-1);
          resolve(res);
        }, function (err) {
          trackLoad(-1);
          var message = (err && err.message) ? err.message : String(err);
          if (fn !== 'login' && AUTH_LOST.test(message)) sessionLost(message);

          if (attempt < retryLimit(fn, message)) {
            if (!attempt && BUSY_LOCK.test(message)) toast('Everyone is saving at once. Retrying your request.', 'warning');
            setTimeout(function () {
              apiCall(fn, args, attempt + 1).then(resolve, reject);
            }, retryDelay(attempt));
            return;
          }

          reject(new Error(message));
        });
    });
  }

  function loadToken() {
    try {
      return window.localStorage.getItem(TOKEN_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function saveToken(token) {
    S.token = token || '';
    S.prefetch = {};
    try {
      if (S.token) window.localStorage.setItem(TOKEN_KEY, S.token);
      else window.localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      return;
    }
  }

  function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function $(id) { return document.getElementById(id); }

  function attr(v) {
    return String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function groupDigits(text) {
    var s = String(text);
    var neg = s.charAt(0) === '-';
    var body = neg ? s.slice(1) : s;
    var dot = body.indexOf('.');
    var whole = dot === -1 ? body : body.slice(0, dot);
    if (!/^\d+$/.test(whole)) return s;
    return (neg ? '-' : '') + whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (dot === -1 ? '' : body.slice(dot));
  }

  function num(v, dp) {
    if (v === null || v === undefined || v === '') return '-';
    var n = Number(v);
    if (isNaN(n)) return '-';
    return groupDigits(String(parseFloat(n.toFixed(dp === undefined ? 1 : dp))));
  }

  function parseNumText(text) {
    if (typeof text === 'number') return isFinite(text) ? text : NaN;
    var s = String(text === null || text === undefined ? '' : text).replace(/[\s,]/g, '');
    if (s === '' || s === '-' || s === '.' || s === '-.') return null;
    if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
    return parseFloat(s);
  }

  function cleanNumText(text, pasted) {
    var raw = String(text === null || text === undefined ? '' : text);
    var neg = /^\s*-/.test(raw);
    var s = raw.replace(/[^\d.,]/g, '');
    var dots = (s.match(/\./g) || []).length;
    var commas = (s.match(/,/g) || []).length;

    if (pasted) {
      if (dots > 1 || (dots === 1 && commas === 1 && s.lastIndexOf(',') > s.lastIndexOf('.'))) {
        s = s.replace(/\./g, '').replace(',', '.');
      } else if (commas === 1 && !dots && /,\d{1,2}$/.test(s)) {
        s = s.replace(',', '.');
      } else {
        s = s.replace(/,/g, '');
      }
    } else {
      s = s.replace(/,/g, '');
      if (dots > 1) s = s.replace(/\./g, '');
    }

    var dot = s.indexOf('.');
    var whole = (dot === -1 ? s : s.slice(0, dot)).replace(/^0+(?=\d)/, '');
    var frac = dot === -1 ? null : s.slice(dot + 1).replace(/\./g, '');
    if (frac !== null && whole === '') whole = '0';
    return { neg: neg, whole: whole, frac: frac };
  }

  function formatNumText(text, pasted) {
    var c = cleanNumText(text, pasted);
    if (!c.whole && c.frac === null) return c.neg ? '-' : '';
    return (c.neg ? '-' : '') + groupDigits(c.whole) + (c.frac === null ? '' : '.' + c.frac);
  }

  function formatNumValue(v) {
    if (v === null || v === undefined || v === '' || !isFinite(Number(v))) return '';
    var fixed = String(parseFloat(Number(v).toFixed(6)));
    return /e/i.test(fixed) ? fixed : groupDigits(fixed);
  }

  function compactNum(v) {
    try {
      return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'long', maximumFractionDigits: 2 }).format(v);
    } catch (e) {
      return num(v, 0);
    }
  }

  function liveFormatInput(input, ev) {
    var value = String(input.value || '');
    var caret = typeof input.selectionStart === 'number' ? input.selectionStart : value.length;
    var pasted = !!(ev && ev.inputType === 'insertFromPaste');

    if (ev && ev.inputType === 'insertText' && ev.data === ',' && value.charAt(caret - 1) === ',') {
      var hasDot = value.indexOf('.') > -1;
      value = value.slice(0, caret - 1) + (hasDot ? '' : '.') + value.slice(caret);
      if (hasDot) caret--;
    }

    var dropDots = !pasted && (value.match(/\./g) || []).length > 1;
    var significant = function (ch) { return /\d/.test(ch) || (ch === '.' && !dropDots); };
    var before = 0;
    for (var i = 0; i < caret && i < value.length; i++) {
      if (significant(value.charAt(i))) before++;
    }

    var next = formatNumText(value, pasted);
    if (next === input.value) return next;
    input.value = next;

    var pos = pasted ? next.length : 0;
    if (!pasted) {
      var seen = 0;
      while (pos < next.length && seen < before) {
        if (/[\d.]/.test(next.charAt(pos))) seen++;
        pos++;
      }
      if (!before && next.charAt(0) === '-') pos = 1;
    }
    if (input.setSelectionRange && document.activeElement === input) {
      try { input.setSelectionRange(pos, pos); } catch (e) {}
    }
    return next;
  }

  function pct(v, dp) {
    if (v === null || v === undefined || v === '') return '-';
    return num(v, dp) + '%';
  }

  function isNum(v) {
    return typeof v === 'number' && isFinite(v);
  }

  function bandValues() {
    return S.bands && isNum(S.bands.good) && isNum(S.bands.excellent) ? S.bands : { good: 75, excellent: 90 };
  }

  function bandNum(v) {
    return String(Math.round(Number(v) * 10) / 10);
  }

  function bandRange(key) {
    var b = bandValues();
    if (key === 'success') return 'Excellent (≥ ' + bandNum(b.excellent) + ')';
    if (key === 'info') return 'Good (' + bandNum(b.good) + ' to ' + bandNum(b.excellent - 0.1) + ')';
    return 'Needs Attention (< ' + bandNum(b.good) + ')';
  }

  function syncBands(bands) {
    if (bands && isNum(bands.good) && isNum(bands.excellent)) {
      S.bands = { good: bands.good, excellent: bands.excellent };
      if (S.user) S.user.bands = S.bands;
    }
    renderBandLegends();
  }

  function renderBandLegends() {
    var html = ['success', 'info', 'danger'].map(function (key) {
      return '<span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-status-' + key + '"></span> ' + esc(bandRange(key)) + '</span>';
    }).join('');
    ['sum-band-legend', 'ann-band-legend'].forEach(function (id) {
      var el = $(id);
      if (el) el.innerHTML = html;
    });
  }

  function band(index) {
    var b = bandValues();
    if (index >= b.excellent) return { key: 'success', label: 'Excellent' };
    if (index >= b.good)      return { key: 'info',    label: 'Good' };
    return { key: 'danger', label: 'Needs Attention' };
  }

  function fmtDate(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    return d.getDate() + ' ' + MONTHS[d.getMonth()].substring(0, 3) + ' ' + d.getFullYear();
  }

  function toast(message, type) {
    var host = $('toast-host');
    var el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'info');
    var icon = type === 'success' ? 'check_circle'
             : type === 'error'   ? 'error'
             : type === 'warning' ? 'warning' : 'info';
    el.innerHTML =
      '<span class="material-symbols-outlined text-[20px]">' + icon + '</span>' +
      '<span class="flex-1">' + esc(message) + '</span>' +
      '<button type="button" data-toast-close class="shrink-0 -mr-1 -mt-0.5 p-0.5 rounded-md opacity-70 transition-all duration-150 hover:opacity-100 hover:bg-white/15"' +
        ' aria-label="Dismiss notification" title="Dismiss"><span class="material-symbols-outlined text-[18px]">close</span></button>';
    var dismiss = function () {
      if (el.dataset.gone) return;
      el.dataset.gone = '1';
      el.classList.add('is-out');
      setTimeout(function () { el.remove(); }, 200);
    };
    el.onclick = function (ev) {
      var target = ev && ev.target;
      if (target && target.closest && target.closest('[data-toast-close]')) dismiss();
    };
    host.appendChild(el);
    setTimeout(dismiss, type === 'error' ? 7000 : 4000);
  }

  function busy(btn, label) {
    var original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> ' + esc(label || 'Processing');
    return function restore() {
      btn.disabled = false;
      btn.innerHTML = original;
    };
  }

  function skeletonRows(cols, rows) {
    var out = '';
    for (var r = 0; r < (rows || 4); r++) {
      out += '<tr>';
      for (var c = 0; c < cols; c++) out += '<td><div class="skeleton h-4 w-full"></div></td>';
      out += '</tr>';
    }
    return out;
  }

  function calcScore(realization, target, label, multiplier, targetIsB) {
    if (label === 'Binary') return (realization === target) ? 1.0 : 0.2;

    if (label === 'Increase') {
      if (targetIsB === true) {
        if (realization > target) return 1.0;
        if (realization >= target) return 0.8;
        if (realization >= target - multiplier) return 0.6;
        if (realization >= target - 2 * multiplier) return 0.4;
        return 0.2;
      }
      if (realization >= target) return 1.0;
      if (realization >= target - multiplier) return 0.8;
      if (realization >= target - 2 * multiplier) return 0.6;
      if (realization >= target - 3 * multiplier) return 0.4;
      return 0.2;
    }

    if (label === 'Decrease') {
      if (targetIsB === true) {
        if (realization < target) return 1.0;
        if (realization <= target) return 0.8;
        if (realization <= target + multiplier) return 0.6;
        if (realization <= target + 2 * multiplier) return 0.4;
        return 0.2;
      }
      if (realization <= target) return 1.0;
      if (realization <= target + multiplier) return 0.8;
      if (realization <= target + 2 * multiplier) return 0.6;
      if (realization <= target + 3 * multiplier) return 0.4;
      return 0.2;
    }
    return 0;
  }

  function calcAchievement(realization, item) {
    var t = Number(item.Target);
    var r = Number(realization);
    if (item.Label === 'Decrease') {
      if (r === 0) return t === 0 ? 100 : null;
      return (t / r) * 100;
    }
    if (t === 0) return r === 0 ? 100 : null;
    return (r / t) * 100;
  }

  function targetPrefix(item) {
    return item.Label === 'Decrease' ? '≤ ' : item.Label === 'Increase' ? '≥ ' : '= ';
  }

  function targetLabel(item) {
    return targetPrefix(item) + num(item.Target, 2);
  }

  function targetShort(item) {
    var t = Number(item.Target);
    return isNum(t) && Math.abs(t) >= 1000000 ? targetPrefix(item) + compactShort(t) : '';
  }

  function targetCell(item) {
    var full = esc(targetLabel(item));
    var short = targetShort(item);
    var base = 'text-code-num font-bold text-text-primary truncate';
    return short
      ? '<span class="block md:hidden 2xl:block ' + base + '">' + full + '</span>' +
        '<span class="hidden md:block 2xl:hidden ' + base + '">' + esc(short) + '</span>'
      : '<span class="block ' + base + '">' + full + '</span>';
  }

  function maxRealization() {
    var cfg = S.dashboard && S.dashboard.config;
    return cfg && isNum(cfg.maxRealization) ? cfg.maxRealization : 1e15;
  }

  function tooLarge(value) {
    return isNum(value) && Math.abs(value) > maxRealization();
  }

  function realizationClass(value) {
    return String(value || '').length > LONG_REALIZATION ? ' is-long' : '';
  }

  function labelMeta(label) {
    return LABEL_META[label] || LABEL_META.Increase;
  }

  function targetHint(item) {
    var meta = labelMeta(item.Label);
    var target = num(item.Target, 2) + (item.Unit ? ' ' + item.Unit : '');
    var rule = item.Label === 'Decrease' ? 'at most ' + target
             : item.Label === 'Binary' ? 'exactly ' + target
             : 'at least ' + target;
    return meta.short + ': ' + rule + (item.Target_Is_B ? '. Strict target: 1.0 only when the target is beaten.' : '.');
  }

  function tierLadder(k) {
    var t = Number(k.Target);
    var m = Number(k.Multiplier) || 0;
    var b = k.Target_Is_B === true;
    var f = function (v) { return num(v, 2); };
    if (k.Label === 'Binary') {
      return [
        { score: 1, rule: '= ' + f(t) },
        { score: 0.2, rule: 'any other value' }
      ];
    }
    if (k.Label === 'Decrease') {
      return b ? [
        { score: 1, rule: '< ' + f(t) },
        { score: 0.8, rule: '= ' + f(t) },
        { score: 0.6, rule: '≤ ' + f(t + m) },
        { score: 0.4, rule: '≤ ' + f(t + 2 * m) },
        { score: 0.2, rule: '> ' + f(t + 2 * m) }
      ] : [
        { score: 1, rule: '≤ ' + f(t) },
        { score: 0.8, rule: '≤ ' + f(t + m) },
        { score: 0.6, rule: '≤ ' + f(t + 2 * m) },
        { score: 0.4, rule: '≤ ' + f(t + 3 * m) },
        { score: 0.2, rule: '> ' + f(t + 3 * m) }
      ];
    }
    return b ? [
      { score: 1, rule: '> ' + f(t) },
      { score: 0.8, rule: '= ' + f(t) },
      { score: 0.6, rule: '≥ ' + f(t - m) },
      { score: 0.4, rule: '≥ ' + f(t - 2 * m) },
      { score: 0.2, rule: '< ' + f(t - 2 * m) }
    ] : [
      { score: 1, rule: '≥ ' + f(t) },
      { score: 0.8, rule: '≥ ' + f(t - m) },
      { score: 0.6, rule: '≥ ' + f(t - 2 * m) },
      { score: 0.4, rule: '≥ ' + f(t - 3 * m) },
      { score: 0.2, rule: '< ' + f(t - 3 * m) }
    ];
  }

  function tierChip(score) {
    return '<span class="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ' + tierClass(score) + '">' +
      Number(score).toFixed(1) + '</span>';
  }

  function onNumberWheel(e) {
    var t = e && e.target;
    if (!t || t.tagName !== 'INPUT' || t.type !== 'number') return;
    if (document.activeElement !== t) return;
    e.preventDefault();
    t.blur();
  }

  function boot() {
    restorePageSizes();
    wirePinnedHeads();
    document.addEventListener('wheel', onNumberWheel, { passive: false });
    document.querySelectorAll('[data-mgi-logo]').forEach(function (img) {
      img.src = MGI_LOGO_B64;
    });

    S.token = loadToken();
    resolveSession();
  }

  function showScreen(id) {
    AUTH_SCREENS.forEach(function (name) {
      $(name).classList.toggle('hidden', name !== id);
    });
    if (id !== 'app-shell') document.body.classList.remove('has-help');
  }

  function resolveSession() {
    var hadToken = !!S.token;
    return api('bootstrap')
      .then(function (res) {
        var user = res && res.user;
        seedPrefetch(res && res.prefetch);
        if (user && user.authorized) {
          enterApp(user);
        } else if (user && user.mustChange) {
          openPasswordScreen(true, user);
        } else if (user && user.needsLogin) {
          saveToken('');
          showLogin(hadToken ? user.reason : '');
        } else {
          showDenied((user && user.reason) || 'Access could not be verified.', (user && user.email) || 'not detected');
        }
      })
      .catch(function (err) {
        showDenied(err.message, 'not detected');
      });
  }

  function enterApp(user) {
    var first = !S.user;
    S.user = user;
    S.bands = user.bands || null;
    document.title = 'MGI KPIs Management System' + (user.year ? ' ' + user.year : '');
    renderBandLegends();
    if (first) applyRole(user);
    showScreen('app-shell');
    renderHelpFab();
  }

  function showDenied(reason, email) {
    $('denied-reason').textContent = reason;
    $('denied-email').textContent = email;
    showScreen('app-denied');
  }

  function sessionLost(message) {
    if (S.user && S.user.authVia === 'google') return;
    saveToken('');
    showLogin(message.replace(/^Access denied:\s*/, ''));
  }

  function showLogin(message) {
    var locked = !!(S.user && S.user.authVia === 'password');
    $('login-id').readOnly = locked;
    if (locked) $('login-id').value = S.user.NIK;
    $('login-switch').classList.toggle('hidden', !locked);
    $('login-secret').value = '';
    loginError(message || '');
    showScreen('app-login');
    setTimeout(function () {
      var field = locked ? $('login-secret') : $('login-id');
      if (field && field.focus) field.focus();
    }, 60);
  }

  function loginError(message) {
    $('login-error').textContent = message;
    $('login-error').classList.toggle('hidden', !message);
  }

  function submitLogin() {
    var id = $('login-id').value.trim();
    var secret = $('login-secret').value;
    if (!id || !secret) {
      loginError('Enter your NIK or email and your password.');
      return;
    }

    var btn = $('login-submit');
    var restore = busy(btn, 'Signing in');
    api('login', id, secret)
      .then(function (res) {
        saveToken(res.token);
        loginError('');
        btn.innerHTML = '<span class="spinner"></span> Opening your workspace';
        var done = function () {
          restore();
          $('login-secret').value = '';
        };
        return resolveSession().then(done, done);
      })
      .catch(function (err) {
        restore();
        loginError(err.message);
      });
  }

  function setPasswordShown(field, btn, show) {
    field.type = show ? 'text' : 'password';
    if (!btn) return;
    btn.title = show ? 'Hide password' : 'Show password';
    btn.setAttribute('aria-label', btn.title);
    btn.innerHTML = '<span class="material-symbols-outlined text-[20px]">' + (show ? 'visibility_off' : 'visibility') + '</span>';
  }

  function togglePasswordField(id, btn) {
    var field = $(id);
    setPasswordShown(field, btn, field.type === 'password');
  }

  function onCapsCheck(ev, id) {
    var note = $(id);
    if (!note || !ev || !ev.getModifierState) return;
    note.classList.toggle('hidden', !ev.getModifierState('CapsLock'));
  }

  function openPasswordScreen(forced, user) {
    S.pwForced = forced === true;
    var who = S.pwForced ? user : S.user;
    S.pwNik = (who && who.NIK) || '';

    $('password-title').textContent = S.pwForced ? 'Set your own password' : 'Change password';
    $('password-note').textContent = S.pwForced
      ? 'Welcome' + (who && who.Full_Name ? ', ' + who.Full_Name : '') +
        '. Your login code works only once, so choose the password you will use from now on.'
      : 'Enter your current password, then choose a new one. Other devices will be signed out.';
    $('password-current-wrap').classList.toggle('hidden', S.pwForced);
    $('password-cancel').classList.toggle('hidden', S.pwForced);
    ['password-current', 'password-new', 'password-confirm'].forEach(function (id) {
      $(id).value = '';
      setPasswordShown($(id), $(id + '-toggle'), false);
    });
    passwordError('');
    onPasswordInput();

    if (S.pwForced) showScreen('app-password');
    else $('app-password').classList.remove('hidden');
  }

  function closePasswordScreen() {
    $('app-password').classList.add('hidden');
  }

  function passwordError(message) {
    $('password-error').textContent = message;
    $('password-error').classList.toggle('hidden', !message);
  }

  function passwordChecks(pw, confirm) {
    return [
      [pw.length >= 8, 'At least 8 characters'],
      [/[A-Za-z]/.test(pw) && /[0-9]/.test(pw), 'Contains letters and numbers'],
      [!!pw && pw !== String(S.pwNik || ''), 'Different from your NIK'],
      [!!pw && pw === confirm, 'Both entries match']
    ];
  }

  function onPasswordInput() {
    var checks = passwordChecks($('password-new').value, $('password-confirm').value);
    $('password-rules').innerHTML = checks.map(function (c) {
      return '<li class="flex items-center gap-2 ' + (c[0] ? 'text-status-success-text' : 'text-text-muted') + '">' +
        '<span class="material-symbols-outlined text-[16px]">' + (c[0] ? 'check_circle' : 'radio_button_unchecked') + '</span>' +
        c[1] + '</li>';
    }).join('');
    $('password-submit').disabled = !checks.every(function (c) { return c[0]; }) ||
      (!S.pwForced && !$('password-current').value);
  }

  function submitPassword() {
    if ($('password-submit').disabled) return;
    var restore = busy($('password-submit'), 'Saving');

    api('changePassword', $('password-new').value, S.pwForced ? '' : $('password-current').value)
      .then(function (res) {
        restore();
        saveToken(res.token);
        if (S.pwForced) {
          resolveSession();
          return;
        }
        closePasswordScreen();
        toast(res.message, 'success');
      })
      .catch(function (err) {
        restore();
        onPasswordInput();
        passwordError(err.message);
      });
  }

  function signOut() {
    var url = S.user && S.user.appUrl;
    saveToken('');
    if (url) {
      window.open(url, '_top');
      return;
    }
    showLogin('You have been signed out.');
  }

  function isReportViewer(user) {
    var u = user || S.user;
    return !!u && !u.isAdmin && u.reportScope !== null && u.reportScope !== undefined;
  }

  function userRoleLabel(user) {
    if (user.isAdmin) return 'Admin';
    return isReportViewer(user) ? 'Report Viewer' : (user.Role || 'Employee');
  }

  function renderScopeBanner(id, scope) {
    var host = $(id);
    if (!host) return;
    host.innerHTML = scope
      ? '<div class="rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-2.5 text-body-sm text-blue-800 flex items-center gap-2">' +
          '<span class="material-symbols-outlined text-[18px]">filter_alt</span>' +
          '<span>Showing <strong>' + esc(scope) + '</strong> division only. Your report access is limited to this division.</span></div>'
      : '';
  }

  function themeBannerHtml(year, theme) {
    if (!theme) return '';
    return '<div class="theme-banner">' +
      '<span class="theme-banner-icon"><span class="material-symbols-outlined text-[20px]">flag</span></span>' +
      '<div class="min-w-0">' +
        '<p class="theme-banner-label">FY' + esc(year) + ' Theme</p>' +
        '<p class="theme-banner-text">' + esc(theme) + '</p>' +
      '</div>' +
    '</div>';
  }

  function renderThemeSlot(id, year, theme) {
    var host = $(id);
    if (host) host.innerHTML = themeBannerHtml(year, theme);
  }

  function loadReportAccess() {
    if (!$('access-control')) return;
    if (!S.reportAccess) $('access-control').innerHTML = '<div class="skeleton h-56 w-full"></div>';
    api('getReportAccess')
      .then(function (data) {
        S.reportAccess = data;
        renderReportAccess();
      })
      .catch(function (err) {
        $('access-control').innerHTML = '<p class="text-body-md text-status-danger-text text-center">' + esc(err.message) + '</p>';
        toast(err.message, 'error');
      });
  }

  function accessState() {
    if (!S.access) S.access = { q: '', division: '', department: '', position: '', scope: '', scopeTouched: false, picked: {}, viewerQ: '' };
    return S.access;
  }

  function scopeOptions(selected) {
    var d = S.reportAccess;
    return '<option value=""' + (!selected ? ' selected' : '') + '>All divisions</option>' + (d ? d.divisions : []).map(function (div) {
      return '<option value="' + esc(div) + '"' + (div === selected ? ' selected' : '') + '>' + esc(div) + ' only</option>';
    }).join('');
  }

  function accessMatches(u, a, skip) {
    if (skip !== 'division' && a.division && u.Division !== a.division) return false;
    if (skip !== 'department' && a.department && u.Department !== a.department) return false;
    if (skip !== 'position' && a.position && u.Position !== a.position) return false;
    if (skip !== 'q' && a.q) {
      var q = a.q.trim().toLowerCase();
      if ((u.Full_Name + ' ' + u.NIK).toLowerCase().indexOf(q) === -1) return false;
    }
    return true;
  }

  function accessCandidates() {
    var a = accessState();
    return (S.reportAccess ? S.reportAccess.candidates : []).filter(function (u) { return accessMatches(u, a); });
  }

  function accessFacet(field, skip) {
    var a = accessState();
    var seen = {};
    (S.reportAccess ? S.reportAccess.candidates : []).forEach(function (u) {
      if (!accessMatches(u, a, skip) || !u[field]) return;
      seen[u[field]] = true;
    });
    return Object.keys(seen).sort();
  }

  function accessSelect(id, label, field, key) {
    var a = accessState();
    var list = accessFacet(field, key);
    if (a[key] && list.indexOf(a[key]) === -1) list.unshift(a[key]);
    return '<div class="min-w-0"><label class="form-label" for="' + id + '">' + label + '</label>' +
      '<select id="' + id + '" class="field" onchange="MGI.onAccessFilter(\'' + key + '\', this.value)">' +
        '<option value="">All ' + label.toLowerCase() + 's</option>' +
        list.map(function (v) { return '<option value="' + esc(v) + '"' + (v === a[key] ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join('') +
      '</select></div>';
  }

  function renderReportAccess() {
    var d = S.reportAccess;
    if (!d || !$('access-control')) return;
    var a = accessState();
    var wide = d.viewers.filter(function (u) { return !u.scope; }).length;

    $('access-control').innerHTML =
      '<div class="flex flex-col gap-space-lg">' +
        '<div class="flex flex-col lg:flex-row lg:items-end justify-between gap-space-sm">' +
          '<div class="min-w-0">' +
            '<h2 class="text-title-lg text-text-primary">Report Access</h2>' +
            '<p class="text-body-sm text-text-muted max-w-4xl">Give selected employees read-only access to the Dashboard and Summary Report, for every division or one division. ' +
              'They can open each employee report and export CSV, see Performance Scores and SP only after release, and never change any data.</p>' +
          '</div>' +
          '<div class="flex flex-wrap items-center gap-1.5 shrink-0">' +
            '<span class="pill pill-neutral !text-[11px]">' + d.viewers.length + (d.viewers.length === 1 ? ' viewer' : ' viewers') + '</span>' +
            '<span class="pill pill-info !text-[11px]">Every division: ' + wide + '</span>' +
            '<span class="pill pill-neutral !text-[11px]">One division: ' + (d.viewers.length - wide) + '</span>' +
          '</div>' +
        '</div>' +

        '<section class="rounded-xl border border-border-light overflow-hidden">' +
          '<div class="px-space-md py-space-sm bg-surface-page border-b border-border-light flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">' +
            '<h3 class="text-title-md text-text-primary">Report viewers</h3>' +
            '<div class="relative sm:w-72">' +
              '<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px] pointer-events-none">search</span>' +
              '<input type="search" class="field !pl-10 !py-1.5" placeholder="Search viewers" value="' + esc(a.viewerQ) + '" oninput="MGI.onViewerSearch(this.value)">' +
            '</div>' +
          '</div>' +
          '<div id="access-viewers" class="table-scroll"></div>' +
        '</section>' +

        '<section class="rounded-xl border border-border-light overflow-hidden">' +
          '<div class="px-space-md py-space-sm bg-surface-page border-b border-border-light flex items-center justify-between gap-space-sm">' +
            '<h3 class="text-title-md text-text-primary">Grant access</h3>' +
            '<span class="pill pill-neutral !text-[11px]">' + d.candidates.length + ' eligible</span>' +
          '</div>' +
          '<div id="access-filters" class="px-space-md py-space-sm border-b border-border-light"></div>' +
          '<div id="access-actions" class="px-space-md py-2.5 border-b border-border-light bg-white flex flex-wrap items-center gap-x-space-md gap-y-2"></div>' +
          '<div id="access-candidates" class="access-list"></div>' +
          '<p id="access-count" class="px-space-md py-2 text-label-xs text-text-muted bg-surface-page border-t border-border-light"></p>' +
        '</section>' +
      '</div>';

    renderAccessViewers();
    renderAccessFilters();
    renderAccessCandidates();
  }

  function renderAccessViewers() {
    var host = $('access-viewers');
    var d = S.reportAccess;
    if (!host || !d) return;
    var q = (accessState().viewerQ || '').trim().toLowerCase();
    var list = d.viewers.filter(function (u) {
      return !q || (u.Full_Name + ' ' + u.NIK + ' ' + (u.Position || '') + ' ' + (u.Department || '') + ' ' + (u.Division || '')).toLowerCase().indexOf(q) > -1;
    });
    if (!d.viewers.length) {
      host.innerHTML = '<p class="px-space-md py-space-lg text-center text-body-sm text-text-muted">Nobody outside Admin / HR can open the reports yet. Grant access below.</p>';
      return;
    }
    host.innerHTML =
      '<table class="data-table text-body-sm min-w-[640px]">' +
        '<thead><tr><th class="min-w-[240px]">Employee</th><th class="w-52">Access scope</th><th>Granted</th><th class="text-right">Action</th></tr></thead>' +
        '<tbody>' + (list.length ? list.map(function (u) {
          return '<tr>' +
            '<td><div class="flex items-center gap-space-sm min-w-0"><span class="emp-avatar">' + esc(u.Initials || initials(u.Full_Name)) + '</span>' +
              '<div class="flex flex-col min-w-0"><span class="font-semibold text-text-primary truncate">' + esc(u.Full_Name) + '</span>' +
              '<span class="text-label-xs text-text-secondary">' + esc([u.Position, u.Department].filter(Boolean).join(' / ') || '-') + '</span>' +
              '<span class="text-[11px] text-text-muted">' + esc(u.NIK) + (u.Division ? ' • ' + esc(u.Division) : '') + (u.Is_Active ? '' : ' • Inactive') + '</span></div></div></td>' +
            '<td><select class="field !py-1 !text-label-sm" aria-label="Report scope for ' + esc(u.Full_Name) + '"' +
              ' onchange="MGI.setViewerScope(\'' + esc(u.NIK) + '\', this.value)">' + scopeOptions(u.scope) + '</select></td>' +
            '<td class="text-label-xs text-text-muted"><span class="whitespace-nowrap">' + esc(fmtDate(u.grantedAt)) + '</span>' + (u.grantedBy ? '<span class="block">by ' + esc(u.grantedBy) + '</span>' : '') + '</td>' +
            '<td class="text-right"><button type="button" class="btn btn-secondary !py-1 !px-2.5 !text-label-sm" onclick="MGI.removeViewer(\'' + esc(u.NIK) + '\')">' +
              '<span class="material-symbols-outlined text-[16px]">person_remove</span> Remove</button></td>' +
          '</tr>';
        }).join('') : '<tr><td colspan="4" class="text-center text-text-muted py-space-lg">No viewer matches your search.</td></tr>') + '</tbody>' +
      '</table>';
  }

  function renderAccessFilters() {
    var host = $('access-filters');
    if (!host) return;
    var a = accessState();
    host.innerHTML =
      '<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))_auto] gap-space-sm items-end">' +
        '<div class="min-w-0"><label class="form-label" for="access-q">Search</label>' +
          '<div class="relative"><span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px] pointer-events-none">search</span>' +
          '<input id="access-q" type="search" class="field !pl-10" placeholder="Name or NIK" value="' + esc(a.q) + '" oninput="MGI.onAccessFilter(\'q\', this.value)"></div></div>' +
        accessSelect('access-division', 'Division', 'Division', 'division') +
        accessSelect('access-department', 'Department', 'Department', 'department') +
        accessSelect('access-position', 'Position', 'Position', 'position') +
        '<button type="button" class="btn btn-secondary" onclick="MGI.resetAccessFilters()" title="Clear every filter">' +
          '<span class="material-symbols-outlined text-[18px]">filter_alt_off</span> Reset</button>' +
      '</div>';
  }

  function renderAccessCandidates() {
    var host = $('access-candidates');
    var d = S.reportAccess;
    if (!host || !d) return;
    var a = accessState();
    var list = accessCandidates();
    var shownPicked = list.filter(function (u) { return a.picked[u.NIK]; }).length;
    var allPicked = list.length > 0 && shownPicked === list.length;
    var picked = Object.keys(a.picked).length;

    host.innerHTML = !d.candidates.length
      ? '<p class="px-space-md py-space-lg text-center text-body-sm text-text-muted">Every active employee already has report access.</p>'
      : !list.length
        ? '<p class="px-space-md py-space-lg text-center text-body-sm text-text-muted">No employees match these filters.</p>'
        : '<table class="data-table text-body-sm min-w-[760px]">' +
            '<thead><tr>' +
              '<th class="w-10"><input type="checkbox" class="rounded border-border-medium" aria-label="Select every employee shown"' + (allPicked ? ' checked' : '') +
                ' onchange="MGI.toggleAccessAll()"></th>' +
              '<th>Employee</th><th>Position</th><th>Department</th><th>Division</th>' +
            '</tr></thead>' +
            '<tbody>' + list.map(function (u) {
              var on = !!a.picked[u.NIK];
              return '<tr class="cursor-pointer' + (on ? ' access-picked' : '') + '" onclick="MGI.toggleAccessPick(\'' + esc(u.NIK) + '\')">' +
                '<td><input type="checkbox" class="rounded border-border-medium pointer-events-none" tabindex="-1" aria-label="Select ' + esc(u.Full_Name) + '"' + (on ? ' checked' : '') + '></td>' +
                '<td><div class="flex items-center gap-space-sm min-w-0"><span class="emp-avatar">' + esc(u.Initials || initials(u.Full_Name)) + '</span>' +
                  '<div class="flex flex-col min-w-0"><span class="font-semibold text-text-primary truncate">' + esc(u.Full_Name) + '</span>' +
                  '<span class="text-label-xs text-text-muted">' + esc(u.NIK) + '</span></div></div></td>' +
                '<td class="text-text-secondary">' + esc(u.Position || '-') + '</td>' +
                '<td class="text-text-secondary">' + esc(u.Department || '-') + '</td>' +
                '<td class="text-text-secondary">' + esc(u.Division || '-') + '</td>' +
              '</tr>';
            }).join('') + '</tbody>' +
          '</table>';

    $('access-count').textContent = 'Showing ' + list.length + ' of ' + d.candidates.length + ' eligible employees' +
      (picked ? ' • ' + picked + ' selected' + (picked > shownPicked ? ' (' + (picked - shownPicked) + ' outside these filters)' : '') : '');
    $('access-actions').innerHTML =
      '<span class="text-body-sm font-semibold text-text-primary">' + picked + ' selected</span>' +
      (picked ? '<button type="button" class="text-label-sm font-semibold text-primary-container hover:underline" onclick="MGI.clearAccessPicks()">Clear selection</button>' : '') +
      '<label class="ml-auto flex items-center gap-2 text-body-sm text-text-secondary">Access to' +
        '<select id="access-scope" class="field !w-auto !py-1.5 !text-label-sm" onchange="MGI.setAccessScope(this.value)">' + scopeOptions(a.scope) + '</select></label>' +
      '<button id="access-grant" type="button" class="btn btn-primary !py-1.5"' + (picked ? '' : ' disabled') + ' onclick="MGI.grantSelectedAccess()">' +
        '<span class="material-symbols-outlined text-[18px]">visibility</span> Grant access' + (picked ? ' (' + picked + ')' : '') + '</button>';
  }

  function onAccessFilter(key, value) {
    var a = accessState();
    a[key] = value || '';
    if (key === 'division') {
      a.department = '';
      a.position = '';
      if (!a.scopeTouched) a.scope = a.division;
    }
    if (key === 'department') a.position = '';
    if (key !== 'q') renderAccessFilters();
    renderAccessCandidates();
  }

  function resetAccessFilters() {
    var a = accessState();
    a.q = '';
    a.division = '';
    a.department = '';
    a.position = '';
    if (!a.scopeTouched) a.scope = '';
    renderAccessFilters();
    renderAccessCandidates();
  }

  function toggleAccessPick(nik) {
    var a = accessState();
    if (a.picked[nik]) delete a.picked[nik];
    else a.picked[nik] = true;
    renderAccessCandidates();
  }

  function toggleAccessAll() {
    var a = accessState();
    var list = accessCandidates();
    var all = list.length > 0 && list.every(function (u) { return a.picked[u.NIK]; });
    list.forEach(function (u) {
      if (all) delete a.picked[u.NIK];
      else a.picked[u.NIK] = true;
    });
    renderAccessCandidates();
  }

  function clearAccessPicks() {
    accessState().picked = {};
    renderAccessCandidates();
  }

  function setAccessScope(value) {
    var a = accessState();
    a.scope = value || '';
    a.scopeTouched = true;
  }

  function onViewerSearch(value) {
    accessState().viewerQ = value;
    renderAccessViewers();
  }

  function saveReportAccess(call, args) {
    return api.apply(null, [call].concat(args))
      .then(function (res) {
        toast(res.message, res.success === false ? 'warning' : 'success');
        loadReportAccess();
        return res;
      })
      .catch(function (err) {
        toast(err.message, 'error');
        loadReportAccess();
      });
  }

  function grantSelectedAccess() {
    var a = accessState();
    var niks = Object.keys(a.picked);
    if (!niks.length) return;
    var button = $('access-grant');
    if (button) button.disabled = true;
    return api('grantReportAccess', niks, a.scope || 'All')
      .then(function (res) {
        a.picked = {};
        toast(res.message, res.success === false || (res.skipped && res.skipped.length) ? 'warning' : 'success');
        loadReportAccess();
      })
      .catch(function (err) {
        if (button) button.disabled = false;
        toast(err.message, 'error');
      });
  }

  function setViewerScope(nik, scope) {
    return saveReportAccess('setReportAccess', [nik, scope || 'All']);
  }

  function removeViewer(nik) {
    return saveReportAccess('removeReportAccess', [nik]);
  }

  function loadFiscalYear() {
    if (!$('fiscal-control')) return;
    if (!S.fiscal) $('fiscal-control').innerHTML = '<div class="skeleton h-72 w-full"></div>';
    api('getFiscalYear')
      .then(function (data) {
        S.fiscal = data;
        renderFiscalPanel();
      })
      .catch(function (err) {
        $('fiscal-control').innerHTML = '<p class="text-body-md text-status-danger-text text-center">' + esc(err.message) + '</p>';
        toast(err.message, 'error');
      });
  }

  function fiscalChecks(d) {
    var n = d.next;
    var c = d.current;
    var y = n.year;
    var plural = function (count, one, many) { return num(count, 0) + ' ' + (count === 1 ? one : many); };
    var checks = [
      {
        state: !n.kpis ? 'todo' : n.readyGroups < n.roleGroups ? 'warn' : 'ok',
        title: 'Master KPIs',
        text: !n.kpis ? 'No active Master KPIs for FY' + y + ' yet.'
            : n.readyGroups < n.roleGroups
              ? plural(n.roleGroups - n.readyGroups, 'role group is', 'role groups are') + ' not at 100% yet (' + n.readyGroups + ' of ' + n.roleGroups + ' ready).'
              : plural(n.kpis, 'active KPI', 'active KPIs') + ' in ' + plural(n.roleGroups, 'role group', 'role groups') + ', all at 100%.',
        action: 'master', label: 'Master KPIs'
      },
      {
        state: !n.mappedEmployees ? 'todo' : n.mappedEmployees < n.activeEmployees ? 'warn' : 'ok',
        title: 'KPI mapping',
        text: !n.mappedEmployees ? 'No employee has FY' + y + ' KPIs yet.'
            : n.mappedEmployees < n.activeEmployees
              ? num(n.mappedEmployees, 0) + ' of ' + num(n.activeEmployees, 0) + ' active employees have FY' + y + ' KPIs.'
              : 'All ' + num(n.activeEmployees, 0) + ' active employees have FY' + y + ' KPIs.',
        action: 'mapping', label: 'Mapping'
      },
      {
        state: n.rulesSaved ? 'ok' : 'info',
        title: 'Performance Scoring rules',
        text: n.rulesSaved ? 'FY' + y + ' rules are saved.' : 'FY' + y + ' uses the default rules until you save its own.',
        action: 'performance', label: 'Performance Scoring'
      },
      {
        state: n.theme ? 'ok' : 'info',
        title: 'Yearly theme',
        text: n.theme ? '"' + n.theme + '"' : 'Optional. FY' + y + ' has no theme yet.',
        action: 'theme', label: 'Yearly Theme'
      },
      {
        state: 'info',
        title: 'Submission periods',
        text: n.periodsCreated >= 12
          ? 'The 12 months of FY' + y + ' are ready and stay locked until you open them.'
          : 'The 12 months of FY' + y + ' are created, all locked, when you switch.',
        action: '', label: ''
      }
    ];
    if (c.periodsOpen) {
      checks.push({
        state: 'info',
        title: 'FY' + c.year + ' months still open',
        text: plural(c.periodsOpen, 'month is', 'months are') + ' still open. After the switch you can keep managing FY' + c.year + ' in Submission Periods.',
        action: 'periods', label: 'Submission Periods'
      });
    }
    return checks;
  }

  function renderFiscalPanel() {
    var d = S.fiscal;
    var host = $('fiscal-control');
    if (!d || !host) return;
    var c = d.current;
    var n = d.next;
    var checks = fiscalChecks(d);
    var blocked = !n.kpis;
    var todo = checks.some(function (ch) { return ch.state === 'todo'; });
    var warn = checks.some(function (ch) { return ch.state === 'warn'; });
    var since = d.changedAt
      ? 'Active since ' + esc(fmtDate(d.changedAt)) + (d.changedBy ? ', set by ' + esc(d.changedBy) : '')
      : 'Active since setup';

    var fact = function (icon, label, value) {
      return '<div class="flex items-center gap-3 py-2.5">' +
        '<span class="w-9 h-9 rounded-lg bg-slate-50 ring-1 ring-slate-200/70 text-slate-600 flex items-center justify-center shrink-0">' +
          '<span class="material-symbols-outlined text-[20px]">' + icon + '</span></span>' +
        '<span class="min-w-0 flex-1 text-body-sm text-text-secondary">' + label + '</span>' +
        '<span class="text-body-sm font-semibold text-text-primary text-right">' + value + '</span>' +
      '</div>';
    };

    var checkRow = function (ch) {
      var st = FISCAL_STATES[ch.state];
      return '<div class="flex items-start gap-3 py-3">' +
        '<span class="material-symbols-outlined text-[22px] shrink-0 ' + st.tone + '">' + st.icon + '</span>' +
        '<div class="min-w-0 flex-1">' +
          '<p class="text-body-md font-semibold text-text-primary">' + esc(ch.title) + '</p>' +
          '<p class="text-body-sm text-text-muted">' + esc(ch.text) + '</p>' +
        '</div>' +
        (ch.action
          ? '<button type="button" class="btn btn-secondary !py-1 !px-2.5 !text-label-sm shrink-0" onclick="MGI.openFiscalTarget(\'' + ch.action + '\', ' +
              (ch.action === 'periods' ? c.year : n.year) + ')">' + esc(ch.label) + '</button>'
          : '') +
      '</div>';
    };

    host.innerHTML =
      '<div class="flex flex-col gap-space-lg">' +
        '<div class="flex flex-col md:flex-row md:items-start justify-between gap-space-md">' +
          '<div class="min-w-0">' +
            '<h2 class="text-title-lg text-text-primary">Fiscal Year</h2>' +
            '<p class="text-body-sm text-text-muted max-w-3xl">The active fiscal year decides which year employees submit in My KPIs, which months Submission Periods controls, ' +
              'and the year every page opens on. Prepare the next year at any time, then switch when it starts.</p>' +
          '</div>' +
          '<div class="flex flex-col items-start md:items-end gap-1 shrink-0">' +
            '<span class="pill pill-brand"><span class="material-symbols-outlined text-[14px]">event_available</span>FY' + d.activeYear + ' active</span>' +
            '<span class="text-label-xs text-text-muted">' + since + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="grid grid-cols-1 xl:grid-cols-2 gap-space-lg items-start">' +
          '<section class="rounded-xl border border-border-light overflow-hidden">' +
            '<div class="px-space-md py-space-sm bg-surface-page border-b border-border-light flex items-center justify-between gap-2">' +
              '<h3 class="text-title-md text-text-primary">FY' + c.year + ' now</h3>' +
              '<span class="pill pill-brand !text-[11px]">Active</span>' +
            '</div>' +
            '<div class="px-space-md divide-y divide-slate-100">' +
              fact('library_books', 'Active Master KPIs', num(c.kpis, 0) + ' in ' + num(c.roleGroups, 0) + (c.roleGroups === 1 ? ' role group' : ' role groups')) +
              fact('groups', 'Employees with KPIs', num(c.mappedEmployees, 0) + ' of ' + num(c.activeEmployees, 0)) +
              fact('event_available', 'Open months', num(c.periodsOpen, 0) + ' of 12') +
              fact('workspace_premium', 'Scoring rules', c.rulesSaved ? 'Saved' : 'Defaults') +
              fact('verified', 'Results', c.released ? 'Released to employees' : 'Not released yet') +
            '</div>' +
          '</section>' +
          '<section class="rounded-xl border border-border-light overflow-hidden">' +
            '<div class="px-space-md py-space-sm bg-surface-page border-b border-border-light flex items-center justify-between gap-2">' +
              '<h3 class="text-title-md text-text-primary">Ready for FY' + n.year + '?</h3>' +
              '<span class="pill ' + (todo ? 'pill-danger' : warn ? 'pill-warning' : 'pill-success') + ' !text-[11px]">' +
                (todo ? 'Not ready' : warn ? 'Almost ready' : 'Ready') + '</span>' +
            '</div>' +
            '<div class="px-space-md divide-y divide-slate-100">' + checks.map(checkRow).join('') + '</div>' +
            '<div class="px-space-md py-space-md border-t border-border-light bg-surface-page flex flex-col items-start gap-2">' +
              '<button id="fiscal-switch" type="button" class="btn btn-primary" onclick="MGI.openYearSwitch(' + n.year + ')"' + (blocked ? ' disabled' : '') + '>' +
                '<span class="material-symbols-outlined text-[18px]">event_repeat</span> Switch to FY' + n.year + '</button>' +
              '<p class="text-label-xs text-text-muted">' + (blocked
                ? 'Add active Master KPIs for FY' + n.year + ' first.'
                : 'Best time: right after the last FY' + c.year + ' month closes. FY' + c.year + ' data stays as it is, and its months can still be reopened.') + '</p>' +
            '</div>' +
          '</section>' +
        '</div>' +
        (d.canMoveBack
          ? '<p class="text-body-sm text-text-muted flex flex-wrap items-center gap-x-2 gap-y-1">Switched too early?' +
              '<button type="button" class="text-primary-container font-semibold rounded-md px-1.5 py-0.5 transition-all duration-150 hover:bg-brand-50" onclick="MGI.openYearSwitch(' +
                (d.activeYear - 1) + ')">Move back to FY' + (d.activeYear - 1) + '</button></p>'
          : '') +
      '</div>';
  }

  function openYearSwitch(year) {
    var d = S.fiscal;
    year = parseInt(year, 10);
    if (!d || !year) return;
    var forward = year > d.activeYear;
    var warnings = forward ? fiscalChecks(d).filter(function (ch) { return ch.state === 'warn' || ch.state === 'todo'; }) : [];
    var verb = forward ? 'Switch to FY' : 'Move back to FY';
    S.fiscalSwitch = year;

    $('modal-host').innerHTML =
      '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closeYearSwitch()">' +
        '<div class="modal-panel !max-w-lg">' +
          '<div class="px-6 pt-6 pb-5 flex items-start gap-4">' +
            '<span class="w-10 h-10 rounded-full bg-brand-50 text-primary-container flex items-center justify-center shrink-0">' +
              '<span class="material-symbols-outlined text-[22px]">event_repeat</span></span>' +
            '<div class="min-w-0">' +
              '<h2 class="text-title-lg text-text-primary">' + verb + year + '?</h2>' +
              '<p class="text-body-sm text-text-secondary mt-1">' + (forward
                ? 'My KPIs will open on FY' + year + ', Submission Periods will manage FY' + year + ' and FY' + d.activeYear +
                  ', and every report will open on FY' + year + '. FY' + d.activeYear + ' data is not changed.'
                : 'FY' + year + ' becomes the active year again. FY' + d.activeYear + ' mappings and data stay as they are.') + '</p>' +
              (warnings.length
                ? '<ul class="mt-3 flex flex-col gap-1.5">' + warnings.map(function (w) {
                    return '<li class="flex items-start gap-2 text-body-sm text-amber-800"><span class="material-symbols-outlined text-[18px]">warning</span>' +
                      '<span>' + esc(w.text) + '</span></li>';
                  }).join('') + '</ul>'
                : '') +
              '<p class="text-body-sm text-text-secondary mt-3">Everyone who has the app open should reload it afterwards.</p>' +
            '</div>' +
          '</div>' +
          '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex items-center justify-end gap-space-sm">' +
            '<button type="button" class="btn btn-secondary" onclick="MGI.closeYearSwitch()">Cancel</button>' +
            '<button id="year-confirm" type="button" class="btn btn-primary" onclick="MGI.confirmYearSwitch()">' + verb + year + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function closeYearSwitch() {
    S.fiscalSwitch = null;
    $('modal-host').innerHTML = '';
  }

  function confirmYearSwitch() {
    var year = S.fiscalSwitch;
    if (!year) return;
    var restore = busy($('year-confirm'), 'Switching');

    api('setActiveYear', year)
      .then(function (res) {
        S.fiscal = res;
        S.fiscalSwitch = null;
        renderFiscalPanel();
        if (!res.changed) {
          $('modal-host').innerHTML = '';
          toast(res.message, 'info');
          return;
        }
        $('modal-host').innerHTML =
          '<div class="modal-backdrop">' +
            '<div class="modal-panel !max-w-md">' +
              '<div class="px-6 pt-6 pb-5 flex items-start gap-4">' +
                '<span class="w-10 h-10 rounded-full bg-status-success-subtle text-status-success flex items-center justify-center shrink-0">' +
                  '<span class="material-symbols-outlined text-[22px]">check_circle</span></span>' +
                '<div class="min-w-0">' +
                  '<h2 class="text-title-lg text-text-primary">FY' + res.activeYear + ' is now active</h2>' +
                  '<p class="text-body-sm text-text-secondary mt-1">' + esc(res.message) + '</p>' +
                '</div>' +
              '</div>' +
              '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex items-center justify-end gap-space-sm">' +
                '<button type="button" class="btn btn-primary" onclick="MGI.reloadApp()">' +
                  '<span class="material-symbols-outlined text-[18px]">refresh</span> Reload app</button>' +
              '</div>' +
            '</div>' +
          '</div>';
      })
      .catch(function (err) {
        restore();
        toast(err.message, 'error');
      });
  }

  function reloadApp() {
    var url = S.user && S.user.appUrl;
    if (url) {
      window.open(url, '_top');
      return;
    }
    $('modal-host').innerHTML = '';
    toast('Reload this page in your browser to continue.', 'info');
  }

  function openFiscalTarget(target, year) {
    year = parseInt(year, 10);
    if (target === 'master') {
      S.masterYearPick = year;
      go('master-kpis');
      return;
    }
    if (target === 'mapping') {
      S.mapYear = year;
      go('mapping');
      return;
    }
    if (target === 'performance') {
      S.perfYear = year;
      S.perfDraft = null;
      setSettingsTab('performance');
      if (S.perfSettings) renderPerfPanel();
      return;
    }
    if (target === 'theme') {
      S.themeYear = year;
      setSettingsTab('theme');
      if (S.themes) renderThemePanel();
      return;
    }
    if (target === 'periods') {
      S.periodYear = year;
      S.periods = [];
      setSettingsTab('periods');
      loadPeriodSettings();
    }
  }

  function loadYearThemes() {
    if (!$('theme-control')) return;
    if (!S.themes) $('theme-control').innerHTML = '<div class="skeleton h-40 w-full"></div>';
    api('getYearThemes')
      .then(function (data) {
        S.themes = data;
        if (!S.themeYear) S.themeYear = data.activeYear;
        renderThemePanel();
      })
      .catch(function (err) {
        $('theme-control').innerHTML = '<p class="text-body-md text-status-danger-text text-center">' + esc(err.message) + '</p>';
        toast(err.message, 'error');
      });
  }

  function themeFor(year) {
    var hit = S.themes ? S.themes.themes.filter(function (t) { return t.year === Number(year); })[0] : null;
    return hit ? hit.theme : '';
  }

  function renderThemePanel() {
    var d = S.themes;
    if (!d || !$('theme-control')) return;
    var years = [d.activeYear - 1, d.activeYear, d.activeYear + 1];
    d.themes.forEach(function (t) { if (years.indexOf(t.year) === -1) years.push(t.year); });
    years.sort(function (a, b) { return b - a; });
    var current = themeFor(S.themeYear);

    var history = d.themes.length
      ? '<table class="data-table text-body-sm"><thead><tr><th class="w-24">Year</th><th>Theme</th><th class="w-56">Last updated</th></tr></thead><tbody>' +
          d.themes.map(function (t) {
            return '<tr><td class="font-semibold">FY' + t.year + (t.year === d.activeYear ? ' <span class="pill pill-brand !py-0 !text-[11px]">Active</span>' : '') + '</td>' +
              '<td class="text-text-primary">' + esc(t.theme) + '</td>' +
              '<td class="text-label-xs text-text-muted">' + esc(fmtDate(t.updatedAt)) + (t.updatedBy ? ' by ' + esc(t.updatedBy) : '') + '</td></tr>';
          }).join('') + '</tbody></table>'
      : '<p class="px-space-md py-space-lg text-center text-body-sm text-text-muted">No theme has been set yet.</p>';

    $('theme-control').innerHTML =
      '<div class="flex flex-col gap-space-lg">' +
        '<div>' +
          '<h2 class="text-title-lg text-text-primary">Yearly Theme</h2>' +
          '<p class="text-body-sm text-text-muted">One short theme per fiscal year. It appears on My KPIs, on the Annual Performance report and its PDF, and on the Dashboard. ' +
            'Leave it empty to hide it.</p>' +
        '</div>' +
        '<div class="grid grid-cols-1 lg:grid-cols-[160px_minmax(0,1fr)_auto] gap-space-sm items-end">' +
          '<div><label class="form-label" for="theme-year">Year</label>' +
            '<select id="theme-year" class="field" onchange="MGI.onThemeYear(this.value)">' + years.map(function (y) {
              return '<option value="' + y + '"' + (y === Number(S.themeYear) ? ' selected' : '') + '>FY' + y + (y === d.activeYear ? ' (Active)' : '') + '</option>';
            }).join('') + '</select></div>' +
          '<div><label class="form-label flex items-center justify-between" for="theme-text">Theme <span id="theme-count" class="text-label-xs font-normal text-text-muted"></span></label>' +
            '<input id="theme-text" type="text" class="field" maxlength="' + d.maxLength + '" placeholder="Think Precise, Result Excellence" value="' + esc(current) + '"' +
              ' oninput="MGI.onThemeInput()"></div>' +
          '<button id="theme-save" type="button" class="btn btn-primary" onclick="MGI.saveTheme()">' +
            '<span class="material-symbols-outlined text-[18px]">save</span> Save Theme</button>' +
        '</div>' +
        '<div><p class="form-label">Preview</p><div id="theme-preview"></div></div>' +
        '<section class="rounded-xl border border-border-light overflow-hidden">' +
          '<div class="px-space-md py-space-sm bg-surface-page border-b border-border-light"><h3 class="text-title-md text-text-primary">Themes by year</h3></div>' +
          '<div class="table-scroll">' + history + '</div>' +
        '</section>' +
      '</div>';
    onThemeInput();
  }

  function onThemeYear(year) {
    S.themeYear = parseInt(year, 10) || S.themeYear;
    renderThemePanel();
  }

  function onThemeInput() {
    var box = $('theme-text');
    if (!box || !S.themes) return;
    var text = String(box.value || '').replace(/\s+/g, ' ').trim();
    $('theme-count').textContent = text.length + ' / ' + S.themes.maxLength;
    $('theme-preview').innerHTML = text
      ? themeBannerHtml(S.themeYear, text)
      : '<p class="rounded-xl border border-dashed border-border-medium px-4 py-3 text-body-sm text-text-muted">No theme. Nothing is shown for FY' + esc(S.themeYear) + '.</p>';
    $('theme-save').disabled = text === themeFor(S.themeYear);
  }

  function saveTheme() {
    var box = $('theme-text');
    if (!box) return;
    var restore = busy($('theme-save'), 'Saving');
    api('saveYearTheme', S.themeYear, box.value)
      .then(function (res) {
        restore();
        toast(res.message, 'success');
        if (S.dashboard && S.dashboard.year === res.year) S.dashboard.theme = res.theme;
        if (S.dash && S.dash.year === res.year) S.dash.theme = res.theme;
        Object.keys(S.reports || {}).forEach(function (key) {
          if (S.reports[key].year === res.year) S.reports[key].theme = res.theme;
        });
        loadYearThemes();
      })
      .catch(function (err) {
        restore();
        toast(err.message, 'error');
      });
  }

  function restrictOwnerViews(user) {
    if (user.isOwner) return;
    ['settings-tab-admins', 'settings-admins-panel'].forEach(function (id) {
      var el = $(id);
      if (el) el.remove();
    });
  }

  function applyRole(user) {
    restrictOwnerViews(user);
    renderAccountMenu();
    $('topbar-title').textContent     = 'KPIs Management System';
    $('topbar-fy').innerHTML          = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>FY' + esc(user.year);
    $('topbar-fy').title              = 'Active fiscal year';
    $('sidebar-subtitle').textContent = 'Performance System ' + user.year;
    $('app-footer-year').textContent  = new Date().getFullYear();
    $('sidebar-name').textContent     = user.Full_Name;
    $('sidebar-role').textContent     = user.Position || '-';
    $('sidebar-avatar').textContent   = initials(user.Full_Name);
    $('sidebar-avatar').title         = user.Full_Name;

    var sysRole = userRoleLabel(user);
    $('topbar-role').innerHTML =
      '<span class="material-symbols-outlined text-[14px] text-slate-400">' + (user.isAdmin ? 'admin_panel_settings' : isReportViewer(user) ? 'monitoring' : 'badge') + '</span>' +
      '<span><span class="hidden sm:inline">Role: </span>' + esc(sysRole) + '</span>';
    restoreSidebar();

    var nav = $('sidebar-nav');

    if (user.isAdmin) {
      nav.appendChild(navGroup('My Workspace', WORKSPACE_NAV));
      nav.appendChild(navGroup('Reports', [
        { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
        { id: 'summary',  icon: 'bar_chart', label: 'Summary Report' },
        { id: 'evaluation', icon: 'workspace_premium', label: 'Performance Evaluation' }
      ]));
      nav.appendChild(navGroup('Setup', [
        { id: 'master-kpis', icon: 'library_books', label: 'Master KPIs' },
        { id: 'mapping',  icon: 'tune',      label: 'Mapping KPI' },
        { id: 'settings', icon: 'settings',  label: 'System Settings' }
      ]));
      go('dashboard');
    } else {
      var viewer = isReportViewer(user);
      var drop = ['view-mapping', 'view-settings', 'view-master-kpis', 'view-evaluation'];
      if (!viewer) drop.push('view-summary', 'view-dashboard');
      drop.forEach(function (id) {
        var view = $(id);
        if (view) view.remove();
      });

      nav.appendChild(navGroup('My Workspace', WORKSPACE_NAV));
      if (viewer) {
        nav.appendChild(navGroup('Reports', [
          { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
          { id: 'summary',  icon: 'bar_chart', label: 'Summary Report' }
        ]));
      }
      go('my-kpis');
    }
  }

  function accountItem(icon, label, action, danger) {
    return '<button type="button" role="menuitem" class="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg text-body-sm font-medium transition-all duration-150 ' +
      (danger ? 'text-status-danger-text hover:bg-status-danger-subtle' : 'text-text-primary hover:bg-slate-100') + '" onclick="' + action + '">' +
      '<span class="material-symbols-outlined text-[18px]">' + icon + '</span>' + label + '</button>';
  }

  function renderAccountMenu() {
    var u = S.user;
    if (!u) return;
    if ($('account-trigger-avatar')) $('account-trigger-avatar').textContent = initials(u.Full_Name);
    if (!$('account-menu')) return;

    var passwordAuth = u.authVia === 'password';
    var role = u.isOwner ? 'Owner' : userRoleLabel(u);

    $('account-menu').innerHTML =
      '<div class="p-4 border-b border-slate-100">' +
        '<div class="flex items-center gap-3">' +
          '<span class="w-11 h-11 rounded-full bg-primary-container text-white flex items-center justify-center text-label-sm font-bold shrink-0">' +
            esc(initials(u.Full_Name)) + '</span>' +
          '<div class="min-w-0">' +
            '<p class="text-body-md font-semibold text-text-primary truncate">' + esc(u.Full_Name) + '</p>' +
            '<p class="text-label-xs text-text-muted truncate">' + esc(u.Email || '-') + '</p>' +
            '<p class="text-label-xs text-text-muted truncate">NIK ' + esc(u.NIK) + (u.Position ? ' • ' + esc(u.Position) : '') + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="flex flex-wrap gap-1.5 mt-3">' +
          '<span class="pill ' + (u.isOwner ? 'pill-brand' : u.isAdmin ? 'pill-maroon' : 'pill-neutral') + ' !text-[11px]">' + esc(role) + '</span>' +
          '<span class="pill pill-neutral !text-[11px]"><span class="material-symbols-outlined text-[14px]">' +
            (passwordAuth ? 'password' : 'account_circle') + '</span> ' + (passwordAuth ? 'Password sign-in' : 'Google sign-in') + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="p-1.5 flex flex-col">' +
        accountItem('menu_book', 'Scoring Guide', "MGI.accountAction('guide')") +
        (passwordAuth
          ? accountItem('key', 'Change password', "MGI.accountAction('password')") +
            accountItem('logout', 'Sign out', "MGI.accountAction('signout')", true)
          : '<p class="px-3 py-2 text-label-xs text-text-muted flex items-center gap-1.5">' +
              '<span class="material-symbols-outlined text-[16px]">verified_user</span> Signed in with your Google account</p>') +
      '</div>';
  }

  function toggleAccountMenu(force) {
    var menu = $('account-menu');
    if (!menu) return;
    var open = force === undefined ? menu.classList.contains('hidden') : !!force;
    if (open) renderAccountMenu();
    menu.classList.toggle('hidden', !open);
    if ($('account-trigger')) $('account-trigger').setAttribute('aria-expanded', open ? 'true' : 'false');

    if (open && !S.accountWired) {
      S.accountWired = true;
      document.addEventListener('click', function (ev) {
        var wrap = $('account-wrap');
        if (wrap && wrap.contains && !wrap.contains(ev.target)) toggleAccountMenu(false);
      });
      document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape') toggleAccountMenu(false);
      });
    }
  }

  function waIcon(cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="' + WA_PATH + '"/></svg>';
  }

  function helpSupport() {
    var s = S.user && S.user.support;
    return s && s.whatsapp ? s : null;
  }

  function fillCopy(tpl, map) {
    return String(tpl).replace(/\{(\w+)\}/g, function (m, key) { return map[key] === undefined ? '' : String(map[key]); });
  }

  function helpContext() {
    var ctx = { page: VIEW_TITLES[S.view] || '', month: 0, year: 0, role: '' };
    var d = S.view === 'my-kpis' ? S.dashboard : S.view === 'summary' ? S.summary : null;
    if (d && d.month) {
      ctx.month = d.month;
      ctx.year = d.year;
    }
    if (S.help.roleKey && S.view === 'my-kpis') {
      var r = findRole(S.help.roleKey);
      if (r) ctx.role = r.label;
    }
    return ctx;
  }

  function helpNoteText(raw) {
    return String(raw || '').replace(/\r\n?/g, '\n').split('\n')
      .map(function (line) { return line.replace(/\s+$/, ''); }).join('\n')
      .replace(/\n{3,}/g, '\n\n').replace(/^\s+|\s+$/g, '').slice(0, HELP_NOTE_MAX);
  }

  function helpMessage(user, support, help, ctx) {
    var C = HELP_CHAT_ID;
    var topic = C.topics[help.topic] || null;
    var month = ctx.month ? C.months[ctx.month - 1] + ' ' + ctx.year : '';
    var role = ctx.role || [user.Position, user.Department].filter(Boolean).join(' / ');
    var place = [ctx.page, month].filter(Boolean).join(', ');
    var line = !topic ? C.general
             : help.topic === 'change' && ctx.role && month ? fillCopy(C.changeFor, { role: ctx.role, month: month })
             : topic[1];
    var blocks = [
      [fillCopy(C.hello, { name: support.name })],
      [topic ? '*' + topic[0] + '*' : '', line, helpNoteText(help.note)],
      [fillCopy(C.who, { who: displayName(user.Full_Name), nik: user.NIK }),
       role ? fillCopy(C.role, { role: role }) : '',
       place ? fillCopy(C.place, { place: place }) : ''],
      [C.thanks]
    ];
    return blocks.map(function (b) { return b.filter(Boolean).join('\n'); }).filter(Boolean).join('\n\n');
  }

  function helpTopic(key) {
    return HELP_TOPICS.filter(function (x) { return x.key === key; })[0] || null;
  }

  function helpBlocker(help) {
    var topic = helpTopic(help.topic);
    if (!topic) return 'Pick a topic first.';
    if (topic.need && helpNoteText(help.note).replace(/\s/g, '').length < HELP_NOTE_MIN) return topic.need;
    return '';
  }

  function helpSendHtml(support, ctx) {
    var blocker = helpBlocker(S.help);
    var label = waIcon('w-5 h-5') + 'Open WhatsApp';
    return blocker
      ? '<a id="help-send" class="help-send is-disabled" role="link" aria-disabled="true" aria-describedby="help-send-hint">' + label + '</a>'
      : '<a id="help-send" class="help-send" href="' + esc(helpLink(support, helpMessage(S.user, support, S.help, ctx))) + '" target="_blank" rel="noopener noreferrer" onclick="MGI.helpSent()">' + label + '</a>';
  }

  function syncHelpSend() {
    var support = helpSupport();
    var slot = $('help-send-slot');
    if (!support || !slot) return;
    slot.innerHTML = helpSendHtml(support, helpContext());
    var hint = $('help-send-hint');
    if (hint) hint.textContent = helpBlocker(S.help) || 'You can review the message in WhatsApp before sending.';
    var count = $('help-count');
    if (count) count.textContent = String(S.help.note || '').length + ' / ' + HELP_NOTE_MAX;
  }


  function helpLink(support, text) {
    return 'https://wa.me/' + String(support.whatsapp).replace(/\D/g, '') + '?text=' + encodeURIComponent(text);
  }

  function helpIncluded(ctx) {
    var u = S.user;
    return [displayName(u.Full_Name), 'NIK ' + u.NIK, ctx.role, ctx.page, ctx.month ? MONTHS[ctx.month - 1] + ' ' + ctx.year : '']
      .filter(Boolean).join(' • ');
  }

  function helpTuck(prevY, y, viewH, docH, open, tucked) {
    if (open || y < 80 || y + viewH >= docH - 24) return false;
    if (y > prevY + 4) return true;
    if (y < prevY - 4) return false;
    return !!tucked;
  }

  function syncHelpFab() {
    var show = !!helpSupport() && !!HELP_VIEWS[S.view];
    document.body.classList.toggle('has-help', show);
    if ($('help-fab')) $('help-fab').classList.toggle('hidden', !show);
    if (!show) closeHelp(true);
  }

  function renderHelpFab() {
    var host = $('help-fab');
    var support = helpSupport();
    syncHelpFab();
    if (!host) return;
    if (!support) {
      host.innerHTML = '';
      S.help.open = false;
      return;
    }
    if (!$('help-fab-btn')) {
      host.innerHTML =
        '<div id="help-panel" class="help-panel hidden" role="dialog" aria-modal="false" aria-labelledby="help-title"></div>' +
        '<button id="help-fab-btn" type="button" class="help-fab-btn" onclick="MGI.toggleHelp()" aria-expanded="false" aria-controls="help-panel"' +
          ' aria-label="Chat with ' + esc(support.name) + ' on WhatsApp">' + waIcon('help-fab-icon') +
          '<span class="help-fab-label" aria-hidden="true">Chat Admin</span>' +
        '</button>';
    }
    wireHelpScroll();
  }

  function helpChip(topic, on) {
    return '<button type="button" class="help-chip" data-help-topic="' + topic.key + '" aria-pressed="' + (on ? 'true' : 'false') + '"' +
      ' onclick="MGI.setHelpTopic(\'' + topic.key + '\')">' +
      '<span class="material-symbols-outlined">' + topic.icon + '</span><span class="min-w-0 leading-tight">' + esc(topic.label) + '</span></button>';
  }

  function renderHelpPanel() {
    var panel = $('help-panel');
    var support = helpSupport();
    if (!panel || !support) return;
    var h = S.help;
    var ctx = helpContext();
    var picked = helpTopic(h.topic);

    panel.innerHTML =
      '<div class="flex items-start gap-3 px-4 pt-4 pb-3 border-b border-slate-100">' +
        '<span class="help-avatar">' + waIcon('w-[22px] h-[22px]') + '</span>' +
        '<div class="min-w-0 flex-1">' +
          '<h2 id="help-title" class="text-[15px] font-bold leading-tight text-text-primary">Chat with ' + esc(support.name) + '</h2>' +
          '<p class="mt-0.5 text-[12px] text-text-muted">' + esc((support.title ? support.title + ' • ' : '') + 'replies on WhatsApp') + '</p>' +
        '</div>' +
        '<button type="button" class="btn-icon -mr-1.5 -mt-1" onclick="MGI.closeHelp()" aria-label="Close" title="Close">' +
          '<span class="material-symbols-outlined text-[20px]">close</span></button>' +
      '</div>' +
      '<div class="flex flex-col gap-3 px-4 pt-3 pb-4">' +
        '<p class="help-bubble">Hi ' + esc(displayName(S.user.Full_Name)) + '! ^-^ What do you need help with?</p>' +
        '<div class="grid grid-cols-3 gap-1.5" role="group" aria-label="Topic">' +
          HELP_TOPICS.map(function (x) { return helpChip(x, x.key === h.topic); }).join('') +
        '</div>' +
        (picked
          ? '<div>' +
              '<div class="flex items-baseline justify-between gap-2 mb-1.5">' +
                '<label for="help-note" class="form-label !mb-0">' + esc(picked.field) + '</label>' +
                '<span class="text-[11px] ' + (picked.need ? 'font-semibold text-status-danger-text' : 'text-text-muted') + '">' + (picked.need ? 'Required' : 'Optional') + '</span>' +
              '</div>' +
              '<textarea id="help-note" class="field help-note" rows="4" maxlength="' + HELP_NOTE_MAX + '" placeholder="' + esc(picked.hint) + '"' +
                (picked.need ? ' aria-required="true"' : '') + ' oninput="MGI.onHelpNote(this)" onkeydown="MGI.onHelpKey(event)">' + esc(h.note) + '</textarea>' +
              '<p class="mt-1 flex justify-between gap-2 text-[11px] text-text-muted"><span>Press Enter for a new line.</span><span id="help-count" class="tabular-nums">' +
                String(h.note || '').length + ' / ' + HELP_NOTE_MAX + '</span></p>' +
            '</div>' +
            '<p class="text-[11px] leading-relaxed text-text-muted"><span class="font-semibold text-text-secondary">Added for you:</span> ' + esc(helpIncluded(ctx)) + '</p>'
          : '') +
        '<div id="help-send-slot">' + helpSendHtml(support, ctx) + '</div>' +
        '<p id="help-send-hint" class="-mt-1 text-center text-[11px] text-text-muted" aria-live="polite">' +
          esc(helpBlocker(h) || 'You can review the message in WhatsApp before sending.') + '</p>' +
      '</div>';
  }

  function toggleHelp(force) {
    var open = force === undefined ? !S.help.open : !!force;
    if (open) openHelp();
    else closeHelp();
  }

  function openHelp(topic, roleKey) {
    var panel = $('help-panel');
    if (!panel || !helpSupport()) return;
    if (topic !== undefined) {
      S.help.topic = topic || '';
      S.help.roleKey = roleKey || '';
    }
    S.help.open = true;
    renderHelpPanel();
    panel.classList.remove('hidden');
    if ($('help-fab')) $('help-fab').classList.remove('is-tucked');
    if ($('help-fab-btn')) $('help-fab-btn').setAttribute('aria-expanded', 'true');
    wireHelpDismiss();
    var first = panel.querySelector ? $('help-note') || panel.querySelector('[data-help-topic]') : null;
    if (first && first.focus) first.focus();
  }

  function closeHelp(silent) {
    if (!S.help.open) return;
    S.help.open = false;
    if ($('help-panel')) $('help-panel').classList.add('hidden');
    var btn = $('help-fab-btn');
    if (!btn) return;
    btn.setAttribute('aria-expanded', 'false');
    if (!silent && btn.focus) btn.focus();
  }

  function setHelpTopic(key) {
    S.help.topic = S.help.topic === key ? '' : key;
    renderHelpPanel();
    var panel = $('help-panel');
    var target = S.help.topic ? $('help-note') : panel && panel.querySelector ? panel.querySelector('[data-help-topic="' + key + '"]') : null;
    if (target && target.focus) target.focus();
  }

  function onHelpNote(el) {
    S.help.note = String(el.value || '').slice(0, HELP_NOTE_MAX);
    syncHelpSend();
  }

  function onHelpKey(ev) {
    if (ev.key !== 'Enter' || !(ev.ctrlKey || ev.metaKey)) return;
    ev.preventDefault();
    var link = $('help-send');
    if (!helpBlocker(S.help) && link && link.click) link.click();
  }

  function helpSent() {
    setTimeout(function () {
      S.help.topic = '';
      S.help.note = '';
      S.help.roleKey = '';
      closeHelp(true);
    }, 200);
  }

  function wireHelpDismiss() {
    if (S.helpWired) return;
    S.helpWired = true;
    document.addEventListener('click', function (ev) {
      if (!S.help.open) return;
      var host = $('help-fab');
      var target = ev && ev.target;
      if (!target || target.isConnected === false) return;
      if (target.closest && target.closest('[data-help-open]')) return;
      if (host && host.contains && !host.contains(target)) closeHelp(true);
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && S.help.open) closeHelp();
    });
  }

  function wireHelpScroll() {
    if (S.helpScrollWired || !window.addEventListener) return;
    S.helpScrollWired = true;
    var last = window.scrollY || 0;
    var queued = false;
    var frame = window.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); };
    window.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      frame(function () {
        queued = false;
        var fab = $('help-fab');
        var y = window.scrollY || 0;
        if (fab) {
          var tucked = fab.classList.contains('is-tucked');
          var next = helpTuck(last, y, window.innerHeight, document.documentElement.scrollHeight, S.help.open, tucked);
          if (next !== tucked) fab.classList.toggle('is-tucked', next);
        }
        last = y;
      });
    }, { passive: true });
  }

  function accountAction(action) {
    toggleAccountMenu(false);
    if (action === 'guide') go('guide');
    if (action === 'password') openPasswordScreen();
    if (action === 'signout') signOut();
  }

  function guideJump(id) {
    var el = $(id);
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function initGuide() {
    if ($('guide-maxkpi')) $('guide-maxkpi').textContent = S.user.maxKpi || 10;
    if ($('guide-evidence')) {
      $('guide-evidence').textContent = (S.user.allowedExt || []).map(function (e) { return e.toUpperCase(); }).join(', ') +
        ', up to ' + (S.user.maxFileMb || 5) + ' MB' +
        ((S.user.evidenceOptionalYears || []).indexOf(S.user.year) !== -1 ? '. Optional in FY' + S.user.year : '');
    }
    renderGuideBands();
    renderGuideCalc();
    renderGuidePerformance();
  }

  function renderGuideBands() {
    var host = $('guide-bands');
    if (!host) return;
    var b = bandValues();

    var seg = function (key, width, label) {
      return '<div class="bg-status-' + key + ' h-full flex items-center justify-center text-[11px] font-bold text-white" style="width:' + width + '%">' +
        (width >= 14 ? label : '') + '</div>';
    };
    var card = function (key, icon, text, note) {
      return '<div class="rounded-xl border border-border-light bg-surface-page p-space-md flex items-start gap-space-sm">' +
        '<span class="w-9 h-9 rounded-lg bg-status-' + key + '-subtle text-status-' + key + '-text flex items-center justify-center shrink-0">' +
          '<span class="material-symbols-outlined text-[20px]">' + icon + '</span></span>' +
        '<div class="min-w-0"><p class="text-title-md text-text-primary">' + esc(text) + '</p>' +
          '<p class="text-body-sm text-text-muted">' + note + '</p></div>' +
      '</div>';
    };

    host.innerHTML =
      '<div class="flex h-10 w-full rounded-lg overflow-hidden border border-border-light mb-space-md" aria-hidden="true">' +
        seg('danger', b.good, 'Needs Attention') + seg('info', b.excellent - b.good, 'Good') + seg('success', 100 - b.excellent, 'Excellent') +
      '</div>' +
      '<div class="grid grid-cols-1 md:grid-cols-3 gap-space-sm">' +
        card('success', 'workspace_premium', bandRange('success'), 'Outstanding results. Keep it up.') +
        card('info', 'thumb_up', bandRange('info'), 'Solid performance within the expected range.') +
        card('danger', 'flag', bandRange('danger'), 'Below expectations and worth a closer look.') +
      '</div>';
  }

  function renderGuideCalc() {
    var host = $('gc-result');
    if (!host) return;
    var label = $('gc-label').value;
    var target = parseFloat($('gc-target').value);
    var mult = parseFloat($('gc-multiplier').value);
    var weight = parseFloat($('gc-weight').value);
    var real = parseFloat($('gc-real').value);
    var binary = label === 'Binary';
    if ($('gc-multiplier-wrap')) $('gc-multiplier-wrap').classList.toggle('opacity-50', binary);

    if (!isNum(target) || !isNum(real) || (!binary && !isNum(mult))) {
      host.innerHTML =
        '<div class="rounded-xl border border-dashed border-border-medium bg-surface-page p-space-lg h-full flex flex-col items-center justify-center text-center gap-2">' +
          '<span class="material-symbols-outlined text-[32px] text-text-muted">calculate</span>' +
          '<p class="text-body-sm text-text-secondary">Fill in Target, Multiplier, and Realization to see the result.</p>' +
        '</div>';
      return;
    }

    var score = calcScore(real, target, label, isNum(mult) ? mult : 0, !!$('gc-b').checked);
    host.innerHTML =
      '<div class="rounded-xl border border-border-light bg-surface-page p-space-lg h-full flex flex-col justify-center gap-space-sm">' +
        '<span class="text-label-xs uppercase tracking-wider text-text-muted">Tier score</span>' +
        '<div class="flex items-center gap-space-md">' +
          '<span class="inline-flex items-center justify-center w-20 h-20 rounded-2xl text-3xl font-bold tabular-nums ' + tierClass(score) + '">' + score.toFixed(1) + '</span>' +
          '<p class="text-body-sm text-text-secondary">Realization <strong class="text-text-primary">' + esc(num(real, 2)) + '</strong> against target ' +
            '<strong class="text-text-primary">' + esc(targetLabel({ Label: label, Target: target })) + '</strong>' +
            (binary ? '' : ' with multiplier <strong class="text-text-primary">' + esc(num(mult, 2)) + '</strong>') + '.</p>' +
        '</div>' +
        (isNum(weight)
          ? '<p class="text-body-md text-text-primary">With weight <strong>' + esc(num(weight, 2)) + '%</strong>, this KPI adds <strong>' +
            (weight * score).toFixed(2) + ' points</strong> to the role index.</p>'
          : '') +
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

    var list = document.createElement('nav');
    list.className = 'flex flex-col gap-1';
    links.forEach(function (l) {
      var a = document.createElement('a');
      a.className = 'nav-link';
      a.dataset.view = l.id;
      a.title = l.label;
      a.innerHTML = '<span class="material-symbols-outlined text-[20px]">' + l.icon + '</span>' +
                    '<span class="nav-label">' + esc(l.label) + '</span>';
      a.onclick = function () { go(l.id); };
      list.appendChild(a);
    });
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
        '<span class="material-symbols-outlined hero-heart" title="Thank you for your work at MGI" aria-hidden="true">favorite</span></span>';
  }

  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '??';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function go(view) {
    if ((S.view === 'mapping' && isBasketDirty()) || (S.view === 'settings' && isCategoryDirty())) {
      guardUnsaved(function () { go(view); });
      return;
    }

    S.view = view;
    closeHelp(true);
    syncHelpFab();
    ['dashboard', 'my-kpis', 'guide', 'master-kpis', 'mapping', 'summary', 'evaluation', 'settings'].forEach(function (v) {
      var el = $('view-' + v);
      if (el) el.classList.toggle('hidden', v !== view);
    });
    document.querySelectorAll('#sidebar-nav .nav-link').forEach(function (a) {
      a.classList.toggle('is-active', a.dataset.view === view);
    });
    $('topbar-crumb').textContent = VIEW_TITLES[view] || '';
    toggleSidebar(false);
    window.scrollTo(0, 0);

    if (view === 'dashboard') initDashboard();
    if (view === 'my-kpis') initMyKpis();
    if (view === 'master-kpis') initMasterKpis();
    if (view === 'mapping') initMapping();
    if (view === 'summary') initSummary();
    if (view === 'evaluation') initEvaluation();
    if (view === 'settings') initSettings();
    if (view === 'guide') initGuide();
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

  var DASH_COLORS = {
    maroon: '#8B1E1E', success: '#10B981', info: '#3B82F6', danger: '#EF4444', notFilled: '#F87171',
    warning: '#F59E0B', progress: '#FBBF24', muted: '#94A3B8', slate: '#E2E8F0', grid: '#F1F5F9', surface: '#FFFFFF', ink: '#334155'
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
          backgroundColor: 'rgba(15,23,42,0.94)',
          titleColor: '#FFFFFF',
          bodyColor: '#E2E8F0',
          footerColor: '#94A3B8',
          borderColor: 'rgba(148,163,184,0.25)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 10,
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
    defaults.color = '#64748B';
    defaults.borderColor = DASH_COLORS.grid;
    if (defaults.scale) {
      if (defaults.scale.grid) defaults.scale.grid.color = DASH_COLORS.grid;
      if (defaults.scale.border) defaults.scale.border.display = false;
      if (defaults.scale.ticks) {
        defaults.scale.ticks.color = DASH_COLORS.muted;
        defaults.scale.ticks.padding = 8;
      }
    }
    if (defaults.elements && defaults.elements.bar) defaults.elements.bar.borderRadius = 6;
    if (defaults.elements && defaults.elements.line) defaults.elements.line.borderWidth = 2;
  }

  function dashGradient(context) {
    var chart = context.chart;
    if (!chart || !chart.chartArea) return 'rgba(51,65,85,0.08)';
    var g = chart.ctx.createLinearGradient(0, chart.chartArea.top, 0, chart.chartArea.bottom);
    g.addColorStop(0, 'rgba(51,65,85,0.12)');
    g.addColorStop(1, 'rgba(51,65,85,0)');
    return g;
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

  function monthStateMap() {
    var map = {};
    (S.monthStates || []).forEach(function (m) { map[m.key] = m; });
    return map;
  }

  function periodOption(y, i, st, current) {
    var key = y + '-' + (i + 1);
    var meta = st ? MONTH_STATES[st.state] || null : null;
    var picked = key === current;
    var sub = st && st.open && st.cutoff ? 'Until ' + shortDate(st.cutoff) : '';
    return '<button type="button" role="option" class="period-option' + (picked ? ' is-current' : '') + '" data-period-key="' + key + '"' +
      ' aria-selected="' + (picked ? 'true' : 'false') + '" tabindex="-1" onclick="MGI.pickPeriod(\'' + key + '\')">' +
      '<span class="material-symbols-outlined period-check" aria-hidden="true">' + (picked ? 'check' : '') + '</span>' +
      '<span class="flex flex-col min-w-0 flex-1">' +
        '<span class="period-name">' + MONTHS[i] + ' ' + y + '</span>' +
        (sub ? '<span class="period-sub">' + esc(sub) + '</span>' : '') +
      '</span>' +
      (meta
        ? '<span class="pill ' + meta.pill + ' period-pill"><span class="material-symbols-outlined text-[14px]" aria-hidden="true">' + meta.icon + '</span>' + meta.label + '</span>'
        : '') +
    '</button>';
  }

  function myPeriodOptions() {
    var year = S.user.year;
    var trigger = $('emp-month');
    var current = trigger ? String(trigger.value || '') : '';
    var states = monthStateMap();
    var group = function (y, note) {
      var list = MONTHS.map(function (m, i) { return states[y + '-' + (i + 1)] || null; });
      var due = list.filter(function (s) { return s && MONTH_DUE[s.state]; }).length;
      var done = list.filter(function (s) { return s && s.state === 'done'; }).length;
      return '<div class="period-group" role="group" aria-label="FY' + y + note + '">' +
        '<p class="period-group-head" aria-hidden="true"><span>FY' + y + note + '</span>' +
          (due ? '<span>' + done + ' of ' + due + ' submitted</span>' : '') + '</p>' +
        list.map(function (st, i) { return periodOption(y, i, st, current); }).join('') +
      '</div>';
    };
    return group(year, ' (Active)') + (year - 1 >= (S.user.setupYear || year) ? group(year - 1, ' (Previous year)') : '');
  }

  function renderPeriodPicker() {
    var trigger = $('emp-month');
    if (!trigger || !S.user) return;
    var p = myPeriod();
    var st = monthStateMap()[p.year + '-' + p.month];
    var meta = st ? MONTH_STATES[st.state] || null : null;
    trigger.innerHTML =
      '<span class="w-2.5 h-2.5 rounded-full shrink-0 ' + (meta ? meta.dot : 'bg-slate-300') + '" aria-hidden="true"></span>' +
      '<span class="font-semibold text-text-primary whitespace-nowrap">' + MONTHS[p.month - 1] + ' ' + p.year + '</span>' +
      (meta ? '<span class="sr-only">, ' + meta.label + '</span>' : '') +
      '<span class="material-symbols-outlined text-[18px] text-text-muted" aria-hidden="true">expand_more</span>';
    var pop = $('emp-month-pop');
    if (pop) pop.innerHTML = myPeriodOptions();
    renderAlsoOpen();
  }

  function otherOpenMonths() {
    var trigger = $('emp-month');
    var current = trigger ? String(trigger.value || '') : '';
    return (S.monthStates || []).filter(function (m) {
      return m.key !== current && m.open && (m.state === 'todo' || m.state === 'progress');
    });
  }

  function renderAlsoOpen() {
    var host = $('emp-month-also');
    if (!host) return;
    var list = otherOpenMonths();
    host.innerHTML = !list.length ? ''
      : '<button type="button" class="period-also" title="Other open months that still need your submission" onclick="' +
          (list.length === 1 ? 'MGI.pickPeriod(\'' + list[0].key + '\')' : 'MGI.togglePeriodPicker(true)') + '">' +
          '<span class="material-symbols-outlined text-[16px]" aria-hidden="true">notification_important</span>' +
          (list.length === 1 ? 'Also open: ' + MONTHS[list[0].month - 1] + ' ' + list[0].year : list.length + ' other months are open') +
        '</button>';
  }

  function togglePeriodPicker(force) {
    var pop = $('emp-month-pop');
    var trigger = $('emp-month');
    if (!pop || !trigger) return;
    var open = force === undefined ? pop.classList.contains('hidden') : !!force;
    if (!open) {
      closePeriodPicker();
      return;
    }
    pop.innerHTML = myPeriodOptions();
    pop.classList.remove('hidden');
    trigger.setAttribute('aria-expanded', 'true');
    wirePeriodPicker();
    var picked = pop.querySelector ? pop.querySelector('[aria-selected="true"]') || pop.querySelector('[role="option"]') : null;
    if (!picked) return;
    if (picked.scrollIntoView) picked.scrollIntoView({ block: 'nearest' });
    if (picked.focus) picked.focus();
  }

  function closePeriodPicker(refocus) {
    var pop = $('emp-month-pop');
    var trigger = $('emp-month');
    if (!pop || pop.classList.contains('hidden')) return;
    pop.classList.add('hidden');
    if (!trigger) return;
    trigger.setAttribute('aria-expanded', 'false');
    if (refocus && trigger.focus) trigger.focus();
  }

  function pickPeriod(key) {
    var trigger = $('emp-month');
    closePeriodPicker(true);
    if (!trigger || !key || String(trigger.value) === String(key)) return;
    trigger.value = key;
    renderPeriodPicker();
    loadMyKpis();
  }

  function onPeriodTriggerKey(ev) {
    if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
    ev.preventDefault();
    togglePeriodPicker(true);
  }

  function onPeriodPickerKey(ev) {
    var pop = $('emp-month-pop');
    if (!pop) return;
    if (ev.key === 'Escape') {
      ev.preventDefault();
      closePeriodPicker(true);
      return;
    }
    if (ev.key === 'Tab') {
      closePeriodPicker();
      return;
    }
    var steps = { ArrowDown: 1, ArrowUp: -1, Home: 'first', End: 'last' };
    if (!steps.hasOwnProperty(ev.key)) return;
    ev.preventDefault();
    var options = Array.prototype.slice.call(pop.querySelectorAll('[role="option"]'));
    if (!options.length) return;
    var at = options.indexOf(document.activeElement);
    var step = steps[ev.key];
    var next = step === 'first' ? 0
             : step === 'last' ? options.length - 1
             : Math.max(0, Math.min(options.length - 1, at < 0 ? 0 : at + step));
    if (options[next].focus) options[next].focus();
  }

  function wirePeriodPicker() {
    if (S.periodPickWired) return;
    S.periodPickWired = true;
    document.addEventListener('click', function (ev) {
      var pop = $('emp-month-pop');
      var trigger = $('emp-month');
      var target = ev && ev.target;
      if (!pop || pop.classList.contains('hidden') || !target || target.isConnected === false) return;
      if (target.closest && target.closest('.period-also')) return;
      if ((pop.contains && pop.contains(target)) || (trigger && trigger.contains && trigger.contains(target))) return;
      closePeriodPicker();
    });
  }

  function myPeriod() {
    var text = String($('emp-month').value || '');
    var parts = text.indexOf('-') > -1 ? text.split('-') : [S.user.year, text];
    var year = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10);
    return {
      year:  year >= 2000 && year <= 2100 ? year : S.user.year,
      month: month >= 1 && month <= 12 ? month : 1
    };
  }

  function initMyKpis() {
    var trigger = $('emp-month');

    if (!trigger.dataset.wired) {
      trigger.dataset.wired = '1';
      trigger.value = S.user.year + '-' + (S.user.defaultMonth || new Date().getMonth() + 1);
    }
    renderPeriodPicker();

    renderEmpHero(!S.dashboard);
    loadMyKpis();
    setEmpView(S.empView);
  }

  function loadMyKpis(keep) {
    Object.keys(S.reports).forEach(function (key) {
      if (key.indexOf(S.user.NIK + '|') === 0) delete S.reports[key];
    });
    var picked = myPeriod();
    var periodKey = picked.year + '-' + picked.month;
    if (S.empMonth !== periodKey) {
      S.empMonth = periodKey;
      S.empCollapsed = {};
      S.empHistoryOpen = false;
    }
    if (!keep) {
      renderEmpHero(true);
      $('emp-roles').innerHTML =
        '<div class="bg-surface-card rounded-xl border border-border-light p-space-lg">' +
          '<div class="skeleton h-6 w-1/3 mb-3"></div><div class="skeleton h-24 w-full"></div>' +
        '</div>';
      $('emp-history').innerHTML = '';
    }

    api('getEmployeeDashboardData', S.user.NIK, picked.year, picked.month)
      .then(function (data) {
        if (S.empMonth !== periodKey) return;
        applyChangeLocks(data);
        S.dashboard = data;
        if (data.months) S.monthStates = data.months;
        S.pendingFiles = keep && keep.files ? keep.files : {};
        renderMyKpis();
        renderPeriodPicker();
        if (keep && keep.drafts) applyDrafts(keep.drafts);
        if (keep && keep.declares) applyDeclares(keep.declares);
        celebrateSubmit();
      })
      .catch(function (err) {
        $('emp-roles').innerHTML =
          '<div class="bg-surface-card rounded-xl border border-border-light p-space-xl text-center text-status-danger">' +
          esc(err.message) + '</div>';
        toast(err.message, 'error');
      });
  }

  function findRole(key) {
    var roles = (S.dashboard && S.dashboard.roles) || [];
    return roles.filter(function (r) { return r.key === key; })[0] || null;
  }

  function roleEl(name, key) {
    return document.querySelector('[' + name + '="' + attr(key) + '"]');
  }

  function roleSlugJs(position, department) {
    return (String(position || '') + ' ' + String(department || ''))
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function longDate(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    return d.getDate() + ' ' + MONTHS[d.getMonth()];
  }

  function periodStatusText(ps) {
    if (!ps) return '';
    if (ps.isOpen) return 'Open until ' + fmtDate(ps.cutoff);
    if (ps.rawOpen && ps.expired) return 'Closed on ' + fmtDate(ps.cutoff);
    return 'Not open for submission';
  }

  function evidenceOptional() {
    return !!(S.dashboard && S.dashboard.evidenceOptional);
  }

  function roleProgress(role) {
    var due = (role.items || []).filter(function (it) { return it.IsActive !== false && it.InCycle; });
    var filled = due.filter(function (it) { return it.Realization !== null && it.Realization !== undefined && it.Realization !== ''; });
    return { required: due.length, filled: filled.length, evidence: !!role.evidence, evidenceOk: !!role.evidence || evidenceOptional() };
  }

  function heroState(d) {
    var ps = d.periodState || {};
    var roles = (d.roles || []).filter(function (r) { return !r.inactiveRole; });
    var st = { roles: roles.length, required: 0, filled: 0, evidence: 0 };
    roles.forEach(function (r) {
      var p = roleProgress(r);
      st.required += p.required;
      st.filled += p.filled;
      if (p.evidenceOk) st.evidence++;
    });
    st.missingKpis = st.required - st.filled;
    st.missingFiles = st.roles - st.evidence;
    st.complete = st.roles > 0 && !st.missingKpis && !st.missingFiles;
    st.key = !st.roles ? 'none'
           : ps.isOpen ? (st.complete ? 'done' : 'todo')
           : ps.rawOpen && ps.expired ? 'closed' : 'locked';
    return st;
  }

  function heroSentence(st, d) {
    var month = MONTHS[d.month - 1];
    var ps = d.periodState || {};
    if (st.key === 'none') return 'Your KPIs for ' + d.year + " aren't set up yet. Please contact HR / Admin.";
    if (st.key === 'done') {
      var lefts = (d.roles || []).filter(function (r) { return !r.inactiveRole; }).map(function (r) { return roleChanges(r).left; });
      var same = lefts.length && lefts.every(function (n) { return n === lefts[0]; });
      var note = same && lefts[0] > 0
        ? ' You can still change ' + (lefts.length > 1 ? 'each role ' : 'it ') + changesWord(lefts[0]) + ' before ' + longDate(ps.cutoff) + '.'
        : '';
      return 'Everything for ' + month + ' is in. Thank you for keeping it on time.' + note;
    }
    if (st.key === 'closed') {
      return month + ' closed on ' + longDate(ps.cutoff) + '. ' +
        (st.complete ? 'Your results are in.' : 'Ask HR / Admin if something needs to change.');
    }
    if (st.key === 'locked') return month + " isn't open for submission right now. You can still review your targets below.";
    var parts = [];
    if (st.missingKpis) parts.push(st.missingKpis + (st.missingKpis === 1 ? ' KPI' : ' KPIs'));
    if (st.missingFiles) parts.push(st.missingFiles + (st.missingFiles === 1 ? ' evidence file' : ' evidence files'));
    var single = parts.length === 1 && (st.missingKpis + st.missingFiles) === 1;
    return month + ' is open until ' + longDate(ps.cutoff) + '. ' + parts.join(' and ') + ' still ' + (single ? 'needs' : 'need') + ' you.';
  }

  function heroBar(label, done, total) {
    var share = total ? Math.max(0, Math.min(100, done / total * 100)) : 0;
    return '<div>' +
      '<div class="flex items-center justify-between gap-2 text-label-sm">' +
        '<span class="text-text-secondary">' + label + '</span>' +
        '<span class="font-semibold text-text-primary tabular-nums">' + done + ' of ' + total + '</span>' +
      '</div>' +
      '<div class="mt-1.5 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">' +
        '<div class="h-full rounded-full transition-all duration-500 ' + (total && done >= total ? 'bg-status-success' : 'bg-status-info') + '" style="width:' + share + '%"></div>' +
      '</div>' +
    '</div>';
  }

  function heroCardHtml(st, d) {
    var ps = d.periodState || {};
    var head = HERO_HEADS[st.key];
    var title = st.key === 'todo' ? 'Open until ' + shortDate(ps.cutoff)
              : st.key === 'done' ? 'All submitted'
              : st.key === 'closed' ? 'Closed on ' + shortDate(ps.cutoff)
              : st.key === 'locked' ? 'Not open yet' : 'No KPIs yet';
    var countdown = st.key === 'todo' || st.key === 'done' ? cutoffCountdown(ps.cutoff, Date.now()) : null;
    return '<p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">' + esc(MONTHS[d.month - 1] + ' ' + d.year) + '</p>' +
      '<div class="flex flex-wrap items-center justify-between gap-2">' +
        '<p class="flex items-center gap-2 text-title-lg text-text-primary"><span class="material-symbols-outlined text-[22px] ' + head.tone + '">' + head.icon + '</span>' + esc(title) + '</p>' +
        (countdown ? '<span class="pill pill-' + countdown.tone + ' !text-[11px]"><span class="material-symbols-outlined text-[14px]">' + countdown.icon + '</span>' + countdown.label + '</span>' : '') +
      '</div>' +
      (st.roles
        ? '<div class="flex flex-col gap-3">' +
            heroBar('KPIs filled', st.filled, st.required) +
            (d.evidenceOptional ? '' : heroBar('Evidence', st.evidence, st.roles)) +
          '</div>'
        : '') +
      (st.key === 'todo'
        ? '<button type="button" class="btn btn-primary w-full" onclick="MGI.continueFilling()">Continue filling' +
            '<span class="material-symbols-outlined text-[18px]">arrow_forward</span></button>'
        : st.key === 'done'
          ? '<button type="button" class="btn btn-secondary w-full" onclick="MGI.continueFilling()">' +
              '<span class="material-symbols-outlined text-[18px]">visibility</span> Review my submission</button>'
          : '');
  }

  function renderEmpHero(loading) {
    var host = $('emp-hero');
    if (!host || !S.user) return;
    var d = loading ? null : S.dashboard;
    var emp = (d && d.employee) || S.user;
    var meta = [emp.Position, emp.Department].filter(Boolean).join(' • ');
    var st = d ? heroState(d) : null;

    host.innerHTML =
      '<section class="emp-hero">' +
        '<div class="emp-hero-main">' +
          '<p class="emp-hero-eyebrow">' + esc(dayGreeting()) + '</p>' +
          '<h1 class="emp-hero-name">' + heroNameHtml(emp.Full_Name) + '</h1>' +
          '<p class="emp-hero-meta">' + esc(meta) + (emp.NIK ? (meta ? ' • ' : '') + 'NIK ' + esc(emp.NIK) : '') + '</p>' +
          '<p class="emp-hero-line">' + (st ? esc(heroSentence(st, d)) : '<span class="skeleton inline-block h-4 w-full max-w-md align-middle"></span>') + '</p>' +
          (d && d.theme
            ? '<p class="emp-hero-theme"><span class="material-symbols-outlined text-[16px]">flag</span>FY' + esc(d.year) + ' • ' + esc(d.theme) + '</p>'
            : '') +
        '</div>' +
        '<aside class="emp-hero-card" aria-live="polite">' +
          (st ? heroCardHtml(st, d)
              : '<div class="skeleton h-3 w-28"></div><div class="skeleton h-6 w-40"></div><div class="skeleton h-12 w-full"></div><div class="skeleton h-10 w-full"></div>') +
        '</aside>' +
      '</section>';
  }

  function continueFilling() {
    var d = S.dashboard;
    if (!d) return;
    setEmpView('monthly');
    var roles = (d.roles || []).filter(function (r) { return !r.inactiveRole; });
    var target = roles.filter(function (r) {
      var p = roleProgress(r);
      return p.filled < p.required || !p.evidenceOk;
    })[0] || roles[0];
    if (!target) return;
    if (S.empCollapsed[target.key]) toggleEmpRole(target.key);
    var section = roleEl('data-role-section', target.key);
    if (section && section.scrollIntoView) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    var empty = target.items.filter(function (it) {
      return it.Editable && (it.Realization === null || it.Realization === undefined || it.Realization === '');
    })[0];
    var input = empty ? document.querySelector('input[data-mapping="' + attr(empty.Mapping_ID) + '"]') : null;
    if (input && input.focus) setTimeout(function () { input.focus({ preventScroll: true }); }, 400);
  }

  function renderMyKpis() {
    var d = S.dashboard;
    var s = d.summary;

    renderEmpHero();

    var groups = s.roleGroups || [];
    var bad = groups.filter(function (g) { return !g.valid; });

    var strip = $('emp-weight-strip');

    if (!bad.length) {
      strip.classList.add('hidden');
      strip.innerHTML = '';
    } else {
      strip.classList.remove('hidden');
      strip.innerHTML =
        '<div class="rounded-xl border border-red-200 bg-status-danger-subtle p-space-md flex items-start gap-space-sm">' +
          '<span class="material-symbols-outlined text-status-danger text-[22px] shrink-0">error</span>' +
          '<div class="min-w-0">' +
            '<p class="text-title-md text-status-danger-text">Some role weights don\'t add up to 100%</p>' +
            '<p class="text-body-sm text-text-secondary">Please let HR / Admin know, so your index is calculated correctly.</p>' +
            '<div class="flex flex-wrap gap-2 mt-space-sm">' +
              bad.map(function (g) {
                return '<span class="pill pill-danger !text-[11px]">' + esc(g.label) + ' ' + g.percent + '%</span>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>';
    }

    var roles = d.roles || [];

    if (!roles.length) {
      var hasHistory = (d.history || []).length > 0;
      $('emp-roles').innerHTML =
        '<div class="bg-surface-card rounded-xl shadow-level-1 border border-border-light p-space-2xl text-center">' +
          '<span class="material-symbols-outlined text-[40px] text-text-muted">inbox</span>' +
          '<p class="text-body-md text-text-secondary mt-2">' +
            (hasHistory
              ? 'No active KPIs this month.'
              : 'Your KPIs for ' + d.year + " aren't set up yet.") + '</p>' +
          '<p class="text-body-sm text-text-muted">' +
            (hasHistory ? 'Your earlier KPIs are in History below.' : 'Please contact HR / Admin, and they will map them for you.') +
          '</p>' +
        '</div>';
    } else {
      $('emp-roles').innerHTML = roles.map(roleSection).join('');
      roles.forEach(function (r) {
        wireDropzone(r.key);
        renderTableFooter(r.key);
        renderEvidence(r.key);
      });
    }

    renderEmpHistory();
    renderSubmitState();
  }

  function roleSection(r) {
    var d = S.dashboard;
    var key = esc(r.key);
    var multi = (d.roles || []).length > 1;
    var collapsed = !!S.empCollapsed[r.key];
    var readOnly = !!r.inactiveRole;
    var scored = r.items.some(function (it) { return isNum(it.Score); });
    var progress = roleProgress(r);
    var changes = roleChanges(r);
    var open = !!(d.periodState && d.periodState.isOpen);
    var changeLocked = !readOnly && open && roleChangeLocked(r);
    var support = helpSupport();
    var changeChip = readOnly || !open || !changes.submitted ? ''
      : changeLocked
        ? '<span class="pill pill-neutral !text-[11px]" title="Only HR / Admin can allow another change this month"><span class="material-symbols-outlined text-[14px]">lock</span>No changes left</span>'
        : '<span class="pill ' + (changes.left === 1 ? 'pill-warning' : 'pill-neutral') + ' !text-[11px]" title="Every new submission after the first uses one change">' +
            '<span class="material-symbols-outlined text-[14px]">history</span>' + plural(changes.left, 'change') + ' left</span>';
    var stage = !progress.required && !progress.evidence ? null
              : progress.filled >= progress.required && progress.evidenceOk ? ['pill-success', 'check_circle', 'Submitted']
              : progress.filled || progress.evidence ? ['pill-info', 'pending', 'In progress']
              : ['pill-neutral', 'radio_button_unchecked', 'Not started'];
    var fileBase = d.period + '_' + d.employee.NIK + '_' + roleSlugJs(r.position, r.department);
    var accept = S.user.allowedExt.map(function (e) { return '.' + e; }).join(',');
    var tags = S.user.allowedExt.map(function (e) {
      return '<span class="pill pill-neutral !text-[11px]">' + e.toUpperCase() + '</span>';
    }).join('') + '<span class="pill pill-neutral !text-[11px]">Max ' + S.user.maxFileMb + ' MB</span>';

    var head =
      '<div class="role-group-head !px-space-lg !py-space-md" onclick="MGI.toggleEmpRole(\'' + key + '\')"' +
        ' title="Click to expand or collapse this role">' +
        '<span class="material-symbols-outlined text-[22px] text-text-secondary" data-chevron>' +
          (collapsed ? 'expand_more' : 'expand_less') + '</span>' +
        '<span class="material-symbols-outlined text-[22px] ' + (readOnly ? 'text-text-muted' : 'text-primary-container') + '">work</span>' +
        '<h2 class="text-title-lg ' + (readOnly ? 'text-text-secondary' : 'text-text-primary') + '">' + esc(r.label) + '</h2>' +
        (readOnly
          ? '<span class="pill pill-neutral !text-[11px]">Inactive Role</span>'
          : multi
            ? (r.isHome
                ? '<span class="pill pill-neutral !text-[11px]">Home Role</span>'
                : '<span class="pill pill-maroon !text-[11px]">Additional Role</span>')
            : '') +
        (readOnly || r.valid ? '' : '<span class="pill pill-danger" title="The KPI weights of this role do not add up to 100%">Weight ' + r.percent + '%</span>') +
        '<span class="ml-auto flex flex-wrap items-center gap-space-sm">' +
          '<span class="text-label-xs text-text-muted">' + (readOnly
            ? r.count + (r.count === 1 ? ' KPI' : ' KPIs')
            : progress.required ? progress.filled + ' of ' + progress.required + ' filled' : 'No KPI due this month') + '</span>' +
          (!readOnly && stage ? '<span class="pill ' + stage[0] + ' !text-[11px]"><span class="material-symbols-outlined text-[14px]">' + stage[1] + '</span>' + stage[2] + '</span>' : '') +
          changeChip +
          (scored ? '<span class="pill pill-' + band(r.index).key + '">Index ' + num(r.index) + '</span>' : '') +
        '</span>' +
      '</div>';

    var table =
      (readOnly
        ? '<div class="mx-space-lg mt-space-md mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm bg-slate-50 text-slate-600">' +
            '<span class="material-symbols-outlined text-[20px] shrink-0">lock</span>' +
            '<span>This role is inactive. Data for this period is shown as history and cannot be changed.</span>' +
          '</div>'
        : '') +
      (changeLocked
        ? '<div class="mx-space-lg mt-space-md mb-4 flex flex-wrap items-center gap-x-2 gap-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">' +
            '<span class="material-symbols-outlined text-[20px] shrink-0">lock</span>' +
            '<span class="min-w-0 flex-1">You have used ' + (changes.allowed === 2 ? 'both changes' : 'all ' + changes.allowed + ' changes') + ' for ' + esc(MONTHS[d.month - 1]) +
              '. If something still needs to change, ask HR / Admin.</span>' +
            (support
              ? '<button type="button" data-help-open class="help-ask" onclick="MGI.openHelp(\'change\', \'' + key + '\')">' +
                  waIcon('w-4 h-4 text-[#128C7E]') + 'Ask ' + esc(support.name) + '</button>'
              : '') +
          '</div>'
        : '') +
      '<div class="table-scroll">' +
        '<table class="data-table kpi-input-table table-fixed w-full min-w-[1044px]">' +
          '<thead><tr>' +
            '<th class="w-12 text-center">No</th>' +
            '<th>KPI Code &amp; Name</th>' +
            '<th class="w-[72px] text-center">Weight</th>' +
            '<th class="kpi-unit w-[100px] text-center">Unit</th>' +
            '<th class="w-28 text-center">Duration</th>' +
            '<th class="w-[116px] 2xl:w-[176px] text-center">Target</th>' +
            '<th class="w-[212px] 2xl:w-[288px]"><span class="inline-flex items-center gap-1 text-primary-container">' +
              '<span class="material-symbols-outlined text-[16px]">edit</span> Realization (Input)</span></th>' +
            '<th class="w-[208px] text-right">Status / Achievement</th>' +
          '</tr></thead>' +
          '<tbody>' + r.items.map(rowMyKpi).join('') + '</tbody>' +
        '</table>' +
      '</div>' +
      '<div class="p-space-md bg-surface-page border-t border-border-light flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm" data-role-footer="' + key + '"></div>';

    var dropzone = readOnly || changeLocked ? '' :
      '<div class="dropzone flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-5 text-left" data-role-dropzone="' + key + '">' +
        '<span class="w-10 h-10 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0">' +
          '<span class="material-symbols-outlined text-primary-container text-[22px]">cloud_upload</span>' +
        '</span>' +
        '<div class="min-w-0 flex-1">' +
          '<p class="text-sm font-medium text-slate-900">Drag &amp; drop a file here, or ' +
            '<span class="text-primary-container font-semibold underline underline-offset-2">click to browse</span></p>' +
          '<p class="text-xs text-slate-500 mt-0.5">Upload 1 file with all KPI evidence for this role for ' +
            esc(MONTHS[d.month - 1]) + ' ' + d.year + '.' + (d.evidenceOptional ? ' Optional for FY' + d.year + '.' : '') + '</p>' +
        '</div>' +
        '<div class="flex flex-wrap gap-1.5 shrink-0">' + tags + '</div>' +
        '<input type="file" class="hidden" data-role-file="' + key + '" accept="' + esc(accept) + '">' +
      '</div>';

    var evidence =
      '<div class="p-space-lg border-t border-border-light no-print">' +
        '<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm' + (readOnly ? '' : ' mb-space-md') + '">' +
          '<div class="min-w-0">' +
            '<h3 class="text-title-md text-text-primary">Evidence Document: ' + esc(r.label) + '</h3>' +
            (readOnly ? '' :
              '<p class="text-body-sm text-text-muted mt-0.5">One combined file per month for this role. Automatic file name: ' +
              '<span class="font-semibold text-text-secondary break-all">' + esc(fileBase) + '</span></p>') +
          '</div>' +
          '<span data-role-evstatus="' + key + '"></span>' +
        '</div>' +
        dropzone +
        '<div class="hidden mt-space-md" data-role-preview="' + key + '"></div>' +
      '</div>';

    var receipt = readOnly ? '' :
      '<div class="hidden p-space-lg border-t border-border-light no-print" data-role-receipt="' + key + '"></div>';

    var submit = readOnly || changeLocked ? '' :
      '<div class="p-space-lg border-t border-border-light bg-surface-page flex flex-col lg:flex-row lg:items-center justify-between gap-space-md no-print" data-role-form="' + key + '">' +
        '<div class="flex flex-col gap-space-xs min-w-0">' +
          '<div class="flex flex-wrap items-center gap-1.5 mb-1" data-role-steps="' + key + '"></div>' +
          '<label class="flex items-start gap-space-sm cursor-pointer">' +
            '<input type="checkbox" class="mt-0.5 w-4 h-4 rounded border-border-medium text-primary-container focus:ring-primary-container" data-role-declare="' + key + '"' +
              ' onchange="MGI.onDeclareChange(\'' + key + '\')">' +
            '<span class="text-body-sm text-text-secondary leading-relaxed">I declare that the realization data and supporting documents for the <strong>' +
              esc(r.label) + '</strong> role are valid, match the field operational records, and can be accounted for to the Management of PT Macme Global Indonesia.</span>' +
          '</label>' +
          '<p class="text-body-sm text-text-muted flex items-center gap-1.5 pl-6" data-role-hint="' + key + '"></p>' +
        '</div>' +
        '<div class="flex flex-col-reverse sm:flex-row sm:items-center gap-space-sm shrink-0 w-full lg:w-auto">' +
          '<button type="button" class="btn btn-secondary hidden" data-role-discard="' + key + '"' +
            ' onclick="MGI.discardRoleChanges(\'' + key + '\')" title="Go back to the values and file you last submitted">' +
            '<span class="material-symbols-outlined text-[18px]">undo</span> Discard changes</button>' +
          '<button class="btn btn-primary px-space-lg py-3 w-full lg:w-auto" data-role-submit="' + key + '"' +
            ' onclick="MGI.submitRole(\'' + key + '\')">' +
            '<span class="material-symbols-outlined text-[18px]">send</span> <span data-role-submit-label="' + key + '">Submit ' + esc(r.label) + '</span>' +
          '</button>' +
        '</div>' +
      '</div>';

    return '<section class="role-group shadow-level-1 shrink-0 !mt-0 scroll-mt-36' + (collapsed ? ' is-collapsed' : '') + '" data-role-section="' + key + '">' +
      head +
      '<div class="role-group-body !p-0 !gap-0">' + table + evidence + receipt + submit + '</div>' +
    '</section>';
  }

  function renderEmpHistory() {
    var host = $('emp-history');
    var list = (S.dashboard && S.dashboard.history) || [];
    if (!list.length) { host.innerHTML = ''; return; }

    var open = !!S.empHistoryOpen;

    host.innerHTML =
      '<section class="role-group role-history shadow-level-1 shrink-0 !mt-0' + (open ? '' : ' is-collapsed') + '" data-emp-history>' +
        '<div class="role-group-head !px-space-lg !py-space-md" onclick="MGI.toggleEmpHistory()" title="Click to expand or collapse history">' +
          '<span class="material-symbols-outlined text-[22px] text-text-secondary" data-chevron>' +
            (open ? 'expand_less' : 'expand_more') + '</span>' +
          '<span class="material-symbols-outlined text-[22px] text-text-muted">history</span>' +
          '<h2 class="text-title-lg text-text-secondary">KPI History (Inactive)</h2>' +
          '<span class="pill pill-neutral !text-[11px]">' + list.length + ' KPI</span>' +
          '<span class="ml-auto text-label-xs text-text-muted">Read only</span>' +
        '</div>' +
        '<div class="role-group-body !p-0 !gap-0">' +
          '<div class="mx-space-lg mt-space-md mb-4 flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">' +
            '<span class="material-symbols-outlined text-[20px] shrink-0">history</span>' +
            '<span>KPIs from previous roles that Admin / HR deactivated and that have no data for this period.</span>' +
          '</div>' +
          '<div class="table-scroll">' +
            '<table class="data-table min-w-[860px]">' +
              '<thead><tr>' +
                '<th class="min-w-[260px]">KPI Code &amp; Name</th>' +
                '<th>Role</th>' +
                '<th class="text-center">Weight</th>' +
                '<th class="text-center">Target</th>' +
                '<th class="text-center">Unit</th>' +
                '<th class="text-center">Duration</th>' +
                '<th class="text-right">Last Submitted</th>' +
              '</tr></thead>' +
              '<tbody>' +
                list.map(function (h) {
                  var last = 'Never';
                  if (h.lastPeriod) {
                    var pp = h.lastPeriod.split('_');
                    var mm = MONTHS[parseInt(pp[1], 10) - 1];
                    last = mm ? mm + ' ' + pp[0] : h.lastPeriod;
                  }
                  return '<tr class="kpi-inactive">' +
                    '<td><div class="flex flex-col">' +
                      '<div class="flex items-center gap-2 flex-wrap">' +
                        '<span class="text-label-xs font-bold text-text-secondary bg-surface-page px-2 py-0.5 rounded border border-border-light">' +
                          esc(h.KPI_ID) + '</span>' +
                        '<span class="text-label-md text-text-primary font-semibold">' + esc(h.KPI_Name) + '</span>' +
                      '</div>' +
                      (h.Metrics ? '<span class="text-body-sm text-text-muted mt-1">' + esc(h.Metrics) + '</span>' : '') +
                    '</div></td>' +
                    '<td><span class="whitespace-nowrap text-label-sm text-text-secondary">' + esc(h.RoleLabel) + '</span></td>' +
                    '<td class="text-center text-code-num">' + pct(h.WeightPercent) + '</td>' +
                    '<td class="text-center text-code-num">' + esc(targetLabel(h)) + '</td>' +
                    '<td class="text-center text-label-xs">' + esc(h.Unit || '-') + '</td>' +
                    '<td class="text-center">' + durationPill(h.Duration) + '</td>' +
                    '<td class="text-right text-label-sm text-text-secondary whitespace-nowrap">' + esc(last) + '</td>' +
                  '</tr>';
                }).join('') +
              '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>' +
      '</section>';
  }

  function toggleEmpRole(key) {
    S.empCollapsed[key] = !S.empCollapsed[key];
    var sec = roleEl('data-role-section', key);
    if (!sec) return;
    sec.classList.toggle('is-collapsed', !!S.empCollapsed[key]);
    var chev = sec.querySelector('[data-chevron]');
    if (chev) chev.textContent = S.empCollapsed[key] ? 'expand_more' : 'expand_less';
  }

  function toggleEmpHistory() {
    S.empHistoryOpen = !S.empHistoryOpen;
    var sec = document.querySelector('[data-emp-history]');
    if (!sec) return;
    sec.classList.toggle('is-collapsed', !S.empHistoryOpen);
    var chev = sec.querySelector('[data-chevron]');
    if (chev) chev.textContent = S.empHistoryOpen ? 'expand_less' : 'expand_more';
  }

  function statCard(label, icon, valueClass, value, valueSuffix, caption, barClass, barPct) {
    return '' +
      '<div class="bg-surface-card rounded-xl p-5 shadow-level-1 border border-border-light flex flex-col justify-between transition-all duration-150 hover:shadow-level-2">' +
        '<div class="flex items-center justify-between gap-3 mb-3">' +
          '<span class="text-sm font-medium text-slate-500">' + esc(label) + '</span>' +
          '<div class="w-9 h-9 rounded-lg bg-slate-50 ring-1 ring-slate-200/70 flex items-center justify-center text-slate-600">' +
            '<span class="material-symbols-outlined text-[20px]">' + icon + '</span>' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<div class="flex items-baseline gap-2 flex-wrap">' +
            '<span class="text-[28px] leading-9 font-bold tracking-tight ' + valueClass + '">' + value + '</span>' +
            (valueSuffix ? '<span class="text-sm font-medium text-slate-500">' + esc(valueSuffix) + '</span>' : '') +
          '</div>' +
          '<p class="text-body-sm text-text-muted mt-1">' + caption + '</p>' +
        '</div>' +
        (barClass
          ? '<div class="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">' +
              '<div class="' + barClass + ' h-full rounded-full transition-all duration-500" style="width:' +
                Math.max(0, Math.min(100, barPct)) + '%"></div>' +
            '</div>'
          : '<div class="h-1.5 mt-4" aria-hidden="true"></div>') +
      '</div>';
  }

  function durationPill(duration, compact) {
    var quarterly = String(duration || '').toLowerCase() === 'quarterly';
    return '<span class="pill ' + (quarterly ? 'pill-info' : 'pill-neutral') +
      (compact ? ' !py-0 !px-2 !text-[11px]' : ' !text-[11px]') + '"' +
      ' title="' + (quarterly ? 'Filled at the end of each quarter' : 'Filled every month') + '">' +
      '<span class="material-symbols-outlined ' + (compact ? 'text-[12px]' : 'text-[14px]') + '">' +
        (quarterly ? 'date_range' : 'event_repeat') + '</span>' +
      esc(duration || 'Monthly') + '</span>';
  }

  function rowMyKpi(item, i) {
    var locked = !item.Editable;
    var lockReason = item.ChangeLocked
      ? 'No changes left this month. Ask HR / Admin to allow another change.'
      : item.IsActive === false
      ? 'Inactive KPI: history only'
      : !item.InCycle
        ? 'KPI ' + item.Duration + ': not in cycle this month, scored 1.0 automatically once you submit this role'
        : 'Submission period is locked';

    return '' +
      '<tr data-mapping="' + esc(item.Mapping_ID) + '">' +
        '<td class="kpi-no text-center text-code-num text-text-muted">' + (i + 1) + '</td>' +
        '<td class="kpi-name">' +
          '<div class="flex flex-col">' +
            '<div class="flex items-center gap-2 flex-wrap">' +
              '<span class="text-label-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">' +
                esc(item.KPI_ID) + '</span>' +
              '<span class="text-title-md text-text-primary">' + esc(item.KPI_Name) + '</span>' +
              (item.IsActive === false ? '<span class="pill pill-neutral !py-0 !text-[11px]">Inactive</span>' : '') +
            '</div>' +
            (item.Metrics ? '<span class="text-body-sm text-text-muted mt-1">' + esc(item.Metrics) + '</span>' : '') +
          '</div>' +
        '</td>' +
        '<td class="kpi-weight text-center" data-label="Weight"><span class="text-code-num font-bold text-text-primary">' + pct(item.WeightPercent) + '</span></td>' +
        '<td class="kpi-unit text-center" data-label="Unit">' +
          '<span class="inline-block max-w-full truncate align-middle text-label-xs px-2.5 py-1 rounded bg-surface-page text-text-secondary border border-border-light" title="' + esc(item.Unit || '-') + '">' +
            esc(item.Unit || '-') + '</span>' +
        '</td>' +
        '<td class="kpi-duration text-center" data-label="Duration">' + durationPill(item.Duration) + '</td>' +
        '<td class="kpi-target text-center" data-label="Target" title="' + esc(targetHint(item)) + '">' +
          targetCell(item) +
          '<span class="inline-flex items-center gap-0.5 text-[11px] font-semibold ' + labelMeta(item.Label).text + '">' +
            '<span class="material-symbols-outlined text-[12px]">' + labelMeta(item.Label).icon + '</span>' + labelMeta(item.Label).short + '</span>' +
        '</td>' +
        '<td class="kpi-input relative" data-label="Realization">' +
          '<div class="input-group' + (locked ? ' is-disabled' : '') + '"' + (locked ? ' title="' + esc(lockReason) + '"' : '') + '>' +
            '<input type="text" inputmode="decimal" autocomplete="off" class="input-realization text-right text-code-num text-text-primary font-bold' +
              realizationClass(formatNumValue(item.Realization)) + '"' +
              ' value="' + esc(formatNumValue(item.Realization)) + '"' +
              ' placeholder="' + (locked ? 'Locked' : 'Enter value') + '"' +
              (locked ? ' disabled' : '') +
              ' aria-label="Realization for ' + esc(item.KPI_Name) + '"' +
              ' oninput="MGI.onRealisasiInput(this, event)" data-mapping="' + esc(item.Mapping_ID) + '">' +
            (item.Unit ? '<span class="input-group-addon" title="' + esc(item.Unit) + '">' + esc(item.Unit) + '</span>' : '') +
          '</div>' +
          '<p class="absolute left-3 right-3 bottom-0.5 text-right text-[11px] font-semibold text-text-muted truncate pointer-events-none" data-hint-for="' + esc(item.Mapping_ID) + '">' +
            esc(scaleHint(item.Realization)) + '</p>' +
        '</td>' +
        '<td class="kpi-status text-right" data-label="Status"><span class="flex justify-end min-w-0" data-status-for="' + esc(item.Mapping_ID) + '">' + statusPill(item) + '</span></td>' +
      '</tr>';
  }

  function scaleHint(v) {
    var n = typeof v === 'number' ? v : parseNumText(v);
    if (n === null || n === undefined || isNaN(n) || Math.abs(n) < 1000000) return '';
    return '≈ ' + compactNum(n);
  }

  function statusPill(item, liveRealization) {
    if (!item.InCycle) {
      var auto = !!item.AutoScore && isNum(item.Score);
      var offTitle = auto ? 'Quarterly KPI outside its quarter month, scored ' + Number(item.Score).toFixed(1) + ' automatically'
                   : item.IsActive === false ? '' : 'Scored 1.0 automatically after you submit this role';
      var offPill = '<span class="pill pill-neutral"' + (offTitle ? ' title="' + esc(offTitle) + '"' : '') + '>' +
        '<span class="material-symbols-outlined text-[14px]">lock</span> Off-Cycle</span>';
      return auto
        ? '<span class="inline-flex items-center justify-end gap-1.5 max-w-full min-w-0">' + offPill + tierChip(item.Score) + '</span>'
        : offPill;
    }

    var saved = isNum(item.Realization) ? item.Realization : null;
    var typed = liveRealization === undefined ? null : String(liveRealization);
    var value = typed === null ? saved : parseNumText(typed);

    if (value === null || value === undefined || value === '') {
      return '<span class="pill pill-warning"><span class="material-symbols-outlined text-[14px]">pending</span> Not Filled</span>';
    }
    if (isNaN(value)) {
      return '<span class="pill pill-danger"><span class="material-symbols-outlined text-[14px]">error</span> Not a number</span>';
    }
    if (tooLarge(value)) {
      return '<span class="pill pill-danger" title="Realization must stay between -' + esc(num(maxRealization(), 0)) + ' and ' + esc(num(maxRealization(), 0)) + '">' +
        '<span class="material-symbols-outlined text-[14px]">error</span> Too large</span>';
    }
    if (saved === null) {
      return '<span class="pill pill-info" title="Your score appears after you submit"><span class="material-symbols-outlined text-[14px]">edit_note</span> Ready to submit</span>';
    }
    if (typed !== null && Math.abs(value - saved) > 1e-9) {
      return '<span class="pill pill-info" title="Submit to update your score"><span class="material-symbols-outlined text-[14px]">edit</span> Changed, not submitted</span>';
    }

    var score = isNum(item.Score) ? item.Score : null;
    if (score === null) {
      return '<span class="pill pill-success"><span class="material-symbols-outlined text-[14px]">check_circle</span> Submitted</span>';
    }
    var ach = isNum(item.Achievement) ? item.Achievement : null;
    var tone = score >= 0.8 ? 'success' : score >= 0.6 ? 'info' : score >= 0.4 ? 'warning' : 'danger';
    var icon = score >= 0.8 ? 'trending_up' : score >= 0.4 ? 'trending_flat' : 'trending_down';
    var word = score >= 0.8 ? 'Achieved' : score >= 0.6 ? 'Close' : score >= 0.4 ? 'Below' : 'Critical';
    var achText = ach === null ? '-' : ach > 999 ? '>999%' : ach < -999 ? '<-999%' : pct(ach, 0);
    var title = 'Submitted realization ' + num(saved, 2) + (item.Unit ? ' ' + item.Unit : '') +
                ', achievement ' + (ach === null ? '-' : num(ach, 1) + '%') + ', tier score ' + score.toFixed(1);

    return '<span class="inline-flex items-center justify-end gap-1.5 max-w-full min-w-0" title="' + esc(title) + '">' +
             '<span class="pill pill-' + tone + ' min-w-0">' +
               '<span class="material-symbols-outlined text-[14px]">' + icon + '</span>' +
               '<span class="truncate">' + word + ' • ' + esc(achText) + '</span>' +
             '</span>' +
             tierChip(score) +
           '</span>';
  }

  function inputFor(item) {
    return document.querySelector('input[data-mapping="' + attr(item.Mapping_ID) + '"]');
  }

  function itemChanged(item) {
    var input = inputFor(item);
    if (!input) return false;
    var value = parseNumText(input.value);
    var saved = isNum(item.Realization) ? item.Realization : null;
    if (value === null) return saved !== null;
    if (isNaN(value)) return true;
    return saved === null || Math.abs(value - saved) > 1e-9;
  }

  function roleChanges(role) {
    return role && role.changes ? role.changes : { submitted: false, used: 0, allowed: 2, left: 2 };
  }

  function roleChangeLocked(role) {
    var c = roleChanges(role);
    return !!c.submitted && c.left <= 0;
  }

  function roleDirty(role) {
    if (S.pendingFiles[role.key]) return true;
    return (role.items || []).some(function (item) { return item.Editable && itemChanged(item); });
  }

  function changesWord(n) {
    return n === 1 ? 'once' : n === 2 ? 'twice' : n + ' times';
  }

  function applyChangeLocks(d) {
    var locked = {};
    (d.roles || []).forEach(function (r) {
      if (!roleChangeLocked(r)) return;
      r.items.forEach(function (it) { locked[it.Mapping_ID] = true; });
    });
    var mark = function (it) {
      if (locked[it.Mapping_ID] && it.Editable) {
        it.Editable = false;
        it.ChangeLocked = true;
      }
    };
    (d.items || []).forEach(mark);
    (d.roles || []).forEach(function (r) { (r.items || []).forEach(mark); });
  }

  function onRealisasiInput(input, ev) {
    liveFormatInput(input, ev);
    if (input.classList) input.classList.toggle('is-long', !!realizationClass(input.value));
    var mappingId = input.dataset.mapping;
    var item = S.dashboard.items.filter(function (x) { return x.Mapping_ID === mappingId; })[0];
    if (!item) return;

    var holder = document.querySelector('[data-status-for="' + attr(mappingId) + '"]');
    if (holder) holder.innerHTML = statusPill(item, input.value);
    var hint = document.querySelector('[data-hint-for="' + attr(mappingId) + '"]');
    if (hint) hint.textContent = scaleHint(input.value);

    renderTableFooter(item.RoleKey);
    renderRoleSubmit(item.RoleKey);
  }

  function renderTableFooter(roleKey) {
    var role = findRole(roleKey);
    var foot = roleEl('data-role-footer', roleKey);
    if (!role || !foot) return;

    var c = roleChanges(role);
    var scored = role.items.some(function (it) { return isNum(it.Score); });
    if (!c.submitted && !scored) {
      foot.innerHTML =
        '<p class="text-body-sm text-text-muted flex items-center gap-1.5">' +
          '<span class="material-symbols-outlined text-[16px]">info</span> Your score and index appear after you submit.' +
        '</p>';
      return;
    }

    var dirty = role.items.some(function (it) { return it.Editable && itemChanged(it); });
    foot.innerHTML =
      '<p class="text-body-sm text-text-muted flex items-center gap-1.5">' +
        (dirty
          ? '<span class="material-symbols-outlined text-[16px] text-status-info">edit_note</span> Your changes count after you submit. The index shows your last submission.'
          : '<span class="material-symbols-outlined text-[16px]">info</span> Role index = Σ (Weight × Tier Score) × 100, calculated when you submit.') +
      '</p>';
  }

  function receiptHtml(r) {
    var d = S.dashboard;
    var ps = d.periodState || {};
    var c = roleChanges(r);
    var b = band(r.index);
    var tone = b.key === 'success' ? 'text-status-success-text' : b.key === 'info' ? 'text-status-info-text' : 'text-status-danger-text';
    var sent = c.lastAt || (r.evidence && r.evidence.Uploaded_At) || '';
    var stamp = sent ? dashStamp(sent) : '';
    var note = !ps.isOpen
      ? (ps.rawOpen && ps.expired ? 'Closed on ' + longDate(ps.cutoff) + '.' : 'This period is locked.') + ' Ask HR / Admin if something needs to change.'
      : c.left <= 0
        ? 'No changes left for ' + MONTHS[d.month - 1] + '. Ask HR / Admin if something still needs to change.'
        : 'Need to fix something? Edit a value or replace the file, then submit again. You can change it ' +
          changesWord(c.left) + ' until ' + longDate(ps.cutoff) + '.';
    return '<div class="submit-receipt" role="status">' +
      '<span class="submit-receipt-icon" aria-hidden="true"><span class="material-symbols-outlined">check_circle</span></span>' +
      '<div class="min-w-0 flex-1">' +
        '<p class="submit-receipt-title">Submitted for ' + esc(MONTHS[d.month - 1] + ' ' + d.year) + '</p>' +
        '<p class="submit-receipt-meta">' + (stamp ? 'Last sent ' + esc(stamp) + ' • ' : '') + 'Declaration confirmed</p>' +
        '<p class="submit-receipt-note">' + esc(note) + '</p>' +
      '</div>' +
      '<div class="submit-receipt-score">' +
        '<span class="submit-receipt-label">Submitted Index</span>' +
        '<span class="submit-receipt-value ' + tone + '">' + num(r.index) + '</span>' +
        '<span class="pill pill-' + b.key + '">' + b.label + '</span>' +
      '</div>' +
    '</div>';
  }

  function discardRoleChanges(roleKey) {
    var role = findRole(roleKey);
    if (!role) return;
    delete S.pendingFiles[roleKey];
    var file = roleEl('data-role-file', roleKey);
    if (file) file.value = '';
    role.items.forEach(function (item) {
      if (!item.Editable) return;
      var input = inputFor(item);
      if (!input) return;
      input.value = formatNumValue(item.Realization);
      if (input.classList) input.classList.toggle('is-long', !!realizationClass(input.value));
      var holder = document.querySelector('[data-status-for="' + attr(item.Mapping_ID) + '"]');
      if (holder) holder.innerHTML = statusPill(item);
      var hint = document.querySelector('[data-hint-for="' + attr(item.Mapping_ID) + '"]');
      if (hint) hint.textContent = scaleHint(item.Realization);
    });
    var declare = roleEl('data-role-declare', roleKey);
    if (declare) declare.checked = false;
    renderEvidence(roleKey);
    renderTableFooter(roleKey);
    renderRoleSubmit(roleKey);
  }

  function celebrateSubmit() {
    var key = S.justSubmitted;
    S.justSubmitted = '';
    if (!key) return;
    var box = roleEl('data-role-receipt', key);
    var shown = !!box && !box.classList.contains('hidden');
    var target = shown ? box : roleEl('data-role-section', key);
    if (!target) return;
    var calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (target.scrollIntoView) target.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
    if (!shown) return;
    box.classList.add('is-fresh');
    setTimeout(function () { box.classList.remove('is-fresh'); }, 1800);
  }

  function wireDropzone(roleKey) {
    var zone = roleEl('data-role-dropzone', roleKey);
    var input = roleEl('data-role-file', roleKey);
    if (!zone || !input) return;

    zone.onclick = function () { input.click(); };
    input.onclick = function (e) { e.stopPropagation(); };
    input.onchange = function () { if (input.files[0]) acceptFile(roleKey, input.files[0]); };

    ['dragenter', 'dragover'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) {
        e.preventDefault(); zone.classList.add('is-dragging');
      });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) {
        e.preventDefault(); zone.classList.remove('is-dragging');
      });
    });
    zone.addEventListener('drop', function (e) {
      if (e.dataTransfer.files[0]) acceptFile(roleKey, e.dataTransfer.files[0]);
    });
  }

  function acceptFile(roleKey, file) {
    var ext = file.name.split('.').pop().toLowerCase();
    if (S.user.allowedExt.indexOf(ext) === -1) {
      toast('File type .' + ext + ' is not allowed. Use: ' +
            S.user.allowedExt.join(', ').toUpperCase() + '.', 'error');
      return;
    }
    if (file.size > S.user.maxFileMb * 1024 * 1024) {
      toast('File size ' + (file.size / 1048576).toFixed(1) + ' MB exceeds the limit of ' +
            S.user.maxFileMb + ' MB.', 'error');
      return;
    }

    var reader = new FileReader();
    reader.onload = function () {
      S.pendingFiles[roleKey] = {
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        bytes:    reader.result.split(',')[1],
        sizeMb:   Math.round(file.size / 1048576 * 100) / 100
      };
      renderEvidence(roleKey); renderRoleSubmit(roleKey);
      var role = findRole(roleKey);
      toast('File ready to upload for ' + (role ? role.label : 'this role') + ': ' + file.name, 'success');
    };
    reader.onerror = function () { toast('Could not read the file. Please try again.', 'error'); };
    reader.readAsDataURL(file);
  }

  function clearFile(roleKey) {
    delete S.pendingFiles[roleKey];
    var input = roleEl('data-role-file', roleKey);
    if (input) input.value = '';
    renderEvidence(roleKey); renderRoleSubmit(roleKey);
  }

  function renderEvidence(roleKey) {
    var role = findRole(roleKey);
    var statusEl = roleEl('data-role-evstatus', roleKey);
    var box = roleEl('data-role-preview', roleKey);
    if (!role || !statusEl || !box) return;

    var pending = S.pendingFiles[roleKey];
    var saved = role.evidence;

    statusEl.innerHTML = !saved
      ? (evidenceOptional()
          ? '<span class="pill pill-neutral" title="Evidence is optional in FY' + esc(S.dashboard.year) + '"><span class="material-symbols-outlined text-[14px]">cloud_off</span> Optional</span>'
          : '<span class="pill pill-neutral"><span class="material-symbols-outlined text-[14px]">cloud_off</span> No Evidence Yet</span>')
      : saved.legacy
        ? '<span class="pill pill-neutral"><span class="material-symbols-outlined text-[14px]">inventory_2</span> Combined evidence (legacy)</span>'
        : '<span class="pill pill-' + (saved.Status === 'Revised' ? 'warning' : 'success') + '">' +
            '<span class="material-symbols-outlined text-[14px]">cloud_done</span> ' + esc(saved.Status) + '</span>';

    if (!pending && !saved) { box.classList.add('hidden'); box.innerHTML = ''; return; }
    box.classList.remove('hidden');

    var name = pending ? pending.fileName : saved.File_Name;
    var meta = pending
      ? pending.sizeMb + ' MB • Ready to submit'
      : saved.legacy
        ? 'Uploaded ' + fmtDate(saved.Uploaded_At) + '. Legacy combined evidence, valid until replaced per role.'
        : 'Uploaded ' + fmtDate(saved.Uploaded_At) + ' • Status: ' + saved.Status;

    box.innerHTML =
      '<div class="flex items-center justify-between gap-space-md p-space-md bg-surface-page rounded-lg border border-border-light">' +
        '<div class="flex items-center gap-space-sm min-w-0">' +
          '<span class="material-symbols-outlined text-primary-container">description</span>' +
          '<div class="flex flex-col min-w-0">' +
            '<span class="text-body-md font-semibold text-text-primary truncate">' + esc(name) + '</span>' +
            '<span class="text-body-sm text-text-muted">' + esc(meta) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="flex items-center gap-space-xs shrink-0">' +
          (saved && !pending
            ? '<a href="' + esc(saved.File_URL) + '" target="_blank" rel="noopener" class="btn btn-secondary !py-1.5 !px-3 !text-label-sm">' +
              '<span class="material-symbols-outlined text-[16px]">visibility</span> View</a>'
            : '') +
          (pending
            ? '<button class="btn-trash" onclick="MGI.clearFile(\'' + esc(roleKey) + '\')" title="Remove file">' +
              '<span class="material-symbols-outlined text-[20px]">close</span></button>'
            : '') +
        '</div>' +
      '</div>' +
      (pending && saved
        ? '<p class="text-body-sm text-status-warning-text mt-2 flex items-center gap-1.5">' +
          '<span class="material-symbols-outlined text-[15px]">warning</span> ' +
          (saved.legacy
            ? 'This file becomes the evidence for this role only. The legacy combined evidence stays valid for other roles.'
            : 'The previous file for this role will be moved to Trash and replaced by this new file.') +
          '</p>'
        : '');
  }

  function renderSubmitState() {
    var d = S.dashboard;
    if (!d) return;
    var ps = d.periodState;
    var open = ps.isOpen;

    var status = $('emp-period-status');
    if (status) {
      var countdown = open ? cutoffCountdown(ps.cutoff, Date.now()) : null;
      status.innerHTML = '<span class="flex flex-wrap items-center gap-2">' +
        (open
          ? '<span class="pill pill-success"><span class="w-2 h-2 rounded-full bg-status-success"></span> ' +
            esc(periodStatusText(ps)) + '</span>'
          : '<span class="pill pill-neutral"><span class="material-symbols-outlined text-[14px]">lock</span> ' +
            esc(periodStatusText(ps)) + '</span>') +
        (countdown
          ? '<span class="pill pill-' + countdown.tone + '"><span class="material-symbols-outlined text-[14px]">' + countdown.icon + '</span> ' +
            countdown.label + '</span>'
          : '') +
      '</span>';
    }

    (d.roles || []).forEach(function (r) { renderRoleSubmit(r.key); });
  }

  function roleSubmitReadiness(role) {
    var missing = [];
    var required = 0;
    (role.items || []).forEach(function (item) {
      if (item.IsActive === false || item.Duration !== 'Monthly') return;
      required++;
      var input = document.querySelector('input[data-mapping="' + attr(item.Mapping_ID) + '"]');
      var raw = input ? parseNumText(input.value) : item.Realization;
      if (raw === '' || raw === null || raw === undefined || isNaN(raw)) missing.push(item);
    });
    var hasEvidence = !!S.pendingFiles[role.key] || !!role.evidence;
    var optional = evidenceOptional();
    return { ok: !missing.length && (hasEvidence || optional), missing: missing, hasEvidence: hasEvidence, evidenceOptional: optional, required: required };
  }

  function readinessMessage(ready) {
    var parts = [];
    if (ready.missing.length) {
      parts.push('fill ' + ready.missing.length + (ready.missing.length === 1 ? ' monthly KPI' : ' monthly KPIs'));
    }
    if (!ready.hasEvidence && !ready.evidenceOptional) parts.push('attach the evidence file');
    return parts.join(' and ');
  }

  function renderRoleSubmit(roleKey) {
    var d = S.dashboard;
    var r = findRole(roleKey);
    if (!d || !r || r.inactiveRole) return;

    var ps = d.periodState;
    var open = ps.isOpen;
    var ready = roleSubmitReadiness(r);
    var btn = roleEl('data-role-submit', r.key);
    var hint = roleEl('data-role-hint', r.key);
    var declare = roleEl('data-role-declare', r.key);

    var changes = roleChanges(r);
    var dirty = roleDirty(r);
    var unchanged = changes.submitted && !dirty;
    var settled = unchanged && ready.ok;
    var receipt = roleEl('data-role-receipt', r.key);
    var form = roleEl('data-role-form', r.key);
    if (receipt) {
      receipt.innerHTML = settled ? receiptHtml(r) : '';
      receipt.classList.toggle('hidden', !settled);
    }
    if (form) form.classList.toggle('hidden', settled);
    var discard = roleEl('data-role-discard', r.key);
    if (discard) discard.classList.toggle('hidden', !(open && changes.submitted && dirty));
    var label = roleEl('data-role-submit-label', r.key);
    if (label) label.textContent = changes.submitted ? 'Submit changes' : 'Submit ' + r.label;
    if (btn) btn.disabled = !open || !ready.ok || unchanged;
    if (declare) declare.disabled = !open;
    var steps = roleEl('data-role-steps', r.key);
    if (steps) steps.innerHTML = roleStepsHtml(ready, !!(declare && declare.checked), open);
    renderTableFooter(r.key);
    if (!hint) return;

    hint.innerHTML = !open
      ? '<span class="material-symbols-outlined text-[16px] text-text-muted">lock</span> ' + esc(periodStatusText(ps)) + '.'
      : !ready.ok
        ? '<span class="material-symbols-outlined text-[16px] text-status-warning">pending_actions</span> ' +
          'Almost there: ' + esc(readinessMessage(ready)) + '.'
        : unchanged
          ? '<span class="material-symbols-outlined text-[16px] text-status-success">task_alt</span> ' +
            'Submitted. Nothing has changed since your last submission.'
          : changes.submitted
            ? '<span class="material-symbols-outlined text-[16px] text-status-info">history</span> ' +
              (changes.left === 1
                ? 'Ready to submit. This is your last change for ' + esc(MONTHS[d.month - 1]) + '.'
                : 'Ready to submit. This uses 1 of your ' + changes.left + ' changes left.')
            : '<span class="material-symbols-outlined text-[16px] text-status-success">task_alt</span> ' +
              'Ready to submit. ' + esc(periodStatusText(ps)) + '. After that you can still change it ' + changesWord(changes.left) + '.';
  }

  function collectDrafts(exceptKey) {
    var drafts = {};
    ((S.dashboard && S.dashboard.items) || []).forEach(function (item) {
      if (item.RoleKey === exceptKey || !item.Editable) return;
      var input = document.querySelector('input[data-mapping="' + attr(item.Mapping_ID) + '"]');
      if (!input) return;
      var serverValue = item.Realization === null || item.Realization === undefined || item.Realization === '' ? null : Number(item.Realization);
      if (String(parseNumText(input.value)) !== String(serverValue)) drafts[item.Mapping_ID] = input.value;
    });
    return drafts;
  }

  function applyDrafts(drafts) {
    Object.keys(drafts).forEach(function (mappingId) {
      var input = document.querySelector('input[data-mapping="' + attr(mappingId) + '"]');
      if (!input || input.disabled) return;
      input.value = drafts[mappingId];
      onRealisasiInput(input);
    });
  }

  function collectDeclares(exceptKey) {
    var out = {};
    ((S.dashboard && S.dashboard.roles) || []).forEach(function (r) {
      if (r.key === exceptKey) return;
      var box = roleEl('data-role-declare', r.key);
      if (box && box.checked) out[r.key] = true;
    });
    return out;
  }

  function applyDeclares(map) {
    Object.keys(map).forEach(function (key) {
      var box = roleEl('data-role-declare', key);
      if (box && !box.disabled) box.checked = true;
    });
  }

  function submitRole(roleKey) {
    var d = S.dashboard;
    var role = findRole(roleKey);
    if (!role || role.inactiveRole) return;

    var ready = roleSubmitReadiness(role);
    if (!ready.ok) {
      toast('Before submitting ' + role.label + ', ' + readinessMessage(ready) + '.', 'warning');
      renderRoleSubmit(roleKey);
      return;
    }

    var declare = roleEl('data-role-declare', roleKey);
    if (!declare || !declare.checked) {
      toast('Please tick the declaration for ' + role.label + ' before submitting.', 'warning');
      if (declare && declare.focus) declare.focus();
      return;
    }

    var changes = roleChanges(role);
    if (changes.submitted && !roleDirty(role)) {
      toast('Nothing has changed since your last submission for ' + role.label + '.', 'info');
      return;
    }

    var records = [];
    var invalid = [];
    var huge = [];
    role.items.forEach(function (item) {
      if (!item.Editable) return;
      var input = document.querySelector('input[data-mapping="' + attr(item.Mapping_ID) + '"]');
      var value = input ? parseNumText(input.value) : null;
      if (value === null) return;
      if (isNaN(value)) {
        invalid.push(item.KPI_Name || item.KPI_ID);
        return;
      }
      if (tooLarge(value)) {
        huge.push(item.KPI_Name || item.KPI_ID);
        return;
      }
      records.push({ Mapping_ID: item.Mapping_ID, Realization: value });
    });

    if (invalid.length) {
      toast('Realization is not a valid number for: ' + invalid.join(', ') + '.', 'error');
      return;
    }
    if (huge.length) {
      toast('Realization is too large for: ' + huge.join(', ') + '. The limit is ' + num(maxRealization(), 0) + '.', 'error');
      return;
    }

    var pending = S.pendingFiles[roleKey] || null;

    if (!records.length && !pending) {
      toast('Enter at least one realization or upload an evidence document for ' + role.label + '.', 'warning');
      return;
    }

    var fileData = pending ? {
      fileName:   pending.fileName,
      mimeType:   pending.mimeType,
      bytes:      pending.bytes,
      position:   role.position,
      department: role.department
    } : null;

    var keepFiles = {};
    Object.keys(S.pendingFiles).forEach(function (k) {
      if (k !== roleKey) keepFiles[k] = S.pendingFiles[k];
    });
    var keep = { drafts: collectDrafts(roleKey), files: keepFiles, declares: collectDeclares(roleKey) };
    var job = { roleKey: roleKey, period: d.period, records: records, fileData: fileData, keep: keep };

    if (changes.submitted && changes.left === 1) {
      S.submitConfirm = job;
      $('modal-host').innerHTML =
        '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closeLastChange()">' +
          '<div class="modal-panel !max-w-md">' +
            '<div class="px-6 pt-6 pb-5 flex items-start gap-4">' +
              '<span class="w-10 h-10 rounded-full bg-status-warning-subtle text-status-warning flex items-center justify-center shrink-0">' +
                '<span class="material-symbols-outlined text-[22px]">history</span></span>' +
              '<div class="min-w-0">' +
                '<h2 class="text-title-lg text-text-primary">Use your last change for ' + esc(role.label) + '?</h2>' +
                '<p class="text-body-sm text-text-secondary mt-1">After this, only HR / Admin can allow another change for ' +
                  esc(MONTHS[d.month - 1] + ' ' + d.year) + '. Check your values and file once more before you send them.</p>' +
              '</div>' +
            '</div>' +
            '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex items-center justify-end gap-space-sm">' +
              '<button class="btn btn-secondary" onclick="MGI.closeLastChange()">Keep editing</button>' +
              '<button id="last-change-confirm" class="btn btn-primary" onclick="MGI.confirmLastChange()">' +
                '<span class="material-symbols-outlined text-[18px]">send</span> Submit changes</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      return;
    }

    sendRoleJob(job);
  }

  function closeLastChange() {
    S.submitConfirm = null;
    $('modal-host').innerHTML = '';
  }

  function confirmLastChange() {
    var job = S.submitConfirm;
    closeLastChange();
    if (job) sendRoleJob(job);
  }

  function sendRoleJob(job) {
    var role = findRole(job.roleKey);
    if (!role) return;
    var button = roleEl('data-role-submit', job.roleKey);
    var restore = busy(button, 'Submitting');
    var slow = setTimeout(function () {
      if (button && button.disabled) button.innerHTML = '<span class="spinner"></span> Still saving, please wait';
    }, SLOW_SUBMIT_MS);

    api('submitMonthlyKPI', S.user.NIK, job.period, job.records, job.fileData)
      .then(function (res) {
        clearTimeout(slow);
        restore();
        toast('Thank you, ' + displayName(S.user.Full_Name) + '. ' + role.label + ': ' + res.message, 'success');
        S.justSubmitted = job.roleKey;
        loadMyKpis(job.keep);
      })
      .catch(function (err) {
        clearTimeout(slow);
        restore();
        toast(err.message, 'error');
      });
  }

  function mapYear() {
    return S.mapYear || S.user.year;
  }

  function renderMapYears() {
    var sel = $('map-year');
    if (!sel) return;
    var years = ((S.overview && S.overview.years) || []).slice();
    [mapYear(), S.user.year].forEach(function (y) { if (years.indexOf(y) === -1) years.push(y); });
    years.sort(function (a, b) { return b - a; });
    sel.innerHTML = years.map(function (y) {
      return '<option value="' + y + '">FY' + y + (y === S.user.year ? ' (Active)' : y === S.user.year + 1 ? ' (Next)' : '') + '</option>';
    }).join('');
    sel.value = String(mapYear());
    renderMapYearNote();
  }

  function renderMapYearNote() {
    var host = $('map-year-note');
    if (!host) return;
    var year = mapYear();
    host.innerHTML = year > S.user.year
      ? '<div class="rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-2.5 text-body-sm text-blue-800 flex items-start gap-2">' +
          '<span class="material-symbols-outlined text-[18px]">event_upcoming</span>' +
          '<span>You are preparing <strong>FY' + year + '</strong>. Employees see these KPIs once FY' + year +
          ' becomes the active year in System Settings &gt; Fiscal Year.</span>' +
        '</div>'
      : '';
  }

  function onMapYearChange(value) {
    var year = parseInt(value, 10);
    var sel = $('map-year');
    if (!year || year === mapYear()) return;
    if (sel) sel.value = String(mapYear());
    guardUnsaved(function () {
      S.mapYear = year;
      if (sel) sel.value = String(year);
      renderMapYearNote();
      var reopen = S.mapping && !$('map-workspace').classList.contains('hidden') ? S.mapping.employee.NIK : '';
      loadOverview();
      if (reopen) onEmployeeSelect(reopen);
    });
  }

  function initMapping() {
    S.categories = null;
    renderMapYears();
    var reopen = S.mapping && !$('map-workspace').classList.contains('hidden')
      ? S.mapping.employee.NIK : '';
    loadOverview();
    if (reopen) onEmployeeSelect(reopen);
  }

  function loadOverview() {
    $('map-emp-list').innerHTML =
      '<div class="p-space-md"><div class="skeleton h-12 w-full"></div></div>';

    var year = mapYear();
    api('getMappingOverview', year)
      .then(function (data) {
        if (year !== mapYear()) return;
        S.overview = data;
        S.employees = data.rows;
        autoMapTab();
        renderMapYears();
        renderOverviewStats();
        renderEmployeeTabs();
        renderEmployeeList();
        renderSwitcher();
        if (S.bulk && !bulkGroup()) {
          var groups = data.roleGroups || [];
          var first = groups.filter(function (g) { return g.valid; })[0] || groups[0] || null;
          S.bulk.roleKey = first ? first.key : '';
          S.bulk.niks = {};
        }
        if (S.bulk && $('map-bulk') && !$('map-bulk').classList.contains('hidden')) renderBulkPage();
      })
      .catch(function (err) {
        $('map-emp-list').innerHTML =
          '<p class="p-space-lg text-center text-status-danger">' + esc(err.message) + '</p>';
        toast(err.message, 'error');
      });
  }

  function plural(n, one, many) {
    return n + ' ' + (n === 1 ? one : many || one + 's');
  }

  function renderOverviewStats() {
    var o = S.overview;
    var total = o.rows.length;

    $('map-overview-stats').innerHTML =
      statCard('Assigned', 'groups', 'text-text-primary',
        o.assignedCount, 'of ' + plural(total, 'employee'),
        o.unassignedCount ? plural(o.unassignedCount, 'employee') + ' still without KPIs' : 'Every active employee has KPIs',
        'bg-status-success', total ? o.assignedCount / total * 100 : 0) +

      statCard('Unassigned', 'person_alert', o.unassignedCount ? 'text-status-warning' : 'text-status-success',
        o.unassignedCount, o.unassignedCount === 1 ? 'Employee' : 'Employees',
        o.unassignedCount ? 'No active KPI mapping yet' : 'Nobody is waiting for KPIs',
        '', 0) +

      statCard('Weights to Fix', 'rule', o.incompleteCount ? 'text-status-danger' : 'text-status-success',
        o.incompleteCount, o.incompleteCount === 1 ? 'Employee' : 'Employees',
        o.incompleteCount ? 'Assigned, but a role is not at 100%' : 'Every role adds up to 100%',
        '', 0);
  }

  function mapTabCounts() {
    var o = S.overview || {};
    return { unassigned: o.unassignedCount || 0, incomplete: o.incompleteCount || 0, assigned: o.assignedCount || 0 };
  }

  function autoMapTab() {
    var counts = mapTabCounts();
    if (counts[S.mapTab] > 0) return;
    S.mapTab = counts.unassigned ? 'unassigned' : counts.incomplete ? 'incomplete' : 'assigned';
  }

  function renderEmployeeTabs() {
    var counts = mapTabCounts();
    var tabs = [
      { key: 'unassigned', label: 'Unassigned',     count: counts.unassigned },
      { key: 'incomplete', label: 'Weights to Fix', count: counts.incomplete },
      { key: 'assigned',   label: 'Assigned',       count: counts.assigned }
    ].filter(function (t) { return t.key !== 'incomplete' || t.count > 0 || S.mapTab === 'incomplete'; });

    $('map-tabs').innerHTML = tabs.map(function (t) {
      return '<button type="button" onclick="MGI.setMapTab(\'' + t.key + '\')" class="seg-btn' +
             (S.mapTab === t.key ? ' is-active' : '') + '">' +
             esc(t.label) + '<span class="seg-count">' + t.count + '</span></button>';
    }).join('');
  }

  function setMapTab(key) {
    S.mapTab = key;
    renderEmployeeTabs();
    renderEmployeeList();
  }

  function renderEmployeeList() {
    if (!S.overview) return;
    var q = ($('map-emp-search').value || '').toLowerCase();

    var rows = S.overview.rows.filter(function (r) {
      if (S.mapTab === 'unassigned' && r.hasMapping) return false;
      if (S.mapTab === 'assigned' && !r.hasMapping) return false;
      if (S.mapTab === 'incomplete' && (!r.hasMapping || r.allValid)) return false;
      if (!q) return true;
      return (r.Full_Name + ' ' + r.NIK + ' ' + r.Position + ' ' + r.Department + ' ' + (r.Email || ''))
              .toLowerCase().indexOf(q) > -1;
    });

    if (!rows.length) {
      $('map-emp-list').innerHTML =
        '<div class="p-space-2xl text-center">' +
          '<span class="material-symbols-outlined text-[40px] text-text-muted">' +
            (q ? 'search_off' : 'task_alt') + '</span>' +
          '<p class="text-body-md text-text-secondary mt-2">' +
            (q ? 'No employees match your search.'
               : S.mapTab === 'unassigned'
                   ? 'Every active employee already has a KPI mapping.'
                   : S.mapTab === 'incomplete'
                     ? 'Every assigned role adds up to 100%.'
                     : 'No employees have been assigned yet.') + '</p>' +
        '</div>';
      return;
    }

    $('map-emp-list').innerHTML = rows.map(function (r) {
      var badge = !r.hasMapping
        ? '<span class="pill pill-warning">No KPIs yet</span>'
        : r.allValid
          ? '<span class="pill pill-success"><span class="material-symbols-outlined text-[14px]">check_circle</span> ' +
            plural(r.roleCount, 'role') + ', weights complete</span>'
          : '<span class="pill pill-danger"><span class="material-symbols-outlined text-[14px]">error</span> ' +
            'Weights not at 100%</span>';

      var groupChips = r.groups.map(function (g) {
        return '<span class="pill ' + (g.valid ? 'pill-neutral' : 'pill-danger') + ' !text-[11px]">' +
               esc(g.label) + ' ' + g.percent + '%</span>';
      }).join('');

      return '<div class="emp-row">' +
        '<button type="button" class="emp-row-main" onclick="MGI.openWorkspace(\'' + esc(r.NIK) + '\')">' +
          '<span class="emp-avatar">' + esc(r.Initials) + '</span>' +
          '<span class="flex flex-col min-w-0 flex-1">' +
            '<span class="text-body-md font-bold text-text-primary truncate">' + esc(r.Full_Name) + '</span>' +
            '<span class="text-label-xs text-text-muted truncate">' + esc(r.NIK) + ' • ' +
              esc(r.Position) + ' / ' + esc(r.Department) + '</span>' +
            emailLine(r.Email) +
            (groupChips ? '<span class="flex flex-wrap gap-1 mt-1">' + groupChips + '</span>' : '') +
          '</span>' +
        '</button>' +
        '<span class="flex items-center gap-space-sm shrink-0">' + (r.account ? accountPill(r.account) : '') + badge +
          (r.hasMapping ? resetButton(r, true) : '') +
          '<span class="material-symbols-outlined text-text-muted" aria-hidden="true">chevron_right</span></span>' +
      '</div>';
    }).join('');
  }

  function emailLine(email) {
    return email
      ? '<span class="flex items-center gap-1 min-w-0 text-label-xs text-text-secondary">' +
          '<span class="material-symbols-outlined text-[14px] text-text-muted" aria-hidden="true">mail</span>' +
          '<span class="truncate">' + esc(email) + '</span></span>'
      : '<span class="flex items-center gap-1 text-label-xs text-status-warning">' +
          '<span class="material-symbols-outlined text-[14px]" aria-hidden="true">unsubscribe</span>No email on file</span>';
  }

  function resetButton(row, compact) {
    var label = row.account === 'none' ? 'Send Login Code' : 'Reset Password';
    var tip = row.Email ? 'Email a one-time login code to ' + row.Email : 'No email address on file';
    return '<button type="button" class="btn btn-secondary' + (compact ? ' emp-row-action' : '') + ' !py-1 !px-2.5 !text-label-sm"' +
      ' onclick="MGI.openResetPassword(\'' + esc(row.NIK) + '\')" title="' + esc(tip) + '"' +
      ' aria-label="' + esc(label + ' for ' + row.Full_Name) + '"' + (row.Email ? '' : ' disabled') + '>' +
      '<span class="material-symbols-outlined text-[16px]" aria-hidden="true">lock_reset</span>' +
      (compact ? '<span class="hidden xl:inline">' + label + '</span>' : ' ' + label) + '</button>';
  }

  var ACCOUNT_META = {
    none:    ['pill-neutral', 'person_off', 'No account'],
    invited: ['pill-info', 'mark_email_unread', 'Invited'],
    active:  ['pill-success', 'verified_user', 'Active'],
    locked:  ['pill-danger', 'lock', 'Locked'],
    queued:  ['pill-neutral', 'schedule_send', 'Invite queued'],
    failed:  ['pill-warning', 'unsubscribe', 'Invite failed']
  };

  function accountPill(status) {
    var m = ACCOUNT_META[status] || ACCOUNT_META.none;
    return '<span class="pill ' + m[0] + ' !text-[11px]" title="Login account">' +
      '<span class="material-symbols-outlined text-[14px]">' + m[1] + '</span> ' + m[2] + '</span>';
  }

  function mapAccountRow() {
    if (!S.mapping || !S.overview) return null;
    var nik = S.mapping.employee.NIK;
    return (S.overview.rows || []).filter(function (r) { return r.NIK === nik; })[0] || null;
  }

  function resetRow() {
    if (!S.overview || !S.resetNik) return null;
    return (S.overview.rows || []).filter(function (r) { return r.NIK === S.resetNik; })[0] || null;
  }

  function openResetPassword(nik) {
    S.resetNik = nik || (S.mapping ? S.mapping.employee.NIK : '');
    var row = resetRow();
    if (!row) return;
    var fresh = row.account === 'none';

    $('modal-host').innerHTML =
      '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closeResetPassword()">' +
        '<div class="modal-panel !max-w-md">' +
          '<div class="px-6 pt-6 pb-5 flex items-start gap-4">' +
            '<span class="w-10 h-10 rounded-full bg-status-warning-subtle text-status-warning flex items-center justify-center shrink-0">' +
              '<span class="material-symbols-outlined text-[22px]">lock_reset</span></span>' +
            '<div class="min-w-0">' +
              '<h2 class="text-title-lg text-text-primary">' + (fresh ? 'Send login code' : 'Reset password') + '</h2>' +
              (row.Email
                ? '<p class="text-body-sm text-text-secondary mt-1">A one-time login code will be emailed to <strong>' +
                    esc(row.Full_Name) + '</strong> at <strong class="break-all">' + esc(row.Email) + '</strong>.' +
                    (fresh ? '' : ' Their current password and every signed-in session stop working immediately.') + '</p>'
                : '<p class="text-body-sm text-text-secondary mt-1"><strong>' + esc(row.Full_Name) + '</strong> has no email address on file.</p>' +
                  '<p class="mt-3 rounded-lg bg-status-warning-subtle text-status-warning text-body-sm px-3 py-2">' +
                    'Add an email address in the employee database first, then try again.</p>') +
            '</div>' +
          '</div>' +
          '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex items-center justify-end gap-space-sm">' +
            '<button class="btn btn-secondary" onclick="MGI.closeResetPassword()">Cancel</button>' +
            '<button id="reset-confirm" class="btn btn-primary" onclick="MGI.confirmResetPassword()"' + (row.Email ? '' : ' disabled') + '>' +
              '<span class="material-symbols-outlined text-[18px]">send</span> ' + (fresh ? 'Send Code' : 'Reset &amp; Send Code') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function closeResetPassword() {
    $('modal-host').innerHTML = '';
  }

  function confirmResetPassword() {
    var row = resetRow();
    if (!row || !row.Email) return;
    var restore = busy($('reset-confirm'), 'Sending');

    api('resetUserPassword', row.NIK)
      .then(function (res) {
        restore();
        closeResetPassword();
        row.account = res.account;
        if (S.mapping && S.mapping.employee.NIK === row.NIK) renderWeightHero();
        renderEmployeeList();
        toast(res.message, res.account === 'queued' ? 'warning' : res.success ? 'success' : 'error');
      })
      .catch(function (err) {
        restore();
        toast(err.message, 'error');
      });
  }

  function openBulkAssign() {
    if (!S.overview) return;
    var groups = S.overview.roleGroups || [];
    var first = groups.filter(function (g) { return g.valid; })[0] || groups[0] || null;
    S.bulk = { roleKey: first ? first.key : '', search: '', groupSearch: '', division: '', matchOnly: true, niks: {} };
    $('map-picker').classList.add('hidden');
    $('map-bulk').classList.remove('hidden');
    window.scrollTo(0, 0);
    renderBulkPage();
  }

  function closeBulkAssign() {
    S.bulk = null;
    $('map-bulk').classList.add('hidden');
    $('map-bulk').innerHTML = '';
    $('map-picker').classList.remove('hidden');
    window.scrollTo(0, 0);
  }

  function bulkGroup() {
    if (!S.bulk || !S.overview) return null;
    return (S.overview.roleGroups || []).filter(function (g) { return g.key === S.bulk.roleKey; })[0] || null;
  }

  function bulkSame(a, b) {
    return String(a || '').toLowerCase() === String(b || '').toLowerCase();
  }

  function bulkMatches(row, group) {
    return bulkSame(row.Position, group.position) && bulkSame(row.Department, group.department);
  }

  function bulkState(row, group) {
    var mine = (row.groups || []).filter(function (g) { return g.key === group.key; })[0];
    if (!mine) return { key: 'new', label: 'Not assigned', pill: 'pill-neutral' };
    if (mine.count >= group.count) return { key: 'complete', label: 'Already assigned', pill: 'pill-success' };
    return { key: 'topup', label: 'Has ' + mine.count + ' of ' + group.count, pill: 'pill-warning' };
  }

  function bulkRows() {
    var group = bulkGroup();
    if (!group) return [];
    var q = (S.bulk.search || '').toLowerCase();

    return (S.overview.rows || []).filter(function (r) {
      if (S.bulk.matchOnly && !bulkMatches(r, group)) return false;
      if (!q) return true;
      return (r.Full_Name + ' ' + r.NIK + ' ' + r.Position + ' ' + r.Department).toLowerCase().indexOf(q) > -1;
    });
  }

  function bulkGroupStats(group) {
    var rows = (S.overview.rows || []).filter(function (r) { return bulkMatches(r, group); });
    return {
      matching: rows.length,
      holders: rows.filter(function (r) { return bulkState(r, group).key === 'complete'; }).length
    };
  }

  function bulkGroupList() {
    var q = (S.bulk.groupSearch || '').toLowerCase();
    return ((S.overview && S.overview.roleGroups) || []).filter(function (g) {
      if (S.bulk.division && g.division !== S.bulk.division) return false;
      if (!q) return true;
      var text = g.label + ' ' + (g.division || '') + ' ' + (g.kpis || []).map(function (k) { return k.KPI_Name; }).join(' ');
      return text.toLowerCase().indexOf(q) > -1;
    });
  }

  function bulkStepHead(n, title, note) {
    return '<div class="px-4 py-3 border-b border-border-light bg-surface-page flex items-center gap-2 min-w-0">' +
      '<span class="w-6 h-6 rounded-full bg-primary-container text-white text-[12px] font-bold flex items-center justify-center shrink-0">' + n + '</span>' +
      '<span class="text-body-md font-semibold text-text-primary shrink-0">' + esc(title) + '</span>' +
      (note ? '<span class="ml-auto text-label-xs text-text-muted truncate">' + note + '</span>' : '') +
    '</div>';
  }

  function bulkGroupPill(g) {
    return g.valid
      ? '<span class="pill pill-success !text-[11px] !px-2 shrink-0">' + g.count + ' KPIs • ' + num(g.percent, 1) + '%</span>'
      : '<span class="pill pill-danger !text-[11px] !px-2 shrink-0" title="' + g.count + ' KPIs, total weight ' + num(g.percent, 1) + '%">Not ready</span>';
  }

  function bulkTriggerHtml() {
    var g = bulkGroup();
    if (!g) {
      return '<span class="flex flex-col min-w-0 text-left">' +
          '<span class="text-label-xs uppercase tracking-wider text-text-muted">Bulk assign • Role group</span>' +
          '<span class="text-title-md text-text-secondary">Choose a role group</span>' +
        '</span>' +
        '<span class="material-symbols-outlined text-text-muted text-[20px] ml-auto">unfold_more</span>';
    }
    var st = bulkGroupStats(g);
    return '<span class="w-10 h-10 rounded-xl bg-primary-container text-white flex items-center justify-center shrink-0">' +
        '<span class="material-symbols-outlined text-[22px]">groups</span></span>' +
      '<span class="flex flex-col min-w-0 text-left">' +
        '<span class="text-label-xs uppercase tracking-wider text-text-muted">Bulk assign • Role group FY' + mapYear() + '</span>' +
        '<span class="flex items-center gap-2 min-w-0"><span class="text-title-md text-text-primary truncate">' + esc(g.position) + ' / ' + esc(g.department) + '</span>' +
          bulkGroupPill(g) + '</span>' +
        '<span class="text-xs text-slate-500 truncate">' + esc(g.division || 'No division') + ' • ' + st.matching +
          (st.matching === 1 ? ' employee' : ' employees') + ' in this role' + (st.holders ? ' • ' + st.holders + ' already assigned' : '') + '</span>' +
      '</span>' +
      '<span class="material-symbols-outlined text-text-muted text-[20px] ml-auto">unfold_more</span>';
  }

  function renderBulkPage() {
    var host = $('map-bulk');
    if (!host || !S.bulk) return;
    var groups = (S.overview && S.overview.roleGroups) || [];
    var divisions = [];
    groups.forEach(function (g) { if (g.division && divisions.indexOf(g.division) === -1) divisions.push(g.division); });
    divisions.sort();

    host.innerHTML =
      '<div class="sticky top-16 z-20 bg-white/95 backdrop-blur-md shadow-level-1 border border-border-light rounded-xl px-4 py-3 mb-space-md">' +
        '<div class="flex flex-wrap items-center gap-3">' +
          '<button type="button" class="btn-icon shrink-0" onclick="MGI.closeBulkAssign()" title="Back to employee list" aria-label="Back to employee list">' +
            '<span class="material-symbols-outlined">arrow_back</span></button>' +
          '<div id="bulk-combo" class="combo flex-1 min-w-[260px] max-w-[640px]">' +
            '<button id="bulk-group-trigger" type="button" class="combo-trigger w-full !border-border-light !bg-white" onclick="MGI.toggleBulkGroups()"' +
              ' title="Choose the role group to assign" aria-haspopup="listbox">' + bulkTriggerHtml() + '</button>' +
            '<div id="bulk-group-pop" class="combo-pop !w-[560px] hidden">' +
              '<div class="p-2 border-b border-border-light flex flex-col gap-2">' +
                '<div class="relative">' +
                  '<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px] pointer-events-none">search</span>' +
                  '<input id="bulk-group-search" type="search" class="field !pl-9 !py-1.5 !text-label-sm" placeholder="Search role, department or KPI" autocomplete="off" value="' +
                    esc(S.bulk.groupSearch) + '" oninput="MGI.onBulkGroupSearch(this.value)" onkeydown="MGI.onBulkGroupKey(event)">' +
                '</div>' +
                (divisions.length > 1
                  ? '<div id="bulk-division" class="flex flex-wrap gap-1.5">' + [''].concat(divisions).map(function (d) {
                      return '<button type="button" class="bulk-chip' + (d === (S.bulk.division || '') ? ' is-active' : '') + '" data-division="' + esc(d) + '"' +
                        ' onclick="MGI.setBulkDivision(\'' + esc(d) + '\')">' + esc(d || 'All Divisions') + '</button>';
                    }).join('') + '</div>'
                  : '') +
              '</div>' +
              '<div id="bulk-groups" class="max-h-[420px] overflow-y-auto divide-y divide-slate-100"></div>' +
            '</div>' +
          '</div>' +
          '<div class="flex flex-wrap items-center gap-space-sm ml-auto shrink-0">' +
            '<p id="bulk-summary" class="text-body-sm text-text-secondary"></p>' +
            '<button id="bulk-apply" class="btn btn-primary" onclick="MGI.applyBulkAssign()">' +
              '<span class="material-symbols-outlined text-[18px]">group_add</span> Assign</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="grid grid-cols-1 xl:grid-cols-2 gap-space-md items-start">' +
        '<div id="bulk-kpis" class="bulk-panel bg-surface-card rounded-xl shadow-level-1 border border-border-light"></div>' +
        '<div class="bulk-panel bg-surface-card rounded-xl shadow-level-1 border border-border-light">' +
          '<div class="bulk-panel-head">' +
            bulkStepHead(2, 'Choose employees', 'Only the selected employees receive the group') +
            '<div class="px-4 py-3 border-b border-border-light flex flex-wrap items-center gap-space-sm bg-white">' +
              '<div class="relative flex-1 min-w-[180px]">' +
                '<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px] pointer-events-none">search</span>' +
                '<input id="bulk-search" type="search" class="field !pl-10 !py-1.5" placeholder="Search NIK or name" value="' +
                  esc(S.bulk.search) + '" oninput="MGI.onBulkSearch(this.value)">' +
              '</div>' +
              '<label class="flex items-center gap-2 text-body-sm text-text-secondary shrink-0 cursor-pointer">' +
                '<input type="checkbox" class="rounded border-border-medium"' + (S.bulk.matchOnly ? ' checked' : '') +
                  ' onchange="MGI.toggleBulkMatch()"> Matching role only</label>' +
              '<button class="btn btn-secondary !py-1.5 shrink-0" onclick="MGI.selectAllBulk()" title="Select every employee listed below">Select listed</button>' +
              '<button class="btn btn-secondary !py-1.5 shrink-0" onclick="MGI.clearBulkSelection()" title="Unselect everyone">Clear</button>' +
            '</div>' +
          '</div>' +
          '<div id="bulk-list" class="bulk-panel-body divide-y divide-slate-100"></div>' +
        '</div>' +
      '</div>';

    if (!S.bulkWired) {
      S.bulkWired = true;
      document.addEventListener('click', function (ev) {
        var box = $('bulk-combo');
        if (box && box.contains && !box.contains(ev.target)) closeBulkGroups();
      });
    }

    renderBulkGroups();
    renderBulkKpis();
    renderBulkList();
  }

  function toggleBulkGroups() {
    var pop = $('bulk-group-pop');
    if (!pop) return;
    var willOpen = pop.classList.contains('hidden');
    pop.classList.toggle('hidden', !willOpen);
    if (!willOpen) return;
    renderBulkGroups();
    var q = $('bulk-group-search');
    if (q && q.focus) q.focus();
  }

  function closeBulkGroups() {
    var pop = $('bulk-group-pop');
    if (pop) pop.classList.add('hidden');
  }

  function onBulkGroupKey(e) {
    if (e.key === 'Escape') { closeBulkGroups(); return; }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    var list = bulkGroupList();
    if (list.length) setBulkGroup(list[0].key);
  }

  function renderBulkGroups() {
    var host = $('bulk-groups');
    if (!host || !S.bulk) return;
    var list = bulkGroupList();

    host.innerHTML = !list.length
      ? '<p class="p-space-lg text-center text-body-sm text-text-muted">No role group matches this search.</p>'
      : list.map(function (g) {
          var on = g.key === S.bulk.roleKey;
          var st = bulkGroupStats(g);
          return '<button type="button" class="bulk-group' + (on ? ' is-active' : '') + '" role="option" aria-selected="' + (on ? 'true' : 'false') + '"' +
            ' onclick="MGI.setBulkGroup(\'' + esc(g.key) + '\')">' +
            '<span class="flex flex-col min-w-0 flex-1 text-left">' +
              '<span class="text-body-sm font-semibold text-text-primary truncate">' + esc(g.position) + ' / ' + esc(g.department) + '</span>' +
              '<span class="text-label-xs text-text-muted truncate">' + esc(g.division || 'No division') + '</span>' +
              '<span class="text-label-xs text-text-secondary truncate">' + st.matching + (st.matching === 1 ? ' employee' : ' employees') + ' in this role' +
                (st.holders ? ' • ' + st.holders + ' already assigned' : '') + '</span>' +
            '</span>' +
            bulkGroupPill(g) +
          '</button>';
        }).join('');

    document.querySelectorAll('#bulk-division [data-division]').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-division') === (S.bulk.division || ''));
    });
  }

  function renderBulkKpis() {
    var host = $('bulk-kpis');
    if (!host || !S.bulk) return;
    var g = bulkGroup();
    if (!g) {
      host.innerHTML = '<div class="bulk-panel-head">' + bulkStepHead(1, 'Review the KPIs', '') + '</div>' +
        '<p class="p-space-lg text-center text-body-sm text-text-muted">' +
          ((S.overview.roleGroups || []).length ? 'Choose a role group above to see its KPIs.' : 'No active Master KPIs for FY' + mapYear() + ' yet.') + '</p>';
      return;
    }

    var rows = (g.kpis || []).map(function (k, n) {
      var meta = labelMeta(k.Label);
      return '<tr>' +
        '<td class="!px-2 !py-2 text-center tabular-nums text-text-muted align-top">' + (n + 1) + '</td>' +
        '<td class="!px-2 !py-2 !whitespace-normal break-words leading-snug">' +
          '<span class="block font-semibold text-text-primary">' + esc(k.KPI_Name) + '</span>' +
          (k.Metrics ? '<span class="block text-text-muted">' + esc(k.Metrics) + '</span>' : '') +
          '<span class="mt-1 flex flex-wrap items-center gap-1.5"><span class="text-[11px] font-bold text-text-secondary">' + esc(k.KPI_ID) + '</span>' +
            durationPill(k.Duration, true) + '</span>' +
        '</td>' +
        '<td class="!px-2 !py-2 whitespace-nowrap"><span class="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ' + meta.tone + '"' +
          ' title="' + esc(targetHint(k)) + '"><span class="material-symbols-outlined text-[14px]">' + meta.icon + '</span>' + esc(meta.short) + '</span></td>' +
        '<td class="!px-2 !py-2 text-right tabular-nums whitespace-nowrap">' + esc(deepDiveTarget(k)) + '</td>' +
        '<td class="!px-2 !py-2 text-right tabular-nums whitespace-nowrap font-semibold">' + pct(k.WeightPercent) + '</td>' +
      '</tr>';
    }).join('');

    host.innerHTML =
      '<div class="bulk-panel-head">' +
        bulkStepHead(1, 'Review the KPIs', g.count + (g.count === 1 ? ' KPI' : ' KPIs') + ' • total weight ' + pct(g.percent)) +
        (g.valid ? ''
          : '<div class="px-4 py-2 bg-status-danger-subtle text-status-danger-text text-body-sm flex items-start gap-2 border-b border-red-100">' +
              '<span class="material-symbols-outlined text-[18px]">error</span>' +
              '<span>This group is not ready: ' + g.count + ' KPIs, total weight ' + num(g.percent, 1) + '%. Fix it in Master KPIs before assigning.</span></div>') +
      '</div>' +
      '<div class="bulk-panel-body">' +
        '<table class="data-table w-full text-[12px]">' +
          '<thead><tr>' +
            '<th class="w-8 !px-2 !py-2 text-center">No</th>' +
            '<th class="!px-2 !py-2">KPI Name</th>' +
            '<th class="!px-2 !py-2">Direction</th>' +
            '<th class="!px-2 !py-2 text-right">Target</th>' +
            '<th class="!px-2 !py-2 text-right">Weight</th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
          '<tfoot><tr>' +
            '<td colspan="4" class="!px-2 !py-2 text-right font-semibold text-text-secondary">Total weight</td>' +
            '<td class="!px-2 !py-2 text-right tabular-nums font-bold ' + (g.valid ? 'text-status-success-text' : 'text-status-danger-text') + '">' + pct(g.percent) + '</td>' +
          '</tr></tfoot>' +
        '</table>' +
      '</div>';
  }

  function renderBulkList() {
    if (!S.bulk || !$('bulk-list')) return;
    var group = bulkGroup();
    var rows = bulkRows();

    $('bulk-list').innerHTML = !group
      ? '<p class="p-space-lg text-center text-body-sm text-text-muted">Select a role group first.</p>'
      : !rows.length
        ? '<p class="p-space-lg text-center text-body-sm text-text-muted">No employees match this filter.</p>'
        : rows.map(function (r) {
            var st = bulkState(r, group);
            var off = st.key === 'complete';
            return '<label class="flex items-center gap-space-sm px-space-md py-2.5' +
              (off ? ' opacity-60' : ' cursor-pointer hover:bg-slate-50') + '">' +
              '<input type="checkbox" class="rounded border-border-medium shrink-0"' + (off ? ' disabled' : '') +
                (S.bulk.niks[r.NIK] ? ' checked' : '') + ' onchange="MGI.toggleBulkNik(\'' + esc(r.NIK) + '\')">' +
              '<span class="emp-avatar shrink-0">' + esc(r.Initials || initials(r.Full_Name)) + '</span>' +
              '<span class="flex flex-col min-w-0 flex-1">' +
                '<span class="text-body-sm font-semibold text-text-primary truncate">' + esc(r.Full_Name) + '</span>' +
                '<span class="text-label-xs text-text-muted truncate">' + esc(r.NIK) + ' • ' +
                  esc(r.Position) + ' / ' + esc(r.Department) + '</span>' +
              '</span>' +
              (bulkMatches(r, group) ? '' : '<span class="pill pill-warning !text-[11px] shrink-0">Different role</span>') +
              '<span class="pill ' + st.pill + ' !text-[11px] shrink-0">' + st.label + '</span>' +
            '</label>';
          }).join('');

    var picked = group ? (S.overview.rows || []).filter(function (r) { return S.bulk.niks[r.NIK]; }) : [];
    var fresh = picked.filter(function (r) { return bulkState(r, group).key === 'new'; }).length;
    var topup = picked.filter(function (r) { return bulkState(r, group).key === 'topup'; }).length;

    $('bulk-summary').textContent = !group
      ? 'Select a role group first.'
      : picked.length + ' selected, ' + fresh + ' new, ' + topup + ' to complete';
    $('bulk-apply').disabled = !group || !group.valid || !picked.length;
  }

  function setBulkGroup(key) {
    if (!S.bulk) return;
    S.bulk.roleKey = key;
    S.bulk.niks = {};
    closeBulkGroups();
    if ($('bulk-group-trigger')) $('bulk-group-trigger').innerHTML = bulkTriggerHtml();
    renderBulkGroups();
    renderBulkKpis();
    renderBulkList();
  }

  function onBulkGroupSearch(value) {
    if (!S.bulk) return;
    S.bulk.groupSearch = value;
    renderBulkGroups();
  }

  function setBulkDivision(value) {
    if (!S.bulk) return;
    S.bulk.division = value;
    renderBulkGroups();
  }

  function onBulkSearch(value) {
    if (!S.bulk) return;
    S.bulk.search = value;
    renderBulkList();
  }

  function toggleBulkMatch() {
    if (!S.bulk) return;
    S.bulk.matchOnly = !S.bulk.matchOnly;
    renderBulkList();
  }

  function toggleBulkNik(nik) {
    if (!S.bulk) return;
    if (S.bulk.niks[nik]) delete S.bulk.niks[nik];
    else S.bulk.niks[nik] = true;
    renderBulkList();
  }

  function selectAllBulk() {
    var group = bulkGroup();
    if (!group) return;
    bulkRows().forEach(function (r) {
      if (bulkState(r, group).key !== 'complete') S.bulk.niks[r.NIK] = true;
    });
    renderBulkList();
  }

  function clearBulkSelection() {
    if (!S.bulk) return;
    S.bulk.niks = {};
    renderBulkList();
  }

  function applyBulkAssign() {
    var group = bulkGroup();
    var niks = S.bulk ? Object.keys(S.bulk.niks) : [];
    if (!group || !niks.length) return;

    $('bulk-apply').disabled = true;
    api('assignRoleGroup', mapYear(), group.position, group.department, niks)
      .then(function (res) {
        closeBulkAssign();
        toast(res.message, 'success');
        loadOverview();
      })
      .catch(function (err) {
        if ($('bulk-apply')) $('bulk-apply').disabled = false;
        toast(err.message, 'error');
      });
  }

  function openWorkspace(nik) {
    $('map-picker').classList.add('hidden');
    $('map-workspace').classList.remove('hidden');
    window.scrollTo(0, 0);
    onEmployeeSelect(nik);
  }

  function backToPicker() {
    guardUnsaved(function () {
      $('map-workspace').classList.add('hidden');
      $('map-picker').classList.remove('hidden');
      S.mapping = null; S.assigned = []; S.available = []; S.history = [];
      window.scrollTo(0, 0);
      loadOverview();
    });
  }

  function currentIds() {
    return S.assigned.map(function (k) { return k.KPI_ID; });
  }

  function isBasketDirty() {
    if (!S.mapping || !S.mapping.assigned) return false;
    var now = currentIds().slice().sort().join(',');
    var saved = S.mapping.assigned.map(function (k) { return k.KPI_ID; }).sort().join(',');
    return now !== saved;
  }

  function discardBasket() {
    if (!S.mapping) return;
    S.assigned = S.mapping.assigned.slice();
    S.history = (S.mapping.inactive || []).slice();
    var ids = currentIds().concat(S.history.map(function (k) { return k.KPI_ID; }));
    S.available = S.catalogue.filter(function (k) { return ids.indexOf(k.KPI_ID) === -1; });
  }

  function guardUnsaved(proceed) {
    var catDirty = isCategoryDirty();
    if (!catDirty && !isBasketDirty()) { proceed(); return; }

    S.pendingProceed = proceed;
    var name = S.mapping && S.mapping.employee ? S.mapping.employee.Full_Name : 'this employee';
    var message = catDirty
      ? 'The <strong>Categories</strong> page has ' + categoryChangeCount() +
        ' unsaved changes. Leave and discard them?'
      : 'The KPI mapping for <strong>' + esc(name) +
        '</strong> has unsaved changes. Leave and discard them?';

    $('modal-host').innerHTML =
      '<div class="modal-backdrop">' +
        '<div class="modal-panel !max-w-md">' +
          '<div class="px-6 pt-6 pb-5 flex items-start gap-4">' +
            '<span class="w-10 h-10 rounded-full bg-status-warning-subtle text-status-warning flex items-center justify-center shrink-0">' +
              '<span class="material-symbols-outlined text-[22px]">warning</span></span>' +
            '<div class="min-w-0">' +
              '<h2 class="text-title-lg text-text-primary">Unsaved changes</h2>' +
              '<p class="text-body-sm text-text-secondary mt-1">' + message + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex items-center justify-end gap-space-sm">' +
            '<button class="btn btn-secondary" onclick="MGI.cancelLeave()">Stay</button>' +
            '<button class="btn btn-primary" onclick="MGI.confirmLeave()">Discard &amp; Continue</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function cancelLeave() {
    S.pendingProceed = null;
    $('modal-host').innerHTML = '';
    closeSwitcher();
  }

  function confirmLeave() {
    var proceed = S.pendingProceed;
    S.pendingProceed = null;
    $('modal-host').innerHTML = '';
    discardBasket();
    if (S.catDraft && S.categories) resetCategoryDraft();
    if (proceed) proceed();
  }

  function switchEmployee(nik) {
    closeSwitcher();
    if (!nik || (S.mapping && S.mapping.employee.NIK === nik)) return;
    guardUnsaved(function () { onEmployeeSelect(nik); });
  }

  function switcherMarkup(e) {
    var meta = ['NIK ' + e.NIK, [e.Position, e.Department].filter(Boolean).join(' / '), e.Division]
      .filter(Boolean).join(' • ');
    return '<div id="map-switcher" class="combo">' +
      '<button type="button" class="combo-trigger" onclick="MGI.openSwitcher()" title="Switch employee">' +
        '<span class="w-10 h-10 rounded-xl bg-primary-container text-white flex items-center justify-center text-label-sm font-bold shrink-0">' +
          esc(initials(e.Full_Name)) + '</span>' +
        '<span class="flex flex-col min-w-0 text-left">' +
          '<span class="text-title-md text-text-primary truncate">' + esc(e.Full_Name) + '</span>' +
          '<span class="text-xs text-slate-500 truncate">' + esc(meta) + '</span>' +
          emailLine(e.Email) +
        '</span>' +
        '<span class="material-symbols-outlined text-text-muted text-[20px]">unfold_more</span>' +
      '</button>' +
      '<div id="map-switcher-pop" class="combo-pop hidden">' +
        '<div class="relative p-2 border-b border-border-light">' +
          '<span class="material-symbols-outlined absolute left-4 top-4 text-text-muted text-[18px]">search</span>' +
          '<input id="map-switcher-q" type="search" class="field !pl-9 !py-1.5 !text-label-sm" placeholder="Search NIK, name or email"' +
            ' autocomplete="off" oninput="MGI.filterSwitcher()" onkeydown="MGI.onSwitcherKey(event)">' +
        '</div>' +
        '<div id="map-switcher-list" class="max-h-72 overflow-y-auto py-1"></div>' +
      '</div>' +
    '</div>';
  }

  function switcherRows() {
    if (!S.overview) return [];
    var box = $('map-switcher-q');
    var q = box && box.value ? box.value.trim().toLowerCase() : '';
    return S.overview.rows.filter(function (r) {
      return !q || (r.Full_Name + ' ' + r.NIK + ' ' + (r.Email || '')).toLowerCase().indexOf(q) > -1;
    });
  }

  function renderSwitcher() {
    filterSwitcher();
  }

  function filterSwitcher() {
    var list = $('map-switcher-list');
    if (!list) return;
    var current = S.mapping ? S.mapping.employee.NIK : '';
    var rows = switcherRows();

    list.innerHTML = rows.length
      ? rows.map(function (r) {
          return '<button type="button" class="combo-option' + (r.NIK === current ? ' is-current' : '') + '"' +
            ' onclick="MGI.pickSwitcher(\'' + esc(r.NIK) + '\')">' +
            '<span class="emp-avatar !w-7 !h-7 !text-[11px]">' + esc(r.Initials) + '</span>' +
            '<span class="flex flex-col min-w-0 text-left">' +
              '<span class="text-label-md text-text-primary font-semibold truncate">' + esc(r.Full_Name) + '</span>' +
              '<span class="text-label-xs text-text-muted truncate">' + esc(r.NIK) + ' • ' + esc(r.Position) + '</span>' +
            '</span>' +
            (r.hasMapping ? '' : '<span class="pill pill-warning !py-0 !text-[11px] ml-auto">Unassigned</span>') +
          '</button>';
        }).join('')
      : '<p class="px-3 py-4 text-body-sm text-text-muted text-center">No matching employees.</p>';
  }

  function openSwitcher() {
    var pop = $('map-switcher-pop');
    if (!pop) return;
    var willOpen = pop.classList.contains('hidden');
    pop.classList.toggle('hidden', !willOpen);
    if (!willOpen) return;
    var q = $('map-switcher-q');
    if (q) q.value = '';
    filterSwitcher();
    if (q && q.focus) q.focus();
  }

  function closeSwitcher() {
    var pop = $('map-switcher-pop');
    if (pop) pop.classList.add('hidden');
  }

  function onSwitcherKey(e) {
    if (e.key === 'Escape') { closeSwitcher(); return; }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    var rows = switcherRows();
    if (rows.length) pickSwitcher(rows[0].NIK);
  }

  function pickSwitcher(nik) {
    switchEmployee(nik);
  }

  function onEmployeeSelect(nik, keepIds) {
    nik = nik || (S.mapping ? S.mapping.employee.NIK : '');
    if (!nik) return;

    $('map-assigned').innerHTML = '<div class="skeleton h-20 w-full"></div>';
    $('map-catalogue').innerHTML = '<div class="skeleton h-24 w-full"></div>';
    if (!keepIds) {
      $('map-employee-meta').innerHTML = '<div class="skeleton h-10 w-64 max-w-full rounded-lg"></div>';
      $('map-weight-summary').innerHTML = '';
      $('map-weight-meters').innerHTML = '';
    }

    var year = mapYear();
    api('getMappingForEmployee', nik, year)
      .then(function (data) {
        if (year !== mapYear()) return;
        var keep = keepIds && S.mapping && S.mapping.employee.NIK === nik ? keepIds : null;
        var keptCollapsed = keep ? S.collapsed : {};
        var keptHistoryOpen = keep ? S.historyOpen : false;
        var prevFilters = keep
          ? [$('map-f-division').value, $('map-f-department').value, $('map-f-position').value]
          : null;

        S.mapping = data;
        S.mapping.inactive = data.inactive || [];
        S.catalogue = data.available.concat(data.assigned, S.mapping.inactive);

        if (keep) {
          var persistedIds = data.assigned.concat(S.mapping.inactive).map(function (k) { return k.KPI_ID; });
          S.assigned = S.catalogue.filter(function (k) { return keep.indexOf(k.KPI_ID) > -1; });
          S.history = S.catalogue.filter(function (k) {
            return keep.indexOf(k.KPI_ID) === -1 && persistedIds.indexOf(k.KPI_ID) > -1;
          });
          S.available = S.catalogue.filter(function (k) {
            return keep.indexOf(k.KPI_ID) === -1 && persistedIds.indexOf(k.KPI_ID) === -1;
          });
        } else {
          S.assigned = data.assigned.slice();
          S.history = S.mapping.inactive.slice();
          S.available = data.available.slice();
        }
        S.collapsed = keptCollapsed;
        if (!keep) S.catOpen = {};
        S.historyOpen = keptHistoryOpen;

        $('map-employee-meta').innerHTML = switcherMarkup(data.employee);

        renderSwitcher();
        if (!S.switcherWired) {
          S.switcherWired = true;
          document.addEventListener('click', function (ev) {
            var box = $('map-switcher');
            if (box && !box.contains(ev.target)) closeSwitcher();
          });
        }

        buildCatalogueFilters(data);
        if (prevFilters) {
          $('map-f-division').value = prevFilters[0];
          refreshFilterOptions();
          $('map-f-department').value = prevFilters[1];
          refreshFilterOptions();
          $('map-f-position').value = prevFilters[2];
        }

        renderAssigned(); renderCatalogue(); renderWeightHero(); renderSaveHint();
      })
      .catch(function (err) {
        $('map-assigned').innerHTML = '';
        $('map-catalogue').innerHTML = '';
        toast(err.message, 'error');
      });
  }

  function distinct(list, field) {
    var seen = {};
    var out = [];
    list.forEach(function (k) {
      var v = String(k[field] || '').trim();
      if (!v || seen[v.toLowerCase()]) return;
      seen[v.toLowerCase()] = true;
      out.push(v);
    });
    return out.sort();
  }

  function catalogueScope(level) {
    var div = $('map-f-division').value;
    var dep = $('map-f-department').value;
    return S.catalogue.filter(function (k) {
      if (div && !eqiJs(k.Division, div)) return false;
      if (level === 'position' && dep && !eqiJs(k.Department, dep)) return false;
      return true;
    });
  }

  function buildCatalogueFilters(data) {
    var home = data.home;
    var divisions = distinct(S.catalogue, 'Division');

    var homeDivHasDept = home.Department && S.catalogue.some(function (k) {
      return eqiJs(k.Division, home.Division) && eqiJs(k.Department, home.Department);
    });

    $('map-f-division').innerHTML = '<option value="">All</option>' +
      divisions.map(function (v) { return '<option value="' + esc(v) + '">' + esc(v) + '</option>'; }).join('');
    $('map-f-division').value = homeDivHasDept ? (home.Division || '') : '';

    refreshFilterOptions();

    var depOk = home.Department && Array.prototype.some.call($('map-f-department').options,
      function (o) { return eqiJs(o.value, home.Department); });
    $('map-f-department').value = depOk ? home.Department : '';

    refreshFilterOptions();

    var posOk = home.Position && Array.prototype.some.call($('map-f-position').options,
      function (o) { return eqiJs(o.value, home.Position); });
    $('map-f-position').value = posOk ? home.Position : '';
  }

  function refreshFilterOptions() {
    var depSel = $('map-f-department');
    var posSel = $('map-f-position');
    var keepDep = depSel.value;
    var keepPos = posSel.value;

    var departments = distinct(catalogueScope('department'), 'Department');
    depSel.innerHTML = '<option value="">All</option>' +
      departments.map(function (v) { return '<option value="' + esc(v) + '">' + esc(v) + '</option>'; }).join('');
    depSel.value = departments.indexOf(keepDep) > -1 ? keepDep : '';

    var positions = distinct(catalogueScope('position'), 'Position');
    posSel.innerHTML = '<option value="">All</option>' +
      positions.map(function (v) { return '<option value="' + esc(v) + '">' + esc(v) + '</option>'; }).join('');
    posSel.value = positions.indexOf(keepPos) > -1 ? keepPos : '';
  }

  function onFilterChange() {
    refreshFilterOptions();
    renderCatalogue();
  }

  function resetCatalogueFilter() {
    if (!S.mapping) return;
    $('map-f-division').value = '';
    $('map-f-department').value = '';
    $('map-f-position').value = '';
    refreshFilterOptions();
    renderCatalogue();
  }

  function groupAssigned() {
    var buckets = {};
    var order = [];
    S.assigned.forEach(function (k) {
      var key = roleKey(k);
      if (!buckets[key]) {
        buckets[key] = { key: key, label: roleLabel(k), items: [], weight: 0 };
        order.push(key);
      }
      buckets[key].items.push(k);
      buckets[key].weight += Number(k.Weight);
    });
    return order.map(function (key) {
      var g = buckets[key];
      g.count = g.items.length;
      g.percent = Math.round(g.weight * 1000) / 10;
      g.weightValid = Math.abs(g.weight - 1) < 0.0001;
      g.quotaValid = g.count <= (S.user.maxKpi || 10);
      g.valid = g.weightValid && g.quotaValid;
      return g;
    });
  }

  function totalWeight() {
    return S.assigned.reduce(function (s, k) { return s + Number(k.Weight); }, 0);
  }

  function renderWeightHero() {
    var summary = $('map-weight-summary');
    var metersHost = $('map-weight-meters');
    if (!S.mapping) { summary.innerHTML = ''; metersHost.innerHTML = ''; return; }

    var groups = groupAssigned();
    var maxKpi = S.user.maxKpi || 10;
    var bad = groups.filter(function (g) { return !g.valid; }).length;
    var rule = esc('Each role must reach exactly 100% on its own and hold at most ' + maxKpi + ' KPIs');

    var acct = mapAccountRow();
    summary.innerHTML =
      '<span class="pill pill-brand" title="Fiscal year of this mapping"><span class="material-symbols-outlined text-[14px]">calendar_month</span>FY' +
        esc(S.mapping.year || mapYear()) + '</span>' +
      (acct ? accountPill(acct.account) + resetButton(acct, false) : '') +
      (!groups.length
        ? '<span class="pill pill-neutral" title="' + rule + '"><span class="material-symbols-outlined text-[14px]">pending</span> No KPIs selected</span>'
        : !bad
          ? '<span class="pill pill-success" title="' + rule + '"><span class="material-symbols-outlined text-[14px]">check_circle</span> All roles at 100%</span>'
          : '<span class="pill pill-danger" title="' + rule + '"><span class="material-symbols-outlined text-[14px]">error</span> ' +
            bad + (bad === 1 ? ' role needs' : ' roles need') + ' attention</span>') +
      '<span class="pill pill-neutral"><span class="material-symbols-outlined text-[14px]">fact_check</span> ' +
        S.assigned.length + ' KPIs • ' + groups.length + (groups.length === 1 ? ' role' : ' roles') + '</span>';

    metersHost.innerHTML = groups.length
      ? groups.map(function (g) {
          return '<div class="flex-1 min-w-[220px]">' +
            '<div class="flex items-center justify-between gap-space-sm mb-1">' +
              '<span class="text-label-md text-text-primary font-semibold truncate">' + esc(g.label) + '</span>' +
              '<span class="pill ' + (g.valid ? 'pill-success' : 'pill-danger') + '">' +
                '<span class="material-symbols-outlined text-[14px]">' +
                  (g.valid ? 'check_circle' : 'error') + '</span> ' + g.percent + '%</span>' +
            '</div>' +
            '<div class="meter-track meter-sm"><div class="meter-fill ' + (g.weightValid ? 'is-valid' : '') +
              '" style="width:' + Math.max(0, Math.min(100, g.percent)) + '%"></div></div>' +
            '<p class="text-label-xs text-text-muted mt-1">' + g.count + ' of ' + maxKpi + ' KPIs' +
              (g.quotaValid ? '' : ', over quota') +
              (g.weightValid ? '' : (g.percent < 100 ? ', short by ' + (Math.round((100 - g.percent) * 10) / 10) + '%'
                                                     : ', over by ' + (Math.round((g.percent - 100) * 10) / 10) + '%')) +
            '</p>' +
          '</div>';
        }).join('')
      : '<p class="text-body-sm text-text-muted">No KPIs selected yet. Add roles from the KPI Catalogue.</p>';
  }

  function isPersisted(kpiId) {
    if (!S.mapping) return false;
    var hit = function (list) {
      return (list || []).some(function (k) { return k.KPI_ID === kpiId; });
    };
    return hit(S.mapping.assigned) || hit(S.mapping.inactive);
  }

  function renderAssigned() {
    $('map-assigned-count').textContent = S.assigned.length + ' Active' +
      (S.history.length ? ', ' + S.history.length + ' Inactive' : '');

    if (!S.mapping) {
      $('map-assigned').innerHTML =
        '<div class="bg-surface-card rounded-xl p-space-xl text-center border border-dashed border-border-medium">' +
          '<span class="material-symbols-outlined text-[36px] text-text-muted">person_search</span>' +
          '<p class="text-body-md text-text-secondary mt-2">Select an employee to start mapping KPIs.</p>' +
        '</div>';
      return;
    }

    var home = S.mapping.home;

    var active = !S.assigned.length
      ? '<div class="bg-surface-card rounded-xl p-space-xl text-center border border-dashed border-border-medium">' +
          '<span class="material-symbols-outlined text-[36px] text-text-muted">playlist_add</span>' +
          '<p class="text-body-md text-text-secondary mt-2">No active KPIs yet.</p>' +
          '<p class="text-body-sm text-text-muted">Pick a role in the catalogue, then click <strong>Add Role</strong>. Every active role must be exactly 100%.</p>' +
        '</div>'
      : groupAssigned().map(function (g) {
          var isHome = eqiJs(g.items[0].Department, home.Department) &&
                       eqiJs(g.items[0].Position, home.Position);
          var collapsed = !!S.collapsed[g.key];
          var hasSaved = g.items.some(function (k) { return isPersisted(k.KPI_ID); });

          return '<div class="role-group shrink-0 !mt-0 shadow-level-1' + (collapsed ? ' is-collapsed' : '') + '">' +
            '<div class="role-group-head !p-4' + (g.valid ? '' : ' is-invalid') +
              '" onclick="MGI.toggleRoleGroup(\'' + esc(g.key) + '\')"' +
              ' title="Click to ' + (collapsed ? 'expand' : 'collapse') + ' this role">' +
              '<span class="material-symbols-outlined text-[20px] text-text-secondary">' +
                (collapsed ? 'expand_more' : 'expand_less') + '</span>' +
              '<span class="material-symbols-outlined text-[18px] ' +
                (g.valid ? 'text-status-success' : 'text-status-danger') + '">' +
                (g.valid ? 'check_circle' : 'error') + '</span>' +
              '<span class="text-title-md text-text-primary">' + esc(g.label) + '</span>' +
              (isHome
                ? '<span class="pill pill-neutral !text-[11px]">Home</span>'
                : '<span class="pill pill-maroon !text-[11px]">Additional Role</span>') +
              '<span class="ml-auto flex items-center justify-end gap-space-sm flex-wrap">' +
                '<span class="text-label-xs text-text-muted">' + g.count + ' / ' + (S.user.maxKpi || 10) + ' KPI</span>' +
                '<span class="pill ' + (g.valid ? 'pill-success' : 'pill-danger') + '">' + g.percent + '%</span>' +
                '<button class="btn btn-secondary !py-1 !px-2.5 !text-label-sm"' +
                  ' onclick="event.stopPropagation();MGI.deactivateRoleGroup(\'' + esc(g.key) + '\')"' +
                  ' title="' + (hasSaved
                    ? 'Deactivate every KPI in this role. Score history is kept.'
                    : 'Return every KPI in this role to the catalogue') + '">' +
                  '<span class="material-symbols-outlined text-[16px]">' + (hasSaved ? 'toggle_off' : 'undo') + '</span>' +
                  (hasSaved ? 'Deactivate Role' : 'Undo Role') +
                '</button>' +
              '</span>' +
            '</div>' +
            '<div class="role-group-body">' +
              g.items.map(function (k) { return cardAssigned(k, false); }).join('') +
            '</div>' +
          '</div>';
        }).join('');

    $('map-assigned').innerHTML = active + renderHistoryBasket();
  }

  function renderHistoryBasket() {
    if (!S.history.length) return '';

    var open = !!S.historyOpen;
    var maxKpi = S.user.maxKpi || 10;
    var buckets = {};
    var order = [];
    S.history.forEach(function (k) {
      var key = roleKey(k);
      if (!buckets[key]) {
        buckets[key] = { label: roleLabel(k), items: [] };
        order.push(key);
      }
      buckets[key].items.push(k);
    });

    return '<div class="role-group role-history shrink-0 !mt-0 shadow-level-1' + (open ? '' : ' is-collapsed') + '">' +
      '<div class="role-group-head !p-4" onclick="MGI.toggleHistoryBasket()"' +
        ' title="Click to ' + (open ? 'collapse' : 'expand') + ' history">' +
        '<span class="material-symbols-outlined text-[20px] text-text-secondary">' +
          (open ? 'expand_less' : 'expand_more') + '</span>' +
        '<span class="material-symbols-outlined text-[18px] text-text-muted">history</span>' +
        '<span class="text-title-md text-text-secondary">History (Inactive)</span>' +
        '<span class="pill pill-neutral !text-[11px]">' + S.history.length + ' KPI</span>' +
        '<span class="ml-auto text-label-xs text-text-muted">Not counted in weight validation</span>' +
      '</div>' +
      '<div class="role-group-body">' +
        order.map(function (key) {
          var b = buckets[key];
          var full = roleCount(key) + b.items.length > maxKpi;
          return '<div class="flex items-center justify-between gap-space-sm flex-wrap mt-1">' +
              '<p class="text-label-xs uppercase tracking-wider text-text-muted">' + esc(b.label) + ' • ' + b.items.length + ' KPI</p>' +
              '<button class="btn btn-secondary !py-1 !px-2.5 !text-label-sm" onclick="MGI.activateRoleGroup(\'' + esc(key) + '\')"' +
                (full ? ' disabled title="This role would exceed the quota of ' + maxKpi + ' active KPIs"'
                      : ' title="Reactivate every KPI in this role"') + '>' +
                '<span class="material-symbols-outlined text-[16px]">' + (full ? 'block' : 'toggle_on') + '</span>' +
                (full ? 'Quota Full' : 'Activate Role') +
              '</button>' +
            '</div>' +
            b.items.map(function (k) { return cardAssigned(k, true); }).join('');
        }).join('') +
      '</div>' +
    '</div>';
  }

  function toggleRoleGroup(key) {
    S.collapsed[key] = !S.collapsed[key];
    renderAssigned();
  }

  function toggleHistoryBasket() {
    S.historyOpen = !S.historyOpen;
    renderAssigned();
  }

  function cardAssigned(k, inactive) {
    var persisted = isPersisted(k.KPI_ID);
    return '' +
    '<div class="bg-surface-card rounded-lg p-space-sm border border-border-light hover:shadow-level-1 transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm' +
      (inactive ? ' kpi-inactive' : '') + '">' +
      '<div class="flex flex-col min-w-0 flex-1">' +
        '<div class="flex items-center gap-space-xs mb-0.5 flex-wrap">' +
          '<span class="text-code-num px-2 py-0.5 bg-surface-container-high rounded text-text-primary font-bold">' + esc(k.KPI_ID) + '</span>' +
          (persisted ? '' : '<span class="pill pill-warning !py-0 !text-[11px]">Unsaved</span>') +
          durationPill(k.Duration, true) +
          '<span class="text-label-xs text-text-muted">' + esc(k.Label) + '</span>' +
        '</div>' +
        '<h3 class="text-label-md text-text-primary font-semibold">' + esc(k.KPI_Name) + '</h3>' +
        '<p class="text-label-xs text-text-muted">' + esc(k.Metrics || '-') + '</p>' +
      '</div>' +
      '<div class="flex items-center gap-1.5 bg-surface-page px-2.5 py-1 rounded-lg shrink-0 self-start sm:self-center"' +
        ' title="Weight comes from the Master KPI. Use the edit icon in the catalogue to change it.">' +
        '<span class="text-label-xs uppercase tracking-wider text-text-secondary">Weight</span>' +
        '<span class="text-label-md text-text-primary font-bold tnum whitespace-nowrap">' + pct(k.WeightPercent) + '</span>' +
      '</div>' +
    '</div>';
  }

  function eqiJs(a, b) {
    return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  }

  function renderCatalogue() {
    if (!S.mapping) {
      $('map-catalogue').innerHTML =
        '<p class="text-body-sm text-text-muted text-center py-space-lg">Select an employee first.</p>';
      return;
    }

    var q = ($('map-search').value || '').toLowerCase();
    var fDiv = $('map-f-division').value;
    var fDep = $('map-f-department').value;
    var fPos = $('map-f-position').value;
    var home = S.mapping.home;

    if (q !== S.catQuery) {
      S.catQuery = q;
      S.catOpen = {};
    }

    var list = S.available.filter(function (k) {
      if (fDiv && !eqiJs(k.Division, fDiv)) return false;
      if (fDep && !eqiJs(k.Department, fDep)) return false;
      if (fPos && !eqiJs(k.Position, fPos)) return false;
      if (!q) return true;
      return (k.KPI_Name + ' ' + k.Metrics + ' ' + k.KPI_ID).toLowerCase().indexOf(q) > -1;
    });
    var groups = catalogueGroups(list);

    var isHomeFilter = eqiJs(fDep, home.Department) && eqiJs(fPos, home.Position);
    $('map-filter-note').innerHTML =
      (!fDiv && !fDep && !fPos)
        ? 'Showing every role: ' + groups.length + ' roles, ' + list.length + ' indicators.'
        : isHomeFilter
          ? 'Showing the home role: ' + esc(home.Position) + ' / ' + esc(home.Department) + '.'
          : '<span class="text-status-warning-text font-semibold">Showing KPIs outside the employee home role.</span> ' +
            'Every additional role must be exactly 100%.';

    if (!list.length) {
      var inFilter = S.catalogue.filter(function (k) {
        return (!fDiv || eqiJs(k.Division, fDiv)) && (!fDep || eqiJs(k.Department, fDep)) && (!fPos || eqiJs(k.Position, fPos));
      }).length;
      $('map-catalogue').innerHTML =
        '<div class="bg-surface-card rounded-xl p-space-lg text-center border border-dashed border-border-medium">' +
          '<p class="text-body-md text-text-secondary">' +
            (q ? 'No KPIs match your search.'
               : inFilter ? 'Every KPI in this filter is already selected or in the history.'
               : 'This filter has no KPIs in FY' + esc(S.mapping.year || mapYear()) + ' yet.') + '</p>' +
          '<p class="text-body-sm text-text-muted mt-1">' +
            (q ? 'Try another name or clear the search.'
               : inFilter ? 'Change the filters above to add KPIs from another role.'
               : 'Create them in Master KPIs, then come back to map them.') + '</p>' +
          (!q && !inFilter
            ? '<button type="button" class="btn btn-secondary !py-1.5 !px-3 !text-label-sm mt-space-md" onclick="MGI.go(\'master-kpis\')">' +
                '<span class="material-symbols-outlined text-[16px]">library_books</span> Open Master KPIs</button>'
            : '') +
        '</div>';
      return;
    }

    var maxKpi = S.user.maxKpi || 10;
    S.catAuto = groups.length === 1 || !!q;

    $('map-catalogue').innerHTML = groups.map(function (g) {
      var all = S.available.filter(function (k) { return roleKey(k) === g.key; });
      var inBasket = roleCount(g.key);
      var weight = S.assigned.concat(all).reduce(function (sum, k) {
        return roleKey(k) === g.key ? sum + (Number(k.Weight) || 0) : sum;
      }, 0);
      var percent = Math.round(weight * 1000) / 10;
      var totalOk = Math.abs(weight - 1) < 0.0001;
      var full = inBasket + all.length > maxKpi;
      var open = catIsOpen(g.key);
      var isHome = eqiJs(g.department, home.Department) && eqiJs(g.position, home.Position);
      var key = esc(g.key);

      return '<div class="role-group cat-group shrink-0 !mt-0 shadow-level-1' + (open ? '' : ' is-collapsed') + '">' +
        '<div class="role-group-head !p-4" onclick="MGI.toggleCatGroup(\'' + key + '\')"' +
          ' title="Click to ' + (open ? 'collapse' : 'expand') + ' the KPI list for this role">' +
          '<span class="material-symbols-outlined text-[20px] text-text-secondary">' +
            (open ? 'expand_less' : 'expand_more') + '</span>' +
          '<div class="flex flex-col gap-1 min-w-0 flex-1">' +
            '<div class="flex items-center gap-space-xs flex-wrap">' +
              '<span class="text-title-md text-text-primary">' + esc(g.label) + '</span>' +
              (isHome
                ? '<span class="pill pill-neutral !py-0 !text-[11px]">Home</span>'
                : '<span class="pill pill-maroon !py-0 !text-[11px]">Cross-Role</span>') +
            '</div>' +
            '<div class="flex items-center gap-space-xs flex-wrap">' +
              (g.division ? '<span class="text-label-xs text-text-muted">' + esc(g.division) + '</span>' : '') +
              '<span class="pill pill-neutral !py-0 !text-[11px]">' + all.length + ' KPI</span>' +
              '<span class="pill ' + (totalOk ? 'pill-success' : 'pill-warning') + ' !py-0 !text-[11px]"' +
                (totalOk ? '' : ' title="Role total weight must be exactly 100%. Fix it with the Master KPI edit icon."') + '>' +
                (totalOk ? '' : '<span class="material-symbols-outlined text-[12px]">warning</span>') +
                'Total ' + percent + '%</span>' +
              (inBasket ? '<span class="pill pill-info !py-0 !text-[11px]">' + inBasket + ' already in basket</span>' : '') +
              (q && g.items.length < all.length
                ? '<span class="text-label-xs text-text-muted">' + g.items.length + ' match search</span>' : '') +
            '</div>' +
          '</div>' +
          '<button class="btn btn-secondary !py-1.5 !px-3 !text-label-sm shrink-0"' +
            ' onclick="event.stopPropagation();MGI.addRoleGroup(\'' + key + '\')"' +
            (full ? ' disabled title="This role would exceed the quota of ' + maxKpi + ' KPIs"'
                  : ' title="Add every KPI in this role to the basket"') + '>' +
            '<span class="material-symbols-outlined text-[16px] ' + (full ? 'text-slate-400' : 'text-primary-container') + '">' + (full ? 'block' : 'add') + '</span>' +
            (full ? 'Quota Full' : 'Add Role (' + all.length + ')') +
          '</button>' +
        '</div>' +
        '<div class="role-group-body">' + g.items.map(catalogueCard).join('') + '</div>' +
      '</div>';
    }).join('');
  }

  function catalogueGroups(list) {
    var home = S.mapping.home;
    var buckets = {};
    var order = [];
    list.forEach(function (k) {
      var key = roleKey(k);
      if (!buckets[key]) {
        buckets[key] = { key: key, label: roleLabel(k), position: k.Position,
                         department: k.Department, division: k.Division, items: [] };
        order.push(key);
      }
      buckets[key].items.push(k);
    });
    var rank = function (g) {
      return eqiJs(g.department, home.Department) && eqiJs(g.position, home.Position) ? 0 : 1;
    };
    return order.map(function (key) { return buckets[key]; }).sort(function (a, b) {
      return rank(a) - rank(b) || a.label.localeCompare(b.label);
    });
  }

  function catalogueCard(k) {
    return '' +
    '<div class="rounded-lg p-space-sm border border-border-light bg-surface-card hover:shadow-level-1 transition-shadow">' +
      '<div class="flex items-start justify-between gap-space-sm">' +
        '<div class="min-w-0 flex-1">' +
          '<div class="flex items-center gap-space-xs flex-wrap mb-0.5">' +
            '<span class="text-code-num px-2 py-0.5 bg-surface-container-high rounded text-text-primary font-bold">' + esc(k.KPI_ID) + '</span>' +
            durationPill(k.Duration, true) +
            '<span class="text-label-xs text-text-muted">' + esc(k.Label) + ' • Target ' +
              esc(num(k.Target, 2)) + ' ' + esc(k.Unit || '') + '</span>' +
          '</div>' +
          '<h3 class="text-label-md text-text-primary font-semibold">' + esc(k.KPI_Name) + '</h3>' +
          '<p class="text-label-xs text-text-muted">' + esc(k.Metrics || '-') + '</p>' +
        '</div>' +
        '<div class="flex items-center gap-space-xs shrink-0">' +
          '<span class="text-label-sm text-text-primary font-bold tnum whitespace-nowrap">Weight: ' + pct(k.WeightPercent) + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function catIsOpen(key) {
    return Object.prototype.hasOwnProperty.call(S.catOpen, key) ? S.catOpen[key] : S.catAuto;
  }

  function toggleCatGroup(key) {
    S.catOpen[key] = !catIsOpen(key);
    renderCatalogue();
  }

  function roleKey(k) {
    var base = (k.Position + '|' + k.Department).toLowerCase();
    return k.Year ? base + '|' + k.Year : base;
  }

  function roleLabel(k) {
    return k.Position + ' / ' + k.Department + (k.Year ? ' (' + k.Year + ')' : '');
  }

  function roleCount(key) {
    return S.assigned.filter(function (k) { return roleKey(k) === key; }).length;
  }

  function addRoleGroup(key) {
    var incoming = S.available.filter(function (k) { return roleKey(k) === key; });
    if (!incoming.length) return;

    var maxKpi = S.user.maxKpi || 10;
    var label = roleLabel(incoming[0]);
    var total = roleCount(key) + incoming.length;

    if (total > maxKpi) {
      toast('Role ' + label + ' would hold ' + total + ' KPIs, above the quota of ' + maxKpi + '.', 'warning');
      return;
    }

    S.available = S.available.filter(function (k) { return roleKey(k) !== key; });
    S.assigned = S.assigned.concat(incoming);
    S.collapsed[key] = false;
    renderAssigned(); renderCatalogue(); renderWeightHero(); renderSaveHint();
    toast(incoming.length + ' KPIs from ' + label + ' added to the basket. Save to publish.', 'success');
  }

  function deactivateRoleGroup(key) {
    var members = S.assigned.filter(function (k) { return roleKey(k) === key; });
    if (!members.length) return;

    var saved = members.filter(function (k) { return isPersisted(k.KPI_ID); });
    var fresh = members.filter(function (k) { return !isPersisted(k.KPI_ID); });

    S.assigned = S.assigned.filter(function (k) { return roleKey(k) !== key; });
    S.history = S.history.concat(saved);
    S.available = S.available.concat(fresh).sort(function (a, b) { return a.KPI_ID < b.KPI_ID ? -1 : 1; });
    if (saved.length) S.historyOpen = true;

    renderAssigned(); renderCatalogue(); renderWeightHero(); renderSaveHint();
  }

  function activateRoleGroup(key) {
    var members = S.history.filter(function (k) { return roleKey(k) === key; });
    if (!members.length) return;

    var maxKpi = S.user.maxKpi || 10;
    var total = roleCount(key) + members.length;
    if (total > maxKpi) {
      toast('Role ' + roleLabel(members[0]) + ' would hold ' + total +
            ' active KPIs, above the quota of ' + maxKpi + '.', 'warning');
      return;
    }

    S.history = S.history.filter(function (k) { return roleKey(k) !== key; });
    S.assigned = S.assigned.concat(members);
    S.collapsed[key] = false;

    renderAssigned(); renderCatalogue(); renderWeightHero(); renderSaveHint();
  }

  function renderSaveHint() {
    var btn = $('btn-save-mapping');
    var hint = $('map-save-hint');

    if (!S.mapping) {
      btn.disabled = true;
      hint.innerHTML = '<span class="material-symbols-outlined text-text-muted">info</span>' +
                       '<p class="text-body-sm text-text-muted">Select an employee to begin.</p>';
      return;
    }

    var groups = groupAssigned();
    var bad = groups.filter(function (g) { return !g.valid; });
    var retireAll = groups.length === 0 && S.mapping.assigned.length > 0;
    var valid = bad.length === 0 && (groups.length > 0 || retireAll);
    var dirty = isBasketDirty();

    btn.disabled = !valid || !dirty;

    if (valid && !dirty) {
      hint.innerHTML = '<span class="material-symbols-outlined text-text-muted">verified</span>' +
        '<div><p class="text-title-md text-text-primary">Published</p>' +
        '<p class="text-body-sm text-text-secondary">' + esc(S.mapping.employee.Full_Name) + ' has ' +
          plural(S.assigned.length, 'KPI') + ' in ' + plural(groups.length, 'role') + ', every weight at 100%. ' +
          'Add or remove KPIs to make a change.</p></div>';
      return;
    }

    hint.innerHTML = valid
      ? '<span class="material-symbols-outlined text-status-success">task_alt</span>' +
        '<div><p class="text-title-md text-text-primary">Ready to Publish</p>' +
        '<p class="text-body-sm text-text-secondary">' +
        (retireAll
          ? plural(S.mapping.assigned.length, 'KPI') + ' will be deactivated for ' + esc(S.mapping.employee.Full_Name) + '. Their history is kept.'
          : esc(S.mapping.employee.Full_Name) + ' will have ' + plural(S.assigned.length, 'KPI') + ' in ' + plural(groups.length, 'role') + ', every weight at 100%.') +
        '</p></div>'
      : '<span class="material-symbols-outlined text-status-danger">block</span>' +
        '<div><p class="text-title-md text-status-danger-text">Publishing Blocked</p>' +
        '<p class="text-body-sm text-text-secondary">' +
          (groups.length === 0
            ? 'No KPIs selected yet.'
            : bad.map(function (g) {
                return esc(g.label) + ': ' +
                  (!g.quotaValid ? g.count + ' KPIs exceed the quota of ' + (S.user.maxKpi || 10)
                                 : 'weight ' + g.percent + '% must be exactly 100%');
              }).join('. ') + '.') +
        '</p></div>';
  }

  function saveMapping() {
    if (!S.mapping) return;
    var restore = busy($('btn-save-mapping'), 'Saving');
    var ids = S.assigned.map(function (k) { return k.KPI_ID; });

    api('saveMapping', S.mapping.employee.NIK, S.mapping.year || mapYear(), ids)
      .then(function (res) {
        restore();
        toast(res.message, 'success');
        S.mapping.assigned = S.assigned.slice();
        backToPicker();
      })
      .catch(function (err) {
        restore();
        toast(err.message, 'error');
      });
  }

  function initMasterKpis() {
    wireMasterUpload();
    applyMasterView();
    loadMasterCatalog();
    if (S.mkView === 'health') loadKpiHealth(S.kpiHealthYear);
  }

  function applyMasterView() {
    var health = S.mkView === 'health';
    $('mk-library').classList.toggle('hidden', health);
    $('mk-health').classList.toggle('hidden', !health);
    document.querySelectorAll('#mk-view-tabs [data-mk-view]').forEach(function (b) {
      var on = b.dataset.mkView === S.mkView;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  function setMasterView(view) {
    S.mkView = view === 'health' ? 'health' : 'library';
    applyMasterView();
    if (S.mkView !== 'health') return;
    if (S.kpiHealth) renderKpiHealth();
    else loadKpiHealth(S.kpiHealthYear);
  }

  function reloadMaster() {
    if (S.mkView === 'health') loadKpiHealth(S.kpiHealthYear);
    else loadMasterCatalog();
  }

  function onKpiHealthYear(value) {
    var year = parseInt(value, 10);
    if (!year || year === S.kpiHealthYear) return;
    loadKpiHealth(year);
  }

  function loadKpiHealth(year) {
    var want = parseInt(year, 10) || null;
    if (!S.kpiHealth || (want && S.kpiHealth.year !== want)) {
      showKpiHealthRow('<div class="flex flex-col gap-2"><div class="skeleton h-10 w-full"></div><div class="skeleton h-10 w-full"></div></div>');
    }
    S.kpiHealthYear = want;
    return (want ? api('getKpiHealth', want) : api('getKpiHealth'))
      .then(function (data) {
        if (S.kpiHealthYear !== want) return;
        S.kpiHealth = data;
        S.kpiHealthYear = data.year;
        fillKpiHealthFilters();
        renderKpiHealth();
      })
      .catch(function (err) {
        if (S.kpiHealthYear !== want) return;
        showKpiHealthRow('<p class="p-space-lg text-center text-status-danger">' + esc(err.message) + '</p>');
        toast(err.message, 'error');
      });
  }

  function fillKpiHealthFilters() {
    var d = S.kpiHealth;
    var years = (d.years || []).slice();
    if (years.indexOf(d.year) === -1) years.push(d.year);
    years.sort(function (a, b) { return b - a; });
    var yearSel = $('mkh-year');
    yearSel.innerHTML = years.map(function (y) {
      return '<option value="' + y + '">' + y + (y === d.activeYear ? ' (Active)' : '') + '</option>';
    }).join('');
    yearSel.value = String(d.year);

    var divSel = $('mkh-division');
    var keep = divSel.value;
    var seen = {};
    var divisions = [];
    (d.kpis || []).forEach(function (k) {
      var name = k.Division || '-';
      if (!seen[name]) { seen[name] = true; divisions.push(name); }
    });
    divisions.sort();
    divSel.innerHTML = '<option value="">All divisions</option>' + divisions.map(function (name) {
      return '<option value="' + esc(name) + '">' + esc(name) + '</option>';
    }).join('');
    divSel.value = divisions.indexOf(keep) > -1 ? keep : '';
    fillKpiHealthRoles();
  }

  function kpiHealthRole(k) {
    return k.Position + ' / ' + k.Department;
  }

  function fillKpiHealthRoles() {
    var d = S.kpiHealth;
    var roleSel = $('mkh-role');
    if (!d || !roleSel) return;
    var division = $('mkh-division').value;
    var keep = roleSel.value;
    var seen = {};
    var roles = [];
    (d.kpis || []).forEach(function (k) {
      if (division && (k.Division || '-') !== division) return;
      var name = kpiHealthRole(k);
      if (!seen[name]) { seen[name] = true; roles.push(name); }
    });
    roles.sort(function (a, b) { return a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0; });
    roleSel.innerHTML = '<option value="">All roles</option>' + roles.map(function (name) {
      return '<option value="' + esc(name) + '">' + esc(name) + '</option>';
    }).join('');
    roleSel.value = roles.indexOf(keep) > -1 ? keep : '';
  }

  function onKpiHealthDivision() {
    fillKpiHealthRoles();
    renderKpiHealth();
  }

  function showKpiHealthRow(html) {
    $('mkh-card').classList.remove('hidden');
    $('mkh-empty').classList.add('hidden');
    if (!$('mkh-thead').innerHTML) $('mkh-thead').innerHTML = kpiHealthHead(S.healthSort || { key: 'flag', dir: 1 });
    $('mkh-tbody').innerHTML = '<tr><td colspan="10">' + html + '</td></tr>';
  }

  function kpiHealthHead(sort) {
    return '<tr>' +
      '<th>KPI ID</th>' +
      sortHead('KPI Name', 'name', sort, 'sortKpiHealth', 'min-w-[220px]') +
      sortHead('Role', 'role', sort, 'sortKpiHealth', 'min-w-[180px]') +
      '<th>Target</th>' +
      sortHead('Holders', 'holders', sort, 'sortKpiHealth', 'text-right') +
      sortHead('Submissions', 'entries', sort, 'sortKpiHealth', 'text-right') +
      sortHead('At 1.0', 'top', sort, 'sortKpiHealth', 'text-right') +
      sortHead('At 0.2', 'bottom', sort, 'sortKpiHealth', 'text-right') +
      sortHead('Avg Tier', 'tier', sort, 'sortKpiHealth', 'text-right') +
      sortHead('Flag', 'flag', sort, 'sortKpiHealth', 'text-center') +
    '</tr>';
  }

  function pickKpiHealthFlag(key) {
    var sel = $('mkh-flag');
    sel.value = sel.value === key ? '' : key;
    renderKpiHealth();
  }

  function sortKpiHealth(key) {
    S.healthSort = nextSort(S.healthSort, key, key === 'name' || key === 'role' || key === 'flag' ? 1 : -1);
    renderKpiHealth();
  }

  function kpiHealthSorted(list) {
    var sort = S.healthSort || { key: 'flag', dir: 1 };
    var byName = function (a, b) {
      var x = String(a.KPI_Name || '').toLowerCase();
      var y = String(b.KPI_Name || '').toLowerCase();
      if (x !== y) return x < y ? -1 : 1;
      return a.KPI_ID < b.KPI_ID ? -1 : a.KPI_ID > b.KPI_ID ? 1 : 0;
    };
    var pick = {
      flag:    function (k) { return HEALTH_FLAGS[k.flag] ? HEALTH_FLAGS[k.flag].order : HEALTH_ORDER.length; },
      holders: function (k) { return k.holders; },
      entries: function (k) { return k.entries; },
      top:     function (k) { return k.pctTop; },
      bottom:  function (k) { return k.pctBottom; },
      tier:    function (k) { return k.avgTier; }
    }[sort.key];
    var byRole = function (a, b) {
      var x = kpiHealthRole(a).toLowerCase();
      var y = kpiHealthRole(b).toLowerCase();
      return x === y ? 0 : x < y ? -1 : 1;
    };
    return list.slice().sort(function (a, b) {
      if (sort.key === 'role') return byRole(a, b) * sort.dir || byName(a, b);
      if (!pick) return byName(a, b) * sort.dir;
      var x = pick(a);
      var y = pick(b);
      var xe = !isNum(x);
      var ye = !isNum(y);
      if (xe !== ye) return xe ? 1 : -1;
      if (!xe && x !== y) return (x < y ? -1 : 1) * sort.dir;
      return byName(a, b);
    });
  }

  function kpiHealthCard(key, count, active) {
    var f = HEALTH_FLAGS[key];
    return '<button type="button" class="text-left bg-surface-card rounded-xl px-4 py-3 shadow-level-1 border transition-all duration-150 hover:shadow-level-2 ' +
        (active ? 'border-primary-container ring-1 ring-primary-container' : 'border-border-light') + '"' +
        ' aria-pressed="' + (active ? 'true' : 'false') + '" data-health-card="' + key + '" onclick="MGI.pickKpiHealthFlag(\'' + key + '\')"' +
        ' title="' + (active ? 'Show every flag' : 'Show only ' + esc(f.label)) + '">' +
      '<span class="flex items-center gap-1.5 text-sm font-medium text-slate-500">' +
        '<span class="material-symbols-outlined text-[18px] ' + f.text + '">' + f.icon + '</span>' + esc(f.label) +
      '</span>' +
      '<span class="block text-[24px] leading-8 font-bold tracking-tight mt-1 ' + (count ? f.text : 'text-text-muted') + '">' + count + '</span>' +
      '<span class="block text-body-sm text-text-muted">' + esc(f.caption) + '</span>' +
    '</button>';
  }

  function kpiHealthLegend(d) {
    var t = d.thresholds || {};
    var trial = (d.trialMonths || []).map(function (m) { return MONTHS[m - 1]; }).filter(Boolean);
    return 'Too easy: ' + t.easyPct + '% or more of submissions at tier 1.0. ' +
      'Unrealistic: ' + t.hardPct + '% or more at tier 0.2. ' +
      'A flag needs at least ' + plural(t.minEntries, 'submission') + '. ' +
      (trial.length
        ? trial.join(' and ') + (trial.length === 1 ? ' is a trial month and is' : ' are trial months and are') + ' left out. '
        : '') +
      'Automatic tier 1.0 for off-cycle quarterly KPIs is not a submission and is not counted.';
  }

  function kpiHealthRowHtml(k) {
    var f = HEALTH_FLAGS[k.flag] || HEALTH_FLAGS.thin;
    var meta = labelMeta(k.Label);
    var quarterly = String(k.Duration || '').toLowerCase() === 'quarterly';
    return '<tr class="' + (k.IsActive ? '' : 'mk-row-inactive') + '" data-health-kpi="' + esc(k.KPI_ID) + '">' +
      '<td class="text-label-xs font-bold text-text-secondary whitespace-nowrap">' + esc(k.KPI_ID) + '</td>' +
      '<td class="text-label-md font-semibold text-text-primary">' + esc(k.KPI_Name) +
        (k.Metrics ? '<span class="block text-body-sm text-text-muted mt-1 font-normal">' + esc(k.Metrics) + '</span>' : '') +
        (quarterly || !k.IsActive
          ? '<span class="flex flex-wrap gap-1 mt-1">' +
              (quarterly ? durationPill(k.Duration, true) : '') +
              (k.IsActive ? '' : '<span class="pill pill-neutral !py-0 !text-[11px]">Inactive</span>') +
            '</span>'
          : '') +
      '</td>' +
      '<td class="text-label-sm text-text-secondary">' + esc(k.Position + ' / ' + k.Department) + '</td>' +
      '<td class="whitespace-nowrap">' +
        '<span class="text-code-num">' + esc(num(k.Target, 2)) + '</span>' +
        (k.Unit ? ' <span class="text-label-sm text-text-secondary">' + esc(k.Unit) + '</span>' : '') +
        '<span class="block text-[11px] font-semibold ' + meta.text + '">' + esc(meta.short) + '</span>' +
      '</td>' +
      '<td class="text-right text-code-num">' + esc(num(k.holders, 0)) + '</td>' +
      '<td class="text-right text-code-num">' + esc(num(k.entries, 0)) + '</td>' +
      '<td class="text-right text-code-num">' + esc(pct(k.pctTop)) + '</td>' +
      '<td class="text-right text-code-num">' + esc(pct(k.pctBottom)) + '</td>' +
      '<td class="text-right text-code-num font-semibold">' + (isNum(k.avgTier) ? k.avgTier.toFixed(2) : '-') + '</td>' +
      '<td class="text-center"><span class="pill ' + f.pill + ' !py-0 !text-[11px] whitespace-nowrap">' + esc(f.label) + '</span></td>' +
    '</tr>';
  }

  function renderKpiHealth() {
    var d = S.kpiHealth;
    if (!d || !$('mkh-tbody')) return;

    var division = $('mkh-division').value;
    var role = $('mkh-role').value;
    var flag = $('mkh-flag').value;
    var q = ($('mkh-search').value || '').trim().toLowerCase();
    var base = (d.kpis || []).filter(function (k) {
      if (division && (k.Division || '-') !== division) return false;
      if (role && kpiHealthRole(k) !== role) return false;
      if (q && (k.KPI_ID + ' ' + k.KPI_Name + ' ' + (k.Metrics || '') + ' ' + k.Position + ' ' + k.Department).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    var counts = {};
    base.forEach(function (k) { counts[k.flag] = (counts[k.flag] || 0) + 1; });
    $('mkh-summary').innerHTML = HEALTH_ORDER.map(function (key) {
      return kpiHealthCard(key, counts[key] || 0, flag === key);
    }).join('');
    $('mkh-legend').textContent = kpiHealthLegend(d);

    var list = kpiHealthSorted(base.filter(function (k) { return !flag || k.flag === flag; }));
    var empty = !list.length;
    $('mkh-card').classList.toggle('hidden', empty);
    $('mkh-empty').classList.toggle('hidden', !empty);
    $('mkh-thead').innerHTML = kpiHealthHead(S.healthSort || { key: 'flag', dir: 1 });
    $('mkh-tbody').innerHTML = list.map(kpiHealthRowHtml).join('');
    $('mkh-empty').innerHTML = !empty ? '' :
      '<div class="bg-surface-card rounded-xl border border-dashed border-border-medium p-space-xl text-center">' +
        '<span class="material-symbols-outlined text-[40px] text-text-muted">monitor_heart</span>' +
        '<p class="text-body-md text-text-secondary mt-2">' +
          ((d.kpis || []).length ? 'No KPIs match these filters.' : 'FY' + esc(d.year) + ' has no Master KPIs yet.') + '</p>' +
      '</div>';
    schedulePins();
  }

  function loadMasterCatalog() {
    if (!S.masterList.length) {
      $('mk-tree').innerHTML = '<div class="skeleton h-16 w-full"></div><div class="skeleton h-16 w-full"></div>';
    }
    api('getMasterCatalog')
      .then(function (data) {
        S.masterMeta = data;
        S.masterList = data.kpis || [];
        if (S.mkView !== 'health') S.kpiHealth = null;
        fillMasterFilters();
        renderMasterTree();
      })
      .catch(function (err) {
        $('mk-tree').innerHTML =
          '<div class="bg-surface-card rounded-xl border border-border-light p-space-xl text-center text-status-danger">' + esc(err.message) + '</div>';
        toast(err.message, 'error');
      });
  }

  function fillMasterFilters() {
    var yearSel = $('mk-f-year');
    var keepYear = yearSel.value;
    var years = (S.masterMeta.years || []).slice();
    yearSel.innerHTML = '<option value="">All years</option>' + years.map(function (y) {
      return '<option value="' + y + '">' + y + (y === S.masterMeta.activeYear ? ' (Active)' : '') + '</option>';
    }).join('');
    var pick = S.masterYearPick;
    S.masterYearPick = null;
    yearSel.value = pick && years.indexOf(pick) > -1 ? String(pick)
                  : keepYear !== '' && years.indexOf(parseInt(keepYear, 10)) > -1 ? keepYear
                  : keepYear === '' && yearSel.dataset.loaded ? '' : String(S.masterMeta.activeYear);
    yearSel.dataset.loaded = '1';

    var divSel = $('mk-f-division');
    var keepDiv = divSel.value;
    var seen = {};
    var divisions = [];
    S.masterList.forEach(function (k) {
      var d = k.Division || '-';
      if (!seen[d]) { seen[d] = true; divisions.push(d); }
    });
    divisions.sort();
    divSel.innerHTML = '<option value="">All divisions</option>' + divisions.map(function (d) {
      return '<option value="' + esc(d) + '">' + esc(d) + '</option>';
    }).join('');
    divSel.value = divisions.indexOf(keepDiv) > -1 ? keepDiv : '';
  }

  function kpiWeightPct(k) {
    return isNum(k.Weight) ? Number(k.Weight) * 100 : Number(k.WeightPercent) || 0;
  }

  function masterRoleKey(k) {
    return 'r:' + k.Year + '|' + (k.Division || '-') + '|' + (k.Position + '|' + k.Department).toLowerCase();
  }

  function masterIsOpen(key, fallback) {
    return Object.prototype.hasOwnProperty.call(S.masterOpen, key) ? S.masterOpen[key] : fallback;
  }

  function toggleMasterNode(key, fallback) {
    S.masterOpen[key] = !masterIsOpen(key, !!fallback);
    renderMasterTree();
  }

  function masterFiltered() {
    var year = $('mk-f-year').value;
    var division = $('mk-f-division').value;
    var status = $('mk-f-status').value;
    var q = ($('mk-f-search').value || '').trim().toLowerCase();
    return S.masterList.filter(function (k) {
      if (year && String(k.Year) !== year) return false;
      if (division && (k.Division || '-') !== division) return false;
      if (status === 'active' && !k.IsActive) return false;
      if (status === 'inactive' && k.IsActive) return false;
      if (q && (k.KPI_ID + ' ' + k.KPI_Name + ' ' + k.Position + ' ' + k.Department).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function masterTree(list) {
    var years = {};
    var yearOrder = [];
    list.forEach(function (k) {
      var y = String(k.Year);
      if (!years[y]) {
        years[y] = { year: y, divisions: {}, order: [] };
        yearOrder.push(y);
      }
      var Y = years[y];
      var d = k.Division || '-';
      if (!Y.divisions[d]) {
        Y.divisions[d] = { name: d, roles: {}, order: [] };
        Y.order.push(d);
      }
      var D = Y.divisions[d];
      var key = masterRoleKey(k);
      if (!D.roles[key]) {
        D.roles[key] = { key: key, label: roleLabel(k), items: [] };
        D.order.push(key);
      }
      D.roles[key].items.push(k);
    });

    yearOrder.sort(function (a, b) { return Number(b) - Number(a); });
    return yearOrder.map(function (y) {
      var Y = years[y];
      Y.order.sort();
      return {
        year: y,
        divisions: Y.order.map(function (d) {
          var D = Y.divisions[d];
          D.order.sort(function (a, b) { return D.roles[a].label.localeCompare(D.roles[b].label); });
          return { name: d, roles: D.order.map(function (key) { return D.roles[key]; }) };
        })
      };
    });
  }

  function masterNode(cls, key, fallback, head, body) {
    var open = masterIsOpen(key, fallback);
    return '<div class="role-group ' + cls + ' shrink-0 !mt-0 shadow-level-1' + (open ? '' : ' is-collapsed') + '">' +
      '<div class="role-group-head !p-4" onclick="MGI.toggleMasterNode(\'' + esc(key) + '\', ' + (fallback ? 'true' : 'false') + ')">' +
        '<span class="material-symbols-outlined text-[20px] text-text-secondary">' + (open ? 'expand_less' : 'expand_more') + '</span>' +
        head +
      '</div>' +
      '<div class="role-group-body' + (cls.indexOf('mk-role') === 0 ? '' : ' !gap-3') + '">' + body + '</div>' +
    '</div>';
  }

  function masterRoleHtml(role, fallback) {
    var full = S.masterList.filter(function (k) { return masterRoleKey(k) === role.key; });
    var active = full.filter(function (k) { return k.IsActive; });
    var anyActive = active.length > 0;
    var mixed = anyActive && active.length < full.length;
    var weight = Math.round(active.reduce(function (sum, k) { return sum + kpiWeightPct(k); }, 0) * 10) / 10;
    var mapped = full.reduce(function (sum, k) { return sum + (k.mappedCount || 0); }, 0);
    var busyRole = !!S.masterBusy[role.key];

    var head =
      '<div class="flex flex-col gap-1 min-w-0 flex-1">' +
        '<div class="flex items-center gap-space-xs flex-wrap">' +
          '<span class="text-title-md ' + (anyActive ? 'text-text-primary' : 'text-text-secondary') + '">' + esc(role.label) + '</span>' +
          '<span class="pill pill-neutral !py-0 !text-[11px]">' + full.length + ' KPIs</span>' +
          (anyActive
            ? '<span class="pill ' + (Math.abs(weight - 100) < 0.05 ? 'pill-success' : 'pill-warning') + ' !py-0 !text-[11px]">Active weight ' + weight + '%</span>'
            : '') +
          (mixed ? '<span class="pill pill-warning !py-0 !text-[11px]">Partly active</span>' : '') +
          (mapped ? '<span class="pill pill-info !py-0 !text-[11px]">Used by ' + mapped + ' mappings</span>' : '') +
        '</div>' +
      '</div>' +
      '<label class="switch shrink-0" onclick="event.stopPropagation()" title="' +
        (anyActive ? 'Deactivate this role group: it disappears from the Mapping KPI catalogue' : 'Activate this role group for Mapping KPI') + '">' +
        '<input type="checkbox"' + (anyActive ? ' checked' : '') + (busyRole ? ' disabled' : '') +
          ' onchange="MGI.toggleMasterRole(\'' + esc(role.key) + '\', this.checked)">' +
        '<span class="switch-track"><span class="switch-thumb"></span></span>' +
        '<span class="switch-label">' + (busyRole ? 'Saving' : anyActive ? 'Active' : 'Inactive') + '</span>' +
      '</label>';

    var rows = role.items.map(function (k) {
      return '<tr class="' + (k.IsActive ? '' : 'mk-row-inactive') + '">' +
        '<td class="text-label-xs font-bold text-text-secondary whitespace-nowrap">' + esc(k.KPI_ID) + '</td>' +
        '<td class="text-label-md font-semibold text-text-primary">' + esc(k.KPI_Name) + '</td>' +
        '<td class="text-label-sm text-text-secondary">' + esc(k.Metrics || '-') + '</td>' +
        '<td class="text-right text-code-num">' + esc(num(k.Target, 2)) + '</td>' +
        '<td class="text-label-sm whitespace-nowrap">' + esc(k.Unit || '-') + '</td>' +
        '<td class="text-right text-code-num font-semibold">' + pct(k.WeightPercent) + '</td>' +
        '<td class="text-label-sm">' + esc(k.Label) + '</td>' +
        '<td>' + durationPill(k.Duration, true) + '</td>' +
        '<td class="text-right text-code-num">' + esc(num(k.Multiplier, 2)) + '</td>' +
        '<td class="text-center text-label-sm">' + (k.Target_Is_B ? 'Yes' : 'No') + '</td>' +
        '<td class="text-center">' +
          (k.IsActive ? '<span class="pill pill-success !py-0 !text-[11px]">Active</span>' : '<span class="pill pill-neutral !py-0 !text-[11px]">Inactive</span>') +
          (k.mappedCount ? '<span class="block text-[11px] text-text-muted mt-0.5">' + k.mappedCount + ' mapped</span>' : '') +
        '</td>' +
        '<td class="text-right">' +
          '<button class="btn btn-secondary !py-1 !px-2.5 !text-label-xs" onclick="MGI.openMasterModal(\'' + esc(k.KPI_ID) + '\')">' +
            '<span class="material-symbols-outlined text-[16px]">edit</span>Edit</button>' +
        '</td>' +
      '</tr>';
    }).join('');

    var body =
      '<div class="table-scroll">' +
        '<table class="data-table mk-table">' +
          '<thead><tr>' +
            '<th>KPI ID</th><th class="min-w-[220px]">KPI Name</th><th class="min-w-[200px]">Metrics</th>' +
            '<th class="text-right">Target</th><th>Unit</th><th class="text-right">Weight</th><th>Label</th><th>Duration</th>' +
            '<th class="text-right">Multiplier</th><th class="text-center">Target is B</th><th class="text-center">Status</th><th class="text-right">Action</th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>';

    return masterNode('mk-role' + (anyActive ? '' : ' is-inactive'), role.key, fallback, head, body);
  }

  function renderMasterTree() {
    var host = $('mk-tree');
    if (!host || !S.masterMeta) return;

    var list = masterFiltered();
    if (!list.length) {
      host.innerHTML =
        '<div class="bg-surface-card rounded-xl border border-dashed border-border-medium p-space-xl text-center">' +
          '<span class="material-symbols-outlined text-[40px] text-text-muted">library_books</span>' +
          '<p class="text-body-md text-text-secondary mt-2">' +
            (S.masterList.length ? 'No KPIs match these filters.' : 'No Master KPIs yet. Use Add KPIs or Bulk Upload.') + '</p>' +
        '</div>';
      return;
    }

    var searching = !!($('mk-f-search').value || '').trim();
    var tree = masterTree(list);

    host.innerHTML = tree.map(function (Y) {
      var yearKpis = list.filter(function (k) { return String(k.Year) === Y.year; });
      var activeCount = yearKpis.filter(function (k) { return k.IsActive; }).length;
      var roleCount = Y.divisions.reduce(function (sum, D) { return sum + D.roles.length; }, 0);

      var divisions = Y.divisions.map(function (D) {
        var roles = D.roles.map(function (R) {
          return masterRoleHtml(R, D.roles.length === 1 || searching);
        }).join('');
        var dHead =
          '<span class="material-symbols-outlined text-[18px] text-text-muted">account_tree</span>' +
          '<span class="text-title-md text-text-primary">' + esc(D.name) + '</span>' +
          '<span class="pill pill-neutral !py-0 !text-[11px]">' + plural(D.roles.length, 'role group') + '</span>';
        return masterNode('mk-division', 'd:' + Y.year + '|' + D.name, true, dHead, roles);
      }).join('');

      var year = masterYearStats(Y.year);
      var busyYear = !!S.masterBusy['year:' + Y.year];
      var yearLabel = busyYear ? 'Saving' : year.state === 'on' ? 'All active' : year.state === 'partial' ? 'Partly active' : 'Inactive';
      var yHead =
        '<span class="text-lg font-bold text-slate-900 tracking-tight">FY' + esc(Y.year) + '</span>' +
        (Number(Y.year) === S.masterMeta.activeYear ? '<span class="pill pill-brand !py-0 !text-[11px]">Active year</span>' : '') +
        '<span class="ml-auto flex items-center gap-space-xs flex-wrap">' +
          '<span class="pill pill-neutral !py-0 !text-[11px]">' + yearKpis.length + ' KPIs</span>' +
          '<span class="pill pill-success !py-0 !text-[11px]">' + activeCount + ' active</span>' +
          '<span class="pill pill-neutral !py-0 !text-[11px]">' + plural(roleCount, 'role group') + '</span>' +
        '</span>' +
        '<label class="switch shrink-0 pl-2 ml-1 border-l border-slate-200" data-master-year="' + esc(Y.year) + '" onclick="event.stopPropagation()" title="' +
          (year.state === 'off' ? 'Activate every KPI of FY' + esc(Y.year) : 'Activate or deactivate every KPI of FY' + esc(Y.year)) + '">' +
          '<input type="checkbox"' + (year.state !== 'off' ? ' checked' : '') + (busyYear ? ' disabled' : '') +
            ' onchange="MGI.confirmMasterYear(' + Number(Y.year) + ')">' +
          '<span class="switch-track' + (year.state === 'partial' ? ' is-partial' : '') + '"><span class="switch-thumb"></span></span>' +
          '<span class="switch-label">' + yearLabel + '</span>' +
        '</label>';
      return masterNode('mk-year', 'y:' + Y.year, tree.length === 1 || Number(Y.year) === S.masterMeta.activeYear || searching, yHead, divisions);
    }).join('');
  }

  function masterYearStats(year) {
    var kpis = S.masterList.filter(function (k) { return String(k.Year) === String(year); });
    var active = kpis.filter(function (k) { return k.IsActive; }).length;
    var groups = {};
    kpis.forEach(function (k) { groups[masterRoleKey(k)] = true; });
    return {
      year: Number(year),
      total: kpis.length,
      active: active,
      groups: Object.keys(groups).length,
      mapped: kpis.reduce(function (sum, k) { return sum + (k.mappedCount || 0); }, 0),
      state: !kpis.length || !active ? 'off' : active === kpis.length ? 'on' : 'partial'
    };
  }

  function confirmMasterYear(year) {
    var st = masterYearStats(year);
    renderMasterTree();
    if (!st.total) return;
    var button = function (on, primary) {
      return '<button type="button" class="btn ' + (primary ? (on ? 'btn-primary' : 'btn-danger') : 'btn-secondary') + '" data-year-action="' + (on ? 'on' : 'off') + '"' +
        ' onclick="MGI.applyMasterYear(' + st.year + ', ' + (on ? 'true' : 'false') + ')">' +
        '<span class="material-symbols-outlined text-[18px]">' + (on ? 'toggle_on' : 'toggle_off') + '</span> ' +
        (on ? 'Activate all FY' + st.year + ' KPIs' : 'Deactivate all FY' + st.year + ' KPIs') + '</button>';
    };
    var actions = st.state === 'on' ? button(false, true)
      : st.state === 'off' ? button(true, true)
      : button(false, false) + button(true, true);

    $('modal-host').innerHTML =
      '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closeMasterYear()">' +
        '<div class="modal-panel !max-w-lg">' +
          '<div class="px-6 pt-6 pb-4 flex items-start gap-4">' +
            '<span class="w-10 h-10 rounded-full bg-status-warning-subtle text-status-warning flex items-center justify-center shrink-0">' +
              '<span class="material-symbols-outlined text-[22px]">event_repeat</span></span>' +
            '<div class="min-w-0">' +
              '<h2 class="text-title-lg text-text-primary">FY' + st.year + ' KPI status</h2>' +
              '<p class="text-body-sm text-text-secondary mt-1">' + st.active + ' of ' + st.total + ' KPIs are active across ' + st.groups +
                (st.groups === 1 ? ' role group' : ' role groups') + (st.mapped ? ', used by ' + st.mapped + ' mappings' : '') + '.</p>' +
            '</div>' +
          '</div>' +
          '<ul class="mx-6 mb-5 rounded-lg bg-surface-page border border-border-light px-4 py-3 text-body-sm text-text-secondary list-disc pl-8 flex flex-col gap-1">' +
            '<li><strong>Deactivate</strong> hides every FY' + st.year + ' KPI from Mapping KPI and Bulk Assign. Existing mappings, submissions, and scores are kept.</li>' +
            '<li><strong>Activate</strong> turns on each role group whose weights total exactly 100%. Groups that are not ready stay inactive and are listed after saving.</li>' +
          '</ul>' +
          '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex flex-wrap items-center justify-end gap-space-sm">' +
            '<button type="button" class="btn btn-secondary" onclick="MGI.closeMasterYear()">Cancel</button>' + actions +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function closeMasterYear() {
    $('modal-host').innerHTML = '';
  }

  function applyMasterYear(year, on) {
    var key = 'year:' + year;
    if (S.masterBusy[key]) return;
    S.masterBusy[key] = true;
    closeMasterYear();
    renderMasterTree();

    api('setMasterYearStatus', year, !!on)
      .then(function (res) {
        delete S.masterBusy[key];
        toast(res.message, res.skipped && res.skipped.length ? 'warning' : 'success');
        if (res.skipped && res.skipped.length) {
          toast('Not ready: ' + res.skipped.slice(0, 3).map(function (x) { return x.label; }).join(', ') +
            (res.skipped.length > 3 ? ', and ' + (res.skipped.length - 3) + ' more' : '') + '. Fix their weights, then activate them again.', 'warning');
        }
        loadMasterCatalog();
      })
      .catch(function (err) {
        delete S.masterBusy[key];
        renderMasterTree();
        toast(err.message, 'error');
      });
  }

  function toggleMasterRole(key, on) {
    var ids = S.masterList.filter(function (k) { return masterRoleKey(k) === key; }).map(function (k) { return k.KPI_ID; });
    if (!ids.length) return;

    S.masterBusy[key] = true;
    renderMasterTree();

    api('setMasterKpiStatus', ids, !!on)
      .then(function (res) {
        delete S.masterBusy[key];
        S.masterList.forEach(function (k) { if (ids.indexOf(k.KPI_ID) > -1) k.IsActive = !!on; });
        renderMasterTree();
        toast(res.message + (on ? ' They are available in Mapping KPI again.' : ' They are hidden from Mapping KPI. Existing mappings keep working.'), 'success');
      })
      .catch(function (err) {
        delete S.masterBusy[key];
        renderMasterTree();
        toast(err.message, 'error');
      });
  }

  function downloadMasterTemplate() {
    downloadCsv([UPLOAD_HEADERS.join(',')], 'Master_KPI_Upload_Template.csv');
    toast('Template downloaded. Add one row per KPI. Weight is a percent.', 'success');
  }

  function wireFileDrop(zone, input, onFile) {
    if (!zone || !input || zone.dataset.wired) return;
    zone.dataset.wired = '1';

    zone.onclick = function () { input.click(); };
    input.onclick = function (e) { e.stopPropagation(); };
    input.onchange = function () {
      if (input.files[0]) onFile(input.files[0]);
      input.value = '';
    };
    ['dragenter', 'dragover'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('is-dragging'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('is-dragging'); });
    });
    zone.addEventListener('drop', function (e) {
      if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
    });
  }

  function wireMasterUpload() {
    wireFileDrop($('mku-drop'), $('mku-file'), onMasterUploadFile);
    renderUploadState();
  }

  function uploadFileProblem(file) {
    var ext = String(file.name || '').split('.').pop().toLowerCase();
    if (ext !== 'csv' && ext !== 'xlsx') return 'Upload a .csv or .xlsx file.';
    if (file.size > 5 * 1048576) return 'The file is larger than 5 MB.';
    return '';
  }

  function onMasterUploadFile(file) {
    var problem = uploadFileProblem(file);
    if (problem) {
      toast(problem, 'warning');
      return;
    }
    var name = String(file.name || '');

    S.upload = { fileName: name, status: 'reading', rows: [], errors: [], result: null };
    renderUploadState();

    readUploadFile(file, function (matrix) {
      var mapped = mapUploadRows(matrix);
      S.upload = { fileName: name, status: mapped.errors.length ? 'invalid' : 'ready', rows: mapped.rows, errors: mapped.errors, result: null };
      renderUploadState();
    }, function (message) {
      S.upload = { fileName: name, status: 'invalid', rows: [], errors: [{ row: 0, column: '', value: '', message: message }], result: null };
      renderUploadState();
    });
  }

  function readUploadFile(file, done, fail) {
    var ext = String(file.name || '').split('.').pop().toLowerCase();
    var reader = new FileReader();
    reader.onerror = function () { fail('The file could not be read.'); };

    if (ext === 'csv') {
      reader.onload = function () { done(parseCsv(String(reader.result || ''))); };
      reader.readAsText(file);
      return;
    }

    loadSheetJs()
      .then(function (XLSX) {
        reader.onload = function () {
          try {
            var book = XLSX.read(new Uint8Array(reader.result), { type: 'array' });
            var sheet = book.Sheets[book.SheetNames[0]];
            done(XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }));
          } catch (e) {
            fail('The Excel file could not be parsed: ' + e.message);
          }
        };
        reader.readAsArrayBuffer(file);
      })
      .catch(function () {
        fail('The Excel reader could not be loaded. Save the file as CSV and upload it again.');
      });
  }

  function loadScriptOnce(key, src, pick) {
    if (pick()) return Promise.resolve(pick());
    if (S.scripts[key]) return S.scripts[key];
    S.scripts[key] = new Promise(function (resolve, reject) {
      var tag = document.createElement('script');
      tag.src = src;
      tag.onload = function () {
        if (pick()) resolve(pick());
        else {
          S.scripts[key] = null;
          reject(new Error(key + ' is unavailable.'));
        }
      };
      tag.onerror = function () {
        S.scripts[key] = null;
        reject(new Error(key + ' failed to load.'));
      };
      document.head.appendChild(tag);
    });
    return S.scripts[key];
  }

  function loadSheetJs() {
    return loadScriptOnce('SheetJS', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
      function () { return window.XLSX; });
  }

  function loadPdfLibs() {
    return Promise.all([
      loadScriptOnce('html2canvas', 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
        function () { return window.html2canvas; }),
      loadScriptOnce('jsPDF', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
        function () { return window.jspdf && window.jspdf.jsPDF; })
    ]).then(function (libs) {
      return { html2canvas: libs[0], jsPDF: libs[1] };
    });
  }

  function parseCsv(text) {
    var src = String(text || '').replace(/^﻿/, '');
    var firstLine = src.split(/\r?\n/)[0] || '';
    var delim = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
    var rows = [];
    var row = [];
    var field = '';
    var quoted = false;

    for (var p = 0; p < src.length; p++) {
      var ch = src.charAt(p);
      if (quoted) {
        if (ch === '"') {
          if (src.charAt(p + 1) === '"') { field += '"'; p++; }
          else quoted = false;
        } else {
          field += ch;
        }
        continue;
      }
      if (ch === '"') { quoted = true; continue; }
      if (ch === delim) { row.push(field); field = ''; continue; }
      if (ch === '\r') continue;
      if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
      field += ch;
    }
    if (field !== '' || row.length) {
      row.push(field);
      rows.push(row);
    }
    return rows;
  }

  function uploadLineHasData(line) {
    return !!line && line.some(function (c) {
      return String(c === null || c === undefined ? '' : c).trim() !== '';
    });
  }

  function mapUploadRows(matrix, headers, keys) {
    var labels = headers || UPLOAD_HEADERS;
    var fields = keys || UPLOAD_KEYS;
    var grid = matrix || [];
    var norm = function (h) { return String(h === null || h === undefined ? '' : h).toLowerCase().replace(/[\s_]+/g, ''); };
    var fail = function (row, column, message) {
      return { rows: [], errors: [{ row: row, column: column, value: '', message: message }] };
    };

    var headerAt = -1;
    for (var h = 0; h < grid.length; h++) {
      if (uploadLineHasData(grid[h])) { headerAt = h; break; }
    }
    if (headerAt === -1) return fail(0, '', 'The file is empty.');

    var header = grid[headerAt].map(norm);
    var positions = {};
    var missing = [];
    labels.forEach(function (label, n) {
      var at = header.indexOf(norm(label));
      if (at === -1) missing.push(label);
      else positions[fields[n]] = at;
    });
    if (missing.length) {
      return fail(headerAt + 1, missing.join(', '), 'Missing required columns: ' + missing.join(', ') + '. Download the template to see the exact headers.');
    }

    var rows = [];
    for (var r = headerAt + 1; r < grid.length; r++) {
      var line = grid[r];
      if (!uploadLineHasData(line)) continue;
      var item = { _row: r + 1 };
      for (var k = 0; k < fields.length; k++) {
        var cell = line[positions[fields[k]]];
        item[fields[k]] = String(cell === null || cell === undefined ? '' : cell).trim();
      }
      rows.push(item);
    }

    if (!rows.length) return fail(0, '', 'The file has headers but no data rows.');
    if (rows.length > 500) return fail(0, '', 'The file has ' + rows.length + ' rows. Upload at most 500 rows at a time.');
    return { rows: rows, errors: [] };
  }

  function uploadErrorsHtml(errors) {
    var shown = errors.slice(0, 100);
    return '<div class="upload-errors">' +
      '<div class="px-space-md py-space-sm bg-status-danger-subtle flex items-center gap-space-sm">' +
        '<span class="material-symbols-outlined text-status-danger">error</span>' +
        '<p class="text-body-sm font-semibold text-status-danger-text">Upload rejected: ' + errors.length +
          (errors.length === 1 ? ' problem' : ' problems') + ' found. Nothing was saved.</p>' +
      '</div>' +
      '<div class="table-scroll max-h-[360px] overflow-y-auto">' +
        '<table class="data-table">' +
          '<thead><tr><th>Row</th><th>Column</th><th>Value</th><th>Problem</th></tr></thead>' +
          '<tbody>' + shown.map(function (e) {
            return '<tr>' +
              '<td class="text-code-num">' + (e.row || '-') + '</td>' +
              '<td class="text-label-sm font-semibold whitespace-nowrap">' + esc(e.column || '-') + '</td>' +
              '<td class="text-label-sm text-text-secondary">' + esc(e.value || '-') + '</td>' +
              '<td class="text-label-sm">' + esc(e.message) + '</td>' +
            '</tr>';
          }).join('') + '</tbody>' +
        '</table>' +
      '</div>' +
      (errors.length > shown.length
        ? '<p class="px-space-md py-space-sm text-label-xs text-text-muted">Showing the first 100 of ' + errors.length + ' problems.</p>'
        : '') +
    '</div>';
  }

  function renderUploadState() {
    var summary = $('mku-summary');
    var result = $('mku-result');
    var submit = $('mku-submit');
    if (!summary || !result || !submit) return;

    var up = S.upload;
    if (!up) {
      summary.innerHTML = '<p class="text-sm text-slate-500 flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px] text-slate-400">draft</span>No file selected.</p>';
      result.innerHTML = '';
      submit.disabled = true;
      return;
    }

    var years = {};
    var groups = {};
    up.rows.forEach(function (r) {
      if (r.Year) years[r.Year] = true;
      groups[r.Year + '|' + (r.Position + '|' + r.Department).toLowerCase()] = true;
    });

    summary.innerHTML =
      '<div class="flex items-center gap-space-sm flex-wrap">' +
        '<span class="pill pill-neutral"><span class="material-symbols-outlined text-[14px]">description</span>' + esc(up.fileName) + '</span>' +
        (up.status === 'reading'
          ? '<span class="text-body-sm text-text-muted">Reading file</span>'
          : '<span class="pill pill-info">' + up.rows.length + ' rows</span>' +
            '<span class="pill pill-neutral">' + Object.keys(years).length + ' years</span>' +
            '<span class="pill pill-neutral">' + Object.keys(groups).length + ' role groups</span>') +
      '</div>';

    submit.disabled = up.status !== 'ready';

    if (up.status === 'uploaded' && up.result) {
      var byGroup = {};
      (up.result.created || []).forEach(function (c) {
        var key = c.Year + ' • ' + c.Position + ' / ' + c.Department;
        byGroup[key] = (byGroup[key] || 0) + 1;
      });
      result.innerHTML =
        '<div class="rounded-xl border border-border-light bg-status-success-subtle p-space-md">' +
          '<p class="text-body-sm font-semibold text-status-success-text flex items-center gap-1.5">' +
            '<span class="material-symbols-outlined text-[18px]">task_alt</span>' + esc(up.result.message) + '</p>' +
          '<ul class="mt-space-sm text-label-sm text-text-secondary flex flex-col gap-0.5">' +
            Object.keys(byGroup).map(function (key) { return '<li>' + esc(key) + ': ' + byGroup[key] + ' KPIs</li>'; }).join('') +
          '</ul>' +
        '</div>';
      return;
    }

    result.innerHTML = up.errors.length ? uploadErrorsHtml(up.errors) : '';
  }

  function submitMasterUpload() {
    var up = S.upload;
    if (!up || up.status !== 'ready') return;

    up.status = 'uploading';
    var restore = busy($('mku-submit'), 'Uploading');

    api('uploadMasterKPIs', up.rows)
      .then(function (res) {
        restore();
        if (!res || !res.ok) {
          up.status = 'invalid';
          up.errors = (res && res.errors) || [];
          renderUploadState();
          toast('Upload rejected. Fix the listed rows and try again.', 'error');
          return;
        }
        up.status = 'uploaded';
        up.errors = [];
        up.result = res;
        renderUploadState();
        toast(res.message, 'success');
        loadMasterCatalog();
      })
      .catch(function (err) {
        restore();
        up.status = 'ready';
        renderUploadState();
        toast(err.message, 'error');
      });
  }

  function clearMasterUpload() {
    S.upload = null;
    renderUploadState();
  }

  function openMasterModal(kpiId) {
    if (!S.categories) {
      withCategories(function () { openMasterModal(kpiId); });
      return;
    }

    var k = null;
    if (kpiId) {
      S.available.concat(S.assigned, S.masterList).forEach(function (x) { if (x.KPI_ID === kpiId) k = x; });
    }
    S.editingKpi = k ? k.KPI_ID : null;

    var emp = S.mapping ? S.mapping.employee : null;
    var v = k || {
      Division: emp ? emp.Division : '', Position: emp ? emp.Position : '',
      Department: emp ? emp.Department : '', KPI_Name: '', Metrics: '',
      Target: '', Unit: '', WeightPercent: '', Duration: 'Monthly',
      Label: 'Increase', Multiplier: '', Target_Is_B: false, Year: S.user.year
    };

    var field = function (id, label, value, type, extra) {
      return '<div>' +
        '<label class="form-label">' + esc(label) + '</label>' +
        '<input id="mk-' + id + '" type="' + (type || 'text') + '" class="field" value="' + esc(value) + '" ' + (extra || '') + '>' +
      '</div>';
    };

    var area = function (id, label, value) {
      return '<div>' +
        '<label class="form-label">' + esc(label) + '</label>' +
        '<textarea id="mk-' + id + '" rows="1" class="field field-grow"' +
          ' oninput="MGI.autoGrow(this)" onkeydown="MGI.blockEnter(event)">' + esc(value) + '</textarea>' +
      '</div>';
    };

    var select = function (id, label, value, options) {
      var list = options.slice();
      if (value && list.indexOf(value) === -1) list.unshift(value);
      return '<div>' +
        '<label class="form-label">' + esc(label) + '</label>' +
        '<select id="mk-' + id + '" class="field" onchange="MGI.renderMasterCapacity()">' +
          '<option value="">Select ' + esc(label.replace(' *', '')) + '</option>' +
          list.map(function (o) {
            return '<option value="' + esc(o) + '"' + (o === value ? ' selected' : '') + '>' + esc(o) + '</option>';
          }).join('') +
        '</select></div>';
    };

    $('modal-host').innerHTML =
      '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closeMasterModal()">' +
        '<div class="modal-panel">' +
          '<div class="px-6 py-4 border-b border-border-light flex items-start justify-between gap-4">' +
            '<div class="min-w-0">' +
              '<h2 class="text-title-lg text-text-primary">' + (k ? 'Edit Master KPI' : 'Add Master KPI') + '</h2>' +
              '<p class="text-body-sm text-text-muted mt-0.5">' +
                (k ? 'KPI_ID <strong>' + esc(k.KPI_ID) + '</strong> is permanent, even if you change its Year.'
                   : 'KPI_ID will be generated automatically in the format <strong>KPI-' +
                     String(S.user.year).slice(-2) + '-XXXX</strong>.') +
              '</p>' +
            '</div>' +
            '<button class="btn-icon -mr-2" onclick="MGI.closeMasterModal()" title="Close" aria-label="Close">' +
              '<span class="material-symbols-outlined">close</span></button>' +
          '</div>' +

          '<div class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-space-md">' +
            '<div class="sm:col-span-2">' + area('name', 'KPI Name *', v.KPI_Name) + '</div>' +
            '<div class="sm:col-span-2">' + area('metrics', 'Metrics / Measurement', v.Metrics) + '</div>' +
            '<div>' +
              '<label class="form-label">Year *</label>' +
              '<select id="mk-year" class="field" onchange="MGI.renderMasterCapacity()">' + masterYearOptions(v.Year || S.user.year) + '</select>' +
            '</div>' +
            select('division', 'Division *', v.Division, categoryValues('Division')) +
            select('position', 'Position *', v.Position, categoryValues('Position')) +
            select('department', 'Department *', v.Department, categoryValues('Department')) +
            field('unit', 'Unit (Days, %, Hours)', v.Unit) +
            field('target', 'Target *', v.Target, 'number', 'step="any"') +
            '<div>' + field('weight', 'Weight (%) *', v.WeightPercent, 'number', 'step="any" min="0" max="100" oninput="MGI.renderMasterCapacity()"') +
              '<p id="mk-capacity" class="text-label-xs text-text-muted mt-1"></p></div>' +
            select('label', 'Label *', v.Label, LABEL_OPTIONS) +
            select('duration', 'Duration *', v.Duration, DURATION_OPTIONS) +
            field('multiplier', 'Multiplier (toleransi tier) *', v.Multiplier, 'number', 'step="any" min="0"') +
            '<div class="flex items-end">' +
              '<label class="flex items-center gap-space-sm cursor-pointer pb-2">' +
                '<input id="mk-targetisb" type="checkbox" class="w-4 h-4 rounded border-border-medium text-primary-container"' +
                  (v.Target_Is_B ? ' checked' : '') + '>' +
                '<span class="text-body-sm text-text-secondary">Target is B' +
                  '<span class="block text-label-xs text-text-muted">Score 1.0 only when the target is exceeded</span></span>' +
              '</label>' +
            '</div>' +
          '</div>' +

          '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex items-center justify-end gap-space-sm">' +
            '<button class="btn btn-secondary" onclick="MGI.closeMasterModal()">Cancel</button>' +
            '<button id="mk-save" class="btn btn-primary" onclick="MGI.saveMasterKpi()">' +
              '<span class="material-symbols-outlined text-[18px]">save</span> Save KPI</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    autoGrow($('mk-name'));
    autoGrow($('mk-metrics'));
    renderMasterCapacity();
  }

  function closeMasterModal() {
    $('modal-host').innerHTML = '';
    S.editingKpi = null;
  }

  function saveMasterKpi() {
    var payload = {
      KPI_Name:    $('mk-name').value,
      Metrics:     $('mk-metrics').value,
      Year:        $('mk-year').value,
      Division:    $('mk-division').value,
      Position:    $('mk-position').value,
      Department:  $('mk-department').value,
      Unit:        $('mk-unit').value,
      Target:      $('mk-target').value,
      Weight:      $('mk-weight').value,
      Label:       $('mk-label').value,
      Duration:    $('mk-duration').value,
      Multiplier:  $('mk-multiplier').value,
      Target_Is_B: $('mk-targetisb').checked
    };

    var restore = busy($('mk-save'), 'Saving');
    var call = S.editingKpi
      ? api('updateMasterKPI', S.editingKpi, payload)
      : api('createMasterKPI', payload);

    call.then(function (res) {
        restore();
        closeMasterModal();
        toast('Master KPI ' + res.KPI_ID + ' saved.', 'success');
        if (S.view === 'master-kpis') loadMasterCatalog();
        if (S.view === 'mapping' && S.mapping) onEmployeeSelect(null, currentIds());
      })
      .catch(function (err) {
        restore();
        toast(err.message, 'error');
      });
  }

  function masterGroupUsage(year, position, department, skipId) {
    var used = 0;
    var count = 0;
    (S.masterList || []).forEach(function (k) {
      if (!k.IsActive || String(k.Year) !== String(year)) return;
      if (!eqiJs(k.Position, position) || !eqiJs(k.Department, department)) return;
      if (skipId && k.KPI_ID === skipId) return;
      count++;
      used += kpiWeightPct(k);
    });
    return { count: count, used: Math.round(used * 10) / 10 };
  }

  function renderMasterCapacity() {
    var host = $('mk-capacity');
    var save = $('mk-save');
    if (!host) return;

    var year = $('mk-year').value;
    var position = $('mk-position').value;
    var department = $('mk-department').value;
    var weight = parseFloat($('mk-weight').value);

    if (!(S.masterList || []).length || !year || !position || !department) {
      host.textContent = '';
      host.className = 'text-label-xs text-text-muted mt-1';
      if (save) save.disabled = false;
      return;
    }

    var usage = masterGroupUsage(year, position, department, S.editingKpi);
    var original = S.editingKpi
      ? (S.masterList.filter(function (k) { return k.KPI_ID === S.editingKpi; })[0] || null)
      : null;
    var sameGroup = !!original && original.IsActive && String(original.Year) === String(year) &&
      eqiJs(original.Position, position) && eqiJs(original.Department, department);

    var label = position + ' / ' + department + ' (' + year + ')';
    var previous = Math.round((usage.used + (sameGroup ? Number(original.WeightPercent) || 0 : 0)) * 10) / 10;
    var next = Math.round((usage.used + (isNum(weight) ? weight : 0)) * 10) / 10;
    var over = next > 100.05 && next > previous + 0.05;

    host.textContent = over
      ? label + ': this weight would make the group ' + next + '%, above the 100% limit.'
      : label + ': ' + usage.used + '% used in ' + usage.count + ' KPIs, ' + (Math.round((100 - usage.used) * 10) / 10) + '% left.';
    host.className = 'text-label-xs mt-1 ' + (over ? 'text-status-danger-text font-semibold' : 'text-text-muted');
    if (save) save.disabled = over;
  }

  function categoryValues(type) {
    var list = S.categories && S.categories.categories ? S.categories.categories[type] : null;
    return (list || []).filter(function (c) { return c.active; }).map(function (c) { return c.value; });
  }

  function withCategories(next) {
    $('modal-host').innerHTML =
      '<div class="modal-backdrop">' +
        '<div class="modal-panel !max-w-xs p-space-lg flex items-center gap-space-sm">' +
          '<span class="spinner spinner-dark"></span>' +
          '<span class="text-body-md text-text-secondary">Loading categories</span>' +
        '</div>' +
      '</div>';

    api('getCategories')
      .then(function (data) {
        S.categories = data;
        next();
      })
      .catch(function (err) {
        $('modal-host').innerHTML = '';
        toast(err.message, 'error');
      });
  }

  function autoGrow(el) {
    if (!el || el.tagName !== 'TEXTAREA') return;
    if (/[\r\n]/.test(el.value)) el.value = el.value.replace(/\s*[\r\n]+\s*/g, ' ');
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight + 2) + 'px';
  }

  function blockEnter(ev) {
    if (ev.key === 'Enter') ev.preventDefault();
  }

  function masterYearOptions(selected) {
    var picked = parseInt(selected, 10);
    var set = {};
    [S.user.year, S.user.year + 1, picked].concat((S.masterMeta && S.masterMeta.years) || []).forEach(function (y) {
      var n = parseInt(y, 10);
      if (n) set[n] = true;
    });
    return Object.keys(set)
      .map(function (y) { return parseInt(y, 10); })
      .sort(function (a, b) { return b - a; })
      .map(function (y) {
        return '<option value="' + y + '"' + (y === picked ? ' selected' : '') + '>' + y + (y === S.user.year ? ' (Active)' : '') + '</option>';
      }).join('');
  }

  function optionList(options, value, placeholder) {
    var list = options.slice();
    if (value && list.indexOf(value) === -1) list.unshift(value);
    return '<option value="">' + esc(placeholder) + '</option>' +
      list.map(function (o) {
        return '<option value="' + esc(o) + '"' + (o === value ? ' selected' : '') + '>' + esc(o) + '</option>';
      }).join('');
  }

  function openBatchModal() {
    if (!S.categories) {
      withCategories(openBatchModal);
      return;
    }

    var emp = S.mapping ? S.mapping.employee : null;
    var filterYear = $('mk-f-year') ? parseInt($('mk-f-year').value, 10) : 0;
    var defaultYear = filterYear || S.user.year;

    var globalSelect = function (key, label, value) {
      return '<div>' +
        '<label class="form-label">' + esc(label) + ' *</label>' +
        '<select id="bk-' + key.toLowerCase() + '" class="field" onchange="MGI.recalcBatch()">' +
          optionList(categoryValues(key), value || '', 'Select ' + label) +
        '</select></div>';
    };

    $('modal-host').innerHTML =
      '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closeBatchModal()">' +
        '<div class="modal-panel modal-panel-wide">' +

          '<div class="px-6 py-4 border-b border-border-light flex items-start justify-between gap-4">' +
            '<div class="min-w-0">' +
              '<h2 class="text-title-lg text-text-primary">Add Master KPIs (Batch)</h2>' +
              '<p class="text-body-sm text-text-muted mt-0.5">' +
                'Enter every indicator for one Year, Position, and Department combination at once. KPI_IDs are generated automatically.' +
              '</p>' +
            '</div>' +
            '<button class="btn-icon -mr-2" onclick="MGI.closeBatchModal()" title="Close" aria-label="Close">' +
              '<span class="material-symbols-outlined">close</span></button>' +
          '</div>' +

          '<div class="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-6 pt-5 pb-4 border-b border-border-light">' +
            '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">' +
              '<div>' +
                '<label class="form-label">Year *</label>' +
                '<select id="bk-year" class="field" onchange="MGI.recalcBatch()">' + masterYearOptions(defaultYear) + '</select>' +
              '</div>' +
              globalSelect('Division', 'Division', emp ? emp.Division : '') +
              globalSelect('Department', 'Department', emp ? emp.Department : '') +
              globalSelect('Position', 'Position', emp ? emp.Position : '') +
            '</div>' +
            '<p class="text-body-sm text-text-muted mt-space-sm">' +
              'These four values apply to every row in this batch. New KPI_IDs use the selected year, for example ' +
              '<strong id="bk-id-hint">KPI-' + String(defaultYear).slice(-2) + '-XXXX</strong>.' +
            '</p>' +
            '<p id="bk-group" class="text-body-sm text-text-muted mt-1"></p>' +
          '</div>' +

          '<div class="p-space-lg">' +
            '<div class="flex items-center justify-between gap-space-md mb-space-sm">' +
              '<h3 class="text-title-md text-text-primary">Indicator List</h3>' +
              '<button id="bk-add" class="btn btn-secondary !py-1.5 !px-3 !text-label-sm" onclick="MGI.addBatchRow()">' +
                '<span class="material-symbols-outlined text-[16px]">add</span> Add Row</button>' +
            '</div>' +
            '<div id="batch-rows"></div>' +
            '<p id="bk-quota" class="text-body-sm text-text-muted mt-space-sm"></p>' +
          '</div>' +

          '<div class="px-6 py-4 border-t border-border-light bg-slate-50/95 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-md sticky bottom-0">' +
            '<div id="bk-total" class="flex items-center gap-space-sm"></div>' +
            '<div class="flex items-center gap-space-sm">' +
              '<button class="btn btn-secondary" onclick="MGI.closeBatchModal()">Cancel</button>' +
              '<button id="bk-save" class="btn btn-primary" onclick="MGI.saveBatch()" disabled>' +
                '<span class="material-symbols-outlined text-[18px]">save</span> ' +
                '<span id="bk-save-label">Save</span></button>' +
            '</div>' +
          '</div>' +

        '</div>' +
      '</div>';

    $('batch-rows').addEventListener('input', function (ev) {
      autoGrow(ev.target);
      recalcBatch();
    });
    $('batch-rows').addEventListener('change', recalcBatch);

    S.batchSeq = 0;
    addBatchRow();
  }

  function closeBatchModal() {
    $('modal-host').innerHTML = '';
  }

  function addBatchRow() {
    var host = $('batch-rows');
    if (!host) return;
    if (host.children.length >= (S.user.maxKpi || 10)) return;

    var id = 'r' + (S.batchSeq++);
    var cell = function (label, inner) {
      return '<div><span class="batch-row-label">' + esc(label) + '</span>' + inner + '</div>';
    };
    var grow = function (f, placeholder) {
      return '<textarea data-f="' + f + '" rows="1" class="field field-grow" placeholder="' + esc(placeholder) + '"' +
        ' onkeydown="MGI.blockEnter(event)"></textarea>';
    };

    var row = document.createElement('div');
    row.className = 'batch-row';
    row.dataset.row = id;
    row.innerHTML =
      '<div class="batch-row-top">' +
        '<span class="batch-row-no" data-row-no>' + (host.children.length + 1) + '</span>' +
        cell('KPI Name', grow('KPI_Name', 'Indicator name')) +
        cell('Metrics', grow('Metrics', 'Measurement tool or calculation method')) +
        '<div><span class="batch-row-label">&nbsp;</span>' +
          '<button class="btn-trash" title="Remove row" onclick="MGI.removeBatchRow(\'' + id + '\')">' +
          '<span class="material-symbols-outlined text-[20px]">delete</span></button></div>' +
      '</div>' +
      '<div class="batch-row-bottom">' +
        cell('Target', '<input data-f="Target" class="field" type="number" step="any" placeholder="0">') +
        cell('Unit', '<input data-f="Unit" class="field" type="text" placeholder="%, Days">') +
        cell('Weight %', '<input data-f="Weight" class="field" type="number" step="any" min="0" max="100" placeholder="0">') +
        cell('Label', '<select data-f="Label" class="field">' + optionList(LABEL_OPTIONS, 'Increase', 'Select') + '</select>') +
        cell('Duration', '<select data-f="Duration" class="field">' + optionList(DURATION_OPTIONS, 'Monthly', 'Select') + '</select>') +
        cell('Multiplier', '<input data-f="Multiplier" class="field" type="number" step="any" min="0" placeholder="0">') +
        cell('Target is B', '<label class="flex items-center gap-1.5 h-[34px]">' +
          '<input data-f="Target_Is_B" type="checkbox" class="w-4 h-4 rounded border-border-medium text-primary-container">' +
          '<span class="text-label-xs text-text-secondary">Yes</span></label>') +
      '</div>';

    host.appendChild(row);
    recalcBatch();
  }

  function removeBatchRow(id) {
    var row = document.querySelector('#batch-rows [data-row="' + attr(id) + '"]');
    if (row) row.remove();
    recalcBatch();
  }

  function readBatchRows() {
    return Array.prototype.map.call($('batch-rows').children, function (row) {
      var o = { _el: row };
      Array.prototype.forEach.call(row.querySelectorAll('[data-f]'), function (el) {
        o[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value.trim();
      });
      return o;
    });
  }

  function recalcBatch() {
    if (!$('batch-rows')) return;

    var maxRows = S.user.maxKpi || 10;
    var rows = readBatchRows();
    var year = $('bk-year') ? $('bk-year').value : '';
    var division = $('bk-division').value;
    var department = $('bk-department').value;
    var position = $('bk-position').value;
    if (year && $('bk-id-hint')) $('bk-id-hint').textContent = 'KPI-' + String(year).slice(-2) + '-XXXX';

    var total = 0;
    var complete = rows.length > 0;

    rows.forEach(function (r, i) {
      var no = r._el.querySelector('[data-row-no]');
      if (no) no.textContent = i + 1;
      total += Number(r.Weight) || 0;

      var missing = !r.KPI_Name || !r.Metrics || !r.Unit ||
                    r.Target === '' || r.Weight === '' ||
                    !(Number(r.Weight) > 0);

      if (r.Label !== 'Binary' && !(Number(r.Multiplier) > 0)) missing = true;
      if (!r.Label || !r.Duration) missing = true;
      if (missing) complete = false;

      Array.prototype.forEach.call(r._el.querySelectorAll('[data-f]'), function (el) {
        var f = el.dataset.f;
        var bad =
          (f === 'KPI_Name' && !r.KPI_Name) ||
          (f === 'Metrics' && !r.Metrics) ||
          (f === 'Unit' && !r.Unit) ||
          (f === 'Target' && r.Target === '') ||
          (f === 'Weight' && !(Number(r.Weight) > 0)) ||
          (f === 'Multiplier' && r.Label !== 'Binary' && !(Number(r.Multiplier) > 0));
        el.classList.toggle('is-invalid', !!bad);
      });
    });

    total = Math.round(total * 100) / 100;

    var weightOk = Math.abs(total - 100) < 0.01;
    var globalsOk = !!(year && division && department && position);
    var countOk = rows.length >= 1 && rows.length <= maxRows;
    var groupHost = $('bk-group');
    var groupBlocked = false;

    if (groupHost) {
      if (!(S.masterList || []).length || !globalsOk) {
        groupHost.textContent = '';
        groupHost.className = 'text-body-sm text-text-muted mt-1';
      } else {
        var usage = masterGroupUsage(year, position, department, '');
        var label = position + ' / ' + department + ' (' + year + ')';
        groupBlocked = usage.used > 0.05;
        groupHost.textContent = groupBlocked
          ? label + ' already has ' + usage.used + '% active in ' + usage.count + ' KPIs. A new batch would make it ' +
            (Math.round((usage.used + total) * 10) / 10) + '%. Deactivate that role group first.'
          : label + ' has no active KPIs yet, so this batch will complete it.';
        groupHost.className = 'text-body-sm mt-1 ' + (groupBlocked ? 'text-status-danger-text font-semibold' : 'text-text-muted');
      }
    }

    var valid = weightOk && globalsOk && countOk && complete && !groupBlocked;

    $('bk-add').disabled = rows.length >= maxRows;

    $('bk-quota').textContent = rows.length + ' of ' + maxRows + ' rows used' +
      (rows.length >= maxRows ? ' (maximum reached)' : '');

    var delta = Math.round(Math.abs(100 - total) * 100) / 100;
    $('bk-total').innerHTML =
      '<span class="text-label-xs uppercase tracking-wider text-text-muted">Total Weight</span>' +
      '<span class="text-headline-md font-bold ' +
        (weightOk ? 'text-status-success' : 'text-status-danger') + '">' + total + '%</span>' +
      '<span class="pill ' + (weightOk ? 'pill-success' : 'pill-danger') + '">' +
        '<span class="material-symbols-outlined text-[14px]">' +
          (weightOk ? 'check_circle' : 'error') + '</span> ' +
        (weightOk ? 'Exactly 100%' : (total < 100 ? 'Short by ' + delta + '%' : 'Over by ' + delta + '%')) +
      '</span>' +
      (!globalsOk
        ? '<span class="text-body-sm text-status-danger-text">Complete Year, Division, Department, and Position.</span>'
        : (!complete && rows.length
            ? '<span class="text-body-sm text-status-danger-text">Some fields are still empty.</span>'
            : ''));

    $('bk-save').disabled = !valid;
    $('bk-save-label').textContent = 'Save ' + rows.length + ' KPIs';
  }

  function saveBatch() {
    var division = $('bk-division').value;
    var department = $('bk-department').value;
    var position = $('bk-position').value;

    var payload = readBatchRows().map(function (r) {
      return {
        KPI_Name:    r.KPI_Name,
        Metrics:     r.Metrics,
        Year:        $('bk-year').value,
        Division:    division,
        Department:  department,
        Position:    position,
        Target:      r.Target,
        Unit:        r.Unit,
        Weight:      r.Weight,
        Label:       r.Label,
        Duration:    r.Duration,
        Multiplier:  r.Label === 'Binary' ? (r.Multiplier || 1) : r.Multiplier,
        Target_Is_B: r.Target_Is_B
      };
    });

    var restore = busy($('bk-save'), 'Saving');

    api('createMasterKPIBatch', payload)
      .then(function (res) {
        restore();
        closeBatchModal();
        toast(res.message, 'success');
        if (S.view === 'master-kpis') loadMasterCatalog();
        if (S.view === 'mapping' && S.mapping) onEmployeeSelect(null, currentIds());
      })
      .catch(function (err) {
        restore();
        toast(err.message, 'error');
      });
  }

  function initSummary() {
    if (!S.sumYear) S.sumYear = S.user.year;

    if (!$('sum-month').dataset.wired) {
      $('sum-month').dataset.wired = '1';
      fillYearOptions([S.user.year]);
      fillMonthOptions();
      $('sum-month').value = String(S.user.defaultMonth || new Date().getMonth() + 1);

      $('sum-year').addEventListener('change', onYearChange);
      $('sum-month').addEventListener('change', function () { loadSummary(); });
      $('sum-division').addEventListener('change', function () {
        S.sumPage = 1;
        S.annPage = 1;
        fillDeptOptions();
        renderActiveSummary();
      });
      $('sum-dept').addEventListener('change', function () {
        S.sumPage = 1;
        S.annPage = 1;
        renderActiveSummary();
      });
      $('sum-search').addEventListener('input', function () {
        clearTimeout(S.searchTimer);
        S.searchTimer = setTimeout(function () {
          S.sumPage = 1;
          S.annPage = 1;
          renderActiveSummary();
        }, 200);
      });
    }

    var jump = S.sumJump;
    S.sumJump = null;
    if (jump) {
      S.sumYear = jump.year;
      S.sumView = 'monthly';
      S.sumFilter = jump.filter || 'all';
      S.sumPage = 1;
      fillYearOptions([jump.year]);
      fillMonthOptions();
      $('sum-month').value = String(jump.month);
      $('sum-search').value = '';
      S.sumPick = { division: jump.division || '', department: jump.department || '' };
    }

    S.summary = null;
    S.annual = null;
    S.reports = {};
    applySumView();
    loadActiveSummary();
  }

  function openSummaryFor(year, month, filter, division, department) {
    S.sumJump = { year: parseInt(year, 10) || S.user.year, month: parseInt(month, 10) || 1, filter: filter || 'all',
                  division: division || '', department: department || '' };
    go('summary');
  }

  function activeSumYear() {
    return S.sumYear || S.user.year;
  }

  function loadActiveSummary() {
    if (S.sumView === 'annual') {
      loadAnnualRecap();
    } else {
      loadSummary();
    }
  }

  function renderActiveSummary() {
    if (S.sumView === 'annual') renderAnnual();
    else applySummaryFilters();
  }

  function applySumView() {
    var annual = S.sumView === 'annual';
    $('sum-monthly-panel').classList.toggle('hidden', annual);
    $('sum-annual-panel').classList.toggle('hidden', !annual);
    $('sum-month-field').classList.toggle('hidden', annual);
    $('sum-report-btn').classList.toggle('hidden', annual);
    document.querySelectorAll('#sum-view-tabs [data-sum-view]').forEach(function (b) {
      var on = b.dataset.sumView === S.sumView;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  function setSumView(view) {
    S.sumView = view === 'annual' ? 'annual' : 'monthly';
    applySumView();

    if (S.sumView === 'annual') {
      if (S.annual && S.annual.year === activeSumYear()) {
        fillSumFilters();
        renderAnnual();
      } else {
        loadAnnualRecap();
      }
      return;
    }

    if (S.summary && S.summary.year === activeSumYear()) {
      fillSumFilters();
      applySummaryFilters();
    } else {
      loadSummary();
    }
  }

  function onYearChange() {
    var year = parseInt($('sum-year').value, 10);
    if (!year || year === activeSumYear()) return;
    S.sumYear = year;
    S.summary = null;
    S.annual = null;
    S.sumPage = 1;
    S.annPage = 1;
    fillMonthOptions();
    loadActiveSummary();
  }

  function fillYearOptions(years) {
    var sel = $('sum-year');
    var set = {};
    var add = function (y) {
      var n = parseInt(y, 10);
      if (n) set[n] = true;
    };
    [S.user.year, S.sumYear].concat(years || []).forEach(add);
    Array.prototype.forEach.call(sel.options || [], function (o) { add(o.value); });

    sel.innerHTML = Object.keys(set)
      .map(function (y) { return parseInt(y, 10); })
      .sort(function (a, b) { return b - a; })
      .map(function (y) {
        return '<option value="' + y + '">' + y + (y === S.user.year ? ' (Active)' : '') + '</option>';
      }).join('');
    sel.value = String(activeSumYear());
  }

  function fillMonthOptions() {
    var sel = $('sum-month');
    var keep = sel.value;
    var year = activeSumYear();
    sel.innerHTML = MONTHS.map(function (m, i) {
      return '<option value="' + (i + 1) + '">' + m + ' ' + year + '</option>';
    }).join('');
    if (keep) sel.value = keep;
  }

  function sumData() {
    return S.sumView === 'annual' ? S.annual : S.summary;
  }

  function sumDivision() {
    var sel = $('sum-division');
    return sel ? sel.value : '';
  }

  function fillSumFilters() {
    fillSumDivisions();
    fillDeptOptions();
  }

  function fillSumDivisions() {
    var sel = $('sum-division');
    var data = sumData();
    if (!sel || !data) return;
    var keep = S.sumPick ? S.sumPick.division : sel.value;
    var list = distinct(data.rows || [], 'Division');
    sel.innerHTML = '<option value="">All Divisions</option>' +
      list.map(function (d) {
        return '<option value="' + esc(d) + '">' + esc(d) + '</option>';
      }).join('');
    sel.value = list.indexOf(keep) > -1 ? keep : '';
  }

  function fillDeptOptions() {
    var dept = $('sum-dept');
    var data = sumData();
    if (!data) return;
    var division = sumDivision();
    var list = division
      ? distinct((data.rows || []).filter(function (r) { return eqiJs(r.Division, division); }), 'Department')
      : (data.departments || []);
    var keep = S.sumPick ? S.sumPick.department : dept.value;
    S.sumPick = null;
    dept.innerHTML = '<option value="">All Departments</option>' +
      list.map(function (d) {
        return '<option value="' + esc(d) + '">' + esc(d) + '</option>';
      }).join('');
    dept.value = list.indexOf(keep) > -1 ? keep : '';
  }

  function loadSummary() {
    $('sum-tbody').innerHTML = skeletonRows(5, 6);
    S.sumPage = 1;
    var year = activeSumYear();

    api('getAdminSummary', year, parseInt($('sum-month').value, 10), {})
      .then(function (data) {
        if (data.year !== activeSumYear()) return;
        S.summary = data;
        syncBands(data.bands);
        renderScopeBanner('sum-scope', data.scope);
        fillYearOptions(data.years);
        if (S.sumView === 'monthly') fillSumFilters();
        applySummaryFilters();
      })
      .catch(function (err) {
        $('sum-tbody').innerHTML =
          '<tr><td colspan="5" class="text-center text-status-danger py-space-xl">' + esc(err.message) + '</td></tr>';
        toast(err.message, 'error');
      });
  }

  function baseRows() {
    if (!S.summary) return [];
    var division = sumDivision();
    var dept = $('sum-dept').value;
    var q = ($('sum-search').value || '').trim().toLowerCase();
    return S.summary.rows.filter(function (r) {
      if (division && !eqiJs(r.Division, division)) return false;
      if (dept && !eqiJs(r.Department, dept)) return false;
      if (q && (r.Full_Name + ' ' + r.NIK).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function filteredRows() {
    return sortedBy(baseRows().filter(function (r) {
      if (S.sumFilter === 'done')    return r.submitted > 0;
      if (S.sumFilter === 'pending') return r.submitted === 0;
      if (S.sumFilter === 'locked')  return rowChangeLocked(r);
      return true;
    }), S.sumSort, sumSortValue);
  }

  function sumMonthOpen() {
    return !!(S.summary && S.summary.periodState && S.summary.periodState.isOpen);
  }

  function rowChangeLocked(r) {
    return sumMonthOpen() && !!(r.changes && r.changes.submitted && r.changes.left <= 0);
  }

  function changeInfo(r) {
    var c = r.changes;
    if (!c || !c.submitted || !sumMonthOpen()) return '';
    if (c.left > 0) {
      return '<span class="block mt-1 text-[11px] text-text-muted" title="Changes left after the first submission">' + plural(c.left, 'change') + ' left</span>';
    }
    return '<span class="block mt-1 text-[11px] font-semibold text-status-warning-text">No changes left</span>' +
      (S.user && S.user.isAdmin
        ? '<button type="button" class="mt-1 text-[11px] font-semibold text-primary-container rounded-md px-1.5 py-0.5 transition-all duration-150 hover:bg-brand-50"' +
            ' onclick="MGI.openAllowChange(\'' + esc(r.NIK) + '\', \'' + esc(r.roleKey) + '\')">Allow 1 more change</button>'
        : '');
  }

  function allowTarget() {
    var t = S.allowChange;
    if (!t || !S.summary) return null;
    return S.summary.rows.filter(function (r) { return r.NIK === t.nik && r.roleKey === t.roleKey; })[0] || null;
  }

  function openAllowChange(nik, roleKey) {
    S.allowChange = { nik: nik, roleKey: roleKey };
    var r = allowTarget();
    if (!r) return;
    var c = r.changes || { allowed: 2 };
    $('modal-host').innerHTML =
      '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closeAllowChange()">' +
        '<div class="modal-panel !max-w-md">' +
          '<div class="px-6 pt-6 pb-5 flex items-start gap-4">' +
            '<span class="w-10 h-10 rounded-full bg-brand-50 text-primary-container flex items-center justify-center shrink-0">' +
              '<span class="material-symbols-outlined text-[22px]">lock_open</span></span>' +
            '<div class="min-w-0">' +
              '<h2 class="text-title-lg text-text-primary">Allow one more change?</h2>' +
              '<p class="text-body-sm text-text-secondary mt-1"><strong>' + esc(r.Full_Name) + '</strong> has used ' +
                (c.allowed === 2 ? 'both changes' : 'all ' + c.allowed + ' changes') + ' for <strong>' + esc(r.Position + ' / ' + r.Department) + '</strong> in ' +
                esc(sumMonthName()) + '. Allowing one more lets them submit once more. Your name is recorded with it.</p>' +
            '</div>' +
          '</div>' +
          '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex items-center justify-end gap-space-sm">' +
            '<button class="btn btn-secondary" onclick="MGI.closeAllowChange()">Cancel</button>' +
            '<button id="allow-confirm" class="btn btn-primary" onclick="MGI.confirmAllowChange()">' +
              '<span class="material-symbols-outlined text-[18px]">lock_open</span> Allow 1 more change</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function closeAllowChange() {
    S.allowChange = null;
    $('modal-host').innerHTML = '';
  }

  function confirmAllowChange() {
    var d = S.summary;
    var t = S.allowChange;
    if (!d || !t) return;
    var restore = busy($('allow-confirm'), 'Saving');
    api('allowSubmissionChange', d.period, t.nik, t.roleKey)
      .then(function (res) {
        restore();
        closeAllowChange();
        if (S.summary !== d) return;
        d.rows.forEach(function (r) { if (r.NIK === t.nik && r.roleKey === t.roleKey) r.changes = res.changes; });
        toast(res.message + ' Let them know.', 'success');
        applySummaryFilters();
      })
      .catch(function (err) {
        restore();
        toast(err.message, 'error');
      });
  }

  var SUM_STATUS_ORDER = { 'pending': 0, 'partial': 1, 'no-evidence': 2, 'submitted': 3, 'verified': 3 };

  function sumSortValue(r, key) {
    if (key === 'name') return r.Full_Name;
    if (key === 'score') return r.submitted === 0 ? null : r.index;
    if (key === 'status') return SUM_STATUS_ORDER[r.statusKey];
    return null;
  }

  function sortedBy(rows, sort, value) {
    if (!sort) return rows;
    return rows.slice().sort(function (a, b) {
      var x = value(a, sort.key);
      var y = value(b, sort.key);
      var xEmpty = x === null || x === undefined;
      var yEmpty = y === null || y === undefined;
      if (xEmpty || yEmpty) return xEmpty === yEmpty ? 0 : xEmpty ? 1 : -1;
      if (typeof x === 'string') return x.localeCompare(y) * sort.dir;
      return x === y ? 0 : (x < y ? -1 : 1) * sort.dir;
    });
  }

  function nextSort(current, key, first) {
    return current && current.key === key ? { key: key, dir: -current.dir } : { key: key, dir: first };
  }

  function sortHead(label, key, sort, fn, cls, extra) {
    var on = !!(sort && sort.key === key);
    return '<th class="' + (cls || '') + '" aria-sort="' + (!on ? 'none' : sort.dir > 0 ? 'ascending' : 'descending') + '">' +
      '<button type="button" class="th-sort' + (on ? ' is-sorted' : '') + '" onclick="MGI.' + fn + '(\'' + key + '\')" title="Sort by ' + esc(label) + '">' +
        esc(label) + '<span class="material-symbols-outlined" aria-hidden="true">' + (!on ? 'unfold_more' : sort.dir > 0 ? 'arrow_upward' : 'arrow_downward') + '</span>' +
      '</button>' + (extra || '') + '</th>';
  }

  function renderSummaryHead() {
    var host = $('sum-thead');
    if (!host) return;
    host.innerHTML = '<tr>' +
      sortHead('Employee', 'name', S.sumSort, 'sortSummary', 'min-w-[260px]') +
      '<th class="min-w-[240px]">Score per KPI</th>' +
      sortHead('Total Score', 'score', S.sumSort, 'sortSummary', 'text-right') +
      sortHead('Status', 'status', S.sumSort, 'sortSummary', 'text-center') +
      '<th class="text-center">Evidence</th>' +
    '</tr>';
  }

  function sortSummary(key) {
    S.sumSort = nextSort(S.sumSort, key, key === 'score' ? -1 : 1);
    S.sumPage = 1;
    renderSummaryHead();
    renderSummaryTable();
  }

  function reminderNeed(row) {
    if (!row || row.roleInactive) return null;
    var due = (row.items || []).filter(function (it) { return it.InCycle && it.IsActive !== false; });
    if (!due.length) return null;
    var missing = due.filter(function (it) { return !isNum(it.Realization); }).length;
    var needsEvidence = !row.evidence && !row.evidenceOptional;
    if (!missing && !needsEvidence) return null;
    return { missingKpis: missing, needsEvidence: needsEvidence };
  }

  function sameDay(iso, now) {
    var d = new Date(iso);
    return !isNaN(d.getTime()) && d.toDateString() === (now || new Date()).toDateString();
  }

  function reminderLabel(iso) {
    return sameDay(iso) ? 'Reminded today' : 'Reminded ' + shortDate(iso);
  }

  function reminderTargets() {
    var d = S.summary;
    if (!d || !d.reminders || !d.periodState || !d.periodState.isOpen) return [];
    var seen = {};
    var out = [];
    baseRows().forEach(function (r) {
      if (seen[r.NIK] || !reminderNeed(r)) return;
      seen[r.NIK] = true;
      out.push({ NIK: r.NIK, Full_Name: r.Full_Name, remindedAt: d.reminders[r.NIK] || '' });
    });
    return out;
  }

  function renderSumRemind() {
    var host = $('sum-remind');
    if (!host) return;
    var list = reminderTargets();
    var waiting = list.filter(function (t) { return !(t.remindedAt && sameDay(t.remindedAt)); }).length;
    host.innerHTML = waiting
      ? '<button type="button" class="btn btn-secondary !py-1.5 !px-3 !text-label-sm" onclick="MGI.openReminders()" title="Email everyone in this view who still has KPIs or the evidence file missing">' +
          '<span class="material-symbols-outlined text-[18px]">notifications_active</span> Send Reminder' +
          '<span class="pill pill-maroon !py-0 !px-1.5 !text-[11px]">' + waiting + '</span></button>'
      : list.length
        ? '<span class="pill pill-neutral !text-[11px]" title="Everyone in this view who still has something missing already had a reminder today">' +
            '<span class="material-symbols-outlined text-[14px]">notifications_paused</span> Everyone reminded today</span>'
        : '';
  }

  function openReminders() {
    var list = reminderTargets();
    if (!list.length) return;
    var d = S.summary;
    var today = list.filter(function (t) { return t.remindedAt && sameDay(t.remindedAt); });
    var waiting = list.filter(function (t) { return !(t.remindedAt && sameDay(t.remindedAt)); });
    var room = Math.max(0, d.mailRoom || 0);
    var willSend = Math.min(waiting.length, room);
    var month = sumMonthName();
    var shown = waiting.slice(0, 6).map(function (t) { return esc(displayName(t.Full_Name)); });
    S.reminderNiks = list.map(function (t) { return t.NIK; });

    var notes = [];
    if (d.periodState.cutoff) notes.push(['event', 'The email says ' + esc(MONTHS[d.month - 1]) + ' is open until ' + esc(fmtDate(d.periodState.cutoff)) + '.']);
    if (today.length) notes.push(['history', plural(today.length, 'person', 'people') + ' already had a reminder today and will be skipped.']);
    if (room < waiting.length) notes.push(['mark_email_unread', 'The daily email limit leaves room for ' + plural(room, 'email') + ' today. Send again tomorrow for the rest.']);

    $('modal-host').innerHTML =
      '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closeReminders()">' +
        '<div class="modal-panel !max-w-md">' +
          '<div class="px-6 pt-6 pb-5 flex items-start gap-4">' +
            '<span class="w-10 h-10 rounded-full bg-brand-50 text-primary-container flex items-center justify-center shrink-0">' +
              '<span class="material-symbols-outlined text-[22px]">notifications_active</span></span>' +
            '<div class="min-w-0">' +
              '<h2 class="text-title-lg text-text-primary">Send a reminder for ' + esc(month) + '?</h2>' +
              '<p class="text-body-sm text-text-secondary mt-1">' +
                (waiting.length
                  ? '<strong>' + plural(waiting.length, 'person', 'people') + '</strong> in this view still ' + (waiting.length === 1 ? 'has' : 'have') +
                    ' KPIs or the evidence file missing. Each gets one email that lists what is left, with a link to My KPIs.'
                  : 'Everyone in this view who still has something missing already had a reminder today.') + '</p>' +
              (shown.length
                ? '<p class="text-label-sm text-text-muted mt-2">' + shown.join(', ') + (waiting.length > shown.length ? ' and ' + (waiting.length - shown.length) + ' more' : '') + '</p>'
                : '') +
              (notes.length
                ? '<ul class="mt-space-md flex flex-col gap-1.5">' + notes.map(function (n) {
                    return '<li class="flex items-start gap-2 text-body-sm text-text-secondary"><span class="material-symbols-outlined text-[18px] text-text-muted shrink-0">' + n[0] + '</span><span>' + n[1] + '</span></li>';
                  }).join('') + '</ul>'
                : '') +
            '</div>' +
          '</div>' +
          '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex items-center justify-end gap-space-sm">' +
            '<button class="btn btn-secondary" onclick="MGI.closeReminders()">' + (willSend ? 'Cancel' : 'Close') + '</button>' +
            (willSend
              ? '<button id="reminder-send" class="btn btn-primary" onclick="MGI.confirmReminders()">' +
                  '<span class="material-symbols-outlined text-[18px]">send</span> Send ' + plural(willSend, 'Reminder') + '</button>'
              : '') +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function closeReminders() {
    $('modal-host').innerHTML = '';
  }

  function confirmReminders() {
    var d = S.summary;
    if (!d || !S.reminderNiks.length) return;
    var restore = busy($('reminder-send'), 'Sending');
    api('sendSubmissionReminders', d.period, S.reminderNiks)
      .then(function (res) {
        restore();
        closeReminders();
        if (S.summary !== d) return;
        (res.sentNiks || []).forEach(function (nik) { d.reminders[nik] = res.remindedAt; });
        d.mailRoom = res.mailRoom;
        toast(res.message, res.sent ? 'success' : 'warning');
        renderSumRemind();
        renderSummaryTable();
      })
      .catch(function (err) {
        restore();
        toast(err.message, 'error');
      });
  }

  function applySummaryFilters() {
    if (!S.summary) return;
    renderSummaryStats();
    renderSummaryTabs();
    renderSumRemind();
    renderSummaryHead();
    renderSummaryTable();
    renderDistribution();
  }

  function summaryStats(rows) {
    var niks = {};
    var dist = { sangatBaik: 0, baik: 0, perluPerhatian: 0, total: 0 };
    var sum = 0;
    var pending = 0;
    var evidence = 0;

    rows.forEach(function (r) {
      niks[r.NIK] = true;
      if (r.evidence) evidence++;
      if (r.submitted === 0) { pending++; return; }
      dist.total++;
      sum += r.index;
      var key = band(r.index).key;
      if (key === 'success') dist.sangatBaik++;
      else if (key === 'info') dist.baik++;
      else dist.perluPerhatian++;
    });

    return {
      employees: Object.keys(niks).length,
      roles: rows.length,
      avg: dist.total ? Math.round(sum / dist.total * 10) / 10 : 0,
      pending: pending,
      evidence: evidence,
      dist: dist,
      submittedPercent: rows.length ? Math.round((rows.length - pending) / rows.length * 1000) / 10 : 0
    };
  }

  function sumMonthName() {
    return S.summary ? MONTHS[S.summary.month - 1] + ' ' + S.summary.year : '';
  }

  function sumPeriodNote(pending) {
    var ps = S.summary.periodState || {};
    var month = MONTHS[S.summary.month - 1];
    if (!pending) return 'Everyone in this view has submitted for ' + month + '.';
    if (ps.isOpen) return month + ' is open until ' + fmtDate(ps.cutoff) + '.';
    if (ps.rawOpen && ps.expired) return month + ' closed on ' + fmtDate(ps.cutoff) + '.';
    return month + ' is not open for submission.';
  }

  function renderSummaryStats() {
    var st = summaryStats(baseRows());
    var done = st.roles - st.pending;
    var open = !!(S.summary.periodState && S.summary.periodState.isOpen);
    var avgBand = st.dist.total ? band(st.avg) : null;

    $('sum-stats').innerHTML =
      statCard('Submitted', 'task_alt', 'text-text-primary',
        done, 'of ' + plural(st.roles, 'role'),
        st.roles ? pct(st.submittedPercent) + ' of scorecards for ' + esc(sumMonthName()) +
                   (st.employees !== st.roles ? ' • ' + plural(st.employees, 'employee') : '')
                 : 'No scorecards in this view',
        'bg-status-success', st.submittedPercent) +

      statCard(open ? 'Not Submitted Yet' : 'Not Submitted', 'pending_actions', st.pending ? 'text-status-warning' : 'text-status-success',
        st.pending, st.pending === 1 ? 'Role' : 'Roles',
        esc(sumPeriodNote(st.pending)),
        '', 0) +

      statCard('Average Score', 'trending_up', avgBand ? 'text-status-' + avgBand.key + '-text' : 'text-text-muted',
        avgBand ? num(st.avg) : '-', avgBand ? '/ 100' : '',
        avgBand ? 'Rating: ' + esc(avgBand.label) + ', average of ' + plural(st.dist.total, 'submitted role') : 'No roles scored yet',
        avgBand ? 'bg-status-' + avgBand.key : '', st.avg) +

      statCard('Evidence on File', 'folder_open', 'text-text-primary',
        st.evidence, done ? 'of ' + plural(done, 'submitted role') : 'Roles',
        'Stored in the MGI Google Drive',
        'bg-status-info', done ? Math.min(100, st.evidence / done * 100) : 0);
  }

  function periodName(period) {
    var parts = String(period || '').split('_');
    var m = parseInt(parts[1], 10);
    return m >= 1 && m <= 12 ? MONTHS[m - 1] + ' ' + parts[0] : String(period || '');
  }

  function buildPeriodJs(year, month) {
    return String(year) + '_' + (month < 10 ? '0' + month : String(month));
  }

  function toDateInput(iso) {
    if (!iso) return '';
    var t = new Date(iso).getTime();
    if (isNaN(t)) return '';
    return new Date(t + 7 * 3600000).toISOString().slice(0, 10);
  }

  function cutoffIso(dateValue) {
    return dateValue ? dateValue + 'T23:59:00+07:00' : '';
  }

  function plusDaysInput(days) {
    return toDateInput(new Date(Date.now() + days * 86400000).toISOString());
  }

  function suggestedCutoff(p) {
    if (p && p.Cutoff_Date && futureDate(toDateInput(p.Cutoff_Date))) return toDateInput(p.Cutoff_Date);
    var latest = '';
    (S.periods || []).forEach(function (x) {
      if (!x.Effective_Open || !x.Cutoff_Date) return;
      var v = toDateInput(x.Cutoff_Date);
      if (futureDate(v) && v > latest) latest = v;
    });
    return latest || plusDaysInput(7);
  }

  function futureDate(value) {
    return !!value && new Date(cutoffIso(value)).getTime() > Date.now();
  }

  function shortDate(iso) {
    return fmtDate(iso).replace(/ \d{4}$/, '');
  }

  function periodYear() {
    return S.periodYear || S.user.year;
  }

  function periodYears() {
    var years = [S.user.year];
    if (S.user.year - 1 >= (S.user.setupYear || S.user.year)) years.push(S.user.year - 1);
    return years;
  }

  function onPeriodYearChange(value) {
    var year = parseInt(value, 10);
    if (!year || year === periodYear()) return;
    S.periodYear = year;
    S.periods = [];
    S.periodBusy = {};
    loadPeriodSettings();
  }

  function loadPeriodSettings() {
    var host = $('period-control');
    var year = periodYear();
    if (host && !(S.periods && S.periods.length)) host.innerHTML = '<div class="skeleton h-40 w-full"></div>';

    api('getPeriodSettings', year)
      .then(function (list) {
        if (year !== periodYear()) return;
        S.periods = list;
        renderPeriodControl();
      })
      .catch(function (err) {
        $('period-control').innerHTML = '<p class="text-body-sm text-status-danger">' + esc(err.message) + '</p>';
      });
  }

  function renderPeriodControl() {
    var host = $('period-control');
    if (!host || !S.periods || !S.periods.length) return;

    var kinds = S.periods.map(periodKind);
    var count = function (k) { return kinds.filter(function (x) { return x === k; }).length; };
    var openCount = S.periods.filter(function (p) { return p.Effective_Open; }).length;
    var notes = [];
    if (count('reopened')) notes.push(count('reopened') + ' reopened');
    if (count('early')) notes.push(count('early') + ' not started yet');
    var year = periodYear();
    var years = periodYears();
    var previous = year < S.user.year;
    var busyAny = Object.keys(S.periodBusy).length > 0;

    host.innerHTML =
      '<div class="flex flex-col lg:flex-row lg:items-start justify-between gap-space-md mb-space-md">' +
        '<div>' +
          '<h2 class="text-title-lg text-text-primary flex items-center gap-space-sm">Submission Period Control' +
            '<span class="pill ' + (previous ? 'pill-neutral' : 'pill-brand') + ' !py-0.5 !text-[11px]">FY' + year + (previous ? ' • Previous year' : '') + '</span></h2>' +
          '<p class="text-body-sm text-text-muted max-w-2xl">Opening a month lets <strong class="text-text-secondary">every employee</strong> submit or change it until its cut-off. ' +
            'Uncheck it to lock it again.</p>' +
          '<p class="text-body-sm text-text-muted mt-1"><strong class="text-text-secondary">' + openCount + ' of 12</strong> periods open' +
            (notes.length ? ': ' + notes.join(', ') : '') + '.</p>' +
        '</div>' +
        '<div class="flex flex-wrap items-end gap-space-sm shrink-0">' +
          (years.length > 1
            ? '<label class="flex flex-col shrink-0">' +
                '<span class="form-label">Year</span>' +
                '<select id="period-year" class="field !py-1.5 !text-label-sm" onchange="MGI.onPeriodYearChange(this.value)">' +
                  years.map(function (y) {
                    return '<option value="' + y + '"' + (y === year ? ' selected' : '') + '>FY' + y + (y === S.user.year ? ' (Active)' : ' (Previous year)') + '</option>';
                  }).join('') +
                '</select>' +
              '</label>'
            : '') +
          (openCount
            ? '<button type="button" class="btn btn-secondary !py-1.5 !text-label-sm" onclick="MGI.openPeriodBulk()"' + (busyAny ? ' disabled' : '') +
                ' title="Give several open months the same cut-off">' +
                '<span class="material-symbols-outlined text-[18px]">edit_calendar</span> Change cut-off</button>'
            : '') +
        '</div>' +
      '</div>' +
      (previous
        ? '<div class="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-2.5 mb-space-md text-body-sm text-amber-800 flex items-start gap-2">' +
            '<span class="material-symbols-outlined text-[18px]">history</span>' +
            '<span>FY' + year + ' is the previous fiscal year. Reopen a month only for late submissions or corrections. ' +
              'Employees find it under FY' + year + ' in the My KPIs period list.</span>' +
          '</div>'
        : '') +
      '<div class="period-grid">' + S.periods.map(periodCell).join('') + '</div>' +
      '<p class="mt-space-md text-label-xs text-text-muted flex flex-wrap items-center gap-x-2 gap-y-1">' +
        '<span class="material-symbols-outlined text-[16px]">event_repeat</span>' +
        'Starting a new fiscal year? Switch the active year first, then its months appear here.' +
        '<button type="button" class="text-primary-container font-semibold rounded-md px-1.5 py-0.5 transition-all duration-150 hover:bg-brand-50" onclick="MGI.setSettingsTab(\'fiscal\')">Open Fiscal Year</button>' +
      '</p>';
  }

  function regularCutoff(period) {
    var parts = String(period || '').split('_');
    return new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10), 5, 16, 59, 0));
  }

  function periodStarted(period, now) {
    var parts = String(period || '').split('_');
    return (now || Date.now()) >= Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1, -7, 0, 0);
  }

  function periodKind(p) {
    if (!p.Effective_Open) return p.Is_Open && p.Expired ? 'expired' : 'locked';
    if (!periodStarted(p.Period)) return 'early';
    return Date.now() > regularCutoff(p.Period).getTime() ? 'reopened' : 'open';
  }

  function periodRow(period) {
    return (S.periods || []).filter(function (x) { return x.Period === period; })[0] || null;
  }

  function periodCell(p) {
    var m = parseInt(p.Period.split('_')[1], 10);
    var busyCell = !!S.periodBusy[p.Period];
    var kind = periodKind(p);
    var badge = kind === 'reopened'
      ? '<span class="period-badge" title="Its regular cut-off was ' + esc(fmtDate(regularCutoff(p.Period).toISOString())) + '">Reopened</span>'
      : kind === 'early' ? '<span class="period-badge" title="This month has not started yet">Early</span>' : '';
    var status = p.Effective_Open ? 'Open until ' + shortDate(p.Cutoff_Date)
               : kind === 'expired' ? 'Closed ' + shortDate(p.Cutoff_Date)
               : 'Locked';
    var tone = p.Effective_Open ? ' is-open' : kind === 'expired' ? ' is-expired' : '';
    var change = p.Effective_Open && !busyCell
      ? '<button type="button" class="period-change" onclick="MGI.openPeriodDate(\'' + esc(p.Period) + '\')" title="Change the cut-off of ' + esc(periodName(p.Period)) + '">' +
          '<span class="material-symbols-outlined text-[14px]" aria-hidden="true">edit_calendar</span>Change date</button>'
      : '';

    return '<div class="period-cell' + tone + (busyCell ? ' is-busy' : '') + '">' +
      '<label class="flex items-center gap-2 cursor-pointer min-w-0">' +
        '<input type="checkbox" class="w-4 h-4 rounded border-border-medium text-primary-container focus:ring-primary-container"' +
          (p.Effective_Open ? ' checked' : '') + (busyCell ? ' disabled' : '') +
          ' data-period="' + esc(p.Period) + '" onchange="MGI.onPeriodToggle(this)">' +
        '<span class="text-label-md text-text-primary font-semibold">' + esc(MONTHS[m - 1]) + '</span>' +
        badge +
        (busyCell ? '<span class="spinner spinner-dark !w-3 !h-3"></span>' : '') +
      '</label>' +
      '<span class="text-[11px] leading-tight ' + (p.Effective_Open ? 'text-status-success-text font-semibold' : 'text-text-muted') + '">' + esc(status) + '</span>' +
      change +
    '</div>';
  }

  function onPeriodToggle(el) {
    var period = el.dataset.period;
    var p = periodRow(period);
    if (!p) return;

    if (!el.checked) {
      applyPeriod(period, false, '');
      return;
    }

    el.checked = false;
    openPeriodConfirm('open', [period]);
  }

  function openPeriodDate(period) {
    openPeriodConfirm('move', [period]);
  }

  function openPeriodBulk() {
    openPeriodConfirm('bulk', (S.periods || []).filter(function (p) { return p.Effective_Open; }).map(function (p) { return p.Period; }));
  }

  function openPeriodConfirm(kind, periods) {
    var list = (periods || []).map(periodRow).filter(function (p) { return !!p; });
    if (!list.length) return;
    var first = list[0];
    var date = kind === 'move' ? toDateInput(first.Cutoff_Date) : suggestedCutoff(kind === 'open' ? first : null);
    if (!futureDate(date)) date = plusDaysInput(7);
    var picked = {};
    list.forEach(function (p) { picked[p.Period] = true; });
    S.periodConfirm = { kind: kind, periods: list.map(function (p) { return p.Period; }), picked: picked, date: date };

    var name = periodName(first.Period);
    var early = kind === 'open' && !periodStarted(first.Period);
    var reopen = kind === 'open' && !early && Date.now() > regularCutoff(first.Period).getTime();
    var title = kind === 'bulk' ? 'Change the cut-off of open months'
              : kind === 'move' ? 'Change the cut-off of ' + name + '?'
              : (reopen ? 'Reopen ' : 'Open ') + name + (early ? ' early' : '') + '?';
    var today = toDateInput(new Date().toISOString());

    $('modal-host').innerHTML =
      '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closePeriodConfirm()">' +
        '<div class="modal-panel !max-w-md" role="dialog" aria-modal="true" aria-labelledby="period-confirm-title">' +
          '<div class="px-6 pt-6 pb-5 flex items-start gap-4">' +
            '<span class="w-10 h-10 rounded-full ' + (early ? 'bg-status-warning-subtle text-status-warning' : 'bg-brand-50 text-primary-container') + ' flex items-center justify-center shrink-0">' +
              '<span class="material-symbols-outlined text-[22px]">' + (early ? 'warning' : kind === 'open' ? 'event_available' : 'edit_calendar') + '</span></span>' +
            '<div class="min-w-0 flex-1">' +
              '<h2 id="period-confirm-title" class="text-title-lg text-text-primary">' + esc(title) + '</h2>' +
              '<label class="flex flex-col mt-space-md">' +
                '<span class="form-label">' + (kind === 'open' ? 'Open until' : 'New cut-off') + '</span>' +
                '<input id="period-date" type="date" class="field !py-1.5" min="' + esc(today) + '" value="' + esc(date) + '"' +
                  ' oninput="MGI.onPeriodDateInput(this.value)" onchange="MGI.onPeriodDateInput(this.value)">' +
              '</label>' +
              (kind === 'bulk'
                ? '<div class="period-bulk-list mt-space-md" role="group" aria-label="Open months">' + list.map(function (p) {
                    return '<label class="period-bulk-row">' +
                      '<input type="checkbox" class="w-4 h-4 rounded border-border-medium text-primary-container" checked' +
                        ' data-bulk-period="' + esc(p.Period) + '" onchange="MGI.togglePeriodBulkPick(\'' + esc(p.Period) + '\')">' +
                      '<span class="flex-1 min-w-0 text-body-sm font-semibold text-text-primary">' + esc(periodName(p.Period)) + '</span>' +
                      '<span class="text-label-xs text-text-muted">until ' + esc(shortDate(p.Cutoff_Date)) + '</span>' +
                    '</label>';
                  }).join('') + '</div>'
                : '') +
              '<p id="period-confirm-text" class="text-body-sm text-text-secondary mt-space-md"></p>' +
              '<p id="period-confirm-note" class="text-body-sm text-text-secondary mt-2"></p>' +
              (reopen
                ? '<p class="text-body-sm text-text-secondary mt-2">Its regular cut-off was ' + esc(fmtDate(regularCutoff(first.Period).toISOString())) +
                    '. Lock it again once the late submissions are in.</p>'
                : '') +
              (early
                ? '<div class="mt-space-md rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-body-sm text-amber-900">' + esc(name) +
                    ' has not started yet. Employees could fill it in before the month is over.</div>'
                : '') +
            '</div>' +
          '</div>' +
          '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex items-center justify-end gap-space-sm">' +
            '<button type="button" class="btn btn-secondary" onclick="MGI.closePeriodConfirm()">Cancel</button>' +
            '<button id="period-confirm" type="button" class="btn btn-primary" onclick="MGI.confirmPeriodChange()"></button>' +
          '</div>' +
        '</div>' +
      '</div>';
    syncPeriodConfirm();
  }

  function periodConfirmTargets(c) {
    return c.kind === 'bulk' ? c.periods.filter(function (p) { return c.picked[p]; }) : c.periods.slice();
  }

  function syncPeriodConfirm() {
    var c = S.periodConfirm;
    if (!c) return;
    var targets = periodConfirmTargets(c);
    var valid = futureDate(c.date);
    var until = valid ? fmtDate(cutoffIso(c.date)) : '';
    var first = periodRow(c.periods[0]);
    var oldDate = first ? toDateInput(first.Cutoff_Date) : '';
    var name = c.kind === 'bulk' ? (targets.length === 1 ? periodName(targets[0]) : 'the ' + targets.length + ' selected months') : periodName(c.periods[0]);
    var same = c.kind === 'move' && c.date === oldDate;
    var label = !valid ? 'Pick a date from today'
              : c.kind === 'bulk' ? 'Apply to ' + plural(targets.length, 'month')
              : c.kind === 'move' ? (same ? 'Pick a new date' : (c.date > oldDate ? 'Extend' : 'Shorten') + ' to ' + shortDate(cutoffIso(c.date)))
              : (Date.now() > regularCutoff(c.periods[0]).getTime() && periodStarted(c.periods[0]) ? 'Reopen' : 'Open') + ' until ' + shortDate(cutoffIso(c.date));
    var text = $('period-confirm-text');
    if (text) {
      text.innerHTML = !valid ? '<span class="text-status-danger-text">Choose a cut-off date from today onward.</span>'
        : !targets.length ? 'Select at least one month.'
        : 'Every employee can submit or change ' + esc(name) + ' until <strong>' + esc(until) + ', 23:59 WIB</strong>.';
    }
    var note = $('period-confirm-note');
    if (note) {
      note.textContent = c.kind === 'move' && valid && !same && first ? 'The cut-off moves from ' + fmtDate(first.Cutoff_Date) + ' to ' + until + '.' : '';
      note.classList.toggle('hidden', !note.textContent);
    }
    var btn = $('period-confirm');
    if (btn) {
      btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">' + (c.kind === 'open' ? 'lock_open' : 'edit_calendar') + '</span> ' + esc(label);
      btn.disabled = !valid || !targets.length || same;
    }
  }

  function onPeriodDateInput(value) {
    if (!S.periodConfirm) return;
    S.periodConfirm.date = String(value || '');
    syncPeriodConfirm();
  }

  function togglePeriodBulkPick(period) {
    var c = S.periodConfirm;
    if (!c) return;
    c.picked[period] = !c.picked[period];
    syncPeriodConfirm();
  }

  function closePeriodConfirm() {
    S.periodConfirm = null;
    $('modal-host').innerHTML = '';
  }

  function confirmPeriodChange() {
    var c = S.periodConfirm;
    if (!c || !futureDate(c.date)) return;
    var targets = periodConfirmTargets(c);
    if (!targets.length) return;
    var first = periodRow(c.periods[0]);
    if (c.kind === 'move' && first && toDateInput(first.Cutoff_Date) === c.date) return;
    var cutoff = cutoffIso(c.date);
    closePeriodConfirm();
    if (c.kind !== 'bulk') {
      applyPeriod(targets[0], true, cutoff);
      return;
    }
    applyPeriodBulk(targets, cutoff);
  }

  function savePeriodState(period, state) {
    S.periods = S.periods.map(function (p) {
      if (p.Period !== period) return p;
      return {
        Period: p.Period, Is_Open: state.rawOpen, Expired: state.expired,
        Effective_Open: state.isOpen, Cutoff_Date: state.cutoff, Notes: p.Notes, Exists: true
      };
    });
  }

  function applyPeriod(period, open, cutoff) {
    S.periodBusy[period] = true;
    renderPeriodControl();

    return api('setPeriodLock', period, open, cutoff)
      .then(function (state) {
        delete S.periodBusy[period];
        savePeriodState(period, state);
        renderPeriodControl();
        toast(periodName(period) + (open ? ' is open for every employee until ' + fmtDate(state.cutoff) : ' is locked') + '.', 'success');
      })
      .catch(function (err) {
        delete S.periodBusy[period];
        renderPeriodControl();
        toast(err.message, 'error');
      });
  }

  function applyPeriodBulk(periods, cutoff) {
    periods.forEach(function (p) { S.periodBusy[p] = true; });
    renderPeriodControl();
    var done = 0;
    var last = null;
    var chain = null;
    periods.forEach(function (period) {
      var step = function () {
        return api('setPeriodLock', period, true, cutoff).then(function (state) {
          delete S.periodBusy[period];
          savePeriodState(period, state);
          last = state;
          done++;
          renderPeriodControl();
        });
      };
      chain = chain ? chain.then(step) : step();
    });
    return chain
      .then(function () {
        toast(plural(done, 'month') + ' open for every employee until ' + fmtDate(last ? last.cutoff : cutoff) + '.', 'success');
      })
      .catch(function (err) {
        S.periodBusy = {};
        renderPeriodControl();
        toast((done ? plural(done, 'month') + ' saved before the error. ' : '') + err.message, 'error');
      });
  }

  function renderSummaryTabs() {
    var rows = baseRows();
    var done = rows.filter(function (r) { return r.submitted > 0; }).length;
    var pending = rows.length - done;

    var locked = rows.filter(rowChangeLocked).length;
    var tabs = [
      { key: 'all',     label: 'All', count: rows.length },
      { key: 'done',    label: 'Submitted', count: done },
      { key: 'pending', label: 'Not Submitted', count: pending },
      { key: 'locked',  label: 'No Changes Left', count: locked }
    ].filter(function (t) { return t.key !== 'locked' || t.count > 0 || S.sumFilter === 'locked'; });

    $('sum-tabs').innerHTML = tabs.map(function (t) {
      var active = S.sumFilter === t.key;
      return '<button type="button" onclick="MGI.setSumFilter(\'' + t.key + '\')" class="seg-btn' +
             (active ? ' is-active' : '') + '">' +
             esc(t.label) + '<span class="seg-count">' + t.count + '</span></button>';
    }).join('');
  }

  function setSumFilter(key) {
    S.sumFilter = key;
    S.sumPage = 1;
    renderSummaryTabs();
    renderSummaryTable();
  }

  function renderSummaryTable() {
    var all = filteredRows();
    var size = pageSizeFor('monthly', all.length);
    var pages = Math.max(1, Math.ceil(all.length / size));
    if (S.sumPage > pages) S.sumPage = pages;
    var start = (S.sumPage - 1) * size;
    var page = all.slice(start, start + size);

    if (!all.length) {
      $('sum-tbody').innerHTML =
        '<tr><td colspan="5" class="text-center py-space-2xl">' +
          '<span class="material-symbols-outlined text-[40px] text-text-muted">search_off</span>' +
          '<p class="text-body-md text-text-secondary mt-2">No data matches these filters.</p>' +
        '</td></tr>';
      $('sum-pagination').innerHTML = '';
      return;
    }

    var open = !!(S.summary.periodState && S.summary.periodState.isOpen);

    $('sum-tbody').innerHTML = page.map(function (r) {
      var unscored = r.submitted === 0;
      var b = band(r.index);
      var statusTone = unscored ? (open ? 'warning' : 'danger')
                     : r.statusKey === 'partial' ? 'warning'
                     : r.evidence || r.statusKey === 'submitted' ? 'success' : 'info';
      var statusText = unscored && open ? 'Not submitted yet' : r.status;
      var remindedAt = S.summary.reminders && S.summary.reminders[r.NIK] && reminderNeed(r) ? S.summary.reminders[r.NIK] : '';

      var chips = r.items.map(function (it, ix) {
        var title = it.KPI_Name + ', weight ' + it.WeightPercent + '%' +
                    (it.AutoScore ? ', off-cycle, scored automatically' : isNum(it.Realization) ? ', realization ' + it.Realization : ', not filled');
        var val = !isNum(it.ScoreDisplay)
          ? (it.InCycle ? '-' : '<span class="material-symbols-outlined text-[12px] align-middle">lock</span>')
          : '<strong class="text-text-primary">' + num(it.ScoreDisplay, 0) + '</strong>';
        return '<span class="px-2 py-0.5 rounded bg-surface-page border border-border-light text-label-xs text-text-secondary" title="' +
               esc(title) + '">K' + (ix + 1) + ': ' + val + '</span>';
      }).join('');

      var score = unscored
        ? '<div class="flex items-center justify-end gap-space-sm">' +
            '<span class="text-body-md font-bold text-text-muted">-' +
              '<span class="font-normal text-label-xs">/100</span></span>' +
          '</div>' +
          '<span class="pill pill-neutral mt-1">Not Scored</span>'
        : '<div class="flex items-center justify-end gap-space-sm">' +
            '<span class="text-body-md font-bold text-text-primary">' + num(r.index) +
              '<span class="text-text-muted font-normal text-label-xs">/100</span></span>' +
            '<div class="w-12 bg-surface-container h-1.5 rounded-full overflow-hidden">' +
              '<div class="h-full bg-status-' + b.key + '" style="width:' + Math.max(0, Math.min(100, r.index)) + '%"></div>' +
            '</div>' +
          '</div>' +
          '<span class="pill pill-' + b.key + ' mt-1">' + b.label + '</span>';

      return '' +
      '<tr>' +
        '<td>' +
          '<div class="flex items-center gap-space-sm min-w-0">' +
            '<div class="w-9 h-9 rounded-full bg-primary-container text-white flex items-center justify-center text-label-xs font-bold shrink-0">' +
              esc(r.Initials) + '</div>' +
            '<div class="flex flex-col min-w-0">' +
              nameLink(r.Full_Name, r.NIK, r.roleKey, S.summary.year, 'text-body-md font-bold truncate') +
              '<span class="text-label-xs text-text-secondary">' + esc(r.Position) + ' / ' + esc(r.Department) + '</span>' +
              '<span class="flex items-center gap-1 flex-wrap text-[11px] text-text-muted">NIK ' + esc(r.NIK) +
                (r.isHome ? '' : '<span class="pill pill-maroon !py-0 !px-1.5 !text-[11px]">Additional Role</span>') +
                (r.roleInactive ? '<span class="pill pill-neutral !py-0 !px-1.5 !text-[11px]">Inactive Role</span>' : '') +
              '</span>' +
            '</div>' +
          '</div>' +
        '</td>' +
        '<td><div class="flex flex-wrap gap-1.5">' + chips + '</div></td>' +
        '<td class="text-right whitespace-nowrap">' + score + '</td>' +
        '<td class="text-center"><span class="pill pill-' + statusTone + '">' +
          '<span class="material-symbols-outlined text-[14px]">' +
            (unscored ? 'schedule' : r.statusKey === 'partial' ? 'hourglass_top' : 'check_circle') +
          '</span> ' + esc(statusText) + '</span>' +
          (remindedAt ? '<span class="block mt-1 text-[11px] text-text-muted" title="' + esc(fmtDate(remindedAt)) + '">' + esc(reminderLabel(remindedAt)) + '</span>' : '') +
          changeInfo(r) +
        '</td>' +
        '<td class="text-center">' +
          (r.evidence
            ? '<a href="' + esc(r.evidence.File_URL) + '" target="_blank" rel="noopener noreferrer" ' +
              'class="btn btn-secondary !py-1.5 !px-3 !text-label-sm" title="' + esc(r.evidence.File_Name) + '" aria-label="View the evidence of ' + esc(r.Full_Name) + '">' +
                '<span class="material-symbols-outlined text-[16px] text-brand-maroon-dark">folder_open</span> View</a>' +
              (r.evidence.legacy ? '<span class="block text-[11px] text-text-muted mt-1">Combined evidence (legacy)</span>' : '')
            : '<span class="text-label-xs text-text-muted">No file</span>') +
        '</td>' +
      '</tr>';
    }).join('');

    renderPagination('sum-pagination', all.length, start, page.length, S.sumPage, size, 'monthly');
  }

  var PAGE_SIZES = [25, 50, 100, 0];

  function pageSizeKey(view) {
    return view === 'eval' ? 'EVAL_PAGE_SIZE' : view === 'annual' ? 'ANN_PAGE_SIZE' : 'PAGE_SIZE';
  }

  function pageSizeFor(view, total) {
    var n = S[pageSizeKey(view)];
    return n > 0 ? n : Math.max(1, total);
  }

  function restorePageSizes() {
    ['monthly', 'annual', 'eval'].forEach(function (view) {
      try {
        var n = parseInt(localStorage.getItem('mgi.pageSize.' + view), 10);
        if (PAGE_SIZES.indexOf(n) > -1) S[pageSizeKey(view)] = n;
      } catch (e) {}
    });
  }

  function setPageSize(view, value) {
    var n = parseInt(value, 10);
    if (PAGE_SIZES.indexOf(n) === -1) n = 25;
    S[pageSizeKey(view)] = n;
    try { localStorage.setItem('mgi.pageSize.' + view, String(n)); } catch (e) {}
    if (view === 'eval') {
      S.evalPage = 1;
      renderEvalBody();
    } else if (view === 'annual') {
      S.annPage = 1;
      renderAnnualTable();
    } else {
      S.sumPage = 1;
      renderSummaryTable();
    }
  }

  function scrollTableTop(bodyId) {
    var body = $(bodyId);
    var wrap = body && body.closest ? body.closest('.pin-wrap') : null;
    if (!wrap || !wrap.getBoundingClientRect) return;
    var host = wrap.querySelector('.pin-head');
    var offset = (host && parseFloat(host.style.top)) || 64;
    var top = wrap.getBoundingClientRect().top + window.pageYOffset - offset;
    if (window.pageYOffset > top) window.scrollTo({ top: top, behavior: 'smooth' });
  }

  function wirePinnedHeads() {
    PIN_TABLES.forEach(function (p) {
      var scroller = $(p.key + '-scroll');
      var host = $(p.key + '-pin');
      if (!scroller || !scroller.querySelector || scroller.dataset.pinned) return;
      scroller.dataset.pinned = '1';
      scroller.addEventListener('scroll', function () { alignPinnedHead(p.key); }, { passive: true });
      if (host && host.addEventListener) {
        host.addEventListener('wheel', function (e) {
          if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
          scroller.scrollLeft += e.deltaX;
          e.preventDefault();
        }, { passive: false });
      }
      var table = scroller.querySelector('table');
      if (table && window.MutationObserver) new MutationObserver(schedulePins).observe(table, { childList: true, subtree: true });
      if (window.ResizeObserver) {
        var watch = new ResizeObserver(schedulePins);
        watch.observe(scroller);
        if ($(p.bar)) watch.observe($(p.bar));
      }
    });
    if (window.addEventListener) window.addEventListener('resize', schedulePins);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedulePins);
  }

  function schedulePins() {
    if (S.pinFrame) return;
    var run = function () {
      S.pinFrame = 0;
      PIN_TABLES.forEach(function (p) { pinTableHead(p.key, p.bar); });
    };
    S.pinFrame = window.requestAnimationFrame ? window.requestAnimationFrame(run) : setTimeout(run, 16);
  }

  function pinTop(barId) {
    var topbar = $('topbar');
    var top = (topbar && topbar.offsetHeight) || 64;
    var bar = $(barId);
    if (bar && window.getComputedStyle && window.getComputedStyle(bar).position === 'sticky') top += bar.offsetHeight || 0;
    return top;
  }

  function pinTableHead(key, barId) {
    var scroller = $(key + '-scroll');
    var host = $(key + '-pin');
    if (!scroller || !host || !scroller.querySelector) return;
    var table = scroller.querySelector('table');
    var head = table && table.tHead;
    var row = head && head.rows && head.rows[0];
    if (!row || !scroller.offsetWidth) {
      host.innerHTML = '';
      return;
    }
    var cols = Array.prototype.map.call(row.cells, function (cell) {
      return '<col style="width:' + cell.getBoundingClientRect().width + 'px">';
    }).join('');
    host.style.top = pinTop(barId) + 'px';
    host.innerHTML = '<div class="pin-head-scroll"><table class="' + esc(table.className) + '" style="table-layout:fixed;width:' +
      table.getBoundingClientRect().width + 'px"><colgroup>' + cols + '</colgroup><thead>' + head.innerHTML.replace(/<button /g, '<button tabindex="-1" ') + '</thead></table></div>';
    alignPinnedHead(key);
  }

  function alignPinnedHead(key) {
    var scroller = $(key + '-scroll');
    var host = $(key + '-pin');
    var inner = host && host.firstElementChild;
    if (inner && scroller) inner.scrollLeft = scroller.scrollLeft;
  }

  function renderPagination(hostId, total, start, shown, current, size, view) {
    var pages = Math.ceil(total / size);
    var buttons = '';
    var gapOpen = false;
    var chosen = S[pageSizeKey(view)];
    var noun = view === 'eval' ? (total === 1 ? 'scorecard' : 'scorecards') : (total === 1 ? 'role row' : 'role rows');

    for (var p = 1; p <= pages; p++) {
      var nearEdge = (p <= 2 || p >= pages - 1);
      var nearCurrent = Math.abs(p - current) <= 1;

      if (pages > 7 && !nearEdge && !nearCurrent) {
        if (!gapOpen) {
          buttons += '<span class="px-1.5 text-xs text-slate-500">...</span>';
          gapOpen = true;
        }
        continue;
      }
      gapOpen = false;

      buttons += '<button type="button" onclick="MGI.gotoPage(' + p + ', \'' + view + '\')" class="page-btn' +
                 (p === current ? ' is-active" aria-current="page' : '') + '">' + p + '</button>';
    }

    $(hostId).innerHTML =
      '<div class="flex flex-wrap items-center gap-x-4 gap-y-2">' +
        '<label class="inline-flex items-center gap-2 text-body-sm text-text-secondary">Rows per page' +
          '<select class="field !w-auto !py-1 !pl-2.5 !pr-8 !text-label-sm" aria-label="Rows per page" onchange="MGI.setPageSize(\'' + view + '\', this.value)">' +
            PAGE_SIZES.map(function (n) {
              return '<option value="' + n + '"' + (n === chosen ? ' selected' : '') + '>' + (n ? n : 'All') + '</option>';
            }).join('') +
          '</select></label>' +
        '<p class="text-body-sm text-text-secondary">Showing <strong>' + (start + 1) + '-' +
          (start + shown) + '</strong> of <strong>' + total + '</strong> ' + noun + '</p>' +
      '</div>' +
      (pages > 1 ? '<div class="flex flex-wrap items-center gap-1.5">' + buttons + '</div>' : '');
  }

  function gotoPage(p, view) {
    if (view === 'eval') {
      S.evalPage = p;
      renderEvalBody();
      scrollTableTop('eval-tbody');
      return;
    }
    if (view === 'annual') {
      S.annPage = p;
      renderAnnualTable();
      scrollTableTop('ann-tbody');
      return;
    }
    S.sumPage = p;
    renderSummaryTable();
    scrollTableTop('sum-tbody');
  }

  function nameLink(name, nik, roleKey, year, extra) {
    return '<button type="button" class="name-link' + (extra ? ' ' + extra : '') + '" title="Open performance report"' +
      ' aria-label="Open the performance report for ' + esc(name) + '"' +
      ' onclick="MGI.openPerformanceReport(\'' + esc(nik) + '\', \'' + esc(roleKey) + '\', ' + year + ', \'modal\')">' +
      esc(name) + '</button>';
  }

  function renderDistribution() {
    var d = summaryStats(baseRows()).dist;
    var total = d.total || 1;

    var bar = function (label, count, colour) {
      var p = Math.round(count / total * 1000) / 10;
      return '<div class="mb-space-md">' +
        '<div class="flex items-center justify-between mb-1.5">' +
          '<span class="text-body-sm text-text-secondary flex items-center gap-1.5">' +
            '<span class="w-2 h-2 rounded-full ' + colour + '"></span> ' + esc(label) + '</span>' +
          '<span class="text-body-sm font-semibold text-text-primary">' + count + ' roles (' + pct(p) + ')</span>' +
        '</div>' +
        '<div class="w-full bg-surface-container h-2 rounded-full overflow-hidden">' +
          '<div class="' + colour + ' h-full rounded-full transition-all duration-500" style="width:' + p + '%"></div>' +
        '</div></div>';
    };

    $('sum-distribution').innerHTML =
      '<h2 class="text-title-lg text-text-primary mb-1">Rating Distribution</h2>' +
      '<p class="text-body-sm text-text-muted mb-space-lg">' +
        (d.total ? 'How the ' + plural(d.total, 'submitted role') + ' for ' + esc(sumMonthName()) + (d.total === 1 ? ' is rated.' : ' are rated.')
                 : 'Ratings appear here once roles submit for ' + esc(sumMonthName()) + '.') + '</p>' +
      bar(bandRange('success'), d.sangatBaik, 'bg-status-success') +
      bar(bandRange('info'), d.baik, 'bg-status-info') +
      bar(bandRange('danger'), d.perluPerhatian, 'bg-status-danger') +
      (d.total === 0
        ? '<p class="text-body-sm text-text-muted text-center py-space-md">No roles have submitted for ' + esc(sumMonthName()) + ' yet.</p>'
        : '');
  }

  function exportCsv() {
    if (S.sumView === 'annual') {
      exportAnnualCsv();
      return;
    }

    var rows = filteredRows();
    if (!S.summary || !rows.length) {
      toast('No data to export.', 'warning');
      return;
    }

    var maxKpi = rows.reduce(function (m, r) { return Math.max(m, r.items.length); }, 0);

    var header = ['NIK', 'Full Name', 'Position (Role)', 'Department (Role)', 'Period'];
    for (var k = 1; k <= maxKpi; k++) header.push('K' + k + ' Score', 'K' + k + ' Realization');
    header.push('Total Score', 'Rating', 'Submission Status', 'Evidence Link', 'Evidence Type');

    var lines = [csvLine(header)];

    rows.forEach(function (r) {
      var line = [r.NIK, r.Full_Name, r.Position, r.Department, S.summary.period];
      for (var i = 0; i < maxKpi; i++) {
        var it = r.items[i];
        line.push(it && isNum(it.ScoreDisplay) ? it.ScoreDisplay : '');
        line.push(it && isNum(it.Realization) ? it.Realization : '');
      }
      line.push(
        r.submitted === 0 ? '' : r.index,
        r.predikat,
        r.status,
        r.evidence ? r.evidence.File_URL : '',
        r.evidence ? (r.evidence.legacy ? 'Combined (legacy)' : 'Per role') : ''
      );
      lines.push(csvLine(line));
    });

    downloadCsv(lines, 'KPI_Summary_' + S.summary.period + '_' + fileStamp() + '.csv');
    toast('CSV exported (' + rows.length + ' role rows).', 'success');
  }

  function csvLine(values) {
    return values.map(function (v) {
      var text = (v === null || v === undefined) ? '' : String(v);
      return '"' + text.replace(/"/g, '""') + '"';
    }).join(',');
  }

  function downloadCsv(lines, fileName) {
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

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
          '<span class="material-symbols-outlined text-[40px] text-text-muted">search_off</span>' +
          '<p class="text-body-md text-text-secondary mt-2">' +
            (S.annual && S.annual.rows.length ? 'No data matches these filters.'
                                              : 'No KPI mappings found for ' + activeSumYear() + '.') + '</p>' +
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

  function openPerformanceReport(nik, roleKey, year, surface) {
    var target = {
      nik: nik || S.user.NIK,
      roleKey: roleKey || '',
      year: parseInt(year, 10) || S.user.year,
      surface: surface === 'inline' ? 'inline' : 'modal'
    };
    S.report = target;

    if (S.reports[target.nik + '|' + target.year]) {
      renderPerformanceReport();
      return;
    }

    if (target.surface === 'inline') {
      $('emp-annual-report').innerHTML =
        '<div class="bg-surface-card rounded-xl shadow-level-1 border border-border-light p-space-lg">' +
          '<div class="skeleton h-6 w-1/3 mb-3"></div><div class="skeleton h-48 w-full"></div>' +
        '</div>';
    } else {
      $('modal-host').innerHTML =
        '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closePerformanceReport()">' +
          '<div class="modal-panel !max-w-xs p-space-lg flex items-center gap-space-sm">' +
            '<span class="spinner spinner-dark"></span>' +
            '<span class="text-body-md text-text-secondary">Loading performance report</span>' +
          '</div>' +
        '</div>';
    }

    api('getPerformanceReport', target.nik, target.year)
      .then(function (data) {
        S.reports[target.nik + '|' + target.year] = data;
        if (S.report === target) renderPerformanceReport();
      })
      .catch(function (err) {
        if (S.report === target) {
          if (target.surface === 'inline') {
            $('emp-annual-report').innerHTML =
              '<div class="bg-surface-card rounded-xl border border-border-light p-space-xl text-center text-status-danger">' +
              esc(err.message) + '</div>';
          } else {
            closePerformanceReport();
          }
        }
        toast(err.message, 'error');
      });
  }

  function closePerformanceReport() {
    destroyDeepDiveCharts('ddm');
    if (!S.report || S.report.surface === 'modal') S.report = null;
    $('modal-host').innerHTML = '';
  }

  function setReportRole(key) {
    if (!S.report) return;
    S.report.roleKey = key;
    renderPerformanceReport();
  }

  function onReportYearChange(value) {
    if (!S.report) return;
    openPerformanceReport(S.report.nik, S.report.roleKey, value, S.report.surface);
  }

  function setEmpView(view) {
    S.empView = view === 'annual' ? 'annual' : 'monthly';
    $('emp-monthly-panel').classList.toggle('hidden', S.empView !== 'monthly');
    $('emp-annual-panel').classList.toggle('hidden', S.empView !== 'annual');
    document.querySelectorAll('#emp-view-tabs [data-emp-view]').forEach(function (b) {
      var on = b.dataset.empView === S.empView;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (S.empView !== 'annual') return;

    var inline = S.report && S.report.surface === 'inline' ? S.report : null;
    openPerformanceReport(S.user.NIK, inline ? inline.roleKey : '', inline ? inline.year : S.user.year, 'inline');
  }

  function tierClass(score) {
    var sc = Number(score);
    return sc >= 0.95 ? 'mx-t10' : sc >= 0.75 ? 'mx-t08' : sc >= 0.55 ? 'mx-t06' : sc >= 0.35 ? 'mx-t04' : 'mx-t02';
  }

  function renderPerformanceReport() {
    var t = S.report;
    var data = t ? S.reports[t.nik + '|' + t.year] : null;
    if (!data) return;

    var roles = data.roles || [];
    var role = roles.filter(function (r) { return r.roleKey === t.roleKey; })[0] ||
               roles.filter(function (r) { return r.isHome && !r.roleInactive; })[0] ||
               roles.filter(function (r) { return !r.roleInactive; })[0] || roles[0] || null;
    if (role) t.roleKey = role.roleKey;

    var html = reportHtml(data, role, t.surface);
    if (t.surface === 'inline') {
      var host = $('emp-annual-report');
      if (host) host.innerHTML = html;
      renderDeepDiveCharts(data, role);
      return;
    }

    $('modal-host').innerHTML =
      '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closePerformanceReport()">' +
        '<div class="modal-panel !max-w-[95vw]">' + html + '</div>' +
      '</div>';
    renderDeepDiveCharts(data, role);
  }

  function setReportTab(tab) {
    S.reportTab = tab === 'analytics' ? 'analytics' : 'matrix';
    renderPerformanceReport();
  }

  function toggleDeepDive(index) {
    var t = S.report;
    var data = t ? S.reports[t.nik + '|' + t.year] : null;
    if (!data) return;
    var role = (data.roles || []).filter(function (r) { return r.roleKey === t.roleKey; })[0];
    var k = role && role.kpis ? role.kpis[index] : null;
    if (!k) return;
    S.deepOpen[role.roleKey + '|' + k.KPI_ID] = !deepDiveIsOpen(role, k, index);
    renderPerformanceReport();
  }

  function reportThemeLine(data) {
    if (!data || !data.theme) return '';
    return '<p class="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-brand-50 border border-brand-100 px-2.5 py-0.5 text-label-sm font-semibold text-brand-maroon-dark">' +
      '<span class="material-symbols-outlined text-[16px]">flag</span>FY' + esc(data.year) + ' theme: ' + esc(data.theme) + '</p>';
  }

  function reportChipHtml(label, value) {
    return '<div class="report-chip">' +
      '<span class="text-label-xs uppercase tracking-wider text-text-muted">' + esc(label) + '</span>' +
      '<span class="text-label-md font-semibold text-text-primary truncate">' + esc(value || '-') + '</span>' +
    '</div>';
  }

  function summaryNote(data) {
    var trial = data.trialMonths || [];
    var counted = MONTHS.filter(function (m, i) { return trial.indexOf(i + 1) === -1; });
    var countedLabel = counted.length ? counted[0].substring(0, 3) + ' to ' + counted[counted.length - 1].substring(0, 3) : 'no months';
    var trialNames = trial.map(function (m) { return MONTHS[m - 1]; }).join(', ');
    return '*Avg KPI Score calculated for ' + esc(countedLabel) + ' ' + data.year + '.' +
      (trialNames ? ' ' + esc(trialNames) + (trial.length > 1 ? ' are trial months.' : ' is a trial month.') : '');
  }

  function reportHtml(data, role, surface) {
    var modal = surface !== 'inline';
    var emp = data.employee || {};
    var roles = data.roles || [];

    var years = (data.years && data.years.length ? data.years : [data.year]).map(function (y) {
      return '<option value="' + y + '"' + (y === data.year ? ' selected' : '') + '>' + y + '</option>';
    }).join('');

    var chip = reportChipHtml;
    var pdfButton = role
      ? '<button type="button" id="report-pdf-' + (modal ? 'modal' : 'inline') + '" class="btn btn-secondary !py-1.5 whitespace-nowrap"' +
        ' onclick="MGI.downloadPerformancePdf()" title="Download the full report with every KPI as a PDF">' +
        '<span class="material-symbols-outlined text-[18px]">picture_as_pdf</span> Download PDF</button>'
      : '';

    var tabs = roles.length > 1
      ? '<div class="seg flex-wrap mt-space-md">' + roles.map(function (r) {
          return '<button type="button" class="seg-btn' + (role && r.roleKey === role.roleKey ? ' is-active' : '') + '"' +
            ' onclick="MGI.setReportRole(\'' + esc(r.roleKey) + '\')">' + esc(r.roleLabel) +
            (r.roleInactive ? '<span class="pill pill-neutral !py-0 !px-1.5 !text-[11px]">Inactive</span>' : '') + '</button>';
        }).join('') + '</div>'
      : '';

    var header =
      '<div class="' + (modal ? 'px-6 py-5 border-b border-border-light' : 'bg-surface-card rounded-xl shadow-level-1 border border-border-light p-space-lg mb-space-lg') + '">' +
        '<div class="flex flex-col md:flex-row md:items-center justify-between gap-space-md">' +
          '<div class="min-w-0">' +
            '<h2 class="text-headline-md font-bold text-slate-900 tracking-tight">' + (role ? esc(role.roleLabel) : 'No KPI mapping') + '</h2>' +
            '<p class="text-sm text-slate-500 mt-0.5">Performance evaluation report • FY' + esc(data.year) + '</p>' +
            reportThemeLine(data) +
          '</div>' +
          '<div class="flex items-center gap-space-sm shrink-0">' +
            '<label for="report-year-' + (modal ? 'modal' : 'inline') + '" class="text-xs font-semibold text-slate-600">Year</label>' +
            '<select id="report-year-' + (modal ? 'modal' : 'inline') + '" class="field !w-auto !py-1.5" onchange="MGI.onReportYearChange(this.value)">' + years + '</select>' +
            pdfButton +
            (modal ? '<button class="btn-icon" onclick="MGI.closePerformanceReport()" title="Close" aria-label="Close"><span class="material-symbols-outlined">close</span></button>' : '') +
          '</div>' +
        '</div>' +
        '<div class="grid grid-cols-2 lg:grid-cols-4 gap-space-sm mt-space-md">' +
          chip('Full Name', emp.Full_Name) +
          chip('NIK', emp.NIK) +
          chip('Position', role ? role.Position : emp.Position) +
          chip('Department', role ? role.Department : emp.Department) +
        '</div>' +
        tabs +
      '</div>';

    if (!role) {
      return header +
        '<div class="' + (modal ? 'p-space-lg' : '') + '">' +
          '<div class="bg-surface-card rounded-xl border border-dashed border-border-medium p-space-xl text-center">' +
            '<span class="material-symbols-outlined text-[40px] text-text-muted">table_chart</span>' +
            '<p class="text-body-md text-text-secondary mt-2">No KPI mapping found for ' + data.year + '.</p>' +
          '</div>' +
        '</div>';
    }

    var summary = executiveSummaryHtml(data, role, modal, summaryNote(data));

    var viewTabs =
      '<div class="seg mt-space-md" role="tablist">' +
        '<button type="button" class="seg-btn' + (S.reportTab === 'analytics' ? '' : ' is-active') + '"' +
          ' onclick="MGI.setReportTab(\'matrix\')">' +
          '<span class="material-symbols-outlined text-[18px]">table_chart</span> Matrix Overview</button>' +
        '<button type="button" class="seg-btn' + (S.reportTab === 'analytics' ? ' is-active' : '') + '"' +
          ' onclick="MGI.setReportTab(\'analytics\')">' +
          '<span class="material-symbols-outlined text-[18px]">query_stats</span> Deep-Dive Analytics</button>' +
      '</div>';

    var panel = S.reportTab === 'analytics' ? deepDivePanelHtml(data, role, surface) : matrixPanelHtml(data, role, modal);

    return header + '<div class="' + (modal ? 'p-space-lg' : '') + '">' + summary + viewTabs +
      '<div class="mt-space-md">' + panel + '</div>' +
    '</div>';
  }

  function executiveSummaryHtml(data, role, modal, note) {
    var perf = data.performance || null;
    var rules = perf ? perf.rules : null;
    var ev = role.evaluation || null;
    var avgRaw = role.avgKpi !== undefined ? role.avgKpi : role.avgScore;
    var avg = isNum(avgRaw) ? Number(avgRaw) : null;
    var weight = function (key) { return rules ? num(rules.weights[key], 2) + '% weight' : ''; };
    var trial = data.trialMonths || [];
    var counted = MONTHS.filter(function (m, i) { return trial.indexOf(i + 1) === -1; });
    var span = counted.length ? counted[0].substring(0, 3) + ' to ' + counted[counted.length - 1].substring(0, 3) : 'No counted months';

    var tile = function (label, value, caption) {
      return '<div class="rounded-lg border border-border-light bg-white px-3 py-2.5 min-w-0 flex flex-col">' +
        '<span class="text-label-xs uppercase tracking-wider text-text-muted truncate" title="' + esc(label) + '">' + esc(label) + '</span>' +
        '<span class="mt-1 text-headline-md font-bold tabular-nums leading-tight">' + value + '</span>' +
        '<span class="mt-auto pt-0.5 text-[11px] text-text-muted truncate">' + (caption || '&nbsp;') + '</span>' +
      '</div>';
    };

    var tiles = [
      tile('KPI Months', '<span class="text-text-primary">' + role.kpiMonths + '</span>', esc(span)),
      tile('Avg KPI Score', avg === null ? '<span class="text-text-muted">-</span>'
        : '<span class="text-status-' + band(avg).key + '-text">' + avg.toFixed(2) + '%</span>', weight('kpi'))
    ];
    var result = '';
    var calc = '';
    var pills = '';
    var extra = '';

    if (perf && perf.visible && ev) {
      ['kbi', 's360', 'discipline'].forEach(function (key) {
        if (!(Number(rules.weights[key]) > 0)) return;
        var label = key === 'discipline' ? 'Discipline' : perfComponent(key).label + ' Score';
        tiles.push(tile(label, isNum(ev[key]) ? '<span class="text-text-primary">' + num(ev[key], 2) + '</span>'
          : '<span class="text-text-muted text-title-md">Pending</span>', weight(key)));
      });
      result = finalResultHtml(ev, rules);
      calc = scoreCalcHtml(ev);

      pills = rules.released
        ? '<span class="pill pill-success !text-[11px]"><span class="material-symbols-outlined text-[14px]">verified</span>Released ' + esc(fmtDate(rules.releasedAt)) + '</span>'
        : '<span class="pill pill-neutral !text-[11px]" title="Employees cannot see these results yet">Draft, not released</span>';
      if (ev.spLevel || ev.remarks) {
        pills += spPill(ev.spLevel, ev.remarks);
        extra = '<p class="mt-space-sm text-label-xs text-text-muted"><strong class="text-text-secondary">Remarks SP:</strong> ' +
          esc(ev.remarks || 'No remarks') + '</p>';
      }
      note += ' Performance Score = ' + esc(perfFormulaText(rules)) + '.';
    } else if (perf && !perf.visible) {
      result = '<div class="h-full rounded-xl border border-dashed border-border-medium bg-white p-4 flex items-center gap-3">' +
        '<span class="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">' +
          '<span class="material-symbols-outlined text-[22px]">lock_clock</span></span>' +
        '<div class="min-w-0"><p class="text-label-xs uppercase tracking-wider text-text-muted">Final Result</p>' +
          '<p class="text-body-sm text-text-secondary">Your Performance Score and Grade for FY' + data.year + ' will appear here after HR releases the results.</p></div>' +
      '</div>';
    }

    return '<div class="rounded-xl border border-border-light p-space-md mb-space-lg ' + (modal ? 'bg-surface-page' : 'bg-surface-card shadow-level-1') + '">' +
      '<div class="flex flex-col sm:flex-row sm:items-start justify-between gap-space-sm">' +
        '<div class="min-w-0">' +
          '<h3 class="text-title-md text-text-primary">Executive Summary</h3>' +
          '<p class="text-label-xs text-text-muted mt-1">' + note + '</p>' +
        '</div>' +
        (pills ? '<div class="flex flex-wrap items-center gap-1.5 shrink-0">' + pills + '</div>' : '') +
      '</div>' +
      '<div class="grid grid-cols-1 xl:grid-cols-12 items-stretch gap-3 mt-space-md">' +
        '<div class="' + (result ? 'xl:col-span-8' : 'xl:col-span-12') + ' h-full flex flex-col gap-2 min-w-0">' +
          '<div class="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">' + tiles.join('') + '</div>' +
          calc +
        '</div>' +
        (result ? '<div class="xl:col-span-4">' + result + '</div>' : '') +
      '</div>' +
      extra +
    '</div>';
  }

  function scoreCalcHtml(ev) {
    var parts = (ev.parts || []).filter(function (p) { return p.required; });
    if (!parts.length) return '';
    var terms = parts.map(function (p) {
      return '<span class="inline-flex items-baseline gap-1 whitespace-nowrap" title="' + esc(p.label) + '">' +
        '<span class="text-label-xs text-text-muted">' + esc(p.label) + '</span>' +
        '<span class="font-semibold tabular-nums ' + (isNum(p.value) ? 'text-text-primary' : 'text-status-warning-text') + '">' +
          (isNum(p.value) ? num(p.value, 2) : '?') + '</span>' +
        '<span class="text-text-muted tabular-nums">x ' + num(p.weight, 2) + '%</span></span>';
    }).join('<span class="text-text-muted">+</span>');
    return '<div class="rounded-lg border border-dashed border-border-medium bg-white/70 px-3 py-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm">' +
      '<span class="material-symbols-outlined text-[18px] text-text-muted">calculate</span>' + terms +
      '<span class="text-text-muted">=</span>' +
      (ev.complete ? '<strong class="tabular-nums text-text-primary">' + scoreText(ev.score) + '</strong>'
                   : '<span class="font-semibold text-status-warning-text">Pending</span>') +
    '</div>';
  }

  function finalResultHtml(ev, rules) {
    if (!ev.complete) {
      return '<div class="h-full rounded-xl border border-dashed border-border-medium bg-white p-4 flex flex-col justify-center gap-1">' +
        '<p class="text-label-xs uppercase tracking-wider text-text-muted">Final Result</p>' +
        '<p class="text-headline-md font-bold text-text-secondary">Pending</p>' +
        '<p class="text-body-sm text-text-muted">Needs ' + esc(ev.missing.join(', ')) + ' before the Performance Score and Grade can be calculated.</p>' +
      '</div>';
    }
    var range = gradeRanges(rules.grades).filter(function (r) { return r.grade === ev.grade; })[0];
    return '<div class="h-full rounded-xl border px-4 py-3 flex flex-col justify-between gap-2 ' + GRADE_TINTS[ev.grade] + '">' +
      '<div class="flex items-start justify-between gap-4">' +
        '<div class="min-w-0">' +
          '<p class="text-label-xs uppercase tracking-wider text-text-secondary">Performance Score</p>' +
          '<p class="mt-1 text-[32px] leading-10 font-bold tabular-nums text-slate-900">' + scoreText(ev.score) +
            '<span class="text-body-md font-semibold text-text-muted"> / 100</span></p>' +
        '</div>' +
        '<div class="flex flex-col items-end shrink-0">' +
          '<p class="text-label-xs uppercase tracking-wider text-text-secondary">Performance Grade</p>' +
          '<div class="mt-1 flex items-center gap-2">' +
            '<span class="text-label-xs text-text-secondary text-right leading-tight">Grade ' + ev.grade + ' covers<br>' + esc(range ? range.label : '-') + '</span>' +
            gradeBadge(ev.grade, 'hero') +
          '</div>' +
        '</div>' +
      '</div>' +
      gradeScaleHtml(rules.grades, ev.score, false) +
    '</div>';
  }

  function matrixRowHtml(k, i) {
    return '<tr class="' + (k.IsActive ? '' : 'mx-inactive') + '">' +
      '<td class="!px-1 !py-2 text-center tabular-nums text-text-muted">' + (i + 1) + '</td>' +
      '<td class="!px-2 !py-2 truncate font-bold text-text-secondary" title="' + esc(k.KPI_ID) + '">' + esc(k.KPI_ID) + '</td>' +
      '<td class="!px-2 !py-2 !whitespace-normal break-words leading-snug">' +
        '<span class="font-semibold text-text-primary">' + esc(k.KPI_Name) + '</span>' +
        (k.IsActive ? '' : ' <span class="pill pill-neutral !py-0 !px-1 !text-[9px] align-middle">Inactive</span>') +
        (k.Metrics ? '<span class="block mt-0.5 text-text-muted font-normal">' + esc(k.Metrics) + '</span>' : '') +
      '</td>' +
      '<td class="!px-1 !py-2 text-right tabular-nums whitespace-nowrap truncate">' + fitNum(k.Target) + '</td>' +
      '<td class="!pl-2 !pr-1 !py-2 truncate text-text-secondary" title="' + esc(k.Unit || '-') + '">' + esc(k.Unit || '-') + '</td>' +
      '<td class="!px-1 !py-2 text-right tabular-nums whitespace-nowrap font-semibold">' + pct(k.WeightPercent) + '</td>' +
      k.months.map(function (c, mi) {
        if (!c) return '<td class="!px-0.5 !py-2 text-center tabular-nums text-text-muted">-</td>';
        return '<td class="!px-0.5 !py-2 text-center tabular-nums whitespace-nowrap font-semibold ' + tierClass(c.score) + '"' +
          ' title="' + esc(MONTHS[mi] + ': tier score ' + num(c.score, 2) +
            (c.auto ? ', off-cycle, scored automatically' : c.realization !== null && c.realization !== undefined ? ', realization ' + c.realization : '')) + '">' +
          num(c.weighted, 2) + '%</td>';
      }).join('') +
    '</tr>';
  }

  function matrixHeadHtml(data) {
    var trial = data.trialMonths || [];
    var isTrial = function (i) { return trial.indexOf(i + 1) !== -1; };
    return '<thead><tr>' +
      '<th class="w-8 !px-1 !py-2 text-center">No</th>' +
      '<th class="w-[96px] !px-2 !py-2">KPI ID</th>' +
      '<th class="!px-2 !py-2">KPI Name</th>' +
      '<th class="w-[72px] !px-1 !py-2 text-right !tracking-normal">Target</th>' +
      '<th class="w-[64px] !pl-2 !pr-1 !py-2 !tracking-normal">Unit</th>' +
      '<th class="w-[60px] !px-1 !py-2 text-right !tracking-normal">Weight</th>' +
      MONTHS.map(function (m, i) {
        return '<th class="w-[60px] !px-0.5 !py-2 text-center !whitespace-normal !tracking-normal leading-tight"' +
          (isTrial(i) ? ' title="Trial month, excluded from KPI Months and Avg KPI Score"' : '') + '>' + esc(m.substring(0, 3)) +
          (isTrial(i) ? '<span class="block text-[9px] font-normal normal-case text-text-muted">Trial</span>' : '') + '</th>';
      }).join('') +
    '</tr></thead>';
  }

  function matrixFootHtml(role) {
    var avg = isNum(role.avgScore) ? Number(role.avgScore) : null;
    return '<tfoot><tr>' +
      '<td class="!px-1 !py-2"></td>' +
      '<td class="!px-2 !py-2"></td>' +
      '<td class="!px-2 !py-2">Sum KPI Score per Month</td>' +
      '<td class="!px-1 !py-2"></td>' +
      '<td class="!px-1 !py-2"></td>' +
      '<td class="!px-1 !py-2 text-right tabular-nums whitespace-nowrap">' + pct(role.totalWeight) + '</td>' +
      role.totals.map(function (v) {
        if (v === null || v === undefined) return '<td class="!px-0.5 !py-2 text-center text-text-muted">-</td>';
        return '<td class="!px-0.5 !py-2 text-center tabular-nums whitespace-nowrap"><span class="mx-sum ' + (avg !== null && Number(v) >= avg ? 'mx-up' : 'mx-down') + '"' +
          ' title="' + Number(v).toFixed(2) + '%' + (avg !== null ? (Number(v) >= avg ? ', at or above' : ', below') + ' the Avg KPI Score of ' + avg.toFixed(2) + '%' : '') + '">' + num(v, 2) + '%</span></td>';
      }).join('') +
    '</tr></tfoot>';
  }

  function matrixLegendHtml() {
    return '<div class="flex flex-wrap items-center gap-space-md mt-space-md text-label-xs text-text-secondary">' +
      '<span class="font-semibold">Cell = Weight × Tier Score</span>' +
      [['mx-t10', '1.0'], ['mx-t08', '0.8'], ['mx-t06', '0.6'], ['mx-t04', '0.4'], ['mx-t02', '0.2']].map(function (x) {
        return '<span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded ' + x[0] + '"></span>Tier ' + x[1] + '</span>';
      }).join('') +
      '<span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-status-success"></span>*Green: Monthly KPI Score ≥ Avg KPI Score</span>' +
    '</div>';
  }

  function matrixCardHtml(data, role, rowsHtml, foot, title, shadow) {
    return '<div class="rounded-xl border border-border-light overflow-hidden bg-surface-card' + (shadow ? ' shadow-level-1' : '') + '">' +
      '<div class="px-space-md py-space-sm bg-surface-page border-b border-border-light flex items-center justify-between gap-space-sm">' +
        '<h3 class="text-title-md text-text-primary">' + esc(title) + '</h3>' +
        '<span class="text-label-xs text-text-muted">' + role.kpis.length + ' KPIs' + (role.roleInactive ? ' • inactive role, scored KPIs only' : '') + '</span>' +
      '</div>' +
      '<div class="table-scroll">' +
        '<table class="data-table matrix-table w-full table-fixed text-[11px]">' +
          matrixHeadHtml(data) +
          '<tbody>' + rowsHtml + '</tbody>' +
          (foot ? matrixFootHtml(role) : '') +
        '</table>' +
      '</div>' +
    '</div>';
  }

  function matrixPanelHtml(data, role, modal) {
    return matrixCardHtml(data, role, role.kpis.map(matrixRowHtml).join(''), true, 'KPI Details', !modal) + matrixLegendHtml();
  }

  function deepDiveMonths(data) {
    var trial = data.trialMonths || [];
    var out = [];
    for (var i = 0; i < 12; i++) {
      if (trial.indexOf(i + 1) === -1) out.push(i);
    }
    return out;
  }

  function deepDiveIsOpen(role, k, i) {
    var key = role.roleKey + '|' + k.KPI_ID;
    return Object.prototype.hasOwnProperty.call(S.deepOpen, key) ? S.deepOpen[key] : i === 0;
  }

  function deepDiveState(data, k, i) {
    if (k.cycleMonths && k.cycleMonths.indexOf(i + 1) === -1) return 'off';
    return (data.monthStates || [])[i] === 'upcoming' ? 'upcoming' : 'due';
  }

  function isQuarterlyKpi(k) {
    return String((k && k.Duration) || '').toLowerCase() === 'quarterly';
  }

  function deepDiveKpiMonths(data, k) {
    return deepDiveMonths(data).filter(function (i) {
      var c = k.months ? k.months[i] : null;
      return !k.cycleMonths || k.cycleMonths.indexOf(i + 1) !== -1 || (!!c && !c.auto);
    });
  }

  function deepDiveStats(data, k) {
    var idx = deepDiveKpiMonths(data, k);
    var scores = [];
    idx.forEach(function (i) {
      var c = k.months[i];
      if (c && !c.auto && isNum(c.score)) scores.push(c.score);
    });
    var sum = scores.reduce(function (a, b) { return a + b; }, 0);
    return {
      months: idx.length,
      scored: scores.length,
      avg:    scores.length ? Math.round(sum / scores.length * 10000) / 100 : null
    };
  }

  function deepDiveGap(k, realization) {
    var target = Number(k.Target);
    if (!isNum(realization) || !isNum(target)) return null;
    return Math.round((k.Label === 'Decrease' ? target - realization : realization - target) * 100) / 100;
  }

  function deepDiveTarget(k) {
    var prefix = k.Label === 'Decrease' ? '≤ ' : k.Label === 'Increase' ? '≥ ' : '= ';
    return prefix + fmtKpiValue(k.Target, k.Unit || '');
  }

  function ddChip(label, value, raw) {
    return '<div class="report-chip">' +
      '<span class="text-label-xs uppercase tracking-wider text-text-muted">' + esc(label) + '</span>' +
      (raw ? '<span class="mt-0.5">' + value + '</span>'
           : '<span class="text-label-md font-semibold text-text-primary truncate">' + esc(value) + '</span>') +
    '</div>';
  }

  function deepDiveRibbonHtml(k) {
    var meta = labelMeta(k.Label);
    var direction = '<span class="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-label-sm font-semibold ' + meta.tone + '"' +
      ' title="' + esc(targetHint(k)) + '"><span class="material-symbols-outlined text-[16px]">' + meta.icon + '</span>' + esc(meta.short) + '</span>';
    var target = '<span class="flex items-center gap-1.5 min-w-0">' +
      '<span class="text-label-md font-semibold text-text-primary truncate">' + esc(deepDiveTarget(k)) + '</span>' +
      (k.Target_Is_B ? '<span class="pill pill-warning !py-0 !px-1.5 !text-[11px] shrink-0" title="Tier 1.0 only when the target is beaten. Hitting it exactly scores 0.8.">Strict</span>' : '') +
    '</span>';
    return '<div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-space-sm">' +
      ddChip('Direction', direction, true) +
      ddChip('Target', target, true) +
      ddChip('Tier Step', k.Label === 'Binary' ? 'Not used' : num(k.Multiplier, 2) + (k.Unit ? ' ' + k.Unit : '') + ' per tier') +
      ddChip('Duration', durationPill(k.Duration, true), true) +
      ddChip('Weight', pct(k.WeightPercent)) +
      ddChip('Unit', k.Unit || '-') +
    '</div>';
  }

  function compactShort(v) {
    try {
      return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(v);
    } catch (e) {
      return num(v, 0);
    }
  }

  function fitNum(v) {
    var n = Number(v);
    if (v === null || v === '' || !isNum(n)) return '-';
    if (Math.abs(n) < 1000000) return esc(num(n, 2));
    return '<span title="' + esc(num(n, 2)) + '">' + esc(compactShort(n)) + '</span>';
  }

  function fmtKpiValue(v, unit) {
    if (!isNum(Number(v)) || v === null || v === '') return '-';
    var n = Number(v);
    return (Math.abs(n) >= 1000000 ? compactShort(n) : num(n, 2)) + (unit ? ' ' + unit : '');
  }

  function meetsTarget(k, r) {
    var t = Number(k.Target);
    if (k.Label === 'Decrease') return r <= t;
    if (k.Label === 'Binary') return r === t;
    return r >= t;
  }

  function deepDiveInsights(data, k) {
    var better = k.Label === 'Decrease' ? -1 : 1;
    var points = deepDiveKpiMonths(data, k).map(function (i) {
      var c = k.months[i];
      return c && isNum(c.realization) ? { i: i, r: Number(c.realization), score: isNum(c.score) ? Number(c.score) : 0 } : null;
    }).filter(function (x) { return !!x; });
    if (!points.length) return null;

    var quality = function (a, b) {
      if (a.score !== b.score) return a.score - b.score;
      if (k.Label !== 'Binary' && a.r !== b.r) return (a.r - b.r) * better;
      return 0;
    };
    var best = points[0];
    var weakest = points[0];
    points.forEach(function (pt) {
      if (quality(pt, best) >= 0) best = pt;
      if (quality(pt, weakest) <= 0) weakest = pt;
    });
    if (quality(best, weakest) === 0) weakest = null;

    var last = points[points.length - 1];
    var prev = points.length > 1 ? points[points.length - 2] : null;
    var trend = null;
    if (prev) {
      var delta = k.Label === 'Binary'
        ? (meetsTarget(k, last.r) ? 1 : 0) - (meetsTarget(k, prev.r) ? 1 : 0)
        : (last.r - prev.r) * better;
      trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    }

    return {
      best: best,
      weakest: weakest,
      onTarget: points.filter(function (pt) { return meetsTarget(k, pt.r); }).length,
      total: points.length,
      last: last,
      prev: prev,
      trend: trend
    };
  }

  function deepDiveInsightsHtml(data, k) {
    var ins = deepDiveInsights(data, k);
    var unit = k.Unit || '';
    var card = function (accent, icon, iconTone, label, value, caption, title) {
      return '<div class="rounded-lg border border-border-light bg-white px-3 py-2.5 min-w-0 flex items-start gap-2.5 border-l-4 ' + accent + '"' +
        (title ? ' title="' + esc(title) + '"' : '') + '>' +
        '<span class="material-symbols-outlined text-[20px] mt-0.5 ' + iconTone + '">' + icon + '</span>' +
        '<div class="min-w-0">' +
          '<p class="text-label-xs uppercase tracking-wider text-text-muted">' + label + '</p>' +
          '<p class="text-title-md font-bold text-text-primary truncate">' + value + '</p>' +
          '<p class="text-[11px] text-text-muted truncate">' + caption + '</p>' +
        '</div>' +
      '</div>';
    };
    if (!ins) {
      return '<div class="rounded-lg border border-dashed border-border-medium bg-white px-3 py-2.5 text-body-sm text-text-muted">' +
        'No counted month has a realization yet, so there is nothing to compare.</div>';
    }
    var month = function (pt) { return MONTHS[pt.i].substring(0, 3); };
    var full = function (pt) { return month(pt) + ': ' + num(pt.r, 2) + (unit ? ' ' + unit : '') + ', tier ' + pt.score.toFixed(1); };
    var trendMeta = {
      up:   ['trending_up', 'text-status-success', 'Improving', 'border-l-emerald-400'],
      down: ['trending_down', 'text-status-danger', 'Declining', 'border-l-red-400'],
      flat: ['trending_flat', 'text-text-muted', 'Steady', 'border-l-slate-300']
    }[ins.trend || 'flat'];

    return '<div class="grid grid-cols-2 lg:grid-cols-4 gap-space-sm">' +
      card('border-l-emerald-400', 'emoji_events', 'text-status-success', 'Best month',
        esc(month(ins.best)) + ' <span class="font-semibold text-text-secondary">' + esc(fmtKpiValue(ins.best.r, unit)) + '</span>',
        'Tier ' + ins.best.score.toFixed(1) + ' • ' + (k.Label === 'Decrease' ? 'lowest value' : k.Label === 'Binary' ? 'target matched' : 'highest value'), full(ins.best)) +
      (ins.weakest
        ? card('border-l-red-400', 'south', 'text-status-danger', 'Weakest month',
            esc(month(ins.weakest)) + ' <span class="font-semibold text-text-secondary">' + esc(fmtKpiValue(ins.weakest.r, unit)) + '</span>',
            'Tier ' + ins.weakest.score.toFixed(1) + ' • the month to review first', full(ins.weakest))
        : card('border-l-slate-300', 'balance', 'text-text-muted', 'Weakest month', 'None', 'Every scored month performed the same', '')) +
      card(ins.onTarget === ins.total ? 'border-l-emerald-400' : 'border-l-amber-400', 'flag',
        ins.onTarget === ins.total ? 'text-status-success' : 'text-status-warning', 'On target',
        ins.onTarget + ' of ' + ins.total + (ins.total === 1 ? ' month' : ' months'),
        'Target ' + esc(deepDiveTarget(k)), '') +
      card(trendMeta[3], trendMeta[0], trendMeta[1], 'Latest trend',
        ins.prev ? trendMeta[2] : 'Not enough months',
        ins.prev ? esc(month(ins.prev) + ' ' + fmtKpiValue(ins.prev.r, unit) + ' to ' + month(ins.last) + ' ' + fmtKpiValue(ins.last.r, unit)) : 'Needs two scored months',
        ins.prev ? full(ins.prev) + ' to ' + full(ins.last) : '') +
    '</div>';
  }

  function barFlagPlugin(marks) {
    return {
      id: 'mgiBarFlags',
      afterDatasetsDraw: function (chart) {
        var bars = chart && chart.getDatasetMeta ? chart.getDatasetMeta(0) : null;
        if (!bars || !bars.data || !chart.ctx) return;
        var ctx = chart.ctx;
        var family = window.Chart && window.Chart.defaults ? window.Chart.defaults.font.family : 'sans-serif';
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        (marks.bars || []).forEach(function (f) {
          var bar = bars.data[f.index];
          if (!bar) return;
          ctx.font = (f.strong ? '700 11px ' : '600 10px ') + family;
          ctx.fillStyle = f.color;
          haloText(ctx, f.text, bar.x, bar.y - 4);
        });
        var points = chart.getDatasetMeta(2);
        if (points && points.data) {
          ctx.font = '700 10px ' + family;
          ctx.fillStyle = DD_INDEX_COLOR;
          (marks.index || []).forEach(function (f) {
            var pt = points.data[f.index];
            if (!pt || !isNum(pt.y)) return;
            haloText(ctx, f.text, pt.x, pt.y - 7);
          });
        }
        var y = chart.scales ? chart.scales.y : null;
        if (y && isNum(marks.target) && chart.chartArea) {
          var ty = y.getPixelForValue(marks.target);
          if (ty >= y.top && ty <= y.bottom) {
            ctx.font = '700 10px ' + family;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = DASH_COLORS.warning;
            haloText(ctx, 'Target', chart.chartArea.right + 6, ty - 6);
            haloText(ctx, marks.targetText, chart.chartArea.right + 6, ty + 6);
          }
        }
        ctx.restore();
      }
    };
  }

  function deepDiveLegendHtml(k) {
    var box = function (color) { return '<span class="w-2.5 h-2.5 rounded-sm" style="background:' + color + '"></span>'; };
    return '<span class="flex flex-wrap items-center gap-x-3 gap-y-1 text-label-xs text-text-muted">' +
      '<span class="inline-flex items-center gap-1">' + box(FLAG_COLORS.normal) + 'Realization</span>' +
      '<span class="inline-flex items-center gap-1">' + box(FLAG_COLORS.best) + 'Best month</span>' +
      '<span class="inline-flex items-center gap-1">' + box(FLAG_COLORS.weakest) + 'Weakest month</span>' +
      '<span class="inline-flex items-center gap-1"><span class="w-3 border-t-2 border-dashed" style="border-color:' + DASH_COLORS.warning + '"></span>Target</span>' +
      '<span class="inline-flex items-center gap-1"><span class="relative w-4 h-2.5 flex items-center"><span class="w-4 h-0.5 rounded-full" style="background:' + DD_INDEX_COLOR + '"></span>' +
        '<span class="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white border-2" style="border-color:' + DD_INDEX_COLOR + '"></span></span>' +
        'Index Score, lower lane (max ' + pct(k.WeightPercent) + ')</span>' +
    '</span>';
  }

  function deepDiveLadderHtml(k) {
    var steps = tierLadder(k);
    var unit = k.Unit ? ' ' + k.Unit : '';
    return '<div class="rounded-lg border border-border-light bg-surface-card px-space-md py-space-sm">' +
      '<div class="flex flex-wrap items-center justify-between gap-2 mb-2">' +
        '<h4 class="text-title-md text-text-primary">How this KPI is scored</h4>' +
        '<span class="text-label-xs text-text-muted">Each month the realization lands in one tier. Index Score = Weight x Tier.</span>' +
      '</div>' +
      '<div class="grid gap-1.5 ' + (steps.length > 2 ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2') + '">' +
        steps.map(function (st) {
          return '<div class="rounded-md px-2.5 py-1.5 min-w-0 ' + tierClass(st.score) + '" title="Tier ' + st.score.toFixed(1) + ' when realization is ' + esc(st.rule + unit) + '">' +
            '<p class="text-[11px] font-bold">Tier ' + st.score.toFixed(1) + ' • ' + num(st.score * (Number(k.WeightPercent) || 0), 2) + '%</p>' +
            '<p class="text-label-sm font-semibold tabular-nums truncate">' + esc(st.rule) + '</p>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  function deepDiveChartConfig(data, k) {
    var idx = deepDiveKpiMonths(data, k);
    var target = isNum(Number(k.Target)) ? Number(k.Target) : null;
    var unitText = k.Unit ? ' ' + k.Unit : '';
    var unit = k.Unit ? ' (' + k.Unit + ')' : '';
    var weight = isNum(Number(k.WeightPercent)) && Number(k.WeightPercent) > 0 ? Number(k.WeightPercent) : 100;
    var cell = function (i) { var c = k.months[i]; return c && !c.auto ? c : null; };
    var ins = deepDiveInsights(data, k);
    var flagOf = function (i) {
      if (ins && ins.best && ins.best.i === i) return 'best';
      if (ins && ins.weakest && ins.weakest.i === i) return 'weakest';
      return 'normal';
    };
    var marks = { bars: [], index: [], target: target, targetText: target === null ? '' : fmtKpiValue(target) };
    idx.forEach(function (i, n) {
      var c = cell(i);
      if (c && isNum(c.realization)) {
        var f = flagOf(i);
        var value = fmtKpiValue(c.realization);
        marks.bars.push(f === 'best' ? { index: n, text: 'Best • ' + value, color: FLAG_COLORS.best, strong: true }
          : f === 'weakest' ? { index: n, text: 'Weakest • ' + value, color: FLAG_COLORS.weakest, strong: true }
          : { index: n, text: value, color: '#475569', strong: false });
      }
      if (c && isNum(c.weighted)) marks.index.push({ index: n, text: num(c.weighted, 2) + '%' });
    });

    return {
      type: 'bar',
      data: {
        labels: idx.map(function (i) { return MONTHS[i].substring(0, 3); }),
        datasets: [
          {
            type: 'bar',
            label: 'Realization' + unit,
            data: idx.map(function (i) { var c = cell(i); return c && isNum(c.realization) ? c.realization : null; }),
            yAxisID: 'y',
            backgroundColor: idx.map(function (i) { return FLAG_COLORS[flagOf(i)]; }),
            hoverBackgroundColor: idx.map(function (i) { var f = flagOf(i); return f === 'normal' ? FLAG_COLORS.hover : FLAG_COLORS[f]; }),
            borderRadius: 6,
            borderSkipped: false,
            minBarLength: 4,
            maxBarThickness: 34,
            order: 3
          },
          {
            type: 'line',
            label: 'Target',
            data: idx.map(function () { return target; }),
            yAxisID: 'y',
            borderColor: DASH_COLORS.warning,
            borderDash: [6, 6],
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            order: 2
          },
          {
            type: 'line',
            label: 'Index Score',
            data: idx.map(function (i) { var c = cell(i); return c && isNum(c.weighted) ? c.weighted : null; }),
            yAxisID: 'y1',
            borderColor: DD_INDEX_COLOR,
            backgroundColor: 'rgba(79,70,229,0.12)',
            pointBackgroundColor: '#FFFFFF',
            pointBorderColor: DD_INDEX_COLOR,
            pointBorderWidth: 2,
            borderWidth: 2.5,
            tension: 0.3,
            spanGaps: false,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: 'origin',
            clip: false,
            order: 1
          }
        ]
      },
      options: dashOptions({
        layout: { padding: { top: 18, right: 52 } },
        scales: {
          x: { grid: { display: false } },
          y1: {
            stack: 'dd',
            stackWeight: 1,
            offset: true,
            min: 0,
            max: Math.round(weight * 1.45 * 100) / 100,
            position: 'left',
            grid: { color: DASH_COLORS.grid },
            title: { display: true, text: 'Index %', color: DD_INDEX_COLOR },
            afterBuildTicks: function (axis) { axis.ticks = [{ value: 0 }, { value: weight }]; },
            ticks: { color: DD_INDEX_COLOR, callback: function (v) { return num(v, 2) + '%'; } }
          },
          y: {
            stack: 'dd',
            stackWeight: 3,
            beginAtZero: true,
            grace: '14%',
            position: 'left',
            grid: { color: DASH_COLORS.grid },
            ticks: { callback: function (v) { return fmtKpiValue(v); } },
            title: { display: true, text: 'Realization' + unit, color: DASH_COLORS.muted }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                if (!isNum(ctx.parsed.y)) return '';
                var c = cell(idx[ctx.dataIndex]);
                if (ctx.datasetIndex === 1) return ' Target: ' + fmtKpiValue(ctx.parsed.y, k.Unit || '');
                if (ctx.datasetIndex === 2) {
                  return ' Index Score: ' + num(ctx.parsed.y, 2) + '%' + (c && isNum(c.score) ? ' (Tier ' + Number(c.score).toFixed(1) + ')' : '');
                }
                var f = flagOf(idx[ctx.dataIndex]);
                return ' Realization: ' + num(ctx.parsed.y, 2) + unitText +
                  (f === 'best' ? ' • Best month' : f === 'weakest' ? ' • Weakest month' : '');
              }
            }
          }
        }
      }),
      plugins: [barFlagPlugin(marks)]
    };
  }

  function deepDiveTableHtml(data, k) {
    var target = isNum(Number(k.Target)) ? Number(k.Target) : null;
    var ins = deepDiveInsights(data, k);
    var badge = function (i) {
      if (ins && ins.best && ins.best.i === i) {
        return '<span class="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-1.5 text-[9px] font-bold uppercase text-emerald-700">Best</span>';
      }
      if (ins && ins.weakest && ins.weakest.i === i) {
        return '<span class="inline-flex rounded-full border border-red-200 bg-red-50 px-1.5 text-[9px] font-bold uppercase text-red-700">Weakest</span>';
      }
      return '';
    };

    var autoTip = 'Off-cycle quarter month, scored 1.0 automatically after the role was submitted';
    var rows = deepDiveMonths(data).map(function (i) {
      var c = k.months[i];
      var state = deepDiveState(data, k, i);
      var auto = !!c && !!c.auto;
      var offTarget = state === 'off' && !(c && isNum(c.realization));
      var blank = state === 'due' ? '<span class="text-text-muted">-</span>'
        : '<span class="inline-flex rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-[11px] font-semibold">' +
          (state === 'off' ? 'Off-cycle' : state === 'upcoming' ? 'Upcoming' : '-') + '</span>';
      var dash = '<span class="text-text-muted">-</span>';
      var hasReal = !!c && isNum(c.realization);
      var gap = hasReal ? deepDiveGap(k, c.realization) : null;
      var gapCell = !hasReal ? dash
        : k.Label === 'Binary'
          ? '<span class="font-semibold ' + (Number(c.realization) === target ? 'text-status-success-text' : 'text-status-danger-text') + '">' +
            (Number(c.realization) === target ? 'Met' : 'Missed') + '</span>'
          : !isNum(gap) ? dash
            : '<span class="font-semibold ' + (gap >= 0 ? 'text-status-success-text' : 'text-status-danger-text') + '" title="' + esc((gap > 0 ? '+' : '') + num(gap, 2)) + '">' +
              (gap > 0 ? '+' : '') + esc(fmtKpiValue(gap)) + '</span>';

      return '<tr' + (state === 'due' ? '' : ' class="bg-surface-page"') + '>' +
        '<td class="!px-2 !py-2 font-semibold text-text-primary"><span class="flex items-center justify-between gap-1.5 whitespace-nowrap">' +
          '<span>' + esc(MONTHS[i].substring(0, 3)) + '</span>' + badge(i) + '</span></td>' +
        '<td class="!px-2 !py-2 text-right tabular-nums text-text-secondary truncate">' + (target === null || offTarget ? dash : fitNum(target)) + '</td>' +
        '<td class="!px-2 !py-2 text-right tabular-nums font-semibold text-text-primary truncate">' + (hasReal ? fitNum(c.realization) : blank) + '</td>' +
        '<td class="!px-2 !py-2 text-right tabular-nums">' + gapCell + '</td>' +
        '<td class="!px-2 !py-2 text-center">' + (auto
          ? '<span class="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-slate-500 whitespace-nowrap" title="' + esc(autoTip) + '">Auto ' +
            Number(c.score).toFixed(1) + '</span>'
          : c && isNum(c.score) ? tierChip(c.score) : dash) + '</td>' +
        '<td class="!px-2 !py-2 text-right tabular-nums ' + (auto ? 'text-text-muted' : 'font-semibold') + '"' + (auto ? ' title="' + esc(autoTip) + '"' : '') + '>' +
          (c && isNum(c.weighted) ? esc(num(c.weighted, 2)) + '%' : dash) + '</td>' +
      '</tr>';
    }).join('');

    return '<div class="rounded-lg border border-border-light bg-surface-card flex flex-col min-w-0 overflow-hidden">' +
      '<div class="flex flex-wrap items-center justify-between gap-space-sm px-space-md py-space-sm border-b border-border-light">' +
        '<h4 class="text-title-md text-text-primary">Monthly Detail</h4>' +
        '<span class="text-label-xs text-text-muted">' + (isQuarterlyKpi(k)
          ? 'Off-cycle months count as tier 1.0 once the role is submitted'
          : 'January is a trial month and stays out of scoring') + '</span>' +
      '</div>' +
      '<div class="flex-1">' +
        '<table class="data-table w-full table-fixed text-[11px]">' +
          '<thead><tr>' +
            '<th class="w-[124px] !px-2 !py-2">Month</th>' +
            '<th class="!px-2 !py-2 text-right !tracking-normal">Target</th>' +
            '<th class="!px-2 !py-2 text-right !tracking-normal">Realization</th>' +
            '<th class="!px-2 !py-2 text-right !tracking-normal">Gap to Target</th>' +
            '<th class="w-[56px] !px-2 !py-2 text-center !tracking-normal">Tier</th>' +
            '<th class="!px-2 !py-2 text-right !tracking-normal">Index Score</th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>' +
    '</div>';
  }

  function deepDiveHeadInfoHtml(k, st) {
    var b = isNum(st.avg) ? band(st.avg) : null;
    return '<div class="flex flex-col gap-1 min-w-0 flex-1">' +
        '<div class="flex items-center gap-space-xs flex-wrap">' +
          '<span class="text-code-num px-2 py-0.5 bg-surface-container-high rounded text-text-primary font-bold">' + esc(k.KPI_ID) + '</span>' +
          '<span class="text-title-md text-text-primary">' + esc(k.KPI_Name) + '</span>' +
          (k.IsActive ? '' : '<span class="pill pill-neutral !py-0 !text-[11px]">Inactive</span>') +
        '</div>' +
        (k.Metrics ? '<span class="text-label-xs text-text-muted">' + esc(k.Metrics) + '</span>' : '') +
      '</div>' +
      '<span class="flex items-center justify-end gap-space-xs flex-wrap shrink-0">' +
        '<span class="text-label-xs text-text-muted">' + st.scored + ' of ' + st.months + (isQuarterlyKpi(k) ? ' quarter months' : ' months') + ' scored</span>' +
        '<span class="pill pill-neutral !text-[11px]">Weight ' + pct(k.WeightPercent) + '</span>' +
        (b ? '<span class="pill pill-' + b.key + ' !text-[11px]">YTD ' + st.avg.toFixed(2) + '% • ' + esc(b.label) + '</span>'
           : '<span class="pill pill-neutral !text-[11px]">Not scored yet</span>') +
      '</span>';
  }

  function deepDiveBodyHtml(data, k, boxId) {
    return deepDiveRibbonHtml(k) +
      deepDiveLadderHtml(k) +
      deepDiveInsightsHtml(data, k) +
      '<div class="grid grid-cols-1 xl:grid-cols-2 gap-space-md">' +
        '<div class="rounded-lg border border-border-light bg-surface-card p-space-md flex flex-col min-w-0">' +
          '<div class="flex flex-wrap items-center justify-between gap-space-sm mb-space-sm">' +
            '<h4 class="text-title-md text-text-primary">Trend Analysis</h4>' +
            deepDiveLegendHtml(k) +
          '</div>' +
          '<div id="' + boxId + '-box" class="relative flex-1 min-h-[360px]"><canvas id="' + boxId + '-chart"></canvas></div>' +
        '</div>' +
        deepDiveTableHtml(data, k) +
      '</div>';
  }

  function deepDiveCardHtml(data, role, k, i, prefix) {
    var open = deepDiveIsOpen(role, k, i);
    var head =
      '<div class="role-group-head !p-4" onclick="MGI.toggleDeepDive(' + i + ')"' +
        ' title="Click to ' + (open ? 'collapse' : 'expand') + ' this KPI">' +
        '<span class="material-symbols-outlined text-[20px] text-text-secondary">' + (open ? 'expand_less' : 'expand_more') + '</span>' +
        deepDiveHeadInfoHtml(k, deepDiveStats(data, k)) +
      '</div>';
    var body = '<div class="role-group-body !gap-space-md">' + deepDiveBodyHtml(data, k, prefix + '-' + i) + '</div>';
    return '<section class="role-group shadow-level-1 shrink-0 !mt-0' + (open ? '' : ' is-collapsed') + '">' + head + body + '</section>';
  }

  function deepDivePanelHtml(data, role, surface) {
    if (!role.kpis.length) {
      return '<div class="bg-surface-card rounded-xl border border-dashed border-border-medium p-space-xl text-center">' +
        '<span class="material-symbols-outlined text-[40px] text-text-muted">query_stats</span>' +
        '<p class="text-body-md text-text-secondary mt-2">No KPIs to analyse for this role.</p>' +
      '</div>';
    }

    var prefix = deepDivePrefix(surface);

    return '<div class="flex items-center gap-2 rounded-lg bg-blue-50/50 px-4 py-3 text-sm text-blue-700 mb-space-md">' +
        '<span class="material-symbols-outlined text-[20px] shrink-0">insights</span>' +
        '<span>Every KPI of <strong>' + esc(role.roleLabel) + '</strong> across ' + deepDiveMonths(data).length +
          ' counted months. January is a trial month and stays out of the analysis.</span>' +
      '</div>' +
      '<div class="flex flex-col gap-space-md">' +
        role.kpis.map(function (k, i) { return deepDiveCardHtml(data, role, k, i, prefix); }).join('') +
      '</div>';
  }

  function deepDivePrefix(surface) {
    return surface === 'inline' ? 'ddi' : 'ddm';
  }

  function destroyDeepDiveCharts(prefix) {
    Object.keys(S.charts).forEach(function (key) {
      if (key.indexOf(prefix + '-') !== 0) return;
      S.charts[key].destroy();
      delete S.charts[key];
    });
  }

  function renderDeepDiveCharts(data, role) {
    var prefix = deepDivePrefix(S.report ? S.report.surface : 'modal');
    destroyDeepDiveCharts(prefix);
    if (!role || !role.kpis || S.reportTab !== 'analytics') return;
    role.kpis.forEach(function (k, i) {
      if (!deepDiveIsOpen(role, k, i)) return;
      dashChart(prefix + '-' + i, deepDiveChartConfig(data, k));
    });
  }

  function pdfCopy(o) {
    var out = {};
    Object.keys(o || {}).forEach(function (key) { out[key] = o[key]; });
    return out;
  }

  function pdfSafeData(data, role) {
    var ev = role.evaluation ? pdfCopy(role.evaluation) : null;
    var updatedAt = ev ? ev.updatedAt || '' : '';
    if (ev) {
      delete ev.updatedBy;
      delete ev.updatedAt;
    }
    var safeRole = pdfCopy(role);
    safeRole.evaluation = ev;
    var safe = pdfCopy(data);
    safe.roles = [safeRole];
    safe.performance = data.performance ? pdfCopy(data.performance) : null;
    if (safe.performance) safe.performance.adminView = false;
    return {
      data: safe,
      role: safeRole,
      updatedAt: updatedAt,
      adminView: !!(data.performance && data.performance.adminView)
    };
  }

  function pdfSlug(text) {
    return String(text === null || text === undefined ? '' : text).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  function pdfFileName(data, role, when) {
    var emp = data.employee || {};
    var parts = ['Annual_Performance_FY' + data.year, pdfSlug(emp.NIK), pdfSlug(emp.Full_Name)];
    if ((data.roles || []).length > 1 && role) parts.push(pdfSlug(role.Position));
    parts.push(fileStamp(when));
    return parts.filter(function (p) { return !!p; }).join('_') + '.pdf';
  }

  function pdfHead(ctx) {
    if (ctx.head) return ctx.head;
    var emp = ctx.data.employee || {};
    return {
      title: 'Annual Performance Report',
      line: 'FY' + esc(ctx.data.year) + (ctx.data.theme ? ' • ' + esc(ctx.data.theme) : '') + ' • PT Macme Global Indonesia',
      right: emp.Full_Name || '-',
      rightLine: 'NIK ' + (emp.NIK || '-') + ' • ' + ctx.role.roleLabel,
      badge: ''
    };
  }

  function pdfSheetHtml(ctx, body) {
    var h = pdfHead(ctx);
    var title = '<p class="text-[16px] font-bold text-slate-900 leading-tight">' + esc(h.title) + '</p>';
    return '<div class="pdf-sheet">' +
      '<div class="pdf-head">' +
        '<div class="flex items-center gap-3 min-w-0">' +
          '<img src="' + MGI_LOGO_B64 + '" alt="MGI" class="h-10 w-auto">' +
          '<div class="min-w-0">' +
            (h.badge ? '<div class="flex items-center gap-2">' + title + h.badge + '</div>' : title) +
            '<p class="text-[11px] text-text-muted">' + h.line + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="text-right min-w-0">' +
          '<p class="text-[14px] font-bold text-slate-900 truncate">' + esc(h.right) + '</p>' +
          '<p class="text-[11px] text-text-muted truncate">' + esc(h.rightLine) + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="pdf-body"><div class="pdf-fit">' + body + '</div></div>' +
      '<div class="pdf-foot">' +
        '<span class="flex-1 min-w-0">Generated on ' + esc(ctx.stamp) + (ctx.by ? ' by ' + esc(ctx.by) : '') + ' • Confidential</span>' +
        '<span class="shrink-0 text-center">MGI KPI Portal • Supported by IT Department</span>' +
        '<span data-pdf-page class="flex-1 min-w-0 text-right font-semibold text-text-secondary">Page 1 of 1</span>' +
      '</div>' +
    '</div>';
  }

  function pdfCoverHtml(ctx) {
    var emp = ctx.data.employee || {};
    var role = ctx.role;
    var rules = ctx.data.performance ? ctx.data.performance.rules : null;
    var released = !!(rules && rules.released);
    var item = function (icon, label, value) {
      return '<span class="inline-flex items-center gap-1.5 whitespace-nowrap">' +
        '<span class="material-symbols-outlined text-[16px] text-text-muted">' + icon + '</span>' +
        '<span class="text-text-muted">' + esc(label) + '</span>' +
        '<strong class="font-semibold text-text-primary">' + esc(value) + '</strong></span>';
    };
    return '<div class="min-w-0 mb-space-sm">' +
        '<h2 class="text-headline-md font-bold text-slate-900 tracking-tight">' + esc(role.roleLabel) + '</h2>' +
        '<p class="text-sm text-slate-500 mt-0.5">Performance evaluation report • FY' + esc(ctx.data.year) + '</p>' +
        reportThemeLine(ctx.data) +
      '</div>' +
      '<div class="grid grid-cols-4 gap-space-sm">' +
        reportChipHtml('Full Name', emp.Full_Name) +
        reportChipHtml('NIK', emp.NIK) +
        reportChipHtml('Position', role.Position) +
        reportChipHtml('Department', role.Department) +
      '</div>' +
      '<div class="mt-space-sm flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border border-border-light bg-surface-page px-3 py-2 text-[12px]">' +
        item('schedule', 'Generated on', ctx.stamp + (ctx.by ? ' by ' + ctx.by : '')) +
        item(released ? 'verified' : 'pending', 'Results',
          released ? 'Released on ' + fmtDate(rules.releasedAt) : ctx.adminView ? 'Draft, not released' : 'Not released yet') +
        (ctx.adminView && ctx.updatedAt ? item('edit_calendar', 'Scores last updated', fmtStamp(new Date(ctx.updatedAt))) : '') +
      '</div>' +
      '<div class="mt-space-md">' + executiveSummaryHtml(ctx.data, role, true, summaryNote(ctx.data)) + '</div>';
  }

  function pdfMatrixHtml(ctx, rows, start, last) {
    var body = rows.map(function (k, n) { return matrixRowHtml(k, start + n); }).join('');
    return matrixCardHtml(ctx.data, ctx.role, body, last, start > 0 ? 'KPI Details (continued)' : 'KPI Details', false) +
      (last ? matrixLegendHtml() : '');
  }

  function pdfDeepDiveHtml(ctx, k, i) {
    return '<div class="flex items-center justify-between gap-space-sm mb-2">' +
        '<p class="text-label-xs uppercase tracking-wider font-semibold text-text-secondary">Deep-Dive Analytics</p>' +
        '<p class="text-label-xs text-text-muted">KPI ' + (i + 1) + ' of ' + ctx.role.kpis.length + '</p>' +
      '</div>' +
      '<section class="role-group shrink-0">' +
        '<div class="role-group-head !p-4 !cursor-default">' + deepDiveHeadInfoHtml(k, deepDiveStats(ctx.data, k)) + '</div>' +
        '<div class="role-group-body !gap-space-md">' + deepDiveBodyHtml(ctx.data, k, 'pdf-dd-' + i) + '</div>' +
      '</section>';
  }

  function pdfChunkRows(heights, firstRoom, nextRoom, tail) {
    var total = heights.reduce(function (a, h) { return a + h; }, 0) + tail;
    if (heights.length && total > firstRoom && total <= nextRoom) return [0, heights.length];
    var chunks = [];
    var room = firstRoom;
    var used = 0;
    var count = 0;
    heights.forEach(function (h) {
      if (used + h > room && (count > 0 || !chunks.length)) {
        chunks.push(count);
        room = nextRoom;
        used = 0;
        count = 0;
      }
      used += h;
      count++;
    });
    var limit = chunks.length ? count - 1 : count;
    var moved = 0;
    while (moved < limit && used + tail > room) {
      moved++;
      used -= heights[heights.length - moved];
    }
    chunks.push(count - moved);
    if (moved) chunks.push(moved);
    return chunks;
  }

  function pdfSheet(stage, ctx, body) {
    var holder = document.createElement('div');
    holder.innerHTML = pdfSheetHtml(ctx, body);
    var sheet = holder.firstChild;
    stage.appendChild(sheet);
    return sheet;
  }

  function pdfMeasure(probe) {
    var body = probe.querySelector('.pdf-body');
    var wrap = probe.querySelector('[data-pdf-matrix]');
    var rows = wrap ? Array.prototype.slice.call(wrap.querySelectorAll('tbody tr')) : [];
    var room = body ? body.clientHeight : 0;
    var rect = function (el) { return el.getBoundingClientRect(); };
    if (!rows.length) return { heights: [], firstRoom: room, nextRoom: room, tail: 0 };
    return {
      heights: rows.map(function (r) { return rect(r).height; }),
      firstRoom: room - (rect(rows[0]).top - rect(body).top) - 4,
      nextRoom: room - (rect(rows[0]).top - rect(wrap).top) - 4,
      tail: rect(wrap).bottom - rect(rows[rows.length - 1]).bottom
    };
  }

  function pdfBuildSheets(stage, ctx, layout) {
    var kpis = ctx.role.kpis || [];
    var chunks = pdfChunkRows(layout.heights, layout.firstRoom, layout.nextRoom, layout.tail);
    var sheets = [];
    var start = 0;
    chunks.forEach(function (count, n) {
      var last = n === chunks.length - 1;
      var part = count || last ? pdfMatrixHtml(ctx, kpis.slice(start, start + count), start, last) : '';
      sheets.push(pdfSheet(stage, ctx, n === 0
        ? pdfCoverHtml(ctx) + (part ? '<div class="mt-space-md">' + part + '</div>' : '')
        : part));
      start += count;
    });
    kpis.forEach(function (k, i) { sheets.push(pdfSheet(stage, ctx, pdfDeepDiveHtml(ctx, k, i))); });
    return sheets;
  }

  function pdfFitBody(sheet) {
    var body = sheet.querySelector('.pdf-body');
    var fit = sheet.querySelector('.pdf-fit');
    var room = body ? body.clientHeight : 0;
    if (!room || !fit || fit.scrollHeight <= room) return 1;
    var scale = 1;
    for (var n = 0; n < 3; n++) {
      var next = Math.max(0.6, Math.min(1, room / fit.scrollHeight));
      if (Math.abs(next - scale) < 0.005) break;
      scale = next;
      fit.style.width = (100 / scale) + '%';
    }
    scale = Math.max(0.6, Math.min(scale, room / fit.scrollHeight));
    fit.style.transformOrigin = 'top left';
    fit.style.transform = 'scale(' + scale + ')';
    return scale;
  }

  function pdfFinishSheets(sheets) {
    sheets.forEach(function (sheet, n) {
      pdfFitBody(sheet);
      var label = sheet.querySelector('[data-pdf-page]');
      if (label) label.textContent = 'Page ' + (n + 1) + ' of ' + sheets.length;
    });
  }

  function pdfDrawCharts(ctx) {
    if (!window.Chart) return [];
    ensureChartTheme();
    return (ctx.role.kpis || []).map(function (k, i) {
      var canvas = $('pdf-dd-' + i + '-chart');
      if (!canvas) return null;
      var cfg = deepDiveChartConfig(ctx.data, k);
      cfg.options.animation = false;
      cfg.options.devicePixelRatio = 2;
      return new window.Chart(canvas, cfg);
    }).filter(function (c) { return !!c; });
  }

  function pdfSettle() {
    return new Promise(function (resolve) { setTimeout(resolve, 120); }).then(function () {
      return document.fonts && document.fonts.ready ? document.fonts.ready : null;
    });
  }

  function pdfBusy(text, done, total) {
    var host = $('pdf-busy');
    if (text === null) {
      if (host) host.remove();
      return;
    }
    if (!host) {
      host = document.createElement('div');
      host.id = 'pdf-busy';
      document.body.appendChild(host);
    }
    var width = total ? Math.round(done / total * 100) : 4;
    host.innerHTML = '<div class="pdf-busy-card" role="status" aria-live="polite">' +
      '<span class="spinner spinner-dark shrink-0"></span>' +
      '<div class="min-w-0 flex-1">' +
        '<p class="text-body-md font-semibold text-text-primary">Preparing your PDF</p>' +
        '<p class="text-label-xs text-text-muted">' + esc(text) + '</p>' +
        '<div class="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">' +
          '<div class="h-full rounded-full bg-brand-maroon-dark" style="width:' + width + '%"></div></div>' +
      '</div>' +
    '</div>';
  }

  function pdfRender(libs, sheets, ctx, fileName) {
    var doc = new libs.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
    var emp = ctx.meta ? {} : ctx.data.employee || {};
    var meta = ctx.meta || {
      title: 'Annual Performance Report FY' + ctx.data.year + ' • ' + (emp.Full_Name || emp.NIK || ''),
      subject: ctx.role.roleLabel + ', generated on ' + ctx.stamp,
      keywords: 'KPI, performance, FY' + ctx.data.year
    };
    doc.setProperties({
      title: meta.title,
      subject: meta.subject,
      author: 'MGI KPI Portal',
      creator: 'MGI KPI Portal',
      keywords: meta.keywords
    });
    var chain = Promise.resolve();
    sheets.forEach(function (sheet, n) {
      chain = chain.then(function () {
        pdfBusy('Page ' + (n + 1) + ' of ' + sheets.length, n, sheets.length);
        return libs.html2canvas(sheet, {
          scale: 2,
          backgroundColor: '#FFFFFF',
          logging: false,
          useCORS: true,
          onclone: function (clone) {
            var st = clone.getElementById('pdf-stage');
            if (st) st.style.left = '0px';
          }
        });
      }).then(function (canvas) {
        if (n > 0) doc.addPage('a4', 'landscape');
        doc.addImage(canvas.toDataURL('image/jpeg', ctx.quality || 0.92), 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
      });
    });
    return chain
      .then(function () {
        pdfBusy('Saving ' + fileName, sheets.length, sheets.length);
        doc.save(fileName);
      })
      .catch(function () {
        throw new Error('The PDF could not be prepared. Try again.');
      });
  }

  function downloadPerformancePdf() {
    var t = S.report;
    if (!t || S.pdfBusy) return;
    S.pdfBusy = true;
    var when = new Date();
    var stage = null;
    var charts = [];
    pdfBusy('Loading the latest scores', 0, 0);

    Promise.all([
      api('getPerformanceReport', t.nik, t.year),
      loadPdfLibs().catch(function () {
        throw new Error('The PDF tools could not be loaded. Check your connection and try again.');
      })
    ])
      .then(function (res) {
        var data = res[0];
        S.reports[t.nik + '|' + t.year] = data;
        var role = (data.roles || []).filter(function (r) { return r.roleKey === t.roleKey; })[0];
        if (!role) throw new Error('This role is no longer in the report. Reopen the report and try again.');
        var safe = pdfSafeData(data, role);
        var ctx = {
          data: safe.data,
          role: safe.role,
          updatedAt: safe.updatedAt,
          adminView: safe.adminView,
          stamp: fmtStamp(when),
          by: S.user ? S.user.Full_Name : ''
        };
        stage = document.createElement('div');
        stage.id = 'pdf-stage';
        stage.className = 'pdf-stage';
        document.body.appendChild(stage);
        var probe = pdfSheet(stage, ctx, pdfCoverHtml(ctx) +
          '<div class="mt-space-md" data-pdf-matrix>' + pdfMatrixHtml(ctx, ctx.role.kpis || [], 0, true) + '</div>');
        pdfBusy('Laying out the pages', 0, 0);
        return pdfSettle()
          .then(function () {
            var layout = pdfMeasure(probe);
            probe.remove();
            var sheets = pdfBuildSheets(stage, ctx, layout);
            return pdfSettle().then(function () {
              pdfFinishSheets(sheets);
              charts = pdfDrawCharts(ctx);
              return pdfRender(res[1], sheets, ctx, pdfFileName(data, role, when));
            });
          })
          .then(function () { toast('PDF downloaded.', 'success'); });
      })
      .catch(function (err) {
        toast(err && err.message ? err.message : 'The PDF could not be prepared. Try again.', 'error');
      })
      .then(function () {
        charts.forEach(function (c) { c.destroy(); });
        if (stage) stage.remove();
        pdfBusy(null);
        S.pdfBusy = false;
      });
  }

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

  function rptContext(md, opts) {
    var annual = md.kind === 'annual';
    var title = annual ? 'Performance Evaluation Report' : 'Monthly KPI Report';
    var when = annual ? 'FY' + md.year : md.monthName;
    var pill = function (tone, text) { return '<span class="pill ' + tone + ' !py-0.5 !px-2 !text-[11px]">' + text + '</span>'; };
    return {
      head: {
        title: title,
        line: esc((annual ? '' : md.monthName + ' • ') + 'FY' + md.year + (md.theme ? ' • ' + md.theme : '') + ' • PT Macme Global Indonesia'),
        right: md.scopeLabel,
        rightLine: annual
          ? (md.released ? 'Released to employees on ' + fmtDate(md.rules.releasedAt) : 'Not released to employees yet')
          : rptPeriodText(md.periodState),
        badge: annual && !md.released ? pill('pill-warning', 'Draft, not released') : !annual && md.trial ? pill('pill-neutral', 'Trial month') : ''
      },
      meta: {
        title: title + ' ' + when + ' • ' + md.scopeLabel,
        subject: md.scopeLabel + ', generated on ' + fmtStamp(opts.when),
        keywords: 'KPI, report, FY' + md.year
      },
      stamp: fmtStamp(opts.when),
      by: opts.by,
      quality: 0.8
    };
  }

  function rptFileName(md, opts) {
    var base = md.kind === 'annual'
      ? 'FY' + md.year + '_Performance_Evaluation_Report'
      : md.year + '_' + (md.month < 10 ? '0' : '') + md.month + '_Monthly_KPI_Report';
    return base + '_' + pdfSlug(md.scopeLabel) + '_' + fileStamp(opts.when) + '.pdf';
  }

  function rptHead(title, sub, cont) {
    return '<div data-pdf-shead class="mb-3">' +
      '<h2 class="text-headline-md font-bold text-slate-900 tracking-tight">' + esc(title) + (cont ? ' (continued)' : '') + '</h2>' +
      (sub ? '<p class="text-sm text-slate-500 mt-0.5">' + sub + '</p>' : '') +
    '</div>';
  }

  function rptSub(title, sub) {
    return '<h3 class="text-title-md font-semibold text-text-primary">' + esc(title) + '</h3>' +
      (sub ? '<p class="text-body-sm text-text-muted mt-0.5 mb-3">' + sub + '</p>' : '<div class="mb-3"></div>');
  }

  function rptCard(title, sub, body, cls) {
    return '<section class="rounded-xl border border-border-light bg-white p-5 min-w-0' + (cls ? ' ' + cls : '') + '">' +
      '<h3 class="text-title-md font-semibold text-text-primary">' + esc(title) + '</h3>' +
      (sub ? '<p class="text-body-sm text-text-muted mt-0.5">' + sub + '</p>' : '') +
      '<div class="mt-3">' + body + '</div>' +
    '</section>';
  }

  function rptChartBox(id, height) {
    return '<div class="relative" style="height:' + height + 'px"><canvas id="' + id + '"></canvas></div>';
  }

  function rptCols(widths) {
    return '<colgroup>' + widths.map(function (w) { return w ? '<col style="width:' + w + 'px">' : '<col>'; }).join('') + '</colgroup>';
  }

  function rptTableHtml(b, rowsHtml) {
    return '<div class="rounded-xl border border-border-light overflow-hidden bg-white">' +
      '<table class="data-table rpt-table' + (b.cols ? ' table-fixed' : '') + (b.cls ? ' ' + b.cls : '') + '">' + (b.cols || '') +
        '<thead>' + b.head + '</thead><tbody>' + rowsHtml + '</tbody></table></div>';
  }

  function rptEmptyHtml(text, good) {
    return '<div class="rounded-xl border border-dashed border-border-medium p-8 text-center">' +
      '<span class="material-symbols-outlined text-[36px] ' + (good ? 'text-status-success">task_alt' : 'text-text-muted">info') + '</span>' +
      '<p class="text-body-md text-text-secondary mt-2">' + esc(text) + '</p></div>';
  }

  function rptGroupRow(text, span, extra) {
    return '<tr class="rpt-group"><td colspan="' + span + '">' + esc(text) +
      (extra ? '<span class="ml-2 font-medium text-text-muted">' + esc(extra) + '</span>' : '') + '</td></tr>';
  }

  function rptGrouped(list, span, rowFn, extraFn) {
    var out = { rows: [], groups: [] };
    rptGroupBy(list, 'Division').forEach(function (g) {
      out.rows.push(rptGroupRow(g.name, span, extraFn ? extraFn(g.rows) : ''));
      out.groups.push(true);
      g.rows.forEach(function (r) {
        out.rows.push(rowFn(r));
        out.groups.push(false);
      });
    });
    return out;
  }

  function rptPerson(r) {
    return '<span class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">' +
      '<span class="font-semibold text-text-primary break-words">' + esc(r.Full_Name) + '</span>' +
      '<span class="whitespace-nowrap text-[11px] text-text-muted tabular-nums">NIK ' + esc(r.NIK) + '</span>' +
      (r.isHome === false ? '<span class="pill pill-maroon whitespace-nowrap !py-0 !px-1.5 !text-[11px]">Additional Role</span>' : '') +
      (r.roleInactive ? '<span class="pill pill-neutral whitespace-nowrap !py-0 !px-1.5 !text-[11px]">Inactive Role</span>' : '') +
    '</span>';
  }

  function rptRankBadge(rank) {
    return '<span class="inline-flex w-6 h-6 items-center justify-center rounded-full text-[12px] font-bold tabular-nums ' +
      (rank <= 3 ? 'bg-brand-50 text-primary-container' : 'bg-slate-100 text-text-secondary') + '">' + rank + '</span>';
  }

  function rptNumCell(v, dp, tone) {
    if (!isNum(v)) return '<td class="text-right"><span class="text-text-muted">-</span></td>';
    return '<td class="text-right tabular-nums' + (tone ? ' ' + tone : '') + '">' + (dp === 2 ? Number(v).toFixed(2) : num(v)) + '</td>';
  }

  function rptBandCell(v) {
    if (!isNum(v)) return '<td class="text-right"><span class="text-text-muted">-</span></td>';
    return '<td class="text-right font-semibold tabular-nums text-status-' + band(v).key + '-text">' + num(v) + '</td>';
  }

  function rptBandPill(r) {
    if (r.submitted === 0) return '<span class="pill pill-neutral !py-0.5 !px-2 !text-[11px]">Not Scored</span>';
    var b = band(r.index);
    return '<span class="pill pill-' + b.key + ' !py-0.5 !px-2 !text-[11px]">' + b.label + '</span>';
  }

  function rptStatusPill(r, open) {
    var unscored = r.submitted === 0;
    var tone = unscored ? (open ? 'warning' : 'danger')
             : r.statusKey === 'partial' ? 'warning'
             : r.evidence || r.statusKey === 'submitted' ? 'success' : 'info';
    return '<span class="pill pill-' + tone + ' !py-0.5 !px-2 !text-[11px]">' + esc(unscored && open ? 'Not submitted yet' : r.status) + '</span>';
  }

  function rptDelta(v) {
    if (!isNum(v)) return '<span class="text-text-muted">-</span>';
    var tone = v > 0 ? 'text-status-success-text' : v < 0 ? 'text-status-danger-text' : 'text-text-secondary';
    return '<span class="font-semibold tabular-nums ' + tone + '">' + (v > 0 ? '+' : '') + num(v, 1) + '</span>';
  }

  function rptRateCell(rate, fixedTone) {
    if (!isNum(rate)) return '<span class="text-text-muted">-</span>';
    var tone = fixedTone || (rate >= 80 ? 'bg-status-success' : rate >= 50 ? 'bg-status-warning' : 'bg-status-danger');
    return '<span class="flex items-center gap-2">' +
      '<span class="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden"><span class="block h-full rounded-full ' + tone + '" style="width:' +
        Math.max(0, Math.min(100, rate)) + '%"></span></span>' +
      '<span class="w-12 text-right font-semibold tabular-nums text-text-secondary">' + num(rate, 1) + '%</span>' +
    '</span>';
  }

  function rptBarRow(label, count, total, color) {
    var p = rptShare(count, total) || 0;
    return '<div class="mb-3">' +
      '<div class="flex items-center justify-between gap-3 mb-1.5">' +
        '<span class="text-body-sm text-text-secondary flex items-center gap-1.5 min-w-0">' + label + '</span>' +
        '<span class="text-body-sm font-semibold text-text-primary tabular-nums whitespace-nowrap">' + count + ' (' + pct(p, 1) + ')</span>' +
      '</div>' +
      '<div class="w-full bg-surface-container h-2 rounded-full overflow-hidden">' +
        '<div class="h-full rounded-full" style="width:' + p + '%;background:' + color + '"></div></div>' +
    '</div>';
  }

  function rptDot(color) {
    return '<span class="w-2 h-2 rounded-full shrink-0" style="background:' + color + '"></span>';
  }

  function rptFindingsHtml(items) {
    if (!items.length) return '<p class="text-body-sm text-text-muted">No findings for this selection.</p>';
    return '<ul class="flex flex-col gap-2">' + items.map(function (it) {
      return '<li class="flex items-start gap-3 p-3 rounded-lg bg-slate-50/60 border border-slate-200/80">' +
        '<span class="material-symbols-outlined text-[20px] shrink-0 ' + it.tone + '">' + it.icon + '</span>' +
        '<span class="min-w-0 text-body-sm text-text-secondary leading-relaxed">' + it.html + '</span></li>';
    }).join('') + '</ul>';
  }

  function rptNotesHtml(notes) {
    return '<div class="mt-4 rounded-xl border border-border-light bg-surface-page px-4 py-3 flex flex-col gap-1.5">' + notes.map(function (n) {
      return '<p class="flex items-start gap-2 text-body-sm text-text-secondary">' +
        '<span class="material-symbols-outlined text-[18px] text-text-muted shrink-0">' + n[0] + '</span><span>' + n[1] + '</span></p>';
    }).join('') + '</div>';
  }

  function rptCountedSpan(trial) {
    var counted = MONTHS.filter(function (m, i) { return trial.indexOf(i + 1) === -1; });
    return counted.length ? counted[0].substring(0, 3) + ' to ' + counted[counted.length - 1].substring(0, 3) : 'no counted months';
  }

  function rptChartOptions(extra) {
    var o = dashOptions(extra);
    o.animation = false;
    o.devicePixelRatio = 2;
    o.events = [];
    o.plugins.tooltip = { enabled: false };
    return o;
  }

  function rptRateColor(rate) {
    return !isNum(rate) ? DASH_COLORS.slate : rate >= 80 ? DASH_COLORS.success : rate >= 50 ? DASH_COLORS.warning : DASH_COLORS.danger;
  }

  function rptPctAxis() {
    return { min: 0, max: 100, ticks: { stepSize: 25, callback: function (v) { return v + '%'; } }, grid: { color: DASH_COLORS.grid } };
  }

  function rptTrendChart(tr) {
    var ytd = isNum(tr.ytdAvg) ? tr.ytdAvg : null;
    var shown = tr.months.slice(0, tr.upto);
    return {
      type: 'line',
      data: {
        labels: shown.map(function (m) { return m.trial ? [dashMonth(m.month), 'Trial'] : dashMonth(m.month); }),
        datasets: [
          {
            label: 'Average',
            data: shown.map(function (m) { return isNum(m.avg) ? m.avg : null; }),
            borderColor: DASH_COLORS.ink,
            backgroundColor: dashGradient,
            fill: true,
            clip: false,
            tension: 0.35,
            spanGaps: false,
            borderWidth: 2,
            pointRadius: shown.map(function (m) { return isNum(m.avg) ? 4.5 : 0; }),
            pointBorderWidth: 2,
            pointBackgroundColor: shown.map(function (m) { return trendPointColor(m, ytd); }),
            pointBorderColor: shown.map(function (m) { return trendPointColor(m, ytd); })
          },
          {
            label: 'Year to date',
            data: shown.map(function () { return ytd; }),
            borderColor: DASH_COLORS.muted,
            borderDash: [4, 4],
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
            clip: false
          }
        ]
      },
      options: rptChartOptions({
        layout: { padding: { top: 24, right: TREND_LABEL_ROOM } },
        scales: { y: rptPctAxis(), x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: false } } }
      }),
      plugins: [trendMarksPlugin(tr)]
    };
  }

  function rptRateChart(tr) {
    var shown = tr.months.slice(0, tr.upto);
    return {
      type: 'bar',
      data: {
        labels: shown.map(function (m) { return m.trial ? [dashMonth(m.month), 'Trial'] : dashMonth(m.month); }),
        datasets: [{
          label: 'Submitted',
          data: shown.map(function (m) { return isNum(m.rate) ? m.rate : 0; }),
          backgroundColor: shown.map(function (m) { return m.trial ? DASH_COLORS.muted : rptRateColor(m.rate); }),
          borderRadius: 6,
          borderSkipped: 'start',
          maxBarThickness: 28
        }]
      },
      options: rptChartOptions({
        layout: { padding: { top: 18 } },
        scales: { y: rptPctAxis(), x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: false } } }
      }),
      plugins: [stackTopLabelsPlugin(
        shown.map(function (m) { return isNum(m.rate) ? Math.round(m.rate) + '%' : ''; }),
        shown.map(function (m) { return isNum(m.rate) ? m.rate : 0; })
      )]
    };
  }

  function rptGradeMix(dist) {
    var n = GRADES.reduce(function (s, g) { return s + dist[g]; }, 0);
    if (!n) return '<span class="text-text-muted">-</span>';
    return '<span class="flex h-2.5 w-full rounded-full overflow-hidden bg-slate-100">' + GRADES.map(function (g) {
      return dist[g] ? '<span class="h-full" style="width:' + rptShare(dist[g], n) + '%;background:' + GRADE_COLORS[g] + '"></span>' : '';
    }).join('') + '</span>';
  }

  function rptScoreBar(v) {
    if (!isNum(v)) return '<span class="text-text-muted">-</span>';
    var key = band(v).key;
    return '<span class="flex items-center gap-2">' +
      '<span class="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden"><span class="block h-full rounded-full bg-status-' + key + '" style="width:' +
        Math.max(0, Math.min(100, v)) + '%"></span></span>' +
      '<span class="w-10 text-right font-semibold tabular-nums text-status-' + key + '-text">' + num(v) + '</span>' +
    '</span>';
  }

  function rptLegend(items) {
    return '<div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-label-xs text-text-secondary">' + items.map(function (it) {
      return '<span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm" style="background:' + it[0] + '"></span>' + esc(it[1]) + '</span>';
    }).join('') + '</div>';
  }

  function rptBandLegend() {
    return '<div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-label-xs text-text-secondary">' +
      ['success', 'info', 'danger'].map(function (key) {
        return '<span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-status-' + key + '-subtle border border-status-' + key + '"></span>' +
          esc(bandRange(key)) + '</span>';
      }).join('') +
      '<span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-surface-page border border-border-light"></span>Trial month, not counted</span>' +
    '</div>';
  }

  function rptTrendTiles(md) {
    var tr = md.trend;
    var counted = tr.months.slice(0, tr.upto).filter(function (m) { return !m.trial; });
    var span = counted.length ? dashMonth(counted[0].month) + ' to ' + dashMonth(counted[counted.length - 1].month) : 'No counted months yet';
    var tile = function (label, value, tone, caption) {
      return '<div class="rounded-lg border border-border-light bg-white px-4 py-2 min-w-0">' +
        '<p class="text-label-xs uppercase tracking-wider text-text-muted">' + esc(label) + '</p>' +
        '<p class="text-title-lg font-bold tabular-nums leading-tight ' + tone + '">' + value + '</p>' +
        '<p class="mt-0.5 text-[11px] text-text-muted">' + esc(caption) + '</p></div>';
    };
    var monthTile = function (label, m) {
      return m ? tile(label, m.avg.toFixed(2) + '%', 'text-status-' + band(m.avg).key + '-text', MONTHS[m.month - 1])
               : tile(label, '-', 'text-text-muted', 'No counted month yet');
    };
    var ytd = isNum(tr.ytdAvg) ? tr.ytdAvg : null;
    return '<div class="grid grid-cols-4 gap-4 mb-2">' +
        tile('Avg KPI Score', ytd === null ? '-' : ytd.toFixed(2) + '%', ytd === null ? 'text-text-muted' : 'text-status-' + band(ytd).key + '-text',
          ytd === null ? span : band(ytd).label + ' • ' + span) +
        monthTile('Best Month', tr.best) +
        monthTile('Lowest Month', tr.lowest || tr.best) +
        tile('Submission Rate', isNum(tr.rate) ? num(tr.rate, 1) + '%' : '-', 'text-text-primary', 'Average of ' + span) +
      '</div>' +
      '<p class="mb-2 text-[11px] text-text-muted">These numbers count every scorecard, the same as the Dashboard' +
        (md.kind === 'annual' ? '. Page 1 counts each person once, so its averages can differ slightly.' : '.') + '</p>';
  }

  function rptChartLegend(items) {
    var mark = function (kind, color) {
      if (kind === 'dot') return '<span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:' + color + '"></span>';
      if (kind === 'box') return '<span class="w-3 h-3 rounded-sm shrink-0" style="background:' + color + '"></span>';
      return '<span class="w-4 shrink-0" style="border-top:2px ' + (kind === 'dash' ? 'dashed' : 'dotted') + ' ' + color + '"></span>';
    };
    return '<div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-label-xs text-text-secondary">' + items.map(function (it) {
      return '<span class="inline-flex items-center gap-1.5">' + mark(it[0], it[1]) + esc(it[2]) + '</span>';
    }).join('') + '</div>';
  }

  function rptTrialMark(on) {
    return on ? '<span class="block text-[11px] font-normal normal-case tracking-normal">Trial</span>' : '';
  }

  function rptNote(text) {
    return '<p class="mt-2 text-label-sm text-text-muted">' + text + '</p>';
  }

  function rptTrendBlock(md, cid, title, sub) {
    var tr = md.trend;
    var line = cid();
    var bars = cid();
    var shown = tr.months.slice(0, tr.upto);
    var monthCells = function (months) {
      return months.slice(0, tr.upto).map(function (m) {
        return '<td class="!px-1 text-center' + (m.trial ? ' recap-trial' : '') + '">' + dashCell(m.avg, m.trial) + '</td>';
      }).join('');
    };
    var row = function (name, sub2, t, total) {
      return '<tr' + (total ? ' class="rpt-total"' : '') + '>' +
        '<td><span class="font-semibold text-text-primary">' + esc(name) + '</span>' +
          (sub2 ? '<span class="ml-1.5 text-[11px] text-text-muted whitespace-nowrap">' + esc(sub2) + '</span>' : '') + '</td>' +
        '<td>' + rptRateCell(t.rate) + '</td>' +
        '<td class="!px-1 text-center">' + dashCell(t.ytdAvg) + '</td>' +
        monthCells(t.months) +
      '</tr>';
    };
    var rows = md.heat.map(function (h) { return row(h.name, plural(h.trend.scorecards, 'scorecard'), h.trend, false); });
    rows.push(row('Overall', plural(tr.scorecards, 'scorecard'), tr, true));
    return {
      title: title,
      sub: sub,
      cls: 'rpt-heat',
      intro: rptTrendTiles(md) + '<div class="grid grid-cols-2 gap-4 mb-4">' +
          rptCard('Average score by month', 'Average Role Index of the scored scorecards in each month',
            rptChartBox(line, 195) + rptChartLegend([
              ['dot', DASH_COLORS.success, 'At or above year to date'],
              ['dot', DASH_COLORS.danger, 'Below year to date'],
              ['dash', DASH_COLORS.muted, 'Year to date average'],
              ['dots', DASH_COLORS.info, 'Rating thresholds'],
              ['dot', DASH_COLORS.muted, 'Trial month']
            ])) +
          rptCard('Submission rate by month', 'Share of scorecards with a score in each month',
            rptChartBox(bars, 195) + rptChartLegend([
              ['box', DASH_COLORS.success, '80% or more'],
              ['box', DASH_COLORS.warning, '50% to 79.9%'],
              ['box', DASH_COLORS.danger, 'Below 50%'],
              ['box', DASH_COLORS.muted, 'Trial month']
            ])) +
        '</div>' +
        rptSub('Monthly heatmap by ' + md.heatField.toLowerCase(), 'Average score per month, colored by rating band. Year to date leaves out the trial month.'),
      cols: rptCols([230, 150, 96].concat(shown.map(function () { return null; }))),
      head: '<tr><th>' + esc(md.heatField) + '</th><th>Submitted</th><th class="!px-1 text-center">Year to date</th>' +
        shown.map(function (m) {
          return '<th class="!px-1 text-center' + (m.trial ? ' recap-trial' : '') + '">' + dashMonth(m.month) + rptTrialMark(m.trial) + '</th>';
        }).join('') + '</tr>',
      rows: rows,
      groups: rows.map(function () { return false; }),
      after: rptBandLegend(),
      charts: [{ id: line, cfg: rptTrendChart(tr) }, { id: bars, cfg: rptRateChart(tr) }]
    };
  }

  function rptMonthlyBlocks(md, opts) {
    var seq = 0;
    var cid = function () { seq++; return 'rpt-chart-' + seq; };
    var on = function (key) { return !!opts.sections[key]; };
    var blocks = [rptMonthlySummary(md)];
    if (on('compliance')) blocks.push(rptComplianceBlock(md));
    if (on('divisions')) blocks.push(rptMonthDivisionBlock(md));
    if (on('trend')) {
      blocks.push(rptTrendBlock(md, cid, 'Year to Date Trend',
        esc('January to ' + md.monthName + ' • ' + md.scopeLabel)));
    }
    if (on('people')) blocks.push(rptPeopleBlock(md));
    if (on('kpis')) blocks.push(rptKpiBlock(md));
    if (on('missing')) blocks.push(rptMissingBlock(md));
    if (on('appendix')) blocks.push(rptAppendixBlock(md));
    return blocks;
  }

  function rptMonthlySummary(md) {
    var t = md.total;
    var b = isNum(t.avg) ? band(t.avg) : null;
    var scored = t.dist.total;
    var needs = t.bands.danger;
    var vs = function (v) { return md.comparable && isNum(v) ? ' • ' + rptChangeText(v) + ' from ' + md.prevName : ''; };
    var rateTone = !isNum(t.rate) ? 'bg-status-info' : t.rate >= 80 ? 'bg-status-success' : t.rate >= 50 ? 'bg-status-warning' : 'bg-status-danger';

    var tiles =
      statCard('Average Score', 'trending_up', b ? 'text-status-' + b.key + '-text' : 'text-text-muted',
        b ? num(t.avg) : '-', b ? '/ 100' : '',
        b ? 'Rating: ' + esc(b.label) + esc(vs(t.change)) : 'No scorecards scored yet',
        b ? 'bg-status-' + b.key : '', t.avg || 0) +
      statCard('Submission Rate', 'task_alt', 'text-text-primary',
        isNum(t.rate) ? num(t.rate, 1) : '-', '%',
        (t.scorecards - t.pending) + ' of ' + plural(t.scorecards, 'scorecard') + ' submitted' + esc(vs(t.rateChange)),
        rateTone, t.rate || 0) +
      statCard('Scorecards', 'badge', 'text-text-primary', t.scorecards, 'Scorecards',
        plural(t.employees, 'employee') + ' • ' + t.complete + ' complete, ' + t.partial + ' partial', '', 0) +
      statCard('Needs Attention', 'flag', needs ? 'text-status-danger-text' : 'text-status-success-text',
        needs, scored ? 'of ' + scored + ' scored' : '',
        scored ? pct(rptShare(needs, scored), 1) + ' of scored scorecards are below ' + bandNum(bandValues().good) : 'No scorecards scored yet',
        'bg-status-danger', scored ? needs / scored * 100 : 0);

    var dist = rptCard('Rating Distribution', esc(plural(scored, 'scored scorecard')) + ' in ' + esc(md.monthName),
      rptBarRow(rptDot(BAND_META.success.hex) + esc(bandRange('success')), t.bands.success, scored, BAND_META.success.hex) +
      rptBarRow(rptDot(BAND_META.info.hex) + esc(bandRange('info')), t.bands.info, scored, BAND_META.info.hex) +
      rptBarRow(rptDot(BAND_META.danger.hex) + esc(bandRange('danger')), t.bands.danger, scored, BAND_META.danger.hex) +
      (t.pending ? '<p class="text-body-sm text-text-muted">' + plural(t.pending, 'scorecard') + ' not scored yet.</p>' : ''), 'col-span-5');

    var notes = [];
    if (md.trial) notes.push(['science', esc(MONTHS[md.month - 1]) + ' is a trial month. Its scores are shown for reference and do not count toward the year to date average.']);
    if (md.open && md.periodState) notes.push(['schedule', 'The period is open until ' + esc(fmtDate(md.periodState.cutoff)) + ', so these numbers can still change.']);
    if (!md.comparable && !md.trial) notes.push(['history', 'No comparison with the previous month, because it is a trial month or outside this fiscal year.']);
    notes.push(['info', 'Scores are Role Index values from 0 to 100. Submission Rate counts every scorecard with at least one KPI submitted, the same as the Summary Report.']);

    return {
      html: rptHead('Executive Summary', esc(md.monthName + ' • ' + md.scopeLabel + ' • ' + rptPeriodText(md.periodState))) +
        '<div class="grid grid-cols-4 gap-4">' + tiles + '</div>' +
        '<div class="grid grid-cols-12 gap-4 mt-4">' + dist + rptCard('Key Findings', '', rptFindingsHtml(md.findings), 'col-span-7') + '</div>' +
        rptNotesHtml(notes),
      charts: []
    };
  }

  function rptComplianceBlock(md) {
    var byRate = function (a, b) { return rptOrder(a.rate, b.rate, 1) || a.name.localeCompare(b.name); };
    var cells = function (g, cls, label) {
      return '<tr' + (cls ? ' class="' + cls + '"' : '') + '>' +
        '<td>' + label + '</td>' +
        '<td class="text-right tabular-nums">' + g.scorecards + '</td>' +
        '<td class="text-right tabular-nums">' + (g.scorecards - g.pending) + '</td>' +
        '<td class="text-right tabular-nums' + (g.pending ? ' font-semibold text-status-danger-text' : '') + '">' + g.pending + '</td>' +
        '<td>' + rptRateCell(g.rate) + '</td>' +
        (md.comparable ? '<td class="text-right">' + rptDelta(g.rateChange) + '</td>' : '') +
        '<td class="text-right tabular-nums">' + g.evidence + '</td>' +
      '</tr>';
    };
    var rows = [];
    var groups = [];
    md.groups.slice().sort(byRate).forEach(function (g) {
      rows.push(cells(g, 'rpt-lead', esc(g.name)));
      groups.push(true);
      g.depts.slice().sort(byRate).forEach(function (dg) {
        rows.push(cells(dg, '', '<span class="block pl-4">' + esc(dg.name) + '</span>'));
        groups.push(false);
      });
    });
    rows.push(cells(md.total, 'rpt-total', 'Overall'));
    groups.push(false);
    return {
      title: 'Submission Compliance',
      sub: esc(md.monthName + ' • ' + md.scopeLabel + ' • lowest submission rate first'),
      cols: rptCols([null, 120, 120, 140, 260].concat(md.comparable ? [130] : []).concat([140])),
      head: '<tr><th>Division / Department</th><th class="text-right">Scorecards</th><th class="text-right">Submitted</th>' +
        '<th class="text-right">Not Submitted</th><th>Submission Rate</th>' +
        (md.comparable ? '<th class="text-right">vs ' + esc(md.prevName.substring(0, 3)) + ' (pts)</th>' : '') +
        '<th class="text-right">Evidence on File</th></tr>',
      rows: rows,
      groups: groups,
      after: rptNote('Submitted counts every scorecard with at least one KPI filled, the same as the Summary Report. Submission Rate is Submitted out of Scorecards, ' +
        'green from 80%, amber from 50%' + (md.evidenceOptional ? '. Evidence is optional this year.' : '.'))
    };
  }

  function rptMonthDivisionBlock(md) {
    var byAvg = function (a, b) { return rptOrder(a.avg, b.avg, -1) || a.name.localeCompare(b.name); };
    var monthShort = MONTHS[md.month - 1].substring(0, 3);
    var prevShort = md.comparable ? md.prevName.substring(0, 3) : '';
    var cells = function (g, cls, label) {
      return '<tr' + (cls ? ' class="' + cls + '"' : '') + '>' +
        '<td>' + label + '</td>' +
        '<td class="text-right tabular-nums">' + g.dist.total + ' of ' + g.scorecards + '</td>' +
        '<td>' + rptScoreBar(g.avg) + '</td>' +
        (md.comparable ? rptNumCell(g.prevAvg) + '<td class="text-right">' + rptDelta(g.change) + '</td>' : '') +
        rptNumCell(g.ytd, 2) +
        '<td class="text-right tabular-nums">' + g.bands.success + '</td>' +
        '<td class="text-right tabular-nums">' + g.bands.info + '</td>' +
        '<td class="text-right tabular-nums' + (g.bands.danger ? ' font-semibold text-status-danger-text' : '') + '">' + g.bands.danger + '</td>' +
        '<td class="text-right tabular-nums">' + g.pending + '</td>' +
      '</tr>';
    };
    var rows = [];
    var groups = [];
    md.groups.slice().sort(byAvg).forEach(function (g) {
      rows.push(cells(g, 'rpt-lead', esc(g.name)));
      groups.push(true);
      g.depts.slice().sort(byAvg).forEach(function (dg) {
        rows.push(cells(dg, '', '<span class="block pl-4">' + esc(dg.name) + '</span>'));
        groups.push(false);
      });
    });
    rows.push(cells(md.total, 'rpt-total', 'Overall'));
    groups.push(false);
    return {
      title: 'Performance by Division',
      sub: esc(md.monthName + ' • ' + md.scopeLabel + ' • highest average first'),
      cols: rptCols([null, 100, 220].concat(md.comparable ? [90, 90] : []).concat([110, 90, 70, 130, 100])),
      head: '<tr><th>Division / Department</th><th class="text-right">Scored</th><th>' + esc(monthShort) + ' Average</th>' +
        (md.comparable ? '<th class="text-right">' + esc(prevShort) + '</th><th class="text-right">Change</th>' : '') +
        '<th class="text-right">Year to date</th><th class="text-right">Excellent</th><th class="text-right">Good</th>' +
        '<th class="text-right">Needs Attention</th><th class="text-right">Not Scored</th></tr>',
      rows: rows,
      groups: groups,
      after: rptNote('Averages are Role Index values of scored scorecards, colored by rating band. Year to date averages each scorecard over the counted months up to ' +
        esc(MONTHS[md.month - 1]) + ' and leaves out the trial month.')
    };
  }

  function rptPeopleBlock(md) {
    var topRows = md.top.shown.map(function (x) {
      var r = x.row;
      return '<tr><td class="text-center">' + rptRankBadge(x.rank) + '</td>' +
        '<td>' + rptPerson(r) + '</td><td>' + esc(r.Position) + '</td><td>' + esc(r.Department) + '</td>' +
        '<td class="text-right tabular-nums">' + rptTier1(r) + '</td>' +
        '<td class="text-right tabular-nums">' + md.kpiMonths(r) + '</td>' +
        rptBandCell(r.index) +
        '<td>' + rptBandPill(r) + '</td></tr>';
    }).join('');
    var topTable = topRows
      ? rptTableHtml({
          cols: rptCols([60, null, 220, 220, 100, 100, 100, 140]),
          head: '<tr><th class="text-center">Rank</th><th>Employee</th><th>Position</th><th>Department</th>' +
            '<th class="text-right">KPIs at 1.0</th><th class="text-right">KPI Months</th><th class="text-right">Role Index</th><th>Rating</th></tr>'
        }, topRows) +
        (md.top.more ? rptNote('And ' + plural(md.top.more, 'more person', 'more people') + ' with the same score as the last row.') : '')
      : rptEmptyHtml('No scorecard is scored yet this month.');

    var rows = md.attention.map(function (a) {
      var r = a.row;
      return '<tr><td>' + rptPerson(r) + '</td><td>' + esc(r.Position) + '</td><td>' + esc(r.Department) + '</td>' +
        '<td class="text-right tabular-nums">' + md.kpiMonths(r) + '</td>' +
        rptBandCell(r.index) +
        '<td>' + (a.weakest
          ? '<span class="flex items-center gap-2 min-w-0">' + (isNum(a.weakest.Score)
              ? '<span class="' + tierClass(a.weakest.Score) + ' rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums shrink-0">' + Number(a.weakest.Score).toFixed(1) + '</span>'
              : '<span class="pill pill-neutral shrink-0 !py-0 !px-1.5 !text-[11px]">Not filled</span>') +
              '<span class="truncate">' + esc(a.weakest.KPI_Name) + '</span></span>'
          : '<span class="text-text-muted">-</span>') + '</td>' +
        '<td class="text-right tabular-nums">' + a.low + ' of ' + a.due + '</td></tr>';
    });
    return {
      title: 'Top Performers and Needs Attention',
      contTitle: 'Needs Attention',
      sub: esc(md.monthName + ' • ' + md.scopeLabel),
      intro: rptSub('Top 10 this month', 'Ranked by Role Index, then by the number of KPIs at tier 1.0, then by KPI Months. Each person counts once, on their Home Role.') +
        topTable +
        '<div class="mt-6">' + rptSub('Needs Attention', 'Every scorecard below ' + esc(bandNum(bandValues().good)) + ', lowest first, with the KPI that pulled it down the most.') + '</div>',
      cols: rptCols([null, 200, 200, 90, 100, 300, 120]),
      head: '<tr><th>Employee</th><th>Position</th><th>Department</th><th class="text-right">KPI Months</th><th class="text-right">Role Index</th><th>Weakest KPI</th>' +
        '<th class="text-right">Below target</th></tr>',
      rows: rows,
      groups: rows.map(function () { return false; }),
      empty: 'No scorecard is rated Needs Attention this month.',
      emptyGood: true,
      after: rows.length ? rptNote('Weakest KPI is the KPI due this month with the lowest tier, and a KPI that is not filled counts as zero. ' +
        'Below target counts the KPIs due this month at tier 0.4 or 0.2, or not filled. KPI Months counts the scored months up to ' +
        esc(MONTHS[md.month - 1]) + ', without the trial month.') : ''
    };
  }

  function rptLabelPill(label) {
    if (!label) return '<span class="text-text-muted">-</span>';
    var meta = labelMeta(label);
    return '<span class="inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ' + meta.tone + '">' +
      '<span class="material-symbols-outlined text-[14px]">' + meta.icon + '</span>' + esc(label) + '</span>';
  }

  function rptKpiBlock(md) {
    var rows = md.kpis.map(function (k, i) {
      return '<tr><td class="text-center tabular-nums text-text-muted">' + (i + 1) + '</td>' +
        '<td><span class="block font-semibold text-text-primary">' + esc(k.name) + '</span>' +
          (k.metrics ? '<span class="block text-[11px] text-text-muted">' + esc(k.metrics) + '</span>' : '') + '</td>' +
        '<td>' + esc(k.position) + '<span class="block text-[11px] text-text-muted">' + esc(k.department) + '</span></td>' +
        '<td>' + rptLabelPill(k.label) + (k.targetIsB && k.label !== 'Binary' ? '<span class="block mt-1 text-[11px] text-text-muted">Target is B</span>' : '') + '</td>' +
        '<td class="text-right tabular-nums">' + (k.label === 'Binary' || !isNum(k.multiplier) ? '<span class="text-text-muted">-</span>' : num(k.multiplier, 2)) + '</td>' +
        '<td class="text-right tabular-nums">' + k.scored + '</td>' +
        '<td class="text-right"><span class="mx-t04 rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums">' + k.t04 + '</span></td>' +
        '<td class="text-right"><span class="mx-t02 rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums">' + k.t02 + '</span></td>' +
        '<td>' + rptRateCell(k.share, 'bg-status-danger') + '</td></tr>';
    });
    return {
      title: 'KPIs Most Often Below Target',
      sub: esc(md.monthName + ' • ' + md.scopeLabel),
      intro: '<p class="text-body-sm text-text-secondary mb-4 max-w-4xl">These KPIs landed at tier 0.4 (Below) or 0.2 (Critical) for the largest share of scorecards. ' +
        'Only KPIs scored on at least 3 scorecards are listed. A high share can point to a target that needs review, or to a problem the whole team shares.</p>',
      cols: rptCols([50, null, 230, 140, 100, 90, 80, 80, 200]),
      head: '<tr><th class="text-center">#</th><th>KPI and Metrics</th><th>Role</th><th>Label</th><th class="text-right">Multiplier</th><th class="text-right">Scored</th>' +
        '<th class="text-right">At 0.4</th><th class="text-right">At 0.2</th><th>Below or Critical</th></tr>',
      rows: rows,
      groups: rows.map(function () { return false; }),
      empty: 'No KPI scored on 3 or more scorecards landed at tier 0.4 or 0.2.',
      emptyGood: true
    };
  }

  function rptMissingBlock(md) {
    var admin = !!md.reminders;
    var span = admin ? 6 : 5;
    var list = md.missing;
    var people = distinct(list, 'NIK').length;
    var built = rptGrouped(list, span, function (r) {
      var remindedAt = admin ? md.reminders[r.NIK] : '';
      return '<tr><td>' + rptPerson(r) + '</td><td>' + esc(r.Position) + '</td><td>' + esc(r.Department) + '</td>' +
        '<td>' + rptStatusPill(r, md.open) + '</td>' +
        '<td class="text-right tabular-nums">' + (r.inCycle ? r.submitted + ' of ' + r.inCycle : '-') + '</td>' +
        (admin ? '<td>' + (remindedAt ? esc(fmtDate(remindedAt)) : '<span class="text-text-muted">Not reminded</span>') + '</td>' : '') +
      '</tr>';
    }, function (rows) { return plural(rows.length, 'scorecard'); });
    return {
      title: 'Not Submitted',
      sub: esc(md.monthName + ' • ' + md.scopeLabel),
      intro: list.length
        ? '<p class="text-body-sm text-text-secondary mb-4"><strong class="text-text-primary">' + plural(list.length, 'scorecard') + '</strong> from ' +
            plural(people, 'employee') + ' ' + (list.length === 1 ? 'is' : 'are') + ' not complete for ' + esc(md.monthName) + '. ' +
            esc(md.open && md.periodState ? 'The period is open until ' + fmtDate(md.periodState.cutoff) + '.' : rptPeriodText(md.periodState) + '.') + '</p>'
        : '',
      cols: rptCols(admin ? [null, 240, 240, 190, 110, 150] : [null, 260, 260, 200, 120]),
      head: '<tr><th>Employee</th><th>Position</th><th>Department</th><th>Status</th><th class="text-right">KPIs filled</th>' +
        (admin ? '<th>Last reminder</th>' : '') + '</tr>',
      rows: built.rows,
      groups: built.groups,
      empty: 'Every scorecard is submitted for ' + md.monthName + '.',
      emptyGood: true,
      after: list.length ? rptNote('KPIs filled counts the KPIs due this month that already have a value.') : ''
    };
  }

  function rptAppendixBlock(md) {
    var built = rptGrouped(rptSorted(md.rows), 8, function (r) {
      return '<tr><td>' + rptPerson(r) + '</td><td>' + esc(r.Position) + '</td><td>' + esc(r.Department) + '</td>' +
        '<td class="text-right tabular-nums">' + (r.inCycle ? r.submitted + ' of ' + r.inCycle : '-') + '</td>' +
        (r.submitted ? rptBandCell(r.index) : '<td class="text-right"><span class="text-text-muted">-</span></td>') +
        '<td>' + rptBandPill(r) + '</td>' +
        '<td>' + rptStatusPill(r, md.open) + '</td>' +
        '<td>' + (r.evidence ? 'On file' : '<span class="text-text-muted">No file</span>') + '</td></tr>';
    }, function (rows) { return plural(rows.length, 'scorecard'); });
    return {
      title: 'Appendix: All Scorecards',
      sub: esc(md.monthName + ' • ' + md.scopeLabel + ' • ' + plural(md.rows.length, 'scorecard')),
      cols: rptCols([null, 210, 200, 90, 100, 150, 190, 90]),
      head: '<tr><th>Employee</th><th>Position</th><th>Department</th><th class="text-right">KPIs</th><th class="text-right">Role Index</th>' +
        '<th>Rating</th><th>Status</th><th>Evidence</th></tr>',
      rows: built.rows,
      groups: built.groups,
      after: rptNote('KPIs counts the KPIs due this month that have a value.')
    };
  }

  function rptAnnualBlocks(md, opts) {
    var seq = 0;
    var cid = function () { seq++; return 'rpt-chart-' + seq; };
    var on = function (key) { return !!opts.sections[key]; };
    var blocks = [rptAnnualSummary(md)];
    if (on('divisions')) blocks.push(rptGradeBlock(md));
    if (on('top')) blocks.push(rptTopBlock(md));
    if (on('topdiv')) blocks.push(rptTopDeptBlock(md));
    if (on('discipline')) blocks.push(rptDisciplineBlock(md));
    if (on('watch')) blocks.push(rptWatchBlock(md));
    if (on('trend')) {
      blocks.push(rptTrendBlock(md, cid, 'KPI Trend Through the Year',
        esc('January to ' + MONTHS[md.trend.upto - 1] + ' ' + md.year + ' • ' + md.scopeLabel)));
    }
    if (on('missing') && md.missing.length) blocks.push(rptEvalMissingBlock(md));
    if (on('results')) blocks.push(rptResultsBlock(md));
    if (on('months')) blocks.push(rptMonthsBlock(md));
    return blocks;
  }

  function rptAnnualSummary(md) {
    var t = md.total;
    var rules = md.rules || { weights: {}, grades: {} };
    var n = md.ranked.length;
    var pending = md.rows.length - md.complete;
    var grade = isNum(t.score) ? perfGrade(t.score, rules.grades) : null;
    var kb = isNum(t.avgKpi) ? band(t.avgKpi) : null;

    var tiles =
      statCard('People Evaluated', 'groups', 'text-text-primary', md.people.length, md.people.length === 1 ? 'Person' : 'People',
        plural(md.rows.length, 'scorecard') + ', including additional roles', '', 0) +
      statCard('Evaluation Completion', 'task_alt', pending ? 'text-status-warning-text' : 'text-status-success-text',
        md.complete, 'of ' + plural(md.rows.length, 'scorecard'),
        pending ? plural(pending, 'scorecard') + ' still missing inputs' : 'Every scorecard has all inputs',
        'bg-status-success', md.rows.length ? md.complete / md.rows.length * 100 : 0) +
      statCard('Average Performance Score', 'workspace_premium', 'text-text-primary',
        isNum(t.score) ? scoreText(t.score) : '-', grade ? 'Grade ' + grade : '',
        n ? 'Across ' + plural(n, 'person', 'people') + ' with a final score' : 'No final scores yet', '', 0) +
      statCard('Average KPI Score', 'insights', kb ? 'text-status-' + kb.key + '-text' : 'text-text-muted',
        kb ? t.avgKpi.toFixed(2) : '-', kb ? '%' : '',
        kb ? 'Rating: ' + esc(kb.label) + ' • ' + esc(rptCountedSpan(md.trialMonths)) : 'No counted months scored yet',
        kb ? 'bg-status-' + kb.key : '', t.avgKpi || 0);

    var ranges = gradeRanges(rules.grades);
    var dist = rptCard('Grade Distribution', esc(plural(n, 'person', 'people')) + ' with a final score',
      GRADES.map(function (g, i) {
        return rptBarRow(gradeBadge(g) + '<span class="ml-1">' + esc(ranges[i].label) + '</span>', md.dist[g], n, GRADE_COLORS[g]);
      }).join('') +
      (t.pending ? '<p class="text-body-sm text-text-muted">' + plural(t.pending, 'person', 'people') + ' not graded yet because inputs are missing.</p>' : ''),
      'col-span-5');

    var rulesCard = '<section class="mt-4 rounded-xl border border-border-light bg-white px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">' +
      '<span class="text-label-xs uppercase tracking-wider font-semibold text-text-muted">Scoring rules FY' + esc(md.year) + '</span>' +
      '<span class="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm">' + perfFormulaHtml(rules) + '</span>' +
      '<span class="flex flex-wrap items-center gap-x-3 gap-y-1 text-label-xs">' + gradeLegendHtml(rules.grades) + '</span>' +
    '</section>';

    var notes = [
      ['person', 'Each person is counted once in the averages, grades, and rankings, using their Home Role scorecard. Without one, the scorecard with the most KPI months is used. Additional Roles are listed in Appendix A.'],
      ['gavel', 'SP levels and Remarks SP are shown as recorded by Admin / HR. They do not change the score or grade, and on a tie a person without SP ranks first.']
    ];
    if (!md.released) notes.unshift(['edit_note', 'FY' + esc(md.year) + ' results are not released to employees yet, so scores can still change.']);

    return {
      html: rptHead('Executive Summary', esc('FY' + md.year + ' • ' + md.scopeLabel)) +
        '<div class="grid grid-cols-4 gap-4">' + tiles + '</div>' +
        '<div class="grid grid-cols-12 gap-4 mt-4">' + dist + rptCard('Key Findings', '', rptFindingsHtml(md.findings), 'col-span-7') + '</div>' +
        rulesCard + rptNotesHtml(notes),
      charts: []
    };
  }

  function rptGradeBlock(md) {
    var byScore = function (a, b) { return rptOrder(a.score, b.score, -1) || a.name.localeCompare(b.name); };
    var cells = function (g, cls, label) {
      return '<tr' + (cls ? ' class="' + cls + '"' : '') + '>' +
        '<td>' + label + '</td>' +
        '<td class="text-right tabular-nums">' + g.people + '</td>' +
        rptNumCell(g.avgKpi, 2) + rptNumCell(g.kbi, 2) + rptNumCell(g.s360, 2) + rptNumCell(g.discipline, 2) +
        rptNumCell(g.score, 2, 'font-bold text-text-primary') +
        '<td>' + rptGradeMix(g.dist) + '</td>' +
        GRADES.map(function (gr) { return '<td class="text-center tabular-nums">' + (g.dist[gr] || '<span class="text-text-muted">0</span>') + '</td>'; }).join('') +
        '<td class="text-right tabular-nums' + (g.pending ? ' text-status-warning-text font-semibold' : '') + '">' + g.pending + '</td>' +
      '</tr>';
    };
    var rows = [];
    var groups = [];
    md.groups.slice().sort(byScore).forEach(function (g) {
      rows.push(cells(g, 'rpt-lead', esc(g.name)));
      groups.push(true);
      g.depts.slice().sort(byScore).forEach(function (dg) {
        rows.push(cells(dg, '', '<span class="block pl-4">' + esc(dg.name) + '</span>'));
        groups.push(false);
      });
    });
    rows.push(cells(md.cardTotal, 'rpt-total', 'Overall'));
    groups.push(false);
    return {
      title: 'Grade Distribution by Division',
      sub: esc('FY' + md.year + ' • ' + md.scopeLabel + ' • highest average score first'),
      cols: rptCols([null, 100, 90, 80, 80, 100, 100, 160, 44, 44, 44, 44, 44, 86]),
      head: '<tr><th>Division / Department</th><th class="text-right">Scorecards</th><th class="text-right">Avg KPI</th><th class="text-right">KBI</th>' +
        '<th class="text-right">360</th><th class="text-right">Discipline</th><th class="text-right">Avg Score</th><th>Grade Mix</th>' +
        GRADES.map(function (g) { return '<th class="text-center">' + g + '</th>'; }).join('') + '<th class="text-right">Pending</th></tr>',
      rows: rows,
      groups: groups,
      after: rptLegend(GRADES.map(function (g) { return [GRADE_COLORS[g], 'Grade ' + g]; })) +
        rptNote('Each scorecard counts in the division and department of its role in Master KPIs, so an Additional Role counts where that role sits. ' +
          'Page 1 counts each person once. Component averages include every scorecard with a value. Avg Score and grades include only scorecards with a final score.')
    };
  }

  function rptScoreRow(x, extra) {
    var r = x.row || x;
    var rank = x.rank || 0;
    return '<tr><td class="text-center">' + (rank ? rptRankBadge(rank) : '<span class="text-text-muted">-</span>') + '</td>' +
      '<td>' + rptPerson(r) + '</td><td>' + esc(r.Position) + '</td><td>' + esc(r.Department) + '</td>' +
      (extra || '') +
      rptNumCell(r.avgKpi, 2) + rptNumCell(r.kbi, 2) + rptNumCell(r.s360, 2) + rptNumCell(r.discipline, 2) +
      rptNumCell(r.score, 2, 'font-bold text-text-primary') +
      '<td class="text-center">' + gradeBadge(r.grade) + '</td></tr>';
  }

  function rptSpCell(r, withRemarks) {
    if (!r.spLevel && !(withRemarks && r.remarks)) return '<td><span class="text-text-muted">-</span></td>';
    return '<td>' + (r.spLevel ? '<span class="pill ' + spTone(r.spLevel) + ' whitespace-nowrap !py-0 !px-1.5 !text-[11px]">' + esc(r.spLevel) + '</span>' : '') +
      (withRemarks && r.remarks ? '<span class="block mt-0.5 text-[11px] text-text-muted break-words">' + esc(r.remarks) + '</span>' : '') + '</td>';
  }

  var RPT_SCORE_HEAD = '<th class="text-right">Avg KPI</th><th class="text-right">KBI</th><th class="text-right">360</th>' +
    '<th class="text-right">Discipline</th><th class="text-right">Score</th><th class="text-center">Grade</th>';

  function rptTopBlock(md) {
    var rows = md.top.shown.map(function (x) {
      return rptScoreRow(x, '<td>' + esc(x.row.Division) + '</td><td class="text-right tabular-nums">' + (x.row.kpiMonths || 0) + '</td>' + rptSpCell(x.row));
    });
    return {
      title: 'Top 10 Performers',
      sub: esc('FY' + md.year + ' • ' + md.scopeLabel),
      intro: '<p class="text-body-sm text-text-secondary mb-4 max-w-4xl">Ranked by Performance Score, then Avg KPI, then SP (no SP first, then SP1, SP2, SP3), then KPI Months. ' +
        'People with the same values share a rank. Each person is ranked once, on their Home Role scorecard.</p>',
      cols: rptCols([60, null, 150, 140, 120, 100, 60, 80, 70, 70, 90, 80, 60]),
      head: '<tr><th class="text-center">Rank</th><th>Employee</th><th>Position</th><th>Department</th><th>Division</th>' +
        '<th class="text-right">KPI Months</th><th>SP</th>' + RPT_SCORE_HEAD + '</tr>',
      rows: rows,
      groups: rows.map(function () { return false; }),
      empty: 'No one has a final Performance Score yet.',
      after: md.top.more ? rptNote('And ' + plural(md.top.more, 'more person', 'more people') + ' with the same scores as the last row.') : ''
    };
  }

  function rptTopDeptBlock(md) {
    var rows = md.depts.shown.map(function (x) {
      var g = x.row;
      return '<tr><td class="text-center">' + rptRankBadge(x.rank) + '</td>' +
        '<td class="font-semibold text-text-primary">' + esc(g.name) + '</td><td>' + esc(g.division) + '</td>' +
        '<td class="text-right tabular-nums">' + g.people + '</td>' +
        rptNumCell(g.avgKpi, 2, 'font-bold text-text-primary') + rptNumCell(g.kbi, 2) + rptNumCell(g.s360, 2) + rptNumCell(g.discipline, 2) +
        rptNumCell(g.score, 2) +
        '<td>' + rptGradeMix(g.dist) + '</td>' +
        '<td class="text-right tabular-nums' + (g.pending ? ' text-status-warning-text font-semibold' : '') + '">' + g.pending + '</td></tr>';
    });
    return {
      title: 'Top 5 Department',
      sub: esc('FY' + md.year + ' • ' + md.scopeLabel),
      intro: '<p class="text-body-sm text-text-secondary mb-4 max-w-4xl">Departments ranked by the average Avg KPI of their scorecards, then by average Performance Score. ' +
        'Each scorecard counts in the department of its role in Master KPIs, so an Additional Role counts where that role sits.</p>',
      cols: rptCols([60, null, 190, 110, 100, 80, 80, 100, 100, 180, 90]),
      head: '<tr><th class="text-center">Rank</th><th>Department</th><th>Division</th><th class="text-right">Scorecards</th><th class="text-right">Avg KPI</th>' +
        '<th class="text-right">KBI</th><th class="text-right">360</th><th class="text-right">Discipline</th><th class="text-right">Avg Score</th><th>Grade Mix</th>' +
        '<th class="text-right">Pending</th></tr>',
      rows: rows,
      groups: rows.map(function () { return false; }),
      empty: 'No department has a KPI score yet.',
      after: (md.depts.more ? rptNote('And ' + plural(md.depts.more, 'more department') + ' with the same values as the last row.') : '') +
        rptLegend(GRADES.map(function (g) { return [GRADE_COLORS[g], 'Grade ' + g]; }))
    };
  }

  function rptDisciplineBlock(md) {
    var rows = md.discipline.shown.map(function (x) {
      var r = x.row;
      return '<tr><td class="text-center">' + rptRankBadge(x.rank) + '</td>' +
        '<td>' + rptPerson(r) + '</td><td>' + esc(r.Position) + '</td><td>' + esc(r.Department) + '</td><td>' + esc(r.Division) + '</td>' +
        rptNumCell(r.discipline, 2, 'font-bold text-text-primary') + rptSpCell(r) +
        rptNumCell(r.avgKpi, 2) + rptNumCell(r.score, 2) +
        '<td class="text-center">' + gradeBadge(r.grade) + '</td></tr>';
    });
    return {
      title: 'Top 5 Discipline',
      sub: esc('FY' + md.year + ' • ' + md.scopeLabel),
      intro: '<p class="text-body-sm text-text-secondary mb-4 max-w-4xl">Ranked by Discipline Score, then SP (no SP first, then SP1, SP2, SP3). ' +
        'People with the same values share a rank. Each person counts once, on their Home Role.</p>',
      cols: rptCols([60, null, 190, 180, 160, 110, 80, 90, 90, 70]),
      head: '<tr><th class="text-center">Rank</th><th>Employee</th><th>Position</th><th>Department</th><th>Division</th>' +
        '<th class="text-right">Discipline</th><th>SP</th><th class="text-right">Avg KPI</th><th class="text-right">Score</th><th class="text-center">Grade</th></tr>',
      rows: rows,
      groups: rows.map(function () { return false; }),
      empty: 'No Discipline Score is filled yet.',
      after: md.discipline.more ? rptNote('And ' + plural(md.discipline.more, 'more person', 'more people') + ' with the same values as the last row.') : ''
    };
  }

  function rptLowest(r) {
    var parts = (r.parts || []).filter(function (p) { return p.required && isNum(p.value); });
    if (!parts.length) return '<span class="text-text-muted">-</span>';
    var low = parts.reduce(function (a, p) { return p.value < a.value ? p : a; }, parts[0]);
    return esc(low.label) + ' <span class="text-text-muted tabular-nums">' + scoreText(low.value) + '</span>';
  }

  function rptWatchBlock(md) {
    var rows = md.watch.map(function (r) {
      return '<tr><td>' + rptPerson(r) + '</td><td>' + esc(r.Position) + '</td><td>' + esc(r.Department) + '</td>' +
        rptNumCell(r.avgKpi, 2) + rptNumCell(r.kbi, 2) + rptNumCell(r.s360, 2) + rptNumCell(r.discipline, 2) +
        rptNumCell(r.score, 2, 'font-bold text-text-primary') +
        '<td class="text-center">' + gradeBadge(r.grade) + '</td>' +
        '<td>' + rptLowest(r) + '</td></tr>';
    });
    return {
      title: 'Development Watchlist',
      sub: esc('FY' + md.year + ' • ' + md.scopeLabel + ' • Grade D and E, lowest score first'),
      intro: '<p class="text-body-sm text-text-secondary mb-4 max-w-4xl">People who may need coaching or a performance improvement plan. ' +
        'Lowest Component shows the input with the lowest value, as a starting point for the conversation.</p>',
      cols: rptCols([null, 200, 190, 90, 80, 80, 90, 90, 70, 160]),
      head: '<tr><th>Employee</th><th>Position</th><th>Department</th>' + RPT_SCORE_HEAD + '<th>Lowest Component</th></tr>',
      rows: rows,
      groups: rows.map(function () { return false; }),
      empty: 'No one has Grade D or E in FY' + md.year + '.',
      emptyGood: true
    };
  }

  function rptEvalMissingBlock(md) {
    var built = rptGrouped(md.missing, 6, function (r) {
      return '<tr><td>' + rptPerson(r) + '</td><td>' + esc(r.Position) + '</td><td>' + esc(r.Department) + '</td>' +
        '<td class="text-right tabular-nums">' + (r.kpiMonths || 0) + '</td>' +
        rptNumCell(r.avgKpi, 2) +
        '<td class="font-semibold text-status-warning-text">' + esc((r.missing || []).join(', ') || '-') + '</td></tr>';
    }, function (rows) { return plural(rows.length, 'scorecard'); });
    return {
      title: 'Missing Inputs',
      sub: esc('FY' + md.year + ' • ' + md.scopeLabel + ' • ' + plural(md.missing.length, 'scorecard')),
      intro: '<p class="text-body-sm text-text-secondary mb-4 max-w-4xl">These scorecards have no final score yet. Fill the missing inputs in Performance Evaluation, ' +
        'then download the report again.</p>',
      cols: rptCols([null, 250, 250, 110, 110, 220]),
      head: '<tr><th>Employee</th><th>Position</th><th>Department</th><th class="text-right">KPI Months</th><th class="text-right">Avg KPI</th><th>Missing</th></tr>',
      rows: built.rows,
      groups: built.groups
    };
  }

  function rptResultsBlock(md) {
    var list = rptSorted(md.rows, function (a, b) { return rptOrder(a.score, b.score, -1); });
    var built = rptGrouped(list, 12, function (r) {
      return rptScoreRow({ row: r, rank: md.rankOf[r.Eval_ID] || 0 },
        '<td class="text-right tabular-nums">' + (r.kpiMonths || 0) + '</td>' + rptSpCell(r, true));
    }, function (rows) { return plural(rows.length, 'scorecard'); });
    return {
      title: 'Appendix A: Individual Results',
      sub: esc('FY' + md.year + ' • ' + md.scopeLabel + ' • ' + plural(md.rows.length, 'scorecard')),
      cols: rptCols([60, null, 160, 150, 100, 170, 80, 70, 70, 90, 80, 60]),
      head: '<tr><th class="text-center">Rank</th><th>Employee</th><th>Position</th><th>Department</th><th class="text-right">KPI Months</th><th>SP and Remarks</th>' + RPT_SCORE_HEAD + '</tr>',
      rows: built.rows,
      groups: built.groups,
      after: rptNote('Rank is the company rank from the Top 10 rules. Additional Roles, inactive roles, and scorecards without a final score show a dash.')
    };
  }

  function rptMonthsBlock(md) {
    var trial = md.trialMonths;
    var built = rptGrouped(rptSorted(md.rows), 15, function (r) {
      var months = r.months || [];
      var cells = MONTHS.map(function (m, i) {
        var isTrial = trial.indexOf(i + 1) > -1;
        var v = months[i];
        return '<td class="!px-0.5 text-center' + (isTrial ? ' recap-trial' : '') + '">' + dashCell(isNum(v) ? v : null, isTrial) + '</td>';
      }).join('');
      return '<tr><td>' + rptPerson(r) + '<span class="block text-[11px] text-text-muted truncate">' + esc(r.Position + ' • ' + r.Department) + '</span></td>' +
        cells + '<td class="text-right tabular-nums">' + (r.kpiMonths || 0) + '</td>' +
        '<td class="!px-1 text-center">' + dashCell(isNum(r.avgKpi) ? r.avgKpi : null) + '</td></tr>';
    }, function (rows) { return plural(rows.length, 'scorecard'); });
    return {
      title: 'Appendix B: Monthly KPI Scores',
      cls: 'rpt-heat',
      sub: esc('FY' + md.year + ' • ' + md.scopeLabel + ' • Role Index by month'),
      cols: rptCols([null].concat(MONTHS.map(function () { return 66; })).concat([70, 86])),
      head: '<tr><th>Employee</th>' + MONTHS.map(function (m, i) {
        return '<th class="!px-0.5 text-center' + (trial.indexOf(i + 1) > -1 ? ' recap-trial' : '') + '">' + m.substring(0, 3) + rptTrialMark(trial.indexOf(i + 1) > -1) + '</th>';
      }).join('') + '<th class="text-right">Months</th><th class="!px-1 text-center">Avg KPI</th></tr>',
      rows: built.rows,
      groups: built.groups,
      after: rptBandLegend()
    };
  }

  function rptMeasure(probe) {
    var body = probe.querySelector('.pdf-body');
    var wrap = probe.querySelector('[data-pdf-table]');
    var head = probe.querySelector('[data-pdf-shead]');
    var rows = wrap ? Array.prototype.slice.call(wrap.querySelectorAll('tbody tr')) : [];
    var room = body ? body.clientHeight : 0;
    var rect = function (el) { return el.getBoundingClientRect(); };
    if (!rows.length) return { heights: [], firstRoom: room, nextRoom: room, tail: 0 };
    return {
      heights: rows.map(function (r) { return rect(r).height; }),
      firstRoom: room - (rect(rows[0]).top - rect(body).top) - 4,
      nextRoom: room - (head ? rect(head).height + 12 : 0) - (rect(rows[0]).top - rect(wrap).top) - 4,
      tail: rect(wrap).bottom - rect(rows[rows.length - 1]).bottom
    };
  }

  function rptChunks(layout, groups) {
    var h = layout.heights;
    var chunks = [];
    var room = layout.firstRoom;
    var used = 0;
    var count = 0;
    h.forEach(function (x) {
      if (used + x > room && (count > 0 || !chunks.length)) {
        chunks.push(count);
        room = layout.nextRoom;
        used = 0;
        count = 0;
      }
      used += x;
      count++;
    });
    var moved = 0;
    while (count - moved > 1 && used + layout.tail > room) {
      moved++;
      used -= h[h.length - moved];
    }
    chunks.push(count - moved);
    if (moved) chunks.push(moved);
    var start = 0;
    for (var n = 0; n < chunks.length - 1; n++) {
      while (chunks[n] > 1 && groups[start + chunks[n] - 1]) {
        chunks[n]--;
        chunks[n + 1]++;
      }
      start += chunks[n];
    }
    return chunks;
  }

  function rptTableBlockHtml(b, part, cont, last) {
    return '<div data-pdf-table>' + (cont === null ? '' : rptHead(b.contTitle || b.title, '', cont)) +
      rptTableHtml(b, part) + (last ? b.after || '' : '') + '</div>';
  }

  function rptLayout(stage, ctx, blocks) {
    var probes = blocks.map(function (b) {
      if (!b.rows) return pdfSheet(stage, ctx, b.html);
      var top = rptHead(b.title, b.sub) + (b.intro || '');
      if (!b.rows.length) return pdfSheet(stage, ctx, top + (b.empty ? rptEmptyHtml(b.empty, b.emptyGood) : ''));
      return pdfSheet(stage, ctx, top + rptTableBlockHtml(b, b.rows.join(''), null, true));
    });
    return pdfSettle().then(function () {
      var sheets = [];
      blocks.forEach(function (b, n) {
        var probe = probes[n];
        var body = probe.querySelector('.pdf-body');
        var fit = probe.querySelector('.pdf-fit');
        if (!b.rows || !b.rows.length || (body && fit && fit.scrollHeight <= body.clientHeight * 1.1)) {
          sheets.push(probe);
          return;
        }
        var chunks = rptChunks(rptMeasure(probe), b.groups || []);
        probe.remove();
        var start = 0;
        chunks.forEach(function (count, i) {
          var first = i === 0;
          var last = i === chunks.length - 1;
          var html = first ? rptHead(b.title, b.sub) + (b.intro || '') : '';
          if (count || last) html += rptTableBlockHtml(b, b.rows.slice(start, start + count).join(''), first ? null : start > 0, last);
          sheets.push(pdfSheet(stage, ctx, html));
          start += count;
        });
      });
      return pdfSettle().then(function () { return sheets; });
    });
  }

  function rptDrawCharts(blocks) {
    if (!window.Chart) return [];
    ensureChartTheme();
    var out = [];
    blocks.forEach(function (b) {
      (b.charts || []).forEach(function (c) {
        var canvas = $(c.id);
        if (canvas) out.push(new window.Chart(canvas, c.cfg));
      });
    });
    return out;
  }

  function perfRound(n) {
    return Math.round((n + 1e-9) * 100) / 100;
  }

  function perfScoreInput(value, label) {
    var text = String(value === null || value === undefined ? '' : value).replace(/\s/g, '').replace(/%$/, '');
    if (!text) return { value: null, error: '' };
    if (text.indexOf(',') > -1 && text.indexOf('.') === -1) text = text.replace(',', '.');
    if (!/^-?\d+(\.\d+)?$/.test(text)) return { value: null, error: label + ' must be a number from 0 to 100.' };
    var n = parseFloat(text);
    if (!isFinite(n) || n < 0 || n > 100) return { value: null, error: label + ' must be between 0 and 100.' };
    return { value: Math.round(n * 100) / 100, error: '' };
  }

  function perfSpLevel(value) {
    var text = String(value === null || value === undefined ? '' : value).toUpperCase().replace(/[\s_\-.]+/g, '');
    if (!text || text === 'NONE' || text === '0' || text === 'NO') return '';
    var m = /^(?:SP)?([123])$/.exec(text);
    return m ? 'SP' + m[1] : null;
  }

  function perfGrade(score, grades) {
    if (!isNum(score)) return null;
    for (var g = 0; g < 4; g++) {
      if (score >= Number(grades[GRADES[g]])) return GRADES[g];
    }
    return 'E';
  }

  function perfCompute(avgKpi, inputs, rules) {
    var values = { kpi: avgKpi, kbi: inputs.kbi, s360: inputs.s360, discipline: inputs.discipline };
    var total = 0;
    var missing = [];
    var parts = PERF_COMPONENTS.map(function (c) {
      var weight = Number(rules.weights[c.key]) || 0;
      var dec = Math.round(weight * 100) / 10000;
      var v = values[c.key];
      var has = isNum(v);
      var part = { key: c.key, label: c.label, value: has ? v : null, weight: weight, points: null, required: weight > 0 };
      if (!part.required) return part;
      if (!has) {
        missing.push(c.label);
        return part;
      }
      total += v * dec;
      part.points = perfRound(v * dec);
      return part;
    });
    var complete = !missing.length;
    var score = complete ? perfRound(total) : null;
    return { score: score, grade: complete ? perfGrade(score, rules.grades) : null, complete: complete, missing: missing, parts: parts };
  }

  function scoreText(v) {
    return isNum(v) ? Number(v).toFixed(2) : '-';
  }

  function perfComponent(key) {
    return PERF_COMPONENTS.filter(function (c) { return c.key === key; })[0];
  }

  function gradeBadge(grade, size) {
    if (!grade) return '<span class="grade-badge grade-none' + (size ? ' grade-' + size : '') + '" title="No grade yet">-</span>';
    return '<span class="grade-badge grade-' + grade + (size ? ' grade-' + size : '') + '" title="Grade ' + grade + '">' + grade + '</span>';
  }

  function gradeRanges(grades) {
    return GRADES.map(function (g, n) {
      var min = g === 'E' ? 0 : Number(grades[g]);
      var max = n === 0 ? 100 : Number(grades[GRADES[n - 1]]);
      var label = g === 'A' ? num(min, 2) + ' to 100'
                : g === 'E' ? 'Below ' + num(max, 2)
                : num(min, 2) + ' to ' + num(perfRound(max - 0.01), 2);
      return { grade: g, min: min, max: max, label: label };
    });
  }

  function gradeLegendHtml(grades) {
    return gradeRanges(grades).map(function (r) {
      return '<span class="inline-flex items-center gap-1.5 whitespace-nowrap">' + gradeBadge(r.grade) +
        '<span class="text-text-secondary">' + esc(r.label) + '</span></span>';
    }).join('');
  }

  function gradeScaleTicks(ranges) {
    var shown = [];
    ranges.slice(0, -1).forEach(function (r) {
      var prev = shown.length ? shown[shown.length - 1] : 0;
      if (r.max - prev >= 4 && 100 - r.max >= 2) shown.push(r.max);
    });
    return shown.map(function (v) {
      return '<span class="absolute top-0 text-[11px] font-medium tabular-nums text-text-muted" style="left:' + v + '%;transform:translateX(-50%)">' + num(v, 2) + '</span>';
    }).join('');
  }

  function gradeScaleHtml(grades, marker, tall) {
    var ranges = gradeRanges(grades).slice().reverse();
    var bar = ranges.map(function (r) {
      var width = Math.max(0, r.max - r.min);
      return '<div class="h-full flex items-center justify-center font-bold text-white ' + (tall ? 'text-[14px]' : 'text-[12px]') +
        '" style="width:' + width + '%;background:' + GRADE_COLORS[r.grade] + '" title="Grade ' + r.grade + ': ' + esc(r.label) + '">' +
        (width >= 3 ? r.grade : '') + '</div>';
    }).join('');
    var pos = isNum(marker) ? Math.min(100, Math.max(0, marker)) : null;
    var mark = pos === null ? ''
      : '<div class="grade-scale-mark relative h-[26px]">' +
          '<span class="absolute top-0 rounded-md bg-slate-900 text-white text-[11px] font-bold tabular-nums leading-none px-1.5 py-[3px] whitespace-nowrap" style="left:' +
            pos + '%;transform:translateX(' + (pos < 6 ? '0' : pos > 94 ? '-100%' : '-50%') + ')" title="Score ' + num(marker, 2) + '">' + scoreText(marker) + '</span>' +
          '<span class="absolute bottom-[3px] w-0 h-0 border-x-[5px] border-x-transparent border-t-[6px] border-t-slate-900" style="left:calc(' + pos + '% - 5px)"></span>' +
        '</div>';
    return '<div class="grade-scale w-full" aria-hidden="true">' + mark +
      '<div class="flex ' + (tall ? 'h-9' : 'h-6') + ' w-full rounded-lg overflow-hidden ring-1 ring-black/5">' + bar + '</div>' +
      '<div class="relative h-4 mt-1">' + gradeScaleTicks(ranges) + '</div>' +
    '</div>';
  }

  function perfFormulaHtml(rules) {
    return PERF_COMPONENTS.filter(function (c) { return Number(rules.weights[c.key]) > 0; }).map(function (c) {
      return '<span class="inline-flex items-center gap-1 whitespace-nowrap"><span class="text-text-secondary">' + esc(c.label) +
        '</span><strong class="text-text-primary">' + num(rules.weights[c.key], 2) + '%</strong></span>';
    }).join('<span class="text-text-muted">+</span>');
  }

  function perfFormulaText(rules) {
    return PERF_COMPONENTS.filter(function (c) { return Number(rules.weights[c.key]) > 0; }).map(function (c) {
      return c.label + ' ' + num(rules.weights[c.key], 2) + '%';
    }).join(' + ');
  }

  function spTone(level) {
    return level === 'SP3' ? 'pill-danger' : level === 'SP2' ? 'pill-maroon' : level === 'SP1' ? 'pill-warning' : 'pill-neutral';
  }

  function spPill(level, remarks) {
    if (!level && !remarks) return '<span class="text-text-muted">-</span>';
    return '<span class="pill ' + spTone(level) + ' !text-[11px] !px-2 max-w-[140px]" title="' + esc(remarks || 'No remarks') + '">' +
      (level ? esc(level) : 'Remarks') + (remarks ? '<span class="material-symbols-outlined text-[14px]">sticky_note_2</span>' : '') + '</span>';
  }

  function evalSpCell(r) {
    var level = r.spLevel || '';
    var remarks = r.remarks || '';
    if (!level && !remarks) return '<span class="text-text-muted">-</span>';
    return '<div class="flex flex-col items-start gap-1 min-w-0">' +
      '<span class="pill ' + spTone(level) + ' !text-[11px] !px-2">' +
        '<span class="material-symbols-outlined text-[14px]">' + (level ? 'warning' : 'sticky_note_2') + '</span>' +
        (level ? esc(level) : 'Note') + '</span>' +
      (remarks
        ? '<p class="sp-remarks" title="' + esc(remarks) + '">' + esc(remarks) + '</p>'
        : '<p class="text-[11px] text-text-muted">No remarks</p>') +
    '</div>';
  }

  function evalKey(nik, position, department) {
    var t = function (v) { return String(v === null || v === undefined ? '' : v).trim(); };
    return t(nik) + '|' + (t(position) + '|' + t(department)).toLowerCase();
  }

  function initEvaluation() {
    if (!S.evalYear) S.evalYear = S.user.year;
    wireFileDrop($('ei-drop'), $('ei-file'), onEvalUploadFile);
    if (S.evaluation && S.evaluation.year === S.evalYear) renderEvaluation();
    loadEvaluation();
  }

  function loadEvaluation() {
    var year = S.evalYear || S.user.year;
    var cached = S.evaluation && S.evaluation.year === year;
    if (!cached) {
      if (!($('eval-year').options || []).length) {
        $('eval-year').innerHTML = '<option value="' + year + '">FY' + year + '</option>';
      }
      $('eval-actions').innerHTML = '';
      $('eval-state').innerHTML = '';
      $('eval-banner').innerHTML = '';
      $('eval-rules').innerHTML = '<div class="skeleton h-6 w-2/3"></div>';
      $('eval-stats').innerHTML = [0, 1, 2, 3].map(function () { return '<div class="skeleton h-[148px] w-full"></div>'; }).join('');
      renderEvalHead();
      $('eval-tbody').innerHTML = skeletonRows(EVAL_COLS, 6);
      $('eval-pagination').innerHTML = '';
    }

    api('getPerformanceEvaluation', year)
      .then(function (data) {
        if (data.year !== (S.evalYear || S.user.year)) return;
        S.evaluation = data;
        fillEvalFilters();
        renderEvaluation();
      })
      .catch(function (err) {
        if (!cached) {
          $('eval-rules').innerHTML = '';
          $('eval-stats').innerHTML = '';
          $('eval-tbody').innerHTML =
            '<tr><td colspan="' + EVAL_COLS + '" class="text-center text-status-danger py-space-xl">' + esc(err.message) + '</td></tr>';
        }
        toast(err.message, 'error');
      });
  }

  function fillEvalFilters() {
    var d = S.evaluation;
    var years = (d.years && d.years.length ? d.years : [d.year]).slice();
    if (years.indexOf(d.year) === -1) years.unshift(d.year);
    years.sort(function (a, b) { return b - a; });
    $('eval-year').innerHTML = years.map(function (y) {
      return '<option value="' + y + '">FY' + y + (y === d.activeYear ? ' (Active)' : '') + '</option>';
    }).join('');
    $('eval-year').value = String(d.year);

    var div = $('eval-division');
    var keep = div.value;
    div.innerHTML = '<option value="">All Divisions</option>' + d.divisions.map(function (v) {
      return '<option value="' + esc(v) + '">' + esc(v) + '</option>';
    }).join('');
    div.value = d.divisions.indexOf(keep) > -1 ? keep : '';
    fillEvalDepartments();
  }

  function fillEvalDepartments() {
    var d = S.evaluation;
    if (!d) return;
    var division = $('eval-division').value;
    var list = distinct(d.rows.filter(function (r) { return !division || r.Division === division; }), 'Department');
    var sel = $('eval-department');
    var keep = sel.value;
    sel.innerHTML = '<option value="">All Departments</option>' + list.map(function (v) {
      return '<option value="' + esc(v) + '">' + esc(v) + '</option>';
    }).join('');
    sel.value = list.indexOf(keep) > -1 ? keep : '';
  }

  function onEvalYearChange() {
    var year = parseInt($('eval-year').value, 10);
    if (!year || year === S.evalYear) return;
    S.evalYear = year;
    S.evalPage = 1;
    S.evaluation = null;
    S.evalUpload = null;
    S.evalUploadOpen = null;
    loadEvaluation();
  }

  function onEvalDivisionChange() {
    fillEvalDepartments();
    onEvalFilter();
  }

  function onEvalFilter() {
    S.evalPage = 1;
    if (S.evaluation) renderEvalBody();
  }

  function onEvalSearch() {
    clearTimeout(S.evalTimer);
    S.evalTimer = setTimeout(onEvalFilter, 200);
  }

  function resetEvalFilters() {
    ['eval-division', 'eval-department', 'eval-status', 'eval-search'].forEach(function (id) { $(id).value = ''; });
    S.evalSort = null;
    renderEvalHead();
    fillEvalDepartments();
    onEvalFilter();
  }

  function evalRows() {
    if (!S.evaluation) return [];
    var division = $('eval-division').value;
    var dept = $('eval-department').value;
    var status = $('eval-status').value;
    var q = ($('eval-search').value || '').trim().toLowerCase();

    var rows = S.evaluation.rows.filter(function (r) {
      if (division && r.Division !== division) return false;
      if (dept && r.Department !== dept) return false;
      if (status === 'complete' && !r.complete) return false;
      if (status === 'pending' && (r.complete || !isNum(r.avgKpi))) return false;
      if (status === 'nokpi' && isNum(r.avgKpi)) return false;
      if (status === 'sp' && !r.spLevel) return false;
      if (q && (r.Full_Name + ' ' + r.NIK).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });

    return sortedBy(rows, S.evalSort, evalSortValue);
  }

  function evalStats(rows) {
    var niks = {};
    var dist = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    var complete = 0;
    var sum = 0;
    var noKpi = 0;
    var sp = 0;
    rows.forEach(function (r) {
      niks[r.NIK] = true;
      if (r.complete) {
        complete++;
        sum += r.score;
        dist[r.grade]++;
      }
      if (!isNum(r.avgKpi)) noKpi++;
      if (r.spLevel) sp++;
    });
    return {
      total: rows.length,
      employees: Object.keys(niks).length,
      complete: complete,
      pending: rows.length - complete,
      noKpi: noKpi,
      sp: sp,
      avg: complete ? perfRound(sum / complete) : null,
      dist: dist
    };
  }

  function renderEvaluation() {
    if (!S.evaluation) return;
    renderEvalActions();
    renderEvalBanner();
    renderEvalRules();
    renderEvalHead();
    renderEvalBody();
  }

  function renderEvalBody() {
    var rows = evalRows();
    renderEvalStats(rows);
    renderEvalTable(rows);
    renderEvalUploadCard();
  }

  function renderEvalActions() {
    var rules = S.evaluation.rules;
    var released = rules.released;
    $('eval-state').innerHTML = released
      ? '<span class="pill pill-success"><span class="material-symbols-outlined text-[16px]">verified</span>FY' + rules.year + ' released</span>'
      : '<span class="pill pill-neutral" title="Employees cannot see Performance Scores for this year yet"><span class="material-symbols-outlined text-[16px]">edit_note</span>FY' + rules.year + ' draft</span>';
    $('eval-actions').innerHTML =
      '<button type="button" class="btn btn-secondary" onclick="MGI.loadEvaluation()" title="Reload data" aria-label="Reload data">' +
        '<span class="material-symbols-outlined text-[18px]">refresh</span></button>' +
      '<button type="button" class="btn btn-secondary" onclick="MGI.openEvalUpload()"' +
        (released ? ' disabled title="Released years are locked. Withdraw the release to upload."' : ' title="Upload scores for many scorecards from an Excel or CSV file"') + '>' +
        '<span class="material-symbols-outlined text-[18px]">upload_file</span> Upload Scores</button>' +
      '<button type="button" class="btn btn-secondary" onclick="MGI.openReportDownload(\'annual\')" title="Download a PDF report of this year to share with directors and HR">' +
        '<span class="material-symbols-outlined text-[18px]">picture_as_pdf</span> Download Report</button>' +
      '<button type="button" class="btn btn-secondary" onclick="MGI.exportEvalCsv()">' +
        '<span class="material-symbols-outlined text-[18px]">download</span> Export CSV</button>' +
      (released ? '' :
        '<button type="button" class="btn btn-primary" onclick="MGI.openEvalRelease()" title="Show the results to employees">' +
          '<span class="material-symbols-outlined text-[18px]">send</span> Release to Employees</button>');
  }

  function renderEvalBanner() {
    var d = S.evaluation;
    var rules = d.rules;
    if (!rules.released) {
      $('eval-banner').innerHTML = '';
      return;
    }
    $('eval-banner').innerHTML =
      '<div class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">' +
        '<span class="material-symbols-outlined text-status-success">lock</span>' +
        '<p class="text-body-sm text-status-success-text flex-1"><strong>FY' + d.year + ' results were released on ' + esc(fmtDate(rules.releasedAt)) +
          (rules.releasedBy ? ' by ' + esc(rules.releasedBy) : '') + '.</strong> Employees can see their Performance Score and Grade. ' +
          'Inputs and scoring rules stay locked until you withdraw the release.</p>' +
        '<button type="button" class="btn btn-secondary !py-1.5 shrink-0" onclick="MGI.openEvalRelease()">' +
          '<span class="material-symbols-outlined text-[18px]">undo</span> Withdraw Release</button>' +
      '</div>';
  }

  function renderEvalRules() {
    var rules = S.evaluation.rules;
    $('eval-rules').innerHTML =
      '<div class="flex flex-col xl:flex-row xl:items-center gap-3">' +
        '<div class="flex items-center gap-2 shrink-0">' +
          '<span class="material-symbols-outlined text-primary-container text-[20px]">calculate</span>' +
          '<span class="text-label-md font-semibold text-text-primary">FY' + rules.year + ' rules</span>' +
          (rules.saved ? '' : '<span class="pill pill-neutral !text-[11px] !px-2" title="No rules were saved for this year, so the defaults apply">Defaults</span>') +
        '</div>' +
        '<div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm">' + perfFormulaHtml(rules) + '</div>' +
        '<span class="hidden xl:block w-px h-6 bg-slate-200"></span>' +
        '<div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-label-xs">' + gradeLegendHtml(rules.grades) + '</div>' +
        '<button type="button" class="btn btn-secondary !py-1.5 !px-3 !text-label-sm xl:ml-auto shrink-0 self-start xl:self-auto" onclick="MGI.openPerformanceRules(' + rules.year + ')">' +
          '<span class="material-symbols-outlined text-[16px]">tune</span> ' + (rules.released ? 'View Rules' : 'Edit Rules') + '</button>' +
      '</div>';
  }

  function renderEvalHead() {
    var rules = S.evaluation ? S.evaluation.rules : null;
    var w = function (key) {
      if (!rules) return '';
      var weight = Number(rules.weights[key]) || 0;
      return '<span class="block text-[11px] font-medium normal-case tracking-normal text-text-muted">' +
        (weight ? num(weight, 2) + '% weight' : 'not counted') + '</span>';
    };
    var sort = S.evalSort;
    $('eval-thead').innerHTML = '<tr>' +
      sortHead('Employee', 'name', sort, 'sortEvaluation', 'min-w-[280px]') +
      sortHead('Avg KPI', 'avg', sort, 'sortEvaluation', 'text-right !px-3', w('kpi')) +
      sortHead('KBI', 'kbi', sort, 'sortEvaluation', 'text-right', w('kbi')) +
      sortHead('360', 's360', sort, 'sortEvaluation', 'text-right', w('s360')) +
      sortHead('Discipline', 'discipline', sort, 'sortEvaluation', 'text-right !px-3', w('discipline')) +
      sortHead('Performance Score', 'score', sort, 'sortEvaluation', 'text-right !px-3 !whitespace-normal leading-tight min-w-[104px]') +
      sortHead('Grade', 'grade', sort, 'sortEvaluation', 'text-center !px-3') +
      sortHead('SP Warning', 'sp', sort, 'sortEvaluation', 'min-w-[140px]') +
      '<th class="text-right">Actions</th>' +
    '</tr>';
  }

  var EVAL_SORT_FIELDS = { avg: 'avgKpi', kbi: 'kbi', s360: 's360', discipline: 'discipline', score: 'score' };

  function evalSortValue(r, key) {
    if (key === 'name') return r.Full_Name;
    if (key === 'grade') return GRADES.indexOf(r.grade) > -1 ? GRADES.indexOf(r.grade) : null;
    if (key === 'sp') return SP_OPTIONS.indexOf(r.spLevel) > 0 ? SP_OPTIONS.indexOf(r.spLevel) : null;
    var v = r[EVAL_SORT_FIELDS[key]];
    return isNum(v) ? v : null;
  }

  function sortEvaluation(key) {
    S.evalSort = nextSort(S.evalSort, key, key === 'name' || key === 'grade' ? 1 : -1);
    S.evalPage = 1;
    renderEvalHead();
    if (S.evaluation) renderEvalBody();
  }

  function renderEvalStats(rows) {
    var st = evalStats(rows);
    var d = S.evaluation;
    var avgGrade = perfGrade(st.avg, d.rules.grades);

    var dist = GRADES.map(function (g) {
      return '<div class="flex flex-col items-center gap-1 min-w-0">' + gradeBadge(g) +
        '<span class="text-body-md font-bold tabular-nums ' + (st.dist[g] ? 'text-text-primary' : 'text-text-muted') + '">' + st.dist[g] + '</span></div>';
    }).join('');
    var distBar = GRADES.map(function (g) {
      return st.dist[g] ? '<div class="h-full" style="width:' + (st.dist[g] / st.complete * 100) + '%;background:' + GRADE_COLORS[g] + '" title="Grade ' + g + ': ' + st.dist[g] + '"></div>' : '';
    }).join('');

    $('eval-stats').innerHTML =
      statCard('Scorecards', 'badge', 'text-text-primary', st.total, st.total === 1 ? 'Scorecard' : 'Scorecards',
        plural(st.employees, 'employee') + ' in this view, FY' + d.year,
        '', 0) +

      statCard('Inputs Complete', 'task_alt', st.pending ? 'text-status-warning' : 'text-status-success',
        st.complete, 'of ' + st.total,
        !st.total ? 'No scorecards in this view'
          : st.pending ? st.pending + ' pending' + (st.noKpi ? ', ' + st.noKpi + ' still without a KPI score' : '')
          : 'Every scorecard has a Performance Score',
        'bg-status-success', st.total ? st.complete / st.total * 100 : 0) +

      statCard('Average Performance Score', 'monitoring', 'text-text-primary',
        st.avg === null ? '-' : scoreText(st.avg), st.avg === null ? '' : 'of 100',
        st.avg === null ? 'No complete scorecard yet' : 'Grade ' + avgGrade + ' on average across ' + st.complete + ' complete scorecards',
        'bg-status-info', st.avg || 0) +

      '<div class="bg-surface-card rounded-xl p-5 shadow-level-1 border border-border-light flex flex-col justify-between transition-all duration-150 hover:shadow-level-2">' +
        '<div class="flex items-center justify-between gap-3 mb-3">' +
          '<span class="text-sm font-medium text-slate-500">Grade Distribution</span>' +
          '<div class="w-9 h-9 rounded-lg bg-slate-50 ring-1 ring-slate-200/70 flex items-center justify-center text-slate-600">' +
            '<span class="material-symbols-outlined text-[20px]">leaderboard</span></div>' +
        '</div>' +
        '<div class="grid grid-cols-5 gap-1.5">' + dist + '</div>' +
        '<div class="flex w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">' + distBar + '</div>' +
      '</div>';
  }

  function evalInputCell(r, key, released) {
    var rules = S.evaluation.rules;
    var weight = Number(rules.weights[key]) || 0;
    var v = r[key];
    if (isNum(v)) return '<span class="font-semibold text-text-primary tabular-nums">' + num(v, 2) + '</span>';
    if (!weight) return '<span class="text-text-muted" title="Weight is 0% in FY' + rules.year + '">n/a</span>';
    if (released) return '<span class="text-text-muted">-</span>';
    var c = perfComponent(key);
    return '<button type="button" class="eval-add" onclick="MGI.openEvalEdit(\'' + esc(r.Eval_ID) + '\', \'' + key + '\')" title="Add the ' + esc(c.label) + ' score">' +
      '<span class="material-symbols-outlined text-[14px]">add</span>Add</button>';
  }

  function evalScoreCell(r) {
    if (r.complete) {
      return '<div class="flex flex-col items-end gap-1">' +
        '<span class="text-body-md font-bold text-text-primary tabular-nums">' + scoreText(r.score) + '</span>' +
        '<span class="block w-16 h-1 rounded-full bg-slate-100 overflow-hidden"><span class="block h-full rounded-full" style="width:' +
          Math.min(100, Math.max(0, r.score)) + '%;background:' + GRADE_COLORS[r.grade] + '"></span></span>' +
      '</div>';
    }
    if (!isNum(r.avgKpi)) {
      return '<div class="flex flex-col items-end gap-0.5"><span class="pill pill-neutral !text-[11px] !px-2">No KPI score</span>' +
        '<span class="text-[11px] text-text-muted">No counted month yet</span></div>';
    }
    return '<div class="flex flex-col items-end gap-0.5"><span class="pill pill-warning !text-[11px] !px-2">' +
      '<span class="material-symbols-outlined text-[14px]">hourglass_top</span>Pending</span>' +
      '<span class="block max-w-[128px] text-[11px] leading-tight text-text-muted">Needs ' + esc(r.missing.join(', ')) + '</span></div>';
  }

  function evalRowHtml(r, released, year) {
    var tags = (r.isHome ? '' : '<span class="pill pill-maroon !py-0 !px-1.5 !text-[11px]" title="Additional role">Additional</span>') +
               (r.roleInactive ? '<span class="pill pill-neutral !py-0 !px-1.5 !text-[11px]" title="Inactive role">Inactive</span>' : '');
    return '<tr>' +
      '<td class="!py-3">' +
        '<div class="flex items-center gap-3 min-w-0">' +
          '<span class="emp-avatar">' + esc(r.Initials || initials(r.Full_Name)) + '</span>' +
          '<div class="flex flex-col min-w-0">' +
            nameLink(r.Full_Name, r.NIK, r.roleKey, year, 'text-body-md font-semibold truncate') +
            '<span class="text-label-xs text-text-secondary">' + esc(r.Position) + ' / ' + esc(r.Department) + '</span>' +
            '<span class="text-[11px] text-text-muted whitespace-nowrap">NIK ' + esc(r.NIK) + (r.Division ? ' • ' + esc(r.Division) : '') + '</span>' +
            (tags ? '<span class="flex items-center gap-1 flex-wrap mt-0.5">' + tags + '</span>' : '') +
          '</div>' +
        '</div>' +
      '</td>' +
      '<td class="!py-3 text-right whitespace-nowrap">' +
        (isNum(r.avgKpi)
          ? '<span class="font-semibold tabular-nums text-status-' + band(r.avgKpi).key + '-text">' + num(r.avgKpi, 2) + '%</span>' +
            '<span class="block text-[11px] text-text-muted">' + r.kpiMonths + (r.kpiMonths === 1 ? ' month' : ' months') + '</span>'
          : '<span class="text-text-muted">-</span>') +
      '</td>' +
      '<td class="!py-3 text-right whitespace-nowrap">' + evalInputCell(r, 'kbi', released) + '</td>' +
      '<td class="!py-3 text-right whitespace-nowrap">' + evalInputCell(r, 's360', released) + '</td>' +
      '<td class="!py-3 text-right whitespace-nowrap">' + evalInputCell(r, 'discipline', released) + '</td>' +
      '<td class="!py-3 text-right">' + evalScoreCell(r) + '</td>' +
      '<td class="!py-3 text-center">' + gradeBadge(r.grade) + '</td>' +
      '<td class="!py-3">' + evalSpCell(r) + '</td>' +
      '<td class="!py-3 text-right whitespace-nowrap">' +
        '<button type="button" class="btn-icon" onclick="MGI.openEvalEdit(\'' + esc(r.Eval_ID) + '\')" title="' + (released ? 'View inputs' : 'Edit inputs') +
          '" aria-label="' + (released ? 'View inputs for ' : 'Edit inputs for ') + esc(r.Full_Name) + '">' +
          '<span class="material-symbols-outlined text-[20px]">' + (released ? 'visibility' : 'edit_square') + '</span></button>' +
        '<button type="button" class="btn-icon" onclick="MGI.openPerformanceReport(\'' + esc(r.NIK) + '\', \'' + esc(r.roleKey) + '\', ' + year + ', \'modal\')"' +
          ' title="Open performance report" aria-label="Open performance report for ' + esc(r.Full_Name) + '">' +
          '<span class="material-symbols-outlined text-[20px]">description</span></button>' +
      '</td>' +
    '</tr>';
  }

  function renderEvalTable(all) {
    var d = S.evaluation;
    var size = pageSizeFor('eval', all.length);
    var pages = Math.max(1, Math.ceil(all.length / size));
    if (S.evalPage > pages) S.evalPage = pages;
    var start = (S.evalPage - 1) * size;
    var page = all.slice(start, start + size);
    var released = d.rules.released;

    $('eval-table-note').textContent = released
      ? 'FY' + d.year + ' is released, so inputs are read-only.'
      : 'Select Add or the edit icon to enter KBI, 360, Discipline, and SP. Scores update as soon as you save.';

    if (!all.length) {
      $('eval-tbody').innerHTML =
        '<tr><td colspan="' + EVAL_COLS + '" class="text-center py-space-2xl">' +
          '<span class="material-symbols-outlined text-[40px] text-text-muted">' + (d.rows.length ? 'search_off' : 'assignment_ind') + '</span>' +
          '<p class="text-body-md text-text-secondary mt-2">' +
            (d.rows.length ? 'No scorecards match these filters.'
                           : 'No scorecards for FY' + d.year + ' yet. They appear once employees are mapped to KPIs for this year.') + '</p>' +
          (d.rows.length ? '<button type="button" class="btn btn-secondary !py-1.5 mt-space-md" onclick="MGI.resetEvalFilters()">' +
            '<span class="material-symbols-outlined text-[18px]">filter_alt_off</span> Reset Filters</button>' : '') +
        '</td></tr>';
      $('eval-pagination').innerHTML = '';
      return;
    }

    $('eval-tbody').innerHTML = page.map(function (r) { return evalRowHtml(r, released, d.year); }).join('');
    renderPagination('eval-pagination', all.length, start, page.length, S.evalPage, size, 'eval');
  }

  function openPerformanceRules(year) {
    S.perfYear = parseInt(year, 10) || S.user.year;
    S.perfDraft = null;
    S.settingsTab = 'performance';
    go('settings');
  }

  function evalRowById(id) {
    if (!S.evaluation) return null;
    return S.evaluation.rows.filter(function (r) { return r.Eval_ID === id; })[0] || null;
  }

  function mergeEvalRow(row) {
    if (!S.evaluation || !row) return;
    S.evaluation.rows = S.evaluation.rows.map(function (r) { return r.Eval_ID === row.Eval_ID ? row : r; });
  }

  function evalWithInputs(r, inputs) {
    var res = perfCompute(r.avgKpi, inputs, S.evaluation.rules);
    var out = {};
    Object.keys(r).forEach(function (k) { out[k] = r[k]; });
    out.kbi = inputs.kbi;
    out.s360 = inputs.s360;
    out.discipline = inputs.discipline;
    out.score = res.score;
    out.grade = res.grade;
    out.complete = res.complete;
    out.missing = res.missing;
    out.parts = res.parts;
    return out;
  }

  function evalDraftOf(r) {
    var text = function (v) { return isNum(v) ? String(v) : ''; };
    return { kbi: text(r.kbi), s360: text(r.s360), discipline: text(r.discipline), spLevel: r.spLevel || '', remarks: r.remarks || '' };
  }

  function evalDirty() {
    var e = S.evalEdit;
    if (!e) return false;
    return ['kbi', 's360', 'discipline', 'spLevel', 'remarks'].some(function (k) {
      return String(e.draft[k]).trim() !== String(e.original[k]).trim();
    });
  }

  function evalDraftInputs() {
    var d = S.evalEdit.draft;
    var out = { values: {}, errors: {} };
    PERF_COMPONENTS.forEach(function (c) {
      if (!c.field) return;
      var res = perfScoreInput(d[c.key], c.label + ' Score');
      out.values[c.key] = res.value;
      if (res.error) out.errors[c.key] = res.error;
    });
    if (d.remarks.length > REMARKS_MAX) out.errors.remarks = 'Remarks SP can hold at most ' + REMARKS_MAX + ' characters.';
    return out;
  }

  function evalNextId() {
    var e = S.evalEdit;
    if (!e) return null;
    var list = evalRows();
    for (var n = 0; n < list.length; n++) {
      if (list[n].Eval_ID === e.id) return list[n + 1] ? list[n + 1].Eval_ID : null;
    }
    return null;
  }

  function openEvalEdit(id, focusKey) {
    var r = evalRowById(id);
    if (!r) return;
    S.evalEdit = { id: id, original: evalDraftOf(r), draft: evalDraftOf(r), confirm: '', saving: false };
    renderEvalEdit(focusKey);
  }

  function renderEvalEdit(focusKey) {
    var e = S.evalEdit;
    var r = e ? evalRowById(e.id) : null;
    if (!r) return;
    var d = S.evaluation;
    var rules = d.rules;
    var locked = rules.released;
    var list = evalRows();
    var at = -1;
    list.forEach(function (x, n) { if (x.Eval_ID === r.Eval_ID) at = n; });

    var field = function (c) {
      var weight = Number(rules.weights[c.key]) || 0;
      return '<div class="rounded-xl border border-border-light bg-white p-3 flex flex-col gap-2">' +
        '<div class="flex items-center justify-between gap-2">' +
          '<label for="ev-' + c.key + '" class="text-label-md font-semibold text-text-primary">' + esc(c.label) + ' Score</label>' +
          '<span class="pill pill-neutral !text-[11px] !px-2">' + (weight ? num(weight, 2) + '% weight' : 'Not counted') + '</span>' +
        '</div>' +
        '<div class="relative">' +
          '<input id="ev-' + c.key + '" type="text" inputmode="decimal" autocomplete="off" class="field !pr-14 text-right tabular-nums font-semibold"' +
            ' placeholder="0 to 100" value="' + esc(e.draft[c.key]) + '"' + (locked ? ' disabled' : '') +
            ' oninput="MGI.onEvalInput()" onkeydown="if(event.key===\'Enter\'){event.preventDefault();MGI.submitEvalEdit();}">' +
          '<span class="absolute right-3 top-1/2 -translate-y-1/2 text-label-sm text-text-muted pointer-events-none">/ 100</span>' +
        '</div>' +
        '<p id="ev-' + c.key + '-note" class="text-label-xs text-text-muted"></p>' +
      '</div>';
    };

    var avgWeight = Number(rules.weights.kpi) || 0;
    var avgBox =
      '<div class="rounded-xl border border-border-light bg-surface-page p-3 flex flex-col gap-1">' +
        '<div class="flex items-center justify-between gap-2">' +
          '<span class="text-label-md font-semibold text-text-primary">Avg KPI Score</span>' +
          '<span class="pill pill-neutral !text-[11px] !px-2">' + (avgWeight ? num(avgWeight, 2) + '% weight' : 'Not counted') + '</span>' +
        '</div>' +
        '<p class="text-headline-md font-bold tabular-nums ' + (isNum(r.avgKpi) ? 'text-status-' + band(r.avgKpi).key + '-text' : 'text-text-muted') + '">' +
          (isNum(r.avgKpi) ? num(r.avgKpi, 2) : '-') + '</p>' +
        '<p class="text-label-xs text-text-muted">' + (isNum(r.avgKpi)
          ? 'Calculated automatically from ' + r.kpiMonths + ' counted ' + (r.kpiMonths === 1 ? 'month' : 'months') + ' of KPI submissions.'
          : 'No counted month has a KPI score yet, so the result stays Pending.') + '</p>' +
      '</div>';

    var sp =
      '<div class="rounded-xl border border-border-light bg-white p-3 flex flex-col gap-3">' +
        '<div>' +
          '<p class="text-label-md font-semibold text-text-primary">Warning letter (SP)</p>' +
          '<p class="text-label-xs text-text-muted">It does not change the score or grade. The employee and report viewers see the level and Remarks SP after release.</p>' +
        '</div>' +
        '<div id="ev-sp" class="seg self-start" role="radiogroup" aria-label="SP level">' + SP_OPTIONS.map(function (lv) {
          var on = e.draft.spLevel === lv;
          return '<button type="button" class="seg-btn' + (on ? ' is-active' : '') + '" data-sp="' + lv + '" role="radio" aria-checked="' + (on ? 'true' : 'false') + '"' +
            (locked ? ' disabled' : '') + ' onclick="MGI.setEvalSp(\'' + lv + '\')">' + (lv || 'None') + '</button>';
        }).join('') + '</div>' +
        '<div>' +
          '<label for="ev-remarks" class="form-label">Remarks SP</label>' +
          '<textarea id="ev-remarks" rows="3" maxlength="' + REMARKS_MAX + '" class="field" placeholder="Letter number, date, and reason"' +
            (locked ? ' disabled' : '') + ' oninput="MGI.onEvalInput()">' + esc(e.draft.remarks) + '</textarea>' +
          '<p class="text-label-xs text-text-muted text-right mt-1"><span id="ev-remarks-count">' + e.draft.remarks.length + '</span> / ' + REMARKS_MAX + '</p>' +
        '</div>' +
      '</div>';

    $('modal-host').innerHTML =
      '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closeEvalEdit()">' +
        '<div class="modal-panel modal-panel-wide !max-w-5xl" role="dialog" aria-modal="true" aria-labelledby="ev-title">' +
          '<div class="px-6 py-5 border-b border-border-light flex items-start gap-4">' +
            '<span class="emp-avatar !w-11 !h-11 !text-[13px]">' + esc(r.Initials || initials(r.Full_Name)) + '</span>' +
            '<div class="min-w-0 flex-1">' +
              '<h2 id="ev-title" class="text-title-lg text-text-primary truncate">' + esc(r.Full_Name) + '</h2>' +
              '<p class="text-body-sm text-text-muted">NIK ' + esc(r.NIK) + ' • ' + esc(r.Position) + ' / ' + esc(r.Department) + ' • FY' + d.year + '</p>' +
              (at > -1 ? '<p class="text-label-xs text-text-muted mt-0.5">Scorecard ' + (at + 1) + ' of ' + list.length + ' in the current list</p>' : '') +
            '</div>' +
            '<button type="button" class="btn-icon" onclick="MGI.closeEvalEdit()" title="Close" aria-label="Close"><span class="material-symbols-outlined">close</span></button>' +
          '</div>' +
          (locked
            ? '<div class="mx-6 mt-5 rounded-lg bg-status-success-subtle text-status-success-text text-body-sm px-3 py-2 flex items-center gap-2">' +
                '<span class="material-symbols-outlined text-[18px]">lock</span>FY' + d.year + ' results are released, so these inputs are read-only.</div>'
            : '') +
          '<div class="p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">' +
            '<div class="lg:col-span-3 flex flex-col gap-4">' +
              '<div>' +
                '<h3 class="text-title-md text-text-primary">Component scores</h3>' +
                '<p class="text-body-sm text-text-muted">Enter each processed result from 0 to 100. Leave a field empty until its result is ready. The score stays Pending until every counted component is filled.</p>' +
              '</div>' +
              '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' + avgBox +
                PERF_COMPONENTS.filter(function (c) { return !!c.field; }).map(field).join('') + '</div>' +
              sp +
            '</div>' +
            '<div class="lg:col-span-2 flex flex-col gap-2">' +
              '<h3 class="text-title-md text-text-primary">Live result</h3>' +
              '<div id="ev-result" aria-live="polite"></div>' +
            '</div>' +
          '</div>' +
          '<div id="ev-footer" class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex flex-wrap items-center justify-end gap-2"></div>' +
        '</div>' +
      '</div>';

    renderEvalResult();
    renderEvalFooter();

    if (locked) return;
    var target = focusKey && $('ev-' + focusKey) ? focusKey
      : ['kbi', 's360', 'discipline'].filter(function (k) { return !e.draft[k] && Number(rules.weights[k]) > 0; })[0] || 'kbi';
    var input = $('ev-' + target);
    if (input && input.focus) input.focus();
  }

  function renderEvalResult() {
    var e = S.evalEdit;
    var r = e ? evalRowById(e.id) : null;
    if (!r || !$('ev-result')) return;
    var rules = S.evaluation.rules;
    var parsed = evalDraftInputs();
    var res = perfCompute(r.avgKpi, parsed.values, rules);

    PERF_COMPONENTS.forEach(function (c) {
      if (!c.field) return;
      var note = $('ev-' + c.key + '-note');
      var input = $('ev-' + c.key);
      var err = parsed.errors[c.key];
      var part = res.parts.filter(function (p) { return p.key === c.key; })[0];
      if (input && input.classList) input.classList.toggle('is-invalid', !!err);
      if (!note) return;
      note.className = 'text-label-xs ' + (err ? 'text-status-danger-text' : 'text-text-muted');
      note.textContent = err ? err
        : !part.required ? 'Weight is 0% in FY' + rules.year + ', so it is not counted.'
        : isNum(part.points) ? 'Adds ' + num(part.points, 2) + ' points to the score.'
        : 'Leave empty until the result is ready.';
    });

    var rows = res.parts.filter(function (p) { return p.required; }).map(function (p) {
      return '<tr>' +
        '<td class="py-1.5 text-text-secondary">' + esc(p.label) + '</td>' +
        '<td class="py-1.5 text-right tabular-nums">' + (isNum(p.value) ? num(p.value, 2) : '<span class="text-status-warning-text">Missing</span>') + '</td>' +
        '<td class="py-1.5 text-right tabular-nums text-text-muted">' + num(p.weight, 2) + '%</td>' +
        '<td class="py-1.5 text-right tabular-nums font-semibold">' + (isNum(p.points) ? num(p.points, 2) : '-') + '</td>' +
      '</tr>';
    }).join('');

    $('ev-result').innerHTML =
      '<div class="rounded-xl border ' + (res.complete ? GRADE_TINTS[res.grade] : 'border-dashed border-border-medium bg-surface-page') + ' p-4 flex flex-col gap-4">' +
        '<div class="flex items-center justify-between gap-3">' +
          '<div class="min-w-0">' +
            '<p class="text-label-xs uppercase tracking-wider text-text-muted">Performance Score</p>' +
            '<p class="text-[34px] leading-10 font-bold tabular-nums ' + (res.complete ? 'text-text-primary' : 'text-text-muted') + '">' +
              (res.complete ? scoreText(res.score) : 'Pending') + '</p>' +
            (res.complete ? '<p class="text-label-xs text-text-muted">out of 100</p>'
              : Object.keys(parsed.errors).length ? '<p class="text-label-xs text-status-danger-text">Fix the highlighted fields</p>'
              : '<p class="text-label-xs text-status-warning-text">Needs ' + esc(res.missing.join(', ')) + '</p>') +
          '</div>' +
          '<div class="flex flex-col items-center gap-1 shrink-0">' +
            '<span class="text-label-xs uppercase tracking-wider text-text-muted">Grade</span>' + gradeBadge(res.grade, 'lg') +
          '</div>' +
        '</div>' +
        '<table class="w-full text-body-sm">' +
          '<thead><tr class="text-[11px] uppercase tracking-wider text-text-muted">' +
            '<th class="text-left font-semibold pb-1">Component</th><th class="text-right font-semibold pb-1">Score</th>' +
            '<th class="text-right font-semibold pb-1">Weight</th><th class="text-right font-semibold pb-1">Points</th></tr></thead>' +
          '<tbody class="divide-y divide-slate-100">' + rows + '</tbody>' +
          '<tfoot><tr class="border-t-2 border-slate-200"><td class="pt-2 font-semibold text-text-primary" colspan="3">Performance Score</td>' +
            '<td class="pt-2 text-right font-bold tabular-nums text-text-primary">' + (res.complete ? scoreText(res.score) : '-') + '</td></tr></tfoot>' +
        '</table>' +
        '<div class="flex flex-col gap-2">' + gradeScaleHtml(rules.grades, res.score, false) +
          '<div class="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px]">' + gradeLegendHtml(rules.grades) + '</div></div>' +
      '</div>';

    if ($('ev-remarks-count')) $('ev-remarks-count').textContent = e.draft.remarks.length;
  }

  function renderEvalFooter() {
    var e = S.evalEdit;
    var r = e ? evalRowById(e.id) : null;
    var host = $('ev-footer');
    if (!r || !host) return;
    var locked = S.evaluation.rules.released;
    var parsed = evalDraftInputs();
    var hasErrors = Object.keys(parsed.errors).length > 0;
    var dirty = evalDirty();
    var next = evalNextId();
    var meta = '<p class="text-label-xs text-text-muted">' + (r.updatedAt
      ? 'Last updated ' + esc(fmtDate(r.updatedAt)) + (r.updatedBy ? ' by ' + esc(r.updatedBy) : '')
      : 'No inputs saved yet') + '</p>';

    if (locked) {
      host.innerHTML = '<div class="mr-auto">' + meta + '</div>' +
        '<button type="button" class="btn btn-secondary" onclick="MGI.closeEvalEdit(true)">Close</button>';
      return;
    }
    if (e.confirm === 'discard') {
      host.innerHTML =
        '<p class="mr-auto text-body-sm font-medium text-status-warning-text flex items-center gap-1.5"><span class="material-symbols-outlined text-[18px]">warning</span>Discard the changes you typed?</p>' +
        '<button type="button" class="btn btn-secondary" onclick="MGI.cancelEvalConfirm()">Keep Editing</button>' +
        '<button type="button" class="btn btn-danger" onclick="MGI.closeEvalEdit(true)">Discard</button>';
      return;
    }
    if (e.confirm === 'clear') {
      host.innerHTML =
        '<p class="mr-auto text-body-sm font-medium text-status-danger-text flex items-center gap-1.5"><span class="material-symbols-outlined text-[18px]">delete</span>Clear KBI, 360, Discipline, and SP for this scorecard?</p>' +
        '<button type="button" class="btn btn-secondary" onclick="MGI.cancelEvalConfirm()">Cancel</button>' +
        '<button id="ev-clear-confirm" type="button" class="btn btn-danger" onclick="MGI.confirmEvalClear()">Clear Inputs</button>';
      return;
    }

    host.innerHTML =
      '<div class="mr-auto flex flex-wrap items-center gap-3">' + meta +
        (r.updatedAt ? '<button type="button" class="text-label-sm font-semibold text-status-danger-text rounded-md px-1.5 py-0.5 transition-all duration-150 hover:bg-status-danger-subtle" onclick="MGI.askEvalClear()">Clear inputs</button>' : '') +
      '</div>' +
      '<button type="button" class="btn btn-secondary" onclick="MGI.closeEvalEdit()">Cancel</button>' +
      '<button id="ev-save" type="button" class="btn ' + (next ? 'btn-secondary' : 'btn-primary') + '" onclick="MGI.saveEvalEdit(false)"' +
        (e.saving || hasErrors || !dirty ? ' disabled' : '') + '><span class="material-symbols-outlined text-[18px]">save</span> Save</button>' +
      (next
        ? '<button id="ev-save-next" type="button" class="btn btn-primary" onclick="MGI.saveEvalEdit(true)"' + (e.saving || hasErrors ? ' disabled' : '') +
            ' title="' + (dirty ? 'Save and open the next scorecard' : 'Open the next scorecard') + '">' + (dirty ? 'Save &amp; Next' : 'Next') +
            ' <span class="material-symbols-outlined text-[18px]">arrow_forward</span></button>'
        : '');
  }

  function onEvalInput() {
    var e = S.evalEdit;
    if (!e) return;
    PERF_COMPONENTS.forEach(function (c) {
      if (c.field && $('ev-' + c.key)) e.draft[c.key] = $('ev-' + c.key).value;
    });
    if ($('ev-remarks')) e.draft.remarks = $('ev-remarks').value;
    e.confirm = '';
    renderEvalResult();
    renderEvalFooter();
  }

  function setEvalSp(level) {
    var e = S.evalEdit;
    if (!e || S.evaluation.rules.released) return;
    e.draft.spLevel = level;
    e.confirm = '';
    document.querySelectorAll('#ev-sp [data-sp]').forEach(function (b) {
      var on = b.dataset.sp === level;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    renderEvalFooter();
  }

  function submitEvalEdit() {
    saveEvalEdit(!!evalNextId());
  }

  function saveEvalEdit(goNext) {
    var e = S.evalEdit;
    var r = e ? evalRowById(e.id) : null;
    if (!r || e.saving || S.evaluation.rules.released) return;
    var next = goNext ? evalNextId() : null;
    var parsed = evalDraftInputs();
    var firstError = Object.keys(parsed.errors)[0];
    if (firstError) {
      toast(parsed.errors[firstError], 'error');
      var bad = $('ev-' + firstError);
      if (bad && bad.focus) bad.focus();
      return;
    }
    if (!evalDirty()) {
      if (next) openEvalEdit(next);
      else closeEvalEdit(true);
      return;
    }

    var year = S.evaluation.year;
    var entry = {
      NIK: r.NIK, Position: r.Position, Department: r.Department,
      KBI_Score: e.draft.kbi, Score_360: e.draft.s360, Discipline_Score: e.draft.discipline,
      SP_Level: e.draft.spLevel, Remarks_SP: e.draft.remarks
    };
    e.saving = true;
    renderEvalFooter();
    var btn = $(next ? 'ev-save-next' : 'ev-save');
    var restore = btn ? busy(btn, 'Saving') : function () {};

    api('savePerformanceInput', year, entry)
      .then(function (res) {
        var rec = res.record || null;
        var updated = evalWithInputs(r, { kbi: rec ? rec.kbi : null, s360: rec ? rec.s360 : null, discipline: rec ? rec.discipline : null });
        updated.spLevel = rec ? rec.spLevel : '';
        updated.remarks = rec ? rec.remarks : '';
        updated.updatedAt = rec ? rec.updatedAt : '';
        updated.updatedBy = rec ? rec.updatedBy : '';
        mergeEvalRow(updated);
        delete S.reports[r.NIK + '|' + year];
        toast(res.message + (res.changed && updated.complete
          ? ' Performance Score ' + scoreText(updated.score) + ', Grade ' + updated.grade + '.'
          : res.changed ? ' Still needs ' + updated.missing.join(', ') + '.' : ''), 'success');
        if (S.evaluation && S.evaluation.year === year) renderEvalBody();
        if (S.evalEdit !== e) return;
        if (next && evalRowById(next)) openEvalEdit(next);
        else closeEvalEdit(true);
      })
      .catch(function (err) {
        e.saving = false;
        restore();
        renderEvalFooter();
        toast(err.message, 'error');
      });
  }

  function askEvalClear() {
    if (!S.evalEdit) return;
    S.evalEdit.confirm = 'clear';
    renderEvalFooter();
  }

  function cancelEvalConfirm() {
    if (!S.evalEdit) return;
    S.evalEdit.confirm = '';
    renderEvalFooter();
  }

  function confirmEvalClear() {
    var e = S.evalEdit;
    var r = e ? evalRowById(e.id) : null;
    if (!r) return;
    var year = S.evaluation.year;
    var restore = busy($('ev-clear-confirm'), 'Clearing');

    api('clearPerformanceInput', year, r.NIK, r.Position, r.Department)
      .then(function (res) {
        var cleared = evalWithInputs(r, { kbi: null, s360: null, discipline: null });
        cleared.spLevel = '';
        cleared.remarks = '';
        cleared.updatedAt = '';
        cleared.updatedBy = '';
        mergeEvalRow(cleared);
        delete S.reports[r.NIK + '|' + year];
        toast(res.message, 'success');
        closeEvalEdit(true);
        if (S.evaluation && S.evaluation.year === year) renderEvalBody();
      })
      .catch(function (err) {
        restore();
        toast(err.message, 'error');
      });
  }

  function closeEvalEdit(force) {
    var e = S.evalEdit;
    if (e && force !== true && !S.evaluation.rules.released && evalDirty()) {
      e.confirm = 'discard';
      renderEvalFooter();
      return;
    }
    S.evalEdit = null;
    $('modal-host').innerHTML = '';
  }

  function exportEvalCsv() {
    var d = S.evaluation;
    var rows = evalRows();
    if (!d || !rows.length) {
      toast('No data to export.', 'warning');
      return;
    }
    var fixed = function (v) { return isNum(v) ? Number(v).toFixed(2) : ''; };
    var lines = [csvLine(['Year', 'NIK', 'Full Name', 'Division', 'Department', 'Position', 'KPI Months', 'Avg KPI',
      'KBI Score', '360 Score', 'Discipline Score', 'Performance Score', 'Performance Grade', 'Status', 'SP Level', 'Remarks SP'])];
    rows.forEach(function (r) {
      lines.push(csvLine([
        d.year, r.NIK, r.Full_Name, r.Division, r.Department, r.Position, r.kpiMonths, fixed(r.avgKpi),
        fixed(r.kbi), fixed(r.s360), fixed(r.discipline), fixed(r.score), r.grade || '',
        r.complete ? 'Complete' : 'Pending: ' + r.missing.join(', '), r.spLevel || '', r.remarks || ''
      ]));
    });
    downloadCsv(lines, 'Performance_Evaluation_FY' + d.year + '_' + fileStamp() + '.csv');
    toast('CSV exported (' + rows.length + ' scorecards).', 'success');
  }

  function evalHasInputs() {
    return !!(S.evaluation && S.evaluation.rows.some(function (r) { return !!r.updatedAt; }));
  }

  function renderEvalUploadCard() {
    var d = S.evaluation;
    if (!d || !$('eval-upload')) return;
    var released = d.rules.released;
    var open = S.evalUploadOpen === null || S.evalUploadOpen === undefined ? !evalHasInputs() && !released : !!S.evalUploadOpen;
    var count = evalRows().length;

    $('eval-upload-body').classList.toggle('hidden', !open);
    $('eval-upload-chevron').textContent = open ? 'expand_less' : 'expand_more';
    $('eval-upload-toggle').setAttribute('aria-expanded', open ? 'true' : 'false');
    $('eval-upload-sub').textContent = released
      ? 'FY' + d.year + ' is released, so uploads are locked until the release is withdrawn.'
      : 'Download the FY' + d.year + ' template, fill KBI, 360, Discipline, and SP, then upload it back.';
    $('ei-template-note').textContent = count
      ? 'Pre-filled with the ' + count + (count === 1 ? ' scorecard' : ' scorecards') + ' in your current filter and their current values.'
      : 'No scorecards match the current filter. Reset the filters to include everyone.';
    $('ei-xlsx').disabled = !count;
    $('ei-csv').disabled = !count;
    $('ei-drop').classList.toggle('pointer-events-none', released);
    $('ei-drop').classList.toggle('opacity-50', released);
    $('eval-upload-locked').classList.toggle('hidden', !released);
    renderEvalUpload();
  }

  function toggleEvalUpload(force) {
    var body = $('eval-upload-body');
    if (!body) return;
    S.evalUploadOpen = force === undefined ? body.classList.contains('hidden') : !!force;
    renderEvalUploadCard();
  }

  function openEvalUpload() {
    toggleEvalUpload(true);
    var card = $('eval-upload');
    if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function clearEvalUpload() {
    S.evalUpload = null;
    renderEvalUpload();
  }

  function evalTemplateRows() {
    var d = S.evaluation;
    return evalRows().map(function (r) {
      return [d.year, String(r.NIK), r.Full_Name, r.Position, r.Department,
        isNum(r.avgKpi) ? Number(Number(r.avgKpi).toFixed(2)) : '',
        isNum(r.kbi) ? r.kbi : '', isNum(r.s360) ? r.s360 : '', isNum(r.discipline) ? r.discipline : '',
        r.spLevel || '', r.remarks || ''];
    });
  }

  function evalGuideRows() {
    var d = S.evaluation;
    var rules = d.rules;
    return [
      ['How to fill the FY' + d.year + ' score template'],
      ['Generated on', fmtStamp() + (S.user && S.user.Full_Name ? ' by ' + S.user.Full_Name : '')],
      [],
      ['Column', 'What to enter'],
      ['Year', 'Keep as is. Rows from another year are rejected.'],
      ['NIK, Position, Department', 'Keep as is. Together they identify the scorecard.'],
      ['Full Name, Avg KPI', 'Reference only. Changes in these columns are ignored.'],
      ['KBI Score, 360 Score, Discipline Score', 'A number from 0 to 100. Decimals are fine. Leave the cell blank to keep the current value.'],
      ['SP Level', 'None, SP1, SP2, or SP3. Leave blank to keep the current value. Write None to remove an SP.'],
      ['Remarks SP', 'Free text up to ' + REMARKS_MAX + ' characters. The employee and report viewers see it after release.'],
      [],
      ['FY' + d.year + ' rules'],
      ['Performance Score', perfFormulaText(rules)]
    ].concat(gradeRanges(rules.grades).map(function (r) { return ['Grade ' + r.grade, r.label]; }));
  }

  function downloadXlsx(fileName, sheets, fallback) {
    return loadSheetJs()
      .then(function (XLSX) {
        var book = XLSX.utils.book_new();
        sheets.forEach(function (sh) {
          var ws = XLSX.utils.aoa_to_sheet(sh.rows);
          if (sh.cols) ws['!cols'] = sh.cols.map(function (w) { return { wch: w }; });
          XLSX.utils.book_append_sheet(book, ws, sh.name);
        });
        XLSX.writeFile(book, fileName);
        return true;
      })
      .catch(function () {
        toast('The Excel file could not be prepared. The CSV template was downloaded instead.', 'warning');
        if (fallback) fallback();
        return false;
      });
  }

  function downloadEvalTemplate(kind) {
    var d = S.evaluation;
    var rows = d ? evalTemplateRows() : [];
    if (!d || !rows.length) {
      toast('No scorecards in the current filter.', 'warning');
      return;
    }
    var base = 'Performance_Scores_FY' + d.year + '_' + fileStamp();
    var csv = function () {
      downloadCsv([csvLine(EVAL_TEMPLATE_HEADERS)].concat(rows.map(csvLine)), base + '.csv');
    };
    if (kind === 'csv') {
      csv();
      toast('CSV template downloaded with ' + rows.length + ' scorecards.', 'success');
      return;
    }
    downloadXlsx(base + '.xlsx', [
      { name: 'Scores', rows: [EVAL_TEMPLATE_HEADERS].concat(rows), cols: [8, 14, 28, 22, 24, 10, 11, 11, 16, 10, 40] },
      { name: 'How to fill', rows: evalGuideRows(), cols: [38, 90] }
    ], csv).then(function (ok) {
      if (ok) toast('Excel template downloaded with ' + rows.length + ' scorecards.', 'success');
    });
  }

  function onEvalUploadFile(file) {
    if (!S.evaluation || S.evaluation.rules.released) {
      toast('This year is released. Withdraw the release to upload new scores.', 'warning');
      return;
    }
    var problem = uploadFileProblem(file);
    if (problem) {
      toast(problem, 'warning');
      return;
    }
    var name = String(file.name || '');
    S.evalUpload = { fileName: name, status: 'reading', rows: [], errors: [], preview: null, result: null };
    renderEvalUpload();

    readUploadFile(file, function (matrix) {
      var mapped = mapUploadRows(matrix, EVAL_UPLOAD_HEADERS, EVAL_UPLOAD_KEYS);
      var errors = mapped.errors;
      var preview = null;
      if (!errors.length) {
        var check = previewEvalUpload(mapped.rows);
        errors = check.errors;
        preview = check.preview;
      }
      S.evalUpload = { fileName: name, status: errors.length ? 'invalid' : 'ready', rows: mapped.rows, errors: errors, preview: preview, result: null };
      renderEvalUpload();
    }, function (message) {
      S.evalUpload = { fileName: name, status: 'invalid', rows: [], errors: [{ row: 0, column: '', value: '', message: message }], preview: null, result: null };
      renderEvalUpload();
    });
  }

  function previewEvalUpload(rows) {
    var d = S.evaluation;
    var index = {};
    d.rows.forEach(function (r) { index[evalKey(r.NIK, r.Position, r.Department)] = r; });
    var errors = [];
    var seen = {};
    var change = 0;
    var same = 0;
    var blank = 0;
    var diffs = [];

    rows.forEach(function (u) {
      var fail = function (column, value, message) {
        errors.push({ row: u._row, column: column, value: value, message: message });
      };
      if (u.Year && parseInt(u.Year, 10) !== d.year) {
        fail('Year', u.Year, 'This upload is for FY' + d.year + '. Remove rows from other years or switch the year first.');
        return;
      }
      if (!u.NIK) {
        fail('NIK', '', 'NIK is required.');
        return;
      }
      var card = index[evalKey(u.NIK, u.Position, u.Department)];
      if (!card) {
        fail('NIK', u.NIK, 'No FY' + d.year + ' scorecard matches NIK ' + u.NIK + ' as ' + u.Position + ' / ' + u.Department + '.');
        return;
      }
      if (seen[card.Eval_ID]) {
        fail('NIK', u.NIK, 'This scorecard is already listed on row ' + seen[card.Eval_ID] + '.');
        return;
      }
      seen[card.Eval_ID] = u._row;

      var changes = [];
      var filled = false;
      var bad = false;
      PERF_COMPONENTS.forEach(function (c) {
        if (!c.field || u[c.field] === '') return;
        filled = true;
        var res = perfScoreInput(u[c.field], c.label + ' Score');
        if (res.error) {
          fail(c.label + ' Score', u[c.field], res.error);
          bad = true;
        } else if (res.value !== card[c.key]) {
          changes.push(c.label + ' from ' + (isNum(card[c.key]) ? num(card[c.key], 2) : 'empty') + ' to ' + num(res.value, 2));
        }
      });
      if (u.SP_Level !== '') {
        filled = true;
        var level = perfSpLevel(u.SP_Level);
        if (level === null) {
          fail('SP Level', u.SP_Level, 'SP Level must be None, SP1, SP2, or SP3.');
          bad = true;
        } else if (level !== (card.spLevel || '')) {
          changes.push('SP from ' + (card.spLevel || 'None') + ' to ' + (level || 'None'));
        }
      }
      if (u.Remarks_SP !== '') {
        filled = true;
        if (u.Remarks_SP.length > REMARKS_MAX) {
          fail('Remarks SP', u.Remarks_SP.substring(0, 40), 'Remarks SP can hold at most ' + REMARKS_MAX + ' characters.');
          bad = true;
        } else if (u.Remarks_SP !== (card.remarks || '')) {
          changes.push(card.remarks ? 'Remarks updated' : 'Remarks added');
        }
      }
      if (bad) return;
      if (changes.length) {
        change++;
        diffs.push({ name: card.Full_Name, role: card.Position + ' / ' + card.Department, changes: changes });
      } else if (filled) {
        same++;
      } else {
        blank++;
      }
    });

    return { errors: errors, preview: { total: rows.length, change: change, same: same, blank: blank, diffs: diffs } };
  }

  function evalDiffHtml(p) {
    var shown = p.diffs.slice(0, 8);
    return '<div class="rounded-xl border border-border-light overflow-hidden bg-white">' +
      '<div class="px-3 py-2 bg-surface-page border-b border-border-light flex flex-wrap items-center justify-between gap-1">' +
        '<span class="text-label-sm font-semibold text-text-primary">Review before upload</span>' +
        '<span class="text-label-xs text-text-muted">Only these ' + p.change + (p.change === 1 ? ' scorecard changes' : ' scorecards change') + '. Every other row stays as it is.</span>' +
      '</div>' +
      '<ul class="divide-y divide-slate-100">' + shown.map(function (d) {
        return '<li class="px-3 py-2 flex flex-col gap-1 min-w-0">' +
          '<span class="text-body-sm font-semibold text-text-primary truncate">' + esc(d.name) +
            ' <span class="font-normal text-text-muted">' + esc(d.role) + '</span></span>' +
          '<span class="flex flex-wrap gap-1">' + d.changes.map(function (c) {
            return '<span class="pill pill-neutral !text-[11px] !px-2 !py-0.5">' + esc(c) + '</span>';
          }).join('') + '</span>' +
        '</li>';
      }).join('') + '</ul>' +
      (p.diffs.length > shown.length
        ? '<p class="px-3 py-2 text-label-xs text-text-muted border-t border-border-light">And ' + (p.diffs.length - shown.length) + ' more.</p>'
        : '') +
    '</div>';
  }

  function renderEvalUpload() {
    var summary = $('ei-summary');
    var result = $('ei-result');
    var submit = $('ei-submit');
    if (!summary || !result || !submit) return;

    var up = S.evalUpload;
    if (!up) {
      summary.innerHTML = '<p class="text-sm text-slate-500 flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px] text-slate-400">draft</span>No file selected.</p>';
      result.innerHTML = '';
      submit.disabled = true;
      submit.classList.remove('hidden');
      if ($('ei-clear')) $('ei-clear').classList.add('hidden');
      return;
    }

    var pills = '<span class="pill pill-neutral"><span class="material-symbols-outlined text-[14px]">description</span>' + esc(up.fileName) + '</span>';
    if (up.status === 'reading') {
      pills += '<span class="text-body-sm text-text-muted">Reading file</span>';
    } else if (up.preview && !up.errors.length) {
      pills += '<span class="pill pill-info">' + up.preview.total + ' rows</span>' +
               '<span class="pill ' + (up.preview.change ? 'pill-warning' : 'pill-neutral') + '">' + up.preview.change + ' will change</span>' +
               '<span class="pill pill-neutral" title="Rows whose values match the current ones">' + up.preview.same + ' unchanged</span>' +
               (up.preview.blank ? '<span class="pill pill-neutral" title="Rows with every score and SP cell empty">' + up.preview.blank + ' left blank</span>' : '');
    } else if (up.rows.length) {
      pills += '<span class="pill pill-info">' + up.rows.length + ' rows</span>';
    }
    summary.innerHTML = '<div class="flex items-center gap-space-sm flex-wrap">' + pills + '</div>';

    submit.disabled = up.status !== 'ready' || !up.preview || !up.preview.change;
    submit.classList.toggle('hidden', up.status === 'uploaded');
    if ($('ei-clear')) $('ei-clear').classList.remove('hidden');

    if (up.status === 'uploaded' && up.result) {
      result.innerHTML =
        '<div class="rounded-xl border border-border-light bg-status-success-subtle p-space-md">' +
          '<p class="text-body-sm font-semibold text-status-success-text flex items-center gap-1.5">' +
            '<span class="material-symbols-outlined text-[18px]">task_alt</span>' + esc(up.result.message) + '</p>' +
        '</div>';
      return;
    }
    if (up.errors.length) {
      result.innerHTML = uploadErrorsHtml(up.errors);
      return;
    }
    result.innerHTML = up.status === 'ready' && up.preview
      ? (up.preview.change
          ? evalDiffHtml(up.preview)
          : '<p class="text-body-sm text-text-muted flex items-center gap-1.5"><span class="material-symbols-outlined text-[18px]">info</span>Every row matches the current values, so there is nothing to import.</p>')
      : '';
  }

  function submitEvalUpload() {
    var up = S.evalUpload;
    var d = S.evaluation;
    if (!up || up.status !== 'ready' || !d) return;

    up.status = 'uploading';
    var year = d.year;
    var restore = busy($('ei-submit'), 'Importing');

    api('uploadPerformanceInputs', year, up.rows)
      .then(function (res) {
        restore();
        if (!res || !res.ok) {
          up.status = 'invalid';
          up.errors = (res && res.errors) || [];
          renderEvalUpload();
          toast('Import rejected. Fix the listed rows and try again.', 'error');
          return;
        }
        up.status = 'uploaded';
        up.errors = [];
        up.result = res;
        renderEvalUpload();
        toast(res.message, 'success');
        S.reports = {};
        if (S.evaluation && S.evaluation.year === year) loadEvaluation();
      })
      .catch(function (err) {
        restore();
        up.status = 'ready';
        renderEvalUpload();
        toast(err.message, 'error');
      });
  }

  function openEvalRelease() {
    var d = S.evaluation;
    if (!d) return;
    var rules = d.rules;
    var releasing = !rules.released;
    var st = evalStats(d.rows);
    var pending = st.pending - st.noKpi;
    var tile = function (label, value, tone) {
      return '<div class="rounded-lg border border-border-light bg-surface-page px-3 py-2">' +
        '<p class="text-label-xs text-text-muted">' + label + '</p>' +
        '<p class="text-title-lg font-bold tabular-nums ' + tone + '">' + value + '</p></div>';
    };

    $('modal-host').innerHTML =
      '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closeEvalRelease()">' +
        '<div class="modal-panel !max-w-lg" role="dialog" aria-modal="true" aria-labelledby="er-title">' +
          '<div class="px-6 pt-6 pb-5 flex items-start gap-4">' +
            '<span class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 ' +
              (releasing ? 'bg-brand-50 text-primary-container' : 'bg-status-warning-subtle text-status-warning') + '">' +
              '<span class="material-symbols-outlined text-[22px]">' + (releasing ? 'send' : 'undo') + '</span></span>' +
            '<div class="min-w-0">' +
              '<h2 id="er-title" class="text-title-lg text-text-primary">' +
                (releasing ? 'Release FY' + d.year + ' results to employees?' : 'Withdraw the FY' + d.year + ' release?') + '</h2>' +
              '<p class="text-body-sm text-text-secondary mt-1">' + (releasing
                ? 'Each employee will see their Performance Score and Grade in the Annual Performance tab of My KPIs. Their SP level and Remarks SP are shown there too. FY' + d.year + ' inputs and rules are locked while released.'
                : 'Employees stop seeing their FY' + d.year + ' Performance Score and Grade, and you can edit inputs and rules again.') + '</p>' +
            '</div>' +
          '</div>' +
          (releasing
            ? '<div class="px-6 pb-5 flex flex-col gap-3">' +
                '<div class="grid grid-cols-3 gap-2">' +
                  tile('Complete', st.complete, 'text-status-success-text') +
                  tile('Pending', pending, pending ? 'text-status-warning-text' : 'text-text-primary') +
                  tile('No KPI score', st.noKpi, 'text-text-primary') +
                '</div>' +
                (st.pending
                  ? '<p class="text-body-sm text-status-warning-text bg-status-warning-subtle rounded-lg px-3 py-2">' + st.pending +
                      (st.pending === 1 ? ' scorecard is' : ' scorecards are') + ' not complete. Those employees will see Pending until you withdraw, fill the missing inputs, and release again.</p>'
                  : '') +
                '<div class="rounded-lg border border-border-light px-3 py-2.5">' +
                  '<p class="text-label-xs uppercase tracking-wider text-text-muted mb-1.5">Rules that will be locked</p>' +
                  '<div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm">' + perfFormulaHtml(rules) + '</div>' +
                  '<div class="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 text-label-xs">' + gradeLegendHtml(rules.grades) + '</div>' +
                '</div>' +
              '</div>'
            : '') +
          '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex items-center justify-end gap-space-sm">' +
            '<button type="button" class="btn btn-secondary" onclick="MGI.closeEvalRelease()">Cancel</button>' +
            '<button id="er-confirm" type="button" class="btn btn-primary" onclick="MGI.confirmEvalRelease()">' +
              '<span class="material-symbols-outlined text-[18px]">' + (releasing ? 'send' : 'undo') + '</span> ' +
              (releasing ? 'Release to Employees' : 'Withdraw Release') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function closeEvalRelease() {
    $('modal-host').innerHTML = '';
  }

  function confirmEvalRelease() {
    var d = S.evaluation;
    if (!d) return;
    var year = d.year;
    var releasing = !d.rules.released;
    var restore = busy($('er-confirm'), releasing ? 'Releasing' : 'Withdrawing');

    api('setPerformanceRelease', year, releasing)
      .then(function (res) {
        restore();
        if (S.evaluation && S.evaluation.year === year) S.evaluation.rules = res.rules;
        S.reports = {};
        S.perfSettings = null;
        if (S.perfRules && S.perfRules.year === year) S.perfRules = null;
        closeEvalRelease();
        toast(res.message, 'success');
        renderEvaluation();
      })
      .catch(function (err) {
        restore();
        toast(err.message, 'error');
      });
  }

  function perfConfig(year) {
    var d = S.perfSettings;
    var c = d && d.configs ? d.configs[year] : null;
    if (c) return c;
    var def = d ? d.defaults : { weights: { kpi: 60, kbi: 30, s360: 8, discipline: 2 }, grades: { A: 95, B: 85, C: 70, D: 20 } };
    return { year: year, weights: def.weights, grades: def.grades, saved: false, released: false, releasedAt: '', updatedAt: '' };
  }

  function perfDraftFrom(c) {
    var out = { weights: {}, grades: {} };
    PERF_COMPONENTS.forEach(function (p) { out.weights[p.key] = Number(c.weights[p.key]); });
    GRADES.slice(0, 4).forEach(function (g) { out.grades[g] = Number(c.grades[g]); });
    return out;
  }

  function perfWeightProblem(d) {
    var total = 0;
    for (var n = 0; n < PERF_COMPONENTS.length; n++) {
      var c = PERF_COMPONENTS[n];
      var v = d.weights[c.key];
      if (!isNum(v)) return 'The ' + c.label + ' weight must be a number.';
      if (v < 0 || v > 100) return 'The ' + c.label + ' weight must be between 0% and 100%.';
      total += Math.round(v * 100) / 100;
    }
    total = Math.round(total * 100) / 100;
    if (Math.abs(total - 100) > 0.0001) return 'Component weights must add up to exactly 100%. They add up to ' + num(total, 2) + '% now.';
    return '';
  }

  function perfGradeProblem(d) {
    for (var n = 0; n < 4; n++) {
      var g = GRADES[n];
      var v = d.grades[g];
      if (!isNum(v)) return 'Grade ' + g + ' needs a starting score.';
      if (v <= 0) return 'Grade ' + g + ' must start above 0.';
      if (v > 100) return 'Grade ' + g + ' cannot start above 100.';
      if (n && v >= d.grades[GRADES[n - 1]]) {
        return 'Grade ' + g + ' must start below Grade ' + GRADES[n - 1] + ' (' + num(d.grades[GRADES[n - 1]], 2) + '), otherwise the ranges overlap.';
      }
    }
    return '';
  }

  function perfCopySource(year) {
    var d = S.perfSettings;
    if (!d) return null;
    var best = null;
    Object.keys(d.configs).forEach(function (k) {
      var y = parseInt(k, 10);
      if (y < year && d.configs[k].saved && (best === null || y > best)) best = y;
    });
    return best;
  }

  function loadPerformanceSettings() {
    if (!$('perf-control')) return;
    if (!S.perfSettings) $('perf-control').innerHTML = '<div class="skeleton h-72 w-full"></div>';

    api('getPerformanceSettings')
      .then(function (data) {
        S.perfSettings = data;
        if (!S.perfYear) S.perfYear = data.activeYear;
        if (!S.perfDraft) S.perfDraft = perfDraftFrom(perfConfig(S.perfYear));
        renderPerfPanel();
      })
      .catch(function (err) {
        $('perf-control').innerHTML = '<p class="text-body-md text-status-danger-text text-center">' + esc(err.message) + '</p>';
        toast(err.message, 'error');
      });
  }

  function renderPerfPanel() {
    var host = $('perf-control');
    if (!host || !S.perfSettings) return;
    var year = S.perfYear;
    var c = perfConfig(year);
    var locked = !!c.released;
    var d = S.perfDraft || perfDraftFrom(c);
    S.perfDraft = d;
    var years = S.perfSettings.years.slice();
    if (years.indexOf(year) === -1) years.push(year);
    years.sort(function (a, b) { return b - a; });
    var source = perfCopySource(year);
    var value = function (v) { return isNum(v) ? String(v) : ''; };

    var status = locked
      ? '<span class="pill pill-success"><span class="material-symbols-outlined text-[14px]">lock</span>Released, locked</span>'
      : c.saved
        ? '<span class="pill pill-info">Saved' + (c.updatedAt ? ' ' + esc(fmtDate(c.updatedAt)) : '') + '</span>'
        : '<span class="pill pill-neutral" title="Nothing saved for this year yet">Using defaults</span>';

    var weightRow = function (p) {
      return '<div class="flex items-center gap-3 py-2.5">' +
        '<div class="min-w-0 flex-1">' +
          '<label for="perf-w-' + p.key + '" class="block text-body-md font-semibold text-text-primary">' + esc(p.label) + '</label>' +
          '<p class="text-label-xs text-text-muted">' + esc(p.hint) + '</p>' +
        '</div>' +
        '<div class="relative w-28 shrink-0">' +
          '<input id="perf-w-' + p.key + '" type="number" inputmode="decimal" step="0.01" min="0" max="100" class="field !pr-8 text-right tabular-nums"' +
            ' value="' + value(d.weights[p.key]) + '" oninput="MGI.onPerfInput()" onwheel="this.blur()"' + (locked ? ' disabled' : '') + '>' +
          '<span class="absolute right-3 top-1/2 -translate-y-1/2 text-label-sm text-text-muted pointer-events-none">%</span>' +
        '</div>' +
      '</div>';
    };

    var gradeRow = function (g, n) {
      var hint = n === 0 ? 'Top grade, up to 100' : 'Below Grade ' + GRADES[n - 1];
      return '<div class="flex items-center gap-3 py-2.5">' +
        gradeBadge(g, 'md') +
        '<div class="min-w-0 flex-1">' +
          '<label for="perf-g-' + g + '" class="block text-body-md font-semibold text-text-primary">Grade ' + g + ' starts at</label>' +
          '<p class="text-label-xs text-text-muted">' + hint + '</p>' +
        '</div>' +
        '<input id="perf-g-' + g + '" type="number" inputmode="decimal" step="0.01" min="0.01" max="100" class="field !w-28 shrink-0 text-right tabular-nums"' +
          ' value="' + value(d.grades[g]) + '" oninput="MGI.onPerfInput()" onwheel="this.blur()"' + (locked ? ' disabled' : '') + '>' +
      '</div>';
    };

    host.innerHTML =
      '<div class="flex flex-col gap-space-lg">' +
        '<div class="flex flex-col md:flex-row md:items-start justify-between gap-space-md">' +
          '<div class="min-w-0">' +
            '<h2 class="text-title-lg text-text-primary">Performance Scoring</h2>' +
            '<p class="text-body-sm text-text-muted max-w-2xl">Choose how each fiscal year combines Avg KPI with KBI, 360, and Discipline, and where each grade starts. ' +
              'Every year keeps its own rules, so a change to one year never touches another.</p>' +
          '</div>' +
          '<div class="flex flex-wrap items-center gap-2 shrink-0">' +
            '<label for="perf-year" class="text-xs font-semibold text-slate-600">Year</label>' +
            '<select id="perf-year" class="field !w-auto !py-1.5" onchange="MGI.onPerfYearChange(this.value)">' + years.map(function (y) {
              return '<option value="' + y + '"' + (y === year ? ' selected' : '') + '>FY' + y + (y === S.perfSettings.activeYear ? ' (Active)' : '') + '</option>';
            }).join('') + '</select>' + status +
          '</div>' +
        '</div>' +
        (locked
          ? '<div class="rounded-lg bg-status-success-subtle text-status-success-text text-body-sm px-3 py-2 flex items-center gap-2">' +
              '<span class="material-symbols-outlined text-[18px]">lock</span>FY' + year + ' results are released, so these rules are locked. ' +
              'Withdraw the release on the Performance Evaluation page to change them.</div>'
          : '') +
        '<div class="grid grid-cols-1 xl:grid-cols-2 gap-space-lg items-start">' +
          '<section class="rounded-xl border border-border-light overflow-hidden">' +
            '<div class="px-space-md py-space-sm bg-surface-page border-b border-border-light flex items-center justify-between gap-2">' +
              '<h3 class="text-title-md text-text-primary">Component weights</h3>' +
              '<span id="perf-w-total" class="pill pill-neutral !text-[11px]"></span>' +
            '</div>' +
            '<div class="px-space-md divide-y divide-slate-100">' + PERF_COMPONENTS.map(weightRow).join('') + '</div>' +
            '<div class="px-space-md pb-space-md pt-1">' +
              '<div class="meter-track meter-sm"><div id="perf-w-meter" class="meter-fill" style="width:0%"></div></div>' +
              '<p class="text-label-xs text-text-muted mt-1.5">The four weights must add up to exactly 100%. A component set to 0% is not needed for the score.</p>' +
            '</div>' +
          '</section>' +
          '<section class="rounded-xl border border-border-light overflow-hidden">' +
            '<div class="px-space-md py-space-sm bg-surface-page border-b border-border-light">' +
              '<h3 class="text-title-md text-text-primary">Grade intervals</h3>' +
            '</div>' +
            '<div class="px-space-md divide-y divide-slate-100">' + GRADES.slice(0, 4).map(gradeRow).join('') +
              '<div class="flex items-center gap-3 py-2.5">' + gradeBadge('E', 'md') +
                '<div class="min-w-0 flex-1"><p class="text-body-md font-semibold text-text-primary">Grade E</p>' +
                '<p class="text-label-xs text-text-muted">Every score below Grade D</p></div>' +
                '<span id="perf-g-E" class="text-body-sm font-semibold text-text-secondary w-28 text-right">-</span>' +
              '</div>' +
            '</div>' +
            '<div class="px-space-md pb-space-md flex flex-col gap-2">' +
              '<div id="perf-g-preview"></div>' +
              '<div id="perf-g-legend" class="flex flex-wrap gap-x-3 gap-y-1.5 text-label-xs"></div>' +
            '</div>' +
          '</section>' +
        '</div>' +
        '<div id="perf-example" class="rounded-xl border border-border-light bg-surface-page px-space-md py-space-sm text-body-sm text-text-secondary"></div>' +
        '<p id="perf-error" class="hidden text-label-sm text-status-danger-text"></p>' +
        (locked ? '' :
          '<div class="flex flex-wrap items-center gap-space-sm">' +
            '<button id="perf-save" type="button" class="btn btn-primary" onclick="MGI.savePerfSettings()">' +
              '<span class="material-symbols-outlined text-[18px]">save</span> Save FY' + year + ' Rules</button>' +
            '<button type="button" class="btn btn-secondary" onclick="MGI.resetPerfDefaults()" title="Avg KPI 60%, KBI 30%, 360 8%, Discipline 2%">' +
              '<span class="material-symbols-outlined text-[18px]">restart_alt</span> Defaults</button>' +
            (source ? '<button type="button" class="btn btn-secondary" onclick="MGI.copyPerfFrom(' + source + ')">' +
              '<span class="material-symbols-outlined text-[18px]">content_copy</span> Copy FY' + source + '</button>' : '') +
          '</div>') +
      '</div>';

    renderPerfPreview();
  }

  function renderPerfPreview() {
    var d = S.perfDraft;
    if (!d || !$('perf-w-total')) return;
    var c = perfConfig(S.perfYear);
    var total = 0;
    PERF_COMPONENTS.forEach(function (p) { if (isNum(d.weights[p.key])) total += d.weights[p.key]; });
    total = Math.round(total * 100) / 100;
    var weightOk = Math.abs(total - 100) < 0.0001;

    $('perf-w-total').className = 'pill ' + (weightOk ? 'pill-success' : 'pill-danger') + ' !text-[11px]';
    $('perf-w-total').textContent = 'Total ' + num(total, 2) + '%';
    $('perf-w-meter').className = 'meter-fill' + (weightOk ? ' is-valid' : '');
    $('perf-w-meter').style.width = Math.min(100, Math.max(0, total)) + '%';

    var weightError = perfWeightProblem(d);
    var gradeError = perfGradeProblem(d);
    var error = weightError || gradeError;
    $('perf-error').textContent = error;
    $('perf-error').classList.toggle('hidden', !error);

    var saved = perfDraftFrom(c);
    var dirty = JSON.stringify(d) !== JSON.stringify(saved) || !c.saved;
    if ($('perf-save')) $('perf-save').disabled = !!error || !dirty;

    $('perf-g-E').textContent = isNum(d.grades.D) ? 'Below ' + num(d.grades.D, 2) : '-';
    $('perf-g-preview').innerHTML = gradeError ? '' : gradeScaleHtml(d.grades, null, true);
    $('perf-g-legend').innerHTML = gradeError ? '' : gradeLegendHtml(d.grades);

    if (error) {
      $('perf-example').innerHTML = '<span class="text-text-muted">Fix the rules above to see an example.</span>';
      return;
    }
    var ex = perfCompute(85.75, { kbi: 80, s360: 90, discipline: 100 }, d);
    $('perf-example').innerHTML =
      '<div class="flex flex-wrap items-center gap-x-2 gap-y-1">' +
        '<span class="material-symbols-outlined text-[18px] text-text-muted">lightbulb</span>' +
        '<span>Example: Avg KPI 85.75, KBI 80, 360 90, and Discipline 100 give a Performance Score of</span>' +
        '<strong class="text-text-primary tabular-nums">' + scoreText(ex.score) + '</strong><span>and</span>' + gradeBadge(ex.grade) +
      '</div>';
  }

  function onPerfInput() {
    var d = S.perfDraft;
    if (!d) return;
    var read = function (id) {
      var el = $(id);
      var v = el ? parseFloat(el.value) : NaN;
      return isFinite(v) ? v : NaN;
    };
    PERF_COMPONENTS.forEach(function (p) { d.weights[p.key] = read('perf-w-' + p.key); });
    GRADES.slice(0, 4).forEach(function (g) { d.grades[g] = read('perf-g-' + g); });
    renderPerfPreview();
  }

  function onPerfYearChange(value) {
    var year = parseInt(value, 10);
    if (!year) return;
    S.perfYear = year;
    S.perfDraft = perfDraftFrom(perfConfig(year));
    renderPerfPanel();
  }

  function resetPerfDefaults() {
    if (!S.perfSettings) return;
    S.perfDraft = perfDraftFrom(S.perfSettings.defaults);
    renderPerfPanel();
  }

  function copyPerfFrom(year) {
    if (!S.perfSettings) return;
    S.perfDraft = perfDraftFrom(perfConfig(parseInt(year, 10)));
    renderPerfPanel();
    toast('FY' + year + ' rules copied. Save to apply them to FY' + S.perfYear + '.', 'info');
  }

  function savePerfSettings() {
    var d = S.perfDraft;
    if (!d) return;
    var error = perfWeightProblem(d) || perfGradeProblem(d);
    if (error) {
      toast(error, 'error');
      return;
    }
    var year = S.perfYear;
    var restore = busy($('perf-save'), 'Saving');

    api('savePerformanceSettings', { year: year, weights: d.weights, grades: d.grades })
      .then(function (res) {
        S.perfSettings = res;
        S.perfDraft = perfDraftFrom(perfConfig(year));
        if (S.evaluation && S.evaluation.year === year) S.evaluation = null;
        if (S.perfRules && S.perfRules.year === year) S.perfRules = null;
        S.reports = {};
        renderPerfPanel();
        toast(res.message, 'success');
      })
      .catch(function (err) {
        restore();
        toast(err.message, 'error');
      });
  }

  function renderGuidePerformance() {
    var host = $('guide-performance-body');
    if (!host) return;
    if (!S.perfRules) {
      host.innerHTML = '<div class="skeleton h-40 w-full"></div>';
      api('getPerformanceRules', S.user.year)
        .then(function (rules) {
          S.perfRules = rules;
          renderGuidePerformance();
        })
        .catch(function (err) {
          host.innerHTML = '<p class="text-body-sm text-status-danger-text">' + esc(err.message) + '</p>';
        });
      return;
    }

    var rules = S.perfRules;
    var ex = perfCompute(85.75, { kbi: 80, s360: 90, discipline: 100 }, rules);
    if ($('guide-perf-year')) $('guide-perf-year').textContent = 'FY' + rules.year;
    var source = function (icon, title, text) {
      return '<li class="flex items-start gap-space-sm">' +
        '<span class="w-9 h-9 rounded-lg bg-slate-50 ring-1 ring-slate-200/70 text-slate-600 flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-[20px]">' + icon + '</span></span>' +
        '<span class="text-body-sm text-text-secondary"><strong class="block text-text-primary">' + title + '</strong>' + text + '</span></li>';
    };
    var rows = ex.parts.filter(function (p) { return p.required; }).map(function (p) {
      return '<tr><td class="py-1.5 text-text-secondary">' + esc(p.label) + '</td>' +
        '<td class="py-1.5 text-right tabular-nums">' + num(p.value, 2) + '</td>' +
        '<td class="py-1.5 text-right tabular-nums text-text-muted">x ' + num(p.weight, 2) + '%</td>' +
        '<td class="py-1.5 text-right tabular-nums font-semibold">' + num(p.points, 2) + '</td></tr>';
    }).join('');

    host.innerHTML =
      '<div class="grid grid-cols-1 xl:grid-cols-2 gap-space-lg">' +
        '<div class="flex flex-col gap-space-md">' +
          '<div class="rounded-xl border border-border-light bg-surface-page p-space-md">' +
            '<p class="text-label-xs uppercase tracking-wider text-text-muted mb-2">Formula</p>' +
            '<p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-md"><strong class="text-text-primary">Performance Score</strong>' +
              '<span class="text-text-muted">=</span>' + perfFormulaHtml(rules) + '</p>' +
          '</div>' +
          '<ul class="flex flex-col gap-space-md">' +
            source('monitoring', 'Avg KPI Score', 'Calculated automatically from your monthly KPI submissions, using the counted months only.') +
            source('assignment_turned_in', 'KBI, 360, and Discipline', 'Processed by HR and entered as scores from 0 to 100.') +
            source('lock_clock', 'When you see it', 'Your Performance Score and Grade appear in the Annual Performance tab of My KPIs after HR releases the year\'s results. Until every counted component is in, it shows Pending.') +
          '</ul>' +
        '</div>' +
        '<div class="flex flex-col gap-space-md">' +
          '<div class="rounded-xl border border-border-light p-space-md">' +
            '<p class="text-label-xs uppercase tracking-wider text-text-muted mb-2">Worked example</p>' +
            '<table class="w-full text-body-sm"><tbody class="divide-y divide-slate-100">' + rows + '</tbody>' +
              '<tfoot><tr class="border-t-2 border-slate-200"><td class="pt-2 font-semibold text-text-primary" colspan="3">Performance Score</td>' +
              '<td class="pt-2 text-right font-bold tabular-nums text-text-primary">' + scoreText(ex.score) + ' ' + gradeBadge(ex.grade) + '</td></tr></tfoot>' +
            '</table>' +
          '</div>' +
          '<div class="flex flex-col gap-2">' + gradeScaleHtml(rules.grades, ex.score, true) +
            '<div class="flex flex-wrap gap-x-3 gap-y-1.5 text-label-xs">' + gradeLegendHtml(rules.grades) + '</div></div>' +
        '</div>' +
      '</div>';
  }

  var SETTINGS_LOADERS = {
    periods:     loadPeriodSettings,
    fiscal:      loadFiscalYear,
    categories:  loadCategories,
    bands:       loadRatingBands,
    performance: loadPerformanceSettings,
    access:      loadReportAccess,
    theme:       loadYearThemes,
    admins:      loadAdminAccess
  };

  function initSettings() {
    S.settingsLoaded = {};
    setSettingsTab(S.settingsTab);
  }

  function loadSettingsTab(tab) {
    if (S.view !== 'settings' || S.settingsLoaded[tab] || !SETTINGS_LOADERS[tab]) return;
    if (tab === 'admins' && !(S.user && S.user.isOwner)) return;
    S.settingsLoaded[tab] = true;
    SETTINGS_LOADERS[tab]();
  }

  function loadAdminAccess() {
    if (!$('admins-control')) return;
    if (!S.adminAccess) $('admins-control').innerHTML = '<div class="skeleton h-56 w-full"></div>';

    api('getAdminAccess')
      .then(function (data) {
        S.adminAccess = data;
        renderAdminAccess();
      })
      .catch(function (err) {
        $('admins-control').innerHTML = '<p class="text-body-md text-status-danger-text text-center">' + esc(err.message) + '</p>';
        toast(err.message, 'error');
      });
  }

  function adminPerson(u, side) {
    var sub = [u.Position, u.Department].filter(Boolean).join(' / ');
    return '<div class="flex flex-col sm:flex-row sm:items-center gap-space-sm px-space-md py-3">' +
      '<div class="flex items-center gap-space-sm min-w-0 flex-1">' +
        '<span class="emp-avatar">' + esc(u.Initials || initials(u.Full_Name)) + '</span>' +
        '<div class="flex flex-col min-w-0">' +
          '<span class="text-body-md font-semibold text-text-primary truncate">' + esc(u.Full_Name) + '</span>' +
          '<span class="text-label-xs text-text-muted truncate">' + esc([u.NIK, u.Email].filter(Boolean).join(' • ')) + '</span>' +
          (sub ? '<span class="text-label-xs text-text-muted truncate">' + esc(sub) + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="flex items-center gap-space-xs flex-wrap sm:justify-end shrink-0">' + side + '</div>' +
    '</div>';
  }

  function renderAdminAccess() {
    var d = S.adminAccess;
    if (!d || !$('admins-control')) return;

    var owner = adminPerson(d.owner,
      '<span class="pill pill-brand !text-[11px]"><span class="material-symbols-outlined text-[14px]">workspace_premium</span> Owner</span>' +
      '<span class="pill pill-neutral !text-[11px]" title="The owner signs in with a password, on the account whose email runs the app">Password sign-in</span>');

    var admins = d.admins.length
      ? d.admins.map(function (u) {
          return adminPerson(u,
            (u.Is_Active ? '' : '<span class="pill pill-neutral !text-[11px]">Inactive</span>') +
            accountPill(u.account) +
            '<button type="button" class="btn btn-secondary !py-1 !px-2.5 !text-label-sm" onclick="MGI.openAdminChange(\'' + esc(u.NIK) + '\', false)">' +
              '<span class="material-symbols-outlined text-[16px]">person_remove</span> Remove admin</button>');
        }).join('')
      : '<p class="px-space-md py-space-lg text-center text-body-sm text-text-muted">No other admins yet. Add one from the list.</p>';

    $('admins-control').innerHTML =
      '<div class="flex flex-col gap-space-lg">' +
        '<div>' +
          '<h2 class="text-title-lg text-text-primary">Admin Access</h2>' +
          '<p class="text-body-sm text-text-muted">Admins manage Master KPIs, KPI mapping, reports, and settings. ' +
            'Only you, as the system owner, can change this list.</p>' +
        '</div>' +
        '<div class="grid grid-cols-1 xl:grid-cols-2 gap-space-lg items-start">' +
          '<section class="rounded-xl border border-border-light overflow-hidden">' +
            '<div class="px-space-md py-space-sm bg-surface-page border-b border-border-light flex items-center justify-between gap-space-sm">' +
              '<h3 class="text-title-md text-text-primary">Current admins</h3>' +
              '<span class="pill pill-neutral !text-[11px]">' + (d.admins.length + 1) + ' with access</span>' +
            '</div>' +
            '<div class="divide-y divide-slate-100">' + owner + admins + '</div>' +
          '</section>' +
          '<section class="rounded-xl border border-border-light overflow-hidden">' +
            '<div class="px-space-md py-space-sm bg-surface-page border-b border-border-light flex flex-col gap-space-sm">' +
              '<div class="flex items-center justify-between gap-space-sm">' +
                '<h3 class="text-title-md text-text-primary">Add admin</h3>' +
                '<span class="pill pill-neutral !text-[11px]">' + d.candidates.length + ' eligible</span>' +
              '</div>' +
              '<div class="relative">' +
                '<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px] pointer-events-none">search</span>' +
                '<input type="search" class="field !pl-10" placeholder="Search name, NIK, or email" value="' + esc(S.adminQuery) +
                  '" oninput="MGI.onAdminSearch(this.value)">' +
              '</div>' +
            '</div>' +
            '<div id="admin-candidates" class="divide-y divide-slate-100 max-h-[420px] overflow-y-auto"></div>' +
          '</section>' +
        '</div>' +
      '</div>';

    renderAdminCandidates();
  }

  function renderAdminCandidates() {
    var host = $('admin-candidates');
    if (!host || !S.adminAccess) return;
    var all = S.adminAccess.candidates;
    var q = (S.adminQuery || '').trim().toLowerCase();
    var list = all.filter(function (u) {
      return !q || (u.Full_Name + ' ' + u.NIK + ' ' + u.Email).toLowerCase().indexOf(q) > -1;
    });

    host.innerHTML = !all.length
      ? '<p class="px-space-md py-space-lg text-center text-body-sm text-text-muted">Every active employee with an email already has admin access.</p>'
      : !list.length
        ? '<p class="px-space-md py-space-lg text-center text-body-sm text-text-muted">No employees match your search.</p>'
        : list.slice(0, 50).map(function (u) {
            return adminPerson(u,
              '<button type="button" class="btn btn-primary !py-1 !px-2.5 !text-label-sm" onclick="MGI.openAdminChange(\'' + esc(u.NIK) + '\', true)">' +
                '<span class="material-symbols-outlined text-[16px]">person_add</span> Make admin</button>');
          }).join('') +
          (list.length > 50
            ? '<p class="px-space-md py-2 text-label-xs text-text-muted text-center">Showing 50 of ' + list.length + '. Refine the search to see more.</p>'
            : '');
  }

  function onAdminSearch(value) {
    S.adminQuery = value;
    renderAdminCandidates();
  }

  function openAdminChange(nik, makeAdmin) {
    var d = S.adminAccess;
    if (!d) return;
    var grant = makeAdmin === true;
    var u = (grant ? d.candidates : d.admins).filter(function (x) { return x.NIK === nik; })[0];
    if (!u) return;
    S.adminChange = { nik: nik, grant: grant };

    $('modal-host').innerHTML =
      '<div class="modal-backdrop" onclick="if(event.target===this)MGI.closeAdminChange()">' +
        '<div class="modal-panel !max-w-md">' +
          '<div class="px-6 pt-6 pb-5 flex items-start gap-4">' +
            '<span class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 ' +
              (grant ? 'bg-brand-50 text-primary-container' : 'bg-status-warning-subtle text-status-warning') + '">' +
              '<span class="material-symbols-outlined text-[22px]">' + (grant ? 'admin_panel_settings' : 'person_remove') + '</span></span>' +
            '<div class="min-w-0">' +
              '<h2 class="text-title-lg text-text-primary">' +
                (grant ? 'Make ' + esc(u.Full_Name) + ' an admin?' : 'Remove ' + esc(u.Full_Name) + ' as admin?') + '</h2>' +
              '<p class="text-body-sm text-text-secondary mt-1">' +
                (grant
                  ? 'They get full access to Master KPIs, KPI mapping, reports, and settings.' +
                    (u.account === 'none' ? ' They have no login account yet, so a one-time login code will be emailed to ' + esc(u.Email) + '.' : '')
                  : 'They lose the admin pages on their next action but keep their own My KPIs access.') +
              '</p>' +
            '</div>' +
          '</div>' +
          '<div class="px-6 py-4 border-t border-border-light bg-slate-50/60 flex items-center justify-end gap-space-sm">' +
            '<button class="btn btn-secondary" onclick="MGI.closeAdminChange()">Cancel</button>' +
            '<button id="admin-confirm" class="btn btn-primary" onclick="MGI.confirmAdminChange()">' +
              '<span class="material-symbols-outlined text-[18px]">' + (grant ? 'person_add' : 'person_remove') + '</span> ' +
              (grant ? 'Make Admin' : 'Remove Admin') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function closeAdminChange() {
    S.adminChange = null;
    $('modal-host').innerHTML = '';
  }

  function confirmAdminChange() {
    var change = S.adminChange;
    if (!change) return;
    var restore = busy($('admin-confirm'), 'Saving');

    api('setAdminRole', change.nik, change.grant)
      .then(function (res) {
        restore();
        closeAdminChange();
        toast(res.message, 'success');
        loadAdminAccess();
      })
      .catch(function (err) {
        restore();
        toast(err.message, 'error');
      });
  }

  function setSettingsTab(tab) {
    var adminsPanel = $('settings-admins-panel');
    S.settingsTab = tab === 'categories' ? 'categories' : tab === 'bands' ? 'bands'
                  : tab === 'performance' ? 'performance' : tab === 'access' ? 'access' : tab === 'theme' ? 'theme'
                  : tab === 'fiscal' ? 'fiscal'
                  : tab === 'admins' && adminsPanel ? 'admins' : 'periods';
    $('settings-periods-panel').classList.toggle('hidden', S.settingsTab !== 'periods');
    $('settings-fiscal-panel').classList.toggle('hidden', S.settingsTab !== 'fiscal');
    $('settings-access-panel').classList.toggle('hidden', S.settingsTab !== 'access');
    $('settings-theme-panel').classList.toggle('hidden', S.settingsTab !== 'theme');
    $('settings-categories-panel').classList.toggle('hidden', S.settingsTab !== 'categories');
    $('settings-bands-panel').classList.toggle('hidden', S.settingsTab !== 'bands');
    $('settings-performance-panel').classList.toggle('hidden', S.settingsTab !== 'performance');
    if (adminsPanel) adminsPanel.classList.toggle('hidden', S.settingsTab !== 'admins');
    var nav = $('settings-tabs');
    document.querySelectorAll('#settings-tabs [data-settings-tab]').forEach(function (b) {
      var on = b.dataset.settingsTab === S.settingsTab;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on && nav && nav.scrollWidth > nav.clientWidth + 1) nav.scrollLeft = Math.max(0, b.offsetLeft - 16);
    });
    loadSettingsTab(S.settingsTab);
  }

  function bandDefaults() {
    return (S.bandData && S.bandData.defaults) || { good: 75, excellent: 90 };
  }

  function bandCheck(good, excellent) {
    if (!isNum(good) || !isNum(excellent)) return 'Enter both thresholds as numbers.';
    if (good <= 0) return 'The Good threshold must be higher than 0.';
    if (excellent > 100) return 'The Excellent threshold cannot be higher than 100.';
    if (good >= excellent) return 'The Good threshold must be lower than the Excellent threshold, otherwise the ranges overlap.';
    return '';
  }

  function loadRatingBands() {
    $('bands-control').innerHTML = '<div class="skeleton h-56 w-full"></div>';

    api('getRatingBands')
      .then(function (data) {
        S.bandData = data;
        S.bandDraft = { good: data.good, excellent: data.excellent };
        syncBands(data);
        renderBandPanel();
      })
      .catch(function (err) {
        $('bands-control').innerHTML = '<p class="text-body-md text-status-danger-text text-center">' + esc(err.message) + '</p>';
        toast(err.message, 'error');
      });
  }

  function bandBadge(key, size) {
    var m = BAND_META[key];
    return '<span class="grade-badge band-' + key + (size ? ' grade-' + size : '') + '" title="' + m.label + '">' +
      '<span class="material-symbols-outlined ' + (size === 'md' ? 'text-[20px]' : 'text-[15px]') + '">' + m.icon + '</span></span>';
  }

  function bandSegments(d) {
    return [
      { key: 'danger',  min: 0,           max: d.good,      label: 'Below ' + bandNum(d.good) },
      { key: 'info',    min: d.good,      max: d.excellent, label: bandNum(d.good) + ' to ' + bandNum(d.excellent - 0.1) },
      { key: 'success', min: d.excellent, max: 100,         label: bandNum(d.excellent) + ' to 100' }
    ];
  }

  function bandScaleHtml(d) {
    var segs = bandSegments(d);
    var bar = segs.map(function (seg) {
      var m = BAND_META[seg.key];
      var width = Math.max(0, Math.round((seg.max - seg.min) * 100) / 100);
      return '<div class="h-full flex items-center justify-center overflow-hidden whitespace-nowrap font-bold text-white text-[12px]" style="width:' + width + '%;background:' + m.hex + '"' +
        ' title="' + m.label + ': ' + seg.label + '">' +
        (width >= Math.max(8, m.label.length * 1.4) ? m.label : width >= 4 ? '<span class="material-symbols-outlined text-[16px]">' + m.icon + '</span>' : '') + '</div>';
    }).join('');
    return '<div class="grade-scale w-full" aria-hidden="true">' +
      '<div class="flex h-9 w-full rounded-lg overflow-hidden ring-1 ring-black/5">' + bar + '</div>' +
      '<div class="relative h-4 mt-1">' + gradeScaleTicks(segs) + '</div>' +
    '</div>';
  }

  function bandLegendHtml(d) {
    return bandSegments(d).slice().reverse().map(function (seg) {
      return '<span class="inline-flex items-center gap-1.5 whitespace-nowrap">' + bandBadge(seg.key) +
        '<span class="font-semibold text-text-primary">' + esc(BAND_META[seg.key].label) + '</span>' +
        '<span class="text-text-secondary">' + esc(seg.label) + '</span></span>';
    }).join('');
  }

  function renderBandPanel() {
    var host = $('bands-control');
    if (!host) return;
    var d = S.bandDraft || bandValues();
    var def = bandDefaults();
    var saved = S.bandData || bandValues();
    var custom = saved.good !== def.good || saved.excellent !== def.excellent;
    var defaultsText = 'Excellent from ' + bandNum(def.excellent) + ', Good from ' + bandNum(def.good);
    var value = function (v) { return isNum(v) ? String(v) : ''; };
    var row = function (key, id, label, hint, v) {
      return '<div class="flex items-center gap-3 py-2.5">' + bandBadge(key, 'md') +
        '<div class="min-w-0 flex-1">' +
          '<label for="' + id + '" class="block text-body-md font-semibold text-text-primary">' + label + '</label>' +
          '<p class="text-label-xs text-text-muted">' + hint + '</p>' +
        '</div>' +
        '<input id="' + id + '" type="number" inputmode="decimal" step="0.1" min="0.1" max="100" class="field !w-28 shrink-0 text-right tabular-nums"' +
          ' value="' + value(v) + '" oninput="MGI.onBandInput()" onwheel="this.blur()">' +
      '</div>';
    };

    host.innerHTML =
      '<div class="flex flex-col gap-space-lg">' +
        '<div class="flex flex-col md:flex-row md:items-start justify-between gap-space-md">' +
          '<div class="min-w-0">' +
            '<h2 class="text-title-lg text-text-primary">Rating Bands</h2>' +
            '<p class="text-body-sm text-text-muted max-w-2xl">Set where each rating starts for the monthly KPI index. The three ranges always connect, so a score can never fall between two bands. ' +
              'Bands apply to every year. Performance Score grades are set in Performance Scoring.</p>' +
          '</div>' +
          '<div class="flex flex-wrap items-center gap-2 shrink-0">' +
            (custom
              ? '<span class="pill pill-info">Custom bands</span>'
              : '<span class="pill pill-neutral" title="' + defaultsText + '">Using defaults</span>') +
          '</div>' +
        '</div>' +
        '<div class="grid grid-cols-1 xl:grid-cols-2 gap-space-lg items-start">' +
          '<section class="rounded-xl border border-border-light overflow-hidden">' +
            '<div class="px-space-md py-space-sm bg-surface-page border-b border-border-light flex items-center justify-between gap-2">' +
              '<h3 class="text-title-md text-text-primary">Band thresholds</h3>' +
              '<span class="pill pill-neutral !text-[11px]">KPI index, 0 to 100</span>' +
            '</div>' +
            '<div class="px-space-md divide-y divide-slate-100">' +
              row('success', 'band-excellent', 'Excellent starts at', 'Top band, up to 100', d.excellent) +
              row('info', 'band-good', 'Good starts at', 'Below Excellent', d.good) +
              '<div class="flex items-center gap-3 py-2.5">' + bandBadge('danger', 'md') +
                '<div class="min-w-0 flex-1"><p class="text-body-md font-semibold text-text-primary">Needs Attention</p>' +
                '<p class="text-label-xs text-text-muted">Every score below Good</p></div>' +
                '<span id="band-na" class="text-body-sm font-semibold text-text-secondary w-28 text-right">-</span>' +
              '</div>' +
            '</div>' +
          '</section>' +
          '<section class="rounded-xl border border-border-light overflow-hidden">' +
            '<div class="px-space-md py-space-sm bg-surface-page border-b border-border-light">' +
              '<h3 class="text-title-md text-text-primary">Band scale</h3>' +
            '</div>' +
            '<div class="px-space-md py-space-md flex flex-col gap-2">' +
              '<div id="band-preview"></div>' +
              '<div id="band-legend" class="flex flex-wrap gap-x-4 gap-y-1.5 text-label-xs"></div>' +
            '</div>' +
          '</section>' +
        '</div>' +
        '<div id="band-samples" class="rounded-xl border border-border-light bg-surface-page px-space-md py-space-sm text-body-sm text-text-secondary"></div>' +
        '<p id="band-error" class="hidden text-label-sm text-status-danger-text"></p>' +
        '<div class="flex flex-wrap items-center gap-space-sm">' +
          '<button id="band-save" type="button" class="btn btn-primary" onclick="MGI.saveRatingBands()">' +
            '<span class="material-symbols-outlined text-[18px]">save</span> Save Bands</button>' +
          '<button type="button" class="btn btn-secondary" onclick="MGI.resetRatingBands()" title="' + defaultsText + '">' +
            '<span class="material-symbols-outlined text-[18px]">restart_alt</span> Defaults</button>' +
        '</div>' +
      '</div>';

    renderBandPreview();
  }

  function onBandInput() {
    S.bandDraft = {
      good: parseFloat($('band-good').value),
      excellent: parseFloat($('band-excellent').value)
    };
    renderBandPreview();
  }

  function renderBandPreview() {
    var d = S.bandDraft || bandValues();
    var saved = S.bandData || bandValues();
    var error = bandCheck(d.good, d.excellent);
    var dirty = d.good !== saved.good || d.excellent !== saved.excellent;

    $('band-error').textContent = error;
    $('band-error').classList.toggle('hidden', !error);
    $('band-save').disabled = !!error || !dirty;
    $('band-na').textContent = isNum(d.good) ? 'Below ' + bandNum(d.good) : '-';
    if (error) {
      $('band-preview').innerHTML = '';
      $('band-legend').innerHTML = '';
      $('band-samples').innerHTML = '<span class="text-text-muted">Fix the thresholds above to see the scale.</span>';
      return;
    }

    $('band-preview').innerHTML = bandScaleHtml(d);
    $('band-legend').innerHTML = bandLegendHtml(d);
    $('band-samples').innerHTML =
      '<div class="flex flex-wrap items-center gap-x-2 gap-y-1.5">' +
        '<span class="material-symbols-outlined text-[18px] text-text-muted">lightbulb</span>' +
        '<span>Sample scores</span>' +
        [100, 95, 90, 85, 80, 75, 70, 60].map(function (v) {
          var key = v >= d.excellent ? 'success' : v >= d.good ? 'info' : 'danger';
          return '<span class="pill pill-' + key + ' !text-[11px]">' + v + ' ' + BAND_META[key].label + '</span>';
        }).join('') +
      '</div>';
  }

  function resetRatingBands() {
    var def = bandDefaults();
    S.bandDraft = { good: def.good, excellent: def.excellent };
    renderBandPanel();
  }

  function saveRatingBands() {
    var d = S.bandDraft || bandValues();
    var error = bandCheck(d.good, d.excellent);
    if (error) {
      toast(error, 'error');
      return;
    }

    $('band-save').disabled = true;
    api('saveRatingBands', { good: d.good, excellent: d.excellent })
      .then(function (data) {
        S.bandData = data;
        S.bandDraft = { good: data.good, excellent: data.excellent };
        syncBands(data);
        renderBandPanel();
        toast(data.message, 'success');
      })
      .catch(function (err) {
        $('band-save').disabled = false;
        toast(err.message, 'error');
      });
  }

  function loadCategories() {
    S.catDraft = null;
    $('cat-notice').innerHTML = '';
    $('cat-grid').innerHTML = CATEGORY_META.map(function () {
      return '<div class="skeleton h-72 w-full"></div>';
    }).join('');
    renderCategorySaveBar();

    api('getCategories')
      .then(function (data) {
        S.categories = data;
        resetCategoryDraft();
        renderCategories();
      })
      .catch(function (err) {
        $('cat-grid').innerHTML =
          '<div class="lg:col-span-3 bg-surface-card rounded-xl p-space-lg text-center border border-dashed border-border-medium">' +
            '<p class="text-body-md text-status-danger-text">' + esc(err.message) + '</p>' +
          '</div>';
        toast(err.message, 'error');
      });
  }

  function reloadCategories() {
    guardUnsaved(loadCategories);
  }

  function resetCategoryDraft() {
    var saved = S.categories.categories || {};
    S.catDraft = {};
    CATEGORY_META.forEach(function (t) {
      S.catDraft[t.key] = (saved[t.key] || []).map(function (c) {
        return { value: c.value, active: c.active, used: c.used || 0, isNew: false };
      });
    });
  }

  function categoryChangeCount() {
    if (!S.catDraft || !S.categories || !S.categories.categories) return 0;
    var n = 0;
    CATEGORY_META.forEach(function (t) {
      var saved = {};
      (S.categories.categories[t.key] || []).forEach(function (c) { saved[c.value.toLowerCase()] = c; });
      var seen = {};
      (S.catDraft[t.key] || []).forEach(function (c) {
        var key = c.value.toLowerCase();
        seen[key] = true;
        if (!saved[key] || saved[key].active !== c.active) n++;
      });
      Object.keys(saved).forEach(function (key) { if (!seen[key]) n++; });
    });
    return n;
  }

  function isCategoryDirty() {
    return categoryChangeCount() > 0;
  }

  function renderCategories() {
    if (!S.catDraft) return;
    var pending = !!S.categories.setupPending;

    $('cat-notice').innerHTML =
      '<div class="flex items-start gap-space-sm rounded-xl p-space-md border ' + (pending ? 'pill-warning' : 'pill-info') + '">' +
        '<span class="material-symbols-outlined text-[22px]">' + (pending ? 'cloud_off' : 'info') + '</span>' +
        '<div class="text-body-sm leading-relaxed">' +
          (pending
            ? '<p class="font-semibold">The Categories sheet has not been created yet.</p>' +
              '<p>The list below combines the default options with values already used by Master KPIs. Click <strong>Save</strong> to create the sheet.</p>'
            : '') +
          '<p>Values used by Master KPIs cannot be deleted, only deactivated. Inactive values disappear from form dropdowns while existing KPI data stays intact.</p>' +
        '</div>' +
      '</div>';

    $('cat-grid').innerHTML = CATEGORY_META.map(categoryCard).join('');
    renderCategorySaveBar();
  }

  function categoryCard(t) {
    var lower = t.key.toLowerCase();
    return '<div class="bg-surface-card rounded-xl shadow-level-1 border border-border-light overflow-hidden">' +
      '<div class="p-space-md border-b border-border-light flex items-center gap-space-sm">' +
        '<span class="w-10 h-10 rounded-lg bg-slate-50 ring-1 ring-slate-200/70 text-slate-600 flex items-center justify-center shrink-0">' +
          '<span class="material-symbols-outlined text-[22px]">' + t.icon + '</span></span>' +
        '<div class="min-w-0 flex-1">' +
          '<h2 class="text-title-lg text-text-primary">' + esc(t.key) + '</h2>' +
          '<p class="text-label-xs text-text-muted">' + esc(t.hint) + '</p>' +
        '</div>' +
        '<span class="pill pill-neutral !text-[11px]" data-cat-count="' + t.key + '">' + categoryCountLabel(t.key) + '</span>' +
      '</div>' +
      '<div class="p-space-md border-b border-border-light bg-surface-page">' +
        '<div class="flex items-center gap-space-xs">' +
          '<input id="cat-new-' + lower + '" type="text" maxlength="80" class="field" placeholder="Add a new ' + esc(t.key) + '"' +
            ' oninput="MGI.onCategoryInput(\'' + t.key + '\')" onkeydown="MGI.onCategoryKey(event, \'' + t.key + '\')">' +
          '<button class="btn btn-secondary !px-3 shrink-0" onclick="MGI.addCategory(\'' + t.key + '\')">' +
            '<span class="material-symbols-outlined text-[18px]">add</span>Add</button>' +
        '</div>' +
        '<p id="cat-err-' + lower + '" class="text-label-xs text-status-danger-text mt-1.5 hidden"></p>' +
      '</div>' +
      '<div id="cat-list-' + lower + '" class="cat-list">' + categoryListHtml(t.key) + '</div>' +
    '</div>';
  }

  function categoryCountLabel(type) {
    var list = S.catDraft[type] || [];
    return list.filter(function (c) { return c.active; }).length + ' / ' + list.length + ' active';
  }

  function categoryListHtml(type) {
    var list = S.catDraft[type] || [];
    if (!list.length) {
      return '<p class="text-body-sm text-text-muted text-center py-space-lg">No values yet.</p>';
    }
    return list.map(function (c, i) {
      return '<div class="cat-row' + (c.active ? '' : ' is-inactive') + '">' +
        '<div class="min-w-0 flex-1">' +
          '<p class="cat-value text-label-md text-text-primary font-semibold break-words">' + esc(c.value) + '</p>' +
          '<div class="flex items-center gap-space-xs flex-wrap mt-0.5">' +
            (c.isNew ? '<span class="pill pill-warning !py-0 !px-2 !text-[11px]">New</span>' : '') +
            (c.used
              ? '<span class="pill pill-info !py-0 !px-2 !text-[11px]">Used by ' + plural(c.used, 'KPI') + '</span>'
              : '<span class="text-label-xs text-text-muted">Not used yet</span>') +
          '</div>' +
        '</div>' +
        '<label class="switch" title="' + (c.active ? 'Deactivate: hide from form dropdowns' : 'Reactivate') + '">' +
          '<input type="checkbox"' + (c.active ? ' checked' : '') +
            ' onchange="MGI.toggleCategory(\'' + type + '\', ' + i + ')">' +
          '<span class="switch-track"><span class="switch-thumb"></span></span>' +
          '<span class="switch-label">' + (c.active ? 'Active' : 'Inactive') + '</span>' +
        '</label>' +
        (c.used
          ? '<span class="cat-lock" title="Used by ' + c.used + ' Master KPIs, can only be deactivated">' +
              '<span class="material-symbols-outlined text-[18px]">lock</span></span>'
          : '<button class="btn-trash" title="Delete ' + esc(c.value) + '" onclick="MGI.removeCategory(\'' + type + '\', ' + i + ')">' +
              '<span class="material-symbols-outlined text-[20px]">delete</span></button>') +
      '</div>';
    }).join('');
  }

  function renderCategoryList(type) {
    var host = $('cat-list-' + type.toLowerCase());
    if (host) host.innerHTML = categoryListHtml(type);
    var badge = document.querySelector('[data-cat-count="' + type + '"]');
    if (badge) badge.textContent = categoryCountLabel(type);
    renderCategorySaveBar();
  }

  function cleanCategoryValue(v) {
    return String(v || '').replace(/\s+/g, ' ').trim();
  }

  function categoryError(type, value) {
    if (!value) return 'Enter a ' + type + ' name first.';
    if (value.length > 80) return 'Maximum 80 characters.';
    var dup = (S.catDraft[type] || []).filter(function (c) {
      return c.value.toLowerCase() === value.toLowerCase();
    })[0];
    if (!dup) return '';
    return type + " '" + dup.value + "' already exists" + (dup.active ? '.' : ' and is inactive. Reactivate it from the list.');
  }

  function showCategoryError(type, message) {
    var el = $('cat-err-' + type.toLowerCase());
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('hidden', !message);
  }

  function onCategoryInput(type) {
    var value = cleanCategoryValue($('cat-new-' + type.toLowerCase()).value);
    showCategoryError(type, value ? categoryError(type, value) : '');
  }

  function onCategoryKey(ev, type) {
    if (ev.key !== 'Enter') return;
    ev.preventDefault();
    addCategory(type);
  }

  function addCategory(type) {
    if (!S.catDraft) return;
    var input = $('cat-new-' + type.toLowerCase());
    var value = cleanCategoryValue(input.value);
    var err = categoryError(type, value);
    if (err) { showCategoryError(type, err); return; }

    var wasSaved = ((S.categories.categories || {})[type] || []).some(function (c) {
      return c.value.toLowerCase() === value.toLowerCase();
    });
    S.catDraft[type].push({ value: value, active: true, used: 0, isNew: !wasSaved });
    input.value = '';
    showCategoryError(type, '');
    renderCategoryList(type);
  }

  function toggleCategory(type, index) {
    var c = S.catDraft && S.catDraft[type] ? S.catDraft[type][index] : null;
    if (!c) return;
    c.active = !c.active;
    renderCategoryList(type);
  }

  function removeCategory(type, index) {
    var c = S.catDraft && S.catDraft[type] ? S.catDraft[type][index] : null;
    if (!c) return;
    if (c.used) {
      toast(type + " '" + c.value + "' is used by " + c.used + ' KPIs and can only be deactivated.', 'warning');
      return;
    }
    S.catDraft[type].splice(index, 1);
    renderCategoryList(type);
  }

  function renderCategorySaveBar() {
    var bar = $('cat-savebar');
    if (!bar) return;
    var n = categoryChangeCount();
    var pending = !!(S.catDraft && S.categories && S.categories.setupPending);
    var show = n > 0 || pending;

    bar.classList.toggle('hidden', !show);
    bar.innerHTML = !show ? '' :
      '<div class="cat-savebar-inner">' +
        '<span class="material-symbols-outlined text-status-warning">' + (n ? 'edit_note' : 'cloud_upload') + '</span>' +
        '<p class="text-body-sm text-text-secondary flex-1 min-w-0">' +
          '<strong class="text-text-primary">' + (n ? n + ' unsaved changes' : 'Initial list not saved yet') + '.</strong> ' +
          (n ? 'Inactive values are hidden from Master KPI forms.' : 'Save to create the Categories sheet.') +
        '</p>' +
        (n ? '<button class="btn btn-secondary" onclick="MGI.discardCategories()">Discard</button>' : '') +
        '<button id="cat-save" class="btn btn-primary" onclick="MGI.saveCategories()">' +
          '<span class="material-symbols-outlined text-[18px]">save</span>Save</button>' +
      '</div>';
  }

  function discardCategories() {
    if (!S.catDraft || !S.categories) return;
    resetCategoryDraft();
    renderCategories();
  }

  function saveCategories() {
    if (!S.catDraft) return;
    var payload = {};
    CATEGORY_META.forEach(function (t) {
      payload[t.key] = S.catDraft[t.key].map(function (c) { return { value: c.value, active: c.active }; });
    });

    var restore = busy($('cat-save'), 'Saving');
    api('saveCategories', payload)
      .then(function (data) {
        S.categories = data;
        resetCategoryDraft();
        renderCategories();
        toast(data.message, 'success');
      })
      .catch(function (err) {
        restore();
        toast(err.message, 'error');
      });
  }

  return {
    boot: boot,
    go: go,
    toggleSidebar: toggleSidebar,

    loadMyKpis: loadMyKpis,
    togglePeriodPicker: togglePeriodPicker,
    closePeriodPicker: closePeriodPicker,
    pickPeriod: pickPeriod,
    onPeriodTriggerKey: onPeriodTriggerKey,
    onPeriodPickerKey: onPeriodPickerKey,
    discardRoleChanges: discardRoleChanges,
    continueFilling: continueFilling,
    onRealisasiInput: onRealisasiInput,
    clearFile: clearFile,
    submitRole: submitRole,
    toggleEmpRole: toggleEmpRole,
    toggleEmpHistory: toggleEmpHistory,

    onEmployeeSelect: onEmployeeSelect,
    switchEmployee: switchEmployee,
    cancelLeave: cancelLeave,
    confirmLeave: confirmLeave,
    openSwitcher: openSwitcher,
    filterSwitcher: filterSwitcher,
    onSwitcherKey: onSwitcherKey,
    pickSwitcher: pickSwitcher,
    toggleHistoryBasket: toggleHistoryBasket,
    setMapTab: setMapTab,
    renderEmployeeList: renderEmployeeList,
    openWorkspace: openWorkspace,
    backToPicker: backToPicker,
    resetCatalogueFilter: resetCatalogueFilter,
    onFilterChange: onFilterChange,
    toggleRoleGroup: toggleRoleGroup,
    renderCatalogue: renderCatalogue,
    addRoleGroup: addRoleGroup,
    deactivateRoleGroup: deactivateRoleGroup,
    activateRoleGroup: activateRoleGroup,
    toggleCatGroup: toggleCatGroup,
    saveMapping: saveMapping,
    openMasterModal: openMasterModal,
    renderMasterCapacity: renderMasterCapacity,
    closeMasterModal: closeMasterModal,
    saveMasterKpi: saveMasterKpi,
    openBatchModal: openBatchModal,
    closeBatchModal: closeBatchModal,
    addBatchRow: addBatchRow,
    removeBatchRow: removeBatchRow,
    recalcBatch: recalcBatch,
    saveBatch: saveBatch,
    autoGrow: autoGrow,
    blockEnter: blockEnter,

    loadSummary: loadSummary,
    setSumFilter: setSumFilter,
    openSummaryFor: openSummaryFor,
    openDashJump: openDashJump,
    sortSummary: sortSummary,
    openAllowChange: openAllowChange,
    closeAllowChange: closeAllowChange,
    confirmAllowChange: confirmAllowChange,
    closeLastChange: closeLastChange,
    confirmLastChange: confirmLastChange,
    toggleHelp: toggleHelp,
    openHelp: openHelp,
    closeHelp: closeHelp,
    setHelpTopic: setHelpTopic,
    onHelpNote: onHelpNote,
    onHelpKey: onHelpKey,
    helpSent: helpSent,
    sortAnnual: sortAnnual,
    sortEvaluation: sortEvaluation,
    openReminders: openReminders,
    closeReminders: closeReminders,
    confirmReminders: confirmReminders,
    gotoPage: gotoPage,
    onPeriodToggle: onPeriodToggle,
    openPeriodDate: openPeriodDate,
    openPeriodBulk: openPeriodBulk,
    onPeriodDateInput: onPeriodDateInput,
    togglePeriodBulkPick: togglePeriodBulkPick,
    closePeriodConfirm: closePeriodConfirm,
    confirmPeriodChange: confirmPeriodChange,
    exportCsv: exportCsv,
    openPerformanceReport: openPerformanceReport,
    closePerformanceReport: closePerformanceReport,
    setReportRole: setReportRole,
    setReportTab: setReportTab,
    toggleDeepDive: toggleDeepDive,
    setPageSize: setPageSize,
    downloadPerformancePdf: downloadPerformancePdf,
    openReportDownload: openReportDownload,
    closeReportDownload: closeReportDownload,
    onReportDialog: onReportDialog,
    downloadOrgReport: downloadOrgReport,
    onReportYearChange: onReportYearChange,
    setEmpView: setEmpView,
    setSumView: setSumView,
    setSettingsTab: setSettingsTab,
    onMapYearChange: onMapYearChange,
    onPeriodYearChange: onPeriodYearChange,
    loadFiscalYear: loadFiscalYear,
    openYearSwitch: openYearSwitch,
    closeYearSwitch: closeYearSwitch,
    confirmYearSwitch: confirmYearSwitch,
    reloadApp: reloadApp,
    openFiscalTarget: openFiscalTarget,
    loadMasterCatalog: loadMasterCatalog,
    setMasterView: setMasterView,
    reloadMaster: reloadMaster,
    onKpiHealthYear: onKpiHealthYear,
    onKpiHealthDivision: onKpiHealthDivision,
    renderKpiHealth: renderKpiHealth,
    sortKpiHealth: sortKpiHealth,
    pickKpiHealthFlag: pickKpiHealthFlag,
    renderMasterTree: renderMasterTree,
    toggleMasterNode: toggleMasterNode,
    toggleMasterRole: toggleMasterRole,
    downloadMasterTemplate: downloadMasterTemplate,
    submitMasterUpload: submitMasterUpload,
    clearMasterUpload: clearMasterUpload,
    onYearChange: onYearChange,
    refreshDashboard: refreshDashboard,
    resetDashFilters: resetDashFilters,
    submitLogin: submitLogin,
    onCapsCheck: onCapsCheck,
    toggleAccountMenu: toggleAccountMenu,
    accountAction: accountAction,
    guideJump: guideJump,
    renderGuideCalc: renderGuideCalc,
    onDeclareChange: onDeclareChange,
    togglePasswordField: togglePasswordField,
    openPasswordScreen: openPasswordScreen,
    closePasswordScreen: closePasswordScreen,
    onPasswordInput: onPasswordInput,
    submitPassword: submitPassword,
    signOut: signOut,
    openResetPassword: openResetPassword,
    closeResetPassword: closeResetPassword,
    confirmResetPassword: confirmResetPassword,
    openBulkAssign: openBulkAssign,
    closeBulkAssign: closeBulkAssign,
    setBulkGroup: setBulkGroup,
    onBulkSearch: onBulkSearch,
    toggleBulkMatch: toggleBulkMatch,
    toggleBulkNik: toggleBulkNik,
    selectAllBulk: selectAllBulk,
    clearBulkSelection: clearBulkSelection,
    onBulkGroupSearch: onBulkGroupSearch,
    setBulkDivision: setBulkDivision,
    toggleBulkGroups: toggleBulkGroups,
    confirmMasterYear: confirmMasterYear,
    onAccessFilter: onAccessFilter,
    resetAccessFilters: resetAccessFilters,
    toggleAccessPick: toggleAccessPick,
    toggleAccessAll: toggleAccessAll,
    clearAccessPicks: clearAccessPicks,
    setAccessScope: setAccessScope,
    grantSelectedAccess: grantSelectedAccess,
    onViewerSearch: onViewerSearch,
    setViewerScope: setViewerScope,
    removeViewer: removeViewer,
    onThemeYear: onThemeYear,
    onThemeInput: onThemeInput,
    saveTheme: saveTheme,
    closeMasterYear: closeMasterYear,
    applyMasterYear: applyMasterYear,
    onBulkGroupKey: onBulkGroupKey,
    applyBulkAssign: applyBulkAssign,
    setDashGroup: setDashGroup,

    loadAdminAccess: loadAdminAccess,
    onAdminSearch: onAdminSearch,
    openAdminChange: openAdminChange,
    closeAdminChange: closeAdminChange,
    confirmAdminChange: confirmAdminChange,
    loadRatingBands: loadRatingBands,
    onBandInput: onBandInput,
    saveRatingBands: saveRatingBands,
    resetRatingBands: resetRatingBands,

    loadEvaluation: loadEvaluation,
    onEvalYearChange: onEvalYearChange,
    onEvalDivisionChange: onEvalDivisionChange,
    onEvalFilter: onEvalFilter,
    onEvalSearch: onEvalSearch,
    resetEvalFilters: resetEvalFilters,
    openPerformanceRules: openPerformanceRules,
    openEvalEdit: openEvalEdit,
    closeEvalEdit: closeEvalEdit,
    onEvalInput: onEvalInput,
    setEvalSp: setEvalSp,
    submitEvalEdit: submitEvalEdit,
    saveEvalEdit: saveEvalEdit,
    askEvalClear: askEvalClear,
    cancelEvalConfirm: cancelEvalConfirm,
    confirmEvalClear: confirmEvalClear,
    exportEvalCsv: exportEvalCsv,
    downloadEvalTemplate: downloadEvalTemplate,
    toggleEvalUpload: toggleEvalUpload,
    openEvalUpload: openEvalUpload,
    clearEvalUpload: clearEvalUpload,
    submitEvalUpload: submitEvalUpload,
    openEvalRelease: openEvalRelease,
    closeEvalRelease: closeEvalRelease,
    confirmEvalRelease: confirmEvalRelease,
    loadPerformanceSettings: loadPerformanceSettings,
    onPerfInput: onPerfInput,
    onPerfYearChange: onPerfYearChange,
    resetPerfDefaults: resetPerfDefaults,
    copyPerfFrom: copyPerfFrom,
    savePerfSettings: savePerfSettings,

    loadCategories: loadCategories,
    reloadCategories: reloadCategories,
    onCategoryInput: onCategoryInput,
    onCategoryKey: onCategoryKey,
    addCategory: addCategory,
    toggleCategory: toggleCategory,
    removeCategory: removeCategory,
    discardCategories: discardCategories,
    saveCategories: saveCategories
  };
})();

document.addEventListener('DOMContentLoaded', MGI.boot);
