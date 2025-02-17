import { useRoute,useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator } from 'react-native-paper';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';

const { width } = Dimensions.get('window');

export function RideConfirmed() {
    const route = useRoute();
    const socket = useSocket();
    const navigation = useNavigation()
    const { driver, ride } = route.params || {};
    const [rideStart, setRideStart] = useState(false);
    const [driverData, setDriverData] = useState(driver);
    const [isLoading, setIsLoading] = useState(false);
    const [rideData, SetRideData] = useState({});
    const [rideDetails, setRideDetails] = useState({
        otp: driver?.otp || '1234',
        eta: driver?.eta || '5 mins',
        price: driver?.price || '₹225',
        rating: driver?.rating || '4.8',
        is_done:false,
        pickup: driver?.pickup_desc || 'Pickup Location',
        trips: driver?.trips || '150',
        dropoff: driver?.drop_desc || 'Drop Location',
    });

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

    const fetchRideDetailsFromDb = async () => {
        try {
            const rideId = ride?._id || (await AsyncStorage.getItem('rideId'));
            if (!rideId) {
                console.warn('No ride ID available for fetching details');
                return;
            }

            const { data } = await axios.get(`http://192.168.1.4:3000/api/v1/rides/find-ride_details?id=${rideId}`);
            if (data.data) {
                SetRideData(data.data)
                setRideDetails((prev) => ({
                    ...prev,
                    otp: data.data.RideOtp || prev.otp,
                    eta: data.data.EtaOfRide || prev.eta,
                    price: data.data.kmOfRide || prev.price,
                    rating: data.data.rating || prev.rating,
                    is_done:data?.data?.is_ride_paid || prev?.is_done,
                    pickup: data.data.pickup_desc || prev.pickup,
                    trips: data.data.RatingOfRide || prev.trips,
                    dropoff: data.data.drop_desc || prev.dropoff,
                }));
                setDriverData(data.data.rider)
                setRideStart(data.data.ride_is_started);
            }
        } catch (error) {
            console.error('Error fetching ride details:', error);
        }
    };
    // console.log("check",socket)

    const handleEndRide = async () => {
        setIsLoading(true);
        try {
        
            socket.emit('endRide', { rideDetails, ride:rideData });
       
            console.log('Ride ended and data cleared');
        } catch (error) {
            console.error('Error ending the ride:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!driver) {
            fetchRideDetailsFromDb();
        }
    }, [driver]);

    useEffect(() => {
        fetchRideDetailsFromDb();
        if (socket) {
            socket.on('ride_user_start', async (data) => {
                console.log('ride_user_start', data);
                setRideStart(true);

                try {
                    await AsyncStorage.setItem('rideStart', JSON.stringify(data));
                } catch (error) {
                    console.error('Error storing ride start details:', error);
                }
            });

            return () => {
                socket.off('ride_user_start');
            };
        }
    }, [socket]);

    useEffect(()=>{
        if(socket){
            socket.on('give-rate',(data)=>{
                console.log('isPay data come ')
                navigation.navigate('Rate_Your_ride',{data})
            })
        }
    },[])


    if(rideDetails?.is_done === true){
        // go to home screeenc
        navigation.navigate('Home');
    }

    const LoadingOverlay = () => (
        isLoading ? (
            <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#C82333" />
                <Text style={styles.loadingText}>Please wait...</Text>
            </View>
        ) : null
    );
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
                    <Icon name="shield-check" size={32} color="#C82333" />
                </View>
            </View>
            <Text style={styles.otpHint}>Show this code to your driver</Text>
        </View>
    );

    const DriverCard = () => (
        <View style={styles.driverCard}>
            <View style={styles.driverProfile}>
                <View style={styles.driverImageContainer}>
                    <Image
                        source={require('./driver.png')}
                        style={styles.driverImage}
                    />
                    <View style={styles.onlineIndicator} />
                </View>
                <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{driverData?.name}</Text>
                    <View style={styles.ratingContainer}>
                        <Icon name="star" size={16} color="#F59E0B" />
                        <Text style={styles.rating}>{driverData?.Ratings}</Text>
                        <Text style={styles.trips}>• {driverData?.TotalRides} trips</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.callButton}>
                    <Icon name="phone" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.carDetails}>
                <View style={styles.carInfo}>
                    <Icon name="car" size={20} color="#6B7280" />
                    <Text style={styles.carText}>
                        {driverData?.rideVehicleInfo?.vehicleName} • {driverData?.rideVehicleInfo?.VehicleNumber}
                    </Text>
                </View>
                <View style={styles.etaContainer}>
                    <Icon name="clock-outline" size={20} color="#10B981" />
                    <Text style={styles.etaText}>Arriving in {rideDetails.eta}</Text>
                </View>
            </View>
        </View>
    );

    const LocationCard = () => (
        <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
                <Text style={styles.locationTitle}>Trip Route</Text>
                <TouchableOpacity style={styles.editButton}>
                    <Icon name="pencil" size={16} color="#C82333" />
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

    const PriceCard = () => (
        <View style={styles.priceCard}>
            <View style={styles.priceHeader}>
                <Text style={styles.priceTitle}>Trip Fare</Text>
                <TouchableOpacity style={styles.fareDetails}>
                    <Text style={styles.fareDetailsText}>View Details</Text>
                    <Icon name="chevron-right" size={20} color="#C82333" />
                </TouchableOpacity>
            </View>
            <View style={styles.priceContent}>
                <View>
                    <Text style={styles.priceLabel}>Estimated Total</Text>
                    <Text style={styles.priceAmount}>{rideDetails.price}</Text>
                </View>
                <View style={styles.paymentMethod}>
                    <Icon name="cash" size={20} color="#10B981" />
                    <Text style={styles.paymentText}>Cash Payment</Text>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Ride Confirmed</Text>
                <View style={styles.headerBadge}>
                    <Icon name="check-circle" size={16} color="#10B981" />
                    <Text style={styles.headerBadgeText}>Confirmed</Text>
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {rideStart ? null : <OtpCard />}
                <DriverCard />
                <LocationCard />
                <PriceCard />
            </ScrollView>


            {rideStart ? (
                <View style={styles.footer}>
                    <TouchableOpacity onPress={() => handleEndRide()} style={styles.supportButton}>
                        <Icon name="headphones" size={20} color="#fff" />
                        <Text style={styles.supportButtonText}>End Ride</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.supportButton}>
                        <Icon name="headphones" size={20} color="#fff" />
                        <Text style={styles.supportButtonText}>Need Support?</Text>
                    </TouchableOpacity>
                </View>
            )}
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
});