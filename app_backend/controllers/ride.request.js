const RideRequest = require('../models/ride.request.model');
const Riders = require('../models/Rider.model')

exports.createRequest = async (req, res) => {
    try {
        console.log(req.body);

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
            rideStatus: 'pending', // Default status is 'pending'
            pickup_desc:pick_desc, // Used the correct field name
            drop_desc:drop_desc,   // Used the correct field name
        });

       
        await newRideRequest.save();  

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


exports.findRider = async (req, res) => {
    try {
        const rideRequestId = req.query._id;

        // Find the ride request by ID
        const rideRequest = await RideRequest.findById(rideRequestId);
        if (!rideRequest) {
            return res.status(404).json({ error: 'Ride request not found' });
        }

        const { pickupLocation, pickup_desc, drop_desc, vehicleType } = rideRequest;

        // Ensure the pickupLocation has coordinates
        if (!pickupLocation || !pickupLocation.coordinates || pickupLocation.coordinates.length !== 2) {
            return res.status(400).json({ error: 'Invalid pickup location' });
        }

        const [longitude, latitude] = pickupLocation.coordinates;

        // Find nearby riders using geo-spatial queries
        const riders = await Riders.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [longitude, latitude] }, // Pickup location coordinates
                    distanceField: 'distance', // Field to store calculated distance
                    maxDistance: 2500, // 1000 meters (1 kilometer)
                    spherical: true, // Use spherical geometry for accurate distance calculation
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

        if (riders.length > 0) {
            // Emit a message to the clients using Socket.IO when nearby riders are found
            req.app.locals.io.emit('ride_come', {
                message: 'A new ride request is nearby!',
                riders: riders.map(rider => ({
                    name: rider.name,
                    vehicleName: rider.rideVehicleInfo.vehicleName,
                    vehicleNumber: rider.rideVehicleInfo.VehicleNumber,
                    pricePerKm: rider.rideVehicleInfo.PricePerKm,
                    vehicleType: rider.rideVehicleInfo.vehicleType,
                    distance: rider.distance,
                })),
                pickup_desc,
                drop_desc
            });
        }

        // Send the found riders as a response
        res.status(200).json({
            message: 'Nearby riders found successfully',
            riders: riders.map(rider => ({
                name: rider.name,
                vehicleName: rider.rideVehicleInfo.vehicleName,
                vehicleNumber: rider.rideVehicleInfo.VehicleNumber,
                pricePerKm: rider.rideVehicleInfo.PricePerKm,
                vehicleType: rider.rideVehicleInfo.vehicleType,
                distance: rider.distance,
            })),
            pickup_desc,
            drop_desc
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error, please try again' });
    }
};
