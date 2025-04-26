const express = require('express');
const { createRequest, findRider, complete_Details_ofRide, getAllRides, getSingleRides, deleleteRidersRideOrder, changeRidersRideStatusByAdmin } = require('../controllers/ride.request');
const Protect = require('../middleware/Auth');
const { getOnlineTimeByRiderId, getMyEligibleBonus, parcelDashboardData, inProgressOrder } = require('../controllers/rider.controller');

const rides = express.Router();

rides.post('/create-ride',Protect, createRequest);

rides.get('/find-ride', findRider);
rides.get('/find-ride_details', complete_Details_ofRide);
// rides.post('/change-status', ChangeRideRequestByRider);


rides.get('/all_rides',getAllRides)
rides.get('/single_rides/:id',getSingleRides)

rides.get('/get_riders_times_by_rider_id/:id',getOnlineTimeByRiderId)
rides.delete('/delete_rider_ride/:id', deleleteRidersRideOrder);
rides.put('/update_rider_ride_status/:id', changeRidersRideStatusByAdmin);



// get My eligible 
rides.get('/getMyEligibleBonus/:userId',getMyEligibleBonus)
rides.get('/parcelDashboardData/:userId',parcelDashboardData)
rides.get('/inProgressOrder/:userId',inProgressOrder)

module.exports = rides;
