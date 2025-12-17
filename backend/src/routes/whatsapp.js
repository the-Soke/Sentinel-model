// import express from "express";
// import { buildFeatures } from "../utils/featureBuilder.js";
// import { predictRisk } from "../services/onnxService.js";
// import { explainRisk } from "../services/llamaService.js";
// import { sendWhatsApp } from "../services/twilioService.js";

// const router = express.Router();

// router.post("/", async (req, res) => {
//   const msg = req.body.Body;
//   const phone = req.body.From?.replace("whatsapp:", "").trim();

//   // DEMO parsing (simple for hackathon)
//   const [location, hour] = msg.split(",");

//   const features = buildFeatures({
//     hour,
//     casualties: 1,
//     kidnapped: 2,
//     pastIncidents: 5
//   });

//   const risk = await predictRisk(features);
//   const explanation = await explainRisk({
//     risk,
//     location,
//     time: `${hour}:00`
//   });

//   await sendWhatsApp(
//     phone,
//     `🚨 SentinelAI Alert\nRisk: ${risk}\n\n${explanation}`
//   );

//   res.sendStatus(200);
// });

// export default router;

// import express from "express";
// import { buildFeatures } from "../utils/featureBuilder.js";
// import { predictRisk } from "../services/onnxService.js";
// import { explainRisk } from "../services/llamaService.js";
// import { sendWhatsApp } from "../services/twilioService.js"; // This is your success check

// const router = express.Router();

// router.post("/", async (req, res) => {
//     const msg = req.body.Body;
//     const phone = req.body.From.replace("whatsapp:", "");

//     // 1. --- Input Parsing and Validation ---
//     const parts = msg.split(",");

//     if (parts.length < 2) {
//         console.error(`[DEBUG] Invalid input format: ${msg}`);
//         await sendWhatsApp(phone, "❌ Error: Please use the format 'Location,Hour' (e.g., Abuja,15)");
//         return res.sendStatus(400); 
//     }

//     const hour = parts[parts.length - 1].trim(); 
//     const location = parts.slice(0, -1).join(",").trim(); 

//     // 2. --- CRITICAL LOGGING ---
//     console.log(`[DEBUG] Parsed Input: Location='${location}', Hour='${hour}', Phone=${phone}`);
//     // Check if the hour is a valid number (e.g., 0-23)
//     if (isNaN(parseInt(hour)) || parseInt(hour) < 0 || parseInt(hour) > 23) {
//          console.error(`[DEBUG] Invalid hour value: ${hour}`);
//          await sendWhatsApp(phone, "❌ Error: The hour must be a number between 0 and 23.");
//          return res.sendStatus(400);
//     }
    
//     // 3. --- Service Calls with Try/Catch ---

//     try {
//         // Log the features being built
//         const features = buildFeatures({
//             hour, 
//             casualties: 1,
//             kidnapped: 2,
//             pastIncidents: 5
//         });
//         console.log(`[DEBUG] Features built:`, features);

//         // A. Predict Risk (ONNX Service)
//         let risk;
//         try {
//             risk = await predictRisk(features);
//         } catch (e) {
//             console.error(`[ERROR] predictRisk failed for location ${location}:`, e.message);
//             // This is the most common potential point of failure if the model input changes per location
//             throw new Error(`Risk Prediction failed. Details: ${e.message}`); 
//         }

//         // B. Explain Risk (LLaMA Service)
//         let explanation;
//         try {
//             explanation = await explainRisk({
//                 risk,
//                 location,
//                 time: `${hour}:00`
//             });
//         } catch (e) {
//             console.error(`[ERROR] explainRisk failed for location ${location}:`, e.message);
//             // This service might fail if it makes an external API call that only allows certain locations
//             throw new Error(`Risk Explanation failed. Details: ${e.message}`); 
//         }

//         // 4. --- Twilio Success Call ---
//         await sendWhatsApp(
//             phone,
//             `🚨 SentinelAI Alert\nLocation: ${location}\nRisk: ${risk}\n\n${explanation}`
//         );

//         console.log(`[DEBUG] Successfully sent WhatsApp message for location: ${location}`);
//         res.sendStatus(200);

//     } catch (error) {
//         // 5. --- Global Error Handler (This is where the crash is likely going) ---
//         console.error(`[FATAL ERROR] Full request failed for location ${location}:`, error);
        
//         // Try to send a generic failure message to the user
//         try {
//             await sendWhatsApp(phone, `⚠️ System Failure Alert: We encountered an error while processing your request for ${location}. Error Details: ${error.message.substring(0, 100)}...`);
//         } catch (e) {
//             // If even the failure message fails, just log it and send the HTTP status
//             console.error("Failed to send even the error message via WhatsApp:", e);
//         }
        
//         res.sendStatus(500);
//     }
// });

// export default router;

// src/routes/whatsapp.js

import express from "express";
import twilio from "twilio";

const router = express.Router();
const MessagingResponse = twilio.twiml.MessagingResponse;

router.post("/", (req, res) => {
  const twiml = new MessagingResponse();

  const body = req.body.Body;
  const from = req.body.From;

  console.log("📩 RAW:", req.body);
  console.log("📩 Body:", body);
  console.log("📞 From:", from);

  if (!body) {
    twiml.message("❌ Empty message received.");
  } else {
    const msg = body.trim().toLowerCase();

    // ======================
    // RISK
    // ======================
    if (msg.startsWith("risk")) {
      const parts = msg.split(/\s+/);

      if (parts.length < 3) {
        twiml.message("❌ Usage: risk <latitude> <longitude>");
      } else {
        const lat = parseFloat(parts[1]);
        const lng = parseFloat(parts[2]);

        if (isNaN(lat) || isNaN(lng)) {
          twiml.message("❌ Invalid coordinates.");
        } else {
          twiml.message(
            `⚠ High Risk (0.82)

Recent incidents and night activity make this area unsafe.
Avoid traveling now.`
          );
        }
      }
    }

    // ======================
    // PANIC
    // ======================
    else if (msg === "panic") {
      twiml.message(
        "🚨 Panic alert recorded.\nAuthorities will be notified (simulation).\nStay safe."
      );
    }

    // ======================
    // HELP
    // ======================
    else {
      twiml.message(
        "🤖 Sentinel AI\n\nCommands:\n• risk <lat> <lng>\n• PANIC"
      );
    }
  }

  // 🔥 THIS IS THE MOST IMPORTANT PART
  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
});

export default router;
