const RiderModel = require('../models/Rider.model');

const Settings = require('../models/Admin/Settings');
const axios = require('axios');
const Heavy_vehicle_partners = require('../models/Heavy_vehicle/Heavy_vehicle_partners');

exports.FindWeather = async (lat, lon) => {
  if (!lat || !lon) {
    throw new Error('Latitude and Longitude are required');
  }

  try {
    const foundKey = await Settings.findOne();
    const apiKey = foundKey?.openMapApiKey;

    if (!apiKey) {
      throw new Error('API Key is required');
    }

    const { data } = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather`,
      {
        params: { lat, lon, appid: apiKey }
      }
    );

    return data.weather || data;
  } catch (error) {
    console.error('Weather API Error:', error.message);
    throw new Error(error.message);
  }
};


exports.CheckTolls = async (origin, destination) => {
  console.log(origin)
  console.log(origin)
  if (!origin || !destination) {
    throw new Error('Origin and destination are required');
  }

  try {
    const foundKey = await Settings.findOne();
    const apiKey = foundKey?.googleApiKey;

    if (!apiKey) {
      throw new Error('Google API Key is required');
    }

    const requestBody = {
      origin: { location: { latLng: origin } },
      destination: { location: { latLng: destination } },
      travelMode: "DRIVE",
      extraComputations: ["TOLLS"],
      regionCode: "IN",
      computeAlternativeRoutes: true
    };


    const { data } = await axios.post(
      `https://routes.googleapis.com/directions/v2:computeRoutes?key=${apiKey}`,
      requestBody,
      {
        headers: {
          'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.travelAdvisory.tollInfo'
        }
      }
    );

    console.log(data.routes)
    return data.routes[1] || data || {}
  } catch (error) {
    console.error('Routes API Error:', error.message);
    throw new Error(error.message);
  }
};


exports.updateRechargeDetails = async ({ rechargePlan, expireData, approveRecharge, BH }) => {
  try {
    // Validate required fields
    console.log(BH)
    if (!BH) {
      return { success: false, message: "BH is required." };
    }

    // Find the rider by BH
    let foundRider = await RiderModel.findOne({ BH });
  

    foundRider = await Heavy_vehicle_partners.findOne({ Bh_Id: BH })
    console.log("foundRider", foundRider)
    if (!foundRider) {
      return { success: false, message: "Rider not found." };
    }
    // If approveRecharge is true, update the recharge details
    if (approveRecharge) {
      // Mark first recharge as done
      foundRider.isFirstRechargeDone = true;

      if(foundRider.isFreeMember){
        foundRider.isFreeMember = false
        foundRider.freeTierEndData = null
      }
      // Update recharge data
      foundRider.RechargeData = {
        rechargePlan,
        expireData,
        approveRecharge: true
      };

      // Mark rider as paid
      foundRider.isPaid = true;

      // Save changes
      await foundRider.save();

      return {
        success: true,
        message: "Recharge approved and rider marked as paid.",
        data: foundRider
      };
    } else {
      return {
        success: false,
        message: "Recharge approval is required."
      };
    }

  } catch (error) {
    console.error("Error updating recharge details:", error);
    return {
      success: false,
      message: "Internal server error.",
      error: error.message
    };
  }
};
