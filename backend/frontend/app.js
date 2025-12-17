const map = L.map("map").setView([9.06, 7.48], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png")
  .addTo(map);

fetch("/api/map-data")
  .then(res => res.json())
  .then(data => {
    data.forEach(p => {
      L.circle([p.lat, p.lng], {
        radius: 20000,
        color: "red"
      }).addTo(map);
    });
  });
