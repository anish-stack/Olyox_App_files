const rideRequestModel = require("../models/ride.request.model");
const User = require('../models/normal_user/User.model');
const RiderModel = require("../models/Rider.model");
const Parcel_Request = require("../models/Parcel_Models/Parcel_Request");

exports.webhookExotelApi = async (req, res) => {
    try {
        const { CallFrom } = req.query;
        if (!CallFrom) {
            return res.status(400).type('text/plain').send('Invalid Request');
        }
        
        const removeZero = CallFrom.replace(/^0+/, '');
        console.log('Processed CallFrom:', removeZero);
        
        let typeOfCall = 'user-to-rider';
        let checkThisWithOurUser;
        
        // Check if the call is from a user or a rider
        checkThisWithOurUser = await User.findOne({ number: removeZero });
        
        if (!checkThisWithOurUser) {
            // If no user found, check for rider
            checkThisWithOurUser = await RiderModel.findOne({ phone: removeZero });
            if (checkThisWithOurUser) {
                typeOfCall = 'rider-to-user';
            } else {
                // Neither user nor rider found with this number
                console.log(`No user or rider found with number: ${removeZero}`);
                return res.status(200).type('text/plain').send('');
            }
        }
        
        if (typeOfCall === 'user-to-rider') {
            // Check if it's a user calling and link to current ride
            const rideRequest = await rideRequestModel
                .findOne({ user: checkThisWithOurUser._id, rideStatus: { $in: ['active', 'completed'] } })
                .populate('rider', 'phone')
                .sort({ createdAt: -1 });
            
            if (rideRequest && rideRequest.rider && rideRequest?.rider?.phone) {
                const riderPhone = rideRequest.rider.phone;
              
                const formattedPhone = riderPhone.startsWith('+') ? riderPhone : `+91${riderPhone}`;
                return res.status(200).type('text/plain').send(formattedPhone);
            }
            
            // If no active ride, check for parcel
            const userParcelDetails = await Parcel_Request
                .findOne({ customerId: checkThisWithOurUser._id, is_parcel_delivered: false })
                .populate('rider_id', 'phone')
                .sort({ createdAt: -1 });
                
            if (userParcelDetails && userParcelDetails.rider_id && userParcelDetails.rider_id.phone) {
                const riderPhone = userParcelDetails.rider_id.phone;
                const formattedPhone = riderPhone.startsWith('+') ? riderPhone : `+91${riderPhone}`;
                return res.status(200).type('text/plain').send(formattedPhone);
            }
            
            console.log(`No active ride or parcel found for user ID ${checkThisWithOurUser._id}`);
            return res.status(200).type('text/plain').send('');
        }
        
        if (typeOfCall === 'rider-to-user') {
            // Check if it's a rider calling and link to current ride
            const rideDetails = await rideRequestModel
                .findOne({ rider: checkThisWithOurUser._id, rideStatus: { $in: ['active', 'completed'] } })
                .populate('user', 'number')
                .sort({ createdAt: -1 });
            
            if (rideDetails && rideDetails.user && rideDetails.user.number) {
                const userPhone = rideDetails.user.number;
                const formattedPhone = userPhone.startsWith('+') ? userPhone : `+91${userPhone}`;
                return res.status(200).type('text/plain').send(formattedPhone);
            }
            
            // If no active ride, check for parcel
            const parcelDetails = await Parcel_Request
                .findOne({ rider_id: checkThisWithOurUser._id, is_parcel_delivered: false })
                .populate('customerId', 'number')
                .sort({ createdAt: -1 });
            
            if (parcelDetails && parcelDetails.customerId && parcelDetails.customerId.number) {
                const userPhone = parcelDetails.customerId.number;
                const formattedPhone = userPhone.startsWith('+') ? userPhone : `+91${userPhone}`;
                return res.status(200).type('text/plain').send(formattedPhone);
            }
            
            console.log(`No active ride or parcel found for rider ID ${checkThisWithOurUser._id}`);
            return res.status(200).type('text/plain').send('');
        }
        
    } catch (error) {
        console.error('Error processing the request:', error);
        return res.status(500).type('text/plain').send('Internal Server Error');
    }
};