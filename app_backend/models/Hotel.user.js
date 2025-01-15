const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const HotelUserSchema = new Schema({
    hotel_name: {
        type: String,
        required: true,
    },
    hotel_zone: {
        type: String,
        required: true,
       
    },
    hotel_address: {
        type: String,
        required: true,
    },
    hotel_owner: {
        type: String,
    },
    hotel_phone: {
        type: String,
        required: true,
    },
    amenities: {
        AC: { type: Boolean, default: false },
        freeWifi: { type: Boolean, default: false },
        kitchen: { type: Boolean, default: false },
        TV: { type: Boolean, default: false },
        powerBackup: { type: Boolean, default: false },
        geyser: { type: Boolean, default: false },
        parkingFacility: { type: Boolean, default: false },
        elevator: { type: Boolean, default: false },
        cctvCameras: { type: Boolean, default: false },
        diningArea: { type: Boolean, default: false },
        privateEntrance: { type: Boolean, default: false },
        reception: { type: Boolean, default: false },
        caretaker: { type: Boolean, default: false },
        security: { type: Boolean, default: false },
        checkIn24_7: { type: Boolean, default: false },
        dailyHousekeeping: { type: Boolean, default: false },
        fireExtinguisher: { type: Boolean, default: false },
        firstAidKit: { type: Boolean, default: false },
        buzzerDoorBell: { type: Boolean, default: false },
        attachedBathroom: { type: Boolean, default: false },
    },
    hotel_main_show_image:{
        type: String,
        default:'https://content.jdmagicbox.com/v2/comp/delhi/t6/011pxx11.xx11.190201182203.t1t6/catalogue/hotel-la-pitampura-delhi-hotels-h7zomvqdiy-250.jpg'
    },
    area: {
        type: String,
    },
    hotel_geo_location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true,
        },
        coordinates: {
            type: [Number],
            required: true,
        },
    },
    property_pdf: {
        type: String,
    },
    Documents: [{
        d_type: {
            type: String
        },
        d_url: {
            type: String

        },
        d_public_id: {
            type: String
        }
    }]
});

HotelUserSchema.index({ hotel_geo_location: '2dsphere' });

module.exports = mongoose.model('HotelUser', HotelUserSchema);
