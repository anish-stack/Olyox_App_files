const BookingRequestSchema = require('../models/Hotel.booking_request');
const SendWhatsAppMessage = require('../utils/whatsapp_send');
const Crypto = require('crypto');

exports.makeBookingOffline = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: "Unauthorized: User ID is required" });
        }

        const userId = req.user.id;
        const bookingPrefix = "ROB";
        const bookingId = `${bookingPrefix}${Crypto.randomInt(100000, 999999)}`;
        const bookingOtp = Crypto.randomInt(100000, 999999); // Generate 6-digit OTP
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes

        const {
            guestInformation,
            checkInDate,
            checkOutDate,
            listing_id,
            numberOfGuests,
            booking_payment_done,
            modeOfBooking = "Offline",
            bookingAmount,
            paymentMode
        } = req.body || {};

        // Validate Required Fields
        const emptyFields = [];
        if (!guestInformation || guestInformation.length === 0) emptyFields.push('guestInformation');
        if (!checkInDate) emptyFields.push('checkInDate');
        if (!checkOutDate) emptyFields.push('checkOutDate');
        if (!listing_id) emptyFields.push('listing_id');

        if (emptyFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
                fields: emptyFields
            });
        }

        // Date Validations
        const today = new Date();
        if (new Date(checkInDate) < today) {
            return res.status(400).json({ success: false, message: "Check-in date cannot be in the past." });
        }
        if (new Date(checkOutDate) <= new Date(checkInDate)) {
            return res.status(400).json({ success: false, message: "Check-out date must be after check-in date." });
        }

        // Create New Booking
        const newBooking = new BookingRequestSchema({
            guestInformation,
            checkInDate,
            checkOutDate,
            listing_id,
            numberOfGuests: guestInformation.length || 0,
            booking_payment_done,
            modeOfBooking,
            bookingAmount,
            paymentMode,
            HotelUserId: userId,
            Booking_id: bookingId,
            BookingOtp: bookingOtp,
            BookingOtpExpiry: otpExpiry
        });

        await newBooking.save();

        // Send OTP via WhatsApp
        const guestPhone = guestInformation[0]?.guestPhone;
        if (guestPhone) {
            const message = `Your booking OTP: ${bookingOtp}. Please share it with the receptionist to confirm your booking. This OTP expires in 5 minutes.`;
            await SendWhatsAppMessage( message,guestPhone);
        }

        return res.status(201).json({
            success: true,
            message: "Booking created successfully! OTP sent for confirmation.",
            booking: newBooking,
            bookingId: bookingId
        });

    } catch (error) {
        console.error("Error creating booking:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Verify OTP and Confirm Booking
exports.verifyOtpForBooking = async (req, res) => {
    try {
        const { bookingId, otp } = req.body;

        if (!bookingId || !otp) {
            return res.status(400).json({ success: false, message: "Booking ID and OTP are required." });
        }

        const booking = await BookingRequestSchema.findOne({ Booking_id: bookingId });

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found." });
        }

        if (booking.isBookingDone) {
            return res.status(400).json({ success: false, message: "Booking is already confirmed." });
        }

        if (booking.BookingOtpExpiry < new Date()) {
            return res.status(400).json({ success: false, message: "OTP has expired. Please request a new OTP." });
        }

        if (booking.BookingOtp !== Number(otp)) {
            return res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
        }

        // Update booking status
        booking.isBookingDone = true;
        booking.status = "Confirmed";
        await booking.save();

        // Send confirmation message
        const guestPhone = booking.guestInformation[0]?.guestPhone;
        if (guestPhone) {
            const message = `Your booking has been confirmed! Check-in: ${booking.checkInDate}, Check-out: ${booking.checkOutDate}. Thank you for choosing us!`;
            await SendWhatsAppMessage( message,guestPhone);
        }

        return res.status(200).json({ success: true, message: "Booking confirmed successfully!", booking });

    } catch (error) {
        console.error("Error verifying OTP:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Resend OTP for Booking Confirmation
exports.resendOtpForBookingConfirm = async (req, res) => {
    try {
        const { bookingId } = req.body;

        if (!bookingId) {
            return res.status(400).json({ success: false, message: "Booking ID is required." });
        }

        const booking = await BookingRequestSchema.findOne({ Booking_id: bookingId });

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found." });
        }

        if (booking.isBookingDone) {
            return res.status(400).json({ success: false, message: "Booking is already confirmed." });
        }

        // Generate new OTP and expiry
        const newOtp = Crypto.randomInt(100000, 999999);
        const newExpiry = new Date(Date.now() + 5 * 60 * 1000);

        booking.BookingOtp = newOtp;
        booking.BookingOtpExpiry = newExpiry;
        await booking.save();

        // Send new OTP via WhatsApp
        const guestPhone = booking.guestInformation[0]?.guestPhone;
        if (guestPhone) {
            const message = `Your new booking OTP: ${newOtp}. Please share it with the receptionist to confirm your booking. This OTP expires in 5 minutes.`;
            await SendWhatsAppMessage( message,guestPhone);
        }

        return res.status(200).json({ success: true, message: "New OTP sent successfully!", bookingId });

    } catch (error) {
        console.error("Error resending OTP:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};



exports.cancelBooking = async(req,res)=>{
    try {
        const BookingId = req.query.params
        const booking = await BookingRequestSchema.findOne({ Booking_id: BookingId });
        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found."})

        }
        booking.status = "Cancelled"
        
    } catch (error) {
        
    }
}
