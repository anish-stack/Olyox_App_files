const RidesSuggestion = require('../../models/Admin/RidesSuggestion.model')

exports.createSuggestion = async (req, res) => {
    try {
        const { name, type, description, time, priceRange } = req.body;

        if (!name || !type || !description || !time || !priceRange) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const newSuggestion = new RidesSuggestion({ name, type, description, time, priceRange });
        await newSuggestion.save();

        res.status(201).json({ success: true, message: "Ride suggestion created successfully", data: newSuggestion });

    } catch (error) {
        console.error("Error creating ride suggestion:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};


exports.getAllSuggestions = async (req, res) => {
    try {
        const suggestions = await RidesSuggestion.find();
        res.status(200).json({ success: true, data: suggestions });
    } catch (error) {
        console.error("Error fetching suggestions:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};


exports.getSuggestionById = async (req, res) => {
    try {
        const suggestion = await RidesSuggestion.findById(req.params.id);

        if (!suggestion) {
            return res.status(404).json({ success: false, message: "Ride suggestion not found" });
        }

        res.status(200).json({ success: true, data: suggestion });

    } catch (error) {
        console.error("Error fetching suggestion:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};


exports.updateSuggestion = async (req, res) => {
    try {
        const updatedSuggestion = await RidesSuggestion.findByIdAndUpdate(req.params.id, req.body, { new: true });

        if (!updatedSuggestion) {
            return res.status(404).json({ success: false, message: "Ride suggestion not found" });
        }

        res.status(200).json({ success: true, message: "Ride suggestion updated", data: updatedSuggestion });

    } catch (error) {
        console.error("Error updating suggestion:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};


exports.deleteSuggestion = async (req, res) => {
    try {
        const deletedSuggestion = await RidesSuggestion.findByIdAndDelete(req.params.id);

        if (!deletedSuggestion) {
            return res.status(404).json({ success: false, message: "Ride suggestion not found" });
        }

        res.status(200).json({ success: true, message: "Ride suggestion deleted" });

    } catch (error) {
        console.error("Error deleting suggestion:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
