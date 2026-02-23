const TelegramBot = require('node-telegram-bot-api');

// Замените на токен вашего бота
const token = '8589206913:AAHTr6cLMjzd4nJ4ig4q77rs45g1ed5_a-M';

// Создаём экземпляр бота с включённым polling
const bot = new TelegramBot(token, { polling: true });

// Обработчик всех входящих сообщений
bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    // Проверяем, есть ли в сообщении фото
    if (msg.photo) {
        // Фотографии приходят в виде массива размеров.
        // Обычно file_id нужного размера берут из последнего элемента (самое большое разрешение).
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        bot.sendMessage(chatId, `File ID (photo): ${fileId}`);
    }
    // Проверяем, есть ли видео
    else if (msg.video) {
        const fileId = msg.video.file_id;
        bot.sendMessage(chatId, `File ID (video): ${fileId}`);
    }
    // Дополнительно можно обрабатывать документы (например, если фото отправлено как файл)
    else if (msg.document) {
        // Можете добавить проверку MIME-типа, если хотите реагировать только на изображения/видео
        bot.sendMessage(chatId, `File ID (document): ${msg.document.file_id}`);
    }
    // Игнорируем остальные типы сообщений
});

// Обработка ошибок (например, потеря соединения)
bot.on('polling_error', (error) => {
    console.log('Polling error:', error);
});