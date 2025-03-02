const express = require('express');
const multer = require('multer');

const { create_onboarding_slide, get_onboarding_slides, update_onboarding_slide, delete_onboarding_slide, get_onboarding_slide_by_id } = require('../../Admin Controllers/OnboardFnc/Onboard.Controller');
const { createSuggestion, getAllSuggestions, getSuggestionById, updateSuggestion, deleteSuggestion, updateStatus } = require('../../Admin Controllers/RideControllers/Rides_Controoler');
const { createSetting, getSetting, updateSetting } = require('../../Admin Controllers/settings/Settings');

const admin = express.Router();

// Multer storage configuration for handling in-memory uploads
const storage = multer.memoryStorage({});
const upload = multer({ storage: storage });

admin.post('/create_onboarding_slide', upload.single('image'), create_onboarding_slide)
admin.get('/get_onboarding_slides', get_onboarding_slides)
admin.get('/get_single_onboarding_slides/:id', get_onboarding_slide_by_id)
admin.put('/update_onboarding_slide/:id', upload.single('image'), update_onboarding_slide)
admin.delete('/delete_onboarding_slide/:id', delete_onboarding_slide)

//settings
admin.post('/createSetting', createSetting)
admin.get('/get_Setting', getSetting)
admin.post('/updateSetting', updateSetting)



admin.post('/createSuggestion', createSuggestion);
admin.get('/getAllSuggestions', getAllSuggestions);
admin.get('/getSuggestionById/:id', getSuggestionById);
admin.put('/updateSuggestion/update/:id', updateSuggestion);
admin.put('/updateSuggestionStatus/:id', updateStatus);
admin.delete('/deleteSuggestion/delete/:id', deleteSuggestion);

module.exports = admin;
