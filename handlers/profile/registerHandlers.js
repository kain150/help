const startHandler = require('../start');
const mainMenuHandler = require('../mainMenu');
const profileHandler = require('./profile');
const registrationHandler = require('./registration');

module.exports = (bot, sessions) => {
    startHandler(bot, sessions);
    mainMenuHandler(bot, sessions);
    profileHandler(bot, sessions);
    registrationHandler(bot, sessions);
};