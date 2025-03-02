const RideRequest = require('../models/ride.request.model');
const Riders = require('../models/Rider.model')
const axios = require('axios');
const Crypto = require('crypto');
const { FindWeather, CheckTolls } = require('../utils/Api.utils');
const Settings = require('../models/Admin/Settings');
exports.createRequest = async (req, res) => {
    try {


        const user = Array.isArray(req.user.user) ? req.user.user[0] : req.user.user;
        console.log("shshsh", user)

        const { vehicleType, pickupLocation, dropLocation, currentLocation, pick_desc, drop_desc } = req.body;

        // Check if all required fields are provided
        if (!pickupLocation || !dropLocation || !pick_desc || !drop_desc) {
            console.log("pickupLocation:", pickupLocation);
            console.log("dropLocation:", dropLocation);
            console.log("currentLocation:", currentLocation);
            console.log("pick_desc:", pick_desc);
            console.log("drop_desc:", drop_desc);

            return res.status(400).json({ error: 'All fields are required' });
        }


        // Structure coordinates for pickupLocation, dropLocation, and currentLocation
        const pickup_coords = [pickupLocation.longitude, pickupLocation.latitude];
        const drop_coords = [dropLocation.longitude, dropLocation.latitude];
        const current_coords = [currentLocation.longitude, currentLocation.latitude];

        // Create GeoJSON objects for geospatial queries
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

        // Create a new ride request document
        const newRideRequest = new RideRequest({
            vehicleType,
            user: user,
            pickupLocation: pickupLocationGeo,
            dropLocation: dropLocationGeo,
            currentLocation: currentLocationGeo,
            rideStatus: 'pending',
            pickup_desc: pick_desc, // Used the correct field name
            drop_desc: drop_desc,   // Used the correct field name
        });


        await newRideRequest.save();
        console.log("ride save 0", newRideRequest)

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
    try {
        const rideRequestId = id;

        const rideRequest = await RideRequest.findById(rideRequestId).populate("user");
        if (!rideRequest) {
            throw new Error("Ride request not found");
        }

        const { pickupLocation, pickup_desc, drop_desc, vehicleType, dropLocation, user } = rideRequest;

        if (!pickupLocation || !pickupLocation.coordinates || pickupLocation.coordinates.length !== 2) {
            throw new Error("Invalid pickup location");
        }

        const [longitude, latitude] = pickupLocation.coordinates;
        console.log(vehicleType)
        const riders = await Riders.aggregate([
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [longitude, latitude] },
                    distanceField: "distance",
                    maxDistance: 2500,
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
                    distance: 1,
                },
            },
        ]);

        const origin = `${pickupLocation.coordinates[1]},${pickupLocation.coordinates[0]}`;
        const destination = `${dropLocation.coordinates[1]},${dropLocation.coordinates[0]}`;
        const response = await axios.get("https://maps.googleapis.com/maps/api/directions/json", {
            params: {
                origin: origin,
                destination: destination,
                key: "AIzaSyC6lYO3fncTxdGNn9toDof96dqBDfYzr34",
                traffic_model: "best_guess",
                departure_time: "now",
            },
        });

        const route = response.data.routes[0];
        const distance = route.legs[0].distance.value / 1000;
        const duration = route.legs[0].duration.value / 60;
        const trafficDuration = route.legs[0].duration_in_traffic.value / 60;

        // Calculate pricing
        let totalPrice = 70; // Basic fare for up to 2 km
        if (distance > 2) {
            totalPrice += (distance - 2) * 15; // 15 rs per km after 2 km
        }
        totalPrice += trafficDuration * 2; // 2 rs per minute in traffic

        const eta = Math.round(trafficDuration);

        if (riders.length === 0) {
            console.log("No riders available")
            return
        }

        const rideInfo = {
            message: "Nearby riders found successfully",
            riders: riders.map((rider) => ({
                name: rider.name,
                id: rider._id,
                rideRequestId,
                vehicleName: rider.rideVehicleInfo.vehicleName,
                vehicleNumber: rider.rideVehicleInfo.VehicleNumber,
                pricePerKm: rider.rideVehicleInfo.PricePerKm,
                vehicleType: rider.rideVehicleInfo.vehicleType,
                distance: rider.distance,
                price: totalPrice.toFixed(2),
                eta: eta,
            })),
            user,
            pickup_desc,
            pickupLocation,
            dropLocation,
            drop_desc,
            distance: distance.toFixed(2),
            duration: Math.round(duration),
            trafficDuration: Math.round(trafficDuration),
        };


        console.log("Emitting ride_come event to clients", rideInfo);
        io.emit("ride_come", {
            message: "A new ride request is nearby!",
            ...rideInfo,
        });

        return rideInfo;
    } catch (error) {
        console.error(error);
        io.emit("error", { message: error.message });
        return { error: error.message };
    }
};



