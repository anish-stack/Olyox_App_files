const HotelUser = require("../models/Hotel.user");

exports.register_hotel_user = async (req, res) => {
    try {
        // Destructure request body and files
        const files = req.files || [];
        const { hotel_name, hotel_zone, hotel_address, hotel_owner, hotel_phone, amenities, area, hotel_geo_location } = req.body;

        const emptyFields = [];
        if (!hotel_name) emptyFields.push("hotel_name");
        if (!hotel_zone) emptyFields.push("hotel_zone");
        if (!hotel_address) emptyFields.push("hotel_address");
        if (!hotel_phone) emptyFields.push("hotel_phone");
        if (!hotel_geo_location) emptyFields.push("hotel_geo_location");

        // If there are missing fields, return a user-friendly error
        if (emptyFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: "The following fields are required:",
                missingFields: emptyFields,
            });
        }

        // Validate geo_location format (ensure it's an array of two numbers)
        if (
            !Array.isArray(hotel_geo_location.coordinates) ||
            hotel_geo_location.coordinates.length !== 2 ||
            !hotel_geo_location.coordinates.every(coord => typeof coord === 'number')
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid geo-location format. It should be an array of two numbers (longitude and latitude).",
            });
        }

        // Check for duplicate hotel_zone
        const existingHotelZone = await HotelUser.findOne({ hotel_name });
        if (existingHotelZone) {
            return res.status(409).json({
                success: false,
                message: `A hotel with the zone "${hotel_name}" already exists. Please use a different zone.`,
            });
        }

        // Create a new hotel user
        const newHotelUser = new HotelUser({
            hotel_name,
            hotel_zone,
            hotel_address,
            hotel_owner,
            hotel_phone,
            amenities,
            area,
            hotel_geo_location,
            files, // Attach files if any
        });

        // Save the new hotel user to the database
        // await newHotelUser.save();

        // Respond with success
        return res.status(201).json({
            success: true,
            message: "Hotel user registered successfully!",
            data: newHotelUser,
        });
    } catch (error) {
        // Handle unexpected errors
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            error: error.message,
        });
    }
};
