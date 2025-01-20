const RideRequest = require('../models/ride.request.model');
const Riders = require('../models/Rider.model')
const axios = require('axios');
const Crypto = require('crypto')
exports.createRequest = async (req, res) => {
    try {
        console.log("i am hiting",req.body)

       const user = req.user
        console.log("user",user)
        const { vehicleType, pickupLocation, dropLocation, currentLocation, pick_desc, drop_desc } = req.body;

        // Check if all required fields are provided
        if (!pickupLocation || !dropLocation || !currentLocation || !pick_desc || !drop_desc) {
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
            pickupLocation: pickupLocationGeo,
            dropLocation: dropLocationGeo,
            currentLocation: currentLocationGeo,
            rideStatus: 'pending',
            pickup_desc: pick_desc, // Used the correct field name
            drop_desc: drop_desc,   // Used the correct field name
        });


        await newRideRequest.save();
        console.log(newRideRequest);
        // Send a success response with the created ride request
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


// exports.findRider = async (req, res,id) => {
//     try {
//         const rideRequestId = req.query._id || id;

//         // Find the ride request by ID
//         const rideRequest = await RideRequest.findById(rideRequestId);
//         if (!rideRequest) {
//             return res.status(404).json({ error: 'Ride request not found' });
//         }

//         const { pickupLocation, pickup_desc, drop_desc, vehicleType } = rideRequest;

//         // Ensure the pickupLocation has coordinates
//         if (!pickupLocation || !pickupLocation.coordinates || pickupLocation.coordinates.length !== 2) {
//             return res.status(400).json({ error: 'Invalid pickup location' });
//         }

//         const [longitude, latitude] = pickupLocation.coordinates;

//         // Find nearby riders using geo-spatial queries
//         const riders = await Riders.aggregate([
//             {
//                 $geoNear: {
//                     near: { type: 'Point', coordinates: [longitude, latitude] },
//                     distanceField: 'distance',
//                     maxDistance: 2500,
//                     spherical: true,
//                 }
//             },
//             {
//                 $match: {
//                     isAvailable: true, // Ensure the rider is available
//                     "rideVehicleInfo.vehicleType": vehicleType // Match the vehicle type inside the rideVehicleInfo object
//                 }
//             },
//             {
//                 $project: {
//                     name: 1,
//                     "rideVehicleInfo.vehicleName": 1, // Include the vehicle name
//                     "rideVehicleInfo.VehicleNumber": 1, // Include the vehicle number
//                     "rideVehicleInfo.PricePerKm": 1, // Include the price per km
//                     "rideVehicleInfo.vehicleType": 1, // Include the vehicle type
//                     distance: 1, // Include the distance field calculated by $geoNear
//                 }
//             }
//         ]);

//         if (riders.length > 0) {
//             req.app.locals.io.emit('ride_come', {
//                 message: 'A new ride request is nearby!',
//                 riders: riders.map(rider => ({
//                     name: rider.name,
//                     id: rider?._id,
//                     rideRequestId,
//                     vehicleName: rider.rideVehicleInfo.vehicleName,
//                     vehicleNumber: rider.rideVehicleInfo.VehicleNumber,
//                     pricePerKm: rider.rideVehicleInfo.PricePerKm,
//                     vehicleType: rider.rideVehicleInfo.vehicleType,
//                     distance: rider.distance,
//                 })),
//                 pickup_desc,
//                 drop_desc
//             });
//         }

//         // Send the found riders as a response
//         res.status(200).json({
//             message: 'Nearby riders found successfully',
//             riders: riders.map(rider => ({
//                 name: rider.name,
//                 rideRequestId,
//                 id: rider?._id,
//                 vehicleName: rider.rideVehicleInfo.vehicleName,
//                 vehicleNumber: rider.rideVehicleInfo.VehicleNumber,
//                 pricePerKm: rider.rideVehicleInfo.PricePerKm,
//                 vehicleType: rider.rideVehicleInfo.vehicleType,
//                 distance: rider.distance,
//             })),
//             pickup_desc,
//             drop_desc
//         });

//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Server error, please try again' });
//     }
// };

exports.findRider = async (id, io) => {
    try {
        const rideRequestId = id;
        console.log("jjjj",rideRequestId)
        // console.log(rideRequestId);
        // // Find the ride request by ID
        const rideRequest = await RideRequest.findById(rideRequestId);
        if (!rideRequest) {
            throw new Error('Ride request not found');
        }

        const { pickupLocation, pickup_desc, drop_desc, vehicleType, dropLocation } = rideRequest;
        console.log(dropLocation)
        console.log(pickupLocation)

        // Ensure the pickupLocation has coordinates
        if (!pickupLocation || !pickupLocation.coordinates || pickupLocation.coordinates.length !== 2) {
            throw new Error('Invalid pickup location');
        }

        const [longitude, latitude] = pickupLocation.coordinates;

        // Find nearby riders using geo-spatial queries
        const riders = await Riders.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [longitude, latitude] },
                    distanceField: 'distance',
                    maxDistance: 2500,
                    spherical: true,
                }
            },
            {
                $match: {
                    isAvailable: true, // Ensure the rider is available
                    "rideVehicleInfo.vehicleType": vehicleType // Match the vehicle type inside the rideVehicleInfo object
                }
            },
            {
                $project: {
                    name: 1,
                    "rideVehicleInfo.vehicleName": 1, // Include the vehicle name
                    "rideVehicleInfo.VehicleNumber": 1, // Include the vehicle number
                    "rideVehicleInfo.PricePerKm": 1, // Include the price per km
                    "rideVehicleInfo.vehicleType": 1, // Include the vehicle type
                    distance: 1, // Include the distance field calculated by $geoNear
                }
            }
        ]);

        // Calculate pricing and ETA
        const origin = `${[pickupLocation.coordinates[1], pickupLocation.coordinates[0]]}`
        const destination = `${[dropLocation.coordinates[1], dropLocation.coordinates[0]]}`
        console.log(destination)
        const ridePricing = await calculateRidePrice(origin, destination, 5);
        let eta = ridePricing.eta;

        // Emit to clients if riders are found
        io.emit('ride_come', {
            message: 'A new ride request is nearby!',
            riders: riders.map(rider => ({
                name: rider.name,
                id: rider._id,
                rideRequestId,
                vehicleName: rider.rideVehicleInfo.vehicleName,
                vehicleNumber: rider.rideVehicleInfo.VehicleNumber,
                pricePerKm: rider.rideVehicleInfo.PricePerKm,
                vehicleType: rider.rideVehicleInfo.vehicleType,
                distance: rider.distance,
                price: ridePricing.totalPrice.toFixed(2), // Include the total price
                eta: eta, // Include ETA
            })),
            pickup_desc,
            drop_desc
        });

        // console.log(object)
        // Return the found riders
        return {
            message: 'Nearby riders found successfully',
            riders: riders.map(rider => ({
                name: rider.name,
                id: rider._id,
                rideRequestId,
                vehicleName: rider.rideVehicleInfo.vehicleName,
                vehicleNumber: rider.rideVehicleInfo.VehicleNumber,
                pricePerKm: rider.rideVehicleInfo.PricePerKm,
                vehicleType: rider.rideVehicleInfo.vehicleType,
                distance: rider.distance,
                price: ridePricing.totalPrice.toFixed(2), // Include the total price
                eta: eta, // Include ETA
            })),
            pickup_desc,
            drop_desc
        };

    } catch (error) {
        console.error(error);

        // Emit error to client
        io.emit('error', { message: error.message });

        // Return the error as response
        return { error: error.message };
    }
};


