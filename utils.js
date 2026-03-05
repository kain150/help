const { User, Counter } = require('./db');

async function isSubscribed(bot, userId) {
    try {
        const chatMember = await bot.getChatMember(process.env.CHANNEL_USERNAME || '@ddsoetest', userId);
        const status = chatMember.status;
        return ['member', 'administrator', 'creator'].includes(status);
    } catch (error) {
        console.error('Ошибка проверки подписки:', error);
        return false;
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