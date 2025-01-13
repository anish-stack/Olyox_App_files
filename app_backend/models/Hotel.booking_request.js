const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const BookingRequestSchema = new Schema({
    guestName: {
        type: String,
        required: true
    },
    guestEmail: {
        type: String,
        required: true
    },
    guestPhone: {
        type: String,
    },
    guest_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    checkInDate: {
        type: Date,
        required: true
    },
    checkOutDate: {
        type: Date,
        required: true
    },
    listing_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hotel_Listing',
    },
    numberOfGuests: {
        type: Number,
        required: true
    },

    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Cancelled'],
        default: 'Pending'
    },
    booking_payment_done: {
        type: Boolean,
        default: false
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('BookingRequest', BookingRequestSchema);