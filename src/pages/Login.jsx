import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from "firebase/auth";
import LoadingScreen from "../components/LoadingScreen";

// view: "login" | "forgot" | "forgot-sent"
export default function Login() {
  const navigate = useNavigate();
  const [view, setView] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) navigate("/dashboard");
    });
    return () => unsubscribe();
  }, [navigate]);

  // ── Sign in ──────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged handles redirect
    } catch (err) {
      setIsLoading(false);
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("Invalid email or password. Please try again.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError("Login failed. Please try again.");
      }
    }
  };

  // ── Password reset ────────────────────────────────────────────────────────
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setView("forgot-sent");
    } catch (err) {
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-email"
      ) {
        // Don't reveal whether account exists — prevents account enumeration
        setView("forgot-sent");
      } else {
        setError("Failed to send reset email. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div style={styles.page}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={styles.container}
      >
        <AnimatePresence mode="wait">

          {/* Sign In */}
          {view === "login" && (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.25 }}
            >
              <div style={styles.header}>
                <h1 style={styles.title}>Welcome Back</h1>
                <p style={styles.subtitle}>Sign in to access your farm dashboard</p>
              </div>

              <form onSubmit={handleLogin} style={styles.form}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    style={styles.input}
                    required
                    autoComplete="email"
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    style={styles.input}
                    required
                    autoComplete="current-password"
                  />
                  <div style={styles.forgotRow}>
                    <button
                      type="button"
                      onClick={() => { setError(""); setView("forgot"); }}
                      style={styles.forgotLink}
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={styles.errorBox}
                  >
                    {error}
                  </motion.div>
                )}

                <button type="submit" style={styles.submitButton}>
                  Sign In
                </button>
              </form>

              <div style={styles.footer}>
                <p style={styles.footerText}>
                  Don't have an account?{" "}
                  <Link to="/get-started" style={styles.link}>
                    Get started free
                  </Link>
                </p>
              </div>
            </motion.div>
          )}

          {/* Forgot Password */}
          {view === "forgot" && (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
            >
              <div style={styles.header}>
                <h1 style={styles.title}>Reset Password</h1>
                <p style={styles.subtitle}>
                  Enter the email you signed up with and we'll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleForgotPassword} style={styles.form}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    style={styles.input}
                    required
                    autoFocus
                    autoComplete="email"
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={styles.errorBox}
                  >
                    {error}
                  </motion.div>
                )}

                <button type="submit" style={styles.submitButton}>
                  Send Reset Link
                </button>

                <button
                  type="button"
                  onClick={() => { setError(""); setView("login"); }}
                  style={styles.backButton}
                >
                  ← Back to Sign In
                </button>
              </form>
            </motion.div>
          )}

          {/* Confirmation */}
          {view === "forgot-sent" && (
            <motion.div
              key="forgot-sent"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              style={styles.confirmationView}
            >
              <div style={styles.confirmationIcon}>📬</div>
              <h2 style={styles.confirmationTitle}>Check your email</h2>
              <p style={styles.confirmationText}>
                If an account exists for <strong>{email}</strong>, a password
                reset link has been sent. Check your inbox and spam folder.
              </p>
              <p style={styles.confirmationSub}>
                The link expires in 1 hour.
              </p>
              <button
                onClick={() => { setError(""); setPassword(""); setView("login"); }}
                style={styles.submitButton}
              >
                Back to Sign In
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 1rem",
    background: "var(--paper-cream)",
  },
  container: {
    width: "100%",
    maxWidth: "450px",
    background: "white",
    padding: "3rem 2.5rem",
    borderRadius: "16px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    minHeight: "400px",
  },
  header: {
    textAlign: "center",
    marginBottom: "2.5rem",
  },
  title: {
    fontSize: "2.5rem",
    color: "var(--ink-black)",
    marginBottom: "0.5rem",
    fontFamily: "'Playfair Display', serif",
  },
  subtitle: {
    color: "#666",
    fontSize: "1rem",
    lineHeight: "1.5",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  label: {
    fontWeight: "600",
    color: "var(--ink-black)",
    fontSize: "0.95rem",
  },
  
  // forgotRow sits below the password input, right-aligned
  forgotRow: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "0.25rem",
  },
  forgotLink: {
    background: "none",
    border: "none",
    color: "var(--soil-green)",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
    padding: 0,
    textDecoration: "underline",
  },
  input: {
    width: "100%",
    padding: "0.875rem",
    fontSize: "1rem",
    border: "1px solid #ddd",
    borderRadius: "8px",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  errorBox: {
    background: "#fef2f2",
    color: "#ef4444",
    padding: "1rem",
    borderRadius: "8px",
    fontSize: "0.95rem",
    textAlign: "center",
    border: "1px solid #fee2e2",
  },
  submitButton: {
    width: "100%",
    padding: "1rem",
    background: "var(--soil-green)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "1.1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
    marginTop: "0.5rem",
  },
  backButton: {
    width: "100%",
    padding: "0.75rem",
    background: "none",
    color: "#666",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontSize: "1rem",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  footer: {
    marginTop: "2rem",
    textAlign: "center",
  },
  footerText: {
    color: "#666",
    fontSize: "0.95rem",
  },
  link: {
    color: "var(--soil-green)",
    fontWeight: "600",
    textDecoration: "none",
  },
  confirmationView: {
    textAlign: "center",
    padding: "1rem 0",
  },
  confirmationIcon: {
    fontSize: "4rem",
    marginBottom: "1.5rem",
  },
  confirmationTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.8rem",
    color: "var(--ink-black)",
    marginBottom: "1rem",
  },
  confirmationText: {
    color: "#555",
    fontSize: "1rem",
    lineHeight: "1.6",
    marginBottom: "0.75rem",
  },
  confirmationSub: {
    color: "#999",
    fontSize: "0.85rem",
    marginBottom: "2rem",
  },
};
