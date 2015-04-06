/**
    * Created by jordrevl on 21.03.2015.
    *
    */
var game = {
    players: [],
    status: {
        running: false
    }
};

module.exports = function(io) {
    console.log('Game program');

    function init(){
        game.players = [];
        game.status.running = true;
    }

    io.on('connection', function(s){
        if(game.players.indexOf(s.id) == -1){
            console.log('new player!');
            s.emit('servedId', s.id);
            s.broadcast.emit('newPlayer', {id: s.id});
            game.players.push(s.id);
        }
        
        s.on('disconnect', function(){
            console.log(s.id + " disconnected");
            var idx = game.players.indexOf(s.id);
            if(idx > -1){
                game.players.splice(idx, 1);
            }
        });

        s.on('positionUpdate', function(newPosition){
            io.sockets.emit('positionUpdate', {id: s.id, position: newPosition});
        });
        
        
    });

    // Called once when the server starts up
    init();
};