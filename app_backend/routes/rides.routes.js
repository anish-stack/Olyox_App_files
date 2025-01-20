const express = require('express');
const { createRequest, findRider } = require('../controllers/ride.request');
const Protect = require('../middleware/Auth');

const rides = express.Router();

rides.post('/create-ride',Protect, createRequest);

rides.get('/find-ride', findRider);
// rides.post('/change-status', ChangeRideRequestByRider);



module.exports = rides;
