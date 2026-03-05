const TelegramBot = require('node-telegram-bot-api');
const config = require('./config/config');
const { User, Admin, Withdrawal, Notification, Feedback } = require('./db');
const utils = require('./utils');
const userBot = require('./userBotInstance');

const adminBot = new TelegramBot(config.ADMIN_BOT_TOKEN, { polling: true });
const adminSessions = new Map();

const USERS_PER_PAGE = 10;

// Вспомогательная функция для запуска процесса выплаты
async function startWithdrawalProcess(chatId, adminId, preFilledUserId = null) {
    console.log(`startWithdrawalProcess: chatId=${chatId}, adminId=${adminId}, preFilledUserId=${preFilledUserId}`);
    adminSessions.set(chatId, {
        state: 'awaiting_withdrawal_amount',
        adminId,
        preFilledUserId
    });
    await adminBot.sendMessage(chatId, 'Введите сумму для выплаты:');
}

async function checkAdmin(msg) {
    const admin = await Admin.findOne({ telegramId: msg.from.id });
    if (!admin && !config.ADMIN_IDS.includes(msg.from.id)) {
        await adminBot.sendMessage(msg.chat.id, 'У вас нет доступа к этому боту.');
        return false;
    }
    if (!admin && config.ADMIN_IDS.includes(msg.from.id)) {
        await new Admin({ telegramId: msg.from.id, username: msg.from.username }).save();
    }
    return true;
}

adminBot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    if (!await checkAdmin(msg)) return;

    await adminBot.sendMessage(chatId, 'Добро пожаловать, администратор! Используйте меню.', {
        reply_markup: {
            keyboard: [
                ['📋 Новые заявки'],
                ['📨 Личное сообщение'],
                ['👥 Список пользователей']
            ],
            resize_keyboard: true,
        },
    });
});

// Функция отображения списка пользователей
async function showUserList(chatId, page = 1, filter = {}) {
    const skip = (page - 1) * USERS_PER_PAGE;
    const query = filter;
    const totalUsers = await User.countDocuments(query);
    const users = await User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(USERS_PER_PAGE);

    let text = `Список пользователей (стр. ${page} из ${Math.ceil(totalUsers / USERS_PER_PAGE)}):\n\n`;
    const keyboard = [];

    for (const user of users) {
        const blockStatus = user.isBlocked ? 'заблокирован' : 'активен';
        text += `ID: ${user.telegramId}\n`;
        text += `Имя: ${user.firstName || '-'} ${user.lastName || ''}\n`;
        text += `Юзернейм: @${user.username || '-'}\n`;
        text += `Уровень: ${user.level} | Профитов: ${user.profitCount} | Выплат: ${user.payoutCount}\n`;
        text += `Статус: ${blockStatus}\n`;
        text += `---\n`;

        const displayName = user.firstName || user.telegramId;
        keyboard.push([
            { text: `👤 ${displayName}`, callback_data: `admin_user_${user.telegramId}` },
            { text: '💸 Выплата', callback_data: `admin_start_payout_${user.telegramId}` }
        ]);
    }

    const navButtons = [];
    if (page > 1) navButtons.push({ text: '⬅ Назад', callback_data: `admin_users_page_${page - 1}` });
    if (skip + USERS_PER_PAGE < totalUsers) navButtons.push({ text: 'Вперед ➡', callback_data: `admin_users_page_${page + 1}` });
    if (navButtons.length > 0) keyboard.push(navButtons);

    if (keyboard.length === 0) {
        await adminBot.sendMessage(chatId, text);
    } else {
        await adminBot.sendMessage(chatId, text, { reply_markup: { inline_keyboard: keyboard } });
    }
}

