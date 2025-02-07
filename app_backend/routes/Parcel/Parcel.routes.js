const express = require('express');
const multer = require('multer');
const Protect = require('../../middleware/Auth');
const { register_parcel_partner, login, verifyOtp, resendOtp, details, partner_work_status, manage_offline_online } = require('../../Parcel Controller/Register_Partner');
const { request_of_parcel } = require('../../Parcel Controller/Order.Parcel');

const parcel = express.Router();

// Multer setup
const storage = multer.memoryStorage()

const upload = multer({ storage: storage });

parcel.post('/register_parcel_partner', upload.array('images'), register_parcel_partner)
parcel.post('/login_parcel_partner', login)
parcel.post('/login_parcel_otp_verify', verifyOtp)
parcel.post('/login_parcel_otp_resend', resendOtp)
parcel.get('/user-details', Protect,details)
parcel.post('/manage_offline_online', Protect,manage_offline_online)
parcel.get('/partner_work_status_details', Protect,partner_work_status)

parcel.post('/request_of_parcel', Protect,request_of_parcel)




module.exports = parcel
