const utils = require('../utils');
const config = require('../config/config');
const { User, AgencyClient } = require('../db');

const CLIENT_PROFILE_IMAGE_ID = 'AgACAgIAAxkBAAMeaaXIJTpEOrviw_wWj5IUX-bVLFMAAhcSaxvXmTFJQur6-B6s5i8BAAMCAAN5AAM6BA';

function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'только что';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} ${plural(minutes, 'минута', 'минуты', 'минут')} назад`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ${plural(hours, 'час', 'часа', 'часов')} назад`;
    const days = Math.floor(hours / 24);
    return `${days} ${plural(days, 'день', 'дня', 'дней')} назад`;
}

function plural(n, one, few, many) {
    n = Math.abs(n) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return many;
    if (n1 > 1 && n1 < 5) return few;
    if (n1 === 1) return one;
    return many;
}

async function sendClientProfile(bot, chatId, clientUserId, sessions) {
    const session = sessions.get(chatId) || {};
    const oldMessageId = session.lastMessageId;

    const client = await AgencyClient.findOne({ userId: clientUserId });
    if (!client) {
        await bot.sendMessage(chatId, '❌ Клиент не найден.');
        return;
    }

    // Используем данные из client, так как они есть в AgencyClient
    const firstName = client.firstName || 'Без имени';
    const displayName = client.customName || firstName;
    const registeredDate = client.registeredAt ? client.registeredAt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'неизвестно';
    const lastActivity = client.lastActivity ? timeAgo(client.lastActivity) : 'никогда';
    const city = client.city || 'Не указан';

    // Формируем ссылку на контакт: если есть username, то https, иначе tg://user?id=
    const contactLink = client.username ? `https://t.me/${client.username}` : `tg://user?id=${client.userId}`;
    const botUsername = bot.options.username; // должно быть установлено
    const profileLink = `tg://resolve?domain=${botUsername}&start=binding_${client.userId}`;

    const text = `<a href="${profileLink}">💝 SkyGirls</a>\n\n` +
        `Клиент: <a href="${profileLink}">${displayName}</a>\n` +
        (client.customName ? `Кастомное имя: ${client.customName}\n` : '') +
        `ID: ${client.userId} <a href="${contactLink}">Контакт</a>\n\n` +
        `Привязан(а) ${registeredDate}.\n` +
        `Был(а) ${lastActivity}.\n\n` +
        `Рейтинг: 0.0 (Неизвестно)\n` +
        `Текущий баланс: ${client.balance || 0} ${client.currency || 'RUB'}\n\n` +
        `Города:\n1. ${city} [Выбрано]`;

    const keyboard = [
        [{ text: 'Финансовые операции', callback_data: `client_finance_${client.userId}` }],
        [
            { text: 'Модели', callback_data: `client_models_${client.userId}` },
            { text: 'Лимиты', callback_data: `client_limits_${client.userId}` }
        ],
        [
            { text: 'Соглашения', callback_data: `client_agreements_${client.userId}` },
            { text: 'Рейтинг', callback_data: `client_rating_${client.userId}` }
        ],
        [
            { text: 'Баланс', callback_data: `client_balance_${client.userId}` },
            { text: 'Уведомить', callback_data: `client_notify_${client.userId}` }
        ],
        [
            { text: 'Закрепить', callback_data: `client_pin_${client.userId}` },
            { text: 'Отвязать', callback_data: `client_unbind_${client.userId}` }
        ],
        [{ text: 'Технический перерыв', callback_data: `client_break_${client.userId}` }],
        [{ text: '◀️ Назад', callback_data: 'back_to_menu' }]
    ];

    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, CLIENT_PROFILE_IMAGE_ID, text, keyboard);
    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }
    session.lastMessageId = sentMsg.message_id;
    sessions.set(chatId, session);
    return sentMsg;
}

