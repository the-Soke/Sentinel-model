// import express from "express";
// import { predictRisk } from "../services/onnxService.js";
// import { explainRisk } from "../services/llamaService.js";
// import { sendWhatsApp } from "../services/twilioService.js";
// import { buildFeatures } from "../utils/featureBuilder.js";

// const router = express.Router();

// router.post("/", async (req, res) => {
//   try {
//     const {
//       phone,
//       state,
//       location,
//       hour,
//       casualties,
//       kidnapped,
//       pastIncidents
//     } = req.body;

//     // ✅ ALWAYS RETURNS 10 FEATURES
//     const features = buildFeatures({
//       state,
//       location,
//       hour,
//       casualties,
//       kidnapped,
//       pastIncidents
//     });

//     // 🔍 Debug (optional)
//     console.log("Model features:", features);

//     const { risk, confidence } = await predictRisk(features);


//     const explanation = await explainRisk({
//       risk,
//       state,
//       time: `${hour}:00`
//     });

//     await sendWhatsApp(
//   phone,
//   `🚨 SentinelAI Alert

// Risk Level: ${risk}
// Confidence: ${(confidence).toFixed(1)}%

// ${explanation}`
// );

//     res.json({
//       success: true,
//       risk,
//       explanation
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Prediction failed" });
//   }
// });

// export default router;


// import express from "express";
// import { predictRisk } from "../services/onnxService.js";
// import { sendWhatsApp } from "../services/twilioService.js";
// import { buildFeatures } from "../utils/featureBuilder.js";
// import { geocodeLocation } from "../services/geocodeService.js";

// const router = express.Router();

// router.post("/", async (req, res) => {
//   try {
//     const address = `${req.body.location}, ${req.body.state}, Nigeria`;

//     const coords = await geocodeLocation(address);

//     const features = buildFeatures(req.body);
//     const prediction = await predictRisk(features);

//     if (prediction.risk === "High") {
//       await sendWhatsApp(
//         req.body.phone,
//         `🚨 SentinelAI Alert

// Risk Level: ${prediction.risk}
// Confidence: ${prediction.confidence}%

// Location: ${req.body.location}, ${req.body.state}

// Stay alert and avoid high-risk areas.`
//       );
//     }

//     res.json({
//       success: true,
//       risk: prediction.risk,
//       confidence: prediction.confidence,
//       coordinates: coords
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// });

// export default router;

import express from "express";
import { buildFeatureVector } from "../utils/featureBuilder.js";
import { predictRisk } from "../services/onnxService.js";
import { geocodeLocation } from "../services/geocodeService.js";
import { sendWhatsApp } from "../services/twilioService.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const input = req.body;

    const geo = await geocodeLocation(input.location);
    const features = buildFeatureVector(input);
    const prediction = await predictRisk(features);

    if (prediction.risk !== "Low" && input.phone) {
      await sendWhatsApp(
        input.phone,
        `🚨 SentinelAI Alert

Risk Level: ${prediction.risk}
Confidence: ${prediction.confidence}%

Location: ${geo?.display ?? "Unknown"}

Stay alert and avoid high-risk areas.`
      );
    }

    res.json({
      ...prediction,
      location: geo
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Prediction failed" });
  }
});

export default router;
