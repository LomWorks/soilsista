// Configuration constants for Cloud Functions

module.exports = {
  // App URLs
  APP_URL: 'https://soilsista.org',
  ADMIN_URL: 'https://soilsista.org/admin',
  DASHBOARD_URL: 'https://soilsista.org/dashboard',

  // Timezone
  TIMEZONE: 'America/Antigua',

  // Global fallback weather thresholds (used when crop-specific ones aren't available)
  HEAVY_RAIN_THRESHOLD: 20,    // mm in a day
  HIGH_TEMP_THRESHOLD: 33,     // celsius
  DROUGHT_DAYS_THRESHOLD: 5,   // days without significant rain

  // Cleanup settings
  ACTIVITY_RETENTION_DAYS: 30,

  // ── Location coordinates ────────────────────────────────────────────────────
  // Keys must match every possible value that can come out of Firestore's
  // location.island field. Add variants whenever a new onboarding option is added.
  // Lookup order in weather.js: exact → case-insensitive → partial → null (400).
  LOCATIONS: {
    // Antigua & Barbuda
    'Antigua':                    { lat: 17.0608,  lon: -61.7964 },
    'Barbuda':                    { lat: 17.6274,  lon: -61.7713 },

    // Bahamas — Nassau / New Providence (multiple Firestore variants)
    'Nassau':                     { lat: 25.0443,  lon: -77.3504 },
    'New Providence':             { lat: 25.0443,  lon: -77.3504 },
    'New Providence (Nassau)':    { lat: 25.0443,  lon: -77.3504 },

    // Bahamas — Grand Bahama
    'Freeport':                   { lat: 26.5384,  lon: -78.6957 },
    'Grand Bahama':               { lat: 26.5384,  lon: -78.6957 },
    'Grand Bahama (Freeport)':    { lat: 26.5384,  lon: -78.6957 },

    // Jamaica
    'Jamaica':                    { lat: 17.9970,  lon: -76.7936 },
    'Kingston':                   { lat: 17.9970,  lon: -76.7936 },
    'Kingston (Jamaica)':         { lat: 17.9970,  lon: -76.7936 },
    'Montego Bay':                { lat: 18.4762,  lon: -77.8939 },

    // Trinidad & Tobago
    'Trinidad':                   { lat: 10.6918,  lon: -61.2225 },
    'Tobago':                     { lat: 11.1871,  lon: -60.6898 },
    'Port of Spain':              { lat: 10.6540,  lon: -61.5190 },
    'Trinidad and Tobago':        { lat: 10.6918,  lon: -61.2225 },

    // Barbados
    'Barbados':                   { lat: 13.1939,  lon: -59.5432 },
    'Bridgetown':                 { lat: 13.1000,  lon: -59.6167 },
    'Bridgetown (Barbados)':      { lat: 13.1000,  lon: -59.6167 },

    // St. Lucia
    'Saint Lucia':                { lat: 13.9094,  lon: -60.9789 },
    'St. Lucia':                  { lat: 13.9094,  lon: -60.9789 },
    'St Lucia':                   { lat: 13.9094,  lon: -60.9789 },
    'Castries':                   { lat: 14.0101,  lon: -60.9875 },

    // Grenada
    'Grenada':                    { lat: 12.1165,  lon: -61.6790 },
    "St. George's":               { lat: 12.0564,  lon: -61.7485 },

    // St. Vincent & the Grenadines
    'Saint Vincent':              { lat: 13.2528,  lon: -61.1971 },
    'St. Vincent':                { lat: 13.2528,  lon: -61.1971 },
    'St Vincent':                 { lat: 13.2528,  lon: -61.1971 },
    'Kingstown':                  { lat: 13.1587,  lon: -61.2248 },

    // Dominica
    'Dominica':                   { lat: 15.3150,  lon: -61.3999 },
    'Roseau':                     { lat: 15.3017,  lon: -61.3881 },

    // St. Kitts & Nevis
    'Saint Kitts':                { lat: 17.3578,  lon: -62.7830 },
    'St. Kitts':                  { lat: 17.3578,  lon: -62.7830 },
    'Nevis':                      { lat: 17.1570,  lon: -62.5793 },
    'Basseterre':                 { lat: 17.2948,  lon: -62.7261 },

    // Guyana
    'Guyana':                     { lat: 4.8604,   lon: -58.9302 },
    'Georgetown':                 { lat: 6.8013,   lon: -58.1551 },
    'Georgetown (Guyana)':        { lat: 6.8013,   lon: -58.1551 },

    // Belize
    'Belize':                     { lat: 17.1899,  lon: -88.4976 },
    'Belize City':                { lat: 17.2510,  lon: -88.7590 },
  },

  // ─── Per-crop weather stress thresholds ───────────────────────────────────
  // Sourced from `improved master_crops_ANNUALS` sheet in master_crops_and_plantings.xlsx.
  // Where multiple varieties exist the most conservative values are used.
  // Keys are lowercase crop names to match userData.currentCrops entries.
  // Aliases (tomato/tomatoes, beet/beets, pepper, taro/dasheen) are intentional —
  // Caribbean users enter crop names in different ways and all variants must match.
  //
  // Fields:
  //   heatStress         - °C above which plant suffers heat stress
  //   coldStress         - °C below which plant suffers cold stress
  //   rainMm             - mm/24hr above which rain becomes damaging
  //   windAdvisory       - km/h at which wind advisory is issued
  //   windCritical       - km/h at which wind causes physical damage
  //   droughtTransplant  - hrs without rain before drought alert (transplant stage)
  //   droughtEstablished - hrs without rain before drought alert (established stage)
  //   rhRisk             - % relative humidity above which disease risk rises
  CROP_THRESHOLDS: {
    // ── Fruiting vegetables ──────────────────────────────────────────────────
    'tomatoes':       { heatStress: 31, coldStress: 10, rainMm: 20, windAdvisory: 30, windCritical: 45, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 85 },
    'tomato':         { heatStress: 31, coldStress: 10, rainMm: 20, windAdvisory: 30, windCritical: 45, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 85 },
    'sweet pepper':   { heatStress: 33, coldStress: 12, rainMm: 25, windAdvisory: 35, windCritical: 50, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 85 },
    'hot pepper':     { heatStress: 33, coldStress: 16, rainMm: 25, windAdvisory: 35, windCritical: 50, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 85 },
    'pepper':         { heatStress: 33, coldStress: 12, rainMm: 25, windAdvisory: 35, windCritical: 50, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 85 },
    'cucumber':       { heatStress: 32, coldStress: 12, rainMm: 15, windAdvisory: 30, windCritical: 45, droughtTransplant: 18, droughtEstablished: 48, rhRisk: 85 },
    'zucchini':       { heatStress: 32, coldStress: 10, rainMm: 20, windAdvisory: 35, windCritical: 55, droughtTransplant: 18, droughtEstablished: 48, rhRisk: 85 },
    'eggplant':       { heatStress: 35, coldStress: 12, rainMm: 20, windAdvisory: 35, windCritical: 55, droughtTransplant: 24, droughtEstablished: 60, rhRisk: 85 },
    'okra':           { heatStress: 37, coldStress: 15, rainMm: 35, windAdvisory: 40, windCritical: 55, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 90 },
    'watermelon':     { heatStress: 36, coldStress: 15, rainMm: 30, windAdvisory: 45, windCritical: 65, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 85 },
    'pumpkin':        { heatStress: 35, coldStress: 12, rainMm: 25, windAdvisory: 40, windCritical: 60, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 85 },

    // ── Leafy greens ─────────────────────────────────────────────────────────
    'kale':           { heatStress: 29, coldStress:  2, rainMm: 20, windAdvisory: 35, windCritical: 50, droughtTransplant: 18, droughtEstablished: 48, rhRisk: 85 },
    'lettuce':        { heatStress: 24, coldStress:  2, rainMm: 15, windAdvisory: 30, windCritical: 45, droughtTransplant: 12, droughtEstablished: 36, rhRisk: 90 },
    'romaine lettuce':{ heatStress: 24, coldStress:  2, rainMm: 15, windAdvisory: 30, windCritical: 45, droughtTransplant: 12, droughtEstablished: 36, rhRisk: 90 },
    'cabbage':        { heatStress: 24, coldStress:  5, rainMm: 25, windAdvisory: 40, windCritical: 60, droughtTransplant: 18, droughtEstablished: 48, rhRisk: 85 },
    'swiss chard':    { heatStress: 30, coldStress:  2, rainMm: 20, windAdvisory: 35, windCritical: 50, droughtTransplant: 18, droughtEstablished: 48, rhRisk: 85 },
    'amaranth':       { heatStress: 36, coldStress: 15, rainMm: 30, windAdvisory: 35, windCritical: 50, droughtTransplant: 18, droughtEstablished: 48, rhRisk: 85 },
    'callaloo':       { heatStress: 36, coldStress: 15, rainMm: 30, windAdvisory: 35, windCritical: 50, droughtTransplant: 18, droughtEstablished: 48, rhRisk: 85 },
    'asian greens':   { heatStress: 27, coldStress:  2, rainMm: 15, windAdvisory: 30, windCritical: 45, droughtTransplant: 12, droughtEstablished: 36, rhRisk: 85 },
    'arugula':        { heatStress: 25, coldStress:  2, rainMm: 15, windAdvisory: 30, windCritical: 45, droughtTransplant: 12, droughtEstablished: 36, rhRisk: 85 },

    // ── Root vegetables ───────────────────────────────────────────────────────
    'radish':         { heatStress: 25, coldStress:  2, rainMm: 20, windAdvisory: 45, windCritical: 60, droughtTransplant: 12, droughtEstablished: 36, rhRisk: 90 },
    'onion':          { heatStress: 30, coldStress:  5, rainMm: 15, windAdvisory: 45, windCritical: 60, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 90 },
    'beets':          { heatStress: 29, coldStress:  2, rainMm: 20, windAdvisory: 35, windCritical: 50, droughtTransplant: 18, droughtEstablished: 48, rhRisk: 85 },
    'beet':           { heatStress: 29, coldStress:  2, rainMm: 20, windAdvisory: 35, windCritical: 50, droughtTransplant: 18, droughtEstablished: 48, rhRisk: 85 },
    'sweet potato':   { heatStress: 35, coldStress: 12, rainMm: 30, windAdvisory: 40, windCritical: 60, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 85 },
    'taro':           { heatStress: 33, coldStress: 15, rainMm: 25, windAdvisory: 35, windCritical: 55, droughtTransplant: 18, droughtEstablished: 48, rhRisk: 85 },
    'dasheen':        { heatStress: 33, coldStress: 15, rainMm: 25, windAdvisory: 35, windCritical: 55, droughtTransplant: 18, droughtEstablished: 48, rhRisk: 85 },
    'cassava':        { heatStress: 38, coldStress: 15, rainMm: 40, windAdvisory: 45, windCritical: 65, droughtTransplant: 48, droughtEstablished: 120, rhRisk: 90 },

    // ── Grains & heavy feeders ────────────────────────────────────────────────
    'corn':           { heatStress: 35, coldStress: 10, rainMm: 35, windAdvisory: 40, windCritical: 55, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 90 },

    // ── Perennials & tree crops ───────────────────────────────────────────────
    'banana':         { heatStress: 35, coldStress: 14, rainMm: 30, windAdvisory: 30, windCritical: 50, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 85 },
    'plantain':       { heatStress: 35, coldStress: 14, rainMm: 30, windAdvisory: 30, windCritical: 50, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 85 },

    // ── Herbs ─────────────────────────────────────────────────────────────────
    'basil':          { heatStress: 33, coldStress: 10, rainMm: 15, windAdvisory: 25, windCritical: 40, droughtTransplant: 12, droughtEstablished: 36, rhRisk: 85 },
    'thyme':          { heatStress: 34, coldStress:  5, rainMm: 20, windAdvisory: 30, windCritical: 50, droughtTransplant: 18, droughtEstablished: 48, rhRisk: 80 },
    'rosemary':       { heatStress: 35, coldStress:  5, rainMm: 20, windAdvisory: 30, windCritical: 50, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 80 },
    'mint':           { heatStress: 30, coldStress:  2, rainMm: 15, windAdvisory: 25, windCritical: 40, droughtTransplant: 12, droughtEstablished: 30, rhRisk: 85 },
    'chives':         { heatStress: 30, coldStress:  2, rainMm: 15, windAdvisory: 30, windCritical: 45, droughtTransplant: 12, droughtEstablished: 36, rhRisk: 85 },
    'parsley':        { heatStress: 28, coldStress:  2, rainMm: 15, windAdvisory: 30, windCritical: 45, droughtTransplant: 12, droughtEstablished: 36, rhRisk: 85 },
  }
};