function setupClientProfileHandlers(bot, sessions) {
    // Обработчик команды просмотра профиля клиента
    bot.onText(/\/client_profile_(\d+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const clientUserId = parseInt(match[1]);
        const agentId = msg.from.id;

        const client = await AgencyClient.findOne({ userId: clientUserId, invitedBy: agentId });
        if (!client) {
            await bot.sendMessage(chatId, '❌ У вас нет доступа к этому клиенту.');
            return;
        }

        await sendClientProfile(bot, chatId, clientUserId, sessions);
    });

    // Обработчики callback-запросов для кнопок профиля клиента
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const data = query.data;

        await bot.answerCallbackQuery(query.id).catch(() => {});

        const session = sessions.get(chatId) || {};

        if (data.startsWith('client_resetname_')) {
            const clientUserId = parseInt(data.split('_')[2]);
            await AgencyClient.updateOne({ userId: clientUserId }, { $set: { customName: null } });
            await bot.answerCallbackQuery(query.id, { text: 'Кастомное имя сброшено' });
            await sendClientProfile(bot, chatId, clientUserId, sessions);
        }
        else if (data.startsWith('client_profile_back_')) {
            const clientUserId = parseInt(data.split('_')[3]);
            await sendClientProfile(bot, chatId, clientUserId, sessions);
        }
        else if (data.startsWith('client_finance_')) {
            await bot.answerCallbackQuery(query.id, { text: 'Финансовые операции (в разработке)' });
        }
        else if (data.startsWith('client_models_')) {
            await bot.answerCallbackQuery(query.id, { text: 'Модели (в разработке)' });
        }
        else if (data.startsWith('client_limits_')) {
            await bot.answerCallbackQuery(query.id, { text: 'Лимиты (в разработке)' });
        }
        else if (data.startsWith('client_agreements_')) {
            await bot.answerCallbackQuery(query.id, { text: 'Соглашения (в разработке)' });
        }
        else if (data.startsWith('client_rating_')) {
            await bot.answerCallbackQuery(query.id, { text: 'Рейтинг (в разработке)' });
        }
        else if (data.startsWith('client_balance_')) {
            await bot.answerCallbackQuery(query.id, { text: 'Баланс (в разработке)' });
        }
        else if (data.startsWith('client_notify_')) {
            await bot.answerCallbackQuery(query.id, { text: 'Уведомить (в разработке)' });
        }
        else if (data.startsWith('client_pin_')) {
            await bot.answerCallbackQuery(query.id, { text: 'Закрепить (в разработке)' });
        }
        else if (data.startsWith('client_unbind_')) {
            const clientUserId = parseInt(data.split('_')[2]);
            await AgencyClient.updateOne({ userId: clientUserId }, { $set: { invitedBy: null } });
            await bot.answerCallbackQuery(query.id, { text: 'Клиент отвязан' });
            const { sendAgencyMainMenu } = require('./agency');
            await sendAgencyMainMenu(bot, chatId, sessions);
        }
        else if (data.startsWith('client_break_')) {
            await bot.answerCallbackQuery(query.id, { text: 'Технический перерыв (в разработке)' });
        }
    });

    // Обработка текстовых сообщений для кастомного имени
    bot.on('message', async (msg) => {
        if (!msg.text || msg.text.startsWith('/')) return;
        const chatId = msg.chat.id;
        const text = msg.text.trim();
        const session = sessions.get(chatId);

        if (session && session.state === 'awaiting_custom_name') {
            const clientUserId = session.customNameTarget;
            await AgencyClient.updateOne({ userId: clientUserId }, { $set: { customName: text } });
            await bot.deleteMessage(chatId, msg.message_id).catch(() => {});
            session.state = null;
            delete session.customNameTarget;
            sessions.set(chatId, session);
            await sendClientProfile(bot, chatId, clientUserId, sessions);
        }
    });
}

module.exports = (bot, sessions) => {
    setupClientProfileHandlers(bot, sessions);
};

module.exports.sendClientProfile = sendClientProfile;