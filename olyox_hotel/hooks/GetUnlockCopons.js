import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import useHotelApi from "../context/HotelDetails";

const API_URL_APP = `http://192.168.1.11:3100`;

const useGetCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const { findDetails } = useHotelApi(); // Assumes findDetails returns an Axios response

  // Function to fetch coupons
  const fetchCoupons = useCallback(async () => {
    console.log("🔄 Starting fetchCoupons...");
    setLoading(true);

    try {
      const response = await findDetails();
      console.log("✅ Response from findDetails:", response);

      if (!response?.data?.data) {
        console.warn("⚠️ No valid user data found in response.");
        return;
      }

      const userId = response.data.data._id;
      console.log("🆔 Extracted user ID:", userId);

      const couponsRes = await axios.get(
        `${API_URL_APP}/api/v1/admin/personal-coupon/${userId}`
      );

      console.log("🎟️ Coupon response:", couponsRes);

      const couponData = couponsRes.data?.data || [];
      console.log("📦 Coupons fetched:", couponData);

      setCoupons(couponData);
    } catch (error) {
      console.error("❌ Error fetching coupons:", error);
    } finally {
      setLoading(false);
      console.log("✅ fetchCoupons complete.");
    }
  }, []);

  // Fetch coupons on component mount
  useEffect(() => {
    fetchCoupons();
  }, []);

  return {
    coupons,
    loading,
    refresh: fetchCoupons,
  };
};

export default useGetCoupons;
