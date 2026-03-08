import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { db, auth } from "../firebase";
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import CropPlanner from "../components/CropPlanner";
import WeatherWidget from "../components/WeatherWidget";

export default function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchUserData(currentUser.uid, currentUser);
      } else {
        window.location.href = "/get-started";
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchUserData = async (userId, authUser) => {
    setLoading(true);
    try {
      // Retry up to 5 times with increasing delays — handles the race condition
      // where onUserCreate Cloud Function hasn't written the Firestore doc yet
      // (common with Google OAuth sign-in)
      let userDoc = null;
      const delays = [0, 1000, 2000, 3000, 4000];
      for (let i = 0; i < delays.length; i++) {
        if (delays[i] > 0) await new Promise(res => setTimeout(res, delays[i]));
        userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) break;
        console.log(`User doc not found yet, retrying... (attempt ${i + 1})`);
      }

      if (userDoc && userDoc.exists()) {
        const data = userDoc.data();
        const resolvedName = data.name ||
          authUser?.displayName ||
          (authUser?.email ? authUser.email.split('@')[0] : null);
        setUserData({ id: userId, ...data, name: resolvedName });

        if (!data.name && resolvedName) {
          updateDoc(doc(db, "users", userId), { name: resolvedName }).catch(() => {});
        }

        const activitiesQuery = query(
          collection(db, "activities"),
          where("userId", "==", userId),
          orderBy("createdAt", "desc"),
          limit(20)
        );
        const activitiesSnapshot = await getDocs(activitiesQuery);
        const activitiesData = activitiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setActivities(activitiesData);
      } else {
        console.error("User document not found after retries — redirecting to onboarding");
        window.location.href = "/get-started";
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching user data:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (!userData) {
    return (
      <div style={styles.loading}>
        <p>Unable to load dashboard. Please try again.</p>
      </div>
    );
  }

  return (
    <div style={styles.dashboard}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={styles.header}
      >
        <h1>Welcome back, {userData.name || "Farmer"}! 🌱</h1>
        <p style={styles.subtitle}>
          {userData.location?.island} • {userData.farmSize} • {userData.farmingType} Farming
          {userData.planType === "paid" && (
            <span style={styles.premiumBadge}>💬 Premium</span>
          )}
        </p>
      </motion.div>

      <div style={styles.tabs}>
        {["overview", "planner", "weather", "resources"].map(tab => (
          <motion.button
            key={tab}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.tabActive : {})
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </motion.button>
        ))}
      </div>

      <div style={styles.content}>
        {activeTab === "overview" && (
          <OverviewTab userData={userData} activities={activities} user={user} />
        )}
        {activeTab === "planner" && <PlannerTab userData={userData} />}
        {activeTab === "weather" && <WeatherTab userData={userData} />}
        {activeTab === "resources" && <ResourcesTab />}
      </div>
    </div>
  );
}

function OverviewTab({ userData, activities }) {
  const weatherAlerts = activities.filter(a => a.type === "weather_alert");
  const reminders = activities.filter(a => a.type === "reminder" && a.status !== "completed");

  const plansFromActivities = activities
    .filter(a => a.type === "crop_plan")
    .map(a => a.data?.cropName && a.data?.variant
      ? `${a.data.cropName} (${a.data.variant})`
      : a.data?.cropName || a.title?.replace(" Planting Plan", "") || "Unknown crop"
    );
  const activeCrops = [
    ...new Set([...(userData.currentCrops || []), ...plansFromActivities])
  ];

  return (
    <div style={styles.tabContent}>
      <div style={styles.grid}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} style={styles.card}>
          <h3>🌾 Your Farm</h3>
          <div style={styles.statGrid}>
            <div style={styles.stat}>
              <span style={styles.statValue}>{activeCrops.length}</span>
              <span style={styles.statLabel}>Active Crops</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statValue}>{userData.stats?.cropsHarvested || 0}</span>
              <span style={styles.statLabel}>Harvested</span>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} style={styles.card}>
          <h3>🥬 Growing Now</h3>
          {activeCrops.length > 0 ? (
            <div style={styles.cropList}>
              {activeCrops.map((crop, i) => (
                <div key={i} style={styles.cropItem}>
                  <span>{crop}</span>
                  <span style={styles.cropStatus}>Active</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={styles.emptyState}>No crops planted yet. Start planning!</p>
          )}
        </motion.div>

        {weatherAlerts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} style={{...styles.card, ...styles.alertCard}}>
            <h3>{weatherAlerts[0].icon} Weather Alert</h3>
            <strong>{weatherAlerts[0].title}</strong>
            <p style={styles.alertMessage}>{weatherAlerts[0].message}</p>
            {weatherAlerts[0].data?.farmingAdvice && (
              <ul style={styles.recommendations}>
                {weatherAlerts[0].data.farmingAdvice.slice(0, 3).map((advice, i) => (
                  <li key={i}>{advice}</li>
                ))}
              </ul>
            )}
          </motion.div>
        )}

        {userData.planType === "paid" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} style={{...styles.card, ...styles.consultationCard}}>
            <h3>💬 Expert Support</h3>
            <div style={styles.consultationStatus}>
              <span>Status:</span>
              <span style={{
                ...styles.statusBadge,
                backgroundColor: userData.consultationStatus === "pending" ? "#E6A93C" : "#7FB34D"
              }}>
                {userData.consultationStatus || "Ready"}
              </span>
            </div>
            {userData.currentIssue && (
              <p style={styles.currentIssue}>
                <strong>Current Issue:</strong> {userData.currentIssue}
              </p>
            )}
            <a href={`https://wa.me/${userData.phone}`} style={styles.whatsappButton} target="_blank" rel="noopener noreferrer">
              💬 Message on WhatsApp
            </a>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} style={styles.card}>
          <h3>📋 Upcoming Tasks</h3>
          {reminders.length > 0 ? (
            <div style={styles.taskList}>
              {reminders.slice(0, 5).map((reminder) => (
                <TaskItem key={reminder.id} reminder={reminder} />
              ))}
            </div>
          ) : (
            <p style={styles.emptyState}>No upcoming tasks. Check the planner!</p>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }} style={styles.card}>
          <h3>📊 Recent Activity</h3>
          {activities.length > 0 ? (
            <div style={styles.activityList}>
              {activities.slice(0, 5).map((activity) => (
                <div key={activity.id} style={styles.activityItem}>
                  <span style={styles.activityIcon}>{activity.icon}</span>
                  <div style={styles.activityContent}>
                    <div style={styles.activityTitle}>{activity.title}</div>
                    <div style={styles.activityType}>{activity.type.replace('_', ' ')}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={styles.emptyState}>No activity yet. Start planning your crops!</p>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function TaskItem({ reminder }) {
  const getDateLabel = (scheduledFor) => {
    if (!scheduledFor) return "Soon";
    const date = scheduledFor.toDate ? scheduledFor.toDate() : new Date(scheduledFor);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={styles.taskItem}>
      <span style={styles.taskIcon}>{reminder.icon}</span>
      <div>
        <div style={styles.taskText}>{reminder.message}</div>
        <div style={styles.taskDate}>{getDateLabel(reminder.scheduledFor)}</div>
      </div>
    </div>
  );
}

function PlannerTab({ userData }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} style={styles.tabContent}>
      <h2>🗓️ Crop Planning Tool</h2>
      <p style={styles.description}>Plan your planting schedule based on crop cycles and climate data</p>
      <CropPlanner userData={userData} />
    </motion.div>
  );
}

function WeatherTab({ userData }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} style={styles.tabContent}>
      <h2>🌤️ Climate & Weather Data</h2>
      <p style={styles.description}>Real-time weather and climate insights for {userData.location?.island || "your location"}</p>
      <WeatherWidget location={userData.location} userData={userData} />
    </motion.div>
  );
}

function ResourcesTab() {
  const resources = [
    { icon: "🐛", title: "Natural Pest Control", tips: ["Spray diluted neem oil (2 tbsp per litre) on leaves weekly to deter aphids, whitefly, and mites.", "Introduce marigolds as border plants — their scent repels nematodes and aphids naturally.", "Yellow sticky traps catch whitefly and fungus gnats before populations explode.", "Hand-pick caterpillars and hornworms early morning when they're slowest.", "A soap-water spray (1 tsp dish soap per litre) kills soft-bodied insects on contact."] },
    { icon: "🔄", title: "Crop Rotation for Caribbean Soils", tips: ["Rotate Solanaceae (tomatoes, peppers, eggplant) with legumes (beans, peas) every season to replenish nitrogen.", "Never follow cabbage with another Brassica — rotate with okra or corn instead.", "Root vegetables (beets, radish) break up compacted soil naturally before planting heavy feeders.", "Resting a bed with green manure (cowpea, velvet bean) for one cycle restores organic matter.", "Keep a simple journal — just crop name and bed location each season — to track rotations."] },
    { icon: "💧", title: "Water Management", tips: ["Water deeply and infrequently — shallow daily watering encourages shallow roots that stress faster.", "Drip irrigation at the root zone uses up to 60% less water than overhead sprinklers.", "Mulch with dry grass or sugarcane bagasse to reduce evaporation and keep roots cool.", "Water early morning (before 8am) — afternoon watering causes fungal issues in Caribbean humidity.", "Check soil moisture at 5cm depth before watering — if it's still damp, wait another day."] },
    { icon: "♻️", title: "Composting in the Caribbean", tips: ["Hot composting works fast in Caribbean heat — a well-built pile reaches harvest-ready in 6–8 weeks.", "Balance 3 parts brown (dry leaves, cardboard) to 1 part green (food scraps, fresh cuttings).", "Avoid adding meat, citrus, or diseased plants — these attract pests or kill beneficial microbes.", "Turning the pile every 3–4 days keeps oxygen flowing and speeds decomposition significantly.", "Finished compost should smell earthy, not rotten — dark, crumbly texture means it's ready to use."] },
    { icon: "🔬", title: "Disease Identification", tips: ["Yellow leaves with green veins = iron or magnesium deficiency — apply foliar spray of Epsom salt.", "Brown spots with yellow halo on tomato/pepper leaves = bacterial spot — remove affected leaves immediately.", "Powdery white coating on leaves = powdery mildew — spray baking soda solution (1 tsp per litre water).", "Wilting despite adequate water, brown inside stem = fusarium wilt — remove entire plant, do not compost.", "Tiny bronze speckling on leaves = thrips damage — check undersides of leaves and apply neem oil."] },
    { icon: "🌾", title: "Harvest Timing Guide", tips: ["Tomatoes: harvest when fully coloured but still slightly firm — they continue ripening off the vine.", "Sweet peppers: pick green at full size or wait for full colour change — both stages are correct.", "Okra: harvest pods at 7–10cm — once they go woody (over 12cm) the plant slows production.", "Cucumbers: pick before seeds harden — daily checking during peak season prevents overripe fruit.", "Leafy greens: harvest outer leaves first, always leaving the growing centre intact for regrowth."] },
    { icon: "🌱", title: "Seed Saving Basics", tips: ["Save seeds from your healthiest, best-producing plants — never from weak or diseased ones.", "Tomato seeds need fermentation — scoop into water, ferment 2–3 days, rinse and dry thoroughly.", "Pepper seeds: dry inside the pepper on the plant, then extract and air-dry for two weeks.", "Store seeds in paper envelopes inside an airtight jar with a small silica packet to absorb moisture.", "Label everything with crop name, variety, and harvest year — seeds stored dry last 3–5 years."] },
    { icon: "🌿", title: "Companion Planting", tips: ["Basil planted beside tomatoes repels thrips and aphids and is said to improve fruit flavour.", "Beans fix nitrogen — plant between corn rows to feed the heavy feeder naturally (the 'Three Sisters').", "Nasturtiums act as a trap crop — aphids prefer them over vegetables, keeping your food crops clean.", "Avoid planting fennel near most vegetables — it inhibits growth of tomatoes, peppers, and beans.", "Chives and garlic planted around brassicas deter cabbage moths and aphids effectively."] }
  ];

  const [activeResource, setActiveResource] = React.useState(null);

  React.useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") setActiveResource(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} style={styles.tabContent}>
      <h2>📚 Farming Resources</h2>
      <p style={styles.description}>Practical Caribbean farming knowledge — tap any card to learn more</p>
      <div style={styles.resourceGrid}>
        {resources.map((resource, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.04 }}
            whileHover={{ y: -3, boxShadow: "0 6px 20px rgba(0,0,0,0.12)" }}
            style={styles.resourceCard}
            onClick={() => setActiveResource(resource)}
          >
            <div style={styles.resourceCardHeader}>
              <div style={styles.resourceIcon}>{resource.icon}</div>
              <h4 style={styles.resourceTitle}>{resource.title}</h4>
              <span style={styles.chevron}>▶</span>
            </div>
          </motion.div>
        ))}
      </div>

      {activeResource && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={styles.modalOverlay} onClick={() => setActiveResource(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            style={styles.modal}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setActiveResource(null)} style={styles.modalClose} aria-label="Close">✕</button>
            <div style={styles.modalHeader}>
              <span style={styles.modalIcon}>{activeResource.icon}</span>
              <h3 style={styles.modalTitle}>{activeResource.title}</h3>
            </div>
            <ul style={styles.modalTips}>
              {activeResource.tips.map((tip, j) => (
                <li key={j} style={styles.modalTip}>{tip}</li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}

const styles = {
  dashboard: { minHeight: "100vh", background: "var(--paper-cream)", padding: "2rem" },
  loading: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", color: "#666" },
  spinner: { width: "50px", height: "50px", border: "5px solid #f3f3f3", borderTop: "5px solid var(--soil-green)", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "1rem" },
  header: { marginBottom: "2rem", textAlign: "center" },
  subtitle: { color: "#666", fontSize: "1rem", marginTop: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", flexWrap: "wrap" },
  premiumBadge: { background: "var(--soil-green)", color: "white", padding: "0.25rem 0.75rem", borderRadius: "12px", fontSize: "0.85rem", fontWeight: "600" },
  tabs: { display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "2px solid #e0e0e0", justifyContent: "center", flexWrap: "wrap" },
  tab: { padding: "0.75rem 1.5rem", background: "none", border: "none", borderBottom: "3px solid transparent", cursor: "pointer", fontSize: "1rem", fontWeight: "500", color: "#666", transition: "all 0.2s" },
  tabActive: { color: "var(--soil-green)", borderBottom: "3px solid var(--soil-green)" },
  content: { maxWidth: "1200px", margin: "0 auto" },
  tabContent: { animation: "fadeIn 0.3s ease" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" },
  card: { background: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" },
  alertCard: { background: "#FFF4E6", border: "2px solid var(--sun-mustard)" },
  consultationCard: { background: "#F0F9F4", border: "2px solid var(--soil-green)" },
  alertMessage: { marginTop: "0.5rem", color: "#666" },
  statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" },
  stat: { display: "flex", flexDirection: "column", alignItems: "center", padding: "1rem", background: "#f9f9f9", borderRadius: "8px" },
  statValue: { fontSize: "2rem", fontWeight: "bold", color: "var(--soil-green)" },
  statLabel: { fontSize: "0.85rem", color: "#666", marginTop: "0.25rem" },
  cropList: { marginTop: "1rem" },
  cropItem: { display: "flex", justifyContent: "space-between", padding: "0.75rem", borderBottom: "1px solid #f0f0f0" },
  cropStatus: { color: "#10b981", fontSize: "0.85rem", fontWeight: "500" },
  recommendations: { marginTop: "1rem", paddingLeft: "1.25rem", color: "#666" },
  consultationStatus: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", background: "white", borderRadius: "8px", marginTop: "1rem" },
  statusBadge: { padding: "0.25rem 0.75rem", borderRadius: "12px", color: "white", fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase" },
  currentIssue: { marginTop: "1rem", padding: "0.75rem", background: "white", borderRadius: "8px", fontSize: "0.9rem", color: "#666" },
  whatsappButton: { display: "block", marginTop: "1rem", padding: "0.75rem", background: "#25D366", color: "white", textAlign: "center", borderRadius: "8px", textDecoration: "none", fontWeight: "600", transition: "all 0.2s" },
  taskList: { marginTop: "1rem" },
  taskItem: { display: "flex", gap: "0.75rem", padding: "0.75rem", borderBottom: "1px solid #f0f0f0", alignItems: "flex-start" },
  taskIcon: { fontSize: "1.5rem" },
  taskText: { fontWeight: "500", fontSize: "0.95rem" },
  taskDate: { fontSize: "0.85rem", color: "#666", marginTop: "0.25rem" },
  activityList: { marginTop: "1rem" },
  activityItem: { display: "flex", gap: "0.75rem", padding: "0.75rem", borderBottom: "1px solid #f0f0f0", alignItems: "center" },
  activityIcon: { fontSize: "1.5rem" },
  activityContent: { flex: 1 },
  activityTitle: { fontSize: "0.95rem", fontWeight: "500" },
  activityType: { fontSize: "0.8rem", color: "#999", marginTop: "0.25rem", textTransform: "capitalize" },
  emptyState: { textAlign: "center", color: "#999", padding: "2rem", fontStyle: "italic" },
  description: { color: "#666", marginBottom: "2rem" },
  resourceGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem", marginTop: "2rem" },
  resourceCard: { background: "white", padding: "1.25rem 1.5rem", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.08)", cursor: "pointer", transition: "all 0.2s", border: "2px solid transparent" },
  resourceCardHeader: { display: "flex", alignItems: "center", gap: "0.75rem" },
  resourceTitle: { flex: 1, margin: 0, fontSize: "1rem", color: "var(--ink-black)" },
  chevron: { color: "var(--soil-green)", fontSize: "0.75rem" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1.5rem" },
  modal: { background: "white", borderRadius: "16px", padding: "2rem", maxWidth: "480px", width: "100%", maxHeight: "80vh", overflowY: "auto", position: "relative", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" },
  modalClose: { position: "absolute", top: "1rem", right: "1rem", background: "#f0f0f0", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "0.9rem", color: "#555", fontWeight: "bold", lineHeight: 1 },
  modalHeader: { display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem", paddingRight: "2rem" },
  modalIcon: { fontSize: "2rem" },
  modalTitle: { margin: 0, fontSize: "1.2rem", color: "var(--soil-green)", fontWeight: "700" },
  modalTips: { paddingLeft: "1.25rem", margin: 0 },
  modalTip: { color: "#444", lineHeight: "1.7", marginBottom: "0.9rem", fontSize: "0.95rem" },
  resourceIcon: { fontSize: "3rem", marginBottom: "1rem" },
};

const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
`;
if (!document.querySelector('style[data-dashboard]')) {
  styleSheet.setAttribute('data-dashboard', '');
  document.head.appendChild(styleSheet);
}