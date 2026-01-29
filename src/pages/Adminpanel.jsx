import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("overview");
  const [freeUsers, setFreeUsers] = useState([]);
  const [paidUsers, setPaidUsers] = useState([]);
  const [contactMessages, setContactMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalFreeUsers: 0,
    totalPaidUsers: 0,
    pendingConsultations: 0,
    totalMessages: 0
  });

  // Password protection - simple version
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");

  const ADMIN_PASSWORD = "soilsista2025"; // Change this in production!

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
      // Fetch Free Users
      const freeSnapshot = await getDocs(
        query(collection(db, "freeUserProfiles"), orderBy("createdAt", "desc"))
      );
      const freeData = freeSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate().toLocaleDateString()
      }));
      setFreeUsers(freeData);

      // Fetch Paid Users
      const paidSnapshot = await getDocs(
        query(collection(db, "paidUserProfiles"), orderBy("createdAt", "desc"))
      );
      const paidData = paidSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        status: doc.data().status || "pending",
        createdAt: doc.data().createdAt?.toDate().toLocaleDateString()
      }));
      setPaidUsers(paidData);

      // Fetch Contact Messages
      const contactSnapshot = await getDocs(
        query(collection(db, "contactMessages"))
      );
      const contactData = contactSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setContactMessages(contactData);

      // Calculate stats
      setStats({
        totalFreeUsers: freeData.length,
        totalPaidUsers: paidData.length,
        pendingConsultations: paidData.filter(u => u.status === "pending").length,
        totalMessages: contactData.length
      });

    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Error loading data. Check console.");
    }
    setLoading(false);
  };

  const updateUserStatus = async (userId, newStatus, isPaid = true) => {
    try {
      const collectionName = isPaid ? "paidUserProfiles" : "freeUserProfiles";
      await updateDoc(doc(db, collectionName, userId), {
        status: newStatus,
        updatedAt: new Date()
      });
      alert("Status updated!");
      fetchAllData();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    }
  };

  const deleteUser = async (userId, isPaid = true) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    
    try {
      const collectionName = isPaid ? "paidUserProfiles" : "freeUserProfiles";
      await deleteDoc(doc(db, collectionName, userId));
      alert("User deleted!");
      fetchAllData();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user");
    }
  };

  const deleteMessage = async (messageId) => {
    if (!window.confirm("Delete this message?")) return;
    
    try {
      await deleteDoc(doc(db, "contactMessages", messageId));
      alert("Message deleted!");
      fetchAllData();
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("Failed to delete message");
    }
  };

  const exportToCSV = (data, filename) => {
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(item => 
      Object.values(item).map(val => 
        typeof val === 'object' ? JSON.stringify(val) : val
      ).join(",")
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
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={styles.loginBox}
        >
          <h1>🔒 Admin Panel</h1>
          <p style={styles.loginSubtitle}>Enter admin password to continue</p>
          
          <input
            type="password"
            placeholder="Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            style={styles.passwordInput}
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
      <div style={styles.header}>
        <div>
          <h1>🌱 Soil Sista Admin Panel</h1>
          <p style={styles.headerSubtitle}>Manage users, consultations, and data</p>
        </div>
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

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <StatCard 
          icon="👥" 
          label="Free Users" 
          value={stats.totalFreeUsers}
          color="#7FB34D"
        />
        <StatCard 
          icon="💬" 
          label="Paid Users" 
          value={stats.totalPaidUsers}
          color="#5A9F6E"
        />
        <StatCard 
          icon="⏳" 
          label="Pending Consultations" 
          value={stats.pendingConsultations}
          color="#E6A93C"
        />
        <StatCard 
          icon="✉️" 
          label="Contact Messages" 
          value={stats.totalMessages}
          color="#EFA8B8"
        />
      </div>

      {/* Tab Navigation */}
      <div style={styles.tabs}>
        {["overview", "free-users", "paid-users", "messages"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.tabActive : {})
            }}
          >
            {tab.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={styles.content}>
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <OverviewTab 
              freeUsers={freeUsers}
              paidUsers={paidUsers}
              stats={stats}
            />
          )}
          
          {activeTab === "free-users" && (
            <FreeUsersTab 
              users={freeUsers}
              onDelete={deleteUser}
              onExport={() => exportToCSV(freeUsers, "free_users")}
            />
          )}
          
          {activeTab === "paid-users" && (
            <PaidUsersTab 
              users={paidUsers}
              onStatusUpdate={updateUserStatus}
              onDelete={deleteUser}
              onExport={() => exportToCSV(paidUsers, "paid_users")}
            />
          )}
          
          {activeTab === "messages" && (
            <MessagesTab 
              messages={contactMessages}
              onDelete={deleteMessage}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Stats Card Component
function StatCard({ icon, label, value, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{...styles.statCard, borderLeft: `4px solid ${color}`}}
    >
      <div style={styles.statIcon}>{icon}</div>
      <div>
        <div style={styles.statValue}>{value}</div>
        <div style={styles.statLabel}>{label}</div>
      </div>
    </motion.div>
  );
}

// Overview Tab
function OverviewTab({ freeUsers, paidUsers, stats }) {
  const recentFree = freeUsers.slice(0, 5);
  const recentPaid = paidUsers.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <h2>Recent Activity</h2>
      
      <div style={styles.overviewGrid}>
        <div style={styles.overviewSection}>
          <h3>Recent Free Users</h3>
          {recentFree.length === 0 ? (
            <p style={styles.emptyState}>No users yet</p>
          ) : (
            recentFree.map(user => (
              <div key={user.id} style={styles.overviewItem}>
                <strong>{user.name}</strong>
                <span style={styles.overviewDate}>{user.createdAt}</span>
              </div>
            ))
          )}
        </div>

        <div style={styles.overviewSection}>
          <h3>Recent Paid Users (Need Consultation)</h3>
          {recentPaid.length === 0 ? (
            <p style={styles.emptyState}>No users yet</p>
          ) : (
            recentPaid.map(user => (
              <div key={user.id} style={styles.overviewItem}>
                <div>
                  <strong>{user.name}</strong>
                  <div style={styles.phoneNumber}>📱 {user.phone}</div>
                </div>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: user.status === "pending" ? "#E6A93C" : 
                                  user.status === "contacted" ? "#7FB34D" : "#666"
                }}>
                  {user.status || "pending"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Free Users Tab
function FreeUsersTab({ users, onDelete, onExport }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.location?.island?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div style={styles.tableHeader}>
        <h2>Free Users ({users.length})</h2>
        <div style={styles.tableActions}>
          <input
            type="text"
            placeholder="Search by name or location..."
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
              <th>Location</th>
              <th>Farm Size</th>
              <th>Crops</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td><strong>{user.name}</strong></td>
                <td>{user.location?.island}, {user.location?.settlement}</td>
                <td>{user.farmSize}</td>
                <td>{user.crops?.length || 0} crops</td>
                <td>{user.createdAt}</td>
                <td>
                  <button
                    onClick={() => setSelectedUser(user)}
                    style={styles.viewButton}
                  >
                    View
                  </button>
                  <button
                    onClick={() => onDelete(user.id, false)}
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

      {/* User Detail Modal */}
      {selectedUser && (
        <UserDetailModal 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)}
        />
      )}
    </motion.div>
  );
}

// Paid Users Tab
function PaidUsersTab({ users, onStatusUpdate, onDelete, onExport }) {
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
    >
      <div style={styles.tableHeader}>
        <h2>Paid Users - WhatsApp Consultations ({users.length})</h2>
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
              <th>Phone</th>
              <th>Location</th>
              <th>Current Issue</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td><strong>{user.name}</strong></td>
                <td>
                  <a href={`https://wa.me/${user.phone}`} style={styles.phoneLink}>
                    {user.phone}
                  </a>
                </td>
                <td>{user.island}, {user.settlement}</td>
                <td style={styles.issueCell}>{user.currentIssue || "N/A"}</td>
                <td>
                  <select
                    value={user.status || "pending"}
                    onChange={(e) => onStatusUpdate(user.id, e.target.value)}
                    style={styles.statusSelect}
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
                    onClick={() => onDelete(user.id, true)}
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

// Messages Tab
function MessagesTab({ messages, onDelete }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <h2>Contact Messages ({messages.length})</h2>

      <div style={styles.messagesGrid}>
        {messages.length === 0 ? (
          <p style={styles.emptyState}>No messages yet</p>
        ) : (
          messages.map(message => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={styles.messageCard}
            >
              <div style={styles.messageHeader}>
                <div>
                  <strong>{message.name}</strong>
                  <div style={styles.messageEmail}>{message.email}</div>
                </div>
                <button
                  onClick={() => onDelete(message.id)}
                  style={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
              <p style={styles.messageText}>{message.message}</p>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

// User Detail Modal
function UserDetailModal({ user, onClose }) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={styles.modal}
      >
        <div style={styles.modalHeader}>
          <h2>User Details: {user.name}</h2>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        <div style={styles.modalContent}>
          <DetailRow label="Location" value={`${user.location?.island}, ${user.location?.settlement}`} />
          <DetailRow label="Farm Size" value={user.farmSize} />
          <DetailRow label="Terrain" value={user.terrain} />
          <DetailRow label="Farming Type" value={user.farmingType} />
          
          <div style={styles.detailSection}>
            <strong>Growing Sites:</strong>
            <p>{user.growingSites?.join(", ") || "N/A"}</p>
          </div>

          <div style={styles.detailSection}>
            <strong>Water Sources:</strong>
            <p>{user.waterSources?.join(", ") || "N/A"}</p>
          </div>

          <div style={styles.detailSection}>
            <strong>Crops ({user.crops?.length || 0}):</strong>
            <div style={styles.tagContainer}>
              {user.crops?.map((crop, i) => (
                <span key={i} style={styles.cropTag}>{crop}</span>
              ))}
            </div>
          </div>

          <div style={styles.detailSection}>
            <strong>Pest Control Methods:</strong>
            <p>{user.pestControl?.join(", ") || "N/A"}</p>
          </div>

          <div style={styles.detailSection}>
            <strong>Disease History ({user.diseases?.length || 0}):</strong>
            {user.diseases?.length > 0 ? (
              user.diseases.map((disease, i) => (
                <div key={i} style={styles.diseaseItem}>
                  <span>{disease.name}</span>
                  <span style={{
                    ...styles.severityBadge,
                    backgroundColor: 
                      disease.severity === "High" ? "#ef4444" :
                      disease.severity === "Medium" ? "#f59e0b" : "#10b981"
                  }}>
                    {disease.severity}
                  </span>
                </div>
              ))
            ) : (
              <p>No disease history recorded</p>
            )}
          </div>

          <DetailRow label="Crop Diversity Notes" value={user.cropDiversity || "N/A"} />
          <DetailRow label="Joined" value={user.createdAt} />
        </div>
      </motion.div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={styles.detailRow}>
      <strong>{label}:</strong>
      <span>{value}</span>
    </div>
  );
}

// Styles
const styles = {
  // Login Styles
  loginContainer: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--paper-cream)"
  },
  loginBox: {
    background: "white",
    padding: "3rem",
    borderRadius: "16px",
    boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
    width: "100%",
    maxWidth: "400px",
    textAlign: "center"
  },
  loginSubtitle: {
    color: "#666",
    marginBottom: "2rem"
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

  // Main Panel Styles
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
    justifyContent: "center"
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
    flexWrap: "wrap"
  },
  headerSubtitle: {
    color: "#666",
    marginTop: "0.5rem"
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
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
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
    fontSize: "0.9rem"
  },
  tabs: {
    display: "flex",
    gap: "1rem",
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
    transition: "all 0.2s"
  },
  tabActive: {
    color: "var(--soil-green)",
    borderBottom: "3px solid var(--soil-green)"
  },
  content: {
    background: "white",
    padding: "2rem",
    borderRadius: "12px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    minHeight: "400px"
  },
  
  // Overview Styles
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
  overviewDate: {
    color: "#666",
    fontSize: "0.85rem"
  },
  phoneNumber: {
    color: "var(--soil-green)",
    fontSize: "0.9rem",
    marginTop: "0.25rem"
  },
  statusBadge: {
    padding: "0.25rem 0.75rem",
    borderRadius: "12px",
    color: "white",
    fontSize: "0.8rem",
    fontWeight: "600",
    textTransform: "uppercase"
  },
  emptyState: {
    textAlign: "center",
    color: "#999",
    padding: "2rem",
    fontStyle: "italic"
  },

  // Table Styles
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
    fontWeight: "600",
    whiteSpace: "nowrap"
  },
  tableContainer: {
    overflowX: "auto"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.9rem"
  },
  viewButton: {
    padding: "0.5rem 1rem",
    background: "var(--soil-green)",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    marginRight: "0.5rem",
    fontSize: "0.85rem"
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
    fontWeight: "500"
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
    cursor: "pointer"
  },

  // Messages Styles
  messagesGrid: {
    display: "grid",
    gap: "1rem",
    marginTop: "1.5rem"
  },
  messageCard: {
    background: "#f9f9f9",
    padding: "1.5rem",
    borderRadius: "8px",
    border: "1px solid #e0e0e0"
  },
  messageHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "1rem",
    alignItems: "flex-start"
  },
  messageEmail: {
    color: "#666",
    fontSize: "0.9rem",
    marginTop: "0.25rem"
  },
  messageText: {
    lineHeight: "1.6",
    color: "#333"
  },

  // Modal Styles
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "1rem"
  },
  modal: {
    background: "white",
    borderRadius: "16px",
    maxWidth: "800px",
    width: "100%",
    maxHeight: "90vh",
    overflow: "auto"
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.5rem",
    borderBottom: "1px solid #e0e0e0"
  },
  closeButton: {
    background: "none",
    border: "none",
    fontSize: "2rem",
    cursor: "pointer",
    color: "#666"
  },
  modalContent: {
    padding: "1.5rem"
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "0.75rem",
    borderBottom: "1px solid #f0f0f0"
  },
  detailSection: {
    marginTop: "1.5rem",
    padding: "1rem",
    background: "#f9f9f9",
    borderRadius: "8px"
  },
  tagContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    marginTop: "0.5rem"
  },
  cropTag: {
    background: "var(--soil-green)",
    color: "white",
    padding: "0.25rem 0.75rem",
    borderRadius: "12px",
    fontSize: "0.85rem"
  },
  diseaseItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "0.5rem",
    background: "white",
    borderRadius: "6px",
    marginTop: "0.5rem"
  },
  severityBadge: {
    padding: "0.2rem 0.6rem",
    borderRadius: "12px",
    fontSize: "0.75rem",
    color: "white",
    fontWeight: "bold"
  }
};

// Add this to your index.css if not already there
const styleSheet = document.createElement("style");
styleSheet.textContent = `
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
