// Required environment variables (set via Firebase Functions config):
// ADMIN_EMAIL — the Google account email for admin panel access
// Set with: firebase functions:config:set admin.email="info@soilsista.org"
// Then access in functions as: process.env.ADMIN_EMAIL
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK 
admin.initializeApp(); 

// Export all Cloud Functions 
exports.onUserCreate = require('./functions/onUserCreate')
exports.onActivityCreate = require('./functions/onActivityCreate'); 
exports.dailyTasks = require('./functions/dailyTasks'); 
exports.onUserUpdate = require('./functions/onUserUpdate');

console.log('Cloud Functions initialized'); 