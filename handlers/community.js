const utils = require('../utils');
const config = require('../config/config');
const { Community, CommunityJoinRequest, Admin, Notification } = require('../db');

const COMMUNITY_IMAGE_ID = 'AgACAgIAAxkBAAMKaaXGE_HbtoaTX0z4qKZ9gSTlRuAAAxJrG9eZMUn954ZNBr_8pAEAAwIAA3kAAzoE';

// Тестовое комьюнити (позже заменится на данные из БД)
const testCommunity = {
    id: 'sega_family',
    name: 'SEGA Family',
    tag: '#SEGA',
    description: 'Мы дружная семья, которая готова помочь в любой проблеме другому воркеру. К каждому участнику индивидуальная помощь',
    imageUrl: 'https://imag.malavida.com/mvimgbig/download-fs/sonic-the-hedgehog-12661-1.jpg',
    imageFileId: COMMUNITY_IMAGE_ID,
    stats: {
        allTimeProfits: 5457,
        allTimeProfitSum: 77466284,
        influencePoints: 78300,
        membersCount: 105,
        membersLimit: 500
    }
};

// ==================== Главное меню комьюнити ====================
async function sendCommunityMainMenu(bot, chatId, oldMessageId = null, sessions) {
    const text = '';
    const keyboard = [
        [{ text: 'Поиск комьюнити', switch_inline_query_current_chat: 'community?search=' }],
        [{ text: 'Лучшие комьюнити', callback_data: 'community_best' }],
        [{ text: '◀️ Назад', callback_data: 'back_to_menu' }]
    ];
    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, COMMUNITY_IMAGE_ID, text, keyboard);
    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }
    return sentMsg;
}

// ==================== Лучшие комьюнити с периодами ====================
async function sendBestCommunitiesMenu(bot, chatId, period = 'all', oldMessageId = null, sessions) {
    const stats = {
        all: {
            title: 'За все время',
            lines: ['1. 🏆 SEGA Family #SEGA - 5457 профитов - 77,466,284₽']
        },
        '24h': {
            title: 'За 24 часа',
            lines: ['1. 🏆 SEGA Family #SEGA - 0 профитов - 0₽']
        },
        '7d': {
            title: 'За 7 дней',
            lines: ['1. 🏆 SEGA Family #SEGA - 1 профит - 5,000₽']
        },
        '30d': {
            title: 'За 30 дней',
            lines: ['1. 🏆 SEGA Family #SEGA - 15 профитов - 180,600₽']
        },
        profit: {
            title: 'за 30 дней',
            lines: ['1. 🏆 SEGA Family #SEGA - ⚡️178']
        }
    };

    const data = stats[period] || stats.all;
    const text = `▎Лучшие комьюнити ${data.title}:\n\n` + data.lines.join('\n');

    const isActive = (p) => period !== 'profit' && p === period;

    const keyboard = [
        [
            { text: isActive('all') ? '«За все время»' : 'За все время', callback_data: 'community_best_period_all' },
            { text: isActive('24h') ? '«За 24 часа»' : 'За 24 часа', callback_data: 'community_best_period_24h' }
        ],
        [
            { text: isActive('7d') ? '«За 7 дней»' : 'За 7 дней', callback_data: 'community_best_period_7d' },
            { text: isActive('30d') ? '«За 30 дней»' : 'За 30 дней', callback_data: 'community_best_period_30d' }
        ],
        [
            { text: 'Статистика по профитам', callback_data: 'community_best_profit' }
        ],
        [
            { text: '◀️ Назад', callback_data: 'back_to_community_main' }
        ]
    ];

    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, COMMUNITY_IMAGE_ID, text, keyboard);
    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }
    return sentMsg;
}

