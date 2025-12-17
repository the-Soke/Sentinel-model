import express from 'express';
import { sendWhatsAppText } from '../services/whatsappService.js';
import { geocodeLocation } from '../services/geocodeService.js';
import { extractLocationFromText, explainRisk } from '../services/llamaService.js';
import { inferRisk } from '../services/onnxService.js';
import { getModels } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import { humanRiskText } from '../utils/riskUtils.js';

const router = express.Router();

// webhook verification GET
router.get('/', (req, res) => {
  const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'sentinel_verify';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  }
  return res.sendStatus(400);
});

// message receiver POST
router.post('/', async (req, res) => {
  try {
    const body = req.body;
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const messages = changes?.value?.messages;
    if (!messages || messages.length === 0) return res.sendStatus(200);
    const message = messages[0];
    const from = message.from; // phone
    const text = message.text?.body || '';
    const lower = text.trim().toLowerCase();
    const { User, Incident } = getModels();

    // ensure user exists
    await User.upsert({ phone: from });

    // Commands:
    // risk LAT LNG | risk location name
    if (lower.startsWith('risk')) {
      // try parse coords
      const parts = text.replace(/,/g, ' ').split(/\s+/);
      let lat = parseFloat(parts[1]);
      let lon = parseFloat(parts[2]);
      let coords = null;
      let placeInput = null;
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        coords = { lat, lon, display_name: `${lat},${lon}` };
      } else {
        // try extract location phrase
        const extracted = await extractLocationFromText(text);
        placeInput = extracted || text.replace(/^risk/i, '').trim();
        coords = await geocodeLocation(placeInput);
      }
      if (!coords) {
        await sendWhatsAppText(from, 'Could not find that location. Send `risk LAT LNG` or a clear place name.');
        return res.sendStatus(200);
      }

      // build raw features (you can extend with DB-derived incident density)
      const now = new Date();
      const raw = {
        State: 'Unknown',
        Location: placeInput || coords.display_name || 'Unknown',
        TimeOfDay: now.getHours(),
        WeaponUsed: 'Unknown',
        Casualties: 0,
        Kidnapped: 0,
        PastIncidentsInArea: 0,
        DayOfYear: now.getDay(),
        Month: now.getMonth() + 1,
        Week: Math.ceil(now.getDate() / 7)
      };

      const infer = await inferRisk(raw);
      const explanation = await explainRisk(infer.score, raw);
      const human = humanRiskText(infer.score, infer.classIndex);

      // persist risk point
      const { RiskPoint } = getModels();
      await RiskPoint.create({ label: infer.classIndex, score: infer.score, lat: coords.lat, lon: coords.lon, meta: raw });

      const reply = `${human}\n\n${explanation}`;
      await sendWhatsAppText(from, reply);
      return res.sendStatus(200);
    }

    // panic/report
    if (lower.startsWith('panic') || lower.includes('panic') || lower.includes('i just saw') || lower.includes('bandit') || lower.includes('kidnap')) {
      // parse coords if in text
      const matches = text.match(/(-?\d+\.\d+)|(-?\d+)/g) || [];
      let lat = null, lon = null;
      if (matches.length >= 2) {
        lat = parseFloat(matches[0]); lon = parseFloat(matches[1]);
      }
      let coords = null;
      if (lat && lon) coords = { lat, lon, display_name: `${lat},${lon}` };
      else {
        const extracted = await extractLocationFromText(text);
        if (extracted) coords = await geocodeLocation(extracted);
      }
      const id = uuidv4();
      const ts = Date.now();
      await Incident.create({ id, reporter: from, lat: coords?.lat || null, lon: coords?.lon || null, text, ts });

      // update user last_report_time
      await User.update({ last_report_time: ts }, { where: { phone: from } });

      await sendWhatsAppText(from, `Your incident has been recorded (id: ${id}). Stay safe.`);
      // notify nearby subscribers if coords found
      if (coords) {
        const { User: U } = getModels();
        // naive find: read all users with coords and filter; for large scale use geo index
        const users = await U.findAll({ where: { lat: { [Symbol.for('not')]: null } } }); // quick; ensure at least exists
        // we'll query raw SQL for speed
        const nearby = [];
        for (const u of users) {
          if (!u.lat || !u.lon) continue;
          const d = haversineKm(coords.lat, coords.lon, u.lat, u.lon);
          if (d <= Number(process.env.BROADCAST_RADIUS_KM || 5)) nearby.push(u.phone);
        }
        const alertText = `🚨 Incident reported near ${coords.lat.toFixed(3)}, ${coords.lon.toFixed(3)} — avoid the area.`;
        for (const p of nearby) {
          if (p !== from) await sendWhatsAppText(p, alertText);
        }
      }
      return res.sendStatus(200);
    }

    // subscribe LAT LNG
    if (lower.startsWith('subscribe')) {
      const parts = text.replace(/,/g, ' ').split(/\s+/);
      const lat = parseFloat(parts[1]);
      const lon = parseFloat(parts[2]);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        await User.upsert({ phone: from, lat, lon, subscribed: true });
        await sendWhatsAppText(from, `Subscribed to alerts for location ${lat},${lon}`);
      } else {
        await sendWhatsAppText(from, 'To subscribe send: `subscribe LAT LNG`');
      }
      return res.sendStatus(200);
    }

    // fallback help
    const help = [
      "Hi — I'm SentinelAI. Commands:",
      "`risk LAT LNG` — check risk at coordinates or send `risk <place name>`",
      "`panic` — report an emergency",
      "`subscribe LAT LNG` — subscribe to nearby alerts"
    ].join('\n');
    await sendWhatsAppText(from, help);
    return res.sendStatus(200);

  } catch (err) {
    console.error('webhook handler error', err);
    return res.sendStatus(500);
  }
});

export default router;

// small haversine local function (since we used it)
function haversineKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
