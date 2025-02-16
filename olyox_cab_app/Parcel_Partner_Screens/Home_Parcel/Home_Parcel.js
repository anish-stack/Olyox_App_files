import { View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, Dimensions, Platform } from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import OnlineStatusToggle from './OnlineStatusToggle';
import UserProfileCard from './UserProfileCard';
import WorkStatusCard from './WorkStatusCard';
import * as Location from 'expo-location';
import { useSocket } from '../../context/SocketContext';
import { TouchableOpacity } from 'react-native';
import NewOrder from '../Other_Parcel_Screens/New_Order/NewOrder';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';
const { width } = Dimensions.get('window');
import { Audio } from "expo-av";

const cardWidth = width < 768 ? (width - 48) / 2 : (width - 64) / 4;

export default function Home_Parcel() {
    const { socket, isSocketReady, isReconnecting, loading, error } = useSocket();
    const [userData, setUserData] = useState(null);
    const navigation = useNavigation()
    const [workStatus, setWorkStatus] = useState(null);
    const [statusOfPartner, setStatus] = useState(false);
    const [order, setOrder] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [location, setLocation] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [sound, setSound] = useState(null);


    const playSound = async () => {
        try {
            const { sound } = await Audio.Sound.createAsync(require("./Box.mp3"));
            setSound(sound);
            await sound.playAsync();
        } catch (error) {
            console.error("Error playing sound:", error);
        }
    };

    // Stop the sound when user rejects or accepts
    const stopSound = async () => {
        if (sound) {
            await sound.stopAsync();
            await sound.unloadAsync();
            setSound(null);
        }
    };

    // console.log("isReconnecting",isReconnecting)
    const fetchUserData = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token_partner');
            if (!token) {
                setErrorMsg('No auth token found');
                return;
            }

            const response = await axios.get(
                'http://192.168.11.28:3000/api/v1/parcel/user-details',
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            setUserData(response.data.partner);
            setErrorMsg(null);
        } catch (error) {
            setErrorMsg(error.message);
            console.error('Error fetching user details:', error);
        }
    };
  

    useEffect(() => {
        const getLocation = async () => {
            if (!isSocketReady) {
                console.log('Socket not connected, waiting...');
                return;
            }
          
            if (statusOfPartner !== 'online') {
                console.log('Work status is not online, skipping location update');
                return;
            }

            // Request permission for location

            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                return;
            }

            // Start tracking location every second
            const interval = setInterval(async () => {
                const { coords } = await Location.getCurrentPositionAsync({});
                setLocation(coords);
                sendLocationToServer(coords.latitude, coords.longitude);
            }, 1000);

            return () => clearInterval(interval);
        };

        if (isSocketReady) {
            getLocation(); // Only run this function if socket is connected
        }

        return () => {
            if (isSocketReady) {
                socket.off('rider-location');
            }
        };
    }, [workStatus]);

    const sendLocationToServer = async (latitude, longitude) => {
        const token = await AsyncStorage.getItem('auth_token_partner');
        if (!token) return;

        try {
            const response = await fetch('http://192.168.11.28:3000/webhook/receive-location', {
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

    useEffect(() => {
        // if (socket) {
        //     socket.on('rider-location', (data) => {
        //         console.log('Real-time location update:', data);
        //         setLocation(data.location);
        //     });
        // }

        // return () => {
        //     socket.off('rider-location');
        // };
    }, [socket]);

    const fetchWorkStatus = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token_partner');
            console.log("fetch", token);
            if (!token) return;
    
            // Run both requests concurrently using Promise.all
            const [response, sresponse] = await Promise.all([
                axios.get('http://192.168.11.28:3000/api/v1/parcel/my_parcel_driver-details', {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get('http://192.168.11.28:3000/api/v1/parcel/partner_work_status_details', {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);
    
            console.log("i am ", response.data.summary);
            setWorkStatus(response.data.summary);
            setStatus(sresponse.data.status);
    
        } catch (error) {
            console.error('Error fetching work status:', error.response ? error.response.data : error.message);
        }
    };
    

    useEffect(() => {
        const loadData = async () => {
            await Promise.all([fetchUserData(), fetchWorkStatus()]);
        };
        loadData();

        // Refresh work status every minute
        const statusInterval = setInterval(fetchWorkStatus, 60000);
        return () => clearInterval(statusInterval);
    }, []);


    useEffect(() => {
        console.log("socket", socket)
        if (socket) {
            socket.on('new_parcel_request', (data) => {
                setOrder(data)
                console.log('Real-time location update done:', data);
            })



            socket.on('ride_cancel', (data) => {
                console.log('ride cancelled', data)
                Alert.alert(
                    "Ride Canceled",
                    "Your ride has been  canceled.",
                    [{ text: "OK", onPress: () => console.log("OK Pressed") }]
                );
                playSound()
            })
        }
    }, [socket])

    const logout = async () => {
        await AsyncStorage.removeItem('auth_token_partner')

    }
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchUserData(), fetchWorkStatus()]);
        setRefreshing(false);
    }, []);

    console.log("workStatus",workStatus)
    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#ff0000" />
                    <Text style={styles.loadingText}>Loading your dashboard...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (errorMsg || !userData) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.errorContainer}>
                    <Icon name="alert-circle-outline" size={80} color="#ff0000" />
                    <Text style={styles.errorTitle}>Oops!</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Homes')}>
                        <Text style={styles.errorText}>
                            {errorMsg || 'Please login to continue'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }


    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                style={styles.container}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <Text style={styles.welcomeText}>Welcome Back!</Text>
                        <Text style={styles.nameText}>{userData.name}</Text>
                        <Text style={styles.dateText}>{new Date().toLocaleDateString()}</Text>
                    </View>
                </View>

                {/* Online Status Toggle */}
                <OnlineStatusToggle workStatus={workStatus} onStatusChange={fetchWorkStatus} />

                {/* User Profile Card */}
                <WorkStatusCard workStatus={workStatus} />
                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={[styles.statsCard, { width: cardWidth }]}>
                        <View style={[styles.iconContainer, { backgroundColor: '#ffe6e6' }]}>
                            <Icon name="package-variant" size={32} color="#ff0000" />
                        </View>
                        <Text style={styles.statsNumber}>{workStatus.todayOrders || 0}</Text>
                        <Text style={styles.statsLabel}>Today's Orders</Text>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('All_Orders_parcel')} style={[styles.statsCard, { width: cardWidth }]}>
                        <View style={[styles.iconContainer, { backgroundColor: '#ffe6e6' }]}>
                            <Icon name="check-circle" size={32} color="#ff0000" />
                        </View>
                        <Text style={styles.statsNumber}>{workStatus?.totalOrders || 0}</Text>
                        <Text style={styles.statsLabel}>All Orders</Text>
                    </TouchableOpacity>
                    <View style={[styles.statsCard, { width: cardWidth }]}>
                        <View style={[styles.iconContainer, { backgroundColor: '#ffe6e6' }]}>
                            <Icon name="wallet" size={32} color="#ff0000" />
                        </View>
                        <Text style={styles.statsNumber}>₹{workStatus.totalDeliveredEarnings || 0}</Text>
                        <Text style={styles.statsLabel}>Complete Order Earnings</Text>
                    </View>
                    <View style={[styles.statsCard, { width: cardWidth }]}>
                        <View style={[styles.iconContainer, { backgroundColor: '#ffe6e6' }]}>
                            <Icon name="star" size={32} color="#ff0000" />
                        </View>
                        <Text style={styles.statsNumber}>{workStatus?.rating || '4.5'}</Text>
                        <Text style={styles.statsLabel}>Rating</Text>
                    </View>
                </View>
                <UserProfileCard userData={userData} />
                <TouchableOpacity onPress={logout}>
                    <Text>Logout</Text>
                </TouchableOpacity>

                {/* Work Status Card */}


            </ScrollView>
            {order && (
                <NewOrder location={location} order={order} onClose={() => setOrder(null)} driverId={userData?._id} open={true} />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    container: {
        flex: 1,
    },
    header: {
        backgroundColor: '#ff0000',
        paddingTop: 20,
        paddingBottom: 30,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerContent: {
        padding: 20,
    },
    welcomeText: {
        fontSize: 16,
        color: '#ffe6e6',
        marginBottom: 4,
    },
    nameText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 8,
    },
    dateText: {
        fontSize: 14,
        color: '#ffe6e6',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ff0000',
        marginTop: 16,
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginTop: 8,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 8,
        justifyContent: 'space-between',
    },
    statsCard: {
        backgroundColor: 'white',
        padding: 8,
        margin: 8,
        borderRadius: 16,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    iconContainer: {
        width: 30,
        height: 30,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statsNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    statsLabel: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
});