// ==================== Детальный просмотр комьюнити ====================
async function sendCommunityDetail(bot, chatId, communityId, period = 'all', oldMessageId = null, sessions) {
    const c = testCommunity;

    // Статистика за периоды
    const periodStats = {
        all: '5457 профитов - 77,466,284₽',
        '24h': '0 профитов - 0₽',
        '7d': '1 профит - 5,000₽',
        '30d': '15 профитов - 180,600₽',
        profit: '⚡️178'
    };

    const statsText = periodStats[period] || periodStats.all;

    const baseText = `🏆 ${c.name} ${c.tag}\n\nОписание: ${c.description}\n\nКомьюнити создано 25 декабря 2024.\nКомиссия отсутствует.\n\nВход: По заявкам\n\n`;

    let periodTitle;
    if (period === 'all') periodTitle = 'за всё время';
    else if (period === '24h') periodTitle = 'за 24 часа';
    else if (period === '7d') periodTitle = 'за 7 дней';
    else if (period === '30d') periodTitle = 'за 30 дней';
    else if (period === 'profit') periodTitle = 'за 30 дней (⚡️)';

    const fullText = baseText + `Статистика ${periodTitle}:\n💸 ${statsText}`;

    const isActive = (p) => p === period;

    const keyboard = [
        [
            { text: isActive('all') ? '«За все время»' : 'За все время', callback_data: `community_detail_period_${communityId}_all` },
            { text: isActive('24h') ? '«За 24 часа»' : 'За 24 часа', callback_data: `community_detail_period_${communityId}_24h` }
        ],
        [
            { text: isActive('7d') ? '«За 7 дней»' : 'За 7 дней', callback_data: `community_detail_period_${communityId}_7d` },
            { text: isActive('30d') ? '«За 30 дней»' : 'За 30 дней', callback_data: `community_detail_period_${communityId}_30d` }
        ],
        [
            { text: 'Статистика по профитам', callback_data: `community_detail_period_${communityId}_profit` }
        ],
        [
            { text: 'Список участников', callback_data: `community_members_${communityId}` }
        ],
        [
            { text: 'Отправить заявку на вступление', callback_data: `community_join_${communityId}` }
        ],
        [
            { text: '◀️ Назад', callback_data: 'back_to_community_main' }
        ]
    ];

    try {
        const sentMsg = await bot.sendPhoto(chatId, c.imageUrl, {
            caption: fullText,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
        if (oldMessageId) {
            await utils.deleteMessageSafe(bot, chatId, oldMessageId);
        }
        return sentMsg;
    } catch (error) {
        console.error('Ошибка отправки фото по URL, использую запасную картинку:', error.message);
        const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, COMMUNITY_IMAGE_ID, fullText, keyboard);
        if (oldMessageId) {
            await utils.deleteMessageSafe(bot, chatId, oldMessageId);
        }
        return sentMsg;
    }
}

// ==================== Запрос текста для заявки ====================
async function sendJoinRequestPrompt(bot, chatId, communityId, oldMessageId = null, sessions) {
    const c = testCommunity;
    const text = `🏆 ${c.name} ${c.tag}\n\nДля вступления в комьюнити нужно отправить запрос! Пришлите текст, который увидят участники комьюнити.`;
    const keyboard = [
        [{ text: 'Подать заявку без текста', callback_data: `community_join_empty_${communityId}` }],
        [{ text: '◀️ Назад', callback_data: `community_detail_${communityId}` }]
    ];
    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, COMMUNITY_IMAGE_ID, text, keyboard);
    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }
    return sentMsg;
}

// ==================== Отправка заявки ====================
async function submitJoinRequest(bot, chatId, user, communityId, messageText, sessions, oldMessageId) {
    const request = new CommunityJoinRequest({
        communityId,
        userId: user.telegramId,
        username: user.username,
        message: messageText,
        status: 'pending'
    });
    await request.save();

    const admins = await Admin.find();
    for (const admin of admins) {
        const notif = new Notification({
            userId: user.telegramId,
            adminId: admin.telegramId,
            text: `📩 Новая заявка на вступление в комьюнити от @${user.username || user.telegramId}\nСообщество: ${communityId}\nТекст: ${messageText || 'без текста'}`,
            data: { type: 'community_join', requestId: request._id }
        });
        await notif.save();
    }

    await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    const sentMsg = await bot.sendMessage(chatId, '✅ Ваша заявка отправлена администратору. Ожидайте решения.');
    const session = sessions.get(chatId) || {};
    sessions.set(chatId, { ...session, lastMessageId: sentMsg.message_id, state: null });
}

