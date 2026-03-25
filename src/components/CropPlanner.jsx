import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../firebase";
import { collection, addDoc, doc, updateDoc, arrayUnion, query, where, getDocs } from "firebase/firestore";

// ── Moon phase helpers ────────────────────────────────────────────────────────
const MOON_PHASES = [
  { name: "New Moon",        emoji: "🌑", type: "rest" },
  { name: "Waxing Crescent", emoji: "🌒", type: "leaf" },
  { name: "First Quarter",   emoji: "🌓", type: "leaf" },
  { name: "Waxing Gibbous",  emoji: "🌔", type: "fruit" },
  { name: "Full Moon",       emoji: "🌕", type: "fruit" },
  { name: "Waning Gibbous",  emoji: "🌖", type: "root" },
  { name: "Last Quarter",    emoji: "🌗", type: "root" },
  { name: "Waning Crescent", emoji: "🌘", type: "rest" },
];

const MOON_TYPE_ADVICE = {
  leaf:  { label: "Leaf Day",  color: "#5A9F6E", tip: "Ideal for sowing and transplanting leafy crops." },
  fruit: { label: "Fruit Day", color: "#E6A93C", tip: "Best for sowing fruiting crops (tomatoes, peppers, cucumbers)." },
  root:  { label: "Root Day",  color: "#9B6B3A", tip: "Good for root vegetables and harvesting." },
  rest:  { label: "Rest Day",  color: "#9B9BB4", tip: "Avoid planting. Focus on soil prep and composting." },
};

function getMoonPhase(date) {
  const knownNewMoon = new Date("2000-01-06T18:14:00Z");
  const CYCLE = 29.53058867;
  const diffDays = (date - knownNewMoon) / (1000 * 60 * 60 * 24);
  const position = ((diffDays % CYCLE) + CYCLE) % CYCLE;
  const index = Math.round((position / CYCLE) * 8) % 8;
  const phase = MOON_PHASES[index];
  return { ...phase, ...MOON_TYPE_ADVICE[phase.type], position };
}

// ── Active crop card helpers ──────────────────────────────────────────────────
function getDaysToHarvest(sowDateRaw, weeksToHarvest) {
  if (!sowDateRaw) return null;
  const sow = sowDateRaw?.toDate ? sowDateRaw.toDate() : new Date(sowDateRaw);
  const harvest = new Date(sow);
  harvest.setDate(harvest.getDate() + weeksToHarvest * 7);
  const today = new Date();
  const diff = Math.ceil((harvest - today) / (1000 * 60 * 60 * 24));
  return diff;
}

