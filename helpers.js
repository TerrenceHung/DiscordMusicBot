var fs = require('fs');
var request = require('request');

var youtubeApiKey;

try {
    youtubeApiKey = fs.readFileSync('youtube_api_key', 'utf8');
} catch (err) {
    console.log('Could not open Youtube API Key file');
    process.exit();
}

/**
 * Gets the ID of a YouTube video given the video URL.
 * taken from https://gist.github.com/takien/4077195
 *
 * @param {String} url The url of the YouTube video
 * @return {String} The ID of the video
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

module.exports = {
    /**
     * Gets the name of the song given a YouTube url.
     *
     * @param {String} url The url of the YouTube video
     * @return {Promise<String>} A promise to the video name
     */
    getSongName: function(url) {
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
}