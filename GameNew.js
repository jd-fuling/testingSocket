/**
 * The MIT License (MIT)

 Copyright (c) 2014 SungRim Huh

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.

 * Created by jordrevl on 21.03.2015.
 *
 * */

var util = require('util');
var Player = require('./Player');
var Map = require('./Map');
var mapData = require('./data/maps.json');

var g = {
    io: undefined,
    players: [],
    maps: {},
    time: {
        step: 1 / 60,
        now: 0
    }
};

// Read maps from file
for (var mapId in mapData) {
    if (mapData.hasOwnProperty(mapId)) {
        // Make a new map
        g.maps[mapId] = new Map({
            mapId: mapId,
            map: mapData[mapId]
        });
    }
}

function init(sio){
    g.io = sio;
    bindSocketEvents();
    setInterval(step, 1000 * g.time.step);
    return g;
}

function bindSocketEvents(){
    g.io.sockets.on('connection', function(socket){
        console.log('Client connected: ', socket.id);
        // Tell the connected player what their ID is
        socket.emit('connected', {id: socket.id});
        g.players.push(new Player({id: socket.id}));

        socket.on('disconnect', onDisconnect);
        socket.on('setPlayerName', onSetPlayerName);
        socket.on('getMap', onGetMap);
        socket.on('newPlayer', onNewPlayer);
        socket.on('updatePlayer', onUpdatePlayer);
        socket.on('startGame', onStartGame);
        socket.on('resetGame', onResetGame);
    });

    // Bind update event to the maps
    for (var map in g.maps) {
        if (g.maps.hasOwnProperty(map)) {
            g.maps[map].bindUpdateEvent(g.io);
        }
    }
}

function onDisconnect() {
    var player = playerById(this.id);
    if(!player){
        util.log("Player not found: " + this.id);
    }

    util.log("Player disconnected: " + player.id);

    g.players.splice(g.players.indexOf(player), 1);
    this.broadcast.to(player.mapId).emit('removePlayer', {id: this.id});
    this.leave(player.mapId);

    if (!g.maps[player.mapId]) {
        util.log("Map not found: " + player.mapId);
        return;
    }

    player.leaveMap(g.maps[player.mapId]);
}

function onSetPlayerName(data) {
    playerById(this.id).name = data.name;
}

function onGetMap(data) {
    if(!g.maps[data.mapId]){
        util.log('Map not found: ' + data.mapId);
    }
    this.emit('getMap', g.maps[data.mapId].serialize());
}

function onNewPlayer(data) {
    if(!g.maps[data.mapId]){
        util.log('Map not found: ' + data.mapId);
    }

    var player = playerById(this.id);
    if (!player) {
        util.log("Player not found: " + this.id);
        return;
    }

    this.broadcast.to(data.mapId).emit('newPlayer', player.serialize());

    // tell this player about the other players
    for (var i = 0, p = g.maps[data.mapId].players; i < p.length; i++) {
        this.emit('newPlayer', p[i].serialize());
    }

    this.join(data.mapId);
    player.joinMap(g.maps[data.mapId]);
}

function onUpdatePlayer(data) {
    var player = playerById(this.id);

    if(!player){
        util.log('Player ' + this.id + ' not found.');
        return;
    }

    player.updateKeys(data);
}

function onStartGame(data) {
    if (!g.maps[data.mapId]) {
        util.log("Map not found: " + data.mapId);
        return;
    }

    var countdownFrom = 4, countdown = 4;
    var mapId = data.mapId;

    if (g.maps[mapId].isStarting || g.maps[mapId].started) {
        return;
    }

    if (!g.maps[mapId].isStarting) {
        g.maps[mapId].isStarting = true;
    }

    setInterval(function() {
        var text;
        if(countdown === countdownFrom){
            text = 'Game is starting...';
        }else if(countdown === 0){
            text = 'Start!';
        }else{
            text = ''+countdown;
        }

        if (text) {
            g.io.to(mapId).emit('startGameCountdown', text);
            if (countdown <= 0) {
                g.maps[mapId].start();
                clearInterval(this);
            }
        }

        countdown--;

    }, 1000);
}

function onResetGame(data) {
    if (!g.maps[data.mapId]) {
        util.log("Map not found: " + data.mapId);
        return;
    }

    g.maps[data.mapId].reset();
    g.io.to(data.mapId).emit('resetGame');
}

// Fetch one player
function playerById(id) {
    for (var i = 0; i < g.players.length; i++) {
        if (g.players[i].id === id) {
            return g.players[i];
        }
    }
    return false;
}

// Main update loop
function step() {
    var now = Date.now();
    if (!g.time.now) {
        g.time.now = now;
    }
    var elapsed = now - g.time.now;
    g.maps['default'].update(elapsed / 1000);
    g.time.now = now;
}

module.exports = init;