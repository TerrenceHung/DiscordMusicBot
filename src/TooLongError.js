function TooLongError(message) {
    this.name = 'TooLongError';
    this.message = message || 'Song is over a day in length';
    this.stack = (new Error()).stack;
}

TooLongError.prototype = Object.create(Error.prototype);
TooLongError.prototype.constructor = TooLongError;

module.exports = TooLongError;
