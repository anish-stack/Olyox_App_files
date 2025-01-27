const Restaurant = require("../models/Tiifins/Resturant_register.model");
const Restaurant_Listing = require("../models/Tiifins/Restaurant.listing.model");

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

        // Validate the restaurant_id
        if (!restaurant_id) {
            return res.status(400).json({
                success: false,
                message: "Restaurant ID is required.",
            });
        }

        // Fetch restaurant details
        const find_Restaurant = await Restaurant.findById(restaurant_id);
        if (!find_Restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found.",
            });
        }

        // Fetch restaurant foods
        const restaurants_foods = await Restaurant_Listing.find({ restaurant_id }).populate('restaurant_id');
        if (!restaurants_foods || restaurants_foods.length === 0) {
            // Fallback for no food items found
            return res.status(404).json({
                success: true,
                count: 0,
                message: "No foods found for the given restaurant.",
                details: find_Restaurant,
                food: [],
            });
        }

        // Respond with the fetched data
        return res.status(200).json({
            success: true,
            count: restaurants_foods.length,
            message: "Restaurant foods fetched successfully.",
            details: find_Restaurant,
            food: restaurants_foods,
        });
    } catch (error) {
        console.error("Error fetching restaurants and foods:", error.message);

        // Generic fallback for server errors
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching the restaurant's foods. Please try again later.",
            error: error.message,
        });
    }
};
