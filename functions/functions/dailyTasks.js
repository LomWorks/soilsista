const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { fetchWeather, analyzeWeather } = require('../utils/weather');
const { groupUsersByLocation, isSameDay } = require('../utils/helpers');
const { TIMEZONE, DASHBOARD_URL } = require('../config/constants');

/**
 * FUNCTION 3: dailyTasks
 * 
 * Trigger: Scheduled - Every day at 7:00 AM (Antigua time)
 * Purpose: Run all daily automated tasks
 * 
 * Tasks:
 * 1. Check weather for all locations
 * 2. Create weather alert activities for affected users
 * 3. Check upcoming crop tasks (sowing, transplanting, harvesting)
 * 4. Create reminder activities for tomorrow's tasks
 * 5. Clean up expired activities
 */
module.exports = functions.pubsub
  .schedule('every day 07:00')
  .timeZone(TIMEZONE)
  .onRun(async (context) => {
    
    console.log('=== Starting daily tasks ===');
    
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    try {
      // Task 1: Weather alerts
      await checkWeatherAndCreateAlerts(today);
      
      // Task 2: Planting reminders
      await createPlantingReminders(tomorrow);
      
      // Task 3: Cleanup old data
      await cleanupExpiredActivities(today);
      
      console.log('=== Daily tasks completed successfully ===');
      return null;
      
    } catch (error) {
      console.error('Error in dailyTasks:', error);
      return null;
    }
  });

/**
 * TASK 1: Check weather and create alert activities
 */
async function checkWeatherAndCreateAlerts(today) {
  console.log('Task 1: Checking weather for all locations...');
  
  // Get all active users with completed onboarding
  const usersSnapshot = await admin.firestore()
    .collection('users')
    .where('accountStatus', '==', 'active')
    .where('onboardingComplete', '==', true)
    .get();
  
  if (usersSnapshot.empty) {
    console.log('No active users found');
    return;
  }
  
  console.log(`Found ${usersSnapshot.size} active users`);
  
  // Group users by island to minimize API calls
  const usersByIsland = groupUsersByLocation(
    usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  );
  
  // Check weather for each island
  for (const [island, users] of Object.entries(usersByIsland)) {
    console.log(`Checking weather for ${island} (${users.length} users)...`);
    
    // Fetch weather data
    const weather = await fetchWeather({ island });
    
    if (!weather) {
      console.warn(`Could not fetch weather for ${island}`);
      continue;
    }
    
    console.log(`Weather for ${island}: ${weather.current.temp}°C, ${weather.forecast[0]}mm rain`);
    
    // Analyze weather for alerts
    const alerts = analyzeWeather(weather);
    
    if (alerts.length === 0) {
      console.log(`No weather alerts for ${island}`);
      continue;
    }
    
    console.log(`Found ${alerts.length} alert(s) for ${island}`);
    
    // Create alert activity for each user on this island
    const batch = admin.firestore().batch();
    
    for (const user of users) {
      for (const alert of alerts) {
        const activityRef = admin.firestore().collection('activities').doc();
        
        batch.set(activityRef, {
          userId: user.id,
          type: 'weather_alert',
          category: 'weather',
          title: alert.title,
          message: alert.message,
          icon: alert.icon,
          status: 'unread',
          data: {
            severity: alert.severity,
            alertType: alert.type,
            island: island,
            farmingAdvice: alert.farmingAdvice,
            weatherData: {
              currentTemp: weather.current.temp,
              currentRain: weather.current.precipitation,
              forecast: weather.forecast.slice(0, 3)
            }
          },
          actionUrl: DASHBOARD_URL,
          actionLabel: 'View Weather',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });
      }
    }
    
    await batch.commit();
    console.log(`Created ${alerts.length} weather alert(s) for ${users.length} user(s) in ${island}`);
  }
  
  console.log('Weather check complete');
}

/**
 * TASK 2: Create planting reminders for tomorrow's tasks
 */
