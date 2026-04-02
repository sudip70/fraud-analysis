// ── CONFIG — update this to your deployed Render URL ─────────────────────────
const API_URL = 'http://localhost:8000';
// Production: const API_URL = 'https://fraudshield-api.onrender.com';
// ─────────────────────────────────────────────────────────────────────────────

document.getElementById('api-url-display').textContent = API_URL;

// ── CITY COORDINATES (for distance calculation) ────────────────────────────────
const CITY_COORDS = {
  "New York": [40.7128, -74.0060],
  "Toronto": [43.6532, -79.3832],
  "Los Angeles": [34.0522, -118.2437],
  "Chicago": [41.8781, -87.6298],
  "Vancouver": [49.2827, -123.1207],
  "Montreal": [45.5017, -73.5673],
  "Dallas": [32.7767, -96.7970],
  "San Francisco": [37.7749, -122.4194],
  "Calgary": [51.0447, -114.0719],
  "Detroit": [42.3314, -83.0458],
  "Miami": [25.7617, -80.1918],
  "Atlanta": [33.7490, -84.3880],
  "Seattle": [47.6062, -122.3321],
  "Denver": [39.7392, -104.9903],
  "Boston": [42.3601, -71.0589],
  "Phoenix": [33.4484, -112.0742],
  "London": [51.5074, -0.1278],
  "Paris": [48.8566, 2.3522],
  "Berlin": [52.5200, 13.4050],
  "Madrid": [40.4168, -3.7038],
  "Rome": [41.9028, 12.4964],
  "Amsterdam": [52.3676, 4.9041],
  "Dublin": [53.3498, -6.2603],
  "Zurich": [47.3769, 8.5472],
  "Vienna": [48.2082, 16.3738],
  "Brussels": [50.8503, 4.3517],
  "Copenhagen": [55.6761, 12.5683],
  "Stockholm": [59.3293, 18.0686],
  "Oslo": [59.9139, 10.7522],
  "Helsinki": [60.1695, 24.9354],
  "Lisbon": [38.7223, -9.1393]
};

