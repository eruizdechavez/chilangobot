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
  const config = fs.readFileSync(`${__dirname}/../config/monitored_channels.json`);
  monitored_channels = JSON.parse(config);
  return monitored_channels;
}

/**
 * Channel Monitor
 * @module skills/monitored_channels
 */
module.exports = function(controller) {
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
            // Do not process admin events if the event is for users only
            if ((user.is_admin || user.is_owner) && channel_event.users_only) {
              return;
            }

            // Do not process user events if the event is for admins only
            if (!user.is_admin && !user.is_owner && channel_event.admins_only) {
              return;
            }

            // Replace any know token with its real value
            const text = channel_event.text
              .replace(/{{user}}/gi, `<@${message.user}>`)
              .replace(/{{channel}}/gi, `<#${message.channel}>`);
            let target;

            // Set the message target and, if the event should be responded as a direct message open a new conversation
            if (channel_event.as_dm) {
              target = message.user;
            } else {
              target = message.channel;
            }

            // If the event is to be handled as a threaded message, set the correct timestamp
            let thread_ts;
            if (channel_event.as_thread) {
              thread_ts = message.ts;
            }

            const data = {
              text,
              thread_ts,
              as_user: true,
              channel: target,
            };

            if (channel_event.as_whisper) {
              bot.whisper(message, data);
            } else {
              bot.say(data);
            }
          }
        });
      }
    } catch (error) {
      debug('Error', error);
    }
  });

  controller.on('ambient', async (bot, message) => {
    try {
      const channel = await _get_channel_info(bot, message.channel);
      const user = await _get_user_info(bot, message.user);

      if (message.thread_ts) {
        return;
      }

      if (channel.name === 'ofertas-de-empleo' && message.type === 'ambient') {
        // if (!user.is_admin && !user.is_owner) {
        bot.api.chat.delete({
          channel: message.channel,
          ts: message.ts,
          token: process.env.slackAdminToken,
        });
        // }

        bot.whisper(message, {
          channel: message.user,
          text: `:rotating_light: El canal <#${
            message.channel
          }> es un canal moderado :rotating_light:\n\nSi deseas publicar una oferta puedes usar el boton publicar\nSi deseas mas informacion sobre una oferta puedes usar los links publicados en la misma.`,
          attachments: [
            {
              fallback: 'La aplicacion de Slack es necesaria para realizar esta accion.',
              callback_id: 'nueva_oferta',
              attachment_type: 'default',
              actions: [
                {
                  name: 'inicia_nueva_oferta',
                  text: 'Publicar nueva oferta',
                  type: 'button',
                  value: 'publicar',
                },
              ],
            },
          ],
        });
      }
    } catch (error) {
      debug('Error', error);
    }
  });

  controller.on('interactive_message_callback', function(bot, message) {
    console.log(message);
    var dialog = bot
      .createDialog('Nueva Oferta de Trabajo', 'publica_nueva_oferta', 'Publicar')
      .addText('Titulo', 'title', null, { placeholder: 'Un titulo relevante para la oferta de trabajo' })
      .addText('Lugar de trabajo', 'place', null, { placeholder: 'En oficina? Remoto? En que cidad, estado, pais?' })
      .addText('Rango de salario', 'salary', null, { placeholder: 'Para darle una mejor idea a los candidatos' })
      .addTextarea('Descripcion', 'content', null, {
        placeholder: 'Descripcion completa del trabajo, hasta 3000 caracteres',
      });

    bot.replyWithDialog(message, dialog.asObject());
  });
};
