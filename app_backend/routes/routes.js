const express = require('express');
const { registerRider, getAllRiders, changeLocation } = require('../controllers/rider.controller');
const { calculateRidePriceForUser } = require('../controllers/ride.request');

const router = express.Router();

router.post('/register', registerRider);

router.get('/', getAllRiders);

router.put('/:riderId/location', changeLocation);

router.post('/get-fare-info',calculateRidePriceForUser)

module.exports = router;
