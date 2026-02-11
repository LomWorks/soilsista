
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { auth } from "../firebase";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import LoadingScreen from "../components/LoadingScreen";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate("/dashboard");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Handle login submission
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle redirect
    } catch (error) {
      setIsLoading(false);
      
      // User-friendly error messages
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        setError("Invalid email or password. Please try again.");
      } else if (error.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (error.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else if (error.code === "auth/invalid-credential") {
        setError("Invalid email or password. Please try again.");
      } else {
        setError("Login failed. Please try again.");
      }
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div style={styles.page}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={styles.container}
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
    background: "var(--paper-cream)"
  },
  container: {
    width: "100%",
    maxWidth: "450px",
    background: "white",
    padding: "3rem 2.5rem",
    borderRadius: "16px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
  },
  header: {
    textAlign: "center",
    marginBottom: "2.5rem"
  },
  title: {
    fontSize: "2.5rem",
    color: "var(--ink-black)",
    marginBottom: "0.5rem",
    fontFamily: "'Playfair Display', serif"
  },
  subtitle: {
    color: "#666",
    fontSize: "1rem"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem"
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem"
  },
  label: {
    fontWeight: "600",
    color: "var(--ink-black)",
    fontSize: "0.95rem"
  },
  input: {
    width: "100%",
    padding: "0.875rem",
    fontSize: "1rem",
    border: "1px solid #ddd",
    borderRadius: "8px",
    boxSizing: "border-box",
    transition: "border-color 0.2s"
  },
  errorBox: {
    background: "#fef2f2",
    color: "#ef4444",
    padding: "1rem",
    borderRadius: "8px",
    fontSize: "0.95rem",
    textAlign: "center",
    border: "1px solid #fee2e2"
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
    marginTop: "0.5rem"
  },
  footer: {
    marginTop: "2rem",
    textAlign: "center"
  },
  footerText: {
    color: "#666",
    fontSize: "0.95rem"
  },
  link: {
    color: "var(--soil-green)",
    fontWeight: "600",
    textDecoration: "none"
  }
};