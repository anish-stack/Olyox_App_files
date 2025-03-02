const HotelUser = require("../models/Hotel.user");
const HotelListing = require("../models/Hotels.model");
const generateOtp = require("../utils/Otp.Genreator");
const sendToken = require("../utils/SendToken");
const SendWhatsAppMessage = require("../utils/whatsapp_send");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();
const fs = require("fs").promises;
const streamifier = require("streamifier");

cloudinary.config({
    cloud_name: "dsd8nepa5",
    api_key: "634914486911329",
    api_secret: "dOXqEsWHQMjHNJH_FU6_iHlUHBE",
});
exports.register_hotel_user = async (req, res) => {
    try {
        // Destructure request body
        const { bh, hotel_name, BhJsonData, hotel_zone, hotel_address, hotel_owner, hotel_phone, amenities, area, hotel_geo_location, Documents } = req.body;

        // Check for required fields
        const emptyFields = [];
        if (!hotel_name) emptyFields.push("hotel_name");
        if (!hotel_zone) emptyFields.push("hotel_zone");
        if (!hotel_address) emptyFields.push("hotel_address");
        if (!hotel_phone) emptyFields.push("hotel_phone");
        if (!hotel_geo_location) emptyFields.push("hotel_geo_location");
        if (!bh) emptyFields.push("Bh");

        if (emptyFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: "The following fields are required:",
                missingFields: emptyFields,
            });
        }

        // Validate geo_location format
        if (
            !hotel_geo_location.coordinates ||
            !Array.isArray(hotel_geo_location.coordinates) ||
            hotel_geo_location.coordinates.length !== 2 ||
            !hotel_geo_location.coordinates.every(coord => typeof coord === "number")
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid geo-location format. It should be an array of two numbers (longitude and latitude).",
            });
        }

        // Check for duplicate hotel_name
        const existingHotel = await HotelUser.findOne({ hotel_name });
        if (existingHotel) {
            return res.status(409).json({
                success: false,
                message: `A hotel with the name "${hotel_name}" already exists. Please use a different name.`,
            });
        }

        // Check for duplicate Bh
        const existingBh = await HotelUser.findOne({ bh });
        if (existingBh) {
            return res.status(409).json({
                success: false,
                message: `The Bh value "${bh}" is already registered. Please use a unique Bh.`,
            });
        }

        // Check for duplicate hotel_phone
        const existingPhone = await HotelUser.findOne({ hotel_phone });
        if (existingPhone) {
            return res.status(409).json({
                success: false,
                message: `The phone number "${hotel_phone}" is already in use. Please use a different number.`,
            });
        }

        // Generate OTP
        const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
        const GenrateOtp = generateOtp();
        const ExpireTime = new Date().getTime() + 5 * 60 * 1000; // Expire time is 5 minutes

        const message = `Please verify your hotel registration. Your OTP is ${GenrateOtp}, sent to your WhatsApp number ${hotel_phone}.`;

        // Send a WhatsApp message with the OTP
        SendWhatsAppMessage(message, hotel_phone);

        // Create a new hotel user
        const newHotelUser = new HotelUser({
            hotel_name,
            hotel_zone,
            hotel_address,
            hotel_owner,
            hotel_phone,
            amenities,
            area,
            bh,
            BhJsonData,
            hotel_geo_location,
            Documents, // Attach files if any
            otp: GenrateOtp,
            otp_expires: ExpireTime,
        });

        // Save the new hotel user to the database
        await newHotelUser.save();

        // Respond with success
        return res.status(201).json({
            success: true,
            message: "Hotel user registered successfully! OTP sent for verification.",
            data: newHotelUser,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            error: error.message,
        });
    }
};
exports.verifyOtp = async (req, res) => {
    try {
        console.log(req.body)
        const { hotel_phone, bh, otp, type = "register" } = req.body;

        if (!hotel_phone || !otp) {
            return res.status(400).json({
                success: false,
                message: "Phone number and OTP are required.",
            });
        }

        let hotelUser
        if (type === "register") {
            hotelUser = await HotelUser.findOne({ hotel_phone });
        } else {
            hotelUser = await HotelUser.findOne({ bh: hotel_phone });
        }

        console.log(hotelUser)

        if (!hotelUser) {
            return res.status(404).json({
                success: false,
                message: "No user found with this phone number.",
            });
        }

        // if (hotelUser.contactNumberVerify) {
        //     return res.status(400).json({
        //         success: false,
        //         message: "Contact number already verified.",
        //     })
        // }

        if (hotelUser.otp !== Number(otp)) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP. Please enter the correct OTP.",
            });
        }

        const currentTime = new Date().getTime();
        if (currentTime > hotelUser.otp_expires) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new OTP.",
            });
        }

        // Mark user as verified
        hotelUser.contactNumberVerify = true;
        hotelUser.otp = null;
        hotelUser.otp_expires = null;


        // await hotelUser.save();
        await sendToken(hotelUser, res, 200)
        // return res.status(200).json({
        //     success: true,
        //     message: "OTP verified successfully. Your hotel registration is now complete.",
        // });
    } catch (error) {
        console.error("Error verifying OTP:", error);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            error: error.message,
        });
    }
};

