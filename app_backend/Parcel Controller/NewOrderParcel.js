const Parcel_Request = require("../models/Parcel_Models/Parcel_Request");
const mongoose = require("mongoose");
const axios = require("axios");
const { notifyDriverService } = require("./ParcelSockets/Notify_Parcel");
const RiderModel = require("../models/Rider.model");

exports.NewBooking = async (req, res) => {
    try {

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
        const io = req.app.get("socketio");
        const userSocketMap = req.app.get("userSocketMap");
        const customerId = newBooking.customerId.toString();
        const customerSocketId = userSocketMap instanceof Map
            ? userSocketMap.get(customerId) || [...userSocketMap.entries()].find(([key]) => key.includes(customerId))?.[1]
            : userSocketMap[customerId];
        console.log("Customer Socket ID:", customerSocketId);

        if (io && customerSocketId) {
            console.log("Customer Ko send kiya ID:", customerSocketId);

            io.to(customerSocketId).emit("your_parcel_is_confirm", {
                success: true,
                message: "New parcel request created",
                parcel: newBooking._id,
            });
        }
        // Optional: Notify driver service about new booking
        try {
            const data = await notifyDriverService(newBooking._id, req, res);
            console.log("✅ notifyDriverService success:", data);

            if (!data.success) {
                console.warn("⚠️ notifyDriverService returned with warning:", data.message);
                // Optional: handle fallback or notify user here
            }
        } catch (error) {
            console.error("❌ Error occurred while calling notifyDriverService:", error.message);
            res.status(201).json({
                success: true,
                message: "Booking created successfully",
                booking_id: newBooking._id,
                ride_id: newBooking.ride_id,
                otp: newBooking.otp
            });
        }



    } catch (error) {
        console.error("Booking creation failed:", error);
        res.status(500).json({
            success: false,
            message: "Booking Failed",
            error: error.message
        });
    }
};

exports.getParcelDetails = async (req, res) => {
    try {
        const { id } = req.params;
        console.log("Parcel ID:", id);
        if (!id) {
            return res.status(400).json({ message: "Parcel ID is required" });
        }
        const parcelDetails = await Parcel_Request.findById(id).populate("customerId", "name number email").populate("rider_id")
        if (!parcelDetails) {
            return res.status(404).json({ message: "Parcel not found" });
        }
        res.status(200).json({ success: true, parcelDetails });

    } catch (error) {
        console.error("Error fetching parcel details:", error);
        res.status(500).json({ success: false, message: "Error fetching parcel details", error: error.message });

    }
}

