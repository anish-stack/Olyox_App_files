const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const RiderSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    rideVehicleInfo: {
        vehicleName: {
            type: String,
            required: true
        },
        vehicleType: {
            type: String
        },
        PricePerKm:{
            type: Number
        },
        VehicleNumber: {
            type: String,
            required: true,
            
        }
    },
    TotalRides: {
        type: Number,
    },
    Ratings: {
        type: Number,
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

RiderSchema.index({ location: '2dsphere' });
RiderSchema.index({ 'rideVehicleInfo.VehicleNumber': 1 });

module.exports = mongoose.model('Rider', RiderSchema);
