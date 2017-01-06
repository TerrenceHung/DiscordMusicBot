var mongoose = require('mongoose');

var serverSchema = new mongoose.Schema({
    _id: String,
    repeat: {
        type: Boolean,
        default: false
    },
    volume: {
        type: Number,
        default: 50
    }
});

module.exports = {
    Server: mongoose.model('Server', serverSchema)
}