// Функция профиля пользователя
async function showUserProfile(chatId, userId) {
    const user = await User.findOne({ telegramId: userId });
    if (!user) {
        await adminBot.sendMessage(chatId, 'Пользователь не найден.');
        return;
    }

    const blockStatus = user.isBlocked ? 'заблокирован' : 'активен';
    const text = `Профиль пользователя @${user.username || '-'}\n\n` +
        `ID: ${user.telegramId}\n` +
        `Имя: ${user.firstName || '-'} ${user.lastName || ''}\n` +
        `Дата регистрации: ${user.createdAt.toLocaleDateString()}\n` +
        `Статус заявки: ${user.status}\n` +
        `Уровень: ${user.level}\n` +
        `Профитов: ${user.profitCount}\n` +
        `Выплат: ${user.payoutCount}\n` +
        `Статус блокировки: ${blockStatus}\n`;

    const keyboard = [
        [
            { text: 'Повысить уровень', callback_data: `admin_levelup_${user.telegramId}` },
            { text: 'Добавить профит', callback_data: `admin_addprofit_${user.telegramId}` }
        ],
        [
            { text: 'Добавить выплату', callback_data: `admin_start_payout_${user.telegramId}` },
            { text: user.isBlocked ? 'Разблокировать' : 'Заблокировать', callback_data: `admin_toggleblock_${user.telegramId}` }
        ],
        [
            { text: 'Обращения', callback_data: `admin_feedback_${user.telegramId}` },
            { text: 'Назад к списку', callback_data: 'admin_back_to_list' }
        ]
    ];

    await adminBot.sendMessage(chatId, text, { reply_markup: { inline_keyboard: keyboard } });
}

// Функция отображения обращений пользователя
async function showUserFeedback(chatId, userId) {
    const feedbacks = await Feedback.find({
        userId,
        status: { $in: ['new', 'in_progress'] }
    }).sort({ createdAt: -1 }).limit(10);
    if (feedbacks.length === 0) {
        await adminBot.sendMessage(chatId, 'У пользователя нет обращений.');
        return;
    }

    for (const fb of feedbacks) {
        let statusText;
        if (fb.status === 'new') statusText = 'новое';
        else if (fb.status === 'in_progress') statusText = 'в работе';
        else statusText = 'решено'; // для resolved, но здесь не должно быть
        const text = `Обращение #${fb._id.toString().slice(-6)}\n` +
            `Тема: ${fb.topic}\n` +
            `Сообщение: ${fb.message}\n` +
            `Статус: ${statusText}\n` +
            `Создано: ${fb.createdAt.toLocaleString()}\n` +
            (fb.adminResponse ? `Ответ: ${fb.adminResponse}` : '');

        // Клавиатура: Ответить, Отклонить, Закрыть (решено)
        const keyboard = [
            [
                { text: 'Ответить', callback_data: `admin_reply_fb_${fb._id}` },
                { text: 'Отклонить', callback_data: `admin_reject_fb_${fb._id}` }
            ],
            [
                { text: 'Закрыть (решено)', callback_data: `admin_resolve_fb_${fb._id}` }
            ],
            [{ text: 'Назад к профилю', callback_data: `admin_user_${userId}` }]
        ];

        await adminBot.sendMessage(chatId, text, { reply_markup: { inline_keyboard: keyboard } });
    }
}

