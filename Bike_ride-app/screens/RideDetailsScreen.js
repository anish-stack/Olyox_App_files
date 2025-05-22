import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  Dimensions,
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
// import RideMap from './RideMap.js'
import { RideInfoPanel } from "./RideInfoPanel.js";
import { useRideActions } from "../hooks/useRideActions";
import { useLocationTrackingTwo } from "../hooks/useLocationTrackingTwo";

// Constants
const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
const API_BASE_URL = "https://appapi.olyox.com";

// 🛑 CRITICAL: Location update thresholds to prevent spam
const LOCATION_UPDATE_THRESHOLD = 0.0001; // ~10 meters
const LOCATION_UPDATE_INTERVAL = 5000; // 5 seconds minimum between updates
const APP_STATE_DEBOUNCE_TIME = 2000; // 2 seconds debounce for app state

// Performance timer utility
const performanceTimer = {
  start: (label) => {
    console.time(`⏱️ ${label}`);
    console.log(`🚀 Starting: ${label}`);
  },
  end: (label) => {
    console.timeEnd(`⏱️ ${label}`);
    console.log(`✅ Completed: ${label}`);
  }
};

// 🛑 CRITICAL: Debounce utility to prevent excessive function calls
const debounce = (func, wait, immediate) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
};

// 🛑 CRITICAL: Throttle utility for location updates
const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

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
  const authTokenRef = useRef(null);
  const rideIdRef = useRef(null);
  const lastLocationUpdateTime = useRef(0);
  const lastSignificantLocation = useRef(null);
  const appStateChangeTimeoutRef = useRef(null);

  // ===== NAVIGATION & ROUTE =====
  const route = useRoute();
  const navigation = useNavigation();
  const { params } = route || {};

  // ===== SOCKET CONTEXT =====
  const { socket } = useSocket();

  // ===== OPTIMIZED STATE - Split into smaller pieces =====
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rideDetails, setRideDetails] = useState(null);
  const [rideStarted, setRideStarted] = useState(false);
  const [rideCompleted, setRideCompleted] = useState(false);
  const [socketConnected, setSocketConnected] = useState(socket?.connected || false);
  
  // UI State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReasons, setCancelReasons] = useState([]);
  const [selectedReason, setSelectedReason] = useState(null);
  
  // Map State
  const [mapReady, setMapReady] = useState(false);
  const [distanceToPickup, setDistanceToPickup] = useState(null);
  const [timeToPickup, setTimeToPickup] = useState(null);

  // 🛑 CRITICAL: Stable coordinates to prevent constant re-renders
  const [stableDriverCoordinates, setStableDriverCoordinates] = useState(null);
  const [stablePickupCoordinates, setStablePickupCoordinates] = useState(null);
  const [stableDropCoordinates, setStableDropCoordinates] = useState(null);

  // ===== MEMOIZED VALUES =====
  const showDirectionsType = useMemo(() => {
    return rideStarted ? "pickup_to_drop" : "driver_to_pickup";
  }, [rideStarted]);

  // Extract ride properties with memoization
  const rideProps = useMemo(() => {
    if (!rideDetails) return {};
    
    return {
      drop_desc: rideDetails?.ride?.driver?.drop_desc || "",
      pickup_desc: rideDetails?.ride?.driver?.pickup_desc || "",
      kmOfRide: rideDetails?.ride?.driver?.kmOfRide || "0",
      RideOtp: rideDetails?.ride?.driver?.otp || "",
    };
  }, [rideDetails]);

  // ===== CRITICAL: Location significance checker =====
  const isLocationSignificantlyDifferent = useCallback((newLocation, oldLocation) => {
    if (!oldLocation || !newLocation) return true;
    
    const latDiff = Math.abs(newLocation.latitude - oldLocation.latitude);
    const lngDiff = Math.abs(newLocation.longitude - oldLocation.longitude);
    
    return latDiff > LOCATION_UPDATE_THRESHOLD || lngDiff > LOCATION_UPDATE_THRESHOLD;
  }, []);

  // ===== OPTIMIZED HELPER FUNCTIONS =====
  const logDebug = useCallback((message, data = null) => {
    if (__DEV__) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      if (data) {
        console.log(`✔️ [${timestamp}] ${message}`, data);
      } else {
        console.log(`✔️ [${timestamp}] ${message}`);
      }
    }
  }, []);

  const logError = useCallback((message, error = null) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    if (error) {
      console.error(`❌ [${timestamp}] ${message}`, error);
    } else {
      console.error(`❌ [${timestamp}] ${message}`);
    }
  }, []);

  // ===== OPTIMIZED API CALLS =====
  const getAuthToken = useCallback(async () => {
    if (authTokenRef.current) {
      return authTokenRef.current;
    }

    performanceTimer.start('Auth Token Fetch');
    try {
      const token = await SecureStore.getItemAsync('auth_token_cab');
      authTokenRef.current = token;
      performanceTimer.end('Auth Token Fetch');
      return token;
    } catch (error) {
      performanceTimer.end('Auth Token Fetch');
      logError('Failed to get auth token', error);
      return null;
    }
  }, [logError]);

  const checkAuthToken = useCallback(async () => {
    performanceTimer.start('Auth Token Check');
    
    try {
      const token = await getAuthToken();
      if (!token) {
        performanceTimer.end('Auth Token Check');
        logError('No auth token found');
        return null;
      }

      const response = await axios.get(
        `${API_BASE_URL}/api/v1/rider/user-details`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }
      );

      const partner = response.data.partner;
      const rideId = partner?.on_ride_id || null;
      
      performanceTimer.end('Auth Token Check');
      
      if (rideId) {
        logDebug('Found active ride ID from user details', rideId);
        rideIdRef.current = rideId;
      }

      return rideId;
    } catch (error) {
      performanceTimer.end('Auth Token Check');
      logError('Auth token check failed', error);
      return null;
    }
  }, [getAuthToken, logDebug, logError]);

  const getRideId = useCallback(async () => {
    if (rideIdRef.current) {
      logDebug('Using cached ride ID', rideIdRef.current);
      return rideIdRef.current;
    }

    performanceTimer.start('Get Ride ID');
    
    if (params?.temp_ride_id) {
      logDebug('Using ride ID from params', params.temp_ride_id);
      rideIdRef.current = params.temp_ride_id;
      performanceTimer.end('Get Ride ID');
      return params.temp_ride_id;
    }

    const authRideId = await checkAuthToken();
    performanceTimer.end('Get Ride ID');
    
    return authRideId;
  }, [params, checkAuthToken, logDebug]);

  const fetchRideDetails = useCallback(async (rideId) => {
    if (!rideId) {
      logError('Cannot fetch ride details: No ride ID provided');
      setLoading(false);
      setError('No ride ID available');
      return null;
    }

    performanceTimer.start('Fetch Ride Details');
    
    try {
      logDebug('Fetching ride details', { rideId });
      
      const response = await axios.get(`${API_BASE_URL}/rider/${rideId}`, {
        timeout: 15000
      });
      
      performanceTimer.end('Fetch Ride Details');
      
      if (!response.data) {
        throw new Error('No ride data returned from API');
      }

      logDebug('Ride details fetched successfully');
      console.log('📊 Ride Data:', response.data);

      setRideDetails(response.data);
      setRideStarted(!!response?.data?.ride?.rideDetails?.otp_verify_time);
      setLoading(false);
      setError(null);

      rideDataRef.current = response.data;

      return response.data;
    } catch (error) {
      performanceTimer.end('Fetch Ride Details');
      logError('Failed to fetch ride details', error);
      
      setLoading(false);
      setError('Failed to load ride details. Please try again.');
      return null;
    }
  }, [logDebug, logError]);

  // ===== CRITICAL: Throttled location tracking =====
  const {
    currentLocation,
    startLocationTracking,
    stopLocationTracking
  } = useLocationTrackingTwo(socket, rideDetails?._id, rideStarted);

  // 🛑 CRITICAL: Throttled location update handler
  const handleLocationUpdate = useCallback(
    throttle((newLocation) => {
      const now = Date.now();
      
      // Check time threshold
      if (now - lastLocationUpdateTime.current < LOCATION_UPDATE_INTERVAL) {
        return;
      }
      
      // Check distance threshold
      if (!isLocationSignificantlyDifferent(newLocation, lastSignificantLocation.current)) {
        return;
      }
      
      console.log("📍 SIGNIFICANT Location Update:", newLocation);
      
      lastLocationUpdateTime.current = now;
      lastSignificantLocation.current = newLocation;
      setStableDriverCoordinates(newLocation);
      
    }, LOCATION_UPDATE_INTERVAL),
    [isLocationSignificantlyDifferent]
  );

  // Update stable coordinates when location changes significantly
  useEffect(() => {
    if (currentLocation) {
      handleLocationUpdate(currentLocation);
    }
  }, [currentLocation, handleLocationUpdate]);

  // ===== OPTIMIZED RIDE ACTIONS =====
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
    state: {
      loading,
      showOtpModal,
      rideStarted,
      rideCompleted,
      currentLocation: stableDriverCoordinates, // Use stable coordinates
      mapReady,
      distanceToPickup,
      timeToPickup,
      showDirectionsType,
      errorMsg: error,
      cancelReasons,
      showCancelModal,
      selectedReason,
      socketConnected,
    },
    setState: (newState) => {
      if (newState.showOtpModal !== undefined) setShowOtpModal(newState.showOtpModal);
      if (newState.showCancelModal !== undefined) setShowCancelModal(newState.showCancelModal);
      if (newState.selectedReason !== undefined) setSelectedReason(newState.selectedReason);
      if (newState.rideCompleted !== undefined) setRideCompleted(newState.rideCompleted);
    },
    rideDetails,
    socket,
    navigation,
    mapRef,
    soundRef
  });

  // ===== OPTIMIZED COORDINATES CALCULATION =====
  useEffect(() => {
    if (!rideDetails) return;

    performanceTimer.start('Calculate Stable Coordinates');

    // Only update pickup/drop coordinates once when ride details are available
    if (rideDetails?.ride?.rideDetails?.pickupLocation?.coordinates && !stablePickupCoordinates) {
      setStablePickupCoordinates({
        latitude: rideDetails.ride.rideDetails.pickupLocation.coordinates[1],
        longitude: rideDetails.ride.rideDetails.pickupLocation.coordinates[0],
      });
    }

    if (rideDetails?.ride?.rideDetails?.dropLocation?.coordinates && !stableDropCoordinates) {
      setStableDropCoordinates({
        latitude: rideDetails.ride.rideDetails.dropLocation.coordinates[1],
        longitude: rideDetails.ride.rideDetails.dropLocation.coordinates[0],
      });
    }

    performanceTimer.end('Calculate Stable Coordinates');
  }, [rideDetails, stablePickupCoordinates, stableDropCoordinates]);

  // ===== CRITICAL: Debounced app state handler =====
  const handleAppStateChange = useCallback(
    debounce((nextAppState) => {
      const isSignificantChange =
        (appStateRef.current === 'active' && nextAppState !== 'active') ||
        (appStateRef.current !== 'active' && nextAppState === 'active');

      if (isSignificantChange) {
        logDebug(`🔄 AppState SIGNIFICANT change: ${appStateRef.current} → ${nextAppState}`);
        
        if (appStateRef.current.match(/inactive|background/) && nextAppState === "active") {
          logDebug('App became active - checking connections');

          if (socket && !socket.connected) {
            logDebug('Reconnecting socket after app became active');
            connectSocket();
          }

          startLocationTracking();
        }
      } else {
        // Suppress frequent logging for non-significant changes
        console.log(`🔇 AppState minor change suppressed: ${appStateRef.current} → ${nextAppState}`);
      }

      appStateRef.current = nextAppState;
    }, APP_STATE_DEBOUNCE_TIME),
    [logDebug, socket, startLocationTracking]
  );

  // ===== OPTIMIZED SOCKET MANAGEMENT =====
  const connectSocket = useCallback(() => {
    if (!socket) {
      logError('Socket instance not available');
      return false;
    }

    if (!socket.connected) {
      performanceTimer.start('Socket Connection');
      logDebug('Connecting socket...');
      socketConnectionAttempts.current += 1;
      socket.connect();

      setTimeout(() => {
        if (socket.connected) {
          performanceTimer.end('Socket Connection');
          logDebug('Socket connected successfully');
          setSocketConnected(true);
          setupSocketListeners();
        } else {
          performanceTimer.end('Socket Connection');
          logError(`Socket connection failed (attempt ${socketConnectionAttempts.current})`);
          if (socketConnectionAttempts.current < 3) {
            connectSocket();
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
      setSocketConnected(true);
      return true;
    }
  }, [socket, logDebug, logError]);

  const setupSocketListeners = useCallback(() => {
    if (!socket || socketListenersSet.current) return;

    performanceTimer.start('Socket Listeners Setup');
    logDebug('Setting up socket listeners');

    socket.off('ride_end');
    socket.off('ride_cancelled');
    socket.off('your_ride_is_mark_complete_by_user');

    socket.on('ride_end', (data) => {
      logDebug('Ride completed event received', data);
      setRideCompleted(true);
      navigation.navigate('collect_money', { data: data?.rideDetails });
      showLocalNotification("Ride Completed", "The ride has been completed successfully!");
    });

    socket.on('ride_cancelled', (data) => {
      logDebug('Ride cancelled event received', data);
      startSound();
      navigation.navigate('Home');
      showLocalNotification("🚨 Ride Cancelled", "The ride has been cancelled by the customer.");
    });

    socket.on('your_ride_is_mark_complete_by_user', (data) => {
      console.log('✔️ Ride completed event received', data);
      startSound();
      Alert.alert(
        'Ride Complete Confirmation',
        data?.message || 'User marked your ride as complete. Is that correct?',
        [
          {
            text: 'No',
            onPress: async () => {
              try {
                console.log('❌ Driver denied ride completion');
                const rideId = rideIdRef.current || await getRideId();
                console.log("🆔 Ride ID", rideId);
                if (rideId) {
                  const rideData = rideDataRef.current || await fetchRideDetails(rideId);
                  console.log("📊 Ride Data", rideData);
                  stopSound();
                  setTimeout(() => {
                    socket.emit('ride_incorrect_mark_done_user', { rideDetails: rideData });
                    console.log("📤 Sent ride incorrect mark");
                  }, 1500);
                }
              } catch (error) {
                stopSound();
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
    });

    socketListenersSet.current = true;
    performanceTimer.end('Socket Listeners Setup');
    logDebug('Socket listeners setup complete');
  }, [socket, logDebug, navigation, startSound, stopSound, handleCompleteRide, getRideId, fetchRideDetails]);

  // ===== OPTIMIZED DISTANCE CALCULATION =====
  useEffect(() => {
    if (stableDriverCoordinates && stablePickupCoordinates && !rideStarted && !distanceToPickup) {
      performanceTimer.start('Distance Calculation');
      
      const R = 6371;
      const dLat = (stablePickupCoordinates.latitude - stableDriverCoordinates.latitude) * Math.PI / 180;
      const dLon = (stablePickupCoordinates.longitude - stableDriverCoordinates.longitude) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(stableDriverCoordinates.latitude * Math.PI / 180) * Math.cos(stablePickupCoordinates.latitude * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      const distanceFormatted = distance.toFixed(1);
      const timeInMinutes = (distance / 30) * 60;
      const timeFormatted = Math.round(timeInMinutes);

      logDebug('Distance calculation complete', {
        distance: distanceFormatted,
        time: timeFormatted
      });

      setDistanceToPickup(distanceFormatted);
      setTimeToPickup(timeFormatted);
      
      performanceTimer.end('Distance Calculation');
    }
  }, [stableDriverCoordinates, stablePickupCoordinates, rideStarted, distanceToPickup, logDebug]);

  // ===== OPTIMIZED MAP READY HANDLER =====
  const handleMapReady = useCallback(() => {
    performanceTimer.start('Map Ready Setup');
    logDebug('Map is ready');
    setMapReady(true);

    if (mapRef.current && stableDriverCoordinates) {
      setTimeout(() => {
        const coordinates = [
          stableDriverCoordinates,
          rideStarted ? stableDropCoordinates : stablePickupCoordinates
        ].filter(Boolean);

        if (coordinates.length > 0) {
          logDebug('Fitting map to coordinates', coordinates);
          mapRef.current.fitToCoordinates(
            coordinates,
            {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true,
            }
          );
        }
        performanceTimer.end('Map Ready Setup');
      }, 1000);
    } else {
      performanceTimer.end('Map Ready Setup');
    }
  }, [logDebug, stableDriverCoordinates, rideStarted, stableDropCoordinates, stablePickupCoordinates]);

  const showLocalNotification = useCallback((title, body) => {
    if (AppState.currentState !== 'active') {
      return;
    }

    setTimeout(() => {
      Alert.alert(title, body);
    }, 500);
  }, []);

  // ===== MAIN INITIALIZATION EFFECT =====
  useEffect(() => {
    if (!isInitialMount.current) return;
    isInitialMount.current = false;

    performanceTimer.start('Component Initialization');
    logDebug('🚀 Initializing RideDetailsScreen');

    const initializeComponent = async () => {
      try {
        const initPromises = [
          getRideId().then(rideId => rideId ? fetchRideDetails(rideId) : null),
          connectSocket(),
          startLocationTracking(),
          fetchCancelReasons(),
        ];

        const [rideData] = await Promise.all(initPromises);

        if (!rideData) {
          setError('Unable to load ride details');
          setLoading(false);
        }

        performanceTimer.end('Component Initialization');
        logDebug('✅ Component initialization complete');

      } catch (error) {
        performanceTimer.end('Component Initialization');
        logError('Component initialization failed', error);
        setError('Failed to initialize. Please try again.');
        setLoading(false);
      }
    };

    initializeComponent();

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

    // 🛑 CRITICAL: Use debounced app state handler
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      logDebug('🧹 Component unmounting, cleaning up resources');

      subscription.remove();
      stopLocationTracking();
      stopSound();

      if (socket) {
        socket.off('ride_end');
        socket.off('ride_cancelled');
        socket.off('your_ride_is_mark_complete_by_user');
        socketListenersSet.current = false;
      }

      // Clear timeouts
      if (appStateChangeTimeoutRef.current) {
        clearTimeout(appStateChangeTimeoutRef.current);
      }

      authTokenRef.current = null;
      rideIdRef.current = null;
      rideDataRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (socket && socket.connected && !socketListenersSet.current) {
      setupSocketListeners();
    }
  }, [socket, setupSocketListeners]);

  // ===== RENDER OPTIMIZATION =====
  
  if (loading) {
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

  if (error) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff'
      }}>
        <MaterialIcons name="error" size={60} color="#FF3B30" />
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 20, textAlign: 'center' }}>
          {error}
        </Text>
        <Button
          mode="contained"
          onPress={() => {
            setError(null);
            setLoading(true);
            getRideId().then(rideId => rideId ? fetchRideDetails(rideId) : null);
          }}
          style={{ marginTop: 20, backgroundColor: '#FF3B30' }}
        >
          Retry
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 10 }}
        >
          Go Back
        </Button>
      </View>
    );
  }

  // 🛑 CRITICAL: Use stable coordinates to prevent re-renders
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
        state={{
          loading,
          showOtpModal,
          rideStarted,
          rideCompleted,
          currentLocation: stableDriverCoordinates,
          mapReady,
          distanceToPickup,
          timeToPickup,
          showDirectionsType,
          errorMsg: error,
          cancelReasons,
          showCancelModal,
          selectedReason,
          socketConnected,
        }}
        updateState={(newState) => {
          if (newState.showOtpModal !== undefined) setShowOtpModal(newState.showOtpModal);
          if (newState.showCancelModal !== undefined) setShowCancelModal(newState.showCancelModal);
        }}
        rideStarted={rideStarted}
        kmOfRide={rideProps.kmOfRide}
        distanceToPickup={distanceToPickup}
        timeToPickup={timeToPickup}
        pickup_desc={rideProps.pickup_desc}
        drop_desc={rideProps.drop_desc}
        params={{ rideDetails }}
        handleCompleteRide={handleCompleteRide}
      />

      <OtpModal
        appState={{
          loading,
          showOtpModal,
          rideStarted,
          rideCompleted,
          currentLocation: stableDriverCoordinates,
          mapReady,
          distanceToPickup,
          timeToPickup,
          showDirectionsType,
          errorMsg: error,
          cancelReasons,
          showCancelModal,
          selectedReason,
          socketConnected,
        }}
        updateState={(newState) => {
          if (newState.showOtpModal !== undefined) setShowOtpModal(newState.showOtpModal);
        }}
        riderDetails={rideDetails}
        update={fetchRideDetails}
        handleOtpSubmit={handleOtpSubmit}
      />

      <CancelReasonsModal
        appState={{
          loading,
          showOtpModal,
          rideStarted,
          rideCompleted,
          currentLocation: stableDriverCoordinates,
          mapReady,
          distanceToPickup,
          timeToPickup,
          showDirectionsType,
          errorMsg: error,
          cancelReasons,
          showCancelModal,
          selectedReason,
          socketConnected,
        }}
        updateState={(newState) => {
          if (newState.showCancelModal !== undefined) setShowCancelModal(newState.showCancelModal);
          if (newState.selectedReason !== undefined) setSelectedReason(newState.selectedReason);
        }}
        handleCancelRide={handleCancelRide}
      />
    </SafeAreaView>
  );
}