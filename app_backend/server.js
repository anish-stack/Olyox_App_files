const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDb = require('./database/db');
const router = require('./routes/routes');
const rides = require('./routes/rides.routes');
const RiderModel = require('./models/Rider.model');
const { ChangeRideRequestByRider, findRider } = require('./controllers/ride.request');
const hotel_router = require('./routes/Hotel.routes');
const users = require('./routes/user_routes/user_routes');
const cookies_parser = require('cookie-parser');

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
        console.log('Driver Socket Map:', driverSocketMap);  // Check the map's contents
    
        // Loop through the driverSocketMap and emit the event to each connected driver
        driverSocketMap.forEach((driverSocketId) => {
            console.log('Emitting ride data to driver with socket ID:', driverSocketId);
            io.to(driverSocketId).emit('ride_come', rideData);
        });
    
        console.log('Emitting ride data to drivers:', rideData);
    };
    

    // ride save message
    socket.on('send_message', async (data) => {
        try {
            console.log("ride data via user", data);
    
            const passRideToFindFunction = async () => {
                if (!data || !data.data || !data.data._id) {
                    throw new Error("Invalid data: Missing ride _id.");
                }
    
                const riderData = await findRider(data.data._id, io);
                console.log("data", riderData);
    
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

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
