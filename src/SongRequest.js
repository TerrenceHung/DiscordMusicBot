/**
 * Class representing a song request.
 */
class SongRequest {
    /**
     * Creates a song request.
     *
     * @constructor
     * @this {SongRequest}
     * @param {string} title The title of the song
     * @param {string} url The YouTube url of the song
     * @param {string} duration The duration of the song
     * @param {string} requester The username of the person who requested the song
     */
    constructor(title, url, duration, requester) {
        this.title = title;
        this.url = url;
        this.duration = duration;
        this.requester = requester;
    }
}

module.exports = SongRequest;
