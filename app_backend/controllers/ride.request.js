const RideRequest = require('../models/ride.request.model');
const Riders = require('../models/Rider.model')
const axios = require('axios');
const Crypto = require('crypto');
const { FindWeather, CheckTolls } = require('../utils/Api.utils');
const Settings = require('../models/Admin/Settings');
const RidesSuggestionModel = require('../models/Admin/RidesSuggestion.model');
const tempRideDetailsSchema = require('../models/tempRideDetailsSchema');
exports.createRequest = async (req, res) => {
    try {
        const user = Array.isArray(req.user.user) ? req.user.user[0] : req.user.user;
        const { vehicleType, pickupLocation, dropLocation, currentLocation, pick_desc, drop_desc } = req.body;

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



exports.findRider = async (id, io) => {
    const MAX_RETRIES = 2;
    const RETRY_DELAY_MS = 10000;
    const INITIAL_RADIUS = 2500;
    const RADIUS_INCREMENT = 500;
    let retryCount = 0;

    // Function to find riders with retry logic and expanding radius
    const attemptFindRiders = async () => {
        try {
            const rideRequestId = id;

            // Fetch and validate ride request
            const rideRequest = await RideRequest.findById(rideRequestId)
                .populate("user")
                .lean();

            if (!rideRequest) {
                throw new Error("Ride request not found");
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

            // If ride request was canceled or completed during retry
            if (status === 'cancelled' || status === 'completed') {
                console.log(`Ride request ${rideRequestId} is ${status}. Stopping search.`);
                return { message: `Ride request is ${status}` };
            }

            // Validate pickup location
            if (!pickupLocation?.coordinates ||
                !Array.isArray(pickupLocation.coordinates) ||
                pickupLocation.coordinates.length !== 2) {
                throw new Error("Invalid pickup location coordinates");
            }

            // Validate drop location
            if (!dropLocation?.coordinates ||
                !Array.isArray(dropLocation.coordinates) ||
                dropLocation.coordinates.length !== 2) {
                throw new Error("Invalid drop location coordinates");
            }

            const [longitude, latitude] = pickupLocation.coordinates;

            // Calculate current search radius based on retry count
            const currentRadius = INITIAL_RADIUS + (retryCount * RADIUS_INCREMENT);
            console.log(`Search attempt ${retryCount + 1}/${MAX_RETRIES} with radius: ${currentRadius / 1000} km`);

            // Find nearby available riders with matching vehicle type
            let riders = await Riders.aggregate([
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
                        "rideVehicleInfo.vehicleName": 1,
                        "rideVehicleInfo.VehicleNumber": 1,
                        "rideVehicleInfo.PricePerKm": 1,
                        "rideVehicleInfo.vehicleType": 1,
                        "RechargeData.expireData": 1,
                        on_ride_id: 1,
                        distance: 1,
                    },
                },
            ]);
            console.log("riders part", riders)

            riders = riders.filter((rider) => {
                const expire = rider?.RechargeData?.expireData;
                const currentDate = new Date();
                const hasValidRecharge = expire && new Date(expire) >= currentDate;
                const isFreeRider = rider?.on_ride_id === null || rider?.on_ride_id === undefined;

                return hasValidRecharge && isFreeRider;
            });


            if (!riders || riders.length === 0) {
                console.log("No available riders found");
                console.log(user._id)
                // io.to(user._id.toString()).emit("sorry_no_rider_available", {
                //     message: "Sorry, no riders are currently available nearby. Please try again shortly.",
                //     retrySuggestion: "You can retry in a few moments."
                // });

                return;
            }


            // console.log("riders",riders.length)


            // Get route information from Google Maps API
            const origin = `${pickupLocation.coordinates[1]},${pickupLocation.coordinates[0]}`;
            const destination = `${dropLocation.coordinates[1]},${dropLocation.coordinates[0]}`;


            try {
                const response = await axios.get("https://maps.googleapis.com/maps/api/directions/json", {
                    params: {
                        origin,
                        destination,
                        key: "AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8",

                        traffic_model: "best_guess",
                        departure_time: "now",
                        alternatives: true // Get alternative routes
                    },
                    timeout: 5000 // 5 second timeout
                });

                if (!response?.data?.routes || response.data.routes.length === 0) {
                    throw new Error("No route found between pickup and drop locations");
                }

                // Get the fastest route considering traffic
                const routes = response.data.routes;
                const sortedRoutes = routes.sort((a, b) =>
                    (a.legs[0].duration_in_traffic?.value || a.legs[0].duration.value) -
                    (b.legs[0].duration_in_traffic?.value || b.legs[0].duration.value)
                );

                const fastestRoute = sortedRoutes[0];
                const distance = fastestRoute.legs[0].distance.value / 1000; // km
                const duration = fastestRoute.legs[0].duration.value / 60; // minutes
                const trafficDuration =
                    (fastestRoute.legs[0].duration_in_traffic?.value || fastestRoute.legs[0].duration.value) / 60; // minutes

                // Get vehicle pricing
                const vehiclePricing = await RidesSuggestionModel.findOne({
                    name: vehicleType
                }).lean();

                if (!vehiclePricing) {
                    throw new Error(`Pricing not found for vehicle type: ${vehicleType}`);
                }

                const ratePerKm = vehiclePricing.priceRange;
                const waitingTimeInMinutes = 0;

                // Calculate ride price
                const priceCalculationData = {
                    pickupLocation,
                    dropLocation,
                    waitingTimeInMinutes,
                    ratePerKm,
                    polyline: fastestRoute.overview_polyline?.points, // Add polyline for accurate toll calculation
                    distance
                };

                // console.log("Price calculation input:",
                //     JSON.stringify({
                //         ...priceCalculationData,
                //         pickupLocation: "...",
                //         dropLocation: "..."
                //     })
                // );

                const priceData = await calculateRidePriceForConfirmRide(priceCalculationData);

                if (!priceData) {
                    throw new Error("Failed to calculate ride price");
                }

                // console.log("Price calculation result:", JSON.stringify(priceData));

                const eta = Math.round(trafficDuration);

                // Check if riders are available
                if (riders.length === 0) {
                    if (retryCount < MAX_RETRIES) {
                        console.log(`No riders available within ${currentRadius / 1000} km. Retry ${retryCount + 1}/${MAX_RETRIES} in ${RETRY_DELAY_MS / 1000}s with expanded radius`);
                        retryCount++;

                        // Update ride request with retry count and current radius
                        await RideRequest.findByIdAndUpdate(rideRequestId, {
                            $set: {
                                retryCount,
                                lastRetryAt: new Date(),
                                currentSearchRadius: currentRadius + RADIUS_INCREMENT // Store next radius
                            }
                        });

                        // Notify user about retry with expanded radius
                        io.to(user._id.toString()).emit("finding_driver", {
                            message: `Expanding search area... Attempt ${retryCount}/${MAX_RETRIES}`,
                            retryCount,
                            maxRetries: MAX_RETRIES,
                            currentRadius: (currentRadius / 1000).toFixed(1),
                            nextRadius: ((currentRadius + RADIUS_INCREMENT) / 1000).toFixed(1)
                        });

                        // Schedule retry after delay
                        setTimeout(attemptFindRiders, RETRY_DELAY_MS);
                        return null;
                    } else {
                        console.log(`No riders found after ${MAX_RETRIES} attempts with max radius of ${(INITIAL_RADIUS + (MAX_RETRIES - 1) * RADIUS_INCREMENT) / 1000} km`);

                        // Update ride request status
                        await RideRequest.findByIdAndUpdate(rideRequestId, {
                            $set: {
                                rideStatus: 'no_driver_found',
                                maxSearchRadius: INITIAL_RADIUS + (MAX_RETRIES - 1) * RADIUS_INCREMENT
                            }
                        });

                        console.log("user._id", user._id)
                        // Notify user that no drivers were found
                        io.to(user._id.toString()).emit("no_drivers_available", {
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

                // Format the riders information for the response
                const ridersInfo = riders.map((rider) => ({
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
                    distance: (rider.distance / 1000).toFixed(2), // Convert to km and format
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
                    currency: "INR", // Add currency code
                    retryCount,
                    searchRadius: currentRadius / 1000,
                    timestamp: new Date(),
                };

                // Reset ride request retry count on success and store found radius
                await RideRequest.findByIdAndUpdate(rideRequestId, {
                    $set: {
                        retryCount: 0,
                        lastUpdatedAt: new Date(),
                        searchRadiusUsed: currentRadius / 1000
                    }
                });

                console.log(`Emitting ride_come event to clients. Found ${riders.length} riders at ${currentRadius / 1000} km radius.`);

                // Emit to all drivers (could be optimized to emit only to nearby drivers)
                io.emit("ride_come", {
                    message: "A new ride request is nearby!",
                    ...rideInfo,
                });

                // Emit success event to user
                io.to(user._id.toString()).emit("drivers_found", {
                    message: `Found ${riders.length} drivers within ${currentRadius / 1000} km of your location`,
                    rideInfo
                });

                return rideInfo;

            } catch (routeError) {
                console.error("Route calculation error:", routeError);
                throw new Error(`Failed to calculate route: ${routeError.message}`);
            }

        } catch (error) {
            console.error(`Error in findRider attempt ${retryCount + 1}/${MAX_RETRIES}:`, error);

            // Only retry for certain errors
            const retryableErrors = [
                "No riders available",
                "Failed to calculate route",
                "Network error"
            ];

            const shouldRetry = retryableErrors.some(msg => error.message.includes(msg));

            if (shouldRetry && retryCount < MAX_RETRIES) {
                console.log(`Retrying findRider due to error: ${error.message}`);
                retryCount++;
                setTimeout(attemptFindRiders, RETRY_DELAY_MS);
                return null;
            } else {
                // Notify about error
                io.emit("error", {
                    message: error.message,
                    retryCount,
                    rideRequestId: id
                });
                return { error: error.message };
            }
        }
    };

    // Start the initial attempt
    return await attemptFindRiders();
};



exports.ChangeRideRequestByRider = async (io, data) => {
    try {
        console.log("data of change", data)
        if (!data || !data.ride_request_id || !data.rider_id) {
            throw new Error('Invalid data: rideRequestId and driverId are required');
        }

        const { ride_request_id, rider_id, user_id } = data;

        const findDriver = await Riders.findById(rider_id)
        if (!findDriver) {
            return res.status(403).json({
                success: false,
                message: 'Driver not found',

            })
        }
        // Fetch the ride request from the database
        const ride = await RideRequest.findById(ride_request_id);
        const { pickupLocation, dropLocation } = ride;

        const originD = `${[pickupLocation.coordinates[1], pickupLocation.coordinates[0]]}`
        const destinationD = `${[dropLocation.coordinates[1], dropLocation.coordinates[0]]}`

        if (!ride) {
            throw new Error('Ride request not found');
        }

        // Check ride status
        if (ride.rideStatus === 'accepted') {
            throw new Error('Ride has already been accepted by another rider');
        }

        ride.rideStatus = 'accepted';
        ride.rider = findDriver._id;
        await ride.save();
        const populatedRide = await RideRequest.findById(ride_request_id).populate('rider');

        let eta = null;
        let origin = `${populatedRide?.rider?.location?.coordinates?.[1]},${populatedRide?.rider?.location?.coordinates?.[0]}`
        let destination = `${populatedRide?.currentLocation?.coordinates?.[1] || ''},${populatedRide?.currentLocation?.coordinates?.[0] || ''}`

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

            populatedRide.RideOtp = Crypto.randomInt(1000, 9999)
            populatedRide.kmOfRide = data?.price
            populatedRide.EtaOfRide = eta

            await populatedRide.save()
            const returnData = {
                ...populatedRide.toObject(),
                eta: eta,
            };

            // console.log("return data",returnData)

            return returnData;

        } catch (error) {
            console.log(error)
        }



    } catch (error) {
        // Log and handle the error
        console.error('Error in ChangeRideRequestByRider:', error.message);
    }
};


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

exports.collectCash = async (data) => {
    try {
        const ride_id = await RideRequest.findById(data?._id)
        if (!ride_id) {
            return {
                success: false,
                message: 'Ride not found'
            }
        }

        ride_id.is_ride_paid = true
        await ride_id.save()

        const findRider = await Riders.findById(ride_id?.rider)
        if (!findRider) {
            return {
                success: false,
                message: 'Rider not found'
            }
        }

        await findRider.save()

        return {
            success: true,
            message: 'Ride End and Payment Success successfully'
        }

    } catch (error) {
        // Log and handle the error
        console.error('Error in rideStart:', error.message);
        return error.message
    }
}

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
        let rideId = rideData?._id || rideData?.ride?.rideDetails?._id
        if (!rideId) {
            return {
                success: false,
                message: "Invalid ride data",
            };
        }

        const ride = await RideRequest.findById(rideId);
        if (!ride) {
            return {
                success: false,
                message: "Ride not found",
            };
        }

        if (ride.rideStatus === "cancelled") {
            return {
                success: false,
                message: "Ride is already cancelled",
            };
        }

        if (ride.rideStatus === "completed") {
            return {
                success: false,
                message: "Cannot cancel a completed ride",
            };
        }

        ride.rideCancelBy = cancelBy;
        ride.rideCancelReason = reason;
        ride.rideStatus = "cancelled";
        ride.rideCancelTime = new Date();

        const foundRider = await Riders.findById(ride.rider?._id);
        if (!foundRider) {
            return {
                success: false,
                message: "Rider not found",
            };
        }

        foundRider.isAvailable = true;
        foundRider.on_ride_id = null;

        await ride.save();
        await foundRider.save();

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