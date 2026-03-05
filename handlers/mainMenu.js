const utils = require('../utils');
const config = require('../config/config');
const { sendSettingsMenu } = require('./settings');
const { sendInfoMenu } = require('./info');
const { sendMentoringMenu } = require('./mentoring');
const { sendFeedbackMenu } = require('./feedback');
const { sendCommunityMainMenu } = require('./community');
const { sendAgencyMainMenu } = require('./agency');
const { sendPrimikMenu } = require('./primik');

async function sendMainMenu(bot, chatId, oldMessageId, sessions) {
    const text = '';
    const keyboard = [
        [{ text: 'Профиль', callback_data: 'profile' }, { text: 'Прямик', callback_data: 'primik' }],
        [{ text: 'NFT/TRADE', callback_data: 'exchange' }, { text: 'ESCORT', callback_data: 'agency' }],
        [{ text: 'Наставники', callback_data: 'mentoring' },  { text: 'Комьюнити', callback_data: 'community' }],
        [{ text: 'Настройки', callback_data: 'settings' }, { text: 'Информация', callback_data: 'info' }],
    ];
    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, config.IMAGES.MENU, text, keyboard);
    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }
    const session = sessions.get(chatId);
    if (session) session.lastMessageId = sentMsg.message_id;
    else sessions.set(chatId, { lastMessageId: sentMsg.message_id });
}

module.exports = (bot, sessions) => {
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const userId = query.from.id;
        const messageId = query.message.message_id;
        const data = query.data;

        await bot.answerCallbackQuery(query.id).catch(() => {});

        const session = sessions.get(chatId) || {};
        const user = await utils.getUserByTelegramId(userId);
        if (!user || user.status !== 'approved') return;

        if (data === 'profile') {
            await utils.deleteMessageSafe(bot, chatId, messageId);
            const { sendProfile } = require('./profile/profile');
            const sentMsg = await sendProfile(bot, chatId, user, null, sessions);
            sessions.set(chatId, { ...session, lastMessageId: sentMsg.message_id });
        }
        else if (data === 'settings') {
            await utils.deleteMessageSafe(bot, chatId, messageId);
            const sentMsg = await sendSettingsMenu(bot, chatId, user, null, sessions);
            sessions.set(chatId, { ...session, lastMessageId: sentMsg.message_id });
        }
        else if (data === 'info') {
            await utils.deleteMessageSafe(bot, chatId, messageId);
            const sentMsg = await sendInfoMenu(bot, chatId, null, sessions);
            sessions.set(chatId, { ...session, lastMessageId: sentMsg.message_id });
        }
        else if (data === 'mentoring') {
            await utils.deleteMessageSafe(bot, chatId, messageId);
            const sentMsg = await sendMentoringMenu(bot, chatId, null, sessions);
            sessions.set(chatId, { ...session, lastMessageId: sentMsg.message_id });
        }
        else if (data === 'feedback') {
            await utils.deleteMessageSafe(bot, chatId, messageId);
            const sentMsg = await sendFeedbackMenu(bot, chatId, user, null, sessions);
            sessions.set(chatId, { ...session, lastMessageId: sentMsg.message_id });
        }
        else if (data === 'community') {
            await utils.deleteMessageSafe(bot, chatId, messageId);
            const sentMsg = await sendCommunityMainMenu(bot, chatId, null, sessions);
            sessions.set(chatId, { ...session, lastMessageId: sentMsg.message_id });
        }
        else if (data === 'agency') {
            await utils.deleteMessageSafe(bot, chatId, messageId);
            const sentMsg = await sendAgencyMainMenu(bot, chatId, userId, sessions);
            sessions.set(chatId, { ...session, lastMessageId: sentMsg.message_id });
        }
        else if (data === 'primik') {
            await utils.deleteMessageSafe(bot, chatId, messageId);
            const sentMsg = await sendPrimikMenu(bot, chatId, null, sessions);
            sessions.set(chatId, { ...session, lastMessageId: sentMsg.message_id });
        }
        else if (['exchange'].includes(data)) {
            await bot.answerCallbackQuery(query.id, { text: 'В разработке' });
        }
        else if (data === 'back_to_menu') {
            await utils.deleteMessageSafe(bot, chatId, messageId);
            await sendMainMenu(bot, chatId, null, sessions);
        }
    });
};

module.exports.sendMainMenu = sendMainMenu;