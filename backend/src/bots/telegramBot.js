// import TelegramBot from "node-telegram-bot-api";
// import fs from "fs";
// import path from "path";
// import { distanceKm } from "../services/geoService.js";
// import { recordIncident } from "../services/incidentService.js";
// import { getRisk } from "../services/riskService.js";
// import { generateRiskExplanation } from "../services/llamaService.js";
// import https from "https";

// const token = process.env.TELEGRAM_BOT_TOKEN;

// if (!token) {
//   console.error("❌ TELEGRAM_BOT_TOKEN missing");
//   process.exit(1);
// }

// // Configure bot - simple config without proxy for now
// const botOptions = { polling: false };

// // Initialize bot
// const bot = new TelegramBot(token, botOptions);

// console.log(`🤖 Telegram bot initialized`);

// // Handle polling errors gracefully
// bot.on('polling_error', (error) => {
//   console.error('⚠️ Telegram Polling Error:', error.code);
  
//   if (error.code === 'EFATAL' || error.code === 'ETIMEDOUT') {
//     console.error('🔌 Connection issue detected:');
//     console.error('   - Your network is blocking Telegram servers');
//     console.error('   - Try using a VPN or mobile hotspot');
//     console.error('   - Or set up a proxy (see docs)');
//   }
// });

// bot.on('error', (error) => {
//   console.error('⚠️ Telegram Bot Error:', error);
// });

// // Function to test Telegram connectivity
// async function testTelegramConnection() {
//   return new Promise((resolve, reject) => {
//     const options = {
//       hostname: 'api.telegram.org',
//       port: 443,
//       path: `/bot${token}/getMe`,
//       method: 'GET',
//       timeout: 10000
//     };

//     const req = https.request(options, (res) => {
//       let data = '';
//       res.on('data', (chunk) => { data += chunk; });
//       res.on('end', () => {
//         if (res.statusCode === 200) {
//           resolve(true);
//         } else {
//           reject(new Error(`HTTP ${res.statusCode}`));
//         }
//       });
//     });

//     req.on('error', (error) => reject(error));
//     req.on('timeout', () => {
//       req.destroy();
//       reject(new Error('Connection timeout'));
//     });

//     req.end();
//   });
// }

// export async function setupTelegramWebhook(app) {
//   const NGROK_URL = process.env.NGROK_URL;
//   const USE_NGROK = process.env.USE_NGROK === 'true';

//   // Test connectivity first
//   console.log('🔍 Testing Telegram API connectivity...');
//   try {
//     await testTelegramConnection();
//     console.log('✅ Successfully connected to Telegram API');
//   } catch (error) {
//     console.error('❌ Cannot connect to Telegram API:', error.message);
//     console.error('\n🚨 NETWORK ISSUE DETECTED:');
//     console.error('   Your network is blocking access to Telegram servers.');
//     console.error('\n💡 SOLUTIONS:');
//     console.error('   1. Use a VPN (Recommended)');
//     console.error('   2. Use mobile hotspot');
//     console.error('   3. Try a different network');
//     console.error('   4. Set up HTTP proxy (advanced)');
//     console.error('\n⚠️  Bot will continue running but webhook setup failed.');
//     console.error('   The webhook endpoint is ready, but Telegram cannot be notified.\n');
    
//     // Still set up the webhook endpoint for when connection works
//     if (USE_NGROK && NGROK_URL) {
//       const webhookPath = "/telegram-webhook";
//       app.post(webhookPath, (req, res) => {
//         console.log('📨 Webhook received:', JSON.stringify(req.body, null, 2));
//         bot.processUpdate(req.body);
//         res.sendStatus(200);
//       });
//       console.log(`🎯 Webhook endpoint ready at: POST ${webhookPath}`);
//       console.log(`   (Waiting for network connectivity to notify Telegram)\n`);
//     }
//     return;
//   }

//   // If ngrok URL is provided, use webhook mode
//   if (USE_NGROK && NGROK_URL) {
//     const webhookPath = "/telegram-webhook";
//     const fullWebhookUrl = `${NGROK_URL}${webhookPath}`;

//     try {
//       // Remove any existing webhook first
//       console.log('🧹 Clearing existing webhook...');
//       await bot.deleteWebHook();
      
