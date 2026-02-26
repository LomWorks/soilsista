const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { fetchWeather, analyzeWeather } = require('../utils/weather');
const { groupUsersByLocation, isSameDay } = require('../utils/helpers');
const { TIMEZONE, DASHBOARD_URL } = require('../config/constants');

/**
 * FUNCTION 3: dailyTasks
 *
 * Trigger: Scheduled — Every day at 7:00 AM (Antigua time)
 * Tasks:
 *   1. Check weather per island using the user's active crops to pick the
 *      tightest stress thresholds (sourced from improved master_crops_ANNUALS)
 *   2. Create weather alert activities for affected users
 *   3. Create planting/transplant/harvest reminders for tomorrow's tasks
 *   4. Clean up expired activities
 */
module.exports = functions.pubsub
  .schedule('every day 07:00')
  .timeZone(TIMEZONE)
  .onRun(async (context) => {

    console.log('=== Starting daily tasks ===');

    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    try {
      await checkWeatherAndCreateAlerts(today);
      await createPlantingReminders(tomorrow);
      await cleanupExpiredActivities(today);
      console.log('=== Daily tasks completed successfully ===');
      return null;
    } catch (error) {
      console.error('Error in dailyTasks:', error);
      return null;
    }
  });

// ─── TASK 1: Weather alerts with crop-specific thresholds ────────────────────

async function checkWeatherAndCreateAlerts(today) {
  console.log('Task 1: Checking weather for all locations...');

  const usersSnapshot = await admin.firestore()
    .collection('users')
    .where('accountStatus', '==', 'active')
    .where('onboardingComplete', '==', true)
    .get();

  if (usersSnapshot.empty) {
    console.log('No active users found');
    return;
  }

  const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log(`Found ${users.length} active users`);

  const usersByIsland = groupUsersByLocation(users);

  for (const [island, islandUsers] of Object.entries(usersByIsland)) {
    console.log(`Checking weather for ${island} (${islandUsers.length} users)...`);

    const weather = await fetchWeather({ island });
    if (!weather) {
      console.warn(`Could not fetch weather for ${island}`);
      continue;
    }

    const batch = admin.firestore().batch();

    for (const user of islandUsers) {
      // ── Use this user's active crops for tailored thresholds ──────────────
      const userCrops = [
        ...(user.currentCrops || []),
        ...(user.crops || [])
      ];

      const alerts = analyzeWeather(weather, userCrops);

      if (alerts.length === 0) continue;

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
            island,
            farmingAdvice: alert.farmingAdvice,
            activeCrops: userCrops,
            weatherData: {
              currentTemp: weather.current.temp,
              currentWind: weather.current.windSpeed,
              currentRain: weather.current.precipitation,
              forecast: weather.forecast.slice(0, 3)
            }
          },
          actionUrl: DASHBOARD_URL,
          actionLabel: 'View Weather',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
        });
      }

      console.log(`Created ${alerts.length} alert(s) for user ${user.id} (${userCrops.length > 0 ? userCrops.join(', ') : 'no crops on file'})`);
    }

    await batch.commit();
  }

  console.log('Weather check complete');
}

// ─── TASK 2: Planting reminders ──────────────────────────────────────────────

async function createPlantingReminders(tomorrow) {
  console.log('Task 2: Creating planting reminders...');

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

  for (const planDoc of plansSnapshot.docs) {
    const plan = planDoc.data();
    const planData = plan.data || {};

    // ── Build a descriptive crop label including variant (Gap 3 fix) ─────────
    const cropLabel = planData.variant
      ? `${planData.cropName} (${planData.variant})`
      : planData.cropName;

    // ── Seeds needed — fall back gracefully if field is missing (Gap 2 fix) ──
    const seedsNote = planData.seedsNeeded
      ? ` (${planData.seedsNeeded} seeds needed)`
      : '';

    // Sowing reminder
    if (planData.sowDate && isSameDay(planData.sowDate.toDate(), tomorrow)) {
      const ref = admin.firestore().collection('activities').doc();
      batch.set(ref, {
        userId: plan.userId,
        type: 'reminder',
        category: 'farming',
        title: 'Sowing Reminder 🌱',
        message: `Tomorrow: Sow ${cropLabel} seeds${seedsNote}`,
        icon: '🌱',
        status: 'unread',
        data: {
          reminderType: 'sow',
          planId: planDoc.id,
          cropName: planData.cropName,
          variant: planData.variant || null,
          seedsNeeded: planData.seedsNeeded || null
        },
        actionUrl: `${DASHBOARD_URL}/planner`,
        actionLabel: 'View Plan',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(tomorrow.getTime() + 2 * 24 * 60 * 60 * 1000)
      });
      reminderCount++;
      console.log(`Reminder: Sow ${cropLabel} tomorrow`);
    }

    // Transplant reminder
    if (planData.transplantDate && isSameDay(planData.transplantDate.toDate(), tomorrow)) {
      const ref = admin.firestore().collection('activities').doc();
      batch.set(ref, {
        userId: plan.userId,
        type: 'reminder',
        category: 'farming',
        title: 'Transplant Reminder 🌿',
        message: `Tomorrow: Transplant ${cropLabel} seedlings to garden beds`,
        icon: '🌿',
        status: 'unread',
        data: {
          reminderType: 'transplant',
          planId: planDoc.id,
          cropName: planData.cropName,
          variant: planData.variant || null
        },
        actionUrl: `${DASHBOARD_URL}/planner`,
        actionLabel: 'View Plan',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(tomorrow.getTime() + 2 * 24 * 60 * 60 * 1000)
      });
      reminderCount++;
      console.log(`Reminder: Transplant ${cropLabel} tomorrow`);
    }

    // Harvest reminder — checks harvestStart (new planner) with harvestDate fallback
    const harvestDate = planData.harvestStart || planData.harvestDate;
    if (harvestDate && isSameDay(harvestDate.toDate(), tomorrow)) {
      const ref = admin.firestore().collection('activities').doc();
      batch.set(ref, {
        userId: plan.userId,
        type: 'reminder',
        category: 'farming',
        title: 'Harvest Time! 🌾',
        message: `Tomorrow: ${cropLabel} is ready for harvest!${planData.estimatedYield ? ` Expected yield: ${planData.estimatedYield}` : ''} 🎉`,
        icon: '🌾',
        status: 'unread',
        data: {
          reminderType: 'harvest',
          planId: planDoc.id,
          cropName: planData.cropName,
          variant: planData.variant || null,
          estimatedYield: planData.estimatedYield || null
        },
        actionUrl: `${DASHBOARD_URL}/planner`,
        actionLabel: 'View Plan',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(tomorrow.getTime() + 3 * 24 * 60 * 60 * 1000)
      });
      reminderCount++;
      console.log(`Reminder: Harvest ${cropLabel} tomorrow`);
    }
  }

  if (reminderCount > 0) {
    await batch.commit();
    console.log(`Created ${reminderCount} planting reminder(s)`);
  } else {
    console.log('No reminders needed for tomorrow');
  }
}

// ─── TASK 3: Cleanup expired activities ─────────────────────────────────────

async function cleanupExpiredActivities(today) {
  console.log('Task 3: Cleaning up expired activities...');

  const expiredSnapshot = await admin.firestore()
    .collection('activities')
    .where('expiresAt', '<', today)
    .limit(500)
    .get();

  if (expiredSnapshot.empty) {
    console.log('No expired activities to clean up');
    return;
  }

  const batch = admin.firestore().batch();
  expiredSnapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`Deleted ${expiredSnapshot.size} expired activities`);
}