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
import { LocalRideStorage } from '../services/DatabaseService'


// Constants
const GOOGLE_MAPS_APIKEY = "AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8";
const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
const API_BASE_URL = "http://192.168.1.11:3100/api/v1";




export default function RideDetailsScreen() {
  // ===== REFS =====
  const mapRef = useRef(null);
  const carIconAnimation = useRef(new Animated.Value(0)).current;
  const soundRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const socketConnectionAttempts = useRef(0);
  const isInitialMount = useRef(true);
  const socketListenersSet = useRef(false);


  const fns = async () => {
    const otpDb = await LocalRideStorage.getRide()
    return otpDb
  }


  // ===== NAVIGATION & ROUTE =====
  const route = useRoute();
  const navigation = useNavigation();
  const { params } = route.params || {}


  // console.log("My Params ",  params.dropLocation.coordinates[])

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

  // ===== CUSTOM HOOKS =====
  const {
    currentLocation,
    startLocationTracking,
    stopLocationTracking
  } = useLocationTrackingTwo(socket, rideId, state.rideStarted);


  const {
    handleOtpSubmit,
    handleCancelRide,
    handleCompleteRide,
    openGoogleMapsDirections,
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
    const getCoordinates = () => {
      if (rider) {
        setDriverCoordinates(currentLocation || (
          rider?.location?.coordinates
            ? {
              latitude: rider.location.coordinates[1],
              longitude: rider.location.coordinates[0],
            }
            : { latitude: 28.7041, longitude: 77.1025 }
        ));

        setPickupCoordinates(
          rideDetails?.pickupLocation
            ? {
              latitude: rideDetails.pickupLocation.coordinates[1],
              longitude: rideDetails.pickupLocation.coordinates[0],
            }
            : { latitude: 28.7041, longitude: 77.1025 }
        );

        setDropCoordinates(
          rideDetails?.dropLocation
            ? {
              latitude: rideDetails.dropLocation.coordinates[1],
              longitude: rideDetails.dropLocation.coordinates[0],
            }
            : { latitude: 28.6139, longitude: 77.2090 }
        );
      } else {
        setDriverCoordinates(currentLocation || (
          params?.rider?.location?.coordinates
            ? {
              latitude: params.rider.location.coordinates[1],
              longitude: params.rider.location.coordinates[0],
            }
            : { latitude: 28.7041, longitude: 77.1025 }
        ));

        setPickupCoordinates(
          params?.pickupLocation
            ? {
              latitude: params.pickupLocation.coordinates[1],
              longitude: params.pickupLocation.coordinates[0],
            }
            : { latitude: 28.7041, longitude: 77.1025 }
        );

        setDropCoordinates(
          params?.dropLocation
            ? {
              latitude: params.dropLocation.coordinates[1],
              longitude: params.dropLocation.coordinates[0],
            }
            : { latitude: 28.6139, longitude: 77.2090 }
        );
      }
    };

    getCoordinates();
  }, [rider, rideDetails, currentLocation, params]);

  // const driverCoordinates = useMemo(() =>
  //   currentLocation ||
  //   (rider?.location?.coordinates ? {
  //     latitude: rider.location.coordinates[1],
  //     longitude: rider.location.coordinates[0],
  //   } : { latitude: 28.7041, longitude: 77.1025 }),
  //   [currentLocation, rider?.location?.coordinates]);

  // const pickupCoordinates = useMemo(() =>
  //   rideDetails?.pickupLocation ? {
  //     latitude: rideDetails.pickupLocation.coordinates[1],
  //     longitude: rideDetails.pickupLocation.coordinates[0],
  //   } : { latitude: 28.7041, longitude: 77.1025 },
  //   [rideDetails?.pickupLocation]);

  // const dropCoordinates = useMemo(() =>
  //   rideDetails?.dropLocation ? {
  //     latitude: rideDetails.dropLocation.coordinates[1],
  //     longitude: rideDetails.dropLocation.coordinates[0],
  //   } : { latitude: 28.6139, longitude: 77.2090 },
  //   [rideDetails?.dropLocation]);

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
    // socket.off('mark_as_done_rejected');
    socket.off('ride_cancelled');

    // socket.off('mark_as_done_rejected');
    // socket.on('mark_as_done_rejected', (data) => {
    //   Alert.alert("Report Completed", data?.message);
    //   console.log("mark_as_done_rejected", data);
    // });
    socket.on('ride_end', (data) => {
      logDebug('Ride completed event received', data);
      updateState({ rideCompleted: true });
      navigation.navigate('collect_money', { data: data?.rideDetails });
      showLocalNotification("Ride Completed", "The ride has been completed successfully!");
    });

    socket.on('ride_cancelled', (data) => {
      logDebug('Ride cancelled event received', data);
      startSound();
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
  const loadSavedData = async () => {
    try {

      const savedRide = await LocalRideStorage.getRide()
      console.log("savedRides", savedRide)

      const rideToUse = params?.rideDetails || savedRide
      console.log("rideToUse", rideToUse)
      if (rideToUse) {

        const savedState = await LocalRideStorage.getRideState()
        console.log("savedState", savedState)

        updateState({
          loading: false,
          rideStarted: savedState.rideStarted,
          rideCompleted: savedState.rideCompleted,
          otp: savedState.otp,
          showDirectionsType: savedState.rideStarted ? "pickup_to_drop" : "driver_to_pickup",
        })

        // If this is a new ride from params, save it
        if (params?.rideDetails) {
          await LocalRideStorage.saveRide(rideDetails)
        }
      } else {
        updateState({ loading: false })
      }
    } catch (error) {
      logError("Error loading saved ride data", error)
      updateState({ loading: false })
    }
  }

  useEffect(() => {
    loadSavedData()
  }, [])


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

      const savedata = async () => {
        await LocalRideStorage.saveRide(rideDetails);
      }
      savedata()
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

    // await dbService.clearRideFromStorage();
  }, [socket, logDebug, startSound, showLocalNotification]);

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
  // if (state.loading) {
  //   return (
  //     <View style={{
  //       flex: 1,
  //       justifyContent: 'center',
  //       alignItems: 'center',
  //       backgroundColor: '#fff'
  //     }}>
  //       <ActivityIndicator size="large" color="#FF3B30" />
  //       <Text style={{ marginTop: 20, fontSize: 16 }}>Loading ride details...</Text>
  //     </View>
  //   );
  // }

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
        params={params}
        handleCompleteRide={handleCompleteRide}
      />

      <OtpModal
        appState={state}
        updateState={updateState}
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

