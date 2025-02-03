const Restaurant = require("../models/Tiifins/Resturant_register.model");
const Restaurant_Listing = require("../models/Tiifins/Restaurant.listing.model");
const mongoose = require('mongoose')
exports.find_Restaurant = async (req, res) => {
    try {
        const { restaurant_category, status, restaurant_in_top_list } = req.query;

        // Initialize the query object
        let query = {};

        // Add filters dynamically based on the query parameters
        if (restaurant_category) {
            query.restaurant_category = restaurant_category;
        }
        if (status) {
            query.status = status;
        }
        if (restaurant_in_top_list) {
            query.restaurant_in_top_list = restaurant_in_top_list;
        }

        // Fetch data from the database based on the query
        const restaurants = await Restaurant.find(query);

        // Respond with the fetched data
        return res.status(200).json({
            success: true,
            count: restaurants.length,
            message: "Restaurants fetched successfully.",
            data: restaurants,
        });
    } catch (error) {
        console.error("Error fetching restaurants:", error.message);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching the restaurants.",
        });
    }
};


exports.find_Restaurant_foods = async (req, res) => {
    try {
        const { food_category, food_availability, restaurant_id } = req.query;

        // Initialize the query object
        let query = {};

        // Add filters dynamically based on the query parameters
        if (food_category) {
            query.food_category = food_category;
        }
        if (food_availability) {
            query.food_availability = food_availability;
        }
        if (restaurant_id) {
            query.restaurant_id = restaurant_id;
        }

        // Fetch data from the database based on the query
        const restaurants_foods = await Restaurant_Listing.find(query).populate('restaurant_id');

        // Respond with the fetched data
        return res.status(200).json({
            success: true,
            count: restaurants_foods.length,
            message: "Restaurants foods fetched successfully.",
            data: restaurants_foods,
        });
    } catch (error) {
        console.error("Error fetching restaurants foods:", error.message);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching the restaurants foods.",
        });
    }
};


exports.find_Restaurant_And_Her_foods = async (req, res) => {
    try {
        const { restaurant_id } = req.query;
        console.log(restaurant_id)
        // Validate the restaurant_id
        if (!restaurant_id || !mongoose.Types.ObjectId.isValid(restaurant_id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid or missing restaurant ID.",
            });
        }

        const id = new mongoose.Types.ObjectId(restaurant_id);

        // Fetch restaurant details
        const find_Restaurant = await Restaurant.findById(id);
        if (!find_Restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found.",
            });
        }

        // Fetch restaurant foods
        const restaurants_foods = await Restaurant_Listing.find({ restaurant_id }).populate('restaurant_id');

        return res.status(200).json({
            success: true,
            count: restaurants_foods.length,
            message: restaurants_foods.length ? "Restaurant foods fetched successfully." : "No foods found for the given restaurant.",
            details: find_Restaurant,
            food: restaurants_foods,
        });
    } catch (error) {
        console.error("Error fetching restaurants and foods:", error.message);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching the restaurant's foods. Please try again later.",
            error: error.message,
        });
    }
};
