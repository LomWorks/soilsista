import React, { useState } from "react";
import { db, auth } from "../firebase";
import { doc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import LoadingScreen from "../components/LoadingScreen";
import VoiceInput from "../components/VoiceInput";

export default function EnhancedOnboarding() {
  const [step, setStep] = useState(0);
  const [planType, setPlanType] = useState(null); // 'free' or 'paid'
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [freeData, setFreeData] = useState({
    name: "",
    farmSize: "",
    growingSites: [],
    terrain: "",
    waterSources: [],
    farmingType: "",
    crops: [],
    cropDiversity: "",
    pestControl: [],
    diseases: [],
    location: { island: "", settlement: "" }
  });

  const [paidData, setPaidData] = useState({
    name: "",
    island: "",
    settlement: "",
    phone: "",
    currentIssue: ""
  });

  // ===== Helper: Create Firebase User =====
  const createFirebaseUser = async () => {
    if (!email || !password) throw new Error("Please provide email and password");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user.uid;
  };

  // ===== Submit Free Version =====
  const submitFreeVersion = async () => {
    try {
      setLoading(true);
      const userId = await createFirebaseUser();

      await setDoc(doc(db, "users", userId), {
        userId,
        email,
        name: freeData.name,
        planType: "free",
        accountStatus: "active",
        onboardingComplete: true,
        location: freeData.location,
        farmSize: freeData.farmSize,
        growingSites: freeData.growingSites,
        terrain: freeData.terrain,
        waterSources: freeData.waterSources,
        farmingType: freeData.farmingType,
        currentCrops: freeData.crops,
        cropDiversity: freeData.cropDiversity,
        pestControl: freeData.pestControl,
        diseases: freeData.diseases,
        stats: { cropsPlanted: 0, cropsHarvested: 0, lastActive: new Date() },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, "activities"), {
        userId,
        type: "notification",
        category: "system",
        title: "Welcome to Soil Sista! 🌱",
        message: "Your farm profile is all set up. Start planning your crops in the dashboard!",
        icon: "🎉",
        status: "unread",
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      setLoading(false);
      alert("Welcome to Soil Sista! Your dashboard is ready.");
      window.location.href = "/dashboard";
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert(err.message || "Error creating account");
    }
  };

  // ===== Submit Paid Version =====
  const submitPaidVersion = async () => {
    try {
      setLoading(true);
      const userId = await createFirebaseUser();

      await setDoc(doc(db, "users", userId), {
        userId,
        email,
        name: paidData.name,
        planType: "paid",
        accountStatus: "active",
        onboardingComplete: true,
        location: { island: paidData.island, settlement: paidData.settlement },
        phone: paidData.phone,
        currentIssue: paidData.currentIssue,
        consultationStatus: "pending",
        stats: { cropsPlanted: 0, cropsHarvested: 0, lastActive: new Date() },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, "activities"), {
        userId,
        type: "consultation",
        category: "support",
        title: "New Consultation Request",
        message: `${paidData.name} from ${paidData.island} needs farming support.`,
        icon: "💬",
        status: "pending",
        data: {
          userName: paidData.name,
          userPhone: paidData.phone,
          userLocation: { island: paidData.island, settlement: paidData.settlement },
          issue: paidData.currentIssue || "General consultation",
          consultationType: "paid"
        },
        createdAt: serverTimestamp()
      });

      setLoading(false);
      alert("Profile created! You'll receive a WhatsApp message within 24 hours.");
      window.location.href = "/dashboard";
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert(err.message || "Error creating account");
    }
  };

  if (loading) return <LoadingScreen />;

  // ===== Step Components =====
  const freeSteps = [
    <AccountSetup email={email} setEmail={setEmail} password={password} setPassword={setPassword} key={0} />, 
    <BasicInfo data={freeData} setData={setFreeData} key={1} />,
    <FarmSize data={freeData} setData={setFreeData} key={2} />,
    <FarmingType data={freeData} setData={setFreeData} key={3} />,
    <CropsInfo data={freeData} setData={setFreeData} key={4} />,
    <PestControl data={freeData} setData={setFreeData} key={5} />,
    <DiseasesInfo data={freeData} setData={setFreeData} key={6} />
  ];

  // ===== Render =====
  if (planType === null) return <PlanSelection setPlanType={setPlanType} />;

  if (planType === "free") return (
    <div style={styles.page}>
      <ProgressBar current={step} total={freeSteps.length} />
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={styles.formContainer}
        >
          {freeSteps[step]}
        </motion.div>
      </AnimatePresence>

      <div style={styles.navigation}>
        {step > 0 && <button onClick={() => setStep(step - 1)} style={styles.backButton}>← Back</button>}
        {step < freeSteps.length - 1 ? 
          <button onClick={() => setStep(step + 1)} style={styles.nextButton}>Next →</button> :
          <button onClick={submitFreeVersion} style={styles.submitButton}>Complete Setup</button>
        }
      </div>
    </div>
  );

  if (planType === "paid") return (
    <PaidForm
      email={email} setEmail={setEmail}
      password={password} setPassword={setPassword}
      data={paidData} setData={setPaidData}
      submit={submitPaidVersion}
    />
  );

  return null;
}

// ===== Components: Plan Selection =====
function PlanSelection({ setPlanType }) {
  return (
    <div style={styles.page}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} style={styles.planSelection}>
        <h1>Welcome to Soil Sista</h1>
        <p style={styles.subtitle}>Choose your consultation plan</p>
        <div style={styles.planCards}>
          <motion.div whileHover={{ scale: 1.02 }} onClick={() => setPlanType("free")} style={styles.planCard}>
            <h2>🌱 Free Self-Serve</h2>
            <ul style={styles.featureList}>
              <li>✓ Complete farm data setup</li>
              <li>✓ Real-time climate data</li>
              <li>✓ Automated planning tools</li>
              <li>✓ Educational resources</li>
              <li>✓ Weather alerts</li>
            </ul>
            <button style={styles.selectButton}>Get Started Free</button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} onClick={() => setPlanType("paid")} style={{ ...styles.planCard, ...styles.paidCard }}>
            <div style={styles.badge}>PREMIUM</div>
            <h2>💬 WhatsApp Consultation</h2>
            <ul style={styles.featureList}>
              <li>✓ 60-second quick setup</li>
              <li>✓ Direct WhatsApp support</li>
              <li>✓ Real-time expert advice</li>
              <li>✓ Proactive weather alerts</li>
              <li>✓ Photo-based diagnostics</li>
            </ul>
            <button style={{ ...styles.selectButton, ...styles.paidButton }}>Start Premium</button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

// ===== Components: Paid Form =====
function PaidForm({ email, setEmail, password, setPassword, data, setData, submit }) {
  return (
    <div style={styles.page}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} style={styles.quickForm}>
        <h1>Quick Setup (60 seconds)</h1>
        <p style={styles.subtitle}>We'll gather more details through WhatsApp</p>
        <label style={styles.label}>Email</label>
        <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} />

        <label style={styles.label}>Password</label>
        <input type="password" placeholder="Create a password" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} />

        <label style={styles.label}>Your Name</label>
        <input placeholder="Full name" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} style={styles.input} />

        <label style={styles.label}>Island</label>
           <select value={data.island} onChange={e => setData({ ...data, island: e.target.value })} style={styles.input}>
             <option value="">Select island</option>
             {caribbeanIslands.map(island => (
               <option key={island} value={island}>{island}</option>
             ))}
             </select>

        <label style={styles.label}>Settlement/Area</label>
        <input placeholder="e.g., St. John's, Codrington" value={data.settlement} onChange={e => setData({ ...data, settlement: e.target.value })} style={styles.input} />

        <label style={styles.label}>WhatsApp Phone Number</label>
        <input type="tel" placeholder="+1 242 XXX XXXX" value={data.phone} onChange={e => setData({ ...data, phone: e.target.value })} style={styles.input} />

        <label style={styles.label}>Current Issue (Optional)</label>
        <textarea placeholder="Brief description of what you need help with..." value={data.currentIssue} onChange={e => setData({ ...data, currentIssue: e.target.value })} rows={3} style={styles.textarea} />

        <VoiceInput setText={(text) => setData(prev => ({ ...prev, currentIssue: prev.currentIssue + ' ' + text }))} />

        <button onClick={submit} style={styles.submitButton}>Complete Setup</button>
        <p style={styles.disclaimer}>💬 You'll receive a WhatsApp message within 24 hours to begin your consultation</p>
      </motion.div>
    </div>
  );
}

