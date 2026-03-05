const utils = require('../utils');
const config = require('../config/config');
const { Feedback, Admin } = require('../db');

const FEEDBACK_IMAGE_ID = 'AgACAgIAAxkBAAIBfWmctbPTPl4laiuWwuxp69S1qPZbAAKBGGsb7EjhSMb1aPTmuvP8AQADAgADeQADOgQ';

async function getUserFeedbackStats(userId) {
    const total = await Feedback.countDocuments({ userId });
    const resolved = await Feedback.countDocuments({ userId, status: 'resolved' });
    return { total, resolved };
}

async function sendFeedbackMenu(bot, chatId, user, oldMessageId = null, sessions) {
    const stats = await getUserFeedbackStats(user.telegramId);
    const text = `🗣 Обратная связь с администрацией

▎Здесь вы можете создать обращение с предложением новой идеи, критическим замечанием или любым другим вопросом.

— Отправлено обращений: ${stats.total}
— Успешно рассмотрено: ${stats.resolved}`;

    const keyboard = [
        [{ text: 'Подать заявку', callback_data: 'feedback_new' }],
        [{ text: 'Мои заявки', switch_inline_query_current_chat: 'feedback_my_requests' }],
        [{ text: 'Назад', callback_data: 'back_to_menu' }]
    ];
    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, FEEDBACK_IMAGE_ID, text, keyboard);
    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }
    return sentMsg;
}

async function sendFeedbackNewTopic(bot, chatId, oldMessageId = null, sessions) {
    const text = `🗣 Обратная связь с администрацией

▎Здесь вы можете создать обращение с предложением новой идеи, критическим замечанием или любым другим вопросом.

Введите тему созданного обращения:`;
    const keyboard = [[{ text: 'Назад', callback_data: 'back_to_feedback' }]];
    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, FEEDBACK_IMAGE_ID, text, keyboard);
    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }
    return sentMsg;
}

async function sendFeedbackNewMessage(bot, chatId, topic, oldMessageId = null, sessions) {
    const text = `🗣 Обратная связь с администрацией

▎Тема: ${topic}

Теперь введите текст вашего обращения:`;
    const keyboard = [[{ text: 'Назад', callback_data: 'back_to_feedback_topic' }]];
    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, FEEDBACK_IMAGE_ID, text, keyboard);
    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }
    return sentMsg;
}

async function sendFeedbackConfirm(bot, chatId, topic, message, oldMessageId = null, sessions) {
    const text = `🗣 Обратная связь с администрацией

▎Тема: ${topic}
▎Сообщение: ${message}

Ваше обращение отправлено администратору. Ожидайте ответа.`;
    const keyboard = [[{ text: 'Назад в фидбек', callback_data: 'back_to_feedback' }]];
    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, FEEDBACK_IMAGE_ID, text, keyboard);
    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }
    return sentMsg;
}

// Основной обработчик callback'ов фидбека
const feedbackHandler = (bot, sessions) => {
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const userId = query.from.id;
        const messageId = query.message.message_id;
        const data = query.data;

        const feedbackCallbacks = ['feedback_new', 'back_to_feedback', 'back_to_feedback_topic'];
        if (!feedbackCallbacks.includes(data)) return;

        await bot.answerCallbackQuery(query.id).catch(() => {});

        const session = sessions.get(chatId) || {};
        const user = await utils.getUserByTelegramId(userId);
        if (!user || user.status !== 'approved') return;

        if (data === 'feedback_new') {
            await utils.deleteMessageSafe(bot, chatId, messageId);
            const sentMsg = await sendFeedbackNewTopic(bot, chatId, null, sessions);
            sessions.set(chatId, { ...session, state: 'feedback_awaiting_topic', lastMessageId: sentMsg.message_id });
        }
        else if (data === 'back_to_feedback') {
            await utils.deleteMessageSafe(bot, chatId, messageId);
            const sentMsg = await sendFeedbackMenu(bot, chatId, user, null, sessions);
            sessions.set(chatId, { ...session, state: null, lastMessageId: sentMsg.message_id });
        }
        else if (data === 'back_to_feedback_topic') {
            await utils.deleteMessageSafe(bot, chatId, messageId);
            const sentMsg = await sendFeedbackNewTopic(bot, chatId, null, sessions);
            sessions.set(chatId, { ...session, state: 'feedback_awaiting_topic', lastMessageId: sentMsg.message_id });
        }
    });

    // Инлайн-запросы
    bot.on('inline_query', async (msg) => {
        const inlineQueryId = msg.id;
        const queryText = msg.query;
        const userId = msg.from.id;

        const user = await utils.getUserByTelegramId(userId);
        if (!user || user.status !== 'approved') return;

        if (queryText === 'feedback_my_requests') {
            const feedbacks = await Feedback.find({ userId: user.telegramId }).sort({ createdAt: -1 }).limit(50);
            if (feedbacks.length === 0) {
                const results = [{
                    type: 'article',
                    id: 'no_feedback',
                    title: 'Нет обращений',
                    description: 'у вас пока нет заявок в разделе обратной связи',
                    input_message_content: {
                        message_text: '\u200Bno_feedback',
                        parse_mode: 'HTML'
                    }
                }];
                await bot.answerInlineQuery(inlineQueryId, results, { cache_time: 0, is_personal: true });
                return;
            }

            const results = feedbacks.map(fb => {
                const date = fb.createdAt.toLocaleDateString('ru-RU');
                // Исправлено: теперь разные иконки для разных статусов
                let statusText;
                if (fb.status === 'new') {
                    statusText = '⏳ Новое';
                } else if (fb.status === 'in_progress') {
                    statusText = '🔄 В работе';
                } else if (fb.status === 'rejected') {
                    statusText = '❌ Отклонено';
                } else {
                    statusText = '✅ Решено'; // для resolved
                }
                return {
                    type: 'article',
                    id: `fb_${fb._id}`,
                    title: fb.topic,
                    description: `${date} • ${statusText}`,
                    input_message_content: {
                        message_text: `📨 Обращение #${fb._id.toString().slice(-6)}\n\nТема: ${fb.topic}\nСообщение: ${fb.message}\nСтатус: ${statusText}\nСоздано: ${date}${fb.adminResponse ? `\n\nОтвет администратора:\n${fb.adminResponse}` : ''}`,
                        parse_mode: 'HTML'
                    }
                };
            });

            await bot.answerInlineQuery(inlineQueryId, results.slice(0, 50), { cache_time: 0, is_personal: true });
        }
    });
};

module.exports = feedbackHandler;
module.exports.sendFeedbackMenu = sendFeedbackMenu;
module.exports.sendFeedbackNewTopic = sendFeedbackNewTopic;
module.exports.sendFeedbackNewMessage = sendFeedbackNewMessage;
module.exports.sendFeedbackConfirm = sendFeedbackConfirm;