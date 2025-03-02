const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const RidesSuggestionSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    priceRange: {
        type: String,
        required: true
    },
    status:{
        type: Boolean,
        default: false
      
    }
});

module.exports = mongoose.model('RidesSuggestion', RidesSuggestionSchema);