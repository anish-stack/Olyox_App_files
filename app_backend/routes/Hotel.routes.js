const express = require('express');
const { register_hotel_user, add_hotel_listing, getHotelsNearByMe, getHotelsDetails, getHotelsListingDetails, verifyOtp, resendOtp, find_Hotel_Login, toggleHotelStatus, LoginHotel } = require('../hotel_controllers/hotel.user.controller');
const Protect = require('../middleware/Auth');
const upload = require('../middleware/multer');
const hotel_router = express.Router()

hotel_router.post('/register-hotel', register_hotel_user)
hotel_router.post('/verify-otp', verifyOtp)
hotel_router.post('/resend-otp', resendOtp)
hotel_router.get('/find-Me-Hotel', Protect, find_Hotel_Login)
hotel_router.post('/toggle-hotel', Protect, toggleHotelStatus)
hotel_router.post('/Login-Hotel', LoginHotel)


hotel_router.post('/add-hotel-listing', upload.fields([
    { name: 'main_image', maxCount: 1 },
    { name: 'second_image', maxCount: 1 },
    { name: 'third_image', maxCount: 1 },
    { name: 'fourth_image', maxCount: 1 },
    { name: 'fifth_image', maxCount: 1 }
]),Protect, add_hotel_listing);
hotel_router.get('/find-near-by-hotels', getHotelsNearByMe)
hotel_router.get('/find-hotel-details/:params', getHotelsDetails)
hotel_router.get('/hotel-details/:hotelId', getHotelsListingDetails)




module.exports = hotel_router;
