import ort from "onnxruntime-node";
import { loadModel } from "./onnxService.js";
import { getNearbyIncidents } from "./incidentService.js";

export async function getRisk(lat, lng) {
  const session = await loadModel();

  // 🔍 Feature engineering
  const incidents = getNearbyIncidents(lat, lng, 5);
  const incidentDensity = incidents.length;

  // ✅ CORRECT ONNX TENSOR
  const inputTensor = new ort.Tensor(
    "float32",
    Float32Array.from([
      parseFloat(lat),
      parseFloat(lng),
      incidentDensity
    ]),
    [1, 3] // 👈 MUST BE AN ARRAY
  );

  const feeds = { input: inputTensor };

  const output = await session.run(feeds);

  const score = output.output.data[0]; // assumes model outputs a score

  let label =
    score > 0.7 ? "High" :
    score > 0.4 ? "Moderate" :
    "Low";

  return {
    score,
    label,
    incidentDensity
  };
}
