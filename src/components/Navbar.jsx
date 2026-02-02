// I need the links to be viewable once pressed. 
import { Link } from "react-router-dom";
import '../components/logo192.png'
export default function Navbar() {
  return (
    <nav style={styles.nav}>
      <Link to="/">
     
           <img src="logo192.png" className="logo"/>
    
      </Link>
      <div style={styles.links}>
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
        <Link to="/get-started">Get Started</Link>
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
    height: "auto", 
    width: "0.2 rem"
  },
  links: { 
    display: "flex", 
    gap: "1.5rem",
    flexWrap: "wrap"
  }
};