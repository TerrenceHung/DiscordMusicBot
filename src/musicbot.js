var fs = require('fs');
var Discord = require('discord.js');
var youtubeStream = require('youtube-audio-stream');
var Helpers = require('./helpers');
var TooLongError = require('./TooLongError');
var SongRequest = require('./SongRequest');

var bot = new Discord.Client();
var token;
var messageChannel;
var currentVoiceChannel = null;
var songQueue = [];
var dispatcher = null;
var repeat = false;
var volume = 50;
var invalidIfNoSong = ['.pause', '.resume', '.skip','.repeat', '.stoprepeat'];

/**
 * Plays the given song to the voice connection and registers end song event.
 *
 * @param {VoiceConnection} connection The bot's current voice connection
 * @param songRequest Information about the song request
 * @param songRequest.name The username of the person that created this request
 * @param songRequest.song The URL of the YouTube video to play
 */
function playSong(connection, songRequest) {
    dispatcher = connection.playStream(youtubeStream(songRequest.url));
    dispatcher.setVolume(Helpers.downscaleVolume(volume));
    messageChannel.sendMessage('Now playing `' + songRequest.title + '` (' + songRequest.duration
        + '), requested by `' + songRequest.requester + '`.');
    bot.user.setGame(songRequest.title);

    dispatcher.on('end', function() {
        bot.user.setGame();
        if (repeat) {
            playSong(connection, songQueue[0]);
        } else {
            // remove song that just finished from the queue
            songQueue.shift();
            // disconnect if queue is empty, otherwise play the next song
            if (songQueue.length) {
                playSong(connection, songQueue[0]);
            } else {
                connection.disconnect();
                currentVoiceChannel = null;
                dispatcher = null;
            }
        }
    });
}

try {
    token = fs.readFileSync(__dirname + '/../token', 'utf8');
} catch (err) {
    console.log('Could not open token file');
    process.exit();
}

process.on('SIGINT', function() {
    bot.destroy();
    process.exit();
});

bot.on('ready', function() {
    console.log('Bot ready');
});

