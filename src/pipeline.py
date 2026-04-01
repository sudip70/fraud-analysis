"""
FraudShield ML Pipeline
-----------------------
Trains a fraud detection model using Random Forest + class balancing.
Saves model artifacts for use in the Streamlit app.
"""

import pandas as pd
import numpy as np
import pickle
import os
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import (
    classification_report, confusion_matrix,
    roc_auc_score, average_precision_score,
    precision_recall_curve, roc_curve
)
from sklearn.utils.class_weight import compute_class_weight
import warnings
warnings.filterwarnings("ignore")


# ── Feature Engineering ──────────────────────────────────────────────────────

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # Parse time → hour of day
    df["Hour"] = pd.to_datetime(df["Transaction_Time"], format="%H:%M", errors="coerce").dt.hour

    # Parse date features
    df["Transaction_Date"] = pd.to_datetime(df["Transaction_Date"], errors="coerce")
    df["DayOfWeek"]  = df["Transaction_Date"].dt.dayofweek   # 0=Mon
    df["Month"]      = df["Transaction_Date"].dt.month
    df["IsWeekend"]  = (df["DayOfWeek"] >= 5).astype(int)

    # Amount vs average ratio  (how anomalous is this transaction?)
    df["Amount_vs_Avg"] = (
        df["Transaction_Amount (in Million)"] /
        (df["Avg_Transaction_Amount (in Million)"] + 1e-9)
    )

    # Amount vs max in last 24h
    df["Amount_vs_Max24h"] = (
        df["Transaction_Amount (in Million)"] /
        (df["Max_Transaction_Last_24h (in Million)"] + 1e-9)
    )

    # Balance-to-amount ratio
    df["Balance_vs_Amount"] = (
        df["Account_Balance (in Million)"] /
        (df["Transaction_Amount (in Million)"] + 1e-9)
    )

    # Location mismatch flag
    df["Location_Mismatch"] = (
        df["Transaction_Location"] != df["Customer_Home_Location"]
    ).astype(int)

    # Risk flag composite
    df["Risk_Flag_Count"] = (
        (df["Is_International_Transaction"] == "Yes").astype(int) +
        (df["Is_New_Merchant"] == "Yes").astype(int) +
        (df["Unusual_Time_Transaction"] == "Yes").astype(int) +
        df["Location_Mismatch"]
    )

    return df


# ── Preprocessing ─────────────────────────────────────────────────────────────

NUMERIC_FEATURES = [
    "Transaction_Amount (in Million)",
    "Distance_From_Home",
    "Account_Balance (in Million)",
    "Daily_Transaction_Count",
    "Weekly_Transaction_Count",
    "Avg_Transaction_Amount (in Million)",
    "Max_Transaction_Last_24h (in Million)",
    "Failed_Transaction_Count",
    "Previous_Fraud_Count",
    "Hour",
    "DayOfWeek",
    "Month",
    "IsWeekend",
    "Amount_vs_Avg",
    "Amount_vs_Max24h",
    "Balance_vs_Amount",
    "Location_Mismatch",
    "Risk_Flag_Count",
]

CATEGORICAL_FEATURES = [
    "Transaction_Type",
    "Merchant_Category",
    "Card_Type",
    "Is_International_Transaction",
    "Is_New_Merchant",
    "Unusual_Time_Transaction",
]

TARGET = "Fraud_Label"


def preprocess(df: pd.DataFrame, encoders: dict = None, fit: bool = True):
    df = engineer_features(df)

    # Encode categoricals
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
                lambda x: x if x in le.classes_ else "Unknown"
            )
        )
        cat_encoded.append(pd.Series(encoded, name=col, index=df.index))

    X = pd.concat(
        [df[NUMERIC_FEATURES].fillna(df[NUMERIC_FEATURES].median())]
        + cat_encoded,
        axis=1,
    )

    if fit:
        y = (df[TARGET].fillna("Normal") == "Fraud").astype(int)
        return X, y, encoders
    else:
        return X


# ── Training ──────────────────────────────────────────────────────────────────

def train(data_path: str, output_dir: str = "models"):
    print("📂 Loading data...")
    df = pd.read_csv(data_path)
    df = df.dropna(subset=[TARGET])
    print(f"   {len(df):,} rows | Fraud rate: {(df[TARGET]=='Fraud').mean():.2%}")

    print("\n🔧 Preprocessing & feature engineering...")
    X, y, encoders = preprocess(df, fit=True)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Class weights for imbalance
    classes = np.array([0, 1])
    weights = compute_class_weight("balanced", classes=classes, y=y_train)
    class_weight = {0: weights[0], 1: weights[1]}
    print(f"   Class weights → Normal: {weights[0]:.2f} | Fraud: {weights[1]:.2f}")

    # ── Model comparison ──
    print("\n🏋️  Training models...")
    models = {
        "Random Forest":      RandomForestClassifier(
            n_estimators=200, max_depth=12, class_weight=class_weight,
            random_state=42, n_jobs=-1
        ),
        "Gradient Boosting":  GradientBoostingClassifier(
            n_estimators=150, max_depth=5, learning_rate=0.1,
            random_state=42
        ),
        "Logistic Regression": LogisticRegression(
            class_weight=class_weight, max_iter=1000, random_state=42
        ),
    }

    results = {}
    for name, model in models.items():
        model.fit(X_train, y_train)
        y_prob = model.predict_proba(X_test)[:, 1]
        y_pred = model.predict(X_test)
        results[name] = {
            "model":    model,
            "roc_auc":  roc_auc_score(y_test, y_prob),
            "pr_auc":   average_precision_score(y_test, y_prob),
            "report":   classification_report(y_test, y_pred, output_dict=True),
            "cm":       confusion_matrix(y_test, y_pred).tolist(),
            "y_prob":   y_prob.tolist(),
            "y_test":   y_test.tolist(),
        }
        print(f"   {name}: ROC-AUC={results[name]['roc_auc']:.4f}  PR-AUC={results[name]['pr_auc']:.4f}")

    best_name = max(results, key=lambda k: results[k]["roc_auc"])
    best_model = results[best_name]["model"]
    print(f"\n🏆 Best model: {best_name}")

    # Feature importance
    if hasattr(best_model, "feature_importances_"):
        fi = pd.DataFrame({
            "feature":    X.columns,
            "importance": best_model.feature_importances_,
        }).sort_values("importance", ascending=False)
    else:
        fi = pd.DataFrame({"feature": X.columns, "importance": np.zeros(len(X.columns))})

    # EDA stats (pre-computed for dashboard)
    eda = compute_eda(df)

    # Save artifacts
    os.makedirs(output_dir, exist_ok=True)
    artifacts = {
        "best_model":       best_model,
        "best_name":        best_name,
        "encoders":         encoders,
        "feature_names":    list(X.columns),
        "feature_importance": fi,
        "model_results":    {k: {kk: vv for kk, vv in v.items() if kk != "model"}
                             for k, v in results.items()},
        "X_test":           X_test,
        "y_test":           y_test,
        "eda":              eda,
    }

    with open(os.path.join(output_dir, "artifacts.pkl"), "wb") as f:
        pickle.dump(artifacts, f)

    print(f"\n✅ Artifacts saved to {output_dir}/artifacts.pkl")
    return artifacts


