/**
 * Created by jordrevl on 13.03.2015.
 */
var app = require('express')();
var http = require('http').Server(app);

app.get('/', function(req, res){
    res.send('<h1>working</h1>');
});

http.listen(3005, function(){
    console.log('listening on *:3005');
});