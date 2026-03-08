// Home.jsx — Market Readiness positioning
// Plan. Monitor. Position. Deliver.

import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay },
});

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) navigate("/dashboard");
    });
    return () => unsubscribe();
  }, [navigate]);

  return (
    <div style={styles.container}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0)} style={styles.hero}>
        <div style={styles.badge}>🌿 Caribbean Farm Intelligence</div>
        <h1 style={styles.heroTitle}>
          From Seed to Sale,<br />
          <span style={styles.heroHighlight}>Your Farm is Ready.</span>
        </h1>
        <p style={styles.heroSubtitle}>
          Soil Sista helps Caribbean farmers plan their growing season, monitor
          field conditions, position produce for buyers, and deliver on time —
          every cycle.
        </p>

        <div style={styles.ctaButtons}>
          <Link to="/get-started">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={styles.primaryButton}
            >
              Start Free
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

      {/* ── Four Pillars ─────────────────────────────────────────────────── */}
      <div style={styles.pillarsSection}>
        <motion.p {...fadeUp(0.1)} style={styles.pillarsLabel}>
          Everything your farm needs to reach market
        </motion.p>
        <div style={styles.pillars}>
          {[
            {
              icon: "🗓️",
              step: "01",
              title: "Plan",
              desc: "Data-driven crop scheduling built around Caribbean seasons, soil types, and market windows. Know what to plant and when.",
            },
            {
              icon: "📡",
              step: "02",
              title: "Monitor",
              desc: "Live weather alerts, crop health reminders, and field condition tracking calibrated to your specific crops and island.",
            },
            {
              icon: "🏷️",
              step: "03",
              title: "Position",
              desc: "Understand buyer demand, optimal harvest timing, and how to present your produce for hotels, grocers, and export markets.",
            },
            {
              icon: "🚚",
              step: "04",
              title: "Deliver",
              desc: "Post-harvest guidance, packaging standards, and logistics planning to get your produce from field to buyer in peak condition.",
            },
          ].map((p, i) => (
            <motion.div key={p.step} {...fadeUp(0.1 + i * 0.1)} style={styles.pillar}>
              <div style={styles.pillarStep}>{p.step}</div>
              <div style={styles.pillarIcon}>{p.icon}</div>
              <h3 style={styles.pillarTitle}>{p.title}</h3>
              <p style={styles.pillarDesc}>{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Value Strip ──────────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.3)} style={styles.valueStrip}>
        {[
          { stat: "2 Islands", label: "Antigua & Bahamas" },
          { stat: "Free", label: "Core tools, always" },
          { stat: "Live", label: "Weather & alerts" },
          { stat: "WhatsApp", label: "Expert consultations" },
        ].map((v) => (
          <div key={v.stat} style={styles.valueStat}>
            <span style={styles.valueStatNum}>{v.stat}</span>
            <span style={styles.valueStatLabel}>{v.label}</span>
          </div>
        ))}
      </motion.div>

      {/* ── Who It's For ─────────────────────────────────────────────────── */}
      <div style={styles.forSection}>
        <motion.h2 {...fadeUp(0.1)} style={styles.forTitle}>
          Built for Caribbean Farmers
        </motion.h2>
        <motion.p {...fadeUp(0.2)} style={styles.forSub}>
          Whether you're a small-plot grower in Antigua or a commercial operation
          in Nassau, Soil Sista gives you the tools to run your farm like a business.
        </motion.p>
        <div style={styles.forCards}>
          {[
            { icon: "🌾", title: "Small-Scale Farmers", desc: "Free planning tools and weather alerts built for your crops and your island." },
            { icon: "🏗️", title: "Commercial Operations", desc: "Premium analytics, buyer positioning, and WhatsApp consultation with agri experts." },
            { icon: "🤝", title: "Farm Co-ops & Groups", desc: "Coordinate planting cycles across multiple farms to meet bulk buyer demand together." },
          ].map((c, i) => (
            <motion.div key={c.title} {...fadeUp(0.1 + i * 0.1)} style={styles.forCard}>
              <div style={styles.forCardIcon}>{c.icon}</div>
              <h4 style={styles.forCardTitle}>{c.title}</h4>
              <p style={styles.forCardDesc}>{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Testimonial ──────────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.2)} style={styles.testimonial}>
        <div style={styles.quoteIcon}>"</div>
        <p style={styles.testimonialText}>
          Working with Jade Sands was truly a pleasure. We had a strict deadline to
          provide several deliverables and Jade met each requirement for the various
          timeline. Jade is very insightful, a critical thinker and analytical. She
          will provide great assistance to any work.
        </p>
        <p style={styles.testimonialAuthor}>
          Jeri Kelly Russell · CEO, Island Manna Farm Store, Freeport
        </p>
      </motion.div>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.2)} style={styles.finalCta}>
        <h2 style={styles.finalCtaTitle}>Your farm deserves a market strategy.</h2>
        <p style={styles.finalCtaSub}>Start free. No credit card required.</p>
        <Link to="/get-started">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={styles.primaryButton}
          >
            Get Started Free
          </motion.button>
        </Link>
      </motion.div>

    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "var(--paper-cream)",
  },

  // Hero
  hero: {
    padding: "6rem 2rem 4rem",
    textAlign: "center",
    maxWidth: "860px",
    margin: "0 auto",
  },
  badge: {
    display: "inline-block",
    background: "rgba(74,124,89,0.1)",
    color: "var(--soil-green)",
    padding: "0.4rem 1.1rem",
    borderRadius: "100px",
    fontSize: "0.85rem",
    fontWeight: "600",
    letterSpacing: "0.03em",
    marginBottom: "1.5rem",
  },
  heroTitle: {
    fontSize: "clamp(2.4rem, 6vw, 3.8rem)",
    marginBottom: "1.5rem",
    fontFamily: "'Playfair Display', serif",
    color: "var(--ink-black)",
    lineHeight: "1.15",
  },
  heroHighlight: {
    color: "var(--soil-green)",
  },
  heroSubtitle: {
    fontSize: "1.2rem",
    color: "#555",
    marginBottom: "2.5rem",
    lineHeight: "1.7",
    maxWidth: "680px",
    margin: "0 auto 2.5rem",
  },
  ctaButtons: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  primaryButton: {
    padding: "0.9rem 2.4rem",
    fontSize: "1rem",
    background: "var(--soil-green)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(74,124,89,0.3)",
  },
  secondaryButton: {
    padding: "0.9rem 2.4rem",
    fontSize: "1rem",
    background: "white",
    color: "var(--soil-green)",
    border: "2px solid var(--soil-green)",
    borderRadius: "10px",
    fontWeight: "600",
    cursor: "pointer",
  },

  // Pillars
  pillarsSection: {
    padding: "4rem 2rem",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  pillarsLabel: {
    textAlign: "center",
    color: "#888",
    fontSize: "0.95rem",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    marginBottom: "2.5rem",
    fontWeight: "500",
  },
  pillars: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "1.5rem",
  },
  pillar: {
    background: "white",
    padding: "2rem 1.75rem",
    borderRadius: "16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    borderTop: "3px solid var(--soil-green)",
    position: "relative",
  },
  pillarStep: {
    position: "absolute",
    top: "1.25rem",
    right: "1.25rem",
    fontSize: "0.75rem",
    fontWeight: "700",
    color: "#ccc",
    letterSpacing: "0.05em",
  },
  pillarIcon: {
    fontSize: "2.4rem",
    marginBottom: "0.75rem",
  },
  pillarTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.3rem",
    color: "var(--ink-black)",
    marginBottom: "0.6rem",
  },
  pillarDesc: {
    color: "#666",
    fontSize: "0.9rem",
    lineHeight: "1.65",
    margin: 0,
  },

  // Value Strip
  valueStrip: {
    background: "var(--soil-green)",
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "0",
    padding: "2.5rem 2rem",
  },
  valueStat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0.5rem 2.5rem",
    borderRight: "1px solid rgba(255,255,255,0.2)",
  },
  valueStatNum: {
    color: "white",
    fontSize: "1.6rem",
    fontWeight: "700",
    fontFamily: "'Playfair Display', serif",
  },
  valueStatLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: "0.8rem",
    marginTop: "0.2rem",
    letterSpacing: "0.03em",
  },

  // Who it's for
  forSection: {
    padding: "5rem 2rem",
    maxWidth: "1100px",
    margin: "0 auto",
    textAlign: "center",
  },
  forTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
    color: "var(--ink-black)",
    marginBottom: "1rem",
  },
  forSub: {
    color: "#666",
    fontSize: "1.05rem",
    lineHeight: "1.7",
    maxWidth: "620px",
    margin: "0 auto 3rem",
  },
  forCards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "1.5rem",
    textAlign: "left",
  },
  forCard: {
    background: "white",
    padding: "2rem",
    borderRadius: "14px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  forCardIcon: {
    fontSize: "2rem",
    marginBottom: "0.75rem",
  },
  forCardTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.15rem",
    color: "var(--ink-black)",
    marginBottom: "0.5rem",
  },
  forCardDesc: {
    color: "#666",
    fontSize: "0.88rem",
    lineHeight: "1.65",
    margin: 0,
  },

  // Testimonial
  testimonial: {
    background: "var(--deep-leaf, #2d5a3d)",
    color: "white",
    padding: "4rem 2rem",
    textAlign: "center",
    position: "relative",
  },
  quoteIcon: {
    fontSize: "5rem",
    fontFamily: "'Playfair Display', serif",
    color: "rgba(255,255,255,0.15)",
    lineHeight: "0.5",
    marginBottom: "1.5rem",
    display: "block",
  },
  testimonialText: {
    fontSize: "1.15rem",
    fontStyle: "italic",
    lineHeight: "1.75",
    maxWidth: "680px",
    margin: "0 auto 1.25rem",
    opacity: 0.92,
  },
  testimonialAuthor: {
    fontSize: "0.9rem",
    opacity: 0.7,
    letterSpacing: "0.03em",
  },

  // Final CTA
  finalCta: {
    padding: "5rem 2rem",
    textAlign: "center",
    background: "var(--paper-cream)",
  },
  finalCtaTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "clamp(1.8rem, 4vw, 2.4rem)",
    color: "var(--ink-black)",
    marginBottom: "0.75rem",
  },
  finalCtaSub: {
    color: "#888",
    fontSize: "1rem",
    marginBottom: "2rem",
  },
};