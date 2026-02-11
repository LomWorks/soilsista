// If we'd genuinely opted for Meteo there shouldn't be a need for an API key. 
// Unless the program requires such. 
// There are backend functions that aren't wired here, because the logic within the helpers in the functions directory is completely different from what we see here. 
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function WeatherWidget({ location }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use location.island for the API call
        const response = await fetch(
          `https://api.weatherapi.com/v1/forecast.json?key=${process.env.REACT_APP_WEATHER_API_KEY}&q=${location.island},Bahamas&days=5&aqi=no&alerts=yes`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch weather data');
        }

        const data = await response.json();

        // Transform API response to match our component structure
        const transformedData = {
          current: {
            temp: Math.round(data.current.temp_c),
            condition: data.current.condition.text,
            humidity: data.current.humidity,
            windSpeed: Math.round(data.current.wind_kph),
            rainfall: data.current.precip_mm
          },
          forecast: data.forecast.forecastday.map(day => ({
            day: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
            high: Math.round(day.day.maxtemp_c),
            low: Math.round(day.day.mintemp_c),
            condition: day.day.condition.text,
            rain: day.day.daily_chance_of_rain
          })),
          alerts: data.alerts?.alert?.map(alert => ({
            type: "warning",
            title: alert.headline,
            message: alert.desc
          })) || []
        };

        setWeather(transformedData);
        setLoading(false);
      } catch (err) {
        console.error('Weather fetch error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    if (location?.island) {
      fetchWeather();
    }
  }, [location]);

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>Loading weather data for {location.island}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.error}>
        <p>Unable to load weather data</p>
        <p style={styles.errorSub}>{error}</p>
      </div>
    );
  }

  if (!weather) {
    return (
      <div style={styles.error}>
        <p>No weather data available</p>
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
          {getWeatherTips(weather)}
        </ul>
      </motion.div>

      <p style={styles.footer}>
        Weather data for {location.island} • Updated hourly
      </p>
    </div>
  );
}

function getWeatherTips(weather) {
  const tips = [];
  
  // Check for heavy rain in forecast
  const heavyRainDays = weather.forecast.filter(day => day.rain > 60);
  if (heavyRainDays.length > 0) {
    tips.push('Heavy rain expected - check drainage systems and secure young plants');
  }
  
  // Check humidity
  if (weather.current.humidity > 70) {
    tips.push('High humidity levels - monitor crops for fungal diseases');
  }
  
  // Check for good planting conditions
  const goodDays = weather.forecast.filter(day => 
    day.rain < 30 && day.high < 32 && day.high > 24
  );
  if (goodDays.length >= 2) {
    tips.push('Good planting conditions expected in the next few days');
  }
  
  // Check wind
  if (weather.current.windSpeed > 25) {
    tips.push('Strong winds - secure tall plants and check supports');
  }
  
  return tips.length > 0 ? tips : ['Weather conditions are favorable for normal farming activities'];
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
  const conditionLower = condition.toLowerCase();
  
  if (conditionLower.includes('sunny') || conditionLower.includes('clear')) return '☀️';
  if (conditionLower.includes('partly cloudy')) return '⛅';
  if (conditionLower.includes('cloudy') || conditionLower.includes('overcast')) return '☁️';
  if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) return '🌧️';
  if (conditionLower.includes('storm') || conditionLower.includes('thunder')) return '⛈️';
  if (conditionLower.includes('wind')) return '💨';
  
  return '🌤️';
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