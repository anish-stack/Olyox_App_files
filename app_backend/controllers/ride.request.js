const RideRequest = require('../models/ride.request.model');
const Riders = require('../models/Rider.model')
const axios = require('axios');
const Crypto = require('crypto');
const { FindWeather, CheckTolls } = require('../utils/Api.utils');
const Settings = require('../models/Admin/Settings');
const RidesSuggestionModel = require('../models/Admin/RidesSuggestion.model');
const tempRideDetailsSchema = require('../models/tempRideDetailsSchema');
const RideRequestNotification = require('../models/RideRequestNotification');
const rideRequestModel = require('../models/ride.request.model');
const SendWhatsAppMessageNormal = require('../utils/normalWhatsapp');
exports.createRequest = async (req, res) => {
    try {
        const user = Array.isArray(req.user.user) ? req.user.user[0] : req.user.user;
        const { vehicleType, pickupLocation, dropLocation, currentLocation, pick_desc, drop_desc, fcmToken } = req.body;

        if (!pickupLocation || !dropLocation || !pick_desc || !drop_desc) {

            return res.status(400).json({ error: 'All fields are required' });
        }



        const pickup_coords = [pickupLocation.longitude, pickupLocation.latitude];
        const drop_coords = [dropLocation.longitude, dropLocation.latitude];
        const current_coords = [currentLocation.longitude, currentLocation.latitude];


        const pickupLocationGeo = {
            type: 'Point',
            coordinates: pickup_coords
        };
        const dropLocationGeo = {
            type: 'Point',
            coordinates: drop_coords
        };
        const currentLocationGeo = {
            type: 'Point',
            coordinates: current_coords
        };


        const newRideRequest = new RideRequest({
            vehicleType,
            user: user,
            pickupLocation: pickupLocationGeo,
            dropLocation: dropLocationGeo,
            currentLocation: currentLocationGeo,
            rideStatus: 'pending',
            pickup_desc: pick_desc,
            drop_desc: drop_desc,
            userFcm:fcmToken
        });


        await newRideRequest.save();

        res.status(201).json({
            message: 'Ride request created successfully',
            rideRequest: newRideRequest
        });

    } catch (error) {
        // Handle errors and send an appropriate response
        console.error(error);
        res.status(500).json({ error: 'Server error, please try again' });
    }
};



