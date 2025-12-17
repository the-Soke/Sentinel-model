import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH
);

const FROM = "whatsapp:+14155238886"; // Twilio sandbox

export async function sendWhatsApp(to, body) {
  return client.messages.create({
    from: FROM,
    to: `whatsapp:${to}`,
    body
  });
}
