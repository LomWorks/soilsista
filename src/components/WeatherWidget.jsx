// WeatherWidget.jsx
// Fetches from getWeather Cloud Function (Tomorrow.io, server-side cached).
// Crop-specific thresholds mirror backend constants.js CROP_THRESHOLDS.

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

const FUNCTION_URL = "https://us-central1-soil-sista.cloudfunctions.net/getWeather";

// ── Per-crop thresholds (mirrors backend constants.js CROP_THRESHOLDS) ────────
const CROP_THRESHOLDS = {
  'tomatoes':        { heatStress: 31, coldStress: 10, rainMm: 20, windAdvisory: 30, windCritical: 45, droughtHrs: 72,  rhRisk: 85 },
  'tomato':          { heatStress: 31, coldStress: 10, rainMm: 20, windAdvisory: 30, windCritical: 45, droughtHrs: 72,  rhRisk: 85 },
  'sweet pepper':    { heatStress: 33, coldStress: 12, rainMm: 25, windAdvisory: 35, windCritical: 50, droughtHrs: 72,  rhRisk: 85 },
  'sweet peppers':   { heatStress: 33, coldStress: 12, rainMm: 25, windAdvisory: 35, windCritical: 50, droughtHrs: 72,  rhRisk: 85 },
  'hot pepper':      { heatStress: 33, coldStress: 16, rainMm: 25, windAdvisory: 35, windCritical: 50, droughtHrs: 72,  rhRisk: 85 },
  'pepper':          { heatStress: 33, coldStress: 12, rainMm: 25, windAdvisory: 35, windCritical: 50, droughtHrs: 72,  rhRisk: 85 },
  'cucumber':        { heatStress: 32, coldStress: 12, rainMm: 15, windAdvisory: 30, windCritical: 45, droughtHrs: 48,  rhRisk: 85 },
  'cabbage':         { heatStress: 24, coldStress:  5, rainMm: 25, windAdvisory: 40, windCritical: 60, droughtHrs: 48,  rhRisk: 85 },
  'watermelon':      { heatStress: 36, coldStress: 15, rainMm: 30, windAdvisory: 45, windCritical: 65, droughtHrs: 72,  rhRisk: 85 },
  'corn':            { heatStress: 35, coldStress: 10, rainMm: 35, windAdvisory: 40, windCritical: 55, droughtHrs: 72,  rhRisk: 90 },
  'okra':            { heatStress: 37, coldStress: 15, rainMm: 35, windAdvisory: 40, windCritical: 55, droughtHrs: 72,  rhRisk: 90 },
  'kale':            { heatStress: 29, coldStress:  2, rainMm: 20, windAdvisory: 35, windCritical: 50, droughtHrs: 48,  rhRisk: 85 },
  'lettuce':         { heatStress: 24, coldStress:  2, rainMm: 15, windAdvisory: 30, windCritical: 45, droughtHrs: 36,  rhRisk: 90 },
  'romaine lettuce': { heatStress: 24, coldStress:  2, rainMm: 15, windAdvisory: 30, windCritical: 45, droughtHrs: 36,  rhRisk: 90 },
  'amaranth':        { heatStress: 36, coldStress: 15, rainMm: 30, windAdvisory: 35, windCritical: 50, droughtHrs: 48,  rhRisk: 85 },
  'callaloo':        { heatStress: 36, coldStress: 15, rainMm: 30, windAdvisory: 35, windCritical: 50, droughtHrs: 48,  rhRisk: 85 },
  'arugula':         { heatStress: 25, coldStress:  2, rainMm: 15, windAdvisory: 30, windCritical: 45, droughtHrs: 36,  rhRisk: 85 },
  'radish':          { heatStress: 25, coldStress:  2, rainMm: 20, windAdvisory: 45, windCritical: 60, droughtHrs: 36,  rhRisk: 90 },
  'onion':           { heatStress: 30, coldStress:  5, rainMm: 15, windAdvisory: 45, windCritical: 60, droughtHrs: 72,  rhRisk: 90 },
  'swiss chard':     { heatStress: 30, coldStress:  2, rainMm: 20, windAdvisory: 35, windCritical: 50, droughtHrs: 48,  rhRisk: 85 },
  'zucchini':        { heatStress: 33, coldStress: 10, rainMm: 20, windAdvisory: 35, windCritical: 55, droughtHrs: 48,  rhRisk: 85 },
  'asian greens':    { heatStress: 27, coldStress:  2, rainMm: 15, windAdvisory: 25, windCritical: 40, droughtHrs: 24,  rhRisk: 85 },
  'basil':           { heatStress: 33, coldStress: 10, rainMm: 15, windAdvisory: 25, windCritical: 40, droughtHrs: 36,  rhRisk: 85 },
};