// ── HAVERSINE DISTANCE CALCULATION ─────────────────────────────────────────────
function calculateDistance(city1, city2) {
  if (!city1 || !city2 || !CITY_COORDS[city1] || !CITY_COORDS[city2]) return null;
  
  const [lat1, lon1] = CITY_COORDS[city1];
  const [lat2, lon2] = CITY_COORDS[city2];
  
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

// ── STATE ──────────────────────────────────────────────────────────────────────
let EDA_DATA    = null;
let MODEL_DATA  = null;
let THRESH_DATA = null;
let scoreHistory = [];
let charts = {};

// ── CHART DEFAULTS ─────────────────────────────────────────────────────────────
const BG    = '#05080E';
const BG2   = '#090D18';
const CARD  = '#0C1220';
const GRID  = '#18253D';
const TEXT  = '#C8D8EE';
const MUTED = '#445B7A';
const MINT  = '#06FFA5';
const RED   = '#FF3D5A';
const AMBER = '#FFAA00';
const BLUE  = '#2979FF';
const PUR   = '#9D4EDD';

Chart.defaults.color         = MUTED;
Chart.defaults.borderColor   = GRID;
Chart.defaults.font.family   = "'IBM Plex Mono', monospace";
Chart.defaults.font.size     = 11;
Chart.defaults.plugins.legend.labels.boxWidth = 10;
Chart.defaults.plugins.legend.labels.padding  = 14;
Chart.defaults.plugins.legend.labels.color    = TEXT;
Chart.defaults.plugins.tooltip.backgroundColor = '#101828';
Chart.defaults.plugins.tooltip.borderColor    = GRID;
Chart.defaults.plugins.tooltip.borderWidth    = 1;
Chart.defaults.plugins.tooltip.titleColor     = TEXT;
Chart.defaults.plugins.tooltip.bodyColor      = MUTED;
Chart.defaults.plugins.tooltip.padding        = 10;
Chart.defaults.animation.duration             = 700;

function makeChart(id, config) {
  if (charts[id]) charts[id].destroy();
  const ctx = document.getElementById(id);
  if (!ctx) return null;
  charts[id] = new Chart(ctx, config);
  return charts[id];
}

// ── GRADIENT HELPER ────────────────────────────────────────────────────────────
function linearGrad(ctx, c1, c2, vertical = true) {
  const g = vertical
    ? ctx.createLinearGradient(0, 0, 0, ctx.canvas.height)
    : ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  return g;
}

// ── TABS ───────────────────────────────────────────────────────────────────────
function switchTab(id, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  btn.classList.add('active');
  if (id === 'model'  && MODEL_DATA) renderModelCharts(MODEL_DATA);
  if (id === 'impact' && MODEL_DATA) recalcImpact();
}

// ── FORMAT ─────────────────────────────────────────────────────────────────────
const pct = v => (v * 100).toFixed(2) + '%';
const p3  = v => (v * 100).toFixed(1) + '%';
const fmt = v => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'K' : String(v);

// ── COUNTER ANIMATION ──────────────────────────────────────────────────────────
function animCount(el, target, suffix = '', dec = 0) {
  const dur = 900;
  const t0  = performance.now();
  function step(t) {
    const prog = Math.min((t - t0) / dur, 1);
    const ease = 1 - Math.pow(1 - prog, 3);
    el.textContent = (target * ease).toFixed(dec) + suffix;
    if (prog < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── API ────────────────────────────────────────────────────────────────────────
async function apiFetch(path) {
  console.log(`[API] Fetching: ${API_URL + path}`);
  try {
    const res = await fetch(API_URL + path, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors'
    });
    console.log(`[API] Response status: ${res.status} for ${path}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log(`[API] Success: ${path}`, data);
    return data;
  } catch (err) {
    console.error(`[API] Error on ${path}:`, err);
    throw err;
  }
}

// ── BOOT ───────────────────────────────────────────────────────────────────────
async function boot() {
  console.log('[BOOT] Starting initialization...');
  try {
    const health = await apiFetch('/api/health');
    console.log('[BOOT] Health check passed:', health);
    document.getElementById('status-badge').innerHTML =
      `<div class="status-dot"></div> API Online · ${health.model.split(' ')[0]} · AUC ${health.roc_auc}`;

    [EDA_DATA, MODEL_DATA] = await Promise.all([
      apiFetch('/api/eda'),
      apiFetch('/api/model'),
    ]);

    THRESH_DATA = MODEL_DATA.threshold_analysis.data;
    populateKPIs(EDA_DATA, MODEL_DATA);
    renderEDACharts(EDA_DATA);
    console.log('[BOOT] Complete ✓');
  } catch (e) {
    console.error('[BOOT] Failed:', e);
    document.getElementById('status-badge').innerHTML =
      `<span style="color:#FFAA00">⚠ API Offline</span>`;
    document.getElementById('api-banner').classList.add('show');
    console.warn('API unreachable:', e);
  }
}

// ── KPIs ───────────────────────────────────────────────────────────────────────
function populateKPIs(eda, model) {
  const o = eda.overview;
  animCount(document.getElementById('kpi-total'), o.total_transactions, '', 0);
  animCount(document.getElementById('kpi-fraud'), o.total_fraud, '', 0);
  document.getElementById('kpi-rate').textContent  = pct(o.fraud_rate);
  document.getElementById('kpi-vol').textContent   = o.total_amount.toFixed(0) + 'M';

  const best = model.comparison.find(m => m.is_best);
  document.getElementById('kpi-model').textContent = best.name.split(' ')[0];
  document.getElementById('kpi-auc').textContent   = 'ROC-AUC ' + best.roc_auc;
  document.getElementById('kpi-cv').textContent    = best.cv_mean + ' ± ' + best.cv_std;
}

// ══════════════════════════════════════════════════════════════════════════════
// EDA CHARTS
// ══════════════════════════════════════════════════════════════════════════════
function hBarConfig(labels, data, c1, c2) {
  const n      = labels.length;
  const colors = labels.map((_, i) => lerpColor(c1, c2, n > 1 ? i / (n - 1) : 1));
  return {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 0, borderRadius: 0 }],
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: GRID }, ticks: { callback: v => (v * 100).toFixed(1) + '%' }, border: { color: GRID } },
        y: { grid: { display: false }, border: { display: false }, ticks: { color: TEXT } },
      },
    },
  };
}

function renderEDACharts(d) {
  // Transaction type
  const typ = [...d.fraud_by_type].sort((a, b) => a.fraud_rate - b.fraud_rate);
  makeChart('chart-type', hBarConfig(typ.map(r => r.Transaction_Type), typ.map(r => r.fraud_rate), BLUE, MINT));

  // Merchant
  const mer = [...d.fraud_by_merchant].sort((a, b) => a.fraud_rate - b.fraud_rate);
  makeChart('chart-merchant', hBarConfig(mer.map(r => r.Merchant_Category), mer.map(r => r.fraud_rate), PUR, '#EC4899'));

  // City
  const cty = [...d.fraud_by_location].sort((a, b) => a.fraud_rate - b.fraud_rate);
  makeChart('chart-city', hBarConfig(cty.map(r => r.Transaction_Location), cty.map(r => r.fraud_rate), BLUE, MINT));

  // Hourly area chart
  const hr = [...d.fraud_by_hour].filter(r => r.Hour != null).sort((a, b) => a.Hour - b.Hour);
  makeChart('chart-hour', {
    type: 'line',
    data: {
      labels: hr.map(r => r.Hour),
      datasets: [{
        data: hr.map(r => r.fraud_rate),
        borderColor: MINT, borderWidth: 2,
        pointBackgroundColor: MINT, pointRadius: 3,
        fill: true,
        backgroundColor: ctx => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
          g.addColorStop(0, MINT + '44'); g.addColorStop(1, MINT + '00'); return g;
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
      labels: d.amount_dist.normal.x.map(v => v.toFixed(1)),
      datasets: [
        { label: 'Normal', data: d.amount_dist.normal.y, borderColor: '#10B981', borderWidth: 2, fill: true, backgroundColor: '#10B98122', tension: 0.4, pointRadius: 0 },
        { label: 'Fraud',  data: d.amount_dist.fraud.y,  borderColor: RED,       borderWidth: 2, fill: true, backgroundColor: RED + '22',    tension: 0.4, pointRadius: 0 },
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

  // Previous fraud bar chart
  const pf = d.fraud_by_prev_fraud;
  makeChart('chart-prevfraud', {
    type: 'bar',
    data: {
      labels: pf.map(r => String(r.Previous_Fraud_Count)),
      datasets: [{
        data: pf.map(r => r.fraud_rate),
        backgroundColor: pf.map((_, i) => lerpColor(AMBER, RED, pf.length > 1 ? i / (pf.length - 1) : 1)),
        borderWidth: 0,
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
  const cb = [...d.fraud_by_combo].sort((a, b) => a.fraud_rate - b.fraud_rate);
  makeChart('chart-combo', hBarConfig(cb.map(r => r.Combo), cb.map(r => r.fraud_rate), BLUE, RED));
}

// ══════════════════════════════════════════════════════════════════════════════
// MODEL CHARTS
// ══════════════════════════════════════════════════════════════════════════════
let modelChartsRendered = false;

function renderModelCharts(d) {
  if (modelChartsRendered) return;
  modelChartsRendered = true;

  const palette = [MINT, PUR, '#EC4899'];

  // Comparison table
  const thead = `<tr>
    <th>Model</th><th>ROC-AUC</th><th>PR-AUC</th><th>CV AUC (5-fold)</th>
    <th>Brier ↓</th><th>Precision</th><th>Recall</th><th>F1</th>
  </tr>`;
  const tbody = d.comparison.map(m => `
    <tr class="${m.is_best ? 'best-row' : ''}">
      <td>${m.name} ${m.is_best ? '<span class="badge-best">BEST</span>' : ''}</td>
      <td class="num">${m.roc_auc}</td>
      <td class="num">${m.pr_auc}</td>
      <td class="num">${m.cv_mean} <span style="color:var(--muted)">±${m.cv_std}</span></td>
      <td>${m.brier}</td>
      <td>${m.precision}</td>
      <td>${m.recall}</td>
      <td class="num">${m.f1}</td>
    </tr>`).join('');
  document.getElementById('model-table-wrap').innerHTML =
    `<table class="data-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;

  // ROC curve
  makeChart('chart-roc', {
    type: 'line',
    data: {
      datasets: [
        ...d.comparison.map((m, i) => ({
          label: `${m.name.split(' ')[0]} ${m.roc_auc}`,
          data: d.curves[m.name].roc.fpr.map((x, j) => ({ x, y: d.curves[m.name].roc.tpr[j] })),
          borderColor: palette[i], borderWidth: 2, pointRadius: 0, fill: false, tension: 0,
        })),
        { label: 'Random', data: [{ x: 0, y: 0 }, { x: 1, y: 1 }], borderColor: GRID, borderWidth: 1, borderDash: [6, 4], pointRadius: 0, fill: false },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, position: 'top' } },
      scales: {
        x: { type: 'linear', title: { display: true, text: 'FPR' }, grid: { color: GRID }, border: { color: GRID } },
        y: { title: { display: true, text: 'TPR' }, grid: { color: GRID }, border: { color: GRID } },
      },
    },
  });

  // PR curve
  makeChart('chart-pr', {
    type: 'line',
    data: {
      datasets: [
        ...d.comparison.map((m, i) => ({
          label: `${m.name.split(' ')[0]} ${m.pr_auc}`,
          data: d.curves[m.name].pr.recall.map((x, j) => ({ x, y: d.curves[m.name].pr.precision[j] })),
          borderColor: palette[i], borderWidth: 2, pointRadius: 0, fill: false, tension: 0,
        })),
        { label: `Baseline ${pct(d.fraud_rate)}`, data: [{ x: 0, y: d.fraud_rate }, { x: 1, y: d.fraud_rate }], borderColor: GRID, borderWidth: 1, borderDash: [6, 4], pointRadius: 0, fill: false },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, position: 'top' } },
      scales: {
        x: { type: 'linear', title: { display: true, text: 'Recall' }, grid: { color: GRID }, border: { color: GRID } },
        y: { title: { display: true, text: 'Precision' }, grid: { color: GRID }, border: { color: GRID } },
      },
    },
  });

  // Confusion matrix
  const cm = d.confusion_matrix;
  document.getElementById('cm-wrap').innerHTML = `
    <div class="cm-grid">
      <div class="cm-label"></div>
      <div class="cm-label">Pred Normal</div>
      <div class="cm-label">Pred Fraud</div>
      <div class="cm-label">Actual Normal</div>
      <div class="cm-cell tn">${cm[0][0].toLocaleString()}<div class="cm-cell-type">TN</div></div>
      <div class="cm-cell fp">${cm[0][1].toLocaleString()}<div class="cm-cell-type">FP</div></div>
      <div class="cm-label">Actual Fraud</div>
      <div class="cm-cell fn">${cm[1][0].toLocaleString()}<div class="cm-cell-type">FN</div></div>
      <div class="cm-cell tp">${cm[1][1].toLocaleString()}<div class="cm-cell-type">TP</div></div>
    </div>`;
  
  // Display summary stats
  const tn = cm[0][0], fp = cm[0][1], fn = cm[1][0], tp = cm[1][1];
  const tpr = tp / (tp + fn) || 0;
  const fpr = fp / (fp + tn) || 0;
  const precision = tp / (tp + fp) || 0;
  console.log(`CM Summary - TP:${tp} FP:${fp} FN:${fn} TN:${tn} | TPR:${tpr.toFixed(2)} FPR:${fpr.toFixed(2)} Precision:${precision.toFixed(2)}`);

  // Feature importance
  const fi = [...d.feature_importance].reverse();
  makeChart('chart-fi', hBarConfig(fi.map(f => f.feature), fi.map(f => f.importance), PUR, MINT));

  // SHAP global
  if (d.shap_global && d.shap_global.length) {
    const sh = [...d.shap_global].reverse();
    makeChart('chart-shap', hBarConfig(sh.map(f => f.feature), sh.map(f => f.value), '#14B8A6', PUR));
  }

  // Calibration curve
  if (d.calibration && d.calibration.prob_pred) {
    const cal = d.calibration;
    makeChart('chart-cal', {
      type: 'line',
      data: {
        datasets: [
          { label: 'Model', data: cal.prob_pred.map((x, i) => ({ x, y: cal.prob_true[i] })), borderColor: MINT, borderWidth: 2, pointBackgroundColor: MINT, pointRadius: 5, fill: false },
          { label: 'Perfect', data: [{ x: 0, y: 0 }, { x: 1, y: 1 }], borderColor: GRID, borderWidth: 1, borderDash: [5, 5], pointRadius: 0, fill: false },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true, position: 'top' } },
        scales: {
          x: { type: 'linear', min: 0, max: 1, title: { display: true, text: 'Mean Predicted Prob' }, grid: { color: GRID }, border: { color: GRID } },
          y: { min: 0, max: 1, title: { display: true, text: 'Fraction Positives' }, grid: { color: GRID }, border: { color: GRID } },
        },
      },
    });
  }

  renderThresholdChart();

  // Model card
  const best = d.comparison.find(m => m.is_best);
  document.getElementById('model-card-content').innerHTML = `
    <div class="model-card-title">${best.name}</div>
    <strong>Dataset</strong> — 50,000 banking transactions · ${pct(d.fraud_rate)} fraud rate<br>
    <strong>Imbalance</strong> — Handled via class weighting / scale_pos_weight<br>
    <strong>Evaluation</strong> — Stratified 80/20 split + 5-fold stratified CV<br>
    <strong>Primary metric</strong> — PR-AUC (appropriate for imbalanced classification)<br>
    <strong>Optimal threshold</strong> — ${d.threshold_analysis.optimal_f1_threshold} (F1) · ${d.threshold_analysis.optimal_cost_threshold} (cost-optimal)<br>
    <strong style="color:var(--amber)">Limitations</strong> — Trained on synthetic data; calibration may drift on real distributions<br>
    <strong style="color:var(--amber)">Bias check</strong> — No demographic features used — no protected-class risk`;

  // Classification report
  document.getElementById('clf-report-wrap').innerHTML = `
    <table class="data-table">
      <thead><tr><th>Class</th><th>Precision</th><th>Recall</th><th>F1</th></tr></thead>
      <tbody>
        <tr><td>Normal (0)</td><td>—</td><td>—</td><td>—</td></tr>
        <tr class="best-row">
          <td>Fraud (1)</td>
          <td class="num">${best.precision}</td>
          <td class="num">${best.recall}</td>
          <td class="num">${best.f1}</td>
        </tr>
      </tbody>
    </table>`;
}

// ── THRESHOLD CHART & SLIDER ───────────────────────────────────────────────────
function renderThresholdChart() {
  if (!THRESH_DATA) return;
  const x   = THRESH_DATA.map(r => r.threshold);
  const opt = MODEL_DATA.threshold_analysis.optimal_f1_threshold;

  makeChart('chart-threshold', {
    type: 'line',
    data: {
      labels: x,
      datasets: [
        { label: 'Precision', data: THRESH_DATA.map(r => r.precision), borderColor: MINT,  borderWidth: 2,   pointRadius: 0, fill: false, tension: 0.3 },
        { label: 'Recall',    data: THRESH_DATA.map(r => r.recall),    borderColor: PUR,   borderWidth: 2,   pointRadius: 0, fill: false, tension: 0.3 },
        { label: 'F1',        data: THRESH_DATA.map(r => r.f1),        borderColor: AMBER, borderWidth: 2.5, pointRadius: 0, fill: false, tension: 0.3 },
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
  const row = THRESH_DATA.reduce((prev, cur) =>
    Math.abs(cur.threshold - t) < Math.abs(prev.threshold - t) ? cur : prev
  );
  document.getElementById('tm-prec').textContent = row.precision.toFixed(3);
  document.getElementById('tm-rec').textContent  = row.recall.toFixed(3);
  document.getElementById('tm-f1').textContent   = row.f1.toFixed(3);
  document.getElementById('tm-fp').textContent   = row.fp.toLocaleString();
  document.getElementById('tm-fn').textContent   = row.fn.toLocaleString();
}

document.getElementById('threshold-slider').addEventListener('input', function () {
  const v = parseFloat(this.value);
  document.getElementById('slider-val-display').textContent = v.toFixed(2);
  updateThresholdMetrics(v);
});

// ══════════════════════════════════════════════════════════════════════════════
// LIVE SCORER
// ══════════════════════════════════════════════════════════════════════════════
async function scoreTransaction() {
  const btn = document.getElementById('score-btn');
  btn.disabled    = true;
  btn.textContent = '⏳  Scoring…';

  const payload = {
    amount:       +document.getElementById('f-amount').value,
    balance:      +document.getElementById('f-balance').value,
    distance:     +document.getElementById('f-distance').value,
    tx_time:      document.getElementById('f-time').value,
    tx_type:      document.getElementById('f-type').value,
    merchant_cat: document.getElementById('f-merchant').value,
    card_type:    document.getElementById('f-card').value,
    tx_location:  document.getElementById('f-location').value,
    home_loc:     document.getElementById('f-home').value,
    daily_tx:     +document.getElementById('f-daily').value,
    weekly_tx:    +document.getElementById('f-weekly').value,
    avg_amount:   +document.getElementById('f-avg').value,
    max_24h:      +document.getElementById('f-max24').value,
    failed:       +document.getElementById('f-failed').value,
    prev_fraud:   +document.getElementById('f-prevfraud').value,
    is_intl:      document.getElementById('f-intl').value,
    is_new:       document.getElementById('f-new').value,
    unusual:      document.getElementById('f-unusual').value,
  };

  try {
    const res = await fetch(API_URL + '/api/predict', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderResult(data, payload);
    scoreHistory.unshift({ ...payload, prob: data.probability_pct, tier: data.tier });
    renderHistory();
  } catch (e) {
    alert('Could not reach API. Make sure the backend is running.\n\n' + e.message);
  } finally {
    btn.disabled    = false;
    btn.textContent = '⚡  Analyse Transaction';
  }
}

function renderResult(data, input) {
  const tier  = data.tier.toLowerCase();
  const panel = document.getElementById('result-panel');
  panel.className = 'result-panel ' + tier;

  document.getElementById('result-empty').style.display   = 'none';
  document.getElementById('result-content').style.display = 'block';

  // Probability
  const probEl = document.getElementById('result-prob');
  probEl.className  = 'prob-number ' + tier;
  probEl.textContent = data.probability_pct;

  // Tier badge
  const tierEl = document.getElementById('result-tier');
  tierEl.className  = 'tier-badge ' + tier;
  tierEl.textContent = data.tier + ' RISK';

  // Gauge
  const gaugeColors = { high: RED, medium: AMBER, low: MINT };
  const gf = document.getElementById('gauge-fill');
  gf.style.width      = (data.probability * 100) + '%';
  gf.style.background = gaugeColors[tier];

  document.getElementById('result-meta-line').textContent =
    `${data.probability_pct}  ·  opt threshold ${data.optimal_threshold}`;

  // SHAP waterfall
  const shapSec = document.getElementById('shap-section');
  const shapWf  = document.getElementById('shap-waterfall');
  if (data.shap_waterfall && data.shap_waterfall.length) {
    shapSec.style.display = 'block';
    const maxAbs = Math.max(...data.shap_waterfall.map(r => Math.abs(r.value)));
    shapWf.innerHTML = data.shap_waterfall.map(r => {
      const pctW = maxAbs > 0 ? Math.abs(r.value) / maxAbs * 100 : 0;
      const pos  = r.value > 0;
      const col  = pos ? RED : MINT;
      const left = pos ? '50%' : (50 - pctW / 2) + '%';
      const w    = (pctW / 2) + '%';
      return `<div class="shap-row">
        <div class="shap-feat" title="${r.feature}">${r.feature}</div>
        <div class="shap-bar-track">
          <div class="shap-bar-fill" style="left:${left};width:${w};background:${col}"></div>
          <div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--border2)"></div>
        </div>
        <div class="shap-val" style="color:${col}">${r.value > 0 ? '+' : ''}${r.value.toFixed(4)}</div>
      </div>`;
    }).join('');
  } else {
    shapSec.style.display = 'none';
  }

  // Risk flags
  const flagsEl = document.getElementById('result-flags');
  if (data.flags.length) {
    flagsEl.innerHTML = data.flags.map(f =>
      `<div class="flag-item"><span class="icon">${f.icon}</span><span>${f.text}</span></div>`
    ).join('');
  } else {
    flagsEl.innerHTML = '<div class="flag-item"><span class="icon">✅</span><span>No strong individual risk signals detected</span></div>';
  }

  document.getElementById('result-meta').innerHTML =
    `<span>Model: ${data.model}</span><span>ROC-AUC ${data.roc_auc}</span>`;
}

function renderHistory() {
  if (!scoreHistory.length) return;
  document.getElementById('history-section').style.display = 'block';
  const tierColors = { HIGH: RED, MEDIUM: AMBER, LOW: MINT };
  document.getElementById('history-body').innerHTML = scoreHistory.map((r, i) => `
    <tr>
      <td style="color:var(--muted)">${scoreHistory.length - i}</td>
      <td>${r.tx_type}</td>
      <td class="num">$${r.amount.toLocaleString()}</td>
      <td>${r.tx_location}</td>
      <td class="num">${r.prob}</td>
      <td><span style="color:${tierColors[r.tier]};font-weight:600">${r.tier}</span></td>
    </tr>`).join('');
}

function clearHistory() {
  scoreHistory = [];
  document.getElementById('history-section').style.display = 'none';
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTO-CALCULATE DISTANCE
// ══════════════════════════════════════════════════════════════════════════════
function updateDistanceAutomatically() {
  const homeLocation = document.getElementById('f-home').value;
  const txLocation = document.getElementById('f-location').value;
  const distance = calculateDistance(homeLocation, txLocation);
  
  if (distance !== null) {
    document.getElementById('f-distance').value = distance;
  }
}

// Attach listeners to location dropdowns
document.addEventListener('DOMContentLoaded', function() {
  console.log('[INIT] Page loaded, starting boot sequence...');
  boot();
  
  const homeSelect = document.getElementById('f-home');
  const locationSelect = document.getElementById('f-location');
  
  if (homeSelect) homeSelect.addEventListener('change', updateDistanceAutomatically);
  if (locationSelect) locationSelect.addEventListener('change', updateDistanceAutomatically);
  
  // Initial calculation
  updateDistanceAutomatically();
});

function recalcImpact() {
  if (!THRESH_DATA) return;

  const costFn  = +document.getElementById('cost-fn').value    || 5.0;
  const costFp  = +document.getElementById('cost-fp').value    || 0.00005;
  const monthly = +document.getElementById('monthly-vol').value || 50000;
  const scale   = monthly / 10000;

  const rows = THRESH_DATA.map(r => ({
    t:      r.threshold,
    total:  (r.fn * costFn + r.fp * costFp) * scale,
    fn_c:   r.fn * costFn * scale,
    fp_c:   r.fp * costFp * scale,
    caught: r.tp * costFn * scale,
    net:    (r.tp * costFn - r.fp * costFp) * scale,
    tp:     r.tp,
  }));

  const optRow     = rows.reduce((a, b) => a.total < b.total ? a : b);
  const baselineCost = rows[rows.length - 1].fn_c;
  const savingsRows  = rows.map(r => ({ t: r.t, s: baselineCost - r.total }));
  const bestSave     = savingsRows.reduce((a, b) => a.s > b.s ? a : b);

  document.getElementById('biz-caught').textContent  = 'M ' + optRow.caught.toFixed(1);
  document.getElementById('biz-missed').textContent  = 'M ' + optRow.fn_c.toFixed(1);
  document.getElementById('biz-fp-cost').textContent = 'M ' + optRow.fp_c.toFixed(4);
  document.getElementById('biz-net').textContent     = 'M ' + optRow.net.toFixed(1);
  document.getElementById('biz-annual-save').textContent  = 'M ' + (bestSave.s * 12).toFixed(1);
  document.getElementById('biz-annual-cost').textContent  = 'M ' + (optRow.total * 12).toFixed(1);
  document.getElementById('biz-monthly-caught').textContent = Math.round(optRow.tp / 10000 * monthly).toLocaleString();

  makeChart('chart-cost', {
    type: 'line',
    data: {
      labels: rows.map(r => r.t),
      datasets: [
        { label: 'Total Cost (FP+FN)', data: rows.map(r => r.total), borderColor: RED,   borderWidth: 2,   fill: true, backgroundColor: RED + '18', tension: 0.3, pointRadius: 0 },
        { label: 'FN Cost',            data: rows.map(r => r.fn_c),  borderColor: AMBER, borderWidth: 1.5, fill: false, tension: 0.3, pointRadius: 0 },
        { label: 'FP Cost',            data: rows.map(r => r.fp_c),  borderColor: PUR,   borderWidth: 1.5, fill: false, tension: 0.3, pointRadius: 0, borderDash: [4, 3] },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, position: 'top' } },
      scales: {
        x: { grid: { color: GRID }, border: { color: GRID }, ticks: { maxTicksLimit: 10 } },
        y: { grid: { color: GRID }, border: { color: GRID }, ticks: { color: MUTED } },
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
        borderColor: MINT, borderWidth: 2,
        fill: true,
        backgroundColor: ctx => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
          g.addColorStop(0, MINT + '44'); g.addColorStop(1, MINT + '00'); return g;
        },
        tension: 0.3, pointRadius: 0,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: GRID }, border: { color: GRID }, ticks: { maxTicksLimit: 10 } },
        y: { grid: { color: GRID }, border: { color: GRID }, ticks: { color: MUTED } },
      },
    },
  });
}

// ── COLOUR LERP ────────────────────────────────────────────────────────────────
function lerpColor(a, b, t) {
  const ah = a.replace('#', ''), bh = b.replace('#', '');
  const ar = parseInt(ah.slice(0, 2), 16), ag = parseInt(ah.slice(2, 4), 16), ab2 = parseInt(ah.slice(4, 6), 16);
  const br = parseInt(bh.slice(0, 2), 16), bg = parseInt(bh.slice(2, 4), 16), bb2 = parseInt(bh.slice(4, 6), 16);
  return '#' + [
    Math.round(ar + (br - ar) * t),
    Math.round(ag + (bg - ag) * t),
    Math.round(ab2 + (bb2 - ab2) * t),
  ].map(v => v.toString(16).padStart(2, '0')).join('');
}

// ── BOOT ───────────────────────────────────────────────────────────────────────
boot();