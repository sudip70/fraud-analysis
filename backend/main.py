"""
FraudShield — FastAPI Backend
Endpoints:
  GET  /api/health
  GET  /api/eda
  GET  /api/model
  POST /api/predict
"""

import os
import sys
import pickle
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from src.pipeline import preprocess

# ── Load artifacts once at startup ────────────────────────────────────────────
ARTIFACT_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "model.pkl")


def load_artifacts():
    if not os.path.exists(ARTIFACT_PATH):
        raise RuntimeError(
            f"Artifacts not found at {ARTIFACT_PATH}. "
            "Run: python src/pipeline.py data/FraudShield_Banking_Data.csv"
        )
    with open(ARTIFACT_PATH, "rb") as f:
        return pickle.load(f)


arts = load_artifacts()

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="FraudShield API",
    description="Fraud detection ML backend — EDA stats, model metrics, live scoring",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Utility: Convert NaN to None for JSON serialization ────────────────────────
def clean_nan(val):
    """Convert NaN and Inf to None for JSON compatibility (handles nested structures)."""
    if isinstance(val, dict):
        return {k: clean_nan(v) for k, v in val.items()}
    elif isinstance(val, list):
        return [clean_nan(v) for v in val]
    elif isinstance(val, float):
        if np.isnan(val) or np.isinf(val):
            return None
    return val


# ══════════════════════════════════════════════════════════════════════════════
# HEALTH
# ══════════════════════════════════════════════════════════════════════════════
@app.get("/api/health")
def health():
    best = arts["best_name"]
    return {
        "status":  "ok",
        "model":   best,
        "roc_auc": arts["model_results"][best]["roc_auc"],
        "shap":    arts.get("shap_data") is not None,
    }


# ══════════════════════════════════════════════════════════════════════════════
# EDA
# ══════════════════════════════════════════════════════════════════════════════
@app.get("/api/eda")
def eda():
    e    = arts["eda"]
    # Updated bins for dollar amounts (0-100,000 range)
    bins = np.linspace(0, 100000, 22).tolist()
    bcs  = ((np.array(bins[:-1]) + np.array(bins[1:])) / 2).tolist()

    def _hist(data):
        counts, _ = np.histogram(data, bins=bins, density=True)
        return {"x": bcs, "y": [clean_nan(float(c)) for c in counts.tolist()]}

    response = {
        "overview": {
            "total_transactions": e["total_transactions"],
            "total_fraud":        e["total_fraud"],
            "fraud_rate":         round(e["fraud_rate"], 6),
            "total_amount":       round(e["total_amount"], 2),
            "avg_fraud_amount":   round(e["avg_fraud_amount"], 4),
        },
        "fraud_by_type":          e["fraud_by_type"],
        "fraud_by_merchant":      e["fraud_by_merchant"],
        "fraud_by_location":      e["fraud_by_location"],
        "fraud_by_international": e["fraud_by_international"],
        "fraud_by_new_merchant":  e["fraud_by_new_merchant"],
        "fraud_by_prev_fraud":    e["fraud_by_prev_fraud"],
        "fraud_by_hour":          e["fraud_by_hour"],
        "fraud_by_combo":         e["fraud_by_combo"],
        "amount_dist": {
            "normal": _hist(e["amount_normal"]),
            "fraud":  _hist(e["amount_fraud"]),
        },
        "distance_dist": {
            "normal_median": clean_nan(float(np.median(e["distance_normal"]))),
            "fraud_median":  clean_nan(float(np.median(e["distance_fraud"]))),
            "normal_p75":    clean_nan(float(np.percentile(e["distance_normal"], 75))),
            "fraud_p75":     clean_nan(float(np.percentile(e["distance_fraud"], 75))),
        },
        "correlation": e.get("correlation_matrix", {}),
    }
    return clean_nan(response)


