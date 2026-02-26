const functions = require('firebase-functions');
const admin = require('firebase-admin');

/**
 * FUNCTION 1: onUserCreate
 * 
 * Trigger: When a new user signs up via Firebase Auth
 * Purpose: Initialize user document with default values
 * 
 * Workflow:
 * 1. User signs up (email/password or phone)
 * 2. Firebase Auth creates auth record
 * 3. This function triggers automatically
 * 4. Creates user document in Firestore with defaults
 */
module.exports = functions.auth.user().onCreate(async (user) => {
  console.log(`New user created: ${user.uid}`);

  // Skip admin account — Google OAuth login should not create a farmer document
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email === adminEmail) {
    console.log(`Skipping farmer document creation for admin: ${user.email}`);
    return null;
  }

  try {
    // Create user document with default values
    await admin.firestore().collection('users').doc(user.uid).set({
      // Auth data
      userId: user.uid,
      email: user.email || null,
      phone: user.phoneNumber || null,
      role: 'farmer',
      
      // Status
      planType: null, // Will be set during onboarding ('free' or 'paid')
      accountStatus: 'pending', // Will be 'active' after onboarding complete
      
      // Profile (filled during onboarding)
      name: null,
      location: null,
      farmSize: null,
      terrain: null,
      waterSources: [],
      farmingType: null,
      
      // Crops
      currentCrops: [],
      cropHistory: [],
      
      // Issues
      pestControl: [],
      recentIssues: [],
      
      // Paid user fields
      consultationStatus: null,
      currentIssue: null,
      consultationHistory: [],
      
      // Stats
      stats: {
        cropsPlanted: 0,
        cropsHarvested: 0,
        joinedDate: admin.firestore.FieldValue.serverTimestamp(),
        lastActive: admin.firestore.FieldValue.serverTimestamp()
      },
      
      // Metadata
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      onboardingComplete: false,
      emailVerified: user.emailVerified || false
    });
    
    console.log(`User document initialized for ${user.uid}`);
    
    // Create a welcome notification activity
    await admin.firestore().collection('activities').add({
      userId: user.uid,
      type: 'notification',
      category: 'system',
      title: 'Welcome to Soil Sista! 🌱',
      message: 'Complete your profile to get started with personalized farming tools and weather alerts.',
      icon: '👋',
      status: 'unread',
      actionUrl: '/get-started',
      actionLabel: 'Complete Profile',
      data: {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    
    console.log(`Welcome notification created for ${user.uid}`);
    
    return null;
  } catch (error) {
    console.error('Error in onUserCreate:', error);
    return null;
  }
});
