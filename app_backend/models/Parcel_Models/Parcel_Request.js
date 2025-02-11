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
    totalKm: {
        type: Number,
    },
    driver_accept: {
        type: Boolean,
        default: false
    },
    driver_accept_time: {
        type: Date,
    },
    driver_deliver_time: {
        type: Date
    },
    driver_rating: {
        type: Date
    },
    customerName: {
        type: String
    },
    customerPhone: {
        type: String
    },
    money_collected: {
        type: Number
    },
    money_collected_mode: {
        type: String,

    },
    is_parcel_delivered:{
        type:Boolean,
        default:false
    },
    is_driver_reached:{
        type:Boolean,
    },
    is_driver_reached_time:{
        type:Date,
    },
    is_driver_reached_at_deliver_place:{
        type:Boolean,
    },
    is_driver_reached_at_deliver_place_time:{
        type:Date,
    },
    is_parcel_picked:{
        type:Boolean,
        default:false
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ParcelRequest', ParcelRequestSchema);