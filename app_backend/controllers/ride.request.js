const RideRequest = require('../models/ride.request.model');
const Riders = require('../models/Rider.model')
const axios = require('axios');
const Crypto = require('crypto');
const { FindWeather, CheckTolls } = require('../utils/Api.utils');
const Settings = require('../models/Admin/Settings');
const RidesSuggestionModel = require('../models/Admin/RidesSuggestion.model');
exports.createRequest = async (req, res) => {
    try {


        const user = Array.isArray(req.user.user) ? req.user.user[0] : req.user.user;


        const { vehicleType, pickupLocation, dropLocation, currentLocation, pick_desc, drop_desc } = req.body;
        console.log(req.body)
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
        // console.log("ride save 0", newRideRequest)

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
                key: "AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8",
                traffic_model: "best_guess",
                departure_time: "now",
            },
        });

        const route = response.data.routes[0];
        const distance = route.legs[0].distance.value / 1000;
        const duration = route.legs[0].duration.value / 60;
        const trafficDuration = route.legs[0].duration_in_traffic.value / 60;
        const VehiclePrice = await RidesSuggestionModel.findOne({
            name: vehicleType,
        })
        const ratePerKm = VehiclePrice.priceRange
        const waitingTimeInMinutes = 0
        // origin, destination, waitingTimeInMinutes = 0, ratePerKm 
        const dataSend = {
            pickupLocation,
            dropLocation,
            waitingTimeInMinutes,
            ratePerKm
        }
        console.log("dataSend", dataSend)
        const data = await calculateRidePriceForConfirmRide(dataSend)

        console.log("data of price", data)

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
                price: data?.totalPrice.toFixed(2),
                eta: eta,
                rain: data?.rain,
                tollPrice: data?.tollPrice,
                tolls: data.tolls === undefined ? false : true

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

        ride_id.ride_end_time = new Date()
        if (ride_id) {
            ride_id.rideStatus = "completed";
        }
        
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


exports.cancelRideByAnyOne = async (cancelBy, rideData, reason) => {
    try {
        if (!rideData || !rideData._id) {
            return {
                success: false,
                message: "Invalid ride data",
            };
        }

        const ride = await RideRequest.findById(rideData._id);
        if (!ride) {
            return {
                success: false,
                message: "Ride not found",
            };
        }

        // Prevent re-canceling a ride that is already cancelled or completed
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

        // Update ride details
        ride.rideCancelBy = cancelBy;
        ride.rideCancelReason = reason;
        ride.rideStatus = "cancelled";
        ride.rideCancelTime = new Date();

        const foundRider = await Riders.findById(ride.rider?._id)
        if (!foundRider) {
            return {
                success: false,
                message: "Rider not found",
            }
        }
        // Ensure the rider exists before modifying availability
        if (foundRider !== undefined) {
            foundRider.isAvailable = true;
        }

        await ride.save(); // Save updated ride data
        if (foundRider) {
            await foundRider.save(); // Save updated rider details
        }

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
