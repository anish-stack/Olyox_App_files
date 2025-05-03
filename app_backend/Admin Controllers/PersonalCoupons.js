const PersonalCoupon = require("../models/Admin/PersonalCoupons");

exports.createPCoupon = async (req, res) => {
    try {
        const { code, discount, expirationDate, assignedTo, onModel } = req.body;

        // Check if the coupon code already exists
        const existingCoupon = await PersonalCoupon.findOne({ code });
        if (existingCoupon) {
            return res.status(400).json({ message: 'Coupon code already exists' });
        }

        // Create a new coupon
        const newCoupon = new PersonalCoupon({
            code,
            discount,
            expirationDate,
            assignedTo,
            onModel,
        });

        // Save the coupon to the database
        await newCoupon.save();
        return res.status(201).json({ message: 'Coupon created successfully', coupon: newCoupon });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Get all active coupons
exports.getActivePCoupons = async (req, res) => {
    try {
        const activeCoupons = await PersonalCoupon.find({ isActive: true }).populate('assignedTo');
        return res.status(200).json(activeCoupons);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Get a coupon by its ID
exports.getCouponPById = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await PersonalCoupon.findById(id).populate('assignedTo');

        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        return res.status(200).json(coupon);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Update a coupon (e.g., change isActive status or expiration date)
exports.updatePCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const { discount, expirationDate, isActive } = req.body;

        const updatedCoupon = await PersonalCoupon.findByIdAndUpdate(id, {
            discount,
            expirationDate,
            isActive
        }, { new: true });

        if (!updatedCoupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        return res.status(200).json({ message: 'Coupon updated successfully', coupon: updatedCoupon });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Delete a coupon
exports.deletePCoupon = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedCoupon = await PersonalCoupon.findByIdAndDelete(id);

        if (!deletedCoupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        return res.status(200).json({ message: 'Coupon deleted successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
};

exports.getCouponpAById = async (req, res) => {
    try {
        const { id } = req.params;


        let coupons = await PersonalCoupon.find().populate('assignedTo');

        coupons = coupons.filter((item) => item?.assignedTo?._id.toString() === id);


        if (coupons.length === 0) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        // Return the found coupons
        return res.status(200).json({
            success:true,
            data:coupons
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
};
