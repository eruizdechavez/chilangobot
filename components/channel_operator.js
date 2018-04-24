const RESPOND_AS_DM = Symbol();
const RESPOND_AS_THREAD = Symbol();
const RESPOND_AS_WHISPER = Symbol();

const RESPOND_AS_SYMBOLS = {
  dm: RESPOND_AS_DM,
  thread: RESPOND_AS_THREAD,
  whisper: RESPOND_AS_WHISPER,
};

module.exports = function(controller) {
  controller.on('channel_operator:incoming_event', (bot, message, user, event) => {
    if (event.delete_trigger) {
      controller.trigger('channel_operator:delete_trigger', [bot, message, user]);
    }

    controller.trigger('channel_operator:post_message', [bot, message, user, event]);
  });

  controller.on('channel_operator:post_message', (bot, message, user, event) => {
    // Do not process admin events if the event is for users only
    if ((user.is_admin || user.is_owner) && event.users_only) {
      return;
    }

    // Do not process user events if the event is for admins only
    if (!user.is_admin && !user.is_owner && event.admins_only) {
      return;
    }

    // Replace any know token with its real value
    const content = event.text
      .replace(/{{user}}/gi, `<@${message.user}>`)
      .replace(/{{channel}}/gi, `<#${message.channel}>`);

    const respond_as = RESPOND_AS_SYMBOLS[event.respond_as];
    let target;
    // Set the message target and, if the event should be responded as a direct message open a new conversation
    if (respond_as === RESPOND_AS_DM) {
      target = message.user;
    } else {
      target = message.channel;
    }

    const data = {
      text: content,
      channel: target,
      thread_ts: respond_as === RESPOND_AS_THREAD ? message.ts : null,
      as_user: true,
      attachments: event.attachments,
    };

    if (respond_as === RESPOND_AS_WHISPER) {
      bot.whisper(message, data);
    } else {
      bot.say(data);
    }
  });

  controller.on('channel_operator:delete_trigger', (bot, message, user) => {
    // Do not delete trigger if user is admin
    if (user.is_admin || user.is_owner) {
      return;
    }

    bot.api.chat.delete({
      channel: message.channel,
      ts: message.ts,
      token: process.env.slackAdminToken,
    });
  });
};
