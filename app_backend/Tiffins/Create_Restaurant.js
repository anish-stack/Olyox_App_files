const Restaurant = require('../models/Tiifins/Resturant_register.model');
const Restaurant_Listing = require('../models/Tiifins/Restaurant.listing.model');
const axios = require('axios');
const uploadFile = require('../utils/aws.uploader');
const { faker } = require('@faker-js/faker');
const { v4: uuidv4 } = require('uuid');
const sendToken = require('../utils/SendToken');
const SendWhatsAppMessage = require('../utils/whatsapp_send');
const bcrypt = require('bcrypt');
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

exports.updateResturant = async (req, res) => {
    try {
        const { id } = req.params;
        const { restaurant_name, restaurant_address, geo_location, restaurant_phone, openingHours, restaurant_contact, restaurant_category, restaurant_fssai, } = req.body;
        const resturant = await Restaurant.findById(id);
        if (!resturant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found"
            });
        }
        // Update restaurant document
        resturant.restaurant_name = restaurant_name;
        resturant.restaurant_address = restaurant_address;
        resturant.geo_location = geo_location;
        resturant.restaurant_phone = restaurant_phone;
        resturant.openingHours = openingHours;
        resturant.restaurant_contact = restaurant_contact;
        resturant.restaurant_category = restaurant_category;
        resturant.restaurant_fssai = restaurant_fssai;
        await resturant.save();
        return res.status(200).json({
            success: true,
            message: "Restaurant updated successfully"
        });
    } catch (error) {
        console.log("Internal server error", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        })
    }
}

exports.updateIsWorking = async (req, res) => {
    try {
        const { id } = req.params;
        const { isWorking } = req.body;
        const restaurant = await Restaurant.findById(id);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found"
            })
        }
        restaurant.isWorking = isWorking;
        await restaurant.save();
        return res.status(200).json({
            success: true,
            message: "Restaurant isWorking updated successfully"
        })
    } catch (error) {
        console.log("Internal server error", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        })
    }
}

