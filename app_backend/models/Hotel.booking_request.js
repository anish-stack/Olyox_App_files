const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const BookingRequestSchema = new Schema({
    guestInformation: [
        {
            guestName: {
                type: String,
                required: true
            },
            guestPhone: {
                type: String
            }
        }
    ],
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
        required: true
    },
    numberOfGuests: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Cancelled', 'Checkout'],
        default: 'Pending'
    },
    booking_payment_done: {
        type: Boolean,
        default: false
    },
    modeOfBooking: {
        type: String,
        enum: ['Online', 'Offline'],
        default: 'Online'
    },
    bookingAmount: {
        type: Number,
        default: 0
    },
    anyDiscountByHotel: {
        type: Number,
    },
    paymentMode: {
        type: String,
        enum: ['Cash', 'Online'],
        default: 'Cash'
    },
    HotelUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HotelUser',
    },
    BookingOtp: {
        type: Number,
    },
    BookingOtpExpiry: {
        type: Date,
    },
    isBookingDone: {
        type: Boolean,
        default: false
    },


    Booking_id: {
        type: String,
    }
}, { timestamps: true });

module.exports = mongoose.model('BookingRequest', BookingRequestSchema);
