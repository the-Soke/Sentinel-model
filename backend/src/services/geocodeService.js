export async function geocodeLocation(location) {
  if (!location) return null;

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`,
    { headers: { "User-Agent": "SentinelAI/1.0" } }
  );

  const data = await res.json();
  if (!data.length) return null;

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    display: data[0].display_name
  };
}
