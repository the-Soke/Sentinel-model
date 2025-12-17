// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";

// import predictRoute from "./src/routes/predict.js"; 
// import whatsappRoute from "./src/routes/whatsapp.js"; 
// import mapRoute from "./src/routes/map.js";

// dotenv.config();

// const app = express();
// app.use(cors());
// app.use(express.json());

// app.use("/predict", predictRoute);
// app.use("/whatsapp", whatsappRoute);
// app.use("/map", mapRoute);

// app.get("/", (_, res) => {
//   res.send("✅ SentinelAI Backend Running");
// });

// app.listen(process.env.PORT, () =>
//   console.log(`🚀 Server running on port ${process.env.PORT}`)
// );

// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";

// import predictRoute from "./src/routes/predict.js"; 
// import whatsappRoute from "./src/routes/whatsapp.js"; 
// import mapRoute from "./src/routes/map.js";

// dotenv.config();

// const app = express();

// app.use((req, res, next) => {
//     console.log(`[REQUEST RECEIVED] Method: ${req.method}, Path: ${req.url}`);
//     next();
// });
// // --- ESSENTIAL MIDDLEWARE ---

// // 1. CORS for cross-origin requests
// app.use(cors());

// // 2. JSON body parser (for /predict and /map routes)
// app.use(express.json());

// /* ================================
//    SERVE FRONTEND (VERY IMPORTANT)
// ================================ */
// const frontendPath = path.join(__dirname, "../../frontend");
// app.use(express.static(frontendPath));

// // 3. URL-ENCODED body parser (CRITICAL FOR TWILIO WEBHOOKS)
// // Twilio sends data in application/x-www-form-urlencoded format.
// // This is the middleware that was likely missing and causing your failure.
// app.use(express.urlencoded({ extended: true }));

// // --- ROUTE MOUNTING ---

// app.use("/predict", predictRoute);
// app.use("/whatsapp", whatsappRoute);
// app.use("/map", mapRoute);

// /* ================================
//    SPA ROUTES (HTML)
// ================================ */
// app.get("/", (req, res) =>
//   res.sendFile(path.join(frontendPath, "index.html"))
// );

// app.get("/dashboard", (req, res) =>
//   res.sendFile(path.join(frontendPath, "dashboard.html"))
// );

// app.get("/risk-checker", (req, res) =>
//   res.sendFile(path.join(frontendPath, "risk-checker.html"))
// );

// app.listen(process.env.PORT, () =>
//     console.log(`🚀 Server running on port ${process.env.PORT}`)
// );

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

// ===============================
// GLOBAL ERROR HANDLERS
// ===============================
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection at:', promise);
  console.error('⚠️ Reason:', reason);
  // Don't exit - let the app continue running
});

process.on('uncaughtException', (error) => {
  console.error('⚠️ Uncaught Exception:', error);
  // Don't exit - let the app continue running
});

// ⛔ FAIL FAST
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN missing");
  process.exit(1);
}

// Only require WEBHOOK_URL in production
if (process.env.NODE_ENV === 'production' && !process.env.WEBHOOK_URL) {
  console.error("❌ WEBHOOK_URL missing in production");
  process.exit(1);
}

import predictRouter from "./src/routes/predict.js";
import panicRouter from "./src/routes/panic.js";
import whatsappRouter from "./src/routes/whatsapp.js";
import { setupTelegramWebhook } from "./src/bots/telegramBot.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ===============================
// TELEGRAM WEBHOOK
// ===============================
setupTelegramWebhook(app);

// ===============================
// ROUTES
// ===============================
app.use("/api/predict", predictRouter);
app.use("/api/panic", panicRouter);
app.use("/api/whatsapp", whatsappRouter);

// ===============================
// FRONTEND
// ===============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, "frontend");

app.use(express.static(frontendPath));
app.get("/", (_, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Sentinel running on http://localhost:${PORT}`);
});