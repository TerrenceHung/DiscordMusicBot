var fs = require('fs');
var request = require('request');
var TooLongError = require('./TooLongError');

var youtubeApiKey;

fs.readFileSync(__dirname + '/../youtube_api_key', 'utf8', function (err, data) {
    if (err) {
        console.log('Could not open YouTube API Key file');
        process.exit();
    }
    youtubeApiKey = data;
});

/**
 * Gets the ID of a YouTube video given the video URL.
 * Taken from https://gist.github.com/takien/4077195
 *
 * @param {string} url The url of the YouTube video
 * @return {string} The ID of the video
 */
function youtubeGetId(url) {
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
 * Converts a time in ISO 8601 format to HH:MM:SS or MM:SS if the time does not contain hours,
 * or M:SS if the time does not contain hours and is less than 10 minutes.
 *
 * @param {string} time The time in ISO 8601 format
 * @return {string} The time formatted in HH:MM:SS or MM:SS
 * @throws {TooLongError} Time must be less than a day
 */
function convertTime(time) {
    if (time.indexOf('Y') !== -1 || time.indexOf('M') !== -1
        && time.indexOf('M') < time.indexOf('T') || time.indexOf('D') !== -1
        || time.indexOf('W') !== -1) {
        throw new TooLongError();
    }
    // youtube api returns times like this
    // PT1H54M26S
    // PT4M25S
    // PT8S
    var formatted = '';
    var timeidx = time.indexOf('T');
    var houridx = time.indexOf('H');
    var minuteidx = time.indexOf('M');
    var secondidx = time.indexOf('S');
    if (secondidx === -1) {
        // no seconds in video
        formatted += '00';
    } else {
        var seconds;
        if (minuteidx !== -1) {
            // number of seconds is in between M and S
            seconds = time.substring(minuteidx + 1, secondidx);
        } else if (houridx !== -1) {
            // number of seconds is in between H and S
            seconds = time.substring(houridx + 1, secondidx);
        } else {
            // number of seconds is in between T and S
            seconds = time.substring(timeidx + 1, secondidx);
        }
        formatted += seconds.length > 1 ? seconds : '0' + seconds;
    }
    if (minuteidx === -1) {
        formatted = '0:' + formatted;
    } else {
        var minutes;
        if (houridx !== -1) {
            // number of minutes is in between H and M
            minutes = time.substring(houridx + 1, minuteidx);
        } else {
            // number of minutes is in between T and M
            minutes = time.substring(timeidx + 1, minuteidx);
        }
        formatted = minutes + ':' + formatted;
    }
    if (houridx !== -1) {
        // number of hours is in between T and H
        var hours = time.substring(timeidx + 1, houridx);
        var minutes = formatted.split(':')[0];
        // if there were no minutes or minutes are single digit, then prepend another 0
        if (minuteidx === -1 || minutes.length === 1) {
            formatted = '0' + formatted;
        }
        formatted = hours + ':' + formatted;
    }
    return formatted;
}

module.exports = {
    /**
     * Gets the name and duration of the song given a YouTube url.
     *
     * @param {string} url The url of the YouTube video
     * @return {Promise<string[]>} A promise to the video info
     */
    getSongInfo: function (url) {
        return new Promise(function (resolve, reject) {
            var videoId = youtubeGetId(url);
            // get response from youtube API and convert JSON to javascript object
            var ytResponseUrl = 'https://www.googleapis.com/youtube/v3/videos?id=' + videoId
                + '&key=' + youtubeApiKey + '&part=snippet,contentDetails&fields=items(snippet('
                + 'title),%20contentDetails(duration))';
            request(ytResponseUrl, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    try {
                        var title = JSON.parse(body)['items'][0]['snippet']['title'];
                        var rawDuration = JSON.parse(body)['items'][0]['contentDetails']['duration'];
                    } catch (err) {
                        reject(Error('Could not get song info.'));
                    }
                    try {
                        var duration = convertTime(rawDuration);
                    } catch (err) {
                        if (err instanceof TooLongError) {
                            reject(err);
                        }
                    }
                    resolve({title: title, duration: duration});
                } else {
                    reject(Error('Could not get song info.'));
                }
            });
        });
    },
    /**
     * Converts the volume from a scale from 0-100 to a scale from 0-2.
     *
     * @param {number} volume The volume in a scale from 0-100
     * @return {number} The volume in a scale from 0-2
     */
    downscaleVolume: function (volume) {
        return volume * 2 / 100;
    }
}
