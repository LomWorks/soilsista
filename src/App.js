import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import EnhancedOnboarding from "./pages/EnhancedOnboarding";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/Adminpanel";
import Login from "./pages/Login"
import Navbar from "./components/Navbar";
import "./index.css";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/get-started" element={<EnhancedOnboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/login" element={<Login />} /> 
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Router>
  );
}

export default App;