//       // Set new webhook with drop_pending_updates
//       console.log(`📡 Setting webhook to: ${fullWebhookUrl}`);
//       await bot.setWebHook(fullWebhookUrl, {
//         drop_pending_updates: true, // Clear old updates
//         allowed_updates: ["message", "callback_query", "inline_query"]
//       });
      
//       // Get webhook info
//       const info = await bot.getWebHookInfo();
      
//       console.log('✅ Telegram webhook configured successfully!');
//       console.log('📋 Webhook Info:', {
//         url: info.url,
//         pending_updates: info.pending_update_count,
//         last_error: info.last_error_message || 'None'
//       });
      
//       if (info.last_error_message) {
//         console.log('\n⚠️  WARNING: Webhook has errors!');
//         console.log('   Last error:', info.last_error_message);
//         console.log('\n💡 COMMON ISSUES:');
//         console.log('   1. ngrok free tier shows a "Visit Site" button');
//         console.log('   2. Telegram cannot reach your webhook');
//         console.log('\n🔧 FIX: Add this header to bypass ngrok warning:');
//         console.log('   ngrok-skip-browser-warning: true\n');
//       } else {
//         console.log('🌐 ngrok mode active\n');
//       }
//     } catch (err) {
//       console.error("⚠️ Telegram Webhook Setup Failed");
//       console.error("Error:", err.message);
//       console.error("\n💡 This is a network connectivity issue.");
//       console.error("   Try using a VPN or mobile hotspot.\n");
//     }

//     // Handle incoming webhook updates with logging
//     app.post(webhookPath, (req, res) => {
//       console.log('📨 Webhook received at', new Date().toISOString());
//       console.log('   Update ID:', req.body.update_id);
//       console.log('   Message:', req.body.message?.text || req.body.message?.location || 'other');
      
//       bot.processUpdate(req.body);
//       res.sendStatus(200);
//     });

//     console.log(`🎯 Webhook endpoint ready at: POST ${webhookPath}\n`);
//   } 
//   // Production webhook mode
//   else if (process.env.NODE_ENV === 'production') {
//     const WEBHOOK_URL = process.env.WEBHOOK_URL;
//     if (!WEBHOOK_URL) {
//       console.error("❌ WEBHOOK_URL missing in production");
//       process.exit(1);
//     }

//     const webhookPath = "/telegram-webhook";

//     try {
//       await bot.setWebHook(`${WEBHOOK_URL}${webhookPath}`, {
//         drop_pending_updates: true
//       });
//       console.log(`🔗 Telegram webhook set to ${WEBHOOK_URL}${webhookPath}`);
//     } catch (err) {
//       console.error("⚠️ Telegram Webhook Setup Failed");
//       console.error("Error:", err.message);
//     }

//     app.post(webhookPath, (req, res) => {
//       console.log('📨 Webhook received');
//       bot.processUpdate(req.body);
//       res.sendStatus(200);
//     });
//   } 
//   // Fallback to polling mode (may have connection issues)
//   else {
//     console.log("🤖 Attempting polling mode (development)");
//     console.log("⚠️  If you get connection errors, use ngrok instead:");
//     console.log("    1. Run: ngrok http 3000");
//     console.log("    2. Set NGROK_URL in .env");
//     console.log("    3. Set USE_NGROK=true in .env\n");
    
//     try {
//       bot.startPolling();
//       console.log("✅ Polling started successfully\n");
//     } catch (error) {
//       console.error("❌ Failed to start polling:", error.message);
//       console.error("💡 Please use ngrok webhook mode instead\n");
//     }
//   }
// }

// const usersPath = path.resolve("data/users.json");

// // =======================
// // SAFE FILE HELPERS
// // =======================
// function readUsers() {
//   if (!fs.existsSync(usersPath)) {
//     const dataDir = path.dirname(usersPath);
//     if (!fs.existsSync(dataDir)) {
//       fs.mkdirSync(dataDir, { recursive: true });
//     }
//     fs.writeFileSync(usersPath, "[]");
//   }
//   return JSON.parse(fs.readFileSync(usersPath, "utf-8"));
// }

