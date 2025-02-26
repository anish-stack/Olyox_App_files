import axios from 'axios';
import { API_BASE_URL_V2 } from '../constant/Api';
import { useToken } from './AuthContext';

const useHotelApi = () => {
  const { token, isLoggedIn } = useToken();

  const findDetails = async () => {
    if (!isLoggedIn) {
      return { success: false, message: "Please login first." };
    }

    try {
      const response = await axios.get(`${API_BASE_URL_V2}/find-Me-Hotel`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: "Unexpected response from server." };
      }
    } catch (error) {
      console.error("Error fetching hotel details:", error);

      return {
        success: false,
        message: error.response?.data?.message || "An error occurred. Please try again.",
      };
    }
  };


  const toggleHotel = async ({status}) => {
    if (!isLoggedIn) {
      return { success: false, message: "Please login first." };
    }

    try {
      const response = await axios.post(`${API_BASE_URL_V2}/toggle-hotel`,{status}, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: "Unexpected response from server." };
      }
    } catch (error) {
      console.error("Error online hotel:", error);

      return {
        success: false,
        message: error.response?.data?.message || "An error occurred. Please try again.",
      };
    }
  };



  return { findDetails ,toggleHotel};
};

export default useHotelApi;
