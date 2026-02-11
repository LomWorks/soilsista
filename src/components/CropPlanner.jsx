import React, { useState } from "react";
import { motion } from "framer-motion";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

// Crop database based on the spreadsheet given
const CROP_DATABASE = {
  "Kale": {
    weeksToHarvest: 8,
    weeksOfHarvest: 8,
    stalebedWeeks: 0,
    weeksInTrays: 3,
    spacing: '3 rows, every 12"',
    sitesPerSowing: 300,
    sowingPerWeek: 6,
    mulch: true,
    seedsPerSowing: 360,
    yieldPerBed: 100, // lbs per bed per cycle
    yieldUnit: "lbs",
    varieties: ["Darkibor", "Lacianato", "Kalettes"]
  },
  "Romaine Lettuce": {
    weeksToHarvest: 9,
    weeksOfHarvest: 1,
    stalebedWeeks: 0,
    weeksInTrays: 3,
    spacing: '3 rows, every 10"',
    sitesPerSowing: 360,
    sowingPerWeek: 1,
    mulch: true,
    seedsPerSowing: 432,
    yieldPerBed: 360, // heads per bed
    yieldUnit: "heads",
    varieties: ["Salvius", "Muir"]
  },
  "Asian Greens": {
    weeksToHarvest: 3,
    weeksOfHarvest: 3,
    stalebedWeeks: 2,
    weeksInTrays: 0,
    spacing: '6 row seeder',
    sitesPerSowing: 2,
    sowingPerWeek: 3,
    mulch: false,
    seedsPerSowing: 2.4,
    yieldPerBed: 40,
    yieldUnit: "lbs",
    varieties: ["Mizuna", "Tatsoi", "Red Giant"]
  },
  "Swiss Chard": {
    weeksToHarvest: 8,
    weeksOfHarvest: 8,
    stalebedWeeks: 0,
    weeksInTrays: 3,
    spacing: '3 rows, every 12"',
    sitesPerSowing: 300,
    sowingPerWeek: 1,
    mulch: true,
    seedsPerSowing: 400,
    yieldPerBed: 600,
    yieldUnit: "bunches",
    varieties: ["Bright Lights"]
  },
  "Zucchini": {
    weeksToHarvest: 8,
    weeksOfHarvest: 5,
    stalebedWeeks: 0,
    weeksInTrays: 3,
    spacing: '1 row, every 24"',
    sitesPerSowing: 50,
    sowingPerWeek: 1,
    mulch: true,
    seedsPerSowing: 60,
    yieldPerBed: 200,
    yieldUnit: "lbs",
    varieties: ["Tigress"]
  },
  "Tomatoes": {
    weeksToHarvest: 12,
    weeksOfHarvest: 8,
    stalebedWeeks: 0,
    weeksInTrays: 4,
    spacing: '2 rows, every 18"',
    sitesPerSowing: 100,
    sowingPerWeek: 1,
    mulch: true,
    seedsPerSowing: 120,
    yieldPerBed: 300,
    yieldUnit: "lbs",
    varieties: ["Roma", "Cherry", "Beefsteak"]
  },
  "Sweet Peppers": {
    weeksToHarvest: 14,
    weeksOfHarvest: 6,
    stalebedWeeks: 0,
    weeksInTrays: 4,
    spacing: '2 rows, every 18"',
    sitesPerSowing: 100,
    sowingPerWeek: 1,
    mulch: true,
    seedsPerSowing: 120,
    yieldPerBed: 150,
    yieldUnit: "lbs",
    varieties: ["Bell", "Sweet Banana"]
  }
};