// function saveUsers(users) {
//   const dataDir = path.dirname(usersPath);
//   if (!fs.existsSync(dataDir)) {
//     fs.mkdirSync(dataDir, { recursive: true });
//   }
//   fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
// }

// // =======================
// // START
// // =======================
// bot.onText(/\/start/, (msg) => {
//   console.log(`📱 /start command from user ${msg.chat.id}`);
//   bot.sendMessage(
//     msg.chat.id,
//     `🛡 *Sentinel AI*

// Welcome to Sentinel - Your Personal Safety Assistant!

// 📍 *Share your location once* to enable alerts
// 🚨 Use */panic* in emergencies
// 🔍 Ask "*is this place safe?*" for risk assessment

// 🗺 Dashboard:
// https://sentinel-ai-dashboard.vercel.app`,
//     { parse_mode: "Markdown" }
//   ).then(() => {
//     console.log('✅ Welcome message sent successfully');
//   }).catch(err => {
//     console.error('❌ Failed to send welcome message:', err.message);
//   });
// });

// // =======================
// // LOCATION HANDLER
// // =======================
// bot.on("location", (msg) => {
//   console.log(`📍 Location received from user ${msg.chat.id}`);
//   const users = readUsers();

//   const existing = users.find(u => u.chatId === msg.chat.id);

//   if (!existing) {
//     users.push({
//       chatId: msg.chat.id,
//       lat: msg.location.latitude,
//       lng: msg.location.longitude,
//       registeredAt: Date.now()
//     });
//     console.log(`✅ New user registered: ${msg.chat.id}`);
//   } else {
//     existing.lat = msg.location.latitude;
//     existing.lng = msg.location.longitude;
//     existing.lastUpdated = Date.now();
//     console.log(`🔄 User location updated: ${msg.chat.id}`);
//   }

//   saveUsers(users);

//   bot.sendMessage(msg.chat.id, "📍 Location saved. You will receive alerts for incidents within 5km of your location.");
// });

// // =======================
// // PANIC
// // =======================
// bot.onText(/\/panic/, (msg) => {
//   console.log(`🚨 PANIC alert from user ${msg.chat.id}`);
//   const users = readUsers();
//   const sender = users.find(u => u.chatId === msg.chat.id);

//   if (!sender) {
//     return bot.sendMessage(
//       msg.chat.id,
//       "❌ Please share your location first using Telegram's location button."
//     );
//   }

//   // 🔴 Store incident
//   recordIncident({
//     lat: sender.lat,
//     lng: sender.lng,
//     reporter: msg.chat.id,
//     time: Date.now()
//   });

//   let notifiedCount = 0;

//   // 🔔 Broadcast to nearby users
//   users.forEach(user => {
//     const dist = distanceKm(
//       sender.lat,
//       sender.lng,
//       user.lat,
//       user.lng
//     );

//     if (dist <= 5 && user.chatId !== msg.chat.id) {
//       bot.sendMessage(
//         user.chatId,
//         `🚨 *PANIC ALERT*

// Incident reported *${dist.toFixed(1)}km* from you.

// 📍 Location:
// ${sender.lat}, ${sender.lng}

// 🗺 Live Map:
// https://sentinel-ai-dashboard.vercel.app

// ⚠️ Stay alert and ensure your safety.`,
//         { parse_mode: "Markdown" }
//       );
//       notifiedCount++;
//     }
//   });

//   console.log(`✅ Panic alert sent to ${notifiedCount} nearby users`);

//   bot.sendMessage(
//     msg.chat.id,
//     `🚨 Alert sent successfully!

// ${notifiedCount} nearby user${notifiedCount !== 1 ? 's' : ''} ha${notifiedCount !== 1 ? 've' : 's'} been notified.

// 📍 Your location has been recorded.
// 🆘 Help may be on the way.`
//   );
// });

// // =======================
// // RISK ASSESSMENT
// // =======================
// bot.on("message", async (msg) => {
//   if (!msg.text) return;

//   const text = msg.text.toLowerCase();

//   const triggers = [
//     "is this place risky",
//     "is this area safe",
//     "is it safe here",
//     "is this place safe",
//     "is this safe",
//     "safe here",
//     "risk level",
//     "/risk"
//   ];

