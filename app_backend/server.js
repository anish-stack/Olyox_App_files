const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDb = require('./database/db');
const router = require('./routes/routes');
const rides = require('./routes/rides.routes');
const RiderModel = require('./models/Rider.model');

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

io.on('connection', (socket) => {
    console.log('New client connected');
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