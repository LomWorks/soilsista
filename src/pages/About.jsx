import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay },
});

export default function About() {
  return (
    <div style={styles.page}>

      {/* Header */}
      <motion.div {...fadeUp(0)} style={styles.heroSection}>
        <h1 style={styles.title}>About Soil Sista</h1>
        <p style={styles.tagline}>
          Caribbean Farm Intelligence — Plan, Monitor, Position & Deliver
        </p>
      </motion.div>

      {/* Mission */}
      <motion.section {...fadeUp(0.1)} style={styles.section}>
        <h2>Our Mission</h2>
        <p>
          Soil Sista is a market readiness platform built for Caribbean farmers. We combine
          real-time climate data, smart crop planning, and agronomic expertise to help farmers
          across Antigua & Barbuda and The Bahamas grow with purpose — not just quantity, but
          quality produce that's ready for buyers when they need it.
        </p>
        <p>
          We believe Caribbean farmers deserve the same tools as large agricultural operations.
          Our platform bridges the gap between the field and the market, helping small and
          commercial farms compete, plan ahead, and build sustainable income.
        </p>
      </motion.section>

      {/* Why it matters */}
      <motion.section {...fadeUp(0.2)} style={styles.section}>
        <h2>Why This Matters</h2>
        <p>
          The Caribbean imports a significant portion of its food — leaving us exposed to
          supply chain disruptions, price volatility, and food insecurity. Yet our climate,
          soils, and farming heritage offer real potential to grow more of what we eat and sell.
        </p>
        <p>
          In Antigua & Barbuda, farmers work with clay-loam and volcanic soils shaped by
          seasonal rains and dry spells. In The Bahamas, thin limestone soils, high salinity,
          and limited freshwater create different but equally real challenges. Both regions
          face hurricane seasons that can wipe out a harvest overnight.
        </p>
        <p>
          What Caribbean farmers have always lacked isn't ability — it's actionable intelligence
          to plan smarter, prepare earlier, and connect with buyers on time. That's exactly
          what Soil Sista provides.
        </p>
      </motion.section>

      {/* Four Pillars */}
      <motion.section {...fadeUp(0.3)} style={styles.section}>
        <h2>How We Help</h2>
        <div style={styles.pillarsGrid}>
          {[
            {
              icon: "🗓️",
              title: "Plan",
              desc: "Data-driven crop scheduling built around Caribbean seasons, island-specific soil profiles, and market windows. Know what to plant, how much, and when — before you break ground."
            },
            {
              icon: "📡",
              title: "Monitor",
              desc: "Live weather alerts, crop health reminders, and field condition tracking calibrated to your specific crops and island. Catch problems before they cost you a harvest."
            },
            {
              icon: "🏷️",
              title: "Position",
              desc: "Understand buyer demand, optimal harvest timing, and how to present your produce for hotels, grocers, restaurants, and export markets. Grow what sells."
            },
            {
              icon: "🚚",
              title: "Deliver",
              desc: "Post-harvest guidance, packaging standards, and logistics planning to get your produce from field to buyer in peak condition — on schedule and at the right price."
            },
          ].map((p, i) => (
            <div key={p.title} style={styles.pillar}>
              <div style={styles.pillarIcon}>{p.icon}</div>
              <h3 style={styles.pillarTitle}>{p.title}</h3>
              <p style={styles.pillarDesc}>{p.desc}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Who we serve */}
      <motion.section {...fadeUp(0.35)} style={styles.section}>
        <h2>Who We Serve</h2>
        <div style={styles.farmingTypes}>
          <div style={styles.farmingType}>
            <h4>🌾 Small-Scale & Backyard Farmers</h4>
            <p>
              Free planning tools, weather alerts, and farming resources built for growers
              working smaller plots — whether you're feeding your household or selling at a
              local market.
            </p>
          </div>
          <div style={styles.farmingType}>
            <h4>🏗️ Commercial Farms</h4>
            <p>
              Premium analytics, buyer positioning guidance, and direct WhatsApp consultation
              with agricultural experts who understand the realities of Caribbean farming at scale.
            </p>
          </div>
          <div style={styles.farmingType}>
            <h4>🤝 Co-ops & Farm Groups</h4>
            <p>
              Coordinate planting cycles across multiple farms to meet bulk buyer demand together.
              Soil Sista helps groups plan as one unit while each farm manages its own operation.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Islands */}
      <motion.section {...fadeUp(0.4)} style={styles.section}>
        <h2>Currently Serving</h2>
        <div style={styles.islandsGrid}>
          <div style={styles.islandCard}>
            <div style={styles.islandFlag}>🇦🇬</div>
            <h3>Antigua & Barbuda</h3>
            <p>
              Supporting farmers across Antigua and Barbuda with island-specific soil profiles,
              tropical weather monitoring, and market access guidance for local hotels, grocery
              chains, and export buyers.
            </p>
          </div>
          <div style={styles.islandCard}>
            <div style={styles.islandFlag}>🇧🇸</div>
            <h3>The Bahamas</h3>
            <p>
              From Nassau to Freeport and the Family Islands, supporting Bahamian farmers navigating
              limestone soils, salinity challenges, and the unique conditions of pothole and
              commercial farming across 700 islands.
            </p>
          </div>
        </div>
        <p style={styles.expansionNote}>
          🌍 Expanding to additional Caribbean islands soon.
        </p>
      </motion.section>

      {/* Resilience section */}
      <motion.section {...fadeUp(0.45)} style={styles.section}>
        <h2>Built on Caribbean Resilience</h2>
        <p>
          Caribbean farmers have always adapted — rebuilding after hurricanes, pivoting during
          supply disruptions, and finding ways to grow in soils that most agricultural textbooks
          don't account for. Soil Sista is built in that same spirit.
        </p>
        <p>
          We're not importing a solution from elsewhere and hoping it fits. We're building
          platform intelligence grounded in Caribbean realities — the crops, the weather
          patterns, the soils, and the markets that actually matter here.
        </p>
      </motion.section>

      {/* CTA */}
      <motion.div {...fadeUp(0.5)} style={styles.cta}>
        <Link to="/get-started" style={styles.ctaButton}>
          Get Started Free
        </Link>
        <div style={styles.socialLink}>
          <p>
            Follow us on Instagram:{" "}
            <a
              href="https://www.instagram.com/soilsista.bs/"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.instagramLink}
            >
              @soilsista.bs
            </a>
          </p>
        </div>
      </motion.div>

    </div>
  );
}

