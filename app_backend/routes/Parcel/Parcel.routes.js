const express = require('express');
const multer = require('multer');
const Protect = require('../../middleware/Auth');
const { register_parcel_partner, login, verifyOtp, resendOtp, details, partner_work_status, manage_offline_online, uploadDocuments, getAllParcelUser, getSingleParcelUser, updateParcelIsBlockStatus, ParcelDocumentVerify, updateParcelDetail } = require('../../Parcel Controller/Register_Partner');
const { request_of_parcel, my_parcel, single_my_parcel, my_parcel_driver, single_my_parcels, get_all_parcel } = require('../../Parcel Controller/Order.Parcel');
const { createVehicleForParcel, getAllVehicles, getVehicleById, updateVehicle, deleteVehicle } = require('../../Parcel Controller/VehicleParcel');
const { create_Coupons, getAll_Coupons, getOne_Coupon, update_Coupon, delete_Coupon } = require('../../Parcel Controller/ParcelCoupons');
const { NewBooking } = require('../../Parcel Controller/NewOrderParcel');

const parcel = express.Router();
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });


parcel.post('/register_parcel_partner', register_parcel_partner)
parcel.post('/login_parcel_partner', login)
parcel.post('/login_parcel_otp_verify', verifyOtp)
parcel.post('/login_parcel_otp_resend', resendOtp)
parcel.get('/user-details', Protect, details)
parcel.post('/uploadDocuments', Protect, upload.any(), uploadDocuments)
// parcel.post('/uploadPaymentQr', Protect, upload.single('image'), uploadPaymentQr)
parcel.get('/my_parcel_user-details', Protect, my_parcel)
parcel.get('/single_my_parcel', single_my_parcels)
parcel.get('/single_my_parcel_user-details', Protect, single_my_parcel)
parcel.get('/my_parcel_driver-details', Protect, my_parcel_driver)
parcel.post('/manage_offline_online', Protect, manage_offline_online)
parcel.get('/partner_work_status_details', Protect, partner_work_status)
parcel.get('/get_parcel_order', get_all_parcel)
parcel.post('/request_of_parcel', Protect, request_of_parcel)


parcel.get('/get_all_parcel_user', getAllParcelUser)
parcel.get('/get_single_parcel/:id', getSingleParcelUser)
parcel.put('/update_parcel_is_block_status/:id', updateParcelIsBlockStatus)
parcel.put('/update_parcel_document_verify/:id', ParcelDocumentVerify)
parcel.put('/update_parcel_data/:id', upload.any(), updateParcelDetail)



// New Routes Dont check above routes


parcel.post('/create-parcel', upload.single('image'), createVehicleForParcel);
parcel.get('/all-parcel', getAllVehicles);
parcel.get('/single-parcel/:id', getVehicleById);
parcel.put('/update-parcel/:id', upload.single('image'), updateVehicle);
parcel.delete('/delete-parcel/:id', deleteVehicle);


parcel.post('/parcel-coupon',create_Coupons);      
parcel.get('/parcel-coupon',getAll_Coupons);          
parcel.get('/parcel-coupon/:id',getOne_Coupon);       
parcel.put('/parcel-coupon/:id',update_Coupon);      
parcel.delete('/parcel-coupon/:id',delete_Coupon);   

//Booking parcels 

parcel.post('/book-parcel',NewBooking);   




module.exports = parcel