exports.findRider = async (id, io, app) => {
    // Configuration constants
    const MAX_RETRIES = 2;
    const RETRY_DELAY_MS = 10000;
    const INITIAL_RADIUS = 2500;  // meters
    const RADIUS_INCREMENT = 500; // meters
    const API_TIMEOUT = 8000;     // 8 seconds for API calls

    // Debugging helper
    const debug = (message, data = null) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [FIND_RIDER] ${message}`);
        if (data) console.log(JSON.stringify(data, null, 2));
    };

    let retryCount = 0;
    const rideRequestId = id;

    debug(`Starting findRider for request ID: ${rideRequestId}`);

    // Function to validate location coordinates
    const validateCoordinates = (location, locationType) => {
        if (!location ||
            !location.coordinates ||
            !Array.isArray(location.coordinates) ||
            location.coordinates.length !== 2 ||
            typeof location.coordinates[0] !== 'number' ||
            typeof location.coordinates[1] !== 'number' ||
            location.coordinates[0] < -180 ||
            location.coordinates[0] > 180 ||
            location.coordinates[1] < -90 ||
            location.coordinates[1] > 90) {
            throw new Error(`Invalid ${locationType} location coordinates`);
        }
        return true;
    };

    // Check if socket map exists
    const getDriverSocketMap = () => {
        const driverSocketMap = app.get('driverSocketMap');
        if (!driverSocketMap) {
            debug("Warning: driverSocketMap not found in app context");
            return new Map();
        }
        return driverSocketMap;
    };

    // Function to find riders with retry logic and expanding radius
    const attemptFindRiders = async () => {
        debug(`Search attempt ${retryCount + 1}/${MAX_RETRIES}`);

        try {
            // Fetch and validate ride request with error handling
            let rideRequest;
            try {
                rideRequest = await RideRequest.findById(rideRequestId)
                    .populate("user")
                    .lean();

                if (!rideRequest) {
                    throw new Error("Ride request not found");
                }
            } catch (dbError) {
                debug(`Database error fetching ride request: ${dbError.message}`);
                throw new Error(`Failed to retrieve ride request: ${dbError.message}`);
            }

            const {
                pickupLocation,
                pickup_desc,
                drop_desc,
                vehicleType,
                dropLocation,
                user,
                status
            } = rideRequest;

            // Validate user object
            if (!user || !user._id) {
                throw new Error("Invalid user data in ride request");
            }

            const userId = user._id.toString();
            debug(`Processing ride request for user ID: ${userId}`);

            // If ride request was canceled or completed during retry
            if (status === 'cancelled' || status === 'completed') {
                debug(`Ride request ${rideRequestId} is ${status}. Stopping search.`);
                return { message: `Ride request is ${status}` };
            }

            // Validate pickup and drop locations
            validateCoordinates(pickupLocation, "pickup");
            validateCoordinates(dropLocation, "drop");

            // Validate vehicle type
            if (!vehicleType) {
                throw new Error("Vehicle type is required");
            }

            const [longitude, latitude] = pickupLocation.coordinates;

            // Calculate current search radius based on retry count
            const currentRadius = INITIAL_RADIUS + (retryCount * RADIUS_INCREMENT);
            debug(`Searching with radius: ${currentRadius / 1000} km`);

            // Find nearby available riders with matching vehicle type
            let riders;
            try {
                riders = await Riders.aggregate([
                    {
                        $geoNear: {
                            near: { type: "Point", coordinates: [longitude, latitude] },
                            distanceField: "distance",
                            maxDistance: currentRadius,
                            spherical: true,
                        },
                    },
                    {
                        $match: {
                            isAvailable: true,
                            "rideVehicleInfo.vehicleType": vehicleType,
                        },
                    },
                    {
                        $project: {
                            name: 1,
                            phoneNumber: 1,
                            profileImage: 1,
                            rating: 1,
                            "rideVehicleInfo.vehicleName": 1,
                            "rideVehicleInfo.vehicleImage": 1,
                            "rideVehicleInfo.VehicleNumber": 1,
                            "rideVehicleInfo.PricePerKm": 1,
                            "rideVehicleInfo.vehicleType": 1,
                            "RechargeData.expireData": 1,
                            on_ride_id: 1,
                            distance: 1,
                        },
                    },
                ]);

                debug(`Found ${riders} potential riders before filtering`);

            } catch (aggregateError) {
                debug(`Error in riders aggregation: ${aggregateError.message}`);
                throw new Error(`Failed to search for nearby drivers: ${aggregateError.message}`);
            }

            // Further filter riders based on additional criteria
            const validRiders = riders.filter((rider) => {
                const expire = rider?.RechargeData?.expireData;
                const currentDate = new Date();
                const hasValidRecharge = expire && new Date(expire) >= currentDate;
                const isFreeRider = rider?.on_ride_id === null || rider?.on_ride_id === undefined;

                if (!hasValidRecharge) {
                    debug(`Rider ${rider._id} filtered out: recharge expired`);
                }

                if (!isFreeRider) {
                    debug(`Rider ${rider._id} filtered out: already on ride`);
                }

                return hasValidRecharge && isFreeRider;
            });

            debug(`Found ${validRiders.length} eligible riders after filtering`);

            if (!validRiders || validRiders.length === 0) {
                debug(`No available riders found within ${currentRadius / 1000} km`);

                // Notify user about the search status
                io.to(userId).emit("finding_driver_update", {
                    message: `Searching for drivers within ${currentRadius / 1000} km...`,
                    searchRadius: currentRadius / 1000,
                    retryCount,
                    maxRetries: MAX_RETRIES
                });

                // Handle retry logic for no drivers found
                if (retryCount < MAX_RETRIES) {
                    debug(`Will retry in ${RETRY_DELAY_MS / 1000}s with expanded radius`);
                    retryCount++;

                    // Update ride request with retry count and current radius
                    try {
                        await RideRequest.findByIdAndUpdate(rideRequestId, {
                            $set: {
                                retryCount,
                                lastRetryAt: new Date(),
                                currentSearchRadius: currentRadius + RADIUS_INCREMENT
                            }
                        });
                    } catch (updateError) {
                        debug(`Error updating ride request for retry: ${updateError.message}`);
                        // Continue with retry even if update fails
                    }

                    // Notify user about retry with expanded radius
                    io.to(userId).emit("finding_driver", {
                        message: `Expanding search area... Attempt ${retryCount}/${MAX_RETRIES}`,
                        retryCount,
                        maxRetries: MAX_RETRIES,
                        currentRadius: (currentRadius / 1000).toFixed(1),
                        nextRadius: ((currentRadius + RADIUS_INCREMENT) / 1000).toFixed(1)
                    });

                    // Schedule retry after delay
                    return new Promise(resolve => {
                        setTimeout(async () => {
                            resolve(await attemptFindRiders());
                        }, RETRY_DELAY_MS);
                    });
                } else {
                    debug(`No riders found after ${MAX_RETRIES} attempts with max radius of ${(INITIAL_RADIUS + (MAX_RETRIES - 1) * RADIUS_INCREMENT) / 1000} km`);

                    // Update ride request status
                    try {
                        await RideRequest.findByIdAndUpdate(rideRequestId, {
                            $set: {
                                rideStatus: 'no_driver_found',
                                maxSearchRadius: INITIAL_RADIUS + (MAX_RETRIES - 1) * RADIUS_INCREMENT
                            }
                        });
                    } catch (updateError) {
                        debug(`Error updating ride request status: ${updateError.message}`);
                    }

                    // Notify user that no drivers were found
                    io.to(userId).emit("no_drivers_available", {
                        message: `No drivers available within ${(INITIAL_RADIUS + (MAX_RETRIES - 1) * RADIUS_INCREMENT) / 1000} km of your location. Please try again later.`,
                        rideRequestId,
                        maxRadius: (INITIAL_RADIUS + (MAX_RETRIES - 1) * RADIUS_INCREMENT) / 1000
                    });

                    return {
                        error: "No drivers available after maximum retries",
                        rideRequestId,
                        maxSearchRadius: (INITIAL_RADIUS + (MAX_RETRIES - 1) * RADIUS_INCREMENT) / 1000
                    };
                }
            }

            // Get route information from Google Maps API with proper error handling
            debug("Calculating route and prices...");
            const origin = `${pickupLocation.coordinates[1]},${pickupLocation.coordinates[0]}`;
            const destination = `${dropLocation.coordinates[1]},${dropLocation.coordinates[0]}`;

            let routeData;
            try {
                const response = await axios.get("https://maps.googleapis.com/maps/api/directions/json", {
                    params: {
                        origin,
                        destination,
                        key: "AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8",
                        traffic_model: "best_guess",
                        departure_time: "now",
                        alternatives: true
                    },
                    timeout: 5000
                });

                if (response.status !== 200) {
                    throw new Error(`Maps API returned status ${response.status}`);
                }

                if (!response?.data?.routes || response.data.routes.length === 0) {
                    throw new Error("No route found between pickup and drop locations");
                }

                routeData = response.data;
                debug(`Successfully retrieved ${routeData.routes.length} route options from Maps API`);

            } catch (routeError) {
                debug(`Maps API error: ${routeError.message}`);
                throw new Error(`Failed to calculate route: ${routeError.message}`);
            }

            // Get the fastest route considering traffic
            const routes = routeData.routes;
            const sortedRoutes = routes.sort((a, b) =>
                (a.legs[0].duration_in_traffic?.value || a.legs[0].duration.value) -
                (b.legs[0].duration_in_traffic?.value || b.legs[0].duration.value)
            );

            const fastestRoute = sortedRoutes[0];
            const distance = fastestRoute.legs[0].distance.value / 1000; // km
            const duration = fastestRoute.legs[0].duration.value / 60; // minutes
            const trafficDuration =
                (fastestRoute.legs[0].duration_in_traffic?.value || fastestRoute.legs[0].duration.value) / 60; // minutes

            debug(`Route calculated: ${distance.toFixed(2)} km, ${Math.round(trafficDuration)} mins`);

            // Get vehicle pricing
            let vehiclePricing;
            try {
                vehiclePricing = await RidesSuggestionModel.findOne({
                    name: vehicleType
                }).lean();

                if (!vehiclePricing) {
                    throw new Error(`Pricing not found for vehicle type: ${vehicleType}`);
                }

                debug(`Found pricing for ${vehicleType}: ${vehiclePricing.priceRange} per km`);

            } catch (pricingError) {
                debug(`Error fetching vehicle pricing: ${pricingError.message}`);
                throw new Error(`Failed to get pricing information: ${pricingError.message}`);
            }

            const ratePerKm = vehiclePricing.priceRange;
            const waitingTimeInMinutes = 0;

            // Calculate ride price
            let priceData;
            try {
                const priceCalculationData = {
                    pickupLocation,
                    dropLocation,
                    waitingTimeInMinutes,
                    ratePerKm,
                    polyline: fastestRoute.overview_polyline?.points,
                    distance
                };

                priceData = await calculateRidePriceForConfirmRide(priceCalculationData);

                if (!priceData) {
                    throw new Error("Failed to calculate ride price");
                }

                debug(`Price calculated: ${priceData.totalPrice.toFixed(2)} INR`);

            } catch (priceError) {
                debug(`Price calculation error: ${priceError.message}`);
                throw new Error(`Failed to calculate price: ${priceError.message}`);
            }

            const eta = Math.round(trafficDuration);

            // Format the riders information for the response
            const ridersInfo = validRiders.map((rider) => ({
                id: rider._id,
                name: rider.name,
                phoneNumber: rider.phoneNumber,
                profileImage: rider.profileImage || null,
                rating: rider.rating || 4.5,
                rideRequestId,
                vehicleName: rider.rideVehicleInfo.vehicleName,
                vehicleImage: rider.rideVehicleInfo.vehicleImage || null,
                vehicleNumber: rider.rideVehicleInfo.VehicleNumber,
                pricePerKm: rider.rideVehicleInfo.PricePerKm,
                vehicleType: rider.rideVehicleInfo.vehicleType,
                distance: (rider.distance / 1000).toFixed(2), // Convert to m to km and format
                price: priceData?.totalPrice.toFixed(2),
                eta,
                rain: priceData?.rain || false,
                tollPrice: priceData?.tollPrice || 0,
                tolls: priceData.tolls !== undefined && priceData.tolls.length > 0,
                searchRadius: currentRadius / 1000 // Include the search radius that found this driver
            }));

            // Prepare complete ride information
            const rideInfo = {
                message: "Nearby riders found successfully",
                requestId: rideRequestId,
                riders: ridersInfo,
                user,
                pickup_desc,
                drop_desc,
                pickupLocation,
                dropLocation,
                polyline: fastestRoute.overview_polyline?.points,
                distance: distance.toFixed(2),
                duration: Math.round(duration),
                trafficDuration: Math.round(trafficDuration),
                price: priceData?.totalPrice.toFixed(2),
                currency: "INR",
                retryCount,
                searchRadius: currentRadius / 1000,
                timestamp: new Date(),
            };

            console.log("rideInfo", rideInfo)

            // Reset ride request retry count on success and store found radius
            try {
                await RideRequest.findByIdAndUpdate(rideRequestId, {
                    $set: {
                        retryCount: 0,
                        lastUpdatedAt: new Date(),
                        searchRadiusUsed: currentRadius / 1000,
                        rideStatus: 'drivers_found'
                    }
                });
            } catch (updateError) {
                debug(`Warning: Failed to update ride request after finding drivers: ${updateError.message}`);
                // Continue even if update fails
            }

            debug(`Found ${validRiders.length} eligible drivers at ${currentRadius / 1000} km radius.`);

            // Get driver socket map to send targeted notifications
            const driverSocketMap = getDriverSocketMap();
            const notifiedDrivers = [];
            const unavailableDrivers = [];
            let driverInfo
            // Emit ride request only to eligible drivers with active socket connections
            for (const rider of validRiders) {
                const riderId = rider._id.toString();
                const driverSocketId = driverSocketMap.get(riderId);

                if (driverSocketId) {
                    // Prepare driver-specific info
                    driverInfo = {
                        ...rideInfo,
                        driverDistance: (rider.distance / 1000).toFixed(2),
                        estimatedEarning: priceData?.totalPrice * 0.8, // Example: 80% of fare goes to driver
                        message: "New ride request nearby!"
                    };

                    // Emit to specific driver socket
                    io.to(driverSocketId).emit("ride_come", driverInfo);

                    debug(`Emitted ride request to driver ${riderId} via socket ${driverSocketId}`);
                    notifiedDrivers.push(riderId);

                    // Record that this driver was notified about this ride
                    try {
                        await RideRequestNotification.create({
                            rideRequestId,
                            driverId: riderId,
                            notifiedAt: new Date(),
                            status: 'sent'
                        });
                    } catch (notifError) {
                        debug(`Failed to record driver notification: ${notifError.message}`);
                        // Continue even if recording fails
                    }
                } else {
                    debug(`Driver ${riderId} doesn't have an active socket connection`);
                    unavailableDrivers.push(riderId);
                }
            }

            debug(`Notified ${notifiedDrivers.length} drivers, ${unavailableDrivers.length} drivers without active connections`);

            // Emit success event to user
            io.to(userId).emit("drivers_found", {
                message: `Found ${notifiedDrivers.length} drivers within ${currentRadius / 1000} km of your location`,
                rideInfo: {
                    ...rideInfo,
                    driversNotified: notifiedDrivers.length
                }
            });

            return {
                success: true,
                data: driverInfo,
                message: `Found and notified ${notifiedDrivers.length} drivers`,
                driversNotified: notifiedDrivers.length,
                searchRadius: currentRadius / 1000,
                rideRequestId
            };

        } catch (error) {
            debug(`Error in findRider attempt ${retryCount + 1}/${MAX_RETRIES}: ${error.message}`);
            debug(error.stack);

            // Only retry for certain errors
            const retryableErrors = [
                "No riders available",
                "Failed to calculate route",
                "Network error",
                "timeout",
                "Maps API",
                "price"
            ];

            const shouldRetry = retryableErrors.some(msg => error.message.toLowerCase().includes(msg.toLowerCase()));

            if (shouldRetry && retryCount < MAX_RETRIES) {
                debug(`Retrying findRider due to retryable error: ${error.message}`);
                retryCount++;

                try {
                    // Get user ID for notification
                    const rideRequest = await RideRequest.findById(rideRequestId).populate("user").lean();
                    if (rideRequest && rideRequest.user && rideRequest.user._id) {
                        // Notify user about retry
                        io.to(rideRequest.user._id.toString()).emit("finding_driver_error", {
                            message: `Encountered an issue, retrying... (${retryCount}/${MAX_RETRIES})`,
                            error: error.message,
                            retryCount
                        });
                    }
                } catch (notifyError) {
                    debug(`Failed to notify user about retry: ${notifyError.message}`);
                }

                return new Promise(resolve => {
                    setTimeout(async () => {
                        resolve(await attemptFindRiders());
                    }, RETRY_DELAY_MS);
                });
            } else {
                debug(`Not retrying after error: ${error.message}`);

                try {
                    // Update ride request to indicate error
                    await RideRequest.findByIdAndUpdate(rideRequestId, {
                        $set: {
                            rideStatus: 'error',
                            lastError: error.message,
                            lastErrorAt: new Date()
                        }
                    });

                    // Try to get user ID for notification
                    const rideRequest = await RideRequest.findById(rideRequestId).populate("user").lean();
                    if (rideRequest && rideRequest.user && rideRequest.user._id) {
                        // Notify user about error
                        io.to(rideRequest.user._id.toString()).emit("ride_request_error", {
                            message: `We encountered an error processing your ride request: ${error.message}`,
                            rideRequestId,
                            error: error.message
                        });
                    }
                } catch (finalError) {
                    debug(`Failed to update ride request or notify user about final error: ${finalError.message}`);
                }

                return {
                    error: error.message,
                    rideRequestId,
                    retryCount
                };
            }
        }
    };

    // Start the initial attempt and return the result
    return await attemptFindRiders();
};



