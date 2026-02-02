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
            <div style={styles.infoItem}>
              <span style={styles.infoIcon}>📱</span>
              <span>soilsista.bs</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoIcon}>📱</span>
              <span>WhatsApp: +1 (242) 829-6921</span>
            </div>
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
  infoItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    color: "#666"
  },
  infoIcon: {
    fontSize: "1.2rem"
  }
};