async function createPlantingReminders(tomorrow) {
  console.log('Task 2: Creating planting reminders...');
  
  // Get all active crop plans
  const plansSnapshot = await admin.firestore()
    .collection('activities')
    .where('type', '==', 'crop_plan')
    .where('status', '!=', 'completed')
    .get();
  
  if (plansSnapshot.empty) {
    console.log('No active crop plans found');
    return;
  }
  
  console.log(`Found ${plansSnapshot.size} active crop plan(s)`);
  
  const batch = admin.firestore().batch();
  let reminderCount = 0;
  
  // Check each plan for tasks due tomorrow
  for (const planDoc of plansSnapshot.docs) {
    const plan = planDoc.data();
    const planData = plan.data || {};
    
    // Check sow date
    if (planData.sowDate && isSameDay(planData.sowDate.toDate(), tomorrow)) {
      const reminderRef = admin.firestore().collection('activities').doc();
      batch.set(reminderRef, {
        userId: plan.userId,
        type: 'reminder',
        category: 'farming',
        title: 'Sowing Reminder 🌱',
        message: `Tomorrow: Sow ${planData.cropName} seeds${planData.seedsNeeded ? ` (${planData.seedsNeeded} seeds needed)` : ''}`,
        icon: '🌱',
        status: 'unread',
        data: {
          reminderType: 'sow',
          planId: planDoc.id,
          cropName: planData.cropName,
          seedsNeeded: planData.seedsNeeded
        },
        actionUrl: DASHBOARD_URL + '/planner',
        actionLabel: 'View Plan',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(tomorrow.getTime() + 2 * 24 * 60 * 60 * 1000) // 2 days
      });
      reminderCount++;
      console.log(`Reminder: Sow ${planData.cropName} tomorrow`);
    }
    
    // Check transplant date
    if (planData.transplantDate && isSameDay(planData.transplantDate.toDate(), tomorrow)) {
      const reminderRef = admin.firestore().collection('activities').doc();
      batch.set(reminderRef, {
        userId: plan.userId,
        type: 'reminder',
        category: 'farming',
        title: 'Transplant Reminder 🌿',
        message: `Tomorrow: Transplant ${planData.cropName} seedlings to garden beds`,
        icon: '🌿',
        status: 'unread',
        data: {
          reminderType: 'transplant',
          planId: planDoc.id,
          cropName: planData.cropName
        },
        actionUrl: DASHBOARD_URL + '/planner',
        actionLabel: 'View Plan',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(tomorrow.getTime() + 2 * 24 * 60 * 60 * 1000)
      });
      reminderCount++;
      console.log(`Reminder: Transplant ${planData.cropName} tomorrow`);
    }
    
    // Check harvest date
    if (planData.harvestDate && isSameDay(planData.harvestDate.toDate(), tomorrow)) {
      const reminderRef = admin.firestore().collection('activities').doc();
      batch.set(reminderRef, {
        userId: plan.userId,
        type: 'reminder',
        category: 'farming',
        title: 'Harvest Time! 🌾',
        message: `Tomorrow: ${planData.cropName} is ready for harvest! 🎉`,
        icon: '🌾',
        status: 'unread',
        data: {
          reminderType: 'harvest',
          planId: planDoc.id,
          cropName: planData.cropName,
          estimatedYield: planData.estimatedYield
        },
        actionUrl: DASHBOARD_URL + '/planner',
        actionLabel: 'View Plan',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(tomorrow.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 days
      });
      reminderCount++;
      console.log(`Reminder: Harvest ${planData.cropName} tomorrow`);
    }
  }
  
  if (reminderCount > 0) {
    await batch.commit();
    console.log(`Created ${reminderCount} planting reminder(s)`);
  } else {
    console.log('No reminders needed for tomorrow');
  }
}

/**
 * TASK 3: Clean up expired activities
 */
async function cleanupExpiredActivities(today) {
  console.log('Task 3: Cleaning up expired activities...');
  
  // Delete expired activities (where expiresAt < today)
  const expiredSnapshot = await admin.firestore()
    .collection('activities')
    .where('expiresAt', '<', today)
    .limit(500) // Process in batches to avoid timeout
    .get();
  
  if (expiredSnapshot.empty) {
    console.log('No expired activities to clean up');
    return;
  }
  
  console.log(`Found ${expiredSnapshot.size} expired activities`);
  
  // Delete in batch
  const batch = admin.firestore().batch();
  expiredSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log(`Deleted ${expiredSnapshot.size} expired activities`);
}