adminBot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;
    const chatId = msg.chat.id;
    if (!await checkAdmin(msg)) return;

    const text = msg.text;
    const session = adminSessions.get(chatId);

    // === Команды главного меню ===
    if (text === '📋 Новые заявки') {
        const pendingUsers = await User.find({ status: 'pending' });
        if (pendingUsers.length === 0) {
            await adminBot.sendMessage(chatId, 'Нет новых заявок.');
            return;
        }
        for (const user of pendingUsers) {
            await adminBot.sendMessage(chatId,
                `Заявка от ${user.firstName || ''} (@${user.username || 'нет'})\nОпыт: ${user.experience || 'не указан'}\nИсточник: ${user.source || 'не указан'}`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Принять', callback_data: `approve_${user.telegramId}` }],
                            [{ text: 'Отклонить', callback_data: `reject_${user.telegramId}` }]
                        ]
                    }
                }
            );
        }
    }
    else if (text === '📨 Личное сообщение') {
        await adminBot.sendMessage(chatId, 'Введите Telegram ID пользователя:');
        adminSessions.set(chatId, { state: 'awaiting_pm_userid' });
    }
    else if (text === '👥 Список пользователей') {
        await showUserList(chatId, 1);
    }
    else {
        // === Обработка состояний ===
        if (!session) {
            await adminBot.sendMessage(chatId, 'Неизвестная команда.');
            return;
        }

        if (session.state === 'awaiting_withdrawal_amount') {
            const amount = parseFloat(text);
            if (isNaN(amount) || amount <= 0) {
                await adminBot.sendMessage(chatId, 'Некорректная сумма. Введите число.');
                return;
            }
            adminSessions.set(chatId, { ...session, state: 'awaiting_withdrawal_link', amount });
            await adminBot.sendMessage(chatId, 'Введите ссылку на чек (например, от CryptoBot):');
        }
        else if (session.state === 'awaiting_withdrawal_link') {
            const link = text.trim();
            if (!link.startsWith('http://') && !link.startsWith('https://')) {
                await adminBot.sendMessage(chatId, 'Некорректная ссылка. Введите ссылку, начинающуюся с http:// или https://');
                return;
            }

            const updatedSession = { ...session, state: 'awaiting_user_for_withdrawal', link };
            adminSessions.set(chatId, updatedSession);

            if (updatedSession.preFilledUserId) {
                const userId = updatedSession.preFilledUserId;
                const user = await User.findOne({ telegramId: userId });
                if (!user) {
                    await adminBot.sendMessage(chatId, 'Пользователь с таким ID не найден.');
                    adminSessions.delete(chatId);
                    return;
                }
                await completeWithdrawal(chatId, updatedSession, user);
            } else {
                await adminBot.sendMessage(chatId, 'Введите Telegram ID пользователя (число):');
            }
        }
        else if (session.state === 'awaiting_user_for_withdrawal') {
            const userId = parseInt(text);
            if (isNaN(userId)) {
                await adminBot.sendMessage(chatId, 'Некорректный ID. Введите число.');
                return;
            }
            const user = await User.findOne({ telegramId: userId });
            if (!user) {
                await adminBot.sendMessage(chatId, 'Пользователь не найден.');
                adminSessions.delete(chatId);
                return;
            }
            await completeWithdrawal(chatId, session, user);
        }
        else if (session.state === 'awaiting_pm_userid') {
            const userId = parseInt(text);
            if (isNaN(userId)) {
                await adminBot.sendMessage(chatId, 'Некорректный ID. Введите число.');
                return;
            }
            const user = await User.findOne({ telegramId: userId });
            if (!user) {
                await adminBot.sendMessage(chatId, 'Пользователь не найден.');
                adminSessions.delete(chatId);
                return;
            }
            adminSessions.set(chatId, { state: 'awaiting_pm_text', targetUserId: userId });
            await adminBot.sendMessage(chatId, 'Введите текст сообщения:');
        }
        else if (session.state === 'awaiting_pm_text') {
            const messageText = text;
            const targetUserId = session.targetUserId;
            try {
                await userBot.sendMessage(targetUserId, `📨 Сообщение от администратора:\n\n${messageText}`);
                await adminBot.sendMessage(chatId, 'Сообщение отправлено пользователю.');
            } catch (e) {
                await adminBot.sendMessage(chatId, `Не удалось отправить сообщение: ${e.message}`);
            }
            adminSessions.delete(chatId);
        }
        else if (session.state === 'awaiting_feedback_reply') {
            const feedback = await Feedback.findById(session.feedbackId);
            if (feedback) {
                feedback.adminResponse = text;
                feedback.status = 'in_progress';
                feedback.updatedAt = new Date();
                await feedback.save();
                try {
                    await userBot.sendMessage(session.userId, `📨 Ответ на ваше обращение:\n\n${text}`);
                    await adminBot.sendMessage(chatId, 'Ответ отправлен пользователю.');
                    // Удаляем сообщение, в котором админ вводил ответ
                    await adminBot.deleteMessage(chatId, msg.message_id).catch(() => {});
                    // Удаляем исходное сообщение с обращением
                    if (session.originalMessageId) {
                        await adminBot.deleteMessage(chatId, session.originalMessageId).catch(() => {});
                    }
                    // НЕ показываем профиль – просто завершаем
                } catch (e) {
                    await adminBot.sendMessage(chatId, `Не удалось отправить ответ: ${e.message}`);
                }
            }
            adminSessions.delete(chatId);
        }
        else {
            await adminBot.sendMessage(chatId, 'Неизвестная команда.');
        }
    }
});

