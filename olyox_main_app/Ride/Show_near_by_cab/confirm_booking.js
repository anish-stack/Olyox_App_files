import { useNavigation, useRoute } from '@react-navigation/native';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Map from '../Map/Map';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useEffect, useState, useRef } from 'react';
import * as Location from 'expo-location';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import { styles } from './Styles';

export function BookingConfirmation() {
    const route = useRoute();
    const [fareDetails, setFareDetails] = useState(null)
    const [status, requestPermission] = Location.useBackgroundPermissions();
    const socket = useSocket();
    const [loading, setLoading] = useState(false);
    const [bookingStep, setBookingStep] = useState(0);
    const [error, setError] = useState(null);
    const [currentLocation, setCurrentLocation] = useState(null);
    const { origin, destination, selectedRide, dropoff, pickup } = route.params || {};

    const navigation = useNavigation();

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

    useEffect(() => {
        (async () => {
            const location = await Location.getCurrentPositionAsync({});
            setCurrentLocation(location.coords);
        })();
    }, []);

    const handleSubmit = async () => {
        if (!origin || !destination) {
            setError('Please select both pickup and drop-off locations');
            return;
        }

        if (!currentLocation) {
            setError('Unable to fetch current location. Please try again.');
            return;
        }

        setError(null);
        setLoading(true);
        setBookingStep(0);

        try {
            const response = await axios.post('http://192.168.1.8:9630/api/v1/rides/create-ride', {
                currentLocation,
                pickupLocation: origin,
                dropLocation: destination,
                pick_desc: pickup?.description,
                drop_desc: dropoff?.description,
                vehicleType: selectedRide?.name,
            });

            const request = response?.data?.rideRequest;

            if (request) {
                setBookingStep(1);
                setTimeout(() => {
                    socket.emit('send_message', {
                        message: 'ride-save-find-riders',
                        data: request,
                    });
                    setBookingStep(2);
                }, 2000);
            }
        } catch (error) {
            console.error('Error:', error.message || error);
            setLoading(false);
            setError('Failed to create ride request');
        }
    };

    const getFareInfo = async () => {
        try {
            const { data } = await axios.post('http://192.168.1.8:9630/api/v1/rider/get-fare-info', {
                origin,
                destination,
                waitingTimeInMinutes: 0,
                ratePerKm: selectedRide?.priceRange
            })
            console.log(data)
            if (data) {
                setFareDetails(data)
            }

        } catch (error) {
            console.log(error)

        }
    }

    useEffect(() => {
        getFareInfo()
    }, [])
    useEffect(() => {
        if (socket) {
            const handleRideConfirm = (data) => {
                console.log('Ride confirmation received:', data);
                setBookingStep(3);

                if (data && data.dataAR) {
                    setTimeout(() => {
                        setLoading(false);
                        navigation.navigate('driver_match', {
                            ride: data.dataAR,
                            origin,
                            destination
                        });
                    }, 1000);
                } else {
                    console.error('Ride data is invalid:', data.dataAR);
                    setLoading(false);
                    setError('Invalid ride data received');
                }
            };

            socket.on('ride_update', handleRideConfirm);

            return () => {
                socket.off('ride_update', handleRideConfirm);
            };
        }
    }, [socket, navigation, origin, destination]);

    const LoaderComponent = () => {
        const pulseAnim = useRef(new Animated.Value(1)).current;

        useEffect(() => {
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
        }, []);

        return (
            <View style={styles.loaderContainer}>
                <Animated.View style={[
                    styles.iconContainer,
                    { transform: [{ scale: pulseAnim }] }
                ]}>
                    <Icon
                        name={bookingSteps[bookingStep].icon}
                        size={40}
                        color="#1976D2"
                    />
                </Animated.View>

                <Text style={styles.loaderTitle}>
                    {bookingSteps[bookingStep].title}
                </Text>

                <Text style={styles.loaderMessage}>
                    {bookingSteps[bookingStep].message}
                </Text>

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
            </View>
        );
    };

    const Header = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.backButton}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Confirm your ride</Text>
            <View style={styles.placeholder} />
        </View>
    );

    const PaymentSection = () => (
        <View style={styles.paymentSection}>
            <View style={styles.paymentHeader}>
                <Text style={styles.paymentTitle}>Payment</Text>
                <TouchableOpacity style={styles.changeButton}>
                    <Text style={styles.changeButtonText}>Change</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.paymentMethod}>
                <Text style={styles.paymentIcon}>💳</Text>
                <Text style={styles.paymentText}>Cash</Text>
            </View>
        </View>
    );

    const RideDetails = () => (
        <View style={styles.rideDetailsCard}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Ride Details</Text>
                <View style={styles.estimatedTime}>
                    <Icon name="clock-outline" size={16} color="#059669" />
                    <Text style={styles.estimatedTimeText}>
                        {fareDetails?.durationInMinutes?.toFixed(0)} min
                    </Text>
                </View>
            </View>

            <View style={styles.rideInfo}>
                <View style={styles.rideInfoItem}>
                    <Icon name="map-marker" size={24} color="#2563EB" />
                    <View style={styles.rideInfoText}>
                        <Text style={styles.rideInfoLabel}>Pickup</Text>
                        <Text style={styles.rideInfoValue}>{pickup?.description}</Text>
                    </View>
                </View>

                <View style={styles.rideInfoItem}>
                    <Icon name="map-marker-radius" size={24} color="#D62C27" />
                    <View style={styles.rideInfoText}>
                        <Text style={styles.rideInfoLabel}>Dropoff</Text>
                        <Text style={styles.rideInfoValue}>{dropoff?.description}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.fareDetails}>
                <Text style={styles.fareTitle}>Fare Breakdown</Text>
                <View style={styles.fareItem}>
                    <Text>Base Fare</Text>
                    <Text>₹{selectedRide?.priceRange}</Text>
                </View>
                <View style={styles.fareItem}>
                    <Text>Distance ({fareDetails?.distanceInKm.toFixed(2)} km)</Text>
                    <Text>₹{fareDetails?.totalPrice.toFixed(0)}</Text>
                </View>
                <View style={[styles.fareItem, styles.fareTotal]}>
                    <Text style={styles.totalText}>Total</Text>
                    <Text style={styles.totalAmount}>₹ {fareDetails?.totalPrice.toFixed(0)}</Text>
                </View>
            </View>
        </View>
    );


    return (
        <SafeAreaView style={styles.container}>
            <Header />
            <ScrollView style={styles.content}>
                <Map origin={origin} destination={destination} />
                {loading ? (
                    <LoaderComponent />
                ) : (
                    <>
                        <RideDetails />
                        {/* <PaymentSection /> */}
                    </>
                )}
            </ScrollView>

            {!loading && (
                <View style={styles.bottomContainer}>
                    <View style={styles.paymentMethod}>
                        <Icon name="cash" size={24} color="#059669" />
                        <Text style={styles.paymentText}>Cash Payment</Text>
                        <TouchableOpacity>
                            <Text style={styles.changeText}>Change</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.confirmButton}
                        onPress={handleSubmit}

                        activeOpacity={0.8}
                    >
                        <Text style={styles.confirmButtonText}>Confirm Ride</Text>
                        <Text style={styles.confirmButtonPrice}>₹ {fareDetails?.totalPrice.toFixed(0)}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {error && (
                <View style={styles.errorContainer}>
                    <Icon name="alert-circle" size={24} color="#DC2626" />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}
        </SafeAreaView>
    );
}
