// Fixed: Switched from weatherapi.com (paid, requires key) to Open-Meteo (free, no key needed)
// This matches the backend functions/utils/weather.js logic exactly
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

// Same location coordinates as backend constants.js
const LOCATIONS = {
  'Antigua': { lat: 17.0608, lon: -61.7964 },
  'Barbuda': { lat: 17.6274, lon: -61.7713 },
  'Nassau': { lat: 25.0443, lon: -77.3504 },
  'Freeport': { lat: 26.5384, lon: -78.6957 },
  // Fallback for other islands - center of Caribbean
  'default': { lat: 17.0608, lon: -61.7964 }
};

const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';

// Weather thresholds (same as backend constants.js)
const HEAVY_RAIN_THRESHOLD = 20; // mm/day
const HIGH_TEMP_THRESHOLD = 33;  // celsius
const DROUGHT_DAYS_THRESHOLD = 5;

export default function WeatherWidget({ location }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!location?.island) return;

    const fetchWeather = async () => {
      try {
        setLoading(true);
        setError(null);

        const coords = LOCATIONS[location.island] || LOCATIONS['default'];

        const url = `${WEATHER_API_URL}?` +
          `latitude=${coords.lat}&` +
          `longitude=${coords.lon}&` +
          `current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weathercode&` +
          `daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&` +
          `timezone=America%2FAntigua&` +
          `forecast_days=7`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Weather service unavailable (${response.status})`);
        }

        const data = await response.json();

        // Transform to our internal structure
        const transformed = {
          current: {
            temp: Math.round(data.current.temperature_2m),
            humidity: data.current.relative_humidity_2m,
            windSpeed: Math.round(data.current.wind_speed_10m),
            rainfall: data.current.precipitation,
            weatherCode: data.current.weathercode
          },
          forecast: data.daily.time.slice(0, 7).map((date, i) => ({
            day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
            high: Math.round(data.daily.temperature_2m_max[i]),
            low: Math.round(data.daily.temperature_2m_min[i]),
            rain: data.daily.precipitation_sum[i],
            weatherCode: data.daily.weathercode[i]
          })),
          alerts: generateAlerts(data)
        };

        setWeather(transformed);
      } catch (err) {
        console.error('Weather fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [location?.island]);

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
        <p>Loading weather for {location?.island}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.error}>
        <p>⚠️ Unable to load weather data</p>
        <p style={styles.errorSub}>{error}</p>
        <button
          style={styles.retryButton}
          onClick={() => setError(null) || setLoading(true)}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div style={styles.widget}>
      {/* Current Weather */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={styles.currentWeather}
      >
        <div style={styles.currentMain}>
          <div style={styles.tempDisplay}>
            <span style={styles.tempValue}>{weather.current.temp}°C</span>
            <span style={styles.condition}>{getWeatherDescription(weather.current.weatherCode)}</span>
          </div>
          <div style={styles.weatherIcon}>
            {getWeatherEmoji(weather.current.weatherCode)}
          </div>
        </div>

        <div style={styles.currentDetails}>
          <DetailItem icon="💧" label="Humidity" value={`${weather.current.humidity}%`} />
          <DetailItem icon="💨" label="Wind" value={`${weather.current.windSpeed} km/h`} />
          <DetailItem icon="🌧️" label="Rainfall" value={`${weather.current.rainfall} mm`} />
        </div>
      </motion.div>

      {/* Farming Alerts */}
      {weather.alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={styles.alertsSection}
        >
          <h4 style={styles.sectionTitle}>⚠️ Farming Alerts</h4>
          {weather.alerts.map((alert, i) => (
            <div key={i} style={{
              ...styles.alert,
              borderColor: alert.severity === 'warning' ? '#E6A93C' : '#7FB34D',
              background: alert.severity === 'warning' ? '#FFF4E6' : '#F0F9F4'
            }}>
              <div style={styles.alertHeader}>
                <span>{alert.icon}</span>
                <strong>{alert.title}</strong>
              </div>
              <p style={styles.alertMessage}>{alert.message}</p>
              {alert.farmingAdvice && (
                <ul style={styles.adviceList}>
                  {alert.farmingAdvice.map((tip, j) => <li key={j}>{tip}</li>)}
                </ul>
              )}
            </div>
          ))}
        </motion.div>
      )}

      {/* 7-Day Forecast */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={styles.forecast}
      >
        <h4 style={styles.sectionTitle}>7-Day Forecast</h4>
        <div style={styles.forecastGrid}>
          {weather.forecast.map((day, i) => (
            <ForecastDay key={i} day={day} />
          ))}
        </div>
      </motion.div>

      {/* Weather Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={styles.tipsSection}
      >
        <h4>🌱 Weather-Based Tips</h4>
        <ul style={styles.tipsList}>
          {getWeatherTips(weather).map((tip, i) => <li key={i}>{tip}</li>)}
        </ul>
      </motion.div>

      <p style={styles.footer}>
        Weather data for {location.island} • Open-Meteo • Updated hourly
      </p>
    </div>
  );
}

// Generate alerts using same logic as backend weather.js
function generateAlerts(data) {
  const alerts = [];
  const forecast = data.daily.precipitation_sum.slice(0, 7);
  const maxTemps = data.daily.temperature_2m_max.slice(0, 7);

  // Heavy rain alert
  const totalRain3Days = forecast.slice(0, 3).reduce((sum, r) => sum + r, 0);
  if (totalRain3Days > HEAVY_RAIN_THRESHOLD * 3) {
    alerts.push({
      type: 'heavy_rain',
      severity: 'warning',
      title: 'Heavy Rainfall Expected',
      message: `Heavy rain forecasted (${Math.round(totalRain3Days)}mm over 3 days). Check drainage, consider early harvest.`,
      icon: '🌧️',
      farmingAdvice: [
        'Check and clear drainage systems',
        'Harvest mature leafy greens early',
        'Delay transplanting seedlings',
        'Secure loose structures and equipment'
      ]
    });
  }

  // High temp alert
  const maxTemp = Math.max(...maxTemps.slice(0, 3));
  if (maxTemp > HIGH_TEMP_THRESHOLD) {
    alerts.push({
      type: 'high_temp',
      severity: 'info',
      title: 'High Temperature Alert',
      message: `Hot conditions expected (${maxTemp}°C). Ensure adequate irrigation and shade for sensitive plants.`,
      icon: '🌡️',
      farmingAdvice: [
        'Water early morning or late evening',
        'Add mulch to retain soil moisture',
        'Provide shade for sensitive crops',
        'Check plants twice daily for wilting'
      ]
    });
  }

  // Drought alert
  const isDrought = forecast.slice(0, DROUGHT_DAYS_THRESHOLD).every(r => r < 2);
  if (isDrought) {
    alerts.push({
      type: 'drought',
      severity: 'warning',
      title: 'Dry Conditions',
      message: `No significant rainfall expected for ${DROUGHT_DAYS_THRESHOLD}+ days. Increase irrigation frequency.`,
      icon: '☀️',
      farmingAdvice: [
        'Increase watering frequency',
        'Water deeply rather than shallowly',
        'Apply mulch around plant bases',
        'Prioritize water for fruiting crops'
      ]
    });
  }

  // Good conditions alert
  const avgTemp = maxTemps.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  const moderateRain = totalRain3Days > 5 && totalRain3Days < 20;
  if (avgTemp >= 25 && avgTemp <= 32 && moderateRain) {
    alerts.push({
      type: 'good_conditions',
      severity: 'info',
      title: 'Good Planting Conditions',
      message: 'Ideal conditions this week for planting. Moderate rainfall and good temperatures.',
      icon: '🌱',
      farmingAdvice: [
        'Good time to transplant seedlings',
        'Plant heat-loving crops (peppers, tomatoes)',
        'Sow seeds directly in garden',
        'Apply compost before planting'
      ]
    });
  }

  return alerts;
}

function getWeatherTips(weather) {
  const tips = [];
  const heavyRainDays = weather.forecast.filter(day => day.rain > 20);
  if (heavyRainDays.length > 0) tips.push('Heavy rain expected — check drainage and secure young plants');
  if (weather.current.humidity > 70) tips.push('High humidity — monitor crops for fungal diseases');
  const goodDays = weather.forecast.filter(day => day.rain < 5 && day.high < 32 && day.high > 24);
  if (goodDays.length >= 2) tips.push('Good planting conditions expected in the next few days');
  if (weather.current.windSpeed > 25) tips.push('Strong winds — secure tall plants and check supports');
  return tips.length > 0 ? tips : ['Weather conditions are favourable for normal farming activities'];
}

// WMO Weather Code mappings
function getWeatherDescription(code) {
  if (code === 0) return 'Clear sky';
  if (code <= 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code <= 49) return 'Foggy';
  if (code <= 59) return 'Drizzle';
  if (code <= 69) return 'Rain';
  if (code <= 79) return 'Snow';
  if (code <= 82) return 'Rain showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

function getWeatherEmoji(code) {
  if (code === 0) return '☀️';
  if (code <= 2) return '⛅';
  if (code === 3) return '☁️';
  if (code <= 49) return '🌫️';
  if (code <= 69) return '🌧️';
  if (code <= 79) return '🌨️';
  if (code <= 82) return '🌦️';
  if (code <= 99) return '⛈️';
  return '🌤️';
}

function DetailItem({ icon, label, value }) {
  return (
    <div style={styles.detailItem}>
      <span style={styles.detailIcon}>{icon}</span>
      <div>
        <div style={styles.detailLabel}>{label}</div>
        <div style={styles.detailValue}>{value}</div>
      </div>
    </div>
  );
}

function ForecastDay({ day }) {
  return (
    <motion.div whileHover={{ scale: 1.05 }} style={styles.forecastDay}>
      <div style={styles.dayName}>{day.day}</div>
      <div style={styles.dayIcon}>{getWeatherEmoji(day.weatherCode)}</div>
      <div style={styles.dayTemp}>
        <span style={styles.highTemp}>{day.high}°</span>
        <span style={styles.lowTemp}>{day.low}°</span>
      </div>
      <div style={styles.rainAmount}>
        <span>🌧️</span> {day.rain.toFixed(1)}mm
      </div>
    </motion.div>
  );
}

const styles = {
  widget: {
    background: "white",
    borderRadius: "16px",
    padding: "2rem",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    marginBottom: "2rem"
  },
  loading: {
    textAlign: "center",
    padding: "3rem",
    color: "#666"
  },
  spinner: {
    width: "40px",
    height: "40px",
    margin: "0 auto 1rem",
    border: "4px solid #f3f3f3",
    borderTop: "4px solid var(--soil-green)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  },
  error: {
    textAlign: "center",
    padding: "2rem",
    background: "#fef2f2",
    borderRadius: "8px"
  },
  errorSub: {
    color: "#666",
    fontSize: "0.9rem",
    marginTop: "0.5rem"
  },
  retryButton: {
    marginTop: "1rem",
    padding: "0.5rem 1.5rem",
    background: "var(--soil-green)",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.95rem"
  },
  currentWeather: { marginBottom: "2rem" },
  currentMain: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem"
  },
  tempDisplay: { display: "flex", flexDirection: "column" },
  tempValue: { fontSize: "3.5rem", fontWeight: "bold", color: "var(--ink-black)" },
  condition: { fontSize: "1.1rem", color: "#666" },
  weatherIcon: { fontSize: "4rem" },
  currentDetails: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "1rem"
  },
  detailItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "1rem",
    background: "#f9f9f9",
    borderRadius: "8px"
  },
  detailIcon: { fontSize: "1.5rem" },
  detailLabel: { fontSize: "0.8rem", color: "#666" },
  detailValue: { fontSize: "1.1rem", fontWeight: "600", color: "var(--ink-black)" },
  sectionTitle: { marginBottom: "1rem", color: "var(--ink-black)" },
  alertsSection: { marginBottom: "2rem" },
  alert: {
    border: "2px solid",
    borderRadius: "8px",
    padding: "1rem",
    marginBottom: "1rem"
  },
  alertHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginBottom: "0.5rem"
  },
  alertMessage: { color: "#666", fontSize: "0.9rem", marginLeft: "1.7rem" },
  adviceList: {
    marginTop: "0.5rem",
    marginLeft: "1.7rem",
    fontSize: "0.85rem",
    color: "#666",
    lineHeight: "1.8"
  },
  forecast: { marginBottom: "2rem" },
  forecastGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
    gap: "0.75rem"
  },
  forecastDay: {
    background: "#f9f9f9",
    padding: "0.75rem",
    borderRadius: "8px",
    textAlign: "center",
    cursor: "default"
  },
  dayName: { fontWeight: "600", marginBottom: "0.5rem", color: "var(--ink-black)", fontSize: "0.9rem" },
  dayIcon: { fontSize: "1.75rem", margin: "0.5rem 0" },
  dayTemp: { display: "flex", justifyContent: "center", gap: "0.4rem", margin: "0.5rem 0" },
  highTemp: { fontWeight: "bold", color: "var(--ink-black)", fontSize: "0.9rem" },
  lowTemp: { color: "#666", fontSize: "0.9rem" },
  rainAmount: { fontSize: "0.8rem", color: "#666", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.2rem" },
  tipsSection: {
    background: "#F0F9F4",
    padding: "1.5rem",
    borderRadius: "8px",
    border: "2px solid var(--soil-green)",
    marginBottom: "1rem"
  },
  tipsList: { marginTop: "1rem", paddingLeft: "1.5rem", lineHeight: "1.8", color: "#444" },
  footer: { textAlign: "center", color: "#999", fontSize: "0.8rem", marginTop: "1rem" }
};
