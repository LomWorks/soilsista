import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { db, auth } from "../firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import CARIBBEAN_ISLANDS from "../utils/caribbeanIslands";

// ── TagInput (same component used in EnhancedOnboarding) ─────────────────────
function TagInput({ value = [], onChange, placeholder }) {
  const [inputVal, setInputVal] = useState("");

  const addTag = () => {
    const trimmed = inputVal.trim();
    if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed]);
    setInputVal("");
  };

  const removeTag = (tag) => onChange(value.filter(t => t !== tag));

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
    else if (e.key === "Backspace" && !inputVal && value.length > 0) removeTag(value[value.length - 1]);
  };

  return (
    <div style={tagStyles.container}>
      {.map(tag => (
        <span key={tag} style={tagStyles.tag}>
          {tag}
          <button type="button" onClick={() => removeTag(tag)} style={tagStyles.removeBtn}>×</button>
        </span>
      ))}
      <input
        type="text" ={inputVal}
        onChange={e => setInputVal(e.target.)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={.length === 0 ? placeholder : "Add another…"}
        style={tagStyles.input}
      />
    </div>
  );
}

const tagStyles = {
  container: {
    display: "flex", flexWrap: "wrap", gap: "0.4rem", padding: "0.5rem",
    border: "1px solid #ddd", borderRadius: "8px", background: "white",
    minHeight: "48px", alignItems: "center"
  },
  tag: {
    display: "inline-flex", alignItems: "center", gap: "0.3rem",
    background: "var(--soil-green, #4a7c59)", color: "white",
    padding: "0.25rem 0.6rem", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "500"
  },
  removeBtn: {
    background: "none", border: "none", color: "white", cursor: "pointer",
    fontSize: "1rem", lineHeight: 1, padding: 0, opacity: 0.8
  },
  input: {
    border: "none", outline: "none", fontSize: "0.95rem",
    flex: 1, minWidth: "120px", background: "transparent", padding: "0.25rem"
  }
};