exports.ChangeRideRequestByRider = async (io, data) => {
    try {

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
                    key: 'AIzaSyC6lYO3fncTxdGNn9toDof96dqBDfYzr34',
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
        const ride_id = await RideRequest.findById(data?._id)
        if (!ride_id) {
            return {
                success: false,
                message: 'Ride not found'
            }
        }
        ride_id.ride_is_started = true
        ride_id.ride_start_time = new Date()
        await ride_id.save()
        return {
            success: true,
            message: 'Ride started successfully'
        }

    } catch (error) {
        // Log and handle the error
        console.error('Error in rideStart:', error.message);
        return error.message
    }
}

exports.rideEnd = async (data) => {
    try {
        const ride_id = await RideRequest.findById(data?._id)
        if (!ride_id) {
            return {
                success: false,
                message: 'Ride not found'
            }
        }
        ride_id.ride_is_started = true

        ride_id.ride_end_time = new Date()
        await ride_id.save()

        const findRider = await Riders.findById(ride_id?.rider)
        if (!findRider) {
            return {
                success: false,
                message: 'Rider not found'
            }
        }
        findRider.TotalRides += 1
        findRider.rides.push(ride_id._id)
        await findRider.save()

        return {
            success: true,
            driverId: findRider._id,
            message: 'Ride End successfully'
        }

    } catch (error) {
        // Log and handle the error
        console.error('Error in rideStart:', error.message);
        return error.message
    }
}
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
                key: 'AIzaSyC6lYO3fncTxdGNn9toDof96dqBDfYzr34',
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
        // Extract request parameters
        const { origin, destination, waitingTimeInMinutes = 0, ratePerKm } = req.body;
        
        // Convert ratePerKm to a number, defaulting to 15 if invalid
        const numericalRate = ratePerKm?.match(/\d+/)?.[0];
        const perKmRate = Number(numericalRate) || 15;

        // Format origin and destination coordinates for API request
        const formattedOrigin = `${origin.latitude},${origin.longitude}`;
        const formattedDestination = `${destination.latitude},${destination.longitude}`;

        // Fetch route details from Google Maps Directions API
        const response = await axios.get("https://maps.googleapis.com/maps/api/directions/json", {
            params: {
                origin: formattedOrigin,
                destination: formattedDestination,
                key: process.env.GOOGLE_MAPS_API_KEY, // Use environment variable instead of hardcoding
                traffic_model: "best_guess",
                departure_time: Math.floor(Date.now() / 1000),
            },
        });

        // Check if the response contains valid route data
        if (!response.data.routes || !response.data.routes.length) {
            return res.status(400).json({
                success: false,
                message: "Unable to fetch directions from Google Maps API",
            });
        }

        const route = response.data.routes[0];
        const distance = route.legs[0].distance.value / 1000; // Convert meters to kilometers
        const duration = route.legs[0].duration.value / 60; // Convert seconds to minutes
        const trafficDuration = route.legs[0].duration_in_traffic?.value / 60 || duration; // Handle missing traffic data

        // Check weather conditions at the origin location
        let rain = false;
        const checkWeather = await FindWeather(origin.latitude, origin.longitude);
        if (checkWeather && checkWeather[0]?.main === 'Rain') {
            rain = true;
        }

        // Check for tolls on the route
        let tolls = false;
        let tollPrice = 0;
        const checkTolls = await CheckTolls(origin, destination);
        if (checkTolls?.travelAdvisory) {
            tolls = true;
            tollPrice = checkTolls?.tollInfo?.estimatedPrice?.units || 0;
        }

        // Retrieve fare settings from the database
        const settingData = await Settings.findOne();
        const basicFare = settingData?.BasicFare || 94;
        const trafficDurationPricePerMinute = settingData?.trafficDurationPricePerMinute || 0;
        const rainModeFare = settingData?.RainModeFareOnEveryThreeKm || 0;
        const waitingTimeCost = waitingTimeInMinutes * (settingData?.waitingTimeInMinutes || 0);

        // Calculate total fare
        let totalPrice = basicFare + (trafficDuration * trafficDurationPricePerMinute) + waitingTimeCost;
        if (rain) {
            totalPrice += rainModeFare;
        }
        if (tolls) {
            totalPrice += tollPrice;
        }
        totalPrice += distance * perKmRate;

        // Return the calculated ride price
        res.status(200).json({
            success: true,
            message: "Ride price calculated successfully",
            totalPrice,
            distanceInKm: distance,
            rain,
            tolls,
            tollPrice,
            durationInMinutes: trafficDuration,
            waitingTimeCost,
        });
    } catch (error) {
        console.error("Error calculating ride price:", error);
        res.status(500).json({
            success: false,
            message: "Failed to calculate the ride price",
        });
    }
};
