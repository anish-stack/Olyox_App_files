const HotelUser = require("../models/Hotel.user");
const HotelListing = require("../models/Hotels.model");

exports.register_hotel_user = async (req, res) => {
    try {
        // Destructure request body and files
        const files = req.files || [];
        const { hotel_name, hotel_zone, hotel_address, hotel_owner, hotel_phone, amenities, area, hotel_geo_location, Documents } = req.body;

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
            Documents, // Attach files if any
        });

        // Save the new hotel user to the database
        await newHotelUser.save();

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


exports.add_hotel_listing = async (req, res) => {
    try {
        const data = req.body
        const newData = new HotelListing(data)
        await newData.save()
        return res.status(201).json({
            success: true,
            message: "Hotel listing added successfully",
            data: newData
        })
    } catch (error) {
        console.log(error)
    }
}



exports.getHotelsNearByMe = async (req, res) => {
    try {
        const { lat, lng } = req.query;
        console.log(req.query)


        let hotel_listing = await HotelUser.find({
            hotel_geo_location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: 2000
                }
            }
        });

        // If no nearby hotels are found, fetch all hotels and shuffle the data
        if (hotel_listing.length === 0) {
            hotel_listing = await HotelListing.find();

            hotel_listing = hotel_listing.sort(() => Math.random() - 0.5);
        }

        res.status(200).json({
            success: true,
            count: hotel_listing.length,
            data: hotel_listing
        });
    } catch (error) {
        console.error("Error fetching hotels:", error);
        res.status(500).json({ success: false, message: "Server error. Please try again later." });
    }
};


exports.getHotelsDetails = async (req, res) => {
    try {
        const { params } = req.params;
        console.log(req.params)

        let hotel_user = await HotelUser.findById(params);
        if (!hotel_user) {
            return res.status(404).json({ success: false, message: "Hotel not found." })

        }

        let hotel_listing = await HotelListing.find({ hotel_user: params });

        // If no nearby hotels are found, fetch all hotels and shuffle the data
        if (hotel_listing.length === 0) {
            hotel_listing = await HotelListing.find();
            hotel_listing = hotel_listing.sort(() => Math.random() - 0.5);
        }

        res.status(200).json({
            success: true,
            count: hotel_listing.length,
            Hotel_User: hotel_user,
            data: hotel_listing
        });
    } catch (error) {
        console.error("Error fetching hotels:", error);
        res.status(500).json({ success: false, message: "Server error. Please try again later." });
    }
};


exports.getHotelsListingDetails = async (req, res) => {
    try {
        // Destructure the hotelId directly from req.params
        const { hotelId } = req.params;

        // Find the hotel by its ID
        let hotel_listing = await HotelListing.findById(hotelId);

        // Check if the hotel was found
        if (!hotel_listing) {
            return res.status(404).json({
                success: false,
                message: "Hotel not found."
            });
        }

        // Return the hotel data
        res.status(200).json({
            success: true,
            data: hotel_listing
        });
    } catch (error) {
        console.error("Error fetching hotels:", error);
        res.status(500).json({
            success: false,
            message: "Server error. Please try again later."
        });
    }
};
