var youtubeStream = require('youtube-audio-stream');
var validator = require('validator');
var helpers = require('./helpers');
var SongRequest = require('./SongRequest');
var TooLongError = require('./TooLongError');

/**
 * Class that controls all of the bot's actions with a server.
 */
class ServerController {
    /**
     * Creates a server controller.
     *
     * @constructor
     * @this {ServerController}
     * @param {Discord.Client} bot A Discord bot
     * @param {string} id The id of the server
     * @param {Discord.Guild} server The server on Discord
     * @param {number} volume The volume of the music from a scale of 0-100 inclusive
     */
    constructor(bot, id, server, volume) {
        this._bot = bot;
        this._id = id;
        this._server = server;
        this._volume = volume;
        this._repeat = false;
        this._messageChannel = null;
        this._currentVoiceChannel = null;
        this._songQueue = [];
        this._dispatcher = null;
    }

    /**
     * Plays the given song to the voice connection and registers end song event.
     *
     * @this {ServerController}
     * @private
     * @param {Discord.VoiceConnection} connection The bot's current voice connection
     * @param songRequest Information about the song request
     * @param songRequest.name The username of the person that created this request
     * @param songRequest.song The URL of the YouTube video to play
     */
    _playSong(connection, songRequest) {
        this._dispatcher = connection.playStream(youtubeStream(songRequest.url));
        this._dispatcher.setVolume(helpers.downscaleVolume(this._volume));
        this._messageChannel.sendMessage('Now playing `' + songRequest.title + '` ('
            + songRequest.duration + '), requested by `' + songRequest.requester + '`.');

        this._dispatcher.on('end', () => {
            if (this._repeat) {
                this._playSong(connection, this._songQueue[0]);
            } else {
                // remove song that just finished from the queue
                this._songQueue.shift();
                // disconnect if queue is empty, otherwise play the next song
                if (this._songQueue.length) {
                    this._playSong(connection, this._songQueue[0]);
                } else {
                    connection.disconnect();
                    this._currentVoiceChannel = null;
                    this._dispatcher = null;
                }
            }
        });
    }

    /**
     * Processes a song request and either plays the song or sends an error message.
     *
     * @this {ServerController}
     * @private
     * @param {string} videoId The id of the YouTube video
     * @param {string} songUrl The url of the YouTube video
     * @param {Discord.VoiceChannel} channelToStream The voice channel to stream the song to
     * @param {string} username The name of the user who requested the song
     */
    _processSong(videoId, songUrl, channelToStream, username) {
        // if the bot is already inside a voice channel, then it's playing music
        var previouslyActive = this._currentVoiceChannel === null ? false : true;
        helpers.getSongInfo(videoId).then(info => {
            // only process the song if the info can be obtained
            var songRequest = new SongRequest(info.title, songUrl, info.duration, username);
            this._songQueue.push(songRequest);
            if (!previouslyActive) {
                // not playing anything, so join a channel and play
                channelToStream.join().then(connection => {
                    this._currentVoiceChannel = channelToStream;
                    this._playSong(connection, songRequest);
                });
            } else {
                this._messageChannel.sendMessage('`' + songRequest.title + '` ('
                    + songRequest.duration + ') added to song queue.');
            }
        }, error => {
            if (error instanceof TooLongError) {
                this._messageChannel.sendMessage('Songs that are over a day in length cannot be '
                    + 'requested.');
            } else {
                console.log(error);
                this._messageChannel.sendMessage('There was an error processing your song request. '
                    + 'Please try again.');
            }
        });
    }

    /**
     * Plays a song or queues a song if there is one already playing.
     *
     * @this {ServerController}
     * @param {Discord.Message} msg The message that initiated this command
     */
    play(msg) {
        // print message if author is not in a voice channel
        var msgSender = msg.author;
        // get all voice channels and check if the sender is one of them
        // only get channels from the server that the message was sent from
        var allChannels = this._server.channels.array();
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
            this._messageChannel.sendMessage('You must be in a voice channel to play a song.');
            return;
        } else if (this._currentVoiceChannel !== null
                && channelToStream.id !== this._currentVoiceChannel.id) {
            this._messageChannel.sendMessage('The bot is currently playing music in `'
                + this._currentVoiceChannel.name + '`. Please join that voice channel before '
                + 'requesting songs.');
            return;
        }

