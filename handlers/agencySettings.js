const utils = require('../utils');
const { Model } = require('../db');
const AGENCY_CONFIG = require('../config/agencyBotConfig');

const AGENCY_SETTINGS_IMAGE_ID = AGENCY_CONFIG.IMAGES.AGENCY_SETTINGS;

const MAX_TARIFF_PRICE = 100000;

// Хранилище настроек отображения моделей для агентов
const displaySettings = {};

// Хранилище кастомных текстов для раздела информации (по агентам)
const customInfoTexts = {};

// Хранилище максимального количества городов для агентов
const maxCitiesSettings = {};
const DEFAULT_MAX_CITIES = 1;

// Хранилище настроек скидок для агентов
const discountSettings = {};

// Хранилище статуса "Связь с моделью через бота"
const modelContactEnabled = {};

// Хранилище кастомных ссылок на отзывы (по агентам)
const customReviewsLink = {};
const DEFAULT_REVIEWS_LINK = 'https://t.me/escotzovnik';

// ========== Функции отправки меню ==========

async function sendAgencySettingsMenu(bot, chatId, sessions) {
    const session = sessions.get(chatId) || {};
    const oldMessageId = session.lastMessageId;

    const contactStatus = modelContactEnabled[chatId] !== undefined ? modelContactEnabled[chatId] : true;
    const contactText = contactStatus ? 'Вкл' : 'Выкл';

    const text = AGENCY_CONFIG.TEXTS.AGENCY_SETTINGS;

    const keyboard = [
        [{ text: 'Анкеты моделей', switch_inline_query_current_chat: 'agency_models' }],
        [{ text: 'Отображаемые модели', callback_data: 'agency_displayed_models' }],
        [{ text: 'Текст в разделе информации', callback_data: 'agency_info_text' }],
        [{ text: 'Максимальное количество городов', callback_data: 'agency_max_cities' }],
        [{ text: 'Система скидок', callback_data: 'agency_discount_system' }],
        [{ text: `Связь с моделью через бота: ${contactText}`, callback_data: 'agency_model_contact_toggle' }],
        [{ text: 'Отзывы', callback_data: 'agency_reviews' }],
        [{ text: '◀️ Назад', callback_data: 'agency_back_to_main' }]
    ];

    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, AGENCY_SETTINGS_IMAGE_ID, text, keyboard);

    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }

    session.lastMessageId = sentMsg.message_id;
    sessions.set(chatId, session);
    return sentMsg;
}

async function sendDisplayedModelsMenu(bot, chatId, agentId, sessions) {
    const session = sessions.get(chatId) || {};
    const oldMessageId = session.lastMessageId;

    if (!displaySettings[agentId]) {
        displaySettings[agentId] = { mode: 'all', selectedModels: [] };
    }

    const settings = displaySettings[agentId];

    let modeButtonText = '';
    switch(settings.mode) {
        case 'all': modeButtonText = 'Анкеты: Все'; break;
        case 'custom': modeButtonText = 'Анкеты: Кастомные'; break;
        case 'selected': modeButtonText = 'Анкеты: Выбранные'; break;
        case 'standard': modeButtonText = 'Анкеты: Стандартные'; break;
    }

    const text = `💝 Агентство: SkyGirls

БОТ: @esctesttttbot
ТП: @test28282ajajja_bot

Настройте, какие модели будут отображаться всем вашим клиентам в этом боте:`;

    const keyboard = [[{ text: modeButtonText, callback_data: 'display_mode_cycle' }]];

    if (settings.mode === 'selected') {
        keyboard.push([{ text: '✅ Выбрать модели для показа', switch_inline_query_current_chat: 'select_models' }]);
    }

    keyboard.push([{ text: '◀️ Назад', callback_data: 'agency_settings' }]);

    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, AGENCY_SETTINGS_IMAGE_ID, text, keyboard);

    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }

    session.lastMessageId = sentMsg.message_id;
    sessions.set(chatId, session);
    return sentMsg;
}

async function sendInfoTextLanguageMenu(bot, chatId, sessions) {
    const session = sessions.get(chatId) || {};
    const oldMessageId = session.lastMessageId;

    const text = `💝 Агентство: SkyGirls

БОТ: @esctesttttbot
ТП: @test28282ajajja_bot

Выберите язык для изменения текста в разделе информации.`;

    const keyboard = [
        [{ text: '🇷🇺 Русский', callback_data: 'info_text_lang_ru' }],
        [{ text: '◀️ Назад', callback_data: 'agency_settings' }]
    ];

    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, AGENCY_SETTINGS_IMAGE_ID, text, keyboard);

    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }

    session.lastMessageId = sentMsg.message_id;
    sessions.set(chatId, session);
    return sentMsg;
}

