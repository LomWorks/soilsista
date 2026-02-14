import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

export default function MicOrb({ onTranscript, placeholder = "Tap to speak..." }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);
  const isManualStop = useRef(false);

  // Detect if user is on mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError("Voice input not supported in this browser. Please use Chrome, Safari, or Edge.");
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    
    // CRITICAL FIX: Different settings for mobile vs desktop
    if (isMobile) {
      // Mobile-optimized settings
      recognitionRef.current.continuous = false; // iOS requires false
      recognitionRef.current.interimResults = true; // Show live results
      recognitionRef.current.maxAlternatives = 1; // Reduce processing
    } else {
      // Desktop settings - can use continuous
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.maxAlternatives = 3;
    }
    
    // Language: en-US works best for Caribbean English
    recognitionRef.current.lang = 'en-US';
    
    recognitionRef.current.onstart = () => {
      console.log('Speech recognition started');
      setListening(true);
      setError("");
      isManualStop.current = false;
    };
    
    recognitionRef.current.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
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
      
      // Handle different error types
      switch(event.error) {
        case 'no-speech':
          if (isMobile) {
            setError('No speech detected. Tap the orb to try again.');
          } else {
            setError('No speech detected. Please try again.');
          }
          break;
        case 'audio-capture':
          setError('No microphone found. Please check your device.');
          break;
        case 'not-allowed':
          setError('Microphone permission denied. Please enable it in browser settings.');
          break;
        case 'network':
          setError('Network error. Check your internet connection.');
          break;
        case 'aborted':
          // User manually stopped - this is normal
          break;
        default:
          setError(`Error: ${event.error}`);
      }
      
      // Only stop if it's a real error (not user action)
      if (event.error !== 'aborted') {
        setListening(false);
      }
    };

    recognitionRef.current.onend = () => {
      console.log('Speech recognition ended');
      
      // CRITICAL FIX FOR MOBILE:
      // Only restart if:
      // 1. User is still supposed to be listening
      // 2. They didn't manually stop
      // 3. We're on mobile (iOS auto-stops after ~60 seconds)
      
      if (listening && !isManualStop.current && isMobile) {
        // On mobile, recognition stops automatically
        // So we just update the state without restarting
        setListening(false);
      } else if (listening && !isManualStop.current && !isMobile) {
        // On desktop, try to restart for continuous mode
        setTimeout(() => {
          if (listening && recognitionRef.current && !isManualStop.current) {
            try {
              recognitionRef.current.start();
            } catch (error) {
              console.log('Could not restart recognition:', error.message);
              setListening(false);
            }
          }
        }, 100);
      } else {
        setListening(false);
      }
    };

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Already stopped
        }
      }
    };
  }, [listening, onTranscript, isMobile]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (listening) {
      // Stop listening
      isManualStop.current = true;
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
      setListening(false);
    } else {
      // Start listening
      setTranscript("");
      setError("");
      isManualStop.current = false;
      
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        
        if (error.message && error.message.includes('already started')) {
          // Recognition is already running
          setListening(true);
        } else {
          setError('Could not start microphone. Please try again.');
        }
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
            <li>{isMobile ? 'Hold phone 6-8 inches from mouth' : 'Speak into your microphone'}</li>
            <li>Pause briefly between sentences</li>
            {isMobile && (
              <li>
                {isIOS 
                  ? "On iPhone: Tap again after speaking to finish"
                  : "On mobile: Recording may stop automatically after speaking"
                }
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
    WebkitTapHighlightColor: "transparent", // Remove tap highlight on mobile
    touchAction: "manipulation" // Prevent double-tap zoom on iOS
  },
  icon: {
    display: "block",
    pointerEvents: "none" // Prevent icon from intercepting clicks
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