var constants = require('./constants');

// http://stackoverflow.com/a/18090775/5737211
module.exports = function(mongoose) {
    var serverSchema = new mongoose.Schema({
        _id: String,
        volume: {
            type: Number,
            default: constants.VOLUME
        }
    });

    var models = {
        Server: mongoose.model('Server', serverSchema)
    }

    return models;
}
