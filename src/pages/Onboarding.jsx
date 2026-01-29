import React, { useState } from "react";
import { db } from "../firebase";
import { addDoc, collection } from "firebase/firestore";
import MicOrb from "../components/MicOrb";

export default function Onboarding() {
  const [data, setData] = useState({
    name: "",
    location: "",
    goals: ""
  });

  const submit = async () => {
    if (!data.name || !data.location) {
      alert("Please fill out your name and location.");
      return;
    }

    try {
      await addDoc(collection(db, "onboardingProfiles"), {
        ...data,
        createdAt: new Date()
      });
      alert("Profile saved!");
      setData({ name: "", location: "", goals: "" });
    } catch (err) {
      console.error("Firestore error:", err);
      alert("Error saving data.");
    }
  };

  return (
    <div style={styles.page}>
      <h1>Tell Soil Sister About You</h1>

      <label>Name</label>
      <input 
        placeholder="Your name"
        value={data.name}
        onChange={e => setData({ ...data, name: e.target.value })}
      />

      <label>Location</label>
      <input 
        placeholder="City / Region"
        value={data.location}
        onChange={e => setData({ ...data, location: e.target.value })}
      />

      <label>Your Goals</label>
      <textarea 
        placeholder="Describe what you want to grow or achieve..."
        value={data.goals}
        onChange={e => setData({ ...data, goals: e.target.value })}
        rows={4}
      />

      {/* 🎙 Animated Mic Orb */}
      <MicOrb onTranscript={(text) => setData({ ...data, goals: text })} />

      <button onClick={submit} style={styles.button}>Submit</button>
    </div>
  );
}

const styles = {
  page: {
    padding: "2rem",
    maxWidth: "600px",
    margin: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem"
  },
  button: {
    marginTop: "1rem",
    padding: "0.9rem",
    borderRadius: "10px",
    border: "none",
    background: "var(--soil-green)",
    color: "white",
    fontWeight: "600",
    cursor: "pointer"
  }
};
