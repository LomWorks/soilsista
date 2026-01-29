import { useState } from "react";
import { motion } from "framer-motion";

export default function MicOrb({ onTranscript }) {
  const [listening, setListening] = useState(false);

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  const startListening = () => {
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      onTranscript(transcript);
    };

    recognition.start();
    setListening(true);
  };

  return (
    <div style={styles.wrapper}>
      <motion.div
        onClick={startListening}
        animate={{
          scale: listening ? [1, 1.2, 1] : [1, 1.05, 1],
          boxShadow: listening
            ? "0 0 30px rgba(127,179,77,0.8)"
            : "0 0 12px rgba(239,168,184,0.5)"
        }}
        transition={{
          repeat: Infinity,
          duration: listening ? 1 : 3,
          ease: "easeInOut"
        }}
        style={styles.orb}
      >
        🎙
      </motion.div>

      <p style={{ marginTop: "1rem" }}>
        {listening ? "Listening to you…" : "Tap and tell Soil Sister your goals"}
      </p>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginTop: "1rem"
  },
  orb: {
    width: 90,
    height: 90,
    borderRadius: "50%",
    background: "var(--soft-pink)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "2rem",
    cursor: "pointer",
    userSelect: "none"
  }
};
