const utils = require('../../utils');
const config = require('../../config/config');
const { User, Admin, Notification } = require('../../db');

// Функция для обработки текстовых сообщений от pending пользователей
async function handleRegistrationMessage(bot, msg, user, session, sessions) {
    const chatId = msg.chat.id;
    const text = msg.text.trim();

    if (!session) return;

    if (session.state === 'captcha') {
        if (text !== config.CAPTCHA_TEXT) {
            await bot.sendMessage(chatId, 'Неверный текст с картинки. Попробуйте ещё раз.');
            return;
        }
        const questionText = 'Для регистрации вам нужно заполнить анкету ниже.\n\nКакой у вас опыт работы?';
        const keyboard = [[{ text: 'Назад', callback_data: 'back_to_start' }]];
        const sentMsg = await utils.sendNewAndDeleteOld(bot, chatId, config.IMAGES.SURVEY, questionText, keyboard, session.lastMessageId);
        sessions.set(chatId, { ...session, state: 'experience', lastMessageId: sentMsg.message_id });
    }
    else if (session.state === 'experience') {
        session.experience = text;
        const newText = `Для регистрации вам нужно заполнить анкету ниже.\n\nОпыт работы: ${text}\nОткуда вы узнали о нас?`;
        const keyboard = [[{ text: 'Изменить опыт работы', callback_data: 'change_experience' }]];
        const sentMsg = await utils.sendNewAndDeleteOld(bot, chatId, config.IMAGES.SURVEY, newText, keyboard, session.lastMessageId);
        sessions.set(chatId, { ...session, state: 'source', lastMessageId: sentMsg.message_id });
    }
    else if (session.state === 'source') {
        session.source = text;
        const finalPreview = `ВАША ЗАЯВКА\n\nОпыт работы: ${session.experience}\nИсточник: ${text}`;
        const keyboard = [
            [{ text: 'Отправить заявку', callback_data: 'submit_application' }],
            [{ text: 'Изменить источник', callback_data: 'change_source' }]
        ];
        const sentMsg = await utils.sendNewAndDeleteOld(bot, chatId, config.IMAGES.SURVEY, finalPreview, keyboard, session.lastMessageId);
        sessions.set(chatId, { ...session, state: 'preview', lastMessageId: sentMsg.message_id });
    }
}

// Регистрация callback-запросов для регистрации
const registrationCallbacks = (bot, sessions) => {
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const userId = query.from.id;
        const messageId = query.message.message_id;
        const data = query.data;

        await bot.answerCallbackQuery(query.id).catch(() => {});

        const session = sessions.get(chatId);
        if (!session) return;

        const user = await utils.getUserByTelegramId(userId);
        if (!user || user.status !== 'pending') return;

        if (data === 'continue') {
            const subscribed = await utils.isSubscribed(bot, userId);
            if (!subscribed) {
                await bot.answerCallbackQuery(query.id, {
                    text: 'Для продолжения регистрации подпишитесь на канал.',
                    show_alert: true
                }).catch(() => {});
                return;
            }
            const captchaText = 'Перед заполнением анкеты, пожалуйста, введите текст с изображения.';
            const captchaKeyboard = [[{ text: 'Назад', callback_data: 'back_to_start' }]];
            const sentMsg = await utils.sendNewAndDeleteOld(bot, chatId, config.IMAGES.CAPTCHA, captchaText, captchaKeyboard, session.lastMessageId);
            sessions.set(chatId, { ...session, state: 'captcha', lastMessageId: sentMsg.message_id });
        }
        else if (data === 'back_to_start') {
            await utils.deleteMessageSafe(bot, chatId, messageId);
            bot.emit('text', { chat: { id: chatId }, from: { id: userId }, text: '/start' });
        }
        else if (data === 'change_experience') {
            const newText = 'Для регистрации вам нужно заполнить анкету ниже.\n\nКакой у вас опыт работы?';
            const keyboard = [[{ text: 'Назад', callback_data: 'back_to_start' }]];
            const sentMsg = await utils.sendNewAndDeleteOld(bot, chatId, config.IMAGES.SURVEY, newText, keyboard, messageId);
            sessions.set(chatId, { ...session, state: 'experience', experience: null, lastMessageId: sentMsg.message_id });
        }
        else if (data === 'change_source') {
            const newText = `Для регистрации вам нужно заполнить анкету ниже.\n\nОпыт работы: ${session.experience}\nОткуда вы узнали о нас?`;
            const keyboard = [[{ text: 'Изменить опыт работы', callback_data: 'change_experience' }]];
            const sentMsg = await utils.sendNewAndDeleteOld(bot, chatId, config.IMAGES.SURVEY, newText, keyboard, messageId);
            sessions.set(chatId, { ...session, state: 'source', source: null, lastMessageId: sentMsg.message_id });
        }
        else if (data === 'submit_application') {
            user.experience = session.experience;
            user.source = session.source;
            user.status = 'pending';
            await user.save();

            const admins = await Admin.find();
            for (const admin of admins) {
                const notification = new Notification({
                    userId: user.telegramId,
                    adminId: admin.telegramId,
                    text: `📝 Новая заявка от ${user.firstName || ''} (@${user.username || 'нет'})\nОпыт: ${user.experience}\nИсточник: ${user.source}`,
                    data: { userId: user.telegramId }
                });
                await notification.save();
            }

            const finalText = 'Ваша заявка отправлена на рассмотрение. Ожидайте решения.';
            const sentMsg = await utils.sendNewAndDeleteOld(bot, chatId, config.IMAGES.SURVEY, finalText, [], messageId);
            sessions.set(chatId, { ...session, state: 'finished', lastMessageId: sentMsg.message_id });
        }
    });
};

module.exports = registrationCallbacks;
module.exports.handleRegistrationMessage = handleRegistrationMessage;