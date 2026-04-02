"""
FraudShield ML Pipeline
Trains 3 classifiers (Random Forest, LightGBM, Logistic Regression),
computes EDA, SHAP, calibration, and threshold analysis.
Saves a single artifacts dict to models/model.pkl.
"""

import os
import sys
import pickle
import warnings

import numpy as np
import pandas as pd
from tqdm import tqdm

from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score,
    average_precision_score,
    precision_score,
    recall_score,
    f1_score,
    brier_score_loss,
)
from sklearn.calibration import calibration_curve
from sklearn.utils.class_weight import compute_class_weight

warnings.filterwarnings("ignore")

# ── Optional dependencies ────────────────────────────────────────────────────
try:
    import lightgbm as lgb
    LGB_AVAILABLE = True
except ImportError:
    LGB_AVAILABLE = False
    from sklearn.ensemble import GradientBoostingClassifier
    print("⚠️  lightgbm not installed — falling back to GradientBoostingClassifier")

try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False
    print("⚠️  shap not installed — SHAP explainability disabled")


# ══════════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ══════════════════════════════════════════════════════════════════════════════

TARGET = "Fraud_Label"

NUMERIC_FEATURES = [
    "Transaction_Amount", "Distance_From_Home",
    "Account_Balance", "Daily_Transaction_Count",
    "Weekly_Transaction_Count", "Avg_Transaction_Amount",
    "Max_Transaction_Last_24h", "Failed_Transaction_Count",
    "Previous_Fraud_Count", "Hour", "DayOfWeek", "Month",
    "IsWeekend", "IsNight", "Amount_vs_Avg", "Amount_vs_Max24h",
    "Balance_vs_Amount", "Spend_Ratio", "Location_Mismatch",
    "Tx_Velocity_Ratio", "Risk_Flag_Count",
]


CATEGORICAL_FEATURES = [
    "Transaction_Type", "Merchant_Category", "Card_Type",
    "Is_International_Transaction", "Is_New_Merchant",
    "Unusual_Time_Transaction",
]


# ══════════════════════════════════════════════════════════════════════════════
# FEATURE ENGINEERING
# ══════════════════════════════════════════════════════════════════════════════

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df["Hour"] = (
        pd.to_datetime(df["Transaction_Time"], format="%H:%M", errors="coerce").dt.hour
    )
    df["Transaction_Date"] = pd.to_datetime(df["Transaction_Date"], errors="coerce")
    df["DayOfWeek"] = df["Transaction_Date"].dt.dayofweek
    df["Month"]     = df["Transaction_Date"].dt.month
    df["IsWeekend"] = (df["DayOfWeek"] >= 5).astype(int)
    df["IsNight"]   = ((df["Hour"] >= 22) | (df["Hour"] <= 5)).astype(int)

    amt = df["Transaction_Amount"]
    avg = df["Avg_Transaction_Amount"]
    mx  = df["Max_Transaction_Last_24h"]
    bal = df["Account_Balance"]
    wk  = df["Weekly_Transaction_Count"]
    dy  = df["Daily_Transaction_Count"]

    df["Amount_vs_Avg"]    = amt / (avg + 1e-9)
    df["Amount_vs_Max24h"] = amt / (mx + 1e-9)
    df["Balance_vs_Amount"]= bal / (amt + 1e-9)
    df["Spend_Ratio"]      = (amt / (bal + 1e-9)).clip(0, 10)
    df["Location_Mismatch"]= (df["Transaction_Location"] != df["Customer_Home_Location"]).astype(int)
    df["Tx_Velocity_Ratio"]= (dy / (wk / 7 + 1e-9)).clip(0, 10)

    df["Risk_Flag_Count"] = (
        (df["Is_International_Transaction"] == "Yes").astype(int)
        + (df["Is_New_Merchant"]           == "Yes").astype(int)
        + (df["Unusual_Time_Transaction"]  == "Yes").astype(int)
        + df["Location_Mismatch"]
        + (df["Failed_Transaction_Count"] > 0).astype(int)
        + (df["Previous_Fraud_Count"]     > 0).astype(int)
    )
    return df


# ══════════════════════════════════════════════════════════════════════════════
# PREPROCESS  (used by pipeline AND by the API at predict-time)
# ══════════════════════════════════════════════════════════════════════════════

