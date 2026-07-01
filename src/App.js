import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import EnhancedOnboarding from "./pages/EnhancedOnboarding";
import GrowerDashboard from "./pages/GrowerDashboard";
import AdminPanel from "./pages/Adminpanel";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Navbar from "./components/Navbar";
import NotFound from "./pages/NotFound";
import SessionGuard from "./components/SessionGuard";
import "./index.css";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/"            element={<Home />} />
        <Route path="/about"       element={<About />} />
        <Route path="/contact"     element={<Contact />} />
        <Route path="/get-started" element={<EnhancedOnboarding />} />
        <Route path="/dashboard"   element={<SessionGuard><GrowerDashboard /></SessionGuard>} />
        <Route path="/profile"     element={<SessionGuard><Profile /></SessionGuard>} />
        <Route path="/login"       element={<Login />} />
        <Route path="/admin"       element={<AdminPanel />} />
        <Route path="*"            element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
