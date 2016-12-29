class TooLongError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TooLongError';
        this.message = message || 'Song is over a day in length';
    }
}

module.exports = TooLongError;