exports.resendOtp = async (req, res) => {
    try {
        const { hotel_phone } = req.body;

        if (!hotel_phone) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required to resend OTP.",
            });
        }

        const hotelUser = await HotelUser.findOne({ hotel_phone });

        if (!hotelUser) {
            return res.status(404).json({
                success: false,
                message: "No user found with this phone number.",
            });
        }

        // Generate a new OTP and set expiry time
        const newOtp = generateOtp();
        const newExpiryTime = new Date().getTime() + 5 * 60 * 1000; // 5 minutes validity

        hotelUser.otp = newOtp;
        hotelUser.otp_expires = newExpiryTime;
        await hotelUser.save();

        // Send the new OTP via WhatsApp
        const message = `Your new OTP for hotel  is ${newOtp}. It will expire in 5 minutes.`;
        SendWhatsAppMessage(message, hotel_phone);

        return res.status(200).json({
            success: true,
            message: "A new OTP has been sent to your registered WhatsApp number.",
        });
    } catch (error) {
        console.error("Error resending OTP:", error);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            error: error.message,
        });
    }
};


exports.find_Hotel_Login = async (req, res) => {
    try {
        const user = req.user.id

        const foundFreshDetails = await HotelUser.findOne({ _id: user })
        if (!foundFreshDetails) {
            return res.status(404).json({
                success: false,
                message: "No user found with this id.",
            });
        }

        const foundListingOfRooms = await HotelListing.find({ hotel_user: foundFreshDetails?._id })

        return res.status(200).json({
            success: true,
            message: "Hotel login successful.",
            data: foundFreshDetails,
            listings: foundListingOfRooms,
            listingCount: foundListingOfRooms.length
        })
    } catch (error) {
        console.log(error)
        res.status(501).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
        })

    }
}


exports.LoginHotel = async (req, res) => {
    try {
        const { BH } = req.body;

        // Find the hotel by BH ID
        const foundHotel = await HotelUser.findOne({ bh: BH });
        if (!foundHotel) {
            return res.status(404).json({
                success: false,
                message: "No user found with this ID.",
            });
        }

        // Generate OTP and expiration time
        const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
        const otpCode = generateOtp();
        const otpExpireTime = Date.now() + 5 * 60 * 1000; // OTP valid for 5 minutes

        // Update hotel details with OTP
        foundHotel.otp = otpCode;
        foundHotel.otp_expires = otpExpireTime;
        await foundHotel.save();

        // Construct message
        const message = `Please verify your hotel login. Your OTP is ${otpCode}, sent to your WhatsApp number ${foundHotel.hotel_phone}.`;

        // Send OTP via WhatsApp
        await SendWhatsAppMessage(message, foundHotel.hotel_phone);

        return res.status(200).json({
            success: true,
            message: "Hotel login initiated. Please verify your OTP.",
        });
    } catch (error) {
        console.error("Error in hotel login:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again later.",
        });
    }
};

