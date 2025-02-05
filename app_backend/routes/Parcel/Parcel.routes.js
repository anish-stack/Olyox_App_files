const express = require('express');
const multer = require('multer');
const Protect = require('../../middleware/Auth');
const { register_parcel_partner, login, verifyOtp, resendOtp, details } = require('../../Parcel Controller/Register_Partner');

const parcel = express.Router();

// Multer setup
const storage = multer.memoryStorage()

const upload = multer({ storage: storage });

parcel.post('/register_parcel_partner', upload.array('images'), register_parcel_partner)
parcel.post('/login_parcel_partner', login)
parcel.post('/login_parcel_otp_verify', verifyOtp)
parcel.post('/login_parcel_otp_resend', resendOtp)
parcel.get('/user-details', Protect,details)




module.exports = parcel
