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

import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

import {
  FontAwesome5,
  MaterialIcons,
} from '@expo/vector-icons';
import { useSocket } from "../context/SocketContext";

import OtpModal from "./OtpModal";
import CancelReasonsModal from "./CancelReasonsModal";
import { RideMap } from "./RideMap";
import { RideInfoPanel } from "./RideInfoPanel.js";
import { useRideActions } from "../hooks/useRideActions";
import { useLocationTrackingTwo } from "../hooks/useLocationTrackingTwo";

// Constants
const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
const API_BASE_URL = "https://appapi.olyox.com";

export default function RideDetailsScreen() {
  // ===== REFS =====
  const mapRef = useRef(null);
  const carIconAnimation = useRef(new Animated.Value(0)).current;
  const soundRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const socketConnectionAttempts = useRef(0);
  const isInitialMount = useRef(true);
  const socketListenersSet = useRef(false);
  const rideDataRef = useRef(null);

  // ===== NAVIGATION & ROUTE =====
  const route = useRoute();
  const navigation = useNavigation();
  const { params } = route || {};

  // ===== SOCKET CONTEXT =====
  const { socket } = useSocket();

  // ===== STATE =====
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
    showDirectionsType: "driver_to_pickup",
    errorMsg: null,
    cancelReasons: [],
    showCancelModal: false,
    selectedReason: null,
    sound: null,
    socketConnected: socket?.connected || false,
  });

  const [driverCoordinates, setDriverCoordinates] = useState(null);
  const [pickupCoordinates, setPickupCoordinates] = useState(null);
  const [dropCoordinates, setDropCoordinates] = useState(null);
  const [rideDetails, setRideDetails] = useState({});

  // ===== HELPER FUNCTIONS =====
  const updateState = useCallback((newState) => {
    setState(prevState => ({ ...prevState, ...newState }));
  }, []);

  const logDebug = useCallback((message, data = null) => {
    if (__DEV__) {
      if (data) {
        console.log(`✔️ ${message}`, data);
      } else {
        console.log(`✔️ ${message}`);
      }
    }
  }, []);

  const logError = useCallback((message, error = null) => {
    if (error) {
      console.error(`❌ ${message}`, error);
    } else {
      console.error(`❌ ${message}`);
    }
  }, []);

  // ===== RIDE DETAILS =====
  const checkAuthToken = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token_cab');

      if (!token) {
        logError('No auth token found');
        return null;
      }

      const response = await axios.get(
        `${API_BASE_URL}/api/v1/rider/user-details`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const partner = response.data.partner;

      if (partner?.on_ride_id) {
        logDebug('Found active ride ID from user details', partner.on_ride_id);
        return partner.on_ride_id;
      }

      return null;
    } catch (error) {
      logError('Auth token check failed', error);
      return null;
    }
  }, [logDebug, logError]);

  // Get ride ID from params or auth check
  const getRideId = useCallback(async () => {
    // First check if we have an ID from params
    if (params?.temp_ride_id) {
      logDebug('Using ride ID from params', params.temp_ride_id);
      return params.temp_ride_id;
    }

    // If not, check from auth token
    const authRideId = await checkAuthToken();
    if (authRideId) {
      logDebug('Using ride ID from auth check', authRideId);
      return authRideId;
    }



    return null;
  }, [params, checkAuthToken, logDebug, logError, updateState]);

  // Fetch ride details from API
  const foundRideDetails = useCallback(async (rideId) => {
    if (!rideId) {
      logError('Cannot fetch ride details: No ride ID provided');
      updateState({ loading: false });
      return;
    }

    try {
      logDebug('Fetching ride details', { rideId });
      const response = await axios.get(`${API_BASE_URL}/rider/${rideId}`);
      console.log('sssssssssssss', response.data)
      if (!response.data) {
        throw new Error('No ride data returned from API');
      }

      logDebug('Ride details fetched successfully');

      // Save the complete ride data for use throughout component
      setRideDetails(response.data);

      // Update component state
      updateState({
        loading: false,
        rideStarted: !!response?.data?.ride?.rideDetails?.otp_verify_time,
        showDirectionsType: !!response?.data?.ride?.rideDetails?.otp_verify_time
          ? "pickup_to_drop"
          : "driver_to_pickup",
        // otp: response?.data?.ride?.rideDetails?.RideOtp || response?.data?.RideOtp || ""
      });

      return response.data;
    } catch (error) {
      logError('Failed to fetch ride details', error.response.data);
     
      return null;
    }
  }, []);

  useEffect(() => {
    const initializeRideData = async () => {
      // Get ride ID from any available source
      const rideId = await getRideId();

      if (rideId) {
        // Fetch full ride details using the ID
        const rideData = await foundRideDetails(rideId);
        rideDataRef.current = rideData;
      }
    };

    initializeRideData();
  }, [getRideId, foundRideDetails]);

 
  const {
    currentLocation,
    startLocationTracking,
    stopLocationTracking
  } = useLocationTrackingTwo(socket, rideDetails?._id, state.rideStarted);

  const {
    handleOtpSubmit,
    handleCancelRide,
    handleCompleteRide,
    openGoogleMapsDirections,
    openGoogleMapsDirectionsPickup,
    startSound,
    stopSound,
    fetchCancelReasons
  } = useRideActions({
    state,
    setState,
    rideDetails,
    socket,
    navigation,
    mapRef,
    soundRef
  });

  // ===== COORDINATES =====
  useEffect(() => {
    if (!rideDetails) return;

    const getCoordinates = () => {
      // Driver/Rider coordinates
      if (currentLocation) {
        console.log("Current Location", currentLocation)
        setDriverCoordinates(currentLocation);
      } else if (rideDetails?.rider?.location?.coordinates) {
        console.log("Coordinated", rideDetails?.rider?.location?.coordinates)
        setDriverCoordinates({
          latitude: rideDetails.rider.location.coordinates[1],
          longitude: rideDetails.rider.location.coordinates[0],
        });
      } else {
        // Default coordinates
        setDriverCoordinates({ latitude: 28.7041, longitude: 77.1025 });
      }

      // Pickup coordinates
      if (rideDetails?.ride?.rideDetails.pickupLocation?.coordinates) {
        setPickupCoordinates({
          latitude: rideDetails?.ride?.rideDetails.pickupLocation.coordinates[1],
          longitude: rideDetails?.ride?.rideDetails.pickupLocation.coordinates[0],
        });
      } else {
        // Default coordinates
        setPickupCoordinates({ latitude: 28.7041, longitude: 77.1025 });
      }

      // Drop coordinates
      if (rideDetails?.ride?.rideDetails.dropLocation?.coordinates) {
        setDropCoordinates({
          latitude: rideDetails?.ride?.rideDetails.dropLocation.coordinates[1],
          longitude: rideDetails?.ride?.rideDetails.dropLocation.coordinates[0],
        });
      } else {
        // Default coordinates
        setDropCoordinates({ latitude: 28.6139, longitude: 77.2090 });
      }
    };

    getCoordinates();
  }, [rideDetails, currentLocation]);



  // ===== SOCKET MANAGEMENT =====
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



    // ✅ Always remove existing listeners first
    socket.off('ride_end');
    socket.off('ride_cancelled');

    socket.on('ride_end', (data) => {
      logDebug('Ride completed event received', data);
      updateState({ rideCompleted: true });
      navigation.navigate('collect_money', { data: data?.rideDetails });
      showLocalNotification("Ride Completed", "The ride has been completed successfully!");
    });



    socket.on('ride_cancelled', (data) => {
      logDebug('Ride cancelled event received', data);
      startSound();
      navigation.navigate('Home')
      showLocalNotification("🚨 Ride Cancelled", "The ride has been cancelled by the customer.");
    });

    socketListenersSet.current = true;
    logDebug('Socket listeners setup complete');
  }, [socket, logDebug, updateState, navigation, startSound]);

  // Handle map ready
  const handleMapReady = useCallback(() => {
    logDebug('Map is ready');
    updateState({ mapReady: true });

    // Fit map to show current location and pickup/drop
    if (mapRef.current && currentLocation) {
      setTimeout(() => {
        const coordinates = [
          currentLocation,
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
    logDebug, updateState, currentLocation,
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
      startLocationTracking();
    }

    appStateRef.current = nextAppState;
  }, [
    logDebug, socket, connectSocket,
    setupSocketListeners, startLocationTracking
  ]);

  // Show local notification (replacement for Expo notifications)
  const showLocalNotification = useCallback((title, body) => {
    // This is a simple Alert-based notification since we're removing Expo notifications
    // In a production app, you would use a proper notification library compatible with production builds
    if (AppState.currentState !== 'active') {
      // Only show alert if app is in foreground
      return;
    }

    setTimeout(() => {
      Alert.alert(title, body);
    }, 500);
  }, []);

  // ===== EFFECTS =====
  // Initialize component - runs only once
  useEffect(() => {
    if (!isInitialMount.current) return;
    isInitialMount.current = false;

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
    if (currentLocation && pickupCoordinates && !state.rideStarted && !state.distanceToPickup) {
      // Calculate straight-line distance (in km)
      const R = 6371; // Earth's radius in km
      const dLat = (pickupCoordinates.latitude - currentLocation.latitude) * Math.PI / 180;
      const dLon = (pickupCoordinates.longitude - currentLocation.longitude) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(currentLocation.latitude * Math.PI / 180) * Math.cos(pickupCoordinates.latitude * Math.PI / 180) *
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
  }, [currentLocation, pickupCoordinates, state.rideStarted, state.distanceToPickup, logDebug, updateState]);

  // Function to handle ride cancellation with debugging
  const handleCancelRideByUser = useCallback(async () => {
    if (!socket) return;

    // We only need to set up this listener once
    socket.off('ride_cancelled'); // Remove any existing listener

    socket.on('ride_cancelled', (data) => {
      logDebug('Ride cancelled event received', data);
      startSound();
      showLocalNotification("🚨 Ride Cancelled", "The ride has been cancelled by the customer.");
    });
  }, [socket, logDebug, startSound, showLocalNotification]);


  useEffect(() => {
    const socketInstance = socket // Get your socket instance
    if (!socketInstance) return;
  
    const handleRideCompleteConfirmation = (data) => {
      console.log('✔️ Ride completed event received', data);
  
      Alert.alert(
        'Ride Complete Confirmation',
        data?.message || 'User marked your ride as complete. Is that correct?',
        [
          {
            text: 'No',
            onPress: async () => {
              try {
                console.log('❌ Driver denied ride completion');
                const rideId = await getRideId(); // Ensure this is defined
                console.log("rideData",rideId)
                if (rideId) {
                  const rideData = await foundRideDetails(rideId); // Ensure this is defined
                  console.log("rideDatrideDataa",rideData)

                  setTimeout(()=>{
                    socketInstance.emit('ride_incorrect_mark_done_user', { rideDetails:rideData });
                    console.log("i am send")
                  },1500)
                }
              } catch (error) {
                console.error('❌ Error while denying ride completion:', error);
              }
            },
            style: 'cancel',
          },
          {
            text: 'Yes',
            onPress: () => {
              console.log('✅ Driver confirmed ride completion');
              handleCompleteRide(); 
            },
          },
        ],
        { cancelable: false }
      );
    };
  
    socketInstance.on('your_ride_is_mark_complete_by_user', handleRideCompleteConfirmation);
  
    return () => {
      socketInstance.off('your_ride_is_mark_complete_by_user', handleRideCompleteConfirmation);
    };
  }, []);
  


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

  // Extract needed properties from ride details
  const {
    drop_desc = rideDetails?.ride?.driver?.drop_desc || rideDetails?.ride?.driver?.rideDetails?.ride?.driver?.drop_desc || "",
    pickup_desc = rideDetails?.ride?.driver?.pickup_desc || rideDetails?.ride?.driver?.rideDetails?.ride?.driver?.pickup_desc || "",
    kmOfRide = rideDetails?.ride?.driver?.kmOfRide || rideDetails?.ride?.driver?.rideDetails?.ride?.driver?.kmOfRide || "0",
    RideOtp = rideDetails?.ride?.driver?.otp || rideDetails?.ride?.driver?.otp || "",
  } = rideDetails;

  // console.log("drop_desc rideDetails?.drop_desc", rideDetails?.ride?.driver?.otp)
  // Main screen
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <RideMap
        mapRef={mapRef}
        driverCoordinates={driverCoordinates}
        pickupCoordinates={pickupCoordinates}
        dropCoordinates={dropCoordinates}
        currentLocation={currentLocation}
        rideStarted={state.rideStarted}
        mapReady={state.mapReady}
        socketConnected={state.socketConnected}
        carIconAnimation={carIconAnimation}
        handleMapReady={handleMapReady}
        openGoogleMapsDirectionsPickup={openGoogleMapsDirectionsPickup}
        openGoogleMapsDirections={openGoogleMapsDirections}
        pickup_desc={pickup_desc}
        drop_desc={drop_desc}
        updateState={updateState}
      />

      <RideInfoPanel
        state={state}
        updateState={updateState}
        rideStarted={state.rideStarted}
        kmOfRide={kmOfRide}
        distanceToPickup={state.distanceToPickup}
        timeToPickup={state.timeToPickup}
        pickup_desc={pickup_desc}
        drop_desc={drop_desc}
        params={{ rideDetails }}
        handleCompleteRide={handleCompleteRide}
      />

      <OtpModal
        appState={state}
        updateState={updateState}
        riderDetails={rideDetails}
        update={foundRideDetails}
        handleOtpSubmit={handleOtpSubmit}
      />

      <CancelReasonsModal
        appState={state}
        updateState={updateState}
        handleCancelRide={handleCancelRide}
      />
    </SafeAreaView>
  );
}