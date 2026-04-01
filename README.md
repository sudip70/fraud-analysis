# 🛡️ FraudShield — End-to-End Fraud Detection System

A cohesive, portfolio-ready data science project combining **exploratory analysis**, **ML model comparison**, and a **live fraud scoring app** — all built on a single real-world banking dataset.

---

## What This Project Covers

| Role | What's demonstrated |
|---|---|
| **Data Analyst** | EDA dashboard — fraud by transaction type, merchant, city, hour, prior history |
| **Data Scientist** | ML pipeline — class imbalance handling, 3-model comparison, ROC/PR curves, feature importance |
| **AI / ML Engineer** | Live scoring API logic — real-time inference, risk tier, plain-English explanation |

---

## Project Structure

```
fraudshield/
├── app.py                  # Streamlit dashboard (all 3 tabs)
├── src/
│   └── pipeline.py         # Feature engineering, preprocessing, training
├── models/                 # Auto-created on first run (saved artifacts)
├── requirements.txt
└── README.md
```

---

## Quick Start

### 1. Clone & install
```bash
pip install -r requirements.txt
```

### 2. Place your dataset
Put `FraudShield_Banking_Data.csv` in the root `fraudshield/` folder.

### 3. Run the app
```bash
streamlit run app.py
```

The model trains automatically on first launch (~60 seconds). Artifacts are cached in `models/` so subsequent runs are instant.

### 4. (Optional) Pre-train the model separately
```bash
python src/pipeline.py FraudShield_Banking_Data.csv
```

---

## Dataset

**FraudShield Banking Data** — 50,000 financial transactions with 25 features:

- **Transaction info**: amount, type (Online/ATM/POS), time, date, merchant category
- **Customer profile**: home location, card type, account balance, transaction history
- **Behavioral signals**: daily/weekly tx count, failed transactions, prior fraud count
- **Risk flags**: international transaction, new merchant, unusual time, distance from home
- **Target**: `Fraud_Label` — `Normal` (95.2%) vs `Fraud` (4.8%)

---

## ML Pipeline

### Feature Engineering
Beyond raw features, the pipeline engineers:
- `Amount_vs_Avg` — how far this transaction deviates from the customer's average
- `Amount_vs_Max24h` — spike ratio vs last 24h maximum
- `Balance_vs_Amount` — account capacity context
- `Location_Mismatch` — binary flag: transaction city ≠ home city
- `Risk_Flag_Count` — composite count of active risk signals
- Hour, day-of-week, weekend flag from timestamps

### Handling Class Imbalance
With only ~4.8% fraud cases, accuracy is misleading. The pipeline uses:
- **Class weighting** (sklearn `compute_class_weight`) — penalises misclassifying fraud
- **Evaluation on PR-AUC** — not accuracy — because PR-AUC reflects performance on the minority class

### Models Compared
| Model | Notes |
|---|---|
| Random Forest | Ensemble of decision trees, handles non-linearity well |
| Gradient Boosting | Sequential boosting, strong on tabular data |
| Logistic Regression | Interpretable baseline |

Best model selected by ROC-AUC and deployed to the live scorer.

---

## App Tabs

### 📊 Exploratory Analysis
- Fraud rate by: transaction type, merchant category, city, hour of day
- Amount distribution: fraud vs normal
- Impact of prior fraud history on risk

### 🤖 Model Performance
- Side-by-side model comparison table (ROC-AUC, PR-AUC, F1, Precision, Recall)
- ROC curve overlay
- Precision-Recall curve overlay
- Confusion matrix of best model
- Top 12 feature importances
- Full classification report

### 🎯 Live Fraud Scorer
- Input any transaction via form
- Instant fraud probability (0–100%)
- Risk tier: LOW / MEDIUM / HIGH
- Plain-English breakdown of which signals drove the score

---

## Key Findings

1. **International + New Merchant** is the highest-risk combination
2. **Late-night transactions** (22:00–02:00) have elevated fraud rates
3. **Previous_Fraud_Count** is the strongest single predictor
4. **Distance from home** correlates strongly with fraud likelihood
5. **Failed transactions in session** is a behavioural red flag

---

## Skills Demonstrated

`Python` · `pandas` · `scikit-learn` · `matplotlib` · `seaborn` · `Streamlit`  
`Feature Engineering` · `Imbalanced Classification` · `Model Evaluation`  
`Data Visualisation` · `ML Deployment` · `End-to-End Pipeline`

---

*Built as a portfolio project for Data Science / Data Analyst / AI Engineer roles.*
