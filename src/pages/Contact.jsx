import { useState } from "react";
import { motion } from "framer-motion";
import { db } from "../firebase";
import { addDoc, collection } from "firebase/firestore";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const submit = async () => {
    await addDoc(collection(db, "contactMessages"), form);
    alert("Message sent");
  };

  return (
    <div style={styles.page}>
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        Contact
      </motion.h1>
      
      <motion.input
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        placeholder="Name"
        onChange={e=>setForm({...form,name:e.target.value})}
        style={styles.input}
      />
      
      <motion.input
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        placeholder="Email"
        onChange={e=>setForm({...form,email:e.target.value})}
        style={styles.input}
      />
      
      <motion.textarea
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        placeholder="Message"
        onChange={e=>setForm({...form,message:e.target.value})}
        style={styles.textarea}
      />
      
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={submit}
        style={styles.button}
      >
        Send
      </motion.button>
    </div>
  );
}

const styles = {
  page: {
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    maxWidth: "600px",
    margin: "0 auto"
  },
  input: {
    padding: "0.75rem",
    fontSize: "1rem",
    border: "1px solid #ddd",
    borderRadius: "8px"
  },
  textarea: {
    padding: "0.75rem",
    fontSize: "1rem",
    border: "1px solid #ddd",
    borderRadius: "8px",
    minHeight: "150px",
    fontFamily: "inherit"
  },
  button: {
    padding: "1rem",
    fontSize: "1rem",
    background: "var(--soil-green)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer"
  }
};