# ══════════════════════════════════════════════════════════════════════════════
# MODEL INFO
# ══════════════════════════════════════════════════════════════════════════════
@app.get("/api/model")
def model_info():
    from sklearn.metrics import roc_curve, precision_recall_curve

    results = arts["model_results"]
    best    = arts["best_name"]

    # Curves (downsample to ≤200 points each)
    def _ds(arr, n=200):
        arr = np.asarray(arr)
        idx = np.round(np.linspace(0, len(arr) - 1, min(n, len(arr)))).astype(int)
        return arr[idx].tolist()

    curves = {}
    for name, r in results.items():
        y_t = np.array(r["y_test"])
        y_p = np.array(r["y_prob"])
        fpr, tpr, _ = roc_curve(y_t, y_p)
        pre, rec, _ = precision_recall_curve(y_t, y_p)
        curves[name] = {
            "roc": {"fpr": _ds(fpr), "tpr": _ds(tpr)},
            "pr":  {"precision": _ds(pre), "recall": _ds(rec)},
        }

    # Model comparison rows
    comparison = []
    for name, r in results.items():
        rep = r["report"]
        fraud_rep = rep.get("1", rep.get(1, {}))
        comparison.append({
            "name":      name,
            "roc_auc":   round(r["roc_auc"],  4),
            "pr_auc":    round(r["pr_auc"],   4),
            "cv_mean":   round(r["cv_mean"],  4),
            "cv_std":    round(r["cv_std"],   4),
            "brier":     round(r["brier"],    4),
            "precision": round(fraud_rep.get("precision", 0), 4),
            "recall":    round(fraud_rep.get("recall", 0),    4),
            "f1":        round(fraud_rep.get("f1-score", 0),  4),
            "is_best":   name == best,
        })

    # Feature importance top 15
    fi_rows = [
        {"feature": row["feature"], "importance": round(float(row["importance"]), 6)}
        for _, row in arts["feature_importance"].head(15).iterrows()
    ]

    # SHAP global mean |SHAP|
    shap_global = []
    sd = arts.get("shap_data")
    if sd is not None:
        top_shap = sd["mean_abs"].head(15)
        shap_global = [
            {"feature": k, "value": round(float(v), 6)}
            for k, v in top_shap.items()
        ]

    # Calibration
    cal = arts.get("calibration", {})

    # Threshold analysis
    thresh = arts["threshold_analysis"]

    return {
        "best_name":          best,
        "comparison":         comparison,
        "curves":             curves,
        "confusion_matrix":   results[best]["cm"],
        "feature_importance": fi_rows,
        "shap_global":        shap_global,
        "calibration":        cal,
        "threshold_analysis": {
            "optimal_f1_threshold":   thresh["optimal_f1_threshold"],
            "optimal_cost_threshold": thresh["optimal_cost_threshold"],
            "data": [
                {k: round(v, 5) if isinstance(v, float) else v for k, v in row.items()}
                for row in thresh["data"]
            ],
        },
        "fraud_rate": arts["eda"]["fraud_rate"],
    }


# ══════════════════════════════════════════════════════════════════════════════
# PREDICT
# ══════════════════════════════════════════════════════════════════════════════
class TransactionInput(BaseModel):
    amount:       float
    balance:      float
    distance:     float
    tx_time:      str
    tx_type:      str
    merchant_cat: str
    card_type:    str
    tx_location:  str
    home_loc:     str
    daily_tx:     int
    weekly_tx:    int
    avg_amount:   float
    max_24h:      float
    failed:       int
    prev_fraud:   int
    is_intl:      str
    is_new:       str
    unusual:      str


