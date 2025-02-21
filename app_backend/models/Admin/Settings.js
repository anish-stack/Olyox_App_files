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

    cabServicesSettings: {
        isRainModeOn: {
            type: Boolean,
            default: false
        },
        rainSurge: {
            type: Number,
            default: 15
        },
        rangeOfDriversShowUser: {
            type: Number,
            default: 5  // in meters
        },
        isOnMaintenance: {
            type: Boolean,
            default: false
        },
        priceForFirst3Km: {
            type: Number,
            default: 70
        },
        priceHikeAfter3KmAddOn: {
            type: Number,
            default: 100
        },
    },

    parcelServicesSettings: {
        isRainModeOn: {
            type: Boolean,
            default: false
        },
        rainSurge: {
            type: Number,
            default: 15
        },
        rangeOfDriversShowUser: {
            type: Number,
            default: 5  // in meters
        },
        isOnMaintenance: {
            type: Boolean,
            default: false
        },
        price: {
            type: Number,
            default: 70
        },
    },

    ridesPrices: [{
        vehicleName: {
            type: String
        },
        price: {
            type: Number,
            default: 0
        },
        surgeOn: {
            type: Boolean,
            default: false
        },
        surgePrice: {
            type: Number,
            default: 0
        }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Settings', SettingsSchema);
