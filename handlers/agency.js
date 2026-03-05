const utils = require('../utils');
const config = require('../config/config');
const { User, AgencyClient, Model } = require('../db');
const {
    sendAgencySettingsMenu,
    sendDisplayedModelsMenu,
    sendInfoTextLanguageMenu,
    sendInfoTextEditMenu,
    sendMaxCitiesMenu,
    sendDiscountSystemMenu,
    sendDiscountPercentRequest,
    sendDiscountTariffsMenu,
    sendReviewsMenu,
    sendReviewsLinkRequest,
    sendModelForEdit,
    sendTariffList,
    askNewTariffPrice,
    handleTariffPriceInput,
    handleModelsInlineQuery,
    handleSelectModelsInlineQuery,
    displaySettings,
    customInfoTexts,
    maxCitiesSettings,
    discountSettings,
    modelContactEnabled,
    customReviewsLink,
    DEFAULT_REVIEWS_LINK
} = require('./agencySettings');

const AGENCY_IMAGE_ID = 'AgACAgIAAxkBAAMcaaXIAAG2flJ8oVdVR_zI4vpQDqJWAAIVEmsb15kxSco2VRk80u63AQADAgADeQADOgQ';

async function sendAgencyMainMenu(bot, chatId, agentId, sessions) {
    const session = sessions.get(chatId) || {};
    const oldMessageId = session.lastMessageId; // запоминаем предыдущее сообщение

    const clientsCount = await AgencyClient.countDocuments({ invitedBy: agentId });

    const text = `▎Агентство: SkyGirls

БОТ: @esctesttttbot
ТП: @test28282ajajja_bot`;

    const keyboard = [
        [
            { text: `Клиенты (${clientsCount})`, switch_inline_query_current_chat: 'clients?search=' },
            { text: 'Мои боты', switch_inline_query_current_chat: 'my_bots' }
        ],
        [
            { text: 'Настройки', callback_data: 'agency_settings' },
            { text: 'Рассылка', switch_inline_query_current_chat: 'mailing' }
        ],
        [
            { text: '◀️ Назад', callback_data: 'back_to_menu' }
        ]
    ];

    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, AGENCY_IMAGE_ID, text, keyboard);

    // Удаляем предыдущее сообщение, если оно есть
    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }

    session.lastMessageId = sentMsg.message_id; // обновляем единое поле lastMessageId
    session.agencyMenuId = sentMsg.message_id;  // для совместимости
    sessions.set(chatId, session);
    return sentMsg;
}