exports.find_My_rooms = async (req, res) => {
    try {
        const user = req.user.id;
        const foundListingOfRooms = await HotelListing.find({ hotel_user: user });

        if (!foundListingOfRooms.length) {
            return res.status(404).json({
                success: false,
                message: "No rooms found for this user.",
            });
        }

        return res.status(200).json({
            success: true,
            rooms: foundListingOfRooms,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
            error: error.message,
        });
    }
};

exports.uploadDocuments = async (req, res) => {
    try {
        const userId = req.user.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized access. Please log in." });
        }

        const findUser = await HotelUser.findById(userId);
        if (!findUser) {
            return res.status(404).json({ success: false, message: "User not found. Please check your account details." });
        }

        if (findUser.DocumentUploaded) {
            return res.status(400).json({ success: false, message: "You have already uploaded your documents." });
        }
        if (findUser.DocumentUploadedVerified) {
            return res.status(400).json({ success: false, message: "Your documents have already been verified." });
        }

        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({ success: false, message: "No files uploaded. Please upload the required documents." });
        }

        const documentFields = ['aadhar_front', 'aadhar_Back', 'panCard', 'gst', 'addressProof', 'ProfilePic'];
        const documents = [];

        // Helper function to upload images to Cloudinary
        const uploadImage = async (file) => {
            if (!file) return null;
            const result = await cloudinary.uploader.upload(file.path, {
                folder: "hotel_listings_documents"
            });
            return { url: result.secure_url, public_id: result.public_id };
        };

        for (const field of documentFields) {
            if (req.files[field]) {
                const uploadedImage = await uploadImage(req.files[field][0]);
                if (uploadedImage) {
                    documents.push({
                        d_type: field,
                        d_url: uploadedImage.url,
                        d_public_id: uploadedImage.public_id
                    });
                }
            }
        }

        if (documents.length === 0) {
            return res.status(400).json({ success: false, message: "File upload failed. Please try again." });
        }

        // Update user document fields
        findUser.Documents = documents;
        findUser.DocumentUploaded = true;
        await findUser.save();

        return res.status(200).json({
            success: true,
            message: "Documents uploaded successfully.",
            documents: documents
        });

    } catch (error) {
        console.error("Upload Error:", error);
        return res.status(500).json({ success: false, message: "An error occurred while uploading documents. Please try again later." });
    }
};

exports.toggleHotelStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const userId = req.user.id;

        // Fetch user details
        const foundFreshDetails = await HotelUser.findById(userId);
        if (!foundFreshDetails) {
            return res.status(404).json({
                success: false,
                message: "No user found with this ID.",
            });
        }

        // Check verification and block status
        if (!foundFreshDetails.contactNumberVerify) {
            return res.status(400).json({
                success: false,
                message: "Please verify your contact number first.",
            });
        }
        if (!foundFreshDetails.DocumentUploaded) {
            return res.status(400).json({
                success: false,
                message: "Please upload your document first.",
            });
        }
        if (!foundFreshDetails.DocumentUploadedVerified) {
            return res.status(400).json({
                success: false,
                message: "Document verification is pending.",
            });
        }
        if (foundFreshDetails.isBlockByAdmin) {
            return res.status(403).json({
                success: false,
                message: "Your account has been blocked by the admin.",
            });
        }

        // Convert status properly
        const changeStatusToBoolean = status === true || status === "true";

        // Update the online status
        foundFreshDetails.isOnline = changeStatusToBoolean;
        await foundFreshDetails.save(); // Ensure changes are saved

        return res.status(200).json({
            success: true,
            message: changeStatusToBoolean
                ? "Hotel is now online and ready to take bookings."
                : "Hotel is now offline.",
        });
    } catch (error) {
        console.error("Error in toggleHotelStatus:", error);

        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
            error: error.message, // Optional: Send error details for debugging
        });
    }
};