// exports.ChangeRideRequestByRider = async (io, data) => {
//     try {
//         console.log("data of change", data)
//         if (!data || !data.ride_request_id || !data.rider_id) {
//             throw new Error('Invalid data: rideRequestId and driverId are required');
//         }

//         const { ride_request_id, rider_id, user_id } = data;

//         const findDriver = await Riders.findById(rider_id)
//         if (!findDriver) {
//             return res.status(403).json({
//                 success: false,
//                 message: 'Driver not found',

//             })
//         }
//         // Fetch the ride request from the database
//         const ride = await RideRequest.findById(ride_request_id);
//         const { pickupLocation, dropLocation } = ride;

//         const originD = `${[pickupLocation.coordinates[1], pickupLocation.coordinates[0]]}`
//         const destinationD = `${[dropLocation.coordinates[1], dropLocation.coordinates[0]]}`

//         if (!ride) {
//             throw new Error('Ride request not found');
//         }

//         // Check ride status
//         if (ride.rideStatus === 'accepted') {
//             throw new Error('Ride has already been accepted by another rider');
//         }

//         ride.rideStatus = 'accepted';
//         ride.rider = findDriver._id;
//         await ride.save();
//         const populatedRide = await RideRequest.findById(ride_request_id).populate('rider');

//         let eta = null;
//         let origin = `${populatedRide?.rider?.location?.coordinates?.[1]},${populatedRide?.rider?.location?.coordinates?.[0]}`
//         let destination = `${populatedRide?.currentLocation?.coordinates?.[1] || ''},${populatedRide?.currentLocation?.coordinates?.[0] || ''}`

