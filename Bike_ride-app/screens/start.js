import React, { useEffect, useState, useRef } from "react";
import {
    View,
    ScrollView,
    Modal,
    TextInput,
    TouchableOpacity,
    Dimensions,
    Linking,
    Platform,
    Alert,
    Image,
    Animated,
    AppState,
    StyleSheet
} from "react-native";
import { Text, Button, Divider, ActivityIndicator } from "react-native-paper";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import * as Location from 'expo-location';
import * as IntentLauncher from 'expo-intent-launcher';
import {
    FontAwesome5,
    MaterialIcons,
    MaterialCommunityIcons,
    Ionicons
} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSocket } from "../context/SocketContext";
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';

// Constants
const GOOGLE_MAPS_APIKEY = "AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8";
const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
const API_BASE_URL = "https://demoapi.olyox.com/api/v1";

// Configure notifications
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export default function RideDetailsScreen() {
    // console.log('🟢 RideDetailsScreen: Component mounted');

    // ===== REFS =====
    const mapRef = useRef(null);
    const carIconAnimation = useRef(new Animated.Value(0)).current;
    const soundRef = useRef(null);
    const appStateRef = useRef(AppState.currentState);
    const socketConnectionAttempts = useRef(0);
    const locationWatchId = useRef(null);

    // ===== NAVIGATION & ROUTE =====
    const route = useRoute();
    const navigation = useNavigation();
    const { params } = route.params || {};

    // logDebug('Params Data',{params})
        console.log('🟢 RideDetailsScreen: Component mounted',params);

    // ===== SOCKET CONTEXT =====
    const { socket } = useSocket();

    // ===== STATE =====
    const [appState, setAppState] = useState({
        loading: true,
        showOtpModal: false,
        otp: "",
        rideStarted: false,
        rideCompleted: false,
        currentLocation: null,
        mapReady: false,
        distanceToPickup: null,
        timeToPickup: null,
        showDirectionsType: 'driver_to_pickup', // driver_to_pickup, pickup_to_drop
        errorMsg: null,
        cancelReasons: [],
        showCancelModal: false,
        selectedReason: null,
        sound: null,
        socketConnected: socket?.connected || false
    });

    // ===== RIDE DETAILS =====
    const rideDetails = params?.rideDetails || {};
    const {
        drop_desc,
        eta,
        rider,
        RideOtp,
        pickup_desc,
        kmOfRide,
        rideStatus,
        vehicleType,
        _id: rideId
    } = rideDetails;

    // ===== COORDINATES =====
    const driverCoordinates = appState.currentLocation ||
        (rider?.location?.coordinates ? {
            latitude: rider.location.coordinates[1],
            longitude: rider.location.coordinates[0],
        } : { latitude: 28.7041, longitude: 77.1025 });

    const pickupCoordinates = rideDetails?.pickupLocation ? {
        latitude: rideDetails.pickupLocation.coordinates[1],
        longitude: rideDetails.pickupLocation.coordinates[0],
    } : { latitude: 28.7041, longitude: 77.1025 };

    const dropCoordinates = rideDetails?.dropLocation ? {
        latitude: rideDetails.dropLocation.coordinates[1],
        longitude: rideDetails.dropLocation.coordinates[0],
    } : { latitude: 28.6139, longitude: 77.2090 };

    // ===== HELPER FUNCTIONS =====

    // State updater function
    const updateState = (newState) => {
        setAppState(prevState => ({ ...prevState, ...newState }));
    };

    // Debug logger
    const logDebug = (message, data = null) => {
        if (data) {
            console.log(`✔️ ${message}`, data);
        } else {
            console.log(`✔️ ${message}`);
        }
    };

    // Error logger
    const logError = (message, error = null) => {
        if (error) {
            console.error(`❌ ${message}`, error);
        } else {
            console.error(`❌ ${message}`);
        }
    };

    // Send notification
    const sendNotification = async (message) => {
        logDebug('Sending notification', message);
        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: message.title,
                    body: message.body,
                    sound: 'default',
                    badge: 1,
                },
                trigger: null,
            });
            logDebug('Notification sent successfully');
        } catch (error) {
            logError('Failed to send notification', error);
        }
    };

    // Reset navigation to home
    const resetToHome = () => {
        logDebug('Resetting navigation to Home');
        navigation.reset({
            index: 0,
            routes: [{ name: "Home" }]
        });
    };

    // Start notification sound
    const startSound = async () => {
        logDebug('Starting notification sound');
        try {
            if (soundRef.current) {
                await soundRef.current.stopAsync();
            }

            const { sound } = await Audio.Sound.createAsync(
                require('./cancel.mp3'),
                {
                    shouldPlay: true,
                    isLooping: true
                }
            );

            soundRef.current = sound;
            updateState({ sound });
            setTimeout(() => {

                console.log("⚠️ Showing Alert.alert now!");
                Alert.alert(
                    "Ride Cancelled",
                    "The ride has been cancelled by the customer.",
                    [{
                        text: "OK",
                        onPress: () => {
                            console.log("✅ Alert dismissed, navigating back.");
                            stopSound();
                            navigation.goBack();
                        }
                    }]
                );

            }, 100);
            logDebug('Sound started successfully');
        } catch (error) {
            logError('Error playing sound', error);
        }
    };

    // Stop sound
    const stopSound = async () => {
        if (soundRef.current) {
            logDebug('Stopping sound');
            try {
                await soundRef.current.stopAsync();
                soundRef.current = null;
                logDebug('Sound stopped successfully');
            } catch (error) {
                logError('Error stopping sound', error);
            }
        }
    };

    // ===== SOCKET MANAGEMENT =====

    const showAlert = ()=>{
        Alert.alert(
            "Ride Completed",
            "The ride has been completed successfully!",
            [
                {
                    text: "Collect Payment",
                    onPress: () => navigation.navigate('collect_money', { data: data?.rideDetails })
                }
            ]
        );
    }
    // Connect socket
    const connectSocket = () => {
        if (!socket) {
            logError('Socket instance not available');
            return false;
        }

        if (!socket.connected) {
            logDebug('Connecting socket...');
            socketConnectionAttempts.current += 1;
            socket.connect();

            // Check connection after a delay
            setTimeout(() => {
                if (socket.connected) {
                    logDebug('Socket connected successfully');
                    updateState({ socketConnected: true });
                    setupSocketListeners();
                } else {
                    logError(`Socket connection failed (attempt ${socketConnectionAttempts.current})`);
                    if (socketConnectionAttempts.current < 3) {
                        connectSocket(); // Retry
                    } else {
                        Alert.alert(
                            "Connection Error",
                            "Unable to establish a connection. Please check your internet connection.",
                            [{ text: "OK" }]
                        );
                    }
                }
            }, 2000);
        } else {
            logDebug('Socket already connected');
            updateState({ socketConnected: true });
            return true;
        }
    };

    // Setup socket listeners
    const setupSocketListeners = () => {
        if (!socket) return;

        logDebug('Setting up socket listeners');

        // Remove existing listeners to prevent duplicates
        socket.off('ride_end');
        socket.off('ride_cancelled');

        // Listen for ride end event
        socket.on('ride_end', (data) => {
            logDebug('Ride completed event received', data);
            showAlert()
            updateState({ rideCompleted: true });
            navigation.navigate('collect_money',{ data: data?.rideDetails })
            sendNotification({
                title: "Ride Completed",
                body: "The ride has been completed successfully!"
            });

            Alert.alert(
                "Ride Completed",
                "The ride has been completed successfully!",
                [
                    {
                        text: "Collect Payment",
                        onPress: () => navigation.navigate('collect_money', { data: data?.rideDetails })
                    }
                ]
            );
        });

        // Listen for ride cancellation
        socket.on('ride_cancelled', (data) => {
            logDebug('Ride cancelled event received', data);
            startSound();

            sendNotification({
                title: "🚨 Ride Cancelled",
                body: "The ride has been cancelled by the customer."
            });

            Alert.alert(
                "Ride Cancelled",
                "The ride has been cancelled by the customer.",
                [{
                    text: "OK",
                    onPress: () => {
                        stopSound();
                        navigation.goBack();
                    }
                }]
            );
        });

        logDebug('Socket listeners setup complete');
    };

    // ===== LOCATION MANAGEMENT =====

    useEffect(()=>{
        setupSocketListeners()
    },[socket])
    // Start location tracking
    const startLocationTracking = async () => {
        logDebug('Starting location tracking');
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                logError('Location permission denied');
                updateState({
                    errorMsg: 'Permission to access location was denied',
                    loading: false
                });
                return;
            }

            // Get initial location
            let location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Highest
            });

            const initialLocation = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };

            updateState({
                currentLocation: initialLocation,
                loading: false
            });

            logDebug('Initial location obtained', initialLocation);

            // Start watching position
            const watchId = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Highest,
                    distanceInterval: 10, // update every 10 meters
                    timeInterval: 5000 // or every 5 seconds
                },
                (newLocation) => {
                    const updatedLocation = {
                        latitude: newLocation.coords.latitude,
                        longitude: newLocation.coords.longitude,
                    };

                    updateState({ currentLocation: updatedLocation });

                    // If map is ready and ride started, animate to new location
                    if (mapRef.current && appState.mapReady) {
                        mapRef.current.animateToRegion({
                            ...updatedLocation,
                            latitudeDelta: LATITUDE_DELTA / 2,
                            longitudeDelta: LONGITUDE_DELTA / 2,
                        }, 1000);
                    }

                    // If ride started, emit location to socket
                    if (appState.rideStarted && socket && socket.connected) {
                        logDebug('Emitting location update', { rideId, location: updatedLocation });
                        socket.emit("driver_location_update", {
                            rideId: rideId,
                            location: updatedLocation
                        });
                    }
                }
            );

            locationWatchId.current = watchId;
            logDebug('Location tracking started successfully');

        } catch (error) {
            logError('Error starting location tracking', error);
            updateState({
                errorMsg: 'Failed to get location: ' + error.message,
                loading: false
            });
        }
    };

    // Stop location tracking
    const stopLocationTracking = () => {
        if (locationWatchId.current) {
            logDebug('Stopping location tracking');
            locationWatchId.current.remove();
            locationWatchId.current = null;
        }
    };

    // ===== RIDE ACTIONS =====

    // Fetch cancel reasons
    const fetchCancelReasons = async () => {
        logDebug('Fetching cancel reasons');
        try {
            const { data } = await axios.get(`${API_BASE_URL}/admin/cancel-reasons?active=active`);

            if (data.data) {
                logDebug('Cancel reasons fetched successfully', data.data);
                updateState({ cancelReasons: data.data });
            } else {
                logDebug('No cancel reasons found');
                updateState({ cancelReasons: [] });
            }
        } catch (error) {
            logError('Error fetching cancel reasons', error);
            updateState({ cancelReasons: [] });
        }
    };

    // Handle OTP submission
    const handleOtpSubmit = () => {
        logDebug('Submitting OTP', { entered: appState.otp, expected: RideOtp });

        if (appState.otp === RideOtp) {
            logDebug('OTP verified successfully');
            updateState({
                showOtpModal: false,
                rideStarted: true,
                showDirectionsType: 'pickup_to_drop'
            });

            // Emit ride started event
            if (socket && socket.connected) {
                logDebug('Emitting ride_started event', rideDetails);
                socket.emit("ride_started", rideDetails);
            }

            // Fit map to show pickup and drop locations
            if (mapRef.current) {
                setTimeout(() => {
                    mapRef.current.fitToCoordinates(
                        [pickupCoordinates, dropCoordinates],
                        {
                            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                            animated: true,
                        }
                    );
                }, 1000);
            }

            sendNotification({
                title: "Ride Started",
                body: "You have started the ride. Drive safely!"
            });
        } else {
            logError('Incorrect OTP entered');
            Alert.alert("Incorrect OTP", "Please try again with the correct OTP.");
        }
    };

    // Handle cancel ride
    const handleCancelRide = async () => {
        logDebug('Cancelling ride', { reason: appState.selectedReason });

        try {
            if (!appState.selectedReason) {
                Alert.alert("Cancel Ride", "Please select a reason to cancel.");
                return;
            }

            const data = {
                cancelBy: "driver",
                rideData: rideDetails,
                reason: appState.selectedReason
            };

            if (!socket || !socket.connected) {
                logError('Socket not connected for ride cancellation');
                const connected = connectSocket();
                if (!connected) {
                    Alert.alert("Error", "Unable to cancel ride due to connection issues.");
                    return;
                }
            }

            logDebug('Emitting ride-cancel-by-user event', data);
            socket.emit("ride-cancel-by-user", data, (response) => {
                logDebug('Ride cancel response received', response);
            });

            sendNotification({
                title: "Ride Canceled",
                body: "Your pickup has been canceled. Thank you for your time."
            });

            Alert.alert(
                "Cancel",
                "Your pickup has been canceled. Thank you for your time.",
                [{ text: "OK", onPress: () => resetToHome() }]
            );

            updateState({ showCancelModal: false });

        } catch (error) {
            logError('Error in handleCancelRide', error);
            Alert.alert("Error", "Something went wrong while canceling the ride.");
        }
    };

    // Complete ride
    const handleCompleteRide = () => {
        if (!rideDetails) {
            logError('Ride details not found for completion');
            Alert.alert("Error", "Ride details not found");
            return;
        }
        console.log("Ride Details", params?.rideDetails)
        console.log(params?.rideDetails?.ride)
        Alert.alert(
            "Complete Ride",
            "Are you sure you want to complete this ride?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Complete",
                    onPress: () => {
                        if (socket && socket.connected) {
                            logDebug('Emitting endRide event', { rideDetails });
                            logDebug('Emitting endRide event 2', { ride:rideDetails?.ride });
                            socket.emit('endRide', { rideDetails: params?.rideDetails, ride: params?.rideDetails?.ride });
                            updateState({ rideCompleted: true });
                        } else {
                            logError('Socket not connected for ride completion');
                            Alert.alert("Connection Error", "Please check your internet connection and try again.");
                        }
                    }
                }
            ]
        );
    };

    // Open Google Maps for navigation
    const openGoogleMapsDirections = () => {
        const destination = appState.rideStarted ?
            `${dropCoordinates.latitude},${dropCoordinates.longitude}` :
            `${pickupCoordinates.latitude},${pickupCoordinates.longitude}`;

        const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;

        logDebug('Opening Google Maps with URL', url);

        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                if (Platform.OS === 'android') {
                    // Try to open with intent launcher as fallback
                    IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                        data: url,
                        flags: 268435456, // FLAG_ACTIVITY_NEW_TASK
                    }).catch(err => {
                        logError('Error opening Google Maps with Intent Launcher', err);
                        Alert.alert("Error", "Could not open Google Maps");
                    });
                } else {
                    logError('Cannot open Google Maps URL');
                    Alert.alert("Error", "Could not open Google Maps");
                }
            }
        });
    };

    // Handle map ready
    const handleMapReady = () => {
        logDebug('Map is ready');
        updateState({ mapReady: true });

        // Fit map to show current location and pickup/drop
        if (mapRef.current && appState.currentLocation) {
            setTimeout(() => {
                const coordinates = [
                    appState.currentLocation,
                    appState.rideStarted ? dropCoordinates : pickupCoordinates
                ];

                logDebug('Fitting map to coordinates', coordinates);

                mapRef.current.fitToCoordinates(
                    coordinates,
                    {
                        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                        animated: true,
                    }
                );
            }, 1000);
        }
    };

    // ===== EFFECTS =====

    // Initialize component
    useEffect(() => {
        logDebug('Initializing component');

        // Connect socket
        connectSocket();

        // Start location tracking
        startLocationTracking();

        // Fetch cancel reasons
        fetchCancelReasons();

        // Start car animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(carIconAnimation, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true
                }),
                Animated.timing(carIconAnimation, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true
                })
            ])
        ).start();

        // Setup app state change listener
        const subscription = AppState.addEventListener('change', handleAppStateChange);

        // Cleanup function
        return () => {
            logDebug('Component unmounting, cleaning up resources');

            // Remove app state listener
            subscription.remove();

            // Stop location tracking
            stopLocationTracking();

            // Stop sound
            stopSound();

            // Remove socket listeners
            if (socket) {
                socket.off('ride_end');
                socket.off('ride_cancelled');
            }
        };
    }, []);

    // Calculate distance and time to pickup
    useEffect(() => {
        if (appState.currentLocation && pickupCoordinates && !appState.rideStarted) {
            // logDebug('Calculating distance to pickup');

            // Calculate straight-line distance (in km)
            const R = 6371; // Earth's radius in km
            const dLat = (pickupCoordinates.latitude - appState.currentLocation.latitude) * Math.PI / 180;
            const dLon = (pickupCoordinates.longitude - appState.currentLocation.longitude) * Math.PI / 180;
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(appState.currentLocation.latitude * Math.PI / 180) * Math.cos(pickupCoordinates.latitude * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;

            const distanceFormatted = distance.toFixed(1);

            // Estimate time (assuming average speed of 30 km/h)
            const timeInMinutes = (distance / 30) * 60;
            const timeFormatted = Math.round(timeInMinutes);

            logDebug('Distance calculation complete', {
                distance: distanceFormatted,
                time: timeFormatted
            });

            updateState({
                distanceToPickup: distanceFormatted,
                timeToPickup: timeFormatted
            });
        }
    }, []);

    const handleAppStateChange = (nextAppState) => {
        logDebug(`AppState changed: ${appStateRef.current} → ${nextAppState}`);

        if (appStateRef.current.match(/inactive|background/) && nextAppState === "active") {
            logDebug('App is now active');

            // Reconnect socket if disconnected
            if (socket && !socket.connected) {
                logDebug('Reconnecting socket after app became active');
                connectSocket();
            } else {
                logDebug('Socket is already connected');
                setupSocketListeners();
            }

            // Restart location tracking if needed
            if (!locationWatchId.current) {
                logDebug('Restarting location tracking after app became active');
                startLocationTracking();
            }
        }

        appStateRef.current = nextAppState;
    };

    // Function to handle ride cancellation with debugging
    const handleCancelRideByUser = () => {
        console.log("🚨 handleCancelRideByUser function executed.");

        if (socket) {
            socket.on('ride_cancelled', (data) => {
                logDebug('✅ Ride cancelled event received', data);
                startSound();

                // Debugging before notification
                logDebug("📢 Sending notification for ride cancellation.");
                sendNotification({
                    title: "🚨 Ride Cancelled",
                    body: "The ride has been cancelled by the customer."
                });

                // Debugging before showing alert
                logDebug("🛑 Attempting to show Alert.alert...");


                // Delay added to ensure proper UI execution
            });
        } else {
            logDebug("❌ Socket not available, cannot register 'ride_cancelled' event.");
        }
    };

    // Listen to app state changes
    useEffect(() => {
        logDebug("🎧 useEffect running - Adding AppState listener and socket listener.");

        const subscription = AppState.addEventListener("change", handleAppStateChange);
        handleCancelRideByUser(); // Register ride cancel listener

        return () => {
            logDebug("🧹 Cleanup: Removing AppState listener and socket event.");
            subscription.remove();
            if (socket) {
                socket.off('ride_cancelled'); // Remove event listener on cleanup
            }
        };
    }, []);
    // ===== RENDER COMPONENTS =====

    // Cancel reasons modal
    const CancelReasonsModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={appState.showCancelModal}
            onRequestClose={() => updateState({ showCancelModal: false })}
        >
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.5)'
            }}>
                <View style={{
                    width: '90%',
                    backgroundColor: 'white',
                    borderRadius: 10,
                    padding: 20,
                    maxHeight: '80%'
                }}>
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 15
                    }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Cancel Reason</Text>
                        <TouchableOpacity
                            onPress={() => updateState({ showCancelModal: false })}
                        >
                            <MaterialCommunityIcons name="close" size={24} color="#111827" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: 300 }}>
                        {appState.cancelReasons.map((item) => (
                            <TouchableOpacity
                                key={item._id}
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: 15,
                                    borderRadius: 8,
                                    marginBottom: 10,
                                    backgroundColor: appState.selectedReason === item._id ? '#f0f0f0' : 'transparent',
                                    borderWidth: 1,
                                    borderColor: appState.selectedReason === item._id ? '#FF3B30' : '#e0e0e0'
                                }}
                                onPress={() => updateState({ selectedReason: item._id })}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
                                    <Text style={{ color: '#666', marginTop: 5 }}>{item.description}</Text>
                                </View>
                                <View>
                                    {appState.selectedReason === item._id && (
                                        <MaterialCommunityIcons name="check" size={24} color="green" />
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <TouchableOpacity
                        style={{
                            backgroundColor: appState.selectedReason ? '#FF3B30' : '#ccc',
                            padding: 15,
                            borderRadius: 8,
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginTop: 15
                        }}
                        onPress={handleCancelRide}
                        disabled={!appState.selectedReason}
                    >
                        <MaterialCommunityIcons name="cancel" size={20} color="#fff" style={{ marginRight: 10 }} />
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel Ride</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    // OTP Modal
    const OtpModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={appState.showOtpModal}
            onRequestClose={() => updateState({ showOtpModal: false })}
        >
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.5)'
            }}>
                <View style={{
                    width: '80%',
                    backgroundColor: 'white',
                    borderRadius: 10,
                    padding: 20,
                    alignItems: 'center'
                }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>Enter OTP</Text>
                    <Text style={{ textAlign: 'center', marginBottom: 20 }}>
                        Please enter the OTP provided by the rider to start the trip
                    </Text>

                    <TextInput
                        style={{
                            width: '100%',
                            height: 50,
                            borderWidth: 1,
                            borderColor: '#ccc',
                            borderRadius: 8,
                            marginBottom: 20,
                            paddingHorizontal: 15,
                            fontSize: 18,
                            textAlign: 'center'
                        }}
                        placeholder="Enter OTP"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={appState.otp}
                        onChangeText={(text) => updateState({ otp: text })}
                    />

                    <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
                        <TouchableOpacity
                            style={{
                                padding: 15,
                                borderRadius: 8,
                                backgroundColor: '#f0f0f0',
                                width: '45%',
                                alignItems: 'center'
                            }}
                            onPress={() => updateState({ showOtpModal: false })}
                        >
                            <Text>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{
                                padding: 15,
                                borderRadius: 8,
                                backgroundColor: '#FF3B30',
                                width: '45%',
                                alignItems: 'center'
                            }}
                            onPress={handleOtpSubmit}
                        >
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Verify</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    // Loading screen
    if (appState.loading) {
        return (
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#fff'
            }}>
                <ActivityIndicator size="large" color="#FF3B30" />
                <Text style={{ marginTop: 20, fontSize: 16 }}>Loading ride details...</Text>
            </View>
        );
    }

    // Error screen
    if (appState.errorMsg) {
        return (
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 20,
                backgroundColor: '#fff'
            }}>
                <MaterialIcons name="error" size={60} color="#FF3B30" />
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 20, textAlign: 'center' }}>{appState.errorMsg}</Text>
                <Button
                    mode="contained"
                    onPress={() => navigation.goBack()}
                    style={{ marginTop: 30, backgroundColor: '#FF3B30' }}
                >
                    Go Back
                </Button>
            </View>
        );
    }

    // Main screen
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            {/* Map View */}
            <View style={{ flex: 1 }}>
                <MapView
                    ref={mapRef}
                    style={{ flex: 1 }}
                    provider={PROVIDER_GOOGLE}
                    initialRegion={{
                        ...driverCoordinates,
                        latitudeDelta: LATITUDE_DELTA,
                        longitudeDelta: LONGITUDE_DELTA,
                    }}
                    onMapReady={handleMapReady}
                >
                    {/* Driver Marker */}
                    {appState.currentLocation && (
                        <Marker
                            coordinate={appState.currentLocation}
                            title="Your Location"
                        >
                            <Animated.View style={{
                                transform: [{
                                    scale: carIconAnimation.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [1, 1.1]
                                    })
                                }]
                            }}>
                                <FontAwesome5 name="car" size={24} color="#FF3B30" />
                            </Animated.View>
                        </Marker>
                    )}

                    {/* Pickup Marker */}
                    {!appState.rideStarted && (
                        <Marker
                            coordinate={pickupCoordinates}
                            title="Pickup Location"
                            description={pickup_desc}
                        >
                            <View style={{
                                backgroundColor: '#4CAF50',
                                padding: 5,
                                borderRadius: 10
                            }}>
                                <MaterialIcons name="location-on" size={24} color="white" />
                            </View>
                        </Marker>
                    )}

                    {/* Drop Marker */}
                    <Marker
                        coordinate={dropCoordinates}
                        title="Drop Location"
                        description={drop_desc}
                    >
                        <View style={{
                            backgroundColor: '#F44336',
                            padding: 5,
                            borderRadius: 10
                        }}>
                            <MaterialIcons name="location-on" size={24} color="white" />
                        </View>
                    </Marker>

                    {/* Directions */}
                    {appState.mapReady && appState.currentLocation && (
                        <MapViewDirections
                            origin={appState.currentLocation}
                            destination={appState.rideStarted ? dropCoordinates : pickupCoordinates}
                            apikey={GOOGLE_MAPS_APIKEY}
                            strokeWidth={4}
                            strokeColor={appState.rideStarted ? "#FF3B30" : "#4CAF50"}
                            onReady={(result) => {
                                logDebug('Directions ready', {
                                    distance: result.distance,
                                    duration: result.duration
                                });

                                if (!appState.rideStarted) {
                                    updateState({
                                        distanceToPickup: result.distance.toFixed(1),
                                        timeToPickup: Math.round(result.duration)
                                    });
                                }
                            }}
                        />
                    )}
                </MapView>

                {/* Socket Status Indicator */}
                <View style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    backgroundColor: appState.socketConnected ? '#4CAF50' : '#F44336',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 15,
                    flexDirection: 'row',
                    alignItems: 'center'
                }}>
                    <MaterialIcons
                        name={appState.socketConnected ? "wifi" : "wifi-off"}
                        size={16}
                        color="white"
                    />
                    <Text style={{ color: 'white', marginLeft: 5, fontSize: 12 }}>
                        {appState.socketConnected ? "Connected" : "Disconnected"}
                    </Text>
                </View>

                {/* Navigation Button */}
                <TouchableOpacity
                    style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        backgroundColor: 'white',
                        padding: 10,
                        borderRadius: 50,
                        elevation: 5,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 3.84
                    }}
                    onPress={openGoogleMapsDirections}
                >
                    <MaterialIcons name="directions" size={24} color="#FF3B30" />
                </TouchableOpacity>
            </View>

            {/* Ride Info Panel */}
            <View style={{
                backgroundColor: 'white',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 20,
                elevation: 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -3 },
                shadowOpacity: 0.1,
                shadowRadius: 3
            }}>
                {/* Ride Status */}
                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 15
                }}>
                    <View>
                        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
                            {appState.rideStarted ? "Ride in Progress" : "Heading to Pickup"}
                        </Text>
                        <Text style={{ color: '#666', marginTop: 5 }}>
                            {appState.rideStarted ? `${kmOfRide} km total ride` : `${appState.distanceToPickup || '0'} km to pickup`}
                        </Text>
                    </View>

                    <View style={{
                        backgroundColor: appState.rideStarted ? '#4CAF50' : '#FF9800',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 15
                    }}>
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>
                            {appState.rideStarted ? "In Progress" : "Pickup"}
                        </Text>
                    </View>
                </View>

                <Divider style={{ marginVertical: 10 }} />

                {/* Location Details */}
                <View style={{ marginBottom: 15 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                        <View style={{
                            backgroundColor: '#4CAF50',
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            marginRight: 10
                        }} />
                        <Text style={{ flex: 1 }}>{pickup_desc}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
                            backgroundColor: '#F44336',
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            marginRight: 10
                        }} />
                        <Text style={{ flex: 1 }}>{drop_desc}</Text>
                    </View>
                </View>

                {/* ETA Info */}
                {!appState.rideStarted && (
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#f0f0f0',
                        padding: 10,
                        borderRadius: 8,
                        marginBottom: 15
                    }}>
                        <MaterialIcons name="access-time" size={24} color="#FF3B30" style={{ marginRight: 10 }} />
                        <Text>
                            Estimated time to pickup: <Text style={{ fontWeight: 'bold' }}>
                                {appState.timeToPickup || '0'} min
                            </Text>
                        </Text>
                    </View>
                )}

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    {!appState.rideStarted ? (
                        <>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: '#f0f0f0',
                                    padding: 15,
                                    borderRadius: 8,
                                    alignItems: 'center',
                                    marginRight: 10
                                }}
                                onPress={() => updateState({ showCancelModal: true })}
                            >
                                <Text style={{ color: '#FF3B30', fontWeight: 'bold' }}>Cancel Ride</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: '#FF3B30',
                                    padding: 15,
                                    borderRadius: 8,
                                    alignItems: 'center'
                                }}
                                onPress={() => updateState({ showOtpModal: true })}
                            >
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>Enter OTP</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                backgroundColor: '#4CAF50',
                                padding: 15,
                                borderRadius: 8,
                                alignItems: 'center'
                            }}
                            onPress={handleCompleteRide}
                        >
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Complete Ride</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Modals */}
            <OtpModal />
            <CancelReasonsModal />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8F9FA",
    },
    mapContainer: {
        height: height * 0.45,
        position: 'relative',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    mapOverlayContainer: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        flexDirection: 'column',
        alignItems: 'flex-end',
    },
    navigationButton: {
        backgroundColor: '#4285F4',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    navigationButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        marginLeft: 4,
    },
    distanceInfoContainer: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginTop: 8,
    },
    distanceInfoText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 12,
    },
    scrollView: {
        flex: 1,
    },
    statusBarContainer: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        marginTop: -10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    statusBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statusStep: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusStepActive: {
        // Active state styling
    },
    statusStepText: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    statusConnector: {
        height: 2,
        backgroundColor: '#DDDDDD',
        flex: 1,
        marginHorizontal: 8,
    },
    statusConnectorActive: {
        backgroundColor: '#4CAF50',
    },
    rideInfoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        margin: 16,
        marginTop: 8,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    rideInfoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    rideInfoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    rideStatusBadge: {
        backgroundColor: '#E3F2FD',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
    },
    rideStatusText: {
        fontSize: 12,
        color: '#1976D2',
        fontWeight: 'bold',
    },
    divider: {
        backgroundColor: '#EEEEEE',
        height: 1,
        marginVertical: 12,
    },
    locationsContainer: {
        marginVertical: 8,
    },
    locationItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginVertical: 4,
    },
    locationIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    locationTextContainer: {
        flex: 1,
    },
    locationLabel: {
        fontSize: 12,
        color: '#999',
        marginBottom: 2,
    },
    locationText: {
        fontSize: 14,
        color: '#333',
    },
    locationConnector: {
        width: 1,
        height: 20,
        backgroundColor: '#DDDDDD',
        marginLeft: 16,
    },
    locationDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#DDDDDD',
        marginLeft: 14,
        marginVertical: 2,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginVertical: 8,
    },
    infoGridItem: {
        width: '50%',
        paddingVertical: 8,
        paddingHorizontal: 4,
        alignItems: 'flex-start',
    },
    infoGridLabel: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    infoGridValue: {
        fontSize: 14,
        color: '#333',
        fontWeight: 'bold',
    },
    riderInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8,
    },
    riderAvatarContainer: {
        marginRight: 12,
    },
    riderAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    riderDetails: {
        flex: 1,
    },
    riderName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    riderPhone: {
        fontSize: 14,
        color: '#666',
    },
    callButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#4CAF50',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonsContainer: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
    },
    actionButton: {
        borderRadius: 8,
        overflow: 'hidden',
    },
    actionButtonTouchable: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        width: '85%',
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    modalCloseButton: {
        padding: 4,
    },
    otpInputContainer: {
        marginVertical: 16,
    },
    otpInput: {
        borderWidth: 1,
        borderColor: '#DDDDDD',
        borderRadius: 8,
        padding: 12,
        fontSize: 12,
        textAlign: 'center',
        letterSpacing: 8,
        backgroundColor: '#F9F9F9',
    },
    otpInstructions: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    otpSubmitButton: {
        borderRadius: 8,
        overflow: 'hidden',
    },
    otpSubmitButtonTouchable: {
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    otpSubmitButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
    },
    loaderText: {
        fontSize: 16,
        color: '#666',
        marginTop: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginVertical: 16,
    },
    errorButton: {
        backgroundColor: '#FF3B30',
        paddingHorizontal: 24,
    },
    markerContainer: {
        alignItems: 'center',
    },
    markerLabelContainer: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 10,
        marginTop: -5,
    },
    markerLabel: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContents: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: height * 0.8,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    modalCloseButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },

    cancelReasonItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "start",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
    },
    selectedReason: {
        backgroundColor: "#e3f2fd",
        borderRadius: 5,
    },
    cancelReasonLabel: {
        fontSize: 16,
        color: "#111827",
    },
    cancelReasonDescription: {
        fontSize: 14,
        color: "#6b7280",
    },
    cancelRideButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#d64444",
        paddingVertical: 12,
        borderRadius: 5,
        marginTop: 20,
    },
    cancelRideText: {
        fontSize: 16,
        color: "#fff",
        marginLeft: 10,
    },
});