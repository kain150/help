const utils = require('../utils');
const config = require('../config/config');
const { User } = require('../db');

const PRIMIK_IMAGE_ID = 'AgACAgIAAxkBAAMQaaXGeFIjuDiyvhDz_tToNkZI2YQAAgYSaxvXmTFJOU_TlKt_6RsBAAMCAAN4AAM6BA';

async function sendPrimikMenu(bot, chatId, oldMessageId, sessions) {
    const session = sessions.get(chatId) || {};
    const text = 'Для создания одноразовой карты для прямого перевода выберите один из доступных регионов:';
    const keyboard = [
        [{ text: 'Российская Федерация', callback_data: 'primik_ru' }],
        [{ text: 'Назад', callback_data: 'back_to_menu' }]
    ];

    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, PRIMIK_IMAGE_ID, text, keyboard);
    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }
    session.lastMessageId = sentMsg.message_id;
    sessions.set(chatId, session);
    return sentMsg;
}

async function sendPrimikAmountInput(bot, chatId, region, oldMessageId, sessions) {
    const session = sessions.get(chatId) || {};
    const text = `Прямые переводы\n\nРегион: ${region}\n\nПришлите сумму, которую нужно будет перевести для принятия платежа (не менее 2,000₽).`;
    const keyboard = [[{ text: 'Назад', callback_data: 'primik_back_to_region' }]];

    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, PRIMIK_IMAGE_ID, text, keyboard);
    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }
    session.lastMessageId = sentMsg.message_id;
    sessions.set(chatId, session);
    return sentMsg;
}

async function sendPrimikConfirm(bot, chatId, region, amount, oldMessageId, sessions) {
    const session = sessions.get(chatId) || {};
    const formattedAmount = amount.toLocaleString();
    const text = `Прямые переводы\n\nРегион: ${region}\nСумма к оплате: ${formattedAmount}₽\n\nПодтвердите генерацию карты.`;
    const keyboard = [
        [{ text: 'Подтвердить', callback_data: 'primik_confirm' }],
        [{ text: 'Назад', callback_data: 'primik_back_to_amount' }]
    ];

    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, PRIMIK_IMAGE_ID, text, keyboard);
    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }
    session.lastMessageId = sentMsg.message_id;
    sessions.set(chatId, session);
    return sentMsg;
}

async function sendPrimikResult(bot, chatId, oldMessageId, sessions) {
    const session = sessions.get(chatId) || {};
    const text = 'В данный момент бот не может предоставить карту, обратитесь в финансовый отдел (@SEGA_Finance).';
    const keyboard = [[{ text: 'Назад', callback_data: 'back_to_menu' }]];

    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, PRIMIK_IMAGE_ID, text, keyboard);
    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }
    session.lastMessageId = sentMsg.message_id;
    sessions.set(chatId, session);
    return sentMsg;
}

function setupPrimikCallbacks(bot, sessions) {
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const data = query.data;
        const messageId = query.message.message_id;
        const session = sessions.get(chatId) || {};

        await bot.answerCallbackQuery(query.id).catch(() => {});

        if (data === 'primik_ru') {
            session.primikRegion = 'Российская Федерация';
            sessions.set(chatId, session);
            await sendPrimikAmountInput(bot, chatId, session.primikRegion, messageId, sessions);
        }
        else if (data === 'primik_back_to_region') {
            delete session.primikRegion;
            delete session.primikAmount;
            sessions.set(chatId, session);
            await sendPrimikMenu(bot, chatId, messageId, sessions);
        }
        else if (data === 'primik_back_to_amount') {
            await sendPrimikAmountInput(bot, chatId, session.primikRegion, messageId, sessions);
        }
        else if (data === 'primik_confirm') {
            await bot.sendChatAction(chatId, 'typing');
            await new Promise(resolve => setTimeout(resolve, 2000));
            await sendPrimikResult(bot, chatId, messageId, sessions);
            delete session.primikRegion;
            delete session.primikAmount;
            sessions.set(chatId, session);
        }
    });
}

function setupPrimikMessageHandlers(bot, sessions) {
    bot.on('message', async (msg) => {
        if (!msg.text) return;
        const chatId = msg.chat.id;
        const text = msg.text.trim();
        const session = sessions.get(chatId);

        if (session && session.primikRegion && !session.primikAmount) {
            const amount = parseInt(text.replace(/[^\d]/g, ''));
            if (isNaN(amount) || amount < 2000) {
                await bot.sendMessage(chatId, '❌ Некорректная сумма. Минимальная сумма: 2,000₽. Попробуйте ещё раз.');
                return;
            }
            session.primikAmount = amount;
            sessions.set(chatId, session);
            await bot.deleteMessage(chatId, msg.message_id).catch(() => {});
            await sendPrimikConfirm(bot, chatId, session.primikRegion, amount, session.lastMessageId, sessions);
        }
    });
}

module.exports = (bot, sessions) => {
    setupPrimikCallbacks(bot, sessions);
    setupPrimikMessageHandlers(bot, sessions);
};

module.exports.sendPrimikMenu = sendPrimikMenu;