export default function CropPlanner({ userData }) {
  const [selectedCrop, setSelectedCrop] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [numBeds, setNumBeds] = useState(1);
  const [growingSeasonWeeks, setGrowingSeasonWeeks] = useState(52); // Year-round for Caribbean
  const [schedule, setSchedule] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const validateInputs = () => {
    const newErrors = {};
    
    if (!selectedCrop) {
      newErrors.crop = "Please select a crop";
    }
    
    const selectedDate = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      newErrors.date = "Start date cannot be in the past";
    }
    
    if (numBeds < 1 || numBeds > 100) {
      newErrors.beds = "Number of beds must be between 1 and 100";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateSchedule = () => {
    if (!validateInputs()) {
      return;
    }

    const crop = CROP_DATABASE[selectedCrop];
    const start = new Date(startDate);
    
    // Calculate total cycle weeks
    const totalCycle = crop.weeksToHarvest + crop.weeksOfHarvest + crop.stalebedWeeks;
    
    // Calculate key dates
    const traySowDate = new Date(start);
    const transplantDate = new Date(start);
    transplantDate.setDate(transplantDate.getDate() + (crop.weeksInTrays * 7));
    
    const harvestStartDate = new Date(start);
    harvestStartDate.setDate(harvestStartDate.getDate() + (crop.weeksToHarvest * 7));
    
    const harvestEndDate = new Date(harvestStartDate);
    harvestEndDate.setDate(harvestEndDate.getDate() + (crop.weeksOfHarvest * 7));
    
    const bedTurnoverDate = new Date(harvestEndDate);
    bedTurnoverDate.setDate(bedTurnoverDate.getDate() + (crop.stalebedWeeks * 7));
    
    // Calculate succession plantings
    const cyclesPerYear = Math.floor(growingSeasonWeeks / totalCycle);
    
    // Calculate total yield
    const totalYield = crop.yieldPerBed * numBeds * cyclesPerYear;
    
    // Calculate succession planting interval
    const successionInterval = Math.ceil(totalCycle / 2);
    
    setSchedule({
      crop: selectedCrop,
      cropData: crop,
      traySowDate: traySowDate.toLocaleDateString(),
      transplantDate: crop.weeksInTrays > 0 ? transplantDate.toLocaleDateString() : null,
      harvestStartDate: harvestStartDate.toLocaleDateString(),
      harvestEndDate: harvestEndDate.toLocaleDateString(),
      bedTurnoverDate: crop.stalebedWeeks > 0 ? bedTurnoverDate.toLocaleDateString() : null,
      totalCycleWeeks: totalCycle,
      cyclesPerYear,
      numBeds,
      totalSeeds: crop.seedsPerSowing * numBeds,
      totalSeedsForYear: crop.seedsPerSowing * numBeds * cyclesPerYear,
      estimatedYield: `${totalYield.toLocaleString()} ${crop.yieldUnit}`,
      yieldPerCycle: `${(crop.yieldPerBed * numBeds).toLocaleString()} ${crop.yieldUnit}`,
      successionInterval,
      // Store as Date objects for Firebase
      sowDate: traySowDate,
      transplantDateObj: crop.weeksInTrays > 0 ? transplantDate : null,
      harvestDate: harvestStartDate
    });
  };

  const savePlan = async () => {
    if (!userData?.userId) {
      alert("Please log in to save plans");
      return;
    }

    if (!schedule) {
      alert("Please generate a schedule first");
      return;
    }

    setSaving(true);

    try {
      await addDoc(collection(db, "activities"), {
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
          harvestDate: schedule.harvestDate,
          numBeds: schedule.numBeds,
          seedsNeeded: schedule.totalSeeds,
          totalSeedsForYear: schedule.totalSeedsForYear,
          spacing: schedule.cropData.spacing,
          mulchRequired: schedule.cropData.mulch,
          estimatedYield: schedule.estimatedYield,
          yieldPerCycle: schedule.yieldPerCycle,
          totalCycleWeeks: schedule.totalCycleWeeks,
          cyclesPerYear: schedule.cyclesPerYear,
          successionInterval: schedule.successionInterval
        },
        createdAt: new Date(),
        expiresAt: null
      });

      alert("✅ Plan saved successfully! Check your dashboard.");
      setSaving(false);

    } catch (error) {
      console.error("Error saving plan:", error);
      alert("Failed to save plan. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div style={styles.planner}>
      {/* Input Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={styles.inputSection}
      >
        <h3>Plan Your Crop</h3>
        
        <label style={styles.label}>Select Crop *</label>
        <select
          value={selectedCrop}
          onChange={(e) => {
            setSelectedCrop(e.target.value);
            setErrors({...errors, crop: null});
          }}
          style={{
            ...styles.select,
            borderColor: errors.crop ? "#ff4444" : "#ddd"
          }}
        >
          <option value="">-- Choose a crop --</option>
          {Object.keys(CROP_DATABASE).map(crop => (
            <option key={crop} value={crop}>{crop}</option>
          ))}
        </select>
        {errors.crop && <span style={styles.error}>{errors.crop}</span>}

        <label style={styles.label}>Start Date *</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setErrors({...errors, date: null});
          }}
          style={{
            ...styles.input,
            borderColor: errors.date ? "#ff4444" : "#ddd"
          }}
        />
        {errors.date && <span style={styles.error}>{errors.date}</span>}

        <label style={styles.label}>Number of Beds *</label>
        <input
          type="number"
          min="1"
          max="100"
          value={numBeds}
          onChange={(e) => {
            setNumBeds(parseInt(e.target.value) || 1);
            setErrors({...errors, beds: null});
          }}
          style={{
            ...styles.input,
            borderColor: errors.beds ? "#ff4444" : "#ddd"
          }}
        />
        {errors.beds && <span style={styles.error}>{errors.beds}</span>}

        <label style={styles.label}>
          Growing Season (weeks)
          <span style={styles.helpText}>Adjust for your climate</span>
        </label>
        <input
          type="number"
          min="12"
          max="52"
          value={growingSeasonWeeks}
          onChange={(e) => setGrowingSeasonWeeks(parseInt(e.target.value) || 52)}
          style={styles.input}
        />

        <button onClick={generateSchedule} style={styles.generateButton}>
          Generate Planting Schedule
        </button>
      </motion.div>

      {/* Crop Info Card */}
      {selectedCrop && CROP_DATABASE[selectedCrop] && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={styles.infoCard}
        >
          <h3>📋 {selectedCrop} Info</h3>
          <div style={styles.infoGrid}>
            <InfoItem label="Weeks to Harvest" value={CROP_DATABASE[selectedCrop].weeksToHarvest} />
            <InfoItem label="Harvest Window" value={`${CROP_DATABASE[selectedCrop].weeksOfHarvest} weeks`} />
            <InfoItem label="Spacing" value={CROP_DATABASE[selectedCrop].spacing} />
            <InfoItem label="Mulch Required" value={CROP_DATABASE[selectedCrop].mulch ? "Yes" : "No"} />
            <InfoItem label="Seeds per Bed" value={CROP_DATABASE[selectedCrop].seedsPerSowing} />
            <InfoItem label="Yield per Bed" value={`${CROP_DATABASE[selectedCrop].yieldPerBed} ${CROP_DATABASE[selectedCrop].yieldUnit}`} />
            <InfoItem label="Varieties" value={CROP_DATABASE[selectedCrop].varieties.join(", ")} />
          </div>
        </motion.div>
      )}

      {/* Schedule Output */}
      {schedule && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.scheduleSection}
        >
          <h3>🗓️ Your Planting Schedule</h3>
          
          <div style={styles.timeline}>
            <TimelineEvent
              icon="🌱"
              title="Tray Sowing"
              date={schedule.traySowDate}
              description={`Start ${schedule.totalSeeds.toLocaleString()} seeds in trays`}
              color="#7FB34D"
            />
            
            {schedule.transplantDate && (
              <TimelineEvent
                icon="🌿"
                title="Transplant"
                date={schedule.transplantDate}
                description={`Move seedlings to ${schedule.numBeds} bed(s) - ${schedule.cropData.spacing}`}
                color="#5A9F6E"
              />
            )}
            
            <TimelineEvent
              icon="🌾"
              title="Harvest Begins"
              date={schedule.harvestStartDate}
              description={`Start harvesting - ${schedule.yieldPerCycle} expected per cycle`}
              color="#E6A93C"
            />
            
            <TimelineEvent
              icon="✅"
              title="Harvest Complete"
              date={schedule.harvestEndDate}
              description={`Cycle complete - clear beds and prepare for next planting`}
              color="#EFA8B8"
            />

            {schedule.bedTurnoverDate && (
              <TimelineEvent
                icon="🔄"
                title="Bed Ready for Replanting"
                date={schedule.bedTurnoverDate}
                description="Stalebed period complete, ready for next succession"
                color="#9B59B6"
              />
            )}
          </div>

          {/* Succession Planting Info */}
          <div style={styles.successionInfo}>
            <h4>🔄 Succession Planting Strategy</h4>
            <p>
              <strong>Total cycle:</strong> {schedule.totalCycleWeeks} weeks from sowing to bed turnover
            </p>
            <p>
              <strong>Possible cycles per year:</strong> {schedule.cyclesPerYear} cycles in a {growingSeasonWeeks}-week season
            </p>
            <p>
              <strong>Annual yield projection:</strong> {schedule.estimatedYield} across all cycles
            </p>
            <p style={styles.tip}>
              💡 <strong>Recommended:</strong> Plant a new succession every {schedule.successionInterval} weeks
              for continuous harvest. This will require {schedule.totalSeedsForYear.toLocaleString()} seeds total for the year.
            </p>
          </div>

          {/* Action Items */}
          <div style={styles.actionItems}>
            <h4>📝 Next Steps</h4>
            <ul style={styles.actionList}>
              <li>✅ Order {Math.ceil(schedule.totalSeeds * 1.2).toLocaleString()} seeds (includes 20% buffer for this cycle)</li>
              <li>✅ Annual seed requirement: ~{Math.ceil(schedule.totalSeedsForYear * 1.2).toLocaleString()} seeds</li>
              <li>✅ Prepare {schedule.numBeds} bed(s) with {schedule.cropData.spacing} spacing</li>
              {schedule.cropData.mulch && <li>✅ Apply mulch to prepared beds</li>}
              <li>✅ Set calendar reminder for {schedule.traySowDate}</li>
              <li>✅ Set reminders for succession plantings every {schedule.successionInterval} weeks</li>
            </ul>
          </div>

          <button 
            onClick={savePlan} 
            style={{
              ...styles.saveButton,
              opacity: saving ? 0.7 : 1,
              cursor: saving ? "not-allowed" : "pointer"
            }}
            disabled={saving}
          >
            {saving ? "Saving..." : "💾 Save to My Planner"}
          </button>
        </motion.div>
      )}
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div style={styles.infoItem}>
      <span style={styles.infoLabel}>{label}:</span>
      <span style={styles.infoValue}>{value}</span>
    </div>
  );
}

