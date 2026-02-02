import { useState, useRef } from "react";
import { motion } from "framer-motion";

export default function VoiceInput({ setText }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  const startListening = () => {
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    // Enhanced settings for better Caribbean accent recognition
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US'; // Works best for Caribbean English
    recognition.maxAlternatives = 3;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setText(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        console.log('No speech detected');
      } else {
        setListening(false);
        alert(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setListening(false);
    };

    try {
      recognition.start();
      setListening(true);
    } catch (error) {
      console.error('Error starting recognition:', error);
      setListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
    }
  };

  return (
    <div style={styles.container}>
      <motion.button
        onClick={listening ? stopListening : startListening}
        animate={{
          scale: listening ? [1, 1.05, 1] : 1
        }}
        transition={{
          repeat: listening ? Infinity : 0,
          duration: 1.5
        }}
        style={{
          ...styles.mic,
          background: listening 
            ? "linear-gradient(135deg, var(--soil-green), var(--deep-leaf))" 
            : "var(--soft-pink)"
        }}
      >
        {listening ? "🎤" : "🎙️"}
      </motion.button>
      
      <p style={styles.status}>
        {listening ? (
          <span style={styles.listeningText}>🟢 Listening... Tap to stop</span>
        ) : (
          "Tap to speak"
        )}
      </p>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.75rem",
    margin: "1rem 0"
  },
  mic: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    border: "3px solid var(--soil-green)",
    fontSize: "2rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    transition: "all 0.3s ease"
  },
  status: {
    fontSize: "0.9rem",
    color: "#666",
    textAlign: "center",
    fontWeight: "500"
  },
  listeningText: {
    color: "var(--soil-green)",
    fontWeight: "600"
  }
};