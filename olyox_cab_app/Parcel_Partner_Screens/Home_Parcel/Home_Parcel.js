import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ActivityIndicator,
    ScrollView,
    RefreshControl,
    TouchableOpacity
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Audio } from "expo-av";
import { styles } from './styles';
import OnlineStatusToggle from './OnlineStatusToggle';
import UserProfileCard from './UserProfileCard';
import WorkStatusCard from './WorkStatusCard';
import NewOrder from '../Other_Parcel_Screens/New_Order/NewOrder';
import { useSocket } from '../../context/SocketContext';
import initializeSocket from '../../context/socketService';

const API_BASE_URL = 'http://192.168.1.3:3000/api/v1/parcel';

export default function Home_Parcel({ navigation }) {
    const { socket, isSocketReady } = useSocket();
    const [userData, setUserData] = useState(null);
    const [workStatus, setWorkStatus] = useState(null);
    const [statusOfPartner, setStatus] = useState(false);
    const [order, setOrder] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sound, setSound] = useState(null);

    const playSound = async () => {
        try {
            const { sound } = await Audio.Sound.createAsync(require("./Box.mp3"));
            setSound(sound);
            await sound.playAsync();
        } catch (error) {
            console.error("Error playing sound:", error);
        }
    };

    const stopSound = async () => {
        if (sound) {
            await sound.stopAsync();
            await sound.unloadAsync();
            setSound(null);
        }
    };

    const fetchData = async () => {
        try {
            console.log("🔵 Fetching data started...");

            setError(null);
            setLoading(true);

            // Retrieve auth token
            const token = await AsyncStorage.getItem('auth_token_partner');
            console.log("🟢 Retrieved token:", token);

            if (!token) {
                throw new Error('❌ Authentication required. Please login again.');
            }

            const headers = { Authorization: `Bearer ${token}` };
            console.log("🟢 Headers set:", headers);

            // Initialize state variables
            let userData = null;
            let workStatus = null;
            let partnerStatus = null;

            // Fetch user details
            try {
                console.log("🔵 Fetching user details...");
                const userResponse = await axios.get(`${API_BASE_URL}/user-details`, { headers });
                console.log("✅ User Details Response:", userResponse.data);
                userData = userResponse.data.partner;
            } catch (error) {
                console.error("❌ Failed to fetch user details:", error?.response?.data?.message || error.message);
            }

            // Fetch work details
            try {
                console.log("🔵 Fetching work status...");
                const workResponse = await axios.get(`${API_BASE_URL}/my_parcel_driver-details`, { headers });
                console.log("✅ Work Status Response:", workResponse.data);
                workStatus = workResponse.data.summary;
            } catch (error) {
                console.error("❌ Failed to fetch work status:", error?.response?.data?.message || error.message);
            }

            // Fetch partner work status
            try {
                console.log("🔵 Fetching partner work status...");
                const statusResponse = await axios.get(`${API_BASE_URL}/partner_work_status_details`, { headers });
                console.log("✅ Partner Work Status Response:", statusResponse.data);
                partnerStatus = statusResponse.data.status;
            } catch (error) {
                if (error?.response?.data?.message === "No status found for today") {
                    console.warn("⚠️ No status found for today. Setting status to false.");
                    partnerStatus = false;
                } else {
                    console.error("❌ Failed to fetch partner status:", error?.response?.data?.message || error.message);
                }
            }

            // Set state values if they exist
            if (userData) setUserData(userData);
            if (workStatus) setWorkStatus(workStatus);
            if (partnerStatus !== null) setStatus(partnerStatus);

        } catch (error) {
            console.error("❌ Unexpected error:", error);
            setError(error.message);
        } finally {
            console.log("🔵 Fetching data completed. Setting loading to false.");
            setLoading(false);
        }
    };



    const setupLocationTracking = async () => {
        if (!isSocketReady || statusOfPartner !== 'online') return;

        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                throw new Error('Location permission denied');
            }

            return setInterval(async () => {
                const { coords } = await Location.getCurrentPositionAsync({});
                setLocation(coords);
                sendLocationToServer(coords.latitude, coords.longitude);
            }, 1000);
        } catch (error) {
            console.error('Location tracking error:', error);
        }
    };

    const sendLocationToServer = async (latitude, longitude) => {
        try {
            const token = await AsyncStorage.getItem('auth_token_partner');
            if (!token) return;

            await fetch('http://192.168.1.3:3000/webhook/receive-location', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ latitude, longitude }),
            });
        } catch (error) {
            console.error('Error sending location:', error);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 20000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (socket) {
            socket.on('new_parcel_request', setOrder);
            socket.on('ride_cancel', async (data) => {
                await playSound();
                Alert.alert(
                    "Ride Canceled",
                    "Your ride has been canceled.",
                    [{ text: "OK", onPress: stopSound }]
                );
            });
        }
        return () => {
            if (socket) {
                socket.off('new_parcel_request');
                socket.off('ride_cancel');
            }
        };
    }, [socket]);

    useEffect(() => {
        const locationInterval = setupLocationTracking();
        return () => clearInterval(locationInterval);
    }, [workStatus, isSocketReady]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    }, []);

    const handleLogout = async () => {
        try {
            await AsyncStorage.removeItem('auth_token_partner');
            navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }]
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ec363f" />
                <Text style={styles.loadingText}>Loading your dashboard...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Icon name="alert-circle-outline" size={80} color="#ec363f" />
                <Text style={styles.errorTitle}>Oops!</Text>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                    style={styles.errorRetryButton}
                    onPress={fetchData}
                >
                    <Text style={styles.errorRetryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                style={styles.container}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#ec363f']}
                        tintColor="#ec363f"
                    />
                }
            >
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <Text style={styles.welcomeText}>Welcome Back!</Text>
                        <Text style={styles.nameText}>{userData?.name || ""}</Text>
                        <Text style={styles.dateText}>
                            {new Date().toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </Text>
                    </View>
                </View>

                <OnlineStatusToggle
                    workStatus={workStatus}
                    onStatusChange={fetchData}
                    statusOfPartner={statusOfPartner}
                />

                {/* <WorkStatusCard workStatus={workStatus} /> */}

                <View style={styles.statsGrid}>
                    {[
                        { icon: 'package-variant', label: "Today's Orders", value: workStatus?.todayOrders || 0 },
                        { icon: 'check-circle', label: 'All Orders', value: workStatus?.totalOrders || 0, onPress: () => navigation.navigate('All_Orders_parcel') },
                        { icon: 'wallet', label: 'Complete Earnings', value: `₹${workStatus?.totalDeliveredEarnings || 0}` },
                        { icon: 'star', label: 'Rating', value: workStatus?.rating || '4.5' }
                    ].map((stat, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.statsCard}
                            onPress={stat.onPress}
                            disabled={!stat.onPress}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: '#fff5f5' }]}>
                                <Icon name={stat.icon} size={32} color="#ec363f" />
                            </View>
                            <Text style={styles.statsNumber}>{stat.value}</Text>
                            <Text style={styles.statsLabel}>{stat.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <UserProfileCard userData={userData} />

                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                >
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </ScrollView>

            {order && (
                <NewOrder
                    location={location}
                    order={order}
                    onClose={() => setOrder(null)}
                    driverId={userData?._id}
                    open={true}
                />
            )}
        </SafeAreaView>
    );
}