const GLOBAL_FALLBACK = {
  heatStress: 33, coldStress: 5, rainMm: 20,
  windAdvisory: 30, windCritical: 55, droughtHrs: 120, rhRisk: 85
};

function getThresholdsForCrops(crops) {
  if (!crops || crops.length === 0) return GLOBAL_FALLBACK;
  let t = { ...GLOBAL_FALLBACK };
  crops.forEach(cropName => {
    const key = cropName.toLowerCase().replace(/\s*\(.*\)/, "").trim();
    const c = CROP_THRESHOLDS[key];
    if (!c) return;
    t.heatStress   = Math.min(t.heatStress,   c.heatStress);
    t.coldStress   = Math.max(t.coldStress,    c.coldStress);
    t.rainMm       = Math.min(t.rainMm,        c.rainMm);
    t.windAdvisory = Math.min(t.windAdvisory,  c.windAdvisory);
    t.windCritical = Math.min(t.windCritical,  c.windCritical);
    t.droughtHrs   = Math.min(t.droughtHrs,    c.droughtHrs);
    t.rhRisk       = Math.max(t.rhRisk,        c.rhRisk);
  });
  return t;
}

// ── Build alerts from Tomorrow.io shaped data (from Cloud Function) ───────────
// weather.current: { temp, humidity, windSpeed, windGust, rainfall, label, emoji }
// weather.forecast: [{ day, high, low, rain, rainProb, label, emoji }]
function buildAlerts(weather, crops, t) {
  const alerts = [];
  const forecastRain = weather.forecast.map(d => d.rain);
  const forecastHighs = weather.forecast.map(d => d.high);
  const currentWind = weather.current.windSpeed;
  const currentHumidity = weather.current.humidity;

  const cropLabel = crops.length > 0
    ? `your ${crops.slice(0, 2).map(c => c.replace(/\s*\(.*\)/, "")).join(" & ")}${crops.length > 2 ? " & more" : ""}`
    : "your crops";

  const rain3d = forecastRain.slice(0, 3).reduce((s, r) => s + r, 0);
  const maxTemp3d = Math.max(...forecastHighs.slice(0, 3));

  if (rain3d > t.rainMm * 2.5)
    alerts.push({ severity: "warning", icon: "🌧️", title: "Heavy Rainfall Warning",
      message: `${Math.round(rain3d)}mm expected over 3 days — above the ${t.rainMm}mm threshold for ${cropLabel}.`,
      advice: ["Clear drainage channels before rain arrives", "Harvest mature leafy crops and peppers now", "Delay transplanting until conditions dry out", "Secure trellises, stakes, and shade cloth"] });

  if (maxTemp3d >= t.heatStress)
    alerts.push({ severity: "warning", icon: "🌡️", title: "Heat Stress Alert",
      message: `Temperatures reaching ${maxTemp3d}°C — above the ${t.heatStress}°C stress threshold for ${cropLabel}.`,
      advice: ["Water only at dawn or dusk to reduce evaporation", "Apply mulch to keep root zone cool", "Add shade cloth (30–50%) over sensitive beds", "Watch for wilting twice daily"] });

  const droughtDays = Math.ceil(t.droughtHrs / 24);
  if (forecastRain.slice(0, Math.min(droughtDays, 7)).every(r => r < 2))
    alerts.push({ severity: "warning", icon: "☀️", title: "Dry Conditions Alert",
      message: `No meaningful rain forecast for ${droughtDays}+ days — ${cropLabel} will need manual irrigation.`,
      advice: ["Increase watering frequency — don't wait for wilting", "Water deeply at root zone, not the surface", "Prioritise fruiting crops (peppers, tomatoes, cucumbers)", "Mulch exposed soil to cut evaporation by up to 50%"] });

  if (currentWind >= t.windAdvisory) {
    const isCritical = currentWind >= t.windCritical;
    alerts.push({ severity: isCritical ? "warning" : "info", icon: "💨",
      title: isCritical ? "Critical Wind Warning" : "Wind Advisory",
      message: `Current winds at ${Math.round(currentWind)} km/h — ${isCritical ? "above the critical damage threshold" : "above the advisory threshold"} for ${cropLabel}.`,
      advice: isCritical
        ? ["Consider emergency harvest of mature produce", "Stake and tie all tall crops immediately", "Remove shade cloth to prevent tearing", "Delay all fieldwork until winds ease"]
        : ["Stake and tie tall crops (corn, tomatoes, peppers)", "Delay transplanting until winds settle", "Check row covers and trellises", "Monitor conditions hourly"] });
  }

  if (currentHumidity >= t.rhRisk && rain3d > 5)
    alerts.push({ severity: "info", icon: "🍄", title: "Disease Risk — High Humidity",
      message: `Humidity at ${currentHumidity}% with recent rain — conditions favour fungal diseases on ${cropLabel}.`,
      advice: ["Improve air circulation by pruning lower leaves", "Avoid overhead watering — use drip or base watering", "Scout crops daily for early signs of mildew or blight", "Apply approved fungicide if symptoms appear"] });

  const avgTemp3d = forecastHighs.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  if (avgTemp3d >= 24 && avgTemp3d <= t.heatStress - 2 && rain3d > 5 && rain3d < t.rainMm * 1.5 && currentWind < t.windAdvisory && alerts.length === 0)
    alerts.push({ severity: "info", icon: "🌱", title: "Ideal Planting Conditions",
      message: `Temperatures and rainfall are well within range for ${cropLabel} this week.`,
      advice: ["Good time to transplant seedlings", "Sow succession plantings directly in beds", "Apply compost and pre-wet before sowing", "Plant heat-loving crops while conditions hold"] });

  return alerts;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function WeatherWidget({ location, userData }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchedFor = useRef(null);

  const crops = [
    ...(userData?.currentCrops || []),
    ...(userData?.crops || []),
  ];
  const thresholds = getThresholdsForCrops(crops);

  const doFetch = async (island) => {
    setLoading(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(
        `${FUNCTION_URL}?island=${encodeURIComponent(island)}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error ${res.status}`);
      }

      const data = await res.json();

      setWeather({
        ...data,
        alerts: buildAlerts(data, crops, thresholds),
      });
      fetchedFor.current = island;
    } catch (err) {
      setError(err.name === "AbortError"
        ? "Weather request timed out. Check your connection and try again."
        : err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const island = location?.island;
    if (!island) return;
    if (fetchedFor.current === island && weather?.fetchedAt && Date.now() - weather.fetchedAt < 30 * 60 * 1000) return;
    doFetch(island);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.island]);

  if (loading) return (
    <div style={styles.loading}>
      <div style={styles.spinner} />
      <p>Loading weather for {location?.island || "your location"}…</p>
    </div>
  );

  if (error) return (
    <div style={styles.errorBox}>
      <p style={{ fontWeight: 600 }}>⚠️ Unable to load weather</p>
      <p style={styles.errorSub}>{error}</p>
      <button style={styles.retryBtn} onClick={() => doFetch(location?.island || "Antigua")}>
        Try again
      </button>
    </div>
  );

  if (!weather) return null;

  return (
    <div style={styles.widget}>
      {weather.stale && (
        <div style={styles.staleBanner}>⚠️ Showing cached data — live weather temporarily unavailable</div>
      )}

      {/* Current conditions */}
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} style={styles.current}>
        <div style={styles.currentMain}>
          <div>
            <div style={styles.tempValue}>{weather.current.temp}°C</div>
            <div style={styles.condLabel}>{weather.current.label}</div>
            {crops.length > 0 && (
              <div style={styles.cropContext}>
                Thresholds calibrated for: {crops.slice(0, 3).map(c => c.replace(/\s*\(.*\)/, "")).join(", ")}
                {crops.length > 3 ? ` +${crops.length - 3} more` : ""}
              </div>
            )}
          </div>
          <div style={styles.bigEmoji}>{weather.current.emoji}</div>
        </div>
        <div style={styles.detailsRow}>
          <Detail icon="💧" label="Humidity"  value={`${weather.current.humidity}%`}
            warn={weather.current.humidity >= thresholds.rhRisk} />
          <Detail icon="💨" label="Wind"      value={`${weather.current.windSpeed} km/h`}
            warn={weather.current.windSpeed >= thresholds.windAdvisory} />
          <Detail icon="🌧️" label="Rainfall"  value={`${weather.current.rainfall} mm`} />
        </div>
      </motion.div>

      {/* Crop-aware alerts */}
      {weather.alerts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h4 style={styles.sectionTitle}>⚠️ Farming Alerts</h4>
          {weather.alerts.map((alert, i) => (
            <div key={i} style={{
              ...styles.alert,
              background: alert.severity === "warning" ? "#FFF7ED" : "#F0F9F4",
              borderLeft: `4px solid ${alert.severity === "warning" ? "#f59e0b" : "#22c55e"}`,
            }}>
              <div style={styles.alertHead}>
                <span style={styles.alertIcon}>{alert.icon}</span>
                <strong>{alert.title}</strong>
              </div>
              <p style={styles.alertMsg}>{alert.message}</p>
              {alert.advice && (
                <ul style={styles.adviceList}>
                  {alert.advice.map((tip, j) => <li key={j}>{tip}</li>)}
                </ul>
              )}
            </div>
          ))}
        </motion.div>
      )}

      {/* 7-day forecast */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <h4 style={styles.sectionTitle}>7-Day Forecast</h4>
        <div style={styles.forecastGrid}>
          {weather.forecast.map((day, i) => (
            <div key={i} style={{
              ...styles.forecastDay,
              background: day.rain > thresholds.rainMm ? "#FFF7ED" : "#f9f9f9",
              border: day.high >= thresholds.heatStress ? "1px solid #fca5a5" : "1px solid transparent",
            }}>
              <div style={styles.dayName}>{day.day}</div>
              <div style={styles.dayEmoji}>{day.emoji}</div>
              <div style={styles.dayTemps}>
                <span style={day.high >= thresholds.heatStress ? styles.hotTemp : styles.highTemp}>{day.high}°</span>
                <span style={styles.lowTemp}>{day.low}°</span>
              </div>
              <div style={styles.dayRain}>🌧️ {day.rain.toFixed(1)}mm</div>
              {day.rainProb > 0 && <div style={styles.dayRainProb}>{day.rainProb}% chance</div>}
            </div>
          ))}
        </div>
        <div style={styles.legend}>
          <span style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: "#fca5a5" }} /> Heat stress ≥{thresholds.heatStress}°C
          </span>
          <span style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: "#fed7aa" }} /> Rain risk ≥{thresholds.rainMm}mm
          </span>
        </div>
      </motion.div>

      {/* Tips */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} style={styles.tips}>
        <h4 style={{ margin: "0 0 0.75rem" }}>🌱 General Tips</h4>
        <ul style={styles.tipsList}>
          {getGeneralTips(weather, thresholds).map((tip, i) => <li key={i}>{tip}</li>)}
        </ul>
      </motion.div>

     <p style={styles.footer}>
  {weather.island} · Updated {new Date(weather.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
</p>
    </div>
  );
}