// Вспомогательная функция завершения выплаты
async function completeWithdrawal(chatId, session, user) {
    if (!user || !user.telegramId) {
        await adminBot.sendMessage(chatId, 'Ошибка: данные пользователя не найдены.');
        adminSessions.delete(chatId);
        return;
    }
    if (!session.link || typeof session.link !== 'string' || session.link.trim() === '') {
        await adminBot.sendMessage(chatId, 'Ошибка: ссылка на чек отсутствует или пуста.');
        adminSessions.delete(chatId);
        return;
    }

    const link = session.link.trim();
    if (!link.startsWith('http://') && !link.startsWith('https://')) {
        await adminBot.sendMessage(chatId, 'Ошибка: ссылка должна начинаться с http:// или https://');
        adminSessions.delete(chatId);
        return;
    }

    const withdrawal = new Withdrawal({
        userId: user._id,
        amount: session.amount,
        link: link,
        status: 'pending'
    });
    await withdrawal.save();

    try {
        const sentMsg = await userBot.sendMessage(user.telegramId,
            `🧾 Выплата вывода баланса: ${session.amount}\nНажмите на кнопку, чтобы перейти к чеку!`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '💰 Получить выплату', url: link }]
                    ]
                }
            }
        );
        withdrawal.messageId = sentMsg.message_id;
        await withdrawal.save();
        await adminBot.sendMessage(chatId, 'Сообщение с ссылкой на чек отправлено пользователю.');
    } catch (e) {
        console.error('Ошибка отправки выплаты:', e.message);
        await adminBot.sendMessage(chatId, `Не удалось отправить пользователю: ${e.message}`);
    }
    adminSessions.delete(chatId);
}

