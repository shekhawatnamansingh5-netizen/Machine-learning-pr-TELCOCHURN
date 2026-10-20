// ChurnLens frontend — connects to the FastAPI endpoint.
// For local development use http://127.0.0.1:8000.
// For deployment, replace this with your public FastAPI base URL.
const API_BASE_URL = "https://machine-learning-pr-telcochurn-rv4p.onrender.com";
const PREDICT_URL = `${API_BASE_URL}/predict`;
const HEALTH_URL = `${API_BASE_URL}/`;

const form = document.getElementById("predictForm");
const predictBtn = document.getElementById("predictBtn");
const formError = document.getElementById("formError");
const resultEmpty = document.getElementById("resultEmpty");
const resultContent = document.getElementById("resultContent");
const apiStatus = document.getElementById("apiStatus");
const resultBadge = document.getElementById("resultBadge");

const sample = {
  gender: "Female",
  SeniorCitizen: "0",
  Partner: "Yes",
  Dependents: "No",
  tenure: "12",
  PhoneService: "Yes",
  MultipleLines: "No",
  InternetService: "Fiber optic",
  OnlineSecurity: "No",
  OnlineBackup: "Yes",
  DeviceProtection: "No",
  TechSupport: "No",
  StreamingTV: "Yes",
  StreamingMovies: "Yes",
  Contract: "Month-to-month",
  PaperlessBilling: "Yes",
  PaymentMethod: "Electronic check",
  MonthlyCharges: "85.45",
  TotalCharges: "1025.40"
};

document.getElementById("exampleBtn").addEventListener("click", () => {
  for (const [key, value] of Object.entries(sample)) {
    const field = form.elements.namedItem(key);
    if (field) field.value = value;
  }
  updateTenure();
  formError.textContent = "";
});

document.getElementById("tenure").addEventListener("input", updateTenure);
function updateTenure() {
  const value = Number(document.getElementById("tenure").value);
  document.getElementById("tenureReadout").textContent =
    `${value} month${value === 1 ? "" : "s"}`;
}

function setLoading(loading) {
  predictBtn.disabled = loading;
  predictBtn.classList.toggle("loading", loading);
  predictBtn.querySelector(".button-label").textContent =
    loading ? "Analyzing customer…" : "Analyze churn risk";
}

function payloadFromForm() {
  const fd = new FormData(form);
  return {
    gender: fd.get("gender"),
    SeniorCitizen: Number(fd.get("SeniorCitizen")),
    Partner: fd.get("Partner"),
    Dependents: fd.get("Dependents"),
    tenure: Number(fd.get("tenure")),
    PhoneService: fd.get("PhoneService"),
    MultipleLines: fd.get("MultipleLines"),
    InternetService: fd.get("InternetService"),
    OnlineSecurity: fd.get("OnlineSecurity"),
    OnlineBackup: fd.get("OnlineBackup"),
    DeviceProtection: fd.get("DeviceProtection"),
    TechSupport: fd.get("TechSupport"),
    StreamingTV: fd.get("StreamingTV"),
    StreamingMovies: fd.get("StreamingMovies"),
    Contract: fd.get("Contract"),
    PaperlessBilling: fd.get("PaperlessBilling"),
    PaymentMethod: fd.get("PaymentMethod"),
    MonthlyCharges: Number(fd.get("MonthlyCharges")),
    TotalCharges: Number(fd.get("TotalCharges"))
  };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formError.textContent = "";
  if (!form.reportValidity()) return;

  setLoading(true);
  try {
    const response = await fetch(PREDICT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadFromForm())
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = Array.isArray(result.detail)
        ? result.detail.map(item => item.msg || JSON.stringify(item)).join(" ")
        : result.detail;
      throw new Error(detail || `API request failed (${response.status}).`);
    }
    renderResult(result);
  } catch (error) {
    const isNetworkError = error instanceof TypeError;
    formError.textContent = isNetworkError
      ? `Could not reach ${API_BASE_URL}. Start your FastAPI server and confirm API_BASE_URL in script.js.`
      : (error.message || "Prediction failed. Check the backend logs and try again.");
  } finally {
    setLoading(false);
  }
});

function renderResult(result) {
  // Compatible with the FastAPI response from main.py:
  // { prediction: 0/1, churn: "No"/"Yes", churn_probability: 0..1 }
  const predicted = result.prediction;
  const churnText = result.churn ?? (Number(predicted) === 1 ? "Yes" : "No");
  const rawProbability = result.churn_probability;
  const probability = typeof rawProbability === "number"
    ? Math.max(0, Math.min(1, rawProbability))
    : null;
  const isChurn = String(churnText).toLowerCase() === "yes" || Number(predicted) === 1;

  resultEmpty.hidden = true;
  resultContent.hidden = false;
  resultBadge.textContent = isChurn ? "CHURN FLAGGED" : "LOWER CHURN SIGNAL";
  resultBadge.className = `result-badge ready${isChurn ? " high" : ""}`;

  const riskOrb = document.getElementById("riskOrb");
  const riskNumber = document.getElementById("riskNumber");
  const fill = document.getElementById("probabilityFill");
  riskOrb.classList.toggle("high-risk", isChurn);
  fill.classList.toggle("high-risk", isChurn);

  if (probability === null) {
    riskNumber.innerHTML = "N/A";
    fill.style.width = "0%";
  } else {
    const percent = Math.round(probability * 100);
    riskNumber.innerHTML = `${percent}<small>%</small>`;
    fill.style.width = `${percent}%`;
  }

  document.getElementById("predictionStatus").textContent =
    isChurn ? "Churn predicted" : "Retention signal";
  document.getElementById("resultExplanation").textContent =
    probability === null
      ? "The model returned a class prediction but no probability. Confirm that your saved pipeline supports predict_proba."
      : `The model estimates a ${(probability * 100).toFixed(1)}% probability of churn for this customer profile.`;
  document.getElementById("predictedClass").textContent = `${churnText} (class ${predicted})`;
}

async function checkApiStatus() {
  try {
    const response = await fetch(HEALTH_URL, { method: "GET" });
    if (!response.ok) throw new Error("API unavailable");
    apiStatus.textContent = "API connected";
    document.querySelector(".live-dot").style.background = "var(--mint)";
    document.querySelector(".live-dot").style.boxShadow = "0 0 12px #60e2c080";
  } catch {
    apiStatus.textContent = "API not connected";
    document.querySelector(".live-dot").style.background = "var(--red)";
    document.querySelector(".live-dot").style.boxShadow = "0 0 12px #ff7f9a80";
  }
}

updateTenure();
checkApiStatus();
