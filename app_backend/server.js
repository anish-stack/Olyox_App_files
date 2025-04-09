// Required Dependencies
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDb = require('./database/db');
const cookies_parser = require('cookie-parser');
const axios = require('axios');
const multer = require('multer');
require('dotenv').config();

// Routes
const router = require('./routes/routes');
const rides = require('./routes/rides.routes');
const hotel_router = require('./routes/Hotel.routes');
const users = require('./routes/user_routes/user_routes');
const tiffin = require('./routes/Tiffin/Tiffin.routes');
const parcel = require('./routes/Parcel/Parcel.routes');
const admin = require('./routes/Admin/admin.routes');

// Models
const RiderModel = require('./models/Rider.model');
const Parcel_boy_Location = require('./models/Parcel_Models/Parcel_Boys_Location');
const Settings = require('./models/Admin/Settings');

// Controllers & Middleware
const {
    ChangeRideRequestByRider,
    findRider,
    rideStart,
    rideEnd,
    collectCash,
    AddRating,
    cancelRideByAnyOne
} = require('./controllers/ride.request');
const {
    update_parcel_request,
    mark_reached,
    mark_pick,
    mark_deliver,
    mark_cancel
} = require('./driver');
const Protect = require('./middleware/Auth');
const Heavy = require('./routes/Heavy_vehicle/Heavy.routes');
const { connectwebDb } = require('./PaymentWithWebDb/db');
const startExpiryCheckJob = require('./cron_jobs/RiderJobs');
const tempRideDetailsSchema = require('./models/tempRideDetailsSchema');
const { default: mongoose } = require('mongoose');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with appropriate CORS and ping settings
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    pingInterval: 6000,  // Add ping interval for connection health monitoring
});

// Connect to the database
connectwebDb()
connectDb();
console.log('Attempting database connection...');

// Set socket.io instance to be accessible by routes
app.set("socketio", io);

// Middleware Setup
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookies_parser());

/**
 * Socket connection maps to track active connections
 * These maps store userId/driverId -> socketId mappings
 */
const userSocketMap = new Map();     // Regular users
const driverSocketMap = new Map();   // Drivers
const tiffinPartnerMap = new Map();  // Tiffin service partners

