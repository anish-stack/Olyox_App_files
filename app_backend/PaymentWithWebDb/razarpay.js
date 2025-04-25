
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
const settings = require('../models/Admin/Settings');
const { createRechargeLogs } = require('../Admin Controllers/Bugs/rechargeLogs');


const FIRST_RECHARGE_COMMISONS = 10
const SECOND_RECHARGE_COMMISONS = 2


const check_user_presence = async (user_id) => {
    try {
        const response = await axios.post(`https://www.webapi.olyox.com/api/v1/check-bh-id`, {
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
            razorpay_signature
        } = req.body;

        const { BHID } = req.params || {};
        const RechargeModel = getRechargeModel();
        const MembershipPlan = getMembershipPlanModel();
        const VendorModel = await getvendorModel();
        const ActiveReferral_Model = getActiveReferralSchema();

        // Step 1: Validate request body
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: 'Missing required payment information.' });
        }

        // Step 2: Validate Razorpay signature
        const isSignatureValid = validatePaymentVerification(
            { order_id: razorpay_order_id, payment_id: razorpay_payment_id },
            razorpay_signature,
            process.env.RAZORPAY_KEY_SECRET
        );

        if (!isSignatureValid) {
            return res.status(400).json({ message: 'Invalid Razorpay payment signature.' });
        }

        // Step 3: Fetch recharge data
        if (!RechargeModel) {
            return res.status(500).json({ message: 'Recharge model not found.' });
        }

        const rechargeData = await RechargeModel.findOne({ razarpay_order_id: razorpay_order_id });
        if (!rechargeData) {
            return res.status(404).json({ message: 'Recharge entry not found.' });
        }

        // Step 4: Fetch membership plan
        const plan = await MembershipPlan.findById(rechargeData?.member_id);
        if (!plan) {
            return res.status(400).json({ message: 'Invalid or missing membership plan.' });
        }

        // Step 5: Fetch vendor
        const user = await VendorModel.findById(rechargeData?.vendor_id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const isFirstRecharge = !user?.payment_id;

        // Step 6: Calculate plan end date
        const endDate = new Date();
        const { whatIsThis, validityDays } = plan;

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

        // Step 7: Update recharge data
        rechargeData.razorpay_payment_id = razorpay_payment_id;
        rechargeData.razorpay_status = 'paid';
        rechargeData.end_date = endDate;
        rechargeData.trn_no = razorpay_payment_id;
        rechargeData.payment_approved = true;

        // Step 8: Handle referral update
        const referral = await ActiveReferral_Model.findOne({ contactNumber: user.number });
        if (referral && user.recharge === 1) {
            referral.isRecharge = true;
            await referral.save();
        }

        // Step 9: Update user info
        user.payment_id = rechargeData?._id;
        user.recharge += 1;
        user.plan_status = true;
        user.member_id = plan?._id;
        await user.save();

        // Step 10: Trigger approval API
        try {
            await axios.get(`https://www.webapi.olyox.com/api/v1/approve_recharge?_id=${rechargeData?._id}`);
        } catch (error) {
            const logsData = {
                BHID: user.my_referral_id,
                amount: plan?.price,
                plan: plan?.title,
                transactionId: razorpay_payment_id,
                status: "FAILED",
                error_msg: error?.response?.data?.message || error.message || "Error is Undefined",
                paymentMethod: "PAYPAL"
            };
            await createRechargeLogs({ data: logsData });

            const errorAlert = `⚠️ Recharge Verification Failed\n\nUser: ${user?.name || 'Unknown'}\nNumber: ${user?.number || 'N/A'}\nPlan: ${plan?.title || 'N/A'}\nTransaction ID: ${razorpay_payment_id || 'N/A'}\n\nPlease investigate this issue.`;
            await SendWhatsAppMessage(errorAlert, process.env.ADMIN_WHATSAPP_NUMBER);


        }

        await rechargeData.save();

        // Step 11: Update external recharge details
        const updateResult = await updateRechargeDetails({
            rechargePlan: plan?.title,
            expireData: endDate,
            approveRecharge: true,
            BH: user?.myReferral
        });

        if (!updateResult?.success) {
            return res.status(400).json({ message: 'Failed to update recharge details.' });
        }

        // Step 12: Send WhatsApp notifications
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
