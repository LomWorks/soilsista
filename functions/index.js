// maybe the backend weather.js helper should be used here for ease in wiring (async function fetchWeather and analyzeWeather) (Reffering to the frontend WeatherWidget.jsx file). 
// I have other utilities that aren't being used whether directly or indirectly (i.e isSameDay, groupUsersByLocation, formatDate, getMilestoneMessage, truncate). 
// The existing individual function files also throw errors when I try to push them to the cloud. 
const admin = require('firebase-admin'); 

// Initialize Firebase Admin SDK 
admin.initializeApp(); 

// Export all Cloud Functions 
exports.onUserCreate = require('./functions/onUserCreate')
exports.onActivityCreate = require('./functions/onActivityCreate'); 
exports.dailyTasks = require('./functions/dailyTasks'); 
exports.onUserUpdate = require('./functions/onUserUpdate');

console.log('Cloud Functions initialized'); 