// ── Profile Page ──────────────────────────────────────────────────────────────
export default function Profile() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState({});
  const [userId, setUserId] = useState(null);

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [island, setIsland] = useState("");
  const [settlement, setSettlement] = useState("");
  const [farmSize, setFarmSize] = useState("");
  const [farmingType, setFarmingType] = useState("");
  const [terrain, setTerrain] = useState("");
  const [currentCrops, setCurrentCrops] = useState([]);
  const [growingSites, setGrowingSites] = useState([]);
  const [waterSources, setWaterSources] = useState([]);
  const [pestControl, setPestControl] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { window.location.href = "/login"; return; }
      setUserId(user.uid);
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setUserData(d);
          setName(d.name || "");
          setPhone(d.phone || "");
          const loc = typeof d.location === "string"
            ? { island: d.location, settlement: "" }
            : d.location || {};
          setIsland(loc.island || "");
          setSettlement(loc.settlement || "");
          setFarmSize(d.farmSize || "");
          setFarmingType(d.farmingType || "");
          setTerrain(d.terrain || "");
          setCurrentCrops(d.currentCrops || []);
          setGrowingSites(d.growingSites || []);
          setWaterSources(d.waterSources || []);
          setPestControl(d.pestControl || []);
        }
      } catch (e) {
        console.error("Error loading profile:", e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!island.trim()) newErrors.island = "Island is required";
    if (!settlement.trim()) newErrors.settlement = "Settlement is required";
    if (!farmSize.trim()) newErrors.farmSize = "Farm size is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateDoc(doc(db, "users", userId), {
        name,
        phone: phone || null,
        location: { island, settlement },
        farmSize,
        farmingType: farmingType || null,
        terrain: terrain || null,
        currentCrops,
        growingSites,
        waterSources,
        pestControl,
        onboardingComplete: true,
        accountStatus: "active",
        updatedAt: serverTimestamp(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error("Error saving profile:", e);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
        <p>Loading your profile…</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} style={styles.header}>
          <a href="/dashboard" style={styles.backLink}>← Back to Dashboard</a>
          <h1 style={styles.title}>Your Profile</h1>
          <p style={styles.subtitle}>Keep your farm information up to date for accurate weather alerts and recommendations.</p>
        </motion.div>

        {/* Saved banner */}
        {saved && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={styles.savedBanner}>
            ✅ Profile saved successfully
          </motion.div>
        )}

        {/* Completion indicator */}
        <ProfileCompletion
          island={island} farmSize={farmSize}
          farmingType={farmingType} currentCrops={currentCrops}
        />

        {/* ── Section: Account ── */}
        <Section title="👤 Account" delay={0.05}>
          <Field label="Name" required error={errors.name}>
            <input
              ={name} onChange={e => { setName(e.target.); setErrors({ ...errors, name: null }); }}
              placeholder="Your full name" style={{ ...styles.input, borderColor: errors.name ? "#ef4444" : "#ddd" }}
            />
          </Field>
          <Field label="Email">
            <input ={userData?.email || ""} disabled style={{ ...styles.input, ...styles.inputDisabled }} />
            <span style={styles.fieldHint}>Email cannot be changed here</span>
          </Field>
          {userData?.planType === "paid" && (
            <Field label="WhatsApp Phone">
              <input
                type="tel" ={phone} onChange={e => setPhone(e.target.)}
                placeholder="+1 268 XXX XXXX" style={styles.input}
              />
            </Field>
          )}
        </Section>

        {/* ── Section: Location ── */}
        <Section title="📍 Location" delay={0.1}>
          <Field label="Island" required error={errors.island}>
            <select
              ={island}
              onChange={e => { setIsland(e.target.); setErrors({ ...errors, island: null }); }}
              style={{ ...styles.input, borderColor: errors.island ? "#ef4444" : "#ddd" }}
            >
              <option ="">Select your island</option>
              {CARIBBEAN_ISLANDS.map(i => <option key={i} ={i}>{i}</option>)}
            </select>
          </Field>
          <Field label="Settlement / Area" required error={errors.settlement}>
            <input
              ={settlement}
              onChange={e => { setSettlement(e.target.value); setErrors({ ...errors, settlement: null }); }}
              placeholder="e.g., St. John's, All Saints, Parham"
              style={{ ...styles.input, borderColor: errors.settlement ? "#ef4444" : "#ddd" }}
            />
          </Field>
        </Section>

        {/* ── Section: Farm Details ── */}
        <Section title="🌾 Farm Details" delay={0.15}>
          <Field label="Farm Size" required error={errors.farmSize}>
            <input
              value={farmSize}
              onChange={e => { setFarmSize(e.target.value); setErrors({ ...errors, farmSize: null }); }}
              placeholder="e.g., 2 acres, 0.5 hectares, 5000 sq ft"
              style={{ ...styles.input, borderColor: errors.farmSize ? "#ef4444" : "#ddd" }}
            />
          </Field>
               value={farmingType} onChange={e => setFarmingType(e.target.value)}
              placeholder="e.g., Crop farming, Mixed farming, Livestock"
              style={styles.input}
            />
          </Field>
          <Field label="Terrain" optional>
            <input
              value={terrain} onChange={e => setTerrain(e.target.value)}
              placeholder="e.g., Flat, Sloped, Raised beds"
              style={styles.input}
            />
          </Field>
        </Section>

        {/* ── Section: Crops & Growing ── */}
        <Section title="🥬 Crops & Growing" delay={0.2}>
          <Field label="Current Crops" optional hint="Press Enter or comma to add each crop">
            <TagInput
              value={currentCrops} onChange={setCurrentCrops}
              placeholder="e.g., Tomatoes, Peppers, Lettuce"
            />
          <Field label="Growing Sites" optional hint="Press Enter or comma to add each site">
            <TagInput
              value={growingSites} onChange={setGrowingSites}
              placeholder="e.g., Raised beds, Greenhouse, Open field"
            />
          </Field>
          <Field label="Water Sources" optional hint="Press Enter or comma to add each source">
            <TagInput
              value={waterSources} onChange={setWaterSources}
              placeholder="e.g., Rainwater, Standpipe, Well"
            />
          </Field>
          <Field label="Pest Control Methods" optional hint="Press Enter or comma to add each method">
            <TagInput
              value={pestControl} onChange={setPestControl}
              placeholder="e.g., Neem oil, Traps, Companion planting"
            />
          </Field>
        </Section>

        {/* Save button */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} style={styles.footer}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ ...styles.saveBtn, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <a href="/dashboard" style={styles.cancelLink}>Cancel</a>
        </motion.div>

      </div>
    </div>
  );
}

