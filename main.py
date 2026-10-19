
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
import pandas as pd
import joblib
import numpy as np
import warnings 
warnings.filterwarnings('ignore')

app = FastAPI(
    title="Telco Customer Churn Prediction API",
    description="Predict whether a telecom customer is likely to churn.",
    version="1.0.0"
)

# Allow frontend requests during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load your trained pipeline
model = joblib.load("GMODEL.pkl")

# Pydantic input validation
class CustomerFeatures(BaseModel):
    model_config = ConfigDict(extra="forbid")

    gender: str = Field(..., description="Male or Female")
    SeniorCitizen: int = Field(..., ge=0, le=1)
    Partner: str
    Dependents: str
    tenure: int = Field(..., ge=0, le=1000)

    PhoneService: str
    MultipleLines: str
    InternetService: str
    OnlineSecurity: str
    OnlineBackup: str
    DeviceProtection: str
    TechSupport: str
    StreamingTV: str
    StreamingMovies: str

    Contract: str
    PaperlessBilling: str
    PaymentMethod: str

    MonthlyCharges: float = Field(..., ge=0)
    TotalCharges: float = Field(..., ge=0)


@app.get("/")
def home():
    return {
        "message": "Telco Customer Churn Prediction API is running"
    }


@app.post("/predict")
def predict(customer: CustomerFeatures):

    try:
        # Convert validated input into a DataFrame
        data = customer.model_dump()

        # Keep the exact feature names and order
        columns = [
            "gender",
            "SeniorCitizen",
            "Partner",
            "Dependents",
            "tenure",
            "PhoneService",
            "MultipleLines",
            "InternetService",
            "OnlineSecurity",
            "OnlineBackup",
            "DeviceProtection",
            "TechSupport",
            "StreamingTV",
            "StreamingMovies",
            "Contract",
            "PaperlessBilling",
            "PaymentMethod",
            "MonthlyCharges",
            "TotalCharges",
        ]

        input_df = pd.DataFrame([data], columns=columns)

        # Run prediction through the complete pipeline
        prediction = int(model.predict(input_df)[0])

        # Probability of class 1, if supported
        probability = None

        if hasattr(model, "predict_proba"):
            probabilities = model.predict_proba(input_df)[0]
            classes = list(model.classes_)

            if 1 in classes:
                probability = float(
                    probabilities[classes.index(1)]
                )

        return {
            "prediction": prediction,
            "churn": "Yes" if prediction == 1 else "No",
            "churn_probability": probability,
            "message": (
                "Customer is likely to churn"
                if prediction == 1
                else "Customer is unlikely to churn"
            )
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )
