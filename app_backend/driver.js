const Parcel_Bike_Register = require("./models/Parcel_Models/Parcel_Bike_Register");
const Parcel_Request = require("./models/Parcel_Models/Parcel_Request");

exports.update_parcel_request = async (io, data, driverSocketMap) => {
    try {
        const { order_id, driver_accept, driver_accept_time, driver_id } = data || {};

        const find_parcel = await Parcel_Request.findOne({ _id: order_id });
        if (!find_parcel) {
            return { status: false, message: "Parcel not found" };
        }
        if (find_parcel.driverId || find_parcel.driver_accept) {
            return { status: false, message: "Driver is already assigned" };
        }

        find_parcel.driverId = driver_id;
        find_parcel.driver_accept = driver_accept;
        find_parcel.driver_accept_time = driver_accept_time;

        const findDriver = await Parcel_Bike_Register.findOne({
            _id: driver_id
        })
        if (!findDriver) {
            return { status: false, message: "Driver not found" };
        }
        findDriver.is_on_order = true
        await findDriver.save()
        await find_parcel.save();

        // Remove notification from all riders
        Object.keys(driverSocketMap).forEach((socketId) => {
            io.to(socketId).emit("remove_order_notification", { order_id });
        });

        // Emit message to driver who accepted the ride with full data
        const riderSocketId = driverSocketMap.get(driver_id); // Get socket ID from Map
        if (riderSocketId) {
            io.to(riderSocketId).emit("new_order_accept", { status: true, data: find_parcel });
        }

        return { status: true, message: "Parcel request updated successfully", data: find_parcel };
    } catch (error) {
        return { status: false, message: "An error occurred", error: error.message };
    }
};
