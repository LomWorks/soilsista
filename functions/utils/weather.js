const fetch = require('node-fetch');
const {
  WEATHER_API_URL,
  LOCATIONS,
  HEAVY_RAIN_THRESHOLD,
  HIGH_TEMP_THRESHOLD,
  DROUGHT_DAYS_THRESHOLD,
  CROP_THRESHOLDS
} = require('../config/constants');

/**
 * Fetch weather data from Open-Meteo API (FREE - no key needed!)
 */
async function fetchWeather(location) {
  try {
    const coords = LOCATIONS[location.island] || LOCATIONS['Antigua'];

    const url = `${WEATHER_API_URL}?` +
      `latitude=${coords.lat}&` +
      `longitude=${coords.lon}&` +
      `current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&` +
      `daily=temperature_2m_max,temperature_2m_min,precipitation_sum&` +
      `timezone=America/Antigua&` +
      `forecast_days=7`;

    const response = await fetch(url);
    const data = await response.json();

    return {
      current: {
        temp: Math.round(data.current.temperature_2m),
        humidity: data.current.relative_humidity_2m,
        windSpeed: Math.round(data.current.wind_speed_10m),
        precipitation: data.current.precipitation
      },
      forecast: data.daily.precipitation_sum.slice(0, 7),
      maxTemps: data.daily.temperature_2m_max.slice(0, 7),
      minTemps: data.daily.temperature_2m_min.slice(0, 7)
    };
  } catch (error) {
    console.error('Weather fetch error:', error);
    return null;
  }
}

/**
 * Derive the tightest thresholds for a user's active crop set.
 * crops: string[] — e.g. ["Tomatoes", "Okra", "Sweet Pepper"]
 * Returns a threshold object using the most conservative values across all crops,
 * falling back to global constants when a crop isn't found in CROP_THRESHOLDS.
 */
function getThresholdsForCrops(crops) {
  // Start with global fallbacks
  let thresholds = {
    heatStress:          HIGH_TEMP_THRESHOLD,
    coldStress:          5,
    rainMm:              HEAVY_RAIN_THRESHOLD,
    windAdvisory:        30,
    windCritical:        55,
    droughtEstablished:  DROUGHT_DAYS_THRESHOLD * 24, // convert days → hours
    rhRisk:              85
  };

  if (!crops || crops.length === 0) return thresholds;

  crops.forEach(cropName => {
    const key = cropName.toLowerCase().trim();
    const t = CROP_THRESHOLDS[key];
    if (!t) return; // not in lookup, global fallback still applies

    // Most conservative = lowest heat/rain/wind/drought, highest cold
    thresholds.heatStress         = Math.min(thresholds.heatStress,         t.heatStress);
    thresholds.coldStress         = Math.max(thresholds.coldStress,          t.coldStress);
    thresholds.rainMm             = Math.min(thresholds.rainMm,              t.rainMm);
    thresholds.windAdvisory       = Math.min(thresholds.windAdvisory,        t.windAdvisory);
    thresholds.windCritical       = Math.min(thresholds.windCritical,        t.windCritical);
    thresholds.droughtEstablished = Math.min(thresholds.droughtEstablished,  t.droughtEstablished);
    thresholds.rhRisk             = Math.max(thresholds.rhRisk,              t.rhRisk);
  });

  return thresholds;
}

/**
 * Analyse weather data and generate farming alerts.
 * Pass crops[] to get crop-specific thresholds instead of global fallbacks.
 */
