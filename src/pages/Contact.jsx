import { useState } from "react";
import { motion } from "framer-motion";
import { db } from "../firebase";
import { addDoc, collection } from "firebase/firestore";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  const submit = async () => {
    // Validation
    if (!form.name || !form.email || !form.message) {
      alert("Please fill in all fields");
      return;
    }

    setSending(true);

    try {
      // Save to activities collection (Cloud Functions will handle the rest)
      await addDoc(collection(db, "activities"), {
        userId: null, // No userId for contact forms
        type: "contact_message",
        category: "admin",
        title: `Contact from ${form.name}`,
        message: form.message,
        icon: "✉️",
        status: "unread",
        data: {
          senderName: form.name,
          senderEmail: form.email,
          contactType: "contact_form"
        },
        createdAt: new Date(),
        expiresAt: null // Contact messages don't expire
      });

      alert("✅ Message sent! We'll get back to you soon.");
      
      // Clear form
      setForm({ name: "", email: "", message: "" });
      setSending(false);

    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
      setSending(false);
    }
  };

  return (
    <div style={styles.page}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={styles.container}
      >
        <h1 style={styles.title}>Get in Touch</h1>
        <p style={styles.subtitle}>
          Have questions about Soil Sista? We're here to help with your farming needs.
        </p>
        
        <motion.input
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          placeholder="Your Name"
          value={form.name}
          onChange={e => setForm({...form, name: e.target.value})}
          style={styles.input}
        />
        
        <motion.input
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          type="email"
          placeholder="Your Email"
          value={form.email}
          onChange={e => setForm({...form, email: e.target.value})}
          style={styles.input}
        />
        
        <motion.textarea
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          placeholder="How can we help you?"
          value={form.message}
          onChange={e => setForm({...form, message: e.target.value})}
          style={styles.textarea}
        />
        
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          whileHover={{ scale: sending ? 1 : 1.02 }}
          whileTap={{ scale: sending ? 1 : 0.98 }}
          onClick={submit}
          disabled={sending}
          style={{
            ...styles.button,
            opacity: sending ? 0.7 : 1,
            cursor: sending ? "not-allowed" : "pointer"
          }}
        >
          {sending ? "Sending..." : "Send Message"}
        </motion.button>

        <div style={styles.contactInfo}>
          <p style={styles.infoTitle}>Other ways to reach us:</p>
          <div style={styles.infoGrid}>
            <a
              href="https://instagram.com/soilsista.bs"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.socialLink}
            >
              {/* Instagram SVG */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="currentColor" strokeWidth="2" fill="none"/>
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>
              </svg>
              @soilsista.bs
            </a>
            <a
              href="https://wa.me/12428296921"
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...styles.socialLink, color: "#25D366" }}
            >
              {/* WhatsApp SVG */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.528 5.845L.057 23.571a.5.5 0 0 0 .619.608l5.882-1.542A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.94 9.94 0 0 1-5.334-1.549l-.38-.23-3.942 1.034 1.003-3.85-.248-.395A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
              +1 (242) 829-6921
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "2rem",
    background: "var(--paper-cream)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  container: {
    width: "100%",
    maxWidth: "600px",
    background: "white",
    padding: "3rem",
    borderRadius: "16px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
  },
  title: {
    fontSize: "2.5rem",
    marginBottom: "0.5rem",
    color: "var(--ink-black)"
  },
  subtitle: {
    color: "#666",
    marginBottom: "2rem",
    fontSize: "1.1rem"
  },
  input: {
    width: "100%",
    padding: "1rem",
    fontSize: "1rem",
    border: "2px solid #ddd",
    borderRadius: "8px",
    marginBottom: "1rem",
    boxSizing: "border-box",
    transition: "border-color 0.2s"
  },
  textarea: {
    width: "100%",
    padding: "1rem",
    fontSize: "1rem",
    border: "2px solid #ddd",
    borderRadius: "8px",
    minHeight: "150px",
    fontFamily: "inherit",
    marginBottom: "1rem",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
    resize: "vertical"
  },
  button: {
    width: "100%",
    padding: "1rem",
    fontSize: "1rem",
    background: "var(--soil-green)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  contactInfo: {
    marginTop: "2rem",
    padding: "1.5rem",
    background: "#f9f9f9",
    borderRadius: "8px"
  },
  infoTitle: {
    fontWeight: "600",
    marginBottom: "1rem",
    color: "var(--ink-black)"
  },
  infoGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem"
  },
  socialLink: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    color: "var(--ink-black)",
    textDecoration: "none",
    fontWeight: "500",
    fontSize: "0.95rem",
    transition: "opacity 0.2s"
  }
};