const TelegramBot = require('node-telegram-bot-api');

const token = '8589206913:AAHTr6cLMjzd4nJ4ig4q77rs45g1ed5_a-M';
const bot = new TelegramBot(token, { polling: true });

const CHANNEL_USERNAME = '@ddsoetest';
const CAPTCHA_TEXT = 'RE3MS';

// File ID изображений
const WELCOME_IMAGE_ID = 'AgACAgIAAxkBAAMOaZwbstKPAAG4SZYQubDOxu-YKRRSAAKFFmsbqsThSNjpjlXR9l9IAQADAgADeQADOgQ';
const CAPTCHA_IMAGE_ID = 'AgACAgIAAxkBAAMbaZwgYpEBXtguK4RcMM9BekNYaKcAArMWaxuqxOFI1WgHNDzOESQBAAMCAAN4AAM6BA';
const SURVEY_IMAGE_ID = 'AgACAgIAAxkBAAMQaZwcqQIS5MMNxawH5w9Dl_YQ5n0AApAWaxuqxOFInK1dd-Ps0sUBAAMCAAN5AAM6BA';
const MENU_IMAGE_ID = 'AgACAgIAAxkBAAMCaZjbO9pqi5Gb_nbILBhXmH-Dw34AAu0aaxtm08hIbxnl16NextIBAAMCAAN5AAM6BA';

const userSessions = new Map(); // key: chatId, value: { state, experience, source, lastMessageId }

// ------------------- Вспомогательные функции -------------------

async function isSubscribed(chatId, userId) {
    try {
        const chatMember = await bot.getChatMember(CHANNEL_USERNAME, userId);
        const status = chatMember.status;
        return status === 'member' || status === 'administrator' || status === 'creator';
    } catch (error) {
        console.error('Ошибка проверки подписки:', error);
        return false;
    }
}

async function sendPhotoWithKeyboard(chatId, photoId, text, keyboard) {
    return await bot.sendPhoto(chatId, photoId, {
        caption: text,
        parse_mode: 'HTML',
        reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined
    });
}

async function deleteMessageSafe(chatId, messageId) {
    try {
        await bot.deleteMessage(chatId, messageId);
    } catch (e) {
        console.log('Не удалось удалить сообщение', e.message);
    }
}

// Отправляет новое сообщение и удаляет старое (если указано)
async function sendNewAndDeleteOld(chatId, photoId, text, keyboard, oldMessageId = null) {
    const newMsg = await sendPhotoWithKeyboard(chatId, photoId, text, keyboard);
    if (oldMessageId) {
        await deleteMessageSafe(chatId, oldMessageId);
    }
    return newMsg;
}