exports.acceptParcelByRider = async (req, res) => {
    try {
        console.log("📥 Request received at acceptParcelByRider");
        console.log("📤 Request body:", req.body);
        console.log("🔍 Request params:", req.params);
        console.log("🔐 Request headers:", req.headers);

        const { riderId } = req.body;
        const { parcelId } = req.params;

        console.log("🧍‍♂️ Rider ID from body:", riderId);
        console.log("📦 Parcel ID from params:", parcelId);

        // Extract rider ID from auth token if not in body
        let extractedRiderId = riderId;
        if (!extractedRiderId && req.user && req.user.id) {
            extractedRiderId = req.user.id;
            console.log("🔐 Extracted rider ID from auth token:", extractedRiderId);
        }

        if (!parcelId) {
            console.warn("❌ Missing parcelId");
            return res.status(400).json({ success: false, message: "Parcel ID is required" });
        }

        if (!extractedRiderId) {
            console.warn("❌ Missing riderId");
            return res.status(400).json({ success: false, message: "Rider ID is required" });
        }

        console.log("🔍 Looking for parcel with ID:", parcelId);
        const parcel = await Parcel_Request.findById(parcelId);

        if (!parcel) {
            console.warn(`❌ Parcel not found for ID: ${parcelId}`);
            return res.status(404).json({ success: false, message: "Parcel not found" });
        }
        console.log("✅ Parcel found:", parcel._id);

        if (parcel.is_rider_assigned) {
            console.warn(`⚠️ Parcel ${parcelId} is already assigned`);
            return res.status(400).json({ success: false, message: "Parcel is already assigned to a rider" });
        }
        console.log("✅ Parcel is available for assignment");

        console.log("🔍 Looking for rider with ID:", extractedRiderId);
        const rider = await RiderModel.findById(extractedRiderId);

        if (!rider) {
            console.warn(`❌ Rider not found for ID: ${extractedRiderId}`);
            return res.status(404).json({ success: false, message: "Rider not found" });
        }
        console.log("✅ Rider found:", rider._id);

        console.log("📝 Updating parcel status...");
        parcel.is_rider_assigned = true;
        parcel.rider_id = extractedRiderId;
        parcel.driver_accept = true;
        parcel.driver_accept_time = new Date();
        parcel.status = "accepted";

        console.log("💾 Saving parcel changes...");
        await parcel.save();
        console.log(`✅ Parcel ${parcelId} accepted by rider ${extractedRiderId}`);

        const io = req.app.get("socketio");
        const driverSocketMap = req.app.get("driverSocketMap") || new Map();
        const userSocketMap = req.app.get("userSocketMap") || new Map();

        // Notify Rider
        console.log("🔍 Looking for rider socket...");
        const riderSocketId = driverSocketMap instanceof Map
            ? driverSocketMap.get(extractedRiderId) || [...driverSocketMap.entries()].find(([key]) => key.includes(extractedRiderId))?.[1]
            : driverSocketMap[extractedRiderId];

        console.log("📡 Rider Socket ID:", riderSocketId);
        if (io && riderSocketId) {
            console.log("📢 Emitting 'parcel_accepted' to rider...");
            io.to(riderSocketId).emit("parcel_accepted", {
                success: true,
                message: "Parcel accepted",
                parcel: parcel._id,
            });
            console.log("✅ Event emitted to rider");
        } else {
            console.log("⚠️ Unable to emit to rider - socket not found");
        }

        // Notify Customer
        console.log("🔍 Looking for customer socket...");
        const customerId = parcel.customerId.toString();
        const customerSocketId = userSocketMap instanceof Map
            ? userSocketMap.get(customerId) || [...userSocketMap.entries()].find(([key]) => key.includes(customerId))?.[1]
            : userSocketMap[customerId];

        console.log("📡 Customer Socket ID:", customerSocketId);
        if (io && customerSocketId) {
            console.log("📢 Emitting 'parcel_accepted' to customer...");
            io.to(customerSocketId).emit("parcel_accepted", {
                success: true,
                message: "Parcel accepted by rider",
                parcel: parcel._id,
            });
            console.log("✅ Event emitted to customer");
        } else {
            console.log("⚠️ Unable to emit to customer - socket not found");
        }
        rider.isAvailable = false;
        await rider.save();
        console.log("📤 Sending success response...");
        return res.status(200).json({
            success: true,
            message: "Parcel accepted successfully",
            parcel,
        });

    } catch (error) {
        console.error("❌ Error in acceptParcelByRider:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while accepting parcel",
            error: error.message,
        });
    }
};


