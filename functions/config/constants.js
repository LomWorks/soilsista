// Configuration constants for Cloud Functions

module.exports = {
  // Weather API (Open-Meteo - FREE, no key needed!)
  WEATHER_API_URL: 'https://api.open-meteo.com/v1/forecast',

  // App URLs — update to soilsista.org once DNS is live
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

  // Location coordinates for Caribbean islands
  LOCATIONS: {
    'Antigua':  { lat: 17.0608, lon: -61.7964 },
    'Barbuda':  { lat: 17.6274, lon: -61.7713 },
    'Nassau':   { lat: 25.0443, lon: -77.3504 },
    'Freeport': { lat: 26.5384, lon: -78.6957 }
  },

  // ─── Per-crop weather stress thresholds ───────────────────────────────────
  // Sourced from `improved master_crops_ANNUALS` sheet in master_crops_and_plantings.xlsx.
  // Where multiple varieties exist the most conservative values are used.
  // Keys are lowercase crop names to match userData.currentCrops entries.
  //
  // Fields:
  //   heatStress      - °C above which plant suffers heat stress
  //   coldStress      - °C below which plant suffers cold stress
  //   rainMm          - mm/24hr above which rain becomes damaging
  //   windAdvisory    - km/h at which wind advisory is issued
  //   windCritical    - km/h at which wind causes physical damage
  //   droughtTransplant  - hrs without rain before drought alert (transplant stage)
  //   droughtEstablished - hrs without rain before drought alert (established stage)
  //   rhRisk          - % relative humidity above which disease risk rises
  CROP_THRESHOLDS: {
    'tomatoes':     { heatStress: 31, coldStress: 10, rainMm: 20, windAdvisory: 30, windCritical: 45, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 85 },
    'tomato':       { heatStress: 31, coldStress: 10, rainMm: 20, windAdvisory: 30, windCritical: 45, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 85 },
    'sweet pepper': { heatStress: 33, coldStress: 12, rainMm: 25, windAdvisory: 35, windCritical: 50, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 85 },
    'hot pepper':   { heatStress: 33, coldStress: 16, rainMm: 25, windAdvisory: 35, windCritical: 50, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 85 },
    'pepper':       { heatStress: 33, coldStress: 12, rainMm: 25, windAdvisory: 35, windCritical: 50, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 85 },
    'cucumber':     { heatStress: 32, coldStress: 12, rainMm: 15, windAdvisory: 30, windCritical: 45, droughtTransplant: 18, droughtEstablished: 48, rhRisk: 85 },
    'cabbage':      { heatStress: 24, coldStress:  5, rainMm: 25, windAdvisory: 40, windCritical: 60, droughtTransplant: 18, droughtEstablished: 48, rhRisk: 85 },
    'watermelon':   { heatStress: 36, coldStress: 15, rainMm: 30, windAdvisory: 45, windCritical: 65, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 85 },
    'corn':         { heatStress: 35, coldStress: 10, rainMm: 35, windAdvisory: 40, windCritical: 55, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 90 },
    'okra':         { heatStress: 37, coldStress: 15, rainMm: 35, windAdvisory: 40, windCritical: 55, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 90 },
    'cabbage':      { heatStress: 24, coldStress:  5, rainMm: 25, windAdvisory: 40, windCritical: 60, droughtTransplant: 18, droughtEstablished: 48, rhRisk: 85 },
    'kale':         { heatStress: 29, coldStress:  2, rainMm: 20, windAdvisory: 35, windCritical: 50, droughtTransplant: 18, droughtEstablished: 48, rhRisk: 85 },
    'lettuce':      { heatStress: 24, coldStress:  2, rainMm: 15, windAdvisory: 30, windCritical: 45, droughtTransplant: 12, droughtEstablished: 36, rhRisk: 90 },
    'amaranth':     { heatStress: 36, coldStress: 15, rainMm: 30, windAdvisory: 35, windCritical: 50, droughtTransplant: 18, droughtEstablished: 48, rhRisk: 85 },
    'callaloo':     { heatStress: 36, coldStress: 15, rainMm: 30, windAdvisory: 35, windCritical: 50, droughtTransplant: 18, droughtEstablished: 48, rhRisk: 85 },
    'arugula':      { heatStress: 25, coldStress:  2, rainMm: 15, windAdvisory: 30, windCritical: 45, droughtTransplant: 12, droughtEstablished: 36, rhRisk: 85 },
    'radish':       { heatStress: 25, coldStress:  2, rainMm: 20, windAdvisory: 45, windCritical: 60, droughtTransplant: 12, droughtEstablished: 36, rhRisk: 90 },
    'onion':        { heatStress: 30, coldStress:  5, rainMm: 15, windAdvisory: 45, windCritical: 60, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 90 },
    // Crops not in improved sheet — use sensible Caribbean defaults
    'eggplant':     { heatStress: 35, coldStress: 12, rainMm: 20, windAdvisory: 35, windCritical: 55, droughtTransplant: 24, droughtEstablished: 60, rhRisk: 85 },
    'pumpkin':      { heatStress: 35, coldStress: 12, rainMm: 25, windAdvisory: 40, windCritical: 60, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 85 },
    'sweet potato': { heatStress: 35, coldStress: 12, rainMm: 30, windAdvisory: 40, windCritical: 60, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 85 },
    'taro':         { heatStress: 33, coldStress: 15, rainMm: 25, windAdvisory: 35, windCritical: 55, droughtTransplant: 18, droughtEstablished: 48, rhRisk: 85 },
    'dasheen':      { heatStress: 33, coldStress: 15, rainMm: 25, windAdvisory: 35, windCritical: 55, droughtTransplant: 18, droughtEstablished: 48, rhRisk: 85 },
    'cassava':      { heatStress: 38, coldStress: 15, rainMm: 40, windAdvisory: 45, windCritical: 65, droughtTransplant: 48, droughtEstablished: 120, rhRisk: 90 },
    'banana':       { heatStress: 35, coldStress: 14, rainMm: 30, windAdvisory: 30, windCritical: 50, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 85 },
    'plantain':     { heatStress: 35, coldStress: 14, rainMm: 30, windAdvisory: 30, windCritical: 50, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 85 },
    'basil':        { heatStress: 33, coldStress: 10, rainMm: 15, windAdvisory: 25, windCritical: 40, droughtTransplant: 12, droughtEstablished: 36, rhRisk: 85 },
    'thyme':        { heatStress: 34, coldStress:  5, rainMm: 20, windAdvisory: 30, windCritical: 50, droughtTransplant: 18, droughtEstablished: 48, rhRisk: 80 },
    'rosemary':     { heatStress: 35, coldStress:  5, rainMm: 20, windAdvisory: 30, windCritical: 50, droughtTransplant: 24, droughtEstablished: 72, rhRisk: 80 },
    'mint':         { heatStress: 30, coldStress:  2, rainMm: 15, windAdvisory: 25, windCritical: 40, droughtTransplant: 12, droughtEstablished: 30, rhRisk: 85 },
    'chives':       { heatStress: 30, coldStress:  2, rainMm: 15, windAdvisory: 30, windCritical: 45, droughtTransplant: 12, droughtEstablished: 36, rhRisk: 85 },
    'parsley':      { heatStress: 28, coldStress:  2, rainMm: 15, windAdvisory: 30, windCritical: 45, droughtTransplant: 12, droughtEstablished: 36, rhRisk: 85 },
    'beets':        { heatStress: 29, coldStress:  2, rainMm: 20, windAdvisory: 35, windCritical: 50, droughtTransplant: 18, droughtEstablished: 48, rhRisk: 85 },
    'beet':         { heatStress: 29, coldStress:  2, rainMm: 20, windAdvisory: 35, windCritical: 50, droughtTransplant: 18, droughtEstablished: 48, rhRisk: 85 },
  }
};