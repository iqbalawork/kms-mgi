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
  empRole: '',
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
  easy:    { label: 'Easy',            pill: 'pill-warning', text: 'text-status-warning', icon: 'trending_up',     order: 1, caption: 'Most results land at tier 1.0' },
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

var BOOT_CACHE_KEY = 'mgi_kpi_boot';

var BOOT_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

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