// ── Profile Completion Strip ──────────────────────────────────────────────────
function ProfileCompletion({ island, farmSize, farmingType, currentCrops }) {
  const fields = [
    { label: "Location",     done: !!island },
    { label: "Farm size",    done: !!farmSize },
    { label: "Farming type", done: !!farmingType },
    { label: "Crops",        done: currentCrops.length > 0 },
  ];
  const completed = fields.filter(f => f.done).length;
  const pct = Math.round((completed / fields.length) * 100);

  if (pct === 100) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.completionBar}>
      <div style={styles.completionTop}>
        <span style={styles.completionLabel}>Profile {pct}% complete</span>
        <span style={styles.completionCount}>{completed}/{fields.length} key fields filled</span>
      </div>
      <div style={styles.completionTrack}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={styles.completionFill}
        />
      </div>
      <div style={styles.completionFields}>
        {fields.map(f => (
          <span key={f.label} style={{ ...styles.completionField, ...(f.done ? styles.completionFieldDone : {}) }}>
            {f.done ? "✓" : "○"} {f.label}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      style={styles.section}
    >
      <h2 style={styles.sectionTitle}>{title}</h2>
      <div style={styles.sectionBody}>{children}</div>
    </motion.div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, required, optional, error, hint, children }) {
  return (
    <div style={styles.field}>
      <label style={styles.fieldLabel}>
        {label}
        {required && <span style={styles.required}> *</span>}
        {optional && <span style={styles.optional}> (Optional)</span>}
      </label>
      {children}
      {hint && !error && <span style={styles.fieldHint}>{hint}</span>}
      {error && <span style={styles.fieldError}>{error}</span>}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: "100vh", background: "var(--paper-cream, #f9f6f0)", padding: "2rem 1rem"
  },
  container: {
    maxWidth: "600px", margin: "0 auto"
  },
  loading: {
    minHeight: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", color: "#666"
  },
  spinner: {
    width: "40px", height: "40px", border: "4px solid #f0f0f0",
    borderTop: "4px solid var(--soil-green)", borderRadius: "50%",
    animation: "spin 1s linear infinite", marginBottom: "1rem"
  },
  header: { marginBottom: "1.5rem" },
  backLink: {
    color: "var(--soil-green)", textDecoration: "none",
    fontSize: "0.9rem", fontWeight: "600", display: "inline-block", marginBottom: "1rem"
  },
  title: { margin: "0 0 0.4rem", fontSize: "1.75rem", fontWeight: "800", color: "var(--ink-black)" },
  subtitle: { margin: 0, color: "#666", fontSize: "0.95rem", lineHeight: 1.5 },

  savedBanner: {
    background: "#F0F9F4", border: "1px solid var(--soil-green)",
    borderRadius: "8px", padding: "0.75rem 1rem",
    color: "var(--soil-green)", fontWeight: "600",
    fontSize: "0.9rem", marginBottom: "1.5rem"
  },

  // Completion
  completionBar: {
    background: "white", borderRadius: "12px",
    border: "1px solid #e5e7eb", padding: "1rem 1.25rem",
    marginBottom: "1.5rem"
  },
  completionTop: { display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" },
  completionLabel: { fontWeight: "600", fontSize: "0.9rem", color: "var(--ink-black)" },
  completionCount: { fontSize: "0.85rem", color: "#999" },
  completionTrack: { height: "6px", background: "#f0f0f0", borderRadius: "999px", overflow: "hidden", marginBottom: "0.75rem" },
  completionFill: { height: "100%", background: "var(--soil-green)", borderRadius: "999px" },
  completionFields: { display: "flex", flexWrap: "wrap", gap: "0.5rem" },
  completionField: {
    fontSize: "0.78rem", color: "#999", padding: "0.2rem 0.6rem",
    borderRadius: "20px", background: "#f5f5f5", border: "1px solid #e5e7eb"
  },
  completionFieldDone: {
    color: "var(--soil-green)", background: "#F0F9F4", border: "1px solid var(--soil-green)"
  },

  // Sections
  section: {
    background: "white", borderRadius: "12px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
    padding: "1.5rem", marginBottom: "1.25rem"
  },
  sectionTitle: {
    margin: "0 0 1.25rem", fontSize: "1rem",
    fontWeight: "700", color: "var(--ink-black)",
    paddingBottom: "0.75rem", borderBottom: "1px solid #f0f0f0"
  },
  sectionBody: { display: "flex", flexDirection: "column", gap: "1rem" },

  // Fields
  field: { display: "flex", flexDirection: "column", gap: "0.35rem" },
  fieldLabel: { fontSize: "0.88rem", fontWeight: "600", color: "var(--ink-black)" },
  required: { color: "#ef4444" },
  optional: { color: "#999", fontWeight: "400", fontSize: "0.82rem" },
  fieldHint: { fontSize: "0.78rem", color: "#aaa" },
  fieldError: { fontSize: "0.8rem", color: "#ef4444" },
  input: {
    width: "100%", padding: "0.7rem 0.75rem", fontSize: "0.95rem",
    border: "1px solid #ddd", borderRadius: "8px",
    boxSizing: "border-box", background: "white",
    transition: "border-color 0.2s"
  },
  inputDisabled: { background: "#f9f9f9", color: "#aaa", cursor: "not-allowed" },

  // Footer
  footer: {
    display: "flex", flexDirection: "column", alignItems: "stretch",
    gap: "0.75rem", marginTop: "0.5rem", paddingBottom: "3rem"
  },
  saveBtn: {
    padding: "1rem", background: "var(--soil-green)", color: "white",
    border: "none", borderRadius: "10px", fontSize: "1rem",
    fontWeight: "700", cursor: "pointer", transition: "all 0.2s"
  },
  cancelLink: {
    textAlign: "center", color: "#999", fontSize: "0.9rem",
    textDecoration: "none", padding: "0.5rem"
  },
};

// Inject spin keyframe if not already present
const styleEl = document.createElement("style");
styleEl.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
if (!document.querySelector("style[data-profile]")) {
  styleEl.setAttribute("data-profile", "");
  document.head.appendChild(styleEl);
}
