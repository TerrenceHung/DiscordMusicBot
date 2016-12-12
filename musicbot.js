var fs = require('fs');
var Discord = require('discord.js');
var youtubeStream = require('youtube-audio-stream');
var request = require('request');

var bot = new Discord.Client();
var token;
var youtubeApiKey;
var channelOfLastMessage;
var currentVoiceChannel = null;
var songQueue = [];

/**
 * Gets the ID of a YouTube video given the video URL.
 * taken from https://gist.github.com/takien/4077195
 *
 * @param {String} url The url of the YouTube video
 * @return {String} The ID of the video
 */
function youtubeGetId(url){
    var ID = '';
    url = url.replace(/(>|<)/gi,'').split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
    if (url[2] !== undefined) {
        ID = url[2].split(/[^0-9a-z_\-]/i);
        ID = ID[0];
    } else {
        ID = url;
    }
    return ID;
}

/**
 * Gets the name of the song given a YouTube url.
 *
 * @param {String} url The url of the YouTube video
 * @return {Promise<String>} A promise to the video name
 */
function getSongName(url) {
    return new Promise(function(resolve) {
        var videoId = youtubeGetId(url);
        // get response from youtube API and convert JSON to javascript object
        // request url from here
        // http://stackoverflow.com/questions/28018792/how-to-get-youtube-video-title-with-v3-url-api-in-javascript-w-ajax-json
        var ytResponseUrl = 'https://www.googleapis.com/youtube/v3/videos?id=' +
            videoId + '&key=' + youtubeApiKey + '&fields=items(snippet(title))&part=snippet';
        request(ytResponseUrl, function(error, response, body) {
            if (!error && response.statusCode === 200) {
                var title = JSON.parse(body)['items'][0]['snippet']['title'];
                resolve(title);
            }
        });
    });
}

/**
 * Plays the given song to the voice connection and registers end song event.
 *
 * @param {VoiceConnection} connection The bot's current voice connection
 * @param {String} song The url of the YouTube video to play
 */
function playSong(connection, song) {
    var dispatcher = connection.playStream(youtubeStream(song));
    getSongName(song).then(function(title) {
        channelOfLastMessage.sendMessage('Now playing `' + title + '`');
    });

    dispatcher.on('end', function() {
        // disconnect if queue is empty, otherwise play the next song
        if (songQueue.length) {
            // pop first element to get next song
            playSong(connection, songQueue.shift());
        } else {
            connection.disconnect();
            currentVoiceChannel = null;
        }
    });
}

try {
    token = fs.readFileSync('token', 'utf8');
} catch (err) {
    console.log('Could not open token file');
    process.exit();
}

try {
    youtubeApiKey = fs.readFileSync('youtube_api_key', 'utf8');
} catch (err) {
    console.log('Could not open Youtube API Key file');
    process.exit();
}

bot.on('ready', function() {
    console.log('Bot ready');
});

bot.on('message', function(msg) {
    let prefix = '.';
    channelOfLastMessage = msg.channel;
    // if not a bot command or message was sent from bot then do nothing
    if (!(msg.content.startsWith(prefix)) || msg.author.bot) {
        return;
    }

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
            channelOfLastMessage.sendMessage('You must be in a voice channel to play a song.');
            return;
        } else if (currentVoiceChannel !== null && channelToStream.id !== currentVoiceChannel.id) {
            channelOfLastMessage.sendMessage('The bot is currently playing music in `'
                + currentVoiceChannel.name + '`. Please join that voice channel before requesting '
                + 'songs.');
            return;
        }

        // if the bot is already inside a voice channel, then it's playing music
        var previouslyActive = currentVoiceChannel === null ? false : true;

        var songUrl = msg.content.split(' ')[1];
        if (!previouslyActive) {
            // not playing anything, so join a channel and play
            channelToStream.join().then(function(connection) {
                currentVoiceChannel = channelToStream;
                playSong(connection, songUrl);
            });
        } else {
            // queue up the next song
            songQueue.push(songUrl);
            getSongName(songUrl).then(function(title) {
                channelOfLastMessage.sendMessage('`' + title + '` added to song queue');
            });
        }
    }
});

bot.login(token);