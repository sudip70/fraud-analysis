"""
FraudShield ML Pipeline (with Progress Bars)
"""

import pandas as pd
import numpy as np
import pickle
import os
import warnings
from tqdm import tqdm

from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    classification_report, confusion_matrix,
    roc_auc_score, average_precision_score,
    precision_score, recall_score, f1_score,
    brier_score_loss,
)
from sklearn.calibration import calibration_curve
from sklearn.utils.class_weight import compute_class_weight

warnings.filterwarnings("ignore")

# ── SHAP (optional) ─────────────────────────────────────────────────────────
try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False
    print("⚠️ shap not installed — explainability disabled")


# ══════════════════════════════════════════════════════════════════════════════
# FEATURE ENGINEERING
# ══════════════════════════════════════════════════════════════════════════════

def engineer_features(df):
    df = df.copy()

    df["Hour"] = pd.to_datetime(df["Transaction_Time"], format="%H:%M", errors="coerce").dt.hour
    df["Transaction_Date"] = pd.to_datetime(df["Transaction_Date"], errors="coerce")

    df["DayOfWeek"] = df["Transaction_Date"].dt.dayofweek
    df["Month"] = df["Transaction_Date"].dt.month
    df["IsWeekend"] = (df["DayOfWeek"] >= 5).astype(int)
    df["IsNight"] = ((df["Hour"] >= 22) | (df["Hour"] <= 5)).astype(int)

    df["Amount_vs_Avg"] = df["Transaction_Amount (in Million)"] / (df["Avg_Transaction_Amount (in Million)"] + 1e-9)
    df["Amount_vs_Max24h"] = df["Transaction_Amount (in Million)"] / (df["Max_Transaction_Last_24h (in Million)"] + 1e-9)
    df["Balance_vs_Amount"] = df["Account_Balance (in Million)"] / (df["Transaction_Amount (in Million)"] + 1e-9)
    df["Spend_Ratio"] = (df["Transaction_Amount (in Million)"] / (df["Account_Balance (in Million)"] + 1e-9)).clip(0, 10)

    df["Location_Mismatch"] = (df["Transaction_Location"] != df["Customer_Home_Location"]).astype(int)

    df["Tx_Velocity_Ratio"] = (
        df["Daily_Transaction_Count"] /
        (df["Weekly_Transaction_Count"] / 7 + 1e-9)
    ).clip(0, 10)

    df["Risk_Flag_Count"] = (
        (df["Is_International_Transaction"] == "Yes").astype(int) +
        (df["Is_New_Merchant"] == "Yes").astype(int) +
        (df["Unusual_Time_Transaction"] == "Yes").astype(int) +
        df["Location_Mismatch"] +
        (df["Failed_Transaction_Count"] > 0).astype(int) +
        (df["Previous_Fraud_Count"] > 0).astype(int)
    )

    return df


NUMERIC_FEATURES = [
    "Transaction_Amount (in Million)", "Distance_From_Home",
    "Account_Balance (in Million)", "Daily_Transaction_Count",
    "Weekly_Transaction_Count", "Avg_Transaction_Amount (in Million)",
    "Max_Transaction_Last_24h (in Million)", "Failed_Transaction_Count",
    "Previous_Fraud_Count", "Hour", "DayOfWeek", "Month",
    "IsWeekend", "IsNight", "Amount_vs_Avg", "Amount_vs_Max24h",
    "Balance_vs_Amount", "Spend_Ratio", "Location_Mismatch",
    "Tx_Velocity_Ratio", "Risk_Flag_Count"
]

CATEGORICAL_FEATURES = [
    "Transaction_Type", "Merchant_Category", "Card_Type",
    "Is_International_Transaction", "Is_New_Merchant",
    "Unusual_Time_Transaction"
]

TARGET = "Fraud_Label"


# ══════════════════════════════════════════════════════════════════════════════
# PREPROCESS
# ══════════════════════════════════════════════════════════════════════════════