function getProgressPercent(sowDateRaw, weeksToHarvest) {
  if (!sowDateRaw) return 0;
  const sow = sowDateRaw?.toDate ? sowDateRaw.toDate() : new Date(sowDateRaw);
  const totalDays = weeksToHarvest * 7;
  const elapsed = Math.ceil((new Date() - sow) / (1000 * 60 * 60 * 24));
  return Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CropPlanner({ userData }) {
  const [showModal, setShowModal] = useState(false);
  const [savedPlans, setSavedPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Firestore crop database
  const [cropDatabase, setCropDatabase] = useState({});
  const [loadingCrops, setLoadingCrops] = useState(true);

  // Form state
  const [selectedCrop, setSelectedCrop] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [numBeds, setNumBeds] = useState(1);
  const [growingSeasonWeeks, setGrowingSeasonWeeks] = useState(52);
  const [schedule, setSchedule] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [moonMode, setMoonMode] = useState(false);

  const currentMoon = getMoonPhase(new Date(startDate));

  // Fetch crop database from Firestore
  useEffect(() => {
    const fetchCrops = async () => {
      try {
        const snap = await getDocs(collection(db, "crops"));
        const data = {};
        snap.docs.forEach(d => {
          data[d.data().name] = { id: d.id, ...d.data() };
        });
        setCropDatabase(data);
      } catch (e) {
        console.error("Error fetching crop database:", e);
      } finally {
        setLoadingCrops(false);
      }
    };
    fetchCrops();
  }, []);

  // Fetch saved plans from activities
  useEffect(() => {
    if (!userData?.userId) { setLoadingPlans(false); return; }
    const fetchPlans = async () => {
      try {
        const q = query(
          collection(db, "activities"),
          where("userId", "==", userData.userId),
          where("type", "==", "crop_plan")
        );
        const snap = await getDocs(q);
        setSavedPlans(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Error fetching plans:", e);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, [userData?.userId]);

  // Merge currentCrops from profile + saved plans into one unified list
  const profileCrops = (userData?.currentCrops || []).map(name => ({
    id: `profile-${name}`,
    cropName: name,
    sowDate: null,
    source: "profile"
  }));

  const planCrops = savedPlans.map(p => ({
    id: p.id,
    cropName: p.data?.cropName || p.title?.replace(" Planting Plan", "") || "Unknown",
    sowDate: p.data?.sowDate || null,
    harvestStart: p.data?.harvestStart || null,
    numBeds: p.data?.numBeds || 1,
    estimatedYield: p.data?.estimatedYield || null,
    source: "plan"
  }));

  // Deduplicate — plans take priority over plain profile crops
  const planCropNames = new Set(planCrops.map(p => p.cropName));
  const filteredProfileCrops = profileCrops.filter(c => !planCropNames.has(c.cropName));
  const activeCrops = [...planCrops, ...filteredProfileCrops];

  const validateInputs = () => {
    const newErrors = {};
    if (!selectedCrop) newErrors.crop = "Please select a crop";
    const selectedDate = new Date(startDate);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (selectedDate < today) newErrors.date = "Start date cannot be in the past";
    if (numBeds < 1 || numBeds > 100) newErrors.beds = "Number of beds must be between 1 and 100";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateSchedule = () => {
    if (!validateInputs()) return;
    const crop = cropDatabase[selectedCrop];
    const start = new Date(startDate);
    const totalCycle = crop.weeksToHarvest + crop.weeksOfHarvest + (crop.stalebedWeeks || 0);
    const traySowDate = new Date(start);
    const transplantDate = new Date(start);
    transplantDate.setDate(transplantDate.getDate() + (crop.weeksInTrays || 0) * 7);
    const harvestStartDate = new Date(start);
    harvestStartDate.setDate(harvestStartDate.getDate() + crop.weeksToHarvest * 7);
    const harvestEndDate = new Date(harvestStartDate);
    harvestEndDate.setDate(harvestEndDate.getDate() + crop.weeksOfHarvest * 7);
    const bedTurnoverDate = new Date(harvestEndDate);
    bedTurnoverDate.setDate(bedTurnoverDate.getDate() + (crop.stalebedWeeks || 0) * 7);
    const cyclesPerYear = Math.floor(growingSeasonWeeks / totalCycle);
    const totalYield = crop.yieldPerBed * numBeds * cyclesPerYear;
    const successionInterval = Math.ceil(totalCycle / 2);
    setSchedule({
      crop: selectedCrop,
      cropData: crop,
      traySowDate: traySowDate.toLocaleDateString(),
      transplantDate: (crop.weeksInTrays || 0) > 0 ? transplantDate.toLocaleDateString() : null,
      harvestStartDate: harvestStartDate.toLocaleDateString(),
      harvestEndDate: harvestEndDate.toLocaleDateString(),
      bedTurnoverDate: (crop.stalebedWeeks || 0) > 0 ? bedTurnoverDate.toLocaleDateString() : null,
      totalCycleWeeks: totalCycle,
      cyclesPerYear,
      numBeds,
      totalSeeds: (crop.seedsPerSowing || 0) * numBeds,
      totalSeedsForYear: (crop.seedsPerSowing || 0) * numBeds * cyclesPerYear,
      estimatedYield: `${totalYield.toLocaleString()} ${crop.yieldUnit}`,
      yieldPerCycle: `${(crop.yieldPerBed * numBeds).toLocaleString()} ${crop.yieldUnit}`,
      successionInterval,
      sowDate: traySowDate,
      transplantDateObj: (crop.weeksInTrays || 0) > 0 ? transplantDate : null,
      harvestDate: harvestStartDate,
      moon: moonMode ? {
        sow: getMoonPhase(traySowDate),
        transplant: (crop.weeksInTrays || 0) > 0 ? getMoonPhase(transplantDate) : null,
        harvest: getMoonPhase(harvestStartDate),
      } : null,
    });
  };

  const savePlan = async () => {
    if (!userData?.userId) { alert("Please log in to save plans"); return; }
    if (!schedule) { alert("Please generate a schedule first"); return; }
    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, "activities"), {
        userId: userData.userId,
        type: "crop_plan",
        category: "farming",
        title: `${schedule.crop} Planting Plan`,
        message: `Plan for ${schedule.numBeds} bed(s) of ${schedule.crop}. Sow on ${schedule.traySowDate}, harvest starting ${schedule.harvestStartDate}.`,
        icon: "🌱",
        status: "planned",
        data: {
          cropName: schedule.crop,
          sowDate: schedule.sowDate,
          transplantDate: schedule.transplantDateObj,
          harvestStart: schedule.harvestDate,
          numBeds: schedule.numBeds,
          seedsNeeded: schedule.totalSeeds,
          totalSeedsForYear: schedule.totalSeedsForYear,
          spacing: schedule.cropData.spacing,
          mulchRequired: schedule.cropData.mulch,
          estimatedYield: schedule.estimatedYield,
          yieldPerCycle: schedule.yieldPerCycle,
          totalCycleWeeks: schedule.totalCycleWeeks,
          cyclesPerYear: schedule.cyclesPerYear,
          successionInterval: schedule.successionInterval,
          moonPlanning: schedule.moon ? true : false,
        },
        createdAt: new Date(),
        expiresAt: null
      });
      await updateDoc(doc(db, "users", userData.userId), {
        currentCrops: arrayUnion(schedule.crop),
        "stats.cropsPlanted": (userData.stats?.cropsPlanted || 0) + 1,
      });
      // Add to local state immediately so card appears without refetch
      setSavedPlans(prev => [...prev, {
        id: docRef.id,
        data: {
          cropName: schedule.crop,
          sowDate: schedule.sowDate,
          harvestStart: schedule.harvestDate,
          numBeds: schedule.numBeds,
          estimatedYield: schedule.estimatedYield,
        }
      }]);
      setSaving(false);
      setShowModal(false);
      setSchedule(null);
      setSelectedCrop("");
    } catch (error) {
      console.error("Error saving plan:", error);
      alert("Failed to save plan. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div style={s.root}>

      {/* ── Active Crops ───────────────────────────────────────────────── */}
      <section style={s.section}>
        <div style={s.sectionHeader}>
          <h3 style={s.sectionTitle}>Active Crops</h3>
          <button style={s.addBtn} onClick={() => { setShowModal(true); setSchedule(null); }}>
            + Add a crop
          </button>
        </div>

        {loadingPlans ? (
          <div style={s.emptyState}>Loading your crops…</div>
        ) : activeCrops.length === 0 ? (
          <div style={s.emptyCard}>
            <span style={s.emptyIcon}>🌱</span>
            <p style={s.emptyText}>No crops added yet.</p>
            <p style={s.emptySubtext}>Tap "Add a crop" to plan your first planting.</p>
          </div>
        ) : (
          <div style={s.cropGrid}>
            {activeCrops.map((crop, i) => (
              <ActiveCropCard key={crop.id} crop={crop} index={i} cropDatabase={cropDatabase} />
            ))}
          </div>
        )}
      </section>

      {/* ── Modal ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={s.overlay}
            onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: "spring", damping: 24, stiffness: 280 }}
              style={s.modal}
            >
              <div style={s.modalHeader}>
                <h3 style={s.modalTitle}>Plan a Crop</h3>
                <button style={s.closeBtn} onClick={() => setShowModal(false)}>✕</button>
              </div>

              {/* Moon toggle */}
              <div style={s.moonRow}>
                <button
                  onClick={() => setMoonMode(m => !m)}
                  style={{ ...s.moonChip, ...(moonMode ? s.moonChipOn : {}) }}
                >
                  {moonMode ? `${currentMoon.emoji} Moon On` : "🌑 Moon Planning"}
                </button>
              </div>

              {moonMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  style={{ ...s.moonHint, borderLeft: `3px solid ${currentMoon.color}` }}
                >
                  <span style={{ fontSize: "1.4rem" }}>{currentMoon.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 600, color: currentMoon.color, fontSize: "0.9rem" }}>
                      {currentMoon.name} · {currentMoon.label}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "#666", marginTop: 2 }}>{currentMoon.tip}</div>
                  </div>
                </motion.div>
              )}

              {/* Form */}
              <div style={s.formGroup}>
                <label style={s.label}>Crop *</label>
                {loadingCrops ? (
                  <div style={s.cropLoadingHint}>Loading crops…</div>
                ) : (
                  <select
                    value={selectedCrop}
                    onChange={e => { setSelectedCrop(e.target.value); setErrors({ ...errors, crop: null }); setSchedule(null); }}
                    style={{ ...s.input, borderColor: errors.crop ? "#ef4444" : "#ddd" }}
                  >
                    <option value="">Choose a crop…</option>
                    {Object.keys(cropDatabase).sort().map(name => (
                      <option key={name} value={name}>
                        {cropDatabase[name].emoji} {name}
                      </option>
                    ))}
                  </select>
                )}
                {errors.crop && <span style={s.errorText}>{errors.crop}</span>}
              </div>

              {/* Crop quick info */}
              {selectedCrop && cropDatabase[selectedCrop] && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={s.quickInfo}>
                  <QuickStat label="Weeks to harvest" value={cropDatabase[selectedCrop].weeksToHarvest} />
                  <QuickStat label="Yield per bed" value={`${cropDatabase[selectedCrop].yieldPerBed} ${cropDatabase[selectedCrop].yieldUnit}`} />
                  <QuickStat label="Mulch" value={cropDatabase[selectedCrop].mulch ? "Yes" : "No"} />
                  <QuickStat label="Varieties" value={(cropDatabase[selectedCrop].varieties || []).join(", ")} />
                </motion.div>
              )}

              <div style={s.formRow}>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>Start Date *</label>
                  <input
                    type="date" value={startDate}
                    onChange={e => { setStartDate(e.target.value); setErrors({ ...errors, date: null }); setSchedule(null); }}
                    style={{ ...s.input, borderColor: errors.date ? "#ef4444" : "#ddd" }}
                  />
                  {errors.date && <span style={s.errorText}>{errors.date}</span>}
                </div>
                <div style={{ width: "110px" }}>
                  <label style={s.label}>Beds *</label>
                  <input
                    type="number" min="1" max="100" value={numBeds}
                    onChange={e => { setNumBeds(parseInt(e.target.value) || 1); setErrors({ ...errors, beds: null }); setSchedule(null); }}
                    style={{ ...s.input, borderColor: errors.beds ? "#ef4444" : "#ddd" }}
                  />
                  {errors.beds && <span style={s.errorText}>{errors.beds}</span>}
                </div>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>
                  Growing Season (weeks)
                  <span style={s.labelHint}> — adjust for your climate</span>
                </label>
                <input
                  type="number" min="12" max="52" value={growingSeasonWeeks}
                  onChange={e => setGrowingSeasonWeeks(parseInt(e.target.value) || 52)}
                  style={s.input}
                />
              </div>

              <button
                onClick={generateSchedule}
                disabled={loadingCrops}
                style={{ ...s.generateBtn, opacity: loadingCrops ? 0.6 : 1 }}
              >
                Generate Schedule
              </button>

              {/* Schedule output */}
              {schedule && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={s.scheduleBox}>
                  <h4 style={s.scheduleTitle}>🗓️ Planting Schedule</h4>

                  <div style={s.timelineList}>
                    <TimelineRow icon="🌱" label="Sow" date={schedule.traySowDate} moon={schedule.moon?.sow} color="#7FB34D" />
                    {schedule.transplantDate && (
                      <TimelineRow icon="🌿" label="Transplant" date={schedule.transplantDate} moon={schedule.moon?.transplant} color="#5A9F6E" />
                    )}
                    <TimelineRow icon="🌾" label="Harvest begins" date={schedule.harvestStartDate} moon={schedule.moon?.harvest} color="#E6A93C" />
                    <TimelineRow icon="✅" label="Harvest ends" date={schedule.harvestEndDate} color="#EFA8B8" />
                    {schedule.bedTurnoverDate && (
                      <TimelineRow icon="🔄" label="Bed ready" date={schedule.bedTurnoverDate} color="#9B59B6" />
                    )}
                  </div>

                  <div style={s.yieldBox}>
                    <YieldStat label="Yield this cycle" value={schedule.yieldPerCycle} />
                    <YieldStat label="Annual yield" value={schedule.estimatedYield} />
                    <YieldStat label="Cycles/year" value={schedule.cyclesPerYear} />
                    <YieldStat label="New sowing every" value={`${schedule.successionInterval} wks`} />
                  </div>

                  <div style={s.seedNote}>
                    🌰 Order ~{Math.ceil(schedule.totalSeeds * 1.2).toLocaleString()} seeds for this cycle
                    ({Math.ceil(schedule.totalSeedsForYear * 1.2).toLocaleString()} for the full year)
                    {schedule.cropData.mulch && " · Mulch required"}
                  </div>

                  <button
                    onClick={savePlan}
                    disabled={saving}
                    style={{ ...s.saveBtn, opacity: saving ? 0.7 : 1 }}
                  >
                    {saving ? "Saving…" : "💾 Save to My Planner"}
                  </button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Active Crop Card ──────────────────────────────────────────────────────────
function ActiveCropCard({ crop, index, cropDatabase }) {
  const dbEntry = cropDatabase[crop.cropName];
  const weeksToHarvest = dbEntry?.weeksToHarvest || 8;
  const daysLeft = getDaysToHarvest(crop.sowDate, weeksToHarvest);
  const progress = getProgressPercent(crop.sowDate, weeksToHarvest);
  // Use crop initial as fallback so no box/unknown-character rendering
  const emoji = dbEntry?.emoji || null;
  const fallbackInitial = crop.cropName?.charAt(0).toUpperCase() || "C";

  const harvestLabel = daysLeft === null
    ? "No sow date recorded"
    : daysLeft <= 0
    ? "Ready to harvest!"
    : daysLeft === 1
    ? "1 day to harvest"
    : `${daysLeft} days to harvest`;

  const progressColor = daysLeft !== null && daysLeft <= 7
    ? "#E6A93C"
    : "var(--soil-green)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      style={s.cropCard}
    >
      <div style={s.cropCardTop}>
        <span style={s.cropEmoji}>
          {emoji || <span style={s.cropEmojiInitial}>{fallbackInitial}</span>}
        </span>
        <div style={s.cropCardInfo}>
          <div style={s.cropName}>{crop.cropName}</div>
          {crop.numBeds && (
            <div style={s.cropMeta}>{crop.numBeds} bed{crop.numBeds > 1 ? "s" : ""}</div>
          )}
        </div>
        {daysLeft !== null && daysLeft <= 0 ? (
          <span style={s.harvestBadge}>Harvest!</span>
        ) : null}
      </div>

      {/* Progress bar */}
      <div style={s.progressTrack}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ ...s.progressFill, background: progressColor }}
        />
      </div>

      <div style={s.cropCardBottom}>
        <span style={{ ...s.harvestLabel, color: daysLeft !== null && daysLeft <= 7 ? "#E6A93C" : "#666" }}>
          {harvestLabel}
        </span>
        {crop.estimatedYield && (
          <span style={s.yieldLabel}>Est. {crop.estimatedYield}</span>
        )}
      </div>
    </motion.div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function TimelineRow({ icon, label, date, color, moon }) {
  return (
    <div style={s.timelineRow}>
      <div style={{ ...s.timelineDot, background: color }}>{icon}</div>
      <div style={s.timelineRowContent}>
        <span style={s.timelineLabel}>{label}</span>
        <span style={s.timelineDate}>{date}</span>
        {moon && (
          <span style={{ ...s.moonTag, color: moon.color }}>
            {moon.emoji} {moon.name}
          </span>
        )}
      </div>
    </div>
  );
}

function QuickStat({ label, value }) {
  return (
    <div style={s.quickStat}>
      <div style={s.quickStatVal}>{value}</div>
      <div style={s.quickStatLabel}>{label}</div>
    </div>
  );
}

function YieldStat({ label, value }) {
  return (
    <div style={s.yieldStat}>
      <div style={s.yieldStatVal}>{value}</div>
      <div style={s.yieldStatLabel}>{label}</div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  root: { paddingTop: "0.5rem" },

  // Section
  section: { marginBottom: "2rem" },
  sectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" },
  sectionTitle: { margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "var(--ink-black)" },
  addBtn: {
    padding: "0.5rem 1rem", background: "var(--soil-green)", color: "white",
    border: "none", borderRadius: "20px", fontSize: "0.9rem", fontWeight: "600",
    cursor: "pointer", display: "flex", alignItems: "center", gap: "4px"
  },

  // Empty state
  emptyCard: {
    background: "white", borderRadius: "12px", border: "2px dashed #d1d5db",
    padding: "2.5rem", textAlign: "center"
  },
  emptyIcon: { fontSize: "2.5rem" },
  emptyText: { fontWeight: "600", color: "var(--ink-black)", margin: "0.75rem 0 0.25rem" },
  emptySubtext: { color: "#999", fontSize: "0.9rem", margin: 0 },
  emptyState: { color: "#999", fontSize: "0.9rem", padding: "1rem 0" },
  cropLoadingHint: { color: "#999", fontSize: "0.9rem", padding: "0.5rem 0" },

  // Crop grid
  cropGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "1rem"
  },

  // Crop card
  cropCard: {
    background: "white", borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
    padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem"
  },
  cropCardTop: { display: "flex", alignItems: "center", gap: "0.75rem" },
  cropEmoji: { fontSize: "2rem", lineHeight: 1 },
  cropEmojiInitial: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: "2rem", height: "2rem", borderRadius: "50%",
    background: "var(--soil-green)", color: "white",
    fontSize: "1rem", fontWeight: "700", lineHeight: 1
  },
  cropCardInfo: { flex: 1 },
  cropName: { fontWeight: "700", fontSize: "1rem", color: "var(--ink-black)" },
  cropMeta: { fontSize: "0.8rem", color: "#999", marginTop: "2px" },
  harvestBadge: {
    background: "#E6A93C", color: "white", fontSize: "0.75rem",
    fontWeight: "700", padding: "0.2rem 0.6rem", borderRadius: "20px"
  },
  progressTrack: { height: "6px", background: "#f0f0f0", borderRadius: "999px", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: "999px" },
  cropCardBottom: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  harvestLabel: { fontSize: "0.82rem", fontWeight: "500" },
  yieldLabel: { fontSize: "0.78rem", color: "#999" },

  // Overlay + Modal
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
    zIndex: 1000, display: "flex", alignItems: "flex-end",
    justifyContent: "center", padding: "0"
  },
  modal: {
    background: "var(--paper-cream, #f9f6f0)", borderRadius: "20px 20px 0 0",
    width: "100%", maxWidth: "600px", maxHeight: "90vh",
    overflowY: "auto", padding: "1.75rem 1.5rem 2rem",
    boxShadow: "0 -8px 40px rgba(0,0,0,0.18)"
  },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" },
  modalTitle: { margin: 0, fontSize: "1.2rem", fontWeight: "700", color: "var(--ink-black)" },
  closeBtn: {
    background: "#eee", border: "none", borderRadius: "50%",
    width: "32px", height: "32px", cursor: "pointer",
    fontSize: "0.9rem", color: "#555", display: "flex",
    alignItems: "center", justifyContent: "center", fontWeight: "bold"
  },

  // Moon
  moonRow: { marginBottom: "0.75rem" },
  moonChip: {
    padding: "5px 12px", fontSize: "0.82rem", fontWeight: 600,
    background: "#f0f0f0", color: "#555", border: "1px solid #ddd",
    borderRadius: "20px", cursor: "pointer"
  },
  moonChipOn: { background: "#1a1a2e", color: "#e0d7ff", border: "1px solid #4a3f7a" },
  moonHint: {
    display: "flex", gap: "10px", background: "#fafafa",
    borderRadius: "8px", padding: "10px 12px", marginBottom: "0.75rem"
  },

  // Form
  formGroup: { marginBottom: "0.75rem" },
  formRow: { display: "flex", gap: "0.75rem", marginBottom: "0.75rem" },
  label: { display: "block", fontSize: "0.88rem", fontWeight: "600", color: "var(--ink-black)", marginBottom: "0.4rem" },
  labelHint: { fontWeight: 400, color: "#999", fontSize: "0.82rem" },
  input: {
    width: "100%", padding: "0.7rem 0.75rem", fontSize: "0.95rem",
    border: "1px solid #ddd", borderRadius: "8px", boxSizing: "border-box",
    background: "white"
  },
  errorText: { display: "block", color: "#ef4444", fontSize: "0.8rem", marginTop: "0.25rem" },

  // Quick info strip
  quickInfo: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
    gap: "0.5rem", background: "#f0f9f4", borderRadius: "8px",
    padding: "0.75rem", marginBottom: "0.75rem"
  },
  quickStat: { textAlign: "center" },
  quickStatVal: { fontWeight: "700", fontSize: "0.92rem", color: "var(--soil-green)" },
  quickStatLabel: { fontSize: "0.72rem", color: "#888", marginTop: "2px" },

  generateBtn: {
    width: "100%", padding: "0.85rem", background: "var(--soil-green)",
    color: "white", border: "none", borderRadius: "10px",
    fontSize: "1rem", fontWeight: "600", cursor: "pointer", marginBottom: "1rem"
  },

  // Schedule
  scheduleBox: {
    background: "white", borderRadius: "12px",
    border: "1px solid #e5e7eb", padding: "1.25rem"
  },
  scheduleTitle: { margin: "0 0 1rem", fontSize: "1rem", color: "var(--ink-black)" },
  timelineList: { display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1rem" },
  timelineRow: { display: "flex", alignItems: "flex-start", gap: "0.75rem" },
  timelineDot: {
    width: "32px", height: "32px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "1rem", flexShrink: 0
  },
  timelineRowContent: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.4rem", paddingTop: "5px" },
  timelineLabel: { fontWeight: "600", fontSize: "0.88rem", color: "var(--ink-black)" },
  timelineDate: { fontSize: "0.85rem", color: "var(--soil-green)", fontWeight: "600" },
  moonTag: { fontSize: "0.75rem", fontStyle: "italic" },

  yieldBox: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
    gap: "0.5rem", background: "#f0f9f4", borderRadius: "8px",
    padding: "0.75rem", marginBottom: "0.75rem"
  },
  yieldStat: { textAlign: "center" },
  yieldStatVal: { fontWeight: "700", fontSize: "0.9rem", color: "var(--soil-green)" },
  yieldStatLabel: { fontSize: "0.72rem", color: "#888", marginTop: "2px" },

  seedNote: {
    fontSize: "0.82rem", color: "#666", background: "#fffbeb",
    borderRadius: "6px", padding: "0.6rem 0.75rem",
    marginBottom: "0.75rem", lineHeight: 1.5
  },

  saveBtn: {
    width: "100%", padding: "0.85rem", background: "var(--deep-leaf, #2d5a27)",
    color: "white", border: "none", borderRadius: "10px",
    fontSize: "1rem", fontWeight: "600", cursor: "pointer"
  },
};