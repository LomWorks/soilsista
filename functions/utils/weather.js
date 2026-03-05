const fetch = require('node-fetch');
const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const {
  LOCATIONS,
  HEAVY_RAIN_THRESHOLD,
  HIGH_TEMP_THRESHOLD,
  DROUGHT_DAYS_THRESHOLD,
  CROP_THRESHOLDS
} = require('../config/constants');

const CACHE_TTL_MS = 30 * 60 * 1000;

function describeTomorrowCode(code) {
  const map = {
    1000: 'Clear sky', 1100: 'Mostly clear', 1101: 'Partly cloudy',
    1102: 'Mostly cloudy', 1001: 'Cloudy', 2000: 'Fog',
    4000: 'Drizzle', 4001: 'Rain', 4200: 'Light rain',
    4201: 'Heavy rain', 8000: 'Thunderstorm',
  };
  return map[code] || 'Unknown';
}

// ── Shared fetch logic ────────────────────────────────────────────────────────

async function fetchFromTomorrowIO(island) {
  const apiKey = process.env.TOMORROW_KEY;
  if (!apiKey) throw new Error('TOMORROW_KEY environment variable not set');

  const coords = LOCATIONS[island] || LOCATIONS['Antigua'];
  const fields = [
    'temperature', 'temperatureMax', 'temperatureMin',
    'humidity', 'windSpeed', 'windGust',
    'precipitationIntensity', 'precipitationProbability', 'weatherCode',
  ].join(',');

  const url =
    `https://api.tomorrow.io/v4/timelines` +
    `?location=${coords.lat},${coords.lon}` +
    `&fields=${fields}&units=metric` +
    `&timesteps=current,1d&startTime=now&endTime=nowPlus7d` +
    `&apikey=${apiKey}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const response = await fetch(url, { signal: controller.signal });
  clearTimeout(timeout);

  if (!response.ok) throw new Error(`Tomorrow.io ${response.status}: ${await response.text()}`);

  const raw = await response.json();
  const timelines = raw.data.timelines;
  const currentVals = timelines.find(t => t.timestep === 'current').intervals[0].values;
  const daily = timelines.find(t => t.timestep === '1d').intervals.slice(0, 7);

  return {
    island,
    current: {
      temp:      Math.round(currentVals.temperature),
      humidity:  currentVals.humidity,
      windSpeed: Math.round(currentVals.windSpeed),
      windGust:  Math.round(currentVals.windGust || currentVals.windSpeed),
      rainfall:  parseFloat((currentVals.precipitationIntensity || 0).toFixed(1)),
      label:     describeTomorrowCode(currentVals.weatherCode),
      emoji:     getEmoji(currentVals.weatherCode),
    },
    forecast: daily.map(i => ({
      day:      new Date(i.startTime).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Antigua' }),
      high:     Math.round(i.values.temperatureMax ?? i.values.temperature),
      low:      Math.round(i.values.temperatureMin ?? i.values.temperature),
      rain:     parseFloat((i.values.precipitationIntensity || 0).toFixed(1)),
      rainProb: i.values.precipitationProbability || 0,
      label:    describeTomorrowCode(i.values.weatherCode),
      emoji:    getEmoji(i.values.weatherCode),
    })),
    fetchedAt: Date.now(),
  };
}

function getEmoji(code) {
  if (code === 1000) return '☀️';
  if (code <= 1101) return '⛅';
  if (code <= 1102) return '🌥️';
  if (code === 1001) return '☁️';
  if (code === 2000) return '🌫️';
  if (code <= 4200) return '🌦️';
  if (code <= 4201) return '🌧️';
  if (code === 8000) return '⛈️';
  return '🌤️';
}

// ── HTTP endpoint — called by WeatherWidget frontend ─────────────────────────

const getWeather = functions
  .runWith({ timeoutSeconds: 20, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    const island = req.query.island || 'Antigua';
    const cacheKey = `weather_cache_${island.toLowerCase().replace(/\s/g, '_')}`;
    const cacheRef = admin.firestore().collection('_cache').doc(cacheKey);

    try {
      const cacheSnap = await cacheRef.get();
      if (cacheSnap.exists && Date.now() - cacheSnap.data().fetchedAt < CACHE_TTL_MS) {
        res.set('X-Cache', 'HIT');
        res.json(cacheSnap.data().data);
        return;
      }

      const weatherData = await fetchFromTomorrowIO(island);
      await cacheRef.set({ data: weatherData, fetchedAt: Date.now() });
      res.set('X-Cache', 'MISS');
      res.json(weatherData);

    } catch (err) {
      console.error('getWeather error:', err.message);
      // Stale cache fallback
      try {
        const stale = await cacheRef.get();
        if (stale.exists) { res.set('X-Cache', 'STALE'); res.json({ ...stale.data().data, stale: true }); return; }
      } catch (_) {}
      res.status(500).json({ error: err.message });
    }
  });

// ── Used by dailyTasks — checks cache first, calls Tomorrow.io if stale ──────

async function fetchWeather(location) {
  const island = location?.island || 'Antigua';
  const cacheKey = `weather_cache_${island.toLowerCase().replace(/\s/g, '_')}`;
  const cacheRef = admin.firestore().collection('_cache').doc(cacheKey);

  try {
    const cacheSnap = await cacheRef.get();
    if (cacheSnap.exists && Date.now() - cacheSnap.data().fetchedAt < CACHE_TTL_MS) {
      console.log(`[weather.js] Cache hit for ${island}`);
      return transformForAnalysis(cacheSnap.data().data);
    }

    const weatherData = await fetchFromTomorrowIO(island);
    await cacheRef.set({ data: weatherData, fetchedAt: Date.now() });
    console.log(`[weather.js] Fetched from Tomorrow.io for ${island}`);
    return transformForAnalysis(weatherData);

  } catch (err) {
    console.error('[weather.js] fetchWeather error:', err.message);
    try {
      const stale = await cacheRef.get();
      if (stale.exists) return transformForAnalysis(stale.data().data);
    } catch (_) {}
    return null;
  }
}

function transformForAnalysis(data) {
  return {
    current: {
      temp:          data.current.temp,
      humidity:      data.current.humidity,
      windSpeed:     data.current.windSpeed,
      precipitation: data.current.rainfall,
    },
    forecast:  data.forecast.map(d => d.rain),
    maxTemps:  data.forecast.map(d => d.high),
    minTemps:  data.forecast.map(d => d.low),
    rainProbs: data.forecast.map(d => d.rainProb),
  };
}

// ── Threshold + alert logic ───────────────────────────────────────────────────

function getThresholdsForCrops(crops) {
  let t = {
    heatStress: HIGH_TEMP_THRESHOLD, coldStress: 5,
    rainMm: HEAVY_RAIN_THRESHOLD, windAdvisory: 30, windCritical: 55,
    droughtEstablished: DROUGHT_DAYS_THRESHOLD * 24, rhRisk: 85
  };
  if (!crops || crops.length === 0) return t;
  crops.forEach(cropName => {
    const key = cropName.toLowerCase().replace(/\s*\(.*\)/, '').trim();
    const c = CROP_THRESHOLDS[key];
    if (!c) return;
    t.heatStress         = Math.min(t.heatStress,         c.heatStress);
    t.coldStress         = Math.max(t.coldStress,          c.coldStress);
    t.rainMm             = Math.min(t.rainMm,              c.rainMm);
    t.windAdvisory       = Math.min(t.windAdvisory,        c.windAdvisory);
    t.windCritical       = Math.min(t.windCritical,        c.windCritical);
    t.droughtEstablished = Math.min(t.droughtEstablished,  c.droughtEstablished);
    t.rhRisk             = Math.max(t.rhRisk,              c.rhRisk);
  });
  return t;
}

function analyzeWeather(weather, crops = []) {
  const alerts = [];
  if (!weather) return alerts;

  const t = getThresholdsForCrops(crops);
  const cropLabel = crops.length > 0
    ? `your ${crops.slice(0, 2).map(c => c.replace(/\s*\(.*\)/, '').trim()).join(' & ')}${crops.length > 2 ? ' & more' : ''}`
    : 'your crops';

  const totalRain3d = weather.forecast.slice(0, 3).reduce((s, r) => s + r, 0);
  const maxTemp3d   = Math.max(...weather.maxTemps.slice(0, 3));

  if (totalRain3d > t.rainMm * 3)
    alerts.push({ type: 'heavy_rain', severity: 'warning', icon: '🌧️',
      title: 'Heavy Rainfall Expected',
      message: `Heavy rain forecasted (${Math.round(totalRain3d)}mm over 3 days) — above the ${t.rainMm}mm threshold for ${cropLabel}.`,
      farmingAdvice: ['Clear drainage channels', 'Harvest mature crops before rain hits', 'Delay transplanting', 'Secure trellises'] });

  if (maxTemp3d > t.heatStress)
    alerts.push({ type: 'high_temp', severity: 'warning', icon: '🌡️',
      title: 'Heat Stress Alert',
      message: `Temperatures reaching ${maxTemp3d}°C — above the ${t.heatStress}°C threshold for ${cropLabel}.`,
      farmingAdvice: ['Water at dawn or dusk only', 'Apply mulch to root zone', 'Add shade cloth', 'Monitor for wilting twice daily'] });

  const droughtDays = Math.ceil(t.droughtEstablished / 24);
  if (weather.forecast.slice(0, droughtDays).every(r => r < 2))
    alerts.push({ type: 'drought', severity: 'warning', icon: '☀️',
      title: 'Dry Conditions Alert',
      message: `No significant rain expected for ${droughtDays} days — ${cropLabel} will need irrigation.`,
      farmingAdvice: ['Increase watering frequency', 'Water deeply at root zone', 'Mulch to reduce evaporation', 'Prioritise fruiting crops'] });

  if (weather.current.windSpeed > t.windAdvisory) {
    const sev = weather.current.windSpeed > t.windCritical ? 'warning' : 'info';
    alerts.push({ type: 'wind', severity: sev, icon: '💨',
      title: sev === 'warning' ? 'Critical Wind Warning' : 'Wind Advisory',
      message: `Winds at ${weather.current.windSpeed} km/h — ${sev === 'warning' ? 'above critical threshold' : 'above advisory threshold'} for ${cropLabel}.`,
      farmingAdvice: ['Stake tall crops', 'Delay transplanting', 'Check trellises',
        sev === 'warning' ? 'Consider emergency harvest' : 'Monitor hourly'] });
  }

  const avgTemp3d = weather.maxTemps.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  if (alerts.length === 0 && avgTemp3d >= 24 && avgTemp3d <= t.heatStress - 2 && totalRain3d > 5 && totalRain3d <= t.rainMm * 2)
    alerts.push({ type: 'good_conditions', severity: 'info', icon: '🌱',
      title: 'Good Planting Conditions',
      message: `Ideal conditions this week — moderate rainfall and temperatures within range for ${cropLabel}.`,
      farmingAdvice: ['Good time to transplant', 'Sow succession plantings', 'Apply compost', 'Plant heat-loving crops'] });

  return alerts;
}

module.exports = { getWeather, fetchWeather, analyzeWeather, getThresholdsForCrops };