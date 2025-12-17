import express from "express";
import { incidents, users } from "../data/store.js";
import { sendWhatsApp } from "../services/twilioService.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const msg = req.body.Body.toLowerCase();
  const from = req.body.From.replace("whatsapp:", "");

  if (msg.includes("panic") || msg.includes("bandit")) {
    incidents.push({ from, time: Date.now() });

    for (const [phone] of users) {
      if (phone !== from) {
        await sendWhatsApp(phone,
          "🚨 Incident reported near you. Stay indoors."
        );
      }
    }

    await sendWhatsApp(from, "✅ Alert received. Stay safe.");
  }

  res.sendStatus(200);
});

export default router;
