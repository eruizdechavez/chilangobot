/**
 * Stalker Skill
 * @module skills/oferta
 */
module.exports = async controller => {
  controller.on('oferta_publicada', (bot, channel, payload) => {
    const attachment = {
      // fallback: 'Required plain-text summary of the attachment.',
      // color: '#36a64f',
      pretext: 'Nueva oferta publicada :boom:!',
      author_name: payload.contact,
      author_link: `mailto:${payload.contact}?subject=${encodeURIComponent(payload.title)}`,
      // author_icon: 'http://flickr.com/icons/bobby.jpg',
      title: payload.title,
      title_link: `http://codemaker.ninja/api/jobs/${payload.id}`,
      // text: payload.content,
      fields: [
        {
          title: 'Compañia',
          value: payload.company,
          short: false,
        },
        {
          title: 'Ubicación',
          value: payload.location,
          short: true,
        },
        {
          title: 'Salario',
          value: payload.salary,
          short: true,
        },
        {
          title: 'Descripción',
          value: payload.content,
          short: false,
        },
      ],
      // image_url: 'http://my-website.com/path/to/image.jpg',
      // thumb_url: 'http://example.com/path/to/thumb.png',
      // footer: 'Slack API',
      // footer_icon: 'https://platform.slack-edge.com/img/default_application_icon.png',
      // ts: 123456789,
    };

    bot.say({
      channel,
      as_user: true,
      link_names: true,
      attachments: [attachment],
    });
  });
};
