import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
    View,
    TouchableOpacity,
    Dimensions,
    Linking,
    Platform,
    Alert,
    Animated,
    AppState,
} from "react-native";
import { Text, Button, Divider, ActivityIndicator } from "react-native-paper";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import * as Location from 'expo-location';
import * as IntentLauncher from 'expo-intent-launcher';
import * as SecureStore from 'expo-secure-store';
import {
    FontAwesome5,
    MaterialIcons,
} from '@expo/vector-icons';
import { useSocket } from "../context/SocketContext";
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import OtpModal from "./OtpMode";
import CancelReasonsModal from "./CancelReasonsModal";

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

// Storage helpers
const saveRideToStorage = async (rideData) => {
    try {
        await SecureStore.setItemAsync('activeRide', JSON.stringify(rideData));
    } catch (error) {
        console.error('Error saving ride data:', error);
    }
};

const clearRideFromStorage = async () => {
    try {
        await SecureStore.deleteItemAsync('activeRide');
    } catch (error) {
        console.error('Error clearing ride data:', error);
    }
};

export default function RideDetailsScreen() {
    // ===== REFS =====
    const mapRef = useRef(null);
    const carIconAnimation = useRef(new Animated.Value(0)).current;
    const soundRef = useRef(null);
    const appStateRef = useRef(AppState.currentState);
    const socketConnectionAttempts = useRef(0);
    const locationWatchId = useRef(null);
    const isInitialMount = useRef(true);
    const socketListenersSet = useRef(false);
    const locationTrackingStarted = useRef(false);

    // ===== NAVIGATION & ROUTE =====
    const route = useRoute();
    const navigation = useNavigation();
    const { params } = route.params || {};

    // ===== SOCKET CONTEXT =====
    const { socket } = useSocket();

    // ===== STATE =====
    // Using a single state object to reduce re-renders
    const [state, setState] = useState({
        loading: true,
        showOtpModal: false,
        otp: "",
        rideStarted: false,
        rideCompleted: false,
        currentLocation: null,
        mapReady: false,
        distanceToPickup: null,
        timeToPickup: null,
        showDirectionsType: 'driver_to_pickup',
        errorMsg: null,
        cancelReasons: [],
        showCancelModal: false,
        selectedReason: null,
        sound: null,
        socketConnected: socket?.connected || false
    });

    // ===== RIDE DETAILS =====
    const rideDetails = useMemo(() => params?.rideDetails || {}, [params?.rideDetails]);
    
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
    const driverCoordinates = useMemo(() => 
        state.currentLocation ||
        (rider?.location?.coordinates ? {
            latitude: rider.location.coordinates[1],
            longitude: rider.location.coordinates[0],
        } : { latitude: 28.7041, longitude: 77.1025 }),
    [state.currentLocation, rider?.location?.coordinates]);

    const pickupCoordinates = useMemo(() => 
        rideDetails?.pickupLocation ? {
            latitude: rideDetails.pickupLocation.coordinates[1],
            longitude: rideDetails.pickupLocation.coordinates[0],
        } : { latitude: 28.7041, longitude: 77.1025 },
    [rideDetails?.pickupLocation]);

    const dropCoordinates = useMemo(() => 
        rideDetails?.dropLocation ? {
            latitude: rideDetails.dropLocation.coordinates[1],
            longitude: rideDetails.dropLocation.coordinates[0],
        } : { latitude: 28.6139, longitude: 77.2090 },
    [rideDetails?.dropLocation]);

    // ===== HELPER FUNCTIONS =====
    // State updater function - use functional updates to avoid stale state
    const updateState = useCallback((newState) => {
        setState(prevState => ({ ...prevState, ...newState }));
    }, []);

    // Debug logger
    const logDebug = useCallback((message, data = null) => {
        if (__DEV__) {
            if (data) {
                console.log(`✔️ ${message}`, data);
            } else {
                console.log(`✔️ ${message}`);
            }
        }
    }, []);

    // Error logger
    const logError = useCallback((message, error = null) => {
        if (error) {
            console.error(`❌ ${message}`, error);
        } else {
            console.error(`❌ ${message}`);
        }
    }, []);

    // Send notification
    const sendNotification = useCallback(async (message) => {
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
    }, [logDebug, logError]);

    // Reset navigation to home
    const resetToHome = useCallback(() => {
        logDebug('Resetting navigation to Home');
        navigation.reset({
            index: 0,
            routes: [{ name: "Home" }]
        });
    }, [navigation, logDebug]);

    // Start notification sound
    const startSound = useCallback(async () => {
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
            }, 100);
            
            logDebug('Sound started successfully');
        } catch (error) {
            logError('Error playing sound', error);
        }
    }, [logDebug, logError, navigation, updateState]);

    // Stop sound
    const stopSound = useCallback(async () => {
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
    }, [logDebug, logError]);

    // ===== SOCKET MANAGEMENT =====
    // Show alert for ride completion
    const showAlert = useCallback(() => {
        Alert.alert(
            "Ride Completed",
            "The ride has been completed successfully!",
            [
                {
                    text: "Collect Payment",
                    onPress: () => navigation.navigate('collect_money', { data: rideDetails })
                }
            ]
        );
    }, [navigation, rideDetails]);

    // Connect socket
    const connectSocket = useCallback(() => {
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
    }, [socket, logDebug, logError, updateState]);

    // Setup socket listeners
    const setupSocketListeners = useCallback(() => {
        if (!socket || socketListenersSet.current) return;

        logDebug('Setting up socket listeners');

        // Remove existing listeners to prevent duplicates
        socket.off('ride_end');
        socket.off('ride_cancelled');

        // Listen for ride end event
        socket.on('ride_end', (data) => {
            logDebug('Ride completed event received', data);
            showAlert();
            updateState({ rideCompleted: true });
            navigation.navigate('collect_money', { data: data?.rideDetails });
            sendNotification({
                title: "Ride Completed",
                body: "The ride has been completed successfully!"
            });
        });

        // Listen for ride cancellation
        socket.on('ride_cancelled', (data) => {
            logDebug('Ride cancelled event received', data);
            startSound();

            sendNotification({
                title: "🚨 Ride Cancelled",
                body: "The ride has been cancelled by the customer."
            });
        });

        socketListenersSet.current = true;
        logDebug('Socket listeners setup complete');
    }, [socket, logDebug, showAlert, updateState, navigation, sendNotification, startSound]);

    // ===== LOCATION MANAGEMENT =====
    // Start location tracking
    const startLocationTracking = useCallback(async () => {
        if (locationTrackingStarted.current) return;
        
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
                    if (mapRef.current && state.mapReady) {
                        mapRef.current.animateToRegion({
                            ...updatedLocation,
                            latitudeDelta: LATITUDE_DELTA / 2,
                            longitudeDelta: LONGITUDE_DELTA / 2,
                        }, 1000);
                    }

                    // If ride started, emit location to socket
                    if (state.rideStarted && socket && socket.connected) {
                        logDebug('Emitting location update', { rideId, location: updatedLocation });
                        socket.emit("driver_location_update", {
                            rideId: rideId,
                            location: updatedLocation
                        });
                    }
                }
            );

            locationWatchId.current = watchId;
            locationTrackingStarted.current = true;
            logDebug('Location tracking started successfully');

        } catch (error) {
            logError('Error starting location tracking', error);
            updateState({
                errorMsg: 'Failed to get location: ' + error.message,
                loading: false
            });
        }
    }, [logDebug, logError, updateState, state.mapReady, state.rideStarted, socket, rideId]);

    // Stop location tracking
    const stopLocationTracking = useCallback(() => {
        if (locationWatchId.current) {
            logDebug('Stopping location tracking');
            locationWatchId.current.remove();
            locationWatchId.current = null;
            locationTrackingStarted.current = false;
        }
    }, [logDebug]);

    // ===== RIDE ACTIONS =====
    // Fetch cancel reasons
    const fetchCancelReasons = useCallback(async () => {
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
    }, [logDebug, logError, updateState]);

    // Handle OTP submission
    const handleOtpSubmit = useCallback(() => {
        const expectedOtp = RideOtp !== undefined && RideOtp !== null ? RideOtp : params?.RideOtp;

        logDebug('Submitting OTP', { entered: state.otp, expected: expectedOtp });

        if (state.otp === expectedOtp) {
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

            // Send notification
            sendNotification({
                title: "Ride Started",
                body: "You have started the ride. Drive safely!"
            });
        } else {
            logError('Incorrect OTP entered');
            Alert.alert("Incorrect OTP", "Please try again with the correct OTP.");
        }
    }, [
        RideOtp, params?.RideOtp, state.otp, logDebug, logError, 
        updateState, socket, rideDetails, pickupCoordinates, 
        dropCoordinates, sendNotification
    ]);

    // Handle cancel ride
    const handleCancelRide = useCallback(async () => {
        logDebug('Cancelling ride', { reason: state.selectedReason });

        try {
            if (!state.selectedReason) {
                Alert.alert("Cancel Ride", "Please select a reason to cancel.");
                return;
            }

            const data = {
                cancelBy: "driver",
                rideData: rideDetails,
                reason: state.selectedReason
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
    }, [
        state.selectedReason, logDebug, logError, rideDetails, 
        socket, connectSocket, sendNotification, resetToHome, updateState
    ]);

    // Complete ride
    const handleCompleteRide = useCallback(async () => {
        if (!rideDetails) {
            logError('Ride details not found for completion');
            Alert.alert("Error", "Ride details not found");
            return;
        }
      
        Alert.alert(
            "Complete Ride",
            "Are you sure you want to complete this ride?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Complete",
                    onPress: async () => {
                        if (socket && socket.connected) {
                            logDebug('Emitting endRide event', { rideDetails });
                            socket.emit('endRide', { 
                                rideDetails: params?.rideDetails, 
                                ride: params?.rideDetails?.ride 
                            });
                            updateState({ rideCompleted: true });
                            await clearRideFromStorage();
                        } else {
                            logError('Socket not connected for ride completion');
                            Alert.alert("Connection Error", "Please check your internet connection and try again.");
                        }
                    }
                }
            ]
        );
    }, [
        rideDetails, logError, logDebug, socket, 
        params?.rideDetails, updateState
    ]);

    // Open Google Maps for navigation
    const openGoogleMapsDirections = useCallback(() => {
        const destination = state.rideStarted ?
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
    }, [
        state.rideStarted, dropCoordinates, pickupCoordinates, 
        logDebug, logError
    ]);

    // Handle map ready
    const handleMapReady = useCallback(() => {
        logDebug('Map is ready');
        updateState({ mapReady: true });

        // Fit map to show current location and pickup/drop
        if (mapRef.current && state.currentLocation) {
            setTimeout(() => {
                const coordinates = [
                    state.currentLocation,
                    state.rideStarted ? dropCoordinates : pickupCoordinates
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
    }, [
        logDebug, updateState, state.currentLocation, 
        state.rideStarted, dropCoordinates, pickupCoordinates
    ]);

    // Handle app state change
    const handleAppStateChange = useCallback((nextAppState) => {
        // Avoid excessive logging by only logging significant changes
        const isSignificantChange = 
            (appStateRef.current === 'active' && nextAppState !== 'active') ||
            (appStateRef.current !== 'active' && nextAppState === 'active');
            
        if (isSignificantChange) {
            logDebug(`AppState changed: ${appStateRef.current} → ${nextAppState}`);
        }

        if (appStateRef.current.match(/inactive|background/) && nextAppState === "active") {
            logDebug('App is now active');

            // Reconnect socket if disconnected
            if (socket && !socket.connected) {
                logDebug('Reconnecting socket after app became active');
                connectSocket();
            } else if (socket && socket.connected) {
                logDebug('Socket is already connected');
                if (!socketListenersSet.current) {
                    setupSocketListeners();
                }
            }

            // Restart location tracking if needed
            if (!locationTrackingStarted.current) {
                logDebug('Restarting location tracking after app became active');
                startLocationTracking();
            }
        }

        appStateRef.current = nextAppState;
    }, [
        logDebug, socket, connectSocket, 
        setupSocketListeners, startLocationTracking
    ]);

    // ===== EFFECTS =====
    // Initialize component - runs only once
    useEffect(() => {
        if (!isInitialMount.current) return;
        isInitialMount.current = false;
        
        logDebug('Initializing component');

        // Connect socket
        connectSocket();
        
        // Save ride to storage if available
        if (params?.rideDetails) {
            saveRideToStorage(rideDetails);
        }

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
                socketListenersSet.current = false;
            }
        };
    }, []);

    // Setup socket listeners when socket changes
    useEffect(() => {
        if (socket && socket.connected && !socketListenersSet.current) {
            setupSocketListeners();
        }
    }, [socket, setupSocketListeners]);

    // Calculate distance and time to pickup - runs only once after location is obtained
    useEffect(() => {
        if (state.currentLocation && pickupCoordinates && !state.rideStarted && !state.distanceToPickup) {
            // Calculate straight-line distance (in km)
            const R = 6371; // Earth's radius in km
            const dLat = (pickupCoordinates.latitude - state.currentLocation.latitude) * Math.PI / 180;
            const dLon = (pickupCoordinates.longitude - state.currentLocation.longitude) * Math.PI / 180;
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(state.currentLocation.latitude * Math.PI / 180) * Math.cos(pickupCoordinates.latitude * Math.PI / 180) *
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
    }, [state.currentLocation, pickupCoordinates, state.rideStarted, state.distanceToPickup, logDebug, updateState]);

    // Function to handle ride cancellation with debugging
    const handleCancelRideByUser = useCallback(async () => {
        if (!socket) return;
        
        // We only need to set up this listener once
        socket.off('ride_cancelled'); // Remove any existing listener
        
        socket.on('ride_cancelled', (data) => {
            logDebug('Ride cancelled event received', data);
            startSound();

            sendNotification({
                title: "🚨 Ride Cancelled",
                body: "The ride has been cancelled by the customer."
            });
        });
        
        await clearRideFromStorage();
    }, [socket, logDebug, startSound, sendNotification]);

    // Set up ride cancellation listener
    useEffect(() => {
        handleCancelRideByUser();
        
        return () => {
            if (socket) {
                socket.off('ride_cancelled');
            }
        };
    }, [handleCancelRideByUser, socket]);

    // ===== RENDER COMPONENTS =====
    // Loading screen
    if (state.loading) {
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
    if (state.errorMsg) {
        return (
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 20,
                backgroundColor: '#fff'
            }}>
                <MaterialIcons name="error" size={60} color="#FF3B30" />
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 20, textAlign: 'center' }}>{state.errorMsg}</Text>
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
            provider={MapView.PROVIDER_GOOGLE}
            initialRegion={{
              ...driverCoordinates,
              latitudeDelta: LATITUDE_DELTA,
              longitudeDelta: LONGITUDE_DELTA,
            }}
            onMapReady={handleMapReady}
          >
            {state.currentLocation && (
              <Marker coordinate={state.currentLocation} title="Your Location">
                <Animated.View style={{
                  transform: [{
                    scale: carIconAnimation.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] })
                  }]
                }}>
                  <FontAwesome5 name="car" size={24} color="#FF3B30" />
                </Animated.View>
              </Marker>
            )}
  
            {!state.rideStarted && (
              <Marker coordinate={pickupCoordinates} title="Pickup Location" description={pickup_desc}>
                <View style={{ backgroundColor: '#4CAF50', padding: 5, borderRadius: 10 }}>
                  <MaterialIcons name="location-on" size={24} color="white" />
                </View>
              </Marker>
            )}
  
            <Marker coordinate={dropCoordinates} title="Drop Location" description={drop_desc}>
              <View style={{ backgroundColor: '#F44336', padding: 5, borderRadius: 10 }}>
                <MaterialIcons name="location-on" size={24} color="white" />
              </View>
            </Marker>
  
            {state.mapReady && state.currentLocation && (
              <MapViewDirections
                origin={state.currentLocation}
                destination={state.rideStarted ? dropCoordinates : pickupCoordinates}
                apikey={GOOGLE_MAPS_APIKEY}
                strokeWidth={4}
                strokeColor={state.rideStarted ? "#FF3B30" : "#4CAF50"}
                onReady={(result) => {
                  updateState({
                    distanceToPickup: result.distance.toFixed(1),
                    timeToPickup: Math.round(result.duration)
                  });
                }}
              />
            )}
          </MapView>
  
          <View style={{
            position: 'absolute', top: 10, right: 10,
            backgroundColor: state.socketConnected ? '#4CAF50' : '#F44336',
            paddingHorizontal: 10, paddingVertical: 5,
            borderRadius: 15, flexDirection: 'row', alignItems: 'center'
          }}>
            <MaterialIcons name={state.socketConnected ? "wifi" : "wifi-off"} size={16} color="white" />
            <Text style={{ color: 'white', marginLeft: 5, fontSize: 12 }}>
              {state.socketConnected ? "Connected" : "Disconnected"}
            </Text>
          </View>
  
          <TouchableOpacity
            style={{
              position: 'absolute', top: 10, left: 10,
              backgroundColor: 'white', padding: 10,
              borderRadius: 50, elevation: 5,
              shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25, shadowRadius: 3.84
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
                {state.rideStarted ? "Ride in Progress" : "Heading to Pickup"}
              </Text>
              <Text style={{ color: '#666', marginTop: 5 }}>
                {state.rideStarted ? `${kmOfRide} km total ride` : `${state.distanceToPickup || '0'} km to pickup`}
              </Text>
            </View>
            <View style={{
              backgroundColor: state.rideStarted ? '#4CAF50' : '#FF9800',
              paddingHorizontal: 12, paddingVertical: 6,
              borderRadius: 15
            }}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>
                {state.rideStarted ? "In Progress" : params?.ride_is_started ? 'Pickup' : 'Progress'}
              </Text>
            </View>
          </View>
  
          <Divider style={{ marginVertical: 10 }} />
  
          <View style={{ marginBottom: 15 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ backgroundColor: '#4CAF50', width: 10, height: 10, borderRadius: 5, marginRight: 10 }} />
              <Text style={{ flex: 1 }}>{pickup_desc || params?.pickup_desc}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ backgroundColor: '#F44336', width: 10, height: 10, borderRadius: 5, marginRight: 10 }} />
              <Text style={{ flex: 1 }}>{drop_desc || params?.drop_desc}</Text>
            </View>
          </View>
  
          {!state.rideStarted && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', padding: 10, borderRadius: 8, marginBottom: 15 }}>
              <MaterialIcons name="access-time" size={24} color="#FF3B30" style={{ marginRight: 10 }} />
              <Text>
                Estimated time to pickup: <Text style={{ fontWeight: 'bold' }}>{state.timeToPickup || '0'} min</Text>
              </Text>
            </View>
          )}
  
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {!state.rideStarted ? (
              <>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#f0f0f0', padding: 15, borderRadius: 8, alignItems: 'center', marginRight: 10 }}
                  onPress={() => updateState({ showCancelModal: true })}
                >
                  <Text style={{ color: '#FF3B30', fontWeight: 'bold' }}>Cancel Ride</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#FF3B30', padding: 15, borderRadius: 8, alignItems: 'center' }}
                  onPress={() => updateState({ showOtpModal: true })}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Enter OTP</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#4CAF50', padding: 15, borderRadius: 8, alignItems: 'center' }}
                onPress={handleCompleteRide}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Complete Ride</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
  
        <OtpModal appState={state} updateState={updateState} handleOtpSubmit={handleOtpSubmit} />
        <CancelReasonsModal appState={state} updateState={updateState} handleCancelRide={handleCancelRide} />
      </SafeAreaView>
    );
}