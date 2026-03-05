const utils = require('../utils');
const config = require('../config/config');

// ID картинки для информации
const INFO_IMAGE_ID = 'AgACAgIAAxkBAAMMaaXGO5Xh4OuSrmRA1SDTQ6RaNPoAAgESaxvXmTFJ6Wc1XlvQFIEBAAMCAAN5AAM6BA';

// Функция отправки меню информации
async function sendInfoMenu(bot, chatId, oldMessageId = null, sessions) {
    const text = `▎Основная информация команды

Регионы: Россия, Украина, Казахстан

СЕО/Админ — @scm_SONIK
Обратная связь/баги — /feedback
Фин.отдел/Поддержка — @SEGA_Finance

Крипто пополнение — 90%
Пополнение/Прямик — 80/85%
Поддержка — 75%

Всего 47796 профитов на сумму 860,166,668₽.`;

    const keyboard = [
        [
            { text: 'Профиты', url: 'https://t.me/+zjBXK7XadpwzNWMy' },
            { text: 'Мануалы', url: 'https://t.me/+MD3dubDt18NmOGM0' }
        ],
        [
            { text: 'Общий чат', callback_data: 'info_general_chat' },
            { text: 'Medium chat', callback_data: 'info_medium_chat' },
        ],
        [
            { text: 'High chat', callback_data: 'info_high_chat' }
        ],
        [{ text: 'Назад', callback_data: 'back_to_menu' }]
    ];

    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, INFO_IMAGE_ID, text, keyboard);
    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }
    return sentMsg;
}

// Обработчик callback-запросов для раздела информации
module.exports = (bot, sessions) => {
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const userId = query.from.id;
        const data = query.data;

        const infoCallbacks = ['info_general_chat', 'info_medium_chat', 'info_high_chat'];
        if (!infoCallbacks.includes(data)) return;

        const user = await utils.getUserByTelegramId(userId);
        if (!user || user.status !== 'approved') return;

        let text = '';

        if (data === 'info_general_chat') {
            text = 'Общий чат будет доступен после первого профита';
        } else if (data === 'info_medium_chat') {
            text = 'Данная группа доступна после 4 уровня';
        } else if (data === 'info_high_chat') {
            text = 'Данная группа доступна после 8 уровня';
        }

        // Исправлено: bot.answerCallbackQuery вместо ctx.answerCbQuery
        await bot.answerCallbackQuery(query.id, {
            text,
            show_alert: true
        }).catch(() => {});
    });
};

module.exports.sendInfoMenu = sendInfoMenu;