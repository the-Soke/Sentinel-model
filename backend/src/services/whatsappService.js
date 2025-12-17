import axios from 'axios';
const WA_TOKEN = process.env.WA_TOKEN;
const WA_PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID;

export async function sendWhatsAppText(to, body) {
  if (!WA_TOKEN || !WA_PHONE_NUMBER_ID) {
    console.log('[SIMULATED WA SEND] To:', to, '\n', body);
    return;
  }
  const url = `https://graph.facebook.com/v18.0/${WA_PHONE_NUMBER_ID}/messages`;
  try {
    await axios.post(url, {
      messaging_product: 'whatsapp',
      to,
      text: { body }
    }, {
      headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('WhatsApp send error', err?.response?.data || err.message);
  }
}
