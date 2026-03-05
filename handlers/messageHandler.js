const { sendProfile } = require('./profile/profile');
const { sendFeedbackNewMessage, sendFeedbackConfirm } = require('./feedback');
const { Feedback, Admin } = require('../db');
const utils = require('../utils');
const { handleRegistrationMessage } = require('./profile/registration'); // правильный импорт

async function handleApprovedMessage(bot, msg, user, session, sessions) {
    const chatId = msg.chat.id;
    const text = msg.text.trim();

    // Удаление служебных инлайн-сообщений
    if (text === '\u200Bmentoring_not_found' || text === '\u200Bno_feedback') {
        await bot.deleteMessage(chatId, msg.message_id).catch(() => {});
        return;
    }

    if (session.state === 'feedback_awaiting_topic') {
        session.feedbackTopic = text;
        const sentMsg = await sendFeedbackNewMessage(bot, chatId, text, session.lastMessageId, sessions);
        sessions.set(chatId, { ...session, state: 'feedback_awaiting_message', lastMessageId: sentMsg.message_id });
        return;
    }
    else if (session.state === 'feedback_awaiting_message') {
        const topic = session.feedbackTopic;
        const message = text;
        const feedback = new Feedback({
            userId: user.telegramId,
            username: user.username,
            topic,
            message,
            status: 'new'
        });
        await feedback.save();

        // Уведомляем админов через Notification
        const admins = await Admin.find();
        for (const admin of admins) {
            const Notification = require('../db').Notification;
            const notif = new Notification({
                userId: user.telegramId,
                adminId: admin.telegramId,
                text: `📩 Новое обращение от @${user.username || user.telegramId}\nТема: ${topic}\n\n${message}`,
                data: { feedbackId: feedback._id, type: 'feedback' }
            });
            await notif.save();
        }

        await utils.deleteMessageSafe(bot, chatId, session.lastMessageId);
        const sentMsg = await sendFeedbackConfirm(bot, chatId, topic, message, null, sessions);
        sessions.set(chatId, { ...session, state: null, lastMessageId: sentMsg.message_id });
        return;
    }

    // === Обработка тега и описания ===
    if (session.state === 'awaiting_tag') {
        const tagRegex = /^[a-zA-Zа-яА-Я0-9\-_ ]{1,24}$/;
        if (!tagRegex.test(text)) {
            await bot.sendMessage(chatId, 'Недопустимый тег. Попробуйте ещё раз.');
            return;
        }
        user.tag = text;
        await user.save();
        await bot.sendMessage(chatId, 'Тег сохранён.');
        const sentMsg = await sendProfile(bot, chatId, user, session.lastMessageId, sessions);
        sessions.set(chatId, { ...session, state: null, lastMessageId: sentMsg.message_id });
        return;
    }
    else if (session.state === 'awaiting_description') {
        if (text.length < 1 || text.length > 68) {
            await bot.sendMessage(chatId, 'Описание должно быть от 1 до 68 символов. Попробуйте ещё раз.');
            return;
        }
        user.description = text;
        await user.save();
        await bot.sendMessage(chatId, 'Описание сохранено.');
        const sentMsg = await sendProfile(bot, chatId, user, session.lastMessageId, sessions);
        sessions.set(chatId, { ...session, state: null, lastMessageId: sentMsg.message_id });
        return;
    }
}

module.exports = { handleApprovedMessage, handleRegistrationMessage };