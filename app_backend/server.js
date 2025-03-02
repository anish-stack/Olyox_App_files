const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDb = require('./database/db');
const router = require('./routes/routes');
const rides = require('./routes/rides.routes');
const RiderModel = require('./models/Rider.model');
const { ChangeRideRequestByRider, findRider, rideStart, rideEnd, collectCash, AddRating } = require('./controllers/ride.request');
const hotel_router = require('./routes/Hotel.routes');
const users = require('./routes/user_routes/user_routes');
const cookies_parser = require('cookie-parser');
const axios = require('axios');
const tiffin = require('./routes/Tiffin/Tiffin.routes');
const parcel = require('./routes/Parcel/Parcel.routes');
const Parcel_boy_Location = require('./models/Parcel_Models/Parcel_Boys_Location');
const Protect = require('./middleware/Auth');
const { update_parcel_request, mark_reached, mark_pick, mark_deliver, mark_cancel } = require('./driver');
require('dotenv').config();
const multer = require('multer');
const admin = require('./routes/Admin/admin.routes');
const Settings = require('./models/Admin/Settings');
const storage = multer.memoryStorage()

const upload = multer({ storage: storage });
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with a ping interval of 6000ms
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    pingInterval: 6000,  // Add ping interval for connection health
});

// Connect to the database
connectDb();
app.set("socketio", io);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));
app.use(cookies_parser());

const userSocketMap = new Map();
const driverSocketMap = new Map();
const tiffin_partnerMap = new Map();

console.log("driverSocketMap-5", driverSocketMap)

