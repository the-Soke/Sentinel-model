import { sendWhatsApp } from "./twilioService.js";

export async function broadcastPanic({ latitude, longitude, phone }) {
  // =========================
  // 1️⃣ ALERT USER (IF PHONE PROVIDED)
  // =========================
  if (phone) {
    await sendWhatsApp(
      phone,
      `🚨 PANIC ALERT RECEIVED

Location:
Lat ${latitude}
Lng ${longitude}

Help is on the way. Stay safe.`
    );
  }

  // =========================
  // 2️⃣ FUTURE EXTENSIONS
  // =========================
  // • notify emergency contacts
  // • alert nearby users
  // • trigger admin dashboard
  // • increase risk score for area

  console.log("📢 Panic broadcast completed");
}
