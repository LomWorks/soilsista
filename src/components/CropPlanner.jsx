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
// crop.spacing in the crops collection is free text in the grower's own
// format, e.g. "2 rows, every 18\"" — meaning: default 2 rows per bed, plants
// spaced 18" apart along each row. Older/alt formats like "18in x 12in" also
// appear. This returns { inRowIn, dbRows } where possible:
//   inRowIn — inches between plants along a row (drives plant count)
//   dbRows  — the row count baked into the string (used as the default for
//             the rows-per-bed input; the user can override it)
// Returns null when it can't confidently read an in-row spacing number — the
// caller must degrade gracefully, never fabricate spacing.
function parseSpacing(spacingStr) {
  if (!spacingStr || typeof spacingStr !== "string") return null;

  const toInches = (value, unit) => {
    const u = (unit || "in").toLowerCase();
    if (u.startsWith("cm") || u.startsWith("centimeter")) return value / 2.54;
    if (u.startsWith("ft") || u.startsWith("feet") || u === "'") return value * 12;
    return value; // default: inches
  };

  // Format A — "<N> rows, every <X>"" (the primary DB format)
  const rowsMatch    = spacingStr.match(/(\d+)\s*rows?/i);
  const everyMatch   = spacingStr.match(/every\s*(\d+(?:\.\d+)?)\s*(in|inch|inches|cm|centimeters?|ft|feet|"|')?/i);
  if (everyMatch) {
    const inRowIn = toInches(parseFloat(everyMatch[1]), everyMatch[2] === '"' ? "in" : everyMatch[2]);
    if (inRowIn > 0) {
      return { inRowIn, dbRows: rowsMatch ? parseInt(rowsMatch[1], 10) : null };
    }
  }

  // Format B — "<A> x <B>" or "<A>in row x <B>in plant" (fallback: 2nd number
  // is in-row plant spacing, 1st is row spacing → we only need in-row here)
  const nums = [...spacingStr.matchAll(/(\d+(?:\.\d+)?)\s*(in|inch|inches|cm|centimeters?|ft|feet|"|')?/gi)];
  if (nums.length >= 2) {
    const inRowIn = toInches(parseFloat(nums[1][1]), nums[1][2] === '"' ? "in" : nums[1][2]);
    if (inRowIn > 0) return { inRowIn, dbRows: null };
  }
  if (nums.length === 1) {
    const inRowIn = toInches(parseFloat(nums[0][1]), nums[0][2] === '"' ? "in" : nums[0][2]);
    if (inRowIn > 0) return { inRowIn, dbRows: null };
  }

  return null;
}

// The three spacing scenarios shown as cards. Plant count comes straight from
// bed length ÷ in-row spacing × rows × beds — real geometry, not a guess.
// Yield/value only appear when derivable from real data (crop.yieldPerBed for
// yield, a matching market_prices entry for value) — never fabricated.
function computeSpacingScenarios({ crop, lengthFt, rows, numBeds, marketPrice }) {
  const length = parseFloat(lengthFt);
  const r = parseInt(rows, 10);
  const beds = parseInt(numBeds, 10) || 1;
  const parsed = parseSpacing(crop?.spacing);
  if (!length || !r || !parsed || length <= 0 || r <= 0) return null;

  const optimalIn = parsed.inRowIn;
  const scenarios = {
    maximum: { key: "maximum", label: "Maximum density", tag: "Max yield", inRowIn: optimalIn * 0.85,
      blurb: "Tightest spacing, highest plant count — watch airflow and disease.", caution: true },
    optimal: { key: "optimal", label: "Optimal", tag: "Recommended", inRowIn: optimalIn,
      blurb: "Balanced spacing — best yield per plant and plant health." },
    airflow: { key: "airflow", label: "More airflow", tag: "Airflow", inRowIn: optimalIn * 1.15,
      blurb: "Wider spacing — fewer, bigger plants, better disease resistance." },
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

// Per-bed succession stagger. If the grower enters multiple beds of the same
// crop, we spread their sow dates so supply is continuous rather than all
// maturing at once. There's no dedicated resow-interval field in the crops
// collection, so we derive one:
//   - spread the beds evenly across the crop's harvest window (weeksOfHarvest),
//     capped so beds never sow further apart than the time to first harvest.
// Clearly a derived default — add a real `resowIntervalWeeks` field per crop
// later to override this.
function deriveResowIntervalWeeks(crop) {
  const harvestWks = Number(crop?.weeksOfHarvest) || 0;
  const toHarvestWks = Number(crop?.weeksToHarvest) || 4;
  if (harvestWks <= 0) return Math.min(2, toHarvestWks); // no window info → 2wk default
  // A new bed every ~half the harvest window keeps continuous supply without
  // over-staggering; never longer than time-to-first-harvest.
  return Math.max(1, Math.min(Math.round(harvestWks / 2), toHarvestWks));
}

function buildSuccessionTable(crop, numBeds, firstSowDate, intervalWeeksOverride) {
  const beds = parseInt(numBeds, 10) || 1;
  const intervalWks = intervalWeeksOverride || deriveResowIntervalWeeks(crop);
  const rows = [];
  for (let i = 0; i < beds; i++) {
    const sow = new Date(firstSowDate);
    sow.setDate(sow.getDate() + i * intervalWks * 7);
    const harvest = new Date(sow);
    harvest.setDate(harvest.getDate() + (Number(crop?.weeksToHarvest) || 0) * 7);
    rows.push({ bed: i + 1, sowDate: sow, harvestDate: harvest });
  }
  return { intervalWks, rows };
}

// Method cards — order matters: Direct Sow shown first per the confirmed spec.
// Each method's date preview is computed live from the crop's DB fields.
const SEEDLING_METHODS = {
  direct: { label: "Direct Sow",       tag: "Simplest",    blurb: "Sow straight into the bed — no transplant shock." },
  raise:  { label: "Raise Own Seedlings", tag: "Lowest cost", blurb: "Start in trays first — cheapest at scale, needs daily care." },
  buy:    { label: "Purchase Seedlings",  tag: "Fastest",     blurb: "Buy ready seedlings — fastest to harvest, no nursery work." },
};
const METHOD_ORDER = ["direct", "raise", "buy"];

const SUCCESSION_OPTIONS = [
  { key: "none",     label: "Single planting",       blurb: "No repeat sowing — plan your next batch manually." },
  { key: "auto",     label: "Recommended interval",  blurb: null }, // filled with derived interval
  { key: "weekly",   label: "Every week",            blurb: null },
  { key: "biweekly", label: "Every 2 weeks",         blurb: null },
  { key: "triweekly",label: "Every 3 weeks",         blurb: null },
  { key: "monthly",  label: "Every month",           blurb: null },
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

  // Form state — steps follow the confirmed spec:
  //   0 = basics (crop, variety, date, bed dims, rows, #beds)
  //   1 = method (Direct/Raise/Buy) + spacing options within it
  //   2 = your plan (summary + succession table)
  //   3 = future planting prompt
  const [wizardStep, setWizardStep] = useState(0);
  const [selectedCrop, setSelectedCrop] = useState("");
  const [selectedVariety, setSelectedVariety] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [numBeds, setNumBeds] = useState(1);
  const [bedLengthFt, setBedLengthFt] = useState("");
  const [bedWidthFt, setBedWidthFt] = useState("");
  const [bedRows, setBedRows] = useState("");        // empty until a crop is picked; then DB-defaulted, user-overridable
  const [rowsTouched, setRowsTouched] = useState(false); // once the user edits rows, stop auto-filling from DB
  const [seedlingMethod, setSeedlingMethod] = useState("direct");
  const [spacingChoice, setSpacingChoice] = useState("optimal");
  const [successionChoice, setSuccessionChoice] = useState("none");
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
  const parsedSpacing = crop ? parseSpacing(crop.spacing) : null;
  const varietyOptions = crop?.varieties || [];

  // DB-default rows: when a crop is picked and the user hasn't manually
  // changed rows yet, pre-fill from the crop's spacing string (e.g.
  // "2 rows, every 18\"" → 2). User can override; once they do, we stop
  // auto-filling. This effect keeps that behaviour reactive to crop changes.
  useEffect(() => {
    if (crop && !rowsTouched) {
      const dbRows = parsedSpacing?.dbRows;
      setBedRows(dbRows && dbRows > 0 ? String(dbRows) : "1");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCrop]);

  // Reset variety when crop changes (varieties are crop-specific)
  useEffect(() => {
    setSelectedVariety("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCrop]);

  // Live spacing scenarios (Max density / Optimal / Airflow) — updates as typed
  const scenarios = crop ? computeSpacingScenarios({
    crop, lengthFt: bedLengthFt, rows: bedRows, numBeds, marketPrice: matchedMarketPrice,
  }) : null;
  const selectedScenario = scenarios ? scenarios[spacingChoice] : null;

  // Method-specific date preview — each of Direct/Raise/Buy resolves to its
  // own set of dates from the crop's DB fields.
  const methodDates = crop ? (() => {
    const start = new Date(startDate);
    const nurseryWks = Number(crop.weeksInTrays) || 0;
    const toHarvestWks = Number(crop.weeksToHarvest) || 0;
    const harvestWks = Number(crop.weeksOfHarvest) || 0;

    // Direct sow: seed goes in the ground on the start date
    const directHarvest = new Date(start);
    directHarvest.setDate(directHarvest.getDate() + toHarvestWks * 7);
    const directHarvestEnd = new Date(directHarvest);
    directHarvestEnd.setDate(directHarvestEnd.getDate() + harvestWks * 7);

    // Raise own: sow in trays on start date, transplant after nursery period,
    // then harvest counts from transplant.
    const raiseTransplant = new Date(start);
    raiseTransplant.setDate(raiseTransplant.getDate() + nurseryWks * 7);
    const raiseHarvest = new Date(raiseTransplant);
    raiseHarvest.setDate(raiseHarvest.getDate() + toHarvestWks * 7);

    // Purchase: order ahead so seedlings are ready to transplant on start date;
    // transplant on start date, harvest counts from there.
    const buyOrderBy = new Date(start);
    buyOrderBy.setDate(buyOrderBy.getDate() - nurseryWks * 7);
    const buyHarvest = new Date(start);
    buyHarvest.setDate(buyHarvest.getDate() + toHarvestWks * 7);

    return {
      nurseryWks, toHarvestWks, harvestWks,
      direct: { sowDate: start, harvestStart: directHarvest, harvestEnd: directHarvestEnd },
      raise:  { sowDate: start, transplantDate: raiseTransplant, harvestStart: raiseHarvest },
      buy:    { orderByDate: buyOrderBy, transplantDate: start, harvestStart: buyHarvest },
    };
  })() : null;

  // The active method's first sow/transplant date drives the succession table
  const firstSowDate = methodDates ? (
    seedlingMethod === "buy" ? methodDates.buy.transplantDate
      : seedlingMethod === "raise" ? methodDates.raise.sowDate
      : methodDates.direct.sowDate
  ) : new Date(startDate);

  const activeHarvestStart = methodDates ? methodDates[seedlingMethod].harvestStart : null;

  // Per-bed succession table (staggered sow dates across the beds entered)
  const succession = crop ? buildSuccessionTable(crop, numBeds, firstSowDate) : null;

  // ── Per-step validation ─────────────────────────────────────────────────
  const step0Valid = () => {
    const newErrors = {};
    if (!selectedCrop) newErrors.crop = "Please select a crop";
    const selectedDate = new Date(startDate);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (selectedDate < today) newErrors.date = "Start date cannot be in the past";
    if (numBeds < 1 || numBeds > 100) newErrors.beds = "Beds must be 1–100";
    if (!bedLengthFt || Number(bedLengthFt) <= 0) newErrors.length = "Enter bed length";
    if (!bedWidthFt  || Number(bedWidthFt)  <= 0) newErrors.width  = "Enter bed width";
    if (!bedRows     || Number(bedRows)     <= 0) newErrors.rows   = "Enter rows per bed";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const step1Valid = () => !!scenarios && !!selectedScenario;

  const goNext = () => {
    if (wizardStep === 0 && !step0Valid()) return;
    if (wizardStep === 1 && !step1Valid()) return;
    setWizardStep(s => Math.min(s + 1, 3));
  };
  const goBack = () => setWizardStep(s => Math.max(s - 1, 0));

  const resetWizard = () => {
    setWizardStep(0);
    setSelectedCrop("");
    setSelectedVariety("");
    setBedLengthFt("");
    setBedWidthFt("");
    setBedRows("");
    setRowsTouched(false);
    setNumBeds(1);
    setSpacingChoice("optimal");
    setSeedlingMethod("direct");
    setSuccessionChoice("none");
    setErrors({});
  };

  const savePlan = async () => {
    if (!userData?.userId) { alert("Please log in to save plans"); return; }
    if (!crop || !methodDates || !selectedScenario) { alert("Please complete the planting details first"); return; }
    setSaving(true);
    try {
      const yieldLabel = selectedScenario.yieldEst != null
        ? `${selectedScenario.yieldEst.toLocaleString()} ${crop.yieldUnit}`
        : null;
      const cropLabel = selectedVariety ? `${selectedCrop} (${selectedVariety})` : selectedCrop;
      const docRef = await addDoc(collection(db, "activities"), {
        userId: userData.userId,
        type: "crop_plan",
        category: "farming",
        title: `${cropLabel} Planting Plan`,
        message: `${numBeds} bed(s) of ${cropLabel}, ${selectedScenario.totalPlants.toLocaleString()} plants. First sow ${firstSowDate.toLocaleDateString()}, harvest from ${activeHarvestStart.toLocaleDateString()}.`,
        icon: "🌱",
        status: "planned",
        data: {
          cropName: selectedCrop,
          variety: selectedVariety || null,
          sowDate: firstSowDate,
          transplantDate: seedlingMethod === "direct" ? null
            : (seedlingMethod === "raise" ? methodDates.raise.transplantDate : methodDates.buy.transplantDate),
          harvestStart: activeHarvestStart,
          numBeds,
          bedLengthFt: Number(bedLengthFt),
          bedWidthFt: Number(bedWidthFt),
          bedRows: Number(bedRows),
          spacingChoice,
          plantsPerBed: selectedScenario.plantsPerBed,
          seedsNeeded: selectedScenario.totalPlants,
          spacing: crop.spacing,
          mulchRequired: crop.mulch,
          estimatedYield: yieldLabel,
          estimatedValue: selectedScenario.valueEst,
          seedlingMethod,
          successionChoice,
          successionIntervalWks: succession?.intervalWks || null,
          successionTable: succession
            ? succession.rows.map(r => ({ bed: r.bed, sowDate: r.sowDate.toISOString(), harvestDate: r.harvestDate.toISOString() }))
            : null,
          moonPlanning: moonMode,
        },
        createdAt: new Date(),
        expiresAt: null
      });
      await updateDoc(doc(db, "users", userData.userId), {
        currentCrops: arrayUnion(selectedCrop),
        "stats.cropsPlanted": (userData.stats?.cropsPlanted || 0) + 1,
      });
      setSavedPlans(prev => [...prev, {
        id: docRef.id,
        data: {
          cropName: selectedCrop,
          variety: selectedVariety || null,
          sowDate: firstSowDate,
          harvestStart: activeHarvestStart,
          numBeds,
          bedLengthFt: Number(bedLengthFt),
          bedWidthFt: Number(bedWidthFt),
          plantsPerBed: selectedScenario.plantsPerBed,
          estimatedYield: yieldLabel,
        }
      }]);
      setSaving(false);
      // Move to Step 3 (future-planting prompt) instead of closing outright
      setWizardStep(3);
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
                {[0, 1, 2, 3].map(i => (
                  <span key={i} style={{ ...s.stepDot, ...(i === wizardStep ? s.stepDotOn : {}) }} />
                ))}
              </div>

              {/* ── Step 0: What & when ──────────────────────────────── */}
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
                        onChange={e => { setSelectedCrop(e.target.value); setRowsTouched(false); setErrors({ ...errors, crop: null }); }}
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

                  {/* Variety — populated from crop.varieties, only shown when the crop has any */}
                  {crop && varietyOptions.length > 0 && (
                    <div style={s.formGroup}>
                      <label style={s.label}>Variety <span style={s.labelHint}>— optional</span></label>
                      <select
                        value={selectedVariety}
                        onChange={e => setSelectedVariety(e.target.value)}
                        style={s.input}
                      >
                        <option value="">Any / not sure</option>
                        {varietyOptions.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  )}

                  {crop && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={s.quickInfo}>
                      <QuickStat label="Weeks to harvest" value={crop.weeksToHarvest} />
                      <QuickStat label="Yield/bed" value={`${crop.yieldPerBed} ${crop.yieldUnit}`} />
                      <QuickStat label="Mulch" value={crop.mulch ? "Yes" : "No"} />
                    </motion.div>
                  )}

                  <div style={s.formGroup}>
                    <label style={s.label}>Planting Date *</label>
                    <input
                      type="date" value={startDate}
                      onChange={e => { setStartDate(e.target.value); setErrors({ ...errors, date: null }); }}
                      style={{ ...s.input, borderColor: errors.date ? "#ef4444" : "#ddd" }}
                    />
                    {errors.date && <span style={s.errorText}>{errors.date}</span>}
                  </div>

                  <div style={s.wizLabel}>Bed Dimensions</div>
                  <div style={s.formRow}>
                    <div style={{ flex: 1, minWidth: 130 }}>
                      <label style={s.label}>Length (ft) *</label>
                      <input
                        type="number" min="0" step="0.5" value={bedLengthFt}
                        onChange={e => { setBedLengthFt(e.target.value); setErrors({ ...errors, length: null }); }}
                        placeholder="e.g. 8" style={{ ...s.input, borderColor: errors.length ? "#ef4444" : "#ddd" }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 130 }}>
                      <label style={s.label}>Width (ft) *</label>
                      <input
                        type="number" min="0" step="0.5" value={bedWidthFt}
                        onChange={e => { setBedWidthFt(e.target.value); setErrors({ ...errors, width: null }); }}
                        placeholder="e.g. 4" style={{ ...s.input, borderColor: errors.width ? "#ef4444" : "#ddd" }}
                      />
                    </div>
                  </div>
                  <div style={s.formRow}>
                    <div style={{ flex: 1, minWidth: 130 }}>
                      <label style={s.label}># Beds *</label>
                      <input
                        type="number" min="1" max="100" value={numBeds}
                        onChange={e => { setNumBeds(parseInt(e.target.value) || 1); setErrors({ ...errors, beds: null }); }}
                        style={{ ...s.input, borderColor: errors.beds ? "#ef4444" : "#ddd" }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 130 }}>
                      <label style={s.label}>
                        # Rows/bed *
                        {parsedSpacing?.dbRows && !rowsTouched && <span style={s.labelHint}> — from crop</span>}
                      </label>
                      <input
                        type="number" min="1" max="20" value={bedRows}
                        onChange={e => { setBedRows(e.target.value); setRowsTouched(true); setErrors({ ...errors, rows: null }); }}
                        style={{ ...s.input, borderColor: errors.rows ? "#ef4444" : "#ddd" }}
                      />
                    </div>
                  </div>

                  <button onClick={goNext} disabled={loadingCrops} style={{ ...s.generateBtn, opacity: loadingCrops ? 0.6 : 1 }}>
                    Next: How are you planting? →
                  </button>
                </motion.div>
              )}

              {/* ── Step 1: Method first, then spacing within it ─────────── */}
              {wizardStep === 1 && crop && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div style={s.wizLabel}>How are you planting?</div>
                  {METHOD_ORDER.map(key => {
                    const m = SEEDLING_METHODS[key];
                    const d = methodDates?.[key];
                    return (
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
                        {/* Method-specific date preview from the crop's DB fields */}
                        {d && (
                          <div style={s.methodDates}>
                            {key === "direct" && (
                              <>Sow {d.sowDate.toLocaleDateString()} · First harvest {d.harvestStart.toLocaleDateString()} · {methodDates.toHarvestWks} wks to harvest</>
                            )}
                            {key === "raise" && (
                              <>Sow trays {d.sowDate.toLocaleDateString()} · Transplant {d.transplantDate.toLocaleDateString()} ({methodDates.nurseryWks}-wk nursery) · Harvest {d.harvestStart.toLocaleDateString()}</>
                            )}
                            {key === "buy" && (
                              <>Order by {d.orderByDate.toLocaleDateString()} · Transplant {d.transplantDate.toLocaleDateString()} · Harvest {d.harvestStart.toLocaleDateString()}</>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {scenarios ? (
                    <>
                      <div style={s.wizLabel}>Spacing — {selectedScenario?.totalPlants?.toLocaleString()} plants at your pick</div>
                      {["maximum", "optimal", "airflow"].map(key => {
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
                  ) : (
                    <div style={s.geometryPreviewMuted}>
                      Can't calculate plant count from this crop's spacing data ({crop.spacing || "not set"}).
                    </div>
                  )}

                  <div style={s.stepBtnRow}>
                    <button onClick={goNext} style={s.generateBtn}>Next: Your plan →</button>
                    <button onClick={goBack} style={s.backBtn}>← Back</button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 2: Your plan (summary + succession table) ───────── */}
              {wizardStep === 2 && selectedScenario && methodDates && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div style={s.summaryBox}>
                    <SummaryRow label="Crop" value={selectedVariety ? `${selectedCrop} (${selectedVariety})` : selectedCrop} />
                    <SummaryRow label="Method" value={SEEDLING_METHODS[seedlingMethod].label} />
                    <SummaryRow label="Spacing" value={scenarios[spacingChoice].label} />
                    <SummaryRow label={seedlingMethod === "buy" ? "Seedlings needed" : "Seeds/plants needed"} value={Math.ceil(selectedScenario.totalPlants * 1.2).toLocaleString()} />
                    <SummaryRow label="Total plants" value={selectedScenario.totalPlants.toLocaleString()} />
                    <SummaryRow label={seedlingMethod === "buy" ? "Order by" : "Sow date"} value={(seedlingMethod === "buy" ? methodDates.buy.orderByDate : firstSowDate).toLocaleDateString()} />
                    <SummaryRow label="First harvest" value={activeHarvestStart.toLocaleDateString()} />
                    <SummaryRow label="Yield est." value={selectedScenario.yieldEst != null ? `${selectedScenario.yieldEst.toLocaleString()} ${crop.yieldUnit}` : "—"} highlight />
                    <SummaryRow label="Value est." value={selectedScenario.valueEst != null ? `$${selectedScenario.valueEst.toLocaleString()}` : "—"} highlight />
                  </div>

                  {/* Succession table — staggered sow dates across the beds entered */}
                  {succession && succession.rows.length > 1 && (
                    <>
                      <div style={s.wizLabel}>Succession — {numBeds} beds, ~{succession.intervalWks} wk apart</div>
                      <div style={s.succTable}>
                        <div style={s.succTableHead}>
                          <span>Bed</span><span>Sow</span><span>Harvest</span>
                        </div>
                        {succession.rows.map(r => (
                          <div key={r.bed} style={s.succTableRow}>
                            <span>Bed {r.bed}</span>
                            <span>{r.sowDate.toLocaleDateString()}</span>
                            <span>{r.harvestDate.toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <button onClick={savePlan} disabled={saving} style={{ ...s.saveBtn, opacity: saving ? 0.7 : 1 }}>
                    {saving ? "Saving…" : "✓ Add to My Farm"}
                  </button>
                  <button onClick={goBack} style={s.backBtn}>← Back</button>
                </motion.div>
              )}

              {/* ── Step 3: Future planting prompt (after save) ──────────── */}
              {wizardStep === 3 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div style={s.savedCheck}>✓</div>
                  <div style={s.savedTitle}>Added to your farm</div>
                  <div style={s.savedSub}>Want to schedule your next planting of {selectedCrop} now?</div>

                  <div style={s.wizLabel}>Repeat this planting:</div>
                  {SUCCESSION_OPTIONS.map(opt => {
                    let blurb = opt.blurb;
                    if (!blurb) {
                      const weeksFor = { auto: succession?.intervalWks, weekly: 1, biweekly: 2, triweekly: 3, monthly: 4 }[opt.key];
                      if (weeksFor) {
                        const next = new Date(firstSowDate);
                        next.setDate(next.getDate() + weeksFor * 7);
                        blurb = `Next sow: ${next.toLocaleDateString()}`;
                      }
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

                  <button
                    onClick={() => { setShowModal(false); resetWizard(); }}
                    style={s.saveBtn}
                  >
                    {successionChoice === "none" ? "Done" : "Schedule & Done"}
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
const WIZARD_TITLES = ["What & when", "How you're planting", "Your plan", "Schedule next"];

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
  methodDates: { fontSize: "0.74rem", color: "var(--soil-green)", fontWeight: 600, marginTop: "0.35rem", lineHeight: 1.5 },

  // Succession table
  succTable: { border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", marginBottom: "1rem" },
  succTableHead: { display: "grid", gridTemplateColumns: "1fr 1.3fr 1.3fr", gap: 4, padding: "0.5rem 0.8rem", background: "#F7FBF4", fontSize: "0.72rem", fontWeight: 700, color: "#888", textTransform: "uppercase" },
  succTableRow: { display: "grid", gridTemplateColumns: "1fr 1.3fr 1.3fr", gap: 4, padding: "0.5rem 0.8rem", borderTop: "1px solid #f0f0f0", fontSize: "0.82rem", color: "var(--ink-black)" },

  // Saved confirmation (step 3)
  savedCheck: { width: 52, height: 52, borderRadius: "50%", background: "var(--soil-green)", color: "#fff", fontSize: "1.6rem", display: "flex", alignItems: "center", justifyContent: "center", margin: "0.5rem auto 0.75rem" },
  savedTitle: { textAlign: "center", fontWeight: 700, fontSize: "1.05rem", color: "var(--ink-black)" },
  savedSub: { textAlign: "center", fontSize: "0.85rem", color: "#666", margin: "0.35rem 0 1rem" },

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