def preprocess(df: pd.DataFrame, encoders=None, fit: bool = True):
    """
    Returns:
      fit=True  → (X, y, encoders)
      fit=False → X
    """
    df = engineer_features(df)

    if fit:
        encoders = {}

    cat_cols = []
    for col in CATEGORICAL_FEATURES:
        if fit:
            le = LabelEncoder()
            le.fit(df[col].fillna("Unknown").astype(str))
            encoders[col] = le

        le = encoders[col]
        # ← fix: bind `le` in the lambda default to avoid late-binding closure bug
        safe_map = lambda x, _le=le: x if x in _le.classes_ else _le.classes_[0]
        encoded  = le.transform(df[col].fillna("Unknown").astype(str).map(safe_map))
        cat_cols.append(pd.Series(encoded, name=col, index=df.index))

    num_df = df[NUMERIC_FEATURES].copy()
    num_df = num_df.fillna(num_df.median())

    X = pd.concat([num_df] + cat_cols, axis=1).reset_index(drop=True)

    if fit:
        y = (df[TARGET] == "Fraud").astype(int).reset_index(drop=True)
        return X, y, encoders
    return X


# ══════════════════════════════════════════════════════════════════════════════
# EDA
# ══════════════════════════════════════════════════════════════════════════════

def _fraud_rate_by(df: pd.DataFrame, col: str) -> list:
    grp = (
        df.groupby(col, observed=True)
        .agg(total=(TARGET, "count"), fraud=(TARGET, lambda x: (x == "Fraud").sum()))
        .reset_index()
    )
    grp["fraud"] = grp["fraud"].astype(float)
    grp["total"] = grp["total"].astype(float)
    grp["fraud_rate"] = (grp["fraud"] / grp["total"]).round(6)
    return grp.to_dict("records")


def compute_eda(df: pd.DataFrame) -> dict:
    print("📊 Computing EDA stats…")
    
    # ── Clean NaN values in categorical columns ────────────────────────────────
    categorical_cols = [
        "Transaction_Type", "Merchant_Category", "Transaction_Location",
        "Customer_Home_Location", "Card_Type", "Is_International_Transaction",
        "Is_New_Merchant", "Unusual_Time_Transaction"
    ]
    for col in categorical_cols:
        if col in df.columns and df[col].isna().any():
            mode_val = df[col].mode()
            if len(mode_val) > 0:
                df[col] = df[col].fillna(mode_val[0])
    
    is_fraud = df[TARGET] == "Fraud"

    df2 = df.copy()
    df2["Hour"] = (
        pd.to_datetime(df2["Transaction_Time"], format="%H:%M", errors="coerce").dt.hour
    )

    # Hourly fraud rate
    hr = (
        df2.groupby("Hour", observed=True)
        .agg(total=(TARGET, "count"), fraud=(TARGET, lambda x: (x == "Fraud").sum()))
        .reset_index()
    )
    hr["fraud_rate"] = (hr["fraud"] / hr["total"]).round(6)
    fraud_by_hour = hr[["Hour", "fraud_rate"]].to_dict("records")

    # Combo flag
    df2["Combo"] = (
        df2["Is_International_Transaction"].astype(str)
        + " Intl / "
        + df2["Is_New_Merchant"].astype(str)
        + " New"
    )
    combo = (
        df2.groupby("Combo", observed=True)
        .agg(total=(TARGET, "count"), fraud=(TARGET, lambda x: (x == "Fraud").sum()))
        .reset_index()
    )
    combo["fraud_rate"] = (combo["fraud"] / combo["total"]).round(6)
    fraud_by_combo = combo[["Combo", "fraud_rate"]].to_dict("records")

    # Previous fraud — cast to int so JSON keys are clean
    df2["Previous_Fraud_Count"] = df2["Previous_Fraud_Count"].fillna(0).astype(int)
    fraud_by_prev = _fraud_rate_by(df2, "Previous_Fraud_Count")

    # Correlation matrix (numeric subset)
    num_subset = [
        "Transaction_Amount", "Distance_From_Home",
        "Account_Balance", "Daily_Transaction_Count",
        "Weekly_Transaction_Count", "Failed_Transaction_Count",
        "Previous_Fraud_Count",
    ]
    available = [c for c in num_subset if c in df.columns]
    corr = df[available].corr().round(3)
    corr_dict = {c: corr[c].to_dict() for c in corr.columns}

    return {
        "total_transactions": int(len(df)),
        "total_fraud":        int(is_fraud.sum()),
        "fraud_rate":         float(is_fraud.mean()),
        "total_amount":       float(df["Transaction_Amount"].sum()),
        "avg_fraud_amount":   float(df.loc[is_fraud, "Transaction_Amount"].mean()),
        "fraud_by_type":          _fraud_rate_by(df, "Transaction_Type"),
        "fraud_by_merchant":      _fraud_rate_by(df, "Merchant_Category"),
        "fraud_by_location":      _fraud_rate_by(df, "Transaction_Location"),
        "fraud_by_international": _fraud_rate_by(df, "Is_International_Transaction"),
        "fraud_by_new_merchant":  _fraud_rate_by(df, "Is_New_Merchant"),
        "fraud_by_prev_fraud":    fraud_by_prev,
        "fraud_by_hour":          fraud_by_hour,
        "fraud_by_combo":         fraud_by_combo,
        "amount_normal":  df.loc[~is_fraud, "Transaction_Amount"].clip(0, 100000).tolist(),
        "amount_fraud":   df.loc[ is_fraud, "Transaction_Amount"].clip(0, 100000).tolist(),
        "distance_normal": df.loc[~is_fraud, "Distance_From_Home"].tolist(),
        "distance_fraud":  df.loc[ is_fraud, "Distance_From_Home"].tolist(),
        "correlation_matrix": corr_dict,
    }


