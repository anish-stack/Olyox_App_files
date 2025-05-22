import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  Dimensions, 
  AppState, 
  ActivityIndicator, 
  Image, 
  ScrollView, 
  Alert, 
  Platform,
  TouchableOpacity,
  Text,
  Animated,
  Easing,
  SafeAreaView,
  StatusBar,
  ImageBackground
} from 'react-native';
import { Audio } from 'expo-av';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons, Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSocket } from '../context/SocketContext';
import { useLocation } from '../context/LocationContext';
import axios from 'axios';
import { decode } from '@mapbox/polyline';
import LottieView from 'lottie-react-native';
import { useRideStatus } from '../context/CheckRideHaveOrNot.context';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');
const RIDE_REQUEST_TIMEOUT = 120000;

// Custom map style to match Uber/Ola
const mapStyle = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#f5f5f5" }]
  },
  {
    "elementType": "labels.icon",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#616161" }]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#bdbdbd" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#ffffff" }]
  },
  {
    "featureType": "road.arterial",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#757575" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#dadada" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#c9c9c9" }]
  }
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const sendRideNotification = async (data) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🚖 New Ride Request!",
      body: `Pickup: ${data.pickup_desc}\nDrop: ${data.drop_desc}\nPrice: ₹${data.riders[0].price}`,
      sound: 'default',
      badge: 1,
      data: { rideId: data.riders[0].rideRequestId }
    },
    trigger: null,
  });
};

