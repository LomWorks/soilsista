import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

export default function MicOrb({ onTranscript, placeholder = "Tap to speak..." }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      
      // Enhanced settings for better accuracy with Caribbean accents
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.maxAlternatives = 3; // Get multiple alternatives
      
      // Try to detect Caribbean English variants
      // en-US works best for Caribbean English (better than en-GB)
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          
          // Get the most confident result
          const transcriptText = result[0].transcript;
          
          if (result.isFinal) {
            finalTranscript += transcriptText + ' ';
          } else {
            interimTranscript += transcriptText;
          }
        }

        const fullTranscript = finalTranscript || interimTranscript;
        setTranscript(fullTranscript);
        onTranscript(fullTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          // Restart if no speech detected
          console.log('No speech detected, keep listening...');
        } else if (event.error === 'aborted') {
          setListening(false);
        } else {
          setListening(false);
          alert(`Speech recognition error: ${event.error}`);
        }
      };

      recognitionRef.current.onend = () => {
        // Auto-restart if still supposed to be listening
        if (listening && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (error) {
            console.log('Recognition already started');
          }
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [listening, onTranscript]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (listening) {
      // Stop listening
      recognitionRef.current.stop();
      setListening(false);
    } else {
      // Start listening
      setTranscript("");
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch (error) {
        console.error('Error starting recognition:', error);
      }
    }
  };

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
          animate={{
            scale: listening ? [1, 1.2, 1] : 1
          }}
          transition={{
            repeat: Infinity,
            duration: 0.8
          }}
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
            🟢 Listening... Tap again to stop
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

      <div style={styles.tips}>
        <p style={styles.tipTitle}>💡 Tips for best results:</p>
        <ul style={styles.tipList}>
          <li>Speak clearly and at a normal pace</li>
          <li>Reduce background noise</li>
          <li>Hold phone/device 6-8 inches from mouth</li>
          <li>Pause briefly between sentences</li>
        </ul>
      </div>
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
    transition: "all 0.3s ease"
  },
  icon: {
    display: "block"
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
    gap: "0.5rem"
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