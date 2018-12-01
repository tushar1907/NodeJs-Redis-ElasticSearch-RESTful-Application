var express = require('express');
var app = express();

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var cookieParser  = require('cookie-parser');
app.use(cookieParser());

var cors = require('cors');
app.use(cors());

var redis = require('redis');
let client = redis.createClient();
client.on('connect', function() {
    console.log('Connecting to redis on port .....');
});

require('./app.js')(app, client);

var port = 3000;

app.listen(port);