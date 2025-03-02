const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    appName: {
        type: String,
        required: true
    },
    appUrl: {
        type: String,
        required: true
    },
    adminEmail: {
        type: String,
        required: true
    },
    maintenanceMode: {
        type: Boolean,
        default: false
    },
    BasicFare: {
        type: Number,
        default: 0
    },
    BasicFarePerKm: {
        type: Number,
        default: 0
    },
    RainModeOn: {
        type: Boolean,
        default: false
    },
    RainModeFareOnEveryThreeKm: {
        type: Number,
        default: 0
    },
    ShowingRainOnApp: {
        type: Boolean,
        default: false
    },
    ShowingOfferScreenOnApp: {
        type: Boolean,
        default: false
    },
    foodDeliveryPrice:{
        type:Number,
        default:0
    },
    openMapApiKey: {
        type: String,
        default: ''
    },
    googleApiKey: {
        type: String,
        default: ''
    },
    trafficDurationPricePerMinute: {
        type: Number,
        default: 0
    },
    waitingTimeInMinutes: {
        type: Number,
        default: 0
    }

}, { timestamps: true });

module.exports = mongoose.model('Settings', SettingsSchema);
