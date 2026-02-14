import { motion } from "framer-motion";

export default function About() {
  return (
    <div style={styles.page}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1 style={styles.title}>About Soil Sista</h1>
        <p style={styles.tagline}>
          Empowering Bahamian Farmers Through Climate-Smart Agriculture
        </p>
      </motion.div>

      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={styles.section}
      >
        <h2>Mission</h2>
        <p>
          Soil Sista blends regional climate data with personal farming goals to guide sustainable growth 
          across The Bahamas and the wider Caribbean. We're building a platform that puts the power 
          of agricultural science, weather intelligence, and soil health knowledge directly into the hands 
          of backyard farmers and small-scale growers.
        </p>
      </motion.section>

      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        style={styles.section}
      >
        <h2>Why This Matters for The Bahamas</h2>
        <p>
          The Bahamas imports nearly 90% of its food, making us extremely vulnerable to supply chain 
          disruptions. Our thin, rocky limestone soils and semi-arid conditions present unique challenges 
          for agriculture. Many of us have lost the traditional farming knowledge that sustained our 
          ancestors through generations.
        </p>
        <p>
          From Nassau to Freeport, from Grand Bahama to Abaco and the Family Islands, Bahamian farmers 
          face challenges with poor soil quality, high salinity, limited freshwater, and the devastating 
          impacts of hurricanes. Yet backyard farming remains our best path toward food security and 
          self-reliance.
        </p>
      </motion.section>

      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        style={styles.section}
      >
        <h2>Our Approach</h2>
        <div style={styles.approachGrid}>
          <div style={styles.approachItem}>
            <div style={styles.approachIcon}>🌦️</div>
            <h3>Climate Intelligence</h3>
            <p>
              Real-time weather data specific to Bahamian micro-climates, helping you plan around 
              hurricanes, rainfall patterns, and seasonal conditions across our 700 islands.
            </p>
          </div>
          
          <div style={styles.approachItem}>
            <div style={styles.approachIcon}>🌱</div>
            <h3>Soil Health Focus</h3>
            <p>
              Understanding our unique limestone-based soils - from "black soils" rich in organic matter 
              to "white soils" that need extra care. We help you work with what you have through 
              composting, raised beds, and pothole farming techniques.
            </p>
          </div>
          
          <div style={styles.approachItem}>
            <div style={styles.approachIcon}>📊</div>
            <h3>Data-Driven Planning</h3>
            <p>
              Automated crop planning for Bahamian staples like cassava, sweet potato, hot peppers, 
              pigeon peas, onions, and coconut - plus guidance on when to rotate crops to preserve 
              precious soil nutrients.
            </p>
          </div>
          
          <div style={styles.approachItem}>
            <div style={styles.approachIcon}>💬</div>
            <h3>Expert Support</h3>
            <p>
              Direct consultation through WhatsApp, connecting you with agricultural expertise 
              that understands the realities of farming in The Bahamas - from backyard gardens 
              to commercial operations.
            </p>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        style={styles.section}
      >
        <h2>Farming Methods We Support</h2>
        <div style={styles.farmingTypes}>
          <div style={styles.farmingType}>
            <h4>🏡 Backyard Farming</h4>
            <p>
              Growing fruits, vegetables, and herbs for household use in your yard. Most Bahamian 
              farmers start here, feeding their families and sharing with neighbors in need.
            </p>
          </div>
          
          <div style={styles.farmingType}>
            <h4>🕳️ Pothole (Subsistence) Farming</h4>
            <p>
              Traditional technique using the natural potholes in limestone rock to grow crops. 
              Grow what you need, sell any extra. A time-tested method for our challenging soils.
            </p>
          </div>
          
          <div style={styles.farmingType}>
            <h4>🚜 Commercial Farming</h4>
            <p>
              Larger operations growing crops and raising livestock for sale. We help optimize your 
              yields while working within the constraints of Bahamian soil and climate.
            </p>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        style={styles.section}
      >
        <h2>Building Food Security Together</h2>
        <p>
          We're inspired by the resilience of Bahamian farmers who've rebuilt after Hurricane Dorian, 
          who've adapted during COVID-19 disruptions, and who continue the faith-based tradition of 
          growing food to share with family and community.
        </p>
        <p>
          Whether you're learning to compost cow manure, building raised beds to work around rocky soil, 
          experimenting with shade houses for lettuce and celery, or managing a small livestock operation, 
          Soil Sista is here to support your journey toward sustainable, productive farming in The Bahamas.
        </p>
        <p>
          Together, we can reduce our dependence on imports, strengthen our food security, and restore 
          the agricultural heritage that once sustained our islands.
        </p>
      </motion.section>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        style={styles.cta}
      >
        <a href="/get-started" style={styles.ctaButton}>
          Get Started Today
        </a>
        <div style={styles.socialLink}>
          <p>Follow us on Instagram: <a href="https://www.instagram.com/soilsista.bs/" target="_blank" rel="noopener noreferrer" style={styles.instagramLink}>@soilsista.bs</a></p>
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
    minHeight: "100vh"
  },
  title: {
    fontSize: "3rem",
    marginBottom: "0.5rem",
    color: "var(--ink-black)",
    textAlign: "center",
    fontFamily: "'Playfair Display', serif"
  },
  tagline: {
    fontSize: "1.3rem",
    color: "#666",
    textAlign: "center",
    marginBottom: "3rem"
  },
  section: {
    marginBottom: "3rem",
    background: "white",
    padding: "2rem",
    borderRadius: "12px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
  },
  approachGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "1.5rem",
    marginTop: "1.5rem"
  },
  approachItem: {
    textAlign: "center"
  },
  approachIcon: {
    fontSize: "3rem",
    marginBottom: "1rem"
  },
  farmingTypes: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "1.5rem",
    marginTop: "1.5rem"
  },
  farmingType: {
    padding: "1.5rem",
    background: "#f0f9f4",
    borderRadius: "8px",
    border: "2px solid var(--soil-green)"
  },
  cta: {
    textAlign: "center",
    marginTop: "3rem"
  },
  ctaButton: {
    display: "inline-block",
    padding: "1.25rem 3rem",
    background: "var(--soil-green)",
    color: "white",
    textDecoration: "none",
    borderRadius: "12px",
    fontSize: "1.1rem",
    fontWeight: "600",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    transition: "transform 0.2s",
    marginBottom: "1.5rem"
  },
  socialLink: {
    marginTop: "1.5rem"
  },
  instagramLink: {
    color: "var(--soil-green)",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "1.1rem"
  }
};