exports.updateParcelStatus = async (req, res) => {
    try {
        const { parcelId, status } = req.body;

        // Input validation
        if (!parcelId || !status) {
            return res.status(400).json({ message: "Parcel ID and status are required" });
        }

        // Fetch parcel from database
        const parcel = await Parcel_Request.findById(parcelId).populate("rider_id");

        if (!parcel) {
            return res.status(404).json({ message: "Parcel not found" });
        }

        // Set up socket connection and maps
        const io = req.app.get("socketio");
        const driverSocketMap = req.app.get("driverSocketMap") || new Map();
        const userSocketMap = req.app.get("userSocketMap") || new Map();

        // Logic based on status
        switch (status) {
            case "Reached at Pickup Location":
                parcel.is_driver_reached = true;
                parcel.is_driver_reached_time = new Date();
                break;

            case "in_transit":
                parcel.is_pickup_complete = true;
                parcel.is_parcel_picked = true;
                parcel.otp = Math.floor(1000 + Math.random() * 9000); // Generate OTP for the parcel
                break;

            case "Reached at drop Location":
                parcel.is_driver_reached_at_deliver_place = true;
                parcel.is_driver_reached_at_deliver_place_time = new Date();

                const customerId = parcel.customerId.toString();
                const customerSocketId = userSocketMap.get(customerId) || [...userSocketMap.entries()].find(([key]) => key.includes(customerId))?.[1];

                if (customerSocketId) {
                    io.to(customerSocketId).emit("parcel_rider_reached", {
                        success: true,
                        message: "Parcel reached at drop location",
                        parcel: parcel._id,
                    });
                } else {
                    console.error("Unable to emit to customer: socket not found");
                }
                break;

            case "delivered":
                parcel.is_parcel_delivered = true;
                parcel.is_dropoff_complete = true;
                parcel.is_parcel_delivered_time = new Date();
                parcel.is_booking_completed = true;
                parcel.money_collected = parcel.fares.payableAmount;

                // Ensure rider status is available after delivery
                if (parcel.rider_id) {
                    parcel.rider_id.isAvailable = true;
                    await parcel.rider_id.save();
                }
                break;

            case "cancelled":
                parcel.is_booking_cancelled = true;
                parcel.is_booking_cancelled_time = new Date();

                if (parcel.rider_id) {
                    io.to(customerSocketId).emit("parcel_rider_cancel", {
                        success: true,
                        message: "Parcel has been cancelled",
                        parcel: parcel._id,
                    });
                }
                break;

            default:
                return res.status(400).json({ message: "Invalid status value" });
        }

        // Always update the status
        parcel.status = status;

        // Save the updated parcel document
        await parcel.save();

        return res.status(200).json({
            message: "Parcel status updated successfully",
            updatedStatus: status,
        });

    } catch (error) {
        console.error("Error updating parcel status:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};


exports.cancelOrder = async(req,res)=>{
    try {
        const { parcelId, status } = req.body;

        // Input validation
        if (!parcelId || !status) {
            return res.status(400).json({ message: "Parcel ID and status are required" });
        }

        // Fetch parcel from database
        const parcel = await Parcel_Request.findById(parcelId).populate("rider_id");

        if (!parcel) {
            return res.status(404).json({ message: "Parcel not found" });
        }

        const io = req.app.get("socketio");
        const driverSocketMap = req.app.get("driverSocketMap") || new Map();

        parcel.status = status;
        parcel.is_booking_cancelled = true;
        parcel.is_booking_cancelled_time = new Date();
        parcel.is_parcel_cancel_by_user = true;
        parcel.is_parcel_cancel_by_user_time = new Date();
        await parcel.save();
        if (parcel.rider_id) {
            const customerId = parcel.customerId.toString();
            const customerSocketId = userSocketMap.get(customerId) || [...userSocketMap.entries()].find(([key]) => key.includes(customerId))?.[1];

            if (customerSocketId) {
                io.to(customerSocketId).emit("parcel_rider_reached", {
                    success: true,
                    message: "Parcel reached at drop location",
                    parcel: parcel._id,
                });
            } else {
                console.error("Unable to emit to customer: socket not found");
            }
        }

    } catch (error) {
        
    }
}

exports.getAllMyParcelByCustomerId = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ message: "Oops! We couldn't process your request. User ID is missing." });
        }

        const parcels = await Parcel_Request.find({ customerId: userId }).populate("vehicle_id");

        if (!parcels || parcels.length === 0) {
            return res.status(404).json({ message: "No parcel requests found for your account yet." });
        }

        // Successful response
        return res.status(200).json({
            success: true,
            message: "Parcels fetched successfully.",
            parcels
        });

    } catch (error) {
        console.error("Error fetching parcels:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while fetching your parcels. Please try again later.",
            error: error.message
        });
    }
};