//         try {


//             const response = await axios.get(`https://maps.googleapis.com/maps/api/directions/json`, {
//                 params: {
//                     origin: origin,
//                     destination: destination,
//                     key: 'AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8',
//                     traffic_model: 'best_guess',
//                     departure_time: 'now',
//                 },

//             });


//             if (response.data.routes && response.data.routes.length > 0) {
//                 const route = response.data.routes[0];
//                 const duration = route.legs[0].duration.text; // Duration in minutes
//                 eta = duration;
//             }

//             if (!io) {
//                 throw new Error('Socket.io instance is not available');
//             }

//             populatedRide.RideOtp = Crypto.randomInt(1000, 9999)
//             populatedRide.kmOfRide = data?.price
//             populatedRide.EtaOfRide = eta

//             await populatedRide.save()
//             const returnData = {
//                 ...populatedRide.toObject(),
//                 eta: eta,
//             };

//             // console.log("return data",returnData)

//             return returnData;

//         } catch (error) {
//             console.log(error)
//         }



//     } catch (error) {
//         // Log and handle the error
//         console.error('Error in ChangeRideRequestByRider:', error.message);
//     }
// };

exports.ChangeRideRequestByRider = async (io, data) => {
    try {

        if (!data || !data.ride_request_id || !data.rider_id) {
            throw new Error('Invalid data: rideRequestId and driverId are required');
        }

        const { ride_request_id, rider_id, user_id } = data;

        const findDriver = await Riders.findById(rider_id);
        if (!findDriver) {
            throw new Error('Driver not found');
        }

        const ride = await RideRequest.findById(ride_request_id);

        if (!ride) {
            throw new Error('Ride request not found');
        }

        const { pickupLocation, dropLocation } = ride;

        const originD = `${[pickupLocation.coordinates[1], pickupLocation.coordinates[0]]}`;
        const destinationD = `${[dropLocation.coordinates[1], dropLocation.coordinates[0]]}`;

        // Check ride status
        if (ride.rideStatus === 'accepted') {
            throw new Error('Ride has already been accepted by another rider');
        }

        // Update ride status and driver
        ride.rideStatus = 'accepted';
        ride.rider = findDriver._id;

        // Update driver status to not available
        findDriver.isAvailable = false;
        findDriver.on_ride_id = ride?._id;

        // Save both documents
        await Promise.all([
            ride.save(),
            findDriver.save()
        ]);

        const populatedRide = await RideRequest.findById(ride_request_id).populate('rider');

        let eta = null;
        let origin = `${populatedRide?.rider?.location?.coordinates?.[1]},${populatedRide?.rider?.location?.coordinates?.[0]}`;
        let destination = `${populatedRide?.currentLocation?.coordinates?.[1] || ''},${populatedRide?.currentLocation?.coordinates?.[0] || ''}`;

        try {
            const response = await axios.get(`https://maps.googleapis.com/maps/api/directions/json`, {
                params: {
                    origin: origin,
                    destination: destination,
                    key: 'AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8',
                    traffic_model: 'best_guess',
                    departure_time: 'now',
                },
            });

            if (response.data.routes && response.data.routes.length > 0) {
                const route = response.data.routes[0];
                const duration = route.legs[0].duration.text; // Duration in minutes
                eta = duration;
            }

            if (!io) {
                throw new Error('Socket.io instance is not available');
            }

            populatedRide.RideOtp = Crypto.randomInt(1000, 9999);
            populatedRide.kmOfRide = data?.price;
            populatedRide.EtaOfRide = eta;
            populatedRide.acceptedAt = new Date();  // Add timestamp when ride was accepted

            await populatedRide.save();

            // Track that this ride was accepted for notification records
            try {
                // Update or create notification record
                await RideRequestNotification.findOneAndUpdate(
                    { rideRequestId: ride_request_id, driverId: rider_id },
                    {
                        $set: {
                            status: 'accepted',
                            acceptedAt: new Date()
                        }
                    },
                    { upsert: true }
                );
            } catch (notifError) {
                console.log(`[${new Date().toISOString()}] Failed to update notification status: ${notifError.message}`);

            }

            const returnData = {
                ...populatedRide.toObject(),
                eta: eta,
                driver: populatedRide?.rider,
                temp_ride_id: populatedRide?.rider?.on_ride_id
            };

            return returnData;
        } catch (error) {
            console.log(error);
            throw error;
        }
    } catch (error) {
        // Log and handle the error
        console.error('Error in ChangeRideRequestByRider:', error.message);
        throw error;
    }
};

