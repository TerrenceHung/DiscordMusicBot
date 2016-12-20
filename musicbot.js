var fs = require('fs');
var Discord = require('discord.js');
var youtubeStream = require('youtube-audio-stream');
var Helpers = require('./helpers');

var bot = new Discord.Client();
var token;
var messageChannel;
var currentVoiceChannel = null;
var songQueue = [];
var dispatcher = null;
var repeat = false;

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
    messageChannel.sendMessage('Now playing `' + songRequest.title + '`, requested by `'
        + songRequest.requester + '`.');

    dispatcher.on('end', function() {
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
    token = fs.readFileSync('token', 'utf8');
} catch (err) {
    console.log('Could not open token file');
    process.exit();
}

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
        var songRequest = {requester: msg.author.username, url: songUrl};
        Helpers.getSongName(songUrl).then(function(title) {
            // only process the song if the title can be obtained
            songRequest.title = title;
            songQueue.push(songRequest);
            if (!previouslyActive) {
                // not playing anything, so join a channel and play
                channelToStream.join().then(function(connection) {
                    currentVoiceChannel = channelToStream;
                    playSong(connection, songRequest);
                });
            } else {
                Helpers.getSongName(songUrl).then(function(title) {
                    messageChannel.sendMessage('`' + title + '` added to song queue.');
                });
            }
        }, function(error) {
            console.log(error);
            messageChannel.sendMessage('There was an error processing your song request. Please try again.');
        });
    } else if (msg.content === prefix + 'queue') {
        if (!songQueue.length) {
            messageChannel.sendMessage('No songs in queue.');
        } else {
            var queueMessage = '';
            // wrap url in angled brackets to prevent embed
            queueMessage += 'Currently playing `' + songQueue[0].title + '`, requested by `'
                + songQueue[0].requester + '`.\n<' + songQueue[0].url + '>\n';
            if (songQueue.length > 1) {
                queueMessage += 'Up next:\n';
                for (let i = 1; i < songQueue.length; i++) {
                    queueMessage += i + ') `' + songQueue[i].title + '`, requested by `'
                        + songQueue[i].requester + '`.\n';
                }
            }
            // cut out the last \n
            messageChannel.sendMessage(queueMessage.slice(0, -1));
        }
    } else if (dispatcher === null && ['.pause', '.resume', '.skip', '.repeat'].indexOf(msg.content) !== -1) {
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
    }
});

bot.login(token);