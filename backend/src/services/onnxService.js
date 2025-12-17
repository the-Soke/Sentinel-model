// import ort from "onnxruntime-node";
// import path from "path";
// import { fileURLToPath } from "url";
// import dotenv from "dotenv";

// dotenv.config();

// // Fix __dirname for ES Modules
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // ✅ Resolve model path RELATIVE TO BACKEND
// const MODEL_PATH = path.resolve(__dirname, "../../", process.env.MODEL_PATH);

// let session = null;

// async function loadModel() {
//   if (!session) {
//     console.log("📦 Loading ONNX model from:", MODEL_PATH);
//     session = await ort.InferenceSession.create(MODEL_PATH);
//     console.log("✅ ONNX model loaded");
//   }
//   return session;
// }

// function confidenceFromRisk(risk) {
//   if (risk === "Low") return Math.floor(60 + Math.random() * 15);
//   if (risk === "Medium") return Math.floor(70 + Math.random() * 15);
//   if (risk === "High") return Math.floor(85 + Math.random() * 10);
//   return 50;
// }

// export async function predictRisk(features) {
//   const session = await loadModel();

//   const inputTensor = new ort.Tensor(
//     "float32",
//     Float32Array.from(features),
//     [1, 10]
//   );

//   const feeds = { input: inputTensor };

//   const results = await session.run(feeds, ["output_label"]);

//   const labelIndex = results.output_label.data[0];
//   const labels = ["Low", "Medium", "High"];

//   const risk = labels[labelIndex];

//   return {
//     risk,
//     confidence: confidenceFromRisk(risk)
//   };
// }

import ort from "onnxruntime-node";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL_PATH = path.resolve(__dirname, "../../", process.env.MODEL_PATH || "src/model/sentinel_model_fixed.onnx");

let session = null;

export async function loadModel() {
  if (!session) {
    console.log("📦 Loading ONNX model from:", MODEL_PATH);
    session = await ort.InferenceSession.create(MODEL_PATH);
    console.log("✅ ONNX model loaded");
  }
  return session;
}

function confidenceFromRisk(risk) {
  if (risk === "Low") return Math.floor(60 + Math.random() * 15);
  if (risk === "Moderate" || risk === "Medium") return Math.floor(70 + Math.random() * 15);
  if (risk === "High") return Math.floor(85 + Math.random() * 10);
  return 50;
}

export async function predictRisk(features) {
  const session = await loadModel();

  const inputTensor = new ort.Tensor(
    "float32",
    Float32Array.from(features),
    [1, 10]
  );

  // Use the correct input name: "input"
  const feeds = { input: inputTensor };

  // 🛠️ FIX: We fetch "label" and "probabilities" because those are the real names in your model
  const results = await session.run(feeds);

  // 🛠️ FIX: Your model returns the string directly in results.label.data[0]
  const risk = results.label.data[0]; 

  // Extract confidence from probabilities if it's a numeric array, 
  // otherwise use our helper function
  let confidence = confidenceFromRisk(risk);
  
  if (results.probabilities && results.probabilities.data) {
    // If probabilities is a list of maps (common in sklearn-onnx)
    const probObj = results.probabilities.data[0];
    if (probObj && typeof probObj === 'object') {
      const values = Object.values(probObj);
      confidence = Math.floor(Math.max(...values) * 100);
    }
  }

  return {
    risk,
    confidence
  };
}