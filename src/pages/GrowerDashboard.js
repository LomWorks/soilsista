import React, { useState, useEffect, useCallback } from "react";
import { db, auth } from "../firebase";
import {
  doc, getDoc, collection, query, where, orderBy, limit,
  getDocs, addDoc, serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import CropPlanner from "../components/CropPlanner";
import WeatherWidget from "../components/WeatherWidget";

// ── Mobile detection ─────────────────────────────────────────────────────────
// Everything in this file is inline styles (no CSS media queries available),
// so responsive layout is driven by this hook instead. Breakpoint matches
// common phone/small-tablet width.
function useViewport() {
  const getTier = () => {
    if (typeof window === "undefined") return "desktop";
    const w = window.innerWidth;
    if (w <= 768) return "mobile";
    if (w <= 1080) return "tablet";
    return "desktop";
  };
  const [tier, setTier] = useState(getTier);

  useEffect(() => {
    const mqlMobile = window.matchMedia("(max-width: 768px)");
    const mqlTablet = window.matchMedia("(max-width: 1080px)");
    const handler = () => setTier(getTier());
    [mqlMobile, mqlTablet].forEach(mql =>
      mql.addEventListener ? mql.addEventListener("change", handler) : mql.addListener(handler)
    );
    handler();
    return () => {
      [mqlMobile, mqlTablet].forEach(mql =>
        mql.removeEventListener ? mql.removeEventListener("change", handler) : mql.removeListener(handler)
      );
    };
  }, []);

  return tier; // "mobile" | "tablet" | "desktop"
}

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  sidebarBg:    "#2C4A1E",
  sidebarText:  "#C8DEAD",
  sidebarActive:"#3D6B2A",
  sidebarBorder:"#3F6128",
  cream:        "#F7F3EA",
  white:        "#FFFFFF",
  green:        "#5A8A3C",
  greenDark:    "#3D6128",
  greenLight:   "#EBF4E3",
  greenBadge:   "#7FB34D",
  red:          "#DC2626",
  redLight:     "#FEF2F2",
  orange:       "#D97706",
  orangeLight:  "#FFFBEB",
  text:         "#1C1A1D",
  textMuted:    "#6B7280",
  border:       "#E5E7EB",
  shadow:       "0 1px 4px rgba(0,0,0,0.08)",
};

