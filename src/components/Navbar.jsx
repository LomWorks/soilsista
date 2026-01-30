import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.logo}>
        <h2>🌱 Soil Sista</h2>
      </Link>
      <div style={styles.links}>
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
        <Link to="/get-started">Get Started</Link>
        <Link to="/contact">Contact</Link>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 2rem",
    background: "var(--soil-green)",
    color: "white",
    flexWrap: "wrap"
  },
  logo: {
    textDecoration: "none",
    color: "white"
  },
  links: { 
    display: "flex", 
    gap: "1.5rem",
    flexWrap: "wrap"
  }
};