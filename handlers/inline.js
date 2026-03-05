const utils = require('../utils');

module.exports = (bot, sessions) => {
    bot.on('inline_query', async (msg) => {
        const inlineQueryId = msg.id;
        const queryText = msg.query;
        const userId = msg.from.id;

        const user = await utils.getUserByTelegramId(userId);
        if (!user || user.status !== 'approved') return;

        if (queryText === 'mentor') {
            const results = [{
                type: 'article',
                id: 'mentoring_not_found',
                title: 'Не найдено',
                description: 'Наставники в скором времени появятся',
                input_message_content: {
                    message_text: '\u200Bmentoring_not_found',
                    parse_mode: 'HTML'
                }
            }];

            await bot.answerInlineQuery(inlineQueryId, results, {
                cache_time: 0,
                is_personal: true
            }).catch(console.error);
            return;
        }
        // другие обработчики...
    });
};