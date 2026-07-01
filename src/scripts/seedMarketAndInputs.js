/**
 * One-time seed script for the `market_prices` and `input_library`
 * (+ `input_compat_rules`) Firestore collections.
 *
 * These collections didn't exist before — GrowerDashboard.js used to have
 * this data hardcoded in the frontend. It's now read live from Firestore,
 * which means the collections need at least a starting dataset. This
 * script writes that starting data via firebase-admin (bypasses
 * firestore.rules, since only admin can write these collections).
 *
 * Safe to re-run — uses deterministic doc IDs, so re-running just
 * overwrites with the same values instead of duplicating documents.
 *
 * USAGE:
 *   1. Get a service account key for the soil-sista Firebase project
 *      (Firebase Console → Project Settings → Service Accounts →
 *      Generate new private key) and save it locally, e.g. as
 *      ./serviceAccountKey.json (do NOT commit this file).
 *   2. From the project root:
 *        npm install firebase-admin --no-save   (if not already installed)
 *        GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/seedMarketAndInputs.js
 */

const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

// ── Market reference prices ──────────────────────────────────────────────
// These are the same figures that used to be hardcoded in MarketSection.
// Update freely in Firestore going forward — this is just the starting set.
const MARKET_PRICES = [
  { id: "tomato",       produce: "Tomato Cherry",    unit: "per lb",    market: 7.50, key: "tomato"       },
  { id: "bok-choy",     produce: "Bok Choy",         unit: "per lb",    market: 2.00, key: "bok choy"     },
  { id: "cucumber",     produce: "Cucumber English", unit: "per unit",  market: 3.50, key: "cucumber"     },
  { id: "pepper",       produce: "Bell Pepper",      unit: "per lb",    market: 5.00, key: "pepper"       },
  { id: "callaloo",     produce: "Callaloo",         unit: "per bunch", market: 2.50, key: "callaloo"     },
  { id: "scallion",     produce: "Scallion",         unit: "per bunch", market: 1.50, key: "scallion"     },
  { id: "sweet-potato", produce: "Sweet Potato",     unit: "per lb",    market: 1.80, key: "sweet potato" },
  { id: "okra",         produce: "Okra",             unit: "per lb",    market: 4.00, key: "okra"         },
  { id: "pumpkin",      produce: "Pumpkin",          unit: "per lb",    market: 1.20, key: "pumpkin"      },
  { id: "kale",         produce: "Kale",             unit: "per lb",    market: 3.50, key: "kale"         },
];

// ── Input library starting products ──────────────────────────────────────
const INPUT_LIBRARY = [
  { id: "neem-oil",      icon: "🌿", name: "Neem Oil",            type: "Insecticide / Fungicide · Organic", rate: "Rate: 1–2% · 20ml/L water" },
  { id: "copper-fungicide", icon: "🔵", name: "Copper Fungicide", type: "Fungicide · Organic",               rate: "Rate: 0.5% · 5g/L water" },
  { id: "fish-emulsion", icon: "🐟", name: "Fish Emulsion 5-1-1", type: "Fertilizer · Organic",              rate: "Rate: 30ml/L · foliar or drench" },
  { id: "calcium-nitrate", icon: "⚪", name: "Calcium Nitrate",   type: "Fertilizer · Synthetic",            rate: "Rate: 2g/L · drench or foliar" },
  { id: "worm-castings", icon: "🟤", name: "Worm Castings",       type: "Amendment · Organic",               rate: "Rate: 1 cup/plant · top-dress" },
];

// ── Tank-mix compatibility rules ─────────────────────────────────────────
const INPUT_COMPAT_RULES = [
  { id: "neem-copper", a: "Neem Oil",            b: "Copper Fungicide",    ok: false, note: "Do not tank-mix. Apply separately with 3+ day gap. Copper can denature neem compounds." },
  { id: "fish-worm",   a: "Fish Emulsion 5-1-1", b: "Worm Castings",       ok: true,  note: "Compatible. Combine in drench. Use within 24 hours of mixing." },
  { id: "neem-fish",   a: "Neem Oil",            b: "Fish Emulsion 5-1-1", ok: true,  note: "Compatible. Apply together as foliar drench at dusk." },
];

async function seed() {
  const batch = db.batch();

  MARKET_PRICES.forEach(({ id, ...data }) => {
    batch.set(db.collection("market_prices").doc(id), data);
  });

  INPUT_LIBRARY.forEach(({ id, ...data }) => {
    batch.set(db.collection("input_library").doc(id), {
      ...data,
      addedBy: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  INPUT_COMPAT_RULES.forEach(({ id, ...data }) => {
    batch.set(db.collection("input_compat_rules").doc(id), data);
  });

  await batch.commit();
  console.log(`Seeded ${MARKET_PRICES.length} market prices, ${INPUT_LIBRARY.length} input products, ${INPUT_COMPAT_RULES.length} compat rules.`);
}

seed()
  .then(() => process.exit(0))
  .catch(err => { console.error("Seed failed:", err); process.exit(1); });
