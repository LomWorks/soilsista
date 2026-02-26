import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

// Animated growing plant SVG for the 404 illustration
function WiltedPlant() {
  return (
    <svg width="160" height="200" viewBox="0 0 160 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Pot */}
      <path d="M50 170 L55 200 L105 200 L110 170 Z" fill="#C4956A" />
      <rect x="44" y="162" width="72" height="12" rx="4" fill="#A0785A" />

      {/* Soil */}
      <ellipse cx="80" cy="168" rx="30" ry="6" fill="#5C3D1E" />

      {/* Main stem - drooping */}
      <path d="M80 162 C80 140 80 120 75 100 C70 80 60 65 55 45" stroke="#5B8A3C" strokeWidth="4" strokeLinecap="round" fill="none" />

      {/* Drooping left leaf */}
      <motion.path
        d="M70 105 C50 90 35 100 30 115 C45 118 60 112 70 105Z"
        fill="#7FB34D"
        initial={{ rotate: 0 }}
        animate={{ rotate: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        style={{ transformOrigin: "70px 105px" }}
      />

      {/* Drooping right leaf */}
      <motion.path
        d="M72 128 C92 115 108 120 112 135 C97 140 82 136 72 128Z"
        fill="#6BA83E"
        initial={{ rotate: 0 }}
        animate={{ rotate: [0, 4, 0] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.5 }}
        style={{ transformOrigin: "72px 128px" }}
      />

      {/* Wilted top flower / drooping head */}
      <motion.g
        animate={{ rotate: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        style={{ transformOrigin: "55px 45px" }}
      >
        {/* Drooping petals */}
        <ellipse cx="47" cy="32" rx="7" ry="12" fill="#E8C56A" transform="rotate(-20 47 32)" />
        <ellipse cx="60" cy="28" rx="7" ry="12" fill="#E8C56A" transform="rotate(15 60 28)" />
        <ellipse cx="38" cy="42" rx="7" ry="10" fill="#DCAF50" transform="rotate(-50 38 42)" />
        {/* Center */}
        <circle cx="52" cy="40" r="10" fill="#C4843A" />
        <circle cx="52" cy="40" r="6" fill="#A0682A" />
        {/* Sad face dots */}
        <circle cx="49" cy="39" r="1.2" fill="#7A4A1A" />
        <circle cx="55" cy="39" r="1.2" fill="#7A4A1A" />
        {/* Sad mouth */}
        <path d="M48 44 Q52 41 56 44" stroke="#7A4A1A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </motion.g>

      {/* Little falling leaf */}
      <motion.path
        d="M90 80 C95 70 105 72 103 82 C97 85 90 83 90 80Z"
        fill="#7FB34D"
        initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
        animate={{ y: [0, 60], x: [0, 15], rotate: [0, 45], opacity: [1, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeIn", delay: 1 }}
      />

      {/* Water drop (thirsty indicator) */}
      <motion.g
        animate={{ y: [0, 8], opacity: [0, 1, 0] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeIn", delay: 0.8 }}
      >
        <path d="M120 90 Q122 85 124 90 Q125 95 122 97 Q119 95 120 90Z" fill="#76B5D4" />
      </motion.g>
    </svg>
  );
}

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      {/* Scattered soil dots background decoration */}
      {[...Array(12)].map((_, i) => (
        <div key={i} style={{
          ...styles.dot,
          width: `${6 + (i % 3) * 4}px`,
          height: `${6 + (i % 3) * 4}px`,
          top: `${10 + (i * 7) % 80}%`,
          left: `${5 + (i * 8) % 90}%`,
          opacity: 0.12 + (i % 4) * 0.04,
          animationDelay: `${i * 0.3}s`
        }} />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={styles.container}
      >
        {/* Plant illustration */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={styles.illustration}
        >
          <WiltedPlant />
        </motion.div>

        {/* 404 number */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={styles.errorCode}
        >
          4<span style={styles.zeroHighlight}>0</span>4
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={styles.heading}
        >
          This plot's gone fallow
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={styles.subtext}
        >
          Looks like this page didn't take root. It may have been moved,
          harvested, or it never grew here to begin with.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={styles.actions}
        >
          <button onClick={() => navigate("/")} style={styles.primaryBtn}>
            🌱 Back to Home
          </button>
          <button onClick={() => navigate(-1)} style={styles.secondaryBtn}>
            ← Go Back
          </button>
        </motion.div>

        {/* Helpful links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          style={styles.linksRow}
        >
          <span style={styles.linksLabel}>Try instead:</span>
          {[
            { label: "Dashboard", path: "/dashboard" },
            { label: "Get Started", path: "/get-started" },
            { label: "Contact", path: "/contact" },
          ].map(link => (
            <button key={link.path} onClick={() => navigate(link.path)} style={styles.quickLink}>
              {link.label}
            </button>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "var(--paper-cream, #FAF7F2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Inter', sans-serif",
  },
  dot: {
    position: "absolute",
    borderRadius: "50%",
    background: "var(--soil-green, #5B8A3C)",
    animation: "pulse 4s ease-in-out infinite",
    pointerEvents: "none",
  },
  container: {
    textAlign: "center",
    maxWidth: "520px",
    width: "100%",
    background: "white",
    borderRadius: "24px",
    padding: "3rem 2.5rem",
    boxShadow: "0 8px 40px rgba(91, 138, 60, 0.1)",
    border: "1px solid rgba(91, 138, 60, 0.08)",
    position: "relative",
    zIndex: 1,
  },
  illustration: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "0.5rem",
  },
  errorCode: {
    fontSize: "5rem",
    fontWeight: "900",
    color: "var(--ink-black, #1A1A1A)",
    fontFamily: "'Playfair Display', serif",
    lineHeight: 1,
    marginBottom: "0.5rem",
    letterSpacing: "-2px",
  },
  zeroHighlight: {
    color: "var(--soil-green, #5B8A3C)",
  },
  heading: {
    fontSize: "1.6rem",
    color: "var(--ink-black, #1A1A1A)",
    fontFamily: "'Playfair Display', serif",
    fontWeight: "700",
    margin: "0 0 1rem",
  },
  subtext: {
    color: "#666",
    fontSize: "1rem",
    lineHeight: "1.7",
    margin: "0 0 2rem",
  },
  actions: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: "1.5rem",
  },
  primaryBtn: {
    padding: "0.875rem 2rem",
    background: "var(--soil-green, #5B8A3C)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  secondaryBtn: {
    padding: "0.875rem 2rem",
    background: "transparent",
    color: "var(--soil-green, #5B8A3C)",
    border: "2px solid var(--soil-green, #5B8A3C)",
    borderRadius: "10px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  linksRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    flexWrap: "wrap",
  },
  linksLabel: {
    color: "#999",
    fontSize: "0.85rem",
  },
  quickLink: {
    background: "#f4f1ec",
    border: "none",
    color: "var(--ink-black, #1A1A1A)",
    padding: "0.35rem 0.85rem",
    borderRadius: "20px",
    fontSize: "0.85rem",
    cursor: "pointer",
    fontWeight: "500",
    transition: "all 0.15s",
  },
};