// ===== Progress Bar =====
function ProgressBar({ current, total }) {
  return (
    <div style={styles.progressContainer}>
      <div style={styles.progressBar}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${((current + 1) / total) * 100}%` }} transition={{ duration: 0.3 }} style={styles.progressFill} />
      </div>
      <p style={styles.progressText}>Step {current + 1} of {total}</p>
    </div>
  );
}

// ===== Styles =====
const styles = {
  page: {
    minHeight: "100vh",
    padding: "2rem 1rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "var(--paper-cream)"
  },
  planSelection: {
    maxWidth: "1200px",
    width: "100%",
    textAlign: "center"
  },
  subtitle: {
    color: "#666",
    fontSize: "1.1rem",
    marginBottom: "2rem"
  },
  planCards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "2rem",
    marginTop: "2rem"
  },
  planCard: {
    background: "white",
    padding: "2rem",
    borderRadius: "16px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    cursor: "pointer",
    transition: "all 0.3s ease",
    position: "relative",
    border: "2px solid transparent"
  },
  paidCard: {
    border: "2px solid var(--soil-green)"
  },
  badge: {
    position: "absolute",
    top: "-12px",
    right: "20px",
    background: "var(--soil-green)",
    color: "white",
    padding: "0.25rem 0.75rem",
    borderRadius: "20px",
    fontSize: "0.8rem",
    fontWeight: "bold"
  },
  featureList: {
    textAlign: "left",
    listStyle: "none",
    padding: 0,
    margin: "1.5rem 0",
    lineHeight: "2"
  },
  selectButton: {
    width: "100%",
    padding: "1rem",
    background: "var(--soil-green)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  paidButton: {
    background: "var(--deep-leaf)"
  },
  progressContainer: {
    width: "100%",
    maxWidth: "600px",
    marginBottom: "2rem"
  },
  progressBar: {
    width: "100%",
    height: "8px",
    background: "#e0e0e0",
    borderRadius: "4px",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    background: "var(--soil-green)",
    transition: "width 0.3s ease"
  },
  progressText: {
    textAlign: "center",
    marginTop: "0.5rem",
    color: "#666",
    fontSize: "0.9rem"
  },
  formContainer: {
    width: "100%",
    maxWidth: "600px",
    background: "white",
    padding: "2rem",
    borderRadius: "16px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
  },
  stepContent: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem"
  },
  label: {
    fontWeight: "600",
    color: "var(--ink-black)",
    marginTop: "1rem"
  },
  smallLabel: {
    fontSize: "0.9rem",
    marginRight: "0.5rem"
  },
  input: {
    width: "100%",
    padding: "0.75rem",
    fontSize: "1rem",
    border: "1px solid #ddd",
    borderRadius: "8px",
    boxSizing: "border-box"
  },
  textarea: {
    width: "100%",
    padding: "0.75rem",
    fontSize: "1rem",
    border: "1px solid #ddd",
    borderRadius: "8px",
    boxSizing: "border-box",
    fontFamily: "inherit",
    resize: "vertical"
  },
  locationGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem"
  },
  buttonGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: "0.75rem"
  },
  optionButton: {
    padding: "0.75rem",
    background: "white",
    border: "2px solid #ddd",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s",
    fontSize: "0.9rem"
  },
  optionButtonActive: {
    background: "var(--soil-green)",
    color: "white",
    borderColor: "var(--soil-green)"
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1rem"
  },
  selectionCard: {
    padding: "1.5rem",
    background: "white",
    border: "2px solid #ddd",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.2s",
    textAlign: "center"
  },
  selectionCardActive: {
    borderColor: "var(--soil-green)",
    background: "#f0f9f4"
  },
  cardEmoji: {
    fontSize: "3rem",
    marginBottom: "0.5rem"
  },
  cardDescription: {
    fontSize: "0.85rem",
    color: "#666",
    marginTop: "0.5rem"
  },
  addItemContainer: {
    display: "flex",
    gap: "0.5rem"
  },
  addButton: {
    padding: "0.75rem 1.5rem",
    background: "var(--soil-green)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontWeight: "600"
  },
  tagContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    marginTop: "1rem"
  },
  tag: {
    background: "var(--soil-green)",
    color: "white",
    padding: "0.5rem 1rem",
    borderRadius: "20px",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.9rem"
  },
  removeTag: {
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "1.2rem"
  },
  quickAddButton: {
    padding: "0.5rem 1rem",
    background: "#f0f0f0",
    border: "1px solid #ddd",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.85rem",
    transition: "all 0.2s"
  },
  diseaseForm: {
    background: "#f9f9f9",
    padding: "1rem",
    borderRadius: "8px",
    marginTop: "1rem"
  },
  severitySelector: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginBottom: "1rem"
  },
  severityButton: {
    padding: "0.4rem 1rem",
    background: "white",
    border: "1px solid #ddd",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.85rem"
  },
  severityButtonActive: {
    background: "var(--soil-green)",
    color: "white",
    borderColor: "var(--soil-green)"
  },
  diseaseList: {
    marginTop: "1.5rem"
  },
  listTitle: {
    fontSize: "1rem",
    marginBottom: "1rem"
  },
  diseaseItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.75rem",
    background: "#f9f9f9",
    borderRadius: "8px",
    marginBottom: "0.5rem"
  },
  severityBadge: {
    marginLeft: "0.5rem",
    padding: "0.2rem 0.6rem",
    borderRadius: "12px",
    fontSize: "0.75rem",
    color: "white",
    fontWeight: "bold"
  },
  removeButton: {
    padding: "0.4rem 0.8rem",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.8rem"
  },
  helperText: {
    fontSize: "0.85rem",
    color: "#666",
    fontStyle: "italic",
    marginTop: "1rem"
  },
  navigation: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: "600px",
    marginTop: "2rem",
    gap: "1rem"
  },
  backButton: {
    padding: "1rem 2rem",
    background: "white",
    border: "2px solid var(--soil-green)",
    color: "var(--soil-green)",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "1rem"
  },
  nextButton: {
    padding: "1rem 2rem",
    background: "var(--soil-green)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "1rem",
    flex: 1
  },
  submitButton: {
    padding: "1rem 2rem",
    background: "var(--deep-leaf)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "1rem",
    flex: 1
  },
  quickForm: {
    maxWidth: "500px",
    width: "100%",
    background: "white",
    padding: "2rem",
    borderRadius: "16px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
  },
  disclaimer: {
    fontSize: "0.85rem",
    color: "#666",
    textAlign: "center",
    marginTop: "1rem"
  }
};