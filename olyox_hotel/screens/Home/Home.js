import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Switch,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Animated
} from 'react-native';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import useHotelApi from '../../context/HotelDetails';
import styles, { colors } from './styles';
import { SafeAreaView } from 'react-native-safe-area-context';
import Layout from '../../components/Layout/Layout';

export default function HotelDashboard() {
  const { findDetails, toggleHotel } = useHotelApi();
  const [hotelData, setHotelData] = useState(null);
  const [listingData, setListingData] = useState([]);
  const [workStatus, setWorkStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mock data for the dashboard cards
  const [dashboardStats, setDashboardStats] = useState({
    totalRooms: 24,
    occupiedRooms: 18,
    activePackages: 5,
    pendingBookings: 3
  });

  useEffect(() => {
    fetchHotelData();
  }, []);

  const fetchHotelData = async () => {
    setLoading(true);
    try {
      const response = await findDetails();
      if (response.success) {
        setHotelData(response.data.data);
        setListingData(response.data.listings);
        setWorkStatus(response.data.data?.isOnline || false);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError('Failed to fetch hotel data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    const newStatus = !workStatus;
    setWorkStatus(newStatus);

    try {
      const response = await toggleHotel({ status: newStatus });
      if (response.success) {
        Alert.alert(
          'Status Updated',
          newStatus ? 'Hotel is now Online and accepting bookings' : 'Hotel is now Offline and not accepting bookings'
        );
      } else {
        setWorkStatus(!newStatus); // Revert if failed
        Alert.alert('Update Failed', response.message || 'Failed to update status');
      }
    } catch (err) {
      setWorkStatus(!newStatus); // Revert if failed
      Alert.alert('Error', 'An error occurred while updating status');
    }
  };

  const handleNewBooking = () => {
    Alert.alert('New Booking', 'Navigate to booking screen');
    // Navigation would go here in a real implementation
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primaryViolet} />
        <Text style={{ marginTop: 10, color: colors.darkGray }}>Loading hotel information...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={50} color={colors.primaryRed} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={[styles.newBookingButton, { marginTop: 20, backgroundColor: colors.primaryViolet }]}
          onPress={fetchHotelData}
        >
          <Text style={styles.newBookingText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Format amenities for display
  const formatAmenityName = (name) => {
    return name.replace(/([A-Z])/g, ' $1').trim();
  };

  // Filter active amenities
  const activeAmenities = hotelData?.amenities ?
    Object.entries(hotelData.amenities)
      .filter(([_, value]) => value)
      .map(([key, _]) => key) :
    [];

  return (
    // <SafeAreaView style={{ flex: 1 }}>
    <Layout data={hotelData} title={hotelData?.hotel_name} profileImages={"https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg"} >

      <View style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Hotel Header Card */}
          <View style={styles.headerContainer}>
            <Text style={styles.hotelName}>{hotelData?.hotel_name || "Not Aviable"}</Text>

            <View style={styles.statusContainer}>
              <Switch
                value={workStatus}
                onValueChange={handleToggle}
                trackColor={{ false: colors.primaryRed, true: colors.primaryGreen }}
                thumbColor={colors.primaryWhite}
                ios_backgroundColor={colors.lightRed}
              />
              <Text style={[
                styles.statusText,
                workStatus ? styles.onlineText : styles.offlineText
              ]}>
                {workStatus ? 'Online - Accepting Bookings' : 'Offline - Not Available'}
              </Text>
            </View>



            <View style={styles.detailsContainer}>
              <Text style={styles.ownerName}>{hotelData?.hotel_owner}</Text>
              <Text style={styles.addressText}>{hotelData?.hotel_address}</Text>
              <Text style={styles.phoneText}>
                <MaterialIcons name="phone" size={14} color={colors.darkGray} /> {hotelData?.hotel_phone}
              </Text>
            </View>
          </View>

          {/* Dashboard Cards */}
          <Text style={styles.sectionTitle}>Dashboard</Text>
          <View style={styles.cardsContainer}>
            <View style={styles.card}>
              <FontAwesome5 name="door-open" size={24} color={colors.primaryViolet} />
              <Text style={styles.cardTitle}>Total Rooms</Text>
              <Text style={styles.cardValue}>{listingData.length || 0}</Text>
            </View>

            <View style={styles.card}>
              <FontAwesome5 name="bed" size={24} color={colors.primaryRed} />
              <Text style={styles.cardTitle}>Occupied Rooms</Text>
              <Text style={[styles.cardValue, { color: colors.primaryRed }]}>
                {dashboardStats.occupiedRooms}
              </Text>
            </View>

            <View style={styles.card}>
              <FontAwesome5 name="box" size={24} color={colors.primaryGreen} />
              <Text style={styles.cardTitle}>Active Packages</Text>
              <Text style={[styles.cardValue, { color: colors.primaryGreen }]}>
                {dashboardStats.activePackages}
              </Text>
            </View>

            <View style={styles.card}>
              <FontAwesome5 name="calendar-check" size={24} color={colors.warningYellow} />
              <Text style={styles.cardTitle}>Pending Bookings</Text>
              <Text style={[styles.cardValue, { color: colors.warningYellow }]}>
                {dashboardStats.pendingBookings}
              </Text>
            </View>
          </View>

          {/* Amenities Section */}
          <Text style={styles.sectionTitle}>Available Amenities</Text>
          <View style={styles.amenitiesContainer}>
            {activeAmenities.length > 0 ? (
              <View style={styles.amenitiesGrid}>
                {activeAmenities.map((amenity) => (
                  <View key={amenity} style={styles.amenityItem}>
                    <MaterialIcons name="check-circle" size={20} color={colors.primaryGreen} />
                    <Text style={styles.amenityText}>{formatAmenityName(amenity)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ color: colors.primaryRed, textAlign: 'center' }}>
                No amenities available
              </Text>
            )}
          </View>

          {/* New Booking Button */}
          <TouchableOpacity style={styles.newBookingButton} onPress={handleNewBooking}>
            <Text style={styles.newBookingText}>Create New Booking</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Layout>
    // </SafeAreaView>
  );
}