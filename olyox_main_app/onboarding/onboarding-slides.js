import axios from "axios";

exports.slidesFetch = async () => {
    try {
        const { data } = await axios.get('http://192.168.1.2:3100/api/v1/admin/get_onboarding_slides');
        return data?.data; // Safely accessing the nested data property

    } catch (error) {
        // Check if error.response exists to prevent accessing undefined properties
        if (error.response) {
            console.error("Error fetching slides:", error.response.data);
            throw new Error(error.response.data.message || "Failed to fetch");
        } else {
            console.error("Error fetching slides:", error.message);
            throw new Error(error.message || "Failed to fetch");
        }
    }
};
