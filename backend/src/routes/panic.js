// import express from "express";
// import twilio from "twilio";

// const router = express.Router();

// const client = twilio(
//   process.env.TWILIO_SID,
//   process.env.TWILIO_AUTH
// );

// router.post("/", async (req, res) => {
//   const { phone, latitude, longitude } = req.body;

//   // ✅ DEV MODE (no WhatsApp yet)
//   if (!phone) {
//     console.log("🚨 PANIC RECEIVED (DEV MODE)");
//     console.log({ latitude, longitude });

//     return res.json({
//       status: "recorded",
//       message: "Panic alert recorded (simulation mode)"
//     });
//   }

//   // ✅ REAL WHATSAPP MODE
//   await client.messages.create({
//     from: "whatsapp:+14155238886",
//     to: `whatsapp:${phone}`,
//     body: "🚨 Panic alert received. Stay safe."
//   });

//   res.json({
//     status: "sent",
//     message: "Panic alert sent successfully"
//   });
// });

// export default router;

import express from "express";
import { recordIncident } from "../services/incidentService.js";
import { broadcastPanic } from "../services/broadcastService.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { phone, latitude, longitude } = req.body;

  // 🔐 Basic validation
  if (!latitude || !longitude) {
    return res.status(400).json({
      error: "Latitude and longitude required"
    });
  }

  try {
    // =========================
    // 1️⃣ RECORD INCIDENT
    // =========================
    const incident = await recordIncident({
      type: "panic",
      latitude,
      longitude,
      phone: phone || null
    });

    // =========================
    // 2️⃣ BROADCAST ALERT
    // =========================
    await broadcastPanic({
      latitude,
      longitude,
      phone
    });

    console.log("🚨 Panic incident recorded:", incident.id);

    res.json({
      status: "ok",
      message: "🚨 Panic alert processed",
      incidentId: incident.id
    });

  } catch (err) {
    console.error("❌ Panic route error:", err);
    res.status(500).json({
      error: "Failed to process panic alert"
    });
  }
});

export default router;