# ── EDA Pre-computation ───────────────────────────────────────────────────────

def compute_eda(df: pd.DataFrame) -> dict:
    df = df.copy()
    df["Is_Fraud"] = (df["Fraud_Label"] == "Fraud").astype(int)

    eda = {}

    # Overall stats
    eda["total_transactions"] = len(df)
    eda["total_fraud"]        = int(df["Is_Fraud"].sum())
    eda["fraud_rate"]         = float(df["Is_Fraud"].mean())
    eda["total_amount"]       = float(df["Transaction_Amount (in Million)"].sum())

    # Fraud by Transaction_Type
    eda["fraud_by_type"] = (
        df.groupby("Transaction_Type")["Is_Fraud"].agg(["sum", "mean", "count"])
        .rename(columns={"sum": "fraud_count", "mean": "fraud_rate", "count": "total"})
        .reset_index().to_dict("records")
    )

    # Fraud by Merchant_Category
    eda["fraud_by_merchant"] = (
        df.groupby("Merchant_Category")["Is_Fraud"].agg(["sum", "mean", "count"])
        .rename(columns={"sum": "fraud_count", "mean": "fraud_rate", "count": "total"})
        .reset_index().to_dict("records")
    )

    # Fraud by Card_Type
    eda["fraud_by_card"] = (
        df.groupby("Card_Type")["Is_Fraud"].agg(["sum", "mean", "count"])
        .rename(columns={"sum": "fraud_count", "mean": "fraud_rate", "count": "total"})
        .reset_index().to_dict("records")
    )

    # Fraud by Location
    eda["fraud_by_location"] = (
        df.groupby("Transaction_Location")["Is_Fraud"].agg(["sum", "mean", "count"])
        .rename(columns={"sum": "fraud_count", "mean": "fraud_rate", "count": "total"})
        .reset_index().sort_values("fraud_rate", ascending=False).to_dict("records")
    )

    # Fraud by International
    eda["fraud_by_international"] = (
        df.groupby("Is_International_Transaction")["Is_Fraud"].agg(["sum", "mean", "count"])
        .rename(columns={"sum": "fraud_count", "mean": "fraud_rate", "count": "total"})
        .reset_index().to_dict("records")
    )

    # Fraud by New Merchant
    eda["fraud_by_new_merchant"] = (
        df.groupby("Is_New_Merchant")["Is_Fraud"].agg(["sum", "mean", "count"])
        .rename(columns={"sum": "fraud_count", "mean": "fraud_rate", "count": "total"})
        .reset_index().to_dict("records")
    )

    # Amount distribution by fraud label
    eda["amount_normal"] = df[df["Is_Fraud"]==0]["Transaction_Amount (in Million)"].tolist()
    eda["amount_fraud"]  = df[df["Is_Fraud"]==1]["Transaction_Amount (in Million)"].tolist()

    # Distance distribution
    eda["distance_normal"] = df[df["Is_Fraud"]==0]["Distance_From_Home"].dropna().tolist()
    eda["distance_fraud"]  = df[df["Is_Fraud"]==1]["Distance_From_Home"].dropna().tolist()

    # Hour-level fraud (parse time)
    df["Hour"] = pd.to_datetime(df["Transaction_Time"], format="%H:%M", errors="coerce").dt.hour
    eda["fraud_by_hour"] = (
        df.groupby("Hour")["Is_Fraud"].agg(["sum", "mean"])
        .rename(columns={"sum": "fraud_count", "mean": "fraud_rate"})
        .reset_index().to_dict("records")
    )

    # Previous fraud count correlation
    eda["fraud_by_prev_fraud"] = (
        df.groupby("Previous_Fraud_Count")["Is_Fraud"].agg(["sum", "mean", "count"])
        .rename(columns={"sum": "fraud_count", "mean": "fraud_rate", "count": "total"})
        .reset_index().to_dict("records")
    )

    return eda


if __name__ == "__main__":
    import sys
    data_path = sys.argv[1] if len(sys.argv) > 1 else "FraudShield_Banking_Data.csv"
    train(data_path, output_dir="models")