function setupInlineHandlers(bot, sessions) {
    bot.on('inline_query', async (msg) => {
        const inlineQueryId = msg.id;
        const queryText = msg.query;
        const userId = msg.from.id;

        console.log(`🔍 Инлайн-запрос от ${userId}: "${queryText}"`);

        if (queryText === 'agency_models' || queryText.startsWith('agency_models ')) {
            await handleModelsInlineQuery(bot, inlineQueryId, queryText);
            return;
        }

        if (queryText === 'select_models' || queryText.startsWith('select_models ')) {
            await handleSelectModelsInlineQuery(bot, inlineQueryId, queryText, userId);
            return;
        }

        let results = [];

        if (queryText.startsWith('clients?search=')) {
            const clients = await AgencyClient.find({ invitedBy: userId }).sort({ registeredAt: -1 }).limit(20);

            for (const client of clients) {
                const user = await User.findOne({ telegramId: client.userId });
                const username = user?.username || 'нет';
                const firstName = user?.firstName || 'Без имени';
                const registered = client.registeredAt ? client.registeredAt.toLocaleDateString('ru-RU') : 'неизвестно';
                const balance = client.balance || 0;
                const currency = client.currency || 'RUB';
                const displayName = client.customName || firstName;

                const title = `${displayName} (@${username})`;
                const description = `ID: ${client.userId} | Баланс: ${balance} ${currency} | Регистрация: ${registered}`;

                results.push({
                    type: 'article',
                    id: `client_${client.userId}`,
                    title: title,
                    description: description,
                    input_message_content: {
                        message_text: `/client_profile_${client.userId}`,
                        parse_mode: 'HTML'
                    }
                });
            }

            results.push({
                type: 'article',
                id: 'add_client',
                title: '➕ Привязать нового клиента',
                description: 'Вручную привязать аккаунт клиента',
                thumb_url: 'https://png.pngtree.com/png-vector/20190411/ourmid/pngtree-vector-plus-icon-png-image_925439.jpg',
                input_message_content: {
                    message_text: '/attach_client',
                    parse_mode: 'HTML'
                },
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Отменить', callback_data: 'agency_cancel_attach' }]
                    ]
                }
            });

        } else if (queryText === 'my_bots') {
            results.push({
                type: 'article',
                id: 'my_bots_info',
                title: 'Недостаточно прав',
                description: 'У вас недостаточно прав, для создания собственного зеркала!',
                input_message_content: {
                    message_text: '/mybots',
                    parse_mode: 'HTML'
                }
            });

        } else if (queryText === 'mailing') {
            results.push({
                type: 'article',
                id: 'mailing',
                title: 'Начать рассылку',
                description: 'Нажмите сюда, чтобы начать рассылку сообщений по клиентам.',
                input_message_content: {
                    message_text: 'Рассылка (в разработке)',
                    parse_mode: 'HTML'
                }
            });
        }

        if (results.length === 0) {
            results.push({
                type: 'article',
                id: 'default',
                title: 'Доступные разделы',
                description: 'Клиенты, Мои боты, Настройки, Рассылка',
                input_message_content: {
                    message_text: 'Выберите раздел в главном меню',
                    parse_mode: 'HTML'
                }
            });
        }

        await bot.answerInlineQuery(inlineQueryId, results, { cache_time: 0, is_personal: true });
    });
}

