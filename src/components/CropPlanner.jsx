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
// ── Bed geometry math ──────────────────────────────────────────────────────
// crop.spacing in the crops collection is a free-text string (e.g.
// "18in row x 12in plant", "45cm x 30cm"). This pulls the first two numbers
// out of it as row/plant spacing. Convention: row spacing is listed first.
// Returns null if it can't confidently parse two numbers — callers must
// treat that as "can't compute from geometry" and fall back gracefully,
// never fabricate a spacing value.
function parseSpacingToInches(spacingStr) {
  if (!spacingStr || typeof spacingStr !== "string") return null;
  const matches = [...spacingStr.matchAll(/(\d+(?:\.\d+)?)\s*(in|inch|inches|cm|centimeters?|ft|feet|')?/gi)];
  if (matches.length < 2) return null;

  const toInches = (value, unit) => {
    const u = (unit || "in").toLowerCase();
    if (u.startsWith("cm") || u.startsWith("centimeter")) return value / 2.54;
    if (u.startsWith("ft") || u.startsWith("feet") || u === "'") return value * 12;
    return value; // default: already inches
  };

  const row   = toInches(parseFloat(matches[0][1]), matches[0][2]);
  const plant = toInches(parseFloat(matches[1][1]), matches[1][2]);
  if (!row || !plant || row <= 0 || plant <= 0) return null;
  return { rowIn: row, plantIn: plant };
}

// Checks the spacing BETWEEN rows (across bed width) against the crop's
// recommended row spacing. Returns null if there's not enough input yet.
function checkRowSpacing(widthFt, rows, spacingParsed) {
  const width = parseFloat(widthFt);
  const r = parseInt(rows, 10);
  if (!width || !r || width <= 0 || r <= 0) return null;
  const rowSpacingIn = (width * 12) / r;
  if (!spacingParsed) return { rowSpacingIn, warning: null };
  const minRequired = spacingParsed.rowIn;
  const warning = rowSpacingIn < minRequired
    ? `${r} rows in ${width}ft = ${Math.round(rowSpacingIn)}" — tighter than this crop's ${Math.round(minRequired)}" row spacing. Try fewer rows or a wider bed.`
    : null;
  return { rowSpacingIn, minRequired, warning };
}

// The three spacing scenarios shown as cards. Plant count comes straight from
// bed length ÷ in-row spacing × rows × beds — real geometry, not a guess.
// Yield/value only appear when we can derive them from real data (crop.yieldPerBed
// for yield, a matching market_prices entry for value) — never fabricated.
function computeSpacingScenarios({ crop, lengthFt, widthFt, rows, numBeds, marketPrice }) {
  const length = parseFloat(lengthFt);
  const r = parseInt(rows, 10);
  const beds = parseInt(numBeds, 10) || 1;
  const spacingParsed = parseSpacingToInches(crop?.spacing);
  if (!length || !r || !spacingParsed || length <= 0 || r <= 0) return null;

  const optimalIn = spacingParsed.plantIn;
  const scenarios = {
    optimal: { key: "optimal", label: "Optimal spacing", tag: "Recommended", inRowIn: optimalIn,
      blurb: "Best balance of yield and plant health." },
    minimum: { key: "minimum", label: "Tighter spacing", tag: "Max yield", inRowIn: optimalIn * 0.85,
      blurb: "More plants — watch airflow and disease risk.", caution: true },
    maximum: { key: "maximum", label: "Wider spacing", tag: "More airflow", inRowIn: optimalIn * 1.15,
      blurb: "Fewer, bigger plants — better airflow." },
  };

  const plantsPerBedAtOptimal = Math.floor((length * 12) / optimalIn) * r;
  const yieldPerPlant = plantsPerBedAtOptimal > 0 && crop.yieldPerBed
    ? crop.yieldPerBed / plantsPerBedAtOptimal
    : null;

  Object.values(scenarios).forEach(sc => {
    sc.plantsPerRow = Math.floor((length * 12) / sc.inRowIn);
    sc.plantsPerBed = sc.plantsPerRow * r;
    sc.totalPlants  = sc.plantsPerBed * beds;
    sc.yieldEst  = yieldPerPlant != null ? +(sc.totalPlants * yieldPerPlant).toFixed(1) : null;
    sc.valueEst  = (sc.yieldEst != null && marketPrice) ? Math.round(sc.yieldEst * marketPrice) : null;
  });

  return scenarios;
}

// Condensed — consumer-facing, not a full agronomy writeup.
const SEEDLING_METHODS = {
  buy:    { label: "Buy Seedlings",  tag: "Recommended", blurb: "Fastest to harvest, no nursery work.",     cost: "Medium",  labor: "Low"    },
  raise:  { label: "Raise Own",      tag: "Lowest cost", blurb: "Cheapest at scale, needs daily care.",      cost: "Lowest",  labor: "High"   },
  direct: { label: "Direct Sow",     tag: "Simplest",    blurb: "No transplant shock, simplest to set up.",  cost: "Low",     labor: "Medium" },
};

const SUCCESSION_OPTIONS = [
  { key: "none",     label: "Single planting",        blurb: "No repeat sowing — plan your next batch manually." },
  { key: "auto",     label: "Recommended interval",    blurb: null }, // blurb filled in with computed date
  { key: "biweekly", label: "Every 2 weeks",            blurb: null },
  { key: "monthly",  label: "Every month",              blurb: null },
];

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
export default function CropPlanner({ userData, autoOpenSignal }) {
  const [showModal, setShowModal] = useState(false);

  // Allows a parent (e.g. Home's "Add Planting" quick action) to trigger the
  // add-crop modal by bumping autoOpenSignal — no internal state coupling needed.
  useEffect(() => {
    if (autoOpenSignal) setShowModal(true);
  }, [autoOpenSignal]);
  const [savedPlans, setSavedPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Firestore crop database
  const [cropDatabase, setCropDatabase] = useState({});
  const [loadingCrops, setLoadingCrops] = useState(true);

  // Form state
  const [wizardStep, setWizardStep] = useState(0); // 0 crop, 1 bed+spacing, 2 seedling method, 3 summary, 4 succession
  const [selectedCrop, setSelectedCrop] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [numBeds, setNumBeds] = useState(1);
  const [bedLengthFt, setBedLengthFt] = useState("");
  const [bedWidthFt, setBedWidthFt] = useState("");
  const [bedRows, setBedRows] = useState(1);
  const [spacingChoice, setSpacingChoice] = useState("optimal");
  const [seedlingMethod, setSeedlingMethod] = useState("buy");
  const [successionChoice, setSuccessionChoice] = useState("none");
  const growingSeasonWeeks = 52; // no UI control for this yet — default year-round estimate
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [moonMode, setMoonMode] = useState(false);

  // Real market prices — used for the value-estimate column when a match
  // exists. Shows "—" rather than a made-up number when it doesn't.
  const [marketPrices, setMarketPrices] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "market_prices"));
        setMarketPrices(snap.docs.map(d => d.data()));
      } catch (e) {
        console.error("Error fetching market prices:", e);
      }
    })();
  }, []);

  const matchedMarketPrice = (() => {
    if (!selectedCrop) return null;
    const cropLower = selectedCrop.toLowerCase();
    const match = marketPrices.find(m =>
      m.key && (cropLower.includes(m.key) || m.key.includes(cropLower))
    );
    return match ? Number(match.market) : null;
  })();

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
    bedLengthFt: p.data?.bedLengthFt || null,
    bedWidthFt:  p.data?.bedWidthFt  || null,
    plantsPerBed: p.data?.plantsPerBed || null,
    estimatedYield: p.data?.estimatedYield || null,
    source: "plan"
  }));

  // Deduplicate — plans take priority over plain profile crops
  const planCropNames = new Set(planCrops.map(p => p.cropName));
  const filteredProfileCrops = profileCrops.filter(c => !planCropNames.has(c.cropName));
  const activeCrops = [...planCrops, ...filteredProfileCrops];

  const crop = selectedCrop ? cropDatabase[selectedCrop] : null;
  const spacingParsed = crop ? parseSpacingToInches(crop.spacing) : null;

  // Live row-spacing check — updates as the grower types width/rows
  const rowCheck = checkRowSpacing(bedWidthFt, bedRows, spacingParsed);

  // Live spacing scenarios (Optimal/Tighter/Wider) — updates as the grower types
  const scenarios = crop ? computeSpacingScenarios({
    crop, lengthFt: bedLengthFt, widthFt: bedWidthFt, rows: bedRows, numBeds, marketPrice: matchedMarketPrice,
  }) : null;
  const selectedScenario = scenarios ? scenarios[spacingChoice] : null;

  // Planting timeline — same cycle math as before, now keyed to the chosen
  // spacing scenario's plant count instead of a flat seedsPerSowing fallback.
  const timeline = crop ? (() => {
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
    const cyclesPerYear = Math.floor(growingSeasonWeeks / totalCycle) || 1;
    const successionWeeks = Math.ceil(totalCycle / 2);
    return {
      totalCycle, cyclesPerYear, successionWeeks,
      traySowDate, transplantDate, harvestStartDate, harvestEndDate, bedTurnoverDate,
      moon: moonMode ? {
        sow: getMoonPhase(traySowDate),
        transplant: (crop.weeksInTrays || 0) > 0 ? getMoonPhase(transplantDate) : null,
        harvest: getMoonPhase(harvestStartDate),
      } : null,
    };
  })() : null;

  const successionDates = timeline ? (() => {
    const weeksFor = { auto: timeline.successionWeeks, biweekly: 2, monthly: 4 }[successionChoice];
    if (!weeksFor) return null;
    const first = new Date(timeline.traySowDate);
    first.setDate(first.getDate() + weeksFor * 7);
    const second = new Date(first);
    second.setDate(second.getDate() + weeksFor * 7);
    return { first, second };
  })() : null;

  // ── Per-step validation ─────────────────────────────────────────────────
  const step0Valid = () => {
    const newErrors = {};
    if (!selectedCrop) newErrors.crop = "Please select a crop";
    const selectedDate = new Date(startDate);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (selectedDate < today) newErrors.date = "Start date cannot be in the past";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const step1Valid = () => {
    const newErrors = {};
    if (numBeds < 1 || numBeds > 100) newErrors.beds = "Beds must be between 1 and 100";
    if (!bedLengthFt || Number(bedLengthFt) <= 0) newErrors.length = "Enter bed length";
    if (!bedWidthFt  || Number(bedWidthFt)  <= 0) newErrors.width  = "Enter bed width";
    if (!bedRows     || Number(bedRows)     <= 0) newErrors.rows   = "Enter rows per bed";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && !!scenarios;
  };

  const goNext = () => {
    if (wizardStep === 0 && !step0Valid()) return;
    if (wizardStep === 1 && !step1Valid()) return;
    setWizardStep(s => Math.min(s + 1, 4));
  };
  const goBack = () => setWizardStep(s => Math.max(s - 1, 0));

  const resetWizard = () => {
    setWizardStep(0);
    setSelectedCrop("");
    setBedLengthFt("");
    setBedWidthFt("");
    setBedRows(1);
    setNumBeds(1);
    setSpacingChoice("optimal");
    setSeedlingMethod("buy");
    setSuccessionChoice("none");
    setErrors({});
  };

  const savePlan = async () => {
    if (!userData?.userId) { alert("Please log in to save plans"); return; }
    if (!crop || !timeline || !selectedScenario) { alert("Please complete the planting details first"); return; }
    setSaving(true);
    try {
      const yieldLabel = selectedScenario.yieldEst != null
        ? `${selectedScenario.yieldEst.toLocaleString()} ${crop.yieldUnit}`
        : null;
      const docRef = await addDoc(collection(db, "activities"), {
        userId: userData.userId,
        type: "crop_plan",
        category: "farming",
        title: `${selectedCrop} Planting Plan`,
        message: `${numBeds} bed(s) of ${selectedCrop}, ${selectedScenario.totalPlants.toLocaleString()} plants. Sow ${timeline.traySowDate.toLocaleDateString()}, harvest from ${timeline.harvestStartDate.toLocaleDateString()}.`,
        icon: "🌱",
        status: "planned",
        data: {
          cropName: selectedCrop,
          sowDate: timeline.traySowDate,
          transplantDate: (crop.weeksInTrays || 0) > 0 ? timeline.transplantDate : null,
          harvestStart: timeline.harvestStartDate,
          numBeds,
          bedLengthFt: Number(bedLengthFt),
          bedWidthFt: Number(bedWidthFt),
          bedRows: Number(bedRows),
          spacingChoice,
          plantsPerBed: selectedScenario.plantsPerBed,
          seedsNeeded: selectedScenario.totalPlants,
          totalSeedsForYear: selectedScenario.totalPlants * timeline.cyclesPerYear,
          spacing: crop.spacing,
          mulchRequired: crop.mulch,
          estimatedYield: yieldLabel,
          estimatedValue: selectedScenario.valueEst,
          seedlingMethod,
          totalCycleWeeks: timeline.totalCycle,
          cyclesPerYear: timeline.cyclesPerYear,
          successionChoice,
          moonPlanning: !!timeline.moon,
        },
        createdAt: new Date(),
        expiresAt: null
      });
      await updateDoc(doc(db, "users", userData.userId), {
        currentCrops: arrayUnion(selectedCrop),
        "stats.cropsPlanted": (userData.stats?.cropsPlanted || 0) + 1,
      });
      // Add to local state immediately so card appears without refetch
      setSavedPlans(prev => [...prev, {
        id: docRef.id,
        data: {
          cropName: selectedCrop,
          sowDate: timeline.traySowDate,
          harvestStart: timeline.harvestStartDate,
          numBeds,
          bedLengthFt: Number(bedLengthFt),
          bedWidthFt: Number(bedWidthFt),
          plantsPerBed: selectedScenario.plantsPerBed,
          estimatedYield: yieldLabel,
        }
      }]);
      setSaving(false);
      setShowModal(false);
      resetWizard();
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
          <button style={s.addBtn} onClick={() => { setShowModal(true); resetWizard(); }}>
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
              <div style={s.dragHandle} />
              <div style={s.modalHeader}>
                <h3 style={s.modalTitle}>{WIZARD_TITLES[wizardStep]}</h3>
                <button style={s.closeBtn} onClick={() => setShowModal(false)}>✕</button>
              </div>
              <div style={s.stepDots}>
                {[0, 1, 2, 3, 4].map(i => (
                  <span key={i} style={{ ...s.stepDot, ...(i === wizardStep ? s.stepDotOn : {}) }} />
                ))}
              </div>

              {/* ── Step 0: Crop + Date ──────────────────────────────── */}
              {wizardStep === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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

                  <div style={s.formGroup}>
                    <label style={s.label}>Crop *</label>
                    {loadingCrops ? (
                      <div style={s.cropLoadingHint}>Loading crops…</div>
                    ) : (
                      <select
                        value={selectedCrop}
                        onChange={e => { setSelectedCrop(e.target.value); setErrors({ ...errors, crop: null }); }}
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

                  {crop && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={s.quickInfo}>
                      <QuickStat label="Weeks to harvest" value={crop.weeksToHarvest} />
                      <QuickStat label="Yield/bed" value={`${crop.yieldPerBed} ${crop.yieldUnit}`} />
                      <QuickStat label="Mulch" value={crop.mulch ? "Yes" : "No"} />
                    </motion.div>
                  )}

                  <div style={s.formGroup}>
                    <label style={s.label}>Start Date *</label>
                    <input
                      type="date" value={startDate}
                      onChange={e => { setStartDate(e.target.value); setErrors({ ...errors, date: null }); }}
                      style={{ ...s.input, borderColor: errors.date ? "#ef4444" : "#ddd" }}
                    />
                    {errors.date && <span style={s.errorText}>{errors.date}</span>}
                  </div>

                  <button onClick={goNext} disabled={loadingCrops} style={{ ...s.generateBtn, opacity: loadingCrops ? 0.6 : 1 }}>
                    Next: Bed & Spacing →
                  </button>
                </motion.div>
              )}

              {/* ── Step 1: Bed Dimensions + Spacing ────────────────────── */}
              {wizardStep === 1 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div style={s.wizLabel}>Bed Dimensions</div>
                  <div style={s.formRow}>
                    <div style={{ flex: 1, minWidth: 130 }}>
                      <label style={s.label}>Length (ft) *</label>
                      <input
                        type="number" min="0" step="0.5" value={bedLengthFt}
                        onChange={e => setBedLengthFt(e.target.value)}
                        placeholder="e.g. 8" style={{ ...s.input, borderColor: errors.length ? "#ef4444" : "#ddd" }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 130 }}>
                      <label style={s.label}>Width (ft) *</label>
                      <input
                        type="number" min="0" step="0.5" value={bedWidthFt}
                        onChange={e => setBedWidthFt(e.target.value)}
                        placeholder="e.g. 4" style={{ ...s.input, borderColor: errors.width ? "#ef4444" : "#ddd" }}
                      />
                    </div>
                  </div>
                  <div style={s.formRow}>
                    <div style={{ flex: 1, minWidth: 130 }}>
                      <label style={s.label}># Beds *</label>
                      <input
                        type="number" min="1" max="100" value={numBeds}
                        onChange={e => setNumBeds(parseInt(e.target.value) || 1)}
                        style={{ ...s.input, borderColor: errors.beds ? "#ef4444" : "#ddd" }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 130 }}>
                      <label style={s.label}># Rows/bed *</label>
                      <input
                        type="number" min="1" max="20" value={bedRows}
                        onChange={e => setBedRows(parseInt(e.target.value) || 1)}
                        style={{ ...s.input, borderColor: errors.rows ? "#ef4444" : "#ddd" }}
                      />
                    </div>
                  </div>

                  {rowCheck?.warning && (
                    <div style={s.geometryPreviewMuted}>⚠️ {rowCheck.warning}</div>
                  )}
                  {!rowCheck && (
                    <div style={s.rowNote}>Enter dimensions above — spacing options update live.</div>
                  )}

                  {scenarios && (
                    <>
                      <div style={s.wizLabel}>Choose spacing:</div>
                      {["optimal", "minimum", "maximum"].map(key => {
                        const sc = scenarios[key];
                        return (
                          <div
                            key={key}
                            onClick={() => setSpacingChoice(key)}
                            style={{ ...s.spacingCard, ...(spacingChoice === key ? s.spacingCardOn : {}) }}
                          >
                            <div style={s.spacingHdr}>
                              <div style={s.spacingName}>{sc.label}</div>
                              <span style={{ ...s.spacingTag, ...(sc.caution ? s.spacingTagCaution : {}) }}>{sc.tag}</span>
                            </div>
                            <div style={s.spacingStats}>
                              <div style={s.spacingStat}><strong>{sc.totalPlants.toLocaleString()}</strong><span>Plants</span></div>
                              <div style={s.spacingStat}><strong>{sc.yieldEst != null ? `${sc.yieldEst.toLocaleString()} ${crop.yieldUnit}` : "—"}</strong><span>Yield est.</span></div>
                              <div style={s.spacingStat}><strong>{sc.valueEst != null ? `$${sc.valueEst.toLocaleString()}` : "—"}</strong><span>Value est.</span></div>
                            </div>
                            <div style={s.spacingBlurb}>{sc.blurb}</div>
                          </div>
                        );
                      })}
                    </>
                  )}
                  {!scenarios && bedLengthFt && bedWidthFt && bedRows && (
                    <div style={s.geometryPreviewMuted}>
                      Can't calculate plant count for this crop's spacing data yet.
                    </div>
                  )}

                  <div style={s.stepBtnRow}>
                    <button onClick={goNext} style={s.generateBtn}>Next: Seedling Strategy →</button>
                    <button onClick={goBack} style={s.backBtn}>← Back</button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 2: Seedling Strategy ────────────────────────────── */}
              {wizardStep === 2 && selectedScenario && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div style={s.stepIntro}>
                    You have <strong>{selectedScenario.totalPlants.toLocaleString()} plants</strong> planned at <strong>{spacingChoice}</strong> spacing. How are you getting them in the ground?
                  </div>
                  {Object.entries(SEEDLING_METHODS).map(([key, m]) => (
                    <div
                      key={key}
                      onClick={() => setSeedlingMethod(key)}
                      style={{ ...s.methodCard, ...(seedlingMethod === key ? s.methodCardOn : {}) }}
                    >
                      <div style={s.spacingHdr}>
                        <div style={s.spacingName}>{m.label}</div>
                        <span style={s.spacingTag}>{m.tag}</span>
                      </div>
                      <div style={s.methodBlurb}>{m.blurb}</div>
                      <div style={s.methodMeta}>Cost: {m.cost} · Labor: {m.labor}</div>
                    </div>
                  ))}
                  <div style={s.stepBtnRow}>
                    <button onClick={goNext} style={s.generateBtn}>Next: Summary →</button>
                    <button onClick={goBack} style={s.backBtn}>← Back</button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Summary ──────────────────────────────────────── */}
              {wizardStep === 3 && selectedScenario && timeline && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div style={s.summaryBox}>
                    <SummaryRow label="Crop" value={selectedCrop} />
                    <SummaryRow label="Spacing" value={scenarios[spacingChoice].label} />
                    <SummaryRow label="Method" value={SEEDLING_METHODS[seedlingMethod].label} />
                    <SummaryRow label="Total plants" value={selectedScenario.totalPlants.toLocaleString()} />
                    <SummaryRow label="Yield est." value={selectedScenario.yieldEst != null ? `${selectedScenario.yieldEst.toLocaleString()} ${crop.yieldUnit}` : "—"} highlight />
                    <SummaryRow label="Value est." value={selectedScenario.valueEst != null ? `$${selectedScenario.valueEst.toLocaleString()}` : "—"} highlight />
                    <SummaryRow label="First harvest" value={timeline.harvestStartDate.toLocaleDateString()} />
                    <SummaryRow label="Cost / Labor" value={`${SEEDLING_METHODS[seedlingMethod].cost} / ${SEEDLING_METHODS[seedlingMethod].labor}`} />
                  </div>
                  <div style={s.seedNote}>
                    🌰 Order ~{Math.ceil(selectedScenario.totalPlants * 1.2).toLocaleString()} seeds/plants for this cycle.
                    {crop.mulch && " Mulch recommended."}
                  </div>
                  <div style={s.stepBtnRow}>
                    <button onClick={goNext} style={s.generateBtn}>Next: Succession →</button>
                    <button onClick={goBack} style={s.backBtn}>← Back</button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 4: Succession ───────────────────────────────────── */}
              {wizardStep === 4 && timeline && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div style={s.wizLabel}>Choose succession interval:</div>
                  {SUCCESSION_OPTIONS.map(opt => {
                    let blurb = opt.blurb;
                    if (!blurb && opt.key === successionChoice && successionDates) {
                      blurb = `Next sow: ${successionDates.first.toLocaleDateString()}, then ${successionDates.second.toLocaleDateString()}`;
                    } else if (!blurb) {
                      const weeksFor = { auto: timeline.successionWeeks, biweekly: 2, monthly: 4 }[opt.key];
                      blurb = weeksFor ? `Resow every ${weeksFor} wks` : "";
                    }
                    return (
                      <div
                        key={opt.key}
                        onClick={() => setSuccessionChoice(opt.key)}
                        style={{ ...s.succCard, ...(successionChoice === opt.key ? s.succCardOn : {}) }}
                      >
                        <div style={s.succLabel}>{opt.label}</div>
                        <div style={s.succBlurb}>{blurb}</div>
                      </div>
                    );
                  })}

                  <button onClick={savePlan} disabled={saving} style={{ ...s.saveBtn, opacity: saving ? 0.7 : 1 }}>
                    {saving ? "Saving…" : "✓ Save Planting"}
                  </button>
                  <button onClick={goBack} style={s.backBtn}>← Back</button>
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
            <div style={s.cropMeta}>
              {crop.numBeds} bed{crop.numBeds > 1 ? "s" : ""}
              {crop.bedLengthFt && crop.bedWidthFt ? ` · ${crop.bedLengthFt}×${crop.bedWidthFt}ft` : ""}
              {crop.plantsPerBed ? ` · ${crop.plantsPerBed.toLocaleString()} plants/bed` : ""}
            </div>
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
const WIZARD_TITLES = ["Plan a Crop", "Bed & Spacing", "Seedling Strategy", "Summary", "Succession"];

function SummaryRow({ label, value, highlight }) {
  return (
    <div style={s.summaryRow}>
      <span style={s.summaryLabel}>{label}</span>
      <span style={{ ...s.summaryValue, ...(highlight ? s.summaryValueHi : {}) }}>{value}</span>
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
  formRow: { display: "flex", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" },
  label: { display: "block", fontSize: "0.88rem", fontWeight: "600", color: "var(--ink-black)", marginBottom: "0.4rem" },
  labelHint: { fontWeight: 400, color: "#999", fontSize: "0.82rem" },
  geometryPreview: {
    background: "#F0F9F4", border: "1px solid var(--soil-green)", borderRadius: "8px",
    padding: "0.6rem 0.85rem", marginBottom: "0.85rem", fontSize: "0.85rem", color: "var(--ink-black)"
  },
  geometryPreviewMuted: {
    background: "#fafafa", border: "1px solid #eee", borderRadius: "8px",
    padding: "0.6rem 0.85rem", marginBottom: "0.85rem", fontSize: "0.8rem", color: "#888"
  },
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

  // Wizard chrome
  dragHandle: { width: 36, height: 4, background: "#ddd", borderRadius: 4, margin: "0 auto 0.75rem" },
  stepDots:   { display: "flex", gap: 6, justifyContent: "center", marginBottom: "1.1rem" },
  stepDot:    { width: 6, height: 6, borderRadius: "50%", background: "#e0ddd4" },
  stepDotOn:  { background: "var(--soil-green)", width: 18, borderRadius: 4 },
  wizLabel:   { fontSize: "0.78rem", fontWeight: 700, color: "var(--ink-black)", margin: "0.9rem 0 0.5rem" },
  rowNote:    { fontSize: "0.8rem", color: "#999", background: "#fafafa", borderRadius: 8, padding: "0.6rem 0.8rem", marginBottom: "0.75rem" },
  stepIntro:  { fontSize: "0.85rem", color: "#666", lineHeight: 1.5, marginBottom: "0.9rem" },
  stepBtnRow: { display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" },
  backBtn: {
    width: "100%", padding: "0.75rem", background: "none",
    color: "#666", border: "1px solid #ddd", borderRadius: "10px",
    fontSize: "0.92rem", fontWeight: "600", cursor: "pointer"
  },

  // Spacing scenario cards
  spacingCard: {
    border: "1px solid #e5e7eb", borderRadius: "12px", padding: "0.9rem 1rem",
    marginBottom: "0.7rem", cursor: "pointer", background: "white"
  },
  spacingCardOn: { border: "2px solid var(--soil-green)", background: "#F7FBF4" },
  spacingHdr: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" },
  spacingName: { fontWeight: 700, fontSize: "0.92rem", color: "var(--ink-black)" },
  spacingTag: {
    fontSize: "0.68rem", fontWeight: 700, color: "var(--soil-green)",
    background: "#E8F5E0", padding: "0.15rem 0.5rem", borderRadius: 20
  },
  spacingTagCaution: { color: "#B45309", background: "#FEF3C7" },
  spacingStats: { display: "flex", gap: "1.2rem", marginBottom: "0.4rem" },
  spacingStat: { display: "flex", flexDirection: "column", fontSize: "0.7rem", color: "#888" },
  spacingBlurb: { fontSize: "0.78rem", color: "#666" },

  // Seedling method cards
  methodCard: {
    border: "1px solid #e5e7eb", borderRadius: "12px", padding: "0.9rem 1rem",
    marginBottom: "0.7rem", cursor: "pointer", background: "white"
  },
  methodCardOn: { border: "2px solid var(--soil-green)", background: "#F7FBF4" },
  methodBlurb: { fontSize: "0.82rem", color: "#555", marginBottom: "0.35rem" },
  methodMeta: { fontSize: "0.74rem", color: "#999" },

  // Summary
  summaryBox: {
    background: "white", border: "1px solid #e5e7eb", borderRadius: "12px",
    padding: "0.4rem 1rem", marginBottom: "0.9rem"
  },
  summaryRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "0.55rem 0", borderBottom: "1px solid #f0f0f0", fontSize: "0.85rem"
  },
  summaryLabel: { color: "#888" },
  summaryValue: { fontWeight: 600, color: "var(--ink-black)" },
  summaryValueHi: { color: "var(--soil-green)", fontWeight: 700 },

  // Succession cards
  succCard: {
    border: "1px solid #e5e7eb", borderRadius: "12px", padding: "0.8rem 1rem",
    marginBottom: "0.6rem", cursor: "pointer", background: "white"
  },
  succCardOn: { border: "2px solid var(--soil-green)", background: "#F7FBF4" },
  succLabel: { fontWeight: 700, fontSize: "0.88rem", color: "var(--ink-black)" },
  succBlurb: { fontSize: "0.78rem", color: "#888", marginTop: "0.2rem" },

  seedNote: {
    fontSize: "0.82rem", color: "#666", background: "#fffbeb",
    borderRadius: "6px", padding: "0.6rem 0.75rem",
    marginBottom: "0.75rem", lineHeight: 1.5
  },

  saveBtn: {
    width: "100%", padding: "0.85rem", background: "var(--deep-leaf, #2d5a27)",
    color: "white", border: "none", borderRadius: "10px",
    fontSize: "1rem", fontWeight: "600", cursor: "pointer", marginBottom: "0.5rem"
  },
};