exports.add_hotel_listing = async (req, res) => {
    try {
        const user = req.user.id;
        const {
            room_type,
            hotel_user,
            has_tag,
            amenities,
            allowed_person,
            cut_price,
            book_price,
            cancellation_policy,
            is_tax_applied,
            tax_fair,
            isPackage,
            package_add_ons
        } = req.body;

        if (!room_type || !book_price) {
            return res.status(400).json({
                success: false,
                message: "room_type and book_price are required fields.",
            });
        }

        // Convert has_tag string into an array
        let hasTagArray = [];
        if (typeof has_tag === "string" && has_tag.trim() !== "") {
            hasTagArray = has_tag.split(",").map(tag => tag.trim());
        }

        // Calculate discount percentage
        const discount_percentage = cut_price > 0
            ? Math.round(((cut_price - book_price) / cut_price) * 100)
            : 0;

        const images = {};
        const imageFields = ['main_image', 'second_image', 'third_image', 'fourth_image', 'fifth_image'];

        const uploadImage = async (file) => {
            if (!file) return null;
            const result = await cloudinary.uploader.upload(file.path, {
                folder: "hotel_listings"
            });
            return { url: result.secure_url, public_id: result.public_id };
        };

        for (const field of imageFields) {
            if (req.files[field]) {
                images[field] = await uploadImage(req.files[field][0]);
            }
        }

        let packageAddOns = [];

        if (isPackage && package_add_ons) {
            try {
                if (typeof package_add_ons === 'string') {
                    // Convert comma-separated string to an array
                    packageAddOns = package_add_ons.split(',').map(item => item.trim());
                } else {
                    packageAddOns = JSON.parse(package_add_ons);
                }

                if (!Array.isArray(packageAddOns)) {
                    return res.status(400).json({
                        success: false,
                        message: "package_add_ons must be an array.",
                    });
                }
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid format for package_add_ons. It should be a JSON array or a comma-separated string.",
                });
            }
        }

        console.log(packageAddOns)

        const newHotelListing = new HotelListing({
            room_type,
            hotel_user: user?._id,
            has_tag: hasTagArray,
            amenities,
            allowed_person,
            cut_price,
            book_price,
            discount_percentage,
            cancellation_policy,
            is_tax_applied,
            tax_fair,
            isPackage,
            package_add_ons: packageAddOns,
            ...images
        });

        console.log(newHotelListing);
        await newHotelListing.save();

        return res.status(201).json({
            success: true,
            message: "Hotel listing added successfully",
            data: newHotelListing
        });
    } catch (error) {
        console.error("Error adding hotel listing:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while adding the hotel listing",
        });
    }
};

exports.deleteHotelRoom = async (req, res) => {
    try {
        const { roomId } = req.query;

        if (!roomId) {
            return res.status(400).json({ success: false, message: "Room ID is required" });
        }

        const hotelRoom = await HotelListing.findById(roomId);
        if (!hotelRoom) {
            return res.status(404).json({ success: false, message: "Hotel room not found" });
        }

        // Delete images from Cloudinary
        const imageFields = ["main_image", "second_image", "third_image", "fourth_image", "fifth_image"];
        for (let field of imageFields) {
            if (hotelRoom[field]?.public_id) {
                await cloudinary.uploader.destroy(hotelRoom[field].public_id);
            }
        }

        // Delete the hotel room from the database
        await HotelListing.findByIdAndDelete(roomId);

        return res.status(200).json({ success: true, message: "Hotel room deleted successfully" });
    } catch (error) {
        console.error("Error deleting hotel room:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};






exports.getHotelsNearByMe = async (req, res) => {
    try {
        const { lat, lng } = req.query;



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
            hotel_listing = await HotelListing.find().sort({ isRoomAvailable: -1 }).populate('hotel_user');

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
        console.log("hotel_listing", hotel_listing)

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
        let hotel_listing = await HotelListing.findById(hotelId).populate('hotel_user');

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

exports.toggleRoomStatus = async (req, res) => {
    try {
        const { roomId } = req.query;
        const { isRoomAvailable } = req.body;
        console.log("isRoomAvailable", isRoomAvailable)

        if (!roomId) {
            return res.status(400).json({ success: false, message: "Room ID is required" });
        }
        if (isRoomAvailable === undefined) {
            return res.status(400).json({ success: false, message: "Status is required" });
        }

        const room = await HotelListing.findById(roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: "Room not found" });
        }

        room.isRoomAvailable = isRoomAvailable;
        await room.save();

        return res.status(200).json({ success: true, message: "Room status updated successfully" });
    } catch (error) {
        console.error("Error updating room status:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
