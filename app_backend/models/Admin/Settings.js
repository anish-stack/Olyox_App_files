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

    CabServicesSetiings:{
        isRainModeOn:{
            type: Boolean,
            default: false
        },
        rainSurge:{
            type: Number,
            default: 15
        },
        rangeOfDriversShowUser:{
            type: Number,
            default: 5   //in meter
        },
        isOnMaintaine:{
            type: Boolean,
            default: false
        },
        priceForFirst3Km:{
            type: Number,
            default: 70
        },
        priceHikeAfter3KmAddOn:{
            type: Number,
            default: 100
        },

    },
    ParcelServicesSetiings:{
        isRainModeOn:{
            type: Boolean,
            default: false
        },
        rainSurge:{
            type: Number,
            default: 15
        },
        rangeOfDriversShowUser:{
            type: Number,
            default: 5   //in meter
        },
        isOnMaintaine:{
            type: Boolean,
            default: false
        },
        price:{
            type: Number,
            default: 70
        },
       

    },
    
   
});

SettingsSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Settings', SettingsSchema);