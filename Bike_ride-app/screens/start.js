import React, { useEffect, useState, useRef } from "react";
import {
    View,
    StyleSheet,
    ScrollView,
    Modal,
    TextInput,
    TouchableOpacity,
    Dimensions,
    Linking,
    Platform,
    Alert,
    Image,
    Animated
} from "react-native";
import { Text, Button, Divider, ActivityIndicator } from "react-native-paper";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from 'react-native-safe-area-context';

import * as Location from 'expo-location';
import * as IntentLauncher from 'expo-intent-launcher';
import {
    FontAwesome5,
    MaterialIcons,
    MaterialCommunityIcons,
    Ionicons
} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSocket } from "../context/SocketContext"
const GOOGLE_MAPS_APIKEY = "AIzaSyC6lYO3fncTxdGNn9toDof96dqBDfYzr34";
const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

export default function RideDetailsScreen() {
    // Refs
    const mapRef = useRef(null);
    const carIconAnimation = useRef(new Animated.Value(0)).current;

    // Navigation and route
    const route = useRoute();
    const navigation = useNavigation();
    const { params } = route.params || {};
    console.log(params?.rideDetails)
    // Socket context
    const { socket } = useSocket()

    // State variables
    const [loading, setLoading] = useState(true);
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otp, setOtp] = useState("");
    const [rideStarted, setRideStarted] = useState(false);
    const [rideCompleted, setRideCompleted] = useState(false);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [locationSubscription, setLocationSubscription] = useState(null);
    const [mapReady, setMapReady] = useState(false);
    const [distanceToPickup, setDistanceToPickup] = useState(null);
    const [timeToPickup, setTimeToPickup] = useState(null);
    const [showDirectionsType, setShowDirectionsType] = useState('driver_to_pickup'); // driver_to_pickup, pickup_to_drop
    const [errorMsg, setErrorMsg] = useState(null);

    // Extract ride details
    const {
        drop_desc,
        eta,
        rider,
        RideOtp,
        pickup_desc,
        kmOfRide,
        rideStatus,
        vehicleType
    } = params?.rideDetails || {};

    // Coordinates
    const driverCoordinates = currentLocation ||
        (rider?.location?.coordinates ? {
            latitude: rider.location.coordinates[1],
            longitude: rider.location.coordinates[0],
        } : { latitude: 28.7041, longitude: 77.1025 });

    const pickupCoordinates = params?.rideDetails?.pickupLocation ? {
        latitude: params.rideDetails.pickupLocation.coordinates[1],
        longitude: params.rideDetails.pickupLocation.coordinates[0],
    } : { latitude: 28.7041, longitude: 77.1025 };

    const dropCoordinates = params?.rideDetails?.dropLocation ? {
        latitude: params.rideDetails.dropLocation.coordinates[1],
        longitude: params.rideDetails.dropLocation.coordinates[0],
    } : { latitude: 28.6139, longitude: 77.2090 };

    // Animation for car icon
    useEffect(() => {
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
    }, []);

    // Request location permissions and start tracking
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                setLoading(false);
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

            setCurrentLocation(initialLocation);

            // Start watching position
            const subscription = await Location.watchPositionAsync(
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

                    setCurrentLocation(updatedLocation);

                    // If map is ready and ride started, animate to new location
                    if (mapRef.current && mapReady) {
                        mapRef.current.animateToRegion({
                            ...updatedLocation,
                            latitudeDelta: LATITUDE_DELTA / 2,
                            longitudeDelta: LONGITUDE_DELTA / 2,
                        }, 1000);
                    }

                    // If ride started, emit location to socket
                    if (rideStarted && socket && socket.emit) {
                        socket.emit("driver_location_update", {
                            rideId: params?.rideDetails?._id,
                            location: updatedLocation
                        });
                    }
                }
            );

            setLocationSubscription(subscription);
            setLoading(false);
        })();

        // Cleanup function
        return () => {
            if (locationSubscription) {
                locationSubscription.remove();
            }
        };
    }, [rideStarted, mapReady]);

    // Socket event listeners
    useEffect(() => {
        if (socket && socket.on) {
            // Listen for ride end event
            socket.on('ride_end', (data) => {
                setRideCompleted(true);
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
                Alert.alert(
                    "Ride Cancelled",
                    "The ride has been cancelled by the customer.",
                    [{ text: "OK", onPress: () => navigation.goBack() }]
                );
            });
        }

        return () => {
            if (socket && socket.off) {
                socket.off('ride_end');
                socket.off('ride_cancelled');
            }
        };
    }, [socket, navigation]);

    // Calculate distance and time to pickup
    useEffect(() => {
        if (currentLocation && pickupCoordinates && !rideStarted) {
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

            setDistanceToPickup(distance.toFixed(1));

            // Estimate time (assuming average speed of 30 km/h)
            const timeInMinutes = (distance / 30) * 60;
            setTimeToPickup(Math.round(timeInMinutes));
        }
    }, [currentLocation, pickupCoordinates, rideStarted]);

    // Handle OTP submission
    const handleOtpSubmit = () => {
        if (otp === RideOtp) {
            setShowOtpModal(false);
            setRideStarted(true);
            setShowDirectionsType('pickup_to_drop');

            // Emit ride started event
            if (socket && socket.emit) {
                socket.emit("ride_started", params?.rideDetails);
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
        } else {
            Alert.alert("Incorrect OTP", "Please try again with the correct OTP.");
        }
    };

    // Open Google Maps for navigation
    const openGoogleMapsDirections = () => {
        const destination = rideStarted ?
            `${dropCoordinates.latitude},${dropCoordinates.longitude}` :
            `${pickupCoordinates.latitude},${pickupCoordinates.longitude}`;

        const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;

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
                        Alert.alert("Error", "Could not open Google Maps");
                    });
                } else {
                    Alert.alert("Error", "Could not open Google Maps");
                }
            }
        });
    };

    // Handle map ready event
    const handleMapReady = () => {
        setMapReady(true);

        // Fit map to show current location and pickup
        if (mapRef.current && currentLocation) {
            setTimeout(() => {
                const coordinates = [
                    currentLocation,
                    rideStarted ? dropCoordinates : pickupCoordinates
                ];

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

    // Complete ride function
    const handleCompleteRide = () => {
        if (!params?.rideDetails) {
            Alert.alert("Error", "Ride details not found");
            return
        }
        Alert.alert(
            "Complete Ride",
            "Are you sure you want to complete this ride?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Complete",
                    onPress: () => {
                        if (socket && socket.emit) {
                            console.log("socket")
                            socket.emit('endRide', { rideDetails: params?.rideDetails, ride: params?.rideDetails?.ride });
                            // socket.emit("ride_completed", params?.rideDetails);
                            setRideCompleted(true);
                        }
                    }
                }
            ]
        );
    };
    // console.log("socket", socket)

    // Loading screen
    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#FF3B30" />
                <Text style={styles.loaderText}>Loading ride details...</Text>
            </View>
        );
    }

    // Error screen
    if (errorMsg) {
        return (
            <View style={styles.errorContainer}>
                <MaterialIcons name="error" size={60} color="#FF3B30" />
                <Text style={styles.errorText}>{errorMsg}</Text>
                <Button
                    mode="contained"
                    onPress={() => navigation.goBack()}
                    style={styles.errorButton}
                >
                    Go Back
                </Button>
            </View>
        );
    }

    return (
      <SafeAreaView style={{flex:1}}>
          <View style={styles.container}>
            {/* Map View */}
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    provider={PROVIDER_GOOGLE}
                    style={styles.map}
                    initialRegion={{
                        latitude: currentLocation?.latitude || driverCoordinates.latitude,
                        longitude: currentLocation?.longitude || driverCoordinates.longitude,
                        latitudeDelta: LATITUDE_DELTA,
                        longitudeDelta: LONGITUDE_DELTA,
                    }}
                    showsUserLocation={true}
                    showsMyLocationButton={true}
                    followsUserLocation={true}
                
                    showsCompass
                  
                    showsTraffic
                    onMapReady={handleMapReady}
                >
                    {/* Driver Marker */}
                    {currentLocation && (
                        <Marker
                            coordinate={currentLocation}
                            title="Your Location"
                            description="You are here"
                        >
                            <Animated.View
                                style={{
                                    transform: [{
                                        scale: carIconAnimation.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [1, 1.1]
                                        })
                                    }]
                                }}
                            >
                                <MaterialCommunityIcons
                                    name="car"
                                    size={36}
                                    color="#FF3B30"
                                />
                            </Animated.View>
                        </Marker>
                    )}

                    {/* Pickup Marker */}
                    <Marker
                        coordinate={pickupCoordinates}
                        title="Pickup Location"
                        description={pickup_desc}
                    >
                        <View style={styles.markerContainer}>
                            <MaterialIcons name="person-pin-circle" size={40} color="#4CAF50" />
                            <View style={styles.markerLabelContainer}>
                                <Text style={styles.markerLabel}>Pickup</Text>
                            </View>
                        </View>
                    </Marker>

                    {/* Drop Marker */}
                    <Marker
                        coordinate={dropCoordinates}
                        title="Drop Location"
                        description={drop_desc}
                    >
                        <View style={styles.markerContainer}>
                            <MaterialIcons name="place" size={40} color="#FF9500" />
                            <View style={styles.markerLabelContainer}>
                                <Text style={styles.markerLabel}>Drop</Text>
                            </View>
                        </View>
                    </Marker>

                    {/* Directions */}
                    {showDirectionsType === 'driver_to_pickup' && currentLocation && (
                        <MapViewDirections
                            origin={currentLocation}
                            destination={pickupCoordinates}
                            apikey={GOOGLE_MAPS_APIKEY}
                            strokeWidth={4}
                            strokeColor="#4CAF50"
                            lineDashPattern={[1]}
                        />
                    )}

                    {showDirectionsType === 'pickup_to_drop' && (
                        <MapViewDirections
                            origin={pickupCoordinates}
                            destination={dropCoordinates}
                            apikey={GOOGLE_MAPS_APIKEY}
                            strokeWidth={4}
                            strokeColor="#FF9500"
                        />
                    )}
                </MapView>

                {/* Map Overlay Controls */}
                <View style={styles.mapOverlayContainer}>
                    {/* Navigation Button */}
                    <TouchableOpacity
                        style={styles.navigationButton}
                        onPress={openGoogleMapsDirections}
                    >
                        <MaterialIcons name="directions" size={24} color="#FFFFFF" />
                        <Text style={styles.navigationButtonText}>Navigate</Text>
                    </TouchableOpacity>

                    {/* Distance Info */}
                    {!rideStarted && distanceToPickup && (
                        <View style={styles.distanceInfoContainer}>
                            <Text style={styles.distanceInfoText}>
                                {distanceToPickup} km • {timeToPickup} min to pickup
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Ride Info Section */}
            <ScrollView style={styles.scrollView} bounces={false}>
                {/* Status Bar */}
                <View style={styles.statusBarContainer}>
                    <View style={styles.statusBar}>
                        <View style={[
                            styles.statusStep,
                            styles.statusStepActive
                        ]}>
                            <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                            <Text style={styles.statusStepText}>Accepted</Text>
                        </View>
                        <View style={[
                            styles.statusConnector,
                            rideStarted && styles.statusConnectorActive
                        ]} />
                        <View style={[
                            styles.statusStep,
                            rideStarted && styles.statusStepActive
                        ]}>
                            <MaterialIcons
                                name={rideStarted ? "check-circle" : "radio-button-unchecked"}
                                size={24}
                                color={rideStarted ? "#4CAF50" : "#BBBBBB"}
                            />
                            <Text style={styles.statusStepText}>Picked Up</Text>
                        </View>
                        <View style={[
                            styles.statusConnector,
                            rideCompleted && styles.statusConnectorActive
                        ]} />
                        <View style={[
                            styles.statusStep,
                            rideCompleted && styles.statusStepActive
                        ]}>
                            <MaterialIcons
                                name={rideCompleted ? "check-circle" : "radio-button-unchecked"}
                                size={24}
                                color={rideCompleted ? "#4CAF50" : "#BBBBBB"}
                            />
                            <Text style={styles.statusStepText}>Completed</Text>
                        </View>
                    </View>
                </View>

                {/* Ride Details Card */}
                <View style={styles.rideInfoCard}>
                    <View style={styles.rideInfoHeader}>
                        <Text style={styles.rideInfoTitle}>Ride Details</Text>
                        <View style={styles.rideStatusBadge}>
                            <Text style={styles.rideStatusText}>
                                {rideCompleted ? "Completed" : rideStarted ? "In Progress" : "Upcoming"}
                            </Text>
                        </View>
                    </View>

                    <Divider style={styles.divider} />

                    {/* Locations */}
                    <View style={styles.locationsContainer}>
                        <View style={styles.locationItem}>
                            <View style={styles.locationIconContainer}>
                                <MaterialIcons name="my-location" size={20} color="#4CAF50" />
                            </View>

                            <View style={styles.locationTextContainer}>
                                <Text style={styles.locationLabel}>PICKUP</Text>
                                <Text style={styles.locationText} numberOfLines={2}>{pickup_desc}</Text>
                            </View>
                        </View>

                        <View style={styles.locationConnector} />

                        <View style={styles.locationItem}>
                            <View style={styles.locationIconContainer}>
                                <MaterialIcons name="place" size={20} color="#FF9500" />
                            </View>
                            <View style={styles.locationTextContainer}>
                                <Text style={styles.locationLabel}>DROP-OFF</Text>
                                <Text style={styles.locationText} numberOfLines={2}>{drop_desc}</Text>
                            </View>
                        </View>
                    </View>

                    <Divider style={styles.divider} />

                    {/* Ride Info Rows */}
                    <View style={styles.infoGrid}>
                        <View style={styles.infoGridItem}>
                            <MaterialCommunityIcons name="car" size={20} color="#666" />
                            <Text style={styles.infoGridLabel}>Vehicle</Text>
                            <Text style={styles.infoGridValue}>{vehicleType || "Standard"}</Text>
                        </View>

                        <View style={styles.infoGridItem}>
                            <MaterialCommunityIcons name="clock-outline" size={20} color="#666" />
                            <Text style={styles.infoGridLabel}>ETA</Text>
                            <Text style={styles.infoGridValue}>{eta || "25 min"}</Text>
                        </View>

                        <View style={styles.infoGridItem}>
                            <MaterialCommunityIcons name="map-marker-distance" size={20} color="#666" />
                            <Text style={styles.infoGridLabel}>Distance</Text>
                            <Text style={styles.infoGridValue}>{kmOfRide ? `${kmOfRide} km` : "N/A"}</Text>
                        </View>

                        <View style={styles.infoGridItem}>
                            <FontAwesome5 name="rupee-sign" size={20} color="#666" />
                            <Text style={styles.infoGridLabel}>Fare</Text>
                            <Text style={styles.infoGridValue}>₹{kmOfRide || "0"}</Text>
                        </View>
                    </View>

                    {rider && (
                        <>
                            <Divider style={styles.divider} />

                            {/* Rider Info */}
                            <View style={styles.riderInfoContainer}>
                                <View style={styles.riderAvatarContainer}>
                                    <Image
                                        source={{
                                            uri: rider.profileImage ||
                                                'https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80'
                                        }}
                                        style={styles.riderAvatar}
                                    />
                                </View>
                                <View style={styles.riderDetails}>
                                    <Text style={styles.riderName}>{rider.name || "Passenger"}</Text>
                                    <Text style={styles.riderPhone}>{rider.phone || "N/A"}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.callButton}
                                    onPress={() => {
                                        if (rider.phone) {
                                            Linking.openURL(`tel:${rider.phone}`);
                                        }
                                    }}
                                >
                                    <Ionicons name="call" size={20} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
                {!rideStarted ? (
                    <LinearGradient
                        colors={['#FF3B30', '#FF5E3A']}
                        style={styles.actionButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <TouchableOpacity
                            style={styles.actionButtonTouchable}
                            onPress={() => setShowOtpModal(true)}
                        >
                            <MaterialIcons name="verified-user" size={24} color="#FFFFFF" />
                            <Text style={styles.actionButtonText}>I've Arrived - Enter OTP</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                ) : !rideCompleted ? (
                    <LinearGradient
                        colors={['#4CAF50', '#45a049']}
                        style={styles.actionButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <TouchableOpacity
                            style={styles.actionButtonTouchable}
                            onPress={handleCompleteRide}
                        >
                            <MaterialIcons name="check-circle" size={24} color="#FFFFFF" />
                            <Text style={styles.actionButtonText}>Complete Ride</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                ) : (
                    <LinearGradient
                        colors={['#FF9500', '#F57C00']}
                        style={styles.actionButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <TouchableOpacity
                            style={styles.actionButtonTouchable}
                            onPress={() => navigation.navigate('collect_money', { data: params?.rideDetails })}
                        >
                            <FontAwesome5 name="money-bill-wave" size={24} color="#FFFFFF" />
                            <Text style={styles.actionButtonText}>Collect Payment</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                )}
            </View>

            {/* OTP Modal */}
            <Modal visible={showOtpModal} transparent={true} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Enter Passenger's OTP</Text>
                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={() => setShowOtpModal(false)}
                            >
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.otpInputContainer}>
                            <TextInput
                                style={styles.otpInput}
                                value={otp}
                                onChangeText={setOtp}
                                keyboardType="numeric"
                                maxLength={4}
                                placeholder="Enter 4-digit OTP"
                                placeholderTextColor="#999"
                            />
                        </View>

                        <Text style={styles.otpInstructions}>
                            Ask the passenger for the 4-digit OTP sent to their phone
                        </Text>

                        <LinearGradient
                            colors={['#FF3B30', '#FF5E3A']}
                            style={styles.otpSubmitButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <TouchableOpacity
                                style={styles.otpSubmitButtonTouchable}
                                onPress={handleOtpSubmit}
                            >
                                <Text style={styles.otpSubmitButtonText}>Verify & Start Ride</Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    </View>
                </View>
            </Modal>
        </View>
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
});