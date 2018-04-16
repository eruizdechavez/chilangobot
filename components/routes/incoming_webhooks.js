var debug = require('debug')('botkit:incoming_webhooks');

module.exports = function(webserver, controller) {
  debug('Configured /slack/receive url');
  webserver.post('/slack/receive', function(req, res) {
    // NOTE: we should enforce the token check here

    if (req.body.token !== process.env.slackToken) {
      return res.status(403).send();
    }

    // respond to Slack that the webhook has been received.
    res.status(200);

    // Now, pass the webhook into be processed
    controller.handleWebhookPayload(req, res);
  });
};
