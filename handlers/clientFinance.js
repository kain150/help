const utils = require('../utils');
const { AgencyClient } = require('../db');
const { sendClientProfile } = require('./clientProfile'); // предполагаем, что такой файл есть

const CLIENT_FINANCE_IMAGE_ID = 'AgACAgIAAxkBAAMeaaXIJTpEOrviw_wWj5IUX-bVLFMAAhcSaxvXmTFJQur6-B6s5i8BAAMCAAN5AAM6BA'; // можно заменить на свою

async function sendFinanceMenu(bot, chatId, clientUserId, sessions) {
    const session = sessions.get(chatId) || {};
    const oldMessageId = session.lastMessageId;

    const client = await AgencyClient.findOne({ userId: clientUserId });
    if (!client) {
        await bot.sendMessage(chatId, '❌ Клиент не найден.');
        return;
    }

    const contactPart = client.username ? `@${client.username}` : 'Контакт';
    const contactLink = client.username ? `https://t.me/${client.username}` : `tg://user?id=${client.userId}`;
    const botUsername = bot.options.username; // должно быть установлено
    const profileLink = `tg://resolve?domain=${botUsername}&start=binding_${client.userId}`;
    const displayName = client.customName || client.firstName || 'Без имени';

    const text = `<a href="${profileLink}">💝 SkyGirls</a>\n\n` +
        `Клиент: <a href="${profileLink}">${displayName}</a>\n` +
        `ID: ${client.userId} <a href="${contactLink}">${contactPart}</a>\n\n` +
        `Текущий баланс: ${client.balance || 0} ${client.currency || 'RUB'}\n\n` +
        `Для изменения баланса выберите одну из следующих действий:`;

    const keyboard = {
        inline_keyboard: [
            [{ text: 'Пополнить баланс', callback_data: `client_balance_add_${client.userId}` }],
            [{ text: 'Уменьшить баланс', callback_data: `client_balance_sub_${client.userId}` }],
            [{ text: '◀️ Назад', callback_data: `client_profile_back_${client.userId}` }]
        ]
    };

    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, CLIENT_FINANCE_IMAGE_ID, text, keyboard);
    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }
    session.lastMessageId = sentMsg.message_id;
    sessions.set(chatId, session);
    return sentMsg;
}

async function sendBalanceAddInput(bot, chatId, clientUserId, sessions) {
    const session = sessions.get(chatId) || {};
    const oldMessageId = session.lastMessageId;

    const client = await AgencyClient.findOne({ userId: clientUserId });
    if (!client) {
        await bot.sendMessage(chatId, '❌ Клиент не найден.');
        return;
    }

    const contactPart = client.username ? `@${client.username}` : 'Контакт';
    const contactLink = client.username ? `https://t.me/${client.username}` : `tg://user?id=${client.userId}`;
    const botUsername = bot.options.username;
    const profileLink = `tg://resolve?domain=${botUsername}&start=binding_${client.userId}`;
    const displayName = client.customName || client.firstName || 'Без имени';

    const text = `<a href="${profileLink}">💝 SkyGirls</a>\n\n` +
        `Клиент: <a href="${profileLink}">${displayName}</a>\n` +
        `ID: ${client.userId} <a href="${contactLink}">${contactPart}</a>\n\n` +
        `Текущий баланс: ${client.balance || 0} ${client.currency || 'RUB'}\n\n` +
        `Укажите сумму, которую вы хотите добавить к балансу клиента.`;

    const keyboard = {
        inline_keyboard: [
            [{ text: '◀️ Назад', callback_data: `client_balance_${client.userId}` }]
        ]
    };

    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, CLIENT_FINANCE_IMAGE_ID, text, keyboard);
    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }
    session.lastMessageId = sentMsg.message_id;
    session.state = 'awaiting_balance_add';
    session.clientUserId = clientUserId;
    sessions.set(chatId, session);
    return sentMsg;
}