//   if (!triggers.some(t => text.includes(t))) return;

//   console.log(`🔍 Risk assessment request from user ${msg.chat.id}`);

//   const users = readUsers();
//   const user = users.find(u => u.chatId === msg.chat.id);

//   if (!user) {
//     return bot.sendMessage(
//       msg.chat.id,
//       "📍 Please share your location first so I can assess the risk in your area."
//     );
//   }

//   // Send "analyzing" message
//   const processingMsg = await bot.sendMessage(
//     msg.chat.id,
//     "🧠 Analyzing risk level for your area..."
//   );

//   try {
//     // 🧠 ONNX MODEL
//     const risk = await getRisk(user.lat, user.lng);

//     // 🗣️ LLaMA (Hugging Face)
//     const explanation = await generateRiskExplanation({
//       lat: user.lat,
//       lng: user.lng,
//       score: risk.score,
//       label: risk.label,
//       incidents: risk.incidentDensity
//     });

//     // Delete processing message
//     await bot.deleteMessage(msg.chat.id, processingMsg.message_id);

//     await bot.sendMessage(
//       msg.chat.id,
//       `🛡 *Sentinel Risk Assessment*

// 📍 *Location:*
// ${user.lat.toFixed(6)}, ${user.lng.toFixed(6)}

// ⚠️ *Risk Level:* ${risk.label}
// 📊 *Confidence:* ${(risk.score * 100).toFixed(1)}%

// 🧠 *AI Insight:*
// ${explanation}

// 🗺 *View on Dashboard:*
// https://sentinel-ai-dashboard.vercel.app

// 💡 *Tip:* Use /panic if you encounter danger`,
//       { parse_mode: "Markdown" }
//     );

//     console.log(`✅ Risk assessment completed for user ${msg.chat.id}: ${risk.label}`);
//   } catch (err) {
//     console.error("❌ Risk assessment error:", err);
    
//     // Delete processing message
//     try {
//       await bot.deleteMessage(msg.chat.id, processingMsg.message_id);
//     } catch (e) {
//       // Ignore if already deleted
//     }

//     bot.sendMessage(
//       msg.chat.id,
//       "⚠️ Unable to assess risk right now. Please try again in a moment."
//     );
//   }
// });

// export default bot;

import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import path from "path";
import { distanceKm } from "../services/geoService.js";
import { recordIncident } from "../services/incidentService.js";
import { getRisk } from "../services/riskService.js";
import { generateRiskExplanation } from "../services/llamaService.js";
import https from "https";

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error("❌ TELEGRAM_BOT_TOKEN missing");
  process.exit(1);
}

// Configure bot - simple config without proxy for now
const botOptions = { polling: false };

// Initialize bot
const bot = new TelegramBot(token, botOptions);

console.log(`🤖 Telegram bot initialized`);

// Handle polling errors gracefully
bot.on('polling_error', (error) => {
  console.error('⚠️ Telegram Polling Error:', error.code);
  
  if (error.code === 'EFATAL' || error.code === 'ETIMEDOUT') {
    console.error('🔌 Connection issue detected:');
    console.error('   - Your network is blocking Telegram servers');
    console.error('   - Try using a VPN or mobile hotspot');
    console.error('   - Or set up a proxy (see docs)');
  }
});

bot.on('error', (error) => {
  console.error('⚠️ Telegram Bot Error:', error);
});

