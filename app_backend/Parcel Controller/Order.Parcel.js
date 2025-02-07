const Parcel_Request = require("../models/Parcel_Models/Parcel_Request");
const axios = require("axios");
const Parcel_Boys_Location = require("../models/Parcel_Models/Parcel_Boys_Location");
const Parcel_User_Login_Status = require("../models/Parcel_Models/Parcel_User_Login_Status");
const Parcel_Bike_Register = require("../models/Parcel_Models/Parcel_Bike_Register");
const { driverSocketMap } = require("../server");

exports.request_of_parcel = async (req, res) => {
    try {
        const userData = Array.isArray(req.user.user) ? req.user.user[0] : req.user.user;
        const { customerName, customerPhone, dropoff, height, length, pickup, weight, width } = req.body || {};

        if (!dropoff || !pickup) {
            return res.status(400).json({ message: "Dropoff and Pickup are required" });
        }
        if (!height || !length || !width || !weight) {
            return res.status(400).json({ message: "Height, Length, Width, and Weight are required" });
        }

        const pickupData = await axios.get(`https://api.srtutorsbureau.com/geocode?address=${encodeURIComponent(pickup)}`);
        const dropOffData = await axios.get(`https://api.srtutorsbureau.com/geocode?address=${encodeURIComponent(dropoff)}`);

        if (!pickupData?.data?.longitude || !pickupData?.data?.latitude || !dropOffData?.data?.longitude || !dropOffData?.data?.latitude) {
            return res.status(400).json({ message: "Invalid geolocation data" });
        }

        const GeoPickUp = {
            type: "Point",
            coordinates: [pickupData.data.longitude, pickupData.data.latitude],
        };

        const GeoDrop = {
            type: "Point",
            coordinates: [dropOffData.data.longitude, dropOffData.data.latitude],
        };

        const io = req.app.get("socketio");
        if (!io) {
            return res.status(500).json({ message: "Socket.io is not connected" });
        }

        const findBoysNearPickup = await Parcel_Boys_Location.find({
            location: {
                $near: {
                    $geometry: GeoPickUp,
                    $maxDistance: 3000,
                },
            },
        }).populate("riderId", "_id");

        if (findBoysNearPickup.length === 0) {
            return res.status(404).json({ message: "No delivery boys found near pickup location" });
        }

        const pickupResponse = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
            params: { address: pickup, key: 'AIzaSyC6lYO3fncTxdGNn9toDof96dqBDfYzr34' },
        });

        if (pickupResponse.data.status !== "OK") {
            return res.status(400).json({ message: "Invalid Pickup location" });
        }
        const pickupDatatwo = pickupResponse.data.results[0].geometry.location;

        // Geocode Dropoff Location
        const dropOffResponse = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
            params: { address: dropoff, key: 'AIzaSyC6lYO3fncTxdGNn9toDof96dqBDfYzr34' },
        });

        if (dropOffResponse.data.status !== "OK") {
            return res.status(400).json({ message: "Invalid Dropoff location" });
        }
        const dropOffDatatwo = dropOffResponse.data.results[0].geometry.location;

        // Calculate Distance using Google Distance Matrix API
        const distanceResponse = await axios.get("https://maps.googleapis.com/maps/api/distancematrix/json", {
            params: {
                origins: `${pickupDatatwo.lat},${pickupDatatwo.lng}`,
                destinations: `${dropOffDatatwo.lat},${dropOffDatatwo.lng}`,
                key: 'AIzaSyC6lYO3fncTxdGNn9toDof96dqBDfYzr34',
            },
        });

        if (distanceResponse.data.status !== "OK") {
            return res.status(400).json({ message: "Failed to calculate distance" });
        }

        const distanceInfo = distanceResponse.data.rows[0].elements[0];

        if (distanceInfo.status !== "OK") {
            return res.status(400).json({ message: "Invalid distance calculation" });
        }

        const distanceInKm = distanceInfo.distance.value / 1000; // Convert meters to kilometers
        const price = distanceInKm * 70;

        // Create a new parcel request
        const newParcelRequest = new Parcel_Request({
            customerId: userData._id,
            customerName,
            customerPhone,
            pickupLocation: pickup,
            dropoffLocation: dropoff,
            parcelDetails: {
                height,
                weight,
                dimensions: { length, width, height },
            },
            totalKm: distanceInKm,
            pickupGeo: GeoPickUp,
            droppOffGeo: GeoDrop,
            price: price.toFixed(2),
            status: "pending",
        });

        await newParcelRequest.save();

        // Check delivery boys' online status
        const availableBoys = [];

        for (const boy of findBoysNearPickup) {
            const checkStatus = await Parcel_User_Login_Status.findOne({
                riderId: boy.riderId._id,
                status: "online",
            });

            if (checkStatus) {
                availableBoys.push(boy);
            }
        }

        const availableRidersData = [];
        for (const item of availableBoys) {
            const rider_data = await Parcel_Bike_Register.findById(item.riderId._id);
            if (rider_data) {
                availableRidersData.push({
                    rider_data,
                    location: item.location,
                });
            }
        }
        const data = req.app.get('driverSocketMap');

        availableRidersData.forEach((rider) => {
            const riderId = rider?.rider_data?._id?.toString();
            console.log("riderId", riderId)
            const riderSocketId = data.get(riderId); // Get socket ID from Map
            console.log("riderSocketId", riderSocketId)
            if (riderSocketId) {
                io.to(riderSocketId).emit('new_parcel_request', {
                    pickupLocation: pickup,
                    dropoffLocation: dropoff,
                    parcelDetails: {
                        height,
                        length,
                        width,
                        weight
                    },
                    price: price.toFixed(2),
                    customerId: userData._id,
                    customerName,
                    customerPhone,
                });
            } else {
                console.log(`No active socket found for rider ${rider.riderId}`);
            }
        });

        return res.status(201).json({
            message: "Parcel request created successfully",
            parcelRequest: newParcelRequest,

            availableRiders: availableRidersData,
        });
    } catch (error) {
        console.error("Error in request_of_parcel:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};
