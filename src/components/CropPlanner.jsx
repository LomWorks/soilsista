// CropPlanner.jsx — full rebuild
// Data sourced directly from master_crops_and_plantings.xlsx
// Loads from Firestore crops collection; falls back to embedded data if collection is empty
// Features: variant selection, real day-based timeline, moon cycle toggle,
//           commercial metrics (when farmingType === "commercial"), succession planting,
//           hot pepper + sweet pepper incompatibility warning

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../firebase";
import { collection, getDocs, addDoc, query, limit } from "firebase/firestore";

// ─── Embedded crop database (from master_crops_and_plantings.xlsx) ────────────
// Grouped by display name → array of variants
// All timing in days; spacing in inches
const EMBEDDED_CROPS = {
  "Banana / Plantain": [
    { variant: "Dwarf", system: "Tropical Perennial", type: "long term",
      spacing: { min: 60, max: 96 }, rowSpacing: { min: 96, max: 120 }, rowsPerBed: 1,
      nursery: { min: 0, max: 0 }, germ: { min: 14, max: 28 }, dtm: { min: 300, max: 420 },
      harvestDays: { min: 180, max: 365 }, yield: { lbPerPlant: { min: 30, max: 60 }, lbPerFt2: null },
      cuts: "Continuous", regrowth: { min: 90, max: 210 }, light: "Full sun", season: "Warm",
      production: "fruiting tropical",
      notes: "Plant 5–8 ft apart. First harvest 9–12 months. Ratoons for continuous production." }
  ],
  "Basil": [
    { variant: "Sweet/Genovese", system: "Herbs", type: "long term",
      spacing: { min: 8, max: 12 }, rowSpacing: { min: 12, max: 18 }, rowsPerBed: 3,
      nursery: { min: 28, max: 35 }, germ: { min: 7, max: 21 }, dtm: { min: 40, max: 55 },
      harvestDays: { min: 60, max: 120 }, yield: { lbPerPlant: null, lbPerFt2: { min: 0.3, max: 0.5 } },
      cuts: "Continuous", regrowth: { min: 10, max: 14 }, light: "Full sun", season: "Warm",
      production: "cut-and-come",
      notes: "Pinch tips early to encourage branching. Harvest continuously for 6–10 cuts." },
    { variant: "African Blue", system: "Herbs", type: "long term",
      spacing: { min: 12, max: 18 }, rowSpacing: { min: 18, max: 24 }, rowsPerBed: 2,
      nursery: { min: 28, max: 35 }, germ: { min: 7, max: 14 }, dtm: { min: 40, max: 55 },
      harvestDays: { min: 90, max: 180 }, yield: { lbPerPlant: null, lbPerFt2: { min: 0.3, max: 0.55 } },
      cuts: "Continuous", regrowth: { min: 10, max: 14 }, light: "Full sun", season: "Warm",
      production: "annual herb",
      notes: "Perennial basil for warm climates. Strong pollinator attractor." },
    { variant: "Thai", system: "Herbs", type: "long term",
      spacing: { min: 8, max: 12 }, rowSpacing: { min: 12, max: 18 }, rowsPerBed: 3,
      nursery: { min: 28, max: 35 }, germ: { min: 7, max: 21 }, dtm: { min: 40, max: 55 },
      harvestDays: { min: 60, max: 120 }, yield: { lbPerPlant: null, lbPerFt2: { min: 0.3, max: 0.5 } },
      cuts: "Continuous", regrowth: { min: 10, max: 14 }, light: "Full sun", season: "Warm",
      production: "cut-and-come",
      notes: "Anise-scented leaves. Pinch flowers to extend harvest window." }
  ],
  "Beets": [
    { variant: "Root Crop", system: "Root", type: "short term",
      spacing: { min: 2, max: 4 }, rowSpacing: { min: 6, max: 12 }, rowsPerBed: 4,
      nursery: { min: 0, max: 0 }, germ: { min: 5, max: 14 }, dtm: { min: 55, max: 70 },
      harvestDays: { min: 0, max: 0 }, yield: { lbPerPlant: null, lbPerFt2: { min: 0.4, max: 0.8 } },
      cuts: "Single", regrowth: { min: 0, max: 0 }, light: "Full sun", season: "Cool",
      production: "root",
      notes: "Direct sow. Thin to 2–4 in. spacing. Harvest roots at 1.5–3 in. diameter. Tops edible as baby greens." }
  ],
  "Cabbage": [
    { variant: "Standard Head", system: "Brassicas", type: "medium term",
      spacing: { min: 12, max: 18 }, rowSpacing: { min: 18, max: 24 }, rowsPerBed: 2,
      nursery: { min: 35, max: 45 }, germ: { min: 7, max: 14 }, dtm: { min: 75, max: 100 },
      harvestDays: { min: 0, max: 0 }, yield: { lbPerPlant: { min: 1.5, max: 3 }, lbPerFt2: null },
      cuts: "Single", regrowth: { min: 0, max: 0 }, light: "Full sun", season: "Cool",
      production: "head",
      notes: "Transplant. Harvest tight heads at 75–100 days." }
  ],
  "Cassava": [
    { variant: "Root Crop", system: "Root", type: "long term",
      spacing: { min: 24, max: 48 }, rowSpacing: { min: 36, max: 60 }, rowsPerBed: 1,
      nursery: { min: 0, max: 0 }, germ: { min: 21, max: 30 }, dtm: { min: 240, max: 360 },
      harvestDays: { min: 0, max: 0 }, yield: { lbPerPlant: { min: 6, max: 15 }, lbPerFt2: null },
      cuts: "Single", regrowth: { min: 0, max: 0 }, light: "Full sun", season: "Warm",
      production: "root",
      notes: "Harvest at 8–12 months. Drought tolerant once established. Plant stem cuttings 45° in ground." }
  ],
  "Chives": [
    { variant: "Garlic/Onion", system: "Allium", type: "long term",
      spacing: { min: 6, max: 8 }, rowSpacing: { min: 12, max: 18 }, rowsPerBed: 3,
      nursery: { min: 0, max: 0 }, germ: { min: 7, max: 14 }, dtm: { min: 60, max: 80 },
      harvestDays: { min: 90, max: 180 }, yield: { lbPerPlant: null, lbPerFt2: { min: 0.25, max: 0.45 } },
      cuts: "Continuous", regrowth: { min: 14, max: 21 }, light: "Full sun", season: "Cool",
      production: "perennial herb",
      notes: "Perennial clumping herb. Cut-and-come-again every 3–4 weeks." }
  ],
  "Corn": [
    { variant: "Sweet (Eating)", system: "Grain", type: "medium term",
      spacing: { min: 8, max: 12 }, rowSpacing: { min: 30, max: 36 }, rowsPerBed: 1,
      nursery: { min: 0, max: 0 }, germ: { min: 5, max: 10 }, dtm: { min: 75, max: 95 },
      harvestDays: { min: 7, max: 14 }, yield: { lbPerPlant: { min: 0.5, max: 1 }, lbPerFt2: null },
      cuts: "Single", regrowth: { min: 0, max: 0 }, light: "Full sun", season: "Warm",
      production: "grain/vegetable",
      notes: "Harvest ears in milk stage. Succession sow every 14 days for continuous harvest." },
    { variant: "Field/Feed", system: "Grain", type: "medium term",
      spacing: { min: 8, max: 12 }, rowSpacing: { min: 30, max: 36 }, rowsPerBed: 1,
      nursery: { min: 0, max: 0 }, germ: { min: 5, max: 10 }, dtm: { min: 95, max: 120 },
      harvestDays: { min: 14, max: 21 }, yield: { lbPerPlant: { min: 0.5, max: 1 }, lbPerFt2: null },
      cuts: "Single", regrowth: { min: 0, max: 0 }, light: "Full sun", season: "Warm",
      production: "grain/vegetable",
      notes: "Harvest grain at 95–110 days for feed or silage." }
  ],
  "Cucumber": [
    { variant: "Standard Slicer", system: "Cucurbits", type: "medium term",
      spacing: { min: 12, max: 18 }, rowSpacing: { min: 30, max: 36 }, rowsPerBed: 1,
      nursery: { min: 18, max: 18 }, germ: { min: 4, max: 14 }, dtm: { min: 60, max: 75 },
      harvestDays: { min: 30, max: 60 }, yield: { lbPerPlant: { min: 2, max: 5 }, lbPerFt2: null },
      cuts: "Continuous", regrowth: { min: 3, max: 7 }, light: "Full sun", season: "Warm",
      production: "fruiting annual",
      notes: "Trellis or sprawl on ground. Pick regularly to encourage fruiting." },
    { variant: "Mini/Pickling", system: "Cucurbits", type: "medium term",
      spacing: { min: 10, max: 12 }, rowSpacing: { min: 24, max: 30 }, rowsPerBed: 1,
      nursery: { min: 18, max: 28 }, germ: { min: 4, max: 7 }, dtm: { min: 55, max: 70 },
      harvestDays: { min: 30, max: 60 }, yield: { lbPerPlant: { min: 1.5, max: 3.5 }, lbPerFt2: null },
      cuts: "Continuous", regrowth: { min: 3, max: 7 }, light: "Full sun", season: "Warm",
      production: "fruiting annual",
      notes: "Small-fruited type for pickles or snacking. Trellis for clean fruit." },
    { variant: "English Long", system: "Cucurbits", type: "medium term",
      spacing: { min: 12, max: 18 }, rowSpacing: { min: 36, max: 48 }, rowsPerBed: 1,
      nursery: { min: 18, max: 18 }, germ: { min: 4, max: 7 }, dtm: { min: 65, max: 80 },
      harvestDays: { min: 30, max: 60 }, yield: { lbPerPlant: { min: 2, max: 4 }, lbPerFt2: null },
      cuts: "Continuous", regrowth: { min: 3, max: 7 }, light: "Full sun", season: "Warm",
      production: "fruiting annual",
      notes: "High-yield trellised type. Requires trellis for straight fruit." }
  ],
  "Eggplant": [
    { variant: "Asian/Italian", system: "Solanaceae", type: "long term",
      spacing: { min: 18, max: 24 }, rowSpacing: { min: 24, max: 36 }, rowsPerBed: 1,
      nursery: { min: 40, max: 55 }, germ: { min: 5, max: 14 }, dtm: { min: 75, max: 95 },
      harvestDays: { min: 60, max: 120 }, yield: { lbPerPlant: { min: 3, max: 6 }, lbPerFt2: null },
      cuts: "Continuous", regrowth: { min: 3, max: 7 }, light: "Full sun", season: "Warm",
      production: "fruiting annual",
      notes: "Heat-loving. Stake for heavy fruit sets. Pick regularly to encourage production." }
  ],
  "Hot Pepper": [
    { variant: "Goat / Scotch Bonnet", system: "Solanaceae", type: "long term",
      spacing: { min: 18, max: 24 }, rowSpacing: { min: 24, max: 36 }, rowsPerBed: 1,
      nursery: { min: 40, max: 55 }, germ: { min: 8, max: 14 }, dtm: { min: 95, max: 120 },
      harvestDays: { min: 60, max: 120 }, yield: { lbPerPlant: { min: 1.5, max: 3 }, lbPerFt2: null },
      cuts: "Continuous", regrowth: { min: 3, max: 7 }, light: "Full sun", season: "Warm",
      production: "fruiting annual",
      incompatible: ["Sweet Pepper"],
      notes: "Caribbean Scotch Bonnet/Goat pepper. Long harvest window. ⚠️ Do not plant near sweet peppers — cross-pollination will affect fruit heat levels." },
    { variant: "Cayenne / Bird", system: "Solanaceae", type: "long term",
      spacing: { min: 12, max: 18 }, rowSpacing: { min: 18, max: 30 }, rowsPerBed: 1,
      nursery: { min: 40, max: 55 }, germ: { min: 8, max: 14 }, dtm: { min: 90, max: 115 },
      harvestDays: { min: 60, max: 120 }, yield: { lbPerPlant: { min: 0.8, max: 2 }, lbPerFt2: null },
      cuts: "Continuous", regrowth: { min: 3, max: 7 }, light: "Full sun", season: "Warm",
      production: "fruiting annual",
      incompatible: ["Sweet Pepper"],
      notes: "Long thin pods. Smaller plant allows tighter spacing. ⚠️ Keep away from sweet peppers." },
    { variant: "Scorpion", system: "Solanaceae", type: "long term",
      spacing: { min: 18, max: 24 }, rowSpacing: { min: 24, max: 36 }, rowsPerBed: 1,
      nursery: { min: 40, max: 55 }, germ: { min: 8, max: 14 }, dtm: { min: 100, max: 130 },
      harvestDays: { min: 60, max: 120 }, yield: { lbPerPlant: { min: 1, max: 2.5 }, lbPerFt2: null },
      cuts: "Continuous", regrowth: { min: 3, max: 7 }, light: "Full sun", season: "Warm",
      production: "fruiting annual",
      incompatible: ["Sweet Pepper"],
      notes: "Very hot Capsicum chinense. Longer season. Stake or cage for heavy fruit set." }
  ],
  "Mint": [
    { variant: "Spearmint / Peppermint", system: "Herbs", type: "long term",
      spacing: { min: 8, max: 12 }, rowSpacing: { min: 12, max: 18 }, rowsPerBed: 3,
      nursery: { min: 35, max: 45 }, germ: { min: 7, max: 14 }, dtm: { min: 45, max: 60 },
      harvestDays: { min: 90, max: 180 }, yield: { lbPerPlant: null, lbPerFt2: { min: 0.3, max: 0.5 } },
      cuts: "Continuous", regrowth: { min: 10, max: 14 }, light: "Partial sun", season: "Warm",
      production: "perennial herb",
      notes: "Cut-and-come-again every 2–3 weeks. Can become invasive — grow in contained beds." }
  ],
  "Okra": [
    { variant: "Standard", system: "Malvaceae", type: "long term",
      spacing: { min: 12, max: 18 }, rowSpacing: { min: 24, max: 36 }, rowsPerBed: 1,
      nursery: { min: 0, max: 0 }, germ: { min: 6, max: 10 }, dtm: { min: 55, max: 75 },
      harvestDays: { min: 60, max: 120 }, yield: { lbPerPlant: { min: 2, max: 4 }, lbPerFt2: null },
      cuts: "Continuous", regrowth: { min: 3, max: 7 }, light: "Full sun", season: "Warm",
      production: "fruiting annual",
      notes: "Thrives in heat. Pick pods every 2–3 days for tender quality — oversized pods become woody." }
  ],
  "Parsley": [
    { variant: "Flat / Curly", system: "Herbs", type: "short term",
      spacing: { min: 6, max: 8 }, rowSpacing: { min: 12, max: 18 }, rowsPerBed: 3,
      nursery: { min: 45, max: 45 }, germ: { min: 7, max: 14 }, dtm: { min: 75, max: 90 },
      harvestDays: { min: 60, max: 120 }, yield: { lbPerPlant: null, lbPerFt2: { min: 0.25, max: 0.4 } },
      cuts: "Continuous", regrowth: { min: 14, max: 21 }, light: "Full sun", season: "Cool",
      production: "cut-and-come",
      notes: "Slow germinator. Transplant or direct sow. Harvest continuously for 4–8 cuts." }
  ],
  "Pumpkin": [
    { variant: "Standard", system: "Cucurbits", type: "medium term",
      spacing: { min: 24, max: 48 }, rowSpacing: { min: 60, max: 96 }, rowsPerBed: 1,
      nursery: { min: 14, max: 21 }, germ: { min: 5, max: 10 }, dtm: { min: 85, max: 120 },
      harvestDays: { min: 14, max: 21 }, yield: { lbPerPlant: { min: 8, max: 20 }, lbPerFt2: null },
      cuts: "Single", regrowth: { min: 0, max: 0 }, light: "Full sun", season: "Warm",
      production: "fruiting annual",
      notes: "Needs ample space for vines. Harvest when skin hardens and stem dries. Cures well for storage." }
  ],
  "Rosemary": [
    { variant: "Standard", system: "Herbs", type: "long term",
      spacing: { min: 18, max: 24 }, rowSpacing: { min: 24, max: 36 }, rowsPerBed: 1,
      nursery: { min: 0, max: 0 }, germ: { min: 3, max: 7 }, dtm: { min: 100, max: 140 },
      harvestDays: { min: 180, max: 365 }, yield: { lbPerPlant: null, lbPerFt2: { min: 0.25, max: 0.45 } },
      cuts: "Continuous", regrowth: { min: 10, max: 21 }, light: "Full sun", season: "Warm",
      production: "perennial herb",
      notes: "Woody perennial. Harvest sprigs year-round once established." }
  ],
  "Sweet Pepper": [
    { variant: "Lunchbox / Snack", system: "Solanaceae", type: "long term",
      spacing: { min: 12, max: 18 }, rowSpacing: { min: 18, max: 24 }, rowsPerBed: 1,
      nursery: { min: 40, max: 55 }, germ: { min: 8, max: 14 }, dtm: { min: 70, max: 95 },
      harvestDays: { min: 45, max: 90 }, yield: { lbPerPlant: { min: 1, max: 2.5 }, lbPerFt2: null },
      cuts: "Continuous", regrowth: { min: 3, max: 7 }, light: "Full sun", season: "Warm",
      production: "fruiting annual",
      incompatible: ["Hot Pepper"],
      notes: "Mini snack pepper. Heavy fruit set on small plants. Stake or cage. ⚠️ Keep away from hot peppers to prevent cross-pollination." },
    { variant: "Cornito / Horn", system: "Solanaceae", type: "long term",
      spacing: { min: 18, max: 24 }, rowSpacing: { min: 24, max: 36 }, rowsPerBed: 1,
      nursery: { min: 40, max: 55 }, germ: { min: 8, max: 14 }, dtm: { min: 75, max: 100 },
      harvestDays: { min: 45, max: 90 }, yield: { lbPerPlant: { min: 2.5, max: 5 }, lbPerFt2: null },
      cuts: "Continuous", regrowth: { min: 3, max: 7 }, light: "Full sun", season: "Warm",
      production: "fruiting annual",
      incompatible: ["Hot Pepper"],
      notes: "Long tapered fruits. Stake or trellis to prevent breakage. ⚠️ Do not plant next to hot peppers." }
  ],
  "Sweet Potato": [
    { variant: "Standard", system: "Root", type: "medium term",
      spacing: { min: 12, max: 18 }, rowSpacing: { min: 36, max: 48 }, rowsPerBed: 1,
      nursery: { min: 0, max: 0 }, germ: { min: 14, max: 21 }, dtm: { min: 90, max: 120 },
      harvestDays: { min: 0, max: 0 }, yield: { lbPerPlant: { min: 2, max: 5 }, lbPerFt2: null },
      cuts: "Single", regrowth: { min: 0, max: 0 }, light: "Full sun", season: "Warm",
      production: "root",
      notes: "Plant vine slips 12–18 in. apart. Vines trail — allow 3–4 ft of row space. Harvest at 90–120 days when leaves yellow." }
  ],
  "Taro (Dasheen)": [
    { variant: "Eddoe / Dasheen", system: "Root", type: "long term",
      spacing: { min: 18, max: 24 }, rowSpacing: { min: 24, max: 36 }, rowsPerBed: 1,
      nursery: { min: 0, max: 0 }, germ: { min: 30, max: 30 }, dtm: { min: 200, max: 270 },
      harvestDays: { min: 0, max: 0 }, yield: { lbPerPlant: { min: 2, max: 5 }, lbPerFt2: null },
      cuts: "Single", regrowth: { min: 0, max: 0 }, light: "Partial sun", season: "Warm",
      production: "perennial tuber",
      notes: "Moist soil or paddy system. Plant corms 18–24 in. apart. Harvest corms and edible leaves 6–9 months after planting." }
  ],
  "Thyme": [
    { variant: "Standard", system: "Herbs", type: "long term",
      spacing: { min: 8, max: 12 }, rowSpacing: { min: 12, max: 18 }, rowsPerBed: 3,
      nursery: { min: 0, max: 0 }, germ: { min: 7, max: 14 }, dtm: { min: 55, max: 80 },
      harvestDays: { min: 90, max: 180 }, yield: { lbPerPlant: null, lbPerFt2: { min: 0.2, max: 0.4 } },
      cuts: "Continuous", regrowth: { min: 10, max: 14 }, light: "Full sun", season: "Warm",
      production: "perennial herb",
      notes: "Low perennial herb. Harvest sprigs every few weeks once established." }
  ],
  "Tomato": [
    { variant: "Cherry", system: "Solanaceae", type: "long term",
      spacing: { min: 18, max: 24 }, rowSpacing: { min: 36, max: 48 }, rowsPerBed: 1,
      nursery: { min: 35, max: 40 }, germ: { min: 4, max: 7 }, dtm: { min: 65, max: 85 },
      harvestDays: { min: 60, max: 120 }, yield: { lbPerPlant: { min: 6, max: 12 }, lbPerFt2: null },
      cuts: "Continuous", regrowth: { min: 3, max: 7 }, light: "Full sun", season: "Warm",
      production: "fruiting annual",
      notes: "High-density trellised system. Continuous harvest over long window. Prune suckers regularly." },
    { variant: "Indeterminate", system: "Solanaceae", type: "long term",
      spacing: { min: 24, max: 36 }, rowSpacing: { min: 36, max: 60 }, rowsPerBed: 1,
      nursery: { min: 35, max: 45 }, germ: { min: 6, max: 10 }, dtm: { min: 75, max: 95 },
      harvestDays: { min: 60, max: 120 }, yield: { lbPerPlant: { min: 10, max: 20 }, lbPerFt2: null },
      cuts: "Continuous", regrowth: { min: 3, max: 7 }, light: "Full sun", season: "Warm",
      production: "fruiting annual",
      notes: "Vining type. Continuous fruiting for many months. Trellis or stake required." },
    { variant: "Determinate", system: "Solanaceae", type: "long term",
      spacing: { min: 18, max: 24 }, rowSpacing: { min: 36, max: 48 }, rowsPerBed: 1,
      nursery: { min: 35, max: 45 }, germ: { min: 6, max: 10 }, dtm: { min: 65, max: 80 },
      harvestDays: { min: 21, max: 35 }, yield: { lbPerPlant: { min: 8, max: 15 }, lbPerFt2: null },
      cuts: "Single", regrowth: { min: 3, max: 7 }, light: "Full sun", season: "Warm",
      production: "fruiting annual",
      notes: "Compact bush type. Single main harvest window. Stake or cage for best yields." }
  ],
  "Watermelon": [
    { variant: "Large Seeded", system: "Cucurbits", type: "medium term",
      spacing: { min: 24, max: 36 }, rowSpacing: { min: 60, max: 84 }, rowsPerBed: 1,
      nursery: { min: 0, max: 0 }, germ: { min: 4, max: 7 }, dtm: { min: 85, max: 110 },
      harvestDays: { min: 14, max: 21 }, yield: { lbPerPlant: { min: 10, max: 20 }, lbPerFt2: null },
      cuts: "Single", regrowth: { min: 0, max: 0 }, light: "Full sun", season: "Warm",
      production: "fruiting annual",
      notes: "Field production for 15–30 lb melons. Needs wide row spacing for vine spread." }
  ],
};

