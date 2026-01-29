import React, { useState } from "react";
import { motion } from "framer-motion";

// Crop database based on the spreadsheet
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
    varieties: ["Bell", "Sweet Banana"]
  }
};

export default function CropPlanner({ userData }) {
  const [selectedCrop, setSelectedCrop] = useState("Kale");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [numBeds, setNumBeds] = useState(1);
  const [schedule, setSchedule] = useState(null);

  const generateSchedule = () => {
    const crop = CROP_DATABASE[selectedCrop];
    const start = new Date(startDate);
    
    // Calculate total cycle weeks
    const totalCycle = crop.weeksToHarvest + crop.weeksOfHarvest + crop.stalebedWeeks - crop.weeksInTrays;
    
    // Calculate key dates
    const traySowDate = new Date(start);
    const transplantDate = new Date(start);
    transplantDate.setDate(transplantDate.getDate() + (crop.weeksInTrays * 7));
    
    const harvestStartDate = new Date(start);
    harvestStartDate.setDate(harvestStartDate.getDate() + (crop.weeksToHarvest * 7));
    
    const harvestEndDate = new Date(harvestStartDate);
    harvestEndDate.setDate(harvestEndDate.getDate() + (crop.weeksOfHarvest * 7));
    
    // Calculate succession plantings (if applicable)
    const cyclesPerYear = Math.floor(28 / totalCycle); // Assuming 28 week growing season
    
    setSchedule({
      crop: selectedCrop,
      cropData: crop,
      traySowDate: traySowDate.toLocaleDateString(),
      transplantDate: transplantDate.toLocaleDateString(),
      harvestStartDate: harvestStartDate.toLocaleDateString(),
      harvestEndDate: harvestEndDate.toLocaleDateString(),
      totalCycleWeeks: totalCycle,
      cyclesPerYear,
      numBeds,
      totalSeeds: crop.seedsPerSowing * numBeds,
      estimatedYield: calculateYield(selectedCrop, numBeds, cyclesPerYear)
    });
  };

  const calculateYield = (cropName, beds, cycles) => {
    // Simplified yield calculation
    const yieldPerBedPerCycle = {
      "Kale": "100 lbs",
      "Romaine Lettuce": "360 heads",
      "Asian Greens": "40 lbs",
      "Swiss Chard": "600 bunches",
      "Zucchini": "200 lbs",
      "Tomatoes": "300 lbs",
      "Sweet Peppers": "150 lbs"
    };
    
    return yieldPerBedPerCycle[cropName] || "Variable";
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
        
        <label style={styles.label}>Select Crop</label>
        <select
          value={selectedCrop}
          onChange={(e) => setSelectedCrop(e.target.value)}
          style={styles.select}
        >
          {Object.keys(CROP_DATABASE).map(crop => (
            <option key={crop} value={crop}>{crop}</option>
          ))}
        </select>

        <label style={styles.label}>Start Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={styles.input}
        />

        <label style={styles.label}>Number of Beds</label>
        <input
          type="number"
          min="1"
          value={numBeds}
          onChange={(e) => setNumBeds(parseInt(e.target.value) || 1)}
          style={styles.input}
        />

        <button onClick={generateSchedule} style={styles.generateButton}>
          Generate Planting Schedule
        </button>
      </motion.div>

      {/* Crop Info Card */}
      {selectedCrop && (
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
            <InfoItem label="Seeds Needed" value={CROP_DATABASE[selectedCrop].seedsPerSowing} />
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
              description={`Start ${schedule.totalSeeds} seeds in trays`}
              color="#7FB34D"
            />
            
            {schedule.cropData.weeksInTrays > 0 && (
              <TimelineEvent
                icon="🌿"
                title="Transplant"
                date={schedule.transplantDate}
                description={`Move seedlings to beds (${schedule.cropData.spacing})`}
                color="#5A9F6E"
              />
            )}
            
            <TimelineEvent
              icon="🌾"
              title="Harvest Begins"
              date={schedule.harvestStartDate}
              description={`Start harvesting - ${schedule.estimatedYield} per cycle`}
              color="#E6A93C"
            />
            
            <TimelineEvent
              icon="✅"
              title="Harvest Complete"
              date={schedule.harvestEndDate}
              description={`Cycle complete - prepare for next planting`}
              color="#EFA8B8"
            />
          </div>

          {/* Succession Planting Info */}
          <div style={styles.successionInfo}>
            <h4>🔄 Succession Planting</h4>
            <p>
              With a {schedule.totalCycleWeeks}-week cycle, you can plant {schedule.crop} approximately{" "}
              <strong>{schedule.cyclesPerYear} times</strong> during the growing season.
            </p>
            <p style={styles.tip}>
              💡 <strong>Tip:</strong> Stagger plantings every {Math.ceil(schedule.totalCycleWeeks / 2)} weeks
              for continuous harvest throughout the season.
            </p>
          </div>

          {/* Action Items */}
          <div style={styles.actionItems}>
            <h4>📝 Next Steps</h4>
            <ul style={styles.actionList}>
              <li>Order {schedule.totalSeeds} {schedule.crop} seeds (add 20% buffer)</li>
              <li>Prepare {schedule.numBeds} bed(s) with proper spacing</li>
              {schedule.cropData.mulch && <li>Apply mulch to beds</li>}
              <li>Set calendar reminder for {schedule.traySowDate}</li>
              <li>Monitor weather forecast for planting conditions</li>
            </ul>
          </div>

          <button style={styles.saveButton}>
            Save to My Planner
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
  select: {
    width: "100%",
    padding: "0.75rem",
    fontSize: "1rem",
    border: "1px solid #ddd",
    borderRadius: "8px",
    boxSizing: "border-box"
  },
  input: {
    width: "100%",
    padding: "0.75rem",
    fontSize: "1rem",
    border: "1px solid #ddd",
    borderRadius: "8px",
    boxSizing: "border-box"
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
    color: "var(--ink-black)"
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
    fontStyle: "italic",
    color: "#666"
  },
  actionItems: {
    marginTop: "2rem"
  },
  actionList: {
    marginTop: "1rem",
    paddingLeft: "1.5rem"
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
    cursor: "pointer"
  }
};