app.set('driverSocketMap', driverSocketMap)
io.on('connection', (socket) => {
    console.log('New client connected');

    // Handle user connections
    socket.on('user_connect', (data) => {
        if (!data.userId || !data.userType) {
            console.error('Invalid user connect data:', data);
            return;
        }
        // Store the user's socket ID
        userSocketMap.set(data.userId, socket.id);
        console.log(`User ${data.userId} connected with socket ID: ${socket.id}`);
    });

    // Handle driver connections
    socket.on('driver_connect', (data) => {
        if (!data.userId) {
            console.error('Invalid driver connect data:', data);
            return;
        }
        // Store the driver's socket ID
        driverSocketMap.set(data.userId, socket.id);
        console.log(`Driver ${data.userId} connected with socket ID: ${socket.id}`);
    });


    socket.on('tiffin_partner', (data) => {
        console.log(data)
        if (!data.userId) {
            console.error('Invalid tiffin_partner connect data:', data);
            return;
        }

        tiffin_partnerMap.set(data.userId, socket.id);
        console.log(`tiffin_partner ${data.userId} connected with socket ID: ${socket.id}`);
    });




    const emitRideToDrivers = (rideData) => {

        driverSocketMap.forEach((driverSocketId) => {
            console.log('Emitting ride data to driver with socket ID:', driverSocketId);
            io.to(driverSocketId).emit('ride_come', rideData);
        });

        console.log('Emitting ride data to drivers:', rideData);
    };


    socket.on('ride_accepted', async (data) => {
        try {
            // Process the data and change ride request
            const dataof = await ChangeRideRequestByRider(io, data.data);

            if (dataof.rideStatus === 'accepted') {
                // Get the socket ID of the user who made the ride request
                console.log("debug-1", String(dataof.user));

                const userSocketId = userSocketMap.get(String(dataof.user));
                console.log("debug-2-userSocketId", userSocketMap);
                if (userSocketId) {
                    // Emit a message only to the specific user's socket ID
                    io.to(userSocketId).emit('ride_accepted_message', {
                        message: 'Your ride request has been accepted!',
                        rideDetails: dataof,
                    });
                    console.log(`Message sent to user: ${dataof.user}, socket ID: ${userSocketId}`);
                } else {
                    console.log(`No active socket found for user: ${dataof.user}`);
                }
            }
        } catch (error) {
            console.error('Error handling ride_accepted event:', error);
        }
    });


    socket.on('rideAccepted_by_user', (data) => {
        const { driver, ride } = data;

        console.log("debug-4", ride.rider)
        console.log("debug-5", driverSocketMap)
        const driverSocketId = driverSocketMap.get(ride?.rider._id);
        console.log("debug-1-3,driverSocketId", driverSocketId);

        if (driverSocketId) {

            socket.to(driverSocketId).emit('ride_accepted_message', {
                message: 'You can start this ride',
                rideDetails: ride,
                driver: driver,
            });
            console.log(`Message sent to Driver: ${driverSocketId}`);
        } else {
            console.log(`No active socket found for driver: ${driver._id}`);
        }
    });;

    // ride save message
    socket.on('send_message', async (data) => {
        try {
            console.log("ride data via user", data);

            const passRideToFindFunction = async () => {
                if (!data || !data.data || !data.data._id) {
                    throw new Error("Invalid data: Missing ride _id.");
                }

                const riderData = await findRider(data.data._id, io);


                // Handle the retrieved rider data here
                if (riderData) {
                    // Emit the ride details to the drivers
                    emitRideToDrivers(riderData);
                    // Optionally emit a response back to the user
                    socket.emit('message_response', { success: true, riderData });
                } else {
                    socket.emit('message_response', { success: false, error: "Rider not found." });
                }
            };

            await passRideToFindFunction();
        } catch (error) {
            console.error("Error in send_message handler:", error);
            socket.emit('message_response', {
                success: false,
                error: 'Failed to process the message.',
            });
        }
    });

    socket.on('ride_started', async (data) => {

        const userSocketId = userSocketMap.get(String(data.user));
        const ride_data_save = await rideStart(data)
        if (ride_data_save.success) {

            if (userSocketId) {
                // Emit a message only to the specific user's socket ID
                io.to(userSocketId).emit('ride_user_start', {
                    message: 'Your ride request has been started!',
                    rideDetails: data,
                });
                console.log(`Message sent to user: ${data.user}, socket ID: ${userSocketId}`);
            } else {
                console.log(`No active socket found for user: ${data.user}`);
            }

        } else {
            console.log("Error in ride start")
        }
        // const userSocketId = userSocketMap.get(data.driverId);
    })

    socket.on('endRide', async (data) => {
        console.log("ride end", data);
        const ride_end = await rideEnd(data?.ride)
        console.log("ride ends", ride_end);
        if (ride_end.success) {
            const Stringid = String(ride_end?.driverId)
            const driverSocketId = driverSocketMap.get(Stringid);
            console.log("driverSocketId", driverSocketId);
            io.to(driverSocketId).emit('ride_end', {
                message: 'Your ride  has been complete please collect money.',
                rideDetails: data,
            })
        } else {
            console.log("Error in ride end")
        }
    })


    socket.on('isPay', async (data) => {
        // console.log("isPay", data);
        const collect = await collectCash(data?.ride)
        console.log(collect)
        if (collect.success) {
            const userSocketId = userSocketMap.get(String(data?.ride?.user));
            console.log(userSocketId)
            io.to(userSocketId).emit('give-rate', {
                message: 'Your ride has been paid.',
                rideDetails: data,
            })
        } else {
            console.log("Error in collect")
        }
    })

    socket.on('rating', async (data) => {
        const { rating, ride } = data
        const ratingAdd = await AddRating(ride, rating)
        if (ratingAdd.success) {
            console.log("rating added")
            const driverSocketId = driverSocketMap.get(String(ratingAdd.driverId));
            console.log("driverSocketId", driverSocketId);
            io.to(driverSocketId).emit('rating', {
                message: 'Your ride has been rated.',
                rating: rating,
            })
        }
    })


    // Parcel Io Connection
    socket.on("driver_parcel_accept", async (data) => {
        try {
            if (!data || !data.order_id || !data.driver_id) {
                return console.log("Invalid data received:", data);
            }

            const response = await update_parcel_request(io, data, driverSocketMap, userSocketMap);

            if (response.status === true) {
                console.log(response.message);

                const driverSocketId = driverSocketMap[data.driver_id];
                if (driverSocketId) {
                    io.to(driverSocketId).emit("order_update_success", {
                        status: true,
                        message: "Order successfully accepted",
                        order_id: data.order_id,
                    });
                }
            } else {
                console.log(response.error);
                // Send failure response back to driver
                const driverSocketId = driverSocketMap[data.driver_id];
                if (driverSocketId) {
                    io.to(driverSocketId).emit("order_update_failed", {
                        status: false,
                        message: response.message || "Failed to accept order",
                    });
                }
            }
        } catch (error) {
            console.error("Error processing driver_parcel_accept:", error.message);
        }
    });

    socket.on('driver_reached', async (data) => {
        console.log("driver_reached", data)
        try {
            if (!data || !data._id || !data.driverId) {
                return console.log("Invalid data received:", data);
            }

            const response = await mark_reached(io, data, driverSocketMap, userSocketMap);

            if (response.status === true) {
                console.log(response.message);
                // Send success response back to driver
                const driverSocketId = driverSocketMap[data.driver_id];
                if (driverSocketId) {
                    io.to(driverSocketId).emit("order_mark_success", {
                        status: true,
                        message: "Order successfully accepted",
                        order_id: data.order_id,
                    });
                }
            } else {
                console.log(response.error);
                // Send failure response back to driver
                const driverSocketId = driverSocketMap[data.driver_id];
                if (driverSocketId) {
                    io.to(driverSocketId).emit("order_update_failed", {
                        status: false,
                        message: response.message || "Failed to accept order",
                    });
                }
            }
        } catch (error) {
            console.error("Error processing driver_parcel_accept:", error.message);
        }
    })
    socket.on('mark_pick', async (data) => {
        console.log("mark_pick", data)
        try {
            if (!data || !data._id || !data.driverId) {
                return console.log("Invalid data received:", data);
            }

            const response = await mark_pick(io, data, driverSocketMap, userSocketMap);

            if (response.status === true) {
                console.log(response.message);
                // Send success response back to driver
                const driverSocketId = driverSocketMap[data.driver_id];
                if (driverSocketId) {
                    io.to(driverSocketId).emit("mark_pick_driver", {
                        status: true,
                        message: "Order successfully accepted",
                        order_id: data.order_id,
                    });
                }
            } else {
                console.log(response.error);
                // Send failure response back to driver
                const driverSocketId = driverSocketMap[data.driver_id];
                if (driverSocketId) {
                    io.to(driverSocketId).emit("order_update_failed", {
                        status: false,
                        message: response.message || "Failed to accept order",
                    });
                }
            }
        } catch (error) {
            console.error("Error processing driver_parcel_accept:", error.message);
        }
    })
    socket.on('mark_deliver', async (data, moneyWriteAble, mode) => {
        console.log("mark_deliver", data)
        try {
            if (!data || !data._id || !data.driverId) {
                return console.log("Invalid data received:", data);
            }

            const response = await mark_deliver(io, data, driverSocketMap, userSocketMap, moneyWriteAble, mode);

            if (response.status === true) {
                console.log(response.message);
                // Send success response back to driver
                const driverSocketId = driverSocketMap[data.driver_id];
                if (driverSocketId) {
                    io.to(driverSocketId).emit("mark_pick_driver", {
                        status: true,
                        message: "Order successfully accepted",
                        order_id: data.order_id,
                    });
                }
            } else {
                console.log(response.error);
                // Send failure response back to driver
                const driverSocketId = driverSocketMap[data.driver_id];
                if (driverSocketId) {
                    io.to(driverSocketId).emit("order_update_failed", {
                        status: false,
                        message: response.message || "Failed to accept order",
                    });
                }
            }
        } catch (error) {
            console.error("Error processing driver_parcel_accept:", error.message);
        }
    })


    socket.on('mark_cancel', async (data) => {

        try {
            if (!data || !data._id || !data.driverId) {
                return console.log("Invalid data received:", data);
            }

            const response = await mark_cancel(io, data, driverSocketMap, userSocketMap);

            if (response.status === true) {
                console.log(response.message);
                // Send success response back to driver
                const driverSocketId = driverSocketMap[data.driver_id];
                if (driverSocketId) {
                    io.to(driverSocketId).emit("mark_pick_driver", {
                        status: true,
                        message: "Order successfully accepted",
                        order_id: data.order_id,
                    });
                }
            } else {
                console.log(response.error);
                // Send failure response back to driver
                const driverSocketId = driverSocketMap[data.driver_id];
                if (driverSocketId) {
                    io.to(driverSocketId).emit("order_update_failed", {
                        status: false,
                        message: response.message || "Failed to accept order",
                    });
                }
            }
        } catch (error) {
            console.error("Error processing driver_parcel_accept:", error.message);
        }
    })




    socket.on('disconnect', (reason) => {
        console.log(`Client disconnected. Reason: ${reason}`);

        // Remove user or driver from respective maps when disconnected
        userSocketMap.forEach((socketId, userId) => {
            if (socketId === socket.id) {
                userSocketMap.delete(userId);
                console.log(`User ${userId} disconnected`);
            }
        });

        driverSocketMap.forEach((socketId, driverId) => {
            if (socketId === socket.id) {
                driverSocketMap.delete(driverId);
                console.log(`Driver ${driverId} disconnected`);
            }
        });
    });
});

