import { useRoute, useNavigation } from '@react-navigation/native';
import React, { useEffect, useState, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    Platform,
    Dimensions,
    StatusBar,
    Modal,
    Share,
    Linking,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator } from 'react-native-paper';
import axios from 'axios';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Sharing from 'expo-sharing';
import { useSocket } from '../../context/SocketContext';

const { width, height } = Dimensions.get('window');


export function RideConfirmed() {
    const route = useRoute();
    const navigation = useNavigation();
    const mapRef = useRef(null);
    const { socket, isConnected } = useSocket();

    // Extract params
    const { driver, ride } = route.params || {};

    // State variables
    const [rideStart, setRideStart] = useState(false);
    const [driverData, setDriverData] = useState(driver);
    const [isLoading, setIsLoading] = useState(false);
    const [rideData, setRideData] = useState({});
    const [supportModalVisible, setSupportModalVisible] = useState(false);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [driverLocation, setDriverLocation] = useState(null);
    const [locationPermission, setLocationPermission] = useState(null);
    const [cancelReason, setCancelReason] = useState([])
    const [cancelModel, setCancelModel] = useState(false)
    const [selectedReason, setSelectedReason] = useState(null)
    const [locationUpdateInterval, setLocationUpdateInterval] = useState(null);

    const [rideDetails, setRideDetails] = useState({
        otp: driver?.otp || '1234',
        eta: driver?.eta || '5 mins',
        price: driver?.price || '₹225',
        rating: driver?.rating || '4.8',
        is_done: false,
        pickup: driver?.pickup_desc || 'Pickup Location',
        trips: driver?.trips || '150',
        dropoff: driver?.drop_desc || 'Drop Location',
    });



    const fetchReason = async () => {
        try {
            const { data } = await axios.get(`http://192.168.1.9:3100/api/v1/admin/cancel-reasons?active=active`)

            if (data.data) {
                setCancelReason(data.data)
            } else {
                setCancelReason([])
            }
        } catch (error) {
            console.log("Error Fetching in Reasons", error?.response?.data?.message)
            setCancelReason([])
        }
    }
    useEffect(() => {
        const socketInstance = socket();

        if (socketInstance) {
            const handleRideCancelled = (data) => {
                console.log("Ride Cancelled Message", data);

                Alert.alert(
                    "Ride Cancelled",
                    data.message || "Your ride has been cancelled by the driver.",
                    [{ text: "OK", onPress: () => navigation.navigate("Home") }]
                );
            };

            // Listen for ride cancellation event
            socketInstance.on("ride_cancelled_message", handleRideCancelled);

            // Cleanup function to remove event listener when component unmounts
            return () => {
                socketInstance.off("ride_cancelled_message", handleRideCancelled);
            };
        }
    }, []);


    // Save ride ID in AsyncStorage
    useEffect(() => {
        const storeRideId = async () => {
            try {
                if (ride?._id) {
                    await AsyncStorage.setItem('rideId', ride._id);
                }
            } catch (error) {
                console.error('Error saving ride ID:', error);
            }
        };
        storeRideId();
    }, [ride]);

    useEffect(() => {
        fetchReason()
    }, [])
    // Fetch ride details from database
    const fetchRideDetailsFromDb = async () => {
        try {
            const rideId = ride?._id || await AsyncStorage.getItem('rideId');
            if (!rideId) {
                console.warn('No ride ID available for fetching details');
                return;
            }

            const { data } = await axios.get(`http://192.168.1.9:3100/api/v1/rides/find-ride_details?id=${rideId}`);
            if (data.data) {
                setRideData(data.data);
                setRideDetails(prev => ({
                    ...prev,
                    otp: data.data.RideOtp || prev.otp,
                    eta: data.data.EtaOfRide || prev.eta,
                    price: data.data.kmOfRide || prev.price,
                    rating: data.data.rating || prev.rating,
                    is_done: data?.data?.is_ride_paid || prev?.is_done,
                    pickup: data.data.pickup_desc || prev.pickup,
                    trips: data.data.RatingOfRide || prev.trips,
                    dropoff: data.data.drop_desc || prev.dropoff,
                }));
                setDriverData(data.data.rider);
                setRideStart(data.data.ride_is_started);
            }
        } catch (error) {
            console.error('Error fetching ride details:', error);
        }
    };

    // Handle ending the ride
    const handleEndRide = async () => {
        setIsLoading(true);
        try {
            if (socket()) {
                socket().emit('endRide', { rideDetails, ride: rideData });
            } else {
                Alert.alert('Connection Error', 'Unable to connect to server. Please try again.');
            }
        } catch (error) {
            console.error('Error ending the ride:', error);
            Alert.alert('Error', 'Failed to end ride. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required for live tracking.');
                return;
            }

            // Track location in real-time
            await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 5000, // Update every 5 seconds
                    distanceInterval: 10, // Update every 10 meters
                },
                (location) => {
                    setCurrentLocation(location.coords);

                }
            );
        })();
    }, []);

    // Share current location
    const shareLocation = async () => {
        try {

            if (!currentLocation) {
                Alert.alert('Location not available', 'Please wait while we get your location.');
                return;
            }

            const locationUrl = `https://maps.google.com/?q=${currentLocation.latitude},${currentLocation.longitude}`;
            const message = `I'm currently on my way in a ride. Track my location here: ${locationUrl}`;

            await Share.share({
                message,
                title: 'My Current Location',
            });
        } catch (error) {
            console.error('Error sharing location:', error);
            Alert.alert('Error', 'Failed to share location.');
        }
    };

    // Call emergency services
    const callEmergency = (type) => {
        let phoneNumber = '';

        switch (type) {
            case 'police':
                phoneNumber = '100';
                break;
            case 'ambulance':
                phoneNumber = '108';
                break;
            case 'support':
                phoneNumber = '1800123456'; // Replace with actual support number
                break;
            default:
                phoneNumber = '112'; // General emergency
        }

        Linking.openURL(`tel:${phoneNumber}`);
        setSupportModalVisible(false);
    };

    // Fetch initial data
    useEffect(() => {
        if (!driver) {
            fetchRideDetailsFromDb();
        }
    }, [driver]);


    const handleCancelRide = async () => {
        try {
            if (!selectedReason) {
                Alert.alert("Cancel Ride", "Please select a reason to cancel.");
                return;
            }

            const data = {
                cancelBy: "user",
                rideData,
                reason: selectedReason
            };

            const activeSocket = socket(); // Get the socket instance
            if (!activeSocket) {
                console.error("❌ Socket connection not established");
                Alert.alert("Error", "Unable to cancel ride due to connection issues.");
                return;
            }

            activeSocket.emit("ride-cancel-by-user", data, (response) => {
                console.log("🚗 Ride cancel event sent:", response);

            });
            if (activeSocket) {
                Alert.alert(
                    "Cancel",
                    "Your pickup has been canceled. Thank you for choosing Olyox!",
                    [{ text: "OK", onPress: () => resetToHome() }]
                );
            }
        } catch (error) {
            console.error("⚠️ Error in handleCancelRide:", error);
            Alert.alert("Error", "Something went wrong while canceling the ride.");
        }
    };

    // Helper function to reset navigation
    const resetToHome = () => {
        navigation.reset({
            index: 0,
            routes: [{ name: "Home" }]
        });
    };


    // Listen for socket events
    useEffect(() => {
        fetchRideDetailsFromDb();

        if (socket()) {
            socket().on('ride_user_start', async (data) => {
                console.log('ride_user_start', data);
                setRideStart(true);

                try {
                    await AsyncStorage.setItem('rideStart', JSON.stringify(data));
                } catch (error) {
                    console.error('Error storing ride start details:', error);
                }
            });



            socket().on('give-rate', (data) => {
                console.log('isPay data come');
                navigation.navigate('Rate_Your_ride', { data });
            });

            // Cleanup listeners
            return () => {
                socket().off('ride_user_start');
                socket().off('give-rate');
            };
        }
    }, [socket()]);

    // Navigate to home if ride is done
    useEffect(() => {
        if (rideDetails?.is_done === true) {
            navigation.navigate('Home');
        }
    }, [rideDetails?.is_done]);

    // Update map when locations change
    useEffect(() => {
        if (mapRef.current && currentLocation && driverLocation) {
            mapRef.current.fitToCoordinates(
                [currentLocation, driverLocation],
                {
                    edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                    animated: true,
                }
            );
        }
    }, [currentLocation, driverLocation]);

    // Loading overlay component
    const LoadingOverlay = () => (
        isLoading ? (
            <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#C82333" />
                <Text style={styles.loadingText}>Please wait...</Text>
            </View>
        ) : null
    );

    // OTP card component
    const OtpCard = () => (
        <View style={styles.otpCard}>
            <View style={styles.otpContent}>
                <View>
                    <Text style={styles.rideStatus}>
                        {rideStart ? 'Ride Started' : 'Ride Confirmed'}
                    </Text>
                    <Text style={styles.otpLabel}>Share OTP with driver</Text>
                    <Text style={styles.otpNumber}>{rideDetails.otp}</Text>
                </View>
                <View style={styles.otpIconContainer}>
                    <MaterialCommunityIcons name="shield-check" size={32} color="#C82333" />
                </View>
            </View>
            <Text style={styles.otpHint}>Show this code to your driver</Text>
        </View>
    );

    // Driver card component
    const DriverCard = () => (
        <View style={styles.driverCard}>
            <View style={styles.driverProfile}>
                <View style={styles.driverImageContainer}>
                    <Image
                        source={require('./driver.png')}
                        style={styles.driverImage}
                        defaultSource={require('./driver.png')}
                    />
                    <View style={styles.onlineIndicator} />
                </View>
                <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{driverData?.name || 'Driver Name'}</Text>
                    <View style={styles.ratingContainer}>
                        <MaterialCommunityIcons name="star" size={16} color="#F59E0B" />
                        <Text style={styles.rating}>{driverData?.Ratings || '4.8'}</Text>
                        <Text style={styles.trips}>• {driverData?.TotalRides || '150'} trips</Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.callButton}
                    onPress={() => Linking.openURL(`tel:${driverData?.phone || '9876543210'}`)}
                >
                    <MaterialCommunityIcons name="phone" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.carDetails}>
                <View style={styles.carInfo}>
                    <MaterialCommunityIcons name="car" size={20} color="#6B7280" />
                    <Text style={styles.carText}>
                        {driverData?.rideVehicleInfo?.vehicleName || 'Vehicle'} • {driverData?.rideVehicleInfo?.VehicleNumber || 'XX-XX-XXXX'}
                    </Text>
                </View>
                <View style={styles.etaContainer}>
                    <MaterialCommunityIcons name="clock-outline" size={20} color="#10B981" />
                    <Text style={styles.etaText}>Arriving in {rideDetails.eta}</Text>
                </View>
            </View>
        </View>
    );

    // Location card component
    const LocationCard = () => (
        <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
                <Text style={styles.locationTitle}>Trip Route</Text>
                <TouchableOpacity style={styles.editButton}>
                    <MaterialCommunityIcons name="pencil" size={16} color="#C82333" />
                    <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.locationContent}>
                <View style={styles.locationItem}>
                    <View style={styles.locationDot}>
                        <View style={[styles.dot, styles.greenDot]} />
                        <View style={styles.dotLine} />
                    </View>
                    <View style={styles.locationDetails}>
                        <Text style={styles.locationLabel}>PICKUP</Text>
                        <Text style={styles.locationText}>{rideDetails.pickup}</Text>
                    </View>
                </View>

                <View style={styles.locationItem}>
                    <View style={styles.locationDot}>
                        <View style={[styles.dot, styles.redDot]} />
                    </View>
                    <View style={styles.locationDetails}>
                        <Text style={styles.locationLabel}>DROP-OFF</Text>
                        <Text style={styles.locationText}>{rideDetails.dropoff}</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    // Price card component
    const PriceCard = () => (
        <View style={styles.priceCard}>
            <View style={styles.priceHeader}>
                <Text style={styles.priceTitle}>Trip Fare</Text>
                <TouchableOpacity style={styles.fareDetails}>
                    <Text style={styles.fareDetailsText}>View Details</Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#C82333" />
                </TouchableOpacity>
            </View>
            <View style={styles.priceContent}>
                <View>
                    <Text style={styles.priceLabel}>Estimated Total</Text>
                    <Text style={styles.priceAmount}>{rideDetails.price}</Text>
                </View>
                <View style={styles.paymentMethod}>
                    <MaterialCommunityIcons name="cash" size={20} color="#10B981" />
                    <Text style={styles.paymentText}>Cash Payment</Text>
                </View>
            </View>
        </View>
    );

    // Map component
    const LiveMap = () => (
        <View style={styles.mapContainer}>
            <Text style={styles.mapTitle}>Live Tracking</Text>
            {locationPermission ? (
                currentLocation && driverLocation ? (
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        provider={PROVIDER_GOOGLE}
                        showsUserLocation
                        showsCompass
                        showsMyLocationButton
                        showsTraffic
                        showsBuildings
                        shouldRasterizeIOS

                        initialRegion={{
                            latitude: currentLocation.latitude,
                            longitude: currentLocation.longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        }}
                    >
                        <Marker
                            coordinate={currentLocation}
                            title="Your Location"
                            description="You are here"
                        >
                            <View style={styles.markerContainer}>
                                <MaterialCommunityIcons name="account" size={24} color="#C82333" />
                            </View>
                        </Marker>

                        <Marker
                            coordinate={driverLocation}
                            title="Driver Location"
                            description={`${driverData?.name || 'Driver'} is here`}
                        >
                            <View style={styles.markerContainer}>
                                <MaterialCommunityIcons name="car" size={24} color="#10B981" />
                            </View>
                        </Marker>
                    </MapView>
                ) : (
                    <View style={styles.mapLoading}>
                        <ActivityIndicator size="large" color="#C82333" />
                        <Text style={styles.mapLoadingText}>Loading map...</Text>
                    </View>
                )
            ) : (
                <View style={styles.mapPermissionDenied}>
                    <MaterialCommunityIcons name="map-marker-off" size={48} color="#C82333" />
                    <Text style={styles.mapPermissionText}>Location permission denied</Text>
                    <TouchableOpacity
                        style={styles.mapPermissionButton}
                    // onPress={()=>startLocationTracking()}
                    >
                        <Text style={styles.mapPermissionButtonText}>Enable Location</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    // Support modal component
    const SupportModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={supportModalVisible}
            onRequestClose={() => setSupportModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Emergency Support</Text>
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setSupportModalVisible(false)}
                        >
                            <MaterialCommunityIcons name="close" size={24} color="#111827" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.emergencyOptions}>
                        <TouchableOpacity
                            style={styles.emergencyOption}
                            onPress={() => callEmergency('police')}
                        >
                            <View style={[styles.emergencyIconContainer, { backgroundColor: '#3B82F6' }]}>
                                <MaterialCommunityIcons name="police-badge" size={28} color="#fff" />
                            </View>
                            <Text style={styles.emergencyText}>Call Police</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.emergencyOption}
                            onPress={() => callEmergency('ambulance')}
                        >
                            <View style={[styles.emergencyIconContainer, { backgroundColor: '#EF4444' }]}>
                                <FontAwesome5 name="ambulance" size={28} color="#fff" />
                            </View>
                            <Text style={styles.emergencyText}>Call Ambulance</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.emergencyOption}
                            onPress={() => callEmergency('support')}
                        >
                            <View style={[styles.emergencyIconContainer, { backgroundColor: '#10B981' }]}>
                                <MaterialCommunityIcons name="headphones" size={28} color="#fff" />
                            </View>
                            <Text style={styles.emergencyText}>Call Support</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.emergencyOption}
                            onPress={() => setCancelModel(true)}
                        >
                            <View style={[styles.emergencyIconContainer, { backgroundColor: '#EF4444' }]}>
                                <MaterialCommunityIcons name="close" size={28} color="#fff" />
                            </View>
                            <Text style={styles.emergencyText}>Cancel Ride</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.shareLocationButton}
                        onPress={shareLocation}
                    >
                        <MaterialCommunityIcons name="share-variant" size={20} color="#fff" />
                        <Text style={styles.shareLocationText}>Share My Location</Text>
                    </TouchableOpacity>

                    <View style={styles.rideInfoContainer}>
                        <Text style={styles.rideInfoTitle}>Ride Information</Text>
                        <View style={styles.rideInfoItem}>
                            <Text style={styles.rideInfoLabel}>Driver:</Text>
                            <Text style={styles.rideInfoValue}>{driverData?.name || 'Driver Name'}</Text>
                        </View>
                        <View style={styles.rideInfoItem}>
                            <Text style={styles.rideInfoLabel}>Vehicle:</Text>
                            <Text style={styles.rideInfoValue}>
                                {driverData?.rideVehicleInfo?.vehicleName || 'Vehicle'} • {driverData?.rideVehicleInfo?.VehicleNumber || 'XX-XX-XXXX'}
                            </Text>
                        </View>
                        <View style={styles.rideInfoItem}>
                            <Text style={styles.rideInfoLabel}>Pickup:</Text>
                            <Text style={styles.rideInfoValue}>{rideDetails.pickup}</Text>
                        </View>
                        <View style={styles.rideInfoItem}>
                            <Text style={styles.rideInfoLabel}>Dropoff:</Text>
                            <Text style={styles.rideInfoValue}>{rideDetails.dropoff}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );


    const CancelReasonsModel = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={cancelModel}
            onRequestClose={() => setCancelModel(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Cancel Reason</Text>
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setCancelModel(false)}
                        >
                            <MaterialCommunityIcons name="close" size={24} color="#111827" />
                        </TouchableOpacity>
                    </View>
                    {cancelReason && cancelReason.map((item) => (
                        <TouchableOpacity
                            key={item._id}
                            style={[
                                styles.cancelReasonItem,
                                selectedReason === item._id && styles.selectedReason
                            ]}
                            onPress={() => setSelectedReason(item._id)}
                        >
                            <View>
                                <Text style={styles.cancelReasonLabel}>{item.name}</Text>
                                <Text style={styles.cancelReasonDescription}>{item.description}</Text>
                            </View>
                            <View>
                                {selectedReason === item._id && (
                                    <MaterialCommunityIcons name="check" size={24} color="green" />
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}

                    <TouchableOpacity
                        style={styles.cancelRideButton}
                        onPress={() => handleCancelRide(selectedReason)}
                        disabled={!selectedReason} // Disable button if no reason selected
                    >
                        <MaterialCommunityIcons name="cancel" size={20} color="#fff" />
                        <Text style={styles.cancelRideText}>Cancel Ride</Text>
                    </TouchableOpacity>

                </View>
            </View>
        </Modal>
    )

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Ride Confirmed</Text>
                <View style={styles.headerBadge}>
                    <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
                    <Text style={styles.headerBadgeText}>Confirmed</Text>
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {rideStart ? null : <OtpCard />}
                <DriverCard />
                {/* <LiveMap /> */}
                <LocationCard />
                <PriceCard />

                <TouchableOpacity
                    style={styles.shareButton}
                    onPress={shareLocation}
                >
                    <MaterialCommunityIcons name="share-variant" size={20} color="#fff" />
                    <Text style={styles.shareButtonText}>Share My Location</Text>
                </TouchableOpacity>
            </ScrollView>

            {rideStart ? (
                <View style={styles.footer}>
                    <TouchableOpacity
                        onPress={handleEndRide}
                        style={styles.endRideButton}
                    >
                        <MaterialCommunityIcons name="flag-checkered" size={20} color="#fff" />
                        <Text style={styles.endRideButtonText}>End Ride</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.supportButton}
                        onPress={() => setSupportModalVisible(true)}
                    >
                        <MaterialCommunityIcons name="headphones" size={20} color="#fff" />
                        <Text style={styles.supportButtonText}>Need Support?</Text>
                    </TouchableOpacity>
                </View>
            )}

            <SupportModal />
            <CancelReasonsModel />
            <LoadingOverlay />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    headerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    headerBadgeText: {
        marginLeft: 4,
        color: '#059669',
        fontWeight: '600',
        fontSize: 14,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    otpCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    otpContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rideStatus: {
        fontSize: 16,
        fontWeight: '600',
        color: '#10B981',
        marginBottom: 4,
    },
    otpLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 8,
    },
    otpNumber: {
        fontSize: 32,
        fontWeight: '700',
        color: '#C82333',
        letterSpacing: 8,
    },
    otpIconContainer: {
        width: 48,
        height: 48,
        backgroundColor: '#EEF2FF',
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    otpHint: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 12,
        textAlign: 'center',
    },
    driverCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    driverProfile: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    driverImageContainer: {
        position: 'relative',
    },
    driverImage: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 2,
        borderColor: '#C82333',
    },
    onlineIndicator: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: 14,
        height: 14,
        backgroundColor: '#10B981',
        borderRadius: 7,
        borderWidth: 2,
        borderColor: '#fff',
    },
    driverInfo: {
        flex: 1,
        marginLeft: 12,
    },
    driverName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rating: {
        marginLeft: 4,
        fontSize: 14,
        fontWeight: '500',
        color: '#4B5563',
    },
    trips: {
        fontSize: 14,
        color: '#6B7280',
        marginLeft: 4,
    },
    callButton: {
        width: 48,
        height: 48,
        backgroundColor: '#C82333',
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#C82333',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    carDetails: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 12,
    },
    carInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    carText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#4B5563',
        fontWeight: '500',
    },
    etaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    etaText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#10B981',
        fontWeight: '600',
    },
    mapContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    mapTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 12,
    },
    map: {
        width: '100%',
        height: 400,
        borderRadius: 12,
    },
    mapLoading: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapLoadingText: {
        marginTop: 8,
        color: '#6B7280',
        fontSize: 14,
    },
    mapPermissionDenied: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    mapPermissionText: {
        marginTop: 8,
        color: '#6B7280',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 12,
    },
    mapPermissionButton: {
        backgroundColor: '#C82333',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    mapPermissionButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    markerContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 4,
        borderWidth: 2,
        borderColor: '#fff',
    },
    locationCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    locationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    locationTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    editText: {
        marginLeft: 4,
        color: '#C82333',
        fontWeight: '500',
    },
    locationContent: {
        gap: 16,
    },
    locationItem: {
        flexDirection: 'row',
    },
    locationDot: {
        width: 24,
        alignItems: 'center',
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    greenDot: {
        backgroundColor: '#10B981',
    },
    redDot: {
        backgroundColor: '#EF4444',
    },
    dotLine: {
        width: 2,
        height: 30,
        backgroundColor: '#E5E7EB',
        marginVertical: 4,
        marginLeft: 5,
    },
    locationDetails: {
        flex: 1,
        marginLeft: 12,
    },
    locationLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    locationText: {
        fontSize: 14,
        color: '#111827',
        fontWeight: '500',
    },
    priceCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    priceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    priceTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    fareDetails: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    fareDetailsText: {
        color: '#C82333',
        fontWeight: '500',
    },
    priceContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priceLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 4,
    },
    priceAmount: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
    },
    paymentMethod: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    paymentText: {
        marginLeft: 8,
        color: '#4B5563',
        fontWeight: '500',
    },
    shareButton: {
        backgroundColor: '#4F46E5',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#4F46E5',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    shareButtonText: {
        marginLeft: 8,
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    supportButton: {
        backgroundColor: '#C82333',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#C82333',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    supportButtonText: {
        marginLeft: 8,
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    endRideButton: {
        backgroundColor: '#C82333',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#C82333',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    endRideButtonText: {
        marginLeft: 8,
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    loadingText: {
        color: '#fff',
        marginTop: 12,
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
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
    emergencyOptions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    emergencyOption: {
        alignItems: 'center',
        width: '25%',
    },
    emergencyIconContainer: {
        width: 54,
        height: 54,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    emergencyText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#111827',
        textAlign: 'center',
    },
    shareLocationButton: {
        backgroundColor: '#4F46E5',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#4F46E5',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    shareLocationText: {
        marginLeft: 8,
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    rideInfoContainer: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 16,
    },
    rideInfoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 12,
    },
    rideInfoItem: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    rideInfoLabel: {
        width: 80,
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    rideInfoValue: {
        flex: 1,
        fontSize: 14,
        color: '#111827',
        fontWeight: '400',
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