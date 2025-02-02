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
require('dotenv').config();

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

// Set up Express
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(cors());
app.use(express.json());
app.use(cookies_parser());

// Store socket connections for both users and drivers
const userSocketMap = new Map();
const driverSocketMap = new Map();

// Socket.IO connection log
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

    const emitRideToDrivers = (rideData) => {
        // console.log('Driver Socket Map:', driverSocketMap);  // Check the map's contents

        // Loop through the driverSocketMap and emit the event to each connected driver
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
                console.log(String(dataof.user));

                const userSocketId = userSocketMap.get(String(dataof.user));
                console.log("userSocketId", userSocketMap);
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


        const driverSocketId = driverSocketMap.get(2);
        console.log("driverSocketId", driverSocketId);

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
        if (ride_end.success) {
            const driverSocketId = driverSocketMap.get(2);
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
            const driverSocketId = driverSocketMap.get(2);
            console.log("driverSocketId", driverSocketId);
            io.to(driverSocketId).emit('rating', {
                message: 'Your ride has been rated.',
                rating: rating,
            })
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

// Define routes
app.get('/rider', async (req, res) => {
    try {
        const riders = await RiderModel.find({ isAvailable: true });
        res.render('riders', { riders });
    } catch (err) {
        res.status(500).send('Error retrieving riders');
    }
});

app.get('/resturant',(req,res)=>{
    res.render('resturant')
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
        // Check if the Google Maps API key is present
        // if (!process.env.GOOGLE_MAP_KEY) {
        //     return res.status(403).json({
        //         success: false,
        //         message: "API Key is not found"
        //     });
        // }

        // Fetch address details using the provided latitude and longitude
        const addressResponse = await axios.get(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=AIzaSyCBATa-tKn2Ebm1VbQ5BU8VOqda2nzkoTU`
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



// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