async function sendInfoTextEditMenu(bot, chatId, agentId, sessions, showDefaultButton = true) {
    const session = sessions.get(chatId) || {};
    const oldMessageId = session.lastMessageId;

    const defaultText = AGENCY_CONFIG.TEXTS.INFO;
    const currentText = customInfoTexts[agentId] || defaultText;

    const text = `💝 Агентство: SkyGirls

БОТ: @esctesttttbot
ТП: @test28282ajajja_bot

🇷🇺 Текст в разделе информации:
${currentText}

Пришлите новый текст (до 512 символов).`;

    const keyboard = [];
    if (showDefaultButton) keyboard.push([{ text: 'По умолчанию', callback_data: 'info_text_reset' }]);
    keyboard.push([{ text: '◀️ Назад', callback_data: 'agency_info_text' }]);

    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, AGENCY_SETTINGS_IMAGE_ID, text, keyboard);

    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }

    session.lastMessageId = sentMsg.message_id;
    sessions.set(chatId, session);
    return sentMsg;
}

async function sendMaxCitiesMenu(bot, chatId, agentId, sessions) {
    const session = sessions.get(chatId) || {};
    const oldMessageId = session.lastMessageId;

    const currentMax = maxCitiesSettings[agentId] !== undefined ? maxCitiesSettings[agentId] : DEFAULT_MAX_CITIES;

    const text = `💝 Агентство: SkyGirls

БОТ: @esctesttttbot
ТП: @esctesttttbot

Максимальное количество городов: ${currentMax}

Пришлите максимальное количество городов, которые клиент может изменить.`;

    const keyboard = [
        [{ text: 'По умолчанию', callback_data: 'max_cities_reset' }],
        [{ text: '◀️ Назад', callback_data: 'agency_settings' }]
    ];

    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, AGENCY_SETTINGS_IMAGE_ID, text, keyboard);

    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }

    session.lastMessageId = sentMsg.message_id;
    sessions.set(chatId, session);
    return sentMsg;
}

async function sendDiscountSystemMenu(bot, chatId, agentId, sessions) {
    const session = sessions.get(chatId) || {};
    const oldMessageId = session.lastMessageId;

    const settings = discountSettings[agentId] || { enabled: false, percent: 0, tariffs: {} };

    let text, keyboard;
    if (!settings.enabled) {
        text = `💝 Агентство: SkyGirls

БОТ: @esctesttttbot
ТП: @esctesttttbot

На данный момент скидки не действуют.`;
        keyboard = [
            [{ text: 'Включить систему скидок', callback_data: 'discount_enable' }],
            [{ text: '◀️ Назад', callback_data: 'agency_settings' }]
        ];
    } else {
        text = `💝 Агентство: SkyGirls

БОТ: @esctesttttbot
ТП: @esctesttttbot

Процент скидки: ${settings.percent}%`;
        keyboard = [
            [{ text: 'Изменить процент скидки', callback_data: 'discount_change_percent' }],
            [{ text: 'Распространяется на тарифы', callback_data: 'discount_tariffs' }],
            [{ text: 'Убрать скидку', callback_data: 'discount_disable' }],
            [{ text: '◀️ Назад', callback_data: 'agency_settings' }]
        ];
    }

    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, AGENCY_SETTINGS_IMAGE_ID, text, keyboard);

    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }

    session.lastMessageId = sentMsg.message_id;
    sessions.set(chatId, session);
    return sentMsg;
}

async function sendDiscountPercentRequest(bot, chatId, agentId, sessions) {
    const session = sessions.get(chatId) || {};
    const oldMessageId = session.lastMessageId;

    const text = `💝 Агентство: SkyGirls

БОТ: @esctesttttbot
ТП: @esctesttttbot

Пришлите процент скидки.`;

    const keyboard = [[{ text: '◀️ Назад', callback_data: 'agency_discount_system' }]];

    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, AGENCY_SETTINGS_IMAGE_ID, text, keyboard);

    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }

    session.lastMessageId = sentMsg.message_id;
    sessions.set(chatId, session);
    return sentMsg;
}

