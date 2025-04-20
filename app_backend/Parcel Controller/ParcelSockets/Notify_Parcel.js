const Parcel_Request = require("../../models/Parcel_Models/Parcel_Request");
const Rider = require("../../models/Rider.model");

exports.notifyDriverService = async (data, req, res) => {
    try {
        const io = req.app.get("socketio");
        const driverSocketMap = req.app.get("driverSocketMap");
        const userSocketMap = req.app.get("userSocketMap");

        if (!io) {
            return res.status(500).json({ message: "❌ Socket.io is not connected" });
        }

        const parcelRequest = await Parcel_Request.findById(data);
        if (!parcelRequest) {
            return res.status(404).json({ message: "❌ Parcel Request not found" });
        }

        const pickup = parcelRequest?.locations?.pickup;
        const pickupCoordinates = pickup?.location?.coordinates;

        if (!pickupCoordinates || pickupCoordinates.length !== 2) {
            return res.status(400).json({ message: "❌ Invalid pickup coordinates" });
        }

        console.log("📍 Starting search for nearby riders around:", pickupCoordinates);

        let successfulNotification = false;
        let retryCount = 0;
        const maxRetries = 3;
        let availableCouriers = [];

        // Retry logic for finding riders
        while (!successfulNotification && retryCount < maxRetries) {
            try {
                console.log(`📍 Attempt ${retryCount + 1}: Searching for riders...`);

                // Increasing search radius with each retry
                const searchRadius = 2000 * (retryCount + 1); // 2km, 4km, 6km

                // Query riders within radius of pickup point
                availableCouriers = await Rider.find({
                    isAvailable: true,
                    isPaid: true,
                    category: "parcel",
                    location: {
                        $near: {
                            $geometry: {
                                type: "Point",
                                coordinates: pickupCoordinates,
                            },
                            $maxDistance: searchRadius,
                        },
                    },
                });

                if (availableCouriers.length > 0) {
                    successfulNotification = true;
                    console.log(`✅ Found ${availableCouriers.length} available drivers on attempt ${retryCount + 1}`);
                    break;
                }

                retryCount++;

                if (retryCount < maxRetries) {
                    console.log(`⚠️ No riders found, retry attempt ${retryCount + 1} of ${maxRetries}`);
                    // Wait for 3 seconds before retrying
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            } catch (error) {
                console.error(`❌ Error during search attempt ${retryCount + 1}:`, error);
                retryCount++;

                if (retryCount < maxRetries) {
                    console.log(`⚠️ Retrying search, attempt ${retryCount + 1} of ${maxRetries}`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        }

        if (!successfulNotification) {
            return res.status(404).json({ message: "🚫 No nearby available drivers found after multiple attempts" });
        }

        console.log("driverSocketMap", driverSocketMap);
        console.log("userSocketMap", userSocketMap);

        let isMapObject = driverSocketMap instanceof Map;
        let isMapObjectUser = userSocketMap instanceof Map;
        
        // Get customer ID from parcel request
        const customerId = parcelRequest.customerId.toString();
        console.log(`👤 Customer ID: ${customerId}`);

        // Find customer socket ID
        let customerSocketId;
        if (isMapObjectUser) {
            customerSocketId = userSocketMap.get(customerId);
            if (!customerSocketId) {
                console.log("🔍 Searching for customer socket ID in map keys...");
                for (const [key, value] of userSocketMap.entries()) {
                    if (key.includes(customerId) || customerId.includes(key)) {
                        customerSocketId = value;
                        console.log(`🔍 Found customer socket ID: ${value} for key: ${key}`);
                        break;
                    }
                }
            }
        } else {
            customerSocketId = userSocketMap[customerId];
        }

        if (!customerSocketId) {
            console.log(`⚠️ No socket connection found for customer ID: ${customerId}`);
        } else {
            console.log(`✅ Found customer socket ID: ${customerSocketId}`);
        }
        
        let notifiedCount = 0;
        for (const driver of availableCouriers) {
            const driverId = driver._id.toString();

            // Handle both Map and plain object cases
            let socketId;
            if (isMapObject) {
                socketId = driverSocketMap.get(driverId);
                if (!socketId) {
                    // Try without converting to string
                    socketId = driverSocketMap.get(driver._id);
                }
            } else {
                socketId = driverSocketMap[driverId];
            }

            if (socketId) {
                io.to(socketId).emit("new_parcel_come", {
                    parcel: parcelRequest._id,
                    pickup,
                    message: "📦 New parcel request available near you!",
                });
                console.log(`✅ Notified driver ${driver._id} at socket ${socketId}`);
                notifiedCount++;
                
                // Notify the customer that a rider has been confirmed
                if (customerSocketId) {
                    io.to(customerSocketId).emit("parcel_confirmed", {
                        parcel: parcelRequest._id,
                        rider: Rider._id,
                        message: "🎉 A rider has been assigned to your parcel request!"
                    });
                    console.log(`✅ Notified customer ${customerId} at socket ${customerSocketId} about rider assignment`);
                }
            } else {
                // Try to find the key in the map by iterating (debug purpose)
                if (isMapObject) {
                    console.log(`⚠️ Looking for driver ID ${driverId} in map keys:`);
                    for (const [key, value] of driverSocketMap.entries()) {
                        console.log(`Map entry: ${key} => ${value}`);
                        // Check if the keys are similar but not strictly equal
                        if (key.includes(driverId) || driverId.includes(key)) {
                            console.log(`🔍 Found similar key: ${key}`);
                            io.to(value).emit("new_parcel_come", {
                                parcel: parcelRequest._id,
                                pickup,
                                message: "📦 New parcel request available near you!",
                            });
                            console.log(`✅ Notified driver ${driver._id} at socket ${value}`);
                            notifiedCount++;
                            
                            // Notify the customer that a rider has been confirmed
                            if (customerSocketId) {
                                io.to(customerSocketId).emit("parcel_confirmed", {
                                    parcel: parcelRequest._id,
                                    rider: Rider?._id,
                                    message: "🎉 A rider has been assigned to your parcel request!"
                                });
                                console.log(`✅ Notified customer ${customerId} at socket ${customerSocketId} about rider assignment`);
                            }
                            break;
                        }
                    }
                }
                console.log(`⚠️ No socket connection for driver ${driver._id}`);
            }
        }

        // Fix the missing searchRadii variable
        const searchRadii = [2000, 4000, 6000]; // 2km, 4km, 6km

        if (notifiedCount === 0) {
            return res.status(202).json({
                success: true,
                message: "⚠️ Found riders but could not notify any (no active socket connections)",
                notifiedDrivers: 0,
                searchRadius: searchRadii[retryCount] / 1000,
                totalAttempts: retryCount + 1,
            });
        }

        return {
            success: true,
            message: `✅ ${notifiedCount} nearby drivers notified successfully after ${retryCount + 1} search attempts`,
            notifiedDrivers: notifiedCount,
            searchRadius: searchRadii[retryCount - 1] / 1000,
            customerNotified: !!customerSocketId,
            totalAttempts: retryCount + 1,
        };
    } catch (error) {
        console.error("❌ Error in notifyDriverService:", error);
        return {
            success: false,
            message: "❌ Failed to notify drivers",
            error: error.message,
        };
    }
};