import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import path from "path";
import { distanceKm } from "../services/geoService.js";
import { recordIncident } from "../services/incidentService.js";
import { getRisk } from "../services/riskService.js";
import { generateRiskExplanation } from "../services/llamaService.js";

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error("❌ TELEGRAM_BOT_TOKEN missing");
  process.exit(1);
}

// Use polling in development, webhook in production
const bot = new TelegramBot(token, {
  polling: process.env.NODE_ENV !== 'production'
});

console.log(`🤖 Telegram bot initialized (${process.env.NODE_ENV === 'production' ? 'webhook' : 'polling'} mode)`);

export function setupTelegramWebhook(app) {
  // Only set up webhook in production
  if (process.env.NODE_ENV === 'production') {
    const WEBHOOK_URL = process.env.WEBHOOK_URL;
    if (!WEBHOOK_URL) {
      console.error("❌ WEBHOOK_URL missing in production");
      process.exit(1);
    }

    const webhookPath = "/telegram-webhook";

    bot.setWebHook(`${WEBHOOK_URL}${webhookPath}`)
      .then(() => {
        console.log(`🔗 Telegram webhook set to ${WEBHOOK_URL}${webhookPath}`);
      })
      .catch(err => {
        console.error("⚠️ Telegram Webhook Setup Failed");
        console.error("Error:", err.message);
        // Don't exit - let the error handlers deal with it
      });

    app.post(webhookPath, (req, res) => {
      bot.processUpdate(req.body);
      res.sendStatus(200);
    });
  } else {
    console.log("🤖 Running in polling mode (development)");
    console.log("💡 Webhook is disabled for local development");
  }
}

const usersPath = path.resolve("data/users.json");

// =======================
// SAFE FILE HELPERS
// =======================
function readUsers() {
  if (!fs.existsSync(usersPath)) {
    fs.writeFileSync(usersPath, "[]");
  }
  return JSON.parse(fs.readFileSync(usersPath, "utf-8"));
}

function saveUsers(users) {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}

// =======================
// START
// =======================
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `🛡 *Sentinel AI*

📍 Share your location once
🚨 Use /panic in emergencies

🗺 Dashboard:
https://sentinel-ai-dashboard.vercel.app`,
    { parse_mode: "Markdown" }
  );
});

// =======================
// LOCATION HANDLER
// =======================
bot.on("location", (msg) => {
  const users = readUsers();

  const existing = users.find(u => u.chatId === msg.chat.id);

  if (!existing) {
    users.push({
      chatId: msg.chat.id,
      lat: msg.location.latitude,
      lng: msg.location.longitude
    });
  } else {
    existing.lat = msg.location.latitude;
    existing.lng = msg.location.longitude;
  }

  saveUsers(users);

  bot.sendMessage(msg.chat.id, "📍 Location saved. You will receive nearby alerts.");
});

// =======================
// PANIC
// =======================
bot.onText(/\/panic/, (msg) => {
  const users = readUsers();
  const sender = users.find(u => u.chatId === msg.chat.id);

  if (!sender) {
    return bot.sendMessage(
      msg.chat.id,
      "❌ Please share your location first using Telegram's location button."
    );
  }

  // 🔴 Store incident
  recordIncident({
    lat: sender.lat,
    lng: sender.lng,
    reporter: msg.chat.id,
    time: Date.now()
  });

  // 🔔 Broadcast to nearby users
  users.forEach(user => {
    const dist = distanceKm(
      sender.lat,
      sender.lng,
      user.lat,
      user.lng
    );

    if (dist <= 5 && user.chatId !== msg.chat.id) {
      bot.sendMessage(
        user.chatId,
        `🚨 *PANIC ALERT*

Incident reported *${dist.toFixed(1)}km* from you.

📍 Location:
${sender.lat}, ${sender.lng}

🗺 Live Map:
https://sentinel-ai-dashboard.vercel.app`,
        { parse_mode: "Markdown" }
      );
    }
  });

  bot.sendMessage(
    msg.chat.id,
    "🚨 Alert sent. Nearby users have been notified."
  );
});

bot.on("message", async (msg) => {
  if (!msg.text) return;

  const text = msg.text.toLowerCase();

  const triggers = [
    "is this place risky",
    "is this area safe",
    "is it safe here",
    "is this place safe",
    "is mile one okay",
    "/risk"
  ];

  if (!triggers.some(t => text.includes(t))) return;

  const users = readUsers();
  const user = users.find(u => u.chatId === msg.chat.id);

  if (!user) {
    return bot.sendMessage(
      msg.chat.id,
      "📍 Please share your location first so I can assess the risk."
    );
  }

  try {
    // 🧠 ONNX MODEL
    const risk = await getRisk(user.lat, user.lng);

    // 🗣️ LLaMA (Hugging Face)
    const explanation = await generateRiskExplanation({
      lat: user.lat,
      lng: user.lng,
      score: risk.score,
      label: risk.label,
      incidents: risk.incidentDensity
    });

    await bot.sendMessage(
      msg.chat.id,
      `🛡 *Sentinel Risk Assessment*

📍 Location:
${user.lat}, ${user.lng}

⚠ Risk Level: *${risk.label}*
📊 Confidence: ${(risk.score * 100).toFixed(1)}%

🧠 Insight:
${explanation}

🗺 Dashboard:
https://sentinel-ai-dashboard.vercel.app`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error("Risk error:", err);
    bot.sendMessage(
      msg.chat.id,
      "⚠ Unable to assess risk right now. Please try again."
    );
  }
});

export default bot