const express = require('express');

const upload = require('../../middleware/multerV2');
const { createVehicle, getAllVehicles, getVehicle, updateVehicle, deleteVehicle, getcategoryIdVehicles } = require('../../Heavy_vehicle_Controllers/Vehicle_types/VehicleTypes');
const Protect = require('../../middleware/Auth');
const { createCategory, getAllCategories, getCategory, updateCategory, deleteCategory, toggleStatus } = require('../../Heavy_vehicle_Controllers/Vehicle_types/HeavyVehicleCategory');
const { create_heavy_vehicle_partner, verifyOTP, resendOTP, updateProfile, uploadDocuments, getMyProfile, getAllProfiles, getPartnerById, delete_account, login, updateServiceAreaOnly } = require('../../Heavy_vehicle_Controllers/vehicle_partners/Auth.Partners');
const HeveyPartnerProtect = require('../../middleware/HeavyPartnerAuth');

const Heavy = express.Router();

// heavy-category //
Heavy.post('/heavy-category', createCategory);
Heavy.get('/heavy-category', getAllCategories);
Heavy.get('/heavy-category/:id', getCategory);
Heavy.put('/heavy-category/:id', updateCategory);
Heavy.delete('/heavy-category/:id', deleteCategory);
Heavy.patch('/heavy-category/:id/toggle-status', toggleStatus);


// heavy-vehicle //
Heavy.post('/heavy-vehicle', createVehicle);
Heavy.get('/heavy-vehicle', getAllVehicles);
Heavy.get('/heavy-vehicle/category', getcategoryIdVehicles);
Heavy.get('/heavy-vehicle/:id', getVehicle);
Heavy.put('/heavy-vehicle/:id', updateVehicle);
Heavy.delete('/heavy-vehicle/:id', deleteVehicle);

// heavy-vehicle-auth //

Heavy.post('/heavy-vehicle-login', login);
Heavy.post('/heavy-vehicle-register', create_heavy_vehicle_partner);
Heavy.post('/heavy-vehicle-verify-otp', verifyOTP);
Heavy.post('/heavy-vehicle-resend-otp', resendOTP);
Heavy.put('/heavy-vehicle-profile-update/:id', HeveyPartnerProtect, updateProfile);
Heavy.post('/heavy-vehicle-services-area/:id', HeveyPartnerProtect, updateServiceAreaOnly);
Heavy.post('/heavy-vehicle-profile-document/:id', upload.single('image'), HeveyPartnerProtect, uploadDocuments);
Heavy.get('/heavy-vehicle-profile', HeveyPartnerProtect, getMyProfile);
Heavy.get('/heavy-vehicle-all-profile', getAllProfiles);
Heavy.get('/heavy-vehicle-profile/:id', getPartnerById);
Heavy.delete('/heavy-vehicle-profile-delete/:id', HeveyPartnerProtect, delete_account);

Heavy.get('/get_all_hv_vendor', getAllHeavyVehicles);
Heavy.put('/update_hv_vendor_is_block_status/:id', updateIsBlockedHeavyVehicle);


module.exports = Heavy;
