const Parcel_Bike_Register = require("../models/Parcel_Models/Parcel_Bike_Register");
const { uploadBufferImage } = require("../utils/aws.uploader");
const generateOtp = require("../utils/Otp.Genreator");
const send_token = require("../utils/send_token");
const SendWhatsAppMessage = require("../utils/whatsapp_send");

//still pending due to error of cors in uploading images
exports.register_parcel_partner = async (req, res) => {
    try {
        const files = req.files || [];
        const { name, email, phone, address, bikeDetails } = req.body;
        console.log(files)
        if (!name || !email || !phone || !address || !bikeDetails) {
            return res.status(400).json({
                success: false,
                message: "All fields are required."
            });
        }

        const parsedDetails = JSON.parse(bikeDetails);
        if (!parsedDetails.make || !parsedDetails.model || !parsedDetails.year || !parsedDetails.licensePlate) {
            return res.status(400).json({
                success: false,
                message: "Bike details are incomplete."
            });
        }

        if (!/\S+@\S+\.\S+/.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format."
            });
        }

        if (!/^\d{10}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: "Phone number must be 10 digits."
            });
        }

        const existingPartner = await Parcel_Bike_Register.findOne({ email });
        if (existingPartner) {
            return res.status(400).json({
                success: false,
                message: "Email already registered."
            });
        }

        const newPartner = new Parcel_Bike_Register({
            name,
            email,
            phone,
            address,
            bikeDetails: parsedDetails,
        });

        const otp = generateOtp();
        newPartner.otp = otp;
        // await newPartner.save();

        const otpMessage = `Your OTP for parcel registration is: ${otp}`;
        // await SendWhatsAppMessage(phone, otpMessage);

        res.status(201).json({
            success: true,
            message: "Please verify OTP sent to your phone.",
            otp: otp,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "An error occurred while processing your request. Please try again later.",
            error: error.message,
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { number } = req.body;

        if (!number) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required"
            });
        }

        const partner = await Parcel_Bike_Register.findOne({ phone: number });

        if (!partner) {
            return res.status(400).json({
                success: false,
                message: "Phone number is not registered"
            });
        }

        // Check if the user is blocked for OTP
        if (partner.isOtpBlock) {
            // Check the time when OTP should be unblocked
            const currentTime = new Date();
            const unblockTime = new Date(partner.otpUnblockAfterThisTime);

            // If the unblock time has not passed yet, notify the user
            if (currentTime < unblockTime) {
                return res.status(403).json({
                    success: false,
                    message: `You are blocked from requesting OTP. Please try again after ${unblockTime.toLocaleTimeString()}`
                });
            }

            // If unblock time has passed, unblock the user
            partner.isOtpBlock = false;
            partner.otpUnblockAfterThisTime = null; // Clear unblock time
            partner.howManyTimesHitResend = 0; // Reset resend attempts
            await partner.save();
        }

        // Generate OTP if the user is not blocked
        const otp = await generateOtp();
        partner.otp = otp;
        await partner.save();

        const otpMessage = `Your OTP for parcel registration is: ${otp}`;
        await SendWhatsAppMessage(otpMessage, number);

        res.status(201).json({
            success: true,
            message: "Please verify OTP sent to your phone.",
            otp: otp
        });

    } catch (error) {
        res.status(501).json({
            success: false,
            error: error.message || "Something went wrong"
        });
    }
};



exports.resendOtp = async (req, res) => {
    try {
        const { number } = req.body;
        console.log(number)

        if (!number) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required"
            });
        }

        const partner = await Parcel_Bike_Register.findOne({ phone: number });

        if (!partner) {
            return res.status(400).json({
                success: false,
                message: "Phone number is not registered"
            });
        }

        // Check if OTP is blocked
        if (partner.isOtpBlock) {
            // Check if the unblock time has passed
            const currentTime = new Date();
            if (currentTime < partner.otpUnblockAfterThisTime) {
                const timeRemaining = (partner.otpUnblockAfterThisTime - currentTime) / 1000;
                return res.status(400).json({
                    success: false,
                    message: `OTP resend is blocked. Try again in ${Math.ceil(timeRemaining)} seconds.`
                });
            } else {
                // Unblock the OTP after the set time has passed
                partner.isOtpBlock = false;
                partner.howManyTimesHitResend = 0; // Reset the resend attempts
                partner.otpUnblockAfterThisTime = null; // Clear the unblock time
                await partner.save();
            }
        }

        // If resend limit is reached, block the OTP and set the unblock time
        if (partner.howManyTimesHitResend >= 3) {
            // Block the OTP and set the time for when it will be unblocked (e.g., 30 minutes)
            partner.isOtpBlock = true;
            partner.otpUnblockAfterThisTime = new Date(Date.now() + 30 * 60 * 1000); // Block for 30 minutes
            await partner.save();

            return res.status(400).json({
                success: false,
                message: "OTP resend limit reached. Please try again later."
            });
        }

        // Generate new OTP and resend it
        const otp = await generateOtp();
        partner.otp = otp;
        partner.howManyTimesHitResend += 1;  // Increment resend count
        await partner.save();

        const otpMessage = `Your OTP for parcel registration is: ${otp}`;
        const data = await SendWhatsAppMessage(otpMessage, number);
        console.log(data)
        res.status(200).json({
            success: true,
            message: "OTP resent successfully. Please check your phone.",
            otp: otp
        });

    } catch (error) {
        res.status(501).json({
            success: false,
            error: error.message || "Something went wrong"
        });
    }
};

exports.verifyOtp = async (req, res) => {
    try {
        const { number, otp } = req.body;

        if (!number || !otp) {
            return res.status(400).json({
                success: false,
                message: "Phone number and OTP are required"
            });
        }

        const partner = await Parcel_Bike_Register.findOne({ phone: number });

        if (!partner) {
            return res.status(400).json({
                success: false,
                message: "Phone number is not registered"
            });
        }

        // Check if OTP is valid
        if (partner.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        // OTP is verified, so clear the OTP and reset fields
        partner.otp = null; // Clear the OTP
        partner.howManyTimesHitResend = 0; // Reset resend attempts
        partner.isOtpBlock = false; // Unblock OTP if it was previously blocked
        partner.otpUnblockAfterThisTime = null; // Clear the OTP unblock time

        await partner.save();

        await send_token(partner, {type:partner?.type}, res, req)

    } catch (error) {
        res.status(501).json({
            success: false,
            error: error.message || "Something went wrong"
        });
    }
};


exports.details = async (req, res) => {
    try {
      // Retrieve userId from the request object, assuming it's populated by middleware (like authentication middleware)
      const userId = req.user.userId || {};
        console.log(userId)
      // Find the partner based on the userId
      const partner = await Parcel_Bike_Register.findOne({ _id: userId });
  
      // If the partner is not found, send a 404 response
      if (!partner) {
        return res.status(404).json({ message: 'Partner not found' });
      }
  
      // Return the partner details
      return res.status(200).json({ success: true, partner });
    } catch (error) {
      console.error('Error fetching partner details:', error);
      
      // Send a 500 internal server error if something goes wrong
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  };