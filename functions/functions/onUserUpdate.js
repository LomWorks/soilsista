const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { getMilestoneMessage } = require('../utils/helpers');
const { DASHBOARD_URL } = require('../config/constants');

/**
 * FUNCTION 4: onUserUpdate
 * 
 * Trigger: When user document is updated in Firestore
 * Purpose: Track milestones and celebrate achievements
 * 
 * Workflow:
 * 1. User document updated (e.g., stats.cropsHarvested incremented)
 * 2. Function compares before/after values
 * 3. If milestone reached (1, 5, 10, 25, 50, 100), creates celebration
 * 4. Creates notification activity visible in dashboard
 * 
 * Milestones Tracked:
 * - First harvest (1 crop)
 * - 5 crops
 * - 10 crops
 * - 25 crops
 * - 50 crops
 * - 100 crops
 */
module.exports = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    
    const before = change.before.data();
    const after = change.after.data();
    const userId = context.params.userId;
    
    try {
      // Check if crops harvested increased
      const beforeHarvested = before.stats?.cropsHarvested || 0;
      const afterHarvested = after.stats?.cropsHarvested || 0;
      
      if (afterHarvested > beforeHarvested) {
        console.log(`User ${userId} completed harvest! Total: ${afterHarvested}`);
        
        // Check for milestone
        const milestones = [1, 5, 10, 25, 50, 100];
        
        if (milestones.includes(afterHarvested)) {
          console.log(`🎉 Milestone reached: ${afterHarvested} crops!`);
          
          // Create celebration notification
          await admin.firestore().collection('activities').add({
            userId: userId,
            type: 'notification',
            category: 'achievement',
            title: `🎉 Milestone: ${afterHarvested} Crops!`,
            message: getMilestoneMessage(afterHarvested),
            icon: '🏆',
            status: 'unread',
            data: {
              milestone: afterHarvested,
              achievementType: 'crops_harvested',
              isSpecial: true
            },
            actionUrl: DASHBOARD_URL,
            actionLabel: 'View Dashboard',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          });
          
          console.log(`Celebration activity created for user ${userId}`);
        }
      }
      
      // Track last active time
      const beforeActive = before.stats?.lastActive?.toMillis() || 0;
      const afterActive = after.stats?.lastActive?.toMillis() || 0;
      
      if (afterActive > beforeActive) {
        console.log(`User ${userId} activity tracked`);
      }
      
      return null;
      
    } catch (error) {
      console.error('Error in onUserUpdate:', error);
      return null;
    }
  });
