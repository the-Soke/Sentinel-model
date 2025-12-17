export function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg(lat2 - lat1);
  const dLon = deg(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg(lat1)) *
      Math.cos(deg(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function deg(value) {
  return (value * Math.PI) / 180;
}