// Rough market prices per lb (XCD) for Caribbean market — for commercial metrics
const MARKET_PRICES_XCD = {
  "Banana / Plantain": 1.5, "Basil": 12, "Beets": 3, "Cabbage": 2, "Cassava": 2.5,
  "Chives": 10, "Corn": 1.8, "Cucumber": 3, "Eggplant": 3, "Hot Pepper": 8,
  "Mint": 12, "Okra": 5, "Parsley": 10, "Pumpkin": 2, "Rosemary": 10,
  "Sweet Pepper": 6, "Sweet Potato": 3, "Taro (Dasheen)": 4, "Thyme": 10,
  "Tomato": 5, "Watermelon": 1.5
};

// Moon phases for guidance (new = plant leafy/root, full = harvest)
const MOON_GUIDANCE = {
  sowing: "🌑 New Moon — ideal time to sow seeds. Moisture is drawn up into soil as the moon waxes.",
  transplanting: "🌒 Waxing Crescent — good for transplanting. Sap rises, encouraging root establishment.",
  leafHarvest: "🌕 Full Moon — best for harvesting leafy crops and herbs. Maximum moisture in plant tissue.",
  rootHarvest: "🌘 Waning Crescent — ideal for harvesting root crops. Energy moves downward.",
  pruning: "🌗 Last Quarter — prune, weed, and turn compost. Energy is downward and inward.",
};

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function fmtDate(date) {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function avgDays(min, max) {
  if (!min && !max) return 0;
  return Math.round((min + max) / 2);
}

export default function CropPlanner({ userData }) {
  const [crops, setCrops] = useState(EMBEDDED_CROPS);
  const [selectedCropName, setSelectedCropName] = useState("");
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [numBeds, setNumBeds] = useState(1);
  const [bedLength, setBedLength] = useState(30); // feet
  const [bedWidth, setBedWidth] = useState(4);    // feet
  const [schedule, setSchedule] = useState(null);
  const [moonMode, setMoonMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [incompatWarning, setIncompatWarning] = useState(null);

  const isCommercial = userData?.farmingType === "commercial";
  const cropNames = Object.keys(crops).sort();
  const variants = selectedCropName ? crops[selectedCropName] : [];
  const selectedCrop = variants[selectedVariantIdx] || null;

  // Load from Firestore if populated, fall back to embedded
  useEffect(() => {
    const loadFromFirestore = async () => {
      try {
        const snap = await getDocs(query(collection(db, "crops"), limit(5)));
        if (!snap.empty) {
          // Firestore has data — restructure into same format as EMBEDDED_CROPS
          const firestoreCrops = {};
          snap.docs.forEach(d => {
            const data = d.data();
            const name = data.crop_name;
            if (!firestoreCrops[name]) firestoreCrops[name] = [];
            firestoreCrops[name].push(data);
          });
          // Only use Firestore if it has meaningful data, otherwise keep embedded
          if (Object.keys(firestoreCrops).length > 5) {
            setCrops(firestoreCrops);
          }
        }
      } catch (err) {
        // Silently fall back to embedded data
        console.log("Using embedded crop database");
      }
    };
    loadFromFirestore();
  }, []);

  // Check pepper incompatibility
  useEffect(() => {
    if (!selectedCropName || !selectedCrop) { setIncompatWarning(null); return; }
    const userCrops = userData?.crops || [];
    const incompatible = selectedCrop.incompatible || [];
    const conflict = incompatible.find(ic => userCrops.some(uc => uc.toLowerCase().includes(ic.toLowerCase())));
    if (conflict) {
      setIncompatWarning(`⚠️ You currently grow ${conflict}. Planting ${selectedCropName} nearby can cause cross-pollination, affecting the heat level of both crops. Keep at least 100m apart or use a windbreak.`);
    } else {
      setIncompatWarning(null);
    }
  }, [selectedCropName, selectedVariantIdx, selectedCrop, userData]);

  const validate = () => {
    const e = {};
    if (!selectedCropName) e.crop = "Please select a crop";
    const d = new Date(startDate);
    const today = new Date(); today.setHours(0,0,0,0);
    if (d < today) e.date = "Start date cannot be in the past";
    if (numBeds < 1 || numBeds > 200) e.beds = "Must be between 1 and 200";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const generateSchedule = () => {
    if (!validate()) return;
    const crop = selectedCrop;
    const start = new Date(startDate);
    const nurseryDays = avgDays(crop.nursery.min, crop.nursery.max);
    const dtmDays = avgDays(crop.dtm.min, crop.dtm.max);
    const harvestDays = avgDays(crop.harvestDays.min, crop.harvestDays.max);
    const hasNursery = nurseryDays > 0;

    const sowDate = start;
    const transplantDate = hasNursery ? addDays(start, nurseryDays) : null;
    const harvestStart = addDays(start, nurseryDays + dtmDays);
    const harvestEnd = harvestDays > 0 ? addDays(harvestStart, harvestDays) : null;
    const totalDays = nurseryDays + dtmDays + (harvestDays || 0);
    const cyclesPerYear = harvestDays > 0 ? Math.floor(365 / totalDays) : 1;

    // Yield calculation
    const bedFt2 = bedLength * bedWidth;
    const totalFt2 = bedFt2 * numBeds;
    let yieldPerBedMin = 0, yieldPerBedMax = 0;

    if (crop.yield.lbPerFt2) {
      yieldPerBedMin = crop.yield.lbPerFt2.min * bedFt2;
      yieldPerBedMax = crop.yield.lbPerFt2.max * bedFt2;
    } else if (crop.yield.lbPerPlant) {
      // Estimate plants per bed
      const spacingAvg = (crop.spacing.min + crop.spacing.max) / 2;
      const rowSpacingAvg = (crop.rowSpacing.min + crop.rowSpacing.max) / 2;
      const plantsPerRow = Math.floor((bedLength * 12) / spacingAvg);
      const rows = crop.rowsPerBed || Math.floor((bedWidth * 12) / rowSpacingAvg);
      const plantsPerBed = plantsPerRow * rows;
      yieldPerBedMin = plantsPerBed * crop.yield.lbPerPlant.min;
      yieldPerBedMax = plantsPerBed * crop.yield.lbPerPlant.max;
    }

    const totalYieldMin = yieldPerBedMin * numBeds;
    const totalYieldMax = yieldPerBedMax * numBeds;
    const annualYieldMin = totalYieldMin * cyclesPerYear;
    const annualYieldMax = totalYieldMax * cyclesPerYear;

    // Commercial metrics
    const pricePerLb = MARKET_PRICES_XCD[selectedCropName] || 3;
    const revenueMin = Math.round(annualYieldMin * pricePerLb);
    const revenueMax = Math.round(annualYieldMax * pricePerLb);
    const costPerBed = Math.round(bedFt2 * 0.8 * cyclesPerYear); // rough XCD estimate
    const totalCost = costPerBed * numBeds;
    const roiMin = revenueMin - totalCost;
    const roiMax = revenueMax - totalCost;

    // Succession interval: plant new batch every half-cycle
    const successionDays = Math.max(14, Math.round((dtmDays + (harvestDays || 0)) / 2));

    setSchedule({
      cropName: selectedCropName,
      variant: crop.variant,
      crop,
      sowDate, transplantDate, harvestStart, harvestEnd,
      totalDays, cyclesPerYear,
      yieldPerBed: { min: Math.round(yieldPerBedMin), max: Math.round(yieldPerBedMax) },
      totalYield: { min: Math.round(totalYieldMin), max: Math.round(totalYieldMax) },
      annualYield: { min: Math.round(annualYieldMin), max: Math.round(annualYieldMax) },
      numBeds, bedFt2, totalFt2,
      commercial: { revenueMin, revenueMax, costPerBed, totalCost, roiMin, roiMax, pricePerLb },
      successionDays,
      nurseryDays, dtmDays, harvestDays
    });
  };

  const savePlan = async () => {
    if (!userData?.userId) { alert("Please log in to save plans"); return; }
    if (!schedule) { alert("Generate a schedule first"); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, "activities"), {
        userId: userData.userId,
        type: "crop_plan",
        category: "farming",
        title: `${schedule.cropName} (${schedule.variant}) Planting Plan`,
        message: `${schedule.numBeds} bed(s). Sow ${fmtDate(schedule.sowDate)}, harvest from ${fmtDate(schedule.harvestStart)}.`,
        icon: "🌱",
        status: "planned",
        data: {
          cropName: schedule.cropName,
          variant: schedule.variant,
          sowDate: schedule.sowDate,
          transplantDate: schedule.transplantDate,
          harvestStart: schedule.harvestStart,
          harvestEnd: schedule.harvestEnd,
          numBeds: schedule.numBeds,
          bedSize: `${bedLength}×${bedWidth}ft`,
          totalFt2: schedule.totalFt2,
          estimatedYield: `${schedule.totalYield.min}–${schedule.totalYield.max} lbs`,
          annualYield: `${schedule.annualYield.min}–${schedule.annualYield.max} lbs`,
          cyclesPerYear: schedule.cyclesPerYear,
          successionDays: schedule.successionDays,
        },
        createdAt: new Date()
      });
      alert("✅ Plan saved to your dashboard!");
    } catch (err) {
      console.error(err);
      alert("Failed to save plan. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.planner}>

      {/* ── Input Panel ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.panel}>
        <div style={styles.panelHeader}>
          <h3 style={styles.panelTitle}>Plan Your Crop</h3>
          {/* Moon toggle */}
          <button
            onClick={() => setMoonMode(m => !m)}
            style={{ ...styles.moonToggle, background: moonMode ? "var(--soil-green)" : "#f0f0f0", color: moonMode ? "white" : "#666" }}
            title="Toggle moon cycle planting guidance"
          >
            {moonMode ? "🌕 Moon On" : "🌑 Moon Off"}
          </button>
        </div>

        {/* Crop Select */}
        <label style={styles.label}>Crop *</label>
        <select
          value={selectedCropName}
          onChange={e => { setSelectedCropName(e.target.value); setSelectedVariantIdx(0); setSchedule(null); setErrors({}); }}
          style={{ ...styles.select, borderColor: errors.crop ? "#ef4444" : "#ddd" }}
        >
          <option value="">— Select a crop —</option>
          {cropNames.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
        {errors.crop && <span style={styles.errorText}>{errors.crop}</span>}

        {/* Variant Select */}
        {selectedCropName && variants.length > 1 && (
          <>
            <label style={styles.label}>Variety</label>
            <select
              value={selectedVariantIdx}
              onChange={e => { setSelectedVariantIdx(Number(e.target.value)); setSchedule(null); }}
              style={styles.select}
            >
              {variants.map((v, i) => <option key={i} value={i}>{v.variant}</option>)}
            </select>
          </>
        )}

        {/* Incompatibility Warning */}
        <AnimatePresence>
          {incompatWarning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={styles.incompatBox}
            >
              {incompatWarning}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start Date */}
        <label style={styles.label}>Start Date *</label>
        <input
          type="date"
          value={startDate}
          onChange={e => { setStartDate(e.target.value); setErrors({}); }}
          style={{ ...styles.input, borderColor: errors.date ? "#ef4444" : "#ddd" }}
        />
        {errors.date && <span style={styles.errorText}>{errors.date}</span>}

        {/* Beds */}
        <label style={styles.label}>Number of Beds *</label>
        <input
          type="number" min="1" max="200"
          value={numBeds}
          onChange={e => setNumBeds(parseInt(e.target.value) || 1)}
          style={{ ...styles.input, borderColor: errors.beds ? "#ef4444" : "#ddd" }}
        />
        {errors.beds && <span style={styles.errorText}>{errors.beds}</span>}

        {/* Bed size */}
        <label style={styles.label}>Bed Size (ft)</label>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <div style={{ flex: 1 }}>
            <span style={styles.inputHint}>Length</span>
            <input type="number" min="4" max="200" value={bedLength} onChange={e => setBedLength(Number(e.target.value))} style={styles.input} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={styles.inputHint}>Width</span>
            <input type="number" min="2" max="20" value={bedWidth} onChange={e => setBedWidth(Number(e.target.value))} style={styles.input} />
          </div>
        </div>
        <span style={styles.inputHint}>{numBeds * bedLength * bedWidth} ft² total growing area</span>

        <button onClick={generateSchedule} style={styles.generateBtn}>
          Generate Schedule
        </button>
      </motion.div>

      {/* ── Crop Info Card ── */}
      <AnimatePresence>
        {selectedCrop && (
          <motion.div
            key={`${selectedCropName}-${selectedVariantIdx}`}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
            style={styles.panel}
          >
            <h3 style={styles.panelTitle}>📋 {selectedCropName}</h3>
            {variants.length > 1 && <p style={styles.variantLabel}>{selectedCrop.variant}</p>}

            <div style={styles.infoGrid}>
              <InfoRow label="Days to Harvest" value={`${selectedCrop.dtm.min}–${selectedCrop.dtm.max} days`} />
              {selectedCrop.nursery.max > 0 && (
                <InfoRow label="Nursery Period" value={`${selectedCrop.nursery.min}–${selectedCrop.nursery.max} days`} />
              )}
              {selectedCrop.harvestDays.max > 0 && (
                <InfoRow label="Harvest Window" value={`${selectedCrop.harvestDays.min}–${selectedCrop.harvestDays.max} days`} />
              )}
              <InfoRow label="Spacing" value={`${selectedCrop.spacing.min}–${selectedCrop.spacing.max}" in row`} />
              <InfoRow label="Row Spacing" value={`${selectedCrop.rowSpacing.min}–${selectedCrop.rowSpacing.max}"`} />
              <InfoRow label="Rows per Bed" value={selectedCrop.rowsPerBed} />
              {selectedCrop.yield.lbPerPlant && (
                <InfoRow label="Yield / Plant" value={`${selectedCrop.yield.lbPerPlant.min}–${selectedCrop.yield.lbPerPlant.max} lbs`} />
              )}
              {selectedCrop.yield.lbPerFt2 && (
                <InfoRow label="Yield / ft²" value={`${selectedCrop.yield.lbPerFt2.min}–${selectedCrop.yield.lbPerFt2.max} lbs`} />
              )}
              <InfoRow label="Harvest Style" value={selectedCrop.cuts} />
              <InfoRow label="Light" value={selectedCrop.light} />
              <InfoRow label="Best Season" value={selectedCrop.season} />
            </div>

            <div style={styles.notesBox}>
              <p style={styles.notesText}>{selectedCrop.notes}</p>
            </div>

            {/* Moon guidance */}
            {moonMode && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.moonBox}>
                <h4 style={{ marginBottom: "0.75rem" }}>🌙 Moon Cycle Guidance</h4>
                {selectedCrop.nursery.max > 0 && <p style={styles.moonTip}>{MOON_GUIDANCE.sowing}</p>}
                {selectedCrop.nursery.max > 0 && <p style={styles.moonTip}>{MOON_GUIDANCE.transplanting}</p>}
                {selectedCrop.production?.includes("herb") || selectedCrop.production?.includes("leaf")
                  ? <p style={styles.moonTip}>{MOON_GUIDANCE.leafHarvest}</p>
                  : <p style={styles.moonTip}>{selectedCrop.production?.includes("root") ? MOON_GUIDANCE.rootHarvest : MOON_GUIDANCE.leafHarvest}</p>}
                <p style={styles.moonTip}>{MOON_GUIDANCE.pruning}</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Schedule Output ── */}
      <AnimatePresence>
        {schedule && (
          <motion.div
            key="schedule"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ ...styles.panel, gridColumn: "1 / -1" }}
          >
            <h3 style={styles.panelTitle}>🗓️ Planting Schedule — {schedule.cropName} ({schedule.variant})</h3>

            {/* Timeline */}
            <div style={styles.timeline}>
              <TimelineEvent icon="🌱" color="#7FB34D" title="Sow Seeds" date={fmtDate(schedule.sowDate)}
                desc={schedule.nurseryDays > 0 ? `Start seeds in nursery trays. Expect germination in ${schedule.crop.germ.min}–${schedule.crop.germ.max} days.` : `Direct sow into prepared beds at ${schedule.crop.spacing.min}–${schedule.crop.spacing.max}" spacing.`}
                moon={moonMode ? MOON_GUIDANCE.sowing : null} />

              {schedule.transplantDate && (
                <TimelineEvent icon="🌿" color="#5A9F6E" title="Transplant Seedlings" date={fmtDate(schedule.transplantDate)}
                  desc={`Move hardened seedlings to beds at ${schedule.crop.spacing.min}–${schedule.crop.spacing.max}" in-row spacing, ${schedule.crop.rowSpacing.min}–${schedule.crop.rowSpacing.max}" between rows.`}
                  moon={moonMode ? MOON_GUIDANCE.transplanting : null} />
              )}

              <TimelineEvent icon="🌾" color="#E6A93C" title="Harvest Begins" date={fmtDate(schedule.harvestStart)}
                desc={`Estimated yield: ${schedule.totalYield.min}–${schedule.totalYield.max} lbs across ${schedule.numBeds} bed(s).${schedule.crop.cuts === "Continuous" ? " Pick regularly to sustain production." : ""}`}
                moon={moonMode ? (schedule.crop.production?.includes("root") ? MOON_GUIDANCE.rootHarvest : MOON_GUIDANCE.leafHarvest) : null} />

              {schedule.harvestEnd && (
                <TimelineEvent icon="✅" color="#9B59B6" title="Harvest Window Closes" date={fmtDate(schedule.harvestEnd)}
                  desc="Clear beds, add compost, and prepare for next planting cycle."
                  moon={moonMode ? MOON_GUIDANCE.pruning : null} />
              )}
            </div>

            {/* Summary Stats */}
            <div style={styles.statsGrid}>
              <StatBox icon="📅" label="Total Cycle" value={`${schedule.totalDays} days`} />
              <StatBox icon="🔄" label="Cycles / Year" value={schedule.cyclesPerYear} />
              <StatBox icon="⚖️" label="Est. Yield / Cycle" value={`${schedule.totalYield.min}–${schedule.totalYield.max} lbs`} />
              <StatBox icon="📦" label="Annual Yield" value={`${schedule.annualYield.min}–${schedule.annualYield.max} lbs`} />
              <StatBox icon="📐" label="Growing Area" value={`${schedule.totalFt2} ft²`} />
              <StatBox icon="🌱" label="Succession Every" value={`${schedule.successionDays} days`} />
            </div>

            {/* Commercial Metrics */}
            {isCommercial && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.commercialBox}>
                <h4 style={styles.commercialTitle}>💰 Commercial Projections (XCD)</h4>
                <div style={styles.statsGrid}>
                  <StatBox icon="💵" label="Market Price / lb" value={`$${schedule.commercial.pricePerLb}`} color="#E6A93C" />
                  <StatBox icon="📈" label="Est. Revenue / Year" value={`$${schedule.commercial.revenueMin.toLocaleString()}–$${schedule.commercial.revenueMax.toLocaleString()}`} color="#5A9F6E" />
                  <StatBox icon="🏗️" label="Est. Costs / Year" value={`$${schedule.commercial.totalCost.toLocaleString()}`} color="#999" />
                  <StatBox icon="💹" label="Est. ROI / Year"
                    value={`$${schedule.commercial.roiMin.toLocaleString()}–$${schedule.commercial.roiMax.toLocaleString()}`}
                    color={schedule.commercial.roiMin >= 0 ? "#5A9F6E" : "#ef4444"} />
                </div>
                <p style={styles.commercialNote}>
                  * Revenue based on local XCD market rates. Cost estimate uses a rough $0.80/ft²/cycle input cost.
                  Adjust pricing and cost per your actual inputs for accurate ROI.
                </p>
              </motion.div>
            )}

            {/* Succession Planting */}
            <div style={styles.successionBox}>
              <h4>🔄 Succession Planting Strategy</h4>
              <p style={{ marginTop: "0.5rem", color: "#444", lineHeight: 1.7 }}>
                For continuous harvest, start a new bed of <strong>{schedule.cropName}</strong> every{" "}
                <strong>{schedule.successionDays} days</strong>. With {schedule.numBeds} bed(s) and {schedule.cyclesPerYear} cycles per year,
                you can expect <strong>{schedule.annualYield.min}–{schedule.annualYield.max} lbs</strong> annually.
              </p>
              <div style={styles.tip}>
                💡 <strong>Tip:</strong> {schedule.crop.production === "cut-and-come"
                  ? "This is a cut-and-come-again crop — one planting yields multiple harvests. Focus on consistent cutting rather than succession sowing."
                  : "Stagger your plantings to avoid a single glut. Sell or preserve the excess from peak harvests."}
              </div>
            </div>

            {/* Next Steps */}
            <div style={styles.nextSteps}>
              <h4 style={{ marginBottom: "0.75rem" }}>📝 Next Steps</h4>
              <ul style={styles.stepList}>
                {schedule.nurseryDays > 0 && <li>Start seeds in nursery trays on <strong>{fmtDate(schedule.sowDate)}</strong></li>}
                {schedule.transplantDate && <li>Transplant to beds on <strong>{fmtDate(schedule.transplantDate)}</strong> at {schedule.crop.spacing.min}–{schedule.crop.spacing.max}" spacing</li>}
                {schedule.nurseryDays === 0 && <li>Direct sow into prepared beds on <strong>{fmtDate(schedule.sowDate)}</strong></li>}
                <li>Prepare <strong>{schedule.numBeds} bed(s)</strong> × {bedLength}×{bedWidth}ft = {schedule.totalFt2} ft² total</li>
                <li>Expect first harvest around <strong>{fmtDate(schedule.harvestStart)}</strong></li>
                <li>Set a calendar reminder to start next succession in <strong>{schedule.successionDays} days</strong></li>
                {schedule.crop.production?.includes("herb") && <li>Pinch flowers regularly to extend the productive harvest window</li>}
                {schedule.incompatWarning && <li style={{ color: "#E6A93C" }}>⚠️ Ensure adequate separation from incompatible crops</li>}
              </ul>
            </div>

            <button onClick={savePlan} disabled={saving}
              style={{ ...styles.saveBtn, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving..." : "💾 Save to My Planner"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.infoLabel}>{label}</span>
      <span style={styles.infoValue}>{value}</span>
    </div>
  );
}

function StatBox({ icon, label, value, color }) {
  return (
    <div style={styles.statBox}>
      <span style={{ fontSize: "1.5rem" }}>{icon}</span>
      <span style={{ ...styles.statValue, color: color || "var(--soil-green)" }}>{value}</span>
      <span style={styles.statLabel}>{label}</span>
    </div>
  );
}

function TimelineEvent({ icon, color, title, date, desc, moon }) {
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} style={styles.timelineEvent}>
      <div style={{ ...styles.timelineIcon, background: color }}>{icon}</div>
      <div style={styles.timelineContent}>
        <h4 style={styles.timelineTitle}>{title}</h4>
        <p style={styles.timelineDate}>{date}</p>
        <p style={styles.timelineDesc}>{desc}</p>
        {moon && <p style={styles.moonPill}>{moon}</p>}
      </div>
    </motion.div>
  );
}

const styles = {
  planner: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", marginTop: "2rem" },
  panel: { background: "white", padding: "1.5rem", borderRadius: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", height: "fit-content" },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" },
  panelTitle: { fontSize: "1.2rem", color: "var(--ink-black)", margin: 0 },
  variantLabel: { color: "var(--soil-green)", fontWeight: "600", margin: "0 0 1rem", fontSize: "0.95rem" },
  moonToggle: { padding: "0.4rem 0.9rem", borderRadius: "20px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "0.85rem", transition: "all 0.2s" },
  label: { display: "block", fontWeight: "600", color: "var(--ink-black)", fontSize: "0.9rem", margin: "1rem 0 0.4rem" },
  inputHint: { display: "block", fontSize: "0.8rem", color: "#999", marginBottom: "0.25rem" },
  select: { width: "100%", padding: "0.75rem", fontSize: "1rem", border: "1px solid #ddd", borderRadius: "8px", boxSizing: "border-box" },
  input: { width: "100%", padding: "0.75rem", fontSize: "1rem", border: "1px solid #ddd", borderRadius: "8px", boxSizing: "border-box" },
  errorText: { display: "block", color: "#ef4444", fontSize: "0.82rem", marginTop: "0.25rem" },
  incompatBox: { background: "#FFF4E6", border: "2px solid #E6A93C", borderRadius: "8px", padding: "0.875rem", fontSize: "0.9rem", color: "#8a5a00", marginTop: "0.75rem", lineHeight: 1.5, overflow: "hidden" },
  generateBtn: { width: "100%", marginTop: "1.5rem", padding: "1rem", background: "var(--soil-green)", color: "white", border: "none", borderRadius: "8px", fontSize: "1rem", fontWeight: "600", cursor: "pointer" },
  infoGrid: { display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem" },
  infoRow: { display: "flex", justifyContent: "space-between", padding: "0.6rem 0.75rem", background: "#f9f9f9", borderRadius: "6px" },
  infoLabel: { fontSize: "0.85rem", color: "#666" },
  infoValue: { fontSize: "0.85rem", fontWeight: "600", color: "var(--ink-black)", textAlign: "right", maxWidth: "60%" },
  notesBox: { background: "#F0F9F4", borderRadius: "8px", padding: "1rem", marginTop: "1rem", border: "1px solid rgba(91,138,60,0.2)" },
  notesText: { fontSize: "0.88rem", color: "#444", lineHeight: 1.7, margin: 0 },
  moonBox: { background: "#1a1a2e", borderRadius: "8px", padding: "1rem", marginTop: "1rem", color: "white" },
  moonTip: { fontSize: "0.85rem", lineHeight: 1.7, color: "#c8d8ff", marginBottom: "0.5rem" },
  timeline: { display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.5rem", paddingLeft: "1rem" },
  timelineEvent: { display: "flex", gap: "1rem" },
  timelineIcon: { width: "44px", height: "44px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 },
  timelineContent: { flex: 1, paddingBottom: "1rem", borderBottom: "1px solid #f0f0f0" },
  timelineTitle: { fontSize: "1rem", margin: "0 0 0.2rem", color: "var(--ink-black)" },
  timelineDate: { fontSize: "0.9rem", color: "var(--soil-green)", fontWeight: "600", margin: "0 0 0.4rem" },
  timelineDesc: { fontSize: "0.88rem", color: "#666", margin: 0 },
  moonPill: { fontSize: "0.82rem", color: "#5a6ea8", background: "#eef0ff", borderRadius: "4px", padding: "0.3rem 0.6rem", marginTop: "0.5rem", display: "inline-block" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "1rem", marginTop: "1.5rem" },
  statBox: { background: "#f9f9f9", borderRadius: "10px", padding: "1rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem", textAlign: "center" },
  statValue: { fontSize: "1.1rem", fontWeight: "700" },
  statLabel: { fontSize: "0.75rem", color: "#666" },
  commercialBox: { background: "#F9FDF4", border: "2px solid var(--soil-green)", borderRadius: "10px", padding: "1.5rem", marginTop: "2rem" },
  commercialTitle: { color: "var(--ink-black)", margin: "0 0 0.5rem" },
  commercialNote: { fontSize: "0.8rem", color: "#999", marginTop: "1rem", fontStyle: "italic" },
  successionBox: { background: "#F0F9F4", border: "2px solid var(--soil-green)", borderRadius: "8px", padding: "1.25rem", marginTop: "2rem" },
  tip: { marginTop: "0.75rem", padding: "0.75rem 1rem", background: "white", borderRadius: "6px", borderLeft: "4px solid var(--soil-green)", fontSize: "0.9rem", color: "#444", lineHeight: 1.6 },
  nextSteps: { marginTop: "2rem" },
  stepList: { paddingLeft: "1.5rem", lineHeight: 2.2, color: "#444", fontSize: "0.95rem" },
  saveBtn: { marginTop: "2rem", padding: "1rem 2rem", background: "var(--soil-green)", color: "white", border: "none", borderRadius: "8px", fontSize: "1rem", fontWeight: "600", cursor: "pointer" },
};