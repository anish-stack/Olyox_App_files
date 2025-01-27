const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const RestaurantPackageSchema = new Schema({
    package_validity: {
        type: String,
        required: true
    },
    package_meals: {
        type: String,
        required: true,
        enum: ['Break-Fast', 'Lunch', 'Dinner']
    },
    package_lunch_includes: [String],
    package_break_fast_includes: [String],
    package_dinner_includes: [String],
    package_price:{
        type: Number,
        required: true
    },
    package_discount:{
        type: Number,
        required: true
    },
    package_description:{
        type: String,
    },
    package_available:{
        type:Boolean,
        default: true
    },
        restaurant_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Restaurant',
        }

},{
    timestamps: true
});

module.exports = mongoose.model('RestaurantPackage', RestaurantPackageSchema);