const express = require('express');
const { register_hotel_user, add_hotel_listing, getHotelsNearByMe, getHotelsDetails, getHotelsListingDetails } = require('../hotel_controllers/hotel.user.controller');
const hotel_router = express.Router()

hotel_router.post('/register-hotel',register_hotel_user)
hotel_router.post('/hotel-listing',add_hotel_listing)
hotel_router.get('/find-near-by-hotels',getHotelsNearByMe)
hotel_router.get('/find-hotel-details/:params',getHotelsDetails)
hotel_router.get('/hotel-details/:hotelId',getHotelsListingDetails)




module.exports = hotel_router;
