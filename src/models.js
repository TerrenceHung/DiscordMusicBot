var mongoose = require('mongoose');
var constants = require('./constants');

var serverSchema = new mongoose.Schema({
    _id: String,
    volume: {
        type: Number,
        default: constants.VOLUME
    }
});

module.exports = {
    Server: mongoose.model('Server', serverSchema)
}