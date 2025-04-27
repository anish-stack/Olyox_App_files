const Heavy_vehicle_partners = require('../../models/Heavy_vehicle/Heavy_vehicle_partners');
const CallAndMessageRequest = require('../../models/Heavy_vehicle/CallAndMessageRequest');
const SendWhatsAppMessage = require('../../utils/whatsapp_send');
const User = require('../../models/normal_user/User.model');
exports.getheaveyPartners = async (req, res) => {
    try {
        const { lat, lng, page = 1, limit = 10 } = req.query;
        const pageInt = parseInt(page);
        const limitInt = parseInt(limit);
        const skip = (pageInt - 1) * limitInt;

        const baseQuery = {
            status: "Active",
            is_blocked: false,
            name: { $ne: null },
            phone_number: { $ne: null },
            isAlldocumentsVerified: true
        };

        let partners = [];
        let totalCount = 0;
        let resultType = "All Partners (No location provided)";

        const getPartnersWithLocation = async (radiusInMeters) => {
            const query = {
                ...baseQuery,
                'service_areas.location': {
                    $geoWithin: {
                        $centerSphere: [
                            [parseFloat(lng), parseFloat(lat)],
                            radiusInMeters / 6378137 // radius in radians (Earth radius in meters)
                        ]
                    }
                }
            };

            const foundPartners = await Heavy_vehicle_partners.find(query)
                .populate('vehicle_info')
                .select('-documents')
                .skip(skip)
                .limit(limitInt);

            const count = await Heavy_vehicle_partners.countDocuments(query);

            return { foundPartners, count };
        };

        if (lat && lng) {
            let locationSearch = await getPartnersWithLocation(5000); // 5 km
            partners = locationSearch.foundPartners;
            totalCount = locationSearch.count;
            resultType = "Nearby Partners (within 5 km)";

            if (partners.length === 0) {
                locationSearch = await getPartnersWithLocation(15000); // 15 km
                partners = locationSearch.foundPartners;
                totalCount = locationSearch.count;
                resultType = "Nearby Partners (within 15 km)";
            }

            if (partners.length === 0) {
                partners = await Heavy_vehicle_partners.find(baseQuery)
                    .populate('vehicle_info')
                    .select('-documents')
                    .skip(skip)
                    .limit(limitInt);

                totalCount = await Heavy_vehicle_partners.countDocuments(baseQuery);
                resultType = "All Partners (No location match)";
            }

        } else {
            partners = await Heavy_vehicle_partners.find(baseQuery)
                .populate('vehicle_info')
                .select('-documents')
                .skip(skip)
                .limit(limitInt);

            totalCount = await Heavy_vehicle_partners.countDocuments(baseQuery);
        }

        return res.status(200).json({
            resultType,
            page: pageInt,
            limit: limitInt,
            totalPages: Math.ceil(totalCount / limitInt),
            totalCount,
            partners
        });

    } catch (error) {
        console.error("Error fetching heavy vehicle partners:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};


exports.CreateCallAndMessageRequest = async (req, res) => {
    try {
        const { senderId, receiverId, requestType, message } = req.body;

       
        if (!requestType) {
            return res.status(400).json({ message: "Please select a request type (Call or Message)." });
        }

        if (!['call', 'message'].includes(requestType)) {
            return res.status(400).json({ message: "Invalid request type. Only 'call' or 'message' are allowed." });
        }

       
        const partner = await Heavy_vehicle_partners.findById(receiverId);
        if (!partner) {
            return res.status(404).json({ message: "We couldn’t find the selected partner. Please try again." });
        }

        const user = await User.findById(senderId);
       

        const newRequest = new CallAndMessageRequest({
            senderId,
            receiverId,
            requestType,
            message
        });

        const savedRequest = await newRequest.save();

   
        let notificationMessage = '';
        if (requestType === 'call') {
            notificationMessage = `Hello ${partner.name || ''},\nYou have received a new *CALL* request from ${user.name} (${user.number || 'N/A'}).\nPlease reach out to them as soon as possible.`;
        } else if (requestType === 'message') {
            notificationMessage = `Hello ${partner.name || ''},\nYou have received a new *MESSAGE* from ${user.name} (${user.number || 'N/A'}).\nMessage: "${message || 'No message provided.'}"`;
        }

        SendWhatsAppMessage(notificationMessage, partner.phone_number);

        // Respond to user
        return res.status(201).json({
            message: `Your ${requestType === 'call' ? 'call' : 'message'} request has been sent to the partner successfully.`,
            request: savedRequest
        });

    } catch (error) {
        console.error("Error while creating request:", error);
        return res.status(500).json({ message: "Sorry, something went wrong on our end. Please try again later." });
    }
};



exports.getAllCallAndMessage = async (req, res) => {
    try {
        const data = await CallAndMessageRequest.find()
            .populate('receiverId')
            .populate('senderId');


        if (!data) {
            return res.status(404).json({ message: 'No call or message records found' });
        }

      
        res.status(200).json({
            success:true,
            data:data
        });
    } catch (error) {
        // Catch any errors that occur during the query execution
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