adminBot.on('callback_query', async (query) => {
    try {
        const chatId = query.message.chat.id;
        const data = query.data;

        if (!await checkAdmin({ from: { id: query.from.id }, chat: { id: chatId } })) return;

        // === Обработка callback'ов ===
        if (data.startsWith('admin_users_page_')) {
            const page = parseInt(data.split('_')[3]);
            await adminBot.deleteMessage(chatId, query.message.message_id);
            await showUserList(chatId, page);
            await adminBot.answerCallbackQuery(query.id);
        }
        else if (data.startsWith('admin_user_')) {
            const userId = parseInt(data.split('_')[2]);
            await adminBot.deleteMessage(chatId, query.message.message_id);
            await showUserProfile(chatId, userId);
            await adminBot.answerCallbackQuery(query.id);
        }
        else if (data === 'admin_back_to_list') {
            await adminBot.deleteMessage(chatId, query.message.message_id);
            await showUserList(chatId, 1);
            await adminBot.answerCallbackQuery(query.id);
        }
        else if (data.startsWith('admin_levelup_')) {
            const userId = parseInt(data.split('_')[2]);
            const user = await User.findOne({ telegramId: userId });
            if (user) {
                user.level += 1;
                await user.save();
                await adminBot.answerCallbackQuery(query.id, { text: 'Уровень повышен' });
                await adminBot.deleteMessage(chatId, query.message.message_id);
                await showUserProfile(chatId, userId);
            } else {
                await adminBot.answerCallbackQuery(query.id, { text: 'Ошибка' });
            }
        }
        else if (data.startsWith('admin_addprofit_')) {
            const userId = parseInt(data.split('_')[2]);
            const user = await User.findOne({ telegramId: userId });
            if (user) {
                user.profitCount += 1;
                await user.save();
                await adminBot.answerCallbackQuery(query.id, { text: 'Профит добавлен' });
                await adminBot.deleteMessage(chatId, query.message.message_id);
                await showUserProfile(chatId, userId);
            } else {
                await adminBot.answerCallbackQuery(query.id, { text: 'Ошибка' });
            }
        }
        else if (data.startsWith('admin_start_payout_')) {
            const userId = parseInt(data.split('_')[3]);
            await adminBot.deleteMessage(chatId, query.message.message_id);
            await startWithdrawalProcess(chatId, query.from.id, userId);
            await adminBot.answerCallbackQuery(query.id);
        }
        else if (data.startsWith('admin_toggleblock_')) {
            const userId = parseInt(data.split('_')[2]);
            const user = await User.findOne({ telegramId: userId });
            if (user) {
                user.isBlocked = !user.isBlocked;
                await user.save();
                await adminBot.answerCallbackQuery(query.id, { text: user.isBlocked ? 'Пользователь заблокирован' : 'Пользователь разблокирован' });
                await adminBot.deleteMessage(chatId, query.message.message_id);
                await showUserProfile(chatId, userId);
            } else {
                await adminBot.answerCallbackQuery(query.id, { text: 'Ошибка' });
            }
        }
        else if (data.startsWith('admin_feedback_')) {
            const userId = parseInt(data.split('_')[2]);
            await adminBot.deleteMessage(chatId, query.message.message_id);
            await showUserFeedback(chatId, userId);
            await adminBot.answerCallbackQuery(query.id);
        }
        else if (data.startsWith('admin_reply_fb_')) {
            const fbId = data.split('_')[3];
            const feedback = await Feedback.findById(fbId);
            if (feedback) {
                // Сохраняем ID исходного сообщения, чтобы удалить его после ответа
                const originalMessageId = query.message.message_id;
                adminSessions.set(chatId, {
                    state: 'awaiting_feedback_reply',
                    feedbackId: fbId,
                    userId: feedback.userId,
                    originalMessageId: originalMessageId
                });
                await adminBot.sendMessage(chatId, 'Введите текст ответа пользователю:');
                await adminBot.answerCallbackQuery(query.id);
            } else {
                await adminBot.answerCallbackQuery(query.id, { text: 'Ошибка' });
            }
        }
        else if (data.startsWith('admin_reject_fb_')) {
            const fbId = data.split('_')[3];
            const feedback = await Feedback.findById(fbId);
            if (feedback) {
                try {
                    await userBot.sendMessage(feedback.userId, 'Ваша заявка на обращение была отклонена администрацией.');
                } catch (e) {
                    console.error('Не удалось отправить уведомление', e.message);
                }
                feedback.status = 'rejected';
                feedback.updatedAt = new Date();
                await feedback.save();
                await adminBot.answerCallbackQuery(query.id, { text: 'Обращение отклонено, уведомление отправлено' });
                // Удаляем текущее сообщение с обращением
                await adminBot.deleteMessage(chatId, query.message.message_id).catch(() => {});
                // НЕ показываем профиль – просто завершаем
            } else {
                await adminBot.answerCallbackQuery(query.id, { text: 'Ошибка' });
            }
        }
        else if (data.startsWith('admin_resolve_fb_')) {
            const fbId = data.split('_')[3];
            const feedback = await Feedback.findById(fbId);
            if (feedback) {
                try {
                    await userBot.sendMessage(feedback.userId, 'Ваше обращение отмечено как решённое.');
                } catch (e) {
                    console.error('Не удалось отправить уведомление', e.message);
                }
                feedback.status = 'resolved';
                feedback.updatedAt = new Date();
                await feedback.save();
                await adminBot.answerCallbackQuery(query.id, { text: 'Обращение отмечено как решённое' });
                // Удаляем текущее сообщение с обращением
                await adminBot.deleteMessage(chatId, query.message.message_id).catch(() => {});
                // НЕ показываем профиль – просто завершаем
            } else {
                await adminBot.answerCallbackQuery(query.id, { text: 'Ошибка' });
            }
        }
        else if (data.startsWith('approve_')) {
            const userId = parseInt(data.split('_')[1]);
            const user = await User.findOne({ telegramId: userId });
            if (!user) {
                await adminBot.answerCallbackQuery(query.id, { text: 'Пользователь не найден' });
                return;
            }
            if (user.status !== 'pending') {
                await adminBot.answerCallbackQuery(query.id, { text: 'Заявка уже обработана' });
                return;
            }
            const workerNumber = await utils.getNextWorkerNumber();
            user.status = 'approved';
            user.workerNumber = workerNumber;
            user.approvedAt = new Date();
            await user.save();

            try {
                await userBot.sendMessage(user.telegramId, 'Ваша заявка одобрена! Теперь вы можете пользоваться ботом. Напишите /start');
            } catch (e) {
                console.error('Не удалось отправить уведомление пользователю', e.message);
            }

            await adminBot.answerCallbackQuery(query.id, { text: 'Заявка принята' });
            await adminBot.editMessageReplyMarkup({ inline_keyboard: [] }, {
                chat_id: chatId,
                message_id: query.message.message_id,
            });
        }
        else if (data.startsWith('reject_')) {
            const userId = parseInt(data.split('_')[1]);
            const user = await User.findOne({ telegramId: userId });
            if (!user) {
                await adminBot.answerCallbackQuery(query.id, { text: 'Пользователь не найден' });
                return;
            }
            if (user.status !== 'pending') {
                await adminBot.answerCallbackQuery(query.id, { text: 'Заявка уже обработана' });
                return;
            }
            user.status = 'rejected';
            user.rejectedAt = new Date();
            await user.save();

            try {
                await userBot.sendMessage(user.telegramId, 'Ваша заявка на вступление была отклонена.');
            } catch (e) {}

            await adminBot.answerCallbackQuery(query.id, { text: 'Заявка отклонена' });
            await adminBot.editMessageReplyMarkup({ inline_keyboard: [] }, {
                chat_id: chatId,
                message_id: query.message.message_id,
            });
        }
    } catch (err) {
        console.error('Callback error:', err);
        await adminBot.answerCallbackQuery(query.id, { text: 'Ошибка' }).catch(() => {});
    }
});