exports.cancelRideForOtherDrivers = async (io, rideRequestId, acceptingDriverId, driverSocketMap) => {
    try {
        console.log(`[${new Date().toISOString()}] Cancelling ride ${rideRequestId} for drivers other than ${acceptingDriverId}`);

        // Get the driver socket map

        if (!driverSocketMap) {
            console.log(`[${new Date().toISOString()}] Warning: driverSocketMap not found, can't notify other drivers`);
            return;
        }

        // Find all drivers who were notified about this ride
        let notifiedDrivers = [];
        try {
            // If you have a notification tracking system
            const notifications = await RideRequestNotification.find({
                rideRequestId: rideRequestId,
                status: 'sent'
            }).lean();

            notifiedDrivers = notifications.map(notification => notification.driverId);

            console.log(`[${new Date().toISOString()}] Found ${notifiedDrivers.length} drivers to notify about cancellation`);
        } catch (error) {
            console.log(`[${new Date().toISOString()}] Error fetching notified drivers: ${error.message}`);

            // If no notification tracking system or it failed, use alternative:
            // Query nearby drivers who might have been notified (less efficient)
            try {
                const rideRequest = await RideRequest.findById(rideRequestId).lean();
                if (rideRequest && rideRequest.pickupLocation && rideRequest.pickupLocation.coordinates) {
                    const [longitude, latitude] = rideRequest.pickupLocation.coordinates;

                    // Search in a radius that matches your original search radius
                    const searchRadius = rideRequest.searchRadiusUsed || 5; // km

                    const nearbyDrivers = await Riders.find({
                        location: {
                            $nearSphere: {
                                $geometry: {
                                    type: "Point",
                                    coordinates: [longitude, latitude]
                                },
                                $maxDistance: searchRadius * 1000 // convert km to meters
                            }
                        }
                    }).select('_id').lean();

                    notifiedDrivers = nearbyDrivers.map(driver => driver._id.toString());
                    console.log(`[${new Date().toISOString()}] Found ${notifiedDrivers.length} nearby drivers as fallback`);
                }
            } catch (fallbackError) {
                console.log(`[${new Date().toISOString()}] Fallback search also failed: ${fallbackError.message}`);
                // If both methods fail, we can't notify other drivers
                return;
            }
        }

        // Send cancellation to all drivers except the accepting one
        let cancelledCount = 0;
        let skippedCount = 0;
        let notFoundCount = 0;

        // Process each driver
        for (const driverId of notifiedDrivers) {
            // Skip the accepting driver
            if (driverId === acceptingDriverId) {
                skippedCount++;
                continue;
            }

            // Get the driver's socket ID
            const driverSocketId = driverSocketMap.get(String(driverId));

            if (driverSocketId) {
                // Emit cancellation to this driver
                io.to(driverSocketId).emit('ride_cancelled', {
                    message: 'This ride has been accepted by another driver',
                    ride_request_id: rideRequestId,
                    reason: 'accepted_by_another_driver',
                    timestamp: new Date()
                });

                cancelledCount++;

                // Update notification status if tracking system exists
                try {
                    await RideRequestNotification.findOneAndUpdate(
                        { rideRequestId, driverId },
                        {
                            $set: {
                                status: 'cancelled',
                                cancelledAt: new Date(),
                                cancellationReason: 'accepted_by_another_driver'
                            }
                        }
                    );
                } catch (updateError) {
                    // Non-critical error, continue without blocking
                    console.log(`[${new Date().toISOString()}] Failed to update notification for driver ${driverId}: ${updateError.message}`);
                }
            } else {
                notFoundCount++;
                console.log(`[${new Date().toISOString()}] Driver ${driverId} doesn't have an active socket connection`);
            }
        }

        console.log(`[${new Date().toISOString()}] Ride cancellation summary: ${cancelledCount} cancelled, ${skippedCount} skipped (acceptor), ${notFoundCount} not found (offline)`);

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error cancelling ride for other drivers:`, error);
        // This is a non-critical operation, so we don't throw the error
        // The primary ride acceptance flow should continue even if this fails
    }
}


exports.updateRideRejectionStatus = async (rideId, driverId) => {
    try {
        console.log(`[${new Date().toISOString()}] Updating rejection status for ride: ${rideId}, driver: ${driverId}`);

        // 1. Update notification record
        const notification = await RideRequestNotification.findOneAndUpdate(
            { rideRequestId: rideId, driverId: driverId },
            {
                $set: {
                    status: 'rejected',
                    rejectedAt: new Date()
                }
            },
            {
                upsert: true, // Create if it doesn't exist
                new: true // Return the updated document
            }
        );

        console.log(`[${new Date().toISOString()}] Updated notification status to rejected:`, notification._id);

        // 2. Update driver's rejection statistics (optional)
        await Riders.findByIdAndUpdate(
            driverId,
            {
                $inc: { 'stats.ridesRejected': 1 },
                $push: {
                    'recentRejections': {
                        rideId: rideId,
                        timestamp: new Date()
                    }
                }
            }
        );

        // 3. Update ride request document - Add to the rejectedBy array
        await RideRequest.findByIdAndUpdate(
            rideId,
            {
                $addToSet: { rejectedByDrivers: driverId }
            }
        );

        console.log(`[${new Date().toISOString()}] Ride rejection fully recorded in database`);
        return true;
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error updating ride rejection status:`, error);
        throw error;
    }
}


