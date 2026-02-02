import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where, limit } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingConsultations: 0,
    unreadNotifications: 0,
    todayAlerts: 0
  });

  // Password protection
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");

  const ADMIN_PASSWORD = "soilsista2025";

  useEffect(() => {
    const savedAuth = localStorage.getItem("adminAuth");
    if (savedAuth === "true") {
      setAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchAllData();
    }
  }, [authenticated]);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      localStorage.setItem("adminAuth", "true");
    } else {
      alert("Incorrect password!");
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch All Users
      const usersSnapshot = await getDocs(
        query(collection(db, "users"), orderBy("createdAt", "desc"))
      );
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate().toLocaleDateString(),
        lastActive: doc.data().stats?.lastActive?.toDate().toLocaleDateString()
      }));
      setUsers(usersData);

      // Fetch Admin Notifications
      const adminNotifSnapshot = await getDocs(
        query(
          collection(db, "activities"),
          where("type", "==", "admin_notification"),
          orderBy("createdAt", "desc"),
          limit(100)
        )
      );
      const adminNotifData = adminNotifSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate().toLocaleString()
      }));
      setAdminNotifications(adminNotifData);

      // Fetch All Activities
      const activitiesSnapshot = await getDocs(
        query(
          collection(db, "activities"),
          orderBy("createdAt", "desc"),
          limit(200)
        )
      );
      const activitiesData = activitiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate().toLocaleString()
      }));
      setActivities(activitiesData);

      // Calculate stats
      const activeUsersCount = usersData.filter(u => u.accountStatus === "active").length;
      const pendingConsultations = usersData.filter(
        u => u.planType === "paid" && u.consultationStatus === "pending"
      ).length;
      const unreadNotifications = adminNotifData.filter(n => n.status === "unread").length;
      
      const today = new Date().toDateString();
      const todayAlerts = activitiesData.filter(a => {
        const activityDate = a.createdAt ? new Date(a.createdAt).toDateString() : null;
        return a.type === "weather_alert" && activityDate === today;
      }).length;

      setStats({
        totalUsers: usersData.length,
        activeUsers: activeUsersCount,
        pendingConsultations,
        unreadNotifications,
        todayAlerts
      });

    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Error loading data. Check console.");
    }
    setLoading(false);
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, "activities", notificationId), {
        status: "read"
      });
      fetchAllData();
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const updateUserConsultationStatus = async (userId, newStatus) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        consultationStatus: newStatus,
        updatedAt: new Date()
      });
      alert("Status updated!");
      fetchAllData();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    
    try {
      await deleteDoc(doc(db, "users", userId));
      alert("User deleted!");
      fetchAllData();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user");
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await deleteDoc(doc(db, "activities", notificationId));
      fetchAllData();
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const exportToCSV = (data, filename) => {
    if (data.length === 0) {
      alert("No data to export");
      return;
    }
    
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(item => 
      Object.values(item).map(val => {
        if (typeof val === 'object' && val !== null) {
          return JSON.stringify(val).replace(/,/g, ';');
        }
        return val;
      }).join(",")
    );
    const csv = [headers, ...rows].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Login Screen
  if (!authenticated) {
    return (
      <div style={styles.loginContainer}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={styles.loginBox}
        >
          <h1>🔒 Admin Panel</h1>
          <p style={styles.loginSubtitle}>Soil Sista Administration</p>
          
          <input
            type="password"
            placeholder="Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            style={styles.passwordInput}
            autoFocus
          />
          
          <button onClick={handleLogin} style={styles.loginButton}>
            Login
          </button>
        </motion.div>
      </div>
    );
  }

  // Loading State
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading admin data...</p>
      </div>
    );
  }

  return (
    <div style={styles.adminPanel}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={styles.header}
      >
        <div>
          <h1>🌱 Soil Sista Admin</h1>
          <p style={styles.headerSubtitle}>
            Manage users, consultations, and system activities
          </p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={fetchAllData} style={styles.refreshButton}>
            🔄 Refresh
          </button>
          <button 
            onClick={() => {
              setAuthenticated(false);
              localStorage.removeItem("adminAuth");
            }}
            style={styles.logoutButton}
          >
            Logout
          </button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <StatCard 
          icon="👥" 
          label="Total Users" 
          value={stats.totalUsers}
          subtitle={`${stats.activeUsers} active`}
          color="#7FB34D"
          delay={0.1}
        />
        <StatCard 
          icon="💬" 
          label="Pending Consultations" 
          value={stats.pendingConsultations}
          subtitle="Need attention"
          color="#E6A93C"
          delay={0.2}
          highlight={stats.pendingConsultations > 0}
        />
        <StatCard 
          icon="🔔" 
          label="Unread Notifications" 
          value={stats.unreadNotifications}
          subtitle="New messages"
          color="#EFA8B8"
          delay={0.3}
          highlight={stats.unreadNotifications > 0}
        />
        <StatCard 
          icon="🌦️" 
          label="Today's Alerts" 
          value={stats.todayAlerts}
          subtitle="Weather alerts sent"
          color="#5A9F6E"
          delay={0.4}
        />
      </div>

      {/* Tab Navigation */}
      <div style={styles.tabs}>
        {[
          { key: "overview", label: "Overview", badge: null },
          { key: "notifications", label: "Notifications", badge: stats.unreadNotifications },
          { key: "users", label: "All Users", badge: null },
          { key: "consultations", label: "Consultations", badge: stats.pendingConsultations },
          { key: "activities", label: "Activities", badge: null }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              ...styles.tab,
              ...(activeTab === tab.key ? styles.tabActive : {})
            }}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span style={styles.tabBadge}>{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={styles.content}>
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <OverviewTab 
              users={users}
              notifications={adminNotifications}
              activities={activities}
              stats={stats}
            />
          )}
          
          {activeTab === "notifications" && (
            <NotificationsTab 
              notifications={adminNotifications}
              onMarkAsRead={markNotificationAsRead}
              onDelete={deleteNotification}
            />
          )}
          
          {activeTab === "users" && (
            <UsersTab 
              users={users}
              onDelete={deleteUser}
              onExport={() => exportToCSV(users, "all_users")}
            />
          )}
          
          {activeTab === "consultations" && (
            <ConsultationsTab 
              users={users.filter(u => u.planType === "paid")}
              onStatusUpdate={updateUserConsultationStatus}
              onDelete={deleteUser}
              onExport={() => exportToCSV(users.filter(u => u.planType === "paid"), "consultations")}
            />
          )}
          
          {activeTab === "activities" && (
            <ActivitiesTab 
              activities={activities}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Stats Card Component
function StatCard({ icon, label, value, subtitle, color, delay, highlight }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      style={{
        ...styles.statCard,
        borderLeft: `4px solid ${color}`,
        ...(highlight ? { boxShadow: `0 4px 12px ${color}40` } : {})
      }}
    >
      <div style={styles.statIcon}>{icon}</div>
      <div>
        <div style={styles.statValue}>{value}</div>
        <div style={styles.statLabel}>{label}</div>
        {subtitle && <div style={styles.statSubtitle}>{subtitle}</div>}
      </div>
    </motion.div>
  );
}

// Overview Tab
function OverviewTab({ users, notifications, activities, stats }) {
  const recentUsers = users.slice(0, 5);
  const urgentNotifications = notifications.filter(n => 
    n.status === "unread" && n.priority === "high"
  ).slice(0, 3);
  const recentActivities = activities.slice(0, 8);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2>Dashboard Overview</h2>
      
      {/* Urgent Section */}
      {urgentNotifications.length > 0 && (
        <div style={styles.urgentSection}>
          <h3 style={styles.urgentTitle}>🔥 Urgent - Needs Attention</h3>
          {urgentNotifications.map(notif => (
            <div key={notif.id} style={styles.urgentItem}>
              <div>
                <strong>{notif.title}</strong>
                <p style={styles.urgentMessage}>{notif.message}</p>
              </div>
              <button
                onClick={() => window.location.hash = "#notifications"}
                style={styles.urgentButton}
              >
                View
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={styles.overviewGrid}>
        {/* Recent Users */}
        <div style={styles.overviewSection}>
          <h3>Recent Users</h3>
          {recentUsers.length === 0 ? (
            <p style={styles.emptyState}>No users yet</p>
          ) : (
            recentUsers.map(user => (
              <div key={user.id} style={styles.overviewItem}>
                <div>
                  <strong>{user.name || "No name"}</strong>
                  <div style={styles.overviewMeta}>
                    {user.planType === "paid" ? "💬 Paid" : "🌱 Free"} • {user.location?.island || "Unknown"}
                  </div>
                </div>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: user.accountStatus === "active" ? "#7FB34D" : "#999"
                }}>
                  {user.accountStatus || "pending"}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Recent Activity Feed */}
        <div style={styles.overviewSection}>
          <h3>Recent Activity</h3>
          {recentActivities.length === 0 ? (
            <p style={styles.emptyState}>No activities yet</p>
          ) : (
            recentActivities.map(activity => (
              <div key={activity.id} style={styles.activityItem}>
                <span style={styles.activityIcon}>
                  {activity.icon || getActivityIcon(activity.type)}
                </span>
                <div style={styles.activityContent}>
                  <strong>{activity.title}</strong>
                  <div style={styles.activityMeta}>
                    {activity.type} • {activity.createdAt}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Notifications Tab
function NotificationsTab({ notifications, onMarkAsRead, onDelete }) {
  const [filter, setFilter] = useState("all");

  const filteredNotifications = notifications.filter(notif => {
    if (filter === "unread") return notif.status === "unread";
    if (filter === "contact") return notif.data?.contactType === "contact_form";
    if (filter === "consultation") return notif.data?.consultationType === "paid";
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div style={styles.tableHeader}>
        <h2>Admin Notifications ({notifications.length})</h2>
        <div style={styles.filterButtons}>
          <button
            onClick={() => setFilter("all")}
            style={{...styles.filterButton, ...(filter === "all" ? styles.filterActive : {})}}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            style={{...styles.filterButton, ...(filter === "unread" ? styles.filterActive : {})}}
          >
            Unread
          </button>
          <button
            onClick={() => setFilter("contact")}
            style={{...styles.filterButton, ...(filter === "contact" ? styles.filterActive : {})}}
          >
            Contact Forms
          </button>
          <button
            onClick={() => setFilter("consultation")}
            style={{...styles.filterButton, ...(filter === "consultation" ? styles.filterActive : {})}}
          >
            Consultations
          </button>
        </div>
      </div>

      <div style={styles.notificationsContainer}>
        {filteredNotifications.length === 0 ? (
          <p style={styles.emptyState}>No notifications</p>
        ) : (
          filteredNotifications.map((notif, index) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              style={{
                ...styles.notificationCard,
                ...(notif.status === "unread" ? styles.notificationUnread : {}),
                ...(notif.priority === "high" ? styles.notificationHigh : {})
              }}
            >
              <div style={styles.notificationHeader}>
                <div style={styles.notificationTitle}>
                  <span style={styles.notificationIcon}>{notif.icon}</span>
                  <strong>{notif.title}</strong>
                  {notif.priority === "high" && (
                    <span style={styles.priorityBadge}>HIGH PRIORITY</span>
                  )}
                  {notif.status === "unread" && (
                    <span style={styles.unreadDot}></span>
                  )}
                </div>
                <div style={styles.notificationActions}>
                  {notif.status === "unread" && (
                    <button
                      onClick={() => onMarkAsRead(notif.id)}
                      style={styles.markReadButton}
                    >
                      Mark Read
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(notif.id)}
                    style={styles.deleteIconButton}
                  >
                    ×
                  </button>
                </div>
              </div>

              <p style={styles.notificationMessage}>{notif.message}</p>

              {notif.data && (
                <div style={styles.notificationDetails}>
                  {notif.data.userName && (
                    <div><strong>Name:</strong> {notif.data.userName}</div>
                  )}
                  {notif.data.userPhone && (
                    <div>
                      <strong>Phone:</strong>{" "}
                      <a href={`https://wa.me/${notif.data.userPhone}`} style={styles.phoneLink}>
                        {notif.data.userPhone}
                      </a>
                    </div>
                  )}
                  {notif.data.userLocation && (
                    <div>
                      <strong>Location:</strong> {notif.data.userLocation.island}, {notif.data.userLocation.settlement}
                    </div>
                  )}
                  {notif.data.issue && (
                    <div><strong>Issue:</strong> {notif.data.issue}</div>
                  )}
                </div>
              )}

              <div style={styles.notificationFooter}>
                <span style={styles.notificationDate}>{notif.createdAt}</span>
                {notif.actionUrl && (
                  <a href={notif.actionUrl} style={styles.actionLink}>
                    {notif.actionLabel || "View"}
                  </a>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

// Users Tab
function UsersTab({ users, onDelete, onExport }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.location?.island?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filterType === "free") return user.planType === "free";
    if (filterType === "paid") return user.planType === "paid";
    if (filterType === "active") return user.accountStatus === "active";
    
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div style={styles.tableHeader}>
        <h2>All Users ({users.length})</h2>
        <div style={styles.tableActions}>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Users</option>
            <option value="free">Free Users</option>
            <option value="paid">Paid Users</option>
            <option value="active">Active Only</option>
          </select>
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <button onClick={onExport} style={styles.exportButton}>
            📥 Export CSV
          </button>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Plan</th>
              <th>Location</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Last Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td><strong>{user.name || "No name"}</strong></td>
                <td>{user.email || "N/A"}</td>
                <td>
                  <span style={{
                    ...styles.planBadge,
                    backgroundColor: user.planType === "paid" ? "#5A9F6E" : "#7FB34D"
                  }}>
                    {user.planType || "unknown"}
                  </span>
                </td>
                <td>{user.location?.island || "Unknown"}</td>
                <td>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: user.accountStatus === "active" ? "#7FB34D" : "#999"
                  }}>
                    {user.accountStatus || "pending"}
                  </span>
                </td>
                <td>{user.createdAt}</td>
                <td>{user.lastActive || "Never"}</td>
                <td>
                  <button
                    onClick={() => onDelete(user.id)}
                    style={styles.deleteButton}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// Consultations Tab
function ConsultationsTab({ users, onStatusUpdate, onDelete, onExport }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone?.includes(searchTerm)
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div style={styles.tableHeader}>
        <h2>Paid Consultations ({users.length})</h2>
        <div style={styles.tableActions}>
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <button onClick={onExport} style={styles.exportButton}>
            📥 Export CSV
          </button>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>WhatsApp</th>
              <th>Location</th>
              <th>Current Issue</th>
              <th>Status</th>
              <th>Requested</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td><strong>{user.name}</strong></td>
                <td>
                  <a href={`https://wa.me/${user.phone}`} style={styles.phoneLink} target="_blank" rel="noopener noreferrer">
                    {user.phone}
                  </a>
                </td>
                <td>{user.location?.island}, {user.location?.settlement}</td>
                <td style={styles.issueCell}>{user.currentIssue || "N/A"}</td>
                <td>
                  <select
                    value={user.consultationStatus || "pending"}
                    onChange={(e) => onStatusUpdate(user.id, e.target.value)}
                    style={{
                      ...styles.statusSelect,
                      color: user.consultationStatus === "pending" ? "#E6A93C" : "#7FB34D"
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="contacted">Contacted</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </td>
                <td>{user.createdAt}</td>
                <td>
                  <button
                    onClick={() => onDelete(user.id)}
                    style={styles.deleteButton}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// Activities Tab
function ActivitiesTab({ activities }) {
  const [filterType, setFilterType] = useState("all");

  const filteredActivities = activities.filter(activity => {
    if (filterType === "all") return true;
    return activity.type === filterType;
  });

  const activityTypes = [...new Set(activities.map(a => a.type))];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div style={styles.tableHeader}>
        <h2>System Activities ({activities.length})</h2>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">All Activities</option>
          {activityTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div style={styles.activitiesList}>
        {filteredActivities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.02 }}
            style={styles.activityCard}
          >
            <div style={styles.activityCardHeader}>
              <span style={styles.activityCardIcon}>{activity.icon || "📌"}</span>
              <div style={styles.activityCardContent}>
                <strong>{activity.title}</strong>
                <p style={styles.activityCardMessage}>{activity.message}</p>
                <div style={styles.activityCardMeta}>
                  <span style={styles.activityTypeBadge}>{activity.type}</span>
                  <span>{activity.createdAt}</span>
                  {activity.userId && <span>User ID: {activity.userId.substring(0, 8)}...</span>}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// Helper function
function getActivityIcon(type) {
  const icons = {
    weather_alert: "🌦️",
    crop_plan: "🌱",
    reminder: "⏰",
    notification: "🔔",
    admin_notification: "📧",
    contact_message: "✉️",
    consultation: "💬"
  };
  return icons[type] || "📌";
}

// Styles
const styles = {
  loginContainer: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #F7F3EA 0%, #E8F5E9 100%)"
  },
  loginBox: {
    background: "white",
    padding: "3rem",
    borderRadius: "16px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    width: "100%",
    maxWidth: "400px",
    textAlign: "center"
  },
  loginSubtitle: {
    color: "#666",
    marginBottom: "2rem",
    fontSize: "0.9rem"
  },
  passwordInput: {
    width: "100%",
    padding: "1rem",
    fontSize: "1rem",
    border: "2px solid #ddd",
    borderRadius: "8px",
    marginBottom: "1rem",
    boxSizing: "border-box"
  },
  loginButton: {
    width: "100%",
    padding: "1rem",
    background: "var(--soil-green)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer"
  },
  adminPanel: {
    minHeight: "100vh",
    background: "var(--paper-cream)",
    padding: "2rem"
  },
  loadingContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--paper-cream)"
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
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2rem",
    flexWrap: "wrap",
    gap: "1rem"
  },
  headerSubtitle: {
    color: "#666",
    marginTop: "0.5rem",
    fontSize: "0.95rem"
  },
  headerActions: {
    display: "flex",
    gap: "1rem"
  },
  refreshButton: {
    padding: "0.75rem 1.5rem",
    background: "var(--soil-green)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600"
  },
  logoutButton: {
    padding: "0.75rem 1.5rem",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "1.5rem",
    marginBottom: "2rem"
  },
  statCard: {
    background: "white",
    padding: "1.5rem",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    display: "flex",
    alignItems: "center",
    gap: "1rem"
  },
  statIcon: {
    fontSize: "2.5rem"
  },
  statValue: {
    fontSize: "2rem",
    fontWeight: "bold",
    color: "var(--ink-black)"
  },
  statLabel: {
    color: "#666",
    fontSize: "0.9rem",
    marginTop: "0.25rem"
  },
  statSubtitle: {
    color: "#999",
    fontSize: "0.75rem",
    marginTop: "0.25rem"
  },
  tabs: {
    display: "flex",
    gap: "0.5rem",
    marginBottom: "2rem",
    borderBottom: "2px solid #e0e0e0",
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
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem"
  },
  tabActive: {
    color: "var(--soil-green)",
    borderBottom: "3px solid var(--soil-green)"
  },
  tabBadge: {
    background: "#ef4444",
    color: "white",
    padding: "0.2rem 0.5rem",
    borderRadius: "10px",
    fontSize: "0.75rem",
    fontWeight: "bold"
  },
  content: {
    background: "white",
    padding: "2rem",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    minHeight: "400px"
  },
  urgentSection: {
    background: "#FFF3CD",
    border: "2px solid #FFC107",
    borderRadius: "12px",
    padding: "1.5rem",
    marginBottom: "2rem"
  },
  urgentTitle: {
    color: "#856404",
    marginBottom: "1rem"
  },
  urgentItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem",
    background: "white",
    borderRadius: "8px",
    marginBottom: "0.5rem"
  },
  urgentMessage: {
    color: "#666",
    fontSize: "0.9rem",
    marginTop: "0.5rem"
  },
  urgentButton: {
    padding: "0.5rem 1rem",
    background: "#E6A93C",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600"
  },
  overviewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
    gap: "2rem",
    marginTop: "1.5rem"
  },
  overviewSection: {
    background: "#f9f9f9",
    padding: "1.5rem",
    borderRadius: "8px"
  },
  overviewItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "1rem",
    borderBottom: "1px solid #e0e0e0",
    alignItems: "center"
  },
  overviewMeta: {
    color: "#666",
    fontSize: "0.85rem",
    marginTop: "0.25rem"
  },
  activityItem: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "0.75rem",
    borderBottom: "1px solid #e0e0e0"
  },
  activityIcon: {
    fontSize: "1.5rem"
  },
  activityContent: {
    flex: 1
  },
  activityMeta: {
    color: "#999",
    fontSize: "0.8rem",
    marginTop: "0.25rem"
  },
  statusBadge: {
    padding: "0.25rem 0.75rem",
    borderRadius: "12px",
    color: "white",
    fontSize: "0.75rem",
    fontWeight: "600",
    textTransform: "uppercase"
  },
  planBadge: {
    padding: "0.25rem 0.75rem",
    borderRadius: "12px",
    color: "white",
    fontSize: "0.75rem",
    fontWeight: "600",
    textTransform: "uppercase"
  },
  emptyState: {
    textAlign: "center",
    color: "#999",
    padding: "3rem",
    fontStyle: "italic"
  },
  notificationsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    marginTop: "1.5rem"
  },
  notificationCard: {
    background: "#f9f9f9",
    padding: "1.5rem",
    borderRadius: "12px",
    border: "2px solid #e0e0e0"
  },
  notificationUnread: {
    background: "#FFF9E6",
    border: "2px solid #FFE082"
  },
  notificationHigh: {
    border: "2px solid #ef4444",
    background: "#FFF5F5"
  },
  notificationHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1rem"
  },
  notificationTitle: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    flex: 1
  },
  notificationIcon: {
    fontSize: "1.5rem"
  },
  priorityBadge: {
    background: "#ef4444",
    color: "white",
    padding: "0.2rem 0.6rem",
    borderRadius: "12px",
    fontSize: "0.7rem",
    fontWeight: "bold"
  },
  unreadDot: {
    width: "8px",
    height: "8px",
    background: "#E6A93C",
    borderRadius: "50%",
    display: "inline-block"
  },
  notificationActions: {
    display: "flex",
    gap: "0.5rem"
  },
  markReadButton: {
    padding: "0.5rem 1rem",
    background: "var(--soil-green)",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: "600"
  },
  deleteIconButton: {
    width: "32px",
    height: "32px",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "1.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  notificationMessage: {
    color: "#333",
    lineHeight: "1.6",
    marginBottom: "1rem"
  },
  notificationDetails: {
    background: "white",
    padding: "1rem",
    borderRadius: "8px",
    fontSize: "0.9rem",
    lineHeight: "1.8",
    marginBottom: "1rem"
  },
  notificationFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  notificationDate: {
    color: "#999",
    fontSize: "0.85rem"
  },
  actionLink: {
    color: "var(--soil-green)",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "0.9rem"
  },
  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
    flexWrap: "wrap",
    gap: "1rem"
  },
  tableActions: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap"
  },
  filterButtons: {
    display: "flex",
    gap: "0.5rem"
  },
  filterButton: {
    padding: "0.5rem 1rem",
    background: "#f0f0f0",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.9rem"
  },
  filterActive: {
    background: "var(--soil-green)",
    color: "white"
  },
  filterSelect: {
    padding: "0.75rem",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontSize: "0.9rem",
    cursor: "pointer"
  },
  searchInput: {
    padding: "0.75rem",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontSize: "0.9rem",
    minWidth: "250px"
  },
  exportButton: {
    padding: "0.75rem 1.5rem",
    background: "var(--soil-green)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600"
  },
  tableContainer: {
    overflowX: "auto"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.9rem"
  },
  deleteButton: {
    padding: "0.5rem 1rem",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.85rem"
  },
  phoneLink: {
    color: "var(--soil-green)",
    textDecoration: "none",
    fontWeight: "600"
  },
  issueCell: {
    maxWidth: "200px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  statusSelect: {
    padding: "0.5rem",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "0.85rem",
    cursor: "pointer",
    fontWeight: "600"
  },
  activitiesList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    marginTop: "1.5rem"
  },
  activityCard: {
    background: "#f9f9f9",
    padding: "1rem",
    borderRadius: "8px",
    border: "1px solid #e0e0e0"
  },
  activityCardHeader: {
    display: "flex",
    gap: "1rem"
  },
  activityCardIcon: {
    fontSize: "1.5rem"
  },
  activityCardContent: {
    flex: 1
  },
  activityCardMessage: {
    color: "#666",
    fontSize: "0.9rem",
    marginTop: "0.5rem",
    marginBottom: "0.75rem"
  },
  activityCardMeta: {
    display: "flex",
    gap: "1rem",
    fontSize: "0.8rem",
    color: "#999"
  },
  activityTypeBadge: {
    background: "#e0e0e0",
    padding: "0.2rem 0.6rem",
    borderRadius: "10px",
    fontSize: "0.75rem"
  }
};

// Add styles
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  table th {
    background: var(--soil-green);
    color: white;
    padding: 1rem;
    text-align: left;
    font-weight: 600;
  }
  
  table td {
    padding: 1rem;
    border-bottom: 1px solid #e0e0e0;
  }
  
  table tr:hover {
    background: #f9f9f9;
  }
`;
document.head.appendChild(styleSheet);