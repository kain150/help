const utils = require('../utils');
const config = require('../config/config');

const SETTINGS_IMAGE_ID = 'AgACAgIAAxkBAAMSaaXGkgXxUWn4J4ddtp5mgCZPlvoAAgcSaxvXmTFJrVcxobK4QkUBAAMCAAN5AAM6BA';

// Функция отправки меню настроек
async function sendSettingsMenu(bot, chatId, user, oldMessageId = null, sessions) {
    const text = 'Выберите настройку, которую хотите изменить.';
    const reportStatus = user.reportMissingRequisites ? 'Вкл' : 'Выкл';
    const keyboard = [
        [{ text: 'Промокоды', callback_data: 'settings_promocodes' }],
        [{ text: 'Анонимность', callback_data: 'settings_anonymous' }],
        [{ text: 'Фейковые реквизиты', callback_data: 'settings_fake_requisites' }],
        [{ text: `Сообщать об отсутствии реквизитов (${reportStatus})`, callback_data: 'settings_toggle_report' }],
        [{ text: 'Назад', callback_data: 'back_to_menu' }],
    ];
    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, SETTINGS_IMAGE_ID, text, keyboard);
    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }
    return sentMsg;
}

module.exports = (bot, sessions) => {
    // 🔥 НОВЫЙ ОБРАБОТЧИК КОМАНДЫ /settings
    bot.onText(/\/settings/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const user = await utils.getUserByTelegramId(userId);
        if (!user || user.status !== 'approved') {
            return bot.sendMessage(chatId, 'Сначала пройдите регистрацию через /start');
        }
        const session = sessions.get(chatId) || {};
        if (session.lastMessageId) {
            await utils.deleteMessageSafe(bot, chatId, session.lastMessageId);
        }
        const sentMsg = await sendSettingsMenu(bot, chatId, user, null, sessions);
        sessions.set(chatId, { ...session, lastMessageId: sentMsg.message_id });
    });

    // Существующий обработчик callback'ов
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const userId = query.from.id;
        const messageId = query.message.message_id;
        const data = query.data;

        const settingsCallbacks = [
            'settings_promocodes',
            'settings_anonymous',
            'toggle_anonymous_from_settings',
            'settings_fake_requisites',
            'settings_toggle_report',
            'back_to_settings'
        ];
        if (!settingsCallbacks.includes(data)) return;

        await bot.answerCallbackQuery(query.id).catch(() => {});

        const session = sessions.get(chatId) || {};
        const user = await utils.getUserByTelegramId(userId);
        if (!user || user.status !== 'approved') return;

        if (data === 'settings_promocodes') {
            const text = 'Раздел промокодов в разработке.';
            const keyboard = [[{ text: 'Назад', callback_data: 'back_to_settings' }]];
            const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, SETTINGS_IMAGE_ID, text, keyboard);
            sessions.set(chatId, { ...session, lastMessageId: sentMsg.message_id });
            await utils.deleteMessageSafe(bot, chatId, messageId);
        }
        else if (data === 'settings_anonymous') {
            const anonStatus = user.anonymous ? 'включена' : 'выключена';
            const text = `Текущий статус анонимности: ${anonStatus}.`;
            const keyboard = [
                [{ text: user.anonymous ? 'Выключить анонимность' : 'Включить анонимность', callback_data: 'toggle_anonymous_from_settings' }],
                [{ text: 'Назад', callback_data: 'back_to_settings' }]
            ];
            const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, SETTINGS_IMAGE_ID, text, keyboard);
            sessions.set(chatId, { ...session, lastMessageId: sentMsg.message_id });
            await utils.deleteMessageSafe(bot, chatId, messageId);
        }
        else if (data === 'toggle_anonymous_from_settings') {
            user.anonymous = !user.anonymous;
            await user.save();
            const anonStatus = user.anonymous ? 'включена' : 'выключена';
            const text = `Текущий статус анонимности: ${anonStatus}.`;
            const keyboard = [
                [{ text: user.anonymous ? 'Выключить анонимность' : 'Включить анонимность', callback_data: 'toggle_anonymous_from_settings' }],
                [{ text: 'Назад', callback_data: 'back_to_settings' }]
            ];
            const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, SETTINGS_IMAGE_ID, text, keyboard);
            sessions.set(chatId, { ...session, lastMessageId: sentMsg.message_id });
            await utils.deleteMessageSafe(bot, chatId, messageId);
        }
        else if (data === 'settings_fake_requisites') {
            const requisitesText = `📇 Фейковые реквизиты

Номер телефона:
<code>+78005553535</code>

Номер карты:
<code>2201040202987292</code>

USDT (TRC20):
<code>TR7NHkorMAxGTCi8q93Y4pL8otPzgjLj6t</code>`;

            const keyboard = [[{ text: 'Назад', callback_data: 'back_to_settings' }]];
            const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, SETTINGS_IMAGE_ID, requisitesText, keyboard);
            sessions.set(chatId, { ...session, lastMessageId: sentMsg.message_id });
            await utils.deleteMessageSafe(bot, chatId, messageId);
        }
        else if (data === 'settings_toggle_report') {
            user.reportMissingRequisites = !user.reportMissingRequisites;
            await user.save();
            const updatedMenu = await sendSettingsMenu(bot, chatId, user, messageId, sessions);
            sessions.set(chatId, { ...session, lastMessageId: updatedMenu.message_id });
        }
        else if (data === 'back_to_settings') {
            const updatedMenu = await sendSettingsMenu(bot, chatId, user, messageId, sessions);
            sessions.set(chatId, { ...session, lastMessageId: updatedMenu.message_id });
        }
    });
};

module.exports.sendSettingsMenu = sendSettingsMenu;