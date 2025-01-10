const express = require('express');
const { registerRider, getAllRiders, changeLocation } = require('../controllers/rider.controller');

const router = express.Router();

router.post('/register', registerRider);

router.get('/', getAllRiders);

router.put('/:riderId/location', changeLocation);

module.exports = router;
