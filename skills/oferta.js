/**
 * Stalker Skill
 * @module skills/oferta
 */
module.exports = async controller => {
  controller.on('oferta_publicada', (bot, channel, payload) => {
    bot.api.chat.postMessage({
      text: payload.text,
      as_user: true,
      channel: channel,
      link_names: true,
    });
  });
};
