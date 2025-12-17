// import fs from "fs";
// import path from "path";

// const dataDir = path.resolve("data");
// const INCIDENT_FILE = path.join(dataDir, "incidents.json");

// function ensureStorage() {
//   if (!fs.existsSync(dataDir)) {
//     fs.mkdirSync(dataDir);
//   }

//   if (!fs.existsSync(INCIDENT_FILE)) {
//     fs.writeFileSync(INCIDENT_FILE, "[]");
//   }
// }

// function loadIncidents() {
//   ensureStorage();
//   return JSON.parse(fs.readFileSync(INCIDENT_FILE, "utf-8"));
// }

// function saveIncidents(data) {
//   ensureStorage();
//   fs.writeFileSync(INCIDENT_FILE, JSON.stringify(data, null, 2));
// }

// export async function recordIncident({ type, latitude, longitude, phone }) {
//   const incidents = loadIncidents();

//   const incident = {
//     id: Date.now(),
//     type,
//     latitude: Number(latitude),
//     longitude: Number(longitude),
//     phone,
//     timestamp: new Date().toISOString()
//   };

//   incidents.push(incident);
//   saveIncidents(incidents);

//   return incident;
// }

import fs from "fs";
import path from "path";
import { distanceKm } from "./geoService.js";

const incidentsPath = path.resolve("data/incidents.json");

function loadIncidents() {
  if (!fs.existsSync(incidentsPath)) {
    fs.writeFileSync(incidentsPath, "[]");
  }
  return JSON.parse(fs.readFileSync(incidentsPath, "utf-8"));
}

// 🔴 RECORD INCIDENT
export function recordIncident(incident) {
  const incidents = loadIncidents();
  incidents.push(incident);
  fs.writeFileSync(incidentsPath, JSON.stringify(incidents, null, 2));
}

// 🟡 GET INCIDENTS NEAR A LOCATION
// export function getNearbyIncidents(lat, lng, radiusKm = 5) {
//   const incidents = loadIncidents();

//   return incidents.filter(i => {
//     if (!i.lat || !i.lng) return false;

//     const dist = distanceKm(
//       parseFloat(lat),
//       parseFloat(lng),
//       parseFloat(i.lat),
//       parseFloat(i.lng)
//     );

//     return dist <= radiusKm;
//   });
// }
export function getNearbyIncidents(lat, lng, radiusKm = 5) {
  const incidents = loadIncidents();

  return incidents.filter(i => {
    const dx = lat - i.lat;
    const dy = lng - i.lng;
    const distance = Math.sqrt(dx * dx + dy * dy) * 111; // rough km
    return distance <= radiusKm;
  });
}
