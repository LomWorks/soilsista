import { useState } from "react";
import MicOrb from "./MicOrb"; // Make sure this path is correct

export default function VoiceInput({ setText }) {
  const [listening, setListening] = useState(false);

  return (
    <div style={styles.container}>
      <MicOrb
        onTranscript={(transcript) => setText(transcript)}
        placeholder={listening ? "🟢 Listening... Tap again to stop" : "Tap to speak"}
      />
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.75rem",
    margin: "1rem 0",
    width: "100%",
    maxWidth: "200px"
  }
};
