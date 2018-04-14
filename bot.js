const env = require('node-env-file');
env(__dirname + '/.env');

if (!process.env.clientId || !process.env.clientSecret || !process.env.PORT) {
  process.exit(1);
}

const Botkit = require('botkit');
const debug = require('debug')('botkit:main');

const bot_options = {
  clientId: process.env.clientId,
  clientSecret: process.env.clientSecret,
  // debug: true,
  scopes: ['bot'],
  studio_token: process.env.studio_token,
  studio_command_uri: process.env.studio_command_uri
};

bot_options.json_file_store = __dirname + '/.data/db/'; // store user data in a simple JSON format

// Create the Botkit controller, which controls all instances of the bot.
const controller = Botkit.slackbot(bot_options);

controller.startTicking();

// Set up an Express-powered webserver to expose oauth and webhook endpoints
var webserver = require(__dirname + '/components/express_webserver.js')(controller);

webserver.get('/', function(req, res){
  res.render('index', {
    domain: req.get('host'),
    protocol: req.protocol,
    glitch_domain:  process.env.PROJECT_DOMAIN,
    layout: 'layouts/default'
  });
});

// Set up a simple storage backend for keeping a record of customers
// who sign up for the app via the oauth
require(__dirname + '/components/user_registration.js')(controller);

// Send an onboarding message when a new team joins
require(__dirname + '/components/onboarding.js')(controller);

// enable advanced botkit studio metrics
require('botkit-studio-metrics')(controller);

var normalizedPath = require('path').join(__dirname, 'skills');
require('fs').readdirSync(normalizedPath).forEach(function(file) {
  require('./skills/' + file)(controller);
});

controller.on('direct_message,direct_mention,mention', async function(bot, message) {
  try {
    const convo = await controller.studio.runTrigger(bot, message.text, message.user, message.channel, message);

    if (!convo) {
     // controller.studio.run(bot, 'fallback', message.user, message.channel);
    } else {
      // set variables here that are needed for EVERY script
      // use controller.studio.before('script') to set variables specific to a script
      convo.setVar('current_time', new Date());
    }
  } catch (error) {
    // bot.reply(message, 'I experienced an error with a request to Botkit Studio: ' + err);
    debug('Botkit Studio: ', err);
  }
});
