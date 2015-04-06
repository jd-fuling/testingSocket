/**
 * Created by jordrevl on 21.03.2015.
 */

var chat = function(io) {
    function parseCommand(client, msg){
        if(msg == '/admin'){
            client.admin = true;
            client.emit('systemMessage', 'you are now admin');
            return;
        }
        if(msg.indexOf('/name') === 0){
            // second param == the name to set
            var nameToSet = msg.substring('/name'.length, msg.length);
            if(nameToSet.length === 0){
                client.emit('systemMessage', 'please provide a name after the command');
                return;
            }
            client.name = nameToSet;
            return;
        }
        if(msg.indexOf('/who') === 0){
            // send a list over connected users
            var list = 'connected clients: \n';
            for (var socketId in io.sockets.sockets) {
                if(io.sockets.sockets.hasOwnProperty(socketId)) {
                    list += '('+io.sockets.sockets[socketId].id+') ' + io.sockets.sockets[socketId].name + '\n';
                }
            }
            client.emit('systemMessage', list);
        }
    }

    io.on('connection', function(client){
        client.emit('connected', client.id);
        client.on('chat message', function(msg){
            if(msg.charAt(0) == '/'){
                // special command?
                parseCommand(client, msg);
            }else{
                io.emit('chat message', {sender: {id: client.id, name: client.name}, message: msg});
            }
        });
    });
};

module.exports = chat;