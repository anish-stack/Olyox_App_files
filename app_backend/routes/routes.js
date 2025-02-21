const express = require('express');
const { registerRider, getAllRiders, changeLocation, login, resendOtp, verifyOtp, uploadDocuments, details, getMyAllDetails, getMyAllRides, toggleWorkStatusOfRider, verifyDocument, uploadPaymentQr } = require('../controllers/rider.controller');
const { calculateRidePriceForUser } = require('../controllers/ride.request');

const router = express.Router();

const multer = require('multer');
const Protect = require('../middleware/Auth');
const { findAllOrders } = require('../user_controller/user.register.controller');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });



router.post('/register', registerRider);
router.post('/rider-verify', verifyOtp);
router.post('/rider-resend', resendOtp);
router.post('/rider-login', login);
router.post('/rider-upload', Protect, upload.any(), uploadDocuments);
router.post('/rider-uploadPaymentQr', Protect, upload.single('image'), uploadPaymentQr)
router.get('/user-details', Protect, details);

router.get('/getMyAllDetails', Protect, getMyAllDetails);
router.get('/getMyAllRides', Protect, getMyAllRides);
router.post('/toggleWorkStatusOfRider', Protect, toggleWorkStatusOfRider);

router.get('/', getAllRiders);

router.put('/:riderId/location', changeLocation);

router.post('/get-fare-info', calculateRidePriceForUser)
router.get('/do-verify', verifyDocument)

module.exports = router;
