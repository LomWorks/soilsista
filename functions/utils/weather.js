const fetch = require('node-fetch');
const { 
  WEATHER_API_URL, 
  LOCATIONS,
  HEAVY_RAIN_THRESHOLD, 
  HIGH_TEMP_THRESHOLD,
  DROUGHT_DAYS_THRESHOLD
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
 * Analyze weather data and generate farming alerts
 */
function analyzeWeather(weather) {
  const alerts = [];
  
  if (!weather) return alerts;
  
  // Check for heavy rain in next 3 days
  const upcomingRain = weather.forecast.slice(0, 3);
  const totalRain = upcomingRain.reduce((sum, rain) => sum + rain, 0);
  
  if (totalRain > HEAVY_RAIN_THRESHOLD * 3) {
    alerts.push({
      type: 'heavy_rain',
      severity: 'warning',
      title: 'Heavy Rainfall Expected',
      message: `Heavy rain forecasted (${Math.round(totalRain)}mm over 3 days). Check drainage systems, consider early harvest of mature crops, and delay transplanting.`,
      icon: '🌧️',
      farmingAdvice: [
        'Check and clear drainage systems',
        'Harvest mature lettuce and leafy greens',
        'Delay transplanting seedlings',
        'Secure loose structures and equipment'
      ]
    });
  }
  
  // Check for high temperatures
  const maxTemp = Math.max(...weather.maxTemps.slice(0, 3));
  if (maxTemp > HIGH_TEMP_THRESHOLD) {
    alerts.push({
      type: 'high_temp',
      severity: 'info',
      title: 'High Temperature Alert',
      message: `Hot conditions expected (${maxTemp}°C). Ensure adequate irrigation and consider shade for sensitive plants.`,
      icon: '🌡️',
      farmingAdvice: [
        'Water early morning or late evening',
        'Add mulch to retain soil moisture',
        'Provide shade for sensitive crops',
        'Check plants twice daily for wilting'
      ]
    });
  }
  
  // Check for drought (no significant rain)
  const recentRain = weather.forecast.slice(0, DROUGHT_DAYS_THRESHOLD);
  const isDrought = recentRain.every(rain => rain < 2);
  
  if (isDrought) {
    alerts.push({
      type: 'drought',
      severity: 'warning',
      title: 'Dry Conditions',
      message: `No significant rainfall expected for ${DROUGHT_DAYS_THRESHOLD} days. Increase irrigation frequency and add mulch to retain moisture.`,
      icon: '☀️',
      farmingAdvice: [
        'Increase watering frequency',
        'Water deeply rather than frequently',
        'Apply mulch around plants',
        'Prioritize water for fruiting crops'
      ]
    });
  }
  
  // Check for good planting conditions
  const avgTemp = weather.maxTemps.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  const moderateRain = totalRain > 5 && totalRain < 20;
  
  if (avgTemp >= 25 && avgTemp <= 32 && moderateRain) {
    alerts.push({
      type: 'good_conditions',
      severity: 'info',
      title: 'Good Planting Conditions',
      message: `Ideal conditions this week for planting. Moderate rainfall and good temperatures expected.`,
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

module.exports = {
  fetchWeather,
  analyzeWeather
};