bot.on('message', function(msg) {
    let prefix = '.';
    // if not a bot command or message was sent from bot then do nothing
    if (!(msg.content.startsWith(prefix)) || msg.author.bot) {
        return;
    }
    messageChannel = msg.channel;
    if (msg.content.startsWith(prefix + 'play')) {
        // print message if author is not in a voice channel
        var msgSender = msg.author;
        // get all voice channels and check if the sender is one of them
        // only get channels from the server that the message was sent from
        var allChannels = msg.guild.channels.array();
        // filter for voice channels
        var voiceChannels = [];
        for (let i = 0; i < allChannels.length; i++) {
            if (allChannels[i].type === 'voice') {
                voiceChannels.push(allChannels[i]);
            }
        }
        // check for the voice channel the sender is in, return if not in one
        var channelToStream = null;
        for (let i = 0; i < voiceChannels.length; i++) {
            let channelMembers = voiceChannels[i].members.array();
            let channelFound = false;
            for (let j = 0; j < channelMembers.length; j++) {
                if (channelMembers[j].user.id === msgSender.id) {
                    channelToStream = voiceChannels[i];
                    channelFound = true;
                    break;
                }
            }
            if (channelFound) {
                break;
            }
        }
        if (channelToStream === null) {
            messageChannel.sendMessage('You must be in a voice channel to play a song.');
            return;
        } else if (currentVoiceChannel !== null && channelToStream.id !== currentVoiceChannel.id) {
            messageChannel.sendMessage('The bot is currently playing music in `'
                + currentVoiceChannel.name + '`. Please join that voice channel before requesting '
                + 'songs.');
            return;
        }

        // if the bot is already inside a voice channel, then it's playing music
        var previouslyActive = currentVoiceChannel === null ? false : true;

        var songUrl = msg.content.split(' ')[1];
        Helpers.getSongInfo(songUrl).then(function(info) {
            // only process the song if the info can be obtained
            var songRequest = new SongRequest(info.title, songUrl, info.duration,
                msg.author.username);
            songQueue.push(songRequest);
            if (!previouslyActive) {
                // not playing anything, so join a channel and play
                channelToStream.join().then(function(connection) {
                    currentVoiceChannel = channelToStream;
                    playSong(connection, songRequest);
                });
            } else {
                messageChannel.sendMessage('`' + songRequest.title + '` (' + songRequest.duration
                    + ') added to song queue.');
            }
        }, function(error) {
            if (error instanceof TooLongError) {
                messageChannel.sendMessage('Songs that are over a day in length cannot be '
                    + 'requested.');
            } else {
                console.log(error);
                messageChannel.sendMessage('There was an error processing your song request. '
                    + 'Please try again.');
            }
        });
    } else if (msg.content === prefix + 'queue') {
        if (!songQueue.length) {
            messageChannel.sendMessage('No songs in queue.');
        } else {
            var queueMessage = '';
            // wrap url in angled brackets to prevent embed
            queueMessage += 'Currently playing `' + songQueue[0].title + '` ('
                + songQueue[0].duration + '), requested by `' + songQueue[0].requester
                + '`.\n<' + songQueue[0].url + '>\n';
            if (songQueue.length > 1) {
                queueMessage += 'Up next:\n';
                for (let i = 1; i < songQueue.length; i++) {
                    queueMessage += i + ') `' + songQueue[i].title + '` ('
                        + songQueue[i].duration + '), requested by `' + songQueue[i].requester
                        + '`.\n';
                }
            }
            // cut out the last \n
            messageChannel.sendMessage(queueMessage.slice(0, -1));
        }
    } else if (dispatcher === null && invalidIfNoSong.indexOf(msg.content) !== -1) {
        // these commands are invalid if no song is playing
        messageChannel.sendMessage('No song is currently being played.');
    } else if (msg.content === prefix + 'pause') {
        var resumeMsg = 'Type `.resume` to resume playback.';
        if (dispatcher.paused) {
            messageChannel.sendMessage('Song is already paused. ' + resumeMsg);
        } else {
            dispatcher.pause();
            messageChannel.sendMessage('Playback paused. ' + resumeMsg);
        }
    } else if (msg.content === prefix + 'resume') {
        var pauseMsg = 'Type `.pause` to pause playback.';
        if (!dispatcher.paused) {
            messageChannel.sendMessage('Song is already playing. ' + pauseMsg);
        } else {
            dispatcher.resume();
            messageChannel.sendMessage('Playback resumed. ' + pauseMsg);
        }
    } else if (msg.content === prefix + 'skip') {
        dispatcher.end();
    } else if (msg.content === prefix + 'repeat') {
        repeat = true;
        messageChannel.sendMessage('`' + songQueue[0].title + '` is now playing on repeat. Type '
            + '`.stoprepeat` to continue playing song queue.')
    } else if (msg.content === prefix + 'stoprepeat') {
        repeat = false;
        messageChannel.sendMessage('Repeat mode disabled. Type `.repeat` to play the current song '
            + 'on repeat.');
    } else if (msg.content.startsWith(prefix + 'volume')) {
        // if no arguments, then just print current volume
        if (msg.content === prefix + 'volume') {
            messageChannel.sendMessage('The current volume is ' + volume + '.');
            return;
        }
        var inVolume = Number(msg.content.split(' ')[1]);
        if (inVolume < 0 || inVolume > 100) {
            messageChannel.sendMessage('Please enter a value between 0 and 100 inclusive.');
            return;
        }
        volume = inVolume;
        // if a song is currently playing then change the volume of it
        if (dispatcher !== null) {
            dispatcher.setVolume(Helpers.downscaleVolume(volume));
        }
        messageChannel.sendMessage('Volume changed to ' + volume + '.');
    }
});

bot.login(token);
