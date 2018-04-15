const debug = require('debug')('chilangobot:custom_channel_join');
const { _get_channel_info, _get_user_info } = require('./stalker');
const fs = require('fs');

let monitored_channels;

function load_monitored_channels() {
  const config = fs.readFileSync(`${__dirname}/../config/monitored_channels.json`);
  monitored_channels = JSON.parse(config);
}

module.exports = function(controller) {
  // Self explanatory... load the monitored channel configuration on load.
  load_monitored_channels();

  // If something changes on the messages, allow the bot to reload them on demand instead of having to reload everyhing.
  controller.hears('recarga mensajes', 'direct_message', async (bot, message) => {
    const user = await _get_user_info(bot, message.user);

    if (!user.is_admin) {
      return;
    }

    // Instead of spamming the user with status, just add reactions to the command
    await bot.api.reactions.add({name: 'thinking_face', timestamp: message.ts, channel: message.channel});

    load_monitored_channels();
    await bot.api.reactions.remove({name: 'thinking_face', timestamp: message.ts, channel: message.channel});
    await bot.api.reactions.add({name: 'thumbsup', timestamp: message.ts, channel: message.channel});
  });


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
            // Do not process admin events if the event is for users only
            if ((user.is_admin || user.is_owner) && channel_event.users_only) {
              return;
            }

            // Do not process user events if the event is for admins only
            if (!user.is_admin && !user.is_owner && channel_event.admins_only) {
              return;
            }

            // Replace any know token with its real value
            const text = channel_event.text.replace(/{{user}}/ig, `@${user.name}`).replace(/{{channel}}/ig, `#${channel.name}`);
            let target;

            // Set the message target and, if the event should be responded as a direct message open a new conversation
            if (channel_event.as_dm) {
              target = message.user,
              await bot.api.im.open({user: target});
            } else {
              target = message.channel;
            }

            // If the event is to be handled as a threaded message, set the correct timestamp
            let thread_ts;
            if (channel_event.as_thread) {
              thread_ts = message.ts;
            }

            // All done! Send the message!
            bot.api.chat.postMessage({
              text,
              thread_ts,
              as_user: true,
              channel: target,
              link_names: true,
            });
          }
        });
      }
    } catch (error) {
      debug('Error', error);
    }
  });
};
