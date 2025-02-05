const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const ParcelRequestSchema = new Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    pickupLocation: {
        type: String,
        required: true
    },
    pickupGeo: {
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
    dropoffLocation: {
        type: String,
        required: true
    },
    droppOffGeo: {
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
    parcelDetails: {
        weight: {
            type: Number,
            required: true
        },
        dimensions: {
            length: {
                type: Number,
                required: true
            },
            width: {
                type: Number,
                required: true
            },
            height: {
                type: Number,
                required: true
            }
        },
        description: {
            type: String,
            required: true
        }
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'in_transit', 'delivered', 'cancelled'],
        default: 'pending'
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ParcelBikeRegister',
        default: null
    },
    price: {
        type: Number,
        required: true
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

module.exports = mongoose.model('ParcelRequest', ParcelRequestSchema);