async function sendDiscountTariffsMenu(bot, chatId, agentId, sessions) {
    const session = sessions.get(chatId) || {};
    const oldMessageId = session.lastMessageId;

    const settings = discountSettings[agentId] || { enabled: false, percent: 0, tariffs: {} };
    const tariffs = settings.tariffs || {};

    const text = `💝 Агентство: SkyGirls

БОТ: @esctesttttbot
ТП: @esctesttttbot

Выберите, на какие тарифы распространяется скидка.`;

    const keyboard = [
        [
            { text: `1 час ${tariffs['1'] ? '✅' : '❌'}`, callback_data: 'discount_tariff_1' },
            { text: `2 часа ${tariffs['2'] ? '✅' : '❌'}`, callback_data: 'discount_tariff_2' },
            { text: `3 часа ${tariffs['3'] ? '✅' : '❌'}`, callback_data: 'discount_tariff_3' }
        ],
        [
            { text: `Ночь ${tariffs['night'] ? '✅' : '❌'}`, callback_data: 'discount_tariff_night' },
            { text: `Сутки ${tariffs['day'] ? '✅' : '❌'}`, callback_data: 'discount_tariff_day' }
        ],
        [{ text: '◀️ Назад', callback_data: 'agency_discount_system' }]
    ];

    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, AGENCY_SETTINGS_IMAGE_ID, text, keyboard);

    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }

    session.lastMessageId = sentMsg.message_id;
    sessions.set(chatId, session);
    return sentMsg;
}

async function sendReviewsMenu(bot, chatId, agentId, sessions) {
    const session = sessions.get(chatId) || {};
    const oldMessageId = session.lastMessageId;

    const currentLink = customReviewsLink[agentId] !== undefined ? customReviewsLink[agentId] : DEFAULT_REVIEWS_LINK;

    let text, keyboard;
    if (currentLink) {
        text = `💝 Агентство: SkyGirls

БОТ: @esctesttttbot
ТП: @esctesttttbot

Отзывы: ${currentLink}`;
        keyboard = [
            [{ text: 'Изменить ссылку', callback_data: 'reviews_change_link' }],
            [{ text: 'Убрать отзывы', callback_data: 'reviews_remove' }],
            [{ text: '◀️ Назад', callback_data: 'agency_settings' }]
        ];
    } else {
        text = `💝 Агентство: SkyGirls

БОТ: @esctesttttbot
ТП: @esctesttttbot

Отзывы отсутствуют.`;
        keyboard = [
            [{ text: 'Добавить отзывы', callback_data: 'reviews_add' }],
            [{ text: 'По умолчанию', callback_data: 'reviews_default' }],
            [{ text: '◀️ Назад', callback_data: 'agency_settings' }]
        ];
    }

    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, AGENCY_SETTINGS_IMAGE_ID, text, keyboard);

    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }

    session.lastMessageId = sentMsg.message_id;
    sessions.set(chatId, session);
    return sentMsg;
}

async function sendReviewsLinkRequest(bot, chatId, agentId, sessions) {
    const session = sessions.get(chatId) || {};
    const oldMessageId = session.lastMessageId;

    const text = `💝 Агентство: SkyGirls

БОТ: @esctesttttbot
ТП: @esctesttttbot

Пришлите ссылку на канал/группу с отзывами.`;

    const keyboard = [[{ text: '◀️ Назад', callback_data: 'agency_reviews' }]];

    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, AGENCY_SETTINGS_IMAGE_ID, text, keyboard);

    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }

    session.lastMessageId = sentMsg.message_id;
    sessions.set(chatId, session);
    return sentMsg;
}

// ========== Вспомогательные функции для инлайн-запросов ==========

async function handleModelsInlineQuery(bot, inlineQueryId, queryText) {
    try {
        console.log(`📋 handleModelsInlineQuery вызван с query: "${queryText}"`);

        let results = [];

        if (queryText === 'agency_models' || queryText.startsWith('agency_models ')) {
            const searchTerm = queryText.replace('agency_models', '').trim();

            let query = {};
            if (searchTerm) {
                query = {
                    $or: [
                        { name: { $regex: searchTerm, $options: 'i' } },
                        { city: { $regex: searchTerm, $options: 'i' } }
                    ]
                };
            }

            const allModels = await Model.find(query).limit(50);
            console.log(`📊 Найдено моделей: ${allModels.length}`);

            if (allModels.length === 0) {
                results.push({
                    type: 'article',
                    id: 'no_models',
                    title: 'Нет моделей',
                    description: searchTerm ? `По запросу "${searchTerm}" ничего не найдено` : 'В базе данных пока нет моделей',
                    input_message_content: {
                        message_text: 'Модели отсутствуют.',
                        parse_mode: 'HTML'
                    }
                });
            } else {
                for (const model of allModels) {
                    const stars = '⭐️'.repeat(Math.floor(model.rating || 0));
                    const title = `${stars} ${model.name}, ${model.age} лет`;
                    const description = `${model.city} | 1ч: ${model.tariffs[1]}₽ | 2ч: ${model.tariffs[2]}₽ | 3ч: ${model.tariffs[3]}₽`;

                    results.push({
                        type: 'article',
                        id: `edit_model_${model._id}`,
                        title: title,
                        description: description,
                        thumb_url: model.photo,
                        input_message_content: {
                            message_text: `/edit_model_${model._id}`,
                            parse_mode: 'HTML'
                        }
                    });
                }
            }
        }

        await bot.answerInlineQuery(inlineQueryId, results, { cache_time: 0, is_personal: true });
        console.log('✅ Инлайн-запрос обработан');
    } catch (error) {
        console.error('❌ Ошибка в handleModelsInlineQuery:', error);
        await bot.answerInlineQuery(inlineQueryId, [], { cache_time: 0, is_personal: true });
    }
}

