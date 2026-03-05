const admin = require('firebase-admin');
admin.initializeApp();

exports.onUserCreate     = require('./functions/onUserCreate');
exports.onActivityCreate = require('./functions/onActivityCreate');
exports.dailyTasks       = require('./functions/dailyTasks');
exports.onUserUpdate     = require('./functions/onUserUpdate');
exports.getWeather       = require('./utils/weather').getWeather;

console.log('Cloud Functions initialized');