// export function buildFeatures(input) {
//   const {
//     state,
//     location,
//     hour,
//     casualties,
//     kidnapped,
//     pastIncidents,
//     dayOfYear,
//     week,
//     month,
//     timeOfDay
//   } = input;

//   // 🔐 Deterministic numeric encodings
//   const stateCode = hashToCode(state, 50);
//   const locationCode = hashToCode(location, 100);

//   // Fallback-safe numbers
//   const safe = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;

//   return [
//     stateCode,               // 0
//     locationCode,            // 1
//     safe(hour),              // 2
//     safe(timeOfDay),         // 3
//     1,                        // 4 attackType (generic)
//     safe(casualties),        // 5
//     safe(kidnapped),         // 6
//     1,                        // 7 weaponUsed (unknown)
//     safe(pastIncidents),     // 8
//     safe(dayOfYear ?? week ?? month) // 9 temporal signal
//   ];
// }

// // 🔢 Deterministic string → number
// function hashToCode(value, mod) {
//   if (!value || typeof value !== "string") return 0;

//   let hash = 0;
//   for (let i = 0; i < value.length; i++) {
//     hash = (hash + value.charCodeAt(i)) % mod;
//   }
//   return hash;
// }

export function buildFeatureVector(input) {
  const {
    state,
    location,
    hour,
    casualties,
    kidnapped,
    pastIncidents
  } = input;

  const stateCode = hashToCode(state, 37);
  const locationCode = hashToCode(location, 100);

  return [
    stateCode,
    locationCode,
    Number(hour ?? 0),
    1,
    1,
    Number(casualties ?? 0),
    Number(kidnapped ?? 0),
    1,
    Number(pastIncidents ?? 0),
    new Date().getDay()
  ];
}

function hashToCode(value, mod) {
  if (!value) return 0;
  return [...value].reduce((a, c) => a + c.charCodeAt(0), 0) % mod;
}
