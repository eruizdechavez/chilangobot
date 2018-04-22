module.exports = (webserver, controller) => {
  webserver.post('/ofertas', (req, res) => {
    if (req.body.token !== process.env.chilangobotToken) {
      return res.status(403).send();
    }

    res.status(202).send();

    controller.storage.teams.get(process.env.slackTeamId, (error, team) => {
      const bot = controller.spawn(team.bot);
      bot.api.channels.list({ exclude_archived: true, exclude_members: true }, (error, response) => {
        const channels = response.channels.reduce((channels, channel) => {
          channels[channel.name] = channel.id;
          return channels;
        }, {});

        controller.trigger('oferta_publicada', [bot, channels['ofertas-de-empleo'], req.body]);
      });
    });
  });
};
