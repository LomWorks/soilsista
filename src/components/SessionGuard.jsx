// SessionGuard.jsx
// Wraps protected pages. When session expires, shows an inline sign-in overlay
// instead of hard-redirecting the user and losing their place.
import React, { useState, useEffect, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "../firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";

const SessionContext = createContext(null);

export function useSession() {
  return useContext(SessionContext);
}

export default function SessionGuard({ children, redirectTo = "/get-started" }) {
  const [user, setUser] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setSessionExpired(false);
      } else {
        if (!initializing) {
          // Session expired mid-use — show overlay, don't redirect
          setSessionExpired(true);
          setUser(null);
        } else {
          // First load with no user — redirect to get started
          window.location.href = redirectTo;
        }
      }
      setInitializing(false);
    });

    return () => unsubscribe();
  }, [initializing, redirectTo]);

  const handleSessionSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setSigningIn(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setSessionExpired(false);
      setEmail("");
      setPassword("");
    } catch (err) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError("Sign in failed. Please try again.");
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = () => {
    signOut(auth);
    window.location.href = redirectTo;
  };

  if (initializing) return null;

  return (
    <SessionContext.Provider value={{ user }}>
      {children}

      <AnimatePresence>
        {sessionExpired && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.overlay}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: "spring", damping: 25 }}
              style={styles.modal}
            >
              <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🌱</div>
              <h2 style={styles.title}>Session Expired</h2>
              <p style={styles.subtitle}>
                You've been signed out for security. Sign back in to continue where you left off.
              </p>

              <form onSubmit={handleSessionSignIn} style={styles.form}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    style={styles.input}
                    required
                    autoFocus
                    autoComplete="email"
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Your password"
                    style={styles.input}
                    required
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.errorBox}>
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={signingIn}
                  style={{ ...styles.signInBtn, opacity: signingIn ? 0.7 : 1 }}
                >
                  {signingIn ? "Signing in..." : "Sign Back In"}
                </button>
              </form>

              <button onClick={handleSignOut} style={styles.signOutBtn}>
                Sign out completely
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SessionContext.Provider>
  );
}

const styles = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
    justifyContent: "center", zIndex: 9999, padding: "1rem"
  },
  modal: {
    background: "white", borderRadius: "20px", padding: "2.5rem 2rem",
    width: "100%", maxWidth: "400px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", textAlign: "center"
  },
  title: { fontSize: "1.75rem", color: "var(--ink-black)", marginBottom: "0.5rem" },
  subtitle: { color: "#666", fontSize: "0.95rem", marginBottom: "1.5rem", lineHeight: "1.5" },
  form: { display: "flex", flexDirection: "column", gap: "1rem", textAlign: "left" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "0.4rem" },
  label: { fontWeight: "600", color: "var(--ink-black)", fontSize: "0.9rem" },
  input: {
    width: "100%", padding: "0.75rem", fontSize: "1rem",
    border: "1px solid #ddd", borderRadius: "8px", boxSizing: "border-box"
  },
  errorBox: {
    background: "#fef2f2", color: "#ef4444", padding: "0.75rem",
    borderRadius: "8px", fontSize: "0.9rem", textAlign: "center"
  },
  signInBtn: {
    width: "100%", padding: "0.875rem", background: "var(--soil-green)",
    color: "white", border: "none", borderRadius: "8px", fontSize: "1rem",
    fontWeight: "600", cursor: "pointer", marginTop: "0.5rem", transition: "all 0.2s"
  },
  signOutBtn: {
    marginTop: "1rem", background: "none", border: "none",
    color: "#999", fontSize: "0.85rem", cursor: "pointer", textDecoration: "underline"
  }
};