const styles = {
  page: {
    padding: "3rem 2rem",
    maxWidth: "1000px",
    margin: "0 auto",
    background: "var(--paper-cream)",
    minHeight: "100vh",
  },
  heroSection: {
    textAlign: "center",
    marginBottom: "3rem",
  },
  title: {
    fontSize: "3rem",
    marginBottom: "0.5rem",
    color: "var(--ink-black)",
    fontFamily: "'Playfair Display', serif",
  },
  tagline: {
    fontSize: "1.2rem",
    color: "#666",
  },
  section: {
    marginBottom: "2.5rem",
    background: "white",
    padding: "2rem",
    borderRadius: "12px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
  },
  pillarsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1.5rem",
    marginTop: "1.5rem",
  },
  pillar: {
    background: "#f9fdf6",
    padding: "1.5rem",
    borderRadius: "10px",
    borderTop: "3px solid var(--soil-green)",
  },
  pillarIcon: {
    fontSize: "2rem",
    marginBottom: "0.5rem",
  },
  pillarTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.15rem",
    color: "var(--ink-black)",
    marginBottom: "0.5rem",
  },
  pillarDesc: {
    color: "#666",
    fontSize: "0.9rem",
    lineHeight: "1.65",
    margin: 0,
  },
  farmingTypes: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "1.5rem",
    marginTop: "1.5rem",
  },
  farmingType: {
    padding: "1.5rem",
    background: "#f0f9f4",
    borderRadius: "8px",
    border: "2px solid var(--soil-green)",
  },
  islandsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "1.5rem",
    marginTop: "1.5rem",
  },
  islandCard: {
    padding: "1.75rem",
    background: "#f9fdf6",
    borderRadius: "10px",
    border: "1px solid #d4edda",
    textAlign: "center",
  },
  islandFlag: {
    fontSize: "3rem",
    marginBottom: "0.75rem",
  },
  expansionNote: {
    textAlign: "center",
    color: "#888",
    fontSize: "0.9rem",
    marginTop: "1.25rem",
    fontStyle: "italic",
  },
  cta: {
    textAlign: "center",
    marginTop: "3rem",
    paddingBottom: "2rem",
  },
  ctaButton: {
    display: "inline-block",
    padding: "1.1rem 3rem",
    background: "var(--soil-green)",
    color: "white",
    textDecoration: "none",
    borderRadius: "12px",
    fontSize: "1.1rem",
    fontWeight: "600",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    marginBottom: "1.5rem",
  },
  socialLink: {
    marginTop: "1.5rem",
  },
  instagramLink: {
    color: "var(--soil-green)",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "1.05rem",
  },
};