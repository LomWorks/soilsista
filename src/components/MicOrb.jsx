import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

export default function MicOrb({ onTranscript, placeholder = "Tap to speak..." }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");

  // Use refs for values needed inside event handlers to avoid stale closures
  const recognitionRef = useRef(null);
  const isManualStop = useRef(false);
  const listeningRef = useRef(false); // mirror of listening state for use inside callbacks
  const onTranscriptRef = useRef(onTranscript); // ref so the setup effect always calls the latest callback

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Keep refs in sync with latest props/state
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  // ✅ FIX: Setup runs ONCE on mount only — no [listening] dependency
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Voice input not supported in this browser. Please use Chrome, Safari, or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();

    if (isMobile) {
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
    } else {
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
    }

    recognition.lang = "en-US";

    recognition.onstart = () => {
      console.log("Speech recognition started");
      isManualStop.current = false;
      setListening(true);
      setError("");
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalTranscript += text + " ";
        } else {
          interimTranscript += text;
        }
      }

      // ✅ FIX: Only show interim locally — only send FINAL text to parent
      const displayText = finalTranscript || interimTranscript;
      setTranscript(displayText);

      if (finalTranscript) {
        onTranscriptRef.current(finalTranscript.trim());
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);

      switch (event.error) {
        case "no-speech":
          setError(isMobile
            ? "No speech detected. Tap the orb to try again."
            : "No speech detected. Please try again.");
          break;
        case "audio-capture":
          setError("No microphone found. Please check your device.");
          break;
        case "not-allowed":
          setError("Microphone permission denied. Please enable it in browser settings.");
          break;
        case "network":
          setError("Network error. Check your internet connection.");
          break;
        case "aborted":
          // User manually stopped — normal, do nothing
          break;
        default:
          setError(`Error: ${event.error}`);
      }

      if (event.error !== "aborted") {
        setListening(false);
      }
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");

      // ✅ FIX: Use ref instead of stale state
      if (listeningRef.current && !isManualStop.current && !isMobile) {
        // Desktop continuous mode: restart
        setTimeout(() => {
          if (listeningRef.current && !isManualStop.current) {
            try {
              recognition.start();
            } catch (e) {
              console.log("Could not restart recognition:", e.message);
              setListening(false);
            }
          }
        }, 100);
      } else {
        setListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch (e) {
        // Already stopped
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally runs once — isMobile never changes, onTranscript accessed via ref

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (listeningRef.current) {
      isManualStop.current = true;
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Error stopping recognition:", e);
      }
      setListening(false);
    } else {
      setTranscript("");
      setError("");
      isManualStop.current = false;
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Error starting recognition:", e);
        if (e.message && e.message.includes("already started")) {
          setListening(true);
        } else {
          setError("Could not start microphone. Please try again.");
        }
      }
    }
  }, []);

  return (
    <div style={styles.wrapper}>
      <motion.div
        onClick={toggleListening}
        animate={{
          scale: listening ? [1, 1.15, 1] : [1, 1.05, 1],
          boxShadow: listening
            ? [
                "0 0 20px rgba(127,179,77,0.6)",
                "0 0 40px rgba(127,179,77,0.8)",
                "0 0 20px rgba(127,179,77,0.6)"
              ]
            : [
                "0 0 10px rgba(90,159,110,0.3)",
                "0 0 15px rgba(90,159,110,0.5)",
                "0 0 10px rgba(90,159,110,0.3)"
              ]
        }}
        transition={{
          repeat: Infinity,
          duration: listening ? 1.2 : 2.5,
          ease: "easeInOut"
        }}
        style={{
          ...styles.orb,
          background: listening
            ? "linear-gradient(135deg, var(--soil-green) 0%, var(--deep-leaf) 100%)"
            : "linear-gradient(135deg, var(--deep-leaf) 0%, var(--soil-green) 100%)"
        }}
      >
        <motion.span
          animate={{ scale: listening ? [1, 1.2, 1] : 1 }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          style={styles.icon}
        >
          {listening ? "🎤" : "🎙️"}
        </motion.span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={styles.statusText}
      >
        {listening ? (
          <span style={styles.listeningText}>
            🟢 Listening... {isMobile ? "Speak now" : "Tap to stop"}
          </span>
        ) : (
          placeholder
        )}
      </motion.p>

      {transcript && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.transcriptBox}
        >
          <p style={styles.transcriptLabel}>You said:</p>
          <p style={styles.transcriptText}>{transcript}</p>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.errorBox}
        >
          <p style={styles.errorIcon}>⚠️</p>
          <p style={styles.errorText}>{error}</p>
        </motion.div>
      )}

      {!error && (
        <div style={styles.tips}>
          <p style={styles.tipTitle}>💡 Tips for best results:</p>
          <ul style={styles.tipList}>
            <li>Speak clearly and at a normal pace</li>
            <li>Reduce background noise</li>
            <li>{isMobile ? "Hold phone 6-8 inches from mouth" : "Speak into your microphone"}</li>
            <li>Pause briefly between sentences</li>
            {isMobile && (
              <li>
                {isIOS
                  ? "On iPhone: Tap again after speaking to finish"
                  : "On mobile: Recording may stop automatically after speaking"}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginTop: "1.5rem",
    marginBottom: "1.5rem",
    padding: "1rem"
  },
  orb: {
    width: 120,
    height: 120,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "3rem",
    cursor: "pointer",
    userSelect: "none",
    border: "3px solid var(--soil-green)",
    transition: "all 0.3s ease",
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation"
  },
  icon: {
    display: "block",
    pointerEvents: "none"
  },
  statusText: {
    marginTop: "1.5rem",
    fontSize: "1rem",
    color: "var(--ink-black)",
    textAlign: "center",
    fontWeight: "500"
  },
  listeningText: {
    color: "var(--soil-green)",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    flexWrap: "wrap"
  },
  transcriptBox: {
    marginTop: "1.5rem",
    padding: "1rem",
    background: "#f0f9f4",
    borderRadius: "8px",
    border: "2px solid var(--soil-green)",
    width: "100%",
    maxWidth: "500px"
  },
  transcriptLabel: {
    fontSize: "0.85rem",
    color: "var(--deep-leaf)",
    fontWeight: "600",
    marginBottom: "0.5rem"
  },
  transcriptText: {
    fontSize: "1rem",
    color: "var(--ink-black)",
    lineHeight: "1.6",
    margin: 0
  },
  errorBox: {
    marginTop: "1.5rem",
    padding: "1rem",
    background: "#fef2f2",
    borderRadius: "8px",
    border: "2px solid #ef4444",
    width: "100%",
    maxWidth: "500px",
    textAlign: "center"
  },
  errorIcon: {
    fontSize: "2rem",
    margin: "0 0 0.5rem 0"
  },
  errorText: {
    fontSize: "0.9rem",
    color: "#dc2626",
    margin: 0,
    lineHeight: "1.5"
  },
  tips: {
    marginTop: "2rem",
    padding: "1rem",
    background: "#fffbf0",
    borderRadius: "8px",
    border: "1px solid var(--sun-mustard)",
    maxWidth: "500px",
    width: "100%"
  },
  tipTitle: {
    fontSize: "0.9rem",
    fontWeight: "600",
    color: "var(--ink-black)",
    marginBottom: "0.5rem"
  },
  tipList: {
    fontSize: "0.85rem",
    color: "#666",
    paddingLeft: "1.5rem",
    margin: 0,
    lineHeight: "1.8"
  }
};