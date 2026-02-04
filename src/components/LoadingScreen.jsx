// This can be made to be more visually appealing (they just look like lines and somewhat messy), it also cycles through too fast (fix interval logic, give each animation enough time to actually play out, also give the messages time to be read). 

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoadingScreen() {
  const [loadingPhase, setLoadingPhase] = useState(0);

  // Choose the animation once on mount so it doesn't switch mid-animation
  const [animationChoice] = useState(() => Math.random() > 0.5 ? 'watering' : 'lettuce');
  
  const messages = [
    "Analyzing your farm data...",
    "Connecting to climate systems...",
    "Preparing your personalized plan...",
    "Almost ready!"
  ];

  useEffect(() => {
    const intervalMs = 4500; // Give each message and animation ample time to play
    const interval = setInterval(() => {
      setLoadingPhase(prev => (prev + 1) % messages.length);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div style={styles.container}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={styles.content}
      >
        {/* Chosen animation for this loading session */}
        {animationChoice === 'watering' ? <WateringPlant /> : <BloomingLettuce />}
        
        <AnimatePresence mode="wait">
          <motion.p
            key={loadingPhase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.6 }}
            style={styles.message}
          >
            {messages[loadingPhase]}
          </motion.p>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// Watering Plant Animation
function WateringPlant() {
  return (
    <svg width="200" height="200" viewBox="0 0 200 200" style={styles.svg}>
      {/* Pot */}
      <motion.path
        d="M 60 140 L 70 180 L 130 180 L 140 140 Z"
        fill="var(--sun-mustard)"
        stroke="var(--ink-black)"
        strokeWidth="2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      />
      
      {/* Soil */}
      <motion.ellipse
        cx="100"
        cy="140"
        rx="40"
        ry="8"
        fill="#8B4513"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      />
      
      {/* Plant Stem */}
      <motion.line
        x1="100"
        y1="140"
        x2="100"
        y2="80"
        stroke="var(--soil-green)"
        strokeWidth="4"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.8, delay: 0.5, ease: "easeOut" }}
      />
      
      {/* Leaves */}
      <motion.ellipse
        cx="85"
        cy="100"
        rx="15"
        ry="8"
        fill="var(--deep-leaf)"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.3, type: "spring", stiffness: 140, damping: 14 }}
      />
      <motion.ellipse
        cx="115"
        cy="110"
        rx="15"
        ry="8"
        fill="var(--deep-leaf)"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.6, type: "spring", stiffness: 140, damping: 14 }}
      />
      <motion.ellipse
        cx="90"
        cy="85"
        rx="12"
        ry="6"
        fill="var(--soil-green)"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.9, type: "spring", stiffness: 140, damping: 14 }}
      />
      
      {/* Watering Can */}
      <motion.g
        initial={{ x: 150, y: -50, opacity: 0 }}
        animate={{ 
          x: [150, 50, 50],
          y: [-50, -50, 20],
          rotate: [0, 0, -20],
          opacity: [0, 1, 1]
        }}
        transition={{ duration: 3, times: [0, 0.6, 1], ease: "easeInOut" }}
      >
        {/* Can Body */}
        <rect x="0" y="0" width="30" height="25" rx="4" fill="var(--deep-leaf)" stroke="var(--ink-black)" strokeWidth="1.5"/>
        
        {/* Spout */}
        <path
          d="M 30 10 Q 40 10, 45 5"
          stroke="var(--deep-leaf)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        
        {/* Handle */}
        <path
          d="M 5 0 Q 5 -10, 15 -10 Q 25 -10, 25 0"
          stroke="var(--ink-black)"
          strokeWidth="2"
          fill="none"
        />
      </motion.g>
      
      {/* Water Drops - MUCH MORE SUBTLE */}
      <WaterDrops />
    </svg>
  );
}

function WaterDrops() {
  // Fewer drops, slower fall so it's subtle and legible
  const drops = [
    { x: 82, delay: 2.2 },
    { x: 92, delay: 2.5 },
    { x: 102, delay: 2.8 }
  ];

  return (
    <>
      {drops.map((drop, i) => (
        <motion.circle
          key={i}
          cx={drop.x}
          cy="10"
          r="2" // slightly larger for visibility
          fill="#6CB4EE"
          initial={{ y: -10, opacity: 0.35 }}
          animate={{ 
            y: [ -10, 110 ],
            opacity: [0.35, 0.5, 0]
          }}
          transition={{
            delay: drop.delay,
            duration: 1.2,
            ease: "easeOut",
            repeat: Infinity,
            repeatDelay: 3.0
          }}
        />
      ))}
    </>
  );
} 

