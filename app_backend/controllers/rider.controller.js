const rideRequestModel = require('../models/ride.request.model');
const Rider = require('../models/Rider.model');
const generateOtp = require('../utils/Otp.Genreator');
const send_token = require('../utils/send_token');
const SendWhatsAppMessage = require('../utils/whatsapp_send');
const cloudinary = require('cloudinary').v2
const fs = require('fs');
cloudinary.config({
  cloud_name: 'dsd8nepa5',
  api_key: '634914486911329',
  api_secret: 'dOXqEsWHQMjHNJH_FU6_iHlUHBE'
})
// Register a new rider
exports.registerRider = async (req, res) => {
  try {
    console.log("rider", req.body)
    const { name, phone, rideVehicleInfo, BH } = req.body;
    const { vehicleName, vehicleType, PricePerKm, VehicleNumber } = rideVehicleInfo;

    if (!BH) {
      return res.status(400).json({ message: "Please enter your BH Number" });
    }
    // Validate required fields
    if (!name || !phone || !vehicleName || !vehicleType || !PricePerKm || !VehicleNumber) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    let BhAlready = await Rider.findOne({ BH: BH })
    if (BhAlready) {
      return res.status(400).json({ success: false, message: "BH Number already exists " })
    }

    // Check if the phone number is already registered
    let existingRider = await Rider.findOne({ phone });

    if (existingRider) {
      if (!existingRider.isOtpVerify) {
        const otp = generateOtp();

        if (existingRider.howManyTimesHitResend >= 5) {
          existingRider.isOtpBlock = true;
          existingRider.isDocumentUpload = false;
          existingRider.otpUnblockAfterThisTime = new Date(Date.now() + 30 * 60000); // Block for 30 minutes
          await existingRider.save();
          await SendWhatsAppMessage(`Your account is blocked for 30 minutes.`, phone);
          return res.status(400).json({ success: false, message: "Your account is blocked for 30 minutes." });
        }

        existingRider.otp = otp;
        existingRider.howManyTimesHitResend += 1;
        existingRider.isDocumentUpload = false;
        await existingRider.save();

        await SendWhatsAppMessage(`Your OTP for Cab registration is: ${otp}`, phone);
        return res.status(201).json({ success: true, message: "Existing rider found. Please verify OTP." });
      }

      return res.status(400).json({ success: false, message: "Phone number already registered." });
    }

    // Check if the vehicle number is already registered
    const existingRiderWithVehicle = await Rider.findOne({ 'rideVehicleInfo.VehicleNumber': VehicleNumber });

    if (existingRiderWithVehicle) {
      return res.status(400).json({ success: false, message: "Vehicle number already registered." });
    }

    // Generate OTP for new registration
    const otp = generateOtp();

    const newRider = new Rider({
      name,
      phone,
      rideVehicleInfo: { vehicleName, vehicleType, PricePerKm, VehicleNumber },
      BH,
      otp,
      isOtpVerify: false,
      isDocumentUpload: false,
      howManyTimesHitResend: 0,
      isOtpBlock: false,
    });

    const savedRider = await newRider.save();
    await SendWhatsAppMessage(`Your OTP for Cab registration is: ${otp}`, phone);

    res.status(201).json({ success: true, message: 'Rider registered successfully. Please verify OTP.', rider: savedRider });
  } catch (error) {
    console.error('Error registering rider:', error);
    res.status(500).json({ success: false, message: 'Failed to register rider' });
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

    const partner = await Rider.findOne({ phone: number });

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

    const otpMessage = `Your OTP for CaB registration is: ${otp}`;
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

    if (!number) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required"
      });
    }

    const partner = await Rider.findOne({ phone: number });

    if (!partner) {
      return res.status(400).json({
        success: false,
        message: "Phone number is not registered"
      });
    }
    if (partner.isOtpVerify) {
      return res.status(400).json({
        success: false,
        message: "You have already verified your OTP"
      })
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
    if (partner.howManyTimesHitResend >= 5) {
      // Block the OTP and set the time for when it will be unblocked (e.g., 30 minutes)
      partner.isOtpBlock = true;
      partner.otpUnblockAfterThisTime = new Date(Date.now() + 30 * 60 * 1000); // Block for 30 minutes
      await partner.save();

      return res.status(400).json({
        success: false,
        message: "OTP resend limit reached. Please try again later."
      });
    }


    const otp = await generateOtp();
    partner.otp = otp;
    partner.howManyTimesHitResend += 1;
    await partner.save();

    const otpMessage = `Your OTP for cab registration is: ${otp}`;
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

    const partner = await Rider.findOne({ phone: number });

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
    partner.isOtpVerify = true; // Clear the OTP
    partner.howManyTimesHitResend = 0; // Reset resend attempts
    partner.isOtpBlock = false; // Unblock OTP if it was previously blocked
    partner.otpUnblockAfterThisTime = null; // Clear the OTP unblock time

    await partner.save();

    await send_token(partner, { type: "CAB" }, res, req)

  } catch (error) {
    console.log(error.message)
    res.status(501).json({
      success: false,
      error: error.message || "Something went wrong"
    });
  }
};

// Get all riders
exports.getAllRiders = async (req, res) => {
  try {
    const riders = await Rider.find();
    res.status(200).json(riders);
  } catch (error) {
    console.error('Error fetching riders:', error);
    res.status(500).json({ error: 'Failed to fetch riders' });
  }
};