// Make driverSocketMap available to the entire application
app.set('driverSocketMap', driverSocketMap);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`[${new Date().toISOString()}] New client connected: ${socket.id}`);

    /**
     * Handle user connections
     * Maps a user's ID to their socket ID for targeted communications
     */
    socket.on('user_connect', (data) => {
        if (!data || !data.userId || !data.userType) {
            console.error(`[${new Date().toISOString()}] Invalid user connect data:`, data);
            return;
        }

        // Store the user's socket ID
        userSocketMap.set(data.userId, socket.id);
        console.log(`[${new Date().toISOString()}] User ${data.userId} connected with socket ID: ${socket.id}`);
    });

    /**
     * Handle driver connections
     * Maps a driver's ID to their socket ID for targeted communications
     */
    socket.on('driver_connect', (data) => {
        if (!data || !data.userId) {
            console.error(`[${new Date().toISOString()}] Invalid driver connect data:`, data);
            return;
        }

        // Store the driver's socket ID
        driverSocketMap.set(data.userId, socket.id);
        console.log(`[${new Date().toISOString()}] Driver ${data.userId} connected with socket ID: ${socket.id}`);
        console.log(`[${new Date().toISOString()}] Current driver connections:`, Array.from(driverSocketMap.entries()));
    });

    /**
     * Handle tiffin partner connections
     * Maps a tiffin partner's ID to their socket ID for targeted communications
     */
    socket.on('tiffin_partner', (data) => {
        if (!data || !data.userId) {
            console.error(`[${new Date().toISOString()}] Invalid tiffin_partner connect data:`, data);
            return;
        }

        // Store the tiffin partner's socket ID
        tiffinPartnerMap.set(data.userId, socket.id);
        console.log(`[${new Date().toISOString()}] Tiffin partner ${data.userId} connected with socket ID: ${socket.id}`);
    });

    /**
     * Broadcasts ride data to all connected drivers
     * @param {Object} rideData - The ride data to be sent to drivers
     */
    const emitRideToDrivers = (rideData) => {
        console.log(`[${new Date().toISOString()}] Broadcasting ride to ${driverSocketMap.size} drivers`);

        let emittedCount = 0;
        driverSocketMap.forEach((driverSocketId, driverId) => {
            console.log(`[${new Date().toISOString()}] Sending ride data to driver ${driverId} (socket: ${driverSocketId})`);
            io.to(driverSocketId).emit('ride_come', rideData);
            emittedCount++;
        });

        console.log(`[${new Date().toISOString()}] Emitted ride data to ${emittedCount} drivers`);
    };


    /**
     * Handle Showing Available Rider Near User Location 
     * Updates the Riders on map and notifies relevant parties
     */

    // socket.on('show_me_available_riders', async (data) => {
    //     console.log("show_me_available_riders",data)
    //     if (!data) {
    //         throw new Error('No data available');
    //     }

    //     try {
    //         const { user_location } = data || {};

    //         if (!user_location ) {
    //             throw new Error('Incomplete data');
    //         }

    //         // Construct the location point with correct coordinates
    //         let location = {
    //             type: 'Point',
    //             coordinates: [
    //                 user_location.longitude ,
    //                 user_location.latitude
    //             ]
    //         };

    //         // Find available riders within 3 km (3000 meters), selecting only location and rideVehicleInfo
    //         const findAvailableRiders = await RiderModel.find(
    //             {
    //                 isAvailable: true,
    //                 location: {
    //                     $near: {
    //                         $geometry: location,
    //                         $maxDistance: 3000 // 3 km
    //                     }
    //                 }
    //             },
    //             { location: 1, rideVehicleInfo: 1, _id: 0 }
    //         ).limit(10);
    //         console.log("findAvailableRiders",findAvailableRiders)
    //         // Emit only location and rideVehicleInfo to the client
    //         socket.emit('available_riders', findAvailableRiders);

    //     } catch (error) {
    //         console.error('Error fetching available riders:', error.message);
    //         socket.emit('error', { message: 'Error fetching available riders' });
    //     }
    // });




    /**
     * Handle ride acceptance by driver
     * Processes a driver accepting a ride and notifies the user
     */


    socket.on('ride_accepted', async (data) => {
        try {
            console.log(`[${new Date().toISOString()}] Ride acceptance request:`, data);

            if (!data || !data.data) {
                console.error(`[${new Date().toISOString()}] Invalid ride acceptance data`);
                return;
            }

            // Process the data and change ride request status
            const updatedRide = await ChangeRideRequestByRider(io, data.data);
            console.log(`[${new Date().toISOString()}] Ride status updated:`, updatedRide.rideStatus);

            if (updatedRide.rideStatus === 'accepted') {
                // Get the socket ID of the user who made the ride request
                const userId = String(updatedRide.user);
                const userSocketId = userSocketMap.get(userId);

                console.log(`[${new Date().toISOString()}] Notifying user ${userId}, socket found: ${Boolean(userSocketId)}`);

                if (userSocketId) {
                    // Emit a message only to the specific user's socket ID
                    io.to(userSocketId).emit('ride_accepted_message', {
                        message: 'Your ride request has been accepted!',
                        rideDetails: updatedRide,
                    });
                    console.log(`[${new Date().toISOString()}] Acceptance notification sent to user: ${userId}`);
                } else {
                    console.log(`[${new Date().toISOString()}] No active socket found for user: ${userId}`);
                }
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error handling ride_accepted event:`, error);
            // Consider sending an error notification back to the driver
            socket.emit('ride_error', { message: 'Failed to process ride acceptance' });
        }
    });

    /**
     * Handle ride acceptance by user
     * Notifies the driver that the user has accepted the ride
     */
    socket.on('rideAccepted_by_user', async (data) => {
        try {
            const { driver, ride } = data;

            if (!driver || !ride || !ride.rider) {
                console.error(`[${new Date().toISOString()}] Invalid rideAccepted_by_user data:`, data);
                return;
            }

            console.log(`[${new Date().toISOString()}] Ride accepted by user, notifying driver:`, ride.rider._id);

            const driverSocketId = driverSocketMap.get(ride.rider._id);

            // Save ride and driver details in TempRideDetails collection
            const dataSave = await new tempRideDetailsSchema({
                driver: {
                    name: driver.name,
                    carModel: driver.carModel,
                    carNumber: driver.carNumber,
                    vehicleType: driver.vehicleType,
                    rating: driver.rating,
                    trips: driver.trips,
                    distance: driver.distance,
                    price: driver.price,
                    otp: driver.otp,
                    pickup_desc: driver.pickup_desc,
                    drop_desc: driver.drop_desc,
                    eta: driver.eta,
                    rideStatus: driver.rideStatus,
                },
                rideDetails: {
                    _id: ride._id,
                    RideOtp: ride.RideOtp,
                    rideStatus: ride.rideStatus,
                    ride_is_started: ride.ride_is_started,
                    eta: ride.eta,
                    EtaOfRide: ride.EtaOfRide,
                    is_ride_paid: ride.is_ride_paid,
                    kmOfRide: ride.kmOfRide,
                    pickup_desc: ride.pickup_desc,
                    drop_desc: ride.drop_desc,
                    createdAt: ride.createdAt,
                    updatedAt: ride.updatedAt,
                    currentLocation: ride.currentLocation,
                    dropLocation: ride.dropLocation,
                    pickupLocation: ride.pickupLocation,
                    retryCount: ride.retryCount,
                    currentSearchRadius: ride.currentSearchRadius,
                    user: ride.user,
                    rider: {
                        _id: ride.rider._id,
                        name: ride.rider.name,
                        phone: ride.rider.phone,
                        Ratings: ride.rider.Ratings,
                        TotalRides: ride.rider.TotalRides,
                        isActive: ride.rider.isActive,
                        isAvailable: ride.rider.isAvailable,
                        isPaid: ride.rider.isPaid,
                        isProfileComplete: ride.rider.isProfileComplete,
                        DocumentVerify: ride.rider.DocumentVerify,
                        BH: ride.rider.BH,
                        YourQrCodeToMakeOnline: ride.rider.YourQrCodeToMakeOnline,
                    },
                },
                message: 'You can start this ride',
            }).save();

            if (driverSocketId) {
                io.to(driverSocketId).emit('ride_accepted_message', {
                    message: 'You can start this ride',
                    rideDetails: ride,
                    driver: driver,
                    temp_ride_id: dataSave?._id
                });

                console.log(`[${new Date().toISOString()}] Message sent to driver: ${ride.rider._id}`);
            } else {
                console.log(`[${new Date().toISOString()}] No active socket found for driver: ${ride.rider._id}`);
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error in rideAccepted_by_user:`, error);
        }
    });

    /**
         * Handle ride cancel by user or driver
         * Notifies the driver that the user has cancel the ride same as user if rider cancel
         */
    socket.on('ride-cancel-by-user', async (data) => {
        try {
            console.log("🚀 Received ride cancellation request:", data);

            const { cancelBy, rideData, reason } = data || {};

            if (!cancelBy || !rideData || !reason) {
                console.error("❌ Missing required fields in cancellation data.");
                return;
            }

            console.log("🔍 Processing cancellation by:", cancelBy);

            const dataOfRide = await cancelRideByAnyOne(cancelBy, rideData, reason);

            console.log("✅ Ride cancellation processed:", dataOfRide);

            if (dataOfRide.success) {
                const { ride } = dataOfRide;

                if (!ride) {
                    console.error("❌ Ride data is missing after cancellation.");
                    return;
                }

                console.log("🛑 Ride Status:", ride.rideStatus);
                console.log("🕒 Ride Cancel Time:", ride.rideCancelTime);

                if (cancelBy === "user") {
                    console.log("📢 Notifying driver about cancellation...", driverSocketMap);

                    const riderId = ride.rider?._id;


                    if (!riderId) {
                        console.error("❌ Rider ID is missing! Cannot find driver socket.");
                    } else {
                        const driverSocketId = driverSocketMap.get(String(riderId));
                        console.log("📡 Found driver socket ID:", driverSocketId);

                        if (driverSocketId) {
                            io.to(driverSocketId).emit('ride_cancelled', {
                                message: "🚖 Ride cancelled by user",
                                rideDetails: rideData,
                            });
                            console.log("mesage send")
                        } else {
                            console.warn("⚠️ Driver socket ID not found in map.");
                        }
                    }

                } else if (cancelBy === "driver") {
                    console.log("📢 Notifying user about cancellation...");
                    const userSocketId = userSocketMap.get(String(ride.user?._id));

                    if (userSocketId) {
                        console.log("📡 Sending cancel notification to user:", userSocketId);
                        io.to(userSocketId).emit('ride_cancelled_message', {
                            message: "🚕 Ride cancelled by driver",
                            rideDetails: rideData,
                        });

                        console.log("mesage sen to user")
                    } else {
                        console.warn("⚠️ User socket ID not found. User might be offline.");
                    }
                }
            } else {
                console.error("❌ Ride cancellation failed:", dataOfRide.message);
            }

        } catch (error) {
            console.error("❌ Error while canceling ride:", error);
        }
    });


    /**
     * Handle new ride requests from users
     * Processes a new ride request and broadcasts it to available drivers
     */
    socket.on('send_message', async (data) => {
        try {
            console.log(`[${new Date().toISOString()}] New ride request received:`, data);

            if (!data || !data.data || !data.data._id) {
                console.error(`[${new Date().toISOString()}] Invalid ride data: Missing required fields`);
                socket.emit('message_response', { success: false, error: "Invalid ride data" });
                return;
            }

            // Find rider information for the ride
            const riderData = await findRider(data.data._id, io);
            console.log("riderData", riderData)
            if (riderData) {

                emitRideToDrivers(riderData);

                // Confirm receipt to the requesting user
                socket.emit('message_response', {
                    success: true,
                    message: "Ride request sent to drivers",
                    riderData
                });
            } else {
                console.error(`[${new Date().toISOString()}] Rider not found for ID: ${data.data._id}`);
                socket.emit('message_response', {
                    success: false,
                    error: "Rider not found"
                });
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error processing ride request:`, error);
            socket.emit('message_response', {
                success: false,
                error: 'Failed to process the ride request',
            });
        }
    });

    /**
     * Handle ride start event
     * Updates ride status to 'started' and notifies the user
     */
    socket.on('ride_started', async (data) => {
        try {
            console.log(`[${new Date().toISOString()}] Ride start request:`, data);

            if (!data || !data.user) {
                console.error(`[${new Date().toISOString()}] Invalid ride_started data`);
                return;
            }

            const userSocketId = userSocketMap.get(String(data.user));
            const rideStartResult = await rideStart(data);

            if (rideStartResult.success) {
                console.log(`[${new Date().toISOString()}] Ride started successfully for user ${data.user}`);

                if (userSocketId) {
                    // Notify the user that their ride has started
                    io.to(userSocketId).emit('ride_user_start', {
                        message: 'Your ride has started!',
                        rideDetails: data,
                    });
                    console.log(`[${new Date().toISOString()}] Start notification sent to user: ${data.user}`);
                } else {
                    console.log(`[${new Date().toISOString()}] No active socket found for user: ${data.user}`);
                }
            } else {
                console.error(`[${new Date().toISOString()}] Error starting ride:`, rideStartResult.error);
                socket.emit('ride_error', { message: 'Failed to start ride' });
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error in ride_started:`, error);
            socket.emit('ride_error', { message: 'Failed to process ride start' });
        }
    });

    /**
     * Handle ride end event
     * Updates ride status to 'completed' and notifies the driver
     */

    socket.on('ride_end_by_rider', async (data) => {
        try {
            const ride_id = data?.rideDetails?._id;
            const user = data?.rideDetails?.user;

            // 🚫 Invalid data check
            if (!user || !ride_id) {
                console.error(`[${new Date().toISOString()}] Invalid ride_end_by_rider data`, data);
                return;
            }

            const userSocketId = userSocketMap.get(String(user));

            if (userSocketId) {
                io.to(userSocketId).emit('your_ride_is_mark_complete', {
                    message: 'Rider marked your ride as complete. Please confirm if it’s correct.',
                    rideId: ride_id,
                });
                console.log(`[${new Date().toISOString()}] Ride end confirmation sent to user: ${user}`);
            } else {
                console.log(`[${new Date().toISOString()}] No active socket found for user: ${user}`);
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error in ride_end_by_rider:`, error);
        }
    });


    socket.on('ride_incorrect_mark_done', async (data) => {
        try {


            const rideId = data?._id;
            const rider = data?.rider?._id;

            if (!rideId || !rider) {
                console.error(`[${new Date().toISOString()}] Invalid data in ride_incorrect_mark_done`, data);
                return;
            }
            const driverSocketId = driverSocketMap.get(String(rider));

            if (driverSocketId) {
                io.to(driverSocketId).emit('mark_as_done_rejected', {
                    message: 'User reported that the ride is not completed. Please verify.',
                    rideId
                });
                console.log(`[${new Date().toISOString()}] End notification sent to driver: ${rider}`);
            } else {
                console.log(`[${new Date().toISOString()}] No active socket found for driver: ${rider}`);
            }



        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error in ride_incorrect_mark_done:`, error);
        }
    });



    socket.on('endRide', async (data) => {
        try {
            console.log(`[${new Date().toISOString()}] Ride end request:`, data);

            if (!data || !data.ride) {
                console.error(`[${new Date().toISOString()}] Invalid endRide data`);
                return;
            }

            const rideEndResult = await rideEnd(data.ride);

            if (rideEndResult.success) {
                console.log(`[${new Date().toISOString()}] Ride ended successfully. Driver ID: ${rideEndResult.driverId}`);

                const driverSocketId = driverSocketMap.get(String(rideEndResult.driverId));

                if (driverSocketId) {
                    io.to(driverSocketId).emit('ride_end', {
                        message: 'Your ride has been completed. Please collect payment.',
                        rideDetails: data,
                    });
                    console.log(`[${new Date().toISOString()}] End notification sent to driver: ${rideEndResult.driverId}`);
                } else {
                    console.log(`[${new Date().toISOString()}] No active socket found for driver: ${rideEndResult.driverId}`);
                }
            } else {
                console.error(`[${new Date().toISOString()}] Error ending ride:`, rideEndResult.error);
                socket.emit('ride_error', { message: 'Failed to end ride' });
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error in endRide:`, error);
            socket.emit('ride_error', { message: 'Failed to process ride end' });
        }
    });


    socket.on('send_rider_location', async (data) => {
        const { rider, user } = data || {};

        if (!rider || !user) {
            console.error('[send_rider_location] Invalid data received:', data);
            return;
        }

        const riderId = rider?._id;
        if (!riderId) {
            console.error('[send_rider_location] Rider ID missing in data:', rider);
            return;
        }

        try {
            const foundLiveLocation = await RiderModel.findById(riderId);
            if (!foundLiveLocation) {
                console.error(`[send_rider_location] Rider with ID ${riderId} not found`);
                return;
            }

            const reterviewdLocation = foundLiveLocation?.location;
            if (!reterviewdLocation || reterviewdLocation.coordinates.length < 2) {
                console.error(`[send_rider_location] Location not found or invalid for rider ID ${riderId}`);
                return;
            }

            const foundUserSocket = userSocketMap.get(String(user));
            if (!foundUserSocket) {
                console.error(`[send_rider_location] No active socket found for user ID ${user}`);
                return;
            }

            // Emit location to user
            io.to(foundUserSocket).emit('rider_location', {
                message: 'Rider location updated',
                location: reterviewdLocation.coordinates,
            });

            console.log(`[send_rider_location] Sent rider location to user ${user}`);

        } catch (error) {
            console.error('[send_rider_location] Error handling location update:', error);
        }
    });


    /**
     * Handle payment received event
     * Updates ride payment status and prompts user for rating
     */
    socket.on('isPay', async (data) => {
        try {
            console.log(`[${new Date().toISOString()}] Payment confirmation received:`, data);

            if (!data || !data.ride || !data.ride.user) {
                console.error(`[${new Date().toISOString()}] Invalid payment data`);
                return;
            }

            const collectResult = await collectCash(data.ride);

            if (collectResult.success) {
                console.log(`[${new Date().toISOString()}] Payment recorded successfully for user: ${data.ride.user}`);

                const userSocketId = userSocketMap.get(String(data.ride.user));

                if (userSocketId) {
                    io.to(userSocketId).emit('give-rate', {
                        message: 'Your payment has been received. Please rate your ride.',
                        rideDetails: data,
                    });
                    console.log(`[${new Date().toISOString()}] Rating request sent to user: ${data.ride.user}`);
                } else {
                    console.log(`[${new Date().toISOString()}] No active socket found for user: ${data.ride.user}`);
                }
            } else {
                console.error(`[${new Date().toISOString()}] Error recording payment:`, collectResult.error);
                socket.emit('payment_error', { message: 'Failed to process payment confirmation' });
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error in isPay:`, error);
            socket.emit('payment_error', { message: 'Failed to process payment' });
        }
    });

    /**
     * Handle rating submission
     * Records the user's rating and notifies the driver
     */
    socket.on('rating', async (data) => {
        try {
            console.log(`[${new Date().toISOString()}] Rating submission received:`, data);

            const { rating, ride } = data;

            if (!rating || !ride) {
                console.error(`[${new Date().toISOString()}] Invalid rating data`);
                return;
            }

            const ratingResult = await AddRating(ride, rating);

            if (ratingResult.success) {
                console.log(`[${new Date().toISOString()}] Rating added successfully. Driver ID: ${ratingResult.driverId}`);

                const driverSocketId = driverSocketMap.get(String(ratingResult.driverId));

                if (driverSocketId) {
                    io.to(driverSocketId).emit('rating', {
                        message: 'You have received a rating for your ride.',
                        rating: rating,
                    });
                    console.log(`[${new Date().toISOString()}] Rating notification sent to driver: ${ratingResult.driverId}`);
                } else {
                    console.log(`[${new Date().toISOString()}] No active socket found for driver: ${ratingResult.driverId}`);
                }
            } else {
                console.error(`[${new Date().toISOString()}] Error adding rating:`, ratingResult.error);
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error in rating:`, error);
        }
    });

    /**
     * Handle parcel acceptance by driver
     * Updates the parcel request and notifies relevant parties
     */
    socket.on("driver_parcel_accept", async (data) => {
        try {
            console.log(`[${new Date().toISOString()}] Parcel acceptance request:`, data);

            if (!data || !data.order_id || !data.driver_id) {
                console.error(`[${new Date().toISOString()}] Invalid parcel acceptance data`);
                return;
            }

            const response = await update_parcel_request(io, data, driverSocketMap, userSocketMap);

            if (response.status) {
                console.log(`[${new Date().toISOString()}] Parcel accepted successfully:`, response.message);

                // Find the driver's socket ID
                const driverSocketId = driverSocketMap.get(data.driver_id);

                if (driverSocketId) {
                    io.to(driverSocketId).emit("order_update_success", {
                        status: true,
                        message: "Order successfully accepted",
                        order_id: data.order_id,
                    });
                    console.log(`[${new Date().toISOString()}] Acceptance confirmation sent to driver: ${data.driver_id}`);
                } else {
                    console.log(`[${new Date().toISOString()}] No active socket found for driver: ${data.driver_id}`);
                }
            } else {
                console.error(`[${new Date().toISOString()}] Parcel acceptance failed:`, response.error);

                // Send failure response back to driver
                const driverSocketId = driverSocketMap.get(data.driver_id);

                if (driverSocketId) {
                    io.to(driverSocketId).emit("order_update_failed", {
                        status: false,
                        message: response.message || "Failed to accept order",
                    });
                }
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error in driver_parcel_accept:`, error);
        }
    });

    /**
     * Handle driver reached pickup location event
     * Updates the parcel status and notifies relevant parties
     */
    socket.on('driver_reached', async (data) => {
        try {
            console.log(`[${new Date().toISOString()}] Driver reached notification:`, data);

            if (!data || !data._id || !data.driverId) {
                console.error(`[${new Date().toISOString()}] Invalid driver_reached data`);
                return;
            }

            const response = await mark_reached(io, data, driverSocketMap, userSocketMap);

            if (response.status) {
                console.log(`[${new Date().toISOString()}] Driver reached status updated:`, response.message);

                // Notify driver of successful status update
                const driverSocketId = driverSocketMap.get(data.driver_id);

                if (driverSocketId) {
                    io.to(driverSocketId).emit("order_mark_success", {
                        status: true,
                        message: "Location reached status updated",
                        order_id: data._id,
                    });
                }
            } else {
                console.error(`[${new Date().toISOString()}] Driver reached status update failed:`, response.error);

                // Notify driver of failed status update
                const driverSocketId = driverSocketMap.get(data.driver_id);

                if (driverSocketId) {
                    io.to(driverSocketId).emit("order_update_failed", {
                        status: false,
                        message: response.message || "Failed to update status",
                    });
                }
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error in driver_reached:`, error);
        }
    });

    /**
     * Handle pickup confirmation event
     * Updates the parcel status to 'picked up' and notifies relevant parties
     */
    socket.on('mark_pick', async (data) => {
        try {
            console.log(`[${new Date().toISOString()}] Parcel pickup notification:`, data);

            if (!data || !data._id || !data.driverId) {
                console.error(`[${new Date().toISOString()}] Invalid mark_pick data`);
                return;
            }

            const response = await mark_pick(io, data, driverSocketMap, userSocketMap);

            if (response.status) {
                console.log(`[${new Date().toISOString()}] Parcel pickup status updated:`, response.message);

                // Notify driver of successful pickup status update
                const driverSocketId = driverSocketMap.get(data.driver_id);

                if (driverSocketId) {
                    io.to(driverSocketId).emit("mark_pick_driver", {
                        status: true,
                        message: "Pickup status updated successfully",
                        order_id: data._id,
                    });
                }
            } else {
                console.error(`[${new Date().toISOString()}] Parcel pickup status update failed:`, response.error);

                // Notify driver of failed pickup status update
                const driverSocketId = driverSocketMap.get(data.driver_id);

                if (driverSocketId) {
                    io.to(driverSocketId).emit("order_update_failed", {
                        status: false,
                        message: response.message || "Failed to update pickup status",
                    });
                }
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error in mark_pick:`, error);
        }
    });

    /**
     * Handle delivery confirmation event
     * Updates the parcel status to 'delivered' and notifies relevant parties
     */
    socket.on('mark_deliver', async (data, moneyWriteAble, mode) => {
        try {
            console.log(`[${new Date().toISOString()}] Parcel delivery notification:`, data);

            if (!data || !data._id || !data.driverId) {
                console.error(`[${new Date().toISOString()}] Invalid mark_deliver data`);
                return;
            }

            const response = await mark_deliver(io, data, driverSocketMap, userSocketMap, moneyWriteAble, mode);

            if (response.status) {
                console.log(`[${new Date().toISOString()}] Parcel delivery status updated:`, response.message);

                // Notify driver of successful delivery status update
                const driverSocketId = driverSocketMap.get(data.driver_id);

                if (driverSocketId) {
                    io.to(driverSocketId).emit("mark_pick_driver", {
                        status: true,
                        message: "Delivery status updated successfully",
                        order_id: data._id,
                    });
                }
            } else {
                console.error(`[${new Date().toISOString()}] Parcel delivery status update failed:`, response.error);

                // Notify driver of failed delivery status update
                const driverSocketId = driverSocketMap.get(data.driver_id);

                if (driverSocketId) {
                    io.to(driverSocketId).emit("order_update_failed", {
                        status: false,
                        message: response.message || "Failed to update delivery status",
                    });
                }
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error in mark_deliver:`, error);
        }
    });

    /**
     * Handle order cancellation event
     * Updates the parcel status to 'cancelled' and notifies relevant parties
     */
    socket.on('mark_cancel', async (data) => {
        try {
            console.log(`[${new Date().toISOString()}] Order cancellation request:`, data);

            if (!data || !data._id || !data.driverId) {
                console.error(`[${new Date().toISOString()}] Invalid mark_cancel data`);
                return;
            }

            const response = await mark_cancel(io, data, driverSocketMap, userSocketMap);

            if (response.status) {
                console.log(`[${new Date().toISOString()}] Order cancellation status updated:`, response.message);

                // Notify driver of successful cancellation status update
                const driverSocketId = driverSocketMap.get(data.driver_id);

                if (driverSocketId) {
                    io.to(driverSocketId).emit("mark_pick_driver", {
                        status: true,
                        message: "Cancellation status updated successfully",
                        order_id: data._id,
                    });
                }
            } else {
                console.error(`[${new Date().toISOString()}] Order cancellation status update failed:`, response.error);

                // Notify driver of failed cancellation status update
                const driverSocketId = driverSocketMap.get(data.driver_id);

                if (driverSocketId) {
                    io.to(driverSocketId).emit("order_update_failed", {
                        status: false,
                        message: response.message || "Failed to update cancellation status",
                    });
                }
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error in mark_cancel:`, error);
        }
    });


    /**
     * Handle client disconnections
     * Removes the disconnected client from appropriate connection maps
     */
    socket.on('disconnect', (reason) => {
        console.log(`[${new Date().toISOString()}] Client disconnected. Socket ID: ${socket.id}, Reason: ${reason}`);

        // Remove user from userSocketMap if found
        for (const [userId, socketId] of userSocketMap.entries()) {
            if (socketId === socket.id) {
                userSocketMap.delete(userId);
                console.log(`[${new Date().toISOString()}] User ${userId} disconnected and removed from map`);
                break;
            }
        }

        // Remove driver from driverSocketMap if found
        for (const [driverId, socketId] of driverSocketMap.entries()) {
            if (socketId === socket.id) {
                driverSocketMap.delete(driverId);
                console.log(`[${new Date().toISOString()}] Driver ${driverId} disconnected and removed from map`);
                break;
            }
        }

        // Remove tiffin partner from tiffinPartnerMap if found
        for (const [partnerId, socketId] of tiffinPartnerMap.entries()) {
            if (socketId === socket.id) {
                tiffinPartnerMap.delete(partnerId);
                console.log(`[${new Date().toISOString()}] Tiffin partner ${partnerId} disconnected and removed from map`);
                break;
            }
        }
    });
});