function analyzeWeather(weather, crops = []) {
  const alerts = [];
  if (!weather) return alerts;

  const t = getThresholdsForCrops(crops);

  const cropLabel = crops && crops.length > 0
    ? `your ${crops.slice(0, 2).join(' & ')}${crops.length > 2 ? ' & more' : ''}`
    : 'your crops';

  // ── Heavy rain in next 3 days ──────────────────────────────────────────────
  const totalRain3d = weather.forecast.slice(0, 3).reduce((sum, r) => sum + r, 0);
  if (totalRain3d > t.rainMm * 3) {
    alerts.push({
      type: 'heavy_rain',
      severity: 'warning',
      title: 'Heavy Rainfall Expected',
      message: `Heavy rain forecasted (${Math.round(totalRain3d)}mm over 3 days) — above the ${t.rainMm}mm/day threshold for ${cropLabel}. Check drainage, consider early harvest of mature crops, and delay transplanting.`,
      icon: '🌧️',
      farmingAdvice: [
        'Check and clear drainage channels',
        'Harvest mature leafy crops and peppers before the rain hits',
        'Delay transplanting seedlings until rain passes',
        'Secure trellises and support structures'
      ]
    });
  }

  // ── High temperature ───────────────────────────────────────────────────────
  const maxTemp3d = Math.max(...weather.maxTemps.slice(0, 3));
  if (maxTemp3d > t.heatStress) {
    alerts.push({
      type: 'high_temp',
      severity: 'warning',
      title: 'Heat Stress Alert',
      message: `Temperatures expected to reach ${maxTemp3d}°C — above the ${t.heatStress}°C stress threshold for ${cropLabel}. Irrigate early morning and provide shade where possible.`,
      icon: '🌡️',
      farmingAdvice: [
        'Water early morning or late evening only',
        'Apply mulch to retain soil moisture and reduce root-zone heat',
        'Provide temporary shade cloth for sensitive crops',
        'Monitor for wilting twice daily'
      ]
    });
  }

  // ── Dry / drought conditions ───────────────────────────────────────────────
  // Convert droughtEstablished hours → days for comparison with forecast array (daily)
  const droughtDays = Math.ceil(t.droughtEstablished / 24);
  const dryDays = weather.forecast.slice(0, droughtDays).every(r => r < 2);
  if (dryDays) {
    alerts.push({
      type: 'drought',
      severity: 'warning',
      title: 'Dry Conditions Alert',
      message: `No significant rainfall expected for ${droughtDays} days — ${cropLabel} may show drought stress. Increase irrigation frequency and add mulch.`,
      icon: '☀️',
      farmingAdvice: [
        'Increase watering frequency — do not wait for visible wilting',
        'Water deeply at root zone, not surface',
        'Apply mulch to reduce evaporation',
        'Prioritise fruiting crops (peppers, tomatoes, cucumbers) for water'
      ]
    });
  }

  // ── Wind advisory ──────────────────────────────────────────────────────────
  // Open-Meteo returns current wind; check if it exceeds crop advisory threshold
  if (weather.current.windSpeed > t.windAdvisory) {
    const severity = weather.current.windSpeed > t.windCritical ? 'warning' : 'info';
    alerts.push({
      type: 'wind',
      severity,
      title: weather.current.windSpeed > t.windCritical ? 'Critical Wind Warning' : 'Wind Advisory',
      message: `Current winds at ${weather.current.windSpeed} km/h — ${severity === 'warning' ? 'above the critical damage threshold' : 'above the advisory threshold'} for ${cropLabel}.`,
      icon: '💨',
      farmingAdvice: [
        'Stake and tie tall crops (corn, tomatoes, peppers)',
        'Delay transplanting until winds ease',
        'Check and reinforce trellises and row covers',
        weather.current.windSpeed > t.windCritical ? 'Consider emergency harvest of mature produce' : 'Monitor conditions hourly'
      ]
    });
  }

  // ── Good planting conditions ───────────────────────────────────────────────
  const avgTemp3d = weather.maxTemps.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  const moderateRain = totalRain3d > 5 && totalRain3d <= t.rainMm * 2;
  const comfortableTemp = avgTemp3d >= 24 && avgTemp3d <= t.heatStress - 2;

  if (comfortableTemp && moderateRain) {
    alerts.push({
      type: 'good_conditions',
      severity: 'info',
      title: 'Good Planting Conditions',
      message: `Ideal conditions this week — moderate rainfall and temperatures well within range for ${cropLabel}.`,
      icon: '🌱',
      farmingAdvice: [
        'Good time to transplant seedlings',
        'Sow succession plantings directly in garden',
        'Apply compost before planting',
        'Plant heat-loving crops (peppers, tomatoes, okra)'
      ]
    });
  }

  return alerts;
}

module.exports = { fetchWeather, analyzeWeather, getThresholdsForCrops };