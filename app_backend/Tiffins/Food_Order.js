const RestuarntOrderModel = require("../models/Tiifins/Restuarnt.Order.model");
const Restuarnt = require("../models/Tiifins/Resturant_register.model");
const Restuarnt_Listing = require("../models/Tiifins/Restaurant.listing.model");

exports.create_order_of_food = async (req, res) => {
    try {

        const user_id = Array.isArray(req.user.user) ? req.user.user[0] : req.user.user;
        console.log(user_id)

        const { order_items, deliveryAddress, paymentMethod, total_payable, coupon_applied, user_lat, user_lng } = req.body;

        // Validate required fields
        if (!order_items || order_items.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Your cart is empty. Please add items to place an order." 
            });
        }

        if (!deliveryAddress?.flatNo || !deliveryAddress?.street || !deliveryAddress?.landmark || !deliveryAddress?.pincode) {
            return res.status(400).json({ 
                success: false, 
                message: "Please provide a complete delivery address, including Flat No, Street, Landmark, and Pincode." 
            });
        }

        if (!user_lat || !user_lng) {
            return res.status(400).json({
                success: false,
                message: "Unable to fetch your current location. Please enable location services and try again."
            });
        }

        if (!paymentMethod) {
            return res.status(400).json({
                success: false,
                message: "Please select a valid payment method before proceeding with the order."
            });
        }

        if (total_payable <= 0) {
            return res.status(400).json({
                success: false,
                message: "Total payable amount must be greater than zero."
            });
        }

        let items_For_Order = []

        // Check food availability
        for (let i = 0; i < order_items.length; i++) {
            const item = order_items[i];
            const foodItem = await Restuarnt_Listing.findById(item._id);

            if (!foodItem) {
                return res.status(404).json({
                    success: false,
                    message: `Food item with ID ${item._id} not found. Please check your cart.`
                });
            }

            if (!foodItem.food_availability) {
                return res.status(400).json({
                    success: false,
                    message: `Sorry, "${foodItem.food_name}" is currently unavailable. Please choose another item.`
                });
            }
            items_For_Order.push({
                foodItem_id:foodItem._id,
                quantity:item.quantity,
                price:foodItem?.food_price
            })
        }

        // Generate a unique order ID
        const orderCount = await RestuarntOrderModel.countDocuments();
        const orderId = `ORDF${(orderCount + 1).toString().padStart(6, '0')}`;

        // Create new order
        const newOrder = new RestuarntOrderModel({
            order_id: orderId,
            user: user_id, 
            restaurant: order_items[0]?.restaurant_id, // Assuming all items are from the same restaurant
            address_details: deliveryAddress,
            user_current_location: {
                type: "Point",
                coordinates: [user_lng, user_lat]
            },
            items: items_For_Order,
            totalPrice: total_payable,
            coupon_which_applied: coupon_applied || null,
            paymentMethod,
            status: "Pending"
        });

        console.log(newOrder)

        await newOrder.save();

        return res.status(201).json({
            success: true,
            message: "Your order has been placed successfully! You will receive a confirmation shortly.",
            orderDetails: newOrder
        });

    } catch (error) {
        console.error("Error placing order:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while processing your order. Please try again later.",
            error: error.message
        });
    }
};
