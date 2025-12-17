import ort from "onnxruntime-node";
import { loadModel } from "./onnxService.js";
import { getNearbyIncidents } from "./incidentService.js";

export async function getRisk(lat, lng) {
  const session = await loadModel();

  // 🔍 Nearby incidents
  const incidents = getNearbyIncidents(lat, lng, 5);
  const incidentDensity = incidents.length;

  // 🕒 Time features
  const now = new Date();
  const dayOfYear = Math.floor(
    (now - new Date(now.getFullYear(), 0, 0)) / 86400000
  );
  const month = now.getMonth() + 1;
  const week = Math.ceil(dayOfYear / 7);
  const hour = now.getHours();

  // 🧠 Feature vector (MUST match training order)
  const features = [
    0,               // State
    0,               // Location
    0,               // WeaponsUsed
    0,               // Casualties
    0,               // Kidnapped
    incidentDensity, // PastIncidentsInArea
    dayOfYear,       // DayOfYear
    month,           // Month
    week,            // Week
    hour             // Hour
  ];

  const inputTensor = new ort.Tensor(
    "float32",
    Float32Array.from(features),
    [1, 10]
  );

  const feeds = { input: inputTensor };

  try {
    const output = await session.run(feeds);

    /*
      Model outputs:
      - output.label → string tensor
      - output.probabilities → Float32Array
    */

    const label = output.label.data[0]; // "Low" | "Moderate" | "High"
    const probs = output.probabilities.data;

    // Map label → confidence score
    const labelIndex =
      label === "Low" ? 0 :
      label === "Moderate" ? 1 :
      2;

    const score = probs[labelIndex];

    return {
      label,
      score,
      incidentDensity
    };
  } catch (err) {
    console.error("ONNX Runtime Error:", err);
    throw new Error("Risk assessment failed: " + err.message);
  }
}