exports.ChangeRideRequestByRider = async (io, data) => {
    try {
        // Validate incoming data
        if (!data || !data.rideRequestId || !data.driverId) {
            throw new Error('Invalid data: rideRequestId and driverId are required');
        }

        const { rideRequestId, driverId } = data;

        const findDriver = await Riders.findById(driverId)
        if (!findDriver) {
            return res.status(403).json({
                success: false,
                message: 'Driver not found',

            })
        }
        // Fetch the ride request from the database
        const ride = await RideRequest.findById(rideRequestId);
        const { pickupLocation, dropLocation } = ride;

        const originD = `${[pickupLocation.coordinates[1], pickupLocation.coordinates[0]]}`
        const destinationD = `${[dropLocation.coordinates[1], dropLocation.coordinates[0]]}`
        const ridePricing = await calculateRidePrice(originD, destinationD, 0, findDriver?.rideVehicleInfo?.PricePerKm);


        if (!ride) {
            throw new Error('Ride request not found');
        }

        // Check ride status
        if (ride.rideStatus === 'accepted') {
            throw new Error('Ride has already been accepted by another rider');
        }

        // Update ride status and assign rider
        ride.rideStatus = 'accepted';
        ride.rider = driverId;
        await ride.save();
        const populatedRide = await RideRequest.findById(rideRequestId).populate('rider');

        // Fetch ETA from Google Maps Directions API
        let eta = null;
        let origin = `${populatedRide?.rider?.location?.coordinates?.[1]},${populatedRide?.rider?.location?.coordinates?.[0]}`
        let destination = `${populatedRide?.currentLocation?.coordinates?.[1] || ''},${populatedRide?.currentLocation?.coordinates?.[0] || ''}`

        try {
            const response = await axios.get(`https://maps.googleapis.com/maps/api/directions/json`, {
                params: {
                    origin: origin,
                    destination: destination,
                    key: 'AIzaSyC6lYO3fncTxdGNn9toDof96dqBDfYzr34', // Replace with your actual API key
                },

            });


            if (response.data.routes && response.data.routes.length > 0) {
                const route = response.data.routes[0];
                const duration = route.legs[0].duration.text; // Duration in minutes
                eta = duration;
            }
        } catch (error) {
            console.error('Error fetching ETA:', error.message);
        }

        // If no ETA is found, set a default message
        if (!eta) {
            eta = 'Not available';
        }

        // If no socket.io instance is available, throw an error
        if (!io) {
            throw new Error('Socket.io instance is not available');
        }

        populatedRide.priceOfRide = ridePricing.totalPrice.toFixed(2)
        populatedRide.RideOtp = Crypto.randomInt(1000, 9999)
        populatedRide.kmOfRide = ridePricing.distanceInKm
        populatedRide.EtaOfRide = eta

        await populatedRide.save()
        // const ridePricing = await calculateRidePrice(origin, destination, 5)
        const returnData = {
            ...populatedRide.toObject(),
            totalPrice: ridePricing.totalPrice.toFixed(2),
            distanceInKm: ridePricing.distanceInKm,
            durationInMinutes: ridePricing.durationInMinutes,
            waitingTimeCost: ridePricing.waitingTimeCost,
            eta: eta,
        };

        return returnData;

    } catch (error) {
        // Log and handle the error
        console.error('Error in ChangeRideRequestByRider:', error.message);
    }
};