exports.get_All_tiffin_id = async (req, res) => {
    try {
        const all_tiffin_id = await Restaurant.find();
        res.status(200).json({ success: true, data: all_tiffin_id });
    } catch (error) {
        console.error("Error getting all tiffin IDs:", error.message);
    }
}
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
        // const restaurant_id = req.user.id
        console.log("req", req.body)

        const { food_name, description, food_price, food_category, food_availability, what_includes, imageUrl, restaurant_id } = req.body;
        const emptyField = [];
        if (!food_name) emptyField.push('Food Name')
        if (!description) emptyField.push('Description')
        if (!food_price) emptyField.push('Food Price')
        if (!food_category) emptyField.push('Food Category')
        if (!food_availability) emptyField.push('Food Availability')
        if (!what_includes) emptyField.push('What includes')
        if (!restaurant_id) emptyField.push('resturant id')
        if (emptyField.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Please fill in the following field(s): ${emptyField.join(", ")}`
            });
        }

        // Handle images object
        const images = {
            url: req.body.imageUrl || 'https://placehold.co/600x400',
        };

        // Construct the food listing object
        const newFoodListing = {
            restaurant_id,
            food_name: food_name,
            description: description,
            food_price: food_price,
            food_category: food_category,
            food_availability: food_availability,
            what_includes: what_includes,
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

exports.update_available_status = async (req, res) => {
    try {
        const { id } = req.params;
        const { food_availability } = req.body;
        const updatedFoodListing = await Restaurant_Listing.findById(id);
        if (!updatedFoodListing) {
            return res.status(400).json({
                success: false,
                message: 'Food listing not found',
            })
        }
        updatedFoodListing.food_availability = food_availability;
        await updatedFoodListing.save();
        res.status(200).json({
            success: true,
            message: "Food listing updated successfully.",
            data: updatedFoodListing
        })
    } catch (error) {
        console.log("Internal server error", error)
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            message: error.message
        })
    }
}

exports.get_all_listing = async (req, res) => {
    try {
        const listings = await Restaurant_Listing.find();
        if (!listings) {
            return res.status(400).json({
                success: false,
                message: 'No listing found',
                error: 'No listing found'
            })
        }
        return res.status(200).json({
            success: true,
            message: "Listings retrieved successfully.",
            data: listings
        });
    } catch (error) {
        console.log("Internal server error")
        res.status(500).json({
            success: false,
            message: 'Internal server error in creating custom tiffine',
            error: error.message
        })
    }
}

exports.delete_food_listing = async (req, res) => {
    try {
        const { id } = req.params;
        const listing = await Restaurant_Listing.findByIdAndDelete(id);
        if (!listing) {
            return res.status(404).json({
                success: false,
                message: "Listing not found",
                error: "Listing not found"
            })
        }
        return res.status(200).json({
            success: true,
            message: "Listing deleted successfully",
        })
    } catch (error) {
        console.log("Internal server error", error)
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        })
    }
}

exports.login = async (req, res) => {
    try {
        const { restaurant_BHID } = req.body;

        if (!restaurant_BHID) {
            return res.status(400).json({
                success: false,
                message: "Restaurant BHID is required to login",
                error: "Restaurant BHID is required to login"
            });
        }

        const restaurant = await Restaurant.findOne({ restaurant_BHID });

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
                error: "Restaurant not found"
            });
        }

        // Generate a 4-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000);
        const otpExpiry = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes expiry

        restaurant.otp = otp;
        restaurant.otpExpiry = otpExpiry;
        await restaurant.save();

        // Send OTP via WhatsApp
        const message = `Your OTP for login is: ${otp}. It is valid for 2 minutes. Please do not share it.`;
        await SendWhatsAppMessage(message, restaurant.restaurant_phone);

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully to registered phone number",
        });

    } catch (error) {
        console.error("Error logging in restaurant:", error.message);
        return res.status(500).json({
            success: false,
            message: "An error occurred while logging in the restaurant.",
            error: error.message
        });
    }
};

// Verify OTP
exports.verify_otp = async (req, res) => {
    try {
        const { otp, restaurant_BHID } = req.body;

        if (!otp || !restaurant_BHID) {
            return res.status(400).json({
                success: false,
                message: "OTP and Restaurant BHID are required",
                error: "OTP and Restaurant BHID are required"
            });
        }

        const restaurant = await Restaurant.findOne({ restaurant_BHID });

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
                error: "Restaurant not found"
            });
        }

        // Check if OTP matches and is not expired
        if (restaurant.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP",
                error: "Invalid OTP"
            });
        }

        if (new Date() > restaurant.otpExpiry) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired",
                error: "OTP has expired"
            });
        }

        // Clear OTP after successful verification
        restaurant.otp = null;
        restaurant.otpExpiry = null;
        await restaurant.save();

        await sendToken(restaurant, res, 200);

        // return res.status(200).json({
        //     success: true,
        //     message: "OTP verified successfully",
        // });

    } catch (error) {
        console.error("Error verifying OTP:", error.message);
        return res.status(500).json({
            success: false,
            message: "An error occurred while verifying the OTP.",
            error: error.message
        });
    }
};

exports.passwordChange = async (req, res) => {
    try {
        const { id } = req.params;
        const { Password, newPassword } = req.body;

        // Find restaurant by ID
        const restaurant = await Restaurant.findById(id);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        }

        // Compare provided old password with stored hashed password
        const isMatch = await restaurant.comparePassword(Password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Incorrect old password",
            });
        }

        restaurant.Password = newPassword;
        
        await restaurant.save();

        return res.status(200).json({
            success: true,
            message: "Password changed successfully",
        });
    } catch (error) {
        console.error("Internal server error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

exports.getSingleTiffinProfile = async (req, res) => {
    try {
        // console.log("Decoded JWT User:", req.user.id); // Debugging

        const user_id = req.user.id._id;
        // console.log("Extracted user_id:", user_id); // Debugging

        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: "User ID missing in token",
            });
        }

        const tiffinProfile = await Restaurant.findById(user_id);
        // console.log("DB Query Result:", tiffinProfile); // Debugging

        if (!tiffinProfile) {
            return res.status(404).json({
                success: false,
                message: "Tiffin profile not found",
                error: "Tiffin profile not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Tiffin profile retrieved successfully.",
            data: tiffinProfile
        });

    } catch (error) {
        console.error("Error getting tiffin profile:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};


exports.updateTiffinProfile = async (req, res) => {
    try {
        const { restaurant_BHID } = req.body;
        if (!restaurant_BHID) {
            return res.status(400).json({
                success: false,
                message: "Restaurant BHID is required to update tiffin profile",
                error: "Restaurant BHID is required to update tiffin profile"
            })
        }
        const restaurant = await Restaurant.findOne({ restaurant_BHID });
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
                error: "Restaurant not found"
            })
        }
        const updatedTiffinProfile = await TiffinProfile.findOneAndUpdate({ restaurant_id: restaurant._id }, req.body, { new: true });
        if (!updatedTiffinProfile) {
            return res.status(404).json({
                success: false,
                message: "Tiffin profile not found",
                error: "Tiffin profile not found"
            })
        }
    } catch (error) {
        console.log("Error updating tiffin profile:", error.message);
    }
}