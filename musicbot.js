var fs = require('fs');
var Discord = require('discord.js');
var youtubeStream = require('youtube-audio-stream');
var request = require('request');

var bot = new Discord.Client();
var token;
var youtubeApiKey;;
var currentChannel;
var songQueue = [];

// taken from https://gist.github.com/takien/4077195
function youtubeGetId(url){
    var ID = '';
    url = url.replace(/(>|<)/gi,'').split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
    if(url[2] !== undefined) {
        ID = url[2].split(/[^0-9a-z_\-]/i);
        ID = ID[0];
    } else {
        ID = url;
    }
    return ID;
}

function getSongName(videoUrl) {
    var videoId = youtubeGetId(videoUrl);
    // get response from youtube API and convert JSON to javascript object
    // request url from here
    // http://stackoverflow.com/questions/28018792/how-to-get-youtube-video-title-with-v3-url-api-in-javascript-w-ajax-json
    var ytResponseUrl = 'https://www.googleapis.com/youtube/v3/videos?id=' +
        videoId + '&key=' + youtubeApiKey + '&fields=items(snippet(title))&part=snippet';
    request(ytResponseUrl, (error, response, body) => {
        if (!error && response.statusCode === 200) {
            var videoData = JSON.parse(body)['items'][0]['snippet']['title'];
            sendMessage('Now playing `' + videoData + '`');
        }
    });
}

function sendMessage(msg) {
    currentChannel.sendMessage(msg);
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

bot.on('ready', () => {
    console.log('Bot ready');
});

bot.on('message', msg => {
    let prefix = '.';
    currentChannel = msg.channel;
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
            msg.channel.sendMessage('You must be in a voice channel to play a song.');
            return;
        }

        // join the voice channel and stream the video
        var songUrl = msg.content.split(' ')[1];
        channelToStream.join().then(connection => {
            var dispatcher = connection.playStream(youtubeStream(songUrl));
            getSongName(songUrl);
            dispatcher.on('end', () => {
                connection.disconnect();
            });
        });
    }
});

bot.login(token);