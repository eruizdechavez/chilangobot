const mysql = require('mysql');

/**
 * @typedef Channel
 * @property {string} name
 * @property {boolean} is_channel
 * @property {boolean} is_private
 */

/**
 * @type {Object.<string, Channel>}
 */
const known_channels = {};

/**
 * Load channel information from Slack API and store it in memory for the next time it is requested.
 * @param {object} bot A Botkit instance
 * @param {string} channel The channel id
 * @returns {Promise<Channel>} A promise to the channel
 */
function get_channel_info(bot, channel) {
  return new Promise((resolve, reject) => {
    if (known_channels[channel]) {
      return resolve(known_channels[channel]);
    }

    bot.api.conversations.info({ channel }, function(err, response) {
      if (err) {
        return reject(response);
      }

      known_channels[channel] = response.channel;
      return resolve(response.channel);
    });
  });
}

/**
 * @typedef User
 * @property {string} id
 * @property {string} name
 * @property {boolean} is_admin
 * @property {boolean} is_owner
 */

/**
 * @type {Object.<string, User>}
 */
const known_users = {};

/**
 * Load channel information from Slack API and store it in memory for the next time it is requested.
 * @param {Object} bot  A Botkit instance
 * @param {String} user The user id
 * @returns {Promise<User>} A promise to the user
 */
function get_user_info(bot, user) {
  return new Promise((resolve, reject) => {
    if (known_users[user]) {
      return resolve(known_users[user]);
    }

    bot.api.users.info({ user }, function(err, response) {
      if (err) {
        return reject(response);
      }

      known_users[user] = response.user;
      return resolve(response.user);
    });
  });
}

/**
 * A connection instance to MySQL
 */
let connection;

/**
 * Connects to MySQL to log messages in public channels.
 * @returns {Promise} A promise to the connection
 */
function connect_to_db() {
  return new Promise(resolve => {
    connection = mysql.createConnection({
      host: process.env.dbHost,
      user: process.env.dbUser,
      password: process.env.dbPassword,
      database: process.env.dbDatabase,
    });

    connection.connect(err => {
      if (err) {
        console.log('MySQL Connection Error, attempting reconnection in 2s');
        setTimeout(() => connect_to_db(), 2000);
      } else {
        console.log('MySQL Connection Completed');
        resolve(resolve);
      }
    });

    connection.on('error', err => {
      if (err.code !== 'PROTOCOL_CONNECTION_LOST') {
        throw err;
      }

      console.log('MySQL Connection Error, attempting reconnection in 2s');
      setTimeout(() => connect_to_db(), 2000);
    });
  });
}

/**
 * Stalker Skill
 * @module skills/stalker
 */
module.exports = async controller => {
  try {
    await connect_to_db();
  } catch (error) {
    console.error(error);
    return;
  }

  controller.on('ambient', async (bot, message) => {
    let user;
    let channel;

    try {
      user = await get_user_info(bot, message.event.user);
      channel = await get_channel_info(bot, message.channel);
    } catch (error) {
      console.error(error);
      return;
    }

    if (channel.is_channel && !channel.is_private) {
      const id = message.event.event_ts;
      const room_id = message.channel;
      const room_name = channel.name;
      const text = message.event.text;
      const user_id = message.event.user;
      const user_name = user.name;
      const url = room_id
        ? `https://${process.env.slackTeam}.slack.com/archives/${room_id}/p${id.replace('.', '')}`
        : '';
      const json = JSON.stringify(message.event);

      // Format query by escaping fields and values.
      let sql = 'INSERT INTO log SET ?? = ?, ?? = ?, ?? = ?, ?? = ?, ?? = ?, ?? = ?, ?? = ?, ?? = ?';
      const inserts = [ 'id', id, 'room_id', room_id, 'room_name', room_name, 'text', text, 'user_id', user_id, 'user_name', user_name, 'url', url, 'json', json ];
      sql = mysql.format(sql, inserts);

      // Insert into MySQL.
      connection.query(sql);
    } else {
      console.log('ignore event');
    }
  });
};

/**
 * @alias get_channel_info
 */
module.exports._get_channel_info = get_channel_info;

/**
 * @alias get_user_info
 */
module.exports._get_user_info = get_user_info;
