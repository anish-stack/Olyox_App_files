
const Razorpay = require('razorpay');
const axios = require('axios');
const { getMembershipPlanModel, getRechargeModel, getActiveReferralSchema, getvendorModel } = require('./db');
var { validatePaymentVerification } = require('razorpay/dist/utils/razorpay-utils');
const SendWhatsAppMessage = require('../utils/whatsapp_send');
const { updateRechargeDetails } = require('../utils/Api.utils');
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});


const check_user_presence = async (user_id) => {
    try {
        const response = await axios.post(`https://api.olyox.com/api/v1/check-bh-id`, {
            bh: user_id
        });
        return response.data?.complete;
    } catch (error) {
        console.error('Error checking user presence:', error.message);
        throw new Error(error.response.data.message || error.message || "Please reload the screen");
    }
}


exports.make_recharge = async (req, res) => {
    try {
        const { package_id, user_id } = req.params || {};
        const MembershipPlan = getMembershipPlanModel();
        const RechargeModel = getRechargeModel();

        if (!user_id) {
            return res.status(400).json({ message: 'Please login to recharge.' });
        }

        if (!package_id) {
            return res.status(400).json({ message: 'Please select a package to recharge.' });
        }


        const selectedPackage = await MembershipPlan.findById(package_id);

        console.log('Selected Package:', selectedPackage);

        if (!selectedPackage) {
            return res.status(404).json({ message: 'Selected package not found. Please try again.' });
        }

        const { price: package_price, title: package_name, description: package_description } = selectedPackage;


        if (!package_price || package_price <= 0) {
            return res.status(400).json({ message: 'Invalid package price. Please contact support.' });
        }

        const userCheck = await check_user_presence(user_id);

        console.log('Selected User:', userCheck?._id);

        if (!userCheck) {
            return res.status(404).json({ message: 'User not found. Please contact support.' });
        }


        // Create Razorpay order
        const orderOptions = {
            amount: package_price * 100, 
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            notes: {
                user_id,
                package_name,
                package_description,
                package_price
            }
        };

        const razorpayOrder = await razorpayInstance.orders.create(orderOptions);

        if (!razorpayOrder) {
            return res.status(500).json({ message: 'Failed to create Razorpay order.' });
        }


        const rechargeData = new RechargeModel({
            vendor_id: userCheck?._id,
            member_id: package_id,
            amount: package_price,
            razarpay_order_id: razorpayOrder.id,
            razorpay_payment_id: null,
            razorpay_status: razorpayOrder.status,


        });
        await rechargeData.save();
        console.log('Recharge Data:', rechargeData);
        return res.status(200).json({
            message: 'Recharge initiated successfully.',
            order: razorpayOrder,
            data: rechargeData
        });

    } catch (error) {
        console.error('Recharge Error:', error.message);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

exports.verify_recharge = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,

        } = req.body;
        console.log("req.method", req.method);
        console.log("req.headers", req.headers);
        console.log("req.body", req.body);
        const { BHID } = req.params || {};
        console.log("req.body", req.body)
        console.log("req.query ", req.params)
        // Validate request body
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: 'Missing required payment information.' });
        }

        // Validate Razorpay signature
        const isSignatureValid = validatePaymentVerification(
            { order_id: razorpay_order_id, payment_id: razorpay_payment_id },
            razorpay_signature,
            process.env.RAZORPAY_KEY_SECRET
        );

        console.log("isSignatureValid", isSignatureValid)
        if (!isSignatureValid) {
            return res.status(400).json({ message: 'Invalid Razorpay payment signature.' });
        }

        // Fetch recharge entry from DB
        const RechargeModel = getRechargeModel();
        console.log("RechargeModel", RechargeModel)
        if (!RechargeModel) {
            return res.status(500).json({ message: 'Recharge model not found.' });
        }
        const rechargeData = await RechargeModel.findOne({ razarpay_order_id: razorpay_order_id })

        if (!rechargeData) {
            return res.status(404).json({ message: 'Recharge entry not found.' });
        }
        console.log("rechargeData", rechargeData)

        // Get membership plan
        const MembershipPlan = getMembershipPlanModel();
        const plan = await MembershipPlan.findById(rechargeData?.member_id);

        console.log("plan", plan)

        if (!plan) {
            return res.status(400).json({ message: 'Invalid or missing membership plan.' });
        }

        // Check user presence

        const vendor = await getvendorModel();
        const user = await vendor.findById(rechargeData?.vendor_id);
        console.log("user", user)
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const isFirstRecharge = !user?.payment_id;

        // Calculate plan end date
        const { whatIsThis, validityDays } = plan;
        const endDate = new Date();

        switch (whatIsThis) {
            case 'Day':
                endDate.setDate(endDate.getDate() + validityDays);
                break;
            case 'Month':
                endDate.setMonth(endDate.getMonth() + validityDays);
                break;
            case 'Year':
                endDate.setFullYear(endDate.getFullYear() + validityDays);
                break;
            case 'Week':
                endDate.setDate(endDate.getDate() + (validityDays * 7));
                break;
            default:
                return res.status(400).json({ message: "Invalid validity unit in membership plan." });
        }

        // Update recharge data
        rechargeData.razorpay_payment_id = razorpay_payment_id;
        rechargeData.razorpay_status = 'paid';
        rechargeData.end_date = endDate;
        rechargeData.trn_no = razorpay_payment_id;
        rechargeData.payment_approved = true;

        // Handle referral status update
        const ActiveReferral_Model = getActiveReferralSchema();
        const referral = await ActiveReferral_Model.findOne({ contactNumber: user.number });
        if (referral && user.recharge === 1) {
            referral.isRecharge = true;
            await referral.save();
        }

        // Update user data
        user.payment_id = rechargeData?._id;
        user.recharge += 1;
        user.plan_status = true;
        user.member_id = plan?._id;
        await user.save();

        await rechargeData.save();
        const datas = await updateRechargeDetails({
            rechargePlan: plan?.title,
            expireData: endDate,
            approveRecharge: true,
            BH: user?.myReferral
        })
        

        if (!datas?.success) {
            return res.status(400).json({ message: 'Failed to update recharge details.' });
        }
        // await riders.save();
        console.log("save rechargeData", rechargeData)
  
        const vendorMessage = `Dear ${user.name},\n\n✅ Your recharge is successful!\nPlan: ${plan.title}\nAmount: ₹${plan.price}\nTransaction ID: ${razorpay_payment_id}\n\nThank you for choosing us!`;

        const adminMessage = `🔔 New Recharge Received\n\nDetails:\n- Transaction ID: ${razorpay_payment_id}\n- Plan: ${plan.title}\n- Amount: ₹${plan.price}\n- Vendor Name: ${user.name}\n- Contact: ${user.number}`;

        await SendWhatsAppMessage(vendorMessage, user.number);
        await SendWhatsAppMessage(adminMessage, process.env.ADMIN_WHATSAPP_NUMBER);

        return res.status(200).json({
            message: "Recharge successful. Payment verified.",
            rechargeData
        });

    } catch (error) {
        console.error("Error verifying recharge:", error);
        return res.status(500).json({
            message: "An error occurred while verifying the payment. Please try again later.",
            error: error?.message || "Internal Server Error"
        });
    }
};