function setupMessageHandlers(bot, sessions) {
    // Обработка команды начала привязки
    bot.onText(/\/attach_client/, async (msg) => {
        const chatId = msg.chat.id;
        const session = sessions.get(chatId) || {};
        session.state = 'awaiting_client_attach';
        sessions.set(chatId, session);
        await bot.sendMessage(chatId, '✏️ Введите ID или username клиента:');
    });

    bot.onText(/\/mybots/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        await bot.deleteMessage(chatId, msg.message_id).catch(() => {});

        const user = await utils.getUserByTelegramId(userId);
        if (!user || user.status !== 'approved') return;

        await sendAgencyMainMenu(bot, chatId, userId, sessions);
    });

    bot.onText(/\/edit_model_(.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const modelId = match[1];
        const model = await Model.findById(modelId);

        if (!model) {
            return bot.sendMessage(chatId, 'Модель не найдена');
        }

        await bot.deleteMessage(chatId, msg.message_id).catch(() => {});

        const session = sessions.get(chatId) || {};
        await sendModelForEdit(bot, chatId, model, session, sessions);
    });

    bot.onText(/\/select_model_(.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const modelId = match[1];
        const userId = msg.from.id;

        const model = await Model.findById(modelId);
        if (!model) {
            return bot.sendMessage(chatId, 'Модель не найдена');
        }

        await bot.deleteMessage(chatId, msg.message_id).catch(() => {});

        const { displaySettings, sendDisplayedModelsMenu } = require('./agencySettings');
        if (!displaySettings[userId]) {
            displaySettings[userId] = { mode: 'selected', selectedModels: [] };
        }

        const modelIdStr = modelId.toString();
        const index = displaySettings[userId].selectedModels.indexOf(modelIdStr);
        let resultMessage;

        if (index === -1) {
            displaySettings[userId].selectedModels.push(modelIdStr);
            resultMessage = await bot.sendMessage(chatId, `✅ Модель "${model.name}" добавлена в отображаемые`);
        } else {
            displaySettings[userId].selectedModels.splice(index, 1);
            resultMessage = await bot.sendMessage(chatId, `❌ Модель "${model.name}" удалена из отображаемых`);
        }

        setTimeout(async () => {
            try {
                await bot.deleteMessage(chatId, resultMessage.message_id);
            } catch (e) {}

            const session = sessions.get(chatId) || {};
            await sendDisplayedModelsMenu(bot, chatId, userId, sessions);
        }, 1500);
    });

    // Обработка всех входящих сообщений
    bot.on('message', async (msg) => {
        if (!msg.text || msg.text.startsWith('/')) return;

        const chatId = msg.chat.id;
        const text = msg.text.trim();
        const agentId = msg.from.id;

        const session = sessions.get(chatId);

        // ===== РЕДАКТИРОВАНИЕ ТАРИФА =====
        if (session && session.editTariff) {
            console.log('🔍 Обнаружено редактирование тарифа');
            const newPrice = await handleTariffPriceInput(bot, msg, session, sessions);

            if (newPrice === false) return;

            if (newPrice) {
                const { modelId, hours } = session.editTariff;
                console.log(`💰 Сохраняем цену ${newPrice} для модели ${modelId}, час ${hours}`);

                const model = await Model.findById(modelId);
                if (!model) {
                    await bot.sendMessage(chatId, '❌ Модель не найдена');
                    session.editTariff = null;
                    sessions.set(chatId, session);
                    return;
                }

                model.tariffs[hours] = newPrice;
                await model.save();
                console.log('✅ Цена сохранена в БД');

                const successMsg = await bot.sendMessage(chatId, `✅ Тариф ${hours} час для модели ${model.name} изменён на ${newPrice.toLocaleString()}₽`);

                setTimeout(async () => {
                    try { await bot.deleteMessage(chatId, successMsg.message_id); } catch (e) {}
                }, 1500);

                session.editTariff = null;
                sessions.set(chatId, session);

                await sendTariffList(bot, chatId, model, session, sessions);
            }
            return;
        }

        // ===== РЕДАКТИРОВАНИЕ ТЕКСТА ИНФОРМАЦИИ =====
        if (session && session.state === 'awaiting_info_text') {
            console.log('📝 Получен новый текст информации');

            if (text.length > 512) {
                const errorMsg = await bot.sendMessage(chatId, '❌ Текст слишком длинный. Максимум 512 символов.');
                setTimeout(() => bot.deleteMessage(chatId, errorMsg.message_id).catch(() => {}), 3000);
                return;
            }

            customInfoTexts[agentId] = text;

            const confirmMsg = await bot.sendMessage(chatId, '✅ Текст сохранён');
            setTimeout(() => bot.deleteMessage(chatId, confirmMsg.message_id).catch(() => {}), 1500);

            session.state = null;
            sessions.set(chatId, session);
            await sendInfoTextEditMenu(bot, chatId, agentId, sessions, true);
            return;
        }

        // ===== РЕДАКТИРОВАНИЕ МАКСИМАЛЬНОГО КОЛИЧЕСТВА ГОРОДОВ =====
        if (session && session.state === 'awaiting_max_cities') {
            console.log('🏙️ Получено новое количество городов');

            const numericRegex = /^\d+$/;
            if (!numericRegex.test(text)) {
                const errorMsg = await bot.sendMessage(chatId, '❌ Введите корректное число (только цифры).');
                setTimeout(() => bot.deleteMessage(chatId, errorMsg.message_id).catch(() => {}), 3000);
                return;
            }

            const newMax = parseInt(text);
            if (newMax < 1 || newMax > 10) {
                const errorMsg = await bot.sendMessage(chatId, '❌ Количество городов должно быть от 1 до 10.');
                setTimeout(() => bot.deleteMessage(chatId, errorMsg.message_id).catch(() => {}), 3000);
                return;
            }

            maxCitiesSettings[agentId] = newMax;

            const confirmMsg = await bot.sendMessage(chatId, `✅ Максимальное количество городов изменено на ${newMax}`);
            setTimeout(() => bot.deleteMessage(chatId, confirmMsg.message_id).catch(() => {}), 1500);

            session.state = null;
            sessions.set(chatId, session);
            await sendMaxCitiesMenu(bot, chatId, agentId, sessions);
            return;
        }

        // ===== РЕДАКТИРОВАНИЕ ПРОЦЕНТА СКИДКИ =====
        if (session && session.state === 'awaiting_discount_percent') {
            console.log('💰 Получен процент скидки');

            const numericRegex = /^\d+$/;
            if (!numericRegex.test(text)) {
                const errorMsg = await bot.sendMessage(chatId, '❌ Введите корректное число (только цифры).');
                setTimeout(() => bot.deleteMessage(chatId, errorMsg.message_id).catch(() => {}), 3000);
                return;
            }

            const percent = parseInt(text);
            if (percent < 0 || percent > 100) {
                const errorMsg = await bot.sendMessage(chatId, '❌ Процент должен быть от 0 до 100.');
                setTimeout(() => bot.deleteMessage(chatId, errorMsg.message_id).catch(() => {}), 3000);
                return;
            }

            if (!discountSettings[agentId]) {
                discountSettings[agentId] = { enabled: true, percent, tariffs: {} };
            } else {
                discountSettings[agentId].enabled = true;
                discountSettings[agentId].percent = percent;
            }

            const confirmMsg = await bot.sendMessage(chatId, `✅ Процент скидки установлен: ${percent}%`);
            setTimeout(() => bot.deleteMessage(chatId, confirmMsg.message_id).catch(() => {}), 1500);

            session.state = null;
            sessions.set(chatId, session);
            await sendDiscountSystemMenu(bot, chatId, agentId, sessions);
            return;
        }

        // ===== РЕДАКТИРОВАНИЕ ССЫЛКИ НА ОТЗЫВЫ =====
        if (session && session.state === 'awaiting_reviews_link') {
            console.log('🔗 Получена новая ссылка на отзывы');

            if (!text.match(/^(https?:\/\/|t\.me\/)/i)) {
                const errorMsg = await bot.sendMessage(chatId, '❌ Введите корректную ссылку (должна начинаться с http://, https:// или t.me/)');
                setTimeout(() => bot.deleteMessage(chatId, errorMsg.message_id).catch(() => {}), 3000);
                return;
            }

            customReviewsLink[agentId] = text;

            const confirmMsg = await bot.sendMessage(chatId, '✅ Ссылка сохранена');
            setTimeout(() => bot.deleteMessage(chatId, confirmMsg.message_id).catch(() => {}), 1500);

            session.state = null;
            sessions.set(chatId, session);
            await sendReviewsMenu(bot, chatId, agentId, sessions);
            return;
        }

        // ===== ПРИВЯЗКА КЛИЕНТА =====
        if (!session || session.state !== 'awaiting_client_attach') {
            return;
        }

        await bot.deleteMessage(chatId, msg.message_id).catch(() => {});

        const input = text;
        let client = null;
        let userData = null;

        if (!isNaN(input) && Number.isInteger(parseInt(input))) {
            client = await AgencyClient.findOne({ userId: parseInt(input) });
            userData = await User.findOne({ telegramId: parseInt(input) });
        } else {
            const username = input.replace('@', '');
            client = await AgencyClient.findOne({ username: username });
            userData = await User.findOne({ username: username });
        }

        if (!client) {
            if (userData) {
                client = new AgencyClient({
                    userId: userData.telegramId,
                    username: userData.username,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    city: userData.city || 'Не указан',
                    invitedBy: agentId,
                });
                await client.save();
            } else {
                client = new AgencyClient({
                    userId: parseInt(input),
                    username: null,
                    firstName: null,
                    lastName: null,
                    city: 'Не указан',
                    invitedBy: agentId,
                });
                await client.save();
            }
        } else {
            if (client.invitedBy) {
                if (client.invitedBy === agentId) {
                    await bot.sendMessage(chatId, '⚠️ Этот клиент уже привязан к вам.');
                } else {
                    await bot.sendMessage(chatId, '⚠️ Этот клиент уже привязан к другому воркеру.');
                }
                session.state = null;
                sessions.set(chatId, session);
                return;
            }
            client.invitedBy = agentId;
            if (userData) {
                client.username = userData.username || client.username;
                client.firstName = userData.firstName || client.firstName;
                client.lastName = userData.lastName || client.lastName;
                client.city = userData.city || client.city;
            }
            await client.save();
        }

        const botUsername = bot.options.username;
        const profileLink = `tg://resolve?domain=${botUsername}&start=binding_${client.userId}`;
        const contactLink = client.username ? `https://t.me/${client.username}` : `tg://user?id=${client.userId}`;
        const displayName = client.customName || client.firstName || 'Без имени';

        const message = `💝 SkyGirls\n\n` +
            `Клиент: <a href="${profileLink}">${displayName}</a>\n` +
            `ID: ${client.userId} <a href="${contactLink}">Контакт</a>\n` +
            `Город: ${client.city || 'Не указан'}\n\n` +
            `✅ Новая привязка.`;

        const sentMsg = await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });

        session.lastAgencyNotificationId = sentMsg.message_id;
        session.state = null;
        sessions.set(chatId, session);
    });
}

