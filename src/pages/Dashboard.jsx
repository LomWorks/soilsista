import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { db, auth } from "../firebase";
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
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
    // Listen to auth state
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchUserData(currentUser.uid);
      } else {
        // Redirect to login if not authenticated
        window.location.href = "/get-started";
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchUserData = async (userId) => {
    setLoading(true);
    
    try {
      // Fetch user data
      const userDoc = await getDoc(doc(db, "users", userId));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData({ id: userId, ...data });
        
        // Fetch user's activities
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
        console.error("User document not found");
        // Redirect to onboarding if profile incomplete
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
      {/* Header */}
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

      {/* Tab Navigation */}
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

      {/* Tab Content */}
      <div style={styles.content}>
        {activeTab === "overview" && (
          <OverviewTab 
            userData={userData} 
            activities={activities}
            user={user}
          />
        )}
        {activeTab === "planner" && <PlannerTab userData={userData} />}
        {activeTab === "weather" && <WeatherTab userData={userData} />}
        {activeTab === "resources" && <ResourcesTab />}
      </div>
    </div>
  );
}

// Overview Tab
function OverviewTab({ userData, activities, user }) {
  // Filter activities by type
  const weatherAlerts = activities.filter(a => a.type === "weather_alert");
  const cropPlans = activities.filter(a => a.type === "crop_plan");
  const reminders = activities.filter(a => a.type === "reminder" && a.status !== "completed");
  
  return (
    <div style={styles.tabContent}>
      <div style={styles.grid}>
        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={styles.card}
        >
          <h3>🌾 Your Farm</h3>
          <div style={styles.statGrid}>
            <div style={styles.stat}>
              <span style={styles.statValue}>{userData.currentCrops?.length || 0}</span>
              <span style={styles.statLabel}>Active Crops</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statValue}>{userData.stats?.cropsHarvested || 0}</span>
              <span style={styles.statLabel}>Harvested</span>
            </div>
          </div>
        </motion.div>

        {/* Current Crops */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={styles.card}
        >
          <h3>🥬 Growing Now</h3>
          {userData.currentCrops && userData.currentCrops.length > 0 ? (
            <div style={styles.cropList}>
              {userData.currentCrops.map((crop, i) => (
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

        {/* Weather Alert */}
        {weatherAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{...styles.card, ...styles.alertCard}}
          >
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

        {/* Paid User: Consultation Status */}
        {userData.planType === "paid" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{...styles.card, ...styles.consultationCard}}
          >
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
            <a 
              href={`https://wa.me/${userData.phone}`} 
              style={styles.whatsappButton}
              target="_blank"
              rel="noopener noreferrer"
            >
              💬 Message on WhatsApp
            </a>
          </motion.div>
        )}

        {/* Upcoming Tasks/Reminders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          style={styles.card}
        >
          <h3>📋 Upcoming Tasks</h3>
          {reminders.length > 0 ? (
            <div style={styles.taskList}>
              {reminders.slice(0, 5).map((reminder) => (
                <TaskItem 
                  key={reminder.id} 
                  reminder={reminder}
                />
              ))}
            </div>
          ) : (
            <p style={styles.emptyState}>No upcoming tasks. Check the planner!</p>
          )}
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          style={styles.card}
        >
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

// Planner Tab
function PlannerTab({ userData }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={styles.tabContent}
    >
      <h2>🗓️ Crop Planning Tool</h2>
      <p style={styles.description}>
        Plan your planting schedule based on crop cycles and climate data
      </p>
      <CropPlanner userData={userData} />
    </motion.div>
  );
}

// Weather Tab
function WeatherTab({ userData }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={styles.tabContent}
    >
      <h2>🌤️ Climate & Weather Data</h2>
      <p style={styles.description}>
        Real-time weather and climate insights for {userData.location?.island || "your location"}
      </p>
      <WeatherWidget location={userData.location} />
    </motion.div>
  );
}

// Resources Tab
function ResourcesTab() {
  const resources = [
    {
      title: "Natural Pest Control Guide",
      description: "Chemical-free methods to protect your crops",
      icon: "🐛"
    },
    {
      title: "Crop Rotation Strategies",
      description: "Maximize soil health with proper rotation",
      icon: "🔄"
    },
    {
      title: "Water Management Tips",
      description: "Efficient irrigation for Caribbean climates",
      icon: "💧"
    },
    {
      title: "Composting 101",
      description: "Turn waste into nutrient-rich soil",
      icon: "♻️"
    },
    {
      title: "Disease Identification",
      description: "Common plant diseases and treatments",
      icon: "🔬"
    },
    {
      title: "Harvest Timing Guide",
      description: "Know when your crops are ready",
      icon: "⏰"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={styles.tabContent}
    >
      <h2>📚 Farming Resources</h2>
      <p style={styles.description}>
        Educational materials to help you grow better
      </p>
      
      <div style={styles.resourceGrid}>
        {resources.map((resource, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 + (i * 0.05) }}
            whileHover={{ scale: 1.02 }}
            style={styles.resourceCard}
          >
            <div style={styles.resourceIcon}>{resource.icon}</div>
            <h4>{resource.title}</h4>
            <p style={styles.resourceDesc}>{resource.description}</p>
            <button style={styles.resourceButton}>Learn More →</button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// Styles
const styles = {
  dashboard: {
    minHeight: "100vh",
    background: "var(--paper-cream)",
    padding: "2rem"
  },
  loading: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.2rem",
    color: "#666"
  },
  spinner: {
    width: "50px",
    height: "50px",
    border: "5px solid #f3f3f3",
    borderTop: "5px solid var(--soil-green)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "1rem"
  },
  header: {
    marginBottom: "2rem",
    textAlign: "center"
  },
  subtitle: {
    color: "#666",
    fontSize: "1rem",
    marginTop: "0.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    flexWrap: "wrap"
  },
  premiumBadge: {
    background: "var(--soil-green)",
    color: "white",
    padding: "0.25rem 0.75rem",
    borderRadius: "12px",
    fontSize: "0.85rem",
    fontWeight: "600"
  },
  tabs: {
    display: "flex",
    gap: "1rem",
    marginBottom: "2rem",
    borderBottom: "2px solid #e0e0e0",
    justifyContent: "center",
    flexWrap: "wrap"
  },
  tab: {
    padding: "0.75rem 1.5rem",
    background: "none",
    border: "none",
    borderBottom: "3px solid transparent",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "500",
    color: "#666",
    transition: "all 0.2s"
  },
  tabActive: {
    color: "var(--soil-green)",
    borderBottom: "3px solid var(--soil-green)"
  },
  content: {
    maxWidth: "1200px",
    margin: "0 auto"
  },
  tabContent: {
    animation: "fadeIn 0.3s ease"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "1.5rem"
  },
  card: {
    background: "white",
    padding: "1.5rem",
    borderRadius: "12px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
  },
  alertCard: {
    background: "#FFF4E6",
    border: "2px solid var(--sun-mustard)"
  },
  consultationCard: {
    background: "#F0F9F4",
    border: "2px solid var(--soil-green)"
  },
  alertMessage: {
    marginTop: "0.5rem",
    color: "#666"
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
    marginTop: "1rem"
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "1rem",
    background: "#f9f9f9",
    borderRadius: "8px"
  },
  statValue: {
    fontSize: "2rem",
    fontWeight: "bold",
    color: "var(--soil-green)"
  },
  statLabel: {
    fontSize: "0.85rem",
    color: "#666",
    marginTop: "0.25rem"
  },
  cropList: {
    marginTop: "1rem"
  },
  cropItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "0.75rem",
    borderBottom: "1px solid #f0f0f0"
  },
  cropStatus: {
    color: "#10b981",
    fontSize: "0.85rem",
    fontWeight: "500"
  },
  recommendations: {
    marginTop: "1rem",
    paddingLeft: "1.25rem",
    color: "#666"
  },
  consultationStatus: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.75rem",
    background: "white",
    borderRadius: "8px",
    marginTop: "1rem"
  },
  statusBadge: {
    padding: "0.25rem 0.75rem",
    borderRadius: "12px",
    color: "white",
    fontSize: "0.85rem",
    fontWeight: "600",
    textTransform: "uppercase"
  },
  currentIssue: {
    marginTop: "1rem",
    padding: "0.75rem",
    background: "white",
    borderRadius: "8px",
    fontSize: "0.9rem",
    color: "#666"
  },
  whatsappButton: {
    display: "block",
    marginTop: "1rem",
    padding: "0.75rem",
    background: "#25D366",
    color: "white",
    textAlign: "center",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: "600",
    transition: "all 0.2s"
  },
  taskList: {
    marginTop: "1rem"
  },
  taskItem: {
    display: "flex",
    gap: "0.75rem",
    padding: "0.75rem",
    borderBottom: "1px solid #f0f0f0",
    alignItems: "flex-start"
  },
  taskIcon: {
    fontSize: "1.5rem"
  },
  taskText: {
    fontWeight: "500",
    fontSize: "0.95rem"
  },
  taskDate: {
    fontSize: "0.85rem",
    color: "#666",
    marginTop: "0.25rem"
  },
  activityList: {
    marginTop: "1rem"
  },
  activityItem: {
    display: "flex",
    gap: "0.75rem",
    padding: "0.75rem",
    borderBottom: "1px solid #f0f0f0",
    alignItems: "center"
  },
  activityIcon: {
    fontSize: "1.5rem"
  },
  activityContent: {
    flex: 1
  },
  activityTitle: {
    fontSize: "0.95rem",
    fontWeight: "500"
  },
  activityType: {
    fontSize: "0.8rem",
    color: "#999",
    marginTop: "0.25rem",
    textTransform: "capitalize"
  },
  emptyState: {
    textAlign: "center",
    color: "#999",
    padding: "2rem",
    fontStyle: "italic"
  },
  description: {
    color: "#666",
    marginBottom: "2rem"
  },
  resourceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "1.5rem",
    marginTop: "2rem"
  },
  resourceCard: {
    background: "white",
    padding: "1.5rem",
    borderRadius: "12px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  resourceIcon: {
    fontSize: "3rem",
    marginBottom: "1rem"
  },
  resourceDesc: {
    color: "#666",
    fontSize: "0.9rem",
    marginTop: "0.5rem"
  },
  resourceButton: {
    marginTop: "1rem",
    padding: "0.5rem 1rem",
    background: "var(--soil-green)",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: "600"
  }
};

// Add spinner animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;
if (!document.querySelector('style[data-dashboard]')) {
  styleSheet.setAttribute('data-dashboard', '');
  document.head.appendChild(styleSheet);
}