exports.findNextAvailableDriver = async (io, rideId) => {
    try {
        console.log(`[${new Date().toISOString()}] Finding next available driver for ride: ${rideId}`);

        // 1. Get the ride request details
        const rideRequest = await RideRequest.findById(rideId);

        if (!rideRequest) {
            console.error(`[${new Date().toISOString()}] Ride not found: ${rideId}`);
            return false;
        }

        // Don't look for new drivers if ride is already accepted or cancelled
        if (rideRequest.rideStatus !== 'pending') {
            console.log(`[${new Date().toISOString()}] Ride ${rideId} is not pending (status: ${rideRequest.rideStatus}). Skipping driver search.`);
            return false;
        }

        // 2. Extract pickup location
        const pickupLocation = rideRequest.pickupLocation;
        if (!pickupLocation || !pickupLocation.coordinates) {
            console.error(`[${new Date().toISOString()}] Ride ${rideId} has invalid pickup location`);
            return false;
        }

        // 3. Find nearby drivers who haven't rejected or been notified
        const [longitude, latitude] = pickupLocation.coordinates;

        // Get list of drivers who already rejected this ride
        const rejectedDriverIds = rideRequest.rejectedByDrivers || [];

        // Get list of drivers who were already notified
        const notifiedDrivers = await RideRequestNotification.find({
            rideRequestId: rideId
        }).distinct('driverId');

        // Combine both lists to exclude from search
        const excludeDriverIds = [...rejectedDriverIds, ...notifiedDrivers];
        const excludeDriverObjectIds = excludeDriverIds.map(id =>
            typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
        );

        // Search radius (in kilometers)
        const searchRadius = rideRequest.searchRadius || 5; // km

        const nearbyDrivers = await Riders.find({
            _id: { $nin: excludeDriverObjectIds },
            isAvailable: true,
            isOnline: true,
            location: {
                $nearSphere: {
                    $geometry: {
                        type: "Point",
                        coordinates: [longitude, latitude]
                    },
                    $maxDistance: searchRadius * 1000 // convert km to meters
                }
            }
        }).limit(5); // Limit to 5 new drivers

        console.log(`[${new Date().toISOString()}] Found ${nearbyDrivers.length} new potential drivers for ride ${rideId}`);

        if (nearbyDrivers.length === 0) {
            // If no new drivers found, maybe increase search radius or notify user

            // Option 1: Auto-increase search radius if configured
            if (rideRequest.autoIncreaseRadius &&
                rideRequest.currentSearchRadius < rideRequest.maxSearchRadius) {

                const newRadius = Math.min(
                    rideRequest.currentSearchRadius * 1.5, // Increase by 50%
                    rideRequest.maxSearchRadius // But don't exceed max
                );

                // Update ride request with new radius
                await RideRequest.findByIdAndUpdate(rideId, {
                    $set: { currentSearchRadius: newRadius }
                });

                console.log(`[${new Date().toISOString()}] Increased search radius for ride ${rideId} to ${newRadius}km`);

                // Recursive call with new radius
                return findNextAvailableDriver(io, rideId);
            }

            // Option 2: Notify user that no drivers are available
            const userId = rideRequest.user.toString();
            const userSocketId = userSocketMap.get(userId);

            if (userSocketId) {
                io.to(userSocketId).emit('no_drivers_available', {
                    ride_id: rideId,
                    message: 'No drivers are currently available in your area. Please try again later.'
                });
                console.log(`[${new Date().toISOString()}] Notified user ${userId} about no available drivers`);
            }

            return false;
        }

        // 4. For each driver, send ride request notification
        for (const driver of nearbyDrivers) {
            const driverId = driver._id.toString();
            const driverSocketId = driverSocketMap.get(driverId);

            if (driverSocketId) {
                // Prepare ride request data for the driver
                const rideData = {
                    ride_id: rideId,
                    pickup: {
                        address: rideRequest.pickupAddress,
                        coordinates: rideRequest.pickupLocation.coordinates
                    },
                    dropoff: {
                        address: rideRequest.dropAddress,
                        coordinates: rideRequest.dropLocation.coordinates
                    },
                    user: {
                        name: rideRequest.userName,
                        rating: rideRequest.userRating || 0,
                        photo: rideRequest.userPhoto || null
                    },
                    distance: rideRequest.distance,
                    estimatedPrice: rideRequest.estimatedPrice,
                    estimatedDuration: rideRequest.estimatedDuration,
                    paymentMethod: rideRequest.paymentMethod,
                    createdAt: rideRequest.createdAt
                };

                // Emit ride request to driver
                io.to(driverSocketId).emit('new_ride_request', rideData);

                // Record notification in database
                await RideRequestNotification.create({
                    rideRequestId: rideId,
                    driverId: driverId,
                    status: 'sent',
                    notifiedAt: new Date()
                });

                console.log(`[${new Date().toISOString()}] Sent ride request to new driver: ${driverId}`);
            } else {
                console.log(`[${new Date().toISOString()}] Driver ${driverId} doesn't have active socket`);
            }
        }

        return true;
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error finding next available driver:`, error);
        return false;
    }
}


exports.rideStart = async (data) => {
    try {

        const ride_id = await RideRequest.findById(data?.rideDetails?._id);

        const ride_id_temp = await tempRideDetailsSchema.findById(data?._id);
        console.log("ride_id_temp", ride_id_temp)

        if (!ride_id) {
            return {
                success: false,
                message: 'Ride not found'
            };
        }

        ride_id.ride_is_started = true;
        ride_id.ride_start_time = new Date();

        if (ride_id_temp) {
            ride_id_temp.ride_is_started = true;
            ride_id_temp.ride_start_time = new Date();
            if (ride_id_temp?.rideDetails) {
                ride_id_temp.rideDetails.isOtpVerify = true;
                ride_id_temp.rideDetails.otp_verify_time = new Date();
            }
            await ride_id_temp.save();
        }

        await ride_id.save();

        return {
            success: true,
            message: 'Ride started successfully'
        };

    } catch (error) {
        console.error('Error in rideStart:', error.message);
        return {
            success: false,
            message: 'An error occurred while starting the ride',
            error: error.message
        };
    }
};


exports.rideEnd = async (data) => {
    try {
        const ride = await RideRequest.findById(data?._id);
        if (!ride) {
            return {
                success: false,
                message: 'Ride not found',
            };
        }

        // Mark the ride as completed
        ride.ride_end_time = new Date();
        ride.rideStatus = "completed";
        await ride.save();

        const rider = await Riders.findById(ride.rider);
        if (!rider) {
            return {
                success: false,
                message: 'Rider not found',
            };
        }

        // Update rider stats
        rider.TotalRides += 1;
        if (!rider.rides.includes(ride._id)) {
            rider.rides.push(ride._id);
        }

        // Remove on_ride_id from rider
        if (rider.on_ride_id) {
            rider.on_ride_id = undefined;
        }

        await rider.save();

        return {
            success: true,
            driverId: rider._id,
            message: 'Ride ended successfully',
        };

    } catch (error) {
        console.error('Error in rideEnd:', error.message);
        return {
            success: false,
            message: 'Something went wrong during ride end',
            error: error.message,
        };
    }
};

exports.collectCash = async ({ data, paymentMethod }) => {
    try {
        const ride = await RideRequest.findById(data?._id);
        if (!ride) {
            return { success: false, message: 'Ride not found' };
        }

        // Mark the ride as paid
        ride.is_ride_paid = true;
        ride.paymentMethod = paymentMethod;
        await ride.save();

        const findRider = await Riders.findById(ride?.rider);
        if (!findRider) {
            return { success: false, message: 'Rider not found' };
        }

        // Find past completed rides
        const rechargeDate = new Date(findRider?.RechargeData?.whichDateRecharge);

        // Fetch only rides completed after (or on) the recharge date
        const pastRides = await rideRequestModel.find({
            rider: findRider._id,
            rideStatus: "completed",
            createdAt: { $gte: rechargeDate }  // Only rides after or on recharge date
        });


        // Calculate earnings from past rides
        const pastEarnings = pastRides.reduce((acc, cur) => acc + Number(cur.kmOfRide || 0), 0);

        // Current ride earning
        const currentEarning = Number(ride.kmOfRide || 0);

        // Total earnings = past + current
        const totalEarnings = pastEarnings + currentEarning;

        const earningLimit = Number(findRider?.RechargeData?.onHowManyEarning || 0);
        const remaining = earningLimit - totalEarnings;
        const number = findRider?.phone;

        // Handle earning limit
        if (totalEarnings >= earningLimit) {
            const message = `🎉 You’ve crossed your earning limit according to your current plan. Thank you for using Olyox! Please recharge now to continue earning more.`;
            await SendWhatsAppMessageNormal(message, number);

            findRider.isAvailable = false;
            findRider.RechargeData = {
                expireData: new Date(Date.now() - 5 * 60 * 1000),
                rechargePlan: '',
                onHowManyEarning: '',
                approveRecharge: false,
            };
            findRider.isPaid = false;
        } else if (remaining < 300) {
            const reminderMessage = `🛎️ Reminder: You have ₹${remaining} earning potential left on your plan. Recharge soon to avoid interruptions in your earnings. – Team Olyox`;
            await SendWhatsAppMessageNormal(reminderMessage, number);
        }

        // Reset rider state
        findRider.isAvailable = true;
        findRider.on_ride_id = null;

        await findRider.save();

        return {
            success: true,
            message: 'Ride ended and payment recorded successfully',
            currentEarning,
            totalEarnings
        };

    } catch (error) {
        console.error('Error in collectCash:', error.message);
        return { success: false, message: error.message };
    }
};



exports.AddRating = async (data, rate) => {
    try {
        const ride_id = await RideRequest.findById(data?._id)

        if (!ride_id) {
            return {
                success: false,
                message: 'Ride not found'
            }
        }

        ride_id.RatingOfRide = rate
        await ride_id.save()

        return {
            success: true,
            driverId: ride_id.rider,
            message: 'Ride End and Payment Success successfully'
        }

    } catch (error) {
        // Log and handle the error
        console.error('Error in rideStart:', error.message);
        return error.message
    }
}


exports.cancelRideByAnyOne = async (cancelBy, rideData, reason) => {
    try {
        console.log("🛑 Cancel Ride Triggered");
        console.log("cancelBy:", cancelBy);
        console.log("rideData:", JSON.stringify(rideData));
        console.log("reason:", reason);

        let rideId = rideData?._id || rideData?.ride?.rideDetails?._id;
        console.log("Extracted rideId:", rideId);

        if (!rideId) {
            console.warn("⚠️ Invalid rideData - missing _id");
            return {
                success: false,
                message: "Invalid ride data",
            };
        }

        const ride = await RideRequest.findById(rideId);
        if (!ride) {
            console.warn(`⚠️ Ride not found with ID: ${rideId}`);
            return {
                success: false,
                message: "Ride not found",
            };
        }

        console.log("✅ Ride found:", ride._id, "Status:", ride.rideStatus);

        if (ride.rideStatus === "cancelled") {
            console.warn("⚠️ Ride already cancelled");
            return {
                success: false,
                message: "Ride is already cancelled",
            };
        }

        if (ride.rideStatus === "completed") {
            console.warn("⚠️ Ride already completed");
            return {
                success: false,
                message: "Cannot cancel a completed ride",
            };
        }

        // Cancel the ride
        ride.rideCancelBy = cancelBy;
        ride.rideCancelReason = reason;
        ride.rideStatus = "cancelled";
        ride.rideCancelTime = new Date();

        console.log("🔁 Updating rider availability...");

        const foundRiderId = ride?.rider?._id || ride?.rider;
        if (!foundRiderId) {
            console.warn("⚠️ Rider ID missing from ride object");
            return {
                success: false,
                message: "Rider not found in ride data",
            };
        }

        const foundRider = await Riders.findById(foundRiderId);
        if (!foundRider) {
            console.warn(`⚠️ Rider not found with ID: ${foundRiderId}`);
            return {
                success: false,
                message: "Rider not found",
            };
        }

        foundRider.isAvailable = true;
        foundRider.on_ride_id = null;

        await ride.save();
        await foundRider.save();

        console.log("✅ Ride cancelled and rider updated successfully");

        return {
            success: true,
            message: "Ride cancelled successfully",
            ride,
        };
    } catch (error) {
        console.error("❌ Error in cancelRideByAnyOne:", error);
        return {
            success: false,
            message: "Something went wrong while canceling the ride",
            error: error.message,
        };
    }
};





exports.complete_Details_ofRide = async (req, res) => {
    try {
        const { id } = req.query;

        // Find the ride by ID and populate related rider details
        const ride = await RideRequest.findById(id).populate('rider');

        // If the ride is not found, return an error response
        if (!ride) {
            return res.status(404).json({
                success: false,
                message: 'Ride not found',
            });
        }



        return res.status(200).json({
            success: true,
            message: 'Ride ended successfully',
            data: ride
        });

    } catch (error) {
        // Log the error and return a server error response
        console.error('Error in complete_Details_ofRide:', error.message);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while completing'
        })
    }
}


const calculateRidePrice = async (origin, destination, waitingTimeInMinutes, ratePerKm) => {
    console.log("ratePerKm", ratePerKm);
    try {
        // Validate ratePerKm
        if (isNaN(ratePerKm) || ratePerKm <= 0) {
            throw new Error('Invalid rate per km');
        }

        // Fetching directions from Google Maps API to get distance and duration with traffic consideration
        const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
            params: {
                origin: origin,
                destination: destination,
                key: 'AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8',
                traffic_model: 'best_guess',
                departure_time: 'now',
            },
        });

        if (response.data.routes.length === 0) {
            throw new Error('No routes found between the locations');
        }

        const route = response.data.routes[0];
        const distanceInKm = route.legs[0].distance.value / 1000;
        const durationInMinutes = route.legs[0].duration_in_traffic.value / 60;

        console.log("distanceInKm", distanceInKm);
        console.log("durationInMinutes", durationInMinutes);

        const priceBasedOnDistance = distanceInKm * ratePerKm;
        console.log("priceBasedOnDistance", priceBasedOnDistance);

        const waitingTimeCost = waitingTimeInMinutes * 5; // Assuming 5 Rupees per minute of waiting
        console.log("waitingTimeCost", waitingTimeCost);

        const totalPrice = priceBasedOnDistance + waitingTimeCost;
        console.log("totalPrice", totalPrice);

        return {
            totalPrice: totalPrice,
            distanceInKm: distanceInKm,
            durationInMinutes: durationInMinutes,
            waitingTimeCost: waitingTimeCost,
        };
    } catch (error) {
        console.error('Error calculating ride price:', error);
        throw new Error('Failed to calculate the ride price');
    }
};

exports.calculateRidePriceForUser = async (req, res) => {
    try {
        const { origin, destination, waitingTimeInMinutes = 0, ratePerKm } = req.body;
        console.log("Request Body:", req.body);

        // Convert ratePerKm to a valid number, defaulting to 15 if invalid
        const perKmRate = Number(ratePerKm?.match(/\d+/)?.[0]) || 15;

        // Format coordinates for API request
        const formattedOrigin = `${origin.latitude},${origin.longitude}`;
        const formattedDestination = `${destination.latitude},${destination.longitude}`;

        // Fetch route details from Google Maps Directions API
        const response = await axios.get("https://maps.googleapis.com/maps/api/directions/json", {
            params: {
                origin: formattedOrigin,
                destination: formattedDestination,
                key: 'AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8',
                traffic_model: "best_guess",
                departure_time: Math.floor(Date.now() / 1000),
            },
        });

        if (!response.data.routes || !response.data.routes.length) {
            return res.status(400).json({
                success: false,
                message: "Unable to fetch directions from Google Maps API",
            });
        }

        const route = response.data.routes[0];
        const distance = route.legs[0].distance.value / 1000; // Convert meters to km
        const duration = route.legs[0].duration.value / 60; // Convert seconds to minutes
        const trafficDuration = route.legs[0].duration_in_traffic?.value / 60 || duration;

        // Check weather conditions
        const checkWeather = await FindWeather(origin.latitude, origin.longitude);
        const rain = checkWeather && checkWeather[0]?.main === 'Rain';

        // Check for tolls on the route
        const checkTolls = await CheckTolls(origin, destination);
        console.log("Travel Advisory Data:", checkTolls?.travelAdvisory);



        const tolls = checkTolls?.travelAdvisory?.tollInfo && Object.keys(checkTolls?.travelAdvisory?.tollInfo).length > 0;
        console.log("Tolls Check:", tolls);
        console.log("tolls", tolls)
        let tollPrice
        if (tolls) {
            tollPrice = checkTolls?.travelAdvisory?.tollInfo?.estimatedPrice[0]?.units || 0;
        }

        // Retrieve fare settings from the database
        const settingData = await Settings.findOne();

        const baseFare = settingData?.BasicFare || 94;
        const trafficDurationPricePerMinute = settingData?.trafficDurationPricePerMinute || 0;
        const rainModeFare = settingData?.RainModeFareOnEveryThreeKm || 0;
        const waitingTimeCost = waitingTimeInMinutes * (settingData?.waitingTimeInMinutes || 0);


        const totalBaseFare = baseFare

        // Calculate total fare
        let totalPrice = totalBaseFare + (trafficDuration * trafficDurationPricePerMinute) + waitingTimeCost;
        if (rain) totalPrice += rainModeFare;
        if (tolls) totalPrice += Number(tollPrice) / 2;
        totalPrice += distance * perKmRate;

        console.log("Total Price Calculation:", {
            totalPrice,
            distance,
            rain,
            tolls,
            tollPrice,
            RainFare: settingData?.RainModeFareOnEveryThreeKm,
            trafficDuration,
            waitingTimeCost,
            totalBaseFare,
        });

        // Return the calculated ride price
        res.status(200).json({
            success: true,
            message: "Ride price calculated successfully",
            totalPrice,
            distanceInKm: distance,
            rain,
            RainFare: settingData?.RainModeFareOnEveryThreeKm,
            tolls,
            tollPrice,
            durationInMinutes: trafficDuration,
            waitingTimeCost,

            totalBaseFare,
        });
    } catch (error) {
        console.error("Error calculating ride price:", error);
        res.status(500).json({
            success: false,
            message: "Failed to calculate the ride price",
        });
    }
};


const calculateRidePriceForConfirmRide = async (data) => {
    try {
        console.log("Request data:", data);

        // Extract pickup and drop coordinates correctly
        if (!data?.pickupLocation?.coordinates || !data?.dropLocation?.coordinates) {
            throw new Error("Invalid pickup or drop location data");
        }

        const [pickupLng, pickupLat] = data.pickupLocation.coordinates;
        const [dropLng, dropLat] = data.dropLocation.coordinates;

        const pickupLocation = { latitude: pickupLat, longitude: pickupLng };
        const dropLocation = { latitude: dropLat, longitude: dropLng };

        // Destructure and provide default values
        const { waitingTimeInMinutes = 0, ratePerKm = "15" } = data;

        // Convert ratePerKm to a valid number
        const perKmRate = Number(ratePerKm?.match(/\d+/)?.[0]) || 15;

        // Format coordinates for API request
        const formattedOrigin = `${pickupLocation.latitude},${pickupLocation.longitude}`;
        const formattedDestination = `${dropLocation.latitude},${dropLocation.longitude}`;

        // Fetch route details from Google Maps Directions API
        const response = await axios.get("https://maps.googleapis.com/maps/api/directions/json", {
            params: {
                origin: formattedOrigin,
                destination: formattedDestination,
                key: 'AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8',
                traffic_model: "best_guess",
                departure_time: Math.floor(Date.now() / 1000),
            },
        });

        if (!response.data.routes?.length) {
            return { success: false, message: "Unable to fetch directions from Google Maps API" };
        }

        const route = response.data.routes[0];
        const distance = route.legs[0].distance.value / 1000; // Convert meters to km
        const duration = route.legs[0].duration.value / 60; // Convert seconds to minutes
        const trafficDuration = route.legs[0].duration_in_traffic?.value / 60 || duration;

        // Check weather conditions
        const checkWeather = await FindWeather(pickupLocation.latitude, pickupLocation.longitude);
        const rain = checkWeather?.[0]?.main === 'Rain';

        // Check for tolls on the route
        const checkTolls = await CheckTolls(pickupLocation, dropLocation);
        console.log("Travel Advisory Data:", checkTolls?.travelAdvisory);

        const tolls = checkTolls?.travelAdvisory?.tollInfo && Object.keys(checkTolls.travelAdvisory.tollInfo).length > 0;
        let tollPrice = tolls ? checkTolls.travelAdvisory.tollInfo?.estimatedPrice?.[0]?.units || 0 : 0;

        // Retrieve fare settings from the database
        const settingData = await Settings.findOne();
        const baseFare = settingData?.BasicFare || 94;
        const trafficDurationPricePerMinute = settingData?.trafficDurationPricePerMinute || 0;
        const rainModeFare = settingData?.RainModeFareOnEveryThreeKm || 0;
        const waitingTimeCost = waitingTimeInMinutes * (settingData?.waitingTimeInMinutes || 0);

        // Calculate total fare
        let totalPrice = baseFare + (trafficDuration * trafficDurationPricePerMinute) + waitingTimeCost;
        if (rain) totalPrice += rainModeFare;
        if (tolls) totalPrice += Number(tollPrice) / 2;
        totalPrice += distance * perKmRate;

        console.log("Total Price Calculation:", {
            totalPrice, distance, rain, tolls, tollPrice, trafficDuration, waitingTimeCost, baseFare
        });

        return {
            success: true,
            message: "Ride price calculated successfully",
            totalPrice, distanceInKm: distance, rain, RainFare: rainModeFare,
            tolls, tollPrice, durationInMinutes: trafficDuration, waitingTimeCost, totalBaseFare: baseFare
        };
    } catch (error) {
        console.error("Error calculating ride price:", error);
        return { success: false, message: "Failed to calculate the ride price" };
    }
};



exports.getAllRides = async (req, res) => {
    try {
        const allRides = await RideRequest.find().populate('rider').populate('user')
        if (!allRides) {
            return res.status(404).json({ success: false, message: "No rides found" })
        }
        res.status(200).json({
            success: true,
            message: "All rides founded",
            data: allRides
        })
    } catch (error) {
        console.log("Internal server error", error)
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        })
    }
}

exports.getSingleRides = async (req, res) => {
    try {
        const { id } = req.params;
        const allRides = await RideRequest.findById(id).populate('rider').populate('user')
        if (!allRides) {
            return res.status(404).json({ success: false, message: "No rides found" })
        }
        res.status(200).json({
            success: true,
            message: "All rides founded",
            data: allRides
        })
    } catch (error) {
        console.log("Internal server error", error)
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        })
    }
}

exports.deleleteRidersRideOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await RideRequest.findByIdAndDelete(id);
        if (!order) {
            return res.status(400).json({
                success: false,
                message: "Order not found"
            })
        }
        return res.status(200).json({ success: true, message: "Order deleted successfully" });
    } catch (error) {
        console.log("Internal server error", error)
        res.status(500).json({
            success: false,
            message: "Internal servere error",
            error: error.message
        })
    }
}

exports.changeRidersRideStatusByAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const order = await RideRequest.findById(id)
            .populate('rider', 'name phone')
            .populate('user', 'name number');

        if (!order) {
            return res.status(400).json({
                success: false,
                message: "Ride request not found"
            });
        }

        order.rideStatus = status;
        await order.save();

        // Safe fallback values
        const riderName = order?.rider?.name || "Rider";
        const riderPhone = order?.rider?.phone || null;
        const userName = order?.user?.name || "User";
        const userPhone = order?.user?.number || null;

        let riderMessage = "";
        let userMessage = "";

        switch (status) {
            case 'pending':
                riderMessage = `🚕 Hello ${riderName},\n\nA new ride request (ID: ${order._id}) is now *PENDING*. Please review and take action.`;
                userMessage = `🕒 Hi ${userName},\n\nYour ride request (ID: ${order._id}) is currently *PENDING*. We will notify you once a rider accepts it.`;
                break;

            case 'accepted':
                riderMessage = `✅ Hello ${riderName},\n\nYou have *ACCEPTED* the ride (ID: ${order._id}). Please proceed to pick up the user.`;
                userMessage = `👏 Hi ${userName},\n\nYour ride (ID: ${order._id}) has been *ACCEPTED* by ${riderName}. They will be on their way soon.`;
                break;

            case 'in_progress':
                riderMessage = `🚗 Ride (ID: ${order._id}) is now *IN PROGRESS*. Stay safe on the road, ${riderName}.`;
                userMessage = `🚕 Your ride (ID: ${order._id}) is now *IN PROGRESS*. Enjoy your journey!`;
                break;

            case 'completed':
                riderMessage = `✅ Great job, ${riderName}!\n\nYou have *COMPLETED* the ride (ID: ${order._id}).`;
                userMessage = `🎉 Hi ${userName},\n\nYour ride (ID: ${order._id}) has been *COMPLETED*. Thank you for riding with us!`;
                break;

            case 'cancelled':
                riderMessage = `❌ The ride (ID: ${order._id}) has been *CANCELLED*. No further action is required.`;
                userMessage = `⚠️ Hi ${userName},\n\nYour ride (ID: ${order._id}) has been *CANCELLED*. We apologize for the inconvenience.`;
                break;

            default:
                riderMessage = `ℹ️ Ride (ID: ${order._id}) status has been changed to *${status}*.`;
                userMessage = `ℹ️ Ride (ID: ${order._id}) status is now *${status}*.`;
        }

        // Send messages only if numbers are available
        if (riderPhone) SendWhatsAppMessageNormal(riderMessage, riderPhone);
        if (userPhone) SendWhatsAppMessageNormal(userMessage, userPhone);

        return res.status(200).json({
            success: true,
            message: `Ride status updated to "${status}" and notifications sent`
        });

    } catch (error) {
        console.error("Internal server error", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};
