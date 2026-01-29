import { Link } from "react-router-dom";
export default function Navbar() {
  return (
    <nav style={styles.nav}>
      <h2>Soil Sista</h2>
      <div style={styles.links}>
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
        <Link to="/onboarding">Get Started</Link>
        <Link to="/contact">Contact</Link>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    padding: "1rem 2rem",
    background: "var(--soil-green)",
    color: "white",
    flexWrap: "wrap"
  },
  links: { display: "flex", gap: "1rem" }
};