// ── Nav config ────────────────────────────────────────────────────────────────
const NAV = [
  { id: "home",    icon: "🏠", label: "Home"          },
  { id: "farm",    icon: "🌾", label: "Farm"          },
  { id: "market",  icon: "📊", label: "Market"        },
  { id: "doctor",  icon: "🩺", label: "Crop Doctor"   },
  { id: "inputs",  icon: "✏️",  label: "Input Library" },
  { id: "history", icon: "📋", label: "History"       },
  { id: "profile", icon: "👤", label: "Profile"       },
];

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ active, setActive, userData, viewport }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const island = typeof userData?.location === "string"
    ? userData.location
    : userData?.location?.island || "Location not set";
  const activeLabel = NAV.find(n => n.id === active)?.label || "Home";

  if (viewport === "mobile") {
    return (
      <>
        <div style={ss.topBar}>
          <button style={ss.hamburgerBtn} onClick={() => setDrawerOpen(true)} aria-label="Open menu">
            <span style={ss.hamburgerLine} />
            <span style={ss.hamburgerLine} />
            <span style={ss.hamburgerLine} />
          </button>
          <div style={ss.topBarTitle}>{activeLabel}</div>
          <div style={{ width: 32 }} />
        </div>

        <AnimatePresence>
          {drawerOpen && (
            <>
              <motion.div
                key="drawer-backdrop"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={ss.drawerBackdrop}
                onClick={() => setDrawerOpen(false)}
              />
              <motion.aside
                key="drawer"
                initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
                transition={{ type: "tween", duration: 0.2 }}
                style={ss.drawer}
              >
                <div style={ss.header}>
                  <div style={ss.logo}>Soil Sista</div>
                  <div style={ss.sub}>Grower Assistant</div>
                </div>
                <nav style={ss.nav}>
                  {NAV.map(n => (
                    <button
                      key={n.id}
                      onClick={() => { setActive(n.id); setDrawerOpen(false); }}
                      style={{ ...ss.item, ...(active === n.id ? ss.itemOn : {}) }}
                    >
                      <span style={ss.icon}>{n.icon}</span>
                      {n.label}
                    </button>
                  ))}
                </nav>
                {userData && (
                  <div style={ss.farmCard}>
                    <div style={ss.farmName}>{userData.farmName || "My Farm"}</div>
                    <div style={ss.farmDetail}>
                      {island} · {userData.farmSize || "—"} · {userData.farmingType || "mixed veg"}
                    </div>
                  </div>
                )}
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Tablet tier: collapsed icon-only rail — same nav, no jump straight to a
  // full drawer just because the sidebar's text labels no longer fit.
  if (viewport === "tablet") {
    return (
      <aside style={ss.rail}>
        <div style={ss.railHeader}>🌱</div>
        <nav style={ss.railNav}>
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setActive(n.id)}
              title={n.label}
              style={{ ...ss.railItem, ...(active === n.id ? ss.railItemOn : {}) }}
            >
              <span style={ss.railIcon}>{n.icon}</span>
            </button>
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <aside style={ss.aside}>
      <div style={ss.header}>
        <div style={ss.logo}>Soil Sista</div>
        <div style={ss.sub}>Grower Assistant</div>
      </div>
      <nav style={ss.nav}>
        {NAV.map(n => (
          <button
            key={n.id}
            onClick={() => setActive(n.id)}
            style={{ ...ss.item, ...(active === n.id ? ss.itemOn : {}) }}
          >
            <span style={ss.icon}>{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>
      {userData && (
        <div style={ss.farmCard}>
          <div style={ss.farmName}>{userData.farmName || "My Farm"}</div>
          <div style={ss.farmDetail}>
            {island} · {userData.farmSize || "—"} · {userData.farmingType || "mixed veg"}
          </div>
        </div>
      )}
    </aside>
  );
}

const ss = {
  aside:      { width: 190, minWidth: 190, background: C.sidebarBg, display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, overflowY: "auto" },
  header:     { padding: "1.4rem 1.2rem 1rem", borderBottom: `1px solid ${C.sidebarBorder}` },
  logo:       { color: "#FFF", fontFamily: "'Playfair Display',serif", fontSize: "1.15rem", fontWeight: 700 },
  sub:        { color: C.sidebarText, fontSize: "0.72rem", marginTop: 3, opacity: 0.8 },
  nav:        { flex: 1, padding: "0.65rem 0", display: "flex", flexDirection: "column", gap: 2 },
  item:       { display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.6rem 1.2rem", background: "none", border: "none", borderLeft: "3px solid transparent", color: C.sidebarText, fontSize: "0.88rem", cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.15s" },
  itemOn:     { background: C.sidebarActive, borderLeft: "3px solid #9ED46A", color: "#FFF", fontWeight: 600 },
  icon:       { fontSize: "0.95rem", minWidth: 18 },
  farmCard:   { margin: "0.85rem", background: "rgba(0,0,0,0.22)", borderRadius: 8, padding: "0.7rem 0.9rem" },
  farmName:   { color: "#FFF", fontWeight: 600, fontSize: "0.82rem" },
  farmDetail: { color: C.sidebarText, fontSize: "0.72rem", marginTop: 3, lineHeight: 1.45, opacity: 0.8 },

  // Mobile top bar + hamburger drawer
  topBar:          { position: "sticky", top: 0, height: 52, background: C.sidebarBg, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 0.9rem", zIndex: 800, boxShadow: "0 1px 4px rgba(0,0,0,0.15)" },
  hamburgerBtn:    { width: 32, height: 32, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, background: "none", border: "none", cursor: "pointer" },
  hamburgerLine:   { width: 18, height: 2, background: "#FFF", borderRadius: 2 },
  topBarTitle:     { color: "#FFF", fontWeight: 700, fontSize: "0.95rem" },
  drawerBackdrop:  { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 950 },
  drawer:          { position: "fixed", top: 0, left: 0, bottom: 0, width: "78%", maxWidth: 280, background: C.sidebarBg, zIndex: 960, display: "flex", flexDirection: "column", overflowY: "auto", boxShadow: "2px 0 12px rgba(0,0,0,0.25)" },

  // Tablet tier: collapsed icon-only rail
  rail:       { width: 56, minWidth: 56, background: C.sidebarBg, display: "flex", flexDirection: "column", alignItems: "center", height: "100vh", position: "sticky", top: 0 },
  railHeader: { padding: "1.2rem 0 0.9rem", fontSize: "1.3rem" },
  railNav:    { display: "flex", flexDirection: "column", gap: 4, width: "100%" },
  railItem:   { width: "100%", display: "flex", justifyContent: "center", padding: "0.65rem 0", background: "none", border: "none", borderLeft: "3px solid transparent", cursor: "pointer" },
  railItemOn: { background: C.sidebarActive, borderLeft: "3px solid #9ED46A" },
  railIcon:   { fontSize: "1.15rem" },
};

// ── Shared atoms ──────────────────────────────────────────────────────────────
function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{ background: C.white, borderRadius: 12, padding: "1.25rem", boxShadow: C.shadow, ...style }}>
      {children}
    </div>
  );
}

function SectionHead({ title, sub }) {
  return (
    <div style={{ marginBottom: "1.4rem" }}>
      <h2 style={{ margin: 0, fontSize: "1.4rem", color: C.text }}>{title}</h2>
      {sub && <p style={{ margin: "0.2rem 0 0", color: C.textMuted, fontSize: "0.88rem" }}>{sub}</p>}
    </div>
  );
}

function Pill({ children, color = C.greenBadge }) {
  return (
    <span style={{ background: color, color: "#fff", borderRadius: 20, padding: "0.18rem 0.6rem", fontSize: "0.76rem", fontWeight: 600, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
// Same helper Dashboard.jsx used — WeatherWidget expects a { island } object,
// but userData.location can be stored as either a plain string or an object.
function normalizeLocation(location) {
  return typeof location === "string" ? { island: location } : (location || null);
}

function daysUntil(dateRaw) {
  if (!dateRaw) return null;
  const d = dateRaw?.toDate ? dateRaw.toDate() : new Date(dateRaw);
  const diff = Math.ceil((d - new Date()) / 864e5);
  return diff;
}

function harvestLabel(days) {
  if (days == null) return null;
  if (days <= 0)  return "Harvest Now";
  if (days <= 5)  return "Harvest Soon";
  return `${days} days`;
}

// ── HOME ──────────────────────────────────────────────────────────────────────
// Weather forecast comes from the live getWeather Cloud Function (v2 HTTPS,
// Tomorrow.io-backed, 30-min server cache) — same endpoint WeatherWidget.jsx
// already uses. No mock data.

const QA_BUTTONS = [
  { id: "planting",    icon: "🌱", label: "Add Planting", primary: true  },
  { id: "harvest",     icon: "🌾", label: "Log Harvest",  primary: false },
  { id: "sale",        icon: "💰", label: "Log Sale",     primary: false },
  { id: "spray",       icon: "🧪", label: "Log Spray",    primary: false },
  { id: "observation", icon: "👁️", label: "Observation",  primary: false },
  { id: "amendment",   icon: "🌿", label: "Amendment",    primary: false },
  { id: "restock",     icon: "📦", label: "Restock",      primary: false },
  { id: "diagnose",    icon: "🩺", label: "Diagnose",     primary: false },
];

function HomeSection({ userData, activities, userId, setSection, bumpAddPlanting, openLogModal }) {

  // ── Derive beds from crop_plan activities ─────────────────────────────────
  const beds = activities
    .filter(a => a.type === "crop_plan" && a.status === "planned")
    .map(a => {
      const d = a.data || {};
      const days = daysUntil(d.harvestStart || d.harvestDate);
      return {
        crop:   d.cropName    || a.title?.replace(" Planting Plan", "") || "Crop",
        plants: d.plantsCount || d.seedsNeeded || "—",
        bed:    d.bedLabel    || d.location    || "—",
        days,
        label:  harvestLabel(days),
      };
    });

  // ── Weather alerts from activities ────────────────────────────────────────
  const weatherAlerts = activities.filter(a => a.type === "weather_alert");
  const latestAlert   = weatherAlerts[0];

  // ── Today's tasks: reminders + upcoming crop events ───────────────────────
  const today   = new Date(); today.setHours(0, 0, 0, 0);
  const in14    = new Date(today.getTime() + 14 * 864e5);

  const reminders = activities
    .filter(a => a.type === "reminder" && a.status !== "completed")
    .slice(0, 5);

  // ── Revenue this week ─────────────────────────────────────────────────────
  const weekAgo  = new Date(Date.now() - 7 * 864e5);
  const weekRev  = activities
    .filter(a => a.type === "sale" && a.createdAt?.toDate?.() >= weekAgo)
    .reduce((s, a) => s + (Number(a.data?.amount) || 0), 0);

  // ── Recent activity ───────────────────────────────────────────────────────
  const recentAct = activities
    .filter(a => !["reminder","notification","weather_alert"].includes(a.type))
    .slice(0, 5);

  // ── Pest/disease pressure derived from latest weather alert ───────────────
  const pestLevel    = latestAlert?.data?.alertType === "pest"    ? "High"   : "Medium";
  const diseaseLevel = latestAlert?.data?.alertType === "disease" ? "High"   : "Medium";
  const soilLevel    = "Good"; // Soil conditions have no direct backend field yet

  return (
    <div>
      {/* Weather — same WeatherWidget + normalizeLocation call Dashboard.jsx used */}
      <div style={{ marginBottom: "1.1rem" }}>
        <WeatherWidget location={normalizeLocation(userData?.location)} userData={userData} />
      </div>

      {/* Pressure cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.1rem" }}>
        <Card style={{ borderLeft: `4px solid ${C.red}`, background: C.redLight }}>
          <div style={pressLabel("#7F1D1D")}>🐛 PEST PRESSURE</div>
          <div style={pressVal(C.red)}>{pestLevel}</div>
          <div style={pressNote("#7F1D1D")}>
            {latestAlert?.message || "RH plus warmth favors aphids and whitefly. Scout undersides of leaves daily."}
          </div>
        </Card>
        <Card style={{ borderLeft: `4px solid ${C.orange}`, background: C.orangeLight }}>
          <div style={pressLabel("#78350F")}>🍄 DISEASE PRESSURE</div>
          <div style={pressVal(C.orange)}>{diseaseLevel}</div>
          <div style={pressNote("#78350F")}>Rain elevates fungal risk. Hold foliar sprays until conditions improve.</div>
        </Card>
        <Card style={{ borderLeft: `4px solid ${C.green}`, background: C.greenLight }}>
          <div style={pressLabel("#14532D")}>🌱 SOIL CONDITIONS</div>
          <div style={pressVal(C.green)}>{soilLevel}</div>
          <div style={pressNote("#14532D")}>
            {userData?.farmingType === "Drip irrigation"
              ? "Drip system active. Check emitters."
              : "Moisture adequate. Monitor after rain."}
          </div>
        </Card>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "1rem", marginBottom: "1.1rem" }}>
        {[
          { v: beds.length || userData?.stats?.cropsPlanted || 0, l: "Active Beds"   },
          { v: `${userData?.stats?.cropsHarvested || 0}`,          l: "Harvested"     },
          { v: weekRev > 0 ? `$${weekRev}` : "—",                  l: "This Week"     },
          { v: beds.length > 0
              ? `${Math.min(...beds.filter(b => b.days != null).map(b => b.days))}d`
              : "—",                                                l: "Next Harvest"  },
        ].map((s, i) => (
          <Card key={i} style={{ textAlign: "center", padding: "0.9rem" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: C.text }}>{s.v}</div>
            <div style={{ fontSize: "0.78rem", color: C.textMuted, marginTop: 3 }}>{s.l}</div>
          </Card>
        ))}
      </div>

      {/* Weather advisory strip */}
      {latestAlert && (
        <div style={{ background: C.orangeLight, border: "1px solid #FCD34D", borderRadius: 8, padding: "0.65rem 1rem", marginBottom: "1.1rem", fontSize: "0.85rem", color: "#78350F", display: "flex", gap: "0.5rem" }}>
          ⚠️ <span><strong>{latestAlert.title}.</strong> {latestAlert.message}</span>
        </div>
      )}

      {/* Quick Actions */}
      <Card style={{ marginBottom: "1.1rem" }}>
        <h3 style={{ margin: "0 0 0.9rem", fontSize: "0.95rem" }}>⚡ Quick Actions</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: "0.65rem" }}>
          {QA_BUTTONS.map((q, i) => (
            <button
              key={i}
              style={{ ...qaBtn, ...(q.primary ? qaBtnPrimary : {}) }}
              onClick={() => {
                if (q.id === "planting") { setSection("farm"); bumpAddPlanting(); }
                else if (q.id === "diagnose") { setSection("doctor"); }
                else { openLogModal(q.id); }
              }}
            >
              <span style={{ fontSize: "1rem" }}>{q.icon}</span>
              <span style={{ fontSize: "0.76rem", fontWeight: 500 }}>{q.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Growing Now + Today's Tasks */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.1rem", marginBottom: "1.1rem" }}>
        <Card>
          <h3 style={{ margin: "0 0 0.9rem", fontSize: "0.95rem" }}>🌿 Growing Now</h3>
          {beds.length > 0 ? beds.map((b, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.55rem 0", borderBottom: i < beds.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{b.crop}</div>
                <div style={{ fontSize: "0.74rem", color: C.textMuted }}>{b.plants} plants · {b.bed}</div>
              </div>
              {b.label && (
                <Pill color={b.days <= 5 ? C.red : b.days <= 21 ? C.orange : C.greenBadge}>
                  {b.label}
                </Pill>
              )}
            </div>
          )) : (
            <p style={{ color: C.textMuted, fontSize: "0.85rem" }}>
              No active plantings yet. Use <strong>Add Planting</strong> to get started.
            </p>
          )}
        </Card>

        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.65rem" }}>
            <h3 style={{ margin: 0, fontSize: "0.95rem" }}>📋 Today's Tasks</h3>
            <span style={{ fontSize: "0.7rem", background: "#E0F2FE", color: "#0369A1", borderRadius: 12, padding: "0.2rem 0.5rem", fontWeight: 600 }}>Weather-guided</span>
          </div>
          {weatherAlerts.length > 0 && (
            <div style={{ fontSize: "0.76rem", background: "#FEF3C7", color: "#92400E", padding: "0.35rem 0.6rem", borderRadius: 6, marginBottom: "0.65rem", fontWeight: 600 }}>
              ⚠️ {weatherAlerts[0].data?.alertType || "Weather"} alert active
            </div>
          )}
          {reminders.length > 0 ? reminders.map((r, i) => (
            <div key={r.id} style={{ display: "flex", gap: "0.55rem", padding: "0.4rem 0", borderBottom: i < reminders.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <span style={{ color: C.green, marginTop: 3, fontSize: "0.65rem" }}>●</span>
              <div>
                <div style={{ fontSize: "0.84rem", fontWeight: 600, color: C.text }}>{r.title}</div>
                <div style={{ fontSize: "0.72rem", color: C.textMuted, marginTop: 2 }}>{r.message}</div>
              </div>
            </div>
          )) : (
            <p style={{ color: C.textMuted, fontSize: "0.85rem" }}>No upcoming reminders. Cloud tasks run daily at 7am.</p>
          )}
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.9rem" }}>
          <h3 style={{ margin: 0, fontSize: "0.95rem" }}>📊 Recent Activity</h3>
          <button style={linkBtn} onClick={() => setSection("history")}>Full History →</button>
        </div>
        {recentAct.length > 0 ? recentAct.map((a, i) => (
          <div key={a.id} style={{ display: "flex", gap: "0.7rem", alignItems: "center", padding: "0.55rem 0", borderBottom: i < recentAct.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.greenLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem", flexShrink: 0 }}>
              {a.icon || "🌾"}
            </div>
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>{a.title}</div>
              <div style={{ fontSize: "0.73rem", color: C.textMuted }}>{a.message}</div>
            </div>
          </div>
        )) : (
          <p style={{ color: C.textMuted, fontSize: "0.85rem" }}>No activity logged yet.</p>
        )}
      </Card>
    </div>
  );
}


const pressLabel  = c => ({ fontSize: "0.7rem", fontWeight: 700, color: c, letterSpacing: "0.04em", marginBottom: 4 });
const pressVal    = c => ({ fontSize: "1.45rem", fontWeight: 800, color: c, margin: "0.2rem 0" });
const pressNote   = c => ({ fontSize: "0.76rem", color: c, lineHeight: 1.45 });
const qaBtn       = { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", padding: "0.65rem 0.4rem", background: C.greenLight, border: `1px solid ${C.border}`, borderRadius: 10, cursor: "pointer", width: "100%" };
const qaBtnPrimary = { background: C.green, color: "#fff", border: "none" };
const linkBtn     = { background: "none", border: "none", color: C.green, fontSize: "0.82rem", cursor: "pointer", fontWeight: 600 };

// ── LOG ACTIVITY MODAL ──────────────────────────────────────────────────────
// Real Firestore writer shared by Log Harvest / Log Sale / Log Spray /
// Observation / Amendment / Restock quick actions. Writes to `activities`
// with the exact type keys HistorySection.TYPE_TO_FILTER already expects.

const LOG_TYPES = {
  harvest: {
    title: "Log Harvest", icon: "🌾",
    fields: [
      { key: "crop",     label: "Crop",           type: "text",   required: true, placeholder: "e.g. Bok Choy" },
      { key: "bed",     label: "Bed",             type: "text",   placeholder: "e.g. Beds 1 & 2" },
      { key: "quantity", label: "Quantity",        type: "number", required: true, placeholder: "48" },
      { key: "unit",     label: "Unit",            type: "select", options: ["lbs", "oz", "units", "bunches"] },
      { key: "quality",  label: "Quality",         type: "select", options: ["Excellent", "Good", "Fair", "Poor"] },
      { key: "notes",    label: "Notes",           type: "textarea" },
    ],
    build: (d) => ({
      title:   `Harvest · ${d.crop || "Crop"}`,
      message: `${d.quantity || "—"} ${d.unit || ""} · ${d.bed || "unspecified bed"}${d.quality ? ` · ${d.quality}` : ""}`,
    }),
  },
  sale: {
    title: "Log Sale", icon: "💰",
    fields: [
      { key: "produce",      label: "Produce",        type: "text",   required: true, placeholder: "e.g. Tomato Cherry" },
      { key: "buyer",        label: "Buyer",          type: "text",   placeholder: "e.g. South Beach Market" },
      { key: "quantity",     label: "Quantity",       type: "number", required: true },
      { key: "unit",         label: "Unit",           type: "select", options: ["lbs", "units", "bunches"] },
      { key: "pricePerUnit", label: "Price per unit", type: "number", required: true, placeholder: "6.50" },
      { key: "saleType",     label: "Sale type",      type: "select", options: ["Retail", "Wholesale"] },
      { key: "notes",        label: "Notes",          type: "textarea" },
    ],
    build: (d) => {
      const amount = (Number(d.quantity) || 0) * (Number(d.pricePerUnit) || 0);
      return {
        title:   `Sale · ${d.produce || "Produce"}`,
        message: `$${amount.toFixed(2)} · ${d.quantity || "—"} ${d.unit || ""} to ${d.buyer || "buyer"}`,
        extra:   { amount },
      };
    },
  },
  spray: {
    title: "Log Spray", icon: "🧪",
    fields: [
      { key: "product",      label: "Product",       type: "text",   required: true, placeholder: "e.g. Neem Oil 1%" },
      { key: "beds",         label: "Beds",           type: "text",   placeholder: "e.g. All beds" },
      { key: "reentryDays",  label: "Re-entry (days)",type: "number", placeholder: "7" },
      { key: "notes",        label: "Notes",          type: "textarea" },
    ],
    build: (d) => ({
      title:   `Spray · ${d.product || "Product"}`,
      message: `${d.beds || "unspecified beds"}${d.reentryDays ? ` · Re-entry ${d.reentryDays}d` : ""}`,
    }),
  },
  observation: {
    title: "Log Observation", icon: "👁️",
    fields: [
      { key: "bed",         label: "Bed",         type: "text",   placeholder: "e.g. Bed 3" },
      { key: "note",        label: "What did you see?", type: "textarea", required: true },
      { key: "flag",        label: "Flag",        type: "select", options: ["None", "Monitor", "Urgent"] },
    ],
    build: (d) => ({
      title:   `Observation · ${d.bed || "Farm"}`,
      message: d.note || "",
    }),
  },
  amendment: {
    title: "Log Amendment", icon: "🌿",
    fields: [
      { key: "product", label: "Product",  type: "text", required: true, placeholder: "e.g. Compost" },
      { key: "amount",  label: "Amount",   type: "text", placeholder: "e.g. 20 lbs" },
      { key: "beds",    label: "Beds",     type: "text", placeholder: "e.g. Beds 1 & 3" },
      { key: "notes",   label: "Notes",    type: "textarea" },
    ],
    build: (d) => ({
      title:   `Amendment · ${d.product || "Product"}`,
      message: `${d.amount || "—"} · ${d.beds || "unspecified beds"}`,
    }),
  },
  restock: {
    title: "Log Restock", icon: "📦",
    fields: [
      { key: "item",     label: "Item",     type: "text",   required: true, placeholder: "e.g. Bok Choy Seedlings" },
      { key: "quantity", label: "Quantity", type: "number", required: true },
      { key: "unit",     label: "Unit",     type: "text",   placeholder: "e.g. units" },
      { key: "cost",     label: "Cost",     type: "number", placeholder: "40.00" },
      { key: "supplier", label: "Supplier", type: "text",   placeholder: "e.g. South Beach Nursery" },
    ],
    build: (d) => ({
      title:   `Restock · ${d.item || "Item"}`,
      message: `${d.quantity || "—"} ${d.unit || ""}${d.cost ? ` · $${Number(d.cost).toFixed(2)}` : ""}${d.supplier ? ` · ${d.supplier}` : ""}`,
    }),
  },
};

function LogActivityModal({ type, userId, onClose, onSaved }) {
  const cfg = LOG_TYPES[type];
  const [data, setData] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!cfg) return null;

  const set = (key, val) => setData(prev => ({ ...prev, [key]: val }));

  const save = async () => {
    const missing = cfg.fields.filter(f => f.required && !data[f.key]);
    if (missing.length > 0) { setError(`${missing[0].label} is required.`); return; }
    if (!userId) { setError("Not signed in."); return; }
    setSaving(true);
    setError(null);
    try {
      const built = cfg.build(data);
      await addDoc(collection(db, "activities"), {
        userId,
        type,
        category: "farming",
        title:   built.title,
        message: built.message,
        icon:    cfg.icon,
        status:  "logged",
        data:    { ...data, ...(built.extra || {}), loggedAt: new Date().toISOString() },
        createdAt: serverTimestamp(),
        expiresAt: null,
      });
      onSaved();
    } catch (e) {
      console.error(`Failed to save ${type}:`, e);
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        style={mBox}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.1rem" }}>
          <h3 style={{ margin: 0, fontSize: "1rem" }}>{cfg.icon} {cfg.title}</h3>
          <button onClick={onClose} style={xBtn}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {cfg.fields.map(f => (
            <div key={f.key}>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: C.textMuted, marginBottom: "0.3rem" }}>
                {f.label}{f.required ? " *" : ""}
              </label>
              {f.type === "select" ? (
                <select
                  value={data[f.key] || ""}
                  onChange={e => set(f.key, e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Select…</option>
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  value={data[f.key] || ""}
                  onChange={e => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              ) : (
                <input
                  type={f.type}
                  value={data[f.key] || ""}
                  onChange={e => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  style={inputStyle}
                />
              )}
            </div>
          ))}
        </div>

        {error && <div style={{ color: C.red, fontSize: "0.8rem", marginTop: "0.7rem" }}>{error}</div>}

        <button
          onClick={save}
          disabled={saving}
          style={{ ...flowOptFull, marginTop: "1.1rem", background: C.green, color: "#fff", fontWeight: 700, border: "none", opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Saving…" : `Save ${cfg.title}`}
        </button>
      </motion.div>
    </div>
  );
}

const inputStyle = { width: "100%", padding: "0.55rem 0.7rem", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: "0.86rem", fontFamily: "inherit", color: C.text };
const flowOptFull = { width: "100%", padding: "0.7rem 0.9rem", borderRadius: 8, cursor: "pointer", textAlign: "center", fontSize: "0.85rem" };

// ── FARM ──────────────────────────────────────────────────────────────────────
// Beds are derived from activities where type === "crop_plan" && status === "planned"
// Seedling nursery and season rotation are derived from the same source.

function FarmSection({ userData, activities, userId, addPlantingSignal, bumpAddPlanting }) {
  const island = typeof userData?.location === "string"
    ? userData.location
    : userData?.location?.island || "—";

  const beds = activities
    .filter(a => a.type === "crop_plan" && a.status === "planned")
    .map(a => {
      const d = a.data || {};
      const days = daysUntil(d.harvestStart || d.harvestDate);
      return {
        id:          a.id,
        crop:        d.variant ? `${d.cropName} (${d.variant})` : (d.cropName || "Crop"),
        beds:        d.numBeds ? `${d.numBeds} bed${d.numBeds > 1 ? "s" : ""}` : "1 bed",
        plants:      d.seedsNeeded || "—",
        transplanted: d.transplantDate
          ? (d.transplantDate?.toDate ? d.transplantDate.toDate() : new Date(d.transplantDate))
              .toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "—",
        rowSpacing:  "—",
        plantSpacing: typeof d.spacing === "string" ? d.spacing : "—",
        days,
        label:       harvestLabel(days),
        est:         d.estimatedYield || null,
      };
    });

  // Seedling nursery: most recent crop_plan that has seedsNeeded field
  const nursery = activities.find(a => a.type === "crop_plan" && a.status === "planned" && a.data?.seedsNeeded);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.4rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.4rem" }}>🌾 Your Farm</h2>
          <p style={{ margin: "0.2rem 0 0", color: C.textMuted, fontSize: "0.88rem" }}>
            {island} · {beds.length} active bed{beds.length !== 1 ? "s" : ""} · {userData?.farmSize || "—"}
          </p>
        </div>
      </div>

      {/* Real Add Planting flow — full crop database, moon-phase planning,
          writes real crop_plan activities to Firestore. Triggered here via
          its own "+ Add a crop" button, or externally from Home's Quick
          Action via addPlantingSignal. */}
      <div style={{ marginBottom: "1.1rem" }}>
        <CropPlanner userData={{ ...userData, userId }} autoOpenSignal={addPlantingSignal} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.1rem" }}>
        {/* Seedling nursery */}
        <Card>
          <h3 style={{ margin: "0 0 0.9rem", fontSize: "0.95rem" }}>🌱 Seedling Nursery</h3>
          {nursery ? (() => {
            const d       = nursery.data || {};
            const req     = d.seedsNeeded  || 0;
            const succ    = d.successCount || 0;
            const rate    = req > 0 ? Math.round((succ / req) * 100) : 0;
            const short   = req - succ;
            const varLabel = d.variant ? `${d.cropName} – ${d.variant}` : (d.cropName || "Seedlings");
            return (
              <>
                <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{varLabel}</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: C.textMuted, margin: "0.4rem 0" }}>
                  <span>Required: {req}</span><span>Rate: {rate}%</span>
                </div>
                <div style={{ background: C.border, borderRadius: 4, height: 8, overflow: "hidden", margin: "0.4rem 0" }}>
                  <div style={{ width: `${Math.min(rate, 100)}%`, height: "100%", background: C.green, borderRadius: 4 }} />
                </div>
                <div style={{ fontSize: "0.78rem", color: C.textMuted }}>Successful: {succ} · Shortfall: {Math.max(short, 0)}</div>
                {short > 0 && (
                  <div style={{ marginTop: "0.65rem", background: "#FFF7ED", border: "1px solid #FCD34D", borderRadius: 6, padding: "0.45rem 0.7rem", fontSize: "0.78rem", color: "#92400E" }}>
                    ⚠️ Shortfall. Adjust forecast or restock.
                  </div>
                )}
              </>
            );
          })() : (
            <p style={{ color: C.textMuted, fontSize: "0.85rem" }}>No nursery data logged yet.</p>
          )}
        </Card>

        {/* Season rotation */}
        <Card>
          <h3 style={{ margin: "0 0 0.9rem", fontSize: "0.95rem" }}>📅 Season Rotation</h3>
          {beds.length > 0 ? beds.map((b, i) => {
            const pct = b.days == null ? 50 : Math.max(0, Math.min(100, 100 - Math.round((b.days / 90) * 100)));
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.55rem" }}>
                <div style={{ width: 80, fontSize: "0.78rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.crop.split(" ")[0]}</div>
                <div style={{ flex: 1, background: C.border, borderRadius: 4, height: 8, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: C.green, borderRadius: 4 }} />
                </div>
                <div style={{ fontSize: "0.74rem", color: C.textMuted, width: 55, textAlign: "right" }}>
                  {b.days != null && b.days <= 7 ? "Harvest" : "→"}
                </div>
              </div>
            );
          }) : (
            <p style={{ color: C.textMuted, fontSize: "0.85rem" }}>No crops in rotation.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── MARKET ────────────────────────────────────────────────────────────────────
// Reference prices come from the `market_prices` Firestore collection
// (admin-editable — see firestore.rules). "Your price" is derived from the
// user's own real sale activities → data.pricePerUnit. Nothing hardcoded here.

function useMarketPrices() {
  const [prices,  setPrices]  = useState([]);
  const [status,  setStatus]  = useState("loading"); // loading | ready | empty | error

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "market_prices"));
        if (cancelled) return;
        const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPrices(rows);
        setStatus(rows.length > 0 ? "ready" : "empty");
      } catch (e) {
        console.error("market_prices fetch error:", e);
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { prices, status };
}

function MarketSection({ userData, activities }) {
  const island = typeof userData?.location === "string"
    ? userData.location
    : userData?.location?.island || "Nassau";

  const { prices: marketRef, status: mktStatus } = useMarketPrices();

  // Derive user prices from most recent sale activities per produce
  const priceMap = {};
  activities
    .filter(a => a.type === "sale" && a.data?.produce && a.data?.pricePerUnit)
    .forEach(a => {
      const k = a.data.produce.toLowerCase();
      if (!priceMap[k]) priceMap[k] = Number(a.data.pricePerUnit);
    });

  return (
    <div>
      <SectionHead title="📊 Market Insights" sub={`${island} · Your prices vs. market · Price changes tracked`} />
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, fontSize: "0.95rem" }}>💰 Price Comparison</h3>
          <button style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "0.35rem 0.7rem", fontSize: "0.8rem", cursor: "pointer", color: C.textMuted }}>
            📤 Upload Receipt
          </button>
        </div>

        {mktStatus === "loading" && (
          <p style={{ color: C.textMuted, fontSize: "0.85rem", padding: "1rem 0" }}>Loading market prices…</p>
        )}
        {mktStatus === "error" && (
          <p style={{ color: C.red, fontSize: "0.85rem", padding: "1rem 0" }}>Couldn't load market prices. Try again shortly.</p>
        )}
        {mktStatus === "empty" && (
          <p style={{ color: C.textMuted, fontSize: "0.85rem", padding: "1rem 0" }}>
            No reference prices set up yet for {island}. Ask an admin to seed the <code>market_prices</code> collection.
          </p>
        )}

        {mktStatus === "ready" && (
        <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 380 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.border}` }}>
              <th style={tH}>PRODUCE</th>
              <th style={{ ...tH, textAlign: "right" }}>MARKET</th>
              <th style={{ ...tH, textAlign: "right" }}>YOUR PRICE</th>
            </tr>
          </thead>
          <tbody>
            {marketRef.map((r, i) => {
              const yours = priceMap[r.key] ?? null;
              const diff  = yours != null ? +(yours - r.market).toFixed(2) : null;
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={tD}>
                    <div style={{ fontWeight: 500 }}>{r.produce}</div>
                    <div style={{ fontSize: "0.73rem", color: C.textMuted }}>{r.unit}</div>
                  </td>
                  <td style={{ ...tD, textAlign: "right", fontWeight: 700, color: C.green }}>
                    ${Number(r.market).toFixed(2)}
                  </td>
                  <td style={{ ...tD, textAlign: "right" }}>
                    {yours != null ? (
                      <div>
                        <div style={{ fontWeight: 700 }}>${yours.toFixed(2)}</div>
                        <div style={{ fontSize: "0.72rem", color: diff === 0 ? C.textMuted : diff < 0 ? C.red : C.green }}>
                          {diff === 0 ? "At market" : diff < 0 ? `$${Math.abs(diff)} below` : `$${diff} above`}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: C.textMuted, fontSize: "0.8rem" }}>not set</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        )}
      </Card>
    </div>
  );
}

const tH = { textAlign: "left", fontSize: "0.72rem", color: C.textMuted, fontWeight: 700, letterSpacing: "0.05em", padding: "0.45rem 0" };
const tD = { padding: "0.7rem 0", verticalAlign: "top" };

// ── CROP DOCTOR ───────────────────────────────────────────────────────────────
// Diagnoses are saved to Firestore as activities with type === "diagnosis"
// so they feed into History and trigger onActivityCreate.
//
// FIX: previously "Disease / Fungal", "Nutrient Deficiency" and "Not sure"
// all silently ran the pest-only question tree (PEST_STEPS/DX_RESULTS) and
// the modal was always titled "Pest Diagnosis" regardless of what was
// clicked. Each entry now has its own real tree, and "guided" asks a
// category question first, then routes into the matching tree.

const DX_TREES = {
  pest: {
    label: "Pest Diagnosis",
    steps: [
      { q: "Can you see insects, or is it damage only?",
        opts: ["I can see insects moving", "Damage only – no insects visible", "Both insects and damage"] },
      { q: "Where are the insects located?",
        opts: ["Clustered on stems and new growth", "Under the leaves", "Flying around when disturbed", "On the soil surface near the base"] },
      { q: "What do they look like?",
        opts: [
          "Tiny soft-bodied clusters, green black or white – Aphids",
          "Tiny white moth-like insects – Whitefly",
          "Very small fast-moving, silver streaks on leaves – Thrips",
          "Small brown bumps, waxy or cottony coating – Scale",
        ]},
    ],
    results: {
      "Tiny soft-bodied clusters, green black or white – Aphids": {
        pest: "Aphids",
        desc: "Soft-bodied sap-sucking insects. Common when humidity is high and temperatures are warm. Often spread by ants who farm them for honeydew. Left untreated they cause stunted growth, curling leaves, and can transmit plant viruses.",
        treat: "Neem Oil 1% spray – apply to undersides of leaves at dusk. Repeat every 5 days for 3 cycles. Remove heavily infested leaves. Wash off with strong water stream first to reduce numbers before spraying.",
        organic: true, reentry: "7 days",
      },
      "Tiny white moth-like insects – Whitefly": {
        pest: "Whitefly",
        desc: "Small white flying insects found under leaves. Cause yellowing and honeydew secretion. Thrive in warm, humid Caribbean conditions.",
        treat: "Yellow sticky traps immediately. Neem Oil 1% spray every 4 days. Introduce reflective mulch. Prune heavily infested stems.",
        organic: true, reentry: "5 days",
      },
      "Very small fast-moving, silver streaks on leaves – Thrips": {
        pest: "Thrips",
        desc: "Tiny, fast-moving insects that scrape and feed on leaf tissue. Leave silver streaking and black fecal deposits. Can spread viral diseases.",
        treat: "Spinosad-based spray or Neem Oil 1%. Blue sticky traps for monitoring. Remove affected leaves. Apply every 5 days for 2–3 cycles.",
        organic: true, reentry: "7 days",
      },
      "Small brown bumps, waxy or cottony coating – Scale": {
        pest: "Scale",
        desc: "Immobile armored pests that feed by sucking plant sap. Produce honeydew that leads to sooty mold.",
        treat: "Rubbing alcohol swab on individual scales. Horticultural oil spray. Prune heavily infested branches.",
        organic: true, reentry: "3 days",
      },
    },
    fallback: { pest: "Unidentified pest", desc: "Based on your answers, further inspection is recommended.", treat: "Monitor closely. Avoid applying anything until pest is confirmed.", organic: false, reentry: "N/A" },
  },

  disease: {
    label: "Disease Diagnosis",
    steps: [
      { q: "Where on the plant are you seeing symptoms?",
        opts: ["Leaves — spots or lesions", "Leaves — powdery or fuzzy coating", "Stems or base of plant", "Fruit"] },
      { q: "What do the spots or affected areas look like?",
        opts: [
          "White or grey powdery coating on leaf surface – Powdery Mildew",
          "Yellow patches on top, fuzzy grey-purple underneath – Downy Mildew",
          "Dark water-soaked spots that spread quickly – Bacterial/Blight",
          "Sunken dark spots on fruit or stems – Anthracnose",
        ]},
    ],
    results: {
      "White or grey powdery coating on leaf surface – Powdery Mildew": {
        pest: "Powdery Mildew",
        desc: "Fungal disease favoured by high humidity with poor airflow. Coats leaves in a white-grey powder, weakening the plant and reducing yield if untreated.",
        treat: "Remove and destroy affected leaves. Improve airflow by pruning. Apply Copper Fungicide or a baking-soda spray (1 tbsp/gallon) every 5–7 days.",
        organic: true, reentry: "5 days",
      },
      "Yellow patches on top, fuzzy grey-purple underneath – Downy Mildew": {
        pest: "Downy Mildew",
        desc: "Thrives in cool, wet, humid conditions. Spreads fast on leafy greens and cucurbits, especially after rain.",
        treat: "Avoid overhead watering — switch to drip. Remove infected leaves immediately. Apply Copper Fungicide before rain events. Improve spacing for airflow.",
        organic: true, reentry: "7 days",
      },
      "Dark water-soaked spots that spread quickly – Bacterial/Blight": {
        pest: "Bacterial Blight",
        desc: "Bacterial infection that spreads via water splash and contaminated tools. Water-soaked lesions can expand rapidly in warm, wet weather.",
        treat: "Remove infected plants/leaves and destroy — do not compost. Sanitize tools between plants. Apply Copper Fungicide as a protectant. Avoid working plants when wet.",
        organic: true, reentry: "7 days",
      },
      "Sunken dark spots on fruit or stems – Anthracnose": {
        pest: "Anthracnose",
        desc: "Fungal disease causing sunken, dark lesions on fruit and stems. Spreads in warm, humid conditions, often via splashing water.",
        treat: "Remove and destroy affected fruit. Apply Copper Fungicide on a 7-day rotation. Mulch to reduce soil splash onto lower leaves and fruit.",
        organic: true, reentry: "5 days",
      },
    },
    fallback: { pest: "Unidentified disease", desc: "Symptoms don't clearly match a common pattern — a soil or leaf sample may help confirm.", treat: "Isolate affected plants where possible, avoid overhead watering, and monitor for spread over 2–3 days.", organic: false, reentry: "N/A" },
  },

  nutrient: {
    label: "Nutrient Deficiency Diagnosis",
    steps: [
      { q: "Where does the yellowing or discoloration start?",
        opts: ["Older, lower leaves first", "Newer, top growth first", "Between leaf veins, veins stay green", "Whole plant looks pale/stunted"] },
      { q: "Any other symptoms?",
        opts: [
          "Lower leaves yellow, plant looks generally pale – Nitrogen deficiency",
          "Purple or reddish tint on stems/undersides – Phosphorus deficiency",
          "Yellow/brown leaf edges (scorch) on older leaves – Potassium deficiency",
          "New growth distorted, blossom end rot on fruit – Calcium deficiency",
        ]},
    ],
    results: {
      "Lower leaves yellow, plant looks generally pale – Nitrogen deficiency": {
        pest: "Nitrogen deficiency",
        desc: "Nitrogen moves easily within the plant, so it's pulled from older leaves first to support new growth — causing overall pale, yellowing lower leaves.",
        treat: "Apply Fish Emulsion 5-1-1 as a foliar or soil drench, or side-dress with compost/worm castings. Repeat every 2 weeks during active growth.",
        organic: true, reentry: "0 days",
      },
      "Purple or reddish tint on stems/undersides – Phosphorus deficiency": {
        pest: "Phosphorus deficiency",
        desc: "Common in cool soil or low-pH conditions. Shows as dark green leaves with a purple or reddish tinge, especially on stems and leaf undersides.",
        treat: "Work bone meal or rock phosphate into the root zone. Check soil pH — phosphorus locks out below pH 5.5. Correct pH first if needed.",
        organic: true, reentry: "0 days",
      },
      "Yellow/brown leaf edges (scorch) on older leaves – Potassium deficiency": {
        pest: "Potassium deficiency",
        desc: "Shows as scorched, yellow-brown leaf margins on older leaves, often with weak stems and reduced fruit quality.",
        treat: "Apply worm castings or a kelp/seaweed-based amendment. Wood ash in small amounts can help in acidic soils — test pH first.",
        organic: true, reentry: "0 days",
      },
      "New growth distorted, blossom end rot on fruit – Calcium deficiency": {
        pest: "Calcium deficiency",
        desc: "Often not a true soil shortage but an uptake problem caused by inconsistent watering. Classic sign is blossom end rot on tomatoes and peppers.",
        treat: "Keep soil moisture consistent — deep, regular watering rather than feast/drought cycles. Apply Calcium Nitrate as a foliar spray for fast correction.",
        organic: false, reentry: "0 days",
      },
    },
    fallback: { pest: "Unclear nutrient issue", desc: "Symptoms could point to more than one deficiency, or a pH lock-out issue.", treat: "Test soil pH first — many 'deficiencies' are actually lock-out from pH being too high or low. Correct pH before adding more amendments.", organic: false, reentry: "N/A" },
  },
};

// "Not sure – guide me" asks this first, then routes into the matching tree above.
const GUIDED_CHOOSER = {
  q: "What are you seeing on your plant?",
  opts: [
    { label: "I see actual insects or bugs", routeTo: "pest" },
    { label: "Spots, powder, or fuzzy coating on leaves", routeTo: "disease" },
    { label: "Yellowing, discoloration, but no visible pests", routeTo: "nutrient" },
  ],
};

function CropDoctorSection({ userData, activities, userId, refetchActivities }) {
  const [modal,      setModal]      = useState(null);   // pest | disease | nutrient | guided
  const [activeType, setActiveType] = useState(null);   // resolved tree once known
  const [step,       setStep]       = useState(0);
  const [answers,    setAnswers]    = useState([]);
  const [dx,         setDx]         = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);

  const ENTRIES = [
    { id: "pest",     icon: "🐛", label: "Pest Problem",        sub: "Guided flowchart · question by question" },
    { id: "disease",  icon: "🍄", label: "Disease / Fungal",    sub: "Guided flowchart · question by question" },
    { id: "nutrient", icon: "🟡", label: "Nutrient Deficiency", sub: "Yellowing, stunting, color change" },
    { id: "guided",   icon: "❓", label: "Not sure – guide me", sub: "Full walkthrough from scratch" },
  ];

  // Diagnoses from Firestore activities
  const recentDx = activities.filter(a => a.type === "diagnosis").slice(0, 2);

  const openModal = (id) => {
    setModal(id);
    setActiveType(id === "guided" ? null : id);
    setStep(0); setAnswers([]); setDx(null); setSaved(false);
  };
  const closeModal = () => { setModal(null); setActiveType(null); };

  // Guided chooser step (only shown while modal === "guided" and no type resolved yet)
  const pickGuided = (opt) => {
    setActiveType(opt.routeTo);
    setStep(0);
    setAnswers([]);
  };

  const pick = (opt) => {
    const tree = DX_TREES[activeType];
    const next = [...answers, opt];
    setAnswers(next);
    if (step < tree.steps.length - 1) {
      setStep(step + 1);
    } else {
      setDx(tree.results[opt] || tree.fallback);
    }
  };

  // Save diagnosis as an activity document (type: "diagnosis")
  // onActivityCreate will log it for admin visibility
  const saveDiagnosis = async () => {
    if (!dx || !userId || saving) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "activities"), {
        userId,
        type:     "diagnosis",
        category: "farming",
        title:    `Diagnosis: ${dx.pest}`,
        message:  dx.treat.slice(0, 160),
        icon:     "🩺",
        status:   "unread",
        data: {
          issueType:   activeType,
          pest:        dx.pest,
          description: dx.desc,
          treatment:   dx.treat,
          organic:     dx.organic,
          reentry:     dx.reentry,
          flowAnswers: answers,
          diagnosedAt: new Date().toISOString(),
        },
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 30 * 24 * 864e5),
      });
      setSaved(true);
      if (refetchActivities) refetchActivities(userId);
    } catch (e) {
      console.error("Diagnosis save failed:", e);
    } finally {
      setSaving(false);
    }
  };

  const showingGuidedChooser = modal === "guided" && !activeType;
  const current = activeType ? DX_TREES[activeType].steps[step] : null;
  const modalTitle = showingGuidedChooser
    ? "What's going on?"
    : activeType ? DX_TREES[activeType].label : "";

  return (
    <div>
      <SectionHead title="🩺 Crop Doctor" sub="Guided diagnosis · Step by step · Identify & Treat" />

      <Card style={{ marginBottom: "1.1rem" }}>
        <h3 style={{ margin: "0 0 0.9rem", fontSize: "0.95rem" }}>What is going on with your plant?</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem" }}>
          {ENTRIES.map(e => (
            <button key={e.id} onClick={() => openModal(e.id)} style={docCard}>
              <div style={{ fontSize: "1.4rem", marginBottom: "0.35rem" }}>{e.icon}</div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: C.text }}>{e.label}</div>
              <div style={{ fontSize: "0.74rem", color: C.textMuted, marginTop: 2 }}>{e.sub}</div>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h3 style={{ margin: "0 0 0.9rem", fontSize: "0.95rem" }}>📋 Recent Diagnoses</h3>
        {recentDx.length > 0 ? recentDx.map((d, i) => (
          <div key={d.id} style={{ display: "flex", gap: "0.65rem", padding: "0.55rem 0", borderBottom: i === 0 ? `1px solid ${C.border}` : "none" }}>
            <span style={{ fontSize: "1.05rem" }}>🩺</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{d.title}</div>
              <div style={{ fontSize: "0.74rem", color: C.textMuted }}>{d.message}</div>
            </div>
          </div>
        )) : (
          <p style={{ color: C.textMuted, fontSize: "0.85rem" }}>No diagnoses saved yet. Use the flowchart above.</p>
        )}
      </Card>

      {modal && (
        <div style={overlay} onClick={closeModal}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            style={mBox}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1rem" }}>{modalTitle}</h3>
              <button onClick={closeModal} style={xBtn}>✕</button>
            </div>

            {showingGuidedChooser ? (
              <>
                <div style={{ background: C.greenLight, borderRadius: 8, padding: "0.7rem 0.9rem", marginBottom: "0.9rem", fontWeight: 600, fontSize: "0.9rem", color: C.text }}>
                  {GUIDED_CHOOSER.q}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                  {GUIDED_CHOOSER.opts.map((o, i) => (
                    <button key={i} onClick={() => pickGuided(o)} style={flowOpt}>{o.label}</button>
                  ))}
                </div>
              </>
            ) : !dx ? (
              <>
                <div style={{ fontSize: "0.74rem", color: C.textMuted, marginBottom: "0.6rem" }}>Step {step + 1} of {DX_TREES[activeType].steps.length}</div>
                <div style={{ background: C.greenLight, borderRadius: 8, padding: "0.7rem 0.9rem", marginBottom: "0.9rem", fontWeight: 600, fontSize: "0.9rem", color: C.text }}>
                  {current.q}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                  {current.opts.map((o, i) => (
                    <button key={i} onClick={() => pick(o)} style={flowOpt}>{o}</button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div style={{ background: C.green, borderRadius: 10, padding: "1rem 1.1rem", marginBottom: "0.9rem", color: "#fff" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.4rem", color: "#B8E08A" }}>Diagnosis: {dx.pest}</div>
                  <div style={{ fontSize: "0.83rem", lineHeight: 1.55 }}>{dx.desc}</div>
                </div>
                <div style={{ background: C.green, borderRadius: 10, padding: "1rem 1.1rem", marginBottom: "1rem", color: "#fff" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.4rem", color: "#B8E08A" }}>Treatment:</div>
                  <div style={{ fontSize: "0.83rem", lineHeight: 1.55 }}>{dx.treat}</div>
                  <div style={{ marginTop: "0.6rem", fontSize: "0.8rem", fontWeight: 600 }}>
                    Organic: {dx.organic ? "Yes" : "No"} | Re-entry: {dx.reentry}
                  </div>
                </div>
                {saved ? (
                  <div style={{ textAlign: "center", color: C.green, fontWeight: 600, fontSize: "0.88rem" }}>✓ Diagnosis saved</div>
                ) : (
                  <button
                    onClick={saveDiagnosis}
                    disabled={saving}
                    style={{ ...flowOpt, background: C.green, color: "#fff", fontWeight: 700, border: "none", textAlign: "center", opacity: saving ? 0.7 : 1 }}
                  >
                    {saving ? "Saving…" : "Save Diagnosis and Treatment Plan"}
                  </button>
                )}
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}

const docCard = { background: C.greenLight, border: `1px solid ${C.border}`, borderRadius: 10, padding: "0.9rem", cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.15s" };
const overlay  = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1.5rem" };
const mBox     = { background: "#fff", borderRadius: 14, padding: "1.5rem", width: "100%", maxWidth: 460, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" };
const xBtn     = { background: "#f0f0f0", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: "0.82rem", fontWeight: 700, color: "#555" };
const flowOpt  = { width: "100%", padding: "0.7rem 0.9rem", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", textAlign: "left", fontSize: "0.85rem", color: C.text };

// ── INPUT LIBRARY ─────────────────────────────────────────────────────────────
// Products + compatibility rules come from the `input_library` and
// `input_compat_rules` Firestore collections (see firestore.rules). Any
// signed-in user can add a product from the dashboard; only admin can edit
// compatibility rules (those carry real safety implications).

function useInputLibrary() {
  const [inputs, setInputs] = useState([]);
  const [rules,  setRules]  = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus("loading");
      try {
        const [inputSnap, ruleSnap] = await Promise.all([
          getDocs(collection(db, "input_library")),
          getDocs(collection(db, "input_compat_rules")),
        ]);
        if (cancelled) return;
        setInputs(inputSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setRules(ruleSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setStatus("ready");
      } catch (e) {
        console.error("input_library fetch error:", e);
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [reload]);

  return { inputs, rules, status, refetch: () => setReload(r => r + 1) };
}

function InputLibrarySection({ userId }) {
  const { inputs, rules, status, refetch } = useInputLibrary();
  const [sel, setSel] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", type: "", rate: "", icon: "🧴" });
  const [saving, setSaving] = useState(false);

  const toggle = (name) => setSel(prev =>
    prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
  );

  const results = rules.filter(c =>
    (sel.includes(c.a) && sel.includes(c.b)) ||
    (sel.includes(c.b) && sel.includes(c.a))
  );

  const addProduct = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "input_library"), {
        name: form.name.trim(),
        type: form.type.trim() || "Uncategorized",
        rate: form.rate.trim() || "Rate not set — check label",
        icon: form.icon || "🧴",
        addedBy: userId || null,
        createdAt: serverTimestamp(),
      });
      setForm({ name: "", type: "", rate: "", icon: "🧴" });
      setShowAdd(false);
      refetch();
    } catch (e) {
      console.error("Failed to add input:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <SectionHead title="✏️ Input Library" sub="Your pesticides, amendments & inputs · Rates & compatibility" />

      {status === "loading" && <p style={{ color: C.textMuted, fontSize: "0.85rem" }}>Loading your input library…</p>}
      {status === "error"   && <p style={{ color: C.red, fontSize: "0.85rem" }}>Couldn't load inputs. Try again shortly.</p>}

      {status === "ready" && (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.9rem", marginBottom: "1.4rem" }}>
        {inputs.length === 0 && (
          <p style={{ color: C.textMuted, fontSize: "0.85rem", gridColumn: "1 / -1" }}>
            No products yet. Add your first one below.
          </p>
        )}
        {inputs.map((inp, i) => (
          <Card
            key={inp.id || i}
            onClick={() => toggle(inp.name)}
            style={{ cursor: "pointer", border: `2px solid ${sel.includes(inp.name) ? C.green : "transparent"}`, transition: "border 0.15s" }}
          >
            <div style={{ fontSize: "1.65rem", marginBottom: "0.4rem" }}>{inp.icon}</div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{inp.name}</div>
            <div style={{ fontSize: "0.74rem", color: C.textMuted, margin: "0.18rem 0" }}>{inp.type}</div>
            <div style={{ fontSize: "0.78rem", color: C.green, fontWeight: 600 }}>{inp.rate}</div>
          </Card>
        ))}
        <Card
          onClick={() => setShowAdd(true)}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", cursor: "pointer", border: `2px dashed ${C.border}`, background: "#FAFAFA", minHeight: 120 }}
        >
          <div style={{ fontSize: "1.4rem", color: C.textMuted, marginBottom: "0.4rem" }}>➕</div>
          <div style={{ fontSize: "0.78rem", color: C.textMuted }}>Add a product to your library</div>
        </Card>
      </div>
      )}

      {showAdd && (
        <div style={overlay} onClick={() => setShowAdd(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            style={mBox}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1rem" }}>Add a Product</h3>
              <button onClick={() => setShowAdd(false)} style={xBtn}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: C.textMuted, marginBottom: "0.3rem" }}>Name *</label>
                <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Bacillus thuringiensis" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: C.textMuted, marginBottom: "0.3rem" }}>Type</label>
                <input style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} placeholder="e.g. Insecticide · Organic" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: C.textMuted, marginBottom: "0.3rem" }}>Rate</label>
                <input style={inputStyle} value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} placeholder="e.g. 1 tsp/L water" />
              </div>
            </div>
            <button
              onClick={addProduct}
              disabled={saving || !form.name.trim()}
              style={{ ...flowOptFull, marginTop: "1.1rem", background: C.green, color: "#fff", fontWeight: 700, border: "none", opacity: saving ? 0.7 : 1 }}
            >
              {saving ? "Saving…" : "Add Product"}
            </button>
          </motion.div>
        </div>
      )}

      <Card>
        <h3 style={{ margin: "0 0 0.4rem", fontSize: "0.95rem" }}>🔗 Compatibility Check</h3>
        <p style={{ margin: "0 0 0.9rem", fontSize: "0.82rem", color: C.textMuted }}>Select products above to check if they can be safely tank-mixed.</p>
        {results.length > 0 ? results.map((r, i) => (
          <div key={i} style={{ padding: "0.6rem 0.85rem", borderRadius: 8, marginBottom: "0.45rem", background: r.ok ? "#F0FDF4" : "#FFF7ED", border: `1px solid ${r.ok ? "#86EFAC" : "#FCD34D"}`, fontSize: "0.83rem", color: r.ok ? "#15803D" : "#92400E" }}>
            {r.ok ? "✓" : "⚠️"} <strong>{r.a} + {r.b}:</strong> {r.note}
          </div>
        )) : (
          <div style={{ color: C.textMuted, fontSize: "0.83rem" }}>
            {sel.length < 2
              ? "Select two or more products above to check compatibility."
              : "No known compatibility rules for this combination. Always patch-test first."}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── HISTORY ───────────────────────────────────────────────────────────────────
// Reads directly from the activities collection filtered by userId.
// All writes happen from other sections or Cloud Functions — History is read-only.

const PERIODS = ["Daily", "Weekly", "Monthly", "Annual"];
const FILTERS = ["All", "Harvests", "Sales", "Sprays", "Amendments", "Purchases", "Observations", "Diagnoses"];

// Map activity type → filter key
const TYPE_TO_FILTER = {
  harvest:     "harvests",
  sale:        "sales",
  spray:       "sprays",
  amendment:   "amendments",
  restock:     "purchases",
  purchase:    "purchases",
  observation: "observations",
  diagnosis:   "diagnoses",
};

function formatTs(ts) {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function HistorySection({ activities }) {
  const [filter, setFilter] = useState("all");

  // Filter out system/internal types
  const loggable = activities.filter(a =>
    !["notification", "weather_alert", "reminder", "admin_notification", "crop_plan"].includes(a.type)
  );

  const filtered = loggable.filter(a =>
    filter === "all" || TYPE_TO_FILTER[a.type] === filter
  );

  // Group by day
  const grouped = {};
  filtered.forEach(a => {
    const ts   = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || Date.now());
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 864e5);
    let label;
    if (ts >= today)              label = `Today · ${ts.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
    else if (ts >= yesterday)     label = "Yesterday";
    else                          label = ts.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(a);
  });

  return (
    <div>
      <SectionHead title="📋 Full History" sub="Every action · Every bed · Every person · Fully traceable" />

      <div style={{ display: "flex", gap: "0.45rem", marginBottom: "0.85rem", flexWrap: "wrap" }}>
        {PERIODS.map(p => (
          <button key={p} style={pTab}>{p}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.85rem" }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f.toLowerCase())}
            style={{ ...filt, ...(filter === f.toLowerCase() ? filtOn : {}) }}>
            {f}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1.3rem", flexWrap: "wrap" }}>
        {["📤 Export CSV", "📤 Export PDF", "✉️ Email Report"].map((b, i) => (
          <button key={i} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "0.35rem 0.7rem", fontSize: "0.78rem", cursor: "pointer", color: C.textMuted }}>{b}</button>
        ))}
      </div>

      {Object.keys(grouped).length > 0 ? Object.entries(grouped).map(([date, items]) => (
        <div key={date} style={{ marginBottom: "1.3rem" }}>
          <div style={{ fontWeight: 700, fontSize: "0.92rem", color: C.text, marginBottom: "0.6rem" }}>{date}</div>
          <Card style={{ padding: 0 }}>
            {items.map((item, i) => (
              <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: "0.7rem", padding: "0.85rem 1.15rem", borderBottom: i < items.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: C.greenLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem", flexShrink: 0 }}>
                  {item.icon || "🌾"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{item.title}</div>
                  <div style={{ fontSize: "0.74rem", color: C.textMuted, marginTop: 2 }}>{item.message}</div>
                </div>
                <div style={{ fontSize: "0.72rem", color: C.textMuted, whiteSpace: "nowrap" }}>
                  {formatTs(item.createdAt)}
                </div>
              </div>
            ))}
          </Card>
        </div>
      )) : (
        <Card style={{ textAlign: "center", padding: "2.5rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📋</div>
          <div style={{ color: C.textMuted, fontSize: "0.88rem" }}>
            {filter === "all" ? "No activity logged yet." : `No ${filter} logged yet.`}
          </div>
        </Card>
      )}
    </div>
  );
}

const pTab   = { padding: "0.35rem 0.9rem", border: `1px solid ${C.border}`, borderRadius: 6, background: "none", cursor: "pointer", fontSize: "0.82rem", color: C.textMuted };
const filt   = { padding: "0.25rem 0.7rem", border: `1px solid ${C.border}`, borderRadius: 20, background: "none", cursor: "pointer", fontSize: "0.76rem", color: C.textMuted };
const filtOn = { background: C.green, color: "#fff", border: `1px solid ${C.green}`, fontWeight: 600 };

// ── PROFILE ───────────────────────────────────────────────────────────────────
// Read-only view in the grower dashboard. Full editing happens at /profile.
// Fields mirror what onUserCreate seeds and Profile.jsx writes:
// name, email, planType, farmName, location.island, soilType, irrigation, farmSize

function ProfileSection({ userData }) {
  const u      = userData || {};
  const island = typeof u.location === "string"
    ? u.location
    : u.location?.island || "—";
  const settlement = typeof u.location === "object"
    ? u.location?.settlement || ""
    : "";
  const loc = settlement ? `${island} / ${settlement}` : island;

  return (
    <div>
      <SectionHead title="👤 Profile & Settings" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.1rem" }}>
        <Card>
          <h3 style={{ margin: "0 0 1.1rem", fontSize: "0.95rem", fontWeight: 700 }}>Personal Info</h3>
          {[
            { label: "NAME",  val: u.name  || "—",          badge: null },
            { label: "EMAIL", val: u.email || "—",           badge: null },
            { label: "PLAN",  val: null, badge: u.planType === "paid" ? "Pro ✓" : "Free" },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.65rem 0", borderBottom: i < 2 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.textMuted, letterSpacing: "0.04em" }}>{r.label}</div>
              {r.badge
                ? <Pill color={u.planType === "paid" ? C.orange : C.textMuted}>{r.badge}</Pill>
                : <div style={{ fontWeight: 500, fontSize: "0.88rem" }}>{r.val}</div>
              }
            </div>
          ))}
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 1.1rem", fontSize: "0.95rem", fontWeight: 700 }}>Farm Settings</h3>
          {[
            { label: "FARM",       val: u.farmName   || u.name ? `${u.name?.split(" ")[0]}'s Farm` : "My Farm" },
            { label: "LOCATION",   val: loc },
            { label: "SOIL",       val: u.soilType   || u.terrain || "—" },
            { label: "IRRIGATION", val: u.irrigation || (u.waterSources?.[0]) || "—" },
            { label: "AREA",       val: u.farmSize   || "—" },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0", borderBottom: i < 4 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.textMuted, letterSpacing: "0.04em" }}>{r.label}</div>
              <div style={{ fontWeight: 500, fontSize: "0.85rem", color: C.text }}>{r.val}</div>
            </div>
          ))}
        </Card>
      </div>

      <div style={{ marginTop: "1.1rem" }}>
        <a
          href="/profile"
          style={{ display: "inline-block", background: C.green, color: "#fff", borderRadius: 8, padding: "0.65rem 1.25rem", fontWeight: 600, fontSize: "0.88rem", textDecoration: "none" }}
        >
          Edit Full Profile →
        </a>
      </div>
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function GrowerDashboard() {
  const viewport = useViewport();
  const isMobile = viewport === "mobile";
  const [section,    setSection]    = useState("home");
  const [addPlantingSignal, setAddPlantingSignal] = useState(0);
  const [logModalType, setLogModalType] = useState(null); // harvest|sale|spray|observation|amendment|restock
  const [userData,   setUserData]   = useState(null);
  const [activities, setActivities] = useState([]);
  const [userId,     setUserId]     = useState(null);
  const [loading,    setLoading]    = useState(true);

  // Reusable — called on initial load, after any Quick Action write, and on
  // every section change so data from CropPlanner / LogActivityModal /
  // Crop Doctor shows up without a full page reload.
  const refetchActivities = useCallback(async (uid) => {
    const targetUid = uid || userId;
    if (!targetUid) return;
    try {
      const q = query(
        collection(db, "activities"),
        where("userId", "==", targetUid),
        orderBy("createdAt", "desc"),
        limit(100)
      );
      const acts = await getDocs(q);
      setActivities(acts.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("refetchActivities error:", e);
    }
  }, [userId]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { window.location.href = "/get-started"; return; }
      setUserId(user.uid);
      try {
        // Read user document — same path Profile.jsx reads from
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          setUserData({
            id:    user.uid,
            email: user.email,
            name:  snap.data().name || user.displayName || user.email?.split("@")[0],
            ...snap.data(),
          });
        } else {
          // No user doc → send to onboarding
          window.location.href = "/get-started";
          return;
        }

        // Read activities — filtered by userId, ordered by createdAt desc, limit 100
        // Firestore rules: activities readable only when resource.data.userId == auth.uid
        await refetchActivities(user.uid);
      } catch (e) {
        console.error("GrowerDashboard load error:", e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh activities whenever the user switches tabs — cheap, and covers
  // writes made by CropPlanner (Farm tab) that this component doesn't
  // otherwise get notified about.
  useEffect(() => {
    if (userId) refetchActivities(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: C.cream, flexDirection: "column", gap: "0.75rem", color: C.textMuted }}>
        <div style={{ fontSize: "2.5rem" }}>🌱</div>
        <div style={{ fontSize: "0.95rem" }}>Loading your farm…</div>
      </div>
    );
  }

  const shared = {
    userData, activities, userId, setSection,
    bumpAddPlanting: () => setAddPlantingSignal(s => s + 1),
    openLogModal: (type) => setLogModalType(type),
    refetchActivities,
  };

  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: "100vh", overflow: "hidden", fontFamily: "'Inter',sans-serif" }}>
      <Sidebar active={section} setActive={setSection} userData={userData} viewport={viewport} />
      <main style={{
        flex: 1,
        overflowY: "auto",
        background: C.cream,
        padding: "clamp(1rem, 3vw, 1.75rem) clamp(1rem, 4vw, 2rem)",
        width: "100%",
      }}>
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          {section === "home"    && <HomeSection      {...shared} />}
          {section === "farm"    && <FarmSection      {...shared} addPlantingSignal={addPlantingSignal} />}
          {section === "market"  && <MarketSection    {...shared} />}
          {section === "doctor"  && <CropDoctorSection {...shared} />}
          {section === "inputs"  && <InputLibrarySection userId={userId} />}
          {section === "history" && <HistorySection   {...shared} />}
          {section === "profile" && <ProfileSection   {...shared} />}
        </motion.div>
      </main>

      {logModalType && (
        <LogActivityModal
          type={logModalType}
          userId={userId}
          onClose={() => setLogModalType(null)}
          onSaved={async () => {
            await refetchActivities(userId);
            setLogModalType(null);
          }}
        />
      )}
    </div>
  );
}