        // check if a url or a search query was given
        var query = msg.content.split(' ').slice(1).join(' ').trim();
        // if there was nothing after .play then give an error message
        if (!query) {
            this._messageChannel.sendMessage('You must give a search query or URL for a YouTube '
                + 'video.');
            return;
        }
        var songUrl;
        var videoId;
        if (!validator.isURL(query)) {
            // use youtube api to search and get the first video id
            helpers.youtubeSearchVideos(query).then(result => {
                videoId = result.videoId;
                songUrl = `https://www.youtube.com/watch?v=${videoId}`;
                this._processSong(videoId, songUrl, channelToStream, msg.author.username);
            });
        } else {
            songUrl = query;
            videoId = helpers.youtubeGetId(query);
            this._processSong(videoId, songUrl, channelToStream, msg.author.username);
        }

    }

    /**
     * Lists all the songs in the queue.
     *
     * @this {ServerController}
     */
    queue() {
        if (!this._songQueue.length) {
            this._messageChannel.sendMessage('No songs in queue.');
        } else {
            var queueMessage = '';
            // wrap url in angled brackets to prevent embed
            queueMessage += 'Currently playing `' + this._songQueue[0].title + '` ('
                + this._songQueue[0].duration + '), requested by `' + this._songQueue[0].requester
                + '`.\n<' + this._songQueue[0].url + '>\n';
            if (this._songQueue.length > 1) {
                queueMessage += 'Up next:\n';
                for (let i = 1; i < this._songQueue.length; i++) {
                    queueMessage += i + ') `' + this._songQueue[i].title + '` ('
                        + this._songQueue[i].duration + '), requested by `'
                        + this._songQueue[i].requester + '`.\n';
                }
            }
            // cut out the last \n
            this._messageChannel.sendMessage(queueMessage.slice(0, -1));
        }
    }

    /**
     * Notifies the user of an invalid command if there is no song playing.
     *
     * @this {ServerController}
     */
    invalidCommand() {
        this._messageChannel.sendMessage('No song is currently being played.');
    }

    /**
     * Pauses the song currently playing.
     *
     * @this {ServerController}
     */
    pause() {
        var resumeMsg = 'Type `.resume` to resume playback.';
        if (this._dispatcher.paused) {
            this._messageChannel.sendMessage('Song is already paused. ' + resumeMsg);
        } else {
            this._dispatcher.pause();
            this._messageChannel.sendMessage('Playback paused. ' + resumeMsg);
        }
    }

    /**
     * Resumes the song if there is one paused.
     *
     * @this {ServerController}
     */
    resume() {
        var pauseMsg = 'Type `.pause` to pause playback.';
        if (!this._dispatcher.paused) {
            this._messageChannel.sendMessage('Song is already playing. ' + pauseMsg);
        } else {
            this._dispatcher.resume();
            this._messageChannel.sendMessage('Playback resumed. ' + pauseMsg);
        }
    }

    /**
     * Skips the current song.
     *
     * @this {ServerController}
     */
    skip() {
        this._dispatcher.end();
    }

    /**
     * Sets the current song on repeat.
     *
     * @this {ServerController}
     */
    repeat() {
        this._repeat = true;
        this._messageChannel.sendMessage('`' + this._songQueue[0].title + '` is now playing on '
            + 'repeat. Type `.stoprepeat` to continue playing song queue.')
    }

    /**
     * Stops repeat mode.
     *
     * @this {ServerController}
     */
    stopRepeat() {
        this._repeat = false;
        this._messageChannel.sendMessage('Repeat mode disabled. Type `.repeat` to play the current '
         + 'song on repeat.');
    }

    /**
     * Notifies the user of the current volume.
     *
     * @this {ServerController}
     */
    getVolume() {
        this._messageChannel.sendMessage('The current volume is ' + this._volume + '.');
    }

    /**
     * Notifies the user the volume they entered is invalid.
     *
     * @this {ServerController}
     */
    invalidVolume() {
        this._messageChannel.sendMessage('Please enter a value between 0 and 100 inclusive.');
    }

    /**
     * Sets the volume of the music to the given volume.
     *
     * @this {ServerController}
     * @param {number} inVolume The new volume of the music
     */
    setVolume(inVolume) {
        this._volume = inVolume;
        // if a song is currently playing then change the volume of it
        if (this._dispatcher !== null) {
            this._dispatcher.setVolume(helpers.downscaleVolume(this._volume));
        }
        this._messageChannel.sendMessage('Volume changed to ' + this._volume + '.');
    }

    /**
     * Checks if the server is currently playing a song.
     *
     * @this {ServerController}
     * @return {boolean} true if there is a song playing, false otherwise
     */
    isPlaying() {
        return this._dispatcher !== null;
    }

    /**
     * @this {ServerController}
     * @param {Discord.Channel} channel The channel the message was sent in
     */
    set messageChannel(channel) {
        this._messageChannel = channel;
    }
}

module.exports = ServerController;
