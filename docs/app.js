// ── CONFIG ────────────────────────────────────────────────────────────────────

const API_URL = 'https://fraudshield-cv7g.onrender.com';
// ─────────────────────────────────────────────────────────────────────────────

// ── CITY COORDINATES (for auto distance calculation) ──────────────────────────
const CITY_COORDS = {
  "Amsterdam":      [52.3676,    4.9041],
  "Atlanta":        [33.7490,  -84.3880],
  "Austin":         [30.2672,  -97.7431],
  "Bangkok":        [13.7563,  100.5018],
  "Berlin":         [52.5200,   13.4050],
  "Boston":         [42.3601,  -71.0589],
  "Brussels":       [50.8503,    4.3517],
  "Buenos Aires":   [-34.6037, -58.3816],
  "Cairo":          [30.0444,   31.2357],
  "Calgary":        [51.0447, -114.0719],
  "Charlotte":      [35.2271,  -80.8431],
  "Chicago":        [41.8781,  -87.6298],
  "Columbus":       [39.9612,  -82.9988],
  "Copenhagen":     [55.6761,   12.5683],
  "Dallas":         [32.7767,  -96.7970],
  "Denver":         [39.7392, -104.9903],
  "Detroit":        [42.3314,  -83.0458],
  "Dubai":          [25.2048,   55.2708],
  "Dublin":         [53.3498,   -6.2603],
  "Helsinki":       [60.1695,   24.9354],
  "Hong Kong":      [22.3193,  114.1694],
  "Houston":        [29.7604,  -95.3698],
  "Indianapolis":   [39.7684,  -86.1581],
  "Istanbul":       [41.0082,   28.9784],
  "Lagos":          [ 6.5244,    3.3792],
  "Las Vegas":      [36.1699, -115.1398],
  "Lisbon":         [38.7223,   -9.1393],
  "London":         [51.5074,   -0.1278],
  "Los Angeles":    [34.0522, -118.2437],
  "Louisville":     [38.2527,  -85.7585],
  "Madrid":         [40.4168,   -3.7038],
  "Memphis":        [35.1495,  -90.0490],
  "Mexico City":    [19.4326,  -99.1332],
  "Miami":          [25.7617,  -80.1918],
  "Montreal":       [45.5017,  -73.5673],
  "Mumbai":         [19.0760,   72.8777],
  "Nashville":      [36.1627,  -86.7816],
  "New York":       [40.7128,  -74.0060],
  "Oslo":           [59.9139,   10.7522],
  "Paris":          [48.8566,    2.3522],
  "Philadelphia":   [39.9526,  -75.1652],
  "Phoenix":        [33.4484, -112.0742],
  "Portland":       [45.5051, -122.6750],
  "Rome":           [41.9028,   12.4964],
  "San Antonio":    [29.4241,  -98.4936],
  "San Diego":      [32.7157, -117.1611],
  "San Francisco":  [37.7749, -122.4194],
  "Seattle":        [47.6062, -122.3321],
  "Seoul":          [37.5665,  126.9780],
  "Singapore":      [ 1.3521,  103.8198],
  "Stockholm":      [59.3293,   18.0686],
  "Sydney":         [-33.8688, 151.2093],
  "São Paulo":      [-23.5505, -46.6333],
  "Tokyo":          [35.6762,  139.6503],
  "Toronto":        [43.6532,  -79.3832],
  "Vancouver":      [49.2827, -123.1207],
  "Vienna":         [48.2082,   16.3738],
  "Washington DC":  [38.9072,  -77.0369],
  "Zurich":         [47.3769,    8.5472],
};

// NOTE: CITY_COUNTRY and CITY_COORDS must stay in sync with each other and with
// the <select> option lists in index.html. If a city is present in the <select>
// but absent from CITY_COORDS, haversine() returns null and the user sees a
// warning in the geo-summary field rather than a stale distance value.
const CITY_COUNTRY = {
  "Amsterdam": "NL",
  "Atlanta": "US",
  "Austin": "US",
  "Bangkok": "TH",
  "Berlin": "DE",
  "Boston": "US",
  "Brussels": "BE",
  "Buenos Aires": "AR",
  "Cairo": "EG",
  "Calgary": "CA",
  "Charlotte": "US",
  "Chicago": "US",
  "Columbus": "US",
  "Copenhagen": "DK",
  "Dallas": "US",
  "Denver": "US",
  "Detroit": "US",
  "Dubai": "AE",
  "Dublin": "IE",
  "Helsinki": "FI",
  "Hong Kong": "HK",
  "Houston": "US",
  "Indianapolis": "US",
  "Istanbul": "TR",
  "Lagos": "NG",
  "Las Vegas": "US",
  "Lisbon": "PT",
  "London": "GB",
  "Los Angeles": "US",
  "Louisville": "US",
  "Madrid": "ES",
  "Memphis": "US",
  "Mexico City": "MX",
  "Miami": "US",
  "Montreal": "CA",
  "Mumbai": "IN",
  "Nashville": "US",
  "New York": "US",
  "Oslo": "NO",
  "Paris": "FR",
  "Philadelphia": "US",
  "Phoenix": "US",
  "Portland": "US",
  "Rome": "IT",
  "San Antonio": "US",
  "San Diego": "US",
  "San Francisco": "US",
  "Seattle": "US",
  "Seoul": "KR",
  "Singapore": "SG",
  "Stockholm": "SE",
  "Sydney": "AU",
  "São Paulo": "BR",
  "Tokyo": "JP",
  "Toronto": "CA",
  "Vancouver": "CA",
  "Vienna": "AT",
  "Washington DC": "US",
  "Zurich": "CH",
};

