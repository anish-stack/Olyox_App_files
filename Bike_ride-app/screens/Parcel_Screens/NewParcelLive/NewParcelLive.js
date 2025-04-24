import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../../context/SocketContext';
import { useRoute, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { Audio } from 'expo-av';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import useUserDetails from '../../../hooks/user/User.hook';

export default function NewParcelLive() {
    const route = useRoute();
    const navigation = useNavigation();
    const { userData } = useUserDetails()
    const { parcelId } = route.params || {};
    const { isSocketReady, socket } = useSocket();

    const [parcelDetails, setParcelDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sound, setSound] = useState(null);
    const [timeLeft, setTimeLeft] = useState(30);

    const soundRef = useRef(null);

    // Handle timer to auto-reject after 30 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prevTime) => {
                if (prevTime <= 1) {
                    clearInterval(timer);
                    handleAutoReject();
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Auto reject when timer runs out
    const handleAutoReject = async () => {
        try {
            // Emit socket event for rejecting ride
            if (socket && isSocketReady) {
                socket.emit('driver:reject_ride', {
                    parcelId: parcelId,
                    driverId: userData._id || 'unknown',
                    reason: 'timeout'
                });
            }

            // Make API call to reject the ride
            await axios.post(`http://192.168.1.12:3100/api/v1/driver/reject-ride/${parcelId}`, {
                reason: 'timeout'
            });

            // Navigate back to home
            navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
            });
        } catch (error) {
        // console.log("Error auto-rejecting ride:", error?.response?.data?.message || error.message);
            // Still navigate away even if rejection API fails
            // navigation.reset({
            //     index: 0,
            //     routes: [{ name: 'Home' }],
            // });
        }
    };

    // Fetch parcel details
    useEffect(() => {
        handleFetchDetails();

        // Play notification sound
        loadSound();

        return () => {
            unloadSound();
        };
    }, [parcelId]);

    // Load sound file
    async function loadSound() {
        try {
            const { sound: newSound } = await Audio.Sound.createAsync(
                require('./notification.mp3'), // Updated path - make sure this is correct
                { shouldPlay: true, isLooping: true }
            );
            soundRef.current = newSound;
            setSound(newSound);
        } catch (error) {
            console.log('Error loading sound:', error);
        }
    }

    // Unload sound when component unmounts
    async function unloadSound() {
        if (soundRef.current) {
            try {
                await soundRef.current.stopAsync();
                await soundRef.current.unloadAsync();
            } catch (error) {
                console.log('Error unloading sound:', error);
            }
        }
    }

    const handleFetchDetails = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`http://192.168.1.12:3100/api/v1/parcel/get-parcel/${parcelId}`);
            setParcelDetails(data?.parcelDetails);
        } catch (error) {
            console.log("Error fetching parcel details:", error?.response?.data?.message || error.message);
            Alert.alert("Error", "Failed to load parcel details");
            // Navigate back on error
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };
    const handleAccept = () => {
        // Ensure userData is available
        if (!userData || !userData._id) {
            console.warn("❌ User data not found or user not logged in");
            Alert.alert("Error", "User information is missing. Please login again.");
            return;
        }

        console.log("✅ User Data:", userData);
        console.log("📦 Parcel ID:", parcelId);

        Alert.alert(
            "Accept Delivery",
            "Are you sure you want to accept this delivery?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Accept",
                    onPress: async () => {
                        try {
                            // Stop alert sound if playing
                            if (soundRef.current) {
                                await soundRef.current.stopAsync();
                            }

                            console.log("🔊 Sound stopped");
                            console.log("🧍‍♂️ Driver ID:", userData._id);

                            // Emit socket event
                            if (socket && isSocketReady) {
                                console.log("📡 Emitting socket event Parcel:accept_ride");
                                socket.emit('Parcel:accept_ride', {
                                    parcelId,
                                    driverId: userData._id
                                });
                                console.log("✅ Socket event emitted");
                            } else {
                                console.warn("⚠️ Socket not ready");
                            }

                            // Make API request
                            console.log("📤 Sending API request to accept parcel");
                            console.log("🔗 API URL:", `http://192.168.1.12:3100/api/v1/parcel/parcel-accept-ride/${parcelId}`);
                            console.log("📦 Request payload:", { riderId: userData._id });

                            const response = await axios.post(
                                `http://192.168.1.12:3100/api/v1/parcel/parcel-accept-ride/${parcelId}`,
                                { riderId: userData._id },
                                {
                                    headers: {
                                        'Content-Type': 'application/json',
                                        // Add auth header if needed
                                        // 'Authorization': `Bearer ${token}`
                                    }
                                }
                            );

                            console.log("📥 API Response:", response.data);
                            console.log("✅ Parcel accepted successfully");

                            // Show success message
                            Alert.alert(
                                "Success",
                                "Delivery accepted successfully! Taking you to tracking screen.",
                                [{ text: "OK" }]
                            );

                            // Navigate to tracking screen
                            navigation.navigate('DeliveryTracking', { parcelId });

                        } catch (error) {
                            console.error("❌ Error accepting ride:", error);
                            console.error("❌ Error details:", {
                                message: error.message,
                                response: error.response?.data,
                                status: error.response?.status
                            });

                            // Show detailed error message
                            Alert.alert(
                                "Error",
                                error.response?.data?.message || "Failed to accept the delivery. Please try again.",
                                [{ text: "OK" }]
                            );
                        }
                    }
                }
            ]
        );
    };
    const handleReject = () => {
        // Logic to reject the ride
        Alert.alert(
            "Reject Delivery",
            "Are you sure you want to reject this delivery?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Reject",
                    onPress: async () => {
                        try {
                            // Stop sound
                            if (soundRef.current) {
                                await soundRef.current.stopAsync();
                            }

                            // Emit socket event for rejecting ride
                            if (socket && isSocketReady) {
                                socket.emit('driver:reject_ride', {
                                    parcelId: parcelId,
                                    driverId: userData._id || 'unknown',
                                    reason: 'Parcel_driver_rejected'
                                });
                            }

                            // Make API call to reject the ride
                            await axios.post(`http://192.168.1.12:3100/api/v1/driver/reject-ride/${parcelId}`);

                            // Navigate back to home
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Home' }],
                            });
                        } catch (error) {
                            console.log("Error rejecting ride:", error?.response?.data?.message || error.message);
                            Alert.alert("Error", "Failed to reject the delivery");
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading delivery details...</Text>
            </SafeAreaView>
        );
    }

    if (!parcelDetails) {
        return (
            <SafeAreaView style={styles.errorContainer}>
                <Text style={styles.errorText}>No parcel details found</Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleFetchDetails}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const { customerId, locations, fares, ride_id, km_of_ride } = parcelDetails;

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>New Delivery Request</Text>
                    <Text style={styles.rideId}>ID: {ride_id}</Text>
                </View>

                <View style={styles.timerContainer}>
                    <Text style={styles.timerText}>Auto-reject in: </Text>
                    <Text style={[styles.timerCounter, timeLeft <= 10 && styles.timerWarning]}>
                        {timeLeft}s
                    </Text>
                </View>

                <View style={styles.priceCard}>
                    <Text style={styles.fareTitle}>Earnings</Text>
                    <Text style={styles.fareAmount}>₹{fares.netFare}</Text>
                    <View style={styles.fareDetails}>
                        <Text style={styles.fareSubtitle}>Base fare: ₹{fares.baseFare}</Text>
                        {fares.discount !== 0 && (
                            <Text style={styles.discountText}>Discount: ₹{fares.discount}</Text>
                        )}
                    </View>
                    <Text style={styles.noteText}>*MCD and toll charges included</Text>
                </View>

                <View style={styles.customerCard}>
                    <Text style={styles.sectionTitle}>Customer Details</Text>
                    <View style={styles.customerInfo}>
                        <Ionicons name="person" size={20} color="#555" />
                        <Text style={styles.customerText}>{customerId.name}</Text>
                    </View>
                    <View style={styles.customerInfo}>
                        <Ionicons name="call" size={20} color="#555" />
                        <Text style={styles.customerText}>{customerId.number}</Text>
                    </View>
                </View>

                <View style={styles.locationCard}>
                    <Text style={styles.sectionTitle}>Pickup Location</Text>
                    <View style={styles.locationContainer}>
                        <MaterialIcons name="my-location" size={24} color="#4a89f3" />
                        <Text style={styles.locationText}>{locations.pickup.address}</Text>
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.sectionTitle}>Drop Location</Text>
                    <View style={styles.locationContainer}>
                        <MaterialIcons name="location-on" size={24} color="#e74c3c" />
                        <Text style={styles.locationText}>{locations.dropoff.address}</Text>
                    </View>
                </View>

                <View style={styles.rideDetailsCard}>
                    <Text style={styles.sectionTitle}>Ride Details</Text>
                    <View style={styles.rideInfoRow}>
                        <View style={styles.rideInfoItem}>
                            <FontAwesome5 name="route" size={18} color="#555" />
                            <Text style={styles.rideInfoText}>{km_of_ride} km</Text>
                        </View>
                        <View style={styles.rideInfoItem}>
                            <MaterialIcons name="payment" size={20} color="#555" />
                            <Text style={styles.rideInfoText}>Cash: ₹{fares.payableAmount}</Text>
                        </View>
                    </View>
                </View>

                {/* Extra padding for bottom buttons */}
                <View style={styles.bottomPadding} />
            </ScrollView>

            {/* Fixed buttons at bottom */}
            <View style={styles.fixedButtonContainer}>
                <TouchableOpacity style={styles.rejectButton} onPress={handleReject}>
                    <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
                    <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100, // Extra padding for fixed buttons
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        fontSize: 16,
        color: '#555',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    errorText: {
        fontSize: 16,
        color: '#e74c3c',
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#3498db',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    header: {
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    rideId: {
        fontSize: 14,
        color: '#666',
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: 12,
    },
    timerText: {
        fontSize: 14,
        color: '#666',
    },
    timerCounter: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    timerWarning: {
        color: '#e74c3c',
    },
    priceCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    fareTitle: {
        fontSize: 16,
        color: '#666',
    },
    fareAmount: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2ecc71',
        marginVertical: 8,
    },
    fareDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    fareSubtitle: {
        fontSize: 14,
        color: '#666',
    },
    discountText: {
        fontSize: 14,
        color: '#e74c3c',
    },
    noteText: {
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
        marginTop: 8,
    },
    customerCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    customerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    customerText: {
        fontSize: 16,
        color: '#333',
        marginLeft: 10,
    },
    locationCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    locationText: {
        fontSize: 14,
        color: '#333',
        marginLeft: 10,
        flex: 1,
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 12,
    },
    rideDetailsCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    rideInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    rideInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rideInfoText: {
        fontSize: 14,
        color: '#333',
        marginLeft: 6,
    },
    bottomPadding: {
        height: 20,
    },
    fixedButtonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 10,
        zIndex: 1000,
        // Safe area padding for iOS
        paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    },
    acceptButton: {
        flex: 1,
        backgroundColor: '#2ecc71',
        padding: 16,
        borderRadius: 8,
        marginLeft: 8,
        alignItems: 'center',
    },
    acceptButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    rejectButton: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        marginRight: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e74c3c',
    },
    rejectButtonText: {
        color: '#e74c3c',
        fontSize: 16,
        fontWeight: 'bold',
    },
});