/**
 * An error for when a song is too long.
 */
class TooLongError extends Error {
    /**
     * Creates a too long error.
     *
     * @constructor
     * @this {TooLongError}
     * @param {string} [message] The custom message for the error
     */
    constructor(message) {
        super(message);
        this.name = 'TooLongError';
        this.message = message || 'Song is over a day in length';
    }
}

module.exports = TooLongError;
