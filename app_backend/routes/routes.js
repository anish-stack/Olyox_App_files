const express = require('express');
const { registerRider, getAllRiders, changeLocation, login, resendOtp, verifyOtp, uploadDocuments, details, getMyAllDetails, getMyAllRides, toggleWorkStatusOfRider, verifyDocument, uploadPaymentQr, getMySessionsByUserId, riderDocumentsVerify, updateBlockStatus, getSingleRider, updateRiderDetails, updateRiderDocumentVerify, logoutRider, deleteRider } = require('../controllers/rider.controller');
const { calculateRidePriceForUser } = require('../controllers/ride.request');

const router = express.Router();

const multer = require('multer');
const Protect = require('../middleware/Auth');
const { findAllOrders, logout } = require('../user_controller/user.register.controller');
const { make_recharge, verify_recharge } = require('../PaymentWithWebDb/razarpay');

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
router.get('/rider-logout/:rider_id', logoutRider);
router.post('/rider-upload', Protect, upload.any(), uploadDocuments);
router.post('/rider-uploadPaymentQr', Protect, upload.single('image'), uploadPaymentQr)
router.get('/user-details', Protect, details);
router.put('/updateRiderBlock/:id', updateBlockStatus)

router.get('/getMyAllDetails', Protect, getMyAllDetails);
router.get('/getMyAllRides', Protect, getMyAllRides);
router.post('/toggleWorkStatusOfRider', Protect, toggleWorkStatusOfRider);
router.get('/getMySessionsByUserId', getMySessionsByUserId);
router.put('/rider_document_verify/:id', riderDocumentsVerify)

router.get('/', getAllRiders);

router.put('/:riderId/location', changeLocation);

router.post('/get-fare-info', calculateRidePriceForUser)
router.get('/do-verify', verifyDocument)

router.put('/updateRiderBlock/:id', updateBlockStatus)
router.get('/get_single_rider/:id', getSingleRider);
router.put('/update_rider_detail/:id', upload.any(), updateRiderDetails)

// universal logout
router.get('/logout', logout)

router.get('/recharge-wallet/:package_id/:user_id', make_recharge)
router.post('/recharge-verify/:BHID', verify_recharge)

router.put('/update_rider_document_verify/:id', updateRiderDocumentVerify);

router.delete('/delete_rider_vendor/:id',deleteRider)
module.exports = router;