function TimelineEvent({ icon, title, date, description, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      style={styles.timelineEvent}
    >
      <div style={{...styles.timelineIcon, backgroundColor: color}}>
        {icon}
      </div>
      <div style={styles.timelineContent}>
        <h4 style={styles.timelineTitle}>{title}</h4>
        <p style={styles.timelineDate}>{date}</p>
        <p style={styles.timelineDesc}>{description}</p>
      </div>
    </motion.div>
  );
}

const styles = {
  planner: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "1.5rem",
    marginTop: "2rem"
  },
  inputSection: {
    background: "white",
    padding: "1.5rem",
    borderRadius: "12px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    height: "fit-content"
  },
  label: {
    display: "block",
    fontWeight: "600",
    marginTop: "1rem",
    marginBottom: "0.5rem",
    color: "var(--ink-black)"
  },
  helpText: {
    display: "block",
    fontSize: "0.85rem",
    fontWeight: "400",
    color: "#666",
    marginTop: "0.25rem"
  },
  select: {
    width: "100%",
    padding: "0.75rem",
    fontSize: "1rem",
    border: "1px solid #ddd",
    borderRadius: "8px",
    boxSizing: "border-box",
    transition: "border-color 0.2s"
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
  error: {
    display: "block",
    color: "#ff4444",
    fontSize: "0.85rem",
    marginTop: "0.25rem"
  },
  generateButton: {
    width: "100%",
    marginTop: "1.5rem",
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
  infoCard: {
    background: "white",
    padding: "1.5rem",
    borderRadius: "12px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    height: "fit-content"
  },
  infoGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    marginTop: "1rem"
  },
  infoItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "0.75rem",
    background: "#f9f9f9",
    borderRadius: "6px"
  },
  infoLabel: {
    fontWeight: "500",
    color: "#666"
  },
  infoValue: {
    fontWeight: "600",
    color: "var(--ink-black)",
    textAlign: "right"
  },
  scheduleSection: {
    gridColumn: "1 / -1",
    background: "white",
    padding: "2rem",
    borderRadius: "12px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
  },
  timeline: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    marginTop: "1.5rem",
    position: "relative",
    paddingLeft: "2rem"
  },
  timelineEvent: {
    display: "flex",
    gap: "1rem",
    position: "relative"
  },
  timelineIcon: {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.5rem",
    flexShrink: 0
  },
  timelineContent: {
    flex: 1,
    paddingBottom: "1rem",
    borderBottom: "1px solid #f0f0f0"
  },
  timelineTitle: {
    fontSize: "1.1rem",
    marginBottom: "0.25rem",
    color: "var(--ink-black)"
  },
  timelineDate: {
    fontSize: "0.9rem",
    color: "var(--soil-green)",
    fontWeight: "600",
    marginBottom: "0.5rem"
  },
  timelineDesc: {
    fontSize: "0.9rem",
    color: "#666"
  },
  successionInfo: {
    background: "#F0F9F4",
    padding: "1.5rem",
    borderRadius: "8px",
    marginTop: "2rem",
    border: "2px solid var(--soil-green)"
  },
  tip: {
    marginTop: "1rem",
    padding: "1rem",
    background: "white",
    borderRadius: "6px",
    borderLeft: "4px solid var(--soil-green)"
  },
  actionItems: {
    marginTop: "2rem"
  },
  actionList: {
    marginTop: "1rem",
    paddingLeft: "1.5rem",
    lineHeight: "2"
  },
  saveButton: {
    marginTop: "2rem",
    padding: "1rem 2rem",
    background: "var(--deep-leaf)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s"
  }
};