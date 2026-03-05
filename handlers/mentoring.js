const utils = require('../utils');
const config = require('../config/config');

const MENTORING_IMAGE_ID = 'AgACAgIAAxkBAAMOaaXGWM-Q42-xswagRW5BbTXZBCgAAgMSaxvXmTFJ5cqqhR8_g_YBAAMCAAN5AAM6BA';

async function sendMentoringMenu(bot, chatId, oldMessageId = null, sessions) {
    const text = '👨‍🏫 Вы можете выбрать себе наставника, который поможет вам сделать первые шаги в различных направлениях.';
    const keyboard = [
        // Используем switch_inline_query_current_chat для открытия инлайн-режима в текущем чате
        [{ text: 'Выбрать наставника', switch_inline_query_current_chat: 'mentor' }],
        [{ text: 'Назад', callback_data: 'back_to_menu' }]
    ];
    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, MENTORING_IMAGE_ID, text, keyboard);
    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }
    return sentMsg;
}

module.exports = {
    sendMentoringMenu
};