/**
 * Created by jordrevl on 14.03.2015.
 */
var game = new Phaser.Game(800, 600, Phaser.AUTO, 'phaser', { preload: preload, create: create, update: update });
var socket;

var players = [];
var myId;

function preload() {
    console.log(socket);
    game.load.image('sky', '/gameassets/sprites/sky.png');
    game.load.image('star', '/gameassets/sprites/star.png');
    game.load.image('ground', '/gameassets/sprites/platform.png');
    game.load.spritesheet('dude', '/gameassets/sprites/dude.png', 32, 48);

    socket = io('ws://localhost:3005');
    socket.on('connect', function(){
        console.log("connected...");
        socket.on('servedId', function(data){
            console.log("I have an ID! ", data);
            myId = data;
        });

        socket.on('newPlayer', function(pl){
            console.log("a new player joined ", pl.id);
            // Player
            var p = game.add.sprite(32, game.world.height - 150, 'dude');
            game.physics.arcade.enable(p);

            p.body.bounce.y = 0.2;
            p.body.gravity.y = 300;
            p.body.collideWorldBounds = true;

            p.animations.add('left', [0,1,2,3], 10, true);
            p.animations.add('right', [5,6,7,8], 10, true);
            p.id = pl.id;
            players.push(p);
        });

        socket.on('positionUpdate', function(updatedPlayer){
            for(var i=0;i<players.length;i++){
                if (players[i].id == updatedPlayer.id){
                    players[i].body.position = updatedPlayer.position;
                }
            }
        });
    });
}
var platforms, player, cursors;
function create() {

    game.physics.startSystem(Phaser.Physics.ARCADE);

    game.add.sprite(0,0,'sky');
    platforms = game.add.group();
    platforms.enableBody = true;
    var ground = platforms.create(0, game.world.height - 64, 'ground');
    ground.scale.setTo(2,2);
    ground.body.immovable = true;
    var ledge = platforms.create(400, 400, 'ground');
    ledge.body.immovable = true;
    ledge = platforms.create(-150, 250, 'ground');
    ledge.body.immovable = true;

    // Player
    player = game.add.sprite(32, game.world.height - 150, 'dude');
    game.physics.arcade.enable(player);

    player.body.bounce.y = 0.2;
    player.body.gravity.y = 300;
    player.body.collideWorldBounds = true;

    player.animations.add('left', [0,1,2,3], 10, true);
    player.animations.add('right', [5,6,7,8], 10, true);
    player.id = myId;
    players.push(player);

    cursors = game.input.keyboard.createCursorKeys();
    game.stage.disableVisibilityChange = true;

}
var acceleration = 10,
    topspeed = 200;
function update() {
    game.physics.arcade.collide(players, platforms);

    if(cursors.left.isDown){
        if(Math.abs(player.body.velocity.x) < topspeed){
            player.body.velocity.x -= acceleration;
        }
        player.animations.play('left');
    }else if(cursors.right.isDown){
        if(Math.abs(player.body.velocity.x) < topspeed) {
            player.body.velocity.x += acceleration;
        }
        player.animations.play('right');
    }else{
        player.body.velocity.x = 0;
        player.animations.stop();
        player.frame = 4;
    }

    if(cursors.up.isDown && player.body.touching.down){
        player.body.velocity.y = -350;
    }

    simpleServerUpdate();

}


function simpleServerUpdate(){
    socket.emit('positionUpdate', player.body.position);
}