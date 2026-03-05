const { User, AgencyClient } = require('../db');
const utils = require('../utils');
const config = require('../config/config');
const { sendMainMenu } = require('./mainMenu');
const { sendProfile } = require('./profile/profile');
const { sendClientProfile } = require('./clientProfile');

module.exports = (bot, sessions) => {
    bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const payload = match[1] || ''; // получаем payload

        // Проверяем payload на worker_... или binding_...
        const workerMatch = payload.match(/^worker_(\d+)$/);
        const bindingMatch = payload.match(/^binding_(\d+)$/);

        if (bindingMatch) {
            const clientUserId = parseInt(bindingMatch[1]);
            // Проверяем, что текущий пользователь является агентом, привязавшим клиента
            const client = await AgencyClient.findOne({ userId: clientUserId, invitedBy: userId });
            if (!client) {
                await bot.sendMessage(chatId, '❌ У вас нет доступа к этому клиенту.');
                return;
            }
            // Удаляем предыдущее уведомление о привязке, если оно есть
            const session = sessions.get(chatId);
            if (session && session.lastAgencyNotificationId) {
                await utils.deleteMessageSafe(bot, chatId, session.lastAgencyNotificationId);
                delete session.lastAgencyNotificationId;
                sessions.set(chatId, session);
            }
            // Открываем профиль клиента
            await sendClientProfile(bot, chatId, clientUserId, sessions);
            return;
        }

        let invitedBy = null;
        if (workerMatch) {
            const inviterWorkerNumber = parseInt(workerMatch[1]);
            const inviter = await User.findOne({ workerNumber: inviterWorkerNumber, status: 'approved' });
            if (inviter) invitedBy = inviter._id;
        }

        let user = await utils.getUserByTelegramId(userId);

        if (!user) {
            user = new User({
                telegramId: userId,
                username: msg.from.username,
                firstName: msg.from.first_name,
                lastName: msg.from.last_name,
                invitedBy: invitedBy,
                status: 'pending',
            });
            await user.save();
        }

        if (user.status === 'approved') {
            const session = sessions.get(chatId) || {};
            // Удаляем предыдущее сообщение, если есть
            if (session.lastMessageId) {
                await utils.deleteMessageSafe(bot, chatId, session.lastMessageId);
            }

            if (workerMatch) {
                // Если переход по реферальной ссылке – показываем профиль
                const sentMsg = await sendProfile(bot, chatId, user, null, sessions);
                sessions.set(chatId, { ...session, lastMessageId: sentMsg.message_id });
            } else {
                // Обычный старт – главное меню
                await sendMainMenu(bot, chatId, null, sessions);
            }
            return;
        } else if (user.status === 'rejected') {
            await bot.sendMessage(chatId, 'Ваша заявка была отклонена. Вы не можете использовать бота.');
            return;
        }

        const session = sessions.get(chatId) || {};
        if (session.lastMessageId) {
            await utils.deleteMessageSafe(bot, chatId, session.lastMessageId);
        }
        if (user.isBlocked) {
            await bot.sendMessage(chatId, '');
            return;
        }

        const welcomeText = `Добро пожаловать! Подпишитесь на канал ${config.CHANNEL_USERNAME} и затем нажмите на кнопку ниже, чтобы начать регистрацию.`;
        const keyboard = [[{ text: 'Продолжить', callback_data: 'continue' }]];
        const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, config.IMAGES.WELCOME, welcomeText, keyboard);

        sessions.set(chatId, { state: 'start', experience: null, source: null, lastMessageId: sentMsg.message_id });
    });
};