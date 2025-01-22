const express = require('express');
const { createRequest, findRider, complete_Details_ofRide } = require('../controllers/ride.request');
const Protect = require('../middleware/Auth');

const rides = express.Router();

rides.post('/create-ride',Protect, createRequest);

rides.get('/find-ride', findRider);
rides.get('/find-ride_details', complete_Details_ofRide);
// rides.post('/change-status', ChangeRideRequestByRider);



module.exports = rides;
