# 🛡️ FraudShield — Web Edition

HTML/CSS/JS frontend on **GitHub Pages** + FastAPI backend on **Render**.

```
fraudshield/
├── backend/
│   ├── main.py            # FastAPI — /api/health, /api/eda, /api/model, /api/predict
│   └── requirements.txt
├── docs/
│   └── index.html         # GitHub Pages frontend (pure HTML/CSS/JS + Chart.js)
├── src/
│   └── pipeline.py        # ML pipeline (unchanged)
├── models/
│   └── artifacts.pkl      # auto-generated on first train
├── data/
│   └── FraudShield_Banking_Data.csv
├── render.yaml            # Render deployment config
└── README.md
```

---

## Step 1 — Train the model

```bash
pip install -r backend/requirements.txt
python src/pipeline.py data/FraudShield_Banking_Data.csv
```

This creates `models/artifacts.pkl` (~60 seconds).

---

## Step 2 — Run locally (full stack)

**Terminal 1 — Backend:**
```bash
uvicorn backend.main:app --reload
# API running at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

**Terminal 2 — Frontend:**
Just open `docs/index.html` in your browser.
Or serve it with any static server:
```bash
python -m http.server 3000 --directory docs
# Open http://localhost:3000
```

The `API_URL` in `docs/index.html` defaults to `http://localhost:8000`. No changes needed for local dev.

---

## Step 3 — Deploy backend to Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Render auto-detects `render.yaml` — click **Deploy**
5. Note your service URL: `https://fraudshield-api.onrender.com`

> **Free tier note:** Render free tier spins down after 15 min of inactivity.
> The first request after sleep takes ~30 seconds. Upgrade to Starter ($7/mo)
> for always-on. Alternatively, use Railway or Fly.io.

---

## Step 4 — Update the frontend API URL

In `docs/index.html`, find line ~780:

```js
const API_URL = 'http://localhost:8000';
```

Change to your Render URL:

```js
const API_URL = 'https://fraudshield-api.onrender.com';
```

---

## Step 5 — Deploy frontend to GitHub Pages

1. Push your repo to GitHub
2. Go to repo **Settings → Pages**
3. Source: **Deploy from branch**
4. Branch: `main` | Folder: `/docs`
5. Save → your site is live at `https://yourusername.github.io/fraudshield`

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/health` | Status check, model name, AUC |
| `GET`  | `/api/eda` | All pre-computed EDA stats |
| `GET`  | `/api/model` | Model comparison, curves, SHAP, calibration, threshold analysis |
| `POST` | `/api/predict` | Score a transaction → probability, tier, flags, SHAP waterfall |

Interactive docs: `https://your-render-url.onrender.com/docs`

### POST /api/predict — request body
```json
{
  "amount": 5.0,
  "balance": 20.0,
  "distance": 50,
  "tx_time": "14:30",
  "tx_type": "Online",
  "merchant_cat": "Electronics",
  "card_type": "Credit",
  "tx_location": "Dubai",
  "home_loc": "Karachi",
  "daily_tx": 3,
  "weekly_tx": 10,
  "avg_amount": 3.0,
  "max_24h": 4.0,
  "failed": 0,
  "prev_fraud": 0,
  "is_intl": "Yes",
  "is_new": "Yes",
  "unusual": "No"
}
```

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | HTML · CSS · Vanilla JS · Chart.js 4 |
| Backend | FastAPI · Uvicorn · Pydantic |
| ML | scikit-learn · SHAP · pandas · numpy |
| Hosting (FE) | GitHub Pages (free, static) |
| Hosting (BE) | Render (free tier / $7 Starter) |