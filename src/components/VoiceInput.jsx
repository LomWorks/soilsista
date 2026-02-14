import MicOrb from "./MicOrb"; 

export default function VoiceInput({ setText }) {
  return (
    <div style={styles.container}>
      <MicOrb
        onTranscript={(transcript) => setText(transcript)}
        placeholder="Tap to speak"
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
    margin: "1rem auto",
    justifyContent: "center", 
    width: "100%",
  }
};