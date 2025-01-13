const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDb = require('./database/db');
const router = require('./routes/routes');
const rides = require('./routes/rides.routes');
const RiderModel = require('./models/Rider.model');
const { ChangeRideRequestByRider, findRider } = require('./controllers/ride.request');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
connectDb()

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.use(cors());
app.use(express.json());

app.locals.io = io;
const userSocketMap = new Map();
io.on('connection', (socket) => {
    console.log('New client connected');



    socket.on('ride_accept', async (data) => {
        // console.log("riders",data)
        const dataR = await ChangeRideRequestByRider(io, data)
        // console.log("data of accespted ",dataR)
        const userSocketId = userSocketMap.get(1);
      
        if (userSocketId) {
            // Emit a message to the user's socket, passing the ride data
            io.to(userSocketId).emit('ride_update', {
                message: 'Your ride has been accepted!',
                dataAR: dataR,
                status: 'accepted',
            });
            console.log("message send to " + userSocketId)
        }
    })


    socket.on("user_connect", (data) => {
        // console.log("data",data)
        if (!data.userid || !data.userType) {
            console.error("Invalid user connect data:", data);
            return;
        }
        // Store the user's socket ID in the map
        userSocketMap.set(data.userid, socket.id);
        console.log(`User ${data.userid} connected with socket ID: ${socket.id}`);
    });

    socket.on('send_message', async (data) => {
        try {
            console.log(data)
            // Assuming findRider is a function that needs an ID
            const rider = await findRider(data.data?._id,io);
            console.log('Rider data:', rider);

            // Emit a response back to the client
            socket.emit('message_response', {
                success: true,
                rider,
            });
        } catch (error) {
            console.error('Error in send_message handler:', error);
            socket.emit('message_response', {
                success: false,
                error: 'Failed to process the message.',
            });
        }
    });
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3000;


app.get('/rider', async (req, res) => {
    try {
        const riders = await RiderModel.find({ isAvailable: true });
        res.render('riders', { riders });
    } catch (err) {
        res.status(500).send('Error retrieving riders');
    }
});


app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.use('/api/v1/rider', router)
app.use('/api/v1/rides', rides)


server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});