// Function to test Telegram connectivity
async function testTelegramConnection() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${token}/getMe`,
      method: 'GET',
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => reject(error));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Connection timeout'));
    });

    req.end();
  });
}

export async function setupTelegramWebhook(app) {
  const NGROK_URL = process.env.NGROK_URL;
  const USE_NGROK = process.env.USE_NGROK === 'true';
  const WEBHOOK_URL = process.env.WEBHOOK_URL;
  const IS_PRODUCTION = process.env.NODE_ENV === 'production';

  // Test connectivity first
  console.log('🔍 Testing Telegram API connectivity...');
  try {
    await testTelegramConnection();
    console.log('✅ Successfully connected to Telegram API');
  } catch (error) {
    console.error('❌ Cannot connect to Telegram API:', error.message);
    console.error('\n🚨 NETWORK ISSUE DETECTED:');
    console.error('   Your network is blocking access to Telegram servers.');
    console.error('\n💡 SOLUTIONS:');
    console.error('   1. Use a VPN (Recommended)');
    console.error('   2. Use mobile hotspot');
    console.error('   3. Try a different network');
    console.error('   4. Set up HTTP proxy (advanced)');
    console.error('\n⚠️  Bot will continue running but webhook setup failed.');
    console.error('   The webhook endpoint is ready, but Telegram cannot be notified.\n');
  }

  const webhookPath = "/telegram-webhook";

  // ALWAYS set up the webhook endpoint (critical!)
  app.post(webhookPath, (req, res) => {
    console.log('📨 Webhook received at', new Date().toISOString());
    console.log('   Update ID:', req.body.update_id);
    console.log('   Message:', req.body.message?.text || req.body.message?.location || 'other');
    
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  console.log(`🎯 Webhook endpoint registered at: POST ${webhookPath}`);

  // Try to set webhook with Telegram
  let webhookUrl = null;

  if (IS_PRODUCTION && WEBHOOK_URL) {
    webhookUrl = `${WEBHOOK_URL}${webhookPath}`;
    console.log(`🌐 Production mode - Using WEBHOOK_URL: ${webhookUrl}`);
  } else if (USE_NGROK && NGROK_URL) {
    webhookUrl = `${NGROK_URL}${webhookPath}`;
    console.log(`🔧 Development mode - Using NGROK_URL: ${webhookUrl}`);
  } else if (!IS_PRODUCTION) {
    // Local development - try polling
    console.log("🤖 Attempting polling mode (development)");
    console.log("⚠️  If you get connection errors, use ngrok instead:");
    console.log("    1. Run: ngrok http 3000");
    console.log("    2. Set NGROK_URL in .env");
    console.log("    3. Set USE_NGROK=true in .env\n");
    
    try {
      bot.startPolling();
      console.log("✅ Polling started successfully\n");
    } catch (error) {
      console.error("❌ Failed to start polling:", error.message);
      console.error("💡 Please use ngrok webhook mode instead\n");
    }
    return; // Exit early for polling mode
  }

  // Set webhook with Telegram
  if (webhookUrl) {
    try {
      console.log('🧹 Clearing existing webhook...');
      await bot.deleteWebHook();
      
      console.log(`📡 Setting webhook to: ${webhookUrl}`);
      await bot.setWebHook(webhookUrl, {
        drop_pending_updates: true,
        allowed_updates: ["message", "callback_query"]
      });
      
      const info = await bot.getWebHookInfo();
      
      console.log('✅ Telegram webhook configured successfully!');
      console.log('📋 Webhook Info:', {
        url: info.url,
        pending_updates: info.pending_update_count,
        last_error: info.last_error_message || 'None'
      });
      
      if (info.last_error_message) {
        console.log('\n⚠️  WARNING: Webhook has errors!');
        console.log('   Last error:', info.last_error_message);
      }
      
      console.log('');
    } catch (err) {
      console.error("⚠️ Telegram Webhook Setup Failed");
      console.error("Error:", err.message);
      console.error("\n💡 The webhook endpoint is ready, but couldn't notify Telegram.");
      console.error("   Try setting it manually via browser.\n");
    }
  }
}

const usersPath = path.resolve("data/users.json");

// =======================
// SAFE FILE HELPERS
// =======================
function readUsers() {
  if (!fs.existsSync(usersPath)) {
    const dataDir = path.dirname(usersPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(usersPath, "[]");
  }
  return JSON.parse(fs.readFileSync(usersPath, "utf-8"));
}

function saveUsers(users) {
  const dataDir = path.dirname(usersPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}

// =======================
// START
// =======================
bot.onText(/\/start/, (msg) => {
  console.log(`📱 /start command from user ${msg.chat.id}`);
  bot.sendMessage(
    msg.chat.id,
    `🛡 *Sentinel AI*

Welcome to Sentinel - Your Personal Safety Assistant!

