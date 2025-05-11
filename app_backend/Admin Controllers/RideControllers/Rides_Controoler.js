const RidesSuggestion = require('../../models/Admin/RidesSuggestion.model');
const RideSubSuggestionModel = require('../../models/Admin/RideSubSuggestion.model');
const { uploadSingleImage, deleteImage } = require('../../utils/cloudinary');

exports.createSuggestion = async (req, res) => {
    try {
        const { name, type, description, time, priceRange } = req.body;

        if (!name || !type || !description || !time || !priceRange) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const newSuggestion = new RidesSuggestion({ name, type, description, time, priceRange });
        // console.log("req.file)",req.file)
        if (req.file) {
            const imgUrl = await uploadSingleImage(req.file.buffer)
            // console.log("imgUrl",imgUrl)
            const { image, public_id } = imgUrl;
            // console.log("image, public_id",image, public_id)
            newSuggestion.icons_image.url = image;
            newSuggestion.icons_image.public_id = public_id
        }
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
        if (req.file) {
            try {
                if (updatedSuggestion.icons_image.public_id) {
                    await deleteImage(updatedSuggestion.icons_image.public_id)
                }
                const imgUrl = await uploadSingleImage(req.file.buffer)
                const { image, public_id } = imgUrl;
                // const {image, public_id} = imgUrl;
                // console.log('image, public_id',image, public_id)
                updatedSuggestion.icons_image.url = image;
                updatedSuggestion.icons_image.public_id = public_id
            } catch (error) {
                console.error("Image upload failed:", error.message);
            }

        }

        await updatedSuggestion.save();

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

exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const updatedSuggestion = await RidesSuggestion.findByIdAndUpdate(id, { status }, { new: true });
        res.status(200).json({
            success: true,
            message: 'Status updated successfully',
            data: updatedSuggestion
        })
    } catch (error) {
        console.log("Internal server error", error);
        res.status(500).json({
            success: false,
            message: 'Internal server error. Please try again later.',
            error: error.message
        })
    }
}


exports.addRideSubSuggestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { subCategory } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: "Invalid Ride Suggestion Category" });
        }

        const foundSuggestion = await RidesSuggestion.findById(id);
        if (!foundSuggestion) {
            return res.status(404).json({ success: false, message: "Ride Suggestion not found" });
        }

        if (!subCategory || subCategory.length === 0) {
            return res.status(400).json({ success: false, message: "Sub Category cannot be empty" });
        }

        const newEntry = await RideSubSuggestionModel.create({
            categoryId: foundSuggestion._id,
            subCategory
        });

        res.status(201).json({ success: true, data: newEntry });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

// Read All
exports.getAllRideSubSuggestions = async (req, res) => {
    try {
        const all = await RideSubSuggestionModel.find().populate("categoryId");
        res.status(200).json({ success: true, data: all });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

// Read By Category ID
exports.getByCategoryId = async (req, res) => {
    try {
        const { id } = req.params;
        const found = await RideSubSuggestionModel.find({ categoryId: id }).populate("categoryId");

        if (!found || found.length === 0) {
            return res.status(404).json({ success: false, message: "No Sub Suggestions Found for this Category" });
        }

        res.status(200).json({ success: true, data: found });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

// Update
exports.updateRideSubSuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { oldValue, newValue } = req.body;

    // Fetch the document
    const doc = await RideSubSuggestionModel.findById(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Sub Suggestion not found" });
    }

    // Find index of the old value
    const index = doc.subCategory.indexOf(oldValue);
    if (index === -1) {
      return res.status(400).json({ success: false, message: "Old sub-category not found in the array" });
    }

    // Update the specific sub-category
    doc.subCategory[index] = newValue;

    // Save the updated document
    await doc.save();

    res.status(200).json({ success: true, message: "Sub-category updated successfully", data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// Delete
exports.deleteRideSubSuggestion = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await RideSubSuggestionModel.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Sub Suggestion not found" });
        }

        res.status(200).json({ success: true, message: "Sub Suggestion deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};