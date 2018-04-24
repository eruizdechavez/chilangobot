const { isString } = require('lodash');

module.exports = function(webserver, controller) {
  webserver.post('/slack/receive', function(req, res) {
    // NOTE: we should enforce the token check here

    let body = req.body;

    if (body.payload && isString(body.payload)) {
      try {
        body = JSON.parse(body.payload);
      } catch (e) {
        console.log(`Unable to parse as JSON: ${body.payload}`);
      }
    }

    if (body.token !== process.env.slackToken) {
      return res.status(403).send();
    }

    // respond to Slack that the webhook has been received.
    res.status(200);

    // Now, pass the webhook into be processed
    controller.handleWebhookPayload(req, res);
  });
};
