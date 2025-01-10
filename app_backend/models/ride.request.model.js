const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const RideRequestSchema = new Schema({
    pickupLocation: {
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
    dropLocation: {
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
    currentLocation: {
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
    vehicleType:{
        type:String,
    },
    rideStatus: {
        type: String,
        enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
        default: 'pending'
    },
    pickup_desc:{
        type:String,
    },
    drop_desc:{
        type:String,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Create 2dsphere indexes for location fields
RideRequestSchema.index({ pickupLocation: '2dsphere' });
RideRequestSchema.index({ dropLocation: '2dsphere' });
RideRequestSchema.index({ currentLocation: '2dsphere' });

// Update the updatedAt field before saving
RideRequestSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('RideRequest', RideRequestSchema);
