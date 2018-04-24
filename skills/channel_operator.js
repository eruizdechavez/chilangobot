const debug = require('debug')('chilangobot:custom_channel_join');
const { _get_channel_info, _get_user_info } = require('./stalker');
const fs = require('fs');

/**
 * @typedef MonitoredChannel
 * @property {string} event Botkit event to be monitored. Currently supported events: user_channel_join, ambient.
 * @property {boolean} admins_only The event will only be processed if the user who triggered is an admin or an owner.
 * @property {boolean} users_only The event will only be processed if the user who triggered is not an admin nor an owner.
 * @property {boolean} as_dm Send the message as direct message to the user who triggered the event.
 * @property {boolean} as_thread Send the message as a thread response to the user who triggered the event. Bot *MUST* be on the channel for this to work.
 * @property {string} text The text to be sent in the message. 2 tokens can be replaced dynamically: {{user}} and {{channel}}
 */

/**
 * Cached monitored event configuration.
 *
 * An Object with keys, each key represents a channel. The content of each key is expected to be an array of objects
 * with channel events to be monitored.
 * @type {Object.<string, [MonitoredChannel]}
 */
let monitored_channels;

/**
 * Load the monitored channel configuration from file.
 * @returns {Object.<string, [MonitoredChannel]} the monitored channels
 */
function load_monitored_channels() {
  const config = fs.readFileSync(`${__dirname}/../config/channel_operator.json`);
  monitored_channels = JSON.parse(config);
  return monitored_channels;
}

/**
 * Channel Monitor
 * @module skills/monitored_channels
 */
module.exports = function(controller) {
  require(`${__dirname}/../components/channel_operator.js`)(controller);

  // Load configuration on load
  load_monitored_channels();

  /**
   * Reload channel configuration on demand.
   *
   * This allows to modify only the channel events file whithout having to reload the complete application by sending a
   * direct message to the bot with the text `recarga mensajes`.
   */
  controller.hears('recarga mensajes', 'direct_message', async (bot, message) => {
    const user = await _get_user_info(bot, message.user);

    if (!user.is_admin) {
      return;
    }

    // Instead of spamming the user with status, just add reactions to the command
    await bot.api.reactions.add({ name: 'thinking_face', timestamp: message.ts, channel: message.channel });

    load_monitored_channels();
    await bot.api.reactions.remove({ name: 'thinking_face', timestamp: message.ts, channel: message.channel });
    await bot.api.reactions.add({ name: 'thumbsup', timestamp: message.ts, channel: message.channel });
  });

  /**
   * Listen to all messages and react to them base on the configuration loaded load_monitored_channels.
   */
  controller.on('user_channel_join,ambient', async (bot, message) => {
    try {
      // Get user and channel info. We'll need some details later.
      const channel = await _get_channel_info(bot, message.channel);
      const user = await _get_user_info(bot, message.user);

      // Do not reply to threads (for now).
      if (message.thread_ts) {
        return;
      }

      // If the channel is on the monitored list, start processing it
      if (Object.keys(monitored_channels).indexOf(channel.name) !== -1) {
        const monitored_channel = monitored_channels[channel.name];

        // Process each monitored event for the current channel
        monitored_channel.map(async channel_event => {
          if (message.type === channel_event.event) {
            controller.trigger('channel_operator:incoming_event', [bot, message, user, channel_event]);
          }
        });
      }
    } catch (error) {
      debug('Error', error);
    }
  });
};