async function sendBalanceSubInput(bot, chatId, clientUserId, sessions) {
    const session = sessions.get(chatId) || {};
    const oldMessageId = session.lastMessageId;

    const client = await AgencyClient.findOne({ userId: clientUserId });
    if (!client) {
        await bot.sendMessage(chatId, '❌ Клиент не найден.');
        return;
    }

    const contactPart = client.username ? `@${client.username}` : 'Контакт';
    const contactLink = client.username ? `https://t.me/${client.username}` : `tg://user?id=${client.userId}`;
    const botUsername = bot.options.username;
    const profileLink = `tg://resolve?domain=${botUsername}&start=binding_${client.userId}`;
    const displayName = client.customName || client.firstName || 'Без имени';

    const text = `<a href="${profileLink}">💝 SkyGirls</a>\n\n` +
        `Клиент: <a href="${profileLink}">${displayName}</a>\n` +
        `ID: ${client.userId} <a href="${contactLink}">${contactPart}</a>\n\n` +
        `Текущий баланс: ${client.balance || 0} ${client.currency || 'RUB'}\n\n` +
        `Укажите сумму, которую нужно списать с баланса клиента.`;

    const keyboard = {
        inline_keyboard: [
            [{ text: '◀️ Назад', callback_data: `client_balance_${client.userId}` }]
        ]
    };

    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, CLIENT_FINANCE_IMAGE_ID, text, keyboard);
    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }
    session.lastMessageId = sentMsg.message_id;
    session.state = 'awaiting_balance_sub';
    session.clientUserId = clientUserId;
    sessions.set(chatId, session);
    return sentMsg;
}

async function sendBalanceConfirm(bot, chatId, clientUserId, amount, operation, sessions) {
    const session = sessions.get(chatId) || {};
    const oldMessageId = session.lastMessageId;

    const client = await AgencyClient.findOne({ userId: clientUserId });
    if (!client) {
        await bot.sendMessage(chatId, '❌ Клиент не найден.');
        return;
    }

    const contactPart = client.username ? `@${client.username}` : 'Контакт';
    const contactLink = client.username ? `https://t.me/${client.username}` : `tg://user?id=${client.userId}`;
    const botUsername = bot.options.username;
    const profileLink = `tg://resolve?domain=${botUsername}&start=binding_${client.userId}`;
    const displayName = client.customName || client.firstName || 'Без имени';
    const formattedAmount = amount.toLocaleString();

    let actionText;
    if (operation === 'add') {
        actionText = `Подтвердите добавление ${formattedAmount} ${client.currency || 'RUB'} к балансу клиента.`;
    } else {
        actionText = `Подтвердите списание ${formattedAmount} ${client.currency || 'RUB'} с баланса клиента.`;
    }

    const text = `<a href="${profileLink}">💝 SkyGirls</a>\n\n` +
        `Клиент: <a href="${profileLink}">${displayName}</a>\n` +
        `ID: ${client.userId} <a href="${contactLink}">${contactPart}</a>\n\n` +
        `Текущий баланс: ${client.balance || 0} ${client.currency || 'RUB'}\n\n` +
        actionText;

    const keyboard = {
        inline_keyboard: [
            [{ text: '✅ Подтвердить действие', callback_data: `client_balance_confirm_${client.userId}_${amount}_${operation}` }],
            [{ text: '◀️ Назад', callback_data: `client_balance_${client.userId}` }]
        ]
    };

    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, CLIENT_FINANCE_IMAGE_ID, text, keyboard);
    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }
    session.lastMessageId = sentMsg.message_id;
    // очищаем состояние, т.к. мы перешли в ожидание подтверждения (обрабатывается через callback)
    session.state = null;
    delete session.clientUserId;
    sessions.set(chatId, session);
    return sentMsg;
}