// Blooming Lettuce Animation
function BloomingLettuce() {
  return (
    <svg width="200" height="200" viewBox="0 0 200 200" style={styles.svg}>
      {/* Ground Line */}
      <motion.line
        x1="30"
        y1="150"
        x2="170"
        y2="150"
        stroke="var(--ink-black)"
        strokeWidth="3"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5 }}
      />
      
      {/* Soil Mound */}
      <motion.ellipse
        cx="100"
        cy="150"
        rx="50"
        ry="15"
        fill="#8B4513"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: "spring" }}
      />
      
      {/* Lettuce Leaves - Blooming Outward */}
      {/* Center leaves */}
      <LettuceLeaf
        d="M 100 130 Q 90 115 85 100 Q 90 90 100 95 Q 110 90 115 100 Q 110 115 100 130"
        delay={0.9}
        color="var(--deep-leaf)"
      />
      <LettuceLeaf
        d="M 100 125 Q 95 112 92 100 Q 95 92 100 96 Q 105 92 108 100 Q 105 112 100 125"
        delay={1.0}
        color="var(--soil-green)"
      />
      
      {/* Outer leaves blooming */}
      <LettuceLeaf
        d="M 100 130 Q 75 120 60 110 Q 55 100 65 95 Q 75 100 100 110"
        delay={1.2}
        color="var(--deep-leaf)"
      />
      <LettuceLeaf
        d="M 100 130 Q 125 120 140 110 Q 145 100 135 95 Q 125 100 100 110"
        delay={1.25}
        color="var(--deep-leaf)"
      />
      <LettuceLeaf
        d="M 100 120 Q 80 115 70 105 Q 68 95 75 92 Q 85 95 100 105"
        delay={1.3}
        color="#7FB34D"
      />
      <LettuceLeaf
        d="M 100 120 Q 120 115 130 105 Q 132 95 125 92 Q 115 95 100 105"
        delay={1.35}
        color="#7FB34D"
      />
      
      {/* More outer frilly leaves */}
      <LettuceLeaf
        d="M 100 125 Q 70 118 55 108 Q 50 98 58 93 Q 70 97 100 108"
        delay={1.4}
        color="var(--soil-green)"
      />
      <LettuceLeaf
        d="M 100 125 Q 130 118 145 108 Q 150 98 142 93 Q 130 97 100 108"
        delay={1.45}
        color="var(--soil-green)"
      />
      
      {/* Top leaves */}
      <LettuceLeaf
        d="M 100 115 Q 90 105 85 90 Q 88 80 95 85 Q 100 80 100 95"
        delay={1.5}
        color="#9BC76D"
      />
      <LettuceLeaf
        d="M 100 115 Q 110 105 115 90 Q 112 80 105 85 Q 100 80 100 95"
        delay={1.55}
        color="#9BC76D"
      />
      
      {/* Sparkle effects when fully bloomed */}
      <Sparkles />
    </svg>
  );
}

function LettuceLeaf({ d, delay, color }) {
  return (
    <motion.path
      d={d}
      fill={color}
      stroke="var(--ink-black)"
      strokeWidth="1.5"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: 1,
        opacity: 1
      }}
      transition={{
        delay,
        duration: 1.1,
        type: "spring",
        stiffness: 120,
        damping: 14
      }}
    />
  );
} 

function Sparkles() {
  const sparklePositions = [
    { x: 70, y: 90 },
    { x: 130, y: 95 },
    { x: 100, y: 75 },
    { x: 85, y: 110 },
    { x: 115, y: 105 }
  ];

  return (
    <>
      {sparklePositions.map((pos, i) => (
        <motion.g key={i}>
          <motion.line
            x1={pos.x - 4}
            y1={pos.y}
            x2={pos.x + 4}
            y2={pos.y}
            stroke="#FFD700"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 1, 0],
              scale: [0, 1, 0]
            }}
            transition={{
              delay: 2.2 + (i * 0.25),
              duration: 1.2,
              repeat: Infinity,
              repeatDelay: 4
            }}
          />
          <motion.line
            x1={pos.x}
            y1={pos.y - 4}
            x2={pos.x}
            y2={pos.y + 4}
            stroke="#FFD700"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 1, 0],
              scale: [0, 1, 0]
            }}
            transition={{
              delay: 2.2 + (i * 0.25),
              duration: 1.2,
              repeat: Infinity,
              repeatDelay: 4
            }}
          />
        </motion.g>
      ))}
    </>
  );
}

const styles = {
  container: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "var(--paper-cream)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999
  },
  content: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2rem"
  },
  svg: {
    filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.12))",
    transformOrigin: "center"
  },
  message: {
    fontSize: "1.2rem",
    color: "var(--ink-black)",
    fontFamily: "'Playfair Display', serif",
    textAlign: "center",
    padding: "0 2rem"
  }
};