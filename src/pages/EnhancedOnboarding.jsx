import React, { useState } from "react";
import { db } from "../firebase";
import { addDoc, collection } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import LoadingScreen from "../components/LoadingScreen";

export default function EnhancedOnboarding() {
  const [step, setStep] = useState(0);
  const [planType, setPlanType] = useState(null); // 'free' or 'paid'
  const [loading, setLoading] = useState(false);
  
  // Free version - comprehensive data
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
    location: {
      island: "",
      settlement: ""
    }
  });

  // Paid version - minimal data
  const [paidData, setPaidData] = useState({
    name: "",
    island: "",
    settlement: "",
    phone: "",
    currentIssue: ""
  });

  const submitFreeVersion = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, "freeUserProfiles"), {
        ...freeData,
        planType: "free",
        createdAt: new Date()
      });
      
      // Simulate processing time
      setTimeout(() => {
        setLoading(false);
        alert("Welcome to Soil Sista! Your dashboard is ready.");
        window.location.href = "/dashboard";
      }, 3000);
    } catch (err) {
      console.error("Error:", err);
      setLoading(false);
      alert("Error saving profile");
    }
  };

  const submitPaidVersion = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, "paidUserProfiles"), {
        ...paidData,
        planType: "paid",
        createdAt: new Date()
      });
      
      setTimeout(() => {
        setLoading(false);
        alert("Profile created! You'll receive a WhatsApp message shortly.");
        window.location.href = "/";
      }, 2000);
    } catch (err) {
      console.error("Error:", err);
      setLoading(false);
      alert("Error saving profile");
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  // Step 0: Choose Plan Type
  if (planType === null) {
    return (
      <div style={styles.page}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.planSelection}
        >
          <h1>Welcome to Soil Sista</h1>
          <p style={styles.subtitle}>Choose your consultation plan</p>

          <div style={styles.planCards}>
            {/* Free Plan Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              onClick={() => setPlanType("free")}
              style={styles.planCard}
            >
              <h2>🌱 Free Self-Serve</h2>
              <ul style={styles.featureList}>
                <li>Complete farm data setup</li>
                <li>Climate data integration</li>
                <li>Automated planning tools</li>
                <li>Educational resources</li>
                <li>Self-managed consultations</li>
              </ul>
              <button style={styles.selectButton}>Get Started Free</button>
            </motion.div>

            {/* Paid Plan Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              onClick={() => setPlanType("paid")}
              style={{...styles.planCard, ...styles.paidCard}}
            >
              <div style={styles.badge}>PREMIUM</div>
              <h2>💬 WhatsApp Consultation</h2>
              <ul style={styles.featureList}>
                <li>60-second quick setup</li>
                <li>Direct WhatsApp support</li>
                <li>Real-time expert advice</li>
                <li>Proactive weather alerts</li>
                <li>Photo-based diagnostics</li>
              </ul>
              <button style={{...styles.selectButton, ...styles.paidButton}}>
                Start Premium Trial
              </button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  // FREE VERSION - Multi-step Form
  if (planType === "free") {
    return (
      <div style={styles.page}>
        <ProgressBar current={step} total={6} />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            style={styles.formContainer}
          >
            {step === 0 && <BasicInfo data={freeData} setData={setFreeData} />}
            {step === 1 && <FarmSize data={freeData} setData={setFreeData} />}
            {step === 2 && <FarmingType data={freeData} setData={setFreeData} />}
            {step === 3 && <CropsInfo data={freeData} setData={setFreeData} />}
            {step === 4 && <PestControl data={freeData} setData={setFreeData} />}
            {step === 5 && <DiseasesInfo data={freeData} setData={setFreeData} />}
          </motion.div>
        </AnimatePresence>

        <div style={styles.navigation}>
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} style={styles.backButton}>
              ← Back
            </button>
          )}
          
          {step < 5 ? (
            <button onClick={() => setStep(step + 1)} style={styles.nextButton}>
              Next →
            </button>
          ) : (
            <button onClick={submitFreeVersion} style={styles.submitButton}>
              Complete Setup
            </button>
          )}
        </div>
      </div>
    );
  }

  // PAID VERSION - Quick 60-second Form
  if (planType === "paid") {
    return (
      <div style={styles.page}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={styles.quickForm}
        >
          <h1>Quick Setup (60 seconds)</h1>
          <p style={styles.subtitle}>We'll gather more details through WhatsApp</p>

          <label style={styles.label}>Your Name</label>
          <input
            placeholder="Full name"
            value={paidData.name}
            onChange={e => setPaidData({...paidData, name: e.target.value})}
            style={styles.input}
          />

          <label style={styles.label}>Island</label>
          <select
            value={paidData.island}
            onChange={e => setPaidData({...paidData, island: e.target.value})}
            style={styles.input}
          >
            <option value="">Select island</option>
            <option value="Antigua">Antigua</option>
            <option value="Barbuda">Barbuda</option>
          </select>

          <label style={styles.label}>Settlement/Area</label>
          <input
            placeholder="e.g., St. John's, Codrington"
            value={paidData.settlement}
            onChange={e => setPaidData({...paidData, settlement: e.target.value})}
            style={styles.input}
          />

          <label style={styles.label}>WhatsApp Phone Number</label>
          <input
            type="tel"
            placeholder="+1 268 XXX XXXX"
            value={paidData.phone}
            onChange={e => setPaidData({...paidData, phone: e.target.value})}
            style={styles.input}
          />

          <label style={styles.label}>Current Issue (Optional)</label>
          <textarea
            placeholder="Brief description of what you need help with..."
            value={paidData.currentIssue}
            onChange={e => setPaidData({...paidData, currentIssue: e.target.value})}
            rows={3}
            style={styles.input}
          />

          <button onClick={submitPaidVersion} style={styles.submitButton}>
            Complete Setup
          </button>

          <p style={styles.disclaimer}>
            💬 You'll receive a WhatsApp message within 24 hours to begin your consultation
          </p>
        </motion.div>
      </div>
    );
  }
}

// Progress Bar Component
function ProgressBar({ current, total }) {
  return (
    <div style={styles.progressContainer}>
      <div style={styles.progressBar}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${((current + 1) / total) * 100}%` }}
          style={styles.progressFill}
        />
      </div>
      <p style={styles.progressText}>Step {current + 1} of {total}</p>
    </div>
  );
}

// Form Step Components
function BasicInfo({ data, setData }) {
  return (
    <div style={styles.stepContent}>
      <h2>👋 Let's Start with the Basics</h2>
      
      <label style={styles.label}>Your Name</label>
      <input
        placeholder="Full name"
        value={data.name}
        onChange={e => setData({...data, name: e.target.value})}
        style={styles.input}
      />

      <label style={styles.label}>Location</label>
      <div style={styles.locationGrid}>
        <input
          placeholder="Island"
          value={data.location.island}
          onChange={e => setData({...data, location: {...data.location, island: e.target.value}})}
          style={styles.input}
        />
        <input
          placeholder="Settlement/Area"
          value={data.location.settlement}
          onChange={e => setData({...data, location: {...data.location, settlement: e.target.value}})}
          style={styles.input}
        />
      </div>
    </div>
  );
}

function FarmSize({ data, setData }) {
  const terrainOptions = ["Flat Land", "Hilly", "Mixed Terrain", "Coastal", "Inland"];
  const waterSourceOptions = ["Rain", "Well", "River/Stream", "Municipal", "Irrigation System", "Pond/Reservoir"];

  const toggleItem = (array, item) => {
    if (array.includes(item)) {
      return array.filter(i => i !== item);
    }
    return [...array, item];
  };

  return (
    <div style={styles.stepContent}>
      <h2>🌾 Tell Us About Your Farm</h2>
      
      <label style={styles.label}>Farm Size (acres or sq ft)</label>
      <input
        placeholder="e.g., 2 acres or 5000 sq ft"
        value={data.farmSize}
        onChange={e => setData({...data, farmSize: e.target.value})}
        style={styles.input}
      />

      <label style={styles.label}>Growing Sites</label>
      <textarea
        placeholder="Describe where you grow (e.g., backyard garden, 3 raised beds, open field)"
        value={data.growingSites.join(", ")}
        onChange={e => setData({...data, growingSites: e.target.value.split(",")})}
        rows={2}
        style={styles.input}
      />

      <label style={styles.label}>Terrain Type</label>
      <div style={styles.buttonGrid}>
        {terrainOptions.map(option => (
          <motion.button
            key={option}
            whileTap={{ scale: 0.95 }}
            onClick={() => setData({...data, terrain: option})}
            style={{
              ...styles.optionButton,
              ...(data.terrain === option ? styles.optionButtonActive : {})
            }}
          >
            {option}
          </motion.button>
        ))}
      </div>

      <label style={styles.label}>Water Sources (select all that apply)</label>
      <div style={styles.buttonGrid}>
        {waterSourceOptions.map(option => (
          <motion.button
            key={option}
            whileTap={{ scale: 0.95 }}
            onClick={() => setData({...data, waterSources: toggleItem(data.waterSources, option)})}
            style={{
              ...styles.optionButton,
              ...(data.waterSources.includes(option) ? styles.optionButtonActive : {})
            }}
          >
            {option}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function FarmingType({ data, setData }) {
  return (
    <div style={styles.stepContent}>
      <h2>🌿 Your Farming Approach</h2>
      
      <label style={styles.label}>What type of farming do you practice?</label>
      <div style={styles.cardGrid}>
        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => setData({...data, farmingType: "Natural"})}
          style={{
            ...styles.selectionCard,
            ...(data.farmingType === "Natural" ? styles.selectionCardActive : {})
          }}
        >
          <div style={styles.cardEmoji}>🌱</div>
          <h3>Natural Farming</h3>
          <p style={styles.cardDescription}>
            Organic methods, composting, natural pest control, no synthetic inputs
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => setData({...data, farmingType: "Conventional"})}
          style={{
            ...styles.selectionCard,
            ...(data.farmingType === "Conventional" ? styles.selectionCardActive : {})
          }}
        >
          <div style={styles.cardEmoji}>🚜</div>
          <h3>Conventional Farming</h3>
          <p style={styles.cardDescription}>
            Standard agricultural practices, may use fertilizers and pesticides
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => setData({...data, farmingType: "Mixed"})}
          style={{
            ...styles.selectionCard,
            ...(data.farmingType === "Mixed" ? styles.selectionCardActive : {})
          }}
        >
          <div style={styles.cardEmoji}>🌾</div>
          <h3>Mixed Approach</h3>
          <p style={styles.cardDescription}>
            Combination of natural and conventional methods depending on situation
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function CropsInfo({ data, setData }) {
  const [cropInput, setCropInput] = useState("");

  const addCrop = () => {
    if (cropInput.trim()) {
      setData({...data, crops: [...data.crops, cropInput.trim()]});
      setCropInput("");
    }
  };

  const removeCrop = (index) => {
    setData({...data, crops: data.crops.filter((_, i) => i !== index)});
  };

  return (
    <div style={styles.stepContent}>
      <h2>🥬 What Do You Grow?</h2>
      
      <label style={styles.label}>Add Your Crops</label>
      <div style={styles.addItemContainer}>
        <input
          placeholder="Type crop name and press Enter"
          value={cropInput}
          onChange={e => setCropInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && addCrop()}
          style={styles.input}
        />
        <button onClick={addCrop} style={styles.addButton}>+ Add</button>
      </div>

      {data.crops.length > 0 && (
        <div style={styles.tagContainer}>
          {data.crops.map((crop, index) => (
            <motion.div
              key={index}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              style={styles.tag}
            >
              {crop}
              <span onClick={() => removeCrop(index)} style={styles.removeTag}>×</span>
            </motion.div>
          ))}
        </div>
      )}

      <label style={styles.label}>Crop Diversity</label>
      <textarea
        placeholder="How diverse is your planting? Do you rotate crops? Any companion planting?"
        value={data.cropDiversity}
        onChange={e => setData({...data, cropDiversity: e.target.value})}
        rows={3}
        style={styles.input}
      />
    </div>
  );
}

function PestControl({ data, setData }) {
  const pestMethods = [
    "🐞 Beneficial Insects",
    "🌿 Neem Oil",
    "🧴 Organic Sprays",
    "🧪 Chemical Pesticides",
    "🪤 Physical Barriers/Traps",
    "🌱 Companion Planting",
    "✋ Hand Picking",
    "💨 None - Let nature handle it"
  ];

  const toggleMethod = (method) => {
    if (data.pestControl.includes(method)) {
      setData({...data, pestControl: data.pestControl.filter(m => m !== method)});
    } else {
      setData({...data, pestControl: [...data.pestControl, method]});
    }
  };

  return (
    <div style={styles.stepContent}>
      <h2>🐛 Pest Control Methods</h2>
      <p style={styles.subtitle}>Select all methods you use or are interested in trying</p>
      
      <div style={styles.buttonGrid}>
        {pestMethods.map(method => (
          <motion.button
            key={method}
            whileTap={{ scale: 0.95 }}
            onClick={() => toggleMethod(method)}
            style={{
              ...styles.optionButton,
              ...(data.pestControl.includes(method) ? styles.optionButtonActive : {})
            }}
          >
            {method}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function DiseasesInfo({ data, setData }) {
  const [diseaseInput, setDiseaseInput] = useState("");
  const [severity, setSeverity] = useState("Low");

  const commonDiseases = [
    "Powdery Mildew",
    "Leaf Spot",
    "Root Rot",
    "Blight",
    "Wilting",
    "Fungal Infections",
    "Bacterial Infections",
    "Viral Diseases"
  ];

  const addDisease = (disease = diseaseInput) => {
    if (disease.trim()) {
      setData({
        ...data,
        diseases: [...data.diseases, { name: disease.trim(), severity, date: new Date().toISOString() }]
      });
      setDiseaseInput("");
      setSeverity("Low");
    }
  };

  const removeDisease = (index) => {
    setData({...data, diseases: data.diseases.filter((_, i) => i !== index)});
  };

  return (
    <div style={styles.stepContent}>
      <h2>🦠 Disease History</h2>
      <p style={styles.subtitle}>Help us understand what challenges you've faced</p>
      
      <label style={styles.label}>Quick Add Common Issues</label>
      <div style={styles.buttonGrid}>
        {commonDiseases.map(disease => (
          <motion.button
            key={disease}
            whileTap={{ scale: 0.95 }}
            onClick={() => addDisease(disease)}
            style={styles.quickAddButton}
          >
            + {disease}
          </motion.button>
        ))}
      </div>

      <label style={styles.label}>Or Add Custom Disease/Issue</label>
      <div style={styles.diseaseForm}>
        <input
          placeholder="Disease or problem name"
          value={diseaseInput}
          onChange={e => setDiseaseInput(e.target.value)}
          style={{...styles.input, marginBottom: '0.5rem'}}
        />
        
        <div style={styles.severitySelector}>
          <label style={styles.smallLabel}>Severity:</label>
          {["Low", "Medium", "High"].map(level => (
            <button
              key={level}
              onClick={() => setSeverity(level)}
              style={{
                ...styles.severityButton,
                ...(severity === level ? styles.severityButtonActive : {})
              }}
            >
              {level}
            </button>
          ))}
        </div>

        <button onClick={() => addDisease()} style={styles.addButton}>
          Add to History
        </button>
      </div>

      {data.diseases.length > 0 && (
        <div style={styles.diseaseList}>
          <h3 style={styles.listTitle}>Your Disease History:</h3>
          {data.diseases.map((disease, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={styles.diseaseItem}
            >
              <div>
                <strong>{disease.name}</strong>
                <span style={{
                  ...styles.severityBadge,
                  backgroundColor: 
                    disease.severity === "High" ? "#ef4444" :
                    disease.severity === "Medium" ? "#f59e0b" : "#10b981"
                }}>
                  {disease.severity}
                </span>
              </div>
              <button onClick={() => removeDisease(index)} style={styles.removeButton}>
                Remove
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <p style={styles.helperText}>
        💡 No issues yet? That's great! Skip this step or add "None" to continue.
      </p>
    </div>
  );
}

// Styles
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
    margin: "1.5rem 0"
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
    whiteSpace: "nowrap"
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
