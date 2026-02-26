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
  
  // Weather thresholds
  HEAVY_RAIN_THRESHOLD: 20, // mm in a day
  HIGH_TEMP_THRESHOLD: 33, // celsius
  DROUGHT_DAYS_THRESHOLD: 5, // days without rain
  
  // Cleanup settings
  ACTIVITY_RETENTION_DAYS: 30,
  
  // Location coordinates for Caribbean islands
  LOCATIONS: {
    'Antigua': { lat: 17.0608, lon: -61.7964 },
    'Barbuda': { lat: 17.6274, lon: -61.7713 },
    'Nassau': { lat: 25.0443, lon: -77.3504 },
    'Freeport': { lat: 26.5384, lon: -78.6957 }
  }
};