// API Routes
app.use('/api/v1/rider', router);
app.use('/api/v1/rides', rides);
app.use('/api/v1/hotels', hotel_router);
app.use('/api/v1/user', users);
app.use('/api/v1/tiffin', tiffin);
app.use('/api/v1/parcel', parcel);
app.use('/api/v1/heavy', Heavy);
app.use('/api/v1/admin', admin);

/**
 * Image upload endpoint
 * Handles file uploads using multer
 */
app.post('/image-upload', upload.any(), async (req, res) => {
    try {
        console.log(`[${new Date().toISOString()}] Image upload request received`, {
            filesCount: req.files ? req.files.length : 0
        });

        return res.status(201).json({
            message: "Image uploaded successfully",
            data: req.files
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Image upload error:`, error.message);
        return res.status(500).json({
            message: "Image upload failed",
            error: error.message
        });
    }
});

/**
 * Location webhook for parcel delivery personnel
 * Updates the current location of a parcel delivery person
 */
app.post('/webhook/cab-receive-location', Protect, async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        const userId = req.user.userId;
        // console.log("user hits", req.user)
        //   console.log("body hits",req.body)

        const data = await RiderModel.findOneAndUpdate(
            { _id: userId },
            {
                location: {
                    type: 'Point',
                    coordinates: [longitude, latitude]
                },
                lastUpdated: new Date()
            },
            { upsert: true, new: true }
        );

        // console.log("data", data)

        res.status(200).json({ message: 'Location updated successfully' });
    } catch (error) {
        console.error('Error updating location:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/webhook/receive-location', Protect, async (req, res) => {
    try {
        console.log("user hits", req.user)
        const { latitude, longitude } = req.body;
        const userId = req.user.userId;

        const data = await Parcel_boy_Location.findOneAndUpdate(
            { _id: userId },
            {
                location: {
                    type: 'Point',
                    coordinates: [longitude, latitude]
                },
                lastUpdated: new Date()
            },
            { upsert: true, new: true }
        );
        // console.log("data", data)

        res.status(200).json({ message: 'Location updated successfully' });
    } catch (error) {
        console.error('Error updating location:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



app.get('/rider', async (req, res) => {
    try {
        const riders = await RiderModel.find({ isAvailable: true });
        res.render('riders', { riders });
    } catch (err) {
        res.status(500).send('Error retrieving riders');
    }
});
app.get('/rider/:tempRide', async (req, res) => {
    try {
        const { tempRide } = req.params;

        if (!tempRide || !mongoose.Types.ObjectId.isValid(tempRide)) {
            return res.status(400).json({ error: 'Invalid ride ID' });
        }

        const ride = await tempRideDetailsSchema.findById(tempRide);

        if (!ride) {
            return res.status(404).json({ error: 'Ride not found' });
        }

        res.status(200).json({ ride });
    } catch (err) {
        console.error(`[${new Date().toISOString()}] Error fetching temp ride:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.get('/', (req, res) => {
    res.status(201).json({
        message: 'Welcome to the API',
    })
})

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});



app.post('/Fetch-Current-Location', async (req, res) => {
    const { lat, lng } = req.body;
    console.log("body", req.body)
    // Check if latitude and longitude are provided
    if (!lat || !lng) {
        return res.status(400).json({
            success: false,
            message: "Latitude and longitude are required",
        });
    }

    try {


        // Fetch address details using the provided latitude and longitude
        const addressResponse = await axios.get(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8`
        );




        // Check if any results are returned
        if (addressResponse.data.results.length > 0) {
            const addressComponents = addressResponse.data.results[0].address_components;
            // console.log(addressComponents)

            let city = null;
            let area = null;
            let postalCode = null;
            let district = null;

            // Extract necessary address components
            addressComponents.forEach(component => {
                if (component.types.includes('locality')) {
                    city = component.long_name;
                } else if (component.types.includes('sublocality_level_1')) {
                    area = component.long_name;
                } else if (component.types.includes('postal_code')) {
                    postalCode = component.long_name;
                } else if (component.types.includes('administrative_area_level_3')) {
                    district = component.long_name; // Get district
                }
            });


            // Prepare the address details object
            const addressDetails = {
                completeAddress: addressResponse.data.results[0].formatted_address,
                city: city,
                area: area,
                district: district,
                postalCode: postalCode,
                landmark: null, // Placeholder for landmark if needed
                lat: addressResponse.data.results[0].geometry.location.lat,
                lng: addressResponse.data.results[0].geometry.location.lng,
            };

            // console.log("Address Details:", addressDetails);

            // Respond with the location and address details
            return res.status(200).json({
                success: true,
                data: {
                    location: { lat, lng },
                    address: addressDetails,
                },
                message: "Location fetch successful"
            });
        } else {
            return res.status(404).json({
                success: false,
                message: "No address found for the given location",
            });
        }
    } catch (error) {
        console.error('Error fetching address:', error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch address",
        });
    }
});

app.post("/geo-code-distance", async (req, res) => {
    try {
        const { pickup, dropOff } = req.body;

        if (!pickup || !dropOff) {
            return res.status(400).json({ message: "Pickup and DropOff addresses are required" });
        }

        // Geocode Pickup Location
        const pickupResponse = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
            params: { address: pickup, key: 'AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8' },
        });

        if (pickupResponse.data.status !== "OK") {
            return res.status(400).json({ message: "Invalid Pickup location" });
        }
        const pickupData = pickupResponse.data.results[0].geometry.location;

        // Geocode Dropoff Location
        const dropOffResponse = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
            params: { address: dropOff, key: 'AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8' },
        });

        if (dropOffResponse.data.status !== "OK") {
            return res.status(400).json({ message: "Invalid Dropoff location" });
        }
        const dropOffData = dropOffResponse.data.results[0].geometry.location;

        // Calculate Distance using Google Distance Matrix API
        const distanceResponse = await axios.get("https://maps.googleapis.com/maps/api/distancematrix/json", {
            params: {
                origins: `${pickupData.lat},${pickupData.lng}`,
                destinations: `${dropOffData.lat},${dropOffData.lng}`,
                key: 'AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8',
            },
        });

        if (distanceResponse.data.status !== "OK") {
            return res.status(400).json({ message: "Failed to calculate distance" });
        }

        const distanceInfo = distanceResponse.data.rows[0].elements[0];

        if (distanceInfo.status !== "OK") {
            return res.status(400).json({ message: "Invalid distance calculation" });
        }

        const settings = await Settings.findOne()

        const distanceInKm = distanceInfo.distance.value / 1000; // Convert meters to kilometers
        const price = distanceInKm * settings.foodDeliveryPrice; // ₹20 per km

        return res.status(200).json({
            pickupLocation: pickupData,
            dropOffLocation: dropOffData,
            distance: distanceInfo.distance.text,
            duration: distanceInfo.duration.text,
            price: `₹${price.toFixed(2)}`, // Show price with 2 decimal places
        });
    } catch (error) {
        console.error("Error in geo-code-distance:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
});


// Start the server
const PORT = 3100;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    // startExpiryCheckJob();
});
