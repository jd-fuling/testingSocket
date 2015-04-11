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

 * Created by jordrevl on 06.04.2015.
 *
 */
var p2 = require('p2');
var Player = require('./Player');

/**
 * represents a map
 */
function Map(config){

    // Unique ID of the map
    this.mapId = config.mapId || '';

    this.players = config.players || [];

    // physics world
    this.world = new p2.World({
        // no gravity
        gravity: [0, 0],
        broadphase: new p2.SAPBroadphase()
    });

    var that = this;
    this.world.on('beginContact', function (e) {
        if (that.started) {
            if (e.shapeA === Player.SHAPE && e.shapeB === Player.ACTION_SHAPE) {
                e.bodyA.owner.damageWith(e.bodyB.owner);
            }
            if (e.shapeA === Player.ACTION_SHAPE && e.shapeB === Player.SHAPE) {
                e.bodyB.owner.damageWith(e.bodyA.owner);
            }
        }
    });

    /**
     * The map array.
     */
    this.map = config.map || [[]];

    /**
     * bodies added through updateMap
     */
    this.bodies = [];

    /**
     * Whether the game started or not.
     */
    this.isStarting = false;
    this.started = false;
    this.gameover = false;

    this.updateMap();
}

/**
 * Get random available position
 */
Map.prototype.getRandomPosition = function getRandomPosition() {
    var x = 0;
    var y = 0;
    while (this.map[y][x] === 1) {
        x = ~~(Math.random() * this.map[0].length);
        y = ~~(Math.random() * this.map.length);
    }

    return [x, y];
};

/**
 * A player joined the map
 */
Map.prototype.addPlayer = function addPlayer(player) {
    this.players.push(player);
    this.world.addBody(player.body);
};

/**
 * A player left the map
 */
Map.prototype.removePlayer = function removePlayer(player) {
    this.players.splice(this.players.indexOf(player), 1);
    this.world.removeBody(player.body);
};


/**
 * Update.
 */
Map.prototype.update = function update(timeStep) {
    for (var i = 0; i < this.players.length; i++) {
        this.players[i].update(timeStep);
    }
    this.world.step(timeStep);
};


/**
 * finds winner and set gameover to true if winner is found
 */
Map.prototype.findWinner = function () {
    if (!this.started) {
        return;
    }

    var alivePlayers = this.players.filter(function(player) {
        return player.alive;
    });
    if (alivePlayers.length === 1) {
        this.gameover = true;
        return alivePlayers[0];
    }

    return false;
};


/**
 * start the game
 */
Map.prototype.start = function () {
    console.log("Map starting!");
    this.isStarting = false;
    this.started = true;
};

/**
 * reset the things to the beginning
 */
Map.prototype.reset = function reset() {
    this.isStarting = false;
    this.started = false;
    this.gameover = false;
    for (var i = 0; i < this.players.length; i++) {
        this.players[i].reset();
    }
};


/**
 * Update physics map according to map
 */
Map.prototype.updateMap = function updateMap() {

    // Delete already created bodies
    if (this.bodies.length > 0) {
        var i = this.bodies.length;
        while (i--) {
            this.world.removeBody(this.bodies[i]);
        }
        this.bodies.length = 0;
    }


    for (var y = 0, h = this.map.length; y < h; y++) {
        for (var x = 0, w = this.map[0].length; x < w; x++) {
            // TODO: Optimize?
            var tileId = this.map[y][x];

            if (tileId === 1) {
                var body = new p2.Body({ position: [x, y] });
                body.addShape(Map.WALL_SHAPE);
                body.material = Map.WALL_MATERIAL;

                this.world.addBody(body);
                this.bodies.push(body);
            }
        }
    }
};

/**
 * Bind postStep to emit updates to clients
 */
Map.prototype.bindUpdateEvent = function bindUpdateEvent(io) {
    var that = this;
    this.world.on('postStep', function onPostStep() {
        io.to(that.mapId).emit('updatePlayers', {
            timestamp: Date.now(),
            players: that.players.map(function(player) { return player.serialize(); })
        });

        var player = that.findWinner();
        if (player) {
            io.to(that.mapId).emit('announceWinner', player.serialize());
        }
    });
};

/**
 * Make object with only necessary information to send across network.
 */
Map.prototype.serialize = function serialize() {
    return {
        map: this.map,
        mapId: this.mapId
    };
};


/**
 * Wall's material
 * 1: wall
 * 2: player
 * 3: action
 */
Map.WALL_MATERIAL = new p2.Material();

/**
 * Wall's shape
 */
Map.WALL_SHAPE = new p2.Rectangle(1, 1);
Map.WALL_SHAPE.collisionGroup = Math.pow(2, 1);
Map.WALL_SHAPE.collisionMask = Math.pow(2, 2);


module.exports = Map;