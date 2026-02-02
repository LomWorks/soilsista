const admin = require('firebase-admin'); 

// Initialize Firebase Admin SDK 
admin.initializeApp(); 

// Export all Cloud Functions 
exports.onUserCreate = require('./functions/')
exports.onActivityCreate = require('./functions/onActivityCreate'); 
exports.dailyTasks = require('./functions/dailyTasks'); 
exports.onUserUpdate = require('./functions/onUserUpdate');

console.log('C
    loud Functions initialized'); 