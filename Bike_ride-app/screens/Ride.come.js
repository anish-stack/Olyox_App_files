import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, AppState, ActivityIndicator, Image, ScrollView, Alert, Platform } from 'react-native';
import { Text, Button, Surface, Portal, Modal, Snackbar } from 'react-native-paper';
import { Audio } from 'expo-av';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSocket } from '../context/SocketContext';
import { useLocation } from '../context/LocationContext';
import axios from 'axios';
import { decode } from '@mapbox/polyline';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');
const RIDE_REQUEST_TIMEOUT = 120000;

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

export default function RideRequestScreen() {
    const navigation = useNavigation();
    const mapRef = useRef(null);
    const { driverLocation } = useLocation();
    const appState = useRef(AppState.currentState);
    const { socket, isSocketReady } = useSocket();
    const [rideData, setRideData] = useState(null);
    const [riderDetails, setRiderDetails] = useState(null);
    const [sound, setSound] = useState();
    const [timeLeft, setTimeLeft] = useState(RIDE_REQUEST_TIMEOUT);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [showRideModal, setShowRideModal] = useState(false);
    const [region, setRegion] = useState(null);
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const timeoutRef = useRef(null);
    const soundLoopRef = useRef(null);
    const countdownIntervalRef = useRef(null);

    useEffect(() => {
        if (rideData?.polyline) {
            const decodedCoordinates = decode(rideData.polyline).map(([latitude, longitude]) => ({
                latitude,
                longitude
            }));
            setRouteCoordinates(decodedCoordinates);

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
            mapRef.current?.animateToRegion(newRegion, 1000);
        }
    }, [rideData]);

    useEffect(() => {
        let interval;
        const getLocation = async () => {
            if (!isSocketReady) return;

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
        };

        getLocation();
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isSocketReady]);

    const sendLocationToServer = async (latitude, longitude) => {
        const token = await SecureStore.getItemAsync('auth_token_cab');
        if (!token) return;

        try {
            const response = await fetch('https://demoapi.olyox.com/webhook/cab-receive-location', {
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

    const checkRider = async () => {
        try {
            const token = await SecureStore.getItemAsync('auth_token_cab');
            if (!token) {
                console.warn("No auth token found");
                return;
            }

            const response = await axios.get(
                'https://demoapi.olyox.com/api/v1/rider/user-details',
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const partnerData = response?.data?.partner;
            if (partnerData) {
                setRiderDetails(partnerData);
            }
        } catch (error) {
            console.error("Login Error:", error.response?.data || error.message);
        }
    };

    useEffect(() => {
        checkRider();
    }, []);

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

    const showSnackbar = (message) => {
        setSnackbarMessage(message);
        setSnackbarVisible(true);
    };

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
            console.log("Ride cancelled rideData:", rideData);
            console.log("Ride cancelled data.ride_request_id:", data.ride_request_id);

            // Check if the cancellation is for the current ride
            if (rideData && data.ride_request_id === rideData.requestId) {
                cleanupRideRequest(); // clear ride state or cancel trip, etc.
                setShowRideModal(false);
                showSnackbar("This ride has been accepted by another driver");
                console.log("Ride cancelled done");
            } else {
                console.log("Ride cancelled for different ride");
                setShowRideModal(false); // optionally hide modal even if not the same ride
            }
        };


        const handleRejectionConfirmed = (data) => {
            console.log("Rejection confirmed:", data);
            showSnackbar("Ride rejection processed successfully");
        };

        const handleRideError = (data) => {
            console.log("Ride error:", data);
            showSnackbar(data.message || "An error occurred with this ride");

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





    // Effect to emit driver_connected when rider details are loaded
    useEffect(() => {
        if (isSocketReady && socket && riderDetails?.id) {
            socket.emit('driver_connected', { driverId: riderDetails.id });
            console.log("Emitted driver_connected with ID:", riderDetails.id);
        }
    }, [isSocketReady, socket, riderDetails]);

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
    };

    const handleRejectRide = async (isTimeout = false) => {
        try {
            if (socket && rideData) {
                console.log("Reject Data ", rideData)
                console.log("Reject riderDetails ", riderDetails)
                socket.emit('ride_rejected', {
                    ride_id: rideData?.requestId,
                    driver_id: riderDetails?._id,
                });

                if (isTimeout) {
                    showSnackbar("Ride request timed out");
                }
            }
        } catch (error) {
            console.error('Error rejecting ride:', error);
        } finally {
            cleanupRideRequest();
        }
    };

    const handleAcceptRide = async () => {
        setLoading(true);
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

                    showSnackbar("Ride accepted successfully");
                } else {
                    throw new Error("Could not match rider details");
                }
            }
        } catch (error) {
            console.error('Error accepting ride:', error);
            showSnackbar("Failed to accept ride. Please try again.");
        } finally {
            cleanupRideRequest();
        }
    };

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
    }, [socket, navigation]);


    useEffect(() => {
        return () => {
            cleanupRideRequest();
        };
    }, []);

    if (!rideData && !showRideModal) {
        return (
            <View style={styles.waitingContainer}>
                <LottieView
                    source={require("./waitings2.json")}
                    autoPlay
                    loop
                    style={styles.waitingAnimation}
                />
                <Text style={styles.waitingText}>Waiting for new ride requests...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={{ flex: 1 }}>
            <View style={styles.container}>
                <Portal>
                    <Modal
                        visible={showRideModal && !!rideData}
                        onDismiss={() => handleRejectRide()}
                        contentContainerStyle={styles.modalContainer}
                    >
                        <Surface style={styles.modalContent}>


                            <View style={styles.userInfoContainer}>
                                {rideData?.user?.profileImage?.image && (
                                    <Image
                                        source={{ uri: rideData.user.profileImage.image }}
                                        style={styles.userImage}
                                    />
                                )}
                                <View style={styles.userDetails}>
                                    <Text style={styles.userName}>{rideData?.user?.name}</Text>
                                    <Text style={styles.userContact}>{rideData?.user?.number}</Text>
                                </View>
                                <View style={styles.ratingContainer}>
                                    <MaterialCommunityIcons name="star" size={20} color="#F59E0B" />
                                    <Text style={styles.ratingText}>{rideData?.riders?.[0]?.rating}</Text>
                                </View>
                            </View>

                            <Text style={styles.timerText}>
                                Time remaining: {Math.ceil(timeLeft / 1000)}s
                            </Text>

                            <View style={styles.locationContainer}>
                                <View style={styles.locationItem}>
                                    <MaterialCommunityIcons name="map-marker" size={24} color="#EF4444" />
                                    <View style={styles.locationText}>
                                        <Text style={styles.locationLabel}>Pickup</Text>
                                        <Text numberOfLines={2} style={styles.locationDesc}>{rideData?.pickup_desc}</Text>
                                    </View>
                                </View>

                                <View style={styles.locationDivider} />

                                <View style={styles.locationItem}>
                                    <MaterialCommunityIcons name="flag-checkered" size={24} color="#22C55E" />
                                    <View style={styles.locationText}>
                                        <Text style={styles.locationLabel}>Drop-off</Text>
                                        <Text numberOfLines={2} style={styles.locationDesc}>{rideData?.drop_desc}</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.detailsGrid}>
                                <View style={styles.detailItem}>
                                    <MaterialCommunityIcons name="map-marker-distance" size={20} color="#6366F1" />
                                    <Text style={styles.detailLabel}>Distance</Text>
                                    <Text style={styles.detailValue}>{rideData?.distance} km</Text>
                                </View>

                                <View style={styles.detailItem}>
                                    <MaterialCommunityIcons name="clock-outline" size={20} color="#6366F1" />
                                    <Text style={styles.detailLabel}>Duration</Text>
                                    <Text style={styles.detailValue}>{rideData?.trafficDuration} min</Text>
                                </View>

                                <View style={styles.detailItem}>
                                    <MaterialCommunityIcons name="currency-inr" size={20} color="#6366F1" />
                                    <Text style={styles.detailLabel}>Fare</Text>
                                    <Text style={styles.detailValue}>₹{rideData?.price}</Text>
                                </View>
                            </View>

                            {rideData?.riders?.[0]?.tolls && (
                                <View style={styles.tollInfo}>
                                    <MaterialCommunityIcons name="toll" size={20} color="#6366F1" />
                                    <Text style={styles.tollText}>
                                        Toll charges: ₹{rideData.riders[0].tollPrice}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.noteContainer}>
                                <Text style={styles.noteText}>
                                    Note: <Text style={styles.noteRegular}>Road tax, state tax, and highway tolls are included. </Text>
                                    <Text style={styles.noteHighlight}>(MCD tolls are not included.)</Text>
                                </Text>
                            </View>

                            <View style={styles.buttonContainer}>
                                <Button
                                    mode="contained"
                                    onPress={handleAcceptRide}
                                    style={[styles.actionButton, styles.acceptButton]}
                                    labelStyle={styles.buttonLabel}
                                    loading={loading}
                                    disabled={loading}
                                >
                                    Accept Ride
                                </Button>
                                <Button
                                    mode="outlined"
                                    onPress={() => handleRejectRide()}
                                    style={[styles.actionButton, styles.rejectButton]}
                                    labelStyle={[styles.buttonLabel, styles.rejectButtonLabel]}
                                    disabled={loading}
                                >
                                    Decline
                                </Button>
                            </View>
                        </Surface>
                    </Modal>
                </Portal>

                <Snackbar
                    visible={snackbarVisible}
                    onDismiss={() => setSnackbarVisible(false)}
                    duration={3000}
                    style={styles.snackbar}
                >
                    {snackbarMessage}
                </Snackbar>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
   waitingContainer: {
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      alignItems: "center",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    waitingAnimation: {
      width: 120,
      height: 120,
    },
    waitingText: {
      fontSize: 16,
      color: "#616161",
      fontWeight: "500",
      marginTop: 8,
      textAlign: "center",
    },
    mapContainer: {
        width: '100%',
        height: height * 0.15,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    modalContainer: {
        margin: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        maxHeight: height * 1,
    },
    userInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
    },
    userImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    userContact: {
        fontSize: 14,
        color: '#6B7280',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        padding: 6,
        borderRadius: 8,
    },
    ratingText: {
        marginLeft: 4,
        fontWeight: '600',
        color: '#92400E',
    },
    timerText: {
        fontSize: 16,
        color: '#EF4444',
        textAlign: 'center',
        marginBottom: 20,
        fontWeight: '500',
    },
    locationContainer: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    locationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    locationText: {
        marginLeft: 12,
        flex: 1,
    },
    locationLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 4,
    },
    locationDesc: {
        fontSize: 14,
        color: '#111827',
        fontWeight: '500',
    },
    locationDivider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 8,
    },
    detailsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    detailItem: {
        flex: 1,
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        marginHorizontal: 4,
    },
    detailLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginTop: 4,
    },
    tollInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    tollText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#4F46E5',
        fontWeight: '500',
    },
    noteContainer: {
        padding: 12,
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        marginBottom: 20,
    },
    noteText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#D9534F',
    },
    noteRegular: {
        color: '#212529',
        fontWeight: 'normal',
    },
    noteHighlight: {
        color: '#D9534F',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 8,
    },
    acceptButton: {
        backgroundColor: '#6366F1',
    },
    rejectButton: {
        borderColor: '#EF4444',
    },
    buttonLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    rejectButtonLabel: {
        color: '#EF4444',
    },
    snackbar: {
        backgroundColor: '#4B5563',
        borderRadius: 8,
        marginBottom: 16,
    },
});