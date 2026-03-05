const utils = require('../../utils');
const config = require('../../config/config');
const { sendMainMenu } = require('../mainMenu');

// Функция отправки профиля (уже была)
async function sendProfile(bot, chatId, user, oldMessageId = null, sessions) {
    const workerNumber = user.workerNumber || '—';
    const referralLink = `https://t.me/${bot.options.username}?start=worker_${user.workerNumber || user._id}`;
    let daysInTeam = 0;
    if (user.approvedAt) {
        const diff = Date.now() - new Date(user.approvedAt).getTime();
        daysInTeam = Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    let workerLine;
    if (user.tag) {
        workerLine = `👤 <a href="${referralLink}">${user.tag}</a>`;
    } else {
        workerLine = `👤 <a href="${referralLink}">worker ${workerNumber}</a>`;
    }

    let descriptionLine = '';
    if (user.description) {
        descriptionLine = `\n\n▎О себе: ${user.description}`;
    }

    const profileText = `${workerLine}${descriptionLine}\n\nВы находитесь в команде ${daysInTeam} дней.\n\nСделайте свой первый профит!`;

    const keyboard = [
        [{ text: 'Тег', callback_data: 'edit_tag' }, { text: 'Описание', callback_data: 'edit_description' }],
        [{ text: 'Назад', callback_data: 'back_to_menu' }],
    ];
    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, config.IMAGES.MENU, profileText, keyboard);
    if (oldMessageId) await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    return sentMsg;
}

module.exports = (bot, sessions) => {
    // 🔥 НОВЫЙ ОБРАБОТЧИК КОМАНДЫ /profile
    bot.onText(/\/profile/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const user = await utils.getUserByTelegramId(userId);
        if (!user || user.status !== 'approved') {
            return bot.sendMessage(chatId, 'Сначала пройдите регистрацию через /start');
        }
        const session = sessions.get(chatId) || {};
        // Удаляем предыдущее сообщение, если есть
        if (session.lastMessageId) {
            await utils.deleteMessageSafe(bot, chatId, session.lastMessageId);
        }
        const sentMsg = await sendProfile(bot, chatId, user, null, sessions);
        sessions.set(chatId, { ...session, lastMessageId: sentMsg.message_id });
    });

    // Существующий обработчик callback'ов
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const userId = query.from.id;
        const messageId = query.message.message_id;
        const data = query.data;

        const profileCallbacks = ['edit_tag', 'remove_tag', 'toggle_anonymous', 'edit_description'];
        if (!profileCallbacks.includes(data)) return;

        await bot.answerCallbackQuery(query.id).catch(() => {});

        const session = sessions.get(chatId) || {};
        const user = await utils.getUserByTelegramId(userId);
        if (!user || user.status !== 'approved') return;

        const navigationActions = ['edit_tag', 'edit_description'];
        if (navigationActions.includes(data)) {
            await utils.deleteMessageSafe(bot, chatId, messageId);
        }

        if (data === 'edit_tag') {
            const sentMsg = await bot.sendMessage(chatId,
                'Пришлите новый тег.\n\nДопустимые символы: а-Z, а-Я, 0-9, -, _ и пробел.\nДлина: от 1 до 24 символов.',
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Убрать тег', callback_data: 'remove_tag' }],
                            [{ text: `Анонимность: ${user.anonymous ? 'контакт скрыт' : 'нет'}`, callback_data: 'toggle_anonymous' }],
                            [{ text: 'Назад', callback_data: 'profile' }]
                        ]
                    }
                }
            );
            sessions.set(chatId, { ...session, state: 'awaiting_tag', lastMessageId: sentMsg.message_id });
        }
        else if (data === 'remove_tag') {
            user.tag = null;
            await user.save();
            await utils.deleteMessageSafe(bot, chatId, messageId);
            const sentMsg = await sendProfile(bot, chatId, user, null, sessions);
            sessions.set(chatId, { ...session, lastMessageId: sentMsg.message_id });
        }
        else if (data === 'toggle_anonymous') {
            user.anonymous = !user.anonymous;
            await user.save();
            const sentMsg = await bot.sendMessage(chatId,
                'Пришлите новый тег.\n\nДопустимые символы: а-Z, а-Я, 0-9, -, _ и пробел.\nДлина: от 1 до 24 символов.',
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Убрать тег', callback_data: 'remove_tag' }],
                            [{ text: `Анонимность: ${user.anonymous ? 'контакт скрыт' : 'нет'}`, callback_data: 'toggle_anonymous' }],
                            [{ text: 'Назад', callback_data: 'profile' }]
                        ]
                    }
                }
            );
            await utils.deleteMessageSafe(bot, chatId, messageId);
            sessions.set(chatId, { ...session, state: 'awaiting_tag', lastMessageId: sentMsg.message_id });
        }
        else if (data === 'edit_description') {
            const sentMsg = await bot.sendMessage(chatId,
                'Пришлите описание для своего профиля (от 1 до 68 символов).',
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Назад', callback_data: 'profile' }]
                        ]
                    }
                }
            );
            sessions.set(chatId, { ...session, state: 'awaiting_description', lastMessageId: sentMsg.message_id });
        }
    });
};

module.exports.sendProfile = sendProfile;