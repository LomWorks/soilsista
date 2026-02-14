// Fixes: 
// 1. In the self service signup (free signup) there should be a second password feild (I don't remember the term) to mitigate hiccups. 
// 2. I tested the voice input component and it didn't work. debug it and we will go through it little by little. 
import React, { useState } from "react";
import { db, auth } from "../firebase";
import { doc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import LoadingScreen from "../components/LoadingScreen";
import VoiceInput from "../components/VoiceInput";
import CARIBBEAN_ISLANDS from "../utils/caribbeanIslands";

export default function EnhancedOnboarding() {
  const [step, setStep] = useState(0);
  const [planType, setPlanType] = useState(null); // 'free' or 'paid'
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
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

  // ===== Validation Functions =====
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  const validatePhone = (phone) => {
    // Basic check for phone number (at least 10 digits)
    const phoneDigits = phone.replace(/\D/g, '');
    return phoneDigits.length >= 10;
  };

  // Check if current step in free flow is valid
  const isFreeStepValid = (stepIndex) => {
    switch(stepIndex) {
      case 0: // Account Setup
        return validateEmail(email) && validatePassword(password);
      case 1: // Basic Info (Name)
        return freeData.name.trim().length > 0;
      case 2: // Location (REQUIRED)
        return freeData.location.island.trim().length > 0 && 
               freeData.location.settlement.trim().length > 0;
      case 3: // Farm Size
        return freeData.farmSize.trim().length > 0;
      case 4: // Farming Type (optional)
        return true; // Optional
      case 5: // Crops Info (optional)
        return true; // Optional
      case 6: // Pest Control (optional)
        return true; // Optional
      case 7: // Diseases Info (optional)
        return true; // Optional
      default:
        return true;
    }
  };

  // Check if paid form is valid
  const isPaidFormValid = () => {
    return validateEmail(email) &&
           validatePassword(password) &&
           paidData.name.trim().length > 0 &&
           paidData.island.trim().length > 0 &&
           paidData.settlement.trim().length > 0 &&
           validatePhone(paidData.phone);
  };

  // Handle next button with validation
  const handleNextStep = () => {
    const newErrors = {};

    // Validate current step
    if (step === 0) {
      if (!validateEmail(email)) {
        newErrors.email = "Please enter a valid email address";
      }
      if (!validatePassword(password)) {
        newErrors.password = "Password must be at least 6 characters";
      }
    } else if (step === 1 && !freeData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (step === 2) {
      if (!freeData.location.island.trim()) {
        newErrors.island = "Please select your island";
      }
      if (!freeData.location.settlement.trim()) {
        newErrors.settlement = "Settlement/area is required";
      }
    } else if (step === 3 && !freeData.farmSize.trim()) {
      newErrors.farmSize = "Farm size is required";
    }

    setErrors(newErrors);

    // Only proceed if no errors
    if (Object.keys(newErrors).length === 0) {
      setStep(step + 1);
    }
  };

  // ===== Helper: Create Firebase User =====
  const createFirebaseUser = async () => {
    if (!email || !password) throw new Error("Please provide email and password");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user.uid;
  };

  // ===== Submit Free Version =====
  const submitFreeVersion = async () => {
    // Final validation check
    if (!isFreeStepValid(0) || !isFreeStepValid(1) || !isFreeStepValid(2) || !isFreeStepValid(3)) {
      alert("Please complete all required fields");
      return;
    }

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
    // Validate paid form
    const newErrors = {};
    
    if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!validatePassword(password)) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (!paidData.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!paidData.island.trim()) {
      newErrors.island = "Please select your island";
    }
    if (!paidData.settlement.trim()) {
      newErrors.settlement = "Settlement/area is required";
    }
    if (!validatePhone(paidData.phone)) {
      newErrors.phone = "Please enter a valid phone number (at least 10 digits)";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

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
    <AccountSetup 
      email={email} 
      setEmail={setEmail} 
      password={password} 
      setPassword={setPassword} 
      errors={errors}
      key={0} 
    />,
    <BasicInfo 
      data={freeData} 
      setData={setFreeData} 
      errors={errors}
      key={1} 
    />,
    <LocationInfo 
      data={freeData} 
      setData={setFreeData} 
      errors={errors}
      key={2} 
    />,
    <FarmSize 
      data={freeData} 
      setData={setFreeData} 
      errors={errors}
      key={3} 
    />,
    <FarmingType 
      data={freeData} 
      setData={setFreeData} 
      key={4} 
    />,
    <CropsInfo 
      data={freeData} 
      setData={setFreeData} 
      key={5} 
    />,
    <PestControl 
      data={freeData} 
      setData={setFreeData} 
      key={6} 
    />,
    <DiseasesInfo 
      data={freeData} 
      setData={setFreeData} 
      key={7} 
    />
  ];

  // ===== Render =====
  if (planType === null) return <PlanSelection setPlanType={setPlanType} />;

  if (planType === "free") {
    const canProceed = isFreeStepValid(step);
    
    return (
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
          {step > 0 && (
            <button 
              onClick={() => setStep(step - 1)} 
              style={styles.backButton}
            >
              ← Back
            </button>
          )}
          {step < freeSteps.length - 1 ? (
            <button 
              onClick={handleNextStep}
              disabled={!canProceed}
              style={{
                ...styles.nextButton,
                ...(canProceed ? {} : styles.disabledButton)
              }}
            >
              Next →
            </button>
          ) : (
            <button 
              onClick={submitFreeVersion}
              disabled={!canProceed}
              style={{
                ...styles.submitButton,
                ...(canProceed ? {} : styles.disabledButton)
              }}
            >
              Complete Setup
            </button>
          )}
        </div>
      </div>
    );
  }

  if (planType === "paid") return (
    <PaidForm
      email={email} 
      setEmail={setEmail}
      password={password} 
      setPassword={setPassword}
      data={paidData} 
      setData={setPaidData}
      submit={submitPaidVersion}
      errors={errors}
      isValid={isPaidFormValid()}
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
function PaidForm({ email, setEmail, password, setPassword, data, setData, submit, errors, isValid }) {
  return (
    <div style={styles.page}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} style={styles.quickForm}>
        <h1>Quick Setup (60 seconds)</h1>
        <p style={styles.subtitle}>We'll gather more details through WhatsApp</p>
        
        <label style={styles.label}>Email <span style={styles.required}>*</span></label>
        <input 
          type="email" 
          placeholder="your@email.com" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          style={{
            ...styles.input,
            ...(errors.email ? styles.inputError : {})
          }}
        />
        {errors.email && <p style={styles.errorText}>{errors.email}</p>}

        <label style={styles.label}>Password <span style={styles.required}>*</span></label>
        <input 
          type="password" 
          placeholder="At least 6 characters" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          style={{
            ...styles.input,
            ...(errors.password ? styles.inputError : {})
          }}
        />
        {errors.password && <p style={styles.errorText}>{errors.password}</p>}

        <label style={styles.label}>Your Name <span style={styles.required}>*</span></label>
        <input 
          placeholder="Full name" 
          value={data.name} 
          onChange={e => setData({ ...data, name: e.target.value })} 
          style={{
            ...styles.input,
            ...(errors.name ? styles.inputError : {})
          }}
        />
        {errors.name && <p style={styles.errorText}>{errors.name}</p>}

        <label style={styles.label}>Island <span style={styles.required}>*</span></label>
        <select 
          value={data.island} 
          onChange={e => setData({ ...data, island: e.target.value })} 
          style={{
            ...styles.input,
            ...(errors.island ? styles.inputError : {})
          }}
        >
          <option value="">Select island</option>
          {CARIBBEAN_ISLANDS.map(island => (
            <option key={island} value={island}>{island}</option>
          ))}
        </select>
        {errors.island && <p style={styles.errorText}>{errors.island}</p>}

        <label style={styles.label}>Settlement/Area <span style={styles.required}>*</span></label>
        <input 
          placeholder="e.g., St. John's, Codrington" 
          value={data.settlement} 
          onChange={e => setData({ ...data, settlement: e.target.value })} 
          style={{
            ...styles.input,
            ...(errors.settlement ? styles.inputError : {})
          }}
        />
        {errors.settlement && <p style={styles.errorText}>{errors.settlement}</p>}

        <label style={styles.label}>WhatsApp Phone Number <span style={styles.required}>*</span></label>
        <input 
          type="tel" 
          placeholder="+1 268 XXX XXXX" 
          value={data.phone} 
          onChange={e => setData({ ...data, phone: e.target.value })} 
          style={{
            ...styles.input,
            ...(errors.phone ? styles.inputError : {})
          }}
        />
        {errors.phone && <p style={styles.errorText}>{errors.phone}</p>}

        <label style={styles.label}>Current Issue <span style={styles.optional}>(Optional)</span></label>
        <textarea 
          placeholder="Brief description of what you need help with..." 
          value={data.currentIssue} 
          onChange={e => setData({ ...data, currentIssue: e.target.value })} 
          rows={3} 
          style={styles.textarea} 
        />

        <VoiceInput setText={(text) => setData(prev => ({ ...prev, currentIssue: prev.currentIssue + ' ' + text }))} />

        <button 
          onClick={submit}
          disabled={!isValid}
          style={{
            ...styles.submitButton,
            ...(isValid ? {} : styles.disabledButton)
          }}
        >
          Complete Setup
        </button>
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
        <motion.div 
          initial={{ width: 0 }} 
          animate={{ width: `${((current + 1) / total) * 100}%` }} 
          transition={{ duration: 0.3 }} 
          style={styles.progressFill} 
        />
      </div>
      <p style={styles.progressText}>Step {current + 1} of {total}</p>
    </div>
  );
}

// ===== Step Components =====
function AccountSetup({ email, setEmail, password, setPassword, errors }) {
  return (
    <div style={styles.stepContent}>
      <h2>Create Your Account</h2>
      <p style={styles.stepDescription}>We'll use this to save your farm data securely</p>
      
      <label style={styles.label}>Email <span style={styles.required}>*</span></label>
      <input
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{
          ...styles.input,
          ...(errors.email ? styles.inputError : {})
        }}
      />
      {errors.email && <p style={styles.errorText}>{errors.email}</p>}

      <label style={styles.label}>Password <span style={styles.required}>*</span></label>
      <input
        type="password"
        placeholder="At least 6 characters"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{
          ...styles.input,
          ...(errors.password ? styles.inputError : {})
        }}
      />
      {errors.password && <p style={styles.errorText}>{errors.password}</p>}
    </div>
  );
}

function BasicInfo({ data, setData, errors }) {
  return (
    <div style={styles.stepContent}>
      <h2>What's your name?</h2>
      <p style={styles.stepDescription}>So we know what to call you</p>
      
      <label style={styles.label}>Your Name <span style={styles.required}>*</span></label>
      <input
        placeholder="Full name"
        value={data.name}
        onChange={e => setData({ ...data, name: e.target.value })}
        style={{
          ...styles.input,
          ...(errors.name ? styles.inputError : {})
        }}
      />
      {errors.name && <p style={styles.errorText}>{errors.name}</p>}
    </div>
  );
}

function LocationInfo({ data, setData, errors }) {
  return (
    <div style={styles.stepContent}>
      <h2>Where's your farm?</h2>
      <p style={styles.stepDescription}>This helps us provide accurate weather data and local recommendations</p>
      
      <label style={styles.label}>Island <span style={styles.required}>*</span></label>
      <select 
        value={data.location.island} 
        onChange={e => setData({ ...data, location: { ...data.location, island: e.target.value } })} 
        style={{
          ...styles.input,
          ...(errors.island ? styles.inputError : {})
        }}
      >
        <option value="">Select your island</option>
        {CARIBBEAN_ISLANDS.map(island => (
          <option key={island} value={island}>{island}</option>
        ))}
      </select>
      {errors.island && <p style={styles.errorText}>{errors.island}</p>}

      <label style={styles.label}>Settlement/Area <span style={styles.required}>*</span></label>
      <input
        placeholder="e.g., St. John's, All Saints, Parham"
        value={data.location.settlement}
        onChange={e => setData({ ...data, location: { ...data.location, settlement: e.target.value } })}
        style={{
          ...styles.input,
          ...(errors.settlement ? styles.inputError : {})
        }}
      />
      {errors.settlement && <p style={styles.errorText}>{errors.settlement}</p>}
    </div>
  );
}

function FarmSize({ data, setData, errors }) {
  return (
    <div style={styles.stepContent}>
      <h2>How big is your farm?</h2>
      <p style={styles.stepDescription}>This helps us calculate planting needs</p>
      
      <label style={styles.label}>Farm Size <span style={styles.required}>*</span></label>
      <input
        placeholder="e.g., 2 acres, 0.5 hectares, 5000 sq ft"
        value={data.farmSize}
        onChange={e => setData({ ...data, farmSize: e.target.value })}
        style={{
          ...styles.input,
          ...(errors.farmSize ? styles.inputError : {})
        }}
      />
      {errors.farmSize && <p style={styles.errorText}>{errors.farmSize}</p>}
    </div>
  );
}

function FarmingType({ data, setData }) {
  return (
    <div style={styles.stepContent}>
      <h2>What type of farming do you do?</h2>
      <p style={styles.stepDescription}>Optional - helps us customize your experience</p>
      
      <label style={styles.label}>Farming Type <span style={styles.optional}>(Optional)</span></label>
      <input
        placeholder="e.g., Crop farming, Mixed farming, Livestock"
        value={data.farmingType}
        onChange={e => setData({ ...data, farmingType: e.target.value })}
        style={styles.input}
      />
    </div>
  );
}

function CropsInfo({ data, setData }) {
  return (
    <div style={styles.stepContent}>
      <h2>What crops are you growing?</h2>
      <p style={styles.stepDescription}>Optional - separate multiple crops with commas</p>
      
      <label style={styles.label}>Current Crops <span style={styles.optional}>(Optional)</span></label>
      <input
        placeholder="e.g., Tomatoes, Peppers, Lettuce"
        value={data.crops.join(", ")}
        onChange={e =>
          setData({ ...data, crops: e.target.value.split(",").map(c => c.trim()).filter(c => c) })
        }
        style={styles.input}
      />
    </div>
  );
}

function PestControl({ data, setData }) {
  return (
    <div style={styles.stepContent}>
      <h2>How do you handle pests?</h2>
      <p style={styles.stepDescription}>Optional - helps us give better recommendations</p>
      
      <label style={styles.label}>Pest Control Methods <span style={styles.optional}>(Optional)</span></label>
      <input
        placeholder="e.g., Neem oil, Traps, Companion planting"
        value={data.pestControl.join(", ")}
        onChange={e =>
          setData({ ...data, pestControl: e.target.value.split(",").map(p => p.trim()).filter(p => p) })
        }
        style={styles.input}
      />
    </div>
  );
}

function DiseasesInfo({ data, setData }) {
  return (
    <div style={styles.stepContent}>
      <h2>Any known plant diseases?</h2>
      <p style={styles.stepDescription}>Optional - helps us provide preventive tips</p>
      
      <label style={styles.label}>Known Diseases <span style={styles.optional}>(Optional)</span></label>
      <input
        placeholder="e.g., Blight, Rust, Powdery mildew, or 'None'"
        value={data.diseases.join(", ")}
        onChange={e =>
          setData({ ...data, diseases: e.target.value.split(",").map(d => d.trim()).filter(d => d) })
        }
        style={styles.input}
      />
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
    gap: "0.5rem"
  },
  stepDescription: {
    color: "#666",
    fontSize: "0.95rem",
    marginBottom: "1rem"
  },
  label: {
    fontWeight: "600",
    color: "var(--ink-black)",
    marginTop: "1rem"
  },
  required: {
    color: "#ef4444",
    fontWeight: "bold"
  },
  optional: {
    color: "#999",
    fontSize: "0.85rem",
    fontWeight: "normal"
  },
  input: {
    width: "100%",
    padding: "0.75rem",
    fontSize: "1rem",
    border: "1px solid #ddd",
    borderRadius: "8px",
    boxSizing: "border-box",
    transition: "border-color 0.2s"
  },
  inputError: {
    borderColor: "#ef4444",
    background: "#fef2f2"
  },
  errorText: {
    color: "#ef4444",
    fontSize: "0.85rem",
    marginTop: "0.25rem",
    marginBottom: "0.5rem"
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
    flex: 1,
    transition: "all 0.2s"
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
    flex: 1,
    transition: "all 0.2s"
  },
  disabledButton: {
    opacity: 0.5,
    cursor: "not-allowed"
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