📍 *Share your location once* to enable alerts
🚨 Use */panic* in emergencies
🔍 Ask "*is this place safe?*" for risk assessment

🗺 Dashboard:
https://sentinelai-rvy7.onrender.com`,
    { parse_mode: "Markdown" }
  ).then(() => {
    console.log('✅ Welcome message sent successfully');
  }).catch(err => {
    console.error('❌ Failed to send welcome message:', err.message);
  });
});

// =======================
// LOCATION HANDLER
// =======================
bot.on("location", (msg) => {
  console.log(`📍 Location received from user ${msg.chat.id}`);
  const users = readUsers();

  const existing = users.find(u => u.chatId === msg.chat.id);

  if (!existing) {
    users.push({
      chatId: msg.chat.id,
      lat: msg.location.latitude,
      lng: msg.location.longitude,
      registeredAt: Date.now()
    });
    console.log(`✅ New user registered: ${msg.chat.id}`);
  } else {
    existing.lat = msg.location.latitude;
    existing.lng = msg.location.longitude;
    existing.lastUpdated = Date.now();
    console.log(`🔄 User location updated: ${msg.chat.id}`);
  }

  saveUsers(users);

  bot.sendMessage(msg.chat.id, "📍 Location saved. You will receive alerts for incidents within 5km of your location.");
});

// =======================
// PANIC
// =======================
bot.onText(/\/panic/, (msg) => {
  console.log(`🚨 PANIC alert from user ${msg.chat.id}`);
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

  let notifiedCount = 0;

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
https://sentinelai-rvy7.onrender.com

⚠️ Stay alert and ensure your safety.`,
        { parse_mode: "Markdown" }
      );
      notifiedCount++;
    }
  });

  console.log(`✅ Panic alert sent to ${notifiedCount} nearby users`);

  bot.sendMessage(
    msg.chat.id,
    `🚨 Alert sent successfully!

${notifiedCount} nearby user${notifiedCount !== 1 ? 's' : ''} ha${notifiedCount !== 1 ? 've' : 's'} been notified.

📍 Your location has been recorded.
🆘 Help may be on the way.`
  );
});

// =======================
// RISK ASSESSMENT
// =======================
bot.on("message", async (msg) => {
  if (!msg.text) return;

  const text = msg.text.toLowerCase();

  const triggers = [
    "is this place risky",
    "is this area safe",
    "is it safe here",
    "is this place safe",
    "is this safe",
    "safe here",
    "risk level",
    "/risk"
  ];

  if (!triggers.some(t => text.includes(t))) return;

  console.log(`🔍 Risk assessment request from user ${msg.chat.id}`);

  const users = readUsers();
  const user = users.find(u => u.chatId === msg.chat.id);

  if (!user) {
    return bot.sendMessage(
      msg.chat.id,
      "📍 Please share your location first so I can assess the risk in your area."
    );
  }

  // Send "analyzing" message
  const processingMsg = await bot.sendMessage(
    msg.chat.id,
    "🧠 Analyzing risk level for your area..."
  );

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

    // Delete processing message
    await bot.deleteMessage(msg.chat.id, processingMsg.message_id);

    await bot.sendMessage(
      msg.chat.id,
      `🛡 *Sentinel Risk Assessment*

📍 *Location:*
${user.lat.toFixed(6)}, ${user.lng.toFixed(6)}

⚠️ *Risk Level:* ${risk.label}
📊 *Confidence:* ${(risk.score * 100).toFixed(1)}%

🧠 *AI Insight:*
${explanation}

🗺 *View on Dashboard:*
https://sentinelai-rvy7.onrender.com

💡 *Tip:* Use /panic if you encounter danger`,
      { parse_mode: "Markdown" }
    );

    console.log(`✅ Risk assessment completed for user ${msg.chat.id}: ${risk.label}`);
  } catch (err) {
    console.error("❌ Risk assessment error:", err);
    
    // Delete processing message
    try {
      await bot.deleteMessage(msg.chat.id, processingMsg.message_id);
    } catch (e) {
      // Ignore if already deleted
    }

    bot.sendMessage(
      msg.chat.id,
      "⚠️ Unable to assess risk right now. Please try again in a moment."
    );
  }
});

export default bot;