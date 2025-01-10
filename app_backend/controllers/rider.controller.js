const Rider = require('../models/Rider.model');

// Register a new rider
exports.registerRider = async (req, res) => {
  try {
    const { name, rideVehicleInfo, TotalRides, Ratings, isAvailable, location } = req.body;

    const newRider = new Rider({
      name,
      rideVehicleInfo,
      TotalRides: TotalRides || 0,
      Ratings: Ratings || 0,
      isAvailable: isAvailable || true,
      location,
    });

    const savedRider = await newRider.save();

    res.status(201).json({ message: 'Rider registered successfully', rider: savedRider });
  } catch (error) {
    console.error('Error registering rider:', error);
    res.status(500).json({ error: 'Failed to register rider' });
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
