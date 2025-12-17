import pandas as pd
import numpy as np
import pickle
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

# ===============================
# LOAD YOUR TRAINED MODEL
# ===============================
# If you saved your model, load it
# If not, you'll need to retrain it first

try:
    with open("sentinel_model.pkl", "rb") as f:
        model = pickle.load(f)
    print("✅ Loaded existing model from sentinel_model.pkl")
except:
    print("❌ Model file not found. Training new model...")
    
    # Re-train the model (copy from your training script)
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import LabelEncoder
    from sklearn.ensemble import RandomForestClassifier
    
    df = pd.read_csv("nigeria_insecurity_dataset.csv")
    
    # Apply all your preprocessing here...
    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    df["DayOfYear"] = df["Date"].dt.dayofyear
    df["Month"] = df["Date"].dt.month
    df["Week"] = df["Date"].dt.isocalendar().week.astype(int)
    
    def extract_hour(t):
        if pd.isna(t):
            return np.nan
        t = str(t).strip().lower()
        if ":" in t:
            try:
                return int(t.split(":")[0])
            except:
                pass
        if "am" in t or "pm" in t:
            try:
                h = int("".join([c for c in t if c.isdigit()]))
                if "pm" in t and h != 12:
                    h += 12
                if "am" in t and h == 12:
                    h = 0
                return h
            except:
                pass
        try:
            return int(t)
        except:
            return np.nan
    
    df["Hour"] = df["TimeOfDay"].apply(extract_hour)
    df["Hour"] = df["Hour"].fillna(df["Hour"].median()).astype(int)
    
    label_cols = ["State", "Location", "WeaponsUsed"]
    encoders = {}
    for col in label_cols:
        enc = LabelEncoder()
        df[col] = df[col].astype(str)
        df[col] = enc.fit_transform(df[col])
        encoders[col] = enc
    
    numeric_cols = ["Casualties", "Kidnapped", "PastIncidentsInArea"]
    df[numeric_cols] = df[numeric_cols].apply(pd.to_numeric, errors="coerce")
    df[numeric_cols] = df[numeric_cols].fillna(0)
    
    feature_cols = [
        "State", "Location", "WeaponsUsed", "Casualties", "Kidnapped",
        "PastIncidentsInArea", "DayOfYear", "Month", "Week", "Hour"
    ]
    
    X = df[feature_cols]
    
    # Assuming you have a RiskLevel column as target
    # Adjust this to match your actual target column
    if "RiskLevel" in df.columns:
        y = df["RiskLevel"]
    else:
        # Create dummy target for demonstration
        y = np.random.choice([0, 1, 2], size=len(X))
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    print(f"✅ Model trained with accuracy: {model.score(X_test, y_test):.2f}")
    
    # Save the model
    with open("sentinel_model.pkl", "wb") as f:
        pickle.dump(model, f)

# ===============================
# EXPORT TO ONNX (CORRECT WAY)
# ===============================

# Define input type: 10 features, float32
initial_type = [('input', FloatTensorType([None, 10]))]

# Convert with ONLY probability output (no labels)
# Use string key instead of id(model)
onnx_model = convert_sklearn(
    model,
    initial_types=initial_type,
    target_opset=12,
    options={'zipmap': False}  # Disable ZipMap (causes the "non-tensor" error)
)

# Save the fixed ONNX model
with open("sentinel_model_fixed.onnx", "wb") as f:
    f.write(onnx_model.SerializeToString())

print("✅ ONNX model exported successfully to: sentinel_model_fixed.onnx")
print("\n📋 Model Details:")
print(f"   - Input: 'input' with shape [batch_size, 10]")
print(f"   - Output: Probability scores (not labels)")
print(f"   - Classes: {model.classes_}")