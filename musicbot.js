var fs = require('fs');
var Discord = require('discord.js');
var youtubeStream = require('youtube-audio-stream');
var request = require('request');

var bot = new Discord.Client();
var token;
var youtubeApiKey;
var messageChannel;
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
    return new Promise(function(resolve, reject) {
        var videoId = youtubeGetId(url);
        // get response from youtube API and convert JSON to javascript object
        // request url from here
        // http://stackoverflow.com/questions/28018792/how-to-get-youtube-video-title-with-v3-url-api-in-javascript-w-ajax-json
        var ytResponseUrl = 'https://www.googleapis.com/youtube/v3/videos?id=' +
            videoId + '&key=' + youtubeApiKey + '&fields=items(snippet(title))&part=snippet';
        request(ytResponseUrl, function(error, response, body) {
            if (!error && response.statusCode === 200) {
                try {
                    var title = JSON.parse(body)['items'][0]['snippet']['title'];
                } catch (err) {
                    reject(Error('Could not get song name.'));
                }
                resolve(title);
            } else {
                reject(Error('Could not get song name.'));
            }
        });
    });
}

/**
 * Plays the given song to the voice connection and registers end song event.
 *
 * @param {VoiceConnection} connection The bot's current voice connection
 * @param songRequest Information about the song request
 * @param songRequest.name The username of the person that created this request
 * @param songRequest.song The URL of the YouTube video to play
 */
function playSong(connection, songRequest) {
    var dispatcher = connection.playStream(youtubeStream(songRequest.url));
    messageChannel.sendMessage('Now playing `' + songRequest.title + '`, requested by `'
        + songRequest.requester + '`.');

    dispatcher.on('end', function() {
        // remove song that just finished from the queue
        songQueue.shift();
        // disconnect if queue is empty, otherwise play the next song
        if (songQueue.length) {
            playSong(connection, songQueue[0]);
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
        getSongName(songUrl).then(function(title) {
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
                getSongName(songUrl).then(function(title) {
                    messageChannel.sendMessage('`' + title + '` added to song queue.');
                });
            }
        }, function(error) {
            messageChannel.sendMessage(error + ' Please try again.');
        });
    } else if (msg.content.startsWith(prefix + 'queue')) {
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
    }
});

bot.login(token);