function haversine(c1, c2) {
  if (!CITY_COORDS[c1] || !CITY_COORDS[c2]) return null;
  const [lat1, lon1] = CITY_COORDS[c1];
  const [lat2, lon2] = CITY_COORDS[c2];
  const R = 6371, toR = Math.PI / 180;
  const dLat = (lat2 - lat1) * toR, dLon = (lon2 - lon1) * toR;
  const a = Math.sin(dLat / 2) ** 2
          + Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function formatNumber(value) {
  return Number(value).toLocaleString();
}

function formatCurrency(value, decimals = 1) {
  return '$' + Number(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatHourLabel(hour) {
  return `${String(hour).padStart(2, '0')}:00`;
}

function formatDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return 'date unavailable';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatMetricLabel(value) {
  const map = {
    cv_pr_auc: 'CV PR-AUC',
    roc_auc: 'ROC-AUC',
    pr_auc: 'PR-AUC',
    Max24h_Utilization: 'Max 24h utilization',
    Spend_Velocity_Today: 'Spend velocity today',
    Daily_Transaction_Count: 'Daily transaction count',
    Daily_vs_Expected: 'Daily vs expected activity',
    Merchant_Category: 'Merchant category',
    Risk_x_AmtRatio: 'Risk flag × amount ratio',
    Amount_vs_Max24h: 'Amount vs max 24h',
    Max_Transaction_Last_24h: 'Max transaction last 24h',
    Risk_Flag_Count: 'Risk flag count',
    Spend_Ratio: 'Spend ratio',
    Tx_Velocity_Ratio: 'Transaction velocity ratio',
    Avg_Transaction_Amount: 'Average transaction amount',
    Hour_Cos: 'Time-of-day cyclic signal',
    Account_Balance: 'Account balance',
    Amount_vs_Avg: 'Amount vs average',
    Distance_From_Home: 'Distance from home',
    Previous_Fraud_Count: 'Previous fraud count',
    Unusual_Time_Transaction: 'Unusual time transaction',
  };
  if (map[value]) return map[value];
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function readNumberInput(id, fallback) {
  const value = Number.parseFloat(el(id)?.value ?? '');
  return Number.isFinite(value) ? value : fallback;
}

function getViewportWidth() {
  return Math.min(
    window.innerWidth || Number.POSITIVE_INFINITY,
    window.visualViewport?.width || Number.POSITIVE_INFINITY
  );
}

function getChartViewportMode() {
  const viewportWidth = getViewportWidth();
  if (viewportWidth <= 420) return 'small-phone';
  if (viewportWidth <= 480) return 'phone';
  return 'desktop';
}

function isInternationalRoute(home, location) {
  const homeCountry = CITY_COUNTRY[home];
  const txCountry   = CITY_COUNTRY[location];
  if (!homeCountry || !txCountry) return null;
  return homeCountry !== txCountry;
}

// ── STATE ─────────────────────────────────────────────────────────────────────
let EDA_DATA     = null;
let MODEL_DATA   = null;
let THRESH_DATA  = null;
let scoreHistory = [];
let charts       = {};
let _cmShowOpt   = false;   // toggles confusion matrix between 0.5 and optimal threshold
let _edaRendered = false;   // avoid rendering EDA charts while the panel is hidden
let _chartViewportMode = 'desktop';
let _viewportRefreshFrame = 0;

// ── CHART DEFAULTS ────────────────────────────────────────────────────────────
const THEME_KEY = 'fraudshield-theme';
let GRID  = '#1E2A3A';
let TEXT  = '#C5D4E8';
let MUTED = '#3D5270';
const MINT  = '#00C896';
const RED   = '#E8455A';
const AMBER = '#E8A020';
const BLUE  = '#3B82F6';
const PUR   = '#8B5CF6';

function cssVar(name, fallback = '') {
  const root = document.body || document.documentElement;
  const value = getComputedStyle(root).getPropertyValue(name).trim();
  return value || fallback;
}

function syncChartTheme() {
  GRID  = cssVar('--chart-grid', cssVar('--border', '#1E2A3A'));
  TEXT  = cssVar('--chart-text', cssVar('--text', '#C5D4E8'));
  MUTED = cssVar('--chart-muted', cssVar('--text-faint', '#3D5270'));

  const tooltipBg   = cssVar('--tooltip-bg', cssVar('--surface', '#141920'));
  const tooltipBody = cssVar('--tooltip-body', cssVar('--text-dim', '#7A92AE'));
  const viewportWidth = getViewportWidth();
  const isPhoneViewport = viewportWidth <= 480;
  const isSmallPhoneViewport = viewportWidth <= 420;
  const chartFontSize = isSmallPhoneViewport ? 8 : isPhoneViewport ? 9 : 10;
  const legendBoxWidth = isPhoneViewport ? 8 : 10;
  const legendPadding = isPhoneViewport ? 10 : 14;
  const tooltipPadding = isPhoneViewport ? 8 : 10;

  Chart.defaults.color                              = tooltipBody;
  Chart.defaults.borderColor                        = GRID;
  Chart.defaults.font.family                        = "'IBM Plex Mono', monospace";
  Chart.defaults.font.size                          = chartFontSize;
  Chart.defaults.plugins.legend.labels.boxWidth     = legendBoxWidth;
  Chart.defaults.plugins.legend.labels.padding      = legendPadding;
  Chart.defaults.plugins.legend.labels.color        = TEXT;
  Chart.defaults.plugins.tooltip.backgroundColor    = tooltipBg;
  Chart.defaults.plugins.tooltip.borderColor        = GRID;
  Chart.defaults.plugins.tooltip.borderWidth        = 1;
  Chart.defaults.plugins.tooltip.titleColor         = TEXT;
  Chart.defaults.plugins.tooltip.bodyColor          = tooltipBody;
  Chart.defaults.plugins.tooltip.padding            = tooltipPadding;
  Chart.defaults.animation.duration                 = 600;
}

function rerenderThemeSensitiveViews() {
  const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
  if (activeTab === 'eda' && EDA_DATA) {
    renderEDACharts(EDA_DATA);
    _edaRendered = true;
  }
  if (activeTab === 'model' && MODEL_DATA) renderModelCharts(MODEL_DATA, { force: true });
  if (activeTab === 'impact' && MODEL_DATA) recalcImpact();
}

function themeIconSvg(theme) {
  if (theme === 'dark') {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2"></circle>
      <line x1="12" y1="1.8" x2="12" y2="4.4"></line>
      <line x1="12" y1="19.6" x2="12" y2="22.2"></line>
      <line x1="1.8" y1="12" x2="4.4" y2="12"></line>
      <line x1="19.6" y1="12" x2="22.2" y2="12"></line>
      <line x1="4.8" y1="4.8" x2="6.7" y2="6.7"></line>
      <line x1="17.3" y1="17.3" x2="19.2" y2="19.2"></line>
      <line x1="17.3" y1="6.7" x2="19.2" y2="4.8"></line>
      <line x1="4.8" y1="19.2" x2="6.7" y2="17.3"></line>
    </svg>`;
  }
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M21 13.2A8.7 8.7 0 1 1 10.8 3 6.9 6.9 0 0 0 21 13.2z"></path>
  </svg>`;
}

function syncThemeToggle(theme) {
  const btn = el('theme-toggle');
  const icon = el('theme-toggle-icon');
  if (!btn || !icon) return;

  const isLight = theme === 'light';
  btn.setAttribute('aria-pressed', String(isLight));
  btn.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
  icon.innerHTML = themeIconSvg(theme);
}

function setTheme(theme, { persist = true, rerender = true } = {}) {
  const nextTheme = theme === 'light' ? 'light' : 'dark';
  if (document.body) document.body.dataset.theme = nextTheme;
  syncChartTheme();
  syncThemeToggle(nextTheme);

  if (persist) {
    try { localStorage.setItem(THEME_KEY, nextTheme); } catch (_) {}
  }
  if (rerender) rerenderThemeSensitiveViews();
}

function initTheme() {
  let initialTheme = 'dark';
  try {
    const storedTheme = localStorage.getItem(THEME_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') initialTheme = storedTheme;
  } catch (_) {}

  setTheme(initialTheme, { persist: false, rerender: false });

  const themeBtn = el('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const current = document.body?.dataset.theme === 'light' ? 'light' : 'dark';
      setTheme(current === 'light' ? 'dark' : 'light');
    });
  }
}

function makeChart(id, config) {
  if (charts[id]) charts[id].destroy();
  const ctx = document.getElementById(id);
  if (!ctx) return null;
  charts[id] = new Chart(ctx, config);
  return charts[id];
}

function resetAllCharts() {
  Object.values(charts).forEach(chart => chart.destroy());
  charts = {};
  _edaRendered = false;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function lerpColor(a, b, t) {
  const ah = a.replace('#', ''), bh = b.replace('#', '');
  return '#' + [0, 2, 4].map(i => {
    const av = parseInt(ah.slice(i, i + 2), 16);
    const bv = parseInt(bh.slice(i, i + 2), 16);
    return Math.round(av + (bv - av) * t).toString(16).padStart(2, '0');
  }).join('');
}

function el(id)           { return document.getElementById(id); }
function setText(id, val) { const e = el(id); if (e) e.textContent = val; }
function escapeHtml(value) {
  // SECURITY: All dynamic content written to innerHTML must go through escapeHtml.
  // Content written to textContent is safe without escaping.
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const pct = v => (v * 100).toFixed(2) + '%';

function animCount(element, target, suffix = '', dec = 0) {
  if (!element) return;
  const dur = 900, t0 = performance.now();
  const step = t => {
    const p = Math.min((t - t0) / dur, 1);
    const value = target * (1 - Math.pow(1 - p, 3));
    element.textContent = value.toLocaleString(undefined, {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
    }) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ── CONFUSION MATRIX HELPERS ──────────────────────────────────────────────────
function renderCM(cm) {
  const tn = Number(cm?.[0]?.[0] ?? 0);
  const fp = Number(cm?.[0]?.[1] ?? 0);
  const fn = Number(cm?.[1]?.[0] ?? 0);
  const tp = Number(cm?.[1]?.[1] ?? 0);
  const fmt = v => escapeHtml(Number.isFinite(v) ? Math.round(v).toLocaleString() : '0');
  el('cm-wrap').innerHTML = `
    <div class="cm-grid">
      <div class="cm-label"></div>
      <div class="cm-label">Pred Normal</div>
      <div class="cm-label">Pred Fraud</div>
      <div class="cm-label">Actual Normal</div>
      <div class="cm-cell tn">${fmt(tn)}<div class="cm-cell-type">TN</div></div>
      <div class="cm-cell fp">${fmt(fp)}<div class="cm-cell-type">FP</div></div>
      <div class="cm-label">Actual Fraud</div>
      <div class="cm-cell fn">${fmt(fn)}<div class="cm-cell-type">FN</div></div>
      <div class="cm-cell tp">${fmt(tp)}<div class="cm-cell-type">TP</div></div>
    </div>`;
}

function toggleCM() {
  if (!MODEL_DATA) return;
  _cmShowOpt = !_cmShowOpt;
  const btn   = el('cm-toggle-btn');
  const label = el('cm-thresh-label');
  if (_cmShowOpt) {
    renderCM(MODEL_DATA.confusion_matrix_opt);
    label.textContent = `@ ${MODEL_DATA.confusion_matrix_opt_thresh} (optimal F1)`;
    btn.textContent   = 'Show @ 0.5';
  } else {
    renderCM(MODEL_DATA.confusion_matrix);
    label.textContent = '@ 0.5';
    btn.textContent   = 'Show Optimal Threshold';
  }
}

// ── TABS ──────────────────────────────────────────────────────────────────────
function switchTab(id, btn) {
  document.querySelectorAll('.tab-panel').forEach(panel => {
    const active = panel.id === 'tab-' + id;
    panel.classList.toggle('active', active);
    panel.hidden = !active;
  });
  document.querySelectorAll('.tab-btn').forEach(tabBtn => {
    const active = tabBtn === btn;
    tabBtn.classList.toggle('active', active);
    tabBtn.setAttribute('aria-selected', String(active));
    tabBtn.tabIndex = active ? 0 : -1;
  });
  if (id === 'eda'    && EDA_DATA && !_edaRendered) {
    renderEDACharts(EDA_DATA);
    _edaRendered = true;
  }
  if (id === 'model'  && MODEL_DATA) renderModelCharts(MODEL_DATA);
  if (id === 'impact' && MODEL_DATA) recalcImpact();
}

function activateTab(id, { focus = true } = {}) {
  const btn = document.querySelector(`.tab-btn[data-tab="${id}"]`);
  if (!btn) return;
  switchTab(id, btn);
  if (focus) btn.focus();
}

function handleTabKeydown(event) {
  const tabs = [...document.querySelectorAll('.tab-btn')];
  const currentIndex = tabs.indexOf(event.currentTarget);
  if (currentIndex === -1) return;

  let nextIndex = null;
  if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
  if (event.key === 'ArrowLeft')  nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  if (event.key === 'Home')       nextIndex = 0;
  if (event.key === 'End')        nextIndex = tabs.length - 1;
  if (nextIndex === null) return;

  event.preventDefault();
  activateTab(tabs[nextIndex].dataset.tab);
}

// ── API ───────────────────────────────────────────────────────────────────────
async function apiFetch(path) {
  const res = await fetch(API_URL + path, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── BOOT ──────────────────────────────────────────────────────────────────────
async function boot() {
  // Check API health first.
  let healthOk = false;
  try {
    const health = await apiFetch('/api/health');
    const healthModel = escapeHtml((health.model || '').split(' ')[0]);
    const healthAuc = Number.parseFloat(health.roc_auc).toFixed(4);
    el('status-badge').innerHTML =
      `<div class="status-dot"></div> API Online · ${healthModel} · AUC ${escapeHtml(healthAuc)}`;
    healthOk = true;
  } catch (e) {
    el('status-badge').innerHTML = `<span class="status-offline">⚠ API Offline</span>`;
    el('api-banner').classList.add('show');
    console.warn('API unreachable:', e);
    return; // Nothing else to load if the API is down.
  }

  // FIX: Fetch EDA and model data independently so a failure in one does not
  // prevent the other from loading. Previously Promise.all() meant a SHAP
  // out-of-memory error on the model endpoint (common on Render free tier)
  // would also wipe out the EDA tab.
  if (healthOk) {
    try {
      const version = await apiFetch('/api/version');
      populateProjectMeta(version);
    } catch (e) {
      console.warn('Failed to load version metadata:', e);
      setProjectMetaUnavailable('Model artifact metadata is temporarily unavailable.');
    }

    let edaOk = false;

    try {
      EDA_DATA = await apiFetch('/api/eda');
      edaOk = true;
    } catch (e) {
      console.warn('Failed to load EDA data:', e);
      setText('eda-total-tx', 'unavailable');
    }

    try {
      MODEL_DATA = await apiFetch('/api/model');
      THRESH_DATA = MODEL_DATA.threshold_analysis.data;
      clearModelUnavailableState();
    } catch (e) {
      console.warn('Failed to load model data:', e);
      setModelUnavailableState('Model evaluation data could not be loaded from the API.');
    }

    if (EDA_DATA && MODEL_DATA) {
      populateKPIs(EDA_DATA, MODEL_DATA);
      populateInsights(EDA_DATA, MODEL_DATA);
      syncImpactDefaults(EDA_DATA);
    } else if (EDA_DATA) {
      // Partial population — fill what we can from EDA alone.
      const o = EDA_DATA.overview;
      animCount(el('kpi-total'), o.total_transactions, '', 0);
      animCount(el('kpi-fraud'), o.total_fraud, '', 0);
      setText('kpi-rate', pct(o.fraud_rate));
      setText('kpi-vol', (o.total_amount / 1_000_000).toFixed(1) + 'M');
      setText('eda-total-tx', formatNumber(o.total_transactions));
      populateInsights(EDA_DATA, null);
      syncImpactDefaults(EDA_DATA);
    }

    const edaPanel = el('tab-eda');
    const edaVisible = edaPanel && !edaPanel.hidden;
    if (EDA_DATA && edaVisible) {
      renderEDACharts(EDA_DATA);
      _edaRendered = true;
    }
  }
}

function populateProjectMeta(version) {
  const metaEl = el('hero-meta');
  if (!metaEl || !version) return;

  const trained = formatDateLabel(version.trained_at);
  const rows = Number.isFinite(version.n_training_rows)
    ? `${formatNumber(version.n_training_rows)} rows`
    : 'dataset size unavailable';
  const features = Number.isFinite(version.n_features)
    ? `${formatNumber(version.n_features)} engineered features`
    : 'feature count unavailable';
  const metric = version.model_selection_metric
    ? formatMetricLabel(version.model_selection_metric)
    : 'selection metric unavailable';

  metaEl.textContent = `Trained ${trained} · ${rows} · ${features} · selected on ${metric}.`;
}

function setProjectMetaUnavailable(message) {
  const metaEl = el('hero-meta');
  if (!metaEl) return;
  metaEl.textContent = message;
}

function degradedStateMarkup(title, message) {
  return `
    <div class="data-state" role="status">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(message)}</span>
    </div>`;
}

function setModelUnavailableState(message) {
  MODEL_DATA = null;
  THRESH_DATA = null;

  setText('kpi-model', 'Unavailable');
  setText('kpi-auc', 'Model endpoint unavailable');
  setText('kpi-cv', '—');
  setText('tm-prec', '—');
  setText('tm-rec', '—');
  setText('tm-f1', '—');
  setText('tm-fp', '—');
  setText('tm-fn', '—');
  setText('slider-val-display', '—');

  const thresholdSlider = el('threshold-slider');
  if (thresholdSlider) thresholdSlider.disabled = true;

  const cmToggle = el('cm-toggle-btn');
  if (cmToggle) cmToggle.disabled = true;

  const cmLabel = el('cm-thresh-label');
  if (cmLabel) cmLabel.textContent = '@ unavailable';

  const sharedMessage = message || 'Model data is temporarily unavailable.';
  const sections = [
    ['model-table-wrap', 'Model comparison unavailable'],
    ['cm-wrap', 'Confusion matrix unavailable'],
    ['model-card-content', 'Model card unavailable'],
    ['clf-report-wrap', 'Classification report unavailable'],
  ];

  sections.forEach(([id, title]) => {
    const container = el(id);
    if (container) container.innerHTML = degradedStateMarkup(title, sharedMessage);
  });
}

function clearModelUnavailableState() {
  const thresholdSlider = el('threshold-slider');
  if (thresholdSlider) {
    thresholdSlider.disabled = false;
    setText('slider-val-display', Number.parseFloat(thresholdSlider.value).toFixed(2));
  }

  const cmToggle = el('cm-toggle-btn');
  if (cmToggle) {
    cmToggle.disabled = false;
    cmToggle.textContent = 'Show Optimal Threshold';
  }

  const cmLabel = el('cm-thresh-label');
  if (cmLabel) cmLabel.textContent = '@ 0.5';

  _cmShowOpt = false;
}

function syncImpactDefaults(eda) {
  const avgFraudAmount = Number(eda?.overview?.avg_fraud_amount);
  const costFnInput = el('cost-fn');
  if (costFnInput && Number.isFinite(avgFraudAmount) && costFnInput.dataset.touched !== 'true') {
    costFnInput.value = avgFraudAmount.toFixed(1);
  }
}

// ── KPIs ──────────────────────────────────────────────────────────────────────
function populateKPIs(eda, model) {
  const o = eda.overview;
  animCount(el('kpi-total'), o.total_transactions, '', 0);
  animCount(el('kpi-fraud'), o.total_fraud, '', 0);
  setText('kpi-rate', pct(o.fraud_rate));
  setText('kpi-vol', (o.total_amount / 1_000_000).toFixed(1) + 'M');
  setText('eda-total-tx', formatNumber(o.total_transactions));

  const best = model.comparison.find(m => m.is_best);
  setText('kpi-model', best.name);
  setText('kpi-auc',   'ROC-AUC ' + Number(best.roc_auc).toFixed(4));
  setText('kpi-cv',    `${Number(best.cv_mean).toFixed(4)} ± ${Number(best.cv_std).toFixed(4)}`);
}

function populateInsights(eda, model) {
  if (!eda) return;

  const topCombo = [...(eda.fraud_by_combo || [])].sort((a, b) => b.fraud_rate - a.fraud_rate)[0];
  if (topCombo) {
    setText('insight-combo-title', 'Top Paired Signal');
    setText(
      'insight-combo-body',
      `${topCombo.Combo} has the highest observed fraud rate at ${pct(topCombo.fraud_rate)} in this synthetic dataset.`
    );
  }

  const hours = [...(eda.fraud_by_hour || [])].filter(row => Number.isFinite(row.Hour));
  if (hours.length) {
    const peakHour = [...hours].sort((a, b) => b.fraud_rate - a.fraud_rate)[0];
    const night = hours.filter(row => row.Hour >= 22 || row.Hour <= 5);
    const daytime = hours.filter(row => row.Hour >= 6 && row.Hour <= 21);
    const avg = arr => arr.length ? arr.reduce((sum, row) => sum + row.fraud_rate, 0) / arr.length : 0;
    const nightAvg = avg(night);
    const dayAvg = avg(daytime);
    const premium = dayAvg > 0 ? ((nightAvg / dayAvg) - 1) * 100 : 0;
    setText('insight-hour-title', 'Peak Risk Window');
    setText(
      'insight-hour-body',
      `Fraud peaks at ${formatHourLabel(peakHour.Hour)} with a ${pct(peakHour.fraud_rate)} rate; overnight hours run about ${premium.toFixed(0)}% higher than daytime on average.`
    );
  }

  const normalMedian = Number(eda?.distance_dist?.normal_median);
  const fraudMedian = Number(eda?.distance_dist?.fraud_median);
  if (Number.isFinite(normalMedian) && Number.isFinite(fraudMedian)) {
    const ratio = normalMedian > 0 ? fraudMedian / normalMedian : null;
    setText('insight-distance-title', 'Distance Gap');
    setText(
      'insight-distance-body',
      ratio
        ? `Fraud median distance is ${ratio.toFixed(1)}× normal behavior (${formatNumber(fraudMedian)} km vs ${formatNumber(normalMedian)} km), making travel mismatch a strong risk signal.`
        : `Fraud median distance is ${formatNumber(fraudMedian)} km versus ${formatNumber(normalMedian)} km for normal transactions, highlighting strong location drift.`
    );
  }

  const topFeature = model?.shap_global?.[0]?.feature || model?.feature_importance?.[0]?.feature;
  if (topFeature) {
    const source = model?.shap_global?.length ? 'global SHAP' : 'feature importance';
    setText('insight-model-title', 'Top Global Driver');
    setText(
      'insight-model-body',
      `${formatMetricLabel(topFeature)} is currently the strongest signal in the deployed artifact by ${source}, so this card now reflects the live model instead of a hard-coded claim.`
    );
  } else {
    setText('insight-model-title', 'Model Insight Pending');
    setText('insight-model-body', 'Explainability data was not available from the API, so model-specific commentary is intentionally withheld.');
  }
}

// ── CHART HELPER ──────────────────────────────────────────────────────────────
function hBarConfig(labels, data, c1, c2) {
  const colors = labels.map((_, i) => lerpColor(c1, c2, labels.length > 1 ? i / (labels.length - 1) : 1));
  return {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: GRID }, ticks: { callback: v => (v * 100).toFixed(1) + '%' }, border: { color: GRID } },
        y: { grid: { display: false }, border: { display: false }, ticks: { color: TEXT } },
      },
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// EDA CHARTS
// ══════════════════════════════════════════════════════════════════════════════
function renderEDACharts(d) {
  const sort = arr => [...arr].sort((a, b) => a.fraud_rate - b.fraud_rate);

  const typ = sort(d.fraud_by_type);
  makeChart('chart-type', hBarConfig(typ.map(r => r.Transaction_Type), typ.map(r => r.fraud_rate), BLUE, MINT));

  const mer = sort(d.fraud_by_merchant);
  makeChart('chart-merchant', hBarConfig(mer.map(r => r.Merchant_Category), mer.map(r => r.fraud_rate), PUR, '#EC4899'));

  const cty = sort(d.fraud_by_location).slice(-15);
  makeChart('chart-city', hBarConfig(cty.map(r => r.Transaction_Location), cty.map(r => r.fraud_rate), BLUE, MINT));

  // Hourly line
  const hr = [...d.fraud_by_hour].filter(r => r.Hour != null).sort((a, b) => a.Hour - b.Hour);
  makeChart('chart-hour', {
    type: 'line',
    data: {
      labels: hr.map(r => r.Hour),
      datasets: [{
        data: hr.map(r => r.fraud_rate),
        borderColor: MINT, borderWidth: 1.5,
        pointBackgroundColor: MINT, pointRadius: 2,
        fill: true,
        backgroundColor: ctx => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
          g.addColorStop(0, MINT + '30'); g.addColorStop(1, MINT + '00'); return g;
        },
        tension: 0.4,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: GRID }, border: { color: GRID }, ticks: { color: MUTED } },
        y: { grid: { color: GRID }, ticks: { callback: v => (v * 100).toFixed(1) + '%' }, border: { color: GRID } },
      },
    },
  });

  // Amount distribution
  makeChart('chart-amount', {
    type: 'line',
    data: {
      labels: d.amount_dist.normal.x.map(v => v.toFixed(0)),
      datasets: [
        { label: 'Normal', data: d.amount_dist.normal.y, borderColor: MINT, borderWidth: 1.5, fill: true, backgroundColor: MINT + '18', tension: 0.4, pointRadius: 0 },
        { label: 'Fraud',  data: d.amount_dist.fraud.y,  borderColor: RED,  borderWidth: 1.5, fill: true, backgroundColor: RED + '18',  tension: 0.4, pointRadius: 0 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, position: 'top' } },
      scales: {
        x: { grid: { color: GRID }, border: { color: GRID }, ticks: { color: MUTED, maxTicksLimit: 6 } },
        y: { grid: { color: GRID }, border: { color: GRID }, ticks: { color: MUTED } },
      },
    },
  });

  // Prior fraud bar
  const pf = d.fraud_by_prev_fraud;
  makeChart('chart-prevfraud', {
    type: 'bar',
    data: {
      labels: pf.map(r => String(r.Previous_Fraud_Count)),
      datasets: [{
        data: pf.map(r => r.fraud_rate),
        backgroundColor: pf.map((_, i) => lerpColor(AMBER, RED, pf.length > 1 ? i / (pf.length - 1) : 1)),
        borderWidth: 0, borderRadius: 2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { color: MUTED } },
        y: { grid: { color: GRID }, ticks: { callback: v => (v * 100).toFixed(1) + '%' }, border: { color: GRID } },
      },
    },
  });

  // Combo
  const cb = sort(d.fraud_by_combo);
  makeChart('chart-combo', hBarConfig(cb.map(r => r.Combo), cb.map(r => r.fraud_rate), BLUE, RED));
}

// ══════════════════════════════════════════════════════════════════════════════
// MODEL CHARTS
// ══════════════════════════════════════════════════════════════════════════════

function renderModelCharts(d, { force = false } = {}) {
  // Guard: if chart-roc already exists, charts were already rendered this session.
  // makeChart() calls destroy() before recreating, so re-renders are safe — but
  // we avoid them on tab re-entry for performance. If you need a force-refresh
  // (e.g. after a data reload), delete charts['chart-roc'] before calling this.
  if (charts['chart-roc'] && !force) return;

  clearModelUnavailableState();

  const palette = [MINT, PUR, '#EC4899', BLUE, AMBER];

  // Comparison table
  const thead = `<tr>
    <th>Model</th><th>ROC-AUC</th><th>PR-AUC</th><th>CV PR-AUC (5-fold)</th>
    <th>Brier ↓</th><th>Precision</th><th>Recall</th><th>F1</th>
  </tr>`;
  const tbody = d.comparison.map(m => {
    const modelName = escapeHtml(m.name);
    return `
    <tr class="${m.is_best ? 'best-row' : ''}">
      <td>${modelName} ${m.is_best ? '<span class="badge-best">BEST</span>' : ''}</td>
      <td class="num">${escapeHtml(m.roc_auc)}</td>
      <td class="num">${escapeHtml(m.pr_auc)}</td>
      <td class="num">${escapeHtml(m.cv_mean)} <span class="text-faint">±${escapeHtml(m.cv_std)}</span></td>
      <td>${escapeHtml(m.brier)}</td>
      <td>${escapeHtml(m.precision)}</td>
      <td>${escapeHtml(m.recall)}</td>
      <td class="num">${escapeHtml(m.f1)}</td>
    </tr>`;
  }).join('');
  el('model-table-wrap').innerHTML =
    `<div class="table-scroll"><table class="data-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>`;

  // ROC
  makeChart('chart-roc', {
    type: 'line',
    data: {
      datasets: [
        ...d.comparison.map((m, i) => ({
          label: `${m.name.split(' ')[0]} ${m.roc_auc}`,
          data: d.curves[m.name].roc.fpr.map((x, j) => ({ x, y: d.curves[m.name].roc.tpr[j] })),
          borderColor: palette[i % palette.length], borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0,
        })),
        { label: 'Random', data: [{ x: 0, y: 0 }, { x: 1, y: 1 }], borderColor: GRID, borderWidth: 1, borderDash: [5, 4], pointRadius: 0, fill: false },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, position: 'top' } },
      scales: {
        x: { type: 'linear', title: { display: true, text: 'FPR', color: MUTED }, grid: { color: GRID }, border: { color: GRID } },
        y: { title: { display: true, text: 'TPR', color: MUTED }, grid: { color: GRID }, border: { color: GRID } },
      },
    },
  });

  // PR
  makeChart('chart-pr', {
    type: 'line',
    data: {
      datasets: [
        ...d.comparison.map((m, i) => ({
          label: `${m.name.split(' ')[0]} ${m.pr_auc}`,
          data: d.curves[m.name].pr.recall.map((x, j) => ({ x, y: d.curves[m.name].pr.precision[j] })),
          borderColor: palette[i % palette.length], borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0,
        })),
        { label: `Baseline ${pct(d.fraud_rate)}`, data: [{ x: 0, y: d.fraud_rate }, { x: 1, y: d.fraud_rate }], borderColor: GRID, borderWidth: 1, borderDash: [5, 4], pointRadius: 0, fill: false },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, position: 'top' } },
      scales: {
        x: { type: 'linear', title: { display: true, text: 'Recall', color: MUTED }, grid: { color: GRID }, border: { color: GRID } },
        y: { title: { display: true, text: 'Precision', color: MUTED }, grid: { color: GRID }, border: { color: GRID } },
      },
    },
  });

  // Confusion matrix (default: 0.5 threshold)
  renderCM(d.confusion_matrix);

  // Feature importance
  const fi = [...d.feature_importance].reverse();
  makeChart('chart-fi', hBarConfig(fi.map(f => f.feature), fi.map(f => f.importance), PUR, MINT));

  // SHAP
  if (d.shap_global && d.shap_global.length) {
    const sh = [...d.shap_global].reverse();
    makeChart('chart-shap', hBarConfig(sh.map(f => f.feature), sh.map(f => f.value), '#14B8A6', PUR));
  }

  // Calibration
  if (d.calibration && d.calibration.prob_pred) {
    const cal = d.calibration;
    makeChart('chart-cal', {
      type: 'line',
      data: {
        datasets: [
          { label: 'Model',   data: cal.prob_pred.map((x, i) => ({ x, y: cal.prob_true[i] })), borderColor: MINT, borderWidth: 1.5, pointBackgroundColor: MINT, pointRadius: 4, fill: false },
          { label: 'Perfect', data: [{ x: 0, y: 0 }, { x: 1, y: 1 }],                        borderColor: GRID, borderWidth: 1, borderDash: [5, 5], pointRadius: 0, fill: false },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true, position: 'top' } },
        scales: {
          x: { type: 'linear', min: 0, max: 1, title: { display: true, text: 'Mean Predicted Prob', color: MUTED }, grid: { color: GRID }, border: { color: GRID } },
          y: { min: 0, max: 1, title: { display: true, text: 'Fraction Positives', color: MUTED }, grid: { color: GRID }, border: { color: GRID } },
        },
      },
    });
  }

  renderThresholdChart();

  // Model card
  const best = d.comparison.find(m => m.is_best);
  const datasetRows = EDA_DATA?.overview?.total_transactions;
  const datasetText = Number.isFinite(datasetRows)
    ? `${formatNumber(datasetRows)} banking transactions`
    : 'the training dataset';
  el('model-card-content').innerHTML = `
    <div class="model-card-title">${escapeHtml(best.name)}</div>
    <strong>DATASET</strong> — ${escapeHtml(datasetText)} · ${escapeHtml(pct(d.fraud_rate))} fraud rate<br>
    <strong>IMBALANCE</strong> — Handled via class weighting / scale_pos_weight<br>
    <strong>EVALUATION</strong> — Stratified 80/20 split + 5-fold stratified CV (scored on PR-AUC)<br>
    <strong>PRIMARY METRIC</strong> — PR-AUC (appropriate for imbalanced classification; used for model selection)<br>
    <strong>OPT. THRESHOLD</strong> — ${escapeHtml(d.threshold_analysis.optimal_f1_threshold)} (F1) · ${escapeHtml(d.threshold_analysis.optimal_cost_threshold)} (cost-optimal)<br>
    <strong class="text-warning">LIMITATIONS</strong> — Trained on synthetic data; calibration may drift on real distributions<br>
    <strong class="text-warning">BIAS CHECK</strong> — No demographic features used — no protected-class risk`;

  el('clf-report-wrap').innerHTML = `
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Class</th><th>Precision</th><th>Recall</th><th>F1</th></tr></thead>
      <tbody>
        <tr>
          <td>Normal (0)</td>
          <td class="num">${escapeHtml(best.precision_normal)}</td>
          <td class="num">${escapeHtml(best.recall_normal)}</td>
          <td class="num">${escapeHtml(best.f1_normal)}</td>
        </tr>
        <tr class="best-row">
          <td>Fraud (1)</td>
          <td class="num">${escapeHtml(best.precision)}</td>
          <td class="num">${escapeHtml(best.recall)}</td>
          <td class="num">${escapeHtml(best.f1)}</td>
        </tr>
      </tbody>
    </table></div>`;
}

// ── THRESHOLD ─────────────────────────────────────────────────────────────────
function renderThresholdChart() {
  if (!THRESH_DATA) return;
  makeChart('chart-threshold', {
    type: 'line',
    data: {
      labels: THRESH_DATA.map(r => r.threshold),
      datasets: [
        { label: 'Precision', data: THRESH_DATA.map(r => r.precision), borderColor: MINT,  borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.3 },
        { label: 'Recall',    data: THRESH_DATA.map(r => r.recall),    borderColor: PUR,   borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.3 },
        { label: 'F1',        data: THRESH_DATA.map(r => r.f1),        borderColor: AMBER, borderWidth: 2,   pointRadius: 0, fill: false, tension: 0.3 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, position: 'top' } },
      scales: {
        x: { grid: { color: GRID }, border: { color: GRID }, ticks: { maxTicksLimit: 10 } },
        y: { min: 0, max: 1, grid: { color: GRID }, border: { color: GRID } },
      },
    },
  });
  updateThresholdMetrics(0.40);
}

function updateThresholdMetrics(t) {
  if (!THRESH_DATA) return;
  const row = THRESH_DATA.reduce((p, c) => Math.abs(c.threshold - t) < Math.abs(p.threshold - t) ? c : p);
  setText('tm-prec', row.precision.toFixed(3));
  setText('tm-rec',  row.recall.toFixed(3));
  setText('tm-f1',   row.f1.toFixed(3));
  setText('tm-fp',   row.fp.toLocaleString());
  setText('tm-fn',   row.fn.toLocaleString());
}

// ══════════════════════════════════════════════════════════════════════════════
// LIVE SCORER
// ══════════════════════════════════════════════════════════════════════════════
function updateDistance() {
  const distEl = el('f-distance');
  if (!distEl) return;

  const home     = el('f-home').value;
  const location = el('f-location').value;
  const d        = haversine(home, location);
  const intlValue = isInternationalRoute(home, location);

  const intlEl = el('f-intl');
  if (intlEl && intlValue !== null) {
    intlEl.value = intlValue ? 'Yes' : 'No';
  }

  const summaryEl = el('f-geo-summary');

  // FIX: If a city is present in the <select> but missing from CITY_COORDS,
  // haversine() returns null. Instead of silently keeping the stale distance
  // value in the field, we show a clear warning so the mismatch is visible to
  // both users and developers. Update CITY_COORDS to fix.
  if (d === null) {
    if (distEl) distEl.value = 0;
    if (summaryEl) {
      const missing = !CITY_COORDS[home] ? home : location;
      summaryEl.textContent =
        `⚠ Distance unavailable — "${missing}" is missing from CITY_COORDS. ` +
        `Update app.js to fix. International status: ${intlValue === null ? 'unavailable' : intlValue ? 'Yes' : 'No'}.`;
      summaryEl.style.color = 'var(--warning)';
    }
    return;
  }

  if (distEl) distEl.value = d;
  if (summaryEl) {
    summaryEl.style.color = '';
    const intlText = intlValue === null ? 'international status unavailable' : `international: ${intlValue ? 'Yes' : 'No'}`;
    summaryEl.textContent = `Auto-derived from location selections: ${formatNumber(d)} km apart · ${intlText}.`;
  }
}

function lockScoreButtonWidth() {
  const btn = el('score-btn');
  if (!btn) return;
  btn.style.width = 'auto';
  btn.style.minWidth = '';
  const px = Math.ceil(btn.getBoundingClientRect().width);
  if (px > 0) {
    btn.style.width = `${px}px`;
    btn.style.minWidth = `${px}px`;
  }
}

function setScoreFeedback(message = '', type = 'error') {
  const feedback = el('score-feedback');
  if (!feedback) return;

  if (!message) {
    feedback.textContent = '';
    feedback.className = 'score-feedback';
    return;
  }

  feedback.textContent = message;
  feedback.className = `score-feedback show ${type}`;
}

function validateScorerInputs() {
  const fields = [...document.querySelectorAll('#tab-scorer input, #tab-scorer select')]
    .filter(field => !field.disabled && !field.readOnly);
  const invalid = fields.find(field => typeof field.checkValidity === 'function' && !field.checkValidity());
  if (!invalid) return true;

  invalid.reportValidity?.();
  invalid.focus?.();
  setScoreFeedback('Check the highlighted field and try again.', 'error');
  return false;
}

function extractApiError(payload) {
  if (!payload) return '';
  if (typeof payload.detail === 'string') return payload.detail;
  if (Array.isArray(payload.detail)) {
    return payload.detail
      .map(item => item?.msg || item?.message)
      .filter(Boolean)
      .join(' ');
  }
  return payload.message || '';
}

async function scoreTransaction() {
  setScoreFeedback('');
  if (!validateScorerInputs()) return;

  const btn = el('score-btn');
  lockScoreButtonWidth();
  btn.disabled   = true;
  btn.textContent = '⏳ Scoring…';
  setScoreFeedback('Submitting transaction to the live API…', 'info');

  const payload = {
    amount:       +el('f-amount').value,
    balance:      +el('f-balance').value,
    distance:     +el('f-distance').value,
    tx_time:      el('f-time').value,
    tx_type:      el('f-type').value,
    merchant_cat: el('f-merchant').value,
    card_type:    el('f-card').value,
    tx_location:  el('f-location').value,
    home_loc:     el('f-home').value,
    daily_tx:     +el('f-daily').value,
    weekly_tx:    +el('f-weekly').value,
    avg_amount:   +el('f-avg').value,
    max_24h:      +el('f-max24').value,
    failed:       +el('f-failed').value,
    prev_fraud:   +el('f-prevfraud').value,
    is_intl:      el('f-intl').value,
    is_new:       el('f-new').value,
    unusual:      el('f-unusual').value,
  };

  try {
    const res = await fetch(API_URL + '/api/predict', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(extractApiError(data) || `Request failed (${res.status})`);
    }
    renderResult(data);
    // FIX: Store riskScore (0–100 composite index) as a number so history
    // entries can be sorted or compared numerically later. Previously named
    // `prob` which was misleading — this is not a raw ML probability.
    scoreHistory.unshift({ ...payload, riskScore: data.risk_score, tier: data.tier });
    renderHistory();
    setScoreFeedback('');
  } catch (e) {
    const offline = e instanceof TypeError || /Failed to fetch|NetworkError/i.test(e.message);
    setScoreFeedback(
      offline
        ? 'Could not reach the live API. Check the backend health or try again in a few seconds.'
        : e.message,
      'error'
    );
  } finally {
    btn.disabled   = false;
    btn.textContent = '⚡ Analyse Transaction';
  }
}

function renderResult(data) {
  const tier  = data.tier.toLowerCase();
  const panel = el('result-panel');
  panel.className = 'result-panel ' + tier;

  el('result-empty').hidden   = true;
  el('result-content').hidden = false;

  el('result-prob').className   = 'prob-number ' + tier;
  el('result-prob').textContent = data.risk_score_pct;

  el('result-tier').className   = 'tier-badge ' + tier;
  el('result-tier').textContent = data.tier + ' RISK';

  const gaugeColors = { high: RED, medium: AMBER, low: MINT };
  el('gauge-fill').style.width      = data.risk_score + '%';
  el('gauge-fill').style.background = gaugeColors[tier];

  setText('result-meta-line',
    `Composite score ${data.risk_score_pct}  ·  ML fraud probability ${data.ml_probability_pct}  ·  F1 threshold ${data.optimal_threshold}`);

  // Decision trace — compact audit display
  const trace = data.decision_trace;
  const traceEl = el('result-decision-trace');
  if (traceEl && trace) {
    const ruleHtml = trace.rule_engine.fired
      ? `<span class="text-warning">${escapeHtml(trace.rule_engine.rule_id)}</span>`
      : `<span class="text-faint">No rule fired</span>`;
    traceEl.innerHTML = `
      <div class="trace-row"><span class="trace-k">ML probability</span><span class="trace-v">${escapeHtml(data.ml_probability_pct)} → ${escapeHtml(trace.ml_tier)}</span></div>
      <div class="trace-row"><span class="trace-k">Rule engine</span><span class="trace-v">${ruleHtml}</span></div>
      <div class="trace-row"><span class="trace-k">Composite</span><span class="trace-v">ML ${escapeHtml(trace.composite.ml_component)} + rules ${escapeHtml(trace.composite.rule_component)} = <strong>${escapeHtml(trace.composite.total)}</strong>/100</span></div>
      <div class="trace-row"><span class="trace-k">Final tier</span><span class="trace-v" style="color:${gaugeColors[tier]};font-weight:600">${escapeHtml(trace.final_tier)}</span></div>`;
    traceEl.hidden = false;
  }

  const shapSec = el('shap-section');
  const shapWf  = el('shap-waterfall');
  if (data.shap_waterfall && data.shap_waterfall.length) {
    shapSec.hidden = false;
    const maxAbs = Math.max(...data.shap_waterfall.map(r => Math.abs(r.value)));
    shapWf.innerHTML = data.shap_waterfall.map(r => {
      const pctW = maxAbs > 0 ? Math.abs(r.value) / maxAbs * 100 : 0;
      const pos  = r.value > 0;
      const col  = pos ? RED : MINT;
      const feature = escapeHtml(r.feature);
      const shapVal = `${r.value > 0 ? '+' : ''}${escapeHtml(r.value.toFixed(4))}`;
      return `<div class="shap-row">
        <div class="shap-feat" title="${feature}">${feature}</div>
        <div class="shap-bar-track">
          <div class="shap-bar-fill" style="left:${pos ? 50 : 50 - pctW}%;width:${pctW}%;background:${col}"></div>
          <div class="shap-midline"></div>
        </div>
        <div class="shap-val" style="color:${col}">${shapVal}</div>
      </div>`;
    }).join('');
  } else {
    shapSec.hidden = true;
  }

  // Flags
  const flagsEl = el('result-flags');
  flagsEl.innerHTML = data.flags.length
    ? data.flags.map(f => `<div class="flag-item"><span class="icon">${escapeHtml(f.icon)}</span><span>${escapeHtml(f.text)}</span></div>`).join('')
    : '<div class="flag-item"><span class="icon">✅</span><span>No strong individual risk signals detected</span></div>';

  el('result-meta').innerHTML =
    `<span>Model: ${escapeHtml(data.model)}</span><span>ROC-AUC ${escapeHtml(data.roc_auc)}</span>`;
}

function renderHistory() {
  if (!scoreHistory.length) return;
  el('history-section').hidden = false;
  const tierColors = { HIGH: RED, MEDIUM: AMBER, LOW: MINT };
  // riskScore is stored as a number (0–100 composite index, not a probability).
  el('history-body').innerHTML = scoreHistory.map((r, i) => {
    const tierColor = tierColors[r.tier] || TEXT;
    const tierLabel = escapeHtml(r.tier);
    return `
    <tr>
      <td class="text-faint">${scoreHistory.length - i}</td>
      <td>${escapeHtml(r.tx_type)}</td>
      <td class="num">$${r.amount.toLocaleString()}</td>
      <td>${escapeHtml(r.tx_location)}</td>
      <td class="num">${r.riskScore.toFixed(1)}%</td>
      <td><span style="color:${tierColor};font-weight:600">${tierLabel}</span></td>
    </tr>`;
  }).join('');
}

function clearHistory() {
  scoreHistory = [];
  el('history-section').hidden = true;
}

// ══════════════════════════════════════════════════════════════════════════════
// BUSINESS IMPACT
// ══════════════════════════════════════════════════════════════════════════════
function recalcImpact() {
  if (!THRESH_DATA || !MODEL_DATA) return;
  const costFn  = readNumberInput('cost-fn', 5.0);
  const costFp  = readNumberInput('cost-fp', 15.0);
  const monthly = readNumberInput('monthly-vol', 50000);

  const testSize = MODEL_DATA.test_set_size || 10000;
  const scale    = monthly / testSize;

  const rows = THRESH_DATA.map(r => ({
    t:      r.threshold,
    total:  (r.fn * costFn + r.fp * costFp) * scale,
    fn_c:   r.fn * costFn * scale,
    fp_c:   r.fp * costFp * scale,
    caught: r.tp * costFn * scale,
    net:    (r.tp * costFn - r.fp * costFp) * scale,
    tp:     r.tp,
    fp:     r.fp,
    fn:     r.fn,
  }));

  const totalFraudInTest = THRESH_DATA.length ? (THRESH_DATA[0].tp + THRESH_DATA[0].fn) : 0;
  const optRow       = rows.reduce((a, b) => a.total < b.total ? a : b);
  const baselineCost = totalFraudInTest * costFn * scale;
  const savingsRows  = rows.map(r => ({ t: r.t, s: baselineCost - r.total }));
  const bestSave     = savingsRows.reduce((a, b) => a.s > b.s ? a : b);

  setText('biz-caught',         formatCurrency(optRow.caught, 1));
  setText('biz-missed',         formatCurrency(optRow.fn_c, 1));
  setText('biz-fp-cost',        formatCurrency(optRow.fp_c, 1));
  setText('biz-net',            formatCurrency(optRow.net, 1));
  setText('biz-annual-save',    formatCurrency(bestSave.s * 12, 1));
  setText('biz-annual-cost',    formatCurrency(optRow.total * 12, 1));
  setText('biz-monthly-caught', Math.round(optRow.tp / testSize * monthly).toLocaleString());
  setText('biz-opt-threshold',  Number(optRow.t).toFixed(2));
  const monthlyAlerts = Math.round((optRow.tp + optRow.fp) / testSize * monthly);
  setText('biz-alerts',         monthlyAlerts.toLocaleString());
  const precisionRate = (optRow.tp + optRow.fp) > 0 ? (optRow.tp / (optRow.tp + optRow.fp)) * 100 : 0;
  const captureRate = (optRow.tp + optRow.fn) > 0 ? (optRow.tp / (optRow.tp + optRow.fn)) * 100 : 0;
  const missRate = (optRow.tp + optRow.fn) > 0 ? (optRow.fn / (optRow.tp + optRow.fn)) * 100 : 0;
  const costReduction = baselineCost > 0 ? ((baselineCost - optRow.total) / baselineCost) * 100 : 0;
  setText('biz-precision',      precisionRate.toFixed(1) + '%');
  setText('biz-capture-rate',   captureRate.toFixed(1) + '%');
  setText('biz-miss-rate',      missRate.toFixed(1) + '%');
  setText('biz-cost-reduction', costReduction.toFixed(1) + '%');

  makeChart('chart-cost', {
    type: 'line',
    data: {
      labels: rows.map(r => r.t),
      datasets: [
        { label: 'Total Cost', data: rows.map(r => r.total), borderColor: RED,   borderWidth: 1.5, fill: true, backgroundColor: RED + '12', tension: 0.3, pointRadius: 0 },
        { label: 'FN Cost',    data: rows.map(r => r.fn_c),  borderColor: AMBER, borderWidth: 1.5, fill: false, tension: 0.3, pointRadius: 0 },
        { label: 'FP Cost',    data: rows.map(r => r.fp_c),  borderColor: PUR,   borderWidth: 1,   fill: false, tension: 0.3, pointRadius: 0, borderDash: [4, 3] },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, position: 'top' } },
      scales: {
        x: { grid: { color: GRID }, border: { color: GRID }, ticks: { maxTicksLimit: 10 } },
        y: { grid: { color: GRID }, border: { color: GRID } },
      },
    },
  });

  makeChart('chart-savings', {
    type: 'line',
    data: {
      labels: savingsRows.map(r => r.t),
      datasets: [{
        label: 'Savings vs no-model',
        data:  savingsRows.map(r => r.s),
        borderColor: MINT, borderWidth: 1.5,
        fill: true,
        backgroundColor: ctx => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
          g.addColorStop(0, MINT + '30'); g.addColorStop(1, MINT + '00'); return g;
        },
        tension: 0.3, pointRadius: 0,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: GRID }, border: { color: GRID }, ticks: { maxTicksLimit: 10 } },
        y: { grid: { color: GRID }, border: { color: GRID } },
      },
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// INIT — single entry point
// ══════════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  _chartViewportMode = getChartViewportMode();

  const urlEl = el('api-url-display');
  if (urlEl) urlEl.textContent = API_URL;

  const homeEl = el('f-home');
  const locEl  = el('f-location');
  if (homeEl) homeEl.addEventListener('change', updateDistance);
  if (locEl)  locEl.addEventListener('change',  updateDistance);
  updateDistance();

  ['cost-fn', 'cost-fp'].forEach(id => {
    const input = el(id);
    if (input) {
      input.addEventListener('input', () => {
        input.dataset.touched = 'true';
      });
    }
  });

  document.querySelectorAll('.tab-btn').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => activateTab(tabBtn.dataset.tab, { focus: false }));
    tabBtn.addEventListener('keydown', handleTabKeydown);
  });

  const slider = el('threshold-slider');
  if (slider) {
    slider.addEventListener('input', function () {
      const v = parseFloat(this.value);
      setText('slider-val-display', v.toFixed(2));
      updateThresholdMetrics(v);
    });
  }

  // Keep analyse button width stable across text/disabled state changes.
  requestAnimationFrame(lockScoreButtonWidth);

  const handleViewportRefresh = () => {
    if (_viewportRefreshFrame) return;
    _viewportRefreshFrame = requestAnimationFrame(() => {
      _viewportRefreshFrame = 0;

      const scoreBtn = el('score-btn');
      if (scoreBtn && !scoreBtn.disabled) lockScoreButtonWidth();

      const nextMode = getChartViewportMode();
      if (nextMode === _chartViewportMode) return;

      _chartViewportMode = nextMode;
      syncChartTheme();
      resetAllCharts();
      rerenderThemeSensitiveViews();
    });
  };

  window.addEventListener('resize', handleViewportRefresh);
  window.visualViewport?.addEventListener('resize', handleViewportRefresh);

  boot();
});