async function handleSelectModelsInlineQuery(bot, inlineQueryId, queryText, agentId) {
    try {
        console.log(`📋 handleSelectModelsInlineQuery вызван с query: "${queryText}" для агента ${agentId}`);

        let results = [];
        const settings = displaySettings[agentId] || { selectedModels: [] };
        const selectedModels = settings.selectedModels || [];

        if (queryText === 'select_models' || queryText.startsWith('select_models ')) {
            const searchTerm = queryText.replace('select_models', '').trim();

            let query = {};
            if (searchTerm) {
                query = {
                    $or: [
                        { name: { $regex: searchTerm, $options: 'i' } },
                        { city: { $regex: searchTerm, $options: 'i' } }
                    ]
                };
            }

            const allModels = await Model.find(query).limit(50);
            console.log(`📊 Найдено моделей: ${allModels.length}`);

            if (allModels.length === 0) {
                results.push({
                    type: 'article',
                    id: 'no_models',
                    title: 'Нет моделей',
                    description: searchTerm ? `По запросу "${searchTerm}" ничего не найдено` : 'В базе данных пока нет моделей',
                    input_message_content: {
                        message_text: 'Модели отсутствуют.',
                        parse_mode: 'HTML'
                    }
                });
            } else {
                for (const model of allModels) {
                    const stars = '⭐️'.repeat(Math.floor(model.rating || 0));
                    const isSelected = selectedModels.includes(model._id.toString());
                    const checkmark = isSelected ? ' ✅' : '';

                    const title = `${stars} ${model.name}, ${model.age} лет${checkmark}`;
                    const description = `${model.city} | 1ч: ${model.tariffs[1]}₽ | 2ч: ${model.tariffs[2]}₽ | 3ч: ${model.tariffs[3]}₽`;

                    results.push({
                        type: 'article',
                        id: `select_model_${model._id}`,
                        title: title,
                        description: description,
                        thumb_url: model.photo,
                        input_message_content: {
                            message_text: `/select_model_${model._id}`,
                            parse_mode: 'HTML'
                        }
                    });
                }
            }
        }

        await bot.answerInlineQuery(inlineQueryId, results, { cache_time: 0, is_personal: true });
        console.log('✅ Инлайн-запрос выбора моделей обработан');
    } catch (error) {
        console.error('❌ Ошибка в handleSelectModelsInlineQuery:', error);
        await bot.answerInlineQuery(inlineQueryId, [], { cache_time: 0, is_personal: true });
    }
}

// ========== Функции для работы с моделью ==========

async function sendModelForEdit(bot, chatId, model, session, sessions) {
    const oldMessageId = session.lastMessageId;

    const stars = '⭐️'.repeat(Math.floor(model.rating || 0));
    const servicesList = model.services.map(s => '• ' + s).join('\n');

    const caption =
        `${model.name} · ${model.age} лет · город ${model.city} 📍\n` +
        `✅ Фотографии и справки прошли проверку\n\n` +
        `Рейтинг: ${model.rating} ${stars}\n\n` +
        `О себе: ${model.description}\n\n` +
        `Доступные тарифы:\n` +
        `1 час — ${model.tariffs[1].toLocaleString()}₽\n` +
        `2 часа — ${model.tariffs[2].toLocaleString()}₽\n` +
        `3 часа — ${model.tariffs[3].toLocaleString()}₽\n\n` +
        `Этническая группа: ${model.ethnicity}\n` +
        `Телосложение: ${model.build}\n` +
        `Цвет волос: ${model.hair_color}\n` +
        `Рост: ${model.height} см\n` +
        `Вес: ${model.weight} кг\n` +
        `Размер груди: ${model.bust}\n\n` +
        `Услуги:\n${servicesList}`;

    const keyboard = [
        [{ text: 'Тарифы', callback_data: `edit_tariffs_${model._id}` }],
        [{ text: '◀️ Назад', callback_data: 'agency_settings' }]
    ];

    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, model.photo, caption, keyboard, 'Markdown');

    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }

    session.lastMessageId = sentMsg.message_id;
    sessions.set(chatId, session);
    return sentMsg;
}