@app.post("/api/predict")
def predict(tx: TransactionInput):
    row = pd.DataFrame([{
        "Transaction_Amount":       tx.amount,
        "Transaction_Time":                      tx.tx_time,
        "Transaction_Date":                      "2025-01-01",
        "Transaction_Type":                      tx.tx_type,
        "Merchant_Category":                     tx.merchant_cat,
        "Transaction_Location":                  tx.tx_location,
        "Customer_Home_Location":                tx.home_loc,
        "Distance_From_Home":                    tx.distance,
        "Card_Type":                             tx.card_type,
        "Account_Balance":          tx.balance,
        "Daily_Transaction_Count":               tx.daily_tx,
        "Weekly_Transaction_Count":              tx.weekly_tx,
        "Avg_Transaction_Amount":   tx.avg_amount,
        "Max_Transaction_Last_24h": tx.max_24h,
        "Is_International_Transaction":          tx.is_intl,
        "Is_New_Merchant":                       tx.is_new,
        "Failed_Transaction_Count":              tx.failed,
        "Unusual_Time_Transaction":              tx.unusual,
        "Previous_Fraud_Count":                  tx.prev_fraud,
        # Dummy cols required by engineer_features but not used in features
        "Transaction_ID": 0, "Customer_ID": 0, "Merchant_ID": 0,
        "Device_ID": 0, "IP_Address": "0.0.0.0", "Fraud_Label": "Normal",
    }])

    try:
        X = preprocess(row, encoders=arts["encoders"], fit=False)
        X = X.reindex(columns=arts["feature_names"], fill_value=0)
        prob = float(arts["best_model"].predict_proba(X)[0][1])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Calculate risk multiplier based on high-risk factors
    risk_multiplier = 1.0
    
    # Distance is a strong fraud indicator - boost probability significantly
    if tx.distance > 2000:
        risk_multiplier *= 5.0  # 5x boost for extremely far transactions
    elif tx.distance > 1000:
        risk_multiplier *= 3.5  # 3.5x boost for very far transactions
    elif tx.distance > 500:
        risk_multiplier *= 2.0  # 2x boost for far transactions
    elif tx.distance > 200:
        risk_multiplier *= 1.3  # 1.3x boost for moderately far
    
    # Additional risk factors
    if tx.is_intl == "Yes" and tx.is_new == "Yes":
        risk_multiplier *= 1.5
    if tx.unusual == "Yes":
        risk_multiplier *= 1.3
    if tx.prev_fraud > 0:
        risk_multiplier *= 2.0
    
    # Apply multiplier to probability (but cap at 0.99)
    adjusted_prob = min(prob * risk_multiplier, 0.99)
    
    # Risk tier based on adjusted probability (lower thresholds for business sensitivity)
    if adjusted_prob >= 0.40:
        tier = "HIGH"
    elif adjusted_prob >= 0.15:
        tier = "MEDIUM"
    else:
        tier = "LOW"
    
    # Override tier based on extreme risk factors
    if tx.distance > 3000:
        tier = "HIGH"  # Any transaction >3000 km from home is HIGH risk
    elif tx.distance > 1500 and (tier == "LOW" or tier == "MEDIUM"):
        tier = "MEDIUM"  # >1500 km at least MEDIUM risk
    elif tx.is_intl == "Yes" and tx.is_new == "Yes":
        tier = "HIGH"  # International + new merchant = HIGH risk

    # Rule-based flags
    flags = []
    if tx.is_intl == "Yes":
        flags.append({"icon": "🌍", "text": "International transaction"})
    if tx.is_new == "Yes":
        flags.append({"icon": "🏪", "text": "New merchant — no prior history"})
    if tx.unusual == "Yes":
        flags.append({"icon": "🕐", "text": "Unusual transaction time"})
    if tx.tx_location != tx.home_loc:
        flags.append({"icon": "📍", "text": f"Location mismatch: {tx.tx_location} vs home {tx.home_loc}"})
    if tx.distance > 400:
        flags.append({"icon": "📏", "text": f"{tx.distance} km from home"})
    if tx.failed > 0:
        flags.append({"icon": "❌", "text": f"{tx.failed} failed transaction(s) in session"})
    if tx.prev_fraud > 0:
        flags.append({"icon": "⚠️", "text": f"Prior fraud history: {tx.prev_fraud} incident(s)"})
    if tx.avg_amount > 0 and tx.amount > tx.avg_amount * 2:
        flags.append({"icon": "💰", "text": f"Amount spike: {tx.amount}M vs avg {tx.avg_amount}M ({tx.amount/tx.avg_amount:.1f}×)"})

    # SHAP waterfall for this prediction
    shap_waterfall = []
    expl = arts.get("shap_explainer")
    if expl is not None:
        try:
            sv = expl.shap_values(X)
            # Binary tree models → list[class_0, class_1]; others → 2-D array
            if isinstance(sv, list):
                sv_flat = sv[1][0]
            else:
                sv_flat = sv[0]
            series = pd.Series(sv_flat, index=arts["feature_names"])
            top    = pd.concat([series.nlargest(6), series.nsmallest(6)]).sort_values()
            shap_waterfall = [
                {"feature": k, "value": round(float(v), 5)}
                for k, v in top.items()
            ]
        except Exception:
            pass  # SHAP is best-effort; don't fail the whole prediction

    return {
        "probability":        round(adjusted_prob, 6),
        "probability_pct":    f"{adjusted_prob:.1%}",
        "tier":               tier,
        "flags":              flags,
        "shap_waterfall":     shap_waterfall,
        "model":              arts["best_name"],
        "roc_auc":            round(arts["model_results"][arts["best_name"]]["roc_auc"], 4),
        "optimal_threshold":  arts["threshold_analysis"]["optimal_f1_threshold"],
    }