async function executeBalanceChange(bot, chatId, clientUserId, amount, operation, sessions) {
    const client = await AgencyClient.findOne({ userId: clientUserId });
    if (!client) {
        await bot.sendMessage(chatId, '❌ Клиент не найден.');
        return;
    }

    const oldBalance = client.balance || 0;
    if (operation === 'add') {
        client.balance = oldBalance + amount;
    } else {
        if (oldBalance < amount) {
            // Недостаточно средств
            const session = sessions.get(chatId) || {};
            const oldMessageId = session.lastMessageId;

            const contactPart = client.username ? `@${client.username}` : 'Контакт';
            const contactLink = client.username ? `https://t.me/${client.username}` : `tg://user?id=${client.userId}`;
            const botUsername = bot.options.username;
            const profileLink = `tg://resolve?domain=${botUsername}&start=binding_${client.userId}`;
            const displayName = client.customName || client.firstName || 'Без имени';

            const text = `<a href="${profileLink}">💝 SkyGirls</a>\n\n` +
                `Клиент: <a href="${profileLink}">${displayName}</a>\n` +
                `ID: ${client.userId} <a href="${contactLink}">${contactPart}</a>\n\n` +
                `❌ Недостаточно средств. Текущий баланс: ${oldBalance} ${client.currency || 'RUB'}\n` +
                `Запрошено списание: ${amount} ${client.currency || 'RUB'}.`;

            const keyboard = {
                inline_keyboard: [
                    [{ text: '◀️ Назад', callback_data: `client_balance_${client.userId}` }]
                ]
            };

            const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, CLIENT_FINANCE_IMAGE_ID, text, keyboard);
            if (oldMessageId) {
                await utils.deleteMessageSafe(bot, chatId, oldMessageId);
            }
            session.lastMessageId = sentMsg.message_id;
            sessions.set(chatId, session);
            return;
        }
        client.balance = oldBalance - amount;
    }
    client.lastActivity = new Date();
    await client.save();

    // После успешной операции возвращаемся в профиль клиента
    await sendClientProfile(bot, chatId, clientUserId, sessions);
}

function setupClientFinanceHandlers(bot, sessions) {
    // Обработка callback-запросов для финансов
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const data = query.data;

        await bot.answerCallbackQuery(query.id).catch(() => {});

        if (data.startsWith('client_balance_') && !data.includes('_add') && !data.includes('_sub') && !data.includes('_confirm')) {
            // Меню финансов (клик по "Финансовые операции")
            const clientUserId = parseInt(data.split('_')[2]);
            await sendFinanceMenu(bot, chatId, clientUserId, sessions);
        }
        else if (data.startsWith('client_balance_add_')) {
            const clientUserId = parseInt(data.split('_')[3]);
            await sendBalanceAddInput(bot, chatId, clientUserId, sessions);
        }
        else if (data.startsWith('client_balance_sub_')) {
            const clientUserId = parseInt(data.split('_')[3]);
            await sendBalanceSubInput(bot, chatId, clientUserId, sessions);
        }
        else if (data.startsWith('client_balance_confirm_')) {
            const parts = data.split('_'); // client_balance_confirm_12345_1000_add
            const clientUserId = parseInt(parts[4]);
            const amount = parseInt(parts[5]);
            const operation = parts[6]; // 'add' или 'sub'
            await executeBalanceChange(bot, chatId, clientUserId, amount, operation, sessions);
        }
    });

    // Обработка текстовых сообщений для ввода суммы
    bot.on('message', async (msg) => {
        if (!msg.text || msg.text.startsWith('/')) return;
        const chatId = msg.chat.id;
        const text = msg.text.trim();
        const session = sessions.get(chatId);

        if (!session) return;

        if (session.state === 'awaiting_balance_add' || session.state === 'awaiting_balance_sub') {
            const amount = parseInt(text.replace(/[^\d]/g, ''));
            if (isNaN(amount) || amount <= 0) {
                await bot.sendMessage(chatId, '❌ Некорректная сумма. Введите положительное число.');
                return;
            }
            const operation = session.state === 'awaiting_balance_add' ? 'add' : 'sub';
            const clientUserId = session.clientUserId;
            // Удаляем сообщение пользователя с суммой
            await bot.deleteMessage(chatId, msg.message_id).catch(() => {});
            // Показываем подтверждение
            await sendBalanceConfirm(bot, chatId, clientUserId, amount, operation, sessions);
            // Сессия очищается внутри sendBalanceConfirm
        }
    });
}

module.exports = (bot, sessions) => {
    setupClientFinanceHandlers(bot, sessions);
};

module.exports.sendFinanceMenu = sendFinanceMenu;