const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
    restaurant_name: {
        type: String,
        required: true,
        trim: true
    },
    restaurant_address: {
        street: String,
        city: String,
        state: String,
        zip: String
    },
    geo_location: {
        type: {
            type: String, 
            enum: ['Point'], 
            required: true
        },
        coordinates: {
            type: [Number], 
            required: true
        }
    },
    restaurant_phone: {
        type: String,
        required: true
    },
    openingHours: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        default: 0
    },
    logo: {
        url: {
            type: String
        },
        secret_id: {
            type: String
        }
    },
    restaurant_category: {
        type: String,
        default: 'Veg',
        enum: ['Veg', 'Non-Veg', 'Veg-Non-Veg']
    },
    restaurant_fssai: {
        type: String,
        required: true
    },
    status: {
        type: Boolean,
        default: false
    },
    restaurant_BHID: {
        type: String,
        required: true
    },
    restaurant_in_top_list: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

restaurantSchema.index({ geo_location: '2dsphere' });

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

module.exports = Restaurant;
