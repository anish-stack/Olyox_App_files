const Parcel_Request = require("../../models/Parcel_Models/Parcel_Request");
const Rider = require("../../models/Rider.model");

exports.notifyDriverService = async (data, req, res) => {
    try {
        // Validate input
        if (!data) {
            throw new Error("❌ Invalid request: missing parcel ID");
        }

        // Check if socket.io is initialized
        const io = req.app.get("socketio");
        if (!io) {
            throw new Error("❌ Socket.io is not initialized");
        }

        // Get socket maps
        const driverSocketMap = req.app.get("driverSocketMap") || new Map();
        const userSocketMap = req.app.get("userSocketMap") || new Map();

        // Find parcel request
        let parcelRequest;
        try {
            parcelRequest = await Parcel_Request.findById(data).populate('vehicle_id');
        } catch (error) {
            throw new Error(`❌ Invalid parcel ID format: ${error.message}`);
        }

        console.log("Parcel Request:", parcelRequest);

        if (!parcelRequest) {
            throw new Error("❌ Parcel Request not found");
        }

        // Validate pickup location
        const pickup = parcelRequest?.locations?.pickup;
        if (!pickup || !pickup.location) {
            throw new Error("❌ Pickup location not found in request");
        }

        const pickupCoordinates = pickup?.location?.coordinates;
        if (!Array.isArray(pickupCoordinates) || pickupCoordinates.length !== 2 ||
            !Number.isFinite(pickupCoordinates[0]) || !Number.isFinite(pickupCoordinates[1])) {
            throw new Error("❌ Invalid pickup coordinates");
        }

        // Configuration for driver search
        const searchRadii = [2000, 4000, 6000]; // 2km, 4km, 6km
        const maxAttempts = 2;
        let attempt = 0;
        let notifiedCount = 0;
        let finalRiders = [];
        let customerSocketId = null;

        // Get customer socket ID
        if (!parcelRequest.customerId) {
            throw new Error("❌ Customer ID not found in parcel request");
        }

        const customerId = parcelRequest.customerId.toString();
        if (userSocketMap instanceof Map) {
            customerSocketId = userSocketMap.get(customerId);
            if (!customerSocketId) {
                // Try to find partial match
                for (const [key, value] of userSocketMap.entries()) {
                    if (key.includes(customerId) || customerId.includes(key)) {
                        customerSocketId = value;
                        break;
                    }
                }
            }
        } else if (typeof userSocketMap === 'object') {
            customerSocketId = userSocketMap[customerId];
        }

        // Search for available drivers with increasing radius
        while (attempt < maxAttempts) {
            // Ensure we have a valid radius even if attempt exceeds searchRadii length
            const radiusIndex = Math.min(attempt, searchRadii.length - 1);
            const radius = searchRadii[radiusIndex];

            if (!Number.isFinite(radius)) {
                console.warn(`⚠️ Invalid radius at attempt ${attempt}, using default 6000m`);
                radius = 6000; // Default to 6km if invalid
            }

            try {
                let availableCouriers = await Rider.find({
                    isAvailable: true,
                    isPaid: true,
                    category: "parcel",
                    location: {
                        $near: {
                            $geometry: {
                                type: "Point",
                                coordinates: pickupCoordinates,
                            },
                            $maxDistance: radius,
                        },
                    },
                

                }).lean().exec();
                console.log("Available Couriers:", availableCouriers.length);

                availableCouriers = availableCouriers.filter((driver)=> driver.rideVehicleInfo.vehicleName === parcelRequest?.vehicle_id?.title);
                console.log("Available Couriers sete:", availableCouriers.length);

                if (!availableCouriers || availableCouriers.length === 0) {
                    console.log(`No couriers found within ${radius}m radius. Attempt ${attempt + 1}/${maxAttempts}`);
                    attempt++;
                    await new Promise(resolve => setTimeout(resolve, 7000)); // wait 7s
                    continue;
                }

                finalRiders = availableCouriers;
                for (const driver of availableCouriers) {
                    if (!driver || !driver._id) {
                        console.warn("⚠️ Driver without ID found, skipping");
                        continue;
                    }

                    const driverId = driver._id.toString();
                    let socketId = null;

                    // Get driver socket ID
                    if (driverSocketMap instanceof Map) {
                        socketId = driverSocketMap.get(driverId);
                        if (!socketId) {
                            // Try to find partial match
                            for (const [key, value] of driverSocketMap.entries()) {
                                if ((key && key.includes(driverId)) || (driverId && driverId.includes(key))) {
                                    socketId = value;
                                    break;
                                }
                            }
                        }
                    } else if (typeof driverSocketMap === 'object') {
                        socketId = driverSocketMap[driverId];
                    }

                    if (socketId) {
                        try {
                            io.to(socketId).emit("new_parcel_come", {
                                parcel: parcelRequest._id,
                                pickup,
                                message: "📦 New parcel request available near you!",
                            });

                            notifiedCount++;
                            console.log(`🔔 Notified driver ${driverId}`);

                            if (customerSocketId) {
                                io.to(customerSocketId).emit("parcel_confirmed", {
                                    parcel: parcelRequest._id,
                                    rider: driver._id,
                                    message: "🎉 A rider has been assigned to your parcel request!"
                                });
                            }
                        } catch (emitError) {
                            console.error(`Error emitting to socket ${socketId}:`, emitError);
                            // Continue with other drivers even if one emit fails
                        }
                    } else {
                        console.log(`⚠️ No active socket connection for driver ${driverId}`);
                    }
                }

                // If at least one driver was notified, break out of retry loop
                if (notifiedCount > 0) break;

                attempt++;
                await new Promise(resolve => setTimeout(resolve, 3000)); // wait before next attempt
            } catch (queryError) {
                console.error(`❌ Error in courier search (attempt ${attempt}):`, queryError);
                attempt++;
                await new Promise(resolve => setTimeout(resolve, 3000)); // wait before next attempt
            }
        }

        if (notifiedCount === 0) {
            const customerSocketId = userSocketMap?.get?.(parcelRequest?.customerId?.toString());
            // console.log("Customer Socket ID:", customerSocketId);
            if (io && customerSocketId) {
                io.to(customerSocketId).emit("parcel_error", {
                    parcel: data,
                    message: "Sorry, we couldn't find a rider at the moment. But your order has been successfully created — we'll assign a rider to you as soon as possible. Thank you for your patience!"
                });
            }
            throw new Error("🚫 No available drivers with active socket connection after multiple attempts");
        }

        return {
            success: true,
            message: `✅ ${notifiedCount} drivers notified successfully`,
            notifiedDrivers: notifiedCount,
            searchRadius: searchRadii[Math.min(attempt, searchRadii.length - 1)] / 1000,
            customerNotified: !!customerSocketId,
            totalAttempts: attempt + 1,
        };

    } catch (error) {
        console.error("❌ Error in notifyDriverService:", error);
        // Send notification to customer if socket is available
       

        throw new Error(`❌ notifyDriverService failed: ${error.message}`);
    }
};