// Change location of a rider
exports.changeLocation = async (req, res) => {
  try {
    const { riderId } = req.params;
    const { location } = req.body;

    if (!location || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
      return res.status(400).json({ error: 'Invalid location format' });
    }

    const updatedRider = await Rider.findByIdAndUpdate(
      riderId,
      { location },
      { new: true }
    );

    if (!updatedRider) {
      return res.status(404).json({ error: 'Rider not found' });
    }

    res.status(200).json({ message: 'Location updated successfully', rider: updatedRider });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
};

exports.uploadDocuments = async (req, res) => {
  try {
    console.log(req.user)
    const userId = req.user.userId;
    const findRider = await Rider.findById(userId);

    if (!findRider) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (findRider.isDocumentUpload && findRider.DocumentVerify === true) {
      return res.status(400).json({ success: false, message: "Documents already uploaded and verified, please login." });
    }

    const uploadedDocs = {};

    for (const file of req.files) {
      const uploadResponse = await cloudinary.uploader.upload(file.path, { folder: "rider_documents" });

      if (file.originalname.includes('dl')) uploadedDocs.license = uploadResponse.secure_url;
      if (file.originalname.includes('rc')) uploadedDocs.rc = uploadResponse.secure_url;
      if (file.originalname.includes('insurance')) uploadedDocs.insurance = uploadResponse.secure_url;
      fs.unlinkSync(file.path);
    }
    console.log(uploadedDocs)

    findRider.documents = uploadedDocs;
    findRider.isDocumentUpload = true;
    await findRider.save();

    res.status(201).json({ success: true, message: "Documents uploaded successfully", data: uploadedDocs });
  } catch (error) {
    console.error("Error uploading documents:", error);
    res.status(500).json({ success: false, message: "Documents upload failed", error: error.message });
  }
};


exports.uploadPaymentQr = async (req, res) => {
  try {
    const file = req.file || {}
    const userId = req.user.userId;
    const findRider = await Rider.findById(userId);

    if (!findRider) {
      return res.status(404).json({ success: false, message: "User not found" });
    }


    const uploadedDocs = {};

    const uploadResponse = await cloudinary.uploader.upload(file.path, { folder: "rider_qrs" });
    fs.unlinkSync(file.path);



    findRider.YourQrCodeToMakeOnline = uploadResponse.secure_url;

    await findRider.save();

    res.status(201).json({ success: true, message: "Documents uploaded successfully", data: uploadResponse });
  } catch (error) {
    console.error("Error uploading documents:", error);
    res.status(500).json({ success: false, message: "Documents upload failed", error: error.message });
  }
};




exports.details = async (req, res) => {
  try {

    const userId = req.user?.userId;

    // Check if userId exists
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Find the partner
    const partner = await Rider.findById(userId);
    // console.log(partner)
    // If partner not found, return error
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }


    // Return response
    return res.status(200).json({ success: true, partner });

  } catch (error) {
    console.error("Error fetching partner details:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.getMyAllDetails = async (req, res) => {
  try {
    const user_id = req.user?.userId;
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const findRideDetails = await rideRequestModel.find({ rider: user_id });
    console.log(findRideDetails[0])

    const totalRides = findRideDetails.length;
    const totalEarnings = findRideDetails.reduce((acc, cur) => acc + Number(cur.kmOfRide), 0);
    console.log("totalEarnings", totalEarnings)
    const totalRatings = findRideDetails.reduce((acc, cur) => acc + (cur.RatingOfRide || 0), 0);
    const averageRating = totalRides > 0 ? totalRatings / totalRides : 0;

    // Send response with all computed data
    return res.status(200).json({
      totalRides,
      totalEarnings,
      averageRating,
    });

  } catch (error) {
    console.error("Error fetching ride details:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


exports.getMyAllRides = async (req, res) => {
  try {
    const user_id = req.user?.userId;
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const findRideDetails = await rideRequestModel.find({ rider: user_id }).sort({
      createdAt: -1
    });

    return res.status(200).json({
      success: true,
      message: "Ride details fetched successfully",
      count: findRideDetails.length,
      data: findRideDetails
    });

  } catch (error) {
    console.error("Error fetching ride details:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


exports.toggleWorkStatusOfRider = async (req, res) => {
  try {
    const user_id = req.user?.userId;
    if (!user_id) {
      return res.status(401).json({ message: "User ID is required" });
    }

    // Fetch the current status of the rider
    const rider = await Rider.findById({ _id: user_id });

    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    // Toggle the status dynamically
    const newStatus = !rider.isAvailable;

    // Update the status in the database
    const toggleStatus = await Rider.updateOne({ _id: user_id }, { $set: { isAvailable: newStatus } });

    if (toggleStatus.modifiedCount === 1) {
      return res.status(200).json({ message: `Status updated to ${newStatus ? 'Available' : 'Unavailable'} successfully` });
    } else {
      return res.status(400).json({ message: "Status update failed" });
    }
  } catch (error) {
    console.error("Error toggling work status:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


exports.verifyDocument = async (req, res) => {
  try {
    const BH = req.query.bh || {};
    const findRider = await Rider.findOne({ BH });

    if (!findRider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    if (findRider.DocumentVerify === true) {
      return res.status(200).json({ message: "Document already verified" });
    }

    const verifyDocument = await Rider.updateOne({ BH }, { $set: { DocumentVerify: true } });

    if (verifyDocument.modifiedCount === 1) {
      // Send WhatsApp confirmation message
      const congratsMessage = `🎉 Congratulations ${findRider.name}! 

Your documents have been successfully verified, and you are now officially part of our team. 

🚀 Get ready to start your journey with us, delivering excellence and earning great rewards. We appreciate your dedication and look forward to seeing you grow with us.

💡 Stay active, provide the best service, and unlock more opportunities in the future.

Welcome aboard! 🚖💨`;

      await SendWhatsAppMessage(congratsMessage, findRider.phone);

      return res.status(200).json({ message: "Document verified successfully" });
    }

    return res.status(400).json({ message: "Verification failed, please try again." });

  } catch (error) {
    console.error("Error verifying document:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
