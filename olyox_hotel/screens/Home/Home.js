import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Switch,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import useHotelApi from '../../context/HotelDetails';
import styles, { colors } from './styles';
import Layout from '../../components/Layout/Layout';
import { useNavigation } from '@react-navigation/native';
import useAnalyticData from '../../hooks/useAnyliticData';
import { BlurView } from 'expo-blur';

export default function HotelDashboard() {
  const { findDetails, toggleHotel } = useHotelApi();
  const { data, loading: dataLoading } = useAnalyticData();
  const [hotelData, setHotelData] = useState(null);
  const [workStatus, setWorkStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    fetchHotelData();
  }, []);

  const fetchHotelData = async () => {
    setLoading(true);
    try {
      const response = await findDetails();
      if (response.success) {
        setHotelData(response.data.data);
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
          newStatus
            ? 'Hotel is now Online and accepting bookings'
            : 'Hotel is now Offline and not accepting bookings'
        );
      } else {
        setWorkStatus(!newStatus);
        Alert.alert('Update Failed', response.message || 'Failed to update status');
      }
    } catch (err) {
      setWorkStatus(!newStatus);
      Alert.alert('Error', 'An error occurred while updating status');
    }
  };

  const handleRefresh = useCallback(() => {
    setRefresh(true);
    fetchHotelData().finally(() => setRefresh(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={50} color={colors.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchHotelData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const StatCard = ({ icon, label, value, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <FontAwesome5 name={icon} size={24} color={color} style={styles.statIcon} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );

  return (
    <Layout
      data={hotelData}
      title={hotelData?.hotel_name}
      profileImages="https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg"
    >
      <ScrollView
      showsVerticalScrollIndicator={false}
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refresh} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.hotelName}>
            {hotelData?.hotel_name || 'Not Available'}
          </Text>
          <View style={styles.statusContainer}>
            <Switch
              value={workStatus}
              onValueChange={handleToggle}
              trackColor={{
                false: colors.danger,
                true: colors.success,
              }}
              thumbColor={colors.white}
            />
            <Text
              style={[
                styles.statusText,
                workStatus ? styles.onlineText : styles.offlineText,
              ]}
            >
              {workStatus ? 'Online - Accepting Bookings' : 'Offline'}
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon="money-bill-wave"
            label="Total Earnings"
            value={`₹${data?.totalEarnings || 0}`}
            color={colors.success}
          />
          <StatCard
            icon="gift"
            label="Referral Balance"
            value={`₹${data?.referralBalance || 0}`}
            color={colors.info}
          />
          <StatCard
            icon="calendar-check"
            label="Total Bookings"
            value={data?.totalBookings || 0}
            color={colors.primary}
          />
          <StatCard
            icon="clock"
            label="Pending Bookings"
            value={data?.pendingBookings || 0}
            color={colors.warning}
          />
          <StatCard
            icon="check-circle"
            label="Completed Bookings"
            value={data?.completedBookings || 0}
            color={colors.success}
          />
          <StatCard
            icon="times-circle"
            label="Rejected Bookings"
            value={data?.rejectedBookings || 0}
            color={colors.danger}
          />
          <StatCard
            icon="hotel"
            label="Total Rooms"
            value={data?.totalRooms || 0}
            color={colors.primary}
          />
          <StatCard
            icon="bed"
            label="Occupied Rooms"
            value={data?.occupiedRooms || 0}
            color={colors.warning}
          />
          <StatCard
            icon="box"
            label="Total Packages"
            value={data?.totalPackages || 0}
            color={colors.info}
          />
          <StatCard
            icon="box-open"
            label="Running Packages"
            value={data?.runningPackages || 0}
            color={colors.success}
          />
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Additional Information</Text>
          <Text style={styles.infoText}>
            Plan Expires: {new Date(data?.planExpire).toLocaleDateString()}
          </Text>
          <Text style={styles.infoText}>
            Highest Booking Month: {data?.highestBookingMonth}
          </Text>
          <Text style={styles.infoText}>
            Last Recharge: {data?.lastRecharge} time(s)
          </Text>
          <Text style={styles.infoText}>
            Average Rating: {data?.averageRating || 'No Reviews'}
          </Text>
          <Text style={styles.infoText}>
            Online Payments: {data?.modeCounts?.online || 0}
          </Text>
          <Text style={styles.infoText}>
            Cash/Hotel Payments: {data?.modeCounts?.cashOrPayAtHotel || 0}
          </Text>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Booking-create')}
      >
        <BlurView intensity={100} tint="light" style={styles.fabBlur}>
          <FontAwesome5 name="plus" size={24} color={colors.primary} />
        </BlurView>
      </TouchableOpacity>
    </Layout>
  );
}