def preprocess(df, encoders=None, fit=True):
    df = engineer_features(df)

    if fit:
        encoders = {}

    cat_encoded = []
    for col in CATEGORICAL_FEATURES:
        if fit:
            le = LabelEncoder()
            le.fit(df[col].fillna("Unknown").astype(str))
            encoders[col] = le

        le = encoders[col]
        encoded = le.transform(
            df[col].fillna("Unknown").astype(str).map(
                lambda x: x if x in le.classes_ else le.classes_[0]
            )
        )
        cat_encoded.append(pd.Series(encoded, name=col))

    X = pd.concat(
        [df[NUMERIC_FEATURES].fillna(df[NUMERIC_FEATURES].median())] + cat_encoded,
        axis=1
    )

    if fit:
        y = (df[TARGET] == "Fraud").astype(int)
        return X, y, encoders
    else:
        return X


# ══════════════════════════════════════════════════════════════════════════════
# CROSS VALIDATION WITH PROGRESS
# ══════════════════════════════════════════════════════════════════════════════

def _cv_roc_auc(model, X, y, class_weight, n_splits=5, needs_sample_weight=False):
    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    scores = []

    for tr_idx, va_idx in tqdm(skf.split(X, y), total=n_splits, desc="   CV folds"):
        Xtr, Xva = X.iloc[tr_idx], X.iloc[va_idx]
        ytr, yva = y.iloc[tr_idx], y.iloc[va_idx]

        if needs_sample_weight:
            sw = np.where(ytr == 1, class_weight[1], class_weight[0])
            model.fit(Xtr, ytr, sample_weight=sw)
        else:
            model.fit(Xtr, ytr)

        scores.append(roc_auc_score(yva, model.predict_proba(Xva)[:, 1]))

    return float(np.mean(scores)), float(np.std(scores))


# ══════════════════════════════════════════════════════════════════════════════
# TRAIN
# ══════════════════════════════════════════════════════════════════════════════

def train(data_path, output_dir="models"):
    print("📂 Loading data...")
    df = pd.read_csv(data_path)
    print(f"{len(df):,} rows | Fraud rate: {(df[TARGET]=='Fraud').mean():.2%}")

    print("\n🔧 Preprocessing...")
    X, y, encoders = preprocess(df, fit=True)

    # 🔥 Optional speed optimization
    if len(X) > 200_000:
        X = X.sample(200_000, random_state=42)
        y = y.loc[X.index]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, stratify=y, test_size=0.2, random_state=42
    )

    weights = compute_class_weight("balanced", classes=np.array([0,1]), y=y_train)
    class_weight = {0: weights[0], 1: weights[1]}

    model_defs = {
        "Random Forest": (RandomForestClassifier(n_estimators=150, max_depth=10, class_weight=class_weight), False),
        "Gradient Boosting": (GradientBoostingClassifier(), True),
        "Logistic Regression": (LogisticRegression(max_iter=1000, class_weight=class_weight), False),
    }

    print("\n🏋️ Training Models...")
    results = {}

    for name, (model, needs_sw) in tqdm(model_defs.items(), total=len(model_defs), desc="Models"):
        if needs_sw:
            sw = np.where(y_train == 1, weights[1], weights[0])
            model.fit(X_train, y_train, sample_weight=sw)
        else:
            model.fit(X_train, y_train)

        y_prob = model.predict_proba(X_test)[:, 1]

        cv_mean, cv_std = _cv_roc_auc(
            model.__class__(**model.get_params()),
            X_train, y_train, class_weight,
            needs_sample_weight=needs_sw
        )

        results[name] = {
            "model": model,
            "roc_auc": roc_auc_score(y_test, y_prob),
            "cv_mean": cv_mean
        }

        print(f"{name}: ROC={results[name]['roc_auc']:.4f}")

    best_name = max(results, key=lambda k: results[k]["roc_auc"])
    best_model = results[best_name]["model"]

    print(f"\n🏆 Best Model: {best_name}")

    # ── SHAP (with visual progress wrapper) ───────────────────────────────
    if SHAP_AVAILABLE:
        print("\n🔬 Computing SHAP...")
        for _ in tqdm(range(1), desc="   SHAP"):
            sample = X_test.sample(min(500, len(X_test)))
            explainer = shap.Explainer(best_model, X_train)
            shap_values = explainer(sample)

    os.makedirs(output_dir, exist_ok=True)
    with open(os.path.join(output_dir, "model.pkl"), "wb") as f:
        pickle.dump(best_model, f)

    print("\n✅ Training complete")


# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import sys
    data_path = sys.argv[1] if len(sys.argv) > 1 else "synthetic_fraud_data.csv"
    train(data_path)