import pandas as pd
import numpy as np
from ctgan import TVAE
from faker import Faker

fake = Faker()

# ----------------------------
# 1. LOAD DATA
# ----------------------------
df = pd.read_csv("data/FraudShield_Banking_Data.csv")

# ----------------------------
# 2. CLEAN LABELS
# ----------------------------
df["Fraud_Label"] = df["Fraud_Label"].replace({
    "Norm.": "Normal",
    "Normal": "Normal",
    "Fraud": "Fraud"
})

# ----------------------------
# 3. BINARY CONVERSION
# ----------------------------
binary_cols = [
    "Is_International_Transaction",
    "Is_New_Merchant",
    "Unusual_Time_Transaction"
]

for col in binary_cols:
    df[col] = df[col].map({"Yes": 1, "No": 0})

# ----------------------------
# 4. DATE FEATURE ENGINEERING
# ----------------------------
df["Transaction_Date"] = pd.to_datetime(df["Transaction_Date"], errors="coerce")

df["Transaction_Day"] = df["Transaction_Date"].dt.day
df["Transaction_Month"] = df["Transaction_Date"].dt.month

df = df.drop(columns=["Transaction_Date"])

# ----------------------------
# 5. HANDLE NULLS
# ----------------------------
numeric_cols = df.select_dtypes(include=["float64", "int64"]).columns
categorical_cols = df.select_dtypes(include=["object"]).columns

for col in numeric_cols:
    df[col] = df[col].fillna(df[col].median())

for col in categorical_cols:
    df[col] = df[col].fillna(df[col].mode()[0])

print("✅ Null values handled")

# ----------------------------
# 6. DROP HEAVY COLS
# ----------------------------
df = df.drop(columns=[
    "Transaction_ID",
    "Customer_ID",
    "Device_ID",
    "IP_Address"
])

# ----------------------------
# 7. TIME FEATURE
# ----------------------------
df["Transaction_Hour"] = df["Transaction_Time"].str.split(":").str[0].astype(int)
df = df.drop(columns=["Transaction_Time"])

# ----------------------------
# 8. SAMPLE DATA
# ----------------------------
df = df.sample(n=20000, random_state=42)

# ----------------------------
# 9. CATEGORICAL COLUMNS
# ----------------------------
categorical_cols = [
    "Transaction_Type",
    "Merchant_Category",
    "Transaction_Location",
    "Customer_Home_Location",
    "Card_Type",
    "Fraud_Label"
]

# ----------------------------
# 10. TRAIN TVAE
# ----------------------------
model = TVAE(
    epochs=100,
    batch_size=64
)

model.fit(df, discrete_columns=categorical_cols)

# ----------------------------
# 11. GENERATE DATA
# ----------------------------
num_samples = 1_000_000
synthetic = model.sample(num_samples)

# ----------------------------
# 12. LOCATION FIX (NA + EUROPE ONLY)
# ----------------------------
locations = [
    "New York", "Toronto", "Los Angeles", "Chicago",
    "Vancouver", "Montreal", "Dallas", "San Francisco",
    "Calgary", "Detroit", "Miami", "Atlanta", "Seattle",
    "Denver", "Boston", "Phoenix",
    "London", "Paris", "Berlin", "Madrid",
    "Rome", "Amsterdam", "Dublin", "Zurich",
    "Vienna", "Brussels", "Copenhagen",
    "Stockholm", "Oslo", "Helsinki", "Lisbon"
]

synthetic["Transaction_Location"] = np.random.choice(locations, num_samples)
synthetic["Customer_Home_Location"] = np.random.choice(locations, num_samples)

# ----------------------------
# 13. REGENERATE IPs
# ----------------------------
synthetic["IP_Address"] = [fake.ipv4_public() for _ in range(num_samples)]

# ----------------------------
# 14. FRAUD LOGIC
# ----------------------------
def inject_fraud_patterns(row):
    score = 0

    if row["Transaction_Amount (in Million)"] > 7:
        score += 2
    if row["Distance_From_Home"] > 300:
        score += 2
    if row["Unusual_Time_Transaction"] == 1:
        score += 1
    if row["Is_International_Transaction"] == 1:
        score += 1
    if row["Is_New_Merchant"] == 1:
        score += 1

    score += np.random.normal(0, 0.5)

    return "Fraud" if score > 3 else "Normal"

synthetic["Fraud_Label"] = synthetic.apply(inject_fraud_patterns, axis=1)

# ----------------------------
# 15. FRAUD RATIO CONTROL
# ----------------------------
fraud_ratio = 0.04

fraud_df = synthetic[synthetic["Fraud_Label"] == "Fraud"]
normal_df = synthetic[synthetic["Fraud_Label"] == "Normal"]

desired_fraud = int(fraud_ratio * num_samples)

fraud_sampled = fraud_df.sample(n=desired_fraud, replace=True)
normal_sampled = normal_df.sample(
    n=num_samples - desired_fraud, replace=True
)

final_df = pd.concat([fraud_sampled, normal_sampled]).sample(frac=1)

# ----------------------------
# 16. RESTORE Yes/No
# ----------------------------
for col in binary_cols:
    final_df[col] = final_df[col].map({1: "Yes", 0: "No"})

# ----------------------------
# 17. FIX INTEGER TYPES
# ----------------------------
int_cols = [
    "Daily_Transaction_Count",
    "Weekly_Transaction_Count",
    "Failed_Transaction_Count"
]

for col in int_cols:
    if col in final_df.columns:
        final_df[col] = final_df[col].astype(int)

# ----------------------------
# 18. 🔥 CRITICAL FIXES FOR PIPELINE
# ----------------------------

# Recreate Transaction_Time
final_df["Transaction_Time"] = final_df["Transaction_Hour"].apply(
    lambda x: f"{int(x):02d}:{np.random.randint(0,60):02d}"
)

# Recreate Transaction_Date (STRING but parseable)
final_df["Transaction_Date"] = pd.to_datetime({
    "year": 2025,
    "month": final_df["Transaction_Month"],
    "day": final_df["Transaction_Day"]
}, errors="coerce").dt.strftime("%Y-%m-%d")

# ----------------------------
# 19. SAVE
# ----------------------------
final_df.to_csv("data/synthetic_fraud_data.csv", index=False)

print("✅ Done! Synthetic dataset generated.")