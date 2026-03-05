const TelegramBot = require('node-telegram-bot-api');
const config = require('./config/config');

const bot = new TelegramBot(config.USER_BOT_TOKEN, { polling: true });

// Получаем информацию о боте и сохраняем username
bot.getMe().then((me) => {
    bot.options.username = me.username;
    console.log(`Bot username: @${me.username}`);
});

module.exports = bot;