// ==================== Основной обработчик ====================
module.exports = (bot, sessions) => {
    // Обработка callback-запросов
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const userId = query.from.id;
        const messageId = query.message.message_id;
        const data = query.data;

        if (!data.startsWith('community_') && data !== 'back_to_community_main') return;

        await bot.answerCallbackQuery(query.id).catch(() => {});

        const session = sessions.get(chatId) || {};
        const user = await utils.getUserByTelegramId(userId);
        if (!user || user.status !== 'approved') return;

        // Переходы
        if (data === 'community_best') {
            await utils.deleteMessageSafe(bot, chatId, messageId);
            const sentMsg = await sendBestCommunitiesMenu(bot, chatId, 'all', null, sessions);
            sessions.set(chatId, { ...session, lastMessageId: sentMsg.message_id });
        }
        else if (data === 'back_to_community_main') {
            await utils.deleteMessageSafe(bot, chatId, messageId);
            const sentMsg = await sendCommunityMainMenu(bot, chatId, null, sessions);
            sessions.set(chatId, { ...session, lastMessageId: sentMsg.message_id });
        }
        else if (data.startsWith('community_best_period_')) {
            const period = data.replace('community_best_period_', '');
            const sentMsg = await sendBestCommunitiesMenu(bot, chatId, period, messageId, sessions);
            sessions.set(chatId, { ...session, lastMessageId: sentMsg.message_id });
        }
        else if (data === 'community_best_profit') {
            const sentMsg = await sendBestCommunitiesMenu(bot, chatId, 'profit', messageId, sessions);
            sessions.set(chatId, { ...session, lastMessageId: sentMsg.message_id });
        }
        else if (data.startsWith('community_detail_') && !data.includes('period')) {
            // Формат: community_detail_sega_family
            const communityId = data.split('_')[2];
            const sentMsg = await sendCommunityDetail(bot, chatId, communityId, 'all', messageId, sessions);
            sessions.set(chatId, { ...session, lastMessageId: sentMsg.message_id });
        }
        else if (data.startsWith('community_detail_period_')) {
            // Формат: community_detail_period_sega_family_all
            const parts = data.split('_');
            const communityId = parts[3];
            const period = parts[4];
            const sentMsg = await sendCommunityDetail(bot, chatId, communityId, period, messageId, sessions);
            sessions.set(chatId, { ...session, lastMessageId: sentMsg.message_id });
        }
        else if (data.startsWith('community_members_')) {
            await bot.answerCallbackQuery(query.id, { text: 'Список участников в разработке' });
        }
        else if (data.startsWith('community_join_') && !data.includes('empty')) {
            const communityId = data.split('_')[2];
            const sentMsg = await sendJoinRequestPrompt(bot, chatId, communityId, messageId, sessions);
            sessions.set(chatId, { ...session, state: `awaiting_join_text_${communityId}`, lastMessageId: sentMsg.message_id });
        }
        else if (data.startsWith('community_join_empty_')) {
            const communityId = data.split('_')[3];
            await submitJoinRequest(bot, chatId, user, communityId, '', sessions, messageId);
        }
    });

    // Обработка текстовых сообщений (ввод текста заявки)
    bot.on('message', async (msg) => {
        if (!msg.text || msg.text.startsWith('/')) return;
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const text = msg.text.trim();

        const session = sessions.get(chatId);
        if (!session || !session.state || !session.state.startsWith('awaiting_join_text_')) return;

        const communityId = session.state.replace('awaiting_join_text_', '');
        const user = await utils.getUserByTelegramId(userId);
        if (!user || user.status !== 'approved') return;

        await submitJoinRequest(bot, chatId, user, communityId, text, sessions, session.lastMessageId);
    });

    // Инлайн-запросы для поиска комьюнити
    bot.on('inline_query', async (msg) => {
        const inlineQueryId = msg.id;
        const queryText = msg.query;
        const userId = msg.from.id;

        const user = await utils.getUserByTelegramId(userId);
        if (!user || user.status !== 'approved') return;

        if (queryText.startsWith('community?search=')) {
            const c = testCommunity;
            const results = [{
                type: 'article',
                id: c.id,
                title: `${c.name} ${c.tag} ⚡️${c.stats.influencePoints}`,
                description: `Вход по заявкам (${c.stats.membersCount}/${c.stats.membersLimit})\n${c.stats.allTimeProfits} профитов на сумму ${c.stats.allTimeProfitSum.toLocaleString()}₽`,
                thumb_url: c.imageUrl,
                input_message_content: {
                    message_text: `view_community_${c.id}`,
                    parse_mode: 'HTML'
                },
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Подробнее', callback_data: `community_detail_${c.id}` }]
                    ]
                }
            }];
            await bot.answerInlineQuery(inlineQueryId, results, { cache_time: 0, is_personal: true });
        }
    });

    // Обработка сообщений с view_community_* (результат инлайн-запроса)
    bot.on('message', async (msg) => {
        if (!msg.text) return;
        const text = msg.text;
        if (text.startsWith('view_community_')) {
            const communityId = text.replace('view_community_', '');
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            const user = await utils.getUserByTelegramId(userId);
            if (!user || user.status !== 'approved') return;

            const session = sessions.get(chatId) || {};
            // Передаём session.lastMessageId для удаления предыдущего сообщения бота (главное меню)
            const sentMsg = await sendCommunityDetail(bot, chatId, communityId, 'all', session.lastMessageId, sessions);
            sessions.set(chatId, { ...session, lastMessageId: sentMsg.message_id });
            // Удаляем сообщение пользователя (инлайн-результат)
            await bot.deleteMessage(chatId, msg.message_id).catch(() => {});
        }
    });
};

module.exports.sendCommunityMainMenu = sendCommunityMainMenu;