function setupCallbackHandlers(bot, sessions) {
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const data = query.data;
        const messageId = query.message.message_id;
        let session = sessions.get(chatId) || {};

        console.log(`🔄 Callback: "${data}" от ${chatId}`);

        await bot.answerCallbackQuery(query.id).catch(() => {});

        // Сначала удаляем текущее сообщение (кнопки)
        await utils.deleteMessageSafe(bot, chatId, messageId);

        // Затем обрабатываем навигацию
        if (data === 'agency_cancel_attach') {
            // уже удалили, ничего не делаем
        } else if (data === 'agency_settings') {
            await sendAgencySettingsMenu(bot, chatId, sessions);
        } else if (data === 'agency_back_to_main') {
            const userId = query.from.id;
            await sendAgencyMainMenu(bot, chatId, userId, sessions);
        } else if (data === 'agency_displayed_models') {
            const userId = query.from.id;
            await sendDisplayedModelsMenu(bot, chatId, userId, sessions);
        } else if (data === 'display_mode_cycle') {
            const userId = query.from.id;
            const { displaySettings, sendDisplayedModelsMenu } = require('./agencySettings');
            const modes = ['all', 'custom', 'selected', 'standard'];
            const currentMode = displaySettings[userId]?.mode || 'all';
            const currentIndex = modes.indexOf(currentMode);
            const nextMode = modes[(currentIndex + 1) % modes.length];
            if (!displaySettings[userId]) {
                displaySettings[userId] = { mode: nextMode, selectedModels: [] };
            } else {
                displaySettings[userId].mode = nextMode;
            }
            await sendDisplayedModelsMenu(bot, chatId, userId, sessions);
        } else if (data === 'agency_info_text') {
            await sendInfoTextLanguageMenu(bot, chatId, sessions);
        } else if (data === 'info_text_lang_ru') {
            const userId = query.from.id;
            await sendInfoTextEditMenu(bot, chatId, userId, sessions, true);
        } else if (data === 'info_text_reset') {
            const userId = query.from.id;
            delete customInfoTexts[userId];
            await sendInfoTextEditMenu(bot, chatId, userId, sessions, true);
        } else if (data === 'agency_max_cities') {
            const userId = query.from.id;
            session.state = 'awaiting_max_cities';
            sessions.set(chatId, session);
            await sendMaxCitiesMenu(bot, chatId, userId, sessions);
        } else if (data === 'max_cities_reset') {
            const userId = query.from.id;
            delete maxCitiesSettings[userId];
            await sendMaxCitiesMenu(bot, chatId, userId, sessions);
        } else if (data === 'agency_discount_system') {
            const userId = query.from.id;
            await sendDiscountSystemMenu(bot, chatId, userId, sessions);
        } else if (data === 'discount_enable') {
            const userId = query.from.id;
            session.state = 'awaiting_discount_percent';
            sessions.set(chatId, session);
            await sendDiscountPercentRequest(bot, chatId, userId, sessions);
        } else if (data === 'discount_change_percent') {
            const userId = query.from.id;
            session.state = 'awaiting_discount_percent';
            sessions.set(chatId, session);
            await sendDiscountPercentRequest(bot, chatId, userId, sessions);
        } else if (data === 'discount_tariffs') {
            const userId = query.from.id;
            await sendDiscountTariffsMenu(bot, chatId, userId, sessions);
        } else if (data === 'discount_disable') {
            const userId = query.from.id;
            delete discountSettings[userId];
            await sendDiscountSystemMenu(bot, chatId, userId, sessions);
        } else if (data.startsWith('discount_tariff_')) {
            const tariff = data.replace('discount_tariff_', '');
            const userId = query.from.id;
            if (!discountSettings[userId]) {
                discountSettings[userId] = { enabled: true, percent: 0, tariffs: {} };
            }
            discountSettings[userId].tariffs[tariff] = !discountSettings[userId].tariffs[tariff];
            await sendDiscountTariffsMenu(bot, chatId, userId, sessions);
        } else if (data === 'agency_model_contact_toggle') {
            const userId = query.from.id;
            const current = modelContactEnabled[userId] !== undefined ? modelContactEnabled[userId] : true;
            modelContactEnabled[userId] = !current;
            await sendAgencySettingsMenu(bot, chatId, sessions);
        } else if (data === 'agency_reviews') {
            const userId = query.from.id;
            await sendReviewsMenu(bot, chatId, userId, sessions);
        } else if (data === 'reviews_change_link' || data === 'reviews_add') {
            const userId = query.from.id;
            session.state = 'awaiting_reviews_link';
            sessions.set(chatId, session);
            await sendReviewsLinkRequest(bot, chatId, userId, sessions);
        } else if (data === 'reviews_remove') {
            const userId = query.from.id;
            customReviewsLink[userId] = null;
            await sendReviewsMenu(bot, chatId, userId, sessions);
        } else if (data === 'reviews_default') {
            const userId = query.from.id;
            delete customReviewsLink[userId];
            await sendReviewsMenu(bot, chatId, userId, sessions);
        } else if (data.startsWith('edit_tariffs_')) {
            const modelId = data.replace('edit_tariffs_', '');
            const model = await Model.findById(modelId);
            if (model) {
                sessions.set(chatId, session);
                await sendTariffList(bot, chatId, model, session, sessions);
            }
        } else if (data.startsWith('edit_tariff_')) {
            const parts = data.split('_');
            const modelId = parts[2];
            const hours = parts[3];
            const model = await Model.findById(modelId);
            if (model) {
                session.editTariff = { modelId, hours };
                sessions.set(chatId, session);
                await askNewTariffPrice(bot, chatId, model, hours, session, sessions);
            }
        } else if (data.startsWith('back_to_model_')) {
            const modelId = data.replace('back_to_model_', '');
            const model = await Model.findById(modelId);
            if (model) {
                await sendModelForEdit(bot, chatId, model, session, sessions);
            }
        } else {
            await bot.answerCallbackQuery(query.id, { text: 'Функция в разработке' });
        }
    });
}

module.exports = (bot, sessions) => {
    setupInlineHandlers(bot, sessions);
    setupMessageHandlers(bot, sessions);
    setupCallbackHandlers(bot, sessions);
};

module.exports.sendAgencyMainMenu = sendAgencyMainMenu;