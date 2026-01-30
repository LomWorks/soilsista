import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import CropPlanner from "../components/CropPlanner";
import WeatherWidget from "../components/WeatherWidget";

export default function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    // In production, fetch user data from Firestore
    // For now, using mock data
    setUserData({
      name: "Farmer John",
      farmSize: "2 acres",
      location: { island: "Antigua", settlement: "St. John's" },
      crops: ["Kale", "Lettuce", "Tomatoes", "Sweet Peppers"],
      farmingType: "Natural"
    });
  }, []);

  if (!userData) {
    return <div style={styles.loading}>Loading your dashboard...</div>;
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
        <h1>Welcome back, {userData.name}! 🌱</h1>
        <p style={styles.subtitle}>
          {userData.location.island} • {userData.farmSize} • {userData.farmingType} Farming
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
        {activeTab === "overview" && <OverviewTab userData={userData} />}
        {activeTab === "planner" && <PlannerTab userData={userData} />}
        {activeTab === "weather" && <WeatherTab userData={userData} />}
        {activeTab === "resources" && <ResourcesTab />}
      </div>
    </div>
  );
}

// Overview Tab
function OverviewTab({ userData }) {
  return (
    <div style={styles.tabContent}>
      <div style={styles.grid}>
        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={styles.card}
        >
          <h3>🌾 Your Farm</h3>
          <div style={styles.statGrid}>
            <div style={styles.stat}>
              <span style={styles.statValue}>{userData.crops.length}</span>
              <span style={styles.statLabel}>Active Crops</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statValue}>{userData.farmSize}</span>
              <span style={styles.statLabel}>Farm Size</span>
            </div>
          </div>
        </motion.div>

        {/* Current Crops */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={styles.card}
        >
          <h3>🥬 Growing Now</h3>
          <div style={styles.cropList}>
            {userData.crops.map((crop, i) => (
              <div key={i} style={styles.cropItem}>
                <span>{crop}</span>
                <span style={styles.cropStatus}>Healthy</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Weather Alert */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{...styles.card, ...styles.alertCard}}
        >
          <h3>🌦️ Weather Alert</h3>
          <p>Heavy rainfall expected this weekend. Consider:</p>
          <ul style={styles.recommendations}>
            <li>Check drainage systems</li>
            <li>Harvest mature lettuce</li>
            <li>Delay transplanting until next week</li>
          </ul>
        </motion.div>

        {/* Next Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          style={styles.card}
        >
          <h3>📋 This Week's Tasks</h3>
          <div style={styles.taskList}>
            <TaskItem task="Sow Romaine lettuce" date="Today" />
            <TaskItem task="Transplant Kale seedlings" date="Thursday" />
            <TaskItem task="Harvest Asian Greens" date="Friday" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function TaskItem({ task, date }) {
  return (
    <div style={styles.taskItem}>
      <input type="checkbox" style={styles.checkbox} />
      <div>
        <div style={styles.taskText}>{task}</div>
        <div style={styles.taskDate}>{date}</div>
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
        Real-time weather and climate insights for {userData.location.island}
      </p>
      <WeatherWidget location={userData.location} />
      
      <div style={styles.weatherGrid}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={styles.weatherCard}
        >
          <h3>7-Day Forecast</h3>
          <p>Integration with weather API coming soon</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={styles.weatherCard}
        >
          <h3>Seasonal Trends</h3>
          <p>Historical climate data analysis</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={styles.weatherCard}
        >
          <h3>Rainfall Tracker</h3>
          <p>Monthly precipitation patterns</p>
        </motion.div>
      </div>
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.2rem",
    color: "#666"
  },
  header: {
    marginBottom: "2rem",
    textAlign: "center"
  },
  subtitle: {
    color: "#666",
    fontSize: "1rem",
    marginTop: "0.5rem"
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
    paddingLeft: "1.25rem"
  },
  taskList: {
    marginTop: "1rem"
  },
  taskItem: {
    display: "flex",
    gap: "0.75rem",
    padding: "0.75rem",
    borderBottom: "1px solid #f0f0f0"
  },
  checkbox: {
    marginTop: "0.25rem",
    cursor: "pointer"
  },
  taskText: {
    fontWeight: "500"
  },
  taskDate: {
    fontSize: "0.85rem",
    color: "#666",
    marginTop: "0.25rem"
  },
  description: {
    color: "#666",
    marginBottom: "2rem"
  },
  weatherGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "1.5rem",
    marginTop: "2rem"
  },
  weatherCard: {
    background: "white",
    padding: "1.5rem",
    borderRadius: "12px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
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
    fontSize: "0.9rem"
  }
};