/**
 * Creates a song request.
 *
 * @constructor
 * @this {SongRequest}
 * @param {String} title The title of the song
 * @param {String} url The YouTube url of the song
 * @param {String} duration The duration of the song
 * @param {String} requester The username of the person who requested the song
 */
function SongRequest(title, url, duration, requester) {
    this.title = title;
    this.url = url;
    this.duration = duration;
    this.requester = requester;
}

module.exports = SongRequest;
