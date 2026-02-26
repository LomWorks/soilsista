// Auth: Google OAuth via Firebase. Only REACT_APP_ADMIN_EMAIL (GitHub secret) can enter.
// Any other Google account is immediately signed out and shown access denied.
import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import {
  collection, getDocs, doc, updateDoc,
  query, orderBy, limit, onSnapshot
} from "firebase/firestore";
import { signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider } from "firebase/auth";
import { motion } from "framer-motion";

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

const ADMIN_EMAIL = process.env.REACT_APP_ADMIN_EMAIL;

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [contactMessages, setContactMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0, activeUsers: 0,
    pendingConsultations: 0, unreadContactMessages: 0, unreadNotifications: 0
  });
  const [authenticated, setAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (ADMIN_EMAIL && user.email === ADMIN_EMAIL) {
          setAuthenticated(true);
          setAccessDenied(false);
        } else {
          await signOut(auth);
          setAuthenticated(false);
          setAccessDenied(true);
        }
      } else {
        setAuthenticated(false);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    fetchAllData();
    const unsubscribe = onSnapshot(
      query(collection(db, "contact_messages"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() }));
        setContactMessages(msgs);
        setStats(prev => ({ ...prev, unreadContactMessages: msgs.filter(m => m.status === "unread").length }));
      }
    );
    return () => unsubscribe();
  }, [authenticated]);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setAccessDenied(false);
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") console.error("Sign in error:", err);
    } finally {
      setSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setAuthenticated(false);
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [usersSnap, activitiesSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"), limit(100))),
        getDocs(query(collection(db, "activities"), orderBy("createdAt", "desc"), limit(200)))
      ]);
      const usersData = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const activitiesData = activitiesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(usersData);
      setActivities(activitiesData);
      setStats(prev => ({
        ...prev,
        totalUsers: usersData.length,
        activeUsers: usersData.filter(u => u.accountStatus === "active").length,
        pendingConsultations: usersData.filter(u => u.consultationStatus === "pending").length,
        unreadNotifications: activitiesData.filter(a => a.status === "unread").length
      }));
    } catch (err) {
      console.error("Error fetching admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div style={styles.centered}><div style={styles.spinner} /></div>;

  if (!authenticated) {
    return (
      <div style={styles.gatePage}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.gateCard}>
          <span style={{ fontSize: "3rem" }}>🌿</span>
          <h1 style={styles.gateTitle}>Soil Sista Admin</h1>
          <p style={styles.gateSubtitle}>Only the gardener may enter</p>

          {accessDenied && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.deniedBox}>
              ⛔ That account doesn't have access. Please use the authorised Soil Sista account.
            </motion.div>
          )}

          <p style={styles.gateHint}>Sign in with your Soil Sista Google account to continue</p>

          <button
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            style={{ ...styles.googleBtn, opacity: signingIn ? 0.7 : 1 }}
          >
            <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {signingIn ? "Opening..." : "Sign in with Google"}
          </button>
        </motion.div>
      </div>
    );
  }

  if (loading) return (
    <div style={styles.centered}>
      <div style={styles.spinner} />
      <p style={{ color: "#666", marginTop: "1rem" }}>Loading...</p>
    </div>
  );

  return (
    <div style={styles.adminPage}>
      <div style={styles.adminHeader}>
        <h1 style={styles.adminTitle}>🌱 Soil Sista Admin</h1>
        <button onClick={handleLogout} style={styles.logoutBtn}>Sign Out</button>
      </div>

      <div style={styles.statsBar}>
        {[
          { icon: "👥", label: "Total Users", value: stats.totalUsers },
          { icon: "✅", label: "Active", value: stats.activeUsers },
          { icon: "💬", label: "Pending Consults", value: stats.pendingConsultations, color: "#E6A93C" },
          { icon: "📩", label: "Unread Messages", value: stats.unreadContactMessages, color: "#ef4444" },
          { icon: "🔔", label: "Unread Alerts", value: stats.unreadNotifications },
        ].map(s => (
          <div key={s.label} style={styles.statCard}>
            <span style={{ fontSize: "1.75rem" }}>{s.icon}</span>
            <span style={{ ...styles.statValue, color: s.color || "var(--soil-green)" }}>{s.value}</span>
            <span style={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      <div style={styles.tabs}>
        {["overview", "users", "consultations", "messages", "activities"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {activeTab === "overview" && <OverviewTab users={users} contactMessages={contactMessages} />}
        {activeTab === "users" && <UsersTab users={users} onRefresh={fetchAllData} />}
        {activeTab === "consultations" && <ConsultationsTab users={users.filter(u => u.planType === "paid")} onRefresh={fetchAllData} />}
        {activeTab === "messages" && <MessagesTab messages={contactMessages} />}
        {activeTab === "activities" && <ActivitiesTab activities={activities} />}
      </div>
    </div>
  );
}

function OverviewTab({ users, contactMessages }) {
  return (
    <div style={styles.grid}>
      <div style={styles.card}>
        <h3>👥 Recent Sign-ups</h3>
        {users.slice(0, 5).map(user => (
          <div key={user.id} style={styles.listItem}>
            <div>
              <div style={styles.listItemTitle}>{user.name}</div>
              <div style={styles.listItemSub}>{user.email} · {user.location?.island}</div>
            </div>
            <span style={{ ...styles.badge, background: user.planType === "paid" ? "var(--soil-green)" : "#999" }}>{user.planType}</span>
          </div>
        ))}
        {users.length === 0 && <p style={styles.empty}>No users yet</p>}
      </div>
      <div style={styles.card}>
        <h3>📩 Recent Messages</h3>
        {contactMessages.slice(0, 5).map(msg => (
          <div key={msg.id} style={styles.listItem}>
            <div>
              <div style={styles.listItemTitle}>{msg.name}</div>
              <div style={styles.listItemSub}>{msg.message?.slice(0, 60)}...</div>
            </div>
            {msg.status === "unread" && <span style={{ ...styles.badge, background: "#ef4444" }}>New</span>}
          </div>
        ))}
        {contactMessages.length === 0 && <p style={styles.empty}>No messages yet</p>}
      </div>
    </div>
  );
}

function UsersTab({ users, onRefresh }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h3>All Users ({users.length})</h3>
        <button onClick={onRefresh} style={styles.refreshBtn}>↻ Refresh</button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={styles.table}>
          <thead>
            <tr>{["Name","Email","Island","Plan","Farm Size","Status","Joined"].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={styles.tr}>
                <td style={styles.td}>{user.name}</td>
                <td style={styles.td}>{user.email}</td>
                <td style={styles.td}>{user.location?.island}</td>
                <td style={styles.td}><span style={{ ...styles.badge, background: user.planType === "paid" ? "var(--soil-green)" : "#999" }}>{user.planType}</span></td>
                <td style={styles.td}>{user.farmSize}</td>
                <td style={styles.td}>{user.accountStatus}</td>
                <td style={styles.td}>{user.createdAt?.toDate?.()?.toLocaleDateString() || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConsultationsTab({ users, onRefresh }) {
  const handleUpdateStatus = async (userId, status) => {
    try { await updateDoc(doc(db, "users", userId), { consultationStatus: status }); onRefresh(); }
    catch (err) { console.error(err); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h3>Premium Consultations ({users.length})</h3>
        <button onClick={onRefresh} style={styles.refreshBtn}>↻ Refresh</button>
      </div>
      {users.length === 0 ? <p style={styles.empty}>No premium users yet</p> : users.map(user => (
        <div key={user.id} style={{ ...styles.card, marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h4 style={{ margin: 0 }}>{user.name}</h4>
              <p style={styles.listItemSub}>{user.location?.island} · {user.phone}</p>
            </div>
            <span style={{ ...styles.badge, background: user.consultationStatus === "pending" ? "#E6A93C" : user.consultationStatus === "active" ? "var(--soil-green)" : "#999" }}>
              {user.consultationStatus || "pending"}
            </span>
          </div>
          {user.currentIssue && <p style={{ margin: "0.75rem 0", color: "#444", fontSize: "0.9rem" }}><strong>Issue:</strong> {user.currentIssue}</p>}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
            <a href={`https://wa.me/${user.phone}`} target="_blank" rel="noopener noreferrer" style={styles.whatsappBtn}>💬 WhatsApp</a>
            <button onClick={() => handleUpdateStatus(user.id, "active")} style={styles.actionBtn}>Mark Active</button>
            <button onClick={() => handleUpdateStatus(user.id, "completed")} style={{ ...styles.actionBtn, background: "#666" }}>Mark Complete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function MessagesTab({ messages }) {
  const handleMarkRead = async (id) => {
    try { await updateDoc(doc(db, "contact_messages", id), { status: "read" }); }
    catch (err) { console.error(err); }
  };
  return (
    <div>
      <h3 style={{ marginBottom: "1rem" }}>Contact Messages ({messages.length})</h3>
      {messages.length === 0 ? <p style={styles.empty}>No messages yet</p> : messages.map(msg => (
        <div key={msg.id} style={{ ...styles.card, borderLeft: `4px solid ${msg.status === "unread" ? "var(--soil-green)" : "#ddd"}`, marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span><strong>{msg.name}</strong> <span style={{ color: "#666", fontSize: "0.85rem" }}>· {msg.email}</span></span>
            <span style={{ color: "#999", fontSize: "0.8rem" }}>{msg.createdAt?.toLocaleDateString() || "—"}</span>
          </div>
          <p style={{ color: "#444", fontSize: "0.95rem", lineHeight: "1.6" }}>{msg.message}</p>
          {msg.status === "unread" && <button onClick={() => handleMarkRead(msg.id)} style={styles.markReadBtn}>Mark as Read</button>}
        </div>
      ))}
    </div>
  );
}

function ActivitiesTab({ activities }) {
  return (
    <div>
      <h3 style={{ marginBottom: "1rem" }}>Recent Activities ({activities.length})</h3>
      {activities.slice(0, 50).map(a => (
        <div key={a.id} style={{ display: "flex", gap: "1rem", alignItems: "center", padding: "0.75rem", borderBottom: "1px solid #f0f0f0" }}>
          <span style={{ fontSize: "1.5rem" }}>{a.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: "500", fontSize: "0.95rem" }}>{a.title}</div>
            <div style={{ fontSize: "0.8rem", color: "#999" }}>{a.type} · {a.createdAt?.toDate?.()?.toLocaleDateString() || "—"}</div>
          </div>
          <span style={{ ...styles.badge, background: a.status === "unread" ? "#E6A93C" : "#999", fontSize: "0.75rem" }}>{a.status}</span>
        </div>
      ))}
    </div>
  );
}

const styles = {
  centered: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  spinner: { width: "40px", height: "40px", border: "4px solid #f3f3f3", borderTop: "4px solid var(--soil-green)", borderRadius: "50%", animation: "spin 1s linear infinite" },
  gatePage: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--paper-cream)", padding: "2rem" },
  gateCard: { width: "100%", maxWidth: "420px", background: "white", padding: "3rem 2.5rem", borderRadius: "20px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" },
  gateTitle: { fontSize: "1.75rem", color: "var(--ink-black)", margin: "0.25rem 0" },
  gateSubtitle: { color: "var(--soil-green)", fontStyle: "italic", fontSize: "1rem", margin: 0 },
  gateHint: { color: "#666", fontSize: "0.9rem", margin: "1rem 0 0.5rem" },
  deniedBox: { background: "#fef2f2", color: "#ef4444", padding: "0.875rem 1rem", borderRadius: "8px", fontSize: "0.9rem", width: "100%", boxSizing: "border-box", marginTop: "0.5rem" },
  googleBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", width: "100%", padding: "0.875rem", background: "white", border: "2px solid #e0e0e0", borderRadius: "10px", fontSize: "1rem", fontWeight: "600", cursor: "pointer", color: "var(--ink-black)", transition: "all 0.2s", marginTop: "0.5rem" },
  adminPage: { minHeight: "100vh", background: "var(--paper-cream)", padding: "2rem" },
  adminHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" },
  adminTitle: { fontSize: "1.75rem", color: "var(--ink-black)" },
  logoutBtn: { padding: "0.5rem 1.25rem", background: "white", border: "2px solid var(--soil-green)", color: "var(--soil-green)", borderRadius: "8px", cursor: "pointer", fontWeight: "600" },
  statsBar: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", marginBottom: "2rem" },
  statCard: { background: "white", padding: "1.25rem", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" },
  statValue: { fontSize: "2rem", fontWeight: "bold" },
  statLabel: { fontSize: "0.8rem", color: "#666", textAlign: "center" },
  tabs: { display: "flex", gap: "0.5rem", marginBottom: "2rem", borderBottom: "2px solid #e0e0e0", flexWrap: "wrap" },
  tab: { padding: "0.75rem 1.5rem", background: "none", border: "none", borderBottom: "3px solid transparent", cursor: "pointer", fontSize: "0.95rem", fontWeight: "500", color: "#666" },
  tabActive: { color: "var(--soil-green)", borderBottom: "3px solid var(--soil-green)" },
  content: { maxWidth: "1200px", margin: "0 auto" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" },
  card: { background: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.08)" },
  listItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 0", borderBottom: "1px solid #f0f0f0" },
  listItemTitle: { fontWeight: "500", fontSize: "0.95rem" },
  listItemSub: { fontSize: "0.8rem", color: "#999", marginTop: "0.2rem" },
  badge: { padding: "0.2rem 0.6rem", borderRadius: "12px", color: "white", fontSize: "0.8rem", fontWeight: "600", whiteSpace: "nowrap" },
  empty: { color: "#999", fontStyle: "italic", padding: "1rem 0" },
  table: { width: "100%", borderCollapse: "collapse", background: "white", borderRadius: "8px" },
  th: { padding: "0.75rem 1rem", background: "#f9f9f9", textAlign: "left", fontSize: "0.85rem", fontWeight: "600", color: "#666", borderBottom: "2px solid #e0e0e0" },
  tr: { borderBottom: "1px solid #f0f0f0" },
  td: { padding: "0.75rem 1rem", fontSize: "0.9rem", color: "var(--ink-black)" },
  refreshBtn: { padding: "0.5rem 1rem", background: "white", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer", fontSize: "0.9rem" },
  whatsappBtn: { padding: "0.5rem 1rem", background: "#25D366", color: "white", borderRadius: "6px", textDecoration: "none", fontWeight: "600", fontSize: "0.9rem" },
  actionBtn: { padding: "0.5rem 1rem", background: "var(--soil-green)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem" },
  markReadBtn: { marginTop: "0.75rem", padding: "0.4rem 0.9rem", background: "var(--soil-green)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600" },
};
