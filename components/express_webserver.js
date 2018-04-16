const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const http = require('http');
const hbs = require('express-hbs');
const fs = require('fs');

module.exports = function(controller) {
  const webserver = express();
  webserver.use(cookieParser());
  webserver.use(bodyParser.json());
  webserver.use(bodyParser.urlencoded({ extended: true }));

  // set up handlebars ready for tabs
  webserver.engine('hbs', hbs.express4({partialsDir: __dirname + '/../views/partials'}));
  webserver.set('view engine', 'hbs');
  webserver.set('views', __dirname + '/../views/');

  let normalizedPath;

  // import express middlewares that are present in /components/express_middleware
  normalizedPath = require('path').join(__dirname, 'express_middleware');
  fs.readdirSync(normalizedPath).forEach(function(file) {
    require('./express_middleware/' + file)(webserver, controller);
  });

  webserver.use(express.static('public'));

  const server = http.createServer(webserver);
  server.listen(process.env.PORT || 3000, null, function() {
    console.log('Express webserver configured and listening at http://localhost:' + process.env.PORT || 3000);
  });

  // import all the pre-defined routes that are present in /components/routes
  normalizedPath = require('path').join(__dirname, 'routes');
  fs.readdirSync(normalizedPath).forEach(function(file) {
    require('./routes/' + file)(webserver, controller);
  });

  controller.webserver = webserver;
  controller.httpserver = server;

  return webserver;
};
