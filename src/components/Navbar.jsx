import { Link, useLocation } from "react-router-dom";
import logo from '../components/logo192.png';

export default function Navbar() {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.logoLink}>
        <img src={logo} alt="Soil Sista Logo" style={styles.logo} />
      </Link>
      
      <div style={styles.links}>
        <Link 
          to="/" 
          style={{
            ...styles.link,
            ...(isActive('/') ? styles.linkActive : {})
          }}
        >
          Home
        </Link>
        <Link
          to="/login"
          >
            Sign In
          </Link>
        <Link 
          to="/about" 
          style={{
            ...styles.link,
            ...(isActive('/about') ? styles.linkActive : {})
          }}
        >
          About
        </Link>
        <Link 
          to="/contact" 
          style={{
            ...styles.link,
            ...(isActive('/contact') ? styles.linkActive : {})
          }}
        >
          Contact
        </Link>
        <Link 
          to="/get-started" 
          style={{
            ...styles.link,
            ...(isActive('/get-started') ? styles.linkActive : {})
          }}
        >
          Get Started
        </Link>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: "flex",
    flexDirection: "column", // Stack vertically on mobile
    alignItems: "center",
    padding: "1rem 2rem",
    background: "var(--soil-green)",
    color: "white",
    gap: "1rem"
  },
  logoLink: {
    display: "flex",
    alignItems: "center"
  },
  logo: {
    height: "5rem",
    width: "5rem",
    objectFit: "contain"
  },
  links: { 
    display: "flex", 
    gap: "1.5rem",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center" // Center links on mobile
  },
  link: {
    color: "white",
    textDecoration: "none",
    fontWeight: "500",
    padding: "0.5rem 1rem",
    borderRadius: "6px",
    transition: "all 0.2s"
  },
  linkActive: {
    background: "rgba(255, 255, 255, 0.2)",
    fontWeight: "600"
  }
};