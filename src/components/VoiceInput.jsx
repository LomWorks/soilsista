import { useState } from "react";

export default function VoiceInput({ setText }) {
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
      setText(transcript);
    };

    recognition.start();
    setListening(true);
  };

  return (
    <button onClick={startListening} style={styles.mic}>
      {listening ? "🎤 Listening..." : "🎙 Speak"}
    </button>
  );
}

const styles = {
  mic: {
    padding: "1rem",
    borderRadius: "50%",
    background: "var(--soft-pink)",
    border: "none",
    fontSize: "1.2rem",
    cursor: "pointer"
  }
};