const calculateRidePrice = async (origin, destination, waitingTimeInMinutes, ratePerKm) => {
    console.log("ratePerKm", ratePerKm)
    try {
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

        const priceBasedOnDistance = distanceInKm * ratePerKm;

        const waitingTimeCost = waitingTimeInMinutes * 5; // Assuming 5 Rupees per minute of waiting

        const totalPrice = priceBasedOnDistance + waitingTimeCost;

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
    const { origin, destination, waitingTimeInMinutes = 0, ratePerKm } = req.body
    const numericalRate = ratePerKm.match(/\d+/)?.[0]; // Matches digits
    console.log(numericalRate); // Output: "19"
    console.log(Number(numericalRate));
    try {
        // Fetching directions from Google Maps API to get distance and duration with traffic consideration
        const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
            params: {
                origin: `${origin.latitude},${origin.longitude}`, // Correct order
                destination: `${destination.latitude},${destination.longitude}`, // Correct order
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

        const priceBasedOnDistance = distanceInKm * Number(numericalRate);
        console.log(priceBasedOnDistance)
        const waitingTimeCost = waitingTimeInMinutes * 5; // Assuming 5 Rupees per minute of waiting
        console.log(waitingTimeCost)
        const totalPrice = priceBasedOnDistance + waitingTimeCost;
        res.status(200).json({
            success: true,
            message: "Ride price calculated successfully",
            totalPrice: totalPrice,
            distanceInKm: distanceInKm,
            durationInMinutes: durationInMinutes,
            waitingTimeCost: waitingTimeCost,
        })
    } catch (error) {
        console.error('Error calculating ride price:', error);
        res.status(501).json({
            success: false,
            message: "Failed to calculate the ride price",
        })
    }
};

// const origin = { lat: 28.7011, lng: 77.1170 }; // Example coordinates for user current location (Delhi)
// const destination = { lat: 28.7035, lng: 77.0986 }; // Example coordinates for destination (Noida)
// const waitingTimeInMinutes = 2; // Example waiting time in minutes

// calculateRidePrice(origin, destination, waitingTimeInMinutes)
//     .then(result => {
//         console.log('Total Price:', result.totalPrice.toFixed(2));
//         console.log('Distance (km):', result.distanceInKm);
//         console.log('Duration (minutes):', result.durationInMinutes);
//         console.log('Waiting Time Cost:', result.waitingTimeCost);
//     })
//     .catch(error => {
//         console.error('Error:', error.message);
//     });
