const express = require('express');
const multer = require('multer');

const {
    create_onboarding_slide,
    get_onboarding_slides,
    update_onboarding_slide,
    delete_onboarding_slide,
    get_onboarding_slide_by_id
} = require('../../Admin Controllers/OnboardFnc/Onboard.Controller');

const {
    createSuggestion,
    getAllSuggestions,
    getSuggestionById,
    updateSuggestion,
    deleteSuggestion,
    updateStatus
} = require('../../Admin Controllers/RideControllers/Rides_Controoler');

const {
    createSetting,
    getSetting,
    updateSetting
} = require('../../Admin Controllers/settings/Settings');

const {
    createCancelReason,
    updateCancelReason,
    getAllCancelReasons,
    getSingleCancelReason,
    deleteCancelReason,
    toggleCancelReason,
    getAllCancelReasonsAdmin
} = require('../../Admin Controllers/settings/cancelReason');

const {
    createHeavyOption,
    getAllHeavyTransports,
    getHeavyTransportById,
    updateHeavyTransport,
    toggleActiveStatus,
    deleteHeavyTransport
} = require('../../Admin Controllers/settings/HeavyTransport');
const { createCoupon, getAllCoupons, getCouponById, updateCoupon, deleteCoupon, updateIsActiveStatus } = require('../../Admin Controllers/Coupon.Controller');
const {
    create_home_slide,
    get_home_slides,
    get_Home_slide_by_id,
    update_homeslide_slide,
    delete_homeslide_slide
} = require('../../Admin Controllers/OnboardFnc/HomeScreenSlide');
const { markPaid } = require('../../controllers/rider.controller');
const { createNotification, getNotifications, getNotificationById, markAsRead, deleteNotification } = require('../../Admin Controllers/settings/notificationController');

const admin = express.Router();

// Multer storage configuration for handling in-memory uploads
const storage = multer.memoryStorage({});
const upload = multer({ storage: storage });

// Onboarding Slides
admin.post('/create_onboarding_slide', upload.single('image'), create_onboarding_slide);
admin.get('/get_onboarding_slides', get_onboarding_slides);
admin.get('/get_single_onboarding_slides/:id', get_onboarding_slide_by_id);
admin.put('/update_onboarding_slide/:id', upload.single('image'), update_onboarding_slide);
admin.delete('/delete_onboarding_slide/:id', delete_onboarding_slide);

// Settings
admin.post('/createSetting', createSetting);
admin.get('/get_Setting', getSetting);
admin.post('/updateSetting', updateSetting);

// Cancel Reason Settings
admin.post('/cancel-reasons', createCancelReason);
admin.get('/get-All-Cancel-Reasons-Admin', getAllCancelReasonsAdmin);
admin.put('/cancel-reasons/:id', updateCancelReason);
admin.get('/cancel-reasons', getAllCancelReasons);
admin.get('/cancel-reasons/:id', getSingleCancelReason);
admin.delete('/cancel-reasons/:id', deleteCancelReason);
admin.put('/toggle-cancel-reasons/:id', toggleCancelReason);

// Admin Heavy Vehicle Settings
admin.post('/create-heavy', upload.single('image'), createHeavyOption);
admin.put('/update-heavy/:id', upload.single('image'), updateHeavyTransport);
admin.get('/get-heavy', getAllHeavyTransports);
admin.get('/get-single-heavy/:id', getHeavyTransportById);
admin.delete('/delete-heavy/:id', deleteHeavyTransport);
admin.post('/toggle-status-heavy/:id', toggleActiveStatus);

// Suggestions
admin.post('/createSuggestion', createSuggestion);
admin.get('/getAllSuggestions', getAllSuggestions);
admin.get('/getSuggestionById/:id', getSuggestionById);
admin.put('/updateSuggestion/update/:id', updateSuggestion);
admin.put('/updateSuggestionStatus/:id', updateStatus);
admin.delete('/deleteSuggestion/delete/:id', deleteSuggestion);

// Home Screen Slides
admin.post('/create_home_slide', upload.single('image'), create_home_slide);
admin.get('/get_home_slides', get_home_slides);
admin.get('/get_single_home_slides/:id', get_Home_slide_by_id);
admin.put('/update_home_slide/:id', upload.single('image'), update_homeslide_slide);
admin.delete('/delete_home_slide/:id', delete_homeslide_slide);

//mark paid
admin.post('/mark-paid', markPaid);

//notification
admin.post("/create-notification",createNotification);
admin.get("/all-notification",getNotifications);
admin.get("/notification/:id",getNotificationById);
admin.put("/mark-read-notification/:id",markAsRead);
admin.delete("/delete-notification/:id",deleteNotification);


// Coupon routes here 

admin.post('/createCoupon', createCoupon);
admin.get('/all_getCoupon', getAllCoupons);
admin.get('/getSingleCoupon/:id', getCouponById);
admin.put('/updateCoupon/:id', updateCoupon);
admin.delete('/deleteCoupon/:id', deleteCoupon);
admin.put('/updateCouponStatus/:id', updateIsActiveStatus);

module.exports = admin;