// Периодические проверки уведомлений (исправленный блок)
setInterval(async () => {
    try {
        const notifications = await Notification.find({ isSent: false });
        for (const notif of notifications) {
            let keyboard;
            // Проверяем тип уведомления
            if (notif.data && notif.data.type === 'feedback') {
                keyboard = [
                    [{ text: 'Ответить', callback_data: `admin_reply_fb_${notif.data.feedbackId}` }],
                    [{ text: 'Отклонить', callback_data: `admin_reject_fb_${notif.data.feedbackId}` }]
                ];
            } else {
                // Обычная заявка на вступление
                keyboard = [
                    [{ text: 'Принять', callback_data: `approve_${notif.userId}` }],
                    [{ text: 'Отклонить', callback_data: `reject_${notif.userId}` }]
                ];
            }
            try {
                await adminBot.sendMessage(notif.adminId, notif.text, {
                    reply_markup: { inline_keyboard: keyboard }
                });
                notif.isSent = true;
                await notif.save();
            } catch (e) {
                console.error(`Ошибка отправки уведомления админу ${notif.adminId}:`, e.message);
            }
        }
    } catch (err) {
        console.error('Ошибка при проверке уведомлений:', err);
    }
}, 3000);

setInterval(async () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await Notification.deleteMany({ createdAt: { $lt: weekAgo } });
}, 24 * 60 * 60 * 1000);

adminBot.on('polling_error', console.log);

console.log('Admin bot started...');