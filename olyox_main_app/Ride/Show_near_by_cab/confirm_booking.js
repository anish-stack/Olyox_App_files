import { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Animated,
    ActivityIndicator,
    Alert,
    StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';

import Map from '../Map/Map';
import { tokenCache } from '../../Auth/cache';
import { useSocket } from '../../context/SocketContext';
import { useLocation } from '../../context/LocationContext';

export default function BookingConfirmation() {
    const route = useRoute();
    const navigation = useNavigation();
    const { location } = useLocation();
    const { isConnected, socket, userId } = useSocket();

    // State variables
    const [fareDetails, setFareDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(false);
    const [bookingStep, setBookingStep] = useState(0);
    const [error, setError] = useState(null);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [timeoutActive, setTimeoutActive] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes in seconds
    const [socketConnected, setSocketConnected] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('Cash');

    // Extract route params
    const { origin, destination, selectedRide, dropoff, pickup } = route.params || {};

    // Animation refs
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const timerRef = useRef(null);
    const socketTimeoutRef = useRef(null);
    const lottieRef = useRef(null);

    // Booking steps for the loading animation with enhanced messaging
    const bookingSteps = [
        {
            icon: "car-clock",
            title: "Getting Ready! 🚀",
            message: "Hang tight! We're preparing your perfect ride experience...",
            lottie: "https://assets5.lottiefiles.com/packages/lf20_jjmptxzk.json"
        },
        {
            icon: "map-search",
            title: "Finding Your Driver 🔍",
            message: "Connecting you with our top-rated drivers nearby...",
            lottie: "https://assets9.lottiefiles.com/packages/lf20_vxvx0hzv.json"
        },
        {
            icon: "timer-sand",
            title: "Almost There! ⌛",
            message: "Our drivers are quite busy, but we're doing our best to find you the perfect match...",
            lottie: "https://assets10.lottiefiles.com/packages/lf20_bkmfgzpj.json"
        },
        {
            icon: "check-circle",
            title: "Great News! 🎉",
            message: "We've found you an amazing driver! Getting everything ready for your journey...",
            lottie: "https://assets3.lottiefiles.com/packages/lf20_touohxv0.json"
        }
    ];

    // Check socket connection
    useEffect(() => {
        if (!socket) {
            console.error("Socket function is not available");
            setSocketConnected(false);
            setError("Socket connection not available");
            return;
        }

        let socketInstance;
        try {
            socketInstance = socket();
        } catch (err) {
            console.error("Error getting socket instance:", err);
            setSocketConnected(false);
            setError("Failed to establish socket connection");
            return;
        }

        if (!socketInstance) {
            console.error("No socket instance returned from socket()");
            setSocketConnected(false);
            setError("Socket connection unavailable");
            return;
        }

        setSocketConnected(socketInstance.connected);

        const handleConnect = () => {
            setSocketConnected(true);
            setError(null);
        };

        const handleDisconnect = () => {
            setSocketConnected(false);
            if (loading) {
                setError('Connection lost. Please try again.');
            }
        };

        const handleConnectError = (err) => {
            setSocketConnected(false);
            setError('Unable to connect to server. Please check your internet connection.');
            console.error('Socket connection error:', err);
        };

        socketInstance.on('connect', handleConnect);
        socketInstance.on('disconnect', handleDisconnect);
        socketInstance.on('connect_error', handleConnectError);

        return () => {
            try {
                if (socketInstance) {
                    socketInstance.off('connect', handleConnect);
                    socketInstance.off('disconnect', handleDisconnect);
                    socketInstance.off('connect_error', handleConnectError);
                }
            } catch (err) {
                console.error("Error during socket cleanup:", err);
            }
        };
    }, [socket, loading]);

    // Get current location
    useEffect(() => {
        const fetchLocation = async () => {
            try {
                setInitialLoading(true);

                if (location) {
                    setCurrentLocation(location.coords);
                } else {
                    const { status } = await Location.requestForegroundPermissionsAsync();

                    if (status !== 'granted') {
                        setError('Location permission is required to book a ride');
                        return;
                    }

                    const currentPosition = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.High
                    });

                    setCurrentLocation(currentPosition.coords);
                }
            } catch (err) {
                console.error('Error getting location:', err);
                setError('Unable to get your current location. Please try again.');
            } finally {
                setInitialLoading(false);
            }
        };

        fetchLocation();
    }, [location]);

    // Get fare information
    useEffect(() => {
        const getFareInfo = async () => {
            try {
                setInitialLoading(true);

                if (!origin || !destination || !selectedRide) {
                    setError('Missing ride information. Please try again.');
                    return;
                }

                const response = await axios.post(
                    'http://192.168.1.12:3100/api/v1/rider/get-fare-info',
                    {
                        origin,
                        destination,
                        waitingTimeInMinutes: 0,
                        ratePerKm: selectedRide?.priceRange
                    },
                    { timeout: 10000 }
                );

                if (response.data) {
                    setFareDetails(response.data);
                    setError(null);
                } else {
                    setError('Unable to calculate fare. Please try again.');
                }
            } catch (err) {
                console.error('Error getting fare info:', err.response?.data?.message || err.message);
                setError('Unable to calculate fare. Please check your internet connection and try again.');
            } finally {
                setInitialLoading(false);
            }
        };

        if (origin && destination && selectedRide) {
            getFareInfo();
        }
    }, [origin, destination, selectedRide]);

    // Pulse animation for loading state
    useEffect(() => {
        if (loading) {
            // Start pulse animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Start fade animation
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }).start();

            // Play Lottie animation
            if (lottieRef.current) {
                lottieRef.current.play();
            }
        } else {
            pulseAnim.setValue(1);
            fadeAnim.setValue(0);
        }

        return () => {
            pulseAnim.stopAnimation();
            fadeAnim.stopAnimation();
        };
    }, [loading, pulseAnim, fadeAnim, bookingStep]);




    useEffect(() => {
        if (!socket) {
            console.error("Socket function is not available");
            setLoading(false);
            setError("Socket connection not available");
            return;
        }

        let socketInstance;
        try {
            socketInstance = socket();
        } catch (err) {
            console.error("Error getting socket instance:", err);
            setLoading(false);
            setError("Failed to establish socket connection");
            return;
        }

        if (!socketInstance) {
            console.error("No socket instance returned from socket()");
            setLoading(false);
            setError("Socket connection unavailable");
            return;
        }

        const handleRideConfirm = (data) => {
            try {
                console.log('Ride confirmation received:', data);

                if (socketTimeoutRef.current) {
                    clearTimeout(socketTimeoutRef.current);
                    socketTimeoutRef.current = null;
                }

                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }

                setTimeoutActive(false);
                setBookingStep(3);

                if (data && data.rideDetails) {
                    setTimeout(() => {
                        setLoading(false);
                        navigation.navigate('driver_match', {
                            ride: data.rideDetails,
                            origin,
                            destination
                        });
                    }, 1500); // Slightly longer to show success animation
                } else {
                    console.error('Invalid ride data received:', data);
                    setLoading(false);
                    setError('Invalid ride data received. Please try again.');
                }
            } catch (err) {
                console.error('Error processing ride confirmation:', err);
                setLoading(false);
                setError('Error processing driver match. Please try again.');
            }
        };

        const handleRideRejected = (data) => {
            console.log('Ride rejected:', data);
            setLoading(false);
            setError('No drivers available at the moment. Please try again later.');

            if (socketTimeoutRef.current) {
                clearTimeout(socketTimeoutRef.current);
                socketTimeoutRef.current = null;
            }

            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            setTimeoutActive(false);
        };

        const handleNoDrivers = (data) => {
            console.log('No drivers available:', data);
            setLoading(false);
            setError('No drivers found in your area. Please try again later.');

            if (socketTimeoutRef.current) {
                clearTimeout(socketTimeoutRef.current);
                socketTimeoutRef.current = null;
            }

            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            setTimeoutActive(false);
        };

        const handleSocketError = (err) => {
            console.error('Socket error:', err);
            setLoading(false);
            setError('Connection error. Please try again.');

            if (socketTimeoutRef.current) {
                clearTimeout(socketTimeoutRef.current);
                socketTimeoutRef.current = null;
            }

            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            setTimeoutActive(false);
        };

        try {
            socketInstance.on('ride_accepted_message', handleRideConfirm);
            socketInstance.on('ride_rejected_message', handleRideRejected);
            socketInstance.on('sorry_no_rider_available', handleNoDrivers);
            socketInstance.on('error', handleSocketError);
        } catch (err) {
            console.error("Error attaching socket event listeners:", err);
            setLoading(false);
            setError("Failed to establish event handlers");
            return;
        }

        return () => {
            try {
                if (socketInstance) {
                    socketInstance.off('ride_accepted_message', handleRideConfirm);
                    socketInstance.off('ride_rejected_message', handleRideRejected);
                    socketInstance.off('no_drivers_available', handleNoDrivers);
                    socketInstance.off('error', handleSocketError);
                }
            } catch (err) {
                console.error("Error during event listener cleanup:", err);
            }

            if (socketTimeoutRef.current) {
                clearTimeout(socketTimeoutRef.current);
                socketTimeoutRef.current = null;
            }

            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [socket, navigation, origin, destination]);

    // Handle booking submission
    const handleSubmit = async () => {
        try {
            // Reset states
            setError(null);
            setLoading(true);
            setBookingStep(0);
            setTimeoutActive(true);
            setTimeRemaining(120);

            // Check if socket function exists
            if (!socket) {
                setError('Socket connection not available. Please restart the app.');
                setLoading(false);
                setTimeoutActive(false);
                return;
            }

            // Safely get socket instance
            let socketInstance;
            try {
                socketInstance = socket();
            } catch (err) {
                console.error("Error getting socket instance:", err);
                setError('Failed to establish socket connection. Please try again.');
                setLoading(false);
                setTimeoutActive(false);
                return;
            }

            // Check if socketInstance exists and is connected
            if (!socketInstance || !socketInstance.connected) {
                setError('Not connected to server. Please check your internet connection and try again.');
                setLoading(false);
                setTimeoutActive(false);
                return;
            }

            // Check if we have all required data
            if (!currentLocation || !origin || !destination || !selectedRide) {
                setError('Missing ride information. Please try again.');
                setLoading(false);
                setTimeoutActive(false);
                return;
            }

            // Get auth token
            let token;
            try {
                token = await tokenCache.getToken('auth_token_db');
            } catch (err) {
                console.error("Error retrieving auth token:", err);
                setError('Authentication error. Please log in again.');
                setLoading(false);
                setTimeoutActive(false);
                return;
            }

            if (!token) {
                setError('Authentication error. Please log in again.');
                setLoading(false);
                setTimeoutActive(false);
                return;
            }

            // Create ride request
            const response = await axios.post(
                'http://192.168.1.12:3100/api/v1/rides/create-ride',
                {
                    currentLocation,
                    pickupLocation: origin,
                    dropLocation: destination,
                    pick_desc: pickup?.description,
                    drop_desc: dropoff?.description,
                    vehicleType: selectedRide?.name,
                    paymentMethod: paymentMethod
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    timeout: 15000
                }
            );

            const request = response?.data?.rideRequest;

            // Validate request data and socket again before proceeding
            if (!request) {
                throw new Error('Invalid response from server');
            }

            // Double-check socket is still available
            try {
                socketInstance = socket();
                if (!socketInstance || !socketInstance.connected) {
                    throw new Error('Socket disconnected during request');
                }
            } catch (err) {
                console.error("Socket error after API call:", err);
                setError('Connection lost. Please try again.');
                setLoading(false);
                setTimeoutActive(false);
                return;
            }

            // We have valid request and socket connection
            setBookingStep(1);

            // Start the 2-minute countdown timer
            timerRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            // Set a timeout for 2 minutes
            socketTimeoutRef.current = setTimeout(() => {
                console.log("Request timeout reached");
                setError('No drivers found nearby. Please try again later.');
                if (loading) {
                    setLoading(false);
                    
                    setTimeoutActive(false);

                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                    }
                }
            }, 120000);

            // Simulate step progression for better UX
            setTimeout(() => {
                if (loading) setBookingStep(1);
            }, 3000);

            setTimeout(() => {
                console.log("Preparing to emit socket event");

                try {
                    const currentSocket = socket();

                    if (!currentSocket) {
                        throw new Error('Socket not available');
                    }

                    if (!currentSocket.connected) {
                        throw new Error('Socket disconnected');
                    }

                    currentSocket.emit('send_message', {
                        message: 'ride-save-find-riders',
                        data: request,
                    });

                    // Move to next step after emitting event
                    setTimeout(() => {
                        if (loading) setBookingStep(2);
                    }, 3000);
                    
                } catch (err) {
                    console.error("Error emitting socket event:", err);
                    setLoading(false);
                    setError('Connection error. Please try again.');
                    setTimeoutActive(false);

                    // Clear timers
                    if (socketTimeoutRef.current) {
                        clearTimeout(socketTimeoutRef.current);
                        socketTimeoutRef.current = null;
                    }

                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                    }
                }
            }, 2000);

        } catch (err) {
            console.error('Error creating ride:', err);

            let errorMessage = 'Failed to create ride request. Please try again.';

            if (err.response) {
                // Server responded with an error
                if (err.response.status === 401) {
                    errorMessage = 'Your session has expired. Please log in again.';
                } else if (err.response.data && err.response.data.message) {
                    errorMessage = err.response.data.message;
                }
            } else if (err.request) {
                // Request was made but no response
                errorMessage = 'Server not responding. Please check your internet connection.';
            }

            setError(errorMessage);
            setLoading(false);
            setTimeoutActive(false);

            // Clear timers
            if (socketTimeoutRef.current) {
                clearTimeout(socketTimeoutRef.current);
                socketTimeoutRef.current = null;
            }

            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    // Change payment method
    const handleChangePayment = () => {
        Alert.alert(
            "Select Payment Method",
            "Choose your preferred payment method",
            [
                {
                    text: "Cash",
                    onPress: () => setPaymentMethod("Cash")
                },
                {
                    text: "Card",
                    onPress: () => setPaymentMethod("Card")
                },
                {
                    text: "Cancel",
                    style: "cancel"
                }
            ]
        );
    };

    // Format time remaining
    const formatTimeRemaining = () => {
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    // Component for the header
    const Header = () => (
        <View style={styles.header}>
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                    // Show confirmation if booking is in progress
                    if (loading) {
                        Alert.alert(
                            "Cancel Booking?",
                            "Are you sure you want to cancel your booking request?",
                            [
                                {
                                    text: "No",
                                    style: "cancel"
                                },
                                {
                                    text: "Yes, Cancel",
                                    style: "destructive",
                                    onPress: () => {
                                        setLoading(false);
                                        setTimeoutActive(false);
                                        
                                        // Clear timers
                                        if (socketTimeoutRef.current) {
                                            clearTimeout(socketTimeoutRef.current);
                                            socketTimeoutRef.current = null;
                                        }
                                        
                                        if (timerRef.current) {
                                            clearInterval(timerRef.current);
                                            timerRef.current = null;
                                        }
                                        
                                        navigation.goBack();
                                    }
                                }
                            ]
                        );
                    } else {
                        navigation.goBack();
                    }
                }}
            >
                <Icon name="arrow-left" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Confirm Your Ride</Text>
            <View style={styles.placeholder} />
        </View>
    );

    // Component for the loading animation
    const LoaderComponent = () => (
        <Animated.View 
            style={[
                styles.loaderContainer,
                { opacity: fadeAnim }
            ]}
        >
            <Animated.View style={[
                styles.iconContainer,
                { transform: [{ scale: pulseAnim }] }
            ]}>
                {/* Use Lottie animation if available, fallback to icon */}
                {bookingSteps[bookingStep].lottie ? (
                    <LottieView
                        ref={lottieRef}
                        source={{ uri: bookingSteps[bookingStep].lottie }}
                        style={styles.lottieAnimation}
                        autoPlay
                        loop
                    />
                ) : (
                    <Icon
                        name={bookingSteps[bookingStep].icon}
                        size={50}
                        color="#1976D2"
                    />
                )}
            </Animated.View>

            <Text style={styles.loaderTitle}>
                {bookingSteps[bookingStep].title}
            </Text>

            <Text style={styles.loaderMessage}>
                {bookingSteps[bookingStep].message}
            </Text>

            {timeoutActive && (
                <View style={styles.timerContainer}>
                    <Icon name="timer-outline" size={20} color="#666" />
                    <Text style={styles.timerText}>
                        Finding driver: {formatTimeRemaining()}
                    </Text>
                </View>
            )}

            <View style={styles.stepIndicatorContainer}>
                {bookingSteps.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.stepDot,
                            index === bookingStep && styles.stepDotActive
                        ]}
                    />
                ))}
            </View>

            <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                    Alert.alert(
                        "Cancel Booking?",
                        "Are you sure you want to cancel your booking request?",
                        [
                            {
                                text: "No",
                                style: "cancel"
                            },
                            {
                                text: "Yes, Cancel",
                                style: "destructive",
                                onPress: () => {
                                    setLoading(false);
                                    setTimeoutActive(false);
                                    
                                    // Clear timers
                                    if (socketTimeoutRef.current) {
                                        clearTimeout(socketTimeoutRef.current);
                                        socketTimeoutRef.current = null;
                                    }
                                    
                                    if (timerRef.current) {
                                        clearInterval(timerRef.current);
                                        timerRef.current = null;
                                    }
                                }
                            }
                        ]
                    );
                }}
            >
                <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
        </Animated.View>
    );

    // Component for ride details
    const RideDetails = () => (
        <View style={styles.rideDetailsCard}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Ride Details</Text>
                {fareDetails && (
                    <View style={styles.estimatedTime}>
                        <Icon name="clock-outline" size={16} color="#059669" />
                        <Text style={styles.estimatedTimeText}>
                            {fareDetails?.durationInMinutes?.toFixed(0) || '0'} min
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.rideInfo}>
                <View style={styles.rideInfoItem}>
                    <Icon name="map-marker" size={24} color="#E3838D" />
                    <View style={styles.rideInfoText}>
                        <Text style={styles.rideInfoLabel}>Pickup</Text>
                        <Text style={styles.rideInfoValue} numberOfLines={2}>
                            {pickup?.description || "Current Location"}
                        </Text>
                    </View>
                </View>

                <View style={styles.locationConnector}>
                    <View style={styles.locationDot} />
                    <View style={styles.locationLine} />
                    <View style={styles.locationDot} />
                </View>

                <View style={styles.rideInfoItem}>
                    <Icon name="map-marker-radius" size={24} color="#D62C27" />
                    <View style={styles.rideInfoText}>
                        <Text style={styles.rideInfoLabel}>Dropoff</Text>
                        <Text style={styles.rideInfoValue} numberOfLines={2}>
                            {dropoff?.description || "Destination"}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.divider} />

            {fareDetails ? (
                <View style={styles.fareDetails}>
                    <Text style={styles.fareTitle}>Fare Breakdown</Text>

                    {/* Extra Charge Due to Rain */}
                    {fareDetails?.rain && (
                        <View style={styles.fareItem}>
                            <Text style={styles.fareItemText}>Extra Charge Due To Rain</Text>
                            <Text style={styles.fareItemValue}>₹{fareDetails.rain || 5}</Text>
                        </View>
                    )}

                    {/* Price for Distance */}
                    <View style={styles.fareItem}>
                        <Text style={styles.fareItemText}>
                            Price for Distance ({fareDetails?.distanceInKm?.toFixed(2) || '0'} km)
                        </Text>
                        <Text style={styles.fareItemValue}>
                            ₹{fareDetails?.totalPrice?.toFixed(0) || '0'}
                        </Text>
                    </View>

                    {/* Total Price */}
                    <View style={[styles.fareItem, styles.fareTotal]}>
                        <Text style={styles.totalText}>Total</Text>
                        <Text style={styles.totalAmount}>
                            ₹{fareDetails?.totalPrice?.toFixed(0) || '0'}
                        </Text>
                    </View>

                    {/* Fare Note */}
                    <View style={styles.fareNote}>
                        <Text style={styles.fareNoteText}>
                            <Text style={styles.noteHighlight}>Note: </Text>
                            Road tax, state tax, and highway tolls are included.
                            <Text style={styles.noteHighlight}> (MCD tolls are not included.)</Text>
                        </Text>
                    </View>
                </View>
            ) : (
                <View style={styles.loadingFare}>
                    <ActivityIndicator size="small" color="#00aaa9" />
                    <Text style={styles.loadingFareText}>Calculating fare...</Text>
                </View>
            )}
        </View>
    );

    // Initial loading state
    if (initialLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <Header />
                <View style={styles.initialLoadingContainer}>
                    <LottieView
                        source={{ uri: 'https://assets9.lottiefiles.com/packages/lf20_p8bfn5to.json' }}
                        style={styles.initialLoadingAnimation}
                        autoPlay
                        loop
                    />
                    <Text style={styles.initialLoadingText}>Loading ride details...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Header />
            
            {!socketConnected && (
                <View style={styles.connectionStatus}>
                    <Icon name="wifi-off" size={16} color="#721C24" />
                    <Text style={styles.connectionStatusText}>
                        You're offline. Please check your connection.
                    </Text>
                </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} style={styles.content} contentContainerStyle={styles.contentContainer}>
                <View style={styles.mapContainer}>
                    <Map origin={origin} destination={destination} />
                </View>

                {loading ? (
                    <LoaderComponent />
                ) : (
                    <RideDetails />
                )}
            </ScrollView>

            {!loading && (
                <View style={styles.bottomContainer}>
                    <View style={styles.paymentMethod}>
                        <Icon
                            name={paymentMethod === 'Cash' ? "cash" : "credit-card"}
                            size={24}
                            color="#059669"
                        />
                        <Text style={styles.paymentText}>{paymentMethod} Payment</Text>
                        <TouchableOpacity onPress={handleChangePayment}>
                            <Text style={styles.changeText}>Change</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.confirmButton,
                            (!fareDetails || error) && styles.confirmButtonDisabled
                        ]}
                        onPress={handleSubmit}
                        disabled={!fareDetails || !!error}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.confirmButtonText}>Confirm Ride</Text>
                        {fareDetails && (
                            <Text style={styles.confirmButtonPrice}>
                                ₹{fareDetails?.totalPrice?.toFixed(0) || '0'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {error && (
                <View style={styles.errorContainer}>
                    <Icon name="alert-circle" size={24} color="#DC2626" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.dismissButton}
                        onPress={() => setError(null)}
                    >
                        <Icon name="close" size={20} color="#666" />
                    </TouchableOpacity>
                </View>
            )}

            {!socketConnected && !initialLoading && (
                <View style={styles.connectionWarning}>
                    <Icon name="wifi-off" size={20} color="#fff" />
                    <Text style={styles.connectionWarningText}>
                        Not connected to server. Reconnecting...
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
}

// Enhanced styles with better visual hierarchy and animations
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        backgroundColor: '#fff'
    },
    backButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#f3f4f6'
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827'
    },
    placeholder: {
        width: 40
    },
    connectionStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8d7da',
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginHorizontal: 16,
        marginTop: 8,
        borderRadius: 8
    },
    connectionStatusText: {
        fontSize: 12,
        color: '#721c24',
        marginLeft: 8,
        fontWeight: '500'
    },
    content: {
        flex: 1
    },
    contentContainer: {
        paddingBottom: 24
    },
    mapContainer: {
        height: 300,
        margin: 16,
        borderRadius: 12,
        overflow: 'hidden',
       
    },
    initialLoadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    initialLoadingAnimation: {
        width: 150,
        height: 150
    },
    initialLoadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#4b5563',
        textAlign: 'center'
    },
    loaderContainer: {
        margin: 16,
        padding: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#e0f2fe',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16
    },
    lottieAnimation: {
        width: 120,
        height: 120
    },
    loaderTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e40af',
        marginBottom: 8,
        textAlign: 'center'
    },
    loaderMessage: {
        fontSize: 14,
        color: '#4b5563',
        textAlign: 'center',
        marginBottom: 16,
        paddingHorizontal: 16
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 16
    },
    timerText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#4b5563',
        fontWeight: '500'
    },
    stepIndicatorContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 24
    },
    stepDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#d1d5db',
        marginHorizontal: 4
    },
    stepDotActive: {
        backgroundColor: '#E3838D',
        width: 24
    },
    cancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        backgroundColor: '#fee2e2'
    },
    cancelButtonText: {
        color: '#dc2626',
        fontWeight: '600',
        fontSize: 14
    },
    rideDetailsCard: {
        margin: 16,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827'
    },
    estimatedTime: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 16
    },
    estimatedTimeText: {
        marginLeft: 4,
        fontSize: 12,
        color: '#059669',
        fontWeight: '600'
    },
    rideInfo: {
        marginBottom: 16
    },
    rideInfoItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8
    },
    rideInfoText: {
        marginLeft: 12,
        flex: 1
    },
    rideInfoLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 2
    },
    rideInfoValue: {
        fontSize: 14,
        color: '#111827',
        fontWeight: '500'
    },
    locationConnector: {
        marginLeft: 12,
        paddingLeft: 12,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center'
    },
    locationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#9ca3af'
    },
    locationLine: {
        width: 2,
        height: 20,
        backgroundColor: '#9ca3af'
    },
    divider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginBottom: 16
    },
    fareDetails: {
        paddingTop: 8
    },
    fareTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 12
    },
    fareItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    fareItemText: {
        fontSize: 14,
        color: '#4b5563'
    },
    fareItemValue: {
        fontSize: 14,
        color: '#111827',
        fontWeight: '500'
    },
    fareTotal: {
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb'
    },
    totalText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827'
    },
    totalAmount: {
        fontSize: 18,
        fontWeight: '700',
        color: '#E3838D'
    },
    fareNote: {
        marginTop: 12,
        padding: 12,
        backgroundColor: '#f3f4f6',
        borderRadius: 8
    },
    fareNoteText: {
        fontSize: 12,
        color: '#4b5563',
        lineHeight: 18
    },
    noteHighlight: {
        fontWeight: '600',
        color: '#111827'
    },
    loadingFare: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
    },
    loadingFareText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#4b5563'
    },
    bottomContainer: {
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb'
    },
    paymentMethod: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16
    },
    paymentText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#111827',
        fontWeight: '500',
        flex: 1
    },
    changeText: {
        fontSize: 14,
        color: '#E3838D',
        fontWeight: '600'
    },
    confirmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#E3838D',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12
    },
    confirmButtonDisabled: {
        backgroundColor: '#93c5fd',
        opacity: 0.8
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff'
    },
    confirmButtonPrice: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff'
    },
    errorContainer: {
        position: 'absolute',
        bottom: 90,
        left: 16,
        right: 16,
        backgroundColor: '#fee2e2',
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    errorText: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: '#b91c1c'
    },
    dismissButton: {
        padding: 4
    },
    connectionWarning: {
        position: 'absolute',
        top: 60,
        left: 16,
        right: 16,
        backgroundColor: '#ef4444',
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    connectionWarningText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#fff',
        fontWeight: '500'
    }
});