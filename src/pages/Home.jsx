import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div style={styles.container}>
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={styles.hero}
      >
        <h1 style={styles.heroTitle}>
          Climate-Smart Farming<br />
          <span style={styles.heroHighlight}>Powered by Data</span>
        </h1>
        <p style={styles.heroSubtitle}>
          Personal soil & climate consultation that translates nature into guidance.
          Plan smarter, grow better, harvest more.
        </p>
        
        <div style={styles.ctaButtons}>
          <Link to="/get-started">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={styles.primaryButton}
            >
              Get Started Free
            </motion.button>
          </Link>
          
          <Link to="/about">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={styles.secondaryButton}
            >
              Learn More
            </motion.button>
          </Link>
        </div>
      </motion.div>

      {/* Features Section */}
      <div style={styles.features}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={styles.feature}
        >
          <div style={styles.featureIcon}>🌦️</div>
          <h3>Weather Integration</h3>
          <p>Real-time climate data to help you plan around weather patterns</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={styles.feature}
        >
          <div style={styles.featureIcon}>📊</div>
          <h3>Automated Planning</h3>
          <p>Mathematical crop planning based on proven farming cycles and data</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={styles.feature}
        >
          <div style={styles.featureIcon}>💬</div>
          <h3>Expert Support</h3>
          <p>Premium WhatsApp consultations for real-time farming advice</p>
        </motion.div>
      </div>

      {/* Social Proof */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        style={styles.social}
      >
        <p style={styles.socialText}>
          "Working with Jade Sands was truly a pleasure. We had a strict deadline to provide several deliverables and Jade met each requirement for the various timeline. Jade is very insightful, a critical thinker and analytical. She will provide great assistance to any work."
        </p>
        <p style={styles.socialAuthor}>Jeri Kelly Russell, CEO Island Manna Farm Store, Freeport</p>
      </motion.div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "var(--paper-cream)"
  },
  hero: {
    padding: "6rem 2rem",
    textAlign: "center",
    maxWidth: "900px",
    margin: "0 auto"
  },
  heroTitle: {
    fontSize: "3.5rem",
    marginBottom: "1.5rem",
    fontFamily: "'Playfair Display', serif",
    color: "var(--ink-black)",
    lineHeight: "1.2"
  },
  heroHighlight: {
    color: "var(--soil-green)"
  },
  heroSubtitle: {
    fontSize: "1.3rem",
    color: "#666",
    marginBottom: "3rem",
    lineHeight: "1.6"
  },
  ctaButtons: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    flexWrap: "wrap"
  },
  primaryButton: {
    padding: "1rem 2.5rem",
    fontSize: "1.1rem",
    background: "var(--soil-green)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
  },
  secondaryButton: {
    padding: "1rem 2.5rem",
    fontSize: "1.1rem",
    background: "white",
    color: "var(--soil-green)",
    border: "2px solid var(--soil-green)",
    borderRadius: "12px",
    fontWeight: "600",
    cursor: "pointer"
  },
  features: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "2rem",
    padding: "4rem 2rem",
    maxWidth: "1200px",
    margin: "0 auto"
  },
  feature: {
    background: "white",
    padding: "2rem",
    borderRadius: "16px",
    textAlign: "center",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
  },
  featureIcon: {
    fontSize: "4rem",
    marginBottom: "1rem"
  },
  social: {
    background: "var(--deep-leaf)",
    color: "white",
    padding: "3rem 2rem",
    textAlign: "center"
  },
  socialText: {
    fontSize: "1.3rem",
    fontStyle: "italic",
    marginBottom: "1rem",
    maxWidth: "700px",
    margin: "0 auto 1rem"
  },
  socialAuthor: {
    fontSize: "1rem",
    opacity: 0.9
  }
};