function getGeneralTips(weather, t) {
  const tips = [];
  if (weather.forecast.some(d => d.rain > t.rainMm))      tips.push("Heavy rain days ahead — check drainage and harvest mature produce early.");
  if (weather.current.humidity > t.rhRisk)                 tips.push("High humidity — scout daily for fungal disease and improve airflow between plants.");
  if (weather.current.windSpeed > t.windAdvisory)          tips.push("Elevated winds — stake tall plants and delay transplanting.");
  if (weather.forecast.some(d => d.high >= t.heatStress))  tips.push("Heat stress days in the forecast — mulch beds and water at dawn.");
  if (tips.length === 0) tips.push("Conditions look favourable — good time for normal farm work.");
  return tips;
}

function Detail({ icon, label, value, warn }) {
  return (
    <div style={{ ...styles.detailBox, background: warn ? "#FFF7ED" : "#f9f9f9", border: warn ? "1px solid #f59e0b" : "1px solid transparent" }}>
      <span style={styles.detailIcon}>{icon}</span>
      <div>
        <div style={styles.detailLabel}>{label}</div>
        <div style={{ ...styles.detailValue, color: warn ? "#d97706" : "var(--ink-black)" }}>{value}</div>
      </div>
    </div>
  );
}

const styles = {
  widget:       { background: "white", borderRadius: "16px", padding: "2rem", boxShadow: "0 4px 6px rgba(0,0,0,0.08)", marginBottom: "2rem" },
  staleBanner:  { background: "#FFF7ED", border: "1px solid #f59e0b", borderRadius: "8px", padding: "0.6rem 1rem", fontSize: "0.85rem", color: "#92400e", marginBottom: "1.5rem" },
  loading:      { textAlign: "center", padding: "3rem", color: "#666" },
  spinner:      { width: "40px", height: "40px", margin: "0 auto 1rem", border: "4px solid #f0f0f0", borderTop: "4px solid var(--soil-green)", borderRadius: "50%", animation: "spin 1s linear infinite" },
  errorBox:     { textAlign: "center", padding: "2rem", background: "#fef2f2", borderRadius: "12px", border: "1px solid #fee2e2" },
  errorSub:     { color: "#666", fontSize: "0.9rem", marginTop: "0.5rem" },
  retryBtn:     { marginTop: "1rem", padding: "0.5rem 1.5rem", background: "var(--soil-green)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" },
  current:      { marginBottom: "2rem" },
  currentMain:  { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" },
  tempValue:    { fontSize: "3.5rem", fontWeight: "bold", color: "var(--ink-black)", lineHeight: 1 },
  condLabel:    { fontSize: "1.1rem", color: "#666", marginTop: "0.25rem" },
  cropContext:  { fontSize: "0.75rem", color: "#999", marginTop: "0.5rem", fontStyle: "italic" },
  bigEmoji:     { fontSize: "4rem" },
  detailsRow:   { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.75rem" },
  detailBox:    { display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem", borderRadius: "8px", transition: "all 0.2s" },
  detailIcon:   { fontSize: "1.4rem" },
  detailLabel:  { fontSize: "0.75rem", color: "#666" },
  detailValue:  { fontSize: "1rem", fontWeight: "600" },
  sectionTitle: { margin: "0 0 1rem", color: "var(--ink-black)", fontSize: "1rem" },
  alert:        { borderRadius: "8px", padding: "1rem", marginBottom: "0.75rem" },
  alertHead:    { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" },
  alertIcon:    { fontSize: "1.2rem" },
  alertMsg:     { color: "#555", fontSize: "0.9rem", margin: "0 0 0.5rem 1.7rem" },
  adviceList:   { margin: "0 0 0 1.7rem", fontSize: "0.85rem", color: "#666", lineHeight: "1.9", paddingLeft: "1rem" },
  forecastGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(80px,1fr))", gap: "0.6rem", marginBottom: "0.75rem" },
  forecastDay:  { padding: "0.75rem", borderRadius: "8px", textAlign: "center", transition: "all 0.2s" },
  dayName:      { fontWeight: "600", fontSize: "0.85rem", color: "var(--ink-black)", marginBottom: "0.4rem" },
  dayEmoji:     { fontSize: "1.6rem", margin: "0.3rem 0" },
  dayTemps:     { display: "flex", justifyContent: "center", gap: "0.3rem", fontSize: "0.85rem", margin: "0.3rem 0" },
  hotTemp:      { fontWeight: "bold", color: "#ef4444" },
  highTemp:     { fontWeight: "bold", color: "var(--ink-black)" },
  lowTemp:      { color: "#888" },
  dayRain:      { fontSize: "0.75rem", color: "#666" },
  dayRainProb:  { fontSize: "0.7rem", color: "#999", marginTop: "2px" },
  legend:       { display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.25rem", marginBottom: "1.5rem" },
  legendItem:   { display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: "#888" },
  legendDot:    { width: "10px", height: "10px", borderRadius: "50%", display: "inline-block" },
  tips:         { background: "#F0F9F4", padding: "1.25rem", borderRadius: "8px", border: "2px solid var(--soil-green)", marginBottom: "1rem" },
  tipsList:     { margin: "0", paddingLeft: "1.25rem", lineHeight: "1.9", color: "#444", fontSize: "0.9rem" },
  footer:       { textAlign: "center", color: "#bbb", fontSize: "0.78rem", marginTop: "0.5rem" },
};