app.post('/image-upload', upload.any(), async (req, res) => {
    try {
        console.log(req.files)
        return res.status(201).json({
            message: "Image uploaded successfully",
            data: req.files
        })
    } catch (error) {
        console.error(error.message);
        return res.status(501).json({
            message: "Image uploaded failed",
            data: req.files
        })
    }
})

app.post('/webhook/receive-location', Protect, async (req, res) => {
    const riderId = req.user.userId || {};
    const { latitude, longitude } = req.body;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return res.status(400).json({ error: 'Invalid latitude or longitude' });
    } try {
        // Find or create rider document
        const rider = await Parcel_boy_Location.findOneAndUpdate(
            { riderId: riderId },
            {
                location: {
                    type: 'Point',
                    coordinates: [longitude, latitude]  // Store [longitude, latitude]
                },

            },
            { upsert: true, new: true }
        );

        // console.log(rider);

        // Emit the rider's location to the frontend via WebSocket (io.emit)
        io.emit('rider-location', rider);

        return res.status(200).json({ message: 'Location received successfully' });
    } catch (error) {
        console.error('Error updating location:', error);
        return res.status(500).json({ error: 'Failed to update location' });
    }
});


app.post('/webhook/cab-receive-location', Protect, async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        const userId = req.user.userId;
        //   console.log("user hits",req.user)
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

// Define routes
app.get('/rider', async (req, res) => {
    try {
        const riders = await RiderModel.find({ isAvailable: true });
        res.render('riders', { riders });
    } catch (err) {
        res.status(500).send('Error retrieving riders');
    }
});

app.get('/', (req, res) => {
    res.status(201).json({
        message: 'Welcome to the API',
    })
})


// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// API routes
app.use('/api/v1/rider', router);
app.use('/api/v1/rides', rides);
app.use('/api/v1/hotels', hotel_router);
app.use('/api/v1/user', users);
app.use('/api/v1/tiffin', tiffin);
app.use('/api/v1/parcel', parcel);
app.use('/api/v1/admin', admin);


app.post('/Fetch-Current-Location', async (req, res) => {
    const { lat, lng } = req.body;

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
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=AIzaSyC6lYO3fncTxdGNn9toDof96dqBDfYzr34`
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
            params: { address: pickup, key: 'AIzaSyC6lYO3fncTxdGNn9toDof96dqBDfYzr34' },
        });

        if (pickupResponse.data.status !== "OK") {
            return res.status(400).json({ message: "Invalid Pickup location" });
        }
        const pickupData = pickupResponse.data.results[0].geometry.location;

        // Geocode Dropoff Location
        const dropOffResponse = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
            params: { address: dropOff, key: 'AIzaSyC6lYO3fncTxdGNn9toDof96dqBDfYzr34' },
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
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
