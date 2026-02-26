const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { ADMIN_URL, DASHBOARD_URL } = require('../config/constants');

/**
 * FUNCTION 2: onActivityCreate
 * 
 * Trigger: When a new activity is created in Firestore
 * Purpose: Smart handler that processes different activity types
 * 
 * Workflow:
 * 1. Activity document created in /activities collection
 * 2. Function reads activity.type field
 * 3. Routes to appropriate handler
 * 4. Creates admin notifications visible in admin panel
 * 
 * Activity Types:
 * - contact_message: Contact form submission → Admin notification
 * - consultation: Paid user consultation request → Admin notification
 * - weather_alert: Weather alert for user
 * - crop_plan: New crop plan created
 * - notification: General user notification
 * - reminder: Planting/harvest reminder
 */
module.exports = functions.firestore
  .document('activities/{activityId}')
  .onCreate(async (snap, context) => {
    
    const activity = snap.data();
    const activityId = context.params.activityId;
    
    console.log(`New activity: ${activity.type} for user ${activity.userId}`);
    
    try {
      // Route based on activity type
      switch(activity.type) {
        
        case 'contact_message':
          await handleContactMessage(activity, activityId);
          break;
        
        case 'consultation':
          await handleConsultation(activity, activityId);
          break;
        
        case 'weather_alert':
          console.log(`Weather alert created for user ${activity.userId}`);
          break;
        
        case 'crop_plan':
          console.log(`Crop plan created: ${activity.data?.cropName}`);
          break;
        
        case 'notification':
        case 'reminder':
          console.log(`Notification created for user ${activity.userId}`);
          break;
        
        default:
          console.log(`Unknown activity type: ${activity.type}`);
      }
      
      return null;
    } catch (error) {
      console.error('Error in onActivityCreate:', error);
      return null;
    }
  });

/**
 * Handle contact form submission
 * Creates admin notification visible in admin panel
 */
async function handleContactMessage(activity, activityId) {
  console.log('Processing contact message...');

  const { senderName, senderEmail } = activity.data;

  // Write to contact_messages collection — this is what the Admin Panel reads from
  await admin.firestore().collection('contact_messages').add({
    name: senderName,
    email: senderEmail,
    message: activity.message,
    status: 'unread',
    originalActivityId: activityId,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Also create an admin_notification in activities for the notification feed
  await admin.firestore().collection('activities').add({
    userId: null,
    type: 'admin_notification',
    category: 'admin',
    title: `New Contact from ${senderName}`,
    message: `${senderName} (${senderEmail}) sent a message. Check Admin Panel.`,
    icon: '📧',
    status: 'unread',
    priority: 'normal',
    actionUrl: ADMIN_URL,
    actionLabel: 'View in Admin',
    data: {
      originalActivityId: activityId,
      contactType: 'contact_form'
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: null
  });

  console.log('Contact message saved to contact_messages + admin notified');
}

/**
 * Handle consultation request from paid user
 * Creates admin notification and updates user status
 */
async function handleConsultation(activity, activityId) {
  console.log('Processing consultation request...');
  
  // Get user data
  const userDoc = await admin.firestore()
    .collection('users')
    .doc(activity.userId)
    .get();
  
  if (!userDoc.exists) {
    console.error('User not found for consultation');
    return;
  }
  
  const user = userDoc.data();
  
  // Create admin notification (HIGH PRIORITY - shows in admin panel)
  await admin.firestore().collection('activities').add({
    userId: null, // For admin
    type: 'admin_notification',
    category: 'admin',
    title: `🔥 New Consultation Request`,
    message: `${user.name} needs help: "${activity.data?.issue || user.currentIssue}". Contact via WhatsApp: ${user.phone}`,
    icon: '💬',
    status: 'unread',
    priority: 'high', // High priority for paid consultations
    actionUrl: ADMIN_URL,
    actionLabel: 'View Details',
    data: {
      userId: activity.userId,
      userName: user.name,
      userPhone: user.phone,
      userLocation: user.location,
      issue: activity.data?.issue || user.currentIssue,
      consultationType: 'paid'
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: null // Keep until handled
  });
  
  // Update user consultation status
  await admin.firestore()
    .collection('users')
    .doc(activity.userId)
    .update({
      consultationStatus: 'pending',
      currentIssue: activity.data?.issue || user.currentIssue,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  
  // Create user notification
  await admin.firestore().collection('activities').add({
    userId: activity.userId,
    type: 'notification',
    category: 'system',
    title: 'Consultation Request Received',
    message: 'We received your consultation request. An expert will contact you via WhatsApp within 24 hours.',
    icon: '✅',
    status: 'unread',
    actionUrl: DASHBOARD_URL,
    actionLabel: 'View Dashboard',
    data: {},
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  
  console.log('Consultation processed - admin notified');
}