// ------------------- Обработчики -------------------

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const session = userSessions.get(chatId);

    // Если пользователь уже завершил регистрацию – показываем меню с кнопками
    if (session && session.state === 'finished') {
        // Удаляем предыдущее сообщение (финальное)
        if (session.lastMessageId) {
            await deleteMessageSafe(chatId, session.lastMessageId);
        }
        // Отправляем фото с inline-клавиатурой (без подписи)
        const sentMsg = await bot.sendPhoto(chatId, MENU_IMAGE_ID, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Профиль', callback_data: 'profile' }, { text: 'Биржа', callback_data: 'exchange' }],
                    [{ text: 'Настройки', callback_data: 'settings' }, { text: 'Агентство', callback_data: 'agency' }],
                    [{ text: 'Информация', callback_data: 'info' }, { text: 'Фидбек', callback_data: 'feedback' }],
                    [{ text: 'Наставничество', callback_data: 'mentoring' }, { text: 'Комьюнити', callback_data: 'community' }],
                    [{ text: 'Лучшие воркеры', callback_data: 'top_workers' }]
                ]
            }
        });
        // Обновляем lastMessageId (чтобы можно было удалить при следующем старте)
        session.lastMessageId = sentMsg.message_id;
        userSessions.set(chatId, session);
        return;
    }

    // Иначе – стандартный процесс регистрации
    // Удаляем предыдущее сообщение, если оно было
    if (session && session.lastMessageId) {
        await deleteMessageSafe(chatId, session.lastMessageId);
    }

    // Новая сессия
    userSessions.set(chatId, { state: 'start', experience: null, source: null, lastMessageId: null });

    const welcomeText = 'Добро пожаловать! Подпишитесь на канал ' + CHANNEL_USERNAME + ' и затем нажмите на кнопку ниже, чтобы начать регистрацию.';
    const keyboard = [[{ text: 'Продолжить', callback_data: 'continue' }]];

    const sentMsg = await sendPhotoWithKeyboard(chatId, WELCOME_IMAGE_ID, welcomeText, keyboard);
    const newSession = userSessions.get(chatId);
    newSession.lastMessageId = sentMsg.message_id;
    userSessions.set(chatId, newSession);
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const messageId = query.message.message_id;
    const data = query.data;

    let session = userSessions.get(chatId) || { state: 'start', experience: null, source: null, lastMessageId: messageId };

    // Обработка кнопок меню (после завершения регистрации)
    const menuButtons = ['profile', 'exchange', 'settings', 'agency', 'info', 'feedback', 'mentoring', 'community', 'top_workers'];
    if (menuButtons.includes(data)) {
        await bot.answerCallbackQuery(query.id);
        await bot.sendMessage(chatId, 'в разработке');
        return;
    }

    // Остальные callback'и (логика регистрации)
    if (data === 'continue') {
        const subscribed = await isSubscribed(chatId, userId);
        if (!subscribed) {
            await bot.answerCallbackQuery(query.id, {
                text: 'Для продолжения регистрации подпишитесь на канал. Если ссылка не работает напишите /start',
                show_alert: true
            });
            return;
        }

        const captchaText = 'Перед заполнением анкеты, пожалуйста, введите текст с изображения.';
        const captchaKeyboard = [[{ text: 'Назад', callback_data: 'back_to_start' }]];
        const sentMsg = await sendNewAndDeleteOld(chatId, CAPTCHA_IMAGE_ID, captchaText, captchaKeyboard, session.lastMessageId);

        session.state = 'captcha';
        session.lastMessageId = sentMsg.message_id;
        userSessions.set(chatId, session);

        await bot.answerCallbackQuery(query.id);
    }
    else if (data === 'back_to_start') {
        await deleteMessageSafe(chatId, messageId);
        await bot.answerCallbackQuery(query.id);
        bot.emit('text', { chat: { id: chatId }, from: { id: userId }, text: '/start' });
    }
    else if (data === 'change_experience') {
        const newText = 'Для регистрации вам нужно заполнить анкету ниже.\n\nКакой у вас опыт работы?';
        const keyboard = [[{ text: 'Назад', callback_data: 'back_to_start' }]];
        const sentMsg = await sendNewAndDeleteOld(chatId, SURVEY_IMAGE_ID, newText, keyboard, messageId);

        session.state = 'experience';
        session.experience = null;
        session.lastMessageId = sentMsg.message_id;
        userSessions.set(chatId, session);

        await bot.answerCallbackQuery(query.id);
    }
    else if (data === 'change_source') {
        const newText = `Для регистрации вам нужно заполнить анкету ниже.\n\nОпыт работы: ${session.experience}\nОткуда вы узнали о нас?`;
        const keyboard = [[{ text: 'Изменить опыт работы', callback_data: 'change_experience' }]];
        const sentMsg = await sendNewAndDeleteOld(chatId, SURVEY_IMAGE_ID, newText, keyboard, messageId);

        session.state = 'source';
        session.source = null;
        session.lastMessageId = sentMsg.message_id;
        userSessions.set(chatId, session);

        await bot.answerCallbackQuery(query.id);
    }
    else if (data === 'submit_application') {
        const finalText = 'Ваша заявка отправлена на рассмотрение. Ожидайте решения.';
        const sentMsg = await sendNewAndDeleteOld(chatId, SURVEY_IMAGE_ID, finalText, [], messageId);

        session.state = 'finished';
        session.lastMessageId = sentMsg.message_id;
        userSessions.set(chatId, session);

        await bot.answerCallbackQuery(query.id);
    }
});

bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const text = msg.text.trim();

    const session = userSessions.get(chatId);
    if (!session) return;

    // Если пользователь в состоянии finished – игнорируем любые текстовые сообщения
    if (session.state === 'finished') return;

    if (session.state === 'captcha') {
        if (text !== CAPTCHA_TEXT) {
            await bot.sendMessage(chatId, 'Неверный текст с картинки. Попробуйте ещё раз.');
            return;
        }

        const questionText = 'Для регистрации вам нужно заполнить анкету ниже.\n\nКакой у вас опыт работы?';
        const keyboard = [[{ text: 'Назад', callback_data: 'back_to_start' }]];
        const sentMsg = await sendNewAndDeleteOld(chatId, SURVEY_IMAGE_ID, questionText, keyboard, session.lastMessageId);

        session.state = 'experience';
        session.lastMessageId = sentMsg.message_id;
        userSessions.set(chatId, session);
    }
    else if (session.state === 'experience') {
        session.experience = text;

        const newText = `Для регистрации вам нужно заполнить анкету ниже.\n\nОпыт работы: ${text}\nОткуда вы узнали о нас?`;
        const keyboard = [[{ text: 'Изменить опыт работы', callback_data: 'change_experience' }]];
        const sentMsg = await sendNewAndDeleteOld(chatId, SURVEY_IMAGE_ID, newText, keyboard, session.lastMessageId);

        session.state = 'source';
        session.lastMessageId = sentMsg.message_id;
        userSessions.set(chatId, session);
    }
    else if (session.state === 'source') {
        session.source = text;

        const finalPreview = `ВАША ЗАЯВКА\n\nОпыт работы: ${session.experience}\nИсточник: ${text}`;
        const keyboard = [
            [{ text: 'Отправить заявку', callback_data: 'submit_application' }],
            [{ text: 'Изменить источник', callback_data: 'change_source' }]
        ];
        const sentMsg = await sendNewAndDeleteOld(chatId, SURVEY_IMAGE_ID, finalPreview, keyboard, session.lastMessageId);

        session.state = 'preview';
        session.lastMessageId = sentMsg.message_id;
        userSessions.set(chatId, session);
    }
});

bot.on('polling_error', (error) => {
    console.log('Polling error:', error);
});

console.log('Бот запущен...');