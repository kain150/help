const EXTRA_SERVICES = require('./extraServicesConfig');

// Конфигурация агентского бота
const AGENCY_BOT_CONFIG = {
    // ID изображений (file_id из Telegram)
    IMAGES: {
        WELCOME: 'AgACAgIAAxkBAAMCaaXKK24h8UqW1NS3SHIix5WpSAwAAgsSaxvXmTFJ_BRkkNXLwfUBAAMCAAN5AAM6BA',
        CITY: 'AgACAgIAAxkBAAMCaaXKK24h8UqW1NS3SHIix5WpSAwAAgsSaxvXmTFJ_BRkkNXLwfUBAAMCAAN5AAM6BA',
        CONFIRM: 'AgACAgIAAxkBAAMCaaXKK24h8UqW1NS3SHIix5WpSAwAAgsSaxvXmTFJ_BRkkNXLwfUBAAMCAAN5AAM6BA',
        MAIN: 'AgACAgIAAxkBAAMEaaXKR9gcLbTUmNCpCgLZFQyKCaAAAg0SaxvXmTFJa6uUEhvfzqEBAAMCAAN5AAM6BA',
        ACCOUNT: 'AgACAgIAAxkBAAMGaaXKXMa4Nj6Z2uqOf2llb28ohUIAAhISaxvXmTFJGWtFQk27LOIBAAMCAAN5AAM6BA',
        INFO: 'AgACAgIAAxkBAAMCaaXKK24h8UqW1NS3SHIix5WpSAwAAgsSaxvXmTFJ_BRkkNXLwfUBAAMCAAN5AAM6BA',
        ERROR: 'AgACAgIAAxkBAAMCaaXKK24h8UqW1NS3SHIix5WpSAwAAgsSaxvXmTFJ_BRkkNXLwfUBAAMCAAN5AAM6BA',
        AGENCY_SETTINGS: 'AgACAgIAAxkBAAMcaaXIAAG2flJ8oVdVR_zI4vpQDqJWAAIVEmsb15kxSco2VRk80u63AQADAgADeQADOgQ',
    },

    // Поддерживаемые валюты
    SUPPORTED_CURRENCIES: ['RUB', 'UAH', 'KZT', 'USD', 'EUR'],

    // Минимальная сумма пополнения
    MIN_DEPOSIT_AMOUNT: 2000,

    // Время жизни счёта в минутах
    INVOICE_LIFETIME: 20,
    CRYPTO_INVOICE_LIFETIME: 30,

    // Курс USDT к RUB
    USDT_TO_RUB_RATE: 90,

    // Тестовые реквизиты
    TEST_CARD_NUMBER: '2200 1234 5678 9012',
    TEST_CRYPTO_ADDRESS: 'TXmB4zqCjeqZw2iKJ9eL6m8qP3cR5n7VfX',

    // Контакты
    CONTACTS: {
        MANAGER_USERNAME: 'SkyGirlsManager',
        MANAGER_LINK: 'https://t.me/SkyGirlsManager',
        CHANNEL_LINK: 'https://t.me/escotzovnik',
        AGREEMENT_LINK: 'https://telegra.ph/Polzovatelskie-soglasheniya-agenstva-08-30',
    },

    // Промокоды
    PROMO_CODES: {
        'SKY10': { bonus: 500, message: 'Промокод активирован! Вы получили 500₽ на баланс.' },
        'WELCOME': { bonus: 1000, message: 'Промокод активирован! Вы получили 1000₽ на баланс.' },
        'GIRL20': { bonus: 750, message: 'Промокод активирован! Вы получили 750₽ на баланс.' },
        'VIP2026': { bonus: 2000, message: 'Промокод активирован! Вы получили 2000₽ на баланс.' },
        'TEST': { bonus: 100, message: 'Тестовый промокод! +100₽' },
    },

    // Дополнительные услуги (импортируем из отдельного файла)
    EXTRA_SERVICES: EXTRA_SERVICES,

    // Тексты
    TEXTS: {
        WELCOME: 'Добро пожаловать!\n\nПользуясь нашим бот-каталогом для просмотра доступных моделей с вашего города, вы автоматически соглашаетесь с нашими [Условиями использования]({agreementLink})',

        INFO: 'SkyGirls (https://t.me/SkyGirlsBot)\n\nПредставляет вашему вниманию проверенных моделей, каждая из которых прошла тщательную проверку и имеет все необходимые справки. Наши модели – это не только внешняя красота, но и высокий уровень интеллекта и обаяния.\n\nПочему выбирают нас?\n\nПолная Анонимность: Мы гарантируем абсолютную конфиденциальность. Ваша информация никогда не будет раскрыта третьим лицам.\n\nПроверенные Модели: Все наши модели имеют медицинские справки и прошли строгий отбор, чтобы соответствовать высоким стандартам сервиса.\n\nКруглосуточная Поддержка: Наша команда менеджеров всегда готова помочь вам в любое время суток.',

        ACCOUNT: 'Мой аккаунт\n\nРейтинг: 0.0 (Неизвестно)\n\nИдентификатор: `{userId}`\nЗарегистрирован: {registeredAt}\n\nТекущий баланс: {balance} {currency}',

        CITY_PROMPT: 'Для поиска моделей укажите город.\nПришлите название или отправьте геолокацию.',

        CITY_CONFIRM: 'Вы уверены, что хотите искать моделей в городе {city}?',

        CITY_AUTO_DETECT: 'Похоже, вы находитесь в городе {city}.\n\nПодтверждаете?',

        CITY_NOT_FOUND: '❌ Город с таким названием не найден в нашей системе.\n\nУбедитесь в правильности написания или попробуйте ввести более крупный город!',

        CURRENCY_SELECT: 'Выбор валюты\n\nТекущая валюта: {currency}\n\nВыберите валюту для отображения цен:',

        DEPOSIT: 'Пополнение баланса\n\nТекущий баланс: {balance} {currency}\n\nВыберите способ пополнения:',

        DEPOSIT_AMOUNT: 'Пополнение баланса\n\nТекущий баланс: {balance} {currency}\n\nОтправьте сумму пополнения цифрами, без дополнительных точек и запятых в {currency} (Не менее {minAmount}{currency}).',

        DEPOSIT_CRYPTO: '₿ Пополнение баланса криптовалютой\n\nТекущий баланс: {balance} {currency}\n\nОтправьте сумму пополнения в RUB цифрами, без дополнительных точек и запятых (Не менее {minAmount}₽).\n\n💱 Курс будет рассчитан по текущему рыночному курсу USDT.',

        PROMO: '🎁 Введите название промокода, чтобы получить бонус!',

        AGENCY_SETTINGS: '▎Настройки агентства\n\nВыберите раздел для редактирования:',

        TARIFF_LIST: 'Стандартная модель\n\nИмя: {name}\nВозраст: {age}\n\nВыберите тариф, который хотите изменить.',

        TARIFF_EDIT: 'Стандартная модель\n\nИмя: {name}\nВозраст: {age}\n\nТариф: {hours} {hourText} — {price}₽\n\nПришлите новую цену для тарифа.',
    }
};

module.exports = AGENCY_BOT_CONFIG;