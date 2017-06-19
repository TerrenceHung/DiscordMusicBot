var Discord = require('discord.js');
var mongoose = require('mongoose');
var models = require('./models')(mongoose);
var constants = require('./constants');
var ServerController = require('./ServerController');
var configs = require('./configs');

var bot = new Discord.Client();
var db = mongoose.connection;
var invalidIfNoSong = ['.pause', '.resume', '.skip','.repeat', '.stoprepeat'];
var servers = {};

process.on('SIGINT', function () {
    bot.destroy();
    mongoose.disconnect();
    process.exit();
});

bot.on('ready', function () {
    console.log('Bot ready');
});

bot.on('message', function (msg) {
    let prefix = '.';
    // if not a bot command or message was sent from bot then do nothing
    if (!(msg.content.startsWith(prefix)) || msg.author.bot) {
        return;
    }

    var serverId = msg.guild.id;
    if (!(serverId in servers)) {
        // if the server is not registered yet, then don't allow commands to go through
        // until the ServerController has been created
        servers[serverId] = [];
        models.Server.findById(serverId, function (error, server) {
            if (error) {
                return;
            }

            var commandsToEmit = servers[serverId];
            // create a ServerController using info from db, or write new info to db if info
            // does not exist
            if (server === null) {
                servers[serverId] = new ServerController(bot, serverId, msg.guild,
                    constants.VOLUME);
                var newServer = new models.Server({_id: serverId});
                newServer.save();
            } else {
                servers[serverId] = new ServerController(bot, server._id, msg.guild, server.volume);
            }
            // now that ServerContoller is created, emit all the commands that didn't go through
            // from before
            commandsToEmit.forEach(function (element) {
                bot.emit('message', element);
            });
        });
    }

    // if the message is sent from a server that hasn't been registered yet, keep track of the
    // message
    if (servers[serverId] instanceof Array) {
        servers[serverId].push(msg);
        return;
    }

    var serverController = servers[serverId];
    serverController.messageChannel = msg.channel;

    if (msg.content.startsWith(prefix + 'play')) {
        serverController.play(msg);
    } else if (msg.content === prefix + 'queue') {
        serverController.queue();
    } else if (!serverController.isPlaying() && invalidIfNoSong.indexOf(msg.content) !== -1) {
        // these commands are invalid if no song is playing
        serverController.invalidCommand();
    } else if (msg.content === prefix + 'pause') {
        serverController.pause();
    } else if (msg.content === prefix + 'resume') {
        serverController.resume();
    } else if (msg.content === prefix + 'skip') {
        serverController.skip();
    } else if (msg.content === prefix + 'repeat') {
        serverController.repeat();
    } else if (msg.content === prefix + 'stoprepeat') {
        serverController.stopRepeat();
    } else if (msg.content.startsWith(prefix + 'volume')) {
        // if no arguments, then just print current volume
        if (msg.content === prefix + 'volume') {
            serverController.getVolume();
        } else {
            var inVolume = Number(msg.content.split(' ')[1]);
            if (inVolume < 0 || inVolume > 100) {
                serverController.invalidVolume();
            } else {
                serverController.setVolume(inVolume);
                // now write the new volume to db
                models.Server.update({_id: serverId}, {volume: inVolume}).exec();
            }
        }
    } else if (msg.content === prefix + 'stop') {
        serverController.stop();
    }
});

db.once('open', function () {
    bot.login(configs.discord_token);
});

mongoose.connect(configs.mongodb_uri);