// Custom Button Component
const CustomButton = ({ onPress, title, icon, type = 'primary', loading = false, disabled = false }) => {
  const buttonStyle = type === 'primary' 
    ? [styles.button, styles.primaryButton, disabled && styles.disabledButton] 
    : [styles.button, styles.secondaryButton, disabled && styles.disabledButton];
  
  const textStyle = type === 'primary' 
    ? styles.primaryButtonText 
    : styles.secondaryButtonText;
  
  const iconColor = type === 'primary' ? '#FFFFFF' : '#FF3B30';
  
  return (
    <TouchableOpacity 
      style={buttonStyle} 
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={type === 'primary' ? '#FFFFFF' : '#FF3B30'} />
      ) : (
        <>
          {icon && <MaterialCommunityIcons name={icon} size={20} color={iconColor} style={styles.buttonIcon} />}
          <Text style={textStyle}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

// Custom Toast Component
const Toast = ({ visible, message, onDismiss, type = 'info' }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => onDismiss());
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [visible, fadeAnim, onDismiss]);
  
  if (!visible) return null;
  
  const getToastStyle = () => {
    switch (type) {
      case 'success': return styles.toastSuccess;
      case 'error': return styles.toastError;
      default: return styles.toastInfo;
    }
  };
  
  const getIconName = () => {
    switch (type) {
      case 'success': return 'check-circle';
      case 'error': return 'alert-circle';
      default: return 'information';
    }
  };
  
  return (
    <Animated.View style={[styles.toast, getToastStyle(), { opacity: fadeAnim }]}>
      <MaterialCommunityIcons name={getIconName()} size={20} color="#FFFFFF" />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
};

// Progress Circle Component for Timer
const ProgressCircle = ({ progress, size = 60, strokeWidth = 6 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference * (1 - progress);
  
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          stroke="#E5E7EB"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke="#FF3B30"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={{ position: 'absolute' }}>
        <Text style={styles.timerText}>{Math.ceil(progress * 120)}s</Text>
      </View>
    </View>
  );
};

// SVG Components for Progress Circle
const Svg = ({ width, height, children }) => (
  <View style={{ width, height }}>{children}</View>
);

const Circle = ({ cx, cy, r, stroke, strokeWidth, strokeDasharray, strokeDashoffset, fill, strokeLinecap }) => {
  const viewBox = `0 0 ${cx * 2} ${cy * 2}`;
  
  return (
    <View 
      style={{
        width: cx * 2,
        height: cy * 2,
        borderRadius: r,
        borderWidth: strokeWidth,
        borderColor: stroke,
        position: 'absolute',
        ...(strokeDashoffset !== undefined && {
          borderStyle: 'dashed',
          borderDashPattern: [strokeDasharray / 10, strokeDasharray / 10],
        }),
      }}
    />
  );
};

export default function RideRequestScreen() {
  // Refs
  const navigation = useNavigation();
  const mapRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const timeoutRef = useRef(null);
  const soundLoopRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  
  // Context
  const { driverLocation } = useLocation();
  const { socket, isSocketReady } = useSocket();
  const { onRide, updateRideStatus } = useRideStatus();
  
  // State
  const [rideData, setRideData] = useState(null);
  const [riderDetails, setRiderDetails] = useState(null);
  const [sound, setSound] = useState();
  const [timeLeft, setTimeLeft] = useState(RIDE_REQUEST_TIMEOUT);
  const [loading, setLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showRideModal, setShowRideModal] = useState(false);
  const [region, setRegion] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [mapReady, setMapReady] = useState(false);
  
  // Memoized values
  const timerProgress = useMemo(() => timeLeft / RIDE_REQUEST_TIMEOUT, [timeLeft]);
  
  // Pulse animation for waiting screen
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    return () => pulseAnim.stopAnimation();
  }, []);
  
  // Modal slide animation
  useEffect(() => {
    if (showRideModal) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showRideModal]);
  
  // Show toast message
  const showToast = useCallback((message, type = 'info') => {
    setToast({ visible: true, message, type });
  }, []);
  
  // Hide toast message
  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);
  
  // Route coordinates effect
  useEffect(() => {
    if (rideData?.polyline) {
      try {
        const decodedCoordinates = decode(rideData.polyline).map(([latitude, longitude]) => ({
          latitude,
          longitude
        }));
        setRouteCoordinates(decodedCoordinates);

        if (rideData.pickupLocation?.coordinates && rideData.dropLocation?.coordinates) {
          const { coordinates: pickupCoords } = rideData.pickupLocation;
          const { coordinates: dropCoords } = rideData.dropLocation;

          const midLat = (pickupCoords[1] + dropCoords[1]) / 2;
          const midLng = (pickupCoords[0] + dropCoords[0]) / 2;

          const latDelta = Math.abs(pickupCoords[1] - dropCoords[1]) * 2.5;
          const lngDelta = Math.abs(pickupCoords[0] - dropCoords[0]) * 2.5;

          const newRegion = {
            latitude: midLat,
            longitude: midLng,
            latitudeDelta: Math.max(latDelta, 0.02),
            longitudeDelta: Math.max(lngDelta, 0.02),
          };

          setRegion(newRegion);
          
          if (mapRef.current && mapReady) {
            mapRef.current.animateToRegion(newRegion, 1000);
          }
        }
      } catch (error) {
        console.error("Error decoding polyline:", error);
      }
    }
  }, [rideData, mapReady]);
  
  // Location tracking effect
  useEffect(() => {
    let interval;
    const getLocation = async () => {
      if (!isSocketReady) return;

      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          return;
        }

        interval = setInterval(async () => {
          try {
            const { coords } = await Location.getCurrentPositionAsync({});
            await sendLocationToServer(coords.latitude, coords.longitude);
          } catch (error) {
            console.error("Error fetching location:", error);
          }
        }, 100000);
      } catch (error) {
        console.error("Error setting up location tracking:", error);
      }
    };

    getLocation();
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSocketReady]);
  
  // Send location to server
  const sendLocationToServer = async (latitude, longitude) => {
    try {
      const token = await SecureStore.getItemAsync('auth_token_cab');
      if (!token) return;

      const response = await fetch('https://appapi.olyox.com/webhook/cab-receive-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ latitude, longitude }),
      });
      await response.json();
    } catch (error) {
      console.error('Error sending location:', error);
    }
  };
  
  // Check rider details
  const checkRider = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token_cab');
      if (!token) {
        console.warn("No auth token found");
        return;
      }

      const response = await axios.get(
        'https://appapi.olyox.com/api/v1/rider/user-details',
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const partnerData = response?.data?.partner;
      if (partnerData) {
        setRiderDetails(partnerData);
      }
    } catch (error) {
      console.error("Login Error:", error.response?.data || error.message);
    }
  }, []);
  
  // Initial rider check
  useEffect(() => {
    checkRider();
  }, []);
  
  // Sound effects
  const startSound = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        require('./sound.mp3'),
        {
          shouldPlay: true,
          volume: 1.0
        }
      );

      setSound(sound);
      soundLoopRef.current = sound;
      await sound.playAsync();
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  };
  
  const stopSound = async () => {
    if (soundLoopRef.current) {
      try {
        await soundLoopRef.current.stopAsync();
        await soundLoopRef.current.unloadAsync();
        soundLoopRef.current = null;
        setSound(null);
      } catch (error) {
        console.error("Error stopping sound:", error);
      }
    }
  };
  
  // Socket event handlers
  useEffect(() => {
    const handleRideRequest = async (data) => {
      console.log("🚖 New Ride Request:", data);
      setRideData(data);
      setShowRideModal(true);
      setTimeLeft(RIDE_REQUEST_TIMEOUT);
      await startSound();
      await sendRideNotification(data);
      startTimeout();
    };

    const handleRideCancellation = (data) => {
      console.log("Ride cancelled start:", data);
      
      // Check if the cancellation is for the current ride
      if (rideData && data.ride_request_id === rideData.requestId) {
        cleanupRideRequest(); // clear ride state or cancel trip, etc.
        setShowRideModal(false);
        showToast("This ride has been accepted by another driver", "info");
        console.log("Ride cancelled done");
      } else {
        console.log("Ride cancelled for different ride");
        setShowRideModal(false); // optionally hide modal even if not the same ride
      }
    };

    const handleRejectionConfirmed = (data) => {
      console.log("Rejection confirmed:", data);
      showToast("Ride rejection processed successfully", "success");
    };

    const handleRideError = (data) => {
      console.log("Ride error:", data);
      showToast(data.message || "An error occurred with this ride", "error");

      // If there's an active ride request, clean it up
      if (showRideModal && rideData) {
        cleanupRideRequest();
      }
    };

    if (isSocketReady && socket) {
      socket.on("ride_come", handleRideRequest);
      socket.on("ride_cancelled", handleRideCancellation);
      socket.on("rejection_confirmed", handleRejectionConfirmed);
      socket.on("ride_error", handleRideError);

      // Let the server know we're connected as a driver
      if (riderDetails?.id) {
        socket.emit('driver_connected', { driverId: riderDetails.id });
      }
    }

    const handleAppStateChange = (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        if (socket && !socket.connected) {
          socket.connect();

          // Reconnect as driver
          if (riderDetails?.id) {
            socket.emit('driver_connected', { driverId: riderDetails.id });
          }
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      if (socket) {
        socket.off("ride_come");
        socket.off("ride_accepted_message");
        socket.off("ride_cancelled");
        socket.off("rejection_confirmed");
        socket.off("ride_error");
      }
      subscription.remove();
    };
  }, [isSocketReady, socket, riderDetails, rideData]);
  
  // Emit driver_connected when rider details are loaded
  useEffect(() => {
    if (isSocketReady && socket && riderDetails?.id) {
      socket.emit('driver_connected', { driverId: riderDetails.id });
      console.log("Emitted driver_connected with ID:", riderDetails.id);
    }
  }, [isSocketReady, socket, riderDetails]);
  
  // Start timeout for ride request
  const startTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      handleRejectRide(true); // true indicates timeout rejection
    }, RIDE_REQUEST_TIMEOUT);

    countdownIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1000) {
          clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
  };
  
  // Cleanup ride request
  const cleanupRideRequest = () => {
    // Clear all timers and sounds
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    stopSound();

    // Reset UI state
    setShowRideModal(false);
    setRideData(null);
    setTimeLeft(RIDE_REQUEST_TIMEOUT);
    setLoading(false);
    setConfirmLoading(false);
  };
  
  // Handle reject ride
  const handleRejectRide = async (isTimeout = false) => {
    try {
      if (socket && rideData) {
        console.log("Reject Data ", rideData);
        console.log("Reject riderDetails ", riderDetails);
        
        socket.emit('ride_rejected', {
          ride_id: rideData?.requestId,
          driver_id: riderDetails?._id,
        });

        if (isTimeout) {
          showToast("Ride request timed out", "info");
        }
      }
    } catch (error) {
      console.error('Error rejecting ride:', error);
      showToast("Failed to reject ride", "error");
    } finally {
      cleanupRideRequest();
    }
  };
  
  // Handle accept ride
  const handleAcceptRide = async () => {
    setConfirmLoading(true);
    
    // Simulate loading for 3-5 seconds
    const loadingTime = Math.floor(Math.random() * 2000) + 3000; // 3-5 seconds
    
    setTimeout(async () => {
      try {
        if (socket && rideData) {
          const matchedRider = rideData.riders?.find(
            (rider) => rider.name === riderDetails?.name
          );

          if (matchedRider) {
            socket.emit('ride_accepted', {
              data: {
                rider_id: matchedRider.id,
                ride_request_id: matchedRider.rideRequestId,
                user_id: rideData.user?._id || null,
                rider_name: matchedRider.name,
                vehicleName: matchedRider.vehicleName,
                vehicleNumber: matchedRider.vehicleNumber,
                vehicleType: matchedRider.vehicleType,
                price: matchedRider.price,
                eta: matchedRider.eta,
              }
            });

            showToast("Ride accepted successfully", "success");
            updateRideStatus(true);
          } else {
            updateRideStatus(false);
            throw new Error("Could not match rider details");
          }
        }
      } catch (error) {
        updateRideStatus(false);
        console.error('Error accepting ride:', error);
        showToast("Failed to accept ride. Please try again.", "error");
      } finally {
        cleanupRideRequest();
      }
    }, loadingTime);
  };
  
  // Handle rider confirmation message
  useEffect(() => {
    if (socket) {
      socket.on('rider_confirm_message', (data) => {
        try {
          console.log("Socket event received: rider_confirm_message");
          console.log("Full data payload:", JSON.stringify(data));

          const { rideDetails } = data || {};
          const driver = rideDetails?.driver;

          // Use temp_ride_id first, fallback to on_ride_id
          const temp_ride_id = rideDetails?.temp_ride_id || driver?.on_ride_id;

          console.log("Parsed values =>", { driver });
          console.log("Parsed temp_ride_id =>", { temp_ride_id });
          console.log("Parsed rideDetails =>", { rideDetails });

          if (driver && rideDetails) {
            console.log("rider_confirm_message i am inside");
            updateRideStatus(true);

            navigation.dispatch(
              CommonActions.navigate({
                name: 'start',
                params: {
                  screen: 'ride_details',
                  params: { rideDetails, driver, temp_ride_id },
                },
              })
            );
          } else {
            console.warn("driver or rideDetails missing in rider_confirm_message");
          }
        } catch (err) {
          console.error("Error handling rider_confirm_message:", err);
        }
      });
    }
    
    return () => {
      if (socket) {
        socket.off('rider_confirm_message');
      }
    };
  }, [socket, navigation]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRideRequest();
    };
  }, []);
  
  // Render waiting screen
  if (!rideData && !showRideModal) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.waitingScreenContainer}>
          <View style={styles.waitingHeader}>
            <Text style={styles.waitingTitle}>Looking for rides</Text>
            <Text style={styles.waitingSubtitle}>You'll be notified when a new ride request arrives</Text>
          </View>
          
          <View style={styles.animationContainer}>
            <Animated.View style={{
              transform: [{ scale: pulseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.2]
              })}]
            }}>
              <LottieView
                source={require("./car.json")}
                autoPlay
                loop
                style={styles.waitingAnimation}
              />
            </Animated.View>
            
            <View style={styles.pulseCircle} />
          </View>
          
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.statusText}>Online & Available</Text>
            </View>
            
            {isSocketReady ? (
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.statusText}>Connected to server</Text>
              </View>
            ) : (
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: '#FF3B30' }]} />
                <Text style={styles.statusText}>Connecting to server...</Text>
              </View>
            )}
          </View>
          
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>Tips while waiting</Text>
            <View style={styles.tipItem}>
              <MaterialCommunityIcons name="battery" size={20} color="#4CAF50" />
              <Text style={styles.tipText}>Keep your phone charged</Text>
            </View>
            <View style={styles.tipItem}>
              <MaterialCommunityIcons name="volume-high" size={20} color="#4CAF50" />
              <Text style={styles.tipText}>Make sure your volume is turned up</Text>
            </View>
            <View style={styles.tipItem}>
              <MaterialCommunityIcons name="signal" size={20} color="#4CAF50" />
              <Text style={styles.tipText}>Stay in areas with good network coverage</Text>
            </View>
          </View>
        </View>
        
        <Toast 
          visible={toast.visible} 
          message={toast.message} 
          type={toast.type} 
          onDismiss={hideToast} 
        />
      </SafeAreaView>
    );
  }
  
  // Render ride request modal
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.container}>
        {/* Map View */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={region || {
              latitude: driverLocation?.latitude || 28.7041,
              longitude: driverLocation?.longitude || 77.1025,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
            customMapStyle={mapStyle}
            onMapReady={() => setMapReady(true)}
          >
            {/* Route Polyline */}
            {routeCoordinates.length > 0 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeWidth={4}
                strokeColor="#FF3B30"
                lineDashPattern={[0]}
                lineCap="round"
                lineJoin="round"
              />
            )}
            
            {/* Pickup Marker */}
            {rideData?.pickupLocation?.coordinates && (
              <Marker
                coordinate={{
                  latitude: rideData.pickupLocation.coordinates[1],
                  longitude: rideData.pickupLocation.coordinates[0],
                }}
                title="Pickup"
                description={rideData.pickup_desc}
              >
                <View style={styles.pickupMarker}>
                  <MaterialCommunityIcons name="map-marker" size={30} color="#4CAF50" />
                </View>
              </Marker>
            )}
            
            {/* Dropoff Marker */}
            {rideData?.dropLocation?.coordinates && (
              <Marker
                coordinate={{
                  latitude: rideData.dropLocation.coordinates[1],
                  longitude: rideData.dropLocation.coordinates[0],
                }}
                title="Drop-off"
                description={rideData.drop_desc}
              >
                <View style={styles.dropoffMarker}>
                  <MaterialCommunityIcons name="map-marker" size={30} color="#FF3B30" />
                </View>
              </Marker>
            )}
          </MapView>
        </View>
        
        {/* Ride Request Modal */}
        <Animated.View 
          style={[
            styles.rideRequestModal,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.modalHandle} />
          
          {/* Timer */}
          <View style={styles.timerContainer}>
            <View style={styles.timerCircle}>
              <Text style={styles.timerText}>{Math.ceil(timeLeft / 1000)}s</Text>
            </View>
            <Text style={styles.timerLabel}>Time remaining to respond</Text>
          </View>
          
          {/* User Info */}
          <View style={styles.userInfoContainer}>
            <View style={styles.userAvatarContainer}>
              {rideData?.user?.profileImage?.image ? (
                <Image
                  source={{ uri: rideData.user.profileImage.image }}
                  style={styles.userAvatar}
                />
              ) : (
                <View style={[styles.userAvatar, styles.userAvatarFallback]}>
                  <Text style={styles.userInitials}>
                    {rideData?.user?.name?.charAt(0) || 'U'}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{rideData?.user?.name || 'User'}</Text>
              <View style={styles.ratingContainer}>
                <MaterialCommunityIcons name="star" size={16} color="#F59E0B" />
                <Text style={styles.ratingText}>
                  {rideData?.riders?.[0]?.rating || '4.5'}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Ride Details */}
          <View style={styles.rideDetailsCard}>
            {/* Locations */}
            <View style={styles.locationsContainer}>
              <View style={styles.locationItem}>
                <View style={styles.locationIconContainer}>
                  <View style={styles.locationDot} />
                  <View style={styles.locationLine} />
                </View>
                <View style={styles.locationTextContainer}>
                  <Text style={styles.locationLabel}>PICKUP</Text>
                  <Text style={styles.locationText} numberOfLines={2}>
                    {rideData?.pickup_desc || 'Pickup Location'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.locationItem}>
                <View style={styles.locationIconContainer}>
                  <View style={[styles.locationDot, styles.dropoffDot]} />
                </View>
                <View style={styles.locationTextContainer}>
                  <Text style={styles.locationLabel}>DROP-OFF</Text>
                  <Text style={styles.locationText} numberOfLines={2}>
                    {rideData?.drop_desc || 'Drop-off Location'}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Trip Info */}
            <View style={styles.tripInfoContainer}>
              <View style={styles.tripInfoItem}>
                <MaterialCommunityIcons name="map-marker-distance" size={20} color="#6366F1" />
                <Text style={styles.tripInfoValue}>{rideData?.distance || '0'} km</Text>
                <Text style={styles.tripInfoLabel}>Distance</Text>
              </View>
              
              <View style={styles.tripInfoDivider} />
              
              <View style={styles.tripInfoItem}>
                <MaterialCommunityIcons name="clock-outline" size={20} color="#6366F1" />
                <Text style={styles.tripInfoValue}>{rideData?.trafficDuration || '0'} min</Text>
                <Text style={styles.tripInfoLabel}>Duration</Text>
              </View>
              
              <View style={styles.tripInfoDivider} />
              
              <View style={styles.tripInfoItem}>
                <MaterialCommunityIcons name="currency-inr" size={20} color="#6366F1" />
                <Text style={styles.tripInfoValue}>₹{rideData?.price || '0'}</Text>
                <Text style={styles.tripInfoLabel}>Fare</Text>
              </View>
            </View>
            
            {/* Toll Info */}
            {rideData?.riders?.[0]?.tolls && (
              <View style={styles.tollInfoContainer}>
                <MaterialCommunityIcons name="toll" size={20} color="#6366F1" />
                <Text style={styles.tollInfoText}>
                  Toll charges: ₹{rideData.riders[0].tollPrice || '0'}
                </Text>
              </View>
            )}
            
            {/* Note */}
            <View style={styles.noteContainer}>
              <Text style={styles.noteText}>
                <Text style={styles.noteBold}>Note: </Text>
                Road tax, state tax, and highway tolls are included.
                <Text style={styles.noteHighlight}> (MCD tolls are not included.)</Text>
              </Text>
            </View>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <CustomButton
              title="Decline"
              icon="close-circle"
              type="secondary"
              onPress={() => handleRejectRide()}
              disabled={confirmLoading}
            />
            
            <CustomButton
              title="Accept Ride"
              icon="check-circle"
              type="primary"
              onPress={handleAcceptRide}
              loading={confirmLoading}
              disabled={confirmLoading}
            />
          </View>
        </Animated.View>
        
        {/* Toast */}
        <Toast 
          visible={toast.visible} 
          message={toast.message} 
          type={toast.type} 
          onDismiss={hideToast} 
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    zIndex: 1,
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Waiting Screen Styles
  waitingScreenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
  },
  waitingHeader: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  waitingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  waitingSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  animationContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  waitingAnimation: {
    width: 200,
    height: 200,
  },
  pulseCircle: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: '#4CAF50',
    opacity: 0.3,
  },
  statusContainer: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#4B5563',
  },
  tipsContainer: {
    width: '100%',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#166534',
    marginLeft: 8,
  },
  // Map Styles
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  pickupMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropoffMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Ride Request Modal Styles
  rideRequestModal: {
    position: 'absolute',
  top: height * 0.1,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
    maxHeight: height * 0.85,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF3B30',
  },
  timerLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  userAvatarContainer: {
    marginRight: 16,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  userAvatarFallback: {
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInitials: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6B7280',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginLeft: 4,
  },
  rideDetailsCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  locationsContainer: {
    marginBottom: 16,
  },
  locationItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  locationIconContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  dropoffDot: {
    backgroundColor: '#FF3B30',
  },
  locationLine: {
    width: 2,
    height: 30,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
    marginBottom: 4,
    alignSelf: 'center',
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  tripInfoContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  tripInfoItem: {
    flex: 1,
    alignItems: 'center',
  },
  tripInfoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
    marginBottom: 2,
  },
  tripInfoLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  tripInfoDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
  },
  tollInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  tollInfoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
  },
  noteContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
  },
  noteText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  noteBold: {
    fontWeight: '700',
    color: '#111827',
  },
  noteHighlight: {
    color: '#DC2626',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  buttonIcon: {
    marginRight: 8,
  },
  // Toast Styles
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#4B5563',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  toastSuccess: {
    backgroundColor: '#10B981',
  },
  toastError: {
    backgroundColor: '#EF4444',
  },
  toastInfo: {
    backgroundColor: '#3B82F6',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
});

