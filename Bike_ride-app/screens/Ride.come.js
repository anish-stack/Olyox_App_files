import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useSocket } from '../context/SocketContext';
import { Text, Button, Surface, Portal, Modal } from 'react-native-paper';
import { Audio } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import axios from 'axios';
import { useLocation } from '../context/LocationContext';

const { width, height } = Dimensions.get('window');
const RIDE_REQUEST_TIMEOUT = 120000; // 2 minutes in milliseconds

export default function RideCome() {
    const navigation = useNavigation();
    const { driverLocation } = useLocation();
    const { socket, isSocketReady } = useSocket();
    const [rideData, setRideData] = useState(null);
    const [riderDetails, setRiderDetails] = useState(null);
    const [sound, setSound] = useState();
    const [timeLeft, setTimeLeft] = useState(RIDE_REQUEST_TIMEOUT);
    const timeoutRef = useRef(null);
    const soundLoopRef = useRef(null);

    const [errorMsg, setErrorMsg] = useState(null);
    const [showRideModal, setShowRideModal] = useState(false);

    // Location tracking logic
    useEffect(() => {
        let interval;
        const getLocation = async () => {
            if (!isSocketReady) {
                console.log('Socket not connected, waiting...');
                return;
            }

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
            }, 20000);
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
            const response = await fetch('http://192.168.1.3:3000/webhook/cab-receive-location', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ latitude, longitude }),
            });
            const data = await response.json();
            console.log('Location data sent to server:', data);
        } catch (error) {
            console.error('Error sending location:', error);
        }
    };

    const checkRider = async () => {
        try {
            const token = await SecureStore.getItemAsync('auth_token_cab');
            console.log("rider tokens ",token)
            if (!token) {
                console.warn("No auth token found");
                return;
            }

            const response = await axios.get(
                'http://192.168.1.3:3000/api/v1/rider/user-details',
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

    useEffect(() => {
        if (isSocketReady && socket) {
            socket.on('ride_come', (data) => {
                console.log('Received ride data:', data);
                setRideData(data);
                setShowRideModal(true);
                setTimeLeft(RIDE_REQUEST_TIMEOUT);
                startSound();
                startTimeout();
            });

            return () => {
                socket.off('ride_come');
            };
        }
    }, [isSocketReady, socket]);

    const startTimeout = () => {
        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Set new timeout
        timeoutRef.current = setTimeout(() => {
            handleRejectRide();
        }, RIDE_REQUEST_TIMEOUT);

        // Start countdown
        const countdownInterval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1000) {
                    clearInterval(countdownInterval);
                    return 0;
                }
                return prev - 1000;
            });
        }, 1000);
    };

    const startSound = async () => {
        try {
            const { sound } = await Audio.Sound.createAsync(
                require('./sound.mp3'),
                {
                    shouldPlay: true,
                    // isLooping: true
                }
            );
            setSound(sound);
            soundLoopRef.current = sound;
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

    const handleRejectRide = async () => {
        // Clear timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        await stopSound();
        setShowRideModal(false);
        setRideData(null);
        setTimeLeft(RIDE_REQUEST_TIMEOUT);
    };

    const matchedRider = rideData?.riders?.find((rider) => rider.name === riderDetails?.name);

    const handleAcceptRide = async () => {
        // Clear timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        if (socket && matchedRider) {
            socket.emit('ride_accepted', {
                data: {
                    rider_id: matchedRider?.id,
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
        }
        await stopSound();
        setShowRideModal(false);
        setRideData(null);
        setTimeLeft(RIDE_REQUEST_TIMEOUT);
    };

    useEffect(() => {
        if (socket) {
            socket.on('ride_accepted_message', (data) => {
                const { rideDetails, driver } = data || {};
                if (driver && rideDetails) {
                    navigation.navigate('start', {
                        screen: 'ride_details',
                        params: {
                            rideDetails,
                            driver,
                        },
                        index: 1,
                    });
                }
            });
        }
    }, [socket]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            stopSound();
        };
    }, []);

    return (
        <View style={styles.container}>
            <Portal>
                <Modal
                    visible={showRideModal && !!rideData && !!matchedRider}
                    onDismiss={handleRejectRide}
                    contentContainerStyle={styles.modalContainer}
                >
                    <Surface style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Ride Request</Text>
                        <Text style={styles.timerText}>
                            Time remaining: {Math.ceil(timeLeft / 1000)}s
                        </Text>

                        <View style={styles.locationContainer}>
                            <View style={styles.locationItem}>
                                <MaterialCommunityIcons name="map-marker" size={24} color="#EF4444" />
                                <View style={styles.locationText}>
                                    <Text style={styles.locationLabel}>Pickup</Text>
                                    <Text style={styles.locationDesc}>{rideData?.pickup_desc}</Text>
                                </View>
                            </View>

                            <View style={styles.locationDivider} />

                            <View style={styles.locationItem}>
                                <MaterialCommunityIcons name="flag-checkered" size={24} color="#22C55E" />
                                <View style={styles.locationText}>
                                    <Text style={styles.locationLabel}>Drop-off</Text>
                                    <Text style={styles.locationDesc}>{rideData?.drop_desc}</Text>
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
                                <Text style={styles.detailValue}>₹{matchedRider?.price}</Text>
                            </View>
                        </View>

                        <View style={styles.buttonContainer}>
                            <Button
                                mode="contained"
                                onPress={handleAcceptRide}
                                style={[styles.actionButton, styles.acceptButton]}
                                labelStyle={styles.buttonLabel}
                            >
                                Accept Ride
                            </Button>
                            <Button
                                mode="outlined"
                                onPress={handleRejectRide}
                                style={[styles.actionButton, styles.rejectButton]}
                                labelStyle={[styles.buttonLabel, styles.rejectButtonLabel]}
                            >
                                Decline
                            </Button>
                        </View>
                    </Surface>
                </Modal>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    mapContainer: {
        width: '100%',
        height: height * 0.5,
        overflow: 'hidden',
        borderRadius: 12,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    waitingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
    },
    waitingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#4B5563',
        fontWeight: '500',
    },
    markerContainer: {
        padding: 8,
        borderRadius: 20,
        elevation: 4,
    },
    modalContainer: {
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
        textAlign: 'center',
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
        fontSize: 16,
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
        marginBottom: 24,
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
});