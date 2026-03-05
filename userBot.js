const bot = require('./userBotInstance');
const utils = require('./utils');
const sessions = new Map();

const { handleApprovedMessage, handleRegistrationMessage } = require('./handlers/messageHandler');
const startHandler = require('./handlers/start');
const mainMenuHandler = require('./handlers/mainMenu');
const profileHandler = require('./handlers/profile/profile');
const infoHandler = require('./handlers/info');
const inlineHandler = require('./handlers/inline');
const feedbackHandler = require('./handlers/feedback');
const registrationHandler = require('./handlers/profile/registration');
const settingsHandler = require('./handlers/settings');
const communityHandler = require('./handlers/community');
const agencyHandler = require('./handlers/agency'); // вместо sendAgencyMainMenu
const primikHandler = require('./handlers/primik');
const clientProfileHandler = require('./handlers/clientProfile');

// Регистрация обработчиков (специализированные сначала)
settingsHandler(bot, sessions);
primikHandler(bot, sessions);
agencyHandler(bot, sessions);  // ← правильный вызов
clientProfileHandler(bot, sessions); // ← добавить
communityHandler(bot, sessions);
infoHandler(bot, sessions);
inlineHandler(bot, sessions);
feedbackHandler(bot, sessions);
startHandler(bot, sessions);
mainMenuHandler(bot, sessions);
profileHandler(bot, sessions);
registrationHandler(bot, sessions);

// Глобальная проверка блокировки для всех сообщений
bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const user = await utils.getUserByTelegramId(userId);
    if (!user || user.isBlocked) return; // заблокированные игнорируются

    const session = sessions.get(chatId) || {};

    if (user.status === 'approved') {
        await handleApprovedMessage(bot, msg, user, session, sessions);
    } else if (user.status === 'pending') {
        await handleRegistrationMessage(bot, msg, user, session, sessions);
    }
});

// Глобальная проверка блокировки для callback-запросов
bot.on('callback_query', async (query) => {
    const userId = query.from.id;
    const user = await utils.getUserByTelegramId(userId);
    if (!user || user.isBlocked) {
        await bot.answerCallbackQuery(query.id, { text: '⛔ Вы заблокированы' }).catch(() => {});
        return;
    }
});

bot.on('polling_error', console.log);

console.log('User bot started...');