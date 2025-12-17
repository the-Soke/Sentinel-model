import express from 'express';
import { geocodeLocation } from '../services/geocodeService.js';
import { inferRisk } from '../services/onnxService.js';
import { explainRisk, extractLocationFromText } from '../services/llamaService.js';
import { getModels } from '../models/index.js';
import { humanRiskText } from '../utils/riskUtils.js';

const router = express.Router();

// Predict by free text or coordinates
router.post('/predict', async (req, res) => {
  try {
    const { text, lat, lon } = req.body;
    let location = null;
    if (text && !lat) {
      // try to extract location phrase
      const extracted = await extractLocationFromText(text);
      location = extracted || text;
    }
    let coords = null;
    if (lat && lon) coords = { lat: Number(lat), lon: Number(lon), display_name: '' };
    else if (location) coords = await geocodeLocation(location);

    if (!coords) return res.status(400).json({ error: 'Could not determine coordinates. Send lat/lon or clearer place name.' });

    // Build raw features – minimal set; adapt to your model's expected fields
    const now = new Date();
    const raw = {
      State: 'Unknown',
      Location: location || coords.display_name || 'Unknown',
      TimeOfDay: now.getHours(),
      WeaponUsed: 'Unknown',
      Casualties: 0,
      Kidnapped: 0,
      PastIncidentsInArea: 0,
      DayOfYear: now.getDay(),
      Month: now.getMonth() + 1,
      Week: Math.ceil((now.getDate()) / 7)
    };

    const infer = await inferRisk(raw);
    const explanation = await explainRisk(infer.score, raw);
    const human = humanRiskText(infer.score, infer.classIndex);

    // persist risk point
    const { RiskPoint } = getModels();
    await RiskPoint.create({ label: infer.classIndex, score: infer.score, lat: coords.lat, lon: coords.lon, meta: raw });

    return res.json({ location: coords.display_name || location, lat: coords.lat, lon: coords.lon, risk: human, explanation, raw: infer.raw });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// risk map endpoint: return recent risk points (limit-able)
router.get('/risk-map', async (req, res) => {
  try {
    const { RiskPoint } = getModels();
    const points = await RiskPoint.findAll({ order: [['createdAt', 'DESC']], limit: 1000 });
    const out = points.map(p => ({ lat: p.lat, lon: p.lon, score: p.score, label: p.label }));
    return res.json(out);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server_error' });
  }
});

export default router;
