import { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Animated,
    ActivityIndicator,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import Map from '../Map/Map';
import { styles } from './Confirm.styles';
import { tokenCache } from '../../Auth/cache';
import { useSocket } from '../../context/SocketContext';
import { useLocation } from '../../context/LocationContext';

export function BookingConfirmation() {
    const route = useRoute();
    const navigation = useNavigation();
    const { location } = useLocation();
    const socket = useSocket();

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
    const timerRef = useRef(null);
    const socketTimeoutRef = useRef(null);

    // Booking steps for the loading animation
    const bookingSteps = [
        {
            icon: "car-clock",
            title: "Getting Ready! 🚀",
            message: "Hang tight! We're preparing your perfect ride experience..."
        },
        {
            icon: "map-search",
            title: "Finding Your Driver 🔍",
            message: "Connecting you with our top-rated drivers nearby..."
        },
        {
            icon: "timer-sand",
            title: "Almost There! ⌛",
            message: "Our drivers are quite busy, but we're doing our best to find you the perfect match..."
        },
        {
            icon: "check-circle",
            title: "Great News! 🎉",
            message: "We've found you an amazing driver! Getting everything ready for your journey..."
        }
    ];

    // Check socket connection
    useEffect(() => {
        if (socket) {
            setSocketConnected(socket.connected);

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

            socket.on('connect', handleConnect);
            socket.on('disconnect', handleDisconnect);
            socket.on('connect_error', handleConnectError);

            return () => {
                socket.off('connect', handleConnect);
                socket.off('disconnect', handleDisconnect);
                socket.off('connect_error', handleConnectError);
            };
        }
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
                    'http://192.168.1.3:3000/api/v1/rider/get-fare-info',
                    {
                        origin,
                        destination,
                        waitingTimeInMinutes: 0,
                        ratePerKm: selectedRide?.priceRange
                    },
                    { timeout: 10000 } // 10 second timeout
                );

                if (response.data) {
                    setFareDetails(response.data);
                    setError(null);
                } else {
                    setError('Unable to calculate fare. Please try again.');
                }
            } catch (err) {
                console.error('Error getting fare info:', err);
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
        } else {
            pulseAnim.setValue(1);
        }

        return () => {
            pulseAnim.stopAnimation();
        };
    }, [loading, pulseAnim]);

    // Socket event listener for ride confirmation
    useEffect(() => {
        if (socket) {
            const handleRideConfirm = (data) => {
                try {
                    console.log('Ride confirmation received:', data);

                    // Clear the timeout timer
                    if (socketTimeoutRef.current) {
                        clearTimeout(socketTimeoutRef.current);
                        socketTimeoutRef.current = null;
                    }

                    // Clear the countdown timer
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
                        }, 1000);
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

                // Clear the timeout timer
                if (socketTimeoutRef.current) {
                    clearTimeout(socketTimeoutRef.current);
                    socketTimeoutRef.current = null;
                }

                // Clear the countdown timer
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

                // Clear the timeout timer
                if (socketTimeoutRef.current) {
                    clearTimeout(socketTimeoutRef.current);
                    socketTimeoutRef.current = null;
                }

                // Clear the countdown timer
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }

                setTimeoutActive(false);
            };

            socket.on('ride_accepted_message', handleRideConfirm);
            socket.on('ride_rejected_message', handleRideRejected);
            socket.on('error', handleSocketError);

            return () => {
                socket.off('ride_accepted_message', handleRideConfirm);
                socket.off('ride_rejected_message', handleRideRejected);
                socket.off('error', handleSocketError);
            };
        }
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

            // Check if socket is connected
            if (!socket) {
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
            const token = await tokenCache.getToken('auth_token_db');

            if (!token) {
                setError('Authentication error. Please log in again.');
                setLoading(false);
                setTimeoutActive(false);
                return;
            }

            // Create ride request
            const response = await axios.post(
                'http://192.168.1.3:3000/api/v1/rides/create-ride',
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
                    timeout: 15000 // 15 second timeout
                }
            );

            const request = response?.data?.rideRequest;

            if (request && socket) {
                setBookingStep(1);
                console.log("i am in  request & socket 🟢", socket)

                // Start the 2-minute countdown timer
                timerRef.current = setInterval(() => {
                    setTimeRemaining(prev => {
                        if (prev <= 1) {
                            clearInterval(timerRef.current);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);

                // Set a timeout for 2 minutes
                socketTimeoutRef.current = setTimeout(() => {
                    console.log("i am in  socketTimeoutRef 🟢")

                    if (loading) {
                        setLoading(false);
                        setError('No drivers found nearby. Please try again later.');
                        setTimeoutActive(false);

                        if (timerRef.current) {
                            clearInterval(timerRef.current);
                            timerRef.current = null;
                        }
                    }
                }, 120000); // 2 minutes

                // Emit socket event to find drivers
                setTimeout(() => {
                    console.log("i am emit 🟢")
                    if (socket) {

                        const data = socket.emit('send_message', {
                            message: 'ride-save-find-riders',
                            data: request,
                        });
                        setBookingStep(2);
                        console.log("i am emit data 🟢", data)
                    } else {
                        console.log("i am emit socket null 🟢")
                    }
                }, 2000);
                console.log("i am emit 2 🟢")
            } else {
                throw new Error('Invalid response from server');
            }
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
                onPress={() => navigation.goBack()}
            >
                <Icon name="arrow-left" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Confirm your ride</Text>
            <View style={styles.placeholder} />
        </View>
    );

    // Component for the loading animation
    const LoaderComponent = () => (
        <View style={styles.loaderContainer}>
            <Animated.View style={[
                styles.iconContainer,
                { transform: [{ scale: pulseAnim }] }
            ]}>
                <Icon
                    name={bookingSteps[bookingStep].icon}
                    size={50}
                    color="#1976D2"
                />
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
                }}
            >
                <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
        </View>
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
                    <Icon name="map-marker" size={24} color="#2563EB" />
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
                    {/* <View style={styles.fareItem}>
            <Text style={styles.fareItemText}>Base Fare</Text>
            <Text style={styles.fareItemValue}>₹{selectedRide?.priceRange || '0'}</Text>
          </View> */}
                    <View style={styles.fareItem}>
                        <Text style={styles.fareItemText}>
                            Distance ({fareDetails?.distanceInKm?.toFixed(2) || '0'} km)
                        </Text>
                        <Text style={styles.fareItemValue}>
                            ₹{fareDetails?.totalPrice?.toFixed(0) || '0'}
                        </Text>
                    </View>
                    <View style={[styles.fareItem, styles.fareTotal]}>
                        <Text style={styles.totalText}>Total</Text>
                        <Text style={styles.totalAmount}>
                            ₹{fareDetails?.totalPrice?.toFixed(0) || '0'}
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
                    <ActivityIndicator size="large" color="#00aaa9" />
                    <Text style={styles.initialLoadingText}>Loading ride details...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Header />

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
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