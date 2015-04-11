/**
 * Created by jordrevl on 13.03.2015.
 */
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var chat = require('./chat.js');

// set the view engine to ejs
app.set('view engine', 'ejs');

// render regular .html as ejs
app.engine('html', require('ejs').renderFile);

app.use(express.static('./public'));
app.use('/bower_components',  express.static(__dirname + '/bower_components'));

// init chat
chat(io);
app.get('/', function(req, res){
    res.render('index.html'); // include .html (default is .ejs)
});

app.get('/phaser', function(req, res){
    res.render('firstphaser.html');
});

// init game
require('./Game.js')(io);

http.listen(3005, function(){
    console.log('listening on *:3005');
});