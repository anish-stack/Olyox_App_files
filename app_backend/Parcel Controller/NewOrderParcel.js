const Parcel_Request = require("../models/Parcel_Models/Parcel_Request");
const mongoose = require("mongoose");
const axios = require("axios");

exports.NewBooking = async (req, res) => {
    try {
        console.log("Booking request received:", req.body);

        // Validate required fields
        if (!req.body.pickup || !req.body.dropoff || !req.body.vehicle_id) {
            return res.status(400).json({
                message: "Missing required fields: pickup, dropoff, or vehicle_id"
            });
        }

        // Transform coordinates for MongoDB GeoJSON format
        const transformedData = {
            customerId: req.body.userId,
            status: "pending",
            locations: {
                pickup: {
                    address: req.body.pickup.address,
                    location: {
                        type: "Point",
                        coordinates: [req.body.pickup.coordinates.lng, req.body.pickup.coordinates.lat]
                    }
                },
                dropoff: {
                    address: req.body.dropoff.address,
                    location: {
                        type: "Point",
                        coordinates: [req.body.dropoff.coordinates.lng, req.body.dropoff.coordinates.lat]
                    }
                },
                stops: []
            },
            // Add receiver information
            apartment: req.body.receiver?.apartment || "",
            name: req.body.receiver?.name || "",
            phone: req.body.receiver?.phone || "",
            useMyNumber: req.body.receiver?.useMyNumber || false,
            savedAs: req.body.receiver?.savedAs || null,

            // Vehicle information
            vehicle_id: new mongoose.Types.ObjectId(req.body.vehicle_id),

            // Fare information
            fares: {
                baseFare: req.body.fares?.baseFare || 0,
                netFare: req.body.fares?.netFare || 0,
                couponApplied: req.body.fares?.couponApplied || false,
                discount: req.body.fares?.discount || 0,
                payableAmount: req.body.fares?.payableAmount || 0
            },

            // Ride information
            ride_id: req.body.ride_id || `RIDE-${Date.now()}`,
            km_of_ride: parseFloat(req.body.km_of_ride) || 0,

            // Status flags
            is_rider_assigned: req.body.is_rider_assigned || false,
            is_booking_completed: req.body.is_booking_completed || false,
            is_booking_cancelled: req.body.is_booking_cancelled || false,
            is_pickup_complete: req.body.is_pickup_complete || false,
            is_dropoff_complete: req.body.is_dropoff_complete || false
        };

        // Process stops if any
        if (req.body.stops && Array.isArray(req.body.stops)) {
            transformedData.locations.stops = req.body.stops.map(stop => ({
                address: stop.address,
                location: {
                    type: "Point",
                    coordinates: [stop.coordinates.lng, stop.coordinates.lat]
                }
            }));
        }

        // Generate OTP for verification
        transformedData.otp = Math.floor(1000 + Math.random() * 9000);


        // Create new booking in database
        const newBooking = new Parcel_Request(transformedData);
        await newBooking.save();

        // Optional: Notify driver service about new booking
        // await notifyDriverService(newBooking._id);

        res.status(201).json({
            success: true,
            message: "Booking created successfully",
            booking_id: newBooking._id,
            ride_id: newBooking.ride_id,
            otp: newBooking.otp
        });
    } catch (error) {
        console.error("Booking creation failed:", error);
        res.status(500).json({
            success: false,
            message: "Booking Failed",
            error: error.message
        });
    }
};

// Helper function to notify driver service about new booking
// Uncomment and implement if needed
/*
async function notifyDriverService(bookingId) {
    try {
        await axios.post(process.env.DRIVER_SERVICE_URL + '/new-booking', {
            booking_id: bookingId
        });
    } catch (error) {
        console.error("Failed to notify driver service:", error);
        // This shouldn't stop the booking process, just log the error
    }
}
*/