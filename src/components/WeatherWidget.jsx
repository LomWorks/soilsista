import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function WeatherWidget({ location }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock weather data - in production, integrate with IICA API
    const mockWeatherData = {
      current: {
        temp: 28,
        condition: "Partly Cloudy",
        humidity: 75,
        windSpeed: 15,
        rainfall: 0
      },
      forecast: [
        { day: "Today", high: 30, low: 24, condition: "Sunny", rain: 10 },
        { day: "Thu", high: 29, low: 23, condition: "Partly Cloudy", rain: 20 },
        { day: "Fri", high: 28, low: 23, condition: "Rainy", rain: 80 },
        { day: "Sat", high: 27, low: 22, condition: "Rainy", rain: 70 },
        { day: "Sun", high: 29, low: 24, condition: "Partly Cloudy", rain: 30 }
      ],
      alerts: [
        {
          type: "warning",
          title: "Heavy Rainfall Expected",
          message: "High chance of rain this weekend. Prepare drainage and consider early harvest."
        }
      ]
    };

    setTimeout(() => {
      setWeather(mockWeatherData);
      setLoading(false);
    }, 1000);
  }, [location]);

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>Loading weather data for {location.island}...</p>
      </div>
    );
  }

  if (!weather) {
    return (
      <div style={styles.error}>
        <p>Unable to load weather data</p>
        <p style={styles.errorSub}>
          Connect with IICA weather API in production for real-time data
        </p>
      </div>
    );
  }

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
            <span style={styles.condition}>{weather.current.condition}</span>
          </div>
          <div style={styles.weatherIcon}>
            {getWeatherEmoji(weather.current.condition)}
          </div>
        </div>
        
        <div style={styles.currentDetails}>
          <DetailItem icon="💧" label="Humidity" value={`${weather.current.humidity}%`} />
          <DetailItem icon="💨" label="Wind" value={`${weather.current.windSpeed} km/h`} />
          <DetailItem icon="🌧️" label="Rainfall" value={`${weather.current.rainfall} mm`} />
        </div>
      </motion.div>

      {/* Weather Alerts */}
      {weather.alerts && weather.alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={styles.alertsSection}
        >
          {weather.alerts.map((alert, i) => (
            <div key={i} style={styles.alert}>
              <div style={styles.alertHeader}>
                <span style={styles.alertIcon}>⚠️</span>
                <strong>{alert.title}</strong>
              </div>
              <p style={styles.alertMessage}>{alert.message}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* 5-Day Forecast */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={styles.forecast}
      >
        <h4 style={styles.forecastTitle}>5-Day Forecast</h4>
        <div style={styles.forecastGrid}>
          {weather.forecast.map((day, i) => (
            <ForecastDay key={i} day={day} />
          ))}
        </div>
      </motion.div>

      {/* Farming Tips Based on Weather */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={styles.tipsSection}
      >
        <h4>🌱 Weather-Based Tips</h4>
        <ul style={styles.tipsList}>
          <li>Heavy rain expected this weekend - check drainage systems</li>
          <li>High humidity levels - monitor for fungal diseases</li>
          <li>Good planting conditions expected early next week</li>
        </ul>
      </motion.div>

      <p style={styles.footer}>
        Data powered by IICA Climate Services • Updated hourly
      </p>
    </div>
  );
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
    <motion.div
      whileHover={{ scale: 1.05 }}
      style={styles.forecastDay}
    >
      <div style={styles.dayName}>{day.day}</div>
      <div style={styles.dayIcon}>{getWeatherEmoji(day.condition)}</div>
      <div style={styles.dayTemp}>
        <span style={styles.highTemp}>{day.high}°</span>
        <span style={styles.lowTemp}>{day.low}°</span>
      </div>
      <div style={styles.rainChance}>
        <span style={styles.rainIcon}>💧</span>
        {day.rain}%
      </div>
    </motion.div>
  );
}

function getWeatherEmoji(condition) {
  const emojiMap = {
    "Sunny": "☀️",
    "Partly Cloudy": "⛅",
    "Cloudy": "☁️",
    "Rainy": "🌧️",
    "Stormy": "⛈️",
    "Windy": "💨"
  };
  return emojiMap[condition] || "🌤️";
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
    background: "#fee",
    borderRadius: "8px"
  },
  errorSub: {
    color: "#666",
    fontSize: "0.9rem",
    marginTop: "0.5rem"
  },
  currentWeather: {
    marginBottom: "2rem"
  },
  currentMain: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem"
  },
  tempDisplay: {
    display: "flex",
    flexDirection: "column"
  },
  tempValue: {
    fontSize: "3.5rem",
    fontWeight: "bold",
    color: "var(--ink-black)"
  },
  condition: {
    fontSize: "1.2rem",
    color: "#666"
  },
  weatherIcon: {
    fontSize: "4rem"
  },
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
  detailIcon: {
    fontSize: "1.5rem"
  },
  detailLabel: {
    fontSize: "0.8rem",
    color: "#666"
  },
  detailValue: {
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "var(--ink-black)"
  },
  alertsSection: {
    marginBottom: "2rem"
  },
  alert: {
    background: "#FFF4E6",
    border: "2px solid var(--sun-mustard)",
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
  alertIcon: {
    fontSize: "1.2rem"
  },
  alertMessage: {
    color: "#666",
    fontSize: "0.9rem",
    marginLeft: "1.7rem"
  },
  forecast: {
    marginBottom: "2rem"
  },
  forecastTitle: {
    marginBottom: "1rem",
    color: "var(--ink-black)"
  },
  forecastGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
    gap: "1rem"
  },
  forecastDay: {
    background: "#f9f9f9",
    padding: "1rem",
    borderRadius: "8px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  dayName: {
    fontWeight: "600",
    marginBottom: "0.5rem",
    color: "var(--ink-black)"
  },
  dayIcon: {
    fontSize: "2rem",
    margin: "0.5rem 0"
  },
  dayTemp: {
    display: "flex",
    justifyContent: "center",
    gap: "0.5rem",
    margin: "0.5rem 0"
  },
  highTemp: {
    fontWeight: "bold",
    color: "var(--ink-black)"
  },
  lowTemp: {
    color: "#666"
  },
  rainChance: {
    fontSize: "0.85rem",
    color: "#666",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.25rem"
  },
  rainIcon: {
    fontSize: "0.9rem"
  },
  tipsSection: {
    background: "#F0F9F4",
    padding: "1.5rem",
    borderRadius: "8px",
    border: "2px solid var(--soil-green)",
    marginBottom: "1rem"
  },
  tipsList: {
    marginTop: "1rem",
    paddingLeft: "1.5rem"
  },
  footer: {
    textAlign: "center",
    color: "#999",
    fontSize: "0.85rem",
    marginTop: "1rem"
  }
};
