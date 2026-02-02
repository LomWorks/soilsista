/**
 * Check if two dates are the same day
 */
function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

/**
 * Group users by location (island)
 */
function groupUsersByLocation(users) {
  const groups = {};
  
  users.forEach(user => {
    const island = user.location?.island || 'Unknown';
    if (!groups[island]) {
      groups[island] = [];
    }
    groups[island].push(user);
  });
  
  return groups;
}

/**
 * Format date for display
 */
function formatDate(date) {
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * Get milestone message based on count
 */
function getMilestoneMessage(count) {
  const messages = {
    1: "Congratulations on your first harvest! This is just the beginning of your farming journey. 🌱",
    5: "Great job! You've completed 5 crops. Keep up the excellent work! 🌾",
    10: "Amazing! You've completed 10 crops. You're becoming an experienced farmer! 🌿",
    25: "Wow! 25 crops completed. Your green thumb is really showing! 🎊",
    50: "Incredible! 50 crops harvested. You're a true Soil Sista! 🏆",
    100: "Legendary! 100 crops completed. You're a master farmer! 🏅"
  };
  
  return messages[count] || `Congratulations on completing ${count} crops!`;
}

/**
 * Truncate text to specified length
 */
function truncate(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

module.exports = {
  isSameDay,
  groupUsersByLocation,
  formatDate,
  getMilestoneMessage,
  truncate
};
