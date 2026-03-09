const { User, Counter } = require('./db');

async function isSubscribed(bot, userId) {
    try {
        const channelUsername = process.env.CHANNEL_USERNAME || '@ddsoetest';

        // Проверяем, существует ли канал
        const chat = await bot.getChat(channelUsername).catch(() => null);
        if (!chat) {
            console.log('⚠️ Канал не найден, пропускаем проверку подписки');
            return true;
        }

        // Пробуем получить информацию о пользователе в канале
        const chatMember = await bot.getChatMember(channelUsername, userId);
        const status = chatMember.status;
        return ['member', 'administrator', 'creator'].includes(status);
    } catch (error) {
        console.error('Ошибка проверки подписки:', error.message);

        // Если ошибка связана с недоступностью списка участников, пропускаем проверку
        if (error.code === 'ETELEGRAM' &&
            (error.response?.body?.description?.includes('member list is inaccessible') ||
                error.message?.includes('member list is inaccessible'))) {
            console.log('⚠️ Список участников канала недоступен, пропускаем проверку');
            return true;
        }

        // В случае любой другой ошибки тоже пропускаем, чтобы не блокировать пользователей
        console.log('⚠️ Не удалось проверить подписку, пропускаем проверку');
        return true;
    }
}

async function sendPhotoWithKeyboard(bot, chatId, photo, caption, keyboard) {
    return bot.sendPhoto(chatId, photo, {
        caption,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
    });
}

async function deleteMessageSafe(bot, chatId, messageId) {
    try {
        await bot.deleteMessage(chatId, messageId);
        console.log(`Deleted message ${messageId} in chat ${chatId}`);
    } catch (e) {
        console.log(`Failed to delete message ${messageId}: ${e.message}`);
    }
}

async function sendNewAndDeleteOld(bot, chatId, photoId, text, keyboard, oldMessageId) {
    const newMsg = await sendPhotoWithKeyboard(bot, chatId, photoId, text, keyboard);
    if (oldMessageId) {
        await deleteMessageSafe(bot, chatId, oldMessageId);
    }
    return newMsg;
}

async function getNextWorkerNumber() {
    const counter = await Counter.findOneAndUpdate(
        { name: 'workerNumber' },
        { $inc: { value: 1 } },
        { new: true, upsert: true }
    );
    return counter.value;
}

async function getUserByTelegramId(telegramId) {
    return await User.findOne({ telegramId });
}

module.exports = {
    isSubscribed,
    sendPhotoWithKeyboard,
    deleteMessageSafe,
    sendNewAndDeleteOld,
    getNextWorkerNumber,
    getUserByTelegramId
};