async function sendTariffList(bot, chatId, model, session, sessions) {
    console.log(`📋 sendTariffList для модели: ${model.name}`);
    const oldMessageId = session.lastMessageId;

    const text = `Стандартная модель\n\nИмя: ${model.name}\nВозраст: ${model.age}\n\nВыберите тариф, который хотите изменить.`;

    const keyboard = [
        [{ text: `1 час — ${model.tariffs[1]}₽`, callback_data: `edit_tariff_${model._id}_1` }],
        [{ text: `2 часа — ${model.tariffs[2]}₽`, callback_data: `edit_tariff_${model._id}_2` }],
        [{ text: `3 часа — ${model.tariffs[3]}₽`, callback_data: `edit_tariff_${model._id}_3` }],
        [{ text: '◀️ Назад к анкете', callback_data: `back_to_model_${model._id}` }]
    ];

    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, model.photo, text, keyboard);

    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }

    session.lastMessageId = sentMsg.message_id;
    sessions.set(chatId, session);
    console.log(`✅ Тарифы отправлены, новое сообщение ID: ${sentMsg.message_id}`);
    return sentMsg;
}

async function askNewTariffPrice(bot, chatId, model, hours, session, sessions) {
    console.log(`💰 askNewTariffPrice для модели ${model.name}, час ${hours}`);
    const oldMessageId = session.lastMessageId;

    const hourText = hours === '1' ? 'час' : hours === '2' ? 'часа' : 'часов';

    const text = `Стандартная модель\n\nИмя: ${model.name}\nВозраст: ${model.age}\n\nТариф: ${hours} ${hourText} — ${model.tariffs[hours]}₽\n\nПришлите новую цену для тарифа.`;

    const keyboard = [[{ text: '◀️ Отмена', callback_data: `edit_tariffs_${model._id}` }]];

    const sentMsg = await utils.sendPhotoWithKeyboard(bot, chatId, model.photo, text, keyboard);

    if (oldMessageId) {
        await utils.deleteMessageSafe(bot, chatId, oldMessageId);
    }

    session.lastMessageId = sentMsg.message_id;
    sessions.set(chatId, session);
    console.log(`✅ Запрос цены отправлен, сообщение ID: ${sentMsg.message_id}`);
    return sentMsg;
}

async function handleTariffPriceInput(bot, msg, session, sessions) {
    const chatId = msg.chat.id;
    const text = msg.text.trim();
    const { modelId, hours } = session.editTariff;

    console.log(`💬 Ввод цены: "${text}" для модели ${modelId}, час ${hours}`);

    const numericRegex = /^\d+$/;
    if (!numericRegex.test(text)) {
        console.log('❌ Ошибка: введены не цифры');

        const errorMsg = await bot.sendMessage(
            chatId,
            '❌ Введите корректное число (только цифры, без пробелов и букв).'
        );

        setTimeout(async () => {
            try { await bot.deleteMessage(chatId, errorMsg.message_id); } catch (e) {}
        }, 3000);

        return false;
    }

    const newPrice = parseInt(text);
    console.log(`💰 Новая цена: ${newPrice}`);

    if (newPrice <= 0) {
        console.log('❌ Ошибка: цена <= 0');

        const errorMsg = await bot.sendMessage(
            chatId,
            '❌ Цена должна быть положительным числом больше 0.'
        );

        setTimeout(async () => {
            try { await bot.deleteMessage(chatId, errorMsg.message_id); } catch (e) {}
        }, 3000);

        return false;
    }

    if (newPrice > MAX_TARIFF_PRICE) {
        console.log(`❌ Ошибка: цена превышает ${MAX_TARIFF_PRICE}`);

        const errorMsg = await bot.sendMessage(
            chatId,
            `❌ Цена не может превышать ${MAX_TARIFF_PRICE.toLocaleString()}₽.`
        );

        setTimeout(async () => {
            try { await bot.deleteMessage(chatId, errorMsg.message_id); } catch (e) {}
        }, 3000);

        return false;
    }

    console.log('✅ Цена прошла проверку');
    return newPrice;
}

// ========== Экспорт ==========

module.exports = {
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
    DEFAULT_REVIEWS_LINK,
    DEFAULT_MAX_CITIES,
    MAX_TARIFF_PRICE
};