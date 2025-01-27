const Restaurant = require('../models/Tiifins/Resturant_register.model');
const Restaurant_Listing = require('../models/Tiifins/Restaurant.listing.model');
const axios = require('axios');
const uploadFile = require('../utils/aws.uploader');
const { faker } = require('@faker-js/faker');
const { v4: uuidv4 } = require('uuid');
exports.register_restaurant = async (req, res) => {
    try {

        const {
            restaurant_BHID,
            restaurant_fssai,
            restaurant_category,
            openingHours,
            restaurant_phone,
            restaurant_address,
            geo_location,
            restaurant_name
        } = req.body;


        if (!restaurant_BHID || !restaurant_fssai || !restaurant_category || !openingHours ||
            !restaurant_phone || !restaurant_address || !restaurant_name) {
            return res.status(400).json({ success: false, message: "Please fill all required fields." });
        }
        let logo = req.file || {}
        if (!logo) {
            logo = `https://ui-avatars.com/api/?name=${restaurant_name}`
        }

        const validCategories = ['Veg', 'Non-Veg', 'Veg-Non-Veg'];
        if (!validCategories.includes(restaurant_category)) {
            return res.status(400).json({ success: false, message: "Invalid restaurant category. Choose from 'Veg', 'Non-Veg', or 'Veg-Non-Veg'." });
        }

        // Validate restaurant_fssai (14-digit numeric code)
        const fssaiRegex = /^[0-9]{14}$/;
        if (!fssaiRegex.test(restaurant_fssai)) {
            return res.status(400).json({ success: false, message: "Invalid FSSAI number. It must be a 14-digit numeric code." });
        }

        // Validate restaurant_BHID with Olyox API
        let restaurant;
        try {
            const { data } = await axios.post('https://api.olyox.com/api/v1/check-bh-id', {
                bh: restaurant_BHID
            });
            if (!data.data.success) {
                return res.status(403).json({
                    success: false,
                    message: "Invalid BH ID. Please register at Olyox.com before proceeding."
                });
            }
        } catch (error) {
            console.error("Olyox API Error:", error.message);
            return res.status(500).json({
                success: false,
                message: "Failed to validate BH ID. Please try again later."
            });
        }

        // Geo-location handling
        let updatedGeoLocation = geo_location;
        if (!geo_location || !geo_location.coordinates) {
            try {
                const address = `${restaurant_address.street}, ${restaurant_address.city}, ${restaurant_address.state}, ${restaurant_address.zip}`;
                const mapsApiKey = process.env.GOOGLE_MAP_KEY;
                const mapsApiUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${mapsApiKey}`;

                const { data } = await axios.get(mapsApiUrl);

                if (data.status === "OK" && data.results.length > 0) {
                    const location = data.results[0].geometry.location;
                    updatedGeoLocation = {
                        type: "Point",
                        coordinates: [location.lng, location.lat]
                    };
                } else {
                    console.warn("Google Maps API Warning: Unable to determine geo-location for the provided address.");

                    updatedGeoLocation = {
                        type: "Point",
                        coordinates: [0.0, 0.0]
                    };
                }
            } catch (error) {
                console.error("Google Maps API Error:", error.message);

                updatedGeoLocation = {
                    type: "Point",
                    coordinates: [0.0, 0.0]
                };
            }
        }

        //try to upload image 
        try {
            const mimeType = ''
            const buffer = ''
            const bucket_name = 'my-image-bucketapphotel'
            const key = ``
            const data = await uploadFile.uploadBufferImage(buffer, mimeType, bucket_name, key)
            console.log(data)
        } catch (error) {

        }

        // Create a new restaurant document
        const newRestaurant = new Restaurant({
            restaurant_BHID,
            restaurant_fssai,
            restaurant_category,
            openingHours,
            restaurant_phone,
            restaurant_address,
            geo_location: updatedGeoLocation,
            restaurant_name
        });

        // Save to database
        // await newRestaurant.save();

        return res.status(201).json({
            success: true,
            message: "Restaurant registered successfully.",
            data: newRestaurant
        });

    } catch (error) {
        console.error("Error registering restaurant:", error.message);
        return res.status(500).json({
            success: false,
            message: "An error occurred while registering the restaurant. Please try again later."
        });
    }
};


exports.register_restaurant_fake = async (req, res) => {
    try {
        // Generate fake data using Faker.js
        const fakeData = {
            restaurant_BHID: uuidv4(),
            restaurant_fssai: faker.finance.creditCardNumber(),
            restaurant_category: 'Veg',
            openingHours: `${Math.floor(Math.random() * (11 - 6 + 1)) + 6} AM - ${Math.floor(Math.random() * (11 - 6 + 1)) + 6} PM`,
            restaurant_phone: faker.phone.number(),
            restaurant_address: {
                street: faker.location.streetAddress(),
                city: faker.location.city(),
                state: faker.location.state(),
                zip: faker.location.zipCode()
            },
            geo_location: null, // To be updated later
            restaurant_name: faker.company.name()
        };

        const {
            restaurant_BHID,
            restaurant_fssai,
            restaurant_category,
            openingHours,
            restaurant_phone,
            restaurant_address,
            geo_location,
            restaurant_name
        } = fakeData;

        let logo = `https://ui-avatars.com/api/?name=${encodeURIComponent(restaurant_name)}`;

        const validCategories = ['Veg', 'Non-Veg', 'Veg-Non-Veg'];
        if (!validCategories.includes(restaurant_category)) {
            return res.status(400).json({ success: false, message: "Invalid restaurant category. Choose from 'Veg', 'Non-Veg', or 'Veg-Non-Veg'." });
        }

        // Validate restaurant_fssai (14-digit numeric code)
        // const fssaiRegex = /^[0-9]{14}$/;
        // if (!fssaiRegex.test(restaurant_fssai)) {
        //     return res.status(400).json({ success: false, message: "Invalid FSSAI number. It must be a 14-digit numeric code." });
        // }

        // Validate restaurant_BHID with Olyox API
        // try {
        //     const { data } = await axios.post('https://api.olyox.com/api/v1/check-bh-id', {
        //         bh: restaurant_BHID
        //     });
        //     if (!data.data.success) {
        //         return res.status(403).json({
        //             success: false,
        //             message: "Invalid BH ID. Please register at Olyox.com before proceeding."
        //         });
        //     }
        // } catch (error) {
        //     console.error("Olyox API Error:", error.message);
        //     return res.status(500).json({
        //         success: false,
        //         message: "Failed to validate BH ID. Please try again later."
        //     });
        // }

        // Geo-location handling
        let updatedGeoLocation = geo_location;
        if (!geo_location || !geo_location.coordinates) {
            try {
                const address = `${restaurant_address.street}, ${restaurant_address.city}, ${restaurant_address.state}, ${restaurant_address.zip}`;
                const mapsApiKey = process.env.GOOGLE_MAP_KEY;
                const mapsApiUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${mapsApiKey}`;

                const { data } = await axios.get(mapsApiUrl);

                if (data.status === "OK" && data.results.length > 0) {
                    const location = data.results[0].geometry.location;
                    updatedGeoLocation = {
                        type: "Point",
                        coordinates: [location.lng, location.lat]
                    };
                } else {
                    console.warn("Google Maps API Warning: Unable to determine geo-location for the provided address.");

                    updatedGeoLocation = {
                        type: "Point",
                        coordinates: [0.0, 0.0]
                    };
                }
            } catch (error) {
                console.error("Google Maps API Error:", error.message);

                updatedGeoLocation = {
                    type: "Point",
                    coordinates: [0.0, 0.0]
                };
            }
        }

        // Try to upload image
        try {
            const mimeType = 'image/png';
            const buffer = Buffer.from(logo, 'base64');
            const bucket_name = 'my-image-bucketapphotel';
            const key = `logos/${restaurant_BHID}.png`;

            const data = await uploadFile.uploadBufferImage(buffer, mimeType, bucket_name, key);
            console.log("Uploaded image data:", data);
        } catch (error) {
            console.error("Image Upload Error:", error.message);
        }

        // Create a new restaurant document
        const newRestaurant = new Restaurant({
            restaurant_BHID,
            restaurant_fssai,
            restaurant_category,
            openingHours,
            restaurant_phone,
            restaurant_address,
            geo_location: updatedGeoLocation,
            restaurant_name
        });

        // Save to database
        await newRestaurant.save();

        return res.status(201).json({
            success: true,
            message: "Restaurant registered successfully with fake data.",
            data: newRestaurant
        });

    } catch (error) {
        console.error("Error registering restaurant:", error.message);
        return res.status(500).json({
            success: false,
            message: "An error occurred while registering the restaurant. Please try again later."
        });
    }
};


exports.add_food_listing = async (req, res) => {
    try {
        const restaurant_id = req.user.id

        const { food_name, description, food_price, food_category, food_availability, what_includes, imageUrl } = req.body;

        // Handle images object
        const images = {
            url: req.body.imageUrl || 'https://placehold.co/600x400',
        };

        // Construct the food listing object
        const newFoodListing = {
            restaurant_id,
            food_name: food_name || faker.food.dish(),
            description: description || faker.lorem.sentences(2),
            food_price: food_price || faker.number.float({ min: 249, max: 999, precision: 0.01 }),
            food_category: food_category || faker.helpers.arrayElement(['Veg', 'Non Veg', 'Lunch', 'Breakfast', 'Dinner']),
            food_availability: food_availability !== undefined ? food_availability : faker.datatype.boolean(),
            what_includes: what_includes || faker.lorem.words(5),
            images,
        };

        console.log("Food Listing to be Saved:", newFoodListing);
        await Restaurant_Listing.create(newFoodListing)

        return res.status(201).json({
            success: true,
            message: "Food listing added successfully.",
            data: newFoodListing,
        });
    } catch (error) {
        console.error("Error adding food listing:", error.message);
        return res.status(500).json({
            success: false,
            message: "An error occurred while adding the food listing.",
        });
    }
};




