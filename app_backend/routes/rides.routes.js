const express = require('express');
const { createRequest, findRider } = require('../controllers/ride.request');

const rides = express.Router();

rides.post('/create-ride', createRequest);

rides.get('/find-ride', findRider);



module.exports = rides;