# ══════════════════════════════════════════════════════════════════════════════
# THRESHOLD ANALYSIS
# ══════════════════════════════════════════════════════════════════════════════

def compute_threshold_analysis(y_test: np.ndarray, y_prob: np.ndarray) -> dict:
    thresholds = np.round(np.arange(0.05, 0.96, 0.05), 2)
    data = []
    for t in thresholds:
        y_pred = (y_prob >= t).astype(int)
        cm     = confusion_matrix(y_test, y_pred)
        tn, fp, fn, tp = cm.ravel()
        data.append({
            "threshold": float(t),
            "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
            "recall":    round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
            "f1":        round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
            "fp": int(fp), "fn": int(fn), "tp": int(tp), "tn": int(tn),
        })

    best_f1   = max(data, key=lambda r: r["f1"])
    best_cost = min(data, key=lambda r: r["fn"] * 5.0 + r["fp"] * 0.1)

    return {
        "optimal_f1_threshold":   best_f1["threshold"],
        "optimal_cost_threshold": best_cost["threshold"],
        "data": data,
    }


# ══════════════════════════════════════════════════════════════════════════════
# TRAIN
# ══════════════════════════════════════════════════════════════════════════════

def train(data_path: str, output_dir: str = "models") -> dict:
    # ── Load ─────────────────────────────────────────────────────────────
    print(f"📂 Loading data from {data_path}…")
    df = pd.read_csv(data_path)
    print(f"   {len(df):,} rows  |  Fraud rate: {(df[TARGET]=='Fraud').mean():.2%}")

    eda = compute_eda(df)

    # ── Preprocess ───────────────────────────────────────────────────────
    print("\n🔧 Preprocessing…")
    X, y, encoders = preprocess(df, fit=True)
    feature_names  = list(X.columns)

    # Cap at 200 k rows for manageable training time
    if len(X) > 200_000:
        idx = X.sample(200_000, random_state=42).index
        X = X.loc[idx].reset_index(drop=True)
        y = y.loc[idx].reset_index(drop=True)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, stratify=y, test_size=0.2, random_state=42
    )

    weights  = compute_class_weight("balanced", classes=np.array([0, 1]), y=y_train)
    cw       = {0: float(weights[0]), 1: float(weights[1])}
    sw_train = np.where(y_train == 1, weights[1], weights[0])

    # ── Define 3 models ──────────────────────────────────────────────────
    if LGB_AVAILABLE:
        boost_name  = "LightGBM"
        boost_model = lgb.LGBMClassifier(
            n_estimators=300,
            learning_rate=0.05,
            max_depth=6,
            scale_pos_weight=weights[1] / weights[0],
            random_state=42,
            verbose=-1,
        )
        boost_needs_sw = False   # LightGBM uses scale_pos_weight instead
    else:
        boost_name  = "Gradient Boosting"
        boost_model = GradientBoostingClassifier(n_estimators=100, random_state=42)
        boost_needs_sw = True

    model_defs = [
        (
            "Random Forest",
            RandomForestClassifier(
                n_estimators=150, max_depth=10,
                class_weight=cw, random_state=42, n_jobs=-1,
            ),
            False,
        ),
        (boost_name, boost_model, boost_needs_sw),
        (
            "Logistic Regression",
            LogisticRegression(max_iter=1000, class_weight=cw, random_state=42),
            False,
        ),
    ]

    # ── Train & evaluate ─────────────────────────────────────────────────
    print(f"\n🏋️  Training {len(model_defs)} models…")
    model_results = {}

    for name, model, needs_sw in tqdm(model_defs, desc="Models"):
        print(f"\n  → {name}")

        if needs_sw:
            model.fit(X_train, y_train, sample_weight=sw_train)
        else:
            model.fit(X_train, y_train)

        y_prob = model.predict_proba(X_test)[:, 1]
        y_pred = (y_prob >= 0.5).astype(int)
        cm_raw = confusion_matrix(y_test, y_pred)
        
        # Validate confusion matrix
        tn, fp, fn, tp = cm_raw.ravel()
        total_positives_in_test = fn + tp
        total_test_samples = tn + fp + fn + tp
        print(f"   {name}: Test set has {total_test_samples} samples, {total_positives_in_test} actual fraud cases")
        
        rep    = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

        # 5-fold stratified CV
        skf       = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        cv_scores = []
        for tr_idx, va_idx in skf.split(X_train, y_train):
            Xtr, Xva = X_train.iloc[tr_idx], X_train.iloc[va_idx]
            ytr, yva = y_train.iloc[tr_idx], y_train.iloc[va_idx]
            try:
                m2 = model.__class__(**model.get_params())
            except TypeError:
                m2 = model.__class__()
            if needs_sw:
                sw2 = np.where(ytr == 1, weights[1], weights[0])
                m2.fit(Xtr, ytr, sample_weight=sw2)
            else:
                m2.fit(Xtr, ytr)
            cv_scores.append(roc_auc_score(yva, m2.predict_proba(Xva)[:, 1]))

        roc = float(roc_auc_score(y_test, y_prob))
        pr  = float(average_precision_score(y_test, y_prob))
        print(f"     ROC-AUC={roc:.4f}  PR-AUC={pr:.4f}  CV={np.mean(cv_scores):.4f}±{np.std(cv_scores):.4f}")

        model_results[name] = {
            "model":   model,
            "roc_auc": roc,
            "pr_auc":  pr,
            "cv_mean": round(float(np.mean(cv_scores)), 4),
            "cv_std":  round(float(np.std(cv_scores)), 4),
            "brier":   round(float(brier_score_loss(y_test, y_prob)), 4),
            "report":  rep,
            "y_test":  y_test.tolist(),
            "y_prob":  y_prob.tolist(),
            "cm":      cm_raw.tolist(),
        }

    best_name  = max(model_results, key=lambda k: model_results[k]["roc_auc"])
    best_model = model_results[best_name]["model"]
    print(f"\n🏆 Best model: {best_name}  (ROC-AUC={model_results[best_name]['roc_auc']:.4f})")

    # ── Feature importance ────────────────────────────────────────────────
    try:
        if hasattr(best_model, "feature_importances_"):
            imp = best_model.feature_importances_
        else:
            imp = np.abs(best_model.coef_[0])
        fi = (
            pd.DataFrame({"feature": feature_names, "importance": imp})
            .sort_values("importance", ascending=False)
            .reset_index(drop=True)
        )
    except Exception:
        fi = pd.DataFrame({"feature": feature_names, "importance": np.ones(len(feature_names))})

    # ── SHAP ─────────────────────────────────────────────────────────────
    shap_data      = None
    shap_explainer = None
    if SHAP_AVAILABLE:
        try:
            print("\n🔬 Computing SHAP values…")
            sample = X_test.sample(min(300, len(X_test)), random_state=42)
            if hasattr(best_model, "feature_importances_"):
                explainer = shap.TreeExplainer(best_model)
            else:
                bg = shap.sample(X_train, 100)
                explainer = shap.LinearExplainer(best_model, bg)

            sv = explainer.shap_values(sample)
            # Binary tree models return list-of-2; others return single array
            sv_arr   = sv[1] if isinstance(sv, list) else sv
            mean_abs = (
                pd.Series(np.abs(sv_arr).mean(axis=0), index=feature_names)
                .sort_values(ascending=False)
            )
            shap_data      = {"mean_abs": mean_abs}
            shap_explainer = explainer
            print("   ✅ SHAP done.")
        except Exception as ex:
            print(f"   ⚠️  SHAP failed: {ex}")

    # ── Calibration ──────────────────────────────────────────────────────
    y_prob_best = np.array(model_results[best_name]["y_prob"])
    y_test_arr  = np.array(model_results[best_name]["y_test"])
    prob_true, prob_pred = calibration_curve(
        y_test_arr, y_prob_best, n_bins=10, strategy="uniform"
    )
    calibration = {
        "prob_pred": prob_pred.tolist(),
        "prob_true": prob_true.tolist(),
    }

    # ── Threshold analysis ────────────────────────────────────────────────
    threshold_analysis = compute_threshold_analysis(y_test_arr, y_prob_best)

    # ── Bundle & save ────────────────────────────────────────────────────
    arts = {
        "best_name":          best_name,
        "best_model":         best_model,
        "model_results":      model_results,
        "feature_names":      feature_names,
        "encoders":           encoders,
        "feature_importance": fi,
        "shap_data":          shap_data,
        "shap_explainer":     shap_explainer,
        "eda":                eda,
        "calibration":        calibration,
        "threshold_analysis": threshold_analysis,
    }

    os.makedirs(output_dir, exist_ok=True)
    out_path = os.path.join(output_dir, "model.pkl")
    with open(out_path, "wb") as fh:
        pickle.dump(arts, fh)
    print(f"\n✅ Artifacts saved → {out_path}")
    return arts


# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    data_path = sys.argv[1] if len(sys.argv) > 1 else "data/FraudShield_Banking_Data.csv"
    train(data_path)