const rideRequestModel = require("../models/ride.request.model");
const User = require('../models/normal_user/User.model');

exports.webhookExotelApi = async (req, res) => {
    try {
        const { CallFrom } = req.query;
        if (!CallFrom) {
            return res.status(400).type('text/plain').send('');
        }

        const removeZero = CallFrom.replace(/^0+/, '');
        console.log('Processed CallFrom:', removeZero);

        const checkThisWithOurUser = await User.findOne({ number: removeZero });
        if (!checkThisWithOurUser) {
            console.log(`User with number ${removeZero} not found`);
            return res.status(200).type('text/plain').send('');
        }

        const rideRequest = await rideRequestModel
            .findOne({ user: checkThisWithOurUser._id })
            .populate('rider', 'phone')
            .sort({ createdAt: -1 });

        if (!rideRequest || !rideRequest.rider || !rideRequest.rider.phone) {
            console.log(`No ride request or rider phone found for user ID ${checkThisWithOurUser._id}`);
            return res.status(200).type('text/plain').send('');
        }

        const riderPhone = rideRequest.rider.phone;

        // Ensure phone number is in proper format (e.g. +91...)
        const formattedPhone = riderPhone.startsWith('+') ? riderPhone : `+91${riderPhone}`;

        res.status(200).type('text/plain').send(formattedPhone);

    } catch (error) {
        console.error('Error processing the request:', error);
        res.status(200).type('text/plain').send('');
    }
};
