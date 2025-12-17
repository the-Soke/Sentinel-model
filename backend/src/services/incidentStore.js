const incidents = [];

export function addIncident(lat, lng, from) {
  incidents.push({
    lat,
    lng,
    from,
    time: Date.now()
  });
}

export function getNearbyIncidents(lat, lng, radiusKm = 5) {
  return incidents.filter(i =>
    Math.abs(i.lat - lat) < 0.05 &&
    Math.abs(i.lng - lng) < 0.05
  );
}
