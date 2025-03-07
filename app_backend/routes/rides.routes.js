const express = require('express');
const { createRequest, findRider, complete_Details_ofRide, getAllRides, getSingleRides } = require('../controllers/ride.request');
const Protect = require('../middleware/Auth');
const { getOnlineTimeByRiderId } = require('../controllers/rider.controller');

const rides = express.Router();

rides.post('/create-ride',Protect, createRequest);

rides.get('/find-ride', findRider);
rides.get('/find-ride_details', complete_Details_ofRide);
// rides.post('/change-status', ChangeRideRequestByRider);


rides.get('/all_rides',getAllRides)
rides.get('/single_rides/:id',getSingleRides)

rides.get('/get_riders_times_by_rider_id/:id',getOnlineTimeByRiderId)

module.exports = rides;
