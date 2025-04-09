import { useRoute, useNavigation } from '@react-navigation/native';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Alert,
    StatusBar,
    Dimensions,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useSocket } from '../../context/SocketContext';

// Component imports
import { RideHeader } from './components/ride-header';
import { RideContent } from './components/ride-content';
import { RideFooter } from './components/ride-footer';
import { SupportModal } from './components/support-modal';
import { CancelReasonModal } from './components/cancel-reason-modal';
import { LoadingOverlay } from './components/loading-overlay';
import Ride_End_Model from './Ride_End_Model';
import axios from 'axios';

const { width, height } = Dimensions.get('window');

export function RideConfirmed() {
    const route = useRoute();
    const navigation = useNavigation();
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
    const [driverLocationCurrent, setDriverLocationCurrent] = useState([]);
    const [cancelReason, setCancelReason] = useState([]);
    const [cancelModel, setCancelModel] = useState(false);
    const [selectedReason, setSelectedReason] = useState(null);
    const [rideEndModel, setRideEndModel] = useState(false);
    const [locationPermission, setLocationPermission] = useState(true);
    const [error, setError] = useState(null);

    // Memoized ride details to prevent unnecessary re-renders
    // const rideDetails = useMemo(() => ({
    //     otp: driverData?.otp || '1234',
    //     eta: driverData?.eta || '5 mins',
    //     price: driverData?.price || '₹225',
    //     rating: driverData?.rating || '4.8',
    //     is_done: rideData?.is_ride_paid || false,
    //     pickup: driverData?.pickup_desc || 'Pickup Location',
    //     trips: driverData?.trips || '150',
    //     dropoff: driverData?.drop_desc || 'Drop Location',
    // }), [driverData, rideData]);

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

    // Fetch cancellation reasons
    const fetchReason = useCallback(async () => {
        try {
            setIsLoading(true);
            const { data } = await axios.get(`https://demoapi.olyox.com/api/v1/admin/cancel-reasons?active=active`);
            console.log("data",data.data)
            setCancelReason(data.data || []);
        } catch (error) {
            console.log("Error Fetching in Reasons", error);
            setError("Failed to load cancellation reasons");
            setCancelReason([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch ride details from database
    const fetchRideDetailsFromDb = async () => {
        try {
            const rideId = ride?._id || await AsyncStorage.getItem('rideId');
        
            if (!rideId) {
                console.warn('No ride ID available for fetching details');
                return;
            }


            const { data } = await axios.get(`https://demoapi.olyox.com/api/v1/rides/find-ride_details?id=${rideId}`);
            console.log("rideId",data.data)
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
    const handleEndRide = useCallback(async () => {
        setIsLoading(true);
        try {
            const socketInstance = socket();
            if (socketInstance) {
                socketInstance.emit('endRide', { rideDetails, ride: rideData });
            } else {
                Alert.alert('Connection Error', 'Unable to connect to server. Please try again.');
            }
        } catch (error) {
            console.error('Error ending the ride:', error);
            Alert.alert('Error', 'Failed to end ride. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [socket, rideDetails, rideData]);

    // Handle cancelling the ride
    const handleCancelRide = useCallback(async () => {
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

            const activeSocket = socket();
            if (!activeSocket) {
                console.error("❌ Socket connection not established");
                Alert.alert("Error", "Unable to cancel ride due to connection issues.");
                return;
            }

            activeSocket.emit("ride-cancel-by-user", data);
            Alert.alert(
                "Cancel",
                "Your pickup has been canceled. Thank you for choosing Olyox!",
                [{ text: "OK", onPress: () => resetToHome() }]
            );
        } catch (error) {
            console.error("⚠️ Error in handleCancelRide:", error);
            Alert.alert("Error", "Something went wrong while canceling the ride.");
        }
    }, [selectedReason, rideData, socket]);

    // Helper function to reset navigation
    const resetToHome = useCallback(() => {
        navigation.reset({
            index: 0,
            routes: [{ name: "Home" }]
        });
    }, [navigation]);

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

    // Setup location tracking
    useEffect(() => {
        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setLocationPermission(false);
                    Alert.alert('Permission Denied', 'Location permission is required for live tracking.');
                    return;
                }

                // Track location in real-time
                await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        timeInterval: 5000,
                        distanceInterval: 10,
                    },
                    (location) => {
                        setCurrentLocation(location.coords);
                    }
                );
            } catch (error) {
                console.error('Error setting up location tracking:', error);
                setError("Failed to setup location tracking");
            }
        })();
    }, []);

    // Setup socket listeners for ride events
    useEffect(() => {
        const socketInstance = socket();

        if (socketInstance) {
            // Handle ride cancellation by driver
            const handleRideCancelled = (data) => {
                console.log("Ride Cancelled Message", data);
                Alert.alert(
                    "Ride Cancelled",
                    data.message || "Your ride has been cancelled by the driver.",
                    [{ text: "OK", onPress: () => resetToHome() }]
                );
            };

            socketInstance.on("ride_cancelled_message", handleRideCancelled);

            return () => {
                socketInstance.off("ride_cancelled_message", handleRideCancelled);
            };
        }
    }, [socket, resetToHome]);

    // Setup socket listeners when rideData is available
    useEffect(() => {
        if (!rideData || Object.keys(rideData).length === 0) return;

        const currentSocket = socket();
        if (!currentSocket) return;

        // Send rider location every 5 seconds
        const locationInterval = setInterval(() => {
            if (currentLocation) {
                currentSocket.emit('send_rider_location', {
                    ...rideData,
                    location: currentLocation
                });
            }
        }, 5000);

        // Ride started
        currentSocket.on('ride_user_start', async (data) => {
            console.log('ride_user_start', data);
            setRideStart(true);
            try {
                await AsyncStorage.setItem('rideStart', JSON.stringify(data));
            } catch (error) {
                console.error('Error storing ride start details:', error);
            }
        });

        // Driver location
        currentSocket.on('rider_location', (data) => {
            if (data && data.location) {
                setDriverLocationCurrent(data.location);
            }
        });

        // Ride complete
        currentSocket.on('your_ride_is_mark_complete', (data) => {
            console.log('your_ride_is_mark_complete', data);
            setRideEndModel(!!data.rideId);
        });

        // Navigate to rating screen
        currentSocket.on('give-rate', (data) => {
            console.log('isPay data come');
            navigation.navigate('Rate_Your_ride', { data });
        });

        // Cleanup
        return () => {
            clearInterval(locationInterval);
            currentSocket.off('ride_user_start');
            currentSocket.off('rider_location');
            currentSocket.off('your_ride_is_mark_complete');
            currentSocket.off('give-rate');
        };
    }, [rideData, currentLocation, socket, navigation]);

    useEffect(()=>{
        fetchRideDetailsFromDb();
    },[])
    // Initial data fetch
    useEffect(() => {
        fetchReason();
        if (!driver) {
            fetchRideDetailsFromDb();
        }
    }, [driver, fetchReason]);

    // Navigate to home if ride is done
    useEffect(() => {
        if (rideDetails.is_done === true) {
            navigation.navigate('Home');
        }
    }, [rideDetails.is_done, navigation]);

    // Error handling - if there's a critical error, show alert and go back to home
    useEffect(() => {
        if (error) {
            Alert.alert(
                "Error",
                error,
                [{ text: "Go Back", onPress: () => navigation.goBack() }]
            );
        }
    }, [error, navigation]);

    // If app is in loading state, show loading overlay
    if (isLoading && !rideData) {
        return <LoadingOverlay message="Loading ride details..." />;
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <RideHeader rideStart={rideStart} />

            <RideContent
                rideStart={rideStart}
                rideDetails={rideDetails}
                driverData={driverData}
                currentLocation={currentLocation}
                driverLocationCurrent={driverLocationCurrent}
                setSupportModalVisible={setSupportModalVisible}
            />

            <RideFooter
                rideStart={rideStart}
                handleEndRide={handleEndRide}
                setSupportModalVisible={setSupportModalVisible}
            />

            {/* Modals */}
            <SupportModal
                visible={supportModalVisible}
                setVisible={setSupportModalVisible}
                driverData={driverData}
                rideDetails={rideDetails}
                currentLocation={currentLocation}
                setCancelModel={setCancelModel}
            />

            <CancelReasonModal
                visible={cancelModel}
                setVisible={setCancelModel}
                cancelReason={cancelReason}
                selectedReason={selectedReason}
                setSelectedReason={setSelectedReason}
                handleCancelRide={handleCancelRide}
            />

            <Ride_End_Model
                open={rideEndModel}
                close={() => setRideEndModel(false)}
                handleRideEnd={handleEndRide}
                data={rideData}
            />

            {isLoading && <LoadingOverlay />}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
});