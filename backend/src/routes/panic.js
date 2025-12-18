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

// import express from "express";
// import { recordIncident } from "../services/incidentService.js";
// import { broadcastPanic } from "../services/broadcastService.js";

// const router = express.Router();

// router.post("/", async (req, res) => {
//   const { phone, latitude, longitude } = req.body;

//   // 🔐 Basic validation
//   if (!latitude || !longitude) {
//     return res.status(400).json({
//       error: "Latitude and longitude required"
//     });
//   }

//   try {
//     // =========================
//     // 1️⃣ RECORD INCIDENT
//     // =========================
//     const incident = await recordIncident({
//       type: "panic",
//       latitude,
//       longitude,
//       phone: phone || null
//     });

//     // =========================
//     // 2️⃣ BROADCAST ALERT
//     // =========================
//     await broadcastPanic({
//       latitude,
//       longitude,
//       phone
//     });

//     console.log("🚨 Panic incident recorded:", incident.id);

//     res.json({
//       status: "ok",
//       message: "🚨 Panic alert processed",
//       incidentId: incident.id
//     });

//   } catch (err) {
//     console.error("❌ Panic route error:", err);
//     res.status(500).json({
//       error: "Failed to process panic alert"
//     });
//   }
// });

// export default router;

import express from "express";
import { recordIncident } from "../services/incidentService.js";
import bot from "../bots/telegramBot.js";
import fs from "fs";
import path from "path";
import { distanceKm } from "../services/geoService.js";

const router = express.Router();

const usersPath = path.resolve("data/users.json");

// Read Telegram users from file
function readTelegramUsers() {
  try {
    if (!fs.existsSync(usersPath)) {
      console.warn("⚠️ No Telegram users file found");
      return [];
    }
    const data = fs.readFileSync(usersPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("❌ Error reading Telegram users:", error.message);
    return [];
  }
}

/**
 * POST /api/panic
 * Body: { latitude, longitude, source }
 * Broadcasts panic alert to nearby Telegram bot users within 5km
 */
router.post("/", async (req, res) => {
  try {
    const { latitude, longitude, source = "web", phone } = req.body;

    // Validate required fields
    if (!latitude || !longitude) {
      return res.status(400).json({
        error: "Missing required fields: latitude, longitude"
      });
    }

    const reporter = phone || source || "anonymous";
    console.log(`🚨 PANIC ALERT from ${reporter} at ${latitude}, ${longitude}`);

    // Record the incident
    recordIncident({
      lat: latitude,
      lng: longitude,
      reporter: reporter,
      time: Date.now()
    });

    // Get all registered Telegram users
    const telegramUsers = readTelegramUsers();
    
    if (telegramUsers.length === 0) {
      console.warn("⚠️ No Telegram users registered yet");
      return res.json({
        success: true,
        message: "Panic alert recorded, but no users are registered yet.",
        location: {
          lat: latitude,
          lng: longitude
        },
        notifications: {
          sent: 0,
          total: 0,
          failed: 0
        }
      });
    }

    console.log(`📊 Found ${telegramUsers.length} registered Telegram users`);

    let notifiedCount = 0;
    const notificationErrors = [];
    const notifiedUsers = [];

    // Broadcast to nearby Telegram users (within 5km)
    for (const user of telegramUsers) {
      try {
        // Calculate distance between panic location and user location
        const dist = distanceKm(
          latitude,
          longitude,
          user.lat,
          user.lng
        );

        console.log(`   User ${user.chatId}: ${dist.toFixed(2)}km away`);

        // Only notify users within 5km radius
        if (dist <= 5) {
          await bot.sendMessage(
            user.chatId,
            `🚨 *PANIC ALERT*

⚠️ Emergency reported *${dist.toFixed(1)}km* from your location!

📍 *Incident Location:*
Latitude: ${latitude.toFixed(6)}
Longitude: ${longitude.toFixed(6)}

🔴 *What to do:*
• Stay alert and aware of your surroundings
• Avoid the area if possible
• Keep to well-populated, well-lit areas
• Contact authorities if needed (911)

🗺 *View on Map:*
https://sentinel-ai-dashboard.vercel.app

💡 *Your Safety Matters*
If you're in danger, use /panic in this chat or call emergency services immediately.`,
            { parse_mode: "Markdown" }
          );
          
          notifiedCount++;
          notifiedUsers.push({
            chatId: user.chatId,
            distance: dist.toFixed(1)
          });
          
          console.log(`   ✅ Notified user ${user.chatId} (${dist.toFixed(1)}km away)`);
        } else {
          console.log(`   ⏭️ User too far (${dist.toFixed(1)}km > 5km)`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to notify user ${user.chatId}:`, error.message);
        notificationErrors.push({
          chatId: user.chatId,
          error: error.message
        });
      }
    }

    console.log(`\n📊 PANIC ALERT SUMMARY:`);
    console.log(`   ✅ Notified: ${notifiedCount} users`);
    console.log(`   📍 Total registered: ${telegramUsers.length} users`);
    console.log(`   ❌ Failed: ${notificationErrors.length} users\n`);

    // Send response
    res.json({
      success: true,
      message: `Panic alert sent! ${notifiedCount} nearby user${notifiedCount !== 1 ? 's' : ''} ha${notifiedCount !== 1 ? 've' : 's'} been notified.`,
      location: {
        lat: latitude,
        lng: longitude
      },
      notifications: {
        sent: notifiedCount,
        total: telegramUsers.length,
        failed: notificationErrors.length,
        notifiedUsers: notifiedUsers
      }
    });

  } catch (error) {
    console.error("❌ Panic error:", error);
    res.status(500).json({
      error: "Failed to process panic alert",
      message: error.message
    });
  }
});

/**
 * GET /api/panic/stats
 * Returns panic alert statistics
 */
router.get("/stats", (req, res) => {
  try {
    const incidentsPath = path.resolve("data/incidents.json");
    
    if (!fs.existsSync(incidentsPath)) {
      return res.json({
        totalIncidents: 0,
        recentIncidents: [],
        last24Hours: 0,
        lastHour: 0
      });
    }

    const incidents = JSON.parse(fs.readFileSync(incidentsPath, "utf-8"));
    const now = Date.now();
    const last24Hours = incidents.filter(i => now - i.time < 24 * 60 * 60 * 1000);
    const lastHour = incidents.filter(i => now - i.time < 60 * 60 * 1000);

    res.json({
      totalIncidents: incidents.length,
      last24Hours: last24Hours.length,
      lastHour: lastHour.length,
      recentIncidents: incidents.slice(-10).reverse().map(inc => ({
        lat: inc.lat,
        lng: inc.lng,
        reporter: inc.reporter,
        time: new Date(inc.time).toISOString()
      }))
    });

  } catch (error) {
    console.error("❌ Stats error:", error);
    res.status(500).json({ 
      error: "Failed to get stats",
      message: error.message 
    });
  }
});

/**
 * GET /api/panic/users
 * Returns count of registered users (for testing)
 */
router.get("/users", (req, res) => {
  try {
    const users = readTelegramUsers();
    res.json({
      total: users.length,
      users: users.map(u => ({
        chatId: u.chatId,
        lat: u.lat,
        lng: u.lng,
        registered: u.registeredAt ? new Date(u.registeredAt).toISOString() : 'Unknown'
      }))
    });
  } catch (error) {
    console.error("❌ Users error:", error);
    res.status(500).json({ 
      error: "Failed to get users",
      message: error.message 
    });
  }
});

export default router;