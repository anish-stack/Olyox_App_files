const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const RiderSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    rideVehicleInfo: {
        vehicleName: {
            type: String,
            required: true
        },
        vehicleType: {
            type: String
        },
        PricePerKm: {
            type: Number
        },
        VehicleNumber: {
            type: String,
            required: true,
        },
        VehicleImage: [String]

    },
    isDocumentUpload: {
        type: Boolean,
        default: false
    },
    TotalRides: {
        type: Number,
        default: 0
    },
    rides: [{
        type: Schema.Types.ObjectId,
        ref: 'RideRequest'
    }],
    Ratings: {
        type: Number,
        default: 0

    },
    documents: {
        license: {
            type: String,

        },
        rc: {
            type: String,
        },
        insurance: {
            type: String,
        }

    },
    Bh: {
        type: String
    },
    DocumentVerify: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isFreeMember: {
        type: Boolean,
        default: false
    },
    amountPaid: {
        type: Number,
        default: 0
    },
    trn_no: {
        type: String
    },
    payment_status: {
        type: String
    },
    payment_date: {
        type: Date
    },
    her_referenced: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ParcelBikeRegister'
    }],
    isOtpBlock: {
        type: Boolean,
        default: false
    },
    howManyTimesHitResend: {
        type: Number,
        default: 0
    },
    otpUnblockAfterThisTime: {
        type: Date,

    },
    isOtpVerify: {
        type: Boolean,
        default: false
    },
    otp: {
        type: String
    },
    phone: {
        type: String,
        required: true
    },
    address: {
        type: String,
        // required: true
    },
    isAvailable: {
        type: Boolean,
        default: false
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            // required: true
        },
        coordinates: {
            type: [Number],
            // required: true
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    BH: {
        type: String
    },
    YourQrCodeToMakeOnline: {
        type: String,
        default: null

    }
});

RiderSchema.index({ location: '2dsphere' });
RiderSchema.index({ 'rideVehicleInfo.VehicleNumber': 1 });

module.exports = mongoose.model('Rider', RiderSchema);
